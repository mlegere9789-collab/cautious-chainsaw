// The production build (baseline/dist = what the live site serves): the chooser, then the same cards at tick 28
import { boot, sleep, SHOTS, TREES } from './h.mjs';
const b = await boot('base', { cdpPort: 9547, profile: 'prod', viewport: { width: 1440, height: 900, dpr: 1, mobile: false }, waitMs: 5000 });
const { page, s } = b;
await page.getByText('Select Desktop').first().click(); await sleep(2500);
await page.evaluate(async (e) => { const ns = await import(e); window.__store = ns.u; }, TREES.base.entry);
await page.evaluate(() => window.__store.getState().setTick(28)); await sleep(1500);
await page.screenshot({ path: SHOTS + '/d25-production-build-tick28.png' });
const info = await page.evaluate(() => { const q = (t) => Array.from(document.querySelectorAll('div')).find((e) => e.children.length < 8 && (e.innerText || '').startsWith(t)); const r = (e) => { if (!e) return null; const b = e.getBoundingClientRect(); return [Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height)]; }; const sc = Array.from(document.querySelectorAll('div')).filter((e) => /min read/.test(e.innerText || '') && e.children.length >= 4 && getComputedStyle(e).position === 'absolute').map(r); const nav = document.querySelector('.mapboxgl-ctrl-top-right'); return { storyCardRects: sc.slice(0, 2), navCtrl: r(nav), clock: (document.querySelector('.gtbg-tb-tick') || {}).innerText }; });
console.log(JSON.stringify(info));
await s.close(); await b.srv.close();
