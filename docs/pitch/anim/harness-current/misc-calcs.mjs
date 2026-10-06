// Small computed facts: engaged (white pulse) tile counts by zoom, hit-flash eligibility, orientation vs bearing, effective min zoom.
import fs from 'node:fs';
import { storeFor } from './replay.mjs';
import { makeApp, mercator } from './sim.mjs';
const pbt = storeFor('r1c').pbt;
const keyTicks = Object.keys(pbt).map(Number).sort((a, b) => a - b);
const out = {};
// carry-forward unit lists per key tick
const carry = new Map(); const state = {};
for (let t = 1; t <= 675; t++) { for (const r of pbt[t] || []) carry.set(r.unit_id, r); if (pbt[t] || t === 1) state[t] = [...carry.values()]; }
// 1. engaged: any Union unit within 40 screen px of any Confederate unit (X4 uses pre-relaxation projected positions)
const center = [-77.235, 39.812];
out.engaged = {};
for (const z of [11, 12, 13, 14, 15, 16, 17, 18]) {
  const proj = mercator(center, z, 1440, 852).project;
  let ticksWithEngaged = 0, maxTiles = 0, sumTiles = 0, ticksEvaluated = 0;
  for (const t of keyTicks) {
    const us = state[t].map((u) => ({ id: u.unit_id, ...proj([u.lng, u.lat]) })).filter((p) => p.x > -200 && p.x < 1640 && p.y > -40 && p.y < 892);
    const U = us.filter((u) => u.id.startsWith('U-')), C = us.filter((u) => u.id.startsWith('C-')); const eng = new Set();
    for (const a of U) for (const b of C) if (Math.hypot(a.x - b.x, a.y - b.y) < 40) { eng.add(a.id); eng.add(b.id); }
    ticksEvaluated++; if (eng.size) ticksWithEngaged++; maxTiles = Math.max(maxTiles, eng.size); sumTiles += eng.size;
  }
  out.engaged['z' + z] = { keyTicksEvaluated: ticksEvaluated, ticksWithEngagedTiles: ticksWithEngaged, maxEngagedTilesInDefaultView: maxTiles, meanEngagedTiles: +(sumTiles / ticksEvaluated).toFixed(2), metersFor40px: +((40 * 40075016.686 * Math.cos((39.812 * Math.PI) / 180)) / (512 * 2 ** z)).toFixed(0) };
}
// 2. hit flash: uF compares rows at tick H and the new tick for the same unit; only adjacent-tick rows can flash when stepping one tick
const units = {}; for (let t = 1; t <= 675; t++) for (const r of pbt[t] || []) (units[r.unit_id] ||= {})[t] = r;
let adjPairs = 0, drops = 0, anyGapDrops = 0, anyGapPairs = 0;
for (const a of Object.values(units)) { const ts = Object.keys(a).map(Number).sort((x, y) => x - y); for (let i = 1; i < ts.length; i++) { const p = a[ts[i - 1]], q = a[ts[i]]; anyGapPairs++; if (q.strength < p.strength) anyGapDrops++; if (ts[i] - ts[i - 1] === 1) { adjPairs++; if (q.strength < p.strength) drops++; } } }
out.hitFlash = { rule: 'uF flags a unit when its row at the new tick has lower strength than its row at the previous tick (Qx = now + 1000 ms); both rows must exist', adjacentTickPairs: adjPairs, adjacentPairsWithStrengthDrop: drops, allKeyframePairs: anyGapPairs, allKeyframePairsWithStrengthDrop: anyGapDrops, note: 'with a 1-tick step only the adjacent pairs can flash; at 2x and faster the app jumps several ticks per frame and compares rows at those two ticks only' };
// 3. orientation: the draw rotation is (bearing - 90) deg; long axis parallel to bearing
const app = makeApp('r1c', { pbt, W: 400000, H: 400000, center, zoom: 17 }); app.drawStill(538);
const fr = app.ctx.frames[app.ctx.frames.length - 1]; const us = app.api.getLastY1();
let ok = 0, n = 0; us.forEach((u, i) => { const t = fr.tiles[i]; if (!t) return; n++; const exp = (((u.bearing || 0) - 90) % 360 + 360) % 360; const got = ((t.ang % 360) + 360) % 360; if (Math.abs(exp - got) < 0.05 || Math.abs(Math.abs(exp - got) - 360) < 0.05) ok++; });
out.orientation = { checkedTiles: n, tileAngleEqualsBearingMinus90: ok, consequence: 'long axis of every filled tile is parallel to the facing direction; placement_schema.json says Line of Battle extends perpendicular to bearing', schemaText: 'Line of Battle extends perpendicular to bearing.' };
// 4. effective minimum zoom: maxBounds [[-77.36,39.72],[-77.12,39.91]] vs viewport width
const worldPx = (z) => 512 * 2 ** z; const lngSpan = 0.24; const eff = (w) => Math.log2((w * 360) / (lngSpan * 512));
out.effectiveMinZoomFromMaxBounds = { desktop_1440_wide: +eff(1440).toFixed(2), phone_390_wide: +Math.max(11, eff(390)).toFixed(2), note: 'jumpTo zoom 11 on the 1440 px desktop was measured to land at 12.04; minZoom 11 is only reachable on narrow screens' };
fs.writeFileSync('C:/Users/mlege/gettysburg-map/tmp/pitch-anim/a1/misc-calcs.json', JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 1));
