// T0-MOB suite (chapter 02 WP-T0-08, exit criterion X5): the mobile shell of group C, proved in real Chrome with touch emulation and
// real CDP touch events over the viewport matrix (320x568 360x640 375x812 390x844 412x915 430x932 768x1024 + landscape 812x375 844x390
// 915x412).  Per element geometry checks (OFFSCREEN, OCCLUDED via elementFromPoint, TARGET_SIZE < 44) and SCREENSHOTS for a human review.
//
//   node tests/t0/mobile-matrix.spec.mjs                          run against release/R1b/dist (python tools/t0/build.py --train R1b first)
//   node tests/t0/mobile-matrix.spec.mjs --dist tmp/x/R1b/dist    any built tree
//   node tests/t0/mobile-matrix.spec.mjs --vp portrait|landscape|all|<id,id>   viewport subset (ids like 375x812)
//   node tests/t0/mobile-matrix.spec.mjs --filter 'MOB-0[1-3]'    test-id subset
//   node tests/t0/mobile-matrix.spec.mjs --shots <dir>            screenshot directory (default tmp/<agent>/shots)
//   node tests/t0/mobile-matrix.spec.mjs --slot 1                 parallel run: static server = base+2*slot, Chrome CDP = base+2*slot+1 (slot 0..4)
//   node tests/t0/mobile-matrix.spec.mjs --dist legacy/dist --expect-red --filter 'MOB-0[2-5]'   red-first proof on the legacy tree
//
// Env: T0_AGENT (scratch dir under tmp/, default grp-mobile-shell), T0_PORT_BASE (static server = base, Chrome CDP = base+1), T0_TILE_CAP
// (Mapbox requests per run, default 300; every request carries the production Referer through the harness side channel).
// Google Maps (Soldier's Eye View) requests are failed locally: this suite never loads the owner's Google Maps key.
process.env.T0_AGENT ||= 'grp-mobile-shell';
process.env.T0_PORT_BASE ||= '8340';
const L = await import('./lib.mjs');
const fs = await import('node:fs');
const path = await import('node:path');
const {
  REPO, TMP, PORT_BASE, openSession, createStaticServer, createSuite, assert, sleep, waitFor, waitForApp, mapView, touchTap, touchSwipe,
  touchPinch, emulateViewport, cdpFor, tileBudget, Skip,
} = L;

const argv = process.argv.slice(2);
const opt = (name, dflt) => { const i = argv.indexOf(`--${name}`); return i >= 0 ? (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true) : dflt; };
const DIST = path.resolve(REPO, opt('dist', 'release/R1b/dist'));
const FILTER = opt('filter', null);
const VPSEL = String(opt('vp', 'all'));
const EXPECT_RED = !!opt('expect-red', false);
const SLOT = Number(opt('slot', 0)) || 0;
const SHOTS = path.resolve(REPO, opt('shots', path.join(TMP, 'shots')));
const OUT = path.resolve(REPO, opt('out', path.join(TMP, 'mobile-matrix.json')));
if (!fs.existsSync(DIST)) { console.error(`dist not found: ${DIST}\nbuild it first: python tools/t0/build.py --train R1b`); process.exit(2); }
fs.mkdirSync(SHOTS, { recursive: true });

// ------------------------------------------------------------------ viewport matrix (chapter 02 section 2 + the task's extra widths)
const P = (w, h, dpr) => ({ id: `${w}x${h}`, width: w, height: h, dpr, mobile: true, landscape: w > h });
const MATRIX = [P(320, 568, 2), P(360, 640, 3), P(375, 812, 3), P(390, 844, 3), P(412, 915, 2.625), P(430, 932, 3), P(768, 1024, 2),
  P(812, 375, 3), P(844, 390, 3), P(915, 412, 2.625)];
const SEL = VPSEL === 'all' ? MATRIX : VPSEL === 'portrait' ? MATRIX.filter((v) => !v.landscape) : VPSEL === 'landscape' ? MATRIX.filter((v) => v.landscape)
  : MATRIX.filter((v) => VPSEL.split(',').includes(v.id));
const vpById = (id) => MATRIX.find((v) => v.id === id);
const inSel = (id) => SEL.some((v) => v.id === id);

const srv = await createStaticServer({ root: DIST, port: PORT_BASE + 2 * SLOT });
const ORIGIN = srv.url;
const IS_LEGACY = path.resolve(DIST) === path.resolve(REPO, 'legacy/dist');

// ------------------------------------------------------------------ probes injected before any page script
const chooserProbe = () => {
  window.__chooserSeen = false;
  const t = setInterval(() => {
    const r = document.getElementById('root');
    if (r && [...r.querySelectorAll('*')].some((e) => e.children.length === 0 && /Choose Your Experience/.test(e.textContent))) window.__chooserSeen = true;
  }, 40);
  setTimeout(() => clearInterval(t), 25000);
};
const audioProbe = () => {
  window.__audioCtx = 0;
  for (const n of ['AudioContext', 'webkitAudioContext']) {
    const C = window[n]; if (!C) continue;
    window[n] = new Proxy(C, { construct(t, a, nt) { window.__audioCtx++; return Reflect.construct(t, a, nt); } });
  }
};

const S = await openSession({ profile: `mob${SLOT}`, cdpPort: PORT_BASE + 2 * SLOT + 1, tiles: 'inject', initScripts: [chooserProbe, audioProbe] });
const sessions = [S];
const cleanup = async () => { for (const s of sessions.splice(0)) await s.close().catch(() => {}); await srv.close().catch(() => {}); };
process.on('SIGINT', () => { cleanup().finally(() => process.exit(130)); });

const NOISE = /maps\.googleapis|maps\.gstatic|Permissions policy violation|googleapis\.com\/maps/i;
const openTabs = new Set();
async function newTab(vp, { insets = null } = {}) {
  for (const p of openTabs) { await p.close().catch(() => {}); openTabs.delete(p); }
  const page = await S.newPage();
  openTabs.add(page);
  if (vp) await emulateViewport(page, vp);
  const c = await cdpFor(page);
  if (insets) await c.send('Emulation.setSafeAreaInsetsOverride', { insets }).catch((e) => { throw new Error(`setSafeAreaInsetsOverride: ${e.message}`); });
  // never load the owner's Google Maps key (Street View in Soldier's Eye View): fail those requests inside this page's own CDP session
  await c.send('Fetch.enable', { patterns: [{ urlPattern: 'https://maps.googleapis.com/*' }, { urlPattern: 'https://maps.gstatic.com/*' }] });
  c.on('Fetch.requestPaused', (e) => { c.send('Fetch.failRequest', { requestId: e.requestId, errorReason: 'BlockedByClient' }).catch(() => {}); });
  return page;
}
async function waitMapIdle(page, timeout = 20000) {
  try {
    await waitFor(async () => { await mapView(page); return page.evaluate(() => !!(window.__t0map && window.__t0map.loaded() && window.__t0map.areTilesLoaded())); }, { timeout, interval: 300, label: 'map tiles loaded' });
  } catch { /* tiles capped or slow: the geometry checks do not need them */ }
  await sleep(600);
}
async function loadApp(vp, { query = '', insets = null, idle = true } = {}) {
  const page = await newTab(vp, { insets });
  await page.goto(`${ORIGIN}/${query}`, { waitUntil: 'load' });
  await waitForApp(page, 45000);
  if (idle) await waitMapIdle(page); else await sleep(800);
  return page;
}
const shot = async (page, name) => { const f = path.join(SHOTS, `${name}.png`); await page.screenshot({ path: f }); return f; };
const layoutOf = (page) => page.evaluate(() => document.documentElement.getAttribute('data-layout'));

// tick number: the dock prints "Tick n/675" on portrait phones; landscape hides that label, so fall back to the scrubber thumb position
const readTick = (page) => page.evaluate(() => {
  const m = document.body.innerText.match(/Tick (\d+)\/675/); if (m) return m[1];
  const th = document.querySelector('.gtbg-m-scrub > div:last-child'); const pc = th && parseFloat(th.style.left);
  return Number.isFinite(pc) ? String(Math.round((pc / 100) * 675)) : undefined;
});

// real touch tap in the middle of a locator (scrolls it into view first); reports what is topmost there
async function tapEl(page, loc, { scroll = true } = {}) {
  if (scroll) await loc.scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => {});
  const b = await loc.boundingBox();
  if (!b) throw new Error('tapEl: element has no box');
  const x = b.x + b.width / 2, y = b.y + b.height / 2;
  const top = await page.evaluate(([px, py]) => { const t = document.elementFromPoint(px, py); return t ? `${t.tagName.toLowerCase()}.${String(t.className).slice(0, 30)}` : null; }, [x, y]);
  await touchTap(page, x, y);
  return { x, y, top };
}

// ------------------------------------------------------------------ in-page geometry audit (serialised into page.evaluate)
// per visible interactive element: OFFSCREEN (rect leaves the viewport), OCCLUDED (elementFromPoint at the centre is not the element),
// PARTIAL (< 60 % of a 3x3 sample grid hits it), TARGET_SIZE (< 44 px on the short side), SCROLLED_OUT (hidden by a scroll container).
function auditInPage({ root, selector, ignoreSel }) {
  const sel = selector || 'button, a[href], input, select, textarea, [role="button"], [role="slider"], [role="tab"], [role="checkbox"], summary, .gtbg-m-scrub';
  const scope = root ? document.querySelector(root) : document;
  if (!scope) return { missing: true, items: [] };
  const vw = innerWidth, vh = innerHeight;
  const desc = (e) => `${e.tagName.toLowerCase()}${e.id ? '#' + e.id : ''}${e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : ''}`;
  const label = (e) => (e.getAttribute('aria-label') || e.title || e.innerText || e.value || e.getAttribute('placeholder') || '').replace(/\s+/g, ' ').trim().slice(0, 40);
  const items = [];
  for (const el of scope.querySelectorAll(sel)) {
    if (ignoreSel && el.closest(ignoreSel)) continue;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) continue;
    if (el.closest('[aria-hidden="true"]') && !el.matches('button, a, input')) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    let clip = { l: 0, t: 0, r: vw, b: vh }, scroller = false;
    for (let p = el.parentElement; p && p !== document.documentElement; p = p.parentElement) {
      const pcs = getComputedStyle(p);
      if (/(auto|scroll)/.test(pcs.overflowX + pcs.overflowY)) {
        scroller = true;
        const pr = p.getBoundingClientRect();
        clip = { l: Math.max(clip.l, pr.left), t: Math.max(clip.t, pr.top), r: Math.min(clip.r, pr.right), b: Math.min(clip.b, pr.bottom) };
      }
    }
    const vis = Math.max(0, Math.min(r.right, clip.r) - Math.max(r.left, clip.l)) * Math.max(0, Math.min(r.bottom, clip.b) - Math.max(r.top, clip.t));
    const frac = vis / (r.width * r.height);
    const issues = [];
    const out = r.left < -1 || r.top < -1 || r.right > vw + 1 || r.bottom > vh + 1;
    if (scroller && frac < 0.5) issues.push('SCROLLED_OUT');
    else if (out) issues.push('OFFSCREEN');
    if (!issues.length || issues[0] === 'OFFSCREEN') {
      const hitAt = (x, y) => { const t = document.elementFromPoint(x, y); return !!t && (t === el || el.contains(t) || (t.contains(el) && cs.pointerEvents === 'none')); };
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      if (cx >= 0 && cy >= 0 && cx <= vw && cy <= vh && !hitAt(cx, cy)) {
        const t = document.elementFromPoint(cx, cy);
        issues.push(`OCCLUDED(by ${t ? desc(t) : 'nothing'})`);
      } else {
        let n = 0, hit = 0;
        for (const fx of [0.2, 0.5, 0.8]) for (const fy of [0.2, 0.5, 0.8]) { const x = r.left + r.width * fx, y = r.top + r.height * fy; if (x < 0 || y < 0 || x > vw || y > vh) continue; n++; if (hitAt(x, y)) hit++; }
        if (n && hit / n < 0.6) issues.push(`PARTIAL(${hit}/${n})`);
      }
    }
    if (Math.min(r.width, r.height) < 43.5) issues.push(`TARGET_SIZE(${Math.round(r.width)}x${Math.round(r.height)})`);
    items.push({ el: desc(el), label: label(el), x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), scroller, issues });
  }
  return { items };
}
// a11y skip links (a.gt-skip) sit above the viewport until focused: intentional, not a defect
const audit = (page, opts = {}) => page.evaluate(auditInPage, { ...opts, ignoreSel: [opts.ignoreSel, '.gt-skip'].filter(Boolean).join(', ') });

// topmost panel located by its title text: rect, viewport containment, 3x3 hit samples, close-control candidates
function panelProbeInPage({ text }) {
  const vw = innerWidth, vh = innerHeight;
  const norm = (s) => s.replace(/\s+/g, ' ').trim().toLowerCase();
  const want = norm(text);
  let title = null;
  for (const e of document.querySelectorAll('#root *')) {
    if (e.closest('.gtbg-m-toolspanel')) continue;
    const n = norm(e.textContent || '');
    if (n.includes(want) && n.length <= want.length + 16 && e.children.length <= 3) { const r = e.getBoundingClientRect(); if (r.width > 0 && r.height > 0) { title = e; break; } }
  }
  if (!title) return null;
  let root = null;
  for (let p = title; p && p !== document.body; p = p.parentElement) {
    const cs = getComputedStyle(p), r = p.getBoundingClientRect();
    if ((cs.position === 'fixed' || cs.position === 'absolute') && r.width >= 120 && r.height >= 60 && !p.classList.contains('gtbg-m-root') && p.id !== 'root') { root = p; break; }
  }
  if (!root) return { found: true, root: false };
  const r = root.getBoundingClientRect(), cs = getComputedStyle(root);
  let n = 0, hit = 0;
  for (const fx of [0.15, 0.5, 0.85]) for (const fy of [0.15, 0.5, 0.85]) {
    const x = r.left + r.width * fx, y = r.top + r.height * fy; if (x < 0 || y < 0 || x >= vw || y >= vh) continue;
    n++; const t = document.elementFromPoint(x, y); if (t && root.contains(t)) hit++;
  }
  const closes = [];
  for (const b of root.querySelectorAll('button, a[href], [role="button"]')) {
    const txt = (b.textContent || '').trim(), al = b.getAttribute('aria-label') || '';
    if (/^(✕|✖|×|x|close|←.*|‹.*)$/i.test(txt) || /close|back/i.test(al)) {
      const br = b.getBoundingClientRect(); if (br.width < 1) continue;
      const t = document.elementFromPoint(br.left + br.width / 2, br.top + br.height / 2);
      closes.push({ text: txt.slice(0, 20), aria: al, x: Math.round(br.x), y: Math.round(br.y), w: Math.round(br.width), h: Math.round(br.height), hit: !!t && (t === b || b.contains(t)) });
    }
  }
  return { found: true, root: true, z: cs.zIndex, x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),
    inViewport: r.left >= -1 && r.top >= -1 && r.right <= vw + 1 && r.bottom <= vh + 1, hit, samples: n, closes };
}

// ------------------------------------------------------------------ the Tools sheet (14 tiles) and its panels
const TILE_LABELS = ['Search', 'Filter', 'Order of Battle', 'Unit Roster', "Soldier's View", 'Follow Ancestor', 'Map Layers', 'Virtual Walkthrough',
  'Legend', 'Bookmarks', 'Help', 'Mini Map', 'Ask the Historian', 'Desktop View'];
const PANELS = [
  { key: 'search', tile: 'Search', text: 'Search Units' },
  { key: 'filter', tile: 'Filter', text: 'Filters' },
  { key: 'oob', tile: 'Order of Battle', text: 'Order of Battle' },
  { key: 'roster', tile: 'Unit Roster', text: 'All Battle Units' },
  { key: 'soldier', tile: "Soldier's View", text: "Soldier's Eye View" },
  { key: 'ancestor', tile: 'Follow Ancestor', text: 'Follow Your Ancestor' },
  { key: 'layers', tile: 'Map Layers', text: 'Map Layers' },
  { key: 'legend', tile: 'Legend', text: 'Disposition Legend' },
  { key: 'bookmarks', tile: 'Bookmarks', text: 'Bookmarks & Sharing' },
  { key: 'help', tile: 'Help', text: 'Keyboard Shortcuts' },
  { key: 'walkthrough', tile: 'Virtual Walkthrough', text: 'Virtual Walkthrough', wait: 3500, tilesNeeded: true },
];
const WALK_VP = new Set(['320x568', '375x812', '768x1024', '812x375', '915x412']);      // the walkthrough builds a 2nd Mapbox map: keep the tile budget
const toolsBtn = (page) => page.locator('.gtbg-m-top button', { hasText: 'Tools' }).first();
const toolsPanel = (page) => page.locator('.gtbg-m-toolspanel');
const tileBtn = (page, label) => page.locator('.gtbg-m-toolspanel button').filter({ has: page.getByText(label, { exact: true }) }).first();
const openTools = async (page) => { await tapEl(page, toolsBtn(page)); await toolsPanel(page).waitFor({ state: 'visible', timeout: 5000 }); await sleep(250); };
const closeTools = async (page) => { await tapEl(page, page.locator('.gtbg-m-toolspanel button[aria-label="Close tools"]')); await sleep(300); };
async function reloadBase(page) { await page.reload({ waitUntil: 'load' }); await waitForApp(page, 45000); await sleep(1500); }

// ------------------------------------------------------------------ per-viewport data collected once and asserted by several tests
const R = {};       // R[vpid] = { base, tools, panels, ... }
async function collect(vp) {
  if (R[vp.id]) return R[vp.id];
  const rec = R[vp.id] = { vp: vp.id, errors: [], shots: [] };
  S.collector.clear();
  const tilesBefore = tileBudget.used;
  const mark = S.net.mark();
  const page = await loadApp(vp);
  rec.layout = await layoutOf(page);
  rec.env = await page.evaluate(() => ({ w: innerWidth, h: innerHeight, dpr: devicePixelRatio, coarse: matchMedia('(pointer: coarse)').matches, dl: document.documentElement.dataset.layout }));
  rec.chooserSeen = await page.evaluate(() => window.__chooserSeen);
  rec.styleRequests = S.net.find(/^https:\/\/api\.mapbox\.com\/styles\/v1\/mapbox\/satellite-v9\?/, mark).length;
  rec.mapContainers = await page.evaluate(() => document.querySelectorAll('.mapboxgl-map').length);
  rec.mapCanvases = await page.evaluate(() => document.querySelectorAll('canvas.mapboxgl-canvas').length);
  rec.desktopSignatures = await page.evaluate(() => {
    const txt = (re) => [...document.querySelectorAll('#root *')].some((e) => e.children.length === 0 && re.test(e.textContent));
    return {
      rangeInputs: document.querySelectorAll('input[type=range]').length,
      timelineIO: document.querySelectorAll('#root input[type=range], #root [role=slider]').length,
      toggleUnits: txt(/^Toggle Units$/), tutorialPdf: txt(/Download Website Tutorial PDF/), desktopTitle: txt(/^GETTYSBURG$/),
      desktopWalkthroughBtn: [...document.querySelectorAll('#root button')].some((b) => /🗺 Virtual Walkthrough/.test(b.textContent) && !b.closest('.gtbg-m-toolspanel')),
      monumentsOverlay: !!document.getElementById('gtbg-monuments-overlay'),
      efVisible: (() => { const e = document.getElementById('extra-features'); return !!e && e.getBoundingClientRect().width > 0; })(),
      toolbarButtons: [...document.querySelectorAll('#root button[title]')].map((b) => b.title).filter((x) => /^(Search|Filter|Unit Roster|Legend|Monuments|Soldier's Eye View.*|Follow Your Ancestor|Distance Tool|Map Layers|Locations|Find Unit \/ Location|Bookmarks|Help)$/.test(x)),
      overlayCanvasAuto: [...document.querySelectorAll('#root canvas')].filter((c) => !c.classList.contains('mapboxgl-canvas') && getComputedStyle(c).pointerEvents !== 'none').length,
      overlayCanvases: [...document.querySelectorAll('#root canvas')].filter((c) => !c.classList.contains('mapboxgl-canvas')).length,
      audioContexts: window.__audioCtx,
    };
  });
  // ---- base state
  rec.base = await audit(page);
  rec.baseNamed = await page.evaluate(() => {
    const q = (s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), hit: !!t && (t === e || e.contains(t)), inViewport: r.left >= -1 && r.top >= -1 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1 }; };
    return { stepBack: q('button[aria-label="Step back 5 minutes"]'), play: q('button[aria-label="Play"], button[aria-label="Pause"]'), stepFwd: q('button[aria-label="Step forward 5 minutes"]'),
      speed: q('button[aria-label^="Playback speed"]'), tools: q('.gtbg-m-top button'), scrub: q('.gtbg-m-scrub'), days: [...document.querySelectorAll('.gtbg-m-days button')].map((b, i) => q(`.gtbg-m-days button:nth-child(${i + 1})`)),
      map: q('.gtbg-m-map'), dock: q('.gtbg-m-dock'), top: q('.gtbg-m-top'), attribution: q('.mapboxgl-ctrl-attrib-button'), dockOverflow: (() => { const d = document.querySelector('.gtbg-m-dock'); return d ? [d.scrollWidth - d.clientWidth, d.scrollHeight - d.clientHeight] : null; })() };
  });
  rec.mapFraction = rec.baseNamed.map ? rec.baseNamed.map.h / rec.env.h : 0;
  rec.shots.push(await shot(page, `${vp.id}-01-base`));
  // ---- Tools sheet
  await openTools(page);
  rec.toolsAudit = await audit(page, { root: '.gtbg-m-toolspanel' });
  const tileInfo = await page.evaluate((labels) => {
    const panel = document.querySelector('.gtbg-m-toolspanel');
    const btns = [...panel.querySelectorAll('button')].filter((b) => b.getAttribute('aria-label') !== 'Close tools');
    const grid = btns[0] && btns[0].parentElement;
    return { count: btns.length, labels: btns.map((b) => (b.querySelector('span:last-child') || b).textContent.trim()), gridScroll: grid ? [grid.scrollHeight, grid.clientHeight] : null,
      panel: (() => { const r = panel.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), maxHeight: getComputedStyle(panel).maxHeight, innerHeight }; })() };
  }, TILE_LABELS);
  rec.tools = tileInfo;
  rec.shots.push(await shot(page, `${vp.id}-02-tools`));
  // reachability of every tile and of the close control: scroll into view then elementFromPoint; the 14 tiles + Extra Features links
  rec.tileReach = await page.evaluate(() => {
    const panel = document.querySelector('.gtbg-m-toolspanel');
    const check = (b) => { b.scrollIntoView({ block: 'center' }); const r = b.getBoundingClientRect(); const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      const pr = panel.getBoundingClientRect();
      return { label: (b.getAttribute('aria-label') || b.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 30), w: Math.round(r.width), h: Math.round(r.height), hit: !!t && (t === b || b.contains(t)), inViewport: r.left >= -1 && r.top >= -1 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1, inPanel: r.top >= pr.top - 1 && r.bottom <= pr.bottom + 1 }; };
    const tiles = [...panel.querySelectorAll('button')].map(check);
    const links = [...panel.querySelectorAll('.gtbg-mp-more a')].map(check);
    return { tiles, links };
  });
  // a REAL touch swipe on the grid scrolls it (touch-action of the sheet must not be `none`)
  if (rec.tools.gridScroll && rec.tools.gridScroll[0] > rec.tools.gridScroll[1] + 4) {
    await page.evaluate(() => { const g = document.querySelector('.gtbg-m-toolspanel button:not([aria-label="Close tools"])').parentElement; g.scrollTop = 0; });
    const gb = await page.evaluate(() => { const r = document.querySelector('.gtbg-m-toolspanel button:not([aria-label="Close tools"])').parentElement.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height * 0.75, h: r.height }; });
    await touchSwipe(page, [gb.x, gb.y], [gb.x, gb.y - gb.h * 0.6], { steps: 12, stepMs: 16 });
    await sleep(500);
    rec.gridTouchScroll = await page.evaluate(() => document.querySelector('.gtbg-m-toolspanel button:not([aria-label="Close tools"])').parentElement.scrollTop);
    rec.shots.push(await shot(page, `${vp.id}-03-tools-scrolled`));
    await page.evaluate(() => { const g = document.querySelector('.gtbg-m-toolspanel button:not([aria-label="Close tools"])').parentElement; g.scrollTop = g.scrollHeight; });
    await sleep(200);
    rec.shots.push(await shot(page, `${vp.id}-03b-tools-bottom`));
  }
  await closeTools(page);
  rec.toolsClosed = (await toolsPanel(page).count()) === 0;
  // ---- panels (each opened by a real touch on its tile, closed by a real touch on its own close control)
  rec.panels = {};
  let dirty = false;
  for (const pn of PANELS) {
    if (pn.tilesNeeded && !WALK_VP.has(vp.id)) { rec.panels[pn.key] = { skipped: 'tile budget: walkthrough map only on a subset of viewports' }; continue; }
    const pr = rec.panels[pn.key] = {};
    try {
      if (dirty) { await reloadBase(page); dirty = false; }
      await openTools(page);
      pr.tap = await tapEl(page, tileBtn(page, pn.tile));
      await sleep(pn.wait || 1300);
      const probe = await page.evaluate(panelProbeInPage, { text: pn.text });
      pr.probe = probe;
      if (pn.key === 'layers') pr.controls = await audit(page, { root: null, selector: 'input[type=checkbox], button', ignoreSel: '.gtbg-m-root' });
      pr.shot = await shot(page, `${vp.id}-10-${pn.key}`);
      if (pn.key === 'walkthrough') {
        pr.walk = await page.evaluate(() => { const e = document.getElementById('gtbg-wt-map'); if (!e) return null; const r = e.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), isMap: e.classList.contains('mapboxgl-map'), canvas: !!e.querySelector('canvas'), attrib: !!e.querySelector('.mapboxgl-ctrl-attrib') }; });
      }
      if (probe && probe.root && probe.closes.length) {
        const c = probe.closes.find((x) => x.hit) || probe.closes[0];
        await touchTap(page, c.x + c.w / 2, c.y + c.h / 2);
        await sleep(600);
        pr.closedByTouch = !(await page.evaluate(panelProbeInPage, { text: pn.text }));
      }
      if (!pr.closedByTouch) dirty = true;
    } catch (e) { pr.error = String(e.message || e).split('\n')[0].slice(0, 200); dirty = true; }
  }
  if (dirty) { await reloadBase(page); dirty = false; }
  // ---- Ask the Historian tile navigates to /historian.html; Desktop View switches layout
  rec.historian = {};
  try {
    await openTools(page);
    await tapEl(page, tileBtn(page, 'Ask the Historian'));
    await waitFor(() => /\/historian(\.html)?$/.test(page.url()), { timeout: 8000, label: 'navigation to /historian' });
    rec.historian.url = page.url();
  } catch (e) { rec.historian.error = String(e.message).slice(0, 160); }
  const errs = S.collector.firstParty.filter((e) => !NOISE.test(e.text + (e.url || '')));
  rec.errors = errs;
  rec.tiles = tileBudget.used - tilesBefore;
  return rec;
}

// ------------------------------------------------------------------ helpers for assertions
const bad = (arr) => arr.filter(Boolean);
const fail = (lines, t) => { if (t) t.note('problems', lines); if (lines.length) { console.log(`      --- ${lines.length} problem(s):\n      ${lines.join('\n      ')}`); throw new Error(`${lines.length} problem(s), listed above`); } };
const suite = createSuite('mobile-matrix');

// T0-MOB-01 layout auto-detect (?layout=, session override, media query, rotation) -- no map needed, tiles stay local
suite.test('T0-MOB-01', 'layout auto-detect: data-layout, (max-width:834px)/(max-height:480px) + coarse pointer, ?layout= override, session override, rotation', async (t) => {
  const problems = [], seen = {};
  S.setTiles('block');
  try {
    const expectMobile = [...MATRIX, P(834, 1112, 2)];
    for (const vp of expectMobile) {
      if (vp.width === 834 || SEL.some((s) => s.id === vp.id)) {
        const page = await loadApp(vp, { idle: false });
        const lay = await layoutOf(page); seen[vp.id] = lay;
        if (lay !== 'mobile') problems.push(`${vp.id}: data-layout=${lay}, want mobile`);
        if (await page.evaluate(() => window.__chooserSeen)) problems.push(`${vp.id}: "Choose Your Experience" was shown`);
      }
    }
    // data-layout is decided by a tiny inline script before first paint (no flash of the desktop-only Extra Features overlay on phones)
    for (const [label, vp, query, want] of [['375x812', P(375, 812, 3), '', 'mobile'], ['1440x900 mouse', { id: 'd', width: 1440, height: 900, dpr: 1, mobile: false }, '', 'desktop'],
      ['375x812 ?layout=desktop', P(375, 812, 3), '?layout=desktop', 'desktop'], ['844x390', P(844, 390, 3), '', 'mobile']]) {
      const pg = await newTab(vp);
      await pg.goto(`${ORIGIN}/${query}`, { waitUntil: 'domcontentloaded' });
      const early = await layoutOf(pg); seen[`early ${label}`] = early;
      if (early !== want) problems.push(`data-layout at DOMContentLoaded (${label}): ${early}, want ${want} (set by an inline head script, not only by React)`);
    }
    // just above the media query: a coarse-pointer 835 px wide tablet is desktop (documented deviation from D-SHELL, chapter 02 section 14 item 14)
    let page = await loadApp(P(835, 1112, 2), { idle: false });
    seen['835x1112'] = await layoutOf(page); if (seen['835x1112'] !== 'desktop') problems.push(`835x1112 coarse: data-layout=${seen['835x1112']}, want desktop`);
    page = await loadApp(P(1024, 768, 2), { idle: false });
    seen['1024x768 coarse'] = await layoutOf(page); if (seen['1024x768 coarse'] !== 'desktop') problems.push(`1024x768 coarse tablet landscape: ${seen['1024x768 coarse']}, want desktop`);
    // non-touch desktop windows are desktop whatever the size
    S.collector.clear();
    page = await loadApp({ id: 'd', width: 1440, height: 900, dpr: 1, mobile: false }, { idle: false });
    seen['1440x900 mouse'] = await layoutOf(page); if (seen['1440x900 mouse'] !== 'desktop') problems.push(`1440x900 mouse: ${seen['1440x900 mouse']}, want desktop`);
    // the desktop shell must still be the desktop shell (group C gates overlays by layout): toolbar, timeline slider, one map, no mobile root
    const dsk = await page.evaluate(() => ({ titled: document.querySelectorAll('#root button[title]').length, range: document.querySelectorAll('#root input[type=range]').length, maps: document.querySelectorAll('.mapboxgl-map').length, mobileRoot: !!document.querySelector('.gtbg-m-root'), toggleUnits: [...document.querySelectorAll('#root button')].some((b) => b.textContent.trim() === 'Toggle Units') }));
    seen.desktopShell = dsk;
    if (dsk.titled < 10 || dsk.range < 1 || dsk.maps !== 1 || dsk.mobileRoot || !dsk.toggleUnits) problems.push(`desktop layout at 1440x900 is not the desktop shell: ${JSON.stringify(dsk)}`);
    const derr = S.collector.firstParty.filter((e) => !NOISE.test(e.text + (e.url || '')));
    if (derr.length) problems.push(`desktop layout load raised ${derr.length} error(s): ${JSON.stringify(derr.slice(0, 2))}`);
    page = await loadApp({ id: 'n', width: 700, height: 800, dpr: 1, mobile: false }, { idle: false });
    seen['700x800 mouse'] = await layoutOf(page); if (seen['700x800 mouse'] !== 'desktop') problems.push(`700x800 narrow desktop window (mouse): ${seen['700x800 mouse']}, want desktop`);
    // ?layout= override wins over the media query, both ways; junk is ignored
    page = await loadApp(P(375, 812, 3), { query: '?layout=desktop', idle: false });
    seen['375x812 ?layout=desktop'] = await layoutOf(page); if (seen['375x812 ?layout=desktop'] !== 'desktop') problems.push(`?layout=desktop at 375x812: ${seen['375x812 ?layout=desktop']}`);
    page = await loadApp({ id: 'd', width: 1440, height: 900, dpr: 1, mobile: false }, { query: '?layout=mobile', idle: false });
    seen['1440x900 ?layout=mobile'] = await layoutOf(page); if (seen['1440x900 ?layout=mobile'] !== 'mobile') problems.push(`?layout=mobile at 1440x900: ${seen['1440x900 ?layout=mobile']}`);
    page = await loadApp(P(375, 812, 3), { query: '?layout=banana', idle: false });
    seen['?layout=banana'] = await layoutOf(page); if (seen['?layout=banana'] !== 'mobile') problems.push(`?layout=banana at 375x812 should fall back to auto (mobile): ${seen['?layout=banana']}`);
    // session override: "Desktop View" tile persists in sessionStorage, survives reload in the same tab, a new tab starts fresh
    page = await loadApp(P(375, 812, 3), { idle: false });
    await openTools(page); await tapEl(page, tileBtn(page, 'Desktop View')); await sleep(1200);
    seen.afterDesktopView = { layout: await layoutOf(page), stored: await page.evaluate(() => sessionStorage.getItem('gtbg_layout')) };
    if (seen.afterDesktopView.layout !== 'desktop' || seen.afterDesktopView.stored !== 'desktop') problems.push(`Desktop View tile: ${JSON.stringify(seen.afterDesktopView)}`);
    await page.reload({ waitUntil: 'load' }); await waitForApp(page, 45000); await sleep(600);
    seen.afterReload = await layoutOf(page); if (seen.afterReload !== 'desktop') problems.push(`session override lost on reload: ${seen.afterReload}`);
    // an explicit override is not re-evaluated by a rotation
    await emulateViewport(page, P(812, 375, 3)); await sleep(700);
    seen.overrideRotation = await layoutOf(page); if (seen.overrideRotation !== 'desktop') problems.push(`override flipped by rotation: ${seen.overrideRotation}`);
    // rotation without an override re-evaluates live (listener), without a reload
    page = await loadApp(P(812, 375, 3), { idle: false });
    await page.evaluate(() => { window.__noReload = 1; });
    const seq = [];
    for (const vp of [P(375, 812, 3), P(812, 375, 3), P(768, 1024, 2), P(1024, 768, 2), P(768, 1024, 2)]) {
      await emulateViewport(page, vp); await sleep(900);
      seq.push([vp.id, await layoutOf(page), await page.evaluate(() => window.__noReload === 1 && document.querySelectorAll('.mapboxgl-map').length)]);
    }
    seen.rotation = seq;
    const want = ['mobile', 'mobile', 'mobile', 'desktop', 'mobile'];
    seq.forEach(([id, lay, maps], i) => { if (lay !== want[i]) problems.push(`rotation to ${id}: data-layout=${lay}, want ${want[i]}`); if (maps !== 1) problems.push(`rotation to ${id}: ${maps} Mapbox map containers (want exactly 1; false = page reloaded)`); });
  } finally { S.setTiles('inject'); }
  t.note('layouts', seen);
  fail(problems, t);
});

// T0-MOB-02 dock: 4 transport buttons hit-testable and >= 44 px; scrubber, Tools, day tabs, attribution all >= 44 px, unoccluded, on screen
suite.test('T0-MOB-02', 'mobile dock: 4 transport buttons + scrubber + Tools + day tabs pass elementFromPoint, >= 44 px, on screen (all viewports)', async (t) => {
  const lines = [];
  for (const vp of SEL) {
    const r = await collect(vp);
    const n = r.baseNamed;
    for (const k of ['stepBack', 'play', 'stepFwd', 'speed', 'tools', 'scrub']) {
      const e = n[k];
      if (!e) { lines.push(`${vp.id} ${k}: not found`); continue; }
      if (Math.min(e.w, e.h) < 44) lines.push(`${vp.id} ${k}: TARGET_SIZE ${e.w}x${e.h}`);
      if (!e.hit) lines.push(`${vp.id} ${k}: OCCLUDED at [${e.x},${e.y}]`);
      if (!e.inViewport) lines.push(`${vp.id} ${k}: OFFSCREEN [${e.x},${e.y} ${e.w}x${e.h}] in ${r.env.w}x${r.env.h}`);
    }
    if (!vp.landscape) {
      if (n.days.length !== 3) lines.push(`${vp.id} day tabs: ${n.days.length}, want 3`);
      n.days.forEach((e, i) => { if (!e) return; if (Math.min(e.w, e.h) < 44) lines.push(`${vp.id} day tab ${i + 1}: TARGET_SIZE ${e.w}x${e.h}`); if (!e.hit) lines.push(`${vp.id} day tab ${i + 1}: OCCLUDED`); });
    }
    if (n.attribution && Math.min(n.attribution.w, n.attribution.h) < 44) lines.push(`${vp.id} attribution button: TARGET_SIZE ${n.attribution.w}x${n.attribution.h}`);
    // generic audit of everything interactive in the base state
    for (const it of r.base.items) {
      const own = it.issues.filter((x) => !/^PARTIAL/.test(x));
      if (own.length) lines.push(`${vp.id} [${it.el} "${it.label}" ${it.w}x${it.h}@${it.x},${it.y}] ${own.join(' ')}`);
    }
    t.note(`${vp.id} transport`, ['stepBack', 'play', 'stepFwd', 'speed'].map((k) => n[k] && `${n[k].w}x${n[k].h}${n[k].hit ? '' : ' OCCLUDED'}`).join(' / '));
  }
  fail(lines, t);
});

// T0-MOB-03 the Tools sheet: 14 tiles, all reachable (scrolling grid), 44 px close, real-touch scroll, Extra Features groups
suite.test('T0-MOB-03', 'Tools sheet: 14 tiles + 44 px close + Extra Features groups pass elementFromPoint (scrolling grid; real touch scroll)', async (t) => {
  const lines = [];
  for (const vp of SEL) {
    const r = await collect(vp);
    if (r.tools.count !== 14) lines.push(`${vp.id}: ${r.tools.count} tiles, want 14 (${r.tools.labels.join(', ')})`);
    else if (JSON.stringify(r.tools.labels) !== JSON.stringify(TILE_LABELS)) lines.push(`${vp.id}: tile labels ${JSON.stringify(r.tools.labels)}`);
    const closeItem = r.tileReach.tiles.find((x) => /Close tools/i.test(x.label));
    if (!closeItem) lines.push(`${vp.id}: no "Close tools" control`); else { if (Math.min(closeItem.w, closeItem.h) < 44) lines.push(`${vp.id}: close ${closeItem.w}x${closeItem.h} < 44`); if (!closeItem.hit || !closeItem.inViewport) lines.push(`${vp.id}: close not hit-testable/on screen`); }
    for (const x of r.tileReach.tiles) { if (!x.hit || !x.inViewport || !x.inPanel) lines.push(`${vp.id} tile "${x.label}": ${!x.hit ? 'OCCLUDED ' : ''}${!x.inViewport ? 'OFFSCREEN ' : ''}${!x.inPanel ? 'OUTSIDE_PANEL' : ''}`); if (Math.min(x.w, x.h) < 44) lines.push(`${vp.id} tile "${x.label}": TARGET_SIZE ${x.w}x${x.h}`); }
    if (r.tileReach.links.length < 10) lines.push(`${vp.id}: only ${r.tileReach.links.length} Extra Features links in the sheet (want the 18 map tools)`);
    for (const x of r.tileReach.links) { if (!x.hit || !x.inViewport || !x.inPanel) lines.push(`${vp.id} extra link "${x.label}": ${!x.hit ? 'OCCLUDED ' : ''}${!x.inViewport ? 'OFFSCREEN ' : ''}${!x.inPanel ? 'OUTSIDE_PANEL' : ''}`); if (x.h < 44) lines.push(`${vp.id} extra link "${x.label}": TARGET_SIZE h=${x.h}`); }
    if (r.tools.panel.y + r.tools.panel.h > r.env.h + 1 || r.tools.panel.y < -1) lines.push(`${vp.id}: sheet [${r.tools.panel.y}..${r.tools.panel.y + r.tools.panel.h}] leaves the ${r.env.h} px viewport`);
    if (r.tools.gridScroll && r.tools.gridScroll[0] > r.tools.gridScroll[1] + 4 && !(r.gridTouchScroll > 20)) lines.push(`${vp.id}: grid overflows (${r.tools.gridScroll.join('/')}) but a real touch swipe did not scroll it (scrollTop=${r.gridTouchScroll})`);
    if (!r.toolsClosed) lines.push(`${vp.id}: the 44 px close did not close the sheet`);
    t.note(`${vp.id} tiles`, `${r.tools.count} tiles, grid ${r.tools.gridScroll && r.tools.gridScroll.join('/')}, links ${r.tileReach.links.length}, touchScroll ${r.gridTouchScroll ?? 'n/a'}`);
  }
  fail(lines, t);
});

// T0-MOB-04 every tile opens a visible, unoccluded, on-screen panel with a real >= 44 px close; Historian/Desktop View navigate
suite.test('T0-MOB-04', 'tile actions: Search/Filter/OOB/Roster/Soldier/Ancestor/Layers/Legend/Bookmarks/Help/Walkthrough panels visible, unoccluded, closable by touch', async (t) => {
  const lines = [];
  for (const vp of SEL) {
    const r = await collect(vp);
    for (const [key, pr] of Object.entries(r.panels)) {
      if (pr.skipped) continue;
      if (pr.error) { lines.push(`${vp.id} ${key}: ${pr.error}`); continue; }
      const p = pr.probe;
      if (!p || !p.root) { lines.push(`${vp.id} ${key}: panel not found after tapping its tile`); continue; }
      if (!p.inViewport) lines.push(`${vp.id} ${key}: OFFSCREEN [${p.x},${p.y} ${p.w}x${p.h}]`);
      if (key === 'layers' && r.baseNamed.dock && p.y + p.h > r.baseNamed.dock.y + 1) lines.push(`${vp.id} layers: popover bottom ${p.y + p.h} runs under the dock (top ${r.baseNamed.dock.y})`);
      if (p.hit < p.samples) lines.push(`${vp.id} ${key}: OCCLUDED ${p.samples - p.hit}/${p.samples} sample points are covered by something else (z=${p.z})`);
      const c = p.closes.find((x) => x.hit);
      if (!c) lines.push(`${vp.id} ${key}: no hit-testable close control (${JSON.stringify(p.closes)})`);
      else { if (Math.min(c.w, c.h) < 44) lines.push(`${vp.id} ${key}: close control TARGET_SIZE ${c.w}x${c.h}`); if (!pr.closedByTouch) lines.push(`${vp.id} ${key}: real touch on the close control did not close the panel`); }
      if (key === 'walkthrough' && pr.walk) {
        if (!pr.walk.isMap || !pr.walk.canvas || pr.walk.h < 100) lines.push(`${vp.id} walkthrough: #gtbg-wt-map ${JSON.stringify(pr.walk)} (map never initialised)`);
        if (!pr.walk.attrib) lines.push(`${vp.id} walkthrough: no attribution control on the walkthrough map`);
      } else if (key === 'walkthrough') lines.push(`${vp.id} walkthrough: #gtbg-wt-map missing`);
      if (key === 'layers' && pr.controls) for (const it of pr.controls.items) if (it.issues.some((x) => /TARGET_SIZE/.test(x))) lines.push(`${vp.id} layers: [${it.el} "${it.label}"] ${it.issues.join(' ')}`);
    }
    if (r.historian.error) lines.push(`${vp.id} Ask the Historian tile: ${r.historian.error}`);
  }
  fail(lines, t);
});

// T0-MOB-05 no desktop-only widget mounted, no chooser, one Mapbox map, no sound
suite.test('T0-MOB-05', 'no desktop-only overlay mounted (no timeline IO / range input / HUD / NPS button / sound / monuments), no chooser, exactly one map', async (t) => {
  const lines = [];
  for (const vp of SEL) {
    const r = await collect(vp), d = r.desktopSignatures;
    if (r.layout !== 'mobile') lines.push(`${vp.id}: data-layout=${r.layout}`);
    if (d.rangeInputs || d.timelineIO) lines.push(`${vp.id}: ${d.rangeInputs} input[type=range] mounted (desktop timeline IO)`);
    if (d.toggleUnits || d.tutorialPdf || d.desktopTitle || d.desktopWalkthroughBtn) lines.push(`${vp.id}: desktop toolbar/HUD widgets mounted ${JSON.stringify({ toggleUnits: d.toggleUnits, tutorialPdf: d.tutorialPdf, title: d.desktopTitle, walk: d.desktopWalkthroughBtn })}`);
    if (d.monumentsOverlay) lines.push(`${vp.id}: #gtbg-monuments-overlay mounted`);
    if (d.efVisible) lines.push(`${vp.id}: the desktop Extra Features overlay is visible (its groups live in the Tools sheet)`);
    if (d.toolbarButtons.length) lines.push(`${vp.id}: titled desktop toolbar buttons present: ${d.toolbarButtons.join(', ')}`);
    if (d.overlayCanvasAuto) lines.push(`${vp.id}: ${d.overlayCanvasAuto} full-size unit overlay canvas(es) with pointer-events:auto swallow map gestures (X4)`);
    if (!d.overlayCanvases) lines.push(`${vp.id}: no unit overlay canvas found (check is meaningless)`);
    if (d.audioContexts) lines.push(`${vp.id}: ${d.audioContexts} AudioContext(s) constructed (D-SOUND: in-app sound removed)`);
    if (r.chooserSeen) lines.push(`${vp.id}: "Choose Your Experience" chooser was rendered`);
    if (r.mapContainers !== 1 || r.mapCanvases !== 1) lines.push(`${vp.id}: ${r.mapContainers} map containers / ${r.mapCanvases} map canvases (want 1/1: second map mounted behind the chooser or desktop map left mounted)`);
    if (r.styleRequests !== 1) lines.push(`${vp.id}: ${r.styleRequests} Mapbox style requests on load (want 1 = one map session)`);
  }
  fail(lines, t);
});

// T0-MOB-06 landscape usable, dvh, safe-area handling
suite.test('T0-MOB-06', 'landscape usable (map >= 60 % of the height), dvh sheets, no horizontal overflow, attribution present', async (t) => {
  const lines = [];
  for (const vp of SEL) {
    const r = await collect(vp);
    const min = vp.landscape ? 0.6 : 0.4;
    if (r.mapFraction < min) lines.push(`${vp.id}: map is ${(r.mapFraction * 100).toFixed(0)} % of the height, want >= ${min * 100}`);
    t.note(`${vp.id} map`, `${(r.mapFraction * 100).toFixed(0)} % of ${r.env.h}`);
    if (r.tools.panel.maxHeight && !/none|auto/.test(r.tools.panel.maxHeight)) { const px = parseFloat(r.tools.panel.maxHeight); if (Math.abs(px - 0.88 * r.env.h) > 2 && Math.abs(px - r.env.h) > 2) lines.push(`${vp.id}: sheet max-height ${r.tools.panel.maxHeight} is not 88dvh/100dvh of ${r.env.h}`); }
    if (!r.baseNamed.attribution) lines.push(`${vp.id}: no Mapbox attribution control on the mobile map`);
    if (r.baseNamed.dockOverflow && (r.baseNamed.dockOverflow[0] > 1 || r.baseNamed.dockOverflow[1] > 1)) lines.push(`${vp.id}: dock content overflows by ${r.baseNamed.dockOverflow.join('x')}`);
  }
  fail(lines, t);
});

// T0-MOB-07 safe-area insets (emulated: Emulation.setSafeAreaInsetsOverride) -- not a substitute for a real notched device
suite.test('T0-MOB-07', 'safe-area insets: with notch/home-indicator insets the top bar text, the dock buttons and the map box stay clear (emulated)', async (t) => {
  const lines = [];
  const cases = [[P(375, 812, 3), { top: 47, bottom: 34, left: 0, right: 0 }], [P(812, 375, 3), { top: 0, bottom: 21, left: 47, right: 47 }]].filter(([v]) => inSel(v.id));
  for (const [vp, ins] of cases) {
    const page = await loadApp(vp, { insets: ins });
    const m = await page.evaluate(() => {
      const q = (s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, r: r.right, b: r.bottom, w: r.width, h: r.height }; };
      const cs = getComputedStyle(document.documentElement);
      return { sat: cs.getPropertyValue('--gt-sat'), sab: cs.getPropertyValue('--gt-sab'), clock: q('.gtbg-m-top > div'), tools: q('.gtbg-m-top button'), map: q('.gtbg-m-map'), play: q('button[aria-label="Play"], button[aria-label="Pause"]'),
        back: q('button[aria-label="Step back 5 minutes"]'), speed: q('button[aria-label^="Playback speed"]'), dock: q('.gtbg-m-dock'), days: q('.gtbg-m-days'), top: q('.gtbg-m-top'), iw: innerWidth, ih: innerHeight,
        insetProbe: (() => { const d = document.createElement('div'); d.style.cssText = 'position:fixed;top:env(safe-area-inset-top,0px);left:env(safe-area-inset-left,0px);width:1px;height:1px;visibility:hidden'; document.body.appendChild(d); const r = d.getBoundingClientRect(); d.remove(); return [r.top, r.left]; })() };
    });
    t.note(`${vp.id} insets`, JSON.stringify({ ins, sat: m.sat, sab: m.sab, probe: m.insetProbe }));
    if (Math.round(m.insetProbe[0]) !== ins.top || Math.round(m.insetProbe[1]) !== ins.left) { lines.push(`${vp.id}: emulation did not produce env() insets (probe ${m.insetProbe}); result not meaningful`); continue; }
    if (m.clock.y < ins.top - 0.5) lines.push(`${vp.id}: clock text starts at y=${m.clock.y}, under the ${ins.top} px notch`);
    if (m.tools.y < ins.top - 0.5) lines.push(`${vp.id}: Tools button at y=${m.tools.y}, under the notch`);
    if (ins.left && (m.clock.x < ins.left - 0.5 || m.tools.r > m.iw - ins.right + 0.5)) lines.push(`${vp.id}: top bar content [${m.clock.x}..${m.tools.r}] enters the ${ins.left}/${ins.right} px side insets`);
    for (const k of ['back', 'play', 'speed']) if (m[k] && m[k].b > m.ih - ins.bottom + 0.5) lines.push(`${vp.id}: ${k} button bottom ${m[k].b} is inside the ${ins.bottom} px home-indicator inset`);
    if (m.map.y + m.map.h > m.dock.y + 1) lines.push(`${vp.id}: map box [${m.map.y}..${m.map.y + m.map.h}] runs under the dock at ${m.dock.y}`);
    if (m.map.y < m.top.b - 0.5 && !vp.landscape) lines.push(`${vp.id}: map starts at ${m.map.y}, inside the top bar (bottom ${m.top.b})`);
    if (ins.left && m.dock.w < m.iw) { /* dock spans full width, its content is padded by --gt-sal/--gt-sar */ }
    if (ins.left && (m.back.x < ins.left - 0.5)) lines.push(`${vp.id}: dock button at x=${m.back.x} enters the left inset ${ins.left}`);
    await shot(page, `${vp.id}-20-safe-area`);
  }
  if (!cases.length) throw new Skip('no matching viewport selected');
  fail(lines, t);
});

// T0-MOB-08 real touch on the map: drag pan, pinch zoom, tap-select a unit, transport by touch
suite.test('T0-MOB-08', 'real CDP touch: drag pans, pinch zooms, tap selects a unit (popup, 44 px close), scrubber + play + day tab respond', async (t) => {
  const lines = [];
  const vps = ['375x812', '320x568', '812x375', '915x412'].filter(inSel).map(vpById);
  if (!vps.length) throw new Skip('no matching viewport selected');
  for (const vp of vps) {
    const page = await loadApp(vp);
    const mv0 = await mapView(page);
    if (!mv0) { lines.push(`${vp.id}: cannot read the map camera`); continue; }
    const m = await page.evaluate(() => { const r = document.querySelector('.gtbg-m-map').getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
    const cx = m.x + m.w / 2, cy = m.y + m.h / 2;
    // drag right/down by ~45 % of the map: the centre must move west and north
    await touchSwipe(page, [cx - m.w * 0.2, cy - m.h * 0.2], [cx + m.w * 0.2, cy + m.h * 0.2], { steps: 14, stepMs: 18 });
    await sleep(900);
    const mv1 = await mapView(page);
    const moved = Math.hypot(mv1.center[0] - mv0.center[0], mv1.center[1] - mv0.center[1]);
    if (!(moved > 0.0008) || !(mv1.center[0] < mv0.center[0]) || !(mv1.center[1] > mv0.center[1])) lines.push(`${vp.id}: drag pan: centre ${mv0.center.map((v) => v.toFixed(4))} -> ${mv1.center.map((v) => v.toFixed(4))} (want west+north, moved ${moved.toFixed(5)})`);
    await touchPinch(page, [cx, cy], 50, 200, { steps: 14, stepMs: 18 }); await sleep(900);
    const mv2 = await mapView(page);
    if (!(mv2.zoom > mv1.zoom + 0.4)) lines.push(`${vp.id}: pinch-out zoom ${mv1.zoom.toFixed(2)} -> ${mv2.zoom.toFixed(2)} (want > +0.4)`);
    await touchPinch(page, [cx, cy], 220, 70, { steps: 14, stepMs: 18 }); await sleep(900);
    const mv3 = await mapView(page);
    if (!(mv3.zoom < mv2.zoom - 0.4)) lines.push(`${vp.id}: pinch-in zoom ${mv2.zoom.toFixed(2)} -> ${mv3.zoom.toFixed(2)} (want < -0.4)`);
    if (Math.abs(mv3.bearing) > 1 || mv3.pitch > 1) lines.push(`${vp.id}: pinch rotated/tilted the map (bearing ${mv3.bearing}, pitch ${mv3.pitch}); rotation must be disabled`);
    t.note(`${vp.id} camera`, `pan d=${moved.toFixed(4)}, zoom ${mv1.zoom.toFixed(2)} -> ${mv2.zoom.toFixed(2)} -> ${mv3.zoom.toFixed(2)}`);
    // ---- tap-select: take a tick-1 unit from the site's own data, centre the map on it, project it, tap it
    const unit = await page.evaluate(async () => {
      const j = await (await fetch('/data/placements_day1_ticks1_50.json')).json();
      const rows = j.placements.filter((p) => p.tick === 1);
      const u = rows.find((p) => p.unit_id === 'U-CAV-1-1') || rows[0];
      window.__t0map.jumpTo({ center: [u.lng, u.lat], zoom: 15 });
      return { rows: rows.length, id: u.unit_id, lng: u.lng, lat: u.lat };
    });
    await sleep(1500);
    const target = await page.evaluate((u) => {
      const map = window.__t0map, r = document.querySelector('.gtbg-m-map').getBoundingClientRect();
      const pt = map.project([u.lng, u.lat]); const x = r.left + pt.x, y = r.top + pt.y;
      const el = document.elementFromPoint(x, y);
      const ok = !!el && !!el.closest('.gtbg-m-map') && !el.closest('.mapboxgl-ctrl');
      return { rows: u.rows, first: ok ? { id: u.id, x, y } : null, top: el ? `${el.tagName}.${String(el.className).slice(0, 30)}` : null };
    }, unit);
    if (!target.first) { lines.push(`${vp.id}: the tick-1 unit ${unit.id} is not tappable at the map centre (topmost: ${target.top})`); continue; }
    await touchTap(page, target.first.x, target.first.y, 60); await sleep(900);
    const popup = await page.evaluate(() => {
      const el = [...document.querySelectorAll('.gtbg-m-root div')].find((e) => /^(🔵 Union|🔴 Confederate)$/.test(e.textContent.trim()) && e.children.length === 0);
      if (!el) return null;
      let box = el.parentElement; const r = box.getBoundingClientRect();
      const close = [...box.querySelectorAll('button')].find((b) => /✕|×|x/i.test(b.textContent)); const cr = close && close.getBoundingClientRect();
      const t = close && document.elementFromPoint(cr.left + cr.width / 2, cr.top + cr.height / 2);
      return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), b: Math.round(r.bottom), text: box.innerText.replace(/\s+/g, ' ').slice(0, 80), close: cr && { x: cr.x + cr.width / 2, y: cr.y + cr.height / 2, w: Math.round(cr.width), h: Math.round(cr.height), hit: !!t && (t === close || close.contains(t)) },
        dockTop: document.querySelector('.gtbg-m-dock').getBoundingClientRect().top, vh: innerHeight, vw: innerWidth };
    });
    if (!popup) lines.push(`${vp.id}: tapping unit ${target.first.id} at [${Math.round(target.first.x)},${Math.round(target.first.y)}] did not open the unit popup`);
    else {
      t.note(`${vp.id} unit popup`, `${popup.w}x${popup.h}@${popup.x},${popup.y} "${popup.text}"`);
      if (popup.y < 0 || popup.b > popup.dockTop + 1 || popup.x < 0 || popup.x + popup.w > popup.vw + 1) lines.push(`${vp.id}: unit popup [${popup.x},${popup.y} ${popup.w}x${popup.h}] leaves the map area (dock top ${popup.dockTop})`);
      if (!popup.close) lines.push(`${vp.id}: unit popup has no close button`);
      else { if (Math.min(popup.close.w, popup.close.h) < 44) lines.push(`${vp.id}: unit popup close ${popup.close.w}x${popup.close.h}`); if (!popup.close.hit) lines.push(`${vp.id}: unit popup close is occluded`); }
      await shot(page, `${vp.id}-30-unit-popup`);
      if (popup.close) { await touchTap(page, popup.close.x, popup.close.y); await sleep(500); const still = await page.evaluate(() => [...document.querySelectorAll('.gtbg-m-root div')].some((e) => /^(🔵 Union|🔴 Confederate)$/.test(e.textContent.trim()) && e.children.length === 0)); if (still) lines.push(`${vp.id}: real touch on the popup close did not dismiss it`); }
    }
    // ---- transport by touch: scrubber tap, play, day tab
    const sc = await page.evaluate(() => { const r = document.querySelector('.gtbg-m-scrub').getBoundingClientRect(); return { x: r.x, y: r.y + r.height / 2, w: r.width }; });
    await touchTap(page, sc.x + sc.w * 0.5, sc.y); await sleep(600);
    const tick = await readTick(page);
    if (!(Number(tick) > 250 && Number(tick) < 420)) lines.push(`${vp.id}: scrubber tap at 50 % gave tick ${tick}`);
    const play = page.locator('button[aria-label="Play"]');
    await tapEl(page, play); await sleep(2500);
    const tick2 = await readTick(page);
    const playing = await page.locator('button[aria-label="Pause"]').count();
    if (!playing) lines.push(`${vp.id}: tapping Play did not switch to Pause`);
    if (!(Number(tick2) > Number(tick))) lines.push(`${vp.id}: playing for 2.5 s moved tick ${tick} -> ${tick2}`);
    await tapEl(page, page.locator('button[aria-label="Pause"]')); await sleep(300);
    if (!vp.landscape) {
      await tapEl(page, page.locator('.gtbg-m-days button').nth(2)); await sleep(1000);
      const day3 = await readTick(page);
      if (Number(day3) !== 451) lines.push(`${vp.id}: day tab July 3 gave tick ${day3}, want 451`);
    }
    await shot(page, `${vp.id}-31-after-touch`);
  }
  fail(lines, t);
});

// T0-MOB-09 story, event, unit and toast panels on the phone shell (re-homed desktop components)
suite.test('T0-MOB-09', 'story + event panels (tick 12) and commander toasts render under the mobile root: on screen, above the dock, 44 px dismiss targets', async (t) => {
  const lines = [];
  const vps = ['375x812', '320x568', '390x844', '768x1024', '812x375', '915x412'].filter(inSel).map(vpById);
  if (!vps.length) throw new Skip('no matching viewport selected');
  for (const vp of vps) {
    const page = await loadApp(vp, { idle: false });
    const sc = await page.evaluate(() => { const r = document.querySelector('.gtbg-m-scrub').getBoundingClientRect(); return { x: r.x, y: r.y + r.height / 2, w: r.width }; });
    // tick 12 has vignette V-001 ("The First Shot") and a high-significance chronology event
    await touchTap(page, sc.x + sc.w * (12.4 / 675), sc.y); await sleep(1500);
    const st = await page.evaluate(() => {
      const box = document.querySelector('.gtbg-mp-story'); if (!box) return null;
      const dock = document.querySelector('.gtbg-m-dock').getBoundingClientRect(), top = document.querySelector('.gtbg-m-top').getBoundingClientRect();
      const vh = innerHeight, vw = innerWidth;
      const kids = [...box.children].map((k) => { const r = k.getBoundingClientRect(); const c = document.elementFromPoint(r.left + r.width / 2, r.top + Math.min(r.height / 2, 40)); const btns = [...k.querySelectorAll('button')].map((b) => { const br = b.getBoundingClientRect(); const cy = br.top + br.height / 2; const inside = cy >= r.top && cy <= r.bottom; const t = document.elementFromPoint(br.left + br.width / 2, cy); return { w: Math.round(br.width), h: Math.round(br.height), hit: !inside || (!!t && (t === b || b.contains(t))), scrolledOut: !inside, text: b.textContent.trim().slice(0, 12) }; });
        return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), b: Math.round(r.bottom), text: k.innerText.replace(/\s+/g, ' ').slice(0, 60), covered: !c || !k.contains(c), squashed: r.height < 90 && k.scrollHeight > r.height + 8, scroll: [k.scrollHeight, k.clientHeight], btns }; });
      const br = box.getBoundingClientRect();
      return { kids, stack: { x: Math.round(br.x), y: Math.round(br.y), w: Math.round(br.width), h: Math.round(br.height), scroll: [box.scrollHeight, box.clientHeight] }, dockTop: Math.round(dock.top), topBottom: Math.round(top.bottom), vh, vw, tick: null };
    });
    if (!st || st.kids.length < 2) { lines.push(`${vp.id}: story+event panels: ${st ? st.kids.length : 'no container'} panel(s) at tick 12 (want 2: vignette + event)`); if (st) t.note(`${vp.id} panels`, JSON.stringify(st.kids.map((k) => k.text))); await shot(page, `${vp.id}-40-story-missing`); continue; }
    t.note(`${vp.id} panels`, st.kids.map((k) => `${k.w}x${k.h}@${k.x},${k.y}`).join(' | '));
    st.kids.forEach((k, i) => {
      if (k.b > st.dockTop + 1) lines.push(`${vp.id} panel ${i}: bottom ${k.b} overlaps the dock (top ${st.dockTop})`);
      if (k.y < st.topBottom - 1) lines.push(`${vp.id} panel ${i}: top ${k.y} is under the top bar (bottom ${st.topBottom})`);
      if (k.x < -1 || k.x + k.w > st.vw + 1) lines.push(`${vp.id} panel ${i}: leaves the viewport horizontally [${k.x}..${k.x + k.w}] of ${st.vw}`);
      if (k.covered) lines.push(`${vp.id} panel ${i}: OCCLUDED (something else is on top of it)`);
      if (k.squashed) lines.push(`${vp.id} panel ${i}: SQUASHED to ${k.h} px while its content is ${k.scroll[0]} px ("${k.text}")`);
      k.btns.forEach((b) => { if (b.scrolledOut) return; if (Math.min(b.w, b.h) < 44) lines.push(`${vp.id} panel ${i} button "${b.text}": TARGET_SIZE ${b.w}x${b.h}`); if (!b.hit) lines.push(`${vp.id} panel ${i} button "${b.text}": OCCLUDED`); });
    });
    const gaps = st.kids.slice().sort((a, b) => a.y - b.y);
    for (let i = 1; i < gaps.length; i++) if (gaps[i].y < gaps[i - 1].b - 1) lines.push(`${vp.id}: story/event panels overlap each other (${gaps[i - 1].b} > ${gaps[i].y})`);
    await shot(page, `${vp.id}-40-story-event`);
    if (st.stack.scroll[0] > st.stack.scroll[1] + 2) t.note(`${vp.id} stack`, `scrolls ${st.stack.scroll.join('/')}`);
    // a selected unit's popup takes the dock anchor: the cards step aside (hidden) and come back when it is closed
    await mapView(page);
    const u = await page.evaluate(async () => {
      const j = await (await fetch('/data/placements_day1_ticks1_50.json')).json();
      const rows = j.placements.filter((p) => p.unit_id === 'U-CAV-1-1').sort((a, b) => a.tick - b.tick); const r = rows.filter((p) => p.tick <= 12).pop() || rows[0];
      const mr = document.querySelector('.gtbg-m-map').getBoundingClientRect(); const land = innerWidth > innerHeight;
      // keep the unit in the part of the map the story cards do not cover
      window.__t0map.jumpTo({ center: [r.lng, r.lat], zoom: 15.5, padding: land ? { top: 0, bottom: 0, left: 0, right: Math.round(mr.width * 0.55) } : { top: 0, left: 0, right: 0, bottom: Math.round(mr.height * 0.62) } });
      return { lng: r.lng, lat: r.lat };
    });
    await sleep(1400);
    const pt = await page.evaluate((c) => { const map = window.__t0map, r = document.querySelector('.gtbg-m-map').getBoundingClientRect(); const p = map.project([c.lng, c.lat]); return { x: r.left + p.x, y: r.top + p.y }; }, u);
    await touchTap(page, pt.x, pt.y, 60); await sleep(900);
    const pop = await page.evaluate(() => { const p = document.querySelector('.gtbg-m-popup'); const s = document.querySelector('.gtbg-mp-story'); return { popup: !!p, storyVisibility: s && getComputedStyle(s).visibility }; });
    const freeAbove = st.stack.y - st.topBottom;      // map rows above the card stack
    if (!pop.popup && freeAbove < 60 && !vp.landscape) t.note(`${vp.id} residual`, `story+event cards cover the whole map (${freeAbove} px free above the stack): popup priority not testable here`);
    else if (!pop.popup) lines.push(`${vp.id}: could not open a unit popup at the tick-12 position of U-CAV-1-1 to test the popup/story priority`);
    else {
      if (pop.storyVisibility !== 'hidden') lines.push(`${vp.id}: unit popup and story/event cards are both showing (story visibility=${pop.storyVisibility}); they share the same anchor and overlap`);
      await shot(page, `${vp.id}-42-popup-over-story`);
      const closeBtn = page.locator('.gtbg-m-popup button').first();
      await tapEl(page, closeBtn); await sleep(500);
      const back = await page.evaluate(() => { const s = document.querySelector('.gtbg-mp-story'); return s && getComputedStyle(s).visibility; });
      if (back !== 'visible') lines.push(`${vp.id}: story/event cards did not return after the popup was closed (visibility=${back})`);
    }
    // dismiss a card by touch (the close glyph, not the seek button)
    const before = await page.locator('.gtbg-mp-story > div').count();
    const dismiss = page.locator('.gtbg-mp-story button', { hasText: '✕' }).first();
    if (await dismiss.count()) { await tapEl(page, dismiss); await sleep(500); const after = await page.locator('.gtbg-mp-story > div').count(); if (after >= before) lines.push(`${vp.id}: dismissing a story/event card by touch left ${after} of ${before}`); }
    else lines.push(`${vp.id}: no ✕ dismiss control in the story/event cards`);
  }
  fail(lines, t);
});

suite.test('T0-MOB-10', 'toasts: a commander-succession toast (tick 28, playing) is shown under the mobile root, not over the day tabs, and never throws', async (t) => {
  const lines = [];
  const vps = ['375x812', '812x375'].filter(inSel).map(vpById);
  if (!vps.length) throw new Skip('no matching viewport selected');
  for (const vp of vps) {
    S.collector.clear();
    const page = await loadApp(vp, { idle: false });
    const sc = await page.evaluate(() => { const r = document.querySelector('.gtbg-m-scrub').getBoundingClientRect(); return { x: r.x, y: r.y + r.height / 2, w: r.width }; });
    await touchTap(page, sc.x + sc.w * (26 / 675), sc.y); await sleep(700);
    await tapEl(page, page.locator('button[aria-label^="Playback speed"]')); await sleep(200);
    await tapEl(page, page.locator('button[aria-label^="Playback speed"]')); await sleep(200);
    await tapEl(page, page.locator('button[aria-label^="Playback speed"]')); await sleep(200);
    await tapEl(page, page.locator('button[aria-label="Play"]'));
    let seen = null;
    for (let i = 0; i < 40 && !seen; i++) {
      await sleep(250);
      seen = await page.evaluate(() => {
        const c = document.querySelector('.gtbg-mp-toast > div, .gtbg-mp-toast div'); if (!c) return null;
        const r = c.getBoundingClientRect(); const days = document.querySelector('.gtbg-m-days'); const dr = days ? days.getBoundingClientRect() : { bottom: 0 };
        return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), text: c.innerText.replace(/\s+/g, ' ').slice(0, 80), daysBottom: Math.round(dr.bottom), vw: innerWidth };
      });
    }
    if (!seen) { lines.push(`${vp.id}: no succession toast appeared inside .gtbg-mp-toast while playing through tick 28`); await shot(page, `${vp.id}-41-toast-missing`); }
    else { t.note(`${vp.id} toast`, JSON.stringify(seen)); if (seen.y < seen.daysBottom - 1) lines.push(`${vp.id}: toast top ${seen.y} overlaps the day tabs (bottom ${seen.daysBottom})`); if (seen.x < 0 || seen.x + seen.w > seen.vw) lines.push(`${vp.id}: toast leaves the viewport`); await shot(page, `${vp.id}-41-toast`); }
    const errs = S.collector.firstParty.filter((e) => !NOISE.test(e.text + (e.url || '')));
    if (errs.length) lines.push(`${vp.id}: ${errs.length} uncaught error(s) while playing: ${JSON.stringify(errs.slice(0, 2))}`);
  }
  fail(lines, t);
});

// T0-MOB-11 attribution on both mobile maps (Mapbox ToS): compact control present, expands, shows the Mapbox credit
suite.test('T0-MOB-11', 'attribution: the compact Mapbox attribution control expands by touch and names Mapbox / OpenStreetMap', async (t) => {
  const lines = [];
  const vps = ['375x812', '812x375'].filter(inSel).map(vpById);
  if (!vps.length) throw new Skip('no matching viewport selected');
  for (const vp of vps) {
    const page = await loadApp(vp);
    const btn = page.locator('.mapboxgl-ctrl-attrib-button').first();
    if (!(await btn.count())) { lines.push(`${vp.id}: no .mapboxgl-ctrl-attrib-button`); continue; }
    const b0 = await btn.boundingBox();
    const hit = await page.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return !!e && !!e.closest('.mapboxgl-ctrl-attrib'); }, [b0.x + b0.width / 2, b0.y + b0.height / 2]);
    if (!hit) lines.push(`${vp.id}: attribution button is covered by another element`);
    await tapEl(page, btn); await sleep(500);
    const txt = await page.evaluate(() => { const e = document.querySelector('.mapboxgl-ctrl-attrib'); const r = e.getBoundingClientRect(); return { text: e.innerText.replace(/\s+/g, ' ').trim(), open: e.classList.contains('mapboxgl-compact-show') || e.hasAttribute('open'), x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), vw: innerWidth }; });
    if (!/Mapbox/.test(txt.text)) lines.push(`${vp.id}: expanded attribution does not mention Mapbox: "${txt.text}"`);
    if (txt.x < 0 || txt.x + txt.w > txt.vw + 1) lines.push(`${vp.id}: expanded attribution leaves the viewport ${JSON.stringify(txt)}`);
    await shot(page, `${vp.id}-50-attribution`);
    t.note(`${vp.id} attribution`, JSON.stringify(txt).slice(0, 200));
  }
  fail(lines, t);
});

// T0-MOB-13 first-run onboarding modal (the first thing a new phone visitor sees) fits, scrolls, has 44 px targets, drops "Power User" and closes by touch
suite.test('T0-MOB-13', 'first visit on a phone: onboarding modal fits/scrolls, targets >= 44 px, no Power User card, touch copy, Skip and the newcomer tour work by touch', async (t) => {
  const lines = [];
  const vps = ['375x812', '320x568', '812x375'].filter(inSel).map(vpById);
  if (!vps.length) throw new Skip('no matching viewport selected');
  for (const vp of vps) {
    S.collector.clear();
    const page = await newTab(vp);
    await page.addInitScript(() => { try { localStorage.removeItem('gtbg_onboarded'); } catch { /* storage blocked */ } });   // runs after the harness seed: first visit
    await page.goto(`${ORIGIN}/`, { waitUntil: 'load' });
    await waitForApp(page, 45000);
    const q = page.getByText('How do you want to explore the battle?');
    try { await q.waitFor({ state: 'visible', timeout: 8000 }); } catch { lines.push(`${vp.id}: the onboarding modal did not appear on a first visit`); continue; }
    await sleep(500);
    const m = await page.evaluate(() => {
      const t = [...document.querySelectorAll('#root div')].find((e) => e.children.length === 0 && /How do you want to explore the battle/.test(e.textContent));
      let modal = t; for (let p = t; p; p = p.parentElement) { if (getComputedStyle(p).overflowY === 'auto' && getComputedStyle(p).borderTopWidth !== '0px') { modal = p; break; } }
      const r = modal.getBoundingClientRect();
      const btns = [...modal.querySelectorAll('button')].map((b) => { const br = b.getBoundingClientRect(); const cy = br.top + br.height / 2; const top = document.elementFromPoint(br.left + br.width / 2, Math.min(Math.max(cy, 1), innerHeight - 1)); return { text: b.innerText.replace(/\s+/g, ' ').trim().slice(0, 24), w: Math.round(br.width), h: Math.round(br.height), inModalView: cy >= r.top && cy <= r.bottom, hit: !!top && (top === b || b.contains(top)) }; });
      return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), vw: innerWidth, vh: innerHeight, scroll: [modal.scrollHeight, modal.clientHeight], hscroll: [modal.scrollWidth, modal.clientWidth], btns, power: [...document.querySelectorAll('#root button')].some((b) => /Power User/i.test(b.innerText)) };
    });
    t.note(`${vp.id} onboarding`, `${m.w}x${m.h}@${m.x},${m.y} scroll ${m.scroll.join('/')} buttons ${m.btns.map((b) => `${b.text}:${b.w}x${b.h}`).join(' ')}`);
    if (m.x < -1 || m.y < -1 || m.x + m.w > m.vw + 1 || m.y + m.h > m.vh + 1) lines.push(`${vp.id}: onboarding modal [${m.x},${m.y} ${m.w}x${m.h}] leaves the ${m.vw}x${m.vh} viewport`);
    if (m.hscroll[0] > m.hscroll[1] + 1) lines.push(`${vp.id}: onboarding modal overflows horizontally (${m.hscroll.join(' > ')}): its logo/text is clipped`);
    if (m.power) lines.push(`${vp.id}: "Power User" (keyboard workflow) card is offered on a touch device`);
    for (const b of m.btns) { if (Math.min(b.w, b.h) < 44) lines.push(`${vp.id}: onboarding button "${b.text}" TARGET_SIZE ${b.w}x${b.h}`); if (b.inModalView && !b.hit) lines.push(`${vp.id}: onboarding button "${b.text}" OCCLUDED`); }
    await shot(page, `${vp.id}-60-onboarding`);
    // newcomer tour by touch
    const newcomer = page.locator('#root button', { hasText: /newcomer|first time|new to/i }).first();
    const archs = await page.locator('#root button').filter({ has: page.locator('span') }).count();
    if (await newcomer.count()) {
      await tapEl(page, newcomer); await sleep(700);
      const tour = await page.evaluate(() => { const b = [...document.querySelectorAll('#root button')].map((x) => x.innerText.trim()); const txt = document.body.innerText; return { buttons: b.filter((x) => /Next|Start exploring|Skip tour/.test(x)), touchCopy: /Tap Play/i.test(txt), keyCopy: /Press Space or click Play/i.test(txt) }; });
      if (!tour.buttons.length) lines.push(`${vp.id}: newcomer tour did not start (${archs} buttons)`);
      if (tour.keyCopy) lines.push(`${vp.id}: tour tells a phone user to "Press Space" (keyboard copy)`);
      await shot(page, `${vp.id}-61-tour`);
      const skip = page.locator('#root button', { hasText: 'Skip tour' }).first();
      if (await skip.count()) { const sb = await skip.boundingBox(); if (Math.min(sb.width, sb.height) < 44) lines.push(`${vp.id}: "Skip tour" TARGET_SIZE ${Math.round(sb.width)}x${Math.round(sb.height)}`); await tapEl(page, skip); await sleep(600); }
    } else await tapEl(page, page.locator('#root button', { hasText: 'Skip introduction' }).first()).then(() => sleep(600));
    const gone = await page.evaluate(() => !document.body.innerText.includes('How do you want to explore the battle?') && !document.body.innerText.includes('Skip tour'));
    const stored = await page.evaluate(() => { try { return localStorage.getItem('gtbg_onboarded'); } catch { return 'blocked'; } });
    if (!gone) lines.push(`${vp.id}: the onboarding modal did not close by touch`);
    if (stored !== '1') lines.push(`${vp.id}: closing the tour did not store gtbg_onboarded (${stored})`);
    const tick = await readTick(page);
    if (String(tick) !== '1') t.note(`${vp.id} tick after Skip tour`, tick);
    await shot(page, `${vp.id}-62-after-onboarding`);
    const errs = S.collector.firstParty.filter((e) => !NOISE.test(e.text + (e.url || '')));
    if (errs.length) lines.push(`${vp.id}: ${errs.length} error(s) during onboarding: ${JSON.stringify(errs.slice(0, 2))}`);
  }
  fail(lines, t);
});

// T0-MOB-12 no uncaught exceptions / first-party console errors anywhere in the collected flows
suite.test('T0-MOB-12', 'zero uncaught exceptions and first-party console errors during the matrix flows (Mapbox tile noise and blocked Google Maps ignored)', async (t) => {
  const lines = [];
  for (const vp of SEL) { const r = await collect(vp); for (const e of r.errors) lines.push(`${vp.id}: ${e.kind}: ${e.text.slice(0, 160)}`); }
  t.note('mapbox requests this run', `${tileBudget.used} of ${tileBudget.cap} (blocked ${tileBudget.blocked})`);
  fail(lines, t);
});

// ------------------------------------------------------------------ run
let summary;
try {
  summary = await suite.run({ filter: FILTER, outFile: OUT, extra: () => ({ dist: path.relative(REPO, DIST), viewports: SEL.map((v) => v.id), mapboxRequests: tileBudget.used, mapboxCap: tileBudget.cap, viewportRecords: R }) });
} finally { await cleanup(); }
const failed = summary.failed;
if (EXPECT_RED) { console.log(failed ? 'expect-red: failing as expected' : 'expect-red: UNEXPECTEDLY GREEN'); process.exit(failed ? 0 : 1); }
process.exit(failed ? 1 : 0);
