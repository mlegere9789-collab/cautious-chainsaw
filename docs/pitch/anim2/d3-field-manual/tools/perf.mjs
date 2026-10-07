// tools/perf.mjs - how the fork runs in REAL TIME in real Chrome (the page's own animation loop, no ?manual): frame interval, the time the renderer spends per frame, the engine's own recorders,
// on the real aerial ground, at DPR 2, with and without a 4x CPU slowdown (a stand-in for a phone: it throttles JavaScript, not the GPU).  One machine; nothing here is a claim about another.
//   node tools/perf.mjs [--secs=8]   ->  results/perf.json
import fs from 'node:fs';
import path from 'node:path';
import { startServer, launch, sleep, ROOT, args } from './lib.mjs';

const SECS = +(args.secs || 8);
const CASES = [
  { id: 'field-z13.5-4x', scene: 'field', zoom: 13.5, speed: 4, w: 1440, h: 900, dpr: 2, cpu: 1 },
  { id: 'angle-z15-4x', scene: 'fresh2', zoom: 15, speed: 4, w: 1440, h: 900, dpr: 2, cpu: 1 },
  { id: 'angle-z16.5-1x (named marks)', scene: 'fresh2', zoom: 16.5, speed: 1, w: 1440, h: 900, dpr: 2, cpu: 1 },
  { id: 'angle-z15-4x, CPU 4x slower', scene: 'fresh2', zoom: 15, speed: 4, w: 1440, h: 900, dpr: 2, cpu: 4 },
  { id: 'phone angle-z14.5-4x (390x844, DPR 2)', scene: 'fresh2', zoom: 14.5, speed: 4, w: 390, h: 844, dpr: 2, cpu: 1, mobile: true },
  { id: 'phone angle-z14.5-4x, CPU 4x slower', scene: 'fresh2', zoom: 14.5, speed: 4, w: 390, h: 844, dpr: 2, cpu: 4, mobile: true },
];
const srv = await startServer(); const out = [];
try {
  for (const k of CASES) {
    const sess = await launch({ w: k.w, h: k.h, dpr: k.dpr, mobile: !!k.mobile, profile: 'perf', query: `scene=${k.scene}&zoom=${k.zoom}&speed=${k.speed}&play=1` });
    try {
      if (k.cpu > 1) { const cdp = await sess.ctx.newCDPSession(sess.page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: k.cpu }); }
      await sleep(3500);                                                                                          // the ground's tiles arrive, the first marks settle
      const r = await sess.page.evaluate(async (secs) => {
        const S = window.__studio; S.engine.metricsOf('after').reset(); const dts = []; const draw = []; let last = performance.now(); const end = last + secs * 1000;
        await new Promise((res) => { const tick = (now) => { dts.push(now - last); last = now; draw.push(S.renderer.stats.drawMs); if (now < end) requestAnimationFrame(tick); else res(); }; requestAnimationFrame(tick); });
        dts.shift(); const pct = (a, p) => { const b = a.slice().sort((x, y) => x - y); return b[Math.min(b.length - 1, Math.floor(b.length * p))]; }; const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
        const m = S.engine.metricsOf('after').summary(); const f = S.engine.frame;
        return { frames: dts.length, fps: +(1000 / mean(dts)).toFixed(1), intervalMean: +mean(dts).toFixed(2), intervalP95: +pct(dts, 0.95).toFixed(2), intervalMax: +Math.max(...dts).toFixed(1), over20pct: +(100 * dts.filter((d) => d > 20).length / dts.length).toFixed(1), drawMsMean: +mean(draw).toFixed(2), drawMsP95: +pct(draw, 0.95).toFixed(2),
          tiles: f.tiles.length, units: f.onField, overlapFrames: m.overlapFrames, overlapPairs: m.overlapPairs, unrepresentedUnitFrames: m.unrepresentedUnitFrames, popsPerSec: m.popsPerSec, teleportsPerSec: m.teleportsPerSec, jumpsSolidPerSec: m.jumpsSolidPerSec, maxStepPx: m.maxStepPx, engineMsP50: m.engineMsP50 ?? null, tick: f.tick, bdStats: globalThis.__realBackdrop ? globalThis.__realBackdrop.stats() : null };
      }, SECS);
      out.push({ ...k, ...r, errors: sess.errors.length }); console.log(k.id, JSON.stringify({ fps: r.fps, p95: r.intervalP95, over20: r.over20pct, draw: r.drawMsMean, tiles: r.tiles, overlaps: r.overlapFrames, errors: sess.errors.length }));
    } finally { await sess.close(); }
  }
  fs.writeFileSync(path.join(ROOT, 'results', 'perf.json'), JSON.stringify({ generated: new Date().toISOString(), seconds: SECS, note: 'tools/perf.mjs: headless Chrome on one machine; the CPU slowdown throttles JavaScript, not the GPU', cases: out }, null, 1));
} finally { srv.close(); }
