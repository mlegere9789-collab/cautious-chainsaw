import { make } from './headless.mjs';
const [zoom, tick0, speed, sec, dmax] = [+process.argv[2]||13.5, +process.argv[3]||295, +process.argv[4]||4, +process.argv[5]||10, +process.argv[6]||0];
const E = make({ 'layout.dMaxPx': dmax }); const cam = { lng: -77.2377, lat: 39.8206 - 0.003, zoom, w: 1440, h: 800 };
let tau = tick0; const dt = 1000 / 60;
for (let i = 0; i < sec * 60; i++) { tau += speed * 2 * dt / 1000; E.step({ dtMs: dt, tau, cam }); }
const s = E.metrics.summary(); const pick = ['tilesMean','onFieldMean','engineMsMean','engineMsP95','solveMsP99','popsPerSec','teleportsPerSec','hopsPerSec','jumpsPerSec','maxStepPx','stepP99Px','jerkP99','jerkMax','overlapFrames','netDimsTotal','birthsPerSec','deathsPerSec'];
console.log(pick.map(k=>k+'='+s[k]).join(' '));
