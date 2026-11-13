// Browser harness (not a gate): what a scene hook (host.addSceneHook) gets in the real shell with the weather and the effects layers drawing, on WebGL2 or on WebGPU. Software rendering only
// (SwiftShader); nothing here is a real-GPU result. A stand-in module, answered from memory like the one of ext-loader-browser.mjs (nothing is written into src/ext/), hooks two flat quads that
// face the camera: one 8 m ahead on the left of the picture, one 400 m ahead on the right. They are drawn with the frame block (camera, right, up, forward, view-projection) and write depth, the way
// the contract tells a module to draw (docs/EXT-CONTRACT.md, section 8). The stand-in event plan of tests/weather3d-gpu-plan.mjs puts guns and a volley in front of the camera (smoke by day).
// Six pictures of the same time and camera, with the hook, the weather pass and the effects pass each switched on or off, say what the later passes do to hooked geometry:
//   H0 bare scene | H1 hook only | W1 hook + weather | F1 hook + effects | A hook + weather + effects | B weather + effects without the hook
// The checks are numbers over the footprints of the two quads (mean absolute difference in 8-bit display levels): the weather pass changes the far quad (it is fogged); the effects pass changes the far
// quad (smoke in front of it covers it); the near quad is left alone by the smoke that is behind it while that smoke does show where the quad is not (the hooked depth hides what is behind it);
// every frame calls the hook before the weather pass and the effects pass. The pictures are written for looking at.
//   tools/horde/bench.sh node docs/battle-theatre/app/tests/ext-loader-hook-browser.mjs <outDir> [webgl2|webgpu]
// Output: <outDir>/<api>/<frame>.png, metrics.json, console.log. Exit code 1 when a check fails.
import fs from 'node:fs'; import path from 'node:path';
import { chromium } from '../../../../node_modules/playwright-core/index.mjs';
import { serve } from '../tools/serve.mjs';
import { CASES, specOf } from './weather3d-gpu-cases.mjs';
import { minOf as MO } from '../src/clock.mjs';
import { encodePng, CHROME_ARGS, HOOKS } from './weather3d-gpu-lib.mjs';

const api = process.argv[3] === 'webgpu' ? 'webgpu' : 'webgl2', out = path.join(path.resolve(process.argv[2] || 'tmp/ext-loader-hook'), api); fs.mkdirSync(out, { recursive: true });
const W = 640, H = 360, ENTRY_MS = 1200 * 1000, t00 = Date.now(), say = (...a) => console.log(((Date.now() - t00) / 1000).toFixed(0).padStart(5) + 's', ...a);

// ---- the stand-in module: two billboards from the frame block, in WebGL2 and in WebGPU
const INDEX = `export default ['hook-probe.mjs'];\n`;
const MODULE = `
import { common } from '../../../render/prototype/src/shaders.mjs';
const P = (globalThis.__hookProbe ||= { inits: 0, disposes: 0, scene: 0, order: [], on: false, errors: [], api: null });
const QUADS = [[8, -0.22, 0.05, 0.9, 0.1], [400, 0.22, 0.9, 0.1, 0.8]], HALF = [0.10, 0.12];      // distance, lateral offset (share of the distance), colour; half size (share of the distance)
let off = null, gl = null, prog = null, u = null, pipe = null;
const VS = 'uniform float uD; uniform vec2 uOff; void main() { vec2 c = vec2(float(gl_VertexID & 1) * 2.0 - 1.0, float(gl_VertexID >> 1) * 2.0 - 1.0); vec3 p = cam.xyz + fwdv.xyz * uD + rightv.xyz * (uOff.x + c.x * ' + HALF[0].toFixed(3) + ') * uD + upv.xyz * (c.y * ' + HALF[1].toFixed(3) + ') * uD; gl_Position = vp * vec4(p, 1.0); }';
const FS = 'uniform vec3 uCol; out vec4 o; void main() { o = vec4(uCol, 1.0); }';
const WGSL = \`
struct VO { @builtin(position) pos: vec4f, @location(0) col: vec3f }
@vertex fn vs(@builtin(vertex_index) vi: u32, @builtin(instance_index) ii: u32) -> VO {
  let c = vec2f(f32(vi & 1u) * 2.0 - 1.0, f32(vi >> 1u) * 2.0 - 1.0);
  var q = array<vec4f, 2>(vec4f(\${QUADS[0][0].toFixed(1)}, \${QUADS[0][1].toFixed(3)}, 0.0, 0.0), vec4f(\${QUADS[1][0].toFixed(1)}, \${QUADS[1][1].toFixed(3)}, 0.0, 0.0));
  var k = array<vec3f, 2>(vec3f(\${QUADS[0].slice(2).map(x => x.toFixed(2)).join(',')}), vec3f(\${QUADS[1].slice(2).map(x => x.toFixed(2)).join(',')}));
  let d = q[ii].x; let p = F.cam.xyz + F.fwd.xyz * d + F.right.xyz * (q[ii].y + c.x * \${HALF[0].toFixed(3)}) * d + F.up.xyz * (c.y * \${HALF[1].toFixed(3)}) * d;
  var o: VO; o.pos = F.vp * vec4f(p, 1.0); o.col = k[ii]; return o;
}
@fragment fn fs(v: VO) -> @location(0) vec4f { return vec4f(v.col, 1.0); }\`;
export async function init(c) {
  const host = c.host, R = host.R; P.inits++; P.api = host.api; P.on = false;
  try {
    if (host.api === 'webgl2') { gl = R.gl; prog = R.prog('hook-probe', VS, FS); R.finishProgs(); u = { d: gl.getUniformLocation(prog, 'uD'), off: gl.getUniformLocation(prog, 'uOff'), col: gl.getUniformLocation(prog, 'uCol') }; }
    else { const d = R.dev, mod = d.createShaderModule({ label: 'hook-probe', code: common(R.K) + WGSL });
      pipe = d.createRenderPipeline({ label: 'hook-probe', layout: d.createPipelineLayout({ bindGroupLayouts: [R.g0L] }), vertex: { module: mod, entryPoint: 'vs' }, fragment: { module: mod, entryPoint: 'fs', targets: [{ format: 'rgba16float' }] },
        primitive: { topology: 'triangle-strip', cullMode: 'none' }, depthStencil: { format: 'depth32float', depthWriteEnabled: true, depthCompare: 'less' } }); }
  } catch (e) { P.errors.push(String(e && e.stack || e).slice(0, 600)); throw e; }
  off = host.addSceneHook({ scene(pass, r) {
    P.scene++; P.order.push('hook'); P.lastPass = pass && pass.constructor && pass.constructor.name; P.lastRIsHostR = r === host.R; if (!P.on) return;
    if (host.api === 'webgl2') {                                   // draw, then give back what was changed: program, VAO, culling
      gl.useProgram(prog); gl.bindVertexArray(r.V.empty); gl.disable(gl.CULL_FACE); gl.disable(gl.BLEND); gl.depthMask(true); gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LESS);
      for (const q of QUADS) { gl.uniform1f(u.d, q[0]); gl.uniform2f(u.off, q[1], 0); gl.uniform3f(u.col, q[2], q[3], q[4]); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); }
      gl.enable(gl.CULL_FACE);
    } else { pass.setPipeline(pipe); pass.draw(4, 2); }               // group 0 (the frame block) is bound by the renderer before the hooks are called
  } });
}
export function dispose() { P.disposes++; if (off) off(); off = null; P.on = false; }
`;

const srv = await serve(0), port = srv.address().port, url = `http://127.0.0.1:${port}/app/index.html?history=stub&api=${api}&nearR=12&midR=60`;
const summary = { api, url, w: W, h: H, started: new Date().toISOString(), checks: [], notes: [], errors: [] }; let failed = 0;
const check = (name, ok, detail) => { summary.checks.push({ name, ok: !!ok, detail }); if (!ok) failed++; say((ok ? 'ok   ' : 'FAIL ') + name, ok ? '' : JSON.stringify(detail).slice(0, 400)); };
const save = () => fs.writeFileSync(path.join(out, 'metrics.json'), JSON.stringify({ ...summary, failed }, null, 1));
const logs = []; let browser;
try {
  browser = await chromium.launch({ channel: 'chrome', headless: true, args: CHROME_ARGS });
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 }); await ctx.addInitScript(HOOKS, { realCanvas: false, trace: false }); ctx.setDefaultTimeout(0);
  await ctx.route('**/app/src/ext/**', route => {
    const f = new URL(route.request().url()).pathname.replace(/^.*\/app\/src\/ext\//, ''), js = body => route.fulfill({ status: 200, contentType: 'text/javascript', headers: { 'cache-control': 'no-store' }, body });
    if (f === 'index.mjs') return js(INDEX); if (f === 'hook-probe.mjs') return js(MODULE); return route.fulfill({ status: 404, contentType: 'text/plain', body: 'not found' });
  });
  const page = await ctx.newPage(); page.on('console', m => logs.push(m.type() + ': ' + m.text())); page.on('pageerror', e => logs.push('pageerror: ' + e.message)); page.on('crash', () => logs.push('PAGE CRASH'));
  say('open', url); await page.goto(url, { waitUntil: 'load', timeout: 300000 });
  await page.evaluate(() => document.querySelector('[data-bt-enter]').click());
  await page.waitForFunction(() => window.btApp && (window.btApp.ready || document.querySelector('.loading-card .fail')), null, { timeout: ENTRY_MS, polling: 1000 });
  const entered = await page.evaluate(() => { const a = window.btApp; if (!a || !a.ready) return { ready: false, fail: (document.querySelector('.loading-card') || {}).textContent }; return { ready: true, api: a.api, ext: a.ext.status().map(s => [s.path, s.state, s.error]), index: a.ext.index.state, probe: { ...globalThis.__hookProbe, order: undefined } }; });
  summary.entered = entered; say('entered', JSON.stringify(entered).slice(0, 500)); save(); if (!entered.ready) throw new Error('the theatre did not start: ' + entered.fail);
  check('the stand-in module started and its hook is in the renderer', entered.api === api && entered.index === 'read' && entered.ext.length === 1 && entered.ext[0][1] === 'running' && entered.probe.inits === 1 && entered.probe.api === api, entered);

  // the stand-in plan (smoke in front of the camera) and the picture read-back, as in tests/weather3d-gpu-theatre.mjs
  await page.evaluate(async () => {
    const a = window.btApp, th = a.theatre, host = th.host, R = host.R, { makePlan } = await import('/app/tests/weather3d-gpu-plan.mjs'), fxm = await import('/app/src/fx-host.mjs');
    const P = window.__P = makePlan((x, z) => th.T.h(x, z)); th.fxOn = await fxm.init(host, { environment: th.env, anim: P.anim, choices: () => th.state.scenario.choices, nightFloor: th.state.settings.nightFloor, tier: 'laptop', geo: th.geo });
    const probe = globalThis.__hookProbe, fx = th.fxOn, wrap = (o, k) => { if (!o || typeof o[k] !== 'function') return false; const f = o[k].bind(o); o[k] = (...x) => { probe.order.push('fx'); return f(...x); }; return true; };
    window.__wrapped = wrap(fx.gl, 'draw') || wrap(fx.gpu, 'draw');
    const grabGPU = () => { const d = R.dev, tex = R.ctx.getCurrentTexture(), w = tex.width, h = tex.height, bpr = Math.ceil(w * 4 / 256) * 256, buf = d.createBuffer({ size: bpr * h, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
      const enc = d.createCommandEncoder(); enc.copyTextureToBuffer({ texture: tex }, { buffer: buf, bytesPerRow: bpr }, [w, h]); d.queue.submit([enc.finish()]);
      return buf.mapAsync(GPUMapMode.READ).then(() => { const src = new Uint8Array(buf.getMappedRange()), o = new Uint8Array(w * h * 4), bgra = /^bgra/.test(tex.format); for (let y = 0; y < h; y++) o.set(src.subarray(y * bpr, y * bpr + w * 4), y * w * 4);
        if (bgra) for (let i = 0; i < o.length; i += 4) { const t = o[i]; o[i] = o[i + 2]; o[i + 2] = t; } buf.unmap(); return { w, h, data: o }; }); };
    const grabGL = () => { const gl = R.gl, w = R.W, h = R.H, px = new Uint8Array(w * h * 4); gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px); const o = new Uint8Array(w * h * 4); for (let y = 0; y < h; y++) o.set(px.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4); return { w, h, data: o }; };
    const orig = host.frame.bind(host); host.frame = (t, cam) => { const r = orig(t, cam); if (window.__grab) { window.__grab = false; window.__grabP = host.api === 'webgpu' ? grabGPU() : Promise.resolve(grabGL()); } return r; };
    document.head.insertAdjacentHTML('beforeend', '<style>body *{visibility:hidden !important} canvas.w3d-keep{visibility:visible !important}</style>'); th.els.canvas.classList.add('w3d-keep');
  });
  // the camera and the time of the case 'smoke-jul3-1400': guns 45 m ahead, a volley 30 m ahead, by day
  const spec = specOf(CASES.find(c => c.name === 'smoke-jul3-1400'), MO);
  await page.evaluate(async spec => {
    const { placeCamera } = await import('/app/tests/weather3d-gpu-plan.mjs'), a = window.btApp, th = a.theatre, P = window.__P; a.setTime(spec.tMin); th.controls.flight = null;
    const smp = th.env.sample(spec.tMin, {}); placeCamera(th.cam, spec, { T: th.T, geo: th.geo, smp, line: null }); P.anchor(th.cam, spec.plan); await a.frames(4);
  }, spec);
  const FRAMES = [['H0', false, false, false], ['H1', true, false, false], ['W1', true, true, false], ['F1', true, false, true], ['A', true, true, true], ['B', false, true, true]], pics = {};
  for (const [name, hook, weather, fx] of FRAMES) {
    const r = await page.evaluate(async ([hook, weather, fx]) => {
      const a = window.btApp, th = a.theatre, f = th.fxOn, probe = globalThis.__hookProbe; probe.on = hook; f.opts.drawWeather = weather; f.opts.drawFx = fx; probe.order.length = 0; const s0 = probe.scene;
      await a.frames(3); window.__grab = true; await a.frames(2); const pic = await window.__grabP; let s = ''; const u8 = pic.data; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
      return { w: pic.w, h: pic.h, px: btoa(s), order: probe.order.slice(0, 40), sceneCalls: probe.scene - s0, lastPass: probe.lastPass, lastRIsHostR: probe.lastRIsHostR, t: th.state.t, glStats: f.gl ? { ...f.gl.stats } : null, gpuStats: f.gpu ? { ...f.gpu.stats, failed: f.gpu.failed } : null, nSprites: th.fxInfo && th.fxInfo.effects && th.fxInfo.effects.nSprites };
    }, [hook, weather, fx]);
    const px = Buffer.from(r.px, 'base64'); delete r.px; pics[name] = { w: r.w, h: r.h, d: new Uint8Array(px.buffer, px.byteOffset, px.length), info: r };
    fs.writeFileSync(path.join(out, name + '.png'), encodePng(r.w, r.h, pics[name].d)); say(name, 'scene calls', r.sceneCalls, 'order', r.order.slice(0, 8).join(','), 'sprites', r.nSprites, r.gpuStats ? JSON.stringify(r.gpuStats).slice(0, 120) : r.glStats ? JSON.stringify(r.glStats).slice(0, 120) : '');
  }
  summary.frames = Object.fromEntries(Object.entries(pics).map(([k, v]) => [k, v.info]));
  // ---- the numbers
  const w = pics.H0.w, h = pics.H0.h, maxDiff = (p, q, i) => Math.max(Math.abs(p[i] - q[i]), Math.abs(p[i + 1] - q[i + 1]), Math.abs(p[i + 2] - q[i + 2]));
  const mask = { near: [], far: [] }; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = (y * w + x) * 4; if (maxDiff(pics.H0.d, pics.H1.d, i) > 6) mask[x < w / 2 ? 'near' : 'far'].push(i); }
  const mean = (p, q, M) => M.length ? +(M.reduce((s, i) => s + (Math.abs(p[i] - q[i]) + Math.abs(p[i + 1] - q[i + 1]) + Math.abs(p[i + 2] - q[i + 2])) / 3, 0) / M.length).toFixed(3) : NaN;
  const mx = (p, q, M) => M.reduce((s, i) => Math.max(s, maxDiff(p, q, i)), 0), d = k => pics[k].d;
  const N = {
    footprint: { near: mask.near.length, far: mask.far.length },
    fogFar: mean(d('H1'), d('W1'), mask.far), fogNear: mean(d('H1'), d('W1'), mask.near),                    // weather pass on the hooked quads
    smokeFar: mean(d('W1'), d('A'), mask.far), smokeFarOnly: mean(d('H1'), d('F1'), mask.far),               // effects pass on the far quad
    nearAfterAll: mean(d('H1'), d('A'), mask.near), nearAfterAllMax: mx(d('H1'), d('A'), mask.near),        // the near quad with everything drawn after it
    smokeBehindNear: mean(d('H0'), d('B'), mask.near),                                                       // what the effects put there when the near quad is not
  };
  summary.numbers = N; say('numbers', JSON.stringify(N));
  check('both quads were drawn by the hook (the footprints are not empty)', N.footprint.near > 500 && N.footprint.far > 500, N.footprint);
  check('every frame called the hook, and before the effects pass (the order of the calls is hook, fx, hook, fx, ...)', FRAMES.every(([k, hook, weather, fx]) => { const o = pics[k].info.order, n = pics[k].info.sceneCalls; return n >= 3 && o[0] === 'hook' && (!fx || o.every((x, i) => x === (i % 2 ? 'fx' : 'hook'))); }), Object.fromEntries(FRAMES.map(([k]) => [k, pics[k].info.order.slice(0, 6)])));
  check(api === 'webgl2' ? 'the hook is given the WebGL2 context and the renderer' : 'the hook is given the render pass encoder and the renderer', api === 'webgl2' ? pics.A.info.lastPass === 'WebGL2RenderingContext' && pics.A.info.lastRIsHostR : pics.A.info.lastPass === 'GPURenderPassEncoder' && pics.A.info.lastRIsHostR, pics.A.info.lastPass);
  check('the weather pass drew over the hooked far quad (fogged): the picture differs from the hook-only picture there', N.fogFar > 1.0, N);
  check('the effects pass drew over the hooked far quad (smoke in front of it covers it)', N.smokeFar > 1.0, N);
  check('the hooked depth hides what is behind it: where the near quad is, the smoke that shows without the quad does not show', N.smokeBehindNear > 3 * Math.max(N.nearAfterAll, 0.5) && N.nearAfterAllMax <= 24, N);
  summary.diag = await page.evaluate(() => ({ gpuErrors: window.__gpuErrors || [], wgsl: window.__wgslMessages || [], modules: window.__gpuLabels || [], probeErrors: globalThis.__hookProbe.errors, wrapped: window.__wrapped }));
  check('no WebGPU error, no compiler message, no error of the stand-in module', (summary.diag.gpuErrors || []).length === 0 && (summary.diag.wgsl || []).filter(m => m.type === 'error').length === 0 && summary.diag.probeErrors.length === 0 && summary.diag.wrapped === true, summary.diag);
  await page.evaluate(() => document.querySelector('#bt-back').click()); await page.waitForFunction(() => !window.btApp, null, { timeout: 120000 }).catch(() => {});
  const bk = await page.evaluate(() => ({ disposes: globalThis.__hookProbe.disposes, scene: globalThis.__hookProbe.scene })); await page.waitForTimeout(1000); const bk2 = await page.evaluate(() => ({ disposes: globalThis.__hookProbe.disposes, scene: globalThis.__hookProbe.scene }));
  check('Back: the module is disposed once and its hook is called no more', bk.disposes === 1 && bk2.scene === bk.scene, { bk, bk2 });
} catch (e) { summary.errors.push(String((e && e.stack) || e).slice(0, 2000)); say('ERROR', String(e).slice(0, 400)); failed++; }
finally {
  summary.finished = new Date().toISOString(); summary.consoleLines = logs.length; summary.consoleProblems = logs.filter(l => /error|fail|invalid|validation|lost|crash/i.test(l)).slice(0, 40); save();
  fs.writeFileSync(path.join(out, 'console.log'), logs.join('\n')); try { await browser.close(); } catch { /* gone */ } srv.close();
}
say('done', summary.checks.filter(c => c.ok).length + ' of ' + summary.checks.length + ' checks passed;', 'errors', summary.errors.length, 'console problems', summary.consoleProblems.length);
process.exit(failed ? 1 : 0);
