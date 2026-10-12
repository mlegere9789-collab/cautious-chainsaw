// popups/legend.mjs - P-12, the LEGEND.  The product's legend describes a renderer that no longer exists: its swatches match the colour the tiles are drawn in for 3 of 11 dispositions, and its
// "Size" tab says "dot radius scales with strength" about bars that are capped at 120 px (02-popups.md F-13).  This legend cannot drift: its rows are the ACTIVE SKIN's own legend() (every
// skin states what each mark claims, with the site's evidence label), read live, so switching skin changes the legend with it.
// FORK (d1 Quiet Cartographer), an improvement: the open legend is 19 rows, far too tall to find free ground on a crowded map (the floating card form fell back to the pill, so opening it
// did nothing), so it now opens where long reading opens, in the RAIL (the map makes room, nothing is covered; a bottom sheet on a phone).  The pill stays a small hud card on free ground.
import { ev } from './kit.mjs';

const SLOT_ALT = { tl: 'bl', bl: 'tl', tr: 'br', br: 'tr' };
export const legend = {
  id: 'legend', label: 'Legend', group: 'popup-legend', enabled: (tok) => tok('popup.legend.enabled'),
  preview(api) { api.host.toggleDoc('legend:doc'); },
  doc: 'The legend (P-12), generated from the active skin’s legend(): a pill on free ground; it opens in the reading rail, so it can never cover a tile.',
  toolbar: [],
  update(frame, api) {
    const tok = api.tok; const skinId = tok('skin.id'); const skin = api.engine.kernel.skins.has(skinId) ? api.engine.kernel.skins.get(skinId) : null; const rows = skin && skin.legend ? skin.legend() : [];
    const slot = tok('popup.legend.slot'); const slots = [slot, SLOT_ALT[slot]]; const open = !!(api.host.rail && api.host.rail.id === 'legend:doc');
    const pill = { id: 'pill', level: 'compact', w: 104, h: 42, content: { label: 'Legend. Activate to open.', blocks: [{ t: 'pill', id: 'toggle', label: 'Legend', icon: 'list', expanded: open }] } };
    const blocks = [
      { t: 'p', size: 'sm', muted: true, text: `What each mark of the ${skin ? skin.label : 'tiles'} claims, and how well that is known. The rows are drawn by the skin itself.` },
      ...(skin && skin.figure ? [{ t: 'canvas', w: 316, h: skin.figureH, label: 'The anatomy of the marks, drawn at their true size: a unit, a formation, a crowd, a carried-forward unit', paint: (g, w, h) => { g.clearRect(0, 0, w, h); skin.figure(g, w); } }] : []),
      rows.length ? { t: 'swatches', rows: rows.map((r) => ({ swatch: r.swatch, text: r.text, ev: r.evidence })) } : { t: 'p', size: 'sm', muted: true, text: 'The active skin does not publish a legend.' },
      { t: 'chips', items: [ev('Computed', 'rows read from the skin’s own drawing', 'The rows are read from the active skin each time, so they cannot describe a renderer that is not drawing.'), ev('Measured', 'ground: a 2022 aerial, not 1863', 'USDA NAIP photographed 24 April to 10 May 2022, lit by USGS 3DEP elevation: the modern ground.')] },
    ];
    return [
      { key: 'legend', kind: 'hud', tier: 'S', tone: 'info', priority: 5, slots, version: `${open}|${skinId}`, forms: [pill], actions: { toggle: (a) => { a.host.toggleDoc('legend:doc'); } } },
      { key: 'doc', kind: 'doc', tier: 'S', tone: 'info', forms: [], version: `${skinId}|${rows.length}`, doc: { key: 'doc', tone: 'info', kicker: 'Legend', title: 'What the marks say', version: `${skinId}|${rows.length}`, content: { blocks } } },
    ];
  },
};
