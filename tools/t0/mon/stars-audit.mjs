// Story-star audit (docs/data-audit/STORY-STARS.md): for each of the 20 story markers (array mA of the entry bundle) it lists, from a built tree,
//   the corrected clock at the marker tick (the independent oracle of tools/t0/clock/oracle.mjs, built from data-src/time/time_anchors.json), the clock times the story text names,
//   the linked unit's state at the tick and its distance to the star (engine rule: the unit's last row at or before the tick; the density files load after the placements of the day),
//   the NPS monument records (OpenStreetMap, tools/t0/data/sources/osm-monuments.json, and the 512-array _A) nearest to the star.
//   node tools/t0/mon/stars-audit.mjs <built tree dist dir> [out.json]      (other tools import it: they pick the tree from the environment variable STARS_DIST)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeOracle } from '../clock/oracle.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..', '..');
const DIST = path.resolve(REPO, process.env.STARS_DIST || (process.argv[1] && process.argv[1].endsWith('stars-audit.mjs') && process.argv[2]) || 'tmp/mon-stars/stack0/dist');
const OUTF = process.argv[3];
const DATA = path.join(DIST, 'data');
const entry = fs.readdirSync(path.join(DIST, 'assets')).find((x) => /^index-.*\.js$/.test(x));
const js = fs.readFileSync(path.join(DIST, 'assets', entry), 'utf8');
const grab = (name, close) => { const i = js.indexOf(name + '=['); const j = js.indexOf(close, i); return (0, eval)('(' + js.slice(i + name.length + 1, j + close.length - 1) + ')'); };
export const mA = grab('mA', '}];');
export const _A = (() => { const i = js.indexOf('_A=['); let d = 0, k = i + 3, inS = false, q = ''; for (; k < js.length; k++) { const c = js[k]; if (inS) { if (c.charCodeAt(0) === 92) k++; else if (c === q) inS = false; continue; } if (c === '"' || c === "'") { inS = true; q = c; continue; } if (c === '[') d++; else if (c === ']') { d--; if (d === 0) break; } } return (0, eval)('(' + js.slice(i + 3, k + 1) + ')'); })();
const rad = (d) => (d * Math.PI) / 180;
export const m = (a, b) => { const R = 6371000, dl = rad(b.lat - a.lat), dg = rad(b.lng - a.lng); const x = Math.sin(dl / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dg / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); };

// engine load order (index chunk nF + placements per day)
const nFm = /nF=\{1:\[([^\]]*)\],2:\[([^\]]*)\],3:\[([^\]]*)\]\}/.exec(js);
const tFm = /tF=\{1:\[([^\]]*)\],2:\[([^\]]*)\],3:\[([^\]]*)\]\}/.exec(js);
const names = (s) => [...s.matchAll(/"([^"]+)\.json"/g)].map((x) => x[1]);
const order = []; for (let d = 1; d <= 3; d++) order.push(...(tFm ? names(tFm[d + 0]) : []), ...names(nFm[d]));
const LINE = /^\s*\{"unit_id":"([^"]+)","tick":(\d+),"lat":([\d.-]+),"lng":([\d.-]+)/;
const eff = {};
for (const f of order) { const p = path.join(DATA, f + '.json'); if (!fs.existsSync(p)) continue; for (const l of fs.readFileSync(p, 'utf8').split('\n')) { const mm = LINE.exec(l); if (mm) (eff[mm[1]] ||= {})[+mm[2]] = { tick: +mm[2], lat: +mm[3], lng: +mm[4], f }; } }
export const rows = (u) => Object.values(eff[u] || {}).sort((a, b) => a.tick - b.tick);
export const stateAt = (u, t) => { let b = null; for (const r of rows(u)) if (r.tick <= t) b = r; return b; };
// unit names
const oob = {}; for (const f of fs.readdirSync(path.join(DATA, 'oob'))) { const j = JSON.parse(fs.readFileSync(path.join(DATA, 'oob', f), 'utf8')); (function walk(o) { if (Array.isArray(o)) o.forEach(walk); else if (o && typeof o === 'object') { const id = o.unit_id || o.regiment_id || o.brigade_id || o.division_id || o.corps_id || o.battery_id || o.id; if (typeof id === 'string' && (o.name || o.unit_name || o.designation)) oob[id] ||= o; for (const v of Object.values(o)) walk(v); } })(j); }
const OSM = JSON.parse(fs.readFileSync(path.join(REPO, 'tools/t0/data/sources/osm-monuments.json'), 'utf8')).elements.map((e) => ({ name: e.tags.name, ins: e.tags.inscription, lat: (e.center || e).lat, lng: (e.center || e).lon }));
const O = makeOracle();
const near = (p, arr, k, lat = 'lat', lng = 'lng') => arr.map((x) => ({ name: x.name, d: Math.round(m(p, { lat: x[lat], lng: x[lng] })), x })).sort((a, b) => a.d - b.d).slice(0, k);
export function audit() {
  return mA.map((s) => {
    const p = { lat: s.lat, lng: s.lng };
    const st = stateAt(s.unit_id, s.tick), rr = rows(s.unit_id);
    const times = [...s.label.matchAll(/\b(\d{1,2}):(\d{2})\s?(AM|PM)/g)].map((x) => x[0]);
    return {
      id: s.id, name: s.name, unit: s.unit_id, unitName: (oob[s.unit_id] || {}).designation || (oob[s.unit_id] || {}).name || (oob[s.unit_id] || {}).unit_name || null, tick: s.tick, day: s.day,
      clock: O.fmt(s.tick, 'compat'), unc: O.uncertaintyText(s.tick), timesInText: times, label: s.label, star: p,
      unitAtTick: st ? { tick: st.tick, lat: st.lat, lng: st.lng, d: Math.round(m(p, st)), f: st.f } : null, nRows: rr.length, firstRow: rr[0] && rr[0].tick,
      nearRows: rr.filter((r) => Math.abs(r.tick - s.tick) <= 40).map((r) => `${r.tick}:${Math.round(m(p, r))}m`).join(' '),
      osm: near(p, OSM, 4).map((x) => `${x.name} ${x.d}m`), A: near(p, _A, 3, 'lat', 'lon').map((x) => `${x.name} ${x.d}m`),
    };
  });
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const r = audit();
  for (const a of r) console.log(`${a.id} | tick ${a.tick} d${a.day} | clock ${a.clock} (${a.unc}) | text times ${a.timesInText.join(', ') || '-'} | unit ${a.unit} ${a.unitName} rows ${a.nRows} first ${a.firstRow} | at tick ${a.unitAtTick ? a.unitAtTick.d + 'm (row ' + a.unitAtTick.tick + ')' : 'none'}\n    near: ${a.nearRows}\n    OSM: ${a.osm.join('; ')}\n    A: ${a.A.join('; ')}`);
  if (OUTF) fs.writeFileSync(OUTF, JSON.stringify(r, null, 1));
}
