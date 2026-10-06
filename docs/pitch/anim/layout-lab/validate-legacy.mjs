// layout-lab/validate-legacy.mjs - does lib/legacy.mjs (my source-level port of the shipped canvas relaxation) reproduce what the REAL app draws?
// Real Chrome, the R1c build served from release/R1c/dist, deep link ?t=<tick>&z=<zoom>&ll=<lat,lng>, Mapbox tiles only through the harness Referer injection
// (tests/t0/lib.mjs, process-wide cap 300 requests).  A canvas-2D hook records every glyph the app draws (fillRect / strokeRect with a side colour) in canvas
// pixels; the same scene is predicted by the port from the placement files and the two sets are matched.   Own ports: 9601 (static server), 9602 (CDP).
//   node docs/pitch/anim/layout-lab/validate-legacy.mjs        -> out/validate-legacy.json
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
process.env.T0_AGENT = 'pitch-anim/layout'; process.env.T0_PORT_BASE = '9600'; process.env.T0_TILE_CAP = '300';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const lib = await import('../../../../tests/t0/lib.mjs');
const { createStaticServer, openSession, waitForApp, chooseLayout, mapView, waitFor, sleep, REPO } = lib;
const { loadAll, visibleAt, project } = await import('./lib/data.mjs');
const { legacyLayout, lA, legacyOrder } = await import('./lib/legacy.mjs');

const SCENES = [
  { tick: 346, z: 14, lat: 39.8189, lng: -77.2262 },
  { tick: 556, z: 13.5, lat: 39.8117, lng: -77.2347 },
  { tick: 120, z: 12, lat: 39.8189, lng: -77.2262 },
];
const all = loadAll();
const server = await createStaticServer({ root: path.join(REPO, 'release', 'R1c', 'dist'), port: 9601 });
const origin = `http://127.0.0.1:9601`;
const hook = () => {
  const cols = new Set(['#3a6bc4', '#c43a3a', '#88ccff', '#ff9944']);
  const P = CanvasRenderingContext2D.prototype; const cap = { frames: [], cur: null, canvasId: null };
  window.__cap = cap;
  const norm = (c) => String(c).toLowerCase();
  const org = { clearRect: P.clearRect, fillRect: P.fillRect, strokeRect: P.strokeRect };
  P.clearRect = function (...a) {
    if (this.canvas.width > 300 && a[2] >= this.canvas.width - 1) { if (cap.cur && cap.cur.canvas === this.canvas) { cap.frames.push(cap.cur); if (cap.frames.length > 3) cap.frames.shift(); } cap.cur = { canvas: this.canvas, w: this.canvas.width, h: this.canvas.height, glyphs: [] }; }
    return org.clearRect.apply(this, a);
  };
  const rec = function (kind, a, style) {
    if (!cap.cur || cap.cur.canvas !== this.canvas) return; if (!cols.has(norm(style))) return;
    const m = this.getTransform(); const [x, y, w, h] = a;
    cap.cur.glyphs.push({ kind, cx: m.e + m.a * (x + w / 2) + m.c * (y + h / 2), cy: m.f + m.b * (x + w / 2) + m.d * (y + h / 2), w, h });
  };
  P.fillRect = function (...a) { rec.call(this, 'fill', a, this.fillStyle); return org.fillRect.apply(this, a); };
  P.strokeRect = function (...a) { rec.call(this, 'stroke', a, this.strokeStyle); return org.strokeRect.apply(this, a); };
};
const S = await openSession({ profile: 'legacy-check', cdpPort: 9602, tiles: 'inject', viewport: { width: 1440, height: 900 }, initScripts: [hook] });
const results = [];
try {
  for (const sc of SCENES) {
    await S.page.goto(`${origin}/?t=${sc.tick}&z=${sc.z}&ll=${sc.lat},${sc.lng}`, { waitUntil: 'load' });
    await waitForApp(S.page, 45000); await chooseLayout(S.page, 'desktop');
    await waitFor(async () => { const m = await mapView(S.page); return m && Math.abs(m.zoom - sc.z) < 0.06 ? m : null; }, { timeout: 30000, label: 'camera' });
    await sleep(2500);
    const view = await mapView(S.page);
    const cap = await S.page.evaluate(() => { const f = window.__cap.frames[window.__cap.frames.length - 1]; return f ? { w: f.w, h: f.h, glyphs: f.glyphs } : null; });
    if (!cap) { results.push({ ...sc, error: 'no frame captured' }); continue; }
    // prediction by the port
    const z = view.zoom; const [cX, cY] = project(view.center[0], view.center[1], z);
    const rank = legacyOrder(all);
    const vis = visibleAt(all, sc.tick, { mode: 'hold' }); vis.sort((a, b) => rank.get(a.u.id) - rank.get(b.u.id));
    const L = legacyLayout(vis, z); const [ox, oy] = [project(-77.2377, 39.8206, z)[0], project(-77.2377, 39.8206, z)[1]];
    const pred = L.glyphs.map((g, i) => ({ id: L.pe[i].u.id, skirmish: L.pe[i].st.disposition === 'Skirmish Line' && !(L.pe[i].u.id.includes('ART') || /Artillery/.test(L.pe[i].st.disposition)), cx: g.cx - (cX - ox) + cap.w / 2, cy: g.cy - (cY - oy) + cap.h / 2, w: L.pe[i].w }));
    const appInView = cap.glyphs.filter((g) => g.cx > -200 && g.cx < cap.w + 200 && g.cy > -40 && g.cy < cap.h + 40);
    const predInView = pred.filter((g) => !g.skirmish && g.cx > -200 && g.cx < cap.w + 200 && g.cy > -40 && g.cy < cap.h + 40);
    // greedy nearest matching
    const used = new Set(); const errs = [];
    for (const g of appInView) { let best = -1; let bd = 1e9; predInView.forEach((p, i) => { if (used.has(i)) return; const d = Math.hypot(p.cx - g.cx, p.cy - g.cy); if (d < bd) { bd = d; best = i; } }); if (best >= 0) { used.add(best); errs.push(bd); } }
    errs.sort((a, b) => a - b); const q = (p) => errs.length ? errs[Math.min(errs.length - 1, Math.floor(p * (errs.length - 1)))] : null;
    const r = { ...sc, mapZoom: z, canvas: [cap.w, cap.h], appGlyphsInView: appInView.length, portGlyphsInView: predInView.length, matched: errs.length, errPx: { p50: q(0.5), p90: q(0.9), max: errs[errs.length - 1] ?? null }, within05px: errs.filter((e) => e <= 0.5).length, within2px: errs.filter((e) => e <= 2).length };
    results.push(r); console.log(JSON.stringify(r));
  }
} finally { await S.close(); await server.close?.(); }
fs.mkdirSync(path.join(HERE, 'out'), { recursive: true });
fs.writeFileSync(path.join(HERE, 'out', 'validate-legacy.json'), JSON.stringify({ generated: new Date().toISOString(), build: 'release/R1c/dist', tileRequests: S.tileStats.seen, results }, null, 1));
console.log('tile requests used:', S.tileStats.seen);
process.exit(0);
