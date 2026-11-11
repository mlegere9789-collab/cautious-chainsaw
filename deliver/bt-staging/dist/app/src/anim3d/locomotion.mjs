// Procedural locomotion on foot: a gait generator with exact stance-foot planting.
//  * The stance foot's ground point (heel at landing, flat, ball at toe-off) travels backward in the character frame at exactly the gait's root speed v = step length x cadence, so a unit moved at v has zero slip (G5).
//  * The swing foot follows a Hermite curve that matches the position and velocity at both ends, plus a lift arc.
//  * The pelvis height is the highest height at which the stance legs still reach their feet (table built once per gait, softened), so the bob is the real kinematic bob of the leg length (G6: no over-extension).
// Cadence and step length come from drill-tables.mjs (Hardee / Casey): common time 90 x 28 in., quick time and route step 110 x 28 in., double quick 165 x 33 in., 180 urgent, the run a plausible-procedural range.
// Everything else (lift height, duty factor, sway, lean, arm swing) is authored and tier plausible-procedural.
import { MARCH, WHEEL, stepM, stepsPerMin, INCH } from './drill-tables.mjs';
import * as POSE from './poses.mjs';
import { STANCE } from './poses.mjs';
import { clamp, smooth, D2R } from './qmath.mjs';

const FOOT = { sole: 0.085, ball: 0.14, heel: 0.05 }; // foot_geometry of the rig (ankle above the sole 0.085 m; ball 0.14 m ahead of the ankle, heel 0.05 m behind)
const HIP_DY = -0.005, HIP_X = 0.092, LEG_DMAX = 0.8299; // thigh head relative to the pelvis head; straight-leg reach (replaced by the rig value when known)

const CARRY = { shoulder: POSE.shoulderArms, rss: POSE.rightShoulderShift, atwill: POSE.armsAtWill, trail: POSE.trailArms, run: POSE.runCarry, order: POSE.orderArms, charge: POSE.chargeBayonet };

// gait parameter sets (authored; the cadence and step length are documented, see MARCH)
export const GAITS = {
  common_time: { march: 'common_time', duty: 0.62, lift: 0.055, reach: 0.975, sway: 0.016, yaw: 4.0, lean: 1.0, tilt: 9, armSwing: 0.0, toeOff: 24, strike: 12 },
  quick_time: { march: 'quick_time', duty: 0.61, lift: 0.070, reach: 0.972, sway: 0.019, yaw: 4.5, lean: 1.8, tilt: 7, armSwing: 0.03, toeOff: 26, strike: 14 },
  route_step: { march: 'route_step', duty: 0.61, lift: 0.075, reach: 0.968, sway: 0.024, yaw: 5.0, lean: 2.2, tilt: 7, armSwing: 0.10, toeOff: 26, strike: 14 },
  double_quick: { march: 'double_quick', duty: 0.50, lift: 0.130, reach: 0.945, sway: 0.020, yaw: 6.5, lean: 6.0, tilt: 9, armSwing: 0.20, toeOff: 32, strike: 10, flexArm: true },
  double_quick_urgent: { march: 'double_quick_urgent', duty: 0.47, lift: 0.150, reach: 0.940, sway: 0.020, yaw: 7.0, lean: 7.0, tilt: 10, armSwing: 0.24, toeOff: 34, strike: 8, flexArm: true },
  run: { march: 'run', duty: 0.36, lift: 0.220, reach: 0.925, sway: 0.016, yaw: 8.0, lean: 10.0, tilt: 12, armSwing: 0.28, toeOff: 38, strike: 4, flexArm: true, flight: true },
  mark_time: { march: 'mark_time', duty: 0.55, lift: 0.085, reach: 0.975, sway: 0.010, yaw: 1.5, lean: 0.5, tilt: 4, armSwing: 0.0, toeOff: 12, strike: 6 },
  wheel_pivot_quick: { march: 'wheel_pivot_quick', duty: 0.58, lift: 0.050, reach: 0.975, sway: 0.012, yaw: 2.5, lean: 1.0, tilt: 6, armSwing: 0.0, toeOff: 16, strike: 8 },
  wheel_pivot_dq: { march: 'wheel_pivot_dq', duty: 0.52, lift: 0.075, reach: 0.965, sway: 0.014, yaw: 3.0, lean: 3.0, tilt: 8, armSwing: 0.10, toeOff: 22, strike: 8, flexArm: true },
  wheel_mid25_quick: { march: 'wheel_mid25_quick', duty: 0.60, lift: 0.060, reach: 0.973, sway: 0.016, yaw: 3.5, lean: 1.4, tilt: 7, armSwing: 0.02, toeOff: 22, strike: 11 },
  wheel_mid50_quick: { march: 'wheel_mid50_quick', duty: 0.60, lift: 0.065, reach: 0.972, sway: 0.017, yaw: 4.0, lean: 1.6, tilt: 7, armSwing: 0.03, toeOff: 24, strike: 12 },
  wheel_mid75_quick: { march: 'wheel_mid75_quick', duty: 0.605, lift: 0.068, reach: 0.972, sway: 0.018, yaw: 4.3, lean: 1.7, tilt: 7, armSwing: 0.03, toeOff: 25, strike: 13 },
  wheel_flank_quick: { march: 'wheel_flank_quick', duty: 0.61, lift: 0.070, reach: 0.972, sway: 0.019, yaw: 4.5, lean: 1.8, tilt: 7, armSwing: 0.03, toeOff: 26, strike: 14 },
  wheel_flank_dq: { march: 'wheel_flank_dq', duty: 0.50, lift: 0.130, reach: 0.945, sway: 0.020, yaw: 6.5, lean: 6.0, tilt: 9, armSwing: 0.20, toeOff: 32, strike: 10, flexArm: true },
  backward: { march: 'backward', duty: 0.64, lift: 0.045, reach: 0.975, sway: 0.014, yaw: 3.0, lean: -1.0, tilt: 4, armSwing: 0.0, toeOff: 16, strike: 6, backward: true },
};

const rx = (p, y, z, out) => { const c = Math.cos(p), s = Math.sin(p); out[0] = y * c - z * s; out[1] = y * s + z * c; };
const frac = x => x - Math.floor(x);

export function gaitDef({ id, gait, carry = 'shoulder', speedScale = 1, label, tier = 'documented', propB = 'prop_sword', after = null }) {
  const G = GAITS[gait], M = MARCH[G.march] || WHEEL[G.march];
  const spm = stepsPerMin(M) * speedScale, sl = stepM(M) * (G.backward ? -1 : 1) * 1, T = 120 / spm, v = sl * spm / 60, d = G.duty, vT = v * T;
  const zf = vT * d / 2, h0 = 0.10, h1 = 0.16; // landing pivot window and toe-off window as fractions of the stance (in phase units)
  const strike = G.strike * D2R, toeOff = G.toeOff * D2R;
  const tmp = [0, 0];
  // ankle position (y, z) and pitch of a stance foot at stance phase ph in [0, d]
  function stance(ph, o) {
    const za = zf - vT * ph + STANCE.footZ; // the flat-foot ankle plan
    let p = 0, y = FOOT.sole, z = za;
    if (ph < h0 * d / 0.62) { const k = 1 - smooth(0, h0 * d / 0.62, ph); p = -strike * k; // pivot about the heel
      rx(p, -FOOT.sole, -FOOT.heel, tmp); const hz = za - FOOT.heel; y = 0 - tmp[0]; z = hz - tmp[1]; }
    else if (ph > d - h1) { const k = smooth(d - h1, d, ph); p = toeOff * k; // pivot about the ball
      rx(p, -FOOT.sole, FOOT.ball, tmp); const bz = za + FOOT.ball; y = 0 - tmp[0]; z = bz - tmp[1]; }
    o[0] = y; o[1] = z; o[2] = p; return o;
  }
  const S0 = stance(0, [0, 0, 0]), S1 = stance(d, [0, 0, 0]); const eps = 1e-4; const a = stance(eps, [0, 0, 0]), b = stance(d - eps, [0, 0, 0]);
  const dS0 = [(a[0] - S0[0]) / eps, (a[1] - S0[1]) / eps], dS1 = [(S1[0] - b[0]) / eps, (S1[1] - b[1]) / eps]; // derivatives per unit phase
  const swing = (ph, o) => { // ph in (d, 1)
    const u = (ph - d) / (1 - d), w = 1 - d; const u2 = u * u, u3 = u2 * u;
    const h00 = 2 * u3 - 3 * u2 + 1, h10 = u3 - 2 * u2 + u, h01 = -2 * u3 + 3 * u2, h11 = u3 - u2;
    o[0] = h00 * S1[0] + h10 * dS1[0] * w + h01 * S0[0] + h11 * dS0[0] * w + G.lift * Math.pow(Math.sin(Math.PI * u), 1.1);
    o[1] = h00 * S1[1] + h10 * dS1[1] * w + h01 * (S0[1] + 0) + h11 * dS0[1] * w;
    o[2] = S1[2] + (S0[2] - S1[2]) * smooth(0.05, 0.85, u) - 0.0;
    return o;
  };
  const foot = (ph, o) => (ph < d ? stance(ph, o) : swing(ph, o));
  // contact weight (the lowest sole point is planted while > 0.999)
  const contact = ph => (ph < d ? 1 : 0);
  // pelvis state functions
  const phi = (t, side) => frac(t / T + (side ? 0.5 : 0));
  const yawOf = phL => -G.yaw * Math.cos(2 * Math.PI * phL) * D2R, swayOf = phL => G.sway * Math.sin(2 * Math.PI * phL);
  // hip height table: for each phase of the cycle, the highest pelvis height at which every planted foot is reachable
  const NT = 256, need = new Float64Array(NT), o1 = [0, 0, 0];
  for (let i = 0; i < NT; i++) {
    const t = (i / NT) * T; let hmin = Infinity;
    for (let side = 0; side < 2; side++) {
      const ph = phi(t, side); if (ph >= d && !G.flight) { /* swing foot: not a constraint */ }
      if (ph < d) { foot(ph, o1); const phL = phi(t, 0), sg = side ? -1 : 1, yaw = yawOf(phL), sx = swayOf(phL);
        const hx = sx + sg * HIP_X * Math.cos(yaw), hz = -sg * HIP_X * Math.sin(yaw), ax = sg * (HIP_X + 0), az = o1[1];
        const lim = LEG_DMAX * G.reach, hor = (hx - ax) ** 2 + (hz - az) ** 2; const hh = o1[0] + Math.sqrt(Math.max(0.01, lim * lim - hor)); hmin = Math.min(hmin, hh); }
    }
    need[i] = hmin;
  }
  // fill the flight gaps (no planted foot) by circular linear interpolation between the nearest planted values
  { const src = Float64Array.from(need); const fin = []; for (let i = 0; i < NT; i++) if (isFinite(src[i])) fin.push(i);
    if (!fin.length) throw new Error('gait ' + id + ': no planted foot at any phase');
    for (let i = 0; i < NT; i++) if (!isFinite(src[i])) { let ia = 1; while (!isFinite(src[(i - ia + NT) % NT])) ia++; let ib = 1; while (!isFinite(src[(i + ib) % NT])) ib++;
      const va = src[(i - ia + NT) % NT], vb = src[(i + ib) % NT]; need[i] = (va * ib + vb * ia) / (ia + ib); } }
  // soften: h = min(need, circular box blur(h)) three times (never above the reach limit)
  let hs = Float64Array.from(need); const W = Math.max(2, Math.round(NT * 0.05));
  for (let rep = 0; rep < 3; rep++) { const nx = new Float64Array(NT); for (let i = 0; i < NT; i++) { let s = 0; for (let k = -W; k <= W; k++) s += hs[(i + k + NT) % NT]; nx[i] = Math.min(need[i], s / (2 * W + 1)); } hs = nx; }
  if (G.flight) { for (let i = 0; i < NT; i++) { const t = (i / NT) * T, ph0 = phi(t, 0), ph1 = phi(t, 1); const air = ph0 >= d && ph1 >= d; if (air) hs[i] = Math.max(hs[i], 0.955); } } // the pelvis rises in the flight phase
  const hipAt = t => { const x = frac(t / T) * NT, i0 = Math.floor(x), f = x - i0; return hs[i0 % NT] * (1 - f) + hs[(i0 + 1) % NT] * f; };

  const fL = [0, 0, 0], fR = [0, 0, 0];
  const base = typeof carry === 'function' ? carry : CARRY[carry];
  const def = {
    id, loop: true, dur: T, fps: 60, propB, family: 'locomotion',
    meta: { gait, carry, label: label || `${gait} (${carry})`, stepsPerMin: spm, stepM: Math.abs(sl), rootSpeed: v, duty: d, cycleS: T, tier: G.march === 'run' ? 'plausible-procedural' : tier, src: M.src, gap: M.gap || null,
      cadenceNote: 'speed = step length x steps/min /60 (Hardee/Casey); a unit moved at rootSpeed has zero foot slip', stanceFractionOfCycle: d },
    eval(t, spec) {
      base(spec);
      const phL = phi(t, 0), phR = phi(t, 1);
      foot(phL, fL); foot(phR, fR);
      const yaw = yawOf(phL), sx = swayOf(phL), hipY = hipAt(t), pelY = hipY - 0.915;
      const lean = G.lean;
      spec.set('pel', sx, pelY, 0.0).set('pelE', G.tilt, yaw / D2R, 0.0 + (G.flight ? 0 : -1.2 * Math.sin(2 * Math.PI * phL)));
      spec.set('spE', lean - G.tilt, -yaw / D2R * 0.8, 0.8 * Math.sin(2 * Math.PI * phL)).set('hdE', -lean * 0.7, yaw / D2R * 0.3, 0).set('nkE', 0, 0, 0);
      spec.set('fl', HIP_X, fL[0], fL[1]).set('fr', -HIP_X, fR[0], fR[1]).set('fle', fL[2] / D2R, 6, 0).set('fre', fR[2] / D2R, -6, 0).set('lcont', contact(phL)).set('rcont', contact(phR));
      spec.set('tl', phL < d ? clamp((fL[2] / D2R) * 0.5, 0, 30) : 6).set('tr', phR < d ? clamp((fR[2] / D2R) * 0.5, 0, 30) : 6);
      // the carried piece rides with the body
      spec.v[spec_off('rp')] += sx * 0.5; spec.v[spec_off('rp') + 1] += pelY * 0.9; spec.v[spec_off('rp') + 2] += 0;
      // the free left arm swings against the left leg
      const A = G.armSwing, lp = spec.get('lhp', 0), ly = spec.get('lhp', 1), lz = spec.get('lhp', 2);
      if (G.flexArm) spec.set('lhp', lp, ly + 0.14 - 0.02 * Math.cos(4 * Math.PI * phL), lz + 0.16 - 0.38 * A * Math.cos(2 * Math.PI * phL)).set('lep', 0.5, -0.6, -1);
      else spec.set('lhp', lp, ly, lz - A * Math.cos(2 * Math.PI * phL));
      if (carry === 'run' || carry === 'trail') { spec.v[spec_off('rp') + 2] += 0.05 * Math.cos(2 * Math.PI * phL); }
      if (after) after(spec, phL, sx, pelY, t);
    },
  };
  return def;
}
import { CH } from './figure-pose.mjs';
const spec_off = name => CH[name][0];

// the standing positions (attention, order arms, at ease, rest): small breathing and weight-shift loops
export function standDef({ id, kind, dur = 6 }) {
  const base = kind === 'order' ? POSE.orderArms : kind === 'shoulder' ? POSE.shoulderArms : kind === 'rss' ? POSE.rightShoulderShift : kind === 'trail' ? POSE.trailArms : POSE.shoulderArms;
  const ease = kind === 'rest' || kind === 'atease';
  return {
    id, loop: true, dur, fps: 30, propB: 'prop_sword', family: 'stand',
    meta: { kind, label: ease ? 'rest / at ease (no silence or steadiness required)' : 'at attention (' + kind + ')', tier: 'documented', src: ['HAR-S23'], rootSpeed: 0, note: 'Rest: "the recruits will not be required to preserve silence or steadiness" (H.S.S. paras 136-139, 150-153); the idle sway amplitude is plausible-procedural' },
    eval(t, spec) {
      base(spec); const w = t / dur * 2 * Math.PI, br = Math.sin(w * 2) * 0.004, shiftAmp = ease ? 0.035 : 0.006, sh = Math.sin(w) * shiftAmp;
      spec.set('pel', sh * 0.6, br * 0.5 - (ease ? 0.012 : 0), 0).set('pelE', 0, ease ? 4 * Math.sin(w * 0.5) : 0, ease ? -2.2 * Math.sin(w) : 0).set('spE', br * 120, ease ? -3 * Math.sin(w * 0.5) : 0, ease ? 1.5 * Math.sin(w) : 0);
      spec.set('hdE', ease ? 2 * Math.sin(w * 0.7) : 0, ease ? 14 * Math.sin(w * 0.5 + 1) : 0, 0).set('jaw', 0);
      if (ease) { spec.set('fl', 0.13 + sh * 0.3, 0.085, 0.02).set('fr', -0.19 + sh * 0.3, 0.085, -0.05).set('fle', 0, 24, 0).set('fre', 0, -40, 0); }
      spec.v[spec_off('rp') + 1] += br * 0.8;
    },
  };
}
export { CARRY, FOOT };
