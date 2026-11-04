import { makeEngine, loadDocs } from '../../src/headless.mjs';
import { SKINS } from '../../src/skins/index.mjs';
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v]; }));
const { dataset } = loadDocs(); const sc = dataset.scenes.find((x) => x.id === (args.scene || 'field')); const zoom = +(args.zoom || 12);
const e = makeEngine({ start: { tick: +(args.tick || 620), lat: sc.lat, lng: sc.lng, zoom }, settings: { 'camera.zoom': zoom, 'popup.enabled': false } }); e.setViewport(1440, 900);
for (const s of SKINS) e.kernel.skins.register(s.id, s, { replace: true }); e.tuning.set('skin.id', 'quiet-cartographer');
e.transport.setSpeed(4); e.transport.play(); for (let i = 0; i < 240; i++) e.step(1000 / 60); e.transport.pause();
const D = e.modules().motion.display; const Lm = e.modules().layout; const key = args.key || 'C-16GA-W';
for (let i = 0; i < 300; i++) { const f = e.step(1000 / 60); const d = D.tiles.get(key); if (i % (+args.every || 5) === 0 && d) console.log(i, 'stamp', Lm.stamp, 'ms', (f.solverMs ?? 0).toFixed?.(2), 'rounds', f.rounds, 'tgt', d.tx.toFixed(2), d.ty.toFixed(2), 'at', d.ox.toFixed(2), d.oy.toFixed(2), 'v', Math.hypot(d.vx, d.vy).toFixed(1), 'stag', d.stag); }
