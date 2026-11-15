import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createTournament, applyResult, clearMatch, upcomingMatches, needsWinner, endKoth, resumeKoth, tournamentState,
  validGroupOptions, standingsFor, computeStandings, swissPair, kothState,
} from '../js/core/formats.js';
import { validateDB, validateSnapshot, cleanTournament } from '../js/core/validate.js';

const ids = (n) => Array.from({ length: n }, (_, i) => 'p' + (i + 1));
const players = (n) => ids(n).map((id, i) => ({ id, name: 'Player ' + (i + 1), emoji: '', color: i % 12, club: '', createdAt: 1 }));
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
function play(t, r, limit = Infinity) {
  for (let k = 0; k < limit; k++) {
    const m = upcomingMatches(t)[0];
    if (!m) return;
    const res = { hg: Math.floor(r() * 4), ag: Math.floor(r() * 4) };
    if (needsWinner(m) && res.hg === res.ag) { res.hp = 4; res.ap = 2; }
    applyResult(t, m.id, res, 1000 + k);
  }
}
const snapshotOf = (t, n) => ({ v: 1, t, p: players(n) });

test('every tournament the engine produces passes validation unchanged (all formats, all stages)', () => {
  const tours = [];
  for (let n = 2; n <= 12; n++) {
    const configs = [['league', { legs: 1 }], ['league', { legs: 2 }], ['knockout', { thirdPlace: true }], ['knockout', {}]];
    if (n >= 3) configs.push(['swiss', {}], ['koth', { target: 2 }]);
    for (const o of validGroupOptions(n)) configs.push(['groups', { ...o, thirdPlace: true }]);
    for (const [format, opts] of configs) {
      for (const limit of [0, 3, Infinity]) {
        const t = createTournament({ name: `${format} ${n}`, format, playerIds: ids(n), opts });
        play(t, rng(n * 31 + limit), limit);
        tours.push(t);
      }
    }
  }
  const koth = createTournament({ name: 'k', format: 'koth', playerIds: ids(4), opts: { target: 5 } });
  play(koth, rng(3), 4);
  endKoth(koth);
  tours.push(koth);
  const db = { version: 1, settings: { lang: 'pl', crew: 'Ekipa' }, players: players(12), tournaments: tours };
  const res = validateDB(JSON.parse(JSON.stringify(db)));
  assert.ok(res.ok, 'engine output rejected: ' + res.error);
  // Validation keeps every match and result exactly as they were.
  for (let i = 0; i < tours.length; i++) {
    assert.deepEqual(res.value.tournaments[i].matches, JSON.parse(JSON.stringify(tours[i].matches)));
    assert.deepEqual(tournamentState(res.value.tournaments[i]).championId, tournamentState(tours[i]).championId);
  }
});

test('share-link XSS payloads and malformed values are rejected', () => {
  const g = createTournament({ name: 'G', format: 'groups', playerIds: ids(6), opts: { groups: 2, advance: 2 } });
  const bad = JSON.parse(JSON.stringify(g));
  bad.opts.advance = '<img src=x onerror=alert(1)>';
  assert.equal(validateSnapshot(snapshotOf(bad, 6)).ok, false);
  const score = JSON.parse(JSON.stringify(g));
  score.matches[0].hg = '<b>1</b>';
  score.matches[0].ag = 0;
  assert.equal(validateSnapshot(snapshotOf(score, 6)).ok, false);
  const k = createTournament({ name: 'K', format: 'koth', playerIds: ids(3), opts: { target: 3 } });
  const huge = JSON.parse(JSON.stringify(k));
  huge.opts.target = 1e9;
  assert.equal(validateSnapshot(snapshotOf(huge, 3)).ok, false);
  const ko = createTournament({ name: 'KO', format: 'knockout', playerIds: ids(4) });
  const rounds = JSON.parse(JSON.stringify(ko));
  rounds.koRounds = 1e9;
  assert.equal(validateSnapshot(snapshotOf(rounds, 4)).ok, false);
  assert.equal(validateSnapshot({ v: 1, t: { ...JSON.parse(JSON.stringify(g)), format: 'chess' }, p: [] }).ok, false);
});

test('ids outside [A-Za-z0-9_-] and prototype keys are rejected', () => {
  const t = createTournament({ name: 'L', format: 'league', playerIds: ids(3) });
  const dotted = JSON.parse(JSON.stringify(t));
  dotted.id = 'cup.2026';
  assert.equal(validateSnapshot(snapshotOf(dotted, 3)).ok, false);
  const proto = JSON.parse(JSON.stringify(t).replaceAll('"p2"', '"__proto__"'));
  assert.equal(validateSnapshot({ v: 1, t: proto, p: [] }).ok, false);
  assert.equal(Object.prototype.p, undefined);
});

test('snapshot players are cleaned: bad colours fixed, ghost players dropped, names trimmed', () => {
  const t = createTournament({ name: 'L', format: 'league', playerIds: ids(3) });
  const p = players(3);
  p[0].color = -1;
  p[1].color = 3.5;
  p[2].name = '  ' + 'x'.repeat(40);
  p.push({ id: 'ghost', name: 'Ghost', color: -1 });
  const res = validateSnapshot({ v: 1, t, p });
  assert.ok(res.ok, res.error);
  assert.deepEqual(res.value.p.map((x) => x.id), ['p1', 'p2', 'p3']);
  assert.equal(res.value.p[0].color, 0);
  assert.equal(res.value.p[1].color, 0);
  assert.equal(res.value.p[2].name.length, 24);
});

test('swiss: correcting a result re-draws the next round if it has no results yet', () => {
  const t = createTournament({ name: 'S', format: 'swiss', playerIds: ids(6), opts: { rounds: 3 } });
  const r1 = t.matches.filter((m) => m.round === 1);
  r1.forEach((m, i) => applyResult(t, m.id, i === 0 ? { hg: 5, ag: 0 } : { hg: 1, ag: 0 }));
  const r2Before = t.matches.filter((m) => m.round === 2).map((m) => m.id).sort();
  assert.equal(r2Before.length, 3);
  // Flip the first round-1 result: standings change, so round 2 must be re-drawn from them.
  applyResult(t, r1[0].id, { hg: 0, ag: 5 });
  const r2After = t.matches.filter((m) => m.round === 2);
  assert.equal(r2After.length, 3);
  assert.notDeepEqual(r2After.map((m) => m.id).sort(), r2Before, 'round 2 was re-drawn');
  const order = standingsFor({ ...t, matches: t.matches.filter((m) => m.round === 1) }).map((r) => r.id);
  const played = new Set(r1.map((m) => [m.home, m.away].sort().join('|')));
  const expected = swissPair(order, played, {}, 1).pairs.map((p) => p.slice().sort().join('|')).sort();
  assert.deepEqual(r2After.map((m) => [m.home, m.away].sort().join('|')).sort(), expected, 'pairs follow the corrected table');
  // Once round 2 has a result, correcting round 1 keeps round 2 as it is.
  applyResult(t, r2After[0].id, { hg: 2, ag: 2 });
  const keep = t.matches.filter((m) => m.round === 2).map((m) => m.id).sort();
  applyResult(t, r1[1].id, { hg: 0, ag: 3 });
  assert.deepEqual(t.matches.filter((m) => m.round === 2).map((m) => m.id).sort(), keep);
});

test('swiss: a cleared older result blocks drawing the next round', () => {
  const t = createTournament({ name: 'S', format: 'swiss', playerIds: ids(4), opts: { rounds: 3 } });
  for (const m of t.matches.filter((x) => x.round === 1)) applyResult(t, m.id, { hg: 1, ag: 0 });
  const r1 = t.matches.find((m) => m.round === 1);
  for (const m of t.matches.filter((x) => x.round === 2)) applyResult(t, m.id, { hg: 2, ag: 1 });
  assert.equal(Math.max(...t.matches.map((m) => m.round)), 3);
  clearMatch(t, r1.id);
  // Round 3 had no results and was drawn from standings that included the cleared game: it goes.
  // Round 2 already has results, so its pairings stay.
  assert.equal(Math.max(...t.matches.map((m) => m.round)), 2, 'stale round 3 dropped, round 2 kept');
  assert.equal(t.matches.filter((m) => m.round === 2 && m.hg != null).length, 2);
  applyResult(t, r1.id, { hg: 0, ag: 1 });
  assert.equal(Math.max(...t.matches.map((m) => m.round)), 3, 'round 3 re-drawn once everything is played');
  const t2 = createTournament({ name: 'S', format: 'swiss', playerIds: ids(4), opts: { rounds: 3 } });
  for (const m of t2.matches.filter((x) => x.round === 1)) applyResult(t2, m.id, { hg: 1, ag: 0 });
  const first = t2.matches.find((m) => m.round === 1);
  clearMatch(t2, first.id);
  assert.equal(Math.max(...t2.matches.map((m) => m.round)), 1, 'round 2 removed while round 1 is incomplete');
  applyResult(t2, first.id, { hg: 0, ag: 1 });
  assert.equal(Math.max(...t2.matches.map((m) => m.round)), 2, 'round 2 drawn again once round 1 is complete');
});

test('king of the couch: clearing results after ending the night resumes it (never stuck)', () => {
  const t = createTournament({ name: 'K', format: 'koth', playerIds: ids(3), opts: { target: 3 } });
  play(t, rng(9), 2);
  endKoth(t);
  assert.ok(tournamentState(t).done);
  const played = t.matches.filter((m) => m.hg != null).sort((a, b) => b.round - a.round);
  clearMatch(t, played[0].id);
  assert.equal(t.endedManually, false);
  assert.equal(tournamentState(t).done, false);
  assert.equal(upcomingMatches(t).length, 1, 'the cleared match is playable again');
  clearMatch(t, played[1].id);
  assert.equal(upcomingMatches(t).length, 1);
  assert.equal(upcomingMatches(t)[0].round, 1, 'back to the first match');
  endKoth(t);
  assert.equal(tournamentState(t).done, false, 'no wins yet -> no champion');
  resumeKoth(t);
  assert.equal(upcomingMatches(t).length, 1, 'resume makes a match playable');
  assert.equal(kothState(t).done, false);
});

test('standings: a three-way head-to-head cycle is resolved the same way for every input order', () => {
  const m = (home, away, hg, ag) => ({ stage: 'league', round: 1, home, away, hg, ag });
  // A, B, C all on 6 pts, GD +3, GF 6. Mutual games: A 3-0 B, B 1-0 C, C 1-0 A.
  const matches = [m('A', 'B', 3, 0), m('B', 'C', 1, 0), m('C', 'A', 1, 0), m('A', 'D', 3, 2), m('B', 'D', 5, 0), m('C', 'D', 5, 2)];
  const perms = (a) => (a.length <= 1 ? [a] : a.flatMap((x, i) => perms([...a.slice(0, i), ...a.slice(i + 1)]).map((p) => [x, ...p])));
  for (const order of perms(['A', 'B', 'C', 'D'])) {
    const table = computeStandings(order, matches);
    assert.deepEqual(table.slice(0, 3).map((r) => [r.pts, r.gd, r.gf]), [[6, 3, 6], [6, 3, 6], [6, 3, 6]]);
    // Mini-league among A, B, C: A +2, C 0, B -2.
    assert.deepEqual(table.map((r) => r.id), ['A', 'C', 'B', 'D'], 'order ' + order.join(''));
  }
});

test('cleanTournament keeps only known option keys', () => {
  const t = createTournament({ name: 'K', format: 'knockout', playerIds: ids(5), opts: { legs: 1, target: 3, rounds: null, evil: '<x>' } });
  const c = cleanTournament(JSON.parse(JSON.stringify(t)));
  assert.deepEqual(Object.keys(c.opts).sort(), ['seeding', 'thirdPlace']);
});
