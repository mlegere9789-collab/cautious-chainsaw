// Exporter for the Battle Theatre figure models: writes data/figures3d/ (skeleton.json, parts.bin + parts.json, materials.json, TIERS.json, flag patterns, impostor atlas, glTF samples, hashes.json, manifest.json).
// node docs/battle-theatre/app/tools/figures3d-build.mjs [--out DIR] [--no-gltf] [--no-impostors] [--quiet]     (about 10-20 s; run at below-normal priority: cmd /c start /low /wait /b node ...)
// Deterministic: no clock, no Math.random; every output has a sha256 recorded in hashes.json (and re-checked by tests/figures3d.test.mjs).
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; import { fileURLToPath } from 'node:url';
import { createFigureSystem, buildSkeletonJson, GLOBAL_MATERIALS, flagPattern, FLAG_EVIDENCE } from '../src/figures3d/index.mjs';
import { packMesh } from '../src/figures3d/meshkit.mjs';
import { buildCatalog } from '../src/figures3d/catalog.mjs';
import { SHAPE_KEYS } from '../src/figures3d/body.mjs';
import { MAT_NAMES, MAT, VARIANT_SLOTS, SKIN_SSS } from '../src/figures3d/palette.mjs';
import { FLAG_KINDS, FLAG_STATES } from '../src/figures3d/flags.mjs';
import { pngEncode } from '../src/figures3d/png.mjs';
import { buildGlb } from '../src/figures3d/gltf.mjs';
import { TIERS, GAP_NOTE } from '../src/figures3d/tiers.mjs';
import { Kit, manifestFor } from '../src/history/manifest.mjs';
import { resolveColours } from '../src/figures3d/variants.mjs';
import { partsForFigure, partsAtLod } from '../src/figures3d/library.mjs';
import { humanRig } from '../src/figures3d/skeleton.mjs';
import { WEAPON_VISUALS } from '../src/figures3d/visuals.mjs';
import { buildMaterialArray, arrayBytes, TEX_LAYERS, MATERIAL_MAP, TEX_SIZE, MIP_LEVELS } from '../src/figures3d/texmaps.mjs';
import { M1861 } from '../src/figures3d/rifle-spec.mjs';
import { bakeHairAtlas, hairAtlasHash, HAIR_TEX, VARIANT_PARAMS } from '../src/figures3d/hairtex.mjs';
import { bakeHeadMaps } from '../src/figures3d/skinmap.mjs';
import { headParams, N_HEADS } from '../src/figures3d/head.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), APP = path.join(here, '..'), BT = path.join(APP, '..');
const args = process.argv.slice(2), has = f => args.includes(f), val = f => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };
const OUT = val('--out') ?? path.join(APP, 'data/figures3d'), quiet = has('--quiet'), log = (...a) => { if (!quiet) console.log(...a); };
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const J = f => JSON.parse(fs.readFileSync(path.join(BT, 'kit', f), 'utf8'));
const stable = o => JSON.stringify(o, null, 1) + '\n';
fs.mkdirSync(OUT, { recursive: true }); for (const d of ['gltf', 'textures']) fs.mkdirSync(path.join(OUT, d), { recursive: true });
const hashes = {}, files = {};
const write = (rel, data) => { const buf = typeof data === 'string' ? Buffer.from(data, 'utf8') : Buffer.from(data.buffer ? data.buffer : data, data.byteOffset ?? 0, data.byteLength ?? data.length); fs.writeFileSync(path.join(OUT, rel), buf); files[rel] = { bytes: buf.length, sha256: sha(buf) }; };

const sys = createFigureSystem(), catalog = buildCatalog(), lib = sys.lib;
// ---- skeleton
const skel = buildSkeletonJson(); { const body = JSON.stringify(skel, null, 1); skel.content_sha256 = sha(body); write('skeleton.json', JSON.stringify(skel, null, 1) + '\n'); }
// ---- parts.bin
const chunks = []; let off = 0; const parts = {}, align = n => (n + 3) & ~3;
const put = bytes => { const o = off; chunks.push(Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength)); off += bytes.byteLength; const pad = align(off) - off; if (pad) { chunks.push(Buffer.alloc(pad)); off += pad; } return o; };
let totalTris = [0, 0, 0], totalVerts = [0, 0, 0];
const t0 = Date.now();
for (const id of catalog) {
  const entry = { id, lods: [] };
  for (let lod = 0; lod < 3; lod++) {
    const p = lib.part(id, lod), m = p.mesh, pk = packMesh(m), b = lib.mesh(id, lod).bounds();
    const vo = put(pk.vertices), io = put(pk.indices); let dlo = null, scale = null;
    if (p.deltas) { const q = new Int16Array(p.deltas.length); scale = 1e-4; for (let i = 0; i < q.length; i++) q[i] = Math.max(-32767, Math.min(32767, Math.round(p.deltas[i] / scale))); dlo = put(q); }
    const h = crypto.createHash('sha256'); h.update(pk.vertices); h.update(pk.indices); if (p.deltas) h.update(Buffer.from(p.deltas.buffer)); const hs = h.digest('hex');
    entry.lods.push({ lod, nv: m.nv, nt: m.nt, vertex_offset: vo, vertex_bytes: pk.vertices.length, index_offset: io, index_bytes: pk.index_bytes, index_count: m.idx.length, delta_offset: dlo, delta_scale_m: scale, delta_keys: dlo === null ? 0 : SHAPE_KEYS.length, bounds: { lo: b.lo.map(x => +x.toFixed(4)), hi: b.hi.map(x => +x.toFixed(4)) }, sha256: hs });
    hashes['part:' + id + '@' + lod] = hs; if (id.startsWith('head:') || !(id.startsWith('horse') || id.startsWith('tube') || id === 'carriage' || id === 'limber' || id === 'caisson' || id.startsWith('implement'))) { totalTris[lod] += m.nt; totalVerts[lod] += m.nv; }
    if (lod === 0) entry.meta = { closed: !!(m.meta && m.meta.closed), flag_cloth: !!(m.meta && m.meta.cloth), double_sided: !!(m.meta && m.meta.doubleSided), sockets: m.meta && m.meta.sockets ? m.meta.sockets : undefined, muzzle_z_m: m.meta && m.meta.muzzle_z_m, overall_m: m.meta && m.meta.overall_m };
  }
  parts[id] = entry;
}
const bin = Buffer.concat(chunks); write('parts.bin', bin);
log(`parts: ${catalog.length} ids, ${(bin.length / 1048576).toFixed(2)} MB, built in ${Date.now() - t0} ms; (human parts) triangles over all ids per LOD ${totalTris.join(' / ')}`);
write('parts.json', stable({ schema: 'figures3d-parts-1', vertex_bytes: 32, vertex_layout: 'pos f32x3 | normal snorm8x4 | uv unorm16x2 | joints u8x4 | weights unorm8x4 (sum 255) | material u8, flags u8, pad x2', index_layout: 'u16 when nv < 65536 else u32, triangle list, counter-clockwise outward', delta_layout: 'int16 x (keys x nv x 3), key order lean, stocky, narrow, broad; metres = int16 * delta_scale_m; position = base + sum(w_k * delta_k) with the instance shape (build, chest) mapped to the four keys',
  shape_keys: SHAPE_KEYS, bodies: 'body_shape 0..11 = build index * 3 + chest index; builds [-1,-0.35,0.35,1], chests [-1,0,1]', catalog_order: catalog, parts }));
// ---- materials
write('materials.json', stable({ schema: 'figures3d-materials-1', note: 'rows are [r,g,b (sRGB 0-255), roughness, metallic]; slots in variant_slots take their colour from the outfit variant row; SKIN/HAIR/IRIS from the instance identity; all values plausible-procedural (TIERS.json F-COLOUR-RGB)',
  slots: Object.entries(MAT).map(([name, id]) => ({ id, name, row: GLOBAL_MATERIALS[id], variant_slot: VARIANT_SLOTS.includes(id) })), variant_slots: VARIANT_SLOTS, skin_sss: SKIN_SSS, alpha_modes: { [MAT.HAIR_CARD]: 'alpha-to-coverage', [MAT.BEARD_CARD]: 'alpha-to-coverage' }, vertex_flag_byte: { skin_grid: '64 = head skin map region (skinmap.mjs)', thin_skin: '255 = lids, ears, lips (scatter boost)', cloth: 'low 6 bits = wrinkle intensity 0..63 (fold normal map strength), bit 7 = vertical drape (swap u and v of the fold layer)', strand_cards: 'low 5 bits = coverage 0..31 (fibres whose id exceeds the coverage are dropped), bits 5..7 = strand variant 0..7 (hairtex.mjs)' }, thin_skin_flag: 'vertex flag byte 255 marks thin skin (ear, nostril wing, lids, lips) for scatter_strength x thin_boost; 0 elsewhere' }));
// ---- flag patterns
for (const kind of FLAG_KINDS) for (const st of (kind === 'anv_battle' ? ['intact', 'torn'] : ['intact'])) { const p = flagPattern(kind, st); const png = pngEncode(p.width, p.height, p.rgba); write(`textures/flag_${kind}_${st}.png`, png); hashes[`flag:${kind}:${st}`] = sha(Buffer.from(p.rgba)); }
// ---- procedural material maps (texmaps.mjs): layer hashes, byte budget, per-material mapping; a small preview PNG (albedo modulation over normal) for inspection. The maps themselves are regenerated in code at load.
{ const t0 = Date.now(), L = buildMaterialArray(), bytes = arrayBytes(), S = 96, cols = 6, rows = Math.ceil(L.length / cols), W = cols * S, H = rows * S * 2, prev = new Uint8Array(W * H * 4);
  L.forEach((l, i) => { const cx = (i % cols) * S, cy = Math.floor(i / cols) * S * 2; for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const p = (Math.floor(y * TEX_SIZE / S) * TEX_SIZE + Math.floor(x * TEX_SIZE / S)) * 4, a = l.am[0][p]; prev.set([a, a, a, 255], ((cy + y) * W + cx + x) * 4); prev.set([l.nr[0][p], l.nr[0][p + 1], 200, 255], ((cy + S + y) * W + cx + x) * 4); } });
  write('texmaps-preview.png', pngEncode(W, H, prev));
  const root = sha(Buffer.from(L.map(l => l.name + '=' + l.sha256).join(String.fromCharCode(10))));
  write('texmaps.json', stable({ schema: 'figures3d-texmaps-1', tier: 'plausible-procedural (TIERS.json F-TEXMAPS)', note: 'generated in code (src/figures3d/texmaps.mjs); not stored; mesh UV are surface metres (16.384 m range at 0.25 mm), a layer tiles every tile_m metres', size: TEX_SIZE, mip_levels: MIP_LEVELS, maps: { NR: 'R normal x, G normal y, B roughness, A height/cavity', AM: 'R albedo luminance modulation (128 = 1.0), G micro tint, B wear mask, A dirt mask; worn where B < wear_level*255, dirty where A < dirt_level*255' },
    layers: L.map(l => ({ index: l.index, name: l.name, tile_m: TEX_LAYERS[l.index].tile_m, normal_strength: TEX_LAYERS[l.index].nrm, wear_gain: TEX_LAYERS[l.index].wear, dirt_gain: TEX_LAYERS[l.index].dirt, note: TEX_LAYERS[l.index].note, sha256: l.sha256 })), root_sha256: root, bytes, material_map: Object.fromEntries(Object.entries(MATERIAL_MAP).map(([k, v]) => [k, v])) }));
  hashes['texmaps:root'] = root; log(`texmaps: ${L.length} layers, ${(bytes.raw_rgba8_bytes / 1048576).toFixed(1)} MB raw, ${(bytes.bc7_bytes / 1048576).toFixed(2)} MB BC7, ${Date.now() - t0} ms`); }
// mean colour of each flag pattern (the far impostor draws the flag cloth in this colour)
const flagMean = {}; for (const kind of FLAG_KINDS) { const p = flagPattern(kind, 'intact'); let r = 0, g = 0, bl = 0, n = p.width * p.height; for (let i = 0; i < p.rgba.length; i += 4) { r += p.rgba[i]; g += p.rgba[i + 1]; bl += p.rgba[i + 2]; } flagMean[kind] = [Math.round(r / n), Math.round(g / n), Math.round(bl / n)]; }
write('flag-mean-colours.json', stable({ schema: 'figures3d-flagmean-1', note: 'sRGB mean of each flag pattern; the impostor bakes the flag cloth as material FLAG_WHITE and the renderer substitutes this colour per variant flag kind', mean: flagMean }));
// ---- TIERS.json
write('TIERS.json', stable({ schema: 'figures3d-tiers-1', note: 'Every undocumented visual choice with its tier. The kit manifest field tiers (documented / inferred / plausible-procedural) are inherited by the corresponding visual; nothing here is documented.', gap_rule: GAP_NOTE, flags: FLAG_EVIDENCE, choices: TIERS }));

// ---- the population (kit-wide: every unit that was at Gettysburg x 3 ranks x 2 dates x 12 men) -> variants, classes, impostor atlas, glTF samples
const kit = new Kit({ specs: J('kit_specs.json'), weapons: J('weapons.json'), artillery: J('artillery_batteries.json'), cavalry: J('cavalry_units.json') });
let nMan = 0; const pop = [];
for (const [uid, u] of Object.entries(kit.units)) {
  if (u.presence.status !== 'present_at_gettysburg') continue;
  for (const v of (u.variants ? Object.keys(u.variants) : [null])) for (const date of ['1863-07-01', '1863-07-03']) for (const rank of ['private', 'sergeant', 'captain']) for (let k = 0; k < 12; k++) {
    const m = manifestFor(kit, { soldierId: uid + ':' + k, unitId: uid, seed: 1863, date, rank, role: 'rifleman', variant: v }); const r = sys.instance(m); nMan++; if (k === 0 && date === '1863-07-01' && rank === 'private') pop.push({ uid, r }); }
}
const cls = sys.classes(); log(`population: ${nMan} manifests, ${sys.table.list.length} outfit variants, ${cls.silhouettes.length} mid silhouette classes, ${cls.accessories.length} accessory classes, ${cls.impostors.length} impostor classes`);
// mid / low class composites: tri counts and hashes
const classRows = [];
for (const s of cls.silhouettes) { const mid = sys.midMesh(s.key), low = sys.lowMesh(s.key), fm = mid.finalize(), fl = low.finalize(), hm = sha(Buffer.from(packMesh(fm).vertices)), hl = sha(Buffer.from(packMesh(fl).vertices)); hashes['mid:' + s.key] = hm; hashes['low:' + s.key] = hl; classRows.push({ index: s.index, key: s.key, mid_tris: fm.nt, low_tris: fl.nt, mid_sha256: hm, low_sha256: hl }); }
write('classes.json', stable({ schema: 'figures3d-classes-1', note: 'silhouette classes found in the kit-wide population sample; mid/low meshes are composed at load from the LOD1/LOD2 parts (parts.json) with the 36-bone mid skeleton map; accessory classes are merged LOD1 accessory meshes; impostor classes index impostor-atlas.png rows', silhouettes: classRows, accessories: cls.accessories, impostors: cls.impostors.map(c => ({ index: c.index, key: c.key })) }));
// impostor atlas sheet: one row of 8 views per impostor class (pivot at the bottom centre; tall classes (flags) are 3.0 m high in the same 64 px)
if (!has('--no-impostors')) {
  const vw = 48, vh = 64, nV = 8, rows = cls.impostors.length, sheet = new Uint8Array(nV * vw * rows * vh * 4), idxRows = [];
  for (const c of cls.impostors) { const a = sys.impostor(c.key); for (let y = 0; y < vh; y++) sheet.set(a.rgba.subarray(y * a.width * 4, (y + 1) * a.width * 4), ((c.index * vh + y) * nV * vw) * 4); idxRows.push({ index: c.index, key: c.key, row: c.index, height_m: a.height_m, ppm: +a.ppm.toFixed(3) }); hashes['impostor:' + c.key] = sha(Buffer.from(a.rgba)); }
  write('impostor-atlas.png', pngEncode(nV * vw, rows * vh, sheet)); write('impostor-atlas.json', stable({ schema: 'figures3d-impostors-1', view_w: vw, view_h: vh, views: nV, view_yaws_deg: Array.from({ length: nV }, (_, i) => i * 45), view_convention: 'yaw 0 = the viewer in front of the figure; +yaw moves the viewer toward the figure\'s left', channels: 'R material id (0 = empty) | G,B view normal x,y (0..255 = -1..1) | A baked shade; the colour comes from the outfit variant palette; pose: the rig rest (order arms); frames per animation clip are baked by ANIMATION with impostor.mjs bakeImpostor', rows: idxRows }));
  log(`impostor atlas ${nV * vw} x ${rows * vh}`);
}
// ---- glTF samples (close LOD) for inspection
if (!has('--no-gltf')) {
  const pick = [['US.19IN', 'private', 1, 'iron_brigade_private'], ['US.114PA', 'private', 2, 'zouave_114pa_flagbearer'], ['DEFAULT.confederate.infantry', 'private', 3, 'confederate_default_private'], ['DEFAULT.union.cavalry', 'captain', 0, 'union_cavalry_officer'], ['US.SUP.MUSICIAN', 'private', 0, 'union_musician']];
  for (const [uid, rank, k, name] of pick) {
    const m = manifestFor(kit, { soldierId: uid + ':' + k, unitId: uid, seed: 1863, date: '1863-07-02', rank, role: 'rifleman' }), r = sys.instance(m), list = partsAtLod(partsForFigure(r.variant, r.variant.mask, r.words[3] & 255, r.identity), 0);
    const pal = resolveColours(r.variant, r.identity, m.wear_state.level); const glb = buildGlb({ meshes: list.map(p => lib.mesh(p.id, 0).finalize()), rig: humanRig, palette: pal, name }); write(`gltf/${name}.glb`, glb); hashes['gltf:' + name] = sha(Buffer.from(glb));
  }
  const pal = GLOBAL_MATERIALS.map(r => [r[0], r[1], r[2]]);
  write('gltf/horse_riding.glb', buildGlb({ meshes: [lib.mesh('horse:riding', 0).finalize()], rig: sys.skeleton.horse, palette: pal, name: 'horse_riding' }));
  write('gltf/napoleon_12pdr_gun.glb', buildGlb({ meshes: [lib.mesh('tube:napoleon_12pdr_m1857', 0).finalize(), lib.mesh('carriage', 0).finalize(), lib.mesh('limber', 0).finalize()], rig: sys.skeleton.gun, palette: pal, name: 'napoleon_12pdr_gun' }));
}
// ---- rifle socket conformance: each long arm's mesh sockets against the M1861 numbers the animation's grips use (ANIM3D-NOTES section 8)
{ const rows = {}; for (const [id, w] of Object.entries(WEAPON_VISUALS)) { if (w.type !== 'long') continue; const m = lib.mesh(`arm:${id}:b0`, 0), S = m.meta.sockets, K = w.spec.overall_in / 56; rows[id] = { overall_m: +m.meta.overall_m.toFixed(4), wrist_m: +S.wrist[1].toFixed(4), lock_m: +S.lock_nipple[1].toFixed(4), lower_band_m: +S.lower_band[1].toFixed(4), upper_band_m: +S.upper_band[1].toFixed(4), muzzle_m: +S.muzzle[1].toFixed(4), expected_from_M1861_scaled_by_length: { wrist: +(M1861.wrist * K).toFixed(4), lock: +(M1861.lock * K).toFixed(4), lower_band: +(M1861.lower_band * K).toFixed(4), upper_band: +(M1861.upper_band * K).toFixed(4) }, swivels: m.meta.traits.swivels, breech_loader: m.meta.traits.breech }; }
  write('rifle-sockets.json', stable({ schema: 'figures3d-rifle-sockets-1', spec: M1861, note: 'data/figures3d/socket-spec.json (written by the ANIMATION follow-up) was not present when this was built; the numbers are those of ANIM3D-NOTES section 8. Tier inferred.', arms: rows })); }
// ---- strand-card atlas (hairtex.mjs): 8 variants x 256 x 512 RGBA8 with 6 mips; a preview PNG and the hash; the atlas is regenerated in code at load (not stored beyond the preview)
{ const t0 = Date.now(), at = bakeHairAtlas(), W = HAIR_TEX.w * 8, H = HAIR_TEX.h, img = new Uint8Array(W * H * 4); at.forEach((lv, v) => { const b = lv[0]; for (let y = 0; y < H; y++) for (let x = 0; x < HAIR_TEX.w; x++) { const o = (y * W + v * HAIR_TEX.w + x) * 4, p = (y * HAIR_TEX.w + x) * 4; img[o] = b[p]; img[o + 1] = b[p + 1]; img[o + 2] = b[p + 2]; img[o + 3] = 255; } });
  write('textures/hair_cards.png', pngEncode(W, H, img)); let bytes = 0; for (const lv of at) for (const l of lv) bytes += l.length; const hh = hairAtlasHash(at); hashes['haircards:atlas'] = hh;
  write('hair-cards.json', stable({ schema: 'figures3d-haircards-1', tier: 'plausible-procedural (TIERS.json F-HAIR-CARDS)', note: 'strand-card texture generated in code (src/figures3d/hairtex.mjs); textures/hair_cards.png shows the 8 variants side by side, R = alpha, G = fibre id, B = fibre shade (channels as stored)', tile_u_m: HAIR_TEX.tile_u_m, tile_v_m: HAIR_TEX.tile_v_m, size: [HAIR_TEX.w, HAIR_TEX.h], mips: HAIR_TEX.mips, variants: VARIANT_PARAMS.map((p, i) => ({ index: i, ...p })), channels: { R: 'alpha (alpha-to-coverage)', G: 'fibre id 0..1: the shader drops fibres with id above the vertex coverage', B: 'fibre shade', A: 'reserved' }, materials: { hair_card: MAT.HAIR_CARD, beard_card: MAT.BEARD_CARD }, vertex_flag: 'bits 0..4 coverage 0..31, bits 5..7 variant', raw_rgba8_bytes: bytes, bc7_bytes: bytes / 4, sha256: hh }));
  log(`hair cards: 8 variants, ${(bytes / 1048576).toFixed(2)} MB raw, ${Date.now() - t0} ms`); }
// ---- head skin maps (skinmap.mjs): 24 heads x (NR + AM); the hashes of the 512 x 256 crowd maps (a determinism check), the byte accounting for crowd (512 x 256) and hero (1024 x 512) maps, a preview of four heads
{ const t0 = Date.now(), rows = [], prev = []; for (let i = 0; i < N_HEADS; i++) { const m = bakeHeadMaps(headParams(i), 512, 256); rows.push({ head: i, years: +m.look.years.toFixed(1), sha256: m.sha256 }); hashes['headmap:' + i] = m.sha256; if (i < 4) prev.push(m); }
  const PW = 512, PH = 256, img = new Uint8Array(PW * 2 * PH * 2 * 4); prev.forEach((m, k) => { const ox = (k % 2) * PW, oy = Math.floor(k / 2) * PH * 1; for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) { const o = ((oy + y) * PW * 2 + ox + x) * 4, p = (y * PW + x) * 4, lum = m.am[p] / 160, red = m.am[p + 1] / 255; img[o] = Math.min(255, 200 * lum * (0.75 + red * 0.5) + (m.am[p + 2] / 255) * -30); img[o + 1] = Math.min(255, 160 * lum); img[o + 2] = Math.min(255, 130 * lum + (m.nr[p + 1] - 128) * 0.3); img[o + 3] = 255; } });
  write('head-maps-preview.png', pngEncode(PW * 2, PH * 2, img)); const crowd = 512 * 256 * 4 / 3 * 4 * 2 / 4, hero = 1024 * 512 * 4 / 3 * 4 * 2 / 4;
  write('head-maps.json', stable({ schema: 'figures3d-headmaps-1', tier: 'plausible-procedural (TIERS.json F-SKIN-MAPS)', note: 'two RGBA8 maps per head in the head-skin UV space (NR: normal xy, roughness, cavity; AM: luminance, redness, stubble density, dirt) baked in code from the head parameters; not stored beyond head-maps-preview.png (heads 0..3, albedo-like composite)', size_crowd: [512, 256], size_hero: [1024, 512], heads: N_HEADS, age_years: [17, 45], flag: 'skin-grid vertices carry vertex flag 64',
    bytes: { crowd_per_head_raw_with_mips: Math.round(crowd), crowd_24_raw_MB: +(crowd * N_HEADS / 1048576).toFixed(2), crowd_24_bc7_MB: +(crowd * N_HEADS / 4 / 1048576).toFixed(2), hero_per_head_raw_with_mips: Math.round(hero), hero_bc7_MB_each: +(hero / 4 / 1048576).toFixed(2), budget: 'PLAN G15: near bodies 14 MB, commander heads streamed: 24 crowd pairs fit in the near-body line; hero heads stream' }, heads_hashes: rows }));
  log(`head maps: ${N_HEADS} heads baked, ${Date.now() - t0} ms`); }
// ---- hashes and manifest
const root = sha(Buffer.from(Object.keys(hashes).sort().map(k => k + '=' + hashes[k]).join('\n')));
write('hashes.json', stable({ schema: 'figures3d-hashes-1', root_sha256: root, count: Object.keys(hashes).length, hashes: Object.fromEntries(Object.keys(hashes).sort().map(k => [k, hashes[k]])) }));
const tri = [0, 1, 2].map(l => { const rows = []; for (const { r } of pop) { const list = partsAtLod(partsForFigure(r.variant, r.variant.mask, r.words[3] & 255, r.identity), l); rows.push(list.reduce((a, p) => a + lib.mesh(p.id, l).nt, 0)); } rows.sort((a, b) => a - b); return { min: rows[0], median: rows[rows.length >> 1], max: rows[rows.length - 1], units_sampled: rows.length }; });
write('manifest.json', stable({ schema: 'figures3d-manifest-1', version: sys.version, root_sha256: root, catalog_size: catalog.length, human_triangles_per_figure: { lod0_close: tri[0], lod1_parts_sum: tri[1], lod2_parts_sum: tri[2], note: 'sum of the parts a figure draws, one sample man per kit unit at the date 1863-07-02; the merged mid/low meshes are in classes.json' },
  population: { manifests: nMan, outfit_variants: sys.table.list.length, silhouette_classes: cls.silhouettes.length, accessory_classes: cls.accessories.length, impostor_classes: cls.impostors.length }, files }));
log('wrote', Object.keys(files).length, 'files to', OUT, 'root', root.slice(0, 16));
