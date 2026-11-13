// Harness (not a gate): renders the weather and effects cases of weather3d-gpu-cases.mjs on one API (WebGPU or WebGL2) in headless Chrome and writes, per case, a PNG, the raw pixels and the numbers;
// it also records every WebGPU validation error, uncaptured error, device loss and WGSL compiler message, checks scrub purity (the same time and camera give the same pixels) and whether the
// compositor screenshot of the canvas agrees with the read-back. Software rendering only on this machine (SwiftShader): nothing here is a real-GPU result.
//   tools/horde/bench.sh node docs/battle-theatre/app/tests/weather3d-gpu.mjs <outDir> <webgpu|webgl2> [case,case,...] [--w=640] [--h=360] [--soldiers=12000] [--no-repeat] [--tier=laptop]
// Output: <outDir>/<api>/<case>.png, <case>.rgba (raw), <case>.json, summary.json, console.log.
import fs from 'node:fs'; import path from 'node:path';
import { chromium } from '../../../../node_modules/playwright-core/index.mjs';
import { serve } from '../tools/serve.mjs';
import { CASES, specOf } from './weather3d-gpu-cases.mjs';
import { minOf as MO } from '../src/clock.mjs';

const args = process.argv.slice(2), flag = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const pos = args.filter(a => !a.startsWith('--')), outRoot = path.resolve(pos[0] || '.'), api = pos[1] === 'webgl2' ? 'webgl2' : 'webgpu', only = (pos[2] || '').split(',').filter(Boolean);
const W = +flag('w', 640), H = +flag('h', 360), SOLD = +flag('soldiers', 12000), TIER = flag('tier', 'laptop'), REPEAT = !args.includes('--no-repeat'), SHOT = !args.includes('--no-screenshot');
const out = path.join(outRoot, api); fs.mkdirSync(out, { recursive: true });
const t00 = Date.now(), say = (...a) => console.log(((Date.now() - t00) / 1000).toFixed(0).padStart(5) + 's', ...a);

import { encodePng, stats, CHROME_ARGS as ARGS, HOOKS } from './weather3d-gpu-lib.mjs';

const srv = await serve(0), port = srv.address().port, url = `http://127.0.0.1:${port}/app/tests/weather3d-gpu.html?api=${api}&w=${W}&h=${H}&soldiers=${SOLD}&tier=${TIER}`;
const summary = { api, url, w: W, h: H, soldiers: SOLD, tier: TIER, started: new Date().toISOString(), cases: {}, pure: {}, errors: [], screenshot: null };
const save = () => fs.writeFileSync(path.join(out, 'summary.json'), JSON.stringify(summary, null, 1));
const logs = []; let browser;
try {
  browser = await chromium.launch({ channel: 'chrome', headless: true, args: ARGS });
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 }); await ctx.addInitScript(HOOKS); ctx.setDefaultTimeout(0);
  const page = await ctx.newPage(); page.on('console', m => logs.push(m.type() + ': ' + m.text())); page.on('pageerror', e => logs.push('pageerror: ' + e.message)); page.on('crash', () => logs.push('PAGE CRASH')); browser.on('disconnected', () => logs.push('BROWSER DISCONNECTED'));
  say('open', url); await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => window.WG && (window.WG.ready || window.WG.error), null, { timeout: 0, polling: 500 });
  const ready = await page.evaluate(() => ({ ready: window.WG.ready, error: window.WG.error, log: window.WG.log })); summary.ready = ready; say('ready', JSON.stringify(ready));
  if (!ready.ready) throw new Error('harness set-up failed: ' + ready.error);
  summary.diagInit = await page.evaluate(() => window.WG.diag()); say('init: api', summary.diagInit.api, 'gpu', JSON.stringify(summary.diagInit.gpu && { ok: summary.diagInit.gpu.ok, weather: summary.diagInit.gpu.weatherOk, fx: summary.diagInit.gpu.fxOk, failed: summary.diagInit.gpu.failed }), 'gl', JSON.stringify(summary.diagInit.gl && summary.diagInit.gl.ok), 'errors', summary.diagInit.gpuErrors.length, 'wgsl msgs', summary.diagInit.wgsl.length); save();
  const list = CASES.filter(c => !only.length || only.includes(c.name)), first = {};
  const run = async (c, tag) => {
    const spec = specOf(c, MO); const t0 = Date.now(); const r = await page.evaluate(s => window.WG.render(s), spec); const px = Buffer.from(r.px, 'base64'); delete r.px; r.wallMs = Date.now() - t0;
    return { r, px: new Uint8Array(px.buffer, px.byteOffset, px.length), tag };
  };
  for (const c of list) {
    const { r, px } = await run(c); const s = stats(r.w, r.h, px); first[c.name] = px; fs.writeFileSync(path.join(out, c.name + '.rgba'), px); fs.writeFileSync(path.join(out, c.name + '.png'), encodePng(r.w, r.h, px));
    r.pixels = s; r.what = c.what; fs.writeFileSync(path.join(out, c.name + '.json'), JSON.stringify(r, null, 1)); summary.cases[c.name] = { w: r.w, h: r.h, format: r.format, frameMs: Math.round(r.frameMs), wallMs: r.wallMs, validation: r.validation, pixels: s, gpuStats: r.gpuStats, glStats: r.glStats, effects: r.effects && { nEvents: r.effects.nEvents, nSprites: r.effects.nSprites }, weather: r.weather, flags: r.flags };
    say(c.name.padEnd(26), 'frame', Math.round(r.frameMs) + 'ms', 'mean', s.all.mean, 'min', s.all.min, 'black', s.all.blackShare, 'sprites', r.effects && r.effects.nSprites, r.validation ? 'VALIDATION: ' + r.validation.slice(0, 160) : '', r.gpuStats ? `gpu w${r.gpuStats.weatherDraws} f${r.gpuStats.fxDraws}` : r.glStats ? `gl w${r.glStats.weatherDraws} f${r.glStats.fxDraws}` : ''); save();
  }
  if (REPEAT && list.length) {                                        // scrub purity: A, B, A (and A again at once): the same time and camera give the same pixels
    const A = list.find(c => c.name === 'smoke-jul3-1400') || list[0], B = list.find(c => c !== A && c.name !== 'moon-jul3-2330') || list[list.length - 1];
    for (const [tag, c] of [['A again at once', A], ['B', B], ['A after B', A]]) {
      const { px } = await run(c); const ref = first[c.name]; let diff = 0, maxd = 0; if (ref) for (let i = 0; i < px.length; i++) { const d = Math.abs(px[i] - ref[i]); if (d) { diff++; if (d > maxd) maxd = d; } }
      summary.pure[tag + ' (' + c.name + ')'] = ref ? { identical: diff === 0, bytesDiffering: diff, maxDiff: maxd } : { identical: null }; say('purity', tag, c.name, JSON.stringify(summary.pure[tag + ' (' + c.name + ')'])); save();
    }
  }
  if (SHOT && list.length) {                                          // does the compositor show the canvas? (the old finding: blank on WebGPU)
    const c = list.find(x => x.name === 'day-clouds-jul3-1400') || list[0]; const { r } = await run(c); const buf = await page.screenshot({ timeout: 0 }); fs.writeFileSync(path.join(out, 'compositor-screenshot-' + c.name + '.png'), buf);
    const dec = await page.evaluate(async b64 => { const bm = await createImageBitmap(await (await fetch('data:image/png;base64,' + b64)).blob()); const cv = new OffscreenCanvas(bm.width, bm.height), x = cv.getContext('2d'); x.drawImage(bm, 0, 0); const d = x.getImageData(0, 0, bm.width, bm.height).data; let sum = 0, nz = 0; for (let i = 0; i < d.length; i += 4) { const v = d[i] + d[i + 1] + d[i + 2]; sum += v; if (v > 6) nz++; } return { w: bm.width, h: bm.height, meanRGB: sum / (d.length / 4) / 3, nonBlackShare: nz / (d.length / 4) }; }, buf.toString('base64'));
    summary.screenshot = { case: c.name, ...dec, readbackMeanRGB: +((summary.cases[c.name].pixels.all.mean)).toFixed(2) }; say('compositor screenshot', JSON.stringify(summary.screenshot)); save();
  }
  if (api === 'webgpu') { summary.computeCheck = await page.evaluate(() => window.WG.checkCompute()); say('compute shader check', JSON.stringify(summary.computeCheck).slice(0, 400)); save(); }
  summary.diagEnd = await page.evaluate(() => window.WG.diag()); await page.evaluate(() => window.WG.dispose()).catch(e => summary.errors.push('dispose: ' + e.message));
} catch (e) { summary.errors.push(String((e && e.stack) || e).slice(0, 2000)); say('ERROR', String(e).slice(0, 400)); }
finally { summary.finished = new Date().toISOString(); summary.consoleLines = logs.length; summary.consoleProblems = logs.filter(l => /error|fail|invalid|validation|lost|crash|disconnect/i.test(l)).slice(0, 40); save(); fs.writeFileSync(path.join(out, 'console.log'), logs.join('\n')); try { await browser.close(); } catch { /* gone */ } srv.close(); }
say('done', 'errors', summary.errors.length, 'console problems', summary.consoleProblems.length, 'gpu errors', ((summary.diagEnd || summary.diagInit || {}).gpuErrors || []).length);
