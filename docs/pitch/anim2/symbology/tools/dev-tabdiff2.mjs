// dev: is the cap of a wide pill rendered like the cap of the minimum pill?
import { chromium } from 'playwright-core';
import { CHROME, PROFILE } from './chrome.mjs';
import { loadTokens } from '../src/tokens.mjs';
import { renderTab } from '../src/overlays.mjs';
const { T } = loadTokens({}); const dpr = +(process.argv[2] || 1);
const ctx = await chromium.launchPersistentContext(PROFILE + '-tabdbg2-' + Date.now(), { executablePath: CHROME, headless: true, viewport: { width: 900, height: 400 }, deviceScaleFactor: dpr, args: ['--no-first-run', '--force-color-profile=srgb', '--remote-debugging-port=9827'] });
try {
  const page = ctx.pages()[0] || await ctx.newPage(); await page.setContent('<body></body>');
  const small = renderTab('light', T, 'a', 2); const wide = renderTab('light', T, 'b', 145);
  const r = await page.evaluate(async ({ s, w, dpr }) => {
    const draw = async (o) => { const img = new Image(); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(o.svg.replace(/^<svg ([^>]*?)width="[\d.]+" height="[\d.]+"/, (m, a) => `<svg ${a}width="${o.w * dpr}" height="${o.h * dpr}"`)); await img.decode(); const c = document.createElement('canvas'); c.width = o.w * dpr; c.height = o.h * dpr; const g = c.getContext('2d'); g.drawImage(img, 0, 0, o.w * dpr, o.h * dpr); return g.getImageData(0, 0, o.w * dpr, o.h * dpr); };
    const A = await draw(s); const B = await draw(w); const cols = 17 * dpr; let n = 0; let max = 0; const where = [];
    for (let y = 0; y < A.height; y++) for (let x = 0; x < cols; x++) for (let k = 0; k < 4; k++) { const d = Math.abs(A.data[(y * A.width + x) * 4 + k] - B.data[(y * B.width + x) * 4 + k]); if (d > 12) { n++; if (where.length < 8) where.push([x, y, k, A.data[(y * A.width + x) * 4 + k], B.data[(y * B.width + x) * 4 + k]]); } if (d > max) max = d; }
    return { n, max, where, sw: s.w, ww: w.w };
  }, { s: small, w: wide, dpr });
  console.log(JSON.stringify(r));
} finally { await ctx.close(); }
