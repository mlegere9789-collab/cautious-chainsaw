// skins/map-1863.mjs - SKIN 3 of 3: 1863 MAP.  A lithographed field-map tablet: parchment, ink rule, a blue or red flag carrying the arm, and, for Union infantry, the corps badge of the
// circular of 21 March 1863 as a medallion.
//
// Why this direction (03-data-fuel.md section 5, 04-benchmarks.md R06 R08 R22):
//   * It is the one direction where a Documented period convention is the CENTRE of the design: the seven Union corps badges (sphere, trefoil, lozenge, Maltese cross, cross, crescent,
//     star) in the division colours (red, white, blue) are the army's own 1863 symbology, and the research found them Documented for 78 % of Union rows.  Where the circular is silent
//     (cavalry, artillery, every Confederate unit, any unit whose order-of-battle parent chain is not documented) NO badge is drawn: absence is the honest mark.  Confederates carry the
//     corps NAME as a roman numeral (text only: no source assigns Confederate badges).
//   * Blue and red are the heritage colours of period maps (R08, an 1862 Shiloh map and, as a snippet only, the Official Records atlas), and the evidence grammar is the cartographer's own:
//     INK is firm, PENCIL is provisional.  A fresh keyframe is inked; a position carried forward for a day or more is pencilled (dotted rule, greyer parchment); the strength band is a
//     pencilled wash (Modelled) with an inked end mark.  The base-versus-overlay lesson of Warren and Bachelder (R06) in one mark: nothing Modelled is drawn as firmly as the order of battle.
//   * Silhouette first: the Union flag has a swallow tail, the Confederate flag a point, the contested side a hatched grey square.  These flag shapes and the echelon X marks are THIS
//     SKIN'S convention, not claimed to be period insignia; only the corps badges and the division colours are.
//   * Choreography: an arriving tablet is first a pencil outline, then parchment, then wash, then ink (it is "drawn in"); a departing one is rubbed out in the reverse order.
//   Honest limit: the serif is Times New Roman (or the system's equivalent), chosen for lining figures (Georgia's old-style numerals make codes such as "1 SC" ambiguous); the layout
//   measures the engine's own font table, so text is condensed (kit.fitText) rather than allowed to overflow.
import { defineFamily, clamp01, ss, mixHex, rgba, luminance, textWidth, pinFade } from './kit.mjs';
import { FONTS } from './semantics.mjs';
import { armGlyph, echelonMarks, postureMark, corpsBadge, rr } from './glyphs.mjs';
import { M63_TOKENS, M63_VARIANTS } from './map-1863.spec.mjs';

const FOOT = { chipH: 26, chipPadX: 13, glyphW: 15, glyphGap: 4, chipMinW: 52, ring: 2, badgeGap: 5, labelH: 17, labelPadX: 7, labelGap: 3, pinHalf: 3 };
const STACK = 3;
const SERIF_M = new Map();
const SERIF = (px, weight = 700, italic = false) => { const k = px + '|' + weight + '|' + italic; let f = SERIF_M.get(k); if (!f) SERIF_M.set(k, f = `${italic ? 'italic ' : ''}${weight} ${px}px "Times New Roman", "Liberation Serif", Georgia, serif`); return f; };
const LUM = new Map();
const lumOf = (hex) => { let v = LUM.get(hex); if (v === undefined) LUM.set(hex, v = luminance(hex)); return v; };
const sideHex = (g, side) => (side === 'union' ? g.P['color.union'] : side === 'confederate' ? g.P['color.confederate'] : g.P['color.unknown']);
const catAlpha = (ct, v) => (ct.to === v ? ct.m : 0) + (ct.from === v ? 1 - ct.m : 0);
const withAlpha = (c, base, k, fn) => { if (k <= 0.004) return; c.globalAlpha = base * k; fn(); c.globalAlpha = base; };
const onColor = (g, hex) => (lumOf(hex) > 0.42 ? g.P['color.ink'] : '#f7f0dd');
const DIV = { red: 'color.divRed', white: 'color.divWhite', blue: 'color.divBlue' };

/** the flag outline: Union swallow-tail, Confederate point, contested square */
function flag(c, side, x, y, w, h, tail) {
  c.beginPath();
  if (side === 'confederate') { c.moveTo(x, y); c.lineTo(x + w - tail, y); c.lineTo(x + w, y + h / 2); c.lineTo(x + w - tail, y + h); c.lineTo(x, y + h); }
  else if (side === 'unknown') { c.rect(x, y, w - tail * 0.5, h); }
  else { c.moveTo(x, y); c.lineTo(x + w, y); c.lineTo(x + w - tail, y + h / 2); c.lineTo(x + w, y + h); c.lineTo(x, y + h); }
  c.closePath();
}

function tile(c, t, g) {
  const P = g.P; const vm = g.vm; const spec = g.env.spec; const side = vm.side; const base = c.globalAlpha; const hw = g.hw; const hh = g.hh;
  const b = g.body; const r = vm.agg ? { x: b.x, y: b.y, w: b.w - STACK, h: b.h - STACK } : b; const old = vm.carried; const ink = P['color.ink'];
  const sc = side === 'mixed' ? P['color.union'] : sideHex(g, side); const fw = g.lw(P['frame.width']) + 0.35 * g.hov + 0.3 * g.sel;
  // "drawn in": outline first, then parchment, then wash, then ink
  const pe = g.enter; const oA = clamp01(pe * 3); const pA = clamp01(pe * 1.8); const wA = clamp01((pe - 0.45) / 0.55); const iA = clamp01((pe - 0.3) / 0.7);

  // pale halo in the margin
  if (g.sel < 0.999) { rr(c, -hw + 1, -hh + 1, g.w - 2, g.h - 2, 3.2); c.strokeStyle = g.col('color.keyline', 0.85 * (1 - g.sel) * oA); c.lineWidth = 1; c.stroke(); }
  if (vm.agg) {                                                                       // a second tablet peeks out behind an aggregate
    rr(c, r.x + STACK, r.y + STACK, r.w, r.h, P['frame.radius']); c.fillStyle = rgba(P['color.parchmentOld'], pA); c.fill(); c.strokeStyle = rgba(ink, 0.75 * oA); c.lineWidth = 1; c.stroke();
  }
  // tablet
  const parch = mixHex(mixHex(P['color.parchment'], P['color.parchmentOld'], old * 0.95), P['color.accent'], g.hov * 0.14 + g.sel * 0.1);
  rr(c, r.x, r.y, r.w, r.h, P['frame.radius']); c.fillStyle = rgba(parch, pA); c.fill();
  const innerA = P['rule.inner'] * (1 - 0.6 * old) * oA;
  if (innerA > 0.01) { rr(c, r.x + fw + 1.6, r.y + fw + 1.6, r.w - 2 * (fw + 1.6), r.h - 2 * (fw + 1.6), 1); c.strokeStyle = rgba(ink, innerA); c.lineWidth = 0.7; c.stroke(); }
  if (side === 'unknown') { c.save(); rr(c, r.x, r.y, r.w, r.h, P['frame.radius']); c.clip(); c.strokeStyle = rgba(P['color.unknown'], 0.28 * pA); c.lineWidth = 1; c.beginPath(); for (let k = -r.h; k < r.w; k += P['hatch.pitch']) { c.moveTo(r.x + k, r.y + r.h); c.lineTo(r.x + k + r.h, r.y); } c.stroke(); c.restore(); }
  // the outer rule: ink while the keyframe is fresh, pencil (dotted, a little lighter) once it has been carried forward
  rr(c, r.x + fw / 2, r.y + fw / 2, r.w - fw, r.h - fw, P['frame.radius']);
  if (old > 0.08) c.setLineDash([P['pencil.dash'], P['pencil.dash'] * (0.4 + 1.3 * old)]);
  c.strokeStyle = rgba(ink, (0.95 - 0.12 * old) * oA); c.lineWidth = fw; c.stroke(); c.setLineDash([]);

  // the flag with the arm pictogram (or the echelon X marks of a formation), cream or ink by the flag's own luminance
  const fx = r.x + fw + 1.4; const fy = r.y + fw + 1.6; const fwid = spec.chipPadX + spec.glyphW - fw - 1.4; const fh = 13; const tail = P['flag.tail'];
  const gx = fx + (fwid - tail * (side === 'union' || side === 'mixed' ? 1 : 0.6)) / 2 + 0.4; const ty = g.cr(fy + fh / 2 + 0.2, 0);
  const wash = (hex, a) => { c.fillStyle = rgba(hex, a * wA * (1 - 0.18 * old)); c.fill(); };
  if (side === 'mixed') {
    c.save(); c.beginPath(); c.rect(fx - 1, fy - 1, fwid / 2 + 1, fh + 2); c.clip(); flag(c, 'union', fx, fy, fwid, fh, tail); wash(P['color.union'], 1); c.restore();
    c.save(); c.beginPath(); c.rect(fx + fwid / 2, fy - 1, fwid, fh + 2); c.clip(); flag(c, 'union', fx, fy, fwid, fh, tail); wash(P['color.confederate'], 1); c.restore();
  } else { flag(c, side, fx, fy, fwid, fh, tail); wash(sc, 1); }
  flag(c, side === 'mixed' ? 'union' : side, fx, fy, fwid, fh, tail); c.strokeStyle = rgba(ink, 0.85 * oA); c.lineWidth = 0.9; c.stroke();
  const fg = side === 'mixed' ? '#f7f0dd' : onColor(g, sc); const gw = P['glyph.weight']; const as = g.cat('armState', vm.armState, P['motion.crossMs']);
  const glyph = (state, k) => withAlpha(c, base, k * iA, () => { if (vm.arm === 'formation') echelonMarks(c, vm.ech, gx, ty, 5.4, { ink: fg, lw: gw }, 12); else armGlyph(c, vm.arm, gx, ty, 4.6, { ink: fg, lw: gw }, state); });
  if (as.from !== null) { glyph(as.from, 1 - as.m); glyph(as.to, as.m); } else glyph(vm.armState, 1);
  if (vm.agg && side === 'mixed') withAlpha(c, base, iA, () => { c.strokeStyle = '#f7f0dd'; c.lineWidth = 1.6; c.lineCap = 'round'; c.beginPath(); c.moveTo(gx - 3, ty - 3); c.lineTo(gx + 3, ty + 3); c.moveTo(gx + 3, ty - 3); c.lineTo(gx - 3, ty + 3); c.stroke(); });
  const tr = g.cat('moving', vm.moving, P['motion.crossMs']);
  withAlpha(c, base, catAlpha(tr, true) * iA, () => { c.fillStyle = rgba(ink, P['ink.modelled']); for (let i = -1; i <= 1; i++) { c.beginPath(); c.arc(gx + i * 3, fy + fh + 2.4, 0.8, 0, 6.283); c.fill(); } });

  // identity: the short code in ink (vital), its evidence mark, the aggregate seal
  const tx = r.x + spec.chipPadX + spec.glyphW + spec.glyphGap; c.font = SERIF(12.5, 700); c.textBaseline = 'middle'; c.textAlign = 'left'; c.fillStyle = rgba(ink, iA);
  const maxCode = spec.text.width('code', vm.code); const tw = g.text(c, vm.code, tx, ty + 0.5, maxCode, 'left');
  if (vm.idOnly) { c.fillStyle = rgba(ink, 0.6 * iA); for (let q = tx; q < tx + tw - 1; q += 3) c.fillRect(Math.round(q), g.cr(ty + 6, 1) - 0.5, 1.4, 1); }
  if (vm.count) {
    c.font = SERIF(11, 700); const bw = Math.min(spec.text.width('badge', vm.count), textWidth(c, vm.count)) + 7; const px = tx + tw + spec.badgeGap;
    rr(c, px, ty - 6, bw, 12, 6); c.fillStyle = rgba(side === 'mixed' ? ink : sc, wA); c.fill(); c.strokeStyle = rgba(ink, 0.85 * oA); c.lineWidth = 0.9; c.stroke();
    c.fillStyle = rgba(side === 'mixed' ? '#f7f0dd' : onColor(g, sc), iA); c.textAlign = 'left'; c.fillText(vm.count, px + 3.5, ty + 0.7);
  }

  // right column: the corps medallion (Union badge, Confederate numeral) and, below it, the posture mark
  const rcx = r.x + r.w - 7.5; const lodB = g.at(P['lod.badge'], P['lod.span']);
  if (lodB > 0.01 && (vm.badge || vm.csa)) {
    const rad = P['badge.size']; const my = r.y + fw + 1.6 + rad;
    withAlpha(c, base, lodB * iA, () => {
      if (vm.badge) corpsBadge(c, vm.badge, rcx, my, rad, { fill: P[DIV[vm.divColour] || 'color.parchmentOld'], edge: ink, lw: 0.9 });
      else { c.beginPath(); c.arc(rcx, my, rad, 0, 6.283); c.fillStyle = P['color.parchment']; c.fill(); c.strokeStyle = ink; c.lineWidth = 0.9; c.stroke(); c.fillStyle = ink; c.font = SERIF(vm.csa.length > 2 ? 6.2 : 8, 700); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(vm.csa, rcx, my + 0.6); c.textAlign = 'left'; }
    });
  }
  const gh = P['gauge.height']; const gy = g.cr(r.y + r.h - fw - 1.5 - gh, 0); const py = gy + gh / 2;
  const lod = g.at(P['lod.posture'], P['lod.span']);
  if (vm.ech === 1) echelonMarks(c, 1, rcx, py - 0.6, 3.1, { ink: rgba(ink, 0.9), lw: 1.3 });
  if (lod > 0.01) {
    const pc = g.cat('posture', vm.posture, P['motion.crossMs']);
    const mark = (p, k) => withAlpha(c, base, k * lod * iA, () => postureMark(c, p, rcx, py - 0.6, 2.7, { ink: rgba(ink, P['ink.modelled']), lw: 1.2 }));
    if (pc.from !== null) { mark(pc.from, 1 - pc.m); mark(pc.to, pc.m); } else mark(vm.posture, 1);
  }

  // strength: a pencilled band (dotted outline, wash fill) with an inked end mark: Modelled, so never as firm as the order of battle
  const gx0 = Math.round(tx); const gx1 = Math.round(r.x + r.w - 13); const gl = gx1 - gx0;
  if (gl > 8) {
    c.setLineDash([P['pencil.dash'] * 0.7, P['pencil.dash'] * 0.9]); c.strokeStyle = rgba(ink, 0.6 * oA); c.lineWidth = 1; c.strokeRect(gx0 + 0.5, gy + 0.5, gl - 1, gh - 1); c.setLineDash([]);
    c.fillStyle = rgba(sc, Math.min(1, 0.55 + 0.45 * P['ink.modelled']) * wA); c.fillRect(gx0, gy, gl * vm.ratio, gh);
    if (vm.ratio > 0.02 && vm.ratio < 0.995) { c.fillStyle = rgba(ink, 0.9 * iA); c.fillRect(Math.round(gx0 + gl * vm.ratio) - 0.5, gy - 1, 1, gh + 2); }
  }

  // selection: a gilt ring in the margin, ink outside it
  if (g.sel > 0.003) {
    rr(c, -hw + 0.5, -hh + 0.5, g.w - 1, g.h - 1, 3.4); c.strokeStyle = rgba(ink, 0.8 * g.sel); c.lineWidth = 1; c.stroke();
    rr(c, -hw + 1.5, -hh + 1.5, g.w - 3, g.h - 3, 2.8); c.strokeStyle = g.col('color.accent', g.sel); c.lineWidth = 1; c.stroke();
  }
}

function label(c, t, g) {
  const L = t.label; const lw = L.x1 - L.x0; const lh = L.y1 - L.y0; const sc = sideHex(g, t.side === 'mixed' ? 'union' : t.side); const ink = g.P['color.ink'];
  rr(c, 0.5, 0.5, lw - 1, lh - 1, 2); c.fillStyle = g.col('color.parchment', 0.95); c.fill(); c.strokeStyle = rgba(ink, 0.85); c.lineWidth = 1; c.stroke();
  c.fillStyle = rgba(sc, 1); c.fillRect(1, 1, 3, lh - 2);
  c.font = SERIF(13, 600, true); c.textBaseline = 'middle'; c.fillStyle = ink;
  g.text(c, L.text, g.env.spec.labelPadX + 1, lh / 2 + 0.7, lw - g.env.spec.labelPadX * 2 - 1, 'left');
}
function pin(c, t, g) { const a = pinFade(t); if (a < 0.02) return; const b0 = c.globalAlpha; c.globalAlpha = b0 * a; const sc = sideHex(g, t.side === 'mixed' ? 'union' : t.side); const ink = g.P['color.ink']; c.beginPath(); c.arc(0, 0, 2.2, 0, 6.283); c.fillStyle = rgba(sc, 1); c.fill(); c.strokeStyle = ink; c.lineWidth = 1; c.stroke(); c.globalAlpha = b0; }
function leader(c, t, g, a, b) { c.setLineDash([1.6, 1.8]); c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.strokeStyle = rgba(g.P['color.ink'], 0.85); c.lineWidth = 1; c.stroke(); c.setLineDash([]); }
function hull(c, t, g, pts) { const sc = sideHex(g, t.side === 'mixed' ? 'union' : t.side); c.strokeStyle = rgba(sc, 1); c.lineWidth = 1.1; c.lineCap = 'round'; for (const p of pts) { c.beginPath(); c.moveTo(p[0] - 1.8, p[1] - 1.8); c.lineTo(p[0] + 1.8, p[1] + 1.8); c.moveTo(p[0] + 1.8, p[1] - 1.8); c.lineTo(p[0] - 1.8, p[1] + 1.8); c.stroke(); } }

function sample(c, ch, v, g, w, h) {
  const P = g.P; const ink = P['color.ink']; const x = -w / 2 + 0.5; const y = -h / 2 + 0.5; const W = w - 1; const H = h - 1;
  const sideOf = (s) => (s === 'confederate' ? P['color.confederate'] : s === 'unknown' ? P['color.unknown'] : P['color.union']);
  const tablet = (dashed) => { rr(c, x, y, W, H, 1.6); c.fillStyle = P['color.parchment']; c.fill(); if (dashed) c.setLineDash([2, 1.6]); rr(c, x + 0.7, y + 0.7, W - 1.4, H - 1.4, 1.4); c.strokeStyle = ink; c.lineWidth = 1.3; c.stroke(); c.setLineDash([]); };
  const fl = (side, hex, fx = -6.5, fy = -3.6, fwid = 13, fh = 7.2) => { flag(c, side, fx, fy, fwid, fh, 3); c.fillStyle = hex; c.fill(); c.strokeStyle = ink; c.lineWidth = 0.8; c.stroke(); };
  const U = P['color.union']; const fgU = onColor(g, U);
  switch (ch) {
    case 'side': tablet(); if (v === 'mixed') { c.save(); c.beginPath(); c.rect(-7, -5, 7, 10); c.clip(); fl('union', U); c.restore(); c.save(); c.beginPath(); c.rect(0, -5, 8, 10); c.clip(); fl('union', P['color.confederate']); c.restore(); } else { fl(v, sideOf(v)); if (v === 'unknown') { c.save(); c.beginPath(); c.rect(x, y, W, H); c.clip(); c.strokeStyle = rgba(P['color.unknown'], 0.5); c.lineWidth = 1; c.beginPath(); for (let k = -H; k < W; k += 3.5) { c.moveTo(x + k, y + H); c.lineTo(x + k + H, y); } c.stroke(); c.restore(); } } break;
    case 'arm': tablet(); fl('union', U); if (v === 'formation') echelonMarks(c, 2, -2.4, 0, 4.4, { ink: fgU, lw: 1.3 }); else armGlyph(c, v, -2.4, 0, 3.4, { ink: fgU, lw: 1.3 }); break;
    case 'armState': tablet(); fl('union', U); armGlyph(c, v === 'mounted' || v === 'dismounted' ? 'cavalry' : 'artillery', -2.4, 0, 3.2, { ink: fgU, lw: 1.2 }, v); break;
    case 'echelon': tablet(); fl('union', U); if (v === 1) echelonMarks(c, 1, -2.4, 0, 3.4, { ink: fgU, lw: 1.2 }); else echelonMarks(c, v, -2.4, 0, 4.2, { ink: fgU, lw: 1.3 }, 9); break;
    case 'posture': tablet(); postureMark(c, v, 0, 0, 3.4, { ink: rgba(ink, P['ink.modelled']), lw: 1.3 }); break;
    case 'strength': { tablet(); c.setLineDash([1.4, 1.4]); c.strokeStyle = rgba(ink, 0.6); c.lineWidth = 1; c.strokeRect(-6.5, -2, 13, 4); c.setLineDash([]); c.fillStyle = rgba(U, 0.85); c.fillRect(-6, -1.5, 12 * v, 3); c.fillStyle = ink; c.fillRect(-6 + 12 * v - 0.5, -2.5, 1, 5); break; }
    case 'fix': { c.fillStyle = v === 'carried' ? P['color.parchmentOld'] : P['color.parchment']; c.fillRect(x, y, W, H); c.strokeStyle = ink; c.lineWidth = 1.5; if (v === 'carried') c.setLineDash([1.8, 2.3]); c.beginPath(); c.moveTo(x + 1, 0); c.lineTo(x + W - 1, 0); c.stroke(); c.setLineDash([]); break; }
    case 'transit': tablet(); fl('union', U); c.fillStyle = rgba(ink, 0.8); for (let i = -1; i <= 1; i++) { c.beginPath(); c.arc(-2.4 + i * 3, 4.6, 0.7, 0, 6.283); c.fill(); } break;
    case 'idOnly': tablet(); c.fillStyle = ink; c.font = SERIF(8.5, 700); c.textBaseline = 'middle'; c.textAlign = 'center'; c.fillText('10 AL', 0, -1); c.fillStyle = rgba(ink, 0.65); for (let xx = -6; xx < 6; xx += 3) c.fillRect(xx, 3.2, 1.4, 1); break;
    case 'aggregate': tablet(); rr(c, -5.5, -3.4, 11, 6.8, 3.4); c.fillStyle = U; c.fill(); c.strokeStyle = ink; c.lineWidth = 0.8; c.stroke(); c.fillStyle = fgU; c.font = SERIF(7.5, 700); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('×4', 0, 0.4); break;
    case 'corpsBadge': tablet(); corpsBadge(c, v, 0, 0, 4.4, { fill: P['color.parchmentOld'], edge: ink, lw: 1 }); break;
    case 'divColour': tablet(); corpsBadge(c, 'sphere', 0, 0, 4.4, { fill: P[DIV[v]], edge: ink, lw: 0.9 }); break;
    case 'corpsText': tablet(); c.beginPath(); c.arc(0, 0, 4.6, 0, 6.283); c.fillStyle = P['color.parchment']; c.fill(); c.strokeStyle = ink; c.lineWidth = 0.9; c.stroke(); c.fillStyle = ink; c.font = SERIF(7.5, 700); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('II', 0, 0.5); break;
    case 'selection': tablet(); rr(c, x - 0.5, y - 0.5, W + 1, H + 1, 2.4); c.strokeStyle = P['color.accent']; c.lineWidth = 1.6; c.stroke(); break;
    case 'pin': c.setLineDash([1.6, 1.8]); c.beginPath(); c.moveTo(-6, 3); c.lineTo(4, -2); c.strokeStyle = ink; c.lineWidth = 1; c.stroke(); c.setLineDash([]); c.beginPath(); c.arc(-6, 3, 2.2, 0, 6.283); c.fillStyle = U; c.fill(); c.strokeStyle = ink; c.stroke(); break;
    default: return false;
  }
  return true;
}

export const MAP_1863 = defineFamily({
  id: 'map-1863', label: '1863 Map', version: '1.0', footprint: FOOT, fonts: FONTS, tokens: M63_TOKENS,
  channels: { side: true, arm: true, armState: true, echelon: true, posture: true, strength: true, fix: true, transit: true, idOnly: true, aggregate: true, corpsBadge: true, divColour: true, corpsText: true, selection: true, pin: true },
  fallbackSwatch: '#2a4b8f', draw: { tile, label, pin, leader, hull }, sample,
}, M63_VARIANTS);
