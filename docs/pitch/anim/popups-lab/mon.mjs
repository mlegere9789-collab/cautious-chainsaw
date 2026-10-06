// Monuments card (group MON, scratch tree R1c + MON): desktop and phone
import fs from 'node:fs';
import { boot, sleep, SHOTS, OUT, TREES, REPO } from './h.mjs';
import { install, setTick } from './m.mjs';
const dist = REPO + '/tmp/mon-fix/mon-R1c/dist';
const entry = '/assets/' + fs.readdirSync(dist + '/assets').find((f) => /^index-[0-9a-f]+\.js$/.test(f));
TREES.mon.entry = entry;
console.log('entry', entry);
if (!process.env.PHONE_ONLY) {
  const b = await boot('mon', { cdpPort: 9538, profile: 'mon', viewport: { width: 1440, height: 900, dpr: 1, mobile: false }, waitMs: 4500 });
  const { page, s } = b;
  await install(page, entry);
  const shot = async (name, opts = {}) => { await page.screenshot({ path: `${SHOTS}/${name}.png`, ...opts }); console.log('shot', name); };
  await page.locator('button[title="Monuments"]').click(); await sleep(1500);
  await shot('d30-mon-layer-on-default-view');
  // Browse control: open, type, Enter
  const browse = page.getByRole('button', { name: /Browse monuments/i }).first();
  console.log('browse button', await browse.count());
  await browse.click(); await sleep(600);
  await shot('d31-mon-browse-list');
  await page.keyboard.type('Reynolds'); await sleep(500); await page.getByText('Reynolds Death Site').first().click(); await sleep(3500);
  await shot('d32-mon-card-reynolds-desktop');
  const card = await page.evaluate(() => { const e = document.querySelector('[data-gtbg-card="4"]'); if (!e) return null; const r = e.getBoundingClientRect(); return { rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)], text: e.innerText.replace(/\s+/g, ' ').slice(0, 700), role: e.getAttribute('role'), anim: getComputedStyle(e).animationName, z: getComputedStyle(e.parentElement).zIndex }; });
  console.log(JSON.stringify(card));
  // jump to this moment
  const jump = page.getByRole('button', { name: /Jump to this moment/i }).first();
  if (await jump.count()) { await jump.click(); await sleep(2500); await shot('d33-mon-after-jump'); console.log('after jump', JSON.stringify(await page.evaluate(() => { const g = window.__store.getState(); return { tick: g.currentTick, sel: g.selectedUnitId, clock: document.querySelector('#gt-timeline').innerText.split('\n')[0] }; }))); }
  console.log('tiles used', s.tileStats.seen, 'errors', JSON.stringify(s.collector.firstParty.slice(0, 2)));
  await s.close(); await b.srv.close();
}
{
  const b = await boot('mon', { cdpPort: 9538, profile: 'monphone', viewport: { width: 390, height: 844, dpr: 2, mobile: true }, waitMs: 5000 });
  const { page, s } = b;
  await install(page, entry);
  const shot = async (name, opts = {}) => { await page.screenshot({ path: `${SHOTS}/${name}.png`, ...opts }); console.log('shot', name); };
  await page.getByRole('button', { name: /Tools/ }).click(); await sleep(600);
  await page.getByRole('button', { name: /Monuments/ }).first().click(); await sleep(1500);
  await shot('p30-mon-phone-layer-on');
  const browse = page.getByRole('button', { name: /Browse monuments/i }).first();
  if (await browse.count()) { await browse.click(); await sleep(900); await shot('p30b-mon-phone-browse-sheet'); await page.getByText('Armistead Monument').first().click(); await sleep(3500); await shot('p31-mon-phone-card-armistead'); }
  console.log('phone card', JSON.stringify(await page.evaluate(() => { const e = document.querySelector('[data-gtbg-card="4"]'); if (!e) return null; const r = e.getBoundingClientRect(); return { rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)], text: e.innerText.replace(/\s+/g, ' ').slice(0, 500) }; })));
  console.log('tiles used', s.tileStats.seen);
  await s.close(); await b.srv.close();
}
