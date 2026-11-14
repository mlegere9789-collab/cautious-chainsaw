// The standing crop of the vegetation layer, near the camera. Wheat, rye, barley, oats, corn and the grass of meadows and pastures are drawn as the ground cover of gl.mjs (colour, rows,
// shocks, trampled patches) and, within a short range of the camera, as layers stacked above it: the same triangles drawn again and again, each lifted by a share of the crop's height, a
// fragment kept only where a stalk, a head or a leaf of that height would be (a cell pattern that thins with height). A soldier who wades into it is covered up to the height the state of
// the data gives the crop, and where the ground was trampled or laid flat the layers are not there. It is a stand-in for single plants and says so in the panel: the number, the lean and the
// shape of the stalks are not drawn from any record; the height, the stage, the colour, the cut, the trampling and the laying flat are the state of the data (model.mjs stateAt).
//
// This file holds the pure parts (no GPU): the sorting of the crop-bearing ground-cover triangles into square chunks, the cutting of a chunk's triangles down to a few metres (so that every
// vertex can be laid on the terrain by the vertex shader), the choice of the chunks near the camera, and the two shaders as text. The GPU objects are made in gl.mjs.
import { splitTriangle } from './mesh.mjs';

export const SHELL = { layers: 14, range: 70, chunkM: 120, maxEdge: 8, cache: 36, buildsPerFrame: 3, minHeight: 0.1 };
export const SHELL_CLASSES = new Set(['field', 'wheatfield', 'cleared', 'orchard']);        // the ground a crop or a meadow can stand on (the cover of a woodlot, a marsh or a boulder field is not a crop)

/**
 * The crop-bearing triangles of the ground-cover mesh (mesh.mjs buildDecals: x, z, unit, layer per vertex, three vertices a triangle), sorted into square chunks of the ground.
 * Returns { order (triangle numbers, chunk by chunk), chunks: [{ix, iz, cx, cz, first, n}], n, nx, nz, C }; nothing is copied but the numbers.
 */
export function buildShellChunks(decals, units, ground, opts = {}) {
  const C = opts.chunk || SHELL.chunkM, W = ground.W, H = ground.H, nx = Math.ceil(W / C), nz = Math.ceil(H / C), v = decals.verts, nT = decals.triangles;
  const ok = new Uint8Array(units.length); units.forEach((u, i) => { ok[i] = SHELL_CLASSES.has(u.cls) ? 1 : 0; });
  const key = new Int32Array(nT); let m = 0;
  for (let t = 0; t < nT; t++) {
    const o = t * 12, unit = v[o + 2]; if (!ok[unit]) { key[t] = -1; continue; }
    const cx = (v[o] + v[o + 4] + v[o + 8]) / 3, cz = (v[o + 1] + v[o + 5] + v[o + 9]) / 3;
    const ix = Math.min(nx - 1, Math.max(0, Math.floor((cx + W / 2) / C))), iz = Math.min(nz - 1, Math.max(0, Math.floor((cz + H / 2) / C)));
    key[t] = iz * nx + ix; m++;
  }
  const idx = new Int32Array(m); let k = 0; for (let t = 0; t < nT; t++) if (key[t] >= 0) idx[k++] = t;
  const order = Int32Array.from(idx).sort((a, b) => key[a] - key[b] || a - b), chunks = []; let last = -1;
  for (let i = 0; i < m; i++) {
    const kk = key[order[i]];
    if (kk !== last) { last = kk; const ix = kk % nx, iz = (kk - ix) / nx; chunks.push({ ix, iz, cx: (ix + 0.5) * C - W / 2, cz: (iz + 0.5) * C - H / 2, first: i, n: 0 }); }
    chunks[chunks.length - 1].n++;
  }
  return { order, chunks, n: m, nx, nz, C };
}

/** the triangles of one chunk cut down to edges of at most maxEdge metres: a Float32Array of (x, z, unit, layer) per vertex, three vertices a triangle */
export function refineChunk(decals, shell, ci, maxEdge = SHELL.maxEdge) {
  const c = shell.chunks[ci], v = decals.verts, out = [], tmp = [];
  for (let i = 0; i < c.n; i++) {
    const o = shell.order[c.first + i] * 12; tmp.length = 0;
    splitTriangle(v[o], v[o + 1], v[o + 4], v[o + 5], v[o + 8], v[o + 9], maxEdge, tmp);
    for (let p = 0; p < tmp.length; p += 6) for (let q = 0; q < 3; q++) out.push(tmp[p + 2 * q], tmp[p + 2 * q + 1], v[o + 2], v[o + 3]);
  }
  return Float32Array.from(out);
}

/** the chunks within `range` metres of the camera (a chunk is as far as its nearest edge) and, when `inView` is given, in view: a list of chunk numbers */
export function selectShellChunks(shell, camX, camZ, range, inView) {
  const out = [], half = shell.C / 2;
  for (let i = 0; i < shell.chunks.length; i++) {
    const c = shell.chunks[i], dx = Math.max(0, Math.abs(c.cx - camX) - half), dz = Math.max(0, Math.abs(c.cz - camZ) - half);
    if (dx * dx + dz * dz > range * range) continue;
    if (inView && !inView(c.cx, c.cz, half * 1.5)) continue;
    out.push(i);
  }
  return out;
}

/** a small cache of the cut-down chunks on the GPU: `make(ci)` builds an entry, `drop(entry)` gives it back; at most `size` entries, the least recently used leaves first */
export class ChunkCache {
  constructor(size, make, drop) { this.size = size; this.make = make; this.drop = drop; this.map = new Map(); this.tick = 0; this.built = 0; }
  /** the entry of chunk ci, or null when the build allowance of this frame is spent (`allow` says how many may still be built) */
  get(ci, allow) {
    let e = this.map.get(ci);
    if (!e) { if (allow <= 0) return null; e = this.make(ci); this.map.set(ci, e); this.built++; }
    e.used = ++this.tick; return e;
  }
  trim(keep) {
    while (this.map.size > this.size) {
      let worst = null, wk = -1; for (const [k, e] of this.map) if (!keep.has(k) && (worst === null || e.used < worst.used)) { worst = e; wk = k; }
      if (worst === null) break; this.map.delete(wk); this.drop(worst);
    }
  }
  clear() { for (const e of this.map.values()) this.drop(e); this.map.clear(); }
}

// ---------------------------------------------------------------------------------------------------------------------------------------------- the shaders (the prelude of gl.mjs COMMON and the renderer's own come before)
export const SHELL_VS = /* glsl */`
layout(location=0) in vec4 a;            // x, z, unit, layer (the same vertices as the ground cover, cut down to a few metres)
uniform float uLayers; uniform float uRange;
out vec3 vWp; out float vF; out float vG; flat out float vU;
void main() {
  int u = int(a.z + 0.5);
  vec4 s0 = stx(u, 0); vec4 s3 = stx(u, 3);
  int crop = int(s0.w + 0.5);
  bool shocks = s3.x > 1.5 && s3.x < 2.5;
  float hs = shocks ? max(s3.z, s3.y) : s3.z;
  float g = hAt(a.x, a.y);
  float dist = length(vec3(a.x, g, a.y) - cam.xyz);
  float f = (float(gl_InstanceID) + 1.0) / uLayers;
  if (crop < 1 || crop > 7 || hs < ${SHELL.minHeight.toFixed(2)} || dist > uRange + 30.0) { gl_Position = HID; vWp = vec3(0.0); vF = 0.0; vG = 0.0; vU = 0.0; return; }
  float lift = 0.03 + a.w * 0.045 + dist * 0.0011 * (1.0 + a.w * 0.5);
  vWp = vec3(a.x, g + lift + f * hs, a.y); vF = f; vG = g + lift; vU = a.z;
  gl_Position = vp * vec4(vWp, 1.0);
}`;

export const SHELL_FS = /* glsl */`
uniform sampler2D uVisit; uniform float uT; uniform vec4 uGrid; uniform float uVisitOn; uniform float uRange;
in vec3 vWp; in float vF; in float vG; flat in float vU; out vec4 o;
void main() {
  int u = int(vU + 0.5);
  vec4 s0 = stx(u, 0), s1 = stx(u, 1), s2 = stx(u, 2), s3 = stx(u, 3);
  int crop = int(s0.w + 0.5);
  bool shocks = s3.x > 1.5 && s3.x < 2.5;
  float hs = shocks ? max(s3.z, s3.y) : s3.z;
  vec2 xz = vWp.xz; float f = vF;
  float dist = length(vWp - cam.xyz);
  // the hand-over to the flat ground cover: a dithered thinning from over half the range to its end
  float dith = hsh(uint(gl_FragCoord.x) * 1973u + uint(gl_FragCoord.y) * 9277u + 7u);
  if (dith > 1.0 - smoothstep(uRange * 0.55, uRange, dist)) discard;
  float th = s2.w * 0.0174533;
  float across = dot(xz, vec2(cos(th), sin(th))), along = dot(xz, vec2(sin(th), -cos(th)));
  float hAbs = f * hs;
  float r1 = 0.0;
  if (shocks) {                                                                                                  // shocks of cut grain: cones in the cells of the ground cover's own pattern
    vec2 cid = floor(vec2(across, along) / 3.2); float hc = hv2(cid); vec2 fc = fract(vec2(across, along) / 3.2) - 0.5;
    float rr = length(fc) * 3.2;
    if (hc > 0.55 || rr > 0.7 || hAbs > s3.y * (1.0 - rr / 0.7)) discard;
    r1 = hc;
  } else {
    bool keep;
    if (crop == 5) {                                                                                             // corn: a plant at every hill, leaves spread at the middle of its height
      vec2 q = vec2(across / 0.95, along / 0.9); vec2 id = floor(q); vec2 d = (fract(q) - 0.5) * vec2(0.95, 0.9);
      r1 = hv2(id + 31.0);
      float rp = 0.36 * (0.45 + 0.55 * sin(3.14159 * clamp(f * 0.9 + 0.08, 0.0, 1.0))) * (0.75 + 0.5 * r1);
      keep = length(d) < rp;
    } else {                                                                                                     // grain and grass: tufts that taper with height
      vec2 id = floor(xz * 8.0); vec2 d = fract(xz * 8.0) - 0.5;
      r1 = hv2(id + 5.0);
      float t = mix(1.02, 0.66, f) * (0.76 + 0.24 * r1);
      keep = length(d) * 2.0 < t;
    }
    if (!keep) discard;
    float vis = (uVisitOn > 0.5) ? textureLod(uVisit, (xz - uGrid.xy) * uGrid.zw, 0.0).r : 1.0e9;
    float trV = vis < 1.0e8 ? smoothstep(vis, vis + 25.0, uT) : 0.0;
    float n0 = vn2(xz * 0.045), n1b = vn2(xz * 0.31);
    float pch = n0 * 0.55 + n1b * 0.45;
    float trampled = max(smoothstep(pch - 0.12, pch + 0.12, s1.y * 1.25), trV);
    float lodged = smoothstep(pch - 0.2, pch + 0.2, s1.w * 1.4);
    float hLoc = hs * (1.0 - 0.82 * trampled) * (1.0 - 0.45 * lodged);
    if (hAbs > hLoc) discard;
  }
  vec3 alb = s2l(s0.rgb);
  float nA = vn2(xz * 0.045), nB = vn2(xz * 0.31);
  float shade = mix(0.36, 1.0, pow(f, 0.75));
  vec3 col = alb * (0.88 + 0.24 * nA) * (0.93 + 0.14 * nB) * shade * (0.84 + 0.32 * r1);
  if (crop >= 1 && crop <= 4) col = mix(col, col * vec3(1.16, 1.07, 0.82), smoothstep(0.72, 1.0, f));      // the heads at the top of a grain crop
  vec3 N = normalize(vec3(0.0, 1.0, 0.0) + 0.9 * vec3(vn2(xz * 6.0 + f * 9.0) - 0.5, 0.0, vn2(xz * 6.0 + 23.0 + f * 9.0) - 0.5));
  float sh = shadowAt(vec3(vWp.x, vG, vWp.z));
  o = vec4(fogged(lit(col, 0.97, 0.0, N, vWp, sh, mix(0.28, 1.0, f)), vWp), 1.0);
}`;
