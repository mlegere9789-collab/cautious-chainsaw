// T0-BL suite: what the LIVE DRIFT of 2026-09-30 does, and that the rebuilt trains keep (or deliberately supersede) every live change.
// Background: docs/baseline-drift.md.  Production no longer equals legacy/dist: index.html (three inline-script hunks) and data/terrain.json changed.
// baseline/dist is the source-level reconstruction of what production serves; legacy/dist is the downloaded deploy 6aa16d61 (control).
//
//   node tools/t0/tests/baseline-drift.spec.mjs                        run against release/R0..R1c and baseline/dist + legacy/dist (controls)
//   node tools/t0/tests/baseline-drift.spec.mjs --filter 'BL-0[1-3]'   test-id subset
//   node tools/t0/tests/baseline-drift.spec.mjs --release-dir tmp/x    trains built somewhere else (<dir>/<train>/dist)
//
// Env: T0_AGENT (scratch dir under tmp/, default baseline-agent), T0_PORT_BASE (static server = base, Chrome CDP = base+1; one session at a time).
// Mapbox: never used (tiles are blocked locally in every session); the harness tile budget stays 0.
process.env.T0_AGENT ||= 'baseline-agent';
process.env.T0_PORT_BASE ||= '8600';
const L = await import('../../../tests/t0/lib.mjs');
const fs = await import('node:fs');
const path = await import('node:path');
const { REPO, TMP, PORT_BASE, openSession, createStaticServer, createSuite, assert, assertEq, sleep, tileBudget, touchTap } = L;

const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true) : d; };
const FILTER = opt('filter', null);
const RELEASE = path.resolve(REPO, opt('release-dir', 'release'));
const OUT = path.resolve(REPO, opt('out', path.join(TMP, 'baseline-drift.json')));
const CFG = JSON.parse(fs.readFileSync(path.join(REPO, 'tools/t0/trains.json'), 'utf8'));
const LEGACY = path.join(REPO, CFG.legacy.dir);
const BASE = path.join(REPO, CFG.base.dir);
const dist = (t) => path.join(RELEASE, t, 'dist');
const TRAINS = ['R0', 'R1a', 'R1b', 'R1c'];
for (const t of TRAINS) if (!fs.existsSync(dist(t))) { console.error(`${dist(t)} not found (python tools/t0/build.py --all)`); process.exit(2); }

const readIdx = (d) => fs.readFileSync(path.join(d, 'index.html'));
const PHONE = { width: 375, height: 812, dpr: 3, mobile: true };
const DESK = { width: 1440, height: 900, dpr: 1, mobile: false };
let portOff = 0;

/** one throw-away server + Chrome session (tiles blocked); `fn(page, session, server)` */
async function withPage(d, { viewport, onboarded = true } = {}, fn) {
  const srv = await createStaticServer({ root: d, port: PORT_BASE });
  const S = await openSession({ profile: `bl-${portOff++}`, cdpPort: PORT_BASE + 1, tiles: 'block', viewport, onboarded });
  try { await S.page.goto(`${srv.url}/`, { waitUntil: 'load' }); return await fn(S.page, S, srv); } finally { await S.close(); await srv.close(); }
}

/** wait for the layout chooser of the legacy/baseline app (about 5.5 s after load) and pick a card; resolves 'clicked', or 'auto' when the app
 *  picked a layout itself (group C), or 'absent' */
async function pickLayout(page, label) {
  for (let i = 0; i < 70; i++) {
    try {
      if (await page.evaluate(() => /Choose Your Experience/.test(document.body.innerText))) { await page.getByText(label).first().click(); await sleep(2500); return 'clicked'; }
      if (i > 12 && await page.evaluate(() => !!document.documentElement.getAttribute('data-layout') && !!document.querySelector('#root canvas'))) { await sleep(2500); return 'auto'; }
    } catch { /* page reloading */ }
    await sleep(500);
  }
  return 'absent';
}

/** self-contained (serialised into the page): the state of the legacy desktop timeline bar, found the way the live inline block finds it */
const barState = () => {
  const visible = (sel) => [...document.querySelectorAll(sel)].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && e.checkVisibility && e.checkVisibility(); }).length;
  const credit = document.querySelector('a[href^="mailto:gettysburginteractivemap"]');
  let bar = null;
  for (let n = credit, i = 0; i < 8 && n; i++, n = n.parentElement) { const p = getComputedStyle(n).position; if (p === 'fixed' || p === 'absolute') { bar = n; break; } }
  return {
    rangeInputs: visible('input[type=range]'),
    julyPills: [...document.querySelectorAll('button')].filter((b) => /^July [123]$/.test((b.textContent || '').trim()) && b.getBoundingClientRect().width > 0 && b.checkVisibility()).length,
    toolsButton: [...document.querySelectorAll('button')].some((b) => /Tools$/.test((b.textContent || '').trim()) || /^Tools$/.test((b.title || b.getAttribute('aria-label') || '').trim())),
    dataLayout: document.documentElement.getAttribute('data-layout'),
    creditLinks: document.querySelectorAll('a[href^="mailto:gettysburginteractivemap"]').length,
    bar: bar ? { display: getComputedStyle(bar).display, inline: bar.style.display } : null,
  };
};

const suite = createSuite('baseline-drift');

suite.test('T0-BL-01', 'live today: choosing Mobile hides the legacy desktop bottom timeline bar (inline block); legacy/dist (control) shows it twice over', async (t) => {
  const run = (d) => withPage(d, { viewport: PHONE }, async (page) => { const c = await pickLayout(page, 'Select Mobile'); await sleep(1500); return { c, ...(await page.evaluate(barState)) }; });
  const live = await run(BASE), ctl = await run(LEGACY);
  t.note('baseline/dist (live)', live); t.note('legacy/dist (control)', ctl);
  assertEq(live.c, 'clicked', 'chooser used on live');
  assert(live.toolsButton && live.rangeInputs === 0 && live.julyPills === 3, `live: desktop bar still visible (range ${live.rangeInputs}, July pills ${live.julyPills})`);
  assert(live.bar && live.bar.display === 'none', 'live: the bar found through the credit link is not display:none');
  assert(ctl.rangeInputs >= 1 && ctl.julyPills === 6 && ctl.bar && ctl.bar.display !== 'none', `control: expected the legacy bar to be shown twice over (range ${ctl.rangeInputs}, pills ${ctl.julyPills})`);
});

suite.test('T0-BL-02', 'live today: the star-marker Monuments overlay of legacy/dist is gone (button click adds nothing); legacy/dist (control) draws 8 stars', async (t) => {
  const click = (d) => withPage(d, { viewport: DESK }, async (page) => {
    await pickLayout(page, 'Select Desktop'); await sleep(1500);
    return page.evaluate(async () => {
      const btn = [...document.querySelectorAll('button')].find((b) => (b.getAttribute('aria-label') || b.title || '').trim() === 'Monuments');
      if (!btn) return { button: false };
      btn.click(); await new Promise((r) => setTimeout(r, 1500));
      const ov = document.getElementById('gtbg-monuments-overlay');
      return { button: true, overlay: !!ov, stars: ov ? ov.querySelectorAll('svg').length : 0 };
    });
  });
  const live = await click(BASE), ctl = await click(LEGACY);
  t.note('baseline/dist (live)', live); t.note('legacy/dist (control)', ctl);
  assert(live.button && !live.overlay && live.stars === 0, 'live still draws the monument star overlay');
  assert(ctl.overlay && ctl.stars === 8, `control: expected 8 stars from legacy/dist, got ${ctl.stars}`);
});

suite.test('T0-BL-03', 'live today: the Extra Features overlay is revealed and re-positioned when the CSS fallback animation ends (animationend hunk); legacy/dist never adds gtbg-visible there', async (t) => {
  const series = (d) => withPage(d, { viewport: DESK, onboarded: false }, async (page) => {
    const rows = [];
    for (let i = 0; i < 9; i++) { await sleep(1000); rows.push(await page.evaluate(() => { const e = document.getElementById('extra-features'); if (!e) return null; const r = e.getBoundingClientRect(); return { cls: e.className, opacity: getComputedStyle(e).opacity, y: Math.round(r.y), chooser: /Choose Your Experience/.test(document.body.innerText) }; })); }
    return rows;
  });
  const live = await series(BASE), ctl = await series(LEGACY);
  t.note('live t=1..9 s', live.map((r) => r && `${r.cls || '-'}/${r.opacity}/y${r.y}${r.chooser ? '/chooser' : ''}`)); t.note('control', ctl.map((r) => r && `${r.cls || '-'}/${r.opacity}/y${r.y}${r.chooser ? '/chooser' : ''}`));
  const liveEnd = live[live.length - 1], ctlEnd = ctl[ctl.length - 1];
  assert(liveEnd && liveEnd.chooser && /gtbg-visible/.test(liveEnd.cls), 'live: Extra Features did not get gtbg-visible on the chooser screen');
  assert(ctlEnd && ctlEnd.chooser && Number(ctlEnd.opacity) === 1 && !/gtbg-visible/.test(ctlEnd.cls) && ctlEnd.y === 60, 'control: expected visible-by-CSS-only at the default y=60');
});

suite.test('T0-BL-04', 'characterisation: on desktop the live inline block force-resets an inline-hidden timeline bar within 800 ms (why the block does not belong in a build that hides that bar itself)', async (t) => {
  const r = await withPage(BASE, { viewport: DESK }, async (page) => {
    await pickLayout(page, 'Select Desktop'); await sleep(2000);
    return page.evaluate(async () => {
      const credit = document.querySelector('a[href^="mailto:gettysburginteractivemap"]'); if (!credit) return { note: 'no credit link' };
      let bar = null; for (let n = credit, i = 0; i < 8 && n; i++, n = n.parentElement) { const p = getComputedStyle(n).position; if (p === 'fixed' || p === 'absolute') { bar = n; break; } }
      if (!bar) return { note: 'no bar' };
      bar.style.display = 'none'; await new Promise((res) => setTimeout(res, 1700));
      return { inlineAfter: bar.style.display };
    });
  });
  t.note('result', r);
  assertEq(r.inlineAfter, '', 'inline display after 1.7 s');
});

suite.test('T0-BL-05', 'R1b and R1c (group C): no legacy bar, no credit link, layout auto-detected as mobile, and the superseded hide-bar block is not shipped', async (t) => {
  const rows = {};
  for (const tr of ['R1b', 'R1c']) {
    const idx = readIdx(dist(tr)).toString('utf8');
    assert(!idx.includes('Hides the legacy desktop-style bottom timeline bar') && !/setInterval\(sync, 800\)/.test(idx), `${tr}: the superseded hide-bar block is still in index.html`);
    rows[tr] = await withPage(dist(tr), { viewport: PHONE }, async (page) => {
      const c = await pickLayout(page, 'Select Mobile');
      await sleep(1500);
      const before = await page.evaluate(barState);
      const box = await page.getByText('Tools', { exact: false }).first().boundingBox();
      await touchTap(page, box.x + box.width / 2, box.y + box.height / 2);
      await sleep(1500);
      return { c, before, afterTools: await page.evaluate(barState) };
    });
    const r = rows[tr];
    assertEq(r.c, 'auto', `${tr}: the app picks the layout itself`);
    assert(r.before.dataLayout === 'mobile' && r.before.rangeInputs === 0 && r.before.creditLinks === 0 && r.before.toolsButton, `${tr}: ${JSON.stringify(r.before)}`);
    assert(r.afterTools.creditLinks === 0 && r.afterTools.rangeInputs === 0 && r.afterTools.toolsButton, `${tr} with the Tools sheet open: ${JSON.stringify(r.afterTools)}`);
  }
  t.note('phone 375x812', rows);
});

suite.test('T0-BL-06', 'R0 and R1a (no group C yet) keep the live hide-bar block, and R1a in Mobile mode behaves like live (bar hidden, not shown twice)', async (t) => {
  for (const tr of ['R0', 'R1a']) assert(readIdx(dist(tr)).toString('utf8').includes('Hides the legacy desktop-style bottom timeline bar'), `${tr}: the live hide-bar block was dropped (deploying would revert live)`);
  const r = await withPage(dist('R1a'), { viewport: PHONE }, async (page) => { const c = await pickLayout(page, 'Select Mobile'); await sleep(1500); return { c, ...(await page.evaluate(barState)) }; });
  t.note('R1a phone', r);
  assertEq(r.c, 'clicked', 'R1a still asks for the layout');
  assert(r.toolsButton && r.rangeInputs === 0 && r.julyPills === 3 && r.bar && r.bar.display === 'none', `R1a does not hide the legacy bar like live does: ${JSON.stringify(r)}`);
});

suite.test('T0-BL-07', 'every train keeps the live index.html: CRLF throughout, the animationend and text-aware collision hunks present, the removed monuments overlay absent', async (t) => {
  const rows = {};
  for (const tr of TRAINS) {
    const b = readIdx(dist(tr));
    const crlf = (b.toString('latin1').match(/\r\n/g) || []).length, lf = (b.toString('latin1').match(/\n/g) || []).length;
    const s = b.toString('utf8');
    rows[tr] = { bytes: b.length, crlf, bareLf: lf - crlf };
    assertEq(lf - crlf, 0, `${tr}: index.html has bare LF line endings (mixed)`);
    assert(s.includes("overlay.addEventListener('animationend', function (e) {") && s.includes('if (e.animationName === ' + "'gtbg-force-reveal'" + ') reveal();'), `${tr}: the animationend reveal hunk is missing`);
    assert(s.includes('OR real visible text') && s.includes('function checkEl(el)') && s.includes("document.querySelectorAll('body *')"), `${tr}: the text-aware collision hunk is missing`);
    assert(!s.includes('gtbg-monuments-overlay'), `${tr}: the monuments overlay that live removed came back`);
  }
  t.note('index.html', rows);
});

suite.test('T0-BL-08', 'every train ships the live data/terrain.json byte for byte (T0 rule 5: no /data edits), not the legacy one', async (t) => {
  const live = fs.readFileSync(path.join(BASE, 'data/terrain.json')), old = fs.readFileSync(path.join(LEGACY, 'data/terrain.json'));
  assert(Buffer.compare(live, old) !== 0, 'control: baseline and legacy terrain.json are identical (the drift vanished?)');
  for (const tr of TRAINS) assert(Buffer.compare(fs.readFileSync(path.join(dist(tr), 'data/terrain.json')), live) === 0, `${tr}: data/terrain.json differs from the live file`);
  const j = JSON.parse(live.toString('utf8'));
  const loc1 = j.key_locations.find((k) => k.location_id === 'LOC-001');
  t.note('LOC-001 (Cemetery Hill)', { lat: loc1.lat, lng: loc1.lng, legacy: { lat: 39.8183, lng: -77.2258 } });
  assertEq([loc1.lat, loc1.lng], [39.821763, -77.228873], 'LOC-001 coordinates of the live file');
});

suite.test('T0-BL-09', 'every train was built from the locked baseline (manifest.json baseline.tree_sha256 == tools/t0/baseline.lock.json)', async (t) => {
  const lock = JSON.parse(fs.readFileSync(path.join(REPO, CFG.base.lock), 'utf8'));
  for (const tr of TRAINS) {
    const m = JSON.parse(fs.readFileSync(path.join(RELEASE, tr, 'manifest.json'), 'utf8'));
    assert(m.baseline && m.baseline.locked === true && m.baseline.tree_sha256 === lock.tree_sha256 && m.baseline.dir === CFG.base.dir, `${tr}: ${JSON.stringify(m.baseline)}`);
  }
  t.note('baseline tree', lock.tree_sha256); t.note('live deploy id at capture', lock.live_deploy_id);
});

const summary = await suite.run({ filter: FILTER, outFile: OUT, extra: () => ({ tileBudget: { ...tileBudget } }) });
console.log(`mapbox requests used this run: ${tileBudget.used} of ${tileBudget.cap}`);
process.exit(summary.failed ? 1 : 0);
