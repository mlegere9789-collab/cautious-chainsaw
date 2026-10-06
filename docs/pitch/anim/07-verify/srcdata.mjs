// srcdata.mjs - the verifier's own reader of the repo's source data (baseline/dist/data), independent of the prototype's loader.
//   load order of the placement files = the shipped bundle's tF / nF arrays (regex); a repeated (unit, tick) key: the LAST row wins (the shipped bundle writes rows in that order into a map)
import fs from 'node:fs';
import path from 'node:path';
import { REPO } from './lib.mjs';
export const DATA = path.join(REPO, 'baseline', 'dist', 'data');
export const rj = (rel) => JSON.parse(fs.readFileSync(path.join(DATA, rel), 'utf8'));
const bundleDir = path.join(REPO, 'baseline', 'dist', 'assets');
export const bundle = fs.readFileSync(path.join(bundleDir, fs.readdirSync(bundleDir).find((f) => /^index-.*\.js$/.test(f))), 'utf8');
const tfm = /tF=(\{1:\[[^\]]*\],2:\[[^\]]*\],3:\[[^\]]*\]\})\s*,\s*nF=(\{1:\[[^\]]*\],2:\[[^\]]*\],3:\[[^\]]*\]\})/.exec(bundle);
const TF = new Function('return ' + tfm[1].replace(/([{,])(\d):/g, '$1"$2":'))(); const NF = new Function('return ' + tfm[2].replace(/([{,])(\d):/g, '$1"$2":'))();
export const PLACEMENT_FILES = []; for (const d of ['1', '2', '3']) PLACEMENT_FILES.push(...TF[d], ...NF[d]);
export function loadKeyframes() {
  const last = new Map(); let rows = 0;
  for (const f of PLACEMENT_FILES) for (const p of rj(f).placements) { rows++; last.set(p.unit_id + '@' + p.tick, p); }
  const units = new Map(); for (const r of last.values()) { if (!units.has(r.unit_id)) units.set(r.unit_id, []); units.get(r.unit_id).push(r); }
  for (const a of units.values()) a.sort((x, y) => x.tick - y.tick);
  return { rows, keys: last.size, units };
}
export const OOB_ID_KEYS = ['corps_id', 'division_id', 'brigade_id', 'regiment_id', 'battery_id', 'battalion_id'];
export function loadOob() {
  const oob = new Map();
  for (const f of fs.readdirSync(path.join(DATA, 'oob')).sort()) {
    if (f === 'commander_successions.json') continue; const side = f.startsWith('union') ? 'union' : 'confederate'; const j = rj('oob/' + f);
    (function visit(o) { if (Array.isArray(o)) return o.forEach(visit); if (!o || typeof o !== 'object') return; const k = OOB_ID_KEYS.find((x) => typeof o[x] === 'string'); if (k && !oob.has(o[k])) oob.set(o[k], { id: o[k], side, designation: o.designation ?? null, strength: typeof o.strength === 'number' ? o.strength : null, file: f, raw: o }); Object.values(o).forEach(visit); })(j);
  }
  return oob;
}
/** tick -> list of unit ids with a keyframe at exactly that tick */
export function keyframeTicks(units) { const m = new Map(); for (const [id, a] of units) for (const r of a) { if (!m.has(r.tick)) m.set(r.tick, []); m.get(r.tick).push(id); } return m; }
export function firstTicks(units) { const o = {}; for (const [id, a] of units) o[id] = a[0].tick; return o; }
/** seeded PRNG (mulberry32) so a run can be repeated */
export function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
// independent Web-Mercator (512 px world tile at zoom 0, the convention of Mapbox GL)
export const mercator = (lng, lat, z) => { const s = 512 * 2 ** z; const sin = Math.sin(lat * Math.PI / 180); return [(lng + 180) / 360 * s, (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * s]; };
