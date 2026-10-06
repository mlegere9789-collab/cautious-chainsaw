// Harness for the popups study (agent "popups"). Imports the Tranche-0 test lib read-only; everything it writes goes to tmp/pitch-anim/popups.
process.env.T0_AGENT = 'pitch-anim/popups';
process.env.T0_PORT_BASE = process.env.T0_PORT_BASE || '9520';
process.env.T0_TILE_CAP = process.env.T0_TILE_CAP || '300';
import path from 'node:path';
import fs from 'node:fs';

export const L = await import('../../../../tests/t0/lib.mjs');
export const { REPO, sleep, waitFor, openSession, createStaticServer, waitForApp, mapView } = L;
export const OUT = path.join(REPO, 'tmp', 'pitch-anim', 'popups', 'out');
export const SHOTS = path.join(REPO, 'docs', 'pitch', 'anim', 'shots', 'popups');
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(SHOTS, { recursive: true });

export const TREES = {
  R1c: { dir: 'release/R1c/dist', entry: '/assets/index-2531699e.js', port: 9521 },
  base: { dir: 'baseline/dist', entry: '/assets/index-Cg8FAMXN.js', port: 9522 },
  mon: { dir: 'tmp/mon-fix/mon-R1c/dist', entry: null, port: 9523 },
};

export async function serve(which) {
  const t = TREES[which];
  const srv = await createStaticServer({ root: path.join(REPO, t.dir), port: t.port + (+process.env.PORT_OFF || 0) });
  return srv;
}

// ---- init script: records what the unit canvas draws (rects in canvas px) so popups can be intersected with the real tiles
export const CAPTURE = () => {
  try {
    const proto = CanvasRenderingContext2D.prototype;
    const W = (window.__cap = { frames: 0, cur: [], on: true, bodies: [] });
    const isUnits = (ctx) => { const c = ctx.canvas; return !!(c && c.style && c.style.zIndex === '10'); };
    const O = {};
    for (const k of ['clearRect', 'fillRect', 'strokeRect', 'arc', 'fillText', 'lineTo', 'moveTo', 'save', 'restore', 'stroke', 'setLineDash']) O[k] = proto[k];
    const ident = (m) => m.a === 1 && m.b === 0 && m.c === 0 && m.d === 1 && m.e === 0 && m.f === 0;
    const box = (ctx, x, y, w, h) => {
      const m = ctx.getTransform();
      const pts = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]].map(([px, py]) => [m.a * px + m.c * py + m.e, m.b * px + m.d * py + m.f]);
      const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
      return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys), tr: !ident(m), pts };
    };
    proto.clearRect = function (...a) { if (W.on && isUnits(this) && a[2] >= this.canvas.width - 1) { W.frames++; W.cur = []; W.skirm = null; } return O.clearRect.apply(this, a); };
    proto.fillRect = function (x, y, w, h) { if (W.on && isUnits(this)) { const b = box(this, x, y, w, h); W.cur.push({ k: b.tr ? 'body' : 'labelbg', ...b }); } return O.fillRect.apply(this, arguments); };
    proto.strokeRect = function (x, y, w, h) { if (W.on && isUnits(this)) { const b = box(this, x, y, w, h); const last = W.cur[W.cur.length - 1]; const dup = last && last.k === 'body' && Math.abs(last.x0 - b.x0) < 1.5 && Math.abs(last.y0 - b.y0) < 1.5; if (b.tr && !dup) W.cur.push({ k: 'art', ...b }); } return O.strokeRect.apply(this, arguments); };
    proto.moveTo = function (x, y) { if (W.on && isUnits(this)) { const m = this.getTransform(); W._mv = ident(m) ? null : [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f]; } return O.moveTo.apply(this, arguments); };
    proto.lineTo = function (x, y) { if (W.on && isUnits(this) && W._mv) { const m = this.getTransform(); if (!ident(m)) { const q = [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f]; W.cur.push({ k: 'skirm', x0: Math.min(W._mv[0], q[0]) - 1, y0: Math.min(W._mv[1], q[1]) - 1, x1: Math.max(W._mv[0], q[0]) + 1, y1: Math.max(W._mv[1], q[1]) + 1 }); W._mv = null; } } return O.lineTo.apply(this, arguments); };
    proto.arc = function (x, y, r) { if (W.on && isUnits(this)) { W.cur.push({ k: 'dot', x0: x - r, y0: y - r, x1: x + r, y1: y + r }); } return O.arc.apply(this, arguments); };
    proto.fillText = function (t, x, y) { if (W.on && isUnits(this) && typeof t === 'string' && !/ fps$/.test(t)) { const last = W.cur[W.cur.length - 1]; if (last && last.k === 'labelbg') last.k = 'label', last.text = t; } return O.fillText.apply(this, arguments); };
  } catch (e) { /* capture is best effort */ }
};

export async function boot(which, { viewport = null, onboarded = true, tiles = 'inject', profile = which, cdpPort = 9530, url = '/', cap = true, waitMs = 0 } = {}) {
  const srv = await serve(which);
  const s = await openSession({ profile, cdpPort, viewport, onboarded, tiles, initScripts: cap ? [CAPTURE] : [] });
  const page = s.page;
  await page.goto(srv.url + url, { waitUntil: 'domcontentloaded' });
  await waitForApp(page, 40000);
  if (waitMs) await sleep(waitMs);
  return { srv, s, page, close: async () => { await s.close(); await srv.close(); } };
}

// store access through the entry module (already evaluated, so import() returns the live namespace; export `u` is the zustand hook)
export const withStore = (page, entry) => page.evaluate(async (e) => { const ns = await import(e); window.__store = ns.u; return !!ns.u.getState; }, entry);
