// CASUALTIES (PDF B.1, B.5 and D.3.2 items 3-4; the project Law: strengths and casualties are ranges with a declared basis, never a fabricated number).
//
// What the record holds: a single printed loss figure for 13 corps rows and 8 brigades (Stone Sentinels, a weak source; PDF B.3 table), and army-level totals and
// killed/wounded/missing splits from several sources (PDF B.1, OR vol. 27: data/casualty-sources.json). It holds NO regimental casualty number (Busey and Martin is print-only).
// So every number below a printed row is a PROCEDURAL SHARE of a printed number, tier plausible-procedural, weak_source true, with its basis written on it:
//  * TOTAL. A printed unit keeps its printed figure. A leaf unit takes the loss of its nearest figured ancestor, less the losses printed for that ancestor's figured sub-units, shared among the same
//    leaf units on the field that share the strength (strength.mjs: equal shares, remainder to the leaves with the lowest hash of the unit id), so the shares add up to the pool EXACTLY.
//    Range: [that figure, that figure x (the largest total any source gives for the army / the Stone Sentinels total)]: the army-level spread of the sources applied to the unit. The printed Stone
//    Sentinels figure is the low end; the high end is not a claim about the unit, it is the army-level source spread (C-046, C-047 are PENDING OWNER).
//  * FATES. killed / wounded / missing are ranges: for each fate the lowest and highest fraction any source gives for the army (casualty-sources.json), applied to the unit's total range. The
//    split that DRIVES THE PICTURE is the middle of each fraction range, normalised to the unit's total by largest remainder (a provisional builder choice logged as DEC-008; the owner decides).
//    A figure that lies down is a killed or wounded man; a missing man (captured, deserted, unidentified dead) is counted but the renderer has no way to show a man leaving the line, so he is not animated.
//  * TIME. A unit's losses are placed ONLY in the printed engagement windows of the unit or of a formation above it (data/engagements.json, rows of the PDF master timeline), by the sim's loss
//    constraint solver (sim/loss_solver.mjs): totals match exactly, monotone in time, each man falls once, every draw from the counter-based RNG so a seek equals sequential play.
//    A loss whose time falls where the unit is not on the map and standing (it is marching in, or not yet arrived) is NOT drawn: it stays in the unit's total and is reported as "not shown".
// A unit with no printed window has its total and its fate ranges but no time: losses are not placed (an open gap), never spread over the day.
import { solveLosses } from '../../../sim/loss_solver.mjs';
import { strId } from '../../../sim/rng.mjs';

export const CAS_TIER = 'plausible-procedural';
export const FATES = ['killed', 'wounded', 'missing'];
export const BASIS_LOSS_PRINTED = 'single loss figure printed in the PDF B.3 table (Stone Sentinels, a weak source); the PDF declares no range for it. The range shown applies the army-level spread of the sources in PDF B.1 and OR vol. 27 (C-046, C-047: PENDING OWNER)';
export const BASIS_LOSS_PROCEDURAL = 'plausible-procedural: the nearest printed loss figure shared by the same leaf units as the strength; no regimental casualty number is in the record (Busey and Martin not available)';
export const FATE_BASIS = 'killed, wounded and missing: the lowest and highest fraction any source gives for the army (PDF B.1, OR27 Letterman) applied to the unit’s total; the picture uses the middle of each range (DEC-008, provisional builder choice)';

// ---- the sources -> fate fractions and the total spread, per army
export function fateModel(src) {
  const out = {};
  for (const army of Object.keys(src.armies)) {
    const a = src.armies[army], fr = {};
    for (const f of FATES) {
      const v = a.fate_sources.filter(s => s[f] != null).map(s => s[f] / s.total);
      if (!v.length) throw new Error(`no source gives ${f} for ${army}`);
      fr[f] = [Math.min(...v), Math.max(...v)];
    }
    const base = a.total_sources.find(s => s.key === a.corps_basis).total, hi = Math.max(...a.total_sources.map(s => (Array.isArray(s.total) ? s.total[1] : s.total)));
    const mid = Object.fromEntries(FATES.map(f => [f, (fr[f][0] + fr[f][1]) / 2])), norm = FATES.reduce((s, f) => s + mid[f], 0);
    out[army] = { fraction: fr, ratio_max: hi / base, mid: Object.fromEntries(FATES.map(f => [f, mid[f] / norm])), base_total: base, high_total: hi, sources: { totals: a.total_sources.map(s => s.key), fates: a.fate_sources.map(s => s.key) } };
  }
  return out;
}
// largest remainder: integers that add to `total` in proportion to `w`; ties go to the earlier index
export function largestRemainder(total, w) {
  const sw = w.reduce((a, b) => a + b, 0), q = w.map(x => (total * x) / sw), n = q.map(Math.floor); let rest = total - n.reduce((a, b) => a + b, 0);
  const order = q.map((x, i) => [x - Math.floor(x), i]).sort((a, b) => b[0] - a[0] || a[1] - b[1]);
  for (const [, i] of order) { if (rest <= 0) break; n[i]++; rest--; }
  return n;
}
// the total range and the three fate ranges of a unit whose total is L (an integer), on an army's model; `point` is the split that drives the picture
export function describeLoss(L, model) {
  const Lmax = Math.round(L * model.ratio_max), point = largestRemainder(L, FATES.map(f => model.mid[f])), fates = {};
  FATES.forEach((f, i) => { const lo = Math.floor(L * model.fraction[f][0]), hi = Math.ceil(Lmax * model.fraction[f][1]); fates[f] = { point: point[i], min: Math.min(lo, point[i]), max: Math.max(hi, point[i]) }; });
  return { total: { printed: L, min: L, max: Lmax }, fates };
}

// ---- shares of a printed loss over the leaf units of a pool (the pools of strength.mjs): exact, deterministic
export function lossPools({ pools, claimed, strengths, byId, isOnField }) {
  const shares = new Map(), out = [];
  for (const p of pools) {
    const owner = byId.get(p.owner), ownerLost = owner.strength.lost, subLost = p.sub_figured.reduce((s, id) => s + byId.get(id).strength.lost, 0), poolLost = ownerLost - subLost;
    const members = [...claimed].filter(([, o]) => o === p.owner).map(([id]) => id).filter(id => isOnField(byId.get(id)));
    const n = members.length, base = n ? Math.floor(poolLost / n) : 0, extra = n ? poolLost - base * n : 0;
    const order = members.slice().sort((a, b) => strId(a) - strId(b) || (a < b ? -1 : 1)), plus = new Set(order.slice(0, extra));
    for (const id of members) shares.set(id, base + (plus.has(id) ? 1 : 0));
    out.push({ owner: p.owner, figure: p.figure, lost: ownerLost, sub_lost: subLost, pool_lost: poolLost, pool_strength: p.pool, leaves_on_field: n, base, extra, rate_pct: p.pool ? Math.round((poolLost / p.pool) * 1000) / 10 : null });
  }
  return { shares, pools: out };
}

// ---- engagement windows: a unit takes the windows of every formation above it
export function windowIndex(engagements) {
  const byUnit = new Map();
  for (const c of engagements.clauses) for (const u of c.units) { if (!byUnit.has(u)) byUnit.set(u, []); byUnit.get(u).push(c); }
  return byUnit;
}
export function windowsOf(id, byId, index) {
  const clauses = []; for (let u = byId.get(id); u; u = u.parent ? byId.get(u.parent) : null) for (const c of index.get(u.id) || []) if (!clauses.includes(c)) clauses.push(c);
  const iv = clauses.map(c => ({ from: c.window.from, to: c.window.to, clauses: [c.id] })).sort((a, b) => a.from - b.from || a.to - b.to), merged = [];
  for (const w of iv) { const l = merged[merged.length - 1]; if (l && w.from <= l.to) { l.to = Math.max(l.to, w.to); l.clauses.push(...w.clauses); } else merged.push({ ...w, clauses: [...w.clauses] }); }
  return { clauses: clauses.map(c => c.id), windows: merged };
}
// the sim solver, on minute windows -> events in minutes {agent, fate, t}; the weights are all 1 (no printed intensity), so a longer window takes more of the losses
export function solvePlan({ unitId, strength, point, windows, seed }) {
  if (!windows.length) return [];
  const ev = solveLosses({ unitId, strength, killed: point.killed, wounded: point.wounded, missing: point.missing, windows: windows.map(w => ({ t0: w.from * 60, t1: w.to * 60, w: 1 })), seed });
  return ev.map(e => ({ agent: e.agent, fate: e.fate, t: e.t / 60 }));
}
// running ranges after `done` of the plan's men have fallen, `k` of them killed and so on (counts of the point split)
export function runningState({ strength, loss, done, counts }) {
  const L = loss.total.printed, scale = (c, f) => { const fr = loss.fates[f]; return fr.point ? [Math.floor((c * fr.min) / fr.point), Math.ceil((c * fr.max) / fr.point)] : [0, 0]; };
  const tot = [done, L ? Math.ceil((done * loss.total.max) / L) : 0], r = f => { const [lo, hi] = scale(counts[f], f); return { min: lo, max: Math.max(lo, hi) }; };
  return { strength_now: { min: Math.max(0, strength - tot[1]), max: Math.max(0, strength - tot[0]) }, killed: r('killed'), wounded: r('wounded'), missing: r('missing'), down: counts.killed + counts.wounded };
}
