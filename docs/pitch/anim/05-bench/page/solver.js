// Layout-solver budget check on REAL positions (tick 620 = the data's peak, 462 units) at several zooms.
//   L0  the current routine, loops copied from lS (8 passes, O(n^2), stateless, tile height fixed at 12 px, width = strength/4 clamped 10..120)
//   L1  reference plug-in: uniform-grid broadphase + Gauss-Seidel push-apart with WARM START (previous frame's offsets), at most `iters` passes
// Measures: ms per solve, residual overlapping pairs (bbox of the benchmark tile, 2 px margin), and frame-to-frame jitter of the displayed tile centres
// while the camera drifts and the units move (mean / p95 / max px change per frame).  It is a budget check for the engine's layout stage, not the layout design.
import { loadScene, Timeline, Cam, TIERS, tierOf, pct, mean } from '/page/lib.js';
const q = new URLSearchParams(location.search), N = +(q.get('n') || 462), REPS = +(q.get('reps') || 60);

function overlaps(x, y, w, h, n) {
  let c = 0; const cell = 80, g = new Map();
  for (let i = 0; i < n; i++) { const k = ((x[i] / cell) | 0) * 100003 + ((y[i] / cell) | 0); (g.get(k) || g.set(k, []).get(k)).push(i); }
  for (let i = 0; i < n; i++) {
    const cx = (x[i] / cell) | 0, cy = (y[i] / cell) | 0;
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { const L = g.get((cx + a) * 100003 + (cy + b)); if (!L) continue; for (const j of L) if (j > i && Math.abs(x[i] - x[j]) < (w[i] + w[j]) / 2 + 2 && Math.abs(y[i] - y[j]) < (h[i] + h[j]) / 2 + 2) c++; }
  }
  return c;
}

function solveL0(ax, ay, str, n, dx, dy) {                                           // verbatim shape of the loop inside lS
  dx.fill(0, 0, n); dy.fill(0, 0, n);
  const wOf = (i) => Math.max(10, Math.min(120, Math.round((str[i] || 200) / 4)));
  for (let it = 0; it < 8; it++) for (let a = 0; a < n; a++) {
    const wa = wOf(a) / 2 + 2;
    for (let b = a + 1; b < n; b++) {
      const wb = wOf(b) / 2 + 2, er = ax[a] + dx[a], Zn = ay[a] + dy[a], Dt = ax[b] + dx[b], Vt = ay[b] + dy[b], Ut = wa + wb - Math.abs(er - Dt), An = 12 - Math.abs(Zn - Vt);
      if (Ut > 0 && An > 0) { const pi = Ut > An ? 0 : er < Dt ? -Ut / 2 : Ut / 2, Yn = Ut > An ? Zn < Vt ? -An / 2 : An / 2 : 0; dx[a] += pi; dy[a] += Yn; dx[b] -= pi; dy[b] -= Yn; }
    }
  }
}

const GRID = 96;
function solveL1(ax, ay, w, h, n, dx, dy, iters, warm) {
  if (!warm) { dx.fill(0, 0, n); dy.fill(0, 0, n); }
  const cells = new Map();
  for (let it = 0; it < iters; it++) {
    cells.clear();
    for (let i = 0; i < n; i++) { const k = (((ax[i] + dx[i]) / GRID) | 0) * 100003 + (((ay[i] + dy[i]) / GRID) | 0); const L = cells.get(k); if (L) L.push(i); else cells.set(k, [i]); }
    let moved = 0;
    for (let i = 0; i < n; i++) {
      const xi = ax[i] + dx[i], yi = ay[i] + dy[i], cx = (xi / GRID) | 0, cy = (yi / GRID) | 0;
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
        const L = cells.get((cx + a) * 100003 + (cy + b)); if (!L) continue;
        for (const j of L) {
          if (j <= i) continue;
          const ox = (w[i] + w[j]) / 2 + 2 - Math.abs(ax[i] + dx[i] - ax[j] - dx[j]), oy = (h[i] + h[j]) / 2 + 2 - Math.abs(ay[i] + dy[i] - ay[j] - dy[j]);
          if (ox > 0 && oy > 0) {
            moved++;
            if (oy <= ox) { const s = ay[i] + dy[i] < ay[j] + dy[j] ? -1 : 1; dy[i] += s * oy / 2; dy[j] -= s * oy / 2; } else { const s = ax[i] + dx[i] < ax[j] + dx[j] ? -1 : 1; dx[i] += s * ox / 2; dx[j] -= s * ox / 2; }
          }
        }
      }
    }
    if (!moved) break;
  }
}

async function main() {
  const sc = await loadScene(N), tl = new Timeline(sc), out = [];
  const nn = tl.n, ax = new Float64Array(nn), ay = new Float64Array(nn), w = new Float64Array(nn), h = new Float64Array(nn), str = new Float64Array(nn);
  const dx = new Float64Array(nn), dy = new Float64Array(nn), sx = new Float64Array(nn), sy = new Float64Array(nn), px = new Float64Array(nn), py = new Float64Array(nn);
  const w0 = new Float64Array(nn), h0 = new Float64Array(nn).fill(12);
  for (const zoom of [12.4, 13.5, 14.5, 15.5]) {
    const cam = new Cam(1440, 852); cam.zoom = zoom; cam.lng = -77.2373; cam.lat = 39.812; cam.update();
    const load = (t) => { tl.stateAt(t); cam.projectAll(tl, ax, ay); let m = 0; const idx = []; for (let j = 0; j < tl.nAlive; j++) { const i = tl.alive[j]; if (ax[i] > -80 && ax[i] < 1520 && ay[i] > -40 && ay[i] < 892) idx.push(i); }
      m = idx.length; for (let k = 0; k < m; k++) { const i = idx[k]; sx[k] = ax[i]; sy[k] = ay[i]; const T = TIERS[tierOf(tl.s[i])]; w[k] = T.w; h[k] = T.h; str[k] = tl.s[i]; w0[k] = Math.max(10, Math.min(120, Math.round((tl.s[i] || 200) / 4))); } return m; };
    const m = load(620), rec = { zoom, visible: m };
    rec.overlapsRaw = overlaps(sx, sy, w, h, m);
    const time = (fn) => { const a = []; for (let r = 0; r < REPS; r++) { const t0 = performance.now(); fn(); a.push(performance.now() - t0); } return { p50: +pct(a, .5).toFixed(3), p95: +pct(a, .95).toFixed(3) }; };
    rec.L0 = { ms: time(() => solveL0(sx, sy, str, m, dx, dy)) };
    solveL0(sx, sy, str, m, dx, dy); const x0 = sx.map((v, i) => v + dx[i]), y0 = sy.map((v, i) => v + dy[i]);
    rec.L0.residual = overlaps(x0, y0, w, h, m);                                    // measured with the benchmark tile size (L0 itself assumes 12 px high tiles)
    rec.L1 = { ms: time(() => solveL1(sx, sy, w, h, m, dx, dy, 6, false)) };
    solveL1(sx, sy, w, h, m, dx, dy, 6, false); const x1 = sx.map((v, i) => v + dx[i]), y1 = sy.map((v, i) => v + dy[i]);
    rec.L1.residual = overlaps(x1, y1, w, h, m);
    let d1 = 0; for (let k = 0; k < m; k++) d1 = Math.max(d1, Math.hypot(dx[k], dy[k])); rec.L1.maxOffsetPx = +d1.toFixed(0);
    // temporal stability over 120 frames (camera drift 0.4 px/frame, 16 ticks/s => 0.27 tick/frame)
    const jit = (solve) => {
      const a = [], prev = new Map(); dx.fill(0); dy.fill(0);
      for (let f = 0; f < 120; f++) {
        tl.stateAt(600 + f * 0.27); cam.lng = -77.2373 + f * 0.4 / (512 * Math.pow(2, zoom)) * 360; cam.update(); cam.projectAll(tl, ax, ay);
        const idx = []; for (let j = 0; j < tl.nAlive; j++) { const i = tl.alive[j]; if (tl.a[i] >= 1 && ax[i] > 0 && ax[i] < 1440 && ay[i] > 0 && ay[i] < 852) idx.push(i); }
        const mm = idx.length; for (let k = 0; k < mm; k++) { const i = idx[k]; sx[k] = ax[i]; sy[k] = ay[i]; const T = TIERS[tierOf(tl.s[i])]; w[k] = T.w; h[k] = T.h; str[k] = tl.s[i]; }
        solve(mm);
        for (let k = 0; k < mm; k++) { const i = idx[k], X = sx[k] + dx[k], Y = sy[k] + dy[k], p = prev.get(i); if (p && f > 1) { const stepAnchor = Math.hypot(sx[k] - p.ax, sy[k] - p.ay); a.push(Math.max(0, Math.hypot(X - p.x, Y - p.y) - stepAnchor)); } prev.set(i, { x: X, y: Y, ax: sx[k], ay: sy[k] }); }
      }
      return { meanPx: +mean(a).toFixed(3), p95Px: +pct(a, .95).toFixed(3), maxPx: +Math.max(...a).toFixed(2), n: a.length };
    };
    rec.L0.extraJitter = jit((mm) => solveL0(sx, sy, str, mm, dx, dy));              // px a displayed tile moves per frame BEYOND its own anchor's motion
    rec.L1.extraJitterCold = jit((mm) => solveL1(sx, sy, w, h, mm, dx, dy, 6, false));
    rec.L1.extraJitterWarm = jit((mm) => solveL1(sx, sy, w, h, mm, dx, dy, 6, true));
    out.push(rec);
  }
  window.__result = { n: N, rows: out }; window.__phase = 'done';
}
window.__phase = 'measure';
main().catch((e) => { window.__error = String(e && e.stack || e); window.__phase = 'error'; });
