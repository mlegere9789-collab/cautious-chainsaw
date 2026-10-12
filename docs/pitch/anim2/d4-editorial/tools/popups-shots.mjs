// tools/popups-shots.mjs - every popup of the product in the Dispatch language, in situ on the real ground: day banner, clock, event card, story card (and the story in the reading rail),
// command toasts, cross-out, unit card, hover tooltip, legend (in the rail), narration (a tour step, the welcome card), hint, Chronicle (rail), overview map.
//   node tools/popups-shots.mjs [--set=final|iN] [--dpr=1|2] [--look=paper|aerial]      -> shots/popups-*.png (final, JPEG q90 at 2x) or iterations/iN/popups-*.jpg (1x)
import fs from 'node:fs';
import path from 'node:path';
import { serve, launch, open, settle, ROOT } from './lib.mjs';
const a = process.argv.slice(2); const o = Object.fromEntries(a.filter((x) => x.startsWith('--')).map((x) => { const i = x.indexOf('='); return i < 0 ? [x.slice(2), '1'] : [x.slice(2, i), x.slice(i + 1)]; }));
const SET = o.set || 'final'; const ROUND = /^round-/.test(SET); const DPR = +(o.dpr || (SET === 'final' || ROUND ? 2 : 1)); const LOOK = o.look || 'paper'; const FMT = 'jpg'; const OUT = SET === 'final' ? path.join(ROOT, 'shots') : ROUND ? path.join(ROOT, 'shots', SET) : path.join(ROOT, 'iterations', SET); fs.mkdirSync(OUT, { recursive: true });
const style = LOOK === 'aerial' ? 'dispatch-aerial' : 'dispatch-paper';
const srv = await serve(); const b = await launch({ dpr: DPR }); const done = [];
const snap = async (name, clip) => { const f = path.join(OUT, `popups-${name}-${LOOK}.${FMT}`); await b.page.screenshot(FMT === 'png' ? { path: f, clip } : { path: f, type: 'jpeg', quality: SET === 'final' || ROUND ? 90 : 84, clip }); done.push(name); console.log('wrote', path.relative(ROOT, f)); };
const q = (base, set = {}) => `${base}&style=${style}&set=${encodeURIComponent(JSON.stringify(set))}`;
const play = (ticks) => b.page.evaluate((n) => { const S = window.__studio; S.engine.transport.setSpeed(1); S.engine.transport.play(); }, ticks);
try {
  // 1. event + story + toasts at tick 551 (default state of the Angle)
  await open(b.page, q('scene=fresh2&tick=551&zoom=15.5', {}), { steps: 200 }); await snap('01-event-story-toasts');
  // 2. the story in the reading rail
  const btn = await b.page.$('.pc[data-popup="story-card"] .pc-act.primary'); if (btn) { await btn.click(); await settle(b.page, 140); await snap('02-story-in-the-rail'); }
  // 3. the Chronicle in the rail
  await b.page.evaluate(() => { const S = window.__studio; S.host.toggleDoc('chronicle:list'); }); await settle(b.page, 140); await snap('03-chronicle-in-the-rail');
  await b.page.evaluate(() => window.__studio.host.closeRail()); await settle(b.page, 80);
  // 4. the day banner: the clock crosses the dawn of day two
  await open(b.page, q('scene=fresh2&tick=224.2&zoom=14', {}), { steps: 30 }); await play(); await b.page.evaluate(() => { let T = window.__T; const S = window.__studio; for (let i = 0; i < 150; i++) { T += 16.667; window.__T = T; S.step(1, 16.667); } window.__T = T; }); await snap('04-day-banner-and-clock');
  // 5. the narration card: the first step of the showcase tour; and the welcome card
  await open(b.page, q('scene=field&tick=300&zoom=13.5', { 'popup.hints.enabled': false }), { steps: 60 }); await b.page.evaluate(() => window.__studio.startTour('showcase')); await settle(b.page, 90); await snap('05-narration-tour-step');
  await b.page.evaluate(() => { const S = window.__studio; S.director.stop('closed'); }); await settle(b.page, 40);
  await open(b.page, q('scene=field&tick=300&zoom=13.5', { 'popup.hints.enabled': false }), { steps: 60 }); await b.page.evaluate(() => window.__studio.showWelcome()); await settle(b.page, 90); await snap('06-welcome');
  // 6. the hint
  await open(b.page, q('scene=carry1&tick=295&zoom=15', { 'popup.event.enabled': false, 'popup.story.enabled': false, 'popup.toast.enabled': false }), { steps: 160 }); await snap('07-hint-and-clock');
  // 7. the legend in the rail, the unit card's rail
  await open(b.page, q('scene=fresh2&tick=556&zoom=16.5', { 'popup.event.enabled': false, 'popup.story.enabled': false, 'popup.toast.enabled': false, 'popup.hints.enabled': false }), { steps: 120 });
  await b.page.evaluate(() => window.__studio.host.openRail('legend:legend')); await settle(b.page, 140); await snap('08-legend-in-the-rail');
  await b.page.evaluate(() => window.__studio.host.closeRail()); await settle(b.page, 80);
  const id = await b.page.evaluate(() => { const S = window.__studio; for (const u of S.engine.battle.units.values()) if (u.short === '53 VA') return u.id; });
  await b.page.evaluate((id) => { const S = window.__studio; S.engine.select(id); S.host.setSelected(id); }, id); await settle(b.page, 140); await b.page.evaluate((id) => window.__studio.host.openRail('unit-card:sel-' + id), id); await settle(b.page, 140); await snap('09-unit-card-in-the-rail');
  // 8. the Tune panel and the About tab (the interface's own panels, restyled)
  await b.page.evaluate(() => window.__studio.host.closeRail()); await settle(b.page, 60); await b.page.evaluate(() => window.__studio.ui.togglePanel('about')); await settle(b.page, 60); await snap('10-about-panel');
  await b.page.evaluate(() => { window.__studio.ui.togglePanel('tune'); }); await settle(b.page, 60); await snap('11-tune-panel');
  if (b.errors.length) console.log('errors', b.errors.slice(0, 6));
} finally { await b.close(); srv.close(); }
console.log(done.length, 'popup pictures');
