// Harness (not a gate): the real shell (index.html, placeholder history layer) on one renderer API, entered like a visitor enters it, with the weather and effects layers installed by the shell itself and then given the
// stand-in event plan of tests/weather3d-gpu-plan.mjs. Reads the picture back from the canvas in the frame's own task, and records the console, every WebGPU error and compiler message, the ribbon text and the layer's counters.
// Software rendering only (SwiftShader). Nothing here is a real-GPU result.
//   tools/horde/bench.sh node docs/battle-theatre/app/tests/weather3d-gpu-theatre.mjs <outDir> [webgpu|webgl2] [case,case,...] [--w=640] [--h=360] [--real] [--real-canvas]
// --real: the real history layer (the crowd of figures, the structures, the crowd's own fire plan) instead of the placeholder layer and the stand-in plan; three views of the real field.
// Output: <outDir>/theatre-<api>/<case>.png, <case>.rgba, <case>.json, summary.json, console.log (theatre-real-<api> with --real).
import fs from 'node:fs'; import path from 'node:path';
import { chromium } from '../../../../node_modules/playwright-core/index.mjs';
import { serve } from '../tools/serve.mjs';
import { CASES, specOf } from './weather3d-gpu-cases.mjs';
import { minOf as MO } from '../src/clock.mjs';
import { encodePng, stats, CHROME_ARGS, HOOKS } from './weather3d-gpu-lib.mjs';

const args = process.argv.slice(2), flag = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const pos = args.filter(a => !a.startsWith('--')), outRoot = path.resolve(pos[0] || '.'), api = pos[1] === 'webgl2' ? 'webgl2' : 'webgpu', only = (pos[2] || '').split(',').filter(Boolean);
const W = +flag('w', 640), H = +flag('h', 360), REAL = args.includes('--real'), out = path.join(outRoot, (REAL ? 'theatre-real-' : 'theatre-') + api); fs.mkdirSync(out, { recursive: true });
const REAL_CASES = [{ name: 'real-overview-jul3-1330', m: [7, 3, 13, 30], view: 'overview', what: 'the whole field at the cannonade, the real layer' }, { name: 'real-ground-jul3-1330', m: [7, 3, 13, 30], view: 'ground', what: 'ground view at the cannonade, the real layer' }, { name: 'real-ground-jul2-2330', m: [7, 2, 23, 30], view: 'ground', what: 'ground view at night, the real layer' }];
const DEFAULT = ['stars-jun28-0200', 'moon-jul3-2330', 'day-clouds-jul3-1400', 'wet-ground-jul4-1400', 'smoke-jul3-1400', 'smoke-night-jul2-2200', 'fire-sherfy-jul3-1500', 'dust-march-jul2-1100'];
const t00 = Date.now(), say = (...a) => console.log(((Date.now() - t00) / 1000).toFixed(0).padStart(5) + 's', ...a);
const srv = await serve(0), port = srv.address().port, url = `http://127.0.0.1:${port}/app/index.html?history=${REAL ? 'real' : 'stub'}&api=${api}&nearR=12&midR=60`;
const summary = { api, url, w: W, h: H, started: new Date().toISOString(), cases: {}, errors: [] }, save = () => fs.writeFileSync(path.join(out, 'summary.json'), JSON.stringify(summary, null, 1));
const logs = []; let browser;
try {
  browser = await chromium.launch({ channel: 'chrome', headless: true, args: CHROME_ARGS });
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 }); await ctx.addInitScript(HOOKS, { realCanvas: args.includes('--real-canvas') }); ctx.setDefaultTimeout(0);
  const page = await ctx.newPage(); page.on('console', m => logs.push(m.type() + ': ' + m.text())); page.on('pageerror', e => logs.push('pageerror: ' + e.message)); page.on('crash', () => logs.push('PAGE CRASH')); page.on('response', r => { if (r.status() >= 400) logs.push('http ' + r.status() + ' ' + r.url()); });
  say('open', url); await page.goto(url, { waitUntil: 'load', timeout: 300000 });
  // a script click (no actionability wait: a visitor's click would be the same event), a progress line every 30 s, and a limit of 20 minutes for the entry
  await page.evaluate(() => document.querySelector('[data-bt-enter]').click());
  const hb = setInterval(async () => { try { say('  entering:', await page.evaluate(() => { const l = document.querySelector('.loading-card'); return (l ? l.innerText.replace(/\s+/g, ' ').slice(0, 160) : 'no loading card') + ' | btApp ' + !!window.btApp; })); } catch (e) { say('  entering: page busy'); } }, 30000);
  try { await page.waitForFunction(() => window.btApp && (window.btApp.ready || (document.querySelector('.loading-card .fail'))), null, { timeout: 1200000, polling: 1000 }); } finally { clearInterval(hb); }
  const entered = await page.evaluate(() => { const a = window.btApp; if (!a || !a.ready) return { ready: false, fail: (document.querySelector('.loading-card') || {}).textContent }; const th = a.theatre, fx = th.fxOn;
    return { ready: true, api: a.api, entryMs: th.perf.entryMs, ribbon: (th.root.querySelector('#bt-ribbon') || {}).textContent || null, fx: !!fx, status: fx && fx.status ? fx.status() : null, fxLog: fx ? fx.log : null, gpu: fx && fx.gpu ? { ok: fx.gpu.ok, weatherOk: fx.gpu.weatherOk, fxOk: fx.gpu.fxOk, failed: fx.gpu.failed, log: fx.gpu.log } : null, gl: fx && fx.gl ? { ok: fx.gl.ok, log: fx.gl.log } : null, flags: { ...th.host.R.o.flags }, hostLog: th.host.log }; });
  summary.entered = entered; say('entered', JSON.stringify(entered).slice(0, 700)); save(); if (!entered.ready) throw new Error('the theatre did not start: ' + entered.fail);
  // the stand-in plan replaces the (absent) crowd's plan; the picture is read back in the frame's own task
  await page.evaluate(async real => {
    const a = window.btApp, th = a.theatre, host = th.host, R = host.R, { makePlan } = await import('/app/tests/weather3d-gpu-plan.mjs'), fxm = await import('/app/src/fx-host.mjs');
    if (!real) { const P = window.__P = makePlan((x, z) => th.T.h(x, z)); th.fxOn = await fxm.init(host, { environment: th.env, anim: P.anim, choices: () => th.state.scenario.choices, nightFloor: th.state.settings.nightFloor, tier: 'laptop', geo: th.geo }); }
    const grabGPU = () => { const d = R.dev, tex = R.ctx.getCurrentTexture(), w = tex.width, h = tex.height, bpr = Math.ceil(w * 4 / 256) * 256, buf = d.createBuffer({ size: bpr * h, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
      const enc = d.createCommandEncoder(); enc.copyTextureToBuffer({ texture: tex }, { buffer: buf, bytesPerRow: bpr }, [w, h]); d.queue.submit([enc.finish()]);
      return buf.mapAsync(GPUMapMode.READ).then(() => { const src = new Uint8Array(buf.getMappedRange()), o = new Uint8Array(w * h * 4), bgra = /^bgra/.test(tex.format); for (let y = 0; y < h; y++) o.set(src.subarray(y * bpr, y * bpr + w * 4), y * w * 4); if (bgra) for (let i = 0; i < o.length; i += 4) { const t = o[i]; o[i] = o[i + 2]; o[i + 2] = t; } buf.unmap(); buf.destroy(); return { w, h, format: tex.format, data: o }; }); };
    const grabGL = () => { const gl = R.gl, w = R.W, h = R.H, px = new Uint8Array(w * h * 4); gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px); const o = new Uint8Array(w * h * 4); for (let y = 0; y < h; y++) o.set(px.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4); return Promise.resolve({ w, h, format: 'rgba8unorm', data: o }); };
    const orig = host.frame.bind(host); host.frame = (t, cam) => { const r = orig(t, cam); if (window.__grab) { window.__grab = false; window.__grabP = host.api === 'webgpu' ? grabGPU() : grabGL(); } return r; };
    document.head.insertAdjacentHTML('beforeend', '<style>body *{visibility:hidden !important} canvas.w3d-keep{visibility:visible !important}</style>'); th.els.canvas.classList.add('w3d-keep');
  }, REAL);
  const list = REAL ? REAL_CASES.filter(c => !only.length || only.includes(c.name)) : CASES.filter(c => (only.length ? only : DEFAULT).includes(c.name));
  for (const c of list) {
    const spec = REAL ? { ...c, tMin: MO(c.m[0], c.m[1], c.m[2], c.m[3]) } : specOf(c, MO), t0 = Date.now();
    const r = await page.evaluate(async spec => {
      const { placeCamera } = await import('/app/tests/weather3d-gpu-plan.mjs'), a = window.btApp, th = a.theatre, P = window.__P; a.setTime(spec.tMin); th.controls.flight = null;
      if (spec.view) { th.setView(spec.view, true); } else { const smp = th.env.sample(spec.tMin, {}); placeCamera(th.cam, spec, { T: th.T, geo: th.geo, smp, line: null }); P.anchor(th.cam, spec.plan); }
      await a.frames(spec.view ? 6 : 3); window.__grab = true; await a.frames(2); const pic = await window.__grabP; const fxi = th.fxInfo, fx = th.fxOn, gpu = fx && fx.gpu ? fx.gpu : null, gl = fx && fx.gl ? fx.gl : null;
      let s = ''; const u8 = pic.data; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
      return { w: pic.w, h: pic.h, format: pic.format, px: btoa(s), driveState: fxi && fxi.driveState, effects: fxi && { nEvents: fxi.effects.nEvents, nSprites: fxi.effects.nSprites, fires: fxi.effects.fires, uncertain: fxi.effects.uncertainFires }, weather: fxi && { cover: fxi.weather.cloud.cover, stars: fxi.weather.sky.stars.visibility, wet: fxi.weather.wetness.v, visM: fxi.weather.fog.visibilityM },
        gpuStats: gpu ? { ...gpu.stats, failed: gpu.failed } : null, glStats: gl ? { ...gl.stats } : null, flags: { ...th.host.R.o.flags }, t: th.state.t, cam: { x: th.cam.x, y: th.cam.y, z: th.cam.z, yaw: th.cam.yaw, pitch: th.cam.pitch } };
    }, spec);
    const px = Buffer.from(r.px, 'base64'); delete r.px; const u8 = new Uint8Array(px.buffer, px.byteOffset, px.length), s = stats(r.w, r.h, u8);
    fs.writeFileSync(path.join(out, c.name + '.rgba'), u8); fs.writeFileSync(path.join(out, c.name + '.png'), encodePng(r.w, r.h, u8)); r.pixels = s; r.what = c.what; r.wallMs = Date.now() - t0; fs.writeFileSync(path.join(out, c.name + '.json'), JSON.stringify(r, null, 1));
    summary.cases[c.name] = { pixels: s, effects: r.effects && { nEvents: r.effects.nEvents, nSprites: r.effects.nSprites }, gpuStats: r.gpuStats, glStats: r.glStats, flags: r.flags, wallMs: r.wallMs };
    say(c.name.padEnd(26), 'mean', s.all.mean, 'min', s.all.min, 'black', s.all.blackShare, 'sprites', r.effects && r.effects.nSprites, r.gpuStats ? `gpu w${r.gpuStats.weatherDraws} f${r.gpuStats.fxDraws} failed=${r.gpuStats.failed}` : r.glStats ? `gl w${r.glStats.weatherDraws} f${r.glStats.fxDraws}` : ''); save();
  }
  summary.diagEnd = await page.evaluate(() => ({ status: (window.btApp.theatre.fxOn && window.btApp.theatre.fxOn.status) ? window.btApp.theatre.fxOn.status() : null, gpuErrors: window.__gpuErrors, wgsl: window.__wgslMessages, modules: window.__gpuLabels, perf: (() => { try { return window.btApp.perf(); } catch { return null; } })() }));
} catch (e) { summary.errors.push(String((e && e.stack) || e).slice(0, 2000)); say('ERROR', String(e).slice(0, 400)); }
finally { summary.finished = new Date().toISOString(); summary.consoleLines = logs.length; summary.consoleProblems = logs.filter(l => /error|fail|invalid|validation|lost|crash/i.test(l)).slice(0, 40); save(); fs.writeFileSync(path.join(out, 'console.log'), logs.join('\n')); try { await browser.close(); } catch { /* gone */ } srv.close(); }
say('done', 'errors', summary.errors.length, 'console problems', summary.consoleProblems.length, 'gpu errors', ((summary.diagEnd || {}).gpuErrors || []).length);
