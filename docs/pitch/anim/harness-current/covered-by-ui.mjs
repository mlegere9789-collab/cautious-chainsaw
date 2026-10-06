// How many tiles sit under panels, popups and controls? Real DOM rects (popup-rects.mjs) x the tiles the shipped routine draws (deterministic model).
import fs from 'node:fs';
import { makeApp } from './sim.mjs';
import { storeFor } from './replay.mjs';
const W = 'C:/Users/mlege/gettysburg-map/tmp/pitch-anim/a1/';
const pbt = storeFor('r1c').pbt;
const classify = (r) => {
  const t = r.txt;
  if (r.tag === 'A') return null;                       // skip links are off screen
  if (+r.z <= 10 || r.z === 'auto') return null;        // below the unit canvas (z 10) or plain wrappers
  if (r.w >= 1430 && r.y < 50) return null;             // toolbar (above the canvas box)
  if (r.w >= 1430 && r.h >= 800) return null;
  if (/^Disposition Sides Size/.test(t) || /Union Confed/.test(t)) return 'legend';
  if (/OVERVIEW/.test(t)) return 'overview';
  if (/^July \d, 1863/.test(t)) return 'HUD clock';
  if (/min read|Dismiss/.test(t)) return 'vignette card';
  if (/CRITICAL|HIGH|MEDIUM/.test(t)) return 'event card';
  if (/Command change|wounded|KIA|captured|mortally|killed/i.test(t)) return 'commander toasts';
  if (r.y >= 770 && r.w >= 1430) return 'timeline dock';
  if (/Auto Tour/.test(t)) return 'tour button';
  if (/Trails/.test(t)) return 'trails button';
  if (/Ask the Historian/.test(t)) return 'Ask the Historian / Extra Features';
  if (/Command change|\u21d2/.test(t)) return 'commander toasts';
  if (/^[CU] /.test(t) || /Commander|Facing/.test(t)) return 'unit panel';
  return 'other overlay';
};
function analyse(label, tick, camera, rectsDump, W_, H_) {
  const app = makeApp('r1c', { pbt, W: W_, H: H_, center: camera.center, zoom: camera.zoom });
  app.drawStill(tick);
  const fr = app.ctx.frames[app.ctx.frames.length - 1];
  const canvasY = rectsDump.canvas ? rectsDump.canvas[1] : 48;
  const over = rectsDump.rects.map((r) => ({ ...r, kind: classify(r) })).filter((r) => r.kind);
  const hit = (px, py) => { for (const r of over) if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) return r.kind; return null; };
  const per = {}; let centreCovered = 0, over50 = 0, anyCovered = 0; const kinds = {};
  fr.tiles.forEach((t, i) => {
    const a = (t.ang * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a); let n = 0, k = 0; const byKind = {};
    const nu = Math.max(2, Math.round(t.w / 2)), nv = Math.max(2, Math.round(Math.max(t.h, 2) / 2));
    for (let u = 0; u < nu; u++) for (let v = 0; v < nv; v++) { const lx = -t.w / 2 + ((u + 0.5) / nu) * t.w, ly = -Math.max(t.h, 2) / 2 + ((v + 0.5) / nv) * Math.max(t.h, 2); const px = t.x + lx * c - ly * s, py = t.y + lx * s + ly * c + canvasY; n++; const kd = hit(px, py); if (kd) { k++; byKind[kd] = (byKind[kd] || 0) + 1; } }
    const cc = hit(t.x, t.y + canvasY);
    if (cc) { centreCovered++; kinds[cc] = (kinds[cc] || 0) + 1; }
    if (k / n >= 0.5) over50++; if (k > 0) anyCovered++;
  });
  const area = (r) => r.w * r.h; const canvasArea = W_ * H_;
  // share of canvas covered by the union of overlays (rasterised at 4 px)
  let cov = 0, tot = 0; for (let x = 0; x < W_; x += 4) for (let y = 0; y < H_; y += 4) { tot++; if (hit(x, y + canvasY)) cov++; }
  return { state: label, tick, camera, tilesDrawnInView: fr.tiles.length, tileCentreUnderAnOverlay: centreCovered, tilesAtLeast50PercentUnderOverlays: over50, tilesPartlyUnderOverlays: anyCovered, centreUnderBy: kinds, canvasShareCoveredByOverlays: +(cov / tot).toFixed(3), overlays: over.map((r) => `${r.kind} ${r.w}x${r.h}@${r.x},${r.y} z${r.z}`) };
}
const out = [];
const defaultCam = { center: [-77.235, 39.812], zoom: 13.5 };
for (const build of ['baseline', 'r1c']) {
  const d = JSON.parse(fs.readFileSync(`${W}popups-${build}-desktop.json`, 'utf8'));
  const sets = [['idle-tick1', 1, defaultCam], ['paused-tick556-vignette-and-event', 556, defaultCam], ['playing-1x-tick548-556-max-toasts', 552, defaultCam], ['unit-selected-tick150-z15', 150, { center: [-77.2455, 39.822], zoom: 15 }]];
  for (const [state, tick, cam] of sets) { if (!d.states[state]) continue; const r = analyse(`${build} desktop ${state}`, tick, cam, d.states[state], 1440, 852); out.push({ build, vp: 'desktop', ...r }); console.log(r.state, 'tiles', r.tilesDrawnInView, 'centre covered', r.tileCentreUnderAnOverlay, '>=50%', r.tilesAtLeast50PercentUnderOverlays, 'canvas share', r.canvasShareCoveredByOverlays); }
  const p = JSON.parse(fs.readFileSync(`${W}popups-${build}-phone.json`, 'utf8'));
  for (const [state, tick] of [['idle-tick1', 1], ['paused-tick556-event', 556], ['paused-tick551-event', 551]]) { if (!p.states[state]) continue; const cv = p.states[state].canvas; const r = analyse(`${build} phone ${state}`, tick, defaultCam, p.states[state], cv ? cv[2] : 390, cv ? cv[3] : 607); out.push({ build, vp: 'phone', ...r }); console.log(r.state, 'tiles', r.tilesDrawnInView, 'centre covered', r.tileCentreUnderAnOverlay, '>=50%', r.tilesAtLeast50PercentUnderOverlays, 'canvas share', r.canvasShareCoveredByOverlays); }
}
fs.writeFileSync(W + 'covered-by-ui.json', JSON.stringify(out, null, 2));
