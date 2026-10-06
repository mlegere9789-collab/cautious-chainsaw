// test/popups-shots.mjs - screenshots of the popups in the built Studio, in real Chrome, deterministic (the engine and the director are driven by studio.step(n, dt) on a virtual clock, no wall
// clock): written to docs/pitch/anim/shots/prototype/popups-*.png.  Every shot is a real moment of the real data.
//   node docs/pitch/anim/prototype/test/popups-shots.mjs [--only=name] [--dpr=1.5]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const HERE = path.dirname(fileURLToPath(import.meta.url)); const PROTO = path.resolve(HERE, '..'); const REPO = path.resolve(PROTO, '..', '..', '..', '..');
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? '1']; }));
const OUT = process.env.SHOTS_OUT || path.join(REPO, 'docs', 'pitch', 'anim', 'shots', 'prototype'); fs.mkdirSync(OUT, { recursive: true });
const CHROME = process.env.T0_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const GO = (lat, lng, z, tick) => `e.transport.pause(); e.moveTo({ lat: ${lat}, lng: ${lng}, zoom: ${z} }, { glide: false, safe: true }); e.transport.seek(${tick}, { glide: false }); st.step(40, 50); st.step(40, 20);`;
const HERBST = [39.8278, -77.2528]; const ANGLE = [39.8117, -77.235]; const LRT = [39.7956, -77.2411];
export const SHOTS = [
  { name: 'popups-01-event-story-toast-tick28', js: `${GO(...HERBST, 14.5, 28)} return 'ok';` },
  { name: 'popups-02-story-in-the-reading-rail', js: `${GO(...HERBST, 14.5, 28)} st.host.openRail('story-card:story-V-002'); st.step(80, 20); return 'ok';` },
  { name: 'popups-03-command-changes-merged-tick550', js: `${GO(...ANGLE, 14.5, 550)} return 'ok';` },
  { name: 'popups-04-unit-card-selected', js: `${GO(...HERBST, 15, 40)} const t = e.frame.tiles.find((q) => q.ids[0] === 'U-I-1-1'); e.select('U-I-1-1'); st.host.setSelected('U-I-1-1'); st.step(60, 20); return !!t;` },
  { name: 'popups-05-unit-card-in-the-rail', js: `${GO(...HERBST, 15, 40)} e.select('U-I-1-1'); st.host.setSelected('U-I-1-1'); st.step(60, 20); st.host.openRail('unit-card:sel-U-I-1-1'); st.step(80, 20); return 'ok';` },
  { name: 'popups-06-hover-tooltip', js: `${GO(...ANGLE, 16, 551)} e.transport.pause(); const t = e.frame.tiles.filter((q) => q.solid && q.kind === 'leaf').sort((a, b) => Math.hypot(a.x + e.frame.view.dx - 560, a.y + e.frame.view.dy - 380) - Math.hypot(b.x + e.frame.view.dx - 560, b.y + e.frame.view.dy - 380))[0]; st.host.setHover({ key: t.key, since: -9e6, x: 0, y: 0 }); st.step(40, 20); return t.ids[0];` },
  { name: 'popups-07-auto-tour-little-round-top', js: `${GO(...LRT, 14.5, 260)} [...document.querySelectorAll('.pop-tb')].find((b) => b.textContent === 'Auto tour').click(); st.step(40, 20); st.host.act('tour:tour', 'goto:4'); st.step(260, 20); return 'ok';` },
  { name: 'popups-08-day-banner-and-clock-tick226', js: `${GO(...ANGLE, 12.5, 226)} return 'ok';` },
  { name: 'popups-09-legend-open-and-overview', js: `${GO(...HERBST, 14, 60)} st.host.act('legend:legend', 'toggle'); st.step(60, 20); return 'ok';` },
  { name: 'popups-10-hint', js: `e.transport.pause(); st.step(200, 16.667); return 'ok';`, q: 'scene=carry1&zoom=14' },
  { name: 'popups-11-chronicle-list', js: `${GO(...ANGLE, 14, 120)} st.host.key('c'); st.step(80, 20); return 'ok';` },
  { name: 'popups-12-fast-playback-chips-in-the-strip', js: `${GO(...ANGLE, 14, 540)} e.transport.setSpeed(4); e.transport.play(); st.step(200, 16.667); e.transport.pause(); st.step(30, 16.667); return 'ok';` },
  { name: 'popups-13-phone-lane', vp: [390, 844], dpr: 2, js: `${GO(...HERBST, 14, 28)} return 'ok';` },
  { name: 'popups-14-phone-sheet-event', vp: [390, 844], dpr: 2, js: `${GO(...HERBST, 14, 28)} st.host.openRail('event-card:event-28'); st.step(80, 20); return 'ok';` },
  { name: 'popups-15-phone-sheet-story', vp: [390, 844], dpr: 2, js: `${GO(...HERBST, 14, 28)} st.host.openRail('story-card:story-V-002'); st.host.setSheet('full'); st.step(80, 20); return 'ok';` },
  { name: 'popups-16-dark-theme', dark: true, q: 'scene=fresh2&zoom=14.5&backdrop=ink', js: `${GO(...HERBST, 14.5, 28)} return 'ok';` },
  { name: 'popups-17-signal-palette', q: 'scene=fresh2&zoom=14.5&set=' + encodeURIComponent('{"popup.style.palette":"signal","popup.style.radiusPx":6}'), js: `${GO(...HERBST, 14.5, 28)} return 'ok';` },
];

const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-first-run', '--disable-extensions'] });
try {
  for (const s of SHOTS) {
    if (args.only && s.name !== args.only) continue; const vp = s.vp || [1440, 900];
    const ctx = await browser.newContext({ viewport: { width: vp[0], height: vp[1] }, deviceScaleFactor: s.dpr || +(args.dpr || 1.5), colorScheme: s.dark ? 'dark' : 'light', hasTouch: vp[0] < 700 });
    const page = await ctx.newPage(); const errs = []; page.on('pageerror', (e) => errs.push('pageerror ' + e.message)); page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
    await page.goto(pathToFileURL(path.join(PROTO, 'battle-studio.html')).href + '?fresh=1&' + (s.q || 'scene=fresh2&zoom=14.5')); await page.waitForFunction(() => window.__studio && window.__studio.ready);
    const res = await page.evaluate(`(async () => { const st = window.__studio; const e = st.engine; ${s.js} })()`);
    await page.evaluate(() => { window.__studio.engine.transport.pause(); window.__studio.step(2, 16); }); await page.waitForTimeout(150);
    await page.screenshot({ path: path.join(OUT, s.name + '.png') }); console.log(s.name, JSON.stringify(res), errs.length ? 'ERRORS ' + errs.slice(0, 3).join(' | ') : 'ok'); await ctx.close();
  }
} finally { await browser.close(); }
