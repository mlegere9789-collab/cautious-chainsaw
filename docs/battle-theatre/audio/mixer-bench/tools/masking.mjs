// Psychoacoustic boundary estimate: for synthetic shot streams of increasing density, what share of the shots is still individually distinguishable
// at the listener, and how much of the total energy do the masked ones carry? Pure model arithmetic, no audio is rendered.
// A shot j is "individually distinguishable" at margin m dB when its arrival power is at least m dB relative to the sum of the arrival powers of all other shots arriving within +-W/2 of it (m = +12: stands 12 dB above the rest; 0: as loud as all the rest together; -3: within 3 dB below the rest).
// Arrival power uses the same gain chain as the mixer: source level, 1/r, muzzle directivity, ground effect, air absorption at 2 kHz (as a loudness proxy).
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { musketStream, assault } from '../scenarios.mjs'; import { buildTables, absorption } from '../../model/acoustics.mjs';
const here = path.dirname(fileURLToPath(import.meta.url)); const T = buildTables(); const banks = { rifle: [0], cannon: [1] };
function arrivals(ev, c = 346.1) {
  const E = ev.events, n = ev.count, t = new Float64Array(n), p = new Float64Array(n), d = new Float64Array(n);
  for (let i = 0; i < n; i++) { const o = i * 8, x = E[o + 1], y = E[o + 2] - 1.7, z = E[o + 3], dist = Math.hypot(x, y, z), dh = Math.hypot(x, z) + 1e-6, cosT = (E[o + 4] * -x + E[o + 5] * -z) / dh;
    const ti = Math.min(T.n - 1, Math.floor(dist / T.step)), k = 1 - 1.6 * 0.025, gnd = 1 - k * (1 - T.gndLin[ti]);
    const amp = E[o + 7] * (1 + 0.35 * cosT) / Math.max(dist, 2) * gnd * Math.pow(10, -absorption(2000, 25, 60) * dist / 20);
    t[i] = E[o] + dist / c; p[i] = amp * amp; d[i] = dist; }
  const idx = Array.from({ length: n }, (_, i) => i).sort((a, b) => t[a] - t[b]); return { t: idx.map(i => t[i]), p: idx.map(i => p[i]), d: idx.map(i => d[i]) };
}
function analyse(ev, W = 0.05, margins = [-3, 0, 6, 12], window = [10, 20]) {
  const thetas = margins.map(m => -m);
  const { t, p, d } = arrivals(ev), n = t.length; const res = {}; thetas.forEach(th => res[th] = { count: 0, energy: 0, n: 0, totalE: 0 });
  let lo = 0, hi = 0, sumW = 0; // sliding window sum of power
  const pre = new Float64Array(n + 1); for (let i = 0; i < n; i++) pre[i + 1] = pre[i] + p[i];
  for (let j = 0; j < n; j++) {
    if (t[j] < window[0] || t[j] > window[1]) continue;
    while (t[lo] < t[j] - W / 2) lo++; while (hi < n && t[hi] <= t[j] + W / 2) hi++;
    const others = pre[hi] - pre[lo] - p[j];
    for (const th of thetas) { const r = res[th]; r.n++; r.totalE += p[j]; if (p[j] >= others * Math.pow(10, -th / 10)) { r.count++; r.energy += p[j]; } }
  }
  const dur = window[1] - window[0];
  return Object.fromEntries(Object.entries(res).map(([th, r]) => ['m' + (-th), { shotsPerSecDistinguishable: +(r.count / dur).toFixed(1), shareOfShots: +(r.count / r.n).toFixed(3), energyShareOfDistinguishable: +(r.energy / r.totalE).toFixed(3), energyShareInMasked: +(1 - r.energy / r.totalE).toFixed(3) }]));
}
const out = { method: 'power of each shot at the listener vs the summed power of all other shots arriving within +-25 ms; marginDb = required level of the shot relative to the sum of the others', windowSeconds: 0.05, marginsDb: [-3, 0, 6, 12], rows: [] };
for (const rate of [25, 50, 100, 200, 371, 500, 1000, 1667, 3000]) { const ev = musketStream({ rate, dur: 30, banks, seed: 5 }); out.rows.push({ stream: 'musket line, distances 10-1500 m', shotsPerSec: rate, result: analyse(ev) }); }
{ const ev = assault({ dur: 30, banks, seed: 6, defenders: 6500, attackers: 3000, rD: 2.5, rA: 2.0 }); out.rows.push({ stream: 'Angle geometry (371 shots/s: 6500 defenders along the ridge, 3000 attackers 150-1300 m out)', shotsPerSec: 371, result: analyse(ev) }); }
{ const ev = assault({ dur: 30, banks, seed: 7, defenders: 25000, attackers: 15000, rD: 2.5, rA: 2.5 }); out.rows.push({ stream: 'Day-2-scale ceiling geometry (1667 shots/s)', shotsPerSec: 1667, result: analyse(ev) }); }
fs.writeFileSync(path.join(here, '..', 'results', 'masking.json'), JSON.stringify(out, null, 1));
{ const ev = assault({ dur: 30, banks, seed: 6, defenders: 6500, attackers: 3000, rD: 2.5, rA: 2.0 }); out.windowSensitivityAngle371 = Object.fromEntries([0.02, 0.05, 0.1].map(W => [W + ' s', analyse(ev, W)])); }
for (const r of out.rows) console.log(String(r.shotsPerSec).padStart(5), r.stream.slice(0, 40).padEnd(40), [-3, 0, 6, 12].map(m => `m${m >= 0 ? '+' : ''}${m}: ${r.result['m' + m].shotsPerSecDistinguishable}/s (${(r.result['m' + m].shareOfShots * 100).toFixed(0)}%, masked energy ${(r.result['m' + m].energyShareInMasked * 100).toFixed(0)}%)`).join(' | '));
console.log(JSON.stringify(out.windowSensitivityAngle371));
fs.writeFileSync(path.join(here, '..', 'results', 'masking.json'), JSON.stringify(out, null, 1));
