// Shared helpers of the figure inspection tools (contact sheets, hand-over measurement): the kit, the figure system, men picked by predicate, their meshes per LOD. node only.
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { createFigureSystem, resolveColours, unpackInstance } from '../src/figures3d/index.mjs';
import { partsForFigure, partsAtLod, silhouetteOf, silhouetteKey, accessoryKey } from '../src/figures3d/library.mjs';
import { applyShapeKeys } from '../src/figures3d/shape.mjs';
import { BODY_SHAPES } from '../src/figures3d/body.mjs';
import { Kit, manifestFor } from '../src/history/manifest.mjs';
export { unpackInstance };
export const here = path.dirname(fileURLToPath(import.meta.url)), APP = path.join(here, '..'), BT = path.join(APP, '..');
const J = f => JSON.parse(fs.readFileSync(path.join(BT, 'kit', f), 'utf8'));
export const kit = new Kit({ specs: J('kit_specs.json'), weapons: J('weapons.json'), artillery: J('artillery_batteries.json'), cavalry: J('cavalry_units.json') });
export const sys = createFigureSystem(), lib = sys.lib;

export function pickMan(uid, rank, pred, role = 'rifleman', date = '1863-07-02') {
  for (let k = 0; k < 80; k++) { const m = manifestFor(kit, { soldierId: uid + ':' + k, unitId: uid, seed: 1863, date, rank, role }), r = sys.instance(m); if (pred(r)) return { m, r, k }; }
  throw new Error('no man found for ' + uid);
}
export const plain = r => !r.variant.flag && !r.variant.instrument && !(r.words[3] & 4) && r.variant.weapon;
export const palOf = (r, wear) => { const c = resolveColours(r.variant, r.identity, wear ?? 0.3), p = c.map(x => x ? [x[0], x[1], x[2]] : [128, 128, 128]); return p; };
export const shapeOf = r => BODY_SHAPES[unpackInstance(r.words).body_shape];
// the meshes of one man at a LOD (LOD0: every part; LOD1: merged silhouette-class mesh + accessory mesh; LOD2: low mesh), with the man's body shape and stature applied for LOD0
export function manMeshes(r, lod) {
  const sh = shapeOf(r), st = unpackInstance(r.words).stature_scale;
  const scale = ms => ms.map(m => { const pos = Float32Array.from(m.pos); for (let i = 0; i < m.nv; i++) { pos[i * 3] *= st; pos[i * 3 + 1] *= st; pos[i * 3 + 2] *= st; } return { ...m, pos }; });
  const list = partsAtLod(partsForFigure(r.variant, r.variant.mask, r.words[3] & 255, r.identity), 0); return scale(list.map(p => lib.mesh(p.id, 0, sh).finalize()));
}
export function lodMeshes(r, lod, { shaped = true } = {}) {
  if (lod === 0) return manMeshes(r, 0);
  const sh = shaped ? shapeOf(r) : { g: 0, c: 0 }, st = shaped ? unpackInstance(r.words).stature_scale : 1, s = silhouetteOf(r.variant, r.variant.mask), key = silhouetteKey(s), ap = m => applyShapeKeys(m, m.meta && m.meta.deltas, sh, st);
  if (lod === 1) { const out = [ap(sys.midMesh(key).finalize())]; const ak = sys.classes().accessories.find(a => a.key.endsWith('|' + r.variant.army[0]) && a.key.startsWith(accessoryKey(r.variant, r.variant.mask))); if (ak) out.push(ap(sys.accessoryMesh(ak.key.split('|')[0], r.variant.army[0]).finalize())); return out; }
  const out = [ap(sys.lowMesh(key).finalize())]; const ak = sys.classes().accessories.find(a => a.key.endsWith('|' + r.variant.army[0]) && a.key.startsWith(accessoryKey(r.variant, r.variant.mask))); if (ak) out.push(ap(sys.accessoryMesh(ak.key.split('|')[0], r.variant.army[0], 2).finalize())); return out;
}
// the shading environment of one man for the shaded contact sheets: his colour rows (hair and eye colour, skin tone), the baked skin maps of his head, his stubble level
import { createEnv } from '../src/figures3d/shader.mjs'; import { bakeHeadMaps } from '../src/figures3d/skinmap.mjs'; import { headParams } from '../src/figures3d/head.mjs';
const HM = new Map();
export const headMapsFor = (idx, w = 512, h = 256) => { const k = idx + ':' + w; let m = HM.get(k); if (!m) { m = bakeHeadMaps(headParams(idx), w, h); HM.set(k, m); } return m; };
export const envFor = (r, { wear = 0.3, hero = false, shadows } = {}) => createEnv({ palette: palOf(r, wear), headMaps: headMapsFor(r.identity.head, hero ? 1024 : 512, hero ? 512 : 256), stubble: r.identity.stubble ?? 0, wear, dirt: 0.3, shadows });
export const SUBJ = {
  union_private: () => pickMan('DEFAULT.union.infantry', 'private', plain),
  iron_brigade: () => pickMan('US.19IN', 'private', plain),
  zouave_114pa: () => pickMan('US.114PA', 'private', plain),
  confederate_private: () => pickMan('DEFAULT.confederate.infantry', 'private', plain),
  officer_sash_sword: () => pickMan('DEFAULT.union.infantry', 'captain', r => r.variant.sidearm.some(i => /sword/.test(i)) && !r.variant.flag && !(r.words[3] & 4)),
  drummer: () => pickMan('US.SUP.MUSICIAN', 'private', r => r.variant.instrument === 'drum', 'musician'),
  flag_bearer: () => pickMan('DEFAULT.union.infantry', 'private', r => r.variant.flag === 'us_national', 'color_bearer'),
};
