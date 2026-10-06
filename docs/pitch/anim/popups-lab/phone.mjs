// Phone screenshots (390x844 @2x, touch) and landscape (844x390): popups on the phone layout of R1c
import { boot, sleep, SHOTS, OUT, TREES } from './h.mjs';
import { install, setTick } from './m.mjs';
const which = process.argv[2] || 'R1c';
const PH = { width: 390, height: 844, dpr: 2, mobile: true };
const LS = { width: 844, height: 390, dpr: 2, mobile: true };
{
  const b = await boot(which, { cdpPort: 9536, profile: 'phone', viewport: PH, waitMs: 5000 });
  const { page, s } = b;
  await install(page, TREES[which].entry);
  const shot = async (name, opts = {}) => { await page.screenshot({ path: `${SHOTS}/${name}.png`, ...opts }); console.log('shot', name); };
  console.log('layout', await page.evaluate(() => document.documentElement.getAttribute('data-layout')));
  await sleep(1500);
  await shot('p01-rest-tick1');
  await setTick(page, 28); await sleep(1500); await shot('p02-cards-tick28');
  const stack = await page.evaluate(() => Array.from(document.querySelectorAll('.gtbg-mp-story > *')).map((e) => ({ card: e.getAttribute('data-gtbg-card'), collapsed: e.hasAttribute('data-collapsed'), chip: e.getAttribute('data-chip'), r: (({ x, y, width, height }) => [Math.round(x), Math.round(y), Math.round(width), Math.round(height)])(e.getBoundingClientRect()) })));
  console.log('stack tick28', JSON.stringify(stack));
  await setTick(page, 553); await sleep(1500); await shot('p03-cards-tick553');
  console.log('stack tick553', JSON.stringify(await page.evaluate(() => Array.from(document.querySelectorAll('.gtbg-mp-story > *')).map((e) => ({ card: e.getAttribute('data-gtbg-card'), collapsed: e.hasAttribute('data-collapsed'), r: (({ x, y, width, height }) => [Math.round(x), Math.round(y), Math.round(width), Math.round(height)])(e.getBoundingClientRect()) })))));
  // toasts: play from 547
  await setTick(page, 547); await sleep(500);
  await page.getByRole('button', { name: 'Play', exact: true }).tap().catch(async () => { await page.getByRole('button', { name: 'Play', exact: true }).click(); });
  for (let i = 0; i < 60; i++) { const n = await page.evaluate(() => document.querySelectorAll('.gtbg-mp-toast [role="log"] > div').length); if (n >= 2) break; await sleep(50); }
  await shot('p04-toasts-playing');
  console.log('toasts', await page.evaluate(() => Array.from(document.querySelectorAll('.gtbg-mp-toast [role="log"] > div')).map((e) => e.innerText.replace(/\s+/g, ' ').slice(0, 70))));
  await page.getByRole('button', { name: 'Pause', exact: true }).click().catch(() => {}); await sleep(5000);
  // unit popup
  await setTick(page, 28); await sleep(500);
  await page.evaluate(() => { const g = window.__store.getState(); g.selectUnit('U-I-1-1'); g.pinUnit('U-I-1-1'); }); await sleep(2500);
  await shot('p05-unit-popup-tick28');
  console.log('unit popup rect', await page.evaluate(() => { const e = document.querySelector('.gtbg-m-popup'); if (!e) return null; const r = e.getBoundingClientRect(); return [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)]; }));
  console.log('stack with popup', JSON.stringify(await page.evaluate(() => Array.from(document.querySelectorAll('.gtbg-mp-story > *')).map((e) => ({ card: e.getAttribute('data-gtbg-card'), vis: getComputedStyle(e.parentElement).visibility })))));
  await page.evaluate(() => { const g = window.__store.getState(); g.selectUnit(null); g.pinUnit(null); });
  await page.getByRole('button', { name: /Tools/ }).click(); await sleep(600); await shot('p06-tools-sheet');
  await page.getByRole('button', { name: 'Close tools' }).click(); await sleep(300);
  console.log('phone errors', JSON.stringify(s.collector.firstParty.slice(0, 3)), 'tiles', s.tileStats.seen);
  await s.close(); await b.srv.close();
}
{
  const b = await boot(which, { cdpPort: 9536, profile: 'phone', viewport: LS, waitMs: 4000 });
  const { page, s } = b;
  await install(page, TREES[which].entry);
  const shot = async (name, opts = {}) => { await page.screenshot({ path: `${SHOTS}/${name}.png`, ...opts }); console.log('shot', name); };
  await sleep(1500); await setTick(page, 28); await sleep(1500); await shot('p07-landscape-cards-tick28');
  await s.close(); await b.srv.close();
}
{
  const b = await boot(which, { cdpPort: 9536, profile: 'phone-onb', viewport: PH, onboarded: false, waitMs: 3000 });
  const { page, s } = b;
  const shot = async (name, opts = {}) => { await page.screenshot({ path: `${SHOTS}/${name}.png`, ...opts }); console.log('shot', name); };
  await sleep(1200); await shot('p08-onboarding-archetype');
  await page.getByRole('button', { name: /New to Gettysburg/ }).click(); await sleep(900); await shot('p08-onboarding-tour1');
  await s.close(); await b.srv.close();
}
console.log('done');
