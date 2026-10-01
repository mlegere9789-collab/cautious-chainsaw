// sources.mjs - the rights / licensing register (docs/historian/sources.yaml) and the tier gate.
//   Tier A         public domain (US Government work, or published before 1931 on the curated allow-list): may be indexed, redistributed in derived shards, quoted
//   Tier B         attribution and/or share-alike (CC BY, CC BY-SA, ODbL, MIT): separate files, per-record licence + attribution, never in a model call
//   Tier C         link-out only: never fetched, stored, embedded or sent to a model
//   Tier A-pending believed public but awaiting a written confirmation or a source-level check: not shipped until confirmed
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from './yaml-lite.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
export const SOURCES_FILE = path.resolve(here, '../../../docs/historian/sources.yaml');

export const TIERS = ['A', 'B', 'C', 'A-pending'];

export function loadSources(file = SOURCES_FILE) {
  const y = parse(fs.readFileSync(file, 'utf8'));
  const map = new Map();
  for (const s of y.sources || []) { if (map.has(s.id)) throw new Error('duplicate source id ' + s.id); map.set(s.id, s); }
  return { tiers: y.tiers, refused_identifiers: y.refused_identifiers || [], banned_hosts: y.banned_hosts || [], sources: map, raw: y };
}

/** V02: licence / tier rules for one source record. Returns [] when it may be ingested and shipped. */
export function tierProblems(s, { forShipping = true } = {}) {
  const p = [];
  if (!TIERS.includes(s.tier)) p.push(`unknown tier ${s.tier}`);
  if (s.tier === 'C') p.push('Tier C is link-out only: never fetched, stored or shipped');
  if (!s.license || !s.license.id) p.push('missing licence id');
  if (s.tier === 'B' && !s.attribution) p.push('Tier B requires attribution text');
  if (s.may_send_to_llm === true && s.tier !== 'A') p.push('may_send_to_llm is only allowed on Tier A');
  if (s.imprint && s.imprint.reprint === true) p.push('reprint imprint (original scans only)');
  if (s.ocr && typeof s.ocr.proxy === 'number' && s.ocr.proxy < 0.8 && s.ocr.gate !== 'quarantine') p.push('OCR proxy < 0.80 must be quarantined');
  if (forShipping && s.tier === 'A-pending' && s.may_redistribute === true && s.status === 'shipped-external') p.push('Tier A-pending cannot ship external text');
  return p;
}

/** a host name as the gate compares it: lower case, no trailing dots ("battlefields.org." is the same host as "battlefields.org") */
export const normHost = (h) => String(h == null ? '' : h).toLowerCase().replace(/\.+$/, '');
const safeDecode = (s) => { try { return decodeURIComponent(s); } catch { return s; } };
/** every form a URL takes under repeated percent-decoding and compatibility normalisation, until it stops changing (at most 8 rounds): "%2577arrebellion..." is "%77arrebellion..." is "warrebellion..." */
const forms = (url) => {
  const out = []; let cur = String(url);
  for (let k = 0; k < 8; k++) { out.push(cur, cur.normalize('NFKC')); const d = safeDecode(cur); if (d === cur) break; cur = d; }
  return [...new Set(out.map((x) => x.toLowerCase()))];
};

/**
 * Fetch gate: refuses banned hosts (Tier C), refused identifiers (reprints), and anything that is not http(s).
 * The comparison is deliberately over-inclusive, because a rights gate that can be walked around by spelling is not a gate:
 *   * host names are compared lower-case without trailing dots ("battlefields.org." is battlefields.org), and a banned host appearing anywhere in the URL
 *     (a web-archive or proxy wrapper such as web.archive.org/web/2020/https://battlefields.org/x) is refused too
 *   * refused identifiers are compared case-insensitively, against the URL as written and after one and two rounds of percent-decoding
 */
export function fetchAllowed(reg, url) {
  let u;
  try { u = new URL(url); } catch { return { ok: false, reason: 'not a URL' }; }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return { ok: false, reason: `scheme ${u.protocol} is not fetched` };
  const host = normHost(u.hostname);
  const fs = forms(url);
  for (const b0 of reg.banned_hosts) {
    const b = normHost(b0);
    if (host === b || host.endsWith('.' + b) || fs.some((f) => f.includes(b))) return { ok: false, reason: `host ${b} is Tier C (link-out only)` };
  }
  for (const id of reg.refused_identifiers) {
    const needle = String(id).toLowerCase();
    if (fs.some((f) => f.includes(needle))) return { ok: false, reason: `identifier ${id} is on the refused list (reprint or unverified imprint)` };
  }
  return { ok: true };
}
