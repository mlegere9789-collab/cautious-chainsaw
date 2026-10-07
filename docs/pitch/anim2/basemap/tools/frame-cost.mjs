// tools/frame-cost.mjs - WHERE does the frame time go?  The scripted camera move of the demo (tools/bench.mjs) at 1440 x 900 with one layer or one setting changed at a time, and a page that only fills a rectangle
// as the floor.  The number that matters is the time between two animation frames while the camera moves (what a viewer sees); draw() alone leaves out the GPU and compositor work that follows it.
//   node tools/frame-cost.mjs [dpr=2]  -> verify/results/frame-cost-dpr<dpr>.json and a printout
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { serve } from './serve.mjs';
const HERE = path.dirname(fileURLToPath(import.meta.url)); const BASE = path.resolve(HERE, '..'); const REPO = path.resolve(BASE, '..', '..', '..', '..');
const dpr = +(process.argv[2] || 2); const PORT = 9806; const srv = await serve(PORT);
const variants = [
  ['floor: a page that only fills a rectangle', null],
  ['first version: frame cache + blit, live vectors, quality high, 4 bakes a frame', '&direct=0&live=1&quality=high&bakeBudget=4&bakeMs=1e9'],
  ['direct paint, live vectors, quality high', '&live=1&quality=high&bakeBudget=4&bakeMs=1e9'],
  ['direct paint, live vectors, quality low', '&live=1&quality=low'],
  ['direct paint, live vectors, quality low, no roads', '&live=1&quality=low&roads=0'],
  ['direct paint, live vectors, quality low, no contours', '&live=1&quality=low&contours=0'],
  ['direct paint, live vectors, quality low, no roads and no contours', '&live=1&quality=low&roads=0&contours=0'],
  ['direct paint, baked vector tiles, quality high', '&quality=high'],
  ['direct paint, baked vector tiles, quality medium', '&quality=medium'],
  ['now: direct paint, baked vector tiles, quality low', ''],
];
const out = [];
for (const [name, extra] of variants) {
  const ctx = await chromium.launchPersistentContext(path.join(REPO, 'tmp', 'look-dev', 'basemap', 'chrome-profile'), { executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, viewport: { width: 1440, height: 900 }, deviceScaleFactor: dpr, args: ['--no-first-run'] });
  const page = ctx.pages()[0] || await ctx.newPage(); let r;
  if (extra === null) {
    await page.goto('about:blank'); await page.setContent('<canvas id=c></canvas>');
    r = await page.evaluate((dpr) => new Promise((res) => { const c = document.getElementById('c'); c.width = 1440 * dpr; c.height = 900 * dpr; c.style.width = '1440px'; c.style.height = '900px'; const g = c.getContext('2d'); const gaps = []; let prev = null; const t0 = performance.now(); const step = () => { const t = performance.now(); if (prev !== null) gaps.push(t - prev); prev = t; g.fillStyle = `hsl(${(t / 10) % 360},40%,40%)`; g.fillRect(0, 0, c.width, c.height); if (t - t0 < 4000) requestAnimationFrame(step); else { gaps.sort((a, b) => a - b); res({ frames: gaps.length, mean: gaps.reduce((a, b) => a + b, 0) / gaps.length, p50: gaps[gaps.length >> 1], p95: gaps[Math.floor(gaps.length * 0.95)], max: gaps[gaps.length - 1], over20: gaps.filter((x) => x > 20).length }); } }; requestAnimationFrame(step); }), dpr);
  } else {
    await page.goto(`http://127.0.0.1:${PORT}/demo/index.html?lng=-77.2347&lat=39.8117&z=14.5&look=dim&w=1440&h=900&dpr=${dpr}&shot=1&bench=1${extra}`);
    await page.waitForFunction(() => window.__bench, null, { timeout: 90000 });
    const b = await page.evaluate(() => window.__bench); r = { frames: b.gapFrames, mean: b.gapMean, p50: b.gapP50, p95: b.gapP95, max: b.gapMax, over20: b.gapsOver20, drawMeanMs: b.moveMean, drawP95Ms: b.moveP95 };
  }
  out.push({ variant: name, ...Object.fromEntries(Object.entries(r).map(([k, v]) => [k, +v.toFixed(2)])) });
  console.log(name.padEnd(86), JSON.stringify(Object.fromEntries(Object.entries(out.at(-1)).filter(([k]) => k !== 'variant'))));
  await ctx.close();
}
srv.close(); fs.mkdirSync(path.join(BASE, 'verify', 'results'), { recursive: true });
fs.writeFileSync(path.join(BASE, 'verify', 'results', `frame-cost-dpr${dpr}.json`), JSON.stringify({ dpr, note: 'frame interval in ms while the camera moves (6 s of the scripted move); first frames include cold caches', variants: out }, null, 1));
