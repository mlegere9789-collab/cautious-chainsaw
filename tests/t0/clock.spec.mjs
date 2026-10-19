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
    try { const s = await openSession({ ...opts, cdpPort: port, profile: `${opts.profile}-${n}`, tiles: opts.tiles || 'block' }); sessions.push(s); return s; }
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

// ------------------------------------------------------------------ helpers for the interaction tests
const ALL = (() => { const m = new Map(); for (let k = 1; k <= 675; k++) for (const st of ['time', 'compat', 'chip', 'day', 'long', 'date']) { const s = O.fmt(k, st); if (!m.has(s)) m.set(s, k); } return m; })();
const readFrame = (page) => page.evaluate(() => { const f = document.querySelector('[data-gt-frame]'); return f ? Number(f.getAttribute('data-gt-frame')) : null; });
const setTickDesktop = (page, tk) => page.evaluate(async (tkk) => {
  const el = document.querySelector('input[aria-label="Battle time"]');
  const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  set.call(el, String(tkk)); el.dispatchEvent(new Event('input', { bubbles: true }));
  const t0 = performance.now();
  while (performance.now() - t0 < 800) { const f = document.querySelector('[data-gt-frame]'); if (f && Number(f.getAttribute('data-gt-frame')) === tkk) break; await new Promise((res) => requestAnimationFrame(res)); }
  await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
}, tk);
const bodyText = (page) => page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
const ANCHOR_TICKS = O.anchorsDoc.anchors.map((a) => a.tick);
const BOUNDARY_TICKS = [1, 225, 226, 450, 451, 675];
const BAD_DATE = /July\s+[4-9],\s*1863|\bJuly\s+[4-9],\s*(about\s+)?\d{1,2}:\d{2}|\d{1,2}:\d{2}\s*[AP]M\s+July\s+[4-9]\b|\bJuly\s+[4-9]\s+(about\s+)?\d{1,2}:\d{2}/;
const chron = (() => { const out = []; for (const d of [1, 2, 3]) for (const e of JSON.parse(fs.readFileSync(path.join(DIST, 'data', `chronology_day${d}.json`), 'utf8')).events || []) out.push({ ...e, day: d }); return out; })();

// ================================================================== T0-CLK-04 hour buttons and keys
suite.test('T0-CLK-04', 'the hour buttons and Shift+Arrow keys move 60 battle minutes (not 12 frames) from 13 start ticks, forwards and back, desktop; the labels no longer say 5 minutes', async (t) => {
  const S = await open({ profile: 'hour' });
  try {
    await bootTo(S, '', 'desktop');
    await waitFor(async () => (await S.page.evaluate(readDesktop)).units, { timeout: 30000, label: 'data' });
    const okHour = (from, to, dir) => {
      const target = O.minutes(from) + 60 * dir;
      if (target >= O.minutes(675)) return to === 675 || to > from;
      if (target <= O.minutes(1)) return to === 1 || to < from;
      const step = Math.max(O.minutes(Math.min(675, to + 1)) - O.minutes(to), O.minutes(to) - O.minutes(Math.max(1, to - 1)));
      return to !== from && Math.abs(O.minutes(to) - target) <= step / 2 + 1e-6;
    };
    const rows = []; const bad = [];
    for (const from of [1, 12, 40, 100, 140, 200, 224, 226, 300, 450, 451, 600, 650]) {
      for (const [dir, label, key] of [[1, 'Forward one hour', 'Shift+ArrowRight'], [-1, 'Back one hour', 'Shift+ArrowLeft']]) {
        await setTickDesktop(S.page, from);
        await S.page.getByRole('button', { name: label, exact: true }).click(); await sleep(60);
        const viaButton = await readFrame(S.page);
        await setTickDesktop(S.page, from);
        await S.page.evaluate(() => { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); });
        await S.page.keyboard.press(key); await sleep(60);
        const viaKey = await readFrame(S.page);
        rows.push([from, dir, viaButton, viaKey]);
        if (!okHour(from, viaButton, dir)) bad.push(`button ${label} from ${from} -> ${viaButton} (${(O.minutes(viaButton) - O.minutes(from)).toFixed(0)} min)`);
        if (!okHour(from, viaKey, dir)) bad.push(`key ${key} from ${from} -> ${viaKey} (${(O.minutes(viaKey) - O.minutes(from)).toFixed(0)} min)`);
      }
    }
    t.note('from, dir, button, key', rows.slice(0, 8));
    assertEq(bad, [], 'hour steps that are not about 60 battle minutes');
    const labels = await S.page.evaluate(() => [...document.querySelectorAll('#gt-timeline button')].map((b) => `${b.title}|${b.getAttribute('aria-label') || ''}`).join(' ; '));
    assert(!/\btick\b|5 min/i.test(labels), `time bar tooltips still say tick / 5 minutes: ${labels}`);
    assertEq(S.collector.firstParty, [], 'errors');
  } finally { await closeSession(S); }
});

// ================================================================== T0-CLK-05 deep links
suite.test('T0-CLK-05', '?tick=N and ?t=N land on frame N with every clock surface right, at every anchor tick and day boundary (desktop) and 14 of them on the phone shell', async (t) => {
  const D = await open({ profile: 'dl-desk' });
  try {
    const bad = []; let n = 0;
    const ticks = [...new Set([...ANCHOR_TICKS, ...BOUNDARY_TICKS])].sort((a, b) => a - b);
    for (const tk of ticks) {
      const q = BOUNDARY_TICKS.includes(tk) && tk % 2 === 1 ? `?t=${tk}` : `?tick=${tk}`;
      await D.page.goto(`${ORIGIN}/${q}`, { waitUntil: 'load' }); await waitForApp(D.page, 45000); await chooseLayout(D.page, 'desktop');
      await waitFor(async () => (await readFrame(D.page)) === tk, { timeout: 15000, label: `${q}: frame ${tk}` });
      await waitFor(async () => (await D.page.evaluate(readDesktop)).units, { timeout: 30000, label: 'minimap' });
      await sleep(250);
      const p = desktopProblems(tk, await D.page.evaluate(readDesktop), await D.page.evaluate(scanDom)); n++;
      if (p.length) bad.push(`${q}: ${p.slice(0, 3).join(' | ')}`);
    }
    t.note('desktop loads', n);
    assertEq(bad, [], 'deep-link restores that disagree with the oracle');
    assertEq(D.collector.firstParty, [], 'errors');
  } finally { await closeSession(D); }
  const P = await open({ profile: 'dl-phone', viewport: PHONE });
  try {
    const bad = []; let n = 0;
    for (const tk of [1, 12, 28, 100, 226, 248, 267, 275, 340, 451, 518, 538, 551, 675]) {
      await P.page.goto(`${ORIGIN}/?tick=${tk}`, { waitUntil: 'load' }); await waitForApp(P.page, 45000); await chooseLayout(P.page, 'phone');
      await waitFor(async () => (await readFrame(P.page)) === tk, { timeout: 15000, label: `phone ?tick=${tk}` });
      await sleep(250);
      const p = phoneProblems(tk, await P.page.evaluate(readPhone), await P.page.evaluate(scanDom)); n++;
      if (p.length) bad.push(`?tick=${tk}: ${p.slice(0, 3).join(' | ')}`);
    }
    t.note('phone loads', n);
    assertEq(bad, [], 'phone deep-link restores that disagree with the oracle');
    assertEq(P.collector.firstParty, [], 'errors');
  } finally { await closeSession(P); }
});

// ================================================================== T0-CLK-06 day tabs
suite.test('T0-CLK-06', 'the July 1/2/3 tabs jump to frames 1/226/451 and show their clocks (desktop time bar and phone day tabs); a tab is a tick range, never a date', async (t) => {
  const D = await open({ profile: 'tab-desk' });
  try {
    await bootTo(D, '', 'desktop'); await waitFor(async () => (await D.page.evaluate(readDesktop)).units, { timeout: 30000, label: 'data' });
    for (const [label, want] of [['July 2', 226], ['July 3', 451], ['July 1', 1]]) {
      await D.page.locator('#gt-timeline').getByRole('button', { name: label, exact: true }).click();
      await waitFor(async () => (await readFrame(D.page)) === want, { timeout: 8000, label: `${label} -> frame ${want}` });
      await sleep(250);
      assertEq(O.tabDays.map(([a]) => a).includes(want), true, 'oracle tab starts');
      const p = desktopProblems(want, await D.page.evaluate(readDesktop), await D.page.evaluate(scanDom));
      assertEq(p, [], `${label}`);
    }
  } finally { await closeSession(D); }
  const P = await open({ profile: 'tab-phone', viewport: PHONE });
  try {
    await bootTo(P, '', 'phone');
    for (const [label, want] of [['July 2', 226], ['July 3', 451], ['July 1', 1]]) {
      await P.page.locator('.gtbg-m-days').getByRole('button', { name: label, exact: true }).click();
      await waitFor(async () => (await readFrame(P.page)) === want, { timeout: 8000, label: `phone ${label} -> frame ${want}` });
      await sleep(250);
      assertEq(phoneProblems(want, await P.page.evaluate(readPhone), await P.page.evaluate(scanDom)), [], `phone ${label}`);
    }
  } finally { await closeSession(P); }
});

// ================================================================== T0-CLK-07 event cards
suite.test('T0-CLK-07', 'event cards: at every tick that has a chronology event above "low" the card shows that event with the oracle clock and its tooltip', async (t) => {
  const S = await open({ profile: 'evt' });
  try {
    await bootTo(S, '', 'desktop'); await waitFor(async () => (await S.page.evaluate(readDesktop)).units, { timeout: 30000, label: 'data' });
    const byTick = new Map();
    for (const e of chron) if (e.significance && e.significance.toLowerCase() !== 'low' && !byTick.has(e.tick)) byTick.set(e.tick, e);
    const bad = []; let seen = 0, missing = 0;
    for (const [tk, e] of byTick) {
      await setTickDesktop(S.page, tk); await sleep(120);
      const card = await S.page.evaluate(() => { const c = document.querySelector('[data-gtbg-card="1"]'); if (!c) return null; const tm = c.querySelector('[title^="give or take"]'); return { time: tm ? tm.textContent.trim() : null, title: tm ? tm.getAttribute('title') : null, text: c.innerText.replace(/\s+/g, ' ') }; });
      if (!card) { missing++; continue; }
      seen++;
      if (card.time !== O.fmt(tk, 'time')) bad.push(`t${tk}: card time "${card.time}" want "${O.fmt(tk, 'time')}"`);
      if (card.title !== O.uncertaintyText(tk)) bad.push(`t${tk}: card tooltip "${card.title}"`);
      if (/\b[Tt]ick\b/.test(card.text.slice(0, 400))) bad.push(`t${tk}: the card says tick`);
    }
    t.note('events above low', byTick.size); t.note('cards read', seen); t.note('ticks without a card', missing);
    assert(seen >= Math.floor(byTick.size * 0.9), `only ${seen} of ${byTick.size} event ticks showed a card`);
    assertEq(bad, [], 'event cards that disagree with the oracle');
  } finally { await closeSession(S); }
});

// ================================================================== T0-CLK-08 unit panel and Follow Your Ancestor
suite.test('T0-CLK-08', 'unit panel (20th Maine): "At <clock>" and every Recent Positions row is the oracle clock of its frame, none a bare frame number; Follow Your Ancestor rows are model clocks', async (t) => {
  const S = await open({ profile: 'unit' });
  try {
    await bootTo(S, '?tick=267', 'desktop'); await waitFor(async () => (await S.page.evaluate(readDesktop)).units, { timeout: 30000, label: 'data' });
    await S.page.getByRole('button', { name: 'Find Unit / Location', exact: true }).click().catch(async () => { await S.page.getByRole('button', { name: 'Search', exact: true }).click(); });
    await S.page.getByText('20th Maine', { exact: true }).first().click();
    const panel = await waitFor(async () => S.page.evaluate(() => {
      const at = [...document.querySelectorAll('div')].find((d) => d.children.length === 0 && /^At /.test(d.textContent.trim()) && /\d:\d\d/.test(d.textContent));
      if (!at) return null;
      const rows = [...document.querySelectorAll('[title^="Frame "]')].filter((e) => !e.hasAttribute('data-gt-frame') && /about|AM|PM/.test(e.textContent)).map((e) => ({ time: e.textContent.trim(), frame: Number(/Frame (\d+) of/.exec(e.getAttribute('title'))[1]) }));
      const bare = [...document.querySelectorAll('span')].filter((e) => /^\d{1,3}$/.test(e.textContent.trim()) && e.nextElementSibling && /Line|Bivouac|March|Advanc|Holding|Charg|Retreat|Skirmish|Defend/i.test(e.nextElementSibling.textContent)).map((e) => e.textContent.trim());
      return { at: at.textContent.trim(), rows, bare };
    }), { timeout: 10000, label: 'unit panel with a note' });
    t.note('panel', panel);
    assertEq(panel.at, `At ${O.fmt(267, 'time')}`, 'At <clock>');
    assert(panel.rows.length >= 2, `only ${panel.rows.length} Recent Positions rows`);
    for (const r of panel.rows) assertEq(r.time, O.fmt(r.frame, 'time'), `Recent Positions row for frame ${r.frame}`);
    assertEq(panel.bare, [], 'bare frame numbers in Recent Positions');
    await S.page.goto(`${ORIGIN}/?ancestor=U-20ME`, { waitUntil: 'load' }); await waitForApp(S.page, 45000); await chooseLayout(S.page, 'desktop');
    const anc = await waitFor(async () => S.page.evaluate(() => { const tl = document.getElementById('gt-journey'); if (!tl) return null; const r = [...tl.children].map((c) => c.firstElementChild && c.firstElementChild.textContent.trim()).filter(Boolean); return r.length ? r : null; }), { timeout: 15000, label: 'ancestor timeline' });
    t.note('ancestor rows', anc.slice(0, 4));
    for (const r of anc) assert(ALL.has(r) && ALL.get(r) !== undefined, `ancestor timeline row "${r}" is not a model clock string`);
    assert(!anc.some((r) => BAD_DATE.test(r)), 'ancestor row with a July 4-9 date');
    assertEq(S.collector.firstParty, [], 'errors');
  } finally { await closeSession(S); }
});

// ================================================================== T0-CLK-09 bookmarks
suite.test('T0-CLK-09', 'bookmarks: a new bookmark lists the oracle clock; one saved by an earlier release as "Tick 538" lists as "Saved moment" with the clock', async (t) => {
  const S = await open({ profile: 'bm', initScripts: [() => { try { if (!localStorage.getItem('gettysburg_bookmarks')) localStorage.setItem('gettysburg_bookmarks', JSON.stringify([{ id: 1, tick: 538, label: 'Tick 538', unitId: null, center: null, zoom: null, created: '2026-09-01T00:00:00Z', url: '/?t=538' }])); } catch { /* blocked */ } }] });
  try {
    await bootTo(S, '?tick=300', 'desktop'); await waitFor(async () => (await S.page.evaluate(readDesktop)).units, { timeout: 30000, label: 'data' });
    await S.page.getByRole('button', { name: 'Bookmarks', exact: true }).click();
    await S.page.getByText('+ Bookmark current moment').click(); await sleep(300);
    const form = await S.page.$('form input[type=text], form input:not([type])'); if (form) { await S.page.keyboard.press('Enter'); }
    await sleep(500);
    const items = await S.page.evaluate(() => [...document.querySelectorAll('[role="button"][tabindex="0"]')].map((e) => e.innerText.replace(/\s+/g, ' ').trim()).filter((x) => /AM|PM/.test(x)));
    t.note('bookmark rows', items);
    assert(items.length >= 2, `expected two bookmarks, saw ${items.length}`);
    assert(items.some((x) => x.startsWith('Saved moment') && x.endsWith(O.fmt(538, 'time'))), `no "Saved moment ${O.fmt(538, 'time')}" row (old "Tick 538" label)`);
    assert(items.some((x) => x.endsWith(O.fmt(300, 'time'))), `no row ending with the clock of frame 300 (${O.fmt(300, 'time')})`);
    assert(!items.some((x) => /\bTick\b/.test(x)), 'a bookmark row still says Tick');
    assertEq(S.collector.firstParty, [], 'errors');
  } finally { await closeSession(S); }
});

// ================================================================== T0-CLK-10 Help
suite.test('T0-CLK-10', 'Help: the day keys show the oracle clocks of frames 1/226/451, the step keys say step and hour, nothing says tick / 5 minutes / 12 ticks', async (t) => {
  const S = await open({ profile: 'help' });
  try {
    await bootTo(S, '', 'desktop');
    await S.page.getByRole('button', { name: 'Help', exact: true }).click();
    const txt = await waitFor(async () => { const x = await bodyText(S.page); return /Keyboard Shortcuts/.test(x) ? x : null; }, { timeout: 8000, label: 'Help dialog' });
    const keys = txt.slice(txt.indexOf('PLAYBACK'), txt.indexOf('SPEED'));
    for (const [d, tk] of [[1, 1], [2, 226], [3, 451]]) assert(keys.includes(`Jump to the July ${d} tab, ${O.fmt(tk, 'time')}`), `Help line for the ${d} key missing: ${keys}`);
    assert(keys.includes('Go back one step') && keys.includes('Advance one step'), 'step lines');
    assert(!/\btick\b|5 minutes|12 ticks|five-minute/i.test(keys), `playback keys still mention ticks or 5 minutes: ${keys}`);
    t.note('playback keys', keys.slice(0, 400));
  } finally { await closeSession(S); }
});

// ================================================================== T0-CLK-11 Story cards (NPS Auto Tour)
suite.test('T0-CLK-11', 'the 16 Story cards: a subtitle that ends in a clock ends in the oracle clock of the frame the card flies to; none keeps a typed clock that differs; no July 4-9 date', async (t) => {
  const S = await open({ profile: 'tour' });
  try {
    await bootTo(S, '?tick=1', 'desktop'); await waitFor(async () => (await S.page.evaluate(readDesktop)).units, { timeout: 30000, label: 'data' });
    await S.page.getByRole('button', { name: /NPS Auto Tour/ }).click();
    const rows = [];
    for (let i = 1; i <= 16; i++) {
      const stop = await waitFor(async () => S.page.evaluate((k) => {
        const head = [...document.querySelectorAll('div')].find((d) => d.children.length === 0 && d.textContent.trim() === `Stop ${k} of 16`);
        if (!head) return null;
        const sub = head.nextElementSibling && head.nextElementSibling.nextElementSibling;
        return { title: head.nextElementSibling.textContent.trim(), subtitle: sub ? sub.textContent.trim() : null };
      }, i), { timeout: 8000, label: `stop ${i}` });
      await sleep(900);
      const frame = await readFrame(S.page);
      rows.push({ i, ...stop, frame });
      if (i < 16) await S.page.getByRole('button', { name: 'Next →' }).click();
    }
    t.note('stops', rows.map((r) => `${r.i}@${r.frame}: ${r.subtitle}`));
    const bad = [];
    for (const r of rows) {
      const m = /(?:^| — )(July \d, (?:about )?\d{1,2}:\d{2} [AP]M|(?:Night of )?July \d-?\d?, (?:about )?\d{1,2}:\d{2} [AP]M)$/.exec(r.subtitle || '');
      if (m && m[1] !== O.fmt(r.frame, 'compat')) bad.push(`stop ${r.i} (${r.title}): subtitle clock "${m[1]}" but the card is at frame ${r.frame} = "${O.fmt(r.frame, 'compat')}"`);
      if (BAD_DATE.test(r.subtitle || '')) bad.push(`stop ${r.i}: July 4-9 date in the subtitle`);
    }
    t.note('stops with a clock subtitle', rows.filter((r) => /\d:\d\d [AP]M$/.test(r.subtitle || '')).length);
    assertEq(bad, [], 'story subtitles that disagree with the clock of their frame');
    assertEq(S.collector.firstParty, [], 'errors');
  } finally { await closeSession(S); }
});

// ================================================================== T0-CLK-12 sub-pages
const VIGS = (() => { const out = []; for (const f of fs.readdirSync(path.join(DIST, 'data')).filter((x) => /^vignettes_part\d\.json$/.test(x))) for (const v of JSON.parse(fs.readFileSync(path.join(DIST, 'data', f), 'utf8')).vignettes || []) out.push(v); return out; })();
suite.test('T0-CLK-12', 'sub-pages: Compare, Camera, Immersive, Living Ledger, Documentary, Education, Turning Points, Search, Regiment, Sandbox, Cinematic export, Ground Remembers and Watch Together print model clocks (no "Tick n"), with the frame as a tooltip', async (t) => {
  const S = await open({ profile: 'pages', tiles: 'inject' });   // the map pages load mapbox-gl from api.mapbox.com and wait for the style: about 80 requests in all (cap 300)
  const problems = []; const notes = {};
  const P = S.page;
  const go = async (u, ms = 1800) => { await P.goto(`${ORIGIN}${u}`, { waitUntil: 'load' }).catch(() => {}); await sleep(ms); };
  const eq = (what, got, want) => { if (got !== want) problems.push(`${what}: "${got}" want "${want}"`); };
  const noTick = async (what) => { const s = (await P.evaluate(scanDom)).filter((x) => /\b[Tt]ick\b/.test(x.s) && x.s.length <= 60); if (s.length) problems.push(`${what}: visible tick wording ${JSON.stringify(s.map((x) => x.s))}`); };
  try {
    // --- Compare
    await go('/compare.html', 2500);
    const cmp = async (side, tk) => P.evaluate((a) => ({ n: document.getElementById('tick-num-' + a).textContent, ti: document.getElementById('tick-num-' + a).title, tl: document.getElementById('time-label-' + a).textContent }), side);
    let c = await cmp('a'); eq('compare left date', c.n, O.fmt(60, 'day')); eq('compare left tooltip', c.ti, `${O.fmt(60, 'frame')} · ${O.uncertaintyText(60)}`); eq('compare left time', c.tl, O.fmt(60, 'chip'));
    c = await cmp('b'); eq('compare right date', c.n, O.fmt(300, 'day')); eq('compare right time', c.tl, O.fmt(300, 'chip'));
    await P.evaluate(() => { const s = document.getElementById('slider-a'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(s, '160'); s.dispatchEvent(new Event('input', { bubbles: true })); });
    c = await cmp('a'); eq('compare left date after the slider (night)', c.n, O.fmt(160, 'day')); eq('compare left time after the slider', c.tl, O.fmt(160, 'chip'));
    await noTick('compare');
    // --- Camera, Immersive, Living Ledger
    for (const pg of ['camera', 'immersive']) { await go(`/${pg}.html`, 1800); eq(`${pg} clock`, await P.evaluate(() => document.getElementById('tick-num').textContent), O.fmt(1, 'compat')); await noTick(pg); }
    await go('/living-ledger.html', 1800);
    eq('ledger clock', await P.evaluate(() => document.querySelector('#content .clock, .clock').textContent.trim()), O.fmt(1, 'compat'));
    await P.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /10x/.test(x.textContent)); if (b) b.click(); const p = [...document.querySelectorAll('button')].find((x) => /Play/.test(x.textContent)); if (p) p.click(); });
    await sleep(3500);
    const lc = await P.evaluate(() => ({ clock: document.querySelector('.clock').textContent.trim(), callout: [...document.querySelectorAll('#callout, .callout, [id*=callout]')].map((e) => e.textContent.trim()).join(' | ') }));
    if (!ALL.has(lc.clock) || lc.clock === O.fmt(1, 'compat')) problems.push(`ledger clock after play: "${lc.clock}"`);
    if (/tick/i.test(lc.callout)) problems.push(`ledger callout says tick: ${lc.callout}`);
    notes.ledger = lc;
    await noTick('ledger');
    // --- Documentary and Education: the eyebrow / card line is the long clock of the vignette's frame
    const vigLong = VIGS.map((v) => O.fmt(v.trigger_tick, 'long')).sort();
    await go('/documentary.html', 3000);
    let docN = 0;
    for (let i = 0; i < 24; i++) {
      const r = await P.evaluate(() => ({ e: document.getElementById('d-eyebrow').textContent, h: document.getElementById('d-maplink').getAttribute('href') }));
      const tk = +/tick=(\d+)/.exec(r.h)[1];
      if (!r.e.startsWith(O.fmt(tk, 'long') + ' · ')) problems.push(`documentary moment ${i + 1} (frame ${tk}): "${r.e}" does not start with "${O.fmt(tk, 'long')} · "`);
      docN++;
      const next = await P.$('#next-btn:not([disabled])'); if (!next) break;
      await next.click(); await sleep(120);
    }
    if (docN !== 24) problems.push(`documentary shows ${docN} moments, expected 24`);
    notes.documentary = docN;
    await go('/education.html', 3000);
    const eduRead = () => P.evaluate(() => [...document.querySelectorAll('.story-text')].map((e) => e.textContent.trim()).filter((x) => /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun), July \d · |^Night of July \d-\d · /.test(x)));
    let eduAll = await eduRead();
    for (const d of ['Day 2', 'Day 3']) { await P.evaluate((dd) => { const b = [...document.querySelectorAll('button, a, div')].find((x) => x.children.length === 0 && x.textContent.trim().startsWith(dd)); if (b) b.click(); }, d); await sleep(700); eduAll = eduAll.concat(await eduRead()); }
    const edu = [...new Set(eduAll)].sort();
    if (edu.length < 10 || edu.some((x) => !vigLong.includes(x))) problems.push(`education card clocks: ${edu.length} found, first stray ${edu.find((x) => !vigLong.includes(x))}`);
    notes.education = edu.length;
    // --- Turning Points
    await go('/turning-points.html', 1800);
    const tp = await P.evaluate(() => [...document.querySelectorAll('a')].filter((a) => /[?&]tick=\d+/.test(a.getAttribute('href') || '')).map((a) => ({ href: a.getAttribute('href') })));
    const tpDays = await P.evaluate(() => [...document.querySelectorAll('.tp-day')].map((e) => e.textContent.trim()));
    const tpTicks = tp.map((x) => +/tick=(\d+)/.exec(x.href)[1]);
    if (tpTicks.length !== 9 || tpDays.length !== 9) problems.push(`turning points: ${tpTicks.length} links, ${tpDays.length} day lines`);
    const tpTips = await P.evaluate(() => [...document.querySelectorAll('.tp-day')].map((e) => e.title));
    tpTicks.forEach((tk, i) => { const want = tk === 326 ? `${O.fmt(tk, 'long').split(' · ')[0]} · evening, about 7:00 to 8:30 PM · ` : O.fmt(tk, 'long') + ' · '; if (!(tpDays[i] || '').startsWith(want)) problems.push(`turning point ${i + 1} (frame ${tk}): "${tpDays[i]}" does not start with "${want}"`); if (tpTips[i] !== O.uncertaintyText(tk)) problems.push(`turning point ${i + 1} tooltip "${tpTips[i]}"`); });
    notes.turningPoints = tpTicks;
    // --- Search: vignette results
    await go('/search.html', 1500);
    await P.fill('input', 'Reynolds'); await P.keyboard.press('Enter'); await sleep(1500);
    const metas = await P.evaluate(() => [...document.querySelectorAll('body *')].filter((e) => e.children.length === 0 && / · (July|Night of July)/.test(e.textContent)).map((e) => e.textContent.trim()));
    const v28 = VIGS.find((v) => v.trigger_tick === 28);
    if (!metas.some((x) => x === `${v28.trigger_location} · ${O.fmt(28, 'compat')}`)) problems.push(`search meta of ${v28.title}: ${JSON.stringify(metas.slice(0, 3))} want "${v28.trigger_location} · ${O.fmt(28, 'compat')}"`);
    await noTick('search');
    // --- Regiment timeline
    await go('/regiment.html?unit=U-20ME', 3500);
    const rows = await P.evaluate(() => [...document.querySelectorAll('.tl-meta')].map((e) => e.textContent.trim()));
    if (rows.length < 3) problems.push(`regiment timeline has ${rows.length} rows`);
    for (const r of rows) {
      const [day, span] = r.split(' · ');
      const parts = (span || '').split('–');
      if (!ALL.has(day) || !parts.every((x) => ALL.has(x) || ALL.has('about ' + x) || [...ALL.keys()].some((k) => k.endsWith(x)))) problems.push(`regiment row "${r}" is not made of model clocks`);
      if (/tick/i.test(r) || BAD_DATE.test(r)) problems.push(`regiment row "${r}"`);
    }
    notes.regimentRows = rows.slice(0, 3);
    // --- Sandbox presets
    await go('/sandbox.html', 3500);
    const opts = await P.evaluate(() => [...document.querySelectorAll('#tick-select option')].map((o) => ({ v: Number(o.value), t: o.textContent })));
    if (opts.length !== 3) problems.push(`sandbox has ${opts.length} presets`);
    for (const o of opts) { if (!o.t.startsWith(O.fmt(o.v, 'long') + ' — ')) problems.push(`sandbox preset ${o.v}: "${o.t}"`); if (/tick/i.test(o.t)) problems.push(`sandbox preset says tick: ${o.t}`); }
    notes.sandbox = opts.map((o) => o.t);
    const opt = (v) => opts.find((o) => o.v === v);
    if (!opt(252) || !(O.minutes(252) < O.minutes(256))) problems.push('sandbox preset "before Longstreet\'s assault" is not before anchor 256 (4:00 PM)');
    if (!opt(548) || !(O.minutes(548) < O.minutes(551))) problems.push('sandbox preset "before Pickett\'s Charge reaches the wall" is not before anchor 551 (Armistead over the wall)');
    if (!opt(30) || !(O.parts(30).hour === 10)) problems.push('sandbox preset "mid-morning, I Corps holding McPherson\'s Ridge" is not in the 10 o\'clock hour');
    // --- Cinematic export
    await go('/cinematic-export.html', 2000);
    const ce = await P.evaluate(() => ({ labels: [...document.querySelectorAll('label')].map((l) => l.textContent.trim()), s: document.getElementById('start-time').textContent, e: document.getElementById('end-time').textContent }));
    eq('cinematic start hint', ce.s, O.fmt(540, 'compat')); eq('cinematic end hint', ce.e, O.fmt(600, 'compat'));
    if (!ce.labels.includes('Start frame') || !ce.labels.includes('End frame') || ce.labels.some((l) => /tick/i.test(l))) problems.push(`cinematic labels ${JSON.stringify(ce.labels)}`);
    await P.evaluate(() => { const i = document.getElementById('start-tick'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(i, '100'); i.dispatchEvent(new Event('input', { bubbles: true })); });
    eq('cinematic start hint after typing', await P.evaluate(() => document.getElementById('start-time').textContent), O.fmt(100, 'compat'));
    // --- Ground Remembers
    await go('/ground-remembers.html', 2500);
    eq('ground label', await P.evaluate(() => document.getElementById('reveal-label').textContent), O.fmt(675, 'compat'));
    await P.evaluate(() => { const i = document.getElementById('reveal'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(i, '226'); i.dispatchEvent(new Event('input', { bubbles: true })); });
    eq('ground label after the slider', await P.evaluate(() => document.getElementById('reveal-label').textContent), O.fmt(226, 'compat'));
    // --- Watch Together
    await go('/watch-together.html', 2500);
    await P.fill('#new-tick', '538'); await sleep(150);
    eq('watch-together hint beside the field', (await P.evaluate(() => document.getElementById('new-tick-time').textContent)).trim(), O.fmt(538, 'compat'));
    await P.fill('#new-note', 'step-off'); await P.click('#add-stop'); await sleep(500);
    const wt = await P.evaluate(() => ({ row: (document.querySelector('.stop-tick') || {}).textContent, cap: document.getElementById('caption-bar').textContent, ph: document.getElementById('new-tick').placeholder }));
    eq('watch-together stop row', wt.row, O.fmt(538, 'compat')); eq('watch-together caption', wt.cap, `${O.fmt(538, 'compat')} — step-off`); eq('watch-together placeholder', wt.ph, 'frame number (1-675)');
    await P.fill('#new-tick', 'abc'); await P.click('#add-stop'); await sleep(300);
    if (/tick/i.test(await P.evaluate(() => document.getElementById('add-stop-msg').textContent))) problems.push('watch-together error message says tick');
    t.note('details', notes);
    assertEq(problems, [], 'sub-page clock problems');
    assertEq(S.collector.firstParty, [], 'errors');
  } finally { await closeSession(S); }
});

// ================================================================== T0-CLK-13 Ask the Historian
suite.test('T0-CLK-13', 'Ask the Historian: chronology answers lead with "Day N, <model clock>" of the event frame, vignette answers with the model clock; no "tick n"', async (t) => {
  const S = await open({ profile: 'hist' });
  try {
    await S.page.goto(`${ORIGIN}/historian.html`, { waitUntil: 'load' }); await sleep(2500);
    // ask for 10 chronology events by their own words (an event at an anchor tick of each day and others); the answer's heading must carry that event's frame clock
    const picks = [];
    for (const tk of [1, 28, 57, 90, 226, 256, 280, 340, 451, 518, 538, 551, 568]) { const e = chron.find((x) => x.tick === tk && x.event) || chron.filter((x) => x.event).sort((a, b) => Math.abs(a.tick - tk) - Math.abs(b.tick - tk))[0]; if (e && !picks.includes(e)) picks.push(e); }
    const rows = []; const bad = []; let answered = 0;
    for (const e of picks) {
      const q = e.event.split(/\s+/).slice(0, 9).join(' ');
      await S.page.fill('#ask', q); await S.page.click('#ask-btn'); await sleep(1300);
      const heads = await S.page.evaluate(() => [...document.querySelectorAll('b')].map((b) => b.textContent.trim()).filter((x) => /^Day \d/.test(x)));
      const want = `Day ${tabDay(e.tick)}, ${O.fmt(e.tick, 'compat')}`;
      const hit = heads.filter((h) => h.startsWith(want));
      rows.push([e.tick, want, hit.length]);
      if (hit.length) answered++;
      for (const h of heads) {
        const m = /^Day (\d), (.+?)(?: — .*)?:$/.exec(h);
        if (!m) { bad.push(`unexpected heading "${h}"`); continue; }
        if (!ALL.has(m[2]) || !/^(Night of )?July \d/.test(m[2])) bad.push(`"${m[2]}" in "${h}" is not a model clock`);
        if (BAD_DATE.test(h)) bad.push(`July 4-9 in "${h}"`);
      }
      const txt = await bodyText(S.page);
      if (/\(([^()]*), tick \d+\)/.test(txt)) bad.push(`a vignette answer still says "tick n": ${/\(([^()]*), tick \d+\)/.exec(txt)[0]}`);
    }
    t.note('event tick, expected heading start, answers found', rows);
    assert(answered >= 8, `only ${answered} of ${picks.length} asked events came back with their own heading`);
    assertEq([...new Set(bad)], [], 'headings that are not model clocks');
    assertEq(S.collector.firstParty, [], 'errors');
  } finally { await closeSession(S); }
});

// ================================================================== T0-CLK-14 every page
suite.test('T0-CLK-14', 'every page of the site: no July 4-9 date label, no "Tick n" / "tick n" caption, no "Frame n of 675" as visible text, no five-minute step claim in a label', async (t) => {
  const S = await open({ profile: 'all' });
  try {
    const files = fs.readdirSync(DIST).filter((f) => f.endsWith('.html') && !/^(404|google)/.test(f)).sort();
    const bad = []; const prose = [];
    for (const f of files) {
      await S.page.goto(`${ORIGIN}/${f}`, { waitUntil: 'load' }).catch(() => {});
      if (f === 'index.html') { await waitForApp(S.page, 45000).catch(() => {}); await chooseLayout(S.page, 'desktop').catch(() => {}); }
      await sleep(1600);
      const strings = await S.page.evaluate(scanDom);
      const text = await bodyText(S.page);
      for (const x of strings) {
        if (x.s.length > 90) { if (/\b[Tt]ick\b|five-minute|\b5 minutes\b/.test(x.s)) prose.push(`${f}: ${x.s.slice(0, 80)}`); continue; }
        if (/\bTick \d|\btick \d/.test(x.s)) bad.push(`${f}: caption "${x.s}"`);
        if (/\bticks?\b/i.test(x.s) && x.k !== 'text' && !/tick-select/.test(x.id)) bad.push(`${f}: ${x.k} says tick: "${x.s}"`);
        if (/\bticks?\b/i.test(x.s) && x.k === 'text' && x.s.length <= 40) bad.push(`${f}: label says tick: "${x.s}"`);
        if (/^Frame \d+ of 675$/.test(x.s) && x.k === 'text') bad.push(`${f}: frame number as visible text`);
        if (/\b(5|five)[- ]minutes?\b/i.test(x.s) && x.s.length <= 60) bad.push(`${f}: five-minute label "${x.s}"`);
      }
      if (f !== 'aftermath.html' && BAD_DATE.test(text)) bad.push(`${f}: July 4-9 date: ${BAD_DATE.exec(text)[0]}`);
    }
    t.note('pages scanned', files.length); t.note('prose that still says tick / five-minute (inventory, not a failure)', prose.slice(0, 12));
    assertEq(bad, [], 'pages with a stray clock caption');
  } finally { await closeSession(S); }
});

// ================================================================== T0-CLK-15 frames stay permanent ids
suite.test('T0-CLK-15', 'ticks stay permanent frame ids: the same units stand on the same frames as in the control tree (R1c), ?tick= lands on the same frame, playback still advances', async (t) => {
  if (!fs.existsSync(CONTROL) || path.resolve(CONTROL) === path.resolve(DIST)) throw new Skip('no separate control tree (--control)');
  const ctl = await createStaticServer({ root: CONTROL, port: PORT_BASE + 1 });
  const A = await open({ profile: 'perm-a' }); const B = await open({ profile: 'perm-b' });
  try {
    const sample = [1, 12, 28, 100, 160, 225, 226, 267, 300, 340, 451, 518, 538, 551, 600, 675];
    const rows = [];
    const units = async (S, origin, tk) => {
      await S.page.goto(`${origin}/?tick=${tk}`, { waitUntil: 'load' }); await waitForApp(S.page, 45000); await chooseLayout(S.page, 'desktop');
      return waitFor(async () => S.page.evaluate(() => { const f = document.querySelector('[data-gt-frame]'); const body = document.body.innerText; const tkm = f ? Number(f.getAttribute('data-gt-frame')) : (/Tick (\d+)\/675/.exec(body) || [])[1]; const mm = /(\d+) units · /.exec(body); return mm && tkm ? { frame: Number(tkm), units: Number(mm[1]) } : null; }), { timeout: 30000, label: `frame/units at ${tk}` });
    };
    for (const tk of sample) {
      const a = await units(A, ORIGIN, tk), b = await units(B, ctl.url, tk);
      rows.push([tk, a.frame, b.frame, a.units, b.units]);
      assertEq([a.frame, a.units], [b.frame, b.units], `frame ${tk}: clock tree vs control tree (frame, units on the field)`);
    }
    t.note('tick, frame(clock), frame(control), units(clock), units(control)', rows.slice(0, 6));
    // playback needs the map (the animation loop is driven by its render events): two more sessions with the harness tiles (about 50 requests each)
    const rates = {};
    for (const [origin, nm] of [[ORIGIN, 'clock'], [ctl.url, 'control']]) {
      const S = await open({ profile: `perm-play-${nm}`, tiles: 'inject' });
      try {
        await units(S, origin, 100);
        await S.page.getByRole('button', { name: 'Play', exact: true }).first().click();
        const seen = [];
        for (let i = 0; i < 6; i++) { await sleep(500); seen.push(await S.page.evaluate(() => { const f = document.querySelector('[data-gt-frame]'); return f ? Number(f.getAttribute('data-gt-frame')) : Number((/Tick (\d+)\/675/.exec(document.body.innerText) || [])[1]); })); }
        await S.page.getByRole('button', { name: 'Pause', exact: true }).first().click().catch(() => {});
        assert(seen.every((x, i) => i === 0 || x >= seen[i - 1]) && seen[seen.length - 1] > 100, `${nm} playback frames ${seen}`);
        rates[nm] = (seen[seen.length - 1] - 100) / 3;
        t.note(`${nm} playback frames`, seen);
      } finally { await closeSession(S); }
    }
    assert(Math.abs(rates.clock - rates.control) <= Math.max(1.5, rates.control * 0.5), `playback speed changed: ${rates.clock} frames/s with the clock, ${rates.control} without`);
    assertEq(A.collector.firstParty, [], 'errors (clock tree)');
  } finally { await closeSession(A); await closeSession(B); await ctl.close(); }
});

// ================================================================== T0-CLK-17 day and night tint
suite.test('T0-CLK-17', 'the map\'s day/night tint follows the clock: at every tick where the tint changes (both sides) and at 20 more, the overlay colour is the one the oracle hour calls for (the old tint used 05:00 + 5 minutes a frame)', async (t) => {
  const tintFor = (h) => (h < 5 ? [15, 15, 60, 0.35] : h < 6 ? [20, 20, 80, 0.25] : h < 7 ? [40, 30, 80, 0.15] : h < 8 ? [60, 40, 20, 0.08] : h < 16 ? null : h < 18 ? [80, 50, 10, 0.08] : h < 19 ? [100, 50, 10, 0.15] : h < 20 ? [80, 30, 10, 0.2] : h < 21 ? [30, 15, 40, 0.3] : [10, 10, 50, 0.4]);
  const hourOf = (k) => { const m = O.minutes(k); return (m - Math.floor(m / 1440) * 1440) / 60; };
  const picks = new Set([1, 100, 225, 226, 326, 340, 451, 538, 675]);
  for (let k = 2; k <= 675; k++) if (JSON.stringify(tintFor(hourOf(k))) !== JSON.stringify(tintFor(hourOf(k - 1)))) { picks.add(k); picks.add(k - 1); }
  for (let k = 20; k <= 675; k += 33) picks.add(k);
  const S = await open({ profile: 'tint', tiles: 'inject' });          // the overlay is created when the map has loaded
  try {
    await bootTo(S, '', 'desktop');
    await waitFor(async () => S.page.evaluate(() => [...document.querySelectorAll('div')].some((d) => d.style.mixBlendMode === 'multiply')), { timeout: 40000, label: 'tint overlay (map loaded)' });
    const bad = []; let changes = 0;
    for (const k of [...picks].sort((a, b) => a - b)) {
      await setTickDesktop(S.page, k); await sleep(60);
      const bg = await S.page.evaluate(() => { const d = [...document.querySelectorAll('div')].find((x) => x.style.mixBlendMode === 'multiply'); return d ? d.style.background : null; });
      const want = tintFor(hourOf(k));
      const got = bg === 'transparent' || bg === '' ? null : (bg.match(/[\d.]+/g) || []).map(Number);
      if (JSON.stringify(got) !== JSON.stringify(want)) bad.push(`tick ${k} (${O.fmt(k, 'compat')}): tint ${bg} want ${want ? 'rgba(' + want.join(', ') + ')' : 'none'}`); else changes++;
    }
    t.note('ticks checked', picks.size);
    assertEq(bad.slice(0, 8), [], 'tint disagrees with the clock');
    // the Tigers' assault at dusk (anchor 326, 8:00 PM) must be tinted for dusk, not left as day
    await setTickDesktop(S.page, 326); await sleep(60);
    assert((await S.page.evaluate(() => [...document.querySelectorAll('div')].find((x) => x.style.mixBlendMode === 'multiply').style.background)) !== 'transparent', 'frame 326 (8:00 PM) is not tinted');
  } finally { await closeSession(S); }
});

// ================================================================== T0-CLK-18 scrubber and tab tooltips
suite.test('T0-CLK-18', 'scrubber marker tooltips carry the marker\'s clock; the July tabs say where they land (desktop and phone); the First shot marker sits on frame 12 (7:30 AM)', async (t) => {
  const D = await open({ profile: 'tips-d' });
  try {
    await bootTo(D, '', 'desktop');
    const tips = await D.page.evaluate(() => ({ markers: [...document.querySelectorAll('#gt-timeline div[title]')].map((e) => e.title).filter((x) => /,/.test(x)), tabs: [...document.querySelectorAll('#gt-timeline button[title^="Jump to"]')].map((e) => e.title) }));
    t.note('tips', tips);
    const first = tips.markers.find((x) => /^First shot/.test(x));
    assertEq(first, `First shot, ${O.fmt(12, 'time')}`, 'First shot marker tooltip (frame 12)');
    assertEq(tips.tabs, [1, 226, 451].map((k) => `Jump to ${O.fmt(k, 'compat')}`), 'desktop tab tooltips');
    for (const m of tips.markers) assert(/, (about )?\d{1,2}:\d{2} [AP]M$/.test(m), `marker tooltip without a clock: ${m}`);
  } finally { await closeSession(D); }
  const P = await open({ profile: 'tips-p', viewport: PHONE });
  try {
    await bootTo(P, '', 'phone');
    const tabs = await P.page.evaluate(() => [...document.querySelectorAll('.gtbg-m-days button')].map((e) => e.title));
    assertEq(tabs, [1, 226, 451].map((k) => `Jump to ${O.fmt(k, 'compat')}`), 'phone tab tooltips');
  } finally { await closeSession(P); }
});

// ================================================================== T0-CLK-16 one command
suite.test('T0-CLK-16', 'node tools/t0/clock/build-clock.mjs --check: patches-next/CLOCK.json is exactly what the anchors generate, and the derived time modules are current', async (t) => {
  const r = spawnSync(process.execPath, ['tools/t0/clock/build-clock.mjs', '--check'], { cwd: REPO, encoding: 'utf8' });
  t.note('output', (r.stdout || '').trim().split('\n').slice(-3));
  assertEq(r.status, 0, `build-clock --check exit code; ${(r.stderr || '').slice(-400)}`);
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
