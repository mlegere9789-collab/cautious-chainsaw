// skins/_template.mjs - COPY THIS to start a skin.  It is a complete, minimal, conforming skin (test/extend.test.mjs runs the conformance check on it), deliberately plain.
//   1. copy to skins/my-skin.mjs, change id / label;  2. add it to skins/index.mjs;  3. node docs/pitch/anim/prototype/build.mjs;  4. open battle-studio.html?tune=1 and pick it in Tune > Skin.
// Contract: skins/contract.mjs.  Draw a box centred on (0,0) of size t.w x t.h and nothing outside it; the layout reserves exactly that box.
export const templateSkin = {
  id: 'template', label: 'Template (plain)', version: '0.1',
  footprint: { },                                              // e.g. { chipH: 24, glyphW: 16 } to make the chip bigger: the layout adapts
  draw: {
    tile(c, t, env) {
      const w = t.w; const h = t.h; const ring = env.spec.ring;
      if (t.selected) { c.strokeStyle = '#f2b700'; c.lineWidth = 2; c.strokeRect(-w / 2 + 1, -h / 2 + 1, w - 2, h - 2); }
      c.fillStyle = t.side === 'union' ? '#1f5aa6' : t.side === 'confederate' ? '#6c7078' : t.side === 'mixed' ? '#444' : '#8a5a00';   // unknown stays visibly different: never a side colour
      c.fillRect(-w / 2 + ring, -h / 2 + ring, w - 2 * ring, h - 2 * ring);
      c.fillStyle = '#fff'; c.font = '700 11px system-ui, sans-serif'; c.textBaseline = 'middle'; c.textAlign = 'left';
      c.fillText(t.short + (t.badge ? ' ' + t.badge : ''), -w / 2 + ring + env.spec.chipPadX, 0);
    },
  },
  legend: () => [{ swatch: '#1f5aa6', text: 'Union', evidence: 'Documented' }, { swatch: '#6c7078', text: 'Confederate', evidence: 'Documented' }, { swatch: '#8a5a00', text: 'Side unknown', evidence: 'Contested' }],
};
