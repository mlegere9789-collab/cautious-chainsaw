// The inspection shading environment for shaded.mjs (film-grade round 3, 2026-10-31): a CPU reference of what the product shader must do with the figure data, so that skin maps, strand cards, cloth
// weave and fold normals, eyes and metals can be looked at without a GPU. It is NOT the product shader (that one is in the BROWSER-VERIFICATION-LIST); it uses the same data: material rows (colour,
// roughness, metal), the 18 procedural texture layers of texmaps.mjs (NR / AM maps with mips), the strand-card atlas of hairtex.mjs, the per-head skin maps of skinmap.mjs and the vertex flag byte:
//   skin-grid vertices flag 64 = head skin map, 255 = thin skin (lids, ears, lips: scatter boost); cloth meshes: low 6 bits = wrinkle intensity, bit 7 = vertical drape; strand cards: low 5 bits = coverage, bits 5..7 = variant.
// Lighting: key (warm, shadow-mapped), fill, rim, hemisphere ambient with the cavity channel as occlusion, GGX specular, wrapped diffuse + terminator scatter for skin (palette.SKIN_SSS), Kajiya-Kay for fibres.
import { GLOBAL_MATERIALS, MAT, SKIN_SSS } from './palette.mjs';
import { buildMaterialArray, MATERIAL_MAP, layerIndex, TEX_LAYERS } from './texmaps.mjs';
import { bakeHairAtlas, sampleHair, HAIR_TEX } from './hairtex.mjs';
import { sampleHeadMap } from './skinmap.mjs';
import { rand } from '../../../sim/rng.mjs';

let LAYERS = null, ATLAS = null;
const layers = () => (LAYERS ??= buildMaterialArray()), atlas = () => (ATLAS ??= bakeHairAtlas());
export const getHairAtlas = atlas;
const lin = c => Math.pow(c / 255, 2.2), clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x), sm = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const hash3 = (x, y, z) => rand(0x7b3, x + 4096, y + 4096, z + 4096);
// bilinear + trilinear sample of a texmaps layer map (which: 'nr' | 'am'), tiled. lod is a float mip level.
function tex(layer, which, s, t, lod, out) {
  const maps = layer[which], l0 = clamp(Math.floor(lod), 0, maps.length - 1), l1 = Math.min(maps.length - 1, l0 + 1), f = clamp(lod - l0, 0, 1);
  bil(maps[l0], 256 >> l0, s, t, out, 0, 1 - f); if (f > 0.001 && l1 !== l0) bil(maps[l1], 256 >> l1, s, t, out, 1, f); return out;
}
const _a = [0, 0, 0, 0], _b = [0, 0, 0, 0];
function bil(buf, n, s, t, out, mode, wgt) {
  const fx = s * n - 0.5, fy = t * n - 0.5, x0 = Math.floor(fx), y0 = Math.floor(fy), a = fx - x0, b = fy - y0, X0 = ((x0 % n) + n) % n, X1 = (X0 + 1) % n, Y0 = ((y0 % n) + n) % n, Y1 = (Y0 + 1) % n, p00 = (Y0 * n + X0) * 4, p10 = (Y0 * n + X1) * 4, p01 = (Y1 * n + X0) * 4, p11 = (Y1 * n + X1) * 4, tgt = mode === 0 ? _a : _b;
  for (let k = 0; k < 4; k++) tgt[k] = ((buf[p00 + k] * (1 - a) + buf[p10 + k] * a) * (1 - b) + (buf[p01 + k] * (1 - a) + buf[p11 + k] * a) * b) / 255;
  if (mode === 0) { for (let k = 0; k < 4; k++) out[k] = _a[k]; if (wgt < 1) { for (let k = 0; k < 4; k++) out[k] = _a[k] * wgt; } } else for (let k = 0; k < 4; k++) out[k] += _b[k] * wgt;
}
const CLOTH = new Set([MAT.COAT, MAT.COAT_TRIM, MAT.SHIRT, MAT.TROUSERS, MAT.TROUSER_TRIM, MAT.SASH, MAT.BLANKET, MAT.GAITER, MAT.PIPING_YELLOW, MAT.PIPING_RED, MAT.PIPING_LIGHTBLUE, MAT.CANVAS, MAT.SADDLE_BLANKET]);
const SKINLIKE = new Set([MAT.SKIN, MAT.LIP, MAT.NAIL, MAT.TONGUE, MAT.GUM]);
const norm = v => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };

export function createEnv(o = {}) {
  const pal = (o.palette ?? GLOBAL_MATERIALS).map(r => [lin(r[0]), lin(r[1]), lin(r[2])]), L = layers(), at = atlas(), wear = o.wear ?? 0.35, dirtLevel = o.dirt ?? 0.3, headMaps = o.headMaps ?? null, stubble = o.stubble ?? 1;
  const keyDir = norm(o.keyDir ?? [-0.45, 0.62, 0.65]), fillDir = norm([0.75, 0.15, 0.45]), rimDir = norm([0.25, 0.45, -0.85]), boxDir = norm([-0.15, 0.55, 0.82]);
  const KEY = [2.7, 2.45, 2.1], FILL = [0.42, 0.5, 0.64], RIM = [0.9, 0.88, 0.85], SKY = [0.30, 0.36, 0.46], GND = [0.14, 0.12, 0.10];
  const spec = o.spec ?? null, hairLin = pal[MAT.HAIR_CARD];
  const _t = [0, 0, 0, 0], _n = [0, 0, 0, 0], _h = [0, 0, 0], _m = [0, 0, 0, 0], N = [0, 0, 0];
  // GGX
  const ggx = (nh, r) => { const a = r * r, a2 = a * a, d = nh * nh * (a2 - 1) + 1; return a2 / (3.14159 * d * d); };
  const fres = (vh, f0) => f0 + (1 - f0) * Math.pow(1 - vh, 5);
  function lighting(F, Nn, alb, rough, f0, metal, shadow, sss, thin, ao, out, extra) {
    const V = F.view, ndv = clamp(Nn[0] * V[0] + Nn[1] * V[1] + Nn[2] * V[2], 0.02, 1); let r = 0, g = 0, b = 0, sr = 0, sg = 0, sb = 0;
    const li = [[keyDir, KEY, shadow], [fillDir, FILL, 1], [rimDir, RIM, 1]];
    for (let i = 0; i < 3; i++) {
      const [Ld, C, sh] = li[i], ndl = Nn[0] * Ld[0] + Nn[1] * Ld[1] + Nn[2] * Ld[2];
      let diff; if (sss) { const w = SKIN_SSS.wrap * (thin ? 1.25 : 1), wr = Math.max(0, (ndl + w) / (1 + w)); diff = wr; const band = Math.exp(-(((ndl - 0.05) / SKIN_SSS.scatter_width) ** 2)) * SKIN_SSS.scatter_strength * (thin ? SKIN_SSS.thin_boost : 1) * (i === 0 ? 1 : 0.5); const sc = band * C[0] * sh; sr += SKIN_SSS.scatter_rgb[0] * sc; sg += SKIN_SSS.scatter_rgb[1] * sc; sb += SKIN_SSS.scatter_rgb[2] * sc;
        if (thin && ndl < 0) { const tr = -ndl * 0.28 * (i === 2 ? 1.6 : 1); sr += tr * C[0] * 0.9; sg += tr * C[1] * 0.35; sb += tr * C[2] * 0.2; } } else diff = Math.max(0, ndl);
      const dl = diff * sh * (1 - metal); r += alb[0] * C[0] * dl; g += alb[1] * C[1] * dl; b += alb[2] * C[2] * dl;
      if (ndl > 0) { const H = norm([Ld[0] + V[0], Ld[1] + V[1], Ld[2] + V[2]]), nh = Math.max(0, Nn[0] * H[0] + Nn[1] * H[1] + Nn[2] * H[2]), vh = Math.max(0, V[0] * H[0] + V[1] * H[1] + V[2] * H[2]), fr = fres(vh, f0), sp = ggx(nh, Math.max(0.06, rough)) * fr * ndl / (4 * Math.max(0.1, ndl * ndv) * 0.25 + 1e-3) * 0.25 * sh;
        if (metal > 0.5) { r += alb[0] * C[0] * sp * 4; g += alb[1] * C[1] * sp * 4; b += alb[2] * C[2] * sp * 4; } else { r += C[0] * sp; g += C[1] * sp; b += C[2] * sp; } }
    }
    // hemisphere ambient and sheen
    const hy = 0.5 + 0.5 * Nn[1], ar = (GND[0] + (SKY[0] - GND[0]) * hy) * ao, ag = (GND[1] + (SKY[1] - GND[1]) * hy) * ao, ab = (GND[2] + (SKY[2] - GND[2]) * hy) * ao;
    r += alb[0] * ar * (1 - metal * 0.8) + sr * alb[0] * 1.0; g += alb[1] * ag * (1 - metal * 0.8) + sg * alb[1]; b += alb[2] * ab * (1 - metal * 0.8) + sb * alb[2];
    if (metal > 0.5) { const e = 0.25 * (0.4 + 0.6 * ndv ** 0.5); r += alb[0] * ar * e; g += alb[1] * ag * e; b += alb[2] * ab * e; }
    if (extra) { r += extra[0]; g += extra[1]; b += extra[2]; }
    out[0] = r; out[1] = g; out[2] = b;
  }
  const env = {
    keyDir, alphaModes: new Map([[MAT.HAIR_CARD, 'a2c'], [MAT.BEARD_CARD, 'a2c']]), exposure: o.exposure ?? 1, shadows: o.shadows,
    alpha(mat, vr, u, v, cov, fp) {
      const tu = u / HAIR_TEX.tile_u_m, tv = v / HAIR_TEX.tile_v_m, lod = Math.max(0, Math.log2(Math.max(1, fp / 0.0001))), s = sampleHair(at, vr, tu - Math.floor(tu), vr === 6 ? clamp(tv, 0, 0.999) : tv - Math.floor(tv), lod, _h);
      return (vr === 0 ? 1 : s[0]) * clamp((cov - s[1]) * 12 + 0.5, 0, 1);       // variant 0 is the dense base layer: opaque where its fibres exist (thinned only by the coverage)
    },
    shade(F, out) {
      const m = F.mat, base = pal[m] ?? [0.2, 0.2, 0.2], G = GLOBAL_MATERIALS[m] ?? [128, 128, 128, 0.8, 0], thin = F.flags === 255;
      let rough = G[3], metal = G[4] > 0.5 ? 1 : 0; N[0] = F.n[0]; N[1] = F.n[1]; N[2] = F.n[2]; let ao = 1, alb = [base[0], base[1], base[2]], extra = null, sss = false, f0 = metal ? 1 : 0.04;
      const fpt = F.fp;
      // ---------------- strand cards
      if (m === MAT.HAIR_CARD || m === MAT.BEARD_CARD) {
        const vr = F.vr, tu = F.u / HAIR_TEX.tile_u_m, tv = F.v / HAIR_TEX.tile_v_m, lod = Math.max(0, Math.log2(Math.max(1, fpt / 0.0001)));
        const s = sampleHair(at, vr, tu - Math.floor(tu), vr === 6 ? clamp(tv, 0, 0.999) : tv - Math.floor(tv), lod, _h), g = vr === 6 ? clamp(tv, 0, 1) : tv - Math.floor(tv), shade = 0.45 + 1.1 * s[2];
        const rootDark = vr === 0 ? 0.94 : vr === 5 ? 0.55 : 0.86, k = (rootDark + (1 - rootDark) * sm(0.0, 0.45, g)) * (1 + (vr === 5 ? 0.22 : 0.08) * sm(0.65, 1.0, g)) * shade * (vr === 0 ? 0.80 : vr === 6 ? 1.0 : 0.95);
        const lum = 0.3 * base[0] + 0.59 * base[1] + 0.11 * base[2], tipTint = 1 + 0.18 * sm(0.55, 1, g);
        alb = [base[0] * k * tipTint, base[1] * k, base[2] * k * (2 - tipTint) * (0.9 + 0.1)]; void lum;
        const T = F.b, Vv = F.view; let kr = 0, kg = 0, kb = 0, dsum = 0;
        for (const [Ld, C, sh] of [[keyDir, KEY, F.shadow], [fillDir, FILL, 1], [rimDir, RIM, 1]]) {
          const tl = T[0] * Ld[0] + T[1] * Ld[1] + T[2] * Ld[2], sinTL = Math.sqrt(Math.max(0, 1 - tl * tl)), ndl = N[0] * Ld[0] + N[1] * Ld[1] + N[2] * Ld[2], wrap = Math.max(0, (ndl + 0.5) / 1.5), dl = (0.45 * wrap + 0.55 * sinTL * Math.max(0.15, (ndl + 1) * 0.5)) * sh;
          kr += alb[0] * C[0] * dl; kg += alb[1] * C[1] * dl; kb += alb[2] * C[2] * dl; dsum += dl;
          // Kajiya-Kay: primary white lobe shifted toward the tip, secondary tinted lobe shifted the other way
          const H = norm([Ld[0] + Vv[0], Ld[1] + Vv[1], Ld[2] + Vv[2]]), sh1 = [T[0] + N[0] * 0.10, T[1] + N[1] * 0.10, T[2] + N[2] * 0.10], l1 = Math.hypot(...sh1), th1 = (sh1[0] * H[0] + sh1[1] * H[1] + sh1[2] * H[2]) / l1, s1 = Math.sqrt(Math.max(0, 1 - th1 * th1));
          const sh2 = [T[0] - N[0] * 0.16, T[1] - N[1] * 0.16, T[2] - N[2] * 0.16], l2 = Math.hypot(...sh2), th2 = (sh2[0] * H[0] + sh2[1] * H[1] + sh2[2] * H[2]) / l2, s2 = Math.sqrt(Math.max(0, 1 - th2 * th2)), vis = Math.max(0, ndl + 0.3) * sh;
          const p1 = Math.pow(s1, 400) * 0.10 * vis * (vr === 0 ? 0.3 : 1), p2 = Math.pow(s2, 90) * 0.07 * vis; kr += C[0] * p1 + C[0] * base[0] * p2 * 2.2; kg += C[1] * p1 + C[1] * base[1] * p2 * 2.2; kb += C[2] * p1 + C[2] * base[2] * p2 * 2.2;
        }
        const hy = 0.5 + 0.5 * N[1], amb = (0.14 + (0.34 - 0.14) * hy) * (vr === 0 ? 0.55 : 1);
        out[0] = kr + alb[0] * amb * 1.4; out[1] = kg + alb[1] * amb * 1.5; out[2] = kb + alb[2] * amb * 1.7; return out;
      }
      // ---------------- eyes
      if (m === MAT.EYE_WHITE) {
        const th = F.v / 0.0120, ph = F.u / 0.0120, vein = Math.pow(clamp(((hash3(Math.floor(ph * 9), Math.floor(th * 16), 3) + hash3(Math.floor(ph * 17), Math.floor(th * 31), 4)) * 0.5 - 0.62) * 4), 1) * sm(0.55, 1.3, th) * Math.abs(Math.cos(ph));
        alb = [base[0] * (1 - 0.1 * sm(0.9, 1.5, th)) * (1 + 0.3 * vein), base[1] * (1 - 0.18 * sm(0.9, 1.5, th)) * (1 - 0.35 * vein), base[2] * (1 - 0.28 * sm(0.9, 1.5, th)) * (1 - 0.38 * vein)];
        ao = 1 - 0.45 * sm(0.75, 1.45, th); rough = 0.08; f0 = 0.04; sss = false;
      } else if (m === MAT.IRIS) {
        const th = F.v / 0.0120, ph = F.u / 0.0120, rr = clamp(th / 0.5), fibre = 0.55 + 0.9 * (hash3(Math.floor(ph * 30), Math.floor(rr * 6), 5)) * 0.5 + 0.45 * Math.abs(Math.sin(ph * 11 + 5 * hash3(Math.floor(ph * 3), 2, 6)));
        const collarette = 1 + 0.35 * Math.exp(-(((rr - 0.46) / 0.10) ** 2)), limbal = 1 - 0.82 * sm(0.72, 1.0, rr), inner = 1 - 0.45 * sm(0.55, 0.28, rr) ;
        const k = fibre * collarette * limbal * inner; alb = [base[0] * k * 1.35, base[1] * k * 1.25, base[2] * k * 1.2]; rough = 0.05; f0 = 0.04;
        // corneal reflection of a window to the upper left
        const Hh = norm([boxDir[0] + F.view[0], boxDir[1] + F.view[1], boxDir[2] + F.view[2]]), nh = Math.max(0, N[0] * Hh[0] + N[1] * Hh[1] + N[2] * Hh[2]); extra = [Math.pow(nh, 900) * 3.2 * F.shadow, Math.pow(nh, 900) * 3.2 * F.shadow, Math.pow(nh, 900) * 3.2 * F.shadow];
      } else if (m === MAT.EYE_DARK) { rough = 0.05; f0 = 0.05; const Hh = norm([boxDir[0] + F.view[0], boxDir[1] + F.view[1], boxDir[2] + F.view[2]]), nh = Math.max(0, N[0] * Hh[0] + N[1] * Hh[1] + N[2] * Hh[2]); extra = [Math.pow(nh, 700) * 2.6 * F.shadow, Math.pow(nh, 700) * 2.6 * F.shadow, Math.pow(nh, 700) * 2.6 * F.shadow]; }
      // ---------------- skin and lips
      else if (SKINLIKE.has(m)) {
        sss = true; f0 = 0.03; rough = 0.52;
        const sk = layers()[layerIndex.skin], lod = Math.max(0, Math.log2(Math.max(1, fpt / (0.06 / 256))));
        let lum = 1, red = 0, stub = 0, dirt = 0.3, cav = 1, nx = 0, ny = 0;
        if (m === MAT.SKIN && F.flags === 64 && headMaps) {
          sampleHeadMap(headMaps.am, headMaps.w, headMaps.h, F.u, F.v, _m); lum = _m[0] * 1.6; red = _m[1] * 2 - 1; stub = _m[2]; dirt = _m[3];
          sampleHeadMap(headMaps.nr, headMaps.w, headMaps.h, F.u, F.v, _n); nx = (_n[0] * 2 - 1) * 1.0; ny = (_n[1] * 2 - 1) * 1.0; rough = _n[2]; cav = _n[3];
        } else if (m === MAT.SKIN) { const q = F.rest, nz = hash3(Math.floor(q[0] * 40), Math.floor(q[1] * 40), Math.floor(q[2] * 40)); lum = 0.95 + 0.1 * nz; red = 0.04 + 0.06 * sm(1.40, 1.50, q[1]) * 0 + 0.05 * (hash3(Math.floor(q[0] * 15), Math.floor(q[1] * 15), 7) - 0.5); }
        // pores (texmaps skin layer, tile 0.06 m, mip by footprint) and stubble dots
        const tl = TEX_LAYERS[layerIndex.skin].tile_m; tex(sk, 'nr', F.u / tl, F.v / tl, lod, _t); tex(sk, 'am', F.u / tl, F.v / tl, lod, _n); const fade = 1 - sm(2.0, 4.5, lod);
        const pnx = (_t[0] * 2 - 1) * 1.6 * fade, pny = (_t[1] * 2 - 1) * 1.6 * fade, pore = (_n[0] * 1.6 - 1.0) * fade * 1.5;
        if (m === MAT.LIP) { const fis = Math.pow(Math.abs(Math.sin(F.v * 5200 + 4 * hash3(Math.floor(F.v * 700), Math.floor(F.u * 400), 9))), 6); lum = 1 - 0.20 * fis * fade; ny += 0.4 * (fis - 0.4) * fade; rough = 0.42; alb = [base[0], base[1], base[2]]; }
        const T = F.t, Bt = F.b, ex = nx + pnx * 0.55, ey = ny + pny * 0.55;
        if (F.tOK) { N[0] = F.n[0] + T[0] * ex * 0.9 + Bt[0] * ey * 0.9; N[1] = F.n[1] + T[1] * ex * 0.9 + Bt[1] * ey * 0.9; N[2] = F.n[2] + T[2] * ex * 0.9 + Bt[2] * ey * 0.9; const l = Math.hypot(...N); N[0] /= l; N[1] /= l; N[2] /= l; }
        if (m !== MAT.LIP) { alb = [base[0] * lum * (1 + 0.75 * red) * (1 + 0.05 * pore), base[1] * lum * (1 - 0.34 * red) * (1 + 0.05 * pore), base[2] * lum * (1 - 0.42 * red) * (1 + 0.04 * pore)]; }
        // stubble: dots of hair colour at 0.4 mm lattice thresholded by the density; a blue-grey beard shadow under the skin
        if (m === MAT.SKIN && stub > 0.02 && stubble > 0) { const q = F.rest, d = stub * stubble, shadowC = 0.16 * d; alb[0] *= 1 - shadowC * 0.9; alb[1] *= 1 - shadowC; alb[2] *= 1 - shadowC * 0.75;
          const cx = Math.floor(q[0] * 2800), cy = Math.floor(q[1] * 2800), cz = Math.floor(q[2] * 2800), hv = hash3(cx, cy, cz); if (hv < d * 0.75) { const k = 0.35 + 0.4 * hash3(cx, cy, cz + 1); alb = [alb[0] + (hairLin[0] * k - alb[0]) * 0.7, alb[1] + (hairLin[1] * k - alb[1]) * 0.7, alb[2] + (hairLin[2] * k - alb[2]) * 0.7]; rough = Math.max(rough, 0.7); } }
        ao = clamp(0.55 + 0.45 * cav); void dirt;
        const dm = dirt * dirtLevel * 0.35 * (m === MAT.SKIN ? 1 : 0); alb = [alb[0] + (0.30 - alb[0]) * dm * 0.4, alb[1] + (0.22 - alb[1]) * dm * 0.4, alb[2] + (0.15 - alb[2]) * dm * 0.4];
        if (spec && spec[m]) f0 = 0.04;
      }
      // ---------------- cloth, leather, metal, wood ... through the texture layers
      else {
        const map = MATERIAL_MAP[m];
        if (map && map.layer >= 0) {
          const lay = L[map.layer], tl = map.tile_m, lod = Math.max(0, Math.log2(Math.max(1e-3, fpt / (tl / 256))));
          tex(lay, 'nr', F.u / tl, F.v / tl, lod, _t); tex(lay, 'am', F.u / tl, F.v / tl, lod, _n);
          const fade = 1 - sm(2.5, 5.5, lod), str = map.nrm * fade * 0.30; let nx = (_t[0] * 2 - 1) * str, ny = (_t[1] * 2 - 1) * str, lumm = _n[0] * 1.6, tint = _n[1] * 2 - 1, wm = _n[2], dm = _n[3];
          lumm = 1 + (lumm - 1) * fade; rough = clamp(G[3] * (0.75 + 0.5 * _t[2]), 0.12, 1);
          // wear (scuffs, faded fibres) and dirt (dust in the hollows), thresholds on the stored masks
          const wk = sm(wear * map.wear * 0.9 + 0.12, wear * map.wear * 0.9 - 0.12, wm) * 0.16, dk = sm(dirtLevel * map.dirt * 0.8 + 0.12, dirtLevel * map.dirt * 0.8 - 0.12, dm) * 0.14;     // soft thresholds (a hard one gave a houndstooth blotch)
          if (wk > 0) { const g = 0.3 * alb[0] + 0.59 * alb[1] + 0.11 * alb[2]; alb = [alb[0] + (g * 1.25 - alb[0]) * wk, alb[1] + (g * 1.22 - alb[1]) * wk, alb[2] + (g * 1.1 - alb[2]) * wk]; rough = Math.min(1, rough + 0.1 * wk * 6); }
          if (dk > 0) { alb = [alb[0] + (0.30 - alb[0]) * dk, alb[1] + (0.24 - alb[1]) * dk, alb[2] + (0.16 - alb[2]) * dk]; }
          alb = [alb[0] * lumm * (1 + 0.05 * tint), alb[1] * lumm, alb[2] * lumm * (1 - 0.05 * tint)];
          // wrinkle overlay on cloth (vertex byte)
          if (CLOTH.has(m) && (F.flags & 63) > 0) {
            const wr = (F.flags & 63) / 63, vert = (F.flags & 128) !== 0, ft = layers()[layerIndex.cloth_folds], ftl = TEX_LAYERS[layerIndex.cloth_folds].tile_m, flod = Math.max(0, Math.log2(Math.max(1e-3, fpt / (ftl / 256))));
            tex(ft, 'nr', (vert ? F.v : F.u) / ftl, (vert ? F.u : F.v) / ftl, flod, _m); const fx = (_m[0] * 2 - 1) * wr * 0.38, fy = (_m[1] * 2 - 1) * wr * 0.38; nx += vert ? fy : fx; ny += vert ? fx : fy; alb = [alb[0] * (1 - 0.30 * wr * (1 - _m[3])), alb[1] * (1 - 0.30 * wr * (1 - _m[3])), alb[2] * (1 - 0.30 * wr * (1 - _m[3]))];
          }
          if (F.tOK) { N[0] = F.n[0] + F.t[0] * nx + F.b[0] * ny; N[1] = F.n[1] + F.t[1] * nx + F.b[1] * ny; N[2] = F.n[2] + F.t[2] * nx + F.b[2] * ny; const l = Math.hypot(...N); N[0] /= l; N[1] /= l; N[2] /= l; }
          ao = clamp(0.35 + 0.65 * _t[3] * 1.4);
          if (CLOTH.has(m) || m === MAT.HEADGEAR) { const ndv = clamp(N[0] * F.view[0] + N[1] * F.view[1] + N[2] * F.view[2]), fz = Math.pow(1 - ndv, 3) * 0.10; extra = [alb[0] * fz * 2, alb[1] * fz * 2, alb[2] * fz * 2]; }
          if (map.layer === layerIndex.leather || m === MAT.BOOT || m === MAT.LEATHER_BLACK) { rough = clamp(rough * 0.9, 0.3, 0.7); }
        } else { rough = G[3]; }
      }
      if (m === MAT.IRIS || m === MAT.EYE_WHITE || m === MAT.EYE_DARK) f0 = 0.04;
      lighting(F, N, alb, rough, f0, metal, F.shadow, sss, thin, ao, out, extra);
      return out;
    },
  };
  void CLOTH; return env;
}
export { layers as getLayers };
