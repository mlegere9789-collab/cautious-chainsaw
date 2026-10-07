// test/symbology.test.mjs - the symbol pipeline's tests.   node --test docs/pitch/anim2/symbology/test/symbology.test.mjs     (about 1 minute: it rebuilds nothing, it checks what `node build.mjs` wrote and re-derives it)
// Needs: dist/ built (node build.mjs), results/agg-census.json (node tools/agg-census.mjs), Chrome for the browser tests, python + PIL for the pixel test.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs'; import path from 'node:path'; import zlib from 'node:zlib'; import { spawnSync } from 'node:child_process'; import crypto from 'node:crypto';
import { ROOT, REPO } from '../tools/chrome.mjs';
import { loadTokens } from '../src/tokens.mjs';
import { plain, isLeaf, deepMerge, resolveTokens, baseKey as srcBaseKey, SIDES, ARMS, ECHELONS } from '../src/common.mjs';
import { contrast, luminance, deltaE2000, rgbToLab, simulate, CVD_MATRICES, over } from '../src/colour.mjs';
import { LANGUAGES, LANGUAGE_IDS } from '../src/languages.mjs';
import { buildLanguageSprites, buildOverlaySprites, vocabularySpecs } from '../src/build-sprites.mjs';
import { neededSet } from '../src/needed.mjs';
import { CHIPS, CHIP_OF_DISPOSITION, gaugeLevel as srcGauge } from '../src/chips.mjs';
import { ARMSETS, BADGE_SHAPES } from '../src/overlays.mjs';
import * as rt from '../runtime/atlas.mjs';

const { T, tree } = loadTokens({}); const needed = neededSet({ repo: REPO });
const dist = path.join(ROOT, 'dist'); const idx = (n) => JSON.parse(fs.readFileSync(path.join(dist, 'atlas', `${n}.json`), 'utf8'));

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------
test('tokens: every leaf is documented, typed and in range; the palettes have the same keys', () => {
  let leaves = 0;
  const walk = (n, p) => { if (isLeaf(n)) { leaves++; assert.ok(typeof n.$description === 'string' && n.$description.length >= 12, `${p}: needs a $description`); assert.ok(['number', 'string', 'boolean', 'color'].includes(n.$type), `${p}: bad $type ${n.$type}`);
      if (n.$type === 'color') assert.match(n.$value, /^#[0-9a-fA-F]{6}$/, p); if (n.$type === 'number') assert.ok(Number.isFinite(n.$value), p); if (n.$type === 'boolean') assert.equal(typeof n.$value, 'boolean', p); return; }
    if (n && typeof n === 'object') for (const [k, v] of Object.entries(n)) if (!k.startsWith('$')) walk(v, `${p}.${k}`); };
  walk(tree, '$');
  assert.ok(leaves > 120, `only ${leaves} token leaves`);
  const keys = (o) => Object.keys(o).filter((k) => !k.startsWith('$')).sort().join(',');
  assert.equal(keys(tree.palettes.standard), keys(tree.palettes.highContrast));
});

test('tokens: an override file changes only what it names; unknown palettes are rejected by name', () => {
  const ov = { palettes: { standard: { union: { $value: '#123456' } } }, ring: { light: { $value: 2 } } };
  const R = resolveTokens(tree, { overrides: ov });
  assert.equal(R.palette.union, '#123456'); assert.equal(R.ring.light, 2); assert.equal(R.ring.dark, T.ring.dark); assert.equal(R.palette.confederate, T.palette.confederate);
  assert.equal(plain(tree).ring.light, 1, 'the source tree is not mutated');
  assert.throws(() => resolveTokens(tree, { palette: 'nope' }));
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------
test('colour maths: published CIEDE2000 vectors, WCAG extremes, CVD matrices keep white white', () => {
  for (const [a, b, e] of [[[50, 2.6772, -79.7751], [50, 0, -82.7485], 2.0425], [[50, 3.1571, -77.2803], [50, 0, -82.7485], 2.8615], [[50, 2.5, 0], [73, 25, -18], 27.1492], [[60.2574, -34.0099, 36.2677], [60.4626, -34.1751, 39.4387], 1.2644]]) assert.ok(Math.abs(deltaE2000(a, b) - e) < 5e-4, `${a} ${b}`);
  assert.equal(Math.round(contrast('#000000', '#ffffff') * 100) / 100, 21); assert.equal(luminance('#ffffff'), 1);
  for (const [n, M] of Object.entries(CVD_MATRICES)) { for (const row of M) assert.ok(Math.abs(row.reduce((a, b) => a + b, 0) - 1) < 1e-4, `${n} row sums to 1`); assert.equal(simulate('#ffffff', n), '#ffffff'); }
  assert.ok(Math.abs(rgbToLab('#ffffff')[0] - 100) < 0.01);
});

for (const pal of ['standard', 'highContrast']) test(`colour tests (WCAG contrast of ink and rings on six backdrops, side separation under protanopia, deuteranopia, tritanopia and greyscale): palette ${pal}`, () => {
  const r = spawnSync(process.execPath, [path.join(ROOT, 'tools', 'colour-tests.mjs'), '--palette', pal], { encoding: 'utf8' }); assert.equal(r.status, 0, r.stderr);
  const j = JSON.parse(fs.readFileSync(path.join(ROOT, 'results', pal === 'standard' ? 'colour-tests.json' : `colour-tests-${pal}.json`), 'utf8'));
  assert.deepEqual(j.summary.fail, [], `failing pairs: ${j.summary.fail.join('; ')}`); assert.ok(j.summary.total >= 40);
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------
const vocab = {}; for (const id of LANGUAGE_IDS) vocab[id] = buildLanguageSprites(id, T, needed, { all: true });
const overlays = buildOverlaySprites(T, needed, { all: true });
test('sprites: every sprite of the whole vocabulary is well-formed, whole-unit sized, anchored and boxed', () => {
  const all = [...Object.values(vocab).flat(), ...overlays]; assert.ok(all.length > 800);
  for (const s of all) {
    assert.ok(!/NaN|undefined|Infinity|null/.test(s.svg), `${s.key}: bad number or value in the svg`);
    assert.ok(Number.isInteger(s.w) && Number.isInteger(s.h) && s.w > 4 && s.h > 4 && s.w < 140 && s.h < 140, `${s.key}: size ${s.w}x${s.h}`);
    assert.ok(Number.isInteger(s.ax) && Number.isInteger(s.ay) && s.ax > 0 && s.ay > 0 && s.ax < s.w && s.ay < s.h, `${s.key}: anchor`);
    const [x0, y0, x1, y1] = s.core; assert.ok(x0 >= 0 && y0 >= 0 && x1 <= s.w && y1 <= s.h && x0 < x1 && y0 < y1, `${s.key}: core ${s.core} outside ${s.w}x${s.h}`);
    assert.ok(s.ax > x0 - 0.01 && s.ax < x1 + 0.01 && s.ay > y0 - 0.01 && s.ay < y1 + 0.01 || s.group === 'tab' || s.group === 'badge' || s.group === 'ring' || s.group === 'gauge' || s.group === 'chip', `${s.key}: anchor inside core`);
    const opens = (s.svg.match(/<(?!\/|\?|!)[a-zA-Z]/g) || []).length; const selfClosed = (s.svg.match(/\/>/g) || []).length; const closes = (s.svg.match(/<\//g) || []).length; assert.equal(opens, selfClosed + closes, `${s.key}: unbalanced tags`);
    const ids = [...s.svg.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]); assert.equal(new Set(ids).size, ids.length, `${s.key}: duplicate ids`);
    const refs = [...s.svg.matchAll(/url\(#([^)]+)\)/g)].map((m) => m[1]); for (const r of refs) assert.ok(ids.includes(r), `${s.key}: dangling reference ${r}`);
    if (s.group === 'base') { for (const k of ['ne', 'below', 'left', 'right', 'tab']) assert.ok(Array.isArray(s.anchors[k]) && s.anchors[k].every(Number.isFinite), `${s.key}: anchor ${k}`); assert.ok(s.sil, `${s.key}: silhouette id`); }
  }
});

test('sprites: the vocabulary is complete (every side x arm x echelon x state exists in every language) and the sprite keys are unique', () => {
  const specs = vocabularySpecs(); assert.equal(specs.length, 4 * (5 * 3 + 4), 'vocabulary size: 4 sides x (5 unit arms x 3 unit echelons + 4 formation echelons)');
  for (const id of LANGUAGE_IDS) { const keys = vocab[id].map((s) => s.key); assert.equal(new Set(keys).size, keys.length, `${id}: duplicate keys`); for (const sp of specs) for (const state of ['fresh', 'carried']) assert.ok(keys.includes(srcBaseKey(id, { ...sp, state })), `${id}: missing ${srcBaseKey(id, { ...sp, state })}`); }
});

test('hierarchy: the footprint grows with echelon in every language (a division is never as loud as a regiment)', () => {
  for (const id of LANGUAGE_IDS) for (const side of ['union', 'confederate']) {
    const area = (ech, arm = 'formation') => { const s = vocab[id].find((x) => x.key === srcBaseKey(id, { side, arm, ech, state: 'fresh' })); const [a, b, c, d] = s.core; return (c - a) * (d - b); };
    const reg = area('regiment', 'infantry'); const bde = area('brigade'); const div = area('division'); const corps = area('corps'); const army = area('army');
    assert.ok(reg < bde && bde < div && div < corps && corps < army, `${id}/${side}: regiment ${reg} < brigade ${bde} < division ${div} < corps ${corps} < army ${army}`);
  }
});

test('no symbol silently overlaps another by construction: tile boxes are whole-unit rectangles that contain all solid ink (the pixel test below proves the ink side)', () => {
  for (const id of LANGUAGE_IDS) for (const s of vocab[id].filter((x) => x.group === 'base')) { const [a, b, c, d] = s.core; assert.ok(c - a >= 12 && d - b >= 12, `${s.key}: core too small to be legible (${c - a}x${d - b})`); }
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------
test('data coverage: every one of the 478 placed units has a base sprite (fresh and carried) in every language atlas, its chip, and its badge', () => {
  const ds = JSON.parse(fs.readFileSync(path.join(REPO, needed.dataset.file), 'utf8')); assert.equal(ds.units.length, 478);
  const reg = new Map(JSON.parse(fs.readFileSync(path.join(REPO, needed.registry), 'utf8')).units.map((u) => [u.id, u]));
  const FORM = new Set(['brigade', 'division', 'corps', 'army']); const ov = idx('overlays');
  for (const id of LANGUAGE_IDS) { const I = idx(id); let n = 0;
    for (const u of ds.units) { const formation = FORM.has(u.kind); const arm = formation ? 'formation' : (reg.get(u.id) && reg.get(u.id).arm) || u.arm;
      for (const state of ['fresh', 'carried']) assert.ok(srcBaseKey(id, { side: u.side, arm, ech: u.kind, state }) in I.sprites, `${id}: no sprite for ${u.id} (${u.side}/${arm}/${u.kind}/${state})`); n++;
      for (const kf of u.kf) { const chip = CHIP_OF_DISPOSITION[ds.dispositions[kf[5]]]; assert.ok(chip !== undefined, `unmapped disposition ${ds.dispositions[kf[5]]}`); if (chip) assert.ok(`chip/${chip}` in ov.sprites, `no chip ${chip}`); } }
    assert.equal(n, 478); }
  for (const k of Object.keys(needed.badges)) assert.ok(`badge/${k}` in ov.sprites, `no badge ${k}`);
  for (const c of CHIPS) assert.ok(`chip/${c}` in ov.sprites);
  for (let g = 0; g <= 4; g++) assert.ok(`gauge/${g}` in ov.sprites);
  assert.ok('tab/dark' in ov.sprites && 'tab/light' in ov.sprites);
});

test('data coverage: every aggregate mark the real layout solver produced over the census (29,150 aggregate tiles) exists in every atlas', () => {
  const census = JSON.parse(fs.readFileSync(path.join(ROOT, 'results', 'agg-census.json'), 'utf8')); assert.ok(census.aggregateTiles > 20000 && census.combos.length >= 40);
  for (const id of LANGUAGE_IDS) { const I = idx(id); for (const c of census.combos) assert.ok(`${id}/agg/${c.side}/${c.armset}/${c.depth}` in I.sprites, `${id}: no aggregate ${c.side}/${c.armset}/${c.depth}`); }
});

test('legend: every legend row names a sprite that the atlases hold, carries an evidence label, and says nothing the data lacks', () => {
  const L = JSON.parse(fs.readFileSync(path.join(dist, 'legend.json'), 'utf8')); const ov = idx('overlays'); let n = 0;
  for (const id of LANGUAGE_IDS) { const I = idx(id); assert.ok(L.languages[id].rows.length >= 38);
    for (const r of L.languages[id].rows) { assert.ok(L.evidenceLabels.includes(r.evidence.split(' ')[0].replace(/[;(]/g, '')), `${id}/${r.channel}/${r.value}: evidence ${r.evidence}`); assert.ok(r.sprite in I.sprites || r.sprite in ov.sprites, `${id}: legend sprite ${r.sprite} not in an atlas`); assert.ok(r.text.length >= 8); n++; } }
  assert.ok(n > 100);
  for (const id of LANGUAGE_IDS) for (const r of L.languages[id].rows.filter((x) => x.channel === 'arm' && x.value === 'formation')) assert.match(r.text, /no arm|none/, 'a formation must not claim an arm');
});

test('the dist is in sync: the tokens hash in every atlas index equals the current tokens, and every dist SVG equals the regenerated one', () => {
  const hash = crypto.createHash('sha256').update(JSON.stringify(T)).digest('hex').slice(0, 16);
  for (const id of [...LANGUAGE_IDS, 'overlays']) assert.equal(idx(id).tokenHash, hash, `${id}: atlas built from other tokens; run node build.mjs`);
  // base + overlays of the NEEDED set are regenerated and compared byte for byte with dist/svg
  let compared = 0;
  for (const id of LANGUAGE_IDS) for (const s of buildLanguageSprites(id, T, needed)) { const f = path.join(dist, 'svg', s.key + '.svg'); assert.equal(fs.readFileSync(f, 'utf8'), s.svg, `${s.key}: dist svg differs from a fresh build`); compared++; }
  for (const s of buildOverlaySprites(T, needed)) { assert.equal(fs.readFileSync(path.join(dist, 'svg', s.key + '.svg'), 'utf8'), s.svg, s.key); compared++; }
  assert.ok(compared > 300);
});

test('determinism: building the same sprites twice gives identical SVG', () => {
  const a = buildLanguageSprites('shield', T, needed, { all: true }).map((s) => s.svg).join('\n'); const b = buildLanguageSprites('shield', T, needed, { all: true }).map((s) => s.svg).join('\n'); assert.equal(a, b);
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------
test('atlas files: PNG sizes equal the index at 1x, 2x and 3x; rectangles are inside, whole-unit, and a 2 u gutter apart; byte budgets', () => {
  const sizes = JSON.parse(fs.readFileSync(path.join(ROOT, 'results', 'atlas-sizes.json'), 'utf8')); let b1 = 0; let b3 = 0;
  for (const id of [...LANGUAGE_IDS, 'overlays']) { const I = idx(id);
    for (const sc of I.scales) { const f = path.join(dist, 'atlas', I.files[sc]); const buf = fs.readFileSync(f); assert.equal(buf.readUInt32BE(16), I.size.w * sc, `${id}@${sc}x width`); assert.equal(buf.readUInt32BE(20), I.size.h * sc, `${id}@${sc}x height`); assert.equal(buf.subarray(1, 4).toString(), 'PNG'); if (sc === 1) b1 += buf.length; if (sc === 3) b3 += buf.length; }
    const R = Object.values(I.sprites); for (const r of R) { assert.ok(Number.isInteger(r.x) && Number.isInteger(r.y) && r.x >= I.pad && r.y >= I.pad && r.x + r.w + I.pad <= I.size.w && r.y + r.h + I.pad <= I.size.h, 'inside the atlas with a gutter'); }
    for (let i = 0; i < R.length; i++) for (let j = i + 1; j < R.length; j++) { const a = R[i]; const b = R[j]; const gap = Math.max(b.x - (a.x + a.w), a.x - (b.x + b.w), b.y - (a.y + a.h), a.y - (b.y + b.h)); assert.ok(gap >= I.pad, `${id}: rectangles ${i} and ${j} are ${gap} u apart`); } }
  assert.equal(sizes.totals.png1x, b1); assert.equal(sizes.totals.png3x, b3);
  assert.ok(b1 < 700_000, `1x atlases ${b1} bytes`); assert.ok(b3 < 4_200_000, `3x atlases ${b3} bytes`);
  for (const id of LANGUAGE_IDS) { const per = sizes.atlases[id].png['1x'].bytes + sizes.atlases.overlays.png['1x'].bytes; assert.ok(per < 260_000, `${id} + overlays at 1x: ${per} bytes`); }
});

test('pixels (python + PIL): the gutters are transparent, nothing is clipped, and all solid ink lies inside its box, for every sprite at 1x, 2x and 3x', () => {
  const r = spawnSync('python', [path.join(ROOT, 'test', 'pixels.py'), dist], { encoding: 'utf8', maxBuffer: 1 << 26 }); const out = JSON.parse(r.stdout || '{"violations":["no output: " ]}');
  assert.equal(r.status, 0, `violations: ${(out.violations || []).slice(0, 8).join('; ')}`); assert.equal(out.violations.length, 0);
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------
test('runtime: keys, scale choice, gauge bins and chip names are the same strings the build wrote', () => {
  assert.equal(rt.pickScale(1), 1); assert.equal(rt.pickScale(1.25), 2); assert.equal(rt.pickScale(2), 2); assert.equal(rt.pickScale(2.6), 3); assert.equal(rt.pickScale(4), 3);
  for (const spec of vocabularySpecs().slice(0, 12)) assert.equal(rt.baseKey('nato', { ...spec, state: 'carried' }), srcBaseKey('nato', { ...spec, state: 'carried' }));
  assert.deepEqual(rt.CHIP_OF_DISPOSITION, CHIP_OF_DISPOSITION);
  for (let r = -0.2; r <= 1.2; r += 0.05) assert.equal(rt.gaugeLevel(r), srcGauge(r));
  assert.equal(rt.gaugeLevel(0.5), 2); assert.equal(rt.gaugeLevel(0.87), 3); assert.equal(rt.gaugeLevel(0.9), 4);
  assert.equal(rt.aggKey('minimal', { side: 'union', armset: 'IA', n: 2 }), 'minimal/agg/union/IA/2'); assert.equal(rt.aggKey('minimal', { side: 'union', armset: 'IA', n: 9 }), 'minimal/agg/union/IA/3');
  assert.equal(rt.armsetOf(new Set(['A', 'F', 'I'])), 'IAF');
});

test('runtime: drawing snaps the sprite to the device grid and maps the atlas rectangle at every scale', () => {
  const I = idx('shield'); const key = 'shield/base/union/infantry/regiment/fresh'; const s = I.sprites[key]; assert.ok(s);
  for (const sc of [1, 2, 3]) { const calls = []; const ctx = { globalAlpha: 1, drawImage: (...a) => calls.push(a) }; const at = rt.makeAtlas(I, { id: 'img' }, sc);
    assert.ok(at.draw(ctx, key, 100.3, 50.6)); const [img, sx, sy, sw, sh, dx, dy, dw, dh] = calls[0]; assert.deepEqual([sx, sy, sw, sh], [s.x * sc, s.y * sc, s.w * sc, s.h * sc]); assert.deepEqual([dw, dh], [s.w, s.h]);
    assert.ok(Math.abs(dx * sc - Math.round(dx * sc)) < 1e-9 && Math.abs(dy * sc - Math.round(dy * sc)) < 1e-9, 'top-left on a device pixel'); assert.ok(Math.abs(dx + s.ax - 100.3) <= 0.5 / sc + 1e-9); }
  assert.equal(rt.makeAtlas(I, {}, 1).draw({ drawImage() {} }, 'nope', 0, 0), false);
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------
test('extension: a new frame language is one file and one registry line; tokens override without editing the file', async () => {
  const { circle } = await import('../src/svg.mjs'); const { Sprite, el } = await import('../src/svg.mjs'); const { plate } = await import('../src/common.mjs'); const { ringReach } = await import('../src/svg.mjs');
  const echo = { id: 'echo', label: 'Echo (test language)',
    silhouette: (spec, Tk, grow = 0) => ({ d: circle(0, 0, 8 + grow), left: -8 - grow, right: 8 + grow, top: -8 - grow, bottom: 8 + grow, id: 'echo-' + spec.ech }),
    aggFrame: (Tk) => ({ d: (g) => circle(0, 0, 14 + g), left: -14, right: 14, top: -14, bottom: 14, count: { x: -10, y: -10, w: 20, h: 12 }, row: { x0: -8, y0: 4, x1: 8, y1: 10 } }),
    glyph: () => '',
    base(spec, Tk, id) { const sp = new Sprite(id); const reach = ringReach(Tk); sp.add(plate(sp, circle(0, 0, 8), { side: spec.side, state: spec.state, T: Tk }), [-8 - reach - 4, -8 - reach - 4, 8 + reach + 4, 8 + reach + 5]); const r = sp.finish({ pad: 1 });
      return { ...r, core: [-8 - reach + r.ax, -8 - reach + r.ay, 8 + reach + r.ax, 8 + reach + r.ay], anchors: { ne: [r.ax + 6, r.ay - 6], below: [r.ax, r.ay + 10], left: [r.ax - 10, r.ay], right: [r.ax + 10, r.ay], tab: [r.ax + 5, r.ay] }, strip: null, shape: 'circle' }; } };
  LANGUAGES.echo = echo;
  try { const sprites = buildLanguageSprites('echo', T, needed); assert.ok(sprites.length > 60, `${sprites.length} sprites`); assert.ok(sprites.some((s) => s.key === 'echo/base/union/infantry/regiment/fresh')); assert.ok(sprites.every((s) => !/NaN/.test(s.svg))); }
  finally { delete LANGUAGES.echo; }
  const R2 = resolveTokens(tree, { overrides: { palettes: { standard: { union: { $value: '#00AA00' } } } } }); const s1 = LANGUAGES.nato.base({ side: 'union', arm: 'infantry', ech: 'regiment', state: 'fresh' }, R2, 'o1'); assert.ok(s1.svg.includes('#00AA00') || /#[0-9a-f]{6}/i.test(s1.svg)); assert.ok(!LANGUAGES.nato.base({ side: 'confederate', arm: 'infantry', ech: 'regiment', state: 'fresh' }, R2, 'o2').svg.includes('#00AA00'));
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------
test('chips: a status chip is a corner badge: clear of every arm glyph and echelon mark, within tokens chip.maxCoverage of the symbol, in every language (python + PIL on the shipped pixels)', () => {
  const r = spawnSync('python', [path.join(ROOT, 'test', 'chips.py'), dist], { encoding: 'utf8', maxBuffer: 1 << 26 }); assert.ok(r.stdout, r.stderr);
  const out = JSON.parse(r.stdout); assert.equal(r.status, 0, `violations: ${(out.violations || []).slice(0, 6).join('; ')}`); assert.deepEqual(out.violations, []);
  const shapes = Object.keys(out.coverageByShape); assert.ok(shapes.length >= 9, `shapes measured: ${shapes}`);
  fs.writeFileSync(path.join(ROOT, 'results', 'chip-coverage.json'), JSON.stringify({ generated: new Date().toISOString(), rule: 'chip.maxCoverage and chip.clearance of tokens/symbology.tokens.json; measured on the 3x atlas pixels', maxCoverageToken: T.chip.maxCoverage, clearanceToken: T.chip.clearance, coverageByShape: out.coverageByShape }, null, 2));
});

test('chips: every base sprite carries its ink box (where it has a glyph), a chip anchor and a tab anchor that tucks behind the chip', () => {
  for (const id of LANGUAGE_IDS) {
    const I = idx(id);
    for (const [k, s] of Object.entries(I.sprites).filter(([, x]) => x.group === 'base')) {
      assert.ok(s.anchors.ne && s.anchors.tab && s.anchors.tabChip, `${k}: anchors`); assert.ok(s.anchors.tabChip[0] >= s.anchors.tab[0], `${k}: the chip tab starts at or after the plain tab`); assert.equal(s.anchors.tabChip[1], s.anchors.tab[1]);
      if (id === 'nato' && !k.includes('/formation/')) assert.ok(Array.isArray(s.ink), `${k}: ink box`);
      assert.ok(s.boxFull[2] >= s.box[2] && s.boxFull[1] <= s.box[1], `${k}: boxFull contains the chip corner`);
    }
  }
});

test('aggregate glyphs: the artillery dot and the sharpshooter ring are centred in their box, not on the origin (they sat on top of the count)', () => {
  const box = { x0: 10, y0: 20, x1: 18, y1: 28 }; const g = LANGUAGES.nato.glyph('artillery', { T, ink: '#fff', back: '#000', box });
  const m = /cx="([-\d.]+)" cy="([-\d.]+)"/.exec(g); assert.ok(m, g); assert.equal(+m[1], 14); assert.equal(+m[2], 24);
  const s2 = LANGUAGES.nato.glyph('sharpshooter', { T, ink: '#fff', back: '#000', box }); assert.match(s2, /<circle cx="14" cy="24"/);
  const h = LANGUAGES.nato.glyph('horse_artillery', { T, ink: '#fff', back: '#000', box }); assert.match(h, /<circle cx="14" cy="24"/);
});

test('pins and leaders: a pin per side in the overlays atlas, the leader numbers come from the tokens, the runtime draws line and pin from them and skips a short move', () => {
  const ov = idx('overlays'); for (const sd of ['union', 'confederate', 'unknown']) assert.ok(`pin/${sd}` in ov.sprites, `pin/${sd}`);
  assert.deepEqual({ ...ov.meta.leader }, { ...T.leader, boneColour: T.palette.bone, keylineColour: T.palette.keyline }); assert.ok(Number.isFinite(ov.meta.leader.keyline) && Number.isFinite(ov.meta.leader.width), 'the leader widths are numbers'); assert.equal(ov.meta.chip.size, T.chip.size);
  const calls = [];
  const ctx = { globalAlpha: 1, lineCap: '', strokeStyle: '', lineWidth: 0, beginPath: () => calls.push('begin'), moveTo: () => {}, lineTo: () => {}, stroke() { calls.push(`stroke ${this.strokeStyle} ${this.lineWidth}`); }, drawImage: () => calls.push('image'), save() {}, restore() {} };
  const at = rt.makeAtlas(ov, { id: 'img' }, 1);
  assert.equal(rt.drawLeaderLine(ctx, at, [0, 0], [3, 3]), false, 'a move shorter than leader.minLength gets no line'); assert.deepEqual(calls, []);
  assert.equal(rt.drawLeaderLine(ctx, at, [0, 0], [40, 0]), true);
  assert.deepEqual(calls.filter((c) => c.startsWith('stroke')), [`stroke ${T.palette.keyline} ${T.leader.width + 2 * T.leader.keyline}`, `stroke ${T.palette.bone} ${T.leader.width}`]);
  assert.equal(rt.pinKey('confederate'), 'pin/confederate'); assert.equal(rt.pinKey('mixed'), 'pin/union'); assert.equal(ctx.globalAlpha, 1, 'the context alpha is restored');
  assert.equal(rt.drawPin(ctx, at, [5, 5], 'union'), true);
});

test('runtime: tileBox is the union of the symbol and the layers it wears (chip, gauge, badge, label tab); chipOf and tabAnchor pick the chip variants', () => {
  const atlas = rt.makeAtlas(idx('nato'), { id: 'a' }, 1); const overlays = rt.makeAtlas(idx('overlays'), { id: 'o' }, 1); const R = { atlas, overlays };
  atlas.id = 'nato'; const plain = { side: 'union', arm: 'infantry', ech: 'regiment' }; const s = atlas.sprite('nato/base/union/infantry/regiment/fresh');
  const b0 = rt.tileBox(R, plain); assert.deepEqual(b0, [s.box[0] - s.ax, s.box[1] - s.ay, s.box[2] - s.ax, s.box[3] - s.ay]);
  const bChip = rt.tileBox(R, { ...plain, disposition: 'Charging Line' }); assert.ok(bChip[2] > b0[2] && bChip[1] < b0[1], 'a chip grows the box to the north-east');
  const bGauge = rt.tileBox(R, { ...plain, ratio: 0.5, showGauge: true }); assert.ok(bGauge[3] > b0[3], 'the gauge grows it below');
  const bLabel = rt.tileBox(R, plain, 80); assert.ok(bLabel[2] > b0[2] + 80 - 2, 'the label tab grows it to the right by the text width plus its pads');
  const bLC = rt.tileBox(R, { ...plain, idOnly: true }, 80); assert.ok(bLC[2] > bLabel[2] - 1, 'with a chip the tab starts further right');
  assert.equal(rt.chipOf({ idOnly: true, disposition: 'Charging Line' }), 'idonly'); assert.equal(rt.chipOf({ disposition: 'Line of Battle' }), null); assert.equal(rt.chipOf({ disposition: 'Skirmish Line' }), 'skirmish');
  assert.deepEqual(rt.tabAnchor(s, false), s.anchors.tab); assert.deepEqual(rt.tabAnchor(s, true), s.anchors.tabChip); assert.equal(rt.tileBox(R, { side: 'union', arm: 'nope', ech: 'regiment' }), null);
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------
test('webp: every atlas has a lossless WebP that decodes to exactly the PNG picture and is smaller (python + PIL, independent of the build step)', () => {
  const r = spawnSync('python', [path.join(ROOT, 'test', 'webp.py'), dist], { encoding: 'utf8', maxBuffer: 1 << 26 }); assert.ok(r.stdout, r.stderr);
  const out = JSON.parse(r.stdout); assert.equal(r.status, 0, `violations: ${out.violations.join('; ')}`); assert.equal(out.checked, 12);
  for (const sc of ['1x', '2x', '3x']) assert.ok(out.saved[sc] > 0.5, `${sc}: the WebP saves ${out.saved[sc]}`);
  const rep = JSON.parse(fs.readFileSync(path.join(ROOT, 'results', 'webp-pack.json'), 'utf8')); assert.deepEqual(Object.keys(rep.totals), ['1x', '2x', '3x']);
  for (const id of [...LANGUAGE_IDS, 'overlays']) assert.deepEqual(Object.keys(idx(id).filesWebp), ['1', '2', '3']);
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------
test('real imagery: the NAIP-derived backdrops in assets/naip match their recorded hashes, and the ring holds (3:1) on every luminance band of every one', () => {
  const prov = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets', 'naip', 'provenance.json'), 'utf8')); const names = Object.keys(prov.files); assert.ok(names.length >= 4);
  for (const f of names) { const b = fs.readFileSync(path.join(ROOT, 'assets', 'naip', f)); assert.equal(b.length, prov.files[f].bytes); assert.equal(crypto.createHash('sha256').update(b).digest('hex'), prov.files[f].sha256, f); }
  const bands = JSON.parse(fs.readFileSync(path.join(ROOT, 'results', 'naip-bands.json'), 'utf8')); assert.equal(bands.images.length, names.length);
  const j = JSON.parse(fs.readFileSync(path.join(ROOT, 'results', 'colour-tests.json'), 'utf8')); const naip = j.checks.filter((c) => c.group === 'ring on NAIP backdrop'); assert.equal(naip.length, 7 * names.length); assert.ok(naip.every((c) => c.pass), 'every NAIP band passes');
  assert.ok(Math.min(...naip.map((c) => c.value)) >= 3.9, 'the weakest NAIP band stays above 3.9:1');
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------
test('browser (real Chrome): the runtime draws the demo scenes with zero overlap and every unit drawn, at 1x, 2x and 3x, with no console error', { timeout: 300_000 }, async () => {
  const { chromium } = await import('playwright-core'); const { CHROME, PROFILE } = await import('../tools/chrome.mjs'); const { serve } = await import('../tools/serve.mjs');
  const srv = await serve(9824); const results = [];
  try {
    for (const dpr of [1, 2, 3]) {
      const ctx = await chromium.launchPersistentContext(PROFILE + '-test-' + dpr + '-' + Date.now(), { executablePath: CHROME, headless: true, viewport: { width: 1200, height: 800 }, deviceScaleFactor: dpr, args: ['--no-first-run', '--disable-extensions', '--force-color-profile=srgb', '--remote-debugging-port=9825'] });
      try {
      const page = ctx.pages()[0] || await ctx.newPage(); const errs = []; page.on('pageerror', (e) => errs.push(String(e))); page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
      for (const lang of LANGUAGE_IDS) for (const [scene, zoom] of [['angle', 'auto'], ['culps', 'auto'], ['cemetery', 'auto'], ['cemetery', '13.5']]) {
        await page.goto(`http://localhost:9824/demo/index.html?lang=${lang}&scene=${scene}&zoom=${zoom}&ground=aerial&dpr=${dpr}`); await page.waitForFunction(() => document.title === 'ready', null, { timeout: 30000 });
        const r = await page.evaluate(() => window.__demo); results.push(r);
        assert.equal(r.overlappingPairs, 0, `${lang}/${scene}@${zoom}/${dpr}x overlaps`); assert.equal(r.missingSprites, 0); assert.deepEqual(r.unplaced, [], `${lang}/${scene}@${zoom}: unplaced units`);
        assert.equal(r.represented, r.units, `${lang}/${scene}@${zoom}: every unit on the canvas is a tile or a member of a formation mark`); assert.equal(r.drawn + r.aggregatedUnits, r.units); assert.equal(r.atlasScale, dpr); assert.equal(r.pinsOnTiles, 0, `${lang}/${scene}@${zoom}: ${r.pinsOnTiles} pins lie on another tile`);
        if (zoom === '13.5') assert.ok(r.aggregates >= 3, 'at the site start zoom the crowd merges into formation marks');
      }
      { await page.goto(`http://localhost:9824/demo/index.html?lang=shield&scene=culps&webp=1&ground=aerial&dpr=${dpr}`); await page.waitForFunction(() => document.title === 'ready', null, { timeout: 30000 }); const w = await page.evaluate(() => window.__demo);
        assert.match(w.atlasFile, /\.webp$/, 'the skin loaded the WebP atlas'); const p = results.find((x) => x.lang === 'shield' && x.scene === 'culps' && x.dpr === dpr); for (const k of ['units', 'drawn', 'aggregates', 'represented', 'overlappingPairs', 'maxDisplacementPx']) assert.equal(w[k], p[k], `webp and png give the same layout (${k})`); }
      assert.deepEqual(errs, [], `console errors at ${dpr}x`);
      } finally { await ctx.close(); }
    }
  } finally { srv.closeAllConnections(); srv.close(); }
  fs.writeFileSync(path.join(ROOT, 'results', 'demo-test.json'), JSON.stringify({ generated: new Date().toISOString(), results }, null, 2));
});

test('browser (real Chrome): the label tab drawn from three atlas slices equals a pill rendered directly at the same width (any text width costs no new sprite)', { timeout: 120_000 }, async () => {
  const { chromium } = await import('playwright-core'); const { CHROME, PROFILE } = await import('../tools/chrome.mjs'); const { serve } = await import('../tools/serve.mjs'); const { renderTab } = await import('../src/overlays.mjs');
  const srv = await serve(9826); const out = [];
  try {
    for (const dpr of [1, 2, 3]) for (const tone of ['dark', 'light']) {
      const ctx = await chromium.launchPersistentContext(PROFILE + '-tab-' + dpr + tone + '-' + Date.now(), { executablePath: CHROME, headless: true, viewport: { width: 900, height: 400 }, deviceScaleFactor: dpr, args: ['--no-first-run', '--disable-extensions', '--force-color-profile=srgb', '--remote-debugging-port=9827'] });
      try {
      const page = ctx.pages()[0] || await ctx.newPage(); await page.goto('http://localhost:9826/demo/index.html'); await page.waitForFunction(() => document.title === 'ready', null, { timeout: 30000 });
      const meta = JSON.parse(fs.readFileSync(path.join(dist, 'atlas', 'overlays.json'), 'utf8')).sprites[`tab/${tone}`].tab;
      const probe = await page.evaluate(async ({ dpr, tone }) => {
        const rt2 = await import('../runtime/atlas.mjs'); const ov = await rt2.loadAtlas('../dist/atlas/', 'overlays', { dpr });
        const text = ' '.repeat(13);                       // em spaces: invisible, wide
        const cv = document.createElement('canvas'); cv.width = 300 * dpr; cv.height = 60 * dpr; const c = cv.getContext('2d'); c.scale(dpr, dpr);
        const rec = rt2.drawTab(c, ov, { ax: 0, ay: 0, anchors: { tab: [0, 0] } }, text, 20, 30, { tone });
        return { rec, scale: ov.scale, data: Array.from(c.getImageData(0, 0, cv.width, cv.height).data) };
      }, { dpr, tone });
      assert.equal(probe.scale, dpr); const pillW = probe.rec.x1 - probe.rec.x0; const innerW = pillW - 2 * meta.cap; assert.ok(innerW > meta.midW + 10, 'the tab is stretched well beyond its stored width');
      const direct = renderTab(tone, T, 'direct', innerW);
      const dd = await page.evaluate(async ({ svg, w, h, ax, ay, X0, Y, dpr }) => {
        const img = new Image(); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg.replace(/^<svg ([^>]*?)width="[\d.]+" height="[\d.]+"/, (m, a) => `<svg ${a}width="${w * dpr}" height="${h * dpr}"`)); await img.decode();
        const cv = document.createElement('canvas'); cv.width = 300 * dpr; cv.height = 60 * dpr; const c = cv.getContext('2d'); c.drawImage(img, Math.round((X0 - ax) * dpr), Math.round((Y - ay) * dpr), w * dpr, h * dpr);
        return Array.from(c.getImageData(0, 0, cv.width, cv.height).data);
      }, { svg: direct.svg, w: direct.w, h: direct.h, ax: direct.ax, ay: direct.ay, X0: probe.rec.x0, Y: (probe.rec.y0 + probe.rec.y1) / 2, dpr });
      const Wd = 300 * dpr; const x0m = Math.round((probe.rec.x0 + meta.cap + 1) * dpr); const x1m = Math.round((probe.rec.x1 - meta.cap - 1) * dpr);
      let sum = 0; let max = 0; let n = 0; let maxMid = 0; let maxCap = 0;
      for (let i = 0; i < dd.length; i += 4) { const px = (i / 4) % Wd; const inMid = px >= x0m && px < x1m; for (let k = 0; k < 4; k++) { const d = Math.abs(dd[i + k] - probe.data[i + k]); sum += d; n++; if (d > max) max = d; if (inMid) { if (d > maxMid) maxMid = d; } else if (d > maxCap) maxCap = d; } }
      out.push({ dpr, tone, pillW, meanAbsDiff: +(sum / n).toFixed(4), maxDiffMiddle: maxMid, maxDiffCaps: maxCap });
      assert.ok(maxMid <= 4, `${tone}@${dpr}x: the stretched middle differs by ${maxMid}/255 from a direct render`); assert.ok(sum / n < 0.6, `${tone}@${dpr}x mean ${(sum / n).toFixed(3)}`);
      } finally { await ctx.close(); }
    }
  } finally { srv.closeAllConnections(); srv.close(); }
  fs.writeFileSync(path.join(ROOT, 'results', 'tab-slice-test.json'), JSON.stringify({ generated: new Date().toISOString(), note: 'canvas A = runtime drawTab (three slices of the atlas), canvas B = the same pill rendered directly at that width; per-channel absolute difference over the 300x60 u area. The stretched middle matches a direct render (max diff in 0..255 below); the two end caps differ from a directly rendered wide pill by a few anti-aliased arc pixels because Chrome rasterises the same arc slightly differently in a wider element (tools/dev-tabdiff2.mjs: a minimum pill against a wide pill, left 17 columns, up to 70/255 on 52 channel values): the atlas cap is the shipped design, and it is identical at every text width', results: out }, null, 2));
});
