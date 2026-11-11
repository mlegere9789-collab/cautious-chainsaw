// WGSL for the WebGPU renderer. Constants that depend on baked data are injected by common(K).
export const common = (K) => /* wgsl */`
struct FU {
  vp: mat4x4f, prevVp: mat4x4f, invVp: mat4x4f, sm0: mat4x4f, sm1: mat4x4f,
  cam: vec4f, sun: vec4f, scr: vec4f, terr: vec4f, terr2: vec4f, lod: vec4f,
  right: vec4f, up: vec4f, fwd: vec4f, misc: vec4f, misc2: vec4f,
}
@group(0) @binding(0) var<uniform> F: FU;
@group(0) @binding(1) var<storage, read> units: array<vec4f>;
@group(0) @binding(2) var<storage, read> sold0: array<vec4f>;
@group(0) @binding(3) var<storage, read> sold1: array<vec4f>;
@group(0) @binding(4) var heightTex: texture_2d<f32>;
@group(0) @binding(5) var clampS: sampler;
@group(0) @binding(6) var shadowTex: texture_depth_2d_array;
@group(0) @binding(7) var shadowS: sampler_comparison;
@group(0) @binding(8) var aerialTex: texture_2d<f32>;
@group(0) @binding(9) var<uniform> pal: array<vec4f, 64>;
@group(0) @binding(10) var<storage, read> gunsB: array<vec4f>;
@group(0) @binding(11) var wrapS: sampler;

var<private> FDUR: array<f32, 7> = array<f32, 7>(4.0, 1.0, 0.62, 4.2, 1.4, 1.6, 1.0);
var<private> HDUR: array<f32, 3> = array<f32, 3>(4.0, 1.15, 0.58);
var<private> FROW: array<f32, 7> = array<f32, 7>(${K.frow});
var<private> HROW: array<f32, 3> = array<f32, 3>(${K.hrow});
const FRAMES: f32 = ${K.frames}.0;
const PI: f32 = 3.14159265;

fn hsh(n0: u32) -> f32 { var n = (n0 ^ 61u) ^ (n0 >> 16u); n = n + (n << 3u); n = n ^ (n >> 4u); n = n * 0x27d4eb2du; n = n ^ (n >> 15u); return f32(n) / 4294967296.0; }
fn hAt(x: f32, z: f32) -> f32 {
  let uv = vec2f(x / F.terr.x + 0.5, z / F.terr.y + 0.5); let n = F.terr.z;
  return textureSampleLevel(heightTex, clampS, (uv * (n - 1.0) + 0.5) / n, 0.0).r;
}
fn rotY(h: f32, v: vec3f) -> vec3f { let c = cos(h); let s = sin(h); return vec3f(v.x * c + v.z * s, v.y, -v.x * s + v.z * c); }
fn bodyScale(v: f32) -> f32 { return 0.95 + 0.1 * v; }

struct Pl { pos: vec3f, head: f32, clip: u32, s: f32, team: u32, klass: u32, vari: f32, seed: f32 }
fn place(i: u32, t: f32) -> Pl {
  let a = sold0[i]; let b = sold1[i]; let ui = u32(a.w);
  let u0 = units[ui * 3u]; let u1 = units[ui * 3u + 1u]; let u2 = units[ui * 3u + 2u];
  let te = min(t, b.x); let dt = te - u2.x; let ux = u0.x + u1.x * dt; let uz = u0.y + u1.y * dt;
  let sx = a.x + (hsh(i * 31u + 1u) - 0.5) * 0.2; let sz = a.y + (hsh(i * 37u + 2u) - 0.5) * 0.2;
  let c = cos(u0.z); let sn = sin(u0.z);
  let wx = ux + sx * c + sz * sn; let wz = uz - sx * sn + sz * c;
  var p: Pl; p.pos = vec3f(wx, hAt(wx, wz), wz); p.head = u0.z + (a.z - 0.5) * 0.12; p.seed = a.z; p.team = u32(u1.z); p.klass = u32(u1.w); p.vari = b.w;
  let kind = u32(u0.w); var clip = kind; var s = 0.0;
  if (p.klass == 1u) { s = fract(t / HDUR[kind] * (0.94 + 0.12 * a.z) + a.z); }
  else if (t >= b.x) { let a2 = (t - b.x) / 1.6; if (a2 < 1.0) { clip = 5u; s = a2; } else { clip = 6u; s = 1.0; } }
  else if (kind == 3u || kind == 4u) { let P = 5.6 + (a.z - 0.5); let ph = fract((t + b.z * P) / P); if (ph < 0.78) { clip = 3u; s = ph / 0.78; } else { clip = 4u; s = (ph - 0.78) / 0.22; } }
  else { s = fract(t / FDUR[kind] * (0.92 + 0.16 * a.z) + a.z); }
  p.clip = clip; p.s = s; return p;
}
// VAT rows: x = row0, y = row1, z = mix
fn vatRows(klass: u32, clip: u32, s: f32) -> vec3f {
  var base = 0.0; var looped = true;
  if (klass == 0u) { base = FROW[clip]; looped = clip < 5u; } else { base = HROW[clip]; }
  if (looped) { let f = s * FRAMES; let i0 = floor(f); var i1 = i0 + 1.0; if (i1 >= FRAMES) { i1 = 0.0; } return vec3f(base + i0, base + i1, f - i0); }
  let f = s * (FRAMES - 1.0); let i0 = floor(f); let i1 = min(i0 + 1.0, FRAMES - 1.0); return vec3f(base + i0, base + i1, f - i0);
}
fn tint(mat: u32, vari: f32, seed: f32) -> vec3f {
  if (mat == 10u) { let k = u32(vari * 4.0); if (k == 0u) { return vec3f(1.0); } if (k == 1u) { return vec3f(0.3); } if (k == 2u) { return vec3f(1.7, 1.0, 0.7); } return vec3f(2.6); }
  if (mat == 3u) { return mix(vec3f(0.8, 0.78, 0.8), vec3f(1.15, 1.1, 1.05), fract(vari * 7.3)); }
  if (mat == 0u || mat == 1u || mat == 2u || mat == 7u) { return vec3f(0.82 + 0.36 * fract(vari * 13.7 + f32(mat) * 0.37)) * mix(vec3f(1.0), vec3f(1.1, 1.0, 0.85), fract(vari * 3.1)); }
  return vec3f(1.0);
}
fn palC(team: u32, mat: u32) -> vec4f { return pal[(team * 16u + mat) * 2u]; }
fn palM(team: u32, mat: u32) -> f32 { return pal[(team * 16u + mat) * 2u + 1u].x; }

fn shadowAt(wp: vec3f) -> f32 {
  let ts = F.misc2.w;
  for (var c = 0; c < 2; c++) {
    var m = F.sm0; if (c == 1) { m = F.sm1; }
    let q = m * vec4f(wp, 1.0); let uv = vec2f(q.x * 0.5 + 0.5, 0.5 - q.y * 0.5);
    if (uv.x > 0.02 && uv.y > 0.02 && uv.x < 0.98 && uv.y < 0.98 && q.z > 0.0 && q.z < 1.0) {
      var s = 0.0; let zr = q.z - 0.0012;
      s += textureSampleCompareLevel(shadowTex, shadowS, uv + vec2f(-0.5, -0.5) * ts, c, zr);
      s += textureSampleCompareLevel(shadowTex, shadowS, uv + vec2f(0.5, -0.5) * ts, c, zr);
      s += textureSampleCompareLevel(shadowTex, shadowS, uv + vec2f(-0.5, 0.5) * ts, c, zr);
      s += textureSampleCompareLevel(shadowTex, shadowS, uv + vec2f(0.5, 0.5) * ts, c, zr);
      return s * 0.25;
    }
  }
  return 1.0;
}
fn lit(alb: vec3f, rough: f32, metal: f32, N: vec3f, wp: vec3f, sh: f32, ao: f32) -> vec3f {
  let L = F.sun.xyz; let V = normalize(F.cam.xyz - wp); let H = normalize(L + V);
  let nl = max(dot(N, L), 0.0); let nh = max(dot(N, H), 0.0); let nv = max(dot(N, V), 0.001); let vh = max(dot(V, H), 0.0);
  let a = max(rough * rough, 0.02); let a2 = a * a; let d = nh * nh * (a2 - 1.0) + 1.0; let D = a2 / (PI * d * d);
  let k = (rough + 1.0) * (rough + 1.0) / 8.0; let G = (nl / (nl * (1.0 - k) + k)) * (nv / (nv * (1.0 - k) + k));
  let f0 = mix(vec3f(0.04), alb, metal); let Fr = f0 + (vec3f(1.0) - f0) * pow(1.0 - vh, 5.0);
  let spec = D * G * Fr / (4.0 * nv * max(nl, 0.001));
  let diff = (1.0 - metal) * alb / PI * (vec3f(1.0) - Fr);
  let sunC = vec3f(1.0, 0.93, 0.82) * F.sun.w;
  let amb = mix(vec3f(0.07, 0.06, 0.05), vec3f(0.16, 0.22, 0.34), N.y * 0.5 + 0.5);
  return (diff + spec) * sunC * nl * sh + alb * (1.0 - metal) * amb * ao;
}
fn skyCol(d: vec3f) -> vec3f {
  let h = clamp(d.y, -0.2, 1.0); var c = mix(vec3f(0.78, 0.84, 0.92), vec3f(0.22, 0.38, 0.72), pow(max(h, 0.0), 0.45));
  let sd = max(dot(d, F.sun.xyz), 0.0); c += vec3f(1.0, 0.8, 0.55) * (pow(sd, 8.0) * 0.25 + pow(sd, 800.0) * 12.0); return c * 1.1;
}
fn fogged(c: vec3f, wp: vec3f) -> vec3f {
  let dv = wp - F.cam.xyz; let d = length(dv); let f = 1.0 - exp(-d * 0.00006); return mix(c, skyCol(normalize(dv)) * 0.9, clamp(f, 0.0, 0.85));
}
fn linDepth(d: f32) -> f32 { let n = F.misc.w; let f = F.lod.w; return n * f / (f - d * (f - n)); }
struct VOut { @builtin(position) pos: vec4f, @location(0) wp: vec3f, @location(1) n: vec3f, @location(2) @interpolate(flat) mt: vec4f }
`;

export const terrainWGSL = (K) => common(K) + /* wgsl */`
struct TOut { @builtin(position) pos: vec4f, @location(0) wp: vec3f }
@vertex fn vs(@location(0) g: vec3f, @location(1) inst: vec4f) -> TOut {
  let x = inst.x + g.x * inst.z; let z = inst.y + g.y * inst.z; var y = hAt(x, z); y = y - g.z * 30.0;
  var o: TOut; o.wp = vec3f(x, y, z); o.pos = F.vp * vec4f(o.wp, 1.0); return o;
}
fn vnoise(p: vec2f) -> f32 { let i = floor(p); let f = fract(p); let u = f * f * (3.0 - 2.0 * f); let ii = vec2u(vec2i(i) + vec2i(4096));
  let a = hsh((ii.x * 73856093u) ^ (ii.y * 19349663u)); let b = hsh(((ii.x + 1u) * 73856093u) ^ (ii.y * 19349663u)); let c = hsh((ii.x * 73856093u) ^ ((ii.y + 1u) * 19349663u)); let d = hsh(((ii.x + 1u) * 73856093u) ^ ((ii.y + 1u) * 19349663u)); return mix(mix(a, b, u.x), mix(c, d, u.x), u.y); }
@fragment fn fs(in: TOut) -> @location(0) vec4f {
  let wp = in.wp; let uv = vec2f(wp.x / F.terr.x + 0.5, wp.z / F.terr.y + 0.5);
  var alb = textureSample(aerialTex, wrapS, uv).rgb;
  let dist = length(wp - F.cam.xyz); let near = 1.0 - smoothstep(10.0, 220.0, dist);
  let n1 = vnoise(wp.xz * 0.9); let n2 = vnoise(wp.xz * 5.0); alb = alb * (1.0 + near * ((n1 - 0.5) * 0.5 + (n2 - 0.5) * 0.45));
  let e = 3.0; let hx = hAt(wp.x + e, wp.z) - hAt(wp.x - e, wp.z); let hz = hAt(wp.x, wp.z + e) - hAt(wp.x, wp.z - e);
  let N = normalize(vec3f(-hx, 2.0 * e, -hz));
  let sh = shadowAt(wp);
  var col = lit(alb * vec3f(1.0, 1.02, 0.95), 0.9, 0.0, N, wp, sh, 1.0);
  return vec4f(fogged(col, wp), 1.0);
}`;

export const skyWGSL = (K) => common(K) + /* wgsl */`
struct SOut { @builtin(position) pos: vec4f, @location(0) ndc: vec2f }
@vertex fn vs(@builtin(vertex_index) i: u32) -> SOut { var p = array<vec2f, 3>(vec2f(-1.0, -1.0), vec2f(3.0, -1.0), vec2f(-1.0, 3.0)); var o: SOut; o.pos = vec4f(p[i], 0.9999, 1.0); o.ndc = p[i]; return o; }
@fragment fn fs(in: SOut) -> @location(0) vec4f { let w = F.invVp * vec4f(in.ndc, 1.0, 1.0); let d = normalize(w.xyz / w.w - F.cam.xyz); return vec4f(skyCol(d), 1.0); }`;

// --- skinned near LOD (list + pose) ; NB bones
export const nearWGSL = (K, NB) => common(K) + /* wgsl */`
@group(1) @binding(0) var<storage, read> list: array<u32>;
@group(1) @binding(1) var<storage, read> pose: array<vec4f>;
@vertex fn vs(@location(0) pos: vec3f, @location(1) nrm: vec3f, @location(2) mat: f32, @location(3) jw: vec4f, @builtin(instance_index) inst: u32) -> VOut {
  let si = list[inst]; let p = place(si, F.cam.w); let base = inst * ${NB}u * 3u;
  var sp = vec3f(0.0); var sn = vec3f(0.0);
  for (var k = 0u; k < 2u; k++) { var j = u32(jw.x); var w = jw.z; if (k == 1u) { j = u32(jw.y); w = jw.w; } if (w == 0.0) { continue; }
    let o = base + j * 3u; let r0 = pose[o]; let r1 = pose[o + 1u]; let r2 = pose[o + 2u];
    sp += w * vec3f(dot(r0.xyz, pos) + r0.w, dot(r1.xyz, pos) + r1.w, dot(r2.xyz, pos) + r2.w);
    sn += w * vec3f(dot(r0.xyz, nrm), dot(r1.xyz, nrm), dot(r2.xyz, nrm)); }
  let wp = p.pos + rotY(p.head, sp * bodyScale(p.vari)); var o: VOut; o.wp = wp; o.n = rotY(p.head, normalize(sn)); o.pos = F.vp * vec4f(wp, 1.0);
  o.mt = vec4f(mat, f32(p.team), p.vari, f32(p.klass)); return o;
}
@fragment fn fs(in: VOut) -> @location(0) vec4f {
  let mt = u32(in.mt.x + 0.5); let team = u32(in.mt.y); let pc = palC(team, mt); var alb = pc.rgb * tint(mt, in.mt.z, 0.0);
  let N = normalize(in.n); let sh = shadowAt(in.wp); let ao = clamp(0.55 + 0.45 * smoothstep(0.0, 1.2, in.wp.y - hAt(in.wp.x, in.wp.z)), 0.0, 1.0);
  return vec4f(fogged(lit(alb, pc.a, palM(team, mt), N, in.wp, sh, ao), in.wp), 1.0);
}
@fragment fn fs_null(in: VOut) {}`;

// --- VAT mid LOD (list + vat texture)
export const midWGSL = (K) => common(K) + /* wgsl */`
@group(1) @binding(0) var<storage, read> list: array<u32>;
@group(1) @binding(1) var vat: texture_2d<f32>;
@vertex fn vs(@builtin(vertex_index) vi: u32, @builtin(instance_index) inst: u32, @location(0) pos: vec3f, @location(1) nrm: vec3f, @location(2) mat: f32) -> VOut {
  let si = list[inst]; let p = place(si, F.cam.w); let rw = vatRows(p.klass, p.clip, p.s);
  let a = textureLoad(vat, vec2u(vi, u32(rw.x)), 0).xyz; let b = textureLoad(vat, vec2u(vi, u32(rw.y)), 0).xyz;
  let wp = p.pos + rotY(p.head, mix(a, b, rw.z) * bodyScale(p.vari)); var o: VOut; o.wp = wp; o.n = rotY(p.head, nrm); o.pos = F.vp * vec4f(wp, 1.0);
  o.mt = vec4f(mat, f32(p.team), p.vari, f32(p.klass)); return o;
}
@fragment fn fs(in: VOut) -> @location(0) vec4f {
  let mt = u32(in.mt.x + 0.5); let team = u32(in.mt.y); let pc = palC(team, mt); let alb = pc.rgb * tint(mt, in.mt.z, 0.0);
  let N = normalize(in.n); let sh = shadowAt(in.wp);
  return vec4f(fogged(lit(alb, pc.a, palM(team, mt), N, in.wp, sh, 0.8), in.wp), 1.0);
}
@fragment fn fs_null(in: VOut) {}`;

export const gunWGSL = (K) => common(K) + /* wgsl */`
@vertex fn vs(@location(0) pos: vec3f, @location(1) nrm: vec3f, @location(2) mat: f32, @location(3) jw: vec4f, @builtin(instance_index) g: u32) -> VOut {
  let a = gunsB[g * 2u]; let b = gunsB[g * 2u + 1u]; var lp = pos;
  if (u32(jw.x) == 1u) { let tc = F.cam.w + b.y; let x = tc - floor(tc / b.x) * b.x; lp.z = lp.z - 0.55 * (1.0 - exp(-x * 30.0)) * exp(-x * 2.6); }
  let wp0 = rotY(a.z, lp * 1.0); let wp = vec3f(a.x + wp0.x, hAt(a.x, a.y) + wp0.y, a.y + wp0.z);
  var o: VOut; o.wp = wp; o.n = rotY(a.z, nrm); o.pos = F.vp * vec4f(wp, 1.0); o.mt = vec4f(mat, a.w, 0.0, 0.0); return o;
}
@fragment fn fs(in: VOut) -> @location(0) vec4f {
  let mt = u32(in.mt.x + 0.5); let team = u32(in.mt.y); let pc = palC(team, mt); let N = normalize(in.n); let sh = shadowAt(in.wp);
  return vec4f(fogged(lit(pc.rgb, pc.a, palM(team, mt), N, in.wp, sh, 0.9), in.wp), 1.0);
}
@fragment fn fs_null(in: VOut) {}`;

// --- far impostors: instanced quads from a static list; collapses soldiers handled by the nearer LODs
export const impWGSL = (K, o) => common(K) + /* wgsl */`
@group(1) @binding(0) var<storage, read> list: array<u32>;
@group(1) @binding(1) var atlas: texture_2d<f32>;
struct IOut { @builtin(position) pos: vec4f, @location(0) uv0: vec2f, @location(1) uv1: vec2f, @location(2) @interpolate(flat) wv: vec4f, @location(3) wp: vec3f, @location(4) @interpolate(flat) dab: vec4f, @location(5) q: vec2f }
const VIEWS: f32 = ${o.views}.0; const FR: f32 = ${o.frames}.0; const CW: f32 = ${o.cw}.0; const CH: f32 = ${o.ch}.0; const ATW: f32 = ${o.W}.0; const ATH: f32 = ${o.H}.0; const TEAMH: f32 = ${o.H / 2}.0;
const QH: f32 = ${o.qh}; const QW: f32 = ${o.qw}; const MIDY: f32 = ${o.midy};
@vertex fn vs(@builtin(vertex_index) vi: u32, @builtin(instance_index) inst: u32) -> IOut {
  var o: IOut; let si = list[inst]; let p = place(si, F.cam.w);
  let c = vec3f(p.pos.x, p.pos.y + MIDY, p.pos.z); let d3 = c - F.cam.xyz; let dist = length(d3);
  o.pos = vec4f(2.0, 2.0, 2.0, 1.0);
  if (dist < F.lod.y || dist > F.lod.z) { return o; }
  let pxPerM = F.scr.y * 0.5 / (F.misc.x * dist); let sc = bodyScale(p.vari);
  let hpx = QH * sc * pxPerM; var qh = QH * sc; var qw = QW * sc; var dab = 0.0;
  if (hpx < 7.0) { qh = max(qh, 3.0 / pxPerM); qw = max(qw, 1.7 / pxPerM); dab = clamp(hpx / 3.0, 0.12, 1.0); }
  let toCam = normalize(vec3f(-d3.x, 0.0, -d3.z)); let right = vec3f(toCam.z, 0.0, -toCam.x);
  let cx = f32(vi & 1u) * 2.0 - 1.0; let cy = f32((vi >> 1u) & 1u);
  let base = vec3f(p.pos.x, p.pos.y, p.pos.z); let wp = base + right * cx * qw * 0.5 + vec3f(0.0, cy * qh, 0.0);
  o.pos = F.vp * vec4f(wp, 1.0); o.wp = wp; o.q = vec2f(cx * 0.5 + 0.5, cy);
  // view selection: camera direction in model space
  let dxw = -d3.x; let dzw = -d3.z; let cs = cos(p.head); let sn = sin(p.head); let dxm = dxw * cs - dzw * sn; let dzm = dxw * sn + dzw * cs;
  var az = atan2(-dxm, dzm); if (az < 0.0) { az = az + 2.0 * PI; } let vf = az / (2.0 * PI) * VIEWS; let v0 = floor(vf); let v1 = v0 + 1.0; let wv = vf - v0;
  var row = 0.0; var nclip = ${o.nclips}.0;
  var fr = floor(p.s * FR); fr = min(fr, FR - 1.0); row = f32(p.clip) * FR + fr;
  let yoff = f32(p.team) * TEAMH + row * CH;
  let u0 = (fmod1(v0, VIEWS) * CW + cx * 0.5 * CW + CW * 0.5) / ATW; let u1 = (fmod1(v1, VIEWS) * CW + cx * 0.5 * CW + CW * 0.5) / ATW; let vv = (yoff + (1.0 - cy) * (CH - 1.0) + 0.5) / ATH;
  // x in cell: map cx in [-1,1] to [0,CW]
  o.uv0 = vec2f(u0, vv); o.uv1 = vec2f(u1, vv); o.wv = vec4f(wv, dab, f32(p.team), cy);
  o.dab = vec4f(dab, f32(p.team), p.vari, hsh(si * 7u + 3u)); return o;
}
fn fmod1(a: f32, m: f32) -> f32 { return a - floor(a / m) * m; }
fn ign(p: vec2f) -> f32 { return fract(52.9829189 * fract(dot(p, vec2f(0.06711056, 0.00583715)))); }
@fragment fn fs(in: IOut) -> @location(0) vec4f {
  var col: vec3f; var a = 1.0;
  let lightK = 0.35 + 0.95 * max(F.sun.y, 0.0) * 1.2;
  if (in.dab.x > 0.0) { let pc = palC(u32(in.dab.y), select(1u, 0u, in.q.y > 0.45)); col = pc.rgb * tint(select(1u, 0u, in.q.y > 0.45), in.dab.z, 0.0); a = in.dab.x; if (fract(ign(in.pos.xy) + in.dab.w) > a) { discard; } col = col * lightK * 0.6; }
  else { let c0 = textureSampleLevel(atlas, clampS, in.uv0, 0.0); let c1 = textureSampleLevel(atlas, clampS, in.uv1, 0.0); let c = mix(c0, c1, in.wv.x); if (c.a < 0.5) { discard; } col = pow(c.rgb, vec3f(2.2)) * lightK * 0.6 * (0.85 + 0.3 * in.dab.z); }
  return vec4f(fogged(col, in.wp), 1.0);
}`;

export const partWGSL = (K) => common(K) + /* wgsl */`
@group(1) @binding(0) var<storage, read> evs: array<vec4f>;
@group(1) @binding(1) var depthT: texture_depth_2d;
struct POut { @builtin(position) pos: vec4f, @location(0) uv: vec2f, @location(1) @interpolate(flat) col: vec4f, @location(2) @interpolate(flat) info: vec4f }
@vertex fn vs(@builtin(vertex_index) vi: u32, @builtin(instance_index) inst: u32) -> POut {
  var o: POut; o.pos = vec4f(2.0, 2.0, 2.0, 1.0);
  let e = inst / 64u; let p = inst % 64u; let a = evs[e * 2u]; let b = evs[e * 2u + 1u];
  let age = F.cam.w - a.w; let ty = u32(b.x); let seed = b.y; let dir = vec2f(b.z, b.w);
  let r0 = hsh(e * 7919u + p * 104729u + 13u); let r1 = hsh(e * 7919u + p * 104729u + 29u); let r2 = hsh(e * 7919u + p * 104729u + 47u); let r3 = hsh(e * 7919u + p * 104729u + 71u);
  var pos = a.xyz; var size = 0.0; var alpha = 0.0; var col = vec3f(1.0); var emis = vec3f(0.0); var spin = 0.0; var rot = 0.0;
  let wind = vec3f(1.3, 0.0, 0.5);
  if (ty == 0u) {
    if (p >= 8u) { return o; }
    let life = 8.0; if (age > life) { return o; } let k = 1.6; let d = (1.0 - exp(-k * age)) / k; let v0 = 2.0 + 5.0 * r0;
    pos += vec3f(dir.x, 0.0, dir.y) * v0 * d + vec3f((r1 - 0.5) * 1.6, 0.15 + 0.5 * r2, (r3 - 0.5) * 1.6) * d + wind * age * (0.25 + 0.5 * r1) + vec3f(0.0, 0.12 * age, 0.0);
    size = 0.35 + (0.9 + 1.6 * r2) * (1.0 - exp(-age * 0.55)); alpha = 0.2 * pow(1.0 - age / life, 1.8) * smoothstep(0.0, 0.08, age); col = vec3f(0.8, 0.78, 0.75);
  } else if (ty == 1u) {
    if (p < 6u) { let life = 0.14; if (age > life) { return o; } let ph = f32(p); pos += vec3f(dir.x, 0.0, dir.y) * (0.3 + ph * 0.55 * (0.4 + r0)) + vec3f((r1 - 0.5), (r2 - 0.5), (r3 - 0.5)) * 0.8 * ph * 0.3;
      size = select(1.2 + r0, 3.2 * (1.0 - age / life * 0.5), p == 0u); alpha = 0.0; emis = vec3f(30.0, 14.0, 3.5) * (1.0 - age / life) * select(0.5, 1.0, p == 0u); }
    else { let q = p - 6u; if (q >= 40u) { return o; } let life = 16.0; if (age > life) { return o; }
      let k = 0.45 + 0.3 * r1; let d = (1.0 - exp(-k * age)) / k; let v0 = 14.0 * (0.25 + 0.75 * r0);
      pos += vec3f(dir.x, 0.0, dir.y) * v0 * d * (0.5 + 0.5 * r2) + vec3f((r3 - 0.5) * 6.0, 1.0 + 3.0 * r2, (r1 - 0.5) * 6.0) * d * 0.5 + wind * age * (0.4 + 0.6 * r3) + vec3f(0.0, 0.5 * age * (0.3 + r0), 0.0);
      size = 1.0 + (1.2 + 3.2 * r2) * (1.0 - exp(-age * 0.35)); alpha = 0.34 * smoothstep(0.0, 0.2, age) * pow(1.0 - age / life, 1.3); col = mix(vec3f(0.9, 0.88, 0.85), vec3f(0.6), 1.0 - exp(-age * 0.15)); }
  } else {
    if (p < 30u) { let life = 3.8; if (age > life) { return o; } let ang = r0 * 6.2832; let sp = 3.0 + 7.0 * r1; let v = vec3f(cos(ang) * sp, 12.0 + 20.0 * r2, sin(ang) * sp); let k = 0.35; let d = (1.0 - exp(-k * age)) / k;
      pos += vec3f(v.x * d, v.y * d - 4.9 * age * age, v.z * d); size = 1.0 + 4.5 * r3 * (1.0 - exp(-age * 1.2)) + 0.8; alpha = 0.8 * pow(1.0 - age / life, 1.2) * smoothstep(0.0, 0.05, age); col = vec3f(0.30, 0.22, 0.14) * (0.7 + 0.5 * r3); pos.y = max(pos.y, a.y + 0.2); }
    else if (p < 54u) { let life = 14.0; if (age > life) { return o; } let ang = r0 * 6.2832; let sp = 1.5 + 5.0 * r1; let k = 0.3; let d = (1.0 - exp(-k * age)) / k;
      pos += vec3f(cos(ang) * sp * d, (2.0 + 6.0 * r2) * d, sin(ang) * sp * d) + wind * age * 0.5 + vec3f(0.0, 0.4 * age, 0.0); size = 2.0 + (4.0 + 9.0 * r3) * (1.0 - exp(-age * 0.3)); alpha = 0.3 * smoothstep(0.0, 0.3, age) * pow(1.0 - age / life, 1.2); col = mix(vec3f(0.42, 0.34, 0.26), vec3f(0.55, 0.52, 0.5), 1.0 - exp(-age * 0.2)); }
    else { let life = 3.2; if (age > life) { return o; } let ang = r0 * 6.2832; let sp = 5.0 + 14.0 * r1; let v = vec3f(cos(ang) * sp, 12.0 + 24.0 * r2, sin(ang) * sp);
      pos += vec3f(v.x * age, v.y * age - 4.9 * age * age, v.z * age); if (pos.y < a.y + 0.05) { pos.y = a.y + 0.05; } size = 0.12 + 0.25 * r3; alpha = 1.0; col = vec3f(0.08, 0.06, 0.04); spin = (r2 - 0.5) * 20.0; }
  }
  let cx = f32(vi & 1u) * 2.0 - 1.0; let cy = f32((vi >> 1u) & 1u) * 2.0 - 1.0; var cc = vec2f(cx, cy); let ra = spin * age; if (spin != 0.0) { cc = vec2f(cx * cos(ra) - cy * sin(ra), cx * sin(ra) + cy * cos(ra)); }
  let wp = pos + F.right.xyz * cc.x * size + F.up.xyz * cc.y * size;
  o.pos = F.vp * vec4f(wp, 1.0); o.uv = vec2f(cx, cy); o.col = vec4f(col, alpha); o.info = vec4f(size, r0 * 100.0, emis.x + emis.y * 0.0, f32(ty) + (r2 * 0.0)); if (emis.x > 0.0) { o.col = vec4f(emis, -1.0); }
  return o;
}
fn vn(p: vec2f) -> f32 { let i = floor(p); let f = fract(p); let u = f * f * (3.0 - 2.0 * f); let ii = vec2u(vec2i(i) + vec2i(4096));
  let a = hsh((ii.x * 73856093u) ^ (ii.y * 19349663u)); let b = hsh(((ii.x + 1u) * 73856093u) ^ (ii.y * 19349663u)); let c = hsh((ii.x * 73856093u) ^ ((ii.y + 1u) * 19349663u)); let d = hsh(((ii.x + 1u) * 73856093u) ^ ((ii.y + 1u) * 19349663u)); return mix(mix(a, b, u.x), mix(c, d, u.x), u.y); }
@fragment fn fs(in: POut) -> @location(0) vec4f {
  let r2 = dot(in.uv, in.uv); if (r2 > 1.0) { discard; }
  if (in.col.a < 0.0) { let f = 1.0 - r2; return vec4f(in.col.rgb * f * f, 0.0); }
  let n = vn(in.uv * 2.5 + in.info.y) * 0.6 + vn(in.uv * 6.0 + in.info.y * 1.7) * 0.4;
  var shape = smoothstep(1.0, 0.15, r2 + (n - 0.5) * 0.7); if (in.info.w > 1.5 && in.info.x < 0.5) { shape = 1.0; }
  let zf = 1.0 / in.pos.w; let sd = linDepth(textureLoad(depthT, vec2i(in.pos.xy), 0)); let soft = clamp((sd - zf) / max(in.info.x * 0.7, 0.3), 0.0, 1.0);
  let nrm = normalize(vec3f(in.uv, sqrt(max(1.0 - r2, 0.0)))); let sunV = vec3f(dot(F.sun.xyz, F.right.xyz), dot(F.sun.xyz, F.up.xyz), dot(F.sun.xyz, -F.fwd.xyz));
  let l = 0.35 + 0.75 * max(dot(nrm, sunV) * 0.5 + 0.5, 0.0); let c = in.col.rgb * (vec3f(0.30, 0.36, 0.45) * 0.6 + vec3f(1.0, 0.93, 0.82) * l * 1.6);
  let a = in.col.a * shape * soft * F.terr2.y; return vec4f(c * a, a);
}`;

export const postWGSL = (K) => common(K) + /* wgsl */`
@group(1) @binding(0) var hdr: texture_2d<f32>;
@group(1) @binding(1) var depthT: texture_depth_2d;
@group(1) @binding(2) var bloomT: texture_2d<f32>;
struct SOut { @builtin(position) pos: vec4f, @location(0) uv: vec2f }
@vertex fn vs(@builtin(vertex_index) i: u32) -> SOut { var p = array<vec2f, 3>(vec2f(-1.0, -1.0), vec2f(3.0, -1.0), vec2f(-1.0, 3.0)); var o: SOut; o.pos = vec4f(p[i], 0.0, 1.0); o.uv = vec2f(p[i].x * 0.5 + 0.5, 0.5 - p[i].y * 0.5); return o; }
// bloom: prefilter+downsample, blur
@fragment fn fs_pre(in: SOut) -> @location(0) vec4f {
  let ts = vec2f(textureDimensions(hdr)); var c = vec3f(0.0);
  for (var j = 0; j < 4; j++) { let o = vec2f(f32(j & 1) - 0.5, f32(j >> 1) - 0.5) * 2.0; c += textureSampleLevel(hdr, clampS, in.uv + o / ts, 0.0).rgb; }
  c = c * 0.25; let l = max(c.r, max(c.g, c.b)); let k = max(l - 1.6, 0.0) / max(l, 1e-3); return vec4f(c * k, 1.0);
}
fn blur1(uv: vec2f, dir: vec2f) -> vec4f {
  let ts = vec2f(textureDimensions(bloomT)); var w = array<f32, 5>(0.227, 0.194, 0.121, 0.054, 0.016); var c = textureSampleLevel(bloomT, clampS, uv, 0.0).rgb * w[0];
  for (var i = 1; i < 5; i++) { let o = dir * f32(i) * 1.6 / ts; c += textureSampleLevel(bloomT, clampS, uv + o, 0.0).rgb * w[i]; c += textureSampleLevel(bloomT, clampS, uv - o, 0.0).rgb * w[i]; }
  return vec4f(c, 1.0);
}
@fragment fn fs_blurH(in: SOut) -> @location(0) vec4f { return blur1(in.uv, vec2f(1.0, 0.0)); }
@fragment fn fs_blurV(in: SOut) -> @location(0) vec4f { return blur1(in.uv, vec2f(0.0, 1.0)); }
fn aces(x: vec3f) -> vec3f { let a = 2.51; let b = 0.03; let c = 2.43; let d = 0.59; let e = 0.14; return clamp((x * (a * x + b)) / (x * (c * x + d) + e), vec3f(0.0), vec3f(1.0)); }
@fragment fn fs(in: SOut) -> @location(0) vec4f {
  let px = vec2i(in.pos.xy); let dims = vec2f(F.scr.x, F.scr.y); let dr = textureLoad(depthT, px, 0); let lin = linDepth(dr);
  var col = vec3f(0.0);
  let useMB = F.misc2.z > 0.0; let useDOF = F.misc2.y > 0.0;
  var vel = vec2f(0.0);
  if (useMB) { let ndc = vec4f(in.uv.x * 2.0 - 1.0, 1.0 - in.uv.y * 2.0, dr, 1.0); let w = F.invVp * ndc; let wp = w.xyz / w.w; let pc = F.prevVp * vec4f(wp, 1.0); let pn = pc.xy / pc.w; vel = (ndc.xy - pn) * vec2f(0.5, -0.5) * F.misc2.z; let vl = length(vel * dims); if (vl > 24.0) { vel = vel * 24.0 / vl; } }
  var coc = 0.0; if (useDOF) { let l2 = select(lin, 4000.0, dr >= 0.99999); coc = clamp(F.misc2.y * abs(l2 - F.misc2.x) / l2 * 0.5 * dims.y * 0.002, 0.0, 14.0); }
  var acc = vec3f(0.0); var wsum = 0.0;
  let nT = 8;
  for (var i = 0; i < nT; i++) {
    let t = (f32(i) + 0.5) / f32(nT) - 0.5; var o = vel * t;
    if (useDOF) { let ang = f32(i) * 2.39996; let r = sqrt((f32(i) + 0.5) / f32(nT)) * coc; o += vec2f(cos(ang), sin(ang)) * r / dims; }
    acc += textureSampleLevel(hdr, clampS, in.uv + o, 0.0).rgb; wsum += 1.0;
  }
  col = acc / wsum;
  col += textureSampleLevel(bloomT, clampS, in.uv, 0.0).rgb * 0.18;
  let v = in.uv - 0.5; col *= 1.0 - dot(v, v) * 0.55; col *= F.misc.z;
  var o = aces(col); o = pow(o, vec3f(1.0 / 2.2));
  let g = fract(52.9829189 * fract(dot(in.pos.xy, vec2f(0.06711056, 0.00583715)))) - 0.5; o += g * (1.0 / 255.0);
  return vec4f(o, 1.0);
}`;

// --- mid LOD with baked bone matrices (3 RGBA32F texels per bone, 2 influences per vertex, 2 frames blended) instead of a per-vertex VAT
export const midBoneWGSL = (K) => common(K) + /* wgsl */`
@group(1) @binding(0) var<storage, read> list: array<u32>;
@group(1) @binding(1) var boneT: texture_2d<f32>;
@vertex fn vs(@location(0) pos: vec3f, @location(1) nrm: vec3f, @location(2) mat: f32, @location(3) jw: vec4f, @builtin(instance_index) inst: u32) -> VOut {
  let si = list[inst]; let p = place(si, F.cam.w); let rw = vatRows(p.klass, p.clip, p.s); let ra = u32(rw.x); let rb = u32(rw.y);
  var sp = vec3f(0.0); var sn = vec3f(0.0);
  for (var k = 0u; k < 2u; k++) { var j = u32(jw.x); var w = jw.z; if (k == 1u) { j = u32(jw.y); w = jw.w; } if (w == 0.0) { continue; }
    let c = j * 3u; let a0 = textureLoad(boneT, vec2u(c, ra), 0); let a1 = textureLoad(boneT, vec2u(c + 1u, ra), 0); let a2 = textureLoad(boneT, vec2u(c + 2u, ra), 0);
    let b0 = textureLoad(boneT, vec2u(c, rb), 0); let b1 = textureLoad(boneT, vec2u(c + 1u, rb), 0); let b2 = textureLoad(boneT, vec2u(c + 2u, rb), 0);
    let r0 = mix(a0, b0, rw.z); let r1 = mix(a1, b1, rw.z); let r2 = mix(a2, b2, rw.z);
    sp += w * vec3f(dot(r0.xyz, pos) + r0.w, dot(r1.xyz, pos) + r1.w, dot(r2.xyz, pos) + r2.w); sn += w * vec3f(dot(r0.xyz, nrm), dot(r1.xyz, nrm), dot(r2.xyz, nrm)); }
  let wp = p.pos + rotY(p.head, sp * bodyScale(p.vari)); var o: VOut; o.wp = wp; o.n = rotY(p.head, normalize(sn)); o.pos = F.vp * vec4f(wp, 1.0); o.mt = vec4f(mat, f32(p.team), p.vari, f32(p.klass)); return o;
}
@fragment fn fs(in: VOut) -> @location(0) vec4f {
  let mt = u32(in.mt.x + 0.5); let team = u32(in.mt.y); let pc = palC(team, mt); let alb = pc.rgb * tint(mt, in.mt.z, 0.0); let N = normalize(in.n); let sh = shadowAt(in.wp);
  return vec4f(fogged(lit(alb, pc.a, palM(team, mt), N, in.wp, sh, 0.8), in.wp), 1.0);
}
@fragment fn fs_null(in: VOut) {}`;
