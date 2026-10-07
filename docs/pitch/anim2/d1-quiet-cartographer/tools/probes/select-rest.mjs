// tools/probes/select-rest.mjs - frames until the engine is idle after a mark is SELECTED, per zoom, on three real ticks (headless, the final dials and skin).  Development aid for the sweep with a selection.
import { makeEngine, loadDocs } from '../../src/headless.mjs';
import { SKINS } from '../../src/skins/index.mjs';
const { dataset } = loadDocs();
const sc = dataset.scenes.find((x) => x.id === 'field');
for (const tick of [620, 346, 551]) for (const zoom of [11, 12, 13, 13.5, 14, 15, 16.5]) {
  const e = makeEngine({ start: { tick, lat: 39.8117, lng: -77.2347, zoom }, settings: { 'camera.zoom': zoom, 'popup.enabled': false } }); e.setViewport(1440, 900);
  for (const s of SKINS) e.kernel.skins.register(s.id, s, { replace: true }); e.tuning.set('skin.id', 'quiet-cartographer');
  for (let i = 0; i < 400; i++) { e.step(1000 / 60); if (!e.busy() && i > 30) break; }
  const f = e.frame; const c = f.tiles.filter((t) => t.kind === 'leaf' && t.solid).sort((a, b) => Math.hypot(a.x + f.view.dx - 720, a.y + f.view.dy - 450) - Math.hypot(b.x + f.view.dx - 720, b.y + f.view.dy - 450))[0]; if (!c) { console.log(tick, zoom, 'no leaf'); continue; }
  e.select(c.ids[0]); let idle = -1; for (let i = 0; i < 1500; i++) { e.step(1000 / 60); if (!e.busy()) { idle = i; break; } }
  console.log('tick', tick, 'zoom', zoom, 'selected', c.ids[0], 'frames to rest after selecting:', idle);
}
void sc;
