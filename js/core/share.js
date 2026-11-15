// Shareable snapshots (compressed into the URL fragment) and plain-text summaries.
import { FORMAT_IDS, tournamentState, standingsFor, isPlayed, kothState } from './formats.js';
import { t, fmtDate } from './i18n.js';

function toB64url(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function fromB64url(s) {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
const canCompress = () => typeof CompressionStream === 'function' && typeof DecompressionStream === 'function';

export async function encodeSnapshot(tour, players) {
  const payload = { v: 1, t: tour, p: players.map(({ id, name, emoji, color }) => ({ id, name, emoji: emoji || '', color: color || 0 })) };
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  if (canCompress()) {
    const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'));
    return 'z' + toB64url(new Uint8Array(await new Response(stream).arrayBuffer()));
  }
  return 'j' + toB64url(bytes);
}

const isNumOrNull = (v) => v === null || v === undefined || (Number.isInteger(v) && v >= 0 && v <= 99);

export function validSnapshot(d) {
  if (!d || d.v !== 1 || !d.t || !Array.isArray(d.p)) return false;
  const tour = d.t;
  if (typeof tour.id !== 'string' || typeof tour.name !== 'string' || !FORMAT_IDS.includes(tour.format)) return false;
  if (!Array.isArray(tour.players) || !Array.isArray(tour.matches) || !tour.opts || typeof tour.opts !== 'object') return false;
  if (!d.p.every((p) => p && typeof p.id === 'string' && typeof p.name === 'string')) return false;
  return tour.matches.every((m) => m && typeof m.stage === 'string' && isNumOrNull(m.hg) && isNumOrNull(m.ag) && isNumOrNull(m.hp) && isNumOrNull(m.ap));
}

export async function decodeSnapshot(code) {
  const kind = code[0];
  const bytes = fromB64url(code.slice(1));
  let json;
  if (kind === 'z') {
    if (!canCompress()) throw new Error('Compression not supported');
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    json = await new Response(stream).text();
  } else if (kind === 'j') {
    json = new TextDecoder().decode(bytes);
  } else {
    throw new Error('Unknown snapshot type');
  }
  const data = JSON.parse(json);
  if (!validSnapshot(data)) throw new Error('Invalid snapshot');
  return data;
}

// Short text for WhatsApp / Messenger.
export function textSummary(tour, nameOf) {
  const st = tournamentState(tour);
  const lines = [];
  lines.push(`🏆 ${tour.name} · ${t('fmt.' + tour.format)}`);
  lines.push(fmtDate(tour.createdAt, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
  if (st.done && st.championId) lines.push('', `👑 ${t('sh.champion')}: ${nameOf(st.championId)}`);
  const medal = (i) => ['🥇', '🥈', '🥉'][i] || `${i + 1}.`;
  const tableLines = (rows) => rows.map((r, i) => `${medal(i)} ${nameOf(r.id)} — ${r.pts} ${t('col.pts').toLowerCase()} (${r.w}-${r.d}-${r.l}, ${r.gf}:${r.ga})`);
  if (tour.format === 'league' || tour.format === 'swiss') {
    lines.push('', `📊 ${t('sh.standings')}:`, ...tableLines(standingsFor(tour)));
  } else if (tour.format === 'groups') {
    tour.groups.forEach((_, g) => lines.push('', `📊 ${t('t.group', { g: 'ABCDEFGH'[g] })}:`, ...tableLines(standingsFor(tour, g))));
  } else if (tour.format === 'koth') {
    const ks = kothState(tour);
    lines.push('', `📊 ${t('sh.standings')}:`, ...ks.table.map((r, i) => `${medal(i)} ${nameOf(r.id)} — ${r.w}W ${r.l}L, ${t('col.best').toLowerCase()} ${r.best}`));
  }
  const played = tour.matches.filter((m) => !m.bye && isPlayed(m));
  if (played.length) {
    lines.push('', `⚽ ${t('sh.results')}:`);
    const list = tour.format === 'knockout' || tour.format === 'groups' ? played.filter((m) => m.stage === 'ko' || m.stage === 'third') : played;
    for (const m of (list.length ? list : played).slice(-24)) {
      const pens = m.hp != null ? ` (${t('t.pens', { h: m.hp, a: m.ap })})` : '';
      lines.push(`${nameOf(m.home)} ${m.hg}:${m.ag} ${nameOf(m.away)}${pens}`);
    }
  }
  return lines.join('\n');
}
