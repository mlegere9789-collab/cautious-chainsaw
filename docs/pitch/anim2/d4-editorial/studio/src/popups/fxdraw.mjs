// popups/fxdraw.mjs - draws the map-side ink of the popups: leader lines, the ring on a subject tile, the dashed ring of an approximate place, edge arrows for subjects off-screen.
//
// The rule that keeps every tile readable: popup ink is drawn BENEATH the chips (drawBeneath: leaders, place rings, arrows, the outward pulse) so a tile always paints over it, and the only
// ink above the chips is the subject ring, drawn INSIDE the chip's own box in the 2 px band every skin reserves for the selection ring (skins/contract.mjs), never outside it.
import { toneFamily } from './kit.mjs';

const FALLBACK = { critical: '#e0553a', high: '#d9a21b', medium: '#c9b02a', story: '#c8a84a', day: '#c8a84a', info: '#4d8fe0', union: '#1c57a6', confederate: '#c2441b' };
const colorOf = (colors, tone) => (colors && colors[toneFamily(tone)]) || FALLBACK[toneFamily(tone)] || '#4d8fe0';

function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.arcTo(x + w, y, x + w, y + r, r); c.lineTo(x + w, y + h - r); c.arcTo(x + w, y + h, x + w - r, y + h, r); c.lineTo(x + r, y + h); c.arcTo(x, y + h, x, y + h - r, r); c.lineTo(x, y + r); c.arcTo(x, y, x + r, y, r); c.closePath(); }

/** the map-side ink of the popups, in the Dispatch language: a highlighter behind the subject, a thin leader that ends in a small ring on the subject, a soft disc for an approximate place.
 *  Everything is drawn BENEATH the marks (a mark always paints over it).  No dashed line: an approximate place is a soft disc, an exact one a ring.  `halo` is the colour of the ground's paper. */
export function drawBeneath(c, fx, colors) {
  if (!fx) return;
  c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
  // the highlighter: the subject marks, as if marked with a pen (strength 1 the subject, 0.5 the others; a unit that stands for its parent (Modelled) is lighter still)
  for (const r of fx.rings) {
    const col = colorOf(colors, r.tone); const x = r.rect.x0 - 1; const y = r.rect.y0 + 1; const w = r.rect.x1 - r.rect.x0 + 2; const h = r.rect.y1 - r.rect.y0 - 2; const a = Math.max(0, Math.min(1, r.alpha)) * r.strength * (r.dashed ? 0.55 : 1);
    c.globalAlpha = 0.24 * a; c.fillStyle = col; rr(c, x, y, w, h, 5); c.fill(); c.globalAlpha = 0.7 * a; c.strokeStyle = col; c.lineWidth = 1; rr(c, x + 0.5, y + 0.5, w - 1, h - 1, 4.5); c.stroke();
  }
  for (const p of fx.places) {
    const col = colorOf(colors, p.tone); c.globalAlpha = 0.16 * p.alpha; c.fillStyle = col; c.beginPath(); c.arc(p.x, p.y, p.r, 0, Math.PI * 2); c.fill();
    c.globalAlpha = 0.75 * p.alpha; c.strokeStyle = col; c.lineWidth = 1.3; c.beginPath(); c.arc(p.x, p.y, p.r, 0, Math.PI * 2); c.stroke(); c.fillStyle = col; c.beginPath(); c.arc(p.x, p.y, 2.4, 0, Math.PI * 2); c.fill();
  }
  for (const a of fx.arrows) {
    const col = colorOf(colors, a.tone); c.globalAlpha = 0.95 * a.alpha; c.save(); c.translate(a.x, a.y); c.rotate(a.ang); c.beginPath(); c.moveTo(9, 0); c.lineTo(-5, -6.5); c.lineTo(-2, 0); c.lineTo(-5, 6.5); c.closePath();
    c.fillStyle = col; c.strokeStyle = 'rgba(255,255,255,0.9)'; c.lineWidth = 1.3; c.stroke(); c.fill(); c.restore();
  }
  for (const r of fx.rings) {
    if (!r.pulse) continue; const col = colorOf(colors, r.tone); const g = r.pulse.grow; c.globalAlpha = 0.5 * r.pulse.alpha * r.alpha; c.strokeStyle = col; c.lineWidth = 1.5;
    rr(c, r.rect.x0 - g, r.rect.y0 - g, r.rect.x1 - r.rect.x0 + 2 * g, r.rect.y1 - r.rect.y0 + 2 * g, 5 + g * 0.6); c.stroke();
  }
  for (const l of fx.leaders) {
    const col = colorOf(colors, l.tone); const x = l.x0 + (l.x1 - l.x0) * l.p; const y = l.y0 + (l.y1 - l.y0) * l.p; c.globalAlpha = Math.max(0, Math.min(1, l.alpha)) * 0.95;
    c.beginPath(); c.moveTo(l.x0, l.y0); c.lineTo(x, y); c.strokeStyle = 'rgba(255,255,255,0.55)'; c.lineWidth = 3; c.stroke(); c.strokeStyle = col; c.lineWidth = 1.2; c.stroke();
    if (l.p >= 0.999 && l.onTile) { c.beginPath(); c.arc(l.x1, l.y1, 3.3, 0, Math.PI * 2); c.fillStyle = 'rgba(255,255,255,0.9)'; c.fill(); c.lineWidth = 1.4; c.strokeStyle = col; c.stroke(); }
  }
  c.restore();
}

/** the first prototype drew a ring above the chips; the highlighter beneath the marks replaces it (a mark is never drawn over) */
export function drawAbove() { /* intentionally empty */ }
