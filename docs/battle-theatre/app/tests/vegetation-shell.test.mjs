// Node tests of the standing crop near the camera (src/ext/vegetation/shell.mjs): the pure parts (sorting the crop-bearing ground-cover triangles into chunks, cutting a chunk's triangles
// down, choosing the chunks near the camera, the small cache of cut-down chunks) and what can be said of the two shaders without a GPU (their text, the state they read). The look of the crop
// is judged in a browser (tests/vegetation-browser.mjs), not here.
//   node --test docs/battle-theatre/app/tests/vegetation-shell.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { VegModel, isoMin, stateAt } from '../src/ext/vegetation/model.mjs';
import { buildDecals } from '../src/ext/vegetation/mesh.mjs';
import { SHELL, SHELL_CLASSES, buildShellChunks, refineChunk, selectShellChunks, ChunkCache, SHELL_VS, SHELL_FS } from '../src/ext/vegetation/shell.mjs';
import { packUnitState, STATE_K } from '../src/ext/vegetation/gl.mjs';
import { nodeWorld } from './node-world.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), APP = path.resolve(here, '..');
const DATA = JSON.parse(fs.readFileSync(path.join(APP, 'data', 'vegetation.json'), 'utf8'));
const M = new VegModel(structuredClone(DATA));
const { T: TER } = await nodeWorld(), FLAT = (lng, lat) => TER.xz(lng, lat), GROUND = { W: TER.W, H: TER.H };
const D = buildDecals(M, FLAT), S = buildShellChunks(D, M.units, GROUND);
const triArea = (a, b, c, d, e, f) => Math.abs((c - a) * (f - b) - (e - a) * (d - b)) / 2;

test('the chunks hold exactly the triangles of the crop-bearing units, each once, in order, in the square it belongs to', () => {
  let want = 0; for (let t = 0; t < D.triangles; t++) if (SHELL_CLASSES.has(M.units[D.verts[t * 12 + 2]].cls)) want++;
  assert.ok(want > 50000 && want < D.triangles, 'crop-bearing triangles: ' + want + ' of ' + D.triangles); assert.equal(S.n, want); assert.equal(S.order.length, want); assert.equal(new Set(S.order).size, want, 'each triangle once');
  let pos = 0; for (const c of S.chunks) { assert.equal(c.first, pos, 'chunks follow one another'); assert.ok(c.n > 0); pos += c.n; } assert.equal(pos, want);
  for (const c of S.chunks) for (let i = c.first; i < c.first + c.n; i += 53) {
    const o = S.order[i] * 12, cx = (D.verts[o] + D.verts[o + 4] + D.verts[o + 8]) / 3, cz = (D.verts[o + 1] + D.verts[o + 5] + D.verts[o + 9]) / 3, cls = M.units[D.verts[o + 2]].cls;
    assert.ok(SHELL_CLASSES.has(cls), 'a ' + cls + ' is not crop ground'); assert.ok(Math.abs(cx - c.cx) <= S.C / 2 + 1e-3 && Math.abs(cz - c.cz) <= S.C / 2 + 1e-3, 'the triangle lies in its chunk');
  }
  for (let i = 1; i < S.chunks.length; i++) assert.ok(S.chunks[i].iz * S.nx + S.chunks[i].ix > S.chunks[i - 1].iz * S.nx + S.chunks[i - 1].ix, 'chunks are in ground order');
  assert.ok(!SHELL_CLASSES.has('woods') && !SHELL_CLASSES.has('marsh') && !SHELL_CLASSES.has('boulder') && !SHELL_CLASSES.has('scatter'), 'no wood, marsh, boulder ground or tree cluster is a crop');
});

test('a chunk cut down: short edges, the same ground, the unit and the layer of every triangle kept', () => {
  const big = S.chunks.reduce((a, c, i) => (c.n > S.chunks[a].n ? i : a), 0), small = S.chunks.reduce((a, c, i) => (c.n < S.chunks[a].n ? i : a), 0), mid = S.chunks.length >> 1;
  for (const ci of [big, small, mid]) {
    const c = S.chunks[ci], out = refineChunk(D, S, ci, SHELL.maxEdge); assert.equal(out.length % 12, 0); let before = 0, after = 0;
    for (let i = c.first; i < c.first + c.n; i++) { const o = S.order[i] * 12; before += triArea(D.verts[o], D.verts[o + 1], D.verts[o + 4], D.verts[o + 5], D.verts[o + 8], D.verts[o + 9]); }
    const units = new Set(); for (let i = c.first; i < c.first + c.n; i++) units.add(D.verts[S.order[i] * 12 + 2]);
    for (let k = 0; k < out.length; k += 12) {
      after += triArea(out[k], out[k + 1], out[k + 4], out[k + 5], out[k + 8], out[k + 9]);
      for (const [a, b] of [[0, 4], [4, 8], [8, 0]]) assert.ok(Math.hypot(out[k + a] - out[k + b], out[k + a + 1] - out[k + b + 1]) <= SHELL.maxEdge + 1e-3, 'edge of at most ' + SHELL.maxEdge + ' m');
      assert.ok(units.has(out[k + 2]) && out[k + 2] === out[k + 6] && out[k + 6] === out[k + 10] && out[k + 3] === out[k + 7], 'one unit and one layer to a triangle');
    }
    assert.ok(Math.abs(after - before) <= 2e-4 * before + 1e-3, `the same ground before and after (${before.toFixed(3)} and ${after.toFixed(3)} m2; the coordinates are 32-bit floats)`);
  }
});

test('the chunks near the camera are chosen by distance and by view; nothing far is chosen', () => {
  const c0 = S.chunks[S.chunks.length >> 1], at = (x, z, r, v) => selectShellChunks(S, x, z, r, v);
  assert.ok(at(c0.cx, c0.cz, SHELL.range).length >= 1 && at(c0.cx, c0.cz, SHELL.range).includes(S.chunks.indexOf(c0)), 'the chunk the camera stands over');
  assert.deepEqual(at(c0.cx + 1e6, c0.cz, SHELL.range), [], 'a camera far off chooses none');
  assert.deepEqual(at(c0.cx, c0.cz, SHELL.range, () => false), [], 'nothing out of view');
  const near = at(c0.cx, c0.cz, SHELL.range + 40); for (const ci of near) { const c = S.chunks[ci], dx = Math.max(0, Math.abs(c.cx - c0.cx) - S.C / 2), dz = Math.max(0, Math.abs(c.cz - c0.cz) - S.C / 2); assert.ok(dx * dx + dz * dz <= (SHELL.range + 40) ** 2); }
  assert.ok(near.length <= 9 + 3, 'a few chunks, not hundreds: ' + near.length);
});

test('the cache of cut-down chunks: a limit, the least recently used leaves first, the ones in use stay, a build allowance per frame', () => {
  const made = [], dropped = []; const cache = new ChunkCache(3, ci => { made.push(ci); return { ci, used: 0 }; }, e => dropped.push(e.ci));
  for (const ci of [1, 2, 3]) assert.ok(cache.get(ci, 9)); assert.equal(cache.get(1, 0).ci, 1, 'a chunk already built needs no allowance'); assert.equal(cache.get(4, 0), null, 'a new chunk waits when the allowance is spent'); assert.deepEqual(made, [1, 2, 3]);
  cache.get(4, 1); cache.trim(new Set([4])); assert.equal(cache.map.size, 3); assert.deepEqual(dropped, [2], 'chunk 2 was the least recently used (1 was asked for again)');
  cache.get(5, 1); cache.trim(new Set([1, 3, 4, 5])); assert.equal(cache.map.size, 4, 'chunks in use are never dropped, even over the limit');
  cache.clear(); assert.equal(cache.map.size, 0); assert.equal(dropped.length, 1 + 4, 'clear gives every entry back');
});

test('the state texture the shaders read: texel 3 holds the stage, the shock height and the standing height of a crop; texel 0 the colour and the crop code', () => {
  const wf = M.units.find(u => u.cls === 'wheatfield'), out = new Float32Array(STATE_K * 4); const canopy = new Float32Array(3);
  const T = s => isoMin(s), s = stateAt(M, wf, T('1863-07-02T12:00'), {});
  packUnitState(M, wf, T('1863-07-02T12:00'), {}, canopy, out, 0);
  assert.equal(out[3], 1, 'wheat is crop code 1'); assert.ok(out[4] > 0.9 && out[4] < 1.8, 'texel 1 x: the height of a chin-high stand, ' + out[4]);
  assert.ok(out[14] > 0.9 && out[14] < 1.8 && Math.abs(out[14] - (s.ground.hStanding[0] + s.ground.hStanding[1]) / 2) < 1e-5, 'texel 3 z: the standing height before any trampling: ' + out[14]); assert.equal(out[12], 0, 'standing: no stage code');
  const wheat = M.units.find(u => u.crop === 'wheat' && u.cls === 'field'), late = T('1863-07-26T12:00'), o2 = new Float32Array(STATE_K * 4); packUnitState(M, wheat, late, { 'CF-VEG-HARVEST': 'early' }, canopy, o2, 0);
  assert.ok(o2[12] >= 2 && o2[12] <= 3, 'cut: shocked or stubble, code ' + o2[12]); assert.ok(o2[13] >= 0, 'the shock height is there for a cut field');
  const wood = M.units.find(u => u.cls === 'woods'), o3 = new Float32Array(STATE_K * 4); canopy.set([0.2, 0.34, 0.13]); packUnitState(M, wood, T('1863-07-02T12:00'), {}, canopy, o3, 0);
  assert.equal(o3[3], 0, 'a wood is crop code 0: the crop shells never draw on it'); assert.ok(o3[13] > 0 && o3[14] > 0 && o3[15] > 0, 'texel 3 yzw of a wood is its canopy seen from above');
});

test('the two shaders: the parts a driver would refuse that can be seen without one', () => {
  for (const [name, src] of [['vertex', SHELL_VS], ['fragment', SHELL_FS]]) {
    assert.ok(/void\s+main\s*\(\s*\)/.test(src), name + ' has main'); assert.ok(!/#version/.test(src), 'the renderer adds the version and its prelude');
    let d = 0, p = 0; for (const ch of src) { if (ch === '{') d++; else if (ch === '}') d--; else if (ch === '(') p++; else if (ch === ')') p--; assert.ok(d >= 0 && p >= 0, name + ' brackets'); } assert.equal(d, 0, name + ' braces'); assert.equal(p, 0, name + ' parentheses');
    const words = new Set(src.replace(/\/\/.*$/gm, '').match(/[A-Za-z_][A-Za-z0-9_]*/g));
    for (const bad of ['sample', 'filter', 'input', 'output', 'common', 'partition', 'active', 'asm', 'class', 'union', 'enum', 'typedef', 'template', 'this', 'packed', 'resource', 'goto', 'inline', 'noinline', 'public', 'static', 'extern', 'external', 'interface', 'long', 'short', 'double', 'half', 'fixed', 'unsigned', 'superp', 'namespace', 'using', 'sizeof', 'cast']) assert.ok(!words.has(bad), `${name}: "${bad}" is a reserved word of GLSL ES 3.00`);
  }
  assert.match(SHELL_VS, /gl_InstanceID/); assert.match(SHELL_VS, /layout\(location=0\) in vec4 a/); assert.match(SHELL_VS, /uLayers/); assert.match(SHELL_FS, /out vec4 o;/); assert.match(SHELL_FS, /discard/);
  for (const fn of ['stx', 'hv2', 'vn2', 'hsh', 'shadowAt', 'fogged', 'lit', 's2l']) assert.ok(new RegExp('\\b' + fn + '\\s*\\(').test(SHELL_FS), 'the fragment shader uses ' + fn + ' (defined by the prelude or gl.mjs)');
  assert.ok(!/\b(AI|Claude|Anthropic|generated|automated|agent|prompt)\b/i.test(SHELL_VS + SHELL_FS), 'no audit word in the shaders');
});

test('the readings of Little Round Top reach the scene: the hill\'s east slope keeps all, half or none of its trees in the state texture, its ground is open rock when unwooded, and no other wood is touched', () => {
  const east = M.units.find(u => u.lc === 'LC-WOOD-LRT-E'); assert.ok(east, 'the east slope of the hill is a unit of its own'); assert.ok(M.lrtUnits.has(east.id)); assert.equal(east.geom_tier, 'inferred', 'its outline is the Warren wood cut out by a rule'); assert.ok(east.area_ac > 8 && east.area_ac < 25, 'about the half of a disc of 230 m: ' + east.area_ac);
  assert.ok(east.claims.some(([c, r]) => c === 'VC-NPS-026' && r === 'exact'), 'the claim that names the wooded east slope names this polygon');
  const t = isoMin('1863-07-02T12:00'), canopy = new Float32Array(3); canopy.set([0.2, 0.34, 0.13]);
  const run = (u, ch) => { const out = new Float32Array(STATE_K * 4); packUnitState(M, u, t, ch, canopy, out, 0); return { out, s: stateAt(M, u, t, ch) }; };
  const r = [{}, { 'CF-VEG-LRT': 'wiki_light_summit' }, { 'CF-VEG-LRT': 'wiki_unwooded' }].map(ch => run(east, ch));
  assert.deepEqual(r.map(x => x.out[16]), [1, 0.5, 0], 'texel 4 x: the share of the trees drawn');
  assert.deepEqual(r.map(x => x.s.trees.keep), [1, 0.5, 0]); assert.equal(r[0].s.trees.perHa, east.woods.per_ha); assert.equal(r[2].s.trees.perHa, 0);
  assert.equal(r[0].out[3], 0, 'wooded: the floor of a wood'); assert.equal(r[1].out[3], 0); assert.equal(r[2].out[3], 8, 'unwooded: open rock (crop code 8)'); assert.equal(r[2].s.ground.crop, 'open_rock'); assert.equal(r[2].s.tiers.crop, 'plausible-procedural', 'the unwooded reading is not documented');
  for (const x of r) for (let k = 17; k < 20; k++) assert.equal(x.out[k], 0, 'the spare floats of texel 4 are zero');
  for (const u of M.units.filter(x => (x.woods || x.orchard) && !M.lrtUnits.has(x.id)).slice(0, 60)) for (const ch of [{ 'CF-VEG-LRT': 'wiki_unwooded' }, { 'CF-VEG-LRT': 'wiki_light_summit' }]) assert.equal(run(u, ch).out[16], 1, u.id + ' is not on the hill: its trees stay');
  // the unit the scenario names are on the hill and nowhere else
  const lrt = [...M.lrtUnits].map(id => M.byId.get(id)); for (const u of lrt) assert.ok(u.cls === 'woods' || u.cls === 'scatter', u.id);
});
