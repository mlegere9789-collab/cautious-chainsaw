// scene/production.mjs - the display stage of the production reproduction: NO dynamics.  The layout's answer is the picture, exactly as the shipped canvas drew it: every bar at its
// relaxed position, no fades, no glides, no repair, so a hold-then-jump keyframe is a hop on screen and an overlap stays an overlap.  What this module adds is only the MEASUREMENT of the
// picture, with the same frame fields the Display class emits so the renderer, the popups, the hit test and the metrics treat both modes alike.
//
// The overlap census counts overlapping pairs among what the shipped canvas paints for different units: bar bodies (rotated rectangles, separating-axis test) and name labels (boxes).
// The new engine's verifier counts pairs among chips, labels and pins; both answer "how many pairs of drawn things of different units overlap" (report 01, section 7).
import { isArt, isCav, labelTextFor, labelFontPx } from '../layout/production.mjs';

const rectPoly = (r) => [[r.x0, r.y0], [r.x1, r.y0], [r.x1, r.y1], [r.x0, r.y1]];
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
const bbox = (poly) => { let x0 = 1e18; let y0 = 1e18; let x1 = -1e18; let y1 = -1e18; for (const [x, y] of poly) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; } return { x0, y0, x1, y1 }; };

/** number of overlapping pairs of painted items of DIFFERENT owners (items: [{owner, poly, bb}]) */
export function censusOverlaps(items) {
  const a = items.slice().sort((p, q) => p.bb.x0 - q.bb.x0); let n = 0;
  for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) {
    const p = a[i]; const q = a[j]; if (q.bb.x0 >= p.bb.x1) break;
    if (p.owner === q.owner || p.bb.y0 >= q.bb.y1 || q.bb.y0 >= p.bb.y1) continue;
    if (polysOverlap(p.poly, q.poly)) n++;
  }
  return n;
}

class ProductionFrames {
  constructor(tok) { this.tok = tok; this.reset(); }
  reset() { this.prevKeys = new Set(); }
  step(L, inp) {
    const P = L.production; const spec = inp.spec; const sel = inp.selectedId; const z = inp.z; const keys = new Set(); const tiles = []; const items = []; const assign = new Map();
    for (const p of P.pe) {
      const id = p.u.id; const st = p.st; const selected = id === sel; const cav = isCav(id, st.disposition); const art = isArt(id, st.disposition); const skirm = st.disposition === 'Skirmish Line';
      const w = p.w; const barH = cav ? 4 : 8; const cx = p.x + p.dx; const cy = p.y + p.dy; const ang = ((st.bearing || 0) - 90) * Math.PI / 180; const c = Math.cos(ang); const s = Math.sin(ang);
      const hw = w / 2; const hh = skirm ? 1.5 : art ? barH / 2 + 2 : barH / 2 + 0.5;
      const corners = [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]].map(([x, y]) => [cx + x * c - y * s, cy + x * s + y * c]);
      const bb = bbox(corners);
      const ex = Math.max(Math.abs(bb.x0 - cx), Math.abs(bb.x1 - cx), 4); const ey = Math.max(Math.abs(bb.y0 - cy), Math.abs(bb.y1 - cy), 11);     // the badge dot (r 3.5) sits 7 px above the centre
      let label = null; const text = z >= 11 && (selected || z >= (P.mobile ? 14 : 12)) ? labelTextFor(id, z, st.strength) : null;
      if (text) {
        const px = labelFontPx(z, selected); const tw = spec.text.width('code', text) * px / 11; const ly = cy - 13;
        label = { text, slot: 't', opacity: 1, x0: cx - tw / 2 - 3, x1: cx + tw / 2 + 3, y0: ly - px / 2 - 2, y1: ly + px / 2 + 2, px };
        items.push({ owner: id, poly: rectPoly(label), bb: label });
      }
      items.push({ owner: id, poly: corners, bb });
      const displaced = Math.abs(p.dx) >= 3 || Math.abs(p.dy) >= 3;
      keys.add(id); assign.set(id, id);
      tiles.push({
        key: id, kind: 'leaf', ids: [id], n: 1, x: cx, y: cy, ax: p.x, ay: p.y, w: ex * 2, h: ey * 2, scale: 1, opacity: 1, solid: true, life: 'live', entering: false, travelling: false, displaced,
        side: p.u.side, arm: p.u.arm, short: p.u.short, badge: null, nameKind: null, ratio: st.ratio, strength: st.strength, disposition: st.disposition, selected, unit: p.u, ageTicks: st.ageTicks, ageMin: st.ageTicks, ageMax: st.ageTicks,
        moving: !!st.moving, members: null, label, bearing: st.bearing || 0, barW: w, barH, art, skirm, cav, engaged: P.engaged.has(id),
      });
    }
    let births = 0; let deaths = 0; for (const k of keys) if (!this.prevKeys.has(k)) births++; for (const k of this.prevKeys) if (!keys.has(k)) deaths++;
    this.prevKeys = keys;
    const overlaps = censusOverlaps(items);
    return { tiles, offsets: new Map(), stats: { births, deaths, handoffs: 0, cut: false, netDims: 0, netRounds: 0, travels: 0, pushed: 0, labelToggles: 0, travelling: 0 }, overlaps, clearanceViolations: 0, unrepresented: 0, assign, solverMs: L.ms, rounds: L.rounds, onField: P.pe.length };
  }
  busy() { return false; }
}

export const PRODUCTION_MOTION = {
  id: 'production', hidden: true, label: 'Production drawing (reproduction)',
  doc: 'No dynamics: the shipped canvas draws the relaxed positions as they are, with no fades, glides or repair. For the before/after comparison; not a design.',
  create(ctx) { const d = new ProductionFrames(ctx.tok); return { step: (L, inp) => d.step(L, inp), reset: () => d.reset(), display: d }; },
};
