// The Web Audio graph. Consumes voice plans from planner.mjs and schedules them on an AudioContext. Nothing here decides physics: delay, gain, filter and direction are in the plan.
//
//   voice (BufferSource, playbackRate = Doppler) -> low-pass biquad (1 or 2 stages, fitted to air/ground/ridge loss) -> gain (distance, directivity, trim)
//        -> HRTF PannerNode (near / loud voices) or StereoPanner (the rest) -> dryBus
//   echo taps: extra delayed BufferSource copies (ridge reflections), low-passed, panned at the reflector's azimuth -> dryBus
//   dryBus -> reverbSend -> ConvolverNode (procedural impulse response, RT60 from the terrain) -> wetBus
//   beds: ambient loops (insects, birds, rain, wind) and the statistical bed of folded shots (looped noise through a band-pass, gain automated per 100 ms)
//   master: dryBus + wetBus -> trim -> DynamicsCompressor used as a limiter -> destination
//
// Clock: plans carry battle seconds. wall = ctx.currentTime + (tArrive - battleNow) / warp. `outputLatency` is exposed so the animation can draw for the audio being heard (FIRE_EVENT.md).
// The engine never creates more than budget.maxVoices sources at once; the plan's allocate() has already decided who is individually sounded, and the UI text says so honestly.
import { makeRng } from './dsp.mjs';

export function makeImpulseResponse(ctx, { seconds = 2.4, rt60 = 2.4, seed = 1, predelay = 0.03 } = {}) {
  const sr = ctx.sampleRate, n = Math.round(seconds * sr), buf = ctx.createBuffer(2, n, sr), rng = makeRng(seed ^ 0x1e57);
  for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch), off = Math.round(predelay * sr); let lp = 0; for (let i = off; i < n; i++) { const t = (i - off) / sr; lp += 0.35 * ((rng() * 2 - 1) - lp); d[i] = lp * Math.exp(-6.9 * t / rt60) * 0.6; } }
  return buf;
}

export class Audio3DEngine {
  constructor({ ctx, bank, planner, labelMode = 'pdf', budget = {}, trimDb = 22, log = null }) {
    this.ctx = ctx; this.bank = bank; this.planner = planner; this.labelMode = labelMode; this.log = log;
    this.budget = { maxVoices: 160, hrtfVoices: 40, ...budget }; this.warp = 1; this.battleNow = 0; this.ctxAtBattleNow = 0;
    this.active = new Set(); this.audioBuffers = new Map(); this.stats = { scheduled: 0, started: 0, stolenAtRuntime: 0, folded: 0, culled: 0 };
    const c = ctx; this.dryBus = c.createGain(); this.wetBus = c.createGain(); this.reverbIn = c.createGain(); this.reverbIn.gain.value = 1;
    this.convolver = c.createConvolver(); this.convolver.buffer = makeImpulseResponse(c, {});
    this.trim = c.createGain(); this.trim.gain.value = 1; this.limiter = c.createDynamicsCompressor();
    Object.assign(this.limiter.threshold, { value: -10 }); Object.assign(this.limiter.knee, { value: 6 }); Object.assign(this.limiter.ratio, { value: 12 }); Object.assign(this.limiter.attack, { value: 0.003 }); Object.assign(this.limiter.release, { value: 0.25 });
    this.dryBus.connect(this.trim); this.dryBus.connect(this.reverbIn); this.reverbIn.connect(this.convolver); this.convolver.connect(this.wetBus); this.wetBus.connect(this.trim); this.trim.connect(this.limiter); this.limiter.connect(c.destination);
    this.beds = new Map(); this.bedNoise = null; this.foldedBed = null;
  }
  async resume() { if (this.ctx.state === 'suspended') await this.ctx.resume(); }
  get outputLatencyS() { return (this.ctx.outputLatency || 0) + (this.ctx.baseLatency || 0); }
  /** Anchor the battle clock to the audio clock: call when the animation clock jumps (play, seek, speed change). */
  anchor(battleNow, warp = this.warp) { this.battleNow = battleNow; this.ctxAtBattleNow = this.ctx.currentTime; this.warp = warp; }
  wallTime(tBattle) { return this.ctxAtBattleNow + (tBattle - this.battleNow) / this.warp; }
  /** Battle time of the sound leaving the speakers now (the animation draws for this, not for the computed time). */
  battleHeard() { const ts = this.ctx.getOutputTimestamp ? this.ctx.getOutputTimestamp() : { contextTime: this.ctx.currentTime }; return this.battleNow + (ts.contextTime - this.ctxAtBattleNow) * this.warp; }

  audioBufferFor(soundId, variant, extra = {}) {
    const key = `${soundId}#${variant}${extra.words ? '|' + extra.words.join(' ') : ''}${extra.call ? '|' + extra.call : ''}`; let ab = this.audioBuffers.get(key); if (ab !== undefined) return ab;
    const s = this.bank.get(soundId, variant, extra); if (!s) { this.audioBuffers.set(key, null); return null; }
    ab = this.ctx.createBuffer(1, s.buf.length, this.bank.sr); ab.copyToChannel(s.buf, 0); ab.mainAtSamples = s.mainAtSamples || 0; ab.loop = !!s.loop; this.audioBuffers.set(key, ab); return ab;
  }

  /** Schedule an allocated voice. Returns the handle or null (sound unavailable, already over, or no budget left). */
  schedule(v) {
    const c = this.ctx, when = this.wallTime(v.tArrive);
    if (this.active.size >= this.budget.maxVoices) { this.stats.stolenAtRuntime++; return null; }
    const ab = this.audioBufferFor(v.soundId, v.variant, { words: v.voiceWords, call: v.call }); if (!ab) { this.stats.culled++; return null; }
    const dur = ab.duration / Math.max(0.5, v.doppler?.rate ?? 1);
    if (when + dur < c.currentTime) return null;                                    // already over: late drop (counted by the caller)
    const src = c.createBufferSource(); src.buffer = ab; src.loop = !!ab.loop; src.playbackRate.value = Math.max(0.5, Math.min(2, v.doppler?.rate ?? 1));
    const lp1 = c.createBiquadFilter(); lp1.type = 'lowpass'; lp1.frequency.value = v.filter.fc; lp1.Q.value = v.filter.Q;
    let tail = lp1; src.connect(lp1);
    if (v.filter.stages === 2) { const lp2 = c.createBiquadFilter(); lp2.type = 'lowpass'; lp2.frequency.value = v.filter.fc; lp2.Q.value = v.filter.Q; lp1.connect(lp2); tail = lp2; }
    const g = c.createGain(); g.gain.value = v.gainLin; tail.connect(g);
    let pan;
    if (v.panner === 'hrtf') { pan = c.createPanner(); pan.panningModel = 'HRTF'; pan.distanceModel = 'linear'; pan.rolloffFactor = 0; pan.refDistance = 1; pan.positionX.value = v.pan.vec[0] * 5; pan.positionY.value = v.pan.vec[1] * 5; pan.positionZ.value = v.pan.vec[2] * 5; }
    else { pan = c.createStereoPanner(); pan.pan.value = Math.max(-1, Math.min(1, Math.sin(v.pan.az))); }
    g.connect(pan); pan.connect(this.dryBus);
    const startAt = Math.max(c.currentTime, when - (ab.mainAtSamples || 0) / this.bank.sr / (v.doppler?.rate || 1)), offset = when < c.currentTime ? Math.min(ab.duration - 1e-3, c.currentTime - when) : 0;
    src.start(startAt, offset); const handle = { src, nodes: [lp1, g, pan], v, end: startAt + dur };
    src.onended = () => { this.active.delete(handle); try { src.disconnect(); lp1.disconnect(); g.disconnect(); pan.disconnect(); } catch (e) { /* already disconnected */ } };
    this.active.add(handle); this.stats.scheduled++; this.stats.started++;
    if (v.panner === 'hrtf') for (const e of (v.echoes || []).slice(0, 2)) this._echoTap(ab, v, e, startAt);
    return handle;
  }
  _echoTap(ab, v, e, startAt) {
    const c = this.ctx, src = c.createBufferSource(); src.buffer = ab; src.playbackRate.value = v.doppler?.rate ?? 1;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = e.fc; const g = c.createGain(); g.gain.value = v.gainLin * e.gainLin; const p = c.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, Math.sin(e.azimuthRad)));
    src.connect(lp); lp.connect(g); g.connect(p); p.connect(this.dryBus); src.start(startAt + e.delay / this.warp);
    src.onended = () => { try { src.disconnect(); lp.disconnect(); g.disconnect(); p.disconnect(); } catch (err) { /* ok */ } };
  }
  /** A shell in flight (plan from planner.planShell): one looped source whose gain, rate and pan follow the segments (the moving-source voice). */
  scheduleFlight(f) {
    const c = this.ctx, ab = this.audioBufferFor(f.soundId, 0); if (!ab || !f.segments.length) return null;
    const src = c.createBufferSource(); src.buffer = ab; src.loop = true; const g = c.createGain(), p = c.createStereoPanner(), lp = c.createBiquadFilter(); lp.type = 'lowpass';
    src.connect(lp); lp.connect(g); g.connect(p); p.connect(this.dryBus); g.gain.value = 0;
    const t0 = this.wallTime(f.segments[0].tArrive); let first = true;
    for (const s of f.segments) { const w = Math.max(c.currentTime, this.wallTime(s.tArrive)); if (first) { g.gain.setValueAtTime(0, w); first = false; } g.gain.linearRampToValueAtTime(s.gainLin, w); src.playbackRate.linearRampToValueAtTime(Math.max(0.5, Math.min(2, s.rate)), w); p.pan.linearRampToValueAtTime(Math.max(-1, Math.min(1, Math.sin(s.az))), w); lp.frequency.linearRampToValueAtTime(s.fc, w); }
    const endW = this.wallTime(f.tLastHeard) + 0.05; g.gain.linearRampToValueAtTime(0, endW); src.start(Math.max(c.currentTime, t0)); src.stop(endW + 0.05);
    const handle = { src, nodes: [lp, g, p], flight: true, end: endW }; this.active.add(handle); src.onended = () => this.active.delete(handle); return handle;
  }
  /** Ambient bed on/off with a level in dB SPL (positionless, stereo). */
  setBed(name, soundId, on, levelDb = 40, trimDb = 22) {
    let b = this.beds.get(name);
    if (!on) { if (b) { b.g.gain.setTargetAtTime(0, this.ctx.currentTime, 1.5); } return; }
    if (!b) { const ab = this.audioBufferFor(soundId, 0); if (!ab) return; const src = this.ctx.createBufferSource(); src.buffer = ab; src.loop = true; const g = this.ctx.createGain(); g.gain.value = 0; src.connect(g); g.connect(this.dryBus); src.start(); b = { src, g }; this.beds.set(name, b); }
    b.g.gain.setTargetAtTime(Math.pow(10, (levelDb - 140 + trimDb) / 20), this.ctx.currentTime, 1.0);
  }
  /** Statistical bed of folded shots: looped band-limited noise whose level / direction follow the 100 ms bed events of planner.allocate(). */
  scheduleFoldedBed(bed, trimDb = 22) {
    const c = this.ctx; if (!bed.length) return;
    if (!this.foldedBed) { const n = Math.round(c.sampleRate * 2), ab = c.createBuffer(1, n, c.sampleRate), d = ab.getChannelData(0), rng = makeRng(77); for (let i = 0; i < n; i++) d[i] = rng() * 2 - 1;
      const src = c.createBufferSource(); src.buffer = ab; src.loop = true; const bp = c.createBiquadFilter(); bp.type = 'lowpass'; bp.frequency.value = 2000; const g = c.createGain(); g.gain.value = 0; const p = c.createStereoPanner(); src.connect(bp); bp.connect(g); g.connect(p); p.connect(this.dryBus); src.start(); this.foldedBed = { src, bp, g, p }; }
    const f = this.foldedBed;
    for (const b of bed) { const w = Math.max(c.currentTime, this.wallTime(b.t)); f.g.gain.linearRampToValueAtTime(Math.pow(10, (b.levelDb - 140 + trimDb) / 20) * 0.5, w); f.bp.frequency.setValueAtTime(Math.max(300, Math.min(9000, b.fc)), w); f.p.pan.linearRampToValueAtTime(Math.max(-1, Math.min(1, Math.sin(b.az) * (1 - b.spread))), w); }
  }
  setMasterTrimDb(db) { this.trim.gain.setTargetAtTime(Math.pow(10, db / 20), this.ctx.currentTime, 0.05); }
  /** Stop everything (seek, scenario change). */
  flush() { for (const h of [...this.active]) { try { h.src.stop(); } catch (e) { /* not started */ } try { h.src.disconnect(); } catch (e) { /* ok */ } } this.active.clear(); if (this.foldedBed) this.foldedBed.g.gain.cancelScheduledValues(this.ctx.currentTime); }
  get voiceCount() { return this.active.size; }
  dispose() { this.flush(); for (const b of this.beds.values()) { try { b.src.stop(); } catch (e) { /* ok */ } } this.beds.clear(); }
}
