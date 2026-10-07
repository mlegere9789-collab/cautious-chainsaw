// src/overlays.mjs - selection and hover rings, aggregate (formation) marks and the Union corps badges.
import { Sprite, el, n2, rect, circle, line, poly, roundPoly, ringReach, rings } from './svg.mjs';
import { plate, inkOn, sideColour, shadowFilter, shadowBleed } from './common.mjs';
import { mix } from './colour.mjs';

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------
// Rings.  Interface state (selected, hover), not a claim about the battle: evidence "Design".  Drawn at the same anchor as the base symbol, outside its own rings, in the same dual-ring grammar
// so they hold on every backdrop (a bone ring between two dark keylines).
export function renderRing(kind, spec, lang, T, id) {
  const R = T.selection[kind]; const sp = new Sprite(id); const reach = ringReach(T);
  const grow = reach + R.gap + R.stroke / 2; const S = lang.silhouette(spec, T, grow); const kl = R.keyline;
  const d = S.d;
  if (R.glow > 0) {
    const f = sp.uid('f'); sp.def(`<filter id="${f}" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="${R.glow}"/></filter>`);
    sp.add(el('path', { d, fill: 'none', stroke: T.palette.bone, strokeOpacity: R.glowAlpha, strokeWidth: R.stroke + 2, filter: `url(#${f})` }));
  }
  sp.add(el('path', { d, fill: 'none', stroke: T.palette.keyline, strokeOpacity: T.ring.darkAlpha, strokeWidth: R.stroke + 2 * kl, strokeLinejoin: 'round' }) + el('path', { d, fill: 'none', stroke: T.palette.bone, strokeWidth: R.stroke, strokeLinejoin: 'round' }),
    [S.left - kl - R.stroke / 2 - 1, S.top - kl - R.stroke / 2 - 1, S.right + kl + R.stroke / 2 + 1, S.bottom + kl + R.stroke / 2 + 1]);
  if (R.glow > 0) sp.grow(S.left - R.glow * 3, S.top - R.glow * 3, S.right + R.glow * 3, S.bottom + R.glow * 3);
  const r = sp.finish({ pad: 1 });
  const e = R.stroke / 2 + kl;
  return { ...r, core: [S.left - e + r.ax, S.top - e + r.ay, S.right + e + r.ax, S.bottom + e + r.ay], strip: null, shape: 'ring' };
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------
// Aggregates ("formation marks").  When tiles cannot all stand on their true positions they merge into ONE mark that says: how many (a count well the skin fills with text), which side,
// which arms (a row of mini glyphs: the arms present among the members) and, through its depth, that it is a group.  Computed (a count of placement records, never of men).
// vocabulary: side in union / confederate / unknown / mixed;  armset = letters of I C A F (infantry, cavalry, artillery, formation records) in that order;  depth 2 or 3 plates.
export const ARMSETS = (() => { const L = ['I', 'C', 'A', 'F']; const out = []; for (let m = 1; m < 16; m++) out.push(L.filter((_, i) => m & (1 << i)).join('')); return out.sort((a, b) => a.length - b.length || a.localeCompare(b)); })();
const ARM_OF_LETTER = { I: 'infantry', C: 'cavalry', A: 'artillery', F: 'formation' };

export function renderAgg(spec, lang, T, id) {
  const sp = new Sprite(id); const A = T.agg; const reach = ringReach(T);
  const fr = lang.aggFrame(T); const side = spec.side; const base = sideColour(T, side); const split = side === 'mixed' ? [T.palette.union, T.palette.confederate] : null;
  const off = A.offset; const n = spec.depth;
  // back plates first (deepest first), a little darker and without content; one shadow under the whole stack
  for (let i = n - 1; i >= 1; i--) {
    const dx = -off * i; const dy = -off * i; const d = fr.d(0);
    sp.add(el('g', { transform: `translate(${n2(dx)} ${n2(dy)})` }, plate(sp, d, { side, state: 'fresh', T, split, noShadow: i !== n - 1, tintBack: A.backTint * i })),
      [fr.left + dx - reach - 3, fr.top + dy - reach - 3, fr.right + dx + reach + 3, fr.bottom + dy + reach + 3]);
  }
  sp.add(plate(sp, fr.d(0), { side, state: 'fresh', T, split, noShadow: n > 1 }), [fr.left - reach - 3, fr.top - reach - 3, fr.right + reach + 3, fr.bottom + reach + 4]);
  const ink = inkOn(T, side); const letters = spec.armset.split(''); const bw = fr.row.x1 - fr.row.x0; const bh = fr.row.y1 - fr.row.y0;
  const gs = Math.min(bh, (bw - (letters.length - 1) * A.glyphGap) / letters.length, A.glyphMax); const total = letters.length * gs + (letters.length - 1) * A.glyphGap; const cx0 = (fr.row.x0 + fr.row.x1) / 2 - total / 2; const cy = (fr.row.y0 + fr.row.y1) / 2;
  letters.forEach((L, i) => {
    const x0 = cx0 + i * (gs + A.glyphGap); sp.add(lang.glyph(ARM_OF_LETTER[L], { T, ink, back: split ? T.palette.union : base, box: { x0, y0: cy - gs / 2, x1: x0 + gs, y1: cy + gs / 2 }, opacity: 0.95 }));
  });
  const r = sp.finish({ pad: 1 });
  const c = fr.count; const so = off * (n - 1); const strip = n > 1 ? [fr.left - so - reach + r.ax, fr.top - so - reach + r.ay, fr.right + reach + r.ax, fr.bottom + reach + r.ay] : null;
  return { ...r, strip, core: [fr.left - reach + r.ax, fr.top - reach + r.ay, fr.right + reach + r.ax, fr.bottom + reach + r.ay],
    slots: { count: { x: c.x + r.ax, y: c.y + r.ay, w: c.w, h: c.h, font: A.count.font, colour: ink, align: 'center', baseline: 'middle', text: '×N' } },
    stackOffset: [-off, -off], depth: n, shape: 'agg' };
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------
// Union corps badges.  Documented: the circular of Headquarters, Army of the Potomac, 21 March 1863 (Butterfield; shapes by corps, colour by division: red first, white second, blue third).
//   Read via civilwarnews.com 2026-10-06 (03-data-fuel.md section 5; the Official Records scan itself was not opened).  Union infantry of these seven corps ONLY, where the order-of-battle chain documents the
//   corps; never for cavalry, artillery or any Confederate unit (no source assigns Confederate badges).  Shapes are redrawn here from plain geometry.
export const BADGE_SHAPES = { I: 'sphere', II: 'trefoil', III: 'lozenge', V: 'maltese', VI: 'cross', XI: 'crescent', XII: 'star' };
export const DIV_COLOURS = ['red', 'white', 'blue'];
export const BADGE_TEXT = { I: 'I Corps: circle (the NPS caption says circle, other sources sphere)', II: 'II Corps: trefoil (clover leaf)', III: 'III Corps: lozenge (diamond)', V: 'V Corps: Maltese cross', VI: 'VI Corps: cross', XI: 'XI Corps: crescent', XII: 'XII Corps: star' };

function badgePath(shape, R) {
  switch (shape) {
    case 'sphere': return circle(0, 0, R);
    case 'trefoil': { let d = ''; for (let i = 0; i < 3; i++) { const a = -Math.PI / 2 + (i * 2 * Math.PI) / 3; d += circle(Math.cos(a) * R * 0.46, Math.sin(a) * R * 0.46, R * 0.52); } return d + rect(-R * 0.14, R * 0.1, R * 0.28, R * 0.92, 0.4); }
    case 'lozenge': return roundPoly([[0, -R * 1.05], [R * 0.82, 0], [0, R * 1.05], [-R * 0.82, 0]], 0.9);
    case 'maltese': { const arm = [[-R * 0.2, -R * 0.2], [-R * 0.5, -R * 1.0], [0, -R * 0.78], [R * 0.5, -R * 1.0], [R * 0.2, -R * 0.2]]; const pts = []; for (let k = 0; k < 4; k++) { const c = Math.cos((k * Math.PI) / 2); const s = Math.sin((k * Math.PI) / 2); for (const [x, y] of arm) { const q = [Math.round((x * c - y * s) * 100) / 100, Math.round((x * s + y * c) * 100) / 100]; const last = pts[pts.length - 1]; if (!last || last[0] !== q[0] || last[1] !== q[1]) pts.push(q); } } return roundPoly(pts, 0.35); }
    case 'cross': { const a = R * 0.34; const L = R * 1.0; return poly([[-a, -L], [a, -L], [a, -a], [L, -a], [L, a], [a, a], [a, L], [-a, L], [-a, a], [-L, a], [-L, -a], [-a, -a]], true); }
    case 'crescent': { const Ro = R * 1.0; const ri = R * 0.82; const dx = R * 0.5; const dy = -R * 0.18; const dd = Math.hypot(dx, dy); const a = (Ro * Ro - ri * ri + dd * dd) / (2 * dd); const h = Math.sqrt(Math.max(0, Ro * Ro - a * a)); const ux = dx / dd; const uy = dy / dd; const px = ux * a; const py = uy * a; const p1 = [px + (-uy) * h, py + ux * h]; const p2 = [px - (-uy) * h, py - ux * h]; return `M${n2(p1[0])} ${n2(p1[1])}A${n2(Ro)} ${n2(Ro)} 0 1 1 ${n2(p2[0])} ${n2(p2[1])}A${n2(ri)} ${n2(ri)} 0 1 0 ${n2(p1[0])} ${n2(p1[1])}Z`; }
    case 'star': { const pts = []; for (let i = 0; i < 10; i++) { const rr = i % 2 === 0 ? R * 1.12 : R * 0.48; const a = -Math.PI / 2 + (i * Math.PI) / 5; pts.push([Math.cos(a) * rr, Math.sin(a) * rr]); } return roundPoly(pts, 0.5); }
    default: return circle(0, 0, R);
  }
}
export function renderBadge(corps, divColour, T, id) {
  const B = T.badge; const sp = new Sprite(id); const R = B.size / 2; const d = badgePath(BADGE_SHAPES[corps], R); const reach = ringReach(T); const fill = B.colours[divColour];
  const flt = shadowFilter(sp, T);
  sp.add(el('g', { filter: flt }, el('path', { d, fill, stroke: fill, strokeWidth: 2 * reach, strokeLinejoin: 'round' })), [-R * 1.1 - reach - 3, -R * 1.1 - reach - 3, R * 1.1 + reach + 3, R * 1.1 + reach + 4]);
  sp.add(rings(d, T) + el('path', { d, fill, fillRule: 'nonzero' }));
  const r = sp.finish({ pad: 1 });
  return { ...r, core: [-R - reach + r.ax, -R - reach + r.ay, R + reach + r.ax, R + reach + r.ay], strip: null, shape: 'badge' };
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------
// Label tab: ONE object with its symbol instead of a symbol plus a separate caption chip.  A pill that tucks behind the symbol's right edge and carries the unit's name or code as text drawn at runtime.
// The atlas holds the pill at its minimum width; the runtime draws it in three slices (left cap, a stretched 1 u middle, right cap), so any text width costs three drawImage calls and no new sprite.
// Tone: 'dark' (glass, for aerial and dark grounds) or 'light' (paper, for light grounds).  Design, not data: evidence "Design"; the TEXT in it is the unit's own designation (Documented) or its id (Unknown).
export function renderTab(tone, T, id, innerW = 2) {
  const B = T.tab; const sp = new Sprite(id); const reach = ringReach(T); const h = B.h; const r = Math.min(B.radius, h / 2); const cap = Math.ceil(r) + B.capExtra; const w = 2 * cap + innerW; const x0 = 0; const y0 = -h / 2;
  const d = rect(x0, y0, w, h, r); const fill = B.tones[tone].fill; const flt = shadowFilter(sp, T);
  sp.add(el('g', { filter: flt }, el('path', { d, fill, stroke: fill, strokeWidth: 2 * reach })), [x0 - reach - 3, y0 - reach - 3, x0 + w + reach + 3, y0 + h + reach + 4]);
  sp.add(rings(d, T) + el('path', { d, fill, fillOpacity: B.alpha }));
  const res = sp.finish({ pad: 1 });
  return { ...res, core: [x0 - reach + res.ax, y0 - reach + res.ay, x0 + w + reach + res.ax, y0 + h + reach + res.ay], strip: null, shape: 'tab',
    tab: { leftW: res.ax + cap, midW: innerW, rightW: res.w - res.ax - cap - innerW, cap, h, tuck: B.tuck, padX: B.padX, font: B.font, text: B.tones[tone].text, tone } };
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------
// The pin: the ground mark at a unit's true position when its tile was moved off it.  A coloured centre (the side) in a bone ring in a dark keyline: the same dual-ring grammar as every plate, so it reads as part of the
// system and not as a stray dot.  The leader line joining it to the tile is drawn at runtime from tokens leader.* (runtime/atlas.mjs drawLeader).  Design: marks where the data places the unit.
export function renderPin(side, T, id) {
  const P = T.pin; const sp = new Sprite(id); const reach = ringReach(T); const R = P.radius + P.ring; const d = circle(0, 0, R); const fill = sideColour(T, side);
  sp.add(rings(d, T) + el('path', { d, fill: T.palette.bone }) + el('circle', { cx: 0, cy: 0, r: P.radius, fill }), [-R - reach - 1, -R - reach - 1, R + reach + 1, R + reach + 1]);
  const r = sp.finish({ pad: 1 });
  return { ...r, core: [-R - reach + r.ax, -R - reach + r.ay, R + reach + r.ax, R + reach + r.ay], strip: null, shape: 'pin' };
}
