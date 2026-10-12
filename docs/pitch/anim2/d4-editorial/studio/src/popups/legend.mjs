// popups/legend.mjs - P-12, the LEGEND.  The product's legend describes a renderer that no longer exists (02-popups.md F-13).  This legend cannot drift: its rows are the ACTIVE SKIN's own
// legend() (every skin states what each mark claims, with the site's evidence label), read live, so switching skin changes the legend with it.
// D4 FORK: the legend of the Dispatch language has about twenty rows, too many for a corner card that must stay clear of every mark.  Closed it is a small pill (it steps aside for a mark); a click
// opens it in the READING RAIL, grouped by what each mark says (side, arm, echelon, age, strength, crowd, selection), where the map makes room for it and the ground stays still.  Nothing is dropped.
import { ev } from './kit.mjs';

const SLOT_ALT = { tl: 'bl', bl: 'tl', tr: 'br', br: 'tr' };
const GROUPS = ['side', 'arm', 'echelon', 'fix', 'strength', 'idOnly', 'aggregate', 'selection', 'pin'];
export const legend = {
  id: 'legend', label: 'Legend', group: 'popup-legend', enabled: (tok) => tok('popup.legend.enabled'),
  preview(api) { api.host.openRail('legend'); },
  doc: 'The legend (P-12), generated from the active skin’s legend(); a pill on the map, the whole key in the reading rail, grouped by what each mark says.',
  toolbar: [{ id: 'open', phone: false, label: 'Legend', title: 'How to read the marks', run: (api) => api.host.toggleDoc('legend:legend'), pressed: (host) => !!(host.rail && host.rail.id === 'legend:legend') }],       // D4 round 1: a busy scene can leave no room for the pill on the map; the legend is always one click away in the masthead
  update(frame, api) {
    const tok = api.tok; const skinId = tok('skin.id'); const skin = api.engine.kernel.skins.has(skinId) ? api.engine.kernel.skins.get(skinId) : null; const rows = skin && skin.legend ? skin.legend() : [];
    const slot = tok('popup.legend.slot'); const slots = [slot, SLOT_ALT[slot]];
    const pill = { id: 'pill', level: 'compact', w: 112, h: 42, content: { label: 'Legend. Activate to read how the marks are drawn.', blocks: [{ t: 'pill', id: 'toggle', label: 'Legend', icon: 'list', expanded: false }] } };
    const by = new Map(); for (const r of rows) { if (!by.has(r.channel)) by.set(r.channel, { title: r.title || r.channel, rows: [] }); by.get(r.channel).rows.push(r); }
    const blocks = [{ t: 'p', size: 'sm', muted: true, text: 'One mark per unit. Hover a mark for its formation, select it for its card.' }];
    if (skin && skin.anatomy) {                                                                                                  // a labelled specimen, drawn by the skin's own code: the pieces of one mark, numbered
      const an = skin.anatomy; blocks.push({ t: 'title', text: 'Anatomy of a mark', level: 3 }, { t: 'canvas', w: an.w, h: an.h, label: 'A unit mark, a crowd, a brigade standard and a faded mark, with their parts numbered 1 to 9', paint: (g, w, h) => an.paint(g, w, h) },
        { t: 'kv', rows: an.notes.map((n) => [n[0], n[1], n[2] ? ev(n[2]) : null]) });
    }
    for (const ch of GROUPS) { const g = by.get(ch); if (!g) continue; blocks.push({ t: 'title', text: g.title, level: 3 }, { t: 'swatches', rows: g.rows.map((r) => ({ swatch: r.swatch, text: r.text, ev: r.evidence })) }); }
    if (!rows.length) blocks.push({ t: 'p', size: 'sm', muted: true, text: 'The active skin does not publish a legend.' });
    blocks.push({ t: 'chips', items: [ev('Computed', 'read from the skin’s own legend()', 'The rows are read from the active skin each time, so they cannot describe a renderer that is not drawing.')] });
    const doc = { key: 'legend', tone: 'info', kicker: 'Legend', title: 'How to read the marks', content: { blocks }, version: `${skinId}|${rows.length}` };
    return [{ key: 'legend', kind: 'hud', tier: 'S', tone: 'info', priority: 5, slots, version: `${skinId}|${rows.length}`, forms: [pill], doc, actions: { toggle: (a, card) => { a.host.toggleDoc(card.id); } } }];
  },
};
