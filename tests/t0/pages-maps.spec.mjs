// T0-PG-* acceptance for WP-T0-13 (map sub-pages: non-blocking Mapbox, PeerJS on demand) and WP-T0-14 (og card, manifest, icons, GSC file).
// Real system Chrome (tests/t0/lib.mjs), a Netlify-like static server on 127.0.0.1 and a "lab" server that can delay the Mapbox
// library.  Mapbox tile/style requests go through the harness Referer injection and share ONE budget per run (default 300).
//
//   node tests/t0/pages-maps.spec.mjs                              release/R1a/dist (build it first: python tools/t0/build.py --train R1a)
//   node tests/t0/pages-maps.spec.mjs --dist tmp/t0-maps/R1a/dist  any built tree
//   node tests/t0/pages-maps.spec.mjs --filter 'PG-0[12]'          subset by id regex
//   node tests/t0/pages-maps.spec.mjs --dist legacy/dist --expect-red --filter 'PG-0[1256]|PG-08'   red-first proof on the legacy tree
//   node tests/t0/pages-maps.spec.mjs --online                     also re-fetch the third-party files and compare their SRI hashes
//   node tests/t0/pages-maps.spec.mjs --perf [--reps 3] [--end 20000] [--variants legacy=legacy/dist,nomaps=<dir>,full=<dir>] [--live]
//                                                                  Lighthouse-like lab timing (see runPerf); results in tmp/t0-maps/perf*.json
//
// Env: T0_AGENT=t0-maps  T0_PORT_BASE=8400 (static server = base, CDP ports base+1..3, lab servers base+5..9)  T0_TILE_CAP=300
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import zlib from 'node:zlib';
import { spawnSync } from 'node:child_process';
import * as acorn from 'acorn';
import { treeHas, loadOracle } from './lib_clock.mjs';

// this agent's scratch dir, ports and Chrome profiles are fixed unless the caller overrides them (lib.mjs reads the env at import time)
process.env.T0_AGENT ??= 't0-maps';
process.env.T0_PORT_BASE ??= '8400';
const {
  REPO, TMP, PORT_BASE, openSession, createStaticServer, createSuite, assert, assertEq, sleep, waitFor, tileBudget, cdpFor,
} = await import('./lib.mjs');

const argv = process.argv.slice(2);
const opt = (name, dflt) => { const i = argv.indexOf(`--${name}`); return i >= 0 ? (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true) : dflt; };
const DIST = path.resolve(REPO, opt('dist', 'release/R1a/dist'));
const CLOCK_TREE = treeHas(DIST, 'CLOCK');
const IMG_TREE = fs.existsSync(path.join(DIST, 'og', 'gettysburg-card.jpg')) && !fs.existsSync(path.join(DIST, 'og', 'card-r1.png'));   // IMG replaced the generated card, icons and screenshots by photographs
const FILTER = opt('filter', null);
const EXPECT_RED = !!opt('expect-red', false);
const ONLINE = !!opt('online', false);
const PERF = !!opt('perf', false);
const IS_LEGACY = path.resolve(DIST) === path.resolve(REPO, 'legacy/dist');
if (!fs.existsSync(DIST)) { console.error(`dist not found: ${DIST}\nbuild it first: python tools/t0/build.py --train R1a`); process.exit(2); }

const TOOLS = path.join(REPO, 'tools', 't0', 'assets-src');
const SRI = JSON.parse(fs.readFileSync(path.join(TOOLS, 'sri.json'), 'utf8'));
const VENDOR = path.join(TMP, 'vendor');
const MAP_PAGES = ['camera', 'cinematic-export', 'compare', 'ground-remembers', 'immersive', 'sandbox', 'viewshed', 'watch-together'];
const EXPECT_MAPS = { compare: 2 };
const MB_URL = 'https://api.mapbox.com/mapbox-gl-js/v3.24.1/';
const VP = { width: 800, height: 600 };

// ------------------------------------------------------------------ helpers
const readDist = (rel) => fs.readFileSync(path.join(DIST, rel), 'utf8');
const sriOf = (buf) => `sha384-${crypto.createHash('sha384').update(buf).digest('base64')}`;
const median = (a) => { const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length ? (s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2) : null; };

/** the vendor copies used by the lab server: byte-identical to the CDN files (SRI checked), fetched read-only once into tmp/<agent>/vendor */
async function ensureVendor() {
  fs.mkdirSync(VENDOR, { recursive: true });
  for (const [key, file] of [['mapbox-gl.js', 'mapbox-gl.js'], ['mapbox-gl.css', 'mapbox-gl.css']]) {
    const p = path.join(VENDOR, file);
    if (!fs.existsSync(p)) {
      const res = await fetch(SRI[key].url);
      assert(res.ok, `could not fetch ${SRI[key].url}: ${res.status}`);
      fs.writeFileSync(p, Buffer.from(await res.arrayBuffer()));
    }
    assertEq(sriOf(fs.readFileSync(p)), SRI[key].integrity, `vendor ${file} must be byte-identical to the pinned CDN file`);
  }
}

/**
 * Lab server: serves a dist like Netlify would (pretty URLs, gzip for text) but rewrites the absolute Mapbox GL URLs in HTML to
 * /__vendor/ (local, byte-identical, SRI attributes untouched) so the library's arrival time is under test control
 * (vendorDelayMs, script only).  Nothing leaves the machine.  `edits` maps a path to {from, edit(text)} to serve a modified copy of a page.
 */
function createLab({ root, port }) {
  let rootDir = path.resolve(root);
  const state = { vendorDelayMs: 0, requests: [], edits: new Map() };
  const gzCache = new Map();
  const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8' };
  const compressible = (t) => /^(text|application\/(json|xml|javascript))|svg/.test(t);
  const send = (req, res, status, body, type, extra = {}) => {
    const headers = { 'content-type': type, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', ...extra };
    if (compressible(type) && /\bgzip\b/.test(req.headers['accept-encoding'] || '')) {
      const key = crypto.createHash('sha1').update(body).digest('hex');
      if (!gzCache.has(key)) gzCache.set(key, zlib.gzipSync(body, { level: 9 }));
      body = gzCache.get(key); headers['content-encoding'] = 'gzip';
    }
    headers['content-length'] = body.length;
    res.writeHead(status, headers); res.end(req.method === 'HEAD' ? undefined : body);
  };
  const server = http.createServer(async (req, res) => {
    try {
      const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      state.requests.push({ t: Date.now(), path: p });
      if (p === '/__vendor/mapbox-gl.js' || p === '/__vendor/mapbox-gl.css') {
        if (state.vendorDelayMs && p.endsWith('.js')) await sleep(state.vendorDelayMs);   // only the script is held back: the 40 KB stylesheet stays render-blocking, as in production
        return send(req, res, 200, fs.readFileSync(path.join(VENDOR, path.basename(p))), TYPES[path.extname(p)]);   // no-store: every page load fetches it again
      }
      const edit = state.edits.get(p);
      const rel = edit ? edit.from : (p === '/' ? 'index.html' : p.replace(/^\/+/, ''));
      const base = path.resolve(rootDir, rel);
      if (base !== rootDir && !base.startsWith(rootDir + path.sep)) return send(req, res, 403, Buffer.from('403'), 'text/plain');
      let file = null;
      for (const f of [base, `${base}.html`, path.join(base, 'index.html')]) { try { if (fs.statSync(f).isFile()) { file = f; break; } } catch { /* next */ } }
      if (!file) return send(req, res, 404, Buffer.from('404'), 'text/plain');
      let body = fs.readFileSync(file);
      const type = TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream';
      if (path.extname(file) === '.html') {
        let text = body.toString('utf8').split(MB_URL).join('/__vendor/');
        if (edit) text = edit.edit(text);
        body = Buffer.from(text, 'utf8');
      }
      return send(req, res, 200, body, type);
    } catch (e) { return send(req, res, 500, Buffer.from(String(e)), 'text/plain'); }
  });
  return new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(port, '127.0.0.1', () => resolve({
      url: `http://127.0.0.1:${port}`, state, setRoot(d) { rootDir = path.resolve(d); },
      close: () => new Promise((r) => { server.closeAllConnections?.(); server.close(() => r()); }),
    }));
  });
}

/** minimal PNG decoder (8-bit gray/RGB/RGBA, non-interlaced) so screenshots can be checked for "blank" without a native dependency */
function decodePng(buf) {
  let p = 8, w = 0, h = 0, depth = 0, ctype = 0; const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p), type = buf.toString('latin1', p + 4, p + 8), data = buf.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); depth = data[8]; ctype = data[9]; assert(data[12] === 0, 'interlaced PNG'); } else if (type === 'IDAT') idat.push(data);
    p += 12 + len;
  }
  const bpp = { 0: 1, 2: 3, 6: 4 }[ctype]; assert(bpp && depth === 8, `unsupported PNG ${depth}-bit colour type ${ctype}`);
  const raw = zlib.inflateSync(Buffer.concat(idat)), stride = w * bpp, out = Buffer.alloc(h * stride);
  for (let y = 0; y < h; y++) {
    const ft = raw[y * (stride + 1)], row = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? out[y * stride + x - bpp] : 0, b = y > 0 ? out[(y - 1) * stride + x] : 0, c = x >= bpp && y > 0 ? out[(y - 1) * stride + x - bpp] : 0;
      let v = row[x];
      if (ft === 1) v += a; else if (ft === 2) v += b; else if (ft === 3) v += (a + b) >> 1;
      else if (ft === 4) { const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      out[y * stride + x] = v & 255;
    }
  }
  return { w, h, bpp, data: out };
}
/** distinct 4-bit colours and luminance spread of a screenshot (blank / single colour images score ~1 and ~0) */
function pngStats(buf) {
  const { w, h, bpp, data } = decodePng(buf); const seen = new Set(); let n = 0, sum = 0, sum2 = 0;
  for (let y = 0; y < h; y += 2) for (let x = 0; x < w; x += 2) {
    const i = (y * w + x) * bpp, r = data[i], g = bpp >= 3 ? data[i + 1] : r, b = bpp >= 3 ? data[i + 2] : r, l = 0.299 * r + 0.587 * g + 0.114 * b;
    seen.add(((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4)); n++; sum += l; sum2 += l * l;
  }
  const mean = sum / n; return { w, h, distinct: seen.size, mean: Math.round(mean), std: Math.round(Math.sqrt(Math.max(0, sum2 / n - mean * mean)) * 10) / 10 };
}

/** page-side probes, installed with addInitScript (run before any page script) */
const HOOK = () => {   // wraps mapboxgl.Map (whenever the global is assigned): counts maps and records the token seen at `new Map`
  window.__maps = []; window.__mapLog = [];
  let mb;
  Object.defineProperty(window, 'mapboxgl', { configurable: true, get() { return mb; }, set(v) {
    mb = v;
    try {
      const Orig = v.Map;
      const Wrapped = function (...a) { window.__mapLog.push({ t: performance.now(), tokenPrefix: String(v.accessToken).slice(0, 3), hasToken: typeof v.accessToken === 'string' && v.accessToken.length > 20 }); const m = new Orig(...a); window.__maps.push(m); return m; };
      Wrapped.prototype = Orig.prototype; Object.setPrototypeOf(Wrapped, Orig);
      Object.defineProperty(v, 'Map', { value: Wrapped, configurable: true, writable: true });
    } catch (e) { window.__hookError = String(e); }
  } });
};
const PAINT = () => {
  const P = (window.__p = { fcp: null, lcp: null, cls: 0, tasks: [] });
  const ob = (type, fn) => { try { new PerformanceObserver((l) => l.getEntries().forEach(fn)).observe({ type, buffered: true }); } catch { /* unsupported */ } };
  ob('paint', (e) => { if (e.name === 'first-contentful-paint') P.fcp = e.startTime; });
  ob('largest-contentful-paint', (e) => { P.lcp = e.startTime; });
  ob('layout-shift', (e) => { if (!e.hadRecentInput) P.cls += e.value; });
  ob('longtask', (e) => { P.tasks.push([e.startTime, e.duration]); });
};
const PEER_STUBS = () => {   // PeerJS never talks to the public broker in tests: sockets and fetches to 0.peerjs.com are answered locally
  window.__peerNet = [];
  const RealWS = window.WebSocket;
  const Fake = function (url) {
    if (!/peerjs\.com/i.test(String(url))) return new RealWS(...arguments);
    window.__peerNet.push(`ws ${url}`);
    const ws = new EventTarget(); ws.readyState = 3; ws.close = () => {}; ws.send = () => {};
    setTimeout(() => {
      const e = new Event('error'), c = new Event('close');
      ws.dispatchEvent(e); if (ws.onerror) ws.onerror(e); ws.dispatchEvent(c); if (ws.onclose) ws.onclose(c);
    }, 0);
    return ws;
  };
  Fake.CONNECTING = 0; Fake.OPEN = 1; Fake.CLOSING = 2; Fake.CLOSED = 3;
  window.WebSocket = Fake;
  const realFetch = window.fetch.bind(window);
  window.fetch = (u, ...a) => (/peerjs\.com/i.test(String((u && u.url) || u)) ? (window.__peerNet.push(`fetch ${(u && u.url) || u}`), Promise.reject(new TypeError('blocked in test'))) : realFetch(u, ...a));
};

// ------------------------------------------------------------------ sessions / servers (lazy)
let staticSrv, lab, sessA, sessB;
const closers = [];
const getStatic = async () => { if (!staticSrv) { staticSrv = await createStaticServer({ root: DIST, port: PORT_BASE }); closers.push(() => staticSrv.close()); } return staticSrv; };
const getLab = async () => { if (!lab) { await ensureVendor(); lab = await createLab({ root: DIST, port: PORT_BASE + 5 }); closers.push(() => lab.close()); } return lab; };
/** A: real Mapbox through the Referer-injecting harness (functional tests); B: Mapbox API blocked, library from the lab server */
const getA = async () => { if (!sessA) { sessA = await openSession({ profile: 'maps-a', cdpPort: PORT_BASE + 1, tiles: 'inject', viewport: VP }); closers.push(() => sessA.close()); } return sessA; };
const getB = async () => { if (!sessB) { sessB = await openSession({ profile: 'maps-b', cdpPort: PORT_BASE + 2, tiles: 'block', viewport: VP }); closers.push(() => sessB.close()); } return sessB; };
const newPage = async (S, ...inits) => { const page = await S.newPage(); for (const i of inits) await page.addInitScript(i); S.collector.clear(); return page; };
const mapsReady = (page, n) => page.evaluate((count) => window.__maps.length >= count && window.__maps.every((m) => m.loaded()), n);

const suite = createSuite('T0-PG (map pages, og/manifest)');
const t = suite;

// ================================================================== WP-T0-13
t.test('PG-01', 'static markup of the 8 map pages: deferred SRI-pinned Mapbox GL, DOMContentLoaded wrapper, preconnect, valid inline JS', async (ctx) => {
  const problems = [];
  for (const name of MAP_PAGES) {
    const html = readDist(`${name}.html`);
    const scripts = [...html.matchAll(/<script\b([^>]*)>/gi)].map((m) => m[1]).filter((a) => /mapbox-gl\.js/.test(a));
    if (scripts.length !== 1) { problems.push(`${name}: ${scripts.length} mapbox-gl.js script tags`); continue; }
    const a = scripts[0];
    if (!/\bdefer\b/.test(a)) problems.push(`${name}: mapbox-gl.js is not deferred (parser-blocking)`);
    if (!a.includes('src="https://api.mapbox.com/mapbox-gl-js/v3.24.1/mapbox-gl.js"')) problems.push(`${name}: not the pinned https://api.mapbox.com/.../v3.24.1/mapbox-gl.js URL`);
    if (!a.includes(`integrity="${SRI['mapbox-gl.js'].integrity}"`) || !/crossorigin="anonymous"/.test(a)) problems.push(`${name}: mapbox-gl.js SRI/crossorigin missing or different`);
    const css = [...html.matchAll(/<link\b([^>]*)>/gi)].map((m) => m[1]).find((x) => /mapbox-gl\.css/.test(x));
    if (!css || !css.includes(`integrity="${SRI['mapbox-gl.css'].integrity}"`) || !/crossorigin="anonymous"/.test(css)) problems.push(`${name}: mapbox-gl.css SRI/crossorigin missing`);
    if (!/<link rel="preconnect" href="https:\/\/api\.mapbox\.com" crossorigin \/>/.test(html)) problems.push(`${name}: preconnect to api.mapbox.com missing`);
    // the inline app script: must be a DOMContentLoaded listener and be the ONLY place that touches `mapboxgl`
    const inline = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
    const app = inline.find((s) => s.includes('mapboxgl.accessToken'));
    if (!app) { problems.push(`${name}: inline app script not found`); continue; }
    if (!/^\s*document\.addEventListener\('DOMContentLoaded', async function \(\) \{/.test(app)) problems.push(`${name}: inline script does not start with the DOMContentLoaded listener`);
    if (!/\}\);\s*$/.test(app)) problems.push(`${name}: inline script is not closed by "});"`);
    if (/\(async function\(\) \{/.test(app)) problems.push(`${name}: the parse-time IIFE is still there`);
    if (app.indexOf('mapboxgl.accessToken = MAPBOX_TOKEN') > app.indexOf('new mapboxgl.Map')) problems.push(`${name}: token is set after new mapboxgl.Map`);
    try { acorn.parse(app, { ecmaVersion: 'latest', sourceType: 'script' }); } catch (e) { problems.push(`${name}: inline script does not parse: ${e.message}`); }
    for (const other of inline.filter((s) => s !== app)) if (/\bmapboxgl\b/.test(other)) problems.push(`${name}: another inline script uses mapboxgl at parse time`);
    if (name === 'watch-together') {
      if (/<script[^>]*peerjs/i.test(html)) problems.push('watch-together: a <script> for PeerJS is still in the HTML');
      if (!/function withPeerJs\(/.test(html) || !/PEERJS_SRI = 'sha384-/.test(html)) problems.push('watch-together: on-demand PeerJS loader missing');
      if (/typeof Peer === 'undefined'\) return;/.test(html)) problems.push('watch-together: a handler still bails out on missing Peer');
    }
  }
  ctx.note('pages', MAP_PAGES.length);
  assertEq(problems, [], 'markup problems');
});

for (const name of MAP_PAGES) {
  t.test(`PG-02-${name}`, `${name}: first paint does not wait for Mapbox GL (library held back 3 s by the lab server)`, async (ctx) => {
    const L = await getLab(), S = await getB();
    L.state.vendorDelayMs = 3000;
    const page = await newPage(S, HOOK, PAINT);
    try {
      await page.goto(`${L.url}/${name}.html`, { waitUntil: 'commit' });
      const probe = await waitFor(() => page.evaluate(() => {
        const lib = performance.getEntriesByType('resource').find((e) => /__vendor\/mapbox-gl\.js/.test(e.name));
        return window.__p && window.__p.fcp != null && lib && lib.responseEnd > 0 ? { fcp: window.__p.fcp, libEnd: lib.responseEnd, dcl: performance.getEntriesByType('navigation')[0].domContentLoadedEventStart } : null;
      }), { timeout: 25000, label: 'FCP and library arrival' });
      ctx.note('fcp ms', Math.round(probe.fcp)); ctx.note('library arrived ms', Math.round(probe.libEnd)); ctx.note('DOMContentLoaded ms', Math.round(probe.dcl));
      assert(probe.libEnd >= 2900, `the lab server should hold the library back ~3 s (arrived at ${Math.round(probe.libEnd)})`);
      assert(probe.fcp < probe.libEnd - 1500, `first contentful paint (${Math.round(probe.fcp)} ms) waited for the Mapbox library (arrived ${Math.round(probe.libEnd)} ms): it is still render-blocking`);
      assert(probe.dcl >= probe.libEnd - 5, 'DOMContentLoaded fired before the library arrived: the inline script would run without mapboxgl');
      // and the page still works once the library is there: one map per expected pane, token set BEFORE `new Map`
      const want = EXPECT_MAPS[name] || 1;
      await waitFor(() => page.evaluate((n) => window.__maps.length >= n, want), { timeout: 20000, label: `${want} map(s) created` });
      const log = await page.evaluate(() => window.__mapLog);
      assertEq(log.length, want, 'maps created'); assert(log.every((l) => l.hasToken && l.tokenPrefix === 'pk.'), `access token not set before new mapboxgl.Map: ${JSON.stringify(log)}`);
      const noise = S.collector.firstParty.filter((e) => !/peerjs/i.test(e.text)); assertEq(noise, [], 'first-party errors');
    } finally { L.state.vendorDelayMs = 0; await page.close(); }
  });
}

for (const name of MAP_PAGES) {
  t.test(`PG-02b-${name}`, `${name}: no layout shift when the data arrives after the (now earlier) first paint (CLS <= 0.02, library held back 2 s)`, async (ctx) => {
    const L = await getLab(), S = await getB();
    L.state.vendorDelayMs = 2000;
    const page = await newPage(S, HOOK, PAINT);
    try {
      await page.goto(`${L.url}/${name}.html`, { waitUntil: 'commit' });
      const want = EXPECT_MAPS[name] || 1;
      await waitFor(() => page.evaluate((n) => window.__maps && window.__maps.length >= n, want), { timeout: 25000, label: 'map(s) created' });
      await sleep(1500);   // the placeholder is gone by now; shifts are reported with a small delay
      const cls = await page.evaluate(() => Math.round(window.__p.cls * 10000) / 10000);
      ctx.note('cls', cls);
      assert(cls <= 0.02, `layout shift ${cls} after data arrival: the loading placeholder / hidden panes move content that was already painted`);
    } finally { L.state.vendorDelayMs = 0; await page.close(); }
  });
}

for (const name of MAP_PAGES) {
  t.test(`PG-03-${name}`, `${name}: real Mapbox (SRI-pinned): token before new Map, map loaded, canvas non-blank, 0 errors`, async (ctx) => {
    const S = await getA(), srv = await getStatic();
    const page = await newPage(S, HOOK);
    const m0 = S.net.mark();
    try {
      await page.goto(`${srv.url}/${name}.html`, { waitUntil: 'load' });
      const want = EXPECT_MAPS[name] || 1;
      await waitFor(() => page.evaluate((n) => window.__maps.length >= n, want), { timeout: 30000, label: `${want} map(s) created` });
      assert(!(await page.evaluate(() => window.__hookError)), 'test hook could not wrap mapboxgl.Map');
      await waitFor(() => mapsReady(page, want), { timeout: 45000, label: 'map(s) loaded (style + visible tiles)' });
      const log = await page.evaluate(() => window.__mapLog);
      assertEq(log.length, want, 'maps created'); assert(log.every((l) => l.hasToken && l.tokenPrefix === 'pk.'), 'token missing at new mapboxgl.Map');
      const containers = page.locator('.mapboxgl-map');
      assertEq(await containers.count(), want, '.mapboxgl-map containers');
      for (let i = 0; i < want; i++) {
        const st = pngStats(await containers.nth(i).screenshot());
        ctx.note(`map ${i} pixels`, `${st.w}x${st.h} distinct=${st.distinct} std=${st.std}`);
        assert(st.distinct >= 24 && st.std >= 5, `map ${i} looks blank: ${JSON.stringify(st)}`);
      }
      const lib = S.net.since(m0).filter((e) => /mapbox-gl-js\/v3\.24\.1\/mapbox-gl\.(js|css)/.test(e.url));
      assertEq(lib.map((e) => e.url.split('/').pop()).sort(), ['mapbox-gl.css', 'mapbox-gl.js'], 'library requests (one each, same 3.24.1 pin)');
      assertEq(await page.evaluate(() => document.querySelector('script[src*="mapbox-gl.js"]').defer), true, 'script.defer');
      assertEq(await page.evaluate(() => performance.getEntriesByType('resource').filter((e) => /mapbox-gl\.js/.test(e.name)).length), 1, 'mapbox-gl.js loaded once');
      S.collector.assertClean(name);
      const skus = S.tileStats.skus.size; ctx.note('mapbox skus seen so far (one per page load expected)', skus);
    } finally { await page.close(); }
  });
}

t.test('PG-03b-camera-ui', 'camera: the handlers bound inside the DOMContentLoaded callback work (Follow mode, Play advances the tick)', async () => {
  const S = await getA(), srv = await getStatic();
  const page = await newPage(S, HOOK);
  try {
    await page.goto(`${srv.url}/camera.html`, { waitUntil: 'load' });
    await waitFor(() => mapsReady(page, 1), { timeout: 45000, label: 'camera map loaded' });
    await page.click('[data-mode="follow"]');
    assertEq(await page.evaluate(() => document.getElementById('unit-select').style.display), 'inline-block', 'unit select shown in follow mode');
    assert((await page.locator('#unit-select option').count()) >= 10, 'unit dropdown filled from the OOB data');
    await page.click('#play-btn');
    // the readout is "<n>" before CLOCK and the clock module's own string ("July 1, about 5:10 AM") with it: the frame is the earliest one that prints that string
    const O = CLOCK_TREE ? await loadOracle() : null;
    const labelTick = new Map();
    if (O) for (let n = 1; n <= O.tickMax; n++) { const l = O.fmt(n, 'compat'); if (!labelTick.has(l)) labelTick.set(l, n); }
    const frameNow = async () => { const x = await page.evaluate(() => document.getElementById('tick-num').textContent.trim()); return O ? (labelTick.get(x) ?? NaN) : Number(x); };
    await waitFor(async () => (await frameNow()) >= 3, { timeout: 8000, label: 'tick advances' });
    await page.click('#play-btn');
    S.collector.assertClean('camera ui');
  } finally { await page.close(); }
});

t.test('PG-04', 'SRI is enforced: a one-character-wrong integrity on mapbox-gl.js keeps the library out (fail closed, page still paints)', async (ctx) => {
  const L = await getLab(), S = await getB();
  L.state.edits.set('/camera-badsri.html', { from: 'camera.html', edit: (x) => x.replace(SRI['mapbox-gl.js'].integrity, `${SRI['mapbox-gl.js'].integrity.slice(0, -3)}AAA`) });
  const page = await newPage(S, HOOK, PAINT);
  const errs = []; page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  try {
    await page.goto(`${L.url}/camera-badsri.html`, { waitUntil: 'load' });
    await sleep(2500);
    assertEq(await page.evaluate(() => typeof window.mapboxgl), 'undefined', 'mapboxgl must not exist when the hash does not match');
    assertEq(await page.evaluate(() => window.__maps.length), 0, 'maps');
    assert(errs.some((e) => /integrity/i.test(e)), `no integrity error in the console: ${JSON.stringify(errs.slice(0, 4))}`);
    assert(await page.evaluate(() => window.__p.fcp != null), 'the page must still paint');
    ctx.note('console', errs.find((e) => /integrity/i.test(e)).slice(0, 140));
  } finally { L.state.edits.delete('/camera-badsri.html'); await page.close(); }
});

t.test('PG-05a', 'watch-together: PeerJS is not requested at load and Host/Join stay enabled', async (ctx) => {
  const L = await getLab(), S = await getB();
  const page = await newPage(S, HOOK, PEER_STUBS);
  const m0 = S.net.mark();
  try {
    await page.goto(`${L.url}/watch-together.html`, { waitUntil: 'load' });
    await waitFor(() => page.evaluate(() => window.__maps.length >= 1), { timeout: 20000, label: 'map created' });
    await sleep(1200);
    assertEq(S.net.find(/peerjs/i, m0).map((e) => e.url), [], 'PeerJS requests during load');
    assertEq(await page.evaluate(() => typeof window.Peer), 'undefined', 'window.Peer at load');
    assertEq(await page.evaluate(() => [document.getElementById('host-btn').disabled, document.getElementById('join-btn').disabled]), [false, false], 'buttons disabled');
    assertEq(await page.evaluate(() => document.getElementById('sync-status').textContent), 'not connected', 'initial status');
    ctx.note('first-party errors', S.collector.firstParty.length);
    S.collector.assertClean('watch-together load');
  } finally { await page.close(); }
});

t.test('PG-05b', 'watch-together: Host paints "connecting…" first, then loads the SRI-pinned PeerJS once; Join reuses it; no exceptions', async (ctx) => {
  const L = await getLab(), S = await getB();
  const page = await newPage(S, HOOK, PEER_STUBS);
  const m0 = S.net.mark();
  try {
    await page.goto(`${L.url}/watch-together.html`, { waitUntil: 'load' });
    await waitFor(() => page.evaluate(() => window.__maps.length >= 1), { timeout: 20000, label: 'map created' });
    await page.evaluate(() => {   // record every status text with its time
      window.__status = [];
      const el = document.getElementById('sync-status');
      new MutationObserver(() => window.__status.push([el.textContent, performance.now()])).observe(el, { childList: true, characterData: true, subtree: true });
    });
    await page.click('#host-btn');
    await waitFor(() => page.evaluate(() => typeof window.Peer === 'function'), { timeout: 20000, label: 'PeerJS loaded' });
    await waitFor(() => page.evaluate(() => window.__peerNet.some((x) => x.startsWith('ws '))), { timeout: 8000, label: 'Peer tried to open its socket (stubbed)' });
    const st = await page.evaluate(() => ({ status: window.__status, res: performance.getEntriesByType('resource').filter((e) => /peerjs/i.test(e.name)).map((e) => ({ url: e.name, start: e.startTime })), net: window.__peerNet,
      tags: [...document.querySelectorAll('script')].filter((s) => /peerjs/.test(s.src)).map((s) => ({ src: s.src, integrity: s.integrity, crossOrigin: s.crossOrigin })) }));
    ctx.note('status sequence', st.status.map((s) => s[0]).join(' > '));
    assert(st.status.length && st.status[0][0] === 'connecting…', `first status was ${JSON.stringify(st.status[0])}, want "connecting…"`);
    assertEq(st.res.length, 1, 'PeerJS resource loads'); assert(st.res[0].start >= st.status[0][1], 'PeerJS was requested before the "connecting…" status was set');
    assertEq(st.tags.length, 1, 'PeerJS script tags'); assertEq(st.tags[0].src, SRI['peerjs.min.js'].url, 'PeerJS URL (same 1.5.4 pin)');
    assertEq(st.tags[0].integrity, SRI['peerjs.min.js'].integrity, 'PeerJS integrity'); assertEq(st.tags[0].crossOrigin, 'anonymous', 'PeerJS crossOrigin');
    assert(st.net.some((x) => x.startsWith('ws wss://0.peerjs.com')), `PeerJS did not attempt the public broker socket: ${JSON.stringify(st.net)}`);
    // Join: validates first, reuses the loaded library (no second script)
    await page.fill('#join-code', 'ab');
    await page.click('#join-btn');
    assertEq(await page.evaluate(() => document.getElementById('sync-status').textContent), 'enter the 5-letter code first', 'short code message');
    await page.fill('#join-code', 'abcde');
    await page.click('#join-btn');
    await waitFor(() => page.evaluate(() => window.__peerNet.some((x) => x.startsWith('fetch '))), { timeout: 8000, label: 'Join asked for an id (stubbed)' });
    assertEq(await page.evaluate(() => performance.getEntriesByType('resource').filter((e) => /peerjs/i.test(e.name)).length), 1, 'PeerJS loaded again by Join');
    assertEq(S.net.find(/peerjs\.min\.js/, m0).length, 1, 'PeerJS network requests');
    S.collector.assertClean('watch-together Live Sync');
  } finally { await page.close(); }
});

t.test('PG-05c', 'watch-together: a PeerJS load failure (wrong SRI) shows "unavailable", leaves the buttons usable and a second click retries', async (ctx) => {
  const L = await getLab(), S = await getB();
  L.state.edits.set('/watch-together-badsri.html', { from: 'watch-together.html', edit: (x) => x.replace(SRI['peerjs.min.js'].integrity, `${SRI['peerjs.min.js'].integrity.slice(0, -3)}AAA`) });
  const page = await newPage(S, HOOK, PEER_STUBS);
  const errs = []; page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  try {
    await page.goto(`${L.url}/watch-together-badsri.html`, { waitUntil: 'load' });
    await waitFor(() => page.evaluate(() => window.__maps.length >= 1), { timeout: 20000, label: 'map created' });
    await page.click('#host-btn');
    await waitFor(() => page.evaluate(() => /unavailable/.test(document.getElementById('sync-status').textContent)), { timeout: 15000, label: 'unavailable message' });
    assertEq(await page.evaluate(() => document.getElementById('sync-status').textContent), "unavailable (couldn't load the connection library)", 'status text');
    assertEq(await page.evaluate(() => typeof window.Peer), 'undefined', 'Peer must not exist after an integrity failure');
    assertEq(await page.evaluate(() => [document.getElementById('host-btn').disabled, document.getElementById('join-btn').disabled]), [false, false], 'buttons must stay usable');
    assert(errs.some((e) => /integrity/i.test(e)), 'no integrity error was logged');
    const before = await page.evaluate(() => [...document.querySelectorAll('script')].filter((s) => /peerjs/.test(s.src)).length);
    await page.click('#host-btn');
    await waitFor(() => page.evaluate((n) => [...document.querySelectorAll('script')].filter((s) => /peerjs/.test(s.src)).length > n, before), { timeout: 8000, label: 'retry adds a new script' });
    assertEq(S.collector.firstParty.filter((e) => e.kind === 'pageerror'), [], 'uncaught exceptions');
    ctx.note('retry scripts', before + 1);
  } finally { L.state.edits.delete('/watch-together-badsri.html'); await page.close(); }
});

// ================================================================== WP-T0-14
t.test('PG-06', 'T0-IMG-01: every og/twitter image and manifest icon/screenshot decodes with Pillow at its declared size; card 1200x630 RGB <= 150 KB', async (ctx) => {
  const r = spawnSync('python', [path.join(TOOLS, 'check_images.py'), '--dist', DIST, '--json', path.join(TMP, 'img-report.json')], { encoding: 'utf8' });
  ctx.note('checker', r.stdout.trim().split('\n').slice(-1)[0]);
  let problems = r.stdout.split('\n').filter((l) => l.startsWith('PROBLEM'));
  if (IMG_TREE) {
    // IMG (tools/t0/images/README.md, "Interactions"): the card is a photographic JPEG and the maskable icons are full-bleed photographs, so check_images.py's two rules about the GENERATED art
    // (card = PNG <= 150 KB; vector artwork inside the 40 % safe circle) cannot hold.  Every other rule (decodes, declared sizes true, single purposes, opaque maskable, no orientation lock,
    // id "/", names, GSC bytes) still applies unchanged; the card gets the equivalent check for a JPEG: decodes, exactly 1200x630, 8-bit RGB, <= 300 KB (images.spec T0-RIMG-06).
    // The checker's "opaque" rule is `mode == RGB`; IMG's maskable icons are palette PNGs (mode P), so that proxy is replaced by the property itself: no pixel of a maskable icon has alpha < 255.
    problems = problems.filter((l) => !/card .* \(want PNG RGB 1200x630 <= 150 KB\)/.test(l) && !/artwork reaches/.test(l) && !/maskable icon .* has mode \w+ \(must be opaque\)/.test(l));
    const mani = JSON.parse(fs.readFileSync(path.join(DIST, 'manifest.json'), 'utf8'));
    for (const ic of (mani.icons || []).filter((i) => i.purpose === 'maskable')) {
      const op = spawnSync('python', ['-I', '-c', 'import sys\nfrom PIL import Image\nim=Image.open(sys.argv[1]).convert("RGBA"); im.load()\nprint(im.getchannel("A").getextrema()[0])', path.join(DIST, ic.src.replace(/^\//, ''))], { encoding: 'utf8' });
      if (op.status !== 0 || op.stdout.trim() !== '255') problems.push(`PROBLEM: maskable icon ${ic.src} is not opaque (lowest alpha ${op.stdout.trim() || op.stderr.trim().slice(-80)})`);
    }
    const card = fs.readdirSync(path.join(DIST, 'og')).filter((f) => /^gettysburg-card\.(jpg|png)$/.test(f));
    assertEq(card.length, 1, 'cards under og/');
    const py = spawnSync('python', ['-I', '-c', 'import sys,os\nfrom PIL import Image\np=sys.argv[1]\nim=Image.open(p); im.load()\nprint(im.format, im.mode, im.size[0], im.size[1], os.path.getsize(p))', path.join(DIST, 'og', card[0])], { encoding: 'utf8' });
    const [fmt, mode, w, h, bytes] = py.stdout.trim().split(' ');
    ctx.note('card', `${fmt} ${mode} ${w}x${h} ${bytes} B`);
    assert(py.status === 0 && ['JPEG', 'PNG'].includes(fmt) && mode === 'RGB' && +w === 1200 && +h === 630 && +bytes <= 300 * 1024, `card ${card[0]} is ${fmt} ${mode} ${w}x${h} ${bytes} B (want JPEG/PNG RGB 1200x630 <= 300 KB)`);
  }
  if (problems.length) throw new Error(`check_images.py exit ${r.status}: ${problems.slice(0, 4).join(' | ')} (+${Math.max(0, problems.length - 4)} more)`);
});

t.test('PG-07', 'og/twitter: all 21 pages point to /og/card-r1.png (200, image/png), none to the corrupt screenshots; the manifest is valid in Chrome (Page.getInstallabilityErrors)', async (ctx) => {
  const srv = await getStatic(), S = await getA();
  const tags = []; for (const f of fs.readdirSync(DIST).filter((x) => x.endsWith('.html'))) { const h = fs.readFileSync(path.join(DIST, f), 'utf8'); for (const m of h.matchAll(/<meta\s+(?:property|name)="(og:image|twitter:image)"\s+content="([^"]+)"/g)) tags.push({ page: f, kind: m[1], url: m[2] }); }
  assertEq(new Set(tags.filter((x) => x.kind === 'og:image').map((x) => x.page)).size, 21, 'pages with og:image');
  // the one card every page names: /og/card-r1.png (PNG, <= 150 KB) before IMG; with IMG the real photograph /og/gettysburg-card.jpg (JPEG, <= 300 KB, images.spec T0-RIMG-06)
  const CARD = IMG_TREE ? { file: 'gettysburg-card.jpg', type: 'image/jpeg', cap: 300 * 1024 } : { file: 'card-r1.png', type: 'image/png', cap: 150 * 1024 };
  assertEq([...new Set(tags.map((x) => x.url))], [`https://gettysburginteractivemap.com/og/${CARD.file}`], 'distinct og/twitter image URLs');
  const res = await fetch(`${srv.url}/og/${CARD.file}`); assertEq([res.status, res.headers.get('content-type')], [200, CARD.type], 'card response');
  assertEq((await res.arrayBuffer()).byteLength <= CARD.cap, true, 'card size');
  // manifest through a probe page (the app's own index needs the whole app to boot); images decoded by Chrome itself
  const probe = path.join(TMP, 'manifest-probe.html');
  fs.writeFileSync(probe, '<!doctype html><meta charset=utf-8><title>probe</title><link rel="manifest" href="/manifest.json"><body>probe</body>');
  srv.setOverrides({ '/__manifest-probe.html': probe });
  const page = await newPage(S);
  try {
    await page.goto(`${srv.url}/__manifest-probe.html`, { waitUntil: 'load' });
    const cdp = await cdpFor(page);
    await cdp.send('Page.enable');
    const man = await cdp.send('Page.getAppManifest');
    const errors = (man.errors || []).map((e) => e.message);
    const parsed = JSON.parse(man.data);   // the manifest as served (Chrome's `parsed` carries only scope)
    const inst = await cdp.send('Page.getInstallabilityErrors');
    ctx.note('manifest url', man.url); ctx.note('manifest parse errors', errors); ctx.note('installability errors', (inst.installabilityErrors || []).map((e) => e.errorId));
    assertEq(errors, [], 'manifest parse errors');
    assert(!('orientation' in JSON.parse(man.data)), 'orientation must be gone');
    const purposes = (parsed.icons || []).map((i) => (Array.isArray(i.purpose) ? i.purpose.join(' ') : i.purpose || 'any'));
    ctx.note('icon purposes', purposes.join(','));
    assert(purposes.includes('maskable') && purposes.includes('any') && !purposes.some((p) => /any.*maskable|maskable.*any/.test(p)), 'purposes must be split');
    const bad = (inst.installabilityErrors || []).filter((e) => /icon|manifest/i.test(e.errorId));
    assertEq(bad.map((e) => e.errorId), [], 'manifest/icon installability errors');
    const imgs = await page.evaluate(async (list) => Promise.all(list.map(async (u) => { const im = new Image(); im.src = u; try { await im.decode(); return [u, im.naturalWidth, im.naturalHeight]; } catch (e) { return [u, 0, 0]; } })),
      IMG_TREE ? [`/og/${CARD.file}`, ...(parsed.icons || []).map((i) => i.src), ...(parsed.screenshots || []).map((i) => i.src)]
        : ['/og/card-r1.png', '/screenshots/day1.png', '/screenshots/day3.png', '/icons/icon-192.png', '/icons/icon-512.png', '/icons/icon-maskable-192.png', '/icons/icon-maskable-512.png']);
    ctx.note('chrome decoded', imgs.map((x) => `${x[0].split('/').pop()}=${x[1]}x${x[2]}`).join(' '));
    // with IMG the manifest lists the files it really has (no "screenshots" that were never screenshots): Chrome must decode each at the size the manifest declares
    assertEq(imgs.map((x) => `${x[1]}x${x[2]}`), IMG_TREE ? ['1200x630', ...[...(parsed.icons || []), ...(parsed.screenshots || [])].map((i) => i.sizes)] : ['1200x630', '1280x720', '1280x720', '192x192', '512x512', '192x192', '512x512'], 'Chrome-decoded sizes');
  } finally { srv.setOverrides({}); await page.close(); }
});

t.test('PG-08', 'Search Console verification file is served with the exact recovered bytes; no other google*.html', async (ctx) => {
  const srv = await getStatic();
  const res = await fetch(`${srv.url}/google0dca4879c9657741.html`); const body = Buffer.from(await res.arrayBuffer());
  assertEq(res.status, 200, 'status'); ctx.note('bytes', body.length);
  assertEq(body.toString('utf8'), 'google-site-verification: google0dca4879c9657741.html', 'content'); assertEq(body.length, 53, 'length');
  assertEq(fs.readdirSync(DIST).filter((f) => /^google.*\.html$/i.test(f)), ['google0dca4879c9657741.html'], 'google*.html files');
});

t.test('PG-SRI', 'the pinned SRI hashes still match the live CDN files (--online only)', async (ctx) => {
  if (!ONLINE) { ctx.note('skipped', 'pass --online to re-fetch'); return; }
  for (const key of ['mapbox-gl.js', 'mapbox-gl.css', 'peerjs.min.js']) {
    const res = await fetch(SRI[key].url); assert(res.ok, `${key}: HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    assertEq([buf.length, sriOf(buf)], [SRI[key].bytes, SRI[key].integrity], `${key} bytes/hash`);
    ctx.note(key, `${buf.length} B ${sriOf(buf).slice(0, 20)}...`);
  }
});

// ================================================================== lab timing (Lighthouse-like, CDP throttling)
async function runPerf() {
  const reps = Number(opt('reps', 3)), endMs = Number(opt('end', 20000)), cpu = Number(opt('cpu', 4));
  const net = { latency: 150, down: (1.6 * 1024 * 1024) / 8, up: (0.75 * 1024 * 1024) / 8 };
  const mobile = { width: 412, height: 823, dpr: 1.75, mobile: true };
  const variantArg = opt('variants', `legacy=legacy/dist,nomaps=tmp/t0-maps/R1a-nomaps/dist,full=${path.relative(REPO, DIST).replace(/\\/g, '/')}`);
  const variants = variantArg.split(',').map((x) => { const [name, dir] = x.split('='); return { name, dir: path.resolve(REPO, dir) }; });
  const pages = String(opt('pages', MAP_PAGES.join(','))).split(',');
  const live = !!opt('live', false);
  await ensureVendor();
  const sess = await openSession({ profile: 'perf', cdpPort: PORT_BASE + 3, tiles: live ? 'inject' : 'block', viewport: mobile });
  const servers = [];
  const results = [];
  try {
    for (const [i, v] of variants.entries()) {
      if (live) { v.srv = await createStaticServer({ root: v.dir, port: PORT_BASE + 5 + i }); v.origin = v.srv.url; servers.push(v.srv); } else { v.lab = await createLab({ root: v.dir, port: PORT_BASE + 5 + i }); v.origin = v.lab.url; servers.push(v.lab); }
    }
    const collect = (end) => {
      const P = window.__p, nav = performance.getEntriesByType('navigation')[0];
      const lib = performance.getEntriesByType('resource').find((e) => /mapbox-gl\.js/.test(e.name));
      const tbt = (from) => P.tasks.filter(([s]) => s >= from && s < end).reduce((a, [, d]) => a + Math.max(0, d - 50), 0);
      const fcp = P.fcp == null ? end : P.fcp;
      return { fcp: P.fcp, lcp: P.lcp, cls: Math.round(P.cls * 1000) / 1000, dcl: nav.domContentLoadedEventStart, load: nav.loadEventEnd || null, libEnd: lib ? lib.responseEnd : null,
        libBytes: lib ? { transfer: lib.transferSize, encoded: lib.encodedBodySize, decoded: lib.decodedBodySize } : null,
        mapCreated: window.__mapLog && window.__mapLog[0] ? window.__mapLog[0].t : null, tbtAfterFcp: Math.round(tbt(fcp)), tbtAll: Math.round(tbt(0)),
        longest: Math.round(Math.max(0, ...P.tasks.map(([, d]) => d))), tasks: P.tasks.length, now: performance.now() };
    };
    for (let rep = 0; rep < reps; rep++) {
      for (const name of pages) {
        for (const v of variants) {   // interleaved so drift in machine load hits every variant equally
          const page = await sess.newPage();
          const cdp = await cdpFor(page);
          try {
            await page.addInitScript(HOOK); await page.addInitScript(PAINT);
            await cdp.send('Network.enable'); await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
            await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: net.latency, downloadThroughput: net.down, uploadThroughput: net.up, connectionType: 'cellular4g' });
            await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
            const before = tileBudget.used;
            await page.goto(`${v.origin}/${name}.html`, { waitUntil: 'commit' });
            await sleep(endMs);
            const m = await page.evaluate(collect, endMs);
            results.push({ rep, page: name, variant: v.name, ...m, mapboxRequests: tileBudget.used - before });
            console.log(`${String(rep)} ${name.padEnd(17)} ${v.name.padEnd(7)} FCP ${String(Math.round(m.fcp)).padStart(5)}  LCP ${String(Math.round(m.lcp)).padStart(5)}  TBT(after FCP) ${String(m.tbtAfterFcp).padStart(5)}  TBT(all) ${String(m.tbtAll).padStart(5)}  lib ${Math.round(m.libEnd)}  map ${Math.round(m.mapCreated)}  CLS ${m.cls}`);
          } finally { try { await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 }); } catch { /* closing */ } await page.close(); }
        }
      }
    }
  } finally { await sess.close(); for (const s of servers) await s.close(); }
  const agg = {};
  for (const r of results) { const k = `${r.variant}|${r.page}`; (agg[k] ||= []).push(r); }
  const table = Object.entries(agg).map(([k, rs]) => { const [variant, page] = k.split('|'); const md = (f) => Math.round(median(rs.map((r) => r[f]).filter((x) => x != null)));
    return { variant, page, reps: rs.length, fcp: md('fcp'), lcp: md('lcp'), tbtAfterFcp: md('tbtAfterFcp'), tbtAll: md('tbtAll'), longest: md('longest'), libEnd: md('libEnd'), mapCreated: md('mapCreated'), cls: median(rs.map((r) => r.cls)) }; });
  const out = path.join(TMP, `perf${live ? '-live' : ''}.json`);
  fs.mkdirSync(TMP, { recursive: true });
  fs.writeFileSync(out, `${JSON.stringify({ profile: { cpuThrottle: cpu, network: { rttMs: net.latency, downKbps: 1638.4, upKbps: 750 }, viewport: mobile, endMs, reps, cacheDisabled: true, tiles: live ? 'real (harness Referer)' : 'blocked (map style never loads; library from local byte-identical copy)' }, table, runs: results, mapboxRequests: tileBudget.used }, null, 2)}\n`);
  console.log(`\nmedian over ${reps} rep(s)   (ms)`);
  console.log('variant  page               FCP   LCP   TBT>FCP  TBTall  longest  libEnd  mapCreated');
  for (const r of table.sort((a, b) => a.page.localeCompare(b.page) || a.variant.localeCompare(b.variant))) console.log(`${r.variant.padEnd(8)} ${r.page.padEnd(17)} ${String(r.fcp).padStart(5)} ${String(r.lcp).padStart(5)} ${String(r.tbtAfterFcp).padStart(8)} ${String(r.tbtAll).padStart(7)} ${String(r.longest).padStart(8)} ${String(r.libEnd).padStart(7)} ${String(r.mapCreated).padStart(11)}`);
  console.log(`results: ${out}   (mapbox requests used: ${tileBudget.used} of ${tileBudget.cap})`);
}

// ------------------------------------------------------------------ run
if (PERF) {
  try { await runPerf(); } finally { for (const c of closers) { try { await c(); } catch { /* closed */ } } }
  process.exit(0);
}
const outFile = path.join(IS_LEGACY ? TMP : path.dirname(DIST), IS_LEGACY ? 'test-pages-maps-legacy.json' : 'test-pages-maps.json');
let summary;
try {
  summary = await suite.run({ filter: FILTER, outFile, extra: () => ({ dist: path.relative(REPO, DIST).replace(/\\/g, '/'), mapboxBudget: { ...tileBudget } }) });
  console.log(`mapbox requests used this run: ${tileBudget.used} of ${tileBudget.cap} (blocked by cap: ${tileBudget.blocked})`);
} finally { for (const c of closers.reverse()) { try { await c(); } catch { /* already closed */ } } }
const allRed = summary.results.length > 0 && summary.results.every((r) => r.status === 'fail');
if (EXPECT_RED) { console.log(allRed ? 'expected-red: every selected test failed on this tree (red-first proven)' : `expected-red VIOLATED: passed: ${summary.results.filter((r) => r.status !== 'fail').map((r) => r.id).join(', ')}`); process.exit(allRed ? 0 : 1); }
if (tileBudget.blocked) { console.error(`the Mapbox request cap blocked ${tileBudget.blocked} request(s): raise T0_TILE_CAP or shrink the run`); process.exit(1); }
process.exit(summary.failed ? 1 : 0);
