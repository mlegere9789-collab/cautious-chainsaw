// Shader sources of the effect layer. NOT COMPILED OR RUN in this round (no browser, no GPU: Release 1 acceptance is timing the machine). The CPU functions in core.mjs, wind.mjs, pack.mjs
// are the reference; every formula below is a port, and docs/BROWSER-VERIFICATION-LIST-FX3D.md lists the readback comparison that must pass before anything is claimed about the look.
//
// Two paths, one particle definition:
//  * WebGL2 (the fallback, no transform feedback, no compute): one instanced draw of 4-vertex strips, instance s = sprite number (+ uFirst). The vertex shader finds the event of sprite s by binary
//    search over the cumulative sprite counts (texture uCum), reads the event from a float texture (24 floats = 6 texels) and evaluates the sprite in closed form from (event, sprite index, age).
//    No per-particle state exists on the CPU or the GPU, so any time can be drawn (scrub, seek, replay).
//  * WebGPU: the same vertex/fragment logic from storage buffers, plus an optional compute pass (WGSL_COMPUTE) that does the camera cull, the distance LOD, the budget scale, the hard cap and the
//    prefix sum on the GPU and writes the two indirect draws. With the compute pass the CPU packs every live event unculled (index.update(t, cam, {gpuCull:true}) is the hook; see FX3D-NOTES).
import { SPRITE_K } from './core.mjs';
import { WIND_HIST_N, WIND_AGE0, WIND_AGE_R } from './wind.mjs';
import { GSTRIDE } from './pack.mjs';

export const SHADER_CONSTS = { SPRITE_K, WIND_N: WIND_HIST_N, WIND_AGE0, WIND_AGE_R, GSTRIDE, CUM_W: 4096, KIND: { SMOKE: 0, DUST: 1, FLASH: 2, FLAME: 3, SPARK: 4 }, TYPES: { MUSKET: 1, GUN: 2, RING: 3, FOG: 4, CASE: 5, SHELL: 6, CANISTER: 7, EARTH: 8, RICOCHET: 9, DUST: 10, FLASH: 11, FUSE: 12, PLUME: 13, EMBER: 14, FLAME: 20 } };
const C = SHADER_CONSTS;

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------- GLSL ES 3.00
export const GLSL_VERT = `#version 300 es
precision highp float; precision highp int; precision highp sampler2D;
uniform sampler2D uEv;      // RGBA32F, 6 texels x nEvents rows: floats 4k..4k+3 of event e at texel (k, e)
uniform sampler2D uCum;     // R32F, ${C.CUM_W} wide: cumulative sprite counts, cum[k] = sprites of events 0..k-1
uniform sampler2D uWind;    // RG32F, ${C.WIND_N} x 1: wind travel (dx, dz) over the last windAge(k) seconds (wind.mjs history)
uniform int uNEv; uniform int uFirst;
uniform float uNow;         // seconds since tBase
uniform mat4 uVP; uniform vec3 uCam; uniform vec3 uRight; uniform vec3 uUp; uniform vec3 uSun;     // uSun = direction TO the light
uniform vec4 uLight;        // x ambient, y direct, z albedo, w Henyey-Greenstein g
uniform vec2 uKappa;        // extinction m2/kg: smoke, dust
uniform vec4 uExtra;        // x exposure floor (night is never black), y soft-particle scale, z/w near/far
out vec2 vUV; out vec4 vCol; out float vOD; out float vKind; out float vViewZ; out float vRs; out float vSeed;
const float SPRITE_K = ${C.SPRITE_K.toFixed(4)};
uint fmix(uint h){ h ^= h >> 16u; h *= 0x85ebca6bu; h ^= h >> 13u; h *= 0xc2b2ae35u; h ^= h >> 16u; return h; }
uint hash4(uint a, uint b, uint c, uint d){ uint h = fmix(a ^ 0x9e3779b9u); h = fmix((h ^ b) + 0x7f4a7c15u); h = fmix((h ^ c) + 0x94d049bbu); h = fmix((h ^ d) + 0xbf58476du); return h; }
float u01(uint s, uint a, uint b, uint st){ return float(hash4(s, a, b, st)) * 2.3283064365386963e-10; }
float g3(uint s, uint i, uint k){ return ((u01(s, i, k, 1u) + u01(s, i, k, 2u) + u01(s, i, k, 3u)) - 1.5) * 2.0; }
float cumAt(int m){ return texelFetch(uCum, ivec2(m & ${C.CUM_W - 1}, m >> 12), 0).r; }
vec2 windDisp(float age){
  if (age <= 0.0) return vec2(0.0);
  float f = age <= ${C.WIND_AGE0.toFixed(2)} ? age / ${C.WIND_AGE0.toFixed(2)} : 1.0 + log(age / ${C.WIND_AGE0.toFixed(2)}) / log(${C.WIND_AGE_R.toFixed(2)});
  f = min(f, ${(C.WIND_N - 1.0001).toFixed(4)}); int k = int(floor(f)); float s = f - float(k);
  return mix(texelFetch(uWind, ivec2(k, 0), 0).rg, texelFetch(uWind, ivec2(k + 1, 0), 0).rg, s);
}
float hgPhase(float c, float g){ return (1.0 - g * g) / (4.0 * pow(1.0 + g * g - 2.0 * g * c, 1.5)) + 0.75; }   // = HG * pi + 0.75, env.mjs smokeRadiance
void main(){
  int s = gl_InstanceID + uFirst;
  int lo = 0, hi = uNEv - 1;
  for (int it = 0; it < 15; it++){ if (lo >= hi) break; int m = (lo + hi + 1) >> 1; if (cumAt(m) <= float(s)) lo = m; else hi = m - 1; }
  int e = lo; int i = s - int(cumAt(e));
  vec4 a0 = texelFetch(uEv, ivec2(0, e), 0), a1 = texelFetch(uEv, ivec2(1, e), 0), a2 = texelFetch(uEv, ivec2(2, e), 0), a3 = texelFetch(uEv, ivec2(3, e), 0), a4 = texelFetch(uEv, ivec2(4, e), 0), a5 = texelFetch(uEv, ivec2(5, e), 0);
  int ty = int(a1.x + 0.5); uint seed = uint(a1.y + 0.5); float mass0 = a1.z, sig0 = a1.w;
  float tauD = a2.w, vb0 = a3.x, tauB = a3.y, tauDis = a3.z, K = a3.w, beta = a4.x, vr = a4.y, settle = a4.z, gnd = a4.w;
  float n = max(a5.x, 1.0), A1 = a5.y, A2 = a5.z; bool uncertain = a5.w > 0.5;
  float age = uNow - a0.w;
  vec2 q = vec2(float(gl_VertexID & 1), float(gl_VertexID >> 1)) * 2.0 - 1.0; vUV = q; vSeed = float(seed & 0xffffu);
  vec3 c = a0.xyz; vec3 right = uRight, up = uUp; float size = 0.0; vKind = 0.0; vOD = 0.0; vCol = vec4(0.0); vRs = 1.0;
  uint ui = uint(i);
  float jit = u01(seed, ui, 3u, 4u), ph = u01(seed, ui, 4u, 4u);
  if (age < 0.0) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }                               // nothing exists before its cause
  bool smokeLike = (ty >= 1 && ty <= 10 && ty != 3) || ty == 13;
  if (ty == 8 || ty == 9) { if (i % 3 == 0) smokeLike = false; }                                    // every third sprite of an impact is a clod
  if (smokeLike){
    float f = 1.0 - exp(-age / tauD), fb = 1.0 - exp(-age / tauB);
    vec2 w = windDisp(age);
    vec3 cc = a0.xyz + vec3(w.x, 0.0, w.y) + a2.xyz * tauD * f + vec3(0.0, vb0 * tauB * fb - settle * age, 0.0);
    float sh = sqrt(sig0 * sig0 + 2.0 * K * age + beta * age * age * age), sv = sqrt(sig0 * sig0 + vr * (2.0 * K * age + beta * age * age * age));
    float mass = mass0 * exp(-age / tauDis);
    vec3 off = vec3(g3(seed & 0xffffffu, ui, 0u) * sh, g3(seed & 0xffffffu, ui, 1u) * sv, g3(seed & 0xffffffu, ui, 2u) * sh) * 0.8;
    cc.y = max(cc.y, gnd + 0.0);
    c = cc + off; c.y = max(c.y, gnd + 0.05);
    float rs = SPRITE_K * sh * (0.6 + 0.8 * jit); size = rs; vRs = rs;
    float kap = (ty == 10 || ty == 8 || ty == 9 || ty == 7) ? uKappa.y : uKappa.x;
    float od = kap * (mass / n) / (3.14159265 * (SPRITE_K * sh) * (SPRITE_K * sh));                // opacity per sprite: the sum over sprites is independent of n
    vOD = 3.0 * od; vKind = (ty == 10 || ty == 8 || ty == 9 || ty == 7) ? 1.0 : 0.0;
    vec3 v = normalize(uCam - c); float cosT = dot(-uSun, v);
    float shadow = exp(-0.5 * min(od * n, 8.0));
    vec3 lit = vec3(uLight.z * (uLight.x + uLight.y * hgPhase(cosT, uLight.w) * shadow));
    lit = max(lit, vec3(uLight.z * uExtra.x));                                                     // luminance floor: never black (gate Q10)
    vec3 tint = vKind > 0.5 ? vec3(0.78, 0.70, 0.58) : (ty == 13 ? vec3(0.42, 0.40, 0.40) : vec3(1.0));
    vCol = vec4(lit * tint, 1.0);
  } else if (ty == 3){                                                                              // muzzle blast ring: sprites on a circle normal to the barrel
    vec3 ax = normalize(a2.xyz + vec3(1e-6)); vec3 t1 = normalize(cross(ax, vec3(0.0, 1.0, 0.0)) + vec3(1e-5)); vec3 t2 = cross(ax, t1);
    float R = A1 * A2 * (1.0 - exp(-age / A2)); float th = 6.2831853 * (float(i) + ph) / n;
    float f = 1.0 - exp(-age / tauD); vec2 w = windDisp(age);
    c = a0.xyz + vec3(w.x, 0.0, w.y) + a2.xyz * tauD * f + (t1 * cos(th) + t2 * sin(th)) * R;
    float sh = sqrt(sig0 * sig0 + 2.0 * K * age + beta * age * age * age); float rs = max(0.6, SPRITE_K * sh + 0.15 * R); size = rs; vRs = rs;
    float mass = mass0 * exp(-age / tauDis); float od = uKappa.x * (mass / n) / (3.14159265 * rs * rs);
    vOD = 3.0 * od; vec3 v = normalize(uCam - c);
    vec3 lit = max(vec3(uLight.z * (uLight.x + uLight.y * hgPhase(dot(-uSun, v), uLight.w))), vec3(uLight.z * uExtra.x)); vCol = vec4(lit, 1.0);
  } else if (ty == 8 || ty == 9){                                                                   // clods: ballistic, gravity 9.80665
    float th = 6.2831853 * u01(seed, ui, 5u, 4u), sp = A1 * (0.4 + 0.6 * u01(seed, ui, 6u, 4u)), el = 0.9 + 0.5 * u01(seed, ui, 7u, 4u);
    vec3 v0 = vec3(cos(th) * sp * 0.5, sp * el, sin(th) * sp * 0.5); float tt = min(age, 2.0 * v0.y / 9.80665);
    c = a0.xyz + v0 * tt - vec3(0.0, 4.903325 * tt * tt, 0.0); c.y = max(c.y, gnd + 0.05);
    size = 0.12 + 0.25 * jit; vRs = size; vOD = 6.0; vKind = 5.0; vCol = vec4(vec3(0.20, 0.15, 0.10) * (uLight.x + 0.5 * uLight.y) + vec3(uExtra.x * 0.1), 1.0);
    if (age > 2.0 * v0.y / 9.80665 + 4.0) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
  } else if (ty == 11){                                                                             // muzzle or burst flash: a tapered jet along the barrel, additive HDR
    float dur = max(A2, 0.004), env = (age < dur ? 1.0 : exp(-(age - dur) / 0.018)) * clamp(age / (0.3 * dur + 1e-4), 0.0, 1.0);
    if (env < 0.01) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
    vec3 ax = normalize(a2.xyz + vec3(1e-6)); float Lj = A1 * (0.4 + 0.6 * clamp(age / (0.3 * dur + 1e-4), 0.0, 1.0));
    vec3 toC = c - uCam; vec3 perp = normalize(cross(ax, toC) + vec3(1e-6)); float x01 = q.x * 0.5 + 0.5;
    c = c + ax * x01 * Lj + perp * q.y * 0.3 * Lj * (1.0 - 0.7 * x01); size = 0.0; vRs = Lj; vKind = 2.0; vOD = 0.0;
    vCol = vec4(mix(vec3(1.0, 0.85, 0.55), vec3(1.0, 0.45, 0.12), x01) * mass0 * env * 0.1, 1.0); gl_Position = uVP * vec4(c, 1.0); vViewZ = dot(c - uCam, cross(uUp, uRight)); return;
  } else if (ty == 12){                                                                             // fuze trail: sparks along the flight, orange, short-lived
    float dt = max(A2, 0.01); float tj = min(float(i) * dt, A1); float since = age - tj; float v0 = length(a2.xyz);
    if (since < 0.0 || tj > A1 || since > 0.5) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
    vec2 w = windDisp(since); c = a0.xyz + a2.xyz * tj - vec3(0.0, 4.903325 * tj * tj, 0.0) + vec3(w.x, 0.0, w.y) + vec3(g3(seed, ui, 0u), g3(seed, ui, 1u), g3(seed, ui, 2u)) * 0.05;
    size = 0.06; vRs = size; vKind = 4.0; vOD = 0.0; vCol = vec4(vec3(1.0, 0.55, 0.15) * 3.0 * (1.0 - since / 0.5), 1.0);
  } else if (ty == ${C.TYPES.FLAME}){                                                               // fire: flame tongues rising from a footprint, flicker from hashes of time
    float lvl = mass0, rad = sig0, hgt = A1; float th = 6.2831853 * u01(seed, ui, 1u, 8u), rr = rad * sqrt(u01(seed, ui, 2u, 8u));
    float ft = floor(uNow * 8.0); float fl = 0.6 + 0.4 * u01(seed, ui + uint(ft) * 131u, 3u, 8u);
    float hh = hgt * lvl * fl * (0.4 + 0.6 * u01(seed, ui, 4u, 8u));
    c = a0.xyz + vec3(cos(th) * rr, 0.0, sin(th) * rr) + vec3(0.0, hh * 0.5, 0.0); size = max(0.4, hh * 0.35); vRs = size; vKind = 3.0; vOD = 0.0;
    vCol = vec4(mix(vec3(1.0, 0.85, 0.4), vec3(1.0, 0.35, 0.08), u01(seed, ui, 5u, 8u)) * (1.5 + 2.5 * lvl) * fl, 1.0);
  } else { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
  vec3 p = c + right * q.x * size + up * q.y * size;
  vViewZ = dot(c - uCam, cross(uUp, uRight));
  gl_Position = uVP * vec4(p, 1.0);
}`;

export const GLSL_FRAG = `#version 300 es
precision highp float; precision highp int; precision highp sampler2D;
uniform sampler2D uDepth;   // linear view depth of the opaque scene (metres), same size as the target
uniform vec4 uExtra;        // x exposure floor, y soft-particle scale (1 = fade over the sprite radius), z/w unused
in vec2 vUV; in vec4 vCol; in float vOD; in float vKind; in float vViewZ; in float vRs; in float vSeed;
layout(location = 0) out vec4 outColor;
float hsh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7)) + vSeed) * 43758.5453); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(hsh(i), hsh(i + vec2(1.0, 0.0)), f.x), mix(hsh(i + vec2(0.0, 1.0)), hsh(i + vec2(1.0, 1.0)), f.x), f.y); }
void main(){
  float r2 = dot(vUV, vUV);
  if (vKind < 1.5){                                                                                  // smoke and dust: premultiplied alpha, optical depth profile (1 - r^2)^2
    if (r2 > 1.0) discard;
    float er = 0.7 + 0.6 * vnoise(vUV * 3.0 + vSeed);                                                // noise erosion keeps the edge from reading as a disc
    float a = 1.0 - exp(-vOD * er * (1.0 - r2) * (1.0 - r2));
    float scene = texelFetch(uDepth, ivec2(gl_FragCoord.xy), 0).r; float soft = clamp((scene - vViewZ) / (vRs * uExtra.y + 1e-3), 0.0, 1.0);
    a *= soft; outColor = vec4(vCol.rgb * a, a);
  } else if (vKind < 2.5){                                                                           // flash jet: additive, hot core to orange tip
    float cx = abs(vUV.y); float prof = exp(-4.0 * cx * cx) * (1.0 - 0.5 * max(vUV.x, 0.0)); outColor = vec4(vCol.rgb * prof, 0.0);
  } else if (vKind < 3.5){                                                                           // flame tongue
    if (r2 > 1.0) discard; float prof = (1.0 - r2) * (1.0 - r2) * (0.6 + 0.4 * vnoise(vUV * 4.0 + vSeed)); outColor = vec4(vCol.rgb * prof, 0.0);
  } else {                                                                                           // spark or clod
    if (r2 > 1.0) discard; float prof = 1.0 - r2; outColor = vKind > 4.5 ? vec4(vCol.rgb, 1.0) : vec4(vCol.rgb * prof, 0.0);
  }
}`;

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------- WGSL
const WGSL_COMMON = `
const SPRITE_K: f32 = ${C.SPRITE_K.toFixed(4)};
const GSTRIDE: u32 = ${C.GSTRIDE}u;
fn fmix(h0: u32) -> u32 { var h = h0; h = h ^ (h >> 16u); h = h * 0x85ebca6bu; h = h ^ (h >> 13u); h = h * 0xc2b2ae35u; h = h ^ (h >> 16u); return h; }
fn hash4(a: u32, b: u32, c: u32, d: u32) -> u32 { var h = fmix(a ^ 0x9e3779b9u); h = fmix((h ^ b) + 0x7f4a7c15u); h = fmix((h ^ c) + 0x94d049bbu); h = fmix((h ^ d) + 0xbf58476du); return h; }
fn u01(s: u32, a: u32, b: u32, st: u32) -> f32 { return f32(hash4(s, a, b, st)) * 2.3283064365386963e-10; }
fn g3(s: u32, i: u32, k: u32) -> f32 { return ((u01(s, i, k, 1u) + u01(s, i, k, 2u) + u01(s, i, k, 3u)) - 1.5) * 2.0; }
`;
export const WGSL_RENDER = `
${WGSL_COMMON}
struct U { vp: mat4x4<f32>, cam: vec4<f32>, right: vec4<f32>, up: vec4<f32>, sun: vec4<f32>, light: vec4<f32>, kappa: vec4<f32>, extra: vec4<f32>, now_first_nev: vec4<f32>, };
@group(0) @binding(0) var<uniform> u: U;
@group(0) @binding(1) var<storage, read> ev: array<f32>;
@group(0) @binding(2) var<storage, read> cum: array<u32>;
@group(0) @binding(3) var<storage, read> wind: array<vec2<f32>>;
@group(0) @binding(4) var sceneDepth: texture_2d<f32>;
struct VOut { @builtin(position) pos: vec4<f32>, @location(0) uv: vec2<f32>, @location(1) col: vec4<f32>, @location(2) od: f32, @location(3) kind: f32, @location(4) viewz: f32, @location(5) rs: f32, @location(6) seed: f32, };
fn windDisp(age: f32) -> vec2<f32> {
  if (age <= 0.0) { return vec2<f32>(0.0); }
  var f = select(1.0 + log(age / ${C.WIND_AGE0.toFixed(2)}) / log(${C.WIND_AGE_R.toFixed(2)}), age / ${C.WIND_AGE0.toFixed(2)}, age <= ${C.WIND_AGE0.toFixed(2)});
  f = min(f, ${(C.WIND_N - 1.0001).toFixed(4)}); let k = u32(floor(f)); let s = f - floor(f);
  return mix(wind[k], wind[k + 1u], s);
}
fn hgPhase(c: f32, g: f32) -> f32 { return (1.0 - g * g) / (4.0 * pow(1.0 + g * g - 2.0 * g * c, 1.5)) + 0.75; }
fn F(e: u32, k: u32) -> f32 { return ev[e * GSTRIDE + k]; }
@vertex fn vs(@builtin(vertex_index) vi: u32, @builtin(instance_index) ii: u32) -> VOut {
  var o: VOut; o.pos = vec4<f32>(2.0, 2.0, 2.0, 1.0); o.uv = vec2<f32>(0.0); o.col = vec4<f32>(0.0); o.od = 0.0; o.kind = 0.0; o.viewz = 0.0; o.rs = 1.0; o.seed = 0.0;
  let nev = u32(u.now_first_nev.z); let s = ii;
  var lo: u32 = 0u; var hi: u32 = nev - 1u;
  for (var it: u32 = 0u; it < 15u; it = it + 1u) { if (lo >= hi) { break; } let m = (lo + hi + 1u) >> 1u; if (cum[m] <= s) { lo = m; } else { hi = m - 1u; } }
  let e = lo; let i = s - cum[e];
  let ty = i32(F(e, 4u) + 0.5); let seed = u32(F(e, 5u) + 0.5); let mass0 = F(e, 6u); let sig0 = F(e, 7u);
  let v0 = vec3<f32>(F(e, 8u), F(e, 9u), F(e, 10u)); let tauD = F(e, 11u); let vb0 = F(e, 12u); let tauB = F(e, 13u); let tauDis = F(e, 14u); let K = F(e, 15u); let beta = F(e, 16u); let vr = F(e, 17u); let settle = F(e, 18u); let gnd = F(e, 19u);
  let n = max(F(e, 20u), 1.0); let A1 = F(e, 21u); let A2 = F(e, 22u);
  let age = u.now_first_nev.x - F(e, 3u);
  if (age < 0.0) { return o; }                                                                         // nothing exists before its cause
  let q = vec2<f32>(f32(vi & 1u), f32(vi >> 1u)) * 2.0 - 1.0; o.uv = q; o.seed = f32(seed & 0xffffu);
  var c = vec3<f32>(F(e, 0u), F(e, 1u), F(e, 2u)); var size = 0.0;
  let jit = u01(seed, i, 3u, 4u); let ph = u01(seed, i, 4u, 4u);
  var smokeLike = (ty >= 1 && ty <= 10 && ty != 3) || ty == 13;
  if ((ty == 8 || ty == 9) && (i % 3u) == 0u) { smokeLike = false; }
  let up = u.up.xyz; let right = u.right.xyz; let cam = u.cam.xyz; let sun = u.sun.xyz;
  if (smokeLike) {
    let f = 1.0 - exp(-age / tauD); let fb = 1.0 - exp(-age / tauB); let w = windDisp(age);
    var cc = c + vec3<f32>(w.x, 0.0, w.y) + v0 * tauD * f + vec3<f32>(0.0, vb0 * tauB * fb - settle * age, 0.0);
    let sh = sqrt(sig0 * sig0 + 2.0 * K * age + beta * age * age * age); let sv = sqrt(sig0 * sig0 + vr * (2.0 * K * age + beta * age * age * age));
    let mass = mass0 * exp(-age / tauDis); let s24 = seed & 0xffffffu;
    let off = vec3<f32>(g3(s24, i, 0u) * sh, g3(s24, i, 1u) * sv, g3(s24, i, 2u) * sh) * 0.8;
    c = cc + off; c.y = max(c.y, gnd + 0.05);
    let rs = SPRITE_K * sh * (0.6 + 0.8 * jit); size = rs; o.rs = rs;
    let dusty = (ty == 10 || ty == 8 || ty == 9 || ty == 7);
    let kap = select(u.kappa.x, u.kappa.y, dusty);
    let od = kap * (mass / n) / (3.14159265 * (SPRITE_K * sh) * (SPRITE_K * sh));
    o.od = 3.0 * od; o.kind = select(0.0, 1.0, dusty);
    let v = normalize(cam - c); let cosT = dot(-sun, v); let shadow = exp(-0.5 * min(od * n, 8.0));
    var lit = u.light.z * (u.light.x + u.light.y * hgPhase(cosT, u.light.w) * shadow);
    lit = max(lit, u.light.z * u.extra.x);
    var tint = vec3<f32>(1.0); if (dusty) { tint = vec3<f32>(0.78, 0.70, 0.58); } else if (ty == 13) { tint = vec3<f32>(0.42, 0.40, 0.40); }
    o.col = vec4<f32>(vec3<f32>(lit) * tint, 1.0);
  } else if (ty == 3) {
    let ax = normalize(v0 + vec3<f32>(1e-6)); let t1 = normalize(cross(ax, vec3<f32>(0.0, 1.0, 0.0)) + vec3<f32>(1e-5)); let t2 = cross(ax, t1);
    let R = A1 * A2 * (1.0 - exp(-age / A2)); let th = 6.2831853 * (f32(i) + ph) / n; let f = 1.0 - exp(-age / tauD); let w = windDisp(age);
    c = c + vec3<f32>(w.x, 0.0, w.y) + v0 * tauD * f + (t1 * cos(th) + t2 * sin(th)) * R;
    let sh = sqrt(sig0 * sig0 + 2.0 * K * age + beta * age * age * age); let rs = max(0.6, SPRITE_K * sh + 0.15 * R); size = rs; o.rs = rs;
    let mass = mass0 * exp(-age / tauDis); o.od = 3.0 * u.kappa.x * (mass / n) / (3.14159265 * rs * rs);
    let v = normalize(cam - c); let lit = max(u.light.z * (u.light.x + u.light.y * hgPhase(dot(-sun, v), u.light.w)), u.light.z * u.extra.x); o.col = vec4<f32>(vec3<f32>(lit), 1.0);
  } else if (ty == 8 || ty == 9) {
    let th = 6.2831853 * u01(seed, i, 5u, 4u); let sp = A1 * (0.4 + 0.6 * u01(seed, i, 6u, 4u)); let el = 0.9 + 0.5 * u01(seed, i, 7u, 4u);
    let vv = vec3<f32>(cos(th) * sp * 0.5, sp * el, sin(th) * sp * 0.5); let tl = 2.0 * vv.y / 9.80665; let tt = min(age, tl);
    if (age > tl + 4.0) { return o; }
    c = c + vv * tt - vec3<f32>(0.0, 4.903325 * tt * tt, 0.0); c.y = max(c.y, gnd + 0.05);
    size = 0.12 + 0.25 * jit; o.rs = size; o.od = 6.0; o.kind = 5.0; o.col = vec4<f32>(vec3<f32>(0.20, 0.15, 0.10) * (u.light.x + 0.5 * u.light.y) + vec3<f32>(u.extra.x * 0.1), 1.0);
  } else if (ty == 11) {
    let dur = max(A2, 0.004); let grow = clamp(age / (0.3 * dur + 1e-4), 0.0, 1.0); let env = select(exp(-(age - dur) / 0.018), 1.0, age < dur) * grow;
    if (env < 0.01) { return o; }
    let ax = normalize(v0 + vec3<f32>(1e-6)); let Lj = A1 * (0.4 + 0.6 * grow); let toC = c - cam; let perp = normalize(cross(ax, toC) + vec3<f32>(1e-6)); let x01 = q.x * 0.5 + 0.5;
    let p = c + ax * x01 * Lj + perp * q.y * 0.3 * Lj * (1.0 - 0.7 * x01);
    o.rs = Lj; o.kind = 2.0; o.col = vec4<f32>(mix(vec3<f32>(1.0, 0.85, 0.55), vec3<f32>(1.0, 0.45, 0.12), x01) * mass0 * env * 0.1, 1.0);
    o.viewz = dot(p - cam, cross(up, right)); o.pos = u.vp * vec4<f32>(p, 1.0); return o;
  } else if (ty == 12) {
    let dt = max(A2, 0.01); let tj = min(f32(i) * dt, A1); let since = age - tj;
    if (since < 0.0 || f32(i) * dt > A1 || since > 0.5) { return o; }
    let w = windDisp(since); c = c + v0 * tj - vec3<f32>(0.0, 4.903325 * tj * tj, 0.0) + vec3<f32>(w.x, 0.0, w.y) + vec3<f32>(g3(seed, i, 0u), g3(seed, i, 1u), g3(seed, i, 2u)) * 0.05;
    size = 0.06; o.rs = size; o.kind = 4.0; o.col = vec4<f32>(vec3<f32>(1.0, 0.55, 0.15) * 3.0 * (1.0 - since / 0.5), 1.0);
  } else if (ty == ${C.TYPES.FLAME}) {
    let lvl = mass0; let rad = sig0; let hgt = A1; let th = 6.2831853 * u01(seed, i, 1u, 8u); let rr = rad * sqrt(u01(seed, i, 2u, 8u));
    let ft = floor(u.now_first_nev.x * 8.0); let fl = 0.6 + 0.4 * u01(seed, i + u32(ft) * 131u, 3u, 8u); let hh = hgt * lvl * fl * (0.4 + 0.6 * u01(seed, i, 4u, 8u));
    c = c + vec3<f32>(cos(th) * rr, hh * 0.5, sin(th) * rr); size = max(0.4, hh * 0.35); o.rs = size; o.kind = 3.0;
    o.col = vec4<f32>(mix(vec3<f32>(1.0, 0.85, 0.4), vec3<f32>(1.0, 0.35, 0.08), u01(seed, i, 5u, 8u)) * (1.5 + 2.5 * lvl) * fl, 1.0);
  } else { return o; }
  let p = c + right * q.x * size + up * q.y * size;
  o.viewz = dot(c - cam, cross(up, right)); o.pos = u.vp * vec4<f32>(p, 1.0); return o;
}
fn hsh(p: vec2<f32>, seed: f32) -> f32 { return fract(sin(dot(p, vec2<f32>(127.1, 311.7)) + seed) * 43758.5453); }
fn vnoise(p: vec2<f32>, seed: f32) -> f32 { let i = floor(p); var f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(hsh(i, seed), hsh(i + vec2<f32>(1.0, 0.0), seed), f.x), mix(hsh(i + vec2<f32>(0.0, 1.0), seed), hsh(i + vec2<f32>(1.0, 1.0), seed), f.x), f.y); }
@fragment fn fs(fin: VOut) -> @location(0) vec4<f32> {
  let r2 = dot(fin.uv, fin.uv);
  if (fin.kind < 1.5) {
    if (r2 > 1.0) { discard; }
    let er = 0.7 + 0.6 * vnoise(fin.uv * 3.0 + vec2<f32>(fin.seed), fin.seed);
    var a = 1.0 - exp(-fin.od * er * (1.0 - r2) * (1.0 - r2));
    let scene = textureLoad(sceneDepth, vec2<i32>(fin.pos.xy), 0).r; let soft = clamp((scene - fin.viewz) / (fin.rs * u.extra.y + 1e-3), 0.0, 1.0);
    a = a * soft; return vec4<f32>(fin.col.rgb * a, a);
  } else if (fin.kind < 2.5) {
    let cx = abs(fin.uv.y); let prof = exp(-4.0 * cx * cx) * (1.0 - 0.5 * max(fin.uv.x, 0.0)); return vec4<f32>(fin.col.rgb * prof, 0.0);
  } else if (fin.kind < 3.5) {
    if (r2 > 1.0) { discard; }
    let prof = (1.0 - r2) * (1.0 - r2) * (0.6 + 0.4 * vnoise(fin.uv * 4.0 + vec2<f32>(fin.seed), fin.seed)); return vec4<f32>(fin.col.rgb * prof, 0.0);
  }
  if (r2 > 1.0) { discard; }
  let prof = 1.0 - r2; if (fin.kind > 4.5) { return vec4<f32>(fin.col.rgb, 1.0); } return vec4<f32>(fin.col.rgb * prof, 0.0);
}`;

// Optional WebGPU compute: per-event cull + LOD + class scale + hard cap, then the prefix sum (one workgroup of 1024 threads, 16 events per thread: up to 16384 events), then the two indirect draws.
// Events must be in the order the renderer wants drawn (smoke first, then additive); the CPU gives the boundary event index in uniform `split`. Stochastic rounding of the class scale uses the event seed, so the result is
// deterministic. Bindings: 0 params uniform, 1 events (read_write: field 20 is overwritten with the sprite count), 2 cum (write), 3 indirect (write, 2 x 4 u32).
export const WGSL_COMPUTE = `
${WGSL_COMMON}
struct Cam { pos: vec4<f32>, fwd: vec4<f32>, tanHW: vec4<f32>, bands: vec4<f32>, factors0: vec4<f32>, factors1: vec4<f32>, pxScale: f32, minPx: f32, cap: u32, nev: u32, split: u32, pad0: u32, pad1: u32, pad2: u32, classScale: array<vec4<f32>, 2>, nfull: array<vec4<f32>, 4>, };
@group(0) @binding(0) var<uniform> cam: Cam;
@group(0) @binding(1) var<storage, read_write> ev: array<f32>;
@group(0) @binding(2) var<storage, read_write> cum: array<u32>;
@group(0) @binding(3) var<storage, read_write> indirect: array<u32>;
var<workgroup> part: array<u32, 1024>;
fn bandFactor(d: f32) -> f32 { var f = cam.factors1.x; if (d < cam.bands.x) { f = cam.factors0.x; } else if (d < cam.bands.y) { f = cam.factors0.y; } else if (d < cam.bands.z) { f = cam.factors0.z; } else if (d < cam.bands.w) { f = cam.factors0.w; } return f; }
fn nFullOf(ty: u32) -> f32 { let k = min(ty, 15u); return cam.nfull[k >> 2u][k & 3u]; }
fn classOf(ty: u32) -> u32 { // 0 flash 1 burst 2 gun 3 fire 4 musket 5 dust 6 fog, matching params.budget.class_priority
  if (ty == 11u || ty == 12u) { return 0u; } if (ty == 5u || ty == 6u || ty == 7u || ty == 8u || ty == 9u) { return 1u; } if (ty == 2u || ty == 3u) { return 2u; } if (ty == 13u || ty == 14u || ty == 20u) { return 3u; }
  if (ty == 1u) { return 4u; } if (ty == 10u) { return 5u; } return 6u; }
@compute @workgroup_size(1024) fn cullCount(@builtin(local_invocation_id) lid: vec3<u32>) {
  var sum: u32 = 0u;
  for (var k: u32 = 0u; k < 16u; k = k + 1u) {
    let e = lid.x * 16u + k; var n: u32 = 0u;
    if (e < cam.nev) {
      let b = e * GSTRIDE; let ty = u32(ev[b + 4u] + 0.5); let p = vec3<f32>(ev[b], ev[b + 1u], ev[b + 2u]); let d = p - cam.pos.xyz; let dist = length(d);
      let z = dot(d, cam.fwd.xyz); let rad = max(ev[b + 7u] * 1.25, 1.0);
      var visible = z > -rad;
      if (visible) { let ang = acos(clamp(z / max(dist, 1e-3), -1.0, 1.0)); let lim = atan(length(vec2<f32>(cam.tanHW.x, cam.tanHW.y))) + atan2(rad, max(dist, 0.1)); visible = ang <= lim; }
      let px = rad / max(dist, 0.5) * cam.pxScale;
      if (visible && (px >= cam.minPx || ty == 4u || ty == 11u)) {
        let want = select(max(1.0, round(nFullOf(ty) * bandFactor(dist))), 1.0, ty == 11u); let sc = cam.classScale[classOf(ty) >> 2u][classOf(ty) & 3u];
        let fr = u01(u32(ev[b + 5u] + 0.5), e, 9u, 9u); n = u32(floor(want * sc + fr));
      }
      ev[b + 20u] = f32(n);
    }
    sum = sum + n;
  }
  part[lid.x] = sum; workgroupBarrier();
  for (var off: u32 = 1u; off < 1024u; off = off << 1u) { var v: u32 = 0u; if (lid.x >= off) { v = part[lid.x - off]; } workgroupBarrier(); part[lid.x] = part[lid.x] + v; workgroupBarrier(); }
  var run: u32 = 0u; if (lid.x > 0u) { run = part[lid.x - 1u]; }
  for (var k: u32 = 0u; k < 16u; k = k + 1u) {
    let e = lid.x * 16u + k; if (e < cam.nev) { cum[e] = min(run, cam.cap); let n = u32(ev[e * GSTRIDE + 20u]); run = run + n; ev[e * GSTRIDE + 20u] = f32(min(run, cam.cap) - min(cum[e], cam.cap)); }
  }
  if (lid.x == 1023u) { cum[cam.nev] = min(run, cam.cap); }
  storageBarrier(); workgroupBarrier();
  if (lid.x == 0u) {
    let a = cum[cam.split]; let t = cum[cam.nev];
    indirect[0] = 4u; indirect[1] = a; indirect[2] = 0u; indirect[3] = 0u;                              // smoke: sprites [0, a)
    indirect[4] = 4u; indirect[5] = t - a; indirect[6] = 0u; indirect[7] = a;                            // additive: sprites [a, t)
  }
}`;

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------- static lint (node)
// Cheap checks that run without a GPU: balanced brackets, no tabs, every constant injected, the hash constants of sim/rng.mjs present in both ports.
export function lint(src, name) {
  const errs = []; const pairs = { '(': ')', '[': ']', '{': '}' }, stack = [];
  const clean = src.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
  for (let i = 0; i < clean.length; i++) { const ch = clean[i]; if (pairs[ch]) stack.push(pairs[ch]); else if (ch === ')' || ch === ']' || ch === '}') { if (stack.pop() !== ch) { errs.push(`${name}: unbalanced ${ch} near ${clean.slice(Math.max(0, i - 30), i + 10).replace(/\n/g, ' ')}`); break; } } }
  if (stack.length) errs.push(`${name}: ${stack.length} unclosed brackets`);
  if (/\t/.test(src)) errs.push(`${name}: tab`); if (/\$\{|undefined|NaN/.test(src)) errs.push(`${name}: unexpanded template or NaN`);
  for (const k of ['0x85ebca6bu', '0xc2b2ae35u', '0x9e3779b9u', '0x7f4a7c15u', '0x94d049bbu', '0xbf58476du']) if (!src.includes(k)) errs.push(`${name}: hash constant ${k} missing`);
  return errs;
}
