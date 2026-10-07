// src/lang-shield.mjs - language (b): flat pictograms in a rounded shield.
//
// WHAT IS WHAT (the README repeats this table):
//   NATO convention reused:   the NATO echelon marks (bars I II III, X XX XXX XXXX) for battalion and up, placed in a header band of the shield instead of above it.  Fill = side colour, as in NATO ("blue" for one side).
//   Wargame / counter practice: the gun symbol for artillery (a wheel here: the NATO "field artillery" circle drawn as a spoked gun wheel), horse artillery as wheel over slash.
//   INVENTED here:            the shield silhouette; the double chevron for infantry (rank-insignia grammar, a pictogram, not a NATO or period symbol); the horse head for cavalry; the target for sharpshooters;
//                             the three-dot "composed of units" glyph for a formation (the data gives brigades, divisions and corps no arm, so none is claimed); shield size growing with echelon.
// Everything is drawn from paths in this file: no icon font, no third-party artwork.
import { Sprite, el, n2, rect, circle, line, poly, roundPoly, ringReach, sdfPoly } from './svg.mjs';
import { plate, inkOn, sideColour, shadowBleed, sink, isFormationEch, chipCentre, tabAnchorWithChip } from './common.mjs';
import { ECH_MARK } from './lang-nato.mjs';

const even = (v) => 2 * Math.round(v / 2);

/** shield outline: flat top with rounded corners, straight sides, a curved taper to a softly rounded point.  Local origin = centre of the body (not of the bounding box). */
export function shieldPath(w, h, T, grow = 0) {
  const S = T.shield; const g = grow; const W = w + 2 * g; const H = h + 2 * g; const x = W / 2; const top = -H / 2; const bot = H / 2;
  const rc = Math.max(1, S.cornerRadius + g); const ys = top + H * S.shoulder;           // where the straight side ends
  const tipR = S.tipRound;                                                                  // how soft the point is (u, horizontal half width of the flat tip)
  const c1 = (bot - ys) * S.taperA; const c2 = (bot - ys) * S.taperB;
  return `M${n2(-x + rc)} ${n2(top)}H${n2(x - rc)}A${n2(rc)} ${n2(rc)} 0 0 1 ${n2(x)} ${n2(top + rc)}V${n2(ys)}`
    + `C${n2(x)} ${n2(ys + c1)} ${n2(tipR + (x - tipR) * 0.38)} ${n2(bot - c2)} ${n2(tipR)} ${n2(bot - 0.4)}`
    + `Q${n2(0)} ${n2(bot + 0.6)} ${n2(-tipR)} ${n2(bot - 0.4)}`
    + `C${n2(-(tipR + (x - tipR) * 0.38))} ${n2(bot - c2)} ${n2(-x)} ${n2(ys + c1)} ${n2(-x)} ${n2(ys)}V${n2(top + rc)}A${n2(rc)} ${n2(rc)} 0 0 1 ${n2(-x + rc)} ${n2(top)}Z`;
}


/** the shield outline as a polygon (cubic tapers sampled), for signed-distance measurements only; the drawn outline stays the exact path of shieldPath() */
export function shieldPolygon(w, h, T) {
  const S = T.shield; const x = w / 2; const top = -h / 2; const bot = h / 2; const rc = Math.max(1, S.cornerRadius); const ys = top + h * S.shoulder; const tipR = S.tipRound; const c1 = (bot - ys) * S.taperA; const c2 = (bot - ys) * S.taperB;
  const bez = (p0, p1, p2, p3, n = 12) => Array.from({ length: n + 1 }, (_, i) => { const t = i / n; const u = 1 - t; return [u ** 3 * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t ** 3 * p3[0], u ** 3 * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t ** 3 * p3[1]]; });
  const arc = (cx, cy, a0) => Array.from({ length: 7 }, (_, i) => { const a = a0 + (i / 6) * (Math.PI / 2); return [cx + Math.cos(a) * rc, cy + Math.sin(a) * rc]; });
  const right = bez([x, ys], [x, ys + c1], [tipR + (x - tipR) * 0.38, bot - c2], [tipR, bot - 0.4]); const left = right.map(([px, py]) => [-px, py]).reverse();
  return [...arc(x - rc, top + rc, -Math.PI / 2), ...right, ...left, ...arc(-x + rc, top + rc, Math.PI)];
}

export function shieldSize(spec, T) {
  const k = (T.shield.scale && T.shield.scale[spec.ech]) ?? T.scale.ech[spec.ech] ?? 1;
  return { w: even(T.shield.w * k), h: even(T.shield.h * k), k };
}

/** horse head, facing right, drawn in a 24 x 24 box with its centre at (12, 12); returns path data and the eye position */
const HORSE = {
  d: 'M5.4 23.6C4.5 19.2 4.7 13.6 6.5 9.4C7.3 7.4 8.1 5.4 8.7 3.1L9.1 0.5L11.2 3C14.7 3.3 17.9 5.5 20.3 9.5C21.5 11.5 23 13.1 23.4 14.9C23.7 16.6 22.3 18 20.7 17.8C19.2 17.6 17.8 16.7 16.9 15.5C15.7 16.7 14.8 18.8 14.6 23.6Z',
  eye: [14.4, 8.5, 1.15],
};

/** the pictogram of an arm, drawn in a box centred on the origin of size about 16 x 16 (u) at k = 1 */
export function pictogram(arm, { T, ink, back, k = 1, opacity = 1, scale = null }) {
  const S = T.shield; const o = opacity < 1 ? opacity : undefined; const sc = scale ?? Math.max(0.9, Math.min(1.35, k)); const sw = S.glyphStroke * (scale ? Math.max(0.7, scale) : 1);
  const st = { stroke: ink, strokeWidth: sw, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none', strokeOpacity: o };
  const wheel = () => {
    const R = 5.6 * sc; let spokes = ''; for (let i = 0; i < 6; i++) { const a = (i * Math.PI) / 3 + Math.PI / 6; spokes += line(Math.cos(a) * 1.7, Math.sin(a) * 1.7, Math.cos(a) * (R - 0.6), Math.sin(a) * (R - 0.6)); }
    return el('circle', { cx: 0, cy: 0, r: R, fill: back }) + el('path', { d: circle(0, 0, R), ...st, strokeWidth: sw * 0.95 }) + el('path', { d: spokes, ...st, strokeWidth: sw * 0.62 }) + el('circle', { cx: 0, cy: 0, r: 1.7 * sc, fill: ink, fillOpacity: o });
  };
  switch (arm) {
    case 'infantry': { const a = 5.4 * sc; const dy = 4.2 * sc; return el('path', { d: poly([[-a, -0.6 * sc - dy / 2 + 1], [0, -a * 0.95 - dy / 2 + 1], [a, -0.6 * sc - dy / 2 + 1]]) + poly([[-a, -0.6 * sc + dy / 2 + 1], [0, -a * 0.95 + dy / 2 + 1], [a, -0.6 * sc + dy / 2 + 1]]), ...st, strokeWidth: sw * 1.1 }); }
    case 'cavalry': { const s = 0.78 * sc; return el('g', { transform: `translate(${n2(-13.5 * s)} ${n2(-12.3 * s)}) scale(${n2(s)})` }, el('path', { d: HORSE.d, fill: ink, fillOpacity: o }) + el('circle', { cx: HORSE.eye[0], cy: HORSE.eye[1], r: HORSE.eye[2], fill: back })); }
    case 'artillery': return wheel();
    case 'horse_artillery': return el('path', { d: line(-8 * sc, 8 * sc, 8 * sc, -8 * sc), ...st, strokeWidth: sw * 1.0 }) + wheel();
    case 'sharpshooter': { const r = 5 * sc; return el('path', { d: circle(0, 0, r) + line(0, -r - 2, 0, -r + 2.6) + line(0, r - 2.6, 0, r + 2) + line(-r - 2, 0, -r + 2.6, 0) + line(r - 2.6, 0, r + 2, 0), ...st, strokeWidth: sw * 0.85 }) + el('circle', { cx: 0, cy: 0, r: 1.5 * sc, fill: ink, fillOpacity: o }); }
    case 'formation': { const r = 2.1 * sc; return [[0, -4.4], [-4.8, 3.2], [4.8, 3.2]].map(([x, y]) => el('circle', { cx: x * sc, cy: y * sc, r, fill: ink, fillOpacity: o })).join(''); }
    default: return '';
  }
}

/** the header band marks (white, no halo: they sit on the band) */
export function bandMarks(ech, cy, T, ink, opacity = 1) {
  const [kind, n] = ECH_MARK[ech] || ['bar', 0]; if (!n) return { svg: '', w: 0 };
  if (!T.shield.echelon.base && (ech === 'battery' || ech === 'regiment')) return { svg: '', w: 0 };
  const E = T.shield.echelon; let d = ''; let wTot;
  if (kind === 'bar') { wTot = (n - 1) * E.pitch; for (let i = 0; i < n; i++) { const x = -wTot / 2 + i * E.pitch; d += line(x, cy - E.bar / 2 + E.stroke / 2, x, cy + E.bar / 2 - E.stroke / 2); } }
  else { const s = E.xSize; const pitch = s + 2.8; wTot = (n - 1) * pitch; for (let i = 0; i < n; i++) { const cx = -wTot / 2 + i * pitch; d += line(cx - s / 2, cy - s / 2, cx + s / 2, cy + s / 2) + line(cx - s / 2, cy + s / 2, cx + s / 2, cy - s / 2); } }
  return { svg: el('path', { d, fill: 'none', stroke: ink, strokeWidth: E.stroke, strokeLinecap: 'round', strokeLinejoin: 'round', strokeOpacity: opacity < 1 ? opacity : undefined }), w: wTot + E.stroke };
}

export function renderBase(spec, T, id) {
  const sp = new Sprite(id); const { w, h, k } = shieldSize(spec, T); const reach = ringReach(T);
  const carried = spec.state === 'carried'; const split = spec.side === 'mixed' ? [T.palette.union, T.palette.confederate] : null;
  const d = shieldPath(w, h, T); const base = sideColour(T, spec.side); const ink = inkOn(T, spec.side);
  sp.add(plate(sp, d, { side: spec.side, state: spec.state, T, split }), [-w / 2 - reach, -h / 2 - reach, w / 2 + reach, h / 2 + reach]);
  const sh = shadowBleed(T); if (!carried) sp.grow(-w / 2 - reach - sh, -h / 2 - reach - sh + 1, w / 2 + reach + sh, h / 2 + reach + sh + T.shadow.dy);
  const op = carried ? T.carried.glyphOpacity : 1;
  const marked = (ECH_MARK[spec.ech] || [0, 0])[1] > 0 && (T.shield.echelon.base || !(spec.ech === 'battery' || spec.ech === 'regiment'));
  const band = marked ? T.shield.echelon.band * k : 0;
  let gy = (T.shield.glyphDy ?? 0) * k;
  if (marked) {
    const clip = sp.uid('c'); sp.def(`<clipPath id="${clip}"><path d="${d}"/></clipPath>`);
    const bandFill = split ? '#0b1118' : spec.side === 'unknown' ? T.shield.echelon.bandUnknown : sink(base, T.shield.echelon.bandSink);
    sp.add(el('g', { clipPath: `url(#${clip})` }, el('rect', { x: -w / 2 - 1, y: -h / 2 - 1, width: w + 2, height: band + 1, fill: bandFill, fillOpacity: carried ? 0.55 : T.shield.echelon.bandAlpha })
      + el('path', { d: line(-w / 2, -h / 2 + band, w / 2, -h / 2 + band), stroke: ink, strokeOpacity: 0.28, strokeWidth: 1 })));
    const m = bandMarks(spec.ech, -h / 2 + band / 2, T, ink, op); sp.add(m.svg);
    gy += band / 2;
  }
  sp.add(el('g', { transform: `translate(0 ${n2(gy)})` }, pictogram(spec.arm, { T, ink, back: split ? T.palette.union : base, k, opacity: op })));
  const r = sp.finish({ pad: 1 });
  // the status chip: a corner badge that clears the pictogram (src/common.mjs chipCentre).  The pictogram's ink box is generous: the horse head is the tallest glyph (about 18 u at k = 1).
  const sc = Math.max(0.9, Math.min(1.35, k)); const ext = (spec.arm === 'cavalry' ? 9.4 : spec.arm === 'formation' ? 7.4 : 8) * sc + 1;
  const inkBox = [-ext, gy - ext, ext, gy + ext];
  const neLocal = chipCentre({ corner: [w / 2, -h / 2], sdf: sdfPoly(shieldPolygon(w, h, T)), box: { left: -w / 2, right: w / 2, top: -h / 2, bottom: h / 2 }, ink: inkBox, T }); const ne = [neLocal[0] + r.ax, neLocal[1] + r.ay]; const tab = [w / 2 - T.tab.tuck + r.ax, r.ay];
  const anchors = { ne, below: [r.ax, h / 2 + reach + r.ay], left: [-w / 2 - reach + r.ax, r.ay], right: [w / 2 + reach + r.ax, r.ay], tab, tabChip: tabAnchorWithChip(tab, ne, T) };
  return { ...r, core: [-w / 2 - reach + r.ax, -h / 2 - reach + r.ay, w / 2 + reach + r.ax, h / 2 + reach + r.ay], anchors, ink: [inkBox[0] + r.ax, inkBox[1] + r.ay, inkBox[2] + r.ax, inkBox[3] + r.ay], strip: null, shape: 'shield' };
}

export default {
  id: 'shield',
  label: 'Flat pictograms in a shield',
  silhouette(spec, T, grow = 0) { const { w, h } = shieldSize(spec, T); return { d: shieldPath(w, h, T, grow), left: -w / 2 - grow, top: -h / 2 - grow, right: w / 2 + grow, bottom: h / 2 + grow, shape: 'shield', id: `shield-${spec.ech}` }; },
  aggFrame(T) { const A = T.agg.shield; const w = A.w; const h = A.h; return { d: (g) => shieldPath(w, h, T, g), left: -w / 2, right: w / 2, top: -h / 2, bottom: h / 2, count: { x: -w / 2 + 3, y: -h / 2 + 14.5, w: w - 6, h: 14 }, row: { x0: -w / 2 + 4.5, y0: -h / 2 + 4, x1: w / 2 - 4.5, y1: -h / 2 + 13 } }; },
  base: renderBase,
  glyph(arm, { T, ink, back, box, opacity = 1 }) { const s = Math.min(box.x1 - box.x0, box.y1 - box.y0) / 15; return el('g', { transform: `translate(${n2((box.x0 + box.x1) / 2)} ${n2((box.y0 + box.y1) / 2)})` }, pictogram(arm, { T, ink, back, scale: s, opacity })); },
};
