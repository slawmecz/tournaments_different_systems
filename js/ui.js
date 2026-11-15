// Shared UI helpers: escaping, icons, avatars, modals, toasts, confetti.
import { t } from './core/i18n.js';
import { player } from './core/store.js';

export const COLORS = [
  ['#2bff88', '#19d3ff'], ['#ff5470', '#ff9f43'], ['#8b5cff', '#ff4fd8'], ['#19d3ff', '#3b6cf6'],
  ['#ffcf4a', '#ff7a18'], ['#00c9a7', '#38e078'], ['#ff4fd8', '#ff5470'], ['#6366f1', '#19d3ff'],
  ['#f43f5e', '#8b5cff'], ['#a3e635', '#16a34a'], ['#94a3b8', '#475569'], ['#fb923c', '#e11d48'],
];

export const EMOJIS = ['⚽', '🔥', '⚡', '👑', '🦁', '🐯', '🦅', '🐺', '🦈', '🐉', '🚀', '💎', '🎯', '🧙', '🤖', '👽',
  '🦄', '🐻', '🐼', '🦊', '🐸', '🐙', '🦖', '🐐', '🥷', '😎', '🤠', '👻', '💀', '🍕', '🌶️', '🧊'];

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

export const icon = (name, cls = '') => `<svg class="ico ${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;

export function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return Array.from(parts[0]).slice(0, 2).join('');
  return Array.from(parts[0])[0] + Array.from(parts[1])[0];
}

export function colorVars(p) {
  const [c1, c2] = COLORS[(p?.color ?? 0) % COLORS.length];
  return `--c1:${c1};--c2:${c2}`;
}

// Unknown ids (e.g. players from another device) still render safely.
export function avatar(pOrId, size = 'md', extra = '') {
  const p = typeof pOrId === 'string' ? player(pOrId) : pOrId;
  const label = p ? p.name : '?';
  const content = p?.emoji ? esc(p.emoji) : esc(initials(label));
  return `<span class="av av-${size} ${p?.emoji ? 'emoji' : ''} ${extra}" style="${colorVars(p)}" aria-hidden="true">${content}</span>`;
}

export const pname = (id) => esc(player(id)?.name ?? '?');

export function playerLink(id, size = 'sm') {
  return `<a class="player-link" href="#/player/${esc(id)}">${avatar(id, size)}<span class="pname">${pname(id)}</span></a>`;
}

export function formChips(form, n = 5) {
  const last = form.slice(-n);
  const cells = last.map((o) => `<i class="${o}" title="${esc(t('form.' + o + '.full'))}">${esc(t('form.' + o))}</i>`);
  while (cells.length < n) cells.unshift('<i class="none">–</i>');
  return `<span class="form">${cells.join('')}</span>`;
}

export function wdlBar(w, d, l) {
  const total = w + d + l;
  if (!total) return '<div class="wdl-bar"></div>';
  const pct = (v) => `${(v / total) * 100}%`;
  return `<div class="wdl-bar" role="img" aria-label="${w}-${d}-${l}">${w ? `<span class="w" style="width:${pct(w)}"></span>` : ''}${d ? `<span class="d" style="width:${pct(d)}"></span>` : ''}${l ? `<span class="l" style="width:${pct(l)}"></span>` : ''}</div>`;
}

// ---------------------------------------------------------------- toasts
export function toast(msg, type = 'ok') {
  const root = document.getElementById('toast-root');
  const el = document.createElement('div');
  el.className = `toast ${type === 'err' ? 'err' : ''}`;
  el.innerHTML = `${icon(type === 'err' ? 'alert' : 'check')}<span></span>`;
  el.querySelector('span').textContent = msg;
  root.appendChild(el);
  while (root.children.length > 3) root.firstChild.remove();
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 260); }, type === 'err' ? 4200 : 2400);
}

// ---------------------------------------------------------------- modal
let openCount = 0;
export function openModal({ title = '', body = '', onMount, wide = false, onClose } = {}) {
  const root = document.getElementById('modal-root');
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `<div class="modal" role="dialog" aria-modal="true" ${wide ? 'style="max-width:640px"' : ''}>
    ${title ? `<div class="modal-head"><h2 class="h3">${title}</h2><button class="btn btn-icon btn-ghost" data-close aria-label="${esc(t('c.close'))}">${icon('x')}</button></div>` : ''}
    <div class="modal-body">${body}</div></div>`;
  const prevFocus = document.activeElement;
  root.appendChild(backdrop);
  openCount++;
  document.body.classList.add('modal-open');
  const modal = backdrop.querySelector('.modal');
  let closed = false;
  const close = (result) => {
    if (closed) return;
    closed = true;
    document.removeEventListener('keydown', onKey, true);
    modal.classList.add('closing');
    backdrop.classList.add('closing');
    setTimeout(() => {
      backdrop.remove();
      openCount--;
      if (!openCount) document.body.classList.remove('modal-open');
      if (prevFocus && prevFocus.focus) prevFocus.focus({ preventScroll: true });
    }, 200);
    onClose?.(result);
  };
  const onKey = (e) => {
    if (e.key === 'Escape') { e.stopPropagation(); close(); }
  };
  document.addEventListener('keydown', onKey, true);
  backdrop.addEventListener('mousedown', (e) => { if (e.target === backdrop) close(); });
  backdrop.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => close()));
  onMount?.(modal, close);
  // Desktop: focus the first field shortly after the open animation starts, but never steal
  // focus from a field the user has already moved to.
  const focusable = modal.querySelector('[autofocus]') || modal.querySelector('input, button.btn-primary');
  if (focusable && window.matchMedia('(min-width: 641px)').matches) {
    setTimeout(() => { if (!closed && !modal.contains(document.activeElement)) focusable.focus({ preventScroll: true }); }, 60);
  }
  return close;
}

export function confirmDialog({ title, text, confirmLabel = t('c.confirm'), danger = false }) {
  return new Promise((resolve) => {
    let answered = false;
    openModal({
      title: esc(title),
      body: `<p class="muted" style="margin:0">${esc(text)}</p>
        <div class="modal-foot"><button class="btn" data-close>${esc(t('c.cancel'))}</button>
        <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-ok>${esc(confirmLabel)}</button></div>`,
      onMount: (m, close) => m.querySelector('[data-ok]').addEventListener('click', () => { answered = true; close(); resolve(true); }),
      onClose: () => { if (!answered) resolve(false); },
    });
  });
}

export function promptDialog({ title, value = '', label = '', confirmLabel = t('c.save'), maxLength = 40 }) {
  return new Promise((resolve) => {
    let answered = false;
    openModal({
      title: esc(title),
      body: `<form data-form class="field">${label ? `<label for="pd-in">${esc(label)}</label>` : ''}
        <input id="pd-in" class="input" maxlength="${maxLength}" value="${esc(value)}" autocomplete="off" autofocus>
        <div class="modal-foot"><button type="button" class="btn" data-close>${esc(t('c.cancel'))}</button>
        <button type="submit" class="btn btn-primary">${esc(confirmLabel)}</button></div></form>`,
      onMount: (m, close) => m.querySelector('[data-form]').addEventListener('submit', (e) => {
        e.preventDefault();
        const v = m.querySelector('input').value.trim();
        if (!v) return;
        answered = true; close(); resolve(v);
      }),
      onClose: () => { if (!answered) resolve(null); },
    });
  });
}

// ---------------------------------------------------------------- clipboard / share
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast(t('c.copied'));
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    ta.remove();
    toast(ok ? t('c.copied') : t('c.copyFail'), ok ? 'ok' : 'err');
    return ok;
  }
}

// ---------------------------------------------------------------- confetti
const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function confetti({ duration = 3200, count = 170 } = {}) {
  if (reduceMotion()) return;
  const canvas = document.getElementById('confetti');
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W = window.innerWidth;
  const H = window.innerHeight;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const colors = ['#2bff88', '#19d3ff', '#ffcf4a', '#ff4fd8', '#8b5cff', '#ffffff'];
  const parts = Array.from({ length: count }, (_, i) => {
    const fromLeft = i % 2 === 0;
    return {
      x: fromLeft ? -10 : W + 10,
      y: H * (0.55 + Math.random() * 0.3),
      vx: (fromLeft ? 1 : -1) * (6 + Math.random() * 9),
      vy: -(11 + Math.random() * 10),
      w: 6 + Math.random() * 6,
      h: 8 + Math.random() * 10,
      r: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.35,
      c: colors[i % colors.length],
      shape: Math.random() > 0.7 ? 'circle' : 'rect',
    };
  });
  const start = performance.now();
  const frame = (now) => {
    const elapsed = now - start;
    ctx.clearRect(0, 0, W, H);
    for (const p of parts) {
      p.vy += 0.32;
      p.vx *= 0.985;
      p.vy *= 0.985;
      p.x += p.vx;
      p.y += p.vy;
      p.r += p.vr;
      const alpha = Math.max(0, 1 - Math.max(0, elapsed - duration * 0.6) / (duration * 0.4));
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.c;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.r);
      if (p.shape === 'circle') { ctx.beginPath(); ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2); ctx.fill(); }
      else ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.r * 2)) + 2);
      ctx.restore();
    }
    if (elapsed < duration) requestAnimationFrame(frame);
    else ctx.clearRect(0, 0, W, H);
  };
  requestAnimationFrame(frame);
}

// Animated number counters for elements with [data-count].
export function countUp(root) {
  const els = root.querySelectorAll('[data-count]');
  if (reduceMotion()) return;
  els.forEach((el) => {
    const target = Number(el.dataset.count);
    if (!Number.isFinite(target) || target === 0) return;
    const start = performance.now();
    const dur = 900;
    const step = (now) => {
      const k = Math.min(1, (now - start) / dur);
      const eased = 1 - (1 - k) ** 3;
      el.textContent = Math.round(target * eased).toLocaleString();
      if (k < 1) requestAnimationFrame(step);
    };
    el.textContent = '0';
    requestAnimationFrame(step);
  });
}

export function trophySVG(size = 120) {
  return `<svg viewBox="0 0 120 120" width="${size}" height="${size}" aria-hidden="true">
    <defs><clipPath id="cup-clip"><path d="M34 14h52v26c0 16-11.6 29-26 29S34 56 34 40z"/></clipPath>
    <linearGradient id="shine-g" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".75"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>
    <path d="M34 22H18v8c0 12 9 20 20 20" fill="none" stroke="url(#g-gold)" stroke-width="7" stroke-linecap="round"/>
    <path d="M86 22h16v8c0 12-9 20-20 20" fill="none" stroke="url(#g-gold)" stroke-width="7" stroke-linecap="round"/>
    <path d="M34 14h52v26c0 16-11.6 29-26 29S34 56 34 40z" fill="url(#g-gold)"/>
    <g clip-path="url(#cup-clip)"><rect class="shine-band" x="20" y="0" width="22" height="80" fill="url(#shine-g)" transform="skewX(-18)"/></g>
    <path d="M52 68h16l3 18H49z" fill="url(#g-gold)"/>
    <rect x="38" y="86" width="44" height="10" rx="3" fill="url(#g-gold)"/>
    <rect x="32" y="96" width="56" height="12" rx="4" fill="#b8740e"/>
    <path d="M60 26l3.5 7.2 7.9 1.1-5.7 5.6 1.4 7.8L60 44l-7.1 3.7 1.4-7.8-5.7-5.6 7.9-1.1z" fill="#fff6c9" opacity=".9"/>
  </svg>`;
}
