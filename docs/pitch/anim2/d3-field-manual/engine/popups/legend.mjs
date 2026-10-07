// popups/legend.mjs - P-12, the LEGEND.  The product's legend describes a renderer that no longer exists: its swatches match the colour the tiles are drawn in for 3 of 11 dispositions, and its
// "Size" tab says "dot radius scales with strength" about bars that are capped at 120 px (02-popups.md F-13).  This legend cannot drift: its rows are the ACTIVE SKIN's own legend() (every
// skin states what each mark claims, with the site's evidence label), read live, so switching skin changes the legend with it.
// d3 fork: the Precision Field Manual has 25 things to say (the real marks at true size, one row each), too many for a card on free ground, so the legend is a pill in a corner of the map that
// steps aside for a tile (as before) and OPENS IN THE READING RAIL, the surface the director keeps for long reading (the map makes room and no mark is covered).
import { ev } from './kit.mjs';

const SLOT_ALT = { tl: 'bl', bl: 'tl', tr: 'br', br: 'tr' };
export const legend = {
  id: 'legend', label: 'Legend', group: 'popup-legend', enabled: (tok) => tok('popup.legend.enabled'),
  preview(api) { api.host.act('legend:legend', 'toggle'); },
  doc: 'The legend (P-12), generated from the active skin\u2019s legend(); a pill in a corner of the map, the whole table in the reading rail.',
  toolbar: [],
  update(frame, api) {
    const tok = api.tok; const skinId = tok('skin.id'); const skin = api.engine.kernel.skins.has(skinId) ? api.engine.kernel.skins.get(skinId) : null; const rows = skin && skin.legend ? skin.legend() : [];
    const slot = tok('popup.legend.slot'); const slots = [slot, SLOT_ALT[slot]];
    const pill = { id: 'pill', level: 'compact', w: 104, h: 42, content: { label: 'Legend. Activate to read it in the panel.', blocks: [{ t: 'pill', id: 'toggle', label: 'Legend', icon: 'list', expanded: false }] } };
    const blocks = [
      { t: 'p', size: 'sm', muted: true, text: `Every ${skin ? skin.label : 'tile'} mark is one object. The swatches are the real marks at true size; the words name what a part says, and the label beside it says how well that is known.` },
      rows.length ? { t: 'swatches', rows: rows.map((r) => ({ swatch: r.swatch, text: r.text, ev: r.evidence })) } : { t: 'p', size: 'sm', muted: true, text: 'The active skin does not publish a legend.' },
      { t: 'chips', items: [ev('Computed', 'from the skin\u2019s own legend()', 'The rows are read from the active skin each time, so they cannot describe a renderer that is not drawing.')] },
    ];
    const docv = { key: 'legend', tone: 'info', kicker: 'Legend', title: `${skin ? skin.label : 'Tiles'}: what each mark says`, content: { blocks }, version: `${skinId}|${rows.length}` };
    return [{ key: 'legend', kind: 'hud', tier: 'S', tone: 'info', priority: 5, slots, version: `${skinId}|${rows.length}`, forms: [pill], doc: docv, actions: { toggle: (a, card) => { a.host.openRail(card.id); } } }];
  },
};
