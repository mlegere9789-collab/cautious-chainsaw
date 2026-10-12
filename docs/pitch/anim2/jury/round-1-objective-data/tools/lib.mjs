// lib.mjs - harness for the objective checks: static server over docs/pitch/anim2 (PORT 9960), real Chrome via playwright-core, own profile under tmp/look-dev/objective.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const REPO = path.resolve(HERE, '..', '..', '..', '..');
export const SNAP_COMMIT = '6628412';
export const ANIM2 = path.join(HERE, 'snap', 'docs', 'pitch', 'anim2');   // a git-archive of docs/pitch/anim2 at commit 9db3f4b (the tree the jury judged); the working tree is being edited by other agents
export const PORT = 10200;
export const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const MIME = { '.html': 'text/html; charset=utf-8', '.mjs': 'text/javascript', '.js': 'text/javascript', '.json': 'application/json', '.avif': 'image/avif', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.woff': 'font/woff', '.css': 'text/css' };
export function serve(port = PORT) {
  const srv = http.createServer((req, res) => {
    const f = path.join(ANIM2, decodeURIComponent(req.url.split('?')[0]));
    if (!f.startsWith(ANIM2)) { res.writeHead(403); res.end(); return; }
    fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); res.end(); } else { res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' }); res.end(d); } });
  });
  return new Promise((ok) => { srv.on('error', (e) => { if (e.code === 'EADDRINUSE') ok({ close() {} }); else throw e; }); srv.listen(port, '127.0.0.1', () => ok(srv)); });
}
// the four directions: page, default look query, extra looks
export const DIRS = {
  d1: { name: 'D1 Quiet Cartographer', html: 'd1-quiet-cartographer/quiet-cartographer.html', base: 'fresh=1&welcome=0&manual=1', looks: { day: '', night: 'style=night' }, primary: 'day' },
  d4: { name: 'D4 Dispatch', html: 'd4-editorial/dist/battle-studio.html', base: 'fresh=1&welcome=0&manual=1', looks: { paper: 'style=dispatch-paper', aerial: 'style=dispatch-aerial' }, primary: 'paper' },
};
export async function launch({ w = 1440, h = 900, dpr = 2, mobile = false, profile = 'p', cpu = 1, init = null } = {}) {
  const dir = path.join(REPO, 'tmp', 'look-dev', 'objective', 'r1', 'profile-' + profile + '-' + process.pid); fs.mkdirSync(dir, { recursive: true });
  const ctx = await chromium.launchPersistentContext(dir, { executablePath: CHROME, headless: true, viewport: { width: w, height: h }, deviceScaleFactor: dpr, isMobile: mobile, hasTouch: mobile, args: ['--no-first-run', '--disable-extensions', '--disable-sync', '--mute-audio', '--force-color-profile=srgb', '--font-render-hinting=none'] });
  const page = ctx.pages()[0] || await ctx.newPage(); const errors = []; const external = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); }); page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('request', (r) => { const u = r.url(); if (!u.startsWith(`http://127.0.0.1:${PORT}/`) && !u.startsWith('data:') && !u.startsWith('blob:')) external.push(u); });
  if (init) await page.addInitScript(init);
  if (cpu > 1) { const cdp = await ctx.newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu }); }
  return { ctx, page, errors, external, close: () => ctx.close() };
}
import crypto from 'node:crypto';
const verified = new Set();
export async function verifyServed(dir) {          // the page the server hands out must be byte-identical to the snapshot of commit 9db3f4b
  if (verified.has(dir)) return; const f = path.join(ANIM2, DIRS[dir].html); const want = crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
  const got = await new Promise((ok, no) => http.get(`http://127.0.0.1:${PORT}/${DIRS[dir].html}`, (r) => { const h = crypto.createHash('sha256'); r.on('data', (d) => h.update(d)); r.on('end', () => ok(h.digest('hex'))); }).on('error', no));
  if (got !== want) throw new Error('served page of ' + dir + ' is not the snapshot (port ' + PORT + ' answered by another server?)'); verified.add(dir);
}
export async function openDir(page, dir, look, extra = '', { manual = true } = {}) {
  await verifyServed(dir);
  const D = DIRS[dir]; const q = [manual ? D.base : D.base.replace('&manual=1', ''), D.looks[look] || '', extra].filter(Boolean).join('&');
  await page.goto(`http://127.0.0.1:${PORT}/${D.html}?${q}`);
  await page.waitForFunction(() => window.__studio && window.__studio.ready, null, { timeout: 90000 });
  if (!manual) return;
  await page.evaluate(() => { const S = window.__studio; const kit = window.__skinKit; let T = 5000; if (kit && kit.setClock) kit.setClock({ now: () => T }); window.__adv = (n = 1, dt = 1000 / 60) => { let f = null; for (let i = 0; i < n; i++) { T += dt; f = S.step(1, dt); } return f; }; window.__T = () => T; });
}
