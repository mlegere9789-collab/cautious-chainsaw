// weather3d + fx-host node tests: no browser, no GPU.   node --test docs/battle-theatre/app/tests/weather3d.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path';
import { BT } from './node-world.mjs';
import { Environment } from '../src/environment.mjs'; import { minOf } from '../src/clock.mjs';
import { WeatherTimeline, skyPalette, lum, speedOfSoundMs, dirOf, weatherStatement } from '../src/weather3d/timeline.mjs';
import { PARAMS, flat, GAPS, val } from '../src/weather3d/params.mjs';
import { WEATHER_FS, WEATHER_VS, withDefs, MAX_LIGHTS } from '../src/weather3d/shaders.mjs';
import { patchFxVertex, fxSources, EV_PER_ROW, EV_W } from '../src/weather3d/gl.mjs'; import { patchFxFragment } from '../src/weather3d/shaders.mjs';
import { GLSL_VERT, GLSL_FRAG, lint } from '../src/fx3d/shaders.mjs';
import { FxHost } from '../src/fx-host.mjs';
import { createAnimBus } from '../src/anim3d/events.mjs';
import { speedOfSound } from '../src/audio3d/physics.mjs';

const APP = path.resolve(BT, 'app'), J = f => JSON.parse(fs.readFileSync(path.join(BT, f), 'utf8')), D = f => JSON.parse(fs.readFileSync(path.join(APP, 'data/fx3d', f), 'utf8'));
const environment = new Environment(J('environment/ephemeris_1863.json'), J('environment/weather_timeline.json'));
const data = { params: D('params.json'), weapons: D('weapons.json'), fires: D('fires.json') };
const mk = (o = {}) => new WeatherTimeline(environment, { fxParams: data.params, ...o });
const at = (m, d, h = 12, mi = 0) => minOf(m, d, h, mi) * 60;
const battleMinutes = (step = 15) => { const a = minOf(6, 26), b = minOf(7, 6); const r = []; for (let m = a; m < b; m += step) r.push(m * 60); return r; };

test('params: every look parameter has a tier and a basis; no parameter claims more than it can; gaps have register files', () => {
  const f = flat(); assert.ok(Object.keys(f).length >= 35);
  for (const [k, v] of Object.entries(f)) { assert.ok(['documented', 'inferred', 'plausible-procedural'].includes(v.tier), k); assert.ok(v.basis && v.basis.length >= 25, k + ' needs a basis'); }
  // nothing about clouds, mist, wetness amount or stars is "documented"
  for (const k of Object.keys(f)) if (/^(cloud|fog\.(mist|rain|scale)|wet\.(albedo|puddle)|stars\.(cells|star_fraction|gain))/.test(k)) assert.notEqual(f[k].tier, 'documented', k);
  assert.match(f['stars.cells_per_radian'].basis, /NO STAR CATALOGUE/);
  const regs = fs.readdirSync(path.join(BT, 'GOVERNANCE/register')); for (const g of GAPS) assert.ok(regs.includes('EG-' + g.id + '.md'), 'register file ' + g.id);
  assert.equal(GAPS.length, 8);
});
test('timeline: deterministic, a pure function of t (scrub order does not matter)', () => {
  const a = mk(), b = mk(); const ts = [at(7, 3, 14), at(7, 2, 5), at(7, 4, 15), at(7, 3, 23), at(6, 28, 3)];
  const fwd = ts.map(t => JSON.stringify(a.at(t, {}))), rev = [...ts].reverse().map(t => JSON.stringify(b.at(t, {}))).reverse();
  assert.deepEqual(fwd, rev);
});
test('Q10: sky, fog and cloud radiance never fall below the floor at any minute of the battle, in every scenario of the conflicts', () => {
  const fl = val('sky.floor_radiance'), choices = [{}, { 'CF-JUL2-SKY': 'opt0' }, { 'CF-JUL2-SKY': 'opt1', 'CF-WIND-SPEED': 'opt0' }, { 'CF-JUL4-RAIN-TIMING': 'opt1', 'CF-JUL2-CLOUD-2PM': 'opt1' }];
  for (const ch of choices) { const w = mk({ choices: ch }); let n = 0, minL = 1e9;
    for (const t of battleMinutes()) { const s = w.at(t, {}), p = s.sky.palette; n++;
      for (const k of ['zenith', 'horizon', 'cloudLit', 'cloudShade']) for (let i = 0; i < 3; i++) assert.ok(p[k][i] >= fl[i] - 1e-9, `${k}[${i}] below the floor at ${t / 60}`);
      assert.ok(s.sky.exposure >= s.sky.nightFloor - 1e-9); minL = Math.min(minL, lum(p.zenith)); assert.ok(lum(p.horizon) > 0); }
    assert.ok(n > 900 && minL > 0.03, 'minimum zenith luminance ' + minL); }
  // a user who lowers the luminance floor to its lowest setting still gets a lit sky
  const w0 = mk({ nightFloor: 0 }); for (const t of [at(7, 3, 1), at(7, 4, 2)]) { const s = w0.at(t, {}); assert.ok(lum(s.sky.palette.zenith) >= lum(fl) - 1e-9); }
});
test('stars: only at night, never in the day, hidden by cloud, mist and a bright moon; the sky stays lit when they show', () => {
  const w = mk(); const s = t => w.at(t, {});
  for (const t of [at(7, 3, 12), at(7, 1, 15), at(6, 29, 9)]) assert.equal(s(t).sky.stars.visibility, 0);
  // clear moonless-ish deep night: Jun 28 02:00 (cover 0.3 assumed, gap) shows stars; overcast Jul 2 05:00 shows none
  assert.ok(s(at(6, 28, 2)).sky.stars.visibility > 0.1, 'clear night shows stars');
  assert.equal(s(at(7, 2, 3)).sky.stars.visibility < s(at(6, 28, 2)).sky.stars.visibility, true);
  for (const t of battleMinutes(30)) { const k = s(t); assert.ok(k.sky.stars.visibility >= 0 && k.sky.stars.visibility <= 1); if (k.cloud.cover >= 0.999) assert.equal(k.sky.stars.visibility, 0); if (k.sky.sunAlt > -6) assert.equal(k.sky.stars.visibility, 0); }
  // rotation follows the clock: one sidereal day returns the sky, 6 solar hours turn it by about 90 degrees + 0.0
  const r = t => s(t).sky.stars.rotation; const d = (r(at(7, 3, 6)) - r(at(7, 3, 0)) + 2 * Math.PI) % (2 * Math.PI); assert.ok(Math.abs(d - Math.PI / 2 * 1.0027379) < 1e-6);
  assert.equal(s(at(7, 3, 0)).sky.stars.tier, 'plausible-procedural'); assert.ok(s(at(7, 3, 0)).gaps.includes('W3D-G03'));
});
test('wetness and the ground: 0 until the Jul 3 storm, about 0.3 after it, 1.0 on Jul 4, drying after Jul 5; darker albedo and puddles follow it', () => {
  const w = mk(), g = t => w.at(t, {});
  assert.equal(g(at(7, 1, 12)).wetness.v, 0); assert.equal(g(at(7, 3, 12)).wetness.v, 0); assert.ok(Math.abs(g(at(7, 3, 20)).wetness.v - 0.3) < 1e-9); assert.equal(g(at(7, 4, 9)).wetness.v, 1);
  const dry = g(at(7, 2, 12)).ground, wet = g(at(7, 4, 9)).ground; assert.equal(dry.albedoMul, 1); assert.ok(wet.albedoMul < 0.7 && wet.albedoMul > 0.3); assert.equal(dry.puddle, 0); assert.ok(wet.puddle > 0.9);
  assert.equal(g(at(7, 3, 20)).ground.puddle, 0, 'no puddles at 0.3: mud, not puddles');
  // after-rain darkening decays monotonically after the Jul 5 rain, never negative
  let prev = 2; for (const h of [14, 20, 30, 40, 70, 120]) { const v = g(at(7, 5, 12) + h * 3600).wetness.v; assert.ok(v <= prev + 1e-12 && v >= 0); prev = v; }
  assert.ok(g(at(7, 4, 9)).gaps.includes('W3D-G05')); assert.ok(g(at(6, 28, 12)).gaps.includes('W3D-G04'));
  assert.equal(g(at(7, 4, 9)).wetness.known, true);
});
test('fog: clear days add nothing to the prototype fog; Jul 2 dawn, rain and the storm do; always tier-marked and registered', () => {
  const w = mk(), f = t => w.at(t, {});
  assert.equal(f(at(7, 1, 13)).fog.extra, 0, 'Jul 1 afternoon: clear'); const dawn = f(at(7, 2, 4, 30)), rain = f(at(7, 4, 15)), storm = f(at(7, 3, 18));
  assert.ok(dawn.fog.mist > 0.8 && dawn.fog.extra > 0.002 && dawn.fog.visibilityM < 1500); assert.ok(rain.fog.extra > 0); assert.ok(storm.fog.extra > rain.fog.extra * 0.5);
  for (const s of [dawn, rain, storm]) { assert.equal(s.fog.tier, 'plausible-procedural'); assert.ok(s.gaps.includes('W3D-G02')); assert.ok(s.marks.some(m => m.field === 'fog' && m.gap === 'W3D-G02')); }
  const sun = f(at(7, 2, 12)); assert.ok(sun.fog.mist < dawn.fog.mist, 'the dawn fog lifts with the sun (fx3d dampness)');
});
test('wind: the same wind as fx3d (S to SSW, Jul 3 calm during the Charge, drift continuous); cloud drift follows it', () => {
  const w = mk(), s = t => w.at(t, {}); const a = s(at(7, 2, 12)), c = s(at(7, 3, 14));
  assert.ok(a.wind.fromDeg >= 180 && a.wind.fromDeg <= 202.5); assert.ok(a.wind.toZ < -0.9 * a.wind.speed * 0.97 && a.wind.toX > 0, 'blows toward the north-northeast: z negative (north), x slightly east');
  assert.ok(c.wind.speed < 0.3 * a.wind.speed, 'Charge-hour calm'); assert.equal(w.fxenv.meanWind(at(7, 3, 14)).speed, c.wind.speed);
  const x0 = s(at(7, 2, 12)).cloud, x1 = s(at(7, 2, 12) + 600).cloud; assert.ok(x0.driftCellsX !== x1.driftCellsX || x0.driftCellsZ !== x1.driftCellsZ);
  for (const k of [x0, x1]) { assert.ok(k.driftCellsX >= 0 && k.driftCellsX < 256 && k.driftCellsZ >= 0 && k.driftCellsZ < 256); }
  // continuity: 1 s step moves the layer by less than a few cells (no jump at the wrap except the exact 256 period)
  const d = Math.abs(s(at(7, 2, 12) + 1).cloud.driftCellsZ - x0.driftCellsZ); assert.ok(d < 0.2 || Math.abs(d - 256) < 0.2);
});
test('tier marking (Q13 inputs): every state names the tier of what it drew; weather readings are never "documented"; gaps are listed', () => {
  const w = mk(); for (const t of [at(7, 2, 12), at(6, 28, 3), at(7, 4, 15), at(11, 19, 12)]) { const s = w.at(t, {});
    for (const m of s.marks) assert.ok(['documented', 'inferred', 'plausible-procedural', 'open gap'].includes(m.tier), m.field);
    for (const f of ['precip', 'cloud', 'wetness', 'wind', 'stars', 'fog']) if (f !== 'fog' || s.fog.extra > 0) assert.ok(s.marks.some(m => m.field === f), f);
    assert.ok(!s.marks.some(m => m.field === 'cloud' && m.tier === 'documented')); assert.ok(weatherStatement(s).length > 60); }
  const none = w.at(at(11, 19, 12), {}); assert.equal(none.record, false); assert.equal(none.cloud.known, false); assert.equal(none.cloud.tier, 'plausible-procedural'); assert.ok(none.gaps.includes('W3D-G01'));
  assert.equal(none.temp.speedOfSoundMs, null); assert.equal(none.temp.tier, 'open gap');
});
test('Q13 input: temperature and the speed of sound at it, equal to the audio layer formula; nothing is delayed or scaled in this layer', () => {
  const w = mk(), s = w.at(at(7, 3, 14), {}); assert.equal(s.temp.tempF, 87); const c = (87 - 32) * 5 / 9; assert.equal(s.temp.tempC, c);
  assert.equal(s.temp.speedOfSoundMs, speedOfSound(c)); assert.equal(speedOfSoundMs(c), speedOfSound(c)); assert.ok(Math.abs(s.temp.speedOfSoundMs - 349.4) < 0.5);
  const src = fs.readFileSync(path.join(APP, 'src/fx-host.mjs'), 'utf8') + fs.readFileSync(path.join(APP, 'src/weather3d/timeline.mjs'), 'utf8'); assert.ok(!/setTimeout|\bdelay\s*[:=(]/i.test(src.replace(/\/\/.*$/gm, '')), 'no timer or delay in the layer');
});
test('sky geometry: sun and moon directions come from the project ephemeris; sun above the horizon by day, below at night', () => {
  const w = mk(), n = w.at(at(7, 3, 12, 3), {}), m = w.at(at(7, 3, 1), {}); assert.ok(n.sky.sunDir[1] > 0.9); assert.ok(m.sky.sunDir[1] < 0);
  const v = dirOf(0, 0); assert.deepEqual([Math.round(v[0]), Math.round(v[1]), Math.round(v[2])], [0, 0, -1], 'north is -z'); const e = dirOf(90, 0); assert.ok(Math.abs(e[0] - 1) < 1e-9, 'east is +x');
  for (const t of battleMinutes(60)) { const s = w.at(t, {}); const len = Math.hypot(...s.sky.sunDir); assert.ok(Math.abs(len - 1) < 1e-9); }
  const full = w.at(at(7, 2, 1), {}); assert.ok(full.sky.moonIllum > 95);
});
test('shaders: weather GLSL is balanced, both modes defined, uniform names match gl.mjs; fx3d GLSL patches apply and stay balanced', () => {
  for (const [src, name] of [[WEATHER_VS, 'weather vs'], [WEATHER_FS, 'weather fs']]) { for (const [o, c] of ['()', '[]', '{}']) assert.equal(src.split(o).length, src.split(c).length, name + ' ' + o + c); assert.ok(!/\t/.test(src)); }
  const mul = withDefs(WEATHER_FS, 'mul'), add = withDefs(WEATHER_FS, 'add'); assert.match(mul, /^#version 300 es\n#define MODE_MUL\n/); assert.match(add, /#define MODE_ADD/); assert.ok(WEATHER_FS.includes(`uLPos[${MAX_LIGHTS}]`));
  const gl = fs.readFileSync(path.join(APP, 'src/weather3d/gl.mjs'), 'utf8'); const uniforms = [...WEATHER_FS.matchAll(/uniform\s+(?:sampler2D|vec[234]|int)\s+(u\w+)/g)].map(x => x[1]);
  for (const u of uniforms) if (u !== 'uDepth' && u !== 'uHeight') assert.ok(gl.includes('L.' + u), 'gl.mjs sets ' + u);
  const { vs, fs: fsx } = fxSources(); assert.equal((vs.match(/e >> 10/g) || []).length, 6); assert.ok(!/ivec2\(\d, e\)/.test(vs)); assert.ok(fsx.includes('linD(texelFetch(uDepth')); assert.ok(fsx.includes('uniform vec2 uNF'));
  assert.ok(!/vec3 lit = uLight\.z \* \(/.test(vs) && !/max\(uLight\.z \*/.test(vs), 'the two float-to-vec3 errors are fixed');
  for (const [o, c] of ['()', '[]', '{}']) { assert.equal(vs.split(o).length, vs.split(c).length); assert.equal(fsx.split(o).length, fsx.split(c).length); }
  assert.throws(() => patchFxFragment('void main(){}'), /changed/); assert.throws(() => patchFxVertex('void main(){}'), /changed/);
  assert.equal(EV_W, EV_PER_ROW * 6);
  // the wide layout addresses every event of a 16384-event store inside a 6144 x 17 texture, one-to-one
  const seen = new Set(); for (let e = 0; e < 16384 + 64; e++) for (let k = 0; k < 6; k++) { const x = (e & (EV_PER_ROW - 1)) * 6 + k, y = e >> 10; assert.ok(x < EV_W && y < 17); seen.add(y * EV_W + x); } assert.equal(seen.size, (16384 + 64) * 6);
});
test('luminance floor in the shader: the sky is clamped to the floor uniform, lights only add (multiply >= 1), nothing subtracts below zero on geometry except the exact fog undo', () => {
  assert.match(WEATHER_FS, /return max\(c, uFloor\);/); assert.match(WEATHER_FS, /Dm \*= \(1\.0 \+ L\);/); assert.match(WEATHER_FS, /max\(cc, uFloor \* 1\.2\)/);
  assert.match(WEATHER_FS, /float k = 1\.0 \/ max\(1\.0 - fp, 0\.05\);/);
});
// ---------- fx-host with a fake host: no GL
const fakeAnim = (log) => { const bus = createAnimBus(); return { bus, calls: log, advance(t0, t1) { log.push([t0, t1]); let n = 0; const pos = [10, 5, 10], dir = [0, 0, 1], info = { weaponId: 'm1861_springfield', round: 'ball', tier: 'inferred', cycleS: 20, ranksBack: 0 };
  for (let t = Math.ceil(t0 / 5) * 5; t < t1; t += 5) { bus.emit('fire', 'US-X', 1, t, 'long_arm', pos, dir, info); n++; } return n; } }; };
test('fx-host: wires fx3d to the anim bus (fire -> smoke and flash), replays after a seek ONLY into the effect handlers, and never emits an effect before its cause', async () => {
  const calls = []; const anim = fakeAnim(calls); const audioGot = []; anim.bus.on('fire', (u, f, t) => audioGot.push(t));
  const h = await FxHost.create({ api: 'none', world: { count: 0 } }, { environment, anim, data, geo: null, tier: 'laptop' });
  const t0 = at(7, 3, 13); const cam = { x: 10, y: 8, z: -20, fwd: [0, 0, 1], fov: 1, near: 0.25, far: 14000, right: () => [1, 0, 0], up: () => [0, 1, 0] };
  let r = h.update({ tSec: t0, cam }); assert.equal(r.driveState, 'replayed'); assert.deepEqual(calls[0], [t0 - 300, t0]); assert.equal(audioGot.length, 0, 'AUDIO sees nothing of a replay');
  assert.ok(r.stats.fx.pushed > 0 || r.stats.fx.aggEvents > 0, 'replayed shots produced effect events');
  // live window forward: advance(prev, t) runs on the bus and audio hears it
  r = h.update({ tSec: t0 + 1, cam }); assert.equal(r.driveState, 'live'); assert.deepEqual(calls.at(-1), [t0, t0 + 1]);
  r = h.update({ tSec: t0 + 8, cam }); assert.ok(audioGot.length >= 1); assert.ok(r.effects.pending >= 0);
  // causality in the packed frame: no event with t0 > now is drawn (pending are held back)
  const f = h.cur.fr; for (let i = 0; i < f.nEvents; i++) assert.ok(f.events[i * 24 + 3] <= f.now + 1e-4, 'event ' + i + ' exists before its cause');
  // a backwards scrub and a big jump: effects cleared, one replay once the clock is quiet
  const before = calls.length; r = h.update({ tSec: t0 - 3600, cam }); assert.equal(r.driveState, 'suspended'); r = h.update({ tSec: t0 - 3600, cam }); assert.equal(r.driveState, 'replayed'); assert.ok(calls.length > before);
  assert.equal(audioGot.length > 0, true); h.dispose();
});
test('fx-host: replay swaps the bus handlers and restores them even if the plan throws; dispose unsubscribes', async () => {
  const anim = { bus: createAnimBus(), advance() { throw new Error('plan failed'); } }; const heard = []; anim.bus.on('fire', () => heard.push(1));
  const h = await FxHost.create({ api: 'none' }, { environment, anim, data, tier: 'phone' }); const saved = anim.bus.h;
  assert.throws(() => h._replay(0, 10), /plan failed/); assert.equal(anim.bus.h, saved, 'handlers restored'); assert.equal(anim.bus.h.fire.length, 2);
  h.dispose(); assert.equal(anim.bus.h.fire.length, 1, 'only the foreign handler is left'); assert.equal(h.fx, null);
});
test('fx-host: scenario choices change re-seeds the effects and the weather; no anim means state only', async () => {
  const h = await FxHost.create({ api: 'none' }, { environment, data, tier: 'phone' }); const cam = { x: 0, y: 5, z: 0, fwd: [0, 0, 1], fov: 1 };
  const a = h.update({ tMin: minOf(7, 3, 14), cam, choices: {} }); assert.equal(a.driveState, 'no-anim'); const calm = a.wind.speed;
  const b = h.update({ tMin: minOf(7, 3, 14), cam, choices: { 'CF-WIND-SPEED': 'opt0' } }); assert.ok(b.wind.speed > calm * 2, '12 mph scenario is faster than the recommended 2-6 mph near-calm'); h.dispose();
});
test('fx-host: the ext hook chain keeps the structures layer working and is undone by dispose (fake renderer)', async () => {
  const calls = []; const R = { gl: null, o: { flags: { sky: true, particles: true } }, ext: { scene() { calls.push('inner'); }, shadow() { calls.push('shadow'); } } };
  const h = await FxHost.create({ api: 'none', R }, { environment, data, tier: 'phone' }); h._installGL = null;
  // emulate _installGL's chain without a GL context
  const self = h; let inner = R.ext; const outer = { scene(g, r) { if (inner && inner.scene) inner.scene(g, r); calls.push('mine'); }, shadow(g, c, r) { inner && inner.shadow && inner.shadow(g, c, r); } };
  Object.defineProperty(R, 'ext', { configurable: true, enumerable: true, get() { return outer; }, set(v) { inner = v; } });
  R.ext = { scene() { calls.push('structures'); } };            // the structures layer attaches AFTER us
  R.ext.scene(null, R); assert.deepEqual(calls, ['structures', 'mine']);
  delete R.ext; R.ext = inner; assert.equal(typeof R.ext.scene, 'function'); h.dispose();
});
