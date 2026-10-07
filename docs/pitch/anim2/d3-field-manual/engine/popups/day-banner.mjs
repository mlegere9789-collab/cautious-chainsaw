// popups/day-banner.mjs - P-39, the DAY BANNER.  The product has none: the only day text is a small badge, whose date is the tab's, so between midnight and dawn it names the wrong day
// (02-popups.md P-10, P-39).  This banner is a title card when the clock enters a new day of the battle (ticks 1, 226 and 451: the site's three day tabs) and when it crosses midnight
// ("Night of July 1-2").  Everything on it comes from the clock module (the candidate clock, labelled Modelled); the only counts are ticks (Computed).  No sentence of history is added.
// Decoration (tier D): free ground at the top of the map or nothing, never over a tile; up to the compact speed.
import { clockLine, tickIndex, ev } from './kit.mjs';

const cache = new WeakMap();
/** the banner moments of a clock: the three day starts and every midnight the clock crosses (found by bisection on the clock's own minutes) */
export function bannerRows(clock, tabDays, tickMax) {
  const rows = []; tabDays.forEach(([a], i) => rows.push({ id: 'day-' + (i + 1), tick: a, kind: 'day', day: i + 1 }));
  const min = (t) => clock.minutesAt(t);
  for (let d = 1; d <= 3; d++) {
    const target = d * 1440; if (min(1) >= target || min(tickMax) < target) continue;
    let lo = 1; let hi = tickMax; while (hi - lo > 0.01) { const mid = (lo + hi) / 2; if (min(mid) < target) lo = mid; else hi = mid; }
    rows.push({ id: 'night-' + d, tick: Math.round(hi), kind: 'night', from: d });
  }
  return rows.sort((a, b) => a.tick - b.tick);
}
const indexOf = (api) => { let i = cache.get(api.clock); if (!i) { i = tickIndex(bannerRows(api.clock, api.data.clock.tabDays, api.data.clock.tickMax)); cache.set(api.clock, i); } return i; };

export function buildBanner(r, api) {
  const tok = api.tok; const clk = clockLine(api.clock, r.tick); const [a, b] = api.data.clock.tabDays[Math.max(0, (r.day || 1) - 1)] || [0, 0];
  const title = r.kind === 'day' ? `${clk.date}, 1863` : `Night of July ${r.from}–${r.from + 1}`; const kicker = r.kind === 'day' ? `Day ${r.day}` : 'After midnight';
  const label = `${kicker}. ${title}. ${clk.long}.`;
  const blocks = [{ t: 'kicker', shape: 'sun', label: kicker, right: clk.short }, { t: 'title', text: title, serif: true, size: 'big' }, ...(r.kind === 'day' ? [{ t: 'p', size: 'sm', muted: true, text: `Ticks ${a} to ${b} of ${api.data.clock.tickMax}` }] : []), { t: 'chips', items: [clk.chip, ...(r.kind === 'day' ? [ev('Computed', 'tick range')] : [])] }];
  return {
    key: 'banner-' + r.id, kind: 'card', tier: 'D', tone: 'day', priority: 35, tick: r.tick, bare: true, slots: ['tc', 'bc', 'tl', 'tr'], hold: { ms: tok('popup.banner.holdMs') }, version: 1, announce: label,
    forms: [{ id: 'ribbon', level: 'compact', w: tok('popup.banner.w'), content: { label, blocks } }, { id: 'chip', level: 'chip', w: 240, content: { blocks: [], kind: kicker, line: title, full: label, label } }], via: 'play',
  };
}

export const dayBanner = {
  id: 'day-banner', label: 'Day banner', group: 'popup-banner', enabled: (tok) => tok('popup.banner.enabled'),
  preview(api) { const s = api.scene('fresh2'); api.goTo({ tick: 226, lat: s.lat, lng: s.lng, zoom: 14 }); },
  doc: 'A title card when the clock enters a new day or crosses midnight (P-39, new): date from the clock module, Modelled; ticks Computed.',
  update(frame, api) {
    const idx = indexOf(api); const tok = api.tok; const want = (r) => r.kind === 'day' || tok('popup.banner.phases');
    for (const r of api.crossed(idx)) if (want(r)) api.fire(buildBanner(r, api), { via: 'play' });
    for (const r of api.landed(idx, 0.5)) if (want(r)) api.fire(buildBanner(r, api), { via: 'land', landAfter: 0.5 });
    return [];
  },
  rows(ctx) { const rows = bannerRows(ctx.clock, ctx.battle.ds.clock.tabDays, ctx.battle.ds.clock.tickMax); return rows.map((r) => { const clk = clockLine(ctx.clock, r.tick); return { id: 'banner-' + r.id, tick: r.tick, kind: 'day', kindLabel: r.kind === 'day' ? `Day ${r.day}` : 'Midnight', tone: 'day', shape: 'sun', title: r.kind === 'day' ? clk.date : 'Midnight', text: r.kind === 'day' ? `Day ${r.day} begins: ${clk.date}, 1863` : `Night of July ${r.from}–${r.from + 1}`, make: null }; }); },
};
