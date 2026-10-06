// Desktop screenshots, pass 2: toasts, unit panel, tour, legend tabs, search, filter, distance, layers, minimap
import { boot, withStore, sleep, SHOTS, OUT, TREES, mapView } from './h.mjs';
const VP = { width: 1440, height: 900, dpr: 1, mobile: false };
const b = await boot('R1c', { cdpPort: 9530, profile: 'desk1', viewport: VP, waitMs: 4000 });
const { page, s } = b;
const E = TREES.R1c.entry;
await withStore(page, E);
const shot = async (name, opts = {}) => { await page.screenshot({ path: `${SHOTS}/${name}.png`, ...opts }); console.log('shot', name); };
const setTick = (t) => page.evaluate((t) => window.__store.getState().setTick(t), t);
const play = (on, speed) => page.evaluate(([on, speed]) => { const g = window.__store.getState(); if (speed) g.setSpeed(speed); g.setPlaying(on); }, [on, speed]);
await sleep(2500);
// ---- toasts: play from 547 at 1x, grab as soon as 2+ toasts are on screen
await setTick(547); await sleep(500);
await play(true, 1);
let got = null;
for (let i = 0; i < 80; i++) {
  const n = await page.evaluate(() => document.querySelectorAll('[role="log"][aria-label="Battle events"] > div').length);
  if (n >= 3) { got = n; break; }
  await sleep(50);
}
console.log('toasts on screen', got);
await shot('d05-toasts-playing-tick550');
const toastHtml = await page.evaluate(() => Array.from(document.querySelectorAll('[role="log"][aria-label="Battle events"] > div')).map((d) => ({ txt: d.innerText.replace(/\s+/g, ' '), rect: (({ x, y, width, height }) => ({ x, y, width, height }))(d.getBoundingClientRect()), anim: getComputedStyle(d).animationName })));
console.log(JSON.stringify(toastHtml));
await play(false);
// ---- unit panel: select the Iron Brigade at tick 28
await setTick(28);
await page.evaluate(() => { const g = window.__store.getState(); g.selectUnit('U-I-1-1'); g.pinUnit('U-I-1-1'); });
await sleep(800);
await shot('d06-unit-panel-ironbrigade-t28');
const panel = await page.evaluate(() => { const p = document.getElementById('gt-unit-panel'); if (!p) return null; const r = p.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, txt: p.innerText.replace(/\s+/g, ' ').slice(0, 900) }; });
console.log(JSON.stringify(panel));
await page.evaluate(() => { const g = window.__store.getState(); g.selectUnit(null); g.pinUnit(null); });
// ---- legend tabs
for (const [i, name] of [[1, 'sides'], [2, 'size']]) {
  await page.getByRole('group', { name: 'Legend' }).getByRole('button', { name: name === 'sides' ? 'Sides' : 'Size' }).click();
  await sleep(300);
  await shot(`d07-legend-${name}`, { clip: { x: 0, y: 360, width: 300, height: 400 } });
}
// ---- NPS Auto Tour
await page.getByRole('button', { name: /NPS Auto Tour/ }).click();
await sleep(2500);
await shot('d08-tour-stop1');
await page.getByRole('button', { name: /Show Video/ }).click().catch(() => {});
await sleep(800);
await shot('d08b-tour-stop1-video');
await page.getByRole('button', { name: /Next/ }).click(); await sleep(2500);
await page.getByRole('button', { name: /Next/ }).click(); await sleep(2500);
await page.getByRole('button', { name: /Next/ }).click(); await sleep(2500);
await page.getByRole('button', { name: /Next/ }).click(); await sleep(2500);
await shot('d08c-tour-stop5');
await page.getByRole('button', { name: 'Close' }).last().click().catch(() => {});
await sleep(500);
console.log('tiles', JSON.stringify({ seen: s.tileStats.seen, st: s.tileStats.status }));
await b.close();
