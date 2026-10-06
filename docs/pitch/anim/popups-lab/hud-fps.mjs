// What does the HUD's fps text say while the page really renders at ~60 fps?
import { boot, sleep, TREES } from './h.mjs';
import { install } from './m.mjs';
const b = await boot('R1c', { cdpPort: 9549, profile: 'hudfps', viewport: { width: 1440, height: 900, dpr: 1, mobile: false }, waitMs: 4000 });
const { page, s } = b;
await install(page, TREES.R1c.entry);
await page.evaluate(() => window.__store.getState().setTick(675)); await sleep(2500);
await page.evaluate(() => { const g = window.__store.getState(); g.setTick(1); g.setSpeed(1); });
s.setTiles('block');
await page.evaluate(() => { window.__fr = []; let last = performance.now(); const f = () => { const n = performance.now(); window.__fr.push(n - last); last = n; requestAnimationFrame(f); }; requestAnimationFrame(f); window.__store.getState().setPlaying(true); });
const rows = [];
for (let i = 0; i < 24; i++) { await sleep(500); rows.push(await page.evaluate(() => { const fr = window.__fr.splice(0); const hud = Array.from(document.querySelectorAll('#root div')).find((e) => /^July \d, 1863/.test((e.innerText || '').trim()) && getComputedStyle(e).zIndex === '88'); const fps = fr.length ? Math.round(1000 / (fr.reduce((a, b) => a + b, 0) / fr.length)) : null; return { measuredFps: fps, hudText: hud ? hud.innerText.replace(/\s+/g, ' ') : null }; })); }
await page.evaluate(() => window.__store.getState().setPlaying(false));
console.log(rows.map((r) => `${r.measuredFps} | ${r.hudText}`).join('\n'));
await b.close();
