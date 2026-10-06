// layout-lab/selftest.mjs - the lab proves itself.  Exit code 0 only if every check passes.
//   1. the verifier equals a brute-force reference on random rectangle sets
//   2. the verifier CATCHES deliberately broken layouts (mutation test: a chip nudged onto its neighbour, a label dragged onto a chip, a pin hidden)
//   3. nearestFree is optimal: it matches a 0.5 px brute-force scan of the budget disk on random scenes
//   4. the guarantee: solve() with aggregation returns 0 overlaps, 0 unrepresented, no duplicates, on adversarial scenes
//      (identical coordinates, lines, grids, gaussian piles, up to 478 tiles, both spec presets) and terminates
//   5. negative control: with aggregation switched off, a pile of identical anchors FAILS (tiles dropped) -> the guarantee comes from aggregation
import { loadAll } from './lib/data.mjs';
import { SPECS } from './lib/spec.mjs';
import { verifyFrame, verifyFrameBrute } from './lib/geom.mjs';
import { nearestFree, Occ, solve, newState } from './lib/engine.mjs';
import { synthLeaves, mulberry32 } from './lib/synth.mjs';
import { measure } from './lib/metrics.mjs';

const all = loadAll(); let fails = 0; const log = [];
const ok = (cond, msg) => { if (!cond) { fails++; console.log('FAIL', msg); } else log.push(msg); };

// 1 -------------------------------------------------------------------------------------------------------------------------------
{
  const rnd = mulberry32(7); let bad = 0; const N = 4000;
  for (let k = 0; k < N; k++) {
    const items = []; const n = 2 + Math.floor(rnd() * 40);
    for (let i = 0; i < n; i++) { const x = rnd() * 200; const y = rnd() * 80; const w = 5 + rnd() * 60; const h = 5 + rnd() * 20; items.push({ owner: 'o' + Math.floor(rnd() * 25), kind: ['chip', 'label', 'pin'][Math.floor(rnd() * 3)], x0: x, y0: y, x1: x + w, y1: y + h }); }
    const a = verifyFrame(items, 2); const b = verifyFrameBrute(items, 2);
    if (a.overlaps !== b.overlaps || a.clearanceViolations !== b.clearanceViolations) bad++;
  }
  ok(bad === 0, `verifier == brute force on ${N} random rect sets`);
}
// 3 -------------------------------------------------------------------------------------------------------------------------------
{
  const rnd = mulberry32(11); let bad = 0; let worstGap = 0; const N = 300; const gap = 2;
  for (let k = 0; k < N; k++) {
    const occ = new Occ(64); const m = 1 + Math.floor(rnd() * 14);
    for (let i = 0; i < m; i++) { const x = (rnd() - 0.5) * 120; const y = (rnd() - 0.5) * 60; const w = 10 + rnd() * 60; const h = 8 + rnd() * 14; occ.add({ x0: x, y0: y, x1: x + w, y1: y + h, owner: 'o' + i, kind: 'chip' }); }
    const part = { x0: -25, y0: -10, x1: 25, y1: 10 }; const dMax = 48; const A = { x: 0, y: 0 };
    const got = nearestFree([part], A, A, dMax, occ, 'me', gap);
    let best = null; let bd = 1e9;
    const free = (x, y) => { let f = true; occ.query(-400, -400, 400, 400, (o) => { const r = { x0: x + part.x0, y0: y + part.y0, x1: x + part.x1, y1: y + part.y1 }; const dx = Math.max(r.x0 - o.x1, o.x0 - r.x1); const dy = Math.max(r.y0 - o.y1, o.y0 - r.y1); const c = Math.max(dx, dy); if (c < gap - 1e-9) f = false; }); return f; };   // engine model: axis-aligned gap >= `gap` on at least one axis (conservative vs the verifier's Euclidean clearance)
    for (let x = -dMax; x <= dMax; x += 0.5) for (let y = -dMax; y <= dMax; y += 0.5) { const d = Math.hypot(x, y); if (d > dMax || d >= bd) continue; if (free(x, y)) { bd = d; best = [x, y]; } }
    if (best && !got) bad++;                                        // brute force found a spot the exact search missed
    else if (got) {
      if (!free(got.x, got.y)) bad++;                               // the returned point must be feasible
      const gd = Math.hypot(got.x, got.y);
      if (best) { worstGap = Math.max(worstGap, gd - bd); if (gd > bd + 0.75) bad++; }   // and optimal up to the brute-force grid resolution
    }
  }
  ok(bad === 0, `nearestFree is feasible and optimal on ${N} random scenes (worst excess over the 0.5 px brute force: ${worstGap.toFixed(2)} px)`);
}
// 4 + 5 ---------------------------------------------------------------------------------------------------------------------------
{
  const patterns = ['uniform', 'gauss', 'point', 'line', 'grid', 'twoPoints']; let scenes = 0; let maxRounds = 0; let maxMs = 0; let allZero = true;
  for (const specName of ['standard', 'compact']) {
    const spec = SPECS[specName];
    for (const pattern of patterns) for (const n of [2, 7, 40, 160, 478]) for (const spread of [30, 120, 400, 1500]) for (const seed of [1, 2]) {
      const leaves = synthLeaves(all, spec, { n, pattern, spread, seed });
      const r = solve(all, leaves, { spec, z: 14, dMax: spec.dMax, aggregate: true, pinProtect: true, inertia: true, sticky: true, labels: true, static: true }, newState());
      const m = measure(r, leaves, 14, spec);
      scenes++; maxRounds = Math.max(maxRounds, r.rounds); maxMs = Math.max(maxMs, r.ms);
      if (m.overlaps !== 0 || m.unrepresented !== 0 || m.duplicated !== 0 || m.clearanceViolations !== 0) { allZero = false; console.log('  violation', specName, pattern, n, spread, seed, JSON.stringify({ ov: m.overlaps, unrep: m.unrepresented, dup: m.duplicated, clr: m.clearanceViolations })); }
    }
  }
  ok(allZero, `guarantee holds on ${scenes} adversarial scenes (max rounds ${maxRounds}, slowest solve ${maxMs.toFixed(0)} ms)`);
  // the same guarantee across the whole policy-dial space (budget 0..96, tier, seniority, pin protection on/off is NOT varied: protection is part of the rules)
  { let bad = 0; let n2 = 0; const rnd = mulberry32(99);
    for (let k = 0; k < 240; k++) {
      const spec2 = SPECS[rnd() < 0.5 ? 'standard' : 'compact']; const pattern = patterns[Math.floor(rnd() * patterns.length)]; const n = [5, 30, 90, 250, 478][Math.floor(rnd() * 5)]; const spread = [20, 80, 300, 900][Math.floor(rnd() * 4)];
      const leaves = synthLeaves(all, spec2, { n, pattern, spread, seed: 1000 + k });
      const cfg = { spec: spec2, z: [12, 13, 14, 15][Math.floor(rnd() * 4)], dMax: [0, 16, 32, 48, 72, 96][Math.floor(rnd() * 6)], aggregate: true, pinProtect: true, inertia: rnd() < 0.5, sticky: rnd() < 0.5, labels: true, static: true, seniority: rnd() < 0.5 ? 1e7 : 0 };
      if (rnd() < 0.3) cfg.tier = [[0, 'corps'], [11.6, 'division'], [12.6, 'brigade'], [14, 'regiment']];
      if (rnd() < 0.3) cfg.dMax2 = cfg.dMax + 24;
      const st = newState(); let r; let m;
      for (let rep = 0; rep < 3; rep++) { r = solve(all, leaves, cfg, st); m = measure(r, leaves, cfg.z, spec2); n2++; if (m.overlaps || m.unrepresented || m.duplicated || m.clearanceViolations) { bad++; console.log('  dial violation', JSON.stringify({ k, rep, pattern, n, spread, dMax: cfg.dMax, tier: !!cfg.tier, ov: m.overlaps, unrep: m.unrepresented, dup: m.duplicated, clr: m.clearanceViolations })); break; } }
    }
    ok(bad === 0, `guarantee holds across the policy-dial space (240 random dial settings x 3 consecutive frames = ${n2} solves)`); }
  const spec = SPECS.standard; const leaves = synthLeaves(all, spec, { n: 60, pattern: 'point', seed: 3 });
  const r = solve(all, leaves, { spec, z: 14, dMax: spec.dMax, aggregate: false, pinProtect: true, inertia: false, sticky: false, labels: false, static: true }, newState());
  ok(r.dropped.length > 0, `negative control: 60 identical anchors, displacement only -> ${r.dropped.length} tiles cannot be placed (the guarantee needs aggregation)`);
}
// 2 mutation ------------------------------------------------------------------------------------------------------------------------
{
  const spec = SPECS.standard; const leaves = synthLeaves(all, spec, { n: 60, pattern: 'gauss', spread: 600, seed: 5 });
  const r = solve(all, leaves, { spec, z: 14, dMax: spec.dMax, aggregate: true, pinProtect: true, inertia: false, sticky: false, labels: true, static: true }, newState());
  const base = verifyFrame(r.items, spec.gap - 1e-6);
  ok(base.overlaps === 0, 'mutation baseline: the clean layout has 0 overlaps');
  const chips = r.items.filter((i) => i.kind === 'chip');
  const move = (arr, i, dx, dy) => { arr[i] = { ...arr[i], x0: arr[i].x0 + dx, x1: arr[i].x1 + dx, y0: arr[i].y0 + dy, y1: arr[i].y1 + dy }; };
  { const m = r.items.map((i) => ({ ...i })); const i1 = r.items.indexOf(chips[1]); move(m, i1, chips[0].x0 - m[i1].x0 + 3, chips[0].y0 - m[i1].y0 + 2); ok(verifyFrame(m, spec.gap - 1e-6).overlaps > 0, 'mutation A (a chip dragged onto another chip) is detected'); }
  { const lab = r.items.find((i) => i.kind === 'label'); if (lab) { const m = r.items.map((i) => ({ ...i })); const li = r.items.indexOf(lab); const tgt = chips.find((c) => c.owner !== lab.owner); move(m, li, tgt.x0 - m[li].x0 + 2, tgt.y0 - m[li].y0 + 2); ok(verifyFrame(m, spec.gap - 1e-6).overlaps > 0, 'mutation B (a label dragged onto a foreign chip) is detected'); } else ok(false, 'mutation B needs a label in the scene'); }
  { const pin = r.items.find((i) => i.kind === 'pin'); if (pin) { const m = r.items.map((i) => ({ ...i })); const pi = r.items.indexOf(pin); const tgt = chips.find((c) => c.owner !== pin.owner); move(m, pi, (tgt.x0 + tgt.x1) / 2 - (pin.x0 + pin.x1) / 2, (tgt.y0 + tgt.y1) / 2 - (pin.y0 + pin.y1) / 2); ok(verifyFrame(m, spec.gap - 1e-6).overlaps > 0, 'mutation C (a true-position pin hidden under a foreign chip) is detected'); } else ok(false, 'mutation C needs a displaced tile in the scene'); }
}
console.log(log.map((l) => 'ok   ' + l).join('\n'));
console.log(fails ? `\n${fails} CHECK(S) FAILED` : '\nALL SELFTESTS PASSED');
process.exit(fails ? 1 : 0);
