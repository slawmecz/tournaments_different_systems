import { t, tc, fmtDuration, defaultTournamentName } from '../core/i18n.js';
import { getDB, addPlayer, addTournament, context, player } from '../core/store.js';
import {
  FORMAT_IDS, MIN_PLAYERS, estimateMatches, validGroupOptions, swissDefaultRounds, swissMaxRounds,
  createTournament, tournamentState,
} from '../core/formats.js';
import { esc, icon, avatar, toast, COLORS } from '../ui.js';
import { FORMAT_ICON, formatName, tournamentCard, emptyState, rerender } from './common.js';

const MIN_PER_MATCH = 12;

// ---------------------------------------------------------------- list
export function renderList() {
  const db = getDB();
  const all = db.tournaments.slice().sort((a, b) => (b.finishedAt || b.createdAt) - (a.finishedAt || a.createdAt));
  const active = all.filter((x) => !tournamentState(x).done);
  const done = all.filter((x) => tournamentState(x).done);
  const head = `<div class="page-head"><div class="titles"><span class="eyebrow">${icon('trophy', 'ico-sm')}${esc(t('t.list'))}</span>
    <h1 class="display h1">${esc(t('t.list'))}</h1><p class="lead">${esc(t('t.listLead'))}</p></div>
    <div class="actions"><a class="btn btn-primary btn-lg" href="#/new">${icon('plus')}${esc(t('nav.new'))}</a></div></div>`;
  if (!all.length) {
    return `<div class="page">${head}${emptyState({ iconName: 'trophy', title: t('t.empty'), text: t('t.emptyD'), actions: `<a class="btn btn-primary" href="#/new">${icon('plus')}${esc(t('nav.new'))}</a>` })}</div>`;
  }
  const section = (title, list, badge) => (list.length ? `<section><div class="section-head"><h2 class="h3">${esc(title)}</h2>${badge}</div>
    <div class="grid-3 stagger">${list.map((x, i) => tournamentCard(x, i)).join('')}</div></section>` : '');
  return `<div class="page">${head}
    ${section(t('t.active'), active, `<span class="badge badge-live">${active.length}</span>`)}
    ${section(t('t.done'), done, `<span class="badge badge-done">${done.length}</span>`)}
  </div>`;
}

// ---------------------------------------------------------------- wizard
let draft = null;

function newDraft(format) {
  const db = getDB();
  const last = db.tournaments.slice().sort((a, b) => b.createdAt - a.createdAt)[0];
  const preselect = last ? last.players.filter((id) => db.players.some((p) => p.id === id)) : db.players.map((p) => p.id);
  return {
    format: FORMAT_IDS.includes(format) ? format : 'league',
    players: new Set(preselect),
    name: '',
    opts: { legs: 1, seeding: 'random', thirdPlace: true, rounds: null, groups: null, advance: null, target: 3 },
    focusQuickAdd: false,
  };
}

function groupChoice(n) {
  const valid = validGroupOptions(n);
  if (!valid.length) return { valid, groups: null, advance: null };
  const groupsAvail = [...new Set(valid.map((o) => o.groups))];
  const groups = groupsAvail.includes(draft.opts.groups) ? draft.opts.groups : groupsAvail[0];
  const advAvail = valid.filter((o) => o.groups === groups).map((o) => o.advance);
  const prefer = advAvail.includes(2) ? 2 : advAvail[advAvail.length - 1];
  const advance = advAvail.includes(draft.opts.advance) ? draft.opts.advance : prefer;
  return { valid, groupsAvail, advAvail, groups, advance };
}

function effectiveOpts(n) {
  const o = { ...draft.opts };
  if (draft.format === 'swiss') {
    const max = Math.max(1, swissMaxRounds(n));
    o.rounds = Math.min(max, Math.max(1, o.rounds || swissDefaultRounds(n)));
  }
  if (draft.format === 'groups') {
    const gc = groupChoice(n);
    o.groups = gc.groups;
    o.advance = gc.advance;
  }
  return o;
}

function problem(n) {
  const min = MIN_PLAYERS[draft.format];
  if (!getDB().players.length) return t('wiz.noPlayers');
  if (n < min) return t('wiz.need', { n: min });
  if (draft.format === 'groups' && !validGroupOptions(n).length) return t('wiz.groupsNone');
  return null;
}

const seg = (name, options, current) => `<div class="seg" role="radiogroup">${options.map(([v, label]) => `<button type="button" role="radio" aria-checked="${v === current}" class="${v === current ? 'on' : ''}" data-opt="${name}" data-val="${v}">${esc(label)}</button>`).join('')}</div>`;
const sw = (name, checked, label) => `<label class="switch"><input type="checkbox" data-opt-check="${name}" ${checked ? 'checked' : ''}><span class="track"></span><span class="slabel">${esc(label)}</span></label>`;
const stepper = (name, value, min, max) => `<div class="mini-stepper"><button type="button" data-step="${name}" data-d="-1" data-min="${min}" data-max="${max}" aria-label="-1">−</button><output>${value}</output><button type="button" data-step="${name}" data-d="1" data-min="${min}" data-max="${max}" aria-label="+1">+</button></div>`;

function optionsHTML(n) {
  const o = effectiveOpts(n);
  const seeding = `<div class="field"><span class="flabel">${esc(t('wiz.seeding'))}</span>${seg('seeding', [['random', t('wiz.seedRandom')], ['ranking', t('wiz.seedRanking')]], o.seeding)}</div>`;
  const legs = `<div class="field"><span class="flabel">${esc(t('wiz.legs'))}</span>${seg('legs', [[1, t('wiz.legs1')], [2, t('wiz.legs2')]], o.legs)}</div>`;
  switch (draft.format) {
    case 'league': return legs;
    case 'knockout': return `${seeding}${n >= 4 ? `<div class="field"><span class="flabel">&nbsp;</span>${sw('thirdPlace', o.thirdPlace, t('wiz.thirdPlace'))}</div>` : ''}`;
    case 'swiss': {
      const max = Math.max(1, swissMaxRounds(n));
      return `<div class="field"><span class="flabel">${esc(t('wiz.rounds'))}</span>${stepper('rounds', o.rounds, 1, max)}<span class="hint">${esc(t('wiz.roundsHint', { n: swissDefaultRounds(n), m: max }))}</span></div>${seeding}`;
    }
    case 'groups': {
      const gc = groupChoice(n);
      if (!gc.valid.length) return `<p class="muted" style="margin:0">${esc(t('wiz.groupsNone'))}</p>`;
      const q = gc.groups * gc.advance;
      return `<div class="field"><span class="flabel">${esc(t('wiz.groups'))}</span>${seg('groups', gc.groupsAvail.map((g) => [g, tc('n.group', g)]), gc.groups)}</div>
        <div class="field"><span class="flabel">${esc(t('wiz.advance'))}</span>${seg('advance', gc.advAvail.map((k) => [k, t('wiz.advanceOpt', { k })]), gc.advance)}</div>
        ${legs}${seeding}
        ${q >= 4 ? `<div class="field">${sw('thirdPlace', o.thirdPlace, t('wiz.thirdPlace'))}</div>` : ''}`;
    }
    case 'koth': return `<div class="field"><span class="flabel">${esc(t('wiz.target'))}</span>${stepper('target', o.target, 2, 6)}<span class="hint">${esc(t('t.kothInfo', { t: o.target }))}</span></div>`;
    default: return `<p class="muted">${esc(t('wiz.noOptions'))}</p>`;
  }
}

export function renderWizard({ format } = {}) {
  if (!draft || (format && draft.routeFormat !== format)) {
    draft = newDraft(format);
    draft.routeFormat = format;
  }
  const db = getDB();
  // Drop selections of players that no longer exist.
  for (const id of [...draft.players]) if (!db.players.some((p) => p.id === id)) draft.players.delete(id);
  const n = draft.players.size;
  const ratings = context().elo.rating;
  const players = db.players.slice().sort((a, b) => (ratings[b.id] ?? 1000) - (ratings[a.id] ?? 1000) || a.name.localeCompare(b.name));

  const fcards = FORMAT_IDS.map((f, i) => {
    const est = estimateMatches(f, n, f === draft.format ? effectiveOpts(n) : f === 'groups' ? { ...(validGroupOptions(n)[0] || {}), legs: 1 } : {});
    const tooFew = n < MIN_PLAYERS[f] || (f === 'groups' && !validGroupOptions(n).length);
    const meta = tooFew ? t('fmt.min', { n: MIN_PLAYERS[f] }) : est == null ? t('wiz.openEnded') : tc('n.match', est);
    return `<button type="button" class="fcard ${f === draft.format ? 'on' : ''} ${tooFew ? 'off' : ''}" data-format="${f}" style="--i:${i}" aria-pressed="${f === draft.format}">
      <span class="fart">${icon(FORMAT_ICON[f])}</span>
      <span style="min-width:0"><span class="fname">${esc(formatName(f))}</span><span class="fdesc" style="display:block">${esc(t('fmt.' + f + '.d'))}</span><span class="fmeta" style="display:block">${esc(meta)}</span></span>
      <span class="check">${icon('check')}</span></button>`;
  }).join('');

  const picks = players.map((p, i) => `<button type="button" class="pick ${draft.players.has(p.id) ? 'on' : ''}" data-pick="${esc(p.id)}" style="--i:${i}" aria-pressed="${draft.players.has(p.id)}">${avatar(p, 'sm')}<span class="pname">${esc(p.name)}</span><span class="tick">${icon('check')}</span></button>`).join('');

  const issue = problem(n);
  const opts = effectiveOpts(n);
  const est = issue ? 0 : estimateMatches(draft.format, n, opts);
  const summary = issue
    ? esc(issue)
    : `${esc(tc('n.player', n))} · ${est == null ? esc(t('wiz.openEnded')) : `${esc(tc('n.match', est))} · ${esc(t('wiz.time', { t: fmtDuration(est * MIN_PER_MATCH) }))}`}`;

  return `<div class="page">
    <div class="page-head"><div class="titles"><span class="eyebrow">${icon('sparkles', 'ico-sm')}${esc(t('wiz.lead'))}</span><h1 class="display h1">${esc(t('wiz.title'))}</h1></div></div>
    <section class="card"><div class="step-title"><span class="n">1</span><h2 class="h3">${esc(t('wiz.step1'))}</h2></div><div class="formats stagger">${fcards}</div></section>
    <section class="card"><div class="step-title"><span class="n">2</span><h2 class="h3">${esc(t('wiz.step2'))}</h2>
        <span class="badge ${n ? 'badge-accent' : ''}">${esc(t('wiz.selected', { n }))}</span></div>
      ${players.length ? `<div class="row-wrap" style="margin-bottom:12px"><button type="button" class="btn btn-sm" data-all>${icon('users')}${esc(t('wiz.selectAll'))}</button><button type="button" class="btn btn-sm btn-ghost" data-none>${esc(t('wiz.clear'))}</button></div>
      <div class="pick-grid stagger">${picks}</div>` : `<p class="muted" style="margin:0 0 4px">${esc(t('wiz.noPlayers'))}</p>`}
      <form class="quick-add" data-quick><input class="input" name="name" maxlength="24" placeholder="${esc(t('wiz.quickAdd'))}" autocomplete="off" aria-label="${esc(t('wiz.quickAdd'))}"><button class="btn" type="submit">${icon('user-plus')}${esc(t('wiz.add'))}</button></form>
    </section>
    <section class="card"><div class="step-title"><span class="n">3</span><h2 class="h3">${esc(t('wiz.step3'))}</h2></div>
      <div class="opts">
        <div class="field" style="grid-column:1/-1"><label for="t-name">${esc(t('wiz.name'))}</label><input id="t-name" class="input" maxlength="48" value="${esc(draft.name)}" placeholder="${esc(defaultTournamentName())}" autocomplete="off"></div>
        ${n >= MIN_PLAYERS[draft.format] ? optionsHTML(n) : ''}
      </div>
    </section>
    <div class="summary-bar"><span class="fart" style="width:40px;height:40px;border-radius:12px;display:grid;place-items:center;background:var(--grad-brand);color:var(--accent-ink);flex:none">${icon(FORMAT_ICON[draft.format])}</span>
      <div class="sum"><b>${esc(formatName(draft.format))}</b><span>${summary}</span></div>
      <button type="button" class="btn btn-primary btn-lg" data-create ${issue ? 'disabled' : ''}>${icon('play')}${esc(t('wiz.create'))}</button></div>
  </div>`;
}

export function mountWizard(root) {
  const nameInput = root.querySelector('#t-name');
  nameInput?.addEventListener('input', () => { draft.name = nameInput.value; });
  if (draft.focusQuickAdd) {
    draft.focusQuickAdd = false;
    root.querySelector('[data-quick] input')?.focus({ preventScroll: true });
  }
  root.querySelector('[data-quick]')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = e.currentTarget.querySelector('input');
    const name = input.value.trim();
    if (!name) return;
    const p = addPlayer({ name, color: Math.floor(Math.random() * COLORS.length) });
    draft.players.add(p.id);
    draft.focusQuickAdd = true;
    toast(t('pl.added', { name: p.name }));
    rerender({ keepScroll: true });
  });
  root.addEventListener('click', (e) => {
    const f = e.target.closest('[data-format]');
    if (f) { draft.format = f.dataset.format; rerender({ keepScroll: true }); return; }
    const pk = e.target.closest('[data-pick]');
    if (pk) {
      const id = pk.dataset.pick;
      if (draft.players.has(id)) draft.players.delete(id); else draft.players.add(id);
      rerender({ keepScroll: true });
      return;
    }
    if (e.target.closest('[data-all]')) { getDB().players.forEach((p) => draft.players.add(p.id)); rerender({ keepScroll: true }); return; }
    if (e.target.closest('[data-none]')) { draft.players.clear(); rerender({ keepScroll: true }); return; }
    const opt = e.target.closest('[data-opt]');
    if (opt) {
      const v = opt.dataset.val;
      draft.opts[opt.dataset.opt] = /^\d+$/.test(v) ? Number(v) : v;
      rerender({ keepScroll: true });
      return;
    }
    const st = e.target.closest('[data-step]');
    if (st) {
      const key = st.dataset.step;
      const n = draft.players.size;
      const cur = effectiveOpts(n)[key];
      draft.opts[key] = Math.min(Number(st.dataset.max), Math.max(Number(st.dataset.min), cur + Number(st.dataset.d)));
      rerender({ keepScroll: true });
      return;
    }
    if (e.target.closest('[data-create]')) create();
  });
  root.querySelectorAll('[data-opt-check]').forEach((cb) => cb.addEventListener('change', () => {
    draft.opts[cb.dataset.optCheck] = cb.checked;
  }));
}

function create() {
  const n = draft.players.size;
  if (problem(n)) return;
  const opts = effectiveOpts(n);
  const ids = [...draft.players].filter((id) => player(id));
  const tour = createTournament({
    name: (draft.name || '').trim() || defaultTournamentName(),
    format: draft.format,
    playerIds: ids,
    opts,
    ratings: context().elo.rating,
  });
  addTournament(tour);
  draft = null;
  location.hash = `#/t/${tour.id}`;
}

export function resetWizard() { draft = null; }
