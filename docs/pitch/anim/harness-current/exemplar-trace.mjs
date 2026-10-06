import { makeApp, mercator } from './sim.mjs';
import { storeFor } from './replay.mjs';
const pbt = storeFor('r1c').pbt;
// adjacent pairs with the largest displacement
const units = {}; for (let t = 1; t <= 675; t++) for (const r of pbt[t] || []) (units[r.unit_id] ||= {})[t] = r;
const pairs = []; for (const [id, a] of Object.entries(units)) for (const t of Object.keys(a).map(Number)) if (a[t + 1]) { const d = Math.hypot((a[t + 1].lat - a[t].lat) * 111320, (a[t + 1].lng - a[t].lng) * 85000); pairs.push({ id, t, d }); }
pairs.sort((x, y) => y.d - x.d); console.log('adjacent pairs', pairs.length, 'largest', JSON.stringify(pairs.slice(0, 5)));
const P = pairs.find((p) => p.d > 150 && p.t > 300) || pairs[0]; console.log('using', JSON.stringify(P), 'disposition', units[P.id][P.t].disposition);
const center = [(units[P.id][P.t].lng + units[P.id][P.t + 1].lng) / 2, (units[P.id][P.t].lat + units[P.id][P.t + 1].lat) / 2];
const app = makeApp('r1c', { pbt, W: 1440, H: 852, center, zoom: 15, tick: P.t - 1, speed: 1 });
app.drawStill(P.t - 1); app.state.isPlaying = true; app.start();
const proj = mercator(center, 15, 1440, 852).project;
let t = 0; const rows = [];
for (let i = 0; i < 100; i++) { app.step(t); t += 16.667; const u = app.api.getLastY1().find((x) => x.unit_id === P.id); const p = u ? proj([u.lng, u.lat]) : null; const [f, x] = app.api.getLastArgs(); rows.push(`${i} tick=${app.state.currentTick} y1(f=${f},x=${x.toFixed(3)}) pos=${p ? p.x.toFixed(1) + ',' + p.y.toFixed(1) : '-'}`); }
// print around the boundaries
rows.forEach((r, i) => { if (i < 3 || (i > 26 && i < 36) || (i > 56 && i < 66)) console.log(r); });
import fs from 'node:fs';
const series = []; 
{ // collect full structured series again
  const app2 = makeApp('r1c', { pbt, W: 1440, H: 852, center, zoom: 15, tick: P.t - 1, speed: 1 });
  app2.drawStill(P.t - 1); app2.state.isPlaying = true; app2.start(); let tt = 0;
  for (let i = 0; i < 100; i++) { app2.step(tt); tt += 16.667; const u = app2.api.getLastY1().find((x) => x.unit_id === P.id); const p = u ? proj([u.lng, u.lat]) : null; const [f, x] = app2.api.getLastArgs(); series.push({ frame: i, tMs: +tt.toFixed(1), appTick: app2.state.currentTick, y1Tick: f, fraction: +x.toFixed(3), x: p ? +p.x.toFixed(1) : null, y: p ? +p.y.toFixed(1) : null }); }
}
const steps = series.map((s, i) => (i ? Math.hypot(s.x - series[i - 1].x, s.y - series[i - 1].y) : 0));
fs.writeFileSync('exemplar-trace.json', JSON.stringify({ unit: P.id, pair: [P.t, P.t + 1], disposition: units[P.id][P.t].disposition, easing: 'Charging Line uses ease-in x^2 (B4)', zoom: 15, speed: '1x', fps: 60, series, stepsPx: steps.map((v) => +v.toFixed(1)) }, null, 1));
console.log('saved; max step', Math.max(...steps).toFixed(0));
