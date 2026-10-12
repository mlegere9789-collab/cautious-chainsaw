// tools/lib.mjs - the shared driver of every picture and check: a static server over docs/pitch/anim2 (so the page finds ../../basemap/assets/), real Chrome through playwright-core with a
// profile under tmp/look-dev/d4-editorial/, and the helpers that bring the page to a settled, deterministic frame (?manual=1: only studio.step() advances the engine).
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(HERE, '..');                            // docs/pitch/anim2/d4-editorial
export const REPO = path.resolve(ROOT, '..', '..', '..', '..');
export const PORT = +(process.env.D4_PORT || 10000);
export const CHROME = process.env.D4_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const TYPES = { '.html': 'text/html; charset=utf-8', '.mjs': 'text/javascript', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.avif': 'image/avif', '.woff2': 'font/woff2', '.css': 'text/css' };
export function serve(port = PORT) {
  const base = path.resolve(ROOT, '..');                                  // docs/pitch/anim2
  const srv = http.createServer((req, res) => {
    const f = path.join(base, decodeURIComponent(req.url.split('?')[0])); if (!f.startsWith(base)) { res.writeHead(403); res.end(); return; }
    fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); res.end(); } else { res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' }); res.end(d); } });
  });
  return new Promise((ok) => srv.listen(port, '127.0.0.1', () => ok(srv)));
}
export const PAGE = (port = PORT) => `http://127.0.0.1:${port}/d4-editorial/dist/battle-studio.html`;
export async function launch({ width = 1440, height = 900, dpr = 2, profile = 'chrome-profile', mobile = false, port = PORT } = {}) {
  const dir = path.join(REPO, 'tmp', 'look-dev', 'polish-d4-editorial', profile + `-${port}-${width}x${height}x${dpr}`); fs.mkdirSync(dir, { recursive: true });
  const ctx = await chromium.launchPersistentContext(dir, { executablePath: CHROME, headless: true, viewport: { width, height }, deviceScaleFactor: dpr, isMobile: mobile, hasTouch: mobile, args: ['--no-first-run', '--disable-extensions', '--mute-audio', '--force-color-profile=srgb', '--remote-debugging-port=' + (port + 5)] });
  const page = ctx.pages()[0] || await ctx.newPage(); const errors = []; const reqs = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); }); page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('request', (r) => { const u = r.url(); if (!u.startsWith(`http://127.0.0.1:${port}`) && !u.startsWith('data:') && !u.startsWith('blob:')) reqs.push(u); });
  return { ctx, page, errors, reqs, close: () => ctx.close() };
}
/** open the page at a state and bring it to rest.  q = query string without '?'.  Returns the frame summary. */
export async function open(page, q, { port = PORT, steps = 150, idleMs = 30000 } = {}) {
  await page.goto(`${PAGE(port)}?manual=1&welcome=0&fresh=1&${q}`);
  await page.waitForFunction(() => window.__studio && window.__studio.ready, null, { timeout: 60000 });
  await page.evaluate(async (ms) => { const b = globalThis.__realBackdrop; const S = window.__studio; if (b) { for (let i = 0; i < 400 && b.pending(); i++) { S.step(1, 16.7); await new Promise((r) => setTimeout(r, 25)); } for (let i = 0; i < 600; i++) { const busy = (b.aerial && !b.aerial.idle()) || (b.shade && !b.shade.idle()) || b.animating; if (!busy) break; S.step(1, 16.7); await new Promise((r) => setTimeout(r, 20)); } } }, idleMs);
  return settle(page, steps);
}
export async function settle(page, steps = 150) {
  return page.evaluate(async (n) => {
    const S = window.__studio; const kit = window.__skinKit; let T = (window.__T || 5000);
    if (kit && !window.__clockSet) { kit.setClock({ now: () => window.__T }); window.__clockSet = true; }
    for (let i = 0; i < n; i++) { T += 1000 / 60; window.__T = T; S.step(1, 1000 / 60); if (globalThis.__realBackdrop && i % 20 === 0) await new Promise((r) => setTimeout(r, 0)); }
    window.__T = T; const f = S.engine.frame; return { tick: f.tick, zoom: +f.zoom.toFixed(2), tiles: f.tiles.filter((t) => t.life === 'live').length, onField: f.onField, overlaps: f.overlaps, unrep: f.unrepresented };
  }, steps);
}
export const stepMs = (page, n, dtMs = 1000 / 60) => page.evaluate(({ n, dtMs }) => { const S = window.__studio; let T = window.__T || 5000; for (let i = 0; i < n; i++) { T += dtMs; window.__T = T; S.step(1, dtMs); } window.__T = T; return S.engine.frame.tick; }, { n, dtMs });
