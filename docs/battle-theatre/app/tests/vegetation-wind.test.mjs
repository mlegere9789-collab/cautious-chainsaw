// Node test of the wind the foliage and the crops sway in (src/ext/vegetation/wind.mjs): the wind comes from the theatre's own weather (the timeline's wind when the effects layer runs, the
// environment's speed range and the plan's direction otherwise), nothing is invented for a minute with no wind figure, the share of the sway falls as the clock runs faster and is nil
// for reduced motion, and the shaders read the numbers (their text). How the sway looks is judged in a browser (tests/vegetation-browser.mjs), not here.
//   node --test docs/battle-theatre/app/tests/vegetation-wind.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { windOf, swayShare, swayUniforms, FROM_DEG } from '../src/ext/vegetation/wind.mjs';
import { SHELL_VS } from '../src/ext/vegetation/shell.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), APP = path.resolve(here, '..');

test('the wind: the weather timeline first, the environment\'s range with the plan\'s direction second, nothing otherwise', () => {
  const a = windOf({ fxInfo: { wind: { speed: 2.5, toX: 0.5, toZ: -2.4 } }, wx: { wind: { mph: [12, 12] } } });
  assert.equal(a.src, 'weather timeline'); assert.ok(Math.abs(Math.hypot(a.x, a.z) - 1) < 1e-9, 'a unit vector'); assert.ok(Math.abs(a.speed - Math.hypot(0.5, 2.4)) < 1e-9);
  const b = windOf({ wx: { wind: { mph: [2, 6] } } });
  assert.match(b.src, /environment/); assert.ok(Math.abs(b.speed - 4 * 0.44704) < 1e-9, 'the middle of 2 to 6 mph'); assert.ok(b.z < -0.9 && b.x > 0 && b.x < 0.3, 'blown from S to SSW: toward the north, a little east');
  assert.equal(FROM_DEG, 191.25); const from = (Math.atan2(-b.x, b.z) * 180 / Math.PI + 360) % 360; assert.ok(Math.abs(from - FROM_DEG) < 1e-6, 'it blows from the bearing 191.25 (v = speed * (-sin b, cos b) in x east, z south, as fx3d/wind.mjs windVector has it): ' + from);
  for (const th of [null, {}, { wx: {} }, { wx: { wind: { text: 'not recorded' } } }, { wx: { wind: { mph: [NaN, 3] } } }, { fxInfo: { wind: { speed: 0, toX: 0, toZ: 0 } } }, { wx: { wind: { mph: [0, 0] } } }]) assert.equal(windOf(th), null, JSON.stringify(th));
});

test('the share of the sway: all at the pace of the weather, less as the clock runs faster, none for reduced motion', () => {
  assert.equal(swayShare(1, false), 1); assert.equal(swayShare(undefined, false), 1); assert.equal(swayShare(0.5, false), 1);
  let prev = 1; for (const k of [2, 4, 10, 30, 100]) { const v = swayShare(k, false); assert.ok(v < prev && v > 0, 'falls with speed: ' + k); prev = v; }
  assert.ok(swayShare(100, false) < 0.05, 'a clock at 100 times has almost no sway'); assert.equal(swayShare(1, true), 0); assert.equal(swayShare(60, true), 0);
});

test('the numbers for the shaders are a pure function of the minute, the wind and the speed', () => {
  const th = { wx: { wind: { mph: [2, 6] } } }, u1 = swayUniforms(th, 31.25, 1, false), u2 = swayUniforms(th, 31.25, 1, false);
  assert.deepEqual(u1, u2); assert.equal(u1.t, 31.25 * 60); assert.ok(u1.speed > 1.7 && u1.speed < 1.9 && u1.share === 1);
  assert.notEqual(swayUniforms(th, 31.5, 1, false).t, u1.t);
  const z = swayUniforms({}, 10, 1, false); assert.deepEqual([z.dirX, z.dirZ, z.speed, z.share], [0, 0, 0, 0], 'no wind figure: nothing sways'); const r = swayUniforms(th, 10, 1, true); assert.deepEqual([r.speed, r.share], [0, 0]);
});

test('the shaders read the wind: the crown of a tree and the layers of a crop lean along it, by height, and no shader reads a wall clock', () => {
  const gl = fs.readFileSync(path.join(APP, 'src', 'ext', 'vegetation', 'gl.mjs'), 'utf8');
  assert.match(gl, /uniform vec4 uWind; uniform float uSway;/); assert.match(gl, /wp\.xz \+= uWind\.xy \* \(lean \+ flutter\) \* uSway;/); assert.match(gl, /setWind\(u\)/); assert.match(gl, /gl\.uniform4f\(U\.uWind, wd\.dirX, wd\.dirZ, wd\.speed, wd\.t\)/g);
  assert.ok((gl.match(/gl\.uniform4f\(U\.uWind/g) || []).length >= 2, 'the trees and the shell both get the wind');
  assert.match(SHELL_VS, /uniform vec4 uWind; uniform float uSway;/); assert.match(SHELL_VS, /shear = uWind\.xy \* \(0\.045 \* uWind\.z \* hs \* f \* f \* wave \* uSway\)/);
  for (const src of [gl, SHELL_VS]) assert.ok(!/(performance\.now|Date\.now|iTime|uTime)/.test(src.replace(/\/\/.*$/gm, '')), 'the sway is a function of the clock of the theatre only');
  const idx = fs.readFileSync(path.join(APP, 'src', 'ext', 'vegetation', 'index.mjs'), 'utf8'); assert.match(idx, /swayUniforms\(s\.th, frame\.tMin % 60/); assert.match(idx, /prefers-reduced-motion/);
});
