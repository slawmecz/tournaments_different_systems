// Small pure helpers shared by the core modules (no DOM access here).

const cryptoObj = globalThis.crypto;

export function rand() {
  const a = new Uint32Array(1);
  cryptoObj.getRandomValues(a);
  return a[0] / 4294967296;
}

export function uid(prefix = '') {
  const a = new Uint32Array(2);
  cryptoObj.getRandomValues(a);
  return prefix + a[0].toString(36) + a[1].toString(36).slice(0, 3);
}

export function shuffle(list) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function nextPow2(n) {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export function deepClone(v) {
  return typeof structuredClone === 'function' ? structuredClone(v) : JSON.parse(JSON.stringify(v));
}
