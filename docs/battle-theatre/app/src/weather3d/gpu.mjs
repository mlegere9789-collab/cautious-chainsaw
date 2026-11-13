// WebGPU side of the weather layer and of the fx3d particle pass: the twin of gl.mjs. Pipelines, buffers, uniforms, and ONE render pass that runs after the prototype renderer's scene pass
// (through its `ext.after` hook, before bloom and post): colour = the HDR target (loaded), depth = the scene depth attached read-only and sampled in the same pass, so no depth copy is needed.
// In that pass: the two weather draws (multiply, then add) and one instanced draw of the fx3d sprites, in the same order and with the same blend states as the WebGL2 path.
// The inputs are the same objects the WebGL2 path takes (WeatherTimeline state, fx3d frame, prototype Camera), so the same simulation time and camera give the same sprites and the same uniforms.
import { weatherWgsl, patchFxWgsl, WU, WU_FLOATS, WU_BYTES } from './shaders-wgsl.mjs';
import { MAX_LIGHTS } from './shaders.mjs';
import { WGSL_RENDER } from '../fx3d/shaders.mjs';
import { WIND_HIST_N } from '../fx3d/wind.mjs';
import { LIGHT_STRIDE } from '../fx3d/lights.mjs';
import { GSTRIDE } from '../fx3d/pack.mjs';
import { LAT_DEG } from './timeline.mjs';
import { val } from './params.mjs';

// WebGPU flag values (fixed by the specification); the globals are used when they exist
const SS = () => globalThis.GPUShaderStage || { VERTEX: 1, FRAGMENT: 2, COMPUTE: 4 };
const BU = () => globalThis.GPUBufferUsage || { MAP_READ: 1, MAP_WRITE: 2, COPY_SRC: 4, COPY_DST: 8, INDEX: 16, VERTEX: 32, UNIFORM: 64, STORAGE: 128, INDIRECT: 256, QUERY_RESOLVE: 512 };
const MAP_READ = () => (globalThis.GPUMapMode ? globalThis.GPUMapMode.READ : 1);

export const FXU_FLOATS = 48, FXU = { vp: 0, cam: 16, right: 20, up: 24, sun: 28, light: 32, kappa: 36, extra: 40, now: 44 };      // the uniform block U of fx3d WGSL_RENDER, in float32 units
export const fxWgsl = () => patchFxWgsl(WGSL_RENDER);
// blend states: the same factors gl.mjs sets with blendFuncSeparate
export const BLEND = {
  mul: { color: { operation: 'add', srcFactor: 'zero', dstFactor: 'src' }, alpha: { operation: 'add', srcFactor: 'zero', dstFactor: 'one' } },
  add: { color: { operation: 'add', srcFactor: 'one', dstFactor: 'one' }, alpha: { operation: 'add', srcFactor: 'zero', dstFactor: 'one' } },
  fx: { color: { operation: 'add', srcFactor: 'one', dstFactor: 'one-minus-src-alpha' }, alpha: { operation: 'add', srcFactor: 'one', dstFactor: 'one-minus-src-alpha' } },
};

// the weather uniform block: the values gl.mjs `_setWeather` sends, at the offsets of WU. W: WeatherTimeline state, fr: fx3d frame or null
export function packWeather(out, W, fr) {
  const sk = W.sky, pal = sk.palette, st = sk.stars, cl = W.cloud, g = W.ground, f = W.fog, lat = LAT_DEG * Math.PI / 180;
  const s3 = (o, v) => { out[o] = v[0]; out[o + 1] = v[1]; out[o + 2] = v[2]; out[o + 3] = 0; }, s4 = (o, a, b, c, d) => { out[o] = a; out[o + 1] = b; out[o + 2] = c; out[o + 3] = d; };
  s3(WU.sunDir, sk.sunDir); s3(WU.moonDir, sk.moonDir); s4(WU.moon, sk.moonIllum / 100, val('moon.radiance'), 0.0045 * val('moon.disc_scale'), sk.moonUp ? 1 : 0);
  s3(WU.zen, pal.zenith); s3(WU.hor, pal.horizon); s3(WU.sunCol, pal.sunCol); s4(WU.sky, pal.sunVis, val('sun.glow_gain'), sk.dayW, 0);
  s3(WU.tw, pal.twilightWarm); s3(WU.floor, pal.floor); s3(WU.cLit, pal.cloudLit); s3(WU.cShade, pal.cloudShade);
  s4(WU.cloud, cl.cover, cl.altitude, cl.scale, cl.softness); s4(WU.cOff, cl.driftCellsX, cl.driftCellsZ, 0, 0);
  s4(WU.stars, st.visibility, st.density, st.fraction, st.gain); s4(WU.starAxis, 0, Math.sin(lat), -Math.cos(lat), st.rotation);
  s4(WU.fog, f.extra, f.scaleHeight, 0, 0); s4(WU.fogCol, pal.horizon[0] * 0.92, pal.horizon[1] * 0.92, pal.horizon[2] * 0.92, 0); s4(WU.proto, 1, 0.00006, 0.85, 0.9);
  s4(WU.wet, g.albedoMul, g.puddle, g.puddleDarken, g.puddleScale); s4(WU.ground, g.tolerance, 0.012, 0, 0);
  const gain = val('light.flash_gain'), nl = Math.min(fr ? fr.nLights : 0, MAX_LIGHTS); out.fill(0, WU.lpos, WU.lpos + MAX_LIGHTS * 8); s4(WU.nl, nl, 0, 0, 0);
  for (let i = 0; i < nl; i++) { const o = i * LIGHT_STRIDE, L = fr.lights, I = L[o + 4] * gain, p = WU.lpos + i * 4, c = WU.lcol + i * 4; out[p] = L[o]; out[p + 1] = L[o + 1]; out[p + 2] = L[o + 2]; out[p + 3] = L[o + 3]; out[c] = L[o + 5] * I; out[c + 1] = L[o + 6] * I; out[c + 2] = L[o + 7] * I; out[c + 3] = 0; }
  return out;
}
// the sprite uniform block: the values gl.mjs sends to the fx3d program. vp: this frame's view-projection in WebGPU clip space (Camera.vp)
export function packFx(out, fr, cam, vp) {
  const lt = fr.env.lighting, r = cam.right(), u = cam.up(), s = lt.directDir; out.set(vp, FXU.vp);
  out[16] = cam.x; out[17] = cam.y; out[18] = cam.z; out[19] = 0; out[20] = r[0]; out[21] = r[1]; out[22] = r[2]; out[23] = 0; out[24] = u[0]; out[25] = u[1]; out[26] = u[2]; out[27] = 0; out[28] = s[0]; out[29] = s[1]; out[30] = s[2]; out[31] = 0;
  out[32] = lt.ambient; out[33] = lt.direct; out[34] = lt.albedo; out[35] = lt.g; out[36] = fr.kappa[0]; out[37] = fr.kappa[1]; out[38] = 0; out[39] = 0;
  out[40] = lt.floor; out[41] = 1; out[42] = cam.near; out[43] = cam.far; out[44] = fr.now; out[45] = 0; out[46] = fr.nEvents; out[47] = 0;
  return out;
}

// Nothing the layer installs may wait for ever on the device: every promise of the set-up is given a bound, and what does not come in time is reported and treated as "not built" (the prototype keeps drawing the
// sky and the particles), never as a stalled entry. The defaults are generous (a software adapter compiles slowly); tests pass small ones.
const TIMED_OUT = Symbol('not delivered in time');
const within = (p, ms) => new Promise(res => { const t = setTimeout(() => res(TIMED_OUT), ms); Promise.resolve(p).then(v => { clearTimeout(t); res(v); }, () => { clearTimeout(t); res(TIMED_OUT); }); });
export const WAIT_MS = { pipelines: 60000, scope: 10000, info: 3000 };

export class GPUPasses {
  // R: the prototype GPURenderer (dev, g0L, bg0, hdr, hdrV, depth, depthV, depthRT, hasTS, track, mem). The promise resolves when the pipelines are compiled (or have failed: see ok, weatherOk, fxOk, log).
  static async create(R, o = {}) { const g = new GPUPasses(R, o); await g._build(); return g; }
  constructor(R, { maxEvents, timing = true, waitMs } = {}) {
    this.R = R; this.waitMs = { ...WAIT_MS, ...(waitMs || {}) }; this.d = R.dev; this.log = []; this.warnings = []; this.ok = false; this.weatherOk = false; this.fxOk = false; this.failed = null; this.maxEvents = maxEvents; this.timing = timing && !!R.hasTS; this.bytes = 0; this.tracked = [];
    this.wu = new Float32Array(WU_FLOATS); this.fu = new Float32Array(FXU_FLOATS); this._dv = null; this.bgW = null; this.bgFx = null; this.reads = []; this.qs = null;
    this.stats = { weatherDraws: 0, fxDraws: 0, spritesDrawn: 0, passes: 0, binds: 0, passMs: null, passMsN: 0, gpuErrors: 0 };
  }
  _buf(name, size, usage) { const b = this.d.createBuffer({ label: 'weather3d.' + name, size: Math.max(16, (size + 3) & ~3), usage }); this.bytes += size; this.tracked.push([name, size]); if (this.R.track) this.R.track('buffers', 'weather3d.' + name, size); return b; }
  async _build() {
    const d = this.d, R = this.R, S = SS(), U = BU(), n = this.maxEvents + 64, HDR = (R.hdr && R.hdr.format) || 'rgba16float', DF = (R.depth && R.depth.format) || 'depth32float';
    // an error on this device that names one of this layer's objects stops the layer (fx-host then gives the sky and the particles back to the prototype)
    this._onErr = e => { const m = String((e && e.error && e.error.message) || e); if (/weather3d|fx3d/.test(m)) { this.stats.gpuErrors++; if (!this.failed) { this.failed = m.slice(0, 400); this.log.push('WebGPU error in the weather or effects pass: ' + this.failed); } } };
    if (d.addEventListener) d.addEventListener('uncapturederror', this._onErr);
    let pending = [], scope = null, mods = {};
    if (d.pushErrorScope) d.pushErrorScope('validation');
    try {
      this.bglW = d.createBindGroupLayout({ label: 'weather3d.bglW', entries: [{ binding: 0, visibility: S.FRAGMENT, buffer: { type: 'uniform' } }, { binding: 1, visibility: S.FRAGMENT, texture: { sampleType: 'depth' } }] });
      this.bglF = d.createBindGroupLayout({ label: 'fx3d.bgl', entries: [{ binding: 0, visibility: S.VERTEX | S.FRAGMENT, buffer: { type: 'uniform' } }, ...[1, 2, 3].map(b => ({ binding: b, visibility: S.VERTEX, buffer: { type: 'read-only-storage' } })), { binding: 4, visibility: S.FRAGMENT, texture: { sampleType: 'depth' } }] });
      this.ubW = this._buf('uniforms', WU_BYTES, U.UNIFORM | U.COPY_DST); this.ubF = this._buf('fx uniforms', FXU_FLOATS * 4, U.UNIFORM | U.COPY_DST);
      this.evB = this._buf('fx events', n * GSTRIDE * 4, U.STORAGE | U.COPY_DST); this.cumB = this._buf('fx cumulative', (n + 1) * 4, U.STORAGE | U.COPY_DST); this.windB = this._buf('fx wind history', WIND_HIST_N * 8, U.STORAGE | U.COPY_DST);
      const mod = (label, code) => { const m = d.createShaderModule({ label, code }); mods[label] = m; return m; };
      const mMul = mod('weather3d-mul', weatherWgsl('mul')), mAdd = mod('weather3d-add', weatherWgsl('add')), mFx = mod('fx3d-sprites', fxWgsl());
      const plW = d.createPipelineLayout({ label: 'weather3d.layout', bindGroupLayouts: [R.g0L, this.bglW] }), plF = d.createPipelineLayout({ label: 'fx3d.layout', bindGroupLayouts: [this.bglF] });
      const full = (m, label, blend) => ({ label, layout: plW, vertex: { module: m, entryPoint: 'vs' }, fragment: { module: m, entryPoint: 'fs', targets: [{ format: HDR, blend }] }, primitive: { topology: 'triangle-list' }, depthStencil: { format: DF, depthWriteEnabled: false, depthCompare: 'always' } });
      this.desc = { mul: full(mMul, 'weather3d-mul', BLEND.mul), add: full(mAdd, 'weather3d-add', BLEND.add),
        fx: { label: 'fx3d-sprites', layout: plF, vertex: { module: mFx, entryPoint: 'vs' }, fragment: { module: mFx, entryPoint: 'fs', targets: [{ format: HDR, blend: BLEND.fx }] }, primitive: { topology: 'triangle-strip', cullMode: 'none' }, depthStencil: { format: DF, depthWriteEnabled: false, depthCompare: 'less' } } };
      const make = k => d.createRenderPipelineAsync(this.desc[k]).then(p => p, e => { this.log.push(this.desc[k].label + ' pipeline failed: ' + String((e && e.message) || e).slice(0, 600)); return null; });
      pending = [make('mul'), make('add'), make('fx')];
      if (this.timing) { this.qs = d.createQuerySet({ label: 'weather3d.timing', type: 'timestamp', count: 2 }); this.qResolve = d.createBuffer({ label: 'weather3d.timing resolve', size: 16, usage: U.QUERY_RESOLVE | U.COPY_SRC }); this.reads = [0, 1, 2].map(i => ({ b: d.createBuffer({ label: 'weather3d.timing read ' + i, size: 16, usage: U.MAP_READ | U.COPY_DST }), state: 'free' })); }
    } catch (e) { this.log.push('weather3d/fx3d WebGPU set-up threw: ' + String((e && e.message) || e).slice(0, 600)); }
    if (d.popErrorScope) scope = d.popErrorScope();                                   // popped in the same task as it was pushed: it holds this set-up's validation errors and nobody else's
    const W = this.waitMs, got = await Promise.all([0, 1, 2].map(i => (pending[i] ? within(pending[i], W.pipelines) : null)));
    ['weather3d-mul', 'weather3d-add', 'fx3d-sprites'].forEach((n, i) => { if (got[i] === TIMED_OUT) { got[i] = null; this.log.push(n + ' pipeline was not ready after ' + W.pipelines / 1000 + ' s: the prototype keeps what it draws'); } });
    [this.pMul, this.pAdd, this.pFx] = got;
    try { const err = scope ? await within(scope, W.scope) : null; if (err === TIMED_OUT) this.warnings.push('the validation scope of the set-up was not delivered in ' + W.scope / 1000 + ' s'); else if (err) this.log.push('weather3d/fx3d WebGPU validation error at set-up: ' + String(err.message).slice(0, 600)); } catch { /* the device went away */ }
    const infos = await Promise.all(Object.entries(mods).map(([label, m]) => within((() => { try { return m.getCompilationInfo ? m.getCompilationInfo() : { messages: [] }; } catch (e) { return Promise.reject(e); } })(), W.info).then(info => ({ label, info }))));
    for (const { label, info } of infos) { if (info === TIMED_OUT) { this.warnings.push(label + ': the compiler messages were not delivered in ' + W.info / 1000 + ' s; the layer carries on'); continue; } for (const x of info.messages || []) { const line = `${label} ${x.type} ${x.lineNum}:${x.linePos} ${x.message}`; (x.type === 'error' ? this.log : this.warnings).push(line.slice(0, 500)); } }
    this.weatherOk = !!(this.pMul && this.pAdd && this.ubW && this.bglW); this.fxOk = !!(this.pFx && this.evB && this.cumB && this.windB && this.bglF); this.ok = this.weatherOk || this.fxOk;
    return this;
  }
  // bind groups hold the renderer's depth view, which is recreated on every resize
  _bind() {
    const d = this.d, R = this.R; this._dv = R.depthV; this.stats.binds++;
    if (this.weatherOk) this.bgW = d.createBindGroup({ label: 'weather3d.bg', layout: this.bglW, entries: [{ binding: 0, resource: { buffer: this.ubW } }, { binding: 1, resource: R.depthV }] });
    if (this.fxOk) this.bgFx = d.createBindGroup({ label: 'fx3d.bg', layout: this.bglF, entries: [{ binding: 0, resource: { buffer: this.ubF } }, { binding: 1, resource: { buffer: this.evB } }, { binding: 2, resource: { buffer: this.cumB } }, { binding: 3, resource: { buffer: this.windB } }, { binding: 4, resource: R.depthV }] });
  }
  _uploadFx(fr, cam) {
    const q = this.d.queue, n = fr.nEvents;
    q.writeBuffer(this.evB, 0, fr.events, 0, n * GSTRIDE); q.writeBuffer(this.cumB, 0, fr.cum, 0, n + 1); q.writeBuffer(this.windB, 0, fr.windHist, 0, WIND_HIST_N * 2);
    q.writeBuffer(this.ubF, 0, packFx(this.fu, fr, cam, cam.vp));
  }
  // GPU time of the pass (timestamp queries, where the device has them): the result of an earlier frame is read here, after that frame was submitted
  _collectTiming() {
    for (const s of this.reads) if (s.state === 'written') { s.state = 'mapping';
      s.b.mapAsync(MAP_READ()).then(() => { const a = new BigUint64Array(s.b.getMappedRange().slice(0)); s.b.unmap(); s.state = 'free'; const ms = Number(a[1] - a[0]) / 1e6; if (ms >= 0 && ms < 1e4) { this.stats.passMs = ms; this.stats.passMsN++; } }, () => { s.state = 'free'; }); }
  }
  // draw into the frame's command encoder: weather (2 full-screen draws), then the sprites. W: WeatherTimeline state, fr: fx3d frame (or null), cam: prototype Camera (already updated for this frame). Returns true when a pass was encoded.
  draw(enc, W, fr, cam, flags = { weather: true, fx: true }) {
    const R = this.R; if (!this.ok || !W || this.failed) return false;
    const doW = !!(flags.weather && this.weatherOk), doF = !!(flags.fx && this.fxOk && fr && fr.nSprites > 0); if (!doW && !doF) return false;
    if (this._dv !== R.depthV) this._bind();
    if (doW) this.d.queue.writeBuffer(this.ubW, 0, packWeather(this.wu, W, fr));
    if (doF) this._uploadFx(fr, cam);
    let slot = null; if (this.qs) { this._collectTiming(); slot = this.reads.find(s => s.state === 'free') || null; }
    const p = enc.beginRenderPass({ label: 'weather3d+fx3d', colorAttachments: [{ view: R.hdrV, loadOp: 'load', storeOp: 'store' }], depthStencilAttachment: { view: R.depthRT, depthReadOnly: true }, timestampWrites: slot ? { querySet: this.qs, beginningOfPassWriteIndex: 0, endOfPassWriteIndex: 1 } : undefined });
    try {
      if (doW) { p.setBindGroup(0, R.bg0, [0]); p.setBindGroup(1, this.bgW); p.setPipeline(this.pMul); p.draw(3); p.setPipeline(this.pAdd); p.draw(3); this.stats.weatherDraws++; }
      if (doF) { p.setPipeline(this.pFx); p.setBindGroup(0, this.bgFx); p.draw(4, fr.nSprites); this.stats.fxDraws++; this.stats.spritesDrawn = fr.nSprites; }
    } finally { p.end(); }
    if (slot) { enc.resolveQuerySet(this.qs, 0, 2, this.qResolve, 0); enc.copyBufferToBuffer(this.qResolve, 0, slot.b, 0, 16); slot.state = 'written'; }
    this.stats.passes++; return true;
  }
  dispose() {
    const d = this.d, R = this.R; this.ok = false; this.weatherOk = false; this.fxOk = false;
    if (d && d.removeEventListener && this._onErr) d.removeEventListener('uncapturederror', this._onErr);
    for (const b of [this.ubW, this.ubF, this.evB, this.cumB, this.windB, this.qResolve, ...this.reads.map(s => s.b)]) { try { if (b) b.destroy(); } catch { /* already gone with the device */ } }
    try { if (this.qs) this.qs.destroy(); } catch { /* gone */ }
    if (R && R.mem && R.mem.items) for (const [name, size] of this.tracked) { R.mem.buffers -= size; const k = 'weather3d.' + name; if (R.mem.items[k] != null) { R.mem.items[k] -= size; if (R.mem.items[k] <= 0) delete R.mem.items[k]; } }
    this.tracked = []; this.bgW = null; this.bgFx = null; this.pMul = this.pAdd = this.pFx = null; this.qs = null; this.reads = [];
  }
}
export { WU, WU_FLOATS, MAX_LIGHTS };
