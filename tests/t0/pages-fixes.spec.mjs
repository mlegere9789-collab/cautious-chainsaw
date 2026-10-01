// T0-PGF-* acceptance for the sub-page accessibility / touch / layout fixes (patch ids PGF-* in tools/t0/patches/PG-core.json and PG-maps.json).
// Real system Chrome (tests/t0/lib.mjs) against a lab server that serves the dist like Netlify (pretty URLs) and answers the pinned Mapbox GL
// URLs from a local byte-identical copy (SRI checked), so nothing is fetched from Mapbox except in the one test that needs a real map
// (T0-PGF-09, harness Referer, a few dozen tiles of the shared budget of 300).
//
//   node tests/t0/pages-fixes.spec.mjs                                   release/R1c/dist
//   node tests/t0/pages-fixes.spec.mjs --dist tmp/pages-fixes/R1c-v2/dist   any built tree
//   node tests/t0/pages-fixes.spec.mjs --filter 'PGF-0[1-4]'             subset by id regex
//   node tests/t0/pages-fixes.spec.mjs --dist legacy/dist --expect-red   red-first proof: every red-able test must FAIL on the legacy tree
//   node tests/t0/pages-fixes.spec.mjs --filter 'PGF-08' --walk-pages index   keyboard walk of other pages (index.html is the map app and not in the default walk)
//   node tests/t0/pages-fixes.spec.mjs --keep-shots                      also write a screenshot of every page at 375 and 1440 to tmp/pages-fixes/shots/spec-*
//
// The 25 real pages are 404, aftermath, ar, camera, cinematic-export, compare, dashboard, documentary, education, embed, find-ancestor, ground-remembers,
// historian, immersive, index, living-ledger, privacy, regiment, report, sandbox, search, terms, turning-points, viewshed and watch-together.
// index.html is the map app: it is in the axe, overflow and request-duplicate checks only (its phone shell and toolbar have their own suites).
// Limits (said once): headless Chrome 153 on Windows, emulated touch (no real finger, no iOS/WebKit/Firefox), axe-core 4.13 plus a DOM contrast estimate that skips text
// over images and gradients, no screen reader.  Mapbox's own logo and attribution links are excluded from the 44/24 px rule (their markup and size are fixed by Mapbox's terms).
// Env: T0_AGENT=pages-fixes  T0_PORT_BASE=8700 (lab server = base, CDP ports base+1..4)  T0_TILE_CAP=300
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import zlib from 'node:zlib';

process.env.T0_AGENT ??= 'pages-fixes';
process.env.T0_PORT_BASE ??= '8700';
const {
  REPO, TMP, PORT_BASE, openSession, createSuite, assert, assertEq, sleep, waitFor, tileBudget, emulateViewport, Skip,
} = await import('./lib.mjs');

const argv = process.argv.slice(2);
const opt = (name, dflt) => { const i = argv.indexOf(`--${name}`); return i >= 0 ? (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true) : dflt; };
const DIST = path.resolve(REPO, opt('dist', 'release/R1c/dist'));
const FILTER = opt('filter', null);
const EXPECT_RED = !!opt('expect-red', false);
const KEEP_SHOTS = !!opt('keep-shots', false);
const WALK_PAGES = opt('walk-pages', null) ? String(opt('walk-pages')).split(',') : null;   // debugging: restrict T0-PGF-08 to these pages (index is not part of the default walk)
const IS_LEGACY = path.resolve(DIST) === path.resolve(REPO, 'legacy/dist');
if (!fs.existsSync(DIST)) { console.error(`dist not found: ${DIST}\nbuild it first: python tools/t0/build.py --train R1c`); process.exit(2); }

const PAGES = ['404', 'aftermath', 'ar', 'camera', 'cinematic-export', 'compare', 'dashboard', 'documentary', 'education', 'embed', 'find-ancestor', 'ground-remembers', 'historian',
  'immersive', 'index', 'living-ledger', 'privacy', 'regiment', 'report', 'sandbox', 'search', 'terms', 'turning-points', 'viewshed', 'watch-together'];
const SUBPAGES = PAGES.filter((p) => p !== 'index');
const GROUPS = (() => { try { return JSON.parse(fs.readFileSync(path.join(DIST, 'version.json'), 'utf8')).groups || []; } catch { return []; } })();
// index.html is the map app: its axe / field-name state is group AX's job (R1b and later; R1a has the legacy app plus group A), so it is asserted only on a tree that has AX.
// The sub-pages are asserted on every train that has the page groups, and on legacy/dist (where they must fail).
const A11Y_PAGES = PAGES.filter((p) => p !== 'index' || GROUPS.includes('AX'));
const NAV_PAGES = ['aftermath', 'ar', 'camera', 'cinematic-export', 'compare', 'dashboard', 'documentary', 'education', 'find-ancestor', 'ground-remembers', 'historian', 'immersive', 'living-ledger', 'regiment', 'report', 'sandbox', 'search', 'turning-points', 'viewshed', 'watch-together'];
const VPS = {
  desktop: { width: 1440, height: 900, dpr: 1, mobile: false, touch: false },
  d1280: { width: 1280, height: 720, dpr: 1, mobile: false, touch: false },
  phone: { width: 375, height: 812, dpr: 2, mobile: true, touch: true },
  small: { width: 320, height: 568, dpr: 2, mobile: true, touch: true },
};
const MB_URL = 'https://api.mapbox.com/mapbox-gl-js/v3.24.1/';
const SRI = JSON.parse(fs.readFileSync(path.join(REPO, 'tools', 't0', 'assets-src', 'sri.json'), 'utf8'));
const VENDOR = path.join(TMP, 'vendor');
const AXE = fs.readFileSync(path.join(REPO, 'node_modules', 'axe-core', 'axe.min.js'), 'utf8');
const sriOf = (buf) => `sha384-${crypto.createHash('sha384').update(buf).digest('base64')}`;

// ------------------------------------------------------------------ lab server (pretty URLs, local Mapbox GL library, request log)
async function ensureVendor() {
  fs.mkdirSync(VENDOR, { recursive: true });
  for (const file of ['mapbox-gl.js', 'mapbox-gl.css']) {
    const p = path.join(VENDOR, file);
    if (!fs.existsSync(p)) {
      const other = path.join(REPO, 'tmp', 't0-maps', 'vendor', file);   // read-only reuse of an identical copy when another run already fetched it
      if (fs.existsSync(other) && sriOf(fs.readFileSync(other)) === SRI[file].integrity) fs.copyFileSync(other, p);
      else {
        const res = await fetch(SRI[file].url);
        assert(res.ok, `could not fetch ${SRI[file].url}: ${res.status}`);
        fs.writeFileSync(p, Buffer.from(await res.arrayBuffer()));
      }
    }
    assertEq(sriOf(fs.readFileSync(p)), SRI[file].integrity, `vendor ${file} must be byte-identical to the pinned CDN file`);
  }
}
function createLab({ root, port }) {
  const rootDir = path.resolve(root);
  const state = { requests: [] };
  // the cache rule the train's _headers gives /icons/* (a tree without _headers, like legacy/dist, keeps the Netlify default)
  let iconCache = 'public, max-age=0';
  try { const m = /^\/icons\/\*\s*\n((?:[ \t]+.*\n)+)/m.exec(fs.readFileSync(path.join(rootDir, '_headers'), 'utf8')); const c = m && /Cache-Control:\s*(.+)/i.exec(m[1]); if (c) iconCache = c[1].trim(); } catch { /* no _headers */ }
  if (iconCache === 'public, max-age=0') {   // no _headers (R1a, R1b): the netlify.toml of the tree carries the rule
    try { const m = /\[\[headers\]\]\s*for\s*=\s*"\/icons\/\*"\s*\[headers\.values\]\s*Cache-Control\s*=\s*"([^"]+)"/.exec(fs.readFileSync(path.join(rootDir, 'netlify.toml'), 'utf8')); if (m) iconCache = m[1]; } catch { /* no netlify.toml */ }
  }
  state.iconCache = iconCache;
  const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8', '.pdf': 'application/pdf' };
  const send = (req, res, status, body, type, cache = 'public, max-age=0') => { res.writeHead(status, { 'content-type': type, 'cache-control': cache, 'content-length': body.length, 'x-content-type-options': 'nosniff' }); res.end(req.method === 'HEAD' ? undefined : body); };
  const server = http.createServer((req, res) => {
    try {
      const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      state.requests.push({ t: Date.now(), path: p, dest: req.headers['sec-fetch-dest'] || '' });
      if (p === '/__vendor/mapbox-gl.js' || p === '/__vendor/mapbox-gl.css') return send(req, res, 200, fs.readFileSync(path.join(VENDOR, path.basename(p))), TYPES[path.extname(p)]);
      const rel = p === '/' ? 'index.html' : p.replace(/^\/+/, '');
      const base = path.resolve(rootDir, rel);
      if (base !== rootDir && !base.startsWith(rootDir + path.sep)) return send(req, res, 403, Buffer.from('403'), 'text/plain');
      let file = null;
      for (const f of [base, `${base}.html`, path.join(base, 'index.html')]) { try { if (fs.statSync(f).isFile()) { file = f; break; } } catch { /* next */ } }
      if (!file) return send(req, res, 404, Buffer.from('404'), 'text/plain');
      let body = fs.readFileSync(file);
      if (path.extname(file) === '.html') body = Buffer.from(body.toString('utf8').split(MB_URL).join('/__vendor/'), 'utf8');
      return send(req, res, 200, body, TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream', p.startsWith('/icons/') ? iconCache : 'public, max-age=0');
    } catch (e) { return send(req, res, 500, Buffer.from(String(e)), 'text/plain'); }
  });
  return new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(port, '127.0.0.1', () => resolve({ url: `http://127.0.0.1:${port}`, state, close: () => new Promise((r) => { server.closeAllConnections?.(); server.close(() => r()); }) }));
  });
}

/** minimal PNG decoder (8-bit gray/RGB/RGBA, non-interlaced), same as pages-maps.spec.mjs: focus rings are measured as changed pixels */
function decodePng(buf) {
  let p = 8, w = 0, h = 0, depth = 0, ctype = 0; const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p), type = buf.toString('latin1', p + 4, p + 8), data = buf.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); depth = data[8]; ctype = data[9]; } else if (type === 'IDAT') idat.push(data);
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
function changedPixels(bufA, bufB) {
  const A = decodePng(bufA), B = decodePng(bufB);
  if (A.w !== B.w || A.h !== B.h) return Infinity;
  let n = 0;
  for (let i = 0; i < A.data.length; i += A.bpp) {
    let d = 0; for (let k = 0; k < Math.min(3, A.bpp); k++) d += Math.abs(A.data[i + k] - B.data[i + k]);
    if (d > 36) n++;
  }
  return n;
}

// ------------------------------------------------------------------ in-page probes (self-contained: serialised into the page)
/** overflow, targets under the limit, text under 12 px, text contrast, placeholder contrast, unlabeled controls, pointer-but-not-focusable elements */
const DOM_AUDIT = ({ touch, width }) => {
  const LIM = touch ? 44 : 24;
  const vw = width || innerWidth;   // the device width: innerWidth itself grows when something is wider than the screen
  const desc = (e) => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : '');
  const vis = (el) => { const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden') return false; for (let e = el; e; e = e.parentElement) { if (+getComputedStyle(e).opacity === 0) return false; } const r = el.getBoundingClientRect(); return r.width >= 1 && r.height >= 1; };
  const docW = Math.max(document.documentElement.scrollWidth, document.body ? document.body.scrollWidth : 0);
  const overflowEls = [];
  for (const el of document.querySelectorAll('body *')) {
    if (!vis(el) || el.closest('.mapboxgl-map')) continue;
    const r = el.getBoundingClientRect();
    if (r.right > vw + 1.5) {
      let clipped = false;
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) { const s = getComputedStyle(p); if (/(auto|scroll|hidden|clip)/.test(s.overflowX) && p.getBoundingClientRect().right <= vw + 1.5) { clipped = true; break; } }
      if (!clipped) overflowEls.push(desc(el) + ' right=' + Math.round(r.right));
    }
  }
  const INT = 'button, a[href], input:not([type=hidden]), select, textarea, summary, [role=button], [role=tab], [role=slider], [role=checkbox], [role=switch]';
  const small = []; let total = 0;
  for (const el of document.querySelectorAll(INT)) {
    if (!vis(el) || el.closest('.gt-skip, .gt-sr-only, .mapboxgl-ctrl-attrib, .mapboxgl-ctrl-logo')) continue;
    total++;
    let r = el.getBoundingClientRect();
    if (el.matches('input[type=checkbox],input[type=radio]') && el.labels && el.labels[0]) { const lr = el.labels[0].getBoundingClientRect(); if (lr.width * lr.height > r.width * r.height) r = lr; }
    const ownText = el.parentElement ? [...el.parentElement.childNodes].filter((n) => n.nodeType === 3).map((n) => n.nodeValue).join('').replace(/\s+/g, ' ').trim() : '';
    const inlineInSentence = el.tagName === 'A' && getComputedStyle(el).display === 'inline' && ownText.length >= 12;   // WCAG 2.5.8 exception: a link inside a sentence
    if (!inlineInSentence && Math.min(r.width, r.height) < LIM - 0.5) small.push(`${desc(el)} ${Math.round(r.width)}x${Math.round(r.height)} "${(el.getAttribute('aria-label') || el.innerText || el.value || '').replace(/\s+/g, ' ').trim().slice(0, 20)}"`);
  }
  const tiny = []; const seen = new Set();
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    const t = n.nodeValue.replace(/\s+/g, ' ').trim(); if (!t) continue;
    const p = n.parentElement; if (!p || seen.has(p) || p.closest('script,style,noscript,.gt-sr-only,.gt-skip') || !vis(p)) continue; seen.add(p);
    let fsz = parseFloat(getComputedStyle(p).fontSize);
    if (p.closest('svg') && typeof p.getScreenCTM === 'function') { const m = p.getScreenCTM(); if (m) fsz *= Math.hypot(m.a, m.b); }   // text inside a scaled SVG counts as drawn
    if (fsz < 11.995) tiny.push(`${desc(p)} ${fsz.toFixed(1)}px "${t.slice(0, 20)}"`);
  }
  const parse = (c) => { const m = /rgba?\(([^)]+)\)/.exec(c); if (!m) return null; const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };
  const bgOf = (el) => {
    const chain = []; for (let e = el; e; e = e.parentElement) chain.push(e); chain.reverse();
    let cur = { r: 255, g: 255, b: 255 }; let unknown = false;
    for (const e of chain) {
      const cs = getComputedStyle(e); const c = parse(cs.backgroundColor);
      if (c && c.a > 0) { cur = { r: cur.r * (1 - c.a) + c.r * c.a, g: cur.g * (1 - c.a) + c.g * c.a, b: cur.b * (1 - c.a) + c.b * c.a }; if (c.a >= 1) unknown = false; }
      if (cs.backgroundImage && cs.backgroundImage !== 'none') unknown = true;
    }
    return { cur, unknown };
  };
  const lowContrast = [];
  seen.forEach((p) => {
    if (p.matches(':disabled') || p.closest('[disabled],[aria-disabled=true],.mapboxgl-ctrl')) return;
    const cs = getComputedStyle(p); const fgc = parse(cs.color); if (!fgc) return;
    const { cur, unknown } = bgOf(p); if (unknown) return;
    let op = 1; for (let e = p; e; e = e.parentElement) op *= +getComputedStyle(e).opacity;
    const a = fgc.a * op; const fg = { r: fgc.r * a + cur.r * (1 - a), g: fgc.g * a + cur.g * (1 - a), b: fgc.b * a + cur.b * (1 - a) };
    const sz = parseFloat(cs.fontSize); const large = sz >= 24 || (sz >= 18.66 && parseInt(cs.fontWeight, 10) >= 700);
    const rv = ratio(fg, cur);
    if (rv < (large ? 3 : 4.5)) lowContrast.push(`${desc(p)} ${rv.toFixed(2)}:1 "${(p.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 18)}"`);
  });
  const placeholders = [];
  for (const el of document.querySelectorAll('input[placeholder],textarea[placeholder]')) {
    if (!vis(el)) continue;
    const ps = getComputedStyle(el, '::placeholder'); const pc = parse(ps.color); if (!pc) continue;
    const { cur } = bgOf(el); const a = pc.a * (+ps.opacity || 1);
    const fg = { r: pc.r * a + cur.r * (1 - a), g: pc.g * a + cur.g * (1 - a), b: pc.b * a + cur.b * (1 - a) };
    const rv = ratio(fg, cur); if (rv < 4.5) placeholders.push(`${desc(el)} ${rv.toFixed(2)}:1`);
  }
  const unlabeled = [];
  for (const el of document.querySelectorAll('input:not([type=hidden]):not([type=submit]):not([type=button]), select, textarea')) {
    if (!vis(el)) continue;
    if (!(el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || (el.labels && el.labels.length) || el.title)) unlabeled.push(desc(el));
  }
  const FOC = 'a[href], button, input, select, textarea, summary, [tabindex], [contenteditable=true], iframe';
  const notFocusable = [];
  for (const el of document.querySelectorAll('body *')) {
    if (!vis(el) || el.closest('.mapboxgl-map, svg, .gt-skip')) continue;
    if (getComputedStyle(el).cursor !== 'pointer') continue;
    if (el.matches(FOC) || el.closest(FOC) || el.querySelector(FOC) || el.closest('label')) continue;
    notFocusable.push(desc(el));
  }
  return { docW, innerWidth, clientWidth: document.documentElement.clientWidth, overflowEls: overflowEls.slice(0, 6), small, total, tiny, lowContrast, placeholders, unlabeled, notFocusable };
};
const AXE_RUN = () => axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] }, resultTypes: ['violations'] })
  .then((r) => r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${v.id}[${v.impact}] x${v.nodes.length} ${v.nodes[0].target.join(' ').slice(0, 70)}`));
const READ_FOCUS = () => {
  const el = document.activeElement; if (!el || el === document.body || el === document.documentElement) return { body: true };
  const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
  const desc = el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '');
  const name = (el.getAttribute('aria-label') || (el.labels && el.labels[0] && el.labels[0].innerText) || el.innerText || el.value || el.title || el.placeholder || '').replace(/\s+/g, ' ').trim().slice(0, 30);
  const cx = r.x + r.width / 2, cy = r.y + r.height / 2; const top = document.elementFromPoint(cx, cy);
  const obscured = !!top && !(top === el || el.contains(top) || top.contains(el) || (el.labels && [...el.labels].some((l) => l.contains(top))));
  let opac = 1; for (let e = el; e; e = e.parentElement) opac *= +getComputedStyle(e).opacity;
  const lab = el.labels && el.labels[0] ? el.labels[0].getBoundingClientRect() : null;
  return { el: desc, name, tabindex: el.getAttribute('tabindex'), rect: { x: r.x, y: r.y, w: r.width, h: r.height }, labelRect: lab ? { x: lab.x, y: lab.y, w: lab.width, h: lab.height } : null,
    inView: r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth, obscured, hiddenInput: opac < 0.05 || r.width < 2 || cs.visibility === 'hidden',
    textField: el.matches('input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=file]):not([type=button]):not([type=submit]),textarea'),
    insideNav: !!el.closest('#gtbg-nav'), insideMap: !!el.closest('#map, .map'), mapId: (el.closest('#map-a, #map-b') || {}).id || '', id: el.id || '' };
};

// ------------------------------------------------------------------ sessions and page collection
let lab; const sessions = {}; const closers = [];
const getLab = async () => { if (!lab) { await ensureVendor(); lab = await createLab({ root: DIST, port: PORT_BASE }); closers.push(() => lab.close()); } return lab; };
let nextCdp = 1;
async function session(kind, tiles = 'block') {
  const key = `${kind}-${tiles}`;
  if (!sessions[key]) {
    sessions[key] = await openSession({ profile: `spec-${key}`, cdpPort: PORT_BASE + nextCdp++, tiles, onboarded: true, viewport: VPS[kind] });
    closers.push(() => sessions[key].close());
  }
  return sessions[key];
}
async function openPage(kind, name, { tiles = 'block', wait = 1800 } = {}) {
  const L = await getLab(); const S = await session(kind, tiles);
  const page = await S.newPage();
  page.setDefaultTimeout(10000);
  await emulateViewport(page, VPS[kind]);
  const mark = S.net.mark();
  await page.goto(`${L.url}/${name}.html`, { waitUntil: 'load', timeout: 30000 });
  await page.waitForLoadState('networkidle', { timeout: 6000 }).catch(() => {});
  await sleep(wait);
  return { page, S, L, mark };
}
const collected = {};
/** one load of every page at one viewport: DOM audit, axe (initial and with the nav menu open), open-menu text sizes, first-party duplicate requests */
function collect(kind) {
  collected[kind] ||= (async () => {
    const out = {};
    for (const name of PAGES) {
      const { page, S, L, mark } = await openPage(kind, name);
      const rec = out[name] = {};
      try {
        rec.audit = await page.evaluate(DOM_AUDIT, { touch: VPS[kind].touch, width: VPS[kind].width });
        const reqs = S.net.since(mark).filter((e) => e.url.startsWith(L.url) && e.target === 'page' && e.type !== 'Other' && !/\/favicon\.ico$/.test(e.url));
        const cnt = {}; for (const e of reqs) { const k = e.url.replace(L.url, ''); cnt[k] = (cnt[k] || 0) + 1; }
        rec.dups = Object.entries(cnt).filter(([, n]) => n > 1).map(([u, n]) => `${u} x${n}`);
        await page.evaluate(AXE);
        rec.axe = await page.evaluate(AXE_RUN);
        if (await page.evaluate(() => !!document.getElementById('gtbg-menu-btn'))) {
          await page.click('#gtbg-menu-btn'); await sleep(450);
          rec.axeMenu = await page.evaluate(AXE_RUN);
          rec.menu = await page.evaluate(DOM_AUDIT, { touch: VPS[kind].touch, width: VPS[kind].width });
          rec.menuBox = await page.evaluate(() => { const r = document.getElementById('gtbg-menu-panel').getBoundingClientRect(); return { left: r.left, right: r.right, vw: innerWidth }; });
        }
        if (KEEP_SHOTS && (kind === 'phone' || kind === 'desktop')) {
          const dir = path.join(TMP, 'shots', `spec-${kind}`); fs.mkdirSync(dir, { recursive: true });
          await page.keyboard.press('Escape'); await page.evaluate(() => window.scrollTo(0, 0));
          await page.screenshot({ path: path.join(dir, `${name}.png`) });
        }
      } catch (e) { rec.error = String(e.message).split('\n')[0].slice(0, 200); }
      await page.close();
    }
    return out;
  })();
  return collected[kind];
}
const problems = (out, pick, pages = PAGES) => {
  const bad = {}; for (const name of pages) { const v = pick(out[name]); if (v && v.length) bad[name] = v; } return bad;
};

const suite = createSuite('pages-fixes');
const RED = new Set();
const test = (id, title, fn, { red = true } = {}) => { if (red) RED.add(id); suite.test(id, title, fn); };

// ------------------------------------------------------------------------------------------------------------------ axe, overflow, targets, text
for (const [kind, label] of [['desktop', '1440x900'], ['phone', '375x812']]) {
  test(`T0-PGF-01${kind === 'desktop' ? 'a' : 'b'}`, `axe: 0 serious / critical violations on all 24 sub-pages (and on the map app on trains that carry its a11y bridge, R1b+) at ${label}, also with the nav menu open`, async (t) => {
    const out = await collect(kind);
    assertEq(problems(out, (r) => r.error ? [r.error] : []), {}, 'pages that could not be audited');
    const bad = problems(out, (r) => [...(r.axe || []), ...(r.axeMenu || []).map((v) => `menu open: ${v}`)], A11Y_PAGES);
    t.note('violations', bad);
    assertEq(bad, {}, `serious/critical axe violations at ${label}`);
  });
}
test('T0-PGF-02', 'no horizontal overflow and no layout-viewport expansion on any of the 25 pages at 375 and 320 px (sandbox was 527 px, 19 pages were 329 px at 320)', async (t) => {
  const bad = {};
  for (const kind of ['phone', 'small']) {
    const out = await collect(kind);
    for (const name of PAGES) {
      const a = out[name].audit; if (!a) { bad[`${name}@${kind}`] = out[name].error; continue; }
      if (a.innerWidth !== VPS[kind].width || a.docW > a.clientWidth + 1) bad[`${name}@${kind}`] = { innerWidth: a.innerWidth, docW: a.docW, clientWidth: a.clientWidth, wide: a.overflowEls };
    }
  }
  t.note('overflow', bad);
  assertEq(bad, {}, 'pages wider than the phone');
});
test('T0-PGF-03a', 'targets at 375 px: every button, link, field, select, slider and checkbox is at least 44 px tall and wide (links inside a sentence and Mapbox\'s own attribution excepted)', async (t) => {
  const out = await collect('phone');
  const bad = problems(out, (r) => [...((r.audit || {}).small || []), ...((r.menu || {}).small || []).map((s) => `menu open: ${s}`)], SUBPAGES);
  t.note('under 44 px', bad);
  assertEq(bad, {}, 'targets under 44 px');
});
test('T0-PGF-03b', 'targets at 1440 px: at least 24 px (the nav, footer and back link were 16-34 px)', async (t) => {
  const out = await collect('desktop');
  const bad = problems(out, (r) => [...((r.audit || {}).small || []), ...((r.menu || {}).small || []).map((s) => `menu open: ${s}`)], SUBPAGES);
  t.note('under 24 px', bad);
  assertEq(bad, {}, 'targets under 24 px');
});
test('T0-PGF-04', 'no text under 12 px (SVG text as drawn, nav menu included) on the 24 sub-pages at 375 and 1440 px', async (t) => {
  const bad = {};
  for (const kind of ['phone', 'desktop']) {
    const out = await collect(kind);
    Object.assign(bad, Object.fromEntries(Object.entries(problems(out, (r) => [...((r.audit || {}).tiny || []), ...((r.menu || {}).tiny || [])], SUBPAGES)).map(([k, v]) => [`${k}@${kind}`, [...new Set(v)]])));
  }
  t.note('under 12 px', bad);
  assertEq(bad, {}, 'text under 12 px');
});
test('T0-PGF-05', 'every field has an accessible name and no placeholder is under 4.5:1 (all 24 sub-pages and the map app on trains with its a11y bridge, 375 and 1440 px)', async (t) => {
  const bad = {};
  for (const kind of ['phone', 'desktop']) {
    const out = await collect(kind);
    for (const name of A11Y_PAGES) { const a = out[name].audit || {}; const v = [...(a.unlabeled || []).map((s) => `no name: ${s}`), ...(a.placeholders || []).map((s) => `placeholder ${s}`)]; if (v.length) bad[`${name}@${kind}`] = v; }
  }
  t.note('problems', bad);
  assertEq(bad, {}, 'unnamed fields / low placeholder contrast');
});
test('T0-PGF-06', 'text over a solid background is at least 4.5:1 (3:1 for large text) on the 24 sub-pages (DOM estimate; text over images and gradients is left to axe)', async (t) => {
  const bad = {};
  for (const kind of ['phone', 'desktop']) {
    const out = await collect(kind);
    Object.assign(bad, Object.fromEntries(Object.entries(problems(out, (r) => [...((r.audit || {}).lowContrast || []), ...((r.menu || {}).lowContrast || [])], SUBPAGES)).map(([k, v]) => [`${k}@${kind}`, [...new Set(v)]])));
  }
  t.note('low contrast', bad);
  assertEq(bad, {}, 'low contrast text');
});
test('T0-PGF-07', 'nav bar at 320 px: brand, Ask the Historian and Explore sit inside the screen at least 44 px tall, and the open menu stays inside it', async (t) => {
  const bad = {};
  for (const name of NAV_PAGES) {
    const { page } = await openPage('small', name, { wait: 600 });
    const r = await page.evaluate(() => {
      const q = (s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return { l: Math.round(b.left), r: Math.round(b.right), h: Math.round(b.height) }; };
      return { brand: q('#gtbg-nav a.brand'), pin: q('#gtbg-nav .gtbg-historian-pin'), btn: q('#gtbg-nav .gtbg-menu-btn'), nav: q('#gtbg-nav'), vw: innerWidth };
    });
    const v = [];
    for (const k of ['brand', 'pin', 'btn']) { const b = r[k]; if (!b) v.push(`${k} missing`); else { if (b.l < 0 || b.r > 320) v.push(`${k} ${b.l}..${b.r}`); if (b.h < 44) v.push(`${k} ${b.h}px tall`); } }
    if (r.vw !== 320) v.push(`innerWidth ${r.vw}`);
    const open = await (async () => { await page.click('#gtbg-menu-btn'); await sleep(350); return page.evaluate(() => { const b = document.getElementById('gtbg-menu-panel').getBoundingClientRect(); return { l: Math.round(b.left), r: Math.round(b.right) }; }); })();
    if (open.l < 0 || open.r > 320) v.push(`menu ${open.l}..${open.r}`);
    if (v.length) bad[name] = v;
    await page.close();
  }
  t.note('problems', bad);
  assertEq(bad, {}, 'nav bar at 320 px');
});

// ------------------------------------------------------------------------------------------------------------------ keyboard
/** Tab through a freshly loaded page (the walk continues after each blur from the same starting point) */
async function walk(kind, name, { max = 100 } = {}) {
  const { page } = await openPage(kind, name, { wait: 1500 });
  const vp = VPS[kind]; const stops = []; let cycled = false;
  await page.evaluate(() => { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); document.body.setAttribute('tabindex', '-1'); document.body.focus(); document.body.removeAttribute('tabindex'); window.scrollTo(0, 0); });   // a page with autofocus (search) starts the walk at the top like everyone else
  for (let i = 0; i < max; i++) {
    await page.keyboard.press('Tab'); await sleep(35);
    const f = await page.evaluate(READ_FOCUS);
    if (f.body) { cycled = true; break; }
    if (stops.length > 2 && stops[0].el === f.el && Math.abs(stops[0].rect.x - f.rect.x) < 1) { cycled = true; break; }
    const rect = f.hiddenInput && f.labelRect ? f.labelRect : f.rect;
    if (f.inView && rect.w > 0 && rect.h > 0) {
      const pad = 10;
      const clip = { x: Math.max(0, Math.floor(rect.x - pad)), y: Math.max(0, Math.floor(rect.y - pad)), width: 0, height: 0 };
      clip.width = Math.max(1, Math.min(vp.width - clip.x, Math.ceil(rect.w + 2 * pad))); clip.height = Math.max(1, Math.min(vp.height - clip.y, Math.ceil(rect.h + 2 * pad)));
      const A = await page.screenshot({ clip, type: 'png' });
      await page.evaluate(() => document.activeElement.blur());
      await sleep(35);
      const B = await page.screenshot({ clip, type: 'png' });
      f.ringPixels = changedPixels(A, B);
    } else f.ringPixels = null;
    stops.push(f);
  }
  await page.close();
  return { stops, cycled };
}
const NO_RING_CHECK = new Set(['index']);
test('T0-PGF-08', 'keyboard walk of the 24 sub-pages (375 and 1440 px): starts in the site nav, every stop is on screen, not under the sticky nav, shows a focus indicator (pixels change), no positive tabindex, no trap', async (t) => {
  const bad = {}; const counts = {};
  for (const kind of ['desktop', 'phone']) {
    for (const name of WALK_PAGES || SUBPAGES) {
      const { stops, cycled } = await walk(kind, name);
      counts[`${name}@${kind}`] = stops.length;
      const v = [];
      if (!stops.length) v.push('no tab stop at all');
      if (!cycled) v.push(`no end after ${stops.length} stops (trap?)`);
      if (NAV_PAGES.includes(name) && stops[0] && !stops[0].insideNav) v.push(`first stop is ${stops[0].el}, not the nav`);
      for (const s of stops) {
        if (!s.inView) v.push(`${s.el} off screen`);
        else if (s.obscured && !s.hiddenInput) v.push(`${s.el} covered by another element`);
        if (s.tabindex && +s.tabindex > 0) v.push(`${s.el} tabindex=${s.tabindex}`);
        if (s.ringPixels !== null && s.ringPixels < 8) v.push(`${s.el} "${s.name}" no visible focus indicator (${s.ringPixels} px changed)`);
      }
      if (v.length) bad[`${name}@${kind}`] = [...new Set(v)].slice(0, 6);
    }
  }
  t.note('tab stops per page', counts);
  t.note('problems', bad);
  assertEq(bad, {}, 'keyboard problems');
});
test('T0-PGF-09', 'the nav menu works from the keyboard: Enter opens it, Esc closes it and returns focus to Explore, Tab out of the open menu closes it, the button names its panel', async () => {
  for (const [kind, name] of [['desktop', 'camera'], ['phone', 'aftermath']]) {
    const { page } = await openPage(kind, name, { wait: 800 });
    for (let i = 0; i < 3; i++) await page.keyboard.press('Tab');   // brand, Ask the Historian, Explore
    assertEq(await page.evaluate(() => document.activeElement.id), 'gtbg-menu-btn', `${name}: third tab stop`);
    assertEq(await page.evaluate(() => document.getElementById('gtbg-menu-btn').getAttribute('aria-controls')), 'gtbg-menu-panel', 'aria-controls');
    await page.keyboard.press('Enter'); await sleep(350);
    assertEq(await page.evaluate(() => document.getElementById('gtbg-menu-btn').getAttribute('aria-expanded')), 'true', `${name}: Enter opens`);
    await page.keyboard.press('Tab');
    assert(await page.evaluate(() => !!document.activeElement.closest('#gtbg-menu-panel')), `${name}: Tab moves into the menu`);
    await page.keyboard.press('Escape'); await sleep(250);
    assertEq(await page.evaluate(() => ({ open: document.getElementById('gtbg-menu-panel').classList.contains('open'), active: document.activeElement.id })), { open: false, active: 'gtbg-menu-btn' }, `${name}: Esc closes and refocuses Explore`);
    await page.keyboard.press('Enter'); await sleep(300);
    const items = await page.evaluate(() => document.querySelectorAll('#gtbg-menu-panel a').length);
    for (let i = 0; i < items + 1; i++) { await page.keyboard.press('Tab'); await sleep(20); }
    await sleep(100);
    assertEq(await page.evaluate(() => ({ open: document.getElementById('gtbg-menu-panel').classList.contains('open'), inside: !!document.activeElement.closest('#gtbg-nav') })), { open: false, inside: false }, `${name}: tabbing out closes the menu`);
    await page.close();
  }
});
test('T0-PGF-19', 'keyboard focus is a real outline of 2 px or more, not only a glow or a tint, on the Ask the Historian pin, the menu rows, the Historian chips and question field, and the Regiment search field and result rows', async (t) => {
  const ring = (page) => page.evaluate(() => { const e = document.activeElement; const cs = getComputedStyle(e); return { el: e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/)[0] : ''), style: cs.outlineStyle, width: parseFloat(cs.outlineWidth) }; });
  const tabTo = async (page, sel, max) => { for (let i = 0; i < max; i++) { await page.keyboard.press('Tab'); if (await page.evaluate((s) => document.activeElement.matches(s), sel)) return true; } return false; };
  const seen = {}; const bad = {};
  const check = (label, r) => { seen[label] = `${r.el} ${r.style} ${r.width}px`; if (r.style === 'none' || !(r.width >= 2)) bad[label] = r; };
  for (const kind of ['desktop', 'phone']) {
    let { page } = await openPage(kind, 'historian', { wait: 1200 });
    assert(await tabTo(page, '.gtbg-historian-pin', 6), `${kind}: the Ask the Historian pin is a Tab stop`);
    check(`${kind}: Ask the Historian pin`, await ring(page));
    assert(await tabTo(page, '#gtbg-menu-btn', 3), `${kind}: Explore is a Tab stop`);
    await page.keyboard.press('Enter'); await sleep(300); await page.keyboard.press('Tab');
    assert(await page.evaluate(() => !!document.activeElement.closest('#gtbg-menu-panel')), `${kind}: Tab moves into the open menu`);
    check(`${kind}: menu row`, await ring(page));
    await page.keyboard.press('Escape'); await sleep(250);
    assert(await tabTo(page, '.sugg', 40), `${kind}: a suggestion chip is a Tab stop`);
    check(`${kind}: Historian suggestion chip`, await ring(page));
    assert(await tabTo(page, '#ask', 40), `${kind}: the question field is a Tab stop`);
    check(`${kind}: Historian question field`, await ring(page));
    await page.close();
    ({ page } = await openPage(kind, 'regiment', { wait: 1200 }));
    assert(await tabTo(page, '#regiment-search', 12), `${kind}: the Regiment search field is a Tab stop`);
    check(`${kind}: Regiment search field`, await ring(page));
    await page.keyboard.type('20th Maine'); await sleep(250); await page.keyboard.press('Tab');
    assert(await page.evaluate(() => document.activeElement.classList.contains('match-row')), `${kind}: Tab from the field lands on a result row`);
    check(`${kind}: Regiment result row`, await ring(page));
    await page.close();
  }
  t.note('focus outlines', seen);
  assertEq(bad, {}, 'controls whose keyboard focus is not a real outline');
});
test('T0-PGF-10', 'controls that only had a mouse handler work from the keyboard: Report and Regiment search results, the Dashboard legend, Watch Together Import tour and Add stop, the Immersive sound gate', async (t) => {
  // Report: type, Tab to the first result, Enter
  let { page } = await openPage('desktop', 'report', { wait: 1200 });
  await page.focus('#report-search'); await page.keyboard.type('20th Maine'); await sleep(200);
  await page.keyboard.press('Tab');
  assert(await page.evaluate(() => document.activeElement.classList.contains('match')), 'report: Tab from the search field lands on a result');
  await page.keyboard.press('Enter'); await sleep(200);
  assert(await page.evaluate(() => getComputedStyle(document.getElementById('report')).display !== 'none' && /20th Maine/.test(document.getElementById('r-title').textContent)), 'report: Enter shows the report');
  await page.close();
  // Regiment: Space picks
  ({ page } = await openPage('desktop', 'regiment', { wait: 1200 }));
  await page.focus('#regiment-search'); await page.keyboard.type('20th Maine'); await sleep(200);
  await page.keyboard.press('Tab'); await page.keyboard.press('Space'); await sleep(250);
  assert(await page.evaluate(() => getComputedStyle(document.getElementById('bio')).display !== 'none' && /20th Maine/.test(document.getElementById('b-title').textContent)), 'regiment: Space shows the biography');
  await page.close();
  // Dashboard legend
  ({ page } = await openPage('desktop', 'dashboard', { wait: 1500 }));
  await page.focus('.legend-item'); await page.keyboard.press('Enter'); await sleep(150);
  const iso = await page.evaluate(() => ({ pressed: document.querySelectorAll('.legend-item[aria-pressed="true"]').length, dim: document.querySelectorAll('.legend-item.dim').length, all: document.querySelectorAll('.legend-item').length, role: document.querySelector('.legend-item').getAttribute('role') }));
  assertEq({ pressed: iso.pressed, dim: iso.dim, role: iso.role }, { pressed: 1, dim: iso.all - 1, role: 'button' }, 'dashboard: Enter isolates the corps');
  await page.keyboard.press('Space'); await sleep(150);
  assertEq(await page.evaluate(() => document.querySelectorAll('.legend-item.dim').length), 0, 'dashboard: Space shows every corps again');
  await page.close();
  // Watch Together: the Import tour input is a Tab stop and its label shows the focus ring; a stop is added with the keyboard
  ({ page } = await openPage('desktop', 'watch-together', { wait: 1500 }));
  await page.evaluate(() => { try { localStorage.removeItem('gtbg_watch_together_tour'); } catch { /* blocked */ } });
  await page.focus('#new-tick'); await page.keyboard.type('12'); await page.keyboard.press('Tab'); await page.keyboard.type('Keyboard stop'); await page.keyboard.press('Tab'); await page.keyboard.press('Enter'); await sleep(250);
  assertEq(await page.evaluate(() => [...document.querySelectorAll('#stops .stop-row')].map((r) => [...r.children].map((c) => c.textContent.trim()).join('|'))), ['Tick 12|Keyboard stop|×'], 'watch-together: a stop added with the keyboard');
  assertEq(await page.evaluate(() => document.querySelector('#stops .stop-row button').getAttribute('aria-label')), 'Remove stop at tick 12', 'watch-together: the remove button names its stop');
  let reached = false;
  await page.focus('#add-stop');
  for (let i = 0; i < 12 && !reached; i++) { await page.keyboard.press('Tab'); reached = await page.evaluate(() => document.activeElement.id === 'import-input'); }
  assert(reached, 'watch-together: Import tour (file input) is a Tab stop');
  const lab = await page.evaluate(() => { const r = document.getElementById('import-input').labels[0].getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
  const clip = { x: Math.max(0, lab.x - 8), y: Math.max(0, lab.y - 8), width: lab.w + 16, height: lab.h + 16 };
  const withRing = await page.screenshot({ clip, type: 'png' });
  await page.evaluate(() => document.activeElement.blur()); await sleep(50);
  const without = await page.screenshot({ clip, type: 'png' });
  assert(changedPixels(withRing, without) >= 40, 'watch-together: the Import tour label shows a focus ring when its input has keyboard focus');
  await page.close();
  // Immersive: the sound gate is the first stop after the nav and the map behind it cannot be reached until it is dismissed
  ({ page } = await openPage('desktop', 'immersive', { wait: 1500 }));
  const seq = [];
  for (let i = 0; i < 12; i++) { await page.keyboard.press('Tab'); seq.push(await page.evaluate(() => { const e = document.activeElement; return e.id || e.className || e.tagName; })); }
  t.note('immersive tab sequence', seq);
  const afterNav = seq.slice(3).filter((x) => x !== 'back');   // brand, Ask the Historian, Explore, then the back link
  assertEq(afterNav[0], 'enable-sound', 'immersive: first stop after the nav');
  assert(!(await page.evaluate(() => !!document.querySelector('#map').contains(document.activeElement))), 'immersive: focus is not inside the gated map');
  await page.focus('#enable-sound'); await page.keyboard.press('Enter'); await sleep(400);
  assertEq(await page.evaluate(() => ({ gate: getComputedStyle(document.getElementById('sound-gate')).display, inert: document.getElementById('map').inert })), { gate: 'none', inert: false }, 'immersive: the map is live once the gate is dismissed');
  await page.close();
});
test('T0-PGF-11', 'the tab order of Compare follows the screen: pane A controls, map A, pane B controls, map B', async () => {
  const { stops } = await walk('desktop', 'compare');
  const first = (pred) => stops.findIndex(pred);
  const order = { sliderA: first((s) => s.id === 'slider-a'), mapA: first((s) => s.mapId === 'map-a'), sliderB: first((s) => s.id === 'slider-b'), mapB: first((s) => s.mapId === 'map-b') };
  assert(order.sliderA >= 0 && order.mapA > order.sliderA && order.sliderB > order.mapA && order.mapB > order.sliderB, `tab order ${JSON.stringify(order)}`);
});

// ------------------------------------------------------------------------------------------------------------------ layouts
test('T0-PGF-12', 'Compare on a phone: each pane has its controls above its map (no overlap), 44 px buttons, maps at least 280 px tall; on a desktop the controls still sit on the map', async (t) => {
  let { page } = await openPage('phone', 'compare', { wait: 1500 });
  await page.evaluate(() => { document.getElementById('split').style.visibility = 'visible'; });
  const ph = await page.evaluate(() => [...document.querySelectorAll('.pane')].map((p) => {
    const c = p.querySelector('.pane-controls').getBoundingClientRect(), m = p.querySelector('.map').getBoundingClientRect();
    return { ctrlBottom: Math.round(c.bottom), mapTop: Math.round(m.top), mapH: Math.round(m.height), toggles: [...p.querySelectorAll('.toggle-btn')].map((b) => Math.round(Math.min(b.getBoundingClientRect().width, b.getBoundingClientRect().height))), w: Math.round(p.getBoundingClientRect().width) };
  }));
  t.note('phone panes', ph);
  assertEq(ph.length, 2, 'two panes');
  for (const p of ph) { assert(p.ctrlBottom <= p.mapTop + 1, `controls (bottom ${p.ctrlBottom}) overlap the map (top ${p.mapTop})`); assert(p.mapH >= 280, `map ${p.mapH} px tall`); assert(Math.min(...p.toggles) >= 44, `toggle ${Math.min(...p.toggles)} px`); }
  await page.close();
  ({ page } = await openPage('desktop', 'compare', { wait: 1500 }));
  await page.evaluate(() => { document.getElementById('split').style.visibility = 'visible'; });
  const dk = await page.evaluate(() => { const p = document.querySelector('.pane'); const c = p.querySelector('.pane-controls').getBoundingClientRect(), m = p.querySelector('.map').getBoundingClientRect(); return { ctrlInsideMap: c.top >= m.top && c.bottom <= m.bottom && c.left >= m.left && c.right <= m.right, mapH: Math.round(m.height) }; });
  assert(dk.ctrlInsideMap && dk.mapH >= 400, `desktop layout unchanged: ${JSON.stringify(dk)}`);
  await page.close();
});
test('T0-PGF-17', 'Compare: the two map canvases have different accessible names (both were "Map", axe landmark-unique), left before right', async (t) => {
  const { page } = await openPage('desktop', 'compare', { wait: 2500 });
  const names = await page.evaluate(() => ['#map-a', '#map-b'].map((id) => { const c = document.querySelector(`${id} canvas`); return c ? (c.getAttribute('aria-label') || '') : null; }));
  t.note('canvas names', names);
  assert(names.every((n) => typeof n === 'string' && n.trim()), `a map canvas is missing or unnamed: ${JSON.stringify(names)}`);
  assert(names[0] !== names[1], `both canvases are named "${names[0]}"`);
  await page.close();
});
test('T0-PGF-18', 'Sandbox: the HYPOTHETICAL banner text is one box at 375, 320 and 1440 px (the inline span wrapped on a phone and its first line stuck out of the background)', async (t) => {
  const seen = {};
  for (const kind of ['phone', 'small', 'desktop']) {
    const { page } = await openPage(kind, 'sandbox', { wait: 600 });
    seen[kind] = await page.evaluate(() => { const sp = document.querySelector('#banner span'); const b = document.getElementById('banner').getBoundingClientRect(); const r = sp.getBoundingClientRect(); return { boxes: sp.getClientRects().length, inside: r.left >= b.left - 0.5 && r.right <= b.right + 0.5 && r.top >= b.top - 0.5 && r.bottom <= b.bottom + 0.5, w: Math.round(r.width), h: Math.round(r.height) }; });
    await page.close();
  }
  t.note('banner text box', seen);
  for (const [kind, v] of Object.entries(seen)) { assertEq(v.boxes, 1, `${kind}: the banner text is split into ${v.boxes} boxes`); assert(v.inside, `${kind}: the text box sticks out of the banner ${JSON.stringify(v)}`); }
});
test('T0-PGF-13', 'Ask the Historian opens at the top on a 320x568 phone (the greeting no longer scrolls the page under the sticky nav) and an answer is still scrolled into view', async () => {
  const { page } = await openPage('small', 'historian', { wait: 2500 });
  assertEq(await page.evaluate(() => Math.round(scrollY)), 0, 'scrollY after load');
  await page.fill('#ask', 'What happened to the 1st Minnesota?'); await page.keyboard.press('Enter'); await sleep(1500);
  const last = await page.evaluate(() => { const m = [...document.querySelectorAll('#transcript .msg')].pop().getBoundingClientRect(); return { top: Math.round(m.top), bottom: Math.round(m.bottom), vh: innerHeight, n: document.querySelectorAll('#transcript .msg').length }; });
  assert(last.n >= 3 && last.bottom > 0 && last.top < last.vh, `answer not on screen: ${JSON.stringify(last)}`);
  await page.close();
}, { red: false });   // not red-first: the greeting's scrollIntoView only moves the page once the layout is taller than a 320x568 screen, which the 44 px targets cause; this guards that fix (PGF-historian-greeting-scroll)
test('T0-PGF-14', 'Privacy: a table that scrolls sideways can be reached with the keyboard (focusable, named region)', async () => {
  const { page } = await openPage('phone', 'privacy', { wait: 800 });
  const w = await page.evaluate(() => [...document.querySelectorAll('.tablewrap')].map((e) => ({ tabindex: e.getAttribute('tabindex'), role: e.getAttribute('role'), label: !!e.getAttribute('aria-label'), scrolls: e.scrollWidth > e.clientWidth })));
  if (!w.length) throw new Skip('this privacy.html has no table (PG-legal is not in this train)');
  for (const x of w) if (x.scrolls) assertEq({ tabindex: x.tabindex, role: x.role, label: x.label }, { tabindex: '0', role: 'region', label: true }, 'scrollable table wrapper');
  await page.close();
}, { red: false });

// ------------------------------------------------------------------------------------------------------------------ sandbox (real Mapbox, harness Referer)
const merc = (lng, lat, zoom) => { const s = 512 * 2 ** zoom; const x = (lng + 180) / 360 * s; const y = (0.5 - Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) / (2 * Math.PI)) * s; return [x, y]; };
test('T0-PGF-15', 'Sandbox at 1280x720: the disposition pop-up opens inside the map (never over the Reset button) and Reset is still clickable', async (t) => {
  const L = await getLab(); const S = await session('d1280', 'inject');
  const page = await S.newPage(); await emulateViewport(page, VPS.d1280);
  await page.goto(`${L.url}/sandbox.html`, { waitUntil: 'load' });
  await waitFor(() => page.evaluate(() => !!document.querySelector('#map canvas')), { timeout: 30000, label: 'map canvas' });
  await sleep(6000);   // style, tiles and the first unit layer
  const data = JSON.parse(fs.readFileSync(path.join(REPO, 'legacy', 'dist', 'data', 'placements_day2_ticks226_300.json'), 'utf8'));
  const box = await page.evaluate(() => { const r = document.getElementById('map').getBoundingClientRect(); return { x: r.x + scrollX, y: r.y + scrollY, w: r.width, h: r.height }; });
  const [cx, cy] = merc(-77.235, 39.81, 13);
  const latest = new Map(); for (const p of data.placements) if (p.tick <= 260 && (!latest.get(p.unit_id) || latest.get(p.unit_id).tick <= p.tick)) latest.set(p.unit_id, p);
  const pts = [...latest.values()].map((p) => { const [x, y] = merc(p.lng, p.lat, 13); return { id: p.unit_id, x: x - cx + box.w / 2, y: y - cy + box.h / 2 }; }).filter((p) => p.x > 40 && p.x < box.w - 260 && p.y > 20 && p.y < box.h - 160);
  assert(pts.length > 3, `units on screen: ${pts.length}`);
  pts.sort((a, b) => a.y - b.y);
  const resetRect = await page.evaluate(() => { const r = document.getElementById('reset-btn').getBoundingClientRect(); return { x: r.x + scrollX, y: r.y + scrollY, w: r.width, h: r.height }; });
  const results = [];
  for (const pt of [pts[0], pts[Math.floor(pts.length / 2)], pts[pts.length - 1]]) {
    await page.evaluate(() => { document.getElementById('edit-panel').style.display = 'none'; window.scrollTo(0, 0); });
    const vy = await page.evaluate(() => scrollY); const px = box.x + pt.x, py = box.y + pt.y - vy;
    await page.mouse.move(px, py); await page.mouse.down(); await page.mouse.move(px + 2, py + 2); await page.mouse.up(); await sleep(300);
    const r = await page.evaluate(() => {
      const p = document.getElementById('edit-panel'); if (getComputedStyle(p).display === 'none') return { shown: false };
      const b = p.getBoundingClientRect(); const m = document.getElementById('map').getBoundingClientRect(); const rb = document.getElementById('reset-btn').getBoundingClientRect();
      const top = document.elementFromPoint(rb.x + rb.width / 2, rb.y + rb.height / 2);
      return { shown: true, insideMap: b.left >= m.left - 1 && b.right <= m.right + 1 && b.top >= m.top - 1 && b.bottom <= m.bottom + 1, coversReset: !(top === document.getElementById('reset-btn') || document.getElementById('reset-btn').contains(top)), panel: [Math.round(b.left), Math.round(b.top), Math.round(b.right), Math.round(b.bottom)], map: [Math.round(m.left), Math.round(m.top), Math.round(m.right), Math.round(m.bottom)] };
    });
    results.push({ unit: pt.id, at: [Math.round(pt.x), Math.round(pt.y)], ...r });
  }
  t.note('pop-ups', results); t.note('reset button (page coordinates)', resetRect);
  assert(results.some((r) => r.shown), 'no unit could be selected by the real mouse (is the map loaded?)');
  for (const r of results) if (r.shown) { assert(r.insideMap, `pop-up outside the map: ${JSON.stringify(r)}`); assert(!r.coversReset, `pop-up covers Reset: ${JSON.stringify(r)}`); }
  await page.click('#reset-btn'); await sleep(200);
  await page.close();
  t.note('mapbox requests used', tileBudget.used);
});

// ------------------------------------------------------------------------------------------------------------------ requests
test('T0-PGF-16', 'no first-party URL is requested twice while any of the 24 sub-pages loads (375 and 1440 px); the map page\'s icon request reaches the server once', async (t) => {
  const bad = {};
  for (const kind of ['phone', 'desktop']) { const out = await collect(kind); Object.assign(bad, Object.fromEntries(Object.entries(problems(out, (r) => r.dups, SUBPAGES)).map(([k, v]) => [`${k}@${kind}`, v]))); }
  assertEq(bad, {}, 'duplicate first-party requests');
  const L = await getLab(); const before = L.state.requests.length;
  const { page } = await openPage('desktop', 'index', { wait: 2500 }); await page.close();
  const icons = L.state.requests.slice(before).filter((r) => r.path === '/icons/icon-192.png').length;
  t.note(`server requests for /icons/icon-192.png on one load of index.html (cache rule ${L.state.iconCache}; DevTools lists a second, cache-served entry for the link icon and the manifest icon)`, icons);
  assert(icons <= 1, `the server saw ${icons} requests for icon-192.png`);
}, { red: false });

// ------------------------------------------------------------------------------------------------------------------ run
const ids = [...RED];
let summary;
try {
  const filter = EXPECT_RED ? `^(${ids.filter((i) => !FILTER || new RegExp(FILTER, 'i').test(i)).join('|')})$` : FILTER;
  const outFile = IS_LEGACY ? path.join(TMP, 'test-pages-fixes-legacy.json') : path.join(path.dirname(DIST), 'test-pages-fixes.json');
  summary = await suite.run({ filter, outFile, extra: () => ({ dist: path.relative(REPO, DIST), mapboxBudget: { ...tileBudget } }) });
  console.log(`mapbox requests used this run: ${tileBudget.used} of ${tileBudget.cap}`);
} finally {
  for (const c of closers) { try { await c(); } catch { /* already closed */ } }
}
if (EXPECT_RED) {
  const allRed = summary.results.length > 0 && summary.results.every((r) => r.status === 'fail');
  console.log(allRed ? 'expected-red: every selected test failed on this tree (red-first proven)' : `expected-red VIOLATED: passed on this tree: ${summary.results.filter((r) => r.status !== 'fail').map((r) => r.id)}`);
  process.exit(allRed ? 0 : 1);
}
process.exit(summary.failed ? 1 : 0);
