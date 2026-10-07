// verify/pack-test.mjs - the data-URI path: the same view rendered from files and from the pack must be identical, and the pack run must request no tile file at all.
//   node tools/build-pack.mjs --max-zoom=15 && node verify/pack-test.mjs      -> results/pack-test.json
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { serve } from '../tools/serve.mjs';
const HERE = path.dirname(fileURLToPath(import.meta.url)); const BASE = path.resolve(HERE, '..'); const REPO = path.resolve(BASE, '..', '..', '..', '..');
const PORT = 9803; const srv = await serve(PORT);
const ctx = await chromium.launchPersistentContext(path.join(REPO, 'tmp', 'look-dev', 'basemap', 'chrome-profile'), { executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, viewport: { width: 1200, height: 800 }, args: ['--no-first-run'] });
const page = ctx.pages()[0] || await ctx.newPage(); const tileReqs = []; const errors = [];
page.on('request', (r) => { if (/\/assets\/(aerial|shade)\//.test(r.url())) tileReqs.push(r.url()); }); page.on('pageerror', (e) => errors.push(e.message));
const out = {};
for (const mode of ['files', 'pack']) {
  tileReqs.length = 0;
  await page.goto(`http://127.0.0.1:${PORT}/demo/index.html?lng=-77.2347&lat=39.8117&z=14.4&look=dim&w=1200&h=800&dpr=1&shot=1${mode === 'pack' ? '&pack=1' : ''}`);
  await page.waitForFunction(() => window.__done === true, null, { timeout: 60000 }); await page.waitForTimeout(200);
  const data = await page.evaluate(() => document.querySelector('canvas').toDataURL('image/png'));
  out[mode] = { sha256: crypto.createHash('sha256').update(data).digest('hex'), tileFileRequests: tileReqs.length, errors: [...errors] };
}
out.identical = out.files.sha256 === out.pack.sha256;
await ctx.close(); srv.close();
fs.mkdirSync(path.join(HERE, 'results'), { recursive: true }); fs.writeFileSync(path.join(HERE, 'results', 'pack-test.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out));
