// Small shared helpers for the data tooling (WP-DATA-01/03/06/19/20).
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
export const DEFAULT_DATA_DIR = path.join(REPO_ROOT, 'legacy', 'dist', 'data');
export const DEFAULT_BUNDLE = path.join(REPO_ROOT, 'legacy', 'analysis', 'bundle.pretty.js');

/**
 * True when the module whose `import.meta.url` is `metaUrl` is the script node was started with. Compares real file-system
 * paths (fileURLToPath decodes %20 and non-ASCII; realpath resolves symlinks and, on Windows, the on-disk letter case), so it
 * also works from a checkout whose path contains a space or a non-ASCII character. Never compare `URL.pathname` with argv[1]:
 * `pathname` stays percent-encoded and silently turns every CLI into a no-op that exits 0.
 */
export function isMainModule(metaUrl, argv1 = process.argv[1]) {
  if (!argv1) return false;
  try {
    const real = (p) => { const r = fs.realpathSync.native(path.resolve(p)); return process.platform === 'win32' ? r.toLowerCase() : r; };
    return real(fileURLToPath(metaUrl)) === real(argv1);
  } catch { return false; }
}

export const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

/** Deterministic JSON: sorted keys, 2-space indent, trailing newline. */
export function stableStringify(value, indent = 2) {
  const seen = new WeakSet();
  const norm = (v) => {
    if (Array.isArray(v)) return v.map(norm);
    if (v && typeof v === 'object') {
      if (seen.has(v)) throw new Error('circular structure');
      seen.add(v);
      const out = {};
      for (const k of Object.keys(v).sort()) out[k] = norm(v[k]);
      seen.delete(v);
      return out;
    }
    return v;
  };
  return JSON.stringify(norm(value), null, indent) + '\n';
}

/** JSON with insertion-order preserved (for hand-shaped documents such as registry rows). */
export const prettyJson = (value, indent = 2) => JSON.stringify(value, null, indent) + '\n';

export function haversineM(lat1, lng1, lat2, lng2) {
  const R = 6371008.8;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

export const MPH_PER_MS = 2.2369362920544;

export function sideOfPrefix(id) {
  if (typeof id !== 'string') return null;
  if (id.startsWith('U-')) return 'union';
  if (id.startsWith('C-')) return 'confederate';
  return null;
}

/** Natural sort key helper: splits digits so "10th" sorts after "9th" and before "102nd". */
export function naturalCompare(a, b) {
  const ax = String(a).match(/\d+|\D+/g) || [];
  const bx = String(b).match(/\d+|\D+/g) || [];
  for (let i = 0; i < Math.min(ax.length, bx.length); i++) {
    const x = ax[i], y = bx[i];
    if (x === y) continue;
    const xn = /^\d/.test(x), yn = /^\d/.test(y);
    if (xn && yn) return Number(x) - Number(y);
    return x < y ? -1 : 1;
  }
  return ax.length - bx.length;
}

export function isoDate(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

/** Collect every string leaf in a JSON value with its JSON-path. */
export function* walkStrings(value, base = '') {
  if (typeof value === 'string') { yield [base, value]; return; }
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) yield* walkStrings(value[i], `${base}[${i}]`);
  } else if (value && typeof value === 'object') {
    for (const k of Object.keys(value)) yield* walkStrings(value[k], base ? `${base}.${k}` : k);
  }
}
