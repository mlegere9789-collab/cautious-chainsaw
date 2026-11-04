// Entry and Back leave nothing behind. 20 enter/leave cycles; after each leave the page is compared with its landing state:
// WebGL/WebGPU contexts and devices, animation frames, timers, listeners, workers, audio contexts, message ports (counted by instrumentation that wraps the browser APIs
// before any page script runs) and, through the DevTools protocol, DOM nodes, documents, event listeners and the garbage-collected JS heap.
//   node --test docs/battle-theatre/app/tests/leak.spec.mjs
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs';
import { startServer, launch, open, enter, leave } from './lib.mjs';

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

test(`${CYCLES} enter/leave cycles leave no context, device, frame, timer, listener, worker, audio context or heap growth`, async () => {
  const { ctx, page, log } = await open(B, S.base); const cdp = await ctx.newCDPSession(page); await cdp.send('Performance.enable'); await cdp.send('HeapProfiler.enable');
  await page.click('#landing-title'); await page.waitForTimeout(300); const landing = await probe(page, cdp), rows = [];
  assert.equal(landing.inst.gl, 0); assert.equal(landing.inst.rafs, 0, 'the landing page starts no animation frame');
  assert.equal(landing.inst.workers + landing.inst.audio + landing.inst.ports, 0);
  // one visit first, so the test driver's own input tracking (a dozen window listeners it installs on the first click) is part of the baseline; DOM nodes are still compared with the untouched landing page
  await enter(page); await leave(page); await page.waitForTimeout(300); const base = await probe(page, cdp);
  assert.ok(base.nodes <= landing.nodes + 12, `after the first visit the page has ${base.nodes} nodes, the untouched landing page ${landing.nodes}`);
  for (let i = 1; i <= CYCLES; i++) {
    await enter(page);
    const during = await page.evaluate(() => ({ ...window.__instSnapshot(), scope: window.btApp.scopeCounts() }));
    assert.equal(during.gl, 1, 'exactly one live canvas context while inside'); assert.equal(during.gpuLive, 1, 'exactly one live GPU device while inside');
    // use it: play, open a panel, select a unit, fly, so the teardown covers a used session and not an idle one
    await page.keyboard.press('Space'); await page.click('[data-panel=events]'); await page.evaluate(() => window.btApp.select(5)); await page.keyboard.down('KeyW'); await page.waitForTimeout(250); await page.keyboard.up('KeyW');
    await leave(page);
    await page.waitForFunction(() => window.__instSnapshot().gpuLive === 0, null, { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(120);
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
  assert.equal(last.gpuEver, CYCLES + 1, 'one device per visit (the cycles and the warm-up visit)'); assert.equal(last.glEver, CYCLES + 1, 'one canvas context per visit');
  assert.ok(growth < 1.5, `heap grew ${growth.toFixed(2)} MB between cycle 3 and ${CYCLES} after forced garbage collection`);
  assert.deepEqual(log.errors, [], 'no console errors'); assert.deepEqual(log.pageerrors, []);
  fs.writeFileSync(new URL('./results-leak.json', import.meta.url), JSON.stringify({ cycles: CYCLES, landing: { heapMB: base.heapMB, nodes: landing.nodes, listeners: base.listeners }, rows, warnings: [...new Set(log.warnings)] }, null, 1));
  await ctx.close();
});

test('Back pressed while the theatre is still loading leaves nothing behind', async () => {
  const { ctx, page, log } = await open(B, S.base);
  for (const delay of [0, 60, 250, 700]) {
    await page.click('[data-bt-enter]'); await page.waitForSelector('#bt-back'); if (delay) await page.waitForTimeout(delay);
    const ready = await page.evaluate(() => !!(window.btApp && window.btApp.ready));
    await page.click('#bt-back'); await page.waitForSelector('#landing:not([hidden])');
    await page.waitForFunction(() => { const s = window.__instSnapshot(); return s.gpuLive === 0 && s.gl === 0; }, null, { timeout: 10000 });
    await page.waitForTimeout(400); const s = await page.evaluate(() => window.__instSnapshot());
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
  await page.goForward(); await page.waitForFunction(() => window.btApp && window.btApp.ready, null, { timeout: 60000 }); await page.goBack(); await page.waitForSelector('#landing:not([hidden])');
  await page.waitForFunction(() => window.__instSnapshot().gpuLive === 0);
  assert.deepEqual(log.errors, []); assert.deepEqual(log.pageerrors, []); await ctx.close();
});
