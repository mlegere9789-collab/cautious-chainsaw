// popups/command-crossout.mjs - P-04, the COMMANDER CROSS-OUT, revived.  The product has a card that would draw the old commander's name struck through and the new one taking its place, but
// it reads a store that is never filled, so it never renders (02-popups.md P-04, dead code).  Its purpose, a visible hand-over of command on the map, is kept: when a command change is
// reached, a small tag appears beside the unit's tile, the old commander's name is struck through after a beat and the successor's name stands under it.
// It is decoration (tier D): it appears only when there is free ground next to the tile (it has no chip form: the command-change toast already carries every fact), only up to the compact
// speed, and it never covers a tile.  Both names are the row's own `from_commander` and `to_commander`, verbatim.
import { clockLine, tickIndex, TONES } from './kit.mjs';

const cache = new WeakMap();
const indexOf = (pd) => { let i = cache.get(pd.successions); if (!i) { i = tickIndex(pd.successions); cache.set(pd.successions, i); } return i; };

export function buildCrossout(r, api) {
  const tok = api.tok; const clk = clockLine(api.clock, r.tick);
  const label = `Command passes from ${r.from} to ${r.to}. ${api.unitName(r.unit)}. ${clk.long}.`;
  return {
    key: 'xo-' + r.id, kind: 'card', tier: 'D', tone: r.kind, priority: 5, tick: r.tick, bare: true, subjects: { units: [r.unit] }, hold: { ms: tok('popup.crossout.holdMs') }, version: 1, announce: '',
    forms: [{ id: 'tag', level: 'compact', w: tok('popup.crossout.w'), content: { label, blocks: [{ t: 'kicker', shape: TONES[r.kind].shape, label: 'Command passes', right: api.unitName(r.unit) }, { t: 'swap', old: r.from, next: r.to, atMs: tok('popup.crossout.strikeAtMs') }] } }],
  };
}

export const commandCrossout = {
  id: 'command-crossout', label: 'Commander cross-out', group: 'popup-crossout', enabled: (tok) => tok('popup.crossout.enabled'),
  preview(api) { api.goTo({ tick: 28, lat: 39.8278, lng: -77.2528, zoom: 15 }); },
  doc: 'The revived cross-out (P-04): on the unit’s tile the old commander is struck through and the successor named, on free ground only, at slow playback only.',
  update(frame, api) {
    const idx = indexOf(api.pd); for (const r of api.crossed(idx)) if (r.to && r.to !== r.from) api.fire(buildCrossout(r, api), { via: 'play' });
    for (const r of api.landed(idx, 0.5)) if (r.to && r.to !== r.from) api.fire(buildCrossout(r, api), { via: 'land', landAfter: 0.5 });
    return [];
  },
};
