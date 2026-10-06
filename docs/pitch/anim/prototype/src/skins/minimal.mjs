// skins/minimal.mjs - THE 50-LINE SKIN: a complete, conforming skin in under 50 lines.  Side = fill colour, arm = glyph, code = text, strength = bar, selection = eased ring.
// The kit supplies everything else: the honest view model (g.vm), the eased selection (g.sel), the arrival progress (g.enter), the legend (from `channels` + sample) and the token table.
import { defineSkin } from './kit.mjs';
import { FONTS } from './semantics.mjs';
import { armGlyph, rr } from './glyphs.mjs';

const TOKENS = [
  ['color.union', '#17489a', 'Union fill'], ['color.confederate', '#c8441f', 'Confederate fill'], ['color.unknown', '#8a5a00', 'Contested side: amber, never a side colour'],
  ['color.mixed', '#4a5058', 'Aggregate of more than one side: neutral grey'], ['color.ink', '#ffffff', 'Text and glyph ink'], ['color.accent', '#f59e0b', 'Selection ring'],
  ['motion.selectMs', 120, 'Ease of the selection ring', { min: 0, max: 600, unit: 'ms' }], ['motion.hoverMs', 80, 'Ease of the hover tint', { min: 0, max: 600, unit: 'ms' }],
];
const fill = (g, side) => g.P['color.' + side];

export const MINIMAL = defineSkin({
  id: 'minimal', label: 'Minimal (the 50-line skin)', version: '1.0', tokens: TOKENS, fonts: FONTS, footprint: { chipH: 20, chipPadX: 5, glyphW: 12, glyphGap: 3 },
  channels: { side: true, arm: ['infantry', 'cavalry', 'artillery'], strength: [1], aggregate: true, selection: true },
  draw: {
    tile(c, t, g) {
      const b = g.body; const vm = g.vm; c.globalAlpha *= 0.5 + 0.5 * g.enter;                                   // arrival: the display layer scales it, this fades it
      rr(c, b.x, b.y, b.w, b.h, 3); c.fillStyle = g.mix('color.' + vm.side, 'color.ink', 0.18 * g.hov); c.fill(); // body in the side colour, a touch lighter on hover
      if (vm.arm !== 'formation') armGlyph(c, vm.arm, b.x + 11, -1, 4.5, { ink: g.P['color.ink'], lw: 1.4 });   // a formation has no arm in the data: no glyph
      c.font = FONTS.code; c.textBaseline = 'middle'; c.fillStyle = g.P['color.ink'];
      g.text(c, vm.code + (vm.count ? ' ' + vm.count : ''), b.x + 20, -1, b.w - 24, 'left');                      // the short code (vital), condensed if a font renders wide
      c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(b.x, b.y + b.h - 3, b.w, 3); c.fillStyle = 'rgba(255,255,255,0.95)'; c.fillRect(b.x, b.y + b.h - 3, b.w * vm.ratio, 3);   // strength (Modelled)
      if (g.sel > 0.003) { rr(c, -g.hw + 1, -g.hh + 1, g.w - 2, g.h - 2, 4); c.strokeStyle = g.col('color.accent', g.sel); c.lineWidth = 2; c.stroke(); }          // the ring eases in
    },
  },
  sample(c, ch, v, g, w, h) {                                                                                   // the legend's swatches: the same colours and glyphs, 18 x 12
    if (ch === 'side') { rr(c, -w / 2 + 1, -h / 2 + 1, w - 2, h - 2, 3); c.fillStyle = fill(g, v); c.fill(); }
    else if (ch === 'arm') armGlyph(c, v, 0, 0, 4.5, { ink: g.P['color.union'], lw: 1.4 });
    else if (ch === 'strength') { c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(-7, -1.5, 14, 3); c.fillStyle = g.P['color.union']; c.fillRect(-7, -1.5, 14 * v, 3); }
    else if (ch === 'aggregate') { rr(c, -6, -3.5, 12, 7, 3.5); c.fillStyle = g.P['color.union']; c.fill(); c.fillStyle = g.P['color.ink']; c.font = '700 6.5px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('×4', 0, 0.3); }
    else if (ch === 'selection') { rr(c, -8, -5, 16, 10, 3); c.strokeStyle = g.P['color.accent']; c.lineWidth = 2; c.stroke(); } else return false;
  },
});
