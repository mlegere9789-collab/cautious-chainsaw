// WGSL of the weather pass (WebGPU): the port of shaders.mjs WEATHER_FS, statement for statement, so the two renderers draw the same sky, stars, moon, clouds, fog, wet ground and flash light.
// The pass is drawn twice as a full-screen triangle in its own render pass after the prototype's scene pass (colour loaded, depth attached read-only and sampled):
//   MUL  blend zero, src        : dst = dst * D     (wet-ground darkening, fog transmittance, flash-light brightening, sky cleared)
//   ADD  blend one, one         : dst = dst + A     (sky radiance, fog in-scatter, puddle sheen)
// so dst_final = dst * D + A per channel, exactly as on WebGL2.
// What differs from the GLSL, and why (nothing else does):
//   * clip space: WebGPU depth is 0..1, so the world position is F.invVp * (ndc, depth, 1) (the GLSL uses depth * 2 - 1 with the GL-clip inverse). The depth VALUES are the same in both renderers.
//   * the frame block is the prototype's bind group 0 (binding 0 the block, 4 the height texture, 5 its sampler); this pass's own uniforms and the scene depth are bind group 1.
//   * MODE_MUL is a constant of the module (two modules) instead of a preprocessor define.
// Luminance floor (gate Q10): every sky radiance is clamped to the floor uniform; lights and sheen only add.
import { MAX_LIGHTS } from './shaders.mjs';

// layout of the uniform block WU in float32 units (std140-like: every member is a vec4, so the offsets are simply 4 apart)
export const WU = { sunDir: 0, moonDir: 4, moon: 8, zen: 12, hor: 16, sunCol: 20, sky: 24, tw: 28, floor: 32, cLit: 36, cShade: 40, cloud: 44, cOff: 48, stars: 52, starAxis: 56, fog: 60, fogCol: 64, proto: 68, wet: 72, ground: 76, nl: 80, lpos: 84, lcol: 84 + MAX_LIGHTS * 4 };
export const WU_FLOATS = 84 + MAX_LIGHTS * 8, WU_BYTES = WU_FLOATS * 4;

const FU = 'struct FU { vp: mat4x4f, prevVp: mat4x4f, invVp: mat4x4f, sm0: mat4x4f, sm1: mat4x4f, cam: vec4f, sun: vec4f, scr: vec4f, terr: vec4f, terr2: vec4f, lod: vec4f, right: vec4f, up: vec4f, fwd: vec4f, misc: vec4f, misc2: vec4f }';

export const WEATHER_WGSL = `
${FU}
@group(0) @binding(0) var<uniform> F: FU;
@group(0) @binding(4) var heightTex: texture_2d<f32>;
@group(0) @binding(5) var clampS: sampler;
// moon: x lit fraction, y radiance, z angular radius (rad), w 1 if above the horizon.  sky: x sun visibility, y sun glow gain, z day weight.  cloud: cover, altitude (m), scale (m), softness; cOff: drift in lattice cells (mod 256)
// stars: visibility, cells per radian, star fraction, gain; starAxis: axis xyz + rotation angle.  fog: extra extinction 1/m, scale height m; proto: 1 = undo the baked fog, 0.00006, 0.85, 0.9
// wet: albedo multiplier, puddle amount, puddle darken, puddle scale m; ground: tolerance, slope tolerance per m.  nl.x: number of lights; lpos: xyz radius; lcol: rgb intensity
struct WU { sunDir: vec4f, moonDir: vec4f, moon: vec4f, zen: vec4f, hor: vec4f, sunCol: vec4f, sky: vec4f, tw: vec4f, floorC: vec4f, cLit: vec4f, cShade: vec4f, cloud: vec4f, cOff: vec4f, stars: vec4f, starAxis: vec4f,
  fog: vec4f, fogCol: vec4f, proto: vec4f, wet: vec4f, ground: vec4f, nl: vec4f, lpos: array<vec4f, ${MAX_LIGHTS}>, lcol: array<vec4f, ${MAX_LIGHTS}> }
@group(1) @binding(0) var<uniform> W: WU;
@group(1) @binding(1) var sceneDepth: texture_depth_2d;
const MODE_MUL: bool = __MODE_MUL__;

struct VO { @builtin(position) pos: vec4f, @location(0) ndc: vec2f }
@vertex fn vs(@builtin(vertex_index) i: u32) -> VO {
  let p = vec2f(select(-1.0, 3.0, i == 1u), select(-1.0, 3.0, i == 2u));
  var o: VO; o.pos = vec4f(p, 0.0, 1.0); o.ndc = p; return o;
}
fn mixU(n0: u32) -> f32 { var n = (n0 ^ 61u) ^ (n0 >> 16u); n = n * 0x27d4eb2du; n = n ^ (n >> 15u); n = n * 0x2c1b3c6du; n = n ^ (n >> 13u); return f32(n) / 4294967296.0; }
fn h31(p: vec3f) -> f32 { let q = vec3u(vec3i(floor(p)) + vec3i(65536)); return mixU((q.x * 73856093u) ^ (q.y * 19349663u) ^ (q.z * 83492791u)); }
fn h21(c: vec2i) -> f32 { let q = vec2u(c & vec2i(255)); return mixU((q.x * 73856093u) ^ (q.y * 19349663u)); }
fn vn(p: vec2f) -> f32 { let i = floor(p); var f = fract(p); f = f * f * (3.0 - 2.0 * f); let c = vec2i(i); return mix(mix(h21(c), h21(c + vec2i(1, 0)), f.x), mix(h21(c + vec2i(0, 1)), h21(c + vec2i(1, 1)), f.x), f.y); }
// fbm with a footprint (fw: lattice cells per pixel at this point): an octave fades out as its cell shrinks toward the pixel, so distant cloud does not alias into stripes
fn fbmF(p0: vec2f, fw: f32) -> f32 {
  var p = p0; var a = 0.5; var s = 0.0; var wsum = 0.0; var f = 1.0;
  for (var i = 0; i < 5; i++) { let w = 1.0 - smoothstep(0.3, 0.8, fw * f); s += a * w * vn(p); wsum += a * w; p = p * 2.0 + vec2f(17.0, 9.0); a *= 0.5; f *= 2.0; }
  if (wsum > 1e-4) { return s / wsum; } return 0.5;
}
fn fbm(p: vec2f) -> f32 { return fbmF(p, 0.0); }
fn hAt(x: f32, z: f32) -> f32 { let uv = vec2f(x / F.terr.x + 0.5, z / F.terr.y + 0.5); let n = F.terr.z; return textureSampleLevel(heightTex, clampS, (uv * (n - 1.0) + 0.5) / n, 0.0).r; }
// the prototype renderer's own sky colour (shaders.mjs skyCol), used only to undo its baked fog on geometry
fn protoSky(d: vec3f) -> vec3f { let h = clamp(d.y, -0.2, 1.0); var c = mix(vec3f(0.78, 0.84, 0.92), vec3f(0.22, 0.38, 0.72), pow(max(h, 0.0), 0.45)); let sd = max(dot(d, F.sun.xyz), 0.0); c += vec3f(1.0, 0.8, 0.55) * (pow(sd, 8.0) * 0.25 + pow(sd, 800.0) * 12.0); return c * 1.1; }

fn skyColor(d: vec3f) -> vec3f {
  let h = clamp(d.y, -0.2, 1.0);
  var c = mix(W.hor.xyz, W.zen.xyz, pow(max(h, 0.0), 0.45));
  let sd = max(dot(d, W.sunDir.xyz), 0.0);
  c += W.sunCol.xyz * W.sky.x * W.sky.y * (pow(sd, 8.0) * 0.25 + pow(sd, 800.0) * 12.0);
  let hz = normalize(d.xz + vec2f(1e-5)); let sz = normalize(W.sunDir.xz + vec2f(1e-5));                      // twilight glow on the horizon toward the sun
  c += W.tw.xyz * pow(max(dot(hz, sz), 0.0), 3.0) * exp(-max(d.y, 0.0) * 7.0);
  // stars: lattice of cells on the rotated direction; a star sits at a random point of its cell and shines when the direction passes near it
  if (W.stars.x > 0.003 && d.y > -0.05) {
    let ax = W.starAxis.xyz; let ca = cos(W.starAxis.w); let sa = sin(W.starAxis.w);
    let q = d * ca + cross(ax, d) * sa + ax * dot(ax, d) * (1.0 - ca);
    let p = q * W.stars.y; let base = floor(p); var acc = 0.0;
    for (var i = -1; i <= 1; i++) { for (var j = -1; j <= 1; j++) { for (var k = -1; k <= 1; k++) {
      let cell = base + vec3f(f32(i), f32(j), f32(k));
      if (h31(cell) > W.stars.z) { continue; }
      let sp = cell + vec3f(h31(cell + 11.0), h31(cell + 23.0), h31(cell + 37.0));
      let r = length(sp); let sdv = sp / max(r, 1e-4); let dd = length(p - sdv * W.stars.y);
      let mag = pow(h31(cell + 51.0), 5.0); let sig = 0.22 + 0.18 * mag;
      acc += (0.12 + mag) * exp(-dd * dd / (sig * sig));
    } } }
    let ext = smoothstep(0.0, 0.22, d.y);                                                                    // horizon extinction
    c += vec3f(0.85, 0.92, 1.0) * acc * W.stars.w * W.stars.x * ext;
  }
  // moon disc with phase: the lit limb faces the sun
  if (W.moon.w > 0.5) {
    let md = W.moonDir.xyz; let cm = dot(d, md);
    if (cm > cos(W.moon.z * 3.0)) {
      let e1 = normalize(W.sunDir.xyz - md * dot(W.sunDir.xyz, md) + vec3f(1e-6)); let e2 = cross(md, e1);
      let off = d - md * cm; let m = vec2f(dot(off, e1), dot(off, e2)) / W.moon.z;
      let rr = length(m);
      let k = 1.0 - 2.0 * W.moon.x; let lit = step(k * sqrt(max(1.0 - m.y * m.y, 0.0)), m.x);
      let disc = 1.0 - smoothstep(0.9, 1.0, rr);
      let halo = exp(-(max(rr - 1.0, 0.0) * 0.6) * 3.0) * 0.06 * W.moon.x;
      let limb = 0.55 + 0.45 * sqrt(max(1.0 - rr * rr, 0.0));
      let mc = vec3f(1.0, 0.96, 0.88);
      c += mc * W.moon.y * (disc * (0.05 + 0.95 * lit) * limb + select(0.0, halo, rr > 1.0));
    }
  }
  // cloud layer
  if (W.cloud.x > 0.01 && d.y > 0.012) {
    let t = (W.cloud.y - F.cam.y) / d.y; let uvp = (F.cam.xz + d.xz * t) / W.cloud.z + W.cOff.xy;
    let pa = 2.0 * F.misc.x * F.scr.w; let fw = t * pa / max(d.y, 0.02) / W.cloud.z; let n = fbmF(uvp, fw); let cov = clamp(W.cloud.x, 0.0, 1.0);
    let th = 1.0 - cov * 1.12 - 0.04; var a = smoothstep(th, th + W.cloud.w, n); if (cov > 0.93) { a = max(a, smoothstep(0.93, 1.0, cov) * 0.97); }
    let n2 = fbmF(uvp + W.sunDir.xz * 0.12 / max(W.sunDir.y, 0.2), fw); let dens = clamp(0.5 + (n - n2) * 5.0 + (n - th) * 0.6, 0.0, 1.0);
    let cc = mix(W.cShade.xyz, W.cLit.xyz, dens * (1.0 - 0.55 * cov));
    let fade = smoothstep(0.012, 0.16, d.y);                                                                  // far clouds melt into the horizon
    c = mix(c, max(cc, W.floorC.xyz * 1.2), a * fade);
  }
  return max(c, W.floorC.xyz);
}

@fragment fn fs(i: VO) -> @location(0) vec4f {
  let dep = textureLoad(sceneDepth, vec2i(i.pos.xy), 0);
  let w4 = F.invVp * vec4f(i.ndc, dep, 1.0); let wp = w4.xyz / w4.w;
  let dv = wp - F.cam.xyz; let dist = length(dv); let d = dv / max(dist, 1e-4);
  var Dm = vec3f(1.0); var Ad = vec3f(0.0);
  if (dep >= 0.999999) {
    Dm = vec3f(0.0); if (!MODE_MUL) { Ad = skyColor(d); }
  } else {
    // 1. undo the prototype's baked fog toward its daylight sky
    var fp = 0.0; var Sd = vec3f(0.0);
    if (W.proto.x > 0.5) { fp = min(1.0 - exp(-dist * W.proto.y), W.proto.z); Sd = protoSky(d) * W.proto.w; }
    let k = 1.0 / max(1.0 - fp, 0.05); Dm = vec3f(k); Ad = -Sd * fp * k;
    // 2. wet ground
    let gh = hAt(wp.x, wp.z); let ground = (wp.y - gh) < (W.ground.x + W.ground.y * dist);
    if (ground && W.wet.x < 0.9995) {
      var m = W.wet.x; var pud = 0.0;
      if (W.wet.y > 0.0) { let n = fbm(wp.xz / W.wet.w + vec2f(3.1, 7.7)); pud = smoothstep(0.52 - 0.18 * W.wet.y, 0.62 - 0.18 * W.wet.y, n) * W.wet.y; m *= mix(1.0, W.wet.z, pud); }
      let V = -d; let Fr = 0.02 + 0.98 * pow(1.0 - clamp(V.y, 0.0, 1.0), 5.0);
      Dm *= m; Ad += W.hor.xyz * Fr * pud * 0.9 * m * k;
    }
    // 3. light of flashes and fires (adds to what is there; the floor is untouched)
    var L = vec3f(0.0); let nl = i32(W.nl.x);
    for (var li = 0; li < ${MAX_LIGHTS}; li++) { if (li >= nl) { break; } let lp = W.lpos[li].xyz - wp; let r = W.lpos[li].w; let f = r * r / (dot(lp, lp) + r * r); L += W.lcol[li].rgb * f * f; }
    Dm *= (1.0 + L);
    // 4. this layer's fog (extra extinction above the prototype's baked one), in the sky's horizon colour
    let hm = 0.5 * (F.cam.y + wp.y); let fh = exp(-max(hm - hAt(F.cam.x, F.cam.z), 0.0) / W.fog.y); let af = 1.0 - exp(-W.fog.x * fh * dist);
    Ad = Ad * (1.0 - af) + W.fogCol.xyz * af; Dm *= (1.0 - af);
  }
  if (MODE_MUL) { return vec4f(Dm, 1.0); }
  return vec4f(Ad, 0.0);
}`;
export const weatherWgsl = mode => { if (mode !== 'mul' && mode !== 'add') throw new Error('weather WGSL mode: mul or add'); return WEATHER_WGSL.replace('__MODE_MUL__', mode === 'mul' ? 'true' : 'false'); };

// The fx3d particle WGSL is used as it is, except the soft-particle depth read: fx3d expects LINEAR view depth in metres in sceneDepth (texture_2d<f32>), the prototype's depth target is the
// hardware depth (depth32float, 0..1). The patch binds it as a depth texture and inserts the same linearisation as the prototype's linDepth() (near * far / (far - d * (far - near))); the
// near and far planes travel in u.extra.z and u.extra.w (the WebGL2 path sends them as uNF).
export function patchFxWgsl(src) {
  const decl = '@group(0) @binding(4) var sceneDepth: texture_2d<f32>;', read = 'textureLoad(sceneDepth, vec2<i32>(fin.pos.xy), 0).r';
  if (!src.includes(decl) || !src.includes(read)) throw new Error('fx3d WGSL changed: the scene depth binding or its read was not found');
  return src.replace(decl, '@group(0) @binding(4) var sceneDepth: texture_depth_2d;\nfn linD(d: f32) -> f32 { if (d >= 0.999999) { return 1e9; } return u.extra.z * u.extra.w / (u.extra.w - d * (u.extra.w - u.extra.z)); }')
    .replace(read, 'linD(textureLoad(sceneDepth, vec2<i32>(fin.pos.xy), 0))');
}
