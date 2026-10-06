// test/soak.mjs - a soak of the BUILT page in real Chrome: the real rAF loop at 8x with a scene jump every 30 s, the JS heap sampled after a forced GC every 10 s (a leak would show as growth),
// frame pacing and the guarantees checked throughout.   node docs/pitch/anim/prototype/test/soak.mjs [--secs=100] [--speed=8] [--port=9628]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const HERE = path.dirname(fileURLToPath(import.meta.url)); const PROTO = path.resolve(HERE, '..'); const REPO = path.resolve(PROTO, '..', '..', '..', '..');
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? '1']; }));
const SECS = +(args.secs || 100); const SPEED = +(args.speed || 8); const PORT = +(args.port || 9628);
const PROFILE = path.join(REPO, 'tmp', 'pitch-anim', 'studio', 'chrome-profile', 'soak'); fs.mkdirSync(PROFILE, { recursive: true });
const ctx = await chromium.launchPersistentContext(PROFILE, { executablePath: process.env.T0_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, viewport: { width: 1440, height: 900 }, args: ['--no-first-run', '--js-flags=--expose-gc', '--remote-debugging-port=' + PORT] });
const page = ctx.pages()[0] || await ctx.newPage(); const errs = [];
page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
await page.goto(pathToFileURL(path.join(PROTO, 'battle-studio.html')).href + `?fresh=1&scene=fresh2&zoom=15&speed=${SPEED}&play=1&metrics=1`);
await page.waitForFunction(() => window.__studio && window.__studio.ready);
const heap = []; let bad = 0; let last = null;
for (let i = 0; i < Math.floor(SECS / 10); i++) {
  await page.waitForTimeout(10000);
  last = await page.evaluate((i) => {
    if (window.gc) window.gc(); const e = window.__studio.engine; const s = e.metrics.summary();
    if (i % 3 === 2) { const sc = e.battle.ds.scenes; e.sceneJump(sc[(i * 3) % sc.length]); e.transport.play(); }
    return { heapMB: +(performance.memory.usedJSHeapSize / 1048576).toFixed(1), frames: s.frames, fps: s.fpsMean, over20Pct: s.framesOver20msPct, overlapPairs: s.overlapPairs, unrepresented: s.unrepresentedUnitFrames, tick: e.frame.tick, tiles: e.frame.tiles.length };
  }, i);
  heap.push(last.heapMB); console.log(`${(i + 1) * 10} s`, JSON.stringify(last)); if (last.overlapPairs || last.unrepresented) bad++;
}
const growth = heap.length > 2 ? heap[heap.length - 1] - heap[1] : 0;
console.log(`heap after forced GC: ${heap.join(' ')} MB; growth over the run ${growth.toFixed(1)} MB; console errors ${errs.length}`);
await ctx.close();
if (errs.length || bad || growth > 15) { console.error('FAILED: errors ' + errs.length + ', guarantee violations ' + bad + ', heap growth ' + growth); process.exit(1); }
console.log('ok');
