// skins/quiet-cartographer.mjs - SKIN "QUIET CARTOGRAPHER" (art director 1 of the Battle Studio redesign: Apple Maps, Mapbox Studio, Swiss cartography, Eduard Imhof).
//
// The idea in one paragraph: a map is quiet when the eye is told what matters by size, weight and lightness and by nothing else.  So every unit is ONE small mark (a pip whose shape says its arm and
// whose colour says its side, with its short code set beside it as haloed lettering): no plate, no caption chip, no outline of any kind.  A formation is a different, larger kind of mark, a STANDARD
// (a small swallow-tail flag on a staff, bigger for a division and bigger again for a corps) with its name set in 13 px lettering; a crowd that cannot all stand on its own place merges into such a
// standard carrying the count of the units it stands for, and while it is hovered or selected hairlines run from it to the true position of every one of them.  Three levels of weight and no more:
// formations, units, the hairline detail.  Two type sizes (11 px and 13 px) and one numeral style (bold, tabular).  One device says "this is not a fresh report": the mark HOLLOWS (a side-coloured
// ring round dark glass for a pip, a paler flag).  When the map is zoomed in, the same mark GROWS: the full name (and a hairline for the strength) joins it inside its footprint; there is no second box.
//
// What it draws, and the evidence label of each channel, is in skins/semantics.mjs (the legend is generated from this file's own drawing).  Not drawn, on purpose: posture and arm state (Modelled,
// not vital; the inspector shows the disposition) and the corps badge (the code and the name carry the corps).  Position, strength and fix age are Modelled or Computed whatever the mark looks like.
import { defineFamily, clamp01, ss, mixHex, rgba, pinFade, skinKit } from './kit.mjs';
import { compactDesignation } from '../layout/tiles.mjs';
import { FONTS, FORMATION_KINDS } from './semantics.mjs';
import { QC_TOKENS, QC_DAY, QC_NIGHT_VARIANTS, QC_DAY_VARIANTS } from './quiet-cartographer.spec.mjs';

const TAU = Math.PI * 2;
export const FOOT = { chipH: 18, chipMinW: 10, ring: 2, pinHalf: 2.5 };
const ECH_OF_KIND = { brigade: 1, battalion: 0, division: 2, corps: 3, army: 3 };
const ECH_SCALE = [1, 1, 1.12, 1.26];                     // a standard grows with the echelon it stands for: brigade 1, division 1.12, corps 1.26 (hierarchy from size alone)

// ---- what a tile says (pure functions of the display tile or the unit) ---------------------------------------------------------------------------------------------------
const sideOf = (s) => (s === 'union' || s === 'confederate' || s === 'unknown' || s === 'mixed' ? s : 'unknown');
/** the order of battle's own words, compacted for the map: the record's label is cut at 24 characters with an ellipsis in the data (122 of 478), so the designation is used instead, without its
 *  trailing parenthesis (the card carries that), with ordinals as numerals and Brigade / Division as Bde / Div.  A name that equals the code (a unit known by its id alone) is no name. */
export function compactName(u) {
  if (!u) return null; const label = u.label || '';
  let full = label.includes('…') && u.designation ? u.designation : (FORMATION_KINDS.has(u.kind) ? label : (u.designation || label));
  full = compactDesignation(full);
  return full && full !== u.short ? full : null;
}
const NAMES = new WeakMap();
const nameOfUnit = (u) => { let n = NAMES.get(u); if (n === undefined) { n = compactName(u); NAMES.set(u, n); } return n; };
function infoOfUnit(u) { const flag = FORMATION_KINDS.has(u.kind); return { flag, short: u.short, name: nameOfUnit(u), idOnly: !u.inOob, count: null, ech: flag ? (ECH_OF_KIND[u.kind] ?? 1) : 0 }; }
function infoOfAgg(a) { return { flag: true, short: a.short, name: a.name || null, idOnly: false, count: a.badge, ech: ECH_OF_KIND[a.kind] || 0, generic: a.kind === 'scope' || a.kind === 'contact' }; }
const infoOfTile = (t) => (t.kind === 'agg' ? infoOfAgg({ short: t.short, name: t.fname, badge: t.badge, kind: t.nameKind }) : infoOfUnit(t.unit));
const detailOf = (z, P) => ({ uname: z >= P['detail.unitNameZoom'], hull: z >= P['detail.hullZoom'] });
/** progressive disclosure, as a map does it: a corps and a division are named first, a brigade and a unit's code from the middle scales, a unit's full name only close up; a selected mark always says all it can */
const wideScreen = (P) => (typeof innerWidth === 'number' ? innerWidth : 1440) >= P['detail.selectNameMinViewport'];
function textShown(info, z, P, sel) {
  if (sel && z >= P['detail.selectGrowZoom']) return true;      // a selected mark grows from this zoom; below it only its ring changes (measured: growing it at zoom 11 to 13 re-flowed a crowded field for ever, tools/probes/select-rest.mjs)
  if (!info.flag) return z >= P['detail.codeZoom'];
  if (info.generic) return z >= P['detail.scopeZoom'];
  return z >= (info.ech >= 3 ? P['detail.corpsNameZoom'] : info.ech === 2 ? P['detail.divisionNameZoom'] : P['detail.brigadeNameZoom']);
}

/** the geometry of a mark: one function used by the layout (the footprint) and by the drawing (where each part goes), so the two cannot disagree */
export function plan(spec, P, info, z, sel) {
  const T = spec.text; const ring = spec.ring; const D = detailOf(z, P); const txt = textShown(info, z, P, sel);
  if (!info.flag) {
    const grow = sel && wideScreen(P) && z >= P['detail.selectGrowZoom']; const showName = !!info.name && (D.uname || grow); const font = info.idOnly ? 'codeI' : 'code';
    const codeW = txt ? T.width(font, info.short) : 0; const nameW = showName ? T.width('name', info.name) : 0; const lead = P['pip.size'] + (txt ? P['pip.gap'] : 0);
    const gaugeW = grow && showName ? P['gauge.gap'] + P['gauge.w'] : 0;                  // the strength hairline joins only a SELECTED mark: a full row of hairlines reads as dashes
    const bodyW = lead + codeW + (showName ? P['name.gap'] + nameW : 0) + gaugeW;
    return { flag: false, txt, font, codeW, nameW, showName, lead, bodyW, gaugeW, w: Math.ceil(bodyW + 2 * ring), h: P['unit.h'] + 2 * ring, D };
  }
  const text = txt ? (info.name || info.short) : ''; const named = txt && !!info.name; const textW = txt ? T.width('form', text) : 0;
  const numW = info.count != null ? T.width('code', info.count) : 0; const es = ECH_SCALE[Math.min(3, info.ech || 0)];
  const flagH = P['flag.h'] * es; const flagW = info.count != null ? Math.max(P['flag.w'] * es, Math.ceil(numW + P['flag.notch'] + 2 * P['flag.padX'])) : P['flag.w'] * es;
  const lead = flagW + (txt ? P['flag.gap'] : 0); const bodyW = lead + textW;
  return { flag: true, txt, text, named, textW, numW, flagW, flagH, lead, bodyW, w: Math.ceil(bodyW + 2 * ring), h: P['formation.h'] + 2 * ring, D };
}

/** the sizer the layout calls (layout/spec.mjs, layout/tiles.mjs): footprint by detail level and selection */
function makeSizer(skin) {
  const P = skin.P;
  return {
    key: (u, z, sel) => { const info = infoOfUnit(u); return (textShown(info, z, P, sel) ? 't' : '-') + (z >= P['detail.unitNameZoom'] ? 'u' : '-') + (sel ? 's' : '-') + (wideScreen(P) ? 'w' : 'n') + skin.rev; },
    leaf: (spec, u, z, sel) => { const p = plan(spec, P, infoOfUnit(u), z, sel); return { w: p.w, h: p.h }; },
    agg: (spec, a) => { const p = plan(spec, P, infoOfAgg(a), a.zoom, false); return { w: p.w, h: p.h }; },
    selects: (z) => wideScreen(P) && z >= P['detail.selectGrowZoom'],      // does selecting a mark change what the layout must reserve at this zoom?  (below it, or on a narrow window, the selection is a ring and nothing moves)
  };
}

// ---- lettering sprites: haloed text is rendered once per (face, string, ink) and blitted: strokeText for 200 labels a frame would cost more than the whole rest of the frame -----------------
const SPR = new Map();
function makeCanvas(w, h) { if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h); const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
const pxOf = (font) => +(/(\d+(?:\.\d+)?)px/.exec(font) || [0, 11])[1];
let PROBE = null;
/** returns { img, x, y, w, h }: (x, y) is where the text baseline origin lies inside the sprite, w and h are CSS px */
function lettering(g, font, s, ink, haloHex) {
  const P = g.P; const dpr = g.dpr; const halo = haloHex || P['color.halo']; const key = font + '|' + s + '|' + ink + '|' + dpr + '|' + g.skin.rev + '|' + halo + P['halo.width'] + P['halo.alpha'];
  let e = SPR.get(key); if (e) return e;
  const size = pxOf(font); const pad = Math.ceil((P['halo.width'] + (P['halo.soft'] > 0 ? 2 : 0)) / 2) + 1;
  if (!PROBE) PROBE = makeCanvas(4, 4).getContext('2d'); PROBE.font = font; const tw = PROBE.measureText(s).width;
  const w = Math.ceil(tw) + 2 * pad; const h = Math.ceil(size * 1.3) + 2 * pad; const asc = Math.round(size * 0.97) + pad;
  const cv = makeCanvas(Math.ceil(w * dpr), Math.ceil(h * dpr)); const c = cv.getContext('2d'); c.scale(dpr, dpr); c.font = font; c.textBaseline = 'alphabetic'; c.textAlign = 'left'; c.lineJoin = 'round'; c.miterLimit = 2;
  if (P['halo.soft'] > 0 && P['halo.width'] > 0) { c.lineWidth = P['halo.width'] + 2; c.strokeStyle = rgba(halo, P['halo.soft']); c.strokeText(s, pad, asc); }
  if (P['halo.width'] > 0) { c.lineWidth = P['halo.width']; c.strokeStyle = rgba(halo, P['halo.alpha']); c.strokeText(s, pad, asc); }
  c.fillStyle = ink; c.fillText(s, pad, asc);
  e = { img: cv, x: pad, y: asc, w, h }; if (SPR.size > 3000) SPR.clear(); SPR.set(key, e); return e;
}
function putText(c, g, font, s, x, baseY, ink, alpha, clipX1) {
  if (!(alpha > 0.004) || !s) return; const sp = lettering(g, font, s, ink); const w = sp.w; const h = sp.h; const dx = x - sp.x; const dy = baseY - sp.y; const base = c.globalAlpha; c.globalAlpha = base * alpha;
  if (clipX1 !== undefined && dx + w > clipX1) { const keep = Math.max(0, clipX1 - dx); if (keep > 0) c.drawImage(sp.img, 0, 0, keep * g.dpr, h * g.dpr, dx, dy, keep, h); }
  else c.drawImage(sp.img, dx, dy, w, h);
  c.globalAlpha = base;
}

// ---- shapes ---------------------------------------------------------------------------------------------------------------------------------------------------------------------
function pipPath(c, arm, cx, cy, r) {
  c.beginPath();
  if (arm === 'cavalry') { const q = r * 1.16; c.moveTo(cx, cy - q); c.lineTo(cx + q, cy); c.lineTo(cx, cy + q); c.lineTo(cx - q, cy); c.closePath(); }
  else if (arm === 'artillery') { const q = r * 1.1; c.moveTo(cx, cy - q * 1.02); c.lineTo(cx + q * 1.02, cy + q * 0.74); c.lineTo(cx - q * 1.02, cy + q * 0.74); c.closePath(); }
  else c.arc(cx, cy, r, 0, TAU);
}
/** the flag of a standard: a rectangle with a swallow-tail, from x to x + w, y to y + h */
function flagPath(c, x, y, w, h, notch) { c.beginPath(); c.moveTo(x, y); c.lineTo(x + w, y); c.lineTo(x + w - notch, y + h / 2); c.lineTo(x + w, y + h); c.lineTo(x, y + h); c.closePath(); }
const sideHex = (P, side) => (side === 'union' ? P['color.union'] : side === 'confederate' ? P['color.confederate'] : P['color.unknown']);
const tintHex = (P, side) => (side === 'union' ? P['color.tintUnion'] : side === 'confederate' ? P['color.tintConfederate'] : side === 'unknown' ? P['color.tintUnknown'] : P['color.tintMixed']);
const rrect = (c, x, y, w, h, r) => { r = Math.min(r, w / 2, h / 2); c.beginPath(); c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.arcTo(x + w, y, x + w, y + r, r); c.lineTo(x + w, y + h - r); c.arcTo(x + w, y + h, x + w - r, y + h, r); c.lineTo(x + r, y + h); c.arcTo(x, y + h, x, y + h - r, r); c.lineTo(x, y + r); c.arcTo(x, y, x + r, y, r); c.closePath(); };

function hatch(c, cx, cy, r, P, a) {                       // the contested side: diagonal hatching inside the current path
  c.save(); c.clip(); c.strokeStyle = rgba(P['color.halo'], 0.6 * a); c.lineWidth = 1; c.beginPath();
  for (let q = -2 * r; q < 2 * r; q += 3) { c.moveTo(cx + q - r, cy + r); c.lineTo(cx + q + r, cy - r); } c.stroke(); c.restore();
}

/** a pip: the symbol of a unit.  old = 0 fresh (light ring, solid side colour) .. 1 carried forward (side-coloured ring, dark glass).  scale 0..1.2 for arrival and hover */
function drawPip(c, P, arm, side, cx, cy, size, old, alpha, scale = 1) {
  const R = size / 2 * scale; if (R < 0.4) return; const col = sideHex(P, side); const hairline = P['pip.hairline']; const rw = P['pip.ring']; const hollow = old * P['carried.hollow'];
  const base = c.globalAlpha; c.globalAlpha = base * alpha;
  if (hairline > 0) { pipPath(c, arm, cx, cy, R + hairline * 0.6); c.fillStyle = rgba(P['color.halo'], P['pip.hairlineAlpha']); c.fill(); }
  pipPath(c, arm, cx, cy, R); c.fillStyle = mixHex(P['color.ring'], col, hollow); c.fill();            // ring: light when fresh, the side colour when carried forward
  const ri = Math.max(0.5, R - rw);
  if (hollow < 0.99) { c.globalAlpha = base * alpha * (1 - hollow); pipPath(c, arm, cx, cy, ri); c.fillStyle = col; c.fill(); if (side === 'unknown') hatch(c, cx, cy, ri, P, 1); }
  if (hollow > 0.01) { c.globalAlpha = base * alpha * hollow; pipPath(c, arm, cx, cy, ri); c.fillStyle = rgba(P['color.halo'], 0.78); c.fill(); c.fillStyle = rgba(col, 0.16); c.fill(); }
  c.globalAlpha = base;
}

/** a standard: staff and flag (side colour; split for both sides; paler when carried forward).  (x, y) = top-left of the flag; furl 0..1 = the flag unfurls on arrival */
function drawStandard(c, P, side, x, y, w, h, old, furl) {
  const notch = P['flag.notch'] * h / P['flag.h']; const col = side === 'mixed' ? P['color.union'] : sideHex(P, side); const hairline = P['pip.hairline']; const dim = old * P['carried.hollow'];
  const staffBottom = y + h + P['flag.staff']; const fw = Math.max(1, w * furl);
  c.lineCap = 'butt'; c.beginPath(); c.moveTo(x - 0.55, y - 1.2); c.lineTo(x - 0.55, staffBottom); c.strokeStyle = rgba(P['color.halo'], 0.62); c.lineWidth = 1.1 + hairline; c.stroke();
  c.strokeStyle = mixHex(P['color.ring'], col, dim * 0.8); c.lineWidth = 1.1; c.beginPath(); c.moveTo(x - 0.55, y - 1.2); c.lineTo(x - 0.55, staffBottom); c.stroke();
  c.save(); c.beginPath(); c.rect(x - 1, y - 2, fw + 3, h + 4); c.clip();
  flagPath(c, x - hairline * 0.5, y - hairline * 0.5, w + hairline, h + hairline, notch); c.fillStyle = rgba(P['color.halo'], P['pip.hairlineAlpha']); c.fill();      // dark hairline
  flagPath(c, x, y, w, h, notch); c.fillStyle = mixHex(P['color.ring'], col, dim * 0.85); if (side === 'mixed') c.fillStyle = mixHex(P['color.ring'], P['color.tintMixed'], dim); c.fill();   // light edge, side-coloured when carried
  const ins = Math.max(0.6, P['pip.ring'] * 0.9); const b0 = c.globalAlpha;
  c.save(); flagPath(c, x + ins, y + ins, w - 2 * ins, h - 2 * ins, notch * 0.85); c.clip();
  if (side === 'mixed') {                                   // both sides: split diagonally, Union at the staff, Confederate at the tail
    c.globalAlpha = b0 * (1 - 0.4 * dim); c.fillStyle = P['color.union']; c.fillRect(x, y, w, h);
    c.beginPath(); c.moveTo(x + w * 0.6, y - 1); c.lineTo(x + w + 2, y - 1); c.lineTo(x + w + 2, y + h + 1); c.lineTo(x + w * 0.36, y + h + 1); c.closePath(); c.fillStyle = P['color.confederate']; c.fill();
  } else {
    c.fillStyle = rgba(P['color.halo'], 0.7 * dim); c.fillRect(x, y, w, h); c.globalAlpha = b0 * (1 - 0.42 * dim); c.fillStyle = col; c.fillRect(x, y, w, h);
    if (side === 'unknown') { flagPath(c, x + ins, y + ins, w - 2 * ins, h - 2 * ins, notch * 0.85); hatch(c, x + w / 2, y + h / 2, w / 2, P, 1); }
  }
  c.globalAlpha = b0; c.restore(); c.restore();
}

/** the strength hairline: a rounded track with the fill of this keyframe's strength over the reference strength (a Modelled state; the card has the numbers) */
function gauge(c, x, y, w, h, ratio, trackStyle, litStyle) {
  rrect(c, x, y, w, h, h / 2); c.fillStyle = trackStyle; c.fill();
  const f = clamp01(ratio); if (f > 0.01) { rrect(c, x, y, Math.max(h, w * f), h, h / 2); c.fillStyle = litStyle; c.fill(); }
}
function plate(c, P, x, y, w, h, a) {                     // the glass behind a mark: ONE rounded fill inside the footprint (it was three feathered layers; they cost 4.7 of the 9.7 ms to draw 355 marks and the difference was below 2 % of the ground's luminance)
  if (a <= 0.004) return; rrect(c, x + 0.5, y + 0.5, w - 1, h - 1, Math.min(h / 2, 7)); c.fillStyle = rgba(P['color.halo'], a * 0.7); c.fill();
}
const easeOut = (x) => 1 - (1 - clamp01(x)) ** 3;

// ---- the tile -------------------------------------------------------------------------------------------------------------------------------------------------------------------
function tile(c, t, g) {
  const P = g.P; const vm = g.vm; const spec = g.env.spec; const side = sideOf(vm.side); const info = infoOfTile(t); const sel = !!t.selected;
  const pl = plan(spec, P, info, g.zoom, sel); const ring = spec.ring; const hw = g.hw; const hh = g.hh; const old = vm.carried; const base = c.globalAlpha;
  const x0 = -hw + ring; const enter = easeOut(g.enter); const hov = g.hov; const textAlpha = 1 - old * (1 - P['text.dimAlpha']); const ink = P['color.ink'];
  const nm = g.ease('name', pl.flag ? 0 : (pl.showName ? 1 : 0), 180);       // the full name grows in with the footprint (its own eased channel: it also fades when the zoom takes it away)
  plate(c, P, -hw + 0.5, -hh + 0.5, g.w - 1, g.h - 1, P['halo.plate'] * (0.7 + 0.3 * enter) + P['hover.plate'] * hov);
  if (!pl.flag) {
    const cy = -0.5; const px = x0 + P['pip.size'] / 2; const arm = vm.arm === 'cavalry' || vm.arm === 'artillery' ? vm.arm : 'infantry';
    drawPip(c, P, arm, side, px, cy, P['pip.size'] - 1, old, 1, (0.72 + 0.28 * enter) * (1 + 0.06 * hov));
    const tx = x0 + pl.lead; const baseY = g.cr(cy + 3.5, 0); const tk = g.ease('txt', pl.txt ? 1 : 0, 160);
    if (tk > 0.01) putText(c, g, FONTS[pl.font], info.short, x0 + P['pip.size'] + P['pip.gap'], baseY, ink, textAlpha * ss(0.25, 1, g.enter) * tk, hw - ring);
    if (info.name && nm > 0.01) {
      const nx = x0 + P['pip.size'] + P['pip.gap'] + pl.codeW + P['name.gap']; putText(c, g, FONTS.name, info.name, nx, baseY, ink, nm * P['name.alpha'] * textAlpha, hw - ring);
      const gx = nx + pl.nameW + P['gauge.gap']; const gy = cy - P['gauge.h'] / 2; const gw = P['gauge.w']; const k = nm * textAlpha * g.sel;    // strength hairline (Modelled): only on the selected mark, once its name has grown in
      if (k > 0.02 && gx + gw < hw - ring + 0.5) gauge(c, gx, gy, gw, P['gauge.h'], vm.ratio, rgba(ink, P['gauge.trackAlpha'] * k), rgba(ink, 0.92 * k));
    }
  } else {
    const flagX = x0 + 1.5; const flagY = -pl.flagH / 2 - 1.5; const furl = Math.max(0.25, enter);
    drawStandard(c, P, side, flagX, flagY, pl.flagW, pl.flagH, old, furl);
    if (info.count != null) {
      const sp = lettering(g, FONTS.code, info.count, P['color.numeral'], P['color.numeralHalo']); const b = c.globalAlpha; c.globalAlpha = b * ss(0.4, 1, g.enter);
      c.drawImage(sp.img, flagX + (pl.flagW - P['flag.notch'] * 0.6) / 2 - sp.w / 2 + 0.3, g.cr(flagY + pl.flagH / 2 + 3.9, 0) - sp.y, sp.w, sp.h); c.globalAlpha = b;
    }
    const tx = x0 + pl.flagW + P['flag.gap']; const baseY = g.cr(flagY + pl.flagH / 2 + 4.5, 0); const tk = g.ease('txt', pl.txt ? 1 : 0, 160);
    if (pl.text && tk > 0.01) putText(c, g, FONTS.form, pl.text, tx, baseY, tintHex(P, side), textAlpha * ss(0.25, 1, g.enter) * tk, hw - ring);
  }
  if (g.hov > 0.01 && g.sel < 0.5) {                         // hover: a fainter ring than the selection's, in the same place
    const lw = 1; rrect(c, -hw + lw / 2 + 0.25, -hh + lw / 2 + 0.25, g.w - lw - 0.5, g.h - lw - 0.5, P['sel.radius']); c.strokeStyle = rgba(P['color.select'], 0.5 * g.hov); c.lineWidth = lw; c.stroke();
  }
  if (g.sel > 0.003) {                                       // selection: a hairline ring in the footprint's own margin, easing in; the mark has already grown to show its name
    const s = g.sel; const lw = P['sel.width']; rrect(c, -hw + lw / 2 + 0.25, -hh + lw / 2 + 0.25, g.w - lw - 0.5, g.h - lw - 0.5, P['sel.radius']);
    c.strokeStyle = rgba(P['color.select'], 0.95 * s); c.lineWidth = lw; c.stroke(); c.fillStyle = rgba(P['color.select'], 0.07 * s); c.fill();
  }
  c.globalAlpha = base;
}

// ---- pin, leader, hull ---------------------------------------------------------------------------------------------------------------------------------------------------------
/** the nearest point of a mark's footprint to a point: where a leader ends */
function edgePoint(b, a, t, pad) { const hw = t.w * t.scale / 2 - pad; const hh = t.h * t.scale / 2 - pad; return [Math.max(b[0] - hw, Math.min(a[0], b[0] + hw)), Math.max(b[1] - hh, Math.min(a[1], b[1] + hh))]; }
/** how far the true position lies outside its mark's footprint (0 when it lies under the mark), and how visible the pin and leader are: a mark only a little off its place needs no pin at all (the pin is still a keep-out
 *  for every other mark, so nothing can cover it); a mark far off shows it; hovering or selecting a mark always shows it */
function pinState(t, P, zoom) {
  const hw = t.w * t.scale / 2; const hh = t.h * t.scale / 2; const d = Math.hypot(Math.max(Math.abs(t.x - t.ax) - hw, 0), Math.max(Math.abs(t.y - t.ay) - hh, 0));
  const on = t.selected || skinKit.hover() === t.key; return { d, k: Number.isFinite(d) ? (on ? ss(1, 4, d) : ss(P['pin.minPx'], P['pin.minPx'] + 8, d) * ss(P['pin.zoom0'], P['pin.zoom1'], zoom)) : 0 };
}
function pin(c, t, g) {
  const P = g.P; const k = pinState(t, P, g.zoom).k; if (k < 0.02) return; const r = P['pin.r']; const base = c.globalAlpha; c.globalAlpha = base * k;
  c.beginPath(); c.arc(0, 0, r + 1.1, 0, TAU); c.fillStyle = rgba(P['color.halo'], 0.62); c.fill();
  c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fillStyle = P['color.ring']; c.fill();
  c.beginPath(); c.arc(0, 0, Math.max(0.6, r - 1.15), 0, TAU); c.fillStyle = sideHex(P, sideOf(g.vm.side === 'mixed' ? 'union' : g.vm.side)); c.fill(); c.globalAlpha = base;
}
function leader(c, t, g, a, b) {
  const P = g.P; const k = pinState(t, P, g.zoom).k; if (k < 0.02) return; const e = edgePoint(b, a, t, 1); const base = c.globalAlpha; c.globalAlpha = base * P['leader.alpha'] * k; c.lineCap = 'round';
  c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(e[0], e[1]); c.strokeStyle = rgba(P['color.halo'], 0.5); c.lineWidth = P['leader.width'] + 1.4; c.stroke();
  c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(e[0], e[1]); c.strokeStyle = tintHex(P, sideOf(g.vm.side)); c.lineWidth = P['leader.width']; c.stroke(); c.globalAlpha = base;
}
/** an aggregate stands for its units: while it is hovered or selected, a hairline runs from it to the true position of each one, which carries a small dot */
function hull(c, t, g, pts) {
  const P = g.P; if (g.zoom < P['detail.hullZoom'] || !pts.length) return; const on = t.selected || skinKit.hover() === t.key; if (!on) return;
  const view = g.env.view || { dx: 0, dy: 0 }; const cx = t.x + view.dx; const cy = t.y + view.dy; const base = c.globalAlpha; const side = sideOf(g.vm.side); const e0 = [cx, cy];
  c.lineCap = 'round'; c.beginPath(); for (const p of pts) { const e = edgePoint(e0, p, t, 2); c.moveTo(e[0], e[1]); c.lineTo(p[0], p[1]); }
  c.globalAlpha = base * P['hull.leader']; c.strokeStyle = rgba(P['color.halo'], 0.5); c.lineWidth = 2.2; c.stroke(); c.strokeStyle = tintHex(P, side); c.lineWidth = 0.9; c.stroke();
  c.globalAlpha = base * 0.95; const r = P['hull.dot'];
  for (const p of pts) { c.beginPath(); c.arc(p[0], p[1], r + 1, 0, TAU); c.fillStyle = rgba(P['color.halo'], 0.62); c.fill(); c.beginPath(); c.arc(p[0], p[1], r, 0, TAU); c.fillStyle = P['color.ring']; c.fill(); }
  c.globalAlpha = base;
}

// ---- the legend's swatches (18 x 12, centre at 0,0): the same drawing code ---------------------------------------------------------------------------------------------------
function sample(c, ch, v, g, w, h) {
  const P = g.P;
  if (ch === 'side') { if (v === 'mixed') drawStandard(c, P, 'mixed', -6.5, -5, 13, 10, 0, 1); else drawPip(c, P, 'infantry', v, 0, 0, 11, 0, 1); }
  else if (ch === 'arm') { if (v === 'formation') drawStandard(c, P, 'union', -6.5, -5, 13, 10, 0, 1); else if (v === 'infantry' || v === 'cavalry' || v === 'artillery') drawPip(c, P, v, 'union', 0, 0, 11, 0, 1); else return false; }
  else if (ch === 'echelon') { const es = ECH_SCALE[v - 1]; drawStandard(c, P, 'union', -6.5, -5 * es, 12 * es, 10 * es, 0, 1); }
  else if (ch === 'fix') drawPip(c, P, 'infantry', 'union', 0, 0, 11, v === 'carried' ? 1 : 0, 1);
  else if (ch === 'strength') gauge(c, -8, -1.5, 16, 3, v, 'rgba(128,140,156,0.45)', P['color.ink']);
  else if (ch === 'aggregate') { drawStandard(c, P, 'union', -8, -5, 16, 10, 0, 1); c.font = FONTS.code; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#fff'; c.fillText('5', -1.6, 0.4); }
  else if (ch === 'idOnly') { c.font = FONTS.codeI; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = P['color.ink']; c.fillText('12', 0, 0.6); }
  else if (ch === 'selection') { rrect(c, -8, -5, 16, 10, 5); c.strokeStyle = P['color.select']; c.lineWidth = 1.5; c.stroke(); }
  else if (ch === 'pin') { c.beginPath(); c.moveTo(-8, 3); c.lineTo(-1, -1); c.strokeStyle = P['color.ring']; c.lineWidth = 1; c.stroke(); c.beginPath(); c.arc(-1.5, -1, 2.4, 0, TAU); c.fillStyle = P['color.ring']; c.fill(); drawPip(c, P, 'infantry', 'union', 5, 1, 7, 0, 1); }
  else return false;
}

const DEF = {
  id: 'quiet-cartographer', label: 'Quiet Cartographer', version: '1.0', tokens: QC_TOKENS, fonts: FONTS, footprint: FOOT, sizer: makeSizer,
  channels: { side: true, arm: ['infantry', 'cavalry', 'artillery', 'formation'], echelon: [2, 3, 4], fix: true, strength: [1, 0.4], aggregate: true, idOnly: true, selection: true, pin: true },
  draw: { tile, pin, leader, hull }, sample, fallbackSwatch: '#8aa0b8',
};
const withDay = (rows) => rows.map((r) => (QC_DAY[r[0]] !== undefined ? [r[0], QC_DAY[r[0]], r[2], r[3]] : r));
export const QUIET_NIGHT = defineFamily(DEF, QC_NIGHT_VARIANTS);
export const QUIET_DAY = defineFamily({ ...DEF, id: 'quiet-cartographer-day', label: 'Quiet Cartographer (day)', tokens: withDay(QC_TOKENS) }, QC_DAY_VARIANTS);
