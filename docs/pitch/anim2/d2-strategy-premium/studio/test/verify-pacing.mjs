// test/verify-pacing.mjs - frame pacing and per-frame displacement, BEFORE and AFTER, on the same ticks, in real Chrome in real time (the page's own animation loop, not stepped):
// the three hardest places x 1x and 4x x both renderers, each run `secs` seconds, popups off so that only the tile renderer differs.  Every number comes from the page's own metrics recorders
// (the same code that produces the live overlay) plus an independent rAF interval log taken inside the page.
//   node test/verify-pacing.mjs [--secs=8] [--viewport=1440x900] [--dpr=1] [--cpu=1] [--speeds=1,4] [--out=results/assemble-pacing-1440x900.json]
import fs from 'node:fs';
import path from 'node:path';
import { launch, PROTO, args, sleep } from './assemble-lib.mjs';
import { HOTSPOTS } from '../src/tours/library.mjs';

const SECS = +(args.secs || 8); const [VW, VH] = (args.viewport || '1440x900').split('x').map(Number); const DPR = +(args.dpr || 1); const CPU = +(args.cpu || 1);
const SPEEDS = (args.speeds || '1,4').split(',').map(Number);
const OUT = path.resolve(args.out || path.join(PROTO, 'results', `assemble-pacing-${VW}x${VH}${CPU > 1 ? '-cpu' + CPU : ''}.json`));
const s = await launch({ w: VW, h: VH, dpr: DPR, cpu: CPU, port: args.port ? +args.port : 9730, mobile: VW < 760, query: 'welcome=0' });
const rows = []; const pct = (a, p) => { const b = [...a].sort((x, y) => x - y); return b.length ? b[Math.min(b.length - 1, Math.floor(p * (b.length - 1) + 0.5))] : 0; };
try {
  await s.page.evaluate(() => { const S = window.__studio; S.engine.tuning.set('popup.enabled', false); window.__ints = []; let last = 0; const f = (t) => { if (last) window.__ints.push(t - last); last = t; requestAnimationFrame(f); }; requestAnimationFrame(f); });
  for (const H of HOTSPOTS) for (const speed of SPEEDS) for (const mode of ['before', 'after']) {
    const zoom = H.id === 'the-angle' ? 15 : 14; const start = H.tick - 6;
    await s.page.evaluate(({ H, start, mode, zoom }) => {
      const S = window.__studio; const E = S.engine; E.transport.pause(); E.tuning.set('compare.mode', mode); E.select(null); E.transport.seek(start, { glide: false }); E.moveTo({ lat: H.lat, lng: H.lng, zoom }, { glide: false, safe: false });
    }, { H, start, mode, zoom });
    await sleep(1200);                                                                                  // settle (cut fades, label delays), no playback
    await s.page.evaluate(({ speed, mode }) => { const S = window.__studio; const E = S.engine; E.metricsOf(mode).reset(); window.__ints.length = 0; E.transport.setSpeed(speed); E.transport.play(); }, { speed, mode });
    await sleep(SECS * 1000);
    const r = await s.page.evaluate(({ mode }) => { const S = window.__studio; const E = S.engine; E.transport.pause(); const m = E.metricsOf(mode).summary(); const f = E.frame; return { summary: m, tick: f.tick, tiles: f.tiles.length, onField: f.onField, ints: window.__ints.slice() }; }, { mode });
    const ints = r.ints; const row = {
      hotspot: H.id, zoom, speed, mode, seconds: SECS, rafFrames: ints.length, rafFps: +(1000 / (ints.reduce((a, b) => a + b, 0) / Math.max(1, ints.length))).toFixed(1), rafP50: +pct(ints, 0.5).toFixed(2), rafP95: +pct(ints, 0.95).toFixed(2), rafP99: +pct(ints, 0.99).toFixed(2), rafMax: +Math.max(0, ...ints).toFixed(1),
      rafOver20Pct: +(100 * ints.filter((x) => x > 20).length / Math.max(1, ints.length)).toFixed(1), rafOver33Pct: +(100 * ints.filter((x) => x > 33.4).length / Math.max(1, ints.length)).toFixed(1), endTick: r.tick, tiles: r.tiles, onField: r.onField, ...Object.fromEntries(['frames', 'fpsMean', 'dtMsP95', 'engineMsMean', 'engineMsP95', 'tilesMean', 'jumpsPerSec', 'jumpsSolidPerSec', 'hopsPerSec', 'hopsSolidPerSec', 'maxStepPx', 'stepP50Px', 'stepP95Px', 'stepP99Px', 'blinksPerSec', 'popsPerSec', 'teleportsPerSec', 'jerkP99', 'overlapFrames', 'overlapPairs', 'unrepresentedUnitFrames', 'netDimsPerSec', 'travelsPerSec', 'birthsPerSec', 'framesOver20msPct'].map((k) => [k, r.summary[k]])),
    };
    rows.push(row); console.log(`${H.id.padEnd(14)} x${speed} ${mode.padEnd(6)} raf ${row.rafFps} fps (p95 ${row.rafP95} ms, >20ms ${row.rafOver20Pct}%) engine ${row.engineMsMean} ms | jumps/s ${row.jumpsPerSec} (solid ${row.jumpsSolidPerSec}) hops/s ${row.hopsPerSec} maxStep ${row.maxStepPx} px blinks/s ${row.blinksPerSec} | overlap frames ${row.overlapFrames}/${row.frames} pairs ${row.overlapPairs}`);
  }
  const out = { generated: new Date().toISOString(), viewport: [VW, VH], dpr: DPR, cpuThrottle: CPU, secondsPerRun: SECS, ua: await s.page.evaluate(() => navigator.userAgent), errors: s.errors, requests: s.requests, rows };
  fs.mkdirSync(path.dirname(OUT), { recursive: true }); fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
  console.log('errors', s.errors.length, 'requests', s.requests.length, '->', path.relative(process.cwd(), OUT));
} finally { await s.close(); }
