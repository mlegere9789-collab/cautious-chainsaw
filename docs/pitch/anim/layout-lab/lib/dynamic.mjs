// layout-lab/lib/dynamic.mjs - frame-by-frame playback runs (60 fps) and the flicker / jitter / overlap accounting.
//
// DEFINITIONS (all computed from the solver output, frame f -> f+1):
//   membershipChanges  units present in both frames whose representing tile key changed (a merge, a split, a transfer between aggregates)
//   labelToggles       a leaf tile present in both frames whose label appeared or vanished
//   slotChanges        a leaf tile with a label in both frames whose label moved to another side (r/l/b/t)
//   pops               a leaf tile present in both frames whose rendered centre moved by more than 3 px MORE than its true position did
//                      (a teleport or a layout shuffle; ideal motion has excess 0)
//   jerk               |c(f+1) - 2 c(f) + c(f-1)| of the rendered centre (px / frame^2) over leaf tiles present in 3 consecutive frames;
//                      the ideal smooth glide has jerk ~ 0.  Reported as p95 / p99 / max and the share of tile-frames above 1 px
//   overlaps           measure().overlaps of every frame (must be 0 for the proposed pipeline)
import { makeStrategy } from './strategies.mjs';
import { frameLeaves, measure, pct } from './metrics.mjs';
import { legacyLayout, legacyOverlaps, legacyOrder } from './legacy.mjs';
import { visibleAt } from './data-core.mjs';
import { newSmoother, smoothFrame } from './smooth.mjs';
import { verifyFrame } from './geom.mjs';

export const POP_PX = 3;

export function newAcc() { return { frames: 0, births: 0, deaths: 0, flickerFrames: 0, membership: 0, labelToggles: 0, slotChanges: 0, pops: 0, ov: 0, ovFrames: 0, unrep: 0, clr: 0, ms: [], tiles: [], visible: [], aggs: [], jerk: [], jerkOver1: 0, jerkN: 0, dropped: 0, maxDisp: 0, labelFrac: [], rounds: [] }; }

export function runWindow(all, name, spec, { z, tick0, speed, frames = 600, fps = 60, mode = 'smooth', opts = null, windowPolicy = null, zEnd = null, keepFrames = false, warmup = 60, smoothK = 0 }) {
  const strat = makeStrategy(name, all, spec, opts); const sm = smoothK ? newSmoother() : null;
  const acc = newAcc(); const prevC = new Map(); const prevPrevC = new Map(); let prevAssign = null; let prevLabels = null; let prevA = new Map(); const snaps = [];
  for (let f = 0; f < frames; f++) {
    const tau = Math.min(675, tick0 + speed * f / fps);
    const zf = zEnd == null ? z : z + (zEnd - z) * f / (frames - 1);
    const { leaves } = frameLeaves(all, tau, zf, spec, { mode, window: windowPolicy });
    let res = strat.step(leaves, { z: zf, dt: 1 });
    if (sm) { const o = smoothFrame(res, sm, spec, smoothK); res = { ...res, placed: o.placed, items: o.items }; }
    const m = measure(res, leaves, zf, spec);
    acc.frames++; acc.ov += m.overlaps; if (m.overlaps) acc.ovFrames++; acc.unrep += m.unrepresented; acc.clr += m.clearanceViolations; acc.ms.push(res.ms); acc.tiles.push(m.tiles); acc.visible.push(m.visible); acc.aggs.push(m.aggTiles);
    acc.dropped += m.dropped; acc.maxDisp = Math.max(acc.maxDisp, m.maxDispPx); acc.labelFrac.push(m.labelFrac); acc.rounds.push(res.rounds);
    // assignment (unit -> tile key) and label state
    const assign = new Map(); const labels = new Map(); const cen = new Map(); const anc = new Map();
    for (const p of res.placed) {
      for (const id of p.t.ids) assign.set(id, p.t.key);
      if (p.t.kind === 'leaf') { labels.set(p.t.key, p.label ? p.label.slot : null); cen.set(p.t.key, [p.cx, p.cy]); anc.set(p.t.key, [p.t.ax, p.t.ay]); }
    }
    if (prevAssign && f >= warmup) {
      acc.flickerFrames++;
      // births / deaths of tile keys that carry at least one unit that was on the field in BOTH frames (data-driven enter/exit are not layout flicker)
      const tilesNow = new Map(); const tilesPrev = new Map();
      for (const [id, k] of assign) { if (prevAssign.has(id)) tilesNow.set(k, true); }
      for (const [id, k] of prevAssign) { if (assign.has(id)) tilesPrev.set(k, true); }
      const keysNow = new Set(assign.values()); const keysPrev = new Set(prevAssign.values());
      for (const k of tilesNow.keys()) if (!keysPrev.has(k)) acc.births++;
      for (const k of tilesPrev.keys()) if (!keysNow.has(k)) acc.deaths++;
      for (const [id, k] of assign) { const pk = prevAssign.get(id); if (pk !== undefined && pk !== k) acc.membership++; }
      for (const [k, sl] of labels) { if (!prevLabels.has(k)) continue; const ps = prevLabels.get(k); if ((ps === null) !== (sl === null)) acc.labelToggles++; else if (ps !== null && ps !== sl) acc.slotChanges++; }
      for (const [k, c] of cen) {
        const pc = prevC.get(k); if (!pc) continue; const a = anc.get(k); const pa = prevA.get(k);
        const ex = Math.hypot((c[0] - pc[0]) - (a[0] - pa[0]), (c[1] - pc[1]) - (a[1] - pa[1]));
        if (ex > POP_PX) acc.pops++;
        const ppc = prevPrevC.get(k); if (ppc) { const j = Math.hypot(c[0] - 2 * pc[0] + ppc[0], c[1] - 2 * pc[1] + ppc[1]); acc.jerk.push(j); acc.jerkN++; if (j > 1) acc.jerkOver1++; }
      }
    }
    prevPrevC.clear(); for (const [k, v] of prevC) prevPrevC.set(k, v); prevC.clear(); for (const [k, v] of cen) prevC.set(k, v);
    prevA = anc; prevAssign = assign; prevLabels = labels;
    if (keepFrames && f % keepFrames === 0) snaps.push({ f, tau, res, leaves });
  }
  const out = summarize(acc, frames, fps, speed); if (sm) { out.smoothEasedShare = sm.eased / Math.max(1, sm.tileFrames); out.smoothSnapShare = sm.snapped / Math.max(1, sm.eased + sm.snapped); }
  return { acc: out, snaps };
}

export function summarize(a, frames, fps, speed) {
  const sec = Math.max(1 / fps, a.flickerFrames / fps); const avgVisible = a.visible.reduce((x, y) => x + y, 0) / a.visible.length; const avgTiles = a.tiles.reduce((x, y) => x + y, 0) / a.tiles.length;
  const mean = (x) => x.length ? x.reduce((p, q) => p + q, 0) / x.length : 0;
  return {
    frames, seconds: frames / fps, measuredSeconds: sec, speedTicksPerSec: speed * 1, avgVisible, avgTiles, avgAggTiles: mean(a.aggs),
    overlapPairsTotal: a.ov, framesWithOverlap: a.ovFrames, clearanceViolations: a.clr, unrepresentedTotal: a.unrep, droppedTotal: a.dropped, maxDispPx: a.maxDisp,
    tileBirthsPerSec: a.births / sec, tileDeathsPerSec: a.deaths / sec, tileChurnPerSec: (a.births + a.deaths) / sec, tileChurnPer100TilesPerSec: (a.births + a.deaths) / sec / Math.max(1, avgTiles) * 100,
    membershipChangesPerSec: a.membership / sec, labelTogglesPerSec: a.labelToggles / sec, slotChangesPerSec: a.slotChanges / sec, popsPerSec: a.pops / sec,
    flickerPerSec: (a.births + a.deaths + a.labelToggles + a.slotChanges) / sec,
    flickerPer100TilesPerSec: (a.births + a.deaths + a.labelToggles + a.slotChanges) / sec / Math.max(1, avgTiles) * 100,
    popsPerTileSec: a.pops / sec / Math.max(1, avgTiles),
    jerkP95: pct(a.jerk, 0.95), jerkP99: pct(a.jerk, 0.99), jerkMax: a.jerk.reduce((m, v) => (v > m ? v : m), 0), jerkShareOver1px: a.jerkN ? a.jerkOver1 / a.jerkN : 0,
    labelFracMean: mean(a.labelFrac),
    msMean: mean(a.ms), msP50: pct(a.ms, 0.5), msP95: pct(a.ms, 0.95), msP99: pct(a.ms, 0.99), msMax: a.ms.length ? Math.max(...a.ms) : 0, roundsMax: Math.max(...a.rounds),
  };
}

/** the SHIPPED renderer under the same playback: stateless relaxation every frame, rendered centre = glyph centre.  mode 'hold' = shipped data path. */
export function runLegacyWindow(all, { z, tick0, speed, frames = 600, fps = 60, mode = 'hold', warmup = 60 }) {
  const acc = newAcc(); let prevC = new Map(); let prevPrevC = new Map(); let prevA = new Map();
  const rank = legacyOrder(all);
  for (let f = 0; f < frames; f++) {
    const tau = Math.min(675, tick0 + speed * f / fps);
    const vis = visibleAt(all, tau, { mode });
    vis.sort((a, b) => rank.get(a.u.id) - rank.get(b.u.id));
    const t0 = performance.now(); const L = legacyLayout(vis, z); const ms = performance.now() - t0;
    const ov = legacyOverlaps(L); const tot = ov['glyph+glyph'] + ov['glyph+label'] + ov['label+label'];
    acc.frames++; acc.ov += tot; if (tot) acc.ovFrames++; acc.ms.push(ms); acc.tiles.push(vis.length); acc.visible.push(vis.length);
    const cen = new Map(); const anc = new Map();
    L.pe.forEach((p, i) => { cen.set(p.u.id, [L.glyphs[i].cx, L.glyphs[i].cy]); anc.set(p.u.id, [p.x, p.y]); acc.maxDisp = Math.max(acc.maxDisp, L.disp[i]); });
    if (f >= warmup) acc.flickerFrames++;
    if (f >= warmup) for (const [k, c] of cen) {
      const pc = prevC.get(k); if (!pc) continue; const a = anc.get(k); const pa = prevA.get(k);
      const ex = Math.hypot((c[0] - pc[0]) - (a[0] - pa[0]), (c[1] - pc[1]) - (a[1] - pa[1])); if (ex > POP_PX) acc.pops++;
      const ppc = prevPrevC.get(k); if (ppc) { const j = Math.hypot(c[0] - 2 * pc[0] + ppc[0], c[1] - 2 * pc[1] + ppc[1]); acc.jerk.push(j); acc.jerkN++; if (j > 1) acc.jerkOver1++; }
    }
    prevPrevC = prevC; prevC = cen; prevA = anc;
  }
  return { acc: summarize(acc, frames, fps, speed), snaps: [] };
}
