// recorder.js - runs INSIDE the page under test (injected by lib.mjs after the witness).  Wraps renderer.draw: for every frame the page really draws it takes the witness's painted-ink boxes
// (one union box per transform epoch) and the tile list the renderer was handed, matches each epoch to a tile by its transform origin, and judges the PAINTED geometry with brute-force code
// written here (it shares nothing with the engine's verifier):
//   cc chip x chip, lc label x chip, lp label x pin, cp chip x pin, ll label x label (different tiles), pp pin x pin (informational)
//   each at three opacity classes: solid x solid (both >= 0.5), solid x dim (one >= 0.5, the other in [0.05, 0.5)), dim x dim
//   ink outside the tile's declared box, tiles that should be drawn but have no ink, epochs that match no tile (stray ink), units missing from / early in the tile set,
//   DOM overlays (popups, chrome) lying on solid chips, per-frame step of every tile (map-fixed), size changes, label toggles, opacity flashes.
(() => {
  const W = window.__witness; const R = window.__rec = { frames: [], errors: [], viol: [], vss: [], vsd: [], installed: false, cfg: null, motion: null, snaps: [], runs: [] };
  const EPS = 0.02;                                   // px: overlap must exceed this on both axes (touching is allowed)
  const key = (e, f, a) => Math.round(e * 50) + '|' + Math.round(f * 50) + '|' + Math.round(a * 1000);
  const sc2 = (m) => Math.hypot(m[0], m[1]);
  const inter = (a, b) => { const w = Math.min(a[2], b[2]) - Math.max(a[0], b[0]); const h = Math.min(a[3], b[3]) - Math.max(a[1], b[1]); return w > EPS && h > EPS ? [w, h] : null; };
  const gap = (a, b) => Math.max(a[0] - b[2], b[0] - a[2], a[1] - b[3], b[1] - a[3]);
  const area = (b) => Math.max(0, b[2] - b[0]) * Math.max(0, b[3] - b[1]);

  R.install = (cfg) => {
    const S = window.__studio; const rend = S.renderer; R.cfg = cfg; if (R.installed) return; R.installed = true;
    const od = rend.draw; R.od = od;
    const dom = cfg.dom || [];
    rend.draw = function (frame, opts) {
      R.lastOpts = opts; R.lastFrame = frame; const t0 = performance.now(); W.full = !!R.full; W.begin(); let ret;
      try { ret = od.call(this, frame, opts); } finally { R.rec = W.end(); }
      const t1 = performance.now();
      try { const fr = analyze(frame, R.rec, t0, t1, rend, opts); if (R.keep) R.frames.push(fr); R.last = fr; } catch (e) { R.errors.push(String(e && e.stack || e)); }
      return ret;
    };
  };
  R.uninstall = () => { const S = window.__studio; if (R.installed && R.od) S.renderer.draw = R.od; R.installed = false; };

  function analyze(frame, rec, t0, t1, rend, opts) {
    const cfg = R.cfg; const dpr = rend.dpr; const [cw, ch] = rend.size; const dx = frame.view.dx; const dy = frame.view.dy;
    const epochs = rec.epochs; const idx = new Map(); for (let i = 0; i < epochs.length; i++) { const m = epochs[i]; const k = key(m[4], m[5], sc2(m)); const l = idx.get(k); if (l) l.push(i); else idx.set(k, [i]); }
    const used = new Set(); const take = (e, f, a) => { const l = idx.get(key(e, f, a)); if (!l) return -1; for (const i of l) if (!used.has(i) && rec.box[i]) { used.add(i); return i; } return -1; };
    const ents = []; let noInk = 0; let noInkFaint = 0; let inkOutside = 0; let maxExcess = 0; let tilesLive = 0; let solidChips = 0; const noInkEx = []; const outEx = [];
    const idsLive = new Set();
    for (const t of frame.tiles) {
      if (t.life === 'live') for (const id of t.ids) idsLive.add(id);
      if (t.opacity < 0.02) continue; tilesLive++;
      const cx = t.x + dx; const cy = t.y + dy;
      const dec = [cx - t.w * t.scale / 2, cy - t.h * t.scale / 2, cx + t.w * t.scale / 2, cy + t.h * t.scale / 2];
      const vw = (opts && opts.mapRect) ? opts.mapRect.w : cw; const vh = (opts && opts.mapRect) ? opts.mapRect.h : ch; const inView = dec[2] > 8 && dec[0] < vw - 8 && dec[3] > 8 && dec[1] < vh - 8;
      const ep = take(cx * dpr, cy * dpr, t.scale * dpr);
      if (ep < 0) { if (inView) { if (t.opacity >= 0.5) { noInk++; if (noInkEx.length < 3) noInkEx.push(t.key); } else noInkFaint++; } }
      else {
        const b = rec.box[ep]; const bx = [b[0] / dpr, b[1] / dpr, b[2] / dpr, b[3] / dpr];
        const ex = Math.max(dec[0] - bx[0], dec[1] - bx[1], bx[2] - dec[2], bx[3] - dec[3]);
        if (ex > 0.75) { inkOutside++; if (outEx.length < 3) outEx.push([t.key, +ex.toFixed(2)]); } if (ex > maxExcess) maxExcess = ex;
        ents.push({ cls: 'chip', t, box: bx, alpha: b[4], dec });
      }
      if (t.label && t.label.opacity > 0) {
        const L = t.label; const lp = take((L.x0 + dx) * dpr, (L.y0 + dy) * dpr, dpr);
        if (lp >= 0) { const b = rec.box[lp]; ents.push({ cls: 'label', t, box: [b[0] / dpr, b[1] / dpr, b[2] / dpr, b[3] / dpr], alpha: b[4] }); }
      }
      if (t.displaced) { const pp = take((t.ax + dx) * dpr, (t.ay + dy) * dpr, dpr); if (pp >= 0) { const b = rec.box[pp]; ents.push({ cls: 'pin', t, box: [b[0] / dpr, b[1] / dpr, b[2] / dpr, b[3] / dpr], alpha: b[4] }); } }
    }
    const idsSolid = new Set(); const idsVis = new Set(); for (const e of ents) if (e.cls === 'chip') { if (e.alpha >= 0.5) for (const id of e.t.ids) idsSolid.add(id); if (e.alpha >= 0.05) for (const id of e.t.ids) idsVis.add(id); }
    const idsView = new Set(); for (const t of frame.tiles) { if (t.opacity < 0.02) continue; const cx = t.x + dx; const cy = t.y + dy; if (cx + t.w / 2 > 1 && cx - t.w / 2 < cw - 1 && cy + t.h / 2 > 1 && cy - t.h / 2 < ch - 1) for (const id of t.ids) idsView.add(id); }
    const U = R.unitRun || (R.unitRun = new Map()); const RR = R.runs || (R.runs = []);
    for (const id of idsView) { if (!idsSolid.has(id)) U.set(id, (U.get(id) || 0) + 1); else if (U.has(id)) { RR.push(U.get(id)); U.delete(id); } }
    for (const [id, n] of U) if (!idsView.has(id)) { RR.push(n); U.delete(id); }
    let dimOnly = 0; let invisible = 0; for (const id of idsView) { if (!idsSolid.has(id)) dimOnly++; if (!idsVis.has(id)) invisible++; }
    let stray = 0; const strayEx = []; for (let i = 1; i < epochs.length; i++) if (rec.box[i] && !used.has(i) && !(Math.abs(epochs[i][4]) < 1e-6 && Math.abs(epochs[i][5]) < 1e-6)) { const b = rec.box[i]; if (b[2] - b[0] < cw * dpr * 0.9) { stray++; if (strayEx.length < 3) strayEx.push([epochs[i][4] / dpr, epochs[i][5] / dpr, b[5]]); } }

    // ---- overlaps among entities of different tiles (grid broad phase) --------------------------------------------------------------------------------------------
    const CELL = 64; const grid = new Map();
    for (let i = 0; i < ents.length; i++) { const b = ents[i].box; for (let gx = Math.floor(b[0] / CELL); gx <= Math.floor(b[2] / CELL); gx++) for (let gy = Math.floor(b[1] / CELL); gy <= Math.floor(b[3] / CELL); gy++) { const k = gx * 100003 + gy; const l = grid.get(k); if (l) l.push(i); else grid.set(k, [i]); } }
    const sdBy = {}; const seen = new Set(); const res = { ss: { cc: 0, lc: 0, lp: 0, cp: 0, ll: 0, pp: 0 }, sd: { cc: 0, lc: 0, lp: 0, cp: 0, ll: 0, pp: 0 }, dd: { cc: 0, lc: 0, lp: 0, cp: 0, ll: 0, pp: 0 } };
    let minGapCC = Infinity; let maxDepth = 0; let maxDepthSS = 0; let overlapArea = 0; const ex = [];
    const SOL = cfg.solid ?? 0.5; const VIS = cfg.visible ?? 0.05;
    for (const l of grid.values()) for (let a = 0; a < l.length; a++) for (let b = a + 1; b < l.length; b++) {
      const i = l[a]; const j = l[b]; const pk = i < j ? i * 65536 + j : j * 65536 + i; if (seen.has(pk)) continue; seen.add(pk);
      const A = ents[i]; const B = ents[j]; if (A.t === B.t) continue;
      if (A.alpha < VIS || B.alpha < VIS) continue;
      const kinds = [A.cls, B.cls].sort().join('+'); const nm = { 'chip+chip': 'cc', 'chip+label': 'lc', 'label+pin': 'lp', 'chip+pin': 'cp', 'label+label': 'll', 'pin+pin': 'pp' }[kinds];
      if (A.cls === 'chip' && B.cls === 'chip') { const g = gap(A.box, B.box); if (g < minGapCC) minGapCC = g; }
      const o = inter(A.box, B.box); if (!o) continue;
      const lo = Math.min(A.alpha, B.alpha); const hi = Math.max(A.alpha, B.alpha); const cl = lo >= SOL ? 'ss' : hi >= SOL ? 'sd' : 'dd';
      res[cl][nm]++; if (cl === 'ss' && nm !== 'pp') maxDepthSS = Math.max(maxDepthSS, Math.min(o[0], o[1])); if (cl === 'sd') { const dimE = A.alpha < SOL ? A : B; const solE = A.alpha < SOL ? B : A; const kk = dimE.cls + '/' + solE.cls; sdBy[kk] = (sdBy[kk] || 0) + 1; } if (cl === 'ss' || cl === 'sd') { if (nm !== 'pp') { maxDepth = Math.max(maxDepth, Math.min(o[0], o[1])); overlapArea += o[0] * o[1]; if (ex.length < 4) ex.push([cl, nm, A.t.key, B.t.key, +o[0].toFixed(1), +o[1].toFixed(1), +A.alpha.toFixed(2), +B.alpha.toFixed(2), [Math.min(A.box[0], B.box[0]), Math.min(A.box[1], B.box[1]), Math.max(A.box[2], B.box[2]), Math.max(A.box[3], B.box[3])]]); } }
    }
    // ---- DOM overlays on solid chips ----------------------------------------------------------------------------------------------------------------------------
    let domHit = null;
    if (cfg.dom && cfg.dom.length) {
      const rects = [];
      for (const sel of cfg.dom) for (const el of document.querySelectorAll(sel)) {
        const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) continue; const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none') continue; const op = +cs.opacity; if (op < 0.2) continue;
        rects.push({ sel, id: el.id || el.className || el.tagName, box: [r.left, r.top, r.right, r.bottom], op });
      }
      domHit = { any: 0, half: 0, by: {}, rects: rects.length };
      for (const e of ents) if (e.cls === 'chip' && e.alpha >= SOL) {
        const b = e.box; if (b[2] < 0 || b[0] > cw || b[3] < 0 || b[1] > ch) continue;
        let cov = 0; let who = null; for (const r of rects) { const w = Math.min(b[2], r.box[2]) - Math.max(b[0], r.box[0]); const h = Math.min(b[3], r.box[3]) - Math.max(b[1], r.box[1]); if (w > 0.5 && h > 0.5) { const f = (w * h) / Math.max(1, area(b)); if (f > cov) { cov = f; who = r.sel; } } }
        if (cov > 0.02) { domHit.any++; domHit.by[who] = (domHit.by[who] || 0) + 1; if (cov >= 0.5) domHit.half++; }
      }
    }
    // ---- representation (own rule: a unit is on the field from its first keyframe tick on) --------------------------------------------------------------------------
    let missing = 0; let early = 0; let maxEarly = 0; let phantom = 0; const missEx = [];
    if (cfg.firstTick) {
      const tau = frame.tau;
      for (const id in cfg.firstTick) { const ft = cfg.firstTick[id]; const has = idsLive.has(id); if (tau >= ft && !has) { missing++; if (missEx.length < 3) missEx.push([id, +(tau - ft).toFixed(3)]); } else if (tau < ft && has) { early++; maxEarly = Math.max(maxEarly, ft - tau); } }
      for (const id of idsLive) if (!(id in cfg.firstTick)) phantom++;
    }
    for (const t of frame.tiles) if (t.kind === 'leaf' && t.life === 'live' && t.displaced && t.ids.length !== 1) phantom++;
    solidChips = ents.filter((e) => e.cls === 'chip' && e.alpha >= SOL).length;
    const bad = res.ss.cc + res.ss.lc + res.ss.lp + res.ss.cp + res.ss.ll + res.sd.cc + res.sd.lc + res.sd.lp + res.sd.cp + res.sd.ll;
    const fr = { t: t0, drawMs: t1 - t0, tau: frame.tau, tick: frame.tick, tiles: tilesLive, chips: ents.filter((e) => e.cls === 'chip').length, solidChips, labels: ents.filter((e) => e.cls === 'label').length, pins: ents.filter((e) => e.cls === 'pin').length, noInk, noInkFaint, dimOnly, invisible, unitsInView: idsView.size, inkOutside, maxExcess: +maxExcess.toFixed(3), stray, sdBy, missEx, ss: res.ss, sd: res.sd, dd: res.dd, minGapCC: Number.isFinite(minGapCC) ? +minGapCC.toFixed(3) : null, maxDepth: +maxDepth.toFixed(2), maxDepthSS: +maxDepthSS.toFixed(2), overlapArea: +overlapArea.toFixed(1), missing, early, maxEarly: +maxEarly.toFixed(2), phantom, domHit: domHit && { any: domHit.any, half: domHit.half, by: domHit.by, rects: domHit.rects }, engineOverlaps: frame.overlaps, popupCards: window.__studio.cardStats ? window.__studio.cardStats.over : null };
    const ssTot0 = 0;
    const ssTot = res.ss.cc + res.ss.lc + res.ss.lp + res.ss.cp + res.ss.ll; if (ssTot > 0 && R.vss.length < 60) R.vss.push({ tau: frame.tau, t: t0, ex, ss: res.ss });
    if (res.sd.cc + res.sd.lc + res.sd.lp + res.sd.cp + res.sd.ll > 0 && R.vsd.length < 30) R.vsd.push({ tau: frame.tau, ex, sd: res.sd, sdBy });

    if (R.snapCfg && R.snaps && R.snaps.length < R.snapCfg.max && ex.length && (ssTot > 0 || maxDepth >= R.snapCfg.depth) && (!R.lastSnapAt || t0 - R.lastSnapAt > 400)) {
      try { const b = ex[0][8]; const m = 50; const x0 = Math.max(0, Math.floor(b[0] - m)); const y0 = Math.max(0, Math.floor(b[1] - m)); const w = Math.min(cw - x0, Math.ceil(b[2] - b[0] + 2 * m)); const h = Math.min(ch - y0, Math.ceil(b[3] - b[1] + 2 * m));
        const cv = document.getElementById('map'); const o = document.createElement('canvas'); const k = 3; o.width = w * k; o.height = h * k; const g = o.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(cv, x0 * dpr, y0 * dpr, w * dpr, h * dpr, 0, 0, w * k, h * k);
        R.snaps.push({ tau: frame.tau, ex: ex.map((q) => q.slice(0, 8)), png: o.toDataURL('image/png') }); R.lastSnapAt = t0; } catch (e) { R.errors.push('snap ' + e); }
    }
    if (bad > 0 || noInk > 0 || inkOutside > 0 || missing > 0) { fr.ex = ex; if (R.viol.length < (R.cfg.keepViol || 12)) R.viol.push({ frame: R.frames.length, tau: frame.tau, ex, noInkEx, outEx, strayEx, res }); }
    if (noInk || inkOutside || stray) fr.dbg = { noInkEx, outEx, strayEx };
    return fr;
  }


  // ---------------------------------------------------------------------------------------------------------------------------------------------------------------
  // pixel completeness: draw the current frame twice on the real canvas, once as it is and once with the skin's tile / label / pin drawing switched off; every pixel that differs is tile ink and must lie
  // inside a painted-ink box the witness recorded (+1.5 px for anti-aliasing).  A pixel outside every box = ink the witness (and therefore any box-based overlap check) cannot see.
  R.pixelCheck = () => {
    const S = window.__studio; const E = S.engine; const rend = S.renderer; const f = R.lastFrame || E.frame; const cv = document.getElementById('map'); const g = cv.getContext('2d'); const opts = R.lastOpts; const od = R.od || rend.draw;
    const skin = E.kernel.skins.get(E.tok('skin.id')); const dpr = rend.dpr;
    W.full = false; W.begin(); od.call(rend, f, opts); const rec = W.end(); const A = g.getImageData(0, 0, cv.width, cv.height);
    const saved = {}; for (const k of ['tile', 'label', 'pin']) { saved[k] = skin.draw[k]; if (saved[k]) skin.draw[k] = () => {}; }
    let B; try { od.call(rend, f, opts); B = g.getImageData(0, 0, cv.width, cv.height); } finally { for (const k of ['tile', 'label', 'pin']) skin.draw[k] = saved[k]; }
    od.call(rend, f, opts);                                                                  // leave the canvas as the page drew it
    const Wd = cv.width; const Hd = cv.height; const mask = new Uint8Array(Wd * Hd); const M = 1.5 * dpr;
    for (let i = 1; i < rec.epochs.length; i++) { const e = rec.epochs[i]; if (Math.abs(e[4]) < 1e-6 && Math.abs(e[5]) < 1e-6) continue; const b = rec.box[i]; if (!b) continue; const x0 = Math.max(0, Math.floor(b[0] - M)); const y0 = Math.max(0, Math.floor(b[1] - M)); const x1 = Math.min(Wd - 1, Math.ceil(b[2] + M)); const y1 = Math.min(Hd - 1, Math.ceil(b[3] + M)); for (let y = y0; y <= y1; y++) mask.fill(1, y * Wd + x0, y * Wd + x1 + 1); }
    let diff = 0; let unexplained = 0; const ex = []; let bx0 = Infinity; let by0 = Infinity; let bx1 = -Infinity; let by1 = -Infinity; const a = A.data; const b = B.data;
    for (let p = 0, n = Wd * Hd; p < n; p++) { const o = p * 4; if (Math.abs(a[o] - b[o]) + Math.abs(a[o + 1] - b[o + 1]) + Math.abs(a[o + 2] - b[o + 2]) > 6) { diff++; if (!mask[p]) { unexplained++; const x = p % Wd; const y = (p / Wd) | 0; if (ex.length < 6) ex.push([x, y]); if (x < bx0) bx0 = x; if (x > bx1) bx1 = x; if (y < by0) by0 = y; if (y > by1) by1 = y; } } }
    return { diffPixels: diff, unexplained, ex, bbox: unexplained ? [bx0, by0, bx1, by1] : null, dpr, canvas: [Wd, Hd] };
  };

  // ---------------------------------------------------------------------------------------------------------------------------------------------------------------
  // motion recorder: no ink, only what the renderer was handed.  Per-frame step of every tile in map-fixed pixels (the camera is still in these runs), size and label changes, flashes.
  R.motionInstall = (cfg) => {
    const S = window.__studio; const rend = S.renderer; const od = rend.draw; const M = R.motion = { frames: 0, ts: [], big: [], cfg, prev: new Map(), prevZ: null, st: { n: 0, over3: 0, over8: 0, over20: 0, sudden: 0, suddenSolid: 0, jerk4: 0, tileFrames: 0, still: 0, sizeJumps: 0, labelToggles: 0, flashes: 0, appear: 0, vanish: 0, blinks: 0 }, hist: new Array(40).fill(0), perFrameMax: [], perFrameSudden: [], gone: new Map(), t0: performance.now() };
    rend.draw = function (frame, opts) {
      const now = performance.now(); const ret = od.call(this, frame, opts); M.ts.push(now);
      const cur = new Map(); let mx = 0; let sd = 0; const z = frame.zoom; const sameZ = M.prevZ === z; const S2 = M.st;
      for (const tl of frame.tiles) {
        if (tl.opacity < 0.02) continue; const lab = tl.label && tl.label.opacity > 0.5 ? 1 : 0; const p = M.prev.get(tl.key); S2.tileFrames++;
        let step = 0;
        if (p && sameZ) {
          step = Math.hypot(tl.x - p[0], tl.y - p[1]); S2.n++; if (step > 3) S2.over3++; if (step > 8) S2.over8++; if (step > 20) S2.over20++; if (step < 0.01) S2.still++;
          if (step >= 8 && step >= 3 * p[7]) { S2.sudden++; sd++; const solid = tl.opacity >= 0.5 && p[4] >= 0.5; if (solid) S2.suddenSolid++; if (M.big.length < 300) M.big.push([M.frames, tl.key, +step.toFixed(1), +p[7].toFixed(1), +tl.opacity.toFixed(2), +p[4].toFixed(2), p[6], solid ? 1 : 0]); }
          if (Math.abs(step - p[7]) > 4) S2.jerk4++;
          if (step > mx) mx = step; M.hist[Math.min(39, Math.floor(step))]++;
          if (Math.abs(tl.w - p[2]) > 0.5 || Math.abs(tl.h - p[3]) > 0.5) S2.sizeJumps++; if (lab !== p[5]) S2.labelToggles++; if (Math.abs(tl.opacity - p[4]) > 0.3) S2.flashes++;
        } else if (!p) { S2.appear++; const g = M.gone.get(tl.key); if (g !== undefined && M.frames - g <= 3) S2.blinks++; }
        cur.set(tl.key, [tl.x, tl.y, tl.w, tl.h, tl.opacity, lab, tl.kind === 'agg' ? 1 : 0, step]);
      }
      if (sameZ) for (const k of M.prev.keys()) if (!cur.has(k)) { S2.vanish++; M.gone.set(k, M.frames); }
      M.prev = cur; M.prevZ = z; M.perFrameMax.push(+mx.toFixed(2)); M.perFrameSudden.push(sd); M.frames++;
      return ret;
    };
    R.motionOd = od;
  };
  R.motionUninstall = () => { const S = window.__studio; if (R.motionOd) S.renderer.draw = R.motionOd; R.motionOd = null; };
})();
