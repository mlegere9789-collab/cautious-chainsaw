import { make } from './headless.mjs';
const [zoom, tick0, speed, sec] = [+process.argv[2]||13.5, +process.argv[3]||295, +process.argv[4]||4, +process.argv[5]||10]; const set = JSON.parse(process.argv[6] || '{}');
const E = make(set); const cam = { lng: -77.235, lat: 39.812, zoom, w: +(process.argv[7]||1440), h: +(process.argv[8]||800) };
let tau = tick0; const dt = 1000 / 60; const t0 = performance.now();
for (let i = 0; i < sec * 60; i++) { tau += speed * 2 * dt / 1000; E.step({ dtMs: dt, tau, cam }); }
const s = E.metrics.summary(); const pick = ['tilesMean','engineMsMean','engineMsP95','popsPerSec','teleportsPerSec','jumpsPerSec','maxStepPx','overlapFrames','netDimsTotal','birthsPerSec'];
console.log(JSON.stringify(set), pick.map(k=>k+'='+s[k]).join(' '), 'forced', E.forcedSolves, 'wall', (performance.now()-t0).toFixed(0));
