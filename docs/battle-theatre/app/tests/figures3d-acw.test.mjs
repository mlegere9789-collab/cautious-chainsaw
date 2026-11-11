// Node tests (no browser, no GPU) for the ACW mod assets: manifest integrity and hashes, licence basis and credit, the exclusion rules (no base-game asset shipped), the lead-derived unit map,
// the inert-by-default provider and its cost model, the register and ledger links.   node --test docs/battle-theatre/app/tests/figures3d-acw.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; import { fileURLToPath } from 'node:url';
import { createFigureSystem, createAcwProvider, ACW_CREDIT_LINE, ACW_LICENCE_BASIS } from '../src/figures3d/index.mjs';
import { TIERS_ACW } from '../src/figures3d/acw-tiers.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), APP = path.join(here, '..'), BT = path.join(APP, '..'), D = path.join(APP, 'data/figures3d/acw');
const J = f => JSON.parse(fs.readFileSync(f, 'utf8')), sha = b => crypto.createHash('sha256').update(b).digest('hex');
const man = J(path.join(D, 'manifest.json')), um = J(path.join(D, 'unit-map.json')), sw = J(path.join(D, 'swatches.json')), cr = J(path.join(D, 'credits.json'));
const kit = J(path.join(BT, 'kit/kit_specs.json')).units;
const STOCK_NAME = /norwegian|ottoman|euro_|episodic_|field_carriage|cossack|hungarian|english|babydoll|limber|buildings?\//i;

function walk(d) { return fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]); }

test('rights: the licence basis is recorded exactly as the owner reported it, with the credit line, and no written licence is claimed', () => {
  assert.equal(man.rights.licence_basis, 'owner-reported verbal permission from the mod author, 2026-11-11; no written text on file'); assert.equal(man.rights.licence_basis, ACW_LICENCE_BASIS);
  assert.equal(man.rights.written_licence_on_file, false); assert.equal(man.rights.credit, "ACWII mod by ACW_Primergy and team (used with the author's permission)"); assert.equal(ACW_CREDIT_LINE, man.rights.credit);
  assert.equal(man.source.sha256, '8efdb2627d76678b906a6a44d019fcc698eb3d0d7e79555e390be440d013c9ed'); assert.equal(man.source.svn_author, 'ACW_Primergy'); assert.match(man.rights.scope_note, /unclear means excluded/);
  assert.equal(cr.credit_line, ACW_CREDIT_LINE); assert.equal(cr.licence_basis, ACW_LICENCE_BASIS); assert.equal(cr.active, man.included.length > 0);
  const L = J(path.join(BT, 'GOVERNANCE/library/figures-ledger.json')).entries.find(e => e.id === 'FIG-L-ACWII-MOD'); assert.ok(L, 'ledger entry'); assert.equal(L.sha256, man.source.sha256); assert.equal(L.licence, ACW_LICENCE_BASIS); assert.equal(L.credit, ACW_CREDIT_LINE);
});

test('manifest integrity: counts add up, every shipped file exists with the recorded bytes and sha256, and nothing else is in the folder', () => {
  const s = man.summary; assert.equal(s.included, man.included.length); assert.equal(s.excluded, man.excluded.length); assert.equal(s.included + s.excluded + s.svn_and_housekeeping_files_not_listed, s.asset_pack_files_scanned);
  assert.ok(man.included.length > 0 && man.included.length <= 40, 'a small cleared set'); const shipped = new Set();
  for (const r of man.included) { const f = path.join(D, r.output), b = fs.readFileSync(f); assert.equal(b.length, r.output_bytes, r.output); assert.equal(sha(b), r.output_sha256, r.output); shipped.add(path.normalize(f));
    assert.equal(b.subarray(0, 4).toString('latin1'), 'RIFF'); assert.equal(b.subarray(8, 12).toString('latin1'), 'WEBP'); assert.match(r.sha256, /^[0-9a-f]{64}$/); assert.equal(r.width, 512); assert.equal(r.height, 512); }
  assert.equal(man.included.reduce((a, r) => a + r.output_bytes, 0), s.included_bytes); assert.ok(s.included_bytes < 80e6, 'under the 80 MB budget');
  const ok = new Set(['manifest.json', 'swatches.json', 'unit-map.json', 'credits.json']);
  for (const f of walk(D)) { const rel = path.relative(D, f).replace(/\\/g, '/'); assert.ok(ok.has(rel) || shipped.has(path.normalize(f)), 'stray file in acw/: ' + rel); }
  const shippedExt = new Set(walk(D).map(f => path.extname(f))); assert.deepEqual([...shippedExt].sort(), ['.json', '.webp'], 'only json and webp: no mesh, dds, tga, audio or exe is shipped');
});

test('licence evidence of every shipped file: Subversion committer ACW_Primergy with the md5 of the committed bytes, no base-game marker, tier plausible-procedural, basis and credit on the row', () => {
  for (const r of man.included) {
    assert.deepEqual(r.codes, ['INCLUDED', 'E1-SVN'], r.path); assert.equal(r.info.svn.author, 'ACW_Primergy'); assert.match(r.info.svn.md5, /^[0-9a-f]{32}$/); assert.ok(r.info.svn.rev > 0 && /^2011-/.test(r.info.svn.date), r.path);
    assert.equal(r.licence_basis, ACW_LICENCE_BASIS); assert.equal(r.credit, ACW_CREDIT_LINE); assert.equal(r.tier, 'plausible-procedural'); assert.notEqual(r.tier, 'documented'); assert.ok(r.authorship_evidence);
    assert.ok(!STOCK_NAME.test(r.path), 'stock-looking name shipped: ' + r.path); assert.ok(!STOCK_NAME.test(r.output), r.output); assert.match(r.path, /^unitparts\/acw\/torso\/confed_shell_jacket\/|\/acw\/torso\/confed_shell_jacket\//i);
    const b = fs.readFileSync(path.join(D, r.output)); assert.ok(!/norwegian|ottoman|euro_|field_carriage/i.test(b.toString('latin1')), 'base-game string inside ' + r.output);
  }
  assert.deepEqual([...new Set(man.included.map(r => r.channel))].sort(), ['diffuse', 'gloss', 'normal']); assert.equal(new Set(man.included.map(r => r.variant)).size * 3, man.included.length);
});

test('exclusions: every other file has known reason codes; base-game derived meshes, placeholders, the mixed atlases and the SVN-recorded base-derived meshes are all excluded; no mesh is shipped', () => {
  const known = new Set(Object.keys(man.codes)); let svnVetoed = 0;
  for (const r of man.excluded) { assert.ok(r.codes.length > 0, r.path); for (const c of r.codes) assert.ok(known.has(c), c + ' ' + r.path); assert.ok(!r.codes.includes('INCLUDED'), r.path); assert.match(r.sha256, /^[0-9a-f]{64}$/); }
  const vwm = man.excluded.filter(r => r.path.endsWith('.variant_weighted_mesh')); assert.equal(vwm.length, 87); assert.equal(man.included.filter(r => /mesh|rigid_model/.test(r.path)).length, 0);
  const sub = vwm.filter(r => r.codes.includes('S-SUBMESH')); assert.ok(sub.length >= 85, 'norwegian_ski_troops / ottoman_commodore meshes: ' + sub.length);
  for (const r of vwm) assert.ok(r.codes.length >= 1);
  for (const r of man.excluded.filter(r => r.path.endsWith('.variant_weighted_mesh') && r.info && r.info.svn)) { assert.ok(r.codes.includes('S-SUBMESH') || r.codes.includes('S-FILENAME'), 'SVN record alone must not clear a base-derived mesh: ' + r.path); svnVetoed++; }
  assert.ok(svnVetoed >= 6, 'the SVN-recorded Union meshes are vetoed by the base-game marker (' + svnVetoed + ')');
  assert.ok(man.excluded.filter(r => r.codes.includes('PLACEHOLDER')).length >= 150, 'light-bulb placeholder textures'); assert.ok(man.excluded.some(r => /babydoll_lod1/.test(r.path) && r.codes.includes('ANACHRONISM')));
  assert.ok(man.excluded.some(r => /head_english/.test(r.path) && r.codes.includes('S-IDENTICAL')), 'byte copy of a base-game part'); assert.ok(man.excluded.some(r => /limber_model_lod1/.test(r.path) && r.codes.includes('S-LODCOPY')));
  assert.ok(man.excluded.filter(r => r.pack === 'Unit_Atlas' && /\.dds$/.test(r.path)).every(r => r.codes.includes('ATLAS-MIXED')));
  assert.ok(man.excluded.filter(r => /unitmodels\/union\/textures\//i.test(r.path)).every(r => r.codes.includes('PAIRED-STOCK-MESH')), 'face-photo atlases of the base-derived Union meshes');
  const packs = new Set(man.out_of_scope_packs.map(p => p.pack)); for (const p of ['SFX_Music', 'SFX_Troop', 'Flags', 'ACW_Environment1']) assert.ok(packs.has(p), p + ' listed as out of scope with a reason');
});

test('unit map: every link is a labelled lead-derived inference with its gap, joins a real kit unit, never picks among ambiguous rows, and lists what it could not join', () => {
  assert.equal(um.tier, 'plausible-procedural'); assert.match(um.label, /LEAD-DERIVED/); assert.equal(um.kit_units, Object.keys(kit).length); assert.equal(um.linked_kit_units, um.links.length); assert.ok(um.links.length >= 60);
  const seen = new Set();
  for (const l of um.links) { assert.ok(kit[l.kit_unit], l.kit_unit); assert.ok(!seen.has(l.kit_unit)); seen.add(l.kit_unit); assert.equal(l.tier, 'plausible-procedural'); assert.equal(l.gap, 'EG-FIG-0011'); assert.match(l.label, /lead-derived inference/);
    assert.equal(l.ambiguous, l.candidates.length > 1); assert.ok(l.candidates.length >= 1); for (const c of l.candidates) assert.ok(c.mod_key.endsWith('_' + l.kit_unit.split('.')[1]), c.mod_key); }
  for (const u of um.unmatched_kit_units) { assert.ok(kit[u]); assert.ok(!seen.has(u)); } assert.equal(um.unmatched_kit_units.length + um.links.length, um.kit_units);
  const cleared = new Set(man.included.map(r => r.group + '/' + r.variant)); for (const l of um.links) for (const c of l.candidates) for (const s of c.cleared_swatches) assert.ok(cleared.has(s) && sw.swatches[s], s);
  assert.ok(um.links.some(l => l.candidates.some(c => c.cleared_swatches.length)), 'at least one unit reaches a cleared swatch');
  assert.ok(um.links.some(l => l.candidates.some(c => c.base_game_slots.length)), 'the mod variants take heads and hands from the base-game Euro set, which the mod does not contain');
  for (const [k, s] of Object.entries(sw.swatches)) { assert.equal(s.mean_srgb.length, 3); assert.ok(s.mean_srgb.every(v => v >= 0 && v <= 255)); assert.match(s.basis, /not a measurement/); }
});

test('provider: inert by default (procedural everywhere, credit inactive); with the shipped data it reports the swatches but still no mesh; a cleared mesh would be used; the cost model adds nothing per figure', () => {
  const empty = createFigureSystem().acw; assert.equal(empty.credit().active, false); assert.equal(empty.figurePlan('US.19IN').mesh.source, 'procedural'); assert.equal(empty.status().meshes_cleared, 0);
  const sys = createFigureSystem({ acw: { manifest: man, unitMap: um, swatches: sw } }), acw = sys.acw; assert.equal(acw.credit().line, ACW_CREDIT_LINE); assert.equal(acw.credit().active, true);
  const st = acw.status(); assert.equal(st.meshes_cleared, 0); assert.equal(st.textures_cleared, man.included.length); assert.equal(st.links, um.links.length);
  for (const cap of ['soldier', 'officer', 'flag', 'gun', 'horse']) { const c = acw.coverage().find(x => x.capability === cap); assert.equal(c.cleared_meshes, 0); assert.equal(c.gap, 'EG-FIG-0012'); assert.ok(c.reason.length > 20); }
  const withSw = um.links.find(l => l.candidates.some(c => c.cleared_swatches.length)), plan = acw.figurePlan(withSw.kit_unit, 'private'); assert.equal(plan.mesh.source, 'procedural'); assert.equal(plan.tier, 'plausible-procedural'); assert.ok(plan.swatches.length > 0); assert.equal(plan.credit, ACW_CREDIT_LINE);
  assert.equal(plan.link.gap, 'EG-FIG-0011'); const none = acw.figurePlan(um.unmatched_kit_units[0]); assert.equal(none.link.gap, 'EG-FIG-0011'); assert.match(none.link.reason, /no link is guessed/); assert.equal(none.credit, null);
  const amb = um.links.find(l => l.ambiguous); if (amb) assert.equal(acw.figurePlan(amb.kit_unit).link.ambiguous, true);
  const fake = createAcwProvider({ manifest: { included: [{ path: 'x.variant_part_mesh', output: 'x.glb', capability: 'soldier' }], excluded: [] }, unitMap: um }); assert.equal(fake.figurePlan('US.19IN').mesh.source, 'acw', 'a cleared mesh is used when one exists');
  const cm = acw.costModel(); assert.equal(cm.triangles_added_per_figure, 0); assert.equal(cm.draw_calls_added, 0); assert.equal(cm.per_figure_bytes_added, 0); assert.equal(cm.textures.count, man.included.length); assert.equal(cm.textures.download_bytes_webp, man.summary.included_bytes); assert.match(cm.instancing, /one instance per man/);
  assert.ok(sys.instance && sys.variantRows, 'the figure system API is unchanged');
});

test('tiers and register: the ACW tier rows are never documented and link to register files that exist; the ledger and decision log carry the entries', () => {
  for (const t of TIERS_ACW) { assert.ok(['inferred', 'plausible-procedural', 'gap'].includes(t.tier), t.id); assert.ok(fs.existsSync(path.join(BT, 'GOVERNANCE/register', t.register + '.md')), t.register); assert.ok(t.basis.length > 20); }
  for (const id of ['EG-FIG-0010', 'EG-FIG-0011', 'EG-FIG-0012']) { const f = path.join(BT, 'GOVERNANCE/register', id + '.md'); assert.ok(fs.existsSync(f), id); const t = fs.readFileSync(f, 'utf8'); assert.match(t, /Owner decision requested/); assert.match(t, /Confidence tier \| (plausible-procedural|gap)/); }
  const idx = J(path.join(BT, 'GOVERNANCE/register_index.json')); for (const id of ['EG-FIG-0010', 'EG-FIG-0011', 'EG-FIG-0012']) assert.equal(idx.filter(x => x.id === id).length, 1, id);
  assert.match(fs.readFileSync(path.join(BT, 'GOVERNANCE/decision_log.md'), 'utf8'), /DEC-DELEG-H[^\n]*ACW mod assets/); assert.ok(fs.existsSync(path.join(APP, 'docs/BROWSER-VERIFICATION-LIST-ACW.md')));
});
