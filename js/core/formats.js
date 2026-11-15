// Tournament engine: creation, progression and results for every format.
// Pure functions only (no DOM), so the same code runs in the browser and in Node tests.
//
// Match shape:
// { id, stage: 'league'|'group'|'swiss'|'ko'|'third'|'koth', round, slot?, group?,
//   home, away, hg, ag, hp, ap, playedAt, bye?, srcH?, srcA? }

import { uid, shuffle, nextPow2, clamp, deepClone } from './util.js';

export const FORMAT_IDS = ['league', 'knockout', 'swiss', 'groups', 'koth'];

export const isPlayed = (m) => m.hg != null && m.ag != null;
export const needsWinner = (m) => m.stage === 'ko' || m.stage === 'third' || m.stage === 'koth';

export function matchWinner(m) {
  if (!m) return null;
  if (m.bye) return m.home || m.away || null;
  if (!isPlayed(m)) return null;
  if (m.hg > m.ag) return m.home;
  if (m.ag > m.hg) return m.away;
  if (m.hp != null && m.ap != null && m.hp !== m.ap) return m.hp > m.ap ? m.home : m.away;
  return null;
}

export function matchLoser(m) {
  if (!m || m.bye) return null;
  const w = matchWinner(m);
  if (!w) return null;
  return w === m.home ? m.away : m.home;
}

export function clearResult(m) {
  m.hg = null; m.ag = null; m.hp = null; m.ap = null; m.playedAt = null;
}

function mk(stage, round, extra = {}) {
  return { id: uid('m'), stage, round, home: null, away: null, hg: null, ag: null, hp: null, ap: null, playedAt: null, ...extra };
}

// ---------------------------------------------------------------- schedules

// Circle method. Returns rounds -> [[home, away], ...]; odd counts get a rotating rest.
export function roundRobinPairs(ids, legs = 1) {
  const list = ids.slice();
  if (list.length < 2) return [];
  if (list.length % 2) list.push(null);
  const n = list.length;
  const half = n / 2;
  let arr = list.slice();
  const rounds = [];
  for (let r = 0; r < n - 1; r++) {
    const pairs = [];
    for (let i = 0; i < half; i++) {
      let a = arr[i];
      let b = arr[n - 1 - i];
      if (a == null || b == null) continue;
      if (i === 0 ? r % 2 === 1 : i % 2 === 1) [a, b] = [b, a];
      pairs.push([a, b]);
    }
    rounds.push(pairs);
    arr = [arr[0], arr[n - 1], ...arr.slice(1, n - 1)];
  }
  if (legs === 2) rounds.push(...rounds.map((p) => p.map(([a, b]) => [b, a])));
  return rounds;
}

// Standard bracket order, e.g. 8 -> [1,8,4,5,2,7,3,6] so top seeds meet late.
export function seedOrder(size) {
  if (size < 2) return [1];
  let order = [1, 2];
  while (order.length < size) {
    const s = order.length * 2 + 1;
    order = order.flatMap((x) => [x, s - x]);
  }
  return order;
}

export const swissMaxRounds = (n) => (n % 2 ? n : n - 1);
export const swissDefaultRounds = (n) => Math.max(1, Math.min(swissMaxRounds(n), Math.ceil(Math.log2(Math.max(2, n))) + 1));

// Group set-ups that give a clean power-of-two knockout and groups of at least 3.
export function validGroupOptions(n) {
  const out = [];
  for (const groups of [2, 4, 8]) {
    const minSize = Math.floor(n / groups);
    if (minSize < 3) continue;
    for (const advance of [1, 2, 4]) {
      if (advance >= minSize) continue;
      out.push({ groups, advance });
    }
  }
  return out;
}

export const MIN_PLAYERS = { league: 2, knockout: 2, swiss: 3, groups: 6, koth: 3 };

// Number of matches a format will produce (for the wizard preview).
export function estimateMatches(format, n, opts = {}) {
  if (n < (MIN_PLAYERS[format] || 2)) return 0;
  switch (format) {
    case 'league': return (n * (n - 1) / 2) * (opts.legs === 2 ? 2 : 1);
    case 'knockout': return n - 1 + (opts.thirdPlace && n >= 4 ? 1 : 0);
    case 'swiss': return clamp(opts.rounds || swissDefaultRounds(n), 1, swissMaxRounds(n)) * Math.floor(n / 2);
    case 'groups': {
      const G = opts.groups || 2;
      const K = opts.advance || 2;
      const legs = opts.legs === 2 ? 2 : 1;
      let total = 0;
      for (let g = 0; g < G; g++) {
        const size = Math.floor(n / G) + (g < n % G ? 1 : 0);
        total += (size * (size - 1) / 2) * legs;
      }
      const Q = G * K;
      return total + Q - 1 + (opts.thirdPlace && Q >= 4 ? 1 : 0);
    }
    case 'koth': return null; // open-ended
    default: return 0;
  }
}

// ---------------------------------------------------------------- standings

export function computeStandings(ids, matches, { buchholz = false } = {}) {
  const rows = new Map(ids.map((id, i) => [id, { id, idx: i, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0, byes: 0, bh: 0, form: [], opps: [] }]));
  const ordered = matches.slice().sort((x, y) => (x.round - y.round) || ((x.playedAt || 0) - (y.playedAt || 0)));
  for (const m of ordered) {
    if (m.bye) {
      const r = rows.get(m.home || m.away);
      if (r) { r.pts += 3; r.byes++; }
      continue;
    }
    if (!isPlayed(m)) continue;
    const h = rows.get(m.home);
    const a = rows.get(m.away);
    if (!h || !a) continue;
    h.p++; a.p++;
    h.gf += m.hg; h.ga += m.ag; a.gf += m.ag; a.ga += m.hg;
    h.opps.push(a.id); a.opps.push(h.id);
    if (m.hg > m.ag) { h.w++; a.l++; h.pts += 3; h.form.push('W'); a.form.push('L'); }
    else if (m.hg < m.ag) { a.w++; h.l++; a.pts += 3; a.form.push('W'); h.form.push('L'); }
    else { h.d++; a.d++; h.pts++; a.pts++; h.form.push('D'); a.form.push('D'); }
  }
  const list = [...rows.values()];
  for (const r of list) r.gd = r.gf - r.ga;
  if (buchholz) for (const r of list) r.bh = r.opps.reduce((s, id) => s + (rows.get(id)?.pts || 0), 0);
  // Points (→ Buchholz in Swiss) → goal difference → goals scored. Players still level on all of
  // those are separated by a mini-league of their games against each other (points, goal
  // difference, goals), then wins, then their order in the player list. Every comparison uses
  // fixed per-player keys, so the result never depends on the order players were picked.
  const primary = (a, b) => (b.pts - a.pts) || (buchholz ? b.bh - a.bh : 0) || (b.gd - a.gd) || (b.gf - a.gf);
  list.sort((a, b) => primary(a, b) || (a.idx - b.idx));
  const out = [];
  for (let i = 0; i < list.length;) {
    let j = i + 1;
    while (j < list.length && primary(list[i], list[j]) === 0) j++;
    const group = list.slice(i, j);
    if (group.length > 1) {
      const mini = new Map(group.map((r) => [r.id, { pts: 0, gd: 0, gf: 0 }]));
      for (const m of matches) {
        if (m.bye || !isPlayed(m) || !mini.has(m.home) || !mini.has(m.away)) continue;
        const h = mini.get(m.home);
        const a = mini.get(m.away);
        h.gf += m.hg; h.gd += m.hg - m.ag; a.gf += m.ag; a.gd += m.ag - m.hg;
        if (m.hg > m.ag) h.pts += 3; else if (m.hg < m.ag) a.pts += 3; else { h.pts++; a.pts++; }
      }
      for (const r of group) r.mini = mini.get(r.id);
      group.sort((a, b) => (b.mini.pts - a.mini.pts) || (b.mini.gd - a.mini.gd) || (b.mini.gf - a.mini.gf) || (b.w - a.w) || (a.idx - b.idx));
    }
    out.push(...group);
    i = j;
  }
  return out;
}

export function stageMatches(t, stage, group) {
  return t.matches.filter((m) => m.stage === stage && (group == null || m.group === group));
}

export function standingsFor(t, group) {
  if (t.format === 'swiss') return computeStandings(t.players, stageMatches(t, 'swiss'), { buchholz: true });
  if (t.format === 'groups') return computeStandings(t.groups[group], stageMatches(t, 'group', group));
  return computeStandings(t.players, stageMatches(t, 'league'));
}

// ---------------------------------------------------------------- creation

function seedPlayers(ids, seeding, ratings = {}) {
  if (seeding === 'ranking') {
    // Ranked by rating; equal ratings keep a random order.
    return shuffle(ids).sort((a, b) => (ratings[b] ?? 1000) - (ratings[a] ?? 1000));
  }
  return shuffle(ids);
}

export function createTournament({ name, format, playerIds, opts = {}, ratings = {}, now = Date.now() }) {
  if (!FORMAT_IDS.includes(format)) throw new Error('Unknown format: ' + format);
  if (new Set(playerIds).size !== playerIds.length) throw new Error('Duplicate players');
  if (playerIds.length < MIN_PLAYERS[format]) throw new Error('Not enough players');
  const t = { id: uid('t'), name, format, createdAt: now, finishedAt: null, players: playerIds.slice(), opts: { ...opts }, matches: [] };
  const seeded = seedPlayers(playerIds, opts.seeding, ratings);
  if (format === 'league') buildLeague(t, seeded);
  else if (format === 'knockout') buildBracket(t, seeded, { thirdPlace: !!opts.thirdPlace });
  else if (format === 'swiss') buildSwiss(t, seeded);
  else if (format === 'groups') buildGroups(t, seeded);
  else if (format === 'koth') buildKoth(t, seeded);
  syncBracket(t);
  return t;
}

function buildLeague(t, ids) {
  t.opts.legs = t.opts.legs === 2 ? 2 : 1;
  roundRobinPairs(ids, t.opts.legs).forEach((pairs, r) => {
    for (const [home, away] of pairs) t.matches.push(mk('league', r + 1, { home, away }));
  });
}

// entrants: seed order; each entry is a player id or a group source {g, pos}.
function buildBracket(t, entrants, { thirdPlace }) {
  const n = entrants.length;
  const size = nextPow2(n);
  const rounds = Math.max(1, Math.log2(size));
  const order = seedOrder(size);
  for (let i = 0; i < size / 2; i++) {
    const ea = order[2 * i] <= n ? entrants[order[2 * i] - 1] : null;
    const eb = order[2 * i + 1] <= n ? entrants[order[2 * i + 1] - 1] : null;
    const m = mk('ko', 1, { slot: i });
    placeEntrant(m, 'H', ea);
    placeEntrant(m, 'A', eb);
    if (ea == null || eb == null) m.bye = true;
    t.matches.push(m);
  }
  for (let r = 2; r <= rounds; r++) {
    for (let i = 0; i < size / 2 ** r; i++) t.matches.push(mk('ko', r, { slot: i }));
  }
  t.koRounds = rounds;
  t.opts.thirdPlace = !!(thirdPlace && rounds >= 2 && n >= 4);
  if (t.opts.thirdPlace) t.matches.push(mk('third', rounds, { slot: 0 }));
}

function placeEntrant(m, side, e) {
  if (e == null) return;
  if (typeof e === 'string') m[side === 'H' ? 'home' : 'away'] = e;
  else m[side === 'H' ? 'srcH' : 'srcA'] = e;
}

function buildSwiss(t, seeded) {
  const n = seeded.length;
  t.opts.rounds = clamp(Number(t.opts.rounds) || swissDefaultRounds(n), 1, swissMaxRounds(n));
  // Round 1: top half meets bottom half of the seed list; the last seed rests if odd.
  const list = seeded.slice();
  let bye = null;
  if (list.length % 2) bye = list.pop();
  const half = list.length / 2;
  const pairs = [];
  for (let i = 0; i < half; i++) pairs.push(i % 2 ? [list[i + half], list[i]] : [list[i], list[i + half]]);
  addSwissRound(t, 1, pairs, bye);
}

function addSwissRound(t, round, pairs, bye) {
  for (const [home, away] of pairs) t.matches.push(mk('swiss', round, { home, away }));
  if (bye) t.matches.push(mk('swiss', round, { home: bye, away: null, bye: true }));
}

const pairKey = (a, b) => (a < b ? a + '|' + b : b + '|' + a);

const REST = '__rest__';

// All perfect pairings of `list` that avoid `used`, best (closest in ranking) first.
function* pairings(list, used, tick) {
  if (!list.length) { yield []; return; }
  if (!tick()) return;
  const [a, ...rest] = list;
  for (let j = 0; j < rest.length; j++) {
    if (used.has(pairKey(a, rest[j]))) continue;
    const remaining = rest.slice(0, j).concat(rest.slice(j + 1));
    for (const sub of pairings(remaining, used, tick)) yield [[a, rest[j]], ...sub];
  }
}

// Can `k` more rounds be scheduled without any repeated pairing? (rests = pairing with REST)
function canSchedule(nodes, used, k, tick) {
  if (k === 0) return true;
  for (const pm of pairings(nodes, used, tick)) {
    const added = pm.map(([a, b]) => pairKey(a, b));
    added.forEach((x) => used.add(x));
    const ok = canSchedule(nodes, used, k - 1, tick);
    added.forEach((x) => used.delete(x));
    if (ok) return true;
    if (!tick()) return false;
  }
  return false;
}

// Pair players in ranking order, avoiding rematches and double rests. Looks ahead so the
// remaining `roundsAfter` rounds can still be played without rematches. The rest goes to the
// lowest-ranked player with the fewest rests so far.
export function swissPair(order, playedSet, byeCounts = {}, roundsAfter = 0) {
  const odd = order.length % 2 === 1;
  const used = new Set(playedSet);
  if (odd) for (const [p, c] of Object.entries(byeCounts)) if (c > 0) used.add(pairKey(p, REST));
  let budget = 400000;
  const tick = () => --budget > 0;
  const restOrder = odd
    ? order.map((id, i) => ({ id, i, c: byeCounts[id] || 0 })).sort((a, b) => (a.c - b.c) || (b.i - a.i)).map((x) => x.id)
    : [null];
  const nodes = odd ? [...order, REST] : order;
  let first = null;
  for (const bye of restOrder) {
    const list = bye ? order.filter((id) => id !== bye) : order;
    for (const pairs of pairings(list, used, tick)) {
      const cand = { pairs, bye, rematch: false };
      if (!first) first = cand;
      if (roundsAfter <= 0) return cand;
      const next = new Set(used);
      pairs.forEach(([a, b]) => next.add(pairKey(a, b)));
      if (bye) next.add(pairKey(bye, REST));
      if (canSchedule(nodes, next, roundsAfter, tick)) return cand;
      if (budget <= 0) return first;
    }
    if (budget <= 0) break;
  }
  if (first) return first;
  // No rematch-free pairing exists at all: pair neighbours in the ranking.
  const list = order.slice();
  let bye = null;
  if (odd) bye = list.splice(list.indexOf(restOrder[0]), 1)[0];
  const pairs = [];
  for (let i = 0; i < list.length; i += 2) pairs.push([list[i], list[i + 1]]);
  return { pairs, bye, rematch: true };
}

export function swissCurrentRound(t) {
  return t.matches.reduce((mx, m) => (m.stage === 'swiss' ? Math.max(mx, m.round) : mx), 0);
}

// After a result in `editedRound` changes, later rounds that have no results yet were drawn from
// out-of-date standings: drop them so they are re-drawn. Rounds that already have results stay.
function swissDropStaleRounds(t, editedRound) {
  for (let r = swissCurrentRound(t); r > editedRound; r--) {
    const ms = t.matches.filter((m) => m.stage === 'swiss' && m.round === r);
    if (ms.some((m) => !m.bye && isPlayed(m))) break;
    t.matches = t.matches.filter((m) => !(m.stage === 'swiss' && m.round === r));
  }
}

// Generates the next Swiss round when the current one is complete. Returns the new round number or 0.
export function swissMaybeNextRound(t) {
  if (t.format !== 'swiss') return 0;
  const cur = swissCurrentRound(t);
  if (cur >= t.opts.rounds) return 0;
  // Every game so far must have a result (a cleared result in an older round blocks the draw).
  if (!t.matches.every((m) => m.stage !== 'swiss' || m.bye || isPlayed(m))) return 0;
  const table = standingsFor(t);
  const played = new Set();
  const byeCounts = Object.create(null);
  const homeCount = Object.create(null);
  for (const m of t.matches) {
    if (m.stage !== 'swiss') continue;
    if (m.bye) { byeCounts[m.home] = (byeCounts[m.home] || 0) + 1; continue; }
    played.add(pairKey(m.home, m.away));
    homeCount[m.home] = (homeCount[m.home] || 0) + 1;
  }
  const { pairs, bye } = swissPair(table.map((r) => r.id), played, byeCounts, t.opts.rounds - cur - 1);
  const balanced = pairs.map(([a, b]) => ((homeCount[a] || 0) <= (homeCount[b] || 0) ? [a, b] : [b, a]));
  addSwissRound(t, cur + 1, balanced, bye);
  return cur + 1;
}

function buildGroups(t, seeded) {
  const n = seeded.length;
  const valid = validGroupOptions(n);
  let G = Number(t.opts.groups) || 2;
  let K = Number(t.opts.advance) || 2;
  if (!valid.some((o) => o.groups === G && o.advance === K)) {
    const fallback = valid[0];
    if (!fallback) throw new Error('Not enough players for groups');
    G = fallback.groups; K = fallback.advance;
  }
  t.opts.groups = G; t.opts.advance = K;
  t.opts.legs = t.opts.legs === 2 ? 2 : 1;
  const groups = Array.from({ length: G }, () => []);
  seeded.forEach((id, i) => {
    const row = Math.floor(i / G);
    const col = i % G;
    groups[row % 2 ? G - 1 - col : col].push(id); // snake draw: pots spread evenly
  });
  t.groups = groups;
  const perGroup = groups.map((g) => roundRobinPairs(g, t.opts.legs));
  const maxR = Math.max(...perGroup.map((r) => r.length));
  for (let r = 0; r < maxR; r++) {
    perGroup.forEach((rounds, g) => {
      for (const [home, away] of rounds[r] || []) t.matches.push(mk('group', r + 1, { group: g, home, away }));
    });
  }
  const entrants = [];
  for (let pos = 1; pos <= K; pos++) for (let g = 0; g < G; g++) entrants.push({ g, pos });
  buildBracket(t, entrants, { thirdPlace: !!t.opts.thirdPlace });
  fixGroupClashes(t);
}

// Safety net: no first-round knockout tie between two teams from the same group.
function fixGroupClashes(t) {
  const first = t.matches.filter((m) => m.stage === 'ko' && m.round === 1 && m.srcH && m.srcA);
  const clash = (m) => m.srcH.g === m.srcA.g;
  for (let guard = 0; guard < 50; guard++) {
    const bad = first.find(clash);
    if (!bad) return;
    let fixed = false;
    for (const other of first) {
      if (other === bad) continue;
      [bad.srcA, other.srcA] = [other.srcA, bad.srcA];
      if (!clash(bad) && !clash(other)) { fixed = true; break; }
      [bad.srcA, other.srcA] = [other.srcA, bad.srcA];
    }
    if (!fixed) return;
  }
}

function buildKoth(t, seeded) {
  t.queue0 = seeded.slice();
  t.opts.target = clamp(Number(t.opts.target) || 3, 1, 10);
  kothAdvance(t);
}

// ---------------------------------------------------------------- progression

function setParticipants(m, home, away) {
  home = home ?? null;
  away = away ?? null;
  if (m.home !== home || m.away !== away) {
    const hadResult = isPlayed(m);
    m.home = home;
    m.away = away;
    clearResult(m);
    return hadResult ? 1 : 0;
  }
  return 0;
}

function koMatch(t, round, slot) {
  return t.matches.find((m) => m.stage === 'ko' && m.round === round && m.slot === slot);
}

// Fills knockout participants from group tables and earlier winners.
// Results whose participants changed are cleared; returns how many were cleared.
export function syncBracket(t) {
  if (!t.koRounds) return 0;
  let cleared = 0;
  if (t.format === 'groups') {
    const groupMatches = stageMatches(t, 'group');
    const complete = groupMatches.length > 0 && groupMatches.every(isPlayed);
    const tables = complete ? t.groups.map((_, g) => standingsFor(t, g)) : null;
    for (const m of t.matches) {
      if (m.stage !== 'ko' || m.round !== 1) continue;
      const pick = (src) => (src && tables ? tables[src.g][src.pos - 1]?.id : null);
      cleared += setParticipants(m, pick(m.srcH), pick(m.srcA));
    }
  }
  for (let r = 2; r <= t.koRounds; r++) {
    for (const m of t.matches) {
      if (m.stage !== 'ko' || m.round !== r) continue;
      cleared += setParticipants(m, matchWinner(koMatch(t, r - 1, m.slot * 2)), matchWinner(koMatch(t, r - 1, m.slot * 2 + 1)));
    }
  }
  const third = t.matches.find((m) => m.stage === 'third');
  if (third) cleared += setParticipants(third, matchLoser(koMatch(t, t.koRounds - 1, 0)), matchLoser(koMatch(t, t.koRounds - 1, 1)));
  return cleared;
}

export function kothState(t) {
  const order = t.queue0 || t.players;
  const target = t.opts.target || 3;
  let king = order[0];
  const queue = order.slice(1);
  let streak = 0;
  let done = false;
  const rows = Object.create(null);
  for (const id of order) rows[id] = { id, p: 0, w: 0, l: 0, gf: 0, ga: 0, best: 0, reigns: 0 };
  const ms = t.matches.filter((m) => m.stage === 'koth').sort((a, b) => a.round - b.round);
  for (const m of ms) {
    if (done || !isPlayed(m)) break;
    const w = matchWinner(m);
    if (!w) break;
    const l = w === m.home ? m.away : m.home;
    const challenger = m.home === king ? m.away : m.home;
    const qi = queue.indexOf(challenger);
    if (qi >= 0) queue.splice(qi, 1);
    queue.push(l);
    if (w === king) streak++;
    else { king = w; streak = 1; rows[w].reigns++; }
    for (const [id, gf, ga] of [[m.home, m.hg, m.ag], [m.away, m.ag, m.hg]]) {
      rows[id].p++; rows[id].gf += gf; rows[id].ga += ga;
    }
    rows[w].w++; rows[l].l++;
    rows[w].best = Math.max(rows[w].best, streak);
    if (streak >= target) done = true;
  }
  const table = Object.values(rows).sort((a, b) => (b.w - a.w) || (b.best - a.best) || (a.l - b.l) || ((b.gf - b.ga) - (a.gf - a.ga)));
  let champion = null;
  if (done) champion = king;
  else if (t.endedManually && table.length && table[0].p > 0) champion = table[0].id;
  return { king, queue, streak, target, done, champion, table };
}

function kothAdvance(t) {
  const ms = t.matches.filter((m) => m.stage === 'koth').sort((a, b) => a.round - b.round);
  const firstOpen = ms.findIndex((m) => !isPlayed(m));
  if (firstOpen >= 0) {
    const drop = new Set(ms.slice(firstOpen + 1).map((m) => m.id));
    t.matches = t.matches.filter((m) => !drop.has(m.id));
  }
  const st = kothState(t);
  const open = firstOpen >= 0 ? ms[firstOpen] : null;
  if (st.done || t.endedManually) {
    if (open) t.matches = t.matches.filter((m) => m.id !== open.id);
    return;
  }
  if (open) { open.home = st.king; open.away = st.queue[0]; return; }
  t.matches.push(mk('koth', ms.length + 1, { home: st.king, away: st.queue[0] }));
}

// ---------------------------------------------------------------- results

export function canEditMatch(t, m) {
  if (!m || m.bye || !m.home || !m.away) return false;
  if (m.stage === 'koth') {
    const ms = t.matches.filter((x) => x.stage === 'koth').sort((a, b) => a.round - b.round);
    const lastPlayed = [...ms].reverse().find(isPlayed);
    return !isPlayed(m) || m === lastPlayed;
  }
  return true;
}

function progress(t, now) {
  let cleared = 0;
  let newRound = 0;
  if (t.format === 'knockout' || t.format === 'groups') cleared = syncBracket(t);
  if (t.format === 'swiss') newRound = swissMaybeNextRound(t);
  if (t.format === 'koth') kothAdvance(t);
  const st = tournamentState(t);
  if (st.done && !t.finishedAt) t.finishedAt = now;
  if (!st.done) t.finishedAt = null;
  return { cleared, newRound, done: st.done, championId: st.championId };
}

export function validateResult(m, r) {
  const ok = (v) => Number.isInteger(v) && v >= 0 && v <= 99;
  if (!ok(r.hg) || !ok(r.ag)) return 'goals';
  if (needsWinner(m) && r.hg === r.ag) {
    if (!ok(r.hp) || !ok(r.ap) || r.hp === r.ap) return 'penalties';
  }
  return null;
}

export function applyResult(t, matchId, r, now = Date.now()) {
  const m = t.matches.find((x) => x.id === matchId);
  if (!canEditMatch(t, m)) throw new Error('Match cannot be edited');
  const err = validateResult(m, r);
  if (err) throw new Error('Invalid result: ' + err);
  m.hg = r.hg; m.ag = r.ag;
  const pens = needsWinner(m) && r.hg === r.ag;
  m.hp = pens ? r.hp : null;
  m.ap = pens ? r.ap : null;
  m.playedAt = m.playedAt || now;
  if (m.stage === 'swiss') swissDropStaleRounds(t, m.round);
  return progress(t, now);
}

export function clearMatch(t, matchId, now = Date.now()) {
  const m = t.matches.find((x) => x.id === matchId);
  if (!canEditMatch(t, m)) throw new Error('Match cannot be edited');
  clearResult(m);
  if (m.stage === 'swiss') swissDropStaleRounds(t, m.round);
  // Clearing a result after "end the night" re-opens the night, so the match can be replayed.
  if (m.stage === 'koth') t.endedManually = false;
  return progress(t, now);
}

// Dry run: how many other results would be wiped by this change.
export function previewResult(t, matchId, r) {
  const copy = deepClone(t);
  const res = r ? applyResult(copy, matchId, r) : clearMatch(copy, matchId);
  return res.cleared;
}

export function endKoth(t, now = Date.now()) {
  t.endedManually = true;
  return progress(t, now);
}

export function resumeKoth(t, now = Date.now()) {
  t.endedManually = false;
  return progress(t, now);
}

// ---------------------------------------------------------------- state

export function tournamentState(t) {
  const real = t.matches.filter((m) => !m.bye);
  const played = real.filter(isPlayed).length;
  let total = real.length;
  let done = false;
  let podium = [];
  if (t.format === 'league') {
    done = total > 0 && played === total;
    if (done) podium = standingsFor(t).slice(0, 3).map((r) => r.id);
  } else if (t.format === 'swiss') {
    total = t.opts.rounds * Math.floor(t.players.length / 2);
    done = swissCurrentRound(t) === t.opts.rounds && played === total;
    if (done) podium = standingsFor(t).slice(0, 3).map((r) => r.id);
  } else if (t.format === 'knockout' || t.format === 'groups') {
    const final = koMatch(t, t.koRounds, 0);
    const third = t.matches.find((m) => m.stage === 'third');
    const champ = matchWinner(final);
    done = !!champ && (!third || !!matchWinner(third));
    if (done) podium = [champ, matchLoser(final), third ? matchWinner(third) : null].filter(Boolean);
  } else if (t.format === 'koth') {
    const st = kothState(t);
    total = null;
    done = st.champion != null;
    if (done) podium = [st.champion, ...st.table.map((r) => r.id).filter((id) => id !== st.champion)].slice(0, 3);
  }
  return { done, played, total, championId: done ? podium[0] || null : null, podium };
}

// Unplayed matches that are ready to be played, in a sensible playing order.
export function upcomingMatches(t) {
  const key = (m) => {
    if (m.stage === 'third') return [1, t.koRounds - 0.5, 0];
    if (m.stage === 'ko') return [1, m.round, m.slot];
    return [0, m.round, t.matches.indexOf(m)];
  };
  return t.matches
    .filter((m) => !m.bye && !isPlayed(m) && m.home && m.away)
    .sort((a, b) => {
      const ka = key(a);
      const kb = key(b);
      return (ka[0] - kb[0]) || (ka[1] - kb[1]) || (ka[2] - kb[2]);
    });
}
