// View helpers shared across pages.
import { t, fmtDate, fmtRelative } from '../core/i18n.js';
import { isPlayed, matchWinner, tournamentState, upcomingMatches, canEditMatch } from '../core/formats.js';
import { esc, icon, avatar, pname } from '../ui.js';

let rerenderImpl = () => {};
export const setRerender = (fn) => { rerenderImpl = fn; };
export const rerender = (info) => rerenderImpl(info);

export const FORMAT_ICON = { league: 'league', knockout: 'knockout', swiss: 'swiss', groups: 'groups', koth: 'crown' };
export const formatName = (f) => t('fmt.' + f);
export const groupLetter = (g) => 'ABCDEFGH'[g] || String(g + 1);

export function koRoundName(round, total) {
  const left = total - round;
  if (left === 0) return t('t.ko.final');
  if (left === 1) return t('t.ko.semi');
  if (left === 2) return t('t.ko.quarter');
  if (left === 3) return t('t.ko.r16');
  if (left === 4) return t('t.ko.r32');
  return t('t.ko.rN', { n: round });
}

export function matchLabel(tour, m) {
  switch (m.stage) {
    case 'league': return t('t.matchday', { n: m.round });
    case 'group': return `${t('t.group', { g: groupLetter(m.group) })} · ${t('t.matchday', { n: m.round })}`;
    case 'swiss': return t('t.round', { n: m.round });
    case 'ko': return koRoundName(m.round, tour.koRounds);
    case 'third': return t('t.ko.third');
    case 'koth': return t('t.match', { n: m.round });
    default: return '';
  }
}

export function statusBadge(tour) {
  const st = tournamentState(tour);
  return st.done
    ? `<span class="badge badge-done">${icon('trophy')}${esc(t('t.finished'))}</span>`
    : `<span class="badge badge-live">${esc(t('t.live'))}</span>`;
}

export function pensText(m) {
  return m.hp != null && m.ap != null ? t('t.pens', { h: m.hp, a: m.ap }) : '';
}

// One clickable match row (used in lists and rounds).
export function matchRow(tour, m, { showMeta = false, readOnly = false } = {}) {
  const played = isPlayed(m);
  const w = played ? matchWinner(m) : null;
  const editable = !readOnly && canEditMatch(tour, m);
  const tag = editable ? 'button' : 'div';
  const side = (id, cls) => `<span class="side ${cls} ${w && w === id ? 'win' : ''}">${avatar(id, 'sm')}<span class="pname">${pname(id)}</span></span>`;
  const score = played
    ? `<span class="scorebox num">${m.hg}<span class="sep">:</span>${m.ag}</span>`
    : `<span class="scorebox empty">${esc(t('c.vs'))}</span>`;
  const pens = pensText(m);
  return `<${tag} class="match ${played ? 'played' : ''} ${!editable && !readOnly ? 'locked' : ''}" ${editable ? `data-score="${esc(m.id)}"` : ''} data-mid="${esc(m.id)}" ${editable ? '' : ''}>
    ${side(m.home, 'home')}
    <span class="score">${score}${pens ? `<span class="pens">${esc(pens)}</span>` : ''}</span>
    ${side(m.away, 'away')}
    ${showMeta ? `<span class="meta">${esc(matchLabel(tour, m))}</span>` : ''}
  </${tag}>`;
}

export function byeRow(m) {
  return `<div class="match locked" style="opacity:.6"><span class="side">${avatar(m.home, 'sm')}<span class="pname">${pname(m.home)}</span></span>
    <span class="score"><span class="scorebox empty" style="font-size:.7rem">${esc(t('t.rest'))}</span></span><span class="side away"><span class="pname dim">${esc(t('t.restShort'))}</span></span></div>`;
}

export function avatarStack(ids, max = 5) {
  const shown = ids.slice(0, max).map((id) => avatar(id, 'sm')).join('');
  const more = ids.length > max ? `<span class="av-more">+${ids.length - max}</span>` : '';
  return `<span class="av-stack">${shown}${more}</span>`;
}

export function tournamentCard(tour, i = 0) {
  const st = tournamentState(tour);
  const pct = st.total ? Math.round((st.played / st.total) * 100) : 0;
  const meta = `<span>${icon(FORMAT_ICON[tour.format], 'ico-sm')}</span><span>${esc(formatName(tour.format))}</span><span>·</span><span>${esc(fmtRelative(tour.finishedAt || tour.createdAt))}</span>`;
  const bottom = st.done
    ? `<span class="winner">${icon('trophy')}${avatar(st.championId, 'xs')}<span>${pname(st.championId)}</span></span>`
    : st.total
      ? `<span class="dim" style="font-size:.8rem;font-weight:600">${esc(t('t.progress', { p: st.played, t: st.total }))}</span>`
      : `<span class="dim" style="font-size:.8rem;font-weight:600">${st.played} ${esc(t('t.tab.matches').toLowerCase())}</span>`;
  return `<a class="card tcard" href="#/t/${esc(tour.id)}" style="--i:${i}">
    <div class="top"><span class="ficon ${st.done ? 'done' : ''}">${icon(FORMAT_ICON[tour.format])}</span>
      <div style="min-width:0;flex:1"><div class="tname">${esc(tour.name)}</div><div class="tmeta">${meta}</div></div>
      ${st.done ? '' : statusBadge(tour)}</div>
    ${!st.done && st.total ? `<div class="progress"><span style="width:${pct}%"></span></div>` : ''}
    <div class="bottom">${avatarStack(tour.players)}${bottom}</div>
  </a>`;
}

export function nextMatchOf(tour) {
  return upcomingMatches(tour)[0] || null;
}

export function emptyState({ iconName = 'ball', title, text, actions = '' }) {
  return `<div class="card empty"><div class="art">${icon(iconName)}</div><h3>${esc(title)}</h3><p>${esc(text)}</p>${actions ? `<div class="row-wrap" style="justify-content:center">${actions}</div>` : ''}</div>`;
}

export const dateLong = (ts) => fmtDate(ts, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
