import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  roundRobinPairs, seedOrder, createTournament, applyResult, clearMatch, previewResult,
  tournamentState, upcomingMatches, isPlayed, matchWinner, validGroupOptions, estimateMatches,
  computeStandings, kothState, canEditMatch, endKoth, standingsFor, swissDefaultRounds, needsWinner,
} from '../js/core/formats.js';
import { computeElo, buildContext, playerStats, records, headToHead } from '../js/core/stats.js';

const ids = (n) => Array.from({ length: n }, (_, i) => 'p' + (i + 1));
const pk = (a, b) => (a < b ? a + '|' + b : b + '|' + a);

// Deterministic pseudo-random results so failures are reproducible.
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
function randomResult(m, r) {
  const hg = Math.floor(r() * 5);
  const ag = Math.floor(r() * 5);
  const res = { hg, ag };
  if (needsWinner(m) && hg === ag) {
    res.hp = 4 + Math.floor(r() * 2);
    res.ap = res.hp === 5 ? 4 : 5;
  }
  return res;
}
// Plays every ready match until nothing is left; returns the number of results entered.
function playOut(t, r, limit = 2000) {
  let n = 0;
  for (;;) {
    const next = upcomingMatches(t)[0];
    if (!next) return n;
    applyResult(t, next.id, randomResult(next, r), 1000 + n);
    if (++n > limit) throw new Error('did not finish');
  }
}

test('round robin: every pair exactly once, nobody twice in a round', () => {
  for (let n = 2; n <= 12; n++) {
    const rounds = roundRobinPairs(ids(n));
    assert.equal(rounds.length, n % 2 ? n : n - 1, `rounds for ${n}`);
    const seen = new Map();
    for (const pairs of rounds) {
      const inRound = new Set();
      for (const [a, b] of pairs) {
        assert.ok(!inRound.has(a) && !inRound.has(b), `player twice in a round (n=${n})`);
        inRound.add(a); inRound.add(b);
        seen.set(pk(a, b), (seen.get(pk(a, b)) || 0) + 1);
      }
    }
    assert.equal(seen.size, (n * (n - 1)) / 2);
    for (const c of seen.values()) assert.equal(c, 1);
  }
});

test('round robin double: each ordered pairing (home/away) exactly once', () => {
  for (let n = 2; n <= 9; n++) {
    const seen = new Set();
    for (const pairs of roundRobinPairs(ids(n), 2)) for (const [a, b] of pairs) {
      assert.ok(!seen.has(a + '>' + b), 'duplicate ordered pair');
      seen.add(a + '>' + b);
    }
    assert.equal(seen.size, n * (n - 1));
  }
});

test('seed order keeps top seeds apart', () => {
  assert.deepEqual(seedOrder(2), [1, 2]);
  assert.deepEqual(seedOrder(4), [1, 4, 2, 3]);
  assert.deepEqual(seedOrder(8), [1, 8, 4, 5, 2, 7, 3, 6]);
  const o = seedOrder(16);
  for (let i = 0; i < 16; i += 2) assert.equal(o[i] + o[i + 1], 17);
});

test('league: complete tournament produces a champion and correct counts', () => {
  for (let n = 2; n <= 10; n++) {
    for (const legs of [1, 2]) {
      const t = createTournament({ name: 'L', format: 'league', playerIds: ids(n), opts: { legs } });
      assert.equal(t.matches.length, estimateMatches('league', n, { legs }));
      assert.equal(tournamentState(t).done, false);
      playOut(t, rng(n * 10 + legs));
      const st = tournamentState(t);
      assert.ok(st.done);
      assert.equal(st.championId, standingsFor(t)[0].id);
      assert.ok(t.finishedAt);
    }
  }
});

test('knockout: byes go to top seeds, n-1 real matches, champion decided', () => {
  for (let n = 2; n <= 17; n++) {
    for (const thirdPlace of [false, true]) {
      const ratings = Object.fromEntries(ids(n).map((id, i) => [id, 2000 - i]));
      const t = createTournament({ name: 'K', format: 'knockout', playerIds: ids(n), opts: { thirdPlace, seeding: 'ranking' }, ratings });
      const real = t.matches.filter((m) => !m.bye);
      const expectThird = thirdPlace && n >= 4;
      assert.equal(real.length, n - 1 + (expectThird ? 1 : 0), `real matches n=${n}`);
      assert.equal(real.length, estimateMatches('knockout', n, { thirdPlace }));
      const byes = t.matches.filter((m) => m.bye);
      let size = 1; while (size < n) size *= 2;
      assert.equal(byes.length, size - n);
      // Byes belong to the best-rated players.
      const byeHolders = byes.map((m) => m.home || m.away).sort();
      const topSeeds = ids(n).slice(0, size - n).sort();
      assert.deepEqual(byeHolders, topSeeds, `bye holders n=${n}`);
      playOut(t, rng(n + (thirdPlace ? 100 : 0)));
      const st = tournamentState(t);
      assert.ok(st.done, `done n=${n}`);
      assert.ok(ids(n).includes(st.championId));
      assert.equal(st.podium.length, expectThird ? 3 : Math.min(2, n));
      assert.equal(new Set(st.podium).size, st.podium.length);
    }
  }
});

test('knockout: penalties required on a draw and decide the winner', () => {
  const t = createTournament({ name: 'K', format: 'knockout', playerIds: ids(2) });
  const final = t.matches[0];
  assert.throws(() => applyResult(t, final.id, { hg: 1, ag: 1 }), /penalties/);
  assert.throws(() => applyResult(t, final.id, { hg: 1, ag: 1, hp: 3, ap: 3 }), /penalties/);
  applyResult(t, final.id, { hg: 1, ag: 1, hp: 3, ap: 4 });
  assert.equal(matchWinner(final), final.away);
  assert.equal(tournamentState(t).championId, final.away);
});

test('knockout: editing an earlier result clears dependent results (and preview predicts it)', () => {
  const t = createTournament({ name: 'K', format: 'knockout', playerIds: ids(4), opts: { thirdPlace: true } });
  const semis = t.matches.filter((m) => m.stage === 'ko' && m.round === 1);
  applyResult(t, semis[0].id, { hg: 2, ag: 0 });
  applyResult(t, semis[1].id, { hg: 3, ag: 1 });
  const final = t.matches.find((m) => m.stage === 'ko' && m.round === 2);
  const third = t.matches.find((m) => m.stage === 'third');
  assert.equal(final.home, semis[0].home);
  assert.equal(third.home, semis[0].away);
  applyResult(t, final.id, { hg: 1, ag: 0 });
  applyResult(t, third.id, { hg: 0, ag: 2 });
  assert.ok(tournamentState(t).done);
  // Same winner -> nothing downstream changes.
  assert.equal(previewResult(t, semis[0].id, { hg: 4, ag: 1 }), 0);
  // Flipping the winner of semi 1 changes both final and third-place participants.
  assert.equal(previewResult(t, semis[0].id, { hg: 0, ag: 1 }), 2);
  assert.ok(isPlayed(final), 'preview must not mutate');
  const res = applyResult(t, semis[0].id, { hg: 0, ag: 1 });
  assert.equal(res.cleared, 2);
  assert.ok(!isPlayed(final) && !isPlayed(third));
  assert.equal(final.home, semis[0].away);
  assert.equal(tournamentState(t).done, false);
  assert.equal(t.finishedAt, null);
});

test('swiss: no rematches, one game per round, rests spread out, finishes', () => {
  for (let n = 3; n <= 16; n++) {
    const t = createTournament({ name: 'S', format: 'swiss', playerIds: ids(n) });
    assert.equal(t.opts.rounds, swissDefaultRounds(n));
    playOut(t, rng(n * 7));
    const st = tournamentState(t);
    assert.ok(st.done, `swiss done n=${n}`);
    assert.equal(st.played, estimateMatches('swiss', n, {}));
    const pairs = new Set();
    const byes = {};
    for (let r = 1; r <= t.opts.rounds; r++) {
      const inRound = t.matches.filter((m) => m.stage === 'swiss' && m.round === r);
      const seen = new Set();
      for (const m of inRound) {
        for (const p of [m.home, m.away].filter(Boolean)) {
          assert.ok(!seen.has(p), `twice in round n=${n}`);
          seen.add(p);
        }
        if (m.bye) { byes[m.home] = (byes[m.home] || 0) + 1; continue; }
        assert.ok(!pairs.has(pk(m.home, m.away)), `rematch n=${n} round ${r}`);
        pairs.add(pk(m.home, m.away));
      }
      assert.equal(seen.size, n, `everyone appears each round n=${n}`);
    }
    for (const c of Object.values(byes)) assert.equal(c, 1, `rest at most once n=${n}`);
    assert.equal(st.championId, standingsFor(t)[0].id);
  }
});

function rematchCount(t) {
  const seen = new Set();
  let re = 0;
  for (const m of t.matches) {
    if (m.bye) continue;
    if (seen.has(pk(m.home, m.away))) re++;
    seen.add(pk(m.home, m.away));
  }
  return re;
}

test('swiss: no rematches over many random tournaments (default and maximum rounds)', () => {
  // Seeding is random on every run, so this is a randomized property test.
  for (let n = 3; n <= 12; n++) {
    for (let k = 0; k < 40; k++) {
      for (const opts of [{}, { rounds: 99 }]) {
        const t = createTournament({ name: 'S', format: 'swiss', playerIds: ids(n), opts });
        playOut(t, rng(n * 1000 + k));
        assert.ok(tournamentState(t).done);
        assert.equal(rematchCount(t), 0, `rematch n=${n} trial=${k} rounds=${t.opts.rounds}`);
      }
    }
  }
});

test('swiss: maximum rounds becomes a full round robin', () => {
  for (const n of [4, 5, 6, 8, 9]) {
    const t = createTournament({ name: 'S', format: 'swiss', playerIds: ids(n), opts: { rounds: 99 } });
    assert.equal(t.opts.rounds, n % 2 ? n : n - 1);
    playOut(t, rng(n));
    const pairs = new Set(t.matches.filter((m) => !m.bye).map((m) => pk(m.home, m.away)));
    assert.equal(pairs.size, (n * (n - 1)) / 2);
  }
});

test('groups: balanced groups, qualifiers fill the bracket, no same-group first-round tie', () => {
  for (let n = 6; n <= 20; n++) {
    for (const { groups, advance } of validGroupOptions(n)) {
      for (const legs of [1, 2]) {
        const opts = { groups, advance, legs, thirdPlace: true };
        const t = createTournament({ name: 'G', format: 'groups', playerIds: ids(n), opts });
        const sizes = t.groups.map((g) => g.length);
        assert.ok(Math.max(...sizes) - Math.min(...sizes) <= 1);
        assert.equal(sizes.reduce((a, b) => a + b, 0), n);
        assert.equal(new Set(t.groups.flat()).size, n);
        assert.equal(t.matches.filter((m) => !m.bye).length, estimateMatches('groups', n, opts), `count n=${n} G=${groups} K=${advance}`);
        const first = t.matches.filter((m) => m.stage === 'ko' && m.round === 1);
        for (const m of first) {
          if (m.srcH && m.srcA) assert.notEqual(m.srcH.g, m.srcA.g, 'same-group first-round tie');
          assert.equal(m.home, null);
        }
        // Play group stage only.
        const r = rng(n * groups * advance * legs);
        for (const m of t.matches.filter((x) => x.stage === 'group')) applyResult(t, m.id, randomResult(m, r));
        const tables = t.groups.map((_, g) => standingsFor(t, g));
        const qualified = new Set(tables.flatMap((tb) => tb.slice(0, advance).map((row) => row.id)));
        const inBracket = new Set(first.flatMap((m) => [m.home, m.away]));
        assert.deepEqual([...inBracket].sort(), [...qualified].sort());
        playOut(t, r);
        assert.ok(tournamentState(t).done);
      }
    }
  }
});

test('groups: valid options for common player counts', () => {
  assert.deepEqual(validGroupOptions(5), []);
  assert.deepEqual(validGroupOptions(6), [{ groups: 2, advance: 1 }, { groups: 2, advance: 2 }]);
  assert.ok(validGroupOptions(12).some((o) => o.groups === 4 && o.advance === 2));
});

test('king of the couch: winner stays, loser to the back, ends at target streak', () => {
  const t = createTournament({ name: 'K', format: 'koth', playerIds: ids(4), opts: { target: 2 } });
  const order = t.queue0;
  let m = upcomingMatches(t)[0];
  assert.deepEqual([m.home, m.away], [order[0], order[1]]);
  applyResult(t, m.id, { hg: 2, ag: 1 }); // king (order[0]) wins
  m = upcomingMatches(t)[0];
  assert.deepEqual([m.home, m.away], [order[0], order[2]]);
  assert.deepEqual(kothState(t).queue, [order[2], order[3], order[1]]);
  // Older results are locked, the last one stays editable.
  const first = t.matches.find((x) => x.round === 1);
  assert.ok(canEditMatch(t, first));
  applyResult(t, m.id, { hg: 0, ag: 3 }); // challenger order[2] dethrones the king
  assert.ok(!canEditMatch(t, first));
  m = upcomingMatches(t)[0];
  assert.deepEqual([m.home, m.away], [order[2], order[3]]);
  applyResult(t, m.id, { hg: 1, ag: 1, hp: 5, ap: 3 }); // new king wins on penalties: streak 2 = target
  const st = tournamentState(t);
  assert.ok(st.done);
  assert.equal(st.championId, order[2]);
  assert.equal(upcomingMatches(t).length, 0);
  // Correcting the last result reopens the tournament.
  const last = t.matches.find((x) => x.round === 3);
  applyResult(t, last.id, { hg: 0, ag: 2 });
  assert.equal(tournamentState(t).done, false);
  m = upcomingMatches(t)[0];
  assert.deepEqual([m.home, m.away], [order[3], order[1]]);
  // Clearing the last result drops the queued follow-up match and makes it current again.
  clearMatch(t, last.id);
  assert.equal(upcomingMatches(t).length, 1);
  assert.equal(upcomingMatches(t)[0].id, last.id);
});

test('king of the couch: random play always terminates; manual end picks most wins', () => {
  for (let n = 3; n <= 8; n++) {
    const t = createTournament({ name: 'K', format: 'koth', playerIds: ids(n), opts: { target: 3 } });
    playOut(t, rng(n * 3), 5000);
    assert.ok(tournamentState(t).done);
    const t2 = createTournament({ name: 'K', format: 'koth', playerIds: ids(n), opts: { target: 9 } });
    const r = rng(n);
    for (let i = 0; i < 6; i++) { const m = upcomingMatches(t2)[0]; applyResult(t2, m.id, randomResult(m, r)); }
    endKoth(t2);
    const st = tournamentState(t2);
    assert.ok(st.done);
    assert.equal(st.championId, kothState(t2).table[0].id);
    assert.equal(upcomingMatches(t2).length, 0);
  }
});

test('standings tie-breakers: points, goal difference, goals for, head-to-head', () => {
  const m = (home, away, hg, ag, round = 1) => ({ stage: 'league', round, home, away, hg, ag });
  // A and B: 3 pts, same GD and GF; A beat B directly.
  const matches = [m('A', 'B', 2, 1), m('B', 'C', 2, 1), m('C', 'A', 2, 1, 2)];
  const t1 = computeStandings(['A', 'B', 'C'], matches);
  assert.deepEqual(t1.map((r) => r.pts), [3, 3, 3]);
  // All equal on pts/GD/GF -> head-to-head is a cycle, falls back to wins then input order.
  assert.equal(t1.length, 3);
  const matches2 = [m('A', 'B', 1, 0), m('A', 'C', 0, 3), m('B', 'C', 5, 0)];
  const t2 = computeStandings(['A', 'B', 'C'], matches2);
  assert.deepEqual(t2.map((r) => r.id), ['B', 'C', 'A']); // B: 3pts GD+4, C: 3pts GD-2... A: 3pts GD-2 GF1
  const matches3 = [m('A', 'B', 3, 0), m('C', 'D', 3, 0), m('A', 'C', 0, 0), m('B', 'D', 1, 1)];
  const t3 = computeStandings(['A', 'B', 'C', 'D'], matches3);
  assert.equal(t3[0].pts, 4); assert.equal(t3[1].pts, 4);
  assert.deepEqual(t3.slice(0, 2).map((r) => r.id).sort(), ['A', 'C']);
});

test('elo: zero-sum, winner gains, bigger wins move more', () => {
  const players = ids(4).map((id) => ({ id, name: id }));
  const t = createTournament({ name: 'L', format: 'league', playerIds: ids(4) });
  const db = { players, tournaments: [t] };
  playOut(t, rng(42));
  const { rating } = computeElo(db);
  const sum = Object.values(rating).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(sum - 4000) < 1e-6, 'elo must be zero-sum');
  const one = { players: players.slice(0, 2), tournaments: [{ id: 't', name: 't', createdAt: 0, format: 'league', players: ['p1', 'p2'], opts: {}, matches: [{ stage: 'league', round: 1, home: 'p1', away: 'p2', hg: 1, ag: 0, playedAt: 1 }] }] };
  const big = { players: players.slice(0, 2), tournaments: [{ id: 't', name: 't', createdAt: 0, format: 'league', players: ['p1', 'p2'], opts: {}, matches: [{ stage: 'league', round: 1, home: 'p1', away: 'p2', hg: 5, ag: 0, playedAt: 1 }] }] };
  const r1 = computeElo(one).rating.p1;
  const r5 = computeElo(big).rating.p1;
  assert.ok(r1 > 1000 && r5 > r1);
});

test('player stats and records agree with raw matches', () => {
  const players = ids(5).map((id) => ({ id, name: id }));
  const t = createTournament({ name: 'L', format: 'league', playerIds: ids(5), opts: { legs: 2 } });
  playOut(t, rng(7));
  const db = { players, tournaments: [t] };
  const ctx = buildContext(db);
  let goals = 0;
  for (const m of t.matches) if (isPlayed(m)) goals += m.hg + m.ag;
  const all = players.map((p) => playerStats(db, p.id, ctx));
  assert.equal(all.reduce((s, x) => s + x.gf, 0), goals);
  assert.equal(all.reduce((s, x) => s + x.p, 0), t.matches.length * 2);
  assert.equal(all.reduce((s, x) => s + x.w, 0), all.reduce((s, x) => s + x.l, 0));
  for (const s of all) assert.equal(s.w + s.d + s.l, s.p);
  const champ = tournamentState(t).championId;
  assert.equal(all.find((s) => s.id === champ).titles, 1);
  const rec = records(db, ctx);
  const maxTotal = Math.max(...t.matches.map((m) => m.hg + m.ag));
  assert.equal(rec.mostGoals.total, maxTotal);
  const h = headToHead(ctx, 'p1', 'p2');
  assert.equal(h.p, 2);
  assert.equal(h.aw + h.d + h.bw, 2);
});
