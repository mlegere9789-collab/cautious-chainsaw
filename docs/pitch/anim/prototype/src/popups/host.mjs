// popups/host.mjs - the POPUP HOST: where everything that pops up during the animation lives.  The registry (kernel.popups) ships EMPTY: the owner keeps every existing popup and
// improves it, and each one will be registered here by the popup track.  What this host fixes for all of them at once (02-popups.md: popups covered the tiles they describe in 24 % of
// desktop moments, point at nothing, and last 33 ms at 16x):
//   * a card is placed in FREE SPACE: never over a solid chip, label or pin (the obstacle list is the tile frame itself), never off screen;
//   * a card is anchored to a tile or a point and a leader line joins them, so it points at what it describes;
//   * a placed card keeps its place until it is blocked, then glides to the next free place (no per-frame jitter of cards either).
//
//   kernel.popups.register('my-popup', {
//     label: 'My popup',
//     update(frame, api) -> [card]        called every frame; returns the cards that should be visible NOW
//   })
//   card = { key, anchor?: { tileKey } | { unitId } | { x, y } (screen px), size: { w, h }, priority?: number, render?(el) | html?: string, ttlMs?: number }
//   api  = { tok, nowMs, viewport: { w, h }, tileRect(keyOrUnitId) -> {x0,y0,x1,y1}|null, obstacles: [{x0,y0,x1,y1}] }
import { Hash } from '../layout/geom.mjs';
import { dampStep2 } from '../interp/damp.mjs';

/** the solid items of a frame as screen rectangles: chips, labels and pins (what a card must not cover) */
export function frameObstacles(frame, pad = 0) {
  const { dx, dy } = frame.view; const out = [];
  for (const t of frame.tiles) {
    if (!t.solid) continue;
    const hw = t.w * t.scale / 2; const hh = t.h * t.scale / 2; const x = t.x + dx; const y = t.y + dy;
    out.push({ x0: x - hw - pad, y0: y - hh - pad, x1: x + hw + pad, y1: y + hh + pad, owner: t.key, kind: 'chip' });
    if (t.label && t.label.opacity >= 0.5) out.push({ x0: t.label.x0 + dx - pad, y0: t.label.y0 + dy - pad, x1: t.label.x1 + dx + pad, y1: t.label.y1 + dy + pad, owner: t.key, kind: 'label' });
    if (t.displaced) out.push({ x0: t.ax + dx - 2 - pad, y0: t.ay + dy - 2 - pad, x1: t.ax + dx + 2 + pad, y1: t.ay + dy + 2 + pad, owner: t.key, kind: 'pin' });
  }
  return out;
}

/**
 * Find the free rectangle (w x h) nearest to the anchor.  Candidates are the four sides of the anchor first (right, left, below, above, each aligned and then slid), then a scan of the
 * viewport on an 8 px grid ordered by distance.  Returns { x, y } (top-left) or null when no free place exists.
 * @param {{w:number,h:number,anchor?:{x:number,y:number}|null,obstacles:{x0:number,y0:number,x1:number,y1:number}[],viewport:{w:number,h:number},margin?:number,gap?:number,avoid?:object[]}} o
 */
export function placeCard({ w, h, anchor = null, obstacles, viewport, margin = 10, gap = 6, avoid = [] }) {
  const hash = new Hash(64); for (const r of obstacles) hash.add({ ...r }); for (const r of avoid) hash.add({ ...r });
  const maxX = viewport.w - margin - w; const maxY = viewport.h - margin - h; if (maxX < margin || maxY < margin) return null;
  const free = (x, y) => {
    if (x < margin || y < margin || x > maxX || y > maxY) return false;
    let ok = true; hash.query(x - gap, y - gap, x + w + gap, y + h + gap, (o) => { if (ok && o.x0 < x + w + gap && o.x1 > x - gap && o.y0 < y + h + gap && o.y1 > y - gap) ok = false; });
    return ok;
  };
  const ax = anchor ? anchor.x : viewport.w / 2; const ay = anchor ? anchor.y : viewport.h / 2;
  const cand = [];
  const off = 14;
  for (const [dx, dy] of [[off, -h / 2], [-w - off, -h / 2], [-w / 2, off], [-w / 2, -h - off], [off, -h - 4], [off, 4], [-w - off, -h - 4], [-w - off, 4]]) cand.push([ax + dx, ay + dy]);
  const step = 8; const pts = [];
  for (let y = margin; y <= maxY; y += step) for (let x = margin; x <= maxX; x += step) pts.push([x, y, Math.hypot(x + w / 2 - ax, y + h / 2 - ay)]);
  pts.sort((p, q) => p[2] - q[2]);
  for (const [x, y] of cand) { const rx = Math.max(margin, Math.min(maxX, x)); const ry = Math.max(margin, Math.min(maxY, y)); if (free(rx, ry)) return { x: rx, y: ry }; }
  for (const [x, y] of pts) if (free(x, y)) return { x, y };
  return null;
}

/** the host: collects cards from the registered popups, places them, keeps them stable, and glides them when they must move */
export function createPopupHost(engine) {
  const placed = new Map();       // key -> { x, y, vx, vy, tx, ty, w, h, born }
  const api = (frame, nowMs) => ({
    tok: engine.tok, nowMs, viewport: { w: frame.view.w, h: frame.view.h }, obstacles: frameObstacles(frame),
    tileRect(k) {
      const t = frame.tiles.find((q) => q.key === k || q.ids.includes(k)); if (!t) return null;
      const hw = t.w * t.scale / 2; const hh = t.h * t.scale / 2; return { x0: t.x + frame.view.dx - hw, y0: t.y + frame.view.dy - hh, x1: t.x + frame.view.dx + hw, y1: t.y + frame.view.dy + hh };
    },
  });
  return {
    /** @returns {{key:string, popup:string, card:object, x:number, y:number, w:number, h:number, anchor:{x:number,y:number}|null, leader:number[]|null}[]} */
    layout(frame, nowMs, dtMs = 16.667) {
      const A = api(frame, nowMs); const out = []; const seen = new Set(); const taken = [];
      const cards = [];
      for (const def of engine.kernel.popups.list()) for (const card of def.update(frame, A) || []) cards.push({ def, card });
      cards.sort((a, b) => (b.card.priority || 0) - (a.card.priority || 0));
      for (const { def, card } of cards) {
        const key = def.id + ':' + card.key; seen.add(key);
        let anchor = null;
        if (card.anchor) { if (card.anchor.x !== undefined) anchor = { x: card.anchor.x, y: card.anchor.y }; else { const r = A.tileRect(card.anchor.tileKey || card.anchor.unitId); if (r) anchor = { x: (r.x0 + r.x1) / 2, y: (r.y0 + r.y1) / 2 }; } }
        let p = placed.get(key);
        const blocked = (q) => A.obstacles.some((o) => o.x0 < q.tx + card.size.w + 6 && o.x1 > q.tx - 6 && o.y0 < q.ty + card.size.h + 6 && o.y1 > q.ty - 6) || taken.some((o) => o.x0 < q.tx + card.size.w + 6 && o.x1 > q.tx - 6 && o.y0 < q.ty + card.size.h + 6 && o.y1 > q.ty - 6);
        if (!p || blocked(p)) {
          const spot = placeCard({ w: card.size.w, h: card.size.h, anchor, obstacles: A.obstacles, viewport: A.viewport, avoid: taken });
          if (!spot) continue;                                                       // no free place: the card waits (a queue is the popup track's decision)
          if (!p) p = { x: spot.x, y: spot.y, vx: 0, vy: 0, tx: spot.x, ty: spot.y }; else { p.tx = spot.x; p.ty = spot.y; }
          placed.set(key, p);
        }
        const pos = { x: p.x, y: p.y }; const vel = { x: p.vx, y: p.vy }; dampStep2(pos, vel, p.tx, p.ty, 0.12, dtMs / 1000); p.x = pos.x; p.y = pos.y; p.vx = vel.x; p.vy = vel.y;
        taken.push({ x0: p.tx, y0: p.ty, x1: p.tx + card.size.w, y1: p.ty + card.size.h });
        let leader = null; if (anchor) { const cx = Math.max(p.x, Math.min(p.x + card.size.w, anchor.x)); const cy = Math.max(p.y, Math.min(p.y + card.size.h, anchor.y)); leader = [anchor.x, anchor.y, cx, cy]; }
        out.push({ key, popup: def.id, card, x: p.x, y: p.y, w: card.size.w, h: card.size.h, anchor, leader });
      }
      for (const k of [...placed.keys()]) if (!seen.has(k)) placed.delete(k);
      return out;
    },
    reset() { placed.clear(); },
  };
}
