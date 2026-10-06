// How long are the transient popups really on screen while playing? Records mount/unmount of event cards, story cards and toasts
// with performance.now() through a MutationObserver, plus frame intervals, for one 100-tick window at 5 speeds.
import fs from 'node:fs';
import { boot, sleep, TREES, OUT, REPO } from './h.mjs';
import { install, setTick } from './m.mjs';

const which = process.argv[2] || 'R1c';
const SPEEDS = (process.env.SPEEDS || '1,2,4,8,16').split(',').map(Number);
const FROM = +process.env.FROM || 254, TO = +process.env.TO || 356;
const VP = { width: 1440, height: 900, dpr: 1, mobile: false };
const b = await boot(which, { cdpPort: 9532, profile: 'timing', viewport: VP, waitMs: 3000 });
const { page, s } = b;
await install(page, TREES[which].entry);
await page.evaluate(() => window.__store.getState().setTick(675)); await sleep(2500);
await page.evaluate(() => window.__store.getState().setTick(1)); await sleep(300);
s.setTiles('block');

await page.evaluate(() => {
  const L = (window.__log = { t0: performance.now(), ev: [], frames: [], longtasks: [] });
  const state = () => {
    const e = document.querySelector('[data-gtbg-card="1"]'), st = document.querySelector('[data-gtbg-card="2"]');
    return {
      event: e ? (e.innerText.split('\n').find((x, i, a) => i > 2 && x.length > 30) || e.innerText).slice(0, 80) : null,
      story: st ? (st.innerText.split('\n').find((x) => x.length > 8 && !/min read|^⏩|^✕|^◀|^▶/.test(x)) || '').slice(0, 60) : null,
      toasts: Array.from(document.querySelectorAll('[role="log"][aria-label="Battle events"] > div')).map((d) => d.innerText.replace(/\s+/g, ' ').slice(0, 70)),
      pill: (() => { const p = document.getElementById('extra-features'); if (!p) return null; const r = p.getBoundingClientRect(); return [Math.round(r.x), Math.round(r.y)]; })(),
    };
  };
  let prev = JSON.stringify(state());
  const tick = () => window.__store.getState().currentTick;
  const mo = new MutationObserver(() => {
    const cur = state(); const j = JSON.stringify(cur);
    if (j !== prev) { L.ev.push({ t: performance.now() - L.t0, tick: tick(), ...cur }); prev = j; }
  });
  mo.observe(document.getElementById('root'), { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['style', 'data-gtbg-card'] });
  window.__store.subscribe((st, p) => { if (st.currentTick !== p.currentTick) L.ev.push({ t: performance.now() - L.t0, tickOnly: st.currentTick }); });
  let last = performance.now();
  const f = () => { const n = performance.now(); L.frames.push(n - last); last = n; requestAnimationFrame(f); };
  requestAnimationFrame(f);
  try { new PerformanceObserver((l) => l.getEntries().forEach((e) => L.longtasks.push([Math.round(e.startTime - L.t0), Math.round(e.duration)]))).observe({ entryTypes: ['longtask'] }); } catch (e) { /* none */ }
});

const out = { which, window: [FROM, TO], speeds: {} };
for (const sp of SPEEDS) {
  await page.evaluate(([from, sp]) => { const g = window.__store.getState(); g.setPlaying(false); g.setSpeed(sp); g.setTick(from); window.__log.ev.length = 0; window.__log.frames.length = 0; window.__log.longtasks.length = 0; window.__log.t0 = performance.now(); }, [FROM, sp]);
  await sleep(800);
  await page.evaluate(() => { window.__log.t0 = performance.now(); window.__log.ev.length = 0; window.__log.frames.length = 0; window.__store.getState().setPlaying(true); });
  const t0 = Date.now();
  for (;;) {
    const t = await page.evaluate(() => window.__store.getState().currentTick);
    if (t >= TO || Date.now() - t0 > 160000) break;
    await sleep(200);
  }
  await page.evaluate(() => window.__store.getState().setPlaying(false));
  await sleep(5200); // let the last toasts expire (4.5 s)
  const log = await page.evaluate(() => JSON.parse(JSON.stringify(window.__log)));
  out.speeds[sp] = { wallMs: Date.now() - t0, log };
  console.log('speed', sp, 'events logged', log.ev.length, 'frames', log.frames.length, 'wall s', Math.round((Date.now() - t0) / 1000));
}
fs.writeFileSync(OUT + `/timing-${which}.json`, JSON.stringify(out));
console.log('errors', JSON.stringify(s.collector.firstParty.slice(0, 3)));
await b.close();
