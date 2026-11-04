// The 'heard far away' physics (audio/PLAN.md 4.8) and the shell-versus-report crossing (PLAN 3.2). Pure functions.
// Homogeneous atmosphere only: ISO 9613-1 absorption + spherical spreading + the weighted band loss. Documented reports of distant hearing are used as TEST EXPECTATIONS
// (data/audio3d/documented-reports.json); where the homogeneous model cannot reproduce a report (Pittsburgh, 'about 150 miles'), the result says so and the only way to reach it is a
// refraction SCENARIO (plausible-procedural), never a default.
import { airLossDb, spectrumWeights, designPropagationFilter, spreadingDb, powToDb, RURAL_NOISE_FLOOR_DB, SOURCE_PEAK_DB_1M } from './physics.mjs';

/**
 * Level of n identical guns at one far distance (incoherent power sum), dB peak SPL, and the margin over the ambient floor.
 * `extraLossDb` = turbulence / ground / scenario loss (default 0: homogeneous air over open ground; ground effect beyond 1 km is not added, it is small and its sign depends on the profile),
 * `refractionGainDb` = scenario-only upward/downward refraction help (default 0).
 */
export function farFieldMargin({ db1m = SOURCE_PEAK_DB_1M.napoleon_12pdr, n = 1, distance, atm, spectrum = 'cannon', ambientDb = RURAL_NOISE_FLOOR_DB.night, extraLossDb = 0, refractionGainDb = 0 }) {
  const f = designPropagationFilter(airLossDb(atm, distance), spectrumWeights(spectrum));
  const levelDb = db1m + 10 * Math.log10(n) - spreadingDb(distance) + f.gainDb - extraLossDb + refractionGainDb;
  return { distance, n, levelDb, ambientDb, marginDb: levelDb - ambientDb, audible: levelDb > ambientDb, filterFcHz: f.fc, delayS: distance / atm.c };
}
/** The distance at which n guns drop to the ambient floor (bisection), homogeneous atmosphere. */
export function audibleRange(args) { let lo = 10, hi = 1e6; for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (farFieldMargin({ ...args, distance: m }).audible) lo = m; else hi = m; } return lo; }

/** Scenario record for an acoustic-shadow or refraction experiment (never applied unless the user chooses it; plausible-procedural, PDF S.3). */
export const SCENARIOS = Object.freeze({
  homogeneous: { id: 'homogeneous', extraLossDb: 0, refractionGainDb: 0, tier: 'inferred', note: 'uniform atmosphere (the default)' },
  shadow_zone: { id: 'shadow_zone', extraLossDb: 25, refractionGainDb: 0, tier: 'plausible-procedural', note: 'upward-refracting profile: a shadow zone beyond a few km (illustrates Ewell not hearing the 2 July signal; positions are not documented)' },
  downwind_duct: { id: 'downwind_duct', extraLossDb: 0, refractionGainDb: 12, tier: 'plausible-procedural', note: 'downwind / inversion ducting beyond 20 km (the only way the model reaches the Pittsburgh report)' },
});

// ---- constant-drag flight (the arithmetic of audio/model/numbers.mjs): v(x) = v0 exp(-x/L), L = 2m / (rho Cd A), t(x) = L/v0 (exp(x/L) - 1) ----------------
export const DRAG_ROUND = Object.freeze({
  napoleon_round_shot: { m: 5.56, dia: 0.115, v0: 453 }, rifle_3in_shell: { m: 4.3, dia: 0.0762, v0: 370 },
});
export function flightTimeToRange(x, { m, dia, v0 }, cd, rho = 1.18) { const A = Math.PI * dia * dia / 4, L = 2 * m / (rho * cd * A); return (L / v0) * (Math.exp(x / L) - 1); }
/** Range at which the gun's report (travelling at c) overtakes the shot: closer than this the shot is heard first (the whirr before the bang). */
export function reportOvertakesShotAt(proj, cd, c, rho = 1.18) { for (let x = 20; x < 8000; x += 5) if (flightTimeToRange(x, proj, cd, rho) > x / c) return x; return null; }
/** A flat-fire trajectory (positions every dt) from a muzzle toward a target range along unit direction (ux, uz), with the constant-drag speed law and a simple parabola in height. */
export function dragTrajectory(origin, dir, rangeM, proj, cd, { dt = 0.1, t0 = 0, elevRad = 0.02 } = {}) {
  const out = []; const T = flightTimeToRange(rangeM, proj, cd);
  for (let t = 0; t <= T + 1e-9; t += dt) { let lo = 0, hi = rangeM; for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (flightTimeToRange(mid, proj, cd) < t) lo = mid; else hi = mid; }
    const x = (lo + hi) / 2, h = x * Math.tan(elevRad) - (x * x) / (rangeM * 1) * Math.tan(elevRad); out.push({ t: t0 + t, x: origin[0] + dir[0] * x, y: origin[1] + h, z: origin[2] + dir[1] * x }); }
  return out;
}
export { powToDb };
