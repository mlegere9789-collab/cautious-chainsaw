// tools/skin-ink.mjs - THE PIXEL TRUTH OF THE FOOTPRINT: every tile of real frames is drawn ALONE by the skin's own draw.tile (and draw.label, draw.pin) onto a blank canvas at device-pixel ratio 2,
// and the bounding box of what was painted (alpha above 8/255) is compared with the box the layout reserved: the tile's box (+0.5 px for anti-aliasing), the name inside the tile's box plus
// its label rectangle, the pin inside the pin box.  Zero-overlap in the layout is a statement about those boxes; this is the check that the ink stays in them.  States drawn: at rest, hovered,
// selected, arriving (scale 0.9, entering), with the name grown.
//   node tools/skin-ink.mjs    -> results/skin-ink.json
import fs from 'node:fs';
import path from 'node:path';
import { serve, launch, open, ROOT } from './lib.mjs';

const SCENES = [['scene=fresh2&tick=551&zoom=15.5', 'The Angle, z15.5'], ['scene=carry1&tick=295&zoom=15', 'Wheatfield, z15'], ['scene=field&tick=556&zoom=13.5', 'whole field, z13.5'], ['scene=fresh2&tick=556&zoom=16.5', 'The Angle, z16.5'], ['scene=carry2&tick=346&zoom=17&style=dispatch-aerial', 'Cemetery Hill, z17, dark family']];
function inPage() {
  const S = window.__studio; const E = S.engine; const f = E.frame; const skin = E.kernel.skins.get(E.tok('skin.id')); const spec = f.spec; const dpr = 2; const res = { tiles: 0, states: 0, over: [], labels: 0, labelOver: [], pins: 0, pinOver: [], maxOver: 0, worst: null };
  const cv = document.createElement('canvas'); const W = 520; const H = 120; cv.width = W * dpr; cv.height = H * dpr; const c = cv.getContext('2d', { willReadFrequently: true });
  const bbox = () => { const d = c.getImageData(0, 0, cv.width, cv.height).data; let x0 = 1e9; let y0 = 1e9; let x1 = -1; let y1 = -1; for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) if (d[(y * cv.width + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } return x1 < 0 ? null : { x0: x0 / dpr - W / 2, y0: y0 / dpr - H / 2, x1: (x1 + 1) / dpr - W / 2, y1: (y1 + 1) / dpr - H / 2 }; };
  const env = () => ({ dpr, zoom: f.zoom, timeMs: 0, tok: E.tok, spec, data: null, camera: E.camera, size: [W, H], places: null, toScreen: () => [0, 0] });
  const draw = (fn) => { c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, cv.width, cv.height); c.setTransform(dpr, 0, 0, dpr, dpr * W / 2, dpr * H / 2); c.globalAlpha = 1; fn(); c.setTransform(1, 0, 0, 1, 0, 0); };
  const tiles = f.tiles.filter((t) => t.life === 'live' && t.w < W - 20);
  const seenCombo = new Set(); const pick = [];
  for (const t of tiles) { const k = [t.kind, t.side, t.arm, t.unit ? t.unit.kind : t.nameKind, Math.round(t.w / 6), t.displaced ? 1 : 0, t.label ? 1 : 0].join('|'); if (seenCombo.has(k) && pick.length > 90) continue; seenCombo.add(k); pick.push(t); }
    for (const t0 of pick) {
    res.tiles++;
    for (const state of ['rest', 'hover', 'selected', 'arriving']) {
      const t = { ...t0, x: 0, y: 0, label: state === 'rest' ? t0.label : t0.label, selected: state === 'selected', solid: true, entering: state === 'arriving', scale: state === 'arriving' ? 0.9 : 1, opacity: 1 };
      window.__skinKit.setHover(state === 'hover' ? t.key : null);
      let bb = null; for (let i = 0; i < 44; i++) { const e = env(); draw(() => { skin.draw.tile(c, t, e); }); if (i === 43) bb = bbox(); }
      res.states++; if (bb) { const w = t.w; const h = t.h; const over = Math.max(-w / 2 - bb.x0, bb.x1 - w / 2, -h / 2 - bb.y0, bb.y1 - h / 2); if (over > res.maxOver) { res.maxOver = over; res.worst = { key: t0.short, state, over: +over.toFixed(2), box: [w, h], ink: [bb.x0, bb.y0, bb.x1, bb.y1].map((v) => +v.toFixed(1)) }; } if (over > 0.5) res.over.push({ key: t0.short, state, over: +over.toFixed(2) }); }
    }
    window.__skinKit.setHover(null);
    if (t0.label) {                                                                                      // the grown name: inside the tile's box plus its label rectangle (both are this tile's own ground)
      res.labels++; const L = t0.label; const cx = t0.x; const cy = t0.y; const t = { ...t0, solid: true };
      draw(() => { c.translate(L.x0 - cx, L.y0 - cy); skin.draw.label(c, t, env()); }); const bb = bbox();       // the canvas centre is the tile centre, so bb is relative to it
      if (bb) { const rx0 = -t.w / 2; const rx1 = L.x1 - cx; const ry0 = Math.min(-t.h / 2, L.y0 - cy); const ry1 = Math.max(t.h / 2, L.y1 - cy); const o = Math.max(rx0 - bb.x0, bb.x1 - rx1, ry0 - bb.y0, bb.y1 - ry1, 0); if (o > 0.5) res.labelOver.push({ key: t0.short, over: +o.toFixed(2) }); res.maxLabelOver = Math.max(res.maxLabelOver || 0, o); }
    }
    if (t0.displaced && skin.draw.pin) {
      res.pins++; const t = { ...t0, solid: true }; draw(() => { skin.draw.pin(c, t, env()); }); const bb = bbox(); if (bb) { const h = spec.pinHalf; const o = Math.max(-h - bb.x0, bb.x1 - h, -h - bb.y0, bb.y1 - h, 0); if (o > 0.5) res.pinOver.push({ key: t0.short, over: +o.toFixed(2) }); }
    }
  }
  return res;
}
const srv = await serve(); const b = await launch({ dpr: 2 }); const out = [];
try {
  for (const [q, name] of SCENES) {
    await open(b.page, q + '&set=' + encodeURIComponent(JSON.stringify({ 'popup.enabled': false })), { steps: 120 });
    const r = await b.page.evaluate(inPage); out.push({ scene: name, ...r }); console.log(name, JSON.stringify({ tiles: r.tiles, states: r.states, tileOverBy0p5: r.over.length, maxOver: +r.maxOver.toFixed(2), worst: r.worst, labels: r.labels, labelOver: r.labelOver.length, pins: r.pins, pinOver: r.pinOver.length }));
  }
  if (b.errors.length) console.log('errors', b.errors.slice(0, 5));
} finally { await b.close(); srv.close(); }
fs.mkdirSync(path.join(ROOT, 'results'), { recursive: true }); fs.writeFileSync(path.join(ROOT, 'results', 'skin-ink.json'), JSON.stringify({ tolerancePx: 0.5, scenes: out }, null, 1));
