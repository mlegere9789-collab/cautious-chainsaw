// Node tests (no browser, no GPU) for the figure models: skeleton contract, mesh sanity (NaN, manifold/watertight, bone weights, index range), triangle budgets per LOD, every kit variant resolves,
// deterministic hashes (against the exported data/figures3d/hashes.json), instance layout, flags, faces, glTF structure, cost model, tiers and register links.
//   node --test docs/battle-theatre/app/tests/figures3d.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; import { fileURLToPath } from 'node:url';
import { createFigureSystem, buildSkeletonJson, humanRig, horseRig, gunRig, WEAPON_VISUALS, FLAG_EVIDENCE, flagPattern, resolveColours, unpackInstance, VARIANT_ROW_BYTES } from '../src/figures3d/index.mjs';
import { checkMesh, packMesh } from '../src/figures3d/meshkit.mjs';
import { buildCatalog } from '../src/figures3d/catalog.mjs';
import { ITEM_VISUALS, ACC_CLASSES } from '../src/figures3d/visuals.mjs';
import { Kit, manifestFor } from '../src/history/manifest.mjs';
import { partsForFigure, partsAtLod, FigureLibrary } from '../src/figures3d/library.mjs';
import { headParams, scalpMorphMax, buildHeadSkin, N_HEADS, shellStats, HEAD_C, HEAD_R } from '../src/figures3d/head.mjs';
import { Mesh } from '../src/figures3d/meshkit.mjs';
import { buildGlb } from '../src/figures3d/gltf.mjs';
import { TIERS } from '../src/figures3d/tiers.mjs';
import { MAT, COLOUR } from '../src/figures3d/palette.mjs';
import { SHAPE_KEYS } from '../src/figures3d/body.mjs';
import { canteenLugs, haversackLugs, CANTEEN_C } from '../src/figures3d/gear.mjs';
import { skinMatrices, poseFromClip } from '../tools/fig-anim-pose.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), APP = path.join(here, '..'), BT = path.join(APP, '..'), DATA = path.join(APP, 'data/figures3d');
const J = f => JSON.parse(fs.readFileSync(path.join(BT, 'kit', f), 'utf8')), sha = b => crypto.createHash('sha256').update(b).digest('hex');
const specs = J('kit_specs.json'), weapons = J('weapons.json'), kit = new Kit({ specs, weapons, artillery: J('artillery_batteries.json'), cavalry: J('cavalry_units.json') });
const catalog = buildCatalog(), sys = createFigureSystem(), lib = sys.lib;

// the population sample used by several tests: every unit present at Gettysburg (both variants of a disputed unit) x 2 ranks x 2 dates x 6 men
const POP = []; for (const [uid, u] of Object.entries(kit.units)) { if (u.presence.status !== 'present_at_gettysburg') continue;
  for (const v of (u.variants ? Object.keys(u.variants) : [null])) for (const date of ['1863-07-01', '1863-07-03']) for (const rank of ['private', 'captain']) for (let k = 0; k < 6; k++) POP.push(manifestFor(kit, { soldierId: uid + ':' + k, unitId: uid, seed: 1863, date, rank, role: 'rifleman', variant: v })); }

test('skeleton: 61 human bones, parents first, unique names, mirrored sides, limits, spring ranges (render G6/G7), sockets and mid set resolve', () => {
  const S = buildSkeletonJson(), h = S.human; assert.equal(h.bones.length, 61); assert.equal(S.horse.bones.length, 41); assert.equal(S.gun.bones.length, 19);
  for (const rig of [h, S.horse, S.gun]) { const names = new Set(); rig.bones.forEach((b, i) => { assert.ok(!names.has(b.name), 'duplicate ' + b.name); names.add(b.name); assert.ok(b.parent === null || b.parent < i, 'parent after child: ' + b.name); assert.equal(b.i, i); }); assert.equal(rig.bones.filter(b => b.parent === null).length, 1); }
  for (const b of h.bones) { if (b.name.endsWith('_L')) { const r = h.bones[h.index[b.name.slice(0, -2) + '_R']]; assert.ok(r, 'no mirror for ' + b.name); assert.ok(Math.abs(r.head[0] + b.head[0]) < 1e-5 && Math.abs(r.head[1] - b.head[1]) < 1e-5 && Math.abs(r.head[2] - b.head[2]) < 1e-5, 'mirror mismatch ' + b.name); } }
  for (const b of h.bones) { if (b.limits) for (const a of ['x', 'y', 'z']) assert.ok(b.limits[a][0] <= b.limits[a][1], 'limit order ' + b.name); if (b.spring) { assert.ok(b.spring.freq_hz >= 3 && b.spring.freq_hz <= 8, 'spring Hz ' + b.name); assert.ok(b.spring.damping >= 0.3 && b.spring.damping <= 0.6, 'damping ' + b.name); } }
  assert.deepEqual(h.bones[h.index.shin_L].limits.x, [0, 150]); assert.deepEqual(h.bones[h.index.forearm_L].limits.x, [-145, 0]);
  for (const s of h.sockets) assert.ok(h.index[s.bone] !== undefined, 'socket bone ' + s.name);
  for (const k of ['grip_R', 'grip_L', 'mouth', 'cap_pouch', 'cartbox_reach', 'hat_top']) assert.ok(h.sockets.find(s => s.name === k), 'socket ' + k);
  assert.ok(h.long_arm_sockets.find(s => s.name === 'muzzle'));
  assert.ok(h.lod.mid.count < 61 && h.lod.mid.map.every(v => v >= 0 && v < h.lod.mid.count)); assert.equal(h.lod.mid.map.length, 61);
  assert.ok(h.bones.filter(b => b.group === 'gear').length >= 10, 'gear spring bones'); assert.ok(h.bones.filter(b => b.prop).length === 4);
  assert.ok(Math.abs(h.bones[h.index.head].head[1] - 1.55) < 1e-6);
});
test('skeleton.json on disk is the one this code generates (the contract file for ANIMATION is current)', () => {
  const disk = JSON.parse(fs.readFileSync(path.join(DATA, 'skeleton.json'), 'utf8')), S = buildSkeletonJson(); delete disk.content_sha256;
  assert.deepEqual(JSON.parse(JSON.stringify(S)), disk);
});

test('mesh sanity over the whole catalogue at all three LODs: no NaN/Inf, indices in range, joints inside the rig, weights sum to 1, manifold (no edge used by more than two triangles), tubes and heads watertight', () => {
  const bad = []; let checked = 0;
  for (const id of catalog) for (let lod = 0; lod < 3; lod++) {
    const m = lib.mesh(id, lod); if (!m.nv) continue; const f = m.finalize(), isHorse = id.startsWith('horse'), isGun = /^(tube|carriage|limber|caisson|implement)/.test(id), nb = isHorse ? horseRig.bones.length : isGun ? gunRig.bones.length : humanRig.bones.length;
    const c = checkMesh(f, { closed: id.startsWith('tube:') }); checked++;
    if (!c.ok) bad.push(`${id}@${lod}: ${c.problems.join('; ')}`);
    for (let i = 0; i < f.joints.length; i++) if (f.joints[i] >= nb) { bad.push(`${id}@${lod}: joint ${f.joints[i]} >= ${nb}`); break; }
    for (let i = 0; i < f.mat.length; i++) if (f.mat[i] > 63) { bad.push(`${id}@${lod}: material ${f.mat[i]}`); break; }
    const pk = packMesh(f); for (let i = 0; i < f.nv; i++) { let s = 0; for (let k = 0; k < 4; k++) s += pk.vertices[i * 32 + 24 + k]; if (s !== 255) { bad.push(`${id}@${lod}: packed weights sum ${s}`); break; } }
  }
  assert.deepEqual(bad, []); assert.ok(checked > 700, 'checked ' + checked);
});
test('the head skin of every head shape is a closed manifold volume at every LOD, with a mouth slit and jaw weights at LOD0', () => {
  for (let i = 0; i < N_HEADS; i++) for (let lod = 0; lod < 3; lod++) { const m = new Mesh('h'); buildHeadSkin(headParams(i), lod, m); const c = checkMesh(m.finalize(), { closed: true }); assert.ok(c.ok, `head ${i} lod ${lod}: ${c.problems.join(';')}`); }
  const m = new Mesh('h'); buildHeadSkin(headParams(5), 0, m); const f = m.finalize(); let jaw = 0; for (let i = 0; i < f.nv; i++) for (let k = 0; k < 4; k++) if (f.joints[i * 4 + k] === humanRig.index.jaw && f.weights[i * 4 + k] > 0.9) jaw++; assert.ok(jaw > 60, 'jaw-weighted vertices ' + jaw);
});
test('24 distinct head shapes; hair and facial-hair shells keep a margin over the head morph (the shell is built on the canonical head)', () => {
  const hs = new Set(); let worst = 0; for (let i = 0; i < N_HEADS; i++) { const m = new Mesh('h'); buildHeadSkin(headParams(i), 0, m); hs.add(sha(Buffer.from(m.finalize().pos.buffer))); worst = Math.max(worst, scalpMorphMax(headParams(i))); }
  assert.equal(hs.size, N_HEADS); assert.ok(worst < 0.0075, 'scalp morph ' + worst + ' m must stay below the hair shell minimum offset of 10.9 mm with margin');
});
test('triangle budgets per LOD (figure = the parts a man draws): LOD0 <= 58,000 (film-grade 40-50k), LOD1 parts <= 2,800, LOD2 <= 1,000; merged mid <= 2,400, low <= 900; horse, head, gun within budget', () => {
  const T = [0, 0, 0].map(() => ({ max: 0 }));
  for (const m of POP.filter((_, i) => i % 7 === 0)) { const r = sys.instance(m), list = partsForFigure(r.variant, r.variant.mask, r.words[3] & 255, r.identity); for (let l = 0; l < 3; l++) T[l].max = Math.max(T[l].max, partsAtLod(list, l).reduce((a, p) => a + lib.mesh(p.id, l).nt, 0)); }
  assert.ok(T[0].max <= 58000, 'lod0 ' + T[0].max); assert.ok(T[1].max <= 2800, 'lod1 ' + T[1].max); assert.ok(T[2].max <= 1000, 'lod2 ' + T[2].max);
  for (const s of sys.classes().silhouettes.slice(0, 120)) { assert.ok(sys.midMesh(s.key).nt <= 2400, 'mid ' + s.key); assert.ok(sys.lowMesh(s.key).nt <= 900, 'low ' + s.key); }
  assert.ok(lib.mesh('horse:riding', 0).nt <= 26000 && lib.mesh('horse:riding', 1).nt <= 800 && lib.mesh('horse:riding', 2).nt <= 400);
  assert.ok(lib.mesh('head:0', 0).nt <= 14000 && lib.mesh('head:0', 1).nt <= 350 && lib.mesh('head:0', 2).nt <= 100);
  for (const p of ['napoleon_12pdr_m1857', '3inch_ordnance_rifle', '10pdr_parrott']) assert.ok(lib.mesh('tube:' + p, 0).nt <= 7000 && lib.mesh('carriage', 0).nt <= 8000);
});
test('body shape keys: every body-conforming part has the same topology at every key (deltas exist, are finite and small); 12 body shapes exist', () => {
  for (const id of ['coat:sack', 'coat:frock', 'coat:zouave', 'coat:shirt', 'trousers:straight:0:0', 'trousers:baggy:1:1', 'foot:brogan', 'foot:gaiter', 'acc:belt:oval_us', 'acc:sash:w', 'acc:blanket_roll', 'acc:knapsack:std']) for (const lod of [0, 1]) { const p = lib.part(id, lod); assert.ok(p.deltas, `deltas for ${id}@${lod}`); assert.equal(p.deltas.length, SHAPE_KEYS.length * p.mesh.nv * 3); let mx = 0; for (const v of p.deltas) { assert.ok(Number.isFinite(v)); mx = Math.max(mx, Math.abs(v)); } assert.ok((mx > 1e-4 || !/^(coat|trousers|foot)/.test(id)) && mx < 0.09, `${id}@${lod} max delta ${mx}`); }
});

test('every catalogue item (191) and every weapon record (45) has a visual; every kit variant of the whole population resolves; no barred or reference-only item is ever drawn; every part id asked for is in the catalogue', () => {
  assert.equal(Object.keys(specs.items).length, 191); assert.equal(Object.keys(weapons.weapons).length, 45);
  for (const k of Object.keys(specs.items)) assert.ok(ITEM_VISUALS[k], 'no visual for item ' + k); for (const k of Object.keys(weapons.weapons)) assert.ok(WEAPON_VISUALS[k], 'no visual for weapon ' + k);
  for (const k of Object.keys(ITEM_VISUALS)) assert.ok(specs.items[k], 'visual for an item the kit does not have: ' + k);
  const cat = new Set(catalog), unknownParts = new Set(), barred = []; let n = 0;
  for (const m of POP) { const r = sys.instance(m); n++; if (r.variant.barred.length) barred.push(r.variant.barred[0]); const list = partsForFigure(r.variant, r.variant.mask, r.words[3] & 255, r.identity); for (const p of list) if (!cat.has(p.id)) unknownParts.add(p.id);
    for (const slot of ['COAT', 'TROUSERS']) if (r.variant.parts[slot.toLowerCase()] && !r.variant.palette[MAT[slot]]) assert.fail('no palette colour for ' + slot + ' ' + JSON.stringify(r.variant.items)); }
  assert.deepEqual([...unknownParts], []); assert.deepEqual([...new Set(barred)], [], 'barred or reference-only items drawn'); assert.ok(n > 5000, 'population ' + n);
});
test('gap placeholders are visible: a variant with a gap item carries it in gap_items, the instance flag bit 7, and the item is drawn in the GAP material', () => {
  let found = 0, rows = null; for (const m of POP.filter((_, i) => i % 3 === 0)) { const r = sys.instance(m); if (r.variant.gap_items.length) { found++; assert.ok(unpackInstance(r.words).flags & 128); rows = rows ?? sys.variantRows(); const dv = new DataView(rows.buffer, r.index * VARIANT_ROW_BYTES, VARIANT_ROW_BYTES); assert.equal(dv.getUint8(6 + 18 + 6), Math.min(255, r.variant.gap_items.length)); } }
  assert.ok(found > 0, 'no gap-placeholder variant in the population (the cavalry boots placeholder should appear)');
  assert.equal(ITEM_VISUALS.boots_unspecified_cav_union.col.BOOT, 'gap_marker'); assert.ok(COLOUR.gap_marker);
});
test('instance record: 16 bytes, fields round-trip, the identity is a pure function of the manifest seed (no Math.random), variation is continuous (no two adjacent figures identical)', () => {
  const s = createFigureSystem(), a = POP.slice(0, 600).map(m => s.instance(m)), s2 = createFigureSystem(), b = POP.slice(0, 600).map(m => s2.instance(m));
  assert.deepEqual(a.map(r => r.words), b.map(r => r.words)); const buf = s.pack(a); assert.equal(buf.byteLength, a.length * 16);
  for (const r of a.slice(0, 200)) { const u = unpackInstance(r.words); assert.ok(u.head < 24 && u.body_shape < 12 && u.skin_tone < 12 && u.hair_style < 8 && u.facial_hair < 7 && u.eye_colour < 5 && u.stature_scale >= 0.93 && u.stature_scale <= 1.0451); assert.equal(u.kit_variant, r.index); assert.equal(u.acc_mask, r.variant.mask); }
  const src = ['index', 'variants', 'library', 'visuals', 'palette', 'head', 'body', 'garments', 'gear', 'horse', 'guns', 'flags'].map(f => fs.readFileSync(path.join(APP, 'src/figures3d', f + '.mjs'), 'utf8')).join('\n'); assert.ok(!/Math\.random|Date\.now|performance\.now/.test(src.replace(/\/\/.*$/gm, '')), 'non-deterministic call in figures3d');
  const sig = new Map(); let dup = 0; for (let i = 0; i + 1 < 600; i++) { if (a[i].words[1] === a[i + 1].words[1] && a[i].words[2] === a[i + 1].words[2]) dup++; } assert.ok(dup < 6, 'adjacent identical identities ' + dup); void sig;
  assert.equal(s.variantRows().length, s.table.list.length * VARIANT_ROW_BYTES);
});
test('distinct men: the identity space is large (heads x shapes x skin x hair x facial hair x stature x tint): 2,000 men, at most 0.1 percent share the whole identity', () => {
  const seen = new Map(); let dup = 0; for (const m of POP.filter((_, i) => i % 11 === 0).slice(0, 2000)) { const r = sys.instance(m), k = r.words[1] + ':' + r.words[2]; if (seen.has(k)) dup++; seen.set(k, 1); } assert.ok(dup <= 2, 'identical identities ' + dup);
});

test('deterministic: a second library builds the same bytes; the exported hashes.json matches a re-build of a sample of parts, mid/low classes and the flag patterns', () => {
  const f1 = new FigureLibrary(), f2 = new FigureLibrary(); for (const id of ['head:7', 'coat:frock', 'trousers:baggy:1:0', 'acc:canteen:tin', 'arm:p1853_enfield:bf', 'horse:riding', 'tube:napoleon_12pdr_m1857', 'limber', 'flag:anv_battle:torn']) for (let l = 0; l < 3; l++) assert.equal(sha(Buffer.from(packMesh(f1.mesh(id, l).finalize()).vertices)), sha(Buffer.from(packMesh(f2.mesh(id, l).finalize()).vertices)), id);
  const H = JSON.parse(fs.readFileSync(path.join(DATA, 'hashes.json'), 'utf8')).hashes; let compared = 0;
  for (const id of catalog.filter((_, i) => i % 9 === 0)) for (let l = 0; l < 3; l++) { const p = lib.part(id, l), h = crypto.createHash('sha256'); const pk = packMesh(p.mesh); h.update(pk.vertices); h.update(pk.indices); if (p.deltas) h.update(Buffer.from(p.deltas.buffer)); assert.equal(h.digest('hex'), H[`part:${id}@${l}`], `${id}@${l} differs from the exported hash: re-run tools/figures3d-build.mjs if the generators changed on purpose`); compared++; }
  assert.ok(compared > 60); for (const k of ['us_national', 'anv_battle']) assert.equal(sha(Buffer.from(flagPattern(k, 'intact').rgba)), H[`flag:${k}:intact`]);
});

test('flags: US national colour has 34 stars on 13 stripes (tier inferred, lookup not performed), the regimental colour is a marked gap, the ANV battle flag defaults to 13 stars (DD-01, NPS; 12 from PDF p.70 stays selectable) and is plausible-procedural; torn state opens the fly', () => {
  const us = flagPattern('us_national'), anv = flagPattern('anv_battle'); assert.equal(us.width * us.height * 4, us.rgba.length);   // flagPattern throws if the star count is not 34 / the scenario's count (13 by default)
  assert.equal(FLAG_EVIDENCE.anv_battle.default_scenario, 'nps'); assert.equal(FLAG_EVIDENCE.anv_battle.scenarios.nps.stars, 13); assert.equal(FLAG_EVIDENCE.anv_battle.scenarios.pdf_p70.stars, 12); assert.equal(FLAG_EVIDENCE.us_national.stars, 34); assert.equal(FLAG_EVIDENCE.us_national.tier, 'inferred'); assert.equal(FLAG_EVIDENCE.us_regimental_gap.tier, 'gap'); assert.equal(FLAG_EVIDENCE.anv_battle.tier, 'plausible-procedural');
  const torn = flagPattern('anv_battle', 'torn'); let holes = 0; for (let i = 3; i < torn.rgba.length; i += 4) if (torn.rgba[i] === 0) holes++; assert.ok(holes > 500);
  const hatch = flagPattern('us_regimental_gap'); const colours = new Set(); for (let i = 0; i < hatch.rgba.length; i += 4) colours.add(hatch.rgba[i] + ',' + hatch.rgba[i + 1]); assert.equal(colours.size, 2, 'regimental gap flag is a two-tone hatch');
  const seen = new Set(); for (const m of POP) { const r = sys.instance(m); if (r.variant.flag) seen.add(r.variant.flag); } assert.ok(seen.has('us_national') && seen.has('anv_battle')); for (const f of seen) assert.ok(FLAG_EVIDENCE[f], 'evidence record for ' + f);
  const cloth = lib.mesh('flag:us_national:intact', 0); assert.ok(cloth.meta.doubleSided && cloth.meta.cloth);
});
test('colours: wear fades sky blue toward gray-blue, dust lightens, rain darkens; skin tones range from fair to dark; every variant slot colour is a known word', () => {
  const m = POP.find(x => x.fields.trousers && x.fields.trousers.items[0] === 'trousers_sky_blue_kersey'), r = sys.instance(m); const c0 = resolveColours(r.variant, r.identity, 0, 'dust')[MAT.TROUSERS], c1 = resolveColours(r.variant, r.identity, 1, 'dust')[MAT.TROUSERS], cr = resolveColours(r.variant, r.identity, 0.5, 'rain')[MAT.COAT], cd = resolveColours(r.variant, r.identity, 0.5, 'dust')[MAT.COAT];
  assert.ok(c1[2] < c0[2] + 40 && c1[0] > c0[0] - 1, 'fade'); assert.ok(cr[0] + cr[1] + cr[2] < cd[0] + cd[1] + cd[2], 'rain darkens');
});

test('glTF export: a valid GLB container, 61 joints, accessor counts match, one skin, materials named by slot', () => {
  const m = POP[30], r = sys.instance(m), list = partsAtLod(partsForFigure(r.variant, r.variant.mask, r.words[3] & 255, r.identity), 0), glb = buildGlb({ meshes: list.map(p => lib.mesh(p.id, 0).finalize()), rig: humanRig, palette: resolveColours(r.variant, r.identity, 0.3), name: 't' });
  const dv = new DataView(glb.buffer, glb.byteOffset, glb.byteLength); assert.equal(dv.getUint32(0, true), 0x46546c67); assert.equal(dv.getUint32(4, true), 2); assert.equal(dv.getUint32(8, true), glb.length);
  const jl = dv.getUint32(12, true), json = JSON.parse(new TextDecoder().decode(glb.subarray(20, 20 + jl))); assert.equal(json.skins[0].joints.length, 61); assert.equal(json.accessors[json.meshes[0].primitives[0].attributes.POSITION].count, list.reduce((a, p) => a + lib.mesh(p.id, 0).nv, 0));
  assert.ok(json.materials.every(x => typeof x.name === 'string')); assert.ok(json.bufferViews.every(v => v.byteOffset + v.byteLength <= json.buffers[0].byteLength)); assert.ok(glb.length > 100000);
});
test('exported data is complete and current: skeleton, parts.bin/json (every catalogue id, 3 LODs), materials, TIERS, classes, impostor atlas, cost model, glTF samples, flag textures; file hashes match the manifest', () => {
  const M = JSON.parse(fs.readFileSync(path.join(DATA, 'manifest.json'), 'utf8')); for (const f of ['skeleton.json', 'parts.bin', 'parts.json', 'materials.json', 'TIERS.json', 'classes.json', 'impostor-atlas.png', 'impostor-atlas.json', 'hashes.json', 'gltf/iron_brigade_private.glb', 'gltf/horse_riding.glb', 'gltf/napoleon_12pdr_gun.glb', 'textures/flag_us_national_intact.png']) assert.ok(M.files[f], 'manifest lists ' + f);
  for (const [f, info] of Object.entries(M.files)) { const b = fs.readFileSync(path.join(DATA, f)); assert.equal(b.length, info.bytes, f); if (b.length < 3e6) assert.equal(sha(b), info.sha256, f); }
  const P = JSON.parse(fs.readFileSync(path.join(DATA, 'parts.json'), 'utf8')); assert.deepEqual(P.catalog_order, catalog); for (const id of catalog) assert.equal(P.parts[id].lods.length, 3);
  const bin = fs.readFileSync(path.join(DATA, 'parts.bin')); for (const id of catalog.filter((_, i) => i % 13 === 0)) for (const L of P.parts[id].lods) assert.ok(L.vertex_offset + L.vertex_bytes <= bin.length && L.index_offset + L.index_count * L.index_bytes <= bin.length);
  const C = JSON.parse(fs.readFileSync(path.join(DATA, 'cost-model.json'), 'utf8')); assert.equal(C.figures, 125000); assert.ok(C.predicted_frame_ms_by_shot['webgpu@1080p'] && C.screen_space_error_lod && C.mobile.status.startsWith('MODELLED'));
});
test('tiers: every undocumented visual choice has a tier (never documented), a basis and, where it is a gap or an open item, a register entry file', () => {
  const REG = path.join(BT, 'GOVERNANCE/register'); assert.ok(TIERS.length >= 30); const ids = new Set();
  for (const t of TIERS) { assert.ok(!ids.has(t.id), 'duplicate ' + t.id); ids.add(t.id); assert.ok(['inferred', 'plausible-procedural', 'gap'].includes(t.tier), t.id + ' tier ' + t.tier); assert.ok(t.basis && t.basis.length > 20, t.id); if (t.register) assert.ok(fs.existsSync(path.join(REG, t.register + '.md')), 'register file ' + t.register); if (t.tier === 'gap') assert.ok(t.register, t.id + ' gap without register entry'); }
  const T = JSON.parse(fs.readFileSync(path.join(DATA, 'TIERS.json'), 'utf8')); assert.equal(T.choices.length, TIERS.length);
});

// ================================================================ film-grade LOD0 round (details, LOD chain, material maps, rifle sockets, layering, hand-over, cost model, contact sheets)
import { layerReport, buildGrid } from '../src/figures3d/interpen.mjs';
import { trouserEnv } from '../src/figures3d/library.mjs';
import { BODY_SHAPES, torsoAt } from '../src/figures3d/body.mjs';
import { COAT_CUTS, TROUSER_CUTS } from '../src/figures3d/garments.mjs';
import { applyShapeKeys, shapeWeights } from '../src/figures3d/shape.mjs';
import { M1861 } from '../src/figures3d/rifle-spec.mjs';
import { UV_RANGE_M } from '../src/figures3d/meshkit.mjs';
import { buildMaterialArray, arrayBytes, TEX_LAYERS, MATERIAL_MAP, maskCoverage, TEX_SIZE } from '../src/figures3d/texmaps.mjs';

test('LOD0 is film-grade: the figure median is 38,000 to 50,000 triangles (PLAN G14/G15: 40-50k), no figure above 58,000; LOD1 about 2,000, LOD2 about 600; each part kind carries the detail the brief lists', () => {
  const T = [[], [], []];
  for (const m of POP.filter((_, i) => i % 7 === 0)) { const r = sys.instance(m), list = partsForFigure(r.variant, r.variant.mask, r.words[3] & 255, r.identity); for (let l = 0; l < 3; l++) T[l].push(partsAtLod(list, l).reduce((a, p) => a + lib.mesh(p.id, l).nt, 0)); }
  const med = a => [...a].sort((x, y) => x - y)[a.length >> 1];
  assert.ok(med(T[0]) >= 38000 && med(T[0]) <= 50000, 'LOD0 median ' + med(T[0])); assert.ok(Math.max(...T[0]) <= 58000, 'LOD0 max ' + Math.max(...T[0])); assert.ok(med(T[1]) >= 1500 && med(T[1]) <= 2600, 'LOD1 median ' + med(T[1])); assert.ok(med(T[2]) >= 400 && med(T[2]) <= 900, 'LOD2 median ' + med(T[2]));
  const nt = (id, l = 0) => lib.mesh(id, l).nt;
  assert.ok(nt('head:3') >= 8000 && nt('hands') >= 3400 && nt('coat:sack') >= 6000 && nt('trousers:straight:0:0:M') >= 4000 && nt('foot:brogan') >= 4500 && nt('hat:kepi') >= 2500 && nt('arm:m1861_springfield:b0') >= 3500 && nt('horse:riding') >= 15000 && nt('tube:napoleon_12pdr_m1857') >= 4000);
  // listed details exist as geometry: eyelids, teeth, ears, nostrils (face detail count), buttons and stitches (coat), eyelets and laces (shoe), lock/hammer/bands/swivels/bayonet (arm), fingers and nails (hands)
  const f = new Mesh('f'); const P = headParams(3); assert.ok(buildHeadSkin(P, 0, f).nt < nt('head:3') - 3500, 'face detail beyond the skin');
  const coat = lib.mesh('coat:frock', 0), brass = coat.M.filter(x => x === MAT.BRASS).length, thread = coat.M.filter(x => x === MAT.THREAD).length; assert.ok(brass > 400 && thread > 500, `buttons ${brass} stitch vertices ${thread}`);
  assert.ok(lib.mesh('foot:brogan', 0).M.filter(x => x === MAT.IRON).length > 100 && lib.mesh('foot:brogan', 0).M.filter(x => x === MAT.THREAD).length > 100);
  const arm = lib.mesh('arm:p1853_enfield:bf', 0), mats = new Set(arm.M); assert.ok(mats.has(MAT.STEEL) && mats.has(MAT.WOOD) && (mats.has(MAT.IRON) || mats.has(MAT.BRASS)) && arm.meta.traits.swivels && arm.nt > 4500);
  assert.ok(lib.mesh('hands', 0).M.filter(x => x === MAT.NAIL).length > 100, 'nails'); assert.ok(lib.mesh('hat:hardee', 0).M.includes(MAT.FEATHER)); assert.ok(lib.mesh('sword:m1850_foot_officer_sword', 0).nt > 600);
});
test('UV are surface metres stored at 0.25 mm: every part (flag cloth excepted, which stores 0..1) stays inside the 16.384 m range; pack/unpack round-trips', () => {
  let worst = 0; for (const id of catalog.filter((_, i) => i % 3 === 0)) { const m = lib.mesh(id, 0); if (m.meta && m.meta.uvUnit === 'unit') continue; for (let i = 0; i < m.U.length; i++) worst = Math.max(worst, Math.abs(m.U[i])); }
  assert.ok(worst < UV_RANGE_M, 'uv extent ' + worst); const m = lib.mesh('coat:sack', 0).finalize(), pk = packMesh(m), dv = new DataView(pk.vertices.buffer, pk.vertices.byteOffset); const i = 500, u = dv.getUint16(i * 32 + 16, true) / 65535 * UV_RANGE_M; assert.ok(Math.abs(u - ((m.uv[i * 2] % UV_RANGE_M + UV_RANGE_M) % UV_RANGE_M)) < 2e-4);
  assert.equal(lib.mesh('flag:us_national:intact', 0).meta.uvUnit, 'unit');
});
test('procedural material maps: 18 deterministic tileable layers (17 plus the cloth fold overlay) with 9 mips, inside the byte budget; wear and dirt masks respond monotonically to the manifest scalars; every material slot has a mapping; hashes match texmaps.json', () => {
  const B = arrayBytes(); assert.equal(B.layers, 18); assert.ok(B.raw_rgba8_bytes <= B.budget_raw_bytes && B.bc7_bytes <= B.budget_bc7_bytes, JSON.stringify(B));
  const J = JSON.parse(fs.readFileSync(path.join(DATA, 'texmaps.json'), 'utf8')), L = buildMaterialArray([0, 4, 8, 9]);
  for (const l of L) { assert.equal(l.nr.length, 9); assert.equal(l.am.length, 9); assert.equal(l.nr[0].length, TEX_SIZE * TEX_SIZE * 4); assert.equal(l.nr[8].length, 4); assert.equal(l.sha256, J.layers[l.index].sha256, l.name + ' differs from texmaps.json'); }
  const L2 = buildMaterialArray([4]); assert.equal(L2[0].sha256, L[1].sha256, 'second generation identical');
  for (const l of L) { let prev = -1; for (const lv of [0.1, 0.3, 0.5, 0.8]) { const c = maskCoverage(l, lv, 'wear'); assert.ok(c >= prev && Math.abs(c - lv) < 0.06, `${l.name} wear coverage ${c} at ${lv}`); prev = c; } const d = maskCoverage(l, 0.4, 'dirt'); assert.ok(Math.abs(d - 0.4) < 0.06); }
  // normals are unit-ish and not flat; roughness within range
  for (const l of L) { let var2 = 0; for (let k = 0; k < 4096; k++) { const x = l.nr[0][k * 4] / 255 * 2 - 1, y = l.nr[0][k * 4 + 1] / 255 * 2 - 1; assert.ok(x * x + y * y <= 1.02); var2 += x * x + y * y; } assert.ok(var2 / 4096 > 1e-3, l.name + ' flat normals'); }
  for (const [k, v] of Object.entries(MATERIAL_MAP)) assert.ok(v.layer >= -1 && v.layer < TEX_LAYERS.length, 'material ' + k);
  for (const slot of [MAT.COAT, MAT.TROUSERS, MAT.SKIN, MAT.HAIR, MAT.LEATHER_BLACK, MAT.BRASS, MAT.WOOD, MAT.STEEL, MAT.CANVAS, MAT.FLAG_RED, MAT.HORSE_COAT]) assert.ok(MATERIAL_MAP[slot], 'no mapping for ' + slot);
  assert.ok(MATERIAL_MAP[MAT.COAT].army_override && MATERIAL_MAP[MAT.SKIN].stubble_rule);
});
test('rifle sockets are conformed to ANIM3D-NOTES section 8: the M1861 mesh has its wrist at 0.30 m, lock at 0.46 m, lower band at 0.85 m, upper band 1.15 m; other arms scale by length; skeleton.json carries the same; socket-spec.json agrees when it exists', () => {
  const m = lib.mesh('arm:m1861_springfield:b0', 0).meta.sockets; assert.ok(Math.abs(m.wrist[1] - M1861.wrist) < 1e-3 && Math.abs(m.lock_nipple[1] - M1861.lock) < 1e-3 && Math.abs(m.lower_band[1] - M1861.lower_band) < 1e-3 && Math.abs(m.upper_band[1] - M1861.upper_band) < 1e-3);
  const f = lib.mesh('arm:m1861_springfield:b0', 0).finalize(); let ring = null; for (let i = 0; i < f.nv; i++) if (f.mat[i] === MAT.WOOD && Math.abs(f.pos[i * 3 + 1] - humanRig.bones[humanRig.index.prop_long].head[1] - M1861.wrist) < 1e-4) ring = i; assert.ok(ring !== null, 'a stock ring lies exactly at the wrist');
  const K = 49 / 56, sh = lib.mesh('arm:harpers_ferry_rifle_m1855:b0', 0).meta.sockets; assert.ok(Math.abs(sh.wrist[1] - M1861.wrist * K) < 2e-3 && Math.abs(sh.lower_band[1] - M1861.lower_band * K) < 2e-3);
  const S = buildSkeletonJson().human.long_arm_sockets, g = n => S.find(s => s.name === n).offset[1]; assert.ok(Math.abs(g('wrist') - 0.30) < 1e-6 && Math.abs(g('lock_nipple') - 0.46) < 1e-6 && Math.abs(g('lower_band') - 0.85) < 1e-6 && Math.abs(g('upper_band') - 1.15) < 1e-6);
  const sp = path.join(DATA, 'socket-spec.json'); if (fs.existsSync(sp)) { const J2 = JSON.parse(fs.readFileSync(sp, 'utf8')), s = JSON.stringify(J2); assert.ok(s.includes('0.3') && s.includes('0.46') && s.includes('0.85'), 'socket-spec.json numbers differ from section 8'); }
  const R = JSON.parse(fs.readFileSync(path.join(DATA, 'rifle-sockets.json'), 'utf8')); assert.ok(Object.keys(R.arms).length >= 25);
});
test('body shapes with sack and frock coats: no trouser, coat or footwear layer pierces another at any of the 12 shapes (numeric, 1 mm tolerance); the coat never cuts into the body', () => {
  const sub = (mm, keep) => { const idx = []; for (let t = 0; t < mm.idx.length; t += 3) if (keep(mm.idx[t]) && keep(mm.idx[t + 1]) && keep(mm.idx[t + 2])) idx.push(mm.idx[t], mm.idx[t + 1], mm.idx[t + 2]); return { ...mm, idx: Uint32Array.from(idx) }; };
  const top = { brogan: 0.14, boot_tall: 0.34, gaiter: 0.26, legging: 0.29 }; let n = 0;
  for (const sh of BODY_SHAPES.filter((_, i) => i % 3 === 0 || i === 11)) {
    for (const cut of ['sack', 'frock', 'frock_double']) { const cf = lib.mesh('coat:' + cut, 0, sh).finalize(); let worst = 1e9; for (let i = 0; i < cf.meta.torsoNv; i++) { const y = cf.pos[i * 3 + 1]; if (y < 0.5) continue; const t = torsoAt(Math.min(1.46, y), sh); worst = Math.min(worst, (Math.hypot(cf.pos[i * 3] / t.rx, (cf.pos[i * 3 + 2] - t.cz) / t.rz) - 1) * (t.rx + t.rz) / 2); } assert.ok(worst > -0.0005, `${cut} shape ${sh.id} cuts into the body by ${worst}`);
      const outer = sub(cf, v => v < cf.meta.baseNv), grid = buildGrid(outer); for (const tr of Object.keys(TROUSER_CUTS)) { const t = lib.mesh(`trousers:${tr}:0:0:${trouserEnv(cut)}`, 0, sh).finalize(), r = layerReport(outer, t, { y0: COAT_CUTS[cut].hem + 0.03, y1: 0.9, tolMm: 1, grid }); assert.equal(r.over_tolerance, 0, `${tr} under ${cut} at shape ${sh.id}: ${JSON.stringify(r)}`); n++; } }
    for (const ft of Object.keys(top)) { const f = lib.mesh('foot:' + ft, 0, sh).finalize(), fo = sub(f, v => f.meta.baseRanges.some(([a, b]) => v >= a && v < b)), grid = buildGrid(fo); for (const tr of Object.keys(TROUSER_CUTS)) { const t = lib.mesh(`trousers:${tr}:0:0:0`, 0, sh).finalize(), r = layerReport(fo, t, { y0: 0.12, y1: top[ft], tolMm: 1, maxD: 0.05, grid }); assert.equal(r.over_tolerance, 0, `${tr} in ${ft} at shape ${sh.id}: ${JSON.stringify(r)}`); n++; } }
  }
  assert.ok(n >= 60); const I = JSON.parse(fs.readFileSync(path.join(DATA, 'interpenetration.json'), 'utf8')); assert.equal(I.summary.shapes, 12); assert.equal(I.summary.skirt_over_tolerance, 0); assert.equal(I.summary.footwear_over_tolerance, 0); assert.ok(I.summary.worst_coat_clearance_mm >= 0);
});
test('LOD chain continuity (G4) on the rasteriser: the merged mid and low meshes carry the four body shape keys; hand-over distances are recorded and meet 0.5 px and 2 L* at the swap', () => {
  const key = sys.classes().silhouettes[0].key, mid = sys.midMesh(key), low = sys.lowMesh(key); assert.equal(mid.meta.deltas.length, 4 * mid.nv * 3); assert.equal(low.meta.deltas.length, 4 * low.nv * 3);
  assert.ok(shapeWeights({ g: 1, c: -1 }).join() === '0,1,1,0'); const fm = mid.finalize(), shaped = applyShapeKeys(fm, mid.meta.deltas, { g: 1, c: 0 }); let moved = 0; for (let i = 0; i < fm.pos.length; i++) if (Math.abs(shaped.pos[i] - fm.pos[i]) > 1e-4) moved++; assert.ok(moved > 100, 'stocky key moves the mid mesh');
  const H = JSON.parse(fs.readFileSync(path.join(DATA, 'handover.json'), 'utf8')); assert.deepEqual(H.gate, { err_px: 0.5, dL: 2 }); assert.ok(H.handover_m['0-1'] !== null && H.handover_m['0-1'] <= 13, 'LOD0->LOD1 ' + H.handover_m['0-1']); assert.ok(H.handover_m['1-2'] !== null && H.handover_m['1-2'] <= 17, 'LOD1->LOD2 ' + H.handover_m['1-2']);
  for (const p of ['0-1', '1-2']) { const w = H.per_pair_worst_by_distance[p].find(x => x.d_m === H.handover_m[p]); assert.ok(w.err_px <= 0.5 && w.dL_mean <= 2, p + ' ' + JSON.stringify(w)); }
  const imp = H.per_pair_worst_by_distance['2-imp']; assert.ok(imp.find(x => x.d_m === 75).err_px <= 0.5, 'impostor silhouette from 75 m'); assert.equal(H.subjects.length, 6);
});
test('cost model (125,000 figures): new triangle counts, the measured radius rule, the verdict, the WebGL2 distance rule and the adaptive LOD-bias controller are all stated', () => {
  const C = JSON.parse(fs.readFileSync(path.join(DATA, 'cost-model.json'), 'utf8')), t = C.triangles_per_figure; assert.ok(t.lod0_close.median >= 38000 && t.lod0_close.median <= 50000); assert.ok(t.lod1_mid.median >= 1500 && t.lod2_low.median >= 400);
  assert.equal(C.figures, 125000); assert.ok(C.measured_handover.handover_m.lod0_to_lod1 <= 13 && C.measured_handover.rule.includes('LOD0 for d <')); const V = C.fits_125k; assert.ok(V.answer.startsWith('YES') && V.answer.includes('NO for the worst case')); assert.ok(V.dense_formation_worst_case.figure_ms.webgpu_arc > 7, 'the dense worst case is stated as over the allowance');
  assert.ok(V.bias_to_fit_dense_view.webgpu_arc > 0 && V.bias_to_fit_dense_view.webgl2_arc > 0 && V.bias_to_fit_dense_view.webgl2_arc < V.bias_to_fit_dense_view.webgpu_arc); assert.ok(Object.keys(V.per_shot_with_the_radius_rule).length === 7);
  assert.ok(C.webgl2_distance_rule.distance_rule.includes('BUDGET') && C.adaptive_lod_bias.law.includes('clamp(b') && C.adaptive_lod_bias.quality_cost.length === 5 && C.adaptive_lod_bias.gate_status.includes('NOT'));
  assert.ok(C.textures.bytes_bc7_MB < 4 && C.textures.layers === 18 && C.textures.round3.total_bc7_MB_with_material_array < 14); assert.ok(C.bytes.parts_bin_MB > 30);
});
test('contact sheets of the nine required subjects exist as PNGs at LOD0/LOD1/LOD2 (the report describes what they show)', () => {
  const dir = path.join(APP, 'tests/shots-figures3d'), need = ['union_private', 'iron_brigade', 'zouave_114pa', 'confederate_private', 'officer_sash_sword', 'drummer', 'flag_bearer'].flatMap(n => [n + '_lods.png', n + '_close.png']).concat(['cavalry_trooper_on_horse.png', 'gun_crew_napoleon.png']);
  for (const f of need) { const b = fs.readFileSync(path.join(dir, f)); assert.equal(b.subarray(1, 4).toString('latin1'), 'PNG', f); assert.ok(b.length > 20000, f + ' ' + b.length); }
});


// ======================================================================================= film-grade round 2 (2026-10-31): faces, hair, proportions, tack, horse, gear contact, poses
const bbox = f => { const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9]; for (let i = 0; i < f.nv; i++) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], f.pos[i * 3 + k]); hi[k] = Math.max(hi[k], f.pos[i * 3 + k]); } return { lo, hi }; };
const ofMat = (f, mat) => { const out = []; for (let i = 0; i < f.nv; i++) if (f.mat[i] === mat) out.push([f.pos[i * 3], f.pos[i * 3 + 1], f.pos[i * 3 + 2]]); return out; };
test('period anthropometrics: head height about 1/7.7 of the 1.73 m stature (1/8 to 1/7.2 allowed), head breadth to length 0.72-0.84, neck girth within 12 percent of Gould 1869 (13.638 in = 0.346 m), and the stature scale mean is brought to his 67.24 in mean', () => {
  const skinOnly = new Mesh('s'); buildHeadSkin(headParams(3), 0, skinOnly); const b = bbox(skinOnly.finalize()), H = b.hi[1] - b.lo[1], W = b.hi[0] - b.lo[0], D = b.hi[2] - b.lo[2];
  assert.ok(H > 1.73 / 8.0 && H < 1.73 / 7.2, 'head height ' + H); assert.ok(W / D > 0.72 && W / D < 0.84, 'breadth/length ' + (W / D));
  const ec = lib.mesh('head:3', 0).finalize(), nk = []; for (let i = 0; i < ec.nv; i++) if (Math.abs(ec.pos[i * 3 + 1] - 1.505) < 0.002 && ec.mat[i] === MAT.SKIN && ec.pos[i * 3 + 2] < 0.1) nk.push([ec.pos[i * 3], ec.pos[i * 3 + 2]]);
  const rx = Math.max(...nk.map(p => Math.abs(p[0]))), zs = nk.map(p => p[1]), rz = (Math.max(...zs) - Math.min(...zs)) / 2, girth = Math.PI * (3 * (rx + rz) - Math.sqrt((3 * rx + rz) * (rx + 3 * rz)));
  assert.ok(Math.abs(girth - 0.346) / 0.346 < 0.12, 'neck girth ' + girth);
  const hnp = (b.hi[1] - 1.4738) / 1.73; assert.ok(Math.abs(hnp - 0.1481) / 0.1481 < 0.05, 'head-and-neck proportion ' + hnp + ' vs Gould 0.1481');   // C7 at 1.4738 m = 1.73 x (1 - 0.1481)
  const GOULD_MEAN_M = 67.240 * 0.0254, mean = Array.from({ length: 256 }, (_, i) => 1.73 * (0.93 + 0.115 * i / 255)).reduce((a, c) => a + c, 0) / 256; assert.ok(Math.abs(mean - GOULD_MEAN_M) < 0.012, `mean stature ${mean} vs Gould ${GOULD_MEAN_M}`);
  const sc = []; for (let k = 0; k < 400; k++) sc.push(unpackInstance(sys.instance(manifestFor(kit, { soldierId: 'z:' + k, unitId: 'DEFAULT.union.infantry', seed: 1863, date: '1863-07-02', rank: 'private', role: 'rifleman' })).words).stature_scale);
  const mm = sc.reduce((a, c) => a + c, 0) / sc.length; assert.ok(Math.abs(1.73 * mm - GOULD_MEAN_M) < 0.015, 'population mean stature ' + 1.73 * mm);
});
test('24 head shapes are 24 distinct men: every pair of skins differs by at least 0.5 mm RMS, and the shape parameters span their ranges widely (age, brow, nose, jaw, chin, ear size, eye tilt)', () => {
  // descriptor: the largest radius from the head centre in 16 x 12 direction bins (vertex counts differ between heads because the slit width differs, so the vertices are not compared one to one)
  const P = []; for (let i = 0; i < N_HEADS; i++) { const m = new Mesh('h'); buildHeadSkin(headParams(i), 0, m); const f = m.finalize(), R = new Float64Array(16 * 12);
    for (let v = 0; v < f.nv; v++) { const x = f.pos[v * 3] - HEAD_C[0], y = f.pos[v * 3 + 1] - HEAD_C[1], z = f.pos[v * 3 + 2] - HEAD_C[2], r = Math.hypot(x, y, z), az = Math.floor((Math.atan2(x, z) + Math.PI) / (2 * Math.PI) * 16) % 16, el = Math.min(11, Math.floor((Math.acos(y / r)) / Math.PI * 12)); R[el * 16 + az] = Math.max(R[el * 16 + az], r); } P.push(R); }
  let worst = 1e9; for (let a = 0; a < N_HEADS; a++) for (let b = a + 1; b < N_HEADS; b++) { let s = 0, n = 0; for (let k = 0; k < P[a].length; k++) if (P[a][k] > 0 && P[b][k] > 0) { const d = P[a][k] - P[b][k]; s += d * d; n++; } worst = Math.min(worst, Math.sqrt(s / n)); }
  assert.ok(worst > 0.0006, 'closest pair RMS ' + worst);
  for (const [k, lo, hi] of [['age', 0.5, 0.2], ['brow', 0.006, 0.004], ['noseProj', 0.026, 0.020], ['jawW', 0.7, 0.3], ['chinW', 0.7, 0.3], ['earSize', 1.08, 0.96], ['eyeTilt', 0.04, -0.04]]) { const v = Array.from({ length: N_HEADS }, (_, i) => headParams(i)[k]); assert.ok(Math.max(...v) > lo && Math.min(...v) < hi, `${k}: ${Math.min(...v)}..${Math.max(...v)}`); }
});
test('face construction: lips are shaped ribbons (the skin grid carries no lip vertices: no stair-stepped lip band), lids and ears are thin skin (flag 255), the eyeball is recessed behind the brow ridge, lashes and brows are hair', () => {
  const sk = new Mesh('s'); buildHeadSkin(headParams(3), 0, sk); assert.equal(sk.finalize().mat.filter(m => m === MAT.LIP).length, 0, 'lip material on the skin grid');
  const f = lib.mesh('head:3', 0).finalize(); assert.ok(f.mat.filter(m => m === MAT.LIP).length > 200, 'lip ribbons'); assert.ok(f.flags.filter(v => v === 255).length > 800, 'thin skin flags'); assert.ok(f.mat.filter(m => m === MAT.HAIR).length > 300, 'brows and lashes');
  const white = ofMat(f, MAT.EYE_WHITE), apex = Math.max(...white.map(p => p[2])), brow = sk.finalize(), browZ = (() => { let z = -1; for (let i = 0; i < brow.nv; i++) { const x = Math.abs(brow.pos[i * 3]), y = brow.pos[i * 3 + 1] - HEAD_C[1]; if (x < 0.05 && y > 0.012 && y < 0.03) z = Math.max(z, brow.pos[i * 3 + 2]); } return z; })();
  assert.ok(apex < browZ + 0.002, `eye apex ${apex} brow ${browZ}`);
  const lipsYs = ofMat(f, MAT.LIP).map(p => p[1]); assert.ok(Math.max(...lipsYs) - Math.min(...lipsYs) > 0.012 && Math.max(...lipsYs) - Math.min(...lipsYs) < 0.03, 'lip height range');
});
test('hair and facial hair are volumetric shells with soft buried edges: the offset slope between neighbouring grid vertices stays under 2.2 (hair) and 4.2 (beards), so no cliff and no stair-stepped boundary; all 8 styles and 6 beard types cover a believable share of the head', () => {
  for (let i = 0; i < 8; i++) { const st = shellStats('hair', i); assert.ok(st.maxSlope < 2.2, `hair ${i} slope ${st.maxSlope}`); assert.ok(st.covered > 0.10 && st.covered < 0.65, `hair ${i} covers ${st.covered}`); }
  for (let t = 1; t < 7; t++) { const st = shellStats('beard', t); assert.ok(st.maxSlope < 4.2, `beard ${t} slope ${st.maxSlope}`); assert.ok(st.covered > 0.01, `beard ${t} covers ${st.covered}`); }
  assert.ok(lib.mesh('beard:3', 0).nt > lib.mesh('beard:1', 0).nt * 5, 'a full beard is a large mass with a hanging tail'); assert.ok(lib.mesh('hair:1', 0).nt <= 4200 && lib.mesh('beard:3', 0).nt <= 3600);
});
test('triangle winding agrees with the vertex normals (no inside-out parts for a back-face-culling renderer): head with eyes and lips, hat visor, canteen, horse, coat, shoe, hair, beard', () => {
  for (const id of ['head:7', 'hat:kepi', 'hat:cap', 'horse:riding', 'acc:canteen:tin', 'coat:sack', 'foot:brogan', 'hair:3', 'beard:3']) {
    const m = lib.mesh(id, 0).finalize(); let bad = 0, n = 0; const P = i => [m.pos[i * 3], m.pos[i * 3 + 1], m.pos[i * 3 + 2]];
    for (let t = 0; t < m.idx.length; t += 3) { const [a, b, c] = [m.idx[t], m.idx[t + 1], m.idx[t + 2]], pa = P(a), pb = P(b), pc = P(c), u = [pb[0] - pa[0], pb[1] - pa[1], pb[2] - pa[2]], v = [pc[0] - pa[0], pc[1] - pa[1], pc[2] - pa[2]], nn = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]], l = Math.hypot(...nn); if (l < 1e-12) continue;
      let d = 0; for (const i of [a, b, c]) d += nn[0] * m.nrm[i * 3] + nn[1] * m.nrm[i * 3 + 1] + nn[2] * m.nrm[i * 3 + 2]; n++; if (d < 0) bad++; }
    assert.ok(bad / n < 0.01, `${id}: ${bad} of ${n} triangles face against their normals`); }
});
test('cap visor: a dished, rounded, 2.4 mm thick leather bill sloping down (not a flat plank) on the kepi, forage and plain caps; the chin strap is worn up round the crown, not hanging as sticks', () => {
  for (const [id, len] of [['hat:kepi', 0.05], ['hat:forage', 0.045], ['hat:cap', 0.036]]) { const f = lib.mesh(id, 0).finalize(), v = ofMat(f, MAT.LEATHER_BLACK), zs = v.map(p => p[2]), ys = v.map(p => p[1]);
    assert.ok(Math.max(...zs) - (HEAD_C[2] + 0.083) > len, id + ' bill length ' + (Math.max(...zs) - HEAD_C[2] - 0.083)); assert.ok(Math.max(...ys) - Math.min(...ys) > 0.012, id + ' dish'); }
  const k = lib.mesh('hat:kepi', 0).finalize(), hang = ofMat(k, MAT.LEATHER_BLACK).filter(p => p[1] < 1.62); assert.equal(hang.length, 0, 'no strap hanging below the crown');
  for (let lod = 1; lod <= 2; lod++) assert.ok(lib.mesh('hat:kepi', lod).nt > 0);
});
test('hanging gear touches: the canteen drum hangs flat against the left hip (faces outward), its two strap runs end at its lugs, the haversack strap runs end at the bag top, the cartridge-box loops reach the belt', () => {
  const cn = lib.mesh('acc:canteen:tin', 0).finalize(), drum = ofMat(cn, MAT.BLANKET), xs = drum.map(p => p[0]), zs = drum.map(p => p[2]);
  assert.ok(Math.max(...xs) - Math.min(...xs) < 0.07 && Math.max(...zs) - Math.min(...zs) > 0.15, 'drum is flat against the hip: thin in x, wide in z');
  const hip = torsoAt(CANTEEN_C[1]), inner = Math.min(...xs); assert.ok(inner > hip.rx - 0.02 && inner < hip.rx + 0.07, `drum inner face ${inner} vs hip ${hip.rx}`);
  const strapPts = ofMat(cn, MAT.LEATHER_BLACK); for (const lug of canteenLugs()) assert.ok(Math.min(...strapPts.map(p => Math.hypot(p[0] - lug[0], p[1] - lug[1], p[2] - lug[2]))) < 0.02, 'canteen strap reaches its lug');
  const hv = lib.mesh('acc:haversack:painted', 0).finalize(), canvas = ofMat(hv, MAT.CANVAS); for (const lug of haversackLugs()) assert.ok(Math.min(...canvas.map(p => Math.hypot(p[0] - lug[0], p[1] - lug[1], p[2] - lug[2]))) < 0.02, 'haversack strap reaches its lug');
  const cb = lib.mesh('acc:cartbox:union', 0).finalize(), lt = ofMat(cb, MAT.LEATHER_BLACK).filter(p => p[1] > 0.975 && p[1] < 1.01 && p[0] < -0.12); assert.ok(lt.length > 8, 'belt loops reach the belt (0.985-1.03)');
  for (const kind of ['canteen:tin', 'haversack:painted']) for (const lod of [1, 2]) assert.ok(lib.mesh('acc:' + kind, lod).nt > 0);
});
test('horse anatomy and tack: withers 1.45-1.60 m with the back dipping behind them, hooves on the ground with a wide sole, a flat knee wider fore-aft than the cannon, the saddle seat top 0.06-0.14 m under the rider pelvis socket, stirrup treads at the human foot socket height', () => {
  const f = lib.mesh('horse:riding', 0).finalize(), coat = ofMat(f, MAT.HORSE_COAT), ymax = Math.max(...coat.map(p => p[1])); assert.ok(ymax > 1.78 && ymax < 1.95, 'highest coat point (ears and poll) ' + ymax);
  const back = coat.filter(p => Math.abs(p[0]) < 0.03 && p[2] > -0.1 && p[2] < 0.2), withers = coat.filter(p => Math.abs(p[0]) < 0.03 && p[2] > 0.38 && p[2] < 0.55), wy = Math.max(...withers.map(p => p[1])); assert.ok(wy > 1.45 && wy < 1.60, 'withers ' + wy); assert.ok(Math.max(...back.map(p => p[1])) < wy - 0.03, 'back dips behind the withers');
  const hoof = ofMat(f, MAT.HORSE_HOOF); assert.ok(Math.min(...hoof.map(p => p[1])) < 0.002 && Math.max(...hoof.map(p => Math.abs(p[0]))) > 0.15 + 0.055, 'hooves on the ground, wide sole');
  const legs = coat.filter(p => p[0] > 0.08 && p[2] > 0.3 && p[1] < 0.9), knee = legs.filter(p => p[1] > 0.53 && p[1] < 0.57), cannon = legs.filter(p => p[1] > 0.30 && p[1] < 0.34), depth = a => Math.max(...a.map(p => p[2])) - Math.min(...a.map(p => p[2])); assert.ok(depth(knee) > depth(cannon) * 1.3, `knee ${depth(knee)} cannon ${depth(cannon)}`);
  const sad = ofMat(f, MAT.SADDLE_LEATHER), seatTop = Math.max(...sad.filter(p => Math.abs(p[0]) < 0.1 && p[2] > -0.25 && p[2] < 0.3 && p[1] < 1.62).map(p => p[1])), pelvisY = 1.44 + 0.10 + (0.92 - 0.80); assert.ok(pelvisY - seatTop > 0.06 && pelvisY - seatTop < 0.14, `pelvis ${pelvisY} seat ${seatTop}`);
  const irons = ofMat(f, MAT.IRON).filter(p => Math.abs(p[0]) > 0.2 && p[1] > 0.9 && p[1] < 1.1), tread = Math.min(...irons.map(p => p[1])); assert.ok(Math.abs(tread - (1.30 - 0.35)) < 0.05, 'stirrup tread ' + tread);
  assert.ok(lib.mesh('horse:draught', 0).nt > 12000);
});
test('poses from the ANIMATION clips (read-only): the rider_walk seat puts the pelvis 0.05-0.16 m above the saddle seat and the ankles near the stirrups; a crew clip yields finite skin matrices and moves the hands', () => {
  const S = skinMatrices('rider_walk', 0.25), rigH = JSON.parse(fs.readFileSync(path.join(DATA, 'skeleton.json'), 'utf8')).human, at = n => { const b = rigH.bones[rigH.index[n]], q = rigH.index[n] * 12, M = S.M; return [M[q] * b.head[0] + M[q + 1] * b.head[1] + M[q + 2] * b.head[2] + M[q + 3], M[q + 4] * b.head[0] + M[q + 5] * b.head[1] + M[q + 6] * b.head[2] + M[q + 7] + 1.54, M[q + 8] * b.head[0] + M[q + 9] * b.head[1] + M[q + 10] * b.head[2] + M[q + 11] + 0.04]; };
  const pel = at('pelvis'), seat = 1.56; assert.ok(pel[1] - seat > 0.05 && pel[1] - seat < 0.16, 'pelvis y ' + pel[1]);
  for (const n of ['foot_L', 'foot_R']) { const a = at(n); assert.ok(a[1] > 0.95 && a[1] < 1.2 && Math.abs(Math.abs(a[0]) - 0.285) < 0.12, `${n} ${a}`); }
  const C = skinMatrices('gun_crew_n1', 16.0).M; assert.ok(C.every(Number.isFinite)); const m = lib.mesh('hands', 0).finalize(), p = poseFromClip([m], null, 0, { M: C })[0]; let moved = 0; for (let i = 0; i < m.nv; i += 7) if (Math.hypot(p.pos[i * 3] - m.pos[i * 3], p.pos[i * 3 + 1] - m.pos[i * 3 + 1], p.pos[i * 3 + 2] - m.pos[i * 3 + 2]) > 0.05) moved++; assert.ok(moved > 20, 'the sponge/ram pose moves the hands');
});
test('skin shading is specified in the procedural material (wrapped diffuse plus a terminator scatter band, boosted on thin skin) and exported with the materials; the lip colour follows the skin tone', () => {
  const M = JSON.parse(fs.readFileSync(path.join(DATA, 'materials.json'), 'utf8')); assert.ok(M.skin_sss && M.skin_sss.wrap > 0.2 && M.skin_sss.scatter_rgb[0] > M.skin_sss.scatter_rgb[2] && M.skin_sss.thin_boost > 1 && M.skin_sss.tier === 'plausible-procedural');
  assert.ok(M.skin_sss.materials.includes(MAT.SKIN) && M.skin_sss.materials.includes(MAT.LIP));
  const m = manifestFor(kit, { soldierId: 'y:1', unitId: 'DEFAULT.union.infantry', seed: 1863, date: '1863-07-02', rank: 'private', role: 'rifleman' }), r = sys.instance(m), c = resolveColours(r.variant, r.identity, 0.3); assert.ok(c[MAT.LIP][0] > c[MAT.LIP][1] && c[MAT.LIP][0] > c[MAT.SKIN][0] * 0.8 && c[MAT.LIP][1] < c[MAT.SKIN][1], 'lip is a redder, darker skin tone');
});
