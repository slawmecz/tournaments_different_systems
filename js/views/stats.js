import { t, tc, fmtNum, fmtDate } from '../core/i18n.js';
import { getDB, context, player } from '../core/store.js';
import { playerStats, records, headToHead } from '../core/stats.js';
import { esc, icon, avatar, pname, playerLink, formChips, wdlBar } from '../ui.js';
import { FORMAT_ICON, formatName, emptyState, rerender } from './common.js';

const TABS = ['ranking', 'records', 'h2h', 'hof'];
const TAB_ICON = { ranking: 'chart', records: 'star', h2h: 'bolt', hof: 'trophy' };
let sort = { key: 'elo', dir: -1 };
let h2hPick = { a: null, b: null };

export function render({ tab, a, b }) {
  const db = getDB();
  const ctx = context();
  const active = TABS.includes(tab) ? tab : 'ranking';
  if (a && b) { h2hPick = { a, b }; }
  const head = `<div class="page-head"><div class="titles"><span class="eyebrow">${icon('chart', 'ico-sm')}${esc(tc('n.match', ctx.matches.length))}</span>
    <h1 class="display h1">${esc(t('st.title'))}</h1><p class="lead">${esc(t('st.lead'))}</p></div></div>`;
  if (!ctx.matches.length) {
    return `<div class="page">${head}${emptyState({ iconName: 'chart', title: t('st.title'), text: t('st.empty'), actions: `<a class="btn btn-primary" href="#/new">${icon('plus')}${esc(t('nav.new'))}</a>` })}</div>`;
  }
  const tabs = `<div class="tabs" role="tablist">${TABS.map((k) => `<a role="tab" aria-selected="${k === active}" class="${k === active ? 'on' : ''}" href="#/stats/${k}">${icon(TAB_ICON[k], 'ico-sm')}${esc(t('st.' + k))}</a>`).join('')}</div>`;
  let body = '';
  if (active === 'ranking') body = ranking(db, ctx);
  else if (active === 'records') body = recordsView(db, ctx);
  else if (active === 'h2h') body = h2hView(db, ctx);
  else body = hof(ctx);
  return `<div class="page">${head}${tabs}<div>${body}</div></div>`;
}

function ranking(db, ctx) {
  const rows = db.players.map((p) => playerStats(db, p.id, ctx));
  const val = (s, k) => (k === 'name' ? player(s.id).name.toLowerCase() : k === 'gd' ? s.gf - s.ga : s[k]);
  rows.sort((x, y) => {
    if ((x.p > 0) !== (y.p > 0)) return x.p > 0 ? -1 : 1;
    const a = val(x, sort.key);
    const b = val(y, sort.key);
    const c = typeof a === 'string' ? a.localeCompare(b) : a - b;
    return c * sort.dir || y.elo - x.elo;
  });
  const th = (k, label, cls = '') => `<th class="sortable ${cls} ${sort.key === k ? 'sorted' : ''}" data-sort="${k}" aria-sort="${sort.key === k ? (sort.dir < 0 ? 'descending' : 'ascending') : 'none'}">${esc(label)}${sort.key === k ? (sort.dir < 0 ? ' ↓' : ' ↑') : ''}</th>`;
  return `<div class="card"><div class="table-wrap"><table class="table">
    <thead><tr><th>#</th>${th('name', t('col.player'), 'l')}${th('elo', t('col.elo'))}${th('p', t('col.p'))}${th('w', t('col.w'), 'hide-sm')}${th('d', t('col.d'), 'hide-sm')}${th('l', t('col.l'), 'hide-sm')}${th('gf', t('col.goals'), 'hide-sm')}${th('gd', t('col.gd'))}${th('winPct', t('col.win'), 'hide-sm')}${th('titles', t('col.titles'))}<th class="hide-sm">${esc(t('col.form'))}</th></tr></thead>
    <tbody>${rows.map((s, i) => `<tr class="pos-${i + 1}"><td class="pos"><span class="pos-badge">${s.p ? i + 1 : '–'}</span></td><td class="l player">${playerLink(s.id)}</td>
      <td class="pts num">${fmtNum(Math.round(s.elo))}</td><td>${s.p}</td><td class="hide-sm">${s.w}</td><td class="hide-sm">${s.d}</td><td class="hide-sm">${s.l}</td>
      <td class="hide-sm">${s.gf}:${s.ga}</td><td class="${s.gd > 0 ? 'gd-pos' : s.gd < 0 ? 'gd-neg' : ''}">${s.gd > 0 ? '+' : ''}${s.gd}</td><td class="hide-sm">${s.p ? s.winPct + '%' : '–'}</td>
      <td>${s.titles ? `<span style="color:var(--gold);font-weight:700">${icon('trophy', 'ico-sm')} ${s.titles}</span>` : '<span class="dim">0</span>'}</td><td class="hide-sm">${formChips(s.form, 5)}</td></tr>`).join('')}</tbody>
  </table></div><p class="dim" style="font-size:.78rem;margin:14px 0 0">${icon('info', 'ico-sm')} ${esc(t('st.eloInfo'))}</p></div>`;
}

function recordsView(db, ctx) {
  const r = records(db, ctx);
  const card = (ic, cls, label, value, who, sub = '') => `<div class="record"><span class="ricon ${cls}">${icon(ic)}</span><div class="rbody"><div class="rk">${esc(label)}</div><div class="rv">${value}</div><div class="rs">${who}${sub ? ` <span class="dim">· ${sub}</span>` : ''}</div></div></div>`;
  const matchWho = (m) => `${pname(m.home)} ${m.hg}:${m.ag} ${pname(m.away)}`;
  const personal = (rec) => `<span class="row" style="gap:6px;display:inline-flex">${avatar(rec.id, 'xs')}${pname(rec.id)}</span>`;
  const items = [];
  if (r.biggestWin) items.push(card('bolt', '', t('rec.biggestWin'), `${Math.max(r.biggestWin.m.hg, r.biggestWin.m.ag)}:${Math.min(r.biggestWin.m.hg, r.biggestWin.m.ag)}`, matchWho(r.biggestWin.m), esc(r.biggestWin.m.tname)));
  if (r.mostGoals) items.push(card('flame', 'red', t('rec.mostGoals'), esc(tc('n.goal', r.mostGoals.total)), matchWho(r.mostGoals.m), esc(r.mostGoals.m.tname)));
  if (r.mostTitles) items.push(card('trophy', 'gold', t('rec.mostTitles'), esc(tc('n.title', r.mostTitles.v)), personal(r.mostTitles)));
  if (r.longestWin) items.push(card('star', 'gold', t('rec.longestWin'), esc(t('rec.inARow', { n: r.longestWin.v })), personal(r.longestWin)));
  if (r.longestUnbeaten) items.push(card('shield', 'violet', t('rec.longestUnbeaten'), esc(t('rec.inARow', { n: r.longestUnbeaten.v })), personal(r.longestUnbeaten)));
  if (r.peakElo) items.push(card('chart', '', t('rec.peakElo'), fmtNum(Math.round(r.peakElo.v)), personal(r.peakElo)));
  if (r.mostGoalsPlayer) items.push(card('ball', '', t('rec.mostGoalsPlayer'), esc(tc('n.goal', r.mostGoalsPlayer.v)), personal(r.mostGoalsPlayer)));
  if (r.bestAttack) items.push(card('bolt', 'violet', t('rec.bestAttack'), esc(t('rec.perMatch', { v: fmtNum(r.bestAttack.v, 2) })), personal(r.bestAttack), esc(t('rec.minMatches'))));
  if (r.bestDefense) items.push(card('shield', '', t('rec.bestDefense'), esc(t('rec.perMatchAgainst', { v: fmtNum(-r.bestDefense.v, 2) })), personal(r.bestDefense), esc(t('rec.minMatches'))));
  if (r.cleanSheets && r.cleanSheets.v > 0) items.push(card('lock', 'violet', t('rec.cleanSheets'), String(r.cleanSheets.v), personal(r.cleanSheets)));
  if (r.mostMatches) items.push(card('calendar', '', t('rec.mostMatches'), esc(tc('n.match', r.mostMatches.v)), personal(r.mostMatches)));
  return `<div class="grid-3 stagger">${items.map((x, i) => x.replace('<div class="record"', `<div class="record" style="--i:${i}"`)).join('')}</div>`;
}

function h2hView(db, ctx) {
  const played = db.players.filter((p) => ctx.elo.history[p.id]?.length);
  if (played.length < 2) return `<div class="card"><p class="muted" style="margin:0">${esc(t('st.empty'))}</p></div>`;
  let { a, b } = h2hPick;
  if (!played.some((p) => p.id === a)) a = ctx.ranking.find((r) => r.played)?.id || played[0].id;
  if (!played.some((p) => p.id === b) || b === a) b = (ctx.ranking.find((r) => r.played && r.id !== a) || played.find((p) => p.id !== a)).id;
  h2hPick = { a, b };
  const opt = (sel) => played.map((p) => `<option value="${esc(p.id)}" ${p.id === sel ? 'selected' : ''}>${esc(p.name)}</option>`).join('');
  const picker = `<div class="card tight"><div class="h2h-pick"><select class="select" data-h2h="a" aria-label="A">${opt(a)}</select><span class="vs">VS</span><select class="select" data-h2h="b" aria-label="B">${opt(b)}</select></div></div>`;
  const h = headToHead(ctx, a, b);
  const sa = playerStats(db, a, ctx);
  const sb = playerStats(db, b, ctx);
  const side = (id, s) => `<div class="vs-side">${avatar(id, 'xl', 'av-ring')}<span class="pname">${pname(id)}</span><span class="sub">Elo ${fmtNum(Math.round(s.elo))} · ${s.winPct}%</span></div>`;
  const total = h.p || 1;
  const versus = `<section class="versus"><div class="vs-row">${side(a, sa)}
    <div class="vs-mid"><span class="eyebrow">${esc(t('st.meetings'))}: ${h.p}</span><span class="vs-score num">${h.aw}<span class="sep">–</span>${h.d}<span class="sep">–</span>${h.bw}</span><span class="dim" style="font-size:.8rem">${esc(t('st.goals'))} ${h.ag}:${h.bg}</span></div>
    ${side(b, sb)}</div>
    ${h.p ? `<div class="vs-split"><span style="width:${(h.aw / total) * 100}%;background:var(--accent)"></span><span style="width:${(h.d / total) * 100}%;background:var(--draw)"></span><span style="width:${(h.bw / total) * 100}%;background:var(--accent-3)"></span></div>
    <div class="wdl-legend" style="justify-content:center"><span><i style="background:var(--accent)"></i>${pname(a)}</span><span><i style="background:var(--draw)"></i>${esc(t('pl.draws'))}</span><span><i style="background:var(--accent-3)"></i>${pname(b)}</span></div>` : ''}
  </section>`;
  const list = h.p
    ? `<div class="card"><div class="section-head"><h2 class="h3">${esc(t('st.meetings'))}</h2></div><div class="result-list">${h.list.map((m) => {
      const aHome = m.home === a;
      const ga = aHome ? m.hg : m.ag;
      const gb = aHome ? m.ag : m.hg;
      return `<a class="result-item" href="#/t/${esc(m.tid)}"><span class="s ${ga > gb ? 'win' : ''}">${avatar(a, 'xs')}<span class="pname">${pname(a)}</span></span><span class="sc num">${ga}:${gb}${m.hp != null ? ` <small class="dim">(${aHome ? m.hp : m.ap}:${aHome ? m.ap : m.hp})</small>` : ''}</span><span class="s r ${gb > ga ? 'win' : ''}">${avatar(b, 'xs')}<span class="pname">${pname(b)}</span></span></a>
        <div class="dim" style="font-size:.74rem;margin:-6px 0 4px;text-align:center">${esc(m.tname)} · ${esc(fmtDate(m.at, { day: 'numeric', month: 'short', year: 'numeric' }))}</div>`;
    }).join('')}</div></div>`
    : `<div class="card"><p class="muted" style="margin:0;text-align:center">${esc(t('st.h2hNone'))}</p></div>`;
  return `<div class="stack">${picker}${versus}${list}</div>`;
}

function hof(ctx) {
  const list = ctx.champs.list;
  if (!list.length) return `<div class="card"><p class="muted" style="margin:0">${esc(t('st.hofEmpty'))}</p></div>`;
  return `<div class="stack stagger">${list.map((c, i) => `<a class="hof-item" href="#/t/${esc(c.t.id)}" style="--i:${i}">
    <span class="cup">${icon('trophy')}</span>
    <div style="min-width:0"><div class="tname">${esc(c.t.name)}</div><div class="when">${icon(FORMAT_ICON[c.t.format], 'ico-sm')} ${esc(formatName(c.t.format))} · ${esc(fmtDate(c.at))}</div></div>
    <span class="champ">${avatar(c.championId, 'sm', 'av-ring-gold')}<span>${pname(c.championId)}</span></span></a>`).join('')}</div>`;
}

export function mount(root) {
  root.querySelectorAll('[data-sort]').forEach((th) => th.addEventListener('click', () => {
    const k = th.dataset.sort;
    sort = sort.key === k ? { key: k, dir: -sort.dir } : { key: k, dir: k === 'name' ? 1 : -1 };
    rerender({ keepScroll: true });
  }));
  root.querySelectorAll('[data-h2h]').forEach((sel) => sel.addEventListener('change', () => {
    h2hPick[sel.dataset.h2h] = sel.value;
    location.hash = `#/h2h/${h2hPick.a}/${h2hPick.b}`;
  }));
}
