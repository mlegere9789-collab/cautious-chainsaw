// Light probe: no per-draw-call hooks (so it does not distort the cost it measures). It records
//  - our own rAF loop timestamps (page frame cadence),
//  - one entry per unit-canvas redraw (clearRect on the z-index 10 canvas): time, rAF timestamp, DOM tick, duration of the rAF callback that drew it,
//  - long tasks (>50 ms) from PerformanceObserver.
(() => {
  if (window.__pl) return;
  const P = CanvasRenderingContext2D.prototype; const origClear = P.clearRect; const origRaf = window.requestAnimationFrame.bind(window);
  const S = { rec: false, raf: [], draws: [], long: [], cbs: [], inCb: false, drewInCb: null, loop: null, full: null };
  const rd = (v) => Math.round(v * 100) / 100;
  let tickEl = null;
  const readTick = () => { try { if (!tickEl || !tickEl.isConnected) tickEl = [...document.querySelectorAll('div,span')].find((e) => e.children.length === 0 && /^Tick \d+\/675$/.test(e.textContent)); return tickEl ? +tickEl.textContent.match(/\d+/)[0] : null; } catch (e) { return null; } };
  P.clearRect = function (...a) {
    if (S.rec && this.canvas.style && this.canvas.style.zIndex === '10' && a[2] >= 100) { S.drewInCb = { t: rd(performance.now()), tick: readTick(), cw: this.canvas.width, ch: this.canvas.height }; }
    return origClear.apply(this, a);
  };
  window.requestAnimationFrame = function (cb) {
    return origRaf((t) => {
      const s0 = performance.now(); S.drewInCb = null;
      try { return cb(t); } finally { const d = S.drewInCb; if (S.rec && d) { d.raf = rd(t); d.cb = rd(performance.now() - s0); S.draws.push(d); } S.drewInCb = null; }
    });
  };
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) if (S.rec) S.long.push([rd(e.startTime), rd(e.duration)]); }).observe({ type: 'longtask' }); } catch (e) { /* unsupported */ }
  const loop = (t) => { if (S.rec) S.raf.push(rd(t)); S.loop = origRaf(loop); };
  window.__pl = {
    start() { S.raf = []; S.draws = []; S.long = []; S.rec = true; S.t0 = performance.now(); S.loop = origRaf(loop); },
    stop() { S.rec = false; cancelAnimationFrame(S.loop); return { t0: rd(S.t0), t1: rd(performance.now()), raf: S.raf, draws: S.draws, long: S.long, dpr: window.devicePixelRatio, vw: innerWidth, vh: innerHeight }; },
  };
})();
