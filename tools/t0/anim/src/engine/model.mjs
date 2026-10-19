// data/model.mjs - the BATTLE: the real order of battle and the real placement keyframes, rehydrated from the inlined dataset, plus the one function that answers
// "which units are on the field at this (fractional) tick, and where": visibleAt().  Pure and deterministic; the same resolver feeds the layout, the renderer, the
// tests and the metrics (the owner's no-split-pipeline rule: 03-data-fuel.md recommends ONE pure tilesAt resolver, not four).
//
// Nothing is invented here:
//   * a unit exists from its first keyframe on (carry-forward afterwards) under rule 'carry', or only near fresh keyframes under 'window' / 'snapshot';
//   * position = the interpolation model of interp.model between the unit's own keyframes (Modelled); strength, disposition and the note are those of the unit's CURRENT keyframe,
//     held until the next one (a placement strength is NOT a casualty record, 03-data-fuel.md fact 5, so it is never interpolated into numbers that are not in the data);
//   * side is the id prefix, EXCEPT the 10 ids whose state code contradicts it: those are 'unknown' (Contested).
export const ECHELON = { regiment: 1, battery: 1, brigade: 2, battalion: 2, division: 3, corps: 4, army: 5 };

export function createBattle(ds, kernel, tok) {
  const nodes = new Map();
  nodes.set('ROOT', { id: 'ROOT', side: null, kind: 'root', parent: null, designation: null, depth: 0 });
  for (const n of ds.nodes) nodes.set(n.id, { id: n.id, side: n.side, kind: n.kind, parent: n.parent, designation: n.designation, virtual: n.virtual, depth: 0 });
  const depthOf = (id, guard = 0) => { if (id === 'ROOT') return 0; const n = nodes.get(id); if (!n || guard > 40) return 1; if (n.depth) return n.depth; n.depth = 1 + depthOf(n.parent || 'ROOT', guard + 1); return n.depth; };
  for (const id of nodes.keys()) depthOf(id);
  const chainOf = (id) => { const out = []; let c = id; const seen = new Set(); while (c && !seen.has(c)) { seen.add(c); out.push(c); if (c === 'ROOT') break; c = nodes.get(c)?.parent || 'ROOT'; } return out; };

  const units = new Map(); const snap = new Map();
  const disp = ds.dispositions;
  for (const r of ds.units) {
    const kf = r.kf.map((k) => ({ tick: k[0], lat: k[1], lng: k[2], strength: k[3], bearing: k[4], disposition: disp[k[5]], note: k[6] >= 0 ? ds.notes[k[6]] : null }));
    const u = {
      id: r.id, side: r.side, prefixSide: r.prefixSide, sideGuess: r.sideGuess, sideFlag: r.sideFlag, kind: r.kind, echelon: ECHELON[r.kind] || 1, arm: r.arm, inOob: r.inOob,
      parentSource: r.parentSource, parent: r.parent, designation: r.designation, short: r.short, label: r.label, strengthRef: r.strengthRef, kf, raw: r.rows || null, chain: chainOf(r.id), depth: nodes.get(r.id)?.depth ?? 1,
      track: null,
    };
    units.set(u.id, u);
    kf.forEach((k, idx) => { let a = snap.get(k.tick); if (!a) snap.set(k.tick, a = []); a.push({ u, idx }); });
  }
  // units may be missing from the hierarchy node table (95 ids without an order-of-battle parent): register them so chains resolve
  for (const u of units.values()) if (!nodes.has(u.id)) { nodes.set(u.id, { id: u.id, side: u.side, kind: u.kind, parent: u.parent || 'ROOT', designation: u.designation, depth: 1 }); }
  const snapTicks = [...snap.keys()].sort((a, b) => a - b);

  const S = { model: null, endSlopes: null };
  /** (re)build every unit's track for the current interpolation settings */
  function buildTracks() {
    const model = tok('interp.model'); const endSlopes = tok('interp.endSlopes');
    if (S.model === model && S.endSlopes === endSlopes) return false;
    const def = kernel.interp.get(model);
    for (const u of units.values()) u.track = def.build(u.kf.map((k) => [k.tick, k.lat, k.lng]), { endSlopes, kf: u.kf });
    S.model = model; S.endSlopes = endSlopes; return true;
  }
  buildTracks();

  const sample = { present: false, lat: 0, lng: 0, vLat: 0, vLng: 0, seg: 0, s: 0, moving: false };

  /** state of one unit at tau under the current model, or null before its first keyframe */
  function stateOf(u, tau) {
    sample.ov = false;                                                    // a motion model may OVERRIDE strength / bearing / disposition (the production reproduction blends them between ticks)
    u.track.at(tau, sample);
    if (!sample.present) return null;
    const k = u.kf[sample.seg]; const nextK = u.kf[sample.seg + 1]; const ov = sample.ov; const strength = ov ? sample.strength : k.strength;
    return {
      lat: sample.lat, lng: sample.lng, vLat: sample.vLat, vLng: sample.vLng, moving: sample.moving, seg: sample.seg, s: sample.s,
      strength, ratio: Math.min(1, (strength || 0) / u.strengthRef), disposition: ov ? sample.disposition : k.disposition, bearing: ov ? sample.bearing : k.bearing, note: k.note,
      kfTick: k.tick, ageTicks: Math.max(0, tau - k.tick), untilNext: nextK ? nextK.tick - tau : Infinity, nKf: u.kf.length,
    };
  }

  /** The units on the field at tau.  rule: 'carry' (every unit with a keyframe up to tau; what the site draws today), 'window' (only units within `windowTicks` ticks of one of their keyframes,
   *  before or after), 'snapshot' (only the units recorded at the latest populated tick, held there). */
  function visibleAt(tau, opts = {}) {
    const rule = opts.rule || 'carry'; const win = opts.windowTicks ?? 24;      // ANIM: the visibility rule is the app's own (carry-forward: a unit stays at its last keyframe), not a dial
    const out = [];
    if (rule === 'snapshot') {
      let lo = 0; let hi = snapTicks.length - 1; let t = -1;
      while (lo <= hi) { const mid = (lo + hi) >> 1; if (snapTicks[mid] <= tau) { t = snapTicks[mid]; lo = mid + 1; } else hi = mid - 1; }
      if (t < 0) return out;
      for (const { u, idx } of snap.get(t)) { const k = u.kf[idx]; out.push({ u, st: { lat: k.lat, lng: k.lng, vLat: 0, vLng: 0, moving: false, seg: idx, s: 0, strength: k.strength, ratio: Math.min(1, (k.strength || 0) / u.strengthRef), disposition: k.disposition, bearing: k.bearing, note: k.note, kfTick: k.tick, ageTicks: Math.max(0, tau - k.tick), untilNext: Infinity, nKf: u.kf.length } }); }
      return out;
    }
    for (const u of units.values()) {
      const appear = u.track.appearTau; if (tau < (appear === undefined ? u.kf[0].tick : appear)) continue;
      const st = stateOf(u, tau); if (!st) continue;
      if (rule === 'window' && !(st.ageTicks <= win || st.untilNext <= win)) continue;
      out.push({ u, st });
    }
    return out;
  }

  return { units, nodes, snap, snapTicks, dispositions: disp, visibleAt, stateOf, buildTracks, ds, chainOf };
}
