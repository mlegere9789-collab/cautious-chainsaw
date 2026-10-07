// popups/fxdraw.mjs - draws the map-side ink of the popups in the language of the marks: the leader of a card (a thin line in the card's tone over a dark underlay, a peg at the mark, a ring at the card),
// the ring on a subject mark (inside the 2 px band every mark reserves, never outside it), the ring of an approximate place (open ring, no dashes), the arrows for subjects off-screen.
//
// The rule that keeps every mark readable: popup ink is drawn BENEATH the marks (drawBeneath: leaders, place rings, arrows, the outward pulse) so a mark always paints over it, and the only
// ink above the marks is the subject ring, drawn INSIDE the mark's own footprint in the band the skin reserves for selection (skins/contract.mjs), never outside it.
import { toneFamily } from './kit.mjs';

const FALLBACK = { critical: '#ea6a4f', high: '#eab24a', medium: '#cdb85a', story: '#e8c76f', day: '#e8c76f', info: '#82aee6' };
const colorOf = (colors, tone) => (colors && colors[toneFamily(tone)]) || FALLBACK[toneFamily(tone)] || '#82aee6';
const DARK = 'rgba(6,10,16,0.6)';

function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.arcTo(x + w, y, x + w, y + r, r); c.lineTo(x + w, y + h - r); c.arcTo(x + w, y + h, x + w - r, y + h, r); c.lineTo(x + r, y + h); c.arcTo(x, y + h, x, y + h - r, r); c.lineTo(x, y + r); c.arcTo(x, y, x + r, y, r); c.closePath(); }

/** leaders, place rings, arrows, pulses: under every mark */
export function drawBeneath(c, fx, colors) {
  if (!fx) return;
  c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
  for (const p of fx.places) {                                                  // the place of an event with no mark: an open ring (a circle, not a dashed one) with a soft halo
    const col = colorOf(colors, p.tone); c.globalAlpha = 0.95 * p.alpha;
    c.beginPath(); c.arc(p.x, p.y, p.r, 0, Math.PI * 2); c.strokeStyle = DARK; c.lineWidth = 4; c.stroke(); c.strokeStyle = col; c.lineWidth = 1.8; c.stroke();
    c.beginPath(); c.arc(p.x, p.y, p.r + 5, 0, Math.PI * 2); c.strokeStyle = col; c.globalAlpha = 0.28 * p.alpha; c.lineWidth = 1; c.stroke(); c.globalAlpha = 0.95 * p.alpha;
    c.fillStyle = col; c.beginPath(); c.arc(p.x, p.y, 2.2, 0, Math.PI * 2); c.fill();
  }
  for (const a of fx.arrows) {
    const col = colorOf(colors, a.tone); c.globalAlpha = 0.95 * a.alpha; c.save(); c.translate(a.x, a.y); c.rotate(a.ang); c.beginPath(); c.moveTo(10, 0); c.lineTo(-5, -7.5); c.lineTo(-2, 0); c.lineTo(-5, 7.5); c.closePath();
    c.fillStyle = col; c.strokeStyle = 'rgba(6,10,16,0.85)'; c.lineWidth = 2; c.stroke(); c.fill(); c.restore();
  }
  for (const r of fx.rings) {
    if (!r.pulse) continue; const col = colorOf(colors, r.tone); const g = r.pulse.grow; c.globalAlpha = 0.6 * r.pulse.alpha * r.alpha; c.strokeStyle = col; c.lineWidth = 1.6;
    rr(c, r.rect.x0 - g, r.rect.y0 - g, r.rect.x1 - r.rect.x0 + 2 * g, r.rect.y1 - r.rect.y0 + 2 * g, 5 + g * 0.6); c.stroke();
  }
  for (const l of fx.leaders) {
    const col = colorOf(colors, l.tone); const x = l.x0 + (l.x1 - l.x0) * l.p; const y = l.y0 + (l.y1 - l.y0) * l.p; c.globalAlpha = Math.max(0, Math.min(1, l.alpha)) * 0.95;
    c.beginPath(); c.moveTo(l.x0, l.y0); c.lineTo(x, y); c.strokeStyle = DARK; c.lineWidth = 3.4; c.stroke(); c.strokeStyle = col; c.lineWidth = 1.4; c.stroke();
    c.beginPath(); c.arc(l.x0, l.y0, 3, 0, Math.PI * 2); c.fillStyle = DARK; c.fill(); c.beginPath(); c.arc(l.x0, l.y0, 2.1, 0, Math.PI * 2); c.fillStyle = col; c.fill();
    if (l.p >= 0.999) { c.beginPath(); c.arc(l.x1, l.y1, 4, 0, Math.PI * 2); c.fillStyle = DARK; c.fill(); c.beginPath(); c.arc(l.x1, l.y1, 3, 0, Math.PI * 2); c.fillStyle = '#f2ecdc'; c.fill(); c.beginPath(); c.arc(l.x1, l.y1, 1.7, 0, Math.PI * 2); c.fillStyle = col; c.fill(); }
  }
  c.restore();
}

/** the subject ring: inside the mark's footprint, in the reserved band; strength 1 for the primary subject (a ring and a soft glow), 0.5 for the others (the ring alone); a mark that stands for a parent (Modelled) gets a thinner ring */
export function drawAbove(c, fx, colors) {
  if (!fx || !fx.rings.length) return;
  c.save();
  for (const r of fx.rings) {
    const col = colorOf(colors, r.tone); const x = r.rect.x0; const y = r.rect.y0; const w = r.rect.x1 - r.rect.x0; const h = r.rect.y1 - r.rect.y0; c.globalAlpha = Math.max(0, Math.min(1, r.alpha)) * r.strength;
    if (!r.dashed) { rr(c, x + 1.1, y + 1.1, w - 2.2, h - 2.2, 5); c.lineWidth = 3; c.strokeStyle = 'rgba(6,10,16,0.45)'; c.stroke(); }
    rr(c, x + 1.1, y + 1.1, w - 2.2, h - 2.2, 5); c.lineWidth = r.dashed ? 1 : 1.6; c.strokeStyle = col; c.stroke();
  }
  c.restore();
}
