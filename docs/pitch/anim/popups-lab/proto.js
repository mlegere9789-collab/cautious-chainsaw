/* Overlay Director, PROTOTYPE (research only). Injected into the running R1c app through page.evaluate; it changes no product file.
 *
 * What it demonstrates, with the app's own data and the app's own unit canvas:
 *   1. captions that know where they are: a card is placed in the nearest rectangle that touches no tile, no label, no dot and no persistent overlay,
 *   2. a leader line from the card to the unit tile it is about (and a ring on that tile),
 *   3. compact "peek" forms (event 340 x ~120, story 340 x ~150, command-change chips 300 x 44) so they always have somewhere to go,
 *   4. placement hysteresis (a card keeps its place until it stops fitting), a priority queue with tiers, no stale toasts after a seek,
 *   5. every number that sets the look or the timing lives in TOKENS (change them live: window.__proto.tokens).
 * Tile rectangles come from the capture hook in tmp/pitch-anim/popups/h.mjs (window.__cap); in the product the renderer would publish them.
 */
(() => {
  if (window.__proto) return;
  const TOKENS = {
    cell: 8, gap: 8,                         // free-space grid (px) and the clear gap kept around tiles, labels and overlays
    forms: { event: [{ w: 340 }, { w: 400 }, { w: 460 }, { chip: 300 }], story: [{ w: 340, lines: 3 }, { w: 300, lines: 2 }, { chip: 300 }], chip: [{ chip: 300 }, { chip: 220 }], maxH: 235, phoneW: 358 },
    dwell: { tierA: [3000, 12000], tierB: [2200, 8000], chip: [2500, 4500], msPerWord: 252 },   // wall-clock ms: [min, max]; reading budget = words * msPerWord (252 ms = 238 wpm, Brysbaert 2019) + 1.5 s, clamped
    maxCards: { event: 1, story: 1, chip: 3 },
    leader: { width: 1.6, dot: 3.5, ms: 240 },
    motion: { enter: 220, exit: 160, move: 260, ease: 'cubic-bezier(.2,.8,.2,1)' },
    sig: { critical: '#ff4a2a', high: '#ff9a3c', medium: '#ffd05a' },
    clockStyle: 'compat',
  };
  const P = (window.__proto = { tokens: TOKENS, stats: { solves: 0, ms: [], layoutMs: [], placed: 0, chipFallback: 0, noRoom: 0, moves: 0 }, cards: new Map(), on: false });
  const $ = (t, c, s) => { const e = document.createElement(t); if (c) e.className = c; if (s) e.style.cssText = s; return e; };
  let store, map, DATA = null, layer, svg, T = null, lastTick = null, dirty = false, raf = 0, CLOCK = null;

  const css = `
  #pr-layer{position:fixed;inset:0;pointer-events:none;z-index:300}
  #pr-svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
  .pc{position:absolute;box-sizing:border-box;background:rgba(8,8,18,.94);border:1px solid var(--c,#8b6914);border-radius:8px;color:#ddd;font:13px/1.45 system-ui,sans-serif;padding:8px 12px 9px;
      overflow:hidden;pointer-events:auto;transition:opacity var(--en) var(--ease),transform var(--en) var(--ease);opacity:0;transform:translateY(6px)}
  .pc.in{opacity:1;transform:none}
  .pc.out{opacity:0;transform:translateY(-4px);transition-duration:var(--ex)}
  .pc-h{display:flex;align-items:center;gap:8px;margin-bottom:3px}
  .pc-sig{font:700 10px/1 system-ui,sans-serif;letter-spacing:.14em;color:var(--c)}
  .pc-t{font:11px/1 system-ui,sans-serif;color:#9aa;margin-left:auto;white-space:nowrap}
  .pc-t i{font-style:normal;border:1px solid #4a5a70;border-radius:3px;padding:1px 4px;margin-left:6px;color:#8fb4d8;font-size:9px;letter-spacing:.06em;text-transform:uppercase}
  .pc-b{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:4;overflow:hidden;color:#e6e2d6}
  .pc-title{font:700 14px/1.25 Georgia,serif;color:#e8d5a3;margin-bottom:3px}
  .pc-foot{margin-top:6px;font:10px/1 system-ui,sans-serif;color:#8a8a98;display:flex;justify-content:space-between;gap:8px}
  .pc-chip{display:flex;align-items:center;gap:8px;padding:0 10px;height:44px;border-radius:22px}
  .pc-chip b{font:600 12px/1.2 system-ui,sans-serif;color:var(--c);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .pc-chip span{font-size:11px;color:#aab;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .pr-lead{fill:none;stroke:var(--c);stroke-width:1.6;stroke-linecap:round}
  .pr-ring{fill:none;stroke:var(--c);stroke-width:2;filter:drop-shadow(0 0 4px var(--c))}
  .pr-dot{fill:var(--c)}
  @media (prefers-reduced-motion:reduce){.pc{transition:opacity 120ms linear!important;transform:none!important}}
  #pr-lane{position:fixed;left:8px;right:8px;height:44px;z-index:301;pointer-events:none}
  #pr-lane .pc{position:absolute;inset:0;width:auto!important;height:44px!important;transition:opacity var(--en) var(--ease)}
  #pr-lane .pc.pc-chip{padding:0 12px}
  #pr-lane .pc-n{margin-left:auto;font:600 11px/1 system-ui,sans-serif;color:#c8a84a;border:1px solid #6b5a22;border-radius:10px;padding:3px 7px;white-space:nowrap}
  [data-gtbg-card],[role="log"][aria-label="Battle events"],.gtbg-mp-story,.gtbg-mp-toast{visibility:hidden!important}
  `;

  // ---------------------------------------------------------------- data
  async function load() {
    const j = (u) => fetch(u).then((r) => r.json());
    const [c1, c2, c3, v1, v2, v3, cs] = await Promise.all([1, 2, 3].map((d) => j(`/data/chronology_day${d}.json`)).concat([1, 2, 3].map((p) => j(`/data/vignettes_part${p}.json`)), [j('/data/oob/commander_successions.json')]));
    const ev = [c1, c2, c3].flatMap((c) => c.events).filter((e) => e.significance !== 'low');
    const byTick = {}; ev.forEach((e) => (byTick[e.tick] ||= []).push(e));
    const vg = [v1, v2, v3].flatMap((v) => v.vignettes);
    const sc = [...cs.union_successions, ...cs.confederate_successions];
    return { ev, byTick, vg, sc };
  }

  // ---------------------------------------------------------------- geometry
  let areaC = { t: -1e9, v: null };
  const area = () => { const now = performance.now(); if (now - areaC.t < 300 && areaC.v) return areaC.v; const cv = document.querySelector('canvas[style*="z-index: 10"]'); const r = cv.getBoundingClientRect(); areaC = { t: now, v: { x0: r.left, y0: r.top, x1: r.right, y1: r.bottom } }; return areaC.v; };
  let ovCache = { t: -1e9, rects: [] }, ovEls = null, ovElsT = -1e9;
  function findOverlayEls() {
    const els = [];
    const sels = ['[role="group"][aria-label="Legend"]', '#gt-timeline', '.mapboxgl-ctrl-top-right', '.mapboxgl-ctrl-bottom-right', '.mapboxgl-ctrl-bottom-left', '#extra-features', '.gtbg-m-top', '.gtbg-m-days', '.gtbg-m-dock', '.gtbg-m-legend', '.gtbg-m-mini', '#gt-unit-panel', '.gtbg-m-popup'];
    sels.forEach((s) => document.querySelectorAll(s).forEach((e) => els.push(e)));
    // the three unnamed floating widgets of the desktop shell: HUD badge, minimap, trails button, tour button (found once, by their text)
    const root = document.getElementById('root'); if (root) root.querySelectorAll('button, div').forEach((e) => { if (e.childElementCount > 6) return; const t = e.textContent; if (!t || t.length > 40 || !/^(overview|.*trails (on|off)|july \d, 1863|.*nps auto tour)/i.test(t.trim())) return; if (e.tagName !== 'BUTTON' && !/absolute|fixed/.test(getComputedStyle(e).position)) return; els.push(e); });
    return els;
  }
  function overlayRects() {
    const now = performance.now(); if (now - ovCache.t < 250) return ovCache.rects;
    if (!ovEls || now - ovElsT > 3000) { ovEls = findOverlayEls(); ovElsT = now; }
    const out = []; for (const e of ovEls) { if (!e.isConnected) { ovElsT = -1e9; continue; } const r = e.getBoundingClientRect(); if (r.width > 1 && r.height > 1 && !(r.width >= innerWidth * 0.95 && r.height >= innerHeight * 0.9)) out.push({ x0: r.left, y0: r.top, x1: r.right, y1: r.bottom, k: 'ui' }); }
    ovCache = { t: now, rects: out }; return out;
  }
  function obstacles() {
    const A = area(); const out = [];
    const cap = (window.__cap && window.__cap.cur) || [];
    for (const t of cap) { if (t.k === 'label' || t.k === 'dot' || t.k === 'body' || t.k === 'art' || t.k === 'skirm') out.push(t); }
    overlayRects().forEach((r) => out.push(r));
    return { A, out, ox: A.x0, oy: A.y0 };
  }
  function pip(pts, x, y, grow) { let sg = 0; for (let i = 0; i < pts.length; i++) { const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % pts.length]; const ex = x2 - x1, ey = y2 - y1, l = Math.hypot(ex, ey) || 1; const cr = (ex * (y - y1) - ey * (x - x1)) / l; if (cr > -grow && cr < grow) continue; const s = Math.sign(cr); if (!sg) sg = s; else if (s !== sg) return false; } return true; }
  function grid() {
    const { A, out, ox, oy } = obstacles(); const c = TOKENS.cell, g = TOKENS.gap;
    const W = Math.ceil((A.x1 - A.x0) / c), H = Math.ceil((A.y1 - A.y0) / c); const occ = new Uint8Array(W * H);
    const mark = (r) => {      // tile records are canvas-relative (shifted by ox, oy); overlay and card rects are page-relative
      const dx = r.k === 'ui' || r.k === 'card' ? 0 : ox, dy = r.k === 'ui' || r.k === 'card' ? 0 : oy;
      const i0 = Math.max(0, Math.floor((r.x0 + dx - g - A.x0) / c)), i1 = Math.min(W - 1, Math.floor((r.x1 + dx + g - A.x0) / c)), j0 = Math.max(0, Math.floor((r.y0 + dy - g - A.y0) / c)), j1 = Math.min(H - 1, Math.floor((r.y1 + dy + g - A.y0) / c));
      if (i1 < i0 || j1 < j0) return; const pts = r.pts;
      if (pts) { const q = pts.map(([x, y]) => [x + dx, y + dy]); for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { if (pip(q, A.x0 + (i + .5) * c, A.y0 + (j + .5) * c, g + c * .75)) occ[j * W + i] = 1; } return; }
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) occ[j * W + i] = 1;
    };
    out.forEach(mark);
    return { A, W, H, occ, c, mark };
  }
  function sat(G) { const { W, H, occ } = G; const S = new Int32Array((W + 1) * (H + 1)); for (let j = 0; j < H; j++) { let row = 0; for (let i = 0; i < W; i++) { row += occ[j * W + i]; S[(j + 1) * (W + 1) + i + 1] = S[j * (W + 1) + i + 1] + row; } } G.S = S; return S; }
  const free = (G, i, j, cw, ch) => { const { W, H, S } = G; if (i < 0 || j < 0 || i + cw > W || j + ch > H) return false; return S[(j + ch) * (W + 1) + i + cw] - S[j * (W + 1) + i + cw] - S[(j + ch) * (W + 1) + i] + S[j * (W + 1) + i] === 0; };
  // nearest free rect (w x h px) to an anchor point; `prev` = previous rect for hysteresis
  function place(G, w, h, ax, ay, prev) {
    const t0 = performance.now(); const { A, W, H, c } = G; const cw = Math.ceil(w / c), ch = Math.ceil(h / c);
    let best = null, bd = 1e12;
    for (let j = 0; j + ch <= H; j++) for (let i = 0; i + cw <= W; i++) {
      if (!free(G, i, j, cw, ch)) continue;
      const cx = A.x0 + (i + cw / 2) * c, cy = A.y0 + (j + ch / 2) * c; const d = Math.hypot(cx - ax, cy - ay);
      if (d < bd) { bd = d; best = { i, j }; }
    }
    P.stats.solves++; P.stats.ms.push(performance.now() - t0);
    if (!best) return null;
    let pick = best;
    if (prev) { const pi = Math.round((prev.x - A.x0) / c), pj = Math.round((prev.y - A.y0) / c); if (free(G, pi, pj, cw, ch)) { const d = Math.hypot(A.x0 + (pi + cw / 2) * c - ax, A.y0 + (pj + ch / 2) * c - ay); if (d <= bd * 1.35 + 60) pick = { i: pi, j: pj }; } }
    return { x: A.x0 + pick.i * c, y: A.y0 + pick.j * c, w: cw * c, h: ch * c };
  }
  function reserve(G, r) { G.mark({ x0: r.x, y0: r.y, x1: r.x + r.w, y1: r.y + r.h, k: 'card' }); sat(G); }

  // ---------------------------------------------------------------- subjects
  let KF = null, KFn = -1;
  function kfIndex() {
    const g = store.getState(); const keys = Object.keys(g.placementsByTick); if (KF && KFn === keys.length) return KF;
    KF = {}; keys.map(Number).sort((a, b) => a - b).forEach((t) => g.placementsByTick[t].forEach((p) => { (KF[p.unit_id] ||= []).push({ t, lng: p.lng, lat: p.lat }); })); KFn = keys.length; return KF;
  }
  function latest(id, tick) { const a = kfIndex()[id]; if (!a) return null; let lo = 0, hi = a.length - 1, r = null; while (lo <= hi) { const m = (lo + hi) >> 1; if (a[m].t <= tick) { r = a[m]; lo = m + 1; } else hi = m - 1; } return r; }
  function subjects(ids, tick) {
    const g = store.getState(); const cv = document.querySelector('canvas[style*="z-index: 10"]'); const cr = cv.getBoundingClientRect(); const res = [];
    for (const id of ids) {
      const p = latest(id, tick); if (!p) continue; const pt = map.project([p.lng, p.lat]); res.push({ id, x: pt.x + cr.left, y: pt.y + cr.top });
    }
    // snap each to the nearest drawn tile
    const cap = (window.__cap && window.__cap.cur) || []; const A = area();
    const dock = (() => { const d = document.getElementById('gt-timeline') || document.querySelector('.gtbg-m-dock'); return d ? d.getBoundingClientRect().top : A.y1; })();
    return res.map((s) => { let best = null, bd = 1e9; for (const t of cap) { if (!(t.k === 'body' || t.k === 'art' || t.k === 'skirm')) continue; const cx = (t.x0 + t.x1) / 2 + A.x0, cy = (t.y0 + t.y1) / 2 + A.y0; const d = Math.hypot(cx - s.x, cy - s.y); if (d < bd) { bd = d; best = t; } } return bd < 40 && best ? { ...s, tile: { pts: best.pts ? best.pts.map(([x, y]) => [x + A.x0, y + A.y0]) : [[best.x0 + A.x0, best.y0 + A.y0], [best.x1 + A.x0, best.y0 + A.y0], [best.x1 + A.x0, best.y1 + A.y0], [best.x0 + A.x0, best.y1 + A.y0]], cx: (best.x0 + best.x1) / 2 + A.x0, cy: (best.y0 + best.y1) / 2 + A.y0 } } : { ...s, tile: null }; }).filter((s) => s.tile && s.x > A.x0 && s.x < A.x1 && s.y > A.y0 && s.y < Math.min(A.y1, dock - 6));
  }

  // ---------------------------------------------------------------- content (existing text, existing meaning)
  const words = (s) => (s || '').trim().split(/\s+/).filter(Boolean).length;
  const clk = (tick) => { try { return CLOCK ? CLOCK.f(tick, TOKENS.clockStyle) : null; } catch (e) { return null; } };
  function cardsFor(tick) {
    const out = [];
    const evs = (DATA.byTick[tick] || []);
    evs.forEach((e) => out.push({ key: 'e' + e.tick + ':' + e.event.slice(0, 12), kind: 'event', tier: e.significance === 'critical' ? 'A' : 'B', sig: e.significance, tick, text: e.event, subj: e.units_involved || [], head: e.significance.toUpperCase(), words: words(e.event) }));
    DATA.vg.filter((v) => tick >= v.trigger_tick && tick <= v.trigger_tick + 2).forEach((v) => out.push({ key: 'v' + v.vignette_id, kind: 'story', tier: 'A', sig: 'critical', tick, title: v.title, text: v.panel_summary, subj: v.units_featured || [], loc: v.trigger_location, ll: [v.trigger_lng, v.trigger_lat], head: 'STORY', words: words(v.panel_summary) }));
    return out;
  }
  function chipsFor(from, to) {
    if (to < from || to - from > 3) return [];   // a seek is not an event: no stale toasts
    return DATA.sc.filter((s) => s.approx_tick > from && s.approx_tick <= to).map((s) => ({ key: 'c' + s.event_id, kind: 'chip', tier: 'C', sig: /kia|killed|mortally/i.test(s.cause || '') ? 'critical' : /wound|captur/i.test((s.cause || '') + s.event) ? 'high' : 'medium', tick: s.approx_tick, text: s.event, title: (s.from_commander || '').replace(/^(Major General|Brigadier General|Colonel|Lieutenant Colonel|General) /, ''), subj: [s.unit_id] }));
  }

  // ---------------------------------------------------------------- render
  function html(c, f) {
    const cl = clk(c.tick); const tm = `<span class="pc-t">${esc(cl || '')}${cl ? '<i>Modelled</i>' : ''}</span>`;
    if (f.chip) return c.kind === 'chip' ? `<b>${esc(c.title)}</b><span>${esc(c.text)}</span>` : c.kind === 'story' ? `<b>STORY</b><span>${esc(c.title)}</span>` : `<b>${c.head}</b><span>${esc(c.text.length > 70 ? c.text.slice(0, 68).replace(/\s+\S*$/, '') + '…' : c.text)}</span>`;
    if (c.kind === 'event') return `<div class="pc-h"><span class="pc-sig">${c.head}</span>${tm}</div><div class="pc-b" style="-webkit-line-clamp:unset;display:block">${esc(c.text)}</div>`;
    return `<div class="pc-h"><span class="pc-sig">${c.head}</span>${tm}</div><div class="pc-title">${esc(c.title)}</div><div class="pc-b" style="-webkit-line-clamp:${f.lines || 3}">${esc(c.text)}</div><div class="pc-foot"><span>Read the full story</span><span>${esc(c.loc || '')}</span></div>`;
  }
  function build(c) {
    const col = TOKENS.sig[c.sig] || '#8b6914';
    const el = $('div', 'pc', `--c:${col};--mv:${TOKENS.motion.move}ms;--en:${TOKENS.motion.enter}ms;--ex:${TOKENS.motion.exit}ms;--ease:${TOKENS.motion.ease};left:-999px;top:0`);
    layer.appendChild(el); c.el = el; c.form = null; return el;
  }
  // apply one form of the ladder (only when it changes) and measure its natural size once per form
  function apply(c, fi) {
    if (c.applied === fi) return; const f = TOKENS.forms[c.kind][fi]; const phone = document.documentElement.getAttribute('data-layout') === 'mobile'; const el = c.el;
    el.className = 'pc' + (f.chip ? ' pc-chip' : '') + (c.placedOnce && c.visible ? ' in' : ''); el.style.height = ''; el.innerHTML = html(c, f);
    const w = f.chip ? Math.min(f.chip, innerWidth - 16) : (phone ? Math.min(TOKENS.forms.phoneW, innerWidth - 16) : f.w); el.style.width = w + 'px'; if (f.chip) el.style.height = '44px'; c.applied = fi;
  }
  function dims(c, fi) {
    c.sh = c.sh || []; if (c.sh[fi]) return c.sh[fi];
    const keep = c.applied; apply(c, fi); const r = c.el.getBoundingClientRect(); c.sh[fi] = { w: Math.round(r.width), h: Math.ceil(r.height) };
    if (keep !== undefined && keep !== fi) apply(c, keep); return c.sh[fi];
  }
  const esc = (s) => String(s).replace(/[&<>]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
  function safeRect() { const A = area(); const d = document.getElementById('gt-timeline') || document.querySelector('.gtbg-m-dock'); const lane = document.getElementById('pr-lane'); const bottom = Math.min(d ? d.getBoundingClientRect().top : A.y1, lane ? lane.getBoundingClientRect().top : 1e9, A.y1); return { x0: A.x0 + 14, y0: A.y0 + 14, x1: A.x1 - 14, y1: bottom - 20 }; }
  function rectEdgePoint(r, px, py) { const cx = r.x + r.w / 2, cy = r.y + r.h / 2; const dx = px - cx, dy = py - cy; const sx = (r.w / 2) / (Math.abs(dx) || 1e-6), sy = (r.h / 2) / (Math.abs(dy) || 1e-6); const s = Math.min(sx, sy); return [cx + dx * s, cy + dy * s]; }
  function nearestOnPoly(pts, px, py) { let best = null, bd = 1e12; for (let i = 0; i < pts.length; i++) { const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % pts.length]; const dx = x2 - x1, dy = y2 - y1; const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy || 1))); const x = x1 + t * dx, y = y1 + t * dy; const d = Math.hypot(x - px, y - py); if (d < bd) { bd = d; best = [x, y]; } } return best; }

  // ---- solve: place the cards (heavy part: occupancy grid + ladder); runs on tick change, camera move, and every ~66 ms while playing
  function solve() {
    raf = 0; if (!P.on || !DATA || TOKENS.noSolve) return; dirty = false; lastSolve = performance.now(); const L0 = lastSolve;
    const T1 = performance.now(); const G = grid(); const T2 = performance.now(); sat(G); const T3 = performance.now(); P.stats.ph = P.stats.ph || { grid: [], sat: [], rest: [] }; P.stats.ph.grid.push(T2 - T1); P.stats.ph.sat.push(T3 - T2);
    const now = performance.now();
    for (const [k, c] of P.cards) if (now > c.until) { (P.stats.life ||= []).push({ kind: c.kind, tier: c.tier, words: c.words || 0, ms: Math.round(now - c.t0) }); c.el.classList.remove('in'); c.el.classList.add('out'); setTimeout(() => c.el.remove(), TOKENS.motion.exit + 40); P.cards.delete(k); }
    const live = [...P.cards.values()].sort((a, b) => ({ story: 0, event: 1, chip: 2 }[a.kind] - { story: 0, event: 1, chip: 2 }[b.kind]));
    if (document.documentElement.getAttribute('data-layout') === 'mobile') { phoneLane(live, G); P.stats.layoutMs.push(performance.now() - L0); draw(); return; }
    for (const c of live) {
      const subs = subjects(c.subj, c.tick);
      let ax, ay;
      if (subs.length) { ax = subs.reduce((a, s) => a + s.tile.cx, 0) / subs.length; ay = subs.reduce((a, s) => a + s.tile.cy, 0) / subs.length; c.anchorKind = 'tile'; }
      else if (c.ll) { const pt = map.project(c.ll); const A = G.A; ax = pt.x + A.x0; ay = pt.y + A.y0; c.anchorKind = 'place'; const sr = safeRect(); c.off = ax < sr.x0 || ax > sr.x1 || ay < sr.y0 || ay > sr.y1; ax = Math.max(sr.x0, Math.min(sr.x1, ax)); ay = Math.max(sr.y0, Math.min(sr.y1, ay)); }
      else { ax = (G.A.x0 + G.A.x1) / 2; ay = G.A.y1 - 120; c.anchorKind = 'none'; }
      c.ax = ax; c.ay = ay;
      const ladder = TOKENS.forms[c.kind]; let r = null, used = -1;
      for (let fi = 0; fi < ladder.length && !r; fi++) {
        const f = ladder[fi]; const sz = dims(c, fi);
        if (!f.chip && sz.h > TOKENS.forms.maxH) continue;
        const prev = c.formIdx === fi ? c.rect : null;
        r = place(G, sz.w, sz.h, ax, ay, prev); if (r) { used = fi; c.w = sz.w; c.h = sz.h; }
      }
      if (!r) { P.stats.noRoom++; c.el.style.opacity = 0; c.rect = null; c.formIdx = -1; continue; }
      if (ladder[used].chip) P.stats.chipFallback++;
      P.stats.forms = P.stats.forms || {}; const fk = c.kind + ':' + (ladder[used].chip ? 'chip' : ladder[used].w); P.stats.forms[fk] = (P.stats.forms[fk] || 0) + 1;
      c.formIdx = used; apply(c, used);
      const moved = c.rect && (Math.abs(c.rect.x - r.x) > 1 || Math.abs(c.rect.y - r.y) > 1); if (moved) P.stats.moves++;
      c.rect = r;
      if (!c.placedOnce) { c.el.style.transition = 'none'; c.el.style.left = r.x + 'px'; c.el.style.top = r.y + 'px'; void c.el.offsetWidth; c.el.style.transition = ''; c.placedOnce = true; c.el.style.opacity = ''; requestAnimationFrame(() => { c.el.classList.add('in'); c.visible = true; }); }
      else if (moved) { c.el.classList.remove('in'); clearTimeout(c.mvT); c.mvT = setTimeout(() => { c.el.style.transition = 'none'; c.el.style.left = c.rect.x + 'px'; c.el.style.top = c.rect.y + 'px'; void c.el.offsetWidth; c.el.style.transition = ''; c.el.classList.add('in'); c.visible = true; }, TOKENS.motion.exit); }
      else { c.el.style.opacity = ''; c.el.classList.add('in'); }
      reserve(G, { x: r.x, y: r.y, w: r.w, h: r.h });
      P.stats.placed++;
    }
    P.stats.layoutMs.push(performance.now() - L0); P.stats.ph.rest.push(performance.now() - T3);
    draw();
  }
  // ---- draw: leader lines and tile outlines on a 2D canvas, every frame (cheap; no DOM writes)
  function draw() {
    if (!pcv || TOKENS.noDraw) return; const D0 = performance.now(); try { draw0(); } finally { (P.stats.drawMs ||= []).push(performance.now() - D0); }
  }
  function draw0() { const dpr = devicePixelRatio || 1; if (pcv.width !== Math.round(innerWidth * dpr)) { pcv.width = Math.round(innerWidth * dpr); pcv.height = Math.round(innerHeight * dpr); }
    const x = pcv.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, innerWidth, innerHeight);
    for (const c of P.cards.values()) {
      if (!c.rect || !c.visible) continue; const r = c.rect; const col = TOKENS.sig[c.sig] || '#c8a84a';
      const subs = c.anchorKind === 'tile' ? subjects(c.subj, c.tick) : [];
      x.lineJoin = 'round'; x.lineCap = 'round';
      subs.slice(0, 3).forEach((s, i) => {
        x.globalAlpha = i ? .5 : 1; x.strokeStyle = col; x.fillStyle = col; const poly = s.tile.pts;
        if (TOKENS.glow) { x.shadowColor = col; x.shadowBlur = 6; } x.lineWidth = 2; x.beginPath(); poly.forEach(([px, py], k) => (k ? x.lineTo(px, py) : x.moveTo(px, py))); x.closePath(); x.stroke(); x.shadowBlur = 0;
        const tp = nearestOnPoly(poly, r.x + r.w / 2, r.y + r.h / 2); const cp = rectEdgePoint(r, tp[0], tp[1]);
        x.lineWidth = TOKENS.leader.width; x.beginPath(); x.moveTo(cp[0], cp[1]); x.lineTo(tp[0], tp[1]); x.stroke(); x.beginPath(); x.arc(tp[0], tp[1], TOKENS.leader.dot, 0, 6.2832); x.fill();
      });
      if (c.anchorKind === 'place') { const pt = map.project(c.ll); const A = area(); let ax = pt.x + A.x0, ay = pt.y + A.y0; const sr = safeRect(); const off = ax < sr.x0 || ax > sr.x1 || ay < sr.y0 || ay > sr.y1; const tx = Math.max(sr.x0, Math.min(sr.x1, ax)), ty = Math.max(sr.y0, Math.min(sr.y1, ay)); const cp = rectEdgePoint(r, tx, ty); x.globalAlpha = 1; x.strokeStyle = col; x.fillStyle = col; x.lineWidth = TOKENS.leader.width; x.setLineDash([3, 4]); x.beginPath(); x.moveTo(cp[0], cp[1]); x.lineTo(tx, ty); x.stroke(); x.setLineDash([]); if (off) { const ang = Math.atan2(ay - ty, ax - tx); x.beginPath(); x.moveTo(tx + Math.cos(ang) * 10, ty + Math.sin(ang) * 10); x.lineTo(tx + Math.cos(ang + 2.5) * 8, ty + Math.sin(ang + 2.5) * 8); x.lineTo(tx + Math.cos(ang - 2.5) * 8, ty + Math.sin(ang - 2.5) * 8); x.closePath(); x.fill(); } else { x.beginPath(); x.arc(tx, ty, 5, 0, 6.2832); x.lineWidth = 2; x.stroke(); } }
    }
    x.globalAlpha = 1;
  }
  // ---- phone: no free ground exists (measured), so the lane is part of the layout: the map container ends above it
  let lane = null, laneApplied = false;
  function phoneLane(live, G) {
    const dock = document.querySelector('.gtbg-m-dock'); const mapEl = document.querySelector('.gtbg-m-map'); if (!dock || !mapEl) return;
    const dh = dock.getBoundingClientRect().height;
    if (!laneApplied) { mapEl.style.bottom = `calc(var(--gt-dock) + var(--gt-sab) + 52px)`; laneApplied = true; setTimeout(() => { try { map.resize(); } catch (e) { /* */ } schedule(); }, 30); }
    if (!lane) { lane = $('div'); lane.id = 'pr-lane'; layer.appendChild(lane); }
    lane.style.bottom = (innerHeight - dock.getBoundingClientRect().top + 8) + 'px';
    const top = live.filter((c) => c.kind !== 'chip' || true).sort((a, b) => ({ A: 0, B: 1, C: 2 }[a.tier] - { A: 0, B: 1, C: 2 }[b.tier]) || b.t0 - a.t0)[0];
    for (const c of live) { c.el.style.display = c === top ? '' : 'none'; if (c !== top) c.rect = null; }
    if (!top) return;
    if (top.el.parentNode !== lane) lane.appendChild(top.el);
    const fi = TOKENS.forms[top.kind].length - 1; if (top.applied !== fi) { top.formIdx = fi; apply(top, fi); top.el.style.width = ''; top.el.style.left = ''; top.el.style.top = ''; }
    const n = live.length - 1; let cnt = top.el.querySelector('.pc-n'); if (n > 0) { if (!cnt) { cnt = document.createElement('span'); cnt.className = 'pc-n'; top.el.appendChild(cnt); } if (cnt.textContent !== '+' + n) cnt.textContent = '+' + n; } else if (cnt) cnt.remove();
    top.el.classList.add('in'); top.visible = true; top.placedOnce = true;
    const r = lane.getBoundingClientRect(); top.rect = { x: r.left, y: r.top, w: r.width, h: r.height };
    const subs = subjects(top.subj, top.tick);
    if (subs.length) { top.anchorKind = 'tile'; top.ax = subs[0].tile.cx; top.ay = subs[0].tile.cy; } else if (top.ll) { top.anchorKind = 'place'; } else top.anchorKind = 'none';
    P.stats.placed++; P.stats.forms = P.stats.forms || {}; P.stats.forms['lane'] = (P.stats.forms['lane'] || 0) + 1;
  }
  let lastSolve = 0, pcv = null;
  const schedule = () => { dirty = true; if (!raf) raf = requestAnimationFrame(() => requestAnimationFrame(solve)); };   // after the unit canvas has drawn this frame
  function admit(list, tier) {
    const now = performance.now();
    for (const c of list) {
      if (P.cards.has(c.key)) continue;
      const cap = TOKENS.maxCards[c.kind] || 1; const same = [...P.cards.values()].filter((x) => x.kind === c.kind);
      if (same.length >= cap) { const old = same.sort((a, b) => a.t0 - b.t0)[0]; if (old.tier === 'A' && c.tier !== 'A') continue; old.until = now; }   // newer replaces older; a chip never evicts a tier A card
      const d = c.kind === 'chip' ? TOKENS.dwell.chip : c.tier === 'A' ? TOKENS.dwell.tierA : TOKENS.dwell.tierB;
      c.t0 = now; c.until = now + Math.max(d[0], Math.min(d[1], (c.words || 8) * TOKENS.dwell.msPerWord + 1500));
      build(c); P.cards.set(c.key, c);
    }
  }
  function onTick(tick) {
    const prev = lastTick; lastTick = tick;
    if (prev !== null && Math.abs(tick - prev) > 3) { for (const c of P.cards.values()) c.until = 0; }        // jump hygiene: clear what belongs to the old place
    admit(cardsFor(tick)); if (prev !== null) admit(chipsFor(prev, tick));
    schedule();
  }

  P.start = async (entry) => {
    if (P.on) return; DATA = await load();
    store = window.__store; map = window.__t0map;
    try { if (window.GTBGTime) CLOCK = window.GTBGTime; } catch (e) { /* none */ }
    const st = $('style'); st.id = 'pr-css'; st.textContent = css; document.head.appendChild(st);
    layer = $('div'); layer.id = 'pr-layer'; pcv = document.createElement('canvas'); pcv.id = 'pr-svg'; pcv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%'; layer.appendChild(pcv); document.body.appendChild(layer);
    P.on = true; lastTick = store.getState().currentTick;
    store.subscribe((s, p) => { if (s.currentTick !== p.currentTick) onTick(s.currentTick); });
    map.on('move', () => { if (performance.now() - lastSolve > 66) schedule(); else draw(); }); map.on('resize', schedule);
    const loop = () => { if (P.on) { const pl = store.getState().isPlaying; if (pl && performance.now() - lastSolve > 66) schedule(); else if (P.cards.size) draw(); requestAnimationFrame(loop); } }; requestAnimationFrame(loop);
    onTick(store.getState().currentTick);
  };
  P.dbg = () => ({ els: findOverlayEls().map((e) => (e.id || e.className || e.tagName) + ':' + (e.textContent || '').slice(0, 24)), rects: overlayRects() });
  P.stop = () => { P.on = false; layer && layer.remove(); document.getElementById('pr-css') && document.getElementById('pr-css').remove(); P.cards.clear(); };
  P.settle = () => { for (const c of P.cards.values()) c.until = performance.now() + 1e7; solve(); };   // measurement mode: keep what is up, lay it out now
  P.clear = () => { for (const c of P.cards.values()) { c.el.remove(); } P.cards.clear(); if (pcv) pcv.getContext('2d').clearRect(0, 0, pcv.width, pcv.height); };
})();
