// tools/gallery.mjs - every popup and panel of the Studio in the Quiet Cartographer's language, one picture each (real moments of the real data, DPR 2 unless --dpr): shots/popups/*.jpg (JPEG q90: the aerial under the cards is noise-like and PNG made each picture 5 MB).
//   node tools/gallery.mjs [--only=name] [--out=shots/popups] [--dpr=2]
import fs from 'node:fs';
import path from 'node:path';
import { open, setScene, shot, args, D1, stopServer } from './lib.mjs';

const OPT = args.opt || 'a'; process.env.LOOK_PAGE = OPT === 'a' ? 'option-a-standards.html' : 'option-b-glyph.html'; const ITER = args.iter || 'iter-1'; const OUT = path.resolve(args.out || path.join(D1, 'shots', OPT === 'a' ? 'a-standards' : 'b-glyph', ITER, 'popups')); const DPR = +(args.dpr || 2);
const HERBST = [39.8278, -77.2528]; const ANGLE = [39.8117, -77.2347]; const LRT = [39.7956, -77.2411];
const ONLY = (ids) => `const T = E.tuning; for (const k of ['event', 'story', 'toast', 'crossout', 'banner', 'hints', 'clock', 'unit', 'minimap', 'legend']) T.set('popup.' + k + '.enabled', ids.includes(k));`;
export const SHOTS = [
  { name: '01-event-story-toast-t28', tick: 28, at: HERBST, zoom: 14.5, safe: true, popups: true },
  { name: '02-story-in-the-rail-t28', tick: 28, at: HERBST, zoom: 14.5, safe: true, popups: true, js: `S.host.openRail('story-card:story-V-002'); adv(90);` },
  { name: '03-command-changes-merged-t550', tick: 550, at: ANGLE, zoom: 14.5, safe: true, popups: true },
  { name: '04-unit-card-selected-iron-brigade-t40', tick: 40, at: HERBST, zoom: 15, safe: true, popups: true, tokens: 'quiet', js: `E.select('U-I-1-1'); S.host.setSelected('U-I-1-1'); adv(90);` },
  { name: '05-unit-card-in-the-rail', tick: 40, at: HERBST, zoom: 15, safe: true, popups: true, tokens: 'quiet', js: `E.select('U-I-1-1'); S.host.setSelected('U-I-1-1'); adv(60); S.host.openRail('unit-card:sel-U-I-1-1'); adv(90);` },
  { name: '06-tour-little-round-top', tick: 260, at: LRT, zoom: 14.5, safe: true, popups: true, js: `[...document.querySelectorAll('.pop-tb')].find((b) => b.textContent === 'Auto tour').click(); adv(40); S.host.act('tour:tour', 'goto:4'); adv(200);` },
  { name: '07-day-banner-and-clock-t226', tick: 226, at: ANGLE, zoom: 12.5, safe: true, popups: true },
  { name: '08-chronicle-list-t120', tick: 120, at: ANGLE, zoom: 14, safe: true, popups: true, js: `S.host.key('c'); adv(90);` },
  { name: '09-narration-welcome', tick: 551, at: ANGLE, zoom: 15, safe: true, popups: false, js: `S.showWelcome(); adv(60);` },
  { name: '10-narration-tour-step', tick: 551, at: ANGLE, zoom: 15, safe: true, popups: false, js: `S.startTour('showcase'); adv(240);` },
  { name: '11-tune-panel', tick: 551, at: ANGLE, zoom: 15, safe: true, popups: false, js: `S.ui.togglePanel('tune'); adv(30);` },
  { name: '12-inspect-panel', tick: 551, at: ANGLE, zoom: 16, safe: true, popups: false, js: `E.select('U-71PA'); const t = E.frame.tiles.find((q) => q.ids[0] === 'U-71PA' && q.kind === 'leaf'); S.ui.setSelection(t); adv(60);` },
  { name: '13-about-panel', tick: 551, at: ANGLE, zoom: 15, safe: true, popups: false, js: `S.ui.togglePanel('about'); adv(30);` },
  { name: '14-menu-showcase', tick: 551, at: ANGLE, zoom: 15, safe: true, popups: false, js: `S.ui.toggleMenu(); adv(30);` },
  { name: '15-fast-playback-chips', tick: 540, at: ANGLE, zoom: 14, safe: true, popups: true, js: `E.transport.setSpeed(4); E.transport.play(); adv(240, 16.667); E.transport.pause(); adv(30, 16.667);` },
  { name: '16-phone-lane-t28', vp: [390, 844], mobile: true, tick: 28, at: HERBST, zoom: 14, safe: true, popups: true },
  { name: '17-phone-sheet-event-t28', vp: [390, 844], mobile: true, tick: 28, at: HERBST, zoom: 14, safe: true, popups: true, js: `const ec = [...S.host.state.cards.values()].find((c) => String(c.id).startsWith('event-card:')); S.host.openRail(ec ? ec.id : 'event-card:event-28'); adv(90);` },
  { name: '18-phone-sheet-story-t28', vp: [390, 844], mobile: true, tick: 28, at: HERBST, zoom: 14, safe: true, popups: true, js: `S.host.openRail('story-card:story-V-002'); S.host.setSheet('full'); adv(90);` },
  { name: '21-phone-legend-t28', vp: [390, 844], mobile: true, tick: 28, at: HERBST, zoom: 14, safe: true, popups: true, js: `S.host.toggleDoc('legend:doc'); S.host.setSheet('half'); adv(90);` },
  { name: '22-phone-menu-t28', vp: [390, 844], mobile: true, tick: 28, at: HERBST, zoom: 14, safe: true, popups: true, js: `S.ui.toggleMenu(); adv(30);` },
];
const QUIET = { 'popup.event.enabled': false, 'popup.story.enabled': false, 'popup.toast.enabled': false, 'popup.crossout.enabled': false, 'popup.hints.enabled': false, 'popup.banner.enabled': false };
for (const sc of SHOTS) {
  if (args.only && !args.only.split(',').some((o) => sc.name.startsWith(o))) continue;
  const vp = sc.vp || [1440, 900]; const s = await open({ w: vp[0], h: vp[1], dpr: sc.dpr || DPR, mobile: !!sc.mobile, profile: 'gal' + OPT });
  try {
    await setScene(s.page, { tick: sc.tick, lat: sc.at[0], lng: sc.at[1], zoom: sc.zoom, safe: !!sc.safe, popups: !!sc.popups, style: sc.style || null, tokens: sc.tokens === 'quiet' ? QUIET : null, steps: 120 });
    if (sc.js) await s.page.evaluate(`(async () => { const S = window.__studio; const E = S.engine; const adv = globalThis.__advance; ${sc.js} })()`);
    await s.page.evaluate(() => globalThis.__ground.whenIdle(20000)); await s.page.evaluate(() => globalThis.__advance(20));
    await shot(s.page, path.join(OUT, sc.name + '.jpg'), { type: 'jpeg', quality: 90 }); console.log(sc.name, s.errors.filter((e) => !/404/.test(e)).length ? 'ERRORS ' + s.errors.slice(0, 2).join(' | ') : 'ok');
  } finally { await s.close(); }
}
await stopServer();
void fs; void ONLY;
