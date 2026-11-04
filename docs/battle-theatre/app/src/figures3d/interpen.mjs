// Numerical interpenetration check between two garment layers (finalized meshes): for every vertex of the INNER layer inside a height band, the signed distance to the OUTER layer's surface along the outer's smooth
// normal at the closest point. depth > 0 = the inner vertex is under the outer surface (correct layering); depth < 0 = it pokes out through it. The report gives the worst poke-out (mm), the number of vertices that
// poke out by more than the tolerance, and the vertices counted. Closest point on a triangle by the standard Voronoi-region method; triangles are binned in a uniform grid. Pure, deterministic, node and browser safe.
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
function closestOnTri(p, a, b, c) {                                  // returns { q, u, v, w } barycentric of the closest point
  const ab = sub(b, a), ac = sub(c, a), ap = sub(p, a), d1 = dot(ab, ap), d2 = dot(ac, ap);
  if (d1 <= 0 && d2 <= 0) return { u: 1, v: 0, w: 0 };
  const bp = sub(p, b), d3 = dot(ab, bp), d4 = dot(ac, bp); if (d3 >= 0 && d4 <= d3) return { u: 0, v: 1, w: 0 };
  const vc = d1 * d4 - d3 * d2; if (vc <= 0 && d1 >= 0 && d3 <= 0) { const v = d1 / (d1 - d3); return { u: 1 - v, v, w: 0 }; }
  const cp = sub(p, c), d5 = dot(ab, cp), d6 = dot(ac, cp); if (d6 >= 0 && d5 <= d6) return { u: 0, v: 0, w: 1 };
  const vb = d5 * d2 - d1 * d6; if (vb <= 0 && d2 >= 0 && d6 <= 0) { const w = d2 / (d2 - d6); return { u: 1 - w, v: 0, w }; }
  const va = d3 * d6 - d5 * d4; if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) { const w = (d4 - d3) / ((d4 - d3) + (d5 - d6)); return { u: 0, v: 1 - w, w }; }
  const den = 1 / (va + vb + vc), v = vb * den, w = vc * den; return { u: 1 - v - w, v, w };
}
export function buildGrid(m, cell = 0.05) {
  const g = new Map(), key = (x, y, z) => x * 73856093 ^ y * 19349663 ^ z * 83492791; const P = i => [m.pos[i * 3], m.pos[i * 3 + 1], m.pos[i * 3 + 2]];
  for (let t = 0; t < m.idx.length; t += 3) { const a = P(m.idx[t]), b = P(m.idx[t + 1]), c = P(m.idx[t + 2]); const lo = [0, 1, 2].map(k => Math.floor(Math.min(a[k], b[k], c[k]) / cell)), hi = [0, 1, 2].map(k => Math.floor(Math.max(a[k], b[k], c[k]) / cell));
    for (let x = lo[0]; x <= hi[0]; x++) for (let y = lo[1]; y <= hi[1]; y++) for (let z = lo[2]; z <= hi[2]; z++) { const k = key(x, y, z); let l = g.get(k); if (!l) { l = []; g.set(k, l); } l.push(t); } }
  return { g, cell, key, m };
}
// depth of point p under the outer surface (positive inside), or null when no outer triangle is within maxD
export function depthUnder(grid, p, maxD = 0.04) {
  const { g, cell, key, m } = grid, cx = Math.floor(p[0] / cell), cy = Math.floor(p[1] / cell), cz = Math.floor(p[2] / cell), r = Math.ceil(maxD / cell); let best = 1e9, out = null; const seen = new Set();
  for (let x = cx - r; x <= cx + r; x++) for (let y = cy - r; y <= cy + r; y++) for (let z = cz - r; z <= cz + r; z++) { const l = g.get(key(x, y, z)); if (!l) continue;
    for (const t of l) { if (seen.has(t)) continue; seen.add(t); const i0 = m.idx[t], i1 = m.idx[t + 1], i2 = m.idx[t + 2], a = [m.pos[i0 * 3], m.pos[i0 * 3 + 1], m.pos[i0 * 3 + 2]], b = [m.pos[i1 * 3], m.pos[i1 * 3 + 1], m.pos[i1 * 3 + 2]], c = [m.pos[i2 * 3], m.pos[i2 * 3 + 1], m.pos[i2 * 3 + 2]];
      const bc = closestOnTri(p, a, b, c), q = add(add(mul(a, bc.u), mul(b, bc.v)), mul(c, bc.w)), d = sub(p, q), dist = Math.hypot(d[0], d[1], d[2]); if (dist >= best) continue; best = dist;
      const nrm = [0, 1, 2].map(k => bc.u * m.nrm[i0 * 3 + k] + bc.v * m.nrm[i1 * 3 + k] + bc.w * m.nrm[i2 * 3 + k]); const nl = Math.hypot(...nrm) || 1; out = -dot(d, [nrm[0] / nl, nrm[1] / nl, nrm[2] / nl]); } }
  return best > maxD ? null : out;
}
// the report for a layer pair over a height band [y0, y1] of the inner mesh; tolMm = poke-out allowed
export function layerReport(outer, inner, { y0 = -1, y1 = 9, tolMm = 1.0, maxD = 0.04, grid = null } = {}) {
  const G = grid ?? buildGrid(outer); let worst = 0, over = 0, n = 0, wp = null;
  for (let i = 0; i < inner.nv; i++) { const p = [inner.pos[i * 3], inner.pos[i * 3 + 1], inner.pos[i * 3 + 2]]; if (p[1] < y0 || p[1] > y1) continue; const d = depthUnder(G, p, maxD); if (d === null) continue; n++; if (-d > worst) { worst = -d; wp = p; } if (-d * 1000 > tolMm) over++; }
  return { counted: n, worst_pokeout_mm: +(worst * 1000).toFixed(2), over_tolerance: over, at: wp ? wp.map(x => +x.toFixed(3)) : null };
}
