// Strand-card texture for hair, beards and tails (film-grade round 3, 2026-10-31), generated in code: no image asset is read or downloaded.
// A card is a thin surface (a shell layer on the scalp, a hanging lock, a flyaway ribbon) whose RGBA texel says where a fibre is:
//   R = alpha (fibre coverage, alpha-tested / alpha-to-coverage in the product), G = fibre id (0..1, per fibre: the shader drops fibres whose id exceeds the vertex coverage, so a hairline THINS strand by
//   strand instead of ending in a hard edge), B = fibre shade (0..1: individual brightness), A = 255 (reserved).  The root-to-tip colour gradient and the anisotropic highlight come from v (root 0, tip 1).
// Eight variants (index = the 3-bit variant in the vertex flag byte, bits 5..7; bits 0..4 are the coverage 0..31):
//   0 dense scalp layer (nearly opaque, fine fibres: the base that hides the skin), 1 straight, 2 wavy, 3 curly, 4 coarse (beards, moustache), 5 lock (hanging clump), 6 single fibre (flyaway ribbon), 7 stubble-short.
// Tier of every number: PLAUSIBLE-PROCEDURAL (TIERS.json F-HAIR-CARDS): fibre counts, widths, wobble and clump sizes are authored; no hair sample or microscopy was read.
import { rand } from '../../../sim/rng.mjs';
import crypto from 'node:crypto';

export const HAIR_TEX = { w: 256, h: 512, mips: 6, tile_u_m: 0.026, tile_v_m: 0.055, variants: 8 };
const S0 = 0x4a1a;
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
// per variant: n fibres across one tile, width (cells, min/max), wobble amplitude (cells) and frequency (cycles per tile), shortest fibre (fraction of the tile), clump size (fibres), clump gap strength
export const VARIANT_PARAMS = [
  { name: 'dense', n: 140, w: [1.7, 2.2], amp: 0.25, freq: 1.2, lenMin: 1.0, clump: 10, gap: 0.0, shade: 0.32 },
  { name: 'straight', n: 72, w: [0.30, 0.46], amp: 0.22, freq: 1.0, lenMin: 0.60, clump: 7, gap: 0.55, shade: 0.45 },
  { name: 'wavy', n: 64, w: [0.30, 0.46], amp: 0.80, freq: 1.6, lenMin: 0.60, clump: 8, gap: 0.55, shade: 0.45 },
  { name: 'curly', n: 56, w: [0.34, 0.50], amp: 1.50, freq: 3.4, lenMin: 0.55, clump: 8, gap: 0.5, shade: 0.45 },
  { name: 'coarse', n: 52, w: [0.38, 0.60], amp: 0.55, freq: 2.0, lenMin: 0.50, clump: 6, gap: 0.6, shade: 0.5 },
  { name: 'lock', n: 30, w: [0.55, 0.90], amp: 0.45, freq: 1.4, lenMin: 0.70, clump: 5, gap: 0.35, shade: 0.4 },
  { name: 'single', n: 1, w: [0.16, 0.16], amp: 0.12, freq: 1.0, lenMin: 1.0, clump: 1, gap: 0, shade: 0.2 },
  { name: 'short', n: 120, w: [0.40, 0.60], amp: 0.2, freq: 1.0, lenMin: 0.15, clump: 9, gap: 0.2, shade: 0.4 },
];
// one texel: u, v in [0,1) (u tiles). Returns [alpha, id, shade] in 0..1.
export function strandTexel(vi, u, v) {
  const P = VARIANT_PARAMS[vi], N = P.n, s = S0 + vi * 131;
  if (N === 1) {                                                   // a single tapered fibre down the middle of the tile (flyaway ribbons)
    const half = 0.30 * (1 - 0.82 * sstep(0.25, 1.0, v)) * (0.6 + 0.4 * sstep(0.0, 0.05, v)), d = Math.abs(u - 0.5 + 0.06 * Math.sin(v * 6.2832 * 1.5));
    return [1 - sstep(half * 0.55, half, d), 0.0, 0.5 + 0.3 * (1 - v)];
  }
  const x = u * N, c0 = Math.floor(x);
  let a = 0, id = 0, sh = 0.5;
  for (let dk = -2; dk <= 2; dk++) {
    const k = c0 + dk, kk = ((k % N) + N) % N, cl = Math.floor(kk / P.clump), clumpH = rand(s, cl, 0, 7), jit = rand(s, kk, 0, 1) - 0.5;
    const phase = (rand(s, cl, 0, 2) * 0.75 + rand(s, kk, 0, 3) * 0.25) * 6.2832, wob = P.amp * (0.6 + 0.8 * rand(s, kk, 0, 4)) * Math.sin(v * P.freq * 6.2832 + phase);
    const cx = k + 0.5 + jit * 0.7 + wob, L = P.lenMin + (1 - P.lenMin) * (0.35 * rand(s, kk, 0, 5) + 0.65 * (1 - P.gap * clumpH * (1 - 0.5 * rand(s, kk, 0, 6)))), w = P.w[0] + (P.w[1] - P.w[0]) * rand(s, kk, 0, 8);
    if (v > L) continue;
    const taper = vi === 0 ? 1 : 1 - 0.75 * sstep(L * 0.55, L, v), rootw = vi === 0 ? 1 : 0.55 + 0.45 * sstep(0.0, 0.06, v), ww = w * taper * rootw, al = 1 - sstep(ww * 0.35, ww * 0.5 + 0.12, Math.abs(x - cx));
    if (al > a) { a = al; id = rand(s, kk, 0, 9); sh = 0.5 + P.shade * (rand(s, kk, 0, 10) - 0.5) * 2 + 0.12 * (clumpH - 0.5); }
  }
  return [a, id, Math.min(1, Math.max(0, sh))];
}
// the baked atlas of all variants: RGBA8 level chains. alpha-coverage preserving mips (the fraction of texels above 0.5 is kept at every level so a distant card does not vanish)
export function bakeHairAtlas() {
  const { w, h, mips, variants } = HAIR_TEX, out = [];
  for (let vi = 0; vi < variants; vi++) {
    const lv0 = new Uint8Array(w * h * 4);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const t = strandTexel(vi, (x + 0.5) / w, (y + 0.5) / h), o = (y * w + x) * 4; lv0[o] = Math.round(t[0] * 255); lv0[o + 1] = Math.round(t[1] * 255); lv0[o + 2] = Math.round(t[2] * 255); lv0[o + 3] = 255; }
    const levels = [lv0]; let cw = w, ch = h, cur = lv0; let target = 0; for (let i = 0; i < w * h; i++) if (lv0[i * 4] > 127) target++; target /= w * h;
    for (let m = 1; m < mips; m++) {
      const nw = cw >> 1, nh = ch >> 1, nxt = new Uint8Array(nw * nh * 4);
      for (let y = 0; y < nh; y++) for (let x = 0; x < nw; x++) { let a = 0, id = 0, sh = 0, wsum = 0; for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) { const p = ((2 * y + j) * cw + 2 * x + i) * 4, wa = cur[p] + 1; a += cur[p]; id += cur[p + 1] * wa; sh += cur[p + 2] * wa; wsum += wa; } const o = (y * nw + x) * 4; nxt[o] = a / 4; nxt[o + 1] = id / wsum; nxt[o + 2] = sh / wsum; nxt[o + 3] = 255; }
      // rescale alpha so that the coverage above 0.5 stays at the level-0 fraction (binary search of a gain)
      let lo = 0.5, hi = 4, gain = 1; for (let it = 0; it < 14; it++) { gain = (lo + hi) / 2; let c = 0; for (let i = 0; i < nw * nh; i++) if (nxt[i * 4] * gain > 127) c++; if (c / (nw * nh) < target) lo = gain; else hi = gain; }
      for (let i = 0; i < nw * nh; i++) nxt[i * 4] = Math.min(255, Math.round(nxt[i * 4] * gain));
      levels.push(nxt); cur = nxt; cw = nw; ch = nh;
    }
    out.push(levels);
  }
  return out;
}
export const hairAtlasHash = atlas => { const h = crypto.createHash('sha256'); for (const v of atlas) for (const l of v) h.update(l); return h.digest('hex'); };
// bilinear, tiled sample of a level: returns [a, id, shade] 0..1 into out
export function sampleHair(atlas, vi, u, v, lod, out) {
  const lv = Math.min(HAIR_TEX.mips - 1, Math.max(0, Math.floor(lod + 0.5))), buf = atlas[vi][lv], w = HAIR_TEX.w >> lv, h = HAIR_TEX.h >> lv;
  const fx = u * w - 0.5, fy = v * h - 0.5, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0, X0 = ((x0 % w) + w) % w, X1 = (X0 + 1) % w, Y0 = ((y0 % h) + h) % h, Y1 = (Y0 + 1) % h;
  const a = (Y0 * w + X0) * 4, b = (Y0 * w + X1) * 4, c = (Y1 * w + X0) * 4, d = (Y1 * w + X1) * 4, w00 = (1 - tx) * (1 - ty), w10 = tx * (1 - ty), w01 = (1 - tx) * ty, w11 = tx * ty;
  for (let k = 0; k < 3; k++) out[k] = (buf[a + k] * w00 + buf[b + k] * w10 + buf[c + k] * w01 + buf[d + k] * w11) / 255;
  return out;
}
