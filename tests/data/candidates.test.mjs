import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { generateCandidates } from '../../tools/data/facts.mjs';
import { buildContext } from '../../tools/data/lib/context.mjs';
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
