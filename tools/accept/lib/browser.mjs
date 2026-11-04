// tools/accept/lib/browser.mjs - thin layer over the project's own browser harness (tests/t0/lib.mjs): system Chrome, one brand-new profile per
// session, the Referer-injecting Mapbox side channel with a per-run tile cap, real CDP input.  Nothing in tests/t0 is modified; the harness
// derives its scratch/profile directory from T0_AGENT, so a relative path from <repo>/tmp to our throw-away temp dir makes every Chrome profile
// live in that dir (never in the repository).
import path from 'node:path';
import { REPO } from './util.mjs';

let libPromise = null;
export function initLib({ scratchRoot, portBase, tileCap }) {
  if (libPromise) return libPromise;
  process.env.T0_AGENT = path.relative(path.join(REPO, 'tmp'), scratchRoot);
  process.env.T0_PORT_BASE = String(portBase);
  process.env.T0_TILE_CAP = String(tileCap);
  libPromise = import('../../../tests/t0/lib.mjs');
  return libPromise;
}

/** a session manager: unique CDP port and brand-new profile per session, tracked so everything is closed at the end */
export class Sessions {
  constructor(lib, portBase) { this.lib = lib; this.portBase = portBase; this.seq = 0; this.open = new Set(); this.allSkus = new Set(); }
  async create(opts = {}) {
    const lib = this.lib;
    let lastErr;
    for (let attempt = 1; attempt <= 3; attempt++) {
      const n = ++this.seq;
      const port = this.portBase + 10 + (n % 60);
      try {
        const s = await lib.openSession({ profile: `${opts.profile || 's'}-${n}`, reset: true, cdpPort: port, headless: true, onboarded: opts.onboarded ?? true, tiles: opts.tiles || 'block', viewport: opts.viewport || null, initScripts: opts.initScripts || [] });
        this.open.add(s); s.__closeOrig = s.close.bind(s);
        s.close = async () => { this.open.delete(s); for (const k of s.tileStats.skus) this.allSkus.add(k); await s.__closeOrig(); };
        s.chromeVersion = s.chrome.version;
        return s;
      } catch (e) { lastErr = e; await lib.sleep(1500); }
    }
    throw lastErr;
  }
  async closeAll() { for (const s of [...this.open]) { try { await s.close(); } catch { /* gone */ } } }
}

/** Collects EVERYTHING a user could see go wrong on a page: console error/warning, uncaught exceptions, failed and >=400 requests, crashes, CSP report-only violations.
 *  Mapbox tile/telemetry failures are counted separately as `mapboxNoise` while tiles are deliberately blocked or capped (never hidden: they are in the metrics). */
export function watchPage(page, lib, { expectStatus = {}, getTileMode = () => 'inject', capped = () => false, ignoreAborted = false } = {}) {
  const w = { console: [], pageerrors: [], failed: [], bad: [], crashes: [], mapboxNoise: 0, ignoredTelemetry: 0, csp: [] };
  const isMb = (u) => { try { return /(^|\.)mapbox\.com$/i.test(new URL(u).hostname); } catch { return false; } };
  const tileNoiseOk = () => getTileMode() !== 'inject' || capped();
  page.on('console', async (m) => {
    const type = m.type(); if (type !== 'error' && type !== 'warning') return;
    const text = m.text(); const url = (m.location() && m.location().url) || '';
    { const mm = /status of (\d{3})/.exec(text); if (mm && url) { try { if (expectStatus[new URL(url).pathname] === Number(mm[1])) return; } catch { /* bad url */ } } }
    if (/\[Report Only\]/i.test(text)) { w.csp.push({ type, text: text.slice(0, 300), url }); return; }
    if (isMb(url) || (/mapbox/i.test(text) && /(403|401|Forbidden|Failed to load resource|AJAXError|BLOCKED_BY_CLIENT|Failed to fetch)/i.test(text))) { if (tileNoiseOk()) { w.mapboxNoise++; return; } }
    if (/ERR_BLOCKED_BY_CLIENT/.test(text) && tileNoiseOk()) { w.mapboxNoise++; return; }
    // Mapbox's AJAXError is console.error'd with a bundle stack and no URL when a tile/style fetch fails
    if (tileNoiseOk() && /^[A-Za-z_$][\w$]{0,3}\n\s+at .*\/assets\/index-\S*\.js/.test(text)) { w.mapboxNoise++; return; }
    // Mapbox's default error handler console.error's a plain Error('Failed to fetch https://api.mapbox.com/...') for a glyph/style request that the run blocks or caps on purpose;
    // the console text is just "Error" (five letters: longer than the minified AJAXError class names matched above), so read the error's message from the argument.
    if (tileNoiseOk() && type === 'error' && /^Error$/.test(text) && m.args().length === 1) {
      const msg = await m.args()[0].evaluate((e) => (e && typeof e.message === 'string' ? e.message : '')).catch(() => '');
      if (/^Failed to fetch https:\/\/(api|events)\.mapbox\.com\//.test(msg)) { w.mapboxNoise++; return; }
    }
    w.console.push({ type, text: text.slice(0, 400), url, line: m.location() && m.location().lineNumber });
  });
  page.on('pageerror', (e) => w.pageerrors.push({ message: String(e.message).slice(0, 400), stack: (e.stack || '').split('\n').slice(0, 3).join(' | '), url: page.url() }));
  page.on('requestfailed', (r) => { const u = r.url(); if (/^(data|blob):/.test(u)) return; if (r.failure() && /ERR_ABORTED/.test(r.failure().errorText) && (isMb(u) || ignoreAborted)) { w.abortedIgnored = (w.abortedIgnored || 0) + 1; return; } if (isMb(u) && tileNoiseOk()) { w.mapboxNoise++; return; } w.failed.push({ url: lib.maskToken(u), failure: r.failure() && r.failure().errorText }); });
  page.on('response', (r) => { const u = r.url(); const st = r.status(); if (st < 400 || isMb(u)) return; const ok = expectStatus[new URL(u).pathname]; if (ok === st) return; w.bad.push({ url: u, status: st }); });
  page.on('crash', () => w.crashes.push({ at: Date.now(), url: page.url() }));
  page.on('close', () => { w.closed = true; });
  return w;
}
export const watchDefects = (w) => [
  ...w.console.map((c) => ({ code: `console-${c.type}`, detail: `${c.text}${c.url ? ' @ ' + c.url + (c.line ? ':' + c.line : '') : ''}` })),
  ...w.pageerrors.map((e) => ({ code: 'pageerror', detail: `${e.message} ${e.stack}` })),
  ...w.failed.map((f) => ({ code: 'request-failed', detail: `${f.url} ${f.failure}` })),
  ...w.bad.map((b) => ({ code: 'http-error', detail: `${b.status} ${b.url}` })),
  ...w.crashes.map(() => ({ code: 'page-crash', detail: 'renderer crashed' })),
  ...w.csp.map((c) => ({ code: 'csp-report-only-violation', detail: c.text })),
];

/** the page's own settle: load event, fonts, two animation frames, then `ms` of quiet */
export async function settle(page, ms = 800) {
  await page.waitForLoadState('load', { timeout: 4000 }).catch(() => {});   // short: a page restored from the back/forward cache never fires 'load' again
  await page.evaluate(() => (document.fonts && document.fonts.ready ? document.fonts.ready.then(() => true) : true)).catch(() => {});
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))).catch(() => {});
  await new Promise((r) => setTimeout(r, ms));
}
