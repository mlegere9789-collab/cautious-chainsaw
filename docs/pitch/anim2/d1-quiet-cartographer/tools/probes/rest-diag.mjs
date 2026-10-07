import { makeEngine, loadDocs } from '../../src/headless.mjs';
import { SKINS } from '../../src/skins/index.mjs';
const { dataset } = loadDocs();
const sc = dataset.scenes.find((x) => x.id === 'field'); const e = makeEngine({ start: { tick: 620, lat: sc.lat, lng: sc.lng, zoom: 13.5 }, settings: { 'camera.zoom': 13.5, 'popup.enabled': false, 'layout.dMaxPx': 64 } }); e.setViewport(1440, 900);
for (const s of SKINS) e.kernel.skins.register(s.id, s, { replace: true }); e.tuning.set('skin.id', 'quiet-cartographer');
e.transport.setSpeed(4); e.transport.play(); for (let i = 0; i < 240; i++) e.step(1000 / 60); e.transport.pause();
const L = e.modules().layout; const D = e.modules().motion.display; let lastStamp = L.stamp; const flips = [];
for (let i = 0; i < 1200; i++) {
  e.step(1000 / 60); if (L.stamp !== lastStamp) { flips.push(i); lastStamp = L.stamp; }
  if (i % 100 === 99 || i === 0) { let dying = 0, born = 0, dim = 0, mvl = 0, vel = 0, off = 0, sizeo = 0, ratio = 0, label = 0; for (const d of D.tiles.values()) { if (d.life === 'dying') dying++; if (d.born) born++; if (d.dim) dim++; if (d.mv < 1) mvl++; if (Math.hypot(d.vx, d.vy) > 12) vel++; if (Math.hypot(d.tx - d.ox, d.ty - d.oy) > 0.25) off++; if (Math.abs(d.w - d.tw) > 0.02 || Math.abs(d.h - d.th) > 0.02) sizeo++; if (Math.abs((d.ratioShown ?? 1) - (d.ratioTarget ?? 1)) > 0.002) ratio++; const lb = d.label; if ((lb.opacity > 0 && lb.opacity < 1) || (!lb.vis && lb.feas > 0)) label++; }
    console.log('frame', i, 'busy', e.busy(), '| stamp flips so far', flips.length, 'last', flips.at(-1), '| dying', dying, 'born', born, 'dim', dim, 'mv<1', mvl, 'fast', vel, 'off-target', off, 'size', sizeo, 'ratio', ratio, 'label', label, '| camMoving', e.frame && 0); }
}
console.log('--- offenders at the end');
const spec = e.spec(); const gap = spec.gap;
const live = [...D.tiles.values()].filter((d) => d.life === 'live');
for (const d of live) { const dist = Math.hypot(d.tx - d.ox, d.ty - d.oy); const sp = Math.hypot(d.vx, d.vy); if (dist > 0.25 || sp > 12) {
  // neighbours whose displayed box is within gap of this tile's TARGET box
  const cx = d.ax + d.tx; const cy = d.ay + d.ty; const near = [];
  for (const o of live) { if (o === d) continue; const ox = o.ax + o.ox; const oy = o.ay + o.oy; const g = Math.max(Math.abs(cx - ox) - (d.tw + o.w * o.scale) / 2, Math.abs(cy - oy) - (d.th + o.h * o.scale) / 2); if (g < gap + 0.5) near.push(`${o.key.slice(0, 22)} g=${g.toFixed(2)} sel=${o.selected ? 1 : 0} off=${Math.hypot(o.tx - o.ox, o.ty - o.oy).toFixed(2)} kind=${o.kind}`); }
  console.log(d.key.slice(0, 26), d.kind, 'dist', dist.toFixed(2), 'v', sp.toFixed(1), 'dim', d.dim, 'w', d.w.toFixed(1), 'tw', d.tw, '| disp', Math.hypot(d.tx, d.ty).toFixed(1), '| near:', near.slice(0, 3).join(' ; ')); } }
