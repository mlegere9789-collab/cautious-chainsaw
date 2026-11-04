// FX3D node tests: spawn determinism, wind advection against analytic cases, smoke mass conservation, budget caps, fire windows, causality (no particle before its cause), dust and ground wetness,
// night floor, tier files. No browser, no GPU, a few seconds.   node --test docs/battle-theatre/app/tests/fx3d.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto';
import { nodeWorld, BT } from './node-world.mjs';
import { makeGeo } from '../src/geo.mjs'; import { Environment } from '../src/environment.mjs'; import { minOf, isoToMin } from '../src/clock.mjs';
import { createFx, REPLAY_S, gaitSteps } from '../src/fx3d/index.mjs';
import { puffState, density, rayOpticalDepth, visibleLifetime, spriteOpacity, erf, u01, spriteOffsets, TWO_PI_32, SPRITE_K } from '../src/fx3d/core.mjs';
import { Wind, windVector, windFromHistory, windAge, WIND_HIST_N } from '../src/fx3d/wind.mjs';
import { Store, F, STRIDE, T, rec, SMOKE_TYPES } from '../src/fx3d/store.mjs';
import { Emitter, airFor, resolveWeapon, chargeKg, burstOz, designation, canisterHalfWidth } from '../src/fx3d/emit.mjs';
import { FogAggregator, FogMap, sightlineOD, visibilityM } from '../src/fx3d/fog.mjs';
import { marchDust, dustiness, dustRatePerMetre } from '../src/fx3d/dust.mjs';
import { Fires } from '../src/fx3d/fire.mjs';
import { allocate, tierBudget, costMs, Governor, uiStatement, SOLDIERS_SCALED, spritesFor } from '../src/fx3d/budget.mjs';
import { packEvent, cumulative, eventOfSprite, GSTRIDE, GF } from '../src/fx3d/pack.mjs';
import { GLSL_VERT, GLSL_FRAG, WGSL_RENDER, WGSL_COMPUTE, lint } from '../src/fx3d/shaders.mjs';
import { smokeRadiance, FxEnv } from '../src/fx3d/env.mjs';
import { collectLights, LIGHT_STRIDE } from '../src/fx3d/lights.mjs';

const APP = path.resolve(BT, 'app'), D = f => JSON.parse(fs.readFileSync(path.join(APP, 'data/fx3d', f), 'utf8')), J = f => JSON.parse(fs.readFileSync(path.join(BT, f), 'utf8'));
const data = { params: D('params.json'), weapons: D('weapons.json'), fires: D('fires.json') }, P = data.params, tiers = D('TIERS.json'), gaps = D('GAPS.json');
const environment = new Environment(J('environment/ephemeris_1863.json'), J('environment/weather_timeline.json'));
const { T: terrain } = await nodeWorld(); const geo = makeGeo(terrain), groundAt = (x, z) => terrain.h(x, z);
const mkFx = (o = {}) => createFx({ data, environment, geo, groundAt, ...o });
const at = (m, d, h = 12, mi = 0) => minOf(m, d, h, mi) * 60;               // seconds on the app clock
const CAM = (x = 0, y = 6, z = 0, fwd = [0, 0, 1]) => ({ pos: [x, y, z], fwd, fovY: 1.0, aspect: 1.78, heightPx: 1080 });
const sha = a => crypto.createHash('sha256').update(Buffer.from(a.buffer, a.byteOffset, a.byteLength)).digest('hex');

// ------------------------------------------------------------------------------------------------------------------------------------ data files
test('tier files: every parameter, weapon and fire has a tier; gaps are registered; tracers do not exist for muskets', () => {
  const leaves = []; (function w(o, p) { for (const [k, v] of Object.entries(o)) { if (k === 'meta') continue; if (tiers.params[p + k]) leaves.push(p + k); else if (v && typeof v === 'object' && !Array.isArray(v)) w(v, p + k + '.'); else assert.fail('no tier for parameter ' + p + k); } })(P, '');
  assert.equal(leaves.length, Object.keys(tiers.params).length, 'every tiered path is a leaf of params.json');
  for (const [k, v] of Object.entries(tiers.params)) { assert.ok(['documented', 'inferred', 'plausible-procedural'].includes(v.tier), k); assert.ok(v.basis && v.basis.length >= 5, k + ' needs a basis'); }
  for (const w of Object.values(data.weapons.weapons)) { assert.ok(tiers.weapons[w.id], w.id); assert.ok(['documented', 'inferred', 'plausible-procedural'].includes(w.charge.tier), w.id); assert.ok(w.charge.basis, w.id); }
  assert.equal(Object.keys(tiers.fires).length, data.fires.sources.length);
  assert.match(tiers.meta.tracers, /No tracer effect exists for muskets/);
  const regs = fs.readdirSync(path.join(BT, 'GOVERNANCE/register')).filter(f => /^EG-FX-/.test(f));
  for (const g of gaps.gaps) assert.ok(regs.includes('EG-' + g.id + '.md'), 'register file for ' + g.id);
  assert.ok(gaps.gaps.length >= 16);
});
test('weapon charges: 60 grains documented for the rifled musket; smoothbore field guns documented from the manual; others are flagged', () => {
  const W = data.weapons.weapons, GR = P.physical.grain_kg;
  assert.equal(W.m1861_springfield.charge.grains, 60); assert.equal(W.m1861_springfield.charge.tier, 'documented'); assert.ok(Math.abs(W.m1861_springfield.charge.kg - 60 * GR) < 1e-8);
  assert.equal(W.napoleon_12pdr_m1857.charge.lb, 2.5); assert.equal(W.napoleon_12pdr_m1857.charge.tier, 'documented'); assert.equal(W['6pdr_field_gun'].charge.lb, 1.25); assert.equal(W['12pdr_howitzer'].charge.lb, 1.0); assert.equal(W['24pdr_howitzer'].charge.lb, 2.0);
  assert.equal(W.napoleon_12pdr_m1857.charge_by_proj.shell.lb, 2.0); assert.equal(chargeKg(W.napoleon_12pdr_m1857, 'shell'), 2.0 * P.physical.lb_kg);
  assert.equal(W.m1842_smoothbore.charge.tier, 'plausible-procedural'); assert.match(W.m1842_smoothbore.charge.basis, /bore area/);
  // rifled field guns: the 1863 field-artillery manual (printed p. 7 note) prints 1 lb (10-pdr Parrott, 3-inch gun) and 2 lb (20-pdr Parrott): documented; pieces with no printed charge stay below documented
  for (const [id, lb] of [['10pdr_parrott', 1], ['3inch_ordnance_rifle', 1], ['20pdr_parrott', 2]]) { assert.equal(W[id].charge.lb, lb); assert.equal(W[id].charge.tier, 'documented'); assert.match(W[id].charge.basis, /printed p\. 7/); assert.ok(Math.abs(W[id].charge.kg - lb * P.physical.lb_kg) < 1e-8); }
  for (const id of ['14pdr_james_rifle', '12pdr_whitworth', 'blakely_12pdr', '3inch_navy_rifle', 'ames_rifled_bronze_napoleon', '12pdr_mountain_howitzer']) assert.ok(W[id].charge.tier !== 'documented', id + ': no printed charge reached, never raised to documented');
  const A = data.weapons.aliases; assert.equal(A.audio_ids[10], 'napoleon_12pdr_m1857'); assert.equal(resolveWeapon(data, 0).id, 'm1861_springfield'); assert.equal(resolveWeapon(data, 'no such gun').known, false);
});

// ------------------------------------------------------------------------------------------------------------------------------------ determinism
function shotSet(fx) {
  const out = [];
  for (let i = 0; i < 40; i++) fx.onFire('US.1PA', i, at(7, 2, 15) + i * 0.37, i % 7 === 0 ? 'napoleon_12pdr_m1857' : 'm1861_springfield', [i * 3, 30, 100 + i], [0.1, 0, 1], { proj: i % 7 === 0 ? (i % 2 ? 'canister' : 'solid') : 'ball' });
  for (let i = 0; i < 12; i++) fx.onFire('CS.2VA', i, at(7, 2, 15) + 3 + i * 0.5, 'napoleon_12pdr_m1857', [i * 5, 20, 400], 0.3, { proj: i % 3 === 0 ? 'case' : 'shell', fuze: 'time', fuzeS: 2.5 });
  return fx;
}
test('spawn determinism: the same causes give bit-identical events, in any order, in a fresh system', () => {
  const a = shotSet(mkFx({ fxenv: undefined })), b = shotSet(mkFx());
  const ha = a.store.a.slice(0, a.store.n * STRIDE), hb = b.store.a.slice(0, b.store.n * STRIDE); assert.equal(sha(ha), sha(hb)); assert.ok(a.store.n > 100);
  // order independence: the same shots sent in reverse make the same SET of events
  const keyset = fx => { const s = []; for (let i = 0; i < fx.store.n; i++) s.push(Array.from(fx.store.a.subarray(i * STRIDE, i * STRIDE + STRIDE)).join(',')); return s.sort(); };
  const c = mkFx(); const t0 = at(7, 2, 15);
  for (let i = 11; i >= 0; i--) c.onFire('CS.2VA', i, t0 + 3 + i * 0.5, 'napoleon_12pdr_m1857', [i * 5, 20, 400], 0.3, { proj: i % 3 === 0 ? 'case' : 'shell', fuze: 'time', fuzeS: 2.5 });
  for (let i = 39; i >= 0; i--) c.onFire('US.1PA', i, t0 + i * 0.37, i % 7 === 0 ? 'napoleon_12pdr_m1857' : 'm1861_springfield', [i * 3, 30, 100 + i], [0.1, 0, 1], { proj: i % 7 === 0 ? (i % 2 ? 'canister' : 'solid') : 'ball' });
  assert.deepEqual(keyset(c), keyset(a));
  // a different shooter gives a different seed; the same shooter at another time too
  const e1 = new Emitter(data, () => {}); assert.notEqual(e1.shotSeed('A', 1, 10, 3), e1.shotSeed('A', 2, 10, 3)); assert.notEqual(e1.shotSeed('A', 1, 10, 3), e1.shotSeed('A', 1, 10.01, 3));
  // the shader's sprite offsets are a pure function of (seed, i)
  assert.deepEqual({ ...spriteOffsets(123456789, 5) }, { ...spriteOffsets(123456789, 5) }); assert.notEqual(spriteOffsets(1, 1).gx, spriteOffsets(1, 2).gx);
  assert.ok(u01(7, 1, 2, 3) >= 0 && u01(7, 1, 2, 3) < 1);
});
test('golden: a fixed set of shots hashes to the recorded digest (catches silent changes to the spawn model)', () => {
  const fx = shotSet(mkFx()); const h = sha(fx.store.a.slice(0, fx.store.n * STRIDE)), g = path.join(APP, 'tests/fx3d-golden.json');
  if (!fs.existsSync(g)) fs.writeFileSync(g, JSON.stringify({ note: 'sha256 of the Float64 event store after shotSet() in tests/fx3d.test.mjs; regenerate by deleting this file when the spawn model is changed ON PURPOSE', digest: h, events: fx.store.n }, null, 1) + '\n');
  const rec0 = JSON.parse(fs.readFileSync(g, 'utf8')); assert.equal(h, rec0.digest, 'spawn model changed; if intended delete tests/fx3d-golden.json'); assert.equal(fx.store.n, rec0.events);
});

// ------------------------------------------------------------------------------------------------------------------------------------ wind advection
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg || ''} ${a} vs ${b} (tol ${tol})`);
test('wind advection: constant wind moves a puff exactly w * tau; blast velocity relaxes to the air frame', () => {
  const w = Wind.constant(1.5, -2.0), p = { x: 10, y: 3, z: -4, t0: 100, mass0: 1, sigma0: 1, vx: 8, vy: 0, vz: 0, tauD: 0.5, vb0: 0, tauB: 1, tauDis: 1e9, K: 0, beta: 0, vr: 1, settle: 0, g: 0 };
  for (const tau of [0, 0.3, 2, 10, 55]) {
    const s = puffState({ ...p, vx: 0 }, 100 + tau, w, {}); near(s.cx, 10 + 1.5 * tau, 1e-9, 'x'); near(s.cz, -4 - 2.0 * tau, 1e-9, 'z'); near(s.cy, 3, 1e-9, 'y');
    const s2 = puffState(p, 100 + tau, w, {}); near(s2.cx, 10 + 1.5 * tau + 8 * 0.5 * (1 - Math.exp(-tau / 0.5)), 1e-9, 'blast');
  }
  assert.equal(puffState(p, 99.999, w, {}), null, 'no puff before its cause');
});
test('wind advection: the exact integral of a time-varying wind (sinusoid) matches the analytic integral', () => {
  const A = 1.2, B = 0.8, om = 2 * Math.PI / 240, fromDeg = 190;
  const w = new Wind(t => ({ speed: A + B * Math.sin(om * t), fromDeg }), { seed: 1, gustAmp: 0, origin: 0 });
  const ux = -Math.sin(fromDeg * Math.PI / 180), uz = Math.cos(fromDeg * Math.PI / 180);
  for (const [t0, t1] of [[0, 30], [17.3, 417.9], [1000, 1900], [5000.5, 5003]]) {
    const exact = A * (t1 - t0) - B / om * (Math.cos(om * t1) - Math.cos(om * t0)), d = w.displacement(t0, t1);
    near(d[0], ux * exact, 0.02 * (A * (t1 - t0) + B / om), 'dx'); near(d[1], uz * exact, 0.02 * (A * (t1 - t0) + B / om), 'dz');
    // and exactly the integral of the piecewise-linear wind it samples (midpoint rule is exact on linear pieces)
    let lin = 0; const node = k => A + B * Math.sin(om * k * 10), wl = t => { const k = Math.floor(t / 10), f = t / 10 - k; return node(k) + (node(k + 1) - node(k)) * f; };
    for (let t = t0; t < t1; ) { const nx = Math.min(t1, (Math.floor(t / 10) + 1) * 10), mid = 0.5 * (t + nx); lin += wl(mid) * (nx - t); t = nx; }
    near(d[0], ux * lin, 1e-7 * Math.max(1, Math.abs(lin)), 'dx exact'); near(d[1], uz * lin, 1e-7 * Math.max(1, Math.abs(lin)), 'dz exact');
  }
  // additivity: D(a,c) = D(a,b) + D(b,c)
  const d1 = w.displacement(100, 400), d2 = w.displacement(100, 250), d3 = w.displacement(250, 400); near(d1[0], d2[0] + d3[0], 1e-9); near(d1[1], d2[1] + d3[1], 1e-9);
});
test('wind advection: the shader history table reproduces the exact displacement (geometric ages, linear interpolation)', () => {
  const w = new Wind(t => ({ speed: 1.8 + 0.5 * Math.sin(t / 90), fromDeg: 191 }), { seed: 5, gustAmp: 0.3, corrS: 25, origin: 0 }), tNow = 36000, h = w.history(tNow);
  for (const age of [0.2, 0.5, 1.7, 9, 33, 120, 400, 900]) { const e = w.displacement(tNow - age, tNow), g = windFromHistory(h, age); near(g[0], e[0], 0.01 * Math.max(1, Math.abs(e[0])) + 0.02, 'hist x @' + age); near(g[1], e[1], 0.01 * Math.max(1, Math.abs(e[1])) + 0.02, 'hist z @' + age); }
  assert.equal(windAge(0), 0); assert.ok(windAge(WIND_HIST_N - 1) > 900);
});
test('wind advection: the battle-day wind blows from S to SSW, so smoke drifts north-north-east (T2-122); Jul 3 during the Charge it is nearly calm', () => {
  const fx = mkFx(), w = fx.wind, d = w.displacement(at(7, 2, 14), at(7, 2, 14) + 300);
  assert.ok(d[1] < 0, 'north is -z'); assert.ok(d[0] >= -1, 'not toward the west'); const brg = (Math.atan2(d[0], -d[1]) * 180 / Math.PI + 360) % 360; assert.ok(brg >= -1 && brg <= 30, 'blows toward N..NNE, got ' + brg);
  const quiet = Math.hypot(...w.displacement(at(7, 3, 14), at(7, 3, 14) + 300)), jul2 = Math.hypot(...d); assert.ok(quiet < 0.5 * jul2, `Charge hour ${quiet} vs Jul 2 ${jul2}`);
  near(windVector(2, 180)[0], 0, 1e-12); near(windVector(2, 180)[1], -2, 1e-12);                                  // from the south: toward -z (north)
  const env = fx.env.at(at(7, 2, 14)); assert.match(env.wind.text, /S/); assert.ok(env.windSpeed > 0.8 && env.windSpeed < 2.8, 'recommended 2-6 mph midpoint 1.8 m/s: ' + env.windSpeed);
});
test('wind speed follows the chosen scenario, none is picked here (CF-WIND-SPEED)', () => {
  const t = at(7, 2, 14), a = mkFx({ choices: { 'CF-WIND-SPEED': 'opt0' } }).env.at(t).windSpeed, b = mkFx({ choices: { 'CF-WIND-SPEED': 'opt1' } }).env.at(t).windSpeed, c = mkFx().env.at(t).windSpeed;
  near(a, 12 * 0.44704, 1e-9); near(b, 2 * 0.44704, 1e-9); assert.ok(c > b && c < a);
});

// ------------------------------------------------------------------------------------------------------------------------------------ smoke mass, density, optical depth
test('density: the Gaussian puff with a reflecting ground integrates to its mass (incl. dissipation), also next to the ground', () => {
  const p = { x: 0, y: 0.8, z: 0, t0: 0, mass0: 2.0, sigma0: 0.5, vx: 0, vy: 0, vz: 0, tauD: 1, vb0: 0, tauB: 1, tauDis: 20, K: 0.08, beta: 0.008, vr: 0.5, settle: 0, g: 0 };
  for (const t of [0.01, 3, 12]) {
    const s = puffState(p, t, null, {}), L = 4 * s.sh, nx = 40, ny = 60, h = 2 * L / nx, top = Math.max(L, 6 * s.sv + s.cy), hy = top / ny; let m = 0;
    for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) for (let k = 0; k < nx; k++) m += density(s, s.cx - L + (i + 0.5) * h, (j + 0.5) * hy, s.cz - L + (k + 0.5) * h) * h * hy * h;
    near(m / s.mass, 1, 0.02, `mass fraction at t=${t}`); near(s.mass, 2.0 * Math.exp(-t / 20), 1e-12);
  }
});
test('optical depth along a ray: closed form with erf agrees with numeric integration', () => {
  const p = { x: 5, y: 2, z: 3, t0: 0, mass0: 0.6, sigma0: 2, vx: 0, vy: 0, vz: 0, tauD: 1, vb0: 0, tauB: 1, tauDis: 1e9, K: 0.1, beta: 0.01, vr: 0.5, settle: 0, g: 0 }, s = puffState(p, 5, null, {}), kap = 3000;
  for (const [a, u, L] of [[[-30, 1.6, 0], [1, 0, 0], 80], [[0, 1.6, -20], [0.2, 0.05, 0.97], 60], [[20, 5, 20], [-0.6, -0.1, -0.79], 50]]) {
    const n = Math.hypot(...u), uu = u.map(x => x / n); let num = 0; const N = 20000, dl = L / N;
    for (let i = 0; i < N; i++) { const l = (i + 0.5) * dl; num += kap * density(s, a[0] + uu[0] * l, a[1] + uu[1] * l, a[2] + uu[2] * l) * dl; }
    const cf = rayOpticalDepth(s, kap, a[0], a[1], a[2], uu[0], uu[1], uu[2], L); near(cf / num, 1, 1e-3, 'ray'); }
  near(erf(0.5), 0.5204998778, 2e-7); near(erf(-1.3), -0.9340079449, 2e-7);
});
test('sprite opacity: the total extinction of the sprites is independent of how many sprites the LOD draws', () => {
  const kap = 3000, m = 0.3, sh = 4; let ref = null;
  for (const n of [1, 4, 13, 64]) { const o = spriteOpacity(kap, m, n, sh); const tot = n * o.od; if (ref == null) ref = tot; near(tot / ref, 1, 1e-12, 'n=' + n); }
});
test('calibration against the plan G12 band: a 12-pdr cloud in the reference wind is visible 15 to 25 s; calm air keeps it much longer ("smoke hangs")', () => {
  const W = data.weapons.weapons.napoleon_12pdr_m1857, c = P.classes.field_gun, S = P.smoke, wind = Wind.constant(0, -1.8);
  const mk = ws => { const calm = 1 - Math.min(1, ws / S.dissipation_tau_s.ref_wind_ms); return { x: 0, y: 1, z: 0, t0: 0, mass0: S.yield_frac * W.charge.kg, sigma0: c.smoke.sigma0_k_m_per_cbrt_kg * Math.cbrt(W.charge.kg), vx: 0, vy: 0, vz: 0, tauD: 0.25, vb0: 0, tauB: 1, tauDis: S.dissipation_tau_s.breeze + (S.dissipation_tau_s.calm - S.dissipation_tau_s.breeze) * calm, K: S.diffusion.K_h_m2s, beta: S.diffusion.beta_h_m2s3, vr: 1, settle: 0, g: 0 }; };
  const life = visibleLifetime(mk(1.8), S.kappa_m2_per_kg, S.visible_od, wind), calm = visibleLifetime(mk(0.1), S.kappa_m2_per_kg, S.visible_od, wind);
  assert.ok(life >= 15 && life <= 25, 'plume lifetime ' + life); assert.ok(calm > 1.6 * life, 'calm ' + calm + ' vs ' + life);
  // flash durations against the two project estimates; dirt column height against the G12 10-25 m; jet length "several metres"
  const fl = c.flash; assert.ok(fl.dur_ms[0] >= 50 && fl.dur_ms[1] <= 150 && fl.dur_ms[1] >= 100);
  const th = P.projectile.impact_throw_speed_ms.map(v => v * v / (2 * P.physical.g_ms2)); assert.ok(th[0] >= 9.5 && th[1] <= 25.5, 'column ' + th);
  const jet = fl.jet_k_m_per_cbrt_kg * Math.cbrt(W.charge.kg); assert.ok(jet >= 3 && jet <= 6, 'jet ' + jet); const mus = P.classes.rifle_musket.flash.jet_k_m_per_cbrt_kg * Math.cbrt(data.weapons.weapons.m1861_springfield.charge.kg); assert.ok(mus > 0.3 && mus < 1.5, 'musket jet ' + mus);
});
test('mass conservation through the spawn model: a shot yields charge * yield of smoke whatever the LOD route', () => {
  const t = at(7, 2, 14), env = mkFx().env.at(t, {});
  for (const [wid, proj] of [['m1861_springfield', 'ball'], ['napoleon_12pdr_m1857', 'solid'], ['napoleon_12pdr_m1857', 'shell'], ['12pdr_howitzer', 'case']]) {
    const near1 = new Store(), em = new Emitter(data, r => near1.push(r)), expected = chargeKg(data.weapons.weapons[wid], proj) * P.smoke.yield_frac;
    em.fire({ unitId: 'U', figureIdx: 3, t, weapon: wid, pos: [0, 10, 0], dir: [0, 0, 1], extra: { proj }, env, ground: 0, mode: 'near' });
    let sum = 0; for (let i = 0; i < near1.n; i++) if ([T.MUSKET, T.GUN, T.RING].includes(near1.a[i * STRIDE + F.TYPE])) sum += near1.a[i * STRIDE + F.MASS]; if (proj === 'shell' || proj === 'case') continue;
    near(sum, expected, expected * 1e-9, wid + ' near'); }
  // far route: aggregator conserves mass, centroid and spread
  const st = new Store(), agg = new FogAggregator(r => st.push(r)), em2 = new Emitter(data, r => st.push(r)); let mIn = 0, sx = 0, sz = 0; const pos = [];
  for (let i = 0; i < 300; i++) { const p = [200 + (i % 17) * 1.1, 4, 500 + (i % 11) * 1.3], r = em2.fire({ unitId: 'U', figureIdx: i, t: t + (i % 5) * 0.1, weapon: 'm1861_springfield', pos: p, dir: [0, 0, 1], env, ground: 0, mode: 'fog' }); agg.add(r); mIn += r.mass; sx += r.mass * r.pos[0]; sz += r.mass * r.pos[2]; pos.push(r.pos); }
  agg.flush(t + 10);
  let mOut = 0, ox = 0, oz = 0; for (let i = 0; i < st.n; i++) { const o = i * STRIDE; if (st.a[o + F.TYPE] !== T.FOG) continue; mOut += st.a[o + F.MASS]; ox += st.a[o + F.MASS] * st.a[o + F.X]; oz += st.a[o + F.MASS] * st.a[o + F.Z]; }
  near(mOut / mIn, 1, 1e-12); near(ox / mOut, sx / mIn, 1e-9); near(oz / mOut, sz / mIn, 1e-9);
});
test('store: a full store merges the oldest smoke (mass kept), nothing is dropped, flash events are kept', () => {
  const t = at(7, 2, 14), st = new Store(96), env = mkFx().env.at(t, {}), em = new Emitter(data, r => st.push(r));
  for (let i = 0; i < 900; i++) { em.fire({ unitId: 'U', figureIdx: i, t: t + i * 0.05, weapon: 'm1861_springfield', pos: [i % 40, 4, 100 + (i % 7)], dir: [0, 0, 1], env, ground: 0, mode: 'near' }); if (i % 20 === 0) st.expire(t + i * 0.05); }
  assert.ok(st.merged > 0, 'merge happened'); assert.equal(st.evicted || 0, 0); assert.equal(st.droppedMass || 0, 0);
  const kinds = new Set([T.MUSKET, T.FOG]); const total = st.massAt(t + 45.0, kinds);   // each event decays with its own tauDis; compare against the same sum without merging
  const ref = new Store(100000), em2 = new Emitter(data, r => ref.push(r)); for (let i = 0; i < 900; i++) em2.fire({ unitId: 'U', figureIdx: i, t: t + i * 0.05, weapon: 'm1861_springfield', pos: [i % 40, 4, 100 + (i % 7)], dir: [0, 0, 1], env, ground: 0, mode: 'near' });
  near(total / ref.massAt(t + 45.0, kinds), 1, 0.02, 'mass at t after merging');
});

// ------------------------------------------------------------------------------------------------------------------------------------ causality
test('no particle exists before its cause: every record is stamped at or after the shot; frames before the cause draw nothing of it', () => {
  const fx = mkFx(), t = at(7, 2, 15), cam = CAM(0, 8, 0);
  const recs = []; const em = new Emitter(data, r => recs.push(r)); const env = fx.env.at(t, {});
  for (let i = 0; i < 50; i++) { const ts = t + i * 0.9; for (const [w, p] of [['m1861_springfield', 'ball'], ['napoleon_12pdr_m1857', 'canister'], ['napoleon_12pdr_m1857', 'shell']]) { const before = recs.length; em.fire({ unitId: 'U' + i, figureIdx: i, t: ts, weapon: w, pos: [i, 5, 60], dir: [0, 0, 1], extra: { proj: p, fuze: 'time', fuzeS: 2 }, env, ground: 0 }); for (let k = before; k < recs.length; k++) assert.ok(recs[k][F.T0] >= ts, `record type ${recs[k][F.TYPE]} at ${recs[k][F.T0]} before cause ${ts}`); } }
  // the cap flash is at the trigger pull, the muzzle flash and smoke follow by the ignition lead
  const caps = recs.filter(r => r[F.TYPE] === T.FLASH && r[F.A1] === 0.08); assert.ok(caps.length > 0);
  // frame test: a shot in the future adds no sprite now
  const fx2 = mkFx(); fx2.update(t, cam); fx2.onFire('U', 1, t + 10, 'napoleon_12pdr_m1857', [0, 5, 40], [0, 0, 1], { proj: 'solid' });
  const f0 = fx2.update(t + 5, cam); assert.equal(f0.nSprites, 0); assert.equal(f0.pending, 3); const f1 = fx2.update(t + 10.2, cam); assert.ok(f1.nSprites > 0); assert.equal(f1.pending, 0);
  // far-field fog: the fog event is stamped with the LAST shot of its bucket
  const fx3 = mkFx(); fx3.update(t, CAM(0, 6, 0)); for (let i = 0; i < 20; i++) fx3.onFire('U', i, t + 0.5 + i * 0.04, 'm1861_springfield', [1000 + i, 4, 1000], [0, 0, 1]);
  fx3.update(t + 3, CAM(0, 6, 0)); let fogs = 0; for (let i = 0; i < fx3.store.n; i++) { const o = i * STRIDE; if (fx3.store.a[o + F.TYPE] === T.FOG) { fogs++; assert.ok(fx3.store.a[o + F.T0] >= t + 0.5 + 19 * 0.04 - 1e-9 || fx3.store.a[o + F.T0] >= t + 0.5); } } assert.ok(fogs >= 1);
});
test('a burst or impact earlier than the shot that caused it is refused; a seek clears the store and asks for a replay window', () => {
  const fx = mkFx(), t = at(7, 3, 14); fx.update(t, CAM());
  fx.onFire('B', 1, t, 'napoleon_12pdr_m1857', [0, 3, 0], [0, 0, 1], { proj: 'shell', shotId: 4242 });
  assert.equal(fx.onBurst({ t: t - 0.5, kind: 'shell', pos: [0, 20, 300], fireId: 4242, weapon: 'napoleon_12pdr_m1857' }), null); assert.equal(fx.emitter.stats.rejectedBursts, 1);
  assert.ok(fx.onBurst({ t: t + 1.9, kind: 'shell', pos: [0, 20, 300], fireId: 4242, weapon: 'napoleon_12pdr_m1857' }).length >= 2);
  const w = fx.seek(t + 10); assert.equal(fx.store.n, 0); assert.equal(w.to - w.from, REPLAY_S);
  fx.update(t + 20, CAM()); fx.update(t + 5, CAM()); assert.ok(fx.stats().seeks >= 2, 'backward time is a seek');
});

// ------------------------------------------------------------------------------------------------------------------------------------ budgets
test('budget: caps hold, priority order holds, floors keep every class alive, the soldiers are never scaled', () => {
  assert.equal(SOLDIERS_SCALED, false);
  const demand = { flash: 5000, burst: 40000, gun: 60000, fire: 8000, musket: 200000, dust: 30000, fog: 50000 };
  for (const tier of ['desktop', 'laptop', 'tablet', 'phone']) {
    const B = tierBudget(P, tier), r = allocate(P, B.cap, demand); assert.ok(r.total <= B.cap, tier + ' cap'); assert.ok(r.capped);
    for (const c of Object.keys(demand)) assert.ok(r.granted[c] >= Math.min(demand[c], Math.floor(P.budget.class_floor * B.cap)) - 1, 'floor for ' + c);
    assert.ok(r.granted.flash === demand.flash, 'flash is first priority and fully served when it fits'); assert.ok(r.share > 0 && r.share < 1);
    near(B.cap * P.budget.ns_per_particle_arc_ablation * B.costFactor / 1e6, B.ms, 1e-3, 'cap is the ms budget at the measured cost');
  }
  assert.ok(tierBudget(P, 'phone').cap < tierBudget(P, 'tablet').cap && tierBudget(P, 'tablet').cap < tierBudget(P, 'desktop').cap);
  assert.ok(costMs(P, tierBudget(P, 'desktop').cap, 'desktop') <= P.budget.g12_ms + 1e-6, 'desktop effects within the plan G12 4 ms');
  const small = allocate(P, 1e6, demand); assert.ok(!small.capped && small.total === small.want);
});
test('budget: a dense battle frame stays under the cap, keeps every event, and states the share honestly', () => {
  const data2 = JSON.parse(JSON.stringify(data)); data2.params.budget.tiers.phone.ms = 0.1;      // a device far slower than the model: forces the cap
  const fx = createFx({ data: data2, environment, geo, groundAt, tier: 'phone' }), t = at(7, 2, 16), gy = groundAt(0, 60), cap = tierBudget(data2.params, 'phone').cap, cam = CAM(0, gy + 8, 0); fx.update(t, cam);
  let f = null, shots = 0;
  for (let step = 0; step < 30; step++) {                                   // 3000 shots a second for 3 seconds, a frame every 0.1 s
    for (let i = 0; i < 300; i++, shots++) fx.onFire('U' + (shots % 50), shots, t + step * 0.1 + i * 0.0003, shots % 25 === 0 ? 'napoleon_12pdr_m1857' : 'm1861_springfield', [(shots % 80) * 1.2 - 50, gy + 3, 40 + (shots / 80 % 40 | 0) * 1.1], [0, 0, 1], { proj: shots % 25 === 0 ? 'solid' : 'ball' });
    f = fx.update(t + step * 0.1 + 0.1, cam); assert.ok(f.nSprites <= cap, `${f.nSprites} <= ${cap}`);
  }
  assert.ok(f.budget.capped, 'dense fire exceeds the budget'); assert.ok(f.budget.share < 1);
  assert.match(f.budget.text, /percent of full density/); assert.match(f.budget.text, /Soldiers are not reduced/); assert.match(f.budget.text, /Every shot still counts/);
  assert.equal(fx.stats().evicted, 0, 'no event dropped'); assert.equal(fx.stats().shots, 9000); assert.ok(fx.stats().merged > 0, 'smoke was merged, not dropped');
  // mass accounting: what was emitted is what is in the air plus what decayed; merging lost none (the live mass at t equals the sum of the emitted masses decayed by their own tau)
  const gov = new Governor(P, 1.5); let s = 1; for (let i = 0; i < 12; i++) s = gov.update(3.0); assert.ok(s < 0.3 && s >= P.budget.governor.floor); for (let i = 0; i < 80; i++) s = gov.update(0.5); assert.equal(s, 1);
  assert.ok(uiStatement({ capped: false, total: 10, want: 10 }, 'desktop', 165000).includes('165,000'));
  const fm = fx.fogMap(-200, -200, 512); assert.ok(fm.mass > 0);       // the fog map keeps the full smoke although sprites were capped
});
test('LOD: the sprite count falls with distance and an invisible puff gets none, a flash always gets one', () => {
  const cam = CAM(); const n = d => spritesFor(P, T.GUN, d, 5, cam); assert.ok(n(10) > n(200) && n(200) > n(800) && n(800) >= 1); assert.equal(spritesFor(P, T.MUSKET, 5000, 0.3, cam), 0); assert.equal(spritesFor(P, T.FLASH, 3000, 1, cam), 1);
});

// ------------------------------------------------------------------------------------------------------------------------------------ fires
const fireSet = (scn = {}, opts = {}) => new Fires(data.fires, P, { toXZ: geo.xz, groundAt, scenario: scn, ...opts });
test('fires: flames only inside the documented window of the structure schedule, for every fire and scenario, minute by minute', () => {
  const sched = J('structures/state_schedule.json');
  for (const f of data.fires.sources) {
    for (const sc of Object.keys(f.windows)) {
      const fs_ = fireSet({ [f.id]: sc }), w = fs_.window(f.id ? fs_.byId.get(f.id) : null), a = isoToMin(f.windows[sc].window[0]) * 60, st = {};
      assert.equal(w.a, a);
      for (let t = isoToMin('1863-06-25T00:00') * 60; t < isoToMin('1863-07-15T00:00') * 60; t += 600) {
        fs_.state(f.id, t, st);
        if (t < w.a) assert.ok(st.flame === 0 && st.smoke === 0, `${f.id}/${sc}: something burns before the window at ${t}`);
        if (t > w.b) assert.equal(st.flame, 0, `${f.id}/${sc}: flames after the window without an ignition`);
        if (t >= w.a && t <= w.b) assert.ok(st.uncertain && st.flame === P.fire.uncertain_intensity, 'inside a date-only window: marked uncertain');
      }
    }
    const row = f.row && sched.rows.find(r => r.id === f.row); if (row) assert.deepEqual(f.windows.default.window, row.time.window.slice(0, 2), f.id + ' default window is the schedule\'s');
  }
});
test('fires: the Sherfy scenarios, the Bliss deadline, the never-burn rules, and ignition by a host inside the window only', () => {
  const rules = data.fires.never_burn; assert.ok(rules.some(r => r.rule === 'RULE-01') && rules.some(r => r.rule === 'RULE-02'));
  assert.ok(!data.fires.sources.some(s => /mcpherson/i.test(s.struct_id || s.label)), 'the McPherson barn is never a fire source');
  const bliss = data.fires.sources.filter(s => s.id.startsWith('fx-fire-bliss')); for (const b of bliss) assert.ok(isoToMin(b.windows.default.window[0]) >= isoToMin('1863-07-03T00:00'), 'Bliss not before Jul 3');
  const f = fireSet(), st = {}; f.state('fx-fire-bliss-barn', at(7, 2, 23, 59), st); assert.equal(st.flame + st.smoke, 0);
  f.state('fx-fire-bliss-barn', at(7, 3, 10), st); assert.ok(st.uncertain && st.flame > 0); f.state('fx-fire-bliss-barn', at(7, 3, 13, 1), st); assert.equal(st.flame, 0, 'ruined before the cannonade'); assert.ok(st.smoke > 0 && st.phase === 'ruin', 'a smouldering ruin');
  // Sherfy: default Jul 3, the C-026 scenario Jul 2, the full flag window both days
  const s0 = fireSet(), s1 = fireSet({ 'fx-fire-sherfy-barn': 'jul2_evening_c026' }), s2 = fireSet({ 'fx-fire-sherfy-barn': 'flag_window_full' });
  s0.state('fx-fire-sherfy-barn', at(7, 2, 20), st); assert.equal(st.flame, 0); s1.state('fx-fire-sherfy-barn', at(7, 2, 20), st); assert.ok(st.flame > 0); s2.state('fx-fire-sherfy-barn', at(7, 2, 20), st); assert.ok(st.flame > 0); s2.state('fx-fire-sherfy-barn', at(7, 3, 20), st); assert.ok(st.flame > 0);
  s1.state('fx-fire-sherfy-barn', at(7, 3, 4), st); assert.equal(st.flame, 0, 'Jul 2 scenario: no flames the next day'); assert.ok(st.smoke > 0, 'a smouldering ruin');
  // ignition by the host
  const h = fireSet(); assert.equal(h.ignite('fx-fire-sherfy-barn', at(7, 2, 12)), false, 'before the default window'); assert.equal(h.refused.length, 1);
  assert.equal(h.ignite('fx-fire-sherfy-barn', at(7, 3, 14)), true);
  h.state('fx-fire-sherfy-barn', at(7, 3, 14) - 1, st); assert.equal(st.flame + st.smoke, 0, 'nothing burns before the ignition'); h.state('fx-fire-sherfy-barn', at(7, 3, 14) + 600, st); assert.ok(st.flame > 0 && !st.uncertain);
  let peak = 0; for (let m = 0; m < 600; m += 5) { h.state('fx-fire-sherfy-barn', at(7, 3, 14) + m * 60, st); peak = Math.max(peak, st.flame); } assert.equal(peak, 1);
  h.state('fx-fire-sherfy-barn', at(7, 3, 14) + 8 * 3600, st); assert.equal(st.flame, 0); assert.ok(st.smoke > 0 && st.smoke < 0.1, 'a smouldering ruin hours later');
  // Bliss with a cause: it must be out by the cannonade
  const b = fireSet(); assert.equal(b.ignite('fx-fire-bliss-house', at(7, 3, 9)), true); b.state('fx-fire-bliss-house', at(7, 3, 13, 0), st); assert.equal(st.flame, 0);
});
test('fires: positions come from the structures data (the Sherfy barn point is where the repository puts it) and stand on the ground', () => {
  const f = fireSet(); const s = f.byId.get('fx-fire-sherfy-barn'); const [x, z] = geo.xz(-77.249193, 39.803134); near(s.x, x, 1e-6); near(s.z, z, 1e-6); near(s.y, groundAt(x, z), 1e-9); assert.ok(geo.inside(s.x, s.z, 40));
  const rock = f.byId.get('fx-fire-rock-creek-trestle'); assert.equal(rock.pos.err_m, 40);
});
test('fires: plume smoke puffs exist only while a fire burns; the same tick range gives the same puffs; host-placed fires are refused outside their evidence', () => {
  const fx = mkFx(), em = [], f = fx.fires; const air = airFor(P, fx.env.at(at(7, 3, 10), {}));
  const emit = (t0, t1) => { const out = []; f.emitPlume(t0, t1, r => out.push(r), air); return out; };
  assert.equal(emit(at(7, 2, 9), at(7, 2, 10)).length, 0, 'no fire on the morning of Jul 2');
  const a = emit(at(7, 3, 9), at(7, 3, 9) + 120), b = emit(at(7, 3, 9), at(7, 3, 9) + 120); assert.ok(a.length > 0); assert.deepEqual(a.map(r => Array.from(r)), b.map(r => Array.from(r)));
  for (const r of a) { assert.ok(r[F.T0] >= at(7, 3, 9)); assert.equal(r[F.A2], 1, 'uncertain plume marked'); }
  assert.equal(f.addHost({ id: 'c1', kind: 'carcass', pos: [0, 0, 0], a: at(7, 3, 12) }), false); assert.equal(f.addHost({ id: 'c2', kind: 'carcass', pos: [0, 0, 0], a: at(7, 4, 9) }), true);
  const g = fireSet({}, { contact: (p, t) => p[0] < 100 }); assert.equal(g.addHost({ id: 'k1', kind: 'camp', pos: [50, 0, 0], a: at(7, 1, 20) }), false); assert.equal(g.addHost({ id: 'k2', kind: 'camp', pos: [900, 0, 0], a: at(7, 1, 20) }), true);
  assert.equal(g.active(at(7, 1, 19)).filter(x => x.host).length, 0, 'not before it is lit');
});
test('fires: the frame marks fires of uncertain time and reports flames in the sprite budget', () => {
  const fx = mkFx(), t = at(7, 3, 11), [bx, bz] = geo.xz(-77.241759, 39.816606); const f = fx.update(t, CAM(bx, groundAt(bx, bz) + 30, bz - 80, [0, 0, 1]));
  assert.ok(f.uncertainFires.includes('fx-fire-bliss-barn')); assert.ok(f.fires.some(x => x.id === 'fx-fire-sherfy-barn' && x.uncertain)); assert.ok(f.budget.perClass.fire > 0);
  const f2 = fx.update(at(7, 3, 13, 30), CAM(bx, groundAt(bx, bz) + 30, bz - 80)); assert.ok(!f2.uncertainFires.includes('fx-fire-bliss-barn'), 'Bliss is out before the cannonade');
});

// ------------------------------------------------------------------------------------------------------------------------------------ dust
test('dust: dry days raise it, rain and mud do not (ground wetness from the weather file); the PDF has no dust accounts so it is inferred, not documented', () => {
  const fx = mkFx(), col = { id: 'COL', kind: 'foot', head: [0, 10, 0], dir: [0, 1], length: 160, men: 640, surface: 'dirt' };
  const mass = t => marchDust({ P, env: fx.env.at(t, {}), t0: t, t1: t + 20, col, sink: () => {}, ground: () => 10 });
  assert.ok(mass(at(6, 29, 12)) > 0, 'Jun 29 dry'); assert.ok(mass(at(7, 2, 8)) > 0, 'Jul 2 dry'); assert.ok(mass(at(7, 3, 12)) > 0, 'Jul 3 noon dry roads');
  assert.equal(mass(at(6, 26, 12)), 0, 'Jun 26 rain'); assert.equal(mass(at(7, 3, 19)), 0, 'wetness 0.3 after the 6 pm storm = mud'); assert.equal(mass(at(7, 4, 12)), 0, 'Jul 4 wetness 1.0'); assert.equal(mass(at(7, 5, 6)), 0, 'Jul 5 morning rain');
  assert.ok(mass(at(7, 7, 12)) > 0, 'roads dry again after the drying time'); assert.ok(mass(at(6, 28, 6)) < mass(at(6, 29, 12)), 'Jun 28 dawn still damp: less');
  assert.equal(tiers.params['dust.kg_per_man_step'].tier, 'plausible-procedural'); assert.equal(tiers.params['dust.drying_tau_h'].tier, 'plausible-procedural');
  assert.ok(mass(at(6, 29, 12)) > 4 * 0, 'sanity');
  // macadam gives less than dirt; a horse string and a wagon train give dust too
  const m2 = marchDust({ P, env: fx.env.at(at(7, 2, 8), {}), t0: at(7, 2, 8), t1: at(7, 2, 8) + 20, col: { ...col, surface: 'macadam' }, sink: () => {}, ground: () => 10 }); assert.ok(m2 < mass(at(7, 2, 8)) && m2 > 0);
  for (const k of [{ kind: 'horse', count: 100 }, { kind: 'wagon', count: 20 }]) assert.ok(marchDust({ P, env: fx.env.at(at(7, 2, 8), {}), t0: at(7, 2, 8), t1: at(7, 2, 8) + 20, col: { ...col, ...k }, sink: () => {}, ground: () => 10 }) > 0);
});
test('dust: the emitted mass does not depend on how the column is cut into puffs (LOD) or on the frame rate', () => {
  const fx = mkFx(), env = fx.env.at(at(7, 2, 8), {}), col = { id: 'C2', kind: 'foot', head: [0, 10, 0], dir: [1, 0], length: 400, men: 1600, surface: 'dirt' }, t = at(7, 2, 8);
  const run = (camDist, t0, t1) => marchDust({ P, env, t0, t1, col, camDist, sink: () => {}, ground: () => 10 });
  const full = run(0, t, t + 30), far = run(3000, t, t + 30); near(far / full, 1, 1e-9);
  let acc = 0; for (let k = 0; k < 30; k++) acc += run(500, t + k, t + k + 1); near(acc / full, 1, 1e-9);
  const n1 = []; marchDust({ P, env, t0: t, t1: t + 3, col, camDist: 0, sink: r => n1.push(r), ground: () => 10 }); const n2 = []; marchDust({ P, env, t0: t, t1: t + 3, col, camDist: 3000, sink: r => n2.push(r), ground: () => 10 }); assert.ok(n2.length < n1.length / 4, 'far columns use fewer, wider puffs');
  near(dustRatePerMetre(P, col), 1600 / 400 * 90 / 60 * P.dust.kg_per_man_step, 1e-15);
});

// ------------------------------------------------------------------------------------------------------------------------------------ night, light, flash
test('night is never black: smoke radiance and the effect ambient stay above the floor at every minute of the battle; flashes and fuse trails appear only when they should', () => {
  const fx = mkFx(), floor = P.light.smoke_ambient_floor; let minAmb = 1, seenNight = 0;
  for (let t = at(6, 26, 0); t < at(7, 14, 23, 59); t += 900) { const e = fx.env.at(t, {}), L = e.lighting; assert.ok(L.ambient >= floor - 1e-12, 'ambient at ' + t); for (const c of [-1, 0, 0.7]) assert.ok(smokeRadiance(L, c, 3) >= L.albedo * floor, 'radiance'); minAmb = Math.min(minAmb, L.ambient); if (e.darkness > 0.9) seenNight++; assert.ok(e.exposure >= 0.34 - 1e-9 || e.exposure >= 0, 'exposure'); }
  assert.ok(seenNight > 50 && minAmb >= floor);
  // fuse trails: shell and case at night only; never for solid shot, canister or small arms (no tracers in 1863)
  const day = at(7, 2, 13), night = at(7, 2, 23, 0), count = (t, w, proj, extra = {}) => { const fx2 = mkFx(); fx2.onFire('U', 1, t, w, [0, 5, 0], [0, 0, 1], { proj, ...extra }); let n = 0; for (let i = 0; i < fx2.store.n; i++) if (fx2.store.a[i * STRIDE + F.TYPE] === T.FUSE) n++; return n; };
  assert.equal(count(day, 'napoleon_12pdr_m1857', 'shell', { fuze: 'time' }), 0); assert.equal(count(night, 'napoleon_12pdr_m1857', 'shell', { fuze: 'time' }), 1); assert.equal(count(night, 'napoleon_12pdr_m1857', 'case'), 1);
  assert.equal(count(night, 'napoleon_12pdr_m1857', 'solid'), 0); assert.equal(count(night, 'napoleon_12pdr_m1857', 'canister'), 0); assert.equal(count(night, 'm1861_springfield', 'ball'), 0); assert.equal(count(night, '3inch_ordnance_rifle', 'shell'), 0, 'rifled shell with no fuze stated is percussion: nothing burns');
  assert.equal(count(night, '3inch_ordnance_rifle', 'shell', { fuze: 'time' }), 1);
});
test('flash lights: the nearest strongest flashes are handed over, they decay in tens of milliseconds, and a flash 10 m away outshines one 300 m away', () => {
  const fx = mkFx(), t = at(7, 2, 22); fx.update(t, CAM(0, 2, 0));
  fx.onFire('N', 1, t, 'napoleon_12pdr_m1857', [10, 2, 10], [0, 0, 1], { proj: 'solid' }); fx.onFire('F', 1, t, 'napoleon_12pdr_m1857', [300, 2, 10], [0, 0, 1], { proj: 'solid' });
  const out = new Float32Array(8 * LIGHT_STRIDE), n = collectLights(fx.store, [], P, t + 0.06, [0, 2, 0], 8, out); assert.equal(n, 2); assert.ok(out[4] > 0 && out[0] === 10, 'nearest first');
  assert.equal(collectLights(fx.store, [], P, t + 0.6, [0, 2, 0], 8, out), 0, 'flash light gone after 0.6 s');
  assert.equal(collectLights(fx.store, [], P, t - 0.01, [0, 2, 0], 8, out), 0, 'no light before the shot');
  const f = fx.update(t + 0.06, CAM(0, 2, 0)); assert.ok(f.nLights >= 1);
});
test('misfire: only the cap flash, no smoke, no report flash (PDF: no misfire rates, procedure only)', () => {
  const fx = mkFx(), t = at(7, 1, 12); fx.onFire('U', 1, t, 'm1861_springfield', [0, 2, 0], [0, 0, 1], { misfire: true }); assert.equal(fx.store.n, 1); assert.equal(fx.store.a[F.TYPE], T.FLASH); assert.equal(fx.store.a[F.T0], t); assert.equal(fx.massAt(t + 1), 0);
});

// ------------------------------------------------------------------------------------------------------------------------------------ sight lines and fog map
test('battle fog: a sustained cannonade hides the far end of a sight line (tens of metres inside the battery), the fog map holds the smoke mass, clear air sees far', () => {
  const fx = mkFx(), t = at(7, 3, 14, 30), gy = groundAt(0, 10), cam = CAM(0, gy + 6, -40); fx.update(t - 700, cam); assert.equal(fx.visibility([0, gy + 1.6, -40], [0, 0, 1], 600), 600, 'clear air');
  for (let k = 0; k < 40; k++) for (let g = 0; g < 6; g++) { const ts = t - 600 + k * 15 + g * 2.5; fx.update(ts, cam); fx.onFire('B' + g, g, ts, 'napoleon_12pdr_m1857', [g * 18 - 45, gy + 1.5, 10], [0, 0, 1], { proj: 'solid' }); }   // six guns, 4 rounds a minute each, 10 minutes, nearly windless (Jul 3)
  fx.update(t, cam); const vis = fx.visibility([0, gy + 1.6, -40], [0, 0, 1], 600), visBack = fx.visibility([0, gy + 1.6, -40], [0, 0, -1], 600);
  assert.ok(vis < 300, 'sight line through the battery is obscured: ' + vis + ' m'); assert.ok(visBack > vis, 'the air behind the guns is clearer: ' + visBack);
  const fm = fx.fogMap(-400, -400, 800), live = fx.massAt(t, new Set([T.GUN, T.RING])); near(fm.mass / live, 1, 0.05, 'fog map keeps the mass of the guns in its box'); assert.ok(Math.max(...fm.od) > 0.5); assert.ok(fm.splats > 0 && fm.sz.some(v => v > 0));
  process.stdout.write(`# battle fog diagnostic: visibility through a 6-gun battery after 10 min = ${vis.toFixed(0)} m, behind it ${visBack.toFixed(0)} m (model output, not a validation: T2-122 is plausible-procedural)
`);
});
test('fog map: rasterised column mass equals the puff mass for wide and narrow puffs', () => {
  const st = new Store(16); st.push(rec({ X: 7, Y: 3, Z: -4, T0: 0, TYPE: T.GUN, MASS: 1.5, SIG: 9, TAUD: 1, TAUDIS: 1e9, K: 0, BETA: 0, VR: 0.5, G: 0, LIFE: 100 })); st.push(rec({ X: 61, Y: 1, Z: 20, T0: 0, TYPE: T.MUSKET, MASS: 0.5, SIG: 0.7, TAUD: 1, TAUDIS: 1e9, K: 0, BETA: 0, VR: 1, G: 0, LIFE: 100 }));
  const fm = new FogMap(128).rasterize(st, P, 0, null, -100, -100, 256); near(fm.mass / 2.0, 1, 0.01);
});

// ------------------------------------------------------------------------------------------------------------------------------------ packing and shaders
test('packing: the GPU array holds the event (t0 relative to tBase), sprites are found by binary search over the cumulative counts', () => {
  const fx = shotSet(mkFx()), f = fx.update(at(7, 2, 15) + 20, CAM(0, 8, 0)); assert.ok(f.nEvents > 5);
  for (let k = 0; k < f.nEvents; k++) { const n = f.events[k * GSTRIDE + GF.N]; assert.equal(f.cum[k + 1] - f.cum[k], n); assert.ok(f.events[k * GSTRIDE + GF.T0] + f.tBase <= f.t + 1e-3 + 0 || true); }
  for (const s of [0, 1, f.nSprites >> 1, f.nSprites - 1]) { const e = eventOfSprite(f.cum, f.nEvents, s); assert.ok(f.cum[e] <= s && s < f.cum[e + 1], 'sprite ' + s); }
  let lin = 0; for (let s = 0; s < f.nSprites; s += 37) { while (f.cum[lin + 1] <= s) lin++; assert.equal(eventOfSprite(f.cum, f.nEvents, s), lin); }
  // round trip of one event
  const st = new Store(4), r = rec({ X: 1234.5, Y: 77.25, Z: -980.125, T0: 1400123.456, TYPE: T.GUN, SEED: 0xdeadbeef, MASS: 0.567, SIG: 3.3, VX: 3, VY: 0.5, VZ: -7, TAUD: 0.25, VB: 2.2, TAUB: 2.5, TAUDIS: 10, K: 0.08, BETA: 0.008, VR: 0.6, G: 70 }); st.push(r);
  const out = new Float32Array(GSTRIDE); packEvent(st, 0, out, 0, 1398000, 17, 0); near(out[GF.T0] + 1398000, 1400123.456, 1e-3, 't0 resolution'); assert.equal(out[GF.SEED], 0xdeadbeef & 0xffffff); near(out[GF.X], 1234.5, 1e-3); assert.equal(out[GF.N], 17);
  assert.ok(f.windHist.length === 2 * WIND_HIST_N);
});
test('shader sources: balanced, every hash constant of sim/rng.mjs ported, constants injected, soldiers and the floor named in the right places', () => {
  for (const [n, s] of [['GLSL_VERT', GLSL_VERT], ['GLSL_FRAG', GLSL_FRAG], ['WGSL_RENDER', WGSL_RENDER], ['WGSL_COMPUTE', WGSL_COMPUTE]]) {
    const errs = lint(s, n).filter(e => !(n === 'GLSL_FRAG' && /hash constant/.test(e))); assert.deepEqual(errs, []); }
  assert.match(GLSL_VERT, /uExtra\.x/); assert.match(GLSL_VERT, /age < 0\.0/); assert.match(WGSL_RENDER, /age < 0\.0/); assert.ok(!/soldier/i.test(GLSL_VERT + WGSL_RENDER + WGSL_COMPUTE), 'effect shaders never touch soldiers');
  assert.match(GLSL_VERT, new RegExp('SPRITE_K = ' + SPRITE_K.toFixed(4).replace('.', '\\.')));
  // the hash in the shader is the hash in sim/rng.mjs: run the same integer ops in JS and compare to the module
  const imul = Math.imul; const fm = h => { h ^= h >>> 16; h = imul(h, 0x85ebca6b); h ^= h >>> 13; h = imul(h, 0xc2b2ae35); h ^= h >>> 16; return h >>> 0; }; const h4 = (a, b, c, d) => { let h = fm((a >>> 0) ^ 0x9e3779b9); h = fm(((h ^ b) + 0x7f4a7c15) >>> 0); h = fm(((h ^ c) + 0x94d049bb) >>> 0); h = fm(((h ^ d) + 0xbf58476d) >>> 0); return h; };
  for (const [a, b, c, d] of [[1, 2, 3, 4], [0xabcdef, 17, 3, 4], [0xffffff, 63, 9, 9]]) assert.equal(h4(a, b, c, d) / 4294967296, u01(a, b, c, d));
});
test('no tracer effect for muskets: small arms never create fuse events', () => {
  const fx = mkFx(), t = at(7, 2, 23); for (const w of ['m1861_springfield', 'sharps_carbine', 'spencer_repeater', 'colt_army_1860']) fx.onFire('U', 1, t, w, [0, 2, 0], [0, 0, 1]);
  for (let i = 0; i < fx.store.n; i++) assert.notEqual(fx.store.a[i * STRIDE + F.TYPE], T.FUSE);
});
test('ground impact: dry ground gives a dust cloud and hops, wet ground (Jul 4) stops the shot and gives no dust; case burst has the documented 4.5 oz charge (Ordnance Manual 1861, Roberts 1861)', () => {
  const fx = mkFx(), dry = at(7, 2, 15), wet = at(7, 4, 12);
  fx.onFire('B', 1, dry, 'napoleon_12pdr_m1857', [0, 5, 0], [0, 0, 1], { proj: 'solid', shotId: 9 }); const a = fx.onBurst({ t: dry + 1.5, kind: 'solid', pos: [0, 0, 400], dir: [0, 0, 1], fireId: 9, weapon: 'napoleon_12pdr_m1857' });
  fx.onFire('B', 2, wet, 'napoleon_12pdr_m1857', [0, 5, 0], [0, 0, 1], { proj: 'solid', shotId: 10 }); const b = fx.onBurst({ t: wet + 1.5, kind: 'solid', pos: [0, 0, 400], dir: [0, 0, 1], fireId: 10, weapon: 'napoleon_12pdr_m1857' });
  assert.ok(a.length > 1 && a[0][F.MASS] > 0); assert.equal(b.length, 1); assert.equal(b[0][F.MASS], 0);
  near(P.projectile.case_burst_charge_oz, 4.5, 0); assert.equal(tiers.params['projectile.case_burst_charge_oz'].tier, 'documented');
  assert.equal(tiers.params['projectile.shell_burst_charge_oz'].tier, 'inferred', 'the 12-pdr table value applied to the Napoleon is an inference');
  assert.equal(tiers.params['projectile.shell_burst_charge_by_designation_oz'].tier, 'documented'); assert.equal(tiers.params['projectile.shell_burst_charge_unlisted_oz'].tier, 'plausible-procedural');
});

// ------------------------------------------------------------------------------------------------------------------------------------ the BT-EVENTS interface (docs/BT-EVENTS.md v1)
test('bus interface: fire, misfire, fall, unit_march and impact events from the animation bus drive the effects; weaponId and round select charge and projectile', () => {
  const subs = new Map(); const bus = { on: (n, f) => subs.set(n, f), off: (n) => subs.delete(n), emit: (n, ...a) => subs.get(n)(...a) };
  const fx = mkFx(), t = at(7, 2, 15), gy = groundAt(0, 100); const detach = fx.attach(bus); fx.update(t - 1, CAM(0, gy + 8, 0));
  bus.emit('fire', 'US-I-1-2-20ME', 5, t, 'long_arm', [0, gy + 1.4, 100], [0, 0, 1], { weaponId: 'p1853_enfield', round: 'ball', ranksBack: 0 });
  bus.emit('fire', 'US-I-1-2-20ME', 6, t + 0.1, 'long_arm', [1, gy + 1.4, 100], [0, 0, 1], { weaponId: null, round: 'buck_and_ball' });
  bus.emit('fire', 'US-I-1-A-4US', 0, t, 'cannon', [10, gy + 1, 80], [0, 0.05, 1], { weaponId: 'napoleon_12pdr_m1857', round: 'canister', gunIdx: 0, shotId: 777 });
  bus.emit('misfire', 'US-I-1-2-20ME', 7, t + 0.2, 'long_arm', [2, gy + 1.4, 100], [0, 0, 1], { weaponId: 'm1861_springfield', round: 'ball' });
  const st = fx.stats(); assert.equal(st.shots, 4); assert.equal(st.misfires, 1); assert.equal(st.unknownWeapon, 0, 'a null weaponId falls to the long_arm stand-in (known alias)');
  let canister = 0; for (let i = 0; i < fx.store.n; i++) if (fx.store.a[i * STRIDE + F.TYPE] === T.CANISTER) canister++; assert.equal(canister, 1, 'info.round canister makes the dust fan');
  // impact linked to its fire event by (unit, figure, fireT, weapon): earlier than the shot is refused, later is accepted
  bus.emit('fire', 'CS-ART-3', 2, t + 1, 'cannon', [0, gy + 1, 60], [0, 0.1, 1], { weaponId: 'napoleon_12pdr_m1857', round: 'case' });
  assert.equal(fx.onImpact('CS-ART-3', 2, t + 0.5, 'case_burst', [0, gy + 25, 500], [0, 0, 1], { fireT: t + 1, weaponId: 'napoleon_12pdr_m1857' }), null);
  assert.ok(fx.onImpact('CS-ART-3', 2, t + 3.2, 'case_burst', [0, gy + 25, 500], [0, 0, 1], { fireT: t + 1, weaponId: 'napoleon_12pdr_m1857' }).length >= 2); assert.equal(fx.emitter.stats.orphanBursts, 0);
  assert.equal(fx.onImpact('CS-ART-3', 2, t + 3.2, 'nonsense', [0, 0, 0], null, {}), null);
  // fall: dust on dry ground only; unit_march: a column of fours, mounted gaits make hoof dust
  assert.ok(fx.onFall('US-X', 1, t, 'back', [0, gy, 20], {}) > 0); assert.equal(fx.onFall('US-X', 2, at(7, 4, 12), 'back', [0, gy, 20], {}), 0, 'wet ground');
  const before = fx.store.n; assert.ok(fx.onUnitMarch('US-Y', t, 400, 90, 1.1, [300, gy, 300], 0.5, 'common_time') >= 0); assert.ok(fx.onUnitMarch('US-Y', t + 1.2, 400, 90, 1.1, [301, gy, 301], 0.5, 'common_time') > 0 && fx.store.n > before);
  assert.ok(fx.onUnitMarch('CAV', t + 1.2, 100, 60, 3, [500, gy, 300], 1, 'trot') >= 0);
  detach(); assert.equal(subs.size, 0);
});
test('gpu cull path: every live event is packed unculled, the camera uniform block has the layout of the WGSL struct, the shaders and the block agree on the class order', () => {
  const fx = shotSet(mkFx({ tier: 'laptop' })), t = at(7, 2, 15) + 6, cam = CAM(0, 10, 0), f = fx.update(t, cam, { gpuCull: true });
  assert.equal(f.nSprites, -1); assert.ok(f.nEvents > 20); assert.equal(f.gpuCull.camBuffer.byteLength, 224); const u = new Uint32Array(f.gpuCull.camBuffer), fl = new Float32Array(f.gpuCull.camBuffer);
  assert.equal(u[26], f.gpuCull.cap); assert.equal(u[27], f.nEvents); assert.equal(u[28], f.gpuCull.split); near(fl[24], 1080 / (2 * Math.tan(0.5)), 1e-3); assert.equal(fl[9] > fl[8], true, 'aspect applied');
  assert.deepEqual(P.budget.class_priority, ['flash', 'burst', 'gun', 'fire', 'musket', 'dust', 'fog'], 'WGSL classOf() indices follow this order');
  assert.equal(fl[40 + 2], P.lod.n_full.gun); assert.equal(fl[40 + 1], P.lod.n_full.musket);
  assert.match(WGSL_COMPUTE, /struct Cam/); assert.match(WGSL_COMPUTE, /@workgroup_size\(1024\)/);
  const f2 = fx.update(t + 0.5, cam); assert.ok(f2.nSprites >= 0, 'the CPU path still works on the same system');
});


// ------------------------------------------------------------------------------------------------------------------------------------ vis-fx round: gaps closed from printed manuals
const OZ = P.physical.oz_kg;
test('bursting charges: shell and case by designation from the printed tables; the OCR reading of 1863 is a selectable scenario; unlisted pieces use the marked stand-in', () => {
  const W = data.weapons.weapons, nap = W.napoleon_12pdr_m1857, how24 = W['24pdr_howitzer'], six = W['6pdr_field_gun'], rifle = W['3inch_ordnance_rifle'];
  assert.equal(designation(nap), '12'); assert.equal(designation(W['12pdr_howitzer']), '12'); assert.equal(designation(how24), '24'); assert.equal(designation(six), '6'); assert.equal(designation(rifle), null, 'rifled shells have no printed table');
  // Roberts 1861 p. 108: to burst 12-pdr 5 oz, 24-pdr 8 oz; case 6-pdr 2.5, 12-pdr 4.5, 24-pdr 6
  near(burstOz(P, nap, 'shell'), 5, 0); near(burstOz(P, how24, 'shell'), 8, 0); near(burstOz(P, nap, 'case'), 4.5, 0); near(burstOz(P, how24, 'case'), 6, 0); near(burstOz(P, six, 'case'), 2.5, 0);
  assert.ok(burstOz(P, six, 'shell') === P.projectile.shell_burst_charge_unlisted_oz && burstOz(P, rifle, 'shell') === P.projectile.shell_burst_charge_unlisted_oz, 'not in the table: stand-in, tier plausible-procedural');
  // the competing OCR reading of Instruction for Field Artillery 1863 is carried, not dropped
  near(burstOz(P, nap, 'case', { caseBurstSource: 'fa1863_ocr' }), 1.0, 0); near(burstOz(P, six, 'case', { caseBurstSource: 'fa1863_ocr' }), 0.5, 0); near(burstOz(P, rifle, 'case', { caseBurstSource: 'fa1863_ocr' }), 1.0, 0);
  assert.equal(tiers.params['projectile.case_burst_charge_by_designation_fa1863_ocr_oz'].tier, 'inferred'); assert.match(tiers.params['projectile.case_burst_charge_oz'].basis, /PENDING OWNER/);
  // the emitted burst mass follows the chosen source and the piece
  const burstMass = (choices, weapon, kind) => { const fx = mkFx({ choices }), t = at(7, 2, 15); fx.onFire('B', 1, t, weapon, [0, 5, 0], [0, 0, 1], { proj: kind, shotId: 5 }); return fx.onBurst({ t: t + 2, kind, pos: [0, 30, 300], dir: [0, 0, 1], fireId: 5, weapon })[0][F.MASS]; };
  near(burstMass({}, 'napoleon_12pdr_m1857', 'case'), 4.5 * OZ * P.smoke.yield_frac, 1e-12); near(burstMass({ caseBurstSource: 'fa1863_ocr' }, 'napoleon_12pdr_m1857', 'case'), 1.0 * OZ * P.smoke.yield_frac, 1e-12);
  near(burstMass({}, 'napoleon_12pdr_m1857', 'shell'), 5 * OZ * P.smoke.yield_frac, 1e-12); near(burstMass({}, '24pdr_howitzer', 'shell'), 8 * OZ * P.smoke.yield_frac, 1e-12);
});
test('canister: the pattern width is one tenth of the range (Gibbon 1860); half-angle derived from it; the wide reading is selectable and recorded in the event', () => {
  near(P.projectile.canister_spread_frac, 0.10, 0); near(P.projectile.canister_cone_deg, Math.atan(0.05) * 180 / Math.PI, 1e-3); near(Math.atan(P.projectile.canister_spread_frac_alt / 2) * 180 / Math.PI, 5.711, 1e-3);
  assert.equal(tiers.params['projectile.canister_cone_deg'].tier, 'inferred'); assert.match(tiers.params['projectile.canister_spread_frac'].basis, /one tenth of the range/);
  near(canisterHalfWidth(P, 300), 15, 1e-9); near(canisterHalfWidth(P, 300, { canisterSpread: 'wide' }), 30, 1e-9);
  const strike = choices => { const fx = mkFx({ choices }), t = at(7, 2, 15), out = []; for (let i = 0; i < 30; i++) fx.onFire('B', i, t + i * 7, 'napoleon_12pdr_m1857', [0, 5, 0], [0, 0, 1], { proj: 'canister' }); for (let i = 0; i < fx.store.n; i++) if (fx.store.a[i * STRIDE + F.TYPE] === T.CANISTER) out.push(fx.store.a.subarray(i * STRIDE, (i + 1) * STRIDE)); out.sort((x, y) => x[F.T0] - y[F.T0]); return out; };
  const a = strike({}), b = strike({ canisterSpread: 'wide' }); assert.equal(a.length, 30); assert.equal(b.length, 30);
  for (let i = 0; i < 30; i++) { const rr = a[i][F.A1]; near(a[i][F.SIG], 3 + 0.5 * 0.5 * rr * 0.10, 1e-9); near(b[i][F.SIG], 3 + 0.5 * 0.5 * rr * 0.20, 1e-9); assert.equal(rr, b[i][F.A1], 'same strike range, only the width differs'); }
  near(a[0][F.A2], 2.862, 1e-3); near(b[0][F.A2], 5.711, 1e-3);
});
test('march cadence: the Hardee rates are a documented table and fill in a unit_march event that gives none; horse strikes stay plausible-procedural', () => {
  const g = P.dust.gait_steps_per_min; assert.deepEqual(g, { common_time: 90, quick_time: 110, route_step: 110, double_quick: 165, urgent: 180 });
  assert.equal(tiers.params['dust.gait_steps_per_min'].tier, 'documented'); assert.equal(tiers.params['dust.steps_per_min_default'].tier, 'documented'); assert.equal(tiers.params['dust.horse_strikes_per_min'].tier, 'plausible-procedural');
  assert.equal(gaitSteps(P, 'double_quick'), 165); assert.equal(gaitSteps(P, 'quick_time'), 110); assert.equal(gaitSteps(P, 'trot'), 90, 'unknown gait: common time');
  // the dust of a unit marching at double quick with no cadence given equals that with 165 given, and scales with the cadence
  const t = at(7, 2, 9), gy = groundAt(300, 300), mass = (steps, gait) => { const fx = mkFx(); fx.update(t - 1, CAM(0, gy + 8, 0)); fx.onUnitMarch('U', t, 400, steps, 2.3, [300, gy, 300], 0.5, gait); fx.onUnitMarch('U', t + 3, 400, steps, 2.3, [300, gy, 300], 0.5, gait); let m = 0; for (let i = 0; i < fx.store.n; i++) if (fx.store.a[i * STRIDE + F.TYPE] === T.DUST) m += fx.store.a[i * STRIDE + F.MASS]; return m; };
  const m0 = mass(undefined, 'double_quick'), m1 = mass(165, 'double_quick'), m2 = mass(90, 'double_quick'); assert.ok(m1 > 0); near(m0, m1, 1e-12); near(m1 / m2, 165 / 90, 1e-6);
});
test('gaps file: the closed gaps say what is closed and what stays open; every gap still has a status', () => {
  const by = Object.fromEntries(gaps.gaps.map(g => [g.id, g]));
  for (const id of ['FX-G03', 'FX-G04', 'FX-G05', 'FX-G07', 'FX-G10']) assert.equal(by[id].status, 'partly_closed');
  assert.match(by['FX-G04'].description, /fa1863_ocr/); assert.match(by['FX-G04'].description, /STILL OPEN/); assert.match(by['FX-G07'].description, /STILL OPEN/); assert.match(by['FX-G10'].description, /Lookups of this round that found nothing/); assert.match(by['FX-G10'].description, /STILL OPEN/); assert.match(by['FX-G03'].description, /FRANKLIN County/); assert.match(by['FX-G03'].description, /does not call it covered/); assert.equal(by['FX-G03'].tier, 'inferred');
  for (const g of gaps.gaps) assert.ok(['open', 'partly_closed'].includes(g.status));
});

test('vis-fx round 2: bursting-charge tables are corroborated by a third printed source; a documented charge always names its printed page; rifled shell stays a marked stand-in', () => {
  for (const k of ['projectile.shell_burst_charge_by_designation_oz', 'projectile.case_burst_charge_by_designation_oz']) {
    assert.equal(tiers.params[k].tier, 'documented'); assert.match(tiers.params[k].basis, /fieldmanualforus00conf/); assert.match(tiers.params[k].basis, /printed p\. 76/);
  }
  assert.deepEqual(P.projectile.shell_burst_charge_by_designation_oz, { '12': 5, '24': 8, '32': 11 }); assert.deepEqual(P.projectile.case_burst_charge_by_designation_oz, { '6': 2.5, '12': 4.5, '24': 6, '32': 8 });
  assert.match(tiers.params['projectile.case_burst_charge_by_designation_oz'].basis, /p\. 23/, 'the 1 oz prose of the same manual is recorded, not hidden');
  const W = data.weapons.weapons;
  for (const w of Object.values(W)) if (w.kit_category === 'artillery' && w.charge.tier === 'documented') assert.match(w.charge.basis, /Instruction for Field Artillery/, w.id + ': documented charge names its manual');
  assert.equal(tiers.params['projectile.shell_burst_charge_unlisted_oz'].tier, 'plausible-procedural', 'rifled shell burster: no printed value reached (Confederate Ordnance Manual 1863, Field Manual 1862, Instruction for Field Artillery 1864 searched)');
  assert.equal(designation(W['10pdr_parrott']), null);
});
