// T0-P2 suite: group PERF2 (tools/t0/PERF2-README.md), proved in real Chrome on built scratch trees.
//
//   node tests/t0/perf2.spec.mjs --dist tmp/perf2/p2/dist --control tmp/perf2/base/dist
//   node tests/t0/perf2.spec.mjs --dist <tree> --filter 'P2-0[1-3]'        test-id subset
//   node tests/t0/perf2.spec.mjs --dist <tree without PERF2> --expect-red   exits 0 when the tests FAIL (red-first proof on the control tree)
//   node tests/t0/perf2.spec.mjs --dist <tree> --build                      also builds the stacks (CLOCK,DATA,MON,[ANIM],POLISH,PG-polish,PERF2,PG-perf2) in both ANIM orders (T0-P2-12)
//   --quick       fewer repetitions (smoke)      --slot n  parallel runs (ports base+40n)
//
// Trees: `--dist` is a build of R1c + CLOCK + DATA + MON + POLISH + PG-polish + PERF2 + PG-perf2
//   python tmp/perf2/stack.py --out tmp/perf2/p2 --with CLOCK,DATA,MON,POLISH,PG-polish,PERF2,PG-perf2     (the README's one-liner; the wrapper is the one of tmp/polish/stack.py)
// `--control` is the same build without PERF2 / PG-perf2 (tests that compare the two use it, the others do not need it).  Mapbox only through the capped, Referer-injecting harness of tests/t0/lib.mjs.
// What is measured is what a visitor and the acceptance harness measure: long tasks (> 50 ms) and Event Timing in the window after a real CDP click/tap, console warnings, DOM, Mapbox's own
// program-compile statistics; not source text.
process.env.T0_AGENT ||= 'perf2';
process.env.T0_PORT_BASE ||= '9800';
process.env.T0_TILE_CAP ||= '20000';                 // the suite makes a few hundred Mapbox requests; the harness default of 300 per run would starve the later tests
const L = await import('./lib.mjs');
const fs = await import('node:fs');
const path = await import('node:path');
const cp = await import('node:child_process');
const { REPO, TMP, PORT_BASE, openSession, createStaticServer, createSuite, sleep, waitFor, waitForApp, emulateViewport, assert, Skip } = L;

const argv = process.argv.slice(2);
const opt = (name, dflt) => { const i = argv.indexOf(`--${name}`); return i >= 0 ? (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true) : dflt; };
const DIST = path.resolve(REPO, opt('dist', 'tmp/perf2/p2/dist'));
const CONTROL = opt('control', null) ? path.resolve(REPO, opt('control')) : null;
const FILTER = opt('filter', null);
const EXPECT_RED = !!opt('expect-red', false);
const QUICK = !!opt('quick', false);
const BUILD = !!opt('build', false);
const SLOT = Number(opt('slot', 0)) || 0;
const OUT = path.resolve(REPO, opt('out', path.join(TMP, 'perf2.json')));
if (!fs.existsSync(DIST)) { console.error(`dist not found: ${DIST}`); process.exit(2); }
let portN = 0;
const nextPorts = () => { const k = portN++; return { http: PORT_BASE + SLOT * 40 + k * 2, cdp: PORT_BASE + SLOT * 40 + k * 2 + 1 }; };
const LONG = 50;                                  // thresholds.json: a long task is > 50 ms; none are allowed inside an interaction
const RESPONSE = 100;                             // thresholds.json: visible response within 100 ms

const OBSERVE = `(() => {
  if (window.__p2) return;
  const s = window.__p2 = { lt: [], ev: [], warn: [] };
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) s.lt.push({ s: e.startTime, d: e.duration }); }).observe({ type: 'longtask', buffered: true }); } catch (e) {}
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) s.ev.push({ n: e.name, s: e.startTime, d: e.duration }); }).observe({ type: 'event', durationThreshold: 16, buffered: true }); } catch (e) {}
  s.reset = () => { s.lt.length = 0; s.ev.length = 0; };
  s.mark = () => performance.now();
})();`;

/** one browser session on one tree; every test opens its own (a clean profile, its own ports) */
async function session(dist, { vp = { width: 1440, height: 900, dpr: 1, mobile: false }, tiles = 'inject', onboarded = true, url = '/', app = true, wait = 2500, chooseLayout = true } = {}) {
  const ports = nextPorts();
  const srv = await createStaticServer({ root: dist, port: ports.http });
  const S = await openSession({ profile: `p2${SLOT}-${ports.http}-${Date.now() % 100000}`, cdpPort: ports.cdp, tiles, onboarded, initScripts: [OBSERVE] });
  const page = S.page;
  const warnings = [];
  page.on('console', (m) => { if (m.type() === 'warning' || m.type() === 'error') warnings.push(`${m.type()}: ${m.text().slice(0, 200)}`); });
  await emulateViewport(page, vp);
  await page.goto(`${srv.url}${url}`, { waitUntil: 'load' });
  if (app) { await waitForApp(page, 45000); await sleep(wait); if (chooseLayout && !vp.mobile) await L.chooseLayout(page, 'desktop').catch(() => {}); await sleep(1500); }
  return { S, srv, page, origin: srv.url, vp, warnings, close: async () => { await S.close().catch(() => {}); await srv.close().catch(() => {}); } };
}

/** real input on `locator`, then the long tasks and the Event Timing of the click in the next `windowMs` */
async function press(page, locator, { touch = false, windowMs = 1500 } = {}) {
  await page.evaluate(() => window.__p2.reset());
  const t0 = await page.evaluate(() => performance.now());
  if (touch) { await locator.scrollIntoViewIfNeeded(); const b = await locator.boundingBox(); await L.touchTap(page, b.x + b.width / 2, b.y + b.height / 2); } else await locator.click();
  await sleep(windowMs);
  const r = await page.evaluate((t0) => ({ lt: window.__p2.lt.filter((l) => l.s >= t0 - 5).map((l) => Math.round(l.d)), ev: window.__p2.ev.filter((e) => e.s >= t0 - 5 && /^(click|pointerup|touchend|mouseup)$/.test(e.n)).map((e) => Math.round(e.d)) }), t0);
  return { long: r.lt.filter((d) => d > LONG), allLong: r.lt, response: r.ev.length ? Math.max(...r.ev) : 0 };
}
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };

const suite = createSuite('perf2');

// =========================================================================================================== compare: style, diff, terrain
for (const phone of [false, true]) {
  suite.test(phone ? 'T0-P2-02' : 'T0-P2-01', `compare (${phone ? 'phone, touch' : 'desktop, mouse'}): Dark on both maps never logs "Unable to perform style diff", has no long task and answers within ${RESPONSE} ms; the style really changes`, async () => {
    const vp = phone ? { width: 390, height: 844, dpr: 2, mobile: true } : { width: 1440, height: 900, dpr: 1, mobile: false };
    const lines = [];
    for (let i = 0; i < (QUICK ? 1 : 2); i++) {
      const S = await session(DIST, { vp, url: '/compare', app: false });
      try {
        await sleep(9000);                                                                                      // the map is loaded and idle
        for (const pane of ['a', 'b']) {
          const r = await press(S.page, S.page.locator(`.toggle-btn[data-pane=${pane}][data-action=style-dark]`).first(), { touch: phone, windowMs: 2300 });
          if (r.long.length) lines.push(`run ${i} pane ${pane}: long task(s) ${r.long.join(', ')} ms inside the Dark press`);
          if (r.response > RESPONSE) lines.push(`run ${i} pane ${pane}: the press took ${r.response} ms to reach the screen (limit ${RESPONSE})`);
          await sleep(1500);
        }
        const dark = await S.page.evaluate(() => [...document.querySelectorAll('.mapboxgl-ctrl-attrib a.mapbox-improve-map')].map((a) => (/id=([a-z0-9-]+)/.exec(a.href) || [])[1]));
        if (dark.length !== 2 || dark.some((d) => d !== 'dark-v11')) lines.push(`style after the presses: ${JSON.stringify(dark)} (want dark-v11 twice)`);
        const diff = S.warnings.filter((w) => /style diff/i.test(w));
        if (diff.length) lines.push(`run ${i}: ${diff.length} "Unable to perform style diff" warning(s): ${diff[0]}`);
        const other = S.warnings.filter((w) => !/style diff|Failed to load resource|net::ERR|AJAXError|mapbox/i.test(w) && !/^error: Error$/.test(w));   // "Error" alone: Mapbox logs a failed tile / telemetry fetch as an object
        if (other.length) lines.push(`run ${i}: other console messages: ${other.slice(0, 2).join(' | ')}`);
      } finally { await S.close(); }
    }
    assert(!lines.length, `${lines.length} problems:\n    ` + lines.join('\n    '));
  });
  suite.test(phone ? 'T0-P2-04' : 'T0-P2-03', `compare (${phone ? 'phone, touch' : 'desktop, mouse'}): 3D Terrain on a fresh page, and after Dark, answers within ${RESPONSE} ms with no long task, and the terrain is really switched on`, async () => {
    const vp = phone ? { width: 390, height: 844, dpr: 2, mobile: true } : { width: 1440, height: 900, dpr: 1, mobile: false };
    const lines = [];
    for (const afterDark of QUICK ? [false] : [false, true]) {
      const S = await session(DIST, { vp, url: '/compare', app: false });
      try {
        await sleep(9000);
        if (afterDark) { await press(S.page, S.page.locator('.toggle-btn[data-pane=a][data-action=style-dark]').first(), { touch: phone, windowMs: 500 }); await sleep(8000); }   // the terrain warm-up of the new style has run
        const shot0 = await S.page.screenshot({ type: 'jpeg', quality: 40 });
        const r = await press(S.page, S.page.locator('.toggle-btn[data-pane=a][data-action=terrain]').first(), { touch: phone, windowMs: 2500 });
        const tag = afterDark ? 'after Dark' : 'fresh';
        if (r.long.length) lines.push(`${tag}: long task(s) ${r.long.join(', ')} ms inside the 3D Terrain press`);
        if (r.response > RESPONSE) lines.push(`${tag}: the press took ${r.response} ms to reach the screen (limit ${RESPONSE})`);
        const active = await S.page.evaluate(() => document.querySelector('.toggle-btn[data-pane=a][data-action=terrain]').classList.contains('active'));
        const shot1 = await S.page.screenshot({ type: 'jpeg', quality: 40 });
        if (!active) lines.push(`${tag}: the button is not shown as pressed`);
        if (Buffer.compare(shot0, shot1) === 0) lines.push(`${tag}: the picture did not change (terrain and tilt are not on)`);
      } finally { await S.close(); }
    }
    assert(!lines.length, `${lines.length} problems:\n    ` + lines.join('\n    '));
  });
}

// =========================================================================================================== app: roster
suite.test('T0-P2-05', `app (desktop): Unit Roster opens with no long task and within ${RESPONSE} ms, and ends with every unit row in the DOM`, async () => {
  const lines = [];
  for (let i = 0; i < (QUICK ? 1 : 3); i++) {
    const S = await session(DIST, { tiles: 'inject' });
    try {
      const btn = S.page.locator('button[title="Unit Roster"]').first();
      const r = await press(S.page, btn, { windowMs: 1600 });
      if (r.long.length) lines.push(`run ${i}: long task(s) ${r.long.join(', ')} ms inside the Unit Roster press`);
      if (r.response > RESPONSE) lines.push(`run ${i}: the press took ${r.response} ms to reach the screen (limit ${RESPONSE})`);
      await sleep(2500);
      const info = await S.page.evaluate(() => {
        const heads = [...document.querySelectorAll('.gtbg-roster [role=group]')].filter((g) => /^(UNION|CONFEDERATE) units$/.test(g.getAttribute('aria-label') || ''));
        const out = heads.map((g) => { const head = g.previousElementSibling ? g.previousElementSibling.textContent : ''; const n = (/(\d+) units/.exec(head) || [])[1]; const list = g.querySelector(':scope > [role=list]'); return { label: g.getAttribute('aria-label'), claimed: Number(n), rows: list ? list.children.length : g.children.length, virtual: !!list }; });
        return out;
      });
      if (info.length !== 2) lines.push(`run ${i}: ${info.length} unit lists found, want 2`);
      // PERF6 (R1g): the roster list is virtualised (only the rows in view and 500 px each side are mounted, every row says "item k of N"); trees before it mount every row: the old rule applies to them
      for (const g of info) if (!g.virtual && (!g.claimed || g.rows !== g.claimed)) lines.push(`run ${i}: "${g.label}" lists ${g.rows} rows after 4 s but says ${g.claimed} units`);
      if (info.some((g) => g.virtual)) {
        const v = await S.page.evaluate(async () => {
          const wait = (ms) => new Promise((r) => setTimeout(r, ms));
          const out = [];
          for (const g of [...document.querySelectorAll('.gtbg-roster [role=group]')].filter((g) => /^(UNION|CONFEDERATE) units$/.test(g.getAttribute('aria-label') || ''))) {
            const head = g.previousElementSibling ? g.previousElementSibling.textContent : ''; const claimed = Number((/(\d+) units/.exec(head) || [])[1]);
            const items = () => [...g.querySelectorAll('[role=listitem]')];
            const first = items()[0], mounted = items().length;
            g.scrollTop = 0; await wait(300);
            const atTop = items().some((r) => r.getAttribute('aria-posinset') === '1' && r.getBoundingClientRect().bottom > g.getBoundingClientRect().top);
            g.scrollTop = g.scrollHeight; await wait(600); g.scrollTop = g.scrollHeight; await wait(600);
            const gr = g.getBoundingClientRect(); const last = items().find((r) => r.getAttribute('aria-posinset') === String(claimed));
            out.push({ label: g.getAttribute('aria-label'), claimed, mounted, sizes: [...new Set(items().map((r) => r.getAttribute('aria-setsize')))], atTop, lastShown: !!last && last.getBoundingClientRect().bottom <= gr.bottom + 1 && last.getBoundingClientRect().bottom > gr.top, mountedAtEnd: items().length, hasText: !!first && first.textContent.length > 0 });
          }
          return out;
        });
        for (const g of v) {
          if (!(g.mounted > 8 && g.mounted <= 120)) lines.push(`run ${i}: "${g.label}" mounts ${g.mounted} rows at rest (want a screenful plus overscan: 9 to 120)`);
          if (g.sizes.length !== 1 || Number(g.sizes[0]) !== g.claimed) lines.push(`run ${i}: "${g.label}" rows say set size ${g.sizes.join('/')} but the header says ${g.claimed} units`);
          if (!g.atTop || !g.hasText) lines.push(`run ${i}: "${g.label}" does not show item 1 at the top`);
          if (!g.lastShown || g.mountedAtEnd > 120) lines.push(`run ${i}: "${g.label}" scrolled to the end does not show item ${g.claimed} flush with the bottom (or mounts ${g.mountedAtEnd} rows)`);
        }
      }
    } finally { await S.close(); }
  }
  assert(!lines.length, `${lines.length} problems:\n    ` + lines.join('\n    '));
});

suite.test('T0-P2-06', 'app (phone): the Tools sheet and the Unit Roster tile open without a long task and within 100 ms of the tap', async () => {
  const lines = [];
  for (let i = 0; i < (QUICK ? 1 : 2); i++) {
    const S = await session(DIST, { vp: { width: 390, height: 844, dpr: 2, mobile: true }, tiles: 'inject' });
    try {
      const r = await press(S.page, S.page.getByRole('button', { name: /Tools/ }).first(), { touch: true, windowMs: 1200 });
      if (r.long.length) lines.push(`run ${i}: long task(s) ${r.long.join(', ')} ms inside the Tools tap`);
      if (r.response > RESPONSE) lines.push(`run ${i}: the Tools tap took ${r.response} ms to reach the screen`);
      const r2 = await press(S.page, S.page.getByText('Unit Roster', { exact: true }).first(), { touch: true, windowMs: 1600 });
      if (r2.long.length) lines.push(`run ${i}: long task(s) ${r2.long.join(', ')} ms inside the Unit Roster tile`);
    } finally { await S.close(); }
  }
  assert(!lines.length, `${lines.length} problems:\n    ` + lines.join('\n    '));
});

// =========================================================================================================== app: monuments
suite.test('T0-P2-07', 'app (desktop): the first press of Monuments has no long task, links no Mapbox program on demand, and the monuments are drawn', async () => {
  const lines = [];
  for (let i = 0; i < (QUICK ? 1 : 2); i++) {
    const S = await session(DIST, { tiles: 'inject' });
    try {
      await waitFor(async () => (await L.mapView(S.page)) && (await S.page.evaluate(() => !!window.__t0map)), { timeout: 30000, label: 'map handle' });
      const stats = () => S.page.evaluate(() => { const m = window.__t0map; const c = m.painter.context._compileStats; return { onDemand: c.onDemand, precompiled: c.precompiled, stalls: c.stalls.map((s) => `${s.name.slice(0, 40)} ${Math.round(s.ms)} ms`) }; });
      const before = await stats();
      const r = await press(S.page, S.page.locator('button[title="Monuments"]').first(), { windowMs: 2500 });
      const after = await stats();
      if (r.long.length) lines.push(`run ${i}: long task(s) ${r.long.join(', ')} ms inside the Monuments press`);
      if (after.onDemand > before.onDemand) lines.push(`run ${i}: ${after.onDemand - before.onDemand} program(s) were linked on demand by the press: ${after.stalls.slice(before.stalls.length).join('; ')}`);
      const drawn = await S.page.evaluate(() => { const m = window.__t0map; const ids = ['gtmon-dots', 'gtmon-glow', 'gtmon-ring', 'gtmon-stars'].filter((id) => m.getLayer(id)); return { ids, dots: m.getLayer('gtmon-dots') ? m.queryRenderedFeatures({ layers: ['gtmon-dots'] }).length : 0, visible: ids.map((id) => m.getLayoutProperty(id, 'visibility')) }; });
      if (drawn.ids.length !== 4) lines.push(`run ${i}: monument layers present: ${drawn.ids.join(', ')}`);
      if (!drawn.dots) lines.push(`run ${i}: no monument dot is rendered`);
      if (drawn.visible.some((v) => v === 'none')) lines.push(`run ${i}: a monument layer is hidden: ${drawn.visible.join(',')}`);
    } finally { await S.close(); }
  }
  assert(!lines.length, `${lines.length} problems:\n    ` + lines.join('\n    '));
});

// =========================================================================================================== names for the SVGs
suite.test('T0-P2-08', 'app: no visible inline SVG wider than 24 px lacks a name or a role (default view, Legend open, first visit, 1024 / 1440 / 1920 px); the day ring says which day and how far', async () => {
  const lines = [];
  const scan = () => document.documentElement && [...document.querySelectorAll('svg')].filter((el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 24 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && el.getAttribute('aria-hidden') !== 'true' && !el.getAttribute('role') && !el.closest('button,a,[role=button]') && !(el.querySelector('title') || el.getAttribute('aria-label')); }).map((el) => (el.parentElement ? el.parentElement.tagName : '') + '>svg ' + Math.round(el.getBoundingClientRect().width) + 'px');
  for (const w of QUICK ? [1440] : [1024, 1440, 1920]) {
    const S = await session(DIST, { vp: { width: w, height: w === 1024 ? 768 : w === 1920 ? 1080 : 900, dpr: 1, mobile: false } });
    try {
      let bad = await S.page.evaluate(scan); if (bad.length) lines.push(`${w}px default view: ${bad.join(', ')}`);
      const ring = await S.page.evaluate(() => { const s = [...document.querySelectorAll('main#root svg')].find((e) => e.getBoundingClientRect().width === 28); return s ? { role: s.getAttribute('role'), label: s.getAttribute('aria-label') } : null; });
      if (!ring || ring.role !== 'img' || !/^Day [123] progress: \d{1,3} percent$/.test(ring.label || '')) lines.push(`${w}px: the day ring is ${JSON.stringify(ring)}`);
      const legendOpen = await S.page.evaluate(() => !!document.querySelector('[role="group"][aria-label="Legend"]'));   // open by default on the desktop shell
      if (!legendOpen) { await S.page.locator('button[title="Legend"]').first().click().catch(() => {}); await sleep(600); }
      await S.page.getByText('Size', { exact: true }).first().click().catch(() => {}); await sleep(500);
      bad = await S.page.evaluate(scan); if (bad.length) lines.push(`${w}px Legend > Size: ${bad.join(', ')}`);
      const glyphs = await S.page.evaluate(() => [...document.querySelectorAll('main#root svg')].filter((e) => e.getBoundingClientRect().width === 22).map((e) => e.getAttribute('aria-hidden')));
      if (glyphs.some((g) => g !== 'true')) lines.push(`${w}px: the legend dot samples are not hidden from assistive technology: ${JSON.stringify(glyphs)}`);
    } finally { await S.close(); }
  }
  const S2 = await session(DIST, { onboarded: false, vp: { width: 1440, height: 900, dpr: 1, mobile: false }, chooseLayout: false });
  try { const bad = await S2.page.evaluate(scan); if (bad.length) lines.push(`first visit: ${bad.join(', ')}`); } finally { await S2.close(); }
  assert(!lines.length, `${lines.length} problems:\n    ` + lines.join('\n    '));
});

// =========================================================================================================== pages
suite.test('T0-P2-09', 'ground-remembers, immersive, viewshed and compare still draw their maps: a canvas that is not blank, no console error, the layers present', async () => {
  const lines = [];
  for (const page of ['ground-remembers', 'immersive', 'viewshed', 'compare']) {
    const S = await session(DIST, { vp: { width: 1280, height: 800, dpr: 1, mobile: false }, url: '/' + page, app: false });
    try {
      if (page === 'immersive') await S.page.evaluate(() => { const g = document.getElementById('sound-gate'); const b = g && g.querySelector('button'); if (b) b.click(); });
      await sleep(8000);
      // a WebGL canvas reads back blank (no preserveDrawingBuffer): the picture is taken from a screenshot of the canvas's box and measured in the page
      const boxes = await S.page.evaluate(() => [...document.querySelectorAll('canvas.mapboxgl-canvas')].map((c) => { const b = c.getBoundingClientRect(); return { x: Math.max(0, b.x), y: Math.max(0, b.y), width: Math.min(b.width, innerWidth - Math.max(0, b.x)), height: Math.min(b.height, innerHeight - Math.max(0, b.y)) }; }));
      const spread = [];
      for (const b of boxes) {
        if (b.width < 20 || b.height < 20) { spread.push(255); continue; }
        const png = (await S.page.screenshot({ clip: b, type: 'png' })).toString('base64');
        spread.push(await S.page.evaluate(async (png) => { const img = new Image(); img.src = 'data:image/png;base64,' + png; await img.decode(); const t = document.createElement('canvas'); t.width = 48; t.height = 48; const x = t.getContext('2d'); x.drawImage(img, 0, 0, 48, 48); const d = x.getImageData(0, 0, 48, 48).data; let lo = 765, hi = 0; for (let i = 0; i < d.length; i += 4) { const v = d[i] + d[i + 1] + d[i + 2]; if (v < lo) lo = v; if (v > hi) hi = v; } return hi - lo; }, png));
      }
      const r = { canvases: boxes.length, spread };
      if (!r.canvases) lines.push(`${page}: no map canvas`);
      if (r.spread.some((s) => s < 12)) lines.push(`${page}: a map canvas is blank (colour spread ${r.spread.join(',')})`);
      const errs = S.warnings.filter((w) => /^error/.test(w) && !/Failed to load resource|net::ERR|AJAXError|403|401/i.test(w));
      if (errs.length) lines.push(`${page}: console errors: ${errs.slice(0, 2).join(' | ')}`);
    } finally { await S.close(); }
  }
  assert(!lines.length, `${lines.length} problems:\n    ` + lines.join('\n    '));
});

// =========================================================================================================== copy
suite.test('T0-P2-10', 'ar.html carries no "prompt" (copy audit rule), and no shipped text file gained the word', async () => {
  // the bundle's file names carry the release id: compared without it
  const words = (dir) => { const out = {}; const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (/\.(html|js|css|json|txt|xml|toml|webmanifest)$/i.test(e.name) || e.name === '_headers' || e.name === '_redirects') { const n = (fs.readFileSync(p, 'utf8').match(/\bprompt(s|ed|ing)?\b/gi) || []).length; if (n) out[path.relative(dir, p).split(path.sep).join('/').replace(/-[0-9a-f]{8}\./, '.')] = n;  } } }; walk(dir); return out; };
  const mine = words(DIST);
  assert(!mine['ar.html'], `ar.html still has ${mine['ar.html']} occurrence(s) of "prompt"`);
  if (CONTROL) { const ctl = words(CONTROL); for (const [f, n] of Object.entries(mine)) assert(n <= (ctl[f] || 0), `${f}: ${n} occurrences of "prompt" against ${ctl[f] || 0} in the control`); }
});

// =========================================================================================================== heap
suite.test('T0-P2-11', 'repeated open / close of the Unit Roster, the Legend and Monuments returns the DOM and the listeners to where they were, and the heap does not climb', async () => {
  const S = await session(DIST, { tiles: 'inject' });
  try {
    const cdp = await L.cdpFor(S.page);
    await cdp.send('HeapProfiler.enable');
    const sample = async () => { await cdp.send('HeapProfiler.collectGarbage'); const h = await cdp.send('Runtime.getHeapUsage'); const d = await cdp.send('Memory.getDOMCounters'); return { mb: h.usedSize / 1048576, nodes: d.nodes, lis: d.jsEventListeners }; };
    const cycle = async () => {
      for (const t of ['Unit Roster', 'Legend', 'Monuments']) { const b = S.page.locator(`button[title="${t}"]`).first(); await b.click(); await sleep(900); await b.click(); await sleep(500); }
    };
    for (let i = 0; i < 8; i++) await cycle();                                                  // warm-up: first-use caches and the JIT (V8 code objects grow ~1 MB over the first cycles on the control as well; DOM nodes and listeners are the leak signal)
    const a = await sample();
    for (let i = 0; i < (QUICK ? 6 : 14); i++) await cycle();
    const b = await sample();
    const grow = (b.mb - a.mb) / a.mb * 100;
    const lines = [];
    if (b.nodes - a.nodes > 40) lines.push(`DOM nodes ${a.nodes} -> ${b.nodes}`);
    if (b.lis - a.lis > 40) lines.push(`listeners ${a.lis} -> ${b.lis}`);
    if (grow > 5) lines.push(`heap ${a.mb.toFixed(2)} -> ${b.mb.toFixed(2)} MB (+${grow.toFixed(1)}%)`);
    assert(!lines.length, lines.join('; '));
  } finally { await S.close(); }
});

// =========================================================================================================== build
suite.test('T0-P2-12', 'the group builds with the unmodified builder after POLISH, with and without ANIM in either order, standalone on CLOCK,DATA,MON, and gives one entry bundle whichever way ANIM is ordered', async () => {
  if (!BUILD) throw new Skip('pass --build (about 5 minutes)');
  const py = (out, groups) => {
    const code = `
import argparse, copy, os, shutil, sys
sys.path.insert(0, ${JSON.stringify(path.join(REPO, 'tools/t0'))})
import build as B
from t0build.util import load_json, rmtree_safe
T0 = ${JSON.stringify(path.join(REPO, 'tools/t0'))}; out = ${JSON.stringify(out)}; groups = ${JSON.stringify(groups)}
scratch = out + '-stage'; rmtree_safe(scratch); os.makedirs(scratch)
for fn in os.listdir(os.path.join(T0, 'patches')):
    if fn.endswith('.json'): shutil.copyfile(os.path.join(T0, 'patches', fn), os.path.join(scratch, fn))
for g in groups:
    for fn in sorted(os.listdir(os.path.join(T0, 'patches-next'))):
        if fn == g + '.json' or (fn.startswith(g + '+') and fn.endswith('.json')): shutil.copyfile(os.path.join(T0, 'patches-next', fn), os.path.join(scratch, fn))
cfg = copy.deepcopy(load_json(os.path.join(T0, 'trains.json')))
cfg['optional_groups'] = list(cfg.get('optional_groups', [])) + [g for g in groups if not g.startswith('PG-')]
ns = argparse.Namespace(train='R1c', all=False, out=os.path.relpath(out, ${JSON.stringify(REPO)}), with_groups=groups, record=False, no_gate=True, keep_failed=True, order='fixed', dump_stage=None, legacy=None, base_dir=None, base_lock=None, patches=scratch, overlay=None, ledger=None, config_hook=None)
try:
    r = B.build_train('R1c', ns, cfg); print('BUILT', r['rid'])
except B.BuildError as e:
    print('REFUSED', str(e)[:300].replace(chr(10), ' ')); sys.exit(2)
`;
    const r = cp.spawnSync('python', ['-c', code], { cwd: REPO, encoding: 'utf8', maxBuffer: 1 << 26 });
    return { code: r.status, out: (r.stdout || '') + (r.stderr || '') };
  };
  const base = path.join(REPO, 'tmp', 'perf2', 'spec-build');
  const lines = [];
  const variants = {
    a: ['CLOCK', 'DATA', 'MON', 'POLISH', 'PG-polish', 'PERF2', 'PG-perf2'],
    b: ['CLOCK', 'DATA', 'MON', 'ANIM', 'POLISH', 'PG-polish', 'PERF2', 'PG-perf2'],
    c: ['CLOCK', 'DATA', 'MON', 'POLISH', 'PG-polish', 'ANIM', 'PERF2', 'PG-perf2'],
    d: ['CLOCK', 'DATA', 'MON', 'POLISH', 'PG-polish', 'PERF2', 'ANIM', 'PG-perf2'],
    e: ['CLOCK', 'DATA', 'MON', 'PERF2', 'PG-perf2'],
  };
  const ok = {};
  for (const [k, g] of Object.entries(variants)) { const r = py(path.join(base, k), g); ok[k] = r.code === 0; if (r.code !== 0) lines.push(`${g.join(',')} did not build: ${r.out.slice(-300)}`); }
  const md5 = (d) => { const f = fs.readdirSync(path.join(d, 'dist/assets')).find((x) => /^index-.*\.js$/.test(x)); return cp.execSync(`node -e "const c=require('crypto');console.log(c.createHash('md5').update(require('fs').readFileSync(process.argv[1])).digest('hex'))" "${path.join(d, 'dist/assets', f)}"`, { encoding: 'utf8' }).trim(); };
  if (ok.b && ok.c && ok.d) { const x = md5(path.join(base, 'b')), y = md5(path.join(base, 'c')), z = md5(path.join(base, 'd')); if (x !== y || y !== z) lines.push(`entry bundle differs with the position of ANIM: ${x} ${y} ${z}`); }
  assert(!lines.length, lines.join('\n    '));
});

const t0 = Date.now();
const summary = await suite.run({ filter: FILTER, outFile: OUT, extra: () => ({ dist: path.relative(REPO, DIST), control: CONTROL ? path.relative(REPO, CONTROL) : null, minutes: +((Date.now() - t0) / 60000).toFixed(1) }) });
// guards (true on a good tree with or without the group): the phone Tools tap is borderline on the control, the pages must keep drawing, the open/close cycles must not leak, the build test builds from patches-next whatever --dist is
const GUARDS = new Set(['T0-P2-06', 'T0-P2-09', 'T0-P2-11', 'T0-P2-12']);
if (EXPECT_RED) { const ran = summary.results.filter((r) => r.status !== 'skip' && !GUARDS.has(r.id)); const pass = ran.filter((r) => r.status === 'pass'); console.log(`expect-red: ${ran.length - pass.length} of ${ran.length} tests failed${pass.length ? `; still green: ${pass.map((r) => r.id).join(', ')}` : ''}`); process.exit(pass.length === 0 ? 0 : 1); }
process.exit(summary.failed ? 1 : 0);
