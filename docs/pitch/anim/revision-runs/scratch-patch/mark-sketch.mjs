// skins/mark-sketch.mjs - REVISION EXPERIMENT (scratch copy only, not part of the committed prototype): a SKETCH of "semantic zoom": every unit a small side-colour mark (no text on the mark),
// to measure what small marks do to the layout (how many units still need a counted tile) and to the motion.  It is not one of the three pitches and not a design.
const COL = { union: '#6fb7ff', confederate: '#ff8147', unknown: '#aab2ba', mixed: '#c9ced4' };
export const markSketch = (size) => ({
  id: 'mark-sketch' + (size === 12 ? '' : String(size)), label: 'Mark sketch ' + size + ' px (experiment)', version: '0',
  footprint: { chipH: size, chipPadX: 0.5, glyphW: size - 2, glyphGap: 0.5, chipMinW: size, ring: 1, badgeGap: 0.5, noText: 1 },
  draw: {
    tile(c, t) {
      const w = t.w; const h = t.h; c.fillStyle = 'rgba(8,12,16,0.92)'; c.fillRect(-w / 2, -h / 2, w, h); c.fillStyle = COL[t.side] || COL.unknown; c.fillRect(-w / 2 + 1, -h / 2 + 1, w - 2, h - 2);
      c.strokeStyle = 'rgba(8,12,16,0.9)'; c.lineWidth = 1.4; c.beginPath();
      if (t.kind === 'agg') { c.fillStyle = 'rgba(8,12,16,0.9)'; c.font = '700 9px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(t.n), 0, 0.5); return; }
      if (t.arm === 'cavalry') { c.moveTo(-w / 2 + 3, h / 2 - 3); c.lineTo(w / 2 - 3, -h / 2 + 3); c.stroke(); }
      else if (t.arm === 'artillery') { c.fillStyle = 'rgba(8,12,16,0.9)'; c.beginPath(); c.arc(0, 0, 1.8, 0, 6.3); c.fill(); }
      else { c.moveTo(-w / 2 + 3, -h / 2 + 3); c.lineTo(w / 2 - 3, h / 2 - 3); c.moveTo(w / 2 - 3, -h / 2 + 3); c.lineTo(-w / 2 + 3, h / 2 - 3); c.stroke(); }
    },
    pin(c) { c.fillStyle = '#ffffff'; c.beginPath(); c.arc(0, 0, 1.4, 0, 6.3); c.fill(); },
    leader(c, t, env, a, b) { c.strokeStyle = 'rgba(220,226,232,0.55)'; c.lineWidth = 1; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); },
  },
});
