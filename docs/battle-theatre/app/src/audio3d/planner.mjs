// The deterministic planning core of the sound engine. Takes events (shots, shells, bursts, signals, commands, crowds) and a listener, and produces, for every event, a
// VOICE PLAN: when the sound arrives (retarded time), how loud, how filtered, from which direction, with what Doppler, echoes and priority. No audio API is touched, so the same plan
// drives the Web Audio graph (webaudio.mjs) and the offline renderer (offline.mjs) and is testable in node. Same inputs always give the same plan (no Math.random, no clocks).
//
// Physics per event (all from physics.mjs, numbers from audio/model/acoustics.mjs, ISO 9613):
//   delay      exact moving-air travel time  t = d / (c + w.u) with c = 331.3 sqrt(1 + T/273.15) from the documented weather temperature; c * timeWarp when the clock is warped
//   level      peak(1 m) + muzzle directivity - 20 log10 d + weighted band loss (air absorption, ground effect OR diffraction over a ridge, optional rain)
//   filter     one gain + one biquad low-pass fitted to the band losses
//   direction  azimuth / elevation in the listener frame, interaural time and level difference for the non-HRTF path
//   echoes     ridge taps from the heightfield (terrain.echoes), a shared reverb send that grows with distance
//   budget     voices are individually sounded up to a budget; the rest are folded into a statistical bed with their summed power; protected shots are never folded
import { BANDS, spectrumWeights, airLossDb, groundLossDb, designPropagationFilter, spreadingDb, dbToLin, FULL_SCALE_DB_SPL, RURAL_NOISE_FLOOR_DB, makeAtmosphere, travelTime, directionFromListener, itdSeconds, equalPowerPan, ildGains, dopplerFactor, radialToward, dist3, powToDb } from './physics.mjs';
import { SOUNDS, soundForWeapon, burstSoundForProjectile, impactSoundForSurface, flightSoundForGun, HANDLING_BY_STEP } from './catalog.mjs';
import { WORD_PHONES } from './synth-voice.mjs';
import { unit, hash3 } from './rng.mjs';

export const DEFAULT_BUDGET = Object.freeze({
  maxVoices: 160,          // individually sounded voices alive at once (Web Audio graph); the worklet path in audio/mixer-bench handles ~1,700
  hrtfVoices: 40,          // of those, how many get the (costly) HRTF panner; the others use equal-power + ITD
  protectRadiusM: 150,     // a shot this close to the camera is never folded (audio/PLAN.md 6.3)
  protectTopPer100ms: 20,  // nor are the 20 loudest per 100 ms
  windowS: 0.1,
  cullBelowAmbientDb: 15,  // a sound this far under the ambient floor is inaudible and not made (counted)
  maxRangeM: 12000,        // beyond this only the far layer (statistical bed) is used
});

const lerp = (a, b, t) => a + (b - a) * t;
const asVec = (p) => (Array.isArray(p) ? p : [p.x, p.y, p.z]);

/** Words of a drill command text, restricted to the words the manuals print (data/audio3d/commands.json); words with no phoneme entry are dropped, never invented. */
export function commandWords(text) { return String(text || '').toLowerCase().replace(/[^a-z ]+/g, ' ').split(/\s+/).filter((w) => WORD_PHONES[w]); }

/** Make a listener function from a constant state or a track [{t, pos, vel, yaw}] (linear interpolation, clamped). */
export function makeListener(src) {
  if (typeof src === 'function') return src;
  if (Array.isArray(src)) {
    const tr = src.slice().sort((a, b) => a.t - b.t);
    return (t) => {
      if (t <= tr[0].t) return tr[0]; const n = tr.length; if (t >= tr[n - 1].t) return tr[n - 1];
      let lo = 0, hi = n - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (tr[m].t <= t) lo = m; else hi = m; }
      const a = tr[lo], b = tr[hi], u = (t - a.t) / (b.t - a.t);
      return { t, pos: a.pos.map((v, i) => lerp(v, b.pos[i], u)), vel: (a.vel || [0, 0, 0]).map((v, i) => lerp(v, (b.vel || [0, 0, 0])[i], u)), yaw: lerp(a.yaw || 0, b.yaw || 0, u), hAbove: lerp(a.hAbove ?? 1.6, b.hAbove ?? 1.6, u) };
    };
  }
  const c = { pos: asVec(src.pos), vel: src.vel || [0, 0, 0], yaw: src.yaw || 0, hAbove: src.hAbove ?? 1.6 };
  return () => c;
}

export function createPlanner({ atmosphere = makeAtmosphere(), terrain = null, listener, budget = {}, groundG = 1, ambientDb = RURAL_NOISE_FLOOR_DB.day, trimDb = 22, seed = 1863 } = {}) {
  let atm = atmosphere, lis = makeListener(listener || { pos: [0, 2, 0] }), amb = ambientDb;
  const B = { ...DEFAULT_BUDGET, ...budget };
  const stats = () => ({ planned: 0, culledInaudible: 0, culledRange: 0, individual: 0, folded: 0, stolen: 0, protectedKept: 0 });
  let S = stats();

  const groundOf = (p) => (terrain ? p[1] - terrain.heightAt(p[0], p[2]) : p[1]);

  /** Core: one point source emitting at tFire from position src (moving source: velocity vel). Returns a voice plan or null. */
  function planPoint({ id, soundId, tFire, src, vel = null, heading = null, variantKey = 0, gainDb = 0, seedExtra = 0, tag = null, n = 1, variant: variantOverride = null, voiceWords = null, call = null }) {
    S.planned++;
    const snd = SOUNDS[soundId]; if (!snd) return null;
    const c = atm.cEff, wind = atm.wind;
    // retarded arrival at the (possibly moving) listener
    let tA = tFire + travelTime(src, lis(tFire).pos, c, wind);
    for (let i = 0; i < 4; i++) tA = tFire + travelTime(src, lis(tA).pos, c, wind);
    const L = lis(tA), lp = L.pos, d = dist3(src, lp);
    if (d > B.maxRangeM) { S.culledRange++; return { culled: 'range', id, soundId, tFire, tArrive: tA, distance: d }; }
    const hs = Math.max(0.1, groundOf(src)), hr = L.hAbove ?? 1.6, w = spectrumWeights(snd.spectrum);
    // band losses: air + (ground | diffraction)
    let loss = airLossDb(atm, d), shadow = null;
    if (terrain && d > 30) { shadow = terrain.shadow(src, lp, BANDS, atm.c); }
    const shadowed = shadow && shadow.lossDb.some((x) => x > 0.1);
    if (shadowed) { for (let i = 0; i < BANDS.length; i++) loss[i] += shadow.lossDb[i]; }
    else { const g = groundLossDb(hs, hr, d, groundG); for (let i = 0; i < BANDS.length; i++) loss[i] += g[i]; }
    const filt = designPropagationFilter(loss, w);
    // muzzle directivity: level factor 1 + k cos(theta) (ASSUMED, PLAN 4.2)
    let dirDb = 0;
    if (heading != null && snd.directivity) { const to = [lp[0] - src[0], lp[2] - src[2]], tl = Math.hypot(to[0], to[1]) || 1, cosT = (Math.sin(heading) * to[0] + (-Math.cos(heading)) * to[1]) / tl; dirDb = 20 * Math.log10(1 + snd.directivity * cosT); }
    const manDb = snd.perMan ? 10 * Math.log10(Math.max(1, n)) : 0;                          // N men shouting together: incoherent power sum
    const levelDb = snd.peakDb1m + dirDb + manDb + gainDb - spreadingDb(d) + filt.gainDb;    // peak SPL at the listener
    const ambient = amb;
    if (levelDb < ambient - B.cullBelowAmbientDb) { S.culledInaudible++; return { culled: 'inaudible', id, soundId, tFire, tArrive: tA, distance: d, levelDb }; }
    const dir = directionFromListener(src, lp, L.yaw || 0);
    const itd = itdSeconds(dir.az, atm.c), lr = ildGains(dir.az);
    // Doppler: listener and (moving) source radial speeds at the arrival
    const vs = vel ? radialToward(src, vel, lp) : 0, vl = L.vel ? radialToward(lp, L.vel, src) : 0;
    const rate = dopplerFactor(vs, vl, c);
    // echoes and reverb
    let echoes = [];
    if (terrain && d > 150 && (snd.kind === 'shot' || snd.kind === 'burst') && levelDb > ambient + 6) echoes = terrain.echoes(src, lp, atm.c).map((t) => ({ delay: t.delay, gainLin: t.gain, azimuthRad: t.azimuthRad - (L.yaw || 0), fc: Math.max(300, filt.fc * 0.6), tier: t.tier, kind: t.kind }));
    const reverbSend = Math.min(0.6, 0.05 + 0.5 * (1 - Math.exp(-d / 700)));
    const variant = variantOverride != null ? variantOverride : Math.floor(unit(seed, hash3(id ?? 0, seedExtra, variantKey), 7) * snd.variants);
    const gainLin = dbToLin(levelDb - FULL_SCALE_DB_SPL + trimDb);
    return {
      id, soundId, family: snd.family, kind: snd.kind, variant, tFire, tArrive: tA, delay: tA - tFire, distance: d,
      levelDb, ambientDb: ambient, marginDb: levelDb - ambient, gainLin, filter: { gainDb: filt.gainDb, fc: filt.fc, Q: filt.Q, stages: filt.stages, rmsDb: filt.rmsDb },
      shadow: shadow ? { blocked: shadow.blocked, zMax: shadow.zMax, maxLossDb: Math.max(...shadow.lossDb), applied: !!shadowed } : null,
      pan: { az: dir.az, el: dir.el, bearing: dir.bearing, itd, lr, vec: [Math.sin(dir.az) * Math.cos(dir.el), Math.sin(dir.el), -Math.cos(dir.az) * Math.cos(dir.el)] },
      doppler: { rate, sourceRadial: vs, listenerRadial: vl }, echoes, reverbSend, tag, loop: !!snd.loop,
      priority: snd.priority, score: levelDb - ambient + 10 * Math.log10(snd.priority) + (d < B.protectRadiusM ? 12 : 0), protected: d < B.protectRadiusM,
      src: [src[0], src[1], src[2]], voiceWords, call,
    };
  }

  // ------------------------------------------------------------------ event normalisation
  const evPos = (e) => [e.x ?? e.position?.[0] ?? e.pos?.[0], e.y ?? e.position?.[1] ?? e.pos?.[1], e.z ?? e.position?.[2] ?? e.pos?.[2]];
  const evHeading = (e) => (e.heading != null ? e.heading : e.direction ? Math.atan2(e.direction[0], -e.direction[2]) : null);

  /**
   * Plan one event. Event types:
   *   { type:'fire', id, t, weapon, x,y,z, heading, proj, seed, flags }            -> report (+ command voice when flags bit 2 and `commandPhrase` given)
   *   { type:'burst', id, t, proj, x,y,z } / { type:'impact', id, t, surface, x,y,z } -> burst / strike sounds (same arrival rule)
   *   { type:'crowd', id, t, kind:'cheer'|'yell'|'roar', men, x,y,z }
   *   { type:'command', id, t, x,y,z, phraseId }  { type:'signal', id, t, instrument:'bugle'|'drum', call, x,y,z }
   *   { type:'move', id, t, soundId:'move.hooves'|..., x,y,z, vel }
   *   { type:'ambient', ... } (beds are handled by webaudio.mjs from the environment state, not per event)
   */
  function planEvent(e) {
    const src = evPos(e); const t = e.t ?? e.tFire;
    switch (e.type || 'fire') {
      case 'fire': { const soundId = e.soundId || soundForWeapon(e.weapon); if (!soundId) { S.planned++; return { culled: 'unknown-weapon', id: e.id, weapon: e.weapon }; } return planPoint({ id: e.id, soundId, tFire: t, src, heading: evHeading(e), seedExtra: e.seed || 0, gainDb: e.misfire ? -60 : 0, tag: e.unitId ?? null }); }
      case 'burst': { const soundId = e.soundId || burstSoundForProjectile(e.proj); if (!soundId) return null; return planPoint({ id: e.id, soundId, tFire: t, src, seedExtra: e.seed || 0 }); }
      case 'impact': return planPoint({ id: e.id, soundId: impactSoundForSurface(e.surface), tFire: t, src, seedExtra: e.seed || 0 });
      case 'crowd': return planPoint({ id: e.id, soundId: `crowd.${e.kind || 'cheer'}`, tFire: t, src, n: e.men || 1, seedExtra: e.seed || 0 });
      case 'command': {
        const words = e.words || commandWords(e.text); if (!words.length) { S.planned++; return { culled: 'no-documented-words', id: e.id, text: e.text }; }
        return planPoint({ id: e.id, soundId: 'voice.command', tFire: t, src, heading: evHeading(e), seedExtra: e.seed || 0, tag: e.text || e.phraseId, voiceWords: words });
      }
      case 'handling': { const soundId = HANDLING_BY_STEP[e.step]; if (!soundId) { S.planned++; return { culled: 'silent-step', id: e.id, step: e.step }; } return planPoint({ id: e.id, soundId, tFire: t, src, seedExtra: e.seed || 0, tag: e.step }); }
      case 'fall': return planPoint({ id: e.id, soundId: e.style === 'horse_fall' ? 'impact.horse' : 'impact.man', tFire: t, src, seedExtra: e.seed || 0, tag: e.style });
      case 'march': return planPoint({ id: e.id, soundId: e.mounted ? 'move.hooves' : 'move.feet', tFire: t, src, vel: e.vel || null, n: e.men || 1, variant: e.variant ?? 0, tag: e.unitId ?? null });
      case 'signal': return planPoint({ id: e.id, soundId: e.instrument === 'drum' ? 'signal.drum' : 'signal.bugle', tFire: t, src, heading: evHeading(e), tag: e.call, call: e.call ? String(e.call).toLowerCase() : null, seedExtra: e.seed || 0 });
      case 'move': return planPoint({ id: e.id, soundId: e.soundId, tFire: t, src, vel: e.vel || null, n: e.men || 1, seedExtra: e.seed || 0, tag: e.unitId ?? null });
      default: S.planned++; return { culled: 'unknown-event-type', id: e.id, type: e.type };
    }
  }

  /**
   * Shell in flight: `traj` = [{t,x,y,z}] sampled positions (the animation's ballistic solution). Returns the moving-source voice: segments at the arrival (retarded) times with
   * distance, gain and Doppler per segment, plus `crossing`: whether the shot is heard before or after the gun's report (PLAN 3.2, the supersonic-approach case).
   */
  function planShell({ id, fireId, soundId, traj, reportArrival = null }) {
    const snd = SOUNDS[soundId]; if (!snd) return null;
    const c = atm.cEff, segs = [];
    for (let i = 0; i < traj.length; i++) {
      const p = [traj[i].x, traj[i].y, traj[i].z], tA = traj[i].t + travelTime(p, lis(traj[i].t).pos, c, atm.wind), L = lis(tA), d = Math.max(dist3(p, L.pos), 1);
      const v = i + 1 < traj.length ? [(traj[i + 1].x - traj[i].x) / (traj[i + 1].t - traj[i].t), (traj[i + 1].y - traj[i].y) / (traj[i + 1].t - traj[i].t), (traj[i + 1].z - traj[i].z) / (traj[i + 1].t - traj[i].t)] : null;
      const vs = v ? radialToward(p, v, L.pos) : 0, w = spectrumWeights(snd.spectrum), filt = designPropagationFilter(airLossDb(atm, d), w);
      const levelDb = snd.peakDb1m - spreadingDb(d) + filt.gainDb, dir = directionFromListener(p, L.pos, L.yaw || 0);
      segs.push({ tEmit: traj[i].t, tArrive: tA, distance: d, levelDb, gainLin: dbToLin(levelDb - FULL_SCALE_DB_SPL + trimDb), rate: dopplerFactor(vs, 0, c), az: dir.az, el: dir.el, fc: filt.fc, supersonicApproach: vs > c });
    }
    const first = Math.min(...segs.map((s) => s.tArrive)), supersonic = segs.some((s) => s.supersonicApproach);
    return { id, fireId, soundId, kind: 'flight', segments: segs, tFirstHeard: first, tLastHeard: Math.max(...segs.map((s) => s.tArrive)), supersonic, shotBeforeReport: reportArrival != null ? traj[traj.length - 1].t < reportArrival : null, tShotAtEnd: traj[traj.length - 1].t };
  }

  // ------------------------------------------------------------------ budget mixer
  /**
   * Run the voice budget over a batch of voice plans (events already planned). Voices are processed in order of arrival; a voice lasts `durationS` (from `dur`, default 1.2 s);
   * when more than maxVoices are alive the lowest-score unprotected one is folded (stolen) or the newcomer is folded. Folded power goes to the statistical bed, never lost.
   * Returns { voices, bed, stats, text } where text is the honest line for the UI.
   */
  function allocate(plans, { durationOf = (p) => (p.kind === 'burst' || p.family === 'artillery_report' ? 3.2 : p.kind === 'signal' ? 4 : p.kind === 'crowd' ? 3 : 1.2) } = {}) {
    const items = plans.filter((p) => p && !p.culled).slice().sort((a, b) => a.tArrive - b.tArrive || (a.id ?? 0) - (b.id ?? 0));
    // protect the loudest per window
    const byWin = new Map();
    for (const p of items) { const k = Math.floor(p.tArrive / B.windowS); (byWin.get(k) || byWin.set(k, []).get(k)).push(p); }
    for (const arr of byWin.values()) { arr.sort((a, b) => b.score - a.score); for (let i = 0; i < Math.min(B.protectTopPer100ms, arr.length); i++) arr[i].protected = true; }
    const alive = [], voices = [], foldedList = []; let steals = 0, hrtf = 0;
    for (const p of items) {
      const end = p.tArrive + durationOf(p); p.tEnd = end;
      for (let i = alive.length - 1; i >= 0; i--) if (alive[i].tEnd <= p.tArrive) { if (alive[i].panner === 'hrtf') hrtf--; alive.splice(i, 1); }
      if (alive.length >= B.maxVoices) {
        let vi = -1, vs = Infinity; for (let i = 0; i < alive.length; i++) if (!alive[i].protected && alive[i].score < vs) { vs = alive[i].score; vi = i; }
        if (vi >= 0 && p.score > vs + 1) { const v = alive.splice(vi, 1)[0]; if (v.panner === 'hrtf') hrtf--; v.foldedAt = p.tArrive; v.stolen = true; v.tEnd = p.tArrive; foldedList.push(v); steals++; S.stolen++; }
        else { p.folded = true; foldedList.push(p); S.folded++; continue; }
      }
      p.panner = hrtf < B.hrtfVoices && p.distance < 900 ? 'hrtf' : 'basic'; if (p.panner === 'hrtf') hrtf++;
      alive.push(p); voices.push(p); S.individual++; if (p.protected) S.protectedKept++;
    }
    // statistical bed: summed power per 100 ms of everything that was folded, direction = power-weighted mean azimuth
    const bins = new Map();
    for (const p of foldedList) { const t0 = p.stolen ? p.foldedAt : p.tArrive, k = Math.floor(t0 / B.windowS), b = bins.get(k) || bins.set(k, { t: k * B.windowS, pw: 0, x: 0, z: 0, fcPw: 0, n: 0 }).get(k); const pw = Math.pow(10, p.levelDb / 10); b.pw += pw; b.x += pw * Math.sin(p.pan.az); b.z += pw * Math.cos(p.pan.az); b.fcPw += pw * Math.log(p.filter.fc); b.n++; }
    const bed = [...bins.values()].sort((a, b) => a.t - b.t).map((b) => ({ t: b.t, levelDb: 10 * Math.log10(b.pw), az: Math.atan2(b.x, b.z), spread: 1 - Math.hypot(b.x, b.z) / b.pw, fc: Math.exp(b.fcPw / b.pw), n: b.n, powerSum: b.pw }));
    const text = foldedList.length ? `Sounding ${voices.length} shots individually; ${foldedList.length} quieter or farther shots are folded into the crowd of sound (voice budget ${B.maxVoices}).` : `Sounding all ${voices.length} shots individually (voice budget ${B.maxVoices}).`;
    return { voices, bed, folded: foldedList, stats: { ...S, text }, text };
  }

  return {
    budget: B, planPoint, planEvent, planShell, allocate, listenerAt: (t) => lis(t),
    setAtmosphere(a) { atm = a; }, setListener(l) { lis = makeListener(l); }, setAmbientDb(db) { amb = db; }, setTerrain(t) { terrain = t; },
    get atmosphere() { return atm; }, resetStats() { S = stats(); }, get stats() { return { ...S }; },
  };
}

/** Plan a batch of events and run the budget. Convenience for tests and the engine. */
export function planBatch(planner, events) { planner.resetStats(); const plans = events.map((e) => planner.planEvent(e)); return { plans, ...planner.allocate(plans) }; }
