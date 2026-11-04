// From a per-figure kit manifest (src/history/manifest.mjs) to (1) an OUTFIT VARIANT (the visual meaning of the manifest's items, interned in a table), (2) the per-man identity (head, body shape, skin,
// hair, facial hair, stature, tint: all drawn from the manifest's seed, never Math.random), and (3) the packed 16-byte INSTANCE record the renderer uploads per figure.
// INSTANCE LAYOUT (4 x u32, little endian; 16 B per figure, 125,000 figures = 2.0 MB):
//   w0: bits 0-15 kit_variant (index into the outfit-variant table) | bits 16-31 acc_mask (accoutrement classes present: ACC_CLASSES order)
//   w1: bits 0-7 head (0..23) | 8-15 body_shape (0..11) | 16-23 skin_tone (0..11) | 24-31 hair (bits 0-2 style, 3-5 colour, 6-7 grey)
//   w2: bits 0-7 face (bits 0-2 facial hair type, 3-5 eye colour) | 8-15 stature (0..255 -> 0.93..1.045; mean 0.9875 x 1.73 m = 1.708 m = Gould 1869 mean 67.24 in) | 16-23 wear (0..255 = manifest wear level) | 24-31 tint (bits 0-3 value, 4-7 warm)
//   w3: bits 0-7 flags | 8-15 role | 16-23 lod_class_hint (0 until the renderer sets it) | 24-31 reserved
//   flags: 0 flag_bearer, 1 colour_guard, 2 coat_off, 3 officer, 4 musician, 5 mounted_capable, 6 captured_item, 7 gap_item
import { hash4, rand } from '../../../sim/rng.mjs';
import { MAT, COLOUR, VARIANT_SLOTS, skinToneIndex, tintFor, R, GLOBAL_MATERIALS, SKIN_TONES, HAIR_COLOURS, EYE_COLOURS, applyWear } from './palette.mjs';
import { ITEM_VISUALS, WEAPON_VISUALS, ACC_CLASSES } from './visuals.mjs';
import { N_HEADS, HAIR_STYLES, FACIAL_HAIR } from './head.mjs';
import { BODY_SHAPES } from './body.mjs';

export const ROLES = ['rifleman', 'nco', 'officer', 'musician', 'flag_bearer', 'colour_guard', 'stretcher_bearer', 'signalman', 'artilleryman', 'trooper'];
export const FLAG_BITS = { flag_bearer: 1, colour_guard: 2, coat_off: 4, officer: 8, musician: 16, mounted_capable: 32, captured_item: 64, gap_item: 128 };
export const INSTANCE_WORDS = 4, INSTANCE_BYTES = 16;
// tuning parameters of the DISTRIBUTIONS (no source in the repository gives any of them: TIERS.json F-DIST-*). Weights, not percentages of a documented population.
export const DIST = {
  facial_hair: [0.30, 0.22, 0.06, 0.18, 0.06, 0.06, 0.12],            // FACIAL_HAIR order: clean, moustache, goatee, full beard, mutton chops, chin curtain, burnsides
  hair_style: [1, 1.4, 1.2, 1.1, 0.6, 0.5, 0.6, 0.9], hair_colour: [1.2, 2.0, 2.6, 1.8, 0.9, 0.5, 0.5, 0.1], grey_share: 0.12,
  coat_off: { '1863-07-01': 0.10, '1863-07-02': 0.25, '1863-07-03': 0.35 },   // "shirt-sleeves common" on July 2-3 (kit wear_states, tier inferred); the numbers are ours
};
const wpick = (w, u) => { const t = w.reduce((a, b) => a + b, 0); let r = u * t, i = 0; for (; i < w.length - 1; i++) { r -= w[i]; if (r < 0) break; } return i; };
const h = (seed, k) => hash4(seed >>> 0, k, 0, 7);
const first = (m, f) => (m.fields[f] ? m.fields[f].items[0] : null);
const spec = id => { const s = ITEM_VISUALS[id]; if (!s) throw new Error('no visual for catalogue item ' + id); return s; };
const pickOpt = (s, seed, salt) => (s.opts ? s.opts[h(seed, salt) % s.opts.length] : s.col);
export const rankClassOf = rank => ({ private: 'private', corporal: 'corporal', sergeant: 'sergeant', 'first sergeant': 'first sergeant', lieutenant: 'lieutenant', captain: 'captain', 'field officer': 'field officer', general: 'general' })[rank] ?? 'private';
const OFFICER_RANKS = ['lieutenant', 'captain', 'field officer', 'general'];

// ---- the variant: everything that changes the model or its colours, nothing per-man (head, skin, stature, wear are per-instance)
export function variantFromManifest(m) {
  if (m.disputed) throw new Error('a disputed unit has no single variant: build one per scenario variant (m.variants[name])');
  const seed = m.seed, army = m.army, V = { army, branch: m.branch, rank: rankClassOf(m.rank), parts: {}, words: {}, gap_items: [], captured: false, barred: [], items: {} };
  const colourWords = {};      // slot name -> colour word
  const use = (field, saltOff = 0) => { const id = first(m, field); if (!id) return null; V.items[field] = id; const s = spec(id); if (s.gap) V.gap_items.push(id); if (s.captured) V.captured = true; if (s.barred) V.barred.push(id); if (s.reference_only) V.barred.push(id + ' (reference-only item, unit absent)'); return { id, s, col: pickOpt(s, seed, 40 + saltOff) }; };
  const hd = use('headgear', 1), ct = use('coat', 2), sh = use('shirt', 3), tr = use('trousers', 4), sc = use('shoes', 5), bd = use('badge', 6), fl = use('flag_or_instrument', 7);
  // headgear
  if (hd) { V.parts.hat = { kind: hd.s.kind, badge_on_hat: !!hd.s.badge_on_hat }; colourWords.HEADGEAR = hd.col.HEADGEAR; colourWords.HEAD_TRIM = hd.col.HEAD_TRIM; }
  if (ct) { V.parts.coat = { cut: ct.s.cut, deco: ct.s.deco ?? [], buttons: ct.s.buttons ?? 'brass', officer: !!ct.s.officer }; colourWords.COAT = ct.col.COAT; colourWords.COAT_TRIM = ct.s.trimCol ?? ct.col.COAT_TRIM; }
  if (sh) colourWords.SHIRT = sh.col.SHIRT;
  if (tr) { V.parts.trousers = { cut: tr.s.cut, stripe: !!tr.s.hasStripe, seat: !!tr.s.seat, fades: !!tr.s.fades }; colourWords.TROUSERS = tr.col.TROUSERS; colourWords.TROUSER_TRIM = tr.col.TROUSER_TRIM; }
  if (sc) { V.parts.shoes = { kind: sc.s.kind }; colourWords.BOOT = sc.s.col.BOOT; colourWords.GAITER = sc.s.col.GAITER; }
  // badge
  V.parts.badge = bd && !bd.s.none ? { shape: bd.s.shape } : null; if (bd && bd.s.col) colourWords.BADGE = bd.s.col;
  // accoutrements: class presence in the mask; style where the class has styles
  let mask = 0; const styles = {};
  for (const id of m.fields.accoutrements ? m.fields.accoutrements.items : []) {
    const s = spec(id); if (s.gap) V.gap_items.push(id); if (s.captured) V.captured = true; if (s.reference_only) V.barred.push(id + ' (reference-only)');
    if (s.cls === 'none' || s.cls === 'horse_tack') { if (s.cls === 'horse_tack') V.mounted_tack = true; continue; }
    const bit = ACC_CLASSES.indexOf(s.cls); if (bit < 0) throw new Error('accoutrement class ' + s.cls); mask |= 1 << bit;
    if (['belt', 'cartbox', 'canteen', 'haversack', 'sash'].includes(s.cls)) styles[s.cls] = { item: id, ...s };
    if (s.cls === 'knapsack') styles.knapsack = { item: id, ...s };
  }
  // pack state overrides the knapsack / blanket classes when the manifest carries one
  const ps = first(m, 'pack_state'); if (ps) { V.items.pack_state = ps; const p = spec(ps).pack; mask &= ~((1 << ACC_CLASSES.indexOf('knapsack')) | (1 << ACC_CLASSES.indexOf('blanket'))); if (p === 'knapsack') { mask |= 1 << ACC_CLASSES.indexOf('knapsack'); styles.knapsack = styles.knapsack ?? { item: 'knapsack_default', cls: 'knapsack', fur: false }; } else if (p === 'roll') mask |= 1 << ACC_CLASSES.indexOf('blanket'); V.pack = p; }
  // the sash field
  const sf = first(m, 'sash'); if (sf && !spec(sf).none) { const s = spec(sf); mask |= 1 << ACC_CLASSES.indexOf('sash'); styles.sash = { item: sf, ...s }; }
  if (styles.sash) colourWords.SASH = styles.sash.col ?? 'crimson';
  colourWords.BLANKET = ['blanket_gray', 'blanket_brown', 'blanket_blue'][h(seed, 50) % 3];
  V.styles = Object.fromEntries(Object.entries(styles).map(([k, s]) => [k, { item: s.item, plate: s.plate, army: s.army, sling: s.sling, fur: s.fur, wide: s.wide, painted: s.painted, cs: s.cs }]));
  // weapon, bayonet, sidearm
  const wid = first(m, 'weapon'); V.weapon = wid; if (wid && !WEAPON_VISUALS[wid]) throw new Error('no visual for weapon ' + wid);
  const by = first(m, 'bayonet'); V.bayonet = by ? spec(by).state : 'none'; if (V.bayonet !== 'none' && (!wid || WEAPON_VISUALS[wid].type !== 'long' || WEAPON_VISUALS[wid].spec.kind === 'carbine')) V.bayonet = 'none';
  if (V.bayonet === 'scabbard') mask |= 1 << ACC_CLASSES.indexOf('scabbard'); else mask &= ~(1 << ACC_CLASSES.indexOf('scabbard'));
  V.sidearm = (m.fields.sidearm_sword ? m.fields.sidearm_sword.items : []).filter(i => { const s = ITEM_VISUALS[i]; return !(s && s.none); });
  for (const i of V.sidearm) if (!ITEM_VISUALS[i] && !WEAPON_VISUALS[i]) throw new Error('no visual for sidearm/sword ' + i);
  // flags and instruments
  V.flag = fl && fl.s.slot === 'flag' && !fl.s.none ? fl.s.flag : null; V.instrument = fl && fl.s.slot === 'instrument' ? fl.s.instr : null;
  // colours -> palette (RGB) for the variant slots
  const palette = {}; for (const slot of VARIANT_SLOTS) palette[slot] = null;
  const set = (slot, word) => { if (word == null) return; const rgb = COLOUR[word]; if (!rgb) throw new Error('unknown colour word ' + word); palette[slot] = rgb; };
  set(MAT.COAT, colourWords.COAT); set(MAT.COAT_TRIM, colourWords.COAT_TRIM); set(MAT.SHIRT, colourWords.SHIRT); set(MAT.TROUSERS, colourWords.TROUSERS); set(MAT.TROUSER_TRIM, colourWords.TROUSER_TRIM); set(MAT.HEADGEAR, colourWords.HEADGEAR);
  set(MAT.HEAD_TRIM, colourWords.HEAD_TRIM); set(MAT.BOOT, colourWords.BOOT); set(MAT.SASH, colourWords.SASH); set(MAT.GAITER, colourWords.GAITER); set(MAT.BADGE, colourWords.BADGE); set(MAT.BLANKET, colourWords.BLANKET);
  V.palette = palette; V.colourWords = colourWords; V.mask = mask;
  V.role = roleOf(m, V);
  V.key = JSON.stringify([army, V.branch, V.rank === 'private' || V.rank === 'corporal' || V.rank === 'sergeant' || V.rank === 'first sergeant' ? V.rank : V.rank, V.parts, V.styles, V.weapon, V.bayonet, V.sidearm, V.flag, V.instrument, colourWords, V.pack ?? null, V.mounted_tack ?? false]);
  return V;
}
function roleOf(m, V) {
  const rank = m.rank; if (V.flag) return 'flag_bearer'; if (V.instrument === 'drum' || V.instrument === 'fife' || V.instrument === 'bugle') return 'musician'; if (V.instrument === 'stretcher') return 'stretcher_bearer'; if (V.instrument === 'wigwag') return 'signalman';
  if (OFFICER_RANKS.includes(rank)) return 'officer'; if (V.branch === 'artillery') return 'artilleryman'; if (V.branch === 'cavalry') return 'trooper'; if (rank !== 'private') return 'nco'; return 'rifleman';
}

// ---- the per-man identity from the manifest's seed (independent streams; the same seed always gives the same man)
export function identityFromSeed(seed, V) {
  const u = k => R(seed, 300 + k);
  const head = h(seed, 11) % N_HEADS, shape = h(seed, 12) % BODY_SHAPES.length, skin = skinToneIndex(seed);
  const style = wpick(DIST.hair_style, u(1)), hcol = wpick(DIST.hair_colour, u(2)), grey = u(3) < DIST.grey_share ? 1 + (u(4) < 0.4 ? 1 : 0) : 0;
  let fw = DIST.facial_hair.slice(); if (V && V.rank !== 'private' && V.rank !== 'corporal') { fw = fw.map((x, i) => (i === 0 ? x * 0.7 : x * 1.1)); }
  const facial = wpick(fw, u(5)), stubble = facial === 0 && u(7) < 0.35 ? 0.5 + 0.5 * u(8) : 0, eye = h(seed, 15) % 5, stature = Math.floor(u(6) * 255.999), tint = tintFor(seed);
  return { head, shape, skin, hair: style | (hcol << 3) | (grey << 6), facial, stubble, eye, stature, statureScale: 0.93 + 0.115 * stature / 255, tint: { value: tint.value, warm: tint.warm } };
}
const q4 = (x, range) => Math.max(0, Math.min(15, Math.round((x / range * 0.5 + 0.5) * 15)));
export const dq4 = (q, range) => ((q / 15) - 0.5) * 2 * range;

// ---- the registry (interning) and the pack/unpack of instance records
export class VariantTable {
  constructor() { this.byKey = new Map(); this.list = []; }
  intern(V) { let i = this.byKey.get(V.key); if (i === undefined) { i = this.list.length; if (i > 65535) throw new Error('more than 65536 outfit variants'); this.byKey.set(V.key, i); this.list.push(V); } return i; }
}
export function coatOff(seed, date, V) {
  if (V.rank !== 'private' && V.rank !== 'corporal') return false; if (!V.parts.coat || V.branch === 'cavalry') return false; const p = DIST.coat_off[date] ?? 0; return R(seed, 330) < p && V.parts.coat.cut !== 'zouave';
}
// manifest (+ the table) -> the 4 words of the instance record
export function instanceWords(m, table) {
  const V = variantFromManifest(m), idx = table.intern(V), id = identityFromSeed(m.seed, V), off = coatOff(m.seed, m.date, V);
  const wear = Math.max(0, Math.min(255, Math.round(m.wear_state.level * 255)));
  let flags = 0; if (V.role === 'flag_bearer') flags |= FLAG_BITS.flag_bearer; if (V.role === 'musician') flags |= FLAG_BITS.musician; if (off) flags |= FLAG_BITS.coat_off; if (OFFICER_RANKS.includes(m.rank)) flags |= FLAG_BITS.officer;
  if (V.branch === 'cavalry') flags |= FLAG_BITS.mounted_capable; if (V.captured) flags |= FLAG_BITS.captured_item; if (V.gap_items.length) flags |= FLAG_BITS.gap_item;
  const tint = q4(id.tint.value, 0.08) | (q4(id.tint.warm, 0.04) << 4);
  const w0 = (idx & 0xffff) | ((V.mask & 0xffff) << 16), w1 = (id.head | (id.shape << 8) | (id.skin << 16) | (id.hair << 24)) >>> 0, w2 = ((id.facial | (id.eye << 3)) | (id.stature << 8) | (wear << 16) | (tint << 24)) >>> 0;
  const w3 = (flags | (ROLES.indexOf(V.role) << 8)) >>> 0;
  return { words: [w0 >>> 0, w1, w2, w3], variant: V, index: idx, identity: id };
}
export function unpackInstance(w) {
  const [w0, w1, w2, w3] = w;
  return { kit_variant: w0 & 0xffff, acc_mask: w0 >>> 16, head: w1 & 255, body_shape: (w1 >>> 8) & 255, skin_tone: (w1 >>> 16) & 255, hair_style: (w1 >>> 24) & 7, hair_colour: (w1 >>> 27) & 7, hair_grey: (w1 >>> 30) & 3, facial_hair: w2 & 7, eye_colour: (w2 >>> 3) & 7,
    stature: ((w2 >>> 8) & 255), stature_scale: 0.93 + 0.115 * ((w2 >>> 8) & 255) / 255, wear: (w2 >>> 16) & 255, tint_value: dq4((w2 >>> 24) & 15, 0.08), tint_warm: dq4((w2 >>> 28) & 15, 0.04), flags: w3 & 255, role: ROLES[(w3 >>> 8) & 255], lod_hint: (w3 >>> 16) & 255 };
}
// the renderer's existing variation scalar convention (sold1.w) stays available from the manifest via history/figures.mjs vari(); this record adds the rest
export const HAIR_STYLE_NAMES = HAIR_STYLES, FACIAL_HAIR_NAMES = FACIAL_HAIR;
// ---- LOD classes: the silhouette signatures that decide which merged mid mesh and which impostor a variant uses (cheap, bounded; counted in the cost model)
export function midClassKey(V, mask) {
  const bit = c => (mask >> ACC_CLASSES.indexOf(c)) & 1, load = bit('knapsack') ? 2 : bit('blanket') || bit('overcoat') ? 1 : 0, w = V.weapon ? WEAPON_VISUALS[V.weapon] : null;
  const wclass = !w ? 'none' : w.type === 'long' ? (w.spec.overall_in > 50 ? 'long' : 'short') : w.type === 'sword' ? 'sword' : w.type === 'hand' ? 'hand' : 'none';
  const sw = V.sidearm.some(i => WEAPON_VISUALS[i] && WEAPON_VISUALS[i].type === 'sword');
  return [V.army[0], V.parts.coat ? V.parts.coat.cut : '-', V.parts.hat ? V.parts.hat.kind : '-', V.parts.trousers ? V.parts.trousers.cut : '-', V.parts.shoes ? V.parts.shoes.kind : '-', wclass, load, bit('cartbox'), bit('canteen'), bit('haversack'), bit('sash'), sw ? 1 : 0, V.flag ? 'F' : V.instrument ?? '-', V.bayonet === 'fixed' ? 'b' : '-'].join('|');
}
export function impostorClassKey(V, mask) {
  const bit = c => (mask >> ACC_CLASSES.indexOf(c)) & 1, load = bit('knapsack') ? 2 : bit('blanket') || bit('overcoat') ? 1 : 0, w = V.weapon ? WEAPON_VISUALS[V.weapon] : null;
  const skirt = V.parts.coat ? (['frock', 'frock_double', 'civilian'].includes(V.parts.coat.cut) ? 'long' : V.parts.coat.cut === 'sack' ? 'mid' : 'short') : '-';
  return [skirt, V.parts.hat ? V.parts.hat.kind : '-', V.parts.trousers && ['baggy', 'chasseur'].includes(V.parts.trousers.cut) ? 'baggy' : 'str', load, w && w.type === 'long' ? (w.spec.overall_in > 50 ? 'L' : 'S') : '-', V.flag ? 'F' : V.instrument ?? '-', V.bayonet === 'fixed' ? 'b' : '-'].join('|');
}

// ---- the CPU reference of the shader's colour resolution: 64 material rows for one man (variant palette slots, skin, hair, eyes, wear/dirt/tint). The shader must reproduce this (gate G11, delta E <= 3 once swatches exist).
// the vermilion follows the man's skin (a flat pink on a dark complexion read as a clown mouth): a redder, darker version of the skin tone (plausible-procedural, F-COLOUR-RGB)
export const lipColour = k => [Math.round(k[0] * 0.90 + 8), Math.round(k[1] * 0.64), Math.round(k[2] * 0.66)];
export function resolveColours(V, id, wear01, dateState = 'dust') {
  const rows = GLOBAL_MATERIALS.map(r => [r[0], r[1], r[2]]), cloth = [MAT.COAT, MAT.COAT_TRIM, MAT.SHIRT, MAT.TROUSERS, MAT.TROUSER_TRIM, MAT.HEADGEAR, MAT.BOOT, MAT.GAITER, MAT.BLANKET, MAT.CANVAS, MAT.SASH];
  for (const slot of VARIANT_SLOTS) if (V.palette[slot]) rows[slot] = V.palette[slot];
  rows[MAT.SKIN] = SKIN_TONES[id.skin]; rows[MAT.LIP] = lipColour(SKIN_TONES[id.skin]); rows[MAT.HAIR] = HAIR_COLOURS[(id.hair >> 3) & 7].rgb.map(x => (((id.hair >> 6) & 3) ? Math.round(x * 0.5 + 100) : x)); rows[MAT.IRIS] = EYE_COLOURS[id.eye].rgb; rows[MAT.HAIR_CARD] = rows[MAT.HAIR]; rows[MAT.BEARD_CARD] = rows[MAT.HAIR];
  if (V.parts.trousers && V.parts.trousers.fades) rows[MAT.TROUSERS] = rows[MAT.TROUSERS].map((x, i) => Math.round(x + ([150, 165, 180][i] - x) * 0.35 * wear01));        // sky blue fades toward gray-blue with wear (kit label)
  for (const s of cloth) rows[s] = applyWear(rows[s], wear01, dateState, id.tint);
  return rows;
}
