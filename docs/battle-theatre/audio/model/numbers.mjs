// Numbers quoted in PLAN.md section 4: delay table, shell-versus-report crossing with a constant-drag model, Doppler.
import { speedOfSound, absorption, groundAttenuation } from './acoustics.mjs';
const c20 = speedOfSound(20), c30 = speedOfSound(30);
console.log('delays s (343 m/s | 20C | 30C):'); for (const d of [30, 100, 300, 500, 1000, 1400, 2000, 3000, 4000, 5000]) console.log(' ', String(d).padStart(5), 'm', (d / 343).toFixed(2), (d / c20).toFixed(2), (d / c30).toFixed(2));
// constant-drag model v(x)=v0 exp(-x/L), L = 2 m / (rho Cd A); arrival time t(x) = L/v0 (exp(x/L)-1)
function cross(name, m, dia, cd, v0, c = 346.1) { const A = Math.PI * dia * dia / 4, rho = 1.18, L = 2 * m / (rho * cd * A); let xc = null; for (let x = 20; x < 6000; x += 5) { const ts = L / v0 * (Math.exp(x / L) - 1), tr = x / c; if (ts > tr && xc === null) xc = x; }
  const at = x => ({ shot: +(L / v0 * (Math.exp(x / L) - 1)).toFixed(2), report: +(x / c).toFixed(2), vAtX: Math.round(v0 * Math.exp(-x / L)) });
  console.log(name, 'L=' + Math.round(L) + ' m', 'report overtakes the shot beyond ~' + xc + ' m;', '700 m', JSON.stringify(at(700)), '1400 m', JSON.stringify(at(1400))); }
cross('12-pdr Napoleon round shot Cd0.5', 5.56, 0.115, 0.5, 453); cross('12-pdr Napoleon round shot Cd0.9 (transonic-ish)', 5.56, 0.115, 0.9, 453); cross('3-inch rifle shell Cd0.3', 4.3, 0.0762, 0.3, 370); cross('3-inch rifle shell Cd0.5', 4.3, 0.0762, 0.5, 370);
console.log('Doppler of a shell passing at 300 m/s head-on then away (source moving, listener still): f ratio approach', (346.1 / (346.1 - 300)).toFixed(2), 'recede', (346.1 / (346.1 + 300)).toFixed(2));
console.log('Doppler of a camera flying at 30 m/s toward a source:', (1 + 30 / 346.1).toFixed(3), 'cents', (1200 * Math.log2(1 + 30 / 346.1)).toFixed(0));
console.log('air absorption dB/km at 25C 60%:', [125, 250, 500, 1000, 2000, 4000, 8000].map(f => f + ':' + (absorption(f, 25, 60) * 1000).toFixed(1)).join(' '));
console.log('in-air loss of the 4 kHz band at 2 km:', (absorption(4000, 25, 60) * 2000).toFixed(0), 'dB;', 'spreading 1->2000 m:', (20 * Math.log10(2000)).toFixed(0), 'dB');
console.log('level of 152 dB-at-1-m musket peak at 100, 500, 1500 m (spreading only):', [100, 500, 1500].map(d => (152 - 20 * Math.log10(d)).toFixed(0)).join(' / '), 'dB; cannon 176:', [500, 1500, 3000].map(d => (176 - 20 * Math.log10(d)).toFixed(0)).join(' / '));
