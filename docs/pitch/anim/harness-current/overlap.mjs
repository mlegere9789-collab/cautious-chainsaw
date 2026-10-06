// Overlap census on real data with the app's real draw routine.
// usage: node overlap.mjs <r1c|baseline> [zooms=11,12,13,14,15,16,17]    (baseline here = R1c-equivalent carry-forward state: the intended display)
// For every tick whose displayed state differs (a tick with a keyframe), draw it with the shipped lS into a recording context at 1440x852 (default camera)
// and with a huge virtual canvas (every unit, any pan position), then census overlaps from the recorded tile / dot / label geometry.
import fs from 'node:fs';
import { makeApp } from './sim.mjs';
import { storeFor } from './replay.mjs';
import { mercator } from './sim.mjs';
const OUT = 'C:/Users/mlege/gettysburg-map/tmp/pitch-anim/a1/overlap-';

const rad = (d) => (d * Math.PI) / 180;
function bodyOf(t) {
  // rotated rectangle centred on (x,y); skirmish line is 2 px thick; artillery outline is h px tall
  const a = rad(t.ang || 0), c = Math.cos(a), s = Math.sin(a);
  return { x: t.x, y: t.y, c, s, hw: t.w / 2, hh: Math.max(t.h, 2) / 2 };
}
function corners(b) { const o = []; for (const [u, v] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) o.push([b.x + u * b.hw * b.c - v * b.hh * b.s, b.y + u * b.hw * b.s + v * b.hh * b.c]); return o; }
function aabb(b) { const cs = corners(b); const xs = cs.map((p) => p[0]), ys = cs.map((p) => p[1]); return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]; }
function satOverlap(A, B, minDepth = 0.5) {
  const ca = corners(A), cb = corners(B);
  const axes = [[A.c, A.s], [-A.s, A.c], [B.c, B.s], [-B.s, B.c]];
  let minPen = Infinity;
  for (const [ax, ay] of axes) {
    let a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity;
    for (const p of ca) { const d = p[0] * ax + p[1] * ay; a0 = Math.min(a0, d); a1 = Math.max(a1, d); }
    for (const p of cb) { const d = p[0] * ax + p[1] * ay; b0 = Math.min(b0, d); b1 = Math.max(b1, d); }
    const pen = Math.min(a1, b1) - Math.max(a0, b0);
    if (pen <= minDepth) return 0;
    minPen = Math.min(minPen, pen);
  }
  return minPen;
}
function inBody(B, px, py) { const dx = px - B.x, dy = py - B.y; const u = dx * B.c + dy * B.s, v = -dx * B.s + dy * B.c; return Math.abs(u) <= B.hw && Math.abs(v) <= B.hh; }
const inRect = (r, px, py) => px >= r.bx && px <= r.bx + r.bw && py >= r.by && py <= r.by + r.bh;
const rectOverlapArea = (a, b) => Math.max(0, Math.min(a.bx + a.bw, b.bx + b.bw) - Math.max(a.bx, b.bx)) * Math.max(0, Math.min(a.by + a.bh, b.by + b.bh) - Math.max(a.by, b.by));

export function census(frame, { step = 2 } = {}) {
  const tiles = frame.tiles, labels = frame.labels.filter((l) => l.text != null);
  const bodies = tiles.map(bodyOf); const boxes = bodies.map(aabb);
  const n = tiles.length;
  // spatial hash on AABBs
  const CELL = 160; const grid = new Map();
  boxes.forEach((b, i) => { for (let gx = Math.floor(b[0] / CELL); gx <= Math.floor(b[2] / CELL); gx++) for (let gy = Math.floor(b[1] / CELL); gy <= Math.floor(b[3] / CELL); gy++) { const k = gx + ',' + gy; (grid.get(k) || grid.set(k, []).get(k)).push(i); } });
  const nb = (i) => { const s = new Set(); const b = boxes[i]; for (let gx = Math.floor(b[0] / CELL); gx <= Math.floor(b[2] / CELL); gx++) for (let gy = Math.floor(b[1] / CELL); gy <= Math.floor(b[3] / CELL); gy++) for (const j of grid.get(gx + ',' + gy) || []) if (j !== i) s.add(j); return s; };
  const ovPairs = []; const covTiles = new Array(n).fill(0), covSamples = new Array(n).fill(0); const hiddenLabelOnly = new Array(n).fill(0);
  const comp = Array.from({ length: n }, (_, i) => i); const find = (x) => { while (comp[x] !== x) { comp[x] = comp[comp[x]]; x = comp[x]; } return x; };
  for (let i = 0; i < n; i++) {
    for (const j of nb(i)) {
      if (j < i) continue;
      if (boxes[i][2] < boxes[j][0] || boxes[j][2] < boxes[i][0] || boxes[i][3] < boxes[j][1] || boxes[j][3] < boxes[i][1]) continue;
      const d = satOverlap(bodies[i], bodies[j]); if (d > 0) { ovPairs.push([i, j, d]); comp[find(i)] = find(j); }
    }
  }
  // hidden fraction of each tile body by later-drawn tiles (j > i) and by label boxes (drawn after all tiles)
  const labGrid = new Map(); labels.forEach((l, k) => { for (let gx = Math.floor(l.bx / CELL); gx <= Math.floor((l.bx + l.bw) / CELL); gx++) for (let gy = Math.floor(l.by / CELL); gy <= Math.floor((l.by + l.bh) / CELL); gy++) { const key = gx + ',' + gy; (labGrid.get(key) || labGrid.set(key, []).get(key)).push(k); } });
  const hidTile = new Array(n).fill(0), hidLab = new Array(n).fill(0), hidAny = new Array(n).fill(0), samples = new Array(n).fill(0), ownCov = new Array(n).fill(0);
  const alignedLabels = labels.length === n;
  for (let i = 0; i < n; i++) {
    const B = bodies[i]; const later = [...nb(i)].filter((j) => j > i);
    const gx = Math.floor(B.x / CELL), gy = Math.floor(B.y / CELL);
    const labs = new Set(); for (let a = gx - 1; a <= gx + 1; a++) for (let b = gy - 1; b <= gy + 1; b++) for (const k of labGrid.get(a + ',' + b) || []) labs.add(k);
    const nu = Math.max(2, Math.round((2 * B.hw) / step)), nv = Math.max(2, Math.round((2 * B.hh) / step));
    for (let a = 0; a < nu; a++) for (let b = 0; b < nv; b++) {
      const u = -B.hw + ((a + 0.5) / nu) * 2 * B.hw, v = -B.hh + ((b + 0.5) / nv) * 2 * B.hh;
      const px = B.x + u * B.c - v * B.s, py = B.y + u * B.s + v * B.c;
      samples[i]++;
      let byT = false, byL = false, own = false;
      for (const j of later) if (inBody(bodies[j], px, py)) { byT = true; break; }
      for (const k of labs) if (inRect(labels[k], px, py)) { if (alignedLabels && k === i) { own = true; } else { byL = true; } }
      if (own) ownCov[i]++;
      if (byT) hidTile[i]++; if (byL) hidLab[i]++; if (byT || byL) hidAny[i]++;
    }
  }
  const frac = (arr) => arr.map((c, i) => (samples[i] ? c / samples[i] : 0));
  const fT = frac(hidTile), fL = frac(hidLab), fA = frac(hidAny), fO = frac(ownCov);
  // dots (disposition badge, 7 px above the centre, r 3.5): share of the disc covered by LATER tiles or by other units' labels; own label reported apart
  let dotsHidden = 0, dotsOwnLabelHalf = 0;
  frame.dots.forEach((d, i) => {
    const gx = Math.floor(d.x / CELL), gy = Math.floor(d.y / CELL); let tot = 0, other = 0, own = 0;
    for (let a = -3; a <= 3; a += 1.5) for (let b = -3; b <= 3; b += 1.5) {
      if (a * a + b * b > 12.25) continue; tot++; const px = d.x + a, py = d.y + b; let hid = false, ownHit = false;
      for (let ga = gx - 1; ga <= gx + 1 && !hid; ga++) for (let gb = gy - 1; gb <= gy + 1 && !hid; gb++) {
        for (const j of grid.get(ga + ',' + gb) || []) if (j > i && inBody(bodies[j], px, py)) { hid = true; break; }
        if (!hid) for (const k of labGrid.get(ga + ',' + gb) || []) if (inRect(labels[k], px, py)) { if (alignedLabels && k === i) ownHit = true; else { hid = true; break; } }
      }
      if (hid) other++; else if (ownHit) own++;
    }
    if (tot && other / tot >= 0.5) dotsHidden++; if (tot && own / tot >= 0.4) dotsOwnLabelHalf++;
  });
  // label-label overlap: a label is "illegible" when >30% of its box is covered by a later label (later labels paint over earlier ones)
  let labPairs = 0, labIllegible = 0;
  labels.forEach((l, k) => {
    let cov = 0; const gx = Math.floor(l.bx / CELL), gy = Math.floor(l.by / CELL); const cand = new Set();
    for (let a = gx - 1; a <= gx + 1; a++) for (let b = gy - 1; b <= gy + 1; b++) for (const m of labGrid.get(a + ',' + b) || []) if (m > k) cand.add(m);
    let maxCov = 0; for (const m of cand) { const ar = rectOverlapArea(l, labels[m]); if (ar > 0) { labPairs++; maxCov = Math.max(maxCov, ar / (l.bw * l.bh)); } }
    if (maxCov > 0.3) labIllegible++;
  });
  const sizes = {}; for (let i = 0; i < n; i++) { const r = find(i); sizes[r] = (sizes[r] || 0) + 1; }
  const compSizes = Object.entries(sizes).map(([r, c]) => ({ root: +r, count: c })).filter((x) => x.count > 1).sort((a, b) => b.count - a.count);
  const touched = new Set(); ovPairs.forEach(([i, j]) => { touched.add(i); touched.add(j); });
  return {
    tiles: n, labels: labels.length, overlapPairs: ovPairs.length, tilesInAnyOverlap: touched.size,
    hiddenOver50: fA.filter((f) => f >= 0.5).length, hiddenOver95: fA.filter((f) => f >= 0.95).length,
    hiddenByTilesOver50: fT.filter((f) => f >= 0.5).length, hiddenByLabelsOver50: fL.filter((f) => f >= 0.5).length,
    meanHiddenShare: n ? +(fA.reduce((a, b) => a + b, 0) / n).toFixed(4) : 0,
    dotsHidden, dotsHalfCoveredByOwnLabel: dotsOwnLabelHalf, tilesOwnLabelCoversOver30: fO.filter((f) => f > 0.3).length, labelPairsOverlapping: labPairs, labelsIllegibleOver30: labIllegible,
    largestCluster: compSizes[0] ? compSizes[0].count : 1, clusters: compSizes.length, clusterRoots: compSizes.slice(0, 3).map((c) => ({ count: c.count, members: [...Array(n).keys()].filter((i) => find(i) === c.root) })),
    fracPerTile: fA,
  };
}

if ((process.argv[1] || '').endsWith('overlap.mjs')) {
  const which = process.argv[2] || 'r1c';
  const zooms = (process.argv[3] || '11,12,13,14,15,16,17').split(',').map(Number);
  const PHONE = process.argv[4] === 'phone';
  const st = storeFor('r1c'); const pbt = st.pbt; // carry-forward semantics (the intended picture); baseline's stale-cache differences are measured separately in the browser
  const keyTicks = Object.keys(pbt).map(Number).sort((a, b) => a - b);
  const results = {};
  const center = [-77.235, 39.812];
  for (const mode of (PHONE ? ['view'] : ['view', 'global'])) for (const z of zooms) {
    const W = mode === 'view' ? (PHONE ? 390 : 1440) : 6000 * 2 ** Math.max(0, z - 11) ;
    const H = mode === 'view' ? (PHONE ? 607 : 852) : 5000 * 2 ** Math.max(0, z - 11);
    const app = makeApp('r1c', { pbt, W, H, center, zoom: z });
    const per = {};
    const t0 = Date.now();
    for (const t of keyTicks) {
      app.drawStill(t);
      const fr = app.ctx.frames[app.ctx.frames.length - 1];
      const c = census(fr);
      const mercatorP = mercator(center, z, W, H).project;
      // keep the cluster centroids in lng/lat-free pixel terms with unit ids for hotspot naming
      const ids = []; for (const u of app.api.getLastY1()) { const p = mercatorP([u.lng, u.lat]); if (p.x > -200 && p.x < W + 200 && p.y > -40 && p.y < H + 40) ids.push(u.unit_id); }
      c.clusterRoots = c.clusterRoots.map((cl) => ({ count: cl.count, units: cl.members.map((m) => ids[m]), px: cl.members.map((m) => [fr.tiles[m].x, fr.tiles[m].y]) }));
      delete c.fracPerTile; per[t] = c;
    }
    results[`${mode}-z${z}`] = per;
    console.log(mode, 'z' + z, 'ticks', keyTicks.length, ((Date.now() - t0) / 1000).toFixed(0) + 's');
    fs.writeFileSync(OUT + which + (PHONE ? '-phone' : '') + '.json', JSON.stringify({ keyTicks, center, results }));
  }
}
