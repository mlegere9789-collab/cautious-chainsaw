// Skin maps for the 24 heads (film-grade round 3, 2026-10-31), generated in code from the head parameters: no photograph, scan or image asset is read or downloaded.
// Two RGBA8 maps per head in the head-skin UV space (u = azimuth, v = polar angle from the crown; the skin grid vertices carry vertex flag SKIN_MAP_FLAG = 64):
//   NR  R,G = tangent-space normal x,y (128 = 0) from the wrinkle height field, B = roughness, A = cavity (ambient occlusion proxy)
//   AM  R = albedo luminance modulation (160 = x1.0, 255 = x1.6), G = redness (128 = neutral; above is redder: sun, nose, cheeks, capillaries), B = stubble density, A = sweat / dirt mask
// Features (all positions are head-local metres on the shaped surface, symmetric about x = 0): forehead creases and glabellar frown lines, crow's feet fanned from the outer canthus, under-eye bags and tear
// trough, nasolabial folds and marionette lines, upper-lid crease, a hat-line tan break across the forehead, sun-weathered nose / cheekbones / forehead, capillaries on nose and cheek (older men), freckles
// (some men), uneven colouring, T-zone gloss, stubble density over jaw, chin, upper lip and cheeks. Age 17 to 45 years (P.age 0..1 -> 17 + 28 age) scales crease depth, bags, hollows and capillaries.
// The pore layer (texmaps `skin`, tile 0.06 m) and the stubble dots are added per fragment on top (shader.mjs / the product shader). The product streams one pair per head (hero heads 1024 x 512, crowd
// heads 512 x 256; data/figures3d/head-maps.json has the byte accounting and the hashes). Tier PLAUSIBLE-PROCEDURAL (TIERS.json F-SKIN-MAPS): no skin sample, no historical complexion, no wrinkle atlas.
import { headLocalAt, HEAD_EYE_X, HEAD_MOUTH_Y } from './head.mjs';
import { vnoise } from './detail.mjs';
import { rand } from '../../../sim/rng.mjs';
import crypto from 'node:crypto';

export const SKIN_MAP_FLAG = 64, HEAD_UV = { u0: -2 * Math.PI * 0.095, du: 2 * Math.PI * 0.095, v1: Math.PI * 0.11 };
const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }, g2 = (d, s) => Math.exp(-(d * d) / (s * s)), clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const vn = (x, y, z, k) => vnoise(x, y, z, k);
const segDist = (px, py, ax, ay, bx, by) => { const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1e-12, t = clamp(((px - ax) * dx + (py - ay) * dy) / l2, 0, 1), qx = ax + dx * t, qy = ay + dy * t; return [Math.hypot(px - qx, py - qy), t]; };
export const ageYears = P => 17 + 28 * clamp(P.age, 0, 1);
// the per-head look scalars: all from the head index (the head is chosen by the man's identity), independent of the stature or the outfit
export function skinLook(P) {
  const r = k => rand(0x5c17, P.idx, 0, k);
  return { years: ageYears(P), ageK: clamp(P.age, 0, 1), sun: 0.35 + 0.65 * r(1), freckles: r(2) > 0.72 ? 0.5 + 0.5 * r(3) : 0, hatLine: 0.052 + 0.014 * r(4), tan: 0.35 + 0.65 * r(5), veins: r(6), oily: 0.3 + 0.7 * r(7), mottle: 0.5 + 0.5 * r(8), stubbleLevel: 0.55 + 0.45 * r(9) };
}
// the macro field at a head-local point: height (m, negative = a groove), luminance, redness, stubble density, dirt, roughness
export function skinMacro(P, L, x, y, z, out) {
  const ax = Math.abs(x), a = L.ageK, ey = HEAD_EYE_X(P), my = HEAD_MOUTH_Y, front = sm(0.02, 0.06, z);
  let h = 0, cav = 0;
  // ---- wrinkles (grooves, metres). Forehead: three arched creases, broken by noise; frown lines between the brows
  const fw = sm(0.036, 0.024, ax) * front;
  for (let k = 0; k < 3; k++) { const yk = 0.041 + 0.0105 * k + 0.0040 * (ax / 0.03) ** 2 + 0.0012 * (vn(x * 60, k, 3, 5) - 0.5), br = 0.45 + 1.1 * vn(x * 70 + k * 9, 2.5, 1, 6), dep = (0.00010 + 0.00062 * a) * (k === 1 ? 1.2 : 0.8) * br; const gk = dep * fw * g2(y - yk, 0.0016); h -= gk; cav += gk; }
  for (const s of [-1, 1]) { const [d] = segDist(ax * s, y, s * 0.0045, 0.020, s * 0.0040, 0.036); const gk = (0.00005 + 0.00050 * a) * g2(d, 0.0012) * front; h -= gk; cav += gk; }
  // crow's feet: four rays from the outer canthus
  { const cx = ey + 0.0235, cy = 0.0015, dx = ax - cx, dy = y - cy, r = Math.hypot(dx, dy), ang = Math.atan2(dy, dx);
    if (dx > -0.002 && r < 0.026) for (let k = 0; k < 4; k++) { const ak = -0.62 + 0.40 * k + 0.07 * (vn(k, 4, 2, 8) - 0.5), d = r * Math.sin(ang - ak), gk = (0.00003 + 0.00022 * a) * g2(d, 0.0009) * sm(0.003, 0.007, r) * (1 - sm(0.011, 0.020, r)); h -= gk; cav += gk; } }
  // upper-lid crease and the under-eye line and bag
  { const gk = (0.00030 + 0.00018 * P.lidHood) * g2(y - (0.0105 + 0.0030 * P.lidHood), 0.0012) * sm(ey + 0.016, ey + 0.008, ax) * sm(ey - 0.012, ey - 0.004, ax); h -= gk; cav += gk; }
  { const gk = (0.00012 + 0.00055 * a) * g2(y - (-0.0185 + 0.002 * (ax - ey) ** 2 * 400), 0.0013) * sm(ey + 0.014, ey + 0.006, ax) * sm(ey - 0.013, ey - 0.005, ax); h -= gk; cav += gk; }
  // nasolabial fold (ala to mouth corner) and marionette line (mouth corner down the chin)
  { const [d, t] = segDist(ax, y, 0.0165, -0.040, 0.0335, -0.0725), gk = (0.00020 + 0.00085 * a) * g2(d, 0.0017 + 0.0006 * t) * front; h -= gk; cav += gk;
    const [d2] = segDist(ax, y, 0.0335, my - 0.003, 0.0300, my - 0.030), g2k = (0.00005 + 0.00050 * a) * g2(d2, 0.0016); h -= g2k; cav += g2k; }
  // ---- colour. luminance: uneven colouring, the pale forehead above the hat line, bags under the eyes, a slightly darker eye socket
  const uneven = vn(x * 55, y * 55, z * 55, 11) - 0.5, uneven2 = vn(x * 160, y * 160, z * 160, 12) - 0.5, hat = sm(L.hatLine - 0.004, L.hatLine + 0.004, y + 0.0012 * (vn(x * 80, 5, 5, 13) - 0.5)) * sm(0.045, 0.06, y) * front;
  let lum = 1 + 0.07 * uneven * (0.6 + L.mottle) + 0.03 * uneven2 + 0.10 * L.tan * hat * 0.9;
  lum -= (0.04 + 0.09 * a) * g2(y - (-0.0205), 0.0065) * sm(ey + 0.016, ey + 0.004, ax) * front * sm(ey - 0.014, ey - 0.006, ax);        // eye bags and tear trough, bluish-dark
  lum -= 0.05 * g2(ax - ey, 0.016) * g2(y - 0.002, 0.012) * front;                                                                         // eye socket shadow tone
  lum -= 0.45 * 0.12 * (cav / 0.0008);                                                                                                         // grooves darken a little
  // redness: sun on nose, cheeks and forehead below the hat line (L.sun), nose tip, eyelids, ears; capillaries
  let red = 0.10 * L.sun * g2(ax, 0.011) * g2(y - (-0.032), 0.020) + 0.07 * L.sun * g2(ax - 0.044, 0.020) * g2(y - (-0.026), 0.018) + 0.05 * L.sun * (1 - hat) * sm(0.05, 0.075, y) * front
    + 0.04 * g2(ax - ey, 0.013) * g2(y - 0.0, 0.007) + 0.05 * uneven * (0.5 + L.mottle) + 0.04 * g2(y - (my), 0.03) * g2(ax, 0.035) * 0.4;
  const cap = Math.pow(clamp(vn(x * 220, y * 220, z * 220, 14) * 1.5 - 0.62, 0, 1), 1.0) * (0.35 + 0.65 * a) * L.veins * (g2(ax - 0.0145, 0.012) * g2(y + 0.040, 0.014) + g2(ax - 0.040, 0.016) * g2(y + 0.030, 0.014)); red += 0.20 * cap; lum -= 0.04 * cap;
  // freckles
  if (L.freckles > 0) { const f = vn(x * 420, y * 420, z * 420, 15); const fm = clamp((f - 0.78) * 9, 0, 1) * g2(ax - 0.02, 0.03) * g2(y + 0.015, 0.045) * L.freckles * front; lum -= 0.14 * fm; red += 0.03 * fm; }
  // stubble: jaw, chin, upper lip and cheeks below the cheekbone line, fading to the bare skin around the mouth corners; density up to 0.85
  const jaw = sm(-0.012, -0.045, y) * sm(0.066, 0.052, ax) * sm(0.03, 0.05, z + 0.02 * 0) * (1 - 0.35 * g2(ax, 0.005) * sm(my, my - 0.01, y)), lipArea = g2(y - (my + 0.0165), 0.011) * sm(0.04, 0.026, ax) * front, cheek = sm(-0.02, -0.04, y - 0.01 * (ax / 0.05)) * sm(0.012, 0.03, ax) * front;
  const stub = clamp(Math.max(jaw * 0.85, lipArea * 0.9, cheek * 0.5) * L.stubbleLevel * (0.8 + 0.4 * (vn(x * 40, y * 40, z * 40, 16))), 0, 1);
  const dirt = clamp(0.35 + 0.8 * (vn(x * 30, y * 30, z * 30, 17) - 0.5) + 0.25 * sm(0.0, 0.07, y) - 0.2 * g2(ax - ey, 0.02), 0, 1);
  // roughness: oily T-zone and nose, drier cheeks, stubble roughens
  const tz = (sm(0.028, 0.05, y) * g2(ax, 0.026) * front + g2(ax, 0.011) * g2(y + 0.025, 0.028)) * L.oily; const rough = clamp(0.56 - 0.18 * tz + 0.06 * (vn(x * 90, y * 90, z * 90, 18) - 0.5) + 0.16 * stub, 0.28, 0.85);
  out.h = h; out.cav = cav; out.lum = lum; out.red = red; out.stub = stub; out.dirt = dirt; out.rough = rough; return out;
}
// bake the two maps of a head: size w x h (w = 2 h). The positions come from a coarse grid of the shaped surface, bilinear between grid nodes.
export function bakeHeadMaps(P, w = 512, h = 256) {
  const NGx = 128, NGy = 64, G = new Float32Array((NGx + 1) * (NGy + 1) * 3), L = skinLook(P);
  for (let j = 0; j <= NGy; j++) for (let i = 0; i <= NGx; i++) { const ph = -Math.PI + i / NGx * 2 * Math.PI, th = Math.min(Math.PI - 0.02, Math.max(0.02, j / NGy * Math.PI)), p = headLocalAt(P, th, ph), o = (j * (NGx + 1) + i) * 3; G[o] = p[0]; G[o + 1] = p[1]; G[o + 2] = p[2]; }
  const pos = (tx, ty, o) => { const fx = (tx + 0.5) / w * NGx, fy = (ty + 0.5) / h * NGy, i0 = Math.min(NGx - 1, Math.floor(fx)), j0 = Math.min(NGy - 1, Math.floor(fy)), a = fx - i0, b = fy - j0;
    for (let k = 0; k < 3; k++) o[k] = (G[(j0 * (NGx + 1) + i0) * 3 + k] * (1 - a) + G[(j0 * (NGx + 1) + i0 + 1) * 3 + k] * a) * (1 - b) + (G[((j0 + 1) * (NGx + 1) + i0) * 3 + k] * (1 - a) + G[((j0 + 1) * (NGx + 1) + i0 + 1) * 3 + k] * a) * b; return o; };
  const hf = new Float32Array(w * h), cav = new Float32Array(w * h), am = new Uint8Array(w * h * 4), nr = new Uint8Array(w * h * 4), q = [0, 0, 0], F = {};
  for (let ty = 0; ty < h; ty++) for (let tx = 0; tx < w; tx++) {
    pos(tx, ty, q); skinMacro(P, L, q[0], q[1], q[2], F); const k = ty * w + tx; hf[k] = F.h; cav[k] = F.cav;
    am[k * 4] = Math.round(clamp(F.lum / 1.6) * 255); am[k * 4 + 1] = Math.round(clamp(F.red * 0.5 + 0.5) * 255); am[k * 4 + 2] = Math.round(clamp(F.stub) * 255); am[k * 4 + 3] = Math.round(clamp(F.dirt) * 255); nr[k * 4 + 2] = Math.round(clamp(F.rough) * 255);
  }
  // normals from the height field: texel spacing in metres (azimuth: R sin(theta) dphi, polar: R dtheta)
  for (let ty = 0; ty < h; ty++) { const th = (ty + 0.5) / h * Math.PI, dxm = 0.0765 * Math.max(0.15, Math.sin(th)) * 2 * Math.PI / w, dym = 0.112 * Math.PI / h;
    for (let tx = 0; tx < w; tx++) { const k = ty * w + tx, xl = hf[ty * w + ((tx - 1 + w) % w)], xr = hf[ty * w + ((tx + 1) % w)], yu = hf[Math.max(0, ty - 1) * w + tx], yd = hf[Math.min(h - 1, ty + 1) * w + tx];
      let nx = -(xr - xl) / (2 * dxm) * 2.2, ny = -(yd - yu) / (2 * dym) * 2.2; const l = Math.hypot(nx, ny, 1); nx /= l; ny /= l;
      nr[k * 4] = Math.round((nx * 0.5 + 0.5) * 255); nr[k * 4 + 1] = Math.round((ny * 0.5 + 0.5) * 255); nr[k * 4 + 3] = Math.round(clamp(1 - cav[k] / 0.0009 * 0.35) * 255); } }
  return { w, h, nr, am, look: L, sha256: crypto.createHash('sha256').update(nr).update(am).digest('hex') };
}
// bilinear sample of a head map (u wraps, v clamps): uv are the mesh uv; out = [r,g,b,a] 0..1
export function sampleHeadMap(buf, w, h, u, v, out) {
  const tu = ((u - HEAD_UV.u0) / HEAD_UV.du), tv = v / HEAD_UV.v1, fx = tu * w - 0.5, fy = tv * h - 0.5, x0 = Math.floor(fx), y0 = Math.floor(fy), a = fx - x0, b = fy - y0, X0 = ((x0 % w) + w) % w, X1 = (X0 + 1) % w, Y0 = Math.min(h - 1, Math.max(0, y0)), Y1 = Math.min(h - 1, Math.max(0, y0 + 1));
  for (let k = 0; k < 4; k++) out[k] = ((buf[(Y0 * w + X0) * 4 + k] * (1 - a) + buf[(Y0 * w + X1) * 4 + k] * a) * (1 - b) + (buf[(Y1 * w + X0) * 4 + k] * (1 - a) + buf[(Y1 * w + X1) * 4 + k] * a) * b) / 255;
  return out;
}
