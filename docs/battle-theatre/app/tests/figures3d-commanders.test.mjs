// OA04 / R04 / EG-FIG-0004: named commanders are addressable, marked as having no individual model, and built from the generic officer dress at their rank. Node only.
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { commanderRegistry, commanderManifest, DAWES, COMMANDER_CARD } from '../src/figures3d/commanders.mjs';
import { createFigureSystem, unpackInstance } from '../src/figures3d/index.mjs';
import { Kit } from '../src/history/manifest.mjs';
const here = path.dirname(fileURLToPath(import.meta.url)), APP = path.join(here, '..'), BT = path.join(APP, '..');
const J = f => JSON.parse(fs.readFileSync(path.join(BT, 'kit', f), 'utf8')), specs = J('kit_specs.json');
const kit = new Kit({ specs, weapons: J('weapons.json'), artillery: J('artillery_batteries.json'), cavalry: J('cavalry_units.json') });
const reg = commanderRegistry(specs), sys = createFigureSystem();
test('registry: the 8 kit named records, the named open-gap commanders and Dawes; unique ids; every entry says no individual model and is a registered gap', () => {
  assert.equal(reg.filter(r => r.kind === 'kit_named_record').length, 8); assert.ok(reg.some(r => r.who === 'Rufus R. Dawes')); assert.ok(reg.some(r => /Longstreet/.test(r.who)) && reg.some(r => /Chamberlain/.test(r.who)));
  assert.equal(new Set(reg.map(r => r.id)).size, reg.length);
  for (const r of reg) { assert.equal(r.individual_model, 'none'); assert.equal(r.gap, true); assert.equal(r.register, 'EG-FIG-0004'); assert.equal(r.card, COMMANDER_CARD); }
});
test('tiers are never promoted: a weak-source kit record stays at its effective tier; named leads are gap; only Lee\'s horse and Dawes\'s rank/command are documented, and Dawes\'s dress is a gap', () => {
  for (const r of reg.filter(r => r.kind === 'kit_named_record')) { const src = specs.named_individuals.records.find(x => x.id === r.id); assert.equal(r.tier, src.tier); if (r.weak_source) assert.notEqual(r.tier, 'documented'); }
  for (const r of reg.filter(r => r.kind === 'kit_open_gap_name')) assert.equal(r.tier, 'gap');
  assert.equal(DAWES.rank_tier, 'documented'); assert.equal(DAWES.dress_tier, 'gap'); assert.ok(DAWES.not_supported.includes('dress')); assert.deepEqual(DAWES.source_keys, ['OR27-1-R035']);
});
test('every commander builds an officer figure at rank from the generic officer dress of a present kit unit; the instance carries the officer flag; the figure is deterministic', () => {
  const unitOf = r => r.kit_unit ?? (r.army === 'union' ? 'US.6WI' : 'CS.3AR');
  for (const r of reg) { const m = commanderManifest(kit, r, { unitId: unitOf(r) }), m2 = commanderManifest(kit, r, { unitId: unitOf(r) }); assert.deepEqual(m, m2); assert.equal(m.rank, r.rank); assert.equal(m.role, 'officer'); assert.equal(m.commander.individual_model, 'none');
    const rec = sys.instance(m), u = unpackInstance(rec.words); assert.ok(u.flags & 8, r.who + ' officer flag'); assert.equal(rec.variant.rank, r.rank); }
  assert.throws(() => commanderManifest(kit, reg[0], { unitId: 'US.6WI', rank: 'private' }), /not an officer rank/);
});
test('lieutenant to general all resolve (R04); distinct commanders in one unit are distinct men (identity from the soldier id, no Math.random)', () => {
  for (const rank of ['lieutenant', 'captain', 'field officer', 'general']) { const r = sys.instance(commanderManifest(kit, DAWES, { rank })); assert.equal(r.variant.rank, rank); }
  const a = unpackInstance(sys.instance(commanderManifest(kit, reg[0], { unitId: 'CS.3AR' })).words), b = unpackInstance(sys.instance(commanderManifest(kit, reg[1], { unitId: 'CS.3AR' })).words);
  assert.notDeepEqual([a.head, a.skin, a.hair, a.stature], [b.head, b.skin, b.hair, b.stature]);
});
test('commanders.json on disk is what the generator writes; the TIERS entry F-COMMANDERS keeps the register link', () => {
  const D = JSON.parse(fs.readFileSync(path.join(APP, 'data/figures3d/commanders.json'), 'utf8')); assert.equal(D.schema, 'figures3d-commanders-1'); assert.deepEqual(D.commanders, JSON.parse(JSON.stringify(reg)));
});
test('ANV battle flag star count is a selectable scenario (PDF p.70: 12; NPS: 13), the default is the PENDING OWNER value, and the two renders differ only by the centre star', async () => {
  const F = await import('../src/figures3d/flags.mjs'); assert.deepEqual(Object.keys(F.ANV_STAR_SCENARIOS).sort(), ['nps', 'pdf_p70']); assert.equal(F.ANV_STAR_SCENARIOS.pdf_p70.stars, 12); assert.equal(F.ANV_STAR_SCENARIOS.nps.stars, 13);
  assert.ok(F.ANV_STAR_SCENARIOS.nps.source.includes('NPS') && F.ANV_STAR_SCENARIOS.pdf_p70.source.includes('not read'));
  const a = F.flagPattern('anv_battle', 'intact', 256, 192, { anvScenario: 'pdf_p70' }), b = F.flagPattern('anv_battle', 'intact', 256, 192, { anvScenario: 'nps' }); let diff = 0; for (let i = 0; i < a.rgba.length; i++) if (a.rgba[i] !== b.rgba[i]) diff++;
  assert.ok(diff > 0 && diff < a.rgba.length * 0.01, 'differing bytes ' + diff);
});
