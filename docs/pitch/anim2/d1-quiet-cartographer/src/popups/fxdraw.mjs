// popups/fxdraw.mjs - draws the map-side ink of the popups: leader lines, the ring on a subject tile, the dashed ring of an approximate place, edge arrows for subjects off-screen.
//
// The rule that keeps every tile readable: popup ink is drawn BENEATH the chips (drawBeneath: leaders, place rings, arrows, the outward pulse) so a tile always paints over it, and the only
// ink above the chips is the subject ring, drawn INSIDE the chip's own box in the 2 px band every skin reserves for the selection ring (skins/contract.mjs), never outside it.
import { toneFamily } from './kit.mjs';

const FALLBACK = { critical: '#e0553a', high: '#d9a21b', medium: '#c9b02a', story: '#c8a84a', day: '#c8a84a', info: '#4d8fe0' };
const colorOf = (colors, tone) => (colors && colors[toneFamily(tone)]) || FALLBACK[toneFamily(tone)] || '#4d8fe0';

/** the underlay of every popup ink: dark on the night ground, paper on the day ground (a dark rope under a hairline on a pale sheet was the heaviest line of the page) */
const under = (a) => `rgba(${typeof document !== 'undefined' && document.documentElement.dataset.theme === 'light' ? '251,248,240' : '6,9,13'},${a})`;

function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.arcTo(x + w, y, x + w, y + r, r); c.lineTo(x + w, y + h - r); c.arcTo(x + w, y + h, x + w - r, y + h, r); c.lineTo(x + r, y + h); c.arcTo(x, y + h, x, y + h - r, r); c.lineTo(x, y + r); c.arcTo(x, y, x + r, y, r); c.closePath(); }

/** leaders, place rings, arrows, pulses: under every chip.  FORK (d1 Quiet Cartographer): hairlines in the card's tone over a dark underlay; a ring with a gap (not a dashed one) for a place that is only approximate. */
export function drawBeneath(c, fx, colors) {
  if (!fx) return;
  c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
  for (const p of fx.places) {
    const col = colorOf(colors, p.tone); c.globalAlpha = 0.95 * p.alpha;
    for (const [w, st] of [[3.2, under(0.6)], [1.3, col]]) { c.strokeStyle = st; c.lineWidth = w; c.beginPath(); c.arc(p.x, p.y, p.r, 0.5, Math.PI * 2 - 0.5); c.stroke(); }
    c.fillStyle = col; c.beginPath(); c.arc(p.x, p.y, 2, 0, Math.PI * 2); c.fill();
  }
  for (const a of fx.arrows) {
    const col = colorOf(colors, a.tone); c.globalAlpha = 0.95 * a.alpha; c.save(); c.translate(a.x, a.y); c.rotate(a.ang); c.beginPath(); c.moveTo(9, 0); c.lineTo(-5, -6); c.lineTo(-2, 0); c.lineTo(-5, 6); c.closePath();
    c.fillStyle = col; c.strokeStyle = under(0.7); c.lineWidth = 1.6; c.stroke(); c.fill(); c.restore();
  }
  for (const r of fx.rings) {
    if (!r.pulse) continue; const col = colorOf(colors, r.tone); const g = r.pulse.grow; c.globalAlpha = 0.5 * r.pulse.alpha * r.alpha; c.strokeStyle = col; c.lineWidth = 1.2;
    const px = r.pip ? r.pip.x : (r.rect.x0 + r.rect.x1) / 2; const py = r.pip ? r.pip.y : (r.rect.y0 + r.rect.y1) / 2; c.beginPath(); c.arc(px, py, RING_R + g, 0, Math.PI * 2); c.stroke();
  }
  for (const l of fx.leaders) {
    const col = colorOf(colors, l.tone); const x = l.x0 + (l.x1 - l.x0) * l.p; const y = l.y0 + (l.y1 - l.y0) * l.p; c.globalAlpha = Math.max(0, Math.min(1, l.alpha)) * 0.9;
    c.beginPath(); c.moveTo(l.x0, l.y0); c.lineTo(x, y); c.strokeStyle = under(0.6); c.lineWidth = 2.4; c.stroke(); c.strokeStyle = col; c.lineWidth = 1; c.stroke();
    c.fillStyle = col; c.beginPath(); c.arc(l.x0, l.y0, 2, 0, Math.PI * 2); c.fill(); if (l.p >= 0.999) { c.strokeStyle = col; c.lineWidth = 1; c.beginPath(); c.arc(l.x1, l.y1, 2.6, 0, Math.PI * 2); c.fillStyle = under(0.65); c.fill(); c.stroke(); }
  }
  c.restore();
}

/** the subject ring (round 2): a ring round the PIP of the subject mark, a hairline in the card's tone under a paper underlay; strength 1 for the primary subject, 0.5 for the others; lighter when the mark stands for a parent (Modelled).
 *  It is the skin's own selection ring that says "selected"; this one says "this is what the card is about", and never frames the words. */
const RING_R = 10.5;
export function drawAbove(c, fx, colors) {
  if (!fx || !fx.rings.length) return;
  c.save();
  for (const r of fx.rings) {
    if (r.selected) continue;      // the skin's own ring already stands round a selected mark
    const col = colorOf(colors, r.tone); const px = r.pip ? r.pip.x : (r.rect.x0 + r.rect.x1) / 2; const py = r.pip ? r.pip.y : (r.rect.y0 + r.rect.y1) / 2; c.globalAlpha = Math.max(0, Math.min(1, r.alpha)) * r.strength * (r.dashed ? 0.6 : 1);
    c.lineWidth = 3.2; c.strokeStyle = under(0.7); c.beginPath(); c.arc(px, py, RING_R, 0, Math.PI * 2); c.stroke(); c.lineWidth = 1.5; c.strokeStyle = col; c.beginPath(); c.arc(px, py, RING_R, 0, Math.PI * 2); c.stroke();
  }
  c.restore();
}
