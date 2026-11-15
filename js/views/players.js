import { t, tc, fmtNum, fmtDate } from '../core/i18n.js';
import { getDB, context, player, addPlayer, updatePlayer, deletePlayer, playerHasHistory } from '../core/store.js';
import { playerStats, ELO_START } from '../core/stats.js';
import { esc, icon, avatar, pname, formChips, wdlBar, toast, openModal, confirmDialog, COLORS, EMOJIS, colorVars, initials } from '../ui.js';
import { emptyState } from './common.js';

// ---------------------------------------------------------------- list
export function renderList() {
  const db = getDB();
  const ctx = context();
  const stats = db.players.map((p) => playerStats(db, p.id, ctx));
  stats.sort((a, b) => (b.p > 0) - (a.p > 0) || b.elo - a.elo || player(a.id).name.localeCompare(player(b.id).name));
  const head = `<div class="page-head"><div class="titles"><span class="eyebrow">${icon('users', 'ico-sm')}${esc(tc('n.player', db.players.length))}</span>
    <h1 class="display h1">${esc(t('pl.title'))}</h1><p class="lead">${esc(t('pl.lead'))}</p></div>
    <div class="actions"><button class="btn btn-primary btn-lg" data-add-player>${icon('user-plus')}${esc(t('pl.add'))}</button></div></div>`;
  if (!db.players.length) {
    return `<div class="page">${head}${emptyState({ iconName: 'users', title: t('pl.empty'), text: t('pl.emptyD'), actions: `<button class="btn btn-primary" data-add-player>${icon('user-plus')}${esc(t('pl.add'))}</button>` })}</div>`;
  }
  const cards = stats.map((s, i) => {
    const p = player(s.id);
    return `<a class="pcard" href="#/player/${esc(p.id)}" style="${colorVars(p)};--i:${i}">
      ${s.p ? `<span class="rank">#${s.rank}</span>` : ''}
      ${s.titles ? `<span class="titles">${icon('trophy')}${s.titles}</span>` : ''}
      ${avatar(p, 'lg')}
      <span class="pname">${esc(p.name)}</span>
      <span class="club">${esc(p.club || '')}</span>
      <span class="pstats"><span><b class="num">${fmtNum(Math.round(s.elo))}</b>Elo</span><span><b>${s.p}</b>${esc(t('pl.matches'))}</span><span><b>${s.winPct}%</b>${esc(t('col.win'))}</span></span>
      ${wdlBar(s.w, s.d, s.l)}
    </a>`;
  }).join('');
  return `<div class="page">${head}<div class="players-grid stagger">${cards}
    <button class="pcard add" data-add-player style="--i:${stats.length}"><span class="plus">${icon('plus', 'ico-lg')}</span><span style="font-weight:600">${esc(t('pl.add'))}</span></button></div></div>`;
}

export function mountList(root) {
  root.querySelectorAll('[data-add-player]').forEach((b) => b.addEventListener('click', () => openPlayerEditor()));
}

// ---------------------------------------------------------------- profile
export function renderProfile({ id }) {
  const db = getDB();
  const p = player(id);
  if (!p || !db.players.some((x) => x.id === id)) {
    return `<div class="page"><div class="card not-found"><h1 class="display h2">${esc(t('pl.notFound'))}</h1><p><a class="btn" href="#/players">${icon('arrow-l')}${esc(t('nav.players'))}</a></p></div></div>`;
  }
  const ctx = context();
  const s = playerStats(db, id, ctx);
  const back = `<a class="btn btn-ghost btn-sm" href="#/players" style="align-self:flex-start;margin-left:-12px">${icon('arrow-l')}${esc(t('nav.players'))}</a>`;
  const hero = `<section class="profile-hero" style="${colorVars(p)}">
    ${avatar(p, 'xxl', 'av-ring')}
    <div class="info">
      <span class="eyebrow">${s.p ? esc(t('pl.rank', { n: s.rank })) : icon('sparkles', 'ico-sm')}</span>
      <h1 class="display pname">${esc(p.name)}</h1>
      ${p.club ? `<span class="muted">${icon('shield', 'ico-sm')} ${esc(p.club)}</span>` : ''}
      <div class="meta">
        ${s.titles ? `<span class="badge badge-done">${icon('trophy')}${esc(tc('n.title', s.titles))}</span>` : ''}
        <span class="badge">${icon('calendar')}${esc(tc('n.tournament', s.tournaments))}</span>
        <button class="btn btn-sm" data-edit-player>${icon('edit')}${esc(t('c.edit'))}</button>
      </div>
    </div>
    <div class="elo-big"><b class="num">${fmtNum(Math.round(s.elo))}</b><span>Elo</span></div>
  </section>`;

  if (!s.p) {
    return `<div class="page">${back}${hero}${emptyState({ iconName: 'ball', title: t('pl.noMatches'), text: '', actions: `<a class="btn btn-primary" href="#/new">${icon('plus')}${esc(t('nav.new'))}</a>` })}</div>`;
  }

  const streakText = s.curStreak.type ? t('pl.streak' + s.curStreak.type, { n: s.curStreak.n }) : '–';
  const tiles = `<div class="tiles">
    <div class="tile"><span class="label">${icon('ball')}${esc(t('pl.matches'))}</span><span class="value">${s.p}</span><span class="sub">${s.w}–${s.d}–${s.l}</span></div>
    <div class="tile"><span class="label">${icon('star')}${esc(t('pl.winRate'))}</span><span class="value">${s.winPct}%</span><span class="sub">${esc(tc('n.win', s.w))}</span></div>
    <div class="tile"><span class="label">${icon('flame')}${esc(t('pl.gpm'))}</span><span class="value">${fmtNum(s.gpm, 2)}</span><span class="sub">${esc(t('pl.goals'))}: ${s.gf}:${s.ga}</span></div>
    <div class="tile"><span class="label">${icon('trophy')}${esc(t('pl.titles'))}</span><span class="value">${s.titles}</span><span class="sub">${esc(tc('n.tournament', s.tournaments))}</span></div>
  </div>`;

  const wdl = `<div class="card"><div class="section-head"><h2 class="h3">${esc(t('pl.form'))}</h2></div>
    ${formChips(s.form, 10)}
    <div style="margin-top:18px">${wdlBar(s.w, s.d, s.l)}
    <div class="wdl-legend"><span><i style="background:var(--win)"></i>${esc(t('pl.wins'))} ${s.w}</span><span><i style="background:var(--draw)"></i>${esc(t('pl.draws'))} ${s.d}</span><span><i style="background:var(--loss)"></i>${esc(t('pl.losses'))} ${s.l}</span></div></div>
    <div style="margin-top:22px"><div class="progress-label"><span>${esc(t('pl.scored'))} <b style="color:var(--text)">${s.gf}</b></span><span>${esc(t('pl.conceded'))} <b style="color:var(--text)">${s.ga}</b></span></div>
    ${s.gf + s.ga ? `<div class="vs-split" style="margin-top:0"><span style="width:${(s.gf / (s.gf + s.ga)) * 100}%;background:var(--accent)"></span><span style="width:${(s.ga / (s.gf + s.ga)) * 100}%;background:var(--loss)"></span></div>` : ''}</div>
  </div>`;

  const bw = s.biggestWin;
  const facts = `<div class="card"><div class="kv"><span>${esc(t('pl.streak'))}</span><b>${esc(streakText)}</b></div>
    <div class="kv"><span>${esc(t('pl.longestWin'))}</span><b>${s.longestWin}</b></div>
    <div class="kv"><span>${esc(t('pl.unbeaten'))}</span><b>${s.longestUnbeaten}</b></div>
    <div class="kv"><span>${esc(t('pl.cleanSheets'))}</span><b>${s.cleanSheets}</b></div>
    <div class="kv"><span>${esc(t('pl.peak'))}</span><b class="num">${fmtNum(Math.round(s.peakElo))}</b></div>
    ${bw ? `<div class="kv"><span>${esc(t('pl.biggestWin'))}</span><b>${bw.gf}:${bw.ga} ${esc(t('c.vs'))} ${pname(bw.opp)}</b></div>` : ''}
  </div>`;

  const chart = `<div class="card"><div class="section-head"><h2 class="h3">${esc(t('pl.elo'))}</h2><span class="dim" style="margin-left:auto;font-size:.8rem">${esc(t('pl.eloSub'))}</span></div>
    <div class="chart" data-elo-chart></div></div>`;

  const rival = (kind, r, ic, cls) => (r
    ? `<a class="rival" href="#/h2h/${esc(id)}/${esc(r.id)}"><span class="record" style="padding:0;border:0;background:none"><span class="ricon ${cls}">${icon(ic)}</span></span>${avatar(r.id, 'md')}<div style="min-width:0"><div class="k">${esc(t(kind))}</div><div class="v">${pname(r.id)}</div></div><div class="r">${esc(t('pl.vsRecord', { w: r.v.w, d: r.v.d, p: r.v.l }))}</div></a>`
    : '');
  const rivals = s.nemesis || s.victim ? `<section><div class="section-head"><h2 class="h3">${esc(t('pl.rivals'))}</h2></div><div class="grid-2">${rival('pl.nemesis', s.nemesis, 'alert', 'red')}${rival('pl.victim', s.victim, 'bolt', '')}</div></section>` : '';

  const vsRows = Object.entries(s.vs).sort((a, b) => b[1].p - a[1].p);
  const h2h = `<div class="card"><div class="section-head"><h2 class="h3">${esc(t('pl.h2h'))}</h2></div><div class="table-wrap"><table class="table">
    <thead><tr><th class="l">${esc(t('col.player'))}</th><th>${esc(t('col.p'))}</th><th>${esc(t('col.w'))}</th><th>${esc(t('col.d'))}</th><th>${esc(t('col.l'))}</th><th class="hide-sm">${esc(t('col.goals'))}</th><th></th></tr></thead>
    <tbody>${vsRows.map(([opp, v]) => `<tr><td class="l player"><a class="player-link" href="#/h2h/${esc(id)}/${esc(opp)}">${avatar(opp, 'sm')}<span class="pname">${pname(opp)}</span></a></td><td>${v.p}</td><td>${v.w}</td><td>${v.d}</td><td>${v.l}</td><td class="hide-sm">${v.gf}:${v.ga}</td><td style="width:120px" class="hide-sm">${wdlBar(v.w, v.d, v.l)}</td></tr>`).join('')}</tbody></table></div></div>`;

  const recent = s.matches.slice(-8).reverse();
  const recentList = `<div class="card"><div class="section-head"><h2 class="h3">${esc(t('pl.recent'))}</h2></div><div class="result-list">
    ${recent.map((r) => `<a class="result-item" href="#/t/${esc(r.m.tid)}" style="grid-template-columns:auto minmax(0,1fr) auto">
      <span class="form"><i class="${r.o}">${esc(t('form.' + r.o))}</i></span>
      <span class="s" style="min-width:0">${esc(t('c.vs'))}&nbsp;${avatar(r.opp, 'xs')}<span class="pname">${pname(r.opp)}</span><span class="dim hide-sm" style="font-size:.78rem;white-space:nowrap">· ${esc(r.m.tname)}</span></span>
      <span class="sc num">${r.gf}:${r.ga}</span></a>`).join('')}
  </div></div>`;

  return `<div class="page">${back}${hero}${tiles}<div class="grid-2">${wdl}${facts}</div>${chart}${rivals}<div class="grid-2">${h2h}${recentList}</div></div>`;
}

export function mountProfile(root, { id }) {
  root.querySelector('[data-edit-player]')?.addEventListener('click', () => openPlayerEditor(id));
  const el = root.querySelector('[data-elo-chart]');
  if (el) {
    const s = playerStats(getDB(), id, context());
    drawEloChart(el, s.eloHistory);
    const ro = new ResizeObserver(() => {
      if (!el.isConnected) { ro.disconnect(); return; }
      drawEloChart(el, s.eloHistory);
    });
    ro.observe(el);
  }
}

// ---------------------------------------------------------------- Elo chart (inline SVG + crosshair tooltip)
function niceStep(raw) {
  const pow = 10 ** Math.floor(Math.log10(raw));
  const n = raw / pow;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * pow;
}

function drawEloChart(el, history) {
  const pts = [{ elo: ELO_START, start: true }, ...history];
  if (pts.length < 2) { el.innerHTML = `<div class="chart-empty">${esc(t('pl.noMatches'))}</div>`; return; }
  const W = Math.max(260, el.clientWidth);
  const H = el.clientHeight || 220;
  const pad = { l: 44, r: 56, t: 14, b: 26 };
  const vals = pts.map((p) => p.elo);
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  const step = niceStep(Math.max(20, hi - lo) / 4);
  const y0 = Math.floor(lo / step) * step;
  const y1 = Math.max(y0 + step, Math.ceil(hi / step) * step);
  const x = (i) => pad.l + (i / (pts.length - 1)) * (W - pad.l - pad.r);
  const y = (v) => pad.t + (1 - (v - y0) / (y1 - y0)) * (H - pad.t - pad.b);
  const ticks = [];
  for (let v = y0; v <= y1 + 1e-9; v += step) ticks.push(v);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.elo).toFixed(1)}`).join('');
  const area = `${line}L${x(pts.length - 1).toFixed(1)},${y(y0).toFixed(1)}L${x(0).toFixed(1)},${y(y0).toFixed(1)}Z`;
  const last = pts[pts.length - 1];
  const xTicks = [...new Set([0, Math.round((pts.length - 1) / 2), pts.length - 1])];
  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(t('pl.elo'))}">
    ${ticks.map((v) => `<line class="grid-line" x1="${pad.l}" x2="${W - pad.r}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}"/><text class="axis-text" x="${pad.l - 8}" y="${(y(v) + 4).toFixed(1)}" text-anchor="end">${Math.round(v)}</text>`).join('')}
    ${xTicks.map((i) => `<text class="axis-text" x="${x(i).toFixed(1)}" y="${H - 6}" text-anchor="middle">${i}</text>`).join('')}
    <path class="area" d="${area}"/>
    <path class="line" d="${line}"/>
    <circle class="end-dot" cx="${x(pts.length - 1).toFixed(1)}" cy="${y(last.elo).toFixed(1)}" r="5"/>
    <text class="end-label" x="${(x(pts.length - 1) + 10).toFixed(1)}" y="${(y(last.elo) + 4).toFixed(1)}">${Math.round(last.elo)}</text>
    <line class="xhair" data-xhair x1="0" x2="0" y1="${pad.t}" y2="${H - pad.b}" visibility="hidden"/>
    <circle class="hover-dot" data-hdot r="5" visibility="hidden"/>
    <rect data-hit x="${pad.l}" y="0" width="${W - pad.l - pad.r}" height="${H}" fill="transparent" tabindex="0"/>
  </svg><div class="chart-tip" data-tip><b></b><span></span></div>`;
  const svg = el.querySelector('svg');
  const hit = el.querySelector('[data-hit]');
  const xh = el.querySelector('[data-xhair]');
  const hd = el.querySelector('[data-hdot]');
  const tip = el.querySelector('[data-tip]');
  let focusIdx = pts.length - 1;
  const show = (i) => {
    const p = pts[i];
    const cx = x(i);
    const cy = y(p.elo);
    xh.setAttribute('x1', cx); xh.setAttribute('x2', cx); xh.setAttribute('visibility', 'visible');
    hd.setAttribute('cx', cx); hd.setAttribute('cy', cy); hd.setAttribute('visibility', 'visible');
    const delta = p.start ? '' : ` (${p.delta >= 0 ? '+' : '−'}${Math.abs(Math.round(p.delta))})`;
    tip.querySelector('b').textContent = `${Math.round(p.elo)}${delta}`;
    tip.querySelector('span').textContent = p.start ? 'Start' : `${p.gf}:${p.ga} · ${t('pl.chartTip', { opp: player(p.opp)?.name ?? '?' })} · ${fmtDate(p.m.at, { day: 'numeric', month: 'short' })}`;
    const scale = el.clientWidth / W;
    tip.style.left = `${Math.min(el.clientWidth - 90, Math.max(90, cx * scale))}px`;
    tip.style.top = `${cy * scale}px`;
    tip.classList.add('on');
  };
  const hide = () => { xh.setAttribute('visibility', 'hidden'); hd.setAttribute('visibility', 'hidden'); tip.classList.remove('on'); };
  const idxAt = (clientX) => {
    const r = svg.getBoundingClientRect();
    const px = ((clientX - r.left) / r.width) * W;
    return Math.max(0, Math.min(pts.length - 1, Math.round(((px - pad.l) / (W - pad.l - pad.r)) * (pts.length - 1))));
  };
  hit.addEventListener('pointermove', (e) => { focusIdx = idxAt(e.clientX); show(focusIdx); });
  hit.addEventListener('pointerdown', (e) => { focusIdx = idxAt(e.clientX); show(focusIdx); });
  hit.addEventListener('pointerleave', hide);
  hit.addEventListener('focus', () => show(focusIdx));
  hit.addEventListener('blur', hide);
  hit.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { focusIdx = Math.max(0, focusIdx - 1); show(focusIdx); e.preventDefault(); }
    if (e.key === 'ArrowRight') { focusIdx = Math.min(pts.length - 1, focusIdx + 1); show(focusIdx); e.preventDefault(); }
  });
}

// ---------------------------------------------------------------- editor
export function openPlayerEditor(id = null, { onSaved } = {}) {
  const existing = id ? player(id) : null;
  const s = existing
    ? { name: existing.name, emoji: existing.emoji || '', color: existing.color || 0, club: existing.club || '' }
    : { name: '', emoji: EMOJIS[Math.floor(Math.random() * 8)], color: Math.floor(Math.random() * COLORS.length), club: '' };
  const hasHistory = id ? playerHasHistory(id) : false;
  const body = `<form data-form novalidate>
    <div class="editor-preview"><span data-prev></span><span class="pname" data-prev-name></span></div>
    <div class="stack" style="gap:16px">
      <div class="field"><label for="pe-name">${esc(t('pl.name'))}</label><input id="pe-name" class="input" name="name" maxlength="24" value="${esc(s.name)}" autocomplete="off" ${existing ? '' : 'autofocus'}></div>
      <div class="field"><span class="flabel">${esc(t('pl.avatar'))}</span><div class="emoji-grid">
        <button type="button" class="initials" data-emoji="">${esc(t('pl.initials'))}</button>
        ${EMOJIS.slice(0, 31).map((e) => `<button type="button" data-emoji="${esc(e)}">${esc(e)}</button>`).join('')}</div></div>
      <div class="field"><span class="flabel">${esc(t('pl.color'))}</span><div class="color-grid">${COLORS.map(([c1, c2], i) => `<button type="button" data-color="${i}" style="--c1:${c1};--c2:${c2}" aria-label="${i + 1}"></button>`).join('')}</div></div>
      <div class="field"><label for="pe-club">${esc(t('pl.club'))}</label><input id="pe-club" class="input" name="club" maxlength="32" value="${esc(s.club)}" autocomplete="off"></div>
    </div>
    <div class="err-text" data-err></div>
    <div class="modal-foot">
      ${existing ? `<button type="button" class="btn btn-danger" data-del ${hasHistory ? 'aria-disabled="true"' : ''}>${icon('trash')}${esc(t('pl.delete'))}</button>` : ''}
      <button type="submit" class="btn btn-primary">${icon('check')}${esc(t('c.save'))}</button>
    </div>
    ${existing && hasHistory ? `<p class="dim" style="font-size:.78rem;margin:12px 0 0">${esc(t('pl.cantDelete'))}</p>` : ''}
  </form>`;
  openModal({
    title: esc(existing ? t('pl.edit') : t('pl.add')),
    body,
    onMount: (el, close) => {
      const nameIn = el.querySelector('#pe-name');
      const clubIn = el.querySelector('#pe-club');
      const refresh = () => {
        const fake = { name: nameIn.value || '?', emoji: s.emoji, color: s.color };
        el.querySelector('[data-prev]').innerHTML = avatar(fake, 'xl', 'av-ring');
        el.querySelector('[data-prev-name]').textContent = nameIn.value || ' ';
        el.querySelectorAll('[data-emoji]').forEach((b) => b.classList.toggle('on', b.dataset.emoji === s.emoji));
        el.querySelectorAll('[data-color]').forEach((b) => b.classList.toggle('on', Number(b.dataset.color) === s.color));
        const ini = el.querySelector('.initials');
        if (ini) ini.textContent = nameIn.value.trim() ? initials(nameIn.value) : t('pl.initials');
      };
      nameIn.addEventListener('input', refresh);
      el.addEventListener('click', (e) => {
        const em = e.target.closest('[data-emoji]');
        if (em) { s.emoji = em.dataset.emoji; refresh(); }
        const co = e.target.closest('[data-color]');
        if (co) { s.color = Number(co.dataset.color); refresh(); }
      });
      el.querySelector('[data-form]').addEventListener('submit', (e) => {
        e.preventDefault();
        const name = nameIn.value.trim();
        if (!name) { el.querySelector('[data-err]').textContent = t('pl.nameRequired'); nameIn.focus(); return; }
        let saved;
        if (existing) { updatePlayer(existing.id, { name, emoji: s.emoji, color: s.color, club: clubIn.value }); saved = existing; toast(t('pl.saved')); }
        else { saved = addPlayer({ name, emoji: s.emoji, color: s.color, club: clubIn.value }); toast(t('pl.added', { name })); }
        close();
        onSaved?.(saved);
      });
      el.querySelector('[data-del]')?.addEventListener('click', async () => {
        if (hasHistory) { toast(t('pl.cantDelete'), 'err'); return; }
        close();
        if (!(await confirmDialog({ title: t('pl.delete'), text: t('pl.deleteConfirm', { name: existing.name }), confirmLabel: t('c.delete'), danger: true }))) return;
        if (location.hash.includes(existing.id)) location.hash = '#/players';
        deletePlayer(existing.id);
        toast(t('pl.deleted'));
      });
      refresh();
    },
  });
}
