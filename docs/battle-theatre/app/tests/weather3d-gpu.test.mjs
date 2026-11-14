// WebGPU draw path of the weather and effects layers (weather3d/gpu.mjs, weather3d/shaders-wgsl.mjs, fx-host.mjs): node tests, no browser and no GPU.
//   node --test docs/battle-theatre/app/tests/weather3d-gpu.test.mjs
// What they prove: the WGSL is the port of the GLSL (same constants, same uniform block layout), the WebGPU path is fed exactly the values the WebGL2 path is fed (a recording stand-in for the GL
// context runs the real gl.mjs code), the pass has the same draws in the same order with the same blend states, fx-host switches the prototype's own sky and particles off only when the new passes
// built and gives them back on any failure, and nothing in the path is random or timed. What they cannot prove: that a GPU compiles the WGSL and draws the picture. That is tests/weather3d-gpu.mjs
// (Chrome with the software WebGPU adapter) and, on real hardware, BROWSER-VERIFICATION-LIST-WEATHER.md.
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path';
import { BT } from './node-world.mjs';
import { Environment } from '../src/environment.mjs'; import { minOf } from '../src/clock.mjs';
import { WeatherTimeline } from '../src/weather3d/timeline.mjs';
import { WEATHER_FS, MAX_LIGHTS } from '../src/weather3d/shaders.mjs';
import { weatherWgsl, WEATHER_WGSL, patchFxWgsl, WU, WU_FLOATS, WU_BYTES } from '../src/weather3d/shaders-wgsl.mjs';
import { GPUPasses, packWeather, packFx, BLEND, FXU, FXU_FLOATS, fxWgsl } from '../src/weather3d/gpu.mjs';
import { GLPasses, CUM_W } from '../src/weather3d/gl.mjs';
import { WGSL_RENDER, GLSL_VERT, lint } from '../src/fx3d/shaders.mjs';
import { LIGHT_STRIDE } from '../src/fx3d/lights.mjs';
import { GSTRIDE } from '../src/fx3d/pack.mjs';
import { WIND_HIST_N } from '../src/fx3d/wind.mjs';
import { FxHost } from '../src/fx-host.mjs';
import { createAnimBus } from '../src/anim3d/events.mjs';
import { Camera } from '../../render/prototype/src/camera.mjs';
import { CASES, EXTRA_CASES, ALL_CASES, REAL_CASES, specOf, SHERFY } from './weather3d-gpu-cases.mjs';
import { makePlan, aimCamera } from './weather3d-gpu-plan.mjs';
import { HOOKS, CHROME_ARGS, chromeArgs, REAL_GPU_ARGS } from './weather3d-gpu-lib.mjs';
import { checkRun, checkCompare } from './weather3d-gpu-check.mjs';

const APP = path.resolve(BT, 'app'), J = f => JSON.parse(fs.readFileSync(path.join(BT, f), 'utf8')), D = f => JSON.parse(fs.readFileSync(path.join(APP, 'data/fx3d', f), 'utf8'));
const environment = new Environment(J('environment/ephemeris_1863.json'), J('environment/weather_timeline.json'));
const data = { params: D('params.json'), weapons: D('weapons.json'), fires: D('fires.json') };
const at = (m, d, h = 12, mi = 0) => minOf(m, d, h, mi) * 60;
const timeline = () => new WeatherTimeline(environment, { fxParams: data.params });
const f32 = x => Math.fround(x);

// ---------------------------------------------------------------------------------------------------------------- the WGSL against the GLSL
test('WGSL: both modes are whole programs (balanced, no template leftovers, the entry points the pipelines name) and differ only in the mode constant', () => {
  const mul = weatherWgsl('mul'), add = weatherWgsl('add');
  for (const [src, name] of [[mul, 'mul'], [add, 'add']]) {
    for (const [o, c] of ['()', '[]', '{}']) assert.equal(src.split(o).length, src.split(c).length, name + ' ' + o + c);
    assert.ok(!/\t|\$\{|undefined|NaN|__MODE_MUL__/.test(src), name + ': no tab, unexpanded template or placeholder');
    assert.match(src, /@vertex fn vs\(/); assert.match(src, /@fragment fn fs\(/); assert.match(src, /@group\(0\) @binding\(0\) var<uniform> F: FU;/); assert.match(src, /@group\(1\) @binding\(0\) var<uniform> W: WU;/); assert.match(src, /@group\(1\) @binding\(1\) var sceneDepth: texture_depth_2d;/);
  }
  assert.match(mul, /const MODE_MUL: bool = true;/); assert.match(add, /const MODE_MUL: bool = false;/); assert.equal(mul.replace('= true;', '= false;'), add);
  assert.throws(() => weatherWgsl('both'), /mode/);
  assert.ok(lint(mul, 'weather wgsl').filter(e => !/hash constant/.test(e)).length === 0, lint(mul, 'weather wgsl').join('; '));
});
test('WGSL: the uniform block has the members of WU in the order and at the offsets the packer writes (std140-like: every member a vec4)', () => {
  const m = /struct WU \{([\s\S]*?)\}\s*\n@group\(1\)/.exec(weatherWgsl('mul')); assert.ok(m, 'struct WU found');
  const parts = []; let depth = 0, cur = ''; for (const ch of m[1]) { if (ch === '<') depth++; if (ch === '>') depth--; if (ch === ',' && depth === 0) { parts.push(cur); cur = ''; } else cur += ch; } if (cur.trim()) parts.push(cur);
  let off = 0; const got = {};
  for (const p of parts) { const [name, type] = p.split(':').map(s => s.trim()); let n; if (type === 'vec4f') n = 4; else { const a = /^array<vec4f,\s*(\d+)>$/.exec(type); assert.ok(a, 'member type ' + type); n = 4 * +a[1]; } got[name === 'floorC' ? 'floor' : name] = off; off += n; }
  assert.deepEqual(got, WU, 'member offsets (float32 units)'); assert.equal(off, WU_FLOATS); assert.equal(WU_BYTES, WU_FLOATS * 4); assert.equal(WU_BYTES % 16, 0);
  assert.equal(WU.lcol - WU.lpos, MAX_LIGHTS * 4);
  // the prototype's frame block (group 0) as the WGSL declares it: 5 matrices, then vec4 members in the prototype's order (render/prototype/src/webgpu.mjs writeFU)
  const fu = /struct FU \{ (.*?) \}/.exec(weatherWgsl('add'))[1].split(',').map(s => s.trim().split(':')[0]); assert.deepEqual(fu, ['vp', 'prevVp', 'invVp', 'sm0', 'sm1', 'cam', 'sun', 'scr', 'terr', 'terr2', 'lod', 'right', 'up', 'fwd', 'misc', 'misc2']);
  const proto = fs.readFileSync(path.join(BT, 'render/prototype/src/webgpu.mjs'), 'utf8'); assert.match(proto, /f\.set\(vp, o\); f\.set\(cam\.prevVp, o \+ 16\); f\.set\(cam\.invVp, o \+ 32\); f\.set\(this\.sm0, o \+ 48\); f\.set\(this\.sm1, o \+ 64\)/);
  assert.match(proto, /f\.set\(\[cam\.x, cam\.y, cam\.z, t\], o \+ 80\)/); assert.match(proto, /f\.set\(\[T\.W, T\.H, T\.N, T\.hmin\], o \+ 92\)/); assert.match(proto, /f\.set\(\[Math\.tan\(cam\.fov \/ 2\), aspect, this\.o\.exposure, cam\.near\], o \+ 116\)/);
});
test('WGSL is the port of the GLSL: the same numeric constants (as a set; the counts differ only where the WGSL shares one hash function and drops the GL depth-to-clip conversion)', () => {
  const strip = s => s.replace(/\/\/[^\n]*/g, '');
  const toks = s => (strip(s).match(/0x[0-9a-f]+u?|\b\d+\.\d*(?:e[-+]?\d+)?|\b\d+e[-+]?\d+|\.\d+|\b\d+u?\b/gi) || []).map(x => x.toLowerCase().replace(/^(\d+)\.$/, '$1.0'));
  const g = toks(WEATHER_FS.slice(WEATHER_FS.indexOf('float h31'))), w = toks(WEATHER_WGSL.slice(WEATHER_WGSL.indexOf('fn mixU')));
  const G = new Set(g), V = new Set(w); assert.deepEqual([...G].filter(x => !V.has(x)), [], 'a GLSL constant is missing from the WGSL'); assert.deepEqual([...V].filter(x => !G.has(x)), [], 'a WGSL constant is missing from the GLSL');
  const cnt = a => a.reduce((o, x) => (o[x] = (o[x] || 0) + 1, o), {}), cg = cnt(g), cw = cnt(w), diffs = {}; for (const k of new Set([...G, ...V])) if (cg[k] !== cw[k]) diffs[k] = [cg[k] || 0, cw[k] || 0];
  assert.deepEqual(diffs, { '61u': [2, 1], '16u': [2, 1], '0x27d4eb2du': [2, 1], '15u': [2, 1], '0x2c1b3c6du': [2, 1], '13u': [2, 1], '4294967296.0': [2, 1], '2.0': [6, 5], '0': [5, 6], '1.0': [36, 34] }, 'the count differences are exactly the hash refactor and the clip-space conversion');
  // the structural statements that carry the look, in both
  for (const [re, what] of [[/pow\(max\(h, 0\.0\), 0\.45\)/, 'horizon-zenith gradient'], [/pow\(sd, 800\.0\)/, 'sun disc'], [/smoothstep\(0\.0, 0\.22, d\.y\)/, 'star horizon extinction'], [/cos\(\w+\.\w*\s*\*\s*3\.0\)|cos\(.*moon.*\* 3\.0\)/i, 'moon cone'], [/th \+ \w+\.cloud\.w|th \+ uCloud\.w/, 'cloud softness'], [/0\.00006|W\.proto\.y|uProto\.y/, 'undo of the baked fog'], [/1\.0 \+ L/, 'lights only brighten']]) {
    assert.ok(re.test(WEATHER_FS) || re.test(WEATHER_WGSL), what); }
  assert.match(WEATHER_WGSL, /return max\(c, W\.floorC\.xyz\);/, 'Q10: the sky is clamped to the floor'); assert.match(WEATHER_WGSL, /Dm \*= \(1\.0 \+ L\);/); assert.match(WEATHER_WGSL, /max\(cc, W\.floorC\.xyz \* 1\.2\)/);
  assert.match(WEATHER_WGSL, /F\.invVp \* vec4f\(i\.ndc, dep, 1\.0\)/, 'WebGPU depth is 0..1: no *2-1'); assert.match(WEATHER_FS, /dep \* 2\.0 - 1\.0/);
  assert.match(WEATHER_WGSL, /if \(dep >= 0\.999999\)/); assert.match(WEATHER_FS, /if \(dep >= 0\.999999\)/);
});
test('fx3d WGSL: the soft-particle depth read is patched to the hardware depth with the same linearisation as the GLSL; a changed source is refused', () => {
  const p = fxWgsl(); assert.equal(p, patchFxWgsl(WGSL_RENDER)); assert.match(p, /@group\(0\) @binding\(4\) var sceneDepth: texture_depth_2d;/); assert.ok(!/texture_2d<f32>/.test(p));
  assert.match(p, /fn linD\(d: f32\) -> f32 \{ if \(d >= 0\.999999\) \{ return 1e9; \} return u\.extra\.z \* u\.extra\.w \/ \(u\.extra\.w - d \* \(u\.extra\.w - u\.extra\.z\)\); \}/);
  assert.match(p, /linD\(textureLoad\(sceneDepth, vec2<i32>\(fin\.pos\.xy\), 0\)\)/);
  assert.throws(() => patchFxWgsl('fn nothing() {}'), /changed/); assert.throws(() => patchFxWgsl(WGSL_RENDER.replace('var sceneDepth: texture_2d<f32>;', 'var sceneDepth: texture_2d<f16>;')), /changed/);
  for (const [o, c] of ['()', '[]', '{}']) assert.equal(p.split(o).length, p.split(c).length, 'fx3d wgsl ' + o + c);
  assert.ok(lint(p, 'fx wgsl').length === 0, lint(p, 'fx wgsl').join('; '));
  // the block U of the WGSL is the one the packer fills: nine members, 48 float32 units
  const u = /struct U \{ (.*?) \};/.exec(WGSL_RENDER)[1].split(',').map(s => s.trim().split(':')[0]).filter(Boolean); assert.deepEqual(u, ['vp', 'cam', 'right', 'up', 'sun', 'light', 'kappa', 'extra', 'now_first_nev']); assert.equal(FXU_FLOATS, 16 + 8 * 4);
  assert.deepEqual(FXU, { vp: 0, cam: 16, right: 20, up: 24, sun: 28, light: 32, kappa: 36, extra: 40, now: 44 });
});
test('the prototype\'s bind group 0, as the weather WGSL uses it: the frame block (dynamic offset, 512 bytes, enough for the 496 of FU), the height texture and its filtering sampler', () => {
  const proto = fs.readFileSync(path.join(BT, 'render/prototype/src/webgpu.mjs'), 'utf8');
  assert.match(proto, /const FU_BYTES = 512;/); assert.match(proto, /\{ binding: 0, visibility: G\.VERTEX \| G\.FRAGMENT, buffer: \{ type: 'uniform', hasDynamicOffset: true, minBindingSize: FU_BYTES \} \}/);
  assert.match(proto, /\{ binding: 4, visibility: G\.VERTEX \| G\.FRAGMENT, texture: \{ sampleType: 'float' \} \}, \{ binding: 5, visibility: G\.VERTEX \| G\.FRAGMENT, sampler: \{ type: 'filtering' \} \}/);
  assert.match(proto, /this\.heightTex = this\.dev\.createTexture\(\{ size: \[T\.N, T\.N\], format: 'r32float'/, 'the height texture is r32float, sampled as float with a filtering sampler (float32-filterable)');
  assert.match(proto, /\['timestamp-query', 'float32-filterable'\]\.filter\(f => adapter\.features\.has\(f\)\)/, 'the renderer asks for float32-filterable when the adapter has it');
  const members = 5 * 16 + 11 * 4; assert.equal(members * 4, 496); assert.ok(members * 4 <= 512, 'FU fits the layout\'s minBindingSize');
  assert.match(proto, /depthRT = this\.depth\.createView\(\)/); assert.match(proto, /depthV = this\.depth\.createView\(\{ aspect: 'depth-only' \}\)/); assert.match(proto, /this\.hdr = d\.createTexture\(\{ size: \[w, h\], format: 'rgba16float'/);
});
test('blend states are the GL blend functions of gl.mjs (multiply: ZERO, SRC_COLOR; add: ONE, ONE; sprites: ONE, ONE_MINUS_SRC_ALPHA)', () => {
  const gl = fs.readFileSync(path.join(APP, 'src/weather3d/gl.mjs'), 'utf8');
  assert.match(gl, /gl\.blendFuncSeparate\(gl\.ZERO, gl\.SRC_COLOR, gl\.ZERO, gl\.ONE\)/); assert.match(gl, /gl\.blendFuncSeparate\(gl\.ONE, gl\.ONE, gl\.ZERO, gl\.ONE\)/); assert.match(gl, /gl\.blendFuncSeparate\(gl\.ONE, gl\.ONE_MINUS_SRC_ALPHA, gl\.ONE, gl\.ONE_MINUS_SRC_ALPHA\)/);
  assert.deepEqual(BLEND.mul, { color: { operation: 'add', srcFactor: 'zero', dstFactor: 'src' }, alpha: { operation: 'add', srcFactor: 'zero', dstFactor: 'one' } });
  assert.deepEqual(BLEND.add, { color: { operation: 'add', srcFactor: 'one', dstFactor: 'one' }, alpha: { operation: 'add', srcFactor: 'zero', dstFactor: 'one' } });
  assert.deepEqual(BLEND.fx, { color: { operation: 'add', srcFactor: 'one', dstFactor: 'one-minus-src-alpha' }, alpha: { operation: 'add', srcFactor: 'one', dstFactor: 'one-minus-src-alpha' } });
});

// ---------------------------------------------------------------------------------------------------------------- the same inputs as the WebGL2 path
// A stand-in for a WebGL2 context that records every call, so the real gl.mjs code runs and the values it would hand to the GPU can be compared with the WebGPU packers.
function fakeGL() {
  const calls = [], consts = {};
  const gl = new Proxy({}, { get(_, k) {
    if (typeof k !== 'string') return undefined; if (/^[A-Z][A-Z0-9_]*$/.test(k)) return consts[k] ?? (consts[k] = 1000 + Object.keys(consts).length);
    return (...a) => { calls.push([k, ...a]); if (k === 'getParameter') return a[0] === consts.COLOR_WRITEMASK ? [true, true, true, true] : a[0] === consts.VIEWPORT ? [0, 0, 1, 1] : 0; if (k === 'isEnabled') return false; return null; };
  } });
  return { gl, calls };
}
const locs = new Proxy({}, { get: (_, k) => k });
const GL_TO_WU = { uSunDir: ['sunDir', 3], uMoonDir: ['moonDir', 3], uMoon: ['moon', 4], uZen: ['zen', 3], uHor: ['hor', 3], uSunCol: ['sunCol', 3], uSky: ['sky', 4], uTw: ['tw', 3], uFloor: ['floor', 3], uCLit: ['cLit', 3], uCShade: ['cShade', 3], uCloud: ['cloud', 4], uCOff: ['cOff', 2],
  uStars: ['stars', 4], uStarAxis: ['starAxis', 4], uFog: ['fog', 4], uFogCol: ['fogCol', 3], uProto: ['proto', 4], uWet: ['wet', 4], uGround: ['ground', 4], uNL: ['nl', 1], uLPos: ['lpos', MAX_LIGHTS * 4], uLCol: ['lcol', MAX_LIGHTS * 4] };
const lightsOf = n => { const a = new Float32Array(Math.max(n, MAX_LIGHTS) * LIGHT_STRIDE); for (let i = 0; i < n; i++) a.set([100 + i * 7, 3 + i, -40 - i, 12 + i, 2 + 0.25 * i, 1.0, 0.7 - 0.02 * i, 0.3], i * LIGHT_STRIDE); return a; };
function glWeatherUniforms(W, fr) {
  const { gl, calls } = fakeGL(), g = Object.create(GLPasses.prototype); g.gl = gl; g._setWeather(locs, W, fr, null);
  const u = {}; for (const c of calls) { const [name, loc, ...v] = c; if (!/^uniform/.test(name)) continue; u[loc] = v.length === 1 && (ArrayBuffer.isView(v[0]) || Array.isArray(v[0])) ? Array.from(v[0]) : v.map(Number); } return u;
}
const SCENES = [['night with moon, stars, mist', at(7, 2, 23, 30)], ['day, scattered cloud, dry', at(7, 2, 14)], ['wet day after the storm, puddles', at(7, 4, 14)], ['dawn mist, twilight glow', at(7, 2, 4, 30)], ['deep night, new window of the table', at(6, 28, 2)]];
for (const nLights of [0, 3, 16, 20]) {
  test(`uniform block: packWeather writes exactly the values gl.mjs sends to the WebGL2 program (${nLights} lights)`, () => {
    const tl = timeline(); const fr = { nLights, lights: lightsOf(nLights) };
    for (const [what, t] of SCENES) {
      const W = tl.at(t, {}), want = glWeatherUniforms(W, fr), out = packWeather(new Float32Array(WU_FLOATS), W, fr);
      for (const [name, [m, n]] of Object.entries(GL_TO_WU)) { assert.ok(want[name], what + ': the GL path sets ' + name); const got = Array.from(out.subarray(WU[m], WU[m] + n)); const exp = want[name].length < n && n <= 4 ? [...want[name], ...new Array(n - want[name].length).fill(0)] : want[name];
        if (name === 'uNL') { assert.equal(got[0], exp[0], what + ' ' + name); continue; }
        for (let i = 0; i < n; i++) { const e = i < exp.length ? exp[i] : 0; assert.ok(Math.abs(got[i] - f32(e)) <= 1e-6 * Math.max(1, Math.abs(e)), `${what}: ${name}[${i}] ${got[i]} vs GL ${e}`); } }
      // the padding words of the vec4s the GL path sets as vec3 are zero (nothing is smuggled in them)
      for (const m of ['sunDir', 'moonDir', 'zen', 'hor', 'sunCol', 'tw', 'floor', 'cLit', 'cShade', 'fogCol']) assert.equal(out[WU[m] + 3], 0, m + ' pad');
      assert.equal(out[WU.nl], Math.min(nLights, MAX_LIGHTS));
    }
  });
}
test('uniform block: packWeather is a pure function of its inputs (no clock, no random) and clears the lights it does not use', () => {
  const tl = timeline(), W = tl.at(at(7, 3, 22), {}), a = packWeather(new Float32Array(WU_FLOATS), W, { nLights: 5, lights: lightsOf(5) }), b = packWeather(new Float32Array(WU_FLOATS), W, { nLights: 5, lights: lightsOf(5) });
  assert.deepEqual(Array.from(a), Array.from(b)); const dirty = new Float32Array(WU_FLOATS).fill(9); packWeather(dirty, W, { nLights: 2, lights: lightsOf(2) });
  for (let i = 2; i < MAX_LIGHTS; i++) for (let k = 0; k < 4; k++) assert.equal(dirty[WU.lpos + i * 4 + k], 0, 'light slot ' + i + ' cleared'); for (let i = 0; i < 16; i++) assert.ok(Number.isFinite(dirty[i]));
  const none = packWeather(new Float32Array(WU_FLOATS), W, null); assert.equal(none[WU.nl], 0);
  for (const f of [path.join(APP, 'src/weather3d/gpu.mjs'), path.join(APP, 'src/weather3d/shaders-wgsl.mjs')]) { const s = fs.readFileSync(f, 'utf8'); assert.ok(!/Math\.random|Date\.now|performance\.now|new Date\(/.test(s.replace(/\/\/[^\n]*/g, '')) || /passMs|timing/.test(s), path.basename(f)); }
});
// a real effects frame, from the real fx3d state, at night, with a battery and a volley in front of the camera
async function effectsFrame(tSec) {
  const bus = createAnimBus();
  const advance = (t0, t1) => {
    let n = 0;
    for (let t = Math.ceil(t0 / 4) * 4; t < t1; t += 4) {
      for (let g = 0; g < 4; g++) { bus.emit('fire', 'US-ART', g, t + g * 0.3, 'cannon', [10 + g * 9, 4, -35], [0, 0, 1], { weaponId: 'napoleon_12pdr_m1857', round: 'shell', tier: 'inferred', cycleS: 40, ranksBack: 0, fuze: 'time', fuzeS: 2, gunIdx: g, shotId: 700 + g + Math.floor(t) }); n++; }
      for (let i = 0; i < 30; i++) { bus.emit('fire', 'US-INF', i, t + (i % 5) * 0.2, 'long_arm', [i, 3, -28], [0, 0, 1], { weaponId: 'm1861_springfield', round: 'ball', tier: 'inferred', cycleS: 20, ranksBack: 0 }); n++; }
    }
    return n;
  };
  const h = await FxHost.create({ api: 'none', world: { count: 0 } }, { environment, anim: { bus, advance }, data, geo: null, tier: 'laptop' });
  const cam = new Camera(); cam.set(12, 5, 20, Math.PI, 0.02, 60); cam.update(16 / 9);
  const camFx = c => ({ x: c.x, y: c.y, z: c.z, fwd: c.fwd, fov: c.fov, near: c.near, far: c.far, right: () => c.right(), up: () => c.up(), vp: c.vp });
  h.update({ tSec, cam: camFx(cam) }); const info = h.update({ tSec: tSec + 8.05, cam: camFx(cam) });
  return { h, cam, info, W: h.cur.W, fr: h.cur.fr };
}
test('uniform block of the sprites: packFx writes exactly the values gl.mjs sends to the WebGL2 sprite program, and the matrix is the WebGPU view-projection', async () => {
  const { h, cam, fr } = await effectsFrame(at(7, 2, 22)); assert.ok(fr.nSprites > 0 && fr.nEvents > 0, 'the frame carries sprites');
  // run the real GLPasses.draw on the recording context
  const { gl, calls } = fakeGL(), g = Object.create(GLPasses.prototype), R = { W: 640, H: 360, glVp: new Float32Array(16).fill(7), fbScene: 1, fbDepthCopy: 2, t: { height: 3, depthCopy: 4 } };
  Object.assign(g, { gl, R, ok: true, weatherOk: true, fxOk: true, U: { ev: 12, depth: 13, cum: 14, wind: 15 }, stats: { weatherDraws: 0, fxDraws: 0, spritesDrawn: 0, depthBlits: 0 }, vao: 5, progMul: { p: 6, loc: locs }, progAdd: { p: 7, loc: locs }, progFx: { p: 8, loc: locs }, tEv: 9, tCum: 10, tWind: 11, cumStage: new Float32Array(CUM_W * 8) });
  g.draw(h.cur.W, fr, cam, { weather: false, fx: true }); const u = {}; for (const c of calls) { const [name, loc, ...v] = c; if (!/^uniform/.test(name)) continue; u[loc] = name === 'uniformMatrix4fv' ? Array.from(v[1]) : v.length === 1 && (ArrayBuffer.isView(v[0]) || Array.isArray(v[0])) ? Array.from(v[0]) : v.map(Number); }
  const out = packFx(new Float32Array(FXU_FLOATS), fr, cam, cam.vp); const near = (a, b, what) => { for (let i = 0; i < b.length; i++) assert.ok(Math.abs(a[i] - f32(b[i])) <= 1e-6 * Math.max(1, Math.abs(b[i])), `${what}[${i}] ${a[i]} vs GL ${b[i]}`); };
  const sl = (o, n) => Array.from(out.subarray(o, o + n));
  assert.equal(out[FXU.now + 2], u.uNEv[0]); assert.equal(out[FXU.now], f32(u.uNow[0])); near(sl(FXU.cam, 3), u.uCam, 'cam'); near(sl(FXU.right, 3), u.uRight, 'right'); near(sl(FXU.up, 3), u.uUp, 'up'); near(sl(FXU.sun, 3), u.uSun, 'sun');
  near(sl(FXU.light, 4), u.uLight, 'light'); near(sl(FXU.kappa, 2), u.uKappa, 'kappa'); near(sl(FXU.extra, 4), u.uExtra, 'extra'); assert.deepEqual(sl(FXU.extra + 2, 2).map(Number), [f32(u.uNF[0]), f32(u.uNF[1])], 'the near and far planes travel in extra.z and extra.w');
  assert.deepEqual(Array.from(out.subarray(0, 16)), Array.from(cam.vp), 'WebGPU clip space (z in 0..1): the camera\'s own vp'); assert.ok(u.uVP && u.uVP.every(x => x === 7), 'the GL path used R.glVp, not the WebGPU matrix');
  assert.equal(u.uFirst[0], 0); h.dispose();
});

// ---------------------------------------------------------------------------------------------------------------- the pass, against a recording device
function mockDevice(o = {}) {
  const log = [], writes = [], destroyed = [], listeners = {}, buffers = [], pipelines = [], bindGroups = [], modules = [];
  const lab = (d, k) => (d && d.label) || k;
  const dev = { log, writes, destroyed, buffers, pipelines, bindGroups, modules, listeners,
    addEventListener(t, f) { (listeners[t] = listeners[t] || []).push(f); }, removeEventListener(t, f) { listeners[t] = (listeners[t] || []).filter(x => x !== f); },
    pushErrorScope(k) { log.push(['pushErrorScope', k]); }, popErrorScope() { log.push(['popErrorScope']); return o.hangScope ? new Promise(() => { }) : Promise.resolve(o.scopeError || null); },
    createBindGroupLayout(d) { log.push(['bgl', lab(d)]); return { label: lab(d, 'bgl'), desc: d }; }, createPipelineLayout(d) { log.push(['pl', lab(d)]); return { label: lab(d, 'pl'), desc: d }; },
    createBuffer(d) { const b = { label: lab(d, 'buf'), desc: d, destroy() { destroyed.push(b.label); } }; buffers.push(b); return b; },
    createShaderModule(d) { const m = { label: lab(d, 'module'), code: d.code, getCompilationInfo: o.hangInfo ? () => new Promise(() => { }) : async () => ({ messages: o.messages || [] }) }; modules.push(m); return m; },
    createRenderPipelineAsync(d) { pipelines.push(d); if (o.hangPipeline && o.hangPipeline.test(d.label)) return new Promise(() => { }); if (o.failPipeline && o.failPipeline.test(d.label)) return Promise.reject(new Error('mock failure of ' + d.label)); return Promise.resolve({ label: d.label, desc: d }); },
    createBindGroup(d) { const g = { label: lab(d, 'bg'), desc: d }; bindGroups.push(g); return g; }, createQuerySet(d) { return { desc: d, destroy() { destroyed.push('queryset'); } }; },
    queue: { writeBuffer(b, off, data, dOff, size) { writes.push({ label: b.label, off, data, dOff, size }); } } };
  return dev;
}
function mockEnc() {
  const log = []; const pass = { setPipeline: p => log.push(['pipeline', p.label]), setBindGroup: (i, g, o) => log.push(['bg', i, g.label, o ? Array.from(o) : null]), draw: (...a) => log.push(['draw', ...a]), end: () => log.push(['end']) };
  return { log, beginRenderPass: d => { log.push(['pass', d]); return pass; }, resolveQuerySet() { log.push(['resolve']); }, copyBufferToBuffer() { log.push(['copy']); } };
}
const mockR = (dev, extra = {}) => ({ dev, g0L: { label: 'g0L' }, bg0: { label: 'bg0' }, hdr: { format: 'rgba16float' }, hdrV: { label: 'hdrV' }, depth: { format: 'depth32float' }, depthV: { label: 'depthV' }, depthRT: { label: 'depthRT' }, hasTS: false, mem: { buffers: 0, textures: 0, items: {} }, track(kind, name, bytes) { this.mem[kind] += bytes; this.mem.items[name] = (this.mem.items[name] || 0) + bytes; }, o: { flags: { sky: true, particles: true } }, ...extra });
test('GPUPasses builds the pipelines the pass needs with the same targets, depth state and blends as the WebGL2 path, and tells what it holds', async () => {
  const dev = mockDevice(), R = mockR(dev), g = await GPUPasses.create(R, { maxEvents: 256, timing: false });
  assert.ok(g.ok && g.weatherOk && g.fxOk, 'all three pipelines built'); assert.deepEqual(g.log, []); assert.deepEqual(g.warnings, []);
  const byLabel = Object.fromEntries(dev.pipelines.map(p => [p.label, p])); assert.deepEqual(Object.keys(byLabel).sort(), ['fx3d-sprites', 'weather3d-add', 'weather3d-mul']);
  for (const k of ['weather3d-mul', 'weather3d-add']) { const p = byLabel[k]; assert.equal(p.fragment.targets[0].format, 'rgba16float'); assert.equal(p.depthStencil.format, 'depth32float'); assert.equal(p.depthStencil.depthWriteEnabled, false); assert.equal(p.depthStencil.depthCompare, 'always'); assert.equal(p.primitive.topology, 'triangle-list'); assert.equal(p.vertex.entryPoint, 'vs'); assert.equal(p.fragment.entryPoint, 'fs'); }
  assert.deepEqual(byLabel['weather3d-mul'].fragment.targets[0].blend, BLEND.mul); assert.deepEqual(byLabel['weather3d-add'].fragment.targets[0].blend, BLEND.add);
  const fx = byLabel['fx3d-sprites']; assert.deepEqual(fx.fragment.targets[0].blend, BLEND.fx); assert.equal(fx.primitive.topology, 'triangle-strip'); assert.equal(fx.depthStencil.depthWriteEnabled, false); assert.equal(fx.depthStencil.depthCompare, 'less'); assert.equal(fx.depthStencil.format, 'depth32float');
  // the weather pipelines use the prototype's group 0 layout and their own group 1; the sprites own group 0
  assert.deepEqual(byLabel['weather3d-mul'].layout.desc.bindGroupLayouts.map(l => l.label), ['g0L', 'weather3d.bglW']); assert.deepEqual(fx.layout.desc.bindGroupLayouts.map(l => l.label), ['fx3d.bgl']);
  // buffers: uniform block size, event storage sized for the budget (maxEvents + 64 rows of GSTRIDE floats), cumulative sums, wind history
  const buf = Object.fromEntries(dev.buffers.map(b => [b.label, b.desc.size])); assert.equal(buf['weather3d.uniforms'], WU_BYTES); assert.equal(buf['weather3d.fx uniforms'], FXU_FLOATS * 4); assert.equal(buf['weather3d.fx events'], (256 + 64) * GSTRIDE * 4); assert.equal(buf['weather3d.fx cumulative'], (256 + 64 + 1) * 4); assert.equal(buf['weather3d.fx wind history'], WIND_HIST_N * 8);
  assert.equal(g.bytes, Object.values(buf).reduce((a, b) => a + b, 0), 'bytes held'); assert.equal(R.mem.buffers, g.bytes, 'the renderer\'s memory counter knows them'); assert.ok(dev.log.some(l => l[0] === 'pushErrorScope' && l[1] === 'validation') && dev.log.some(l => l[0] === 'popErrorScope'), 'set-up runs inside a validation scope');
  // the WGSL handed to the compiler is what the module functions produce
  const src = Object.fromEntries(dev.modules.map(m => [m.label, m.code])); assert.equal(src['weather3d-mul'], weatherWgsl('mul')); assert.equal(src['weather3d-add'], weatherWgsl('add')); assert.equal(src['fx3d-sprites'], fxWgsl());
  g.dispose(); assert.equal(R.mem.buffers, 0, 'dispose gives the memory back'); assert.equal(Object.keys(R.mem.items).length, 0); assert.ok(dev.destroyed.includes('weather3d.uniforms') && dev.destroyed.includes('weather3d.fx events'));
  assert.equal((dev.listeners.uncapturederror || []).length, 0, 'the error listener is removed'); assert.equal(g.ok, false); assert.equal(g.draw(mockEnc(), {}, null, {}), false);
});
test('GPUPasses.draw: one pass, colour loaded, depth read-only; weather multiply then add, then the sprites; the uniforms uploaded are the packers\' values', async () => {
  const dev = mockDevice(), R = mockR(dev), g = await GPUPasses.create(R, { maxEvents: 4096, timing: false }), { h, cam, W, fr } = await effectsFrame(at(7, 2, 22));
  const enc = mockEnc(); assert.equal(g.draw(enc, W, fr, cam, { weather: true, fx: true }), true);
  const L = enc.log; assert.equal(L[0][0], 'pass'); const d = L[0][1]; assert.equal(d.colorAttachments.length, 1); assert.equal(d.colorAttachments[0].view, R.hdrV); assert.equal(d.colorAttachments[0].loadOp, 'load'); assert.equal(d.colorAttachments[0].storeOp, 'store');
  assert.equal(d.depthStencilAttachment.view, R.depthRT); assert.equal(d.depthStencilAttachment.depthReadOnly, true); assert.ok(!('depthLoadOp' in d.depthStencilAttachment) && !('depthStoreOp' in d.depthStencilAttachment), 'a read-only depth attachment names no load or store op');
  assert.deepEqual(L.slice(1), [['bg', 0, 'bg0', [0]], ['bg', 1, 'weather3d.bg', null], ['pipeline', 'weather3d-mul'], ['draw', 3], ['pipeline', 'weather3d-add'], ['draw', 3], ['pipeline', 'fx3d-sprites'], ['bg', 0, 'fx3d.bg', null], ['draw', 4, fr.nSprites], ['end']]);
  const bg = Object.fromEntries(dev.bindGroups.map(b => [b.label, b.desc])); assert.equal(bg['weather3d.bg'].entries[1].resource, R.depthV, 'the weather pass samples the scene depth'); assert.equal(bg['fx3d.bg'].entries[4].resource, R.depthV);
  // uploads
  const w = Object.fromEntries(dev.writes.map(x => [x.label, x])); const want = packWeather(new Float32Array(WU_FLOATS), W, fr); assert.deepEqual(Array.from(w['weather3d.uniforms'].data), Array.from(want));
  const wfx = packFx(new Float32Array(FXU_FLOATS), fr, cam, cam.vp); assert.deepEqual(Array.from(w['weather3d.fx uniforms'].data), Array.from(wfx));
  assert.equal(w['weather3d.fx events'].data, fr.events); assert.equal(w['weather3d.fx events'].size, fr.nEvents * GSTRIDE); assert.equal(w['weather3d.fx cumulative'].data, fr.cum); assert.equal(w['weather3d.fx cumulative'].size, fr.nEvents + 1); assert.equal(w['weather3d.fx wind history'].data, fr.windHist); assert.equal(w['weather3d.fx wind history'].size, WIND_HIST_N * 2);
  assert.ok(fr.cum instanceof Uint32Array, 'the cumulative sums are u32 in the WGSL (array<u32>)'); assert.equal(g.stats.weatherDraws, 1); assert.equal(g.stats.fxDraws, 1); assert.equal(g.stats.spritesDrawn, fr.nSprites); assert.equal(g.stats.passes, 1);
  // flags and states that draw less
  let e2 = mockEnc(); assert.equal(g.draw(e2, W, fr, cam, { weather: false, fx: true }), true); assert.deepEqual(e2.log.filter(l => l[0] === 'draw'), [['draw', 4, fr.nSprites]]);
  e2 = mockEnc(); assert.equal(g.draw(e2, W, fr, cam, { weather: true, fx: false }), true); assert.deepEqual(e2.log.filter(l => l[0] === 'draw'), [['draw', 3], ['draw', 3]]);
  e2 = mockEnc(); assert.equal(g.draw(e2, W, fr, cam, { weather: false, fx: false }), false); assert.equal(e2.log.length, 0, 'nothing encoded');
  e2 = mockEnc(); assert.equal(g.draw(e2, W, { ...fr, nSprites: 0 }, cam, { weather: true, fx: true }), true); assert.deepEqual(e2.log.filter(l => l[0] === 'draw'), [['draw', 3], ['draw', 3]], 'no sprites: no sprite draw');
  e2 = mockEnc(); assert.equal(g.draw(e2, null, fr, cam, {}), false);
  // a resize: the renderer makes a new depth view, the bind groups are rebuilt to hold it
  const n0 = g.stats.binds; R.depthV = { label: 'depthV2' }; e2 = mockEnc(); g.draw(e2, W, fr, cam, { weather: true, fx: true }); assert.equal(g.stats.binds, n0 + 1); assert.equal(dev.bindGroups.filter(b => b.label === 'weather3d.bg').at(-1).desc.entries[1].resource, R.depthV);
  // a validation error that names one of this layer's objects stops the layer; one that does not is not its business
  dev.listeners.uncapturederror[0]({ error: { message: 'something about the crowd' } }); assert.equal(g.failed, null); dev.listeners.uncapturederror[0]({ error: { message: 'Invalid BindGroup [BindGroup "weather3d.bg"] ...' } }); assert.match(g.failed, /weather3d\.bg/);
  e2 = mockEnc(); assert.equal(g.draw(e2, W, fr, cam, {}), false); assert.equal(e2.log.length, 0, 'a failed layer draws nothing'); g.dispose(); h.dispose();
});
test('GPUPasses: GPU timing writes (timestamp queries) are used only when the device has them; a pipeline that fails to build is reported and the others still work', async () => {
  const dev = mockDevice(), R = mockR(dev, { hasTS: true }), g = await GPUPasses.create(R, { maxEvents: 128 }); assert.ok(g.qs, 'a query set exists with the feature'); const { h, cam, W, fr } = await effectsFrame(at(7, 2, 22));
  const enc = mockEnc(); g.draw(enc, W, fr, cam, { weather: true, fx: true }); assert.deepEqual(enc.log[0][1].timestampWrites.beginningOfPassWriteIndex, 0); assert.equal(enc.log[0][1].timestampWrites.endOfPassWriteIndex, 1); assert.ok(enc.log.some(l => l[0] === 'resolve') && enc.log.some(l => l[0] === 'copy')); g.dispose();
  const R2 = mockR(mockDevice()), g2 = await GPUPasses.create(R2, { maxEvents: 128, timing: true }); assert.equal(g2.qs, null, 'no feature, no query set'); g2.dispose();
  const dev3 = mockDevice({ failPipeline: /fx3d/ }), g3 = await GPUPasses.create(mockR(dev3), { maxEvents: 128, timing: false }); assert.ok(g3.weatherOk && !g3.fxOk && g3.ok); assert.match(g3.log.join(' '), /fx3d-sprites pipeline failed: mock failure/); const e3 = mockEnc(); assert.equal(g3.draw(e3, W, fr, cam, { weather: true, fx: true }), true); assert.deepEqual(e3.log.filter(l => l[0] === 'draw'), [['draw', 3], ['draw', 3]]); g3.dispose();
  const dev4 = mockDevice({ failPipeline: /weather3d/ }), g4 = await GPUPasses.create(mockR(dev4), { maxEvents: 128, timing: false }); assert.ok(!g4.weatherOk && g4.fxOk); g4.dispose();
  const dev5 = mockDevice({ messages: [{ type: 'error', lineNum: 12, linePos: 3, message: 'unknown identifier' }, { type: 'warning', lineNum: 1, linePos: 1, message: 'unused' }] }), g5 = await GPUPasses.create(mockR(dev5), { maxEvents: 128, timing: false });
  assert.match(g5.log.join(' '), /weather3d-mul error 12:3 unknown identifier/); assert.match(g5.warnings.join(' '), /warning 1:1 unused/); g5.dispose(); h.dispose();
  const dev6 = mockDevice({ scopeError: { message: 'Binding size is smaller than the minimum' } }), g6 = await GPUPasses.create(mockR(dev6), { maxEvents: 128, timing: false }); assert.match(g6.log.join(' '), /validation error at set-up: Binding size/); g6.dispose();
});

test('GPUPasses never waits for ever on the device: a pipeline, the validation scope or the compiler messages that do not arrive end the set-up in time, reported, and the layer carries on with what built', async () => {
  const waitMs = { pipelines: 40, scope: 40, info: 40 }, mk = o => GPUPasses.create(mockR(mockDevice(o)), { maxEvents: 128, timing: false, waitMs });
  const t0 = Date.now(); const a = await mk({ hangPipeline: /weather3d-add/ }); assert.ok(Date.now() - t0 < 2000, 'it returned');
  assert.ok(!a.weatherOk && a.fxOk && a.ok, 'the weather needs both pipelines; the sprites do not'); assert.match(a.log.join(' '), /weather3d-add pipeline was not ready after 0\.04 s: the prototype keeps what it draws/); a.dispose();
  const b = await mk({ hangInfo: true }); assert.ok(b.ok && b.weatherOk && b.fxOk, 'the compiler messages are only for the log'); assert.equal(b.warnings.length, 3); assert.match(b.warnings[0], /compiler messages were not delivered in 0\.04 s; the layer carries on/); b.dispose();
  const c = await mk({ hangScope: true }); assert.ok(c.ok && c.weatherOk && c.fxOk); assert.match(c.warnings.join(' '), /validation scope of the set-up was not delivered/); c.dispose();
  const d = await mk({ hangPipeline: /weather3d|fx3d/ }); assert.ok(!d.ok && !d.weatherOk && !d.fxOk); assert.equal(d.log.length, 3); d.dispose();
  const R = mockR(mockDevice({ hangPipeline: /weather3d|fx3d/ })), g = await GPUPasses.create(R, { maxEvents: 128, timing: false, waitMs }), flags0 = { ...R.o.flags };
  const h = await FxHost.create({ api: 'webgpu', R, world: { count: 0 } }, { environment, data, tier: 'laptop', timing: false }).catch(e => e); assert.ok(h instanceof FxHost || h instanceof Error); assert.deepEqual(R.o.flags, flags0, 'nothing of the prototype was switched off'); g.dispose(); if (h instanceof FxHost) h.dispose();
}, { timeout: 120000 });
// ---------------------------------------------------------------------------------------------------------------- fx-host on the WebGPU path
test('fx-host on WebGPU: the prototype\'s sky and particles are switched off only when the new passes built; `after` is chained after whatever hook is there; dispose puts everything back', async () => {
  const dev = mockDevice(), inner = { calls: [], scene() { this.calls.push('scene'); }, shadow() { this.calls.push('shadow'); }, after() { this.calls.push('after'); } }, R = mockR(dev, { ext: inner });
  const host = { api: 'webgpu', R, world: { count: 0 } }; const h = await FxHost.create(host, { environment, data, tier: 'laptop', timing: false });
  assert.ok(h.gpu && h.gpu.ok && !h.gl); assert.equal(R.o.flags.sky, false); assert.equal(R.o.flags.particles, false); assert.deepEqual(h.log, []);
  assert.deepEqual(h.status(), { api: 'webgpu', weather: true, effects: true, stopped: false, failed: null, log: [] }, 'status: both layers are drawn by the WebGPU passes');
  const cam = new Camera(); cam.set(12, 5, 20, Math.PI, 0.02, 60); cam.update(16 / 9); h.update({ tMin: minOf(7, 2, 22), cam });
  const enc = mockEnc(); R.ext.scene({}, R); R.ext.shadow({}, 0, R); R.ext.after(enc, R); assert.deepEqual(inner.calls, ['scene', 'shadow', 'after'], 'the inner hook (figures, structures) runs first and keeps working');
  assert.ok(enc.log.some(l => l[0] === 'pass'), 'the weather pass was encoded in the after hook'); assert.deepEqual(enc.log.filter(l => l[0] === 'draw').slice(0, 2), [['draw', 3], ['draw', 3]]);
  R.ext = { scene() { inner.calls.push('late scene'); } }; R.ext.scene({}, R); assert.equal(inner.calls.at(-1), 'late scene', 'a hook assigned later still draws');
  const info = h.update({ tMin: minOf(7, 2, 22), cam }); assert.ok(info.stats.gpu && info.stats.gpu.weatherDraws >= 1, 'the info carries the GPU counters');
  h.dispose(); assert.equal(R.o.flags.sky, true); assert.equal(R.o.flags.particles, true); assert.equal(typeof R.ext.scene, 'function'); assert.equal(h.gpu, null);
  const e2 = mockEnc(); R.ext.after && R.ext.after(e2, R); assert.equal(e2.log.length, 0, 'nothing is drawn after dispose');
});
test('fx-host on WebGPU: a failed build leaves the prototype passes on; a validation error at run time hands the sky and the particles back and keeps the state running', async () => {
  const dev = mockDevice({ failPipeline: /weather3d|fx3d/ }), R = mockR(dev, { ext: null }); const h = await FxHost.create({ api: 'webgpu', R, world: { count: 0 } }, { environment, data, tier: 'laptop', timing: false });
  assert.ok(!h.gpu.weatherOk && !h.gpu.fxOk && !h.gpu.ok); assert.deepEqual({ ...h.status(), log: 0 }, { api: 'webgpu', weather: false, effects: false, stopped: false, failed: null, log: 0 }, 'status: nothing is drawn by this layer'); assert.equal(R.o.flags.sky, true); assert.equal(R.o.flags.particles, true); assert.match(h.log.join(' '), /prototype sky and particles stay on/); h.dispose();
  // only the weather pipelines fail: the sky stays the prototype's, the particles are the new ones
  const d2 = mockDevice({ failPipeline: /weather3d-/ }), R2 = mockR(d2); const h2 = await FxHost.create({ api: 'webgpu', R: R2, world: { count: 0 } }, { environment, data, tier: 'laptop', timing: false }); assert.equal(R2.o.flags.sky, true); assert.equal(R2.o.flags.particles, false); assert.equal(h2.status().weather, false); assert.equal(h2.status().effects, true); h2.dispose(); assert.equal(R2.o.flags.particles, true);
  // a run-time error that names the layer
  const d3 = mockDevice(), R3 = mockR(d3), h3 = await FxHost.create({ api: 'webgpu', R: R3, world: { count: 0 } }, { environment, data, tier: 'laptop', timing: false }); const cam = new Camera(); cam.set(0, 5, 0, 0, 0, 60); cam.update(1.78);
  h3.update({ tMin: minOf(7, 3, 14), cam }); assert.equal(R3.o.flags.sky, false); d3.listeners.uncapturederror[0]({ error: { message: 'Validation error [Buffer "weather3d.uniforms"] out of range' } });
  const origErr = console.error; console.error = () => { }; let info; try { info = h3.update({ tMin: minOf(7, 3, 14, 1), cam }); } finally { console.error = origErr; }
  assert.equal(R3.o.flags.sky, true, 'the sky is back'); const st3 = h3.status(); assert.equal(st3.stopped, true); assert.equal(st3.weather, false); assert.equal(st3.effects, false); assert.match(st3.failed, /weather3d\.uniforms/); assert.equal(R3.o.flags.particles, true); assert.ok(info && info.weather && info.statement, 'the weather state is still computed'); assert.match(h3.log.join(' '), /WebGPU validation error in the weather or effects pass/);
  const enc = mockEnc(); R3.ext.after && R3.ext.after(enc, R3); assert.equal(enc.log.length, 0, 'nothing is drawn after the stop'); h3.dispose();
});
test('fx-host: a renderer that is gone before the pipelines are ready is not touched; the WebGL2 install is unchanged by the WebGPU one', async () => {
  const dev = mockDevice(), R = mockR(dev), host = { api: 'webgpu', R, world: { count: 0 }, destroyed: false };
  const origCreate = dev.createRenderPipelineAsync.bind(dev); dev.createRenderPipelineAsync = d => { host.destroyed = true; return origCreate(d); };
  const h = await FxHost.create(host, { environment, data, tier: 'laptop', timing: false }); assert.equal(h.gpu, null); assert.equal(R.o.flags.sky, true); assert.match(h.log.join(' '), /went away/); assert.equal(Object.getOwnPropertyDescriptor(R, 'ext') && Object.getOwnPropertyDescriptor(R, 'ext').get, undefined, 'no chain installed'); h.dispose();
  const fx = fs.readFileSync(path.join(APP, 'src/fx-host.mjs'), 'utf8'); assert.match(fx, /if \(R && api === 'webgl2' && R\.gl\) me\._installGL\(R\)/); assert.match(fx, /else if \(R && api === 'webgpu' && R\.dev\) await me\._installGPU\(R\)/);
});
test('the prototype renderer calls ext.after between its scene pass and its post passes, and the shipped files say nothing about how they were made', () => {
  const proto = fs.readFileSync(path.join(BT, 'render/prototype/src/webgpu.mjs'), 'utf8'), i = proto.indexOf('this.ext.after(enc, this)'); assert.ok(i > 0); assert.ok(proto.lastIndexOf('this.ext.scene(p, this)', i) > 0 && proto.indexOf("P.part", i) > i, 'after: scene hook, scene pass end, the hook, then particles and post');
  for (const f of ['src/weather3d/gpu.mjs', 'src/weather3d/shaders-wgsl.mjs', 'src/fx-host.mjs', 'tests/weather3d-gpu-page.mjs']) { const s = fs.readFileSync(path.join(APP, f), 'utf8'); assert.ok(!/\b(Claude|Anthropic|LLM|subagent|AI-generated|generated by)\b|\bagents?\b/i.test(s), f + ' has no mention of how it was made'); }
});
test('the harness cases: unique names, times inside the battle window, every feature of the layer has a case, the Sherfy barn is the documented point, and HOOKS is a self-contained function', () => {
  const names = CASES.map(c => c.name); assert.equal(new Set(names).size, names.length);
  for (const c of CASES) { const sp = specOf(c, minOf); assert.ok(sp.tMin >= minOf(6, 26) && sp.tMin < minOf(7, 15), c.name + ' is inside 26 Jun to 14 Jul'); assert.ok(c.what && c.what.length > 10, c.name + ' says what it shows'); assert.ok(!('m' in sp) && !('what' in sp)); for (const k of Object.keys(c.plan || {})) assert.ok(['guns', 'volleys', 'falls', 'march'].includes(k), c.name + ' plan key ' + k); }
  const need = { stars: /stars/, moon: /moon/, dusk: /dusk/, fog: /fog/, clouds: /clouds/, wet: /wet/, smoke: /smoke/, flash: /flash/, dust: /dust/, fire: /fire/, floor: /floor/ };
  for (const [k, re] of Object.entries(need)) assert.ok(names.some(n => re.test(n)), 'a case for ' + k);
  const fires = D('fires.json').sources.find(f => f.id === 'fx-fire-sherfy-barn'); assert.equal(SHERFY.lng, fires.pos.lng); assert.equal(SHERFY.lat, fires.pos.lat);
  const src = HOOKS.toString(); assert.match(src, /^function HOOKS\(opts\)/); assert.ok(!/\bimport\b|\brequire\b|\bfs\.|\bpath\./.test(src), 'it runs in the page: no module identifiers'); assert.ok(CHROME_ARGS.includes('--enable-unsafe-webgpu') && CHROME_ARGS.includes('--use-angle=swiftshader'));
  assert.match(src, /getCurrentTexture/); assert.match(src, /COPY_SRC/); assert.match(src, /uncapturederror/); assert.match(src, /getCompilationInfo/);
});
test('the close-view cases: unique names, inside the battle window, a fractional minute (sec) stays inside its minute, the aim points are inside the stand-in plan, aimFall hits the latest fall of the plan, and the default run is still the 16 cases', () => {
  assert.equal(CASES.length, 16, 'the default run (the stored evidence) is unchanged'); assert.equal(ALL_CASES.length, CASES.length + EXTRA_CASES.length); const names = ALL_CASES.map(c => c.name); assert.equal(new Set(names).size, names.length, 'no name is used twice across the two lists');
  for (const c of EXTRA_CASES) {
    const sp = specOf(c, minOf); assert.ok(sp.tMin >= minOf(6, 26) && sp.tMin < minOf(7, 15), c.name); assert.ok(c.what && c.what.length > 20, c.name + ' says what it shows'); assert.ok(!('m' in sp) && !('what' in sp) && !('sec' in sp) && !('aimFall' in sp), 'specOf strips the descriptive keys');
    if (c.sec != null) { assert.ok(c.sec > 0 && c.sec < 60); assert.equal(Math.floor(sp.tMin), minOf(...c.m), c.name + ': sec stays inside its minute'); } else assert.equal(sp.tMin, minOf(...c.m));
    for (const k of Object.keys(c.plan || {})) assert.ok(['guns', 'volleys', 'falls', 'march'].includes(k), c.name + ' plan key ' + k);
    if (c.aim) { assert.ok(Array.isArray(c.aim) && c.aim.length === 3 && c.aim.every(Number.isFinite), c.name + ' aim'); assert.ok(c.plan && Object.keys(c.plan).length, c.name + ': an aim point of the plan needs a plan'); }
    assert.ok(c.fov == null || (c.fov > 1 && c.fov <= 90), c.name + ' fov in degrees');
  }
  for (const c of CASES) { const sp = specOf(c, minOf); assert.equal(sp.tMin, minOf(...c.m), c.name + ': the 16 stored cases keep their exact minute'); assert.ok(!('aim' in sp)); }
  // the effect classes of the close views: ground strike with clods, shell burst, fresh volley, dust at falls, fire close and at night
  for (const re of [/strike/, /burst/, /volley/, /falls/, /fire-close/, /fire-night/]) assert.ok(EXTRA_CASES.some(c => re.test(c.name)), 'a close case for ' + re);
  assert.ok(EXTRA_CASES.filter(c => /^fire-/.test(c.name)).every(c => c.target[0] === SHERFY.lng && c.target[1] === SHERFY.lat), 'the fire cases look at the documented barn point');
  // the stand-in plan: the strike of gun 0 is 160 m ahead and 40 m to the left of the anchor, the burst 230 m ahead, 60 m left, 14 m up (the aim points of the two cases); and the latest fall before a frame time is the one aimFall aims at
  const flat = () => 0, P = makePlan(flat), cam = { x: 100, y: 5, z: -40, yaw: 1.1, pitch: 0, lookAtPoint(px, py, pz) { this.aimed = [px, py, pz]; } }; P.anchor(cam, { guns: true, falls: true });
  const strike = EXTRA_CASES.find(c => /^strike/.test(c.name)), burst = EXTRA_CASES.find(c => /^burst/.test(c.name)); aimCamera(cam, P, strike.aim); const sp = P.point(160, -40, 2); assert.deepEqual(cam.aimed, sp);
  const got = {}; P.bus.on('impact', (u, i, t, kind, pos) => { if (i === 0 && (kind === 'solid_strike' || kind === 'shell_burst')) got[kind] = Array.from(pos); });
  P.anim.advance(1000, 1011.9); assert.deepEqual(got.solid_strike, P.point(160, -40, 0.3), 'gun 0 strikes at (160, -40) ahead of the anchor, 0.3 m above the ground'); P.anim.advance(1011.9, 1012.1); assert.deepEqual(got.shell_burst, P.point(230, -60, 14), 'and bursts at (230, -60), 14 m up');
  assert.deepEqual(burst.aim, [230, -60, 14]); assert.deepEqual(strike.aim.slice(0, 2), [160, -40]);
  const fc = EXTRA_CASES.find(c => c.aimFall), spec = specOf(fc, minOf), P2 = makePlan(flat); P2.anchor({ x: 0, y: 0, z: 0, yaw: 0 }, { falls: true }); const falls = []; P2.bus.on('fall', (u, i, t, kind, pos) => falls.push({ i, t, pos: Array.from(pos) }));
  const T = spec.tMin * 60; P2.anim.advance(T - 60, T); const last = falls.at(-1); assert.ok(last.t <= T && T - last.t < 4, 'the latest fall is less than one beat before the frame'); assert.deepEqual(last.pos, P2.point(38, spec.aim[1], 0), 'aimFall points at the latest fall (v of the aim = v of that fall)');
});
test('the real-crowd cases of the shell harness: unique names that clash with no other list, inside the battle window, three kinds of view, and a unit view names an arm, a distance, a height and a side', () => {
  const names = REAL_CASES.map(c => c.name), other = new Set(ALL_CASES.map(c => c.name)); assert.equal(new Set(names).size, names.length); for (const n of names) assert.ok(!other.has(n), n + ' is also a case of the other lists');
  assert.ok(REAL_CASES.length >= 9, 'the three field views and the six views of a unit');
  for (const c of REAL_CASES) {
    const t = minOf(...c.m); assert.ok(t >= minOf(6, 26) && t < minOf(7, 15), c.name + ' is inside the battle window'); assert.ok(c.what && c.what.length > 20, c.name + ' says what it shows'); assert.ok(['overview', 'ground', 'unit'].includes(c.view), c.name + ' view ' + c.view);
    if (c.view === 'unit') { assert.ok(['infantry', 'artillery', 'cavalry'].includes(c.arm), c.name + ' arm'); assert.ok(c.dist >= 5 && c.dist <= 120 && c.height >= 1 && c.height <= 40, c.name + ' distance and height in metres'); assert.ok(Number.isFinite(c.yawAdd), c.name + ' yaw'); } else assert.ok(c.dist == null && c.arm == null, c.name + ': the shell\'s own views take no unit parameters');
  }
  for (const re of [/overview/, /ground-jul3/, /ground-jul2/, /line-60m/, /soldiers-28m/, /soldiers-12m-jul3/, /soldiers-7m/, /battery/, /soldiers-12m-jul2/]) assert.ok(REAL_CASES.some(c => re.test(c.name)), 'a real-crowd case for ' + re);
  assert.ok(REAL_CASES.some(c => c.m[1] === 2 && c.m[2] >= 22), 'one case at night'); assert.ok(REAL_CASES.some(c => c.arm === 'artillery'), 'one case at a battery');
  const th = fs.readFileSync(path.join(APP, 'tests/weather3d-gpu-theatre.mjs'), 'utf8'); assert.match(th, /REAL_CASES/); assert.ok(!/Math\.random|Date\.now\(\)\s*[%*]/.test(th.replace(/const t00 = Date\.now\(\)[^;]*;/, '')), 'no random choice of the unit: the census picks the largest present unit of the arm');
});
// ---------- the run checker (what a gate runner calls on the summaries of the browser harness)
const okRun = () => ({ api: 'webgpu', url: 'http://x/app/tests/weather3d-gpu.html?api=webgpu', finished: 'now', errors: [], diagInit: { gpu: { ok: true, weatherOk: true, fxOk: true, failed: null, log: [], warnings: [] } }, diagEnd: { gpuErrors: [], wgsl: [], modules: ['a', 'b'] },
  cases: { a: { validation: null, gpuStats: { weatherDraws: 3, failed: null }, pixels: { all: { mean: 90 } } }, b: { validation: null, gpuStats: { weatherDraws: 4, failed: null }, pixels: { all: { mean: 40 } } } }, pure: { 'A again': { identical: true, bytesDiffering: 0 } },
  resize: { smallValidation: null, backValidation: null, backIdentical: true }, computeCheck: { messages: [], pipelineOk: true }, afterDispose: { gpuErrors: [] } });
test('the run checker: a clean run is clean; every kind of defect is named; nothing is loosened', () => {
  const r = checkRun(okRun(), { cases: 2 }); assert.equal(r.ok, true, r.problems.join('; ')); assert.equal(r.facts.cases, 2); assert.equal(r.facts.purityChecks, 1);
  const bad = (mut, re) => { const s = okRun(); mut(s); const x = checkRun(s); assert.equal(x.ok, false, 'a defect was not found: ' + re); assert.ok(x.problems.some(p => re.test(p)), re + ' in ' + JSON.stringify(x.problems)); };
  bad(s => { s.cases.a.validation = 'Invalid BindGroup'; }, /a: validation error/); bad(s => { s.diagEnd.gpuErrors = ['DEVICE LOST destroyed']; }, /uncaptured|device loss/); bad(s => { s.afterDispose.gpuErrors = ['late error']; }, /uncaptured/); { const s = okRun(); s.afterDispose.gpuErrors = ['DEVICE LOST destroyed: Device was destroyed.']; assert.equal(checkRun(s).ok, true, 'the harness destroys the device itself at the end'); s.diagEnd.gpuErrors = ['DEVICE LOST destroyed: Device was destroyed.']; assert.equal(checkRun(s).ok, false, 'a loss before that is a problem'); }
  bad(s => { s.diagEnd.wgsl = [{ label: 'weather3d-mul', type: 'error', line: 3, col: 4, msg: 'unknown' }]; }, /WGSL compiler error/); bad(s => { s.diagInit.gpu.fxOk = false; }, /did not build/); bad(s => { s.diagInit.gpu.warnings = ['unused']; }, /compiler warnings/);
  bad(s => { s.pure['A again'] = { identical: false, bytesDiffering: 12 }; }, /scrub purity/); bad(s => { s.resize.backIdentical = false; s.resize.backBytesDiffering = 5; }, /resize/); bad(s => { s.computeCheck = { messages: [], pipelineOk: false, pipelineError: 'workgroup_size' }; }, /compute pipeline/);
  bad(s => { s.cases.a.pixels.all.mean = 0; }, /blank/); bad(s => { s.cases.b.gpuStats.failed = 'out of range'; }, /stopped/); bad(s => { s.errors = ['boom']; }, /reported errors/); bad(s => { s.finished = null; }, /did not finish/); bad(s => { s.cases = {}; }, /no case/);
  assert.equal(checkRun({ api: 'webgl2', finished: 1, errors: [], cases: { a: { pixels: { all: { mean: 5 } } } }, pure: {} }).ok, true); assert.equal(checkRun({}).ok, false);
  const off = okRun(); off.url += '&fx=off'; off.diagInit.gpu = null; assert.equal(checkRun(off).ok, true, 'a run of the prototype alone has no layer state');
  const row = (n, m, g, p) => ({ case: n, all: { meanAbs: m, over24: 0.001 }, spritesGL: g, spritesGPU: p }); const cmp = { rows: [row('a', 0.4, 5, 5), row('b', 0.35, 0, 0)], problems: [] };
  assert.equal(checkCompare(cmp).ok, true); assert.equal(checkCompare(cmp).facts.meanAbsMax, 0.4); assert.equal(checkCompare({ rows: [row('a', 9, 5, 5)], problems: [] }).ok, false); assert.equal(checkCompare({ rows: [row('a', 1, 5, 6)], problems: [] }).ok, false); assert.equal(checkCompare({ rows: [] }).ok, false);
  assert.equal(checkCompare({ rows: [row('a', 9, 5, 5)], problems: [] }, 12).ok, true, 'the limit is the caller\'s, a harness value and not a project gate');
});
test('real-GPU mode of the harnesses: Chrome without a software-rasteriser flag; a run that claims to be a real-GPU run on a software adapter, or with no adapter recorded, is a problem; a hardware adapter and an unclaimed software run are not', () => {
  assert.equal(chromeArgs(false), CHROME_ARGS); assert.equal(chromeArgs(true), REAL_GPU_ARGS); assert.ok(REAL_GPU_ARGS.includes('--enable-unsafe-webgpu') && REAL_GPU_ARGS.includes('--ignore-gpu-blocklist'));
  assert.ok(!REAL_GPU_ARGS.some(a => /swiftshader|use-angle|use-gl|software/i.test(a)), 'no software flag in the real-GPU set'); assert.ok(CHROME_ARGS.some(a => /swiftshader/.test(a)), 'the default set is the software one (this machine has no GPU)');
  const mk = (ad, api = 'webgpu') => { const s = okRun(); s.api = api; s.realGpu = true; s.diagInit.adapter = ad; return s; };
  const hw = checkRun(mk({ vendor: 'nvidia', arch: 'blackwell', device: '', desc: '' })); assert.equal(hw.ok, true, hw.problems.join('; ')); assert.equal(hw.facts.realGpu, true); assert.match(hw.facts.adapter, /nvidia/);
  for (const ad of [{ vendor: 'google', arch: 'swiftshader', device: '', desc: '' }, { renderer: 'ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)' }, { vendor: 'mesa', arch: 'llvmpipe' }, { renderer: 'Microsoft Basic Render Driver' }]) { const r = checkRun(mk(ad)); assert.equal(r.ok, false, JSON.stringify(ad)); assert.ok(r.problems.some(x => /real-GPU run but its adapter is a software one/.test(x))); }
  { const r = checkRun(mk(null)); assert.equal(r.ok, false); assert.ok(r.problems.some(x => /adapter is not recorded/.test(x))); }
  { const r = checkRun(mk({ renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 4070 Direct3D11 vs_5_0 ps_5_0, D3D11)' }, 'webgl2')); assert.equal(r.ok, true, r.problems.join('; ')); }
  { const s = okRun(); s.diagInit.adapter = { vendor: 'google', arch: 'swiftshader' }; const r = checkRun(s); assert.equal(r.ok, true, 'a software run that does not claim to be a real-GPU run is a software run, and says so in the facts'); assert.equal(r.facts.realGpu, false); }
  for (const f of ['weather3d-gpu.mjs', 'weather3d-gpu-theatre.mjs']) { const src = fs.readFileSync(path.join(APP, 'tests', f), 'utf8'); assert.match(src, /chromeArgs\(REALGPU\)/, f); assert.match(src, /realCanvas: args\.includes\('--real-canvas'\) \|\| REALGPU/, f); assert.match(src, /realGpu: REALGPU/, f); }
});
// ---------- the stored evidence is what the notes say it is (app/tests/results/weather3d-webgpu/, software adapter, 2026-11-13)
test('stored evidence: the WebGPU and WebGL2 runs are clean, the two APIs agree to the figures the notes state, the other budget tiers are clean, and the 16 pictures are there', () => {
  const R = path.join(APP, 'tests/results/weather3d-webgpu'), JS = f => JSON.parse(fs.readFileSync(path.join(R, f), 'utf8'));
  const gpu = checkRun(JS('webgpu-summary.json'), { cases: 16 }), gl = checkRun(JS('webgl2-summary.json'), { cases: 16 }), cmp = checkCompare(JS('compare-summary.json'));
  assert.equal(gpu.ok, true, gpu.problems.join('; ')); assert.equal(gl.ok, true, gl.problems.join('; ')); assert.equal(cmp.ok, true, cmp.problems.join('; '));
  assert.equal(gpu.facts.compilerMessages, 0); assert.equal(gpu.facts.modules, 15); assert.equal(gpu.facts.purityChecks, 3); assert.equal(gpu.facts.resize, true);
  assert.ok(cmp.facts.meanAbsMin >= 0.33 && cmp.facts.meanAbsMax <= 0.46 && cmp.facts.over24Max <= 0.002, JSON.stringify(cmp.facts));
  const names = Object.keys(JS('webgpu-summary.json').cases); for (const n of names) { const f = path.join(R, 'webgpu', n + '.png'); assert.ok(fs.existsSync(f), n + '.png'); assert.equal(fs.readFileSync(f).subarray(1, 4).toString(), 'PNG'); }
  const base = JS('base-compare-summary.json').rows.map(r => Math.round(r.all.meanAbs * 100) / 100); assert.ok(Math.min(...base) >= 0.36 && Math.max(...base) <= 0.43, 'the prototype alone (two decimals): ' + base);
  assert.equal(checkRun(JS('base-webgpu-summary.json')).ok, true); assert.equal(checkRun(JS('base-webgl2-summary.json')).ok, true);
  for (const t of ['tier-phone', 'tier-desktop']) { const r = checkRun(JS(t + '-webgpu-summary.json'), { cases: 4 }); assert.equal(r.ok, true, t + ': ' + r.problems.join('; ')); }
  // the software adapter's canvas: rendering to a texture of our own works, the real canvas does not (why the pictures come from a stand-in), recorded by the run itself
  const sw = JS('webgpu-summary.json').swapchain; assert.equal(sw.offscreen.lost, null); assert.deepEqual(sw.offscreen.px, [255, 128, 0, 255]); assert.match(sw.present.lost, /destroyed/); assert.match(sw['canvas-read'].lost, /Instance reference no longer exists/);
  assert.ok(JS('webgpu-summary.json').cases['smoke-jul3-1400'].effects.nSprites > 1000 && JS('webgpu-summary.json').cases['dust-march-jul2-1100'].gpuStats.fxDraws > 0, 'the sprites were drawn on WebGPU');
});
test('capture and replay: the driver writes the files the replay reads (same names and encodings), the terrain hash is the same function on both sides, the replay mirrors the prototype\'s group 0 and the pass encoding of gpu.mjs, and capture mode only adds a copy source to the colour and depth formats', () => {
  const R = f => fs.readFileSync(path.join(APP, 'tests', f), 'utf8'), drv = R('weather3d-gpu-capture.mjs'), rp = R('weather3d-gpu-replay.py'), pg = R('weather3d-gpu-page.mjs'), proto = fs.readFileSync(path.join(BT, 'render/prototype/src/webgpu.mjs'), 'utf8');
  // the file list of the driver, entry for entry, is what the replay opens
  const ext = Object.fromEntries([...drv.match(/const ext = \{([^}]*)\}/)[1].matchAll(/(\w+): '(\w+)'/g)].map(m => [m[1], m[2]])); assert.deepEqual(Object.keys(ext), ['pre', 'post', 'depth', 'fu', 'wu', 'fx', 'events', 'cum', 'wind']);
  for (const [k, e] of Object.entries(ext)) assert.ok(rp.includes(`'${k}.${e}'`), `the replay reads ${k}.${e}`);
  assert.deepEqual([ext.pre, ext.post, ext.depth, ext.cum], ['f16', 'f16', 'f32', 'u32'], 'the colour target is half floats, the depth floats, the cumulative counts u32'); assert.ok(drv.includes("'meta.json'") && rp.includes("'meta.json'"));
  for (const w of ['weather3d-mul', 'weather3d-add', 'fx3d-sprites', 'fx3d-cull-compute']) { assert.ok(drv.includes(`'${w}'`), 'the driver writes ' + w + '.wgsl'); assert.ok(rp.includes(`'${w}'`), 'the replay reads it'); }
  // the hash of the terrain heights (FNV-1a over 32-bit words): the page and the replay compute the same function
  assert.ok(pg.includes('0x811c9dc5') && pg.includes('Math.imul(h ^ u32[i], 16777619)') && rp.includes('0x811c9dc5') && rp.includes('((h ^ w) * 16777619) & 0xffffffff'));
  assert.ok(rp.includes("meta['hmin'] + u16 * sc) - 150") && /export const Y0 = 150/.test(fs.readFileSync(path.join(BT, 'render/prototype/src/world.mjs'), 'utf8')), 'the replay builds the heights as loadTerrain does (float64 arithmetic, stored as float32, minus Y0 = 150)');
  // the prototype's group 0 entry for entry: binding, stage visibility, kind (the replay is the layout the real pipelines are built with)
  const protoG0 = proto.slice(proto.indexOf('const g0 = d.createBindGroupLayout'), proto.indexOf('this.g0L = g0')); assert.ok(protoG0.includes('minBindingSize: FU_BYTES') && /const FU_BYTES = 512/.test(proto) && rp.includes("'min_binding_size': 512"), 'the frame block binding is 512 bytes with a dynamic offset');
  const kinds = [[0, 'uniform'], [1, 'storage'], [2, 'storage'], [3, 'storage'], [4, 'texture float'], [5, 'sampler filtering'], [6, 'texture depth 2d-array'], [7, 'sampler comparison'], [8, 'texture float'], [9, 'uniform'], [10, 'storage'], [11, 'sampler filtering']];
  for (const [b] of kinds) assert.ok(b >= 1 && b <= 3 ? protoG0.includes('[1, 2, 3].map(b => ({ binding: b, visibility: G.VERTEX, buffer: { type: \'read-only-storage\' } }))') : protoG0.includes(`binding: ${b},`), 'the prototype has binding ' + b);
  const pyG0 = rp.slice(rp.indexOf("g0 = guarded('bind group layout g0'"), rp.indexOf("bglW = guarded")); for (const [b] of kinds) assert.ok(b >= 1 && b <= 3 ? pyG0.includes("for b in (1, 2, 3)]") : pyG0.includes(`'binding': ${b},`), 'the replay has binding ' + b);
  assert.equal((pyG0.match(/'binding': \d+,/g) || []).length, 9, 'the replay lists bindings 0 and 4 to 11 itself and 1 to 3 as a group: twelve in all');
  assert.ok(pyG0.includes("'sample_type': 'depth', 'view_dimension': '2d-array'") && pyG0.includes("'type': 'comparison'") && pyG0.includes("'type': 'filtering'") && pyG0.includes("'has_dynamic_offset': True"));
  // the pass: colour loaded, depth attached read-only (no load or store op), group 0 at dynamic offset 0, weather multiply then add, then the sprites as a 4-vertex strip, instanced
  assert.match(rp, /'load_op': 'load', 'store_op': 'store'/); assert.match(rp, /'depth_stencil_attachment': \{'view': depthRT, 'depth_read_only': True\}|depth_stencil_attachment=\{'view': depthRT, 'depth_read_only': True\}/);
  assert.match(rp, /set_bind_group\(0, bg0, \[0\]\); p\.set_bind_group\(1, bgW\); p\.set_pipeline\(P\['mul'\]\); p\.draw\(3\); p\.set_pipeline\(P\['add'\]\); p\.draw\(3\)/); assert.match(rp, /p\.draw\(4, c\['nSprites'\]\)/);
  for (const [k, v] of [['mul', "('zero', 'src'), ('zero', 'one')"], ['add', "('one', 'one'), ('zero', 'one')"], ['fx', "('one', 'one-minus-src-alpha'), ('one', 'one-minus-src-alpha')"]]) assert.ok(rp.includes(`'${k}': blend(${v})`), 'the replay\'s blend state ' + k + ' is the one of BLEND');
  assert.deepEqual([BLEND.mul.color.srcFactor, BLEND.mul.color.dstFactor, BLEND.mul.alpha.srcFactor, BLEND.mul.alpha.dstFactor, BLEND.add.color.srcFactor, BLEND.add.color.dstFactor, BLEND.fx.color.srcFactor, BLEND.fx.color.dstFactor, BLEND.fx.alpha.srcFactor, BLEND.fx.alpha.dstFactor], ['zero', 'src', 'zero', 'one', 'one', 'one', 'one', 'one-minus-src-alpha', 'one', 'one-minus-src-alpha']);
  // capture mode: the page changes the usage of two formats and nothing else, and only when asked
  const patch = pg.match(/if \(Q\.get\('capture'\) && window\.GPUDevice\) \{[^\n]*\}/)[0]; assert.ok(patch.includes('/^(rgba16float|depth32float)$/') && patch.includes('usage: desc.usage | GPUTextureUsage.COPY_SRC') && !/Math\.random|Date\.now/.test(patch));
  assert.ok(/WG\.capture = async function/.test(pg) && /delete gpu\.draw/.test(pg), 'the wrapper of gpu.draw is removed again after the frame'); assert.ok(!/Math\.random/.test(drv + rp + pg), 'no random choice in the capture, the replay or the page');
  assert.equal(WU_BYTES, 848, 'the weather uniform block the replay binds is the 848 bytes of the packer');
});
test('stored evidence of 2026-11-14: the six close views are clean on WebGPU with their pictures, and the second WebGPU implementation built every module and pipeline, refused every negative control, and compiled the other renderers\' WGSL', () => {
  const R = path.join(APP, 'tests/results/weather3d-webgpu'), JS = f => JSON.parse(fs.readFileSync(path.join(R, f), 'utf8'));
  const close = JS('close-webgpu-summary.json'), r = checkRun(close, { cases: 6 }); assert.equal(r.ok, true, r.problems.join('; ')); assert.equal(r.facts.compilerMessages, 0); assert.equal(r.facts.modules, 15); assert.equal(r.facts.purityChecks, 3); assert.equal(r.facts.resize, true); assert.equal(close.realGpu, false, 'a software run says so');
  assert.deepEqual(Object.keys(close.cases), EXTRA_CASES.map(c => c.name), 'the six cases of EXTRA_CASES, in order');
  for (const [n, c] of Object.entries(close.cases)) { assert.equal(c.validation, null, n); assert.ok(c.gpuStats.weatherDraws >= 1 && c.gpuStats.fxDraws >= 1, n + ' drew the weather and the sprites'); assert.ok(c.effects.nSprites > 0, n + ' has sprites'); const f = path.join(R, 'close-webgpu', n + '.png'); assert.equal(fs.readFileSync(f).subarray(1, 4).toString(), 'PNG', n + '.png'); }
  assert.ok(close.cases['fire-night-jul3-2200'].pixels.all.min > 2, 'night is never black, close to a fire too (the darkest pixel of the frame is above the black floor)');
  const si = JS('second-implementation-build.json'); assert.equal(si.ok, true, si.problems.join('; ')); assert.deepEqual(si.problems, []); assert.match(si.implementation, /^wgpu-native via wgpu-py/); assert.equal(si.software, true); assert.match(JSON.stringify(si.adapter), /SwiftShader/, 'the adapter is a software one, recorded');
  assert.deepEqual(Object.keys(si.build.modules), ['weather3d-mul', 'weather3d-add', 'fx3d-sprites', 'fx3d-cull-compute']); assert.ok(Object.values(si.build.modules).every(Boolean) && Object.values(si.build.pipelines).length === 4 && Object.values(si.build.pipelines).every(Boolean));
  assert.ok(Object.values(si.build.compiler_messages).every(m => Array.isArray(m) && m.length === 0), 'no compiler message');
  assert.equal(Object.keys(si.controls).length, 5); assert.ok(Object.values(si.controls).every(v => /^refused/.test(v)), 'every negative control was refused: the positive results are not vacuous'); assert.ok(Object.keys(si.controls).some(k => /attached for writing and sampled/.test(k)), 'the usage-scope control');
  assert.deepEqual(si.selftest, { ran: true, finite: true }); assert.equal(Object.keys(si.other_modules).length, 13); assert.ok(Object.values(si.other_modules).every(v => v === 'compiles'));
});
