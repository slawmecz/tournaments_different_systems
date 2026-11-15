import { t, fmtNum } from '../core/i18n.js';
import { getDB, context } from '../core/store.js';
import { tournamentState, matchWinner } from '../core/formats.js';
import { totals, championships } from '../core/stats.js';
import { esc, icon, avatar, pname, formChips, countUp, toast } from '../ui.js';
import { FORMAT_ICON, formatName, nextMatchOf, matchLabel, dateLong } from './common.js';
import { loadDemo } from '../core/demo.js';

const heroArt = `<svg class="hero-art" viewBox="0 0 480 360" aria-hidden="true">
  <defs>
    <linearGradient id="beam-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <radialGradient id="pitch-glow" cx=".5" cy=".6" r=".6"><stop offset="0" stop-color="#2bff88" stop-opacity=".28"/><stop offset="1" stop-color="#2bff88" stop-opacity="0"/></radialGradient>
    <clipPath id="ball-clip"><circle cx="240" cy="120" r="34"/></clipPath>
  </defs>
  <path class="beam" d="M96 0 L120 0 L250 330 L30 330 Z" fill="url(#beam-g)"/>
  <path class="beam" d="M360 0 L384 0 L450 330 L230 330 Z" fill="url(#beam-g)" style="animation-delay:-3s"/>
  <ellipse cx="240" cy="250" rx="220" ry="90" fill="url(#pitch-glow)"/>
  <g class="pitch">
    <path d="M60 330 L420 330 L360 170 L120 170 Z"/>
    <path d="M93.75 240 H386.25"/>
    <ellipse cx="240" cy="240" rx="48" ry="16"/>
    <path d="M170 330 L180 300 H300 L310 330"/>
    <path d="M205 170 L202 185 H278 L275 170"/>
    <circle cx="240" cy="240" r="2.5" fill="rgba(43,255,136,.8)"/>
  </g>
  <ellipse class="ball-shadow" cx="240" cy="242" rx="30" ry="7" fill="#000" opacity=".55"/>
  <g class="ball">
    <circle cx="240" cy="120" r="34" fill="#eef3fb"/>
    <g clip-path="url(#ball-clip)" fill="#0b1220">
      <path d="M240 108 L251.4 116.3 L247 129.7 L233 129.7 L228.6 116.3 Z"/>
      <circle cx="259.4" cy="93.3" r="10"/><circle cx="271.4" cy="130.2" r="10"/><circle cx="240" cy="153" r="10"/>
      <circle cx="208.6" cy="130.2" r="10"/><circle cx="220.6" cy="93.3" r="10"/>
    </g>
    <g stroke="#0b1220" stroke-width="2" stroke-linecap="round">
      <path d="M240 108 V96 M251.4 116.3 L262.8 112.6 M247 129.7 L254.1 139.4 M233 129.7 L225.9 139.4 M228.6 116.3 L217.2 112.6"/>
    </g>
    <circle cx="240" cy="120" r="34" fill="none" stroke="rgba(255,255,255,.6)" stroke-width="1"/>
  </g>
</svg>`;

export function render() {
  const db = getDB();
  const ctx = context();
  const tot = totals(ctx, db);
  const active = db.tournaments.filter((x) => !tournamentState(x).done).sort((a, b) => b.createdAt - a.createdAt);
  const isEmpty = !db.players.length && !db.tournaments.length;
  const champs = championships(db).list;

  const hero = `<section class="hero">
    ${heroArt}
    <div class="hero-inner">
      <span class="eyebrow">${icon('ball', 'ico-sm')}${esc(t('home.eyebrow'))}</span>
      <h1 class="display">${esc(t('home.title1'))}<br><span class="grad-text">${esc(t('home.title2'))}</span></h1>
      <p class="lead">${esc(t('home.lead'))}</p>
      <div class="hero-cta">
        ${active.length
          ? `<a class="btn btn-primary btn-lg" href="#/t/${esc(active[0].id)}">${icon('play')}${esc(t('home.ctaContinue'))}</a><a class="btn btn-lg" href="#/new">${icon('plus')}${esc(t('home.ctaNew'))}</a>`
          : `<a class="btn btn-primary btn-lg" href="#/new">${icon('plus')}${esc(t('home.ctaNew'))}</a><a class="btn btn-lg" href="#/players">${icon('user-plus')}${esc(t('home.ctaPlayers'))}</a>`}
      </div>
      ${!isEmpty ? `<div class="hero-stats">
        <div class="hero-stat"><b data-count="${tot.tournaments}">${tot.tournaments}</b><span>${esc(t('nav.tournaments'))}</span></div>
        <div class="hero-stat"><b data-count="${tot.matches}">${tot.matches}</b><span>${esc(t('t.tab.matches'))}</span></div>
        <div class="hero-stat"><b data-count="${tot.goals}">${tot.goals}</b><span>${esc(t('t.statGoals'))}</span></div>
        <div class="hero-stat"><b data-count="${tot.players}">${tot.players}</b><span>${esc(t('nav.players'))}</span></div>
      </div>` : ''}
    </div>
  </section>`;

  if (isEmpty) {
    return `<div class="page">${hero}
      <section><div class="section-head"><h2 class="h3">${esc(t('home.howItWorks'))}</h2></div>
        <div class="onboard stagger">
          ${[1, 2, 3].map((n) => `<div class="ob" style="--i:${n}"><span class="k">${n}</span><div><b>${esc(t(`home.ob${n}.t`))}</b><span>${esc(t(`home.ob${n}.d`))}</span></div></div>`).join('')}
        </div></section>
      ${formatsTeaser()}
      <div class="notice">${icon('sparkles')}<span>${esc(t('home.demoHint'))}</span><button class="btn btn-sm" id="load-demo">${esc(t('home.demo'))}</button></div>
    </div>`;
  }

  const live = active[0] ? liveCard(active[0]) : '';
  const recent = ctx.matches.slice(-6).reverse();
  const top = ctx.ranking.filter((r) => r.played > 0).slice(0, 5);
  const last = champs[0];

  const lastChampCard = last
    ? `<a class="card card-gold hoverable" href="#/t/${esc(last.t.id)}">
        <span class="eyebrow gold">${icon('trophy', 'ico-sm')}${esc(t('home.lastChampion'))}</span>
        <div class="row" style="margin-top:14px;gap:16px">${avatar(last.championId, 'lg', 'av-ring-gold')}
          <div style="min-width:0"><div class="display" style="font-size:1.9rem">${pname(last.championId)}</div>
          <div class="dim" style="font-size:.84rem;margin-top:4px">${esc(last.t.name)} · ${esc(formatName(last.t.format))}</div></div></div>
      </a>`
    : `<div class="card"><span class="eyebrow gold">${icon('trophy', 'ico-sm')}${esc(t('home.lastChampion'))}</span><p class="muted" style="margin:12px 0 0">${esc(t('home.noChampion'))}</p></div>`;

  const ranking = `<div class="card"><div class="section-head"><h2 class="h3">${esc(t('home.ranking'))}</h2><a class="link" href="#/stats">${esc(t('home.seeAll'))}${icon('chev-r', 'ico-sm')}</a></div>
    ${top.length ? `<div class="rank-list">${top.map((r, i) => {
      const form = ctx.elo.history[r.id].slice(-5).map((h) => (h.gf > h.ga ? 'W' : h.gf < h.ga ? 'L' : 'D'));
      return `<a class="rank-item" href="#/player/${esc(r.id)}"><span class="n">${i + 1}</span>${avatar(r.id, 'sm')}<span class="pname">${pname(r.id)}</span><span class="hide-sm">${formChips(form, 5)}</span><span class="elo-chip num">${fmtNum(Math.round(r.elo))}</span></a>`;
    }).join('')}</div>` : `<p class="muted" style="margin:0">${esc(t('home.noResults'))}</p>`}
  </div>`;

  const results = `<div class="card"><div class="section-head"><h2 class="h3">${esc(t('home.recent'))}</h2></div>
    ${recent.length ? `<div class="result-list">${recent.map((m) => {
      const w = matchWinner(m);
      return `<a class="result-item" href="#/t/${esc(m.tid)}">
        <span class="s ${w === m.home ? 'win' : ''}">${avatar(m.home, 'xs')}<span class="pname">${pname(m.home)}</span></span>
        <span class="sc num">${m.hg}:${m.ag}</span>
        <span class="s r ${w === m.away ? 'win' : ''}">${avatar(m.away, 'xs')}<span class="pname">${pname(m.away)}</span></span></a>`;
    }).join('')}</div>` : `<p class="muted" style="margin:0">${esc(t('home.noResults'))}</p>`}
  </div>`;

  return `<div class="page">${hero}${live}
    <div class="grid-main"><div class="stack">${results}</div><div class="stack">${lastChampCard}${ranking}</div></div>
    ${formatsTeaser()}
  </div>`;
}

function liveCard(tour) {
  const st = tournamentState(tour);
  const next = nextMatchOf(tour);
  const pct = st.total ? Math.round((st.played / st.total) * 100) : 0;
  return `<section class="card card-glow live-card">
    <div class="lc-col">
      <div class="lc-top"><span class="badge badge-live">${esc(t('home.live'))}</span><span class="badge">${icon(FORMAT_ICON[tour.format])}${esc(formatName(tour.format))}</span><span class="dim" style="font-size:.82rem">${esc(dateLong(tour.createdAt))}</span></div>
      <div class="lc-name">${esc(tour.name)}</div>
      ${st.total ? `<div><div class="progress-label"><span>${esc(t('t.progress', { p: st.played, t: st.total }))}</span><span class="num">${pct}%</span></div><div class="progress"><span style="width:${pct}%"></span></div></div>` : ''}
    </div>
    <div class="lc-col">
      ${next ? `<div><div class="progress-label"><span>${esc(t('home.nextMatch'))} · ${esc(matchLabel(tour, next))}</span></div>
        <div class="mini-vs"><span class="s">${avatar(next.home, 'md')}<span class="pname">${pname(next.home)}</span></span><span class="v">VS</span><span class="s r">${avatar(next.away, 'md')}<span class="pname">${pname(next.away)}</span></span></div></div>` : ''}
      <div><a class="btn btn-primary" href="#/t/${esc(tour.id)}">${icon('play')}${esc(t('home.continue'))}</a></div>
    </div>
  </section>`;
}

function formatsTeaser() {
  const fs = ['league', 'knockout', 'swiss', 'groups', 'koth'];
  return `<section><div class="section-head"><h2 class="h3">${esc(t('home.formats'))}</h2></div>
    <div class="formats stagger">${fs.map((f, i) => `<a class="fcard" href="#/new/${f}" style="--i:${i}">
      <span class="fart">${icon(FORMAT_ICON[f])}</span>
      <span style="min-width:0"><span class="fname">${esc(formatName(f))}</span><span class="fdesc" style="display:block">${esc(t('fmt.' + f + '.d'))}</span></span></a>`).join('')}</div></section>`;
}

export function mount(root) {
  countUp(root);
  root.querySelector('#load-demo')?.addEventListener('click', () => {
    loadDemo();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast(t('set.demoLoaded'));
  });
}
