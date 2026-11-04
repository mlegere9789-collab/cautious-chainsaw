// test/popups-helpers.mjs - shared by the popup tests and the popup shots: a headless engine with the real data, the host wired the way app.mjs wires it, a virtual clock, and an exact
// obstacle oracle that shares no code with the director (it reads frame.tiles and nothing else).
import { makeEngine, loadDocs } from '../src/headless.mjs';
import { createPopupHost } from '../src/popups/host.mjs';
import { POPUPS } from '../src/popups/index.mjs';
import { SKINS } from '../src/skins/index.mjs';

export const docs = () => loadDocs();
export const CHROME = { top: 64, bottom: 150, left: 0, right: 0 };

/** a ready engine + host.  opts: { w, h, zoom, tick, scene, popups (array of modules, default all), settings, chrome } */
export function rig(opts = {}) {
  const { dataset, popupData } = loadDocs(); const w = opts.w ?? 1440; const h = opts.h ?? 900;
  const scene = dataset.scenes.find((s) => s.id === (opts.scene || 'fresh2'));
  const e = makeEngine({ settings: opts.settings || {}, start: { tick: opts.tick ?? scene.tick, lat: opts.lat ?? scene.lat, lng: opts.lng ?? scene.lng, zoom: opts.zoom ?? 15 } });
  for (const s of SKINS) e.kernel.skins.register(s.id, s, { replace: true }); if (opts.skinId) e.tuning.set('skin.id', opts.skinId);
  e.setViewport(w, h); for (let i = 0; i < 20; i++) e.step(1000 / 60);
  const chrome = opts.chrome === undefined ? { rects: [], safe: CHROME } : opts.chrome;
  const host = createPopupHost(e, { popupData, size: { w, h }, chrome: () => chrome, systemReduced: () => !!opts.reduced });
  for (const p of opts.popups || POPUPS) e.kernel.popups.register(p.id, p, { replace: true });
  const R = { e, host, now: 1e6, dt: opts.dt ?? 1000 / 60, out: null, outs: [] };
  R.step = (n = 1, dt = R.dt) => { for (let i = 0; i < n; i++) { e.step(dt, { rawDtMs: dt }); R.now += dt; R.out = host.frame(e.frame, R.now, dt); } return R.out; };
  R.seek = (tick, frames = 14, dt = 50) => { e.transport.pause(); e.transport.seek(tick, { glide: false }); return R.step(frames, dt); };
  R.cards = () => R.out.cards.filter((c) => c.kind !== 'doc');
  return R;
}

/** ALL the ink of a frame as exact rectangles, written independently of popups/host.mjs: chips, labels, pins, the leader box of a displaced tile, aggregate member dots; tiles above `minOp` */
export function oracleObstacles(frame, minOp = 0.2) {
  const out = []; const { dx, dy } = frame.view;
  for (const t of frame.tiles) {
    if (!(t.opacity >= minOp)) continue; const hw = (t.w * t.scale) / 2; const hh = (t.h * t.scale) / 2; const cx = t.x + dx; const cy = t.y + dy;
    out.push({ kind: 'chip', owner: t.key, x0: cx - hw, y0: cy - hh, x1: cx + hw, y1: cy + hh });
    if (t.label && t.label.opacity >= minOp) out.push({ kind: 'label', owner: t.key, x0: t.label.x0 + dx, y0: t.label.y0 + dy, x1: t.label.x1 + dx, y1: t.label.y1 + dy });
    if (t.displaced) { out.push({ kind: 'pin', owner: t.key, x0: t.ax + dx - 2, y0: t.ay + dy - 2, x1: t.ax + dx + 2, y1: t.ay + dy + 2 }); }
    if (t.kind === 'agg' && t.members) for (const m of t.members) out.push({ kind: 'dot', owner: t.key, x0: m.ax + dx - 2, y0: m.ay + dy - 2, x1: m.ax + dx + 2, y1: m.ay + dy + 2 });
  }
  return out;
}
export const hit = (a, b) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
export const rectOfCard = (c) => ({ x0: c.rect.x, y0: c.rect.y, x1: c.rect.x + c.rect.w, y1: c.rect.y + c.rect.h });

/** violations of "no visible card lies on a tile, on chrome, outside the map, or on another card" in one host output */
export function violations(R, out = R.out, chrome = CHROME) {
  const frame = R.e.frame; const obs = oracleObstacles(frame); const bad = []; const m = out.placeRect ? { w: Math.max(out.mapRect.w, out.placeRect.w), h: Math.max(out.mapRect.h, out.placeRect.h) } : out.mapRect; const placed = out.cards.filter((c) => c.rect && !c.lane && !c.hidden && c.opacity >= 0.2 && c.kind !== 'doc' && !(c.spec && c.spec.dock));      // D4 FORK (round 2): a popup that lives in the dock (the overview map) is never placed on the map
  for (const c of placed) {
    const r0 = rectOfCard(c); const r = { x0: r0.x0, x1: r0.x1, y0: r0.y0 + c.dy, y1: r0.y1 + c.dy };          // the card as DRAWN (it rises while it enters)
    for (const o of obs) if (hit(r, o)) { bad.push(`${c.id} (${c.form && c.form.id}) lies on a ${o.kind} of ${o.owner}`); break; }
    if (r.x0 < 0 || r.y0 < 0 || r.x1 > m.w + 1e-6 || r.y1 > m.h + 1e-6) bad.push(`${c.id} outside the map ${JSON.stringify(m)}`);
    if (c.kind !== 'hud' || true) { if (r.y0 < chrome.top - 1e-6 || r.y1 > m.h - chrome.bottom + 1e-6) bad.push(`${c.id} on the chrome bands`); }
  }
  for (let i = 0; i < placed.length; i++) for (let j = i + 1; j < placed.length; j++) if (hit(rectOfCard(placed[i]), rectOfCard(placed[j]))) bad.push(`${placed[i].id} overlaps ${placed[j].id}`);
  return bad;
}

/** the ticks that raise a transient popup, from the real data */
export function popupTicks() {
  const { popupData: pd } = loadDocs(); const t = new Set();
  for (const e of pd.events) if (e.sig !== 'low') t.add(e.tick); for (const s of pd.stories) t.add(s.tick); for (const s of pd.successions) t.add(s.tick);
  return [...t].sort((a, b) => a - b);
}
export const rng = (seed) => { let s = seed >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; };
