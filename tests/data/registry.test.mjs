// Unit registry, ID crosswalk, collisions, VI Corps candidates, unit index and its acceptance queries (WP-DATA-06/07/20).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { buildContext } from '../../tools/data/lib/context.mjs';
import { generate } from '../../tools/data/unit_registry.mjs';
import { searchIndex } from '../../tools/data/lib/unit_index.mjs';
import { sortKeyOf } from '../../tools/data/lib/orgchain.mjs';
import { REPO_ROOT } from '../../tools/data/lib/util.mjs';
import { naturalCompare } from '../../tools/data/lib/util.mjs';

const ctx = buildContext({ bundlePath: null, distDir: null });
const files = await generate({ ctx });
const registry = JSON.parse(files['unit_registry.json']);
const crosswalk = JSON.parse(files['id_crosswalk.json']);
const collisions = JSON.parse(files['id_collisions.json']);
const vi = JSON.parse(files['candidates/vi_corps_brigades.json']);
const index = JSON.parse(files['unit_index.json']);
const byId = new Map(registry.units.map((u) => [u.id, u]));

test('census: 569 units = 465 regiments (273 U + 192 C) + 104 batteries; alias stub excluded', () => {
  assert.equal(registry.census.total, 569);
  assert.equal(registry.census.regiments, 465);
  assert.equal(registry.census.batteries, 104);
  assert.deepEqual(registry.census.regiments_by_side, { union: 273, confederate: 192 });
  assert.deepEqual(registry.census.alias_records_excluded, ['U-14BK']);
  assert.equal(new Set(registry.units.map((u) => u.id)).size, 569);
  assert.equal(registry.census.side_prefix_mismatches, 0);
});

test('every unit has the required registry fields', () => {
  for (const u of registry.units) {
    for (const k of ['id', 'kind', 'side', 'path', 'commanders', 'placed', 'own_keyframes', 'oob_record', 'rights', 'aliases', 'flags', 'needs_historian', 'sort_key']) assert.ok(k in u, `${u.id} lacks ${k}`);
    assert.ok(['union', 'confederate'].includes(u.side), u.id);
    assert.equal(u.oob_record, true);
    assert.equal(u.rights.tier, 'legacy');
    assert.ok(registry.rights_files[u.rights.file], u.id);
  }
  assert.equal(registry.units.filter((u) => u.kind === 'regiment' && u.own_keyframes > 0).length, 217);
  assert.equal(registry.units.filter((u) => u.kind === 'battery' && u.own_keyframes > 0).length, 38);
});

test('C-McClanahan-ART is a battery filed as a regiment and is flagged; U-14BK is a hidden alias of U-84NY (decision pending)', () => {
  const mc = byId.get('C-McClanahan-ART');
  assert.equal(mc.kind, 'battery');
  assert.ok(mc.flags.some((f) => f.code === 'battery_filed_as_regiment'));
  const ny = byId.get('U-84NY');
  const al = ny.aliases.find((a) => a.id === 'U-14BK');
  assert.ok(al && al.hidden && al.status === 'decision_pending' && al.names.includes('14th Brooklyn'));
});

test('OR-verified findings: U-11PA/U-11PA-B are one regiment with a transfer; U-107NY is mislabelled (107th PA)', () => {
  for (const id of ['U-11PA', 'U-11PA-B']) {
    const f = byId.get(id).flags.find((x) => x.code === 'assignment_transfer');
    assert.ok(f && f.or_verified && /Transferred, in afternoon of July 1/.test(f.text));
  }
  const f = byId.get('U-107NY').flags.find((x) => x.code === 'mislabelled_regiment');
  assert.ok(f && f.or_verified && /107th PENNSYLVANIA/.test(f.text));
  assert.equal(byId.get('U-107NY').needs_historian, true);
});

test('crosswalk: covers exactly the 95 unresolved placed ids (216 rows) and never breaks the hard rules', () => {
  assert.equal(crosswalk.counts.unresolved_ids, 95);
  assert.equal(crosswalk.counts.rows, 216);
  assert.equal(crosswalk.entries.length, 95);
  for (const e of crosswalk.entries) {
    assert.deepEqual(e.hard_rule_warnings, [], `${e.alias_id}: ${e.hard_rule_warnings}`);
    if (e.confidence === 'high') assert.equal(e.needs_historian, false, e.alias_id);
    if (e.confidence !== 'high') assert.equal(e.needs_historian, true, e.alias_id);
    if (e.proposed && !e.new_record) {
      const t = ctx.oob.records.get(e.proposed);
      assert.ok(t, `${e.alias_id} -> ${e.proposed} must exist`);
      if (e.shape === 'regiment' || e.shape === 'brigade_prefixed_regiment') assert.equal(t.kind, 'regiment', e.alias_id);
      if (e.shape === 'brigade') assert.ok(['brigade', 'division'].includes(t.kind), e.alias_id);
    }
  }
});

test('crosswalk: the side of an id is only changed by the wrong-prefix rule, and that rule finds exactly the 10 known regiments', () => {
  const flips = crosswalk.entries.filter((e) => e.proposed && !e.new_record && ctx.oob.records.get(e.proposed).side !== (e.alias_id.startsWith('U-') ? 'union' : 'confederate'));
  assert.ok(flips.length > 0);
  for (const e of flips) assert.equal(e.rule, 'wrong_side_prefix', e.alias_id);
  assert.deepEqual(crosswalk.wrong_side_prefix.map((w) => w.id).sort(), ['U-11NC', 'U-15AL', 'U-1TX', 'U-26NC', 'U-44AL', 'U-47NC', 'U-48AL', 'U-4TX', 'U-52NC', 'U-5TX']);
  assert.ok(crosswalk.wrong_side_prefix.every((w) => w.twin_placed === true));
});

test('crosswalk: known corrections are the ones the chapter states', () => {
  const p = (id) => crosswalk.entries.find((e) => e.alias_id === id)?.proposed;
  assert.equal(p('U-8IL'), 'U-8IL-CAV');
  assert.equal(p('U-12IL'), 'U-12IL-CAV');
  assert.equal(p('C-2LA'), 'C-2LA-T');
  assert.equal(p('C-38GA'), 'C-38GA-E');
  assert.equal(p('C-II-4'), 'C-II-2');
  assert.equal(p('C-III-4'), 'C-III-3');
  assert.equal(p('C-II-4-1'), 'C-II-2-4');
  assert.equal(p('C-I-5-1'), 'C-III-1-1');
  assert.equal(p('C-I-5-2'), 'C-III-1-2');
  assert.equal(p('U-I-2-3'), 'U-I-2-1');
  assert.equal(p('U-I-2-4'), 'U-I-1-2');
  // never guessed: the 107th Pennsylvania placement has several same-number candidates
  assert.equal(p('U-107PA'), null);
  assert.equal(crosswalk.entries.find((e) => e.alias_id === 'U-107PA').confidence, 'none');
});

test('collisions: Vincent, Webb, Archer, Gordon and Cutler rows are re-keyed to the formations their notes name', () => {
  const t = (unit) => collisions.entries.find((e) => e.unit_id === unit)?.proposed_rekey;
  assert.ok(t('U-V-3-1').includes('U-V-1-3'));
  assert.ok(t('U-II-2-3').includes('U-II-2-2'));
  assert.ok(t('C-III-2-1').includes('C-III-2-3'));
  assert.ok(t('C-II-1-1').includes('C-II-1-3'));
  assert.ok(t('U-I-2-1').includes('U-I-1-2'));
  assert.ok(collisions.entries.every((e) => e.needs_historian === true));
});

test('VI Corps candidates: 8 brigades, regiments derived from the 36 referencing regiments, paired to the OR by overlap', () => {
  assert.equal(vi.count, 8);
  assert.equal(vi.brigades.reduce((a, b) => a + b.regiment_ids.length, 0), 36);
  const b = (id) => vi.brigades.find((x) => x.brigade_id === id);
  // the site numbering differs from the OR order for the Third Division (found by overlap, not assumed)
  assert.match(b('U-VI-3-2').or_pairing.or_position, /Third Brigade/);
  assert.match(b('U-VI-3-3').or_pairing.or_position, /Second Brigade/);
  assert.equal(b('U-VI-3-2').numbering_matches_or_order, false);
  assert.equal(b('U-VI-1-1').numbering_matches_or_order, true);
  assert.ok(b('U-VI-1-1').in_or_brigade_not_in_legacy.includes('15th New Jersey'));
  assert.ok(vi.brigades.every((x) => x.candidate && x.needs_historian));
});

test('unit index: 569 units + formations; batteries are searchable; ids are unique', () => {
  assert.equal(index.counts.units, 569);
  assert.equal(index.counts.batteries, 104);
  assert.equal(index.units.filter((u) => u.kind === 'battery').length, 104);
  assert.equal(new Set(index.units.map((u) => u.id)).size, 569);
  assert.equal(index.formations.length, 158);
});

test('acceptance queries: "battery" returns batteries; "14th brooklyn" returns U-84NY first with no alias row; "20th maine" ranks U-20ME first', () => {
  const b = searchIndex(index, 'battery');
  assert.ok(b.length >= 10 && b.every((r) => r.kind === 'battery'));
  const bk = searchIndex(index, '14th brooklyn');
  assert.equal(bk[0].id, 'U-84NY');
  assert.ok(!bk.some((r) => r.id === 'U-14BK'), 'alias rows are hidden');
  assert.equal(searchIndex(index, '20th maine')[0].id, 'U-20ME');
  const nine = index.units.find((u) => u.id === 'U-ART-9MA');
  assert.ok(nine && nine.kind === 'battery' && nine.has_track, 'Regiment page can open U-ART-9MA (Bigelow)');
  // no subsequence fallback: a 3-letter query must not match 399 rows
  assert.ok(searchIndex(index, 'lee', { limit: 1000 }).length < 60);
});

test('natural sort: 9th < 10th < 102nd within a state; sort keys are stable', () => {
  const k = (d) => sortKeyOf(d, 'x');
  assert.ok(naturalCompare(k('9th Maine Infantry'), k('10th Maine Infantry')) < 0);
  assert.ok(naturalCompare(k('10th Maine Infantry'), k('102nd Maine Infantry')) < 0);
  const regs = index.units.filter((u) => u.kind === 'regiment');
  for (let i = 1; i < regs.length; i++) assert.ok(regs[i - 1].sort_key <= regs[i].sort_key || naturalCompare(regs[i - 1].sort_key, regs[i].sort_key) <= 0);
});

test('the committed build artifacts equal a fresh generation (run node tools/data/unit_registry.mjs to refresh)', () => {
  for (const [name, text] of Object.entries(files)) {
    const cur = fs.readFileSync(path.join(REPO_ROOT, 'data-src', 'build', name), 'utf8');
    assert.equal(cur, text, `${name} is stale`);
  }
});

test('battery compat shim: 103 batteries in the regiment shape the five static pages read (the misfiled McClanahan battery is excluded)', () => {
  const shim = JSON.parse(files['candidates/batteries_regiment_shape.json']);
  assert.equal(shim.regiments.length, 103);
  assert.equal(new Set(shim.regiments.map((r) => r.regiment_id)).size, 103);
  assert.ok(!shim.regiments.some((r) => r.regiment_id === 'C-McClanahan-ART'));
  for (const r of shim.regiments) {
    for (const k of ['regiment_id', 'designation', 'strength', 'casualties', 'days_engaged', 'key_action', 'unit_type']) assert.ok(k in r, `${r.regiment_id} lacks ${k}`);
    assert.equal(r.unit_type, 'battery');
    assert.ok(ctx.oob.records.has(r.regiment_id));
  }
});
