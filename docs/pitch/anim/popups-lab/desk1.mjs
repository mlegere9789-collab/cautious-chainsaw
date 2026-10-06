// Desktop screenshots, pass 1: cards, toasts, unit panel (R1c, 1440x900)
import { boot, withStore, sleep, SHOTS, OUT, TREES, mapView } from './h.mjs';
const VP = { width: 1440, height: 900, dpr: 1, mobile: false };
const b = await boot('R1c', { cdpPort: 9530, profile: 'desk1', viewport: VP, waitMs: 4000 });
const { page, s } = b;
await withStore(page, TREES.R1c.entry);
const shot = async (name) => { await page.screenshot({ path: `${SHOTS}/${name}.png` }); console.log('shot', name); };
const setTick = (t) => page.evaluate((t) => window.__store.getState().setTick(t), t);
const play = (on, speed) => page.evaluate(([on, speed]) => { const g = window.__store.getState(); if (speed) g.setSpeed(speed); g.setPlaying(on); }, [on, speed]);
await sleep(2500);
await shot('d01-rest-tick1');
// story + event card: tick 28
for (const t of [12, 28]) { await setTick(t); await sleep(1500); await shot(`d02-cards-tick${t}`); }
// two stories + event: tick 553 (551 and 553 triggers; 553 has an event?) 
await setTick(553); await sleep(1500); await shot('d03-cards-tick553');
await setTick(556); await sleep(1500); await shot('d04-cards-tick556');
// text dump of every floating element at tick 553 for the inventory
const dump = await page.evaluate(() => {
  const out = [];
  document.querySelectorAll('#root *').forEach((el) => {
    const cs = getComputedStyle(el); if (!['fixed', 'absolute'].includes(cs.position)) return;
    const z = parseInt(cs.zIndex, 10); if (!(z >= 8)) return;
    const r = el.getBoundingClientRect(); if (r.width < 20 || r.height < 14) return;
    out.push({ tag: el.tagName, z, pos: cs.position, x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), card: el.getAttribute('data-gtbg-card'), role: el.getAttribute('role'), aria: el.getAttribute('aria-label'), txt: (el.innerText || '').replace(/\s+/g, ' ').slice(0, 60) });
  });
  return out;
});
console.log(JSON.stringify(dump, null, 0).slice(0, 6000));
await b.close();
