// tools/pacing.mjs - REAL-TIME frame pacing and jitter of the built page in real Chrome (the page's own animation loop, not the manual stepper): the same ticks played at 1x and 4x in three scenes,
// 8 s each after a 2 s warm-up, read from the engine's own recorder (frame interval, sudden jumps, largest one-frame step, overlap frames) plus the time the skin's draw takes.
//   node tools/pacing.mjs [--dpr=2] [--cpu=1]       -> results/pacing-dpr<N>[-cpu<k>].json
import fs from 'node:fs';
import path from 'node:path';
import { serve, launch, PAGE, ROOT, PORT } from './lib.mjs';
const a = process.argv.slice(2); const o = Object.fromEntries(a.filter((x) => x.startsWith('--')).map((x) => { const i = x.indexOf('='); return [x.slice(2, i < 0 ? undefined : i), i < 0 ? '1' : x.slice(i + 1)]; })); const DPR = +(o.dpr || 2); const CPU = +(o.cpu || 1);
const SCENES = [['The Angle, z15.5', 'scene=fresh2&tick=551&zoom=15.5'], ['Wheatfield, z15', 'scene=carry1&tick=285&zoom=15'], ['whole field, z13.5', 'scene=field&tick=548&zoom=13.5']];
const srv = await serve(); const b = await launch({ dpr: DPR }); const out = [];
try {
  const cdp = await b.ctx.newCDPSession(b.page); if (CPU > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });
  for (const [name, q] of SCENES) for (const speed of [1, 4]) {
    await b.page.goto(`${PAGE(PORT)}?welcome=0&fresh=1&${q}&speed=${speed}&play=1&set=${encodeURIComponent(JSON.stringify({ 'popup.enabled': false }))}`);
    await b.page.waitForFunction(() => window.__studio && window.__studio.ready, null, { timeout: 60000 }); await b.page.evaluate(() => globalThis.__realBackdrop.whenIdle(30000)); await b.page.waitForTimeout(2000);
    await b.page.evaluate(() => {
      const S = window.__studio; S.engine.metricsOf('after').reset(); window.__draw = []; window.__iv = setInterval(() => window.__draw.push(S.renderer.stats.drawMs), 50);
      // an instrument of its own, independent of the engine's recorder: the displayed position of every tile that is solid in two consecutive frames (the true motion of the picture)
      const st = { last: new Map(), prevStep: new Map(), frames: 0, maxSolid: 0, sudden: 0, lastFrameNo: -1, steps: 0 }; window.__st = st;
      const tick = () => { const E = S.engine; if (E.frames !== st.lastFrameNo) { st.lastFrameNo = E.frames; const f = E.frame; const cur = new Map(); for (const t of f.tiles) { if (t.life !== 'live' || t.opacity < 0.5) continue; const x = t.x + f.view.dx - (t.hx || 0); const y = t.y + f.view.dy; cur.set(t.key, [x, y]); const p = st.last.get(t.key); if (p) { const d = Math.hypot(x - p[0], y - p[1]); st.steps++; if (d > st.maxSolid) st.maxSolid = d; const pv = st.prevStep.get(t.key) || 0; if (d >= 8 && d >= 3 * pv) st.sudden++; st.prevStep.set(t.key, d); } } st.last = cur; st.frames++; } window.__raf = requestAnimationFrame(tick); };
      window.__raf = requestAnimationFrame(tick);
    });
    await b.page.waitForTimeout(8000);
    const r = await b.page.evaluate(() => { clearInterval(window.__iv); cancelAnimationFrame(window.__raf); const st = window.__st; const S = window.__studio; const s = S.engine.metricsOf('after').summary({ maxAgeMs: 8500 }); const d = window.__draw.slice().sort((x, y) => x - y); return { fps: +s.fpsMean.toFixed(1), p95ms: +s.dtMsP95.toFixed(1), over20: +s.framesOver20msPct.toFixed(1), jumpsPerS: +s.jumpsPerSec.toFixed(2), maxStepPx: +s.maxStepPx.toFixed(1), overlapFrames: s.overlapFrames, unrep: s.unrepresentedUnitFrames, tiles: +s.tilesMean.toFixed(0), engineMs: +s.engineMsMean.toFixed(2), drawMsMedian: +d[Math.floor(d.length / 2)].toFixed(2), drawMsP95: +d[Math.floor(d.length * 0.95)].toFixed(2), frames: s.frames, solidMaxStepPx: +st.maxSolid.toFixed(1), solidSuddenPerS: +(st.sudden / 8).toFixed(2), solidSteps: st.steps }; });
    out.push({ scene: name, speed, ...r }); console.log(name, speed + 'x', JSON.stringify(r));
  }
  if (b.errors.length) console.log('errors', b.errors.slice(0, 5));
} finally { await b.close(); srv.close(); }
fs.writeFileSync(path.join(ROOT, 'results', `pacing-dpr${DPR}${CPU > 1 ? '-cpu' + CPU : ''}.json`), JSON.stringify({ dpr: DPR, cpuThrottle: CPU, chrome: '155 headless, Windows, Intel GPU', runs: out }, null, 1));
