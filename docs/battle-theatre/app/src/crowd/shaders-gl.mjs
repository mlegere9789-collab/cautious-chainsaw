// WebGL2 shaders of the figure pass. They are appended to the prototype renderer's own preamble (webgl2.mjs PRE: frame block FU, hAt, place, shadowAt, lit, fogged, rotY, hsh ...) by GLRenderer.prog().
//   MID    LOD1 / LOD2 class meshes (36 bone skeleton) and the horse: skinned from the bone-matrix texture, two frames of two clips blended in the vertex shader. One instance = one figure.
//   NEAR   LOD0 parts: skinned from a per-figure 61 bone palette texture written by the CPU (anim3d sampleFigure + foot planting).
//   IMP    far impostors: one instance per world figure (all of them), placed by the prototype's own place() from the unit / soldier tables; the baked views carry material ids, colours come from the outfit variant.
import { MATC, NSLOT } from './tables.mjs';

export const HEAD = `
precision highp usampler2D; precision highp sampler2DArray;
uniform highp sampler2D uPal; uniform highp usampler2D uInst; uniform highp usampler2D uVarInfo; uniform highp sampler2D uVarPal;
uvec4 instOf(uint i) { return texelFetch(uInst, ivec2(int(i & 4095u), int(i >> 12u)), 0); }
uvec4 varInfoOf(uint v) { return texelFetch(uVarInfo, ivec2(int(v & 4095u), int(v >> 12u)), 0); }
float statureOf(uvec4 w) { return 0.93 + 0.115 * float((w.z >> 8u) & 255u) / 255.0; }
// the words the fragment shader needs: the instance record, with the flag kind (bits 16..23) and the army (bit 24) of the outfit variant put in the unused hint byte of w3
uvec4 wordsOf(uint fig) { uvec4 w = instOf(fig); uvec4 vi = varInfoOf(w.x & 65535u); w.w = (w.w & 65535u) | ((vi.w >> 8u) << 16u) | ((vi.w & 255u) << 24u); return w; }
struct MatR { vec3 alb; float rough; float metal; };
vec3 applyWear(vec3 c, float wear, float tv, float tw) {
  float fade = 0.18 * wear; float L = dot(c, vec3(0.3, 0.59, 0.11)); c += (vec3(L * 1.02, L, L * 0.96) - c) * fade;
  c += (vec3(0.30, 0.26, 0.14) - c) * (0.12 * wear); float s = 1.0 + tv; return clamp(vec3(c.r * s + tw * 0.4, c.g * s, c.b * s - tw * 0.4), 0.0, 1.0);
}
MatR resolveMat(int m, uvec4 w) {
  vec4 g = texelFetch(uPal, ivec2(m, 0), 0); vec4 mt = texelFetch(uPal, ivec2(m, 1), 0); MatR r; r.alb = g.rgb; r.rough = g.a; r.metal = mt.x;
  if (mt.y > -0.5) { uint t = (w.x & 65535u) * ${NSLOT}u + uint(mt.y + 0.5); vec4 c = texelFetch(uVarPal, ivec2(int(t & 4095u), int(t >> 12u)), 0); if (c.r + c.g + c.b > 0.0) r.alb = c.rgb; }
  if (m == ${MATC.SKIN}) { r.alb = texelFetch(uPal, ivec2(64 + int((w.y >> 16u) & 255u), 0), 0).rgb; }
  else if (m == ${MATC.LIP}) { vec3 s = texelFetch(uPal, ivec2(64 + int((w.y >> 16u) & 255u), 0), 0).rgb; r.alb = vec3(s.r * 0.80, s.g * 0.42, s.b * 0.45); }
  else if (m == ${MATC.HAIR} || m == ${MATC.HAIR_CARD} || m == ${MATC.BEARD_CARD}) { r.alb = texelFetch(uPal, ivec2(80 + int((w.y >> 27u) & 7u), 0), 0).rgb; if (((w.y >> 30u) & 3u) > 0u) r.alb = r.alb * 0.5 + 0.13; }
  else if (m == ${MATC.IRIS}) { r.alb = texelFetch(uPal, ivec2(88 + int((w.z >> 3u) & 7u), 0), 0).rgb; }
  else if (m == ${MATC.FLAG_WHITE}) { uint fk = (w.w >> 16u) & 255u; if (fk > 0u) r.alb = texelFetch(uPal, ivec2(int(fk), 2), 0).rgb; }
  if (mt.z > 0.5) { float wear = float((w.z >> 16u) & 255u) / 255.0; float tv = (float((w.z >> 24u) & 15u) / 15.0 - 0.5) * 0.16; float tw = (float((w.z >> 28u) & 15u) / 15.0 - 0.5) * 0.08; r.alb = applyWear(r.alb, wear, tv, tw); }
  return r;
}
float ign(vec2 p) { return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }
`;

const OUT = `out vec3 vWp; out vec3 vN; flat out uint vMat; flat out uint vFl; flat out uvec4 vW;`;
const ATTR = `layout(location=0) in vec3 aPos; layout(location=1) in vec4 aNrm; layout(location=2) in uvec2 aMF; layout(location=3) in uvec4 aJ; layout(location=4) in vec4 aW;
layout(location=5) in vec4 iP; layout(location=6) in vec4 iA; layout(location=7) in uvec4 iI;`;
const FINISH = `
  uvec4 w = wordsOf(iI.x); float sc = statureOf(w); vec3 wp = vec3(iP.x, hAt(iP.x, iP.y), iP.y) + rotY(iP.z, sp * sc);
  vWp = wp; vN = rotY(iP.z, normalize(sn + vec3(1e-6))); vMat = aMF.x; vFl = aMF.y; vW = w; gl_Position = vp * vec4(wp, 1.0);`;

// LOD1, LOD2 and horses: bone-matrix texture, two clips x two frames (A, B blended by iA.z); iI.y = rowsA (frame0 | frame1 << 16), iI.z = rowsB, iA.x / iA.y = the fraction between the frames
export const MID_VS = `${ATTR}
uniform highp sampler2D uBones; uniform int uTpf; ${OUT}
void fetchM(uint g, int b, out vec4 r0, out vec4 r1, out vec4 r2) { int x = int(g & 1u) * uTpf + b * 3, y = int(g >> 1u); r0 = texelFetch(uBones, ivec2(x, y), 0); r1 = texelFetch(uBones, ivec2(x + 1, y), 0); r2 = texelFetch(uBones, ivec2(x + 2, y), 0); }
void main() {
  uint rA0 = iI.y & 65535u, rA1 = iI.y >> 16u, rB0 = iI.z & 65535u, rB1 = iI.z >> 16u; float fA = iA.x, fB = iA.y, wB = iA.z; vec3 sp = vec3(0.0), sn = vec3(0.0); vec3 n = aNrm.xyz;
  for (int k = 0; k < 4; k++) { float wk = aW[k]; if (wk <= 0.0) continue; int b = int(aJ[k]); vec4 a0, a1, a2, c0, c1, c2;
    fetchM(rA0, b, a0, a1, a2); fetchM(rA1, b, c0, c1, c2); a0 = mix(a0, c0, fA); a1 = mix(a1, c1, fA); a2 = mix(a2, c2, fA);
    if (wB > 0.0) { vec4 b0, b1, b2; fetchM(rB0, b, b0, b1, b2); fetchM(rB1, b, c0, c1, c2); b0 = mix(b0, c0, fB); b1 = mix(b1, c1, fB); b2 = mix(b2, c2, fB); a0 = mix(a0, b0, wB); a1 = mix(a1, b1, wB); a2 = mix(a2, b2, wB); }
    sp += wk * vec3(dot(a0.xyz, aPos) + a0.w, dot(a1.xyz, aPos) + a1.w, dot(a2.xyz, aPos) + a2.w); sn += wk * vec3(dot(a0.xyz, n), dot(a1.xyz, n), dot(a2.xyz, n)); }
  ${FINISH}
}`;
// LOD0: the palette of figure iI.y (slot) is 61 bones x 3 texels of the pose texture
export const NEAR_VS = `${ATTR}
uniform highp sampler2D uPoseL0; ${OUT}
void main() {
  int slot = int(iI.y); vec3 sp = vec3(0.0), sn = vec3(0.0); vec3 n = aNrm.xyz;
  for (int k = 0; k < 4; k++) { float wk = aW[k]; if (wk <= 0.0) continue; int b = int(aJ[k]) * 3; vec4 a0 = texelFetch(uPoseL0, ivec2(b, slot), 0), a1 = texelFetch(uPoseL0, ivec2(b + 1, slot), 0), a2 = texelFetch(uPoseL0, ivec2(b + 2, slot), 0);
    sp += wk * vec3(dot(a0.xyz, aPos) + a0.w, dot(a1.xyz, aPos) + a1.w, dot(a2.xyz, aPos) + a2.w); sn += wk * vec3(dot(a0.xyz, n), dot(a1.xyz, n), dot(a2.xyz, n)); }
  ${FINISH}
}`;
export const FIG_FS = `in vec3 vWp; in vec3 vN; flat in uint vMat; flat in uint vFl; flat in uvec4 vW; out vec4 o; uniform float uAo;
void main() {
  if ((int(vMat) == ${MATC.HAIR_CARD} || int(vMat) == ${MATC.BEARD_CARD}) && vFl > 0u && float(vFl & 31u) / 31.0 < ign(gl_FragCoord.xy)) discard;
  MatR m = resolveMat(int(vMat), vW); vec3 N = normalize(vN); float sh = shadowAt(vWp); float ao = uAo > 0.5 ? clamp(0.55 + 0.45 * smoothstep(0.0, 1.2, vWp.y - hAt(vWp.x, vWp.z)), 0.0, 1.0) : 0.8;
  o = vec4(fogged(lit(m.alb, m.rough, m.metal, N, vWp, sh, ao), vWp), 1.0);
}`;
export const NOFS = '#version 300 es\nprecision highp float; out vec4 o; void main() { o = vec4(0.0); }';

// far impostors. uImpMeta: RGBA32F, one texel per class (height_m, ppm, 0, 0). uR.x = the radius inside which the 3D figures are drawn (the CPU draws every figure nearer than this with a mesh)
export const IMP_VS = `uniform highp sampler2D uImpMeta; uniform vec4 uR; float hash1(uint n) { return hsh(n * 7u + 3u); }
out vec3 vWp; out vec2 vQ; flat out uvec4 vW; flat out vec4 vV; flat out vec3 vRt;
void main() {
  gl_Position = vec4(2.0, 2.0, 2.0, 1.0); vWp = vec3(0.0); vQ = vec2(0.0); vW = uvec4(0u); vV = vec4(0.0); vRt = vec3(0.0);
  Pl p = place(gl_InstanceID, cam.w); vec3 d3 = p.pos + vec3(0.0, 0.9, 0.0) - cam.xyz; float dist = length(d3); if (dist < uR.x * 0.995 || dist > lod.z) return;
  uvec4 w = wordsOf(uint(gl_InstanceID)); uvec4 vi = varInfoOf(w.x & 65535u); int cls = int(vi.z); vec4 meta = texelFetch(uImpMeta, ivec2(cls, 0), 0); float sc = statureOf(w);
  float ppm = meta.y, hm = meta.x; float qh = 64.0 / ppm * sc, qw = 48.0 / ppm * sc, yb = (hm * 0.5 - 32.0 / ppm) * sc;
  float pxPerM = scr.y * 0.5 / (misc.x * dist), hpx = qh * pxPerM, dab = 0.0;
  if (hpx < 7.0) { qh = max(qh, 3.0 / pxPerM); qw = max(qw, 1.7 / pxPerM); dab = clamp(hpx / 3.0, 0.12, 1.0); }
  vec3 toCam = normalize(vec3(-d3.x, 0.0, -d3.z)); vec3 right = vec3(toCam.z, 0.0, -toCam.x); float cx = float(gl_VertexID & 1) * 2.0 - 1.0; float cy = float((gl_VertexID >> 1) & 1);
  vec3 wp = p.pos + right * (cx * qw * 0.5) + vec3(0.0, yb + cy * qh, 0.0); gl_Position = vp * vec4(wp, 1.0); vWp = wp; vQ = vec2(cx * 0.5 + 0.5, cy);
  float hh = p.head, c = cos(hh), s = sin(hh); float dxm = toCam.x * c - toCam.z * s, dzm = toCam.x * s + toCam.z * c; float yaw = atan(dxm, dzm); if (yaw < 0.0) yaw += 6.2831853;
  float view = mod(floor(yaw / 6.2831853 * 8.0 + 0.5), 8.0); vV = vec4(view, float(cls), dab, hash1(uint(gl_InstanceID))); vW = w; vRt = right;
}`;
export const IMP_FS = `uniform highp sampler2DArray uImp; in vec3 vWp; in vec2 vQ; flat in uvec4 vW; flat in vec4 vV; flat in vec3 vRt; out vec4 o;
void main() {
  vec3 toCam = normalize(cam.xyz - vWp); vec3 hc = normalize(vec3(toCam.x, 0.0, toCam.z));
  if (vV.z > 0.0) { int mm = vQ.y > 0.45 ? ${MATC.COAT} : ${MATC.TROUSERS}; MatR m = resolveMat(mm, vW); if (fract(ign(gl_FragCoord.xy) + vV.w) > vV.z) discard; o = vec4(fogged(lit(m.alb, m.rough, m.metal, normalize(hc * 0.7 + vec3(0.0, 0.7, 0.0)), vWp, 1.0, 0.8), vWp), 1.0); return; }
  int px = int(vV.x) * 48 + clamp(int(vQ.x * 48.0), 0, 47), py = clamp(int((1.0 - vQ.y) * 64.0), 0, 63); vec4 t = texelFetch(uImp, ivec3(px, py, int(vV.y)), 0); int mat = int(t.r * 255.0 + 0.5); if (mat == 0) discard;
  float nx = t.g * 2.0 - 1.0, ny = t.b * 2.0 - 1.0, nz = sqrt(max(0.0, 1.0 - nx * nx - ny * ny)); vec3 N = normalize(vRt * nx + vec3(0.0, 1.0, 0.0) * ny + hc * nz);
  MatR m = resolveMat(mat, vW); o = vec4(fogged(lit(m.alb, m.rough, m.metal, N, vWp, 1.0, 0.55 + 0.45 * t.a), vWp), 1.0);
}`;
