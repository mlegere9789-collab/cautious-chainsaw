// tools/bench.mjs - the backdrop's cost per frame in real Chrome: an 8 s scripted camera move (pan, zoom 14.5 -> 16.7 -> 14.5) at 1440x900, DPR 1 and 2, with and without a 4x CPU throttle.
//   node tools/bench.mjs [--look=dim]  -> results/bench.json
// Each condition runs twice: 'first version' (every frame renders into the frame cache and is copied to the host canvas; four tile bakes per frame; roads and contours stroked live every frame) and 'now' (paints straight into the host canvas while the camera moves, with the vector layers baked into tiles;
// a time budget for baking).  The two are the same pictures (verify/direct-test.mjs); only the cost differs.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { serve } from './serve.mjs';
const HERE = path.dirname(fileURLToPath(import.meta.url)); const BASE = path.resolve(HERE, '..'); const REPO = path.resolve(BASE, '..', '..', '..', '..');
const look = (process.argv.find((a) => a.startsWith('--look=')) || '--look=dim').split('=')[1];
const PORT = 9802; const srv = await serve(PORT);
const results = []; let env = null;
for (const [version, extra] of [['first version', '&direct=0&bakeBudget=4&bakeMs=1e9&live=1'], ['now', '']]) for (const [dpr, cpu] of [[1, 1], [2, 1], [1, 4], [2, 4]]) {
  const ctx = await chromium.launchPersistentContext(path.join(REPO, 'tmp', 'look-dev', 'basemap', 'chrome-profile'), { executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, viewport: { width: 1440, height: 900 }, deviceScaleFactor: dpr, args: ['--no-first-run', '--disable-extensions'] });
  const page = ctx.pages()[0] || await ctx.newPage(); const cdp = await ctx.newCDPSession(page); if (cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
  await page.goto(`http://127.0.0.1:${PORT}/demo/index.html?lng=-77.2347&lat=39.8117&z=14.5&look=${look}&w=1440&h=900&dpr=${dpr}&shot=1&bench=1${extra}`);
  await page.waitForFunction(() => window.__bench, null, { timeout: 90000 });
  if (!env) env = await page.evaluate(() => { const c = document.createElement('canvas'); const gl = c.getContext('webgl'); const e = gl && gl.getExtension('WEBGL_debug_renderer_info'); return { userAgent: navigator.userAgent, gpu: e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : (gl ? gl.getParameter(gl.RENDERER) : 'no webgl') }; });
  const b = await page.evaluate(() => window.__bench); results.push({ version, dpr, cpuThrottle: cpu, ...b });
  console.log(`${version}: dpr ${dpr} cpu x${cpu}: frames ${b.frames}, camera-moving draws mean ${b.moveMean.toFixed(2)} ms, p95 ${b.moveP95.toFixed(2)} ms, max ${b.moveMax.toFixed(2)} ms; camera-still draws mean ${b.stillMean.toFixed(3)} ms, max ${b.stillMax.toFixed(2)} ms; frame gaps (what the viewer sees) mean ${b.gapMean.toFixed(1)} p50 ${b.gapP50.toFixed(1)} p95 ${b.gapP95.toFixed(1)} max ${b.gapMax.toFixed(1)} ms, over 20 ms: ${b.gapsOver20} of ${b.gapFrames}, over 34 ms: ${b.gapsOver34}; renders ${b.stats.renders}, bakes ${b.stats.bakes}; ms totals tiles ${b.stats.msTiles.toFixed(0)} vectors ${b.stats.msVectors.toFixed(0)} labels ${b.stats.msLabels.toFixed(0)} bake ${b.stats.msBake.toFixed(0)}`);
  await ctx.close();
}
srv.close(); fs.mkdirSync(path.join(BASE, 'verify', 'results'), { recursive: true }); fs.writeFileSync(path.join(BASE, 'verify', 'results', 'bench.json'), JSON.stringify({ look, chrome: 'system Chrome via playwright-core', ...env, results }, null, 1));
