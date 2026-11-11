// Audio host: the one place where the Battle Theatre page meets the spatial sound engine (src/audio3d). Contract: docs/AUDIO-HOST-CONTRACT.md.
//
//   import * as AudioHost from './audio-host.mjs';
//   const handle = AudioHost.init(host);     // no AudioContext, no fetch, no timer: sound is OFF until the user starts it (browsers need a gesture)
//   AudioHost.update(frame);                  // once per frame (cheap)
//   AudioHost.dispose();                      // Back / teardown: engine stopped, every node disconnected, the AudioContext closed
//
// What this module adds on top of audio3d (it does not change audio3d):
//   * a mixer: master -> mute -> destination, and three channel buses (music = bugle and drum signals, effects = everything else, voices = commands and shouts)
//     that feed the engine's dry bus, so the reverb send follows the channel level. Levels are user settings (remembered per browser, never required).
//   * DEC-001 as a user setting: both labelling options are always present (the shipped default is the engine's AUDIO_CONFIG flag, 'panel-only' under delegated decision DD-14, reversible by the owner; the PDF marking stays selectable).
//   * the causal clock: no voice is ever planned from an event after the theatre clock, and every jump (scrub, seek, speed change, pause) silences all voices and
//     every echo tap that was scheduled for a time that has not happened in the new timeline; sound resumes by re-emitting [now - 12 s, now) (host.replay).
//   * a node registry: every Web Audio node the engine creates is tracked, released when its voice ends, and all of it is gone after dispose() (liveNodes() === 0).
//   * a plan recorder and renderOffline() so node tests can measure the mix without a browser (stands in for listening; it is not listening).
// Sound is silent, never removed, while time is paused, scrubbed, or faster than AUDIO_MAX_WARP; the panel says so (visible marked gap, Law cl.7).
import { createAudio3D, attachAudio, buildPanel, AUDIO_CONFIG } from './audio3d/index.mjs';
import { LABEL_MODES } from './audio3d/provenance.mjs';
import { thunderClaps, ambientState, atmosphereFromWeather } from './audio3d/atmosphere.mjs';
import { renderOffline } from './audio3d/offline.mjs';

export const AUDIO_MAX_WARP = 8;        // above this the events pass faster than they can be heard (BROWSER-VERIFICATION-LIST-AUDIO A9 measured 8x)
export const LOOKAHEAD_S = 30;          // engine look-ahead (battle seconds); events never exist beyond now + EMIT_SLACK_S, so this only bounds the queue scan
export const PRIME_WINDOW_S = 12;       // re-emit window after a jump: sounds in flight (FIRE_EVENT 'Seeking')
export const EMIT_SLACK_S = 2;          // an event may be stamped at most this far after the clock (frame ordering); later events are dropped, never queued
export const STALE_S = 40;              // events older than this have arrived everywhere in range already
export const CHANNELS = Object.freeze(['music', 'effects', 'voices']);
export const CHANNEL_INFO = Object.freeze({
  music: 'Music: the bugle and drum signals only (no period music exists in the record, none is invented)',
  effects: 'Effects: weapons, shells, handling, marching, horses, wheels, weather',
  voices: 'Voices: drill commands (documented words only), cheers and shouting',
});
export const DEFAULT_SETTINGS = Object.freeze({ master: 0.8, music: 0.8, effects: 1, voices: 1, muted: false, labelMode: null });   // labelMode null = follow the shipped flag
const STORE_KEY = 'bt.audio.settings.v1';

const clamp01 = (v) => Math.max(0, Math.min(1, Number.isFinite(+v) ? +v : 0));
/** Slider (0..1) to linear gain: squared, so the middle of the slider is about -12 dB. */
export const taper = (v) => { const x = clamp01(v); return x * x; };
/** Which channel a sound id belongs to. */
export function categoryOf(soundId) { const s = String(soundId || ''); if (s.startsWith('signal.')) return 'music'; if (s.startsWith('voice.') || s.startsWith('crowd.')) return 'voices'; return 'effects'; }
/** Linear gain the mixer applies to a channel (offline renderer and graph agree). */
export const channelGain = (st, cat) => (st.muted ? 0 : taper(st.master) * taper(st[cat]));
/** The listener yaw the planner wants (0 = looking north, clockwise, z south) from the camera yaw of the page (forward = (sin yaw, cos yaw) in x, z). */
export const listenerYaw = (camYaw) => Math.PI - camYaw;

// ---------------------------------------------------------------------------------------------------------------- node registry
const LIVE = { contextsOpened: 0, contextsClosed: 0, registries: new Set() };
const NOT_NODE = new Set(['createBuffer', 'createPeriodicWave']);
function createRegistry() {
  const persistent = new Set(), groups = new Set(), groupOf = new WeakMap(); let cur = null;
  function release(g) { if (g.done) return; g.done = true; for (const n of g.nodes) { try { n.disconnect(); } catch { /* ok */ } } g.nodes.clear(); groups.delete(g); }
  function ended(node) { const g = groupOf.get(node); if (!g || g.done) return; g.ended++; if (g.ended >= g.sources.length) release(g); }
  const reg = {
    track(node, name) {
      if (!node || typeof node.connect !== 'function') return node;
      if (cur) { cur.nodes.add(node); if (name === 'createBufferSource') { cur.sources.push(node); if (typeof node.addEventListener === 'function') node.addEventListener('ended', () => ended(node)); } }
      else persistent.add(node);
      return node;
    },
    /** Run fn; every node created inside belongs to one voice group, released when all its sources have ended. */
    group(fn) {
      const g = { nodes: new Set(), sources: [], ended: 0, done: false }; cur = g;
      let out; try { out = fn(); } finally { cur = null; }
      if (!g.nodes.size) { g.done = true; return out; }
      for (const s of g.sources) groupOf.set(s, g);
      groups.add(g); if (!g.sources.length) release(g);
      return out;
    },
    liveNodes() { let n = persistent.size; for (const g of groups) n += g.nodes.size; return n; },
    /** Stop and disconnect every voice (not the persistent buses). */
    stopVoices() { for (const g of [...groups]) { for (const s of g.sources) { try { s.stop(); } catch { /* not started */ } } release(g); } },
    /** Disconnect and forget everything. */
    releaseAll() { reg.stopVoices(); for (const n of persistent) { try { n.disconnect(); } catch { /* ok */ } } persistent.clear(); },
  };
  return reg;
}

// ---------------------------------------------------------------------------------------------------------------- mixer
function makeMixer(realCtx, settings) {
  const reg = createRegistry(); LIVE.registries.add(reg);
  let master = null;
  const proxy = new Proxy(realCtx, {
    get(t, k) {
      if (k === 'destination') return master || t.destination;
      const v = t[k];
      if (typeof v !== 'function') return v;
      if (typeof k === 'string' && k.startsWith('create') && !NOT_NODE.has(k)) return (...a) => reg.track(v.apply(t, a), k);
      return v.bind(t);
    },
  });
  master = proxy.createGain(); const mute = proxy.createGain(); master.connect(mute); mute.connect(realCtx.destination);
  const chan = {}; for (const c of CHANNELS) chan[c] = proxy.createGain();
  const set = (param, v) => { const now = realCtx.currentTime || 0; if (param.setTargetAtTime) param.setTargetAtTime(v, now, 0.03); else param.value = v; };
  const mixer = {
    ctx: proxy, reg, master, mute, chan,
    apply(st) { set(master.gain, taper(st.master)); set(mute.gain, st.muted ? 0 : 1); for (const c of CHANNELS) set(chan[c].gain, taper(st[c])); },
    /** Connect the channel buses to the engine's dry bus (after the engine exists). */
    attach(engine) { mixer.dry = engine.dryBus; for (const c of CHANNELS) chan[c].connect(engine.dryBus); },
    withBus(engine, cat, fn) { const prev = engine.dryBus; engine.dryBus = chan[cat]; try { return fn(); } finally { engine.dryBus = prev; } },
  };
  // initial values straight (no ramp from the default 1)
  master.gain.value = taper(settings.master); mute.gain.value = settings.muted ? 0 : 1; for (const c of CHANNELS) chan[c].gain.value = taper(settings[c]);
  return mixer;
}

function loadSettings(storage) {
  const out = { ...DEFAULT_SETTINGS };
  try {
    const raw = storage && storage.getItem(STORE_KEY); if (!raw) return out; const j = JSON.parse(raw);
    for (const k of ['master', 'music', 'effects', 'voices']) if (typeof j[k] === 'number') out[k] = clamp01(j[k]);
    if (typeof j.muted === 'boolean') out.muted = j.muted;
    if (j.labelMode === 'pdf' || j.labelMode === 'panel-only') out.labelMode = j.labelMode;
  } catch { /* storage unavailable or corrupt: defaults */ }
  return out;
}
const defaultStorage = () => { try { return globalThis.localStorage || null; } catch { return null; } };

// ---------------------------------------------------------------------------------------------------------------- the host object
export class AudioHost {
  constructor(host = {}) {
    this.host = host; this.storage = host.storage === undefined ? defaultStorage() : host.storage; this.settings = loadSettings(this.storage);
    this.started = false; this.starting = null; this.disposed = false; this.active = false; this.silentReason = 'off'; this.error = null;
    this.ctx = null; this.mixer = null; this.audio = null; this.catalog = null; this.bind = null; this.listeners = new Set();
    this.battleNow = 0; this.lastT = null; this.lastSpeed = null; this.lastCam = null; this.envAt = -1e9; this.lastR = null; this.plans = []; this.recordPlans = !!host.recordPlans;
    this.stats = { updates: 0, jumps: 0, silenced: 0, primes: 0, droppedFuture: 0, droppedStale: 0, droppedInactive: 0, causalityViolations: 0, accepted: 0, scheduled: 0, thunder: 0 };
    this.lastThunderS = null;
    const sc = host.scope; if (sc && typeof sc.add === 'function') sc.add(() => this.dispose());
    if (sc && typeof sc.on === 'function' && typeof document !== 'undefined') sc.on(document, 'visibilitychange', () => this._visibility());
  }

  // ---- settings and change notification
  onChange(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  _emit() { for (const fn of [...this.listeners]) { try { fn(this); } catch { /* a UI listener must not break sound */ } } }
  _save() { try { this.storage && this.storage.setItem(STORE_KEY, JSON.stringify(this.settings)); } catch { /* private window */ } }
  setLevel(name, v) { if (!['master', ...CHANNELS].includes(name)) return false; this.settings[name] = clamp01(v); if (this.mixer) this.mixer.apply(this.settings); this._save(); this._emit(); return true; }
  setMuted(on) { this.settings.muted = !!on; if (this.mixer) this.mixer.apply(this.settings); this._save(); this._emit(); return this.settings.muted; }
  /** DEC-001: 'pdf' or 'panel-only'. Unknown values change nothing. The choice is the viewer's, remembered in this browser only; the shipped default stays the engine flag. */
  setLabelMode(m) {
    if (m !== 'pdf' && m !== 'panel-only') return this.labelMode;
    this.settings.labelMode = m; for (const a of [this.audio, this.catalog]) if (a) a.setLabelMode(m); this._save(); this._emit(); return m;
  }
  get labelMode() { return this.settings.labelMode || (this.audio || this.catalog)?.mode || AUDIO_CONFIG.labelMode; }
  /** Every option of the DEC-001 setting, always (also before sound is started). */
  labelSetting() {
    return { decision: AUDIO_CONFIG.decision, decisionStatus: AUDIO_CONFIG.decisionStatus, default: AUDIO_CONFIG.labelMode, current: this.labelMode, chosenByViewer: this.settings.labelMode != null,
      options: Object.entries(LABEL_MODES).map(([id, text]) => ({ id, text })) };
  }
  badge() { return this.labelMode === 'pdf' ? 'Audio: modern reconstruction. No recording of 1863 exists.' : null; }

  // ---- the catalogue behind the 'what is in this build' list: needs no AudioContext
  async ensureCatalog() {
    if (this.catalog || this.disposed) return this.catalog;
    const h = this.host; this.catalog = await createAudio3D({ ctx: null, search: h.search || '', data: h.audioData || undefined, baseUrl: h.audioBaseUrl || undefined, T: null, woods: false });
    if (this.settings.labelMode) this.catalog.setLabelMode(this.settings.labelMode); return this.catalog;
  }
  panel() { const a = this.audio || this.catalog; return a ? a.panel() : null; }

  // ---- start / stop (user gesture)
  _makeCtx() {
    const h = this.host; if (typeof h.createContext === 'function') return h.createContext();
    const C = h.AudioContext || globalThis.AudioContext || globalThis.webkitAudioContext; if (!C) return null; return new C({ latencyHint: 'interactive' });
  }
  /** Start sound. Call it from a click or key handler: the AudioContext is created here, never earlier. Resolves true when sound is on. */
  start() {
    if (this.disposed) return Promise.resolve(false); if (this.started) return this._resume().then(() => true); if (this.starting) return this.starting;
    this.starting = (async () => {
      try {
        const planOnly = !!this.host.planOnly; let ctx = null, mixer = null;
        if (!planOnly) { ctx = this._makeCtx(); if (!ctx) { this.error = 'Web Audio is not available in this browser.'; return false; } LIVE.contextsOpened++; this.ctx = ctx; mixer = makeMixer(ctx, this.settings); this.mixer = mixer; }
        const h = this.host;
        const audio = await createAudio3D({ ctx: mixer ? mixer.ctx : null, search: h.search || '', data: h.audioData || undefined, baseUrl: h.audioBaseUrl || undefined, T: h.T || null, woods: h.woods, budget: h.budget || {} });
        if (this.disposed || this.starting === null) { audio.engine && audio.engine.dispose(); this._teardown(); return false; }
        this.audio = audio; if (this.settings.labelMode) audio.setLabelMode(this.settings.labelMode);
        if (mixer && audio.engine) { this._patch(audio.engine, mixer); mixer.attach(audio.engine); mixer.apply(this.settings); }
        if (h.bus) this.bind = attachAudio(this._guarded(audio), h.bus);
        if (audio.engine) audio.engine.resume().catch(() => { });      // not awaited: without a user gesture a context stays suspended and the promise stays pending
        this.started = true; this.error = null; this.silentReason = 'waiting for the first frame'; this._emit(); return true;
      } catch (e) { this.error = String(e && e.message || e); this._teardown(); return false; }
      finally { this.starting = null; }
    })();
    return this.starting;
  }
  /** Stop sound: everything is released, the AudioContext is closed. The settings stay. */
  stop() { this._teardown(); this.started = false; this.active = false; this.silentReason = 'off'; this._emit(); }
  async _resume() { if (this.ctx && this.ctx.state === 'suspended' && !this.disposed) { try { await this.ctx.resume(); } catch { /* needs a gesture */ } } }
  _visibility() { if (!this.ctx || typeof document === 'undefined') return; try { if (document.hidden) this.ctx.suspend && this.ctx.suspend(); else if (this.started) this.ctx.resume && this.ctx.resume(); } catch { /* ok */ } }

  // ---- engine patching: channel routing and the causal check, without editing audio3d
  _patch(eng, mixer) {
    const self = this, reg = mixer.reg, sched = eng.schedule.bind(eng), flight = eng.scheduleFlight.bind(eng), bed = eng.setBed.bind(eng), folded = eng.scheduleFoldedBed.bind(eng);
    eng.schedule = (v) => {
      if (!(v.tFire <= self.battleNow + EMIT_SLACK_S)) { self.stats.causalityViolations++; return null; }          // a voice from an event after the clock: never scheduled
      const r = reg.group(() => mixer.withBus(eng, categoryOf(v.soundId), () => sched(v))); if (r) self.stats.scheduled++; return r;
    };
    eng.scheduleFlight = (f) => reg.group(() => mixer.withBus(eng, 'effects', () => flight(f)));
    eng.setBed = (...a) => mixer.withBus(eng, 'effects', () => bed(...a));
    eng.scheduleFoldedBed = (...a) => mixer.withBus(eng, 'effects', () => folded(...a));
  }
  _guarded(audio) {
    const self = this, ok = (t) => {
      if (!self.active) { self.stats.droppedInactive++; return false; }
      if (t > self.battleNow + EMIT_SLACK_S) { self.stats.droppedFuture++; return false; }
      if (t < self.battleNow - STALE_S) { self.stats.droppedStale++; return false; }
      self.stats.accepted++; return true;
    };
    return { planner: audio.planner, onFire(unitId, figureIdx, t, ...rest) { if (ok(t)) audio.onFire(unitId, figureIdx, t, ...rest); }, onEvent(e) { if (ok(e.t)) audio.onEvent(e); } };
  }
  /** Emit an engine event through the same causal guard as the bus (thunder, tests, host-made events). */
  emitEvent(e) { if (!this.audio) return false; const g = this._guarded(this.audio); const n = this.stats.accepted; g.onEvent(e); return this.stats.accepted > n; }

  // ---- the frame
  /**
   * frame = { t (theatre minutes), playing, speed, dt?, seeked?, scrubbing?, cam: { x, y, z, yaw, hAbove? }, weather?, sun?, weatherChanged? }  (see AUDIO-HOST-CONTRACT.md)
   * Returns the silent reason ('' while sound is running).
   */
  update(frame) {
    if (this.disposed || !frame || !Number.isFinite(frame.t)) return this.silentReason;
    this.stats.updates++; const tS = frame.t * 60, speed = frame.speed > 0 ? frame.speed : 1, dt = frame.dt > 0 ? frame.dt : 0.1;
    let jumped = !!frame.seeked;
    if (this.lastT !== null) { const d = tS - this.lastT; if (d < -1e-6 || d > 0.5 + 4 * dt * Math.max(1, speed)) jumped = true; }
    const speedChanged = this.lastSpeed !== null && Math.abs(speed - this.lastSpeed) > 1e-9; this.lastT = tS; this.lastSpeed = speed; this.battleNow = tS;
    if (jumped) this.stats.jumps++;
    if (!this.started || !this.audio) { this.silentReason = this.starting ? 'starting' : 'off'; return this.silentReason; }
    const playing = !!frame.playing && (frame.rate === undefined || frame.rate > 0.01);
    let reason = '';
    if (frame.scrubbing) reason = 'scrubbing'; else if (!playing) reason = 'paused'; else if (speed > AUDIO_MAX_WARP) reason = 'speed';
    const want = reason === '';
    if (!want || jumped || speedChanged) { if (this.active || this.mixer) this._silence(); this.active = false; }
    this.silentReason = reason;
    if (!want) { this.lastCam = null; return reason; }
    // listener
    const cam = frame.cam || { x: 0, y: 2, z: 0, yaw: 0 }, T = this.host.T; let vel = [0, 0, 0];
    if (this.lastCam && !jumped) { const k = 1 / dt; vel = [(cam.x - this.lastCam.x) * k, (cam.y - this.lastCam.y) * k, (cam.z - this.lastCam.z) * k]; const m = Math.hypot(...vel); if (m > 60) vel = vel.map((x) => x * 60 / m); }
    this.lastCam = { x: cam.x, y: cam.y, z: cam.z };
    const ground = T && typeof T.h === 'function' ? T.h(cam.x, cam.z) : null, hAbove = cam.hAbove ?? (ground == null ? 1.6 : Math.max(0.5, cam.y - ground));
    const listener = { pos: [cam.x, cam.y, cam.z], vel, yaw: listenerYaw(cam.yaw || 0), hAbove };
    const envDue = !this.active || Math.abs(frame.t - this.envAt) > 0.25 || frame.weatherChanged;
    // audio.update plans in battle seconds (t + d / c) and anchors the engine, which converts battle seconds to wall seconds with the speed once.
    this.audio.update({ battleNow: tS, warp: speed, listener, weather: envDue ? frame.weather ?? null : null, sun: envDue ? frame.sun ?? null : null, min: envDue ? frame.t : null });
    const wasActive = this.active; this.active = true;
    if (!wasActive) this._prime(tS);
    if (envDue) { this.envAt = frame.t; this._environment(frame, tS, listener, !wasActive); }
    const r = this.audio.pump(LOOKAHEAD_S);
    if (r && r !== this.lastR) { this.lastR = r; if (this.recordPlans && r.voices) for (const v of r.voices) this.plans.push(v); }
    return '';
  }
  /** After a jump (or when sound becomes active): re-emit the events of [now - PRIME_WINDOW_S, now) so sounds already in flight arrive. */
  _prime(tS) {
    this.stats.primes++; this.lastThunderS = tS; const h = this.host;
    if (typeof h.replay === 'function') { try { h.replay(tS - PRIME_WINDOW_S, tS); } catch (e) { this.error = 'replay failed: ' + (e && e.message || e); } }
  }
  /** Silence: drop every queued event, stop every voice and echo tap, fade the beds. */
  _silence() {
    this.stats.silenced++; const a = this.audio, eng = a && a.engine; if (a) a.flush();
    if (this.mixer) this.mixer.reg.stopVoices();
    if (eng) { for (const [name] of eng.beds) { try { eng.setBed(name, null, false); } catch { /* ok */ } } if (eng.foldedBed) { try { eng.foldedBed.g.gain.setTargetAtTime(0, eng.ctx.currentTime, 0.05); } catch { /* ok */ } } }
    this.lastR = null;
  }
  _environment(frame, tS, listener, first) {
    const eng = this.audio.engine;
    if (eng && frame.weather !== undefined && frame.weather !== null) {
      const st = ambientFrom(frame);
      for (const [k, id] of [['insects', 'amb.insects'], ['birds', 'amb.birds'], ['rain', 'amb.rain'], ['wind', 'amb.wind']]) { const b = st[k]; if (b) eng.setBed(k, id, !!b.on && b.levelDb > 0, b.levelDb); }
    }
    if (frame.weather && frame.weather.precip && frame.weather.precip.kind === 'storm' && !first && this.lastThunderS != null) {
      const from = this.lastThunderS, to = tS;
      for (const c of thunderClaps(Math.floor(from / 60), Math.floor(to / 60) + 1, frame.weather)) {
        if (c.t <= from || c.t > to) continue; this.stats.thunder++;
        this.emitEvent({ type: 'fire', id: 0x7a000000 + Math.round(c.t), t: c.t, soundId: 'amb.thunder', weapon: 'thunder', x: listener.pos[0] + c.distance * Math.sin(c.bearing), y: 250, z: listener.pos[2] - c.distance * Math.cos(c.bearing), seed: Math.round(c.t) });
      }
    }
    this.lastThunderS = tS;
  }

  // ---- status, offline measurement, teardown
  status() {
    const e = this.audio && this.audio.engine, s = this.audio ? this.audio.status() : null;
    return { started: this.started, active: this.active, silentReason: this.silentReason, silentText: silentText(this.silentReason), error: this.error, muted: this.settings.muted, contextState: this.ctx ? this.ctx.state : null,
      voices: e ? e.voiceCount : null, liveNodes: this.liveNodes(), text: s ? s.text : null, budget: s ? s.budget : null, outputLatencyS: e ? e.outputLatencyS : null, labelMode: this.labelMode, maxWarp: AUDIO_MAX_WARP, stats: { ...this.stats } };
  }
  liveNodes() { return this.mixer ? this.mixer.reg.liveNodes() : 0; }
  /** Offline stereo render of the plans recorded so far (host.recordPlans) with the mixer's channel gains: the node-side measurement standing in for the browser graph. */
  renderOffline(opts = {}) {
    if (!this.audio) throw new Error('start() first (planOnly hosts record plans without an AudioContext)');
    const voices = this.plans.filter((v) => v && !v.culled).map((v) => ({ ...v, gainLin: v.gainLin * channelGain(this.settings, categoryOf(v.soundId)) }));
    return renderOffline(voices, { bank: this.audio.bank, sr: this.audio.bank.sr, ...opts });
  }
  _teardown() {
    if (this.bind) { try { this.bind.detach(); } catch { /* ok */ } this.bind = null; }
    if (this.audio && this.audio.engine) { try { this.audio.engine.dispose(); } catch { /* ok */ } }
    if (this.audio) { try { this.audio.flush(); } catch { /* ok */ } }
    if (this.mixer) { this.mixer.reg.releaseAll(); LIVE.registries.delete(this.mixer.reg); this.mixer = null; }
    if (this.ctx) { const c = this.ctx; this.ctx = null; LIVE.contextsClosed++; try { const p = c.close(); if (p && p.catch) p.catch(() => { }); } catch { /* already closed */ } }
    this.audio = null; this.lastR = null; this.lastCam = null; this.envAt = -1e9;
  }
  dispose() {
    if (this.disposed) return; this.disposed = true; this.starting = null; this._teardown(); this.catalog = null; this.started = false; this.active = false; this.silentReason = 'off'; this.listeners.clear();
    if (current === this) current = null;
  }
}

function silentText(r) {
  switch (r) {
    case '': return 'Sound is running.';
    case 'off': return 'Sound is off. Press Start sound (browsers need a click).';
    case 'starting': return 'Starting sound.';
    case 'paused': return 'Time is stopped, so nothing is heard. Press play.';
    case 'scrubbing': return 'Silent while the time bar is dragged: nothing from the future is played.';
    case 'speed': return `Silent above ${AUDIO_MAX_WARP}x: events pass faster than they can be heard (not removed; slow down to hear them).`;
    default: return String(r || '');
  }
}
function ambientFrom(frame) { const atm = atmosphereFromWeather(frame.weather, frame.t, { timeWarp: 1 }); return ambientState(frame.weather, frame.sun || null, atm); }

// ---------------------------------------------------------------------------------------------------------------- module API
let current = null;
/** Create the audio host for this theatre visit. Replaces (and disposes) a previous one. Nothing audible or allocated yet. */
export function init(host = {}) { if (current) current.dispose(); current = new AudioHost(host); return current; }
export function update(frame) { return current ? current.update(frame) : 'off'; }
export function dispose() { if (current) { const c = current; current = null; c.dispose(); } }
export const getCurrent = () => current;
/** Counters for the leak spec: contexts opened and closed, live nodes over all hosts. */
export function stats() { let n = 0; for (const r of LIVE.registries) n += r.liveNodes(); return { contextsOpened: LIVE.contextsOpened, contextsClosed: LIVE.contextsClosed, liveContexts: LIVE.contextsOpened - LIVE.contextsClosed, liveNodes: n, hasHost: !!current }; }
export { buildPanel };
