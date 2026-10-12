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
import { compactDesignation } from '../layout/tiles.mjs';
import { FONTS, FORMATION_KINDS } from './semantics.mjs';
import { QC_TOKENS, QC_DAY, QC_NIGHT_VARIANTS, QC_DAY_VARIANTS } from './quiet-cartographer.spec.mjs';

const TAU = Math.PI * 2;
export const FOOT = { chipH: 18, chipMinW: 10, ring: 2, pinHalf: 2.5 };
const ECH_OF_KIND = { brigade: 1, battalion: 0, division: 2, corps: 3, army: 3 };
const ECH_SCALE = [1, 1, 1.14, 1.3];                      // a standard grows with the echelon it stands for: brigade 1, division 1.14, corps 1.3 (hierarchy from size first)

// ---- what a tile says (pure functions of the display tile or the unit) ---------------------------------------------------------------------------------------------------
const sideOf = (s) => (s === 'union' || s === 'confederate' || s === 'unknown' || s === 'mixed' ? s : 'unknown');
/** which way a mark reads: +1 from its near end to the right (Union, unknown, both sides), -1 from its near end to the left (Confederate): the armies face each other */
export const sgnOf = (side) => (side === 'confederate' ? -1 : 1);
/** the code of a unit as the map sets it: the data's short code is cut at 8 characters ("Zimmerma", "Alexande", "McGilver"); when it is a cut of the last part of the unit's own id, the id's word is used whole */
export function codeOf(u) {
  if (!u) return ''; const s = u.short || '';
  if (u.kind === 'battery' && /^U-(ART|HAB)-/.test(u.id || '')) {                       // a Union battery's id is its letter, its regiment and its state run together ("A1RI", "9MA", "EPA"): the same words, set apart
    let m = /^([A-Z])(\d+)([A-Z]{2,3})$/.exec(s); if (m) return `${m[1]}/${m[2]} ${m[3]}`;      // Battery A, 1st Rhode Island: "A/1 RI"
    m = /^(\d+)([A-Z]{2})IND$/.exec(s); if (m) return `${m[1]} ${m[2]} Ind`;                    // 1st New York Independent Battery: "1 NY Ind"
    m = /^(\d+)([A-Z]{2})$/.exec(s); if (m) return `${m[1]} ${m[2]} Bty`;                      // 9th Massachusetts Battery: "9 MA Bty"
    m = /^([A-Z])([A-Z]{2})$/.exec(s); if (m) return `${m[1]}/${m[2]}`;                         // Battery E, Pennsylvania: "E/PA"
  }
  if (s.length < 7) return s;
  const last = String(u.id || '').split('-').pop(); return last.length > s.length && last.startsWith(s) ? last : s;
}
/** the order of battle's own words, compacted for the map: the record's label is cut at 24 characters with an ellipsis in the data (122 of 478), so the designation is used instead, without its
 *  trailing parenthesis (the card carries that), with ordinals as numerals and Brigade / Division as Bde / Div.  A name that equals the code (a unit known by its id alone) is no name. */
export function compactName(u) {
  if (!u) return null; const label = u.label || '';
  let full = label.includes('…') && u.designation ? u.designation : (FORMATION_KINDS.has(u.kind) ? label : (u.designation || label));
  full = compactDesignation(full);
  return full && full !== u.short && full !== codeOf(u) ? full : null;
}
const NAMES = new WeakMap();
const nameOfUnit = (u) => { let n = NAMES.get(u); if (n === undefined) { n = compactName(u); NAMES.set(u, n); } return n; };
function infoOfUnit(u) { const flag = FORMATION_KINDS.has(u.kind); return { flag, side: sideOf(u.side), short: codeOf(u), name: nameOfUnit(u), idOnly: !u.inOob, count: null, ech: flag ? (ECH_OF_KIND[u.kind] ?? 1) : 0, agg: false }; }
function infoOfAgg(a) { return { flag: true, side: sideOf(a.side), short: a.short, name: a.name || null, tail: a.tail || null, idOnly: false, count: a.badge, ech: ECH_OF_KIND[a.kind] || 0, generic: a.kind === 'scope' || a.kind === 'contact', agg: true }; }
const infoOfTile = (t) => (t.kind === 'agg' ? infoOfAgg({ short: t.short, name: t.fname, tail: t.ftail, badge: t.badge, kind: t.nameKind, side: t.side }) : infoOfUnit(t.unit));
const detailOf = (z, P) => ({ uname: z >= P['detail.unitNameZoom'], hull: z >= P['detail.hullZoom'] });
/** progressive disclosure, as a map does it: a corps and a division are named first, a brigade from the middle scales, a unit's code from the opening zoom, its full name only close up; a crowd always says what it
 *  stands for; a selected mark always says all it can */
const wideScreen = (P) => (typeof innerWidth === 'number' ? innerWidth : 1440) >= P['detail.selectNameMinViewport'];
function textShown(info, z, P, sel) {
  if (sel && z >= P['detail.selectGrowZoom']) return true;      // a selected mark grows from this zoom; below it only its ring changes (measured: growing it at zoom 11 to 13 re-flowed a crowded field for ever, tools/probes/select-rest.mjs)
  if (!info.flag) return z >= P['detail.codeZoom'];
  if (info.agg) return z >= P['detail.crowdNameZoom'];
  return z >= (info.ech >= 3 ? P['detail.corpsNameZoom'] : info.ech === 2 ? P['detail.divisionNameZoom'] : P['detail.brigadeNameZoom']);
}
/** the lettering cut of a formation or crowd: a corps or a division in bold 13, a brigade or a crowd of brigades in semibold 12 */
const formFont = (info) => (info.ech >= 2 ? 'form' : 'brig');

/** the geometry of a mark: one function used by the layout (the footprint) and by the drawing (where each part goes), so the two cannot disagree.  Lengths run from the NEAR end of the mark (the pip's or the
 *  staff's end) toward the far end; `dx`, `dy` say where the box centre lies from the mark's true position (the pip's centre, the foot of the staff), so the layout can hang the box on it. */
export function plan(spec, P, info, z, sel) {
  const T = spec.text; const R = spec.ring; const D = detailOf(z, P); const txt = textShown(info, z, P, sel); const sgn = sgnOf(info.side);
  if (!info.flag) {
    const grow = sel && wideScreen(P) && z >= P['detail.selectGrowZoom']; const showName = !!info.name && (D.uname || grow); const font = info.idOnly ? 'codeI' : 'code';
    // POLISH 1: the full name REPLACES the code (round 0 printed "82 NY  82nd New York Infantry": the code was redundant once the name was there); the name is set in the code's own cut
    const codeW = txt && !showName ? T.width(font, info.short) : 0; const nameW = showName ? T.width('code', info.name) : 0; const lead = P['pip.size'] + (txt ? P['pip.gap'] : 0);
    const gaugeW = grow && showName ? P['gauge.gap'] + P['gauge.w'] : 0;                  // the strength hairline joins only a SELECTED mark: a full row of hairlines reads as dashes
    const bodyW = lead + codeW + nameW + gaugeW; const w = Math.ceil(bodyW + 2 * R); const near = R + P['pip.size'] / 2;
    return { flag: false, sgn, txt, font, codeW, nameW, showName, lead, bodyW, gaugeW, w, h: P['unit.h'] + 2 * R, near, dx: sgn * (w / 2 - near), dy: 0, D };
  }
  const font = formFont(info); const text = txt ? (info.name || info.short) : ''; const named = txt && !!info.name; const tailW = txt && info.tail ? T.width('name', info.tail) : 0; const mainW = txt ? T.width(font, text) : 0; const textW = mainW + tailW;
  const numW = info.count != null ? T.width('code', info.count) : 0; const es = ECH_SCALE[Math.min(3, info.ech || 0)];
  const flagH = P['flag.h'] * es; const flagW = info.count != null ? Math.max(P['flag.w'] * es, Math.ceil(numW + P['flag.notch'] + 2 * P['flag.padX'])) : P['flag.w'] * es;
  const lead = 1 + flagW + (txt ? P['flag.gap'] : 0); const bodyW = lead + textW; const w = Math.ceil(bodyW + 2 * R); const near = R + 1;        // the staff stands 1 px inside the footprint
  const dy = -(flagH / 2 - 1.5 + P['flag.staff']);                                       // the box centre lies this far above the foot of the staff
  return { flag: true, sgn, txt, text, font, named, textW, mainW, tailW, numW, flagW, flagH, lead, bodyW, w, h: P['formation.h'] + 2 * R, near, dx: sgn * (w / 2 - near), dy, D };
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
/** the flag of a standard, hung from the staff at x and flying in direction dir (+1 right, -1 left): a Union flag ends in a swallow-tail, a Confederate flag in a point, a flag of unknown side or of both sides is cut
 *  square / swallow-tailed; w = length, h = height, e = depth of the notch or the point */
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

function hatch(c, cx, cy, r, P, a) {                       // the contested side: diagonal hatching inside the current path
  c.save(); c.clip(); c.strokeStyle = rgba(P['color.halo'], 0.6 * a); c.lineWidth = 1; c.beginPath();
  for (let q = -2 * r; q < 2 * r; q += 3) { c.moveTo(cx + q - r, cy + r); c.lineTo(cx + q + r, cy - r); } c.stroke(); c.restore();
}

/** a pip: the symbol of a unit.  old = 0 fresh (light ring, solid side colour) .. 1 carried forward (a side-coloured ring, tinted glass inside).  scale 0..1.2 for arrival and hover */
function drawPip(c, P, arm, side, cx, cy, size, old, alpha, scale = 1) {
  const R = size / 2 * scale; if (R < 0.4) return; const col = sideHex(P, side); const hairline = P['pip.hairline']; const hollow = old * P['carried.hollow']; const rw = P['pip.ring'] + (P['pip.ringHollow'] - P['pip.ring']) * hollow;
  const base = c.globalAlpha; c.globalAlpha = base * alpha;
  if (hairline > 0) { pipPath(c, arm, cx, cy, R + hairline * 0.6); c.fillStyle = rgba(P['color.halo'], P['pip.hairlineAlpha']); c.fill(); }
  pipPath(c, arm, cx, cy, R); c.fillStyle = mixHex(P['color.ring'], col, hollow); c.fill();            // ring: light when fresh, the side colour when carried forward
  const ri = Math.max(0.5, R - rw);
  if (hollow < 0.99) { c.globalAlpha = base * alpha * (1 - hollow); pipPath(c, arm, cx, cy, ri); c.fillStyle = col; c.fill(); if (side === 'unknown') hatch(c, cx, cy, ri, P, 1); }
  if (hollow > 0.01) { c.globalAlpha = base * alpha * hollow; pipPath(c, arm, cx, cy, ri); c.fillStyle = rgba(P['color.glass'], P['carried.glass']); c.fill(); c.fillStyle = rgba(col, P['carried.tint']); c.fill(); }
  c.globalAlpha = base;
}

/** a standard: a staff whose foot stands at (sx, footY) and a flag flying in direction dir from the staff's top.  furl 0..1 = the flag unfurls on arrival.  old hollows it like a pip.  Returns the flag's own
 *  rectangle's centre (for the count) */
function drawStandard(c, P, side, sx, top, w, h, old, furl, dir, foot) {
  const e = P['flag.notch'] * h / P['flag.h']; const end = endOf(side); const hairline = P['pip.hairline']; const hollow = old * P['carried.hollow']; const fw = Math.max(1, w * furl); const col = side === 'mixed' ? P['color.unionFlag'] : flagHex(P, side);
  const bright = side === 'mixed' ? P['color.union'] : sideHex(P, side);
  c.lineCap = 'butt'; c.beginPath(); c.moveTo(sx, top - 1.2); c.lineTo(sx, foot); c.strokeStyle = rgba(P['color.halo'], 0.7); c.lineWidth = P['staff.width'] + hairline; c.stroke();
  c.strokeStyle = mixHex(P['color.ring'], bright, hollow * 0.9); c.lineWidth = P['staff.width']; c.beginPath(); c.moveTo(sx, top - 1.2); c.lineTo(sx, foot); c.stroke();
  const ink = (a, b) => (dir > 0 ? [a, b] : [b, a]);
  c.save(); c.beginPath(); { const [x0, x1] = ink(sx - 1, sx + dir * fw + dir * 3); c.rect(Math.min(x0, x1), top - 2, Math.abs(x1 - x0), h + 4); } c.clip();
  flagPath(c, sx, top, w, h, e, dir, end); c.lineWidth = hairline * 2 + 0.2; c.lineJoin = 'miter'; c.strokeStyle = rgba(P['color.halo'], P['pip.hairlineAlpha']); c.stroke(); c.fillStyle = rgba(P['color.halo'], P['pip.hairlineAlpha']); c.fill();      // dark hairline
  const edge = mixHex(P['color.ring'], bright, hollow); flagPath(c, sx, top, w, h, e, dir, end); c.fillStyle = edge; c.fill();          // the edge: light when fresh, the side colour when carried
  const ins = Math.max(0.7, P['pip.ring'] * 0.8); const b0 = c.globalAlpha;
  c.save(); const inner = (x) => x; flagPath(c, sx + dir * ins, top + ins, w - 2 * ins - (end === 'square' ? 0 : 0), h - 2 * ins, e * 0.8, dir, end); c.clip();
  if (side === 'mixed') {                                   // both sides: split diagonally, Union at the staff, Confederate at the fly
    c.fillStyle = P['color.unionFlag']; c.fillRect(Math.min(sx, sx + dir * w) - 1, top, w + 2, h);
    const a = sx + dir * w * 0.62; const b = sx + dir * w * 0.34; c.beginPath(); c.moveTo(a, top - 1); c.lineTo(sx + dir * (w + 2), top - 1); c.lineTo(sx + dir * (w + 2), top + h + 1); c.lineTo(b, top + h + 1); c.closePath(); c.fillStyle = P['color.confederateFlag']; c.fill();
    if (hollow > 0.01) { c.globalAlpha = b0 * hollow; c.fillStyle = rgba(P['color.glass'], P['carried.glass']); c.fillRect(Math.min(sx, sx + dir * w) - 1, top - 1, w + 2, h + 2); c.fillStyle = rgba(P['color.union'], P['carried.tint']); c.fillRect(Math.min(sx, sx + dir * w) - 1, top - 1, w / 2 + 2, h + 2); c.globalAlpha = b0; }
  } else {
    c.fillStyle = col; c.fillRect(Math.min(sx, sx + dir * w) - 1, top - 1, w + 2, h + 2);
    if (hollow > 0.01) { c.globalAlpha = b0 * hollow; c.fillStyle = rgba(P['color.glass'], P['carried.glass']); c.fillRect(Math.min(sx, sx + dir * w) - 1, top - 1, w + 2, h + 2); c.fillStyle = rgba(bright, P['carried.tint']); c.fillRect(Math.min(sx, sx + dir * w) - 1, top - 1, w + 2, h + 2); c.globalAlpha = b0; }
    if (side === 'unknown') hatch(c, sx + dir * w / 2, top + h / 2, w / 2, P, 1);
  }
  c.globalAlpha = b0; c.restore(); c.restore();
  void inner;
}

/** the strength hairline: a rounded track with the fill of this keyframe's strength over the reference strength (a Modelled state; the card has the numbers) */
function gauge(c, x, y, w, h, ratio, trackStyle, litStyle) {
  rrect(c, x, y, w, h, h / 2); c.fillStyle = trackStyle; c.fill();
  const f = clamp01(ratio); if (f > 0.01) { rrect(c, x, y, Math.max(h, w * f), h, h / 2); c.fillStyle = litStyle; c.fill(); }
}
function plate(c, P, x, y, w, h, a) {                     // the glass behind a mark: ONE rounded fill inside the footprint (zero on the night ground; a faint one on the day ground)
  if (a <= 0.004) return; rrect(c, x + 0.5, y + 0.5, w - 1, h - 1, Math.min(h / 2, 7)); c.fillStyle = rgba(P['color.halo'], a * 0.7); c.fill();
}
const easeOut = (x) => 1 - (1 - clamp01(x)) ** 3;

// ---- the tile -------------------------------------------------------------------------------------------------------------------------------------------------------------------
function tile(c, t, g) {
  const P = g.P; const vm = g.vm; const spec = g.env.spec; const info = infoOfTile(t); const side = info.side; const sel = !!t.selected;
  const pl = plan(spec, P, info, g.zoom, sel); const ring = spec.ring; const hw = g.hw; const hh = g.hh; const old = vm.carried; const base = c.globalAlpha; const sgn = pl.sgn;
  const X = (l) => (sgn > 0 ? -hw + l : hw - l);                  // a length from the near end of the mark -> x in the box
  const lo = -hw + ring - 0.5; const hi = hw - ring + 0.5; const enter = easeOut(g.enter); const hov = g.hov; const textAlpha = 1 - old * (1 - P['text.dimAlpha']); const ink = P['color.ink'];
  const nm = g.ease('name', pl.flag ? 0 : (pl.showName ? 1 : 0), 180);       // the full name grows in with the footprint (its own eased channel: it also fades when the zoom takes it away)
  plate(c, P, -hw + 0.5, -hh + 0.5, g.w - 1, g.h - 1, P['halo.plate'] * (0.7 + 0.3 * enter) + P['hover.plate'] * hov);
  if (!pl.flag) {
    const cy = 0; const arm = vm.arm === 'cavalry' || vm.arm === 'artillery' ? vm.arm : 'infantry'; const pc = X(ring + P['pip.size'] / 2);
    drawPip(c, P, arm, side, pc, cy, P['pip.size'] - 1, old, 1, (0.72 + 0.28 * enter) * (1 + 0.06 * hov));
    const baseY = g.cr(cy + P['code.baseline'], 0); const tk = g.ease('txt', pl.txt ? 1 : 0, 160); const tx = X(ring + P['pip.size'] + P['pip.gap']);
    if (tk * (1 - nm) > 0.01) putText(c, g, FONTS[pl.font], info.short, tx, baseY, ink, textAlpha * ss(0.25, 1, g.enter) * tk * (1 - nm), sgn, lo, hi);       // the code fades out as the name fades in, from the same place
    if (info.name && nm > 0.01) {
      putText(c, g, FONTS.code, info.name, tx, baseY, ink, nm * P['name.alpha'] * textAlpha, sgn, lo, hi);
      const gx = X(ring + P['pip.size'] + P['pip.gap'] + pl.nameW + P['gauge.gap'] + (sgn > 0 ? 0 : P['gauge.w'])); const gy = cy - P['gauge.h'] / 2; const gw = P['gauge.w']; const k = nm * textAlpha * g.sel;    // strength hairline (Modelled): only on the selected mark, once its name has grown in
      if (k > 0.02 && gx + gw < hi + 0.5 && gx > lo - 0.5) gauge(c, gx, gy, gw, P['gauge.h'], vm.ratio, rgba(ink, P['gauge.trackAlpha'] * k), rgba(ink, 0.92 * k));
    }
  } else {
    const sx = X(ring + 1); const top = -pl.flagH / 2 - 1.5; const foot = top + pl.flagH + P['flag.staff']; const furl = Math.max(0.25, enter);
    drawStandard(c, P, side, sx, top, pl.flagW, pl.flagH, old, furl, sgn, foot);
    if (info.count != null) {
      const flagMid = sx + sgn * (pl.flagW - (side === 'confederate' ? P['flag.notch'] * 0.4 : P['flag.notch'] * 0.6)) / 2;
      const hol = ss(0.42, 0.58, old * P['carried.hollow']); const b = c.globalAlpha; const by = g.cr(top + pl.flagH / 2 + P['code.baseline'] - 0.2, 0);      // the count is white on the cloth, ink on the glass, and changes over the narrow band in the middle (two numerals at half strength read as a grey smudge)
      if (hol < 0.99) { const sp = lettering(g, FONTS.code, info.count, P['color.numeral'], P['color.numeralHalo'], 0); c.globalAlpha = b * ss(0.4, 1, g.enter) * (1 - hol); c.drawImage(sp.img, flagMid - sp.tw / 2 - sp.x, by - sp.y, sp.w, sp.h); }
      if (hol > 0.01) { const sp = lettering(g, FONTS.code, info.count, ink, P['color.halo'], 0); c.globalAlpha = b * ss(0.4, 1, g.enter) * hol; c.drawImage(sp.img, flagMid - sp.tw / 2 - sp.x, by - sp.y, sp.w, sp.h); }
      c.globalAlpha = b;
    }
    const tx = X(ring + 1 + pl.flagW + P['flag.gap']); const baseY = g.cr(top + pl.flagH / 2 + P['code.baseline'] - 0.2 + (pl.font === 'form' ? 0.6 : 0), 0); const tk = g.ease('txt', pl.txt ? 1 : 0, 160);
    if (pl.text && tk > 0.01) {
      const ta = textAlpha * ss(0.25, 1, g.enter) * tk * (pl.font === 'brig' ? P['brig.alpha'] : 1); const mw = lettering(g, FONTS[pl.font], pl.text, tintHex(P, side)).tw; const x0 = sgn > 0 ? tx : tx - (mw + (info.tail ? lettering(g, FONTS.name, info.tail, tintHex(P, side)).tw : 0));
      putText(c, g, FONTS[pl.font], pl.text, x0, baseY, tintHex(P, side), ta, 1, lo, hi);
      if (info.tail) putText(c, g, FONTS.name, info.tail, x0 + mw, baseY, tintHex(P, side), ta * P['tail.alpha'], 1, lo, hi);
    }
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

// ---- pin, leader, hull: drawn only for the mark that is hovered or selected -------------------------------------------------------------------------------------------------
/** where the mark's own pip (or the foot of its staff) stands, in screen coordinates, given the box centre b: the box hangs from it by (dx, dy) */
function standing(t, g, b) {
  const P = g.P; const spec = g.env.spec; const pl = plan(spec, P, infoOfTile(t), g.zoom, !!t.selected); return [b[0] - pl.dx, b[1] - pl.dy];
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

// ---- the legend's swatches (18 x 12, centre at 0,0): the same drawing code ---------------------------------------------------------------------------------------------------
function sample(c, ch, v, g, w, h) {
  const P = g.P; const num = (s, x, col = P['color.numeral']) => { c.font = FONTS.code; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = col; c.fillText(s, x, 0.6); };
  if (ch === 'side') { if (v === 'mixed') { drawStandard(c, P, 'mixed', -6, -4.5, 12, 9, 0, 1, 1, 5); } else drawPip(c, P, 'infantry', v, 0, 0, 11, 0, 1); }
  else if (ch === 'arm') { if (v === 'formation') drawStandard(c, P, 'union', -5, -4.5, 11, 9, 0, 1, 1, 5); else if (v === 'infantry' || v === 'cavalry' || v === 'artillery') drawPip(c, P, v, 'union', 0, 0, 11, 0, 1); else return false; }
  else if (ch === 'echelon') { const es = ECH_SCALE[v - 1]; drawStandard(c, P, 'union', -5, -4.5 * es - 1, 11 * es, 9 * es, 0, 1, 1, 5.5 * es + 1); }
  else if (ch === 'fix') drawPip(c, P, 'infantry', 'union', 0, 0, 11, v === 'carried' ? 1 : 0, 1);
  else if (ch === 'strength') gauge(c, -8, -1.5, 16, 3, v, 'rgba(128,140,156,0.45)', P['color.ink']);
  else if (ch === 'aggregate') { drawStandard(c, P, 'union', -7, -4.5, 14, 9, 0, 1, 1, 5); num('5', -0.5); }
  else if (ch === 'idOnly') { c.font = FONTS.codeI; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = P['color.ink']; c.fillText('12 NC', 0, 0.6); }
  else if (ch === 'selection') { rrect(c, -8, -5, 16, 10, 5); c.strokeStyle = P['color.select']; c.lineWidth = 1.5; c.stroke(); }
  else if (ch === 'pin') { c.beginPath(); c.moveTo(-8, 3); c.lineTo(-1, -1); c.strokeStyle = P['color.ring']; c.lineWidth = 1; c.stroke(); c.beginPath(); c.arc(-1.5, -1, 2.4, 0, TAU); c.fillStyle = P['color.ring']; c.fill(); drawPip(c, P, 'infantry', 'union', 5, 1, 7, 0, 1); }
  else if (ch === 'facing') { drawPip(c, P, 'infantry', 'union', -6, 0, 6, 0, 1); c.fillStyle = rgba(P['color.ink'], 0.8); c.fillRect(-2, -0.5, 3.4, 1); drawPip(c, P, 'infantry', 'confederate', 6, 0, 6, 0, 1); c.fillRect(-1.4, 1.8, 3.4, 1); }
  else return false;
}

// ---- the legend's figure: the anatomy of the marks at their true size, drawn with the same code as the map (so it cannot drift) -----------------------------------------------------------
function wrapText(c, text, maxW) { const words = text.split(' '); const lines = []; let line = ''; for (const w of words) { const t = line ? line + ' ' + w : w; if (line && c.measureText(t).width > maxW) { lines.push(line); line = w; } else line = t; } if (line) lines.push(line); return lines; }
/** specimens in four rows (a unit, a formation, a crowd, a carried-forward unit), Union at the left reading rightward, Confederate at the right reading leftward, each with its one-sentence caption */
function figure(c, g, W) {
  const P = g.P; const ink = P['color.ink']; const mute = rgba(ink, 0.7); const faint = rgba(ink, 0.18); const FACE = FONTS.name.replace(/^400 12px /, ''); const cap = `400 11px ${FACE}`; const lab = `600 12px ${FACE}`; const labB = `700 13px ${FACE}`;
  const M = 14; let y = 6; c.textBaseline = 'alphabetic'; c.textAlign = 'left';
  const word = (s, x, yy, font, col, align = 'left') => { c.font = font; c.fillStyle = col; c.textAlign = align; c.fillText(s, x, yy); c.textAlign = 'left'; };
  const caption = (text) => { c.font = cap; const lines = wrapText(c, text, W - 2 * M); c.fillStyle = mute; for (const ln of lines) { c.fillText(ln, M, y + 10); y += 14; } };
  const rule = () => { c.strokeStyle = faint; c.lineWidth = 1; c.beginPath(); c.moveTo(M, y + 0.5); c.lineTo(W - M, y + 0.5); c.stroke(); y += 10; };
  const pipUnion = (arm, x, yy, old = 0) => drawPip(c, P, arm, 'union', x, yy, P['pip.size'] - 1, old, 1); const pipCsa = (arm, x, yy, old = 0) => drawPip(c, P, arm, 'confederate', x, yy, P['pip.size'] - 1, old, 1);
  const bl = P['code.baseline'];
  // row 1: units
  let cy = y + 12; const R = 2; const pc = M + R + P['pip.size'] / 2; const tg = P['pip.size'] / 2 + P['pip.gap'];
  pipUnion('infantry', pc, cy); word('71 PA', pc + tg, cy + bl, lab, ink); pipUnion('cavalry', pc + 84, cy); word('1 NJ', pc + 84 + tg, cy + bl, lab, ink); pipUnion('artillery', pc + 150, cy); word('B1RI', pc + 150 + tg, cy + bl, lab, ink);
  const pr = W - M - R - P['pip.size'] / 2; pipCsa('infantry', pr, cy); word('53 VA', pr - tg, cy + bl, lab, ink, 'right');
  y += 28; caption('A unit is a pip standing on its place, its code beside it: a disc is infantry, a diamond cavalry, a triangle artillery. The armies face each other: Union reads left to right, Confederate right to left.'); y += 4; rule();
  // row 2: formations
  cy = y + 16; const sf = (side, x, dir, es) => { const fh = P['flag.h'] * es; const top = cy - fh / 2 - 1.5; drawStandard(c, P, side, x, top, P['flag.w'] * es, fh, 0, 1, dir, top + fh + P['flag.staff']); };
  sf('union', M + 3, 1, 1); word("Harrow's Bde", M + 3 + P['flag.w'] + P['flag.gap'], cy + bl - 0.2, lab, P['color.tintUnion']); sf('union', M + 3 + 112, 1, 1.14); word('2nd Div', M + 3 + 112 + P['flag.w'] * 1.14 + P['flag.gap'], cy + bl, labB, P['color.tintUnion']);
  sf('confederate', W - M - 3, -1, 1); word("Kemper's Bde", W - M - 3 - P['flag.w'] - P['flag.gap'], cy + bl - 0.2, lab, P['color.tintConfederate'], 'right');
  y += 36; caption('A formation is a flag on a staff, and the foot of the staff stands on its place. A Union flag ends in a swallow-tail, a Confederate flag in a point; a division flies a larger flag, a corps the largest.'); y += 4; rule();
  // row 3: crowds
  cy = y + 16; const fw = 18; const ftop = cy - P['flag.h'] / 2 - 1.5;
  drawStandard(c, P, 'union', M + 3, ftop, fw, P['flag.h'], 0, 1, 1, ftop + P['flag.h'] + P['flag.staff']); word('5', M + 3 + (fw - P['flag.notch'] * 0.6) / 2, cy + bl - 0.2, FONTS.code, P['color.numeral'], 'center');
  c.font = lab; const tw = c.measureText('II Corps').width; word('II Corps', M + 3 + fw + P['flag.gap'], cy + bl - 0.2, lab, P['color.tintUnion']); word(', 1 unlisted', M + 3 + fw + P['flag.gap'] + tw, cy + bl - 0.2, `400 12px ${FACE}`, P['color.tintUnion']);
  { const sx = W - M - 3; drawStandard(c, P, 'confederate', sx, ftop, fw, P['flag.h'], 0, 1, -1, ftop + P['flag.h'] + P['flag.staff']); word('9', sx - (fw - P['flag.notch'] * 0.4) / 2, cy + bl - 0.2, FONTS.code, P['color.numeral'], 'center'); word("Pender's Div", sx - fw - P['flag.gap'], cy + bl - 0.2, labB, P['color.tintConfederate'], 'right'); }
  y += 36; caption('Units too close to stand apart merge into one flag. Its number counts the placement records it stands for, never men; its name is what they share, and "unlisted" counts those the order of battle gives no parent.'); y += 4; rule();
  // row 4: carried forward, selected
  cy = y + 12; pipUnion('infantry', pc, cy, 0); word('fresh', pc + tg, cy + bl, lab, ink); pipUnion('infantry', pc + 70, cy, 1); word('carried forward', pc + 70 + tg, cy + bl, lab, ink);
  pipUnion('infantry', pc + 200, cy, 0); c.strokeStyle = rgba(P['color.select'], 0.95); c.lineWidth = P['sel.width']; c.beginPath(); c.arc(pc + 200, cy, 9.5, 0, TAU); c.stroke(); word('selected', pc + 200 + 15, cy + bl, lab, ink);
  y += 26; caption('A hollow mark keeps its side colour: its latest keyframe is a battle day old or more. Point at a mark and a pin shows the true place of a mark that stands away from it.'); y += 6;
  return y;
}
const FIG_H = 366;

const DEF = {
  id: 'quiet-cartographer', label: 'Quiet Cartographer', version: '2.0', tokens: QC_TOKENS, fonts: FONTS, footprint: FOOT, sizer: makeSizer,
  channels: { side: true, facing: true, arm: ['infantry', 'cavalry', 'artillery', 'formation'], echelon: [2, 3, 4], fix: true, strength: [1, 0.4], aggregate: true, idOnly: true, selection: true, pin: true },
  draw: { tile, pin, leader, hull }, sample, figure, figureH: FIG_H, fallbackSwatch: '#8aa0b8',
};
const withDay = (rows) => rows.map((r) => (QC_DAY[r[0]] !== undefined ? [r[0], QC_DAY[r[0]], r[2], r[3]] : r));
if (typeof window !== 'undefined') window.__qcSkin = { codeOf, compactName, plan, sgnOf };      // for the checking tools (tools/textfit.mjs reads the real code and name functions, not a copy)
export const QUIET_NIGHT = defineFamily(DEF, QC_NIGHT_VARIANTS);
export const QUIET_DAY = defineFamily({ ...DEF, id: 'quiet-cartographer-day', label: 'Quiet Cartographer (day)', tokens: withDay(QC_TOKENS) }, QC_DAY_VARIANTS);
