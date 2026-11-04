// Evidence tests for the figure models (2026-11-04, shard vis-figures): the primary-source ledger (src/figures3d/evidence.mjs -> data/figures3d/evidence.json), the statutory star count by date,
// the rein hand against the cavalry drill, and the declared deviation of the haversack side from the 1861 regulations.   node --test docs/battle-theatre/app/tests/figures3d-evidence.test.mjs   (no browser, no GPU)
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { EVIDENCE, FAILED_LOOKUPS, ADMISSIONS, starEffectiveDate, sixtyDaysFromAndAfter, unionStarsOn } from '../src/figures3d/evidence.mjs';
import { TIERS } from '../src/figures3d/tiers.mjs';
import { US_STARS } from '../src/figures3d/flags.mjs';
import { haversackLugs, CANTEEN_C } from '../src/figures3d/gear.mjs';
import { REIN_HAND } from '../src/figures3d/horse.mjs';
import { FigureLibrary } from '../src/figures3d/library.mjs';
import { MAT } from '../src/figures3d/palette.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), APP = path.join(here, '..'), DATA = path.join(APP, 'data/figures3d');

test('evidence ledger: every row has an id, a status, a tier, what it supports, a source and what it does NOT support; documented rows carry a source and a passage; gaps and inferences are not labelled documented', () => {
  const ids = new Set();
  for (const e of EVIDENCE) {
    assert.ok(!ids.has(e.id), 'duplicate ' + e.id); ids.add(e.id);
    assert.ok(['verified', 'inferred', 'gap'].includes(e.status), e.id); assert.ok(['documented', 'inferred', 'plausible-procedural'].includes(e.tier), e.id);
    for (const k of ['supports', 'source', 'where', 'not_supported']) assert.ok(typeof e[k] === 'string' && e[k].length > 0, `${e.id}.${k}`);
    if (e.tier === 'documented') { assert.equal(e.status, 'verified', e.id); assert.ok(Object.keys(e.passage).length > 0 && e.where.startsWith('https://'), e.id + ' documented needs a passage and a URL'); assert.ok(e.not_supported.length > 30, e.id + ' states what it does not support'); }
    else assert.notEqual(e.status, 'verified', e.id + ' non-documented rows are inferred or gaps');
    assert.ok(!/wikipedia|forum|blog/i.test(e.source + e.where), e.id + ' no lead source as evidence');
  }
  assert.ok(ids.has('FIG-EV-FLAG-ACT-1818') && ids.has('FIG-EV-BRIDLE-HAND-1841') && ids.has('FIG-EV-CARRY-SIDE-1861'));
  assert.ok(FAILED_LOOKUPS.length >= 8 && FAILED_LOOKUPS.every(f => f.what && f.result), 'failed lookups are recorded as failed');
});

test('evidence.json on disk is the one this code exports and every TIERS evidence reference resolves', () => {
  const D = JSON.parse(fs.readFileSync(path.join(DATA, 'evidence.json'), 'utf8')), ids = new Set(EVIDENCE.map(e => e.id));
  assert.equal(D.schema, 'figures3d-evidence-1'); assert.deepEqual(D.evidence.map(e => e.id), EVIDENCE.map(e => e.id)); assert.deepEqual(D.admissions, ADMISSIONS); assert.equal(D.failed_lookups.length, FAILED_LOOKUPS.length);
  const refs = TIERS.filter(t => t.evidence); assert.ok(refs.length >= 3); for (const t of refs) assert.ok(ids.has(t.evidence), t.id + ' -> ' + t.evidence);
  const T = JSON.parse(fs.readFileSync(path.join(DATA, 'TIERS.json'), 'utf8')); for (const t of refs) assert.equal(T.choices.find(c => c.id === t.id).evidence, t.evidence, 'TIERS.json current for ' + t.id);
});

test('statutory star count (1818 act sec. 2 + the Kansas and West Virginia admissions): 34 on 1, 2 and 3 July 1863, 35 from 4 July 1863; the flag the models draw uses that count; the dates follow from the passages', () => {
  assert.equal(starEffectiveDate('1861-01-29'), '1861-07-04'); assert.equal(starEffectiveDate('1863-06-20'), '1863-07-04'); assert.equal(starEffectiveDate('1863-07-03'), '1863-07-04'); assert.equal(starEffectiveDate('1863-07-04'), '1864-07-04', 'admitted ON the 4th: the next succeeding 4 July (conservative reading)');
  assert.equal(sixtyDaysFromAndAfter('1863-04-20'), '1863-06-20', 'proclamation 20 April 1863 + "from and after sixty days"'); assert.equal(ADMISSIONS.find(a => a.state === 'West Virginia').admitted, sixtyDaysFromAndAfter('1863-04-20'));
  for (const d of ['1863-07-01', '1863-07-02', '1863-07-03']) assert.equal(unionStarsOn(d), 34, d);
  assert.equal(unionStarsOn('1863-07-04'), 35); assert.equal(unionStarsOn('1861-07-03'), 33); assert.equal(unionStarsOn('1861-07-04'), 34);
  assert.equal(US_STARS, unionStarsOn('1863-07-01'), 'flags.mjs US_STARS equals the statutory count on the first day of the battle');
  const sc = TIERS.find(t => t.id === 'F-STAR-COUNT'); assert.equal(sc.tier, 'inferred', 'the statutory count is documented (FIG-EV-STAR-COUNT-1863) but that any regiment carried it is not shown: drawing it stays inferred'); assert.ok(sc.basis.includes('-STAR-BASE-33') && sc.basis.includes('no regiment at Gettysburg is shown'), 'the 33-star base now rests on a read source and the residual doubt is stated'); assert.equal(sc.evidence, 'FIG-EV-STAR-COUNT-1863');
  const act = EVIDENCE.find(e => e.id === 'FIG-EV-FLAG-ACT-1818').passage; assert.ok(act.sec2.includes('fourth day of July then next succeeding such admission') && act.sec1.includes('thirteen horizontal stripes'));
});

test('rein hand against the cavalry drill (Cavalry Tactics 1841 para. 349): both reins end in the LEFT hand (+x is the figure left), and the fist is within 3 cm of 4 in. above the pommel top; the distance ahead of the body is recorded as a finding', () => {
  const ev = EVIDENCE.find(e => e.id === 'FIG-EV-BRIDLE-HAND-1841'); assert.ok(ev.passage.para349.includes('left hand') && ev.passage.para349.includes('4 inches above the pommel'));
  assert.ok(REIN_HAND[0] > 0, 'fist on the left side of the horse median plane (the figure left is +x)');
  const sk = JSON.parse(fs.readFileSync(path.join(DATA, 'skeleton.json'), 'utf8')); assert.ok(sk.horse.sockets.some(s => s.name === 'rein_hand_L'), 'the bridle (left) hand socket exists'); const spec = JSON.parse(fs.readFileSync(path.join(DATA, 'socket-spec.json'), 'utf8')).reins; assert.ok(/LEFT hand/.test(spec.hold) && /two-handed/.test(spec.rein_hand_R.role) && /LEFT hand only/.test(spec.rein_hand_R.role), 'rein_hand_R exists only as the target of two-handed riders; the cavalry rein mesh ends at the LEFT hand only');
  const lib = new FigureLibrary(), h = lib.mesh('horse:riding', 0).finalize(); let top = -9;
  for (let i = 0; i < h.nv; i++) if (h.mat[i] === MAT.SADDLE_LEATHER && Math.abs(h.pos[i * 3]) < 0.05 && Math.abs(h.pos[i * 3 + 2] - 0.28) < 0.04 && h.pos[i * 3 + 1] < 1.62) top = Math.max(top, h.pos[i * 3 + 1]);
  assert.ok(top > 1.55 && top < 1.62, 'pommel top ' + top); const above = REIN_HAND[1] - top, prescribed = 4 * 0.0254;
  assert.ok(Math.abs(above - prescribed) < 0.03, `fist ${above.toFixed(3)} m above the pommel, prescribed ${prescribed.toFixed(3)}`);
  const tier = TIERS.find(t => t.id === 'F-REIN-HAND'); assert.equal(tier.tier, 'inferred'); assert.ok(tier.basis.includes('6 in.') && tier.basis.includes('finding'), 'the horizontal distance deviation is declared');
});

test('carry side: the 1861 regulations prescribe haversack and canteen on the LEFT side, canteen outside; the model hangs the haversack on the right hip; the deviation is declared in TIERS and the register file, never hidden', () => {
  const ev = EVIDENCE.find(e => e.id === 'FIG-EV-CARRY-SIDE-1861'); assert.ok(ev.passage.sentence.includes('left side') && ev.passage.sentence.includes('canteen outside the haversack')); assert.ok(ev.not_supported.includes('RIGHT hip'));
  const haversackOnLeft = haversackLugs()[0][0] > 0, canteenOnLeft = CANTEEN_C[0] > 0; assert.ok(canteenOnLeft, 'canteen on the left hip (+x)');
  const t = TIERS.find(x => x.id === 'F-CARRY-SIDE'); assert.equal(t.register, 'EG-FIG-0009'); assert.ok(fs.existsSync(path.join(APP, '../GOVERNANCE/register/EG-FIG-0009.md')));
  if (!haversackOnLeft) { assert.equal(t.deviates_from_documented, true, 'a model that differs from the documented prescription must say so'); assert.ok(t.basis.includes('DEVIATES')); }
  else assert.ok(!t.deviates_from_documented, 'the model follows the regulation: the deviation flag must be removed');
  assert.notEqual(t.tier, 'documented', 'what men actually wore in the field is not in the regulation');
});
