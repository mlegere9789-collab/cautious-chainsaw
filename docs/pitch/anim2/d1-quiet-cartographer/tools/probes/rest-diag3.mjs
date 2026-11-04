// who is still relaxing?  node tools/probes/rest-diag3.mjs --scene=field --tick=620 --zoom=12
import { makeEngine, loadDocs } from '../../src/headless.mjs';
import { SKINS } from '../../src/skins/index.mjs';
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v]; }));
const { dataset } = loadDocs(); const sc = dataset.scenes.find((x) => x.id === (args.scene || 'field')); const zoom = +(args.zoom || 12);
const e = makeEngine({ start: { tick: +(args.tick || 620), lat: sc.lat, lng: sc.lng, zoom }, settings: { 'camera.zoom': zoom, 'popup.enabled': false } }); e.setViewport(1440, 900);
for (const s of SKINS) e.kernel.skins.register(s.id, s, { replace: true }); e.tuning.set('skin.id', 'quiet-cartographer');
e.transport.setSpeed(4); e.transport.play(); for (let i = 0; i < 240; i++) e.step(1000 / 60); e.transport.pause();
const D = e.modules().motion.display;
for (let i = 0; i < 1500; i++) { e.step(1000 / 60); if (i % 100 === 0) { const live = [...D.tiles.values()].filter((d) => d.life === 'live'); const off = live.filter((d) => Math.hypot(d.tx - d.ox, d.ty - d.oy) > 0.25 && !(d.stag >= 24)); const disp = live.filter((d) => Math.hypot(d.tx, d.ty) > 1.5); console.log(i, 'busy', e.busy(), 'offTarget', off.length, 'displaced', disp.length, 'maxDisp', Math.max(0, ...disp.map((d) => Math.hypot(d.tx, d.ty))).toFixed(1), 'stamp', e.modules().layout.stamp); } }
console.log('transport', JSON.stringify({ playing: e.transport.playing, gliding: e.transport.gliding, speedEff: e.transport.speedEff, tick: e.transport.tick ?? e.transport.t, }));
const live = [...D.tiles.values()].filter((d) => d.life === 'live'); const off = live.filter((d) => Math.hypot(d.tx - d.ox, d.ty - d.oy) > 0.25 && !(d.stag >= 24));
for (const d of off) { const a0 = [d.ax, d.ay, d.px, d.py, d.tx, d.ty]; e.step(1000 / 60); console.log(d.key.slice(0, 30), d.kind, 'ax,ay,px,py,tx,ty before', a0.map((x) => +x.toFixed(2)).join(','), 'after', [d.ax, d.ay, d.px, d.py, d.tx, d.ty].map((x) => +x.toFixed(2)).join(','), 'disp', Math.hypot(d.tx, d.ty).toFixed(1)); }
