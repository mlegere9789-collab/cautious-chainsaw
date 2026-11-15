// WGSL of the figure pass (WebGPU): the same three programs as shaders-gl.mjs (MID: bone-matrix texture, NEAR: CPU palette, IMP: far impostors), appended to the prototype's own common(K) (frame block, units / soldier tables,
// hAt, place, shadowAt, lit, fogged ...). Bind group 1 holds this pass's data; see gpu.mjs.
import { MATC, NSLOT } from './tables.mjs';

export const wgsl = (common) => common + /* wgsl */`
struct Cfg { tpf: u32, pad0: u32, r2: f32, band: f32, hyst: f32, dab: f32, pad2: f32, pad3: f32 }       // r2, band, hyst, dab: the cross-fade of the impostor (lod.mjs); the human and horse groups carry the same block
@group(1) @binding(0) var bones: texture_2d<f32>;
@group(1) @binding(1) var instT: texture_2d<u32>;
@group(1) @binding(2) var varInfoT: texture_2d<u32>;
@group(1) @binding(3) var varPalT: texture_2d<f32>;
@group(1) @binding(4) var palT: texture_2d<f32>;
@group(1) @binding(5) var<storage, read> poseB: array<vec4f>;
@group(1) @binding(6) var impT: texture_2d_array<f32>;
@group(1) @binding(7) var impMetaT: texture_2d<f32>;
@group(1) @binding(8) var<uniform> cfg: Cfg;

fn instOf(i: u32) -> vec4<u32> { return textureLoad(instT, vec2<i32>(i32(i & 4095u), i32(i >> 12u)), 0); }
fn varInfoOf(v: u32) -> vec4<u32> { return textureLoad(varInfoT, vec2<i32>(i32(v & 4095u), i32(v >> 12u)), 0); }
fn statureOf(w: vec4<u32>) -> f32 { return 0.93 + 0.115 * f32((w.z >> 8u) & 255u) / 255.0; }
fn wordsOf(fig: u32) -> vec4<u32> { var w = instOf(fig); let vi = varInfoOf(w.x & 65535u); w.w = (w.w & 65535u) | ((vi.w >> 8u) << 16u) | ((vi.w & 255u) << 24u); return w; }
struct MatR { alb: vec3f, rough: f32, metal: f32 }
fn applyWear(c0: vec3f, wear: f32, tv: f32, tw: f32) -> vec3f {
  var c = c0; let fade = 0.18 * wear; let L = dot(c, vec3f(0.3, 0.59, 0.11)); c += (vec3f(L * 1.02, L, L * 0.96) - c) * fade;
  c += (vec3f(0.30, 0.26, 0.14) - c) * (0.12 * wear); let s = 1.0 + tv; return clamp(vec3f(c.r * s + tw * 0.4, c.g * s, c.b * s - tw * 0.4), vec3f(0.0), vec3f(1.0));
}
fn palAt(x: i32, row: i32) -> vec4f { return textureLoad(palT, vec2<i32>(x, row), 0); }
fn resolveMat(m: i32, w: vec4<u32>) -> MatR {
  let g = palAt(m, 0); let mt = palAt(m, 1); var r: MatR; r.alb = g.rgb; r.rough = g.a; r.metal = mt.x;
  if (mt.y > -0.5) { let t = (w.x & 65535u) * ${NSLOT}u + u32(mt.y + 0.5); let c = textureLoad(varPalT, vec2<i32>(i32(t & 4095u), i32(t >> 12u)), 0); if (c.r + c.g + c.b > 0.0) { r.alb = c.rgb; } }
  if (m == ${MATC.SKIN}) { r.alb = palAt(64 + i32((w.y >> 16u) & 255u), 0).rgb; }
  else if (m == ${MATC.LIP}) { let s = palAt(64 + i32((w.y >> 16u) & 255u), 0).rgb; r.alb = vec3f(s.r * 0.80, s.g * 0.42, s.b * 0.45); }
  else if (m == ${MATC.HAIR} || m == ${MATC.HAIR_CARD} || m == ${MATC.BEARD_CARD}) { r.alb = palAt(80 + i32((w.y >> 27u) & 7u), 0).rgb; if (((w.y >> 30u) & 3u) > 0u) { r.alb = r.alb * 0.5 + vec3f(0.13); } }
  else if (m == ${MATC.IRIS}) { r.alb = palAt(88 + i32((w.z >> 3u) & 7u), 0).rgb; }
  else if (m == ${MATC.FLAG_WHITE}) { let fk = (w.w >> 16u) & 255u; if (fk > 0u) { r.alb = palAt(i32(fk), 2).rgb; } }
  if (mt.z > 0.5) { let wear = f32((w.z >> 16u) & 255u) / 255.0; let tv = (f32((w.z >> 24u) & 15u) / 15.0 - 0.5) * 0.16; let tw = (f32((w.z >> 28u) & 15u) / 15.0 - 0.5) * 0.08; r.alb = applyWear(r.alb, wear, tv, tw); }
  return r;
}
fn ign(p: vec2f) -> f32 { return fract(52.9829189 * fract(dot(p, vec2f(0.06711056, 0.00583715)))); }
// THE CROSS-FADE (lod.mjs): the fourth word of an instance record is the dither range [lo, hi) of its level, lo16 | hi16 << 16 over 65534; the word 0 keeps everything. The levels of one figure (and its impostor) partition [0, 1),
// every fragment of every level draws the same number n = fract(ign(pixel) + phase(figure)), so each pixel is drawn by exactly one of them. x = lo, y = hi (2.0 = no upper bound), z = the figure's phase.
fn fadeOf(P: u32, fig: u32) -> vec3f { if (P == 0u) { return vec3f(0.0, 2.0, 0.0); } let hi = P >> 16u; var h = 2.0; if (hi < 65534u) { h = f32(hi) / 65534.0; } return vec3f(f32(P & 65535u) / 65534.0, h, hsh(fig * 7u + 3u)); }
fn fadeKeep(f: vec3f, frag: vec2f) -> bool { if (f.y > 1.5 && f.x <= 0.0) { return true; } let n = fract(ign(frag) + f.z); return n >= f.x && n < f.y; }
fn bandS(nu: f32, r: f32, b: f32) -> f32 { if (r <= 0.0) { return 1.0; } if (b <= 0.0) { return select(0.0, 1.0, nu >= r); } let t = clamp((nu - r * (1.0 - b)) / (2.0 * r * b), 0.0, 1.0); return t * t * (3.0 - 2.0 * t); }
struct FOut { @builtin(position) pos: vec4f, @location(0) wp: vec3f, @location(1) n: vec3f, @location(2) @interpolate(flat) mat: u32, @location(3) @interpolate(flat) fl: u32, @location(4) @interpolate(flat) w: vec4<u32>, @location(5) @interpolate(flat) fade: vec3f }
struct VIn { @location(0) pos: vec3f, @location(1) nrm: vec4f, @location(2) mf: vec4<u32>, @location(3) j: vec4<u32>, @location(4) wt: vec4f, @location(5) iP: vec4f, @location(6) iA: vec4f, @location(7) iI: vec4<u32> }
fn finish(v: VIn, sp: vec3f, sn: vec3f) -> FOut {
  let w = wordsOf(v.iI.x); var sc = statureOf(w); if (v.iP.w > 1.5) { sc = 1.0; }
  let wp = vec3f(v.iP.x, hAt(v.iP.x, v.iP.y), v.iP.y) + rotY(v.iP.z, sp * sc);
  var o: FOut; o.wp = wp; o.n = rotY(v.iP.z, normalize(sn + vec3f(1e-6))); o.mat = v.mf.x; o.fl = v.mf.y; o.w = w; o.fade = fadeOf(v.iI.w, v.iI.x); o.pos = F.vp * vec4f(wp, 1.0); return o;
}
fn fetchM(g: u32, b: u32, m: u32) -> vec4f { let x = i32((g & 1u) * cfg.tpf + b * 3u + m); let y = i32(g >> 1u); return textureLoad(bones, vec2<i32>(x, y), 0); }
@vertex fn vs_mid(v: VIn) -> FOut {
  let rA0 = v.iI.y & 65535u; let rA1 = v.iI.y >> 16u; let rB0 = v.iI.z & 65535u; let rB1 = v.iI.z >> 16u; let fA = v.iA.x; let fB = v.iA.y; let wB = v.iA.z;
  var sp = vec3f(0.0); var sn = vec3f(0.0); let n = v.nrm.xyz;
  for (var k = 0; k < 4; k++) {
    let wk = v.wt[k]; if (wk <= 0.0) { continue; } let b = v.j[k];
    var a0 = mix(fetchM(rA0, b, 0u), fetchM(rA1, b, 0u), fA); var a1 = mix(fetchM(rA0, b, 1u), fetchM(rA1, b, 1u), fA); var a2 = mix(fetchM(rA0, b, 2u), fetchM(rA1, b, 2u), fA);
    if (wB > 0.0) { let b0 = mix(fetchM(rB0, b, 0u), fetchM(rB1, b, 0u), fB); let b1 = mix(fetchM(rB0, b, 1u), fetchM(rB1, b, 1u), fB); let b2 = mix(fetchM(rB0, b, 2u), fetchM(rB1, b, 2u), fB); a0 = mix(a0, b0, wB); a1 = mix(a1, b1, wB); a2 = mix(a2, b2, wB); }
    sp += wk * vec3f(dot(a0.xyz, v.pos) + a0.w, dot(a1.xyz, v.pos) + a1.w, dot(a2.xyz, v.pos) + a2.w); sn += wk * vec3f(dot(a0.xyz, n), dot(a1.xyz, n), dot(a2.xyz, n));
  }
  return finish(v, sp, sn);
}
@vertex fn vs_near(v: VIn) -> FOut {
  let slot = v.iI.y; var sp = vec3f(0.0); var sn = vec3f(0.0); let n = v.nrm.xyz;
  for (var k = 0; k < 4; k++) {
    let wk = v.wt[k]; if (wk <= 0.0) { continue; } let o = slot * 183u + v.j[k] * 3u; let a0 = poseB[o]; let a1 = poseB[o + 1u]; let a2 = poseB[o + 2u];
    sp += wk * vec3f(dot(a0.xyz, v.pos) + a0.w, dot(a1.xyz, v.pos) + a1.w, dot(a2.xyz, v.pos) + a2.w); sn += wk * vec3f(dot(a0.xyz, n), dot(a1.xyz, n), dot(a2.xyz, n));
  }
  return finish(v, sp, sn);
}
@fragment fn fs_fig(i: FOut) -> @location(0) vec4f {
  if (!fadeKeep(i.fade, i.pos.xy)) { discard; }
  if ((i32(i.mat) == ${MATC.HAIR_CARD} || i32(i.mat) == ${MATC.BEARD_CARD}) && i.fl > 0u && f32(i.fl & 31u) / 31.0 < ign(i.pos.xy)) { discard; }
  let m = resolveMat(i32(i.mat), i.w); let N = normalize(i.n); let sh = shadowAt(i.wp); let ao = 0.8;
  return vec4f(fogged(lit(m.alb, m.rough, m.metal, N, i.wp, sh, ao), i.wp), 1.0);
}
// ---- far impostors: one instance per world figure. cfg = (r2, band, hysteresis, dab height in pixels): the impostor cross-fades in over r2 (1 +- band) in the figure's own scale (the same hash as figureScale: hsh(fig * 13 + 5)),
// keeps the fragments of [lo, 1) the three levels do not (lo = f.x), and gives way from the baked view to a flat two-tone dab below cfg.dab pixels over the same band of the height (f.y = the share of the dab). A figure of under 3 px keeps a share of its fragments (v.z).
struct IOut { @builtin(position) pos: vec4f, @location(0) wp: vec3f, @location(1) q: vec2f, @location(2) @interpolate(flat) w: vec4<u32>, @location(3) @interpolate(flat) v: vec4f, @location(4) @interpolate(flat) rt: vec3f, @location(5) @interpolate(flat) f: vec2f }
@vertex fn vs_imp(@builtin(vertex_index) vi: u32, @builtin(instance_index) ii: u32) -> IOut {
  var o: IOut; o.pos = vec4f(2.0, 2.0, 2.0, 1.0); o.wp = vec3f(0.0); o.q = vec2f(0.0); o.w = vec4<u32>(0u); o.v = vec4f(0.0); o.rt = vec3f(0.0); o.f = vec2f(0.0);
  let p = place(ii, F.cam.w); let d3 = p.pos + vec3f(0.0, 0.9, 0.0) - F.cam.xyz; let dist = length(d3); let b = cfg.band; let hy = cfg.hyst; var rLo = cfg.r2 * 0.995; if (b > 0.0) { rLo = cfg.r2 * (1.0 - b) * (1.0 - hy); } if (dist < rLo || dist > F.lod.z) { return o; }
  let fsc = 1.0 + hy * (2.0 * hsh(ii * 13u + 5u) - 1.0); var sF = select(0.0, 1.0, dist >= cfg.r2 * 0.995); if (b > 0.0) { sF = bandS(dist / fsc, cfg.r2, b); } let lo = floor((1.0 - sF) * 65534.0 + 0.5); if (lo >= 65534.0) { return o; }
  let w = wordsOf(ii); let vinf = varInfoOf(w.x & 65535u); let cls = i32(vinf.z); let imeta = textureLoad(impMetaT, vec2<i32>(cls, 0), 0); let sc = statureOf(w);
  let ppm = imeta.y; let hm = imeta.x; var qh = 64.0 / ppm * sc; var qw = 48.0 / ppm * sc; let yb = (hm * 0.5 - 32.0 / ppm) * sc;
  let pxPerM = F.scr.y * 0.5 / (F.misc.x * dist); let hpx = qh * pxPerM; var cover = 1.0; var dm = select(0.0, 1.0, hpx < cfg.dab); if (b > 0.0) { dm = 1.0 - bandS(hpx * fsc, cfg.dab, b); }
  if (hpx < 3.0) { qh = max(qh, 3.0 / pxPerM); qw = max(qw, 1.7 / pxPerM); cover = clamp(hpx / 3.0, 0.12, 1.0); }
  let toCam = normalize(vec3f(-d3.x, 0.0, -d3.z)); let right = vec3f(toCam.z, 0.0, -toCam.x); let cx = f32(vi & 1u) * 2.0 - 1.0; let cy = f32((vi >> 1u) & 1u);
  let wp = p.pos + right * (cx * qw * 0.5) + vec3f(0.0, yb + cy * qh, 0.0); o.pos = F.vp * vec4f(wp, 1.0); o.wp = wp; o.q = vec2f(cx * 0.5 + 0.5, cy);
  let c = cos(p.head); let s = sin(p.head); let dxm = toCam.x * c - toCam.z * s; let dzm = toCam.x * s + toCam.z * c; var yaw = atan2(dxm, dzm); if (yaw < 0.0) { yaw += 6.2831853; }
  let view = floor(yaw / 6.2831853 * 8.0 + 0.5) % 8.0; o.v = vec4f(view, f32(cls), cover, hsh(ii * 7u + 3u)); o.w = w; o.rt = right; o.f = vec2f(lo / 65534.0, dm); return o;
}
@fragment fn fs_imp(i: IOut) -> @location(0) vec4f {
  let n = fract(ign(i.pos.xy) + i.v.w); if (n < i.f.x) { discard; }                                          // [0, lo) is kept by the 3D levels
  var u = n; if (i.f.x > 0.0) { u = (n - i.f.x) / (1.0 - i.f.x); } if (u > i.v.z) { discard; } var uu = u; if (i.v.z < 1.0) { uu = u / i.v.z; }      // u, uu: uniform numbers again (the share kept, the share of the dab)
  let toCam = normalize(F.cam.xyz - i.wp); let hc = normalize(vec3f(toCam.x, 0.0, toCam.z));
  if (uu < i.f.y) { let mm = select(${MATC.TROUSERS}, ${MATC.COAT}, i.q.y > 0.45); let m = resolveMat(mm, i.w);
    return vec4f(fogged(lit(m.alb, m.rough, m.metal, normalize(hc * 0.7 + vec3f(0.0, 0.7, 0.0)), i.wp, 1.0, 0.8), i.wp), 1.0); }
  let px = i32(i.v.x) * 48 + clamp(i32(i.q.x * 48.0), 0, 47); let py = clamp(i32((1.0 - i.q.y) * 64.0), 0, 63); let t = textureLoad(impT, vec2<i32>(px, py), i32(i.v.y), 0); let mat = i32(t.r * 255.0 + 0.5); if (mat == 0) { discard; }
  let nx = t.g * 2.0 - 1.0; let ny = t.b * 2.0 - 1.0; let nz = sqrt(max(0.0, 1.0 - nx * nx - ny * ny)); let N = normalize(i.rt * nx + vec3f(0.0, 1.0, 0.0) * ny + hc * nz);
  let m = resolveMat(mat, i.w); return vec4f(fogged(lit(m.alb, m.rough, m.metal, N, i.wp, 1.0, 0.55 + 0.45 * t.a), i.wp), 1.0);
}`;
