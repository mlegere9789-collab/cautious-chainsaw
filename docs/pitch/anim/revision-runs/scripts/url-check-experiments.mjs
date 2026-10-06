// url-check-experiments.mjs - opens revision-runs/battle-studio-experiments.html from a file:// address with the experiment URLs of PITCH.md Appendix A: console errors, network requests, the display mode and skin the page reports, tiles drawn.
//   node url-check-experiments.mjs <path-to-battle-studio-experiments.html> <profile-dir>
import path from 'node:path';
import fs from 'node:fs';
import { chromium } from 'playwright-core';
const file = path.resolve(process.argv[2]); const dir = path.resolve(process.argv[3] || 'chrome-profile-url2');
const CHROME = process.env.T0_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const base = 'file:///' + file.split(path.sep).join('/');
const cases = ['?mode=strict&welcome=0', '?mode=strict-push&welcome=0', '?style=mark-sketch&zoom=13.5&tick=551&mode=strict-push&welcome=0', '?style=mark-sketch&zoom=13.5&tick=551&welcome=0', '?style=war-room&mode=strict&set=' + encodeURIComponent('{"layout.dMaxPx":0}') + '&welcome=0'];
const out = [];
fs.mkdirSync(dir, { recursive: true });
const ctx = await chromium.launchPersistentContext(dir, { executablePath: CHROME, headless: true, viewport: { width: 1440, height: 900 } });
const page = ctx.pages()[0] || await ctx.newPage();
for (const q of cases) {
  const errors = []; const reqs = [];
  const h1 = (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text()); }; const h2 = (e) => errors.push('pageerror: ' + e.message); const h3 = (r) => { const u = r.url(); if (!u.startsWith('data:') && !u.startsWith('blob:')) reqs.push(u); };
  page.on('console', h1); page.on('pageerror', h2); page.on('request', h3);
  await page.goto(base + q + '&fresh=1');
  await page.waitForFunction(() => window.__studio && window.__studio.ready, null, { timeout: 30000 });
  await page.waitForTimeout(1500);
  const info = await page.evaluate(() => { const S = window.__studio; const T = S.engine.tuning; const f = S.engine.frame; return { mode: T.get('motion.mode'), skin: T.get('skin.id'), dMax: T.get('layout.dMaxPx'), tick: +S.engine.transport.simTau.toFixed(1), zoom: +S.engine.camera.zoom.toFixed(2), tiles: f ? f.tiles.filter((t) => t.life === 'live').length : null }; });
  out.push({ query: q, ...info, consoleErrors: errors.slice(0, 3), requests: reqs.filter((u) => !u.startsWith(base)).length });
  page.off('console', h1); page.off('pageerror', h2); page.off('request', h3);
}
await ctx.close();
console.log(JSON.stringify(out, null, 1));
fs.writeFileSync(path.join(path.dirname(file), 'results', 'url-check-experiments.json'), JSON.stringify({ file: base, generated: new Date().toISOString(), results: out }, null, 1));
