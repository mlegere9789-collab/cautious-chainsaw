// Markers of the timeline rows and the source catalog: built from the register and the correction files, no browser.
//   node --test docs/battle-theatre/app/tests/timeline-overlay.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path';
import { BT } from './node-world.mjs';
import { loadTimeline } from '../src/data.mjs';
import { catalogOf, tlConflictsOf, tlChoice, eventMarks, isUnverified, NO_DEFAULT, EVERY } from '../src/timeline-overlay.mjs';
import { build, auditTier } from '../../../../tools/bt/build_timeline_overlay.mjs';

const J = f => JSON.parse(fs.readFileSync(path.join(BT, f), 'utf8'));
const OV = J('app/data/timeline-overlay.json'), TL = await loadTimeline(), byId = new Map(TL.map(e => [e.id, e]));

test('the shipped overlay is the built file (no hand edit)', () => { assert.deepEqual(OV, build()); });
test('source catalog: OR Atlas plates and the two NPS reports carry the register\'s own status words', () => {
  const C = catalogOf(OV), by = t => C.find(c => c.title.includes(t));
  assert.equal(by('OR Atlas').status, 'identified from index only, images unseen'); assert.match(by('OR Atlas').title, /28, 40, 43, 73 and 95/); assert.equal(by('OR Atlas').register, 'EG-0137');
  assert.equal(by('Pickett').status, 'not located'); assert.equal(by('Vegetation').status, 'not located'); assert.equal(by('Vegetation').register, 'EG-0139');
  for (const c of C) assert.ok(['documented', 'inferred', 'plausible-procedural', 'open gap'].includes(c.tier) && c.detail, c.title);
});
test('timeline conflicts: every register row is selectable, with source and tier, and none has a default', () => {
  const C = tlConflictsOf(OV), ids = C.map(c => c.row);
  for (const r of ['T2-241', 'T3-027', 'T3-039', 'T3-017', 'T3-029', 'T2-242', 'T3-037', 'T3-002', 'T3-022', 'T3-038', 'T3-023', 'T3-033', 'T2-244', 'T3-044']) assert.ok(ids.includes(r), r);
  for (const c of C) {
    assert.equal(c.options[0].key, NO_DEFAULT); assert.equal(c.options.at(-1).key, EVERY); assert.equal(tlChoice({}, c.id), NO_DEFAULT);
    assert.ok(c.options.length >= 3, c.id); for (const o of c.options.filter(o => o.key.startsWith('s:'))) { assert.ok(o.value && o.basis, c.id + o.key); assert.ok(['documented', 'inferred', 'plausible-procedural', 'open gap'].includes(o.tier), c.id + o.key); }
  }
  assert.deepEqual(C.find(c => c.row === 'T3-039').options.filter(o => o.key.startsWith('s:')).map(o => o.value), ['03:30', '03:45', '04:00', '"daylight"/"early light"', '05:00-05:30 (04:30 Hunt vs 05:30)']);
  assert.equal(C.find(c => c.row === 'T3-029').options.filter(o => o.key.startsWith('s:')).length, 3);
});
test('event card marks: competing values follow the choice; a row without a conflict gets none', () => {
  const e = byId.get('T3-039'), m0 = eventMarks(OV, e, {}); assert.equal(m0.conflict.current, NO_DEFAULT); assert.ok(m0.conflict.values.every(v => !v.selected)); assert.equal(m0.register, 'EG-0293');
  const m1 = eventMarks(OV, e, { 'TL-T3-039': 's:B' }); assert.deepEqual(m1.conflict.values.filter(v => v.selected).map(v => v.label), ['B']);
  assert.ok(eventMarks(OV, e, { 'TL-T3-039': EVERY }).conflict.values.every(v => v.selected));
  assert.equal(eventMarks(OV, byId.get('T1-001'), {}), null);
});
test('C-028 rows show the delegated conflict update', () => {
  for (const r of ['T2-242', 'T2-247', 'T3-036']) assert.ok(eventMarks(OV, byId.get(r), {}).updates.some(u => u.conflict === 'C-028'), r);
});
test('tier: the plan\'s tier stays, the audit tier is shown beside it and is never promoted', () => {
  const m = eventMarks(OV, byId.get('T3-039'), {}); assert.equal(byId.get('T3-039').tier, 'open gap'); assert.equal(m.audit.tier, 'inferred'); assert.equal(m.audit.seed, 'open gap');
  assert.equal(auditTier('plausible/inferred; no primary'), 'plausible-procedural'); assert.equal(auditTier('open gap / unsupported'), 'open gap'); assert.equal(auditTier('documented (core); numbers open'), 'documented'); assert.equal(auditTier(null), null);
  for (const [id, r] of Object.entries(OV.rows)) if (r.audit) { assert.notEqual(r.audit.tier, byId.get(id).tier, id); assert.equal(r.audit.seed, byId.get(id).tier, id); }
});
test('the seeded, unverified pill is only for rows the seed file still has unverified', () => {
  const ver = TL.filter(e => !isUnverified(e)), un = TL.filter(isUnverified), seed = fs.readFileSync(path.join(BT, 'GOVERNANCE/timeline_seed.jsonl'), 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
  assert.equal(ver.length, seed.filter(s => s.status === 'verified').length); assert.ok(ver.length > 0 && un.length > 0); assert.equal(isUnverified(byId.get('T3-039')), true); assert.equal(isUnverified(byId.get('T1-001')), false);
});
