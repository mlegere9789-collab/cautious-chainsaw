// tools/probes/field-prof.mjs - the whole field (tick 620, zoom 13.5) in the headless engine at 4x: mean ms per frame; run it under `node --cpu-prof` to see where the time goes.   node tools/probes/field-prof.mjs [--cadence=1|2|3]
import { makeEngine, loadDocs } from '../../src/headless.mjs';
import { SKINS } from '../../src/skins/index.mjs';
const { dataset } = loadDocs(); const sc = dataset.scenes.find((x) => x.id === 'field');
const e = makeEngine({ start: { tick: 620, lat: sc.lat, lng: sc.lng, zoom: 13.5 }, settings: { 'camera.zoom': 13.5, 'popup.enabled': false } }); const cad = (process.argv.find((a) => a.startsWith('--cadence=')) || '--cadence=1').split('=')[1]; e.tuning.set('layout.solveEvery', cad);
for (const s of SKINS) e.kernel.skins.register(s.id, s, { replace: true }); e.tuning.set('skin.id', 'quiet-cartographer'); e.transport.setSpeed(4); e.transport.play();
for (let i = 0; i < 120; i++) e.step(1000 / 60);
const t0 = performance.now(); let n = 0; for (let i = 0; i < 600; i++) { e.step(1000 / 60); n++; }
console.log('ms/frame', ((performance.now() - t0) / n).toFixed(2));
