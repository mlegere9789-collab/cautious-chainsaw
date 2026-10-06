// In-page measurement API + Node-side coverage maths for the popups study.
import { sleep, mapView } from './h.mjs';

export async function install(page, entry) {
  await page.evaluate(async (e) => { const ns = await import(e); window.__store = ns.u; return true; }, entry);
  await mapView(page); // sets window.__t0map
  await page.evaluate(() => {
    const R = (el, name) => {
      if (!el) return null;
      const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.05 || r.width < 2 || r.height < 2) return null;
      return { name, x: r.left, y: r.top, w: r.width, h: r.height, z: parseInt(cs.zIndex, 10) || 0 };
    };
    window.__m = {
      popups() {
        const out = [];
        for (const el of document.querySelectorAll('[data-gtbg-card]')) out.push(R(el, { 1: 'event', 2: 'story', 3: 'tour', 4: 'mon' }[el.getAttribute('data-gtbg-card')]));
        document.querySelectorAll('[role="log"][aria-label="Battle events"] > div').forEach((el) => out.push(R(el, 'toast')));
        document.querySelectorAll('.pc').forEach((el) => out.push(R(el, 'proto')));
        out.push(R(document.getElementById('gt-unit-panel'), 'unitpanel'));
        out.push(R(document.querySelector('[role="group"][aria-label="Legend"]'), 'legend'));
        out.push(R(document.getElementById('extra-features'), 'extrafeatures'));
        out.push(R(document.getElementById('gt-timeline'), 'timeline'));
        out.push(R(document.querySelector('.mapboxgl-ctrl-top-right'), 'navctrl'));
        out.push(R(document.querySelector('.mapboxgl-ctrl-attrib'), 'attrib'));
        // un-named floating panels of the app
        document.querySelectorAll('#root *').forEach((el) => {
          const t = (el.innerText || '').trim();
          if (!el.children.length && !/^(OVERVIEW|Trails|NPS|July \d, 1863)/.test(t) && !/(NPS Auto Tour)/.test(t)) return;
          const cs = getComputedStyle(el);
          if (cs.position !== 'absolute' && cs.position !== 'fixed') return;
          if (/^OVERVIEW/.test(t) && el.querySelector('canvas')) out.push(R(el, 'minimap'));
          else if (/^July \d, 1863/.test(t) && parseInt(cs.zIndex, 10) === 88) out.push(R(el, 'hud'));
          else if (/Trails (ON|OFF)/.test(t) && el.tagName === 'BUTTON') out.push(R(el, 'trailsbtn'));
          else if (/NPS Auto Tour/.test(t) && el.tagName === 'BUTTON') out.push(R(el, 'tourbtn'));
        });
        // toolbar (48 px bar, z 100, first absolute child of the app root with the title)
        document.querySelectorAll('#root > div > div').forEach((el) => { if (/^GETTYSBURG/.test((el.innerText || '').trim()) && el.getBoundingClientRect().height <= 60) out.push(R(el, 'toolbar')); });
        // phone layout
        out.push(R(document.querySelector('.gtbg-m-legend'), 'mlegend'));
        out.push(R(document.querySelector('.gtbg-m-mini'), 'mminimap'));
        out.push(R(document.querySelector('.gtbg-m-popup'), 'munitpopup'));
        out.push(R(document.querySelector('.gtbg-m-top'), 'mtop'));
        out.push(R(document.querySelector('.gtbg-m-days'), 'mdays'));
        out.push(R(document.querySelector('.gtbg-m-dock'), 'timeline'));
        // legend FAB when the legend is closed
        document.querySelectorAll('button[title="Show legend"]').forEach((el) => out.push(R(el, 'legendfab')));
        document.querySelectorAll('button[title="Show minimap"]').forEach((el) => out.push(R(el, 'minimapfab')));
        return out.filter(Boolean);
      },
      tiles() {
        const cv = document.querySelector('canvas[style*="z-index: 10"]'); if (!cv) return { tiles: [], labels: [], dots: [] };
        const cr = cv.getBoundingClientRect(); const cur = window.__cap.cur || [];
        const sh = (r) => ({ k: r.k, x0: r.x0 + cr.left, y0: r.y0 + cr.top, x1: r.x1 + cr.left, y1: r.y1 + cr.top, text: r.text, pts: r.pts ? r.pts.map(([x, y]) => [x + cr.left, y + cr.top]) : undefined });
        return { tiles: cur.filter((r) => r.k === 'body' || r.k === 'art' || r.k === 'skirm').map(sh), labels: cur.filter((r) => r.k === 'label').map(sh), dots: cur.filter((r) => r.k === 'dot').map(sh), canvas: { x: cr.left, y: cr.top, w: cr.width, h: cr.height } };
      },
      subjectPositions(ids, tick) {
        const g = window.__store.getState(); const cv = document.querySelector('canvas[style*="z-index: 10"]'); const cr = cv.getBoundingClientRect(); const map = window.__t0map;
        const out = [];
        for (const id of ids) {
          let p = null;
          for (let t = tick; t >= 1 && !p; t--) { const a = g.placementsByTick[t]; if (a) p = a.find((q) => q.unit_id === id) || null; }
          if (!p) { out.push({ id, onField: false }); continue; }
          const pt = map.project([p.lng, p.lat]);
          out.push({ id, onField: true, x: pt.x + cr.left, y: pt.y + cr.top, lng: p.lng, lat: p.lat, strength: p.strength, disposition: p.disposition });
        }
        return out;
      },
      snap(ids) {
        const g = window.__store.getState(); const t = this.tiles();
        return { tick: g.currentTick, zoom: window.__t0map.getZoom(), center: window.__t0map.getCenter(), vw: innerWidth, vh: innerHeight, ...t, popups: this.popups(), subjects: ids ? this.subjectPositions(ids, g.currentTick) : [] };
      },
    };
  });
}

export const setTick = (page, t) => page.evaluate((t) => window.__store.getState().setTick(t), t);
export const setCam = (page, lng, lat, zoom) => page.evaluate(([lng, lat, zoom]) => { window.__t0map.jumpTo({ center: [lng, lat], zoom }); }, [lng, lat, zoom]);
export const snap = (page, ids) => page.evaluate((ids) => window.__m.snap(ids), ids || null);

// ---------- geometry
const polyArea = (p) => { let a = 0; for (let i = 0; i < p.length; i++) { const [x1, y1] = p[i], [x2, y2] = p[(i + 1) % p.length]; a += x1 * y2 - x2 * y1; } return Math.abs(a) / 2; };
function clipPoly(poly, r) { // Sutherland-Hodgman against an axis-aligned rect
  const edges = [[(p) => p[0] >= r.x0, (a, b) => { const t = (r.x0 - a[0]) / (b[0] - a[0]); return [r.x0, a[1] + t * (b[1] - a[1])]; }], [(p) => p[0] <= r.x1, (a, b) => { const t = (r.x1 - a[0]) / (b[0] - a[0]); return [r.x1, a[1] + t * (b[1] - a[1])]; }], [(p) => p[1] >= r.y0, (a, b) => { const t = (r.y0 - a[1]) / (b[1] - a[1]); return [a[0] + t * (b[0] - a[0]), r.y0]; }], [(p) => p[1] <= r.y1, (a, b) => { const t = (r.y1 - a[1]) / (b[1] - a[1]); return [a[0] + t * (b[0] - a[0]), r.y1]; }]];
  let out = poly;
  for (const [inside, cut] of edges) { const inp = out; out = []; for (let i = 0; i < inp.length; i++) { const a = inp[i], b = inp[(i + 1) % inp.length]; const ia = inside(a), ib = inside(b); if (ia && ib) out.push(b); else if (ia && !ib) out.push(cut(a, b)); else if (!ia && ib) { out.push(cut(a, b)); out.push(b); } } if (!out.length) return []; }
  return out;
}
const clipRect = (poly, r) => { const o = clipPoly(poly, r); return o.length ? polyArea(o) : 0; };
export const inter = (a, b) => { const x0 = Math.max(a.x0, b.x0), y0 = Math.max(a.y0, b.y0), x1 = Math.min(a.x1, b.x1), y1 = Math.min(a.y1, b.y1); if (!(x1 > x0 && y1 > y0)) return 0; if (a.pts) return clipRect(a.pts, b); if (b.pts) return clipRect(b.pts, a); return (x1 - x0) * (y1 - y0); };
export const area = (a) => (a.pts ? polyArea(a.pts) : (a.x1 - a.x0) * (a.y1 - a.y0));
export const P2R = (p) => ({ x0: p.x, y0: p.y, x1: p.x + p.w, y1: p.y + p.h });
export const TRANSIENT = new Set(['event', 'story', 'toast', 'tour', 'mon']);
export const PERSIST = new Set(['hud', 'legend', 'legendfab', 'minimap', 'minimapfab', 'extrafeatures', 'trailsbtn', 'tourbtn', 'navctrl', 'attrib', 'unitpanel']);
// map viewport = the canvas area minus the timeline dock and toolbar (canvas top is under the 48 px toolbar already)
export function mapArea(s) { return { x0: s.canvas.x, y0: s.canvas.y, x1: s.canvas.x + s.canvas.w, y1: s.canvas.y + s.canvas.h }; }
const ptsOf = (t) => t.pts || [[t.x0, t.y0], [t.x1, t.y0], [t.x1, t.y1], [t.x0, t.y1]];
function clipTile(t, A) { const c = clipPoly(ptsOf(t), A); if (!c.length || polyArea(c) < 4) return null; const xs = c.map((p) => p[0]), ys = c.map((p) => p[1]); return { ...t, pts: c, x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) }; }

/** coverage of one snapshot: which tiles/labels are overlapped by which popup class */
export function coverage(s, { names = null } = {}) {
  const A = mapArea(s);
  const vis = s.tiles.map((t) => clipTile(t, A)).filter(Boolean);
  const lab = s.labels.map((t) => clipTile(t, A)).filter(Boolean);
  const pops = s.popups.filter((p) => p.name !== 'toolbar' && (!names || names.has(p.name))).map((p) => ({ name: p.name, ...P2R(p) }));
  const res = { tick: s.tick, zoom: +s.zoom.toFixed(2), tilesVisible: vis.length, labelsVisible: lab.length, byPopup: {}, anyTiles: 0, anyHalf: 0, anyLabels: 0, subjCovered: 0, subjTotal: 0, subjDetail: [] };
  const hitTiles = new Set(), hitHalf = new Set(), hitLabels = new Set();
  for (const p of pops) {
    const b = (res.byPopup[p.name] ||= { tiles: 0, tilesHalf: 0, labels: 0 });
    vis.forEach((t, i) => { const a = inter(t, p); if (a > 0) { b.tiles++; hitTiles.add(i); if (a / Math.max(1, area(t)) >= 0.5) { b.tilesHalf++; hitHalf.add(i); } } });
    lab.forEach((t, i) => { if (inter(t, p) > 0) { b.labels++; hitLabels.add(i); } });
  }
  res.anyTiles = hitTiles.size; res.anyHalf = hitHalf.size; res.anyLabels = hitLabels.size;
  for (const sub of s.subjects || []) {
    if (!sub.onField) continue;
    // nearest captured tile to the projected centre
    let best = null, bd = 1e9;
    for (const t of vis) { const cx = (t.x0 + t.x1) / 2, cy = (t.y0 + t.y1) / 2; const d = Math.hypot(cx - sub.x, cy - sub.y); if (d < bd) { bd = d; best = t; } }
    if (!best || bd > 40) { res.subjDetail.push({ id: sub.id, inView: false }); continue; }
    res.subjTotal++;
    const by = pops.filter((p) => inter(best, p) > 0).map((p) => p.name);
    const frac = pops.reduce((m, p) => Math.max(m, inter(best, p) / Math.max(1, area(best))), 0);
    if (by.length) res.subjCovered++;
    res.subjDetail.push({ id: sub.id, inView: true, coveredBy: by, maxFrac: +frac.toFixed(2) });
  }
  return res;
}

// ---------- free space: where could a card of w x h px go without touching a tile, a label, a dot or a persistent overlay?
export function freeSpace(s, { obstacleNames, sizes = {}, cell = 6 } = {}) {
  const A = mapArea(s); const W = Math.ceil((A.x1 - A.x0) / cell), H = Math.ceil((A.y1 - A.y0) / cell);
  const occ = new Uint8Array(W * H);
  const mark = (x0, y0, x1, y1, pts) => {
    const i0 = Math.max(0, Math.floor((x0 - A.x0) / cell)), i1 = Math.min(W - 1, Math.floor((x1 - A.x0) / cell));
    const j0 = Math.max(0, Math.floor((y0 - A.y0) / cell)), j1 = Math.min(H - 1, Math.floor((y1 - A.y0) / cell));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      if (pts) { // cell overlaps polygon? test the cell centre against the polygon grown by half a cell
        const cx = A.x0 + (i + 0.5) * cell, cy = A.y0 + (j + 0.5) * cell; if (!pip(pts, cx, cy, cell * 0.75)) continue;
      }
      occ[j * W + i] = 1;
    }
  };
  for (const t of s.tiles) { const c = clipTile(t, A); if (c) mark(c.x0, c.y0, c.x1, c.y1, c.pts); }
  for (const t of [...s.labels, ...s.dots]) mark(t.x0, t.y0, t.x1, t.y1, null);
  for (const p of s.popups) if (obstacleNames.has(p.name)) mark(p.x, p.y, p.x + p.w, p.y + p.h, null);
  // summed-area table
  const S = new Int32Array((W + 1) * (H + 1));
  for (let j = 0; j < H; j++) { let row = 0; for (let i = 0; i < W; i++) { row += occ[j * W + i]; S[(j + 1) * (W + 1) + i + 1] = S[j * (W + 1) + i + 1] + row; } }
  const sum = (i0, j0, i1, j1) => S[(j1) * (W + 1) + i1] - S[j0 * (W + 1) + i1] - S[(j1) * (W + 1) + i0] + S[j0 * (W + 1) + i0];
  const fits = (w, h) => { const cw = Math.ceil(w / cell), ch = Math.ceil(h / cell); for (let j = 0; j + ch <= H; j++) for (let i = 0; i + cw <= W; i++) if (sum(i, j, i + cw, j + ch) === 0) return true; return false; };
  // largest empty rectangle (histogram)
  const hist = new Int32Array(W); let best = { area: 0, w: 0, h: 0 };
  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) hist[i] = occ[j * W + i] ? 0 : hist[i] + 1;
    const st = [];
    for (let i = 0; i <= W; i++) { const h = i === W ? 0 : hist[i]; let start = i; while (st.length && st[st.length - 1][1] >= h) { const [si, sh] = st.pop(); const a = sh * (i - si); if (a > best.area) best = { area: a, w: (i - si) * cell, h: sh * cell }; start = si; } st.push([start, h]); }
  }
  const out = { occupiedShare: +(occ.reduce((a, b) => a + b, 0) / occ.length).toFixed(3), largest: best };
  for (const [k, [w, h]] of Object.entries(sizes)) out[k] = fits(w, h);
  return out;
}
function pip(pts, x, y, grow) { // point in convex polygon, grown by `grow`
  let sign = 0; const n = pts.length;
  for (let i = 0; i < n; i++) { const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % n]; const ex = x2 - x1, ey = y2 - y1, len = Math.hypot(ex, ey) || 1; const cr = (ex * (y - y1) - ey * (x - x1)) / len; const s = Math.sign(cr); if (cr > -grow && cr < grow) continue; if (sign === 0) sign = s; else if (s !== sign) return false; }
  return true;
}
