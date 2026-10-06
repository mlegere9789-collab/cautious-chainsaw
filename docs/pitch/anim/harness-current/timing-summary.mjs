import fs from 'node:fs';
const q = (arr, p) => { if (!arr.length) return null; const s = [...arr].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const r = (v, d = 2) => (v == null ? null : +v.toFixed(d));
export function summarize(run) {
  const raf = run.raf; const dts = []; for (let i = 1; i < raf.length; i++) dts.push(raf[i] - raf[i - 1]);
  const dur = (raf[raf.length - 1] - raf[0]) / 1000;
  const dr = run.draws; const ddt = []; for (let i = 1; i < dr.length; i++) ddt.push(dr[i].raf - dr[i - 1].raf);
  const cb = dr.map((d) => d.cb);
  const ticks = dr.map((d) => d.tick).filter((t) => t != null);
  const frac = (arr, th) => r((100 * arr.filter((x) => x > th).length) / arr.length, 1);
  return {
    label: run.label, speed: run.speed, start: run.start, endTick: run.endTick, cpuThrottle: run.cpu, zoom: r(run.zoom, 2), seconds: r(dur, 1),
    page: { frames: raf.length, fps: r(raf.length / dur, 1), dtMs: { mean: r(dts.reduce((a, b) => a + b, 0) / dts.length), p50: r(q(dts, 0.5)), p95: r(q(dts, 0.95)), p99: r(q(dts, 0.99)), max: r(Math.max(...dts)) }, over20ms_pct: frac(dts, 20), over34ms_pct: frac(dts, 34), over50ms_pct: frac(dts, 50), over100ms: dts.filter((x) => x > 100).length },
    unitCanvas: { redraws: dr.length, redrawsPerSec: r(dr.length / dur, 1), intervalMs: { p50: r(q(ddt, 0.5)), p95: r(q(ddt, 0.95)), p99: r(q(ddt, 0.99)), max: r(Math.max(...ddt)) }, drawCallbackMs: { p50: r(q(cb, 0.5)), p95: r(q(cb, 0.95)), p99: r(q(cb, 0.99)), max: r(Math.max(...cb)), mean: r(cb.reduce((a, b) => a + b, 0) / cb.length) } },
    longTasks: { count: run.long.length, totalMs: r(run.long.reduce((a, b) => a + b[1], 0), 0), maxMs: run.long.length ? r(Math.max(...run.long.map((l) => l[1])), 0) : 0 },
    canvas: dr[0] ? { cw: dr[0].cw, ch: dr[0].ch, dpr: run.dpr, vw: run.vw } : null,
  };
}
if ((process.argv[1] || '').endsWith('timing-summary.mjs')) {
  const f = process.argv[2]; const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  const out = d.runs.map(summarize);
  for (const o of out) console.log(o.label.padEnd(30), 'fps', o.page.fps, 'dt p50/p95/max', o.page.dtMs.p50, o.page.dtMs.p95, o.page.dtMs.max, '>34ms', o.page.over34ms_pct + '%', '| draw cb p50/p95/max', o.unitCanvas.drawCallbackMs.p50, o.unitCanvas.drawCallbackMs.p95, o.unitCanvas.drawCallbackMs.max, '| long', o.longTasks.count);
  fs.writeFileSync(f.replace('.json', '.summary.json'), JSON.stringify(out, null, 2));
}
