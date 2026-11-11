// The part library: every part id -> generator -> meshes at 3 LODs (+ body shape keys), and the composition rules that turn an outfit variant into a list of parts (close LOD), a merged mid mesh
// per silhouette class (LOD1) and a low mesh for the impostor bake (LOD2). Deterministic: no clock, no Math.random; all random-like choices come from seeds in the part ids.
import { v3, m4, qAxisAngle } from './mathlib.mjs';
import { Mesh, ellipsoid, box, tube, strap, loft, limbProfile } from './meshkit.mjs';
import { humanRig } from './skeleton.mjs';
import { BI, SHAPE_KEYS, NEUTRAL, buildHand, buildFoot } from './body.mjs';
import { buildHead, N_HEADS, HAIR_STYLES, FACIAL_HAIR } from './head.mjs';
import { buildHairCards, buildBeardCards } from './hair.mjs';
import { buildCoat, buildTrousers, buildFootwear, buildHat, buildRankMarks, COAT_CUTS, TROUSER_CUTS } from './garments.mjs';
import { buildAccoutrement, buildLongArm, buildHandgun, buildHolster, buildSword, buildScabbard, buildInstrument, buildStaff } from './gear.mjs';
import { buildFlagCloth, FLAG_KINDS } from './flags.mjs';
import { buildHorse } from './horse.mjs';
import { buildTube, buildCarriage, buildLimber, buildCaisson, buildCrewImplement, PIECES } from './guns.mjs';
import { MAT } from './palette.mjs';
import { WEAPON_VISUALS, ACC_CLASSES, ITEM_VISUALS } from './visuals.mjs';

// ---- corps badge meshes: flat extruded shapes on the hat's front-left
function badgeMesh(shape, lod) {
  const m = new Mesh('badge:' + shape); if (lod >= 2) return m; const sk = () => [[BI.head, 1]], c = [0.052, 1.756, 0.095], r = 0.0115, tk = 0.0022;
  const poly = (pts, dz = 0) => { const n = pts.length, base = m.nv, cen = c; const ring = (z) => pts.map(p => m.vert([cen[0] + p[0], cen[1] + p[1], cen[2] + z + dz], [0, 0, z > 0 ? 1 : -1], 0.5 + p[0] / (2 * r), 0.5 + p[1] / (2 * r), MAT.BADGE, sk())); const f = ring(tk / 2), b = ring(-tk / 2), cf = m.vert([cen[0], cen[1], cen[2] + tk / 2], [0, 0, 1], 0.5, 0.5, MAT.BADGE, sk()), cb = m.vert([cen[0], cen[1], cen[2] - tk / 2], [0, 0, -1], 0.5, 0.5, MAT.BADGE, sk());
    for (let i = 0; i < n; i++) { const j = (i + 1) % n; m.tri(cf, f[i], f[j]); m.tri(cb, b[j], b[i]); const s0 = m.vert(m.pos(f[i]), v3.norm([pts[i][0], pts[i][1], 0]), 0, 0, MAT.BADGE, sk()), s1 = m.vert(m.pos(f[j]), v3.norm([pts[j][0], pts[j][1], 0]), 0, 0, MAT.BADGE, sk()), s2 = m.vert(m.pos(b[i]), v3.norm([pts[i][0], pts[i][1], 0]), 0, 0, MAT.BADGE, sk()), s3 = m.vert(m.pos(b[j]), v3.norm([pts[j][0], pts[j][1], 0]), 0, 0, MAT.BADGE, sk()); m.tri(s0, s2, s1); m.tri(s1, s2, s3); }
    void base; void dz; };
  const circ = (cx, cy, rr, n = 10) => Array.from({ length: n }, (_, i) => [cx + Math.cos(i / n * 6.2832) * rr, cy + Math.sin(i / n * 6.2832) * rr]);
  switch (shape) {
    case 'disc': poly(circ(0, 0, r)); break;
    case 'trefoil': [[0, r * 0.55], [-r * 0.5, -r * 0.3], [r * 0.5, -r * 0.3]].forEach(([x, y], i) => poly(circ(x, y, r * 0.5, 8), i * 0.0004)); break;
    case 'lozenge': poly([[0, r * 1.2], [r * 0.8, 0], [0, -r * 1.2], [-r * 0.8, 0]]); break;
    case 'maltese': poly([[0, r * 1.1], [r * 0.25, r * 0.35], [r * 1.0, r * 0.9], [r * 0.35, 0], [r * 1.0, -r * 0.9], [r * 0.25, -r * 0.35], [0, -r * 1.1], [-r * 0.25, -r * 0.35], [-r * 1.0, -r * 0.9], [-r * 0.35, 0], [-r * 1.0, r * 0.9], [-r * 0.25, r * 0.35]]); break;
    case 'greek_cross': poly([[-r * 0.3, r], [r * 0.3, r], [r * 0.3, r * 0.3], [r, r * 0.3], [r, -r * 0.3], [r * 0.3, -r * 0.3], [r * 0.3, -r], [-r * 0.3, -r], [-r * 0.3, -r * 0.3], [-r, -r * 0.3], [-r, r * 0.3], [-r * 0.3, r * 0.3]]); break;
    case 'crescent': { const pts = []; for (let i = 0; i <= 6; i++) { const a = -2.2 + i / 6 * 4.4; pts.push([Math.cos(a) * r * 1.1, Math.sin(a) * r * 1.1]); } for (let i = 6; i >= 0; i--) { const a = -2.0 + i / 6 * 4.0; pts.push([Math.cos(a) * r * 0.7 + r * 0.35, Math.sin(a) * r * 0.7]); } poly(pts); break; }
    case 'star': poly(Array.from({ length: 10 }, (_, i) => { const a = Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r * 1.15; return [Math.cos(a) * rr, Math.sin(a) * rr]; })); break;
    case 'crossed_sabres': [1, -1].forEach((s, i) => poly([[-r * 1.1 * s, -r * 1.1], [-r * 1.1 * s + 0.003 * s, -r * 1.1], [r * 1.1 * s, r * 1.1], [r * 1.1 * s - 0.003 * s, r * 1.1]], i * 0.0004)); break;
    default: throw new Error('badge ' + shape);
  }
  m.meta = { closed: false, openOk: true }; return m;
}
// ---- decorations
function decoMesh(name, lod, opt = {}) {
  const m = new Mesh('deco:' + name); if (lod >= 2) return m; const sk = () => [[BI.spine3, 1]];
  if (name === 'straps') for (const s of [1, -1]) box(m, [s * 0.145, 1.442, 0.0], [0.024, 0.004, 0.047], { mat: MAT.COAT, skinFn: sk });
  else if (name === 'birdcage_braid' && lod === 0) for (let i = 0; i < 6; i++) { const y = 1.36 - i * 0.045; strap(m, [[-0.11, y, 0.115], [0, y - 0.02, 0.135], [0.11, y, 0.115]], 0.012, 0.003, { mat: MAT.COAT_TRIM, skinFn: sk }); }
  else if (name === 'green_chevrons' || name === 'chevrons') return buildRankMarks(name === 'chevrons' ? 'sergeant' : 'corporal', lod, { mat: name === 'chevrons' ? MAT.COAT_TRIM : MAT.FLAG_GREEN });
  else if (name === 'collar_insignia' && lod === 0) for (const s of [1, -1]) box(m, [s * 0.035, 1.47, 0.06], [0.012, 0.004, 0.003], { mat: MAT.SILVER, skinFn: sk });
  m.meta = { closed: false, openOk: true }; return m;
}
// ---- part registry. id grammar is documented in FIGURES3D-NOTES.md. `shaped`: build once per body shape key and store deltas.
const SHAPED = new Set(['coat', 'trousers', 'foot', 'rank', 'deco', 'acc']);
const ACC_SHAPED = new Set(['belt', 'cartbox', 'canteen', 'haversack', 'knapsack', 'blanket_roll', 'sash', 'poncho', 'cavalry_set']);
export function buildPart(id, lod, shape = NEUTRAL) {
  const [kind, a, b, c] = id.split(':');
  switch (kind) {
    case 'head': return buildHead(+a, lod);
    case 'hair': return buildHairCards(+a, lod);
    case 'beard': return buildBeardCards(+a, lod);
    case 'hands': { const m = new Mesh('hands'); buildHand('L', lod, m); buildHand('R', lod, m); m.meta = { closed: false, openOk: true }; return m; }
    case 'coat': return buildCoat(a, lod, shape, a === 'shirt' ? { mat: MAT.SHIRT, trimMat: MAT.SHIRT, name: 'shirt' } : { name: a });
    case 'trousers': return buildTrousers(a, lod, shape, { stripe: b === '1', seat: c === '1', name: a, env: id.split(':')[4] ?? '0' });
    case 'foot': { if (a === 'barefoot') { const m = new Mesh('barefoot'); buildFoot('L', lod, m); buildFoot('R', lod, m); m.meta = { closed: false, openOk: true }; return m; } return buildFootwear(a, lod, shape); }
    case 'hat': return buildHat(a, lod);
    case 'badge': return badgeMesh(a, lod);
    case 'rank': return buildRankMarks(a, lod);
    case 'deco': return decoMesh(a, lod);
    case 'acc': return buildAccoutrement(a, lod, { shape, plate: b, army: b === 'confederate' || c === 'sling' ? 'confederate' : 'union', sling: c === 'sling', fur: b === 'fur', painted: b !== 'plain', wide: b === 'w', wood: b === 'wood' });
    case 'arm': { const w = WEAPON_VISUALS[a]; if (!w || w.type !== 'long') throw new Error('arm ' + a); return buildLongArm(w.spec, lod, { name: a, bayonet: b === 'bf' ? 'fixed' : 'none' }); }
    case 'hand': { const w = WEAPON_VISUALS[a]; return buildHandgun(w.spec, lod, { name: a, origin: [-0.20, 0.80, 0.07] }); }
    case 'holster': return buildHolster(lod);
    case 'sword': return buildSword(WEAPON_VISUALS[a].spec, lod, { name: a });
    case 'scabbard': return buildScabbard(WEAPON_VISUALS[a].spec, lod, { name: a });
    case 'instr': return buildInstrument(a, lod);
    case 'staff': return buildStaff(lod);
    case 'flag': return buildFlagCloth(a, b ?? 'intact', lod);
    case 'horse': return buildHorse(lod, a);
    case 'tube': return buildTube(a, lod);
    case 'carriage': return buildCarriage(lod);
    case 'limber': return buildLimber(lod);
    case 'caisson': return buildCaisson(lod);
    case 'implement': return buildCrewImplement(a, lod);
    default: throw new Error('unknown part id ' + id);
  }
}
const isShaped = id => { const [k, a] = id.split(':'); return k === 'acc' ? ACC_SHAPED.has(a) : SHAPED.has(k); };
export class FigureLibrary {
  constructor() { this.cache = new Map(); }
  mesh(id, lod, shape = NEUTRAL) { const key = `${id}@${lod}@${shape.g},${shape.c}`; let m = this.cache.get(key); if (!m) { m = buildPart(id, lod, shape); this.cache.set(key, m); } return m; }
  // finalized part with body shape-key deltas ([key][vertex][xyz] flattened); null deltas for unshaped parts and for LOD2
  part(id, lod) {
    const key = `P:${id}@${lod}`; let p = this.cache.get(key); if (p) return p;
    const base = this.mesh(id, lod).finalize(); let deltas = null;
    if (isShaped(id) && lod <= 2) {
      deltas = new Float32Array(SHAPE_KEYS.length * base.nv * 3);
      SHAPE_KEYS.forEach((k, ki) => { const f = this.mesh(id, lod, { g: k.g, c: k.c }).finalize(); if (f.nv !== base.nv || f.idx.length !== base.idx.length) throw new Error(`shape key topology differs for ${id} lod ${lod}`); for (let i = 0; i < base.nv * 3; i++) deltas[ki * base.nv * 3 + i] = f.pos[i] - base.pos[i]; });
    }
    p = { id, lod, mesh: base, deltas, shaped: !!deltas }; this.cache.set(key, p); return p;
  }
}

// ---- composition: variant (+ mask, flags, identity) -> the ordered list of part ids per LOD
const hasBit = (mask, c) => (mask >> ACC_CLASSES.indexOf(c)) & 1;
export const trouserEnv = cut => (cut === null ? '0' : ['frock', 'frock_double', 'civilian'].includes(cut) ? 'L' : ['sack', 'tunic6'].includes(cut) ? 'M' : 'S');
export function partsForFigure(V, mask, flags, identity) {
  const P = [], add = (id, minLod = 0, maxLod = 2) => P.push({ id, minLod, maxLod });
  add(`head:${identity.head}`); add(`hair:${identity.hair & 7}`, 0, 1); if (identity.facial) add(`beard:${identity.facial}`, 0, 1); add('hands', 0, 1);
  const off = !!(flags & 4);
  if (V.parts.coat) { if (off) add('coat:shirt'); else add(`coat:${V.parts.coat.cut}`); for (const d of V.parts.coat.deco) add(`deco:${d}`, 0, 1); }
  if (V.parts.trousers) add(`trousers:${V.parts.trousers.cut}:${V.parts.trousers.stripe ? 1 : 0}:${V.parts.trousers.seat ? 1 : 0}:${trouserEnv(V.parts.coat && !off ? V.parts.coat.cut : off ? 'shirt' : null)}`);
  if (V.parts.shoes) add(`foot:${V.parts.shoes.kind}`); else add('foot:brogan');
  if (V.parts.hat) { add(`hat:${V.parts.hat.kind}`); if (V.parts.badge) add(`badge:${V.parts.badge.shape}`, 0, 1); }
  if (V.rank !== 'private') add(`rank:${V.rank}`, 0, 1);
  const st = V.styles;
  if (hasBit(mask, 'belt')) add(`acc:belt:${st.belt ? st.belt.plate : 'oval_us'}`, 0, 1);
  if (hasBit(mask, 'cartbox')) add(`acc:cartbox:${st.cartbox && st.cartbox.sling ? 'confederate:sling' : st.cartbox && st.cartbox.army ? st.cartbox.army : V.army}`, 0, 1);
  if (hasBit(mask, 'cap_pouch')) add('acc:cap_pouch', 0, 1);
  if (hasBit(mask, 'scabbard')) add('acc:bayonet_scabbard', 0, 1);
  if (hasBit(mask, 'canteen')) add(`acc:canteen:${st.canteen && st.canteen.cs ? 'wood' : 'tin'}`, 0, 1);
  if (hasBit(mask, 'haversack')) add(`acc:haversack:${st.haversack && st.haversack.painted === false ? 'plain' : 'painted'}`, 0, 1);
  if (hasBit(mask, 'knapsack')) add(`acc:knapsack:${st.knapsack && st.knapsack.fur ? 'fur' : 'std'}`, 0, 2);
  if (hasBit(mask, 'blanket')) add('acc:blanket_roll', 0, 2);
  if (hasBit(mask, 'gum')) add('acc:gum_blanket', 0, 1); if (hasBit(mask, 'cup')) add('acc:tin_cup', 0, 0);
  if (hasBit(mask, 'sash')) add(`acc:sash:${st.sash && st.sash.wide ? 'w' : 'n'}`, 0, 1);
  if (hasBit(mask, 'poncho')) add('acc:poncho', 0, 1); if (hasBit(mask, 'overcoat')) add('acc:overcoat_roll', 0, 2); if (hasBit(mask, 'shelter')) add('acc:shelter_half', 0, 1); if (hasBit(mask, 'tools')) add('acc:tools', 0, 1);
  if (hasBit(mask, 'cavalry')) add('acc:cavalry_set', 0, 1);
  const w = V.weapon ? WEAPON_VISUALS[V.weapon] : null;
  if (w && w.type === 'long') add(`arm:${V.weapon}:${V.bayonet === 'fixed' ? 'bf' : 'b0'}`, 0, 2);
  for (const sid of V.sidearm) { const sv = WEAPON_VISUALS[sid]; if (!sv) continue; if (sv.type === 'sword') { add(`sword:${sid}`, 0, 1); add(`scabbard:${sid}`, 0, 1); } else if (sv.type === 'hand') { add(`hand:${sid}`, 0, 1); add('holster', 0, 1); } }
  if (V.instrument) add(`instr:${V.instrument}`, 0, 2);
  if (V.flag) { add('staff', 0, 2); add(`flag:${V.flag}:intact`, 0, 2); }
  return P;
}
export function partsAtLod(list, lod) { return list.filter(p => lod >= p.minLod && lod <= p.maxLod); }
// bone remap human -> mid skeleton (36 bones) for merged LOD1/LOD2 meshes
export const MID_MAP = humanRig.lod?.mid ? null : null;
export function midBoneMap(skel) { const m = skel.human.lod.mid.map; return b => m[b]; }
export function composeMerged(lib, list, lod, boneMap, palette = null) {
  const out = new Mesh('merged'); let tris = 0; const dl = [];
  for (const p of partsAtLod(list, lod)) { const part = lib.mesh(p.id, lod); if (!part.nv) continue; const sp = lib.part(p.id, lod); dl.push({ nv: part.nv, deltas: sp.deltas }); out.append(part, null, boneMap); tris += part.nt; }
  // the merged mesh carries the four body shape keys of its parts (zeros for unshaped parts): int16-able deltas [key][vertex][xyz], the same layout as a single part
  const nv = out.nv, K = SHAPE_KEYS.length, deltas = new Float32Array(K * nv * 3); let o = 0; for (const { nv: n, deltas: d } of dl) { if (d) for (let k = 0; k < K; k++) deltas.set(d.subarray(k * n * 3, (k + 1) * n * 3), k * nv * 3 + o * 3); o += n; }
  out.meta = { lod, tris, deltas }; return out;
}
// ---- the silhouette-class representative (mid mesh): picks one canonical cut/hat per silhouette bucket so a merged mesh is shared by every variant of that bucket
export const HAT_SIL = { kepi: 'kepi', forage: 'kepi', sprig: 'kepi', deertail_kepi: 'kepi', cap: 'kepi', hardee: 'brim', garibaldi: 'brim', slouch: 'soft', straw: 'soft', fez: 'fez', turban: 'fez' };
const HAT_REP = { kepi: 'kepi', brim: 'hardee', soft: 'slouch', fez: 'fez' }, COAT_REP = { L: 'frock', M: 'sack', S: 'short_jacket', Z: 'zouave' }, TROU_REP = { B: 'baggy', C: 'chasseur', s: 'straight' };
const COAT_SIL = cut => (['frock', 'frock_double', 'civilian'].includes(cut) ? 'L' : cut === 'sack' ? 'M' : cut === 'zouave' ? 'Z' : 'S');
export function silhouetteOf(V, mask) {
  const bit = c => (mask >> ACC_CLASSES.indexOf(c)) & 1, load = bit('knapsack') ? 2 : bit('blanket') || bit('overcoat') ? 1 : 0, w = V.weapon ? WEAPON_VISUALS[V.weapon] : null;
  const wclass = !w ? 'none' : w.type === 'long' ? (w.spec.overall_in > 50 ? 'long' : 'short') : 'none';
  const sh = V.parts.shoes ? V.parts.shoes.kind : 'brogan';
  return { army: V.army[0], coat: V.parts.coat ? COAT_SIL(V.parts.coat.cut) : '-', hat: V.parts.hat ? HAT_SIL[V.parts.hat.kind] : '-', trou: V.parts.trousers && V.parts.trousers.cut === 'baggy' ? 'B' : V.parts.trousers && V.parts.trousers.cut === 'chasseur' ? 'C' : 's', shoe: ['gaiter', 'legging'].includes(sh) ? 'g' : sh === 'barefoot' ? 'bf' : 'sh', wclass, load, flag: V.flag ? 'F' : V.instrument ?? '-' };
}
export const silhouetteKey = s => `${s.army}|${s.coat}|${s.hat}|${s.trou}|${s.shoe}|${s.wclass}|${s.load}|${s.flag}`;
export function partsForSilhouette(s) {
  const P = [{ id: 'head:0', minLod: 1, maxLod: 2 }, { id: 'hands', minLod: 1, maxLod: 1 }];
  if (s.coat !== '-') P.push({ id: `coat:${COAT_REP[s.coat]}`, minLod: 1, maxLod: 2 });
  P.push({ id: `trousers:${TROU_REP[s.trou]}:0:0:${{ L: 'L', M: 'M' }[s.coat] ?? 'S'}`, minLod: 1, maxLod: 2 }); P.push({ id: s.shoe === 'bf' ? 'foot:barefoot' : s.shoe === 'g' ? 'foot:gaiter' : 'foot:brogan', minLod: 1, maxLod: 2 });
  if (s.hat !== '-') P.push({ id: `hat:${HAT_REP[s.hat]}`, minLod: 1, maxLod: 2 });
  if (s.load === 2) P.push({ id: 'acc:knapsack:std', minLod: 1, maxLod: 2 }); else if (s.load === 1) P.push({ id: 'acc:blanket_roll', minLod: 1, maxLod: 2 });
  P.push({ id: 'hair:1', minLod: 1, maxLod: 2 });
  if (s.wclass === 'long') P.push({ id: 'arm:m1861_springfield:b0', minLod: 1, maxLod: 2 }); else if (s.wclass === 'short') P.push({ id: 'arm:sharps_carbine:b0', minLod: 1, maxLod: 2 });
  if (s.flag === 'F') { P.push({ id: 'staff', minLod: 1, maxLod: 2 }); P.push({ id: 'flag:us_national:intact', minLod: 1, maxLod: 2 }); } else if (['drum', 'fife', 'bugle', 'wigwag', 'stretcher'].includes(s.flag)) P.push({ id: `instr:${s.flag}`, minLod: 1, maxLod: 2 });
  return P;
}
export const PART_KINDS = { COAT_CUTS: Object.keys(COAT_CUTS), TROUSER_CUTS: Object.keys(TROUSER_CUTS), FLAG_KINDS, N_HEADS, HAIR_STYLES, FACIAL_HAIR, PIECES: Object.keys(PIECES) };
void ITEM_VISUALS; void m4; void qAxisAngle; void ellipsoid; void tube; void loft; void limbProfile;
// accessories merged into one small second mesh at LOD1 (so the silhouette class count stays bounded): bit set -> part ids
export function accessoryKey(V, mask) { const bit = c => (mask >> ACC_CLASSES.indexOf(c)) & 1; return [bit('cartbox'), bit('canteen'), bit('haversack'), bit('sash'), bit('scabbard'), V.sidearm.some(i => WEAPON_VISUALS[i] && WEAPON_VISUALS[i].type === 'sword') ? 1 : 0, V.bayonet === 'fixed' ? 1 : 0, bit('cavalry')].join(''); }
export function partsForAccessories(key, army) {
  const [cb, cn, hv, sa, sc, sw, bf, cv] = key.split('').map(Number), P = [];
  if (cb) P.push({ id: `acc:cartbox:${army === 'c' ? 'confederate:sling' : 'union'}`, minLod: 1, maxLod: 2 }); if (cn) P.push({ id: 'acc:canteen:tin', minLod: 1, maxLod: 2 }); if (hv) P.push({ id: 'acc:haversack:painted', minLod: 1, maxLod: 2 });
  if (sa) P.push({ id: 'acc:sash:n', minLod: 1, maxLod: 2 }); if (sc) P.push({ id: 'acc:bayonet_scabbard', minLod: 1, maxLod: 2 }); if (sw) { P.push({ id: 'sword:m1850_foot_officer_sword', minLod: 1, maxLod: 2 }); P.push({ id: 'scabbard:m1850_foot_officer_sword', minLod: 1, maxLod: 2 }); }
  if (cv) P.push({ id: 'acc:cavalry_set', minLod: 1, maxLod: 2 });
  return P;
}
