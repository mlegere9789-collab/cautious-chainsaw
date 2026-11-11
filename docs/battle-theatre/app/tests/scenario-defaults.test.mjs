// The delegated defaults of the 47 source conflicts, the control that switches to the plan's values, the renderer default. Node only, no browser.
//   node --test docs/battle-theatre/app/tests/scenario-defaults.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path';
import { BT } from './node-world.mjs';
import { loadConflicts, DEFAULT_SCENARIO, scenarioIsDefault, scenarioLabel } from '../src/data.mjs';
import { DELEGATED_KEY, PDF_KEY, DELEGATED_NOTE, defaultChoices, pdfChoices, setChoice, resetToDelegated, switchToPdf, scenarioKind, optionLabel, currentKey } from '../src/scenario-defaults.mjs';
import { chooseApi } from '../src/config.mjs';
import { build } from '../../../../tools/bt/build_conflict_defaults.mjs';

const J = f => JSON.parse(fs.readFileSync(path.join(BT, f), 'utf8'));
const SRC = J('GOVERNANCE/decisions/conflict_defaults.json'), conf = await loadConflicts(), reg = conf.filter(c => c.kind === 'register');
const norm = s => String(s).toLowerCase().replace(/[^a-z0-9:]+/g, ' ').trim();

test('the shipped defaults file is the delegated decision file, built (no hand edit)', () => {
  assert.deepEqual(J('app/data/conflict-defaults.json'), build(SRC));
  assert.equal(Object.keys(J('app/data/conflict-defaults.json').conflicts).length, 47);
});
test('all 47 register conflicts carry a delegated default with its tier and the label text', () => {
  assert.equal(reg.length, 47);
  for (const c of reg) {
    const d = SRC.conflicts[c.id]; assert.ok(c.delegated, c.id); assert.equal(c.delegated.label, d.default_label); assert.equal(c.delegated.tier, d.tier); assert.match(c.delegated.note, /Default chosen under delegated authority/); assert.match(c.delegated.note, /reversible by the owner/);
    assert.ok(['documented', 'inferred', 'plausible-procedural', 'open gap'].includes(c.delegated.tier));
    assert.equal(c.options[0].key, DELEGATED_KEY); assert.equal(c.options[0].label, d.default_label); assert.match(optionLabel(c, c.options[0]), new RegExp(`default, ${d.tier}`));
  }
  assert.match(DELEGATED_NOTE, /delegated authority, reversible by the owner/);
});
test('every other value stays selectable: the plan\'s value, each printed value, each value added from the record, and "show every value"', () => {
  for (const c of reg) {
    const d = SRC.conflicts[c.id], keys = c.options.map(o => o.key), labels = new Set(c.options.flatMap(o => [norm(o.label), norm(o.text)]));
    assert.ok(keys.includes(PDF_KEY) && keys.includes('range'), c.id); assert.equal(c.options.find(o => o.key === PDF_KEY).label, 'PDF recommended, pending owner');
    for (const s of d.scenarios) { if (s.id === d.default_scenario_id) continue; if (/^PDF recommended default/i.test(s.label)) { assert.ok(c.options.find(o => o.key === PDF_KEY).text.length > 0, c.id + ' plan value text'); continue; } assert.ok(labels.has(norm(s.label)), `${c.id}: scenario "${s.label}" is selectable`); }
    assert.equal(new Set(keys).size, keys.length, c.id + ' unique keys');
  }
});
test('the theatre opens on the delegated defaults, not on the PDF values', () => {
  const sc = DEFAULT_SCENARIO(conf); assert.deepEqual(sc.choices, defaultChoices(conf)); assert.equal(Object.keys(sc.choices).length, 47); assert.ok(Object.values(sc.choices).every(v => v === DELEGATED_KEY));
  assert.ok(scenarioIsDefault(sc, conf)); assert.match(scenarioLabel(sc, conf), /Delegated defaults \(reversible by the owner\)/); assert.equal(scenarioKind(sc, conf).kind, 'delegated');
  for (const c of conf.filter(c => c.kind === 'weather')) assert.equal(currentKey(sc, c), PDF_KEY, 'weather conflicts have no delegated default and stay as printed');
});
test('the control "switch to the PDF\'s recommended value" sets all 47 and the switch back restores the defaults; one choice is a custom view', () => {
  const sc = DEFAULT_SCENARIO(conf); switchToPdf(sc, conf);
  assert.deepEqual(sc.choices, pdfChoices(conf)); assert.equal(Object.keys(sc.choices).length, 47); assert.ok(Object.values(sc.choices).every(v => v === PDF_KEY)); assert.equal(scenarioKind(sc, conf).kind, 'pdf'); assert.match(scenarioLabel(sc, conf), /PDF recommended values/); assert.equal(sc.id, 'pdf-recommended');
  resetToDelegated(sc, conf); assert.ok(scenarioIsDefault(sc, conf)); assert.equal(sc.id, 'delegated-defaults');
  const c4 = conf.find(c => c.id === 'C-004'); setChoice(sc, conf, c4, 'v0'); assert.equal(sc.choices['C-004'], 'v0'); assert.deepEqual(scenarioKind(sc, conf), { kind: 'custom', dDiff: 1, pDiff: 47 }); assert.match(scenarioLabel(sc, conf), /Custom: 1 choice differs/);
  setChoice(sc, conf, c4, PDF_KEY); assert.equal(sc.choices['C-004'], PDF_KEY, 'the plan\'s value is stored explicitly');
  const wx = conf.find(c => c.id === 'CF-WIND-SPEED'); setChoice(sc, conf, wx, 'opt0'); assert.equal(sc.choices['CF-WIND-SPEED'], 'opt0'); setChoice(sc, conf, wx, PDF_KEY); assert.ok(!('CF-WIND-SPEED' in sc.choices));
});
test('without the defaults file the view falls back to the plan\'s values and says so', async () => {
  const keep = globalThis.fetch; globalThis.fetch = async (u, ...a) => /conflict-defaults\.json/.test(String(u)) ? { ok: false, status: 404, json: async () => ({}) } : keep(u, ...a);
  const w = console.warn; console.warn = () => {};
  try { const c2 = await loadConflicts(); assert.ok(c2.every(c => !c.delegated)); const sc = DEFAULT_SCENARIO(c2); assert.deepEqual(sc.choices, {}); assert.equal(scenarioLabel(sc, c2), 'PDF recommended, pending owner'); } finally { globalThis.fetch = keep; console.warn = w; }
});
test('the delegated option text carries the time the default names (it drives the arrival of the linked units)', () => {
  const t = id => conf.find(c => c.id === id).options[0].text;
  assert.match(t('C-004'), /06:30/); assert.match(t('C-003'), /07:00/); assert.match(t('C-021'), /Jul 3/);
});
test('renderer default: WebGL2 (it draws weather and effects) unless the address says ?api=webgpu', () => {
  assert.equal(chooseApi(''), 'webgl2'); assert.equal(chooseApi('?history=stub'), 'webgl2'); assert.equal(chooseApi('?api=webgl2'), 'webgl2'); assert.equal(chooseApi('?api=webgpu'), 'webgpu'); assert.equal(chooseApi('?x=1&api=webgpu'), 'webgpu'); assert.equal(chooseApi('?api=auto'), 'auto'); assert.equal(chooseApi('?api=bogus'), 'webgl2'); assert.equal(chooseApi(undefined), 'webgl2');
});
