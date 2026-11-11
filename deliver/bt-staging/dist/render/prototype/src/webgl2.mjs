// WebGL2 renderer: same scene, same LOD scheme and passes as webgpu.mjs; no compute/storage buffers, so soldier/unit data live in float textures and LOD lists are instance attributes.
import { mul, lookAt, ortho, invert } from './math.mjs';
import * as CH from './characters.mjs';
import { selectLods, makeLists } from './lod.mjs';
import { FX, EV_PER } from './fx.mjs';
import { soldierClip } from './world.mjs';
import { DEFAULTS } from './webgpu.mjs';

const FU_BYTES = 512, TW = 2048;
const PRE = (K) => `#version 300 es
precision highp float; precision highp int; precision highp sampler2D; precision highp sampler2DShadow;
layout(std140) uniform FU { mat4 vp; mat4 prevVp; mat4 invVp; mat4 sm0; mat4 sm1; vec4 cam; vec4 sun; vec4 scr; vec4 terr; vec4 terr2; vec4 lod; vec4 rightv; vec4 upv; vec4 fwdv; vec4 misc; vec4 misc2; };
layout(std140) uniform PalU { vec4 pal[64]; };
uniform sampler2D uHeight; uniform sampler2D uAerial; uniform sampler2D uSold0; uniform sampler2D uSold1; uniform sampler2D uUnits; uniform sampler2DShadow uSh0; uniform sampler2DShadow uSh1;
const float PI = 3.14159265; const float FRAMES = 32.0;
const float FROW[7] = float[7](${K.frow}); const float HROW[3] = float[3](${K.hrow});
const float FDUR[7] = float[7](4.0, 1.0, 0.62, 4.2, 1.4, 1.6, 1.0); const float HDUR[3] = float[3](4.0, 1.15, 0.58);
float hsh(uint n0) { uint n = (n0 ^ 61u) ^ (n0 >> 16u); n = n + (n << 3u); n = n ^ (n >> 4u); n = n * 0x27d4eb2du; n = n ^ (n >> 15u); return float(n) / 4294967296.0; }
float hAt(float x, float z) { vec2 uv = vec2(x / terr.x + 0.5, z / terr.y + 0.5); float n = terr.z; return textureLod(uHeight, (uv * (n - 1.0) + 0.5) / n, 0.0).r; }
ivec2 tcI(int i) { return ivec2(i & ${TW - 1}, i >> 11); }
vec4 S0(int i) { return texelFetch(uSold0, tcI(i), 0); } vec4 S1(int i) { return texelFetch(uSold1, tcI(i), 0); } vec4 UN(int ui, int k) { return texelFetch(uUnits, tcI(ui * 3 + k), 0); }
vec3 rotY(float h, vec3 v) { float c = cos(h); float s = sin(h); return vec3(v.x * c + v.z * s, v.y, -v.x * s + v.z * c); }
float bodyScale(float v) { return 0.95 + 0.1 * v; }
struct Pl { vec3 pos; float head; int clip; float s; int team; int klass; float vari; float seed; };
Pl place(int i, float t) {
  vec4 a = S0(i); vec4 b = S1(i); int ui = int(a.w); vec4 u0 = UN(ui, 0); vec4 u1 = UN(ui, 1); vec4 u2 = UN(ui, 2);
  float te = min(t, b.x); float dt = te - u2.x; float ux = u0.x + u1.x * dt; float uz = u0.y + u1.y * dt;
  float sx = a.x + (hsh(uint(i) * 31u + 1u) - 0.5) * 0.2; float sz = a.y + (hsh(uint(i) * 37u + 2u) - 0.5) * 0.2; float c = cos(u0.z); float sn = sin(u0.z);
  float wx = ux + sx * c + sz * sn; float wz = uz - sx * sn + sz * c;
  Pl p; p.pos = vec3(wx, hAt(wx, wz), wz); p.head = u0.z + (a.z - 0.5) * 0.12; p.seed = a.z; p.team = int(u1.z); p.klass = int(u1.w); p.vari = b.w;
  int kind = int(u0.w); int clip = kind; float s = 0.0;
  if (p.klass == 1) { s = fract(t / HDUR[kind] * (0.94 + 0.12 * a.z) + a.z); }
  else if (t >= b.x) { float a2 = (t - b.x) / 1.6; if (a2 < 1.0) { clip = 5; s = a2; } else { clip = 6; s = 1.0; } }
  else if (kind == 3 || kind == 4) { float P = 5.6 + (a.z - 0.5); float ph = fract((t + b.z * P) / P); if (ph < 0.78) { clip = 3; s = ph / 0.78; } else { clip = 4; s = (ph - 0.78) / 0.22; } }
  else { s = fract(t / FDUR[kind] * (0.92 + 0.16 * a.z) + a.z); }
  p.clip = clip; p.s = s; return p;
}
vec3 vatRows(int klass, int clip, float s) {
  float base = 0.0; bool looped = true; if (klass == 0) { base = FROW[clip]; looped = clip < 5; } else { base = HROW[clip]; }
  if (looped) { float f = s * FRAMES; float i0 = floor(f); float i1 = i0 + 1.0; if (i1 >= FRAMES) i1 = 0.0; return vec3(base + i0, base + i1, f - i0); }
  float f = s * (FRAMES - 1.0); float i0 = floor(f); float i1 = min(i0 + 1.0, FRAMES - 1.0); return vec3(base + i0, base + i1, f - i0);
}
vec3 tint(int mat, float vari) {
  if (mat == 10) { int k = int(vari * 4.0); if (k == 0) return vec3(1.0); if (k == 1) return vec3(0.3); if (k == 2) return vec3(1.7, 1.0, 0.7); return vec3(2.6); }
  if (mat == 3) return mix(vec3(0.8, 0.78, 0.8), vec3(1.15, 1.1, 1.05), fract(vari * 7.3));
  if (mat == 0 || mat == 1 || mat == 2 || mat == 7) return vec3(0.82 + 0.36 * fract(vari * 13.7 + float(mat) * 0.37)) * mix(vec3(1.0), vec3(1.1, 1.0, 0.85), fract(vari * 3.1));
  return vec3(1.0);
}
vec4 palC(int team, int mat) { return pal[(team * 16 + mat) * 2]; } float palM(int team, int mat) { return pal[(team * 16 + mat) * 2 + 1].x; }
float shadowAt(vec3 wp) {
  { vec4 q = sm0 * vec4(wp, 1.0); vec2 uv = vec2(q.x * 0.5 + 0.5, q.y * 0.5 + 0.5); if (uv.x > 0.02 && uv.y > 0.02 && uv.x < 0.98 && uv.y < 0.98 && q.z > 0.0 && q.z < 1.0) { float ts = misc2.w; float zr = q.z - 0.0012; return 0.25 * (textureLod(uSh0, vec3(uv + vec2(-0.5, -0.5) * ts, zr), 0.0) + textureLod(uSh0, vec3(uv + vec2(0.5, -0.5) * ts, zr), 0.0) + textureLod(uSh0, vec3(uv + vec2(-0.5, 0.5) * ts, zr), 0.0) + textureLod(uSh0, vec3(uv + vec2(0.5, 0.5) * ts, zr), 0.0)); } }
  { vec4 q = sm1 * vec4(wp, 1.0); vec2 uv = vec2(q.x * 0.5 + 0.5, q.y * 0.5 + 0.5); if (uv.x > 0.02 && uv.y > 0.02 && uv.x < 0.98 && uv.y < 0.98 && q.z > 0.0 && q.z < 1.0) { float ts = misc2.w; float zr = q.z - 0.0012; return 0.25 * (textureLod(uSh1, vec3(uv + vec2(-0.5, -0.5) * ts, zr), 0.0) + textureLod(uSh1, vec3(uv + vec2(0.5, -0.5) * ts, zr), 0.0) + textureLod(uSh1, vec3(uv + vec2(-0.5, 0.5) * ts, zr), 0.0) + textureLod(uSh1, vec3(uv + vec2(0.5, 0.5) * ts, zr), 0.0)); } }
  return 1.0;
}
vec3 lit(vec3 alb, float rough, float metal, vec3 N, vec3 wp, float sh, float ao) {
  vec3 L = sun.xyz; vec3 V = normalize(cam.xyz - wp); vec3 H = normalize(L + V); float nl = max(dot(N, L), 0.0); float nh = max(dot(N, H), 0.0); float nv = max(dot(N, V), 0.001); float vh = max(dot(V, H), 0.0);
  float a = max(rough * rough, 0.02); float a2 = a * a; float d = nh * nh * (a2 - 1.0) + 1.0; float D = a2 / (PI * d * d); float k = (rough + 1.0) * (rough + 1.0) / 8.0; float G = (nl / (nl * (1.0 - k) + k)) * (nv / (nv * (1.0 - k) + k));
  vec3 f0 = mix(vec3(0.04), alb, metal); vec3 Fr = f0 + (vec3(1.0) - f0) * pow(1.0 - vh, 5.0); vec3 spec = D * G * Fr / (4.0 * nv * max(nl, 0.001)); vec3 diff = (1.0 - metal) * alb / PI * (vec3(1.0) - Fr);
  vec3 sunC = vec3(1.0, 0.93, 0.82) * sun.w; vec3 amb = mix(vec3(0.07, 0.06, 0.05), vec3(0.16, 0.22, 0.34), N.y * 0.5 + 0.5);
  return (diff + spec) * sunC * nl * sh + alb * (1.0 - metal) * amb * ao;
}
vec3 skyCol(vec3 d) { float h = clamp(d.y, -0.2, 1.0); vec3 c = mix(vec3(0.78, 0.84, 0.92), vec3(0.22, 0.38, 0.72), pow(max(h, 0.0), 0.45)); float sd = max(dot(d, sun.xyz), 0.0); c += vec3(1.0, 0.8, 0.55) * (pow(sd, 8.0) * 0.25 + pow(sd, 800.0) * 12.0); return c * 1.1; }
vec3 fogged(vec3 c, vec3 wp) { vec3 dv = wp - cam.xyz; float d = length(dv); float f = 1.0 - exp(-d * 0.00006); return mix(c, skyCol(normalize(dv)) * 0.9, clamp(f, 0.0, 0.85)); }
float linDepth(float d) { float n = misc.w; float f = lod.w; return n * f / (f - d * (f - n)); }
`;
const NOFS = '#version 300 es\nprecision highp float; out vec4 o; void main() { o = vec4(0.0); }';
const terrainVS = `layout(location=0) in vec3 g; layout(location=1) in vec4 inst; out vec3 vWp;
void main() { float x = inst.x + g.x * inst.z; float z = inst.y + g.y * inst.z; float y = hAt(x, z) - g.z * 30.0; vWp = vec3(x, y, z); gl_Position = vp * vec4(vWp, 1.0); }`;
const terrainFS = `in vec3 vWp; out vec4 o;
float vnoise(vec2 p) { vec2 i = floor(p); vec2 f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f); uvec2 ii = uvec2(ivec2(i) + ivec2(4096));
  float a = hsh((ii.x * 73856093u) ^ (ii.y * 19349663u)); float b = hsh(((ii.x + 1u) * 73856093u) ^ (ii.y * 19349663u)); float c = hsh((ii.x * 73856093u) ^ ((ii.y + 1u) * 19349663u)); float d = hsh(((ii.x + 1u) * 73856093u) ^ ((ii.y + 1u) * 19349663u)); return mix(mix(a, b, u.x), mix(c, d, u.x), u.y); }
void main() { vec3 wp = vWp; vec2 uv = vec2(wp.x / terr.x + 0.5, wp.z / terr.y + 0.5); vec3 alb = texture(uAerial, uv).rgb; float dist = length(wp - cam.xyz); float near = 1.0 - smoothstep(10.0, 220.0, dist);
  float n1 = vnoise(wp.xz * 0.9); float n2 = vnoise(wp.xz * 5.0); alb = alb * (1.0 + near * ((n1 - 0.5) * 0.5 + (n2 - 0.5) * 0.45));
  float e = 3.0; float hx = hAt(wp.x + e, wp.z) - hAt(wp.x - e, wp.z); float hz = hAt(wp.x, wp.z + e) - hAt(wp.x, wp.z - e); vec3 N = normalize(vec3(-hx, 2.0 * e, -hz));
  vec3 col = lit(alb * vec3(1.0, 1.02, 0.95), 0.9, 0.0, N, wp, shadowAt(wp), 1.0); o = vec4(fogged(col, wp), 1.0); }`;
const skyVS = `out vec2 vN; void main() { vec2 p = vec2((gl_VertexID == 1) ? 3.0 : -1.0, (gl_VertexID == 2) ? 3.0 : -1.0); vN = p; gl_Position = vec4(p, 0.9999, 1.0); }`;
const skyFS = `in vec2 vN; out vec4 o; void main() { vec4 w = invVp * vec4(vN, 1.0, 1.0); vec3 d = normalize(w.xyz / w.w - cam.xyz); o = vec4(skyCol(d), 1.0); }`;
const nearVS = (NB) => `layout(location=0) in vec3 pos; layout(location=1) in vec3 nrm; layout(location=2) in float mat; layout(location=3) in vec4 jw; layout(location=4) in uint aIdx; uniform sampler2D uPose;
out vec3 vWp; out vec3 vN; flat out vec4 vMt;
void main() { Pl p = place(int(aIdx), cam.w); vec3 sp = vec3(0.0); vec3 sn = vec3(0.0);
  for (int k = 0; k < 2; k++) { int j = int(k == 0 ? jw.x : jw.y); float w = k == 0 ? jw.z : jw.w; if (w == 0.0) continue; ivec2 b = ivec2(j * 3, gl_InstanceID); vec4 r0 = texelFetch(uPose, b, 0); vec4 r1 = texelFetch(uPose, b + ivec2(1, 0), 0); vec4 r2 = texelFetch(uPose, b + ivec2(2, 0), 0);
    sp += w * vec3(dot(r0.xyz, pos) + r0.w, dot(r1.xyz, pos) + r1.w, dot(r2.xyz, pos) + r2.w); sn += w * vec3(dot(r0.xyz, nrm), dot(r1.xyz, nrm), dot(r2.xyz, nrm)); }
  vec3 wp = p.pos + rotY(p.head, sp * bodyScale(p.vari)); vWp = wp; vN = rotY(p.head, normalize(sn)); gl_Position = vp * vec4(wp, 1.0); vMt = vec4(mat, float(p.team), p.vari, float(p.klass)); }`;
const charFS = `in vec3 vWp; in vec3 vN; flat in vec4 vMt; out vec4 o; uniform float uAo;
void main() { int mt = int(vMt.x + 0.5); int team = int(vMt.y); vec4 pc = palC(team, mt); vec3 alb = pc.rgb * tint(mt, vMt.z); vec3 N = normalize(vN); float sh = shadowAt(vWp); float ao = uAo > 0.5 ? clamp(0.55 + 0.45 * smoothstep(0.0, 1.2, vWp.y - hAt(vWp.x, vWp.z)), 0.0, 1.0) : 0.8;
  o = vec4(fogged(lit(alb, pc.a, palM(team, mt), N, vWp, sh, ao), vWp), 1.0); }`;
const midVS = `layout(location=0) in vec3 pos; layout(location=1) in vec3 nrm; layout(location=2) in float mat; layout(location=4) in uint aIdx; uniform sampler2D uVat;
out vec3 vWp; out vec3 vN; flat out vec4 vMt;
void main() { Pl p = place(int(aIdx), cam.w); vec3 rw = vatRows(p.klass, p.clip, p.s); vec3 a = texelFetch(uVat, ivec2(gl_VertexID, int(rw.x)), 0).xyz; vec3 b = texelFetch(uVat, ivec2(gl_VertexID, int(rw.y)), 0).xyz;
  vec3 wp = p.pos + rotY(p.head, mix(a, b, rw.z) * bodyScale(p.vari)); vWp = wp; vN = rotY(p.head, nrm); gl_Position = vp * vec4(wp, 1.0); vMt = vec4(mat, float(p.team), p.vari, float(p.klass)); }`;
const gunVS = `layout(location=0) in vec3 pos; layout(location=1) in vec3 nrm; layout(location=2) in float mat; layout(location=3) in vec4 jw; uniform sampler2D uGuns;
out vec3 vWp; out vec3 vN; flat out vec4 vMt;
void main() { vec4 a = texelFetch(uGuns, ivec2(gl_InstanceID * 2, 0), 0); vec4 b = texelFetch(uGuns, ivec2(gl_InstanceID * 2 + 1, 0), 0); vec3 lp = pos;
  if (int(jw.x) == 1) { float tc = cam.w + b.y; float x = tc - floor(tc / b.x) * b.x; lp.z = lp.z - 0.55 * (1.0 - exp(-x * 30.0)) * exp(-x * 2.6); }
  vec3 w0 = rotY(a.z, lp); vec3 wp = vec3(a.x + w0.x, hAt(a.x, a.y) + w0.y, a.y + w0.z); vWp = wp; vN = rotY(a.z, nrm); gl_Position = vp * vec4(wp, 1.0); vMt = vec4(mat, a.w, 0.0, 0.0); }`;
const impVS = (o) => `layout(location=4) in uint aIdx; out vec2 vUv0; out vec2 vUv1; out vec3 vWp; flat out vec4 vD; flat out vec4 vWv; out vec2 vQ;
const float VIEWS = ${o.views}.0; const float FR = ${o.frames}.0; const float CW = ${o.cw}.0; const float CH = ${o.ch}.0; const float ATW = ${o.W}.0; const float ATH = ${o.H}.0; const float TEAMH = ${o.H / 2}.0; const float QH = ${o.qh.toFixed(3)}; const float QW = ${o.qw.toFixed(3)}; const float MIDY = ${o.midy.toFixed(3)};
float fmod1(float a, float m) { return a - floor(a / m) * m; }
void main() { Pl p = place(int(aIdx), cam.w); vec3 c = vec3(p.pos.x, p.pos.y + MIDY, p.pos.z); vec3 d3 = c - cam.xyz; float dist = length(d3); gl_Position = vec4(2.0, 2.0, 2.0, 1.0); vWp = vec3(0.0); vUv0 = vec2(0.0); vUv1 = vec2(0.0); vD = vec4(0.0); vWv = vec4(0.0); vQ = vec2(0.0);
  if (dist < lod.y || dist > lod.z) return;
  float pxPerM = scr.y * 0.5 / (misc.x * dist); float sc = bodyScale(p.vari); float hpx = QH * sc * pxPerM; float qh = QH * sc; float qw = QW * sc; float dab = 0.0;
  if (hpx < 7.0) { qh = max(qh, 3.0 / pxPerM); qw = max(qw, 1.7 / pxPerM); dab = clamp(hpx / 3.0, 0.12, 1.0); }
  vec3 toCam = normalize(vec3(-d3.x, 0.0, -d3.z)); vec3 right = vec3(toCam.z, 0.0, -toCam.x); float cx = float(gl_VertexID & 1) * 2.0 - 1.0; float cy = float((gl_VertexID >> 1) & 1);
  vec3 wp = p.pos + right * cx * qw * 0.5 + vec3(0.0, cy * qh, 0.0); gl_Position = vp * vec4(wp, 1.0); vWp = wp; vQ = vec2(cx * 0.5 + 0.5, cy);
  float dxw = -d3.x; float dzw = -d3.z; float cs = cos(p.head); float sn = sin(p.head); float dxm = dxw * cs - dzw * sn; float dzm = dxw * sn + dzw * cs; float az = atan(-dxm, dzm); if (az < 0.0) az += 2.0 * PI;
  float vf = az / (2.0 * PI) * VIEWS; float v0 = floor(vf); float v1 = v0 + 1.0; float wv = vf - v0; float fr = min(floor(p.s * FR), FR - 1.0); float row = float(p.clip) * FR + fr; float yoff = float(p.team) * TEAMH + row * CH;
  float u0 = (fmod1(v0, VIEWS) * CW + cx * 0.5 * CW + CW * 0.5) / ATW; float u1 = (fmod1(v1, VIEWS) * CW + cx * 0.5 * CW + CW * 0.5) / ATW; float vv = (yoff + (1.0 - cy) * (CH - 1.0) + 0.5) / ATH;
  vUv0 = vec2(u0, vv); vUv1 = vec2(u1, vv); vWv = vec4(wv, dab, float(p.team), cy); vD = vec4(dab, float(p.team), p.vari, hsh(uint(aIdx) * 7u + 3u)); }`;
const impFS = `in vec2 vUv0; in vec2 vUv1; in vec3 vWp; flat in vec4 vD; flat in vec4 vWv; in vec2 vQ; out vec4 o; uniform sampler2D uAtlas;
float ign(vec2 p) { return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }
void main() { vec3 col; float lightK = 0.35 + 0.95 * max(sun.y, 0.0) * 1.2;
  if (vD.x > 0.0) { int mm = vQ.y > 0.45 ? 0 : 1; vec4 pc = palC(int(vD.y), mm); col = pc.rgb * tint(mm, vD.z); if (fract(ign(gl_FragCoord.xy) + vD.w) > vD.x) discard; col = col * lightK * 0.6; }
  else { vec4 c0 = textureLod(uAtlas, vUv0, 0.0); vec4 c1 = textureLod(uAtlas, vUv1, 0.0); vec4 c = mix(c0, c1, vWv.x); if (c.a < 0.5) discard; col = pow(c.rgb, vec3(2.2)) * lightK * 0.6 * (0.85 + 0.3 * vD.z); }
  o = vec4(fogged(col, vWp), 1.0); }`;
const partVS = `uniform sampler2D uEv; out vec2 vUv; flat out vec4 vCol; flat out vec4 vInfo;
float vnz(vec2 p) { return 0.0; }
void main() { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); vUv = vec2(0.0); vCol = vec4(0.0); vInfo = vec4(0.0); int e = gl_InstanceID / 64; uint p = uint(gl_InstanceID % 64); vec4 a = texelFetch(uEv, ivec2(e * 2, 0), 0); vec4 b = texelFetch(uEv, ivec2(e * 2 + 1, 0), 0);
  float age = cam.w - a.w; int ty = int(b.x); vec2 dir = vec2(b.z, b.w); uint eu = uint(e);
  float r0 = hsh(eu * 7919u + p * 104729u + 13u); float r1 = hsh(eu * 7919u + p * 104729u + 29u); float r2 = hsh(eu * 7919u + p * 104729u + 47u); float r3 = hsh(eu * 7919u + p * 104729u + 71u);
  vec3 pos = a.xyz; float size = 0.0; float alpha = 0.0; vec3 col = vec3(1.0); vec3 emis = vec3(0.0); float spin = 0.0; vec3 wind = vec3(1.3, 0.0, 0.5);
  if (ty == 0) { if (p >= 8u) return; float life = 8.0; if (age > life) return; float k = 1.6; float d = (1.0 - exp(-k * age)) / k; float v0 = 2.0 + 5.0 * r0;
    pos += vec3(dir.x, 0.0, dir.y) * v0 * d + vec3((r1 - 0.5) * 1.6, 0.15 + 0.5 * r2, (r3 - 0.5) * 1.6) * d + wind * age * (0.25 + 0.5 * r1) + vec3(0.0, 0.12 * age, 0.0);
    size = 0.35 + (0.9 + 1.6 * r2) * (1.0 - exp(-age * 0.55)); alpha = 0.2 * pow(1.0 - age / life, 1.8) * smoothstep(0.0, 0.08, age); col = vec3(0.8, 0.78, 0.75); }
  else if (ty == 1) {
    if (p < 6u) { float life = 0.14; if (age > life) return; float ph = float(p); pos += vec3(dir.x, 0.0, dir.y) * (0.3 + ph * 0.55 * (0.4 + r0)) + vec3(r1 - 0.5, r2 - 0.5, r3 - 0.5) * 0.8 * ph * 0.3; size = p == 0u ? 3.2 * (1.0 - age / life * 0.5) : 1.2 + r0; alpha = 0.0; emis = vec3(30.0, 14.0, 3.5) * (1.0 - age / life) * (p == 0u ? 1.0 : 0.5); }
    else { uint q = p - 6u; if (q >= 40u) return; float life = 16.0; if (age > life) return; float k = 0.45 + 0.3 * r1; float d = (1.0 - exp(-k * age)) / k; float v0 = 14.0 * (0.25 + 0.75 * r0);
      pos += vec3(dir.x, 0.0, dir.y) * v0 * d * (0.5 + 0.5 * r2) + vec3((r3 - 0.5) * 6.0, 1.0 + 3.0 * r2, (r1 - 0.5) * 6.0) * d * 0.5 + wind * age * (0.4 + 0.6 * r3) + vec3(0.0, 0.5 * age * (0.3 + r0), 0.0);
      size = 1.0 + (1.2 + 3.2 * r2) * (1.0 - exp(-age * 0.35)); alpha = 0.34 * smoothstep(0.0, 0.2, age) * pow(1.0 - age / life, 1.3); col = mix(vec3(0.9, 0.88, 0.85), vec3(0.6), 1.0 - exp(-age * 0.15)); } }
  else {
    if (p < 30u) { float life = 3.8; if (age > life) return; float ang = r0 * 6.2832; float sp = 3.0 + 7.0 * r1; vec3 v = vec3(cos(ang) * sp, 12.0 + 20.0 * r2, sin(ang) * sp); float k = 0.35; float d = (1.0 - exp(-k * age)) / k;
      pos += vec3(v.x * d, v.y * d - 4.9 * age * age, v.z * d); size = 1.0 + 4.5 * r3 * (1.0 - exp(-age * 1.2)) + 0.8; alpha = 0.8 * pow(1.0 - age / life, 1.2) * smoothstep(0.0, 0.05, age); col = vec3(0.30, 0.22, 0.14) * (0.7 + 0.5 * r3); pos.y = max(pos.y, a.y + 0.2); }
    else if (p < 54u) { float life = 14.0; if (age > life) return; float ang = r0 * 6.2832; float sp = 1.5 + 5.0 * r1; float k = 0.3; float d = (1.0 - exp(-k * age)) / k;
      pos += vec3(cos(ang) * sp * d, (2.0 + 6.0 * r2) * d, sin(ang) * sp * d) + wind * age * 0.5 + vec3(0.0, 0.4 * age, 0.0); size = 2.0 + (4.0 + 9.0 * r3) * (1.0 - exp(-age * 0.3)); alpha = 0.3 * smoothstep(0.0, 0.3, age) * pow(1.0 - age / life, 1.2); col = mix(vec3(0.42, 0.34, 0.26), vec3(0.55, 0.52, 0.5), 1.0 - exp(-age * 0.2)); }
    else { float life = 3.2; if (age > life) return; float ang = r0 * 6.2832; float sp = 5.0 + 14.0 * r1; vec3 v = vec3(cos(ang) * sp, 12.0 + 24.0 * r2, sin(ang) * sp);
      pos += vec3(v.x * age, v.y * age - 4.9 * age * age, v.z * age); if (pos.y < a.y + 0.05) pos.y = a.y + 0.05; size = 0.12 + 0.25 * r3; alpha = 1.0; col = vec3(0.08, 0.06, 0.04); spin = (r2 - 0.5) * 20.0; } }
  float cx = float(gl_VertexID & 1) * 2.0 - 1.0; float cy = float((gl_VertexID >> 1) & 1) * 2.0 - 1.0; vec2 cc = vec2(cx, cy); float ra = spin * age; if (spin != 0.0) cc = vec2(cx * cos(ra) - cy * sin(ra), cx * sin(ra) + cy * cos(ra));
  vec3 wp = pos + rightv.xyz * cc.x * size + upv.xyz * cc.y * size; gl_Position = vp * vec4(wp, 1.0); vUv = vec2(cx, cy); vCol = vec4(col, alpha); vInfo = vec4(size, r0 * 100.0, 0.0, float(ty)); if (emis.x > 0.0) vCol = vec4(emis, -1.0); }`;
const partFS = `in vec2 vUv; flat in vec4 vCol; flat in vec4 vInfo; out vec4 o; uniform sampler2D uDepth;
float vn(vec2 p) { vec2 i = floor(p); vec2 f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f); uvec2 ii = uvec2(ivec2(i) + ivec2(4096));
  float a = hsh((ii.x * 73856093u) ^ (ii.y * 19349663u)); float b = hsh(((ii.x + 1u) * 73856093u) ^ (ii.y * 19349663u)); float c = hsh((ii.x * 73856093u) ^ ((ii.y + 1u) * 19349663u)); float d = hsh(((ii.x + 1u) * 73856093u) ^ ((ii.y + 1u) * 19349663u)); return mix(mix(a, b, u.x), mix(c, d, u.x), u.y); }
void main() { float r2 = dot(vUv, vUv); if (r2 > 1.0) discard; if (vCol.a < 0.0) { float f = 1.0 - r2; o = vec4(vCol.rgb * f * f, 0.0); return; }
  float n = vn(vUv * 2.5 + vInfo.y) * 0.6 + vn(vUv * 6.0 + vInfo.y * 1.7) * 0.4; float shape = smoothstep(1.0, 0.15, r2 + (n - 0.5) * 0.7); if (vInfo.w > 1.5 && vInfo.x < 0.5) shape = 1.0;
  float zf = 1.0 / gl_FragCoord.w; float sd = linDepth(texelFetch(uDepth, ivec2(gl_FragCoord.xy), 0).r); float soft = clamp((sd - zf) / max(vInfo.x * 0.7, 0.3), 0.0, 1.0);
  vec3 nrm = normalize(vec3(vUv, sqrt(max(1.0 - r2, 0.0)))); vec3 sunV = vec3(dot(sun.xyz, rightv.xyz), dot(sun.xyz, upv.xyz), dot(sun.xyz, -fwdv.xyz)); float l = 0.35 + 0.75 * max(dot(nrm, sunV) * 0.5 + 0.5, 0.0);
  vec3 c = vCol.rgb * (vec3(0.30, 0.36, 0.45) * 0.6 + vec3(1.0, 0.93, 0.82) * l * 1.6); float a = vCol.a * shape * soft * terr2.y; o = vec4(c * a, a); }`;
const fsVS = `out vec2 vUv; void main() { vec2 p = vec2((gl_VertexID == 1) ? 3.0 : -1.0, (gl_VertexID == 2) ? 3.0 : -1.0); vUv = vec2(p.x * 0.5 + 0.5, p.y * 0.5 + 0.5); gl_Position = vec4(p, 0.0, 1.0); }`;
const preFS = `in vec2 vUv; out vec4 o; uniform sampler2D uSrc; void main() { vec2 ts = vec2(textureSize(uSrc, 0)); vec3 c = vec3(0.0); for (int j = 0; j < 4; j++) { vec2 of = vec2(float(j & 1) - 0.5, float(j >> 1) - 0.5) * 2.0; c += textureLod(uSrc, vUv + of / ts, 0.0).rgb; } c *= 0.25; float l = max(c.r, max(c.g, c.b)); float k = max(l - 1.6, 0.0) / max(l, 1e-3); o = vec4(c * k, 1.0); }`;
const blurFS = `in vec2 vUv; out vec4 o; uniform sampler2D uSrc; uniform vec2 uDir; void main() { vec2 ts = vec2(textureSize(uSrc, 0)); float w[5] = float[5](0.227, 0.194, 0.121, 0.054, 0.016); vec3 c = textureLod(uSrc, vUv, 0.0).rgb * w[0]; for (int i = 1; i < 5; i++) { vec2 of = uDir * float(i) * 1.6 / ts; c += textureLod(uSrc, vUv + of, 0.0).rgb * w[i]; c += textureLod(uSrc, vUv - of, 0.0).rgb * w[i]; } o = vec4(c, 1.0); }`;
const postFS = `in vec2 vUv; out vec4 o; uniform sampler2D uHdr; uniform sampler2D uDepthT; uniform sampler2D uBloom;
vec3 aces(vec3 x) { return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), vec3(0.0), vec3(1.0)); }
void main() { ivec2 px = ivec2(gl_FragCoord.xy); vec2 dims = scr.xy; float dr = texelFetch(uDepthT, px, 0).r; float lin = linDepth(dr); bool useMB = misc2.z > 0.0; bool useDOF = misc2.y > 0.0; vec2 vel = vec2(0.0);
  if (useMB) { vec4 ndc = vec4(vUv.x * 2.0 - 1.0, vUv.y * 2.0 - 1.0, dr * 2.0 - 1.0, 1.0); vec4 w = invVp * ndc; vec3 wp = w.xyz / w.w; vec4 pc = prevVp * vec4(wp, 1.0); vec2 pn = pc.xy / pc.w; vel = (ndc.xy - pn) * vec2(0.5, 0.5) * misc2.z; float vl = length(vel * dims); if (vl > 24.0) vel = vel * 24.0 / vl; }
  float coc = 0.0; if (useDOF) { float l2 = dr >= 0.99999 ? 4000.0 : lin; coc = clamp(misc2.y * abs(l2 - misc2.x) / l2 * 0.5 * dims.y * 0.002, 0.0, 14.0); }
  vec3 acc = vec3(0.0); const int nT = 8; for (int i = 0; i < nT; i++) { float t = (float(i) + 0.5) / float(nT) - 0.5; vec2 of = vel * t; if (useDOF) { float ang = float(i) * 2.39996; float r = sqrt((float(i) + 0.5) / float(nT)) * coc; of += vec2(cos(ang), sin(ang)) * r / dims; } acc += textureLod(uHdr, vUv + of, 0.0).rgb; }
  vec3 col = acc / float(nT); col += textureLod(uBloom, vUv, 0.0).rgb * 0.18; vec2 v = vUv - 0.5; col *= 1.0 - dot(v, v) * 0.55; col *= misc.z; vec3 oo = pow(aces(col), vec3(1.0 / 2.2)); float g = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))) - 0.5; oo += g * (1.0 / 255.0); o = vec4(oo, 1.0); }`;

export class GLRenderer {
  static async create(canvas, world, opts = {}) { const r = new GLRenderer(canvas, world, opts); await r.init(); return r; }
  constructor(canvas, world, opts) { this.canvas = canvas; this.w = world; this.o = { ...DEFAULTS, ...opts, flags: { ...DEFAULTS.flags, ...(opts.flags || {}) } }; this.mem = { buffers: 0, textures: 0, items: {} }; this.stats = {}; this.gpuMs = {}; this.api = 'webgl2'; }
  track(kind, name, bytes) { this.mem[kind] += bytes; this.mem.items[name] = (this.mem.items[name] || 0) + bytes; }
  async init() {
    const t0 = performance.now(), o = this.o, w = this.w, T = w.T;
    const gl = this.gl = this.canvas.getContext('webgl2', { antialias: false, alpha: false, depth: false, stencil: false, powerPreference: o.power || 'high-performance', preserveDrawingBuffer: false, desynchronized: false }); if (!gl) throw new Error('no webgl2');
    const dbg = gl.getExtension('WEBGL_debug_renderer_info'); this.rendererName = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : 'unknown'; this.adapterInfo = { vendor: 'webgl2', arch: this.rendererName, renderer: this.rendererName };
    for (const e of ['EXT_color_buffer_float', 'OES_texture_float_linear', 'EXT_texture_filter_anisotropic']) if (!gl.getExtension(e)) console.warn('missing', e); this.tq = gl.getExtension('EXT_disjoint_timer_query_webgl2'); this.hasTS = !!this.tq; this.par = gl.getExtension('KHR_parallel_shader_compile');
    const tb = performance.now();
    this.meshes = { footNear: CH.buildFootMesh(o.nearQ), footMid: CH.buildFootMesh(o.midQ), hrsNear: CH.buildHorseMesh(o.nearQ), hrsMid: CH.buildHorseMesh(o.midQ), gun: CH.buildGunMesh(1) };
    this.vatF = CH.bakeVAT('foot', this.meshes.footMid, 32); this.vatH = CH.bakeVAT('horse', this.meshes.hrsMid, 32);
    this.atF = [0, 1].map(t => CH.bakeImpostor('foot', this.meshes.footMid, this.vatF, t, { views: 8, frames: 8, cw: 32, ch: 48 })); this.atH = [0, 1].map(t => CH.bakeImpostor('horse', this.meshes.hrsMid, this.vatH, t, { views: 8, frames: 8, cw: 64, ch: 64 }));
    this.bakeMs = performance.now() - tb;
    const K = { frow: this.vatF.rows.map(r => r + '.0').join(','), hrow: this.vatH.rows.map(r => r + '.0').join(',') }; this.K = K; this.NBF = CH.FOOT_RIG.n; this.NBM = CH.HORSE_RIG.n;
    // textures
    const tex = (name, w_, h_, ifmt, fmt, type, data, filt = gl.NEAREST, wrap = gl.CLAMP_TO_EDGE, bytes) => { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, ifmt, w_, h_, 0, fmt, type, data); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filt); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filt === gl.NEAREST ? gl.NEAREST : gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap); this.track('textures', name, bytes ?? w_ * h_ * 4); return t; };
    const padTex = (arr, texels) => { const rows = Math.ceil(texels / TW), d = new Float32Array(TW * rows * 4); d.set(arr); return { d, rows }; };
    const s0 = padTex(w.sold, w.count), s1 = padTex(w.sold1, w.count), un = padTex(w.unitF, w.units.length * 3);
    this.t = {}; this.t.sold0 = tex('soldiers.a', TW, s0.rows, gl.RGBA32F, gl.RGBA, gl.FLOAT, s0.d, gl.NEAREST, gl.CLAMP_TO_EDGE, TW * s0.rows * 16); this.t.sold1 = tex('soldiers.b', TW, s1.rows, gl.RGBA32F, gl.RGBA, gl.FLOAT, s1.d, gl.NEAREST, gl.CLAMP_TO_EDGE, TW * s1.rows * 16); this.t.units = tex('units', TW, un.rows, gl.RGBA32F, gl.RGBA, gl.FLOAT, un.d, gl.NEAREST, gl.CLAMP_TO_EDGE, TW * un.rows * 16);
    this.t.height = tex('height r32f', T.N, T.N, gl.R32F, gl.RED, gl.FLOAT, T.heights, gl.LINEAR, gl.CLAMP_TO_EDGE, T.N * T.N * 4);
    const gd = new Float32Array(w.guns.length * 8); w.guns.forEach((g, i) => gd.set(g, i * 8)); this.t.guns = tex('guns', w.guns.length * 2, 1, gl.RGBA32F, gl.RGBA, gl.FLOAT, gd, gl.NEAREST, gl.CLAMP_TO_EDGE, gd.byteLength);
    this.t.vatF = tex('VAT foot rgba32f', this.vatF.w, this.vatF.h, gl.RGBA32F, gl.RGBA, gl.FLOAT, this.vatF.tex, gl.NEAREST, gl.CLAMP_TO_EDGE, this.vatF.tex.byteLength); this.t.vatH = tex('VAT horse rgba32f', this.vatH.w, this.vatH.h, gl.RGBA32F, gl.RGBA, gl.FLOAT, this.vatH.tex, gl.NEAREST, gl.CLAMP_TO_EDGE, this.vatH.tex.byteLength);
    const stack = (a) => { const W = a[0].W, H = a[0].H * 2, d = new Uint8Array(W * H * 4); d.set(a[0].img, 0); d.set(a[1].img, W * a[0].H * 4); return { W, H, d }; }; const sf = stack(this.atF), sh = stack(this.atH);
    this.t.atlasF = tex('atlas foot', sf.W, sf.H, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, sf.d, gl.LINEAR); this.t.atlasH = tex('atlas horse', sh.W, sh.H, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, sh.d, gl.LINEAR);
    this.impO = { foot: { views: 8, frames: 8, cw: 32, ch: 48, W: sf.W, H: sf.H, qh: 2.03, qw: 1.354, midy: 1.0 }, mnt: { views: 8, frames: 8, cw: 64, ch: 64, W: sh.W, H: sh.H, qh: 2.81, qw: 2.81, midy: 1.35 } };
    // aerial with mips
    { const base = o.base || './'; const blob = await (await fetch(base + 'data/aerial.jpg')).blob(); const bmp = await createImageBitmap(blob, { colorSpaceConversion: 'none', premultiplyAlpha: 'none' }); const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
      gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE); gl.texImage2D(gl.TEXTURE_2D, 0, gl.SRGB8_ALPHA8, gl.RGBA, gl.UNSIGNED_BYTE, bmp); gl.generateMipmap(gl.TEXTURE_2D); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT); const an = gl.getExtension('EXT_texture_filter_anisotropic'); if (an) gl.texParameterf(gl.TEXTURE_2D, an.TEXTURE_MAX_ANISOTROPY_EXT, 8); this.t.aerial = t; this.track('textures', 'aerial srgb+mips', bmp.width * bmp.height * 4 * 4 / 3); }
    // shadow maps
    this.t.sh = [0, 1].map(() => { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texStorage2D(gl.TEXTURE_2D, 1, gl.DEPTH_COMPONENT32F, o.shadowSize, o.shadowSize); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_FUNC, gl.LESS); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); this.track('textures', 'shadow maps 2x', o.shadowSize * o.shadowSize * 4); return t; });
    this.fbSh = this.t.sh.map(t => { const f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, t, 0); gl.drawBuffers([gl.NONE]); gl.readBuffer(gl.NONE); return f; });
    // buffers
    const B = (name, target, data, usage = gl.STATIC_DRAW) => { const b = gl.createBuffer(); gl.bindBuffer(target, b); gl.bufferData(target, data, usage); this.track('buffers', name, data.byteLength ?? data); return b; };
    this.ub = B('frame uniforms', gl.UNIFORM_BUFFER, FU_BYTES * 3, gl.DYNAMIC_DRAW); const pal = new Float32Array(64 * 4); for (let t = 0; t < 2; t++) for (let m = 0; m < 16; m++) { const c = CH.PALETTE[t][m]; pal.set([c[0], c[1], c[2], c[3]], (t * 16 + m) * 8); pal.set([c[4], 0, 0, 0], (t * 16 + m) * 8 + 4); } this.palB = B('palette', gl.UNIFORM_BUFFER, pal);
    this.cfg = { nearR: o.nearR, midR: o.midR, nearMax: o.nearMax, midMax: o.midMax, nearMntMax: o.nearMntMax, midMntMax: o.midMntMax }; this.L = makeLists(this.cfg);
    this.listB = { nearFoot: B('list.nearFoot', gl.ARRAY_BUFFER, o.nearMax * 4, gl.DYNAMIC_DRAW), midFoot: B('list.midFoot', gl.ARRAY_BUFFER, o.midMax * 4, gl.DYNAMIC_DRAW), nearMnt: B('list.nearMnt', gl.ARRAY_BUFFER, o.nearMntMax * 4, gl.DYNAMIC_DRAW), midMnt: B('list.midMnt', gl.ARRAY_BUFFER, o.midMntMax * 4, gl.DYNAMIC_DRAW) };
    const farF = [], farM = []; for (let i = 0; i < w.count; i++) (w.units[w.sold[i * 4 + 3]].klass === 1 ? farM : farF).push(i); this.farN = { foot: farF.length, mnt: farM.length };
    this.farB = { foot: B('far.foot', gl.ARRAY_BUFFER, new Uint32Array(farF)), mnt: B('far.mnt', gl.ARRAY_BUFFER, new Uint32Array(farM)) };
    this.poseF = new Float32Array(o.nearMax * this.NBF * 12); this.poseM = new Float32Array(o.nearMntMax * this.NBM * 12);
    this.t.poseF = tex('pose.foot', this.NBF * 3, o.nearMax, gl.RGBA32F, gl.RGBA, gl.FLOAT, null, gl.NEAREST, gl.CLAMP_TO_EDGE, this.poseF.byteLength); this.t.poseM = tex('pose.mounted', this.NBM * 3, o.nearMntMax, gl.RGBA32F, gl.RGBA, gl.FLOAT, null, gl.NEAREST, gl.CLAMP_TO_EDGE, this.poseM.byteLength);
    this.t.ev = tex('events', 8192, 1, gl.RGBA32F, gl.RGBA, gl.FLOAT, null, gl.NEAREST, gl.CLAMP_TO_EDGE, 8192 * 16);
    const mk = (m, nm) => ({ vb: B(nm + '.vb', gl.ARRAY_BUFFER, m.verts), ib: B(nm + '.ib', gl.ELEMENT_ARRAY_BUFFER, m.idx), n: m.idx.length, tris: m.ntri });
    this.g = { footNear: mk(this.meshes.footNear, 'foot.near'), footMid: mk(this.meshes.footMid, 'foot.mid'), hrsNear: mk(this.meshes.hrsNear, 'horse.near'), hrsMid: mk(this.meshes.hrsMid, 'horse.mid'), gun: mk(this.meshes.gun, 'gun') };
    this.makeTerrainMeshes(B); this.fx = new FX(w);
    this.buildPrograms(); this.makeVAOs(); this.resize(this.canvas.width, this.canvas.height);
    this.qring = []; this.initMs = performance.now() - t0; this.fu = new Float32Array(FU_BYTES * 3 / 4); this.qi = 0;
  }
  makeTerrainMeshes(B) {
    const gl = this.gl; const mk = (G) => { const n = G + 3, v = new Float32Array(n * n * 3), idx = []; for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const ii = i - 1, jj = j - 1; const sk = (ii < 0 || ii > G || jj < 0 || jj > G) ? 1 : 0; v.set([Math.min(Math.max(ii, 0), G) / G, Math.min(Math.max(jj, 0), G) / G, sk], (j * n + i) * 3); }
      for (let j = 0; j < n - 1; j++) for (let i = 0; i < n - 1; i++) { const a = j * n + i; idx.push(a, a + n, a + 1, a + 1, a + n, a + n + 1); } const ia = new Uint32Array(idx); return { vb: B('terrain.vb' + G, gl.ARRAY_BUFFER, v), ib: B('terrain.ib' + G, gl.ELEMENT_ARRAY_BUFFER, ia), n: ia.length }; };
    this.tm = [mk(96), mk(48), mk(24)]; this.chunks = 16; this.chunkBuf = [0, 1, 2].map(i => B('terrain.chunks' + i, gl.ARRAY_BUFFER, 256 * 16, gl.DYNAMIC_DRAW));
  }
  prog(name, vs, fs, defs = '') {
    const gl = this.gl; const K = this.K; const mkS = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const v = mkS(gl.VERTEX_SHADER, PRE(K).replace('#version 300 es', '#version 300 es\n' + defs) + vs), f = fs.startsWith('#version') ? mkS(gl.FRAGMENT_SHADER, fs) : mkS(gl.FRAGMENT_SHADER, PRE(K).replace('#version 300 es', '#version 300 es\n' + defs) + fs);
    const p = gl.createProgram(); gl.attachShader(p, v); gl.attachShader(p, f); gl.linkProgram(p); p.name = name; p.v = v; p.f = f; (this.progs ||= []).push(p); return p;
  }
  finishProgs() {
    const gl = this.gl; for (const p of this.progs) { if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { console.error('link', p.name, gl.getProgramInfoLog(p), '\nVS:', gl.getShaderInfoLog(p.v), '\nFS:', gl.getShaderInfoLog(p.f)); throw new Error('shader ' + p.name); }
      gl.useProgram(p); const bi = gl.getUniformBlockIndex(p, 'FU'); if (bi !== 0xFFFFFFFF) gl.uniformBlockBinding(p, bi, 0); const pi = gl.getUniformBlockIndex(p, 'PalU'); if (pi !== 0xFFFFFFFF) gl.uniformBlockBinding(p, pi, 1);
      const set = (n, u) => { const l = gl.getUniformLocation(p, n); if (l) gl.uniform1i(l, u); }; set('uHeight', 0); set('uAerial', 1); set('uSh0', 2); set('uSh1', 3); set('uSold0', 4); set('uSold1', 5); set('uUnits', 6); set('uVat', 7); set('uAtlas', 8); set('uPose', 9); set('uGuns', 10); set('uEv', 11); set('uSrc', 12); set('uHdr', 12); set('uDepthT', 13); set('uBloom', 14); set('uDepth', 13); }
  }
  buildPrograms() {
    const gl = this.gl; this.P = {};
    this.P.terrain = this.prog('terrain', terrainVS, terrainFS); this.P.sky = this.prog('sky', skyVS, skyFS);
    for (const sh of [false, true]) { const s = sh ? 'S' : ''; const fsC = sh ? NOFS : charFS;
      this.P['nearFoot' + s] = this.prog('nearFoot' + s, nearVS(this.NBF), fsC); this.P['nearMnt' + s] = this.prog('nearMnt' + s, nearVS(this.NBM), fsC); this.P['mid' + s] = this.prog('mid' + s, midVS, fsC); this.P['gun' + s] = this.prog('gun' + s, gunVS, fsC); }
    this.P.impFoot = this.prog('impFoot', impVS(this.impO.foot), impFS); this.P.impMnt = this.prog('impMnt', impVS(this.impO.mnt), impFS); this.P.part = this.prog('part', partVS, partFS);
    this.P.pre = this.prog('pre', fsVS, preFS); this.P.blur = this.prog('blur', fsVS, blurFS); this.P.post = this.prog('post', fsVS, postFS);
    this.finishProgs();
  }
  makeVAOs() {
    const gl = this.gl; const vao = () => { const v = gl.createVertexArray(); gl.bindVertexArray(v); return v; };
    const mesh = (g, withJW) => { gl.bindBuffer(gl.ARRAY_BUFFER, g.vb); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 44, 0); gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 44, 12); gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 44, 24); if (withJW) { gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 4, gl.FLOAT, false, 44, 28); } gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, g.ib); };
    const list = (b) => { gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.enableVertexAttribArray(4); gl.vertexAttribIPointer(4, 1, gl.UNSIGNED_INT, 0, 0); gl.vertexAttribDivisor(4, 1); };
    this.V = {}; this.V.nearFoot = vao(); mesh(this.g.footNear, true); list(this.listB.nearFoot); this.V.nearMnt = vao(); mesh(this.g.hrsNear, true); list(this.listB.nearMnt);
    this.V.midFoot = vao(); mesh(this.g.footMid, false); list(this.listB.midFoot); this.V.midMnt = vao(); mesh(this.g.hrsMid, false); list(this.listB.midMnt); this.V.gun = vao(); mesh(this.g.gun, true);
    this.V.impFoot = vao(); list(this.farB.foot); this.V.impMnt = vao(); list(this.farB.mnt); this.V.empty = vao();
    this.V.terrain = this.tm.map((m, l) => { const v = vao(); gl.bindBuffer(gl.ARRAY_BUFFER, m.vb); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 12, 0); gl.bindBuffer(gl.ARRAY_BUFFER, this.chunkBuf[l]); gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 16, 0); gl.vertexAttribDivisor(1, 1); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, m.ib); return v; });
    gl.bindVertexArray(null);
  }
  resize(w, h) {
    const gl = this.gl; this.W = w; this.H = h; for (const k of ['hdr', 'depth', 'depthCopy', 'bloomA', 'bloomB', 'bloomC']) if (this.t[k]) gl.deleteTexture(this.t[k]); for (const k of ['fbScene', 'fbPart', 'fbDepthCopy', 'fbBA', 'fbBB', 'fbBC']) if (this[k]) gl.deleteFramebuffer(this[k]);
    const rt = (ifmt, fmt, type, w_, h_) => { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texStorage2D(gl.TEXTURE_2D, 1, ifmt, w_, h_); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); return t; };
    const s1 = [Math.max(1, w >> 1), Math.max(1, h >> 1)], s2 = [Math.max(1, w >> 2), Math.max(1, h >> 2)];
    this.t.hdr = rt(gl.RGBA16F, 0, 0, w, h); this.t.depth = rt(gl.DEPTH_COMPONENT32F, 0, 0, w, h); this.t.depthCopy = rt(gl.DEPTH_COMPONENT32F, 0, 0, w, h); this.t.bloomA = rt(gl.RGBA16F, 0, 0, ...s1); this.t.bloomB = rt(gl.RGBA16F, 0, 0, ...s2); this.t.bloomC = rt(gl.RGBA16F, 0, 0, ...s2);
    for (const k of ['depth', 'depthCopy']) { gl.bindTexture(gl.TEXTURE_2D, this.t[k]); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST); }
    const fb = (color, depth) => { const f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f); if (color) gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, color, 0); if (depth) gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, depth, 0); if (!color) { gl.drawBuffers([gl.NONE]); gl.readBuffer(gl.NONE); } return f; };
    this.fbScene = fb(this.t.hdr, this.t.depth); this.fbDepthCopy = fb(null, this.t.depthCopy); this.fbBA = fb(this.t.bloomA, null); this.fbBB = fb(this.t.bloomB, null); this.fbBC = fb(this.t.bloomC, null); gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this.mem.rt = w * h * (8 + 4 + 4) + s1[0] * s1[1] * 8 + 2 * s2[0] * s2[1] * 8;
  }
  cascade(center, R, size, out) { const L = this.sun; const eye = [center[0] + L[0] * (R + 500), center[1] + L[1] * (R + 500), center[2] + L[2] * (R + 500)]; const v = lookAt(eye, center, [0, 1, 0]); const texel = 2 * R / size;
    const cl = [v[0] * center[0] + v[4] * center[1] + v[8] * center[2] + v[12], v[1] * center[0] + v[5] * center[1] + v[9] * center[2] + v[13]]; const sx = cl[0] - Math.round(cl[0] / texel) * texel, sy = cl[1] - Math.round(cl[1] / texel) * texel;
    const p = ortho(-R - sx, R - sx, -R - sy, R - sy, 10, 2 * R + 1000); return mul(p, v, out); }
  writeFU(cam, t, block, vp, aspect) {
    const f = this.fu, o = block * (FU_BYTES / 4), T = this.w.T; f.set(vp, o); f.set(cam.prevVp, o + 16); f.set(cam.invVp, o + 32); f.set(this.sm0, o + 48); f.set(this.sm1, o + 64);
    const r = cam.right(), u = cam.up(), fw = cam.fwd; f.set([cam.x, cam.y, cam.z, t], o + 80); f.set([this.sun[0], this.sun[1], this.sun[2], 3.1], o + 84); f.set([this.W, this.H, 1 / this.W, 1 / this.H], o + 88); f.set([T.W, T.H, T.N, T.hmin], o + 92); f.set([T.hmax - T.hmin, this.o.fxAlpha ?? 1, 0, 0], o + 96);
    f.set([this.o.nearR, this.o.midR, 9000, cam.far], o + 100); f.set([...r, 0], o + 104); f.set([...u, 0], o + 108); f.set([...fw, 0], o + 112); f.set([Math.tan(cam.fov / 2), aspect, this.o.exposure, cam.near], o + 116);
    f.set([this.focus ?? 80, this.o.flags.dof ? (this.o.dofStrength ?? 1) : 0, this.o.flags.mblur ? (this.o.mblurStrength ?? 1) : 0, 1 / this.o.shadowSize], o + 120);
  }
  bindCommon() { const gl = this.gl; const b = (u, t) => { gl.activeTexture(gl.TEXTURE0 + u); gl.bindTexture(gl.TEXTURE_2D, t); }; b(0, this.t.height); b(1, this.t.aerial); b(2, this.t.sh[0]); b(3, this.t.sh[1]); b(4, this.t.sold0); b(5, this.t.sold1); b(6, this.t.units); b(10, this.t.guns); gl.bindBufferBase(gl.UNIFORM_BUFFER, 1, this.palB); }
  setBlock(block) { const gl = this.gl; gl.bindBufferRange(gl.UNIFORM_BUFFER, 0, this.ub, block * FU_BYTES, FU_BYTES); }
  frame(t, cam) {
    const tf0 = performance.now(), o = this.o, F = o.flags, w = this.w, T = w.T, gl = this.gl; const aspect = this.W / this.H; const st = this.stats = {};
    const s = o.sunDir, sl = Math.hypot(...s); this.sun = [s[0] / sl, s[1] / sl, s[2] / sl]; cam.update(aspect);
    // GL clip space: remap the projection z from [0,1] to [-1,1]
    const fw = cam.fwd; const c0 = [cam.x + fw[0] * 28, Math.max(T.h(cam.x + fw[0] * 28, cam.z + fw[2] * 28), 0) + 2, cam.z + fw[2] * 28]; const c1 = [cam.x + fw[0] * 150, T.h(cam.x + fw[0] * 150, cam.z + fw[2] * 150) + 2, cam.z + fw[2] * 150];
    this.sm0 = this.cascade(c0, 45, o.shadowSize, this.sm0 || new Float32Array(16)); this.sm1 = this.cascade(c1, 260, o.shadowSize, this.sm1 || new Float32Array(16));
    this.glVp = this.glVp || new Float32Array(16); this.glVp.set(cam.vp); for (let i = 0; i < 4; i++) { this.glVp[i * 4 + 2] = cam.vp[i * 4 + 2] * 2 - cam.vp[i * 4 + 3]; }
    this.glPrev = this.glPrev || new Float32Array(16); this.glPrev.set(cam.prevVp); for (let i = 0; i < 4; i++) this.glPrev[i * 4 + 2] = cam.prevVp[i * 4 + 2] * 2 - cam.prevVp[i * 4 + 3];
    // invVp for GL ndc z in [-1,1]: invert glVp
    this.glInv = this.glInv || new Float32Array(16); invert(this.glVp, this.glInv);
    const camGL = { x: cam.x, y: cam.y, z: cam.z, right: () => cam.right(), up: () => cam.up(), fwd: cam.fwd, fov: cam.fov, near: cam.near, far: cam.far, prevVp: this.glPrev, invVp: this.glInv };
    const remap = (m, out) => { out.set(m); for (let i = 0; i < 4; i++) out[i * 4 + 2] = m[i * 4 + 2] * 2 - m[i * 4 + 3]; return out; }; this.sm0g = remap(this.sm0, this.sm0g || new Float32Array(16)); this.sm1g = remap(this.sm1, this.sm1g || new Float32Array(16));
    this.writeFU(camGL, t, 0, this.glVp, aspect); this.writeFU(camGL, t, 1, this.sm0g, aspect); this.writeFU(camGL, t, 2, this.sm1g, aspect); gl.bindBuffer(gl.UNIFORM_BUFFER, this.ub); gl.bufferSubData(gl.UNIFORM_BUFFER, 0, this.fu);
    const t1 = performance.now(); this.cfg.nearR = o.nearR; this.cfg.midR = o.midR; const L = selectLods(w, t, cam, cam.planes, this.cfg, this.L); const t2 = performance.now(); this.writePoses(L, t); const t3 = performance.now();
    const up = (buf, arr, n) => { if (!n) return; gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferSubData(gl.ARRAY_BUFFER, 0, arr, 0, n); };
    up(this.listB.nearFoot, L.nearFoot, L.nNF); up(this.listB.midFoot, L.midFoot, L.nMF); up(this.listB.nearMnt, L.nearMnt, L.nNM); up(this.listB.midMnt, L.midMnt, L.nMM);
    const tex2 = (tx, nb, rows, arr) => { if (!rows) return; gl.activeTexture(gl.TEXTURE9); gl.bindTexture(gl.TEXTURE_2D, tx); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, nb * 3, rows, gl.RGBA, gl.FLOAT, arr, 0); }; tex2(this.t.poseF, this.NBF, L.nNF, this.poseF); tex2(this.t.poseM, this.NBM, L.nNM, this.poseM);
    this.fx.update(t, cam); const nEv = this.fx.n; if (nEv) { gl.activeTexture(gl.TEXTURE11); gl.bindTexture(gl.TEXTURE_2D, this.t.ev); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, nEv * 2, 1, gl.RGBA, gl.FLOAT, this.fx.data()); } const t4 = performance.now();
    const nch = this.terrainChunks(cam); const t5 = performance.now();
    this.bindCommon();
    const qpass = (name, fn) => { if (!this.hasTS) { fn(); return; } const q = gl.createQuery(); gl.beginQuery(this.tq.TIME_ELAPSED_EXT, q); fn(); gl.endQuery(this.tq.TIME_ELAPSED_EXT); this.cur[name] = q; };
    this.cur = {};
    const drawChars = (sfx, shadow) => {
      if (F.near) { if (L.nNF) { gl.useProgram(this.P['nearFoot' + sfx]); gl.uniform1f(gl.getUniformLocation(this.P['nearFoot' + sfx], 'uAo'), 1); gl.activeTexture(gl.TEXTURE9); gl.bindTexture(gl.TEXTURE_2D, this.t.poseF); gl.bindVertexArray(this.V.nearFoot); gl.drawElementsInstanced(gl.TRIANGLES, this.g.footNear.n, gl.UNSIGNED_INT, 0, L.nNF); }
        if (L.nNM) { gl.useProgram(this.P['nearMnt' + sfx]); gl.uniform1f(gl.getUniformLocation(this.P['nearMnt' + sfx], 'uAo'), 1); gl.activeTexture(gl.TEXTURE9); gl.bindTexture(gl.TEXTURE_2D, this.t.poseM); gl.bindVertexArray(this.V.nearMnt); gl.drawElementsInstanced(gl.TRIANGLES, this.g.hrsNear.n, gl.UNSIGNED_INT, 0, L.nNM); } }
      if (F.mid) { gl.useProgram(this.P['mid' + sfx]); gl.uniform1f(gl.getUniformLocation(this.P['mid' + sfx], 'uAo'), 0);
        if (L.nMF) { gl.activeTexture(gl.TEXTURE7); gl.bindTexture(gl.TEXTURE_2D, this.t.vatF); gl.bindVertexArray(this.V.midFoot); gl.drawElementsInstanced(gl.TRIANGLES, this.g.footMid.n, gl.UNSIGNED_INT, 0, L.nMF); }
        if (L.nMM) { gl.activeTexture(gl.TEXTURE7); gl.bindTexture(gl.TEXTURE_2D, this.t.vatH); gl.bindVertexArray(this.V.midMnt); gl.drawElementsInstanced(gl.TRIANGLES, this.g.hrsMid.n, gl.UNSIGNED_INT, 0, L.nMM); } }
      if (F.guns) { gl.useProgram(this.P['gun' + sfx]); gl.uniform1f(gl.getUniformLocation(this.P['gun' + sfx], 'uAo'), 0); gl.bindVertexArray(this.V.gun); gl.drawElementsInstanced(gl.TRIANGLES, this.g.gun.n, gl.UNSIGNED_INT, 0, w.guns.length); }
    };
    if (F.shadows) for (let c = 0; c < 2; c++) qpass('shadow' + c, () => { gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbSh[c]); gl.viewport(0, 0, o.shadowSize, o.shadowSize); gl.depthMask(true); gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LESS); gl.clearDepth(1); gl.clear(gl.DEPTH_BUFFER_BIT); gl.disable(gl.CULL_FACE); gl.enable(gl.POLYGON_OFFSET_FILL); gl.polygonOffset(2.5, 3);
      // the shadow textures are bound for sampling by the common bind; unbind the one being written to avoid a feedback loop
      gl.activeTexture(gl.TEXTURE2 + c); gl.bindTexture(gl.TEXTURE_2D, null); this.setBlock(1 + c); drawChars('S'); if (this.ext) this.ext.shadow(gl, c, this); gl.disable(gl.POLYGON_OFFSET_FILL); gl.activeTexture(gl.TEXTURE2 + c); gl.bindTexture(gl.TEXTURE_2D, this.t.sh[c]); });
    qpass('scene', () => { gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbScene); gl.viewport(0, 0, this.W, this.H); gl.depthMask(true); gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LESS); gl.clearColor(.5, .6, .8, 1); gl.clearDepth(1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); this.setBlock(0); gl.disable(gl.BLEND);
      if (F.sky) { gl.depthFunc(gl.ALWAYS); gl.depthMask(false); gl.useProgram(this.P.sky); gl.bindVertexArray(this.V.empty); gl.drawArrays(gl.TRIANGLES, 0, 3); gl.depthMask(true); gl.depthFunc(gl.LESS); }
      gl.disable(gl.CULL_FACE); if (F.terrain) { gl.useProgram(this.P.terrain); for (let l = 0; l < 3; l++) if (this.chunkN[l]) { gl.bindVertexArray(this.V.terrain[l]); gl.drawElementsInstanced(gl.TRIANGLES, this.tm[l].n, gl.UNSIGNED_INT, 0, this.chunkN[l]); } }
      gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK); drawChars('');
      if (F.far) { gl.disable(gl.CULL_FACE); gl.useProgram(this.P.impFoot); gl.activeTexture(gl.TEXTURE8); gl.bindTexture(gl.TEXTURE_2D, this.t.atlasF); gl.bindVertexArray(this.V.impFoot); gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.farN.foot);
        gl.useProgram(this.P.impMnt); gl.bindTexture(gl.TEXTURE_2D, this.t.atlasH); gl.bindVertexArray(this.V.impMnt); gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.farN.mnt); }
      if (this.ext) this.ext.scene(gl, this); });       // optional extension hook (the Battle Theatre's structures); null in the prototype itself
    if (F.particles && nEv) qpass('particles', () => { // WebGL2 cannot sample the depth buffer it is testing against: blit a copy first (the cost is part of the measurement)
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this.fbScene); gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, this.fbDepthCopy); gl.blitFramebuffer(0, 0, this.W, this.H, 0, 0, this.W, this.H, gl.DEPTH_BUFFER_BIT, gl.NEAREST);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbScene); gl.depthMask(false); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.disable(gl.CULL_FACE); gl.useProgram(this.P.part); gl.activeTexture(gl.TEXTURE13); gl.bindTexture(gl.TEXTURE_2D, this.t.depthCopy); gl.activeTexture(gl.TEXTURE11); gl.bindTexture(gl.TEXTURE_2D, this.t.ev);
      gl.bindVertexArray(this.V.empty); gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, nEv * EV_PER); gl.disable(gl.BLEND); gl.depthMask(true); });
    const fsq = (prog, fb, vw, vh, sets) => { gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.viewport(0, 0, vw, vh); gl.disable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE); gl.useProgram(prog); sets?.(); gl.bindVertexArray(this.V.empty); gl.drawArrays(gl.TRIANGLES, 0, 3); };
    const tx = (u, t) => { gl.activeTexture(gl.TEXTURE0 + u); gl.bindTexture(gl.TEXTURE_2D, t); };
    this.setBlock(0);
    if (F.post && F.bloom) qpass('bloom', () => { const s1 = [Math.max(1, this.W >> 1), Math.max(1, this.H >> 1)], s2 = [Math.max(1, this.W >> 2), Math.max(1, this.H >> 2)];
      fsq(this.P.pre, this.fbBA, s1[0], s1[1], () => tx(12, this.t.hdr)); fsq(this.P.blur, this.fbBB, s2[0], s2[1], () => { tx(12, this.t.bloomA); gl.uniform2f(gl.getUniformLocation(this.P.blur, 'uDir'), 1, 0); }); fsq(this.P.blur, this.fbBC, s2[0], s2[1], () => { tx(12, this.t.bloomB); gl.uniform2f(gl.getUniformLocation(this.P.blur, 'uDir'), 0, 1); }); });
    qpass('post', () => { fsq(this.P.post, null, this.W, this.H, () => { tx(12, this.t.hdr); tx(13, this.t.depth); tx(14, this.t.bloomC); }); gl.enable(gl.DEPTH_TEST); });
    // timer queries: collect
    if (this.hasTS) { this.qring.push({ q: this.cur, F: { ...F }, nEv }); this.pollQueries(); }
    this.pendingSync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0); gl.flush(); const t6 = performance.now();
    Object.assign(st, { nearFoot: L.nNF, nearMnt: L.nNM, midFoot: L.nMF, midMnt: L.nMM, farFoot: this.farN.foot, farMnt: this.farN.mnt, unitsNear: L.unitsNear, soldiersTested: L.soldiersTested, events: nEv, terrainChunks: nch,
      tris: L.nNF * this.g.footNear.tris + L.nNM * this.g.hrsNear.tris + L.nMF * this.g.footMid.tris + L.nMM * this.g.hrsMid.tris + (this.farN.foot + this.farN.mnt) * 2 + this.terrainTris + w.guns.length * this.g.gun.tris * (F.guns ? 1 : 0) + nEv * EV_PER * 2,
      cpuMs: t6 - tf0, cpuLod: t2 - t1, cpuPose: t3 - t2, cpuFx: t4 - t3, cpuSetup: t1 - tf0, cpuTerrain: t5 - t4, cpuEncode: t6 - t5 });
    return st;
  }
  pollQueries() {
    const gl = this.gl; const disjoint = gl.getParameter(this.tq.GPU_DISJOINT_EXT); while (this.qring.length) { const e = this.qring[0]; const last = Object.values(e.q).at(-1); if (last && !gl.getQueryParameter(last, gl.QUERY_RESULT_AVAILABLE)) { if (this.qring.length > 8) { for (const q of Object.values(e.q)) gl.deleteQuery(q); this.qring.shift(); continue; } break; }
      this.qring.shift(); const ms = (n) => e.q[n] && !disjoint ? gl.getQueryParameter(e.q[n], gl.QUERY_RESULT) / 1e6 : 0; const g = { shadow0: ms('shadow0'), shadow1: ms('shadow1'), scene: ms('scene'), particles: ms('particles'), bloom: ms('bloom'), post: ms('post') }; g.total = g.shadow0 + g.shadow1 + g.scene + g.particles + g.bloom + g.post; this.gpuMs = g; for (const q of Object.values(e.q)) gl.deleteQuery(q); }
  }
  terrainChunks(cam) {
    const T = this.w.T, n = this.chunks, cs = T.W / n, csz = cs; const per = [[], [], []]; this.terrainTris = 0; let cnt = 0; const gl = this.gl;
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const x0 = -T.W / 2 + i * cs, z0 = -T.H / 2 + j * csz; const cx = x0 + cs / 2, cz = z0 + csz / 2; const cy = T.h(cx, cz); const r = cs * .75 + 40;
      const dx = Math.max(Math.abs(cx - cam.x) - cs / 2, 0), dz = Math.max(Math.abs(cz - cam.z) - csz / 2, 0), dist = Math.hypot(dx, dz, Math.max(cam.y - cy - 40, 0)); let ok = true; const pl = cam.planes; for (let k = 0; k < 24; k += 4) if (pl[k] * cx + pl[k + 1] * (cy + 20) + pl[k + 2] * cz + pl[k + 3] < -r) { ok = false; break; } if (!ok) continue;
      const lod = dist < 700 ? 0 : dist < 1800 ? 1 : 2; per[lod].push(x0, z0, cs, 0); this.terrainTris += this.tm[lod].n / 3; cnt++; }
    this.chunkN = per.map((a, l) => { const f = new Float32Array(a); if (f.length) { gl.bindBuffer(gl.ARRAY_BUFFER, this.chunkBuf[l]); gl.bufferSubData(gl.ARRAY_BUFFER, 0, f); } return f.length / 4; }); return cnt;
  }
  writePoses(L, t) { const o = [0, 0, 0]; const pose = this._pose || (this._pose = [CH.newPose(CH.FOOT_RIG), CH.newPose(CH.HORSE_RIG)]); const w = this.w;
    for (let k = 0; k < L.nNF; k++) { soldierClip(w, L.nearFoot[k], t, o); CH.poseFoot(pose[0], o[0], o[1], o[2]); CH.fk(CH.FOOT_RIG, pose[0], this.poseF, k * this.NBF * 12); }
    for (let k = 0; k < L.nNM; k++) { soldierClip(w, L.nearMnt[k], t, o); CH.poseHorse(pose[1], o[0], o[1], o[2]); CH.fk(CH.HORSE_RIG, pose[1], this.poseM, k * this.NBM * 12); } }
  onDone() { const gl = this.gl, s = this.pendingSync; return new Promise(res => { const chk = () => { const r = gl.clientWaitSync(s, 0, 0); if (r === gl.ALREADY_SIGNALED || r === gl.CONDITION_SATISFIED) { gl.deleteSync(s); res(); } else if (r === gl.WAIT_FAILED) res(); else setTimeout(chk, 1); }; chk(); }); }
  memoryBytes() { return this.mem.buffers + this.mem.textures + (this.mem.rt || 0); }
}
