// GLSL ES 3.00 of the weather pass (WebGL2). One fragment source, two programs (MODE_MUL, MODE_ADD): the pass is drawn twice as a full-screen triangle at the end of the scene pass:
//   MUL  blend ZERO, SRC_COLOR : dst = dst * D     (wet-ground darkening, fog transmittance, flash-light brightening, sky cleared)
//   ADD  blend ONE, ONE        : dst = dst + A     (sky radiance, fog in-scatter, puddle sheen)
// so dst_final = dst * D + A per channel, exactly (the sampled depth tells sky pixels from geometry; geometry is never touched except by D and A).
//
// Sky pixels (depth == far): gradient + sun glow + twilight + stars (procedural lattice, rotated about the celestial pole) + moon disc with phase + one cloud layer. D = 0, A = sky.
// Geometry pixels: the prototype renderer has ALREADY mixed them toward its own daylight sky colour (fogged(), exp(-d * 0.00006) up to 0.85). At night that would be a bright blue band against the
// dark sky, so the baked mix is undone exactly (it is a known function of the pixel's position and the frame's sun) and replaced by this layer's fog in the sky's own horizon colour.
// Ground pixels (height within tolerance of the terrain texture): wetness darkening, puddles with a sky reflection. Men and structures stay dry.
// Luminance floor (gate Q10): every sky radiance is clamped to the floor uniform; lights and sheen only add.
const FU = 'layout(std140) uniform FU { mat4 vp; mat4 prevVp; mat4 invVp; mat4 sm0; mat4 sm1; vec4 cam; vec4 sun; vec4 scr; vec4 terr; vec4 terr2; vec4 lod; vec4 rightv; vec4 upv; vec4 fwdv; vec4 misc; vec4 misc2; };';
export const MAX_LIGHTS = 16;
export const WEATHER_VS = `#version 300 es
precision highp float; out vec2 vN;
void main() { vec2 p = vec2((gl_VertexID == 1) ? 3.0 : -1.0, (gl_VertexID == 2) ? 3.0 : -1.0); vN = p; gl_Position = vec4(p, 0.0, 1.0); }`;

export const WEATHER_FS = `#version 300 es
precision highp float; precision highp int; precision highp sampler2D;
${FU}
uniform sampler2D uDepth; uniform sampler2D uHeight;
uniform vec3 uSunDir; uniform vec3 uMoonDir; uniform vec4 uMoon;      // moon: x lit fraction, y radiance, z angular radius (rad), w 1 if above the horizon
uniform vec3 uZen; uniform vec3 uHor; uniform vec3 uSunCol; uniform vec4 uSky;   // sky: x sun visibility, y sun glow gain, z day weight, w floor luminance
uniform vec3 uTw; uniform vec3 uFloor;
uniform vec3 uCLit; uniform vec3 uCShade; uniform vec4 uCloud; uniform vec2 uCOff;   // cloud: cover, altitude (m), scale (m), softness; drift in lattice cells (mod 256)
uniform vec4 uStars; uniform vec4 uStarAxis;                      // stars: visibility, cells per radian, star fraction, gain; axis xyz + rotation angle
uniform vec4 uFog; uniform vec3 uFogCol; uniform vec4 uProto;      // fog: extra extinction 1/m, scale height m; proto: 1 = undo the baked fog, 0.00006, 0.85, 0.9
uniform vec4 uWet; uniform vec4 uGround;                            // wet: albedo multiplier, puddle amount, puddle darken, puddle scale m; ground: tolerance, slope tolerance per m
uniform int uNL; uniform vec4 uLPos[${MAX_LIGHTS}]; uniform vec4 uLCol[${MAX_LIGHTS}];   // lights: xyz radius / rgb intensity
in vec2 vN;
#ifdef MODE_MUL
layout(location = 0) out vec4 o;
#else
layout(location = 0) out vec4 o;
#endif
float h31(vec3 p) { uvec3 q = uvec3(ivec3(floor(p)) + ivec3(65536)); uint n = q.x * 73856093u ^ q.y * 19349663u ^ q.z * 83492791u; n = (n ^ 61u) ^ (n >> 16u); n *= 0x27d4eb2du; n ^= n >> 15u; n *= 0x2c1b3c6du; n ^= n >> 13u; return float(n) / 4294967296.0; }
float h21(ivec2 c) { uvec2 q = uvec2(c & ivec2(255)); uint n = q.x * 73856093u ^ q.y * 19349663u; n = (n ^ 61u) ^ (n >> 16u); n *= 0x27d4eb2du; n ^= n >> 15u; n *= 0x2c1b3c6du; n ^= n >> 13u; return float(n) / 4294967296.0; }
float vn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); ivec2 c = ivec2(i); return mix(mix(h21(c), h21(c + ivec2(1, 0)), f.x), mix(h21(c + ivec2(0, 1)), h21(c + ivec2(1, 1)), f.x), f.y); }
float fbm(vec2 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++) { s += a * vn(p); p = p * 2.0 + vec2(17.0, 9.0); a *= 0.5; } return s / 0.96875; }
float hAt(float x, float z) { vec2 uv = vec2(x / terr.x + 0.5, z / terr.y + 0.5); float n = terr.z; return textureLod(uHeight, (uv * (n - 1.0) + 0.5) / n, 0.0).r; }
// the prototype renderer's own sky colour (webgl2.mjs skyCol), used only to undo its baked fog on geometry
vec3 protoSky(vec3 d) { float h = clamp(d.y, -0.2, 1.0); vec3 c = mix(vec3(0.78, 0.84, 0.92), vec3(0.22, 0.38, 0.72), pow(max(h, 0.0), 0.45)); float sd = max(dot(d, sun.xyz), 0.0); c += vec3(1.0, 0.8, 0.55) * (pow(sd, 8.0) * 0.25 + pow(sd, 800.0) * 12.0); return c * 1.1; }

vec3 skyColor(vec3 d) {
  float h = clamp(d.y, -0.2, 1.0);
  vec3 c = mix(uHor, uZen, pow(max(h, 0.0), 0.45));
  float sd = max(dot(d, uSunDir), 0.0);
  c += uSunCol * uSky.x * uSky.y * (pow(sd, 8.0) * 0.25 + pow(sd, 800.0) * 12.0);
  vec2 hz = normalize(d.xz + vec2(1e-5)), sz = normalize(uSunDir.xz + vec2(1e-5));                           // twilight glow on the horizon toward the sun
  c += uTw * pow(max(dot(hz, sz), 0.0), 3.0) * exp(-max(d.y, 0.0) * 7.0);
  // stars: lattice of cells on the rotated direction; a star sits at a random point of its cell and shines when the direction passes near it
  if (uStars.x > 0.003 && d.y > -0.05) {
    vec3 ax = uStarAxis.xyz; float ca = cos(uStarAxis.w), sa = sin(uStarAxis.w);
    vec3 q = d * ca + cross(ax, d) * sa + ax * dot(ax, d) * (1.0 - ca);
    vec3 p = q * uStars.y; vec3 base = floor(p); float acc = 0.0;
    for (int i = -1; i <= 1; i++) for (int j = -1; j <= 1; j++) for (int k = -1; k <= 1; k++) {
      vec3 cell = base + vec3(float(i), float(j), float(k));
      if (h31(cell) > uStars.z) continue;
      vec3 sp = cell + vec3(h31(cell + 11.0), h31(cell + 23.0), h31(cell + 37.0));
      float r = length(sp) ; vec3 sdv = sp / max(r, 1e-4); float dd = length(p - sdv * uStars.y) ;
      float mag = pow(h31(cell + 51.0), 5.0); float sig = 0.22 + 0.18 * mag;
      acc += (0.12 + mag) * exp(-dd * dd / (sig * sig));
    }
    float ext = smoothstep(0.0, 0.22, d.y);                                                                 // horizon extinction
    c += vec3(0.85, 0.92, 1.0) * acc * uStars.w * uStars.x * ext;
  }
  // moon disc with phase: the lit limb faces the sun
  if (uMoon.w > 0.5) {
    float cm = dot(d, uMoonDir);
    if (cm > cos(uMoon.z * 3.0)) {
      vec3 e1 = normalize(uSunDir - uMoonDir * dot(uSunDir, uMoonDir) + vec3(1e-6)); vec3 e2 = cross(uMoonDir, e1);
      vec3 off = d - uMoonDir * cm; vec2 m = vec2(dot(off, e1), dot(off, e2)) / uMoon.z;
      float rr = length(m);
      float k = 1.0 - 2.0 * uMoon.x; float lit = step(k * sqrt(max(1.0 - m.y * m.y, 0.0)), m.x);
      float disc = 1.0 - smoothstep(0.9, 1.0, rr);
      float halo = exp(-pow(max(rr - 1.0, 0.0) * 0.6, 1.0) * 3.0) * 0.06 * uMoon.x;
      float limb = 0.55 + 0.45 * sqrt(max(1.0 - rr * rr, 0.0));
      vec3 mc = vec3(1.0, 0.96, 0.88);
      c += mc * uMoon.y * (disc * (0.05 + 0.95 * lit) * limb + (rr > 1.0 ? halo : 0.0)) ;
    }
  }
  // cloud layer
  if (uCloud.x > 0.01 && d.y > 0.012) {
    float t = (uCloud.y - cam.y) / d.y; vec2 uvp = (cam.xz + d.xz * t) / uCloud.z + uCOff;
    float n = fbm(uvp), cov = clamp(uCloud.x, 0.0, 1.0);
    float th = 1.0 - cov * 1.12 - 0.04; float a = smoothstep(th, th + uCloud.w, n); if (cov > 0.93) a = max(a, smoothstep(0.93, 1.0, cov) * 0.97);
    float n2 = fbm(uvp + uSunDir.xz * 0.12 / max(uSunDir.y, 0.2)); float dens = clamp(0.5 + (n - n2) * 5.0 + (n - th) * 0.6, 0.0, 1.0);
    vec3 cc = mix(uCShade, uCLit, dens * (1.0 - 0.55 * cov));
    float fade = smoothstep(0.012, 0.16, d.y);                                                               // far clouds melt into the horizon
    c = mix(c, max(cc, uFloor * 1.2), a * fade);
  }
  return max(c, uFloor);
}

void main() {
  float dep = texelFetch(uDepth, ivec2(gl_FragCoord.xy), 0).r;
  vec4 w4 = invVp * vec4(vN, dep * 2.0 - 1.0, 1.0); vec3 wp = w4.xyz / w4.w;
  vec3 dv = wp - cam.xyz; float dist = length(dv); vec3 d = dv / max(dist, 1e-4);
  vec3 Dm = vec3(1.0), Ad = vec3(0.0);
  if (dep >= 0.999999) {
    Dm = vec3(0.0); Ad = skyColor(d);
  } else {
    // 1. undo the prototype's baked fog toward its daylight sky
    float fp = 0.0; vec3 Sd = vec3(0.0);
    if (uProto.x > 0.5) { fp = min(1.0 - exp(-dist * uProto.y), uProto.z); Sd = protoSky(d) * uProto.w; }
    float k = 1.0 / max(1.0 - fp, 0.05); Dm = vec3(k); Ad = -Sd * fp * k;
    // 2. wet ground
    float gh = hAt(wp.x, wp.z); bool ground = (wp.y - gh) < (uGround.x + uGround.y * dist);
    if (ground && uWet.x < 0.9995) {
      float m = uWet.x, pud = 0.0;
      if (uWet.y > 0.0) { float n = fbm(wp.xz / uWet.w + vec2(3.1, 7.7)); pud = smoothstep(0.52 - 0.18 * uWet.y, 0.62 - 0.18 * uWet.y, n) * uWet.y; m *= mix(1.0, uWet.z, pud); }
      vec3 V = -d; float F = 0.02 + 0.98 * pow(1.0 - clamp(V.y, 0.0, 1.0), 5.0);
      Dm *= m; Ad += uHor * F * pud * 0.9 * m * k;
    }
    // 3. light of flashes and fires (adds to what is there; the floor is untouched)
    vec3 L = vec3(0.0);
    for (int i = 0; i < ${MAX_LIGHTS}; i++) { if (i >= uNL) break; vec3 lp = uLPos[i].xyz - wp; float r = uLPos[i].w; float f = r * r / (dot(lp, lp) + r * r); L += uLCol[i].rgb * f * f; }
    Dm *= (1.0 + L);
    // 4. this layer's fog (extra extinction above the prototype's baked one), in the sky's horizon colour
    float hm = 0.5 * (cam.y + wp.y); float fh = exp(-max(hm - hAt(cam.x, cam.z), 0.0) / uFog.y); float af = 1.0 - exp(-uFog.x * fh * dist);
    Ad = Ad * (1.0 - af) + uFogCol * af; Dm *= (1.0 - af);
  }
#ifdef MODE_MUL
  o = vec4(Dm, 1.0);
#else
  o = vec4(Ad, 0.0);
#endif
}`;
export const defsFor = mode => '#define ' + (mode === 'mul' ? 'MODE_MUL' : 'MODE_ADD') + '\n';
export function withDefs(src, mode) { return src.replace('#version 300 es\n', '#version 300 es\n' + defsFor(mode)); }

// The fx3d particle shaders are used as they are, except the soft-particle depth read: fx3d expects LINEAR view depth in metres in uDepth, the prototype's depth copy is the hardware
// depth (0..1). The patch inserts the same linearisation as the prototype's linDepth() (near * far / (far - d * (far - near))).
export function patchFxFragment(src) {
  const needle = 'texelFetch(uDepth, ivec2(gl_FragCoord.xy), 0).r';
  if (!src.includes(needle)) throw new Error('fx3d fragment shader changed: the depth read was not found');
  let out = src.replace(needle, 'linD(' + needle + ')');
  out = out.replace('uniform vec4 uExtra;', 'uniform vec4 uExtra; uniform vec2 uNF;\nfloat linD(float d) { return d >= 0.999999 ? 1e9 : uNF.x * uNF.y / (uNF.y - d * (uNF.y - uNF.x)); }');
  return out;
}
