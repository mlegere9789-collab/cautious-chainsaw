// Loss-constraint solver (PDF D.3.2 item 3). Given a unit's documented totals (killed, wounded, missing) and its documented engagement
// windows (relative intensity weights), assign individual casualty events so totals match EXACTLY at the chosen value inside the documented
// range, deterministically per seed. Pinned known fates (named individuals, D.3.2 item 4) are fixed events; the rest are fitted around them.
// Output tier: plausible-procedural per individual; documented at regimental total (labelled by the caller).
import { rand, strId } from './rng.mjs';

// pick a count inside [lo,hi]: 'low' | 'high' | 'mid' | a number (an owner/scenario decision). Callers store the policy; nothing is silently averaged.
export function pickCount(range, policy = 'mid') {
  const [lo, hi] = Array.isArray(range) ? range : [range, range];
  if (typeof policy === 'number') return Math.min(hi, Math.max(lo, Math.round(policy)));
  return policy === 'low' ? lo : policy === 'high' ? hi : Math.round((lo + hi) / 2);
}
function drawTimes(k, windows, uid, seed, stream) {
  const tot = windows.reduce((s, w) => s + w.w * (w.t1 - w.t0), 0);
  const out = [];
  for (let j = 0; j < k; j++) {
    let u = rand(seed, uid, j, stream) * tot;
    for (let wi = 0; wi < windows.length; wi++) {
      const w = windows[wi], m = w.w * (w.t1 - w.t0);
      if (u < m || wi === windows.length - 1) { out.push(w.t0 + Math.min(u / (w.w || 1), w.t1 - w.t0)); break; }
      u -= m;
    }
  }
  return out.sort((a, b) => a - b);
}
export function solveLosses({ unitId, strength, killed, wounded, missing = 0, windows, pinned = [], seed = 1, frontBias = 0.6 }) {
  if (!windows || !windows.length) throw new Error('no engagement windows: casualties cannot be placed (open gap, not invented)');
  const uid = strId(unitId);
  if (killed + wounded + missing > strength) throw new Error(`losses ${killed + wounded + missing} exceed strength ${strength} for ${unitId}`);
  const used = new Set(pinned.map(p => p.agent));
  const cnt = f => pinned.filter(p => p.fate === f).length;
  if (cnt('killed') > killed || cnt('wounded') > wounded || cnt('missing') > missing) throw new Error('pinned fates exceed documented totals');
  const events = pinned.map(p => ({ agent: p.agent, fate: p.fate, t: p.t, pinned: true }));
  const avail = [];
  for (let i = 0; i < strength; i++) if (!used.has(i)) avail.push({ i, key: rand(seed, uid, i, 9) * (1 - frontBias) + (i / strength) * frontBias });
  avail.sort((a, b) => a.key - b.key || a.i - b.i);
  let cursor = 0, stream = 20;
  for (const [fate, k] of [['killed', killed - cnt('killed')], ['wounded', wounded - cnt('wounded')], ['missing', missing - cnt('missing')]]) {
    const times = drawTimes(k, windows, uid, seed, stream++);
    const picks = avail.slice(cursor, cursor + k); cursor += k;
    const sk = stream++;
    picks.sort((a, b) => rand(seed, uid, a.i, sk) - rand(seed, uid, b.i, sk));
    for (let j = 0; j < k; j++) events.push({ agent: picks[j].i, fate, t: times[j], pinned: false });
  }
  events.sort((a, b) => a.t - b.t || a.agent - b.agent);
  return events;
}
export function countsAt(events, t) { const c = { killed: 0, wounded: 0, missing: 0 }; for (const e of events) if (e.t <= t) c[e.fate]++; return c; }
