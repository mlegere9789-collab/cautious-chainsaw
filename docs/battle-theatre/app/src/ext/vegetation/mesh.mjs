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

/** the ground-cover mesh: vertices (x, z, unit index, layer) in triples, non-indexed. `project(lng, lat) -> [x, z]`. */
export function buildDecals(model, project, opts = {}) {
  const maxEdge = opts.maxEdge || 34, tri = [], units = model.units, per = new Int32Array(units.length); let bad = 0;
  const chunks = []; let n = 0;
  for (let i = 0; i < units.length; i++) {
    const u = units[i], r = u.rings[0], ring = []; for (let k = 0; k < r.length; k += 2) ring.push(project(r[k], r[k + 1]));
    const t = triangulate(ring); if (!t.ok) bad++;
    const before = tri.length;
    for (let k = 0; k < t.tris.length; k += 3) { const a = ring[t.tris[k]], b = ring[t.tris[k + 1]], c = ring[t.tris[k + 2]]; splitTriangle(a[0], a[1], b[0], b[1], c[0], c[1], maxEdge, tri); }
    per[i] = (tri.length - before) / 6; n += per[i];
  }
  const verts = new Float32Array(n * 3 * 4); let o = 0, k = 0;
  for (let i = 0; i < units.length; i++) { const layer = LAYER[units[i].cls] ?? 0; for (let j = 0; j < per[i] * 3; j++) { verts[o++] = tri[k++]; verts[o++] = tri[k++]; verts[o++] = i; verts[o++] = layer; } }
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
