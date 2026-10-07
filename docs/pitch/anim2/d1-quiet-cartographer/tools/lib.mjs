// tools/lib.mjs - the picture-taking harness: playwright-core + the system Chrome, an own profile under tmp/look-dev/d1-quiet-cartographer, the static server on our port range (9840..9849),
// deterministic frames (?manual=1: only studio.step() advances the engine, the skin kit's clock is injected) and a "settle" that waits for every aerial tile and font.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { serve } from './serve.mjs';

export const HERE = path.dirname(fileURLToPath(import.meta.url)); export const D1 = path.resolve(HERE, '..'); export const REPO = path.resolve(D1, '..', '..', '..', '..');
export const CHROME = process.env.T0_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
export const PORT = 9840; export const TMP = path.join(REPO, 'tmp', 'look-dev', 'd1-quiet-cartographer');
export const args = Object.fromEntries(process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => { const i = a.indexOf('='); return i < 0 ? [a.slice(2), '1'] : [a.slice(2, i), a.slice(i + 1)]; }));
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let server = null;
export async function startServer(port = PORT) { if (!server) server = await serve(port); return server; }
export async function stopServer() { if (server) { server.close(); server = null; } }

/** open the page.  opts: { w, h, dpr, query, mobile, port, profile, cpu } -> { page, ctx, errors, requests, close } */
export async function open({ w = 1440, h = 900, dpr = 2, query = '', mobile = false, port = PORT, profile = 'main', cpu = 1, manual = true } = {}) {
  await startServer(port);
  const dir = path.join(TMP, 'profile-' + profile + '-' + port); fs.mkdirSync(dir, { recursive: true });
  const ctx = await chromium.launchPersistentContext(dir, { executablePath: CHROME, headless: true, viewport: { width: w, height: h }, deviceScaleFactor: dpr, isMobile: mobile, hasTouch: mobile, args: ['--no-first-run', '--disable-extensions', '--disable-sync', '--mute-audio', '--force-color-profile=srgb', '--font-render-hinting=none'] });
  const page = ctx.pages()[0] || await ctx.newPage(); const errors = []; const requests = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text()}`); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('request', (r) => { const u = r.url(); if (!u.startsWith(`http://127.0.0.1:${port}/`) && !u.startsWith('data:') && !u.startsWith('blob:')) requests.push(u); });
  if (cpu > 1) { const cdp = await ctx.newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu }); }
  const url = `http://127.0.0.1:${port}/d1-quiet-cartographer/quiet-cartographer.html?fresh=1&welcome=0` + (manual ? '&manual=1' : '') + (query ? '&' + query : '');
  await page.goto(url); await page.waitForFunction(() => window.__studio && window.__studio.ready, null, { timeout: 60000 });
  if (manual) await page.evaluate(() => { globalThis.__qcManual = true; });
  return { ctx, page, errors, requests, url, close: () => ctx.close() };
}

/** put the studio into a scene: tick, camera (lat, lng, zoom), optional pixel shift of the centre, selection, popups on or off.  Settles the picture (tiles, fonts, glides) before returning. */
export async function setScene(page, { tick, lat, lng, zoom, shift = [0, 0], select = null, popups = false, steps = 150, style = null, variant = 'standard', after = null, safe = false, hostSelect = null, tokens = null }) {
  await page.evaluate(({ tick, lat, lng, zoom, shift, select, popups, style, variant, safe, hostSelect, tokens }) => {
    const S = window.__studio; const E = S.engine; const K = window.__skinKit; let T = 5000; globalThis.__T = () => T; K.setClock({ now: () => T });
    globalThis.__advance = (n, dt = 1000 / 60) => { let f = null; for (let i = 0; i < n; i++) { T += dt; f = S.step(1, dt); } return f; };
    if (style) S.ui.chooseStyle(style, variant);
    E.tuning.set('popup.enabled', !!popups); if (tokens) for (const [k, v] of Object.entries(tokens)) E.tuning.set(k, v);
    E.select(null); E.transport.pause(); E.transport.seek(tick, { glide: false });
    E.moveTo({ lat, lng, zoom }, { glide: false, safe });
    if (shift[0] || shift[1]) E.panBy(shift[0], shift[1]);
    if (select) { E.select(select); }
    if (hostSelect) { S.host.setSelected(hostSelect); }
  }, { tick, lat, lng, zoom, shift, select, popups, style, variant, safe, hostSelect, tokens });
  await page.evaluate(() => document.fonts.ready); await page.waitForFunction(() => globalThis.__fontsReady === true, null, { timeout: 20000 }).catch(() => {});
  for (let k = 0; k < 6; k++) { await page.evaluate((n) => globalThis.__advance(n), Math.round(steps / 6)); await page.evaluate(() => globalThis.__ground.whenIdle(20000)); }
  await page.evaluate((n) => globalThis.__advance(n), 20);
  if (after) await after(page);
}
export const shot = async (page, file, opts = {}) => { fs.mkdirSync(path.dirname(file), { recursive: true }); await page.screenshot({ path: file, ...opts }); return file; };
