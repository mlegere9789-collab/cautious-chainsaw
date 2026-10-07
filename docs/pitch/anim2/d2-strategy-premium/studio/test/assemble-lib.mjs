// test/assemble-lib.mjs - shared by the real-browser drivers of the assembled page (strips, sweep, bench, shots): playwright-core + the system Chrome, an own profile under tmp/pitch-anim/assemble,
// console and request capture, optional CPU throttle.  The page makes no network request; any request is reported.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const PROTO = path.resolve(HERE, '..'); export const REPO = path.resolve(PROTO, '..', '..', '..', '..', '..');
export const HTML = path.join(PROTO, 'battle-studio.html'); export const WORK = path.join(REPO, 'tmp', 'pitch-anim', 'assemble');
export const CHROME = process.env.T0_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
export const args = Object.fromEntries(process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => { const [k, v] = a.slice(2).split('='); return [k, v ?? '1']; }));

/** open the page.  opts: { w, h, dpr, port, query, cpu, mobile } ; returns { page, ctx, cdp, errors, requests, close } */
export async function launch({ w = 1440, h = 900, dpr = 1, port = 9690, query = '', cpu = 1, mobile = false } = {}) {
  const profile = path.join(WORK, 'chrome-profile', String(port)); fs.mkdirSync(profile, { recursive: true });
  const ctx = await chromium.launchPersistentContext(profile, { executablePath: CHROME, headless: true, viewport: { width: w, height: h }, deviceScaleFactor: dpr, isMobile: mobile, hasTouch: mobile, args: ['--no-first-run', '--disable-extensions', '--disable-sync', '--mute-audio', '--remote-debugging-port=' + (port + 1), '--enable-precise-memory-info'] });
  const page = ctx.pages()[0] || await ctx.newPage(); const errors = []; const requests = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text()}`); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('request', (r) => { const u = r.url(); if (!u.startsWith('file:') && !u.startsWith('data:') && !u.startsWith('blob:')) requests.push(u); });
  const cdp = await ctx.newCDPSession(page); if (cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
  const url = pathToFileURL(HTML).href + '?fresh=1' + (query ? '&' + query : '');
  await page.goto(url); await page.waitForFunction(() => window.__studio && window.__studio.ready, null, { timeout: 30000 });
  return { ctx, page, cdp, errors, requests, url, close: () => ctx.close() };
}
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
