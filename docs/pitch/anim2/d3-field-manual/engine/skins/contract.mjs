// skins/contract.mjs - THE SKIN CONTRACT: what a design pitch implements to change how the tiles look, and the check every skin must pass.
//
//   kernel.skins.register('my-skin', {
//     label: 'My skin', version: '1.0',
//     footprint: { chipH: 22, chipPadX: 6, glyphW: 16, ... },        // optional: the chip's size. The layout adapts (a bigger chip simply aggregates more). Any member of DEFAULT_FOOTPRINT.
//     fonts: { code: '700 11px ...', label: '600 12px ...', badge: '700 10px ...' },   // optional: the fonts draw() really uses (the layout measures THESE)
//     draw: {
//       tile(c, t, env)    REQUIRED  chip of a leaf or aggregate.  c is translated to the tile centre, scaled by t.scale and alpha-faded: draw the box [-t.w/2, t.w/2] x [-t.h/2, t.h/2]
//                          and NOTHING outside it (checked by checkSkin).  Reserve spec.ring on every side for the selection ring (t.selected).
//       label(c, t, env)   optional  secondary name label; c is translated to the label rectangle's top-left, the rectangle is [0, lw] x [0, lh] (lw = t.label.x1 - t.label.x0 ...)
//       pin(c, t, env)     optional  true-position pin; c is translated to the true position; stay within +-spec.pinHalf
//       leader(c, t, env, a, b)  optional  line from the pin (a) to the chip (b), screen coordinates; drawn beneath every chip
//       hull(c, t, env, pts)     optional  dots for the true positions of an aggregate's records, screen coordinates
//     },
//     legend() -> [{ swatch, text, evidence }]                        optional: what each mark claims, with the site's evidence label (Documented / Measured / Computed / Modelled / Contested / Unknown)
//   });
//
//   t   = a display tile (scene/display.mjs _frame): { key, kind: 'leaf'|'agg', n, w, h, scale, opacity, side: 'union'|'confederate'|'unknown'|'mixed', arm: 'infantry'|'cavalry'|'artillery'|'mixed',
//           short, badge, ratio (0..1 strength state), strength, disposition, selected, displaced, ageTicks, ageMin, ageMax, moving, unit, members, label, nameKind, travelling, entering }
//   env = { dpr, zoom, timeMs, tok, spec, sprite?(key, w, h, paint) }   tok(id) reads a token; spec = the tile spec (footprint numbers).  Nothing in env may be mutated.
//
// HONESTY RULES a skin must keep (they are the owner's "no errors" rule applied to ink): every channel it draws must be backed by a field above; a Modelled value must not look
// Documented; side 'unknown' must not look like Union or Confederate; an aggregate must show its count (t.badge); the tile must stay legible at the opacity it is given.
import { DEFAULT_FOOTPRINT } from '../layout/spec.mjs';
import { FONT_SPECS } from '../layout/text.mjs';

export function validateSkin(id, def) {
  const bad = (m) => { throw new Error(`skins/${id}: ${m}`); };
  if (typeof def.draw !== 'object' || typeof def.draw.tile !== 'function') bad('draw.tile(c, t, env) is required');
  for (const k of ['label', 'pin', 'leader', 'hull']) if (def.draw[k] !== undefined && typeof def.draw[k] !== 'function') bad(`draw.${k} must be a function`);
  if (def.footprint) for (const [k, v] of Object.entries(def.footprint)) { if (!(k in DEFAULT_FOOTPRINT)) bad(`unknown footprint member "${k}"`); if (!(typeof v === 'number' && v > 0)) bad(`footprint.${k} must be a positive number`); }
  if (def.fonts) for (const k of ['code', 'label', 'badge']) if (typeof def.fonts[k] !== 'string') bad(`fonts.${k} must be a CSS font string`);
  if (def.legend !== undefined && typeof def.legend !== 'function') bad('legend must be a function');
}

/** A recording 2D context for tests: it implements the drawing calls skins use and tracks the bounding box of everything painted (after the current transform), so a test can assert
 *  that a skin keeps its ink inside the footprint without a browser.  text widths come from the injected model (measureText) so the box of a string is real. */
export function recordingContext(textModel) {
  const box = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity, ops: 0 };
  let m = [1, 0, 0, 1, 0, 0]; const stack = []; let font = '700 11px sans-serif'; let lineWidth = 1; let path = []; let clipBox = null;
  const pt = (x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
  const grow = (x, y, pad = 0) => {
    let [px, py] = pt(x, y); let x0 = px - pad; let x1 = px + pad; let y0 = py - pad; let y1 = py + pad;
    if (clipBox) { x0 = Math.max(x0, clipBox.x0); x1 = Math.min(x1, clipBox.x1); y0 = Math.max(y0, clipBox.y0); y1 = Math.min(y1, clipBox.y1); if (x0 > x1 || y0 > y1) return; }
    box.x0 = Math.min(box.x0, x0); box.y0 = Math.min(box.y0, y0); box.x1 = Math.max(box.x1, x1); box.y1 = Math.max(box.y1, y1);
  };
  const fontKey = () => { for (const [k, v] of Object.entries(FONT_SPECS)) if (v === font) return k; return /700|bold/.test(font) ? 'code' : 'label'; };       // d3 fork: the exact font strings of the engine's table (the prototype guessed from the size)
  const pxOf = () => +(/(\d+(?:\.\d+)?)px/.exec(font) || [0, 11])[1];
  const c = {
    box, get lineWidth() { return lineWidth; }, set lineWidth(v) { lineWidth = v; },
    set font(v) { font = v; }, get font() { return font; },
    fillStyle: '#000', strokeStyle: '#000', globalAlpha: 1, textAlign: 'left', textBaseline: 'alphabetic', lineCap: 'butt', lineJoin: 'miter', globalCompositeOperation: 'source-over', shadowBlur: 0, shadowColor: 'transparent', filter: 'none',
    save() { stack.push([m.slice(), lineWidth, font, clipBox]); }, restore() { const s = stack.pop(); if (s) { m = s[0]; lineWidth = s[1]; font = s[2]; clipBox = s[3]; } },
    translate(x, y) { m = [m[0], m[1], m[2], m[3], m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]; }, scale(sx, sy) { m = [m[0] * sx, m[1] * sx, m[2] * sy, m[3] * sy, m[4], m[5]]; },
    rotate(a) { const cs = Math.cos(a); const sn = Math.sin(a); m = [m[0] * cs + m[2] * sn, m[1] * cs + m[3] * sn, m[2] * cs - m[0] * sn, m[3] * cs - m[1] * sn, m[4], m[5]]; }, setTransform() {}, resetTransform() {},
    beginPath() { path = []; }, closePath() {}, moveTo(x, y) { path.push([x, y]); }, lineTo(x, y) { path.push([x, y]); },
    arc(x, y, r) { path.push([x - r, y - r], [x + r, y + r]); }, arcTo(x1, y1, x2, y2) { path.push([x1, y1], [x2, y2]); }, rect(x, y, w, h) { path.push([x, y], [x + w, y + h]); },
    roundRect(x, y, w, h) { path.push([x, y], [x + w, y + h]); }, quadraticCurveTo(cx, cy, x, y) { path.push([cx, cy], [x, y]); }, bezierCurveTo(a, b, cc, d, x, y) { path.push([a, b], [cc, d], [x, y]); },
    fill() { box.ops++; for (const [x, y] of path) grow(x, y); }, stroke() { box.ops++; for (const [x, y] of path) grow(x, y, lineWidth / 2); },
    clip() { if (!path.length) return; const ps = path.map(([x, y]) => pt(x, y)); const b = { x0: Math.min(...ps.map((p) => p[0])), y0: Math.min(...ps.map((p) => p[1])), x1: Math.max(...ps.map((p) => p[0])), y1: Math.max(...ps.map((p) => p[1])) }; clipBox = clipBox ? { x0: Math.max(b.x0, clipBox.x0), y0: Math.max(b.y0, clipBox.y0), x1: Math.min(b.x1, clipBox.x1), y1: Math.min(b.y1, clipBox.y1) } : b; },
    fillRect(x, y, w, h) { box.ops++; grow(x, y); grow(x + w, y + h); }, strokeRect(x, y, w, h) { box.ops++; const p = lineWidth / 2; grow(x, y, p); grow(x + w, y + h, p); }, clearRect() {},
    setLineDash() {}, createLinearGradient() { return { addColorStop() {} }; }, createPattern() { return {}; },
    measureText(s) { return { width: textModel ? (textModel.width(fontKey(), s) - 1) / textModel.safety : s.length * 6 }; },
    fillText(s, x, y) { box.ops++; const w = c.measureText(s).width; const h = pxOf(); const ax = c.textAlign === 'center' ? x - w / 2 : c.textAlign === 'right' ? x - w : x; const ay = c.textBaseline === 'middle' ? y - h / 2 : c.textBaseline === 'top' ? y : c.textBaseline === 'bottom' ? y - h : y - h * 0.8; grow(ax, ay); grow(ax + w, ay + h); },
    drawImage(img, x, y, w, h) { box.ops++; grow(x, y); grow(x + (w ?? img.width ?? 0), y + (h ?? img.height ?? 0)); },
  };
  return c;
}

/** Conformance check for a skin on a set of sample tiles: returns a list of problems (empty = conforms).  The ink of draw.tile must stay inside the footprint box
 *  (+ 0.5 px for anti-aliasing), the label inside its rectangle, the pin inside pinHalf.  Run it in your own skin's test. */
export function checkSkin(skin, spec, tiles, textModel, tol = 0.5) {
  const problems = []; const env = { dpr: 1, zoom: 15, timeMs: 0, tok: () => true, spec };
  for (const t of tiles) {
    const c = recordingContext(textModel); skin.draw.tile(c, t, env);
    const b = c.box; const hw = t.w / 2 + tol; const hh = t.h / 2 + tol;
    if (b.ops === 0) problems.push(`${t.key}: draw.tile painted nothing`);
    else if (b.x0 < -hw || b.x1 > hw || b.y0 < -hh || b.y1 > hh) problems.push(`${t.key} (${t.side}/${t.arm}${t.selected ? ' selected' : ''}): ink [${b.x0.toFixed(1)}, ${b.y0.toFixed(1)}, ${b.x1.toFixed(1)}, ${b.y1.toFixed(1)}] leaves the footprint box ±${(t.w / 2).toFixed(1)} x ±${(t.h / 2).toFixed(1)}`);
    if (skin.draw.label && t.label) { const lw = t.label.x1 - t.label.x0; const lh = t.label.y1 - t.label.y0; const c2 = recordingContext(textModel); skin.draw.label(c2, t, env); const q = c2.box; if (q.ops && (q.x0 < -tol || q.y0 < -tol || q.x1 > lw + tol || q.y1 > lh + tol)) problems.push(`${t.key}: label ink [${q.x0.toFixed(1)}, ${q.y0.toFixed(1)}, ${q.x1.toFixed(1)}, ${q.y1.toFixed(1)}] leaves its ${lw}x${lh} rectangle`); }
    if (skin.draw.pin) { const c3 = recordingContext(textModel); skin.draw.pin(c3, t, env); const q = c3.box; if (q.ops && (q.x0 < -spec.pinHalf - tol || q.x1 > spec.pinHalf + tol || q.y0 < -spec.pinHalf - tol || q.y1 > spec.pinHalf + tol)) problems.push(`${t.key}: pin ink leaves ±${spec.pinHalf}`); }
  }
  return problems;
}
