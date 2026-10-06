// ---------------------------------------------------------------- 40-layout: layout strategies (plug-ins).  solve(L, dt) reads L.X / L.Y (footprint centres, px), L.W / L.H (footprint size, px) for the tiles in L.idx and writes L.DX / L.DY
// (the offsets that are DRAWN).  Offsets persist between frames (warm start) and are smoothed in time, so a tile never snaps when the solver changes its mind.
// This is the REFERENCE strategy of the prototype; the layout lab's strategy replaces it by registering under another name (the invariant it must meet is G.overlaps() === 0).
G.register("layout", "none", { version: "1", label: "None (tiles on their anchors)", params: {}, solve: function (L) { var j, i; for (j = 0; j < L.idx.length; j++) { i = L.idx[j]; L.DX[i] = 0; L.DY[i] = 0; } } });
G.register("layout", "relax", {
  version: "1", label: "Relax (grid push-apart, warm start, smoothed)",
  params: {
    passes: { type: "range", min: 1, max: 12, step: 1, def: 6, label: "Passes per frame" },
    gap: { type: "range", min: 0, max: 8, step: 0.5, def: 2, label: "Gap between tiles (px)" },
    restore: { type: "range", min: 0, max: 0.5, step: 0.01, def: 0.12, label: "Pull back to anchor" },
    tau: { type: "range", min: 20, max: 400, step: 10, def: 110, label: "Slide time constant (ms)" }
  },
  solve: function (L, dt) {
    var P = function (k) { return G.P("layout", "relax", k); }, passes = P("passes"), gap = P("gap"), restore = P("restore"), tau = P("tau"), CELL = 96, idx = L.idx, n = idx.length;
    var X = L.X, Y = L.Y, W = L.W, H = L.H, TX = L.TX, TY = L.TY, i, j, it, a, b, key, ox, oy, sg, cx, cy, moved, q, u, v, h;
    if (!this.next || this.next.length < n) this.next = new Int32Array(Math.max(n, 1024));
    var next = this.next, cells = this._cells || (this._cells = new Map());
    for (j = 0; j < n; j++) { i = idx[j]; TX[i] *= (1 - restore); TY[i] *= (1 - restore); }
    for (it = 0; it < passes; it++) {
      cells.clear();
      for (j = 0; j < n; j++) { i = idx[j]; key = (((X[i] + TX[i]) / CELL) | 0) * 100003 + (((Y[i] + TY[i]) / CELL) | 0); h = cells.get(key); next[j] = h === void 0 ? -1 : h; cells.set(key, j); }
      moved = 0;
      for (j = 0; j < n; j++) {
        a = idx[j]; cx = ((X[a] + TX[a]) / CELL) | 0; cy = ((Y[a] + TY[a]) / CELL) | 0;
        for (u = -1; u <= 1; u++) for (v = -1; v <= 1; v++) {
          h = cells.get((cx + u) * 100003 + (cy + v)); if (h === void 0) continue;
          for (q = h; q >= 0; q = next[q]) {
            if (q <= j) continue; b = idx[q];
            ox = (W[a] + W[b]) / 2 + gap - Math.abs(X[a] + TX[a] - X[b] - TX[b]); oy = (H[a] + H[b]) / 2 + gap - Math.abs(Y[a] + TY[a] - Y[b] - TY[b]);
            if (ox > 0 && oy > 0) {
              moved++;
              if (oy <= ox) { sg = Y[a] + TY[a] < Y[b] + TY[b] ? -1 : 1; TY[a] += sg * oy / 2; TY[b] -= sg * oy / 2; }
              else { sg = X[a] + TX[a] < X[b] + TX[b] ? -1 : 1; TX[a] += sg * ox / 2; TX[b] -= sg * ox / 2; }
            }
          }
        }
      }
      if (!moved) break;
    }
    var f = 1 - Math.exp(-Math.min(dt, 100) / tau);
    for (j = 0; j < n; j++) { i = idx[j]; L.DX[i] += (TX[i] - L.DX[i]) * f; L.DY[i] += (TY[i] - L.DY[i]) * f; }
  }
});
