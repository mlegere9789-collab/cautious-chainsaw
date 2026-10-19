// CLOCK acceptance (owner decision 2026-10-05, item 2): every place the app prints a time, a date or a time-derived string comes from the one time model,
// for all 675 ticks, on the desktop shell and on the phone shell, in real system Chrome with real input.
//
//   node tests/t0/clock.spec.mjs                                   against tmp/clock-integrate/clock-R1c/dist (built here when missing)
//   node tests/t0/clock.spec.mjs --dist tmp/x/dist --filter 'T0-CLK-0[23]'
//   node tests/t0/clock.spec.mjs --dist release/R1c/dist --expect-red     red-first: R1c WITHOUT the group must fail the clock tests
//
// The expected strings are NOT taken from src/lib/time: tools/t0/clock/oracle.mjs recomputes them from data-src/time/time_anchors.json alone (straight line between
// the anchors, 5-minute rounding, midnight roll-over, "Night of July 1-2" before civil dawn, "about" from the anchors' own sigma_min and state). A clock string that
// is on the screen but not in the oracle's list for that tick is a failure ("stray clock"), and so is an expected string that is missing.
//
// Ids: T0-CLK-01 oracle self-check against the anchors file; -02 desktop, every tick 1..675 through the scrubber; -03 phone, every tick 1..675 through the step button;
//      -04 the hour buttons and keys move 60 battle minutes; -05 deep links (?tick=, ?t=) at every anchor and day boundary, both shells; -06 day tabs;
//      -07 event cards and toasts; -08 unit panel; -09 bookmarks; -10 Help; -11 Story cards (NPS Auto Tour); -12 sub-pages; -13 Ask the Historian;
//      -14 no July 4-9 date, no "Tick n", no five-minute claim; -15 frames stay permanent ids (same units on the same ticks as the control tree); -16 build proof.
process.env.T0_AGENT ??= 'clock-integrate';
process.env.T0_PORT_BASE ??= '9130';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const {
  REPO, PORT_BASE, openSession, createStaticServer, createSuite, assert, assertEq, sleep, waitFor, waitForApp, chooseLayout, VIEWPORTS, Skip,
} = await import('./lib.mjs');
const { makeOracle } = await import('../../tools/t0/clock/oracle.mjs');

const argv = process.argv.slice(2);
const opt = (name, dflt) => { const i = argv.indexOf(`--${name}`); return i >= 0 ? (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true) : dflt; };
const DEFAULT_DIST = 'tmp/clock-integrate/clock-R1c/dist';
const DIST = path.resolve(REPO, opt('dist', DEFAULT_DIST));
const CONTROL = path.resolve(REPO, opt('control', 'release/R1c/dist'));
const FILTER = opt('filter', null);
const EXPECT_RED = !!opt('expect-red', false);
const STEP = Number(opt('step', 1));                                   // debugging: test every STEP-th tick only (the default tests all 675)
if (!fs.existsSync(DIST) && path.relative(REPO, DIST).replace(/\\/g, '/') === DEFAULT_DIST) {
  console.log('building the tree under test: node tools/t0/clock/build-clock.mjs --no-verify && clock_build.py');
  const r = spawnSync('python', ['tools/t0/clock/clock_build.py', '--train', 'R1c', '--out', 'tmp/clock-integrate/clock-R1c', '--no-gate'], { cwd: REPO, stdio: 'inherit' });
  if (r.status !== 0) process.exit(2);
}
if (!fs.existsSync(DIST)) { console.error(`dist not found: ${DIST}`); process.exit(2); }
const O = makeOracle();
const GROUPS = (() => { try { return JSON.parse(fs.readFileSync(path.join(DIST, 'version.json'), 'utf8')).groups || []; } catch { return []; } })();
const srv = await createStaticServer({ root: DIST, port: PORT_BASE });
const ORIGIN = srv.url;
const sessions = [];
let seq = 0;
const open = async (opts) => {
  for (let attempt = 1; ; attempt++) {
    const n = ++seq;
    const live = new Set(sessions.map((x) => x.chrome.port));
    let port = PORT_BASE + 2 + (n % 8); while (live.has(port)) port = PORT_BASE + 2 + ((port - PORT_BASE - 1) % 8);
    try { const s = await openSession({ ...opts, cdpPort: port, profile: `${opts.profile}-${n}`, tiles: 'block' }); sessions.push(s); return s; }
    catch (e) { if (attempt >= 3) throw e; await sleep(2000); }
  }
};
const closeSession = async (s) => { await s.close(); const i = sessions.indexOf(s); if (i >= 0) sessions.splice(i, 1); };
const PHONE = { width: 390, height: 844, deviceScaleFactor: 2, mobile: true, hasTouch: true };
const bootTo = async (S, query, shell) => {
  await S.page.goto(`${ORIGIN}/${query}`, { waitUntil: 'load' });
  await waitForApp(S.page, 45000);
  await chooseLayout(S.page, shell);
  await sleep(shell === 'phone' ? 900 : 1200);
};

// ------------------------------------------------------------------ what the page shows (runs in the page)
/** every visible text and attribute string that looks like a clock, a date, a frame number, an uncertainty note or the word tick */
function scanDom() {
  const re = /\d{1,2}:\d{2}\s?[AaPp]\.?[Mm]|1863|Night of|\bJuly\b|Frame \d|give or take|\b[Tt]icks?\b|five-minute|5 minutes|\d+ minutes? per|real time/;
  const seen = [];
  const visible = (el) => { if (!el.getClientRects().length) return false; const cs = getComputedStyle(el); return cs.visibility !== 'hidden' && cs.display !== 'none'; };
  for (const el of document.querySelectorAll('body *')) {
    if (['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(el.tagName)) continue;
    const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').replace(/\s+/g, ' ').trim();
    const vis = visible(el);
    if (own && vis && re.test(own)) seen.push({ k: 'text', s: own, cls: el.className && typeof el.className === 'string' ? el.className : '', id: el.id || '' });
    for (const a of ['title', 'aria-label', 'aria-valuetext', 'placeholder', 'alt']) {
      const v = el.getAttribute(a);
      if (v && vis && re.test(v)) seen.push({ k: a, s: v.replace(/\s+/g, ' ').trim(), cls: '', id: el.id || '' });
    }
  }
  return seen;
}
/** the clock strings of the desktop shell */
function readDesktop() {
  const out = {};
  const chip = document.querySelector('.gtbg-tb-tick');
  out.chip = chip ? chip.textContent.trim() : null;
  out.tab = chip && chip.previousElementSibling ? chip.previousElementSibling.textContent.trim() : null;
  const input = document.querySelector('input[aria-label="Battle time"]');
  out.aria = input ? input.getAttribute('aria-valuetext') : null;
  out.value = input ? Number(input.value) : null;
  const foot = document.querySelector('[data-gt-frame]');
  out.frame = foot ? Number(foot.getAttribute('data-gt-frame')) : null;
  out.footText = foot ? foot.textContent.trim() : null;
  out.footTitle = foot ? foot.getAttribute('title') : null;
  const bar = document.getElementById('gt-timeline');
  out.barText = bar && bar.firstElementChild ? bar.firstElementChild.textContent.trim() : null;
  out.barTitle = bar && bar.firstElementChild ? bar.firstElementChild.getAttribute('title') : null;
  const all = [...document.querySelectorAll('body div, body span')].filter((e) => e.children.length === 0);
  const mm = all.map((e) => /^(\d+) units · (.*)$/.exec(e.textContent.trim())).find(Boolean);
  out.minimap = mm ? mm[0] : null;
  out.units = mm ? Number(mm[1]) : null;
  const hud = all.find((e) => /, 1863$/.test(e.textContent.trim()) && !e.closest('#gt-timeline'));
  out.hudDate = hud ? hud.textContent.trim() : null;
  return out;
}
/** the clock strings of the phone shell */
function readPhone() {
  const out = {};
  const top = document.querySelector('.gtbg-m-top');
  out.top = top ? [...top.querySelectorAll('div')].filter((d) => d.children.length === 0).map((d) => d.textContent.trim()).filter(Boolean) : null;
  const foot = document.querySelector('[data-gt-frame]');
  out.frame = foot ? Number(foot.getAttribute('data-gt-frame')) : null;
  out.footText = foot ? foot.textContent.trim() : null;
  out.footTitle = foot ? foot.getAttribute('title') : null;
  return out;
}
// vignette trigger ticks of the tree under test: a vignette card shows for triggers in [t-2, t] and its jump button carries the clock of ITS frame
const VIG_TICKS = (() => { const out = []; for (const f of fs.readdirSync(path.join(DIST, 'data')).filter((x) => /^vignettes_part\d\.json$/.test(x))) for (const v of JSON.parse(fs.readFileSync(path.join(DIST, 'data', f), 'utf8')).vignettes || []) out.push(v.trigger_tick); return out; })();
const vigStrings = (t) => { const a = new Set(); for (const k of VIG_TICKS) if (k >= t - 2 && k <= t) { const tm = O.fmt(k, 'time'); a.add(`⏩ ${tm}`); a.add(`Jump to ${tm}`); } return a; };
const tabDay = (t) => { const i = O.tabDays.findIndex(([a, b]) => t >= a && t <= b); return i + 1; };
const STATIC_OK = [/^July [123]$/, /^What happened after July 3rd\.$/, /^Animated Battlefield Map · July 1–3, 1863$/, /^July 1–3, 1863 · 675 snapshots in time$/];
const PROSE = 110;                                                      // longer strings are story text: the prose inventory (tools/t0/clock/prose-inventory.mjs) covers them, not this test
const isClockish = (s) => /\d{1,2}:\d{2}\s?[AaPp]\.?[Mm]|1863|Night of|Frame \d|give or take|\b[Tt]icks?\b|five-minute|5 minutes/.test(s);

/** problems of one desktop reading at tick t (empty = the screen agrees with the oracle) */
function desktopProblems(t, d, strings) {
  const p = [];
  const want = { chip: O.fmt(t, 'chip'), aria: O.fmt(t, 'compat'), barText: O.fmt(t, 'compat'), footText: O.fmt(t, 'time'), hudDate: O.fmt(t, 'date'), tab: `July ${tabDay(t)}` };
  for (const [k, v] of Object.entries(want)) if (d[k] !== v) p.push(`${k}: "${d[k]}" want "${v}"`);
  const wantTitle = `${O.fmt(t, 'frame')} · ${O.uncertaintyText(t)}`;
  if (d.footTitle !== wantTitle) p.push(`footer tooltip: "${d.footTitle}" want "${wantTitle}"`);
  if (d.barTitle !== O.uncertaintyText(t)) p.push(`clock tooltip: "${d.barTitle}" want "${O.uncertaintyText(t)}"`);
  if (d.frame !== t) p.push(`frame: ${d.frame}`);
  if (d.minimap !== null && !d.minimap.endsWith(` units · ${O.fmt(t, 'time')}`)) p.push(`minimap: "${d.minimap}"`);
  if (d.minimap === null) p.push('minimap footer not found');
  const allowed = new Set([want.chip, want.aria, want.footText, want.hudDate, wantTitle, O.uncertaintyText(t), O.fmt(t, 'time'), O.fmt(t, 'compat'), d.minimap, ...vigStrings(t)].filter(Boolean));
  for (const x of strings) {
    if (allowed.has(x.s) || STATIC_OK.some((r) => r.test(x.s))) continue;
    if (!isClockish(x.s) || x.s.length > PROSE) continue;
    p.push(`stray clock text (${x.k}${x.cls ? ' .' + String(x.cls).split(' ')[0] : ''}): "${x.s}"`);
  }
  return p;
}
function phoneProblems(t, d, strings) {
  const p = [];
  const day = O.fmt(t, 'day'), time = O.fmt(t, 'time');
  if (!d.top || d.top[0] !== day) p.push(`header date: ${JSON.stringify(d.top)} want "${day}"`);
  if (!d.top || d.top[1] !== time) p.push(`header time: ${JSON.stringify(d.top)} want "${time}"`);
  if (d.footText !== time) p.push(`transport time: "${d.footText}" want "${time}"`);
  const wantTitle = `${O.fmt(t, 'frame')} · ${O.uncertaintyText(t)}`;
  if (d.footTitle !== wantTitle) p.push(`transport tooltip: "${d.footTitle}" want "${wantTitle}"`);
  if (d.frame !== t) p.push(`frame: ${d.frame}`);
  const allowed = new Set([day, time, wantTitle, O.uncertaintyText(t), ...vigStrings(t)]);
  for (const x of strings) {
    if (allowed.has(x.s) || STATIC_OK.some((r) => r.test(x.s))) continue;
    if (!isClockish(x.s) || x.s.length > PROSE) continue;
    p.push(`stray clock text (${x.k}): "${x.s}"`);
  }
  return p;
}
const TICKS = Array.from({ length: 675 }, (_, i) => i + 1).filter((t) => STEP === 1 || t % STEP === 1 || t === 675);
const suite = createSuite('clock');

// ================================================================== T0-CLK-01 the oracle itself
suite.test('T0-CLK-01', 'the independent oracle agrees with the anchors file: every anchor tick prints its own time, the clock is strictly increasing, July 1-3 only, "about" follows the written policy', async (t) => {
  const doc = O.anchorsDoc;
  let prev = -Infinity;
  for (let k = 1; k <= 675; k++) { const m = O.minutes(k); assert(m > prev, `clock not increasing at tick ${k}`); prev = m; }
  for (const a of doc.anchors) {
    const want = a.t.slice(11); const [h, mi] = want.split(':').map(Number);
    const p = O.parts(a.tick, 0);
    assertEq([p.hour, p.minute], [h, mi], `anchor ${a.tick} (${a.t})`);
    assertEq(p.date, +a.t.slice(8, 10), `anchor ${a.tick} date`);
  }
  assertEq(O.fmt(1, 'compat'), `July 1, ${O.about(1) ? 'about ' : ''}5:00 AM`, 'tick 1');
  for (let k = 1; k <= 675; k++) assert(!/July [4-9]/.test(O.fmt(k, 'date')), `oracle prints a July 4-9 date at ${k}`);
  const aboutCount = TICKS.filter((k) => O.about(k)).length;
  t.note('ticks printed with "about" by the written policy', `${aboutCount} of ${TICKS.length}`);
  t.note('first tick of each tab', O.tabDays.map(([a]) => O.fmt(a, 'compat')));
});

// ================================================================== T0-CLK-02 desktop, every tick
suite.test('T0-CLK-02', 'desktop shell, ticks 1..675 through the scrubber: HUD date, toolbar clock and tab, time bar clock, footer clock, slider text, minimap footer and tooltips equal the oracle; no stray clock', async (t) => {
  const S = await open({ profile: 'desk' });
  try {
    await bootTo(S, '', 'desktop');
    await waitFor(async () => (await S.page.evaluate(readDesktop)).units, { timeout: 30000, label: 'minimap (data loaded)' });
    const bad = [];
    let checked = 0;
    for (const tick of TICKS) {
      const r = await S.page.evaluate(async (tk) => {
        const el = document.querySelector('input[aria-label="Battle time"]');
        const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
        set.call(el, String(tk)); el.dispatchEvent(new Event('input', { bubbles: true }));
        const t0 = performance.now();
        while (performance.now() - t0 < 600) { const f = document.querySelector('[data-gt-frame]'); if (f && Number(f.getAttribute('data-gt-frame')) === tk) break; await new Promise((res) => requestAnimationFrame(res)); }
        await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
        return null;
      }, tick);
      void r;
      const d = await S.page.evaluate(readDesktop);
      const strings = await S.page.evaluate(scanDom);
      const p = desktopProblems(tick, d, strings);
      checked++;
      if (p.length && bad.length < 30) bad.push(`tick ${tick}: ${p.slice(0, 3).join(' | ')}`);
      else if (p.length) bad.push(null);
    }
    t.note('ticks checked', checked); t.note('ticks with a problem', bad.length);
    assert(bad.length === 0, `${bad.length} of ${checked} ticks disagree with the oracle:\n      ${bad.filter(Boolean).slice(0, 12).join('\n      ')}`);
    assertEq(S.collector.firstParty, [], 'uncaught exceptions / console errors');
  } finally { await closeSession(S); }
});

// ================================================================== T0-CLK-03 phone, every tick
suite.test('T0-CLK-03', 'phone shell (390x844, touch), ticks 1..675 through the step button: header date, header and transport clock and tooltip equal the oracle; no stray clock', async (t) => {
  const S = await open({ profile: 'phone', viewport: PHONE });
  try {
    await bootTo(S, '', 'phone');
    await waitFor(async () => (await S.page.evaluate(readPhone)).top, { timeout: 20000, label: 'phone header' });
    const bad = []; let checked = 0;
    for (const tick of TICKS) {
      if (tick > 1 || checked === 0) {
        // phone: the dock has no slider; jump with the deep-link-free path = the step button (+1) or, for a gap, press it repeatedly
        const cur = (await S.page.evaluate(readPhone)).frame ?? 1;
        const n = tick - cur;
        for (let i = 0; i < n; i++) {
          await S.page.evaluate(() => { const b = [...document.querySelectorAll('.gtbg-m-play button')].find((x) => /^(Next step|Step forward)/.test(x.getAttribute('aria-label') || '')); if (b) b.click(); });
        }
        if (n > 0) await S.page.evaluate(() => new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res))));
      }
      const d = await S.page.evaluate(readPhone);
      const strings = await S.page.evaluate(scanDom);
      const p = phoneProblems(tick, d, strings);
      checked++;
      if (p.length && bad.length < 30) bad.push(`tick ${tick}: ${p.slice(0, 3).join(' | ')}`); else if (p.length) bad.push(null);
    }
    t.note('ticks checked', checked); t.note('ticks with a problem', bad.length);
    assert(bad.length === 0, `${bad.length} of ${checked} ticks disagree with the oracle:\n      ${bad.filter(Boolean).slice(0, 12).join('\n      ')}`);
    assertEq(S.collector.firstParty, [], 'uncaught exceptions / console errors');
  } finally { await closeSession(S); }
});

// ------------------------------------------------------------------ run
const resultsDir = path.join(REPO, 'tmp', 'clock-integrate');
const outFile = path.join(resultsDir, EXPECT_RED ? 'test-clock-red.json' : 'test-clock.json');
let summary;
try {
  summary = await suite.run({ filter: FILTER, outFile, extra: () => ({ dist: path.relative(REPO, DIST).replace(/\\/g, '/'), groups: GROUPS }) });
} finally {
  for (const s of [...sessions]) { try { await s.close(); } catch { /* already closed */ } }
  await srv.close();
}
if (EXPECT_RED) {
  const bad = summary.results.filter((r) => r.status === 'pass' && !/CLK-01/.test(r.id));
  console.log(bad.length ? `expected-red VIOLATED: passed on this tree: ${bad.map((r) => r.id).join(', ')}` : 'expected-red: every clock test (except the oracle self-check) failed on this tree (red-first proven)');
  process.exit(bad.length ? 1 : 0);
}
process.exit(summary.failed ? 1 : 0);
