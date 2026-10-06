// layout-lab/lib/legacy.mjs - a faithful port of the SHIPPED unit canvas (baseline/dist/assets/index-Cg8FAMXN.js, function lS, pretty-printed
// copy: tmp/pitch-anim/layout/base-pretty.js lines 55512-55591) so the lab can measure what production does today.
//   glyph  : rect  w = lA(strength) = clamp(round(strength/4), 10, 120)  (mobile: /6, <= 60),  h = 8 (cavalry 4),  rotated by (bearing-90) deg,
//            drawn at (x+dx, y+dy); posture dot r=3.5 at y-7 (ignored here: it lies inside the label's column and is not a separate box)
//   labels : only when zoom >= 12 (14 on canvases narrower than 500 px); text by zoom (Y4): >=14 code, 12..14 code.slice(0,6); bold 8/9/10 px;
//            pill = text width + 6 by font size + 4, centred at (x+dx, y+dy-13)
//   layout : 8 passes of pairwise pushes (x if the x-overlap is the smaller one, else y), 12 px vertical threshold, only when zoom >= 11
// What it measures: overlap pairs among glyph OBBs and label pills (SAT), displacement (px) and the positions' lies.
import { project } from './data.mjs';
import { textWidth } from './spec.mjs';
import { worldOrigin } from './tiles.mjs';

export const lA = (strength, mobile = false) => Math.max(10, Math.min(mobile ? 60 : 120, Math.round((strength || 200) / (mobile ? 6 : 4))));
const isArt = (u, st) => st.disposition === 'Deployed Artillery' || st.disposition === 'Limbered Artillery' || u.id.includes('ART');
const isCav = (u, st) => st.disposition === 'Mounted Cavalry' || st.disposition === 'Dismounted Cavalry' || u.id.includes('CAV');
function cx(id) { const x = id.replace(/^[UC]-/, ''); const m = x.match(/^(\d+)([A-Z]{2,})$/); return m ? m[1] + ' ' + m[2] : x.includes('-') ? x.replace(/-/g, '/').slice(0, 10) : x.slice(0, 8); }
function labelText(id, z, strength) {
  if (z >= 16.5) return cx(id) + (strength ? ' ' + strength : '');
  if (z >= 14) return cx(id);
  if (z >= 12) return cx(id).slice(0, 6);
  return null;
}

/** vis = [{u, st}] in the order the shipped code iterates (first-seen order). Returns the drawn geometry and the relaxation's displacement. */
export function legacyLayout(vis, z, { mobile = false } = {}) {
  const [ox, oy] = worldOrigin(z);
  const pe = vis.map(({ u, st }) => { const [x, y] = project(st.lng, st.lat, z); return { u, st, x: x - ox, y: y - oy, dx: 0, dy: 0, w: lA(st.strength, mobile) }; });
  if (z >= 11 && pe.length > 1) {
    for (let pass = 0; pass < 8; pass++) for (let a = 0; a < pe.length; a++) {
      const sn = pe[a]; const half = sn.w / 2 + 2;
      for (let b = a + 1; b < pe.length; b++) {
        const yi = pe[b]; const half2 = yi.w / 2 + 2;
        const er = sn.x + sn.dx; const zn = sn.y + sn.dy; const dt = yi.x + yi.dx; const vt = yi.y + yi.dy;
        const ut = half + half2 - Math.abs(er - dt); const an = 12 - Math.abs(zn - vt);
        if (ut > 0 && an > 0) {
          const pi = ut > an ? 0 : (er < dt ? -ut / 2 : ut / 2); const yn = ut > an ? (zn < vt ? -an / 2 : an / 2) : 0;
          sn.dx += pi; sn.dy += yn; yi.dx -= pi; yi.dy -= yn;
        }
      }
    }
  }
  const glyphs = []; const labels = [];
  for (const p of pe) {
    const w = p.w; const h = isCav(p.u, p.st) ? 4 : 8; const ang = ((p.st.bearing || 0) - 90) * Math.PI / 180;
    const cxp = p.x + p.dx; const cyp = p.y + p.dy;
    const c = Math.cos(ang); const s = Math.sin(ang);
    const hw = w / 2; const hh = isArt(p.u, p.st) ? h / 2 + 1 : h / 2;
    glyphs.push({ owner: p.u.id, cx: cxp, cy: cyp, poly: [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]].map(([x, y]) => [cxp + x * c - y * s, cyp + x * s + y * c]) });
    const lt = (z >= (mobile ? 14 : 12)) ? labelText(p.u.id, z, p.st.strength) : null;
    if (lt) {
      const size = z >= 16 ? 10 : z >= 14 ? 9 : 8;
      const tw = textWidth('code', lt) * size / 11; const ly = cyp - 13;
      labels.push({ owner: p.u.id, x0: cxp - tw / 2 - 3, x1: cxp + tw / 2 + 3, y0: ly - size / 2 - 2, y1: ly + size / 2 + 2 });
    }
  }
  const disp = pe.map((p) => Math.hypot(p.dx, p.dy));
  return { pe, glyphs, labels, disp };
}

// separating-axis test for two convex polygons (strict interior overlap)
function polysOverlap(A, B) {
  for (const P of [A, B]) {
    for (let i = 0; i < P.length; i++) {
      const [x1, y1] = P[i]; const [x2, y2] = P[(i + 1) % P.length]; const nx = y1 - y2; const ny = x2 - x1;
      let a0 = 1e18; let a1 = -1e18; let b0 = 1e18; let b1 = -1e18;
      for (const [x, y] of A) { const d = x * nx + y * ny; if (d < a0) a0 = d; if (d > a1) a1 = d; }
      for (const [x, y] of B) { const d = x * nx + y * ny; if (d < b0) b0 = d; if (d > b1) b1 = d; }
      if (a1 <= b0 + 1e-9 || b1 <= a0 + 1e-9) return false;
    }
  }
  return true;
}
const rectPoly = (r) => [[r.x0, r.y0], [r.x1, r.y0], [r.x1, r.y1], [r.x0, r.y1]];
const bbox = (poly) => { let x0 = 1e18; let y0 = 1e18; let x1 = -1e18; let y1 = -1e18; for (const [x, y] of poly) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } return { x0, y0, x1, y1 }; };

/** overlap census of the legacy drawing: glyph-glyph, glyph-label, label-label pairs (different units) */
export function legacyOverlaps(L) {
  const items = [
    ...L.glyphs.map((g) => ({ kind: 'glyph', owner: g.owner, poly: g.poly, bb: bbox(g.poly) })),
    ...L.labels.map((l) => ({ kind: 'label', owner: l.owner, poly: rectPoly(l), bb: l })),
  ];
  items.sort((a, b) => a.bb.x0 - b.bb.x0);
  const out = { 'glyph+glyph': 0, 'glyph+label': 0, 'label+label': 0 };
  for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
    const a = items[i]; const b = items[j];
    if (b.bb.x0 >= a.bb.x1) break;
    if (a.owner === b.owner) continue;
    if (a.bb.y0 >= b.bb.y1 || b.bb.y0 >= a.bb.y1) continue;
    if (!polysOverlap(a.poly, b.poly)) continue;
    const key = a.kind === b.kind ? a.kind + '+' + b.kind : 'glyph+label'; out[key]++;
  }
  return out;
}
