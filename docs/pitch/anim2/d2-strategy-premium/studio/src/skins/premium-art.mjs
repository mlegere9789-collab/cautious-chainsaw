// skins/premium-art.mjs - the drawing primitives of the Strategy Premium language: the banner outline (swallow-tail, point, square), the arm and echelon signs, the gilt count pill,
// the baked ground shadow.  Pure Canvas2D, no state of its own except the shadow sprite cache.  Every function draws in the caller's coordinate system (the skin translates to the tile centre).
//
// One rule per line weight and radius (the owner's complaint 7): one corner radius (geo.radius), one hairline (geo.hairline), the selection ring is 1.5 x the hairline.
import { clamp01 } from './kit.mjs';

export const TAU = Math.PI * 2;
export const easeOutCubic = (x) => { x = clamp01(x); return 1 - (1 - x) ** 3; };

/** the fly-edge shape of a side: Union = swallow-tail (a notch), Confederate = pointed, anything else = square.  A design redundancy for the side (it survives greyscale); not a claim about 1863 flags. */
export const shapeOfSide = (side) => (side === 'union' ? 'swallow' : side === 'confederate' ? 'point' : 'square');

/** the banner outline.  x, y, w, h = the body box; r = corner radius; d = fly depth; fl = optional [top, middle, bottom] x offsets of the fly vertices (the flutter of a unit in transit) */
export function bannerPath(c, x, y, w, h, shape, r, d, fl) {
  const x1 = x + w; const y1 = y + h; const ym = y + h / 2; const f0 = fl ? fl[0] : 0; const f1 = fl ? fl[1] : 0; const f2 = fl ? fl[2] : 0;
  c.beginPath(); c.moveTo(x + r, y);
  if (shape === 'swallow') { c.lineTo(x1 - 1.2 + f0, y); c.lineTo(x1 - d + f1, ym); c.lineTo(x1 - 1.2 + f2, y1); }
  else if (shape === 'point') { c.lineTo(x1 - d + f0, y); c.lineTo(x1 + f1, ym); c.lineTo(x1 - d + f2, y1); }
  else { c.lineTo(x1 - r, y); c.arcTo(x1, y, x1, y + r, r); c.lineTo(x1, y1 - r); c.arcTo(x1, y1, x1 - r, y1, r); }
  c.lineTo(x + r, y1); c.arcTo(x, y1, x, y1 - r, r); c.lineTo(x, y + r); c.arcTo(x, y, x + r, y, r); c.closePath();
}

/** a rounded rectangle path (one radius, the language's) */
export function rr(c, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); c.beginPath(); c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.arcTo(x + w, y, x + w, y + r, r); c.lineTo(x + w, y + h - r); c.arcTo(x + w, y + h, x + w - r, y + h, r); c.lineTo(x + r, y + h); c.arcTo(x, y + h, x, y + h - r, r); c.lineTo(x, y + r); c.arcTo(x, y, x + r, y, r); c.closePath(); }

/** the arm signs: infantry = crossed muskets (a saltire), cavalry = a sabre, artillery = a gun on its wheel.  s = half size, ink = stroke colour */
export function armSign(c, arm, cx, cy, s, ink, lw) {
  c.save(); c.translate(cx, cy); c.strokeStyle = ink; c.fillStyle = ink; c.lineWidth = lw; c.lineCap = 'round'; c.lineJoin = 'round';
  if (arm === 'infantry') {
    c.beginPath(); c.moveTo(-s, -s); c.lineTo(s, s); c.moveTo(s, -s); c.lineTo(-s, s); c.stroke();
    c.lineWidth = lw * 0.9; c.beginPath(); c.moveTo(-s - 0.1, s * 0.46); c.lineTo(-s * 0.46, s + 0.1); c.moveTo(s + 0.1, s * 0.46); c.lineTo(s * 0.46, s + 0.1); c.stroke();      // the butts
  } else if (arm === 'cavalry') {
    c.beginPath(); c.moveTo(-s * 0.8, s * 0.9); c.lineTo(s * 0.95, -s * 0.95); c.stroke();                                                                                         // the blade
    c.lineWidth = lw * 0.9; c.beginPath(); c.moveTo(-s * 0.75, -s * 0.3); c.lineTo(s * 0.05, s * 0.5); c.stroke();                                                                  // the guard
  } else if (arm === 'artillery') {
    c.beginPath(); c.arc(-s * 0.22, s * 0.3, s * 0.62, 0, TAU); c.stroke();                                                                                                         // the wheel
    c.lineWidth = lw * 1.5; c.lineCap = 'butt'; c.beginPath(); c.moveTo(-s * 0.1, s * 0.1); c.lineTo(s * 1.0, -s * 0.85); c.stroke();                                              // the barrel
  } else if (arm === 'mixed') {
    c.beginPath(); c.moveTo(-s, -s * 0.6); c.lineTo(s, -s * 0.6); c.moveTo(-s, 0); c.lineTo(s, 0); c.moveTo(-s, s * 0.6); c.lineTo(s, s * 0.6); c.stroke();
  }
  c.restore();
}

/** echelon signs of a formation: X marks (brigade 1, division 2, corps 3) stacked vertically; battalion: two bars.  Documented convention (APP-6: X = brigade, XX = division, XXX = corps) */
export function echSign(c, level, cx, cy, ink, lw) {
  c.save(); c.strokeStyle = ink; c.lineWidth = lw; c.lineCap = 'round';
  if (level >= 2) {
    const n = level - 1; const gap = 5.6; const y0 = cy - (n - 1) * gap / 2; const s = 2.5;
    for (let i = 0; i < n; i++) { const y = y0 + i * gap; c.beginPath(); c.moveTo(cx - s, y - s); c.lineTo(cx + s, y + s); c.moveTo(cx + s, y - s); c.lineTo(cx - s, y + s); c.stroke(); }
  } else if (level === 1) { c.beginPath(); c.moveTo(cx - 2, cy - 2.6); c.lineTo(cx - 2, cy + 2.6); c.moveTo(cx + 2, cy - 2.6); c.lineTo(cx + 2, cy + 2.6); c.stroke(); }
  c.restore();
}

// ---- the baked ground shadow -------------------------------------------------------------------------------------------------------------------------------------
// Light from the north-west, so the shadow falls south-east: a soft one (blur, offset) and a tight contact one under the lower edge.  Baked once per size and side shape: it is a bitmap blit per
// frame.  Drawn in its own pass before every mark, so a shadow never darkens another mark (it lies on the ground).
const SH = new Map(); export const shadowStats = { bakes: 0, hits: 0, clears: 0 }; if (typeof window !== 'undefined') window.__shadowStats = shadowStats;
function makeCanvas(w, h) { if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h); const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
/** sprite of the shadow of a banner of body size w x h (CSS px) at device scale S: { canvas, ox, oy, w, h } with (ox, oy) the sprite's top-left relative to the body's top-left, in CSS px */
export function shadowSprite(P, w, h, shape, layers, S, lift) {
  const key = [w, h, shape, layers, S, lift.toFixed(1), P['light.shadowAlpha'], P['light.shadowDx'], P['light.shadowDy'], P['light.shadowBlur'], P['light.contactAlpha'], P['geo.radius'], P['geo.fly'], P['geo.stack']].join('|');
  let s = SH.get(key); if (s) { shadowStats.hits++; return s; } shadowStats.bakes++;
  const blur = P['light.shadowBlur'] * (1 + lift * 0.18); const dx = P['light.shadowDx'] + lift * 0.4; const dy = P['light.shadowDy'] + lift * 0.9;
  const m = Math.ceil(blur * 1.5 + Math.max(Math.abs(dx), Math.abs(dy)) + 3 + (layers > 1 ? (layers - 1) * P['geo.stack'] : 0)); const cw = Math.ceil(w + 2 * m); const ch = Math.ceil(h + 2 * m);
  const cv = makeCanvas(cw * S, ch * S); const g = cv.getContext('2d'); const OFF = cw + 40; const r = P['geo.radius']; const d = P['geo.fly']; const st = P['geo.stack'];
  const shadow = (alpha, ox, oy, b) => {
    g.save(); g.shadowColor = `rgba(2,5,10,${alpha})`; g.shadowBlur = b * S; g.shadowOffsetX = (OFF + ox) * S; g.shadowOffsetY = oy * S; g.fillStyle = '#000';
    g.scale(S, S); g.translate(m - OFF, m);
    for (let i = layers - 1; i >= 0; i--) { bannerPath(g, -i * st, -i * st, w, h, shape, r, d); g.fill(); }
    g.restore();
  };
  shadow(P['light.shadowAlpha'], dx, dy, blur);
  shadow(P['light.contactAlpha'], 0.4, 1.1, 1.6);
  s = { canvas: cv, ox: -m, oy: -m, w: cw, h: ch };
  if (SH.size > 400) { SH.clear(); shadowStats.clears++; } SH.set(key, s); return s;
}
export function clearSprites() { SH.clear(); }
