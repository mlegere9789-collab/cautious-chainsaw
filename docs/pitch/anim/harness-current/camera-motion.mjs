// Layout stability while the camera moves (paused at tick 556): per-frame change of every tile's relaxation offset (drawn position minus true projected position).
import fs from 'node:fs';
import { makeApp, mercator } from './sim.mjs';
import { storeFor } from './replay.mjs';
const pbt = storeFor('r1c').pbt;
const q = (a, p) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
function run(name, frames, camAt) {
  const app = makeApp('r1c', { pbt, W: 1440, H: 852, center: [-77.235, 39.812], zoom: 13.5 });
  let prev = null; const dOff = [], dPos = [], flips = []; let reorder = 0;
  for (let i = 0; i < frames; i++) {
    const { center, zoom } = camAt(i / (frames - 1)); app.setView(center, zoom);
    app.drawStill(556);
    const fr = app.ctx.frames[app.ctx.frames.length - 1]; const us = app.api.getLastY1(); const pj = mercator(center, zoom, 1440, 852).project;
    const cur = new Map(); let k = 0;
    for (const u of us) { const p = pj([u.lng, u.lat]); if (p.x > -200 && p.x < 1640 && p.y > -40 && p.y < 892) { const t = fr.tiles[k++]; cur.set(u.unit_id, { tx: p.x, ty: p.y, x: t.x, y: t.y }); } }
    if (prev) for (const [id, c] of cur) { const p = prev.get(id); if (!p) continue; const ox = c.x - c.tx, oy = c.y - c.ty, pox = p.x - p.tx, poy = p.y - p.ty; const d = Math.hypot(ox - pox, oy - poy); dOff.push(d); const trueStep = Math.hypot(c.tx - p.tx, c.ty - p.ty), drawStep = Math.hypot(c.x - p.x, c.y - p.y); dPos.push(Math.abs(drawStep - trueStep)); }
    prev = cur;
  }
  const mean = (a) => +(a.reduce((x, y) => x + y, 0) / a.length).toFixed(2);
  return { name, frames, tileFrames: dOff.length, offsetChangePerFramePx: { mean: mean(dOff), p50: +q(dOff, 0.5).toFixed(2), p95: +q(dOff, 0.95).toFixed(2), p99: +q(dOff, 0.99).toFixed(2), max: +Math.max(...dOff).toFixed(1) }, tileFramesWithOffsetJumpOver3px: dOff.filter((d) => d > 3).length, shareOver3px: +(dOff.filter((d) => d > 3).length / dOff.length).toFixed(4), shareOver10px: +(dOff.filter((d) => d > 10).length / dOff.length).toFixed(4) };
}
const out = [];
out.push(run('smooth zoom 13.5 -> 15.0 in 1 s (60 frames) at The Angle', 60, (u) => ({ center: [-77.2364, 39.81343], zoom: 13.5 + 1.5 * u })));
out.push(run('smooth zoom 15.0 -> 13.0 in 1 s (60 frames)', 60, (u) => ({ center: [-77.2364, 39.81343], zoom: 15 - 2 * u })));
out.push(run('pan 300 px in 0.5 s at z14 (30 frames)', 30, (u) => { const s = 512 * 2 ** 14; const dx = (300 * u) / s * 360; return { center: [-77.2364 - dx, 39.81343], zoom: 14 }; }));
fs.writeFileSync('camera-motion.json', JSON.stringify(out, null, 2)); console.log(JSON.stringify(out, null, 1));
