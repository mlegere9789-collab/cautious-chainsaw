// Desktop screenshots, pass 3: tour, search/filter, distance, layers, roster, OOB, soldier's eye, ancestor, help, bookmarks
import { boot, withStore, sleep, SHOTS, OUT, TREES, mapView } from './h.mjs';
const VP = { width: 1440, height: 900, dpr: 1, mobile: false };
const b = await boot('R1c', { cdpPort: 9530, profile: 'desk1', viewport: VP, waitMs: 4000 });
const { page, s } = b;
await withStore(page, TREES.R1c.entry);
const shot = async (name, opts = {}) => { await page.screenshot({ path: `${SHOTS}/${name}.png`, ...opts }); console.log('shot', name); };
const btn = (title) => page.locator(`button[title="${title}"]`).first();
await sleep(2500);
// ---- tour
await page.getByRole('button', { name: /NPS Auto Tour/ }).click();
await sleep(2200);
await shot('d08-tour-stop1');
await page.getByRole('button', { name: /Show Video/ }).click().catch(() => {});
await sleep(1200);
await shot('d08b-tour-stop1-video');
for (let i = 0; i < 4; i++) { await page.getByRole('button', { name: 'Next →' }).click(); await sleep(2200); }
await shot('d08c-tour-stop5');
const tourDump = await page.evaluate(() => { const el = document.querySelector('[data-gtbg-card="3"]'); if (!el) return null; const r = el.getBoundingClientRect(); return { r: [r.x, r.y, r.width, r.height], txt: el.innerText.slice(0, 200) }; });
console.log(JSON.stringify(tourDump));
// close tour with its X
await page.locator('[data-gtbg-card="3"] button[aria-label="Close"]').click();
await sleep(500);
// ---- search
await btn('Search').click(); await sleep(500);
await page.keyboard.type('20th Maine'); await sleep(600);
await shot('d09-search');
await page.keyboard.press('Escape'); await sleep(300);
// ---- filter
await btn('Filter').click(); await sleep(500); await shot('d10-filter'); await btn('Filter').click(); await sleep(300);
// ---- layers
await btn('Map Layers').click(); await sleep(500); await shot('d11-layers'); await btn('Map Layers').click(); await sleep(300);
// ---- distance tool
await btn('Distance Tool').click(); await sleep(400);
await page.mouse.click(600, 300); await sleep(200); await page.mouse.click(760, 420); await sleep(500);
await shot('d12-distance-tool');
await btn('Distance Tool').click(); await sleep(300);
// ---- roster / help / bookmarks / ancestor / soldier
await btn('Unit Roster').click(); await sleep(700); await shot('d13-roster'); await btn('Unit Roster').click(); await sleep(300);
await btn('Help').click(); await sleep(1200); await shot('d14-help'); await page.keyboard.press('Escape'); await sleep(400);
await btn('Bookmarks').click(); await sleep(1000); await shot('d15-bookmarks'); await page.keyboard.press('Escape'); await sleep(400);
await btn('Follow Your Ancestor').click(); await sleep(700); await shot('d16-ancestor'); await page.keyboard.press('Escape'); await sleep(400);
await btn("Soldier's Eye View (Street View)").click(); await sleep(700); await shot('d17-soldiers-eye'); await page.keyboard.press('Escape'); await sleep(400);
await btn('Monuments').click(); await sleep(500); await shot('d18-monuments-btn-r1c-nothing');
console.log('tiles', JSON.stringify({ seen: s.tileStats.seen, st: s.tileStats.status }));
await b.close();
