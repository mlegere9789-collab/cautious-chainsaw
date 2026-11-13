// Draws the vegetation of July 1863 into the theatre's WebGL2 scene through the renderer's hook (host.addSceneHook): the ground cover of every unit (crop, meadow, stubble, trampled
// ground, woodlot floor) as a mesh laid on the terrain, and the trees (woodlots, orchards, tree clusters, witness trees) as instanced, shape-parametrised crowns. Everything drawn is a
// function of the clock, the camera, the choices and the switches: the per-unit state is written to a small float texture from model.stateAt at a quantised minute, the trample table
// is a texture of first-visit minutes, and the shaders read both. WebGL2 only: on WebGPU nothing here draws (the module says so in its panel).
import { LAYER, CHUNK_M, TREE_STRIDE, selectChunks } from './mesh.mjs';
import { stateAt } from './model.mjs';
import { perspective, lookAt, mul, frustumPlanes, sphereInFrustum } from '../../../../render/prototype/src/math.mjs';

export const STATE_TEX_W = 1024;
let TEX_STATE = 28, TEX_VISIT = 29;               // texture units: above the renderer's own (0 to 15), the weather's (12 to 15) and the crowd's (16 to 23); lowered to the last two a small driver offers
const CROPCODE = { forest_floor: 0, wheat: 1, rye: 2, barley: 3, oats: 4, corn: 5, hay: 6, pasture: 7, open_rock: 8, marsh: 9, rock: 10 };
const STAGECODE = { being_cut: 1, cut_shocked: 2, stubble: 3, mown: 4, hay_stubble: 5, plowed: 6, winter_grain_sprouts: 7, corn_stubble: 8, dormant_grass: 9, dormant_marsh: 9, rock: 10, shaded_litter: 11, leaf_litter: 11 };
const TIERCODE = { documented: 0, inferred: 1, 'plausible-procedural': 2, 'open gap': 3 };
const STATE_K = 4;                                           // texels per unit
const smooth01 = x => { const t = Math.min(1, Math.max(0, x)); return t * t * (3 - 2 * t); };
const unpackPlain = gl => { gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false); };   // the pixel-store state is the context's, shared with every other layer

const COMMON = /* glsl */`
uniform sampler2D uVegState;
vec4 stx(int u, int k) { int i = u * 4 + k; return texelFetch(uVegState, ivec2(i & 1023, i >> 10), 0); }
float hv2(vec2 p) { ivec2 q = ivec2(floor(p)); return hsh((uint(q.x + 8192) * 73856093u) ^ (uint(q.y + 8192) * 19349663u)); }
float vn2(vec2 p) { vec2 i = floor(p); vec2 f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f); return mix(mix(hv2(i), hv2(i + vec2(1.0, 0.0)), u.x), mix(hv2(i + vec2(0.0, 1.0)), hv2(i + vec2(1.0, 1.0)), u.x), u.y); }
vec3 terrN(vec3 p) { float e = 3.0; float hx = hAt(p.x + e, p.z) - hAt(p.x - e, p.z); float hz = hAt(p.x, p.z + e) - hAt(p.x, p.z - e); return normalize(vec3(-hx, 2.0 * e, -hz)); }
const vec4 HID = vec4(2.0, 2.0, 2.0, 1.0);
float hln(float x, float period, float w) { float d = abs(fract(x / period) - 0.5) * 2.0; return smoothstep(1.0 - w, 1.0, d); }      // a thin line at every whole period
vec3 s2l(vec3 c) { return pow(max(c, vec3(0.0)), vec3(2.2)); }                 // the data's colours are sRGB (0 to 1); the renderer lights linear albedo (the same 2.2 the structures use)
`;

const DECAL_VS = /* glsl */`
layout(location=0) in vec4 a;            // x, z, unit, layer
out vec3 vWp; flat out float vU;
void main() {
  float g = hAt(a.x, a.y); float dist = length(vec3(a.x, g, a.y) - cam.xyz);
  float lift = 0.03 + a.w * 0.045 + dist * 0.0011 * (1.0 + a.w * 0.5);
  vWp = vec3(a.x, g + lift, a.y); vU = a.z; gl_Position = vp * vec4(vWp, 1.0);
}`;

const DECAL_FS = /* glsl */`
uniform sampler2D uVisit; uniform float uT; uniform vec4 uGrid; uniform float uOverlay; uniform float uVisitOn; uniform vec3 uTierCol[4];
in vec3 vWp; flat in float vU; out vec4 o;
void main() {
  int u = int(vU + 0.5);
  vec4 s0 = stx(u, 0), s1 = stx(u, 1), s2 = stx(u, 2), s3 = stx(u, 3);
  int crop = int(s0.w + 0.5);
  float hgt = s1.x, tr = s1.y, cutf = s1.z, lodge = s1.w; float tier = s2.x; float rows = s2.w; float stage = s3.x;
  vec2 xz = vWp.xz; float dist = length(vWp - cam.xyz);
  vec3 alb = s2l(s0.rgb);
  if (crop == 0) alb = mix(alb, s2l(s3.yzw), 0.9 * smoothstep(70.0, 520.0, dist));      // seen from far off, a wood is its canopy (in winter its bare crowns), not its floor; close to, the floor
  float n1 = vn2(xz * 0.045), n2 = vn2(xz * 0.31), n3 = vn2(xz * 1.9), n4 = vn2(xz * 7.3);
  bool ground = crop >= 1 && crop <= 7;
  float vis = (uVisitOn > 0.5 && ground) ? textureLod(uVisit, (xz - uGrid.xy) * uGrid.zw, 0.0).r : 1.0e9;
  float trV = vis < 1.0e8 ? smoothstep(vis, vis + 25.0, uT) : 0.0;
  float pch = n1 * 0.55 + n2 * 0.45;
  float trU = ground ? smoothstep(pch - 0.12, pch + 0.12, tr * 1.25) : 0.0;
  float trampled = max(trU, trV);
  float lodged = ground ? smoothstep(pch - 0.2, pch + 0.2, lodge * 1.4) : 0.0;
  vec3 col = alb * (0.88 + 0.24 * n1) * (0.93 + 0.14 * n2) * (0.95 + 0.1 * n3);
  float fine = 1.0 - smoothstep(30.0, 130.0, dist);
  float th = rows * 0.0174533;
  float across = dot(xz, vec2(cos(th), sin(th))), along = dot(xz, vec2(sin(th), -cos(th)));
  if (crop == 5 && stage < 0.5) { float r = abs(fract(across / 0.95) - 0.5) * 2.0; col *= 1.0 - 0.28 * fine * smoothstep(0.35, 0.95, r); }                        // corn rows
  else if (crop >= 1 && crop <= 4 && stage < 0.5) { float r = abs(fract(across / 0.19) - 0.5) * 2.0; col *= 1.0 - 0.07 * fine * r + 0.05 * fine * n4; }          // drilled grain
  else if (stage > 1.5 && stage < 2.5) { vec2 c = floor(vec2(across, along) / 3.2); float h = hv2(c); vec2 f = fract(vec2(across, along) / 3.2) - 0.5; float shock = step(h, 0.55) * (1.0 - smoothstep(0.1, 0.22, length(f))); col = mix(col, col * vec3(1.18, 1.1, 0.92), shock * fine); col *= 1.0 - 0.1 * (1.0 - fine) * 0.0; }  // shocks of cut grain
  else if (stage > 2.5 && stage < 3.5) { float r = abs(fract(across / 0.3) - 0.5) * 2.0; col *= 1.0 - 0.1 * fine * r; }                                              // stubble
  else if (stage > 3.5 && stage < 5.5) { float r = abs(fract(across / 3.4) - 0.5) * 2.0; col = mix(col, col * vec3(1.12, 1.06, 0.9), 0.35 * (1.0 - smoothstep(0.0, 0.5, r)) * fine); } // windrows
  else if (stage > 5.5 && stage < 6.5) { float r = abs(fract(across / 0.8) - 0.5) * 2.0; col *= 0.82 + 0.3 * r * fine + 0.1 * (1.0 - fine); }                              // plough furrows
  vec3 flatCol = col * vec3(0.80, 0.74, 0.60) * (0.9 + 0.2 * n4) + vec3(0.03, 0.02, 0.0);
  col = mix(col, flatCol, clamp(trampled * 0.85, 0.0, 1.0));
  col = mix(col, col * vec3(0.9, 0.88, 0.78), lodged * 0.5);
  if (uOverlay > 0.5) {
    int ti = int(tier + 0.5); vec3 tc = uTierCol[ti]; float hatch = 0.0;
    if (ti == 1) hatch = hln(xz.x + xz.y, 7.0, 0.2);
    else if (ti == 2) hatch = max(hln(xz.x + xz.y, 5.0, 0.2), hln(xz.x - xz.y, 5.0, 0.2));
    else if (ti == 3) hatch = step(0.5, fract(xz.x / 6.0)) * step(0.5, fract(xz.y / 6.0));
    col = mix(col, tc, 0.28 + 0.5 * hatch);
  }
  vec3 N = terrN(vWp);
  float bump = (crop >= 1 && crop <= 7) ? clamp(hgt, 0.0, 1.6) * 0.25 * (1.0 - 0.8 * trampled) : 0.0;
  vec3 Nb = normalize(N + bump * vec3(vn2(xz * 3.1) - 0.5, 0.0, vn2(xz * 3.1 + 17.0) - 0.5));
  float sh = shadowAt(vWp);
  o = vec4(fogged(lit(col, 0.97, 0.0, Nb, vWp, sh, 1.0), vWp), 1.0);
}`;

const TREE_VS_BODY = /* glsl */`
layout(location=0) in vec3 m;            // angle 0..1, v along the part 0..1, part (0 trunk, 1 crown)
layout(location=1) in vec4 ia;           // x, z, height, crown radius
layout(location=2) in vec4 ib;           // species, seed, strip draw, shape
layout(location=3) in float iu;          // unit
uniform float uFar; uniform float uTrunk;
float hash1(float x) { return fract(sin(x * 127.1 + 311.7) * 43758.5453); }
void treeGeom(out vec3 wp, out vec3 nrm, out float leaf, out float stripT, out float keepOut) {
  int u = int(iu + 0.5); vec4 s2 = stx(u, 2); leaf = s2.y; float stripU = s2.z; float seed = ib.y;
  stripT = step(ib.z, stripU);
  float dist = length(vec2(ia.x, ia.y) - cam.xz);
  float keep = uFar > 0.5 ? clamp(2.3 - dist * 0.00105, 0.32, 1.0) : 1.0; keepOut = keep;
  float h = ia.z, r = ia.w * (uFar > 0.5 ? inversesqrt(keep) : 1.0);
  r *= 1.0 - 0.25 * stripT; h *= 1.0 - 0.04 * stripT;
  float g = hAt(ia.x, ia.y); float ang = m.x * 6.2831853; float ca = cos(ang), sa = sin(ang); vec3 p;
  int shape = int(ib.w + 0.5);
  if (m.z < 0.5) { float trh = 0.42 * h; float tr = (0.5 - 0.28 * m.y) * min(0.55, 0.011 * h + 0.14); p = vec3(ca * tr, m.y * trh, sa * tr); nrm = vec3(ca, 0.0, sa); }
  else {
    float v = m.y; float q2 = 2.0 * v - 1.0; float ell = sqrt(max(0.0, 1.0 - q2 * q2)); float cone = 1.0 - v; float rad;
    float y0 = 0.34;
    if (shape == 0) rad = pow(ell, 0.8); else if (shape == 1) rad = ell * 0.8; else if (shape == 2) { rad = ell * 0.62; y0 = 0.3; } else if (shape == 3) { rad = cone * 0.92; y0 = 0.08; } else { rad = ell * 0.96; y0 = 0.36; }
    rad *= 0.86 + 0.28 * hash1(floor(m.x * 12.0 + 0.5) * 7.0 + v * 13.0 + seed * 31.0);
    float cy = y0 + v * (1.0 - y0);
    p = vec3(ca * rad * r, cy * h, sa * rad * r);
    nrm = normalize(vec3(ca * max(rad, 0.15), (v - 0.5) * (shape == 3 ? 0.9 : 1.2) + 0.15, sa * max(rad, 0.15)));
  }
  float yaw = seed * 6.2831853; float cy2 = cos(yaw), sy2 = sin(yaw); p = vec3(p.x * cy2 - p.z * sy2, p.y, p.x * sy2 + p.z * cy2); nrm = vec3(nrm.x * cy2 - nrm.z * sy2, nrm.y, nrm.x * sy2 + nrm.z * cy2);
  wp = vec3(ia.x + p.x, g + p.y, ia.y + p.z);
}`;

const TREE_VS = `${TREE_VS_BODY}
out vec3 vWp; out vec3 vN; flat out vec4 vInfo; flat out float vPart; out float vV;
void main() {
  vec3 wp, nrm; float leaf, stripT, keep; treeGeom(wp, nrm, leaf, stripT, keep);
  if (ib.y > keep || (m.z < 0.5 && uTrunk < 0.5)) { gl_Position = HID; vWp = vec3(0.0); vN = vec3(0.0, 1.0, 0.0); vInfo = vec4(0.0); vPart = 0.0; vV = 0.0; return; }
  vWp = wp; vN = nrm; vInfo = vec4(ib.x, ib.y, leaf * (1.0 - 0.75 * stripT), stripT); vPart = m.z; vV = m.y; gl_Position = vp * vec4(wp, 1.0);
}`;
const TREE_SHADOW_VS = `${TREE_VS_BODY}
void main() { vec3 wp, nrm; float leaf, stripT, keep; treeGeom(wp, nrm, leaf, stripT, keep); if (ib.y > keep || m.z < 0.5) { gl_Position = HID; return; } gl_Position = vp * vec4(wp, 1.0); }`;
const TREE_FS = /* glsl */`
uniform vec3 uSpA[24]; uniform vec3 uSpB[24];
in vec3 vWp; in vec3 vN; flat in vec4 vInfo; flat in float vPart; in float vV; out vec4 o;
void main() {
  float seed = vInfo.y; float leaf = vInfo.z; float stripT = vInfo.w; int sp = int(vInfo.x + 0.5);
  vec3 N = normalize(vN);
  vec3 col;
  if (vPart < 0.5) { col = s2l(vec3(0.24, 0.18, 0.12)) * (0.8 + 0.4 * hv2(vWp.xz * 3.0)); }
  else {
    float cover = clamp(leaf, 0.0, 1.0);
    float keep = hsh(uint(gl_FragCoord.x) * 1973u + uint(gl_FragCoord.y) * 9277u + uint(seed * 65535.0));
    if (keep > 0.12 + 0.88 * smoothstep(0.0, 0.9, cover)) discard;                 // a full canopy (0.92 to 1) has no holes; a thinning one is dithered
    vec3 green = mix(uSpA[sp], uSpB[sp], fract(seed * 7.31));
    vec3 bare = s2l(vec3(0.27, 0.22, 0.17)) * (0.8 + 0.4 * fract(seed * 3.7));
    col = mix(bare, green, smoothstep(0.35, 0.8, cover));
    col *= 0.82 + 0.3 * vV * 0.5 + 0.1 * hv2(vWp.xz * 1.7 + vWp.y);
    col = mix(col, col * vec3(0.7, 0.66, 0.6), stripT * 0.6);
  }
  float sh = shadowAt(vWp); float ao = vPart < 0.5 ? 0.5 : (0.5 + 0.5 * vV);
  vec3 c = lit(col, 0.95, 0.0, N, vWp, sh, ao);
  o = vec4(fogged(c, vWp), 1.0);
}`;

// ---------------------------------------------------------------------------------------------------------------------------------------------------------- meshes
/** crown and trunk as a parametrised grid: attributes (angle, v, part); a trunk of two rings only at the high level */
export function treeMesh(nAng, nCrown, withTrunk) {
  const v = [], idx = [];
  const ring = (vv, part) => { const base = v.length / 3; for (let i = 0; i < nAng; i++) v.push(i / nAng, vv, part); return base; };
  const link = (r0, r1) => { for (let i = 0; i < nAng; i++) { const j = (i + 1) % nAng; idx.push(r0 + i, r0 + j, r1 + i, r0 + j, r1 + j, r1 + i); } };
  if (withTrunk) { const a = ring(0, 0), b = ring(1, 0); link(a, b); }
  let prev = -1;
  for (let k = 0; k <= nCrown; k++) { const r = ring(k / nCrown, 1); if (prev >= 0) link(prev, r); prev = r; }
  // close the crown top and underside with the first and last rings collapsing to the axis through the profile (rad -> 0 at v=0,1 for ellipsoids)
  return { verts: new Float32Array(v), idx: new Uint16Array(idx) };
}

export class VegGL {
  constructor(host, model, decals, trees, opts = {}) {
    this.host = host; this.R = host.R; this.gl = host.R.gl; this.model = model; this.decals = decals; this.trees = trees; this.dead = false; this.stats = { decalTris: decals.triangles, trees: trees.n, treesDrawn: 0, chunksNear: 0, chunksFar: 0, stateWrites: 0 };
    const gl = this.gl, R = this.R; this.on = { ground: true, trees: true, overlay: false, visit: true };
    const units = gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS); if (units < 30) { TEX_STATE = units - 2; TEX_VISIT = units - 1; } else { TEX_STATE = 28; TEX_VISIT = 29; }
    const H = COMMON, made = [];
    try {
      const mk = (name, vs, fs) => { const p = R.prog(name, vs, fs); made.push(p); return p; };
      this.P = { decal: mk('veg-decal', H + DECAL_VS, H + DECAL_FS), tree: mk('veg-tree', H + TREE_VS, H + TREE_FS), shadow: mk('veg-tree-shadow', H + TREE_SHADOW_VS, '#version 300 es\nprecision highp float; out vec4 o; void main() { o = vec4(0.0); }') };
      R.finishProgs();
    } catch (e) {
      // a program that failed to compile or link stays in the renderer's list, and the renderer's own check of the list would then fail for every layer that starts after this one: take ours out
      if (Array.isArray(R.progs)) for (const p of made) { const i = R.progs.indexOf(p); if (i >= 0) R.progs.splice(i, 1); }
      for (const p of made) { try { gl.deleteProgram(p); } catch { /* gone */ } }
      throw e;
    }
    const set = (p, f) => { gl.useProgram(p); f(p); };
    for (const k of ['decal', 'tree', 'shadow']) set(this.P[k], p => { const l = gl.getUniformLocation(p, 'uVegState'); if (l) gl.uniform1i(l, TEX_STATE); });
    set(this.P.decal, p => { const l = gl.getUniformLocation(p, 'uVisit'); if (l) gl.uniform1i(l, TEX_VISIT); });
    this.U = { decal: Object.fromEntries(['uT', 'uGrid', 'uOverlay', 'uVisitOn', 'uTierCol'].map(n => [n, gl.getUniformLocation(this.P.decal, n)])), tree: Object.fromEntries(['uFar', 'uTrunk', 'uSpA', 'uSpB'].map(n => [n, gl.getUniformLocation(this.P.tree, n)])), shadow: Object.fromEntries(['uFar', 'uTrunk'].map(n => [n, gl.getUniformLocation(this.P.shadow, n)])) };
    const buf = (target, data, usage = gl.STATIC_DRAW) => { const b = gl.createBuffer(); gl.bindBuffer(target, b); gl.bufferData(target, data, usage); return b; };
    this.mem = 0;
    // ground cover
    this.B = { decal: buf(gl.ARRAY_BUFFER, decals.verts), tree: buf(gl.ARRAY_BUFFER, trees.data) }; this.mem += decals.verts.byteLength + trees.data.byteLength;
    this.V = {}; this.V.decal = gl.createVertexArray(); gl.bindVertexArray(this.V.decal); gl.bindBuffer(gl.ARRAY_BUFFER, this.B.decal); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 16, 0);
    // trees: two levels
    this.mesh = { near: treeMesh(11, 6, true), far: treeMesh(6, 3, false) }; this.M = {};
    for (const k of ['near', 'far']) {
      const me = this.mesh[k], vao = gl.createVertexArray(); gl.bindVertexArray(vao);
      const vb = buf(gl.ARRAY_BUFFER, me.verts), ib = buf(gl.ELEMENT_ARRAY_BUFFER, me.idx); gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 12, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.B.tree); for (const [loc, n, off] of [[1, 4, 0], [2, 4, 16], [3, 1, 32]]) { gl.enableVertexAttribArray(loc); gl.vertexAttribDivisor(loc, 1); gl.vertexAttribPointer(loc, n, gl.FLOAT, false, TREE_STRIDE * 4, off); }
      this.M[k] = { vao, vb, ib, n: me.idx.length }; this.mem += me.verts.byteLength + me.idx.byteLength;
    }
    gl.bindVertexArray(null);
    // textures: per-unit state, first-visit table
    this.rows = Math.max(1, Math.ceil((model.units.length + 1) * STATE_K / STATE_TEX_W)); this.stateBuf = new Float32Array(STATE_TEX_W * this.rows * 4);
    this.tex = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + TEX_STATE); gl.bindTexture(gl.TEXTURE_2D, this.tex); gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA32F, STATE_TEX_W, this.rows);
    for (const [a, b] of [[gl.TEXTURE_MIN_FILTER, gl.NEAREST], [gl.TEXTURE_MAG_FILTER, gl.NEAREST], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, a, b);
    this.mem += this.stateBuf.byteLength;
    this.visitTex = null; this.grid = null; this.tq = null; this.choicesKey = null;
    this.spA = new Float32Array(24 * 3); this.spB = new Float32Array(24 * 3); const lin = c => c.map(v => Math.pow(Math.max(0, v), 2.2)); model.speciesList.forEach((n, i) => { const c = model.species[n].color; this.spA.set(lin(c[0]), i * 3); this.spB.set(lin(c[1]), i * 3); });
    this.tierCol = new Float32Array([0.30, 0.78, 0.38, 0.95, 0.72, 0.18, 0.62, 0.36, 0.86, 0.60, 0.60, 0.60].map(v => Math.pow(v, 2.2)));
    // the colour of a woodlot seen from above: the mean of its species' mid colours (the data's shares), sRGB; the leaf cover mixes it with bare crowns at each time
    this.canopy = new Float32Array((model.units.length + 1) * 3);
    model.units.forEach((u, i) => { if (!u.woods) return; let w = 0, c = [0, 0, 0]; for (const [n, share] of Object.entries(u.woods.species)) { const sp = model.species[n]; if (!sp) continue; for (let k = 0; k < 3; k++) c[k] += share * (sp.color[0][k] + sp.color[1][k]) / 2; w += share; } for (let k = 0; k < 3; k++) this.canopy[i * 3 + k] = w ? c[k] / w : [0.2, 0.34, 0.13][k]; });
    this.vp = new Float32Array(16); this.view = new Float32Array(16); this.proj = new Float32Array(16); this.planes = new Float32Array(24);
    gl.activeTexture(gl.TEXTURE0);
  }

  /** writes the per-unit state texture for the quantised minute and the choices (only when either changed) */
  setTime(tq, choices, key) {
    if (tq === this.tq && key === this.choicesKey) return false; this.tq = tq; this.choicesKey = key; const gl = this.gl, b = this.stateBuf, M = this.model;
    for (let i = 0; i < M.units.length; i++) {
      const s = stateAt(M, M.units[i], tq, choices), g = s.ground, tr = s.trees, o = i * STATE_K * 4;
      if (g) {
        const code = CROPCODE[g.crop] ?? 0;
        b[o] = g.color[0]; b[o + 1] = g.color[1]; b[o + 2] = g.color[2]; b[o + 3] = code;
        b[o + 4] = (g.h[0] + g.h[1]) / 2; b[o + 5] = g.trample; b[o + 6] = g.cut; b[o + 7] = g.lodging; b[o + 12] = STAGECODE[g.stage] ?? 0; b[o + 13] = g.shockH ? (g.shockH[0] + g.shockH[1]) / 2 : 0;
      } else { b.fill(0, o, o + 16); }
      if (M.units[i].woods && tr) {                                                // texel 3, y z w: the canopy as seen from above (sRGB)
        const k = smooth01((tr.leaf - 0.35) / 0.45), bare = [0.27, 0.22, 0.17];
        for (let c = 0; c < 3; c++) b[o + 13 + c] = bare[c] + (this.canopy[i * 3 + c] - bare[c]) * k;
      }
      b[o + 8] = TIERCODE[s.tiers.stage || s.tiers.species || s.tier] ?? 2; b[o + 9] = tr ? tr.leaf : 1; b[o + 10] = tr ? tr.strip : 0; b[o + 11] = (M.units[i].p && M.units[i].p.rows_deg) || 0;
    }
    // the witness trees share the last pseudo-unit: full leaf
    const w = M.units.length * STATE_K * 4; if (w + 16 <= b.length) { b.fill(0, w, w + 16); b[w + 9] = 1; }
    gl.activeTexture(gl.TEXTURE0 + TEX_STATE); gl.bindTexture(gl.TEXTURE_2D, this.tex); unpackPlain(gl); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, STATE_TEX_W, this.rows, gl.RGBA, gl.FLOAT, b); gl.activeTexture(gl.TEXTURE0); this.stats.stateWrites++; return true;
  }

  /** the table of first visits (grid from plan.mjs): uploaded whole when the plan is done (or on a refresh while it runs) */
  setVisit(grid) {
    const gl = this.gl; this.grid = grid;
    if (!this.visitTex) { this.visitTex = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + TEX_VISIT); gl.bindTexture(gl.TEXTURE_2D, this.visitTex); gl.texStorage2D(gl.TEXTURE_2D, 1, gl.R32F, grid.nx, grid.nz); for (const [a, b] of [[gl.TEXTURE_MIN_FILTER, gl.NEAREST], [gl.TEXTURE_MAG_FILTER, gl.NEAREST], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, a, b); this.mem += grid.nx * grid.nz * 4; }
    gl.activeTexture(gl.TEXTURE0 + TEX_VISIT); gl.bindTexture(gl.TEXTURE_2D, this.visitTex); unpackPlain(gl); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, grid.nx, grid.nz, gl.RED, gl.FLOAT, grid.visit); gl.activeTexture(gl.TEXTURE0);
  }

  _view(cam, aspect) {
    const cp = Math.cos(cam.pitch), eye = [cam.x, cam.y, cam.z], ctr = [cam.x + Math.sin(cam.yaw) * cp, cam.y + Math.sin(cam.pitch), cam.z + Math.cos(cam.yaw) * cp];
    lookAt(eye, ctr, [0, 1, 0], this.view); perspective(cam.fov, aspect, cam.near, cam.far, this.proj); mul(this.proj, this.view, this.vp); frustumPlanes(this.vp, this.planes);
  }

  scene(gl, R, cam, tMin) {
    if (this.dead) return; const o = this.on, st = this.stats; st.treesDrawn = 0; st.chunksNear = st.chunksFar = 0;
    gl.disable(gl.CULL_FACE); gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LESS); gl.depthMask(true); gl.disable(gl.BLEND);
    gl.activeTexture(gl.TEXTURE0 + TEX_STATE); gl.bindTexture(gl.TEXTURE_2D, this.tex); if (this.visitTex) { gl.activeTexture(gl.TEXTURE0 + TEX_VISIT); gl.bindTexture(gl.TEXTURE_2D, this.visitTex); }
    if (o.ground && this.decals.triangles) {
      const P = this.P.decal, U = this.U.decal; gl.useProgram(P); gl.uniform1f(U.uT, tMin); gl.uniform1f(U.uOverlay, o.overlay ? 1 : 0); gl.uniform1f(U.uVisitOn, o.visit && this.grid ? 1 : 0); gl.uniform3fv(U.uTierCol, this.tierCol);
      const g = this.grid; gl.uniform4f(U.uGrid, g ? g.x0 : 0, g ? g.z0 : 0, g ? 1 / (g.nx * g.cell) : 1, g ? 1 / (g.nz * g.cell) : 1);
      gl.bindVertexArray(this.V.decal); gl.drawArrays(gl.TRIANGLES, 0, this.decals.triangles * 3);
    }
    if (o.trees && this.trees.n) {
      const aspect = R.W > 0 && R.H > 0 ? R.W / R.H : 1.6; this._view(cam, aspect); const planes = this.planes;
      const sel = selectChunks(this.trees, cam.x, cam.z, 190, 2300, (cx, cz, r) => sphereInFrustum(planes, cx, 40, cz, r * 1.2 + 60));
      const P = this.P.tree, U = this.U.tree; gl.useProgram(P); gl.uniform3fv(U.uSpA, this.spA); gl.uniform3fv(U.uSpB, this.spB);
      for (const [lvl, list] of [['near', sel.near], ['far', sel.far]]) {
        if (!list.length) continue; gl.uniform1f(U.uFar, lvl === 'far' ? 1 : 0); gl.uniform1f(U.uTrunk, lvl === 'near' ? 1 : 0); const M = this.M[lvl]; gl.bindVertexArray(M.vao); gl.bindBuffer(gl.ARRAY_BUFFER, this.B.tree);
        for (const ci of list) { const c = this.trees.chunks[ci], base = c.off * TREE_STRIDE * 4; for (const [loc, n, off] of [[1, 4, 0], [2, 4, 16], [3, 1, 32]]) gl.vertexAttribPointer(loc, n, gl.FLOAT, false, TREE_STRIDE * 4, base + off); gl.drawElementsInstanced(gl.TRIANGLES, M.n, gl.UNSIGNED_SHORT, 0, c.n); st.treesDrawn += c.n; }
        if (lvl === 'near') st.chunksNear = list.length; else st.chunksFar = list.length;
      }
    }
    gl.bindVertexArray(null); gl.activeTexture(gl.TEXTURE0);
  }

  shadow(gl, cascade, R, cam) {
    if (this.dead || !this.on.trees || !this.trees.n) return;
    const sel = selectChunks(this.trees, cam.x, cam.z, 420, 420, null); if (!sel.near.length) return;      // the chunks within 420 m of the camera cast shadows (all go into the near list)
    gl.activeTexture(gl.TEXTURE0 + TEX_STATE); gl.bindTexture(gl.TEXTURE_2D, this.tex);
    const P = this.P.shadow, U = this.U.shadow; gl.useProgram(P); gl.uniform1f(U.uFar, 1); gl.uniform1f(U.uTrunk, 0); const M = this.M.far; gl.bindVertexArray(M.vao); gl.bindBuffer(gl.ARRAY_BUFFER, this.B.tree);
    for (const ci of sel.near) { const c = this.trees.chunks[ci], base = c.off * TREE_STRIDE * 4; for (const [loc, n, off] of [[1, 4, 0], [2, 4, 16], [3, 1, 32]]) gl.vertexAttribPointer(loc, n, gl.FLOAT, false, TREE_STRIDE * 4, base + off); gl.drawElementsInstanced(gl.TRIANGLES, M.n, gl.UNSIGNED_SHORT, 0, c.n); }
    gl.bindVertexArray(null); gl.activeTexture(gl.TEXTURE0);
  }

  destroy() {
    if (this.dead) return; this.dead = true; const gl = this.gl;
    try {
      for (const b of Object.values(this.B)) gl.deleteBuffer(b); for (const k of ['near', 'far']) { gl.deleteBuffer(this.M[k].vb); gl.deleteBuffer(this.M[k].ib); gl.deleteVertexArray(this.M[k].vao); } gl.deleteVertexArray(this.V.decal);
      for (const p of Object.values(this.P)) gl.deleteProgram(p); gl.deleteTexture(this.tex); if (this.visitTex) gl.deleteTexture(this.visitTex);
    } catch (e) { console.warn('vegetation teardown', e); }
  }
}
