// skins/quiet-cartographer.mjs - SKIN "QUIET CARTOGRAPHER", polish round 1 (art director 1 of the Battle Studio redesign: Apple Maps, Mapbox Studio, Swiss cartography, Eduard Imhof).
//
// The idea in one paragraph: a map is quiet when the eye is told what matters by size, weight and lightness and by nothing else.  So every unit is ONE small mark: a pip (its shape says the arm, its colour
// the side) STANDING ON THE UNIT'S TRUE POSITION, with its short code hung beside it as haloed lettering: no plate, no caption chip, no outline.  A formation is a STANDARD: a flag on a staff whose FOOT
// stands on the true position, bigger for a division and bigger again for a corps; a crowd that cannot all stand on its own place merges into such a standard whose number counts the units it stands for and
// whose lettering says what they share.  The two armies face each other: a Union mark reads left to right (pip, then lettering; a swallow-tail flag), a Confederate mark right to left (lettering, then pip; a
// pointed flag), so the side survives a greyscale print, a colour-blind viewer and a pip too small to tell by hue.  One device says "not a fresh report": the mark HOLLOWS (a side-coloured ring round dark
// or pale glass, the same hue, never grey).  When the map is zoomed in, the same mark GROWS: the full name (and, on a selected unit, a strength hairline) joins it inside its own footprint; there is no
// second box.  A pin and a hairline to the true place are drawn only for the mark you point at or select (a resting field of them was wiring).
//
// What it draws, and the evidence label of each channel, is in skins/semantics.mjs (the legend is generated from this file's own drawing).  Not drawn, on purpose: posture and arm state (Modelled,
// not vital; the inspector shows the disposition) and the corps badge (the code and the name carry the corps).  Position, strength and fix age are Modelled or Computed whatever the mark looks like.
import { defineFamily, clamp01, ss, mixHex, rgba, skinKit } from './kit.mjs';
import { codeOf, compactName as compactNameOf } from '../layout/words.mjs';
import { FONTS, FORMATION_KINDS } from './semantics.mjs';
import { QC_TOKENS, QC_DAY, QC_NIGHT_VARIANTS, QC_DAY_VARIANTS } from './quiet-cartographer.spec.mjs';

const TAU = Math.PI * 2;
export const FOOT = { chipH: 20, chipMinW: 10, ring: 3, pinHalf: 2.5 };
const ECH_OF_KIND = { brigade: 1, battalion: 0, division: 2, corps: 3, army: 3 };
const ECH_SCALE = [1, 1, 1.22, 1.45];                     // a standard grows with the echelon it stands for: brigade 1, division 1.22, corps 1.45 (the flag, not the lettering, carries the rank)

// ---- what a tile says (pure functions of the display tile or the unit) ---------------------------------------------------------------------------------------------------
const sideOf = (s) => (s === 'union' || s === 'confederate' || s === 'unknown' || s === 'mixed' ? s : 'unknown');
/** which way a mark reads: +1 from its near end to the right (Union, unknown, both sides), -1 from its near end to the left (Confederate): the armies face each other */
export const sgnOf = (side) => (side === 'confederate' ? -1 : 1);
export { codeOf };
/** the order of battle's own words, compacted for the map (layout/words.mjs): a formation record with no name takes the words of its id, never the raw id */
export function compactName(u) { return u ? compactNameOf(u, FORMATION_KINDS.has(u.kind)) : null; }
const NAMES = new WeakMap();
const nameOfUnit = (u) => { let n = NAMES.get(u); if (n === undefined) { n = compactName(u); NAMES.set(u, n); } return n; };
function infoOfUnit(u) { const flag = FORMATION_KINDS.has(u.kind); return { flag, side: sideOf(u.side), short: codeOf(u), name: nameOfUnit(u), idOnly: !u.inOob && !flag, count: null, ech: flag ? (ECH_OF_KIND[u.kind] ?? 1) : 0, agg: false }; }
function infoOfAgg(a) { return { flag: true, side: sideOf(a.side), short: a.short, name: a.name || null, idOnly: false, count: a.badge, ech: ECH_OF_KIND[a.kind] || 0, generic: a.kind === 'scope' || a.kind === 'contact', agg: true }; }
const infoOfTile = (t) => (t.kind === 'agg' ? infoOfAgg({ short: t.short, name: t.fname, badge: t.badge, kind: t.nameKind, side: t.side }) : infoOfUnit(t.unit));
const detailOf = (z, P) => ({ uname: z >= P['detail.unitNameZoom'], hull: z >= P['detail.hullZoom'] });
/** progressive disclosure, as a map does it: formations and crowds say their names first (a corps from zoom 11, a division from 12.5, a brigade and every crowd from 12.5 or 13), a unit's code from zoom 14, its full name
 *  only close up; a crowd always says what it stands for; a selected mark always says all it can */
const wideScreen = (P) => (typeof innerWidth === 'number' ? innerWidth : 1440) >= P['detail.selectNameMinViewport'];
function textShown(info, z, P, sel) {
  if (sel && z >= P['detail.selectGrowZoom']) return true;      // a selected mark grows from this zoom; below it only its ring changes (measured: growing it at zoom 11 to 13 re-flowed a crowded field for ever, tools/probes/select-rest.mjs)
  if (!info.flag) return z >= P['detail.codeZoom'];
  if (info.agg) return z >= P['detail.crowdNameZoom'];
  return z >= (info.ech >= 3 ? P['detail.corpsNameZoom'] : info.ech === 2 ? P['detail.divisionNameZoom'] : P['detail.brigadeNameZoom']);
}
/** one rank of bold: every formation and every crowd is set in the same cut (bold 12); the unit codes are semibold 12 */
const formFont = () => 'form';

/** the geometry of a mark: one function used by the layout (the footprint) and by the drawing (where each part goes), so the two cannot disagree.  Lengths run from the NEAR end of the mark (the pip's end) toward the far end;
 *  `dx`, `dy` say where the box centre lies from the mark's true position (the pip's centre), so the layout can hang the box on it.  A unit is a pip and its words; a formation or a crowd is the same pip with a pennant on a staff
 *  (round 2: one grammar, the pip is always the place; the pennant is what rises from it). */
export function plan(spec, P, info, z, sel) {
  const T = spec.text; const R = spec.ring; const D = detailOf(z, P); const txt = textShown(info, z, P, sel); const sgn = sgnOf(info.side);
  if (!info.flag) {
    const grow = sel && wideScreen(P) && z >= P['detail.selectGrowZoom']; const showName = !!info.name && (D.uname || grow); const font = info.idOnly ? 'codeI' : 'code';
    // the full name REPLACES the code (round 0 printed "82 NY  82nd New York Infantry": the code was redundant once the name was there)
    const codeW = txt && !showName ? T.width(font, info.short) : 0; const nameW = showName ? T.width('code', info.name) : 0; const lead = P['pip.size'] + (txt ? P['pip.gap'] : 0);
    const bodyW = lead + codeW + nameW; const w = Math.ceil(bodyW + 2 * R); const near = R + P['pip.size'] / 2;
    return { flag: false, sgn, txt, font, codeW, nameW, showName, lead, bodyW, w, h: P['unit.h'] + 2 * R, near, dx: sgn * (w / 2 - near), dy: 0, D };
  }
  const font = formFont(info); const text = txt ? (info.name || info.short) : ''; const named = txt && !!info.name; const mainW = txt ? T.width(font, text) : 0; const textW = mainW;
  const numW = info.count != null ? T.width('code', info.count) : 0; const es = ECH_SCALE[Math.min(3, info.ech || 0)];
  const flagH = Math.round(P['flag.h'] * es); const flagMin = Math.round(P['flag.w'] * es); const flagW = info.count != null ? Math.max(flagMin, Math.ceil(numW + P['flag.notch'] + 2 * P['flag.padX'])) : flagMin;
  const footR = P['foot.size'] * (es === 1 ? 1 : 1 + (es - 1) * 0.45) / 2; const stalk = P['flag.staff'];          // the pip's radius, and the staff between the pip and the flag
  const near = R + footR; const lead = footR + flagW + (txt ? P['flag.gap'] : 0); const bodyW = lead + textW; const w = Math.ceil(near + flagW + (txt ? P['flag.gap'] + textW : 0) + R);
  const top = -(stalk + flagH); const bottom = footR; const h = Math.ceil(bottom - top + 2 * R);        // from the flag's top edge to the pip's foot, plus the margin
  return { flag: true, sgn, txt, text, font, named, textW, mainW, numW, flagW, flagH, footR, stalk, lead, bodyW, w, h, near, top, bottom, dx: sgn * (w / 2 - near), dy: -((h / 2) - R - footR), D };
}

/** the sizer the layout calls (layout/spec.mjs, layout/tiles.mjs): footprint by detail level and selection; dx, dy hang the box on the true position */
function makeSizer(skin) {
  const P = skin.P;
  const out = (p) => ({ w: p.w, h: p.h, dx: p.dx, dy: p.dy, sgn: p.sgn });
  return {
    key: (u, z, sel) => { const info = infoOfUnit(u); return (textShown(info, z, P, sel) ? 't' : '-') + (z >= P['detail.unitNameZoom'] ? 'u' : '-') + (sel ? 's' : '-') + (wideScreen(P) ? 'w' : 'n') + skin.rev; },
    leaf: (spec, u, z, sel) => out(plan(spec, P, infoOfUnit(u), z, sel)),
    agg: (spec, a) => out(plan(spec, P, infoOfAgg(a), a.zoom, false)),
    selects: (z) => wideScreen(P) && z >= P['detail.selectGrowZoom'],      // does selecting a mark change what the layout must reserve at this zoom?  (below it, or on a narrow window, the selection is a ring and nothing moves)
  };
}

// ---- lettering sprites: haloed text is rendered once per (face, string, ink) and blitted: strokeText for 200 labels a frame would cost more than the whole rest of the frame -----------------
const SPR = new Map();
function makeCanvas(w, h) { if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h); const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
const pxOf = (font) => +(/(\d+(?:\.\d+)?)px/.exec(font) || [0, 11])[1];
let PROBE = null;
/** returns { img, x, y, w, h }: (x, y) is where the text baseline origin lies inside the sprite, w and h are CSS px; the text itself is w - 2 x wide */
function lettering(g, font, s, ink, haloHex, haloAlpha) {
  const P = g.P; const dpr = g.dpr; const halo = haloHex || P['color.halo']; const ha = haloAlpha ?? P['halo.alpha']; const key = font + '|' + s + '|' + ink + '|' + dpr + '|' + g.skin.rev + '|' + halo + P['halo.width'] + ha + P['halo.soft'];
  let e = SPR.get(key); if (e) return e;
  const size = pxOf(font); const pad = Math.ceil((P['halo.width'] + (P['halo.soft'] > 0 ? 2 : 0)) / 2) + 1;
  if (!PROBE) PROBE = makeCanvas(4, 4).getContext('2d'); PROBE.font = font; const tw = PROBE.measureText(s).width;
  const w = Math.ceil(tw) + 2 * pad; const h = Math.ceil(size * 1.3) + 2 * pad; const asc = Math.round(size * 0.97) + pad;
  const cv = makeCanvas(Math.ceil(w * dpr), Math.ceil(h * dpr)); const c = cv.getContext('2d'); c.scale(dpr, dpr); c.font = font; c.textBaseline = 'alphabetic'; c.textAlign = 'left'; c.lineJoin = 'round'; c.miterLimit = 2;
  if (P['halo.soft'] > 0 && P['halo.width'] > 0) { c.lineWidth = P['halo.width'] + 2; c.strokeStyle = rgba(halo, P['halo.soft']); c.strokeText(s, pad, asc); }
  if (P['halo.width'] > 0) { c.lineWidth = P['halo.width']; c.strokeStyle = rgba(halo, ha); c.strokeText(s, pad, asc); }
  c.fillStyle = ink; c.fillText(s, pad, asc);
  e = { img: cv, x: pad, y: asc, w, h, tw }; if (SPR.size > 3000) SPR.clear(); SPR.set(key, e); return e;
}
/** blit a lettering: (x, baseY) = the text's near edge and baseline; `sgn` -1 right-aligns it on x (a Confederate mark reads right to left); lo..hi is the footprint's ink range (cuts a text that is still easing in) */
function putText(c, g, font, s, x, baseY, ink, alpha, sgn, lo, hi) {
  if (!(alpha > 0.004) || !s) return; const sp = lettering(g, font, s, ink); const w = sp.w; const h = sp.h; const left = sgn < 0 ? x - sp.tw : x; const dx = left - sp.x; const dy = baseY - sp.y; const base = c.globalAlpha; c.globalAlpha = base * alpha;
  const a = Math.max(dx, lo); const b = Math.min(dx + w, hi);
  if (b - a >= w - 0.01) c.drawImage(sp.img, dx, dy, w, h);
  else if (b > a) c.drawImage(sp.img, (a - dx) * g.dpr, 0, (b - a) * g.dpr, h * g.dpr, a, dy, b - a, h);
  c.globalAlpha = base;
}

// ---- shapes ---------------------------------------------------------------------------------------------------------------------------------------------------------------------
function pipPath(c, arm, cx, cy, r) {
  c.beginPath();
  if (arm === 'cavalry') { const q = r * 1.16; c.moveTo(cx, cy - q); c.lineTo(cx + q, cy); c.lineTo(cx, cy + q); c.lineTo(cx - q, cy); c.closePath(); }
  else if (arm === 'artillery') { const q = r * 1.1; c.moveTo(cx, cy - q * 1.02); c.lineTo(cx + q * 1.02, cy + q * 0.74); c.lineTo(cx - q * 1.02, cy + q * 0.74); c.closePath(); }
  else c.arc(cx, cy, r, 0, TAU);
}
/** the pennant of a standard, hung from the staff at x and flying in direction dir (+1 right, -1 left): a Union pennant ends in a deep swallow-tail, a Confederate pennant in a point, a pennant of unknown side is cut square;
 *  w = length, h = height, e = depth of the notch or the point */
function flagPath(c, x, y, w, h, e, dir, end) {
  const W = dir * w; const E = dir * e; c.beginPath(); c.moveTo(x, y);
  if (end === 'point') { c.lineTo(x + W - E, y); c.lineTo(x + W, y + h / 2); c.lineTo(x + W - E, y + h); }
  else if (end === 'square') { c.lineTo(x + W, y); c.lineTo(x + W, y + h); }
  else { c.lineTo(x + W, y); c.lineTo(x + W - E, y + h / 2); c.lineTo(x + W, y + h); }
  c.lineTo(x, y + h); c.closePath();
}
const endOf = (side) => (side === 'confederate' ? 'point' : side === 'union' || side === 'mixed' ? 'swallow' : 'square');
const sideHex = (P, side) => (side === 'union' ? P['color.union'] : side === 'confederate' ? P['color.confederate'] : P['color.unknown']);
const flagHex = (P, side) => (side === 'union' ? P['color.unionFlag'] : side === 'confederate' ? P['color.confederateFlag'] : P['color.unknown']);
const tintHex = (P, side) => (side === 'union' ? P['color.tintUnion'] : side === 'confederate' ? P['color.tintConfederate'] : side === 'unknown' ? P['color.tintUnknown'] : P['color.tintMixed']);
const rrect = (c, x, y, w, h, r) => { r = Math.min(r, w / 2, h / 2); c.beginPath(); c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.arcTo(x + w, y, x + w, y + r, r); c.lineTo(x + w, y + h - r); c.arcTo(x + w, y + h, x + w - r, y + h, r); c.lineTo(x + r, y + h); c.arcTo(x, y + h, x, y + h - r, r); c.lineTo(x, y + r); c.arcTo(x, y, x + r, y, r); c.closePath(); };

const isLight = (hex) => { const n = parseInt(String(hex).slice(1, 7), 16); return 0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255) > 150; };
function hatch(c, cx, cy, r, P, a) {                       // the contested side: diagonal hatching inside the current path (ink on a pale cloth, paper on a dark one)
  c.save(); c.clip(); c.strokeStyle = isLight(P['color.unknown']) ? rgba(P['color.ink'], 0.55 * a) : rgba(P['color.halo'], 0.6 * a); c.lineWidth = 1; c.beginPath();
  for (let q = -2 * r; q < 2 * r; q += 3) { c.moveTo(cx + q - r, cy + r); c.lineTo(cx + q + r, cy - r); } c.stroke(); c.restore();
}

/** a pip: the symbol of a unit.  old = 0 fresh (light ring, solid side colour) .. 1 carried forward (a thick side-coloured ring, tinted glass inside).  scale 0..1.2 for arrival and hover */
function drawPip(c, P, arm, side, cx, cy, size, old, alpha, scale = 1) {
  const R = size / 2 * scale; if (R < 0.4) return; const col = sideHex(P, side); const hollow = old * P['carried.hollow']; const rw = P['pip.ring'] + (P['pip.ringHollow'] - P['pip.ring']) * hollow;
  const base = c.globalAlpha; c.globalAlpha = base * alpha;
  const edge = side === 'unknown' ? P['color.tintUnknown'] : col;                                      // the hollow ring of a pip of unknown side is ink, not the pale cloth (a pale ring would vanish on a pale ground)
  pipPath(c, arm, cx, cy, R + 1.1); c.fillStyle = rgba(P['color.halo'], 0.5 + 0.35 * hollow); c.fill();   // a 1 px halo of the ground's paper (or night ink): the ring and its glass hold on any part of the photograph, dark woods included
  pipPath(c, arm, cx, cy, R); c.fillStyle = mixHex(P['color.ring'], edge, hollow); c.fill();            // ring: ink-dark on the day ground, light on the night ground when fresh; the side colour when carried forward
  const ri = Math.max(0.5, R - rw);
  if (hollow < 0.99) { c.globalAlpha = base * alpha * (1 - hollow); pipPath(c, arm, cx, cy, ri); c.fillStyle = col; c.fill(); if (side === 'unknown') hatch(c, cx, cy, ri, P, 1); }
  if (hollow > 0.01) { c.globalAlpha = base * alpha * hollow; pipPath(c, arm, cx, cy, ri); c.fillStyle = rgba(P['color.glass'], P['carried.glass']); c.fill(); c.fillStyle = rgba(edge, P['carried.tint']); c.fill(); }
  c.globalAlpha = base;
}

/** a standard: the pip stands on the place (sx, footY), a staff rises from it and a pennant flies from the staff's top (sx, top) in direction dir.  furl 0..1 = the pennant unfurls on arrival.  old hollows it like a pip. */
function drawStandard(c, P, side, sx, top, w, h, old, furl, dir, footY, footSize) {
  const e = P['flag.notch'] * h / P['flag.h']; const end = endOf(side); const hollow = old * P['carried.hollow']; const fw = Math.max(1, w * furl); const col = side === 'mixed' ? P['color.unionFlag'] : flagHex(P, side);
  const bright = side === 'mixed' ? P['color.union'] : side === 'unknown' ? P['color.tintUnknown'] : sideHex(P, side); const base = c.globalAlpha;
  c.lineCap = 'butt'; c.beginPath(); c.moveTo(sx, top); c.lineTo(sx, footY); c.strokeStyle = mixHex(P['color.ring'], bright, hollow * 0.9); c.lineWidth = P['staff.width']; c.stroke();
  const rw = P['flag.edge'] + (P['flag.edgeHollow'] - P['flag.edge']) * hollow;                           // the pennant's edge: ink-dark (day) or light (night) when fresh, the side colour and thicker when carried forward
  flagPath(c, sx, top, fw, h, Math.min(e, fw * 0.45), dir, end); c.fillStyle = mixHex(P['color.ring'], bright, hollow); c.fill();
  const ins = rw; c.save(); flagPath(c, sx, top + ins, Math.max(1, fw - ins * 1.2), h - 2 * ins, Math.min(e * 0.8, fw * 0.4), dir, end); c.clip();
  const x0 = Math.min(sx, sx + dir * w) - 1;
  if (side === 'mixed') {                                   // both sides: split diagonally, Union at the staff, Confederate at the fly
    c.fillStyle = P['color.unionFlag']; c.fillRect(x0, top, w + 2, h);
    const a = sx + dir * w * 0.62; const b2 = sx + dir * w * 0.34; c.beginPath(); c.moveTo(a, top - 1); c.lineTo(sx + dir * (w + 2), top - 1); c.lineTo(sx + dir * (w + 2), top + h + 1); c.lineTo(b2, top + h + 1); c.closePath(); c.fillStyle = P['color.confederateFlag']; c.fill();
    if (hollow > 0.01) { c.globalAlpha = base * hollow; c.fillStyle = rgba(P['color.glass'], P['carried.glass']); c.fillRect(x0, top - 1, w + 2, h + 2); c.fillStyle = rgba(P['color.union'], P['carried.tint']); c.fillRect(x0, top - 1, w / 2 + 2, h + 2); c.globalAlpha = base; }
  } else {
    c.fillStyle = col; c.fillRect(x0, top - 1, w + 2, h + 2);
    if (hollow > 0.01) { c.globalAlpha = base * hollow; c.fillStyle = rgba(P['color.glass'], P['carried.glass']); c.fillRect(x0, top - 1, w + 2, h + 2); c.fillStyle = rgba(bright, P['carried.tint']); c.fillRect(x0, top - 1, w + 2, h + 2); c.globalAlpha = base; }
    if (side === 'unknown') hatch(c, sx + dir * w / 2, top + h / 2, w / 2, P, 1);
  }
  c.globalAlpha = base; c.restore();
  drawPip(c, P, 'infantry', side === 'mixed' ? 'union' : side, sx, footY, footSize, old, 1);              // the pip: the place the standard stands on
}
const easeOut = (x) => 1 - (1 - clamp01(x)) ** 3;

/** the selection ring: a side-coloured ring round the pip (the place), under a paper hairline, never round the words */
function selRing(c, P, side, cx, cy, r, k, w) {
  const col = side === 'union' ? P['color.union'] : side === 'confederate' ? P['color.confederate'] : P['color.select'];
  c.beginPath(); c.arc(cx, cy, r, 0, TAU); c.strokeStyle = rgba(P['color.halo'], 0.92 * k); c.lineWidth = w + 2.4; c.stroke(); c.strokeStyle = rgba(col, k); c.lineWidth = w; c.stroke();
}

// ---- the tile -------------------------------------------------------------------------------------------------------------------------------------------------------------------
function tile(c, t, g) {
  const P = g.P; const vm = g.vm; const spec = g.env.spec; const info = infoOfTile(t); const side = info.side; const sel = !!t.selected;
  const pl = plan(spec, P, info, g.zoom, sel && t.grown !== false); const ring = spec.ring; const hw = g.hw; const old = vm.carried; const base = c.globalAlpha; const sgn = pl.sgn;
  const X = (l) => (sgn > 0 ? -hw + l : hw - l);                  // a length from the near end of the mark -> x in the box
  const lo = -hw + 0.5; const hi = hw - 0.5; const enter = easeOut(g.enter); const textAlpha = 1 - old * (1 - P['text.dimAlpha']); const ink = P['color.ink'];
  const nm = g.ease('name', pl.flag ? 0 : (pl.showName ? 1 : 0), 180);       // the full name grows in with the footprint (its own eased channel: it also fades when the zoom takes it away)
  const ringCol = side === 'mixed' ? 'union' : side; let pipX = 0; let pipY = 0; let pipR = 0;
  if (!pl.flag) {
    const cy = 0; const arm = vm.arm === 'cavalry' || vm.arm === 'artillery' ? vm.arm : 'infantry'; const pc = X(pl.near); pipX = pc; pipY = cy; pipR = P['pip.size'] / 2;
    drawPip(c, P, arm, side, pc, cy, P['pip.size'], old, 1, (0.72 + 0.28 * enter) * (1 + 0.05 * g.hov));
    const baseY = g.cr(cy + P['code.baseline'], 0); const tk = g.ease('txt', pl.txt ? 1 : 0, 160); const tx = X(pl.near + pipR + P['pip.gap']);
    if (tk * (1 - nm) > 0.01) putText(c, g, FONTS[pl.font], info.short, tx, baseY, ink, textAlpha * ss(0.25, 1, g.enter) * tk * (1 - ss(0, 0.4, nm)), sgn, lo, hi);       // the code fades out as the name fades in, from the same place
    if (info.name && nm > 0.01) putText(c, g, FONTS.code, info.name, tx, baseY, ink, ss(0.3, 0.9, nm) * P['name.alpha'] * textAlpha, sgn, lo, hi);      // the code is gone before the name shows (two strings of one mark never overprint)
  } else {
    // the box centre is (0, 0); the layout hangs the box on the pip, so the pip's centre lies (dx, dy) from the box centre: here pl.dy above it
    const sx = X(pl.near); const pipCy = -pl.dy; const flagTop = pipCy + pl.top; const furl = Math.max(0.25, enter);
    drawStandard(c, P, side, sx, flagTop, pl.flagW, pl.flagH, old, furl, sgn, pipCy, pl.footR * 2);
    pipX = sx; pipY = pipCy; pipR = pl.footR;
    if (info.count != null) {
      const flagMid = sx + sgn * (pl.flagW - (side === 'confederate' ? P['flag.notch'] * 0.4 : P['flag.notch'] * 0.6)) / 2;
      const hol = ss(0.42, 0.58, old * P['carried.hollow']); const b = c.globalAlpha; const by = g.cr(flagTop + pl.flagH / 2 + P['code.baseline'] - 0.2, 0);      // the count is white on the cloth, ink on the glass, and changes over the narrow band in the middle (two numerals at half strength read as a grey smudge)
      if (hol < 0.99) { const sp = lettering(g, FONTS.code, info.count, P['color.numeral'], P['color.numeralHalo'], 0); c.globalAlpha = b * ss(0.4, 1, g.enter) * (1 - hol); c.drawImage(sp.img, flagMid - sp.tw / 2 - sp.x, by - sp.y, sp.w, sp.h); }
      if (hol > 0.01) { const sp = lettering(g, FONTS.code, info.count, ink, P['color.halo'], 0); c.globalAlpha = b * ss(0.4, 1, g.enter) * hol; c.drawImage(sp.img, flagMid - sp.tw / 2 - sp.x, by - sp.y, sp.w, sp.h); }
      c.globalAlpha = b;
    }
    const tx = X(pl.near + pl.flagW + P['flag.gap']); const baseY = g.cr(flagTop + pl.flagH / 2 + P['code.baseline'] - 0.2, 0); const tk = g.ease('txt', pl.txt ? 1 : 0, 160);
    if (pl.text && tk > 0.01) {
      const ta = textAlpha * ss(0.25, 1, g.enter) * tk; const mw = lettering(g, FONTS[pl.font], pl.text, tintHex(P, side)).tw; const x0 = sgn > 0 ? tx : tx - mw;
      putText(c, g, FONTS[pl.font], pl.text, x0, baseY, tintHex(P, side), ta, 1, lo, hi);
    }
  }
  if (g.hov > 0.01 && g.sel < 0.5) selRing(c, P, ringCol, pipX, pipY, pipR + P['sel.gap'], 0.7 * g.hov, P['hover.width']);          // hover: a fainter, thinner ring in the same place
  if (g.sel > 0.003) selRing(c, P, ringCol, pipX, pipY, pipR + P['sel.gap'], g.sel, P['sel.width']);                                  // selection: a side-coloured ring round the pip, easing in; the mark has already grown to show its name
  void ring; c.globalAlpha = base;
}

// ---- pin, leader, hull: drawn only for the mark that is hovered or selected -------------------------------------------------------------------------------------------------
/** where the mark's own pip (or the foot of its staff) stands, in screen coordinates, given the box centre b: the box hangs from it by (dx, dy) */
function standing(t, g, b) {
  const P = g.P; const spec = g.env.spec; const pl = plan(spec, P, infoOfTile(t), g.zoom, !!t.selected && t.grown !== false); return [b[0] - pl.dx, b[1] - pl.dy];
}
const isOn = (t) => !!t.selected || skinKit.hover() === t.key;
function pin(c, t, g) {
  if (!isOn(t)) return; const P = g.P; const r = P['pin.r']; const base = c.globalAlpha;
  c.beginPath(); c.arc(0, 0, r + 1.1, 0, TAU); c.fillStyle = rgba(P['color.halo'], 0.7); c.fill();
  c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fillStyle = P['color.ring']; c.fill();
  c.beginPath(); c.arc(0, 0, Math.max(0.6, r - 1.15), 0, TAU); c.fillStyle = sideHex(P, sideOf(g.vm.side === 'mixed' ? 'union' : g.vm.side)); c.fill(); c.globalAlpha = base;
}
function leader(c, t, g, a, b) {
  if (!isOn(t)) return; const P = g.P; const e = standing(t, g, b); if (Math.hypot(e[0] - a[0], e[1] - a[1]) < 3.5) return; const base = c.globalAlpha; c.globalAlpha = base * P['leader.alpha']; c.lineCap = 'round';
  c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(e[0], e[1]); c.strokeStyle = rgba(P['color.halo'], 0.55); c.lineWidth = P['leader.width'] + 1.4; c.stroke();
  c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(e[0], e[1]); c.strokeStyle = tintHex(P, sideOf(g.vm.side)); c.lineWidth = P['leader.width']; c.stroke(); c.globalAlpha = base;
}
/** a crowd stands for its units: while it is hovered or selected, a hairline runs from the foot of its staff to the true position of each one, which carries a small dot */
function hull(c, t, g, pts) {
  const P = g.P; if (g.zoom < P['detail.hullZoom'] || !pts.length || !isOn(t)) return;
  const view = g.env.view || { dx: 0, dy: 0 }; const e0 = standing(t, g, [t.x + view.dx, t.y + view.dy]); const base = c.globalAlpha; const side = sideOf(g.vm.side); c.lineCap = 'round'; c.beginPath();
  for (const p of pts) { c.moveTo(e0[0], e0[1]); c.lineTo(p[0], p[1]); }
  c.globalAlpha = base * P['hull.leader']; c.strokeStyle = rgba(P['color.halo'], 0.55); c.lineWidth = 2.2; c.stroke(); c.strokeStyle = tintHex(P, side); c.lineWidth = 0.9; c.stroke();
  c.globalAlpha = base * 0.95; const r = P['hull.dot'];
  for (const p of pts) { c.beginPath(); c.arc(p[0], p[1], r + 1, 0, TAU); c.fillStyle = rgba(P['color.halo'], 0.7); c.fill(); c.beginPath(); c.arc(p[0], p[1], r, 0, TAU); c.fillStyle = P['color.ring']; c.fill(); }
  c.globalAlpha = base;
}

// ---- the legend's swatches (26 x 20, centre at 0,0): the same drawing code ---------------------------------------------------------------------------------------------------
function sample(c, ch, v, g, w, h) {
  const P = g.P; const fs = P['foot.size']; const fh = P['flag.h']; const fw = P['flag.w'] * 0.8;
  const std = (side, x, es = 1, dir = 1, old = 0) => { const H = Math.round(fh * es * 0.8); drawStandard(c, P, side, x, -6 - H / 2 - 3, Math.round(fw * es), H, old, 1, dir, 6, fs * 0.9); };
  if (ch === 'side') { if (v === 'mixed') std('mixed', -5); else drawPip(c, P, 'infantry', v, 0, 0, P['pip.size'], 0, 1); }
  else if (ch === 'arm') { if (v === 'formation') std('union', -5); else if (v === 'infantry' || v === 'cavalry' || v === 'artillery') drawPip(c, P, v, 'union', 0, 0, P['pip.size'], 0, 1); else return false; }
  else if (ch === 'fix') drawPip(c, P, 'infantry', 'union', 0, 0, P['pip.size'], v === 'carried' ? 1 : 0, 1);
  else if (ch === 'aggregate') { std('union', -7); c.font = FONTS.code; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = P['color.numeral']; c.fillText('5', 0, -6.2); }
  else if (ch === 'idOnly') { c.font = FONTS.codeI; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = P['color.ink']; c.fillText('12 NC', 0, 0.6); }
  else if (ch === 'selection') { drawPip(c, P, 'infantry', 'union', 0, 0, P['pip.size'], 0, 1); selRing(c, P, 'union', 0, 0, P['pip.size'] / 2 + P['sel.gap'], 1, P['sel.width']); }
  else if (ch === 'facing') { drawPip(c, P, 'infantry', 'union', -6, 0, 6, 0, 1); c.fillStyle = rgba(P['color.ink'], 0.8); c.fillRect(-2, -0.5, 3.4, 1); drawPip(c, P, 'infantry', 'confederate', 6, 0, 6, 0, 1); c.fillRect(-1.4, 1.8, 3.4, 1); }
  else return false;
}

// ---- the legend's figure: the anatomy of the marks at their true size, drawn with the same code as the map (so it cannot drift) -----------------------------------------------------------
function wrapText(c, text, maxW) { const words = text.split(' '); const lines = []; let line = ''; for (const w of words) { const t = line ? line + ' ' + w : w; if (line && c.measureText(t).width > maxW) { lines.push(line); line = w; } else line = t; } if (line) lines.push(line); return lines; }
/** four short blocks (a unit, a formation, a crowd, age and selection), each a title, its specimens at true size (Union reading rightward from the left, Confederate leftward from the right) and one caption of at most three lines */
function figure(c, g, W) {
  const P = g.P; const ink = P['color.ink']; const mute = rgba(ink, 0.78); const faint = rgba(ink, 0.16); const FACE = FONTS.name.replace(/^400 12px /, ''); const cap = `400 12px ${FACE}`; const lab = `600 12px ${FACE}`; const labB = `700 12px ${FACE}`; const title = `700 11px ${FACE}`;
  const M = 16; let y = 8; c.textBaseline = 'alphabetic'; c.textAlign = 'left';
  const word = (s, x, yy, font, col, align = 'left') => { c.font = font; c.fillStyle = col; c.textAlign = align; c.fillText(s, x, yy); c.textAlign = 'left'; };
  const head = (s) => { word(s, M, y + 11, title, rgba(ink, 0.62)); y += 20; };
  const caption = (text) => { c.font = cap; const lines = wrapText(c, text, W - 2 * M); c.fillStyle = mute; for (const ln of lines) { c.fillText(ln, M, y + 12); y += 17; } };
  const rule = () => { y += 6; c.strokeStyle = faint; c.lineWidth = 1; c.beginPath(); c.moveTo(M, y + 0.5); c.lineTo(W - M, y + 0.5); c.stroke(); y += 12; };
  const bl = P['code.baseline']; const ps = P['pip.size']; const pr = ps / 2; const tg = pr + P['pip.gap']; const pipU = (arm, x, yy, old = 0) => drawPip(c, P, arm, 'union', x, yy, ps, old, 1); const pipC = (arm, x, yy, old = 0) => drawPip(c, P, arm, 'confederate', x, yy, ps, old, 1);
  const std = (side, x, cy, es, dir, old = 0) => { const H = Math.round(P['flag.h'] * es); const W2 = Math.round(P['flag.w'] * es); const R = P['foot.size'] * (es === 1 ? 1 : 1 + (es - 1) * 0.45) / 2; const top = cy - R - P['flag.staff'] - H + 0; drawStandard(c, P, side, x, top, W2, H, old, 1, dir, cy, R * 2); return { W2, H, top, R }; };
  // 1. a unit
  head('A unit'); let cy = y + 8; const x0 = M + pr;
  pipU('infantry', x0, cy); word('71 PA', x0 + tg, cy + bl, lab, ink); pipU('cavalry', x0 + 84, cy); word('1 NJ', x0 + 84 + tg, cy + bl, lab, ink); pipU('artillery', x0 + 150, cy); word('B/1 RI', x0 + 150 + tg, cy + bl, lab, ink);
  pipC('infantry', W - M - pr, cy); word('53 VA', W - M - pr - tg, cy + bl, lab, ink, 'right');
  y += 24; caption('Disc: infantry. Diamond: cavalry. Triangle: artillery. The armies face each other: Union reads left to right, Confederate right to left.'); rule();
  // 2. a formation: the ladder of ranks, brigade, division, corps, Union from the left and Confederate from the right (each reads away from its own staff)
  const tl = (side, x, cy, es, dir, str, col, align) => { const s2 = std(side, x, cy, es, dir); word(str, x + dir * (s2.W2 + 5), cy - P['flag.staff'] - s2.H / 2 + bl - 0.2, labB, col, align); return s2; };
  head('A formation');
  for (const [es, h, a, b] of [[1, 34, "Harrow's Bde", "Kemper's Bde"], [1.22, 40, '2nd Div', "Hood's Div"], [1.45, 46, '1st Corps', '1st Corps']]) {
    cy = y + h - 8; tl('union', M + 5, cy, es, 1, a, P['color.tintUnion'], 'left'); tl('confederate', W - M - 5, cy, es, -1, b, P['color.tintConfederate'], 'right'); y += h;
  }
  y += 4; caption('A pennant rises from the pip that stands on the formation’s place; a larger pennant is a higher rank. A swallow-tail is Union, a point is Confederate.'); rule();
  // 3. a crowd
  head('A crowd'); cy = y + 28;
  const crowd = (side, x, dir, str, count, col, align) => {      // the same geometry as the map: the flag is as wide as its number needs, the number stands in the middle of the cloth (not over the notch or the point)
    c.font = FONTS.code; const nw = c.measureText(count).width; const fW = Math.max(P['flag.w'], Math.ceil(nw + P['flag.notch'] + 2 * P['flag.padX'])); const H = Math.round(P['flag.h']); const R = P['foot.size'] / 2; const top = cy - R - P['flag.staff'] - H;
    drawStandard(c, P, side, x, top, fW, H, 0, 1, dir, cy, R * 2); const mid = x + dir * (fW - (side === 'confederate' ? P['flag.notch'] * 0.4 : P['flag.notch'] * 0.6)) / 2;
    word(count, mid, top + H / 2 + bl - 0.2, FONTS.code, P['color.numeral'], 'center'); word(str, x + dir * (fW + 5), top + H / 2 + bl - 0.2, labB, col, align);
  };
  crowd('union', M + 5, 1, 'of 2nd Corps', '5', P['color.tintUnion'], 'left'); crowd('confederate', W - M - 5, -1, "of Pender's Div", '9', P['color.tintConfederate'], 'right');
  y += 40; caption('Units too close to stand apart merge into one pennant. Its number counts placement records, never men; its words say what they share. Point at it to see where each one stands.'); rule();
  // 4. age and selection
  head('Age and selection'); cy = y + 10; pipU('infantry', x0, cy, 0); word('fresh', x0 + tg, cy + bl, lab, ink); pipU('infantry', x0 + 72, cy, 1); word('carried forward', x0 + 72 + tg, cy + bl, lab, ink);
  pipU('infantry', x0 + 200, cy, 0); selRing(c, P, 'union', x0 + 200, cy, pr + P['sel.gap'], 1, P['sel.width']); word('selected', x0 + 200 + pr + P['sel.gap'] + 6, cy + bl, lab, ink);
  y += 26; caption('A hollow ring means the latest keyframe is a battle day old or more: carried forward, not freshly reported.'); y += 8;
  return y;
}
const FIG_H = 572;

const DEF = {
  id: 'quiet-cartographer', label: 'Quiet Cartographer', version: '3.0', tokens: QC_TOKENS, fonts: FONTS, footprint: FOOT, sizer: makeSizer,
  channels: { side: true, facing: true, arm: ['infantry', 'cavalry', 'artillery', 'formation'], fix: true, aggregate: true, idOnly: true, selection: true },
  draw: { tile, pin, leader, hull }, sample, figure, figureH: FIG_H, fallbackSwatch: '#8aa0b8',
};
const withDay = (rows) => rows.map((r) => (QC_DAY[r[0]] !== undefined ? [r[0], QC_DAY[r[0]], r[2], r[3]] : r));
if (typeof window !== 'undefined') window.__qcSkin = { codeOf, compactName, plan, sgnOf };      // for the checking tools (tools/textfit.mjs reads the real code and name functions, not a copy)
export const QUIET_NIGHT = defineFamily(DEF, QC_NIGHT_VARIANTS);
export const QUIET_DAY = defineFamily({ ...DEF, id: 'quiet-cartographer-day', label: 'Quiet Cartographer (day)', tokens: withDay(QC_TOKENS) }, QC_DAY_VARIANTS);
