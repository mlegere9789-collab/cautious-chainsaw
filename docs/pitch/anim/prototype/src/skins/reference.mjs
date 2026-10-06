// skins/reference.mjs - the REFERENCE skin: not a design pitch.  It exists so the engine has something honest to draw while the three pitched skins are designed, and so every
// channel the data supports is exercised once (side, arm, identity, count, strength state, age of the last fix, selection, true position).  A real skin replaces all of it.
//
// What each mark claims (the skin's legend() repeats this on screen):
//   fill colour        side: blue = Union, grey = Confederate, amber stripes = UNKNOWN / Contested (10 ids whose state code contradicts the prefix), blue|grey halves = both sides present
//   glyph              arm: crossed box = infantry, slashed box = cavalry, dot = artillery, three dots = mixed
//   code + "xN" pill   identity from the order-of-battle id; the pill is a COUNT OF PLACEMENT RECORDS an aggregate stands for (never of men)
//   bar under the chip strength state: the unit's current keyframe strength over its reference strength (Modelled: a placement strength is not a casualty record)
//   outline            age of the unit's latest keyframe (skin.ageChannel): solid = within 12 ticks, faint = within 225, dashed = older.  Carried-forward tiles are not fresh reports
//   pin, leader        a displaced chip: the pin sits on the true (Modelled) position, the line joins them
import { FONT_SPECS } from '../layout/text.mjs';

const COL = {
  union: '#1f5aa6', confederate: '#6c7078', unknownA: '#8a5a00', unknownB: '#a26a06', accent: '#f2b700', white: '#ffffff',
  trackDark: 'rgba(0,0,0,0.34)', labelPlate: 'rgba(250,247,240,0.90)', labelInk: '#24262a', labelEdge: 'rgba(0,0,0,0.20)',
};
const sideColor = (side) => (side === 'union' ? COL.union : side === 'confederate' ? COL.confederate : COL.unknownA);

function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.arcTo(x + w, y, x + w, y + r, r); c.lineTo(x + w, y + h - r); c.arcTo(x + w, y + h, x + w - r, y + h, r); c.lineTo(x + r, y + h); c.arcTo(x, y + h, x, y + h - r, r); c.lineTo(x, y + r); c.arcTo(x, y, x + r, y, r); c.closePath(); }

function armGlyph(c, arm, x, y, w, h) {              // box (x, y, w, h), white strokes
  c.strokeStyle = COL.white; c.fillStyle = COL.white; c.lineWidth = 1.4; c.lineCap = 'round';
  if (arm === 'infantry') { c.strokeRect(x + 0.7, y + 0.7, w - 1.4, h - 1.4); c.beginPath(); c.moveTo(x + 0.7, y + 0.7); c.lineTo(x + w - 0.7, y + h - 0.7); c.moveTo(x + w - 0.7, y + 0.7); c.lineTo(x + 0.7, y + h - 0.7); c.stroke(); }
  else if (arm === 'cavalry') { c.strokeRect(x + 0.7, y + 0.7, w - 1.4, h - 1.4); c.beginPath(); c.moveTo(x + 0.7, y + h - 0.7); c.lineTo(x + w - 0.7, y + 0.7); c.stroke(); }
  else if (arm === 'artillery') { c.beginPath(); c.arc(x + w / 2, y + h / 2, Math.min(w, h) / 2 - 0.9, 0, Math.PI * 2); c.fill(); }
  else { for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(x + 2 + i * ((w - 4) / 2), y + h / 2, 1.5, 0, Math.PI * 2); c.fill(); } }
}

function fillBody(c, t, x, y, w, h) {
  rr(c, x, y, w, h, 3);
  if (t.side === 'mixed') { c.fillStyle = COL.confederate; c.fill(); c.save(); c.clip(); c.fillStyle = COL.union; c.fillRect(x, y, w / 2, h); c.restore(); }
  else if (t.side === 'unknown') {
    c.fillStyle = COL.unknownA; c.fill(); c.save(); c.clip(); c.strokeStyle = COL.unknownB; c.lineWidth = 3; c.beginPath();
    for (let k = -h; k < w + h; k += 7) { c.moveTo(x + k, y + h); c.lineTo(x + k + h, y); } c.stroke(); c.restore();
  } else { c.fillStyle = sideColor(t.side); c.fill(); }
}

export const referenceSkin = {
  id: 'reference', label: 'Reference (engine test skin)', version: '1.0',
  footprint: { },                                             // the default 20 px chip
  fonts: FONT_SPECS,
  draw: {
    tile(c, t, env) {
      const s = env.spec; const ring = s.ring; const w = t.w; const h = t.h; const bar = 3;
      const bx = -w / 2 + ring; const by = -h / 2 + ring; const bw = w - 2 * ring; const bh = h - 2 * ring - bar; const midY = by + bh / 2;
      if (t.selected) { rr(c, -w / 2 + 1, -h / 2 + 1, w - 2, h - 2, 5); c.strokeStyle = COL.accent; c.lineWidth = 2; c.stroke(); }
      fillBody(c, t, bx, by, bw, bh);
      // outline: age of the last fix (the stale-tile channel)
      const old = env.tok('skin.ageChannel') ? t.ageMax : 0;
      rr(c, bx + 0.5, by + 0.5, bw - 1, bh - 1, 2.5); c.lineWidth = 1;
      c.strokeStyle = old <= 12 ? 'rgba(255,255,255,0.92)' : old <= 225 ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.8)';
      if (old > 225 && c.setLineDash) c.setLineDash([2, 2]);
      c.stroke(); if (c.setLineDash) c.setLineDash([]);
      // glyph, code, pill
      let x = bx + s.chipPadX; armGlyph(c, t.arm, x, midY - 4.5, s.glyphW, 9); x += s.glyphW + s.glyphGap;
      c.fillStyle = COL.white; c.font = FONT_SPECS.code; c.textBaseline = 'middle'; c.textAlign = 'left'; c.fillText(t.short, x, midY + 0.5);
      if (t.badge) {
        const cw = c.measureText(t.short).width; const px = x + cw + s.badgeGap; c.font = FONT_SPECS.badge; const bwid = c.measureText(t.badge).width + 6;
        rr(c, px, midY - 5.5, bwid, 11, 5.5); c.fillStyle = 'rgba(255,255,255,0.26)'; c.fill(); c.fillStyle = COL.white; c.fillText(t.badge, px + 3, midY + 0.5);
      }
      // strength state bar
      const bty = by + bh; c.fillStyle = COL.trackDark; c.fillRect(bx, bty, bw, bar); c.fillStyle = 'rgba(255,255,255,0.92)'; c.fillRect(bx, bty, Math.max(0, Math.min(1, t.ratio)) * bw, bar);
    },
    label(c, t, env) {
      const lw = t.label.x1 - t.label.x0; const lh = t.label.y1 - t.label.y0;
      rr(c, 0.5, 0.5, lw - 1, lh - 1, 3); c.fillStyle = COL.labelPlate; c.fill(); c.strokeStyle = COL.labelEdge; c.lineWidth = 1; c.stroke();
      c.fillStyle = COL.labelInk; c.font = FONT_SPECS.label; c.textBaseline = 'middle'; c.textAlign = 'left'; c.fillText(t.label.text, env.spec.labelPadX, lh / 2 + 0.5);
    },
    pin(c, t) { c.beginPath(); c.arc(0, 0, 1.5, 0, Math.PI * 2); c.fillStyle = t.side === 'union' ? COL.union : t.side === 'confederate' ? COL.confederate : COL.unknownA; c.fill(); c.strokeStyle = COL.white; c.lineWidth = 1; c.stroke(); },
    leader(c, t, env, a, b) { c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.strokeStyle = t.side === 'union' ? 'rgba(31,90,166,0.75)' : t.side === 'confederate' ? 'rgba(108,112,120,0.85)' : 'rgba(138,90,0,0.85)'; c.lineWidth = 1; c.stroke(); },
    hull(c, t, env, pts) { c.fillStyle = sideColor(t.side === 'mixed' ? 'confederate' : t.side); c.strokeStyle = 'rgba(255,255,255,0.85)'; c.lineWidth = 0.8; for (const p of pts) { c.beginPath(); c.arc(p[0], p[1], 1.6, 0, Math.PI * 2); c.fill(); c.stroke(); } },
  },
  legend() {
    return [
      { swatch: COL.union, text: 'Union (id prefix U-, order of battle)', evidence: 'Documented' },
      { swatch: COL.confederate, text: 'Confederate (id prefix C-, order of battle)', evidence: 'Documented' },
      { swatch: COL.unknownA, text: 'Side UNKNOWN: id prefix and state code disagree (10 ids)', evidence: 'Contested' },
      { swatch: 'linear-gradient(90deg,' + COL.union + ' 50%,' + COL.confederate + ' 50%)', text: 'Aggregate of both sides (Contact)', evidence: 'Computed' },
      { swatch: '#fff', text: 'Bar: current keyframe strength / reference strength (a placement value, not a casualty record)', evidence: 'Modelled' },
      { swatch: '#fff', text: 'xN: how many placement records an aggregate stands for (records, never men)', evidence: 'Computed' },
      { swatch: '#fff', text: 'Outline: solid = last keyframe within 12 ticks, faint = within 225, dashed = older (carried forward)', evidence: 'Computed' },
      { swatch: '#fff', text: 'Pin and line: the true (hand-authored) position of a displaced chip', evidence: 'Modelled' },
    ];
  },
};
