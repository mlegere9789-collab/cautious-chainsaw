// GAZETTEER: named places of the battlefield with coordinates taken ONLY from files of this repository (data/gazetteer.json, built by
// tools/build-gazetteer.mjs from docs/basemap1863 roads, water, landcover and structures layers and the site's tour stops and monuments).
// A place is never a point claim: every entry carries sigma_m (a radius from the feature size or from the spread of the features that name it)
// and the list of source files it came from. A name this module cannot resolve returns null; the caller records it as an open gap. Nothing is guessed.
//
// Geometry helpers work in WGS84 degrees and metres on a local tangent plane (equirectangular about 39.81 N, ample at 10 km).
// metres per degree at 39.81 N from the WGS84 series (meridian arc / parallel arc), not the equatorial values
const PHI = 39.81 * Math.PI / 180;
export const M_LAT = 111132.92 - 559.82 * Math.cos(2 * PHI) + 1.175 * Math.cos(4 * PHI);
export const M_LNG = 111412.84 * Math.cos(PHI) - 93.5 * Math.cos(3 * PHI) + 0.118 * Math.cos(5 * PHI);

// name normalisation shared by the builder, the placement validator and the lookup: lower case, apostrophes and punctuation folded, 'the' dropped
export const norm = s => String(s ?? '').toLowerCase().replace(/[’‘´`�']/g, '').replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').replace(/\bthe\b/g, ' ').replace(/\s+/g, ' ').trim();
export const distM = (a, b) => Math.hypot((a.lng - b.lng) * M_LNG, (a.lat - b.lat) * M_LAT);
export const toXY = p => [p.lng * M_LNG, p.lat * M_LAT];

// closest point on a polyline (array of {lng,lat}) to p: { point, index, t, d, s } where s is the arc length (m) from the line start to the point
export function nearestOnLine(line, p) {
  let best = null, acc = 0;
  for (let i = 0; i + 1 < line.length; i++) {
    const a = line[i], b = line[i + 1], ax = a.lng * M_LNG, ay = a.lat * M_LAT, bx = b.lng * M_LNG, by = b.lat * M_LAT, px = p.lng * M_LNG, py = p.lat * M_LAT;
    const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy, t = L2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / L2)) : 0, qx = ax + dx * t, qy = ay + dy * t, d = Math.hypot(px - qx, py - qy), seg = Math.sqrt(L2);
    if (!best || d < best.d) best = { point: { lng: qx / M_LNG, lat: qy / M_LAT }, index: i, t, d, s: acc + seg * t };
    acc += seg;
  }
  return best;
}
export function lineLength(line) { let s = 0; for (let i = 0; i + 1 < line.length; i++) s += distM(line[i], line[i + 1]); return s; }
// the part of a polyline between arc lengths s0 and s1 (either order), returned in travel order from s0 to s1
export function sliceLine(line, s0, s1) {
  const rev = s1 < s0, lo = Math.min(s0, s1), hi = Math.max(s0, s1), out = []; let acc = 0;
  const at = (i, f) => ({ lng: line[i].lng + (line[i + 1].lng - line[i].lng) * f, lat: line[i].lat + (line[i + 1].lat - line[i].lat) * f });
  for (let i = 0; i + 1 < line.length; i++) {
    const seg = distM(line[i], line[i + 1]), a = acc, b = acc + seg; acc = b;
    if (b < lo || a > hi || seg === 0) continue;
    if (!out.length) out.push(at(i, Math.max(0, (lo - a) / seg)));
    out.push(hi >= b ? { ...line[i + 1] } : at(i, (hi - a) / seg));
  }
  return rev ? out.reverse() : out;
}
// where a polyline crosses the rectangle { lng0, lng1, lat0, lat1 } (all crossings, in line order): [{ point, s, inward }] where inward means the line goes from outside to inside
export function boxCrossings(line, box) {
  const inside = p => p.lng >= box.lng0 && p.lng <= box.lng1 && p.lat >= box.lat0 && p.lat <= box.lat1, out = []; let acc = 0;
  for (let i = 0; i + 1 < line.length; i++) {
    const a = line[i], b = line[i + 1], seg = distM(a, b), ia = inside(a), ib = inside(b);
    if (ia !== ib) {
      let tmin = 0, tmax = 1; const dx = b.lng - a.lng, dy = b.lat - a.lat;     // Liang-Barsky clip of the segment against the rectangle
      for (const [p, q] of [[-dx, a.lng - box.lng0], [dx, box.lng1 - a.lng], [-dy, a.lat - box.lat0], [dy, box.lat1 - a.lat]]) {
        if (p === 0) { if (q < 0) { tmin = 2; } } else { const r = q / p; if (p < 0) tmin = Math.max(tmin, r); else tmax = Math.min(tmax, r); }
      }
      if (tmin <= tmax) { const t = ib ? tmin : tmax; out.push({ point: { lng: a.lng + dx * t, lat: a.lat + dy * t }, s: acc + seg * t, inward: ib }); }
    }
    acc += seg;
  }
  return out;
}
export const insideBox = (p, box, padM = 0) => p.lng >= box.lng0 + padM / M_LNG && p.lng <= box.lng1 - padM / M_LNG && p.lat >= box.lat0 + padM / M_LAT && p.lat <= box.lat1 - padM / M_LAT;

export class Gazetteer {
  constructor(data) {
    this.data = data; this.places = data.places; this.byName = new Map(); this.ambiguous = new Set();
    for (const p of this.places) for (const n of [p.name, ...(p.aliases || [])]) {
      const k = norm(n); if (!k) continue;
      if (this.byName.has(k) && this.byName.get(k) !== p) this.ambiguous.add(k); else this.byName.set(k, p);
    }
    for (const k of this.ambiguous) this.byName.delete(k);          // a name that two entries claim is not resolved by guessing which
  }
  // -> place or null (null for unknown and for ambiguous names)
  resolve(name) { return this.byName.get(norm(name)) || null; }
  isAmbiguous(name) { return this.ambiguous.has(norm(name)); }
  // representative point of an entry: its centre, or for a line the vertex at the middle arc length
  centre(place) { return place.center; }
}

// ---- small geodesy helpers used by the track planner -------------------------------------------------------------------------------------------
export const bearingDegLL = (a, b) => (Math.atan2((b.lng - a.lng) * M_LNG, (b.lat - a.lat) * M_LAT) * 180 / Math.PI + 360) % 360;           // 0 = north, clockwise
export const offsetLL = (p, eastM, northM) => ({ lng: p.lng + eastM / M_LNG, lat: p.lat + northM / M_LAT });
export function polylineLength(pts) { let s = 0; for (let i = 0; i + 1 < pts.length; i++) s += distM(pts[i], pts[i + 1]); return s; }
// Douglas-Peucker simplification of a polyline to a tolerance in metres (keeps the ends)
export function simplify(pts, tolM) {
  if (pts.length < 3) return pts.slice();
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1; const st = [[0, pts.length - 1]];
  while (st.length) {
    const [a, b] = st.pop(); let dm = 0, im = -1; const A = toXY(pts[a]), B = toXY(pts[b]), dx = B[0] - A[0], dy = B[1] - A[1], L2 = dx * dx + dy * dy;
    for (let i = a + 1; i < b; i++) { const P = toXY(pts[i]); const t = L2 ? Math.max(0, Math.min(1, ((P[0] - A[0]) * dx + (P[1] - A[1]) * dy) / L2)) : 0; const d = Math.hypot(P[0] - (A[0] + dx * t), P[1] - (A[1] + dy * t)); if (d > dm) { dm = d; im = i; } }
    if (dm > tolM && im > 0) { keep[im] = 1; st.push([a, im], [im, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}
