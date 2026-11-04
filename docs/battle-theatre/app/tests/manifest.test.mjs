// Node tests (no browser) for the per-figure kit manifests: the JS port equals the Python reference (golden digests), disputed units carry both variants and choose none, no manifest exists before the
// unit enters the field, every drawn figure has a manifest, the renderer's variation scalar follows the manifest's wear level, and the Python validator's result is current and clean.
//   node --test docs/battle-theatre/app/tests/manifest.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os'; import crypto from 'node:crypto'; import { spawnSync } from 'node:child_process';
import { nodeWorld, BT } from './node-world.mjs';
import { makeGeo } from '../src/geo.mjs';
import { loadRawFromDisk, terrainMeta } from '../tools/history-report.mjs';
import { createRealHistory } from '../src/history/real.mjs';
import { worldFromUnits } from '../src/world-from-units.mjs';
import { Kit, manifestFor, soldierSeed, FIELD_ORDER } from '../src/history/manifest.mjs';
import { exportFigures } from '../tools/export-figures.mjs';
import { canon } from '../../sim/cache.mjs';
import { fmix32, hash4, rand, strId } from '../../sim/rng.mjs';
import { figuresSection } from '../src/ui/card-sections.mjs';
import { minOf } from '../src/clock.mjs';

const ROOT = path.resolve(BT, '../..'), J = f => JSON.parse(fs.readFileSync(path.join(BT, f), 'utf8'));
const raw = loadRawFromDisk(), TM = terrainMeta(), { T } = await nodeWorld(), geo = makeGeo(T);
const L = createRealHistory({ raw, T: TM, helpers: { civilDawn: m => m + 4 * 60 + 3 } }), world = worldFromUnits(T, geo, L), F = L.figures;
const kit = new Kit({ specs: raw.kit, weapons: raw.kitWeapons, artillery: raw.kitArtillery, cavalry: raw.kitCavalry }), G = J('app/tests/golden-manifests.json');
const dig = m => crypto.createHash('sha256').update(canon(m)).digest('hex').slice(0, 24);
const python = (args, env = {}) => { for (const exe of ['python', 'python3']) { const r = spawnSync(exe, args, { cwd: ROOT, encoding: 'utf8', env: { ...process.env, PYTHONIOENCODING: 'utf-8', ...env }, timeout: 120000 }); if (!r.error) return r; } return null; };

test('golden: the JS port makes exactly the manifests tools/bt/check_kit.py makes (2,616 reference digests over every kit unit that was at Gettysburg, both variants of a disputed unit)', () => {
  assert.ok(G.cases.length > 2500 && G.units_with_cases > 300); let bad = 0;
  for (const c of G.cases) { const m = manifestFor(kit, { soldierId: c.soldier_id, unitId: c.unit, seed: G.project_seed, date: c.date, rank: c.rank, variant: c.variant }); if (dig(m) !== c.digest) bad++; }
  assert.equal(bad, 0, `${bad} manifests differ from the Python reference`);
  for (const f of G.full) assert.deepEqual(JSON.parse(canon(manifestFor(kit, { soldierId: f.soldier_id, unitId: f.unit, seed: G.project_seed, date: f.date, rank: f.rank, variant: f.variant }))), JSON.parse(canon(f.manifest)));
  for (const [x, want] of G.rng_golden.fmix32) assert.equal(fmix32(x), want); for (const [a, want] of G.rng_golden.hash4) assert.equal(hash4(...a), want); for (const [s, want] of G.rng_golden.strId) assert.equal(strId(s), want); for (const [a, want] of G.rng_golden.rand) assert.equal(rand(...a), want);
  assert.deepEqual(G.skipped_not_present.map(x => x[0]).sort(), Object.entries(kit.units).filter(([k, u]) => u.presence.status !== 'present_at_gettysburg').map(([k]) => k).sort(), 'the units refused are the units that were not there');
});

test('determinism and refusals: the same figure gives the same manifest, a unit that was not at Gettysburg yields none, a disputed unit needs a variant and none is chosen', () => {
  const a = manifestFor(kit, { soldierId: 'x:0001', unitId: 'US.19IN', seed: 1863 }), b = manifestFor(kit, { soldierId: 'x:0001', unitId: 'US.19IN', seed: 1863 }); assert.deepEqual(a, b);
  assert.notEqual(canon(a), canon(manifestFor(kit, { soldierId: 'x:0002', unitId: 'US.19IN', seed: 1863 }))); assert.notEqual(canon(a), canon(manifestFor(kit, { soldierId: 'x:0001', unitId: 'US.19IN', seed: 1864 })));
  assert.equal(soldierSeed(1863, 'x:0001'), a.seed); assert.match(a.fields.headgear.items[0], /hardee_hat/);
  for (const absent of G.skipped_not_present) assert.throws(() => manifestFor(kit, { soldierId: 's', unitId: absent[0], seed: 1863 }), /no soldier may be generated/);
  assert.throws(() => manifestFor(kit, { soldierId: 's', unitId: 'US.140NY', seed: 1863 }), /disputed[\s\S]*no default is chosen/);
  const v = Object.keys(kit.units['US.140NY'].variants); assert.ok(v.length >= 2);
  const ms = v.map(x => manifestFor(kit, { soldierId: 's', unitId: 'US.140NY', seed: 1863, variant: x })); for (const m of ms) assert.ok(m.flags.some(f => f.startsWith('disputed:')));
  assert.notEqual(canon(ms[0].fields), canon(ms[1].fields), 'the two readings of the 140th NY dress differ');
  assert.throws(() => manifestFor(kit, { soldierId: 's', unitId: 'NO.SUCH', seed: 1863 }), /unknown kit unit/);
});

test('every drawn figure has a manifest from its unit’s kit record or the default of its army and arm; none exists before the unit enters; the two Berdan variants are carried, none chosen', () => {
  assert.ok(F); const drawn = L.units.filter(u => u.drawn); assert.equal(drawn.length, L.counts.drawn); assert.ok(drawn.length >= 72); let n = 0, disputed = 0;
  for (const u of drawn) {
    const e = L.enterOf(u.id), ku = F.kitUnitOf(u.id); assert.ok(kit.units[ku.kit_unit], `${u.id}: kit unit ${ku.kit_unit}`); if (ku.default) assert.match(ku.kit_unit, /^DEFAULT\.(union|confederate)\.(infantry|artillery|cavalry)$/);
    assert.equal(F.manifest(u.id, 0, e - 1), null, `${u.id}: no manifest a minute before it enters`); assert.equal(F.manifest(u.id, 0, e - 5000), null);
    for (let k = 0; k < u.strength.drawn; k += Math.max(1, Math.floor(u.strength.drawn / 6))) { const m = F.manifest(u.id, k, e); assert.ok(m, `${u.id}:${k}`); n++; if (m.disputed) { disputed++; assert.ok(Object.keys(m.variants).length >= 2 && m.flags.includes('no variant chosen')); } else { assert.equal(m.rank, 'private'); assert.equal(m.army, u.side); assert.ok(m.tier_map.wear_state === 'inferred'); for (const f of Object.keys(m.fields)) assert.ok(FIELD_ORDER.includes(f)); } }
  }
  assert.ok(n > 400); assert.equal(F.manifest('us-1c', 0, minOf(7, 2)), null, 'a formation has no figures');
  const flagged = drawn.filter(u => kit.units[F.kitUnitOf(u.id).kit_unit].dispute_ids.length); assert.ok(flagged.length >= 1, 'a drawn unit with a disputed dress (Berdan green or blue)'); for (const u of flagged) assert.ok(F.manifest(u.id, 3, L.enterOf(u.id)).flags.some(f => f.startsWith('disputed:')), 'carried as a flag on its manifests');
  // the path of a unit with two variants (the 140th NY is not drawn, so a copy of the crosswalk points a drawn regiment at its record): both are made, none is chosen
  const raw2 = { ...raw, kitCrosswalk: { ...raw.kitCrosswalk, units: { ...raw.kitCrosswalk.units, 'us-1c-1d-meredith-19in': { kit: 'US.140NY', how: 'alias', note: 'TEST FIXTURE' } } } }, L2 = createRealHistory({ raw: raw2, T: TM, helpers: { civilDawn: m => m + 4 * 60 + 3 } }), e2 = L2.enterOf('us-1c-1d-meredith-19in'), m2 = L2.figureManifest('us-1c-1d-meredith-19in', 5, e2);
  assert.equal(m2.disputed, true); assert.ok(Object.keys(m2.variants).length >= 2); assert.equal(L2.figureVari('us-1c-1d-meredith-19in', 5), null); assert.match(figuresSection({ layer: L2, state: { t: e2 + 60, scenario: {} } }, L2.units.find(x => x.id === 'us-1c-1d-meredith-19in'), e2 + 60), /Disputed[\s\S]*Pending owner/); assert.equal(F.manifest('cs-1c-mclaws-kershaw-2sc', 0, minOf(7, 2)), null, 'an undrawn unit has no figure');
  const crosswalk = raw.kitCrosswalk; assert.equal(Object.keys(crosswalk.units).length, 558); for (const [id, r] of Object.entries(crosswalk.units)) { assert.ok(L.units.some(u => u.id === id)); if (r.kit) assert.ok(kit.units[r.kit], `${id}: ${r.kit}`); }
});

test('the renderer’s variation scalar of every drawn figure is derived from its manifest’s wear level (coat brightness class); the world carries it; disputed units keep the prototype’s hash', () => {
  let checked = 0;
  for (const u of L.units.filter(x => x.drawn)) {
    const w = world.units[L.units.indexOf(u)], e = L.enterOf(u.id);
    for (let k = 0; k < w.count; k++) {
      const m = F.manifest(u.id, k, e), v = L.figureVari(u.id, k), s1 = world.sold1[(w.first + k) * 4 + 3];
      if (m.disputed) { assert.equal(v, null); continue; }
      assert.ok(v >= 0 && v < 1); assert.equal(Math.fround(v), s1); const fr = (13.7 * v) % 1; assert.ok(Math.abs(fr - Math.min(0.9999, 1 - m.wear_state.level)) < 1e-4, `${u.id}:${k} coat brightness class`); checked++;
    }
  }
  assert.ok(checked > 500); assert.ok(L.rendererSupport.drawn.length === 1 && L.rendererSupport.not_drawn.length >= 10);
  assert.match(figuresSection({ layer: L, state: { t: minOf(7, 2, 12), scenario: {} } }, L.units.find(x => x.id === 'us-1c-1d-meredith-19in'), minOf(7, 2, 12)), /Hardee hat|hardee/i);
  assert.match(figuresSection({ layer: L, state: { t: minOf(7, 1, 6), scenario: {} } }, L.units.find(x => x.id === 'us-1c-1d-meredith-19in'), minOf(7, 1, 6)), /before the unit enters/);
  assert.match(figuresSection({ layer: L, state: { t: 1, scenario: {} } }, L.units.find(x => x.render.status === 'not_drawn'), 1), /No figure is drawn/);
});

test('the crosswalk is what tools/bt/kit_crosswalk.py writes now; kit_presence agrees with the arrival checker at every drawn unit’s gate', () => {
  const tmp = path.join(os.tmpdir(), 'bt-kit-crosswalk-' + process.pid + '.json'), r = python(['tools/bt/kit_crosswalk.py'], { KIT_CROSSWALK_OUT: tmp });
  if (!r) return; assert.equal(r.status, 0, r.stderr); assert.deepEqual(JSON.parse(fs.readFileSync(tmp, 'utf8')), raw.kitCrosswalk, 'run python tools/bt/kit_crosswalk.py'); fs.unlinkSync(tmp);
});

test('the Python B.6.12 validation of every drawn figure is current and clean: figures-validation.json carries the digest of what the shell draws now, 0 FAIL, every digest equal, every day-before-arrival manifest refused', () => {
  const fv = raw.figuresValidation; assert.ok(fv, 'run python tools/bt/check_figures.py --write'); const exp = exportFigures();
  assert.equal(fv.export_digest, exp.export_digest, 'the shell’s figures changed: run python tools/bt/check_figures.py --write');
  assert.equal(fv.totals.fail, 0); assert.equal(fv.totals.units, exp.units.length); assert.equal(fv.totals.figures, exp.units.reduce((a, u) => a + u.figures * (u.variants ? u.variants.length : 1), 0));
  for (const u of Object.values(fv.units)) { assert.equal(u.fail, 0); assert.equal(u.digest_match, true); assert.equal(u.control_before_arrival_refused, true); assert.ok(u.kit_presence_agrees !== false); assert.equal(u.shell_gate_not_earlier_than_checker, true); }
  assert.ok(Object.values(fv.units).filter(u => u.kit_presence_agrees === true).length >= 15, 'kit_presence checked where it resolves');
  assert.ok(fv.totals.flag_codes.DISPUTED_FLAGGED > 0, 'a disputed dress is flagged, not chosen'); assert.ok(fv.totals.flag > 0);
});
