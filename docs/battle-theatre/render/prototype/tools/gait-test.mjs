// Foot-plant / slip / terrain-contact measurements on the placeholder gait, used to put numbers on the film-grade gates (docs/battle-theatre/render/PLAN.md section 3).
// Pure CPU, no browser. Usage: node gait-test.mjs   -> prints JSON and writes ../../results/gait.json
import fs from 'node:fs'; import path from 'node:path';
import * as CH from '../src/characters.mjs';
const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\//, '')); const root = path.resolve(here, '..');
const rig = CH.FOOT_RIG, pose = CH.newPose(rig), M = new Float32Array(rig.n * 12);
const iL = rig.idx.footL, iR = rig.idx.footR, iP = rig.idx.pelvis;
function joint(b) { const h = rig.head[b], q = b * 12; return [M[q] * h[0] + M[q + 1] * h[1] + M[q + 2] * h[2] + M[q + 3], M[q + 4] * h[0] + M[q + 5] * h[1] + M[q + 6] * h[2] + M[q + 7], M[q + 8] * h[0] + M[q + 9] * h[1] + M[q + 10] * h[2] + M[q + 11]]; }
function cycle(clip, n = 400, v = .5) { const out = []; for (let i = 0; i < n; i++) { CH.poseFoot(pose, clip, i / n, v); CH.fk(rig, pose, M); out.push({ s: i / n, L: joint(iL), R: joint(iR), P: joint(iP) }); } return out; }
const stats = (a) => { const s = [...a].sort((x, y) => x - y); return { mean: a.reduce((x, y) => x + y, 0) / a.length, p50: s[Math.floor(s.length * .5)], p95: s[Math.floor(s.length * .95)], max: s[s.length - 1] }; };
const res = { note: 'placeholder analytic gait (characters.mjs poseFoot), NOT mocap: these are the numbers a hand-made cycle gives; the gates in PLAN.md are stated against them' };
// 1) slip per step in the world frame, for a root moving at speed v relative to the clip's nominal speed
function slip(clip, dur, vNom, speedRatio, rate) { // rate = playback rate multiplier (1 = clip duration)
  const n = 600, cyc = cycle(clip, n); const v = vNom * speedRatio; const T = dur / rate; const out = [];
  for (const side of ['L', 'R']) { const ys = cyc.map(c => c[side][1]); const ymin = Math.min(...ys); const stance = cyc.map((c, i) => ({ i, c })).filter(({ c, i }) => { const nxt = cyc[(i + 1) % n]; return c[side][1] < ymin + 0.04 && (nxt[side][2] - nxt.P[2]) < (c[side][2] - c.P[2]); }); if (!stance.length) continue; /* stance = ankle within 4 cm of its lowest point and moving backward relative to the pelvis */
    // world forward position of the foot over the stance segment (contiguous, handle wrap by shifting)
    const idx = stance.map(x => x.i); const wrapStart = idx.findIndex((x, k) => k > 0 && x - idx[k - 1] > 1); const ordered = wrapStart > 0 ? idx.slice(wrapStart).concat(idx.slice(0, wrapStart).map(x => x + n)) : idx;
    const xs = ordered.map(i => { const c = cyc[i % n]; const t = i / n * T; return c[side][2] - 0 + v * t; }); const zs = ordered.map(i => cyc[i % n][side][0]); out.push({ slipCm: (Math.max(...xs) - Math.min(...xs)) * 100, lateralCm: (Math.max(...zs) - Math.min(...zs)) * 100, stanceFrac: ordered.length / n }); }
  return out;
}
const dur = { march: 1.0, run: 0.62 }; const vNom = { march: 1.15, run: 2.35 }; const clipId = { march: 1, run: 2 };
res.gaitGeometry = {}; for (const k of ['march', 'run']) { const cyc = cycle(clipId[k]); const zs = cyc.map(c => c.L[2]); res.gaitGeometry[k] = { footTravelPerCycleM_modelFrame: +(Math.max(...zs) - Math.min(...zs)).toFixed(3), clipDurationS: dur[k], nominalSpeedMs: vNom[k], impliedStrideM: +(vNom[k] * dur[k]).toFixed(3) }; }
// best-matching root speed (the speed that minimises stance slip) for the analytic cycle
res.slip = {}; for (const k of ['march', 'run']) { res.slip[k] = {}; let best = { v: 0, s: 1e9 }; for (let r = 0.3; r <= 3; r += 0.02) { const o = slip(clipId[k], dur[k], vNom[k], r, 1); const s = Math.max(...o.map(x => x.slipCm)); if (s < best.s) best = { v: vNom[k] * r, s }; }
  res.slip[k].bestMatchedSpeedMs = +best.v.toFixed(3); res.slip[k].slipAtBestCm = +best.s.toFixed(2);
  for (const ratio of [0.5, 0.8, 0.9, 1.0, 1.1, 1.25, 1.5]) { const o = slip(clipId[k], dur[k], vNom[k], ratio, 1); res.slip[k]['speedRatio_' + ratio + '_noRateMatch_cm'] = +Math.max(...o.map(x => x.slipCm)).toFixed(1);
    const o2 = slip(clipId[k], dur[k], vNom[k], ratio, ratio); res.slip[k]['speedRatio_' + ratio + '_rateMatched_cm'] = +Math.max(...o2.map(x => x.slipCm)).toFixed(1); } }
// 2) foot vs terrain on the real DEM without IK: soldier root follows the DEM, feet follow the flat-ground clip
const meta = JSON.parse(fs.readFileSync(path.join(root, 'data/terrain.json'))); const N = meta.N; const u16 = new Uint16Array(fs.readFileSync(path.join(root, 'data/height.bin')).buffer.slice(0)); // little-endian host
const hAt = (x, z) => { const u = (x / meta.widthM + .5) * (N - 1), v = (z / meta.heightM + .5) * (N - 1); const i = Math.max(0, Math.min(N - 2, Math.floor(u))), j = Math.max(0, Math.min(N - 2, Math.floor(v))), fu = u - i, fv = v - j; const g = (a, b) => meta.hmin + u16[(j + b) * N + i + a] / 65535 * (meta.hmax - meta.hmin);
  return g(0, 0) * (1 - fu) * (1 - fv) + g(1, 0) * fu * (1 - fv) + g(0, 1) * (1 - fu) * fv + g(1, 1) * fu * fv; };
// slope statistics across the battlefield
const slopes = []; for (let j = 4; j < N - 4; j += 4) for (let i = 4; i < N - 4; i += 4) { const dx = (u16[j * N + i + 2] - u16[j * N + i - 2]) / 65535 * (meta.hmax - meta.hmin) / (4 * meta.sampleM[0]), dz = (u16[(j + 2) * N + i] - u16[(j - 2) * N + i]) / 65535 * (meta.hmax - meta.hmin) / (4 * meta.sampleM[1]); slopes.push(Math.atan(Math.hypot(dx, dz)) * 180 / Math.PI); }
res.terrainSlopeDeg = { ...Object.fromEntries(Object.entries(stats(slopes)).map(([k, v]) => [k, +v.toFixed(2)])), pctAbove10deg: +(100 * slopes.filter(s => s > 10).length / slopes.length).toFixed(2), pctAbove20deg: +(100 * slopes.filter(s => s > 20).length / slopes.length).toFixed(2), note: 'central difference over 8 m on the 4 m heightfield (3DEP 1 m DEM resampled), whole 6.1 x 6.1 km window' };
// walk a soldier straight up/down the steepest 60 m of slope found along north-south and east-west lines, flat-clip feet, root on terrain
function walkErr(x0, z0, dx, dz, vSp, clip) { const out = []; const L = 60; const n = 2000, cyc = cycle(clip, 200); let worstSlope = 0;
  for (let k = 0; k < n; k++) { const d = k / n * L, x = x0 + dx * d, z = z0 + dz * d; const t = d / vSp; const ph = (t / dur[clip === 1 ? 'march' : 'run']) % 1; const c = cyc[Math.floor(ph * 200) % 200]; const yroot = hAt(x, z);
    for (const side of ['L', 'R']) { const fz = c[side][2] - c.P[2]; const fx = x + dx * fz, fzz = z + dz * fz; const ground = hAt(fx, fzz); const footY = yroot + (c[side][1] - 0.95 + 0.95) - c.P[1] + 0.95; /* ankle height above the root's ground line */ const ankleAbove = c[side][1] - 0.08; const err = (yroot + ankleAbove) - ground; // + = floating, - = penetrating
      if (ankleAbove < 0.03) out.push(err); } }
  return out; }
res.noIK_terrainContact = {};
const Z15 = 2 ** 15 * 512; const worldPx = (lng, lat) => { const sn = Math.sin(lat * Math.PI / 180); return [(lng + 180) / 360 * Z15, (0.5 - Math.log((1 + sn) / (1 - sn)) / (4 * Math.PI)) * Z15]; };
const toXZ = (lng, lat) => { const [px, py] = worldPx(lng, lat); const [bx, by, bw, bh] = meta.z15box; return [(px - bx - bw / 2) * meta.groundMPerZ15Px, (py - by - bh / 2) * meta.groundMPerZ15Px]; };
for (const [name, lng, lat] of [['Little Round Top (summit from 3DEP, +/- 80 m search)', -77.236623, 39.792059], ['Culps Hill (summit from 3DEP, +/- 80 m search)', -77.220422, 39.820115], ['Cemetery Ridge near the Copse of Trees (+/- 80 m search)', -77.2425, 39.8108]]) {
  const [x0, z0] = toXZ(lng, lat), dx = 1, dz = 0;
  // search for the steepest 60 m window near the given start
  let best = null; for (let sx = -80; sx <= 80; sx += 10) for (let sz = -80; sz <= 80; sz += 10) for (const [ddx, ddz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = hAt(x0 + sx, z0 + sz), b = hAt(x0 + sx + ddx * 60, z0 + sz + ddz * 60); const g = Math.abs(b - a) / 60; if (!best || g > best.g) best = { g, sx, sz, ddx, ddz }; }
  const e = walkErr(x0 + best.sx, z0 + best.sz, best.ddx, best.ddz, 1.15, 1); const ab = e.map(Math.abs); res.noIK_terrainContact[name] = { windowSlopeDeg: +(Math.atan(best.g) * 180 / Math.PI).toFixed(1), stanceSamples: e.length, footErrorCm_abs: Object.fromEntries(Object.entries(stats(ab)).map(([k, v]) => [k, +(v * 100).toFixed(1)])), pctStanceOver2cm: +(100 * ab.filter(x => x > .02).length / ab.length).toFixed(1) };
}
// 3) two-bone IK reach: how much leg length variation is available at the rest pose (the gate needs knee flexion headroom)
res.legGeometry = { thighM: +(0.93 - 0.50).toFixed(3), shinM: +(0.50 - 0.08).toFixed(3), restHipHeightM: 0.93, restAnkleHeightM: 0.08, maxReachM: +(0.43 + 0.42).toFixed(3), restPelvisToAnkleM: +(0.93 - 0.08).toFixed(3), note: 'the placeholder rest pose has straight legs (zero knee headroom): a mocap skeleton stands with ~5 to 10 degrees of knee flexion, which gives IK 2 to 4 cm of reach each way before the pelvis must move' };
fs.mkdirSync(path.resolve(root, '../results'), { recursive: true }); fs.writeFileSync(path.resolve(root, '../results/gait.json'), JSON.stringify(res, null, 1)); console.log(JSON.stringify(res, null, 1));
