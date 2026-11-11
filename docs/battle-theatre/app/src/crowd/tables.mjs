// Small tables the figure shaders read, built once on the CPU from the figures3d palette (all linear RGB):
//   PAL texture 128 x 3, RGBA32F.  row 0: x = material id 0..63 -> (r, g, b, roughness); 64..75 skin tones; 80..87 hair colours; 88..92 eye colours.
//                                  row 1: x = material id -> (metal, variant slot or -1, cloth (takes wear and dye lot) 0/1, 0).   row 2: x = 1..6 flag kind -> mean colour of the flag cloth (FLAG_WHITE is substituted).
// The colour resolution in the shaders reproduces figures3d resolveColours (variants.mjs): variant slot colours, skin / lip / hair / iris from the man's identity, wear (applyWear) and dye lot on cloth.
import { MAT, GLOBAL_MATERIALS, SKIN_TONES, HAIR_COLOURS, EYE_COLOURS } from '../figures3d/index.mjs';
import { ROW_SLOT_ORDER } from '../figures3d/catalog.mjs';

export const PAL_W = 128, PAL_H = 3, NSLOT = ROW_SLOT_ORDER.length;
const lin = v => Math.pow(v / 255, 2.2);
export const CLOTH_SLOTS = [MAT.COAT, MAT.COAT_TRIM, MAT.SHIRT, MAT.TROUSERS, MAT.TROUSER_TRIM, MAT.HEADGEAR, MAT.BOOT, MAT.GAITER, MAT.BLANKET, MAT.CANVAS, MAT.SASH];
export function buildPal(flagMean = {}) {
  const a = new Float32Array(PAL_W * PAL_H * 4), set = (row, x, r, g, b, w) => { const o = (row * PAL_W + x) * 4; a[o] = r; a[o + 1] = g; a[o + 2] = b; a[o + 3] = w; };
  for (let m = 0; m < 64; m++) { const g = GLOBAL_MATERIALS[m]; set(0, m, lin(g[0]), lin(g[1]), lin(g[2]), g[3]); set(1, m, g[4] > 0.5 ? 1 : 0, ROW_SLOT_ORDER.indexOf(m), CLOTH_SLOTS.includes(m) ? 1 : 0, 0); }
  set(0, 63, lin(104), lin(84), lin(58), 0.95); set(1, 63, 0, -1, 0, 0);                  // material 63: bare earth of the works (plausible-procedural colour)
  SKIN_TONES.forEach((c, i) => set(0, 64 + i, lin(c[0]), lin(c[1]), lin(c[2]), 0.55)); HAIR_COLOURS.forEach((h, i) => set(0, 80 + i, lin(h.rgb[0]), lin(h.rgb[1]), lin(h.rgb[2]), 0.7)); EYE_COLOURS.forEach((e, i) => set(0, 88 + i, lin(e.rgb[0]), lin(e.rgb[1]), lin(e.rgb[2]), 0.3));
  const kinds = ['us_national', 'us_regimental_gap', 'irish_green_gap', 'anv_battle', 'cav_guidon', 'ambulance_gap'];
  kinds.forEach((k, i) => { const c = flagMean[k] || [128, 128, 128]; set(2, 1 + i, lin(c[0]), lin(c[1]), lin(c[2]), 0.9); });
  return a;
}
// GLSL / WGSL constants for the material ids the shaders name
export const MATC = { SKIN: MAT.SKIN, LIP: MAT.LIP, HAIR: MAT.HAIR, IRIS: MAT.IRIS, HAIR_CARD: MAT.HAIR_CARD, BEARD_CARD: MAT.BEARD_CARD, FLAG_WHITE: MAT.FLAG_WHITE, COAT: MAT.COAT, TROUSERS: MAT.TROUSERS };
