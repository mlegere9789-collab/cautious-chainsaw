// test/premium.test.mjs - the tests of the Strategy Premium skin, in node (no browser): the token file and its generated module, the footprint function, the names that unfold, the honest crowd names, the ink of
// every kind of mark against its footprint on a recording context, and the recorded results of the browser tools (legibility, colour vision, ink on pixels, the zero-overlap sweeps).
//   node --test docs/pitch/anim2/d2-strategy-premium/studio/test/premium.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { PREMIUM, nameOf, fontSpecs } from '../src/skins/premium.mjs';
import { PREMIUM_TOKENS } from '../src/skins/premium.tokens.gen.mjs';
import { createTextModel, FONT_SPECS } from '../src/layout/text.mjs';
import { makeSpec } from '../src/layout/spec.mjs';
import { aggregateName } from '../src/layout/tiles.mjs';
import { checkSkin } from '../src/skins/contract.mjs';
import { contrast, mixHex } from '../src/skins/kit.mjs';
import { ECH_LEVEL } from '../src/skins/semantics.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url)); const STUDIO = path.resolve(HERE, '..'); const D2 = path.resolve(STUDIO, '..');
const dataset = JSON.parse(fs.readFileSync(path.join(STUDIO, 'data', 'dataset.json'), 'utf8')); const textTable = JSON.parse(fs.readFileSync(path.join(STUDIO, 'data', 'text-widths.json'), 'utf8'));
const engineTokens = JSON.parse(fs.readFileSync(path.join(STUDIO, 'tokens', 'tokens.json'), 'utf8')); const tokDefault = new Map(engineTokens.tokens.map((t) => [t.id, t.default])); const tok = (id) => tokDefault.get(id);
const text = createTextModel(textTable, 1.04, 'table'); const premium = PREMIUM[0]; const spec = () => makeSpec(premium.footprint, tok, text, premium.layout);
const readResult = (name) => { const p = path.join(D2, 'results', name); return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null; };
const units = dataset.units;

test('the generated token module is in step with design/premium.tokens.json, and every variant overrides only known tokens', () => {
  execFileSync(process.execPath, [path.join(D2, 'tools', 'make-skin-tokens.mjs'), '--check'], { stdio: 'pipe' });
  assert.ok(PREMIUM.length === 3 && PREMIUM.map((s) => s.id).sort().join() === 'premium,premium/contrast,premium/cvd');
});

test('every token is documented, typed and read by the skin code (no dead dials)', () => {
  const src = ['premium.mjs', 'premium-art.mjs', 'kit.mjs'].map((f) => fs.readFileSync(path.join(STUDIO, 'src', 'skins', f), 'utf8')).join('\n'); const dead = [];
  for (const [name, , doc] of PREMIUM_TOKENS) {
    assert.ok(typeof doc === 'string' && doc.length > 12, name + ' needs a real description');
    const dynamic = /^geo\.h[0-4]$/.test(name) || /^color\.(union|csa|unk)\.(hi|lo|strip|edge)$/.test(name);
    if (dynamic) { assert.ok(src.includes("'geo.h' + ") || src.includes('`color.${sk}.'), 'dynamic reader for ' + name); continue; }
    if (!src.includes(`'${name}'`)) dead.push(name);
  }
  assert.deepEqual(dead, [], 'tokens defined but never read');
});

test('type: two sizes and one numeral style; nothing below 11 px', () => {
  const sizes = new Set(Object.values(fontSpecs(premium.skin.P)).map((f) => /(\d+)px/.exec(f)[1])); assert.deepEqual([...sizes].sort(), ['11', '13']);
  for (const f of Object.values(FONT_SPECS)) assert.ok(+/(\d+)px/.exec(f)[1] >= 11);
  assert.equal(PREMIUM_TOKENS.find((r) => r[0] === 'type.unitSize')[3].min, 11, 'the design floor is 11 px');
});

test('the footprint: scale tells the echelon, the name unfolds with zoom, and no unit has a missing or absurd box', () => {
  const sp = spec(); const lay = premium.layout; const byKind = {};
  for (const u of units) {
    const a = lay.leaf(u, sp, { z: 14 }); const b = lay.leaf(u, sp, { z: 17 }); const c = lay.leaf(u, sp, { z: 14, force: true });
    for (const v of [a, b, c]) assert.ok(Number.isFinite(v.w) && Number.isFinite(v.h) && v.w > 30 && v.w < 330 && v.h >= 26 && v.h < 70, `${u.id}: ${JSON.stringify(v)}`);
    assert.ok(b.w >= a.w && b.h >= a.h && c.w >= a.w && c.h >= a.h, u.id + ' never shrinks when its name unfolds');
    if (nameOf(u)) assert.ok(b.h > a.h, u.id + ' unfolds a second line'); else assert.equal(b.h, a.h, u.id + ' has no name to unfold');
    (byKind[u.kind] || (byKind[u.kind] = [])).push(a.h);
  }
  const h = (k) => Math.max(...byKind[k]); assert.ok(h('regiment') < h('battalion') && h('battalion') < h('brigade') && h('brigade') < h('division') && h('division') < h('corps'), 'a bigger formation is a bigger mark: ' + JSON.stringify(Object.fromEntries(Object.keys(byKind).map((k) => [k, h(k)]))));
  assert.equal(new Set(byKind.regiment).size, 1, 'every regiment mark has the same height');
});

test('names that unfold are never cut inside a word, never carry the dataset\'s truncation, and never repeat the code', () => {
  let named = 0; let cut = 0;
  for (const u of units) {
    const n = nameOf(u); if (!n) continue; named++; assert.ok(n.length <= 44, `${u.id}: ${n}`); assert.ok(!/\.\.\./.test(n), n); assert.notEqual(n, u.short);
    assert.ok(!/^\s|\s$/.test(n)); if (/…$/.test(n)) { cut++; const full = String(u.designation || u.label).replace(/\s*\([^)]*\)\s*$/, ''); const head = n.slice(0, -1); assert.ok(full.replace(/\b(First|Second|Third|Fourth|Fifth|Sixth|Seventh|Eighth|Ninth|Tenth|Eleventh|Twelfth)\b/g, (m) => ({ First: '1st', Second: '2nd', Third: '3rd', Fourth: '4th', Fifth: '5th', Sixth: '6th', Seventh: '7th', Eighth: '8th', Ninth: '9th', Tenth: '10th', Eleventh: '11th', Twelfth: '12th' }[m])).startsWith(head), 'a prefix of the full name: ' + n); }
  }
  assert.ok(named > 350, 'most units have a name to unfold: ' + named); assert.ok(cut <= 5, 'a name is cut only when it must be: ' + cut);
  assert.equal(nameOf({ designation: 'Washington Artillery of New Orleans (Eshleman\'s Battalion)', label: 'Washington Artillery of…', short: 'I-4' }), 'Washington Artillery of New Orleans');
  assert.equal(nameOf({ designation: 'First Brigade, Third Division, Second Corps', label: 'x', short: 'II/3/1' }), '1st Brigade, 3rd Division, 2nd Corps');
  assert.equal(nameOf({ designation: null, label: 'CAV/2/1', short: 'CAV/2/1' }), null);
});

test('crowd marks are named for what they are (PITCH-REVIEW fix 2): no "Contact", no "lead +k", counts are bare numbers', () => {
  const nodes = new Map([['U-II-2', { kind: 'division' }], ['U-II-2-1', { kind: 'brigade' }], ['A-U', { kind: 'army' }], ['ROOT', { kind: 'root' }]]); const all = { nodes, units: new Map() };
  const lead = { short: '14 VT' };
  assert.deepEqual(aggregateName(all, 'ROOT', 'mixed', { union: 3, confederate: 4, unknown: 0 }, lead, 7, true), { short: 'Both sides', badge: '7', kind: 'both' });
  assert.equal(aggregateName(all, 'U-II-2-1', 'union', { union: 5 }, lead, 5, true).kind, 'brigade'); assert.equal(aggregateName(all, 'A-U', 'union', { union: 5 }, lead, 5, true).short, 'Union');
  assert.equal(aggregateName(all, 'ROOT', 'confederate', { confederate: 2 }, lead, 2, true).short, 'Confederate'); assert.equal(aggregateName(all, 'ROOT', 'unknown', { unknown: 2 }, lead, 2, true).short, 'Contested');
  const old = aggregateName(all, 'ROOT', 'mixed', { union: 1, confederate: 1 }, lead, 2, false); assert.equal(old.short, 'Contact', 'the first prototype\'s names stay available for the reference skin');
  for (const sd of ['union', 'confederate', 'unknown', 'mixed']) assert.ok(!/[×+]/.test(aggregateName(all, 'ROOT', sd, { union: sd === 'mixed' ? 1 : 0, confederate: sd === 'mixed' ? 1 : sd === 'confederate' ? 2 : 0, unknown: sd === 'unknown' ? 2 : 0 }, lead, 12, true).badge));
});

test('contrast on token values: the type colour on the cloth (mid-cloth, a first check; tools/legibility.mjs measures rendered pixels)', () => {
  for (const sk of PREMIUM) { const P = sk.skin.P; for (const side of ['union', 'csa']) assert.ok(contrast(P['color.ink'], mixHex(P[`color.${side}.hi`], P[`color.${side}.lo`], 0.5)) >= 4.5, `${sk.id} ${side}`); assert.ok(contrast(P['color.inkOnGold'], mixHex(P['color.unk.hi'], P['color.unk.lo'], 0.5)) >= 4.5, sk.id + ' gold'); }
});

test('ink: every kind of mark, in every state, paints inside its footprint (recording context)', () => {
  const sp = spec(); const lay = premium.layout; const D = premium.draw; const problems = []; const mk = (o) => ({ key: o.key, kind: 'leaf', ids: [o.key], n: 1, x: 0, y: 0, ax: 0, ay: 0, scale: 1, opacity: 1, solid: true, life: 'live', entering: false, displaced: false, ratio: 0.8, strength: 100, ageTicks: 0, ageMin: 0, ageMax: 0, moving: false, members: null, label: null, ...o });
  const tiles = [];
  for (const side of ['union', 'confederate', 'unknown']) for (const u0 of [units.find((u) => u.kind === 'regiment' && u.side === side), units.find((u) => u.kind === 'battery' && u.side === side), units.find((u) => u.kind === 'brigade' && u.side === side && u.designation), units.find((u) => u.kind === 'division' && u.side === side), units.find((u) => u.kind === 'corps' && u.side === side)].filter(Boolean)) for (const sel of [false, true]) for (const age of [0, 300]) for (const z of [13.5, 15, 16.5]) {
    const b = lay.leaf(u0, sp, { z }); tiles.push(mk({ key: `${u0.id}|${sel}|${age}|${z}`, unit: u0, side: u0.side, arm: ECH_LEVEL[u0.kind] >= 2 ? u0.arm : u0.arm, short: u0.short, w: b.w, h: b.h, selected: sel, ageTicks: age, ageMin: age, ageMax: age, disposition: 'Line of Battle' }));
  }
  for (const [nm, side, nS] of [['II/2/1', 'union', { union: 5 }], ['Union', 'union', { union: 12 }], ['Confederate', 'confederate', { confederate: 8 }], ['Both sides', 'mixed', { union: 7, confederate: 7 }], ['Contested', 'unknown', { unknown: 3 }]]) for (const n of [2, 5, 100]) { const b = lay.agg({ short: nm, badge: String(n) }, sp, { n }); tiles.push(mk({ key: `agg|${nm}|${n}`, kind: 'agg', side, nSides: nS, n, arm: 'mixed', short: nm, badge: String(n), nameKind: 'group', w: b.w, h: b.h, unit: null })); }
  for (const t of tiles) { const env = { dpr: 1, zoom: 15, timeMs: 0, tok, spec: sp }; problems.push(...checkSkin(premium, sp, [t], { width: (font, s) => text.width(font, s), safety: 1.04 }, 0.6).map((p) => p.slice(0, 160))); void env; }
  assert.deepEqual(problems.slice(0, 5), [], `${problems.length} problems over ${tiles.length} tiles`);
  // a negative control: the same skin with one extra 8 px stroke outside the box must be caught by the same check, or the check above proves nothing
  const leaky = { draw: { tile(c, t, env) { premium.draw.tile(c, t, env); c.fillRect(t.w / 2 - 2, -2, 8, 4); } } }; const caught = checkSkin(leaky, sp, tiles.slice(0, 40), { width: (font, s) => text.width(font, s), safety: 1.04 }, 0.6);
  assert.equal(caught.length, 40, 'the check sees every mark that leaves its box: ' + caught.length + ' of 40');
});

for (const [file, check] of [
  ['legibility.json', (r) => { assert.equal(r.below, 0, 'type below 4.5:1 on rendered pixels'); assert.ok(r.rows.length >= 48); }],
  ['colour-tests.json', (r) => { assert.equal(r.below, 0, 'a pair of sides closer than the bar under a simulated deficiency'); assert.ok(r.mathCheck.sharmaWuDalal2005MaxError < 0.01); }],
  ['ink.json', (r) => { assert.equal(r.violations, 0, 'ink outside a footprint'); assert.ok(r.paintedTotal > 10000); }],
  ['sweep-desktop.json', (r) => { assert.deepEqual(r.totals, { brute: 0, eng: 0, pins: 0, unrep: 0, tight: 0 }); assert.ok(r.samples >= 90); }],
  ['sweep-phone.json', (r) => { assert.deepEqual(r.totals, { brute: 0, eng: 0, pins: 0, unrep: 0, tight: 0 }); assert.ok(r.samples >= 60); }],
]) test(`recorded result of the browser tool: results/${file}`, (t) => { const r = readResult(file); if (!r) { t.skip('not run yet: node tools/' + file.replace('.json', '.mjs')); return; } check(r); });
