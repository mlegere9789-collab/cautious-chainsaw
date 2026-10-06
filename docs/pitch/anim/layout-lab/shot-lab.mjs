// layout-lab/shot-lab.mjs - browser confirmation: the lab page (same lib/*.mjs, REAL data files) runs in Chrome; this script drives it, reads back what the PAGE
// computed (overlap count from the independent verifier, represented units, solve times in V8) and takes screenshots of the live page.
//   node docs/pitch/anim/layout-lab/shot-lab.mjs        -> out/browser.json, out/figs/lab-*.png      (own port 9600, own Chrome profile)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { startServer } from './serve-lab.mjs';
import { REPO } from './lib/data.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url)); const OUT = path.join(HERE, 'out'); const FIGS = path.join(OUT, 'figs'); fs.mkdirSync(FIGS, { recursive: true });
const CHROME = process.env.T0_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const srv = await startServer(9600);
const profile = path.join(REPO, 'tmp', 'pitch-anim', 'layout', 'chrome-profile', 'lab'); fs.mkdirSync(profile, { recursive: true });
const ctx = await chromium.launchPersistentContext(profile, { executablePath: CHROME, headless: true, viewport: { width: 1440, height: 900 }, args: ['--no-first-run', '--disable-extensions', '--disable-sync', '--mute-audio'] });
const result = { generated: new Date().toISOString(), browser: null, errors: [] };
try {
  const page = ctx.pages()[0] || await ctx.newPage();
  page.on('pageerror', (e) => result.errors.push('pageerror: ' + e.message)); page.on('console', (m) => { if (m.type() === 'error') result.errors.push('console.error: ' + m.text()); });
  await page.goto('http://127.0.0.1:9600/lab/lab.html', { waitUntil: 'load' });
  await page.waitForFunction(() => window.__lab && window.__lab.ready, null, { timeout: 60000 });
  result.browser = await page.evaluate(() => navigator.userAgent);
  result.log = await page.evaluate(() => document.getElementById('log').textContent);
  // 1. every zoom at the densest tick (620 = 478 units on the field): overlap count and representation computed in the page
  result.densest = await page.evaluate(() => [11, 12, 13, 14, 15, 16, 17].map((z) => ({ z, ...window.__lab.solveOnce({ tick: 620, z, strategy: 'hybrid' }) })));
  result.densestRaw = await page.evaluate(() => [11, 13, 15, 17].map((z) => ({ z, ...window.__lab.solveOnce({ tick: 620, z, strategy: 'raw' }) })));
  // 2. solve time in V8 (cold solver), densest tick, hybrid
  result.bench = await page.evaluate(() => [11, 12, 13, 14, 15, 16, 17].map((z) => ({ z, ...window.__lab.bench({ tick: 620, z, strategy: 'hybrid', n: 25 }) })));
  // 3. 5 s of 60 fps playback at each hotspot with the stateful solver, verified frame by frame in the page
  result.playback = await page.evaluate(() => [{ id: 'H1', tick0: 336, z: 14 }, { id: 'H2', tick0: 283, z: 14 }, { id: 'H3', tick0: 546, z: 14 }, { id: 'H1', tick0: 336, z: 13 }].map((h) => ({ ...h, speed: 4, ...window.__lab.playback({ tick0: h.tick0, speed: 4, z: h.z, frames: 300 }) })));
  // 4. screenshots of the live page
  const shot = async (name, view) => { await page.evaluate((v) => window.__lab.setView(v), view); await page.waitForTimeout(250); await page.screenshot({ path: path.join(FIGS, `lab-${name}.png`) }); };
  await shot('H1-hybrid-z14', { tick: 346, z: 14, strategy: 'hybrid', centre: [39.8189, -77.2262] });
  await shot('H1-legacy-z14', { tick: 346, z: 14, strategy: 'legacy', centre: [39.8189, -77.2262] });
  await shot('H3-hybrid-z15', { tick: 556, z: 15, strategy: 'hybrid', centre: [39.8117, -77.2347] });
  await shot('H2-hybrid-z13', { tick: 293, z: 13, strategy: 'hybrid', centre: [39.7994, -77.2417] });
} finally { await ctx.close(); srv.close(); }
fs.writeFileSync(path.join(OUT, 'browser.json'), JSON.stringify(result, null, 1));
console.log(JSON.stringify({ errors: result.errors, densest: result.densest.map((d) => ({ z: d.z, overlaps: d.overlaps, unrep: d.unrepresented, dup: d.duplicated, tiles: d.tiles, ms: +d.ms.toFixed(1) })), bench: result.bench.map((b) => ({ z: b.z, p50: +b.p50.toFixed(1), p95: +b.p95.toFixed(1) })), playback: result.playback }, null, 1));
process.exit(0);
