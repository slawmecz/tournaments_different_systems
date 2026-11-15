// All-time statistics computed from the raw match records (pure, no DOM).
import { isPlayed, tournamentState } from './formats.js';

export const ELO_START = 1000;
const ELO_K = 30;

// Margin-of-victory multiplier (World Football Elo style): big wins move ratings more.
const marginMult = (gd) => {
  const d = Math.abs(gd);
  return d <= 1 ? 1 : d === 2 ? 1.5 : (11 + d) / 8;
};

// Every real played match, oldest first, tagged with its tournament.
export function playedMatches(db) {
  const out = [];
  for (const t of db.tournaments) {
    t.matches.forEach((m, i) => {
      if (m.bye || !isPlayed(m) || !m.home || !m.away) return;
      out.push({ ...m, tid: t.id, tname: t.name, order: i, at: m.playedAt || t.createdAt });
    });
  }
  out.sort((a, b) => (a.at - b.at) || (a.order - b.order));
  return out;
}

// Penalty shoot-outs count as draws (football convention); the shoot-out only decides who advances.
const outcome = (gf, ga) => (gf > ga ? 'W' : gf < ga ? 'L' : 'D');

export function computeElo(db, matches = playedMatches(db)) {
  const rating = {};
  const peak = {};
  const history = {};
  for (const p of db.players) {
    rating[p.id] = ELO_START;
    peak[p.id] = ELO_START;
    history[p.id] = [];
  }
  for (const m of matches) {
    for (const id of [m.home, m.away]) {
      if (rating[id] == null) { rating[id] = ELO_START; peak[id] = ELO_START; history[id] = []; }
    }
    const ra = rating[m.home];
    const rb = rating[m.away];
    const ea = 1 / (1 + 10 ** ((rb - ra) / 400));
    const sa = m.hg > m.ag ? 1 : m.hg < m.ag ? 0 : 0.5;
    const delta = ELO_K * marginMult(m.hg - m.ag) * (sa - ea);
    rating[m.home] = ra + delta;
    rating[m.away] = rb - delta;
    peak[m.home] = Math.max(peak[m.home], rating[m.home]);
    peak[m.away] = Math.max(peak[m.away], rating[m.away]);
    history[m.home].push({ elo: rating[m.home], delta, m, opp: m.away, gf: m.hg, ga: m.ag });
    history[m.away].push({ elo: rating[m.away], delta: -delta, m, opp: m.home, gf: m.ag, ga: m.hg });
  }
  return { rating, peak, history };
}

export function championships(db) {
  const titles = {};
  const list = [];
  for (const t of db.tournaments) {
    const st = tournamentState(t);
    if (!st.done || !st.championId) continue;
    titles[st.championId] = (titles[st.championId] || 0) + 1;
    list.push({ t, championId: st.championId, podium: st.podium, at: t.finishedAt || t.createdAt });
  }
  list.sort((a, b) => b.at - a.at);
  return { titles, list };
}

function emptyLine() {
  return { p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0 };
}

export function playerStats(db, id, ctx = buildContext(db)) {
  const s = { id, ...emptyLine(), cleanSheets: 0, form: [], curStreak: { type: null, n: 0 }, longestWin: 0, longestUnbeaten: 0, biggestWin: null, vs: {}, matches: [] };
  let win = 0;
  let unbeaten = 0;
  for (const m of ctx.matches) {
    if (m.home !== id && m.away !== id) continue;
    const home = m.home === id;
    const gf = home ? m.hg : m.ag;
    const ga = home ? m.ag : m.hg;
    const opp = home ? m.away : m.home;
    const o = outcome(gf, ga);
    s.p++; s.gf += gf; s.ga += ga;
    if (o === 'W') s.w++; else if (o === 'L') s.l++; else s.d++;
    if (ga === 0) s.cleanSheets++;
    s.form.push(o);
    win = o === 'W' ? win + 1 : 0;
    unbeaten = o !== 'L' ? unbeaten + 1 : 0;
    s.longestWin = Math.max(s.longestWin, win);
    s.longestUnbeaten = Math.max(s.longestUnbeaten, unbeaten);
    if (o === 'W' && (!s.biggestWin || gf - ga > s.biggestWin.gf - s.biggestWin.ga || (gf - ga === s.biggestWin.gf - s.biggestWin.ga && gf > s.biggestWin.gf))) {
      s.biggestWin = { m, gf, ga, opp };
    }
    const v = (s.vs[opp] = s.vs[opp] || emptyLine());
    v.p++; v.gf += gf; v.ga += ga;
    if (o === 'W') v.w++; else if (o === 'L') v.l++; else v.d++;
    s.matches.push({ m, gf, ga, opp, o });
  }
  s.gd = s.gf - s.ga;
  s.winPct = s.p ? Math.round((s.w / s.p) * 100) : 0;
  s.gpm = s.p ? s.gf / s.p : 0;
  s.gapm = s.p ? s.ga / s.p : 0;
  if (s.form.length) {
    const last = s.form[s.form.length - 1];
    let n = 0;
    for (let i = s.form.length - 1; i >= 0 && s.form[i] === last; i--) n++;
    s.curStreak = { type: last, n };
  }
  s.elo = ctx.elo.rating[id] ?? ELO_START;
  s.peakElo = ctx.elo.peak[id] ?? ELO_START;
  s.eloHistory = ctx.elo.history[id] || [];
  s.titles = ctx.champs.titles[id] || 0;
  s.tournaments = db.tournaments.filter((t) => t.players.includes(id)).length;
  s.rank = ctx.ranking.findIndex((r) => r.id === id) + 1;
  // Rivals: the opponent you lose to most / beat most (minimum one result).
  let nemesis = null;
  let victim = null;
  for (const [opp, v] of Object.entries(s.vs)) {
    if (v.l > 0 && (!nemesis || v.l > nemesis.v.l || (v.l === nemesis.v.l && v.w < nemesis.v.w))) nemesis = { id: opp, v };
    if (v.w > 0 && (!victim || v.w > victim.v.w || (v.w === victim.v.w && v.l < victim.v.l))) victim = { id: opp, v };
  }
  s.nemesis = nemesis;
  s.victim = victim;
  return s;
}

// Shared, computed-once context for a database revision.
export function buildContext(db) {
  const matches = playedMatches(db);
  const elo = computeElo(db, matches);
  const champs = championships(db);
  const ranking = db.players
    .map((p) => ({ id: p.id, elo: elo.rating[p.id] ?? ELO_START, played: elo.history[p.id]?.length || 0 }))
    .sort((a, b) => (b.elo - a.elo) || (b.played - a.played));
  return { matches, elo, champs, ranking };
}

export function headToHead(ctx, a, b) {
  const r = { p: 0, aw: 0, d: 0, bw: 0, ag: 0, bg: 0, list: [] };
  for (const m of ctx.matches) {
    const ab = m.home === a && m.away === b;
    const ba = m.home === b && m.away === a;
    if (!ab && !ba) continue;
    const ga = ab ? m.hg : m.ag;
    const gb = ab ? m.ag : m.hg;
    r.p++; r.ag += ga; r.bg += gb;
    if (ga > gb) r.aw++; else if (gb > ga) r.bw++; else r.d++;
    r.list.push(m);
  }
  r.list.reverse();
  return r;
}

export function records(db, ctx = buildContext(db)) {
  const rec = {};
  for (const m of ctx.matches) {
    const diff = Math.abs(m.hg - m.ag);
    const total = m.hg + m.ag;
    if (diff > 0 && (!rec.biggestWin || diff > rec.biggestWin.diff || (diff === rec.biggestWin.diff && total > rec.biggestWin.total))) rec.biggestWin = { m, diff, total };
    if (!rec.mostGoals || total > rec.mostGoals.total) rec.mostGoals = { m, total };
  }
  const per = db.players.map((p) => playerStats(db, p.id, ctx)).filter((s) => s.p > 0);
  const best = (key, fn, min = 1) => {
    let top = null;
    for (const s of per) {
      if (s.p < min) continue;
      const v = fn(s);
      if (top == null || v > top.v) top = { id: s.id, v };
    }
    if (top) rec[key] = top;
  };
  best('longestWin', (s) => s.longestWin);
  best('longestUnbeaten', (s) => s.longestUnbeaten);
  best('mostGoalsPlayer', (s) => s.gf);
  best('mostMatches', (s) => s.p);
  best('bestAttack', (s) => s.gpm, 3);
  best('bestDefense', (s) => -s.gapm, 3);
  best('cleanSheets', (s) => s.cleanSheets);
  best('peakElo', (s) => s.peakElo);
  let titles = null;
  for (const [id, v] of Object.entries(ctx.champs.titles)) if (!titles || v > titles.v) titles = { id, v };
  if (titles) rec.mostTitles = titles;
  return rec;
}

export function totals(ctx, db) {
  let goals = 0;
  for (const m of ctx.matches) goals += m.hg + m.ag;
  return { tournaments: db.tournaments.length, matches: ctx.matches.length, goals, players: db.players.length };
}
