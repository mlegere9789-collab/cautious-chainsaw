#!/usr/bin/env node
// Plan of the "rejoin" rows of the DATA group (read by fixes/zrejoin.mjs).
//   node tools/t0/data/rejoin.mjs <built data dir> [limit km]      e.g. tmp/data-audit/data-R1c/dist/data   (a DATA build WITHOUT zrejoin: python tools/t0/data/data_build.py ... --skip-rejoin)
//
// Fact about the engine (index chunk, function y1): a unit with no row at a tick keeps its last state, so a regiment whose last recorded row is an action
// (e.g. the 2nd Wisconsin in Herbst Woods at tick 29) stays there to the end of the battle while its brigade moves on.  The sources put the regiments back with their brigades
// (Wadsworth OR 27/1 p.266: the division occupied Culp's Hill that evening; Howard p.696: the Eleventh Corps fell back to Cemetery Hill; Schurz; Doubleday), so for each
// regiment whose last row is farther than LIMIT km from its brigade at a later brigade row, the plan adds a row at that brigade row's tick at the brigade's position (the
// regiment's own last offset from its brigade kept, at most 150 m) and the note says so.  Brigades are not moved onto their divisions: their later places are not documented.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..', '..');
const dir = path.resolve(REPO, process.argv[2] || 'tmp/data-audit/data-R1c/dist/data');
const LIM = +(process.argv[3] || 1.2);
const OUT = path.join(HERE, 'rejoin-plan.json');

const tF = { 1: ['placements_day1_ticks1_50', 'placements_day1_ticks51_100', 'placements_day1_ticks101_225'], 2: ['placements_day2_ticks226_300', 'placements_day2_ticks301_375', 'placements_day2_ticks376_450'], 3: ['placements_day3_ticks451_520', 'placements_day3_ticks521_600', 'placements_day3_ticks601_675'] };
const src = fs.readFileSync(path.join(REPO, 'baseline', 'dist', 'assets', 'index-Cg8FAMXN.js'), 'utf8');
const nFm = /nF=\{1:\[([^\]]*)\],2:\[([^\]]*)\],3:\[([^\]]*)\]\}/.exec(src);
const order = [];
for (let d = 1; d <= 3; d++) order.push(...tF[d], ...[...nFm[d].matchAll(/"([^"]+)\.json"/g)].map((m) => m[1]));
const rad = (d) => d * Math.PI / 180;
const km = (a, b) => { const R = 6371, dl = rad(b.lat - a.lat), dg = rad(b.lng - a.lng); const x = Math.sin(dl / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dg / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); };
const LINE = /^\s*\{"unit_id":"([^"]+)","tick":(\d+),"lat":([\d.-]+),"lng":([\d.-]+)(.*)/;
const eff = {};
for (const f of order) {
  const p = path.join(dir, f + '.json'); if (!fs.existsSync(p)) continue;
  for (const l of fs.readFileSync(p, 'utf8').split('\n')) {
    const m = LINE.exec(l); if (!m || l.includes('Shown with its brigade: no later position')) continue;
    const st = /"strength":(\d+)/.exec(m[5]); const d = /"disposition":"([^"]*)"/.exec(m[5]);
    (eff[m[1]] ||= {})[+m[2]] = { tick: +m[2], lat: +m[3], lng: +m[4], f, disp: d ? d[1] : '', strength: st ? +st[1] : undefined };
  }
}
const par = new Map();
for (const f of fs.readdirSync(path.join(dir, 'oob'))) {
  const j = JSON.parse(fs.readFileSync(path.join(dir, 'oob', f), 'utf8'));
  (function w(o) { if (Array.isArray(o)) o.forEach(w); else if (o && typeof o === 'object') { if (o.regiment_id && o.parent_brigade_id) par.set(o.regiment_id, o.parent_brigade_id); Object.values(o).forEach(w); } })(j);
}
const posAt = (u, t) => { const x = eff[u]; if (!x) return null; const ks = Object.keys(x).map(Number).sort((a, b) => a - b); let lo = null, hi = null; for (const k of ks) { if (k <= t) lo = k; if (k >= t && hi === null) hi = k; } if (lo === null) return null; if (hi === null || hi === lo) return x[lo]; const f = (t - lo) / (hi - lo); return { lat: x[lo].lat + (x[hi].lat - x[lo].lat) * f, lng: x[lo].lng + (x[hi].lng - x[lo].lng) * f }; };
const CLIP = 0.0015;
// tick -> minutes on the corrected clock (anchors of data-src/time/time_anchors.json, linear between them); a row that would make the regiment cover more than 8 km/h is not planned
const A = JSON.parse(fs.readFileSync(path.join(REPO, 'data-src', 'time', 'time_anchors.json'), 'utf8')).anchors.map((a) => ({ tick: a.tick, m: Date.parse(a.t + 'Z') / 60000 }));
const mins = (t) => { if (t <= A[0].tick) return A[0].m - (A[0].tick - t) * 13; for (let i = 1; i < A.length; i++) if (t <= A[i].tick) { const a = A[i - 1], b = A[i]; return a.m + (b.m - a.m) * (t - a.tick) / (b.tick - a.tick); } return A[A.length - 1].m + (t - A[A.length - 1].tick) * 13; };
const SPEED = 8;
const plan = [];
for (const [u, t] of Object.entries(eff)) {
  const p = par.get(u); if (!p || !eff[p]) continue;
  const ticks = Object.keys(t).map(Number).sort((a, b) => a - b);
  const lastT = ticks[ticks.length - 1]; if (lastT >= 640) continue;
  const last = t[lastT];
  const pl = posAt(p, lastT);
  let off = pl ? { lat: last.lat - pl.lat, lng: last.lng - pl.lng } : { lat: 0, lng: 0 };
  const len = Math.hypot(off.lat, off.lng);
  if (len > CLIP) off = { lat: off.lat / len * CLIP, lng: off.lng / len * CLIP };
  let cur = last;
  for (const k of Object.keys(eff[p]).map(Number).sort((a, b) => a - b).filter((x) => x > lastT)) {
    const b = eff[p][k];
    if (km(cur, b) > LIM) {
      const hrs = (mins(k) - mins(cur.tick ?? lastT)) / 60;
      if (hrs <= 0 || km(cur, b) / hrs > SPEED) continue;
      const row = { unit: u, parent: p, tick: k, lat: +(b.lat + off.lat).toFixed(4), lng: +(b.lng + off.lng).toFixed(4), disposition: b.disp, strength: last.strength };
      plan.push(row); cur = { lat: row.lat, lng: row.lng, tick: k };
    }
  }
}
fs.writeFileSync(OUT, JSON.stringify(plan, null, 1) + '\n');
console.log('wrote', path.relative(REPO, OUT), plan.length, 'rows for', new Set(plan.map((r) => r.unit)).size, 'regiments (limit', LIM, 'km)');
