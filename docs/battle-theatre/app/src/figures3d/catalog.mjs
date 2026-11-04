// The complete part catalogue (every part id the composition rules can ask for) and the GPU outfit-variant row layout. The catalogue order is the index the variant rows and the export use; it is
// generated from the tables, never from a population, so it is the same on every run (deterministic hashes) and complete by construction (a test checks every id a population asks for is in it).
import { WEAPON_VISUALS, ACC_CLASSES } from './visuals.mjs';
import { COAT_CUTS, TROUSER_CUTS, HAT_KINDS } from './garments.mjs';
import { N_HEADS, HAIR_STYLES, FACIAL_HAIR } from './head.mjs';
import { FLAG_KINDS, FLAG_STATES } from './flags.mjs';
import { PIECES } from './guns.mjs';
import { BADGE_SHAPES } from './visuals.mjs';
import { VARIANT_SLOTS } from './palette.mjs';

const SHOE_KINDS = ['brogan', 'worn', 'boot_tall', 'barefoot', 'gaiter', 'legging'];
const RANKS = ['corporal', 'sergeant', 'first sergeant', 'lieutenant', 'captain', 'field officer', 'general'];
export const DECOS = ['straps', 'green_chevrons', 'birdcage_braid', 'chevrons', 'collar_insignia'];
export const INSTRUMENTS = ['drum', 'fife', 'bugle', 'wigwag', 'stretcher'];
export function buildCatalog() {
  const C = [];
  for (let i = 0; i < N_HEADS; i++) C.push(`head:${i}`);
  for (let i = 0; i < HAIR_STYLES.length; i++) C.push(`hair:${i}`);
  for (let i = 1; i < FACIAL_HAIR.length; i++) C.push(`beard:${i}`);
  C.push('hands');
  for (const c of Object.keys(COAT_CUTS)) C.push(`coat:${c}`);
  for (const d of DECOS) C.push(`deco:${d}`);
  for (const t of Object.keys(TROUSER_CUTS)) for (const s of [0, 1]) for (const seat of [0, 1]) for (const env of ['0', 'S', 'M', 'L']) C.push(`trousers:${t}:${s}:${seat}:${env}`);
  for (const k of SHOE_KINDS) C.push(`foot:${k}`);
  for (const k of HAT_KINDS) C.push(`hat:${k}`);
  for (const b of BADGE_SHAPES) C.push(`badge:${b}`);
  for (const r of RANKS) C.push(`rank:${r}`);
  for (const p of ['oval_us', 'rect_eagle', 'plain', 'upside_down']) C.push(`acc:belt:${p}`);
  C.push('acc:cartbox:union', 'acc:cartbox:confederate:sling', 'acc:cartbox:confederate', 'acc:cap_pouch', 'acc:bayonet_scabbard', 'acc:canteen:tin', 'acc:canteen:wood', 'acc:haversack:painted', 'acc:haversack:plain', 'acc:knapsack:std', 'acc:knapsack:fur', 'acc:blanket_roll', 'acc:gum_blanket', 'acc:tin_cup', 'acc:sash:n', 'acc:sash:w', 'acc:poncho', 'acc:overcoat_roll', 'acc:shelter_half', 'acc:tools', 'acc:cavalry_set');
  for (const [id, w] of Object.entries(WEAPON_VISUALS)) { if (w.type === 'long') { C.push(`arm:${id}:b0`); C.push(`arm:${id}:bf`); } else if (w.type === 'hand') C.push(`hand:${id}`); else if (w.type === 'sword') { C.push(`sword:${id}`); C.push(`scabbard:${id}`); } }
  C.push('holster');
  for (const i of INSTRUMENTS) C.push(`instr:${i}`);
  C.push('staff'); for (const f of FLAG_KINDS) for (const s of FLAG_STATES) C.push(`flag:${f}:${s}`);
  C.push('horse:riding', 'horse:draught');
  for (const p of Object.keys(PIECES)) C.push(`tube:${p}`);
  C.push('carriage', 'limber', 'caisson', 'implement:rammer', 'implement:handspike');
  return C;
}
// GPU outfit-variant row: 80 bytes = 20 u32 (little endian)
//  u16 x 3: mid silhouette class, accessory class, impostor class | u16 x 9: catalogue index of hat, coat, trousers, foot, long arm, sword, handgun, badge, instrument-or-flag-cloth (0xffff = none)
//  u8: role, rank, flag kind (1+FLAG_KINDS idx, 0 none), bayonet (0 none 1 fixed 2 scabbard), army (0 union 1 confederate), branch (0 inf 1 art 2 cav 3 other), gap_items count, reserved
//  then 14 x RGB (the VARIANT_SLOTS colours; 0,0,0 where the variant does not define the slot) = 42 bytes. Total 6 + 18 + 8 + 42 = 74, padded to 80.
export const VARIANT_ROW_BYTES = 80;
export const ROW_SLOT_ORDER = VARIANT_SLOTS;
export const BRANCHES = ['infantry', 'artillery', 'cavalry'];
export const ACC_ORDER = ACC_CLASSES;
