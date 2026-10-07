// tools/probes/select-motion.mjs - after a mark is SELECTED, how much does anything still move, and for how long?  Headless engine, the final dials and skin, the mark nearest the middle of the view
// selected at three ticks x seven zooms; for each: frames until the largest one-frame step of any mark falls under 0.05 px for good, that largest step in the first 60 frames, and the
// largest step after frame 300 (a perceptible step is about 0.25 px; below 0.05 px nothing is visible).   node tools/probes/select-motion.mjs
import { makeEngine } from '../../src/headless.mjs';
import { SKINS } from '../../src/skins/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const rows = [];
for (const tick of [620, 346, 551]) for (const zoom of [11, 12, 13, 13.5, 14, 15, 16.5]) {
  const e = makeEngine({ start: { tick, lat: 39.8117, lng: -77.2347, zoom }, settings: { 'camera.zoom': zoom, 'popup.enabled': false } }); e.setViewport(1440, 900);
  for (const s of SKINS) e.kernel.skins.register(s.id, s, { replace: true }); e.tuning.set('skin.id', 'quiet-cartographer');
  for (let i = 0; i < 400; i++) { e.step(1000 / 60); if (!e.busy() && i > 30) break; }
  const f = e.frame; const c = f.tiles.filter((t) => t.kind === 'leaf' && t.solid).sort((a, b) => Math.hypot(a.x + f.view.dx - 720, a.y + f.view.dy - 450) - Math.hypot(b.x + f.view.dx - 720, b.y + f.view.dy - 450))[0]; if (!c) continue;
  let prev = new Map(f.tiles.map((t) => [t.key, [t.x, t.y]])); e.select(c.ids[0]); const steps = []; let moved = 0; let tilesMoved = new Set();
  for (let i = 0; i < 900; i++) { const g = e.step(1000 / 60); let m = 0; for (const t of g.tiles) { const p = prev.get(t.key); if (p) { const d = Math.hypot(t.x - p[0], t.y - p[1]); if (d > m) m = d; if (d > 0.25) tilesMoved.add(t.key); } prev.set(t.key, [t.x, t.y]); } steps.push(m); }
  let lastBig = -1; for (let i = 0; i < steps.length; i++) if (steps[i] >= 0.05) lastBig = i;
  rows.push({ tick, zoom, firstSecondMax: +Math.max(...steps.slice(0, 60)).toFixed(2), after300Max: +Math.max(0, ...steps.slice(300)).toFixed(3), lastFrameAbove005: lastBig, marksThatMovedOverQuarterPx: tilesMoved.size });
  console.log(JSON.stringify(rows.at(-1)));
}
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'results', 'select-motion.json'); fs.mkdirSync(path.dirname(OUT), { recursive: true }); fs.writeFileSync(OUT, JSON.stringify({ generated: new Date().toISOString(), selectGrowZoom: 'detail.selectGrowZoom', rows }, null, 1));
const quiet = rows.filter((r) => r.lastFrameAbove005 < 300).length; console.log(`${rows.length} views; all motion above 0.05 px over by frame 300 in ${quiet}; worst step after frame 300: ${Math.max(...rows.map((r) => r.after300Max))} px`);
