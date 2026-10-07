// skins/d3.mjs - THE SKIN OF THE PRECISION FIELD MANUAL.  One object per unit: a plate that carries the arm symbol, the code and the strength in ONE flat mark, on a strict 2 px grid.
//
//   [ cell | CODE  tail ]      cell  = the side (hue) and the arm (symbol); frame of an APP-6 / 2525 unit: a coloured square whose shape says "who", whose glyph says "what"
//   [ ____ strength ___ ]      code  = the short code (11 px, or 13 px for a formation); tail = the count of an aggregate, in the regular weight
//   tab (formation only)       the echelon marks of APP-6 (II, X, XX, XXX) sit in a tab ABOVE the plate, exactly where APP-6 puts them
//
// Three weights only (SPEC.md section 3): FORMATION marks (a formation record, an aggregate: 13 px type, a tab, a heavier plate) > UNIT marks (11 px type) > secondary detail (the strength gauge,
// the tail, a pin and its leader).  Two type sizes (11 and 13 px) and one numeral style (the tabular figures of FM Sans).  No dashes, no shadows, no gradients, no badges.
//
// Evidence: side, arm, echelon and the identity are Documented (order of battle, id prefix); a side the data cannot settle is Contested and is drawn as ochre hatching; the strength gauge is
// Modelled (a keyframe's placement strength over the unit's reference strength); the ink of the cell fades with the age of the latest keyframe, which is Computed.  The ONE device for
// "this position is provisional" is the muted cell: the more a keyframe has aged (half a battle day to a whole day, in ticks), the more the side colour is washed toward grey.
//
// Geometry and drawing are one piece of code: layoutOf() sizes the footprint (the layout engine's solid box) and paintMark() draws inside it, so the guarantee "ink stays inside the
// footprint" is a property of this file, and sample() (the legend) calls the very same paintMark().
import { defineFamily, clamp01, ss, mixHex, rgba, pinFade } from './kit.mjs';
import { armGlyph } from './glyphs.mjs';
import { FONT_STACK } from '../layout/text.mjs';

export const SIDE_KEYS = { union: 'union', confederate: 'confederate', unknown: 'contested' };
const AGG_LEVEL = { battalion: 1, brigade: 2, division: 3, corps: 4 };
const CAP = (px) => Math.round(px * 0.66);                      // cap height of FM Sans (Source Sans 3: 660 / 1000)

// ---- geometry ----------------------------------------------------------------------------------------------------------------------------------------------------
/** The layout of one mark, from the tokens P, a text-width function tw(fontKey, string) and a description of the tile.  Everything in CSS px, origin = the top-left of the BODY (the footprint
 *  box inset by the selection band).  info = { agg, level (0 unit, 1 battalion, 2 brigade, 3 division, 4 corps), formation, code, tail, name, named, glyph } */
export function layoutOf(P, tw, info) {
  const heavy = info.agg || info.formation;                                                       // the formation tier: 13 px type, heavier plate
  const plateH = info.agg ? P['size.plate.agg'] : info.level >= 4 ? P['size.plate.corps'] : info.level === 3 ? P['size.plate.division'] : info.level === 2 ? P['size.plate.brigade'] : P['size.plate.unit'];
  const tabH = info.level >= 1 ? P['size.tab'] : 0;
  const fk = heavy ? 'codeL' : 'code'; const tk = heavy ? 'tailL' : 'tail';
  const px = heavy ? P['type.large'] : P['type.small']; const capH = CAP(px);
  const text = info.named && info.name ? info.name : info.code;
  const textW = Math.ceil(tw(fk, text)); const tailW = info.tail ? P['size.tailGap'] + Math.ceil(tw(tk, info.tail)) : 0;
  const cellW = plateH; const padL = P['size.padL']; const padR = P['size.padR'];
  const stack = info.agg ? P['size.stack'] : 0;
  const plateW = cellW + padL + textW + tailW + padR;
  const gh = P['gauge.h'];                                                                        // the strength gauge is the foot of the plate: full width of the code field, flush with the edge
  const padTop = Math.max(2, Math.round((plateH - gh - capH) / 2));
  const base = padTop + capH;                                                                     // baseline, from the top of the plate
  return { heavy, plateH, plateW, tabH, cellW, padL, padR, stack, fk, tk, px, capH, text, textW, tailW, base, gaugeY: plateH - gh, tabW: cellW, w: plateW + stack, h: tabH + plateH + stack };
}

// ---- drawing helpers ---------------------------------------------------------------------------------------------------------------------------------------------
/** the echelon marks of APP-6 for the tab of a formation: II (battalion) as two bars, X / XX / XXX (brigade, division, corps) as crosses.  Centred on (cx, cy). */
function echelonTab(c, level, cx, cy, ink, lw, maxW) {
  c.strokeStyle = ink; c.lineWidth = lw; c.lineCap = 'butt'; c.beginPath();
  if (level === 1) { for (const dx of [-2.1, 2.1]) { c.moveTo(cx + dx, cy - 2.8); c.lineTo(cx + dx, cy + 2.8); } }
  else { const n = level - 1; const a = 2.6; const pitch = Math.min(7.2, (maxW - 8) / Math.max(1, n)); const x0 = cx - (n - 1) * pitch / 2; for (let i = 0; i < n; i++) { const x = x0 + i * pitch; c.moveTo(x - a, cy - a); c.lineTo(x + a, cy + a); c.moveTo(x + a, cy - a); c.lineTo(x - a, cy + a); } }
  c.stroke();
}
/** rounded rectangle with a radius per corner (tl, tr, br, bl) */
function rrc(c, x, y, w, h, tl, tr, br, bl) {
  c.beginPath(); c.moveTo(x + tl, y); c.lineTo(x + w - tr, y); if (tr) c.arcTo(x + w, y, x + w, y + tr, tr); else c.lineTo(x + w, y);
  c.lineTo(x + w, y + h - br); if (br) c.arcTo(x + w, y + h, x + w - br, y + h, br); else c.lineTo(x + w, y + h);
  c.lineTo(x + bl, y + h); if (bl) c.arcTo(x, y + h, x, y + h - bl, bl); else c.lineTo(x, y + h);
  c.lineTo(x, y + tl); if (tl) c.arcTo(x, y, x + tl, y, tl); else c.lineTo(x, y);
  c.closePath();
}
const sideFill = (P, side, old) => mixHex(P['color.' + SIDE_KEYS[side] + '.fill'], P['color.' + SIDE_KEYS[side] + '.old'], old);

/** Paint one mark.  m = { side, arm, level, formation, agg, code, tail, name, named, ratio, carried, idOnly, hov, sel, enter, form (0 compact .. 1 named, eased), hover/selected visuals }.
 *  (ox, oy) = top-left of the body, bw = the CURRENT width of the body (it eases while a tile grows into its named form), g = the drawing context of the kit (tokens, dpr, snapping). */
export function paintMark(c, g, m, L, ox, oy, bw) {
  const P = g.P; const base = c.globalAlpha; const side = m.side; const mixed = side === 'mixed';
  const old = m.carried; const enter = m.enter;
  const sc = mixed ? null : sideFill(P, side, old); const inkOnCell = side === 'unknown' ? P['color.contested.glyph'] : P['color.glyph'];
  const pw = Math.max(L.cellW + 4, bw - L.stack); const px0 = ox; const py0 = oy + L.tabH; const ph = L.plateH; const r = P['shape.radius'];
  const inkIn = ss(0.15, 0.7, enter); const textIn = ss(0.4, 1, enter);                           // arrival: the frame first, then the ink, then the type
  const kl = P['alpha.keyline'] + (P['alpha.keylineHover'] - P['alpha.keyline']) * m.hov;

  // the pile behind an aggregate (the stack: this is "more than one record")
  if (L.stack) {
    const s = L.stack; c.save(); rrc(c, px0 + s, py0 + s, pw, ph, r, r, r, r); c.fillStyle = P['color.plate']; c.fill();
    c.lineWidth = 1; c.strokeStyle = rgba(P['color.keyline'], kl * 0.8); rrc(c, px0 + s + 0.5, py0 + s + 0.5, pw - 1, ph - 1, r, r, r, r); c.stroke(); c.restore();
  }

  // The two armies face each other: a Union mark has its cell on the LEFT, a Confederate mark on the RIGHT (the mark is mirrored, the grid is not).  The side is therefore in the position of the cell
  // as well as in its hue: it survives a greyscale print, a colour-vision deficiency and a glance across a crowded field.  A contested or mixed mark keeps its cell on the left.
  const R = side === 'confederate'; const mx = (x) => (R ? 2 * px0 + pw - x : x);
  const cw = L.cellW; const cellX = R ? px0 + pw - cw : px0; const cy0 = py0;
  // plate (with the tab of a formation as one outline)
  const plate = mixHex(P['color.plate'], P['color.plateHover'], Math.max(m.hov, m.sel));
  c.globalAlpha = base * clamp01(0.25 + inkIn);
  const tabW = L.tabH ? Math.min(L.tabW, pw) : 0;
  const outline = () => {                                                                       // plate + tab as one path (drawn for a left tab and mirrored for a right one)
    if (!L.tabH) { rrc(c, px0, py0, pw, ph, r, r, r, r); return; }
    c.beginPath(); c.moveTo(mx(px0), py0 + ph - r); c.lineTo(mx(px0), oy + r); c.arcTo(mx(px0), oy, mx(px0 + r), oy, r); c.lineTo(mx(px0 + tabW - r), oy); c.arcTo(mx(px0 + tabW), oy, mx(px0 + tabW), oy + r, r); c.lineTo(mx(px0 + tabW), py0);
    c.lineTo(mx(px0 + pw - r), py0); c.arcTo(mx(px0 + pw), py0, mx(px0 + pw), py0 + r, r); c.lineTo(mx(px0 + pw), py0 + ph - r); c.arcTo(mx(px0 + pw), py0 + ph, mx(px0 + pw - r), py0 + ph, r); c.lineTo(mx(px0 + r), py0 + ph); c.arcTo(mx(px0), py0 + ph, mx(px0), py0 + ph - r, r); c.closePath();
  };
  outline(); c.fillStyle = plate; c.fill();

  // the cell: side colour (or the contested hatching, or the split of a contact), washed toward grey as the keyframe ages
  c.save(); c.globalAlpha = base * inkIn; outline(); c.clip();
  if (mixed) {
    const a = sideFill(P, 'union', old); const b = sideFill(P, 'confederate', old);
    c.fillStyle = a; c.fillRect(cellX, cy0, cw, ph); c.fillStyle = b; c.beginPath(); c.moveTo(cellX + cw, cy0); c.lineTo(cellX + cw, cy0 + ph); c.lineTo(cellX, cy0 + ph); c.closePath(); c.fill();
    c.strokeStyle = rgba(P['color.plate'], 0.85); c.lineWidth = 1; c.beginPath(); c.moveTo(cellX + cw + 0.5, cy0 - 0.5); c.lineTo(cellX - 0.5, cy0 + ph + 0.5); c.stroke();
  } else {
    c.fillStyle = sc; c.fillRect(cellX, cy0, cw, ph);
    if (side === 'unknown') {                                                                   // contested: ochre with hatching, never a side colour
      c.strokeStyle = rgba(P['color.contested.hatch'], 0.9); c.lineWidth = 1; c.beginPath(); const pitch = P['shape.hatch'];
      for (let k = -ph; k < cw; k += pitch) { c.moveTo(cellX + k, cy0 + ph); c.lineTo(cellX + k + ph, cy0); } c.stroke();
    }
  }
  c.restore();
  // the thin join between the cell and the plate keeps the two surfaces apart without a border
  c.globalAlpha = base * inkIn; c.fillStyle = rgba(P['color.plate'], 0.9); c.fillRect(R ? cellX - 0.5 : cellX + cw - 0.5, cy0, 1, ph); c.globalAlpha = base;

  // the keyline: one pixel, light, around the whole mark (the only ink that is not data: it keeps the plate readable on any ground)
  outline(); c.lineWidth = 1; c.strokeStyle = rgba(P['color.keyline'], kl * clamp01(0.3 + inkIn)); c.stroke();

  // the arm symbol (Documented) in the cell; a formation record claims no arm and its cell stays empty
  const gcx = cellX + cw / 2; const gcy = cy0 + ph / 2;
  if (m.glyph) { c.save(); c.globalAlpha = base * inkIn; armGlyph(c, m.arm, gcx, gcy, cw * 0.27, { ink: inkOnCell, lw: P['glyph.stroke'] }, m.armState || null); c.restore(); }

  // the tab: the echelon marks of APP-6 above the cell
  if (L.tabH && m.level >= 1) { c.save(); c.globalAlpha = base * inkIn; echelonTab(c, m.level, gcx, oy + L.tabH / 2, P['color.text'], P['glyph.stroke'] * 0.9, tabW); c.restore(); }

  // type: the code (Documented), or the full name when the mark has grown; the tail ("x7") is the regular weight
  const tx = R ? px0 + L.padR : px0 + cw + L.padL; const by = py0 + L.base; const fam = FONT_STACK;
  c.save(); outline(); c.clip(); c.beginPath(); c.rect(R ? px0 : px0 + cw, py0 - 1, pw - cw, ph + 2); c.clip();      // the type lives in the field beside the cell: while the plate grows it is revealed, never drawn over the cell
  c.textBaseline = 'alphabetic'; c.textAlign = 'left';
  const fontB = `700 ${L.px}px ${fam}`; const fontR = `400 ${L.px}px ${fam}`;
  const nameK = m.form;                                                                           // 0 = the code, 1 = the full name
  const codeA = m.name ? 1 - ss(0, 0.4, nameK) : 1; const nameA = m.name ? ss(0.4, 0.9, nameK) : 0;      // the code leaves first, then the name arrives: the two never overlap
  c.font = fontB; c.fillStyle = P['color.text'];
  if (codeA > 0.01) { c.globalAlpha = base * textIn * codeA; c.fillText(m.code, tx, by); }
  if (nameA > 0.01) { c.globalAlpha = base * textIn * nameA; c.fillText(m.name, tx, by); }
  const shown = nameK > 0.5 && m.name ? m.name : m.code;
  const codeW = c.measureText(shown).width;
  if (m.tail) { c.globalAlpha = base * textIn; c.font = fontR; c.fillStyle = P['color.textMuted']; c.fillText(m.tail, tx + codeW + P['size.tailGap'], by); }
  if (m.idOnly) { c.globalAlpha = base * textIn * 0.8; c.fillStyle = P['color.text']; c.fillRect(tx, by + 2, Math.round(codeW), 1); }   // identity from the id alone (Unknown): the code is underlined
  c.restore(); c.globalAlpha = base;
  // the strength gauge (Modelled): the foot of the plate, flush, full width of the code field; ticks at the quartiles keep it a state and not a measurement
  const gx0 = R ? px0 : px0 + cw; const gx1 = R ? px0 + pw - cw : px0 + pw; const gy = py0 + L.gaugeY; const gh = P['gauge.h'];
  if (gx1 - gx0 > 8) {
    c.save(); outline(); c.clip(); c.globalAlpha = base * textIn;
    c.fillStyle = rgba(P['color.text'], P['alpha.track']); c.fillRect(gx0, gy, gx1 - gx0, gh);
    c.fillStyle = rgba(P['color.text'], P['alpha.gauge']); c.fillRect(gx0, gy, (gx1 - gx0) * clamp01(m.ratio), gh);
    c.fillStyle = P['color.plate']; const n = P['gauge.segments']; for (let i = 1; i < n; i++) c.fillRect(Math.round(gx0 + (gx1 - gx0) * i / n) - 0.5, gy, 1, gh);
    c.restore();
  }

  // selection: the dual ring in the band the footprint reserves (light inside, dark outside); easing in with g.sel
  if (m.sel > 0.003) {
    const e = m.sel; c.save(); c.globalAlpha = base * e;
    const o0 = 2; const ex = ox - o0; const ey = oy - o0; const ew = pw + 2 * o0; const eh = L.tabH + ph + 2 * o0;
    c.lineWidth = 1; c.strokeStyle = P['color.ringDark']; rrc(c, ex + 0.5, ey + 0.5, ew + L.stack - 1, eh + L.stack - 1, r + 2, r + 2, r + 2, r + 2); c.stroke();
    c.strokeStyle = P['color.ringLight']; rrc(c, ex + 1.5, ey + 1.5, ew + L.stack - 3, eh + L.stack - 3, r + 1, r + 1, r + 1, r + 1); c.stroke(); c.restore();
  }
}

// ---- the skin ----------------------------------------------------------------------------------------------------------------------------------------------------
const ECH = { regiment: 0, battery: 0, battalion: 1, brigade: 2, division: 3, corps: 4, army: 4 };
const FORM = new Set(['brigade', 'division', 'corps', 'army']);
/** the description layoutOf() wants, from what the engine hands over: { kind: 'leaf', u, named } for a unit, { kind: 'agg', code, tail, nameKind } for an aggregate.  The footprint (measure) and the painter
 *  both go through this one function, so they cannot disagree about what a mark is. */
export function infoFromRaw(raw) {
  if (raw.kind === 'agg') return { agg: true, level: AGG_LEVEL[raw.nameKind] || 0, formation: false, code: raw.code, tail: raw.tail || null, name: null, named: false, glyph: !!raw.glyph };
  const u = raw.u; const formation = FORM.has(u.kind);
  return { agg: false, level: ECH[u.kind] ?? 0, formation, code: u.short, tail: null, name: nameOf(u), named: !!raw.named, glyph: !formation };
}
/** the full name of a unit for the grown mark: the order of battle's designation when it is short enough to read on a mark, else the registry label (which may be a shortened form) */
export function nameOf(u) { if (!u) return null; const d = u.designation; const l = u.label; if (d && d.length <= 34) return d; return l && !l.endsWith('…') ? l : (d || l); }

function tile(c, t, g) {
  const P = g.P; const vm = g.vm; const spec = g.env.spec;
  const info = vm.agg ? infoFromRaw({ kind: 'agg', code: vm.code, tail: vm.count, nameKind: t.nameKind, glyph: t.arm !== 'mixed' && t.side !== 'mixed' }) : infoFromRaw({ kind: 'leaf', u: t.unit, named: !!t.named });
  const tw = (k, s) => spec.text.width(k, s) - 1;                                                  // the engine's measured widths (the layout used the same ones)
  const L = layoutOf(P, tw, info);
  const body = g.body; const ox = body.x; const oy = body.y;
  const form = g.ease('named', info.named ? 1 : 0, P['motion.growMs']);
  const armState = vm.armState === 'dismounted' || vm.armState === 'limbered' ? vm.armState : null;                 // the two default states (mounted, deployed) are the plain symbol
  const m = { side: vm.side, arm: info.formation ? null : (vm.agg ? t.arm : vm.arm), armState, level: info.level, glyph: info.glyph, code: vm.code, tail: info.tail, name: info.name, ratio: vm.ratio, carried: vm.carried, idOnly: vm.idOnly, hov: g.hov, sel: g.sel, enter: g.enter, form };
  paintMark(c, g, m, L, ox, oy, body.w);
}

/** pin: the true position of a displaced tile.  A small dot in the side colour with a light ring; it fades while it would sit under its own tile */
function pin(c, t, g) {
  const a = pinFade(t); if (a < 0.02) return; const P = g.P; const side = t.side === 'mixed' ? 'union' : t.side; const b0 = c.globalAlpha; c.globalAlpha = b0 * a;
  c.beginPath(); c.arc(0, 0, 3.4, 0, 6.283); c.fillStyle = rgba(P['color.underlay'], 0.75); c.fill();
  c.beginPath(); c.arc(0, 0, 2.6, 0, 6.283); c.fillStyle = P['color.' + SIDE_KEYS[side] + '.fill']; c.fill(); c.lineWidth = 1; c.strokeStyle = P['color.ringLight']; c.stroke(); c.globalAlpha = b0;
}
/** leader: a hairline from the true position to the tile, with a dark underlay so it holds on bright ground */
function leader(c, t, g, a, b) {
  const P = g.P; const side = t.side === 'mixed' ? 'union' : t.side; c.lineCap = 'butt';
  c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.strokeStyle = rgba(P['color.underlay'], P['alpha.leaderUnder']); c.lineWidth = 3; c.stroke();
  c.strokeStyle = rgba(P['color.' + SIDE_KEYS[side] + '.ink'], P['alpha.leader']); c.lineWidth = 1; c.stroke();
}
/** hull: the true positions of the records an aggregate stands for, drawn only while the aggregate is hovered (the quiet rule: no dots until they are asked for) */
function hull(c, t, g, pts) {
  const hk = typeof globalThis !== 'undefined' && globalThis.__skinKit ? globalThis.__skinKit.hover() : null; if (hk !== t.key) return;
  const P = g.P; const side = t.side === 'mixed' ? 'union' : t.side;
  for (const p of pts) { c.beginPath(); c.arc(p[0], p[1], 2.4, 0, 6.283); c.fillStyle = rgba(P['color.underlay'], 0.7); c.fill(); c.beginPath(); c.arc(p[0], p[1], 1.7, 0, 6.283); c.fillStyle = P['color.' + SIDE_KEYS[side] + '.ink']; c.fill(); c.lineWidth = 0.8; c.strokeStyle = P['color.ringLight']; c.stroke(); }
}

/** the legend swatches: the real marks at true size (104 x 40 swatches), painted by paintMark with a synthetic description */
function sample(c, ch, v, g, w, h) {
  const P = g.P; const tw = (k, s) => { const px = k === 'codeL' || k === 'tailL' ? P['type.large'] : P['type.small']; c.font = `${k === 'tail' || k === 'tailL' ? 400 : 700} ${px}px ${FONT_STACK}`; return c.measureText(s).width; };
  const base = { side: 'union', arm: 'infantry', level: 0, glyph: true, code: '14 VT', tail: null, name: null, ratio: 0.75, carried: 0, idOnly: false, hov: 0, sel: 0, enter: 1, form: 0, armState: null };
  let info = { agg: false, level: 0, formation: false, code: '14 VT', tail: null, name: null, named: false, glyph: true }; let m = { ...base };
  const set = (o, i = {}) => { m = { ...m, ...o }; info = { ...info, ...i }; };
  switch (ch) {
    case 'side': if (v === 'mixed') set({ side: 'mixed', glyph: false, code: 'Contact', tail: '×12', arm: null }, { agg: true, glyph: false, code: 'Contact', tail: '×12' }); else set({ side: v, code: v === 'unknown' ? '3 AL' : v === 'confederate' ? '10 AL' : '14 VT' }, { code: v === 'unknown' ? '3 AL' : v === 'confederate' ? '10 AL' : '14 VT' }); break;
    case 'arm': if (v === 'formation') set({ glyph: false, level: 2, code: 'I/3', arm: null }, { formation: true, level: 2, glyph: false, code: 'I/3' }); else if (v === 'mixed') set({ side: 'union', glyph: false, level: 2, code: 'II/3', tail: '×7', arm: null }, { agg: true, level: 2, glyph: false, code: 'II/3', tail: '×7' }); else set({ arm: v, code: v === 'cavalry' ? '5 MI' : v === 'artillery' ? 'B 1 PA' : '14 VT' }, { code: v === 'cavalry' ? '5 MI' : v === 'artillery' ? 'B 1 PA' : '14 VT' }); break;
    case 'armState': set({ arm: v === 'mounted' || v === 'dismounted' ? 'cavalry' : 'artillery', armState: v, code: v === 'mounted' || v === 'dismounted' ? '5 MI' : 'B 1 PA' }, { code: v === 'mounted' || v === 'dismounted' ? '5 MI' : 'B 1 PA' }); break;
    case 'echelon': set({ level: +v, glyph: +v === 1, code: +v === 1 ? 'I-1' : +v === 2 ? 'I/3' : +v === 3 ? '3 Div' : 'II Corps' }, { level: +v, formation: +v >= 2, glyph: +v === 1, code: +v === 1 ? 'I-1' : +v === 2 ? 'I/3' : +v === 3 ? '3 Div' : 'II Corps' }); break;
    case 'strength': set({ ratio: +v }); break;
    case 'fix': set({ carried: v === 'carried' ? 1 : 0 }); break;
    case 'idOnly': set({ idOnly: true, code: '10 AL', side: 'confederate' }, { code: '10 AL' }); break;
    case 'aggregate': if (v === 'lead') set({ glyph: false, level: 0, code: '14 VT', tail: '+4', arm: null }, { agg: true, level: 0, glyph: false, code: '14 VT', tail: '+4' }); else set({ glyph: false, level: 2, code: 'II/3', tail: '×7', arm: null }, { agg: true, level: 2, glyph: false, code: 'II/3', tail: '×7' }); break;
    case 'selection': set({ sel: 1 }); break;
    case 'pin': { c.save(); c.translate(-14, 5); c.beginPath(); c.moveTo(0, 0); c.lineTo(26, -6); c.strokeStyle = rgba(P['color.ringDark'], P['alpha.leaderUnder']); c.lineWidth = 3; c.stroke(); c.strokeStyle = rgba(P['color.union.ink'], P['alpha.leader']); c.lineWidth = 1; c.stroke(); c.beginPath(); c.arc(0, 0, 3, 0, 6.283); c.fillStyle = rgba(P['color.ringDark'], 0.7); c.fill(); c.beginPath(); c.arc(0, 0, 2.2, 0, 6.283); c.fillStyle = P['color.union.fill']; c.fill(); c.lineWidth = 1; c.strokeStyle = P['color.ringLight']; c.stroke(); c.restore(); return true; }
    default: return false;
  }
  const L = layoutOf(P, tw, info);
  c.save(); paintMark(c, g, m, L, -w / 2 + 4, -L.h / 2, L.plateW + L.stack); c.restore();      // true size, left-aligned so a column of swatches reads as a table
  return true;
}

/** the footprint of a mark for the layout engine: the same layoutOf() the painter uses, plus the selection band on every side */
export function makeMeasure(P) {
  return (spec, raw) => {
    const tw = (k, s) => spec.text.width(k, s) - 1; const L = layoutOf(P, tw, infoFromRaw(raw));
    return { w: Math.ceil(L.w) + 2 * spec.ring, h: Math.ceil(L.h) + 2 * spec.ring, codeW: L.textW };
  };
}

/** the words of the legend: the real marks (swatches) carry the meaning, the words only name it; each row keeps its evidence label */
const LEGEND_SHORT = {
  'side:union': 'Union: the cell on the left', 'side:confederate': 'Confederate: the cell on the right', 'side:unknown': 'Side contested: the data cannot settle it', 'side:mixed': 'Both sides in one stack (Contact)',
  'arm:infantry': 'Infantry: a cross', 'arm:cavalry': 'Cavalry: a slash', 'arm:artillery': 'Artillery: a dot', 'arm:formation': 'Brigade, division, corps: no arm claimed', 'arm:mixed': 'Stack of several arms',
  'armState:dismounted': 'Dismounted cavalry: the slash on a ground line', 'armState:limbered': 'Limbered artillery: gun and limber',
  'echelon:1': 'Battalion: II above the mark', 'echelon:2': 'Brigade: X', 'echelon:3': 'Division: XX', 'echelon:4': 'Corps: XXX',
  'strength:1': 'Strength gauge: this keyframe over the reference strength', 'fix:fresh': 'Fresh: the latest keyframe is under half a day old', 'fix:carried': 'Washed out: a day or more old, position carried forward',
  'idOnly:idOnly': 'Underlined code: no order-of-battle record', 'aggregate:agg': 'Stack: ×N records of one formation, never men', 'aggregate:lead': 'Stack named for one unit: +N others',
  'selection:selected': 'Selected: ring, and the full name', 'pin:pin': 'True position of a displaced mark',
};

/** @param {{id:string,label:string,tokens:object[],variants:object}} json  the parsed tokens/d3.skin.tokens.json */
export function makeD3Skins(json) {
  const rows = json.tokens.map((t) => [t.name, t.value, t.doc, { min: t.min, max: t.max, unit: t.unit }]);
  const P0 = Object.fromEntries(json.tokens.map((t) => [t.name, t.value]));
  const variants = Object.fromEntries(Object.entries(json.variants || {}).map(([k, v]) => [k, { label: v.label, set: v.set }]));
  const fonts = { code: `700 ${P0['type.small']}px ${FONT_STACK}`, label: `400 ${P0['type.small']}px ${FONT_STACK}`, badge: `700 ${P0['type.small']}px ${FONT_STACK}` };
  const skins = defineFamily({
    id: json.id, label: json.label, version: json.version || '1.0', fonts, tokens: rows,
    footprint: { chipH: P0['size.plate.unit'] + 4, chipPadX: 6, glyphW: P0['size.plate.unit'], glyphGap: 6, chipMinW: 36, ring: 2, badgeGap: 6, labelH: 14, labelPadX: 4, labelGap: 2, pinHalf: 3 },
    measure: makeMeasure(P0), ownsHover: true, forms: { nameZoom: P0['form.nameZoom'], nameHyst: P0['form.nameHyst'], nameOnSelect: !!P0['form.nameOnSelect'] },
    channels: { side: true, arm: true, armState: ['dismounted', 'limbered'], echelon: true, strength: [1], fix: true, idOnly: true, aggregate: true, selection: true, pin: true },
    fallbackSwatch: '#2f6fcb', draw: { tile, pin, leader, hull }, sample,
  }, variants);
  // the legend says each thing in a few words (the kit's sentences are the long form, kept for the About tab's wording and the SPEC)
  for (const sk of skins) { const long = sk.legend; sk.legend = () => long().map((r) => ({ ...r, text: LEGEND_SHORT[r.channel + ':' + r.value] || r.text })); }
  return skins;
}
