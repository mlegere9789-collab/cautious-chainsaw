// What does a click select? Reproduces the app's pick (spatial index aT + queryNearby Xx with 0.002 deg, nearest by degree distance, no pixel radius)
// using the shipped functions, over the tiles the shipped draw routine produces.
import fs from 'node:fs';
import { makeApp, mercator } from './sim.mjs';
import { storeFor } from './replay.mjs';
const pbt = storeFor('r1c').pbt;
const unproj = (center, z, W, H) => { const s = 512 * 2 ** z; const fx = (lng) => ((lng + 180) / 360) * s; const fy = (lat) => (0.5 - Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) / (2 * Math.PI)) * s; const cx = fx(center[0]), cy = fy(center[1]); return (x, y) => { const px = cx + (x - W / 2), py = cy + (y - H / 2); return [(px / s) * 360 - 180, (360 / Math.PI) * Math.atan(Math.exp((0.5 - py / s) * 2 * Math.PI)) - 90]; }; };
export function picker(tick, zoom, center, W = 1440, H = 852) {
  const app = makeApp('r1c', { pbt, W, H, center, zoom });
  app.drawStill(tick);
  const fr = app.ctx.frames[app.ctx.frames.length - 1];
  const units = app.api.getLastY1();
  const proj = mercator(center, zoom, W, H).project; const un = unproj(center, zoom, W, H);
  const idx = app.api.aT(units);
  const pick = (x, y) => { const [lng, lat] = un(x, y); const c = app.api.Xx(idx, lng, lat, 0.002); if (!c.length) return null; let best = null, bd = Infinity; for (const u of c) { const d = Math.hypot(u.lng - lng, u.lat - lat); if (d < bd) { bd = d; best = u.unit_id; } } return best; };
  const ids = []; for (const u of units) { const p = proj([u.lng, u.lat]); if (p.x > -200 && p.x < W + 200 && p.y > -40 && p.y < H + 40) ids.push(u.unit_id); }
  return { tiles: fr.tiles.map((t, i) => ({ ...t, id: ids[i] })), pick };
}
export function hitStats(tick, zoom, center, W = 1440, H = 852) {
  const app = makeApp('r1c', { pbt, W, H, center, zoom });
  app.drawStill(tick);
  const fr = app.ctx.frames[app.ctx.frames.length - 1];
  const units = app.api.getLastY1();
  const proj = mercator(center, zoom, W, H).project; const un = unproj(center, zoom, W, H);
  const idx = app.api.aT(units);
  const pick = (x, y) => { const [lng, lat] = un(x, y); const c = app.api.Xx(idx, lng, lat, 0.002); if (!c.length) return null; let best = null, bd = Infinity; for (const u of c) { const d = Math.hypot(u.lng - lng, u.lat - lat); if (d < bd) { bd = d; best = u.unit_id; } } return best; };
  const inView = []; for (const u of units) { const p = proj([u.lng, u.lat]); if (p.x > -200 && p.x < W + 200 && p.y > -40 && p.y < H + 40) inView.push(u.unit_id); }
  let own = 0, other = 0, none = 0, samples = 0; const perTile = [];
  fr.tiles.forEach((t, i) => {
    const a = (t.ang * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
    let o = 0, ot = 0, no = 0, n = 0;
    const nu = Math.max(2, Math.round(t.w / 3)), nv = Math.max(2, Math.round(Math.max(t.h, 2) / 3));
    for (let u = 0; u < nu; u++) for (let v = 0; v < nv; v++) {
      const lx = -t.w / 2 + ((u + 0.5) / nu) * t.w, ly = -Math.max(t.h, 2) / 2 + ((v + 0.5) / nv) * Math.max(t.h, 2);
      const x = t.x + lx * c - ly * s, y = t.y + lx * s + ly * c;
      if (x < 0 || x > W || y < 0 || y > H) continue;
      const r = pick(x, y); n++; if (r == null) no++; else if (r === inView[i]) o++; else ot++;
    }
    if (n) { own += o; other += ot; none += no; samples += n; perTile.push({ own: o / n, other: ot / n, none: no / n }); }
  });
  // false positives: points on bare ground (>= 25 px from every tile centre) that still select something
  let ground = 0, groundSel = 0; const nearest = (x, y) => { let d = 1e9; for (const t of fr.tiles) d = Math.min(d, Math.hypot(t.x - x, t.y - y)); return d; };
  for (let x = 20; x < W; x += 40) for (let y = 20; y < H; y += 40) { if (nearest(x, y) < 60) continue; ground++; if (pick(x, y) != null) groundSel++; }
  return { tick, zoom, tiles: fr.tiles.length, samples, ownShare: +(own / samples).toFixed(3), otherUnitShare: +(other / samples).toFixed(3), selectsNothingShare: +(none / samples).toFixed(3), tilesWithOwnShareBelow50: perTile.filter((p) => p.own < 0.5).length, tilesWithOwnShareBelow10: perTile.filter((p) => p.own < 0.1).length, emptyGroundPoints: ground, emptyGroundSelectsAUnit: groundSel, emptyGroundSelectShare: ground ? +(groundSel / ground).toFixed(3) : null };
}
if ((process.argv[1] || '').endsWith('hit-model.mjs')) {
  const out = [];
  for (const [tick, center] of [[556, [-77.2364, 39.81343]], [150, [-77.2455, 39.822]], [546, [-77.235, 39.812]]]) for (const z of [11, 12, 13, 14, 15, 16, 17, 18]) { const r = hitStats(tick, z, center); out.push({ ...r, center }); console.log(JSON.stringify(r)); }
  fs.writeFileSync('C:/Users/mlege/gettysburg-map/tmp/pitch-anim/a1/hit-model.json', JSON.stringify(out, null, 2));
}
