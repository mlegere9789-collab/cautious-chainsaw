import { boot, sleep, TREES } from './h.mjs';
import { install, setTick } from './m.mjs';
const b = await boot('R1c', { cdpPort: 9550, profile: 'tint', viewport: { width: 1440, height: 900, dpr: 1, mobile: false }, waitMs: 4000 });
const { page } = b;
await install(page, TREES.R1c.entry);
const q = () => page.evaluate(() => Array.from(document.querySelectorAll('div')).filter((e) => /multiply/.test(e.style.cssText || '')).map((e) => ({ z: getComputedStyle(e).zIndex, bg: e.style.background, tr: getComputedStyle(e).transitionDuration + ' ' + getComputedStyle(e).transitionProperty, blend: getComputedStyle(e).mixBlendMode, rect: (({ width, height }) => [Math.round(width), Math.round(height)])(e.getBoundingClientRect()) })));
const rows = [];
for (const t of [1, 40, 120, 200, 225, 226, 300, 400, 450, 451, 500, 600, 675]) { await setTick(page, t); await sleep(150); rows.push([t, await q()]); }
console.log(JSON.stringify(rows.map(([t, r]) => [t, r[0] && r[0].bg, r[0] && r[0].tr])));
console.log(JSON.stringify(rows[0][1]));
await b.close();
