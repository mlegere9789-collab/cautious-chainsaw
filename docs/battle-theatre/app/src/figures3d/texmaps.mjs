// Procedural material maps for the figure family, generated in code (no image asset is read, downloaded or stored): 17 tileable 256 x 256 layers, each as two RGBA8 maps, packed into one texture ARRAY with a full
// mip chain. Deterministic (counter-based hash noise, integer lattice, no Math.random, no clock): the sha256 of every layer and of the whole array is recorded in data/figures3d/texmaps.json and re-checked by the tests.
//   NR map  R = normal x, G = normal y (0..255 = -1..1; z is reconstructed), B = roughness, A = height / cavity (ambient occlusion proxy)
//   AM map  R = albedo luminance modulation (128 = x1.0, 255 = x1.6, 0 = x0.4), G = warm/cool micro-tint (128 = neutral), B = WEAR mask, A = DIRT mask
// The shader multiplies the variant colour (outfit variant row, per-man tint) by the modulation, adds the normal and roughness, and uses the masks with the manifest scalars: a texel is WORN (fibres fade toward gray-blue,
// edges scuff, paint chips) where B < wear_level * 255 and DIRTY (dust, powder, mud) where A < dirt_level * 255 (wear_level = the manifest's wear level 0..1; dirt_level = the weather/dust state of the scenario).
// Tier of every value: PLAUSIBLE-PROCEDURAL (TIERS.json F-TEXMAPS): no fabric sample, weave count or leather grain was measured for this task; the weave KIND per item comes from the kit labels (kersey/wool, jean, canvas...).
import { rand } from '../../../sim/rng.mjs';
import crypto from 'node:crypto';

export const TEX_SIZE = 256, MIP_LEVELS = 9;
// ---- periodic value noise: lattice of period P, bilinear with smoothstep
const lat = (x, y, s) => rand(0x7e47 + s, x, y, 3);
function pn(x, y, P, s) { const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), X0 = ((x0 % P) + P) % P, Y0 = ((y0 % P) + P) % P, X1 = (X0 + 1) % P, Y1 = (Y0 + 1) % P;
  return (lat(X0, Y0, s) * (1 - u) + lat(X1, Y0, s) * u) * (1 - v) + (lat(X0, Y1, s) * (1 - u) + lat(X1, Y1, s) * u) * v; }
// tileable fbm over the unit tile: f0 = base period (cells across the tile), oct octaves
const fbm = (u, v, f0, oct, s) => { let a = 0, k = 0.5, f = f0, n = 0; for (let i = 0; i < oct; i++) { a += k * pn(u * f, v * f, f, s + i * 13); n += k; k *= 0.5; f *= 2; } return a / n; };
const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));

// ---- layer definitions: each returns a function (u, v) -> {h (0..1 height), r (roughness), a (albedo luminance modulation, 1 = neutral), t (tint -1..1)} for u, v in [0,1) (tileable); n = normal strength in the table
const twill = (threads, nap, ridge) => (u, v, s) => {                 // 2/2 twill: warp and weft floats shifted one thread per row; thread profile = cosine hump; nap = fuzz noise
  const x = u * threads, y = v * threads, ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, up = ((ix + iy) & 3) < 2;                 // diagonal float pattern
  const hump = up ? Math.sin(fx * Math.PI) : Math.sin(fy * Math.PI), h = 0.35 + 0.45 * hump * (up ? 1 : 0.8) + 0.12 * ridge * Math.sin((u + v) * threads * Math.PI * 2 / 4) + nap * (fbm(u, v, 64, 2, s) - 0.5);
  return { h, r: 0.88 + 0.1 * (fbm(u, v, 32, 2, s + 5) - 0.5) * 2 - 0.05 * hump, a: 0.92 + 0.10 * hump + 0.1 * (fbm(u, v, 16, 2, s + 9) - 0.5), t: (fbm(u, v, 8, 2, s + 3) - 0.5) * 0.3 }; };
const plain = (threads, nap, slub) => (u, v, s) => {
  const x = u * threads, y = v * threads, fx = x - Math.floor(x), fy = y - Math.floor(y), over = ((Math.floor(x) + Math.floor(y)) & 1) === 0, hump = over ? Math.sin(fx * Math.PI) : Math.sin(fy * Math.PI);
  const h = 0.4 + 0.4 * hump + nap * (fbm(u, v, 48, 2, s) - 0.5) + slub * (fbm(u, v * 0.2 + 0.0, 6, 2, s + 4) - 0.5);
  return { h, r: 0.92 - 0.06 * hump, a: 0.9 + 0.12 * hump + 0.15 * slub * (fbm(u, v, 12, 2, s + 8) - 0.5), t: (fbm(u, v, 6, 2, s + 2) - 0.5) * 0.25 }; };
const cellular = (cells, s) => (u, v) => { const x = u * cells, y = v * cells, ix = Math.floor(x), iy = Math.floor(y); let d1 = 9, d2 = 9;
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const cx = ix + i, cy = iy + j, px = cx + lat(((cx % cells) + cells) % cells, ((cy % cells) + cells) % cells, s), py = cy + lat(((cx % cells) + cells) % cells, ((cy % cells) + cells) % cells, s + 1), d = Math.hypot(x - px, y - py); if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d; }
  return { d1, d2, edge: d2 - d1 }; };
const leather = (u, v, s) => { const c = cellular(48, s)(u, v), pit = sm(0.0, 0.5, c.edge), h = 0.35 + 0.5 * pit + 0.1 * (fbm(u, v, 8, 3, s + 2) - 0.5); return { h, r: 0.5 + 0.2 * (1 - pit) + 0.1 * (fbm(u, v, 16, 2, s + 6) - 0.5), a: 0.85 + 0.2 * pit + 0.25 * (fbm(u, v, 5, 3, s + 7) - 0.5), t: (fbm(u, v, 5, 2, s + 8) - 0.5) * 0.2 }; };
const metal = (scratch, tarnish) => (u, v, s) => { const brushed = fbm(u * 0.04 + 0.5, v, 96, 2, s) , sc = sm(0.72, 0.9, pn(u * 64, v * 4, 64, s + 9)) * scratch; const h = 0.5 + 0.1 * (brushed - 0.5) - 0.15 * sc;
  return { h, r: 0.28 + 0.18 * tarnish * fbm(u, v, 6, 3, s + 4) + 0.1 * sc, a: 0.95 + 0.1 * (brushed - 0.5) - 0.25 * tarnish * fbm(u, v, 5, 3, s + 5), t: 0.15 * tarnish * (fbm(u, v, 4, 2, s + 6) - 0.5) }; };
const wood = (u, v, s) => { const warp = 0.25 * fbm(u, v, 4, 3, s), rings = Math.sin((u + warp) * 2 * Math.PI * 9) * 0.5 + 0.5, fibre = fbm(u * 0.05 + 0.5, v, 128, 2, s + 3), h = 0.5 + 0.12 * (fibre - 0.5) - 0.1 * rings;
  return { h, r: 0.55 + 0.15 * fibre, a: 0.78 + 0.35 * rings * 0.6 + 0.25 * (fibre - 0.5), t: 0.3 * (rings - 0.5) }; };
const skin = (u, v, s) => { const c = cellular(56, s)(u, v), pore = 1 - sm(0.0, 0.22, c.d1) , fine = fbm(u, v, 24, 3, s + 2); const h = 0.55 - 0.3 * pore + 0.08 * (fine - 0.5);
  return { h, r: 0.55 - 0.1 * pore + 0.1 * (fine - 0.5), a: 0.97 - 0.25 * pore + 0.12 * (fbm(u, v, 6, 3, s + 5) - 0.5), t: 0.35 * (fbm(u, v, 5, 3, s + 7) - 0.5) + 0.2 * (fbm(u, v, 14, 2, s + 9) - 0.5) }; };
const hairStrands = (u, v, s) => { const x = u * 96, id = Math.floor(x), fx = x - id, w = sm(0.0, 0.35, fx) * (1 - sm(0.65, 1.0, fx)), len = fbm(0.5, v + lat(id % 96, 0, s) , 4, 2, s + 1), h = 0.3 + 0.6 * w * (0.7 + 0.3 * lat(id % 96, 1, s));
  return { h, r: 0.42 + 0.2 * (1 - w), a: 0.55 + 0.7 * lat(id % 96, 2, s) * w + 0.2 * len, t: (lat(id % 96, 3, s) - 0.5) * 0.5 }; };
const felt = (u, v, s) => ({ h: 0.5 + 0.3 * (fbm(u, v, 96, 2, s) - 0.5), r: 0.93, a: 0.9 + 0.3 * (fbm(u, v, 64, 3, s + 1) - 0.5), t: (fbm(u, v, 6, 2, s + 4) - 0.5) * 0.2 });
const gum = (u, v, s) => { const crack = sm(0.78, 0.85, fbm(u, v, 14, 3, s)); return { h: 0.55 - 0.2 * crack, r: 0.55 + 0.25 * crack, a: 0.95 - 0.3 * crack, t: 0 }; };
const hide = (u, v, s) => { const streak = fbm(u * 0.05 + 0.5, v, 160, 2, s), patch = fbm(u, v, 6, 3, s + 2); return { h: 0.5 + 0.2 * (streak - 0.5), r: 0.72 + 0.1 * (streak - 0.5), a: 0.85 + 0.35 * (streak - 0.5) + 0.2 * (patch - 0.5), t: 0.4 * (patch - 0.5) }; };
const hoof = (u, v, s) => { const ridge = Math.sin(v * Math.PI * 2 * 12 + 2 * fbm(u, v, 4, 2, s)) * 0.5 + 0.5; return { h: 0.5 + 0.25 * ridge, r: 0.45 + 0.2 * ridge, a: 0.75 + 0.3 * (1 - ridge) + 0.2 * (fbm(u, v, 8, 2, s + 2) - 0.5), t: 0 }; };
// cloth fold creases (an overlay for the coat, shirt and trousers wherever the vertex wrinkle byte is set): bands along u (horizontal in the surface frame) with sharp valleys and soft ridges, warped by noise,
// two families at different pitch so the pattern never reads as a sine; the shader swaps u and v for vertical drape folds. Tile 0.20 m.
const folds = (u, v, s) => { const w1 = fbm(u, v, 3, 3, s), w2 = fbm(u, v, 5, 2, s + 7), a = Math.abs(Math.sin((v * 4 + 2.1 * (w1 - 0.5) + 0.7 * Math.sin(u * 2 * Math.PI * 2 + 3 * w2)) * Math.PI)), b = Math.abs(Math.sin((v * 9 + 2.6 * (w2 - 0.5) + 0.5 * (w1 - 0.5)) * Math.PI)), tuck = sm(0.55, 0.8, fbm(u, v, 4, 3, s + 3));
  return { h: 0.3 + 0.5 * Math.pow(a, 0.7) + 0.18 * b - 0.2 * tuck, r: 0.9, a: 0.82 + 0.3 * Math.pow(a, 0.7) - 0.1 * tuck, t: 0 }; };
const paint = (u, v, s) => { const brush = fbm(u * 0.1 + 0.5, v, 64, 2, s), chip = sm(0.74, 0.8, fbm(u, v, 10, 4, s + 3)); return { h: 0.55 + 0.1 * (brush - 0.5) - 0.25 * chip, r: 0.62 + 0.3 * chip, a: 1 - 0.45 * chip + 0.1 * (brush - 0.5), t: -0.3 * chip }; };

// the layer table: id order is the array index. tile_m = the physical size of one tile (the mesh UV is in metres); nrm = normal strength; wear/dirt: how strongly the masks act
export const TEX_LAYERS = [
  { name: 'wool_twill', fn: twill(20, 0.35, 0.6), tile_m: 0.05, nrm: 2.2, wear: 0.9, dirt: 0.8, note: 'kersey / broadcloth uniform wool (coats, trousers, kepi): 2/2 diagonal twill, nap fuzz' },
  { name: 'wool_flannel', fn: plain(18, 0.5, 0.2), tile_m: 0.05, nrm: 1.6, wear: 0.9, dirt: 0.8, note: 'shirt flannel, blankets, sashes: plain weave with slubs and heavy nap' },
  { name: 'jean_cloth', fn: twill(28, 0.25, 0.9), tile_m: 0.04, nrm: 2.6, wear: 1.0, dirt: 0.9, note: 'cotton-wool jean (Confederate jackets and trousers): tight twill with a ridge' },
  { name: 'canvas', fn: plain(14, 0.4, 0.5), tile_m: 0.05, nrm: 2.0, wear: 0.9, dirt: 1.0, note: 'haversack, knapsack, shelter half: coarse plain weave' },
  { name: 'leather', fn: leather, tile_m: 0.06, nrm: 1.8, wear: 1.0, dirt: 0.7, note: 'black and russet leather: cellular grain' },
  { name: 'brass', fn: metal(0.5, 0.5), tile_m: 0.05, nrm: 0.6, wear: 0.7, dirt: 0.5, note: 'buttons, plates, furniture: brushed with tarnish' },
  { name: 'steel_iron', fn: metal(1.0, 0.2), tile_m: 0.05, nrm: 0.8, wear: 0.9, dirt: 0.6, note: 'barrels, locks, blades, tires: scratches and light rust' },
  { name: 'wood_grain', fn: wood, tile_m: 0.10, nrm: 1.0, wear: 0.8, dirt: 0.7, note: 'stocks, staffs, carriage: growth rings and fibre' },
  { name: 'skin', fn: skin, tile_m: 0.06, nrm: 1.2, wear: 0.0, dirt: 0.9, note: 'pores, fine lines and redness; stubble is a separate rule (stubble_rule)' },
  { name: 'hair_strands', fn: hairStrands, tile_m: 0.04, nrm: 1.4, wear: 0.0, dirt: 0.6, note: 'strands along v with per-strand brightness and tint (hair, beards, manes, tails)' },
  { name: 'felt', fn: felt, tile_m: 0.05, nrm: 1.0, wear: 0.9, dirt: 0.9, note: 'hat felt: short dense fibre' },
  { name: 'gum_rubber', fn: gum, tile_m: 0.08, nrm: 0.9, wear: 0.8, dirt: 0.5, note: 'gum blanket and poncho: cracks' },
  { name: 'horse_coat', fn: hide, tile_m: 0.12, nrm: 0.7, wear: 0.0, dirt: 1.0, note: 'short hair streaks with patchy tone' },
  { name: 'hoof', fn: hoof, tile_m: 0.05, nrm: 1.6, wear: 0.6, dirt: 1.0, note: 'horn: vertical ridges' },
  { name: 'cotton_white', fn: plain(22, 0.25, 0.05), tile_m: 0.04, nrm: 1.2, wear: 1.0, dirt: 1.0, note: 'gaiters, drum head, shirt linen: fine plain weave' },
  { name: 'bunting', fn: plain(24, 0.2, 0.15), tile_m: 0.06, nrm: 1.0, wear: 1.0, dirt: 0.9, note: 'flag wool bunting: fine plain weave (the flag pattern stays its own texture)' },
  { name: 'carriage_paint', fn: paint, tile_m: 0.10, nrm: 0.8, wear: 1.0, dirt: 1.0, note: 'olive carriage paint over wood: brush marks and chips (wear = chipping)' },
  { name: 'cloth_folds', fn: folds, tile_m: 0.20, nrm: 3.2, wear: 0.0, dirt: 0.0, note: 'overlay: creases and drape folds, strength from the vertex wrinkle byte (low 6 bits; bit 7 = vertical drape)' },
];
export const layerIndex = Object.fromEntries(TEX_LAYERS.map((l, i) => [l.name, i]));

// ---- generate one layer at full resolution: { nr, am } Uint8Array(size*size*4)
export function genLayer(i, size = TEX_SIZE) {
  const L = TEX_LAYERS[i], s = 101 + i * 17, hf = new Float32Array(size * size), rf = new Float32Array(size * size), af = new Float32Array(size * size), tf = new Float32Array(size * size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) { const r = L.fn((x + 0.5) / size, (y + 0.5) / size, s), k = y * size + x; hf[k] = r.h; rf[k] = r.r; af[k] = r.a; tf[k] = r.t; }
  let lo = 1e9, hi = -1e9; for (const h of hf) { lo = Math.min(lo, h); hi = Math.max(hi, h); } const span = Math.max(1e-6, hi - lo);
  const nr = new Uint8Array(size * size * 4), am = new Uint8Array(size * size * 4), at = (x, y) => hf[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const k = y * size + x, hn = (hf[k] - lo) / span, dx = (at(x + 1, y) - at(x - 1, y)) * 0.5 / span * L.nrm * 8, dy = (at(x, y + 1) - at(x, y - 1)) * 0.5 / span * L.nrm * 8, l = Math.hypot(dx, dy, 1), nx = -dx / l, ny = -dy / l;
    // cavity: height below the local mean (a 5 x 5 average) darkens (ambient occlusion proxy)
    let m = 0; for (let j = -2; j <= 2; j++) for (let i2 = -2; i2 <= 2; i2++) m += at(x + i2, y + j); m /= 25;
    nr[k * 4] = Math.round((nx * 0.5 + 0.5) * 255); nr[k * 4 + 1] = Math.round((ny * 0.5 + 0.5) * 255); nr[k * 4 + 2] = Math.round(clamp(rf[k]) * 255); nr[k * 4 + 3] = Math.round(clamp(0.5 + (hf[k] - m) / span * 2) * 255);
    // wear: the high points and a scuff noise wear first; dirt: the low points and a stain noise collect it. Both are thresholds on the stored mask (wear_level / dirt_level of the manifest).
    const scuff = fbm((x + 0.5) / size, (y + 0.5) / size, 12, 4, s + 31), stain = fbm((x + 0.5) / size, (y + 0.5) / size, 5, 4, s + 47);
    const wearM = clamp(1 - (0.55 * hn + 0.45 * scuff)) , dirtM = clamp(1 - (0.55 * (1 - hn) + 0.45 * stain));
    am[k * 4] = Math.round(clamp(af[k] / 1.6, 0, 1) * 255 * 1.0); am[k * 4 + 1] = Math.round(clamp(tf[k] * 0.5 + 0.5) * 255); am[k * 4 + 2] = Math.round(wearM * 255); am[k * 4 + 3] = Math.round(dirtM * 255);
  }
  // histogram-stretch the masks so the thresholds are meaningful: the wear mask value v (0..255) at coverage fraction f satisfies P(B <= f*255) = f
  for (const [arr, ch] of [[am, 2], [am, 3]]) { const cnt = new Uint32Array(256); for (let k = 0; k < size * size; k++) cnt[arr[k * 4 + ch]]++; const cdf = new Float64Array(256); let c = 0; for (let v = 0; v < 256; v++) { c += cnt[v]; cdf[v] = c / (size * size); } for (let k = 0; k < size * size; k++) arr[k * 4 + ch] = Math.min(255, Math.round(cdf[arr[k * 4 + ch]] * 255)); }
  return { nr, am, size };
}
// ---- mip chain: box filter; the NR map's normal xy are averaged then the roughness is raised by the lost normal length (Toksvig); masks are averaged
export function mipChain(map, size, isNR) {
  const levels = [map]; let w = size, cur = map;
  while (w > 1) { const nw = w >> 1, nxt = new Uint8Array(nw * nw * 4);
    for (let y = 0; y < nw; y++) for (let x = 0; x < nw; x++) { const o = (y * nw + x) * 4; let sx = 0, sy = 0, sr = 0, sa = 0, cnt = 0, c2 = [0, 0, 0, 0];
      for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) { const p = ((y * 2 + j) * w + x * 2 + i) * 4; if (isNR) { sx += cur[p] / 255 * 2 - 1; sy += cur[p + 1] / 255 * 2 - 1; sr += cur[p + 2]; sa += cur[p + 3]; } else { for (let c = 0; c < 4; c++) c2[c] += cur[p + c]; } cnt++; }
      if (isNR) { const mx = sx / 4, my = sy / 4, len = Math.hypot(mx, my, Math.sqrt(Math.max(0, 1 - (mx * mx + my * my)))), lenXY = Math.hypot(mx, my); nxt[o] = Math.round((mx / Math.max(1e-6, Math.min(1, len)) * 0.5 + 0.5) * 255); nxt[o + 1] = Math.round((my / Math.max(1e-6, Math.min(1, len)) * 0.5 + 0.5) * 255); nxt[o + 2] = Math.min(255, Math.round(sr / 4 + 255 * 0.5 * lenXY * lenXY)); nxt[o + 3] = Math.round(sa / 4); }
      else for (let c = 0; c < 4; c++) nxt[o + c] = Math.round(c2[c] / 4); }
    levels.push(nxt); cur = nxt; w = nw; }
  return levels;
}
export const sha = b => crypto.createHash('sha256').update(b).digest('hex');
// the whole array: layers x (NR, AM) x mips. bytes: raw RGBA8 and the BC7 size (1 byte per texel, the PLAN G15 accounting)
export function buildMaterialArray(only = null) {
  const layers = [];
  for (let i = 0; i < TEX_LAYERS.length; i++) { if (only && !only.includes(i)) continue; const g = genLayer(i), nr = mipChain(g.nr, g.size, true), am = mipChain(g.am, g.size, false), h = crypto.createHash('sha256'); for (const m of [...nr, ...am]) h.update(m); layers.push({ index: i, name: TEX_LAYERS[i].name, size: g.size, nr, am, sha256: h.digest('hex') }); }
  return layers;
}
export function arrayBytes(n = TEX_LAYERS.length, size = TEX_SIZE) { let texels = 0; for (let w = size; w >= 1; w >>= 1) texels += w * w; return { layers: n, maps_per_layer: 2, mip_levels: MIP_LEVELS, texels_per_layer_per_map_with_mips: texels, raw_rgba8_bytes: n * 2 * texels * 4, bc7_bytes: n * 2 * texels, budget_raw_bytes: 16 * 1048576, budget_bc7_bytes: 4 * 1048576 }; }

// ---- per-material mapping (MAT slot id -> layer, tile, strengths): consumed by the shader through materials.json. Rules: variant-slot cloth takes its layer from the item's cloth kind (kit labels).
import { MAT } from './palette.mjs';
const T = (layer, o = {}) => ({ layer: layerIndex[layer], layer_name: layer, tile_m: TEX_LAYERS[layerIndex[layer]].tile_m, nrm: TEX_LAYERS[layerIndex[layer]].nrm * (o.nrm ?? 1), wear: TEX_LAYERS[layerIndex[layer]].wear * (o.wear ?? 1), dirt: TEX_LAYERS[layerIndex[layer]].dirt * (o.dirt ?? 1), albedo_mod: o.mod ?? 1, ...o.extra });
export const MATERIAL_MAP = (() => {
  const t = {};
  for (const [m, l] of [[MAT.COAT, 'wool_twill'], [MAT.COAT_TRIM, 'wool_twill'], [MAT.TROUSERS, 'wool_twill'], [MAT.TROUSER_TRIM, 'wool_twill'], [MAT.HEADGEAR, 'felt'], [MAT.HEAD_TRIM, 'brass'], [MAT.SHIRT, 'wool_flannel'], [MAT.BRASS, 'brass'], [MAT.GOLD, 'brass'], [MAT.SILVER, 'steel_iron'],
    [MAT.LEATHER_BLACK, 'leather'], [MAT.LEATHER_TAN, 'leather'], [MAT.BOOT, 'leather'], [MAT.SADDLE_LEATHER, 'leather'], [MAT.SOLE, 'leather'], [MAT.CANVAS, 'canvas'], [MAT.BLANKET, 'wool_flannel'], [MAT.SADDLE_BLANKET, 'wool_flannel'], [MAT.SASH, 'wool_flannel'], [MAT.GAITER, 'cotton_white'], [MAT.DRUM_SKIN, 'cotton_white'],
    [MAT.WOOD, 'wood_grain'], [MAT.STEEL, 'steel_iron'], [MAT.IRON, 'steel_iron'], [MAT.GUNMETAL, 'steel_iron'], [MAT.BRONZE, 'brass'], [MAT.TIN, 'steel_iron'], [MAT.SKIN, 'skin'], [MAT.LIP, 'skin'], [MAT.NAIL, 'skin'], [MAT.HAIR, 'hair_strands'], [MAT.HORSE_MANE, 'hair_strands'], [MAT.FEATHER, 'hair_strands'],
    [MAT.GUM_RUBBER, 'gum_rubber'], [MAT.HORSE_COAT, 'horse_coat'], [MAT.HORSE_HOOF, 'hoof'], [MAT.CARRIAGE_PAINT, 'carriage_paint'], [MAT.FLAG_RED, 'bunting'], [MAT.FLAG_WHITE, 'bunting'], [MAT.FLAG_BLUE, 'bunting'], [MAT.FLAG_GREEN, 'bunting'], [MAT.FLAG_YELLOW, 'bunting'], [MAT.GAP, 'bunting'], [MAT.ROPE, 'canvas'], [MAT.THREAD, 'cotton_white'], [MAT.PIPING_YELLOW, 'wool_twill'], [MAT.PIPING_RED, 'wool_twill'], [MAT.PIPING_LIGHTBLUE, 'wool_twill']]) t[m] = T(l);
  // the Confederate jacket and trousers use jean cloth: the shader picks layer jean_cloth for COAT/TROUSERS when the variant row's army byte is 1 and the item label says jean (kit)
  t[MAT.COAT].army_override = { army: 1, layer: layerIndex.jean_cloth }; t[MAT.TROUSERS].army_override = { army: 1, layer: layerIndex.jean_cloth };
  t[MAT.SKIN].stubble_rule = { layer: layerIndex.skin, applies: 'clean-shaven men whose identity hash h5 < 0.35', region_uv_m: { v_min: 0.235, v_max: 0.30, u_abs_max: 0.085 }, note: 'a dot-density mask thresholded by 0.35; hair colour at 60 percent value; plausible-procedural, not looked up' };
  t[MAT.EYE_WHITE] = { layer: -1, note: 'eye shader: sclera veins and wet gloss are shader-side, no tiled map' }; t[MAT.IRIS] = { layer: -1, note: 'iris radial fibre pattern is shader-side (polar noise)' };
  return t;
})();
// CPU reference of the shader's use of the masks (tests): the fraction of texels worn at a wear level, dirty at a dirt level
export function maskCoverage(layer, level, channel = 'wear') { const am = layer.am[0], ch = channel === 'wear' ? 2 : 3, thr = level * 255; let n = 0; for (let k = 0; k < layer.size * layer.size; k++) if (am[k * 4 + ch] < thr) n++; return n / (layer.size * layer.size); }
