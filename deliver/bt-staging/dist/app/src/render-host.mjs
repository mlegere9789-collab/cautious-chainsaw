// Wraps the prototype renderers (render/prototype/src/webgpu.mjs and webgl2.mjs, imported unchanged). The prototype's page entry (main.mjs) cannot be imported:
// it runs on import, awaits at top level, adds window listeners and keeps no handle to undo anything. So this file does the same orchestration with a
// teardown: the GPU device is destroyed, the canvas context is released and no frame, promise or listener outlives destroy().
import { URLS } from './config.mjs';
import { mulberry32 } from '../../render/prototype/src/math.mjs';

export class RenderHost {
  constructor() { this.api = null; this.R = null; this.destroyed = false; this.inflight = 0; this.canvas = null; this.TW = 2048; this.padUnits = null; this.log = []; this.crowd = null; this._userExt = null; }
  static async create({ canvas, world, api = 'auto', opts, replaceCanvas }) {
    const h = new RenderHost(); h.canvas = canvas; h.world = world;
    const tryGPU = (api === 'auto' || api === 'webgpu') && 'gpu' in navigator;
    if (tryGPU) {
      try { const m = await import(URLS.proto + 'src/webgpu.mjs'); h.R = await m.GPURenderer.create(canvas, world, opts); h.api = 'webgpu'; }
      catch (e) { h.log.push('webgpu unavailable: ' + (e.message || e)); h.R = null; if (api === 'webgpu') throw e; canvas = h.canvas = replaceCanvas(); }
    }
    if (!h.R) { const m = await import(URLS.proto + 'src/webgl2.mjs'); h.R = await m.GLRenderer.create(canvas, world, opts); h.api = 'webgl2'; }
    h._wireExt(); return h;
  }
  // the prototype renderer has ONE extension slot (R.ext: scene and shadow hooks); the structures set it. It becomes an accessor: the crowd (figures) is drawn first, whoever sets R.ext afterwards is drawn after it.
  _wireExt() {
    const h = this, comp = { scene: (p, r) => { if (h.crowd) h.crowd.scene(p); if (h._userExt) h._userExt.scene(p, r); }, shadow: (p, c, r) => { if (h.crowd) h.crowd.shadow(p, c); if (h._userExt) h._userExt.shadow(p, c, r); } };
    Object.defineProperty(this.R, 'ext', { configurable: true, enumerable: true, get() { return comp; }, set(v) { h._userExt = v || null; } });
  }
  // the figures (src/crowd): the prototype's single soldier model is switched off and every figure is drawn with the figures3d models and the anim3d state machine. `o.progress(frac, text)` reports loading.
  async attachCrowd(o) { const { Crowd } = await import('./crowd/crowd.mjs'); this.crowd = await Crowd.create(this, o); return this.crowd; }
  setCrowd(c) { this.crowd = c; }
  get info() { return this.R.adapterInfo || { renderer: this.R.rendererName }; }
  resize(w, h) { this.canvas.width = w; this.canvas.height = h; this.R.resize(w, h); }
  setLight(sunDir, exposure) { this.R.o.sunDir = sunDir; this.R.o.exposure = exposure; }
  setLod(nearR, midR) { this.R.o.nearR = nearR; this.R.o.midR = midR; if (!this.crowd) { this.R.cfg.nearR = nearR; this.R.cfg.midR = midR; } }      // with the crowd the prototype's selection stays off: the crowd reads the same two values from the settings
  // the unit and gun tables are static in the prototype; the shell rewrites them when the stage changes
  uploadUnits() {
    const R = this.R, w = this.world;
    if (this.api === 'webgpu') R.dev.queue.writeBuffer(R.unitsB, 0, w.unitF);
    else { const gl = R.gl, rows = Math.ceil(w.units.length * 3 / this.TW); if (!this.padUnits) this.padUnits = new Float32Array(this.TW * rows * 4); this.padUnits.set(w.unitF); gl.activeTexture(gl.TEXTURE15); gl.bindTexture(gl.TEXTURE_2D, R.t.units); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, this.TW, rows, gl.RGBA, gl.FLOAT, this.padUnits); }
    this.uploads = (this.uploads || 0) + 1;
    if (this.keepLast) this.lastUnits = w.unitF.slice();
  }
  // contract 1.3: the soldier tables are rewritten by the shell when men fall (sold1.x, the fall time) or a unit changes formation or a fallen man must stay where he fell (sold0 slots).
  // `which`: 's0' the slots, 's1' the fall times / variation. Whole tables are written (the larger is 350 KB at 21,728 figures); nothing is written when nothing changed.
  uploadSoldiers(which) {
    const R = this.R, w = this.world, TW = this.TW;
    for (const k of which) {
      const arr = k === 's0' ? w.sold : w.sold1;
      if (this.api === 'webgpu') R.dev.queue.writeBuffer(k === 's0' ? R.s0B : R.s1B, 0, arr);
      else {
        const gl = R.gl, texels = w.count, rows = Math.ceil(texels / TW), key = '_pad' + k; if (!this[key]) this[key] = new Float32Array(TW * rows * 4);
        this[key].set(arr); gl.activeTexture(gl.TEXTURE15); gl.bindTexture(gl.TEXTURE_2D, k === 's0' ? R.t.sold0 : R.t.sold1); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, TW, rows, gl.RGBA, gl.FLOAT, this[key]);
      }
    }
    this.soldierUploads = (this.soldierUploads || 0) + which.length;
  }
  uploadGuns() {
    const R = this.R, w = this.world;
    if (this.api === 'webgpu') R.dev.queue.writeBuffer(R.gunsB, 0, w.gunF);
    else { const gl = R.gl; gl.activeTexture(gl.TEXTURE15); gl.bindTexture(gl.TEXTURE_2D, R.t.guns); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, w.guns.length * 2, 1, gl.RGBA, gl.FLOAT, w.gunF); }
  }
  // the effects (smoke, flashes, impacts) are events that the prototype steps forward in time; after a seek they are replayed from `from` to `to` so the
  // smoke already in the air at `to` is the smoke a viewer would have seen (the same replay window for the same target time).
  replayFx(cam, to, applyAt, span = 26, step = 0.5) {
    const fx = this.R.fx; fx.lastK = null; fx.n = 0; fx.pending.length = 0; fx.lastT = null;
    fx.rnd = mulberry32(99 + Math.floor(to * 2));       // the effects' random stream is a function of the target time: a seek to t always draws the same smoke
    const t0 = Math.max(0, to - span);
    for (let t = t0; t < to; t += step) { applyAt(t); fx.update(t, cam); }
    applyAt(to); fx.update(to, cam);
  }
  frame(t, cam) {
    if (this.crowd) this.crowd.prepare(cam, t);
    return this.R.frame(t, cam);
  }
  done() { return this.R.onDone(); }
  memoryBytes() { return this.R.memoryBytes(); }
  get gpuMs() { return this.R.gpuMs || {}; }
  destroy() {
    if (this.destroyed) return; this.destroyed = true; const R = this.R;
    if (this.crowd) { try { this.crowd.destroy(); } catch (e) { console.warn('crowd teardown', e); } this.crowd = null; }
    if (this.structures) { try { this.structures.destroy(); } catch (e) { console.warn('structures teardown', e); } this.structures = null; }
    try {
      if (this.api === 'webgpu') {
        const dev = R.dev, orig = console.error;
        const quiet = (...a) => { if (typeof a[0] === 'string' && a[0].startsWith('device lost')) return; orig.apply(console, a); };   // the prototype logs every loss; this one is deliberate
        console.error = quiet; dev.lost.then(() => { if (console.error === quiet) console.error = orig; });
        try { R.ctx.unconfigure(); } catch { /* not configured */ }
        dev.destroy();
      } else {
        const ext = R.gl.getExtension('WEBGL_lose_context'); if (ext) ext.loseContext();
      }
    } catch (e) { console.warn('renderer teardown', e); }
    this.R = null;
  }
}
