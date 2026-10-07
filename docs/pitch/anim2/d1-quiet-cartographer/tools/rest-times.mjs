// tools/rest-times.mjs - how long a paused picture takes to come to rest, per scene, on the final dials and skin (headless engine, the same code as the page): 4 s of 4x play, then pause, then count frames until
// engine.busy() is false.  Compared with the prototype's own three skins on the same scenes when --compare is given (it imports the prototype read-only).  -> results/rest-times.json
//   node tools/rest-times.mjs [--compare]
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { makeEngine, loadDocs, PROTO } from '../src/headless.mjs';
import { SKINS } from '../src/skins/index.mjs';
import { args } from './lib.mjs';

const SCENES = [['fresh2', 548, 14], ['fresh2', 556, 15], ['field', 620, 13.5], ['carry1', 295, 14], ['evening1', 120, 14], ['fresh1', 451, 16], ['field', 226, 13.5], ['field', 538, 14], ['field', 620, 12]];
function measure(mk, loadSkins, skin) {
  const out = [];
  for (const [scene, tick, zoom] of SCENES) {
    const { dataset } = mk.docs(); const sc = dataset.scenes.find((x) => x.id === scene); const e = mk.engine({ start: { tick, lat: sc.lat, lng: sc.lng, zoom }, settings: { 'camera.zoom': zoom, 'popup.enabled': false } }); e.setViewport(1440, 900);
    if (skin) { loadSkins(e); e.tuning.set('skin.id', skin); }
    e.transport.setSpeed(4); e.transport.play(); for (let i = 0; i < 240; i++) e.step(1000 / 60); e.transport.pause();
    let idleAt = -1; for (let i = 0; i < 1800; i++) { e.step(1000 / 60); if (!e.busy()) { idleAt = i; break; } }
    out.push({ scene, tick, zoom, framesToRest: idleAt, seconds: idleAt < 0 ? null : +(idleAt / 60).toFixed(1) });
  }
  return out;
}
const mine = measure({ docs: loadDocs, engine: makeEngine }, (e) => { for (const s of SKINS) e.kernel.skins.register(s.id, s, { replace: true }); }, 'quiet-cartographer');
const res = { generated: new Date().toISOString(), method: '4 s of 4x play, pause, frames until engine.busy() is false (the limit is 1800 frames = 30 s; -1 = never)', quietCartographer: mine };
if (args.compare) {
  const mod = (p) => import(pathToFileURL(path.join(PROTO, '..', '..', 'anim', 'prototype', p)).href);
  const H = await mod('src/headless.mjs'); const K = await mod('src/skins/index.mjs'); res.prototype = {};
  for (const skin of ['war-room', 'field-manual', 'map-1863']) res.prototype[skin] = measure({ docs: H.loadDocs, engine: H.makeEngine }, (e) => { for (const s of K.SKINS) e.kernel.skins.register(s.id, s, { replace: true }); }, skin);
}
fs.mkdirSync(path.join(PROTO, 'results'), { recursive: true }); fs.writeFileSync(path.join(PROTO, 'results', 'rest-times.json'), JSON.stringify(res, null, 1));
console.log('quiet-cartographer', mine.map((r) => r.framesToRest).join(' ')); if (res.prototype) for (const [k, v] of Object.entries(res.prototype)) console.log(k.padEnd(18), v.map((r) => r.framesToRest).join(' '));
