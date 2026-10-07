// dev: where do the three-slice tab and a directly rendered pill differ?
import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright-core';
import { CHROME, PROFILE, ROOT } from './chrome.mjs';
import { serve } from './serve.mjs';
import { loadTokens } from '../src/tokens.mjs';
import { renderTab } from '../src/overlays.mjs';
const { T } = loadTokens({}); const dpr = +(process.argv[2] || 1); const tone = process.argv[3] || 'dark';
const srv = await serve(9826);
const ctx = await chromium.launchPersistentContext(PROFILE + '-tabdbg-' + Date.now(), { executablePath: CHROME, headless: true, viewport: { width: 900, height: 400 }, deviceScaleFactor: dpr, args: ['--no-first-run', '--force-color-profile=srgb', '--remote-debugging-port=9827'] });
try {
  const page = ctx.pages()[0] || await ctx.newPage(); await page.addInitScript((t) => { window.__tone = t; }, tone); await page.goto('http://localhost:9826/demo/index.html'); await page.waitForFunction(() => document.title === 'ready');
  const meta = JSON.parse(fs.readFileSync(path.join(ROOT, 'dist', 'atlas', 'overlays.json'), 'utf8')).sprites[`tab/${tone}`].tab;
  const probe = await page.evaluate(async ({ dpr, tone }) => {
    const rt2 = await import('../runtime/atlas.mjs'); const ov = await rt2.loadAtlas('../dist/atlas/', 'overlays', { dpr });
    const cv = document.createElement('canvas'); cv.width = 300 * dpr; cv.height = 60 * dpr; const c = cv.getContext('2d'); c.scale(dpr, dpr);
    const rec = rt2.drawTab(c, ov, { ax: 0, ay: 0, anchors: { tab: [0, 0] } }, ' '.repeat(13), 20, 30, { tone });
    return { rec, data: Array.from(c.getImageData(0, 0, cv.width, cv.height).data) };
  }, { dpr, tone });
  const pillW = probe.rec.x1 - probe.rec.x0; const direct = renderTab(tone, T, 'direct', pillW - 2 * meta.cap);
  const dd = await page.evaluate(async ({ svg, w, h, ax, ay, X0, Y, dpr }) => {
    const img = new Image(); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg.replace(/^<svg ([^>]*?)width="[\d.]+" height="[\d.]+"/, (m, a) => `<svg ${a}width="${w * dpr}" height="${h * dpr}"`)); await img.decode();
    const cv = document.createElement('canvas'); cv.width = 300 * dpr; cv.height = 60 * dpr; const c = cv.getContext('2d'); c.drawImage(img, Math.round((X0 - ax) * dpr), Math.round((Y - ay) * dpr), w * dpr, h * dpr);
    return Array.from(c.getImageData(0, 0, cv.width, cv.height).data);
  }, { svg: direct.svg, w: direct.w, h: direct.h, ax: direct.ax, ay: direct.ay, X0: probe.rec.x0, Y: (probe.rec.y0 + probe.rec.y1) / 2, dpr });
  const W = 300 * dpr; const bad = []; for (let i = 0; i < dd.length; i += 4) for (let k = 0; k < 4; k++) { const d = Math.abs(dd[i + k] - probe.data[i + k]); if (d > 12) bad.push([Math.floor(i / 4) % W, Math.floor(i / 4 / W), k, dd[i + k], probe.data[i + k]]); }
  // (a) the atlas sprite itself against a directly rendered minimum pill
  const minD = renderTab(tone, T, 'min', meta.midW);
  const a = await page.evaluate(async ({ svg, w, h, dpr }) => {
    const rt2 = await import('../runtime/atlas.mjs'); const ov = await rt2.loadAtlas('../dist/atlas/', 'overlays', { dpr }); const sprite = ov.sprite('tab/dark'.replace('dark', window.__tone));
    const img = new Image(); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg.replace(/^<svg ([^>]*?)width="[\d.]+" height="[\d.]+"/, (m, a) => `<svg ${a}width="${w * dpr}" height="${h * dpr}"`)); await img.decode();
    const c1 = document.createElement('canvas'); c1.width = w * dpr; c1.height = h * dpr; const g1 = c1.getContext('2d'); g1.drawImage(img, 0, 0, w * dpr, h * dpr);
    const c2 = document.createElement('canvas'); c2.width = w * dpr; c2.height = h * dpr; const g2 = c2.getContext('2d'); g2.drawImage(ov.img, sprite.x * dpr, sprite.y * dpr, w * dpr, h * dpr, 0, 0, w * dpr, h * dpr);
    const d1 = g1.getImageData(0, 0, w * dpr, h * dpr).data; const d2 = g2.getImageData(0, 0, w * dpr, h * dpr).data; let n = 0; let max = 0; for (let i = 0; i < d1.length; i++) { const d = Math.abs(d1[i] - d2[i]); if (d > 12) n++; if (d > max) max = d; } return { n, max, sw: sprite.w, sh: sprite.h, w, h };
  }, { svg: minD.svg, w: minD.w, h: minD.h, dpr });
  console.log('atlas sprite vs direct min pill:', JSON.stringify(a));
  console.log('pill', pillW, 'rect', JSON.stringify(probe.rec), 'meta', JSON.stringify({ leftW: meta.leftW, midW: meta.midW, rightW: meta.rightW, cap: meta.cap }), 'diffs>12:', bad.length); console.log(bad.slice(0, 25).map((b) => b.join(',')).join('\n'));
} finally { await ctx.close(); srv.closeAllConnections(); srv.close(); }
