// layout-lab/lib/lookahead.mjs - the LOOKAHEAD motion layer (stage 6 variant fed with the solver's FUTURE frames).
//   Playback is deterministic (positions are data), so the solver can run W frames ahead of the display (latency W/60 s = 100 ms at W = 6).
//   Displayed offset of a tile at frame f = triangular-weighted average of its SOLVED offsets over frames f-W..f+W in which the key exists, so a push
//   the solver makes at frame f+3 becomes a glide that starts at f-W.  Safety rule: any eased position that would overlap another tile / label / pin is
//   SNAPPED back to the solved position (the solved layout is overlap-free by construction, so the fallback always exists and the displayed frame can never overlap).
import { Hash, clearance } from './geom.mjs';
import { chipRect, labelRect } from './engine.mjs';
import { makeStrategy } from './strategies.mjs';
import { frameLeaves, measure } from './metrics.mjs';
import { newAcc, summarize, POP_PX } from './dynamic.mjs';

export function lookaheadFrame(frames, f, W, spec) {
  const gap = spec.gap; const cur = frames[f]; const placed = cur.placed;
  const want = placed.map((p) => {
    let sx = 0; let sy = 0; let sw = 0;
    for (let j = -W; j <= W; j++) {
      const fr = frames[f + j]; if (!fr) continue;
      const q = fr.byKey.get(p.t.key); if (!q) continue;
      const w = (W + 1 - Math.abs(j)); sx += q.off.ox * w; sy += q.off.oy * w; sw += w;
    }
    const o = sw ? { ox: sx / sw, oy: sy / sw } : { ox: p.off.ox, oy: p.off.oy };
    return { p, o, snapped: Math.abs(o.ox - p.off.ox) < 1e-9 && Math.abs(o.oy - p.off.oy) < 1e-9 };
  });
  const rectsOf = (w) => {
    const cx = w.p.t.ax + w.o.ox; const cy = w.p.t.ay + w.o.oy;
    const chip = chipRect(w.p.t, cx, cy); chip.owner = w.p.t.key; chip.kind = 'chip';
    let label = null; if (w.p.label) { label = labelRect(w.p.t, cx, cy, w.p.label.slot, spec); label.owner = w.p.t.key; label.kind = 'label'; }
    const pin = Math.hypot(w.o.ox, w.o.oy) > 1.5 ? { x0: w.p.t.ax - spec.pinHalf, y0: w.p.t.ay - spec.pinHalf, x1: w.p.t.ax + spec.pinHalf, y1: w.p.t.ay + spec.pinHalf, owner: w.p.t.key, kind: 'pin' } : null;
    return { cx, cy, chip, label, pin };
  };
  for (let iter = 0; iter < 60; iter++) {
    const rs = want.map(rectsOf); const h = new Hash(64);
    rs.forEach((r, i) => { for (const x of [r.chip, r.label, r.pin]) if (x) { x._i = i; h.add(x); } });
    const bad = new Set();
    rs.forEach((r, i) => {
      for (const x of [r.chip, r.label, r.pin]) {
        if (!x) continue;
        h.query(x.x0 - gap - 1, x.y0 - gap - 1, x.x1 + gap + 1, x.y1 + gap + 1, (o) => {
          if (o._i === i || (x.kind === 'pin' && o.kind === 'pin')) return;
          if (clearance(x, o) < gap - 1e-6) { if (!want[i].snapped) bad.add(i); if (!want[o._i].snapped) bad.add(o._i); }
        });
      }
    });
    if (bad.size === 0) {
      const out = want.map((w, i) => ({ ...w.p, cx: rs[i].cx, cy: rs[i].cy, chip: rs[i].chip, label: w.p.label ? { slot: w.p.label.slot, rect: rs[i].label } : null, displaced: Math.hypot(w.o.ox, w.o.oy) > 1.5, off: w.o }));
      const items = [];
      out.forEach((q, i) => { items.push({ owner: q.t.key, kind: 'chip', x0: q.chip.x0, y0: q.chip.y0, x1: q.chip.x1, y1: q.chip.y1 }); if (q.label) items.push({ owner: q.t.key, kind: 'label', x0: q.label.rect.x0, y0: q.label.rect.y0, x1: q.label.rect.x1, y1: q.label.rect.y1 }); if (q.displaced) items.push({ owner: q.t.key, kind: 'pin', ...rs[i].pin }); });
      const changed = want.filter((w) => !(Math.abs(w.o.ox - w.p.off.ox) < 1e-9 && Math.abs(w.o.oy - w.p.off.oy) < 1e-9)).length;
      return { placed: out, items, changed, snappedBack: want.filter((w) => w.wasEased).length };
    }
    for (const i of bad) { want[i].o = { ox: want[i].p.off.ox, oy: want[i].p.off.oy }; want[i].snapped = true; want[i].wasEased = true; }
  }
  throw new Error('lookahead smoothing did not reach a fixpoint');
}

/** solver-ahead playback with the lookahead layer; metrics are over the DISPLAYED frames (the first and last W frames are not displayed) */
export function runWindowLookahead(all, name, spec, { z, tick0, speed, frames = 600, fps = 60, mode = 'smooth', opts = null, windowPolicy = null, warmup = 60, W = 6 }) {
  const strat = makeStrategy(name, all, spec, opts); const solved = []; const leavesAt = [];
  for (let f = 0; f < frames; f++) {
    const tau = Math.min(675, tick0 + speed * f / fps);
    const { leaves } = frameLeaves(all, tau, z, spec, { mode, window: windowPolicy });
    const res = strat.step(leaves, { z, dt: 1 }); res.byKey = new Map(res.placed.map((p) => [p.t.key, p])); solved.push(res); leavesAt.push(leaves);
  }
  const acc = newAcc(); let prevC = new Map(); let prevPrevC = new Map(); let prevA = new Map(); let prevAssign = null; let prevLabels = null; let changedTot = 0; let snapBack = 0;
  for (let f = W; f < frames - W; f++) {
    const o = lookaheadFrame(solved, f, W, spec); changedTot += o.changed; snapBack += o.snappedBack;
    const res = { ...solved[f], placed: o.placed, items: o.items };
    const m = measure(res, leavesAt[f], z, spec);
    acc.frames++; acc.ov += m.overlaps; if (m.overlaps) acc.ovFrames++; acc.unrep += m.unrepresented; acc.clr += m.clearanceViolations; acc.ms.push(solved[f].ms); acc.tiles.push(m.tiles); acc.visible.push(m.visible); acc.aggs.push(m.aggTiles); acc.maxDisp = Math.max(acc.maxDisp, m.maxDispPx); acc.labelFrac.push(m.labelFrac); acc.rounds.push(solved[f].rounds);
    const cen = new Map(); const anc = new Map(); const assign = new Map(); const labels = new Map();
    for (const p of res.placed) { for (const id of p.t.ids) assign.set(id, p.t.key); if (p.t.kind === 'leaf') { cen.set(p.t.key, [p.cx, p.cy]); anc.set(p.t.key, [p.t.ax, p.t.ay]); labels.set(p.t.key, p.label ? p.label.slot : null); } }
    if (f - W >= warmup && prevAssign) {
      acc.flickerFrames++;
      for (const [k, sl] of labels) { if (!prevLabels.has(k)) continue; const ps = prevLabels.get(k); if ((ps === null) !== (sl === null)) acc.labelToggles++; else if (ps !== null && ps !== sl) acc.slotChanges++; }
      const keysNow = new Set(assign.values()); const keysPrev = new Set(prevAssign.values());
      const bornKeys = new Set(); const deadKeys = new Set();
      for (const [id, k] of assign) if (prevAssign.has(id) && !keysPrev.has(k)) bornKeys.add(k);
      for (const [id, k] of prevAssign) if (assign.has(id) && !keysNow.has(k)) deadKeys.add(k);
      acc.births += bornKeys.size; acc.deaths += deadKeys.size;
      for (const [k, c] of cen) {
        const pc = prevC.get(k); if (!pc) continue; const a = anc.get(k); const pa = prevA.get(k);
        const ex = Math.hypot((c[0] - pc[0]) - (a[0] - pa[0]), (c[1] - pc[1]) - (a[1] - pa[1])); if (ex > POP_PX) acc.pops++;
        const ppc = prevPrevC.get(k); if (ppc) { const j = Math.hypot(c[0] - 2 * pc[0] + ppc[0], c[1] - 2 * pc[1] + ppc[1]); acc.jerk.push(j); acc.jerkN++; if (j > 1) acc.jerkOver1++; }
      }
    }
    prevPrevC = prevC; prevC = cen; prevA = anc; prevAssign = assign; prevLabels = labels;
  }
  const out = summarize(acc, acc.frames, fps, speed); out.lookaheadFrames = W; out.changedTilesPerFrame = changedTot / Math.max(1, acc.frames); out.snappedBackPerFrame = snapBack / Math.max(1, acc.frames);
  return { acc: out, snaps: [] };
}
