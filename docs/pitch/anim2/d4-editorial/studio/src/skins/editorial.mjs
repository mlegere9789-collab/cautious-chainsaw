// skins/editorial.mjs - SKIN "DISPATCH" (art direction 4, Editorial Annotation), round 2: the map is the hero, the marks are quiet narrators.
//
// THE RULES (SPEC.md section 2 says why; every number is a token in editorial.spec.mjs):
//   ONE MARK PER UNIT.  A unit is a bold disc (Union circle, Confederate rounded square): infantry the plain disc, cavalry a slash, artillery a dot.  Its CODE is text that takes free ground beside it
//     (a label of the display layer: right, else left) and its full NAME grows out of the code (the hovered or selected unit at any zoom, every unit from the name zoom).  No plate, no caption box.
//     A formation record (a brigade, division or corps) is a standard with its NAME inside its own box; a crowd is a tab with a pile behind it, a count and its name.
//   THREE SILHOUETTES, THREE SIZES.  Unit: a disc 15 px across.  Formation: a standard that grows with the echelon (32x20, 40x25, 48x30) and carries one, two or three bars.  Crowd: a smaller tab (25x17)
//     with a pile behind it and the count: so the eye reads corps > division > brigade > unit > crowd, by shape as well as by size, and never by colour alone.
//   QUIET.  No dashed outline, no corner chip, no strength ring (the strength is on the card, Modelled), no plate.  Age is one device: a mark whose latest keyframe is a battle day old or more is OUTLINED, a
//     pale tint of its own hue inside an outline in the side colour, so it keeps the contrast of a fresh one (recency must not read as importance).
//   TRUE TO THE DATA.  The disc stands on the unit's true position: its box is the disc.  Every channel drawn is a field of the data: side, arm, echelon, age, identity ("id only" = italic code), crowd count.
//
// The drawing is sprite-based: a disc, a standard and a run of text are rasterised once per state and device-pixel ratio and then copied (drawImage), so 400 marks at 60 frames a second cost
// about as much as 400 rectangles.  The skin contract (contract.mjs) holds: every ink of tile() stays inside the box that size() returned, every ink of label() inside the label rectangle, the pin inside
// pinHalf (test/editorial.test.mjs checks all three with a recording context).
import { defineFamily, clamp01, ss, mixHex, rgba } from './kit.mjs';
import { DISPATCH_TOKENS, DP_VARIANTS, DA_SET, DA_VARIANTS, fadeFill, ageInk, fadeT } from './editorial.spec.mjs';

export const FONT = '"Inter", "Segoe UI", system-ui, -apple-system, Roboto, Arial, sans-serif';
export const SERIF = '"Source Serif 4", Georgia, "Iowan Old Style", "Times New Roman", serif';
export const MARK_FONTS = { code: `600 12px ${FONT}`, label: `600 12px ${FONT}`, badge: `700 13px ${FONT}` };     // what the layout measures (layout/text.mjs FONT_SPECS is the same table)
const DETAIL_FONT = `500 11.5px ${FONT}`;                                                    // the second line of a crowd (measured with the 600 face of the code: never narrower than it draws)
const FOOT = { chipH: 24, chipPadX: 2, glyphW: 20, glyphGap: 3, chipMinW: 24, ring: 2, badgeGap: 3, labelH: 24, labelPadX: 0, labelGap: 0, pinHalf: 3.5 };
const TAU = Math.PI * 2;
const ECH_FLAG = ['', '', 'brigade', 'division', 'corps', 'corps'];
const BARS = { brigade: 1, division: 2, corps: 3 };

// ---- sprites ------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const mkCanvas = (w, h) => { try { if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h); if (typeof document !== 'undefined') { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; } } catch { /* no canvas: the skin draws directly */ } return null; };
const SPR = new Map();
/** a sprite centred on (0,0) in its own space: size in CSS px (rounded up to whole device pixels), painted once per key */
function sprite(key, wCss, hCss, dpr, paint) {
  let s = SPR.get(key); if (s) return s;
  const pw = Math.max(1, Math.ceil(wCss * dpr)); const ph = Math.max(1, Math.ceil(hCss * dpr)); const cv = mkCanvas(pw, ph); if (!cv) return null;
  const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, pw / 2, ph / 2); g.lineJoin = 'round'; g.lineCap = 'round'; paint(g);
  s = { cv, w: pw / dpr, h: ph / dpr }; if (SPR.size > 3000) SPR.clear(); SPR.set(key, s); return s;
}
const blit = (c, s, x, y, alpha) => { if (alpha !== undefined && alpha !== 1) { const a = c.globalAlpha; c.globalAlpha = a * alpha; c.drawImage(s.cv, x - s.w / 2, y - s.h / 2, s.w, s.h); c.globalAlpha = a; } else c.drawImage(s.cv, x - s.w / 2, y - s.h / 2, s.w, s.h); };

/** a run of haloed text, rasterised once: the sprite's left edge is the text's origin minus `pad` */
function textSprite(g, text, font, italic, color) {
  const P = g.P; const dpr = g.dpr; const fnt = italic ? font.replace(/^(\d+)/, 'italic $1') : font; const ink = color || P['text.ink'];
  const key = `t|${g.skin.id}|${g.skin.rev}|${fnt}|${text}|${ink}|${dpr}`; let s = SPR.get(key); if (s) return s;
  const probe = mkCanvas(4, 4); if (!probe) return null; const pc = probe.getContext('2d'); pc.font = fnt; const tw = pc.measureText(text).width;
  const px = /(\d+(?:\.\d+)?)px/.exec(font) ? +/(\d+(?:\.\d+)?)px/.exec(font)[1] : 12; const hw = P['text.haloWidth']; const pad = Math.ceil(hw / 2 + 2); const wCss = tw + 2 * pad; const hCss = Math.ceil(px * 1.7 + 2 * pad);
  const pw = Math.ceil(wCss * dpr); const ph = Math.ceil(hCss * dpr); const cv = mkCanvas(pw, ph); const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.font = fnt; c.textBaseline = 'middle'; c.textAlign = 'left'; c.lineJoin = 'round'; c.lineCap = 'round'; const x = pad; const y = hCss / 2;
  if (hw > 0) { c.strokeStyle = rgba(P['text.halo'], P['text.haloAlpha'] * 0.32); c.lineWidth = hw + 2; c.strokeText(text, x, y); c.strokeStyle = rgba(P['text.halo'], P['text.haloAlpha']); c.lineWidth = hw; c.strokeText(text, x, y); }
  c.fillStyle = ink; c.fillText(text, x, y);
  s = { cv, w: pw / dpr, h: ph / dpr, pad, tw }; if (SPR.size > 3000) SPR.clear(); SPR.set(key, s); return s;
}
/** draw a text run with its origin at (x, yMid); falls back to plain text when there is no canvas to rasterise on (a node test with a recording context).
 *  o.clipW reveals the run from its left end, o.clipR from its right end (a name that grows to the left); o.right draws the run so that it ENDS at x. */
function textRun(c, g, text, font, x, yMid, o = {}) {
  const s = textSprite(g, text, font, o.italic, o.color);
  if (s) {
    const al = o.alpha === undefined ? 1 : o.alpha; if (al <= 0.004) return s.tw; const a0 = c.globalAlpha; c.globalAlpha = a0 * al; const x0 = o.right ? x - s.tw : x; const clip = o.clipW !== undefined;
    if (clip) { c.save(); c.beginPath(); if (o.right) c.rect(x0 + s.tw - o.clipW - 1, yMid - s.h / 2, o.clipW + s.pad + 1, s.h); else c.rect(x0 - s.pad - 1, yMid - s.h / 2, o.clipW + s.pad + 1, s.h); c.clip(); }
    c.drawImage(s.cv, x0 - s.pad, yMid - s.h / 2, s.w, s.h); if (clip) c.restore(); c.globalAlpha = a0; return s.tw;
  }
  c.font = font; c.textBaseline = 'middle'; c.textAlign = o.right ? 'right' : 'left'; c.fillStyle = o.color || g.P['text.ink']; c.fillText(text, x, yMid); return c.measureText ? c.measureText(text).width : text.length * 6;
}

// ---- geometry: the one place where the size of a mark is decided (used by size(), by every draw call and by the legend) ---------------------------------------------------------------------------
/** level of detail by zoom: at the overview a unit is a small bare dot, from about zoom 14.9 a full mark.  Quantised in twelfths so the sprites and the layout's box sizes come in a few sizes, not a continuum. */
export const lodOf = (z) => Math.round(ss(13.2, 14.9, z) * 12) / 12;
/** the frame of a mark: what stands on the true position (info.lod 0..1: the level of detail) */
function frameOf(P, info) {
  const UNIT_KINDS = ['regiment', 'battery', 'battalion'];                                      // a battalion is echelon 2 in the engine but is a unit (a slightly larger disc), never a brigade standard
  const kind = info.agg ? 'crowd' : UNIT_KINDS.includes(info.kind) ? 'unit' : (ECH_FLAG[info.echelon ?? 0] || (['brigade', 'division', 'corps', 'army'].includes(info.kind) ? { brigade: 'brigade', division: 'division', corps: 'corps', army: 'corps' }[info.kind] : 'unit'));
  const lod = info.lod ?? 1; const k = 0.6 + 0.4 * lod; const kr = 0.78 + 0.22 * lod; const rl = P['ring.light'] * kr; const rd = P['ring.dark'] * kr; const edge = rl + rd;
  if (kind === 'unit') { const r = (info.kind === 'battalion' ? P['mark.rBattalion'] : P['mark.r']) * k; return { kind, r, w: 2 * (r + edge), h: 2 * (r + edge), font: 'code', body: 2 * r, rl, rd, lod, k }; }
  const kf = kind === 'crowd' ? 0.88 + 0.12 * lod : 0.7 + 0.3 * lod; const w = P['flag.w.' + kind] * kf; const h = P['flag.h.' + kind] * kf; const st = kind === 'crowd' ? P['flag.stack'] * kf : 0;
  return { kind, bw: w, bh: h, w: w + 2 * edge + st, h: h + 2 * edge + st, stack: st, font: kind === 'crowd' ? 'code' : 'badge', body: Math.max(w, h), rl, rd, lod, k: kf };
}
/** the text of a mark as the tile draws it: a formation its name, a crowd its name; a unit none (its code is a label) */
const textOf = (info) => info.text || '';
function sizeOf(spec, info, P) {
  const f = frameOf(P, info); const txt = textOf(info); const dtl = info.agg && info.detail ? info.detail : ''; const tw = txt ? Math.max(Math.ceil(spec.text.width(f.font, txt)), dtl ? Math.ceil(spec.text.width('code', dtl)) : 0) : 0;
  const left = P['pad.left']; const gap = tw ? P['gap.text'] : 0; const right = P['pad.right'] + (tw ? Math.ceil(P['text.haloWidth'] / 2) : 0);
  const w = left + f.w + gap + tw + right; const h = Math.max(f.kind === 'unit' ? 17 : dtl ? 34 : 22, Math.ceil(f.h + 2 * P['pad.band']));      // a crowd's two lines of haloed text reach 17 px from the middle (measured by tools/skin-ink.mjs: 16.5 to 17)
  return { w, h, hx: w / 2 - (left + f.w / 2), hy: 0, textW: tw, font: f.font, frameW: f.w, frameH: f.h, kind: f.kind };
}
/** the code and the name of a unit, both text that takes free ground beside the disc: `cw` is the width of the code's rectangle, `w` the width of the name's (its code grows into it) */
function labelSizeOf(spec, info, P) {
  const cs = info.chip; if (!cs || cs.kind !== 'unit' || !info.text) return { w: 0, h: 0, cw: 0 };
  const code = info.code || info.text; const cw = Math.ceil(spec.text.width('label', code)) + 3; const nw = Math.ceil(spec.text.width('label', info.text)) + 3;
  return { w: nw < cw + 6 ? cw : nw, h: cs.h, cw };
}
/** where the text of a mark starts, from the true position (the disc centre), in CSS px */
const textStart = (P, f) => f.w / 2 + P['gap.text'];

// ---- colour of a mark -----------------------------------------------------------------------------------------------------------------------------------------------------------------
const sideColour = (P, side) => (side === 'union' ? P['color.union'] : side === 'confederate' ? P['color.confederate'] : P['color.unknown']);
const bucketOf = (carried) => Math.round(clamp01(carried) * 6) / 6;
const faded = (P, hex, b) => fadeFill(P, hex, b);

function shapePath(g, shape, s, cr) {                        // a closed path centred on 0,0, half-size s (the offset of a ring is a larger s with a larger cr)
  g.beginPath();
  if (shape === 'circle') g.arc(0, 0, s, 0, TAU);
  else if (shape === 'square') { rrp(g, -s, -s, 2 * s, 2 * s, cr); }
  else if (shape === 'diamond') { const d = s * 1.12; g.moveTo(0, -d); g.lineTo(d, 0); g.lineTo(0, d); g.lineTo(-d, 0); g.closePath(); }
}
function rrp(c, x, y, w, h, r) { r = Math.max(0, Math.min(r, w / 2, h / 2)); c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.arcTo(x + w, y, x + w, y + r, r); c.lineTo(x + w, y + h - r); c.arcTo(x + w, y + h, x + w - r, y + h, r); c.lineTo(x + r, y + h); c.arcTo(x, y + h, x, y + h - r, r); c.lineTo(x, y + r); c.arcTo(x, y, x + r, y, r); c.closePath(); }
/** a standard: swallow-tail (Union), point (Confederate), plain (contested); a crowd tab: rounded (Union, contested), chamfered (Confederate) */
function flagPath(g, kind, x, y, w, h, n, rad) {
  g.beginPath();
  if (kind === 'swallow') { g.moveTo(x + rad, y); g.lineTo(x + w, y); g.lineTo(x + w - n, y + h / 2); g.lineTo(x + w, y + h); g.lineTo(x + rad, y + h); g.arcTo(x, y + h, x, y + h - rad, rad); g.lineTo(x, y + rad); g.arcTo(x, y, x + rad, y, rad); }
  else if (kind === 'point') { g.moveTo(x + rad, y); g.lineTo(x + w - n, y); g.lineTo(x + w, y + h / 2); g.lineTo(x + w - n, y + h); g.lineTo(x + rad, y + h); g.arcTo(x, y + h, x, y + h - rad, rad); g.lineTo(x, y + rad); g.arcTo(x, y, x + rad, y, rad); }
  else if (kind === 'tab') rrp(g, x, y, w, h, Math.min(h / 2, 6));
  else if (kind === 'chamfer') { const k = Math.min(5, h / 3); g.moveTo(x + k, y); g.lineTo(x + w - k, y); g.lineTo(x + w, y + k); g.lineTo(x + w, y + h - k); g.lineTo(x + w - k, y + h); g.lineTo(x + k, y + h); g.lineTo(x, y + h - k); g.lineTo(x, y + k); }
  else rrp(g, x, y, w, h, rad);
  g.closePath();
}
const flagKindOf = (side, crowd) => (crowd ? (side === 'confederate' ? 'chamfer' : 'tab') : side === 'union' ? 'swallow' : side === 'confederate' ? 'point' : 'plain');
const unitShapeOf = (P, side) => (side === 'union' ? 'circle' : side === 'confederate' ? (P['unit.shape.confederate'] === 'circle' ? 'circle' : 'square') : 'diamond');

function hatch(g, ink, from, to, alpha) { g.save(); g.clip(); g.strokeStyle = rgba(ink, alpha); g.lineWidth = 1.2; g.beginPath(); for (let q = from; q < to; q += 3.4) { g.moveTo(q, to); g.lineTo(q + (to - from), from); } g.stroke(); g.restore(); }

/** the two rings of a mark, outermost first: dark outside on the light ground (its silhouette is dark against pale paper), light outside on the dark ground; both opaque */
function ringsOf(P, f) { const dark = [P['color.ringDark'], f.rd]; const light = [P['color.ringLight'], f.rl]; return P['ring.outer'] === 'light' ? [light, dark] : [dark, light]; }
/** the ink of a mark's glyph, bars and count: white when fresh, the side's own ink on the tint when aged (never the colour of the fill) */
const inkOf = (P, side, b, unk) => (unk ? P['color.unknownInk'] : ageInk(P, side, b));

/** the sprite of one unit mark: rings, fill, glyph; `b` is the age bucket (0 fresh .. 1 a battle day or more).  Aged: a tint with an outline in the side colour. */
function unitSprite(g, vm, f, b) {
  const P = g.P; const dpr = g.dpr; const side = vm.side === 'mixed' ? 'unknown' : vm.side; const key = `u|${g.skin.id}|${g.skin.rev}|${side}|${vm.arm}|${f.r.toFixed(2)}|${f.lod}|${b}|${dpr}`;
  const edge = f.rl + f.rd; const sz = Math.ceil(2 * (f.r + edge) + 4);
  return sprite(key, sz, sz, dpr, (c) => {
    const shape = unitShapeOf(P, side); const r = f.r; const unk = side === 'unknown'; const s0 = shape === 'square' ? r * 0.92 : r; const cr0 = 2.6 * f.k; const T = fadeT(b);
    const [outer, inner] = ringsOf(P, f);
    c.strokeStyle = outer[0]; c.lineWidth = outer[1]; shapePath(c, shape, s0 + inner[1] + outer[1] / 2, cr0 + inner[1] + outer[1] / 2); c.stroke();
    if (!(T > 0.5 && !unk && P['ring.outer'] !== 'light')) { c.strokeStyle = inner[0]; c.lineWidth = inner[1]; shapePath(c, shape, s0 + inner[1] / 2, cr0 + inner[1] / 2); c.stroke(); }          // an aged mark on the light ground keeps one ring outside its outline: the stack stays quiet
    shapePath(c, shape, s0, cr0); c.fillStyle = unk ? P['color.unknown'] : faded(P, sideColour(P, side), b); c.fill();
    if (unk) { shapePath(c, shape, s0, cr0); hatch(c, P['color.unknownInk'], -s0 * 1.4, s0 * 1.4, 0.34); }
    if (!unk && T > 0.5) { const w = Math.min(P['age.outline'] * f.k, s0 * 0.5); c.strokeStyle = ageInk(P, side, b); c.lineWidth = w; shapePath(c, shape, s0 - w / 2, Math.max(0.5, cr0 - w / 2)); c.stroke(); }
    const ink = inkOf(P, side, b, unk); const s = P['glyph.size'] * f.k; c.fillStyle = ink; c.strokeStyle = ink; c.lineWidth = P['glyph.stroke']; c.lineCap = 'round';
    if (f.lod < 0.5) { /* a bare dot at the overview: the arm is drawn from the level of detail up */ }
    else if (vm.arm === 'cavalry') { c.beginPath(); c.moveTo(-s, s * 0.85); c.lineTo(s, -s * 0.85); c.stroke(); }                 // the slash: cavalry
    else if (vm.arm === 'artillery') { c.beginPath(); c.arc(0, 0, s * 0.74, 0, TAU); c.fill(); }                              // the dot: artillery; infantry is the plain disc
  });
}
/** the two halves of a crowd that holds more than one side: [left, right] among union, confederate and unknown (the contested ones: amber, hatched, never a side) */
const halvesOf = (sides) => { const have = ['union', 'confederate', 'unknown'].filter((k) => sides && sides[k] > 0); if (have.length < 2) return ['union', 'confederate']; return [have[0], have[have.length - 1]]; };
/** the sprite of one standard (a formation record: bars) or of the crowd tab (a pile behind it; the count is drawn over it) */
function flagSprite(g, vm, f, b, bars) {
  const P = g.P; const dpr = g.dpr; const side = vm.side; const hv = side === 'mixed' ? halvesOf(vm.sides) : null; const crowd = f.kind === 'crowd'; const key = `f|${g.skin.id}|${g.skin.rev}|${side}|${hv ? hv.join('+') : ''}|${f.kind}|${f.lod}|${bars}|${b}|${dpr}`;
  const sw = Math.ceil(f.w + 4); const sh = Math.ceil(f.h + 4);
  return sprite(key, sw, sh, dpr, (c) => {
    const [outer, inner] = ringsOf(P, f); const T = fadeT(b); const n = P['flag.notch'] * f.k; const rad = P['flag.radius'] * f.k; const kind = flagKindOf(side === 'mixed' ? 'x' : side, crowd);
    const unk = side === 'unknown'; const mixed = side === 'mixed'; const bx = -f.bw / 2 + f.stack / 2; const by = -f.bh / 2 + f.stack / 2;                     // the body sits low and right; the pile peeks behind it up and left
    const paintOne = (x, y, alpha, top) => {
      c.globalAlpha = alpha;
      c.strokeStyle = outer[0]; c.lineWidth = 2 * (inner[1] + outer[1]); flagPath(c, kind, x, y, f.bw, f.bh, n, rad); c.stroke();
      c.strokeStyle = inner[0]; c.lineWidth = 2 * inner[1]; c.stroke();
      const hueOf = (k) => (k === 'unknown' ? P['color.unknown'] : faded(P, sideColour(P, k), b)); const fillC = unk ? P['color.unknown'] : mixed ? hueOf(hv[0]) : faded(P, sideColour(P, side), b);
      flagPath(c, kind, x, y, f.bw, f.bh, n, rad); c.fillStyle = fillC; c.fill();
      if (mixed) { c.save(); flagPath(c, kind, x, y, f.bw, f.bh, n, rad); c.clip(); c.fillStyle = hueOf(hv[1]); c.beginPath(); c.moveTo(x + f.bw * 0.62, y - 1); c.lineTo(x + f.bw + 2, y - 1); c.lineTo(x + f.bw + 2, y + f.bh + 1); c.lineTo(x + f.bw * 0.38, y + f.bh + 1); c.closePath(); c.fill(); if (hv[1] === 'unknown') hatch(c, P['color.unknownInk'], x - f.bh, x + f.bw + f.bh, 0.34); c.restore(); }
      if (unk) { flagPath(c, kind, x, y, f.bw, f.bh, n, rad); hatch(c, P['color.unknownInk'], x - f.bh, x + f.bw + f.bh, 0.34); }
      if (top && !unk && !mixed && T > 0.5) { const w = P['age.outline'] * f.k; c.save(); c.strokeStyle = ageInk(P, side, b); c.lineWidth = w * 2; flagPath(c, kind, x, y, f.bw, f.bh, n, rad); c.clip(); flagPath(c, kind, x, y, f.bw, f.bh, n, rad); c.stroke(); c.restore(); }
      c.globalAlpha = 1;
    };
    if (f.stack > 0) paintOne(bx - f.stack, by - f.stack, 0.7, false);
    paintOne(bx, by, 1, true);
    if (bars > 0) {                                                                                  // one, two or three chevrons (rank insignia): brigade, division, corps (a size cue that survives 1x)
      const ink = unk ? P['color.unknownInk'] : ageInk(P, mixed ? 'union' : side, b); c.strokeStyle = ink; c.lineWidth = P['bar.h'] * f.k; c.lineCap = 'round'; c.lineJoin = 'round'; const L = P['bar.len'] / 2 * f.k; const pitch = P['bar.pitch'] * f.k; const cx = bx + (f.bw - (kind !== 'plain' ? n : 0)) / 2; const cy = by + f.bh / 2; const hh = L * 0.5;
      const span = (bars - 1) * pitch; for (let i = 0; i < bars; i++) { const y0 = cy - span / 2 + i * pitch; c.beginPath(); c.moveTo(cx - L, y0 + hh / 2); c.lineTo(cx, y0 - hh / 2); c.lineTo(cx + L, y0 + hh / 2); c.stroke(); }
    }
  });
}
/** where the body of a standard stands, relative to the frame centre */
const flagBody = (f) => ({ x: f.stack / 2, y: f.stack / 2 });

const markRadius = (f) => (f.kind === 'unit' ? f.r + 2.5 : Math.hypot(f.bw, f.bh) / 2 + 1);

/** the outline of the hover and selection ring: a circle around a disc, the shape of the standard (a little larger) around a formation or a crowd; `trace(c)` builds the path, `len` is its length, `r` the radius of the circle */
function outlineOf(P, f, vm, cx, cy, boxH) {
  if (f.kind === 'unit') { const r = Math.min(markRadius(f) + 1.6, boxH / 2 - 1.1, 12.4); return { r, len: TAU * r, trace: (c) => { c.beginPath(); c.arc(cx, cy, r, 0, TAU); } }; }
  const e = f.rl + f.rd + 1.3; const kind = flagKindOf(vm.side === 'mixed' ? 'x' : vm.side, f.kind === 'crowd'); const bx = cx - f.bw / 2 + f.stack / 2 - e; const by = cy - f.bh / 2 + f.stack / 2 - e; const w = f.bw + 2 * e; const h = f.bh + 2 * e;
  return { r: 0, len: 2 * (w + h), trace: (c) => { flagPath(c, kind, bx, by, w, h, P['flag.notch'] * f.k, P['flag.radius'] * f.k + e); } };
}

// ---- the safe area: whole marks fade in and out at the edge of the map, never cut -------------------------------------------------------------------------------------------------------------------
/** a mark whose box is within `band` of the edge of the map is faded whole (1 at `band` or more from every edge, 0 when its box touches the edge) */
export function edgeAlpha(x0, y0, x1, y1, W, H, band) { if (!(band > 0)) return 1; const d = Math.min(x0, y0, W - x1, H - y1); return d >= band ? 1 : d <= 0 ? 0 : ss(0, band, d); }

// ---- tile: the mark ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
function tile(c, t, g) {
  const P = g.P; const vm = g.vm; const dpr = g.dpr;
  const f = frameOf(P, { agg: vm.agg, kind: vm.kind, echelon: vm.ech >= 2 ? vm.ech : 0, lod: lodOf(g.zoom) });
  const cx = -(t.hx || 0); const cy = -(t.hy || 0);                                          // the true position, in the box's own space
  const b = bucketOf(vm.carried); const a0 = c.globalAlpha;
  // arrival: the ring that leaves a mark when it appears (the settle is the engine's scale and fade)
  const st = g.st; const born = st ? (st.born ?? (st.born = g.now)) : g.now; const age = g.now - born; const rip = P['motion.rippleMs'];
  if (rip > 0 && age < rip && !g.reduced) { const k = clamp01(age / rip); const e = 1 - (1 - k) * (1 - k) * (1 - k); const R = markRadius(f); c.globalAlpha = a0 * 0.95 * (1 - k * k); c.strokeStyle = vm.side === 'unknown' ? P['color.unknown'] : sideColour(P, vm.side === 'mixed' ? 'union' : vm.side); c.lineWidth = 2.2 * (1 - 0.45 * k); c.beginPath(); c.arc(cx, cy, Math.min(R + 1 + e * 3.2, 11.6), 0, TAU); c.stroke(); c.globalAlpha = a0; }
  const bump = g.enter < 1 ? 0.075 * Math.sin(Math.PI * clamp01(g.enter)) : 0;                 // the settle of an arrival: the mark swells a little inside its own box on the way (never beyond the 2 px band)
  const lift = 1 + 0.08 * g.hov + bump;
  if (f.kind === 'unit') { const s = unitSprite(g, vm, f, b); if (s) { c.save(); c.translate(cx, cy); if (lift !== 1) c.scale(lift, lift); blit(c, s, 0, 0); c.restore(); } }
  else {
    const bars = vm.agg ? 0 : BARS[f.kind] || 1; const s = flagSprite(g, vm, f, b, bars); const fb = flagBody(f);
    if (s) { c.save(); c.translate(cx, cy); if (lift !== 1) c.scale(lift, lift); blit(c, s, 0, 0); c.restore(); }
    if (vm.agg) {                                                                                // the count: Inter 700, the one numeral style
      const n = String(t.n || vm.n); const unkCount = vm.side === 'unknown' || (vm.side === 'mixed' && vm.sides && vm.sides.unknown > 0); const mixedCount = vm.side === 'mixed';
      c.font = MARK_FONTS.badge; c.textBaseline = 'middle'; c.textAlign = 'center'; c.fillStyle = vm.side === 'unknown' ? P['color.unknownInk'] : ageInk(P, vm.side === 'mixed' ? 'union' : vm.side, b);
      const kind = flagKindOf(vm.side === 'mixed' ? 'x' : vm.side, true); const tx = cx + fb.x - 0.5; c.save(); const w = c.measureText ? c.measureText(n).width : 8; const maxW = f.bw - 5;
      c.lineJoin = 'round';
      if (mixedCount || unkCount) {                                                                // the count straddles two colours or stands on the hatch: a solid halo under the numeral
        c.strokeStyle = mixedCount && !unkCount ? rgba(P['color.ringDark'], 0.95) : rgba('#ffffff', 0.96); c.lineWidth = 3.4; c.fillStyle = mixedCount && !unkCount ? P['color.glyph'] : P['color.unknownInk'];
        if (vm.side === 'unknown' && !mixedCount) { c.strokeStyle = rgba('#ffffff', 0.96); c.fillStyle = P['color.unknownInk']; }
      }
      void kind;
      if (w > maxW) { c.translate(tx, cy + fb.y + 0.6); c.scale(maxW / w, 1); if (mixedCount || unkCount) c.strokeText(n, 0, 0); c.fillText(n, 0, 0); } else { if (mixedCount || unkCount) c.strokeText(n, tx, cy + fb.y + 0.6); c.fillText(n, tx, cy + fb.y + 0.6); } c.restore();
    }
  }
  // hover and selection: a ring that draws itself around the mark (a circle around a disc, the outline of a standard), inside the band the footprint reserves.  A ring, nothing else: no plate, no pill.
  const side = sideColour(P, vm.side === 'mixed' ? 'union' : vm.side); const out = outlineOf(P, f, vm, cx, cy, t.h);
  if (g.hov > 0.01 && g.sel < 0.99) { c.globalAlpha = a0 * 0.7 * g.hov * (1 - g.sel); c.strokeStyle = side; c.lineWidth = 1.5; out.trace(c); c.stroke(); c.globalAlpha = a0; }
  if (g.sel > 0.004) {
    c.lineCap = 'round'; c.lineJoin = 'round'; const L = out.len; const k = clamp01(g.sel);
    const sweep = () => { out.trace(c); if (f.kind === 'unit') return; c.setLineDash([L * k, L * 2]); c.lineDashOffset = 0; };
    c.strokeStyle = rgba(P['color.ringDark'], 0.55 * g.sel); c.lineWidth = 4; if (f.kind === 'unit') { c.beginPath(); c.arc(cx, cy, out.r, -Math.PI / 2, -Math.PI / 2 + TAU * k); } else sweep(); c.stroke(); c.setLineDash([]);
    c.strokeStyle = P['color.accent']; c.lineWidth = 2.2; if (f.kind === 'unit') { c.beginPath(); c.arc(cx, cy, out.r, -Math.PI / 2, -Math.PI / 2 + TAU * k); } else sweep(); c.stroke(); c.setLineDash([]);
  }
  // a formation's name, or a crowd's: the text of the mark, haloed
  const text = vm.agg ? t.short : t.text;
  if (text) {
    const tx = cx + textStart(P, f); const ty = cy + P['text.dy'];
    const tint = vm.agg ? null : vm.side === 'union' ? P['text.formUnion'] : vm.side === 'confederate' ? P['text.formConfederate'] : null;
    if (vm.agg && t.detail) {                                                                    // a crowd: WHO on the first line, WHAT on the second (the kinds of all its records)
      textRun(c, g, text, MARK_FONTS[f.font], tx, ty - P['crowd.lineDy'], { alpha: 1 });
      textRun(c, g, t.detail, DETAIL_FONT, tx, ty + P['crowd.lineDy'] + 0.4, { alpha: 0.88 });
    } else textRun(c, g, text, MARK_FONTS[f.font], tx, ty, { alpha: 1, color: tint, italic: !vm.agg && vm.idOnly });
  }
}

/** label: the code of a unit, and its name growing out of it.  c is translated to the label rectangle's top-left; the rectangle is as wide as the tier it shows.  The code starts at the mark's side of the
 *  rectangle (right slot: left end; left slot: right end) and the name grows away from the mark. */
function label(c, t, g) {
  const P = g.P; const L = t.label; if (!L) return; const vm = g.vm; const k = ss(0, 1, L.grow || 0); const w = L.x1 - L.x0; const left = L.slot === 'l';
  const font = MARK_FONTS.label; const italic = vm.idOnly; const y = (L.y1 - L.y0) / 2 + P['text.dy']; const x = left ? w - 1 : 1;
  textRun(c, g, L.code || L.text, font, x, y, { alpha: 1 - k, italic, right: left });
  if (k > 0.004) { const s = textSprite(g, L.text, font, italic); const reveal = s ? s.tw + 3 : 0; textRun(c, g, L.text, font, x, y, { alpha: Math.min(1, k * 1.25), clipW: reveal * ss(0, 0.92, k), italic, right: left }); }
}

// ---- pin and leader: the thin line from a displaced mark to the place it truly stands -----------------------------------------------------------------------------------------------------------
function away(t, g) {                                                                   // how far (px) the true position is outside the mark, faded in over 4 px
  const f = frameOf(g.P, { agg: t.kind === 'agg', kind: t.unit ? t.unit.kind : 'regiment', echelon: g.vm && g.vm.ech >= 2 ? g.vm.ech : 0, lod: lodOf(g.zoom) });
  const dx = t.x - (t.hx || 0) - t.px; const dy = t.y - (t.hy || 0) - t.py; let d = Math.hypot(dx, dy) - markRadius(f);
  if (Math.abs(t.px - t.x) < t.w * t.scale / 2 - 1 && Math.abs(t.py - t.y) < t.h * t.scale / 2 - 1) d = -99;      // the true position lies inside the mark's own box (under its own text): a pin there would stand on the letters
  const asked = t.selected || (g.hov || 0) > 0.3;                                                       // a crowd stands for an area, not for one place: its pin and leader appear only when it is hovered or selected (then every record shows where it truly stands)
  return { f, d, dx, dy, show: asked ? 1 : t.kind === 'agg' ? 0 : ss(g.P['leader.minGap'] - 4, g.P['leader.minGap'] + 2, d + 2) };
}
function pin(c, t, g) {
  const P = g.P; const { d, show } = away(t, g); const k = d < -50 ? 0 : show; if (k < 0.02) return;
  const col = t.side === 'unknown' || t.side === 'mixed' ? P['color.unknown'] : sideColour(P, t.side); const a = c.globalAlpha; c.globalAlpha = a * k;
  c.beginPath(); c.arc(0, 0, P['pin.r'] + 1.3, 0, TAU); c.strokeStyle = rgba(P['color.ringDark'], 0.55); c.lineWidth = 0.9; c.stroke();
  c.beginPath(); c.arc(0, 0, P['pin.r'], 0, TAU); c.fillStyle = col; c.fill(); c.strokeStyle = P['color.ringLight']; c.lineWidth = 1.3; c.stroke(); c.globalAlpha = a;
}
function leader(c, t, g, a, b) {
  const P = g.P; const { f, d, show } = away(t, g); const k = d < -50 ? 0 : show; if (k < 0.02) return;
  const bx = b[0] - (t.hx || 0); const by = b[1] - (t.hy || 0); const len = Math.hypot(bx - a[0], by - a[1]) || 1; const ux = (bx - a[0]) / len; const uy = (by - a[1]) / len; const R = markRadius(f);
  const ex = bx - ux * (R + 0.5); const ey = by - uy * (R + 0.5); const col = t.side === 'unknown' || t.side === 'mixed' ? P['color.unknown'] : sideColour(P, t.side); const a0 = c.globalAlpha; c.globalAlpha = a0 * k * P['leader.alpha'];
  c.lineCap = 'round'; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(ex, ey); c.strokeStyle = rgba(P['text.halo'], 0.78); c.lineWidth = P['leader.width'] + 2; c.stroke(); c.strokeStyle = col; c.lineWidth = P['leader.width']; c.stroke(); c.globalAlpha = a0;
}

// ---- focus: the records of the formation the pointer or the selection is on, as dots and hairlines ---------------------------------------------------------------------------------------------
/** the minimum spanning tree of a set of points (Prim): the hairlines that join them with the least ink, never a hull, a taper or a wedge */
export function spanningTree(pts) {
  const n = pts.length; if (n < 2) return []; const inT = new Array(n).fill(false); const best = new Array(n).fill(Infinity); const from = new Array(n).fill(-1); best[0] = 0; const edges = [];
  for (let i = 0; i < n; i++) { let u = -1; for (let j = 0; j < n; j++) if (!inT[j] && (u < 0 || best[j] < best[u])) u = j; inT[u] = true; if (from[u] >= 0) edges.push([from[u], u]); for (let j = 0; j < n; j++) if (!inT[j]) { const d = Math.hypot(pts[u][0] - pts[j][0], pts[u][1] - pts[j][1]); if (d < best[j]) { best[j] = d; from[j] = u; } } }
  return edges;
}
/** the unit ids a hull joins: for an aggregate its records; for a unit the units that share its brigade (or the unit itself, when it is a formation record: everything under it) */
export function formationOf(frame, ft) {
  if (!ft) return null;
  if (ft.kind === 'agg') return { ids: ft.ids.slice(), name: ft.short, side: ft.side, kind: 'crowd' };
  const u = ft.unit; if (!u) return null; const kindOf = frame.nodeKind || (() => null);
  const chain = u.chain || []; let anchor = null;
  if (['brigade', 'division', 'corps'].includes(u.kind)) anchor = u.id; else for (const id of chain) { if (kindOf(id) === 'brigade') { anchor = id; break; } }
  if (!anchor) return { ids: [u.id], name: ft.short, side: ft.side, kind: 'unit' };
  const ids = []; const seen = new Set();
  for (const t of frame.tiles) {
    if (t.life !== 'live') continue;
    const leaves = t.kind === 'leaf' ? [t] : null;
    if (leaves) { const q = t.unit; if (q && !seen.has(q.id) && (q.id === anchor || (q.chain || []).includes(anchor))) { seen.add(q.id); ids.push(q.id); } }
    else if (t.members) for (const m of t.members) { const q = frame.unitOf ? frame.unitOf(m.id) : null; if (q && !seen.has(q.id) && (q.id === anchor || (q.chain || []).includes(anchor))) { seen.add(q.id); ids.push(q.id); } }
  }
  return { ids, name: ft.short, side: ft.side, kind: u.kind === 'regiment' || u.kind === 'battery' || u.kind === 'battalion' ? 'brigade' : u.kind };
}
function focus(c, frame, g, info) {
  const P = g.P; const view = frame.view; let ft = null;
  for (const t of frame.tiles) if (t.selected && t.life === 'live') { ft = t; break; }
  if (!ft && info.hoverKey) ft = frame.tiles.find((t) => t.key === info.hoverKey && t.life === 'live') || null;
  if (!ft) return;
  const fm = formationOf(frame, ft); if (!fm || fm.ids.length < 2) return;
  const pos = new Map(); for (const t of frame.tiles) { if (t.life !== 'live') continue; if (t.kind === 'leaf') pos.set(t.ids[0], [t.px, t.py]); else if (t.members) for (const m of t.members) pos.set(m.id, [m.ax, m.ay]); }
  const pts = []; for (const id of fm.ids) { const q = pos.get(id); if (q) pts.push([q[0] + view.dx, q[1] + view.dy]); } if (pts.length < 2) return;
  const sel = ft.selected ? 1 : 0.8; const col = fm.side === 'union' ? P['color.union'] : fm.side === 'confederate' ? P['color.confederate'] : P['color.unknown']; const A = P['hull.alpha'] * sel;
  c.save(); c.lineJoin = 'round'; c.lineCap = 'round';
  // dots and hairlines: each record's true position, and a spanning tree of 1 px lines in the neutral ink of the print (a shape would read as a line of battle, a claim about 1863 the data does not make)
  const W = g.env && g.env.size ? g.env.size[0] : 1e4; const H = g.env && g.env.size ? g.env.size[1] : 1e4; const inside = (q) => q[0] > 2 && q[0] < W - 2 && q[1] > 2 && q[1] < H - 2;
  const edges = spanningTree(pts).filter(([i, j]) => inside(pts[i]) && inside(pts[j]));                // a hairline to a record that is off the map would run to the edge of the screen: it is not drawn
  c.lineWidth = 3; c.strokeStyle = rgba(P['text.halo'], 0.7 * sel); c.beginPath(); for (const [i, j] of edges) { c.moveTo(pts[i][0], pts[i][1]); c.lineTo(pts[j][0], pts[j][1]); } c.stroke();
  c.lineWidth = 1; c.strokeStyle = rgba(P['text.ink'], A); c.beginPath(); for (const [i, j] of edges) { c.moveTo(pts[i][0], pts[i][1]); c.lineTo(pts[j][0], pts[j][1]); } c.stroke();
  for (const q of pts) { if (!inside(q)) continue; c.beginPath(); c.arc(q[0], q[1], P['hull.dot'] + 1.3, 0, TAU); c.fillStyle = rgba(P['color.ringLight'], 0.97); c.fill(); c.beginPath(); c.arc(q[0], q[1], P['hull.dot'], 0, TAU); c.fillStyle = col; c.fill(); }
  c.restore();
}

// ---- place names: the ground's own text, which steps aside for the marks ------------------------------------------------------------------------------------------------------------------
const PLACE_STATE = new Map();
function place(c, frame, g, info) {
  const P = g.P; const env = g.env; const list = env.places; if (!list || !env.toScreen) return;
  const z = env.zoom; const view = frame.view; const W = env.size ? env.size[0] : 1e4; const H = env.size ? env.size[1] : 1e4;
  // round 2: every mark and name that is visible at all keeps a place name away, the ones that are still fading in or out included (a name that came back while the crowd's own text was still half there put two texts over each other), and it leaves faster than it comes
  const solid = []; for (const t of frame.tiles) { if (!(t.opacity > 0.03)) continue; const x = t.x + view.dx; const y = t.y + view.dy; const hw = t.w * (t.scale || 1) / 2; const hh = t.h * (t.scale || 1) / 2; solid.push([x - hw, y - hh, x + hw, y + hh]); if (t.label && t.label.opacity > 0.03) solid.push([t.label.x0 + view.dx, t.label.y0 + view.dy, t.label.x1 + view.dx, t.label.y1 + view.dy]); }
  // the ground's road and stream names, drawn here and not baked into the ground, so that a name steps aside (fading) for any mark or name that would lie on it
  if (env.roadLabels) {
    const dt0 = g.dt || 16;
    for (const it of env.roadLabels()) {
      const ca = Math.abs(Math.cos(it.ang)); const sa = Math.abs(Math.sin(it.ang)); const bw = it.tw * ca + 14 * sa + 8; const bh = it.tw * sa + 14 * ca + 8; const rx0 = it.x - bw / 2; const ry0 = it.y - bh / 2; let hit = false;
      for (const b of solid) if (b[0] < rx0 + bw && b[2] > rx0 && b[1] < ry0 + bh && b[3] > ry0) { hit = true; break; }
      let ps = PLACE_STATE.get(it.id); if (!ps) { ps = { a: hit ? 0 : 1 }; PLACE_STATE.set(it.id, ps); } const target = hit ? 0 : 1; ps.a += (target - ps.a) * Math.min(1, dt0 / (target > ps.a ? 280 : 30)); if (Math.abs(ps.a - target) < 0.01) ps.a = target;
      if (ps.a < 0.02) continue;
      c.save(); c.globalAlpha = ps.a; c.translate(it.x, it.y); c.rotate(it.ang); c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round'; c.font = it.font; c.lineWidth = 3.4; c.strokeStyle = it.halo; c.strokeText(it.text, 0, 0); c.fillStyle = it.fill; c.fillText(it.text, 0, 0); c.restore();
    }
  }
  const font = `400 12px ${SERIF}`; const seen = new Set(); const dtc = g.dt || 16;
  for (const p of list) {
    if (p.k === 'loc' ? z < P['place.fromZoom'] : z < 14.9) continue; if (seen.has(p.n)) continue;
    const lng = p.glng != null ? p.glng : p.plng; const lat = p.glng != null ? p.glat : p.plat; const q = env.toScreen(lng, lat); const x = q[0]; const y = q[1]; if (x < -160 || x > W + 160 || y < -30 || y > H + 30) continue; seen.add(p.n);
    const name = (p.n === "Gulp's Hill saddle [sic]" ? "Culp's Hill saddle" : p.n).replace(/ \(.*\)$/, ''); const shown = p.off ? name + ' ?' : name; const s = textSprite(g, shown, font, false); const tw = s ? s.tw : shown.length * 6;      // a trailing ? : the site's coordinate has no building of that name (the landmark check of the basemap)
    const r = P['place.dot']; const box = [x - r - 3, y - 11, x + r + 9 + tw + 3, y + 11]; let hit = false; for (const b of solid) if (b[0] < box[2] && b[2] > box[0] && b[1] < box[3] && b[3] > box[1]) { hit = true; break; }
    let ps = PLACE_STATE.get(p.n); if (!ps) { ps = { a: 0 }; PLACE_STATE.set(p.n, ps); } const target = hit ? 0 : 1; ps.a += (target - ps.a) * Math.min(1, dtc / (target > ps.a ? 270 : 30)); if (Math.abs(ps.a - target) < 0.01) ps.a = target;
    const measured = p.ev === 'Measured';
    if (ps.a < 0.02) continue;                                                                                                          // no room for its name: no ring either (a bare ring reads as a speck)
    c.save(); c.globalAlpha = ps.a; c.lineWidth = 2.6; c.strokeStyle = rgba(P['text.halo'], 0.9); c.beginPath(); c.arc(x, y, r, 0, TAU); c.stroke(); c.lineWidth = 1.3; c.strokeStyle = rgba(P['text.ink'], 0.78); c.stroke(); if (measured) { c.beginPath(); c.arc(x, y, r - 1.1, 0, TAU); c.fillStyle = rgba(P['text.ink'], 0.78); c.fill(); } c.restore();
    if (ps.a > 0.01) textRun(c, g, shown, font, x + r + 5, y, { alpha: ps.a * 0.95 });
  }
}

// ---- legend swatches: the same drawing code, at a legend size ----------------------------------------------------------------------------------------------------------------------------------
function sample(c, ch, v, g, w, h) {
  const P = g.P; const fake = (side, arm, kind = 'regiment', ech = 0, carried = 0) => ({ side, arm, kind, ech, carried, agg: false, ratio: 1 }); g.dpr = 3; g.skin.rev = g.skin.rev || 0;
  const unit = (side, arm = 'infantry', carried = 0) => { const vm = fake(side, arm); const f = frameOf(P, { kind: 'regiment' }); const s = unitSprite(g, vm, f, bucketOf(carried)); if (s) blit(c, s, 0, 0); return true; };
  const flag = (side, kind, bars) => { const vm = { side, ech: bars + 1, sides: side === 'mixed' ? { union: 1, confederate: 1 } : null }; const f = frameOf(P, { agg: kind === 'crowd', echelon: kind === 'crowd' ? 0 : bars + 1, kind: 'x' }); const s = flagSprite(g, vm, f, 0, bars); if (s) c.drawImage(s.cv, -s.w / 2, -s.h / 2, s.w * 0.82, s.h * 0.82); if (kind === 'crowd') { c.font = MARK_FONTS.badge; c.fillStyle = P['color.glyph']; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('7', -1.6, 1.5); } return true; };
  switch (ch) {
    case 'side': return v === 'mixed' ? flag('mixed', 'crowd', 0) : unit(v === 'unknown' ? 'unknown' : v);
    case 'arm': return v === 'formation' ? flag('union', 'brigade', 1) : v === 'mixed' ? flag('union', 'crowd', 0) : unit('union', v);
    case 'echelon': { if (v === 1) { const f = frameOf(P, { kind: 'battalion' }); const s = unitSprite(g, fake('union', 'infantry', 'battalion', 1), f, 0); if (s) blit(c, s, 0, 0); return true; } return flag('union', ['', 'brigade', 'brigade', 'division', 'corps'][v] || 'brigade', Math.max(1, v - 1)); }
    case 'fix': return unit('union', 'infantry', v === 'carried' ? 1 : 0);
    case 'idOnly': { c.font = `italic 600 12px ${FONT}`; c.fillStyle = P['text.ink']; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('10 AL', 0, 0); return true; }
    case 'aggregate': return flag('union', 'crowd', 0);
    case 'selection': { unit('union'); c.strokeStyle = P['color.accent']; c.lineWidth = 2.2; c.beginPath(); c.arc(0, 0, 11.2, 0, TAU); c.stroke(); return true; }
    case 'pin': { c.strokeStyle = P['color.union']; c.lineWidth = P['leader.width']; c.beginPath(); c.moveTo(-11, 5); c.lineTo(2, -2); c.stroke(); c.beginPath(); c.arc(-11, 5, P['pin.r'], 0, TAU); c.fillStyle = P['color.union']; c.fill(); c.strokeStyle = P['color.ringLight']; c.lineWidth = 1.3; c.stroke(); unit('union'); return true; }
    default: return false;
  }
}

// ---- the anatomy of a mark: a labelled specimen for the legend, drawn by the same code as the marks -----------------------------------------------------------------------------------------------------
// Twelve numbered parts on three rows; every callout stands in free paper, its line ends on the edge of the part (never across a glyph or a word), and keeps 6 px from every other part.
function anatomy(c, g, w, h) {
  const P = g.P; const ink = P['text.ink']; const R = 8;
  const num = (n, x, y, tx, ty) => {                                                                // a callout: a numbered disc at (x, y) and a hairline to the point (tx, ty)
    const d = Math.hypot(tx - x, ty - y) || 1; const sx = x + (tx - x) / d * R; const sy = y + (ty - y) / d * R;
    c.save(); c.strokeStyle = rgba(ink, 0.55); c.lineWidth = 1; c.beginPath(); c.moveTo(sx, sy); c.lineTo(tx, ty); c.stroke(); c.beginPath(); c.arc(tx, ty, 1.8, 0, TAU); c.fillStyle = rgba(ink, 0.7); c.fill();
    c.beginPath(); c.arc(x, y, R, 0, TAU); c.fillStyle = ink; c.fill(); c.fillStyle = P['text.halo']; c.font = `700 11px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(n), x, y + 0.6); c.restore();
  };
  const fu = frameOf(P, { kind: 'regiment' }); const edge = (fu.w / 2);
  // row 1: a unit mark with its code, and a division standard
  const S1 = 1.8; c.save(); c.translate(64, 58); c.scale(S1, S1); const su = unitSprite(g, { side: 'union', arm: 'cavalry' }, fu, 0); if (su) blit(c, su, 0, 0); textRun(c, g, '1 MI', MARK_FONTS.code, textStart(P, fu), P['text.dy']); c.restore();
  const rU = edge * S1; num(1, 22, 20, 64 - rU * 0.7, 58 - rU * 0.7); num(2, 64, 14, 64, 49); num(3, 22, 98, 64 - rU * 0.7, 58 + rU * 0.7); num(4, 150, 20, 64 + (edge + 3) * S1 + 20, 58 - 9);
  const fb2 = frameOf(P, { echelon: 3, kind: 'division' }); const S2 = 1.5; const fx = w - 58; c.save(); c.translate(fx, 58); c.scale(S2, S2); const sf = flagSprite(g, { side: 'confederate', ech: 3 }, fb2, 0, 2); if (sf) blit(c, sf, 0, 0); c.restore();
  num(8, w - 20, 18, fx + fb2.bw * S2 / 2 - 6, 58 - fb2.bh * S2 / 2 + 2);
  // row 2: a crowd (its count, its pile, its name in two lines) and an aged unit
  const fc = frameOf(P, { agg: true }); const S3 = 1.5; const cy2 = 156; c.save(); c.translate(52, cy2); c.scale(S3, S3); const sc = flagSprite(g, { side: 'union' }, fc, 0, 0); if (sc) blit(c, sc, 0, 0);
  { const fb = flagBody(fc); c.font = MARK_FONTS.badge; c.textBaseline = 'middle'; c.textAlign = 'center'; c.fillStyle = P['color.glyph']; c.fillText('7', fb.x - 0.5, fb.y + 0.6); }
  textRun(c, g, 'II Corps, 6 of 9', MARK_FONTS.code, textStart(P, fc), P['text.dy'] - P['crowd.lineDy']); textRun(c, g, '7 inf, 2 art', DETAIL_FONT, textStart(P, fc), P['text.dy'] + P['crowd.lineDy'] + 0.4, { alpha: 0.88 }); c.restore();
  const bx = 52 + (fc.stack / 2) * S3; num(5, bx + 4, 112, bx + 2, cy2 - fc.bh * S3 / 2 + fc.stack * S3 / 2 + 1); num(6, 14, 130, 52 - fc.w * S3 / 2 + 2, cy2 - fc.h * S3 / 2 + 8); num(7, 150, 118, 150, cy2 - 20);
  c.save(); c.translate(w - 50, cy2); c.scale(1.8, 1.8); const sa = unitSprite(g, { side: 'confederate', arm: 'infantry' }, fu, bucketOf(1)); if (sa) blit(c, sa, 0, 0); c.restore();
  num(9, w - 18, 114, w - 50 + rU * 0.72, cy2 - rU * 0.72);
  // row 3: an italic code, the selection ring, a pin
  c.save(); c.translate(24, 236); c.scale(1.5, 1.5); c.font = `italic 600 12px ${FONT}`; c.fillStyle = ink; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText('10 AL', 0, 0); c.restore(); num(10, 52, 204, 54, 226);
  c.save(); c.translate(168, 236); c.scale(1.8, 1.8); const sb = unitSprite(g, { side: 'union', arm: 'infantry' }, fu, 0); if (sb) blit(c, sb, 0, 0); c.restore();
  c.strokeStyle = P['color.accent']; c.lineWidth = 3.4; c.beginPath(); c.arc(168, 236, 11.2 * 1.8, 0, TAU); c.stroke(); num(11, 196, 200, 168 + 20 * 0.72, 236 - 20 * 0.72);
  c.save(); c.translate(270, 244); c.scale(1.8, 1.8); c.strokeStyle = P['color.union']; c.lineWidth = P['leader.width']; c.beginPath(); c.moveTo(-14, 6); c.lineTo(5, -4); c.stroke(); c.beginPath(); c.arc(-14, 6, P['pin.r'], 0, TAU); c.fillStyle = P['color.union']; c.fill(); c.strokeStyle = P['color.ringLight']; c.lineWidth = 1.3; c.stroke(); const sp = unitSprite(g, { side: 'union', arm: 'infantry' }, fu, 0); if (sp) blit(c, sp, 8, -6); c.restore();
  num(12, 246, 204, 270 - 14 * 1.8, 244 + 6 * 1.8 - 2);
  void h;
}
const ANATOMY_NOTES = [
  ['1', 'Colour and shape: the side. A blue circle is Union, a red square Confederate; amber and hatched is a side the data contests.', 'Documented'],
  ['2', 'Inside: the arm. A slash is cavalry, a dot artillery; a plain disc is infantry.', 'Documented'],
  ['3', 'Size: a slightly larger disc is a battalion, the registry’s own kind; every other disc is a regiment or a battery.', 'Documented'],
  ['4', 'Code: the unit’s short name, set in free ground beside it. The full name grows out of it on hover and selection.', 'Documented'],
  ['5', 'Number: how many placement records the crowd stands for (records, never men).', 'Computed'],
  ['6', 'The pile behind it says several. Hover it and each record shows where it truly stands.', 'Modelled'],
  ['7', 'Name, in two lines: who, then what. First the formation they belong to, or the corps and how many of the records it holds (“6 of 9”), else their states; then the kinds of all the records: inf, cav, art (regiments and batteries), bde, div, corps.', 'Computed'],
  ['8', 'A standard with bars is a formation record: one bar a brigade, two a division, three a corps. Union swallow-tailed, Confederate pointed.', 'Documented'],
  ['9', 'Outlined, with a pale fill: the latest keyframe is a battle day or more old, so the position is carried forward.', 'Computed'],
  ['10', 'Italic: the order of battle has no record of this id, so its name comes from the id alone. The only italic on a mark.', 'Documented'],
  ['11', 'Amber ring: the selected unit. Its name grows, and the records of its formation are joined by hairlines. It says nothing about the battle.', ''],
  ['12', 'A dot and a thin line: the true position of a mark that had to stand aside by more than 14 px. Drawn at rest, so a mark is never silently moved.', 'Modelled'],
];

const WORDS = {
  'side:union': 'Blue: a Union unit (circle) or formation (swallow-tailed standard). From the order of battle, or the U- id prefix',
  'side:confederate': 'Red: a Confederate unit (rounded square) or formation (pointed standard). From the order of battle, or the C- id prefix',
  'side:unknown': 'Amber, hatched: the side is contested (10 ids whose state code contradicts their prefix). Never drawn as a side',
  'side:mixed': 'Half blue, half red: a crowd that holds units of both armies; half amber and hatched: a crowd that holds contested ones. The data records no engagement, so nothing more is claimed',
  'arm:infantry': 'Plain disc: an infantry regiment', 'arm:cavalry': 'Slash: a cavalry regiment', 'arm:artillery': 'Dot: an artillery battery or battalion',
  'arm:mixed': 'No glyph, a count: a crowd of more than one arm', 'arm:formation': 'Bars, no arm: a brigade, division or corps record; the data gives a formation no arm, so none is claimed. Its name is in its own box',
  'echelon:1': 'A slightly larger disc: a battalion', 'echelon:2': 'One bar on a standard: a brigade record', 'echelon:3': 'Two bars, a larger standard: a division record', 'echelon:4': 'Three bars, the largest standard: a corps record',
  'fix:fresh': 'Solid colour: the unit\'s latest keyframe is less than half a battle day old', 'fix:carried': 'Outlined, with a pale fill: the latest keyframe is a battle day or more old, so the position is carried forward, not a fresh report',
  'idOnly:idOnly': 'Italic code: no order-of-battle record for this id, so its name comes from the id alone (the only italic on a mark)',
  'aggregate:agg': 'A small tab with a pile, a number and a name: that many placement records share the mark because they cannot all stand on their true positions (records, never men). The name is who (a formation, a corps, the states), then what (the kinds of all its records). Hover for the records',
  'selection:selected': 'Amber ring, drawn around the mark: the selected unit. Its name grows and the records of its formation are joined by hairlines',
  'pin:pin': 'A dot and a thin line: the true position of a mark that had to stand aside by more than 14 px',
};

export const DISPATCH_FOOT = FOOT;
const channels = { side: true, arm: true, echelon: true, fix: true, idOnly: true, aggregate: true, selection: true, pin: true };
const baseDef = (id, title, rows) => ({
  id, label: title, version: '2.0', footprint: FOOT, anatomy: { w: 330, h: 276, notes: ANATOMY_NOTES, paint: anatomy }, fonts: MARK_FONTS, tokens: rows, channels, fallbackSwatch: '#1c57a6', ownsHover: true,
  size: sizeOf, labelSize: labelSizeOf, lodOf, words: WORDS, swatch: { w: 34, h: 26 },
  draw: { tile, label, pin, leader, focus, place }, sample,
});
const TEXT_ROWS = [['text.dy', 0.6, 'Vertical nudge of the text against the centre of the mark (the optical centre of capitals and figures).', { min: -3, max: 3, unit: 'u' }]];
const rowsFor = (set) => [...DISPATCH_TOKENS, ...TEXT_ROWS].map((r) => (set && set[r[0]] !== undefined ? [r[0], set[r[0]], r[2], r[3]] : r));

export const DISPATCH_PAPER = defineFamily(baseDef('dispatch-paper', 'Dispatch on paper', rowsFor(null)), DP_VARIANTS);
export const DISPATCH_AERIAL = defineFamily(baseDef('dispatch-aerial', 'Dispatch on the aerial', rowsFor(DA_SET)), DA_VARIANTS);
export const DISPATCH = [...DISPATCH_PAPER, ...DISPATCH_AERIAL];
export { frameOf, sizeOf, labelSizeOf, textStart, markRadius, mixHex };
