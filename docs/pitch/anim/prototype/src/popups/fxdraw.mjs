// popups/fxdraw.mjs - draws the map-side ink of the popups: leader lines, the ring on a subject tile, the dashed ring of an approximate place, edge arrows for subjects off-screen.
//
// The rule that keeps every tile readable: popup ink is drawn BENEATH the chips (drawBeneath: leaders, place rings, arrows, the outward pulse) so a tile always paints over it, and the only
// ink above the chips is the subject ring, drawn INSIDE the chip's own box in the 2 px band every skin reserves for the selection ring (skins/contract.mjs), never outside it.
import { toneFamily } from './kit.mjs';

const FALLBACK = { critical: '#e0553a', high: '#d9a21b', medium: '#c9b02a', story: '#c8a84a', day: '#c8a84a', info: '#4d8fe0' };
const colorOf = (colors, tone) => (colors && colors[toneFamily(tone)]) || FALLBACK[toneFamily(tone)] || '#4d8fe0';

function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.arcTo(x + w, y, x + w, y + r, r); c.lineTo(x + w, y + h - r); c.arcTo(x + w, y + h, x + w - r, y + h, r); c.lineTo(x + r, y + h); c.arcTo(x, y + h, x, y + h - r, r); c.lineTo(x, y + r); c.arcTo(x, y, x + r, y, r); c.closePath(); }

/** leaders, place rings, arrows, pulses: under every chip */
export function drawBeneath(c, fx, colors) {
  if (!fx) return;
  c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
  for (const p of fx.places) {
    const col = colorOf(colors, p.tone); c.globalAlpha = 0.9 * p.alpha; c.setLineDash([4, 4]); c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 3.4; c.beginPath(); c.arc(p.x, p.y, p.r, 0, Math.PI * 2); c.stroke();
    c.strokeStyle = col; c.lineWidth = 1.7; c.beginPath(); c.arc(p.x, p.y, p.r, 0, Math.PI * 2); c.stroke(); c.setLineDash([]); c.fillStyle = col; c.beginPath(); c.arc(p.x, p.y, 2.2, 0, Math.PI * 2); c.fill();
  }
  for (const a of fx.arrows) {
    const col = colorOf(colors, a.tone); c.globalAlpha = 0.95 * a.alpha; c.save(); c.translate(a.x, a.y); c.rotate(a.ang); c.beginPath(); c.moveTo(9, 0); c.lineTo(-5, -7); c.lineTo(-2, 0); c.lineTo(-5, 7); c.closePath();
    c.fillStyle = col; c.strokeStyle = 'rgba(255,255,255,0.85)'; c.lineWidth = 1.4; c.stroke(); c.fill(); c.restore();
  }
  for (const r of fx.rings) {
    if (!r.pulse) continue; const col = colorOf(colors, r.tone); const g = r.pulse.grow; c.globalAlpha = 0.55 * r.pulse.alpha * r.alpha; c.strokeStyle = col; c.lineWidth = 2;
    rr(c, r.rect.x0 - g, r.rect.y0 - g, r.rect.x1 - r.rect.x0 + 2 * g, r.rect.y1 - r.rect.y0 + 2 * g, 5 + g * 0.6); c.stroke();
  }
  for (const l of fx.leaders) {
    const col = colorOf(colors, l.tone); const x = l.x0 + (l.x1 - l.x0) * l.p; const y = l.y0 + (l.y1 - l.y0) * l.p; c.globalAlpha = Math.max(0, Math.min(1, l.alpha)) * 0.95;
    c.beginPath(); c.moveTo(l.x0, l.y0); c.lineTo(x, y); c.strokeStyle = 'rgba(255,255,255,0.62)'; c.lineWidth = 3.4; c.stroke(); c.strokeStyle = col; c.lineWidth = 1.6; c.stroke();
    c.fillStyle = col; c.beginPath(); c.arc(l.x0, l.y0, 2.6, 0, Math.PI * 2); c.fill(); if (l.p >= 0.999) { c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = 1; c.beginPath(); c.arc(l.x1, l.y1, 3.6, 0, Math.PI * 2); c.fillStyle = col; c.fill(); c.stroke(); }
  }
  c.restore();
}

/** the subject ring: inside the chip box, in the reserved band; strength 1 for the primary subject, 0.5 for the others; dashed when the tile stands for a parent (Modelled) */
export function drawAbove(c, fx, colors) {
  if (!fx || !fx.rings.length) return;
  c.save();
  for (const r of fx.rings) {
    const col = colorOf(colors, r.tone); const x = r.rect.x0; const y = r.rect.y0; const w = r.rect.x1 - r.rect.x0; const h = r.rect.y1 - r.rect.y0; c.globalAlpha = Math.max(0, Math.min(1, r.alpha)) * r.strength;
    c.setLineDash(r.dashed ? [3, 2.5] : []); c.lineWidth = 2; c.strokeStyle = 'rgba(255,255,255,0.9)'; rr(c, x + 1, y + 1, w - 2, h - 2, 4.5); c.stroke(); c.lineWidth = 1.2; c.strokeStyle = col; rr(c, x + 1, y + 1, w - 2, h - 2, 4.5); c.stroke();
  }
  c.restore();
}
