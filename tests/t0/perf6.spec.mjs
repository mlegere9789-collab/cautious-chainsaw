// T0-P6 suite: group PERF6 (tools/t0/PERF6-README.md): the Unit Roster list is virtualised, and /compare "3D Terrain" is switched on and off in slices.
//
//   node tests/t0/perf6.spec.mjs --dist tmp/r1g-int/cand4/dist --control release/R1f/dist
//   node tests/t0/perf6.spec.mjs --dist <tree> --filter 'P6-0[1-4]'      test-id subset
//   node tests/t0/perf6.spec.mjs --dist <R1f tree> --expect-red          red-first proof: the browser tests must FAIL on the tree without PERF6 (exit 0 when they do)
//   --quick  fewer repetitions
//
// What is measured is what a visitor and the acceptance harness measure: tasks are the renderer's RunTask events of a trace of the 450 ms after the activation (the window check 4 judges with its long-task
// observer), the picture is compared pixel by pixel against the control tree with the harness' own comparer (tools/accept/lib/imgdiff.mjs, threshold 0.1).  Mapbox only through the capped, Referer-injecting harness.
process.env.T0_AGENT ||= 'perf6';
process.env.T0_PORT_BASE ||= '9900';
process.env.T0_TILE_CAP ||= '20000';
const L = await import('./lib.mjs');
const fs = await import('node:fs');
const path = await import('node:path');
const { REPO, TMP, PORT_BASE, openSession, createStaticServer, createSuite, sleep, waitForApp, emulateViewport, assert, Skip } = L;
const { diffPngs } = await import('../../tools/accept/lib/imgdiff.mjs');

const argv = process.argv.slice(2);
const opt = (name, dflt) => { const i = argv.indexOf(`--${name}`); return i >= 0 ? (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true) : dflt; };
const tree = (name, dflt = null) => { const v = opt(name, dflt); return v ? path.resolve(REPO, v) : null; };
const DIST = tree('dist', 'tmp/r1g-int/cand4/dist');
const CONTROL = tree('control', 'release/R1f/dist');
const FILTER = opt('filter', null);
const QUICK = !!opt('quick', false);
const EXPECT_RED = !!opt('expect-red', false);
const OUT = path.resolve(REPO, opt('out', path.join(TMP, 'perf6.json')));
if (!fs.existsSync(DIST)) { console.error(`dist not found: ${DIST}`); process.exit(2); }
let portN = 0;
const nextPorts = () => { const k = portN++; return { http: PORT_BASE + k * 2, cdp: PORT_BASE + k * 2 + 1 }; };
const PHONE = { width: 390, height: 844, dpr: 2, mobile: true };
const DESKTOP = { width: 1440, height: 900, dpr: 1, mobile: false };
const LONG = 50;                                       // thresholds.json: a long task is > 50 ms

async function session(dist, { vp = DESKTOP, cpu = 1, url = '/', app = true, wait = 2500, tiles = 'inject', chooseLayout = true, init = null } = {}) {
  const ports = nextPorts();
  const srv = await createStaticServer({ root: dist, port: ports.http });
  const S = await openSession({ profile: `p6-${ports.http}-${Date.now() % 100000}`, cdpPort: ports.cdp, tiles, onboarded: true });
  const page = S.page;
  const warnings = []; const errors = [];
  page.on('console', (m) => { if (m.type() === 'warning' || m.type() === 'error') warnings.push(`${m.type()}: ${m.text().slice(0, 200)}`); });
  page.on('pageerror', (e) => errors.push(String(e && e.message).slice(0, 200)));
  await emulateViewport(page, vp);
  const cdp = await L.cdpFor(page);
  if (cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
  if (init) await page.addInitScript(init);
  await page.goto(`${srv.url}${url}`, { waitUntil: 'load' });
  if (app) { await waitForApp(page, 45000); await sleep(wait); if (chooseLayout) await L.chooseLayout(page, vp.mobile ? 'mobile' : 'desktop').catch(() => {}); await sleep(1500); }
  return { S, srv, page, cdp, origin: srv.url, vp, warnings, errors, close: async () => { await S.close().catch(() => {}); await srv.close().catch(() => {}); } };
}

// ----- trace of the renderer main thread: RunTask lengths of the window after `act()`
async function traceWindow(cdp, act, windowMs = 450) {
  await cdp.send('Tracing.start', { transferMode: 'ReturnAsStream', traceConfig: { includedCategories: ['devtools.timeline', 'disabled-by-default-devtools.timeline', 'toplevel'] } });
  const t0 = Date.now();
  await act();
  await sleep(windowMs);
  const done = new Promise((res) => cdp.once('Tracing.tracingComplete', res));
  await cdp.send('Tracing.end'); const pp = await done;
  let out = ''; for (;;) { const r = await cdp.send('IO.read', { handle: pp.stream, size: 1 << 20 }); out += r.data; if (r.eof) break; }
  await cdp.send('IO.close', { handle: pp.stream });
  const ev = JSON.parse(out).traceEvents || []; const mains = new Set();
  for (const e of ev) if (e.ph === 'M' && e.name === 'thread_name' && e.args && e.args.name === 'CrRendererMain') mains.add(e.pid + ':' + e.tid);
  const tasks = ev.filter((e) => e.ph === 'X' && e.name === 'RunTask' && e.dur && mains.has(e.pid + ':' + e.tid)).map((e) => e.dur / 1000);
  return { tasks, max: tasks.length ? Math.max(...tasks) : 0, wall: Date.now() - t0 };
}
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const quant = (a, f) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(f * s.length))]; };

const ROSTER_BTN = 'button[title="Unit Roster"]';
const GROUPS = `[...document.querySelectorAll('.gtbg-roster [role=group]')].filter((g) => /^(UNION|CONFEDERATE) units$/.test(g.getAttribute('aria-label') || ''))`;
async function openRoster(S, phone = false) {
  if (phone) { await S.page.getByText('Tools').first().click(); await sleep(700); await S.page.getByText('Unit Roster', { exact: true }).first().click(); }
  else await S.page.locator(ROSTER_BTN).first().click();
  await sleep(2500);
}
const rosterRows = (S, ci) => S.page.evaluate(`(() => { const g = ${GROUPS}[${ci}]; const gr = g.getBoundingClientRect(); const items = g.querySelectorAll('[role=listitem]'); const all = items.length ? [...items] : [...g.children]; const rows = [];
  for (const r of all) { const q = r.getBoundingClientRect(); if (q.bottom > gr.top && q.top < gr.bottom) rows.push([r.innerText.replace(/\\s+/g, ' ').trim().slice(0, 90), Math.round((q.top - gr.top) * 10) / 10, Math.round(q.height * 10) / 10]); }
  return { st: g.scrollTop, sh: g.scrollHeight, ch: g.clientHeight, rows, mounted: all.length, box: (() => { const r = g.getBoundingClientRect(); return { x: r.left, y: r.top, w: g.clientWidth, h: g.clientHeight }; })() }; })()`);

const suite = createSuite('perf6');

// =========================================================================================================== roster: cost of opening
suite.test('T0-P6-01', 'app (desktop): the Unit Roster opens with no task over 50 ms by click, Enter and Space, on cold loads; only the rows in view are mounted (the DOM stays under 1,300 elements); the control is measured the same way for the record', async (ctx) => {
  const reps = QUICK ? 3 : 12;
  const res = { cand: [], ctl: [] };
  const nodes = { cand: [], ctl: [] };
  for (let i = 0; i < reps; i++) {
    for (const [k, dist] of (i % 2 ? [['ctl', CONTROL], ['cand', DIST]] : [['cand', DIST], ['ctl', CONTROL]])) {
      if (k === 'ctl' && !CONTROL) continue;
      const S = await session(dist);
      try {
        const btn = S.page.locator(ROSTER_BTN).first();
        for (const mode of ['click', 'enter', 'space']) {
          const t = await traceWindow(S.cdp, async () => {
            if (mode === 'click') { const b = await btn.boundingBox(); await S.page.mouse.click(b.x + b.width / 2, b.y + b.height / 2); } else { await btn.evaluate((el) => el.focus()); await S.page.keyboard.press(mode === 'enter' ? 'Enter' : 'Space'); }
          });
          res[k].push({ mode, max: t.max });
          await sleep(900);
        }
        if (k === 'cand') nodes.cand.push(await S.page.evaluate(() => document.querySelectorAll('*').length));
      } finally { await S.close(); }
    }
  }
  const over = res.cand.filter((r) => r.max > LONG);
  ctx.note('cand_max_ms', Math.round(Math.max(...res.cand.map((r) => r.max)))); ctx.note('cand_median_ms', Math.round(median(res.cand.map((r) => r.max)))); ctx.note('ctl_max_ms', res.ctl.length ? Math.round(Math.max(...res.ctl.map((r) => r.max))) : null);
  assert(!over.length, `${over.length} of ${res.cand.length} activations had a task over ${LONG} ms: ${over.map((r) => r.mode + ' ' + Math.round(r.max)).join(', ')}`);
  assert(Math.max(...nodes.cand) < 1300, `DOM elements with the roster open after 2.5 s: ${nodes.cand.join(', ')} (want < 1300; the control has about 5,600)`);
});

// =========================================================================================================== roster: look and behaviour against the control
const STEPS = [
  ['top'], ['wheel', 700], ['wheel', 700], ['wheel', 1400], ['wheel', 2800], ['wheel', 3000], ['wheel', -900], ['wheel', -1800], ['wheel', -400],
  ['key', 'End'], ['key', 'Home'], ['key', 'PageDown'], ['key', 'PageDown'], ['key', 'ArrowDown'], ['key', 'PageUp'], ['key', 'End'], ['key', 'PageUp'], ['key', 'PageUp'], ['key', 'Home'], ['wheel', 20000], ['wheel', -300], ['wheel', 40000],
];
async function walk(dist, phone) {
  const S = await session(dist, { vp: phone ? PHONE : DESKTOP });
  try {
    await openRoster(S, phone);
    const out = [];
    const boxes = (await rosterRows(S, 0)).box && [await rosterRows(S, 0), await rosterRows(S, 1)].map((r) => r.box);
    for (let ci = 0; ci < 2; ci++) {
      const bx = boxes[ci];
      for (const st of STEPS) {
        if (st[0] === 'wheel') { await S.page.mouse.move(bx.x + bx.w / 2, bx.y + bx.h / 2); await S.page.mouse.wheel(0, st[1]); }
        else if (st[0] === 'key') { await S.page.evaluate(`(() => { const g = ${GROUPS}[${ci}]; if (document.activeElement !== g) g.focus(); })()`); await S.page.keyboard.press(st[1]); }
        await sleep(1300);
        const info = await rosterRows(S, ci);
        const png = await S.page.screenshot({ type: 'png', clip: { x: bx.x, y: bx.y, width: bx.w, height: bx.h } });
        out.push({ ci, step: st.join(' '), info, png });
      }
    }
    return out;
  } finally { await S.close(); }
}
for (const phone of [false, true]) {
  suite.test(phone ? 'T0-P6-03' : 'T0-P6-02', `app (${phone ? 'phone' : 'desktop'}): the roster looks and scrolls as the control's: same rows at the same places (wheel, Home, End, Page Up/Down, arrows) and 0 differing pixels in the two columns`, async (ctx) => {
    if (!CONTROL) throw new Skip('needs --control');
    const A = await walk(CONTROL, phone); const B = await walk(DIST, phone);
    const dp = await session(DIST, { app: false, url: '/robots.txt' });
    const bad = [];
    try {
      for (let i = 0; i < A.length; i++) {
        const a = A[i], b = B[i];
        const rowsEq = a.info.rows.length === b.info.rows.length && a.info.rows.every((r, k) => r[0] === b.info.rows[k][0] && Math.abs(r[1] - b.info.rows[k][1]) <= 0.6 && Math.abs(r[2] - b.info.rows[k][2]) <= 0.6);
        const d = await diffPngs(dp.page, a.png, b.png);
        // the phone's overlay scrollbar is part of the picture: its thumb follows the list's height, which the virtual list knows exactly only after every row has been measured (idle slices); the first
        // steps may differ by the thumb alone (a bounding box inside the 10 right-most pixels)
        const thumbOnly = phone && d.diffPixels > 0 && d.bbox && d.bbox[0] >= a.info.box.w - 12;
        if (!rowsEq || (d.diffPixels > 0 && !thumbOnly) || Math.abs(a.info.st - b.info.st) > 1) bad.push(`column ${a.ci} step "${a.step}": rows ${rowsEq ? 'same' : 'DIFFER'}, ${d.diffPixels} differing pixels, scrollTop ${a.info.st} / ${b.info.st}`);
      }
    } finally { await dp.close(); }
    ctx.note('steps', A.length);
    assert(!bad.length, `${bad.length} of ${A.length} states differ:\n    ` + bad.slice(0, 8).join('\n    '));
  });
}

// =========================================================================================================== roster: semantics
suite.test('T0-P6-04', 'app (desktop): every roster row says "item k of N" (aria-posinset / aria-setsize inside a role=list), the list is a named scrollable group, the last row is reachable by End and flush with the box bottom, and the hidden measuring rows are gone within 6 s', async () => {
  const S = await session(DIST);
  const bad = [];
  try {
    await openRoster(S, false);
    await sleep(3500);
    const r = await S.page.evaluate(`(() => ${GROUPS}.map((g) => { const head = g.previousElementSibling ? g.previousElementSibling.textContent : ''; const claimed = Number((/(\\d+) units/.exec(head) || [])[1]);
      const list = g.querySelector(':scope > [role=list]'); const items = list ? [...list.children] : [];
      return { label: g.getAttribute('aria-label'), claimed, tab: g.tabIndex, hasList: !!list, n: items.length, allItems: items.every((x) => x.getAttribute('role') === 'listitem'), sizes: [...new Set(items.map((x) => x.getAttribute('aria-setsize')))], pos: items.map((x) => Number(x.getAttribute('aria-posinset'))), hidden: g.parentElement.querySelectorAll('[aria-hidden=true][inert]').length }; }))()`);
    if (r.length !== 2) bad.push(`${r.length} lists`);
    for (const g of r) {
      if (!g.hasList || !g.allItems) bad.push(`${g.label}: no role=list of role=listitem rows`);
      if (g.tab !== 0) bad.push(`${g.label}: tabIndex ${g.tab}, want 0 (keyboard scrolling)`);
      if (g.sizes.length !== 1 || Number(g.sizes[0]) !== g.claimed) bad.push(`${g.label}: set size ${g.sizes.join('/')} vs ${g.claimed} units in the header`);
      if (!g.pos.every((p, i) => i === 0 || p === g.pos[i - 1] + 1) || g.pos[0] !== 1) bad.push(`${g.label}: posinset ${g.pos.slice(0, 4)}... is not 1, 2, 3...`);
      if (g.hidden) bad.push(`${g.label}: ${g.hidden} hidden measuring container(s) still mounted after 6 s`);
    }
    for (let ci = 0; ci < 2; ci++) {
      await S.page.evaluate(`(() => { const g = ${GROUPS}[${ci}]; g.focus(); })()`);
      await S.page.keyboard.press('End'); await sleep(1200);
      const e = await S.page.evaluate(`(() => { const g = ${GROUPS}[${ci}]; const gr = g.getBoundingClientRect(); const items = [...g.querySelectorAll('[role=listitem]')]; const last = items[items.length - 1]; return { last: last && Number(last.getAttribute('aria-posinset')), size: last && Number(last.getAttribute('aria-setsize')), gap: last ? Math.round((gr.bottom - last.getBoundingClientRect().bottom) * 10) / 10 : null, max: g.scrollHeight - g.clientHeight - g.scrollTop }; })()`);
      if (e.last !== e.size) bad.push(`column ${ci} after End: last mounted row ${e.last} of ${e.size}`);
      if (Math.abs(e.gap) > 1.5 || e.max > 1.5) bad.push(`column ${ci} after End: last row ends ${e.gap}px from the bottom of the box, ${e.max}px of scroll left`);
    }
  } finally { await S.close(); }
  assert(!bad.length, bad.join('; '));
});

suite.test('T0-P6-05', 'app (desktop): the roster follows the clock and the window: playing at 8x for 6 s changes the status text of visible rows without a console error, and a shorter window mounts rows that fill the box', async () => {
  const S = await session(DIST);
  const bad = [];
  try {
    await openRoster(S, false);
    const before = await rosterRows(S, 0);
    await S.page.getByRole('button', { name: /^8x$|^8×$/ }).first().click().catch(() => {});
    await S.page.getByRole('button', { name: /Play/ }).first().click().catch(() => {});
    await sleep(6000);
    const after = await rosterRows(S, 0);
    if (JSON.stringify(before.rows.map((r) => r[0])) === JSON.stringify(after.rows.map((r) => r[0]))) bad.push('no visible row changed its text while the clock played');
    if (S.errors.length) bad.push(`page errors: ${S.errors.slice(0, 2).join(' | ')}`);
    await S.page.setViewportSize({ width: 1440, height: 560 }).catch(() => {});
    await sleep(1500);
    const sm = await S.page.evaluate(`(() => { const g = ${GROUPS}[0]; const gr = g.getBoundingClientRect(); const items = [...g.querySelectorAll('[role=listitem]')]; const top = Math.min(...items.map((r) => r.getBoundingClientRect().top)); const bot = Math.max(...items.map((r) => r.getBoundingClientRect().bottom)); return { top: Math.round(top - gr.top), bot: Math.round(gr.bottom - bot), ch: g.clientHeight }; })()`);
    if (sm.top > 0 || sm.bot > 0) bad.push(`after the window got shorter the mounted rows do not cover the box (top gap ${sm.top}, bottom gap ${sm.bot})`);
  } finally { await S.close(); }
  assert(!bad.length, bad.join('; '));
});

// =========================================================================================================== compare: 3D Terrain
// What the page does when a visitor switches 3D Terrain: it sets the terrain, tilts the map, and Mapbox draws the next frames.  Every program the draw needs that was not made before is linked INSIDE that frame
// (getProgramParameter blocks until the GPU process has linked it): 18-38 ms for the circle program with fog and without terrain, which 'Enter' on 3D Terrain (terrain OFF while the map is still tilted, in a style with fog)
// needs the first time.  The hook times every link status query during the activation; the frame trace gives the tasks.
const LINK_HOOK = `(() => { window.__links = []; for (const P of [WebGL2RenderingContext.prototype, WebGLRenderingContext.prototype]) { const g = P.getProgramParameter; P.getProgramParameter = function (pr, k) { const t0 = performance.now(); const r = g.call(this, pr, k); const d = performance.now() - t0; if (d > 1 && k === this.LINK_STATUS) window.__links.push(Math.round(d * 10) / 10); return r; }; } })();`;
const TERRAIN_BTN = '.toggle-btn[data-pane="a"][data-action="terrain"]';
async function compareSession(dist) {
  const S = await session(dist, { app: false, url: '/compare', init: LINK_HOOK });
  await S.page.waitForFunction(() => { const l = document.getElementById('loading'); return !l || getComputedStyle(l).display === 'none'; }, null, { timeout: 45000 }).catch(() => {});
  await sleep(3000);
  return S;
}
async function pressStyle(S, name) {   // the visitor changes the left map to a style with fog (Dark, Light), as the acceptance matrix does before it reaches 3D Terrain
  const b = await S.page.locator(`.toggle-btn[data-pane="a"][data-action="style-${name}"]`).first().boundingBox();
  await S.page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
  await sleep(2200);
}
async function pressTerrain(S, mode) {
  const btn = S.page.locator(TERRAIN_BTN).first();
  await S.page.evaluate(() => { window.__links = []; });
  const t = await traceWindow(S.cdp, async () => {
    if (mode === 'click') { const b = await btn.boundingBox(); await S.page.mouse.click(b.x + b.width / 2, b.y + b.height / 2); } else { await btn.evaluate((el) => el.focus()); await S.page.keyboard.press(mode === 'enter' ? 'Enter' : 'Space'); }
  });
  const links = await S.page.evaluate(() => window.__links.slice());
  return { mode, max: t.max, links, linkMax: links.length ? Math.max(...links) : 0 };
}
suite.test('T0-P6-06', 'compare (desktop): 3D Terrain switched on (click), off (Enter) and on (Space) in a style with fog links no shader program inside a frame (none above 8 ms) and no task reaches 50 ms; the control is measured the same way for the record', async (ctx) => {
  const reps = QUICK ? 2 : 6;
  const res = { cand: [], ctl: [] };
  for (let i = 0; i < reps; i++) {
    for (const [k, dist] of (i % 2 ? [['ctl', CONTROL], ['cand', DIST]] : [['cand', DIST], ['ctl', CONTROL]])) {
      if (k === 'ctl' && !CONTROL) continue;
      const S = await compareSession(dist);
      try {
        await pressStyle(S, 'dark'); await pressStyle(S, 'parchment');
        for (const mode of ['click', 'enter', 'space']) { res[k].push(await pressTerrain(S, mode)); await sleep(1800); }
      } finally { await S.close(); }
    }
  }
  const worst = (a) => a.reduce((m, r) => Math.max(m, r.linkMax), 0);
  ctx.note('cand_max_link_ms', worst(res.cand)); ctx.note('ctl_max_link_ms', res.ctl.length ? worst(res.ctl) : null);
  ctx.note('cand_max_task_ms', Math.round(Math.max(...res.cand.map((r) => r.max)))); ctx.note('ctl_max_task_ms', res.ctl.length ? Math.round(Math.max(...res.ctl.map((r) => r.max))) : null);
  const bad = res.cand.filter((r) => r.linkMax > 8 || r.max >= LONG);
  assert(!bad.length, `${bad.length} of ${res.cand.length} activations linked a program in a frame or ran a task of ${LONG} ms: ${bad.map((r) => `${r.mode} link ${r.linkMax} ms task ${Math.round(r.max)} ms`).join(', ')}`);
});
suite.test('T0-P6-07', 'compare (desktop): the settled picture of the left map with 3D Terrain on, and again off, is the control\'s: 0 differing pixels (the same steps on both trees)', async (ctx) => {
  if (!CONTROL) throw new Skip('needs --control');
  const shots = { ctl: [], cand: [] };
  for (const [k, dist] of [['ctl', CONTROL], ['cand', DIST]]) {
    const S = await compareSession(dist);
    try {
      await pressStyle(S, 'dark'); await pressStyle(S, 'parchment');
      const grab = async () => { await sleep(7000); const b = await S.page.locator('#map-a').first().boundingBox(); return S.page.screenshot({ type: 'png', clip: { x: b.x, y: b.y, width: b.width, height: b.height } }); };
      await pressTerrain(S, 'click'); shots[k].push(['terrain on', await grab()]);
      await pressTerrain(S, 'enter'); shots[k].push(['terrain off', await grab()]);
      await pressTerrain(S, 'space'); shots[k].push(['terrain on again', await grab()]);
    } finally { await S.close(); }
  }
  const dp = await session(DIST, { app: false, url: '/robots.txt' });
  const bad = [];
  try {
    for (let i = 0; i < shots.cand.length; i++) { const d = await diffPngs(dp.page, shots.ctl[i][1], shots.cand[i][1]); ctx.note(shots.cand[i][0].replace(/ /g, '_'), d.diffPixels); if (d.diffPixels > 0) bad.push(`${shots.cand[i][0]}: ${d.diffPixels} differing pixels`); }
  } finally { await dp.close(); }
  assert(!bad.length, bad.join('; '));
});

const t0 = Date.now();
const summary = await suite.run({ filter: FILTER, outFile: OUT, extra: () => ({ dist: path.relative(REPO, DIST), control: CONTROL ? path.relative(REPO, CONTROL) : null, minutes: +((Date.now() - t0) / 60000).toFixed(1) }) });
const GUARDS = new Set(['T0-P6-02', 'T0-P6-03', 'T0-P6-05', 'T0-P6-07']);   // equivalence and clock guards: green on the control by design
if (EXPECT_RED) { const ran = summary.results.filter((r) => r.status !== 'skip' && !GUARDS.has(r.id)); const pass = ran.filter((r) => r.status === 'pass'); console.log(`expect-red: ${ran.length - pass.length} of ${ran.length} tests failed${pass.length ? ' (still green: ' + pass.map((r) => r.id).join(', ') + ')' : ''}`); process.exit(pass.length ? 1 : 0); }
process.exit(summary.failed ? 1 : 0);
