// src/lang-minimal.mjs - language (c): minimal glyphs for editorial maps.
//
// WHAT IS WHAT (the README repeats this table):
//   Common cartographic practice (no standard behind it): solid geometric markers coloured by side, size growing with importance.
//   INVENTED here: circle = infantry, triangle = cavalry, square = artillery, rotated square (diamond) = horse artillery, circle with a centre dot = sharpshooters;
//                  a hexagon is a FORMATION (brigade, division, corps: the data gives them no arm) and the number of nested outlines inside it is its echelon (1, 2, 3, 4); base units carry no echelon mark.
//   Nothing here is NATO: no frame, no echelon bars.  A reader learns the three shapes from the legend in five seconds, which is the point of an editorial map.
import { Sprite, el, n2, rect, circle, line, poly, roundPoly, ringReach, sdfCircle, sdfRoundRect, sdfPoly } from './svg.mjs';
import { plate, inkOn, sideColour, shadowBleed, isFormationEch, chipCentre, tabAnchorWithChip } from './common.mjs';

const ECH_RINGS = { brigade: 1, division: 2, corps: 3, army: 4 };

/** size (u) of a marker's reference diameter at this echelon */
export function markerSize(spec, T) {
  const M = T.minimal; const isF = spec.arm === 'formation' || isFormationEch(spec.ech);
  if (isF) return M.formation.size * (M.formation.scale[spec.ech] ?? 1);
  return M.size * (M.scale[spec.ech] ?? 1);
}

const hexPoints = (R) => Array.from({ length: 6 }, (_, i) => { const a = -Math.PI / 2 + (i * Math.PI) / 3; return [Math.cos(a) * R, Math.sin(a) * R]; });
const even2 = (v) => Math.round(v * 2) / 2;

/** silhouette of a marker: { d, left, top, right, bottom }.  The anchor is the centroid (the triangle's centroid is not the middle of its box). */
export function silhouette(spec, T, grow = 0) {
  const M = T.minimal; const D = markerSize(spec, T); const arm = spec.arm; const g = grow;
  if (arm === 'formation' || isFormationEch(spec.ech)) {
    const R = D / 2 + g; const pts = hexPoints(R); const r = Math.max(0.6, M.cornerRadius + g);
    return { d: roundPoly(pts, r), left: -R * 0.866, right: R * 0.866, top: -R, bottom: R, shape: 'hex', sdf: sdfPoly(pts) };
  }
  if (arm === 'cavalry') {
    const s = D * M.triangle + g * 2 * Math.sqrt(3); const Ht = (s * Math.sqrt(3)) / 2; const pts = [[0, -2 * Ht / 3], [s / 2, Ht / 3], [-s / 2, Ht / 3]];
    return { d: roundPoly(pts, Math.max(0.6, M.cornerRadius + g)), left: -s / 2, right: s / 2, top: -2 * Ht / 3, bottom: Ht / 3, shape: 'triangle', sdf: sdfPoly(pts) };
  }
  if (arm === 'artillery') { const q = D * M.square + 2 * g; return { d: rect(-q / 2, -q / 2, q, q, Math.max(0.8, M.cornerRadius * 0.9 + g)), left: -q / 2, right: q / 2, top: -q / 2, bottom: q / 2, shape: 'square', sdf: sdfRoundRect(q / 2, q / 2, Math.max(0.8, M.cornerRadius * 0.9 + g)) }; }
  if (arm === 'horse_artillery') { const a = (D * M.diamond) / 2 + g * Math.SQRT2; return { d: roundPoly([[0, -a], [a, 0], [0, a], [-a, 0]], Math.max(0.6, M.cornerRadius * 0.8 + g)), left: -a, right: a, top: -a, bottom: a, shape: 'diamond', sdf: sdfPoly([[0, -a], [a, 0], [0, a], [-a, 0]]) }; }
  const R = D / 2 + g; return { d: circle(0, 0, R), left: -R, right: R, top: -R, bottom: R, shape: 'circle', sdf: sdfCircle(0, 0, R) };      // infantry, sharpshooter
}

/** the inside of a marker: the sharpshooter's dot, the formation's nested outlines */
export function inside(spec, T, { ink, opacity = 1 }) {
  const M = T.minimal; const o = opacity < 1 ? opacity : undefined; let out = '';
  if (spec.arm === 'sharpshooter') out += el('circle', { cx: 0, cy: 0, r: markerSize(spec, T) * M.dot, fill: ink, fillOpacity: o });
  if (spec.arm === 'formation' || isFormationEch(spec.ech)) {
    const n = ECH_RINGS[spec.ech] ?? 0; const D = markerSize(spec, T);
    for (let i = 0; i < n; i++) {
      const R = D / 2 - M.inner.first - i * M.inner.pitch; if (R < 2.2) break;
      out += el('path', { d: roundPoly(hexPoints(R), Math.max(0.5, M.cornerRadius - 1)), fill: 'none', stroke: ink, strokeWidth: M.inner.stroke, strokeOpacity: (opacity < 1 ? opacity : 1) * M.inner.alpha });
    }
  }
  return out;
}

export function renderBase(spec, T, id) {
  const sp = new Sprite(id); const reach = ringReach(T); const carried = spec.state === 'carried'; const split = spec.side === 'mixed' ? [T.palette.union, T.palette.confederate] : null;
  const S = silhouette(spec, T); const ink = inkOn(T, spec.side);
  sp.add(plate(sp, S.d, { side: spec.side, state: spec.state, T, split }), [S.left - reach, S.top - reach, S.right + reach, S.bottom + reach]);
  const sh = shadowBleed(T); if (!carried) sp.grow(S.left - reach - sh, S.top - reach - sh + 1, S.right + reach + sh, S.bottom + reach + sh + T.shadow.dy);
  sp.add(inside(spec, T, { ink, opacity: carried ? T.carried.glyphOpacity : 1 }));
  const r = sp.finish({ pad: 1 });
  // the status chip: a corner badge on the north-east corner of the marker's box (the marker IS the glyph, so there is no ink box to clear; test/chips.test.mjs bounds how much of the marker the chip may cover)
  const neLocal = chipCentre({ corner: [S.right, S.top], sdf: S.sdf, box: S, T }); const ne = [neLocal[0] + r.ax, neLocal[1] + r.ay]; const tab = [S.right - T.tab.tuck + r.ax, r.ay];
  const anchors = { ne, below: [r.ax, S.bottom + reach + r.ay], left: [S.left - reach + r.ax, r.ay], right: [S.right + reach + r.ax, r.ay], tab, tabChip: tabAnchorWithChip(tab, ne, T) };
  return { ...r, core: [S.left - reach + r.ax, S.top - reach + r.ay, S.right + reach + r.ax, S.bottom + reach + r.ay], anchors, ink: null, strip: null, shape: S.shape };
}

export default {
  id: 'minimal',
  label: 'Minimal glyphs',
  silhouette: (spec, T, grow = 0) => { const S = silhouette(spec, T, grow); S.id = `${S.shape}-${spec.ech}`; return S; },
  aggFrame(T) { const R = T.agg.minimal.d / 2; return { d: (g) => circle(0, 0, R + g), left: -R, right: R, top: -R, bottom: R, count: { x: -R * 0.7, y: -R * 0.78, w: R * 1.4, h: 13 }, row: { x0: -R * 0.62, y0: R * 0.2, x1: R * 0.62, y1: R * 0.68 }  }; },
  base: renderBase,
  /** an arm marker in a box (aggregate rows): the same shape the base marker is, drawn in `ink` */
  glyph(arm, { T, ink, back, box, opacity = 1 }) {
    const w = box.x1 - box.x0; const h = box.y1 - box.y0; const s = Math.min(w, h); const cx = (box.x0 + box.x1) / 2; const cy = (box.y0 + box.y1) / 2; const o = opacity < 1 ? opacity : undefined;
    const sp = { arm, ech: 'regiment' }; const T2 = T;
    let d;
    if (arm === 'infantry' || arm === 'sharpshooter') d = circle(0, 0, s / 2);
    else if (arm === 'cavalry') { const t = s * 1.06; const Ht = (t * Math.sqrt(3)) / 2; d = roundPoly([[0, -2 * Ht / 3 + Ht / 6], [t / 2, Ht / 3 + Ht / 6], [-t / 2, Ht / 3 + Ht / 6]], 1); }
    else if (arm === 'artillery') d = rect(-s * 0.44, -s * 0.44, s * 0.88, s * 0.88, 1);
    else if (arm === 'horse_artillery') d = roundPoly([[0, -s / 2], [s / 2, 0], [0, s / 2], [-s / 2, 0]], 0.8);
    else d = roundPoly(hexPoints(s / 2), 0.8);                       // formation: a hexagon outline
    const filled = arm !== 'formation';
    return el('g', { transform: `translate(${n2(cx)} ${n2(cy)})` }, el('path', { d, fill: filled ? ink : 'none', fillOpacity: o, stroke: filled ? undefined : ink, strokeWidth: filled ? undefined : 1.3, strokeOpacity: o })
      + (arm === 'sharpshooter' ? el('circle', { cx: 0, cy: 0, r: s * 0.13, fill: back }) : ''));
  },
};
