// skins/ribbon.mjs - the verifier's test skin, written against the skin kit only.
import { defineSkin } from './kit.mjs';
import { FONTS } from './semantics.mjs';
import { armGlyph, rr } from './glyphs.mjs';

const TOKENS = [
  ['color.union', '#1f5fbf', 'Union stripe'], ['color.confederate', '#c2412a', 'Confederate stripe'],
  ['color.unknown', '#b07f00', 'Contested side: amber, never a side colour'],
  ['color.mixed', '#5d6570', 'Aggregate of several sides: neutral grey'],
  ['color.paper', '#f6f3ea', 'Plate fill'], ['color.ink', '#15181c', 'Text ink'], ['color.accent', '#f59e0b', 'Selection ring'],
  ['motion.selectMs', 120, 'Selection ease', { min: 0, max: 600, unit: 'ms' }],
  ['motion.hoverMs', 80, 'Hover ease', { min: 0, max: 600, unit: 'ms' }],
];

export const RIBBON = defineSkin({
  id: 'ribbon', label: 'Ribbon (verifier test skin)', version: '0.1', tokens: TOKENS, fonts: FONTS,
  footprint: { chipH: 20, chipPadX: 3, glyphW: 18, glyphGap: 3 },
  channels: { side: true, arm: ['infantry', 'cavalry', 'artillery'], strength: [1], aggregate: true, selection: true },
  draw: {
    tile(c, t, g) {
      const b = g.body; const vm = g.vm; const side = g.P['color.' + vm.side]; const ink = g.P['color.ink'];
      c.globalAlpha *= 0.5 + 0.5 * g.enter;
      rr(c, b.x, b.y, b.w, b.h, 3); c.fillStyle = g.P['color.paper']; c.fill();
      c.fillStyle = side; c.fillRect(b.x, b.y, 6, b.h);
      if (vm.arm !== 'formation') armGlyph(c, vm.arm, b.x + 12, -1, 4.5, { ink, lw: 1.4 });
      c.font = FONTS.code; c.textBaseline = 'middle'; c.fillStyle = ink;
      g.text(c, vm.code + (vm.count ? ' ' + vm.count : ''), b.x + 24, -1, b.w - 24, 'left');
      c.fillStyle = 'rgba(0,0,0,0.18)'; c.fillRect(b.x + 6, b.y + b.h - 3, b.w - 6, 3);
      c.fillStyle = side; c.fillRect(b.x + 6, b.y + b.h - 3, (b.w - 6) * vm.ratio, 3);
      if (g.sel > 0.003) {
        rr(c, -g.hw + 1, -g.hh + 1, g.w - 2, g.h - 2, 4);
        c.strokeStyle = g.col('color.accent', g.sel); c.lineWidth = 2; c.stroke();
      }
    },
  },
  sample(c, ch, v, g, w, h) {
    const P = g.P;
    if (ch === 'side') { rr(c, -8, -5, 16, 10, 2); c.fillStyle = P['color.paper']; c.fill(); c.fillStyle = P['color.' + v]; c.fillRect(-8, -5, 5, 10); }
    else if (ch === 'arm') armGlyph(c, v, 0, 0, 4.5, { ink: P['color.ink'], lw: 1.4 });
    else if (ch === 'strength') { c.fillStyle = 'rgba(0,0,0,.2)'; c.fillRect(-7, -1.5, 14, 3); c.fillStyle = P['color.union']; c.fillRect(-7, -1.5, 14 * v, 3); }
    else if (ch === 'aggregate') { rr(c, -6, -3.5, 12, 7, 3.5); c.fillStyle = P['color.mixed']; c.fill(); c.fillStyle = '#fff'; c.font = '700 6.5px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('x4', 0, 0.3); }
    else if (ch === 'selection') { rr(c, -8, -5, 16, 10, 3); c.strokeStyle = P['color.accent']; c.lineWidth = 2; c.stroke(); }
    else return false;
  },
});
