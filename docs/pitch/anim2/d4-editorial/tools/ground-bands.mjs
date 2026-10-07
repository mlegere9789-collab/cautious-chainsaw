// tools/ground-bands.mjs - what the marks stand on: the real backdrop is rendered WITHOUT any mark (the backdrop's own draw into a blank canvas) for three scenes and three zooms in the paper and the
// aerial looks, and seven colours are read from it by luminance percentile (2, 10, 25, 50, 75, 90, 98).  tools/contrast-tests.mjs checks every mark colour against them.
//   node tools/ground-bands.mjs    -> results/ground-bands.json
import fs from 'node:fs';
import path from 'node:path';
import { serve, launch, open, ROOT } from './lib.mjs';
function inPage(backdropId) {
  const S = window.__studio; const E = S.engine; const be = E.kernel.backdrops.get(backdropId); const W = 1440; const H = 900; const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d', { willReadFrequently: true });
  const b = globalThis.__realBackdrop; return b.whenIdle(30000).then(() => {
    be.draw(c, { w: W, h: H, camera: E.camera, mpp: E.camera.mpp(), toScreen: (lng, lat) => E.camera.toScreen(lng, lat) }, E.battle, E.tok);
    return b.whenIdle(30000).then(() => {
      be.draw(c, { w: W, h: H, camera: E.camera, mpp: E.camera.mpp(), toScreen: (lng, lat) => E.camera.toScreen(lng, lat) }, E.battle, E.tok);
      const d = c.getImageData(0, 0, W, H).data; const px = []; for (let i = 0; i < d.length; i += 4 * 7) { const r = d[i]; const g = d[i + 1]; const bl = d[i + 2]; const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; px.push([0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(bl), r, g, bl]); }
      px.sort((p, q) => p[0] - q[0]); const hex = (p) => '#' + [p[1], p[2], p[3]].map((v) => v.toString(16).padStart(2, '0')).join('');
      return [2, 10, 25, 50, 75, 90, 98].map((q) => hex(px[Math.min(px.length - 1, Math.floor(px.length * q / 100))]));
    });
  });
}
const srv = await serve(); const b = await launch({ dpr: 1 }); const out = [];
try {
  for (const [look, style] of [['real-paper', 'dispatch-paper'], ['real-dim', 'dispatch-aerial']]) for (const [scene, zoom] of [['fresh2', 15.5], ['carry1', 15], ['carry2', 16.5], ['field', 13.5]]) {
    await open(b.page, `scene=${scene}&zoom=${zoom}&style=${style}&set=${encodeURIComponent(JSON.stringify({ 'popup.enabled': false }))}`, { steps: 40 });
    const bands = await b.page.evaluate(inPage, look); out.push({ look, scene, zoom, bands }); console.log(look, scene, zoom, bands.join(' '));
  }
} finally { await b.close(); srv.close(); }
fs.writeFileSync(path.join(ROOT, 'results', 'ground-bands.json'), JSON.stringify(out, null, 1));
