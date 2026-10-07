// tools/shoot.mjs - render preview PNGs with real Chrome (playwright-core + the system Chrome, own profile under tmp/look-dev/basemap).
// usage: node tools/shoot.mjs name:lng,lat,z,look[,w,h,dpr] ...   -> previews/<name>.png        (or import { shoot } and pass shot objects)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';
import { serve } from './serve.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BASE = path.resolve(HERE, '..');
const REPO = path.resolve(BASE, '..', '..', '..', '..');
const PORT = +process.env.PORT || 9800;
const CHROME = process.env.T0_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
export const SPOTS = { angle: [-77.2347, 39.8117], wheatfield: [-77.2417, 39.7994], cemhill: [-77.2262, 39.8189] };

export async function shoot(shots, { outDir = path.join(BASE, 'previews') } = {}) {
  fs.mkdirSync(outDir, { recursive: true });
  const srv = await serve(PORT);
  const profile = path.join(REPO, 'tmp', 'look-dev', 'basemap', 'chrome-profile');
  fs.mkdirSync(profile, { recursive: true });
  const ctx = await chromium.launchPersistentContext(profile, { executablePath: CHROME, headless: true, viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, args: ['--no-first-run', '--disable-extensions', '--mute-audio'] });
  const page = ctx.pages()[0] || await ctx.newPage();
  const errors = []; const reqs = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror ' + e.message));
  page.on('response', (r) => { if (r.status() >= 400) errors.push(r.status() + ' ' + r.url()); });
  page.on('request', (r) => { const u = r.url(); if (!u.startsWith('http://127.0.0.1:' + PORT) && !u.startsWith('data:') && !u.startsWith('blob:')) reqs.push(u); });
  const out = [];
  try {
    for (const s of shots) {
      const w = s.w || 1440, h = s.h || 900, dpr = s.dpr || 1;
      await page.setViewportSize({ width: w, height: h });
      const q = new URLSearchParams({ lng: s.lng, lat: s.lat, z: s.z, look: s.look || 'dim', w, h, dpr, shot: 1, ...(s.q || {}) }).toString();
      await page.goto(`http://127.0.0.1:${PORT}/demo/index.html?${q}`);
      await page.waitForFunction(() => window.__done === true, null, { timeout: 60000 });
      await page.waitForTimeout(200);
      const stats = await page.evaluate(() => window.__bd.stats());
      const file = path.join(outDir, s.name + '.png');
      const data = await page.evaluate(() => document.querySelector('canvas').toDataURL('image/png'));      // the canvas' own pixels (w*dpr x h*dpr), exactly what the loader drew
      fs.writeFileSync(file, Buffer.from(data.split(',')[1], 'base64'));
      out.push({ name: s.name, file, stats });
      console.log(s.name, JSON.stringify(stats));
    }
  } finally { await ctx.close(); srv.close(); }
  if (errors.length) console.log('console issues:', [...new Set(errors)].slice(0, 6));
  if (reqs.length) console.log('external requests:', reqs.slice(0, 5));
  return out;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const shots = process.argv.slice(2).map((a) => {
    const [name, rest] = a.split(':'); const [lng, lat, z, look, w, h, dpr] = rest.split(',');
    return { name, lng: +lng, lat: +lat, z: +z, look, w: w && +w, h: h && +h, dpr: dpr && +dpr };
  });
  await shoot(shots);
}
