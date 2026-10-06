// layout-lab/lib/smooth.mjs - stage 6 of the pipeline, the MOTION LAYER: "ease, then verify".
//   * the rendered offset of every tile follows its solved offset through an exponential filter (the tile still tracks its true position exactly;
//     only CHANGES of its displacement are eased), so a push (a neighbour arrived, an aggregate formed) becomes a glide instead of a jump;
//   * a NEWCOMER tile (new key: a unit entering, an aggregate forming) is a GHOST for `ghostFrames` frames: drawn at its final position with a rising
//     opacity (< 0.5 while ghost), so it is not yet "solid" and the tiles it pushes may still be gliding away;
//   * the moment a tile becomes solid, or whenever an eased position would overlap a solid tile / label / pin, the tiles involved are SNAPPED to their solved
//     position.  The solved layout is overlap-free by construction, so a safe fallback always exists: the rendered frame can never overlap a solid tile.
// Overlap rule for rendered frames: two items overlap if both owners are solid (opacity >= 0.5).  Ghosts and dying tiles are exempt by that rule.
import { Hash, clearance } from './geom.mjs';
import { chipRect, labelRect } from './engine.mjs';

export function newSmoother() { return { prev: new Map(), age: new Map(), tileFrames: 0, eased: 0, snapped: 0, ghosts: 0 }; }

export function smoothFrame(res, sm, spec, { k = 0.3, ghostFrames = 8 } = {}) {
  const gap = spec.gap; const placed = res.placed; const age = new Map();
  const want = placed.map((p) => {
    const a = (sm.age.get(p.t.key) ?? -1) + 1; age.set(p.t.key, a);
    const ghost = a < ghostFrames;                                   // a = 0 on the first frame of a new key
    const so = p.off; const pv = sm.prev.get(p.t.key);
    let o = { ox: so.ox, oy: so.oy };
    if (pv && !ghost) { o = { ox: pv.ox + (so.ox - pv.ox) * k, oy: pv.oy + (so.oy - pv.oy) * k }; if (Math.hypot(o.ox - so.ox, o.oy - so.oy) < 0.05) o = { ox: so.ox, oy: so.oy }; }
    return { p, o, ghost, snapped: o.ox === so.ox && o.oy === so.oy };
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
      if (want[i].ghost) return;                                      // ghosts are exempt (opacity < 0.5)
      for (const x of [r.chip, r.label, r.pin]) {
        if (!x) continue;
        h.query(x.x0 - gap - 1, x.y0 - gap - 1, x.x1 + gap + 1, x.y1 + gap + 1, (o) => {
          if (o._i === i || want[o._i].ghost || (x.kind === 'pin' && o.kind === 'pin')) return;
          if (clearance(x, o) < gap - 1e-6) { if (!want[i].snapped) bad.add(i); if (!want[o._i].snapped) bad.add(o._i); }
        });
      }
    });
    if (bad.size === 0) {
      const out = want.map((w, i) => ({ ...w.p, cx: rs[i].cx, cy: rs[i].cy, chip: rs[i].chip, label: w.p.label ? { slot: w.p.label.slot, rect: rs[i].label } : null, displaced: Math.hypot(w.o.ox, w.o.oy) > 1.5, off: w.o, ghost: w.ghost }));
      sm.prev = new Map(want.map((w) => [w.p.t.key, w.o])); sm.age = age; sm.tileFrames += want.length;
      for (const w of want) { if (w.ghost) sm.ghosts++; else if (w.o.ox === w.p.off.ox && w.o.oy === w.p.off.oy) { if (w.wasEased) sm.snapped++; } else sm.eased++; }
      const items = [];
      out.forEach((q, i) => { if (q.ghost) return; items.push({ owner: q.t.key, kind: 'chip', x0: q.chip.x0, y0: q.chip.y0, x1: q.chip.x1, y1: q.chip.y1 }); if (q.label) items.push({ owner: q.t.key, kind: 'label', x0: q.label.rect.x0, y0: q.label.rect.y0, x1: q.label.rect.x1, y1: q.label.rect.y1 }); if (q.displaced) items.push({ owner: q.t.key, kind: 'pin', ...rs[i].pin }); });
      return { placed: out, items };
    }
    for (const i of bad) { want[i].o = { ox: want[i].p.off.ox, oy: want[i].p.off.oy }; want[i].snapped = true; want[i].wasEased = true; }
  }
  throw new Error('smoothing did not reach a fixpoint');
}
