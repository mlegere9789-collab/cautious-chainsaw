// Harness (not a gate): the capture side of the cross-implementation check. For each case it renders one frame on WebGPU (Chrome, software adapter) exactly as tests/weather3d-gpu.mjs does and writes what the weather and effects pass
// of that frame read (the prototype's frame block, the layer's two uniform blocks, the effect events, cumulative counts and wind history, the scene depth) and the colour target (rgba16float) before and after the pass.
// tests/weather3d-gpu-replay.py then runs the same pass on a second WebGPU implementation (wgpu-native: the naga compiler and wgpu-core's validation, on SwiftShader's Vulkan) and compares the two results.
// Software rendering only: nothing here is a real-GPU result.
//   tools/horde/bench.sh node docs/battle-theatre/app/tests/weather3d-gpu-capture.mjs <outDir> [case,case,...] [--w=640] [--h=360] [--soldiers=12000] [--tier=laptop] [--all]
// Output: <outDir>/wgsl/*.wgsl (the shader text of the layer), <outDir>/<case>/{pre.f16,post.f16,depth.f32,fu.f32,wu.f32,fx.f32,events.f32,cum.u32,wind.f32,meta.json,picture.png} and <outDir>/summary.json (errors, adapter, hash of the terrain heights).
import fs from 'node:fs'; import path from 'node:path';
import { chromium } from '../../../../node_modules/playwright-core/index.mjs';
import { serve } from '../tools/serve.mjs';
import { CASES, ALL_CASES, specOf } from './weather3d-gpu-cases.mjs';
import { minOf as MO } from '../src/clock.mjs';
import { encodePng, chromeArgs, HOOKS } from './weather3d-gpu-lib.mjs';
import { weatherWgsl } from '../src/weather3d/shaders-wgsl.mjs';
import { fxWgsl } from '../src/weather3d/gpu.mjs';
import { WGSL_COMPUTE } from '../src/fx3d/shaders.mjs';

const args = process.argv.slice(2), flag = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const pos = args.filter(a => !a.startsWith('--')), outRoot = path.resolve(pos[0] || '.'), only = (pos[1] || '').split(',').filter(Boolean);
const W = +flag('w', 640), H = +flag('h', 360), SOLD = +flag('soldiers', 12000), TIER = flag('tier', 'laptop');
const DEFAULT = ['stars-jun28-0200', 'moon-zoom-jul2-2200', 'dusk-jul2-2000', 'dawn-fog-jul2-0430', 'day-clouds-jul3-1400', 'wet-ground-jul4-1400', 'smoke-jul3-1400', 'smoke-night-jul2-2200', 'flash-night-jul2-2330', 'fire-sherfy-jul3-1500', 'dust-march-jul2-1100', 'night-floor-jul2-0100'];
fs.mkdirSync(outRoot, { recursive: true });
// the WGSL the layer hands to the compiler, as text, for the replay (and for any other WGSL compiler: naga, a GPU vendor's)
fs.mkdirSync(path.join(outRoot, 'wgsl'), { recursive: true }); for (const [n, code] of [['weather3d-mul', weatherWgsl('mul')], ['weather3d-add', weatherWgsl('add')], ['fx3d-sprites', fxWgsl()], ['fx3d-cull-compute', WGSL_COMPUTE]]) fs.writeFileSync(path.join(outRoot, 'wgsl', n + '.wgsl'), code);
const t00 = Date.now(), say = (...a) => console.log(((Date.now() - t00) / 1000).toFixed(0).padStart(5) + 's', ...a);
const srv = await serve(0), port = srv.address().port, url = `http://127.0.0.1:${port}/app/tests/weather3d-gpu.html?api=webgpu&capture=1&w=${W}&h=${H}&soldiers=${SOLD}&tier=${TIER}`;
const summary = { url, w: W, h: H, soldiers: SOLD, tier: TIER, started: new Date().toISOString(), cases: {}, errors: [] }, save = () => fs.writeFileSync(path.join(outRoot, 'summary.json'), JSON.stringify(summary, null, 1));
const logs = []; let browser;
try {
  browser = await chromium.launch({ channel: 'chrome', headless: true, args: chromeArgs(false) });
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 }); await ctx.addInitScript(HOOKS, { realCanvas: false, trace: false }); ctx.setDefaultTimeout(0);
  const page = await ctx.newPage(); page.on('console', m => logs.push(m.type() + ': ' + m.text())); page.on('pageerror', e => logs.push('pageerror: ' + e.message)); page.on('crash', () => logs.push('PAGE CRASH'));
  say('open', url); await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => window.WG && (window.WG.ready || window.WG.error), null, { timeout: 600000, polling: 500 });
  const ready = await page.evaluate(() => ({ ready: window.WG.ready, error: window.WG.error })); if (!ready.ready) throw new Error('harness set-up failed: ' + ready.error);
  summary.diagInit = await page.evaluate(() => window.WG.diag()); say('ready; gpu', JSON.stringify(summary.diagInit.gpu && { ok: summary.diagInit.gpu.ok, weather: summary.diagInit.gpu.weatherOk, fx: summary.diagInit.gpu.fxOk })); save();
  const list = (args.includes('--all') ? ALL_CASES : ALL_CASES.filter(c => (only.length ? only : DEFAULT).includes(c.name)));
  for (const c of list) {
    const t0 = Date.now(), r = await page.evaluate(s => window.WG.capture(s), specOf(c, MO)), dir = path.join(outRoot, c.name); fs.mkdirSync(dir, { recursive: true });
    const ext = { pre: 'f16', post: 'f16', depth: 'f32', fu: 'f32', wu: 'f32', fx: 'f32', events: 'f32', cum: 'u32', wind: 'f32' }, sizes = {};
    for (const [k, e] of Object.entries(ext)) { const b = Buffer.from(r.bin[k], 'base64'); fs.writeFileSync(path.join(dir, k + '.' + e), b); sizes[k] = b.length; }
    const px = Buffer.from(r.pic.px, 'base64'); fs.writeFileSync(path.join(dir, 'picture.png'), encodePng(r.pic.w, r.pic.h, new Uint8Array(px.buffer, px.byteOffset, px.length)));
    delete r.bin; delete r.pic; r.what = c.what; r.sizes = sizes; r.wallMs = Date.now() - t0; fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify(r, null, 1)); summary.cases[c.name] = { nSprites: r.nSprites, nEvents: r.nEvents, validation: r.validation, ok: r.ok, heightHash: r.heightHash, wallMs: r.wallMs };
    say(c.name.padEnd(26), 'sprites', r.nSprites, 'events', r.nEvents, r.validation ? 'VALIDATION: ' + r.validation.slice(0, 160) : 'no validation error', r.wallMs + 'ms'); save();
  }
  summary.diagEnd = await page.evaluate(() => window.WG.diag()); await page.evaluate(() => window.WG.dispose()).catch(e => summary.errors.push('dispose: ' + e.message));
} catch (e) { summary.errors.push(String((e && e.stack) || e).slice(0, 2000)); say('ERROR', String(e).slice(0, 400)); }
finally { summary.finished = new Date().toISOString(); summary.consoleProblems = logs.filter(l => /error|fail|invalid|validation|lost|crash/i.test(l)).slice(0, 40); save(); fs.writeFileSync(path.join(outRoot, 'console.log'), logs.join('\n')); try { await browser.close(); } catch { /* gone */ } srv.close(); }
say('done', 'errors', summary.errors.length, 'console problems', summary.consoleProblems.length);
