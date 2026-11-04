// popups/fxdraw.mjs - draws the map-side ink of the popups: leader lines, the ring on a subject mark, the soft disc of an approximate place, edge arrows for subjects off-screen.
//
// Round 2.  A subject is shown by a RING in the colour of its side around the mark itself (no highlighter, no box, no pill: nothing larger than the mark), and a card reaches it with a short
// ELBOW of 1 px in that colour, over a thin paper halo, that the host has already tested against every mark, name and pin (popups/geom.mjs elbowPath).  Everything is drawn BENEATH the marks (a mark
// always paints over it); the ring is the only ink the language puts around a mark, and it stays inside the 2 px band every mark reserves for it.
import { toneFamily } from './kit.mjs';

const FALLBACK = { critical: '#e0553a', high: '#d9a21b', medium: '#c9b02a', story: '#c8a84a', day: '#c8a84a', info: '#4d8fe0', union: '#1c57a6', confederate: '#c2441b' };
const colorOf = (colors, tone) => (colors && colors[toneFamily(tone)]) || FALLBACK[toneFamily(tone)] || '#4d8fe0';

function rr(c, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); c.beginPath(); c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.arcTo(x + w, y, x + w, y + r, r); c.lineTo(x + w, y + h - r); c.arcTo(x + w, y + h, x + w - r, y + h, r); c.lineTo(x + r, y + h); c.arcTo(x, y + h, x, y + h - r, r); c.lineTo(x, y + r); c.arcTo(x, y, x + r, y, r); c.closePath(); }
/** the ring around a mark: a circle for a disc, a rounded rectangle for a standard or a crowd; g grows it (the pulse) */
function ringPath(c, r, g = 0) { const mw = r.mw || 16; const mh = r.mh || mw; const w = mw + 5 + 2 * g; const h = mh + 5 + 2 * g; rr(c, r.gx - w / 2, r.gy - h / 2, w, h, Math.min(h / 2, 8 + g)); }

export function drawBeneath(c, fx, colors) {
  if (!fx) return;
  c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
  for (const r of fx.rings) {
    const col = colorOf(colors, r.tone); const a = Math.max(0, Math.min(1, r.alpha)) * r.strength * (r.dashed ? 0.6 : 1); if (r.gx == null && r.rect.gx == null) continue;
    const rc = { gx: r.rect.gx, gy: r.rect.gy, mw: r.rect.mw, mh: r.rect.mh };
    c.globalAlpha = 0.55 * a; c.strokeStyle = '#ffffff'; c.lineWidth = 3.4; ringPath(c, rc); c.stroke();
    c.globalAlpha = 0.95 * a; c.strokeStyle = col; c.lineWidth = 1.6; ringPath(c, rc); c.stroke();
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
    if (!r.pulse || r.rect.gx == null) continue; const col = colorOf(colors, r.tone); const g = r.pulse.grow; c.globalAlpha = 0.5 * r.pulse.alpha * r.alpha; c.strokeStyle = col; c.lineWidth = 1.4;
    ringPath(c, { gx: r.rect.gx, gy: r.rect.gy, mw: r.rect.mw, mh: r.rect.mh }, g); c.stroke();
  }
  for (const l of fx.leaders) {
    const col = colorOf(colors, l.tone); const pts = l.pts; if (!pts || pts.length < 2) continue;
    let total = 0; for (let i = 1; i < pts.length; i++) total += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); let left = total * Math.max(0, Math.min(1, l.p));      // the leader draws itself from the card to the mark
    const trace = () => { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); let rest = left; for (let i = 1; i < pts.length && rest > 0; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); const k = Math.min(1, rest / (d || 1)); c.lineTo(pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * k, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * k); rest -= d; } };
    c.globalAlpha = Math.max(0, Math.min(1, l.alpha)) * 0.6; trace(); c.strokeStyle = '#ffffff'; c.lineWidth = 2.8; c.stroke();
    c.globalAlpha = Math.max(0, Math.min(1, l.alpha)); trace(); c.strokeStyle = col; c.lineWidth = 1; c.stroke();
  }
  c.restore();
}

/** the first prototype drew a ring above the chips; the ring beneath the marks replaces it (a mark is never drawn over) */
export function drawAbove() { /* intentionally empty */ }
