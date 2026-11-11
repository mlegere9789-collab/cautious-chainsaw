// Battle Theatre figure models: public API (module of the "FIGURES" part of the BT visuals brief).
//   const sys = createFigureSystem();                      // empty outfit-variant table + the part library (procedural, deterministic)
//   const rec = sys.instance(manifest);                    // manifest from src/history/figures.mjs (figures.manifest(unitId, k, tMin, scenario)); -> { words:[u32 x4], variant, index, identity }
//   sys.instanceFromHistory(figures, unitId, k, tMin, scenario, variantName?)   // null before arrival; a disputed unit needs variantName (no default is chosen)
//   sys.variantRows()                                      // Uint8Array, VARIANT_ROW_BYTES per outfit variant (GPU table)
//   sys.mesh(partId, lod) / sys.part(partId, lod)          // raw / finalized (+ shape-key deltas) parts at LOD 0 close, 1 mid, 2 low
//   sys.midMesh(silhouetteKey) / sys.accessoryMesh(key,army) / sys.impostor(silhouetteKey)   // merged mid meshes (mid skeleton bone space) and baked 8-view impostor atlases
//   sys.acw                                                // ACW mod provider (acw.mjs): credit(), linkFor(unitId), figurePlan(unitId, role), coverage(), costModel(); inert unless cleared mod assets are passed in opts.acw
// Contract with ANIMATION: data/figures3d/skeleton.json (src/figures3d/skeleton.mjs). Contract with FX: sockets muzzle (arm/gun meta), the fire event position comes from the animated prop bone.
import { VariantTable, instanceWords, unpackInstance, variantFromManifest, identityFromSeed, resolveColours, midClassKey, impostorClassKey, INSTANCE_BYTES, INSTANCE_WORDS, FLAG_BITS, ROLES, DIST } from './variants.mjs';
import { FigureLibrary, trouserEnv, partsForFigure, partsAtLod, composeMerged, silhouetteOf, silhouetteKey, partsForSilhouette, accessoryKey, partsForAccessories, midBoneMap } from './library.mjs';
import { buildCatalog, VARIANT_ROW_BYTES, ROW_SLOT_ORDER, BRANCHES, INSTRUMENTS } from './catalog.mjs';
import { bakeImpostor } from './raster.mjs';
import { buildSkeletonJson, humanRig, horseRig, gunRig } from './skeleton.mjs';
import { FLAG_KINDS } from './flags.mjs';
import { WEAPON_VISUALS } from './visuals.mjs';
import { MAT, COLOUR, GLOBAL_MATERIALS, HORSE_COATS, SKIN_TONES, HAIR_COLOURS, EYE_COLOURS } from './palette.mjs';
import { FLAG_EVIDENCE, flagPattern } from './flags.mjs';
import { PIECES } from './guns.mjs';
import { createAcwProvider, ACW_CREDIT_LINE, ACW_LICENCE_BASIS } from './acw.mjs';

export const FIGURES3D_VERSION = 'figures3d-1';
export { MAT, COLOUR, GLOBAL_MATERIALS, HORSE_COATS, SKIN_TONES, HAIR_COLOURS, EYE_COLOURS, INSTANCE_BYTES, INSTANCE_WORDS, FLAG_BITS, ROLES, DIST, VARIANT_ROW_BYTES, unpackInstance, variantFromManifest, identityFromSeed, resolveColours,
  midClassKey, impostorClassKey, partsForFigure, partsAtLod, silhouetteOf, silhouetteKey, buildSkeletonJson, humanRig, horseRig, gunRig, FigureLibrary, buildCatalog, FLAG_EVIDENCE, flagPattern, PIECES, WEAPON_VISUALS, createAcwProvider, ACW_CREDIT_LINE, ACW_LICENCE_BASIS };

export function createFigureSystem(opts = {}) {   // opts.acw: data for the ACW mod provider ({manifest, unitMap, swatches}); absent = the provider is empty (procedural figures only)
  const table = new VariantTable(), lib = new FigureLibrary(), catalog = buildCatalog(), catIndex = new Map(catalog.map((id, i) => [id, i])), skel = buildSkeletonJson(), bmap = midBoneMap(skel);
  const silo = new Map(), accs = new Map(), mids = new Map(), imps = new Map();
  const cat = id => (id && catIndex.has(id) ? catIndex.get(id) : 0xffff);
  function classesOf(V) {
    const s = silhouetteOf(V, V.mask), sk = silhouetteKey(s); if (!silo.has(sk)) silo.set(sk, { index: silo.size, key: sk, spec: s });
    const ak = accessoryKey(V, V.mask) + '|' + V.army[0]; if (!accs.has(ak)) accs.set(ak, { index: accs.size, key: ak });
    const ik = impKey(s); if (!imps.has(ik)) imps.set(ik, { index: imps.size, key: ik, spec: s });
    return { mid: silo.get(sk).index, acc: accs.get(ak).index, imp: imps.get(ik).index };
  }
  // the impostor key: silhouette without the shoe/trouser detail that cannot be seen at 7 px
  const impKey = s => `${s.coat}|${s.hat}|${s.load}|${s.wclass}|${s.flag}|${s.trou}`;
  function rowFor(V, idx) {
    const c = classesOf(V), buf = new Uint8Array(VARIANT_ROW_BYTES), dv = new DataView(buf.buffer), w = V.weapon ? WEAPON_VISUALS[V.weapon] : null; let o = 0;
    const u16 = x => { dv.setUint16(o, x, true); o += 2; }, u8 = x => { buf[o++] = x; };
    u16(c.mid); u16(c.acc); u16(c.imp);
    u16(cat(V.parts.hat && `hat:${V.parts.hat.kind}`)); u16(cat(V.parts.coat && `coat:${V.parts.coat.cut}`)); u16(cat(V.parts.trousers && `trousers:${V.parts.trousers.cut}:${V.parts.trousers.stripe ? 1 : 0}:${V.parts.trousers.seat ? 1 : 0}:${trouserEnv(V.parts.coat ? V.parts.coat.cut : null)}`)); u16(cat(`foot:${V.parts.shoes ? V.parts.shoes.kind : 'brogan'}`));
    u16(cat(w && w.type === 'long' && `arm:${V.weapon}:${V.bayonet === 'fixed' ? 'bf' : 'b0'}`));
    const sw = V.sidearm.find(i => WEAPON_VISUALS[i] && WEAPON_VISUALS[i].type === 'sword'), hg = V.sidearm.find(i => WEAPON_VISUALS[i] && WEAPON_VISUALS[i].type === 'hand');
    u16(cat(sw && `sword:${sw}`)); u16(cat(hg && `hand:${hg}`)); u16(cat(V.parts.badge && `badge:${V.parts.badge.shape}`)); u16(cat(V.instrument ? `instr:${V.instrument}` : V.flag ? `flag:${V.flag}:intact` : null));
    u8(ROLES.indexOf(V.role)); u8(['private', 'corporal', 'sergeant', 'first sergeant', 'lieutenant', 'captain', 'field officer', 'general'].indexOf(V.rank)); u8(V.flag ? 1 + FLAG_KINDS.indexOf(V.flag) : 0);
    u8(V.bayonet === 'fixed' ? 1 : V.bayonet === 'scabbard' ? 2 : 0); u8(V.army === 'confederate' ? 1 : 0); u8(BRANCHES.indexOf(V.branch) >= 0 ? BRANCHES.indexOf(V.branch) : 3); u8(Math.min(255, V.gap_items.length)); u8(0);
    for (const slot of ROW_SLOT_ORDER) { const rgb = V.palette[slot] || [0, 0, 0]; u8(rgb[0]); u8(rgb[1]); u8(rgb[2]); }
    void idx; return buf;
  }
  return {
    version: FIGURES3D_VERSION, table, lib, catalog, skeleton: skel, acw: createAcwProvider(opts.acw || {}),
    instance(manifest) { const r = instanceWords(manifest, table); classesOf(r.variant); return r; },
    instanceFromHistory(figures, unitId, k, tMin, scenario, variantName = null) {
      const m = figures.manifest(unitId, k, tMin, scenario); if (m === null) return null;
      if (m.disputed) { if (!variantName) throw new Error('disputed unit: the caller must name the scenario variant (' + Object.keys(m.variants).join(', ') + '); no default is chosen'); return this.instance(m.variants[variantName]); }
      return this.instance(m);
    },
    pack(records) { const a = new Uint32Array(records.length * INSTANCE_WORDS); records.forEach((r, i) => a.set(r.words, i * INSTANCE_WORDS)); return a; },
    variantRows() { const out = new Uint8Array(table.list.length * VARIANT_ROW_BYTES); table.list.forEach((V, i) => out.set(rowFor(V, i), i * VARIANT_ROW_BYTES)); return out; },
    classes() { return { silhouettes: [...silo.values()], accessories: [...accs.values()], impostors: [...imps.values()] }; },
    mesh: (id, lod) => lib.mesh(id, lod), part: (id, lod) => lib.part(id, lod),
    closeParts(rec, lod = 0) { return partsAtLod(partsForFigure(rec.variant, rec.variant.mask, rec.words[3] & 255, rec.identity), lod); },
    midMesh(key) { let m = mids.get(key); if (!m) { const s = silo.get(key); if (!s) throw new Error('unknown silhouette ' + key); m = composeMerged(lib, partsForSilhouette(s.spec), 1, bmap); mids.set(key, m); } return m; },
    lowMesh(key) { const s = silo.get(key); if (!s) throw new Error('unknown silhouette ' + key); return composeMerged(lib, partsForSilhouette(s.spec), 2, bmap); },
    accessoryMesh(key, army, lod = 1) { return composeMerged(lib, partsForAccessories(key, army), lod, bmap); },
    impostor(key) { const e = imps.get(key); if (!e) throw new Error('unknown impostor class ' + key); if (!e.atlas) { const plist = partsForSilhouette(e.spec); if (e.spec.wclass !== 'none' && !e.spec.flag.startsWith('F')) for (const id of ['acc:cartbox:union', 'acc:canteen:tin', 'acc:haversack:painted']) plist.push({ id, minLod: 2, maxLod: 2 });   // the typical infantry set rides in every impostor of an armed class
      const m = composeMerged(lib, plist, 2, null).finalize(), tall = e.spec.flag === 'F' || e.spec.flag === 'wigwag'; e.atlas = bakeImpostor([m], { heightM: tall ? 3.0 : 1.95 }); } return e.atlas; },
    horse: (lod, kind = 'riding') => lib.mesh(`horse:${kind}`, lod), gunTube: (piece, lod) => lib.mesh(`tube:${piece}`, lod), carriage: lod => lib.mesh('carriage', lod), limber: lod => lib.mesh('limber', lod), caisson: lod => lib.mesh('caisson', lod),
  };
}
void INSTRUMENTS;
