// url-check-presets.mjs - opens docs/pitch/anim/prototype/battle-studio.html (the COMMITTED prototype, unchanged) from a file:// address with the three motion-personality URLs of PITCH.md section 10.4,
// headless Chrome, and reports (a) console errors, (b) network requests, (c) whether every dial of the preset reads back the value the URL set, (d) the skin and the number of tiles drawn.
//   node url-check-presets.mjs <path-to-battle-studio.html> <profile-dir>
import path from 'node:path';
import fs from 'node:fs';
import { chromium } from 'playwright-core';
const file = path.resolve(process.argv[2] || 'battle-studio.html');
const dir = path.resolve(process.argv[3] || 'chrome-profile-url');
const CHROME = process.env.T0_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const base = 'file:///' + file.split(path.sep).join('/');
export const PRESETS = {
  'war-room': { 'time.speedRampMs': 400, 'time.glideMs': 800, 'camera.zoomGlideMs': 320, 'camera.panGlideMs': 220, 'motion.smoothMs': 140, 'motion.fadeMs': 300, 'layout.splitDwellMs': 700, 'popup.motion.enterMs': 280, 'popup.motion.risePx': 10, 'popup.motion.leaderMs': 320 },
  'field-manual': { 'interp.model': 'chord-smooth', 'layout.dMaxPx': 0, 'time.speedRampMs': 120, 'time.glideMs': 350, 'camera.zoomGlideMs': 120, 'camera.panGlideMs': 80, 'motion.smoothMs': 80, 'motion.fadeMs': 120, 'popup.motion.enterMs': 140, 'popup.motion.risePx': 3, 'popup.motion.leaderMs': 140 },
  'map-1863': { 'time.speedRampMs': 600, 'time.glideMs': 1000, 'camera.zoomGlideMs': 420, 'camera.panGlideMs': 300, 'motion.smoothMs': 200, 'motion.fadeMs': 400, 'layout.splitDwellMs': 1000, 'popup.motion.enterMs': 380, 'popup.motion.risePx': 8, 'popup.motion.leaderMs': 420 },
};
const out = [];
fs.mkdirSync(dir, { recursive: true });
const ctx = await chromium.launchPersistentContext(dir, { executablePath: CHROME, headless: true, viewport: { width: 1440, height: 900 } });
const page = ctx.pages()[0] || await ctx.newPage();
for (const [style, set] of Object.entries(PRESETS)) {
  const q = `?style=${style}&set=${encodeURIComponent(JSON.stringify(set))}&welcome=0&fresh=1`;
  const errors = []; const reqs = [];
  const h1 = (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text()); }; const h2 = (e) => errors.push('pageerror: ' + e.message); const h3 = (r) => { const u = r.url(); if (!u.startsWith('data:') && !u.startsWith('blob:')) reqs.push(u); };
  page.on('console', h1); page.on('pageerror', h2); page.on('request', h3);
  await page.goto(base + q);
  await page.waitForFunction(() => window.__studio && window.__studio.ready, null, { timeout: 30000 });
  await page.waitForTimeout(1500);
  const info = await page.evaluate((set) => {
    const S = window.__studio; const T = S.engine.tuning; const bad = []; for (const [k, v] of Object.entries(set)) { const got = T.get(k); if (got !== v) bad.push([k, v, got]); }
    return { skin: T.get('skin.id'), tiles: S.engine.frame ? S.engine.frame.tiles.length : null, mismatches: bad };
  }, set);
  out.push({ style, dialsSet: Object.keys(set).length, ...info, consoleErrors: errors.slice(0, 3), requests: reqs.filter((u) => !u.startsWith(base.split('?')[0])).length });
  page.off('console', h1); page.off('pageerror', h2); page.off('request', h3);
}
await ctx.close();
console.log(JSON.stringify(out, null, 1));
fs.writeFileSync(path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\//, '')), '..', 'results', 'url-check-presets.json'), JSON.stringify({ file: base, generated: new Date().toISOString(), results: out }, null, 1));
