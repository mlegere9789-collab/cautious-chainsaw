// skins/standards.mjs - OPTION A "STANDARDS".  A unit is a STANDARD PLANTED IN THE GROUND at its true place: a slim cream pole standing on a foot, a small flag in the side's colour flying from its top, a soft shadow on the
// ground.  Nothing else.  The mark IS one object:
//   * side   = the cloth colour AND the way it flies (a Union flag flies right, a Confederate flag flies left: the armies face each other, so the side survives a grey print and a colour-blind eye);
//   * arm    = the end of the cloth (a regiment: square-ended; cavalry: swallow-tailed, like a guidon; artillery: arrow-ended); a formation record makes no arm claim (square);
//   * rank   = the pole and the flag, together (regiment < brigade < division < corps): the scale hierarchy is height, never a box;
//   * strength = a slim bar under a regiment flag from the full zoom (MODELLED: the placement strength over the unit's reference, not a casualty record);
//   * a fix a battle day old or more = the cloth hollows into tinted glass with a light edge (the hue stays, never grey);
//   * a crowd that cannot all stand on its own place merges into ONE larger standard whose flag carries the count and whose words say what the units share.
// Below the full zoom (15) a unit is a small side-and-arm mark (no lettering); from 15 it is full (a taller pole, its short code, the strength bar); selected, hovered or close up the SAME mark grows its name.  Selection is a
// ring lying on the ground round the foot.  (ANIM: the casualty-memory ground marks of the approved look are not part of this build.)  What each pixel claims, and how well it is known, is in skins/semantics.mjs and the legend this file draws.
import { defineFamily, ss, skinKit } from './kit.mjs';
import { FONTS } from './semantics.mjs';
import { STD_TOKENS, STD_VARIANTS } from './standards.spec.mjs';
import { TAU, sideOf, sgnOf, infoOfUnit, infoOfAgg, infoOfTile, wideScreen, textShown, detailOf, lettering, putText, rgba, mixHex, clamp01, isLight, wrapText, codeOf, compactName } from './common.mjs';

export const FOOT = { chipH: 24, chipMinW: 10, ring: 3, pinHalf: 2.6 };
export { sgnOf, codeOf, compactName };

/** the size class of a mark: 0 unit, 1 brigade (and every crowd of mixed or scattered units), 2 division, 3 corps */
const classOf = (info) => (!info.flag ? 0 : info.ech >= 3 ? 3 : info.ech === 2 ? 2 : 1);
const POLE = ['pole.unit', 'pole.brigade', 'pole.division', 'pole.corps'];
const FLAGW = ['flag.unitW', 'flag.brigadeW', 'flag.divisionW', 'flag.corpsW']; const FLAGH = ['flag.unitH', 'flag.brigadeH', 'flag.divisionH', 'flag.corpsH'];
const endOf = (info) => (info.flag ? 'rect' : info.arm === 'cavalry' ? 'swallow' : info.arm === 'artillery' ? 'point' : 'rect');

/** pole height and flag size of a mark */
function dims(P, info, full, T, codeOn) {
  const k = classOf(info);
  if (k === 0) {
    if (!full) return { H: P['pole.unit'], fw: P['flag.unitW'], fh: P['flag.unitH'], k };
    const fh = P['flag.unitFullH']; const nPx = endOf(info) === 'rect' ? 0 : fh * P['flag.notch'];       // from the full zoom the short code stands ON the cloth, and the cloth is as long as the code needs
    const fw = codeOn ? Math.max(P['flag.unitFullW'], Math.ceil(T.width(info.idOnly ? 'codeI' : 'code', info.short) + 2 * P['flag.padX'] + nPx)) : P['flag.unitFullW'];
    return { H: P['pole.unitFull'], fw, fh, k };
  }
  let fw = P[FLAGW[k]]; let fh = P[FLAGH[k]];
  if (info.count != null) { fh = Math.max(fh, P['flag.crowdMinH']); fw = Math.max(fw, Math.ceil(T.width('code', info.count) + 2 * P['flag.padX'])); }
  return { H: P[POLE[k]], fw, fh, k };
}
const selRxOf = (P, H) => Math.max(P['sel.rx'], H * 0.36);

/** the geometry of a mark: one function used by the layout (the footprint) and by the drawing, so the two cannot disagree.  The origin is the FOOT of the pole (the unit's true position); x runs in the direction the
 *  mark reads (+ for Union, - for Confederate, mirrored for drawing); `dx`, `dy` say where the box centre lies from the foot, so the layout hangs the box on the true position. */
export function plan(spec, P, info, z, sel) {
  const T = spec.text; const R = spec.ring; const D = detailOf(z, P); const txt = textShown(info, z, P, sel); const sgn = sgnOf(info.side); const full = D.full || (sel && z >= P['detail.selectGrowZoom']);
  const codeOn = !info.flag && full && txt; const dm = dims(P, info, full, T, codeOn); const { H, fw, fh, k } = dm; const font = info.flag ? 'form' : (info.idOnly ? 'codeI' : 'code');
  let showName = false; let text = ''; let textW = 0;
  if (!info.flag) { const grow = sel && wideScreen(P) && z >= P['detail.selectGrowZoom']; showName = !!info.name && (D.uname || grow) && full; text = showName ? info.name : ''; textW = showName ? T.width('code', text) : 0; }      // a unit: its code is on the flag; only its full name stands beside it
  else { text = txt ? (info.name || info.short) : ''; textW = txt ? T.width('form', text) : 0; }
  const beside = !!text;
  const bar = !info.flag && full && P['strength.bar'] > 0.5; const barH = bar ? P['strength.gap'] + P['strength.h'] : 0;
  const rx = selRxOf(P, H); const ry = rx * P['sel.ratio']; const shR = P['shadow.rx'];
  const leftExt = Math.max(P['pole.width'] / 2 + 1, rx, shR * 0.6) + R;                                  // the side the cloth does not fly to
  const rightExt = Math.max(fw + (beside ? P['flag.gap'] + textW : 0), rx, shR) + R;                          // the side it flies to
  const top = H + R + 1; const bottom = Math.max(ry, P['shadow.rx'] * 0.34, P['foot.r']) + R + 1;
  const w = Math.ceil(leftExt + rightExt); const h = Math.ceil(top + bottom); void barH;
  const cx = sgn * (rightExt - leftExt) / 2; const cy = (bottom - top) / 2;                                // the box centre, from the foot
  return { flag: info.flag, sgn, txt, beside, codeOn, font, text, textW, showName, full, H, fw, fh, k, bar, rx, ry, w, h, dx: cx, dy: cy, leftExt, rightExt, top, bottom, D, near: leftExt };
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

// ---- colour helpers --------------------------------------------------------------------------------------------------------------------------------------------------------
const sideCloth = (P, side) => (side === 'union' ? P['color.union'] : side === 'confederate' ? P['color.confederate'] : P['color.unknown']);
const sideBright = (P, side) => (side === 'union' ? P['color.unionBright'] : side === 'confederate' ? P['color.confederateBright'] : P['color.select']);
const tintHex = (P, side) => (side === 'union' ? P['color.tintUnion'] : side === 'confederate' ? P['color.tintConfederate'] : side === 'unknown' ? P['color.tintUnknown'] : P['color.tintMixed']);
const easeOut = (x) => 1 - (1 - clamp01(x)) ** 3;

/** the outline of the cloth, from the pole at (x, y): length w, height h; end = 'rect' | 'swallow' | 'point'; a slow wave runs along it when it is long enough to show one */
function clothPath(c, x, y, w, h, end, notch, wave) {
  const wv = w >= 12 ? wave : 0; const N = wv ? 8 : 1; const off = (u) => wv * Math.sin(u * 5.2) * (0.25 + 0.75 * u) * 0.6;
  c.beginPath(); c.moveTo(x, y);
  if (end === 'point') { c.lineTo(x + w - notch, y); c.lineTo(x + w, y + h / 2); c.lineTo(x + w - notch, y + h); c.lineTo(x, y + h); c.closePath(); return; }      // an arrow-ended cloth: artillery
  for (let i = 1; i <= N; i++) { const u = i / N; c.lineTo(x + w * u, y + off(u)); }
  if (end === 'swallow') { c.lineTo(x + w - notch, y + h / 2 + off(1) * 0.5); c.lineTo(x + w, y + h + off(1)); } else c.lineTo(x + w, y + h + off(1));
  for (let i = N - 1; i >= 0; i--) { const u = i / N; c.lineTo(x + w * u, y + h + off(u)); }
  c.closePath();
}

function hatch(c, cx, cy, r, P, a) {
  c.save(); c.clip(); c.strokeStyle = isLight(P['color.unknown']) ? rgba(P['color.poleEdge'], 0.55 * a) : rgba(P['color.halo'], 0.6 * a); c.lineWidth = 1; c.beginPath();
  for (let q = -2 * r; q < 2 * r; q += 3) { c.moveTo(cx + q - r, cy + r); c.lineTo(cx + q + r, cy - r); } c.stroke(); c.restore();
}

/** one planted standard, drawn in the mirrored frame: the foot at (0, 0), the pole rising to y = -H, the cloth flying to +x.  old 0 fresh .. 1 carried forward; furl 0..1 the cloth unfurls on arrival */
function drawStandard(c, P, o) {
  const { side, H, fw, fh, end, old, furl, k } = o; const pips = o.pips || 0; const base = c.globalAlpha; const hollow = old * P['carried.hollow']; const cloth = side === 'mixed' ? P['color.union'] : sideCloth(P, side); const bright = side === 'mixed' ? P['color.unionBright'] : sideBright(P, side);
  const pw = P['pole.width'] * (k >= 2 ? 1.12 : 1); const shade = P['shadow.alpha'];
  // the ground shadow: lit from the north-west (like the relief), so it falls to the south-east
  c.save(); c.translate(1.2, 0.7); c.scale(1, 0.36); c.beginPath(); c.arc(0, 0, P['shadow.rx'] * (0.62 + 0.38 * Math.min(1.2, H / 26)), 0, TAU); c.fillStyle = rgba('#000000', shade); c.fill(); c.restore();
  c.save(); c.beginPath(); c.moveTo(0.4, -1); c.lineTo(0.4 + H * 0.2, 0.9 + H * 0.045); c.lineWidth = Math.max(1, pw * 0.8); c.lineCap = 'round'; c.strokeStyle = rgba('#000000', shade * 0.55); c.stroke(); c.restore();
  // the pole: a dark line first (so it holds over pale fields and roads), then the cream pole
  c.lineCap = 'butt'; c.beginPath(); c.moveTo(0, -P['foot.r'] * 0.5); c.lineTo(0, -H); c.strokeStyle = rgba(P['color.poleEdge'], P['pole.edgeAlpha']); c.lineWidth = pw + 1.5; c.stroke();
  c.beginPath(); c.moveTo(0, -P['foot.r'] * 0.5); c.lineTo(0, -H); c.strokeStyle = mixHex(P['color.pole'], bright, hollow * 0.55); c.lineWidth = pw; c.stroke();
  // the cloth
  const w = Math.max(1, fw * furl); const x0 = pw / 2 - 0.2; const y0 = -H; const notch = fh * P['flag.notch']; const wave = P['flag.wave'] * Math.min(1, w / 18);
  const rw = P['flag.edge'] + (P['flag.edgeHollow'] - P['flag.edge']) * hollow;
  clothPath(c, x0, y0, w, fh, end, Math.min(notch, w * 0.45), wave); c.fillStyle = rgba(P['color.poleEdge'], 0.55); c.lineWidth = rw + 1.6; c.strokeStyle = rgba(P['color.poleEdge'], P['pole.edgeAlpha'] * 0.85); c.lineJoin = 'round'; c.stroke();
  clothPath(c, x0, y0, w, fh, end, Math.min(notch, w * 0.45), wave); c.fillStyle = mixHex(P['color.edge'], bright, hollow); c.fill();
  c.save(); const ins = rw; clothPath(c, x0 + ins * 0.2, y0 + ins, Math.max(1, w - ins * 1.2), fh - 2 * ins, end, Math.min(notch, w * 0.4), wave * 0.8); c.clip();
  const bx = x0 - 1; const bw = w + 2;
  if (side === 'mixed') { c.fillStyle = P['color.union']; c.fillRect(bx, y0 - 2, bw, fh + 4); const a = x0 + w * 0.62; const b2 = x0 + w * 0.34; c.beginPath(); c.moveTo(a, y0 - 2); c.lineTo(x0 + w + 2, y0 - 2); c.lineTo(x0 + w + 2, y0 + fh + 2); c.lineTo(b2, y0 + fh + 2); c.closePath(); c.fillStyle = P['color.confederate']; c.fill(); }
  else { c.fillStyle = cloth; c.fillRect(bx, y0 - 2, bw, fh + 4); }
  if (hollow > 0.01) { c.globalAlpha = base * hollow; c.fillStyle = rgba(P['color.glass'], P['carried.glass']); c.fillRect(bx, y0 - 2, bw, fh + 4); c.fillStyle = rgba(bright, P['carried.tint']); c.fillRect(bx, y0 - 2, bw, fh + 4); c.globalAlpha = base; }
  if (side === 'unknown') hatch(c, x0 + w / 2, y0 + fh / 2, w / 2 + 2, P, 1);
  if (P['flag.shade'] > 0 && w > 8) { const gr = c.createLinearGradient(x0, 0, x0 + w, 0); gr.addColorStop(0, `rgba(255,255,255,${P['flag.shade'] * 0.5})`); gr.addColorStop(0.55, 'rgba(255,255,255,0)'); gr.addColorStop(1, `rgba(0,0,0,${P['flag.shade']})`); c.fillStyle = gr; c.fillRect(bx, y0 - 2, bw, fh + 4); }
  c.restore(); c.globalAlpha = base;
  // the rank pips: one, two, three cloth-coloured studs in a row, centred on the cloth of a brigade, division or corps flag (a derived rank mark, never insignia); ink on a hollow flag, as the lettering is
  if (pips > 0 && w > 10) {
    const pr = P['rank.pip']; const gap = P['rank.pipGap']; const cx0 = x0 + w / 2; const cy0 = y0 + fh / 2; const ink = mixHex(P['color.numeral'], P['color.ink'], 0); const holl = ss(0.42, 0.58, hollow);
    for (let i = 0; i < pips; i++) {
      const px = cx0 + (i - (pips - 1) / 2) * gap;
      c.beginPath(); c.arc(px, cy0, pr + 1, 0, TAU); c.fillStyle = rgba(P['color.poleEdge'], 0.62 * (1 - holl)); c.fill();
      c.beginPath(); c.arc(px, cy0, pr, 0, TAU); c.fillStyle = holl > 0.5 ? P['color.ink'] : ink; c.fill();
    }
  }
  // the finial and the foot
  c.beginPath(); c.arc(0, -H, pw * 0.85, 0, TAU); c.fillStyle = mixHex(P['color.pole'], bright, hollow * 0.55); c.fill();
  const fr = P['foot.r']; c.beginPath(); c.arc(0, 0, fr + 1, 0, TAU); c.fillStyle = rgba(P['color.poleEdge'], 0.75); c.fill(); c.beginPath(); c.arc(0, 0, fr, 0, TAU); c.fillStyle = mixHex(P['color.pole'], bright, hollow * 0.7); c.fill();
  return { x0, w };
}

function groundRing(c, P, rx, ry, col, k, w) {
  c.beginPath(); c.ellipse(0, 0, rx, ry, 0, 0, TAU); c.strokeStyle = rgba(P['color.poleEdge'], 0.85 * k); c.lineWidth = w + 2.4; c.stroke(); c.strokeStyle = rgba(col, k); c.lineWidth = w; c.stroke();
}

// ---- the tile ----------------------------------------------------------------------------------------------------------------------------------------------------------------
function tile(c, t, g) {
  const P = g.P; const vm = g.vm; const spec = g.env.spec; const info = infoOfTile(t); const side = info.side; const sel = !!t.selected;
  const pl = plan(spec, P, info, g.zoom, sel && t.grown !== false); const hw = g.hw; const old = vm.carried; const base = c.globalAlpha; const sgn = pl.sgn; const enter = easeOut(g.enter);
  const lo = -hw + 0.5; const hi = hw - 0.5; const textAlpha = 1 - old * (1 - P['text.dimAlpha']);
  const fx = -pl.dx; const fy = -pl.dy;                                                        // the foot: the unit's true position, in box coordinates
  const ringCol = side === 'mixed' ? sideBright(P, 'union') : sideBright(P, side); const nm = g.ease('name', !pl.flag && pl.showName ? 1 : 0, 180);
  const fhNow = g.ease('fh', pl.fh, 140); const Hnow = g.ease('H', pl.H, 140);                    // the pole and the flag grow into the full size over 140 ms (a zoom through 15 never pops)
  const arm = vm.arm === 'cavalry' || vm.arm === 'artillery' ? vm.arm : 'infantry';
  c.save(); c.translate(fx, fy); c.scale(sgn, 1);
  const stdInfo = { side, H: Hnow, fw: pl.fw, fh: fhNow, end: pl.flag ? 'rect' : (arm === 'cavalry' ? 'swallow' : arm === 'artillery' ? 'point' : 'rect'), old, furl: Math.max(0.3, enter), k: pl.k, pips: pl.flag && info.count == null ? pl.k : 0 };
  c.globalAlpha = base * (0.6 + 0.4 * enter); drawStandard(c, P, stdInfo); c.globalAlpha = base;
  c.restore();
  const fy0 = fy - Hnow; const fcy = fy0 + fhNow / 2;                                            // the middle of the cloth, in box coordinates
  // the words ON the cloth: the count of a crowd, or the short code of a unit from the full zoom.  White on the cloth, ink on the glass (the change is a narrow band in the middle of the age range)
  const onFlag = pl.flag ? (info.count != null ? info.count : null) : (pl.codeOn ? info.short : null); const tk = g.ease('txt', pl.txt ? 1 : 0, 160);
  if (onFlag) {
    const pw = P['pole.width']; const nPx = stdInfo.end === 'rect' ? 0 : Math.min(fhNow * P['flag.notch'], pl.fw * 0.45); const mid = fx + sgn * (pw / 2 - 0.2 + (pl.fw - nPx) / 2); const hol = ss(0.42, 0.58, old * P['carried.hollow']); const b = c.globalAlpha; const by = g.cr(fcy + P['code.baseline'] - 0.2, 0); const face = pl.flag ? FONTS.code : FONTS[pl.font]; const vis = pl.flag ? 1 : tk;
    if (hol < 0.99) { const sp = lettering(g, face, onFlag, P['color.numeral'], P['color.numeralHalo'], 0); c.globalAlpha = b * ss(0.4, 1, g.enter) * (1 - hol) * vis; c.drawImage(sp.img, mid - sp.tw / 2 - sp.x, by - sp.y, sp.w, sp.h); }
    if (hol > 0.01) { const sp = lettering(g, face, onFlag, P['color.ink'], P['color.halo'], 0); c.globalAlpha = b * ss(0.4, 1, g.enter) * hol * vis; c.drawImage(sp.img, mid - sp.tw / 2 - sp.x, by - sp.y, sp.w, sp.h); }
    c.globalAlpha = b;
  }
  // the strength bar under a regiment flag (MODELLED)
  if (pl.bar && !pl.flag) {
    const bw = pl.fw; const by = fy0 + fhNow + P['strength.gap']; const bh = P['strength.h']; const x0 = fx + sgn * (P['pole.width'] / 2 + 0.6); const bx = sgn > 0 ? x0 : x0 - bw; const r = Math.max(0.5, vm.ratio);
    const b = c.globalAlpha; c.globalAlpha = b * ss(0.3, 1, g.enter); c.beginPath(); c.rect(bx - 0.6, by - 0.6, bw + 1.2, bh + 1.2); c.fillStyle = rgba(P['color.poleEdge'], P['strength.track']); c.fill();
    const fw2 = bw * r; const fxx = sgn > 0 ? bx : bx + bw - fw2; c.fillStyle = sideBright(P, side === 'mixed' ? 'union' : side); c.fillRect(fxx, by, fw2, bh); c.globalAlpha = b;
  }
  // the words beside the flag: a formation's or crowd's name; a unit's full name when it is close up or selected
  const textX = fx + sgn * (P['pole.width'] / 2 + pl.fw + P['flag.gap']); const baseY = g.cr(fcy + P['code.baseline'] - 0.2, 0);
  if (!pl.flag) {
    if (info.name && nm > 0.01) putText(c, g, FONTS.code, info.name, textX, baseY, P['color.ink'], ss(0.3, 0.9, nm) * P['name.alpha'] * textAlpha, sgn, lo, hi);
  } else if (pl.text && tk > 0.01) {
    const mw = lettering(g, FONTS.form, pl.text, tintHex(P, side)).tw; putText(c, g, FONTS.form, pl.text, sgn > 0 ? textX : textX - mw, baseY, tintHex(P, side), textAlpha * ss(0.25, 1, g.enter) * tk, 1, lo, hi);
  }
  // selection and hover: a ring lying on the ground round the foot
  c.save(); c.translate(fx, fy);
  if (g.hov > 0.01 && g.sel < 0.5) groundRing(c, P, pl.rx, pl.ry, ringCol, 0.7 * g.hov, P['hover.width']);
  if (g.sel > 0.003) groundRing(c, P, pl.rx, pl.ry, ringCol, g.sel, P['sel.width']);
  c.restore(); c.globalAlpha = base;
}

// ---- pin, leader, hull: drawn only for the mark that is hovered or selected -------------------------------------------------------------------------------------------------
/** where the foot of this mark stands in screen coordinates, given the box centre b */
function standing(t, g, b) { const pl = plan(g.env.spec, g.P, infoOfTile(t), g.zoom, !!t.selected && t.grown !== false); return [b[0] - pl.dx, b[1] - pl.dy]; }
const isOn = (t) => !!t.selected || skinKit.hover() === t.key;
function pin(c, t, g) {
  if (!isOn(t)) return; const P = g.P; const r = P['pin.r']; const base = c.globalAlpha; { const pl = plan(g.env.spec, P, infoOfTile(t), g.zoom, !!t.selected && t.grown !== false); c.translate(-pl.dx, -pl.dy); }      // the renderer puts the origin on the true place of the box CENTRE; the unit stands at the true place of the FOOT
  const side = sideOf(g.vm.side === 'mixed' ? 'union' : g.vm.side);
  c.beginPath(); c.arc(0, 0, r + 1.2, 0, TAU); c.fillStyle = rgba(P['color.poleEdge'], 0.75); c.fill(); c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fillStyle = P['color.pole']; c.fill();
  c.beginPath(); c.arc(0, 0, Math.max(0.6, r - 1.15), 0, TAU); c.fillStyle = sideCloth(P, side); c.fill(); c.globalAlpha = base;
}
function leader(c, t, g, a, b) {
  if (!isOn(t)) return; const P = g.P; const e = standing(t, g, b); if (Math.hypot(e[0] - a[0], e[1] - a[1]) < 3.5) return; const base = c.globalAlpha; c.globalAlpha = base * P['leader.alpha']; c.lineCap = 'round';
  c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(e[0], e[1]); c.strokeStyle = rgba(P['color.poleEdge'], 0.6); c.lineWidth = P['leader.width'] + 1.6; c.stroke();
  c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(e[0], e[1]); c.strokeStyle = sideBright(P, sideOf(g.vm.side === 'mixed' ? 'union' : g.vm.side)); c.lineWidth = P['leader.width']; c.stroke(); c.globalAlpha = base;
}
function hull(c, t, g, pts) {
  const P = g.P; if (g.zoom < P['detail.hullZoom'] || !pts.length || !isOn(t)) return;
  const view = g.env.view || { dx: 0, dy: 0 }; const e0 = standing(t, g, [t.x + view.dx, t.y + view.dy]); const base = c.globalAlpha; const side = sideOf(g.vm.side); c.lineCap = 'round'; c.beginPath();
  const LMAX = P['hull.maxLen'];      // director fix 11: a hairline never runs further than this; a member that stands further off is shown by its dot alone (no spider of long lines across the map)
  for (const p of pts) { const dx = p[0] - e0[0]; const dy = p[1] - e0[1]; const d = Math.hypot(dx, dy); const k = d > LMAX ? LMAX / d : 1; c.moveTo(e0[0], e0[1]); c.lineTo(e0[0] + dx * k, e0[1] + dy * k); }
  c.globalAlpha = base * P['hull.leader']; c.strokeStyle = rgba(P['color.poleEdge'], 0.6); c.lineWidth = 2.4; c.stroke(); c.strokeStyle = tintHex(P, side); c.lineWidth = 0.9; c.stroke();
  c.globalAlpha = base * 0.95; const r = P['hull.dot'];
  for (const p of pts) { c.beginPath(); c.arc(p[0], p[1], r + 1, 0, TAU); c.fillStyle = rgba(P['color.poleEdge'], 0.75); c.fill(); c.beginPath(); c.arc(p[0], p[1], r, 0, TAU); c.fillStyle = P['color.pole']; c.fill(); }
  c.globalAlpha = base;
}

// ---- the legend's swatches (26 x 20, centre at 0,0): the same drawing code ----------------------------------------------------------------------------------------------------
function swatch(c, P, side, k, o = {}) {      /* o.pips: rank pips on the cloth */ c.save(); c.translate(o.x ?? -5, 8); const info = { flag: k > 0, ech: k + 1, count: null, arm: o.arm || 'infantry' }; const H = o.H ?? 15; const fw = o.fw ?? 12; const fh = o.fh ?? 8.5; drawStandard(c, P, { side, H, fw, fh, end: o.end || 'rect', old: o.old || 0, furl: 1, k, pips: o.pips || 0 }); void info; c.restore(); }
function sample(c, ch, v, g, w, h) {
  const P = g.P;
  if (ch === 'side') { if (v === 'mixed') swatch(c, P, 'mixed', 1, { H: 16, fw: 13, fh: 9.5 }); else swatch(c, P, v, 0); }
  else if (ch === 'arm') { if (v === 'formation') swatch(c, P, 'union', 1, { H: 17, fw: 14, fh: 9.5, pips: 1 }); else if (v === 'infantry') swatch(c, P, 'union', 0); else if (v === 'cavalry') swatch(c, P, 'union', 0, { end: 'swallow' }); else if (v === 'artillery') swatch(c, P, 'union', 0, { end: 'point' }); else return false; }
  else if (ch === 'fix') swatch(c, P, 'union', 0, { old: v === 'carried' ? 1 : 0 });
  else if (ch === 'aggregate') { swatch(c, P, 'union', 1, { H: 17, fw: 15, fh: 11 }); c.font = FONTS.code; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = P['color.numeral']; c.fillText('5', 2.4, -2.6); }
  else if (ch === 'idOnly') { c.font = FONTS.codeI; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = P['color.ink']; c.fillText('12 NC', 0, 0.6); }
  else if (ch === 'selection') { swatch(c, P, 'union', 0); c.save(); c.translate(-5, 8); groundRing(c, P, 8.5, 3.6, P['color.unionBright'], 1, P['sel.width']); c.restore(); }
  else if (ch === 'facing') { swatch(c, P, 'union', 0, { x: -10, H: 11, fw: 8, fh: 6 }); c.save(); c.scale(-1, 1); swatch(c, P, 'confederate', 0, { x: -10, H: 11, fw: 8, fh: 6 }); c.restore(); }
  else if (ch === 'strength') { c.fillStyle = rgba(P['color.poleEdge'], P['strength.track'] + 0.3); c.fillRect(-9, -1.4, 18, P['strength.h']); c.fillStyle = P['color.unionBright']; c.fillRect(-9, -1.4, 18 * (v === 1 ? 1 : 0.4), P['strength.h']); }
  else return false;
}

// ---- the legend's figure: the anatomy of the marks at their true size, drawn with the same code as the map -----------------------------------------------------------------------
// Every state of a mark the map can draw is in it (director fix 4): a unit of each arm and of each side, the three ranks with their pips, a crowd of each side, of both armies and with the words that tell two crowds apart,
// fresh / carried forward / selected, the strength bar, the hatched flag of a unit whose side is Contested, and the ground marks.  It lays itself out for any width W (316 in the rail, the sheet's width on a phone).
function figure(c, g, W) {
  const P = g.P; const ink = P['color.ink']; const mute = rgba(ink, 0.78); const faint = rgba(ink, 0.16); const FACE = FONTS.name.replace(/^400 12px /, ''); const cap = `400 12px ${FACE}`; const lab = `600 12px ${FACE}`; const labB = `700 13px ${FACE}`; const title = `700 11px ${FACE}`;
  const M = 16; let y = 8; c.textBaseline = 'alphabetic'; c.textAlign = 'left';
  const word = (s, x, yy, font, col, align = 'left') => { c.font = font; c.fillStyle = col; c.textAlign = align; c.fillText(s, x, yy); c.textAlign = 'left'; };
  const head = (s) => { word(s, M, y + 11, title, rgba(ink, 0.62)); y += 20; };
  const caption = (text) => { c.font = cap; const lines = wrapText(c, text, W - 2 * M); c.fillStyle = mute; for (const ln of lines) { c.fillText(ln, M, y + 12); y += 17; } };
  const rule = () => { y += 6; c.strokeStyle = faint; c.lineWidth = 1; c.beginPath(); c.moveTo(M, y + 0.5); c.lineTo(W - M, y + 0.5); c.stroke(); y += 12; };
  const stand = (side, x, foot, o, mirror) => { c.save(); c.translate(x, foot); if (mirror) c.scale(-1, 1); drawStandard(c, P, { side, old: 0, furl: 1, ...o }); c.restore(); };
  const bl = P['code.baseline']; const colW = (W - 2 * M) / 2;           // two columns: the left cell starts at M + 8, the right at M + colW + 8
  const cell = (i) => M + 8 + (i % 2) * colW;
  const tint = (side) => (side === 'union' ? P['color.tintUnion'] : side === 'confederate' ? P['color.tintConfederate'] : side === 'unknown' ? P['color.tintUnknown'] : P['color.tintMixed']);
  // 1. a unit: pole, flag, code; the three arms, and a Confederate flag (it flies the other way); a 2 x 2 grid with the side named beside each flag
  head('A unit'); let foot = y + 34; const U = { H: P['pole.unitFull'], fh: P['flag.unitFullH'], k: 0 };
  const unitFlag = (side, text, x, end, mirror, name) => {            // the short code stands ON the cloth, which is as long as the code needs; a mirrored flag has its pole on the right of its cloth, so x is its LEFT edge there
    c.font = FONTS.code; const nPx = end === 'rect' ? 0 : U.fh * P['flag.notch']; const fw = Math.max(P['flag.unitFullW'], Math.ceil(c.measureText(text).width + 2 * P['flag.padX'] + nPx)); const pw = P['pole.width'];
    const px = mirror ? x - pw : x; x = mirror ? x - pw - fw : x; stand(side, px, foot, { ...U, fw, end }, mirror); const mid = px + (mirror ? -1 : 1) * (pw / 2 - 0.2 + (fw - nPx) / 2); const sp = lettering(g, FONTS.code, text, P['color.numeral'], P['color.numeralHalo'], 0); const by = foot - U.H + U.fh / 2 + bl - 0.2; c.drawImage(sp.img, mid - sp.tw / 2 - sp.x, by - sp.y, sp.w, sp.h);
    word(name, mirror ? x - 8 : px + fw + 10, foot - 3, lab, tint(side), mirror ? 'right' : 'left');      // x is now the flag's left edge
  };
  unitFlag('union', '71 PA', cell(0), 'rect', false, 'infantry'); unitFlag('union', '1 NJ', cell(1), 'swallow', false, 'cavalry');
  foot += 42; unitFlag('union', 'B/1 RI', cell(0), 'point', false, 'artillery'); unitFlag('confederate', '53 VA', W - M - 8, 'rect', true, 'Confederate');
  y += 96; caption('Square: infantry. Swallow-tail: cavalry. Arrow: artillery. The short code is on the flag. A flag flies toward the enemy: Union to the right, Confederate to the left. The foot of the pole is the unit.'); rule();
  // 2. rank
  head('Rank');
  foot = y + P['pole.corps'] + 4; const span = W - 2 * M - 16; const rx = [0, span * 0.28, span * 0.58];
  [[1, 'Bde'], [2, 'Div'], [3, 'Corps']].forEach(([k, text], i) => {
    const x = M + 8 + rx[i]; const H = P[POLE[k]]; const fw = P[FLAGW[k]]; const fh = P[FLAGH[k]];
    stand('union', x, foot, { H, fw, fh, end: 'rect', k, pips: k }, false); word(text, x + fw + 6, foot - H + fh / 2 + bl - 0.2, labB, P['color.tintUnion']);
  });
  y += P['pole.corps'] + 12; caption('A taller pole and a larger flag are a higher rank, and the pips on the cloth count it: one for a brigade, two for a division, three for a corps. Rank is height, never a box.'); rule();
  // 3. a crowd: of one army, of both, and with the words that tell two crowds apart
  head('A crowd'); foot = y + 36;
  const crowd = (x, side, n, words, mirror) => {
    c.font = lab; const fw = Math.max(30, Math.ceil(c.measureText(n).width + 2 * P['flag.padX'])); const fh = P['flag.crowdMinH']; const H = P['pole.brigade']; const fy = foot - H + fh / 2 + bl - 0.2; const px = mirror ? x - P['pole.width'] : x; if (mirror) x = x - P['pole.width'] - fw;
    stand(side, px, foot, { H, fw, fh, end: 'rect', k: 1 }, mirror); word(n, px + (mirror ? -1 : 1) * (fw / 2 + 0.7), fy, lab, P['color.numeral'], 'center');
    word(words, mirror ? x - 6 : px + fw + 6, fy, labB, tint(side), mirror ? 'right' : 'left');
  };
  crowd(cell(0), 'union', '5', "Garnett's Bde", false); crowd(W - M - 8, 'confederate', '9', "Pender's Div", true);
  y += 48; foot = y + 36; crowd(cell(0), 'union', '2', "Ward's Bde, north", false); crowd(cell(1), 'mixed', '4', 'both armies', false);
  y += 48; caption('Units too close to stand apart merge into one flag. Its number counts placement records, never men; its words say what they share, with north, south, east or west added when two crowds share the same words. A flag split blue and red holds units of both armies. Point at it to see where each one stands.'); rule();
  // 4. age, strength, side
  head('Age, strength and side'); foot = y + 30; const F = { H: P['pole.unitFull'], fw: P['flag.unitFullW'], fh: P['flag.unitFullH'], end: 'rect', k: 0 }; const fcy = foot - F.H + F.fh / 2 + bl - 0.2; const cw = (W - 2 * M - 16) / 3;
  const col3 = (i) => M + 8 + i * cw;
  stand('union', col3(0), foot, F, false); word('fresh', col3(0) + F.fw + 8, fcy, lab, ink);
  stand('union', col3(1), foot, { ...F, old: 1 }, false); word('carried', col3(1) + F.fw + 8, fcy, lab, ink);
  c.save(); c.translate(col3(2), foot); groundRing(c, P, 8.5, 3.6, P['color.unionBright'], 1, P['sel.width']); c.restore(); stand('union', col3(2), foot, F, false); word('selected', col3(2) + F.fw + 8, fcy, lab, ink);
  y += 36; foot = y + 38; const fcy2 = foot - F.H + F.fh / 2 + bl - 0.2;
  const barred = (x, share, text) => { stand('union', x, foot, F, false); const bx = x + P['pole.width'] / 2 + 0.6; const bw = F.fw; const by = foot - F.H + F.fh + P['strength.gap']; c.fillStyle = rgba(P['color.poleEdge'], P['strength.track']); c.fillRect(bx - 0.6, by - 0.6, bw + 1.2, P['strength.h'] + 1.2); c.fillStyle = P['color.unionBright']; c.fillRect(bx, by, bw * share, P['strength.h']); word(text, x + bw + 8, fcy2, lab, ink); };
  barred(col3(0), 1, 'full'); barred(col3(1), 0.4, '40 %');
  stand('unknown', col3(2), foot, F, false); word('contested', col3(2) + F.fw + 8, fcy2, lab, ink);
  y += 44; caption('A hollow flag means the latest keyframe is a battle day old or more. The bar under a flag is the placement strength over the unit’s reference: a modelled value, not a casualty record. A pale hatched flag is a unit whose side the records disagree on (Contested): it is never drawn in either army’s colour.'); rule();
  y += 8;      // (ANIM: the casualty-memory ground marks of the approved look are not shipped, so neither the legend nor its figure describes them)
  return y;
}
const FIG_H = 1000;

const DEF = {
  id: 'standards', label: 'Standards', version: '1.0', tokens: STD_TOKENS, fonts: FONTS, footprint: FOOT, sizer: makeSizer,
  channels: { side: true, facing: true, arm: ['infantry', 'cavalry', 'artillery', 'formation'], fix: true, aggregate: true, idOnly: true, selection: true, strength: true },
  draw: { tile, pin, leader, hull }, sample, figure, figureH: FIG_H, fallbackSwatch: '#8aa0b8',
  legendText: {
    'arm:infantry': 'Infantry: a square-ended flag', 'arm:cavalry': 'Cavalry: a swallow-tailed flag', 'arm:artillery': 'Artillery: an arrow-ended flag', 'arm:formation': 'Formation record (brigade, division, corps): a larger standard, no arm claimed',
    'aggregate:agg': 'A number in a flag: the placement records it stands for, never men', 'selection:selected': 'A ring on the ground round the pole: the selected mark (from zoom 15 it also grows its name)',
    'fix:fresh': 'Solid cloth: the latest keyframe is under half a battle day old', 'fix:carried': 'Hollow cloth: a battle day or more old, carried forward', 'facing:facing': 'A flag flies toward the enemy: Union to the right, Confederate to the left',
    'strength:1': 'Bar under a regiment flag: placement strength over reference, full', 'strength:0.4': 'The same at 40 %: a placement value, not casualties',
  },
};
if (typeof window !== 'undefined') window.__lookSkins = { ...(window.__lookSkins || {}), standards: { codeOf, compactName, plan, sgnOf } };
export const STANDARDS = defineFamily(DEF, STD_VARIANTS);
