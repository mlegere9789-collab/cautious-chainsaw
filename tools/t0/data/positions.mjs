// Position audit helper: for each notable unit, the position it has at each of the 33 CLOCK anchor ticks (last recorded placement at or before the tick, from every
// data/placements_*.json and data/density_*.json), reduced to the nearest named place of data/terrain.json and its distance.
//   node tools/t0/data/positions.mjs <data-dir> [--json out.json]
import fs from 'node:fs';
import path from 'node:path';
const dir = process.argv[2] || 'baseline/dist/data';
const jsonOut = process.argv.includes('--json') ? process.argv[process.argv.indexOf('--json') + 1] : null;
const ANCHORS = [1, 5, 12, 28, 36, 53, 57, 64, 72, 75, 90, 100, 226, 240, 248, 256, 267, 275, 280, 295, 302, 314, 326, 340, 451, 500, 515, 518, 538, 551, 556, 568, 675];
const UNITS = (await import('./sources/positions-units.mjs')).UNITS;
const terr = JSON.parse(fs.readFileSync(path.join(dir, 'terrain.json'), 'utf8'));
const PLACES = terr.key_locations.map((k) => ({ code: k.location_id.replace('LOC-', ''), name: k.name, lat: k.lat, lng: k.lng }));
const rad = (d) => (d * Math.PI) / 180;
const km = (a, b) => { const R = 6371, dl = rad(b.lat - a.lat), dg = rad(b.lng - a.lng); const x = Math.sin(dl / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dg / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); };
const rows = {};
const LINE = /^\s*\{"unit_id":"([^"]+)","tick":(\d+),"lat":([\d.-]+),"lng":([\d.-]+)/;
for (const f of fs.readdirSync(dir).filter((x) => /^(placements_|density_).*\.json$/.test(x))) {
  for (const l of fs.readFileSync(path.join(dir, f), 'utf8').split('\n')) {
    const m = LINE.exec(l);
    if (m) (rows[m[1]] ||= []).push({ tick: +m[2], lat: +m[3], lng: +m[4], file: f });
  }
}
for (const u of Object.keys(rows)) rows[u].sort((a, b) => a.tick - b.tick);
export function posAt(unit, tick) { const r = (rows[unit] || []).filter((x) => x.tick <= tick); return r.length ? r[r.length - 1] : null; }
export function nearest(p) { let best = null; for (const q of PLACES) { const d = km(p, q); if (!best || d < best.d) best = { code: q.code, name: q.name, d }; } return best; }
export { PLACES, ANCHORS, km, rows };
const out = [];
for (const [id, label] of Object.entries(UNITS)) {
  const r = [];
  for (const t of ANCHORS) { const p = posAt(id, t); if (!p) { r.push({ t, off: true }); continue; } const n = nearest(p); r.push({ t, lat: p.lat, lng: p.lng, near: n.code, name: n.name, d: Math.round(n.d * 10) / 10, rowTick: p.tick }); }
  out.push({ id, label, r });
}
if (process.argv[1] && process.argv[1].endsWith('positions.mjs')) {
  console.log('anchors:', ANCHORS.join(' '));
  for (const o of out) console.log(o.id.padEnd(14), o.label.padEnd(24), o.r.map((x) => (x.off ? ' --  ' : x.near + (x.d >= 1 ? '+' + Math.round(x.d) : ' '))).map((s) => s.padEnd(5)).join(''));
  console.log('legend:', PLACES.map((p) => p.code + '=' + p.name).join('; '));
}
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(out));
