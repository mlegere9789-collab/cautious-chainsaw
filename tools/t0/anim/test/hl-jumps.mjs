import { make } from './headless.mjs';
const [zoom, tick0, speed, sec, dmax] = [+process.argv[2]||13.5, +process.argv[3]||295, +process.argv[4]||4, +process.argv[5]||10, +(process.argv[6] ?? 56)];
const E = make({ 'layout.dMaxPx': dmax, 'layout.continuityPx': +(process.argv[7] ?? 3) }); const cam = { lng: -77.2377, lat: 39.8206 - 0.003, zoom, w: 1440, h: 800 };
let tau = tick0; const dt = 1000 / 60; let prev = new Map(); const ev = [];
for (let i = 0; i < sec * 60; i++) { tau += speed * 2 * dt / 1000; const F = E.step({ dtMs: dt, tau, cam });
  const cur = new Map(); for (const t of F.tiles) if (t.life === 'live') cur.set(t.ids.join(','), t);
  for (const [k, t] of cur) { const p = prev.get(k); if (!p) continue; const st = Math.hypot(t.x - p.x - 0, t.y - p.y); const stTrue = Math.hypot(t.ax - p.ax, t.ay - p.ay); const ex = Math.abs(st - stTrue); if (st > 8 && st > 3 * stTrue + 6) ev.push({ f: i, k: k.slice(0, 28), kind: t.kind, n: t.n, st: +st.toFixed(1), stTrue: +stTrue.toFixed(1), off: [+t.ox.toFixed(1), +t.oy.toFixed(1)], snaps: F.stats.netSnaps, full: F.stats.fullSnaps||0, sw: F.stats.swaps, w: [p.w, t.w] }); }
  prev = cur; }
console.log(ev.length); for (const e of ev.slice(0, 40)) console.log(JSON.stringify(e));
