// Entry and Back leave nothing behind. 20 enter/leave cycles; after each leave the page is compared with its landing state:
// WebGL/WebGPU contexts and devices, animation frames, timers, listeners, workers, audio contexts, message ports (counted by instrumentation that wraps the browser APIs
// before any page script runs) and, through the DevTools protocol, DOM nodes, documents, event listeners and the garbage-collected JS heap.
// The cycles run once for each renderer, asked for by name: WebGL2 (the shell's default since delegated decision DD-27: one canvas context per visit, no GPU device) and WebGPU
// (one canvas context and one GPU device per visit, every device lost after leaving). The other tests run on the renderer the address asks for (the default, or BT_API).
//   node --test docs/battle-theatre/app/tests/leak.spec.mjs
import assert from 'node:assert/strict'; import fs from 'node:fs';
import { test, startServer, launch, open, enter, leave, wait, T, RENDER, outFile } from './lib.mjs';

const CYCLES = +process.env.BT_CYCLES || 20;
let S, B;
test.before(async () => { S = await startServer(10781); B = await launch(); });
test.after(async () => { await B.close(); await S.close(); });

async function probe(page, cdp) {
  await cdp.send('HeapProfiler.collectGarbage'); await cdp.send('HeapProfiler.collectGarbage');
  const m = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(x => [x.name, x.value])), d = await cdp.send('Memory.getDOMCounters');
  const inst = await page.evaluate(() => window.__instSnapshot()), jsHeapUsed = await page.evaluate(() => performance.memory.usedJSHeapSize);
  return { inst, heapMB: m.JSHeapUsedSize / 1048576, perfMemMB: jsHeapUsed / 1048576, nodes: d.nodes, listeners: d.jsEventListeners, documents: d.documents, layoutObjects: m.LayoutObjects ?? null };
}

for (const api of ['webgl2', 'webgpu']) test(`${api}: ${CYCLES} enter/leave cycles leave no context, device, frame, timer, listener, worker, audio context or heap growth`, async t => {
  if (api === 'webgpu' && RENDER.software && !RENDER.webgpu) return t.notRun('this browser has no WebGPU adapter (software renderer): the WebGPU cycles are owed on a real GPU');
  const devices = api === 'webgpu' ? 1 : 0;                      // a WebGL2 visit creates no GPU device
  const { ctx, page, log } = await open(B, S.base, { extra: 'api=' + api }); const cdp = await ctx.newCDPSession(page); await cdp.send('Performance.enable'); await cdp.send('HeapProfiler.enable');
  await page.click('#landing-title'); await wait(page, 300); const landing = await probe(page, cdp), rows = [];
  assert.equal(landing.inst.gl, 0); assert.equal(landing.inst.rafs, 0, 'the landing page starts no animation frame');
  assert.equal(landing.inst.workers + landing.inst.audio + landing.inst.ports, 0);
  // one visit first, so the test driver's own input tracking (a dozen window listeners it installs on the first click) is part of the baseline; DOM nodes are still compared with the untouched landing page
  await enter(page); assert.equal(await page.evaluate(() => window.btApp.api), api, 'the renderer asked for is the renderer in use'); await leave(page); await wait(page, 300); const base = await probe(page, cdp);
  assert.ok(base.nodes <= landing.nodes + 12, `after the first visit the page has ${base.nodes} nodes, the untouched landing page ${landing.nodes}`);
  for (let i = 1; i <= CYCLES; i++) {
    await enter(page);
    const during = await page.evaluate(() => ({ ...window.__instSnapshot(), scope: window.btApp.scopeCounts() }));
    assert.equal(during.gl, 1, 'exactly one live canvas context while inside'); assert.equal(during.gpuLive, devices, api === 'webgpu' ? 'exactly one live GPU device while inside' : 'WebGL2 creates no GPU device');
    // use it: play, open a panel, select a unit, fly, so the teardown covers a used session and not an idle one
    await page.keyboard.press('Space'); await page.click('[data-panel=events]'); await page.evaluate(() => window.btApp.select(5)); await page.keyboard.down('KeyW'); await wait(page, 250); await page.keyboard.up('KeyW');
    await leave(page);
    await page.waitForFunction(() => window.__instSnapshot().gpuLive === 0, null, { timeout: T(5000) }).catch(() => {});
    await wait(page, 120);
    const r = await probe(page, cdp); rows.push({ i, ...r.inst, heapMB: +r.heapMB.toFixed(2), nodes: r.nodes, domListeners: r.listeners });
    assert.equal(r.inst.gl, 0, `cycle ${i}: live canvas contexts after leaving`); assert.equal(r.inst.gpuLive, 0, `cycle ${i}: live GPU devices`);
    assert.equal(r.inst.rafs, 0, `cycle ${i}: pending animation frames`); assert.equal(r.inst.timers, base.inst.timers, `cycle ${i}: pending timers`);
    assert.equal(r.inst.listeners, base.inst.listeners, `cycle ${i}: listeners registered through addEventListener: ${JSON.stringify(await page.evaluate(() => window.__instListeners()))}`);
    assert.equal(r.inst.workers, 0); assert.equal(r.inst.audio, 0); assert.equal(r.inst.ports, 0);
    assert.ok(r.nodes <= landing.nodes + 12, `cycle ${i}: DOM nodes ${r.nodes} vs landing ${landing.nodes}`); assert.ok(r.listeners <= base.listeners, `cycle ${i}: DOM listeners ${r.listeners} vs ${base.listeners}`);
    assert.equal(r.documents, base.documents);
  }
  const last = rows[rows.length - 1], third = rows[2], growth = last.heapMB - third.heapMB;
  console.log(`# ${CYCLES} cycles. landing: heap ${base.heapMB.toFixed(2)} MB, ${landing.nodes} DOM nodes (after the first visit ${base.nodes}), ${base.listeners} DOM listeners. after cycle 3: ${third.heapMB} MB; after cycle ${CYCLES}: ${last.heapMB} MB (growth ${growth.toFixed(2)} MB).`);
  console.log(`# devices created in total: ${last.gpuEver}, all lost: ${last.gpuLive === 0}; canvases created: ${last.glEver}; leftover after leaving: contexts ${last.gl}, rAF ${last.rafs}, timers ${last.timers}, workers ${last.workers}, audio ${last.audio}, ports ${last.ports}`);
  assert.equal(last.gpuEver, devices * (CYCLES + 1), api === 'webgpu' ? 'one device per visit (the cycles and the warm-up visit)' : 'WebGL2 creates no GPU device'); assert.equal(last.glEver, CYCLES + 1, 'one canvas context per visit');
  assert.ok(growth < 1.5, `heap grew ${growth.toFixed(2)} MB between cycle 3 and ${CYCLES} after forced garbage collection`);
  assert.deepEqual(log.errors, [], 'no console errors'); assert.deepEqual(log.pageerrors, []);
  fs.writeFileSync(outFile(`results-leak-${api}.json`), JSON.stringify({ api, renderer: RENDER.renderer, cycles: CYCLES, landing: { heapMB: base.heapMB, nodes: landing.nodes, listeners: base.listeners }, rows, warnings: [...new Set(log.warnings)] }, null, 1));
  await ctx.close();
});

test('Back pressed while the theatre is still loading leaves nothing behind', async () => {
  const { ctx, page, log } = await open(B, S.base);
  for (const delay of [0, 60, 250, 700]) {
    await page.click('[data-bt-enter]'); await page.waitForSelector('#bt-back'); if (delay) await wait(page, delay);
    const ready = await page.evaluate(() => !!(window.btApp && window.btApp.ready));
    await page.click('#bt-back'); await page.waitForSelector('#landing:not([hidden])');
    await page.waitForFunction(() => { const s = window.__instSnapshot(); return s.gpuLive === 0 && s.gl === 0; }, null, { timeout: T(10000) });
    await wait(page, 400); const s = await page.evaluate(() => window.__instSnapshot());
    assert.equal(s.gl, 0, `delay ${delay}ms (ready=${ready})`); assert.equal(s.gpuLive, 0); assert.equal(s.rafs, 0); assert.equal(s.timers, 0);
    console.log(`# Back after ${delay} ms (theatre ready: ${ready}): contexts ${s.gl}, devices live ${s.gpuLive}, rAF ${s.rafs}, timers ${s.timers}`);
  }
  assert.deepEqual(log.errors, []); assert.deepEqual(log.pageerrors, []); await ctx.close();
});

test('the browser Back button and the #theatre link take the same path as the Back control', async () => {
  const { ctx, page, log } = await open(B, S.base);
  await enter(page); assert.equal(await page.evaluate(() => location.hash), '#theatre');
  await page.goBack(); await page.waitForSelector('#landing:not([hidden])'); await page.waitForFunction(() => !window.btApp);
  assert.equal((await page.evaluate(() => window.__instSnapshot())).gpuLive, 0);
  await page.goForward(); await page.waitForFunction(() => window.btApp && window.btApp.ready, null, { timeout: T(60000) }); await page.goBack(); await page.waitForSelector('#landing:not([hidden])');
  await page.waitForFunction(() => window.__instSnapshot().gpuLive === 0);
  assert.deepEqual(log.errors, []); assert.deepEqual(log.pageerrors, []); await ctx.close();
});

// Sound (src/audio-host.mjs): off on entry, one AudioContext once started, and Back closes it and leaves 0 live Web Audio nodes (the host is disposed through the theatre scope).
// The page must initialise the host with { scope: theatre.scope, bus: anim bus }; when it does not (not wired yet) this test wires its own host onto the same scope, which tests the scope path.
test('sound: off until started; started inside the theatre it is one AudioContext with live nodes; Back closes it and leaves 0 nodes, 0 contexts, no timers or listeners behind', async () => {
  const { ctx, page, log } = await open(B, S.base); await page.click('#landing-title'); await wait(page, 200);
  await enter(page); await leave(page); await wait(page, 200); const base = await page.evaluate(() => window.__instSnapshot());
  for (let i = 1; i <= 5; i++) {
    await enter(page);
    const during = await page.evaluate(async () => {
      const m = await import('./src/audio-host.mjs'); const th = window.btApp.theatre; let h = m.getCurrent(); const wired = !!h; if (!h) h = m.init({ scope: th.scope, bus: th.anim && th.anim.bus, T: th.T, search: location.search });
      const off = { ...window.__instSnapshot(), wired, started: h.started, nodes: m.stats().liveNodes }; const ok = await h.start();
      for (let k = 0; k < 6; k++) h.update({ t: th.state.t, playing: true, speed: 1, dt: 0.1, cam: { x: th.cam.x, y: th.cam.y, z: th.cam.z, yaw: th.cam.yaw || 0 }, weather: th.wx, sun: th.sample });
      return { off, ok, snap: window.__instSnapshot(), stats: m.stats(), voices: h.status().voices };
    });
    assert.equal(during.off.audio, 0, `cycle ${i}: no AudioContext before the user starts sound`); assert.equal(during.off.started, false); assert.equal(during.off.nodes, 0);
    assert.equal(during.ok, true, `cycle ${i}: sound started`); assert.equal(during.snap.audio, 1, `cycle ${i}: exactly one AudioContext while sound is on`); assert.ok(during.stats.liveNodes > 10, `cycle ${i}: nodes tracked ${during.stats.liveNodes}`); assert.equal(during.stats.liveContexts, 1);
    await leave(page); await wait(page, 150);
    const after = await page.evaluate(async () => { const m = await import('./src/audio-host.mjs'); return { snap: window.__instSnapshot(), stats: m.stats() }; });
    assert.equal(after.snap.audio, 0, `cycle ${i}: AudioContext closed after Back`); assert.equal(after.stats.liveNodes, 0, `cycle ${i}: live Web Audio nodes after Back`); assert.equal(after.stats.liveContexts, 0); assert.equal(after.stats.hasHost, false);
    assert.equal(after.snap.timers, base.timers, `cycle ${i}: timers`); assert.equal(after.snap.listeners, base.listeners, `cycle ${i}: listeners`); assert.equal(after.snap.rafs, 0);
  }
  assert.deepEqual(log.errors, [], 'no console errors'); assert.deepEqual(log.pageerrors, []); await ctx.close();
});

// Added layers (src/ext, docs/EXT-CONTRACT.md): the layers the list names are loaded, every switch of theirs is on and every panel of theirs has been opened; Back then leaves the page as the
// landing page was: no context, animation frame, timer, listener, worker, audio context or added node. (Asked for by the shell's note spec-health-pack-ext-folder.md, point 3.)
test('added layers: loaded, every switch on and every panel opened, Back leaves nothing behind', async () => {
  const { ctx, page, log } = await open(B, S.base); await page.click('#landing-title'); await wait(page, 200);
  await enter(page); await leave(page); await wait(page, 200); const base = await page.evaluate(() => ({ ...window.__instSnapshot(), nodes: document.querySelectorAll('*').length }));
  let used = 0;
  for (let i = 1; i <= 3; i++) {
    await enter(page);
    const during = await page.evaluate(async () => {
      const a = window.btApp; if (!a || !a.ext) return { loader: false }; await a.ext.whenSettled(); const st = a.ext.status(), did = [];
      for (const m of st) for (const id of m.toggles) { await a.ext.setToggle(id, true); did.push('switch ' + id); }
      for (const m of st) for (const id of m.panels) { a.ext.openPanel(id); await a.frames(2); did.push('panel ' + id); }
      await a.frames(3);
      return { loader: true, index: a.ext.index.state, status: a.ext.status().map(m => ({ path: m.path, state: m.state, error: m.error })), problems: a.ext.problems(), did, snap: window.__instSnapshot() };
    });
    assert.equal(during.loader, true, `cycle ${i}: the shell has the loader of the added layers (btApp.ext)`);
    assert.equal(during.index, 'read', `cycle ${i}: the list of added layers (src/ext/index.mjs) was read; a missing list is the shell's 404 line, a broken one a failure`);
    for (const m of during.status) assert.equal(m.state, 'running', `cycle ${i}: added layer ${m.path} is ${m.state}: ${m.error || ''}`);
    assert.deepEqual(during.problems, [], `cycle ${i}: nothing is listed as not running`); used = during.did.length;
    await leave(page); await wait(page, 150);
    const after = await page.evaluate(() => ({ ...window.__instSnapshot(), nodes: document.querySelectorAll('*').length, btApp: !!window.btApp }));
    assert.equal(after.btApp, false, `cycle ${i}: btApp is gone`); assert.equal(after.gl, 0, `cycle ${i}: live canvas contexts`); assert.equal(after.rafs, 0, `cycle ${i}: pending animation frames`);
    assert.equal(after.timers, base.timers, `cycle ${i}: pending timers`); assert.equal(after.listeners, base.listeners, `cycle ${i}: listeners registered through addEventListener`);
    assert.equal(after.workers, 0); assert.equal(after.audio, 0); assert.equal(after.ports, 0); assert.ok(after.nodes <= base.nodes + 12, `cycle ${i}: DOM nodes ${after.nodes} vs ${base.nodes} before the first visit ended`);
  }
  console.log(`# added layers: ${used} switches and panels used per visit; after every Back the counts are those of the landing page`);
  assert.deepEqual(log.errors, [], 'no console errors'); assert.deepEqual(log.pageerrors, []); await ctx.close();
});
