// T0-POL suite: group POLISH (tools/t0/POLISH-README.md), proved in real Chrome on a built scratch tree.
//
//   node tests/t0/polish.spec.mjs --dist tmp/polish/stack/dist [--control tmp/polish/control/dist]
//   node tests/t0/polish.spec.mjs --dist <tree> --filter 'POL-0[2-4]'      test-id subset
//   node tests/t0/polish.spec.mjs --dist <tree without POLISH> --expect-red  exits 0 when the tests FAIL (red-first proof on the control tree)
//   node tests/t0/polish.spec.mjs --dist <tree> --build                     also builds the stacks (CLOCK,DATA,MON,[ANIM],POLISH,PG-polish) in both ANIM orders and refuses wrong orders (T0-POL-12)
//   --quick       fewer ticks and viewports (smoke)      --shots <dir> screenshots (default tmp/polish/shots-spec)      --slot n  parallel runs (ports base+2n)
//
// Trees: `--dist` is a build of R1c + CLOCK + DATA + MON + POLISH + PG-polish (python tmp/polish/stack.py ... or the README's one-liner); `--control` is the same build without POLISH
// (needed by T0-POL-09 latency and T0-POL-10 parity, optional otherwise).  Mapbox only through the capped, Referer-injecting harness of tests/t0/lib.mjs.
// What is measured is geometry (getBoundingClientRect of the real elements, elementFromPoint, real CDP mouse/touch input), not source text.
process.env.T0_AGENT ||= 'polish';
process.env.T0_PORT_BASE ||= '9600';
const L = await import('./lib.mjs');
const fs = await import('node:fs');
const path = await import('node:path');
const cp = await import('node:child_process');
const { REPO, TMP, PORT_BASE, openSession, createStaticServer, createSuite, sleep, waitFor, waitForApp, emulateViewport, assert, Skip } = L;


const argv = process.argv.slice(2);
const opt = (name, dflt) => { const i = argv.indexOf(`--${name}`); return i >= 0 ? (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true) : dflt; };
const DIST = path.resolve(REPO, opt('dist', 'tmp/polish/stack/dist'));
const CONTROL = opt('control', null) ? path.resolve(REPO, opt('control')) : null;
const FILTER = opt('filter', null);
const EXPECT_RED = !!opt('expect-red', false);
const QUICK = !!opt('quick', false);
const BUILD = !!opt('build', false);
const SLOT = Number(opt('slot', 0)) || 0;
const SHOTS = path.resolve(REPO, opt('shots', 'tmp/polish/shots-spec'));
const OUT = path.resolve(REPO, opt('out', path.join(TMP, 'polish.json')));
if (!fs.existsSync(DIST)) { console.error(`dist not found: ${DIST}`); process.exit(2); }
fs.mkdirSync(SHOTS, { recursive: true });
let portN = 0;
const nextPorts = () => { const k = portN++; return { http: PORT_BASE + SLOT * 40 + k * 2, cdp: PORT_BASE + SLOT * 40 + k * 2 + 1 }; };

// ------------------------------------------------------------------------------------------------------------------------------------------ helpers
const RETIRED = /Extra Features|Battle Reports?|Cinematic Export|What They Could See|\bticks?\b|vignettes?|five[- ]minutes?/i;
// historical quotation that must stay: Hancock's "five minutes' time" (1st Minnesota), a quotation in the chronology and in the story text
const RETIRED_RE_G = /Extra Features|Battle Reports?|Cinematic Export|What They Could See|\bticks?\b|vignettes?/gi;
const ALLOWED_TEXT = /gain five minutes' time/i;

/** one browser session on one tree; every test opens its own (a clean profile, its own ports) */
async function session(dist, { vp = { width: 1440, height: 900, dpr: 1, mobile: false }, tiles = 'inject', onboarded = true, query = '', init = [], wait = 3000, app = true } = {}) {
  const ports = nextPorts();
  const srv = await createStaticServer({ root: dist, port: ports.http });
  const S = await openSession({ profile: `pol${SLOT}-${ports.http}-${Date.now() % 100000}`, cdpPort: ports.cdp, tiles, onboarded, initScripts: init });
  const page = S.page;
  await emulateViewport(page, vp);
  await page.goto(`${srv.url}/${query}`, { waitUntil: 'load' });
  if (app) { await waitForApp(page, 45000); await sleep(wait); }
  return { S, srv, page, origin: srv.url, vp, errors: () => S.collector.firstParty, close: async () => { await S.close().catch(() => {}); await srv.close().catch(() => {}); } };
}
const frameOf = (page) => page.evaluate(() => { const e = document.querySelector('[data-gt-frame]'); return e ? Number(e.getAttribute('data-gt-frame')) : null; });
/** go to moment t: the desktop range input (React onChange), or on the phone real touches on the scrubber, corrected with the step buttons */
async function jump(page, t) {
  const phone = await page.evaluate(() => document.documentElement.dataset.layout === 'mobile');
  if (!phone) return page.evaluate((t) => { const i = document.querySelector('input[aria-label="Battle time"]'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(i, String(t)); i.dispatchEvent(new Event('input', { bubbles: true })); i.dispatchEvent(new Event('change', { bubbles: true })); }, t);
  for (let k = 0; k < 6; k++) {
    const cur = await frameOf(page); if (cur === t) return;
    const geo = await page.evaluate(() => { const r = document.querySelector('.gtbg-m-scrub').getBoundingClientRect(); const b = (re) => { const e = [...document.querySelectorAll('.gtbg-m-play button')].find((x) => re.test(x.getAttribute('aria-label') || x.textContent)); if (!e) return null; const q = e.getBoundingClientRect(); return [q.x + q.width / 2, q.y + q.height / 2]; }; return { s: [r.x, r.y, r.width, r.height], prev: b(/Previous step|‹/i), next: b(/Next step|›/i) }; });
    const d = t - (cur || 1);
    if (Math.abs(d) > 6 || !geo.prev) { await L.touchTap(page, geo.s[0] + 3 + (geo.s[2] - 6) * ((t - 1) / 674), geo.s[1] + geo.s[3] / 2); await sleep(350); }
    else { const bt = d > 0 ? geo.next : geo.prev; for (let i = 0; i < Math.abs(d); i++) { await L.touchTap(page, bt[0], bt[1], 30); await sleep(120); } await sleep(200); }
  }
}

/** the overlap scanner: every piece of floating furniture and every card, as drawn.  Tool panels the visitor opens on purpose (search, filters, layers, roster, tour drawer, monument card) are not furniture. */
const SCAN = () => {
  for (const l of document.querySelectorAll('.mapboxgl-ctrl-logo')) { const c = l.parentElement; if (c && c.style.display === 'none') c.style.display = 'block'; }   // Mapbox shows the wordmark only when its TileJSON asks for it; measure where it stands
  const cs = (e) => getComputedStyle(e);
  const shown = (e) => { const c = cs(e); if (c.display === 'none' || c.visibility === 'hidden' || +c.opacity < 0.05) return false; const r = e.getBoundingClientRect(); return r.width >= 8 && r.height >= 8; };
  const items = [];
  const add = (l, e) => { if (e && shown(e)) items.push({ l, e, r: e.getBoundingClientRect() }); };
  const T = (s) => document.querySelector(s);
  add('badge', [...document.querySelectorAll('main#root div')].find((d) => d.children.length >= 1 && /\((base speed|slow|fast)\)/.test(d.textContent) && d.textContent.length < 70 && cs(d).position === 'absolute'));
  add('menu-dock', document.getElementById('extra-features'));
  add('reconstruction-label', T('.gtb63-ctl'));                      // BASE1863's permanent map label and toggle (desktop and phone), present only on a tree with that group
  add('unit-card', document.getElementById('gt-unit-panel'));
  add('legend', T('[role="group"][aria-label="Legend"]'));
  add('legend-fab', [...document.querySelectorAll('main#root button')].find((b) => b.title === 'Show legend'));
  add('story-card', T('[data-gtbg-card="2"]')); add('event-card', T('[data-gtbg-card="1"]'));
  for (const t of document.querySelectorAll('[role="log"][aria-label="Battle events"] > div')) add('toast', t);
  add('overview', [...document.querySelectorAll('main#root div')].find((d) => d.firstElementChild && /^Overview/.test(d.firstElementChild.textContent) && d.children.length === 3 && d.querySelector('canvas')));
  add('overview-fab', [...document.querySelectorAll('main#root button')].find((b) => b.title === 'Show minimap'));
  for (const b of document.querySelectorAll('main#root button')) { const t = b.textContent.trim(); if (/Trails/.test(t) && t.length < 16) add('trails', b); if (/NPS Auto Tour|Guided Battle Tour/.test(t) && t.length < 30) add('tour-button', b); }
  add('map-zoom', T('.mapboxgl-ctrl-top-right .mapboxgl-ctrl-group')); add('mapbox-logo', T('.mapboxgl-ctrl-logo')); add('attribution', T('.mapboxgl-ctrl-attrib'));
  add('toolbar', [...document.querySelectorAll('main#root div')].find((d) => cs(d).position === 'absolute' && cs(d).zIndex === '100' && d.getBoundingClientRect().height < 60 && d.getBoundingClientRect().top === 0));
  for (const e of document.querySelectorAll('#gt-timeline button, #gt-timeline input')) add('timeline:' + (e.textContent.trim().slice(0, 8) || e.getAttribute('aria-label') || e.tagName), e);
  add('phone-monument-sheet', T('.gtmon-sheet')); add('phone-legend', T('.gtbg-m-legend')); add('phone-overview', T('.gtbg-m-mini')); add('phone-unit-popup', T('.gtbg-m-popup')); add('phone-card-stack', T('.gtbg-mp-story')); add('phone-toasts', T('.gtbg-mp-toast'));
  add('phone-header', T('.gtbg-m-top')); add('phone-days', T('.gtbg-m-days')); add('phone-dock', T('.gtbg-m-dock'));
  const out = [];
  for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
    const a = items[i], b = items[j];
    if (a.e.contains(b.e) || b.e.contains(a.e)) continue;
    const pair = [a.l, b.l].sort().join('|');
    if (pair === 'phone-days|phone-header') continue;                                  // the day tabs sit inside the header bar in landscape by design
    if (a.l.startsWith('timeline:') && b.l.startsWith('timeline:')) { /* controls of the dock must not touch each other either */ }
    const w = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left), h = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
    if (w > 1 && h > 1) out.push(`${a.l} x ${b.l}: ${Math.round(w)}x${Math.round(h)}`);
  }
  const outside = items.filter((i) => !/^(toolbar|phone-dock|phone-header|phone-days)$/.test(i.l) && (i.r.left < -1 || i.r.top < -1 || i.r.right > innerWidth + 1 || i.r.bottom > innerHeight + 1)).map((i) => `${i.l} outside the viewport [${Math.round(i.r.left)},${Math.round(i.r.top)},${Math.round(i.r.right)},${Math.round(i.r.bottom)}]`);
  return { out, outside, names: items.map((i) => i.l), boxes: Object.fromEntries(items.map((i) => [i.l, [Math.round(i.r.left), Math.round(i.r.top), Math.round(i.r.right), Math.round(i.r.bottom)]])) };
};

const DATA = (f) => JSON.parse(fs.readFileSync(path.join(DIST, 'data', f), 'utf8'));
function cardTicks() {
  const ev = new Set(), st = new Set();
  for (const d of [1, 2, 3]) for (const e of DATA(`chronology_day${d}.json`).events || []) ev.add(e.tick);
  for (const d of [1, 2, 3]) for (const v of DATA(`vignettes_part${d}.json`).vignettes) { st.add(v.trigger_tick); st.add(v.trigger_tick + 1); }
  const evs = [...ev].sort((a, b) => a - b);
  const pick = QUICK ? evs.filter((_, i) => i % 9 === 0) : evs.filter((_, i) => i % 3 === 0);
  // the tall event cards (the 292 px one is at 483) and every story tick are always in
  return [...new Set([...st, ...pick, 483, 450, 453, 650, 300, 302])].filter((t) => t >= 1 && t <= 675).sort((a, b) => a - b);
}

/** R1E: the layout is judged when it has STOOD STILL, not 450 ms after the click.  A card is placed by the engine on the frame after React adds it, the Reconstruction label is placed by its own timer, a card that moves glides for 240 ms: how long
 *  that takes depends on the machine (50 ms on a quiet one, more than 450 on a loaded one), so a fixed wait made the verdict depend on the machine.  The boxes of every card, rail and control are read every 80 ms and the scan is taken when two reads
 *  in a row are identical (3 s at most: a picture that never stands still is scanned, and judged, as it is). */
const STILL = () => { const q = (s) => document.querySelector(s); const r = (e) => { if (!e) return null; const b = e.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), Math.round(b.right), Math.round(b.bottom)]; };
  return JSON.stringify([r(q('[data-gtbg-card="1"]')), r(q('[data-gtbg-card="2"]')), r(q('[data-gtbg-card="3"]')), r(q('#gt-unit-panel')), r(q('[role="group"][aria-label="Legend"]')), r(q('.gtb63-ctl')), r(q('#extra-features')), r(q('.gtbg-mp-story')), r(q('.gtbg-m-legend')), r(q('.gtbg-m-mini')), r(q('[role="log"][aria-label="Battle events"]'))]); };
async function standStill(page, { poll = 80, max = 3000 } = {}) { let prev = null; const t0 = Date.now(); for (;;) { const cur = await page.evaluate(STILL); if (cur === prev) return Date.now() - t0; prev = cur; if (Date.now() - t0 > max) return -1; await sleep(poll); } }
async function sweepTicks(S0, ticks, { settle = 450, tag = '' } = {}) {
  const bad = new Map(); let samples = 0; const seenKinds = new Set();
  for (const t of ticks) {
    await jump(S0.page, t); await sleep(settle); if (!process.env.POL_FIXED_WAIT) await standStill(S0.page);      // POL_FIXED_WAIT=1: the old fixed wait only (a debugging aid: it reproduces the machine-dependent verdict)
    const r = await S0.page.evaluate(SCAN); samples++;
    r.names.forEach((n) => seenKinds.add(n.replace(/^timeline:.*/, 'timeline')));
    for (const o of [...r.out, ...r.outside]) {
      const k = o.replace(/: .*/, '').replace(/ outside.*/, ' outside the viewport'); const a = bad.get(k) || { n: 0, ticks: [], ex: o }; a.n++; if (a.ticks.length < 5) a.ticks.push(t);
      if (a.n === 1 && process.env.POL_DEBUG) { const labs = k.replace(/ outside.*/, '').split(' x '); a.ex = `${o} boxes ${labs.map((l) => `${l}=${JSON.stringify(r.boxes[l])}`).join(' ')}`; await sleep(1800); const r2 = await S0.page.evaluate(SCAN); a.ex += ` after 1.8 s: ${r2.out.concat(r2.outside).some((q) => q.startsWith(k)) ? 'STILL' : 'gone'}`; }
      bad.set(k, a);
    }
  }
  return { bad, samples, seenKinds, text: [...bad].map(([k, a]) => `${tag} ${k} x${a.n} (${a.ex}; ticks ${a.ticks.join(',')})`) };
}

const suite = createSuite('T0-POL');
const DESKTOPS = QUICK ? [[1280, 720, 0], [1920, 1080, 0]] : [[1024, 768, 0], [1280, 720, 0], [1440, 900, 0], [1920, 1080, 0], [1024, 768, 1], [1366, 1024, 1]];
const PHONES = QUICK ? [[390, 844], [844, 390]] : [[320, 568], [360, 640], [375, 812], [390, 844], [412, 915], [768, 1024], [812, 375], [844, 390], [915, 412], [1024, 768]];
// POL_VPS=390x844,360x640 limits the phone/desktop viewports of POL-02/04 (a debugging aid; the acceptance run uses the full lists)
if (process.env.POL_VPS) { const keep = new Set(process.env.POL_VPS.split(',')); for (const L2 of [DESKTOPS, PHONES]) { const k = L2.filter((v) => keep.has(`${v[0]}x${v[1]}`)); L2.length = 0; L2.push(...k); } }
const vpOf = (w, h, m) => ({ width: w, height: h, dpr: m ? 2 : 1, mobile: !!m });

// ------------------------------------------------------------------------------------------------------------------------------------------ 01 names
suite.test('T0-POL-01', 'one name per feature: no retired name or jargon word on any page, menu, Help, onboarding or phone sheet; renamed pages agree with the menu', async (t) => {
  const lines = []; let strings = 0;
  const S0 = await session(DIST, { tiles: 'block', onboarded: false, wait: 2500 });
  const textOf = (page) => page.evaluate(() => { const out = []; const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) { const e = n.parentElement; if (!e || /^(SCRIPT|STYLE|NOSCRIPT)$/.test(e.tagName)) continue; out.push(n.nodeValue.trim()); } for (const e of document.querySelectorAll('[aria-label],[title],[placeholder],[alt]')) for (const a of ['aria-label', 'title', 'placeholder', 'alt']) { const v = e.getAttribute(a); if (v) out.push(a + ': ' + v); } for (const m of document.querySelectorAll('meta[name=description],meta[property^="og:"],meta[name^="twitter:"]')) out.push('meta: ' + m.content); out.push('title: ' + document.title); return out.filter(Boolean); });
  const check = async (page, label) => { const tx = await textOf(page); strings += tx.length; for (const s of tx) if (RETIRED.test(s) && !ALLOWED_TEXT.test(s)) lines.push(`${label}: ${s.slice(0, 120)}`); };
  const p = S0.page;
  try {
    await check(p, 'index / welcome');
    await p.getByText('Power User').click().catch(() => {}); await sleep(500); await check(p, 'quick reference');
    await p.evaluate(() => { try { localStorage.setItem('gtbg_onboarded', '1'); } catch { /* blocked */ } }); await p.reload(); await waitForApp(p, 40000); await sleep(2500);
    await check(p, 'index map'); await p.click('#ef-btn').catch(() => {}); await sleep(500); await check(p, 'More to Explore menu'); await p.keyboard.press('Escape');
    await p.click('button[aria-label="Help"]').catch(() => {}); await sleep(1500);
    for (const tab of await p.$$('[role=dialog] button')) { const tx = ((await tab.textContent()) || '').trim(); if (tx && tx.length < 24 && !/✕|Close/.test(tx)) { await tab.click().catch(() => {}); await sleep(250); await check(p, 'Help ' + tx); } }
    const pages = fs.readdirSync(DIST).filter((f) => f.endsWith('.html') && !/^google|^index/.test(f));
    for (const f of pages) { await p.goto(`${S0.origin}/${f}`, { waitUntil: 'load' }).catch(() => {}); await sleep(1400); await check(p, f); }
    await p.goto(`${S0.origin}/search.html`); await sleep(2000); for (const c of await p.$$('.filter-chip')) { await c.click(); await sleep(120); await check(p, 'search chip'); }
    await p.goto(`${S0.origin}/historian.html`); await sleep(2200); await p.fill('#ask', 'zzzqqq'); await p.press('#ask', 'Enter'); await sleep(500); await check(p, 'historian no answer');
    // the three renamed pages, their menu label and their headline agree
    const nav = fs.readFileSync(path.join(DIST, 'site-nav.js'), 'utf8');
    for (const [f, name] of [['viewshed', 'High Ground'], ['report', 'Regiment Fact Sheets'], ['cinematic-export', 'Export a Video']]) {
      await p.goto(`${S0.origin}/${f}.html`); await sleep(900);
      const h1 = await p.locator('h1').first().textContent();
      if (h1.trim() !== name) lines.push(`${f}.html: h1 is "${h1.trim()}", want "${name}"`);
      if (!(await p.title()).startsWith(name)) lines.push(`${f}.html: title is "${await p.title()}"`);
      if (!nav.includes(`label: '${name}'`)) lines.push(`site-nav.js has no label "${name}"`);
    }
  } finally { await S0.close(); }
  const M = await session(DIST, { vp: vpOf(390, 844, 1), tiles: 'block', wait: 2500 });
  try { await M.page.getByText('Tools').first().click().catch(() => {}); await sleep(900); await check(M.page, 'phone Tools sheet'); } finally { await M.close(); }
  t.note('strings read', strings);
  assert(!lines.length, `${lines.length} retired names or words still readable:\n    ` + lines.slice(0, 14).join('\n    '));
});

// ------------------------------------------------------------------------------------------------------------------------------------------ 02 desktop layout
suite.test('T0-POL-02', 'desktop layout: no card, rail, control or logo overlaps another at 1024..1920 wide (mouse and touch), over every story tick and a third of the event ticks; with a unit card open too', async (t) => {
  const lines = []; let samples = 0; const ticks = cardTicks(); t.note('ticks', ticks.length);
  for (const [w, h, m] of DESKTOPS) {
    const S0 = await session(DIST, { vp: vpOf(w, h, m), tiles: 'block', query: '', wait: 3500 });
    try {
      const r = await sweepTicks(S0, ticks, { tag: `${w}x${h}${m ? ' touch' : ''}` }); samples += r.samples; lines.push(...r.text);
      if (!r.seenKinds.has('story-card') || !r.seenKinds.has('event-card') || !r.seenKinds.has('legend')) lines.push(`${w}x${h}: the sweep never saw a ${['story-card', 'event-card', 'legend'].filter((k) => !r.seenKinds.has(k)).join(', ')} (the test would prove nothing)`);
      if (!process.env.POL_NO_SHOT) { await jump(S0.page, 300); await sleep(900); await S0.page.screenshot({ path: path.join(SHOTS, `desktop-${w}x${h}${m ? 't' : ''}-t300.png`) }); }
    } finally { await S0.close(); }
    const U = await session(DIST, { vp: vpOf(w, h, m), tiles: 'block', query: '?unit=U-ART-9MA&tick=250', wait: 3500 });
    try {
      const r = await sweepTicks(U, ticks.filter((_, i) => i % 3 === 0).concat([248, 252, 300, 302]), { tag: `${w}x${h}${m ? ' touch' : ''} +unit card` }); samples += r.samples; lines.push(...r.text);
      if (!r.seenKinds.has('unit-card')) lines.push(`${w}x${h}: the unit card never opened`);
      await jump(U.page, 300); await sleep(900); await U.page.screenshot({ path: path.join(SHOTS, `desktop-${w}x${h}${m ? 't' : ''}-t300-unit.png`) });
    } finally { await U.close(); }
  }
  t.note('samples', samples);
  assert(!lines.length, `${lines.length} overlaps:\n    ` + lines.slice(0, 14).join('\n    '));
});

// ------------------------------------------------------------------------------------------------------------------------------------------ 03 the reviewer's case
suite.test('T0-POL-03', 'moment 300 (desktop): the menu dock is already where it will stay when the story card opens, and the two never touch, not even for one frame', async () => {
  const lines = [];
  for (const [w, h] of [[1440, 900], [1280, 720], [1024, 768]]) {
    const S0 = await session(DIST, { vp: vpOf(w, h, 0), tiles: 'block', query: '?tick=290', wait: 4500 });
    try {
      const before = await S0.page.evaluate(() => { const r = document.getElementById('extra-features').getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)]; });
      const frames = [];
      await S0.page.evaluate(() => { window.__f = []; const tick = () => { const a = document.getElementById('extra-features'), b = document.querySelector('[data-gtbg-card="2"]'); if (a && b) { const x = a.getBoundingClientRect(), y = b.getBoundingClientRect(); window.__f.push(Math.min(x.right, y.right) - Math.max(x.left, y.left) > 1 && Math.min(x.bottom, y.bottom) - Math.max(x.top, y.top) > 1); } requestAnimationFrame(tick); }; tick(); });
      await jump(S0.page, 300); await sleep(2500);
      const f = await S0.page.evaluate(() => window.__f); frames.push(...f);
      const after = await S0.page.evaluate(() => { const r = document.getElementById('extra-features').getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)]; });
      if (frames.some(Boolean)) lines.push(`${w}x${h}: dock and story card overlapped in ${frames.filter(Boolean).length} of ${frames.length} frames`);
      if (!frames.length) lines.push(`${w}x${h}: the story card never appeared at moment 300`);
      if (JSON.stringify(before) !== JSON.stringify(after)) lines.push(`${w}x${h}: the dock moved ${before} -> ${after} when the card opened`);
      await S0.page.screenshot({ path: path.join(SHOTS, `moment300-${w}x${h}.png`) });
    } finally { await S0.close(); }
  }
  assert(!lines.length, lines.join('\n    '));
});

// ------------------------------------------------------------------------------------------------------------------------------------------ 04 phone
suite.test('T0-POL-04', 'phone and tablet shell, portrait and landscape: legend, overview, cards, header and the Mapbox logo never overlap; the logo stays visible above the cards', async (t) => {
  const lines = []; let samples = 0; const ticks = cardTicks().filter((_, i) => i % 2 === 0);
  for (const [w, h] of PHONES) {
    const S0 = await session(DIST, { vp: vpOf(w, h, 1), tiles: 'block', wait: 3000 });
    let layout = null;
    try {
      layout = await S0.page.evaluate(() => document.documentElement.dataset.layout);
      const r = await sweepTicks(S0, ticks, { tag: `${w}x${h} ${layout}` }); samples += r.samples; lines.push(...r.text);
      if (!r.seenKinds.has(layout === 'mobile' ? 'phone-card-stack' : 'story-card')) lines.push(`${w}x${h} ${layout}: the sweep never saw a card (the jumps did not land, the test would prove nothing)`);
      await jump(S0.page, 45); await sleep(700);
      const q = await S0.page.evaluate(SCAN);
      if (layout === 'mobile') {
        if (!q.names.includes('phone-legend') || !q.names.includes('phone-overview')) lines.push(`${w}x${h}: legend or overview not shown at a quiet moment (${q.names.join(',')})`);
        if (!q.names.includes('mapbox-logo')) lines.push(`${w}x${h}: no Mapbox logo box`);
      }
      await S0.page.screenshot({ path: path.join(SHOTS, `phone-${w}x${h}-t45.png`) });
      await jump(S0.page, 300); await sleep(900); await S0.page.screenshot({ path: path.join(SHOTS, `phone-${w}x${h}-t300.png`) });
    } finally { await S0.close(); }
    if (layout !== 'mobile' || ![360, 390, 844].includes(w)) continue;
    {
      // the two bottom sheets a visitor opens on purpose: a tapped unit's pop-up and a Monuments card (MON); both must stand clear of the logo and hide what they would cover
      const O = await session(DIST, { vp: vpOf(w, h, 1), tiles: 'inject', query: '?tick=300', wait: 4000 }); const p = O.page;
      try {
        await L.mapView(p);
        const off = await p.evaluate(() => document.querySelector('canvas.mapboxgl-canvas').getBoundingClientRect().top);
        const last = new Map(); for (const r of DATA('placements_day2_ticks226_300.json').placements) if (r.tick <= 300 && r.lat) last.set(r.unit_id, r);
        let popup = false;
        // with ANIM a unit is a mark on the engine's canvas and the engine decides where it stands (marks of a crowd are laid out away from the unit's coordinates, and a unit inside a crowd tile has no mark of its own to
        // tap): tap the individual (leaf) marks the engine draws in the free part of the map; without ANIM the projected coordinates below
        const leaves = await p.evaluate((land) => { const A = window.__gtanim; if (!A || A.state() !== 1 || !A.S.core || !A.S.core.frame) return []; const F = A.S.core.frame, c = window.__t0map.getCanvas().getBoundingClientRect(); return F.tiles.filter((t) => t.kind === 'leaf' && t.life === 'live' && t.opacity > 0.95).map((t) => [Math.round(t.x + F.view.dx + c.left), Math.round(t.y + F.view.dy + c.top)]).filter(([x, y]) => { if (!(x > 8 && y > c.top + 4 && (land ? x < innerWidth * 0.5 : y < innerHeight * 0.62) && x < innerWidth - 8)) return false; const e = document.elementFromPoint(x, y); return !!(e && e.tagName === 'CANVAS'); }); }, w > h);
        for (const [x, y] of leaves.slice(0, 8)) {
          await L.touchTap(p, x, y, 60); await sleep(600);
          if (await p.$('.gtbg-m-popup')) { popup = true; const q2 = await p.evaluate(SCAN); for (const o of [...q2.out, ...q2.outside]) lines.push(`${w}x${h} unit pop-up: ${o}`); await p.screenshot({ path: path.join(SHOTS, `phone-${w}x${h}-unit-popup.png`) }); break; }
        }
        for (const r of popup ? [] : [...last.values()].slice(0, 12)) {
          // bring the unit to the free left part of the map (landscape: the cards stand on the right), then tap it with a finger
          const pt = await p.evaluate(([ll, land]) => { const m = window.__t0map; const W = m.getContainer().clientWidth, H = m.getContainer().clientHeight; const x = m.project(ll); m.panBy([x.x - (land ? 0.2 : 0.5) * W, x.y - (land ? 0.4 : 0.15) * H], { duration: 0 }); const y = m.project(ll); return [y.x, y.y]; }, [[r.lng, r.lat], w > h]);
          await sleep(700);
          await L.touchTap(p, pt[0], pt[1] + off); await sleep(500);
          if (await p.$('.gtbg-m-popup')) { popup = true; const q2 = await p.evaluate(SCAN); for (const o of [...q2.out, ...q2.outside]) lines.push(`${w}x${h} unit pop-up: ${o}`); await p.screenshot({ path: path.join(SHOTS, `phone-${w}x${h}-unit-popup.png`) }); break; }
        }
        if (!popup) lines.push(`${w}x${h}: no unit pop-up could be opened by a tap (the check proves nothing)`);
        const x1 = p.locator('.gtbg-m-popup button[aria-label="Close"]').first(); if (await x1.count()) await x1.click().catch(() => {}); await sleep(400);
        await p.getByText('Tools').first().click().catch(() => {}); await sleep(800); await p.getByText('Monuments').first().click().catch(() => {}); await sleep(1500);
        const closeB = p.locator('button[aria-label="Close"]').first(); if (await closeB.count()) await closeB.click().catch(() => {}); await sleep(400);
        const star = await p.evaluate(() => { const m = window.__t0map; const ly = m && m.getLayer('gtmon-stars'); if (!ly) return null; const f = m.querySourceFeatures(ly.source)[0]; if (!f) return null; m.jumpTo({ center: f.geometry.coordinates, zoom: 14.5 }); return f.geometry.coordinates; });
        await sleep(900);
        // bring the star to a free part of the map: the first of a few places where the map itself (not the permanent reconstruction label, a card or a control) is under the finger
        let sp = null;
        for (const [fx, fy] of (w > h ? [[0.2, 0.4], [0.3, 0.55], [0.15, 0.7]] : [[0.5, 0.15], [0.5, 0.3], [0.3, 0.4], [0.7, 0.35], [0.5, 0.5]])) {
          if (!star) break;
          const q = await p.evaluate(([c, fx, fy]) => { const m = window.__t0map; const W = m.getContainer().clientWidth, H = m.getContainer().clientHeight; const q = m.project(c); m.panBy([q.x - fx * W, q.y - fy * H], { duration: 0 }); const z = m.project(c); const r = m.getCanvas().getBoundingClientRect(); const e = document.elementFromPoint(z.x + r.left, z.y + r.top); return { pt: [z.x, z.y], free: !!(e && e.tagName === 'CANVAS') }; }, [star, fx, fy]);
          await sleep(500);
          sp = q.pt; if (q.free) break;
        }
        await sleep(700);
        if (!sp) lines.push(`${w}x${h}: no Monuments star to tap`);
        else { await L.touchTap(p, sp[0], sp[1] + off); await sleep(1200); if (!(await p.$('.gtmon-sheet'))) lines.push(`${w}x${h}: the Monuments card did not open`); else { const q3 = await p.evaluate(SCAN); for (const o of [...q3.out, ...q3.outside]) lines.push(`${w}x${h} Monuments card: ${o}`); await p.screenshot({ path: path.join(SHOTS, `phone-${w}x${h}-monument-card.png`) }); } }
      } finally { await O.close(); }
    }
  }
  t.note('samples', samples);
  assert(!lines.length, `${lines.length} overlaps:\n    ` + lines.slice(0, 14).join('\n    '));
});

// ------------------------------------------------------------------------------------------------------------------------------------------ 05 targets
suite.test('T0-POL-05', 'targets: every control of the map is at least 32 px on a fine pointer and 44 px high on touch (width too from 1000 px on touch, 1100 px with a mouse); the toolbar still fits and nothing in it overlaps', async (t) => {
  const lines = [];
  const probe = () => {
    const out = []; for (const e of document.querySelectorAll('#root button, #root a[href], #extra-features button, #extra-features a, #root input[type=range]')) {
      if (e.closest('.mapboxgl-ctrl-attrib, .mapboxgl-ctrl-logo') || e.classList.contains('mapboxgl-ctrl-logo') || e.getAttribute('aria-hidden') === 'true') continue;
      const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); if (!r.width || cs.visibility === 'hidden' || cs.display === 'none') continue;
      out.push({ t: (e.getAttribute('aria-label') || e.title || e.textContent || e.tagName).trim().slice(0, 24), w: Math.round(r.width), h: Math.round(r.height), x: r.x, r: r.right });
    }
    const tb = [...document.querySelectorAll('main#root div')].find((d) => getComputedStyle(d).zIndex === '100' && d.getBoundingClientRect().top === 0 && d.getBoundingClientRect().height < 60);
    const tbk = tb ? [...tb.querySelectorAll('button, a')].map((e) => e.getBoundingClientRect()).filter((r) => r.width) : [];
    let clash = 0; for (let i = 0; i < tbk.length; i++) for (let j = i + 1; j < tbk.length; j++) if (Math.min(tbk[i].right, tbk[j].right) - Math.max(tbk[i].left, tbk[j].left) > 1 && Math.min(tbk[i].bottom, tbk[j].bottom) - Math.max(tbk[i].top, tbk[j].top) > 1) clash++;
    return { out, coarse: matchMedia('(pointer:coarse)').matches, layout: document.documentElement.dataset.layout, clash, over: tbk.filter((r) => r.right > innerWidth + 1).length, sw: document.documentElement.scrollWidth, vw: innerWidth };
  };
  const cases = QUICK ? [[1440, 900, 0], [1024, 768, 1], [390, 844, 1]] : [[1440, 900, 0], [1280, 720, 0], [1024, 768, 0], [1920, 1080, 0], [1024, 768, 1], [1180, 820, 1], [1366, 1024, 1], [390, 844, 1], [768, 1024, 1], [844, 390, 1]];
  for (const [w, h, m] of cases) {
    const S0 = await session(DIST, { vp: vpOf(w, h, m), tiles: 'block', query: '?tick=300', wait: 3000 });
    try {
      // one more of the cards: the story card's close button and "Dismiss" are controls too
      const r = await S0.page.evaluate(probe);
      const minH = r.coarse ? 44 : 32; const minW = r.coarse ? (w >= 1000 ? 44 : 24) : (w >= 1100 ? 32 : 24);
      const small = r.out.filter((x) => x.h < minH || (x.w < minW && !/Battle time/.test(x.t)));
      if (small.length) lines.push(`${w}x${h}${m ? ' touch' : ''} (${r.layout}): ${small.length} below ${minW}x${minH}: ${small.slice(0, 6).map((x) => `${x.t} ${x.w}x${x.h}`).join(', ')}`);
      if (r.clash) lines.push(`${w}x${h}: ${r.clash} toolbar controls overlap`);
      if (r.over) lines.push(`${w}x${h}: ${r.over} toolbar controls run off the right edge`);
      if (r.sw > r.vw + 1) lines.push(`${w}x${h}: the page scrolls sideways (${r.sw} > ${r.vw})`);
      await S0.page.screenshot({ path: path.join(SHOTS, `targets-${w}x${h}${m ? 't' : ''}.png`), clip: { x: 0, y: 0, width: w, height: 70 } });
    } finally { await S0.close(); }
  }
  // the toolbar at every width from the narrowest desktop layout to 1440, mouse and touch: it fits, nothing in it overlaps, and the controls have the promised size
  const fit = () => {
    const tb = [...document.querySelectorAll('main#root div')].find((d) => getComputedStyle(d).zIndex === '100' && d.getBoundingClientRect().top === 0 && d.getBoundingClientRect().height < 60); if (!tb) return null;
    const k = [...tb.querySelectorAll('button, a')].map((e) => e.getBoundingClientRect()).filter((r) => r.width); let clash = 0;
    for (let i = 0; i < k.length; i++) for (let j = i + 1; j < k.length; j++) if (Math.min(k[i].right, k[j].right) - Math.max(k[i].left, k[j].left) > 1 && Math.min(k[i].bottom, k[j].bottom) - Math.max(k[i].top, k[j].top) > 1) clash++;
    return { right: Math.max(...k.map((r) => r.right)), clash, h: Math.min(...k.map((r) => r.height)), w: Math.min(...[...tb.querySelectorAll('.gtbg-tb-right button')].map((e) => e.getBoundingClientRect().width)) };
  };
  for (const m of [0, 1]) {
    const S0 = await session(DIST, { vp: vpOf(1440, 800, m), tiles: 'block', query: '?tick=45', wait: 2500 });
    try {
      for (const w of QUICK ? [900, 1000, 1099, 1100, 1280] : [850, 900, 960, 989, 990, 1000, 1024, 1059, 1060, 1099, 1100, 1180, 1279, 1280, 1366, 1440]) {
        await emulateViewport(S0.page, vpOf(w, 800, m)); await sleep(450);
        if ((await S0.page.evaluate(() => document.documentElement.dataset.layout)) !== 'desktop') continue;
        const f = await S0.page.evaluate(fit); if (!f) { lines.push(`${w}${m ? ' touch' : ''}: no toolbar`); continue; }
        if (f.right > w - 4) lines.push(`${w}${m ? ' touch' : ''}: the toolbar runs to ${Math.round(f.right)}`);
        if (f.clash) lines.push(`${w}${m ? ' touch' : ''}: ${f.clash} toolbar controls overlap`);
        if (f.h < (m ? 44 : 32) - 0.5) lines.push(`${w}${m ? ' touch' : ''}: a toolbar control is ${Math.round(f.h)} px high`);
        if (w >= (m ? 1000 : 1100) && f.w < (m ? 44 : 32) - 0.5) lines.push(`${w}${m ? ' touch' : ''}: an icon button is ${Math.round(f.w)} px wide`);
      }
    } finally { await S0.close(); }
  }
  assert(!lines.length, lines.join('\n    '));
});

// ------------------------------------------------------------------------------------------------------------------------------------------ 06 real clicks land
suite.test('T0-POL-06', 'every toolbar and dock control takes a real click at its centre (elementFromPoint), and the time scrubber takes a click 12 px above and below its line', async () => {
  const lines = [];
  const S0 = await session(DIST, { tiles: 'block', query: '?tick=100', wait: 3000 });
  try {
    const miss = await S0.page.evaluate(() => { const bad = []; for (const e of document.querySelectorAll('#root .gtbg-tb-right button, #root .gtbg-tb-center button, #root .gtbg-tb-center a, #gt-timeline button')) { const r = e.getBoundingClientRect(); if (!r.width) continue; const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); if (!(top === e || e.contains(top))) bad.push((e.textContent || e.title).trim().slice(0, 16)); } return bad; });
    if (miss.length) lines.push(`covered controls: ${miss.join(', ')}`);
    const box = await S0.page.evaluate(() => { const i = document.querySelector('input[aria-label="Battle time"]'); const r = i.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; });
    for (const dy of [-12, 0, 12]) {
      const x = box[0] + box[2] * 0.6, y = box[1] + box[3] / 2 + dy;
      await S0.page.mouse.click(x, y); await sleep(500);
      const v = Number(await S0.page.evaluate(() => document.querySelector('input[aria-label="Battle time"]').value));
      if (Math.abs(v - Math.round(1 + 674 * 0.6)) > 8) lines.push(`a click ${dy} px off the scrubber line set moment ${v}, want about 405`);
    }
  } finally { await S0.close(); }
  assert(!lines.length, lines.join('\n    '));
});

// ------------------------------------------------------------------------------------------------------------------------------------------ 07 onboarding
suite.test('T0-POL-07', 'welcome window: choosing "New to Gettysburg" and reloading mid-tour does not show it again; blocked storage never throws', async () => {
  const lines = [];
  const S0 = await session(DIST, { onboarded: false, app: false, tiles: 'block' });
  try {
    const p = S0.page;
    await waitFor(async () => (await p.getByText('New to Gettysburg').count()) > 0, { timeout: 40000, label: 'welcome window' });
    await p.getByText('New to Gettysburg').click(); await sleep(600);
    if (!(await p.getByText(/Next →/).count())) lines.push('the tour did not start');
    const flag = await p.evaluate(() => localStorage.getItem('gtbg_onboarded'));
    if (flag !== '1') lines.push(`gtbg_onboarded is ${JSON.stringify(flag)} after choosing a path (want "1", the value the close handler writes)`);
    await p.reload(); await waitForApp(p, 40000); await sleep(2500);
    if ((await p.getByText('How do you want to explore the battle?').count()) > 0) lines.push('the welcome window is shown again after a reload mid-tour');
    await p.screenshot({ path: path.join(SHOTS, 'onboarding-after-reload.png') });
  } finally { await S0.close(); }
  // storage that throws (private mode, blocked): the choice still works and nothing throws
  const B = await session(DIST, { onboarded: false, app: false, tiles: 'block', init: [() => { const f = () => { throw new DOMException('blocked', 'SecurityError'); }; try { Storage.prototype.setItem = f; } catch { /* sealed */ } }] });
  try {
    const p = B.page; await waitFor(async () => (await p.getByText('History Buff').count()) > 0, { timeout: 40000, label: 'welcome window' });
    await p.getByText('History Buff').click(); await sleep(1500);
    const errs = B.errors().filter((e) => e.kind === 'pageerror');
    if (errs.length) lines.push(`page errors with blocked storage: ${JSON.stringify(errs[0]).slice(0, 200)}`);
    if ((await p.getByText('How do you want to explore the battle?').count()) > 0) lines.push('the welcome window did not close with blocked storage');
  } finally { await B.close(); }
  assert(!lines.length, lines.join('\n    '));
});

// ------------------------------------------------------------------------------------------------------------------------------------------ 08 Ask the Historian
suite.test('T0-POL-08', 'Ask the Historian: after an answer the question is at the top of the view and the first answer starts below it; the page never jumps to the end of the last answer; focus stays in the box', async () => {
  const lines = [];
  for (const [w, h, m] of [[1440, 900, 0], [390, 844, 1]]) {
    const S0 = await session(DIST, { vp: vpOf(w, h, m), tiles: 'block', app: false });
    try {
      const p = S0.page; await p.goto(`${S0.origin}/historian.html`); await p.waitForSelector('#ask-row', { state: 'visible', timeout: 30000 }); await sleep(600);
      const snap = () => p.evaluate(() => { const r = (e) => { const b = e.getBoundingClientRect(); return [Math.round(b.top), Math.round(b.bottom)]; }; const ms = [...document.querySelectorAll('.msg')]; const lastUser = [...ms].reverse().find((m) => m.classList.contains('user')); const i = ms.indexOf(lastUser); return { y: Math.round(scrollY), vh: innerHeight, focus: document.activeElement && document.activeElement.id, user: lastUser && r(lastUser), first: ms[i + 1] && r(ms[i + 1]), n: ms.length, ask: r(document.getElementById('ask-row')) }; });
      const check = (label, s) => {
        if (!s.user) { lines.push(`${w}: ${label}: no question in the transcript`); return; }
        if (s.user[0] < 0 || s.user[1] > s.vh) lines.push(`${w}: ${label}: the question is not on screen (${s.user})`);
        if (!s.first || s.first[0] >= s.ask[0] - 20) lines.push(`${w}: ${label}: the first answer does not start above the ask box (first ${s.first}, box ${s.ask})`);
        if (s.first && s.first[0] < 0) lines.push(`${w}: ${label}: the first answer starts above the screen (${s.first})`);
        if (s.focus !== 'ask') lines.push(`${w}: ${label}: focus is on "${s.focus}", not the ask box`);
      };
      await p.click('#ask'); await p.keyboard.type('20th Maine'); await p.keyboard.press('Enter'); await sleep(1600); const a = await snap(); check('typed question', a);
      await p.screenshot({ path: path.join(SHOTS, `historian-${w}-after-ask.png`) });
      await p.keyboard.type('Little Round Top'); await p.keyboard.press('Enter'); await sleep(1600); check('second question', await snap());
      const chip = p.locator('.sugg').first(); await chip.click(); await sleep(1600); const c = await snap(); check('suggestion chip', c);
      if (await p.evaluate(() => document.getElementById('ask').value)) lines.push(`${w}: the box still holds the suggestion text after asking`);
    } finally { await S0.close(); }
  }
  assert(!lines.length, lines.join('\n    '));
});

// ------------------------------------------------------------------------------------------------------------------------------------------ 09 latency
suite.test('T0-POL-09', 'input latency of the touched controls is unchanged (median within 6 ms of the control tree): legend, menu, speed, filters, welcome choice, historian ask', async (t) => {
  if (!CONTROL) throw new Skip('needs --control <tree without POLISH>');
  const stat = (a) => { const s = [...a].sort((x, y) => x - y); return { n: s.length, med: +s[Math.floor(s.length / 2)].toFixed(1), p90: +s[Math.floor(s.length * 0.9)].toFixed(1) }; };
  const run = async (dist) => {
    const S0 = await session(dist, { tiles: 'block', query: '?tick=45', wait: 2500 }); const p = S0.page; const out = {};
    try {
      await p.evaluate(() => { window.__lat = { t0: 0, res: [], armed: false }; document.addEventListener('pointerdown', (e) => { window.__lat.t0 = e.timeStamp; window.__lat.armed = true; }, true); new MutationObserver(() => { const q = window.__lat; if (!q.armed) return; q.armed = false; requestAnimationFrame(() => requestAnimationFrame(() => { q.res.push(performance.now() - q.t0); })); }).observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true }); });
      const center = (sel) => p.evaluate((s) => { const e = document.querySelector(s); const r = e.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; }, sel);
      const reps = QUICK ? 8 : 20;
      const measure = async (name, fn) => { await p.evaluate(() => { window.__lat.res = []; window.__lat.armed = false; }); for (let i = 0; i < reps; i++) { await fn(i); await sleep(420); } out[name] = stat(await p.evaluate(() => window.__lat.res)); };
      await measure('legend', async () => { const c = await center('button[aria-label="Legend"]'); await p.mouse.click(c[0], c[1]); });
      await measure('menu', async () => { const c = await center('#ef-btn'); await p.mouse.click(c[0], c[1]); }); await p.keyboard.press('Escape');
      await measure('speed', async (i) => { const pos = await p.evaluate((i) => { const bs = [...document.querySelectorAll('#gt-timeline button')].filter((x) => /^(1x|2x)$/.test(x.textContent.trim())); const r = bs[i % 2].getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; }, i); await p.mouse.click(pos[0], pos[1]); });
      await measure('filters', async () => { const c = await center('button[aria-label="Filter"]'); await p.mouse.click(c[0], c[1]); });
    } finally { await S0.close(); }
    const O = await session(dist, { onboarded: false, app: false, tiles: 'block' });
    try {
      const q = O.page; await waitFor(async () => (await q.getByText('New to Gettysburg').count()) > 0, { timeout: 40000 });
      const ms = await q.evaluate(() => new Promise((res) => { const b = [...document.querySelectorAll('button')].find((x) => /New to Gettysburg/.test(x.textContent)); const t0 = performance.now(); new MutationObserver((_, o) => { if ([...document.querySelectorAll('button')].some((x) => /Next →/.test(x.textContent))) { o.disconnect(); requestAnimationFrame(() => res(performance.now() - t0)); } }).observe(document.body, { subtree: true, childList: true }); b.click(); }));
      out.welcome = { n: 1, med: +ms.toFixed(1), p90: +ms.toFixed(1) };
    } finally { await O.close(); }
    const H = await session(dist, { tiles: 'block', app: false }); const hp = H.page;
    try {
      await hp.goto(`${H.origin}/historian.html`); await hp.waitForSelector('#ask-row', { state: 'visible', timeout: 30000 }); await sleep(500); const xs = [];
      for (let i = 0; i < (QUICK ? 4 : 8); i++) { await hp.fill('#ask', ['20th Maine', 'Little Round Top', 'Iron Brigade', 'Cemetery Hill'][i % 4]); const ms = await hp.evaluate(() => new Promise((res) => { const t0 = performance.now(); const n0 = document.querySelectorAll('.msg').length; const f = () => { if (document.querySelectorAll('.msg').length > n0) requestAnimationFrame(() => requestAnimationFrame(() => res(performance.now() - t0))); else requestAnimationFrame(f); }; document.getElementById('ask-row').requestSubmit(); f(); })); xs.push(ms); await sleep(300); }
      out.historian = stat(xs);
    } finally { await H.close(); }
    return out;
  };
  const a = await run(CONTROL), b = await run(DIST); const lines = [];
  for (const k of Object.keys(a)) { t.note(k, `control ${a[k].med}/${a[k].p90} ms, polish ${b[k].med}/${b[k].p90} ms (median/p90)`); if (b[k].med > a[k].med + 6) lines.push(`${k}: median ${b[k].med} ms vs ${a[k].med} ms on the control`); }
  assert(!lines.length, lines.join('\n    '));
});

// ------------------------------------------------------------------------------------------------------------------------------------------ 10 nothing else changed
suite.test('T0-POL-10', 'nothing else changed: same menu links, same units on the field and clock at four moments, deep links still land, no console error', async (t) => {
  if (!CONTROL) throw new Skip('needs --control <tree without POLISH>');
  const grab = async (dist) => {
    const S0 = await session(dist, { tiles: 'block', query: '?tick=538', wait: 3500 }); const p = S0.page; const o = {};
    try {
      o.deep = await p.evaluate(() => document.querySelector('input[aria-label="Battle time"]').value);
      o.links = await p.evaluate(() => [...document.querySelectorAll('#ef-menu a')].map((a) => a.getAttribute('href')).sort());
      o.pin = await p.evaluate(() => document.querySelector('.gtbg-historian-pin').getAttribute('href'));
      o.moments = {};
      for (const tk of [1, 300, 538, 675]) { await jump(p, tk); await sleep(500); o.moments[tk] = await p.evaluate(() => { const ov = [...document.querySelectorAll('main#root div')].find((d) => d.firstElementChild && /^Overview/.test(d.firstElementChild.textContent) && d.querySelector('canvas')); return { footer: ov ? ov.lastElementChild.textContent : null, clock: document.querySelector('input[aria-label="Battle time"]').getAttribute('aria-valuetext') }; }); }
      o.errs = S0.errors().filter((e) => !/mapbox|tile|net::|Failed to load resource/i.test(JSON.stringify(e))).length;
    } finally { await S0.close(); }
    return o;
  };
  const a = await grab(CONTROL), b = await grab(DIST); const lines = [];
  if (a.deep !== b.deep) lines.push(`deep link ?tick=538 lands on ${b.deep}, control ${a.deep}`);
  // the one intended difference: the menu's last group carries the User Guide link (T0-POL-13); everything else is the control's list
  if (!b.links.includes('/user-guide.pdf')) lines.push('the More to Explore menu has no User Guide link');
  if (JSON.stringify(a.links) !== JSON.stringify(b.links.filter((h) => h !== '/user-guide.pdf'))) lines.push(`menu links differ: ${JSON.stringify(a.links)} vs ${JSON.stringify(b.links)}`);
  if (a.pin !== b.pin) lines.push('the Ask the Historian link changed');
  if (JSON.stringify(a.moments) !== JSON.stringify(b.moments)) lines.push(`units/clock differ: ${JSON.stringify(a.moments)} vs ${JSON.stringify(b.moments)}`);
  if (b.errs > a.errs) lines.push(`${b.errs} console errors vs ${a.errs} on the control`);
  t.note('menu links', b.links.length);
  assert(!lines.length, lines.join('\n    '));
});

// ------------------------------------------------------------------------------------------------------------------------------------------ 11 gate parity
suite.test('T0-POL-11', "the builder's gate rows of the tree are the control's rows (POLISH adds no failing row)", async () => {
  const gateOf = (dist) => { const root = path.dirname(dist); const an = path.join(root, 'anchors.json'); if (!fs.existsSync(an)) return null; const out = path.join(root, 'gate-spec.json'); cp.spawnSync('node', [path.join(REPO, 'tools/t0/gate.mjs'), '--train', 'R1c', '--dist', dist, '--anchors', an, '--out', out, '--legacy', path.join(REPO, 'baseline/dist'), '--ledger', path.join(REPO, 'ops/used-names.txt')], { cwd: REPO, encoding: 'utf8' }); return JSON.parse(fs.readFileSync(out, 'utf8')); };
  if (!CONTROL) throw new Skip('needs --control');
  const a = gateOf(CONTROL), b = gateOf(DIST); if (!a || !b) throw new Skip('no anchors.json beside the trees');
  const rows = (g) => g.checks.map((c) => `${c.id}:${c.ok ? 'PASS' : 'FAIL'}`);
  assert(JSON.stringify(rows(a)) === JSON.stringify(rows(b)), `gate rows differ:\n    control ${rows(a).join(' ')}\n    tree    ${rows(b).join(' ')}`);
  const dm = (g) => (g.checks.find((c) => c.id === 'data-untouched') || {}).modified || [];
  assert(JSON.stringify(dm(a)) === JSON.stringify(dm(b)), 'the data files that differ from the baseline are not the same as on the control');
  assert(b.checks.find((c) => c.id === 'anchors').ok, 'anchor rows failed');
});

// ------------------------------------------------------------------------------------------------------------------------------------------ 12 builds and orders
suite.test('T0-POL-12', 'the group builds with the unmodified builder after MON, with and without ANIM in either order, with the PG-legal companion (PG-polish-legal), and refuses to build before CLOCK/DATA/MON or the companion without PG-legal', async (t) => {
  if (!BUILD) throw new Skip('pass --build (about 4 minutes)');
  const py = (out, groups, expectOk) => {
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
  const lines = [], base = path.join(REPO, 'tmp', 'polish', 'spec-build');
  const A = py(path.join(base, 'a'), ['CLOCK', 'DATA', 'MON', 'POLISH', 'PG-polish']); if (A.code !== 0) lines.push('CLOCK,DATA,MON,POLISH,PG-polish did not build: ' + A.out.slice(-400));
  const B1 = py(path.join(base, 'b'), ['CLOCK', 'DATA', 'MON', 'ANIM', 'POLISH', 'PG-polish']); if (B1.code !== 0) lines.push('...ANIM,POLISH did not build: ' + B1.out.slice(-400));
  const B2 = py(path.join(base, 'c'), ['CLOCK', 'DATA', 'MON', 'POLISH', 'ANIM', 'PG-polish']); if (B2.code !== 0) lines.push('...POLISH,ANIM did not build: ' + B2.out.slice(-400));
  if (B1.code === 0 && B2.code === 0) {
    const md5 = (d) => { const f = fs.readdirSync(path.join(d, 'dist/assets')).find((x) => /^index-.*\.js$/.test(x)); return cp.execSync(`node -e "const c=require('crypto');console.log(c.createHash('md5').update(require('fs').readFileSync(process.argv[1])).digest('hex'))" "${path.join(d, 'dist/assets', f)}"`).toString().trim(); };
    if (md5(path.join(base, 'b')) !== md5(path.join(base, 'c'))) lines.push('the entry bundle differs between ANIM,POLISH and POLISH,ANIM (the two groups do not commute)');
  }
  // the companion page group for a build that also carries the interim privacy page (PG-legal): it builds with PG-legal, leaves no retired name on that page, and is refused without PG-legal
  const G = py(path.join(base, 'e'), ['CLOCK', 'DATA', 'MON', 'POLISH', 'PG-legal', 'PG-polish', 'PG-polish-legal']);
  if (G.code !== 0) lines.push('...PG-legal,PG-polish,PG-polish-legal did not build: ' + G.out.slice(-400));
  else { const priv = fs.readFileSync(path.join(base, 'e', 'dist', 'privacy.html'), 'utf8'); const left = priv.match(RETIRED_RE_G) || []; if (left.length) lines.push('privacy.html (PG-legal) still reads: ' + [...new Set(left)].join(', ')); }
  const GN = py(path.join(base, 'f'), ['CLOCK', 'DATA', 'MON', 'POLISH', 'PG-polish', 'PG-polish-legal']); if (GN.code === 0) lines.push('PG-polish-legal built without PG-legal (it must refuse: it anchors on the text of PG-legal)');
  const W = py(path.join(base, 'd'), ['POLISH', 'CLOCK', 'DATA', 'MON', 'PG-polish']); if (W.code === 0) lines.push('POLISH before CLOCK/DATA/MON built (it must refuse: it anchors on their output)'); else if (!/POL-/.test(W.out) && !/anchor/i.test(W.out)) lines.push('the refusal does not name an anchor: ' + W.out.slice(-200));
  assert(!lines.length, lines.join('\n    '));
});


// ------------------------------------------------------------------------------------------------------------------------------------------ 13 the guide and Toggle Units are reachable everywhere
suite.test('T0-POL-13', 'the User Guide link and Toggle Units are reachable at 360, 390, 768, 1024, 1320, 1440 and 1920 wide, mouse and touch: in the toolbar where it has room, otherwise in the More to Explore menu or the phone Tools sheet; one home each, real input, target sizes, names, keyboard order', async (t) => {
  const lines = [], homes = [];
  const cases = QUICK
    ? [[390, 844, 1], [768, 1024, 1], [1024, 768, 1], [1024, 768, 0], [1440, 900, 0]]
    : [[360, 740, 1], [390, 844, 1], [768, 1024, 1], [1024, 768, 1], [1320, 800, 1], [1440, 900, 1], [1920, 1080, 1],
       [360, 740, 0], [390, 844, 0], [768, 1024, 0], [1024, 768, 0], [1320, 800, 0], [1440, 900, 0], [1920, 1080, 0]];
  const tap = async (S0, m, x, y) => { await sleep(200); if (m) await L.touchTap(S0.page, x, y); else await S0.page.mouse.click(x, y); await sleep(450); };
  const ONLY = opt('case', null);   // e.g. --case 360x740t
  for (const [w, h, m] of cases) {
    const tag = `${w}x${h}${m ? ' touch' : ' mouse'}`, fn = `${w}x${h}${m ? 't' : 'm'}`;
    if (ONLY && ONLY !== fn) continue;
    const S0 = await session(DIST, { vp: vpOf(w, h, m), tiles: 'block', query: '?tick=45', wait: 2500 });
    const p = S0.page;
    try {
      const layout = await p.evaluate(() => document.documentElement.dataset.layout);
      await p.evaluate(() => {
        window.__opened = []; document.addEventListener('click', (ev) => { const a = ev.target.closest && ev.target.closest('a[href]'); if (a && /user-guide\.pdf$/.test(a.getAttribute('href'))) { window.__opened.push([a.getAttribute('href'), a.hasAttribute('download')]); ev.preventDefault(); } }, true);   // records the guide download instead of performing it
        /** hit-testable box of an element: scrolled into view first, its centre must belong to it, the box must lie inside the viewport */
        window.__HIT = (e) => { if (!e) return null; e.scrollIntoView({ block: 'nearest', inline: 'nearest' }); const r = e.getBoundingClientRect(), cs = getComputedStyle(e); if (!r.width || !r.height || cs.display === 'none' || cs.visibility === 'hidden') return null; const x = r.x + r.width / 2, y = r.y + r.height / 2, top = document.elementFromPoint(x, y); return { ok: !!top && (top === e || e.contains(top)), w: Math.round(r.width), h: Math.round(r.height), x, y, inside: r.left >= -1 && r.top >= -1 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1 }; };
        window.__visible = (e) => { const o = window.__HIT(e); return o && o.ok && o.inside ? o : null; };
      });
      const minH = m ? 44 : 32;
      const size = (o, what) => { if (o.h < minH - 0.5) lines.push(`${tag}: ${what} is ${o.w}x${o.h}, under ${minH} px high`); if (m && o.w < 44 - 0.5) lines.push(`${tag}: ${what} is ${o.w} px wide, under 44`); if (!o.inside) lines.push(`${tag}: ${what} lies outside the viewport`); if (!o.ok) lines.push(`${tag}: ${what} is covered at its centre`); };
      let guide = null, units = null;
      if (layout === 'desktop') {
        const tbx = await p.evaluate(() => {
          const g = document.querySelector('#root .gtbg-tb-center a[download]'), u = [...document.querySelectorAll('#root .gtbg-tb-center button')].find((b) => /Toggle Units/.test(b.textContent));
          return { guide: window.__visible(g), units: window.__visible(u), guideHref: g && g.getAttribute('href'), guideName: g && g.textContent.trim() };
        });
        if (tbx.guide) { guide = 'toolbar'; size(tbx.guide, 'the toolbar User Guide link'); if (tbx.guideHref !== '/user-guide.pdf' || !/User Guide/.test(tbx.guideName)) lines.push(`${tag}: toolbar link is "${tbx.guideName}" -> ${tbx.guideHref}`); }
        if (tbx.units) { units = 'toolbar'; size(tbx.units, 'the toolbar Toggle Units button'); }
        if (!tbx.guide || !tbx.units) {
          // the real button, the real input
          const btn = await p.evaluate(() => window.__HIT(document.getElementById('ef-btn')));
          if (!btn || !btn.ok) lines.push(`${tag}: the More to Explore button cannot be reached`);
          else {
            await tap(S0, m, btn.x, btn.y);
            const mn = await p.evaluate(() => {
              const menu = document.getElementById('ef-menu'), g = menu.querySelector('a[href="/user-guide.pdf"]'), u = menu.querySelector('.gtbg-tool-units');
              return { open: menu.classList.contains('open'), guide: window.__visible(g), units: window.__visible(u), guideName: g && g.textContent.trim(), unitsName: u && u.textContent.trim(), pressed: u && u.getAttribute('aria-pressed'), dl: g && g.hasAttribute('download') };
            });
            if (!mn.open) lines.push(`${tag}: the More to Explore menu did not open`);
            if (!tbx.guide) {
              if (!mn.guide) lines.push(`${tag}: NO User Guide link anywhere (the toolbar hides it, the menu does not show it)`);
              else { guide = 'menu'; size(mn.guide, 'the menu User Guide link'); if (!/User Guide \(PDF\)/.test(mn.guideName || '')) lines.push(`${tag}: menu guide name "${mn.guideName}"`); if (!mn.dl) lines.push(`${tag}: the menu guide link has no download attribute`); }
            } else if (mn.guide) lines.push(`${tag}: the User Guide link is in the toolbar AND the menu (two homes)`);
            if (!tbx.units) {
              if (!mn.units) lines.push(`${tag}: NO Toggle Units anywhere`);
              else { units = 'menu'; size(mn.units, 'the menu Toggle Units button'); if (!/Toggle Units/.test(mn.unitsName || '')) lines.push(`${tag}: menu units name "${mn.unitsName}"`); if (mn.pressed !== 'true') lines.push(`${tag}: Toggle Units aria-pressed is ${mn.pressed} at the start`); }
            } else if (mn.units) lines.push(`${tag}: Toggle Units is in the toolbar AND the menu (two homes)`);
            await p.screenshot({ path: path.join(SHOTS, `guide-${fn}-menu.png`) });
            // keyboard: Enter on the button, the arrow keys walk the entries in DOM order, the new group comes after the last page group
            await p.keyboard.press('Escape'); await sleep(200);
            await p.focus('#ef-btn'); await p.keyboard.press('Enter'); await sleep(350);
            const seq = [];
            for (let i = 0; i < 40; i++) {
              const a = await p.evaluate(() => { const e = document.activeElement; return e && e.classList.contains('gtbg-item') ? e.querySelector('.gtbg-item-label').textContent.replace('★', '').trim() : null; });
              if (a && seq.includes(a)) break; if (a) seq.push(a);
              await p.keyboard.press('ArrowDown'); await sleep(40);
            }
            const tail = seq.slice(-2);
            const want = guide === 'menu' && units === 'menu' ? ['User Guide (PDF)', 'Toggle Units'] : guide === 'menu' ? ['Export a Video', 'User Guide (PDF)'] : units === 'menu' ? ['Export a Video', 'Toggle Units'] : ['Watch Together', 'Export a Video'];
            if (JSON.stringify(tail) !== JSON.stringify(want)) lines.push(`${tag}: keyboard order ends ${JSON.stringify(tail)}, want ${JSON.stringify(want)} (${seq.length} stops)`);
            await p.keyboard.press('End'); await sleep(80);
            const endLab = await p.evaluate(() => { const e = document.activeElement; const l = e && e.querySelector && e.querySelector('.gtbg-item-label'); return l ? l.textContent.replace('★', '').trim() : null; });
            if (endLab !== want[1]) lines.push(`${tag}: End focuses "${endLab}", want "${want[1]}"`);
            await p.keyboard.press('Escape'); await sleep(150);
            const back = await p.evaluate(() => document.activeElement && document.activeElement.id);
            if (back !== 'ef-btn') lines.push(`${tag}: Escape leaves focus on "${back}", want the menu button`);
            // Toggle Units from the menu: real input flips the state, the state text follows, a second press restores it
            if (units === 'menu') {
              await p.focus('#ef-btn'); await p.keyboard.press('Enter'); await sleep(350);
              const press = async () => { const ub = await p.evaluate(() => window.__HIT(document.querySelector('#ef-menu .gtbg-tool-units'))); await tap(S0, m, ub.x, ub.y); return p.evaluate(() => ({ shown: window.GTBG_UNITS.get(), pressed: document.querySelector('#ef-menu .gtbg-tool-units').getAttribute('aria-pressed'), open: document.getElementById('ef-menu').classList.contains('open'), desc: document.querySelector('#ef-menu .gtbg-tool-units .gtbg-item-desc').textContent })); };
              const a1 = await press();
              if (a1.shown !== false || a1.pressed !== 'false') lines.push(`${tag}: Toggle Units did not hide the units (store ${a1.shown}, pressed ${a1.pressed})`);
              if (!/hidden/i.test(a1.desc)) lines.push(`${tag}: the state text says "${a1.desc}"`);
              if (!a1.open) lines.push(`${tag}: pressing Toggle Units closed the menu`);
              const a2 = await press();
              if (a2.shown !== true || a2.pressed !== 'true') lines.push(`${tag}: a second press did not bring the units back (${JSON.stringify(a2)})`);
              // the toolbar button (hidden by the stylesheet at this width) toggling the same state keeps the menu entry in step
              await p.evaluate(() => { const b = [...document.querySelectorAll('#root .gtbg-tb-center button')].find((x) => /Toggle Units/.test(x.textContent)); if (b) b.click(); }); await sleep(250);
              const a3 = await p.evaluate(() => ({ shown: window.GTBG_UNITS.get(), pressed: document.querySelector('#ef-menu .gtbg-tool-units').getAttribute('aria-pressed') }));
              if (a3.shown !== false || a3.pressed !== 'false') lines.push(`${tag}: the toolbar button and the menu entry disagree (${JSON.stringify(a3)})`);
              await p.evaluate(() => window.GTBG_UNITS.toggle());
            }
          }
        } else await p.screenshot({ path: path.join(SHOTS, `guide-${fn}-toolbar.png`), clip: { x: 0, y: 0, width: w, height: 70 } });
        if (units === 'toolbar') {
          const press = async () => { const ub = await p.evaluate(() => window.__HIT([...document.querySelectorAll('#root .gtbg-tb-center button')].find((b) => /Toggle Units/.test(b.textContent)))); await tap(S0, m, ub.x, ub.y); return p.evaluate(() => (window.GTBG_UNITS ? window.GTBG_UNITS.get() : null)); };   // GTBG_UNITS is the hook of this group; null on a tree without it
          const s1 = await press(), s2 = await press();
          if (s1 !== false || s2 !== true) lines.push(`${tag}: the toolbar Toggle Units did not flip the units (${s1}, ${s2})`);
        }
      } else {
        // phone and tablet shell: the Tools sheet
        const openTools = async () => { const tb = await p.evaluate(() => window.__HIT([...document.querySelectorAll('button')].find((x) => /^\W*Tools\s*$/.test(x.textContent.trim())))); if (!tb || !tb.ok) return false; await tap(S0, m, tb.x, tb.y); await sleep(700); return true; };   // the sheet slides in: measure after it has settled
        if (!(await openTools())) lines.push(`${tag}: the Tools button of the phone shell cannot be reached`);
        else {
          const sheet = await p.evaluate(() => {
            const dlg = document.querySelector('[role=dialog][aria-label=Tools]'); if (!dlg) return null;
            const btns = [...dlg.querySelectorAll('button')], g = btns.find((b) => /User Guide/.test(b.textContent)), u = btns.find((b) => /Toggle Units/.test(b.textContent));
            return { guide: window.__HIT(g), units: window.__HIT(u), order: btns.map((b) => b.textContent.replace(/\s+/g, ' ').trim().replace(/^[^A-Za-z]+/, '')).filter(Boolean) };
          });
          if (!sheet) lines.push(`${tag}: the Tools sheet did not open`);
          else {
            if (!sheet.guide) lines.push(`${tag}: NO User Guide tile in the Tools sheet`); else { guide = 'tools'; size(sheet.guide, 'the Tools sheet User Guide tile'); }
            if (!sheet.units) lines.push(`${tag}: NO Toggle Units tile in the Tools sheet`); else { units = 'tools'; size(sheet.units, 'the Tools sheet Toggle Units tile'); }
            const o = sheet.order, iH = o.findIndex((x) => /^Help$/.test(x)), iG = o.findIndex((x) => /User Guide/.test(x)), iU = o.findIndex((x) => /Toggle Units/.test(x));
            if (!(iH >= 0 && iG === iH + 1 && iU === iH + 2)) lines.push(`${tag}: Tools sheet order is ${o.slice(Math.max(0, iH - 1), iH + 4).join(' | ')} (want Help, User Guide, Toggle Units)`);
            await p.screenshot({ path: path.join(SHOTS, `guide-${fn}-tools.png`) });
            if (sheet.guide) {
              const gb = await p.evaluate(() => window.__HIT([...document.querySelectorAll('[role=dialog][aria-label=Tools] button')].find((x) => /User Guide/.test(x.textContent))));   // measured again: the first measurement may have scrolled the sheet
              await tap(S0, m, gb.x, gb.y);
              const op = await p.evaluate(() => window.__opened);
              if (!op.length || op[0][0] !== '/user-guide.pdf' || !op[0][1]) lines.push(`${tag}: the User Guide tile started ${JSON.stringify(op)}, want a download of /user-guide.pdf`);
              if (await p.evaluate(() => !!document.querySelector('[role=dialog][aria-label=Tools]'))) lines.push(`${tag}: the sheet stayed open after the User Guide tile`);
            }
            if (await openTools()) {
              const u2 = await p.evaluate(() => window.__HIT([...document.querySelectorAll('[role=dialog][aria-label=Tools] button')].find((x) => /Toggle Units/.test(x.textContent))));
              if (u2) {
                await tap(S0, m, u2.x, u2.y);
                const s1 = await p.evaluate(() => window.GTBG_UNITS && window.GTBG_UNITS.get());
                if (s1 !== false) lines.push(`${tag}: the Toggle Units tile did not hide the units (${s1})`);
                await p.evaluate(() => window.GTBG_UNITS.toggle());
                if ((await p.evaluate(() => window.GTBG_UNITS.get())) !== true) lines.push(`${tag}: units not restored`);
              }
            }
          }
        }
      }
      if (!guide) lines.push(`${tag}: the User Guide has no home`);
      if (!units) lines.push(`${tag}: Toggle Units has no home`);
      homes.push(`${tag} ${layout}: guide ${guide}, units ${units}`);
    } finally { await S0.close(); }
  }
  // the seams: at each width where the toolbar drops one of them (849/850, 989/990, 1099/1100, 1319/1320) exactly one home shows each, mouse and touch
  for (const m of QUICK ? [1] : [0, 1]) {
    const S0 = await session(DIST, { vp: vpOf(1440, 800, m), tiles: 'block', query: '?tick=45', wait: 2500 });
    try {
      for (const w of QUICK ? [989, 990, 1319, 1320] : [835, 849, 850, 989, 990, 1099, 1100, 1319, 1320]) {
        await emulateViewport(S0.page, vpOf(w, 800, m)); await sleep(450);
        if ((await S0.page.evaluate(() => document.documentElement.dataset.layout)) !== 'desktop') continue;
        await S0.page.evaluate(() => { document.getElementById('ef-menu').classList.add('open'); if (window.GTBG_FIT_EF_MENU) window.GTBG_FIT_EF_MENU(); }); await sleep(400);   // opened so that the entries can be measured
        const r = await S0.page.evaluate(() => {
          const shown = (e) => { if (!e) return false; e.scrollIntoView({ block: 'nearest', inline: 'nearest' }); const r = e.getBoundingClientRect(), cs = getComputedStyle(e); if (!r.width || cs.display === 'none' || cs.visibility === 'hidden') return false; const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return r.right <= innerWidth + 1 && !!top && (top === e || e.contains(top)); };
          const menu = document.getElementById('ef-menu');
          const o = { tg: shown(document.querySelector('#root .gtbg-tb-center a[download]')), tu: shown([...document.querySelectorAll('#root .gtbg-tb-center button')].find((b) => /Toggle Units/.test(b.textContent))), mg: shown(menu.querySelector('a[href="/user-guide.pdf"]')), mu: shown(menu.querySelector('.gtbg-tool-units')), group: menu.querySelector('.gtbg-group-tools') ? getComputedStyle(menu.querySelector('.gtbg-group-tools')).display : 'absent' };
          menu.classList.remove('open'); return o;
        });
        const tag = `${w}${m ? ' touch' : ' mouse'}`; if (process.env.POL_DEBUG) console.log(tag, JSON.stringify(r));
        if (r.tg === r.mg) lines.push(`${tag}: the User Guide link is ${r.tg ? 'in both the toolbar and the menu' : 'nowhere'}`);
        if (r.tu === r.mu) lines.push(`${tag}: Toggle Units is ${r.tu ? 'in both the toolbar and the menu' : 'nowhere'}`);
        if ((r.group === 'none') !== (r.tg && r.tu)) lines.push(`${tag}: the menu group is ${r.group} while the toolbar shows ${r.tg ? 'the guide' : 'no guide'} and ${r.tu ? 'Toggle Units' : 'no Toggle Units'}`);
      }
    } finally { await S0.close(); }
  }
  // the file the link points at is served, and is a PDF
  const S1 = await session(DIST, { tiles: 'block', wait: 500, app: false });
  try { const r = await S1.page.evaluate(async () => { const x = await fetch('/user-guide.pdf'); const b = new Uint8Array(await x.arrayBuffer()); return { ok: x.ok, head: String.fromCharCode(...b.slice(0, 5)), n: b.length }; }); if (!r.ok || r.head !== '%PDF-') lines.push(`/user-guide.pdf is not served as a PDF (${JSON.stringify(r)})`); } finally { await S1.close(); }
  t.note('homes', homes.join('; '));
  assert(!lines.length, `${lines.length} problems:\n    ` + lines.slice(0, 24).join('\n    '));
});

const t0 = Date.now();
const summary = await suite.run({ filter: FILTER, outFile: OUT, extra: () => ({ dist: path.relative(REPO, DIST), control: CONTROL ? path.relative(REPO, CONTROL) : null, minutes: +((Date.now() - t0) / 60000).toFixed(1) }) });
if (EXPECT_RED) { const ran = summary.results.filter((r) => r.status !== 'skip'); const pass = ran.filter((r) => r.status === 'pass'); console.log(`expect-red: ${ran.length - pass.length} of ${ran.length} tests failed${pass.length ? `; still green: ${pass.map((r) => r.id).join(', ')}` : ''}`); process.exit(ran.length && ran.every((r) => r.status === 'fail') ? 0 : 1); }
process.exit(summary.failed ? 1 : 0);
