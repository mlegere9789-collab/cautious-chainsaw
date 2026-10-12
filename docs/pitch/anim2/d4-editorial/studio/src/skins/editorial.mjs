// skins/editorial.mjs - SKIN "DISPATCH" (art direction 4, Editorial Annotation): the map is the hero, the marks are quiet narrators.
//
// THE RULES (SPEC.md section 2 says why; every number is a token in editorial.spec.mjs):
//   ONE OBJECT PER UNIT.  A unit is one mark: a bold disc (or, for a formation, a standard) with one white glyph inside, and its short code written beside it, haloed, as part of the same mark.
//     There is no plate behind the text and no second caption box.  The full name is that same text growing: it wipes out to the right of the code, in the free ground the layout reserved for it
//     (display.mjs _labels), on hover, on selection and, where there is room, at close zoom.
//   THREE LEVELS OF WEIGHT.  1 formation marks (a brigade, division or corps standard; the crowd mark: a standard with a count)  >  2 unit marks (discs)  >  3 secondary detail (the gauge, the
//     hull, the leader, the place names).  Two type sizes (12 for units and names, 13 for formations and counts) and one numeral style (Inter 700).
//   QUIET.  No dashed outline, no tiny badge, no plate.  Age is one device: a mark whose latest keyframe is old FADES toward neutral (fill, ring, glyph).  The side is colour and silhouette (Union a
//     circle / swallow-tail, Confederate a rounded square / point, contested a hatched amber diamond).  Crowds merge into a standard with a count; its hull and the records it stands for appear on
//     interaction only.
//   TRUE TO THE DATA.  The mark is anchored on its GLYPH: the disc stands on the unit's true position (the layout's box is not centred on it, see layout/spec.mjs chipSize hx).  Every channel
//     drawn is one the data backs (semantics.mjs): side, arm (or none for a formation), echelon, age, strength state (Modelled), identity ("id only" = italic code), crowd count (Computed).
//
// The drawing is sprite-based: a disc, a standard and a run of text are rasterised once per state and device-pixel ratio and then copied (drawImage), so 400 marks at 60 frames a second cost
// about as much as 400 rectangles.  The skin contract (contract.mjs) holds: every ink of tile() stays inside the box that size() returned, every ink of label() inside the tile's own box plus
// the label rectangle, the pin inside pinHalf (test/editorial.test.mjs checks all three with a recording context).
import { defineFamily, clamp01, ss, mixHex, rgba } from './kit.mjs';
import { armGlyph, rr } from './glyphs.mjs';
import { DISPATCH_TOKENS, DP_VARIANTS, DA_SET, DA_VARIANTS, fadeFill, fadeInk, fadeT } from './editorial.spec.mjs';

export const FONT = '"Inter", "Segoe UI", system-ui, -apple-system, Roboto, Arial, sans-serif';
export const SERIF = '"Source Serif 4", Georgia, "Iowan Old Style", "Times New Roman", serif';
export const MARK_FONTS = { code: `600 12px ${FONT}`, label: `600 12px ${FONT}`, badge: `700 13px ${FONT}` };     // what the layout measures (layout/text.mjs FONT_SPECS is the same table)
const FOOT = { chipH: 24, chipPadX: 2, glyphW: 20, glyphGap: 3, chipMinW: 30, ring: 2, badgeGap: 3, labelH: 24, labelPadX: 0, labelGap: 0, pinHalf: 3.5 };
const TAU = Math.PI * 2;
const ECH_FLAG = ['', '', 'brigade', 'division', 'corps', 'corps'];

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
/** draw a text run with its origin at (x, yMid); falls back to plain text when there is no canvas to rasterise on (a node test with a recording context) */
function textRun(c, g, text, font, x, yMid, o = {}) {
  const s = textSprite(g, text, font, o.italic, o.color);
  if (s) { const al = o.alpha === undefined ? 1 : o.alpha; if (al <= 0.004) return s.tw; const a0 = c.globalAlpha; c.globalAlpha = a0 * al; if (o.clipW !== undefined) { c.save(); c.beginPath(); c.rect(x - s.pad - 1, yMid - s.h / 2, o.clipW + s.pad + 1, s.h); c.clip(); } c.drawImage(s.cv, x - s.pad, yMid - s.h / 2, s.w, s.h); if (o.clipW !== undefined) c.restore(); c.globalAlpha = a0; return s.tw; }
  c.font = font; c.textBaseline = 'middle'; c.textAlign = 'left'; c.fillStyle = o.color || g.P['text.ink']; c.fillText(text, x, yMid); return c.measureText ? c.measureText(text).width : text.length * 6;
}

// ---- geometry: the one place where the size of a mark is decided (used by size(), by every draw call and by the legend) ---------------------------------------------------------------------------
/** the frame of a mark: what stands on the true position */
function frameOf(P, info) {
  const kind = info.agg ? 'crowd' : (ECH_FLAG[info.echelon ?? 0] || (['brigade', 'division', 'corps', 'army'].includes(info.kind) ? { brigade: 'brigade', division: 'division', corps: 'corps', army: 'corps' }[info.kind] : 'unit'));
  const edge = P['ring.light'] + P['ring.dark'];
  if (kind === 'unit') { const r = info.kind === 'battalion' ? P['mark.rBattalion'] : P['mark.r']; return { kind, r, w: 2 * (r + edge), h: 2 * (r + edge), font: 'code', body: 2 * r }; }
  const w = P['flag.w.' + kind]; const h = P['flag.h.' + kind]; const st = kind === 'crowd' ? P['flag.stack'] : 0;
  return { kind, bw: w, bh: h, w: w + 2 * edge + st, h: h + 2 * edge + st, stack: st, font: kind === 'crowd' ? 'code' : 'badge', body: Math.max(w, h) };
}
/** the text of a mark as the tile draws it: the code, and for a crowd named after its lead record a plus ("and others") */
const textOf = (info) => info.text || '';
function sizeOf(spec, info, P) {
  const f = frameOf(P, info); const tw = Math.ceil(spec.text.width(f.font, textOf(info)));
  const left = P['pad.left']; const gap = P['gap.text']; const right = P['pad.right'] + Math.ceil(P['text.haloWidth'] / 2);
  const w = left + f.w + gap + tw + right; const h = Math.max(24, Math.ceil(f.h + 2 * P['pad.band']));
  return { w, h, hx: w / 2 - (left + f.w / 2), hy: 0, textW: tw, font: f.font, frameW: f.w };
}
/** the name that grows out of the mark: the label rectangle holds the part of the name beyond the room the code already has */
function labelSizeOf(spec, info, P) {
  const cs = info.chip; if (!cs || !info.text) return { w: 0, h: 0 };
  const font = cs.font || 'code'; const nameW = Math.ceil(spec.text.width(font === 'badge' ? 'badge' : 'label', info.text));
  const over = nameW - cs.textW; return over < 14 ? { w: 0, h: 0 } : { w: over + 3, h: cs.h };
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
  else if (shape === 'square') { rr(g, -s, -s, 2 * s, 2 * s, cr); }
  else if (shape === 'diamond') { const d = s * 1.12; g.moveTo(0, -d); g.lineTo(d, 0); g.lineTo(0, d); g.lineTo(-d, 0); g.closePath(); }
}
function flagPath(g, kind, x, y, w, h, n, rad) {             // a standard: swallow-tail (Union), point (Confederate), plain (contested and mixed)
  g.beginPath();
  if (kind === 'swallow') { g.moveTo(x + rad, y); g.lineTo(x + w, y); g.lineTo(x + w - n, y + h / 2); g.lineTo(x + w, y + h); g.lineTo(x + rad, y + h); g.arcTo(x, y + h, x, y + h - rad, rad); g.lineTo(x, y + rad); g.arcTo(x, y, x + rad, y, rad); }
  else if (kind === 'point') { g.moveTo(x + rad, y); g.lineTo(x + w - n, y); g.lineTo(x + w, y + h / 2); g.lineTo(x + w - n, y + h); g.lineTo(x + rad, y + h); g.arcTo(x, y + h, x, y + h - rad, rad); g.lineTo(x, y + rad); g.arcTo(x, y, x + rad, y, rad); }
  else rr(g, x, y, w, h, rad);
  g.closePath();
}
const flagKindOf = (side) => (side === 'union' ? 'swallow' : side === 'confederate' ? 'point' : 'plain');
const unitShapeOf = (P, side) => (side === 'union' ? 'circle' : side === 'confederate' ? (P['unit.shape.confederate'] === 'circle' ? 'circle' : 'square') : 'diamond');

function hatch(g, ink, from, to, alpha) { g.save(); g.clip(); g.strokeStyle = rgba(ink, alpha); g.lineWidth = 1.2; g.beginPath(); for (let q = from; q < to; q += 3.4) { g.moveTo(q, to); g.lineTo(q + (to - from), from); } g.stroke(); g.restore(); }

/** a closed ring path that starts at twelve o'clock and runs clockwise (so a dash pattern fills it from the top): a circle or a rounded square of half-size s */
function ringPath(g, shape, s, cr) {
  g.beginPath();
  if (shape === 'circle') { g.arc(0, 0, s, -Math.PI / 2, 1.5 * Math.PI); return TAU * s; }
  if (shape === 'square') { g.moveTo(0, -s); g.lineTo(s - cr, -s); g.arcTo(s, -s, s, -s + cr, cr); g.lineTo(s, s - cr); g.arcTo(s, s, s - cr, s, cr); g.lineTo(-s + cr, s); g.arcTo(-s, s, -s, s - cr, cr); g.lineTo(-s, -s + cr); g.arcTo(-s, -s, -s + cr, -s, cr); g.closePath(); return 8 * s - 8 * cr + TAU * cr; }
  const d = s * 1.12; g.moveTo(0, -d); g.lineTo(d, 0); g.lineTo(0, d); g.lineTo(-d, 0); g.closePath(); return 4 * d * Math.SQRT2;
}
/** the sprite of one unit mark: rings, fill, glyph; `b` is the age bucket (0 fresh .. 1 a battle day or more); `q` the strength state in quarters (0..4): the light ring is the gauge */
function unitSprite(g, vm, f, b, q = 4) {
  const P = g.P; const dpr = g.dpr; const side = vm.side === 'mixed' ? 'unknown' : vm.side; const key = `u|${g.skin.id}|${g.skin.rev}|${side}|${vm.arm}|${f.r}|${b}|${q}|${dpr}`;
  const edge = P['ring.light'] + P['ring.dark']; const sz = Math.ceil(2 * (f.r + edge) + 4);
  return sprite(key, sz, sz, dpr, (c) => {
    const shape = unitShapeOf(P, side); const r = f.r; const rl = P['ring.light']; const rd = P['ring.dark']; const unk = side === 'unknown';
    const s0 = shape === 'square' ? r * 0.92 : r; const cr0 = 2.6;
    const fill = unk ? P['color.unknown'] : faded(P, sideColour(P, side), b);
    const T = fadeT(b); const rlA = rl * (1 - (1 - P['fade.ringW']) * T); c.strokeStyle = rgba(P['color.ringDark'], 0.62); c.lineWidth = rd; shapePath(c, shape, s0 + rlA + rd / 2, cr0 + rlA + rd / 2); c.stroke();
    const ra = 1 - P['fade.ring'] * T; const gp = P['gauge.gap'];
    if (q >= 4) { c.strokeStyle = rgba(P['color.ringLight'], ra); c.lineWidth = rlA; shapePath(c, shape, s0 + rlA / 2, cr0 + rlA / 2); c.stroke(); }
    else {                                                                           // the ring is the strength gauge: four arcs, the remaining quarters lit (Modelled, in quarters: a state, not a number)
      const L = ringPath(c, shape, s0 + rlA / 2, cr0 + rlA / 2); const seg = L / 4 - gp; c.lineCap = 'butt'; c.lineWidth = rlA; c.lineDashOffset = -gp / 2;
      c.setLineDash([seg, gp]); c.strokeStyle = rgba(P['color.ringLight'], ra * P['gauge.track']); c.stroke();
      if (q > 0) { const arr = []; for (let i = 0; i < q; i++) arr.push(seg, gp); arr.push(L); ringPath(c, shape, s0 + rlA / 2, cr0 + rlA / 2); c.setLineDash(arr); c.strokeStyle = rgba(P['color.ringLight'], ra); c.stroke(); }
      c.setLineDash([]); c.lineDashOffset = 0; c.lineCap = 'round';
    }
    shapePath(c, shape, s0, cr0); c.fillStyle = fill; c.fill();
    if (unk) { shapePath(c, shape, s0, cr0); hatch(c, P['color.unknownInk'], -s0 * 1.4, s0 * 1.4, 0.34); }
    const ink = unk ? P['color.unknownInk'] : fadeInk(P, sideColour(P, side), b); const a = 1 - P['fade.glyph'] * T;
    c.globalAlpha = a; armGlyph(c, vm.arm === 'mixed' ? 'infantry' : vm.arm, 0, 0, P['glyph.size'], { ink, lw: P['glyph.stroke'] }, null); c.globalAlpha = 1;
  });
}
/** the sprite of one standard (a formation record, or the crowd mark behind its count) */
/** the two halves of a crowd that holds more than one side: [left, right] among union, confederate and unknown (the contested ones: amber, hatched, never a side) */
const halvesOf = (sides) => { const have = ['union', 'confederate', 'unknown'].filter((k) => sides && sides[k] > 0); if (have.length < 2) return ['union', 'confederate']; return [have[0], have[have.length - 1]]; };
function flagSprite(g, vm, f, b, pips) {
  const P = g.P; const dpr = g.dpr; const side = vm.side; const hv = side === 'mixed' ? halvesOf(vm.sides) : null; const key = `f|${g.skin.id}|${g.skin.rev}|${side}|${hv ? hv.join('+') : ''}|${f.kind}|${pips}|${b}|${dpr}`;
  const sw = Math.ceil(f.w + 4); const sh = Math.ceil(f.h + 4);
  return sprite(key, sw, sh, dpr, (c) => {
    const rl = P['ring.light']; const rd = P['ring.dark']; const edge = rl + rd; const T = fadeT(b); const rlA = rl * (1 - (1 - P['fade.ringW']) * T); const n = P['flag.notch']; const rad = P['flag.radius']; const kind = flagKindOf(side === 'mixed' ? 'x' : side);
    const unk = side === 'unknown'; const mixed = side === 'mixed';
    const bx = -f.bw / 2 + f.stack / 2; const by = -f.bh / 2 + f.stack / 2;                     // the body sits low and right; the pile peeks behind it up and left
    const paintOne = (x, y, alpha) => {
      c.globalAlpha = alpha;
      c.strokeStyle = rgba(P['color.ringDark'], 0.62); c.lineWidth = 2 * (rlA + rd); flagPath(c, kind, x, y, f.bw, f.bh, n, rad); c.stroke();
      c.strokeStyle = rgba(P['color.ringLight'], 1 - P['fade.ring'] * T); c.lineWidth = 2 * rlA; c.stroke();
      const hueOf = (k) => (k === 'unknown' ? P['color.unknown'] : faded(P, sideColour(P, k), b)); const fillC = unk ? P['color.unknown'] : mixed ? hueOf(hv[0]) : faded(P, sideColour(P, side), b);
      flagPath(c, kind, x, y, f.bw, f.bh, n, rad); c.fillStyle = fillC; c.fill();
      if (mixed) { c.save(); flagPath(c, kind, x, y, f.bw, f.bh, n, rad); c.clip(); c.fillStyle = hueOf(hv[1]); c.beginPath(); c.moveTo(x + f.bw * 0.62, y - 1); c.lineTo(x + f.bw + 2, y - 1); c.lineTo(x + f.bw + 2, y + f.bh + 1); c.lineTo(x + f.bw * 0.38, y + f.bh + 1); c.closePath(); c.fill(); if (hv[1] === 'unknown') hatch(c, P['color.unknownInk'], x - f.bh, x + f.bw + f.bh, 0.34); c.restore(); }
      if (unk) { flagPath(c, kind, x, y, f.bw, f.bh, n, rad); hatch(c, P['color.unknownInk'], x - f.bh, x + f.bw + f.bh, 0.34); }
      c.globalAlpha = 1;
    };
    if (f.stack > 0) paintOne(bx - f.stack, by - f.stack, 0.62);
    paintOne(bx, by, 1);
    if (pips > 0) { const ink = unk ? P['color.unknownInk'] : fadeInk(P, mixed ? P['color.union'] : sideColour(P, side), b); c.fillStyle = ink; c.globalAlpha = 1 - P['fade.glyph'] * T; const px = bx + f.bw / 2 - (n > 0 && kind !== 'plain' ? n / 2 : 0); for (let i = 0; i < pips; i++) { c.beginPath(); c.arc(px + (i - (pips - 1) / 2) * P['pip.pitch'], by + f.bh / 2, P['pip.r'], 0, TAU); c.fill(); } c.globalAlpha = 1; }
  });
}
/** where the body of a standard stands, relative to the frame centre */
const flagBody = (f) => ({ x: f.stack / 2, y: f.stack / 2 });

const markRadius = (f) => (f.kind === 'unit' ? f.r + 2.5 : Math.hypot(f.bw, f.bh) / 2 + 1);

/** the outline of the hover and selection ring: a circle around a disc, the shape of the standard (a little larger) around a formation or a crowd; `trace(c)` builds the path, `len` is its length, `r` the radius of the circle */
function outlineOf(P, f, vm, cx, cy, boxH) {
  if (f.kind === 'unit') { const r = Math.min(markRadius(f) + 1.6, boxH / 2 - 1.1, 12.4); return { r, len: TAU * r, trace: (c) => { c.beginPath(); c.arc(cx, cy, r, 0, TAU); } }; }
  const e = P['ring.light'] + P['ring.dark'] + 1.3; const kind = flagKindOf(vm.side === 'mixed' ? 'x' : vm.side); const bx = cx - f.bw / 2 + f.stack / 2 - e; const by = cy - f.bh / 2 + f.stack / 2 - e; const w = f.bw + 2 * e; const h = f.bh + 2 * e;
  return { r: 0, len: 2 * (w + h), trace: (c) => { flagPath(c, kind, bx, by, w, h, P['flag.notch'], P['flag.radius'] + e); } };
}

// ---- tile: the mark and its code, one object ---------------------------------------------------------------------------------------------------------------------------------------------
function tile(c, t, g) {
  const P = g.P; const vm = g.vm; const dpr = g.dpr; const spec = g.env.spec;
  const f = frameOf(P, { agg: vm.agg, kind: vm.kind, echelon: vm.ech >= 2 ? vm.ech : 0 });
  const cx = -(t.hx || 0); const cy = -(t.hy || 0);                                          // the true position, in the box's own space
  const b = bucketOf(vm.carried); const a0 = c.globalAlpha;
  const Lo = t.label ? ss(0, 1, t.label.opacity) : 0;                                         // the name is wiping out of the mark
  // arrival: the ring that leaves a mark when it appears (the settle is the engine's scale and fade)
  const st = g.st; const born = st ? (st.born ?? (st.born = g.now)) : g.now; const age = g.now - born; const rip = P['motion.rippleMs'];
  if (rip > 0 && age < rip && !g.reduced) { const k = clamp01(age / rip); const e = 1 - (1 - k) * (1 - k) * (1 - k); const R = markRadius(f); c.globalAlpha = a0 * 0.5 * (1 - k); c.strokeStyle = vm.side === 'unknown' ? P['color.unknown'] : sideColour(P, vm.side === 'mixed' ? 'union' : vm.side); c.lineWidth = 1.6 * (1 - 0.5 * k); c.beginPath(); c.arc(cx, cy, Math.min(R + 1 + e * 3.2, 11.6), 0, TAU); c.stroke(); c.globalAlpha = a0; }
  // hover lift
  const bump = g.enter < 1 ? 0.075 * Math.sin(Math.PI * clamp01(g.enter)) : 0;                 // the settle of an arrival: the mark swells a little inside its own box on the way (never beyond the 2 px band)
  const lift = 1 + 0.08 * g.hov + bump;
  if (f.kind === 'unit') { const s = unitSprite(g, vm, f, b, Math.round(clamp01(vm.ratio) * 4)); if (s) { c.save(); c.translate(cx, cy); if (lift !== 1) c.scale(lift, lift); blit(c, s, 0, 0); c.restore(); } }
  else {
    const pips = vm.agg ? 0 : Math.max(1, vm.ech - 1); const s = flagSprite(g, vm, f, b, pips); const fb = flagBody(f);
    if (s) { c.save(); c.translate(cx, cy); if (lift !== 1) c.scale(lift, lift); blit(c, s, 0, 0); c.restore(); }
    if (vm.agg) {                                                                                // the count: Inter 700, the one numeral style
      const n = String(t.n || vm.n); c.font = MARK_FONTS.badge; c.textBaseline = 'middle'; c.textAlign = 'center'; c.fillStyle = vm.side === 'unknown' ? P['color.unknownInk'] : fadeInk(P, vm.side === 'mixed' ? P['color.union'] : sideColour(P, vm.side), b);
      const tx = cx + fb.x - (f.bw ? flagKindOf(vm.side === 'mixed' ? 'x' : vm.side) !== 'plain' ? P['flag.notch'] / 2 - 0.5 : 0 : 0); c.save(); const w = c.measureText ? c.measureText(n).width : 8; const maxW = f.bw - P['flag.notch'] - 4; const mixedCount = vm.side === 'mixed'; if (mixedCount) { c.fillStyle = P['color.glyph']; c.strokeStyle = rgba(P['color.ringDark'], 0.9); c.lineWidth = 2.4; c.lineJoin = 'round'; }       // the count straddles two colours: white with a dark outline reads on both
      if (w > maxW) { c.translate(tx, cy + fb.y + 0.6); c.scale(maxW / w, 1); if (mixedCount) c.strokeText(n, 0, 0); c.fillText(n, 0, 0); } else { if (mixedCount) c.strokeText(n, tx, cy + fb.y + 0.6); c.fillText(n, tx, cy + fb.y + 0.6); } c.restore();
    }
  }
  // hover and selection: the ring draws itself around the mark (a circle around a disc, the outline of a standard), inside the band the footprint reserves
  const side = sideColour(P, vm.side === 'mixed' ? 'union' : vm.side); const out = outlineOf(P, f, vm, cx, cy, t.h);
  if (g.hov > 0.01 && g.sel < 0.99) { c.globalAlpha = a0 * 0.55 * g.hov * (1 - g.sel); c.strokeStyle = side; c.lineWidth = 1.5; out.trace(c); c.stroke(); c.globalAlpha = a0; }
  if (g.sel > 0.004) {
    c.lineCap = 'round'; c.lineJoin = 'round'; const L = out.len; const k = clamp01(g.sel);
    const sweep = () => { out.trace(c); if (f.kind === 'unit') return; c.setLineDash([L * k, L * 2]); c.lineDashOffset = 0; };
    c.strokeStyle = rgba(P['color.ringDark'], 0.55 * g.sel); c.lineWidth = 4; if (f.kind === 'unit') { c.beginPath(); c.arc(cx, cy, out.r, -Math.PI / 2, -Math.PI / 2 + TAU * k); } else sweep(); c.stroke(); c.setLineDash([]);
    c.strokeStyle = P['color.accent']; c.lineWidth = 2.2; if (f.kind === 'unit') { c.beginPath(); c.arc(cx, cy, out.r, -Math.PI / 2, -Math.PI / 2 + TAU * k); } else sweep(); c.stroke(); c.setLineDash([]);
  }
  // the code, haloed: the first line of the mark's text; it hands over to the name when the name grows
  const tx = cx + textStart(P, f); const ty = cy + P['text.dy'];
  const code = t.short; const tint = vm.agg || f.kind === 'unit' ? null : vm.side === 'union' ? P['text.formUnion'] : vm.side === 'confederate' ? P['text.formConfederate'] : null;
  textRun(c, g, code, MARK_FONTS[f.font], tx, ty, { alpha: (1 - Lo) * (1 - P['fade.text'] * fadeT(b)), italic: vm.idOnly, color: tint });
}

/** label: the name, wiping out of the mark.  c is translated to the label rectangle's top-left; the name starts where the code starts, inside the tile's own box, so the ink of this call lies in
 *  the tile's box plus the label rectangle: both are this tile's own ground (the layout reserved them) */
function label(c, t, g) {
  const P = g.P; const L = t.label; if (!L) return; const vm = g.vm;
  const f = frameOf(P, { agg: vm.agg, kind: vm.kind, echelon: vm.ech >= 2 ? vm.ech : 0 });
  const k = ss(0, 1, L.opacity); if (k <= 0.004) return;
  const x0 = (t.x - (t.hx || 0) + textStart(P, f)) - L.x0; const y = (t.y - (t.hy || 0) + P['text.dy']) - L.y0;
  const font = MARK_FONTS[f.font]; const tint = vm.agg || f.kind === 'unit' ? null : vm.side === 'union' ? P['text.formUnion'] : vm.side === 'confederate' ? P['text.formConfederate'] : null; const s = textSprite(g, L.text, font, false, tint); const reveal = s ? s.tw + 3 : 0; const b = bucketOf(vm.carried);
  textRun(c, g, L.text, font, x0, y, { alpha: Math.min(1, k * 1.25) * (1 - P['fade.text'] * fadeT(b)), clipW: reveal * ss(0, 0.92, k), color: tint });
}

// ---- pin and leader: the thin line from a displaced mark to the place it truly stands -----------------------------------------------------------------------------------------------------------
function away(t, g) {                                                                   // how far (px) the true position is outside the mark, faded in over 4 px
  const f = frameOf(g.P, { agg: t.kind === 'agg', kind: t.unit ? t.unit.kind : 'regiment', echelon: g.vm && g.vm.ech >= 2 ? g.vm.ech : 0 });
  const dx = t.x - (t.hx || 0) - t.px; const dy = t.y - (t.hy || 0) - t.py; let d = Math.hypot(dx, dy) - markRadius(f);
  if (Math.abs(t.px - t.x) < t.w * t.scale / 2 - 1 && Math.abs(t.py - t.y) < t.h * t.scale / 2 - 1) d = -99;      // the true position lies inside the mark's own box (under its own text): a pin there would stand on the letters
  return { f, d, dx, dy, fade: ss(g.P['leader.minGap'] - 3, g.P['leader.minGap'] + 3, d + g.P['leader.minGap']) };
}
function pin(c, t, g) {
  const P = g.P; const { d } = away(t, g); const k = ss(P['leader.minGap'] - 2, P['leader.minGap'] + 3, d + 2); if (k < 0.02) return;
  const col = t.side === 'unknown' || t.side === 'mixed' ? P['color.unknown'] : sideColour(P, t.side); const a = c.globalAlpha; c.globalAlpha = a * k;
  c.beginPath(); c.arc(0, 0, P['pin.r'] + 1.3, 0, TAU); c.strokeStyle = rgba(P['color.ringDark'], 0.55); c.lineWidth = 0.9; c.stroke();
  c.beginPath(); c.arc(0, 0, P['pin.r'], 0, TAU); c.fillStyle = col; c.fill(); c.strokeStyle = P['color.ringLight']; c.lineWidth = 1.3; c.stroke(); c.globalAlpha = a;
}
function leader(c, t, g, a, b) {
  const P = g.P; const { f, d, dx, dy } = away(t, g); const k = ss(P['leader.minGap'] - 2, P['leader.minGap'] + 3, d + 2); if (k < 0.02) return;
  const bx = b[0] - (t.hx || 0); const by = b[1] - (t.hy || 0); const len = Math.hypot(bx - a[0], by - a[1]) || 1; const ux = (bx - a[0]) / len; const uy = (by - a[1]) / len; const R = markRadius(f);
  const ex = bx - ux * (R + 0.5); const ey = by - uy * (R + 0.5); const col = t.side === 'unknown' || t.side === 'mixed' ? P['color.unknown'] : sideColour(P, t.side); const a0 = c.globalAlpha; c.globalAlpha = a0 * k * P['leader.alpha'];
  c.lineCap = 'round'; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(ex, ey); c.strokeStyle = rgba(P['text.halo'], 0.78); c.lineWidth = P['leader.width'] + 2; c.stroke(); c.strokeStyle = col; c.lineWidth = P['leader.width']; c.stroke(); c.globalAlpha = a0;
}

// ---- focus: the soft hull of the formation the pointer or the selection is on ---------------------------------------------------------------------------------------------------------------
function hullOf(pts) {                                                                    // convex hull (monotone chain)
  if (pts.length < 3) return pts.slice(); const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]); const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = []; for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  const up = []; for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  lo.pop(); up.pop(); return lo.concat(up);
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
  const sel = ft.selected ? 1 : 0.8; const col = fm.side === 'union' ? P['color.union'] : fm.side === 'confederate' ? P['color.confederate'] : P['color.unknown']; const pad = P['hull.pad']; const A = P['hull.alpha'] * sel;
  const poly = hullOf(pts); c.save(); c.lineJoin = 'round'; c.lineCap = 'round';
  const trace = () => { c.beginPath(); if (poly.length === 1) c.arc(poly[0][0], poly[0][1], 0.01, 0, TAU); else { c.moveTo(poly[0][0], poly[0][1]); for (let i = 1; i < poly.length; i++) c.lineTo(poly[i][0], poly[i][1]); c.closePath(); } };
  // a quiet shape, in the neutral ink of the print and not in a side's colour (a tinted wedge reads as an attack arrow, which is a claim about 1863 the data does not make): a very light wash over
  // the padded records, a dot on each true position, nothing else
  const wash = P['text.ink']; trace(); c.strokeStyle = rgba(wash, A * 1.1); c.lineWidth = pad * 2; c.stroke(); c.fillStyle = rgba(wash, A); c.fill();
  for (const q of pts) { c.beginPath(); c.arc(q[0], q[1], P['hull.dot'] + 1, 0, TAU); c.fillStyle = rgba(P['color.ringLight'], 0.95); c.fill(); c.beginPath(); c.arc(q[0], q[1], P['hull.dot'], 0, TAU); c.fillStyle = col; c.fill(); }
  c.restore();
}

// ---- place names: the ground's own text, which steps aside for the marks ------------------------------------------------------------------------------------------------------------------
const PLACE_STATE = new Map();
function place(c, frame, g, info) {
  const P = g.P; const env = g.env; const list = env.places; if (!list || !env.toScreen) return;
  const z = env.zoom; const view = frame.view; const W = env.size ? env.size[0] : 1e4; const H = env.size ? env.size[1] : 1e4;
  const solid = []; for (const t of frame.tiles) { if (!t.solid || t.life !== 'live') continue; const x = t.x + view.dx; const y = t.y + view.dy; solid.push([x - t.w / 2, y - t.h / 2, x + t.w / 2, y + t.h / 2]); if (t.label && t.label.opacity > 0.3) solid.push([t.label.x0 + view.dx, t.label.y0 + view.dy, t.label.x1 + view.dx, t.label.y1 + view.dy]); }
  // the ground's road and stream names, drawn here and not baked into the ground, so that a name steps aside (fading) for any mark or name that would lie on it
  if (env.roadLabels) {
    const dt0 = g.dt || 16;
    for (const it of env.roadLabels()) {
      const ca = Math.abs(Math.cos(it.ang)); const sa = Math.abs(Math.sin(it.ang)); const bw = it.tw * ca + 14 * sa + 4; const bh = it.tw * sa + 14 * ca + 4; const rx0 = it.x - bw / 2; const ry0 = it.y - bh / 2; let hit = false;
      for (const b of solid) if (b[0] < rx0 + bw && b[2] > rx0 && b[1] < ry0 + bh && b[3] > ry0) { hit = true; break; }
      let ps = PLACE_STATE.get(it.id); if (!ps) { ps = { a: hit ? 0 : 1 }; PLACE_STATE.set(it.id, ps); } const target = hit ? 0 : 1; ps.a += (target - ps.a) * Math.min(1, dt0 / 140) * (target > ps.a ? 0.5 : 1); if (Math.abs(ps.a - target) < 0.01) ps.a = target;
      if (ps.a < 0.02) continue;
      c.save(); c.globalAlpha = ps.a; c.translate(it.x, it.y); c.rotate(it.ang); c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round'; c.font = it.font; c.lineWidth = 3; c.strokeStyle = it.halo; c.strokeText(it.text, 0, 0); c.fillStyle = it.fill; c.fillText(it.text, 0, 0); c.restore();
    }
  }
  const font = `400 12px ${SERIF}`; const seen = new Set(); const dtc = g.dt || 16;
  for (const p of list) {
    if (p.k === 'loc' ? z < P['place.fromZoom'] : z < 14.9) continue; if (seen.has(p.n)) continue;
    const lng = p.glng != null ? p.glng : p.plng; const lat = p.glng != null ? p.glat : p.plat; const q = env.toScreen(lng, lat); const x = q[0]; const y = q[1]; if (x < -160 || x > W + 160 || y < -30 || y > H + 30) continue; seen.add(p.n);
    const name = (p.n === "Gulp's Hill saddle [sic]" ? "Culp's Hill saddle" : p.n).replace(/ \(.*\)$/, ''); const shown = p.off ? name + ' ?' : name; const s = textSprite(g, shown, font, true); const tw = s ? s.tw : shown.length * 6;      // a trailing ? : the site's coordinate has no building of that name (the landmark check of the basemap)
    const r = P['place.dot']; const box = [x - r - 2, y - 9, x + r + 8 + tw + 2, y + 9]; let hit = false; for (const b of solid) if (b[0] < box[2] && b[2] > box[0] && b[1] < box[3] && b[3] > box[1]) { hit = true; break; }
    let ps = PLACE_STATE.get(p.n); if (!ps) { ps = { a: 0 }; PLACE_STATE.set(p.n, ps); } const target = hit ? 0 : 1; ps.a += (target - ps.a) * Math.min(1, dtc / 160) * (target > ps.a ? 0.6 : 1); if (Math.abs(ps.a - target) < 0.01) ps.a = target;
    const measured = p.ev === 'Measured'; const doubt = !!p.off;
    if (ps.a < 0.02) continue;                                                                                                          // no room for its name: no ring either (a bare ring reads as a speck)
    c.save(); c.globalAlpha = ps.a; c.lineWidth = 2.6; c.strokeStyle = rgba(P['text.halo'], 0.9); c.beginPath(); c.arc(x, y, r, 0, TAU); c.stroke(); c.lineWidth = 1.3; c.strokeStyle = rgba(P['text.ink'], 0.78); c.stroke(); if (measured) { c.beginPath(); c.arc(x, y, r - 1.1, 0, TAU); c.fillStyle = rgba(P['text.ink'], 0.78); c.fill(); } c.restore();
    if (ps.a > 0.01) textRun(c, g, shown, font, x + r + 5, y, { alpha: ps.a * 0.92, italic: true });
  }
}

// ---- legend swatches: the same drawing code, at a legend size ----------------------------------------------------------------------------------------------------------------------------------
function sample(c, ch, v, g, w, h) {
  const P = g.P; const fake = (side, arm, kind = 'regiment', ech = 0, carried = 0) => ({ side, arm, kind, ech, carried, agg: false, ratio: 1 }); g.dpr = 3; g.skin.rev = g.skin.rev || 0;
  const unit = (side, arm = 'infantry', carried = 0) => { const vm = fake(side, arm); const f = frameOf(P, { kind: 'regiment' }); const s = unitSprite(g, vm, f, bucketOf(carried)); if (s) blit(c, s, 0, 0); return true; };
  const flag = (side, kind, pips, stack) => { const vm = { side, ech: pips + 1 }; const f = frameOf(P, { agg: kind === 'crowd', echelon: kind === 'crowd' ? 0 : pips + 1, kind: 'x' }); const s = flagSprite(g, vm, f, 0, pips); if (s) c.drawImage(s.cv, -s.w / 2, -s.h / 2, s.w * 0.82, s.h * 0.82); if (kind === 'crowd') { c.font = MARK_FONTS.badge; c.fillStyle = P['color.glyph']; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('7', -1.6, 1.5); } return true; };
  switch (ch) {
    case 'side': return v === 'mixed' ? flag('mixed', 'crowd', 0) : unit(v === 'unknown' ? 'unknown' : v);
    case 'arm': return v === 'formation' ? flag('union', 'brigade', 1) : v === 'mixed' ? flag('union', 'crowd', 0) : unit('union', v);
    case 'echelon': { if (v === 1) { const f = frameOf(P, { kind: 'battalion' }); const s = unitSprite(g, fake('union', 'infantry', 'battalion', 1), f, 0, 4); if (s) blit(c, s, 0, 0); return true; } return flag('union', ['', 'brigade', 'brigade', 'division', 'corps'][v] || 'brigade', Math.max(1, v - 1)); }
    case 'fix': return unit('union', 'infantry', v === 'carried' ? 1 : 0);
    case 'strength': { const vm = fake('union', 'infantry'); const f = frameOf(P, { kind: 'regiment' }); const s = unitSprite(g, vm, f, 0, Math.round(Math.max(0, Math.min(1, +v)) * 4)); if (s) blit(c, s, 0, 0); return true; }
    case 'idOnly': { c.font = `italic 600 12px ${FONT}`; c.fillStyle = P['text.ink']; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('10 AL', 0, 0); return true; }
    case 'aggregate': return flag('union', 'crowd', 0);
    case 'selection': { unit('union'); c.strokeStyle = P['color.accent']; c.lineWidth = 2.2; c.beginPath(); c.arc(0, 0, 11.2, 0, TAU); c.stroke(); return true; }
    case 'pin': { c.strokeStyle = P['color.union']; c.lineWidth = P['leader.width']; c.beginPath(); c.moveTo(-11, 5); c.lineTo(2, -2); c.stroke(); c.beginPath(); c.arc(-11, 5, P['pin.r'], 0, TAU); c.fillStyle = P['color.union']; c.fill(); c.strokeStyle = P['color.ringLight']; c.lineWidth = 1.3; c.stroke(); unit('union'); return true; }
    default: return false;
  }
}

// ---- the anatomy of a mark: a labelled specimen for the legend, drawn by the same code as the marks -----------------------------------------------------------------------------------------------------
function anatomy(c, g, w, h) {
  const P = g.P; const ink = P['text.ink']; const num = (n, x, y, tx, ty) => {
    c.save(); c.strokeStyle = rgba(ink, 0.5); c.lineWidth = 1; c.beginPath(); c.moveTo(tx, ty); c.lineTo(x, y); c.stroke();
    c.beginPath(); c.arc(x, y, 8, 0, TAU); c.fillStyle = ink; c.fill(); c.fillStyle = P['text.halo']; c.font = `700 11px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(n), x, y + 0.6); c.restore();
  };
  const S = 1.8; const fu = frameOf(P, { kind: 'regiment' });
  c.save(); c.translate(70, 58); c.scale(S, S); const su = unitSprite(g, { side: 'union', arm: 'infantry' }, fu, 0, 3); if (su) blit(c, su, 0, 0); textRun(c, g, '14 VT', MARK_FONTS.code, textStart(P, fu), P['text.dy']); c.restore();
  num(1, 28, 26, 58, 46); num(2, 70, 16, 70, 52); num(3, 28, 92, 55, 72); num(4, 132, 22, 124, 50);
  const fc = frameOf(P, { agg: true }); c.save(); c.translate(70, 150); c.scale(S, S); const sc = flagSprite(g, { side: 'union' }, fc, 0, 0); if (sc) blit(c, sc, 0, 0);
  { const fb = flagBody(fc); c.font = MARK_FONTS.badge; c.textBaseline = 'middle'; c.textAlign = 'center'; c.fillStyle = P['color.glyph']; c.fillText('7', fb.x - P['flag.notch'] / 2 + 0.5, fb.y + 0.6); }
  textRun(c, g, 'II Corps', MARK_FONTS.code, textStart(P, fc), P['text.dy']); c.restore();
  num(5, 28, 126, 58, 142); num(6, 32, 176, 56, 160); num(7, 150, 126, 140, 144);
  const fb2 = frameOf(P, { echelon: 2, kind: 'brigade' }); c.save(); c.translate(w - 62, 58); c.scale(S, S); const sf = flagSprite(g, { side: 'confederate', ech: 2 }, fb2, 0, 1); if (sf) blit(c, sf, 0, 0); c.restore(); num(8, w - 30, 22, w - 54, 50);
  c.save(); c.translate(w - 62, 150); c.scale(S, S); const sa = unitSprite(g, { side: 'confederate', arm: 'infantry' }, fu, bucketOf(1), 4); if (sa) blit(c, sa, 0, 0); c.restore(); num(9, w - 30, 114, w - 54, 142);
  void h;
}
const ANATOMY_NOTES = [
  ['1', 'Colour and shape: the side. A blue circle is Union, a red square Confederate; amber and hatched is a side the data contests.', 'Documented'],
  ['2', 'White glyph: the arm. A cross is infantry, a slash cavalry, a dot artillery.', 'Documented'],
  ['3', 'Ring: the strength, in quarters. A placement value, not a casualty record.', 'Modelled'],
  ['4', 'Code: the unit’s short name. The full name grows out of it when there is room, and on hover.', 'Documented'],
  ['5', 'Number: how many placement records the crowd stands for (records, never men).', 'Computed'],
  ['6', 'The pile behind it says several. Hover and the soft shape shows where each record truly stands.', 'Modelled'],
  ['7', 'Name: what the records share, a brigade, a division or a corps; Both sides when both armies are in it.', 'Computed'],
  ['8', 'A standard with pips is a brigade, division or corps record: one pip, two, three. Union swallow-tailed, Confederate pointed.', 'Documented'],
  ['9', 'Paler, thinner ring: the latest keyframe is a battle day or more old, so the position is carried forward.', 'Computed'],
];

const WORDS = {
  'side:union': 'Blue: a Union unit (circle) or formation (swallow-tailed standard). From the order of battle, or the U- id prefix',
  'side:confederate': 'Red: a Confederate unit (rounded square) or formation (pointed standard). From the order of battle, or the C- id prefix',
  'side:unknown': 'Amber, hatched: the side is CONTESTED (10 ids whose state code contradicts their prefix). Never drawn as a side',
  'side:mixed': 'Half blue, half red: a crowd that holds units of both sides, named Both sides; half amber and hatched: a crowd that holds contested ones. The data records no engagement, so nothing more is claimed',
  'arm:infantry': 'White cross: an infantry regiment', 'arm:cavalry': 'White slash: a cavalry regiment', 'arm:artillery': 'White dot: an artillery battery or battalion',
  'arm:mixed': 'No glyph, a count: a crowd of more than one arm', 'arm:formation': 'Pips, no arm: a brigade, division or corps record; the data gives a formation no arm, so none is claimed. Its code is Roman, corps / division / brigade (II/1/2); its name grows out of it when there is room',
  'echelon:1': 'A slightly larger disc: a battalion', 'echelon:2': 'One pip on a standard: a brigade record', 'echelon:3': 'Two pips, a larger standard: a division record', 'echelon:4': 'Three pips, the largest standard: a corps record',
  'fix:fresh': 'Full colour: the unit\'s latest keyframe is less than half a battle day old', 'fix:carried': 'Faded: the latest keyframe is a battle day or more old, so the position is carried forward, not a fresh report; the fade is gradual',
  'strength:1': 'The light ring is the strength gauge, in quarters: all four lit is the unit at its reference strength. A placement value, not a casualty record', 'strength:0.4': 'Two of the four quarters lit (shown at 40 percent): about half of the reference strength',
  'idOnly:idOnly': 'Italic code: no order-of-battle record for this id, so its name comes from the id alone',
  'aggregate:agg': 'A small standard with a number and a name: that many placement records share the mark because they cannot all stand on their true positions (records, never men). The name is what they share: a brigade, a division, a corps (or the corps they come from, or Both sides). Hover for the soft shape and the records',
  'selection:selected': 'Amber ring, drawn around the mark: the selected unit. Its name grows, its formation\'s hull appears',
  'pin:pin': 'A dot and a thin line: the true position of a mark that had to stand aside',
};

export const DISPATCH_FOOT = FOOT;
const channels = { side: true, arm: true, echelon: true, fix: true, strength: [1, 0.4], idOnly: true, aggregate: true, selection: true, pin: true };
const baseDef = (id, title, rows) => ({
  id, label: title, version: '1.0', footprint: FOOT, anatomy: { w: 320, h: 196, notes: ANATOMY_NOTES, paint: anatomy }, fonts: MARK_FONTS, tokens: rows, channels, fallbackSwatch: '#1c57a6', ownsHover: true,
  size: sizeOf, labelSize: labelSizeOf, words: WORDS, swatch: { w: 34, h: 26 },
  draw: { tile, label, pin, leader, focus, place }, sample,
});
const TEXT_ROWS = [['text.dy', 0.6, 'Vertical nudge of the text against the centre of the mark (the optical centre of capitals and figures).', { min: -3, max: 3, unit: 'u' }]];
const rowsFor = (set) => [...DISPATCH_TOKENS, ...TEXT_ROWS].map((r) => (set && set[r[0]] !== undefined ? [r[0], set[r[0]], r[2], r[3]] : r));

export const DISPATCH_PAPER = defineFamily(baseDef('dispatch-paper', 'Dispatch on paper', rowsFor(null)), DP_VARIANTS);
export const DISPATCH_AERIAL = defineFamily(baseDef('dispatch-aerial', 'Dispatch on the aerial', rowsFor(DA_SET)), DA_VARIANTS);
export const DISPATCH = [...DISPATCH_PAPER, ...DISPATCH_AERIAL];
export { frameOf, sizeOf, labelSizeOf, textStart, markRadius };
