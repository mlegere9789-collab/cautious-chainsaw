// test/browser-check.mjs - drives the BUILT battle-studio.html in real Chrome (playwright-core + the system Chrome, own profile, no network): load, console, requests, playback, metrics, screenshots.
//   node docs/pitch/anim/prototype/test/browser-check.mjs [--scene=fresh2] [--zoom=15] [--speed=4] [--secs=6] [--viewport=1440x900] [--dpr=1] [--cpu=1] [--shot=name] [--mode=dynamics] [--vis=carry] [--out=json]
// Exit code 1 when the page logs an error, requests anything but the file, shows an overlap or an unrepresented unit.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROTO = path.resolve(HERE, '..'); const REPO = path.resolve(PROTO, '..', '..', '..', '..');
const args = Object.fromEntries(process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => { const [k, v] = a.slice(2).split('='); return [k, v ?? '1']; }));
const [VW, VH] = (args.viewport || '1440x900').split('x').map(Number); const DPR = +(args.dpr || 1); const CPU = +(args.cpu || 1);
const SECS = +(args.secs || 6); const PORT = +(args.port || 9622);
const CHROME = process.env.T0_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PROFILE = path.join(REPO, 'tmp', 'pitch-anim', 'studio', 'chrome-profile', String(PORT)); fs.mkdirSync(PROFILE, { recursive: true });
const SHOTS = path.join(PROTO, 'shots'); fs.mkdirSync(SHOTS, { recursive: true });

const q = new URLSearchParams({ fresh: '1' });
for (const k of ['scene', 'zoom', 'speed', 'mode', 'vis', 'skin', 'tune', 'metrics', 'tick', 'backdrop', 'set']) if (args[k]) q.set(k, args[k]);
if (args.play !== '0') q.set('play', '1');
const url = pathToFileURL(path.join(PROTO, 'battle-studio.html')).href + '?' + q.toString();

const ctx = await chromium.launchPersistentContext(PROFILE, { executablePath: CHROME, headless: true, viewport: { width: VW, height: VH }, deviceScaleFactor: DPR, args: ['--no-first-run', '--disable-extensions', '--disable-sync', '--mute-audio', '--remote-debugging-port=' + (PORT + 1)] });
const result = { url: 'battle-studio.html?' + q.toString(), viewport: [VW, VH], dpr: DPR, cpu: CPU, errors: [], requests: [] };
try {
  const page = ctx.pages()[0] || await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') result.errors.push(`${m.type()}: ${m.text()}`); });
  page.on('pageerror', (e) => result.errors.push('pageerror: ' + e.message));
  page.on('request', (r) => { if (!r.url().startsWith('file:') && !r.url().startsWith('data:') && !r.url().startsWith('blob:')) result.requests.push(r.url()); });
  const cdp = await ctx.newCDPSession(page); if (CPU > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });
  await page.goto(url); await page.waitForFunction(() => window.__studio && window.__studio.ready, null, { timeout: 20000 });
  await page.waitForTimeout(400);
  if (args.shot0) await page.screenshot({ path: path.join(SHOTS, args.shot0 + '.png') });
  await page.evaluate(() => window.__studio.engine.metrics.reset());
  await page.waitForTimeout(SECS * 1000);
  const out = await page.evaluate(() => {
    const e = window.__studio.engine; const f = e.frame;
    return { summary: e.metrics.summary(), tick: f.tick, tiles: f.tiles.length, live: f.tiles.filter((t) => t.life === 'live').length, onField: f.onField, zoom: f.zoom, textSource: e.text.source, clock: f.clock.label, dpr: devicePixelRatio, ua: navigator.userAgent, frames: window.__studio.frames };
  });
  Object.assign(result, out);
  if (args.shot) await page.screenshot({ path: path.join(SHOTS, args.shot + '.png') });
} catch (e) { result.errors.push('driver: ' + (e.stack || e)); } finally { await ctx.close(); }

const s = result.summary || {};
console.log(JSON.stringify({ ...result, summary: undefined }, null, 1));
console.log('summary', JSON.stringify(s));
if (args.out) fs.writeFileSync(path.resolve(args.out), JSON.stringify(result, null, 1));
const bad = result.errors.length || result.requests.length || (s.overlapPairs || 0) > 0 || (s.unrepresentedUnitFrames || 0) > 0;
if (bad) { console.error('FAILED: errors ' + result.errors.length + ', external requests ' + result.requests.length + ', overlapPairs ' + s.overlapPairs + ', unrepresented ' + s.unrepresentedUnitFrames); process.exit(1); }
console.log('ok');
