// FX host: connects the fx3d effect layer (smoke, muzzle flash, dust, shell bursts, fires) and the weather3d layer (sky, clouds, stars, mist, wet ground) to the RenderHost, without touching
// render-host.mjs, stage.mjs or world-from-units.mjs. Contract: docs/FX-HOST-CONTRACT.md (read it before calling).
//
//   import * as fxHost from './fx-host.mjs';
//   const fx = await fxHost.init(host, { environment, anim, choices: () => scenario.choices, nightFloor });   // once, after RenderHost.create()
//   const info = fxHost.update({ tMin, cam, choices });                                                     // every frame, BEFORE host.frame(); returns what the UI shows
//   fxHost.dispose();                                                                                       // before host.destroy()
//
// How it draws (WebGL2): it takes over the renderer's `ext` hook (the structures layer keeps working: assignments to R.ext become the inner hook that is called first), and inside the scene pass, after
// the structures and before post: (1) the weather pass over the sky and the geometry, (2) the fx3d sprites. It switches the prototype's own sky and particle passes off (restored by dispose()).
// WebGPU: the state (weather, effects, events) is computed and returned, nothing is drawn yet (gap EG-W3D-G08; BROWSER-VERIFICATION-LIST-WEATHER.md).
//
// Events: the anim3d bus (BT-EVENTS.md) feeds fx3d: fire -> smoke, muzzle flash and light; misfire -> cap flash; fall -> dust; unit_march -> road dust; impact -> shell and case bursts, ground strikes.
// Nothing is delayed: sound is AUDIO's (delay = distance / speed of sound; the weather state carries the temperature input for it, Q13).
import { createFx, REPLAY_S } from './fx3d/index.mjs';
import { WeatherTimeline, weatherStatement } from './weather3d/timeline.mjs';
import { GLPasses } from './weather3d/gl.mjs';

const FX_EVENTS = ['fire', 'misfire', 'fall', 'unit_march', 'impact'];
export const DEFAULTS = { tier: 'desktop', driveAnim: true, maxWindowS: 30, drawWeather: true, drawFx: true };

async function loadData(url) {
  const get = async f => { const r = await fetch(url + f); if (!r.ok) throw new Error('fx3d data: ' + f + ' ' + r.status); return r.json(); };
  const [params, weapons, fires] = await Promise.all([get('params.json'), get('weapons.json'), get('fires.json')]); return { params, weapons, fires };
}

export class FxHost {
  constructor(host, opts) { this.host = host; this.opts = { ...DEFAULTS, ...opts }; this.dead = false; this.log = []; this.prevT = null; this.dirty = false; this.cur = null; this.statsOut = { replays: 0, replayedEvents: 0, suspendedFrames: 0, frames: 0 }; this.choicesKey = null; }
  static async create(host, opts = {}) {
    const o = { ...DEFAULTS, ...opts }, me = new FxHost(host, o), R = host && host.R, api = host && host.api;
    const environment = o.environment || host.environment; if (!environment) throw new Error('fx-host: opts.environment (the Environment of src/environment.mjs) is required');
    let data = o.data; if (!data) { const base = o.dataUrl || (await import('./config.mjs')).URLS.data + 'fx3d/'; data = await loadData(base); }
    const groundAt = o.groundAt || (host.world && host.world.T ? (x, z) => host.world.T.h(x, z) : () => 0);
    const choices0 = typeof o.choices === 'function' ? o.choices() : (o.choices || {}); me.choicesKey = JSON.stringify(choices0);
    me.fx = createFx({ data, environment, geo: o.geo || host.geo || null, groundAt, tier: o.tier, api: api === 'webgpu' ? 'webgpu' : 'webgl2', choices: choices0, soldiers: o.soldiers ?? (host.world && host.world.count) ?? undefined, fireScenario: o.fireScenario || {}, contact: o.contact || (() => false) });
    me.weather = new WeatherTimeline(environment, { choices: choices0, fxenv: me.fx.env, nightFloor: o.nightFloor });
    me.kappa = [data.params.smoke.kappa_m2_per_kg, data.params.dust.kappa_m2_per_kg];
    me.anim = o.anim || host.anim || null; me.subs = [];
    if (me.anim && me.anim.bus) me._subscribe(me.anim.bus);
    me.gl = null;
    if (R && api === 'webgl2' && R.gl) me._installGL(R);
    else me.log.push(api === 'webgpu' ? 'webgpu: state computed, nothing drawn (EG-W3D-G08)' : 'no WebGL2 renderer: state only');
    return me;
  }
  _subscribe(bus) {
    const fx = this.fx, h = { fire: fx.onFire, misfire: fx.onMisfire, fall: fx.onFall, unit_march: fx.onUnitMarch, impact: fx.onImpact };
    this.handlers = h; for (const t of FX_EVENTS) bus.on(t, h[t]); this.bus = bus;
  }
  _unsubscribe() { if (this.bus && this.handlers) for (const t of FX_EVENTS) this.bus.off(t, this.handlers[t]); this.bus = null; }
  _installGL(R) {
    const budget = this.fx.budget; this.gl = new GLPasses(R, { maxEvents: budget.maxEvents }); this.log.push(...this.gl.log);
    if (!this.gl.ok) { this.log.push('weather3d/fx3d programs did not build: the prototype sky and particles stay on'); return; }
    this.prevFlags = { sky: R.o.flags.sky, particles: R.o.flags.particles };
    if (this.gl.weatherOk && this.opts.drawWeather) R.o.flags.sky = false;
    if (this.gl.fxOk && this.opts.drawFx) R.o.flags.particles = false;
    // chain the renderer's ext hook: whatever is assigned to R.ext later (the structures layer) becomes the inner hook, ours stays outermost
    const self = this; let inner = R.ext || null; this._innerExt = () => inner;
    const outer = { scene(gl, r) { if (inner && inner.scene) inner.scene(gl, r); self._drawScene(); }, shadow(gl, c, r) { if (inner && inner.shadow) inner.shadow(gl, c, r); } };
    Object.defineProperty(R, 'ext', { configurable: true, enumerable: true, get() { return outer; }, set(v) { inner = v; } }); this._outer = outer; this._R = R;
  }
  _drawScene() {
    if (this.dead || !this.cur || !this.gl) return;
    const c = this.cur; try { this.gl.draw(c.W, c.fr, c.cam, { weather: this.opts.drawWeather, fx: this.opts.drawFx }); } catch (e) { this.log.push('draw failed: ' + (e.message || e)); this.dead = true; this._restoreFlags(); console.error('fx-host draw failed, effects off', e); }
  }
  _restoreFlags() { const R = this._R; if (R && this.prevFlags) { R.o.flags.sky = this.prevFlags.sky; R.o.flags.particles = this.prevFlags.particles; } }
  // re-emit the fire plan over [from, to] into the effect handlers ONLY (the other bus subscribers, AUDIO among them, see nothing of a replay)
  _replay(from, to) {
    const a = this.anim; if (!a || !this.bus || !this.handlers) return 0; const bus = this.bus, saved = bus.h, mine = {}; for (const k of Object.keys(saved)) mine[k] = [];
    for (const t of FX_EVENTS) mine[t] = [this.handlers[t]]; bus.h = mine; let n = 0; try { n = a.advance(from, to) || 0; } finally { bus.h = saved; }
    this.statsOut.replays++; this.statsOut.replayedEvents += n; return n;
  }
  // time and anim: live window forward, replay after a seek (once the clock has settled: a scrub drag does not replay on every move)
  _drive(t) {
    const prev = this.prevT; this.prevT = t; const o = this.opts; let state = 'live';
    if (prev == null) { this.fx.seek(t); this.dirty = true; }
    else if (t < prev - 1e-6 || t - prev > o.maxWindowS) { this.fx.seek(t); this.dirty = true; }
    const dt = prev == null ? 0 : t - prev, settled = prev == null || (dt >= 0 && dt <= o.maxWindowS);
    if (this.dirty && settled && this.anim && o.driveAnim) { this._replay(t - REPLAY_S, t); this.dirty = false; state = 'replayed'; }
    else if (this.dirty && !(this.anim && o.driveAnim)) { this.dirty = false; state = 'no-anim'; }
    else if (this.dirty) { state = 'suspended'; this.statsOut.suspendedFrames++; }
    else if (this.anim && o.driveAnim && dt > 0) this.anim.advance(prev, t);
    return state;
  }
  update(frame) {
    if (this.dead && !this.cur) return null; const o = this.opts, tSec = frame.tSec ?? frame.tMin * 60, cam = frame.cam;
    if (!(tSec >= 0)) throw new Error('fx-host.update: frame.tMin (minutes) or frame.tSec (seconds) is required');
    const ch = frame.choices || (typeof o.choices === 'function' ? o.choices() : o.choices) || {}, key = JSON.stringify(ch);
    if (key !== this.choicesKey) { this.choicesKey = key; this.weather.setChoices(ch); this.fx.seek(tSec); this.dirty = true; }
    const state = this._drive(tSec), W = this.weather.at(tSec, this._W || (this._W = {}));
    const camFx = cam ? { pos: [cam.x, cam.y, cam.z], fwd: cam.fwd, fovY: cam.fov, aspect: frame.aspect || (this._R ? this._R.W / this._R.H : 1.78), heightPx: frame.heightPx || (this._R ? this._R.H : 1080) } : null;
    const fr = this.fx.update(tSec, camFx); fr.kappa = this.kappa; this.cur = { W, fr, cam }; this.statsOut.frames++;
    return { t: tSec, driveState: state, weather: W, statement: weatherStatement(W), effects: { text: fr.budget.text, tier: fr.budget.tier, nEvents: fr.nEvents, nSprites: fr.nSprites, liveEvents: fr.liveEvents, pending: fr.pending, uncertainFires: fr.uncertainFires, fires: fr.fires },
      temp: W.temp, wind: W.wind, replayWindow: this.fx.replayWindow(), stats: { ...this.statsOut, gl: this.gl ? { ...this.gl.stats } : null, fx: this.fx.stats() }, log: this.log };
  }
  // optional: the host's measured effect cost in milliseconds, once a second; the governor reduces sprites (never soldiers) when it is over budget
  govern(effectMs) { return this.fx.govern(effectMs); }
  dispose() {
    if (this._disposed) return; this._disposed = true; this.dead = true; this._unsubscribe();
    const R = this._R; if (R && this._outer) { const inner = this._innerExt(); try { delete R.ext; } catch { /* keep going */ } R.ext = inner; this._restoreFlags(); }
    if (this.gl) this.gl.dispose(); this.gl = null; this.cur = null; this.fx = null; this.weather = null; this.anim = null; this._R = null;
  }
}

let current = null;
export async function init(host, opts = {}) { if (current) current.dispose(); current = await FxHost.create(host, opts); return current; }
export function update(frame) { if (!current) throw new Error('fx-host.update before init'); return current.update(frame); }
export function dispose() { if (current) { current.dispose(); current = null; } }
export const instance = () => current;
