// test/tuning.test.mjs - the design tokens: one JSON file, one schema, validated everywhere; plus the registries and the static checks that keep them honest.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createTuning, validateDefs, settingsSchema, SETTINGS_FORMAT } from '../src/tuning/tuning.mjs';
import { validate, unsupportedKeywords } from '../src/tuning/schema.mjs';
import { createKernel, Registry } from '../src/kernel/registry.mjs';
import { registerBuiltins } from '../src/builtins.mjs';
import { loadDocs, PROTO } from '../src/headless.mjs';

const { tokens } = loadDocs();
const D = (id) => tokens.tokens.find((x) => x.id === id).default;      // FORK: the defaults are the Quiet Cartographer's (dMaxPx 64, gapPx 1): read, not hard-coded

test('tokens.json is structurally valid: unique ids, defaults inside their ranges, every token documented with an evidence label', () => {
  assert.deepEqual(validateDefs(tokens), []);
  assert.ok(tokens.tokens.length >= 50);
  for (const t of tokens.tokens) { assert.ok(t.doc.length > 20, t.id + ' has a real doc'); assert.ok(t.evidence, t.id + ' has an evidence label'); }
  const bad = JSON.parse(JSON.stringify(tokens)); bad.tokens[0].default = 1e9; assert.ok(validateDefs(bad).some((e) => /outside/.test(e)));
  const dup = JSON.parse(JSON.stringify(tokens)); dup.tokens.push({ ...dup.tokens[0] }); assert.ok(validateDefs(dup).some((e) => /duplicate/.test(e)));
});

test('the committed tokens.schema.json is exactly the schema generated from tokens.json, uses only keywords the validator implements, and accepts the defaults', () => {
  const gen = settingsSchema(tokens); const file = JSON.parse(fs.readFileSync(path.join(PROTO, 'tokens', 'tokens.schema.json'), 'utf8'));
  assert.deepEqual(file, gen, 'run: node docs/pitch/anim/prototype/build.mjs (it regenerates tokens.schema.json)');
  assert.deepEqual(unsupportedKeywords(gen), []);
  const t = createTuning(tokens); assert.deepEqual(validate(gen, t.export()), []);
  assert.ok(validate(gen, { format: SETTINGS_FORMAT, tokens: { 'layout.dMaxPx': 9999 } }).length > 0, 'an out-of-range value fails the schema');
  assert.ok(validate(gen, { format: SETTINGS_FORMAT, tokens: { 'nope.nope': 1 } }).length > 0, 'an unknown token fails the schema');
});

test('tuning: get throws on a typo, set validates type, range and options, subscribers fire (exact, prefix, all), reset restores', () => {
  const t = createTuning(tokens);
  assert.throws(() => t.get('layout.dMaxPixels'), /unknown token/); assert.throws(() => t.set('layout.dMaxPx', 1000), RangeError); assert.throws(() => t.set('layout.dMaxPx', '40'), RangeError);
  assert.throws(() => t.set('layout.visibility', 'bogus'), RangeError); assert.throws(() => t.set('layout.pinProtect', 1), RangeError); assert.throws(() => t.set('layout.dMaxPx', NaN), RangeError);
  const seen = []; const off1 = t.on('layout.dMaxPx', (v, id, old) => seen.push(['exact', v, old])); t.on('layout.*', (v, id) => seen.push(['prefix', id])); t.on('*', (v, id) => seen.push(['all', id]));
  assert.equal(t.set('layout.dMaxPx', 40), true); assert.equal(t.set('layout.dMaxPx', 40), false, 'no change, no event');
  assert.deepEqual(seen, [['exact', 40, D('layout.dMaxPx')], ['prefix', 'layout.dMaxPx'], ['all', 'layout.dMaxPx']]);
  off1(); seen.length = 0; t.set('layout.dMaxPx', 30); assert.equal(seen.filter((s) => s[0] === 'exact').length, 0, 'unsubscribed');
  assert.deepEqual(t.diff(), { 'layout.dMaxPx': 30 }); assert.equal(t.reset(), 1); assert.equal(t.get('layout.dMaxPx'), D('layout.dMaxPx')); assert.deepEqual(t.diff(), {});
});

test('export / import round-trips; import reports applied, rejected and unknown ids and never throws on bad data', () => {
  const a = createTuning(tokens); a.set('layout.dMaxPx', 36); a.set('motion.mode', 'spring'); a.set('backdrop.places', false);
  const json = JSON.parse(JSON.stringify(a.export())); assert.equal(json.format, SETTINGS_FORMAT);
  const b = createTuning(tokens); const r = b.import(json); assert.ok(r.applied.includes('layout.dMaxPx') && r.rejected.length === 0 && r.unknown.length === 0); assert.deepEqual(b.values(), a.values());
  const c = createTuning(tokens); const r2 = c.import({ format: SETTINGS_FORMAT, tokens: { 'layout.dMaxPx': 12, 'layout.gapPx': 99, 'who.knows': 1, 'motion.reduced': 'maybe' } });
  assert.deepEqual(r2.applied, ['layout.dMaxPx']); assert.deepEqual(r2.unknown, ['who.knows']); assert.equal(r2.rejected.length, 2); assert.equal(c.get('layout.dMaxPx'), 12); assert.equal(c.get('layout.gapPx'), D('layout.gapPx'), 'a rejected value changes nothing');
  assert.equal(c.import(null).rejected.length, 1); assert.equal(c.import({ format: 'other/1', tokens: {} }).rejected.length, 1);
});

test('persistence is optional and failure-proof: a throwing storage never breaks a set', () => {
  const store = new Map(); const ok = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) };
  const t = createTuning(tokens, { storage: ok }); t.set('layout.dMaxPx', 20); const t2 = createTuning(tokens, { storage: ok }); t2.load(); assert.equal(t2.get('layout.dMaxPx'), 20);
  const bad = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } }; const t3 = createTuning(tokens, { storage: bad }); assert.doesNotThrow(() => t3.set('layout.dMaxPx', 21)); assert.equal(t3.load(), null);
  store.set('battle-studio.settings.v1', '{not json'); const t4 = createTuning(tokens, { storage: ok }); assert.doesNotThrow(() => t4.load()); assert.equal(t4.get('layout.dMaxPx'), D('layout.dMaxPx'));
});

// ---- static checks over the source ------------------------------------------------------------------------------------------------------------------
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
test('every token read in src/ is defined in tokens.json, and every defined token is read somewhere (no dead dials, no typos)', () => {
  const defined = new Set(tokens.tokens.map((t) => t.id)); const used = new Set(); const unknown = [];
  const re = /\b(?:tok|tuning\.get|tuning\.set|t\.get|t\.set|reader)\(\s*'([a-z][a-zA-Z0-9]*(?:\.[a-zA-Z0-9]+)+)'/g;
  const re2 = /tuning\.on\(\s*'([a-z][a-zA-Z0-9]*\.(?:\*|[a-zA-Z0-9]+))'/g;
  for (const f of walk(path.join(PROTO, 'src')).filter((x) => x.endsWith('.mjs'))) {
    const s = fs.readFileSync(f, 'utf8');
    for (const m of s.matchAll(re)) { used.add(m[1]); if (!defined.has(m[1])) unknown.push(`${path.relative(PROTO, f)}: ${m[1]}`); }
    for (const m of s.matchAll(re2)) { if (m[1].endsWith('.*')) { if (![...defined].some((d) => d.startsWith(m[1].slice(0, -1)))) unknown.push(`${path.relative(PROTO, f)}: ${m[1]}`); } else { used.add(m[1]); if (!defined.has(m[1])) unknown.push(`${path.relative(PROTO, f)}: ${m[1]}`); } }
  }
  assert.deepEqual(unknown, [], 'tokens read in code but not defined');
  const dead = [...defined].filter((d) => !used.has(d));
  assert.deepEqual(dead, [], 'tokens defined but never read in src/ (delete them or read them)');
});

test('registry tokens name registries that exist; select tokens\' options are unique', () => {
  const k = createKernel(); for (const t of tokens.tokens) { if (t.type === 'registry') assert.ok(k[t.registry] instanceof Registry, t.id + ' -> ' + t.registry); if (t.type === 'select') assert.equal(new Set(t.options.map((o) => o.value)).size, t.options.length); }
});

// ---- registries -----------------------------------------------------------------------------------------------------------------------------------------
test('registries: ids are validated, members are required, duplicates need replace, events fire; skins, popups and fx start EMPTY, builtins fill interp, layout, motion', () => {
  const k = registerBuiltins(createKernel());
  assert.deepEqual(k.skins.ids(), []); assert.deepEqual(k.popups.ids(), []); assert.deepEqual(k.fx.ids(), []); assert.deepEqual(k.backdrops.ids().sort(), ['ink', 'paper']);
  // the production reproduction (before/after) registers hidden modules next to the designs: they are listed here so nothing is added unnoticed
  assert.deepEqual(k.interp.ids().sort(), ['chord-smooth', 'linear', 'pchip', 'production-step']); assert.deepEqual(k.layout.ids().sort(), ['certified', 'production', 'raw']); assert.deepEqual(k.motion.ids().sort(), ['dynamics', 'production', 'snap', 'spring']);
  assert.deepEqual([...k.interp.list(), ...k.layout.list(), ...k.motion.list()].filter((m) => m.hidden).map((m) => m.id).sort(), ['production', 'production', 'production-step'], 'only the reproduction is hidden from the Tuning Studio');
  const ev = []; k.skins.subscribe((e) => ev.push(e.type + ':' + e.id));
  assert.throws(() => k.skins.register('Bad Id', { draw: {} }), /bad module id/); assert.throws(() => k.skins.register('x', {}), /missing required member "draw"/);
  k.skins.register('mine', { draw: { tile() {} }, label: 'Mine' }); assert.throws(() => k.skins.register('mine', { draw: {} }), /already registered/); k.skins.register('mine', { draw: { tile() {} } }, { replace: true });
  assert.equal(k.skins.get('mine').label, 'mine'); assert.throws(() => k.skins.get('nope'), /no module/); k.skins.unregister('mine'); assert.deepEqual(ev, ['register:mine', 'register:mine', 'unregister:mine']);
  const e = Object.isFrozen(k.interp.get('pchip')); assert.ok(e, 'registered definitions are frozen');
  const k2 = createKernel(); assert.notEqual(k.skins, k2.skins, 'one kernel per engine: no leakage between tests');
});
