// skins/glyph.mjs - OPTION B "GLYPH".  The editorial small mark: ONE glyph per unit, standing on the unit's true place, with its words set straight on the sheet in a white halo, the way a newspaper's graphics desk labels a map.
//   * side     = the colour AND the shape family (Union a disc, Confederate a rounded square, side unknown a hatched grey octagon): the side survives a grey print and a colour-blind eye;
//   * arm      = a white mark inside the glyph (infantry: none; cavalry: a slash; artillery: a dot);
//   * rank     = the size of the glyph and its rings (regiment < brigade, one ring < division, two < corps, three): the scale hierarchy is size, never a box;
//   * strength = a slim gauge arc round a regiment glyph from the full zoom (MODELLED: placement strength over the unit's reference, not a casualty record);
//   * a fix a battle day old or more = the glyph hollows into pale glass in a heavy side-coloured outline (the hue stays, never grey);
//   * a crowd that cannot all stand on its own place merges into ONE stacked glyph whose numeral counts the units and whose words say what they share.
// Below the full zoom (15) a unit is a small side-and-arm glyph (no lettering); from 15 it is full (a larger glyph, its short code, the gauge); selected, hovered or close up the SAME mark grows its name.  Selection is a ring
// round the glyph.  The battle remembers through the ground marks of fx/memory.mjs.
import { defineFamily, ss, skinKit } from './kit.mjs';
import { FONTS } from './semantics.mjs';
import { GLY_TOKENS, GLY_VARIANTS } from './glyph.spec.mjs';
import { TAU, sideOf, sgnOf, infoOfUnit, infoOfAgg, infoOfTile, wideScreen, textShown, detailOf, lettering, putText, rgba, mixHex, clamp01, wrapText, codeOf, compactName } from './common.mjs';

export const FOOT = { chipH: 22, chipMinW: 10, ring: 3, pinHalf: 2.6 };
export { sgnOf, codeOf, compactName };

const classOf = (info) => (!info.flag ? 0 : info.ech >= 3 ? 3 : info.ech === 2 ? 2 : 1);
const SIZE = ['glyph.unit', 'glyph.brigade', 'glyph.division', 'glyph.corps'];
function dims(P, info, full, T) {
  const k = classOf(info);
  if (k === 0) return { S: full ? P['glyph.unitFull'] : P['glyph.unit'], rings: 0, stack: 0, k };
  if (info.count != null) return { S: Math.max(P['glyph.crowdMin'], P[SIZE[k]], Math.ceil(T.width('code', info.count) + 7)), rings: 0, stack: P['stack.layers'], k };
  return { S: P[SIZE[k]], rings: k, stack: 0, k };
}
/** the outermost radius of a glyph with its rings or its gauge */
const radiusOf = (P, dm, gauge) => {
  let r = dm.S / 2; if (dm.rings) r = dm.S / 2 + dm.rings * P['ring.step'] + P['ring.width'] / 2;
  if (gauge) r = Math.max(r, dm.S / 2 + P['gauge.gap'] + P['gauge.width']); return r;
};

/** the geometry of a mark: one function used by the layout (the footprint) and the drawing.  The origin is the glyph centre (the unit's true position); the lettering reads away from it in the direction of the side. */
export function plan(spec, P, info, z, sel) {
  const T = spec.text; const D = detailOf(z, P); const txt = textShown(info, z, P, sel); const sgn = sgnOf(info.side); const full = D.full || (sel && z >= P['detail.selectGrowZoom']);
  const dm = dims(P, info, full, T); const font = info.flag ? 'form' : (info.idOnly ? 'codeI' : 'code');
  let showName = false; let text = ''; let textW = 0;
  if (!info.flag) { const grow = sel && wideScreen(P) && z >= P['detail.selectGrowZoom']; showName = !!info.name && (D.uname || grow); text = txt ? (showName ? info.name : info.short) : ''; textW = txt ? T.width(showName ? 'code' : font, text) : 0; }
  else { text = txt ? (info.name || info.short) : ''; textW = txt ? T.width('form', text) : 0; }
  const gauge = !info.flag && full && P['gauge.on'] > 0.5; const Rb = radiusOf(P, dm, gauge); const M = P['sel.gap'] + P['sel.width'] / 2 + 1.3; const back = dm.stack * P['stack.step'];
  const left = M + Rb + back; const right = M + Rb + (txt ? P['text.gap'] + textW : 0); const top = M + Rb + back; const bottom = M + Rb;
  const w = Math.ceil(left + right); const h = Math.ceil(top + bottom); const cx = sgn * (right - left) / 2; const cy = (bottom - top) / 2;
  return { flag: info.flag, sgn, txt, font, text, textW, showName, full, dm, S: dm.S, k: dm.k, gauge, Rb, w, h, dx: cx, dy: cy, near: left, D };
}

function makeSizer(skin) {
  const P = skin.P; const out = (p) => ({ w: p.w, h: p.h, dx: p.dx, dy: p.dy, sgn: p.sgn });
  return {
    key: (u, z, sel) => { const info = infoOfUnit(u); return (textShown(info, z, P, sel) ? 't' : '-') + (z >= P['detail.fullZoom'] ? 'f' : '-') + (z >= P['detail.unitNameZoom'] ? 'u' : '-') + (sel ? 's' : '-') + (wideScreen(P) ? 'w' : 'n') + skin.rev; },
    leaf: (spec, u, z, sel) => out(plan(spec, P, infoOfUnit(u), z, sel)),
    agg: (spec, a) => out(plan(spec, P, infoOfAgg(a), a.zoom, false)),
    selects: (z) => wideScreen(P) && z >= P['detail.selectGrowZoom'],
  };
}

const sideCol = (P, side) => (side === 'union' ? P['color.union'] : side === 'confederate' ? P['color.confederate'] : P['color.unknown']);
const sideTint = (P, side) => (side === 'union' ? P['color.unionTint'] : side === 'confederate' ? P['color.confederateTint'] : '#eceff1');
const tintHex = (P, side) => (side === 'union' ? P['color.tintUnion'] : side === 'confederate' ? P['color.tintConfederate'] : side === 'unknown' ? P['color.tintUnknown'] : P['color.tintMixed']);
const easeOut = (x) => 1 - (1 - clamp01(x)) ** 3;

/** the outline of a body of width s centred on (cx, cy): union and mixed a disc, confederate a rounded square, unknown an octagon */
function bodyPath(c, P, side, cx, cy, s) {
  const r = s / 2; c.beginPath();
  if (side === 'confederate') { const k = Math.min(P['glyph.round'], r); const x = cx - r; const y = cy - r; c.moveTo(x + k, y); c.lineTo(x + s - k, y); c.arcTo(x + s, y, x + s, y + k, k); c.lineTo(x + s, y + s - k); c.arcTo(x + s, y + s, x + s - k, y + s, k); c.lineTo(x + k, y + s); c.arcTo(x, y + s, x, y + s - k, k); c.lineTo(x, y + k); c.arcTo(x, y, x + k, y, k); c.closePath(); }
  else if (side === 'unknown') { const q = r * 0.42; c.moveTo(cx - q, cy - r); c.lineTo(cx + q, cy - r); c.lineTo(cx + r, cy - q); c.lineTo(cx + r, cy + q); c.lineTo(cx + q, cy + r); c.lineTo(cx - q, cy + r); c.lineTo(cx - r, cy + q); c.lineTo(cx - r, cy - q); c.closePath(); }
  else c.arc(cx, cy, r, 0, TAU);
}
function hatchIn(c, cx, cy, r, col, a) { c.save(); c.clip(); c.strokeStyle = rgba(col, a); c.lineWidth = 1; c.beginPath(); for (let q = -2 * r; q < 2 * r; q += 3) { c.moveTo(cx + q - r, cy + r); c.lineTo(cx + q + r, cy - r); } c.stroke(); c.restore(); }

/** one glyph.  o = { side, arm, S, rings, old, scale, stackN }: the centre is (cx, cy) */
function drawGlyph(c, P, cx, cy, o) {
  const { side, arm, S, rings = 0, old = 0, scale = 1, stackN = 0 } = o; const s = S * scale; if (s < 1.2) return; const base = c.globalAlpha; const hollow = old * P['carried.hollow']; const col = sideCol(P, side === 'mixed' ? 'union' : side);
  const ol = P['glyph.outline']; const under = P['glyph.under']; const stepS = P['stack.step'];
  for (let i = stackN; i >= 0; i--) {                                                       // the layers behind a crowd glyph first, then the glyph in front
    const ox = i ? -(o.sgn || 1) * stepS * i : 0; const oy = i ? -stepS * i : 0; const x = cx + ox; const y = cy + oy;
    if (rings && i === 0) for (let k = rings; k >= 1; k--) { const rr = S / 2 + k * P['ring.step']; c.beginPath(); c.arc(x, y, rr * scale, 0, TAU); c.lineWidth = P['ring.width'] + 2 * under * 0.8; c.strokeStyle = rgba(P['color.paper'], 0.85); c.stroke(); c.lineWidth = P['ring.width']; c.strokeStyle = col; c.stroke(); }
    bodyPath(c, P, side === 'mixed' ? 'union' : side, x, y, s); c.lineJoin = 'round'; c.lineWidth = ol + 2 * under; c.strokeStyle = rgba(P['color.paper'], 0.95); c.stroke();
    if (hollow < 0.99) { c.globalAlpha = base * (1 - hollow); bodyPath(c, P, side === 'mixed' ? 'union' : side, x, y, s); c.fillStyle = col; c.fill(); if (side === 'unknown') hatchIn(c, x, y, s / 2, P['color.paper'], 0.7); c.globalAlpha = base; }
    if (side === 'mixed' && hollow < 0.99) { c.save(); bodyPath(c, P, 'union', x, y, s); c.clip(); c.globalAlpha = base * (1 - hollow); c.beginPath(); c.moveTo(x + s * 0.12, y - s); c.lineTo(x + s, y - s); c.lineTo(x + s, y + s); c.lineTo(x - s * 0.22, y + s); c.closePath(); c.fillStyle = P['color.confederate']; c.fill(); c.restore(); c.globalAlpha = base; }
    if (hollow > 0.01) { c.globalAlpha = base * hollow; bodyPath(c, P, side === 'mixed' ? 'union' : side, x, y, s); c.fillStyle = sideTint(P, side === 'mixed' ? 'union' : side); c.fill(); c.globalAlpha = base; }
    bodyPath(c, P, side === 'mixed' ? 'union' : side, x, y, s); c.lineWidth = ol + (P['carried.ring'] - ol) * hollow; c.strokeStyle = mixHex(P['color.outline'], col, hollow); c.stroke();
    if (i === 0 && !o.noArm && !stackN) {                                                // the arm mark inside the glyph: white on a solid body, the side colour on glass
      const ink = mixHex(P['color.inner'], col, hollow); const q = s * 0.3; c.lineCap = 'round';
      if (arm === 'cavalry') { c.beginPath(); c.moveTo(x - q, y + q); c.lineTo(x + q, y - q); c.lineWidth = P['arm.stroke']; c.strokeStyle = ink; c.stroke(); }
      else if (arm === 'artillery') { c.beginPath(); c.arc(x, y, P['arm.stroke'], 0, TAU); c.fillStyle = ink; c.fill(); }
    }
  }
}

function gaugeArc(c, P, cx, cy, r, ratio, col, a) {
  const gw = P['gauge.width']; c.lineCap = 'butt'; c.beginPath(); c.arc(cx, cy, r, 0, TAU); c.lineWidth = gw + 1.8; c.strokeStyle = rgba(P['color.paper'], 0.9 * a); c.stroke();
  c.beginPath(); c.arc(cx, cy, r, 0, TAU); c.lineWidth = gw; c.strokeStyle = rgba(P['color.outline'], P['gauge.track'] * a); c.stroke();
  const f = Math.max(0.03, Math.min(1, ratio)); c.beginPath(); c.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + TAU * f); c.strokeStyle = rgba(col, a * P['gauge.alpha']); c.stroke();
}
function selRing(c, P, side, cx, cy, r, k, w) {
  const col = side === 'union' ? P['color.union'] : side === 'confederate' ? P['color.confederate'] : P['color.select'];
  c.beginPath(); c.arc(cx, cy, r, 0, TAU); c.strokeStyle = rgba(P['color.paper'], 0.95 * k); c.lineWidth = w + 2.6; c.stroke(); c.strokeStyle = rgba(col, k); c.lineWidth = w; c.stroke();
}

// ---- the tile --------------------------------------------------------------------------------------------------------------------------------------------------------------------
function tile(c, t, g) {
  const P = g.P; const vm = g.vm; const spec = g.env.spec; const info = infoOfTile(t); const side = info.side; const sel = !!t.selected;
  const pl = plan(spec, P, info, g.zoom, sel && t.grown !== false); const hw = g.hw; const old = vm.carried; const base = c.globalAlpha; const sgn = pl.sgn; const enter = easeOut(g.enter);
  const lo = -hw + 0.5; const hi = hw - 0.5; const textAlpha = 1 - old * (1 - P['text.dimAlpha']); const gx = -pl.dx; const gy = -pl.dy;
  const nm = g.ease('name', !pl.flag && pl.showName ? 1 : 0, 180); const Sn = g.ease('S', pl.S, 140);                  // the glyph grows into the full size over 140 ms (a zoom through 15 never pops)
  const arm = vm.arm === 'cavalry' || vm.arm === 'artillery' ? vm.arm : 'infantry'; const ringSide = side === 'mixed' ? 'union' : side;
  const gaugeK = g.ease('gauge', pl.gauge ? 1 : 0, 160); const dm = pl.dm;
  c.globalAlpha = base * (0.55 + 0.45 * enter);
  if (gaugeK > 0.01) gaugeArc(c, P, gx, gy, Sn / 2 + P['gauge.gap'] + P['gauge.width'] / 2 - 0.4, vm.ratio, P['color.outline'], gaugeK);
  drawGlyph(c, P, gx, gy, { side, arm: pl.flag ? 'infantry' : arm, S: Sn, rings: dm.rings, old, scale: 0.8 + 0.2 * enter, stackN: dm.stack, sgn, noArm: pl.flag });
  c.globalAlpha = base;
  if (pl.flag && info.count != null) {                                                    // the numeral in the middle of the front glyph: white on the body, ink on the glass
    const hol = ss(0.42, 0.58, old * P['carried.hollow']); const by = g.cr(gy + P['code.baseline'] - 0.2, 0); const b = c.globalAlpha;
    if (hol < 0.99) { const sp = lettering(g, FONTS.code, info.count, P['color.inner'], P['color.numeralHalo'], 0); c.globalAlpha = b * ss(0.4, 1, g.enter) * (1 - hol); c.drawImage(sp.img, gx - sp.tw / 2 - sp.x, by - sp.y, sp.w, sp.h); }
    if (hol > 0.01) { const sp = lettering(g, FONTS.code, info.count, P['color.ink'], P['color.halo'], 0); c.globalAlpha = b * ss(0.4, 1, g.enter) * hol; c.drawImage(sp.img, gx - sp.tw / 2 - sp.x, by - sp.y, sp.w, sp.h); }
    c.globalAlpha = b;
  }
  const tx = gx + sgn * (pl.Rb + P['text.gap']); const baseY = g.cr(gy + P['code.baseline'] - 0.2, 0); const tk = g.ease('txt', pl.txt ? 1 : 0, 160);
  if (!pl.flag) {
    if (tk * (1 - nm) > 0.01) putText(c, g, FONTS[pl.font], info.short, tx, baseY, P['color.ink'], textAlpha * ss(0.25, 1, g.enter) * tk * (1 - ss(0, 0.4, nm)), sgn, lo, hi);
    if (info.name && nm > 0.01) putText(c, g, FONTS.code, info.name, tx, baseY, P['color.ink'], ss(0.3, 0.9, nm) * P['name.alpha'] * textAlpha, sgn, lo, hi);
  } else if (pl.text && tk > 0.01) {
    const mw = lettering(g, FONTS.form, pl.text, tintHex(P, side)).tw; putText(c, g, FONTS.form, pl.text, sgn > 0 ? tx : tx - mw, baseY, tintHex(P, side), textAlpha * ss(0.25, 1, g.enter) * tk, 1, lo, hi);
  }
  const rr = pl.Rb + P['sel.gap'];
  if (g.hov > 0.01 && g.sel < 0.5) selRing(c, P, ringSide, gx, gy, rr, 0.7 * g.hov, P['hover.width']);
  if (g.sel > 0.003) selRing(c, P, ringSide, gx, gy, rr, g.sel, P['sel.width']);
  c.globalAlpha = base;
}

// ---- pin, leader, hull ---------------------------------------------------------------------------------------------------------------------------------------------------
function standing(t, g, b) { const pl = plan(g.env.spec, g.P, infoOfTile(t), g.zoom, !!t.selected && t.grown !== false); return [b[0] - pl.dx, b[1] - pl.dy]; }
const isOn = (t) => !!t.selected || skinKit.hover() === t.key;
function pin(c, t, g) {
  if (!isOn(t)) return; const P = g.P; const r = P['pin.r']; const base = c.globalAlpha; const side = sideOf(g.vm.side === 'mixed' ? 'union' : g.vm.side);
  c.beginPath(); c.arc(0, 0, r + 1.3, 0, TAU); c.fillStyle = rgba(P['color.paper'], 0.95); c.fill(); c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fillStyle = P['color.outline']; c.fill();
  c.beginPath(); c.arc(0, 0, Math.max(0.6, r - 1.15), 0, TAU); c.fillStyle = sideCol(P, side); c.fill(); c.globalAlpha = base;
}
function leader(c, t, g, a, b) {
  if (!isOn(t)) return; const P = g.P; const e = standing(t, g, b); if (Math.hypot(e[0] - a[0], e[1] - a[1]) < 3.5) return; const base = c.globalAlpha; c.globalAlpha = base * P['leader.alpha']; c.lineCap = 'round';
  c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(e[0], e[1]); c.strokeStyle = rgba(P['color.paper'], 0.8); c.lineWidth = P['leader.width'] + 2; c.stroke();
  c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(e[0], e[1]); c.strokeStyle = sideCol(P, sideOf(g.vm.side === 'mixed' ? 'union' : g.vm.side)); c.lineWidth = P['leader.width']; c.stroke(); c.globalAlpha = base;
}
function hull(c, t, g, pts) {
  const P = g.P; if (g.zoom < P['detail.hullZoom'] || !pts.length || !isOn(t)) return;
  const view = g.env.view || { dx: 0, dy: 0 }; const e0 = standing(t, g, [t.x + view.dx, t.y + view.dy]); const base = c.globalAlpha; const side = sideOf(g.vm.side); c.lineCap = 'round'; c.beginPath();
  for (const p of pts) { c.moveTo(e0[0], e0[1]); c.lineTo(p[0], p[1]); }
  c.globalAlpha = base * P['hull.leader']; c.strokeStyle = rgba(P['color.paper'], 0.8); c.lineWidth = 2.4; c.stroke(); c.strokeStyle = tintHex(P, side); c.lineWidth = 0.9; c.stroke();
  c.globalAlpha = base * 0.95; const r = P['hull.dot'];
  for (const p of pts) { c.beginPath(); c.arc(p[0], p[1], r + 1.2, 0, TAU); c.fillStyle = rgba(P['color.paper'], 0.95); c.fill(); c.beginPath(); c.arc(p[0], p[1], r, 0, TAU); c.fillStyle = P['color.outline']; c.fill(); }
  c.globalAlpha = base;
}

// ---- the legend's swatches (centre at 0,0): the same drawing code --------------------------------------------------------------------------------------------------------------
function sample(c, ch, v, g) {
  const P = g.P; const S = P['glyph.unitFull'];
  if (ch === 'side') { if (v === 'mixed') drawGlyph(c, P, 0, 0, { side: 'mixed', arm: 'infantry', S: 14, noArm: true }); else drawGlyph(c, P, 0, 0, { side: v, arm: 'infantry', S }); }
  else if (ch === 'arm') { if (v === 'formation') drawGlyph(c, P, 0, 0, { side: 'union', arm: 'infantry', S: 9, rings: 1, noArm: true }); else if (v === 'infantry' || v === 'cavalry' || v === 'artillery') drawGlyph(c, P, 0, 0, { side: 'union', arm: v, S }); else return false; }
  else if (ch === 'fix') drawGlyph(c, P, 0, 0, { side: 'union', arm: 'infantry', S, old: v === 'carried' ? 1 : 0 });
  else if (ch === 'aggregate') { drawGlyph(c, P, 1.5, 1, { side: 'union', arm: 'infantry', S: 13, stackN: 2, sgn: 1, noArm: true }); c.font = FONTS.code; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = P['color.inner']; c.fillText('5', 1.5, 1.4); }
  else if (ch === 'idOnly') { c.font = FONTS.codeI; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = P['color.ink']; c.fillText('12 NC', 0, 0.6); }
  else if (ch === 'selection') { drawGlyph(c, P, 0, 0, { side: 'union', arm: 'infantry', S: 10 }); selRing(c, P, 'union', 0, 0, 5 + P['sel.gap'], 1, P['sel.width']); }
  else if (ch === 'facing') { drawGlyph(c, P, -6, 0, { side: 'union', arm: 'infantry', S: 8 }); drawGlyph(c, P, 6, 0, { side: 'confederate', arm: 'infantry', S: 8 }); }
  else if (ch === 'strength') { gaugeArc(c, P, 0, 0, 6.2, v === 1 ? 1 : 0.4, P['color.outline'], 1); drawGlyph(c, P, 0, 0, { side: 'union', arm: 'infantry', S: 7.5, noArm: true }); }
  else if (ch === 'memory') { c.save(); c.lineCap = 'round'; for (const [x, y, col] of [[-5, -1, P['memory.union']], [4, 2, P['memory.confederate']]]) { c.beginPath(); c.moveTo(x - 2.2, y - 2.2); c.lineTo(x + 2.2, y + 2.2); c.moveTo(x - 2.2, y + 2.2); c.lineTo(x + 2.2, y - 2.2); c.strokeStyle = rgba(P['memory.edge'], P['memory.edgeAlpha']); c.lineWidth = P['memory.width'] + 1.6; c.stroke(); c.strokeStyle = col; c.lineWidth = P['memory.width']; c.stroke(); } c.restore(); }
  else return false;
}

// ---- the legend's figure ----------------------------------------------------------------------------------------------------------------------------------------------------------
function figure(c, g, W) {
  const P = g.P; const ink = P['color.ink']; const mute = rgba(ink, 0.78); const faint = rgba(ink, 0.16); const FACE = FONTS.name.replace(/^400 12px /, ''); const cap = `400 12px ${FACE}`; const lab = `600 12px ${FACE}`; const labB = `700 13px ${FACE}`; const title = `700 11px ${FACE}`;
  const M = 16; let y = 8; c.textBaseline = 'alphabetic'; c.textAlign = 'left';
  const word = (s, x, yy, font, col, align = 'left') => { c.font = font; c.fillStyle = col; c.textAlign = align; c.fillText(s, x, yy); c.textAlign = 'left'; };
  const head = (s) => { word(s, M, y + 11, title, rgba(ink, 0.62)); y += 20; };
  const caption = (text) => { c.font = cap; const lines = wrapText(c, text, W - 2 * M); c.fillStyle = mute; for (const ln of lines) { c.fillText(ln, M, y + 12); y += 17; } };
  const rule = () => { y += 6; c.strokeStyle = faint; c.lineWidth = 1; c.beginPath(); c.moveTo(M, y + 0.5); c.lineTo(W - M, y + 0.5); c.stroke(); y += 12; };
  const bl = P['code.baseline']; const S = P['glyph.unitFull']; const gx = (S / 2) + 3; const tg = S / 2 + P['text.gap'];
  head('A unit'); let cy = y + 12;
  drawGlyph(c, P, M + gx, cy, { side: 'union', arm: 'infantry', S }); word('71 PA', M + gx + tg, cy + bl, lab, ink);
  drawGlyph(c, P, M + gx + 84, cy, { side: 'union', arm: 'cavalry', S }); word('1 NJ', M + gx + 84 + tg, cy + bl, lab, ink);
  drawGlyph(c, P, M + gx + 150, cy, { side: 'union', arm: 'artillery', S }); word('B/1 RI', M + gx + 150 + tg, cy + bl, lab, ink);
  drawGlyph(c, P, W - M - gx, cy, { side: 'confederate', arm: 'infantry', S }); word('53 VA', W - M - gx - tg, cy + bl, lab, ink, 'right');
  y += 28; caption('A disc is Union, a rounded square Confederate. Inside: nothing for infantry, a slash for cavalry, a dot for artillery. Each reads away from its own side: Union to the right, Confederate to the left.'); rule();
  head('Rank'); cy = y + 26;
  for (const [x0, k, text] of [[0, 1, 'Bde'], [74, 2, 'Div'], [160, 3, 'Corps']]) { const x = M + 20 + x0; const s = P[SIZE[k]]; drawGlyph(c, P, x, cy, { side: 'union', arm: 'infantry', S: s, rings: k, noArm: true }); word(text, x + s / 2 + k * P['ring.step'] + 5, cy + bl, labB, P['color.tintUnion']); }
  y += 56; caption('A larger glyph with more rings is a higher rank: one ring a brigade, two a division, three a corps. Rank is size, never a box.'); rule();
  head('A crowd'); cy = y + 22;
  drawGlyph(c, P, M + 22, cy, { side: 'union', arm: 'infantry', S: 19, stackN: 2, sgn: 1, noArm: true }); word('5', M + 22, cy + bl - 0.2, lab, P['color.inner'], 'center'); word("Garnett's Bde", M + 22 + 19 / 2 + 6, cy + bl, labB, P['color.tintUnion']);
  drawGlyph(c, P, W - M - 22, cy, { side: 'confederate', arm: 'infantry', S: 19, stackN: 2, sgn: -1, noArm: true }); word('9', W - M - 22, cy + bl - 0.2, lab, P['color.inner'], 'center'); word("Pender's Div", W - M - 22 - 19 / 2 - 6, cy + bl, labB, P['color.tintConfederate'], 'right');
  y += 44; caption('Units too close to stand apart merge into one stacked glyph. Its number counts placement records, never men; its words say what they share. Point at it to see where each one stands.'); rule();
  head('Age, strength and the ground'); cy = y + 14;
  drawGlyph(c, P, M + gx, cy, { side: 'union', arm: 'infantry', S }); word('fresh', M + gx + tg, cy + bl, lab, ink);
  drawGlyph(c, P, M + gx + 66, cy, { side: 'union', arm: 'infantry', S, old: 1 }); word('carried forward', M + gx + 66 + tg, cy + bl, lab, ink);
  gaugeArc(c, P, M + gx + 200, cy, S / 2 + P['gauge.gap'] + P['gauge.width'] / 2 - 0.4, 0.6, P['color.outline'], 1); drawGlyph(c, P, M + gx + 200, cy, { side: 'union', arm: 'infantry', S }); word('strength', M + gx + 200 + S / 2 + 8, cy + bl, lab, ink);
  y += 32; caption('A hollow glyph means the latest keyframe is a battle day old or more. The arc round a glyph is the placement strength over the unit’s reference: a modelled value, not a casualty record.'); rule();
  head('The battle remembers'); c.save(); c.lineCap = 'round'; const my = y + 10; for (let i = 0; i < 9; i++) { const x = M + 8 + i * 10 + (i % 3) * 2; const yy = my + ((i * 7) % 5) - 2; const col = i < 5 ? P['memory.union'] : P['memory.confederate']; c.beginPath(); c.moveTo(x - 2, yy - 2); c.lineTo(x + 2, yy + 2); c.moveTo(x - 2, yy + 2); c.lineTo(x + 2, yy - 2); c.strokeStyle = rgba(P['memory.edge'], P['memory.edgeAlpha']); c.lineWidth = P['memory.width'] + 1.6; c.stroke(); c.strokeStyle = col; c.lineWidth = P['memory.width']; c.stroke(); } c.restore();
  y += 22; caption('Each cross on the ground stands for about ten men killed, wounded or missing. How many a unit lost is Documented (a secondary source); when and where they fell is Modelled.'); y += 8;
  return y;
}
const FIG_H = 720;

const DEF = {
  id: 'glyph', label: 'Glyph', version: '1.0', tokens: GLY_TOKENS, fonts: FONTS, footprint: FOOT, sizer: makeSizer,
  channels: { side: true, facing: true, arm: ['infantry', 'cavalry', 'artillery', 'formation'], fix: true, aggregate: true, idOnly: true, selection: true, strength: true, memory: true },
  draw: { tile, pin, leader, hull }, sample, figure, figureH: FIG_H, fallbackSwatch: '#8aa0b8',
  legendText: {
    'side:union': 'Union: a disc (order of battle)', 'side:confederate': 'Confederate: a rounded square (order of battle)', 'side:unknown': 'Side unknown: a hatched grey octagon, never a side colour', 'side:mixed': 'Both sides in one glyph',
    'arm:infantry': 'Infantry: nothing inside the glyph', 'arm:cavalry': 'Cavalry: a slash inside', 'arm:artillery': 'Artillery: a dot inside', 'arm:formation': 'Formation record (brigade, division, corps): a larger glyph with rings, no arm claimed',
    'aggregate:agg': 'A number on a stacked glyph: the placement records it stands for, never men', 'selection:selected': 'A ring round the glyph: the selected mark (from zoom 15 it also grows its name)',
    'fix:fresh': 'Solid glyph: the latest keyframe is under half a battle day old', 'fix:carried': 'Hollow glyph: a battle day or more old, carried forward', 'facing:facing': 'Union lettering reads to the right, Confederate to the left',
    'strength:1': 'Arc round a regiment glyph: placement strength over reference, full', 'strength:0.4': 'The same at 40 %: a placement value, not casualties',
  },
};
if (typeof window !== 'undefined') window.__lookSkins = { ...(window.__lookSkins || {}), glyph: { codeOf, compactName, plan, sgnOf } };
export const GLYPH = defineFamily(DEF, GLY_VARIANTS);
