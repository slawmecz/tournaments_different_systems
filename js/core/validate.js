// Strict validation for data that comes from outside the running app: share links,
// backup files and what is stored in localStorage. Objects are rebuilt from whitelisted,
// type-checked fields, so nothing unexpected (markup, huge blobs, odd ids) can get in.
// Anything structurally wrong is rejected as a whole — never silently half-imported.
import { FORMAT_IDS, swissMaxRounds, validGroupOptions } from './formats.js';
import { nextPow2 } from './util.js';

export const COLOR_COUNT = 12;
const ID_RE = /^[\w-]{1,40}$/;
const RESERVED = new Set(['__proto__', 'constructor', 'prototype']);
const STAGES = { league: ['league'], knockout: ['ko', 'third'], swiss: ['swiss'], groups: ['group', 'ko', 'third'], koth: ['koth'] };

export const validId = (x) => typeof x === 'string' && ID_RE.test(x) && !RESERVED.has(x);
const isInt = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;
const text = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '');
const time = (v) => (Number.isFinite(v) && v > 0 && v < 8.64e15 ? v : null);

class Invalid extends Error {}
function need(cond, what) { if (!cond) throw new Invalid(what); }

export function cleanPlayer(p) {
  need(p && typeof p === 'object', 'player');
  need(validId(p.id), 'player id');
  const name = text(p.name, 200).trim().slice(0, 24);
  need(name.length > 0, 'player name');
  const out = {
    id: p.id,
    name,
    emoji: text(p.emoji, 16),
    color: isInt(p.color, 0, COLOR_COUNT - 1) ? p.color : 0,
    club: text(p.club, 32),
    createdAt: time(p.createdAt) ?? Date.now(),
  };
  if (p.demo === true) out.demo = true;
  return out;
}

function cleanMatch(m, format, players) {
  need(m && typeof m === 'object', 'match');
  need(validId(m.id), 'match id');
  need(STAGES[format].includes(m.stage), 'match stage');
  need(isInt(m.round, 1, 500), 'match round');
  const who = (v) => { if (v == null) return null; need(validId(v) && players.has(v), 'match player'); return v; };
  const goals = (v) => { if (v == null) return null; need(isInt(v, 0, 99), 'score'); return v; };
  const out = {
    id: m.id, stage: m.stage, round: m.round,
    home: who(m.home), away: who(m.away),
    hg: goals(m.hg), ag: goals(m.ag), hp: goals(m.hp), ap: goals(m.ap),
    playedAt: time(m.playedAt),
  };
  need((out.hg == null) === (out.ag == null), 'partial score');
  need((out.hp == null) === (out.ap == null), 'partial penalties');
  need(out.hp == null || (out.hg != null && out.hg === out.ag), 'penalties without a draw');
  if (m.bye === true) out.bye = true;
  need(out.hg == null || (out.home && out.away && !out.bye), 'result without two players');
  if (out.home && out.home === out.away) need(false, 'player against themself');
  if (m.stage === 'ko' || m.stage === 'third') { need(isInt(m.slot, 0, 127), 'bracket slot'); out.slot = m.slot; }
  if (m.stage === 'group') { need(isInt(m.group, 0, 7), 'group index'); out.group = m.group; }
  for (const k of ['srcH', 'srcA']) {
    if (m[k] == null) continue;
    need(typeof m[k] === 'object' && isInt(m[k].g, 0, 7) && isInt(m[k].pos, 1, 4), 'bracket source');
    out[k] = { g: m[k].g, pos: m[k].pos };
  }
  return out;
}

export function cleanTournament(t) {
  need(t && typeof t === 'object', 'tournament');
  need(validId(t.id), 'tournament id');
  need(FORMAT_IDS.includes(t.format), 'format');
  const name = text(t.name, 200).trim().slice(0, 60);
  need(name.length > 0, 'tournament name');
  need(Array.isArray(t.players) && t.players.length >= 2 && t.players.length <= 64, 'player list');
  need(t.players.every(validId) && new Set(t.players).size === t.players.length, 'player ids');
  need(Array.isArray(t.matches) && t.matches.length <= 3000, 'match list');
  const n = t.players.length;
  const players = new Set(t.players);
  const o = t.opts && typeof t.opts === 'object' ? t.opts : {};
  const seeding = o.seeding === 'ranking' ? 'ranking' : 'random';
  let opts;
  if (t.format === 'league') opts = { legs: o.legs === 2 ? 2 : 1 };
  else if (t.format === 'knockout') opts = { seeding, thirdPlace: o.thirdPlace === true };
  else if (t.format === 'swiss') { need(isInt(o.rounds, 1, swissMaxRounds(n)), 'swiss rounds'); opts = { seeding, rounds: o.rounds }; }
  else if (t.format === 'groups') {
    need(validGroupOptions(n).some((v) => v.groups === o.groups && v.advance === o.advance), 'group settings');
    opts = { seeding, groups: o.groups, advance: o.advance, legs: o.legs === 2 ? 2 : 1, thirdPlace: o.thirdPlace === true };
  } else { need(isInt(o.target, 1, 10), 'streak target'); opts = { target: o.target }; }

  const out = {
    id: t.id, name, format: t.format,
    createdAt: time(t.createdAt) ?? Date.now(),
    finishedAt: time(t.finishedAt),
    players: t.players.slice(), opts,
    matches: t.matches.map((m) => cleanMatch(m, t.format, players)),
  };
  need(new Set(out.matches.map((m) => m.id)).size === out.matches.length, 'duplicate match ids');
  if (t.format === 'swiss') need(out.matches.every((m) => m.round <= opts.rounds), 'swiss round range');

  if (t.format === 'knockout' || t.format === 'groups') {
    const entrants = t.format === 'knockout' ? n : opts.groups * opts.advance;
    const size = nextPow2(entrants);
    const rounds = Math.max(1, Math.log2(size));
    need(t.koRounds === rounds, 'bracket rounds');
    out.koRounds = rounds;
    for (let r = 1; r <= rounds; r++) {
      const ms = out.matches.filter((m) => m.stage === 'ko' && m.round === r);
      need(ms.length === size / 2 ** r, 'bracket size');
      need(new Set(ms.map((m) => m.slot)).size === ms.length && ms.every((m) => m.slot < ms.length), 'bracket slots');
    }
    need(out.matches.filter((m) => m.stage === 'ko').length === size - 1, 'bracket matches');
    const thirds = out.matches.filter((m) => m.stage === 'third');
    need(thirds.length <= 1, 'third-place match');
    opts.thirdPlace = thirds.length === 1;
  }
  if (t.format === 'groups') {
    need(Array.isArray(t.groups) && t.groups.length === opts.groups, 'groups');
    const seen = new Set();
    for (const g of t.groups) {
      need(Array.isArray(g) && g.length >= 2, 'group members');
      for (const id of g) { need(players.has(id) && !seen.has(id), 'group member'); seen.add(id); }
    }
    need(seen.size === n, 'every player in a group');
    out.groups = t.groups.map((g) => g.slice());
    need(out.matches.every((m) => m.stage !== 'group' || m.group < opts.groups), 'group index range');
  }
  if (t.format === 'koth') {
    need(Array.isArray(t.queue0) && t.queue0.length === n && new Set(t.queue0).size === n && t.queue0.every((id) => players.has(id)), 'queue');
    out.queue0 = t.queue0.slice();
    if (t.endedManually === true) out.endedManually = true;
  }
  if (t.demo === true) out.demo = true;
  return out;
}

export function cleanDB(d) {
  need(d && typeof d === 'object' && Array.isArray(d.players) && Array.isArray(d.tournaments), 'database shape');
  need(d.players.length <= 1000 && d.tournaments.length <= 5000, 'database size');
  const players = d.players.map(cleanPlayer);
  need(new Set(players.map((p) => p.id)).size === players.length, 'duplicate player ids');
  const tournaments = d.tournaments.map(cleanTournament);
  need(new Set(tournaments.map((x) => x.id)).size === tournaments.length, 'duplicate tournament ids');
  const s = d.settings && typeof d.settings === 'object' ? d.settings : {};
  return { version: 1, settings: { lang: s.lang === 'pl' || s.lang === 'en' ? s.lang : null, crew: text(s.crew, 28) }, players, tournaments };
}

export function cleanSnapshot(d) {
  need(d && typeof d === 'object' && d.v === 1 && Array.isArray(d.p) && d.p.length <= 64, 'snapshot shape');
  const t = cleanTournament(d.t);
  // Only players who actually take part are kept (no extra "ghost" players).
  const p = d.p.map(cleanPlayer).filter((pl) => t.players.includes(pl.id));
  need(new Set(p.map((x) => x.id)).size === p.length, 'duplicate snapshot players');
  return { v: 1, t, p };
}

// Result wrappers: { ok: true, value } or { ok: false, error }.
function attempt(fn, input) {
  try { return { ok: true, value: fn(input) }; } catch (e) {
    if (e instanceof Invalid) return { ok: false, error: e.message };
    throw e;
  }
}
export const validateDB = (d) => attempt(cleanDB, d);
export const validateSnapshot = (d) => attempt(cleanSnapshot, d);
