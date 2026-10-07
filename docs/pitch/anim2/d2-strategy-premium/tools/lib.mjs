// tools/lib.mjs - shared by every driver of this folder: a tiny static server over docs/pitch/anim2 (so the page can reach ../../basemap/assets/), real Chrome through playwright-core with its own profile
// under tmp/look-dev/d2-strategy-premium, request and console capture.  Ports: PORT BASE 9860 (server) and 9861.. (Chrome debugging).  Everything is killed by close().
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const D2 = path.resolve(HERE, '..'); export const ANIM2 = path.resolve(D2, '..'); export const REPO = path.resolve(ANIM2, '..', '..', '..');
export const WORK = path.join(REPO, 'tmp', 'look-dev', 'd2-strategy-premium');
export const CHROME = process.env.T0_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
export const PORT = 9860;
export const args = Object.fromEntries(process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => { const i = a.indexOf('='); return i < 0 ? [a.slice(2), '1'] : [a.slice(2, i), a.slice(i + 1)]; }));
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.avif': 'image/avif', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.css': 'text/css' };
export function startServer(port = PORT) {
  const srv = http.createServer((req, res) => {
    const f = path.join(ANIM2, decodeURIComponent(req.url.split('?')[0]));
    if (!f.startsWith(ANIM2)) { res.writeHead(403); res.end(); return; }
    fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); res.end(); } else { res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' }); res.end(d); } });
  });
  return new Promise((resolve) => srv.listen(port, '127.0.0.1', () => resolve({ srv, port, close: () => new Promise((r) => srv.close(r)) })));
}

/** open the built page.  o = { w, h, dpr, query, mobile, cpu, port, profile } -> { page, ctx, errors, requests, url, close } */
export async function launch({ w = 1440, h = 900, dpr = 2, query = '', mobile = false, cpu = 1, port = PORT, profile = 'main', html = 'd2-strategy-premium/dist/battle-studio-premium.html', server = null, inject = true, studio = true } = {}) {
  const own = server || await startServer(port);
  const dir = path.join(WORK, 'chrome-profile', profile + '-' + port); fs.mkdirSync(dir, { recursive: true });
  const ctx = await chromium.launchPersistentContext(dir, { executablePath: CHROME, headless: true, viewport: { width: w, height: h }, deviceScaleFactor: dpr, isMobile: mobile, hasTouch: mobile,
    args: ['--no-first-run', '--disable-extensions', '--disable-sync', '--mute-audio', '--remote-debugging-port=' + (port + 1 + (profile === 'main' ? 0 : 1)), '--enable-precise-memory-info', '--force-color-profile=srgb'] });
  const page = ctx.pages()[0] || await ctx.newPage(); const errors = []; const requests = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text()}`); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('request', (r) => { const u = r.url(); if (!u.startsWith(`http://127.0.0.1:${port}`) && !u.startsWith('data:') && !u.startsWith('blob:')) requests.push(u); });
  if (cpu > 1) { const cdp = await ctx.newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu }); }
  const url = `http://127.0.0.1:${port}/${html}?fresh=1&welcome=0` + (query ? '&' + query : '');
  await page.goto(url); if (studio) await page.waitForFunction(() => window.__studio && window.__studio.ready, null, { timeout: 60000 });
  if (inject && studio) await page.evaluate(() => { const S = window.__studio; const kit = window.__skinKit; let T = 5000; kit.setClock({ now: () => T }); window.__adv = (n = 1, dt = 1000 / 60) => { let f = null; for (let i = 0; i < n; i++) { T += dt; f = S.step(1, dt); } return f; }; window.__T = () => T; });
  return { ctx, page, errors, requests, url, server: own, close: async () => { await ctx.close(); if (!server) await own.close(); } };
}

/** wait until the real ground has no tile loading and nothing fading, then step the engine so the picture is settled */
export async function settle(page, { frames = 90, ms = 20000 } = {}) {
  await page.evaluate(async ({ frames, ms }) => { const bd = globalThis.__realBackdrop; if (bd) await bd.whenIdle(ms); window.__adv(frames); if (bd) await bd.whenIdle(ms); window.__adv(60); }, { frames, ms });
}
