// Local-first data store (localStorage) with change notifications.
import { uid } from './util.js';
import { buildContext } from './stats.js';
import { validateDB } from './validate.js';

// Internal storage key; kept unchanged so data saved by earlier versions is still found.
const KEY = 'sundayleague.v1';
const listeners = new Set();
let db = null;
let rev = 0;
let ctxCache = { rev: -1, ctx: null };
let lastSaveOk = true;
let loadIssue = null;

export const fresh = () => ({ version: 1, settings: { lang: null, crew: '' }, players: [], tournaments: [] });

// Stored data is validated like any import; if it ever fails, a raw copy is kept and the
// problem is reported to the user (see loadProblem) instead of being silently dropped.
export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const res = validateDB(JSON.parse(raw));
      if (res.ok) { db = res.value; return db; }
      loadIssue = res.error;
      console.error(`[store] stored data failed validation (${res.error}); raw copy kept under ${KEY}.corrupt`);
      localStorage.setItem(KEY + '.corrupt', raw);
    }
  } catch (e) {
    loadIssue = String(e && e.message ? e.message : e);
    console.error('[store] could not read storage', e);
  }
  db = fresh();
  return db;
}
export const loadProblem = () => loadIssue;

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
    lastSaveOk = true;
  } catch (e) {
    lastSaveOk = false;
    console.error('[store] save failed', e);
  }
  return lastSaveOk;
}

export const getDB = () => db;
export const getRev = () => rev;
export const saveOk = () => lastSaveOk;
export function onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function emit(info) { for (const fn of listeners) fn(info); }

// Every mutation goes through commit(): mutate -> bump revision -> persist -> notify.
export function commit(mutator, info = {}) {
  const result = mutator(db);
  rev++;
  const ok = persist();
  emit({ ...info, saved: ok });
  return result;
}

// `next` must already be validated (validateDB(...).value).
export function replaceAll(next) {
  db = next;
  rev++;
  const ok = persist();
  emit({ replaced: true, saved: ok });
}

export function context() {
  if (ctxCache.rev !== rev) ctxCache = { rev, ctx: buildContext(db) };
  return ctxCache.ctx;
}

// Keep several open tabs in sync.
export function watchOtherTabs() {
  window.addEventListener('storage', (e) => {
    if (e.key !== KEY || !e.newValue) return;
    try {
      const res = validateDB(JSON.parse(e.newValue));
      if (!res.ok) { console.warn('[store] ignored invalid update from another tab:', res.error); return; }
      db = res.value;
      rev++;
      emit({ external: true, saved: true });
    } catch (err) { console.warn('[store] could not read update from another tab', err); }
  });
}

// ---------------------------------------------------------------- players
// Guests: players carried inside a shared snapshot link (read-only views).
let guests = new Map();
export function setGuestPlayers(list) { guests = new Map((list || []).map((p) => [p.id, p])); }
export const player = (id) => db.players.find((p) => p.id === id) || guests.get(id) || null;

export function addPlayer({ name, emoji = '', color = 0, club = '' }, extra = {}) {
  const p = { id: uid('p'), name: name.trim().slice(0, 24), emoji, color, club: club.trim().slice(0, 32), createdAt: Date.now(), ...extra };
  commit((d) => d.players.push(p), { type: 'player-add' });
  return p;
}

export function updatePlayer(id, patch) {
  commit((d) => {
    const p = d.players.find((x) => x.id === id);
    if (!p) return;
    if (patch.name != null) p.name = patch.name.trim().slice(0, 24);
    if (patch.club != null) p.club = patch.club.trim().slice(0, 32);
    if (patch.emoji != null) p.emoji = patch.emoji;
    if (patch.color != null) p.color = patch.color;
  }, { type: 'player-edit' });
}

export const playerHasHistory = (id) => db.tournaments.some((t) => t.players.includes(id));

export function deletePlayer(id) {
  if (playerHasHistory(id)) return false;
  commit((d) => { d.players = d.players.filter((p) => p.id !== id); }, { type: 'player-delete' });
  return true;
}

// ---------------------------------------------------------------- tournaments
export const tournament = (id) => db.tournaments.find((t) => t.id === id) || null;

export function addTournament(t) {
  commit((d) => d.tournaments.push(t), { type: 'tournament-add' });
  return t;
}

export function updateTournament(id, fn, info = {}) {
  return commit((d) => {
    const t = d.tournaments.find((x) => x.id === id);
    return t ? fn(t) : undefined;
  }, { type: 'tournament-edit', ...info });
}

export function deleteTournament(id) {
  commit((d) => { d.tournaments = d.tournaments.filter((t) => t.id !== id); }, { type: 'tournament-delete' });
}

export function setSetting(key, value, { silent = false } = {}) {
  commit((d) => { d.settings[key] = value; }, { type: 'settings', silent });
}

export function storageBytes() {
  try { return new Blob([localStorage.getItem(KEY) || '']).size; } catch { return 0; }
}
