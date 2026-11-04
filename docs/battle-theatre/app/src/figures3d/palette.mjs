// Material slots and colour palette for the figure models.
// TIER OF THE NUMBERS: the colour WORDS come from the kit catalogue (kit/kit_specs.json item labels: "sky blue", "dark blue", "butternut", "black felt" ...) and carry that item's tier;
// the sRGB VALUES below are PLAUSIBLE-PROCEDURAL. No dye swatch, museum colour measurement or period spectrophotometry was read for this task (render PLAN G11 asks for "per-kit albedo from the
// research team's swatches": there are none yet). They are collected here, one place, so the owner/colour team can replace them (TIERS.json F-COLOUR-RGB, gap F-GAP-SWATCH).
import { hash4, rand } from '../../../sim/rng.mjs';
import { clamp } from './mathlib.mjs';

export const MAT = Object.freeze({
  NONE: 0, SKIN: 1, LIP: 2, HAIR: 3, EYE_WHITE: 4, IRIS: 5, TEETH: 6, COAT: 7, COAT_TRIM: 8, SHIRT: 9, TROUSERS: 10, TROUSER_TRIM: 11, HEADGEAR: 12, HEAD_TRIM: 13, BRASS: 14, LEATHER_BLACK: 15, LEATHER_TAN: 16, CANVAS: 17, BLANKET: 18,
  BOOT: 19, WOOD: 20, STEEL: 21, BRONZE: 22, IRON: 23, FLAG_RED: 24, FLAG_WHITE: 25, FLAG_BLUE: 26, FLAG_GREEN: 27, GAP: 28, SASH: 29, GAITER: 30, PIPING_YELLOW: 31, PIPING_RED: 32, PIPING_LIGHTBLUE: 33, TIN: 34, HORSE_COAT: 35,
  HORSE_MANE: 36, HORSE_HOOF: 37, SADDLE_LEATHER: 38, SADDLE_BLANKET: 39, DRUM_SKIN: 40, CARRIAGE_PAINT: 41, GOLD: 42, SILVER: 43, FEATHER: 44, BADGE: 45, FLAG_YELLOW: 46, GUNMETAL: 47, ROPE: 48, GUM_RUBBER: 49, EYE_DARK: 50, STAR_WHITE: 51,
  THREAD: 52, NAIL: 53, TONGUE: 54, GUM: 55, SOLE: 56, HAIR_CARD: 57, BEARD_CARD: 58,
});
export const MAT_NAMES = Object.fromEntries(Object.entries(MAT).map(([k, v]) => [v, k]));
// slots whose colour is chosen per outfit variant (the rest are global, fixed by the table below)
export const VARIANT_SLOTS = [MAT.COAT, MAT.COAT_TRIM, MAT.SHIRT, MAT.TROUSERS, MAT.TROUSER_TRIM, MAT.HEADGEAR, MAT.HEAD_TRIM, MAT.BOOT, MAT.SASH, MAT.GAITER, MAT.BADGE, MAT.BLANKET, MAT.HORSE_COAT, MAT.HORSE_MANE];

const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
// named colours (sRGB 0-255); the key is the colour word from the item label where there is one
export const COLOUR = Object.fromEntries(Object.entries({
  union_dark_blue: '#222a46', union_dark_blue_alt: '#27304e', union_blue_medium: '#2f3d63', sky_blue: '#7a98b9', sky_blue_faded: '#8fa3b4', dark_blue_trousers: '#262e48', light_blue_piping: '#6f9bd0', yellow_piping: '#cda933', red_piping: '#a9231d', orange_stripe: '#c9741f',
  black_felt: '#18171a', black_leather: '#171514', russet_leather: '#6f4a2a', brass: '#b8923e', gold_lace: '#c9a54a', silver: '#c0c4c8', canvas_natural: '#b9a982', canvas_painted_black: '#26231f', blanket_gray: '#76756a', blanket_brown: '#6a5a45', blanket_blue: '#3b4a6b', gum_black: '#1d1b1a',
  shirt_gray_wool: '#75756e', shirt_white: '#dcd9cb', shirt_plaid: '#7a463f', shirt_unknown: '#808080', tin: '#a8adb2', steel: '#8b9096', wood: '#5a3a22', wood_dark: '#3d2815', gunmetal: '#3a3d42', bronze: '#9a6a2e', iron: '#2d3035',
  cs_gray: '#7d7f77', cs_butternut: '#8d7248', cs_brown: '#5f4631', cs_gray_trousers: '#85857d', cs_butternut_trousers: '#97784a', cs_blue_captured: '#3a4a6c', cs_slouch_brown: '#5a4634', cs_slouch_gray: '#6e6c63', cs_slouch_black: '#1e1d1c', straw: '#c9b57c', cs_red_sash: '#8c1f1c', buff_sash: '#cbb98a', crimson: '#8a1b22',
  zouave_red: '#a1342d', zouave_madder: '#9c3b32', fez_red: '#b02a2a', tassel_gold: '#c9a23a', white_gaiter: '#d6d3c5', zouave_sky: '#7ea3c9', berdan_green: '#3d4d34', berdan_green_hat: '#44563a', green_band: '#2f6a3a',
  flag_red: '#b3222e', flag_white: '#ebe8df', flag_blue: '#2c3f7d', flag_green: '#2f6d3a', flag_yellow: '#d5b13a', anv_red: '#a3262a', anv_blue: '#26357a', gap_marker: '#8a6fa8', horse_gunmetal: '#3a3d42',
  carriage_olive: '#4b5230', hoof: '#2a2420', rubber: '#1c1b1b', rope: '#a69265', black_feather: '#101012', drum_skin: '#d8cfb2', drum_shell: '#8a5a2a', eye_white: '#e9e6df', teeth: '#d9d2bc', lip: '#a4625a', eye_dark: '#1c1512', thread: '#3b362e', nail: '#d9b8a6', tongue: '#9b4d4b', gum: '#b2605e', sole: '#3a2a1c',
}).map(([k, v]) => [k, hex(v)]));
export const HAIR_COLOURS = [['black', '#15110f'], ['dark_brown', '#322217'], ['brown', '#54392a'], ['light_brown', '#7a5a38'], ['blond', '#aa8c55'], ['red', '#7d3d22'], ['gray', '#82807d'], ['white', '#c1beb7']].map(([n, h]) => ({ name: n, rgb: hex(h) }));
export const EYE_COLOURS = [['brown', '#4a2f1b'], ['hazel', '#6b5530'], ['blue', '#4f6f93'], ['gray', '#7c8388'], ['green', '#55704a']].map(([n, h]) => ({ name: n, rgb: hex(h) }));
// 12 skin tones from fair (sun-reddened) to dark brown; a TUNING RANGE (plausible-procedural). The weights are tuning parameters with NO demographic source: F-GAP-COMPLEXION.
export const SKIN_TONES = ['#e8c4a8', '#e0b898', '#d8ac88', '#cf9f7a', '#c4936d', '#b98660', '#aa7852', '#996a47', '#865b3c', '#744c32', '#5f3e29', '#4b3022'].map(h => hex(h));
export const SKIN_WEIGHTS = [4, 6, 8, 8, 7, 6, 5, 4, 2.5, 1.5, 1, 0.5];
// the fixed (global) rows: [r,g,b, roughness, metallic]
export const GLOBAL_MATERIALS = (() => {
  const g = (c, r = 0.8, m = 0) => [...COLOUR[c], r, m], t = [];
  t[MAT.NONE] = [0, 0, 0, 1, 0]; t[MAT.SKIN] = [...SKIN_TONES[3], 0.55, 0]; t[MAT.LIP] = g('lip', 0.5); t[MAT.HAIR] = [...HAIR_COLOURS[2].rgb, 0.7, 0]; t[MAT.EYE_WHITE] = g('eye_white', 0.3); t[MAT.IRIS] = [...EYE_COLOURS[0].rgb, 0.3, 0]; t[MAT.TEETH] = g('teeth', 0.35);
  t[MAT.COAT] = g('union_dark_blue', 0.95); t[MAT.COAT_TRIM] = g('light_blue_piping', 0.9); t[MAT.SHIRT] = g('shirt_gray_wool', 0.95); t[MAT.TROUSERS] = g('sky_blue', 0.95); t[MAT.TROUSER_TRIM] = g('union_dark_blue', 0.9); t[MAT.HEADGEAR] = g('union_dark_blue', 0.9); t[MAT.HEAD_TRIM] = g('brass', 0.35, 1);
  t[MAT.BRASS] = g('brass', 0.32, 1); t[MAT.LEATHER_BLACK] = g('black_leather', 0.5); t[MAT.LEATHER_TAN] = g('russet_leather', 0.55); t[MAT.CANVAS] = g('canvas_natural', 0.95); t[MAT.BLANKET] = g('blanket_gray', 0.97); t[MAT.BOOT] = g('black_leather', 0.5);
  t[MAT.WOOD] = g('wood', 0.5); t[MAT.STEEL] = g('steel', 0.3, 1); t[MAT.BRONZE] = g('bronze', 0.35, 1); t[MAT.IRON] = g('iron', 0.5, 1); t[MAT.FLAG_RED] = g('flag_red', 0.9); t[MAT.FLAG_WHITE] = g('flag_white', 0.9); t[MAT.FLAG_BLUE] = g('flag_blue', 0.9); t[MAT.FLAG_GREEN] = g('flag_green', 0.9); t[MAT.FLAG_YELLOW] = g('flag_yellow', 0.9);
  t[MAT.GAP] = g('gap_marker', 0.9); t[MAT.SASH] = g('crimson', 0.8); t[MAT.GAITER] = g('white_gaiter', 0.9); t[MAT.PIPING_YELLOW] = g('yellow_piping', 0.85); t[MAT.PIPING_RED] = g('red_piping', 0.85); t[MAT.PIPING_LIGHTBLUE] = g('light_blue_piping', 0.85);
  t[MAT.TIN] = g('tin', 0.35, 1); t[MAT.HORSE_COAT] = [...hex('#6a4326'), 0.7, 0]; t[MAT.HORSE_MANE] = [...hex('#1c1511'), 0.8, 0]; t[MAT.HORSE_HOOF] = g('hoof', 0.5); t[MAT.SADDLE_LEATHER] = g('black_leather', 0.5); t[MAT.SADDLE_BLANKET] = g('blanket_blue', 0.95);
  t[MAT.DRUM_SKIN] = g('drum_skin', 0.7); t[MAT.CARRIAGE_PAINT] = g('carriage_olive', 0.7); t[MAT.GOLD] = g('gold_lace', 0.3, 1); t[MAT.SILVER] = g('silver', 0.25, 1); t[MAT.FEATHER] = g('black_feather', 0.9); t[MAT.BADGE] = g('flag_red', 0.8);
  t[MAT.GUNMETAL] = g('gunmetal', 0.35, 1); t[MAT.ROPE] = g('rope', 0.95); t[MAT.GUM_RUBBER] = g('gum_black', 0.6); t[MAT.EYE_DARK] = g('eye_dark', 0.4); t[MAT.THREAD] = g('thread', 0.9); t[MAT.NAIL] = g('nail', 0.35); t[MAT.TONGUE] = g('tongue', 0.45); t[MAT.GUM] = g('gum', 0.5); t[MAT.SOLE] = g('sole', 0.75); t[MAT.STAR_WHITE] = g('flag_white', 0.9);
  t[MAT.HAIR_CARD] = t[MAT.HAIR]; t[MAT.BEARD_CARD] = t[MAT.HAIR];       // strand cards take the man's hair colour (variants.mjs resolveColours)
  for (let i = 0; i < 64; i++) if (!t[i]) t[i] = [128, 128, 128, 0.8, 0];
  return t;
})();
// Skin shading approximated in the procedural material (the product shader reproduces it; tools/figures3d-sheets.mjs applies it in the inspection renders): wrapped diffuse (light bleeds past the terminator)
// plus a red-orange scatter band at the terminator, strongest on thin skin (ears, nostril wings, lids, lips: vertex flag 255 = thin). All numbers are PLAUSIBLE-PROCEDURAL tuning values (F-SKIN-SSS); no skin measurement was read.
export const SKIN_SSS = { materials: [MAT.SKIN, MAT.LIP, MAT.NAIL, MAT.TONGUE, MAT.GUM], wrap: 0.42, scatter_rgb: [0.80, 0.28, 0.17], scatter_width: 0.26, scatter_strength: 0.16, thin_boost: 1.6, kind: 'wrapped diffuse + terminator scatter (sum of two Gaussians approximated by one tinted band)', tier: 'plausible-procedural' };
export const HORSE_COATS = [{ name: 'bay', rgb: hex('#6a4326'), mane: hex('#1c1511') }, { name: 'dark_bay', rgb: hex('#4a2d1a'), mane: hex('#150f0c') }, { name: 'chestnut', rgb: hex('#8a4a22'), mane: hex('#6e3a1a') }, { name: 'black', rgb: hex('#1d1b1c'), mane: hex('#121011') },
  { name: 'gray', rgb: hex('#9a9ca0'), mane: hex('#74767a') }, { name: 'sorrel', rgb: hex('#9c5a2a'), mane: hex('#b78a50') }, { name: 'brown', rgb: hex('#4f3524'), mane: hex('#241a14') }, { name: 'roan', rgb: hex('#7a6558'), mane: hex('#3a2f29') }];

// ---- per-man deterministic variation (render PLAN G8: continuous wear, tint). All inputs are integers from the figure manifest's seed; no Math.random.
export const R = (seed, k) => rand(seed >>> 0, k, 0, 1);
export function skinToneIndex(seed) { const tot = SKIN_WEIGHTS.reduce((a, b) => a + b, 0); let r = R(seed, 201) * tot, i = 0; for (; i < SKIN_WEIGHTS.length - 1; i++) { r -= SKIN_WEIGHTS[i]; if (r < 0) break; } return i; }
// dye-lot tint: [value shift (-0.08..0.08), hue-ish warm/cool shift (-0.04..0.04)]; wear 0..1 fades (toward gray-blue for sky blue; toward tan for dust) and darkens with sweat/rain
export function tintFor(seed) { return { value: (R(seed, 202) - 0.5) * 0.16, warm: (R(seed, 203) - 0.5) * 0.08 }; }
export function applyWear(rgb, wear, dateState, tint) {
  // rgb 0-255 -> sRGB 0-255. wear 0..1 (the manifest's wear level, a TUNING PARAMETER, inferred); dateState: 'dust' | 'powder' | 'rain'
  let [r, g, b] = rgb.map(x => x / 255); const fade = 0.18 * wear;
  const L = 0.3 * r + 0.59 * g + 0.11 * b; r += (L * 1.02 - r) * fade; g += (L * 1.0 - g) * fade; b += (L * 0.96 - b) * fade;       // fading toward a duller gray
  const dust = dateState === 'dust' ? 0.12 * wear : 0, dark = dateState === 'rain' ? -0.16 : dateState === 'powder' ? -0.06 * wear : 0;
  r += (0.62 - r) * dust; g += (0.55 - g) * dust; b += (0.42 - b) * dust;
  const s = 1 + (tint ? tint.value : 0) + dark; r = clamp(r * s + (tint ? tint.warm : 0), 0, 1); g = clamp(g * s, 0, 1); b = clamp(b * s - (tint ? tint.warm : 0), 0, 1);
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}
export const hashSeed = (a, b = 0, c = 0, d = 0) => hash4(a, b, c, d);
