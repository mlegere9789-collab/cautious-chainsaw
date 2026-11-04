// tools/probes/rest-diag2.mjs - who keeps the engine busy after a paused 4x play?  node tools/probes/rest-diag2.mjs [--scene=fresh2] [--tick=548] [--zoom=14]
import { makeEngine, loadDocs } from '../../src/headless.mjs';
import { SKINS } from '../../src/skins/index.mjs';
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v]; }));
const { dataset } = loadDocs(); const scene = args.scene || 'fresh2'; const tick = +(args.tick || 548); const zoom = +(args.zoom || 14);
const sc = dataset.scenes.find((x) => x.id === scene); const e = makeEngine({ start: { tick, lat: sc.lat, lng: sc.lng, zoom }, settings: { 'camera.zoom': zoom, 'popup.enabled': false } }); e.setViewport(1440, 900);
for (const s of SKINS) e.kernel.skins.register(s.id, s, { replace: true }); e.tuning.set('skin.id', 'quiet-cartographer');
e.transport.setSpeed(4); e.transport.play(); for (let i = 0; i < 240; i++) e.step(1000 / 60); e.transport.pause();
const L = e.modules().layout; const D = e.modules().motion.display;
for (let i = 0; i < 900; i++) { e.step(1000 / 60); if (i % 100 === 0 || (i > 590 && i < 600)) console.log(i, 'busy', e.busy(), 'dirty', e.dirty, 'camMoving', e.camMoving, 'displayBusy', D.busy(), 'stampAge', e.frames - (e.stampFrame ?? 0), 'stamp', L.stamp); }
const live = [...D.tiles.values()]; const off = live.filter((d) => Math.hypot(d.tx - d.ox, d.ty - d.oy) > 0.02 || Math.hypot(d.vx, d.vy) > 0.5 || d.life !== 'live' || Math.abs(d.w - d.tw) > 0.02);
for (const d of off.slice(0, 15)) console.log(d.key.slice(0, 30), d.kind, d.life, 'dist', Math.hypot(d.tx - d.ox, d.ty - d.oy).toFixed(3), 'v', Math.hypot(d.vx, d.vy).toFixed(2), 'dim', d.dim, 'w', d.w, d.tw, 'op', d.op ?? d.opacity);
// trace one frame by frame
if (args.trace) { const key = args.trace; for (let i = 0; i < 40; i++) { const f = e.step(1000 / 60); const st = f.stats || f.motion || {}; const ds = [...D.tiles.values()].filter((d) => d.key.startsWith(key)); console.log(i, JSON.stringify({ b: st.births, d: st.deaths, rl: st.relocations, tr: st.travels, nd: st.netDims, nr: st.netRounds, af: st.anchorFixes }), ds.map((d) => `${d.key.slice(-10)} w=${d.w.toFixed(2)}/${d.tw} v=${Math.hypot(d.vx,d.vy).toFixed(1)} stag=${d.stag} ${d.life} op=${(d.opacity).toFixed(2)} rel=${d.relocate ? 1 : 0} dim=${d.dim ? 1 : 0} mv=${d.mv.toFixed(2)} born=${d.born ? 1 : 0} age=${d.age | 0} bd=${d.birthDelay | 0} o=${d.ox.toFixed(1)},${d.oy.toFixed(1)} t=${d.tx.toFixed(1)},${d.ty.toFixed(1)}`).join(' | ')); } }
