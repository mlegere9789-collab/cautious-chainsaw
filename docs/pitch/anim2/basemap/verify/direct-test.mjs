// verify/direct-test.mjs - the two paint paths of the backdrop: while the camera moves it paints straight into the host's canvas (opts.direct, the default) with 'low' (bilinear) image smoothing,
// at rest it renders once into its frame cache ('high' smoothing) and blits it.  With the same smoothing (opts.quality = 'high') the two must give the same pixels, byte for byte;
// the default moving path (smoothing 'low') is compared with the resting frame and the difference reported.  Four views (zoom 13.5 to 17.2, DPR 1 and 2, four looks).
//   node verify/direct-test.mjs  -> results/direct-test.json
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { serve } from '../tools/serve.mjs';
const HERE = path.dirname(fileURLToPath(import.meta.url)); const BASE = path.resolve(HERE, '..'); const REPO = path.resolve(BASE, '..', '..', '..', '..');
const PORT = 9804; const srv = await serve(PORT);
const ctx = await chromium.launchPersistentContext(path.join(REPO, 'tmp', 'look-dev', 'basemap', 'chrome-profile'), { executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, viewport: { width: 1000, height: 700 }, args: ['--no-first-run'] });
const page = ctx.pages()[0] || await ctx.newPage(); const out = [];
for (const [z, dpr, look, lng, lat] of [[13.5, 1, 'dim', -77.2347, 39.8117], [15, 2, 'natural', -77.2417, 39.7994], [16.5, 1, 'paper', -77.2262, 39.8189], [17.2, 2, 'slate', -77.2347, 39.8117]]) {
  await page.goto(`http://127.0.0.1:${PORT}/demo/index.html?lng=${lng}&lat=${lat}&z=${z}&look=${look}&w=700&h=480&dpr=${dpr}&shot=1`);
  await page.waitForFunction(() => window.__done === true, null, { timeout: 60000 });
  const r = await page.evaluate(async ({ dpr, look }) => {
    const bd = window.__bd, cam = window.__cam, opts = window.__opts; await bd.whenIdle();
    const mk = () => { const c = document.createElement('canvas'); c.width = Math.round(cam.w * dpr); c.height = Math.round(cam.h * dpr); const g = c.getContext('2d'); g.scale(dpr, dpr); return { c, g }; };
    const a = mk(), b = mk();
    bd.sig = ''; bd.draw(a.g, cam, look, { ...opts, direct: true, quality: 'high' });                           // the moving-camera path, same smoothing as the resting frame
    bd.sig = ''; bd.draw(b.g, cam, look, { ...opts, direct: false });                                           // the resting path (frame cache, then a blit)
    const da = a.g.getImageData(0, 0, a.c.width, a.c.height).data, db = b.g.getImageData(0, 0, b.c.width, b.c.height).data; let diff = 0, max = 0;
    for (let i = 0; i < da.length; i++) { const d = Math.abs(da[i] - db[i]); if (d) { diff++; if (d > max) max = d; } }
    const m = mk(); bd.sig = ''; bd.draw(m.g, cam, look, { ...opts, direct: true });                              // the default moving path ('low')
    const dm = m.g.getImageData(0, 0, m.c.width, m.c.height).data; let sum = 0, mx = 0, over8 = 0; for (let i = 0; i < dm.length; i += 4) { let e = 0; for (let k = 0; k < 3; k++) e = Math.max(e, Math.abs(dm[i + k] - db[i + k])); sum += e; if (e > mx) mx = e; if (e > 8) over8++; }
    return { pixels: da.length / 4, differingChannels: diff, maxChannelDiff: max, size: [a.c.width, a.c.height], lowVsHigh: { meanAbsDiff: +(sum / (dm.length / 4)).toFixed(3), maxDiff: mx, shareOver8: +(over8 / (dm.length / 4)).toFixed(5) } };
  }, { dpr, look });
  out.push({ zoom: z, dpr, look, ...r }); console.log(JSON.stringify(out.at(-1)));
}
await ctx.close(); srv.close();
fs.mkdirSync(path.join(HERE, 'results'), { recursive: true }); fs.writeFileSync(path.join(HERE, 'results', 'direct-test.json'), JSON.stringify({ identical: out.every((o) => o.differingChannels === 0), views: out }, null, 1));
