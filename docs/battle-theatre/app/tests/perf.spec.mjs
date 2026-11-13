// Performance gates on this machine, with the placeholder crowd at 165,000 soldiers (every unit present: 3 Jul 13:30): frame time p95 <= 20 ms in each camera and
// playback case, and no long task over 50 ms during UI interactions. Two runs: (1) as a person sees it (the display's own frame pacing), which is the gate;
// (2) with the frame limiter and vsync off, which shows the real cost per frame and the headroom.   node --test docs/battle-theatre/app/tests/perf.spec.mjs
// Each gate is measured on both renderers, asked for by name: WebGL2 (the shell's default since delegated decision DD-27: what a person sees) and WebGPU (?api=webgpu).
// NEEDS A REAL GPU. No threshold here is ever scaled. On a software renderer the thresholds are NOT RUN (t.gpuOnly: the test is reported as skipped, never as passed): the WebGL2
// tests still walk through every camera case and every interaction with short measuring windows, so that a stale step is found before the real-GPU run; the WebGPU tests are not run at all.
import assert from 'node:assert/strict'; import fs from 'node:fs';
import { test, startServer, launch, open, ready, wait, RENDER, outFile } from './lib.mjs';

const APIS = ['webgl2', 'webgpu'];
const results = { machine: null, webgl2: { paced: {}, uncapped: {}, interactions: null }, webgpu: { paced: {}, uncapped: {}, interactions: null } };
let S;
test.before(async () => { S = await startServer(10785); });
test.after(async () => { await S.close(); fs.writeFileSync(outFile('results-perf.json'), JSON.stringify({ renderer: RENDER.renderer, software: RENDER.software, note: RENDER.software ? 'SOFTWARE renderer: none of these numbers is a timing of the product; every threshold was NOT RUN' : undefined, ...results }, null, 1)); });
const softwareOnly = (t, api) => api === 'webgpu' && RENDER.software ? (t.notRun('measures the GPU only; the WebGPU path is owed on a real GPU (the steps of this test were walked through on WebGL2)'), true) : false;
const WARM = () => RENDER.software ? 2 : 20, SECS = () => RENDER.software ? 1 : 6;       // on a software renderer nothing measured here is asserted: short windows, the steps only
const minOf = (m, d, h = 0, mm = 0) => ({ 6: 0, 7: 30, 8: 61 }[m] + d - 1) * 1440 + h * 60 + mm;
const r1 = x => Math.round(x * 10) / 10;

async function setup(browser, api, w = 1920, h = 1080) {
  const { ctx, page, log } = await open(browser, S.base, { history: 'stub', w, h, init: false, extra: 'api=' + api }); await page.click('[data-bt-enter]'); await ready(page, 90000);
  await page.evaluate(async () => { const a = window.btApp; a.setTime(46890); await a.frames(30); });      // 3 Jul 13:30, all 165,000 present
  const info = await page.evaluate(() => ({ api: window.btApp.api, adapter: window.btApp.host.info, stats: window.btApp.stats, canvas: [window.btApp.host.canvas.width, window.btApp.host.canvas.height], gpuMB: Math.round(window.btApp.host.memoryBytes() / 1048576), dpr: devicePixelRatio }));
  return { ctx, page, log, info };
}
async function measure(page, label, run, secs = SECS()) {
  await page.evaluate(n => window.btApp.frames(n), WARM()); await page.evaluate(() => window.btApp.resetPerf());
  await run(secs); const p = await page.evaluate(() => { const a = window.btApp; return { perf: a.perf(), stats: a.stats, rs: a.theatre.rs && { nearFoot: a.theatre.rs.nearFoot, midFoot: a.theatre.rs.midFoot, farFoot: a.theatre.rs.farFoot, tris: a.theatre.rs.tris }, soldiers: a.stats.soldiers }; });
  const q = p.perf; return { label, frames: q.frames, p50: r1(q.p50), p95: r1(q.p95), p99: r1(q.p99), max: r1(q.max), cpuP50: r1(q.cpuP50), cpuP95: r1(q.cpuP95), gpuP50: q.gpuP50 == null ? null : r1(q.gpuP50), gpuP95: q.gpuP95 == null ? null : r1(q.gpuP95), phases: Object.fromEntries(Object.entries(q.phases).map(([k, v]) => [k, r1(v)])), long: q.long, soldiers: p.soldiers, lod: p.rs };
}
const cases = (page) => ({
  'whole field, 165,000 in view': async (s) => { await page.evaluate(() => window.btApp.theatre.setView('overview', true)); await page.waitForTimeout(s * 1000); },
  'low over the lines (fly-through)': async (s) => { await page.evaluate(() => { const th = window.btApp.theatre, st = th.stage; const i = st.w.units.findIndex((u, k) => st.present[k] && u.kind === 'line' && u.team === 0 && k > 8); th.controls.flyTo(th.viewFor(st.cx[i], st.cz[i], { dist: 70, height: 9 }), 0); });
    await page.keyboard.down('KeyW'); await page.waitForTimeout(s * 500); await page.keyboard.up('KeyW'); await page.keyboard.down('KeyD'); await page.keyboard.down('ArrowLeft'); await page.waitForTimeout(s * 500); await page.keyboard.up('KeyD'); await page.keyboard.up('ArrowLeft'); },
  'close to a firing line, smoke and guns': async (s) => { await page.evaluate(() => { const th = window.btApp.theatre, st = th.stage; const i = st.w.units.findIndex((u, k) => st.present[k] && u.kind === 'crew' && u.team === 0); th.controls.flyTo(th.viewFor(st.cx[i], st.cz[i], { dist: 22, height: 3 }), 0); }); await page.waitForTimeout(s * 1000); },
  'playing at 60x with units on the move': async (s) => { await page.evaluate(() => { const a = window.btApp; a.setTime(minOf(7, 5, 8)); function minOf(m, d, h) { return ({ 7: 30 }[m] + d - 1) * 1440 + h * 60; } a.theatre.setView('overview', true); a.setSpeed(60); a.setPlaying(true); }); await page.waitForTimeout(s * 1000); await page.evaluate(() => { window.btApp.setPlaying(false); window.btApp.setSpeed(1); window.btApp.setTime(46890); }); },
  'dragging the scrubber': async (s) => { const sl = page.locator('#bt-slider'); const box = await sl.boundingBox(); await page.evaluate(() => window.btApp.theatre.setView('overview', true)); await page.mouse.move(box.x + box.width * .3, box.y + box.height / 2); await page.mouse.down(); const t0 = Date.now(); let k = 0; while (Date.now() - t0 < s * 1000) { await page.mouse.move(box.x + box.width * (.3 + .35 * Math.abs(Math.sin(k++ / 12))), box.y + box.height / 2); await page.waitForTimeout(8); } await page.mouse.up(); await page.evaluate(() => window.btApp.setTime(46890)); },
});

for (const api of APIS) for (const [mode, args] of [['paced', []], ['uncapped', ['--disable-frame-rate-limit', '--disable-gpu-vsync']]]) {
  test(`${api}: frame time with 165,000 soldiers at 1920x1080, ${mode === 'paced' ? 'as a person sees it (display pacing)' : 'uncapped (real cost per frame)'}`, async t => {
    const b = await launch(args); try {
      if (softwareOnly(t, api)) return;
      const { ctx, page, log, info } = await setup(b, api); results.machine = results.machine || { adapter: info.adapter, api: info.api, canvas: info.canvas, dpr: info.dpr, gpuMBaccounted: info.gpuMB, soldiersOnField: info.stats.soldiers, guns: info.stats.guns, browser: b.version() };
      assert.equal(info.stats.soldiers, 165000); assert.equal(info.api, api, 'the renderer asked for is the renderer measured (no silent fallback)');
      const rows = []; for (const [label, run] of Object.entries(cases(page))) { const m = await measure(page, label, run); rows.push(m); }
      results[api][mode] = rows; console.log(`# ${api} ${mode}: ${info.adapter.vendor ? info.adapter.vendor + ' ' + info.adapter.arch : info.adapter.renderer}${RENDER.software ? ' (SOFTWARE renderer: not a timing of the product)' : ''}, canvas ${info.canvas.join('x')}, ${info.stats.soldiers} soldiers, ${info.stats.guns} guns`);
      for (const m of rows) console.log(`# ${api} ${mode.padEnd(8)} ${m.label.padEnd(40)} frames ${String(m.frames).padStart(4)}  p50 ${m.p50}  p95 ${m.p95}  p99 ${m.p99}  max ${m.max} ms | cpu p50 ${m.cpuP50} p95 ${m.cpuP95} ms | gpu p50 ${m.gpuP50} p95 ${m.gpuP95} ms | long tasks ${m.long.length}`);
      if (mode === 'paced') for (const m of rows) await t.gpuOnly(`${api} paced, ${m.label}: frame time p95 <= 20 ms`, () => assert.ok(m.p95 <= 20, `${m.label}: frame time p95 ${m.p95} ms > 20 ms`));
      // uncapped, the page's own cap of two frames in flight makes the rAF interval bimodal (a frame is skipped while two are queued), so the interval is shown but the gate is the real cost: CPU plus GPU time per frame
      else for (const m of rows) await t.gpuOnly(`${api} uncapped, ${m.label}: CPU plus GPU cost per frame p95 <= 10 ms`, () => assert.ok(m.cpuP95 + m.gpuP95 <= 10, `${m.label}: cost per frame p95 ${(m.cpuP95 + m.gpuP95).toFixed(1)} ms`));
      assert.deepEqual(log.errors, []); assert.deepEqual(log.pageerrors, []); await ctx.close();
    } finally { await b.close(); }
  });
}

for (const api of APIS) test(`${api}: UI interactions: no long task over 50 ms and every input is answered within 100 ms (event timing), with all 165,000 on the field`, async t => {
  const b = await launch(); try {
    if (softwareOnly(t, api)) return;
    const { ctx, page, log, info } = await setup(b, api); assert.equal(info.api, api, 'the renderer asked for is the renderer measured (no silent fallback)');
    await page.evaluate(() => { window.__ev = []; new PerformanceObserver(l => { for (const e of l.getEntries()) window.__ev.push({ n: e.name, d: e.duration, at: Math.round(e.startTime), tgt: e.target && (e.target.id || e.target.className || e.target.tagName), delay: e.processingStart - e.startTime, proc: e.processingEnd - e.processingStart }); }).observe({ type: 'event', durationThreshold: 16 }); });   // events from now on: the theatre is ready, entry is reported separately
    await page.evaluate(() => window.btApp.resetPerf()); const log0 = [];
    const step = async (name, fn) => { const t0 = Date.now(); await fn(); await page.evaluate(() => window.btApp.frames(3)); log0.push([name, Date.now() - t0]); };
    await step('open Events', () => page.click('[data-panel=events]')); await step('type in the event search', async () => { await page.keyboard.type('cannonade', { delay: 30 }); await wait(page, 300); });
    await step('filter a tier', () => page.click('#bt-drawer-body .seg [data-tier="open gap"]')); await step('pick an event', async () => { await page.fill('#ev-q', ''); await wait(page, 250); await page.locator('#bt-drawer-body .item', { hasText: /\d\d:\d\d/ }).nth(40).click(); });
    await step('open Views', () => page.click('[data-panel=views]')); await step('monuments tab', () => page.click('#vw-tabs [data-tab=mon]')); await step('search monuments', async () => { await page.keyboard.type('Maine', { delay: 30 }); await wait(page, 300); }); await step('fly to a monument', () => page.locator('[data-kind=mon]').first().click());
    await step('open Sources', () => page.click('[data-panel=scenario]')); await step('change a conflict', async () => { await page.locator('.conflict[data-id="C-004"] select').selectOption({ index: 2 }); }); await step('change a weather conflict', async () => { await page.locator('.conflict[data-id="CF-JUL4-RAIN-TIMING"] select').selectOption({ index: 1 }); }); await step('reset sources', () => page.click('#sc-reset'));
    await step('open About', () => page.click('[data-panel=info]')); await step('open Settings', () => page.click('[data-panel=settings]')); await step('move a slider', async () => { await page.locator('#st-scale').fill('0.8'); await page.locator('#st-scale').fill('1'); await page.locator('#st-floor').fill('0.4'); await page.locator('#st-floor').fill('0.34'); }); await page.keyboard.press('Escape');
    await step('overlay on (all marks)', () => page.click('#bt-overlay-toggle')); await step('click a unit', async () => { const h = await page.evaluate(() => { const a = window.btApp, th = a.theatre, st = a.stage, p = [0, 0, 0]; th.setView('overview', true); return null; }); await wait(page, 500); await page.evaluate(() => { const a = window.btApp, st = a.stage; a.select(st.present.findIndex((v, i) => v && i > 20)); }); });
    await step('play, speed up, slow down', async () => { await page.focus('#bt-canvas'); await page.keyboard.press('Space'); for (let i = 0; i < 4; i++) await page.keyboard.press('+'); await wait(page, 600); for (let i = 0; i < 3; i++) await page.keyboard.press('-'); await page.keyboard.press('Space'); });
    await step('scrubber seek by click', async () => { const bx = await page.locator('#bt-slider').boundingBox(); for (const f of [.2, .8, .5, .35]) await page.mouse.click(bx.x + bx.width * f, bx.y + bx.height / 2); });
    await step('jump events with keys', async () => { await page.focus('#bt-canvas'); for (let i = 0; i < 6; i++) await page.keyboard.press(']'); for (let i = 0; i < 3; i++) await page.keyboard.press('['); });
    await step('chapter to epilogue and back', async () => { await page.click('#bt-chapter'); await page.click('#bt-chapter'); });
    await step('camera: bookmark, drag, wheel', async () => { await page.click('[data-panel=views]'); await page.click('#vw-tabs [data-tab=tour]'); await page.locator('[data-kind=tour]').nth(5).click(); await page.keyboard.press('Escape'); await wait(page, 2600); await page.mouse.move(700, 400); await page.mouse.down(); for (let i = 0; i < 20; i++) await page.mouse.move(700 + i * 8, 400 + i * 3); await page.mouse.up(); for (let i = 0; i < 6; i++) { await page.mouse.wheel(0, -240); await wait(page, 40); } });
    await step('resize the window', async () => { await page.setViewportSize({ width: 1280, height: 720 }); await wait(page, 200); await page.setViewportSize({ width: 1920, height: 1080 }); await wait(page, 300); });
    const perf = await page.evaluate(() => window.btApp.perf()), ev = await page.evaluate(() => window.__ev); for (const e of ev.filter(e => e.d > 100)) console.log(`# slow input: ${e.n} on ${e.tgt} took ${Math.round(e.d)} ms (delay ${Math.round(e.delay)}, handler ${Math.round(e.proc)}) at ${e.at}`);
    const dur = ev.map(e => e.d).sort((a, c) => a - c), p95 = dur[Math.floor(dur.length * .95)] || 0, max = dur[dur.length - 1] || 0, delay = Math.max(0, ...ev.map(e => e.delay)), proc = Math.max(0, ...ev.map(e => e.proc));
    const maxLong = Math.max(0, ...perf.long.map(l => l.ms)); results[api].interactions = { steps: log0, longTasks: perf.long, maxLongMs: maxLong, eventsAbove16ms: ev.length, eventP95: r1(p95), eventMax: r1(max), maxInputDelay: r1(delay), maxProcessing: r1(proc), frame: { p50: r1(perf.p50), p95: r1(perf.p95), p99: r1(perf.p99), max: r1(perf.max) } };
    console.log(`# ${api} interactions${RENDER.software ? ' (SOFTWARE renderer: not a timing of the product)' : ''}: ${log0.length} steps; long tasks (>50 ms): ${perf.long.length}${perf.long.length ? ' ' + JSON.stringify(perf.long) : ''}; slowest input to next paint ${r1(max)} ms (p95 ${r1(p95)}, ${ev.length} events over 16 ms); worst input delay ${r1(delay)} ms; worst handler ${r1(proc)} ms; frame p95 during all of it ${r1(perf.p95)} ms`);
    await t.gpuOnly(`${api} interactions: no long task over 50 ms`, () => assert.equal(perf.long.length, 0, `long tasks: ${JSON.stringify(perf.long)}`)); await t.gpuOnly(`${api} interactions: every input answered within 100 ms (plus one 16 ms frame)`, () => assert.ok(max <= 100 + 16, `slowest input to paint ${max} ms`)); assert.deepEqual(log.errors, []); assert.deepEqual(log.pageerrors, []); await ctx.close();
  } finally { await b.close(); }
});
