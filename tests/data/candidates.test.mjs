import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { generateCandidates } from '../../tools/data/facts.mjs';
import { buildContext } from '../../tools/data/lib/context.mjs';
import { buildCrosswalk } from '../../tools/data/lib/registry.mjs';
import { REPO_ROOT } from '../../tools/data/lib/util.mjs';

const ctx = buildContext({});
const out = generateCandidates(ctx);
const j = (n) => JSON.parse(out[`candidates/${n}.json`]);

test('committed candidates equal a fresh generation', () => {
  for (const [name, text] of Object.entries(out)) assert.equal(fs.readFileSync(path.join(REPO_ROOT, 'data-src', 'build', name), 'utf8'), text, name);
});

test('notable_intensity: generated from the OOB, no raw ids in display text, the Confederate legacy claim is refuted', () => {
  const n = j('notable_intensity');
  const by = Object.fromEntries(n.items.map((i) => [i.id, i]));
  assert.equal(by['NI-001'].unit_id, 'U-1MN');
  assert.equal(by['NI-001'].value, 85.5);
  assert.equal(by['NI-001'].note, '224 casualties of 262 engaged');
  assert.equal(by['NI-002'].unit_id, 'C-8VA');
  assert.equal(by['NI-004'].unit_id, 'C-26NC');
  assert.equal(by['NI-004'].value, 588);
  for (const i of n.items) { assert.ok(!/\b[UC]-[A-Z0-9]/.test(`${i.display_name} ${i.value_label} ${i.note}`), i.id); assert.ok(i.display_name && i.note); }
  const conf = n.legacy_claims_checked.find((c) => c.side === 'confederate');
  assert.equal(conf.agrees, false);
  assert.equal(n.legacy_claims_checked.find((c) => c.side === 'union').agrees, true);
});

test('adjudication register: 7 open items, every item names what the data says', () => {
  const a = j('adjudication_register');
  assert.equal(a.items.length, 7);
  for (const i of a.items) { assert.ok(i.claim && i.data_says && i.needs && i.status, i.id); }
  assert.equal(a.items.find((i) => i.id === 'ADJ-05').claim.includes('51,000'), true);
  assert.match(a.items.find((i) => i.id === 'ADJ-06').data_says, /2,614/);
});

test('Confederate cavalry commanders: 22 records, 12 printed in the OR, 10 unknown; McClanahan is a battery in Imboden\'s command', () => {
  const c = j('confederate_cavalry_commanders');
  assert.deepEqual(c.counts, { regiments_listed: 22, with_printed_commander: 12, unknown: 10 });
  assert.equal(c.regiments.find((r) => r.regiment_id === 'C-2VA-CAV').commander_printed_in_or, 'Col. T. T. Munford');
  assert.equal(c.regiments.find((r) => r.regiment_id === 'C-1SC-CAV').status, 'unknown');
  assert.ok(c.regiments.every((r) => r.commander_in_site_data === null), 'the site has no commander for any of the 22');
  assert.ok(c.findings.some((f) => f.id === 'C-McClanahan-ART' && /not a duplicate/.test(f.text)));
  assert.ok(c.printed_in_or_but_absent_from_site_oob.length >= 5);
});

test('registry carries the OR-verified findings for C-61VA and C-McClanahan-ART', () => {
  const reg = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'data-src', 'build', 'unit_registry.json'), 'utf8'));
  const u = reg.units.find((x) => x.id === 'C-61VA');
  assert.ok(u.flags.some((f) => f.code === 'commander_or_mismatch' && /Groner/.test(f.text) && f.or_verified));
  const m = reg.units.find((x) => x.id === 'C-McClanahan-ART');
  assert.ok(m.flags.some((f) => f.code === 'battery_in_imbodens_command' && f.or_verified));
});

test('unit_aliases: 95 crosswalk ids split into aliases and unresolved; only high-confidence rows resolve; sides only change by the wrong-prefix rule', () => {
  const a = JSON.parse(out['unit_aliases.json']);
  assert.equal(a.counts.aliases + a.counts.unresolved, 95);
  // `resolves` is judged on the crosswalk's PER-ROW confidence, not on the alias record's own field (which would make this a tautology)
  const byAlias = new Map(buildCrosswalk(ctx).entries.map((e) => [e.alias_id, e]));
  for (const x of a.aliases) {
    assert.equal(x.resolves, byAlias.get(x.alias).row_confidence.every((r) => r.confidence === 'high'), x.alias);
    assert.equal(x.status, x.resolves ? 'proposed_auto' : 'needs_historian', x.alias);
    if (x.side_change) assert.ok(['wrong_side_prefix'].includes(x.rule) || x.resolves === false, `${x.alias}: a side change outside the wrong-prefix rule must not resolve`);
  }
  assert.equal(a.aliases.filter((x) => x.rule === 'wrong_side_prefix' && x.resolves).length, 10);
  assert.ok(a.unresolved.every((u) => u.reason || u.candidates.length || u.confidence === 'none' || u.rule));
});

test('rollups: reported vs derived per formation; nothing is claimed exact unless it is', () => {
  const r = JSON.parse(out['candidates/rollups.json']);
  assert.equal(r.rows.length, r.counts.records);
  for (const x of r.rows) {
    assert.equal(x.reported_strength - x.derived_strength, x.unlisted_strength);
    if (x.exact) assert.ok(x.unlisted_strength === 0 && x.unlisted_casualties === 0 && x.children_missing === 0);
    assert.equal(x.cause, null);
  }
  assert.equal(r.army_level.union.corps_reported_casualties, 22803);
  assert.ok(r.rows.find((x) => x.id === 'U-VI-1').children_missing === 3, 'VI Corps division 1 lists 3 brigades that do not exist');
});
