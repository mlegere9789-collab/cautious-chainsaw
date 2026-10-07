// test/verify-memory.mjs - memory and pacing over a long, busy session in real Chrome: the 60-second Showcase played three times in real time, then 80 before/after switches and 30 style switches.
// The JS heap is read after a forced garbage collection (CDP HeapProfiler.collectGarbage + Runtime.getHeapUsage) at every checkpoint, together with the DOM node count; the rAF intervals of the whole
// session give the frame pacing of the Showcase itself (both renderers, three styles, popups, dissolves).
//   node test/verify-memory.mjs [--runs=3] [--viewport=1440x900] [--dpr=1] [--cpu=1] [--out=results/assemble-memory-1440x900.json]
import fs from 'node:fs';
import path from 'node:path';
import { launch, PROTO, args, sleep } from './assemble-lib.mjs';

const RUNS = +(args.runs || 3); const [VW, VH] = (args.viewport || '1440x900').split('x').map(Number); const DPR = +(args.dpr || 1); const CPU = +(args.cpu || 1);
const OUT = path.resolve(args.out || path.join(PROTO, 'results', `assemble-memory-${VW}x${VH}${CPU > 1 ? '-cpu' + CPU : ''}.json`));
const s = await launch({ w: VW, h: VH, dpr: DPR, cpu: CPU, port: args.port ? +args.port : 9740, mobile: VW < 760, query: 'welcome=0' });
const pct = (a, p) => { const b = [...a].sort((x, y) => x - y); return b.length ? b[Math.min(b.length - 1, Math.floor(p * (b.length - 1) + 0.5))] : 0; };
const heap = async (label) => { await s.cdp.send('HeapProfiler.collectGarbage'); await s.cdp.send('HeapProfiler.collectGarbage'); const h = await s.cdp.send('Runtime.getHeapUsage'); const dom = await s.page.evaluate(() => document.getElementsByTagName('*').length); return { label, usedMB: +(h.usedSize / 1048576).toFixed(2), totalMB: +(h.totalSize / 1048576).toFixed(2), domNodes: dom }; };
const out = { generated: new Date().toISOString(), viewport: [VW, VH], dpr: DPR, cpuThrottle: CPU, checkpoints: [], showcase: [] };
try {
  await s.page.evaluate(() => { window.__ints = []; let last = 0; const f = (t) => { if (last) window.__ints.push(t - last); last = t; requestAnimationFrame(f); }; requestAnimationFrame(f); });
  await sleep(800); out.checkpoints.push(await heap('after load'));
  for (let run = 1; run <= RUNS; run++) {
    await s.page.evaluate(() => { window.__ints.length = 0; window.__studio.startTour('showcase'); });
    const t0 = Date.now(); let steps = new Set();
    while (Date.now() - t0 < 90000) { const st = await s.page.evaluate(() => ({ run: window.__studio.director.running, i: window.__studio.director.state.i })); steps.add(st.i); if (!st.run) break; await sleep(500); }
    const secs = (Date.now() - t0) / 1000; const ints = await s.page.evaluate(() => window.__ints.slice());
    const m = await s.page.evaluate(() => { const E = window.__studio.engine; return { after: E.metricsOf('after').summary(), before: E.metricsOf('before').summary(), cards: window.__studio.cardStats, mode: E.compare, popups: E.tuning.get('popup.enabled') }; });
    out.showcase.push({ run, seconds: +secs.toFixed(1), stepsSeen: steps.size, rafFrames: ints.length, rafFps: +(1000 / (ints.reduce((a, b) => a + b, 0) / ints.length)).toFixed(1), rafP50: +pct(ints, 0.5).toFixed(2), rafP95: +pct(ints, 0.95).toFixed(2), rafP99: +pct(ints, 0.99).toFixed(2), rafMax: +Math.max(...ints).toFixed(1), over20Pct: +(100 * ints.filter((x) => x > 20).length / ints.length).toFixed(2), over33Pct: +(100 * ints.filter((x) => x > 33.4).length / ints.length).toFixed(2),
      afterLane: { frames: m.after.frames, overlapFrames: m.after.overlapFrames, overlapPairs: m.after.overlapPairs, unrepresented: m.after.unrepresentedUnitFrames, engineMsMean: m.after.engineMsMean, engineMsP95: m.after.engineMsP95 }, cardFrames: m.cards, endMode: m.mode, popupsRestored: m.popups });
    console.log(`showcase run ${run}: ${secs.toFixed(1)} s, ${ints.length} frames, ${out.showcase.at(-1).rafFps} fps, p95 ${out.showcase.at(-1).rafP95} ms, >20ms ${out.showcase.at(-1).over20Pct}%, overlap frames ${m.after.overlapFrames}`);
    out.checkpoints.push(await heap(`after showcase ${run}`));
  }
  // stress: switches
  await s.page.evaluate(async () => {
    const S = window.__studio; const E = S.engine; E.tuning.set('popup.enabled', false); E.transport.seek(551, { glide: false }); E.moveTo({ lat: 39.8117, lng: -77.2347, zoom: 15 }, { glide: false, safe: false });
    for (let i = 0; i < 80; i++) { E.tuning.set('compare.mode', i % 2 ? 'after' : 'before'); S.step(6); }
    E.tuning.set('compare.mode', 'after'); const ids = ['war-room', 'field-manual', 'map-1863']; for (let i = 0; i < 30; i++) { S.ui.chooseStyle(ids[i % 3], ['standard', 'cvd', 'contrast'][i % 3]); S.step(6); }
  });
  out.checkpoints.push(await heap('after 80 before/after and 30 style switches'));
  const growth = out.checkpoints.length >= 3 ? +(out.checkpoints[out.checkpoints.length - 2].usedMB - out.checkpoints[2].usedMB).toFixed(2) : null;
  out.summary = { heapAfterLoadMB: out.checkpoints[0].usedMB, heapAfterRunsMB: out.checkpoints.slice(1, 1 + RUNS).map((c) => c.usedMB), growthBetweenFirstAndLastRunMB: growth, heapAfterStressMB: out.checkpoints.at(-1).usedMB, errors: s.errors.length, requests: s.requests.length };
  out.errors = s.errors; out.requests = s.requests;
  fs.mkdirSync(path.dirname(OUT), { recursive: true }); fs.writeFileSync(OUT, JSON.stringify(out, null, 1)); console.log(JSON.stringify(out.summary), JSON.stringify(out.checkpoints));
} finally { await s.close(); }
