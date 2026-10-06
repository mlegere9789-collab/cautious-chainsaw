// Read-only probe injected before the app loads (addInitScript). It wraps CanvasRenderingContext2D drawing calls made on the unit
// canvas (the full-size canvas with z-index 10) and records, per redraw, exactly what the app drew. It changes no app state.
(() => {
  if (window.__probe) return;
  const P = CanvasRenderingContext2D.prototype;
  const orig = {};
  for (const k of ['clearRect', 'save', 'restore', 'translate', 'rotate', 'fillRect', 'strokeRect', 'arc', 'fillText', 'moveTo', 'lineTo', 'stroke', 'setLineDash', 'beginPath', 'fill', 'measureText']) orig[k] = P[k];
  const S = { rec: false, frames: [], cur: null, raf: [], long: [], marks: [], rafLoop: null, state: null, inRaf: 0, curRafT: null };
  const isUnit = (ctx) => { const c = ctx.canvas; return c && c.style && c.style.zIndex === '10'; };
  const round = (v) => Math.round(v * 100) / 100;
  let tickEl = null;
  const readTick = () => {
    try {
      if (!tickEl || !tickEl.isConnected) tickEl = [...document.querySelectorAll('div,span')].find((e) => e.children.length === 0 && /^Tick \d+\/675$/.test(e.textContent));
      if (tickEl) return +tickEl.textContent.match(/\d+/)[0];
    } catch (e) { /* ignore */ }
    return null;
  };
  // state of the drawing state machine, to attribute fillRect/arc/fillText to tile / dot / label / leader
  P.clearRect = function (...a) {
    if (S.rec && isUnit(this) && a[2] >= 100) {
      const now = performance.now();
      S.cur = { t: round(now), raf: S.curRafT, tick: readTick(), cw: this.canvas.width, ch: this.canvas.height, tiles: [], dots: [], labels: [], leaders: 0, other: [], st: null, last: now };
      S.frames.push(S.cur);
      this.__pst = { stack: [], tx: 0, ty: 0, ang: 0, inTile: null, lineW: 1, dash: false };
    }
    return orig.clearRect.apply(this, a);
  };
  const live = (ctx) => S.rec && S.cur && isUnit(ctx) && ctx.__pst;
  P.save = function () { if (live(this)) { this.__pst.stack.push({ tx: this.__pst.tx, ty: this.__pst.ty, ang: this.__pst.ang }); this.__pst.inTile = null; } return orig.save.call(this); };
  P.restore = function () { if (live(this)) { const s = this.__pst.stack.pop(); if (s) { this.__pst.tx = s.tx; this.__pst.ty = s.ty; this.__pst.ang = s.ang; } } return orig.restore.call(this); };
  P.translate = function (x, y) {
    if (live(this)) { const st = this.__pst; st.tx += x; st.ty += y; st.inTile = { x: round(st.tx), y: round(st.ty), shadow: this.shadowBlur, shadowColor: this.shadowColor }; }
    return orig.translate.call(this, x, y);
  };
  P.rotate = function (a) { if (live(this)) { this.__pst.ang += a; if (this.__pst.inTile) this.__pst.inTile.ang = round((a * 180) / Math.PI); } return orig.rotate.call(this, a); };
  P.setLineDash = function (d) { if (live(this)) this.__pst.dash = d && d.length > 0; return orig.setLineDash.call(this, d); };
  P.fillRect = function (x, y, w, h) {
    if (live(this)) {
      const st = this.__pst;
      if (st.inTile) { S.cur.tiles.push({ ...st.inTile, shadow: this.shadowBlur, shadowColor: this.shadowColor, kind: 'rect', w: round(w), h: round(h), fill: String(this.fillStyle), stroke: String(this.strokeStyle), alpha: this.globalAlpha }); st.inTile.used = true; }
      else if (/^rgba\(0,\s*0,\s*0,\s*0\.72\)$/.test(String(this.fillStyle))) { S.cur.labels.push({ bx: round(x), by: round(y), bw: round(w), bh: round(h), text: null }); }
      else S.cur.other.push(['fillRect', round(x), round(y), round(w), round(h), String(this.fillStyle)]);
    }
    return orig.fillRect.call(this, x, y, w, h);
  };
  P.strokeRect = function (x, y, w, h) {
    if (live(this)) {
      const st = this.__pst;
      if (st.inTile && !st.inTile.used) { S.cur.tiles.push({ ...st.inTile, shadow: this.shadowBlur, shadowColor: this.shadowColor, kind: 'art', w: round(w), h: round(h), fill: null, stroke: String(this.strokeStyle), alpha: this.globalAlpha }); st.inTile.used = true; }
    }
    return orig.strokeRect.call(this, x, y, w, h);
  };
  P.moveTo = function (x, y) {
    if (live(this)) {
      const st = this.__pst;
      if (st.inTile && !st.inTile.used && st.dash) { st.inTile.sk = { x0: x }; }
      else if (!st.inTile && this.lineWidth === 0.5) st.leaderStart = [x, y];
    }
    return orig.moveTo.call(this, x, y);
  };
  P.lineTo = function (x, y) {
    if (live(this)) {
      const st = this.__pst;
      if (st.inTile && st.inTile.sk && !st.inTile.used) { S.cur.tiles.push({ ...st.inTile, shadow: this.shadowBlur, shadowColor: this.shadowColor, kind: 'skirm', w: round(Math.abs(x - st.inTile.sk.x0)), h: 2, fill: null, stroke: String(this.strokeStyle), alpha: this.globalAlpha }); st.inTile.used = true; }
      else if (!st.inTile && this.lineWidth === 0.5 && st.leaderStart) { S.cur.leaders++; st.leaderStart = null; }
    }
    return orig.lineTo.call(this, x, y);
  };
  P.arc = function (x, y, r, a0, a1) {
    if (live(this) && r === 3.5) S.cur.dots.push({ x: round(x), y: round(y), color: null });
    return orig.arc.call(this, x, y, r, a0, a1);
  };
  P.fill = function (...a) {
    if (live(this)) { const D = S.cur.dots[S.cur.dots.length - 1]; if (D && D.color === null) D.color = String(this.fillStyle); }
    return orig.fill.apply(this, a);
  };
  P.fillText = function (txt, x, y) {
    if (live(this)) {
      const st = this.__pst; const L = S.cur.labels[S.cur.labels.length - 1];
      if (/ fps$/.test(String(txt))) S.cur.fps = String(txt);
      else if (L && L.text === null) { L.text = String(txt); L.x = round(x); L.y = round(y); L.font = this.font; L.color = String(this.fillStyle); L.tw = round(orig.measureText.call(this, txt).width); }
    }
    S.cur && (S.cur.last = performance.now());
    return orig.fillText.call(this, txt, x, y);
  };
  // frame cadence of the page (independent of the app): our own rAF loop
  const loop = (t) => { if (S.rec) { S.raf.push(round(t)); } S.rafLoop = origRaf(loop); };
  const origRaf = window.requestAnimationFrame.bind(window);
  // mark time of rAF callbacks that belong to the app: wrap requestAnimationFrame so draws can be attributed to a frame timestamp
  window.requestAnimationFrame = function (cb) {
    return origRaf((t) => { S.curRafT = round(t); const s0 = performance.now(); try { return cb(t); } finally { S.curRafT = null; if (S.rec) S.cbs && S.cbs.push([round(t), round(performance.now() - s0)]); } });
  };
  try {
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (S.rec) S.long.push([round(e.startTime), round(e.duration)]); }).observe({ type: 'longtask', buffered: false });
  } catch (e) { /* unsupported */ }
  window.__probe = {
    start() { S.frames = []; S.raf = []; S.long = []; S.cbs = []; S.marks = []; S.rec = true; S.t0 = performance.now(); S.rafLoop = origRaf(loop); },
    stop() { S.rec = false; cancelAnimationFrame(S.rafLoop); return { t0: round(S.t0), t1: round(performance.now()), frames: S.frames, raf: S.raf, long: S.long, cbs: S.cbs, dpr: window.devicePixelRatio }; },
    digest(sampleEvery = 97) {
      S.rec = false; cancelAnimationFrame(S.rafLoop);
      const frames = S.frames.map((f) => { let sx = 0, sy = 0, sa = 0, sw = 0; for (const t of f.tiles) { sx += t.x; sy += t.y; sa += t.ang || 0; sw += t.w; } return { t: f.t, raf: f.raf, tick: f.tick, n: f.tiles.length, sx: round(sx), sy: round(sy), sa: round(sa), sw: round(sw), nl: f.labels.length, nd: f.dots.length, leaders: f.leaders, cw: f.cw, ch: f.ch }; });
      const samples = S.frames.map((f, i) => (i % sampleEvery === 0 || i === S.frames.length - 1 ? { i, raf: f.raf, tiles: f.tiles.map((t) => [t.x, t.y, t.ang, t.w, t.h, t.kind, t.fill, t.shadow]), labels: f.labels.map((l) => l.text), dots: f.dots.map((d) => [d.x, d.y, d.color]) } : null)).filter(Boolean);
      return { frames, samples, dpr: window.devicePixelRatio };
    },
    mark(label) { S.marks.push([round(performance.now()), label]); },
    frameCount() { return S.frames.length; },
    last() { return S.frames[S.frames.length - 1]; },
    isRec() { return S.rec; },
  };
})();
