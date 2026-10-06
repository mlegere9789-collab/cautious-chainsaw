// Desktop screenshots, pass 4: first-run onboarding, boot splash, Extra Features menu, crops of HUD/minimap/unit panel, baseline (production build) cards
import { boot, sleep, SHOTS, OUT, TREES } from './h.mjs';
import { install, setTick } from './m.mjs';
const VP = { width: 1440, height: 900, dpr: 1, mobile: false };
const which = process.argv[2] || 'R1c';
// ---- first run (onboarding): fresh profile, no gtbg_onboarded
{
  const b = await boot('R1c', { cdpPort: 9535, profile: 'onb', viewport: VP, onboarded: false, waitMs: 0 });
  const { page, s } = b;
  const shot = async (name, opts = {}) => { await page.screenshot({ path: `${SHOTS}/${name}.png`, ...opts }); console.log('shot', name); };
  await sleep(1500);
  await shot('d20-onboarding-1-archetype');
  const btns = await page.evaluate(() => Array.from(document.querySelectorAll('[role="dialog"] button')).map((x) => x.innerText.replace(/\s+/g, ' ').slice(0, 60)));
  console.log(JSON.stringify(btns));
  await page.getByRole('button', { name: /New to Gettysburg/ }).click(); await sleep(900);
  await shot('d20-onboarding-2-tour-step1');
  await page.getByRole('button', { name: 'Next →' }).click(); await sleep(600);
  await page.getByRole('button', { name: 'Next →' }).click(); await sleep(900);
  await shot('d20-onboarding-3-tour-step3-reynolds');
  console.log('onboarding bg:', await page.evaluate(() => { const o = document.querySelector('[role="dialog"]'); const p = o && o.parentElement; return p ? getComputedStyle(p).backgroundColor : null; }));
  await s.close(); await b.srv.close();
}
// ---- main session: extra features menu open, close-ups, the toolbar "Toggle Units", the Trails button
{
  const b = await boot(which, { cdpPort: 9535, profile: 'desk1', viewport: VP, waitMs: 4000 });
  const { page, s } = b;
  await install(page, TREES[which].entry);
  const shot = async (name, opts = {}) => { await page.screenshot({ path: `${SHOTS}/${name}.png`, ...opts }); console.log('shot', name); };
  await sleep(2000);
  await setTick(page, 28); await sleep(900);
  await shot('d21-crop-hud-and-pill', { clip: { x: 0, y: 48, width: 720, height: 180 } });
  await page.locator('#ef-btn').click(); await sleep(700);
  await shot('d22-extra-features-menu-open');
  await page.keyboard.press('Escape'); await sleep(300);
  await setTick(page, 553); await sleep(900);
  await shot('d23-crop-event-and-story-553', { clip: { x: 480, y: 40, width: 960, height: 740 } });
  const pills = [];
  for (const t of [28, 100, 267, 302, 553]) { await setTick(page, t); await sleep(1300); pills.push([t, await page.evaluate(() => { const r = document.getElementById('extra-features').getBoundingClientRect(); return [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)]; })]); }
  console.log('extra-features rect by tick (settled):', JSON.stringify(pills));
  await s.close(); await b.srv.close();
}
// ---- the production build (baseline/dist = what the live site serves): story + event at tick 28
{
  const b = await boot('base', { cdpPort: 9535, profile: 'base', viewport: VP, waitMs: 5000 });
  const { page, s } = b;
  await page.evaluate(async (e) => { const ns = await import(e); window.__store = ns.u; }, TREES.base.entry);
  const shot = async (name, opts = {}) => { await page.screenshot({ path: `${SHOTS}/${name}.png`, ...opts }); console.log('shot', name); };
  await page.evaluate(() => window.__store.getState().setTick(28)); await sleep(1500);
  await shot('d24-production-build-tick28');
  console.log('baseline popups', await page.evaluate(() => ({ cards: Array.from(document.querySelectorAll('[data-gtbg-card]')).length, toolbarClock: document.querySelector('.gtbg-tb-tick') && document.querySelector('.gtbg-tb-tick').innerText })));
  await s.close(); await b.srv.close();
}
console.log('done');
