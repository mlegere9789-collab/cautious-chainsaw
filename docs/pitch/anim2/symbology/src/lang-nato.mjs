// src/lang-nato.mjs - language (a): NATO-spirit frames.
//
// WHAT IS NATO HERE, WHAT IS NOT (the README repeats this table; see "Honest naming"):
//   NATO / APP-6 / MIL-STD-2525 convention (read: https://en.wikipedia.org/wiki/NATO_Joint_Military_Symbology, 2026-10-06): affiliation by frame shape (rectangle = friend, diamond = hostile, quatrefoil = unknown),
//     arm by a small icon (infantry = saltire, cavalry / reconnaissance = one diagonal, field artillery = a filled circle), echelon by marks above the frame (I company/battery, II battalion, III regiment,
//     X brigade, XX division, XXX corps, XXXX army), solid frame = present.
//   ADAPTED here:  flat plates in two army colours with a light and a dark ring instead of black line work; rounded corners (2 u); the diamond means "the other army", not "hostile"; the echelon marks are drawn bone
//     with a dark keyline so they read on any backdrop.
//   INVENTED here: the split rectangle for an aggregate of both sides; the plate size growing with echelon; the dotted-ring carried-forward state; horse artillery (dot over slash) and sharpshooters (saltire with a
//     ring) have no NATO symbol: the combination of two existing icons and the scope ring are conventions of this project (horse artillery as gun-over-slash is common wargame practice).
import { Sprite, el, n2, rect, circle, line, poly, roundPoly, sdfCircle, sdfRoundRect, sdfPoly, sdfUnion } from './svg.mjs';
import { plate, inkOn, sideColour, shadowBleed, isFormationEch, chipCentre, tabAnchorWithChip } from './common.mjs';
import { ringReach } from './svg.mjs';

const even = (v) => 2 * Math.round(v / 2);

/** the silhouette of a plate and the box a glyph may use.  grow > 0 returns the same shape larger by `grow` on every side (selection ring, shadow) */
export function frameGeometry(spec, T, grow = 0) {
  const L = T.nato; const k = T.scale.ech[spec.ech] ?? 1; const shape = L.shape[spec.side] || 'rect';
  if (shape === 'diamond') {
    const a = even(L.diamond.diag * k / 2); const g = grow * Math.SQRT2;
    return { shape, a, top: -a, bottom: a, left: -a, right: a, sdf: sdfPoly([[0, -a], [a, 0], [0, a], [-a, 0]]), d: roundPoly([[0, -(a + g)], [a + g, 0], [0, a + g], [-(a + g), 0]], Math.max(0.6, 2.4 + grow)), box: { x0: -a / 2 + 1, y0: -a / 2 + 1, x1: a / 2 - 1, y1: a / 2 - 1 } };
  }
  if (shape === 'quatrefoil') {
    const a = even(L.diamond.diag * k / 2) + grow; const r = a * 0.52; const c0 = a - r; const cx = (c0 + Math.sqrt(2 * r * r - c0 * c0)) / 2;
    const d = `M${n2(cx)} ${n2(-cx)}A${n2(r)} ${n2(r)} 0 0 1 ${n2(cx)} ${n2(cx)}A${n2(r)} ${n2(r)} 0 0 1 ${n2(-cx)} ${n2(cx)}A${n2(r)} ${n2(r)} 0 0 1 ${n2(-cx)} ${n2(-cx)}A${n2(r)} ${n2(r)} 0 0 1 ${n2(cx)} ${n2(-cx)}Z`;
    const a0 = a - grow; return { shape, a: a0, top: -a0, bottom: a0, left: -a0, right: a0, sdf: sdfUnion(sdfCircle(cx, cx, r), sdfCircle(-cx, cx, r), sdfCircle(cx, -cx, r), sdfCircle(-cx, -cx, r)), d, box: { x0: -a0 * 0.4, y0: -a0 * 0.4, x1: a0 * 0.4, y1: a0 * 0.4 } };
  }
  const w = even(L.frame.w * k); const h = even(L.frame.h * k); const r = L.frame.radius;
  return { shape: 'rect', w, h, top: -h / 2, bottom: h / 2, left: -w / 2, right: w / 2, sdf: sdfRoundRect(w / 2, h / 2, r), d: rect(-w / 2 - grow, -h / 2 - grow, w + 2 * grow, h + 2 * grow, Math.max(0.5, r + grow)), box: { x0: -w / 2 + L.glyph.inset, y0: -h / 2 + L.glyph.inset, x1: w / 2 - L.glyph.inset, y1: h / 2 - L.glyph.inset } };
}

/** the arm glyph in a box; returns svg.  `ink` colour, `back` = plate colour (to knock out a ring) */
export function armGlyph(arm, box, { T, ink, back, k = 1, opacity = 1, ctxFormation = false, strokeScale = 1 }) {
  const G = T.nato.glyph; const sw = G.stroke * strokeScale; const { x0, y0, x1, y1 } = box;
  const bx = (x0 + x1) / 2; const by = (y0 + y1) / 2;            // the centre of the box: a base symbol's box is centred on the anchor (0, 0), an aggregate row's box is not
  const st = { stroke: ink, strokeWidth: sw, strokeLinecap: 'round', fill: 'none', strokeOpacity: opacity < 1 ? opacity : undefined };
  const dotR = G.dot * Math.max(0.8, Math.min(1.5, k)) * strokeScale; const dot = el('circle', { cx: bx, cy: by, r: dotR, fill: ink, fillOpacity: opacity < 1 ? opacity : undefined });
  const X = () => el('path', { d: line(x0, y0, x1, y1) + line(x0, y1, x1, y0), ...st });
  const slash = () => el('path', { d: line(x0, y1, x1, y0), ...st });
  switch (arm) {
    case 'infantry': return X();
    case 'cavalry': return slash();
    case 'artillery': return dot;
    case 'horse_artillery': return slash() + dot;
    case 'sharpshooter': return X() + el('circle', { cx: bx, cy: by, r: Math.min(3.4, (x1 - x0) * 0.3), fill: back, stroke: ink, strokeWidth: sw * 0.75, strokeOpacity: opacity < 1 ? opacity : undefined });
    case 'formation': return ctxFormation ? el('rect', { x: x0, y: y0, width: x1 - x0, height: y1 - y0, rx: 1, fill: 'none', ...st, strokeWidth: sw * 0.6 }) : '';
    default: return '';
  }
}

/** echelon marks above the frame: bars for battery / battalion / regiment, X for brigade and up (NATO) */
export const ECH_MARK = { battery: ['bar', 1], regiment: ['bar', 3], battalion: ['bar', 2], brigade: ['x', 1], division: ['x', 2], corps: ['x', 3], army: ['x', 4] };
export function echelonMarks(ech, y0, T) {
  const E = T.nato.echelon; const [kind, n] = ECH_MARK[ech] || ['bar', 0]; if (!n) return null;
  if (!E.base && (ech === 'battery' || ech === 'regiment')) return null;
  const sw = E.stroke; let d = ''; let wTot;
  if (kind === 'bar') { wTot = (n - 1) * E.pitch; for (let i = 0; i < n; i++) { const x = -wTot / 2 + i * E.pitch; d += line(x, y0 + sw / 2, x, y0 + E.bar - sw / 2); } }
  else { const s = E.xSize; const pitch = s + 2; wTot = (n - 1) * pitch; for (let i = 0; i < n; i++) { const cx = -wTot / 2 + i * pitch; d += line(cx - s / 2, y0 + 1, cx + s / 2, y0 + 1 + s) + line(cx - s / 2, y0 + 1 + s, cx + s / 2, y0 + 1); } }
  const h = kind === 'bar' ? E.bar : E.xSize + 2;
  return { d, w: kind === 'bar' ? wTot + sw : wTot + E.xSize + sw, h, sw };
}
export const markSvg = (m, T) => el('path', { d: m.d, fill: 'none', stroke: T.palette.bone, strokeWidth: m.sw + 2 * T.nato.echelon.keyline, strokeLinecap: 'round', strokeLinejoin: 'round' })
  + el('path', { d: m.d, fill: 'none', stroke: T.palette.keyline, strokeWidth: m.sw, strokeLinecap: 'round', strokeLinejoin: 'round' });

/** one base symbol.  spec = { side, arm, ech, state } */
export function renderBase(spec, T, id) {
  const sp = new Sprite(id); const F = frameGeometry(spec, T); const reach = ringReach(T);
  const carried = spec.state === 'carried'; const split = spec.side === 'mixed' ? [T.palette.union, T.palette.confederate] : null;
  const base = sideColour(T, spec.side); const ink = inkOn(T, spec.side);
  sp.add(plate(sp, F.d, { side: spec.side, state: spec.state, T, split }), [F.left - reach, F.top - reach, F.right + reach, F.bottom + reach]);
  const sh = shadowBleed(T);
  if (!carried) sp.grow(F.left - reach - sh, F.top - reach - sh + 1, F.right + reach + sh, F.bottom + reach + sh + T.shadow.dy);
  const back = split ? T.palette.union : carried ? plateBack(T, base) : base;
  sp.add(armGlyph(spec.arm, F.box, { T, ink, back, k: T.scale.ech[spec.ech] ?? 1, opacity: carried ? T.carried.glyphOpacity : 1 }));
  if (spec.arm === 'formation' && T.nato.formation.mode === 'inner') {
    const I = frameGeometry(spec, T, -T.nato.formation.inset);
    sp.add(el('path', { d: I.d, fill: 'none', stroke: ink, strokeWidth: T.nato.formation.stroke, strokeOpacity: (carried ? T.carried.glyphOpacity : 1) * T.nato.formation.alpha }));
  }
  const E = T.nato.echelon; const m0 = echelonMarks(spec.ech, 0, T); let strip = null;
  if (m0) {
    const y0 = F.top - reach - E.gap - m0.h; const m = echelonMarks(spec.ech, y0, T);
    sp.add(markSvg(m, T), [-m.w / 2 - E.keyline - 1, y0 - E.keyline - 1, m.w / 2 + E.keyline + 1, y0 + m.h + E.keyline + 1]); strip = [-m.w / 2 - E.keyline, y0 - E.keyline, m.w / 2 + E.keyline, y0 + m.h + E.keyline];
  }
  const r = sp.finish({ pad: 1 });
  const core = [F.left - reach + r.ax, F.top - reach + r.ay, F.right + reach + r.ax, F.bottom + reach + r.ay];
  // the status chip: a corner badge that clears the glyph ink and the echelon marks (src/common.mjs chipCentre)
  const G = T.nato.glyph;
  const inkBox = spec.arm === 'formation' ? (T.nato.formation.mode === 'inner' ? [F.left + T.nato.formation.inset - 1, F.top + T.nato.formation.inset - 1, F.right - T.nato.formation.inset + 1, F.bottom - T.nato.formation.inset + 1] : null)
    : [F.box.x0 - G.stroke / 2, F.box.y0 - G.stroke / 2, F.box.x1 + G.stroke / 2, F.box.y1 + G.stroke / 2];
  const neLocal = chipCentre({ corner: [F.right, F.top], sdf: F.sdf, box: F, ink: spec.arm === 'formation' ? null : inkBox, strip, T });
  const ne = [neLocal[0] + r.ax, neLocal[1] + r.ay]; const tab = [F.right - T.tab.tuck + r.ax, r.ay];
  const anchors = { ne, below: [r.ax, F.bottom + reach + r.ay], left: [F.left - reach + r.ax, r.ay], right: [F.right + reach + r.ax, r.ay], tab, tabChip: tabAnchorWithChip(tab, ne, T) };
  return { ...r, core, anchors, ink: inkBox && spec.arm !== 'formation' ? [inkBox[0] + r.ax, inkBox[1] + r.ay, inkBox[2] + r.ax, inkBox[3] + r.ay] : null, strip: strip && [strip[0] + r.ax, strip[1] + r.ay, strip[2] + r.ax, strip[3] + r.ay], shape: F.shape };
}
const plateBack = (T, base) => base;     // glyph knock-outs on a carried plate use the side colour (the carried fill is only slightly different; the ring is thin)

/** the language object the pipeline uses (build.mjs, agg.mjs, rings) */
export default {
  id: 'nato',
  label: 'NATO-spirit frames',
  silhouette(spec, T, grow = 0) { const F = frameGeometry(spec, T, grow); return { d: F.d, left: F.left - grow, top: F.top - grow, right: F.right + grow, bottom: F.bottom + grow, shape: F.shape, id: `${F.shape}-${spec.ech}` }; },
  aggFrame(T) { const A = T.agg.nato; const w = A.w; const h = A.h; return { d: (g) => rect(-w / 2 - g, -h / 2 - g, w + 2 * g, h + 2 * g, 2 + g), left: -w / 2, right: w / 2, top: -h / 2, bottom: h / 2, count: { x: -w / 2 + 2, y: -h / 2 + 2.5, w: w - 4, h: 14 }, row: { x0: -w / 2 + 4.5, y0: h / 2 - 12.5, x1: w / 2 - 4.5, y1: h / 2 - 4 } }; },
  base: renderBase,
  /** a glyph in an arbitrary box (aggregate rows) */
  glyph(arm, { T, ink, back, box, opacity = 1, strokeScale = 0.8 }) { return armGlyph(arm, box, { T, ink, back, k: 0.8, opacity, ctxFormation: true, strokeScale }); },
};
