// Label text / presence changes during playback at z17 and z16.5 around The Angle (few tiles in view, so the exact draw replay is cheap).
import fs from 'node:fs';
import { replay, SPEED } from './replay.mjs';
const run1x = JSON.parse(fs.readFileSync('runs-r1c-timing-desktop.json', 'utf8')).runs.find((r) => r.label === 'timing-1x-dense-z13.5');
const stamps = run1x.draws.map((d) => d.raf).slice(0, 600);
const out = [];
for (const [zoom, name] of [[17, 'z17'], [16.5, 'z16.5'], [15, 'z15']]) {
  const run = { frames: stamps.map((raf) => ({ raf })), start: 548, speed: '1x', center: [-77.2364, 39.81343], zoom };
  const { sim } = replay('r1c', run, { collect: true });
  // track labels by unit id: replicate alignment (in-view culling)
  let changes = 0, appear = 0, vanish = 0, frames = 0, unitSeconds = 0; const perUnitChanges = {}; let prev = null; const changed = new Set();
  sim.forEach((s, i) => {
    const cur = new Map(); let k = 0;
    for (const u of s.y1) { const x = s.tiles; }
    // alignment: labels and tiles are in y1 order restricted to in-view units; recompute with the same projection
    const W = 1440, H = 852; const sc = 512 * 2 ** zoom; const fx = (lng) => ((lng + 180) / 360) * sc, fy = (lat) => (0.5 - Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) / (2 * Math.PI)) * sc;
    const cx = fx(run.center[0]), cy = fy(run.center[1]);
    for (const u of s.y1) { const px = W / 2 + fx(u.lng) - cx, py = H / 2 + fy(u.lat) - cy; if (px > -200 && px < W + 200 && py > -40 && py < H + 40) { const l = s.labels[k++]; cur.set(u.unit_id, l ? l.text : null); } }
    if (prev) { const dt = (s.raf - sim[i - 1].raf) / 1000; unitSeconds += cur.size * dt; for (const [id, t] of cur) { if (!prev.has(id)) { appear++; continue; } if (prev.get(id) !== t) { changes++; changed.add(id); perUnitChanges[id] = (perUnitChanges[id] || 0) + 1; } } for (const id of prev.keys()) if (!cur.has(id)) vanish++; }
    prev = cur; frames++;
  });
  const seconds = (stamps[stamps.length - 1] - stamps[0]) / 1000;
  const top = Object.entries(perUnitChanges).sort((a, b) => b[1] - a[1]).slice(0, 3);
  out.push({ zoom: name, windowTicks: '548 to ' + sim[sim.length - 1].tick, seconds: +seconds.toFixed(1), labelTextChanges: changes, unitsWhoseLabelTextChanged: changed.size, maxChangesForOneUnit: top[0] ? top[0][1] : 0, example: top[0] ? top[0][0] : null, labelAppearEvents: appear, labelVanishEvents: vanish, changesPerSecond: +(changes / seconds).toFixed(2) });
  console.log(JSON.stringify(out[out.length - 1]));
}
fs.writeFileSync('label-flicker.json', JSON.stringify(out, null, 2));
