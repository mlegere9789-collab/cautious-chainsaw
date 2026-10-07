// tools/probes/cadence-probe.mjs - what the solve cadence really saves: headless engine, autoQuality on, frames reported as slow (rawDtMs 50) so the governor goes to cadence 3; the share of frames that
// actually solved and the engine milliseconds per frame, per scene, at 1x and 4x.   node tools/probes/cadence-probe.mjs
import { createEngine } from '../../src/scene/engine.mjs';
import { loadDocs } from '../../src/headless.mjs';
import { SKINS } from '../../src/skins/index.mjs';
const d = loadDocs();
for (const [id, tick, zoom, speed] of [['field', 612, 13.5, 4], ['field', 612, 13.5, 1], ['fresh2', 550, 15, 4], ['fresh2', 550, 15, 1]]) {
  const sc = d.dataset.scenes.find((x) => x.id === id);
  for (const cadence of ['1', 'auto-slow']) {
    const e = createEngine({ autoQuality: cadence !== '1', dataset: d.dataset, tokens: d.tokens, textTable: d.textTable, start: { tick, lat: sc.lat, lng: sc.lng, zoom } });
    for (const s of SKINS) e.kernel.skins.register(s.id, s, { replace: true }); e.tuning.set('skin.id', 'quiet-cartographer'); e.tuning.set('popup.enabled', false); e.setViewport(1440, 900); e.transport.setSpeed(speed); e.transport.play();
    if (cadence === '1') e.tuning.set('layout.solveEvery', '1');
    for (let i = 0; i < 200; i++) e.step(1000 / 60, { rawDtMs: 50 });          // warm-up and governor
    e.metrics.reset?.(); let t = 0; let solved = 0; const N = 600; for (let i = 0; i < N; i++) { const t0 = performance.now(); const f = e.step(1000 / 60, { rawDtMs: 50 }); t += performance.now() - t0; if (f.solved) solved++; }
    console.log(`${id} z${zoom} ${speed}x  cadence ${e.autoEvery()} (${cadence})  engine ${(t / N).toFixed(2)} ms/frame  solved ${(100 * solved / N).toFixed(0)} % of frames`);
  }
}
