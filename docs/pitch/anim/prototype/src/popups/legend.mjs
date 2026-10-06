// popups/legend.mjs - P-12, the LEGEND.  The product's legend describes a renderer that no longer exists: its swatches match the colour the tiles are drawn in for 3 of 11 dispositions, and its
// "Size" tab says "dot radius scales with strength" about bars that are capped at 120 px (02-popups.md F-13).  This legend cannot drift: its rows are the ACTIVE SKIN's own legend() (every
// skin states what each mark claims, with the site's evidence label), read live, so switching skin changes the legend with it.  Closed it is a small pill; open it is a card in a corner of
// the map that steps aside for a tile.  If a skin has no legend() the card says so instead of inventing one.
import { ev } from './kit.mjs';

const SLOT_ALT = { tl: 'bl', bl: 'tl', tr: 'br', br: 'tr' };
export const legend = {
  id: 'legend', label: 'Legend', group: 'popup-legend', enabled: (tok) => tok('popup.legend.enabled'),
  preview(api) { const M = api.host.state.mod; (M.legend || (M.legend = {})).open = true; },
  doc: 'The legend (P-12), generated from the active skin’s legend(); a pill when closed, a card when open; steps aside for tiles.',
  toolbar: [],
  update(frame, api) {
    const tok = api.tok; const M = api.host.state.mod; const st = M.legend || (M.legend = { open: tok('popup.legend.open') });
    const skinId = tok('skin.id'); const skin = api.engine.kernel.skins.has(skinId) ? api.engine.kernel.skins.get(skinId) : null; const rows = skin && skin.legend ? skin.legend() : [];
    const slot = tok('popup.legend.slot'); const slots = [slot, SLOT_ALT[slot]];
    const pill = { id: 'pill', level: 'compact', w: 104, h: 42, content: { label: 'Legend (closed). Activate to open.', blocks: [{ t: 'pill', id: 'toggle', label: 'Legend', icon: 'list', expanded: false }] } };
    const open = { id: 'open', level: 'full', w: 290, content: { label: `Legend of the ${skin ? skin.label : 'tiles'}`, blocks: [{ t: 'pill', id: 'toggle', label: 'Legend', icon: 'list', expanded: true }, rows.length ? { t: 'swatches', rows: rows.map((r) => ({ swatch: r.swatch, text: r.text, ev: r.evidence })) } : { t: 'p', size: 'sm', muted: true, text: 'The active skin does not publish a legend.' }, { t: 'chips', items: [ev('Computed', 'from the skin’s own legend()', 'The rows are read from the active skin each time, so they cannot describe a renderer that is not drawing.')] }] } };
    return [{ key: 'legend', kind: 'hud', tier: 'S', tone: 'info', priority: 5, slots, version: `${st.open}|${skinId}|${rows.length}`, forms: st.open ? [open, pill] : [pill], actions: { toggle: () => { st.open = !st.open; } } }];
  },
};
