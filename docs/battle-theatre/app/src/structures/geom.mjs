// Pure geometry for the structures: polygon triangulation, minimum bounding rectangle, clipping a triangle by a line, extrusion of a footprint into walls and a gable roof,
// panel meshes for fences and walls, ribbons for roads. No GPU, no DOM: everything here is a function of its arguments (tested in node).

export const signedArea = ring => { let a = 0; for (let i = 0, n = ring.length; i < n; i++) { const p = ring[i], q = ring[(i + 1) % n]; a += p[0] * q[1] - q[0] * p[1]; } return a / 2; };
export const polyArea = ring => Math.abs(signedArea(ring));
export const centroidOf = ring => { let x = 0, z = 0; for (const p of ring) { x += p[0]; z += p[1]; } return [x / ring.length, z / ring.length]; };

// remove the closing duplicate, repeated points and collinear spikes of tiny size
export function cleanRing(ring, eps = 0.02) {
  const out = []; for (const p of ring) { const q = out[out.length - 1]; if (!q || Math.hypot(p[0] - q[0], p[1] - q[1]) > eps) out.push(p); }
  while (out.length > 1 && Math.hypot(out[0][0] - out.at(-1)[0], out[0][1] - out.at(-1)[1]) <= eps) out.pop(); return out;
}

// ear clipping; returns indices into `ring` (counter-clockwise in x, z with z up the page when signedArea > 0). A ring that cannot be fully clipped (self-touching) is
// finished with a fan over what is left, so the cap never has a hole in the picture; `ok` says whether the clip was clean.
export function triangulate(ring) {
  const n = ring.length; if (n < 3) return { tris: [], ok: false };
  const idx = Array.from({ length: n }, (_, i) => i); if (signedArea(ring) < 0) idx.reverse();
  const cross = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const inTri = (p, a, b, c) => { const d1 = cross(a, b, p), d2 = cross(b, c, p), d3 = cross(c, a, p); return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0)); };
  const tris = []; let guard = n * n + 10, ok = true;
  while (idx.length > 3 && guard-- > 0) {
    let clipped = false;
    for (let i = 0; i < idx.length; i++) {
      const a = ring[idx[(i + idx.length - 1) % idx.length]], b = ring[idx[i]], c = ring[idx[(i + 1) % idx.length]];
      if (cross(a, b, c) <= 1e-9) continue;
      let any = false; for (let j = 0; j < idx.length; j++) { const k = idx[j]; if (k === idx[(i + idx.length - 1) % idx.length] || k === idx[i] || k === idx[(i + 1) % idx.length]) continue; const p = ring[k]; if ((p[0] === a[0] && p[1] === a[1]) || (p[0] === b[0] && p[1] === b[1]) || (p[0] === c[0] && p[1] === c[1])) continue; if (inTri(p, a, b, c)) { any = true; break; } }
      if (any) continue;
      tris.push(idx[(i + idx.length - 1) % idx.length], idx[i], idx[(i + 1) % idx.length]); idx.splice(i, 1); clipped = true; break;
    }
    if (!clipped) { ok = false; for (let i = 1; i + 1 < idx.length; i++) tris.push(idx[0], idx[i], idx[i + 1]); idx.length = 0; break; }
  }
  if (idx.length === 3) tris.push(idx[0], idx[1], idx[2]);
  return { tris, ok };
}

// minimum-area bounding rectangle by trying every edge direction; returns the axis u (unit, along the LONG side), the centre and the half sizes (hu along u, hv across)
export function minRect(ring) {
  let best = null;
  for (let i = 0, n = ring.length; i < n; i++) {
    const a = ring[i], b = ring[(i + 1) % n], l = Math.hypot(b[0] - a[0], b[1] - a[1]); if (l < 1e-6) continue; const ux = (b[0] - a[0]) / l, uz = (b[1] - a[1]) / l;
    let u0 = 1e18, u1 = -1e18, v0 = 1e18, v1 = -1e18; for (const p of ring) { const u = p[0] * ux + p[1] * uz, v = -p[0] * uz + p[1] * ux; if (u < u0) u0 = u; if (u > u1) u1 = u; if (v < v0) v0 = v; if (v > v1) v1 = v; }
    const area = (u1 - u0) * (v1 - v0); if (!best || area < best.area) best = { area, ux, uz, u0, u1, v0, v1 };
  }
  if (!best) return null;
  let { ux, uz } = best, hu = (best.u1 - best.u0) / 2, hv = (best.v1 - best.v0) / 2, cu = (best.u0 + best.u1) / 2, cv = (best.v0 + best.v1) / 2;
  if (hv > hu) { [hu, hv] = [hv, hu]; [cu, cv] = [cv, -cu]; const t = ux; ux = -uz; uz = t; }          // make u the long axis: rotate the frame a quarter turn
  return { ux, uz, hu, hv, cx: cu * ux - cv * uz, cz: cu * uz + cv * ux, area: best.area };
}

// split a triangle (3 points with attached values) by the line f(p) = 0, returning the pieces as triangles; f is linear on each piece
export function splitTriByLine(tri, f) {
  const d = tri.map(f); if (d.every(x => x >= 0) || d.every(x => x <= 0)) return [tri];
  const out = []; const pos = [], neg = [];
  for (let i = 0; i < 3; i++) (d[i] >= 0 ? pos : neg).push(i);
  const lerp = (a, b, da, db) => { const t = da / (da - db); return a.map((v, k) => v + (b[k] - v) * t); };
  const lone = pos.length === 1 ? pos[0] : neg[0], others = pos.length === 1 ? neg : pos, A = tri[lone], B = tri[others[0]], C = tri[others[1]];
  const AB = lerp(A, B, d[lone], d[others[0]]), AC = lerp(A, C, d[lone], d[others[1]]);
  out.push([A, AB, AC]); out.push([AB, B, C]); out.push([AB, C, AC]);
  return out;
}

// ----------------------------------------------------------------------------------------------------------------------------------------------
// footprint -> mesh. ring: [[x, z]...] in metres (x east, z south). groundAt(x, z): terrain height. Returns { verts: number[] (pos3 nrm3 a4), idx: number[] , info }
// a = (objIdx, kind, mat, aux): kind 0 wall, 1 roof, 2 floor. Wall tops follow the roof surface so a gable has its triangular end walls.
export const GEN = { storeyH: 3.0, pitch: Math.tan(30 * Math.PI / 180), skirt: 0.35, maxSlopeRise: 1.6 };
export function extrude(ringIn, { groundAt, obj, wallMat, roofMat, flat, storeys, eaveOverride }) {
  const ring0 = cleanRing(ringIn); if (ring0.length < 3) return null;
  const ring = signedArea(ring0) < 0 ? [...ring0].reverse() : ring0;          // counter-clockwise
  const g = ring.map(p => groundAt(p[0], p[1])), gMin = Math.min(...g), gMax = Math.max(...g), floorY = Math.min(gMax, gMin + GEN.maxSlopeRise);
  const eaveH = (eaveOverride != null ? eaveOverride : storeys * GEN.storeyH), eaveY = floorY + eaveH;
  const R = flat ? null : minRect(ring);
  const rise = flat || !R ? 0 : Math.min(R.hv * GEN.pitch, eaveH * 0.7);
  const vOf = p => (R ? -(p[0] - R.cx) * R.uz + (p[1] - R.cz) * R.ux : 0);         // across the ridge
  const roofY = p => (rise > 0 ? eaveY + rise * Math.max(0, 1 - Math.abs(vOf(p)) / R.hv) : eaveY);
  const verts = [], idx = []; let nv = 0;
  const V = (x, y, z, nx, ny, nz, kind, mat, aux = 0) => { verts.push(x, y, z, nx, ny, nz, obj, kind, mat, aux); return nv++; };
  // walls: subdivide each edge where it crosses the ridge line so the top edge is piecewise linear
  const n = ring.length;
  for (let i = 0; i < n; i++) {
    const a = ring[i], b = ring[(i + 1) % n], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz); if (l < 1e-6) continue;
    const nx = dz / l, nz = -dx / l;      // outward for counter-clockwise rings in (x, z) with z south: right-hand normal
    const pts = [a]; if (rise > 0) { const va = vOf(a), vb = vOf(b); if (va * vb < 0) { const t = va / (va - vb); pts.push([a[0] + dx * t, a[1] + dz * t]); } } pts.push(b);
    for (let k = 0; k + 1 < pts.length; k++) {
      const p = pts[k], q = pts[k + 1], gp = groundAt(p[0], p[1]) - GEN.skirt, gq = groundAt(q[0], q[1]) - GEN.skirt;
      const i0 = V(p[0], gp, p[1], nx, 0, nz, 0, wallMat), i1 = V(q[0], gq, q[1], nx, 0, nz, 0, wallMat), i2 = V(q[0], roofY(q), q[1], nx, 0, nz, 0, wallMat), i3 = V(p[0], roofY(p), p[1], nx, 0, nz, 0, wallMat);
      idx.push(i0, i1, i2, i0, i2, i3);
    }
  }
  // roof (kind 1) and floor (kind 2)
  const T = triangulate(ring);
  for (let t = 0; t < T.tris.length; t += 3) {
    const P3 = [0, 1, 2].map(k => { const p = ring[T.tris[t + k]]; return [p[0], p[1], 0]; });
    const pieces = rise > 0 ? splitTriByLine(P3, p => vOf(p)) : [P3];
    for (const pc of pieces) {
      const w = pc.map(p => [p[0], roofY(p), p[1]]);
      const ux = w[1][0] - w[0][0], uy = w[1][1] - w[0][1], uz = w[1][2] - w[0][2], vx = w[2][0] - w[0][0], vy = w[2][1] - w[0][1], vz = w[2][2] - w[0][2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl; const flip = ny < 0;     // up-facing
      const ids = w.map(q => V(q[0], q[1], q[2], flip ? -nx : nx, flip ? -ny : ny, flip ? -nz : nz, 1, roofMat));
      if (flip) idx.push(ids[0], ids[2], ids[1]); else idx.push(ids[0], ids[1], ids[2]);
      const fl = pc.map(q => V(q[0], floorY + 0.05, q[1], 0, 1, 0, 2, 7)); if (flip) idx.push(fl[0], fl[1], fl[2]); else idx.push(fl[0], fl[2], fl[1]);
    }
  }
  return { verts, idx, info: { floorY, eaveY, eaveH, rise, groundMin: gMin, groundMax: gMax, ridge: R ? { ux: R.ux, uz: R.uz, long: R.hu * 2, short: R.hv * 2 } : null, clipOk: T.ok, nVerts: n, area: polyArea(ring), height: eaveY + rise - floorY } };
}

// ----------------------------------------------------------------------------------------------------------------------------------------------
// meshes for one fence panel in panel space. Vertex = (xs, off, y, z, nx, ny, nz, mat): along = xs * length + off (metres), y up, z across (metres).
function box(out, xs0, off0, xs1, off1, y0, y1, z0, z1, mat) {
  const P = (xs, off, y, z) => [xs, off, y, z];
  const c = [P(xs0, off0, y0, z0), P(xs1, off1, y0, z0), P(xs1, off1, y0, z1), P(xs0, off0, y0, z1), P(xs0, off0, y1, z0), P(xs1, off1, y1, z0), P(xs1, off1, y1, z1), P(xs0, off0, y1, z1)];
  // faces by corner indices (the bottom is omitted); axis-aligned normals
  const F = [[[4, 5, 6, 7], [0, 1, 0]], [[0, 4, 7, 3], [-1, 0, 0]], [[1, 2, 6, 5], [1, 0, 0]], [[0, 1, 5, 4], [0, 0, -1]], [[3, 7, 6, 2], [0, 0, 1]]];
  for (const [q, nr] of F) { const base = out.nv; for (const k of q) out.v.push(...c[k], ...nr, mat); out.i.push(base, base + 1, base + 2, base, base + 2, base + 3); out.nv += 4; }
}
export function railPanelMesh(h = 1.52) {
  const o = { v: [], i: [], nv: 0 }, pw = 0.06;
  for (const xs of [0, 1]) box(o, xs, -pw, xs, pw, 0, h, -pw, pw, 0);
  for (const y of [0.35, 0.72, 1.1, h - 0.06]) box(o, 0, pw, 1, -pw, y, y + 0.1, -0.04, 0.04, 1);
  return o;
}
export function wormPanelMesh(h = 1.52) {
  // a zigzag fence: each panel is a stack of rails laid slantwise from one side of the line to the other; adjacent panels are mirrored (z -> -z in the shader), so the rails meet at the corners
  const o = { v: [], i: [], nv: 0 }, a = 0.55, w = 0.12;
  for (let k = 0; k < 7; k++) { const y = 0.1 + k * (h - 0.25) / 6; slant(o, y, y + 0.11, -a, a, w, 1); }
  return o;
}
// a rail from (start, zA) to (end, zB) across the panel, w thick across, as a slanted box (top and sides)
function slant(o, y0, y1, zA, zB, w, mat) {
  const P = (xs, z, y) => [xs, 0, y, z], c = [P(0, zA - w / 2, y0), P(0, zA + w / 2, y0), P(1, zB + w / 2, y0), P(1, zB - w / 2, y0), P(0, zA - w / 2, y1), P(0, zA + w / 2, y1), P(1, zB + w / 2, y1), P(1, zB - w / 2, y1)];
  const F = [[[4, 5, 6, 7], [0, 1, 0]], [[0, 1, 5, 4], [-1, 0, 0]], [[3, 2, 6, 7], [1, 0, 0]], [[0, 3, 7, 4], [0, 0, -1]], [[1, 2, 6, 5], [0, 0, 1]]];
  for (const [q, nr] of F) { const base = o.nv; for (const k of q) o.v.push(...c[k], ...nr, mat); o.i.push(base, base + 1, base + 2, base, base + 2, base + 3); o.nv += 4; }
}
export function stonePanelMesh(h = 0.76, w = 0.6) {
  const o = { v: [], i: [], nv: 0 }; box(o, 0, 0, 1, 0, 0, h, -w / 2, w / 2, 2); return o;
}
// marker: a thin pole with an octahedron on top (local metres)
export function markerMesh(H = 4, r = 0.55) {
  const v = [], i = []; let nv = 0; const add = (p, n) => { v.push(...p, ...n); return nv++; };
  const pw = 0.07; const s = [[-pw, 0, -pw], [pw, 0, -pw], [pw, 0, pw], [-pw, 0, pw]];
  for (let k = 0; k < 4; k++) { const a = s[k], b = s[(k + 1) % 4], nx = (a[2] + b[2]) / 2 > 0 ? 0 : 0; const nrm = k === 0 ? [0, 0, -1] : k === 1 ? [1, 0, 0] : k === 2 ? [0, 0, 1] : [-1, 0, 0]; const i0 = add([a[0], 0, a[2]], nrm), i1 = add([b[0], 0, b[2]], nrm), i2 = add([b[0], H, b[2]], nrm), i3 = add([a[0], H, a[2]], nrm); i.push(i0, i1, i2, i0, i2, i3); }
  const top = [0, H + 2 * r, 0], bot = [0, H, 0], ring = [[r, H + r, 0], [0, H + r, r], [-r, H + r, 0], [0, H + r, -r]];
  for (let k = 0; k < 4; k++) for (const apex of [top, bot]) { const a = ring[k], b = ring[(k + 1) % 4]; const nx = (a[0] + b[0]) / 2, ny = apex === top ? 0.7 : -0.7, nz = (a[2] + b[2]) / 2; const l = Math.hypot(nx, ny, nz) || 1; const n3 = [nx / l, ny / l, nz / l]; const i0 = add(a, n3), i1 = add(b, n3), i2 = add(apex, n3); if (apex === top) i.push(i0, i2, i1); else i.push(i0, i1, i2); }
  return { v, i };
}

// ----------------------------------------------------------------------------------------------------------------------------------------------
// polylines: resample, clip to a rectangle, walk in panels
export const resample = (pts, step) => { const out = [pts[0]]; let acc = 0; for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i], l = Math.hypot(b[0] - a[0], b[1] - a[1]); let d = step - acc; while (d < l) { const t = d / l; out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); d += step; } acc = l - (d - step); } if (Math.hypot(out.at(-1)[0] - pts.at(-1)[0], out.at(-1)[1] - pts.at(-1)[1]) > 1e-6) out.push(pts.at(-1)); return out; };
// keep the runs of a polyline that lie inside |x| <= hx, |z| <= hz (a segment crossing the edge is cut at it)
export function clipRuns(pts, hx, hz) {
  const inside = p => Math.abs(p[0]) <= hx && Math.abs(p[1]) <= hz, runs = []; let cur = null;
  const cut = (a, b) => { // point on segment a->b at the rectangle edge (a inside, b outside)
    let t = 1; for (const [c, h] of [[0, hx], [1, hz]]) { const d = b[c] - a[c]; if (d > 0 && b[c] > h) t = Math.min(t, (h - a[c]) / d); if (d < 0 && b[c] < -h) t = Math.min(t, (-h - a[c]) / d); } return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; };
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    if (inside(p)) { if (!cur) { cur = []; if (i > 0 && !inside(pts[i - 1])) cur.push(cut(p, pts[i - 1])); } cur.push(p); }
    else { if (cur) { cur.push(cut(pts[i - 1], p)); runs.push(cur); cur = null; } else if (i > 0 && !inside(pts[i - 1])) { /* both outside: the segment might still cross; ignored (lines are short relative to the margin) */ } }
  }
  if (cur) runs.push(cur); return runs.filter(r => r.length > 1);
}
// panels along a polyline: segments of at most `len` metres, each ending at a vertex where the line turns; returns [[x0,z0,x1,z1], ...]
export function panelsAlong(pts, len) {
  const out = [];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 0.05) continue; const n = Math.max(1, Math.round(L / len));
    for (let k = 0; k < n; k++) out.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n, a[0] + (b[0] - a[0]) * (k + 1) / n, a[1] + (b[1] - a[1]) * (k + 1) / n]);
  }
  return out;
}
// a ribbon along a polyline: vertices (x, z, u, v, mat, obj); v runs -1..1 across, u is the distance along in metres
export function ribbon(pts, halfW, { mat, obj, step = 6, verts, idx }) {
  const P = resample(pts, step); if (P.length < 2) return;
  const base = verts.length / 6; let u = 0;
  for (let i = 0; i < P.length; i++) {
    const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)]; let dx = b[0] - a[0], dz = b[1] - a[1]; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
    if (i > 0) u += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]);
    const nx = -dz, nz = dx;
    verts.push(P[i][0] - nx * halfW, P[i][1] - nz * halfW, u, -1, mat, obj, P[i][0] + nx * halfW, P[i][1] + nz * halfW, u, 1, mat, obj);
  }
  for (let i = 0; i + 1 < P.length; i++) { const a = base + i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
}
