// Shared helpers for tools/time/*.mjs (Node >= 20, no dependencies).
// CANDIDATE work under WP-TIME-02/03/06/20. Nothing here ships until the owner/historian approves (D-TIME).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const P = (...a) => path.join(ROOT, ...a);
export const LEGACY = P('legacy', 'dist');
export const BUNDLE = 'assets/index-Cg8FAMXN.js';

export const readText = (p) => fs.readFileSync(p, 'utf8');
export const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

/** Write only when the bytes change (keeps git diffs and mtimes quiet). Returns true if written. */
export function writeIfChanged(p, text) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  if (fs.existsSync(p) && fs.readFileSync(p, 'utf8') === text) return false;
  fs.writeFileSync(p, text);
  return true;
}

/** Minimal RFC-4180 CSV reader -> array of objects keyed by the header row. */
export function readCsv(p) {
  const s = readText(p).replace(/^﻿/, '');
  const rows = [];
  let row = [], cell = '', q = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) {
      if (c === '"') { if (s[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && s[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  const head = rows.shift();
  return rows.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));
}

/** "5:00a" / "5:00am" / "12:00p" / "11:59p" / "4:30 PM" / "1:07pm" -> minutes after midnight (0..1439). Returns null if unparsable. */
export function parseHm(s) {
  const m = /^\s*(\d{1,2}):(\d{2})\s*([ap])m?\s*$/i.exec(String(s));
  if (!m) return null;
  let h = +m[1] % 12; if (m[3].toLowerCase() === 'p') h += 12;
  return h * 60 + +m[2];
}

/** "July 2" -> 2 (day of month, July 1863). */
export function parseJulyDay(s) {
  const m = /July\s+(\d{1,2})/i.exec(String(s));
  return m ? +m[1] : null;
}

/** Minutes since 1863-07-01T00:00 for a July date-number + minutes-after-midnight. */
export const julyMinutes = (day, minOfDay) => (day - 1) * 1440 + minOfDay;

/** "July 2 6:15pm" | "July 3 12:40" (truncated csv variants are not accepted) -> minutes since epoch, or null. */
export function parseJulyClock(s) {
  const m = /^\s*July\s+(\d{1,2})\s+(\d{1,2}:\d{2}\s*[ap]m?)\s*$/i.exec(String(s));
  if (!m) return null;
  const hm = parseHm(m[2]);
  return hm == null ? null : julyMinutes(+m[1], hm);
}

/** "1863-07-03T15:00" formatting of minutes since epoch (July 1863 only; tools use it for reports). */
export function isoOf(min) {
  const d = Math.floor(min / 1440), r = min - d * 1440, h = Math.floor(r / 60), mi = Math.round(r - h * 60);
  return `1863-07-${String(1 + d).padStart(2, '0')}T${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}`;
}

export const hm12 = (minOfDay) => {
  const h = Math.floor(minOfDay / 60) % 24, m = Math.round(minOfDay % 60);
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};

export const mean = (a) => a.reduce((s, x) => s + x, 0) / (a.length || 1);
export const median = (a) => { const b = [...a].sort((x, y) => x - y), n = b.length; return n ? (n % 2 ? b[(n - 1) / 2] : (b[n / 2 - 1] + b[n / 2]) / 2) : NaN; };
export const rms = (a) => Math.sqrt(mean(a.map((x) => x * x)));
export const r1 = (x) => Math.round(x * 10) / 10;
export const r2 = (x) => Math.round(x * 100) / 100;

export function pad(s, n) { s = String(s); return s.length >= n ? s : s + ' '.repeat(n - s.length); }

/** Markdown table from header + rows (cells stringified, pipes escaped). */
export function mdTable(head, rows) {
  const esc = (x) => String(x ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
  return [`| ${head.map(esc).join(' | ')} |`, `|${head.map(() => '---').join('|')}|`, ...rows.map((r) => `| ${r.map(esc).join(' | ')} |`)].join('\n');
}

/** Parse CLI flags: --a --b=1 positional... */
export function parseArgs(argv) {
  const flags = {}, pos = [];
  for (const a of argv) {
    const m = /^--([^=]+)(?:=(.*))?$/.exec(a);
    if (m) flags[m[1]] = m[2] === undefined ? true : m[2]; else pos.push(a);
  }
  return { flags, pos };
}
