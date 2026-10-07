// popups/fxdraw.mjs - draws the map-side ink of the popups: leader lines, the ring on a subject tile, the dashed ring of an approximate place, edge arrows for subjects off-screen.
//
// The rule that keeps every tile readable: popup ink is drawn BENEATH the chips (drawBeneath: leaders, place rings, arrows, the outward pulse) so a tile always paints over it, and the only
// ink above the chips is the subject ring, drawn INSIDE the chip's own box in the 2 px band every skin reserves for the selection ring (skins/contract.mjs), never outside it.
import { toneFamily } from './kit.mjs';

const FALLBACK = { critical: '#f2b134', high: '#d9a23a', medium: '#aab5c1', story: '#f2b134', day: '#f4f6f8', info: '#aab5c1' };
const colorOf = (colors, tone) => (colors && colors[toneFamily(tone)]) || FALLBACK[toneFamily(tone)] || '#aab5c1';
const UNDER = 'rgba(5,8,12,0.55)';        // d3 fork: the dark underlay that holds a hairline on bright ground (no white halos, no dashes, no glow)

function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.arcTo(x + w, y, x + w, y + r, r); c.lineTo(x + w, y + h - r); c.arcTo(x + w, y + h, x + w - r, y + h, r); c.lineTo(x + r, y + h); c.arcTo(x, y + h, x, y + h - r, r); c.lineTo(x, y + r); c.arcTo(x, y, x + r, y, r); c.closePath(); }

/** leaders, place rings, arrows, pulses: under every chip.  One hairline language: 1 px in the tone colour over a 3 px dark underlay; a ring is a ring (no dash), a terminus is a small square. */
export function drawBeneath(c, fx, colors) {
  if (!fx) return;
  c.save(); c.lineCap = 'butt'; c.lineJoin = 'miter';
  for (const p of fx.places) {
    const col = colorOf(colors, p.tone); c.globalAlpha = 0.95 * p.alpha; c.strokeStyle = UNDER; c.lineWidth = 3; c.beginPath(); c.arc(p.x, p.y, p.r, 0, Math.PI * 2); c.stroke();
    c.strokeStyle = col; c.lineWidth = 1; c.beginPath(); c.arc(p.x, p.y, p.r, 0, Math.PI * 2); c.stroke(); c.fillStyle = col; c.fillRect(Math.round(p.x) - 1.5, Math.round(p.y) - 1.5, 3, 3);
  }
  for (const a of fx.arrows) {
    const col = colorOf(colors, a.tone); c.globalAlpha = 0.95 * a.alpha; c.save(); c.translate(a.x, a.y); c.rotate(a.ang); c.beginPath(); c.moveTo(8, 0); c.lineTo(-5, -6); c.lineTo(-5, 6); c.closePath();
    c.fillStyle = col; c.strokeStyle = UNDER; c.lineWidth = 2; c.stroke(); c.fill(); c.restore();
  }
  for (const r of fx.rings) {
    if (!r.pulse) continue; const col = colorOf(colors, r.tone); const g = r.pulse.grow; c.globalAlpha = 0.6 * r.pulse.alpha * r.alpha; c.strokeStyle = col; c.lineWidth = 1;
    rr(c, r.rect.x0 - g, r.rect.y0 - g, r.rect.x1 - r.rect.x0 + 2 * g, r.rect.y1 - r.rect.y0 + 2 * g, 3 + g * 0.5); c.stroke();
  }
  for (const l of fx.leaders) {
    const col = colorOf(colors, l.tone); const x = l.x0 + (l.x1 - l.x0) * l.p; const y = l.y0 + (l.y1 - l.y0) * l.p; c.globalAlpha = Math.max(0, Math.min(1, l.alpha)) * 0.95;
    c.beginPath(); c.moveTo(l.x0, l.y0); c.lineTo(x, y); c.strokeStyle = UNDER; c.lineWidth = 3; c.stroke(); c.strokeStyle = col; c.lineWidth = 1; c.stroke();
    c.fillStyle = col; c.fillRect(Math.round(l.x0) - 1.5, Math.round(l.y0) - 1.5, 3, 3);
  }
  c.restore();
}

/** the subject ring: inside the chip box, in the reserved band; strength 1 for the primary subject, 0.5 for the others; a tile that stands for a parent (Modelled) gets the same ring, lighter (no dash) */
export function drawAbove(c, fx, colors) {
  if (!fx || !fx.rings.length) return;
  c.save();
  for (const r of fx.rings) {
    const col = colorOf(colors, r.tone); const x = r.rect.x0; const y = r.rect.y0; const w = r.rect.x1 - r.rect.x0; const h = r.rect.y1 - r.rect.y0; c.globalAlpha = Math.max(0, Math.min(1, r.alpha)) * r.strength * (r.dashed ? 0.6 : 1);
    c.lineWidth = 1; c.strokeStyle = 'rgba(5,8,12,0.9)'; rr(c, x + 0.5, y + 0.5, w - 1, h - 1, 5); c.stroke(); c.strokeStyle = col; rr(c, x + 1.5, y + 1.5, w - 3, h - 3, 4); c.stroke();
  }
  c.restore();
}
