// Geographic density hotspots (zoom independent): for every displayed state (carry-forward) count units within R metres of each unit; name the place
// with the nearest key location of data/terrain.json (the site's own gazetteer).
import fs from 'node:fs';
import { storeFor } from './replay.mjs';
const pbt = storeFor('r1c').pbt;
const T = JSON.parse(fs.readFileSync('C:/Users/mlege/gettysburg-map/baseline/dist/data/terrain.json', 'utf8'));
const places = T.key_locations.map((k) => ({ name: k.name, lat: k.lat, lng: k.lng }));
const mLat = 111320; const mLng = (lat) => 111320 * Math.cos((lat * Math.PI) / 180);
const d = (a, b) => Math.hypot((a.lat - b.lat) * mLat, (a.lng - b.lng) * mLng(a.lat));
const nearest = (p) => { let best = null, bd = 1e12; for (const k of places) { const x = d(p, k); if (x < bd) { bd = x; best = k; } } return { name: best.name, meters: Math.round(bd) }; };
const keyTicks = Object.keys(pbt).map(Number).sort((a, b) => a - b);
const carry = new Map(); const perTick = {};
let ti = 0;
for (let t = 1; t <= 675; t++) { for (const r of pbt[t] || []) carry.set(r.unit_id, r); perTick[t] = null; if (pbt[t] || t === 1) perTick[t] = [...carry.values()]; }
const FRESH = 12;
const R = 150;
const rows = [];
for (const t of keyTicks) {
  const us = perTick[t]; let best = { n: 0 };
  for (const u of us) { let n = 0; for (const v of us) if (d(u, v) <= R) n++; if (n > best.n) best = { n, lat: u.lat, lng: u.lng }; }
  const fresh = us.filter((u) => t - u.tick <= FRESH); let bf = { n: 0 };
  for (const u of fresh) { let n = 0; for (const v of fresh) if (d(u, v) <= R) n++; if (n > bf.n) bf = { n, lat: u.lat, lng: u.lng }; }
  rows.push({ tick: t, unitsShown: us.length, freshUnits: fresh.length, densest150m: best.n, lat: best.lat, lng: best.lng, ...nearest(best), densestFresh150m: bf.n, freshPlace: bf.n ? nearest(bf) : null });
}
rows.sort((a, b) => b.densest150m - a.densest150m);
// de-duplicate by place keeping the densest tick per place
const seen = new Set(); const top = [];
for (const r of rows) { if (seen.has(r.name)) continue; seen.add(r.name); top.push(r); if (top.length >= 12) break; }
const topFresh = [...rows].sort((a, b) => b.densestFresh150m - a.densestFresh150m).slice(0, 10).map((r) => ({ tick: r.tick, freshUnitsWithin150m: r.densestFresh150m, place: r.freshPlace && r.freshPlace.name, meters: r.freshPlace && r.freshPlace.meters, unitsFreshShown: r.freshUnits }));
const out = { freshDefinition: 'units whose latest keyframe is at most 12 ticks (1 h) old', topFresh, radiusM: R, note: 'units shown = carry-forward state at that tick (each unit at its latest keyframe at or before the tick); place = nearest key location in data/terrain.json', topPerPlace: top, topTicks: rows.slice(0, 10) };
fs.writeFileSync('C:/Users/mlege/gettysburg-map/tmp/pitch-anim/a1/hotspots.json', JSON.stringify(out, null, 2));
console.log(JSON.stringify(out.topPerPlace.map((r) => `tick ${r.tick}: ${r.densest150m} units within ${R} m near ${r.name} (${r.meters} m)`), null, 1));
