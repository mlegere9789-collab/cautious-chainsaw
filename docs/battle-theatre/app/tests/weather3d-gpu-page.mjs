// Harness page of tests/weather3d-gpu.mjs: the prototype renderer (WebGPU or WebGL2) under the Battle Theatre's render host, with fx-host (weather and effects) installed exactly as the shell installs it,
// and nothing else around it (no history layer, no crowd). The driver calls window.WG.render(spec) for each case; one call = one frame at the given simulation time and camera, read back from
// the renderer's last target in the same task (WebGPU: copyTextureToBuffer of the texture that stands in for the canvas texture, see HOOKS in weather3d-gpu-lib.mjs; WebGL2: readPixels of the default
// framebuffer), so the picture does not depend on the page compositor, which this machine's software adapter cannot serve.
// Same time and camera give the same pixels (the driver checks that). Light and sky follow the same calls as theatre.mjs (env.sample, env.weatherAt, env.light, host.setLight).
import { URLS } from '../src/config.mjs';
import { loadTerrain, buildWorld } from '../../render/prototype/src/world.mjs';
import { Camera } from '../../render/prototype/src/camera.mjs';
import { RenderHost } from '../src/render-host.mjs';
import { makeGeo } from '../src/geo.mjs';
import { Environment } from '../src/environment.mjs';
import { minOf } from '../src/clock.mjs';
import * as fxHost from '../src/fx-host.mjs';
import { makePlan, placeCamera } from './weather3d-gpu-plan.mjs';

const Q = new URLSearchParams(location.search);
const API = Q.get('api') === 'webgl2' ? 'webgl2' : 'webgpu', W = +Q.get('w') || 640, H = +Q.get('h') || 360, SOLD = +Q.get('soldiers') || 12000;
const TIER = Q.get('tier') || 'laptop', FXON = Q.get('fx') !== 'off';
const WG = window.WG = { api: API, ready: false, error: null, log: [], w: W, h: H, minOf };
const getJSON = async u => { const r = await fetch(u); if (!r.ok) throw new Error(u + ' ' + r.status); return r.json(); };
const b64 = u8 => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
const raf = () => new Promise(r => requestAnimationFrame(() => r()));

// ---- a stand-in anim plan (tests/weather3d-gpu-plan.mjs): deterministic events that exercise every effect type
let world = null, T = null; const gy = (x, z) => (T ? T.h(x, z) : 0), P = makePlan(gy), anim = P.anim;

// ---- set-up
async function setup() {
  T = await loadTerrain(URLS.proto); world = buildWorld(T, { total: SOLD, horses: 400, gunRate: 1 }); WG.world = world; WG.T = T; WG.geo = makeGeo(T);
  const [eph, wxf] = await Promise.all([getJSON(URLS.env + 'ephemeris_1863.json'), getJSON(URLS.env + 'weather_timeline.json')]); WG.env = new Environment(eph, wxf);
  const canvas = document.getElementById('c'); canvas.width = W; canvas.height = H; WG.canvas = canvas;
  const ropts = { base: URLS.proto, nearQ: 1, midQ: 0.35, nearR: 12, midR: 60, shadowSize: 1024, midMode: 'vat', fxAlpha: 0.75, exposure: 1 };
  WG.host = await RenderHost.create({ canvas, world, api: API, opts: ropts, replaceCanvas: () => canvas }); WG.host.resize(W, H); WG.cam = new Camera();
  WG.log.push('renderer api ' + WG.host.api + (WG.host.log.length ? ' (' + WG.host.log.join('; ') + ')' : ''));
  if (FXON) WG.fx = await fxHost.init(WG.host, { environment: WG.env, anim, choices: () => WG.choices || {}, nightFloor: 0.34, tier: TIER, geo: WG.geo });
  WG.flags0 = { ...WG.host.R.o.flags }; WG.ready = true;
}
setup().catch(e => { WG.error = String((e && e.stack) || e); console.error('harness set-up failed', e); });

// ---- the picture: read the frame's last target back in the same task as the frame
function grabGPU(R) {
  const d = R.dev, tex = R.ctx.getCurrentTexture(), w = tex.width, h = tex.height, bpr = Math.ceil(w * 4 / 256) * 256;
  const buf = d.createBuffer({ label: 'harness readback', size: bpr * h, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
  const enc = d.createCommandEncoder(); enc.copyTextureToBuffer({ texture: tex }, { buffer: buf, bytesPerRow: bpr }, [w, h]); d.queue.submit([enc.finish()]);
  return buf.mapAsync(GPUMapMode.READ).then(() => {
    const src = new Uint8Array(buf.getMappedRange()), out = new Uint8Array(w * h * 4), bgra = /^bgra/.test(tex.format);
    for (let y = 0; y < h; y++) { const row = src.subarray(y * bpr, y * bpr + w * 4); out.set(row, y * w * 4); }
    if (bgra) for (let i = 0; i < out.length; i += 4) { const t = out[i]; out[i] = out[i + 2]; out[i + 2] = t; }
    buf.unmap(); buf.destroy(); return { w, h, format: tex.format, data: out };
  });
}
function grabGL(R) {
  const gl = R.gl, w = R.W, h = R.H, px = new Uint8Array(w * h * 4); gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
  const out = new Uint8Array(w * h * 4); for (let y = 0; y < h; y++) out.set(px.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4);
  return Promise.resolve({ w, h, format: 'rgba8unorm', data: out });
}

// ---- one case. spec: { name, tMin, at: 'line'|'field'|'lnglat'|'xz', h (height above ground, m), look: 'sun'|'moon'|[yaw, pitch]|'point', fov (deg), plan: {guns, volleys, falls, march}, choices, flags: {weather, fx}, x, z, lng, lat, dist, target: [lng, lat] }
const sample = {}, light = {};
WG.render = async function (spec) {
  if (!WG.ready) throw new Error('the harness is not ready: ' + WG.error);
  const host = WG.host, R = host.R, cam = WG.cam, env = WG.env, L = world.show.line, tMin = spec.tMin, tSec = tMin * 60; WG.choices = spec.choices || {};
  const smp = env.sample(tMin, sample), wx = env.weatherAt(tMin, WG.choices), lt = env.light(smp, { nightFloor: 0.34 }, wx, light); host.setLight(lt.sunDir, lt.exposure);
  placeCamera(cam, spec, { T, geo: WG.geo, smp, line: L });
  P.anchor(cam, spec.plan);                                 // the stand-in plan is anchored at the camera and looks where it looks
  const fi = FXON ? fxHost.instance() : null; if (fi) { fi.opts.drawWeather = spec.flags ? spec.flags.weather !== false : true; fi.opts.drawFx = spec.flags ? spec.flags.fx !== false : true; }
  let info = null; if (FXON) { info = fxHost.update({ tMin, cam }); info = fxHost.update({ tMin, cam }); }
  const animT = 40 + (tMin * 60) % 7200, dev = R.dev || null;
  // the frame runs inside an animation frame, as in the shell
  const res = await new Promise((resolve, reject) => requestAnimationFrame(() => {
    try {
      if (dev) dev.pushErrorScope('validation');
      const t0 = performance.now(), st = host.frame(animT, cam), t1 = performance.now();
      const pend = API === 'webgpu' ? grabGPU(R) : grabGL(R), scope = dev ? dev.popErrorScope() : Promise.resolve(null);
      resolve({ st, ms: t1 - t0, pend, scope });
    } catch (e) { reject(e); }
  }));
  const [pic, err] = await Promise.all([res.pend, res.scope]); if (dev) await dev.queue.onSubmittedWorkDone();
  const f = host.R.o.flags, gpu = fi && fi.gpu ? fi.gpu : null, gl = fi && fi.gl ? fi.gl : null;
  return { name: spec.name, api: API, tMin, w: pic.w, h: pic.h, format: pic.format, px: b64(pic.data), frameMs: res.ms, validation: err ? String(err.message || err).slice(0, 1200) : null,
    sun: { alt: smp.sunAlt, az: smp.sunAz }, moon: { alt: smp.moonAlt, az: smp.moonAz, illum: smp.moonIllum, up: smp.moonUp }, exposure: lt.exposure, dayW: lt.dayW, cam: { x: cam.x, y: cam.y, z: cam.z, yaw: cam.yaw, pitch: cam.pitch, fovDeg: cam.fov * 180 / Math.PI },
    flags: { sky: f.sky, particles: f.particles }, driveState: info && info.driveState, weather: info && { cover: info.weather.cloud.cover, stars: info.weather.sky.stars.visibility, wet: info.weather.wetness.v, visM: info.weather.fog.visibilityM, floor: info.weather.sky.palette.floor },
    effects: info && { nEvents: info.effects.nEvents, nSprites: info.effects.nSprites, live: info.effects.liveEvents, fires: info.effects.fires, uncertain: info.effects.uncertainFires, text: info.effects.text },
    gpuStats: gpu ? { ...gpu.stats, ok: gpu.ok, weatherOk: gpu.weatherOk, fxOk: gpu.fxOk, failed: gpu.failed } : null, glStats: gl ? { ...gl.stats, ok: gl.ok, weatherOk: gl.weatherOk, fxOk: gl.fxOk } : null, hostLog: info ? info.log.slice(0, 6) : [] };
};
WG.diag = () => { const fi = FXON ? fxHost.instance() : null; return { api: WG.host && WG.host.api, hostLog: WG.host ? WG.host.log : [], flags0: WG.flags0, flags: WG.host ? { ...WG.host.R.o.flags } : null, fxLog: fi ? fi.log : null,
  gpu: fi && fi.gpu ? { ok: fi.gpu.ok, weatherOk: fi.gpu.weatherOk, fxOk: fi.gpu.fxOk, failed: fi.gpu.failed, log: fi.gpu.log, warnings: fi.gpu.warnings, bytes: fi.gpu.bytes } : null, gl: fi && fi.gl ? { ok: fi.gl.ok, log: fi.gl.log } : null,
  adapter: WG.host && WG.host.info, gpuErrors: window.__gpuErrors || [], wgsl: window.__wgslMessages || [], modules: window.__gpuLabels || [] }; };
WG.checkCompute = async () => {               // the optional GPU-cull compute shader of fx3d (WGSL_COMPUTE): is it valid WGSL, and does a pipeline build with the device's limits?
  const R = WG.host && WG.host.R, d = R && R.dev; if (!d) return { skipped: 'no WebGPU device' };
  const { WGSL_COMPUTE } = await import('../src/fx3d/shaders.mjs'); d.pushErrorScope('validation');
  const m = d.createShaderModule({ label: 'fx3d-compute-check', code: WGSL_COMPUTE }), info = await m.getCompilationInfo(); let pipe = null, err = null;
  try { pipe = await d.createComputePipelineAsync({ label: 'fx3d-cullCount-check', layout: 'auto', compute: { module: m, entryPoint: 'cullCount' } }); } catch (e) { err = String((e && e.message) || e).slice(0, 700); }
  const sc = await d.popErrorScope(); const lim = d.limits;
  return { messages: info.messages.map(x => ({ type: x.type, line: x.lineNum, col: x.linePos, msg: String(x.message).slice(0, 300) })), pipelineOk: !!pipe, pipelineError: err, validation: sc ? String(sc.message).slice(0, 700) : null, limits: { maxComputeInvocationsPerWorkgroup: lim.maxComputeInvocationsPerWorkgroup, maxComputeWorkgroupSizeX: lim.maxComputeWorkgroupSizeX } };
};
WG.resize = async (w, h) => { WG.host.resize(w, h); WG.w = w; WG.h = h; };
WG.dispose = async () => { try { fxHost.dispose(); } catch (e) { WG.log.push('fx dispose: ' + e.message); } try { WG.host.destroy(); } catch (e) { WG.log.push('host destroy: ' + e.message); } };
