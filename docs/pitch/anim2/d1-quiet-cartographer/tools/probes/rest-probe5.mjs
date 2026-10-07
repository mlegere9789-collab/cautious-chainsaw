import { makeEngine, loadDocs } from '../../src/headless.mjs';
import { SKINS } from '../../src/skins/index.mjs';
const { dataset } = loadDocs();
function run(settings, scene, tick, zoom, play = 240) {
  const sc = dataset.scenes.find((x) => x.id === scene); const e = makeEngine({ start: { tick, lat: sc.lat, lng: sc.lng, zoom }, settings: { 'camera.zoom': zoom, 'popup.enabled': false, ...settings } }); e.setViewport(1440, 900);
  for (const s of SKINS) e.kernel.skins.register(s.id, s, { replace: true }); e.tuning.set('skin.id', 'quiet-cartographer');
  e.transport.setSpeed(4); e.transport.play(); for (let i = 0; i < play; i++) e.step(1000 / 60); e.transport.pause();
  let idleAt = -1; for (let i = 0; i < 1200; i++) { e.step(1000 / 60); if (!e.busy()) { idleAt = i; break; } } return [idleAt, e.frame.tiles.filter((t) => t.life === 'live' && t.kind === 'agg').length];
}
const SC = [['fresh2', 548, 14], ['fresh2', 556, 15], ['field', 620, 13.5], ['carry1', 295, 14], ['evening1', 120, 14], ['fresh1', 451, 16], ['field', 226, 13.5], ['field', 538, 14], ['field', 620, 12]];
for (const dMax of [48, 52, 56, 60, 64]) { const cells = SC.map(([s, t, z]) => { const [i, a] = run({ 'layout.dMaxPx': dMax }, s, t, z); return `${s}/${t}/z${z}: ${i} (${a} agg)`; }); console.log('dMax', dMax, '|', cells.join(' | ')); }
