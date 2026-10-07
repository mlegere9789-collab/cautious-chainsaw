// src/svg.mjs - the small SVG toolkit every frame language is written with.  No dependencies.  All lengths are "u" = CSS px at 1x (the atlas renders the same drawing at 1x, 2x and 3x).
//
// A symbol is built in LOCAL coordinates whose origin is the ANCHOR (the point that stands on the unit's true position: the centre of the frame).  `Sprite` collects layers and, at the end, computes the
// ink bounds, rounds them out to whole units and shifts everything so that the sprite is a plain w x h picture whose anchor offset (ax, ay) is an integer: that is what makes the atlas pixel-exact.

export const n2 = (v) => { const r = Math.round(v * 100) / 100; return Object.is(r, -0) ? 0 : r; };
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

export const attrs = (o) => Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== false).map(([k, v]) => ` ${k.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())}="${esc(typeof v === 'number' ? n2(v) : v)}"`).join('');
export const el = (tag, a = {}, inner = '') => (inner === '' ? `<${tag}${attrs(a)}/>` : `<${tag}${attrs(a)}>${inner}</${tag}>`);

/** path helpers (all return path data strings) */
export const rect = (x, y, w, h, r = 0) => {
  r = Math.min(r, w / 2, h / 2);
  if (r <= 0) return `M${n2(x)} ${n2(y)}H${n2(x + w)}V${n2(y + h)}H${n2(x)}Z`;
  return `M${n2(x + r)} ${n2(y)}H${n2(x + w - r)}A${n2(r)} ${n2(r)} 0 0 1 ${n2(x + w)} ${n2(y + r)}V${n2(y + h - r)}A${n2(r)} ${n2(r)} 0 0 1 ${n2(x + w - r)} ${n2(y + h)}H${n2(x + r)}A${n2(r)} ${n2(r)} 0 0 1 ${n2(x)} ${n2(y + h - r)}V${n2(y + r)}A${n2(r)} ${n2(r)} 0 0 1 ${n2(x + r)} ${n2(y)}Z`;
};
export const circle = (cx, cy, r) => `M${n2(cx - r)} ${n2(cy)}A${n2(r)} ${n2(r)} 0 1 0 ${n2(cx + r)} ${n2(cy)}A${n2(r)} ${n2(r)} 0 1 0 ${n2(cx - r)} ${n2(cy)}Z`;
export const line = (x1, y1, x2, y2) => `M${n2(x1)} ${n2(y1)}L${n2(x2)} ${n2(y2)}`;
export const poly = (pts, close = false) => 'M' + pts.map((p) => `${n2(p[0])} ${n2(p[1])}`).join('L') + (close ? 'Z' : '');
/** polygon with rounded corners (radius r on every vertex; clipped to half of the shorter adjacent edge) */
export function roundPoly(pts0, r) {
  const pts = pts0.filter((p, i) => { const q = pts0[(i + 1) % pts0.length]; return Math.abs(p[0] - q[0]) > 1e-6 || Math.abs(p[1] - q[1]) > 1e-6; });      // drop zero-length edges (a duplicated vertex would give NaN)
  const n = pts.length; let d = '';
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i + n - 1) % n]; const p1 = pts[i]; const p2 = pts[(i + 1) % n];
    const v1 = [p0[0] - p1[0], p0[1] - p1[1]]; const v2 = [p2[0] - p1[0], p2[1] - p1[1]];
    const l1 = Math.hypot(...v1); const l2 = Math.hypot(...v2);
    const ang = Math.acos(Math.max(-1, Math.min(1, (v1[0] * v2[0] + v1[1] * v2[1]) / (l1 * l2))));
    const t = Math.min(r / Math.tan(ang / 2), l1 / 2, l2 / 2); const rr = t * Math.tan(ang / 2);
    const a = [p1[0] + (v1[0] / l1) * t, p1[1] + (v1[1] / l1) * t]; const b = [p1[0] + (v2[0] / l2) * t, p1[1] + (v2[1] / l2) * t];
    const cross = v1[0] * v2[1] - v1[1] * v2[0];
    d += (i === 0 ? 'M' : 'L') + `${n2(a[0])} ${n2(a[1])}` + `A${n2(rr)} ${n2(rr)} 0 0 ${cross < 0 ? 1 : 0} ${n2(b[0])} ${n2(b[1])}`;
  }
  return d + 'Z';
}

/** a sprite under construction: `layers` is an array of SVG strings in local coordinates; `bounds` is grown by add(); defs collects gradients, filters and patterns */
export class Sprite {
  constructor(id) { this.id = id; this.layers = []; this.defs = []; this.b = [Infinity, Infinity, -Infinity, -Infinity]; this.meta = {}; this._n = 0; }
  uid(p = 'd') { return `${this.id}-${p}${++this._n}`; }
  grow(x0, y0, x1, y1) { const b = this.b; b[0] = Math.min(b[0], x0); b[1] = Math.min(b[1], y0); b[2] = Math.max(b[2], x1); b[3] = Math.max(b[3], y1); return this; }
  add(svg, bounds) { this.layers.push(svg); if (bounds) this.grow(...bounds); return this; }
  def(svg) { this.defs.push(svg); return this; }
  /** finish: returns { svg, w, h, ax, ay, bounds } (bounds = ink bounds in sprite pixels).  `pad` extra units of margin on every side (shadow bleed is added by the caller through grow()). */
  finish({ pad = 0, minW = 0, minH = 0 } = {}) {
    let [x0, y0, x1, y1] = this.b; x0 = Math.floor(x0 - pad); y0 = Math.floor(y0 - pad); x1 = Math.ceil(x1 + pad); y1 = Math.ceil(y1 + pad);
    const w = Math.max(minW, x1 - x0); const h = Math.max(minH, y1 - y0);
    const ax = -x0; const ay = -y0;
    const body = `<g transform="translate(${ax} ${ay})">${this.layers.join('')}</g>`;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${this.defs.length ? `<defs>${this.defs.join('')}</defs>` : ''}${body}</svg>`;
    return { svg, w, h, ax, ay, bounds: [this.b[0] + ax, this.b[1] + ay, this.b[2] + ax, this.b[3] + ay] };
  }
}

/** the "dual ring" every tile and mark carries: a light ring inside a dark ring, so that at least one of them is 3:1 against ANY backdrop (see colour tests).
 *  `d` is the silhouette path; the fill is painted last by the caller.  Returns the SVG for the rings (draw before the fill). */
export function rings(d, T, { dark = true, light = true, dash = null, lightAlpha = 1 } = {}) {
  const R = T.ring; let out = '';
  const dk = R.light + R.dark; const lw = R.light;
  if (dark) out += el('path', { d, fill: 'none', stroke: T.palette.keyline, strokeOpacity: R.darkAlpha, strokeWidth: 2 * dk, strokeLinejoin: 'round' });
  if (light) out += el('path', { d, fill: 'none', stroke: T.palette.bone, strokeOpacity: lightAlpha, strokeWidth: 2 * lw, strokeLinejoin: 'round', strokeDasharray: dash || undefined });
  return out;
}
export const ringReach = (T) => T.ring.light + T.ring.dark;

// ---- signed distance functions (negative inside, positive outside), used to place overlays by measurement instead of by hand-tuned offsets -------------------------------------------------------------------------
export const sdfCircle = (cx, cy, R) => (x, y) => Math.hypot(x - cx, y - cy) - R;
export const sdfRoundRect = (hw, hh, r = 0, cx = 0, cy = 0) => (x, y) => { const qx = Math.abs(x - cx) - (hw - r); const qy = Math.abs(y - cy) - (hh - r); return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r; };
export const sdfPoly = (pts) => (x, y) => {
  let d2 = Infinity; let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [ax, ay] = pts[j]; const [bx, by] = pts[i]; const ex = bx - ax; const ey = by - ay; const t = Math.max(0, Math.min(1, ((x - ax) * ex + (y - ay) * ey) / (ex * ex + ey * ey)));
    d2 = Math.min(d2, (x - ax - t * ex) ** 2 + (y - ay - t * ey) ** 2);
    if ((ay > y) !== (by > y) && x < ((bx - ax) * (y - ay)) / (by - ay) + ax) inside = !inside;
  }
  return inside ? -Math.sqrt(d2) : Math.sqrt(d2);
};
export const sdfUnion = (...f) => (x, y) => Math.min(...f.map((g) => g(x, y)));
