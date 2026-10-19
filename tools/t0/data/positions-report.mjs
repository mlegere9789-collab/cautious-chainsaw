#!/usr/bin/env node
// Position audit report: the 85 notable units (data/sources/positions-units.mjs) at the 33 anchor ticks of the corrected clock, before (baseline/dist) and after (a DATA build),
// plus the source-backed anchor checks.  The state of a unit at a tick is the engine's: its last row at or before the tick (function y1 keeps the last state).
//   node tools/t0/data/positions-report.mjs <DATA build data dir>      writes docs/data-audit/positions.json
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..', '..');
const AFTER = path.resolve(REPO, process.argv[2] || 'tmp/data-audit/data-R1c/dist/data');
const BEFORE = path.join(REPO, 'baseline', 'dist', 'data');
const { UNITS } = await import('./sources/positions-units.mjs');
const ANCH = JSON.parse(fs.readFileSync(path.join(REPO, 'data-src', 'time', 'time_anchors.json'), 'utf8')).anchors;
const terr = JSON.parse(fs.readFileSync(path.join(BEFORE, 'terrain.json'), 'utf8'));
const PLACES = terr.key_locations.map((k) => ({ code: k.location_id.replace('LOC-', ''), name: k.name, lat: k.lat, lng: k.lng }));
const rad = (d) => (d * Math.PI) / 180;
const km = (a, b) => { const R = 6371, dl = rad(b.lat - a.lat), dg = rad(b.lng - a.lng); const x = Math.sin(dl / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dg / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); };
const nearest = (p) => { let b = null; for (const q of PLACES) { const d = km(p, q); if (!b || d < b.d) b = { code: q.code, name: q.name, d }; } return b; };

// rows in the engine's load order: the day's placements files, then the day's density files (last row of a tick wins)
const src = fs.readFileSync(path.join(REPO, 'baseline', 'dist', 'assets', 'index-Cg8FAMXN.js'), 'utf8');
const nFm = /nF=\{1:\[([^\]]*)\],2:\[([^\]]*)\],3:\[([^\]]*)\]\}/.exec(src);
const tF = { 1: ['placements_day1_ticks1_50', 'placements_day1_ticks51_100', 'placements_day1_ticks101_225'], 2: ['placements_day2_ticks226_300', 'placements_day2_ticks301_375', 'placements_day2_ticks376_450'], 3: ['placements_day3_ticks451_520', 'placements_day3_ticks521_600', 'placements_day3_ticks601_675'] };
const order = [];
for (let d = 1; d <= 3; d++) order.push(...tF[d], ...[...nFm[d].matchAll(/"([^"]+)\.json"/g)].map((m) => m[1]));
const LINE = /^\s*\{"unit_id":"([^"]+)","tick":(\d+),"lat":([\d.-]+),"lng":([\d.-]+)/;
function load(dir) {
  const eff = {};
  for (const f of order) {
    const p = path.join(dir, f + '.json'); if (!fs.existsSync(p)) continue;
    for (const l of fs.readFileSync(p, 'utf8').split('\n')) { const m = LINE.exec(l); if (m) (eff[m[1]] ||= {})[+m[2]] = { tick: +m[2], lat: +m[3], lng: +m[4] }; }
  }
  return eff;
}
const stateAt = (eff, u, t) => { const x = eff[u]; if (!x) return null; let best = null; for (const k of Object.keys(x).map(Number)) if (k <= t && (!best || k > best.tick)) best = x[k]; return best; };
const eb = load(BEFORE), ea = load(AFTER);
const ticks = ANCH.map((a) => a.tick);
const cells = [];
let present = 0, changed = 0, appeared = 0, vanished = 0, movedKm = [];
for (const [u, label] of Object.entries(UNITS)) {
  for (const a of ANCH) {
    const b = stateAt(eb, u, a.tick), c = stateAt(ea, u, a.tick);
    const nb = b && nearest(b), nc = c && nearest(c);
    const cell = { unit: u, label, tick: a.tick, anchor: a.label, before: b ? { lat: b.lat, lng: b.lng, rowTick: b.tick, near: nb.code, d: +nb.d.toFixed(2) } : null, after: c ? { lat: c.lat, lng: c.lng, rowTick: c.tick, near: nc.code, d: +nc.d.toFixed(2) } : null };
    if (b || c) present++;
    if (!b && c) appeared++; else if (b && !c) vanished++;
    else if (b && c) { const dk = km(b, c); if (dk > 0.05) { changed++; movedKm.push(dk); } }
    cells.push(cell);
  }
}
// anchor checks: [tick, unit, place name, lat, lng, tolerance km, source read]
const CHECKS = [
  [28, 'U-I-1-1', 'Herbst Woods (McPherson\'s Woods), LOC-013', 39.8289, -77.2578, 0.8, 'OR 27/1 p.266 (Wadsworth: Reynolds fell about 10.15 a.m.), p.267 (Morrow: the brigade charged into the ravine of Willoughby\'s Run)'],
  [29, 'U-2WI', 'Herbst Woods, LOC-013', 39.8289, -77.2578, 0.8, 'OR 27/1 p.266 (the First Brigade captured General Archer), p.267'],
  [36, 'U-6WI', 'Railroad Cut, LOC-017', 39.835, -77.25, 0.8, 'OR 27/1 p.266 (Wadsworth: the 6th Wisconsin charged the advance of the enemy and captured two regiments), Dawes p.275-276'],
  [53, 'C-II-3-3', 'Oak Ridge stone wall, LOC-014', 39.83, -77.2406, 0.8, 'OR 27/2 p.553-554 (Rodes: Iverson\'s brigade caught at the stone wall)'],
  [53, 'U-I-2-2', 'Oak Ridge stone wall, LOC-014', 39.83, -77.2406, 0.8, 'OR 27/1 p.248 (Baxter behind the stone wall)'],
  [57, 'U-XI-1-1', 'Barlow\'s Knoll, LOC-016', 39.8356, -77.2283, 0.8, 'OR 27/1 p.727-729 (Schurz), p.696 (Howard)'],
  [64, 'C-III-3-3', 'Lutheran Seminary / Seminary Ridge, LOC-022', 39.8261, -77.2456, 0.8, 'OR 27/2 p.607 (Hill: Perrin driving the enemy through the town); p.665 (Lane/Perrin: the Seminary ground)'],
  [72, 'U-I-2-2', 'Cemetery Hill, LOC-001', 39.8218, -77.2289, 0.8, 'OR 27/1 p.696 (Howard: the stronger position on Cemetery Hill), p.266 (Wadsworth)'],
  [120, 'U-I-1-1', 'Culp\'s Hill, LOC-002', 39.8201, -77.2205, 0.4, 'OR 27/1 p.266 (Wadsworth: a hill on the right of the cemetery, held on the 2d and 3d), p.277 (Dawes)'],
  [267, 'U-V-1-3', 'Little Round Top line (row of tick 267)', 39.7933, -77.2394, 0.5, 'OR 27/1 p.602 (Barnes), p.623 (Chamberlain)'],
  [275, 'U-20ME', 'Little Round Top, LOC-003', 39.7895, -77.2361, 0.7, 'OR 27/1 p.623 (Chamberlain: the southern slope of Little Round Top)'],
  [270, 'U-ART-D5US', 'Little Round Top summit line (row of tick 270)', 39.7933, -77.2389, 0.5, 'OR 27/1 p.623 (Hazlett\'s battery on the crest)'],
  [256, 'U-CAV-1-1', 'on the Taneytown Road, off the field', 39.7199, -77.2097, 0.5, 'OR 27/1 p.145, p.1032 (Calef: reached Taneytown about 4 p.m.)'],
  [340, 'U-CAV-1-2', 'on the Taneytown Road, off the field', 39.7199, -77.2097, 0.5, 'OR 27/1 p.117, p.145'],
  [248, 'U-III-1-3', 'Peach Orchard, LOC-007', 39.8008, -77.2497, 0.5, 'OSM way 49 "Sherfy\'s Peach Orchard" 39.8008, -77.2496; Graham\'s brigade at the Peach Orchard'],
  [302, 'U-1MN', '1st Minnesota monument (Wikipedia 39.8105, -77.2361)', 39.8105, -77.2361, 0.5, 'Wikipedia/NPS monument coordinate; OR 27/1 p.? (Hancock: the 1st Minnesota charged Wilcox\'s brigade)'],
  [548, 'C-I-3-1', 'The Angle, LOC-009', 39.8134, -77.2364, 0.5, 'OR 27/2 p.? (Pickett/Kemper); NPS: Garnett killed at the wall near the Angle; the row of the same unit in density_day3_angle'],
  [551, 'C-I-3-3', 'The Angle, LOC-009', 39.8134, -77.2364, 0.5, 'OR 27/1 p.374 (Webb), p.417 (Hancock): Armistead over the wall at the Angle'],
];
const checks = CHECKS.map(([tick, unit, place, lat, lng, tol, source]) => {
  const b = stateAt(eb, unit, tick), c = stateAt(ea, unit, tick);
  const db = b ? +km(b, { lat, lng }).toFixed(2) : null, dc = c ? +km(c, { lat, lng }).toFixed(2) : null;
  return { tick, unit, expected: place, tolKm: tol, beforeKm: db, afterKm: dc, before: db === null ? 'no row' : db <= tol ? 'ok' : 'off', after: dc === null ? 'no row' : dc <= tol ? 'ok' : 'off', source };
});
const summary = {
  units: Object.keys(UNITS).length, anchors: ticks.length, cells: cells.length, cellsWithUnitOnField: present, cellsChangedByDATA: changed, cellsNewlyOnField: appeared, cellsNoLongerOnField: vanished,
  medianMoveKm: movedKm.length ? +movedKm.sort((a, b) => a - b)[Math.floor(movedKm.length / 2)].toFixed(2) : 0,
  anchorChecks: { n: checks.length, okBefore: checks.filter((c) => c.before === 'ok').length, okAfter: checks.filter((c) => c.after === 'ok').length },
};
fs.writeFileSync(path.join(REPO, 'docs', 'data-audit', 'positions.json'), JSON.stringify({ summary, checks, cells }) + '\n');
console.log(JSON.stringify(summary));
for (const c of checks) console.log(String(c.tick).padStart(3), c.unit.padEnd(12), c.before.padEnd(6), String(c.beforeKm).padStart(5), '->', c.after.padEnd(6), String(c.afterKm).padStart(5), c.expected);
