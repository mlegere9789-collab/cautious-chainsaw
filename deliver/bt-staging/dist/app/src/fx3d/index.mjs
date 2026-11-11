// FX3D: smoke, muzzle flash, shell bursts, dust and fire for the Battle Theatre. Pure ES module, no DOM, no GPU calls: it owns the data and the deterministic spawn model, and hands the
// renderer packed buffers (frame.events, frame.cum, frame.windHist, frame.lights) that shaders.mjs reads. The renderer integration is a separate step (docs/FX3D-NOTES.md, section "Wiring").
//
//   const fx = createFx({ data, environment, geo, groundAt, tier: 'desktop', api: 'webgl2' });
//   fx.onFire(unitId, figureIdx, t, weaponKind, position, direction, extra?)      // from the animation's fire event; t in seconds on the app clock (minutes * 60)
//   fx.onBurst({ t, kind: 'case'|'shell'|'solid'|'ricochet', pos, dir, fireId, weapon })   // shell bursts and ground impacts, caused by a fire event
//   fx.onMarch(columnId, t, column)                                                  // marching column, horse string or wagon train, once per frame while on screen
//   const frame = fx.update(t, camera)                                               // camera: { pos, fwd, fovY, heightPx, aspect }
//
// Rules the code keeps (tested): nothing exists before its cause; spawn is a pure function of the cause; no event is dropped (full store merges, mass kept); soldiers are never scaled.
import { FX_SEED, strHash, u01 } from './core.mjs';
import { Store, F, STRIDE, T, CLASS_OF, SMOKE_TYPES } from './store.mjs';
import { Emitter, resolveWeapon, isGunClass, airFor } from './emit.mjs';
import { FogAggregator, FogMap, sightlineOD, visibilityM } from './fog.mjs';
import { marchDust } from './dust.mjs';
import { Fires } from './fire.mjs';
import { FxEnv } from './env.mjs';
import { windFromHistory, WIND_HIST_N } from './wind.mjs';
import { tierBudget, allocate, spritesFor, bandOf, Governor, uiStatement, costMs } from './budget.mjs';
import { collectLights, LIGHT_STRIDE } from './lights.mjs';
import { GSTRIDE, GF, packEvent, packFlame, cumulative, tBaseOf, gpuCamBuffer } from './pack.mjs';
import { dustiness } from './dust.mjs';
import { puffState, SPRITE_K } from './core.mjs';
import { rec } from './store.mjs';

export const REPLAY_S = 300;          // the host re-sends the fire events of [t - REPLAY_S, t] after a seek
const ADDITIVE = new Set([T.FLASH, T.FUSE, T.EMBER]);
/** Steps per minute printed in Hardee for an infantry gait (common_time 90, quick_time 110, route_step 110, double_quick 165, urgent 180); unknown gait: common time (documented default). */
export const gaitSteps = (P, gait) => (P.dust.gait_steps_per_min && P.dust.gait_steps_per_min[gait]) || P.dust.steps_per_min_default;
const vec = v => (Array.isArray(v) || ArrayBuffer.isView(v) ? [v[0], v[1], v[2]] : [v.x, v.y, v.z]);

export function createFx(opts) {
  const { data, environment, geo = null, groundAt = () => 0, tier = 'desktop', api = 'webgl2', seed = FX_SEED, choices = {}, fireScenario = {}, contact = () => false } = opts;
  const P = data.params, budget = tierBudget(P, tier);
  const fxenv = opts.fxenv || new FxEnv(environment, P, { choices, seed });
  const wind = fxenv.wind;
  const store = new Store(budget.maxEvents); store.wind = wind;
  const emitter = new Emitter(data, r => store.push(r), { seed, choices });
  const agg = new FogAggregator(r => store.push(r));
  const fires = new Fires(data.fires, P, { toXZ: geo ? geo.xz : null, groundAt, scenario: fireScenario, contact });
  const gov = new Governor(P, budget.ms);
  const fogMap = new FogMap(opts.fogRes || 128);
  const S = { t: null, cam: null, envSec: NaN, env: null, envObj: {}, plumeT: null, marchT: new Map(), govScale: 1, frames: 0, last: null, seeks: 0 };
  const evBuf = new Float32Array(budget.maxEvents * GSTRIDE + 64 * GSTRIDE), cumBuf = new Uint32Array(budget.maxEvents + 64 + 1), lightBuf = new Float32Array(budget.lights * LIGHT_STRIDE);
  const histBuf = new Float32Array(2 * WIND_HIST_N), keyBuf = new Float64Array(budget.maxEvents), idxBuf = new Int32Array(budget.maxEvents), nBuf = new Int32Array(budget.maxEvents);

  const envAt = t => { const q = Math.floor(t); if (q !== S.envSec) { S.env = fxenv.at(q, S.envObj); S.envSec = q; } return S.env; };
  const camDist = (p) => { const c = S.cam; if (!c) return 0; return Math.hypot(p[0] - c.pos[0], p[1] - c.pos[1], p[2] - c.pos[2]); };

  function onFire(unitId, figureIdx, t, weaponKind, position, direction, extra = {}) {
    const pos = vec(position); let dir;
    if (typeof direction === 'number') dir = [Math.sin(direction) * Math.cos(extra.elev || 0), Math.sin(extra.elev || 0), Math.cos(direction) * Math.cos(extra.elev || 0)];   // heading in the prototype convention: forward = (sin h, cos h)
    else { dir = vec(direction); if (extra.elev && Math.abs(dir[1]) < 1e-9) { const h = Math.hypot(dir[0], dir[2]) || 1; dir = [dir[0] / h * Math.cos(extra.elev), Math.sin(extra.elev), dir[2] / h * Math.cos(extra.elev)]; } }
    const wk = extra.weaponId || weaponKind, rw = resolveWeapon(data, wk), gun = isGunClass(rw.w.class), env = envAt(t), d = camDist(pos), R = P.lod.near_radius_m, h = P.lod.hysteresis;
    let mode = 'near';
    if (!gun && S.cam) { if (d > R * (1 + h)) mode = 'fog'; else if (d > R * (1 - h)) mode = u01(seed, strHash(String(unitId)), figureIdx, 11) < (R * (1 + h) - d) / (2 * h * R) ? 'near' : 'fog'; }
    const r = emitter.fire({ unitId, figureIdx, t, weapon: wk, pos, dir, extra, env, ground: groundAt(pos[0], pos[2]), mode });
    if (mode === 'fog') { agg.add(r); return { mode, cause: r.cause }; }
    return { mode, events: r.length };
  }
  function onBurst(b) {
    const pos = vec(b.pos); return emitter.burst({ ...b, pos, env: envAt(b.t), ground: groundAt(pos[0], pos[2]) });
  }
  // a column marching (or a horse string, a wagon train) once per frame: ticks since the last call become dust puffs
  function onMarch(id, t, col, extra = {}) {
    const last = S.marchT.get(id), t0 = last == null ? t - P.dust.puff_interval_s : Math.max(last, t - 5); S.marchT.set(id, t); if (S.marchT.size > 20000) S.marchT.delete(S.marchT.keys().next().value);
    if (t <= t0) return 0; const head = vec(col.head);
    return marchDust({ P, env: envAt(t), t0, t1: t, col: { ...col, id, head, dir: col.dir }, camDist: camDist(head), sink: r => store.push(r), seed, ground: groundAt });
  }
  // BT-EVENTS 3.2: a flash in the pan: the cap flash only
  const onMisfire = (unitId, figureIdx, t, weaponKind, position, direction, info = {}) => onFire(unitId, figureIdx, t, weaponKind, position, direction, { ...info, misfire: true });
  // BT-EVENTS request R-FX-1: where a shell burst or a shot struck. The cause is found from (unitId, figureIdx, fireT, weapon) exactly as the fire event's own seed was made.
  const KIND = { shell_burst: 'shell', case_burst: 'case', solid_strike: 'solid', ricochet: 'ricochet', impact: 'solid' };
  function causeOf(unitId, figureIdx, fireT, weaponKind, info = {}) { if (info.shotId != null) return info.shotId >>> 0; const rw = resolveWeapon(data, info.weaponId || weaponKind); return emitter.shotSeed(unitId, figureIdx, fireT, strHash(rw.id) & 0xffff); }
  function onImpact(unitId, figureIdx, t, kind, position, direction, info = {}) {
    const k = KIND[kind]; if (!k) return null; const dir = typeof direction === 'number' ? [Math.sin(direction), 0, Math.cos(direction)] : direction ? vec(direction) : [0, 0, 1];
    return onBurst({ t, kind: k, pos: position, dir, fireId: info.fireT != null || info.shotId != null ? causeOf(unitId, figureIdx, info.fireT, info.weaponKind, info) : undefined, weapon: info.weaponId || info.weaponKind, extra: { speed: info.speedMs, balls: info.balls } });
  }
  // BT-EVENTS 3.7: a man or a horse falls: a puff of dust at the contact when the ground is dry
  function onFall(unitId, figureIdx, t, style, position, info = {}) {
    const env = envAt(t), D = dustiness(P, env.wetness.v, env.precip); if (D <= 0) return 0; const pos = vec(position), g = groundAt(pos[0], pos[2]), m = P.dust.kg_per_fall * D * (style === 'horse_fall' ? 10 : 1) * P.dust.surface_factor.unknown;
    store.push(rec({ X: pos[0], Y: g + 0.2, Z: pos[2], T0: t, TYPE: T.DUST, SEED: emitter.shotSeed(unitId, figureIdx, t, 77), MASS: m, SIG: 0.6, VY: P.dust.kick_up_ms, TAUD: 0.6, TAUDIS: P.dust.dissipation_tau_s, K: P.smoke.diffusion.K_h_m2s * 3, BETA: P.smoke.diffusion.beta_h_m2s3, VR: 0.4, SETTLE: P.dust.settle_ms, G: g, LIFE: 40, CAUSE: strHash(String(unitId)) ^ figureIdx }));
    return m;
  }
  // BT-EVENTS 3.5 unit_march(unitId, t, nFigures, stepsPerMin, speedMs, centroid, headingRad, gait): a column of fours about nFigures / column_men_per_m long, centred on the centroid
  const MOUNTED = new Set(['walk', 'trot', 'canter', 'gallop']);
  function onUnitMarch(unitId, t, nFigures, stepsPerMin, speedMs, centroid, headingRad, gait, info = {}) {
    if (!(stepsPerMin > 0)) stepsPerMin = gaitSteps(P, gait);                       // cadence missing: the printed Hardee rate of the gait (FX-G07), else common time
    const c = vec(centroid), mounted = MOUNTED.has(gait), length = Math.max(8, info.lengthM || nFigures / P.dust.column_men_per_m), dir = [Math.sin(headingRad), Math.cos(headingRad)];
    const head = [c[0] + dir[0] * length / 2, groundAt(c[0], c[2]), c[2] + dir[1] * length / 2];
    const col = mounted ? { kind: 'horse', count: nFigures, stepsPerMin: stepsPerMin * 4, length, head, dir, surface: info.surface || 'unknown' } : { kind: 'foot', men: nFigures, stepsPerMin, length, head, dir, surface: info.surface || 'unknown' };
    return onMarch(unitId, t, col);
  }
  // subscribe to an anim3d bus (BT-EVENTS section 2). Returns a function that unsubscribes.
  function attach(bus) {
    const subs = [['fire', onFire], ['misfire', onMisfire], ['fall', onFall], ['unit_march', onUnitMarch], ['impact', onImpact]]; for (const [n, f] of subs) bus.on(n, f);
    return () => { for (const [n, f] of subs) bus.off && bus.off(n, f); };
  }
  function seek(t) { store.clear(); agg.clear(); S.marchT.clear(); S.plumeT = t - 240; S.t = t; S.seeks++; S.needsReplay = { from: t - REPLAY_S, to: t }; return S.needsReplay; }

  function update(t, camera = null, uo = {}) {
    if (camera) S.cam = camera;
    if (S.t == null) { S.plumeT = t - 240; S.t = t; }
    store.now = t;
    if (t < S.t - 1e-6 || t - S.t > 900) seek(t);
    const env = envAt(t), air = airFor(P, env);
    if (S.plumeT < t) { fires.emitPlume(S.plumeT, t, r => store.push(r), air); S.plumeT = t; }
    agg.flush(t); store.expire(t); S.t = t; S.frames++;
    const cam = S.cam, tBase = tBaseOf(t); wind.history(t, histBuf);
    if (uo.gpuCull) return gpuFrame(t, tBase);
    const demand = {}, cand = []; let pending = 0;
    const cx = cam ? cam.pos[0] : 0, cy = cam ? cam.pos[1] : 0, cz = cam ? cam.pos[2] : 0, tanH = cam ? Math.tan(cam.fovY / 2) : 1, tanW = cam && cam.aspect ? tanH * cam.aspect : tanH;
    const st = {}, w = [0, 0];
    for (let i = 0; i < store.n; i++) {
      const o = i * STRIDE, a = store.a, ty = a[o + F.TYPE], age = t - a[o + F.T0];
      if (age < 0) { pending++; continue; }
      let x = a[o + F.X], y = a[o + F.Y], z = a[o + F.Z], rad = a[o + F.SIG];
      if (SMOKE_TYPES.has(ty)) {
        windFromHistory(histBuf, age, w); if (age > 1000) wind.displacement(a[o + F.T0], t, w);
        const f = 1 - Math.exp(-age / a[o + F.TAUD]), fb = 1 - Math.exp(-age / a[o + F.TAUB]);
        x += w[0] + a[o + F.VX] * a[o + F.TAUD] * f; z += w[1] + a[o + F.VZ] * a[o + F.TAUD] * f; y += a[o + F.VY] * a[o + F.TAUD] * f + a[o + F.VB] * a[o + F.TAUB] * fb - a[o + F.SETTLE] * age;
        const s2 = rad * rad + 2 * a[o + F.K] * age + a[o + F.BETA] * age * age * age; rad = SPRITE_K * Math.sqrt(s2);
      } else if (ty === T.FLASH) rad = Math.max(a[o + F.A1], 1);
      const dx = x - cx, dy = y - cy, dz = z - cz, dist = Math.hypot(dx, dy, dz);
      if (cam) {                                                          // view-cone cull with the effect's radius
        const fw = cam.fwd, z0 = dx * fw[0] + dy * fw[1] + dz * fw[2]; if (z0 < -rad) continue;
        const ang = Math.acos(Math.min(1, Math.max(-1, z0 / (dist || 1)))), lim = Math.atan(Math.hypot(tanH, tanW)) + Math.atan2(rad, Math.max(dist, 0.1)); if (ang > lim) continue;
      }
      const n = spritesFor(P, ty, dist, rad, cam); if (n <= 0) continue;
      const c = CLASS_OF[ty]; demand[c] = (demand[c] || 0) + n; cand.push(i); const k = cand.length - 1; nBuf[k] = n; keyBuf[k] = Math.floor(dist * dist) * 16384 + k; idxBuf[k] = i;
    }
    // flames of the live fires (stateless in time; zero outside the documented window by construction)
    const act = fires.active(t), flames = []; const bf = cam ? bandOf(P, 0) : 0;
    for (const f of act) { if (f.flame <= 0) continue; const dist = cam ? Math.hypot(f.x - cx, f.y - cy, f.z - cz) : 0, n = Math.max(1, Math.round(P.lod.n_full.flame * P.lod.band_factor[bandOf(P, dist)] * f.flame)); flames.push([f, n]); demand.fire = (demand.fire || 0) + n; }
    const cap = Math.max(1, Math.floor(budget.cap * S.govScale)), A = allocate(P, cap, demand);
    // error-diffusion rounding of the class scale: the sprites granted add up exactly to the class grant
    const carry = {}, order = new Array(cand.length); for (let k = 0; k < cand.length; k++) order[k] = k;
    const keys = Float64Array.from(cand, (_, k) => keyBuf[k]).sort(); // ascending by dist^2 * 16384 + k
    let nSm = 0, nAdd = 0, total = 0; const mark = new Uint8Array(cand.length), grant = new Int32Array(cand.length);
    for (let q = 0; q < keys.length; q++) {                              // nearest first, so the nearest sprites survive a cap
      const k = keys[q] % 16384, i = idxBuf[k], ty = store.a[i * STRIDE + F.TYPE], c = CLASS_OF[ty], sc = A.scale[c] ?? 1;
      if (sc >= 1) { grant[k] = nBuf[k]; } else { const acc = (carry[c] || 0) + nBuf[k] * sc, g = Math.floor(acc); carry[c] = acc - g; grant[k] = g; }
    }
    // order: smoke back to front (far first), then additive types
    const sm = [], ad = [];
    for (let q = keys.length - 1; q >= 0; q--) { const k = keys[q] % 16384; if (grant[k] <= 0) continue; const i = idxBuf[k]; (ADDITIVE.has(store.a[i * STRIDE + F.TYPE]) ? ad : sm).push(k); }
    let slot = 0; const rangeSmoke = [0, 0], rangeAdd = [0, 0], uncertain = [];
    for (const k of sm) { packEvent(store, idxBuf[k], evBuf, slot++, tBase, grant[k], 0); total += grant[k]; } rangeSmoke[1] = slot;
    rangeAdd[0] = slot;
    for (const k of ad) { packEvent(store, idxBuf[k], evBuf, slot++, tBase, grant[k], 0); total += grant[k]; }
    for (const [f, n] of flames) { const sc = A.scale.fire ?? 1, g = sc >= 1 ? n : Math.floor(n * sc + 0.5); if (g <= 0) continue; if (slot >= budget.maxEvents + 64) break; packFlame(f, evBuf, slot++, tBase, g, t); total += g; if (f.uncertain) uncertain.push(f.id); }
    rangeAdd[1] = slot;
    const nEv = slot, nSprites = cumulative(evBuf, nEv, cumBuf), nLights = collectLights(store, act, P, t, cam ? cam.pos : [0, 0, 0], budget.lights, lightBuf);
    const frame = S.last = {
      t, tBase, now: t - tBase, events: evBuf, nEvents: nEv, cum: cumBuf, nSprites, windHist: histBuf, lights: lightBuf, nLights, ranges: { smoke: rangeSmoke, additive: rangeAdd },
      env: { wind: env.wind, windSpeed: env.windSpeed, windFromDeg: env.windFromDeg, damp: env.damp, wetness: env.wetness, darkness: env.darkness, lighting: env.lighting, precip: env.precip },
      budget: { tier, api, cap, want: A.want, granted: A.total, share: A.share, capped: A.capped, perClass: A.granted, demand, scale: A.scale, modelMs: costMs(P, A.total, tier), ms: budget.ms, text: uiStatement(A, tier, opts.soldiers) },
      fires: act.map(f => ({ id: f.id, kind: f.kind, flame: f.flame, smoke: f.smoke, uncertain: f.uncertain, phase: f.phase })), uncertainFires: uncertain, pending, liveEvents: store.n,
    };
    return frame;
  }
  // WebGPU compute path: no per-event CPU work except the pack. Every live event goes to the GPU unculled with its full-LOD count; WGSL_COMPUTE culls, applies the distance LOD, the class scale
  // (from a cheap demand estimate: n_full * 0.25 per event, since the true LOD is the GPU's) and the hard cap, and writes the two indirect draws.
  function gpuFrame(t, tBase) {
    const cam = S.cam || { pos: [0, 0, 0], fwd: [0, 0, 1], fovY: 1, aspect: 1, heightPx: 1080 }, a = store.a, sm = [], ad = [], demand = {}; let pending = 0;
    const nOf = ty => { const k = { 1: 'musket', 2: 'gun', 3: 'ring', 4: 'fog', 5: 'burst', 6: 'burst', 7: 'canister', 8: 'earth', 9: 'dust', 10: 'dust', 12: 'fuse', 13: 'plume' }[ty]; return k ? P.lod.n_full[k] : 1; };
    for (let i = 0; i < store.n; i++) { const o = i * STRIDE, ty = a[o + F.TYPE]; if (t - a[o + F.T0] < 0) { pending++; continue; } (ADDITIVE.has(ty) ? ad : sm).push(i); const c = CLASS_OF[ty]; demand[c] = (demand[c] || 0) + nOf(ty) * 0.25; }
    const act = fires.active(t), fl = act.filter(f => f.flame > 0); demand.fire = (demand.fire || 0) + fl.length * P.lod.n_full.flame * 0.5;
    const cap = Math.max(1, Math.floor(budget.cap * S.govScale)), A = allocate(P, cap, demand); let slot = 0;
    for (const i of sm) packEvent(store, i, evBuf, slot++, tBase, nOf(a[i * STRIDE + F.TYPE]), 0);
    const split = slot;
    for (const i of ad) packEvent(store, i, evBuf, slot++, tBase, a[i * STRIDE + F.TYPE] === T.FUSE ? nOf(T.FUSE) : 1, 0);
    for (const f of fl) { if (slot >= budget.maxEvents + 64) break; packFlame(f, evBuf, slot++, tBase, P.lod.n_full.flame, t); }
    const classScale = P.budget.class_priority.map(c => A.scale[c] ?? 1), camBuffer = gpuCamBuffer(P, cam, cap, slot, split, classScale);
    const nLights = collectLights(store, act, P, t, cam.pos, budget.lights, lightBuf);
    return S.last = { t, tBase, now: t - tBase, events: evBuf, nEvents: slot, cum: cumBuf, nSprites: -1, windHist: histBuf, lights: lightBuf, nLights, gpuCull: { camBuffer, split, cap }, ranges: { smoke: [0, split], additive: [split, slot] }, pending, liveEvents: store.n, budget: { tier, api, cap, capped: A.capped, want: A.want, text: uiStatement(A, tier, opts.soldiers) }, fires: act.map(f => ({ id: f.id, flame: f.flame, uncertain: f.uncertain })), uncertainFires: act.filter(f => f.uncertain && f.flame > 0).map(f => f.id) };
  }
  function govern(effectMs) { S.govScale = gov.update(effectMs); return S.govScale; }
  const fogAt = (x0, z0, size) => fogMap.rasterize(store, P, S.t, wind, x0, z0, size);
  return {
    onFire, onMisfire, onBurst, onImpact, onFall, onMarch, onUnitMarch, attach, causeOf, update, seek, govern,
    ignite: (id, t) => fires.ignite(id, t), addFire: s => fires.addHost(s), fires,
    fogMap: fogAt, sightlineOD: (a, b) => sightlineOD(store, P, S.t, wind, a, b), visibility: (a, u, maxM) => visibilityM(store, P, S.t, wind, a, u, maxM),
    massAt: (t, types) => store.massAt(t, types), store, emitter, agg, wind, env: fxenv, P, budget, tier, api,
    flush: () => agg.flush(S.t ?? 0, true), replayWindow: () => S.needsReplay || null,
    stats: () => ({ ...emitter.stats, live: store.n, merged: store.merged, evicted: store.evicted || 0, pushed: store.pushed, expired: store.expired, aggMass: agg.massIn, aggEvents: agg.events, refusedFires: fires.refused.length, frames: S.frames, seeks: S.seeks, govScale: S.govScale, last: S.last ? S.last.budget : null }),
  };
}
export { GF, GSTRIDE, LIGHT_STRIDE, T, F, STRIDE, FX_SEED };
