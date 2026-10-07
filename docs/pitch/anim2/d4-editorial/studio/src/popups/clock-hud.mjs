// popups/clock-hud.mjs - P-10, the CLOCK BADGE: the date, the time and the speed.  The product's badge prints the TAB's date (so between midnight and dawn it names the wrong day), a speed
// label, a dot, a progress ring, and a false "0 fps" at every Play (02-popups.md P-10, F-20).  This one prints only what the clock module says: "July 1 / about 10:15 AM" with its stated
// uncertainty and a Modelled chip (the anchors are candidates), the speed, whether the battle plays, and a ring for how far through the day's ticks the clock is (Computed).  No fps text.
// A persistent popup: it lives in a corner of the map and steps aside (returning after a calm delay) when a tile would be under it; the toolbar shows the same time, so nothing is lost.
import { clockLine } from './kit.mjs';

const SLOT_ALT = { tl: 'tr', tr: 'tl', bl: 'br', br: 'bl' };
export const clockHud = {
  id: 'clock-hud', label: 'Clock badge', group: 'popup-clock', enabled: (tok) => tok('popup.clock.enabled'),
  doc: 'The date, time, speed and day-progress badge (P-10), from the clock module only; steps aside for tiles.',
  update(frame, api) {
    const tok = api.tok; const tau = api.time.tau; const clk = clockLine(api.clock, tau); const day = api.clock.dayOf(tau); const [a, b] = api.data.clock.tabDays[day - 1]; const frac = Math.max(0, Math.min(1, (tau - a) / (b - a + 1)));
    const sp = api.time.speed; const state = api.time.playing ? `Playing at ${sp}×` : api.time.seeking ? 'Moving' : 'Paused';
    const lines = [clk.date, clk.short, `${tok('popup.clock.sigma') ? `±${clk.sigma} min · ` : ''}${state}`];
    const ring = { t: 'ring', frac: tok('popup.clock.ring') ? frac : 0, size: 40, text: `Day ${day}, ${Math.round(frac * 100)} percent of its ticks`, lines };
    const label = `Clock: ${clk.long}, plus or minus ${clk.sigma} minutes, candidate clock. ${state}. Day ${day}, ${Math.round(frac * 100)} percent through.`;
    const slot = tok('popup.clock.slot');
    return [{
      key: 'badge', kind: 'hud', hideOnPhone: true, tier: 'S', tone: 'day', priority: 10, slots: [slot, SLOT_ALT[slot]], version: `${lines.join('|')}|${Math.round(frac * 100)}`,
      forms: [{ id: 'full', level: 'full', w: 214, content: { label, blocks: [ring, { t: 'chips', items: [clk.chip] }] } }, { id: 'mini', level: 'compact', w: 196, content: { label, blocks: [{ t: 'ring', frac, size: 30, text: label, lines: [clk.short, state] }] } }],
    }];
  },
};
