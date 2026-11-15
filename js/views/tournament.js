import { t, fmtNum } from '../core/i18n.js';
import { tournament, updateTournament, deleteTournament, player, commit } from '../core/store.js';
import {
  tournamentState, standingsFor, upcomingMatches, isPlayed, matchWinner, needsWinner, previewResult,
  applyResult, clearMatch, kothState, endKoth, resumeKoth, canEditMatch, validateResult, stageMatches,
} from '../core/formats.js';
import { deepClone } from '../core/util.js';
import { esc, icon, avatar, pname, playerLink, formChips, toast, openModal, confirmDialog, promptDialog, confetti, trophySVG, copyText } from '../ui.js';
import { matchRow, byeRow, matchLabel, koRoundName, groupLetter, statusBadge, FORMAT_ICON, formatName, dateLong, rerender } from './common.js';
import { encodeSnapshot, textSummary } from '../core/share.js';

const tabState = new Map();
const TABS = {
  league: ['table', 'matches', 'stats'],
  knockout: ['bracket', 'matches', 'stats'],
  swiss: ['table', 'matches', 'stats'],
  groups: ['groups', 'bracket', 'matches', 'stats'],
  koth: ['queue', 'matches', 'stats'],
};
const TAB_ICON = { table: 'league', matches: 'ball', bracket: 'knockout', groups: 'groups', stats: 'chart', queue: 'crown' };

// ---------------------------------------------------------------- page
export function render({ id }, { snapshot } = {}) {
  const tour = snapshot ? snapshot.t : tournament(id);
  if (!tour) {
    return `<div class="page"><div class="card not-found"><h1 class="display h2">${esc(t('t.notFound'))}</h1><p><a class="btn" href="#/tournaments">${icon('arrow-l')}${esc(t('nav.tournaments'))}</a></p></div></div>`;
  }
  const readOnly = !!snapshot;
  const st = tournamentState(tour);
  const tabs = TABS[tour.format];
  const tab = tabs.includes(tabState.get(tour.id)) ? tabState.get(tour.id) : tabs[0];

  const banner = readOnly ? `<div class="banner-shared">${icon('link')}<div class="txt"><b>${esc(t('sh.banner'))}</b>${esc(t('sh.bannerHint'))}</div><button class="btn btn-primary btn-sm" data-act="import">${icon('download')}${esc(t('sh.import'))}</button></div>` : '';
  const pct = st.total ? Math.round((st.played / st.total) * 100) : 0;
  const progress = !st.done && st.total
    ? `<div><div class="progress-label"><span>${esc(t('t.progress', { p: st.played, t: st.total }))}</span><span class="num">${pct}%</span></div><div class="progress"><span style="width:${pct}%"></span></div></div>`
    : '';

  return `<div class="page">
    ${banner}
    ${header(tour, readOnly)}
    ${st.done ? championBanner(tour, st) : spotlight(tour, readOnly)}
    ${progress}
    <div class="tabs" role="tablist">${tabs.map((k) => `<button role="tab" aria-selected="${k === tab}" class="${k === tab ? 'on' : ''}" data-tab="${k}">${icon(TAB_ICON[k], 'ico-sm')}${esc(t('t.tab.' + k))}</button>`).join('')}</div>
    <div data-tabpanel>${tabContent(tour, tab, readOnly)}</div>
  </div>`;
}

function header(tour, readOnly) {
  const fs = document.fullscreenEnabled;
  return `<div class="page-head">
    <div class="titles">
      ${readOnly ? '' : `<a class="btn btn-ghost btn-sm" href="#/tournaments" style="align-self:flex-start;margin-left:-12px">${icon('arrow-l')}${esc(t('nav.tournaments'))}</a>`}
      <div class="row-wrap">${statusBadge(tour)}<span class="badge">${icon(FORMAT_ICON[tour.format])}${esc(formatName(tour.format))}</span><span class="dim" style="font-size:.84rem">${esc(dateLong(tour.createdAt))}</span></div>
      <h1 class="display h2" style="overflow-wrap:anywhere">${esc(tour.name)}</h1>
    </div>
    <div class="actions">
      ${fs ? `<button class="btn btn-icon" data-act="fullscreen" title="${esc(t('t.fullscreen'))}" aria-label="${esc(t('t.fullscreen'))}">${icon('expand')}</button>` : ''}
      ${readOnly ? '' : `<button class="btn" data-act="share">${icon('share')}${esc(t('t.share'))}</button>
      <button class="btn btn-icon" data-act="menu" title="${esc(t('t.more'))}" aria-label="${esc(t('t.more'))}">${icon('dots')}</button>`}
    </div>
  </div>`;
}

function championBanner(tour, st) {
  const [champ, second, third] = st.podium;
  const pill = (id, n) => (id ? `<span class="pl"><span class="medal m${n}">${n}</span>${avatar(id, 'xs')}${pname(id)}</span>` : '');
  return `<section class="champion">
    <div class="rays"></div>
    <div class="trophy-wrap">${trophySVG(120)}</div>
    <span class="eyebrow gold">${icon('crown', 'ico-sm')}${esc(t('t.champion'))}</span>
    <div class="champ-av">${avatar(champ, 'xl', 'av-ring-gold')}</div>
    <div class="champ-name gold-text">${pname(champ)}</div>
    <div class="podium">${pill(second, 2)}${pill(third, 3)}</div>
  </section>`;
}

function spotlight(tour, readOnly) {
  const ups = upcomingMatches(tour);
  if (!ups.length) return `<div class="notice">${icon('clock')}<span>${esc(t('t.noUpcoming'))}</span></div>`;
  const m = ups[0];
  const koth = tour.format === 'koth' ? kothState(tour) : null;
  const side = (id, sub, ring) => `<div class="vs-side">${avatar(id, 'xl', ring)}<span class="pname">${pname(id)}</span><span class="sub">${sub}</span></div>`;
  const homeSub = koth ? `${esc(t('t.king'))} · ${esc(t('t.streakOf', { n: koth.streak, t: koth.target }))}` : esc(t('sc.home'));
  return `<section class="spotlight">
    <div class="spotlight-head"><span class="badge badge-live">${esc(t('t.nowPlaying'))}</span><span class="round">${esc(matchLabel(tour, m))}</span></div>
    <div class="vs-row">
      ${side(m.home, homeSub, koth ? 'av-ring-gold' : 'av-ring')}
      <div class="vs-mid"><span class="vs-badge">VS</span></div>
      ${side(m.away, esc(koth ? t('t.challenger') : t('sc.away')), '')}
    </div>
    ${readOnly ? '' : `<div class="cta"><button class="btn btn-primary btn-lg" data-score="${esc(m.id)}">${icon('edit')}${esc(t('t.enterScore'))}</button></div>`}
    ${ups.length > 1 ? `<div class="up-next"><span class="lbl">${esc(t('t.upNext'))}</span>${ups.slice(1, 4).map((x) => `<div class="item">${avatar(x.home, 'xs')}<b>${pname(x.home)}</b><span class="dim">${esc(t('c.vs'))}</span><b>${pname(x.away)}</b>${avatar(x.away, 'xs')}<span class="dim hide-sm" style="margin-left:auto;font-size:.75rem">${esc(matchLabel(tour, x))}</span></div>`).join('')}</div>` : ''}
  </section>`;
}

function tabContent(tour, tab, readOnly) {
  switch (tab) {
    case 'table': return tableTab(tour);
    case 'matches': return matchesTab(tour, readOnly);
    case 'bracket': return bracketTab(tour, readOnly);
    case 'groups': return groupsTab(tour);
    case 'queue': return kothTab(tour);
    case 'stats': return statsTab(tour);
    default: return '';
  }
}

// ---------------------------------------------------------------- tables
function standingsTable(rows, { swiss = false, qualify = 0, compact = false } = {}) {
  const gd = (v) => `<span class="${v > 0 ? 'gd-pos' : v < 0 ? 'gd-neg' : ''}">${v > 0 ? '+' : ''}${v}</span>`;
  const hs = compact ? 'hide-sm' : 'hide-sm';
  return `<div class="table-wrap"><table class="table">
    <thead><tr><th>#</th><th class="l">${esc(t('col.player'))}</th><th>${esc(t('col.p'))}</th>
      <th class="${hs}">${esc(t('col.w'))}</th><th class="${hs}">${esc(t('col.d'))}</th><th class="${hs}">${esc(t('col.l'))}</th>
      <th class="hide-sm">${esc(t('col.goals'))}</th><th>${esc(t('col.gd'))}</th>
      ${swiss ? `<th title="${esc(t('col.bhInfo'))}">${esc(t('col.bh'))}</th>` : ''}<th>${esc(t('col.pts'))}</th>
      ${compact ? '' : `<th class="hide-sm">${esc(t('col.form'))}</th>`}</tr></thead>
    <tbody>${rows.map((r, i) => `<tr class="pos-${i + 1} ${i < qualify ? 'qualify' : ''}">
      <td class="pos"><span class="pos-badge">${i + 1}</span></td><td class="l player">${playerLink(r.id)}</td><td>${r.p}</td>
      <td class="${hs}">${r.w}</td><td class="${hs}">${r.d}</td><td class="${hs}">${r.l}</td>
      <td class="hide-sm">${r.gf}:${r.ga}</td><td>${gd(r.gd)}</td>${swiss ? `<td>${r.bh}</td>` : ''}<td class="pts">${r.pts}</td>
      ${compact ? '' : `<td class="hide-sm">${formChips(r.form, 5)}</td>`}</tr>`).join('')}</tbody></table></div>`;
}

function tableTab(tour) {
  const swiss = tour.format === 'swiss';
  return `<div class="card">${standingsTable(standingsFor(tour), { swiss })}
    ${swiss ? `<p class="dim" style="font-size:.78rem;margin:12px 0 0">${esc(t('col.bhInfo'))}</p>` : ''}</div>`;
}

function groupsTab(tour) {
  return `<div class="grid-2">${tour.groups.map((_, g) => `<div class="card group-card">
    <div class="section-head"><span class="group-letter">${groupLetter(g)}</span><h3 class="h3" style="flex:1">${esc(t('t.group', { g: groupLetter(g) }))}</h3><span class="badge badge-accent">${esc(t('t.qualify'))}: ${Number(tour.opts.advance) || 0}</span></div>
    ${standingsTable(standingsFor(tour, g), { qualify: tour.opts.advance, compact: true })}
  </div>`).join('')}</div>`;
}

// ---------------------------------------------------------------- matches
function matchesTab(tour, readOnly) {
  let list = tour.matches.slice();
  if (tour.format === 'knockout' || tour.format === 'groups') {
    const key = (m) => (m.stage === 'group' ? [0, m.round, 0] : m.stage === 'third' ? [1, tour.koRounds - 0.5, 0] : [1, m.round, m.slot]);
    list.sort((a, b) => { const ka = key(a); const kb = key(b); return (ka[0] - kb[0]) || (ka[1] - kb[1]) || (ka[2] - kb[2]); });
  }
  if (tour.format === 'koth') list.reverse();
  const sections = [];
  for (const m of list) {
    if (m.bye && m.stage !== 'swiss') continue;
    const label = m.stage === 'koth' ? '' : m.stage === 'group' ? t('t.matchday', { n: m.round }) : matchLabel(tour, m);
    let s = sections[sections.length - 1];
    if (!s || s.label !== label) sections.push((s = { label, items: [] }));
    s.items.push(m);
  }
  if (tour.format === 'koth' && !readOnly && list.some(isPlayed)) {
    sections.unshift({ note: t('t.locked') });
  }
  return `<div class="card"><div class="stack">${sections.map((s) => {
    if (s.note) return `<p class="dim" style="font-size:.8rem;margin:0">${icon('lock', 'ico-sm')} ${esc(s.note)}</p>`;
    const done = s.items.every((m) => m.bye || isPlayed(m));
    return `<div>${s.label ? `<div class="round-title">${esc(s.label)}${done ? `<span class="badge badge-accent">${icon('check')}</span>` : ''}</div>` : ''}
      <div class="match-list">${s.items.map((m) => {
        if (m.bye) return byeRow(m);
        if (!m.home || !m.away) return placeholderRow(tour, m);
        return matchRow(tour, m, { showMeta: m.stage === 'group' || m.stage === 'koth', readOnly });
      }).join('')}</div></div>`;
  }).join('')}</div></div>`;
}

function srcLabel(src) {
  return src ? t('t.src', { pos: src.pos, g: groupLetter(src.g) }) : t('t.tbd');
}

function placeholderRow(tour, m) {
  const side = (id, src, cls) => (id
    ? `<span class="side ${cls}">${avatar(id, 'sm')}<span class="pname">${pname(id)}</span></span>`
    : `<span class="side ${cls}"><span class="bm-ph">?</span><span class="pname dim">${esc(srcLabel(src))}</span></span>`);
  return `<div class="match locked">${side(m.home, m.srcH, 'home')}<span class="score"><span class="scorebox empty">${esc(t('c.vs'))}</span></span>${side(m.away, m.srcA, 'away')}</div>`;
}

// ---------------------------------------------------------------- bracket
function bracketMatch(tour, m, readOnly, isFinal) {
  const played = isPlayed(m);
  const w = matchWinner(m);
  const editable = !readOnly && canEditMatch(tour, m);
  const row = (id, src, goals, pens) => {
    if (!id && m.bye) return `<div class="bm-row bye"><span class="bm-ph">–</span><span class="pname">${esc(t('t.bye'))}</span></div>`;
    if (!id) return `<div class="bm-row tbd"><span class="bm-ph">?</span><span class="pname">${esc(srcLabel(src))}</span></div>`;
    const s = played ? `${goals}${m.hp != null ? `<small>(${pens})</small>` : ''}` : '';
    return `<div class="bm-row ${w === id ? 'win' : ''}">${avatar(id, 'xs')}<span class="pname">${pname(id)}</span><span class="s num">${s}</span></div>`;
  };
  const tag = editable ? 'button' : 'div';
  return `<${tag} class="bm ${m.bye ? 'is-bye' : ''} ${isFinal ? 'final-match' : ''}" ${editable ? `data-score="${esc(m.id)}"` : ''} data-mid="${esc(m.id)}">${row(m.home, m.srcH, m.hg, m.hp)}${row(m.away, m.srcA, m.ag, m.ap)}</${tag}>`;
}

function bracketTab(tour, readOnly) {
  const R = tour.koRounds;
  const cols = [];
  for (let r = 1; r <= R; r++) {
    const ms = tour.matches.filter((m) => m.stage === 'ko' && m.round === r).sort((a, b) => a.slot - b.slot);
    const pairs = [];
    for (let i = 0; i < ms.length; i += 2) pairs.push(ms.slice(i, i + 2));
    cols.push(`<div class="br-col ${r === R ? 'final' : ''}"><div class="br-title">${r === R ? icon('trophy', 'ico-sm') + '&nbsp;' : ''}${esc(koRoundName(r, R))}</div><div class="br-body">
      ${pairs.map((p) => `<div class="br-pair ${p.length === 1 ? 'single' : ''}">${p.map((m) => `<div class="br-slot ${matchWinner(m) ? 'decided' : ''}">${bracketMatch(tour, m, readOnly, r === R)}</div>`).join('')}</div>`).join('')}
    </div></div>`);
  }
  const third = tour.matches.find((m) => m.stage === 'third');
  const groupsDone = tour.format !== 'groups' || stageMatches(tour, 'group').every(isPlayed);
  return `<div class="stack">
    ${groupsDone ? '' : `<div class="notice">${icon('info')}<span>${esc(t('t.groupsPending'))}</span></div>`}
    <div class="card pad-0"><div class="bracket-scroll" style="padding:14px 10px"><div class="bracket">${cols.join('')}</div></div></div>
    ${third ? `<div class="card tight third-place"><div class="round-title">${icon('medal', 'ico-sm')} ${esc(t('t.ko.third'))}</div>${bracketMatch(tour, third, readOnly, false)}</div>` : ''}
  </div>`;
}

// ---------------------------------------------------------------- king of the couch
function kothTab(tour) {
  const ks = kothState(tour);
  const dots = Array.from({ length: ks.target }, (_, i) => `<span style="width:14px;height:14px;border-radius:50%;display:inline-block;background:${i < ks.streak ? 'var(--gold)' : 'var(--surface-4)'};box-shadow:${i < ks.streak ? '0 0 10px rgba(255,207,74,.6)' : 'none'}"></span>`).join('');
  const kingCard = `<div class="card card-gold" style="text-align:center">
    <span class="eyebrow gold">${icon('crown', 'ico-sm')}${esc(t('t.king'))}</span>
    <div style="display:flex;justify-content:center;margin:16px 0 10px">${avatar(ks.king, 'xl', 'av-ring-gold')}</div>
    <div class="display" style="font-size:2rem">${pname(ks.king)}</div>
    <div class="row" style="justify-content:center;margin-top:12px;gap:6px">${dots}</div>
    <div class="dim" style="font-size:.84rem;margin-top:8px">${esc(t('t.streak'))}: ${esc(t('t.streakOf', { n: ks.streak, t: ks.target }))} · ${esc(t('t.kothInfo', { t: ks.target }))}</div>
  </div>`;
  const queue = `<div class="card"><div class="section-head"><h3 class="h3">${esc(t('t.queue'))}</h3></div>
    <div class="rank-list">${ks.queue.map((id, i) => `<div class="rank-item"><span class="n">${i + 1}</span>${avatar(id, 'sm')}<span class="pname">${pname(id)}</span>${i === 0 && ks.champion == null ? `<span class="badge badge-accent">${esc(t('t.challenger'))}</span>` : ''}</div>`).join('')}</div></div>`;
  const table = `<div class="card"><div class="table-wrap"><table class="table">
    <thead><tr><th>#</th><th class="l">${esc(t('col.player'))}</th><th>${esc(t('col.p'))}</th><th>${esc(t('col.w'))}</th><th>${esc(t('col.l'))}</th><th class="hide-sm">${esc(t('col.goals'))}</th><th>${esc(t('col.best'))}</th></tr></thead>
    <tbody>${ks.table.map((r, i) => `<tr class="pos-${i + 1}"><td class="pos"><span class="pos-badge">${i + 1}</span></td><td class="l player">${playerLink(r.id)}</td><td>${r.p}</td><td class="pts">${r.w}</td><td>${r.l}</td><td class="hide-sm">${r.gf}:${r.ga}</td><td>${r.best ? `${icon('flame', 'ico-sm')}` : ''} ${r.best}</td></tr>`).join('')}</tbody></table></div></div>`;
  return `<div class="grid-main"><div class="stack">${table}</div><div class="stack">${kingCard}${queue}</div></div>`;
}

// ---------------------------------------------------------------- stats
function statsTab(tour) {
  const ms = tour.matches.filter((m) => !m.bye && isPlayed(m));
  if (!ms.length) return `<div class="card"><p class="muted" style="margin:0">${esc(t('t.noStats'))}</p></div>`;
  const goals = ms.reduce((s, m) => s + m.hg + m.ag, 0);
  const draws = ms.filter((m) => m.hg === m.ag).length;
  const biggest = ms.reduce((b, m) => (Math.abs(m.hg - m.ag) > Math.abs(b.hg - b.ag) ? m : b), ms[0]);
  const wildest = ms.reduce((b, m) => (m.hg + m.ag > b.hg + b.ag ? m : b), ms[0]);
  const per = {};
  for (const m of ms) {
    for (const [id, gf, ga] of [[m.home, m.hg, m.ag], [m.away, m.ag, m.hg]]) {
      const r = (per[id] = per[id] || { id, p: 0, gf: 0, ga: 0 });
      r.p++; r.gf += gf; r.ga += ga;
    }
  }
  const rows = Object.values(per);
  const attack = rows.slice().sort((a, b) => b.gf / b.p - a.gf / a.p || b.gf - a.gf)[0];
  const defense = rows.slice().sort((a, b) => a.ga / a.p - b.ga / b.p || b.p - a.p)[0];
  const scoreLine = (m) => `${pname(m.home)} ${m.hg}:${m.ag} ${pname(m.away)}`;
  const record = (ic, cls, k, v, s) => `<div class="record"><span class="ricon ${cls}">${icon(ic)}</span><div class="rbody"><div class="rk">${esc(k)}</div><div class="rv">${v}</div><div class="rs">${s}</div></div></div>`;
  return `<div class="stack">
    <div class="tiles">
      <div class="tile"><span class="label">${icon('ball')}${esc(t('t.statGoals'))}</span><span class="value">${goals}</span></div>
      <div class="tile"><span class="label">${icon('chart')}${esc(t('t.statAvg'))}</span><span class="value">${fmtNum(goals / ms.length, 2)}</span></div>
      <div class="tile"><span class="label">${icon('league')}${esc(t('t.tab.matches'))}</span><span class="value">${ms.length}</span></div>
      <div class="tile"><span class="label">${icon('shield')}${esc(t('t.statDraws'))}</span><span class="value">${draws}</span></div>
    </div>
    <div class="grid-2">
      ${record('bolt', '', t('t.statBiggest'), `${biggest.hg}:${biggest.ag}`, scoreLine(biggest))}
      ${record('flame', 'red', t('t.statWild'), `${wildest.hg + wildest.ag} ⚽`, scoreLine(wildest))}
      ${record('star', 'gold', t('t.statTopAttack'), pname(attack.id), esc(t('rec.perMatch', { v: fmtNum(attack.gf / attack.p, 2) })))}
      ${record('shield', 'violet', t('t.statDefense'), pname(defense.id), esc(t('rec.perMatchAgainst', { v: fmtNum(defense.ga / defense.p, 2) })))}
    </div>
  </div>`;
}

// ---------------------------------------------------------------- score entry
export function openScoreModal(tourId, matchId) {
  const tour = tournament(tourId);
  const m = tour?.matches.find((x) => x.id === matchId);
  if (!tour || !m || !canEditMatch(tour, m)) return;
  const wasDone = tournamentState(tour).done;
  const needW = needsWinner(m);
  const s = { hg: m.hg ?? 0, ag: m.ag ?? 0, hp: m.hp ?? 0, ap: m.ap ?? 0 };
  const side = (id, key, tag) => `<div class="score-side">${avatar(id, 'lg')}<span class="pname">${pname(id)}</span><span class="tag">${esc(tag)}</span>
    <div class="stepper"><button type="button" class="plus" data-inc="${key}" aria-label="+1">+</button>
    <input class="goal-input num" type="number" inputmode="numeric" pattern="[0-9]*" min="0" max="99" data-key="${key}" value="${s[key]}" aria-label="${pname(id)}">
    <button type="button" data-dec="${key}" aria-label="-1">−</button></div></div>`;
  const pensStepper = (key) => `<div class="mini-stepper"><button type="button" data-dec="${key}" aria-label="-1">−</button><output data-out="${key}">${s[key]}</output><button type="button" data-inc="${key}" aria-label="+1">+</button></div>`;
  const body = `<div class="dim" style="text-align:center;font-size:.76rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;margin:-8px 0 16px">${esc(matchLabel(tour, m))}</div>
    <div class="score-pad">${side(m.home, 'hg', t('sc.home'))}<div class="score-colon">:</div>${side(m.away, 'ag', t('sc.away'))}</div>
    <div class="pens-box hidden" data-pens><div class="lbl">${icon('bolt', 'ico-sm')}${esc(t('sc.pens'))}</div>
      <div class="pens-row">${pensStepper('hp')}<span class="dim">:</span>${pensStepper('ap')}</div></div>
    <div class="warn hidden" data-warn>${icon('alert')}<span></span></div>
    <div class="err-text" data-err></div>
    <div class="modal-foot" style="margin-top:8px">
      ${isPlayed(m) ? `<button type="button" class="btn btn-danger" data-clear>${icon('trash')}${esc(t('sc.clear'))}</button>` : ''}
      <button type="button" class="btn btn-primary btn-lg" data-save>${icon('check')}${esc(t('sc.save'))}</button>
    </div>`;

  openModal({
    title: esc(t('sc.title')),
    body,
    onMount: (el, close) => {
      const pensBox = el.querySelector('[data-pens]');
      const warn = el.querySelector('[data-warn]');
      const errEl = el.querySelector('[data-err]');
      const result = () => {
        const pens = needW && s.hg === s.ag;
        return { hg: s.hg, ag: s.ag, hp: pens ? s.hp : null, ap: pens ? s.ap : null };
      };
      const sync = (bumpKey) => {
        el.querySelectorAll('[data-key]').forEach((inp) => { if (document.activeElement !== inp) inp.value = s[inp.dataset.key]; });
        el.querySelector('[data-out="hp"]').textContent = s.hp;
        el.querySelector('[data-out="ap"]').textContent = s.ap;
        pensBox.classList.toggle('hidden', !(needW && s.hg === s.ag));
        let n = 0;
        const r = result();
        if (!validateResult(m, r)) { try { n = previewResult(tour, m.id, r); } catch { n = 0; } }
        warn.classList.toggle('hidden', !n);
        warn.querySelector('span').textContent = t('sc.warn', { n });
        errEl.textContent = '';
        if (bumpKey) {
          const inp = el.querySelector(`[data-key="${bumpKey}"]`);
          if (inp) { inp.classList.remove('bump'); void inp.offsetWidth; inp.classList.add('bump'); }
        }
      };
      el.addEventListener('click', (e) => {
        const inc = e.target.closest('[data-inc]');
        const dec = e.target.closest('[data-dec]');
        if (inc) { const k = inc.dataset.inc; s[k] = Math.min(99, s[k] + 1); sync(k); }
        if (dec) { const k = dec.dataset.dec; s[k] = Math.max(0, s[k] - 1); sync(k); }
      });
      el.querySelectorAll('[data-key]').forEach((inp) => {
        inp.addEventListener('focus', () => inp.select());
        inp.addEventListener('input', () => {
          const v = parseInt(inp.value, 10);
          s[inp.dataset.key] = Number.isFinite(v) ? Math.max(0, Math.min(99, v)) : 0;
          sync();
        });
        inp.addEventListener('blur', () => { inp.value = s[inp.dataset.key]; });
        inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); save(); } });
      });
      const save = () => {
        const r = result();
        const err = validateResult(m, r);
        if (err) { errEl.textContent = err === 'penalties' ? t('sc.pensErr') : t('sc.goalsErr'); return; }
        let res;
        updateTournament(tour.id, (x) => { res = applyResult(x, m.id, r); return res; }, { matchId: m.id });
        close();
        feedback(res, wasDone);
      };
      el.querySelector('[data-save]').addEventListener('click', save);
      el.querySelector('[data-clear]')?.addEventListener('click', async () => {
        const n = previewResult(tour, m.id, null);
        if (n && !(await confirmDialog({ title: t('sc.clear'), text: t('sc.warn', { n }), confirmLabel: t('sc.clear'), danger: true }))) return;
        let res;
        updateTournament(tour.id, (x) => { res = clearMatch(x, m.id); return res; }, { matchId: m.id });
        close();
        toast(t('sc.removed'));
        if (res?.cleared) toast(t('t.cleared', { n: res.cleared }));
      });
      sync();
    },
  });
}

function feedback(res, wasDone) {
  toast(t('sc.saved'));
  if (!res) return;
  if (res.cleared) toast(t('t.cleared', { n: res.cleared }));
  if (res.newRound) toast(t('t.newRound', { n: res.newRound }));
  if (res.done && !wasDone) {
    document.querySelector('.trophy-wrap')?.classList.add('celebrate');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => confetti(), 300);
  }
}

// ---------------------------------------------------------------- menus & share
function openMenu(tour) {
  const st = tournamentState(tour);
  const canEnd = tour.format === 'koth' && !st.done && tour.matches.some(isPlayed);
  const canResume = tour.format === 'koth' && tour.endedManually === true;
  openModal({
    title: esc(tour.name),
    body: `<div class="menu-list">
      <button class="btn" data-m="rename">${icon('edit')}${esc(t('t.rename'))}</button>
      ${canEnd ? `<button class="btn" data-m="end">${icon('flag')}${esc(t('t.end'))}</button>` : ''}
      ${canResume ? `<button class="btn" data-m="resume">${icon('play')}${esc(t('t.resume'))}</button>` : ''}
      <button class="btn btn-danger" data-m="delete">${icon('trash')}${esc(t('t.delete'))}</button>
    </div>`,
    onMount: (el, close) => {
      el.querySelector('[data-m="rename"]').addEventListener('click', async () => {
        close();
        const name = await promptDialog({ title: t('t.rename'), value: tour.name, label: t('wiz.name'), maxLength: 48 });
        if (name) { updateTournament(tour.id, (x) => { x.name = name; }); toast(t('t.renamed')); }
      });
      el.querySelector('[data-m="end"]')?.addEventListener('click', async () => {
        close();
        if (!(await confirmDialog({ title: t('t.end'), text: t('t.endConfirm'), confirmLabel: t('t.end') }))) return;
        updateTournament(tour.id, (x) => endKoth(x));
        document.querySelector('.trophy-wrap')?.classList.add('celebrate');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setTimeout(() => confetti(), 300);
      });
      el.querySelector('[data-m="resume"]')?.addEventListener('click', () => {
        close();
        updateTournament(tour.id, (x) => resumeKoth(x));
        toast(t('t.resumed'));
      });
      el.querySelector('[data-m="delete"]').addEventListener('click', async () => {
        close();
        if (!(await confirmDialog({ title: t('t.delete'), text: t('t.deleteConfirm', { name: tour.name }), confirmLabel: t('c.delete'), danger: true }))) return;
        tabState.delete(tour.id);
        location.hash = '#/tournaments';
        deleteTournament(tour.id);
        toast(t('t.deleted'));
      });
    },
  });
}

function openShare(tour) {
  const text = textSummary(tour, (id) => player(id)?.name ?? '?');
  openModal({
    title: esc(t('sh.title')),
    wide: true,
    body: `<div class="field"><label for="sh-text">${esc(t('sh.text'))}</label>
        <textarea id="sh-text" class="share-preview" readonly rows="8">${esc(text)}</textarea>
        <div class="row-wrap"><button class="btn" data-copy-text>${icon('copy')}${esc(t('sh.copyText'))}</button>
        ${navigator.share ? `<button class="btn" data-native>${icon('share')}${esc(t('sh.send'))}</button>` : ''}</div></div>
      <div class="field" style="margin-top:20px"><label for="sh-link">${esc(t('sh.link'))}</label>
        <input id="sh-link" class="input" readonly data-link value="…">
        <span class="hint">${esc(t('sh.linkHint'))}</span>
        <div class="row-wrap"><button class="btn btn-primary" data-copy-link disabled>${icon('link')}${esc(t('sh.copyLink'))}</button></div></div>`,
    onMount: async (el) => {
      let url = '';
      el.querySelector('[data-copy-text]').addEventListener('click', () => copyText(text));
      el.querySelector('[data-native]')?.addEventListener('click', () => {
        navigator.share({ title: tour.name, text: url ? `${text}\n\n${url}` : text }).catch(() => {});
      });
      el.querySelector('[data-copy-link]').addEventListener('click', () => url && copyText(url));
      try {
        const players = tour.players.map((id) => player(id)).filter(Boolean);
        const code = await encodeSnapshot(tour, players);
        url = `${location.origin}${location.pathname}#/view/${code}`;
        el.querySelector('[data-link]').value = url;
        el.querySelector('[data-copy-link]').disabled = false;
      } catch (e) {
        console.error('[share] could not build link', e);
        el.querySelector('[data-link]').value = t('sh.invalid');
      }
    },
  });
}

// The snapshot was fully validated when the link was decoded (validate.js).
async function importSnapshot(snapshot) {
  const local = tournament(snapshot.t.id);
  if (local) {
    // Never overwrite a local copy silently: an old link could hold fewer results.
    const played = (x) => x.matches.filter((m) => !m.bye && isPlayed(m)).length;
    const mine = played(local);
    const link = played(snapshot.t);
    const replace = await confirmDialog({
      title: t('sh.conflictTitle'),
      text: t('sh.conflict', { mine, link }),
      confirmLabel: t('sh.replace'),
      cancelLabel: t('sh.keep'),
      danger: mine > link,
    });
    if (!replace) { location.hash = `#/t/${local.id}`; return; }
  }
  const copy = deepClone(snapshot.t);
  commit((d) => {
    for (const p of snapshot.p) if (!d.players.some((x) => x.id === p.id)) d.players.push({ ...p });
    d.tournaments = d.tournaments.filter((x) => x.id !== copy.id);
    d.tournaments.push(copy);
  }, { type: 'import-snapshot' });
  toast(local ? t('sh.exists') : t('sh.imported'));
  location.hash = `#/t/${copy.id}`;
}

// ---------------------------------------------------------------- events
export function mount(root, { id }, info = {}, { snapshot } = {}) {
  const tour = snapshot ? snapshot.t : tournament(id);
  if (!tour) return;
  root.addEventListener('click', (e) => {
    const sc = e.target.closest('[data-score]');
    if (sc && !snapshot) { openScoreModal(tour.id, sc.dataset.score); return; }
    const tb = e.target.closest('[data-tab]');
    if (tb) { tabState.set(tour.id, tb.dataset.tab); rerender({ keepScroll: true }); return; }
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'share') openShare(tour);
    else if (act === 'menu') openMenu(tour);
    else if (act === 'import' && snapshot) importSnapshot(snapshot);
    else if (act === 'fullscreen') {
      if (document.fullscreenElement) document.exitFullscreen?.();
      else document.documentElement.requestFullscreen?.().catch(() => {});
    }
  });
  if (info.matchId) {
    const el = root.querySelector(`[data-mid="${CSS.escape(info.matchId)}"]`);
    if (el) { el.classList.add('flash'); }
  }
}
