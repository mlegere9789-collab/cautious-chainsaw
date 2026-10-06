// Behaviour probes of the popups in real Chrome (desktop). Every line printed is a measured fact about R1c.
import fs from 'node:fs';
import { boot, sleep, TREES, OUT, SHOTS } from './h.mjs';
import { install, setTick } from './m.mjs';

const which = process.argv[2] || 'R1c';
const VP = { width: 1440, height: 900, dpr: 1, mobile: false };
const b = await boot(which, { cdpPort: 9533, profile: 'behav', viewport: VP, waitMs: 3000 });
const { page, s } = b;
await install(page, TREES[which].entry);
await page.evaluate(() => window.__store.getState().setTick(675)); await sleep(2500);
await page.evaluate(() => window.__store.getState().setTick(1)); await sleep(300);
s.setTiles('block');
const R = {};
const has = (sel) => page.evaluate((sel) => !!document.querySelector(sel), sel);
const count = (sel) => page.evaluate((sel) => document.querySelectorAll(sel).length, sel);
const st = () => page.evaluate(() => { const g = window.__store.getState(); return { tick: g.currentTick, playing: g.isPlaying, speed: g.playbackSpeed, sel: g.selectedUnitId }; });
const toasts = () => page.evaluate(() => Array.from(document.querySelectorAll('[role="log"][aria-label="Battle events"] > div')).map((d) => d.innerText.replace(/\s+/g, ' ').slice(0, 80)));

// B1: dismiss the story card at tick 28, scrub away and back
await setTick(page, 28); await sleep(400);
R.B1 = { storyShownAt28: await has('[data-gtbg-card="2"]') };
await page.locator('[data-gtbg-card="2"] button[aria-label="Close"]').click(); await sleep(200);
R.B1.afterDismiss = await has('[data-gtbg-card="2"]');
await setTick(page, 100); await sleep(200); await setTick(page, 28); await sleep(300);
R.B1.reappearsAfterScrubAway = await has('[data-gtbg-card="2"]');
await setTick(page, 29); await sleep(200);
R.B1.v003At29 = await has('[data-gtbg-card="2"]');
// B2: dismiss the event card, step +1 then -1
await setTick(page, 28); await sleep(300);
R.B2 = { eventShownAt28: await has('[data-gtbg-card="1"]') };
await page.locator('[data-gtbg-card="1"] button[aria-label="Close"]').click(); await sleep(200);
R.B2.afterDismiss = await has('[data-gtbg-card="1"]');
await setTick(page, 29); await sleep(150); await setTick(page, 28); await sleep(250);
R.B2.reappearsAfterStepAwayAndBack = await has('[data-gtbg-card="1"]');
await setTick(page, 60); await sleep(150); await setTick(page, 28); await sleep(300);
R.B2.reappearsAfterJumpAwayAndBack = await has('[data-gtbg-card="1"]');
// B5/B6: animations and transitions on cards and toasts
const anim = await page.evaluate(() => {
  const q = (sel) => { const e = document.querySelector(sel); if (!e) return null; const cs = getComputedStyle(e); return { animationName: cs.animationName, animationDuration: cs.animationDuration, transition: cs.transitionProperty + ' ' + cs.transitionDuration, opacity: cs.opacity, transform: cs.transform, backdrop: cs.backdropFilter }; };
  return { event: q('[data-gtbg-card="1"]'), story: q('[data-gtbg-card="2"]') };
});
R.B6 = anim;
R.keyframesDefined = await page.evaluate(() => { const names = new Set(); for (const sh of document.styleSheets) { try { for (const r of sh.cssRules) if (r.type === CSSRule.KEYFRAMES_RULE) names.add(r.name); } catch (e) { /* cross-origin */ } } return [...names]; });
// B3: toast flood after a seek, through the real UI (day tab, then Play)
await page.evaluate(() => { const g = window.__store.getState(); g.setPlaying(false); g.setTick(1); }); await sleep(600);
await page.getByRole('button', { name: 'July 3' }).first().click(); await sleep(500);
R.B3 = { afterDayTab: await st() };
await page.getByRole('button', { name: 'Play' }).click();
const seen = []; const t0 = Date.now();
for (let i = 0; i < 24; i++) { await sleep(100); const t = await toasts(); seen.push([Date.now() - t0, t.length]); if (i === 6) R.B3.toastsAt700ms = t; }
R.B3.toastCountSeries = seen; R.B3.state = await st();
await page.getByRole('button', { name: 'Pause' }).click(); await sleep(5200);
// B4: Esc closes the highest card first
await page.evaluate(() => { const g = window.__store.getState(); g.setPlaying(false); g.setTick(553); }); await sleep(500);
const esc = [];
esc.push({ before: await page.evaluate(() => Array.from(document.querySelectorAll('[data-gtbg-card]')).map((e) => e.getAttribute('data-gtbg-card'))) });
for (let i = 0; i < 3; i++) { await page.keyboard.press('Escape'); await sleep(200); esc.push(await page.evaluate(() => Array.from(document.querySelectorAll('[data-gtbg-card]')).map((e) => e.getAttribute('data-gtbg-card')))); }
R.B4 = esc;
// B8: tour: click Next twice quickly; does the first stop's pause timer cut the second stop short?
await setTick(page, 1);
await page.getByRole('button', { name: /NPS Auto Tour/ }).click(); await sleep(400);
const s1 = await st();
await page.getByRole('button', { name: 'Next →' }).click(); // stop 2 begins (~400 ms after stop 1 began; stop-1 pause timer fires at 1500 ms after stop 1)
const tl = [];
for (let i = 0; i < 18; i++) { await sleep(150); tl.push((await st()).playing ? 1 : 0); }
R.B8 = { stop1: s1, playingSeriesEvery150msAfterNext: tl.join(''), expectedPlayingMs: 'stop 2 tickWindow 6 at 2x = 750 ms' };
await page.locator('[data-gtbg-card="3"] button[aria-label="Close"]').click(); await sleep(300);
// a11y probes
R.a11y = await page.evaluate(() => {
  const d = (el) => el ? { role: el.getAttribute('role'), aria: el.getAttribute('aria-label'), live: el.getAttribute('aria-live'), tabindex: el.getAttribute('tabindex') } : null;
  return { logContainer: d(document.querySelector('[role="log"]')), eventCard: d(document.querySelector('[data-gtbg-card="1"]')), storyCard: d(document.querySelector('[data-gtbg-card="2"]')), activeElement: document.activeElement && document.activeElement.tagName };
});
await setTick(page, 553); await sleep(500);
R.a11y2 = await page.evaluate(() => { const d = (el) => el ? { tag: el.tagName, role: el.getAttribute('role'), aria: el.getAttribute('aria-label'), live: el.getAttribute('aria-live'), tabindex: el.getAttribute('tabindex'), focusable: Array.from(el.querySelectorAll('button,[tabindex]')).length } : null; return { event: d(document.querySelector('[data-gtbg-card="1"]')), story: d(document.querySelector('[data-gtbg-card="2"]')), storyBody: d(document.querySelector('[data-gtbg-card="2"] [role="group"]')) }; });
// z-order table of everything floating at tick 553 with a unit selected
await page.evaluate(() => { const g = window.__store.getState(); g.selectUnit('C-I-3-3'); g.pinUnit('C-I-3-3'); }); await sleep(400);
R.stack = await page.evaluate(() => { const out = []; document.querySelectorAll('#root *, body > *').forEach((el) => { const cs = getComputedStyle(el); if (!['fixed', 'absolute'].includes(cs.position)) return; const z = parseInt(cs.zIndex, 10); if (!(z >= 20)) return; const r = el.getBoundingClientRect(); if (r.width < 30 || r.height < 20 || (r.width > innerWidth * 0.95 && r.height > innerHeight * 0.9)) return; out.push({ z, tag: el.tagName, id: el.id || null, card: el.getAttribute('data-gtbg-card'), role: el.getAttribute('role'), aria: el.getAttribute('aria-label'), x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), txt: (el.innerText || '').replace(/\s+/g, ' ').slice(0, 40) }); }); return out.sort((a, b) => b.z - a.z); });
console.log(JSON.stringify(R, null, 1));
fs.writeFileSync(OUT + `/behaviour-${which}.json`, JSON.stringify(R, null, 1));
console.log('errors', JSON.stringify(s.collector.firstParty.slice(0, 3)));
await b.close();
