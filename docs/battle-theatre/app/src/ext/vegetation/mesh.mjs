// The geometry of the vegetation layer, as pure functions (tested in node, no GPU): the draped ground-cover mesh of every unit (its outline cut into triangles no longer than a few
// tens of metres, so that the shader can lay each vertex on the terrain) and the trees of every unit, sorted into square chunks of the ground so that the page can draw only what
// the camera can see and thin what is far. Nothing here draws a tree where the Warren outline has none, and no tree that the data does not give a unit.
import { triangulate } from '../../structures/geom.mjs';
import { placeTrees } from './model.mjs';

export const LAYER = { field: 0, wheatfield: 0, cleared: 1, marsh: 1, boulder: 1, orchard: 2, scatter: 3, woods: 3 };
export const CHUNK_M = 250;
export const TREE_STRIDE = 9;        // floats per tree: x, z, height, crown radius, species, seed, strip draw, shape, unit

/** longest-edge bisection of one triangle (x,z pairs) until every edge is at most maxEdge metres; the pieces are pushed on out */
export function splitTriangle(ax, az, bx, bz, cx, cz, maxEdge, out) {
  const stack = [ax, az, bx, bz, cx, cz], max2 = maxEdge * maxEdge;
  while (stack.length) {
    const z3 = stack.pop(), x3 = stack.pop(), z2 = stack.pop(), x2 = stack.pop(), z1 = stack.pop(), x1 = stack.pop();
    const d12 = (x2 - x1) ** 2 + (z2 - z1) ** 2, d23 = (x3 - x2) ** 2 + (z3 - z2) ** 2, d31 = (x1 - x3) ** 2 + (z1 - z3) ** 2, m = Math.max(d12, d23, d31);
    if (m <= max2 || stack.length > 4000) { out.push(x1, z1, x2, z2, x3, z3); continue; }
    if (m === d12) { const mx = (x1 + x2) / 2, mz = (z1 + z2) / 2; stack.push(x1, z1, mx, mz, x3, z3, mx, mz, x2, z2, x3, z3); }
    else if (m === d23) { const mx = (x2 + x3) / 2, mz = (z2 + z3) / 2; stack.push(x2, z2, mx, mz, x1, z1, mx, mz, x3, z3, x1, z1); }
    else { const mx = (x3 + x1) / 2, mz = (z3 + z1) / 2; stack.push(x3, z3, mx, mz, x2, z2, mx, mz, x1, z1, x2, z2); }
  }
}

const clipPlane = (pts, axis, val, keepGreater) => {                                     // Sutherland-Hodgman against one half-plane: pts is a flat [x, z, x, z ...] list
  const out = []; const n = pts.length / 2; if (!n) return out;
  const inside = (x, z) => ((axis === 0 ? x : z) >= val) === keepGreater || (axis === 0 ? x : z) === val;
  let px = pts[2 * n - 2], pz = pts[2 * n - 1], pin = inside(px, pz);
  for (let i = 0; i < n; i++) {
    const x = pts[2 * i], z = pts[2 * i + 1], cin = inside(x, z);
    if (cin !== pin) { const d = axis === 0 ? x - px : z - pz, f = d === 0 ? 0 : (val - (axis === 0 ? px : pz)) / d; out.push(px + (x - px) * f, pz + (z - pz) * f); }
    if (cin) out.push(x, z); px = x; pz = z; pin = cin;
  }
  return out;
};
/** the part of a polygon (flat x, z list) inside the rectangle, as a flat list (possibly with zero-width bridges where the polygon leaves and re-enters) */
export const clipRect = (pts, x0, z0, x1, z1) => clipPlane(clipPlane(clipPlane(clipPlane(pts, 0, x0, true), 0, x1, false), 1, z0, true), 1, z1, false);
const area2 = pts => { let a = 0; const n = pts.length / 2; for (let i = 0; i < n; i++) { const j = (i + 1) % n; a += pts[2 * i] * pts[2 * j + 1] - pts[2 * j] * pts[2 * i + 1]; } return a / 2; };

/**
 * The ground-cover mesh: vertices (x, z, unit index, layer) in triples, non-indexed. Every outline is laid over a lattice of squares fixed to the ground (opts.cell metres, default 40):
 * a square wholly inside the outline is two triangles, a square the outline cuts is cut along it and fanned. So no triangle is longer than a square and the pieces are of even size;
 * the shader lays each vertex on the terrain. `project(lng, lat) -> [x, z]`.
 */
export function buildDecals(model, project, opts = {}) {
  const C = opts.cell || 40, tri = [], units = model.units, per = new Int32Array(units.length); let bad = 0, n = 0;
  for (let u = 0; u < units.length; u++) {
    const r = units[u].rings[0], pts = new Float64Array(r.length); let a = 1e9, b = 1e9, c = -1e9, d = -1e9;
    for (let k = 0; k < r.length; k += 2) { const p = project(r[k], r[k + 1]); pts[k] = p[0]; pts[k + 1] = p[1]; if (p[0] < a) a = p[0]; if (p[0] > c) c = p[0]; if (p[1] < b) b = p[1]; if (p[1] > d) d = p[1]; }
    const ring = Array.from(pts), i0 = Math.floor(a / C), i1 = Math.floor(c / C), j0 = Math.floor(b / C), j1 = Math.floor(d / C), before = tri.length;
    // the cells an edge passes through (a superset: the cells of its bounding box); a cell with no edge is wholly inside or wholly outside
    const nx = i1 - i0 + 1, ny = j1 - j0 + 1, edge = new Uint8Array(nx * ny), np = pts.length / 2;
    for (let k = 0; k < np; k++) { const k2 = (k + 1) % np, ex0 = Math.min(pts[2 * k], pts[2 * k2]), ex1 = Math.max(pts[2 * k], pts[2 * k2]), ez0 = Math.min(pts[2 * k + 1], pts[2 * k2 + 1]), ez1 = Math.max(pts[2 * k + 1], pts[2 * k2 + 1]);
      for (let j = Math.floor(ez0 / C); j <= Math.floor(ez1 / C); j++) for (let i = Math.floor(ex0 / C); i <= Math.floor(ex1 / C); i++) edge[(j - j0) * nx + (i - i0)] = 1; }
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const X0 = i * C, Z0 = j * C, X1 = X0 + C, Z1 = Z0 + C;
      if (!edge[(j - j0) * nx + (i - i0)]) {
        const cx = X0 + C / 2, cz = Z0 + C / 2; let inside = false; for (let p = 0, q = np - 1; p < np; q = p++) if ((pts[2 * p + 1] > cz) !== (pts[2 * q + 1] > cz) && cx < (pts[2 * q] - pts[2 * p]) * (cz - pts[2 * p + 1]) / (pts[2 * q + 1] - pts[2 * p + 1]) + pts[2 * p]) inside = !inside;
        if (inside) tri.push(X0, Z0, X1, Z0, X1, Z1, X0, Z0, X1, Z1, X0, Z1);
        continue;
      }
      const q = clipRect(ring, X0, Z0, X1, Z1); if (q.length < 6) continue; const A = Math.abs(area2(q)); if (A < 0.25) continue;
      if (A > C * C * 0.9999) { tri.push(X0, Z0, X1, Z0, X1, Z1, X0, Z0, X1, Z1, X0, Z1); continue; }
      const pr = []; for (let k = 0; k < q.length; k += 2) pr.push([q[k], q[k + 1]]);
      const t = triangulate(pr); if (!t.ok) bad++;
      for (let k = 0; k < t.tris.length; k += 3) { const A1 = pr[t.tris[k]], B1 = pr[t.tris[k + 1]], C1 = pr[t.tris[k + 2]]; tri.push(A1[0], A1[1], B1[0], B1[1], C1[0], C1[1]); }
    }
    per[u] = (tri.length - before) / 6; n += per[u];
  }
  const verts = new Float32Array(n * 3 * 4); let o = 0, k = 0;
  for (let u = 0; u < units.length; u++) { const layer = LAYER[units[u].cls] ?? 0; for (let j = 0; j < per[u] * 3; j++) { verts[o++] = tri[k++]; verts[o++] = tri[k++]; verts[o++] = u; verts[o++] = layer; } }
  return { verts, triangles: n, perUnit: per, notClean: bad };
}

/** every tree of every unit, sorted into chunks. out: { data (stride TREE_STRIDE), n, chunks: [{ix, iz, cx, cz, off, n}], W, H } where W, H are the sizes of the loaded ground (m) */
export function buildTrees(model, project, ground, opts = {}) {
  const parts = [], units = model.units; let total = 0;
  for (let i = 0; i < units.length; i++) {
    const u = units[i]; if (!(u.woods || u.orchard)) continue;
    const t = placeTrees(model, u, project, opts); if (!t.length) continue; parts.push([i, t]); total += t.length / 8;
  }
  const W = ground.W, H = ground.H, nx = Math.ceil(W / CHUNK_M), nz = Math.ceil(H / CHUNK_M);
  const key = new Int32Array(total), src = new Uint32Array(total), unit = new Uint16Array(total), flat = new Float32Array(total * 8); let n = 0;
  for (const [ui, t] of parts) for (let o = 0; o < t.length; o += 8) {
    const x = t[o], z = t[o + 1], ix = Math.min(nx - 1, Math.max(0, Math.floor((x + W / 2) / CHUNK_M))), iz = Math.min(nz - 1, Math.max(0, Math.floor((z + H / 2) / CHUNK_M)));
    flat.set(t.subarray(o, o + 8), n * 8); key[n] = iz * nx + ix; unit[n] = ui; src[n] = n; n++;
  }
  const order = Array.from(src).sort((a, b) => key[a] - key[b] || a - b);
  const data = new Float32Array(n * TREE_STRIDE), chunks = []; let last = -1;
  for (let i = 0; i < n; i++) {
    const s = order[i]; data.set(flat.subarray(s * 8, s * 8 + 8), i * TREE_STRIDE); data[i * TREE_STRIDE + 8] = unit[s];
    if (key[s] !== last) { last = key[s]; const ix = last % nx, iz = (last - ix) / nx; chunks.push({ ix, iz, cx: (ix + 0.5) * CHUNK_M - W / 2, cz: (iz + 0.5) * CHUNK_M - H / 2, off: i, n: 0 }); }
    chunks[chunks.length - 1].n++;
  }
  return { data, n, chunks, W, H, nx, nz };
}

/** which chunks to draw at which level: near (full tree), far (blob), none; the camera is (x, z); the planes are the six of a frustum (see sphereInFrustum). Returns lists of chunk indices. */
export function selectChunks(trees, camX, camZ, near, far, inView) {
  const A = [], B = [], r = CHUNK_M * 0.75;
  for (let i = 0; i < trees.chunks.length; i++) {
    const c = trees.chunks[i], d = Math.hypot(c.cx - camX, c.cz - camZ) - r; if (d > far) continue;
    if (inView && !inView(c.cx, c.cz, r)) continue;
    (d < near ? A : B).push(i);
  }
  return { near: A, far: B };
}
