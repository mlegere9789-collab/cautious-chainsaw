// metrics/metrics.mjs - everything that can be MEASURED about the animation, computed from the frames the engine emits (never from what the engine intends):
//   frame intervals          raw rAF intervals (the app passes them), fps, p50 / p95 / p99, share of frames over 20 ms and over 33 ms
//   displacement per frame   for every tile present in two consecutive frames, the change of its OFFSET from its true position, i.e. its motion beyond the motion of the unit itself
//                            (the lab's "excess"):  pop = excess above metrics.popPx (default 3 px, the lab definition), teleport = excess above 12 px
//   jerk                     |o(f+1) - 2 o(f) + o(f-1)| of that offset over tiles present in three consecutive frames (px / frame^2), p99 and max
//   overlap                  solid-item overlapping pairs found by the independent verifier on the DISPLAYED frame (must be 0), clearance violations
//   representation           units on the field that no live tile stands for (must be 0); frames with a unit visible only through a fading tile ("transition gaps")
//   solve                    layout solve ms and display ms per frame
//   travel                   tiles that dimmed below 0.5 to glide to a far place (travels per second); a travelling tile is not counted as a pop
//   hops (absolute)          the MAP-FIXED step of every tile that is on screen in two consecutive frames (its layout position changes while the zoom does not: camera pans do not count, and the
//                            unit's own motion does): hops = steps above HOP_PX (8 px, report 01's threshold) per second, the largest step, the percentiles of the steps of tiles that moved, and
//                            blinks = identities that vanish for exactly one frame and return.  Unlike pops (which look at the offset from the true position) this sees a unit that hops WITH its
//                            true position, which is what hold-then-jump keyframes do, so it compares the production reproduction and the Studio on one scale.
//                            jumps = the hops that are SUDDEN: a step above HOP_PX that is also more than 3 times the same tile's step in the previous frame (hold-then-jump, snap-back and any other
//                            discontinuity; a fast but smooth glide, whose step grows gradually, is a hop but not a jump).  jumpsSolid counts only tiles that are solid in both frames: a tile
//                            that dimmed below 0.5 to travel is a ghost, not an obstacle (the opacity rule), and is reported apart.
//   net                      how often the safety net had to repair a frame (netDims per second: the lighter of two overlapping solid tiles is dimmed)
// Live overlay data and an exportable JSON come from the same recorder; the node tests and the browser use the identical code.
const pct = (arr, p) => { if (!arr.length) return 0; const a = [...arr].sort((x, y) => x - y); return a[Math.min(a.length - 1, Math.floor(p * (a.length - 1) + 0.5))]; };
const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const maxOf = (a) => a.reduce((m, v) => (v > m ? v : m), 0);
const JERK_CAP = 60000;

export const TELEPORT_PX = 12;
export const HOP_PX = 8;

export function createMetrics(tok) {
  const M = {
    reset() {
      Object.assign(M, { frames: 0, seconds: 0, dt: [], solveMs: [], displayMs: [], engineMs: [], tiles: [], pops: 0, teleports: 0, jerk: [], jerkOver1: 0, jerkN: 0, popsSeries: [], jerkMax: 0, travels: 0, travelTileFrames: 0, solvedFrames: 0, overlapFrames: 0, overlapPairs: 0, clearance: 0, unrepresented: 0,
        hops: 0, jumps: 0, jumpsSolid: 0, jumpFrames: 0, hopsSolid: 0, hopFrames: 0, stepMax: 0, steps: [], stepsSeen: 0, blinks: 0, netSnaps: 0, netFrames: 0, births: 0, deaths: 0, handoffs: 0, cuts: 0, labelToggles: 0, pushedSum: 0, maxExcess: 0, maxOffset: 0, dispViolations: 0, onField: [], series: [] });
      M._sumCache = null; M._sumAt = 0; M._prev = null; M._prev2 = null; M._lcg = 12345; M._absPrev = null; M._absKeys2 = null; M._absStep = new Map(); M._absZ = null;
    },
    /** @param {object} f the frame the engine emitted  @param {{rawDtMs?:number, engineMs?:number, displayMs?:number}} [t] */
    record(f, t = {}) {
      const keep = tok('metrics.historyFrames'); const popPx = tok('metrics.popPx');
      M.frames++; const dtMs = t.rawDtMs ?? 16.667; M.seconds += dtMs / 1000;
      M.dt.push(dtMs); M.solveMs.push(f.solverMs || 0); M.displayMs.push(t.displayMs ?? 0); M.engineMs.push(t.engineMs ?? 0); M.tiles.push(f.tiles.length); M.onField.push(f.onField || 0);
      let pops = 0; let teleports = 0; let maxEx = 0;
      const cur = new Map(); for (const tl of f.tiles) if (tl.life === 'live') cur.set(tl.key, [tl.ox ?? tl.x - tl.ax, tl.oy ?? tl.y - tl.ay, tl.solid, tl.ajx || 0, tl.ajy || 0]);   // FORK: ox, oy are the displacement of the mark's own anchor (the pip, the foot of the staff) from the true position: the box centre also moves while a name grows or a crowd's words change, and that is not motion of the mark.  [3], [4]: the part of the anchor's change the display layer absorbed into the offset this frame (aggregate membership changes), which is not motion
      if (M._prev && !f.stats.cut) {
        for (const [k, o] of cur) {
          const p = M._prev.get(k); if (!p) continue;
          if (!(p[2] && o[2])) continue;                                    // only tiles that are solid in both frames: a dimmed travelling tile is counted separately (travels)
          const ex = Math.hypot(o[0] - p[0] + o[3], o[1] - p[1] + o[4]); if (ex > maxEx) maxEx = ex;
          if (ex > popPx) pops++; if (ex > TELEPORT_PX) teleports++;
          const pp = M._prev2 && M._prev2.get(k);
          if (pp) { const j = Math.hypot(o[0] - 2 * p[0] + pp[0] + o[3] - p[3], o[1] - 2 * p[1] + pp[1] + o[4] - p[4]); M.jerkN++; if (j > 1) M.jerkOver1++; if (j > M.jerkMax) M.jerkMax = j; if (M.jerk.length < JERK_CAP) M.jerk.push(j); else { M._lcg = (Math.imul(M._lcg, 1664525) + 1013904223) >>> 0; const r = M._lcg % M.jerkN; if (r < JERK_CAP) M.jerk[r] = j; } }
        }
      }
      // absolute, map-fixed steps (layout px relative to the zoom's origin do not change with the camera while the zoom is the same)
      let hops = 0; let jumps = 0; let jumpsSolid = 0; let hopsSolid = 0; let stepMax = 0; const absNow = new Map(); const stepNow = new Map();
      for (const tl of f.tiles) if (tl.life === 'live' && tl.opacity > 0.02) absNow.set(tl.key, [tl.ix ?? tl.x, tl.iy ?? tl.y, tl.solid]);      // FORK: the point the mark stands on (the pip), not its box centre
      if (M._absPrev && M._absZ === f.zoom && !f.stats.cut) {
        for (const [k, o] of absNow) {
          const p = M._absPrev.get(k);
          if (!p) { if (M._absKeys2 && M._absKeys2.has(k)) M.blinks++; continue; }          // absent last frame, present two frames ago: a one-frame blink
          const st = Math.hypot(o[0] - p[0], o[1] - p[1]); if (st > stepMax) stepMax = st;
          stepNow.set(k, st);
          if (st > HOP_PX) { hops++; if (o[2] && p[2]) hopsSolid++; const ps = M._absStep.get(k); if (ps !== undefined && st > 3 * Math.max(ps, 1)) { jumps++; if (o[2] && p[2]) jumpsSolid++; } }
          if (st > 0.05) { M.stepsSeen++; if (M.steps.length < JERK_CAP) M.steps.push(st); else { M._lcg = (Math.imul(M._lcg, 1664525) + 1013904223) >>> 0; const r = M._lcg % M.stepsSeen; if (r < JERK_CAP) M.steps[r] = st; } }
        }
      }
      M._absKeys2 = M._absPrev ? new Set(M._absPrev.keys()) : null; M._absPrev = absNow; M._absZ = f.zoom; M._absStep = stepNow;
      M.hops += hops; M.jumps += jumps; M.jumpsSolid += jumpsSolid; if (jumps) M.jumpFrames++; M.hopsSolid += hopsSolid; if (hops) M.hopFrames++; M.stepMax = Math.max(M.stepMax, stepMax);
      M.pops += pops; M.teleports += teleports; M.maxExcess = Math.max(M.maxExcess, maxEx);
      M._prev2 = M._prev; M._prev = cur;
      if (f.overlaps) { M.overlapFrames++; M.overlapPairs += f.overlaps; }
      M.clearance += f.clearanceViolations || 0; M.unrepresented += f.unrepresented || 0;
      const s = f.stats || {};
      if (s.netDims) { M.netSnaps += s.netDims; M.netFrames++; }
      if (f.solved !== false) M.solvedFrames++;
      M.travels += s.travels || 0; M.travelTileFrames += s.travelling || 0;
      M.births += s.births || 0; M.deaths += s.deaths || 0; M.handoffs += s.handoffs || 0; if (s.cut) M.cuts++; M.labelToggles += s.labelToggles || 0; M.pushedSum += s.pushed || 0;
      M.series.push({ dt: dtMs, solve: f.solverMs || 0, tiles: f.tiles.length, pops, teleports, hops, jumps, stepMax, overlaps: f.overlaps || 0, netDims: s.netDims || 0, maxExcess: maxEx });
      if (M.series.length > keep) M.series.shift();
      if (M.dt.length > 30000) for (const k of ['dt', 'solveMs', 'displayMs', 'engineMs', 'tiles', 'onField']) M[k].splice(0, 10000);
    },
    /** one-line live numbers for the overlay */
    live() {
      const n = Math.min(M.dt.length, 120); const d = M.dt.slice(-n); const sec = Math.max(1e-6, d.reduce((a, b) => a + b, 0) / 1000);
      const sr = M.series.slice(-120);
      return { fps: n / sec, dtP95: pct(d, 0.95), dtMax: maxOf(d), solveMs: mean(M.solveMs.slice(-n)), popsPerSec: sr.reduce((a, r) => a + r.pops, 0) / sec, teleportsPerSec: sr.reduce((a, r) => a + r.teleports, 0) / sec, hopsPerSec: sr.reduce((a, r) => a + r.hops, 0) / sec, jumpsPerSec: sr.reduce((a, r) => a + r.jumps, 0) / sec, overlaps: M.overlapPairs, overlapFrames: M.overlapFrames, unrepresented: M.unrepresented, netDims: M.netSnaps, frames: M.frames, series: M.series };
    },
    /** the numbers of the run so far.  opts.maxAgeMs: an overlay that asks twice a second may take a result up to that old (the percentiles sort up to 60,000 samples: about 15 ms); the default is always exact */
    summary(opts = {}) {
      if (opts.maxAgeMs && M._sumCache && M._sumCache.frames > 0 && M.frames >= M._sumCache.frames && performance.now() - M._sumAt < opts.maxAgeMs) return M._sumCache;
      const r = M._summary(); M._sumCache = r; M._sumAt = performance.now(); return r;
    },
    _summary() {
      const sec = Math.max(1e-6, M.seconds); const over20 = M.dt.filter((x) => x > 20).length; const over33 = M.dt.filter((x) => x > 33.4).length;
      return {
        frames: M.frames, seconds: +sec.toFixed(3), fpsMean: +(M.frames / sec).toFixed(2), dtMsP50: +pct(M.dt, 0.5).toFixed(2), dtMsP95: +pct(M.dt, 0.95).toFixed(2), dtMsP99: +pct(M.dt, 0.99).toFixed(2), dtMsMax: +maxOf(M.dt).toFixed(2),
        framesOver20msPct: +(100 * over20 / Math.max(1, M.dt.length)).toFixed(2), framesOver33msPct: +(100 * over33 / Math.max(1, M.dt.length)).toFixed(2),
        solvedFramesPct: +(100 * M.solvedFrames / Math.max(1, M.frames)).toFixed(1), solveMsMean: +mean(M.solveMs).toFixed(2), solveMsP95: +pct(M.solveMs, 0.95).toFixed(2), solveMsP99: +pct(M.solveMs, 0.99).toFixed(2), solveMsMax: +maxOf(M.solveMs).toFixed(2),
        displayMsMean: +mean(M.displayMs).toFixed(2), engineMsMean: +mean(M.engineMs).toFixed(2), engineMsP95: +pct(M.engineMs, 0.95).toFixed(2),
        tilesMean: +mean(M.tiles).toFixed(1), onFieldMean: +mean(M.onField).toFixed(1),
        popsPerSec: +(M.pops / sec).toFixed(3), teleportsPerSec: +(M.teleports / sec).toFixed(3), maxExcessPx: +M.maxExcess.toFixed(2), hopsPerSec: +(M.hops / sec).toFixed(3), jumpsPerSec: +(M.jumps / sec).toFixed(3), jumpsSolidPerSec: +(M.jumpsSolid / sec).toFixed(3), jumps: M.jumps, jumpFramesPct: +(100 * M.jumpFrames / Math.max(1, M.frames)).toFixed(2), hopsSolidPerSec: +(M.hopsSolid / sec).toFixed(3), hopFramesPct: +(100 * M.hopFrames / Math.max(1, M.frames)).toFixed(2), maxStepPx: +M.stepMax.toFixed(2), stepP50Px: +pct(M.steps, 0.5).toFixed(3), stepP95Px: +pct(M.steps, 0.95).toFixed(3), stepP99Px: +pct(M.steps, 0.99).toFixed(3), blinksPerSec: +(M.blinks / sec).toFixed(3), blinks: M.blinks, jerkP95: +pct(M.jerk, 0.95).toFixed(4), jerkP99: +pct(M.jerk, 0.99).toFixed(4), jerkMax: +M.jerkMax.toFixed(3), jerkShareOver1px: +(M.jerkN ? M.jerkOver1 / M.jerkN : 0).toFixed(5),
        overlapFrames: M.overlapFrames, overlapPairs: M.overlapPairs, clearanceViolations: M.clearance, unrepresentedUnitFrames: M.unrepresented, netDimsTotal: M.netSnaps, netFrames: M.netFrames, netDimsPerSec: +(M.netSnaps / sec).toFixed(3), travelsPerSec: +(M.travels / sec).toFixed(3), travellingTilesMean: +(M.travelTileFrames / Math.max(1, M.frames)).toFixed(2),
        birthsPerSec: +(M.births / sec).toFixed(2), deathsPerSec: +(M.deaths / sec).toFixed(2), handoffsPerSec: +(M.handoffs / sec).toFixed(2), cuts: M.cuts, labelTogglesPerSec: +(M.labelToggles / sec).toFixed(2), pushedPerFrame: +(M.pushedSum / Math.max(1, M.frames)).toFixed(2),
      };
    },
    export(meta = {}) { return { format: 'battle-studio-metrics/1', meta, summary: M.summary(), series: M.series }; },
  };
  M.reset();
  return M;
}
