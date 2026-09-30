// Tranche-0 browser test library (chapter 02 WP-T0-18): system Chrome + playwright-core, plus a raw CDP side channel that
//   * injects `Referer: https://gettysburginteractivemap.com/` on Mapbox API/tile requests (page AND dedicated-worker requests)
//     so the production-restricted token works from 127.0.0.1, capped at TILE_CAP requests per session,
//   * stubs Mapbox telemetry (events.mapbox.com) with a 204 so test sessions do not pollute usage numbers,
//   * records every network request of every target (page, workers, service workers) with access tokens masked.
// Everything binds to 127.0.0.1; each session has its own Chrome profile directory and CDP port.
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { createStaticServer } from '../../tools/t0/serve.mjs';

export { createStaticServer };
export const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const AGENT = process.env.T0_AGENT || 't0-core';
export const TMP = path.join(REPO, 'tmp', AGENT);
export const CHROME = process.env.T0_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
export const PORT_BASE = Number(process.env.T0_PORT_BASE || 8300);
export const REFERER = 'https://gettysburginteractivemap.com/';
export const TILE_CAP = Number(process.env.T0_TILE_CAP || 300);
export const VIEWPORTS = JSON.parse(fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'viewports.json'), 'utf8'));
export const ALL_VIEWPORTS = [...VIEWPORTS.portrait, ...VIEWPORTS.landscape];

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export async function waitFor(fn, { timeout = 15000, interval = 100, label = 'condition' } = {}) {
  const t0 = Date.now();
  let last;
  for (;;) {
    try { last = await fn(); if (last) return last; } catch (e) { last = e; }
    if (Date.now() - t0 > timeout) throw new Error(`timeout after ${timeout} ms waiting for ${label}${last instanceof Error ? ` (${last.message})` : ''}`);
    await sleep(interval);
  }
}
export const maskToken = (u) => String(u).replace(/([?&]access_token=)[^&#]+/g, '$1<token>');
const MAPBOX_HOST = /^([a-z0-9-]+\.)*mapbox\.com$/i;
const hostOf = (u) => { try { return new URL(u).hostname; } catch { return ''; } };
export const isMapbox = (u) => MAPBOX_HOST.test(hostOf(u));

// ------------------------------------------------------------------ raw CDP client (browser-level websocket, flat sessions)
class Cdp {
  constructor(ws) {
    this.ws = ws; this.id = 0; this.pending = new Map(); this.handlers = new Map();
    ws.addEventListener('message', (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id) {
        const p = this.pending.get(m.id); if (!p) return; this.pending.delete(m.id);
        if (m.error) p.rej(new Error(`${p.method}: ${m.error.message}`)); else p.res(m.result);
      } else if (m.method) for (const fn of this.handlers.get(m.method) || []) { try { fn(m.params, m.sessionId); } catch (e) { console.error('cdp handler error', m.method, e.message); } }
    });
    ws.addEventListener('close', () => { for (const p of this.pending.values()) p.rej(new Error('cdp socket closed')); this.pending.clear(); });
  }
  static async connect(url) {
    const ws = new WebSocket(url);
    await new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', () => rej(new Error('cdp connect failed'))); });
    return new Cdp(ws);
  }
  send(method, params = {}, sessionId) {
    return new Promise((res, rej) => {
      const id = ++this.id; this.pending.set(id, { res, rej, method });
      this.ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
  }
  on(method, fn) { (this.handlers.get(method) || this.handlers.set(method, []).get(method)).push(fn); }
  close() { try { this.ws.close(); } catch { /* already closed */ } }
}

// ------------------------------------------------------------------ Chrome process
const liveChromes = new Set();
function killTree(pid) { try { spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' }); } catch { /* not windows */ try { process.kill(pid, 'SIGKILL'); } catch { /* gone */ } } }
process.on('exit', () => { for (const p of liveChromes) killTree(p); });
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { for (const p of liveChromes) killTree(p); process.exit(130); });

export async function launchChrome({ profileDir, port, headless = true, size = [1440, 900], extraArgs = [] }) {
  fs.mkdirSync(profileDir, { recursive: true });
  const args = [
    ...(headless ? ['--headless=new'] : []), `--remote-debugging-port=${port}`, '--remote-debugging-address=127.0.0.1', `--user-data-dir=${profileDir}`,
    '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--disable-component-update', '--disable-sync',
    '--disable-features=Translate,MediaRouter,OptimizationHints', '--disable-renderer-backgrounding', '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--mute-audio',
    `--window-size=${size[0]},${size[1]}`, ...extraArgs, 'about:blank',
  ];
  const proc = spawn(CHROME, args, { stdio: 'ignore', detached: false });
  liveChromes.add(proc.pid);
  proc.on('exit', () => liveChromes.delete(proc.pid));
  let info;
  for (let i = 0; i < 100; i++) {
    try { info = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json(); break; } catch { await sleep(200); }
  }
  if (!info) { killTree(proc.pid); throw new Error(`Chrome did not expose CDP on port ${port}`); }
  return { proc, port, wsUrl: info.webSocketDebuggerUrl, version: info.Browser, kill: () => { killTree(proc.pid); } };
}

// ------------------------------------------------------------------ collectors
export class NetLog {
  constructor() { this.entries = []; }
  add(e) { this.entries.push(e); }
  mark() { return this.entries.length; }
  since(m = 0) { return this.entries.slice(m); }
  /** requests (any target) whose URL path matches; `pattern` is a RegExp or string (substring) */
  find(pattern, m = 0) { const re = pattern instanceof RegExp ? pattern : new RegExp(String(pattern).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')); return this.since(m).filter((e) => re.test(e.url)); }
  documents(origin, m = 0) { return this.since(m).filter((e) => e.type === 'Document' && e.url.startsWith(origin) && e.target === 'page'); }
}

export class Collector {
  constructor() { this.errors = []; this.ignored = { tile: 0, telemetry: 0 }; this.badResponses = []; this.failedRequests = []; }
  clear() { this.errors.length = 0; this.badResponses.length = 0; this.failedRequests.length = 0; }
  push(kind, text, extra = {}) { this.errors.push({ kind, text: String(text).slice(0, 400), ...extra }); }
  /** true when a console.error is Mapbox tile/telemetry noise (403 off-domain, capped/blocked requests) */
  tileNoise(text, url) {
    if (url && isMapbox(url)) return true;
    // Mapbox's AJAXError (a minified class such as `el`) is console.error'd with a bundle stack when a tile/style request fails; only
    // tolerated while tile failures are expected (tiles disabled, request cap reached, or a >= 400 answer was seen)
    if (this.tileFailuresExpected && this.tileFailuresExpected() && /^[A-Za-z_$][\w$]{0,3}\n\s+at .*\/assets\/index-\S*\.js/.test(text)) return true;
    return /mapbox/i.test(text) && /(403|401|Forbidden|Failed to load resource|AJAXError|ERR_BLOCKED_BY_CLIENT|Failed to fetch)/i.test(text);
  }
  get firstParty() { return this.errors.filter((e) => e.kind === 'pageerror' || e.kind === 'console.error' || e.kind === 'worker-exception'); }
  assertClean(label = '') {
    if (this.firstParty.length) throw new Error(`${label ? label + ': ' : ''}${this.firstParty.length} uncaught exception(s)/console error(s): ${JSON.stringify(this.firstParty.slice(0, 5))}`);
  }
}

// ------------------------------------------------------------------ session
/** Process-wide Mapbox budget: every session of one test run draws from the same pool (default 300 requests per run). */
export const tileBudget = { cap: TILE_CAP, used: 0, blocked: 0, sessionsBlocked: 0 };

/**
 * openSession({ profile, reset, viewport, onboarded, tiles, initScripts }) -> {chrome, cdp, browser, context, page, net, collector,
 *   tileStats, setTiles, newPage, close}
 *   profile   folder name under tmp/<agent>/chrome-profile/ (each concurrent session needs its own; `reset` wipes it first)
 *   cdpPort   remote-debugging port (PORT_BASE + n; concurrent sessions need different ones)
 *   onboarded pre-seeds localStorage.gtbg_onboarded so the onboarding modal does not cover the map (default true)
 *   tiles     'inject' (default): Mapbox API/tile requests get the production Referer, drawn from `tileBudget`;
 *             'block': no Mapbox request leaves the machine (they fail with BlockedByClient; for tests that do not need a map).
 *             Switchable at any time with session.setTiles(mode).  Mapbox telemetry (events.mapbox.com) is always stubbed.
 */
export async function openSession({ profile = 'default', reset = true, cdpPort = PORT_BASE + 1, headless = true, onboarded = true, tiles = 'inject', viewport = null, initScripts = [] } = {}) {
  const profileDir = path.join(TMP, 'chrome-profile', profile);
  if (reset) fs.rmSync(profileDir, { recursive: true, force: true });
  const chrome = await launchChrome({ profileDir, port: cdpPort, headless, size: viewport ? [viewport.width, viewport.height] : [1440, 900] });
  let cdp = null;
  try {
    cdp = await Cdp.connect(chrome.wsUrl);
    return await attachSession({ chrome, cdp, profileDir, onboarded, tiles, viewport, initScripts });
  } catch (e) {
    try { cdp && cdp.close(); } catch { /* closed */ }
    chrome.kill();
    throw e;
  }
}

async function attachSession({ chrome, cdp, profileDir, onboarded, tiles, viewport, initScripts }) {
  let tileMode = tiles;
  const net = new NetLog();
  const collector = new Collector();
  const tileStats = { seen: 0, referer: 0, blocked: 0, capBlocked: 0, telemetryStubbed: 0, status: {}, skus: new Set(), referers: new Set() };
  const targets = new Map();
  const claimed = new Set();
  const mapboxReq = new Map();                                             // requestId -> true for Mapbox requests (to read the extra-info Referer)
  collector.tileFailuresExpected = () => tileMode !== 'inject' || tileStats.capBlocked > 0 || Object.keys(tileStats.status).some((k) => Number(k) >= 400);
  const patterns = ['https://api.mapbox.com/*', 'https://*.tiles.mapbox.com/*', 'https://events.mapbox.com/*', 'https://*.mapbox.com/*'].map((urlPattern) => ({ urlPattern, requestStage: 'Request' }));

  cdp.on('Network.requestWillBeSent', (p, sid) => {
    const t = targets.get(sid) || {};
    net.add({ t: Date.now(), target: t.type || 'unknown', sid, type: p.type, method: p.request.method, url: maskToken(p.request.url), frameId: p.frameId });
    if (isMapbox(p.request.url)) {
      mapboxReq.set(p.requestId, true);
      const m = /[?&]sku=([^&]+)/.exec(p.request.url); if (m) tileStats.skus.add(m[1]);
    }
  });
  cdp.on('Network.requestWillBeSentExtraInfo', (p) => {
    if (!mapboxReq.has(p.requestId)) return;
    const h = p.headers || {}; const ref = h.Referer || h.referer;
    if (ref) tileStats.referers.add(ref);
  });
  cdp.on('Network.responseReceived', (p) => {
    if (isMapbox(p.response.url)) tileStats.status[p.response.status] = (tileStats.status[p.response.status] || 0) + 1;
  });
  cdp.on('Runtime.exceptionThrown', (p, sid) => {
    const t = targets.get(sid) || {};
    // page exceptions AND uncaught dedicated-worker exceptions (re-fired on the page) come through playwright's pageerror
    if (t.type === 'page' || t.type === 'worker' || !t.type) return;
    const d = p.exceptionDetails;
    collector.push('worker-exception', (d.exception && d.exception.description) || d.text, { target: t.type, url: t.url });
  });
  cdp.on('Fetch.requestPaused', (p, sid) => {
    const url = p.request.url;
    const send = (m, params) => cdp.send(m, params, sid).catch(() => {});
    if (/^https:\/\/events\.mapbox\.com\//i.test(url)) {
      tileStats.telemetryStubbed++;
      return send('Fetch.fulfillRequest', { requestId: p.requestId, responseCode: 204, responseHeaders: [{ name: 'access-control-allow-origin', value: '*' }] });
    }
    if (tileMode !== 'inject') { tileStats.blocked++; return send('Fetch.failRequest', { requestId: p.requestId, errorReason: 'BlockedByClient' }); }
    if (tileBudget.used >= tileBudget.cap) {
      tileStats.capBlocked++; tileBudget.blocked++;
      return send('Fetch.failRequest', { requestId: p.requestId, errorReason: 'BlockedByClient' });
    }
    tileBudget.used++; tileStats.seen++;
    const headers = Object.entries(p.request.headers || {}).filter(([k]) => k.toLowerCase() !== 'referer').map(([name, value]) => ({ name, value }));
    headers.push({ name: 'Referer', value: REFERER });
    tileStats.referer++;
    return send('Fetch.continueRequest', { requestId: p.requestId, headers });
  });
  cdp.on('Target.detachedFromTarget', (p) => targets.delete(p.sessionId));
  cdp.on('Target.attachedToTarget', async ({ sessionId, targetInfo, waitingForDebugger }) => {
    targets.set(sessionId, targetInfo);
    const s = (m, params = {}) => cdp.send(m, params, sessionId).catch(() => {});
    const t = targetInfo.type;
    // All commands are issued back to back (NOT awaited one by one): a paused worker only answers once it is resumed, so the
    // resume must be queued right behind the enables (same pattern as puppeteer).
    const cmds = [];
    const dup = claimed.has(targetInfo.targetId);       // browser-level and page-level auto-attach both report some targets
    claimed.add(targetInfo.targetId);
    if (!dup && ['page', 'iframe', 'worker', 'shared_worker', 'service_worker'].includes(t)) {
      cmds.push(s('Network.enable'), s('Runtime.enable'));
      if (t !== 'service_worker') cmds.push(s('Fetch.enable', { patterns }));
      // dedicated workers (Mapbox vector-tile fetches) are only reachable through their parent page/worker session
      if (t !== 'service_worker') cmds.push(s('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: true, flatten: true }));
    }
    if (waitingForDebugger) cmds.push(s('Runtime.runIfWaitingForDebugger'));
    await Promise.all(cmds);
  });
  await cdp.send('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: true, flatten: true });

  const browser = await chromium.connectOverCDP(`http://127.0.0.1:${chrome.port}`);
  const context = browser.contexts()[0];
  const wired = new WeakSet();
  const wire = async (page) => {
    if (wired.has(page)) return page; wired.add(page);
    page.on('pageerror', (e) => collector.push('pageerror', e.message, { stack: (e.stack || '').split('\n').slice(0, 3).join(' | '), url: page.url() }));
    page.on('console', (m) => {
      if (m.type() !== 'error') return;
      const text = m.text(); const url = m.location().url || '';
      if (collector.tileNoise(text, url)) { collector.ignored.tile++; return; }
      collector.push('console.error', text, { url });
    });
    page.on('requestfailed', (r) => { const u = r.url(); if (!isMapbox(u) && !/^(data|blob):/.test(u)) collector.failedRequests.push({ url: maskToken(u), failure: r.failure() && r.failure().errorText }); });
    page.on('response', (r) => { const u = r.url(); if (r.status() >= 400 && !isMapbox(u)) collector.badResponses.push({ url: u, status: r.status() }); });
    if (onboarded) await page.addInitScript(() => { try { localStorage.setItem('gtbg_onboarded', '1'); } catch { /* storage blocked */ } });
    for (const s of initScripts) await page.addInitScript(s);
    if (viewport) await emulateViewport(page, viewport);
    return page;
  };
  const newPage = async () => wire(await context.newPage());
  const page = context.pages()[0] ? await wire(context.pages()[0]) : await newPage();

  return {
    chrome, cdp, browser, context, page, net, collector, tileStats, profileDir, newPage, wire,
    setTiles(mode) { if (!['inject', 'block'].includes(mode)) throw new Error(`tiles mode must be inject|block, got ${mode}`); tileMode = mode; },
    async close() {
      try { await Promise.race([browser.close(), sleep(3000)]); } catch { /* already gone */ }
      try { await Promise.race([cdp.send('Browser.close'), sleep(1500)]); } catch { /* closing */ }
      cdp.close(); chrome.kill();
    },
  };
}

// ------------------------------------------------------------------ viewport / input helpers (real input through CDP Input.dispatch*)
const cdpSessions = new WeakMap();
export async function cdpFor(page) {
  if (!cdpSessions.has(page)) cdpSessions.set(page, await page.context().newCDPSession(page));
  return cdpSessions.get(page);
}
export async function emulateViewport(page, vp) {
  const c = await cdpFor(page);
  await c.send('Emulation.setDeviceMetricsOverride', { width: vp.width, height: vp.height, deviceScaleFactor: vp.dpr || 1, mobile: !!vp.mobile,
    screenOrientation: vp.width > vp.height ? { type: 'landscapePrimary', angle: 90 } : { type: 'portraitPrimary', angle: 0 } });
  await c.send('Emulation.setTouchEmulationEnabled', vp.mobile ? { enabled: true, maxTouchPoints: 5 } : { enabled: false });
}
export async function mouseDrag(page, [x0, y0], [x1, y1], { steps = 12, button = 'left' } = {}) {
  await page.mouse.move(x0, y0); await page.mouse.down({ button });
  await page.mouse.move(x1, y1, { steps }); await page.mouse.up({ button });
}
export async function wheel(page, x, y, deltaY = -240) { await page.mouse.move(x, y); await page.mouse.wheel(0, deltaY); }
const touch = async (page, type, points) => (await cdpFor(page)).send('Input.dispatchTouchEvent', { type, touchPoints: points.map(([x, y], i) => ({ x, y, id: i })) });
export async function touchTap(page, x, y, holdMs = 50) { await touch(page, 'touchStart', [[x, y]]); await sleep(holdMs); await touch(page, 'touchEnd', []); }
export async function touchSwipe(page, [x0, y0], [x1, y1], { steps = 10, stepMs = 16 } = {}) {
  await touch(page, 'touchStart', [[x0, y0]]);
  for (let i = 1; i <= steps; i++) { await touch(page, 'touchMove', [[x0 + ((x1 - x0) * i) / steps, y0 + ((y1 - y0) * i) / steps]]); await sleep(stepMs); }
  await touch(page, 'touchEnd', []);
}
export async function touchPinch(page, [cx, cy], d0, d1, { steps = 10, stepMs = 16 } = {}) {
  const pts = (d) => [[cx - d / 2, cy], [cx + d / 2, cy]];
  await touch(page, 'touchStart', pts(d0));
  for (let i = 1; i <= steps; i++) { await touch(page, 'touchMove', pts(d0 + ((d1 - d0) * i) / steps)); await sleep(stepMs); }
  await touch(page, 'touchEnd', []);
}
/** elementFromPoint tappability of a selector's first match: { found, w, h, hit, x, y } (hit = the element or a descendant is on top) */
export async function hitTest(page, selector, index = 0) {
  return page.evaluate(([sel, i]) => {
    const el = document.querySelectorAll(sel)[i]; if (!el) return { found: false };
    const r = el.getBoundingClientRect(); const x = r.x + r.width / 2, y = r.y + r.height / 2;
    const top = document.elementFromPoint(x, y);
    return { found: true, w: Math.round(r.width), h: Math.round(r.height), x: Math.round(x), y: Math.round(y), hit: !!top && (top === el || el.contains(top)), inViewport: r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth };
  }, [selector, index]);
}
export async function screenshot(page, name, dir = path.join(TMP, 'shots')) {
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${name}.png`);
  await page.screenshot({ path: file });
  return file;
}

// ------------------------------------------------------------------ app-level helpers
export const rootKids = (page) => page.evaluate(() => { const r = document.getElementById('root'); return r ? r.childElementCount : -1; });
/** true once React replaced the static boot splash (which lives INSIDE #root) with the app and the map canvas exists */
export const appMounted = (page) => page.evaluate(() => !document.getElementById('boot-splash') && !!document.querySelector('#root canvas'));
export const waitForApp = (page, timeout = 30000) => waitFor(() => appMounted(page), { timeout, label: 'app mount (boot splash replaced, map canvas present)' });
/**
 * The legacy app (R0, R1a until group C) asks "Choose Your Experience" on every load and remembers nothing.  Click the requested
 * card when the chooser is showing; a no-op when the app already picked a layout (group C auto-detect, ?layout=).
 * Returns 'clicked' | 'absent'.
 */
export async function chooseLayout(page, which = 'desktop', { timeout = 15000 } = {}) {
  const label = which === 'mobile' ? 'Select Mobile' : 'Select Desktop';
  const chooser = page.getByText('Choose Your Experience');
  const t0 = Date.now(); let mountedSince = 0;
  for (;;) {
    if ((await chooser.count()) > 0) break;
    if (await appMounted(page)) { mountedSince ||= Date.now(); if (Date.now() - mountedSince > 1500) return 'absent'; } else mountedSince = 0;
    if (Date.now() - t0 > timeout) return 'absent';
    await sleep(150);
  }
  await page.getByText(label).first().click();
  await chooser.first().waitFor({ state: 'detached', timeout: 10000 });
  return 'clicked';
}

/**
 * Camera of the Mapbox map, read through React's fiber tree (the app keeps the map in a ref and exposes nothing on window):
 * { center: [lng, lat], zoom, bearing, pitch } or null when no map ref was found.  Real input tests compare before/after.
 */
export const mapView = (page) => page.evaluate(() => {
  const findMap = () => {
    if (window.__t0map && window.__t0map.getCenter) return window.__t0map;
    const root = document.getElementById('root'); if (!root) return null;
    const key = Object.keys(root).find((k) => k.startsWith('__reactContainer$')); if (!key) return null;
    const stack = [root[key]]; let n = 0;
    while (stack.length && n++ < 200000) {
      const f = stack.pop(); if (!f) continue;
      for (let h = f.memoizedState; h && typeof h === 'object' && 'next' in h; h = h.next) {
        const v = h.memoizedState;
        if (v && typeof v === 'object' && v.current && typeof v.current.getCenter === 'function' && typeof v.current.getZoom === 'function') return (window.__t0map = v.current);
      }
      if (f.sibling) stack.push(f.sibling);
      if (f.child) stack.push(f.child);
    }
    return null;
  };
  const m = findMap(); if (!m) return null;
  const c = m.getCenter();
  return { center: [c.lng, c.lat], zoom: m.getZoom(), bearing: m.getBearing(), pitch: m.getPitch() };
});
export const swState = (page) => page.evaluate(async () => {
  const reg = await navigator.serviceWorker.getRegistration();
  return { controller: navigator.serviceWorker.controller ? navigator.serviceWorker.controller.scriptURL : null,
    active: reg && reg.active ? reg.active.scriptURL : null, waiting: !!(reg && reg.waiting), installing: !!(reg && reg.installing), hasReg: !!reg };
});
export const cacheKeys = (page) => page.evaluate(() => caches.keys());

// ------------------------------------------------------------------ tiny test harness
/** throw new Skip('reason') inside a test to mark it skipped (not a failure) */
export class Skip extends Error {}
export function createSuite(name) {
  const tests = [];
  const suite = {
    name,
    test(id, title, fn) { tests.push({ id, title, fn }); },
    async run({ filter, outFile, extra } = {}) {
      const results = [];
      for (const t of tests) {
        if (filter && !new RegExp(filter, 'i').test(t.id)) continue;
        const notes = {};
        const ctx = { note: (k, v) => { notes[k] = v; }, notes };
        const t0 = Date.now();
        let status = 'pass', error = null;
        try { await t.fn(ctx); } catch (e) {
          if (e instanceof Skip) { status = 'skip'; error = e.message; } else { status = 'fail'; error = String(e && e.stack ? e.stack.split('\n').slice(0, 4).join(' | ') : e); }
        }
        results.push({ id: t.id, title: t.title, status, ms: Date.now() - t0, error, notes });
        console.log(`${status === 'pass' ? 'PASS' : status === 'skip' ? 'SKIP' : 'FAIL'}  ${t.id.padEnd(12)} ${t.title}${status === 'pass' ? '' : `\n      ${error}`}`);
        if (Object.keys(notes).length) console.log(`      ${JSON.stringify(notes).slice(0, 600)}`);
      }
      const failed = results.filter((r) => r.status === 'fail').length;
      const skipped = results.filter((r) => r.status === 'skip').length;
      const summary = { suite: name, total: results.length, passed: results.length - failed - skipped, failed, skipped, ...(extra ? extra() : {}), results };
      if (outFile) { fs.mkdirSync(path.dirname(outFile), { recursive: true }); fs.writeFileSync(outFile, JSON.stringify(summary, null, 2) + '\n'); }
      console.log(`${name}: ${summary.passed}/${summary.total} passed${skipped ? `, ${skipped} skipped` : ''}${failed ? `, ${failed} FAILED` : ''}`);
      return summary;
    },
  };
  return suite;
}
export function assert(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed'); }
export function assertEq(a, b, msg) { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${msg || 'not equal'}: got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`); }
