// RECORD COPY. The imports below are relative to tmp/bt-spec/pre/ (a scratch folder, not committed): to run it, copy it there first.
// Node-only reproduction (no browser): the effects layer chooses the route of a musket shot (a near puff or the far fog) at SPAWN from the camera of the last update(), so the same shot at the same time
// leaves different sprites behind depending on where the camera was when the shot was spawned (the scrub replay after a seek spawns the shots of the last REPLAY_S seconds with the camera of that moment).
//   node tmp/bt-spec/pre/fx-camera-at-spawn.mjs
import fs from 'node:fs'; import path from 'node:path';
import { nodeWorld, BT } from '../../../docs/battle-theatre/app/tests/node-world.mjs';
import { makeGeo } from '../../../docs/battle-theatre/app/src/geo.mjs'; import { Environment } from '../../../docs/battle-theatre/app/src/environment.mjs'; import { minOf } from '../../../docs/battle-theatre/app/src/clock.mjs';
import { createFx } from '../../../docs/battle-theatre/app/src/fx3d/index.mjs';
const APP = path.resolve(BT, 'app'), D = f => JSON.parse(fs.readFileSync(path.join(APP, 'data/fx3d', f), 'utf8')), J = f => JSON.parse(fs.readFileSync(path.join(BT, f), 'utf8'));
const data = { params: D('params.json'), weapons: D('weapons.json'), fires: D('fires.json') };
const environment = new Environment(J('environment/ephemeris_1863.json'), J('environment/weather_timeline.json'));
const { T } = await nodeWorld(), geo = makeGeo(T), groundAt = (x, z) => T.h(x, z);
const CAM = (x, y, z, fwd = [0, -0.7, 0.7]) => ({ pos: [x, y, z], fwd, fovY: 1.0, aspect: 1.78, heightPx: 800 });
const t = minOf(7, 1, 15, 10) * 60, at = [200, groundAt(200, 300), 300];
const R = data.params.lod.near_radius_m;
for (const [label, cam] of [['camera over the unit (40 m up)', CAM(200, at[1] + 40, 294)], ['camera over the whole field (3000 m up)', CAM(0, 3000, 0)]]) {
  const fx = createFx({ data, environment, geo, groundAt }); fx.update(t - 60, cam);            // the camera of the last frame before the replay
  const modes = []; for (let k = 0; k < 40; k++) modes.push(fx.onFire('us-1c-3d-biddle-121pa', k, t - 20 - k * 0.1, 'long_arm', at, 0.3, { weaponId: null }).mode);
  const fr = fx.update(t, cam); const n = modes.filter(m => m === 'near').length;
  console.log(`${label}: near_radius_m ${R}; of 40 musket shots 20 s before t: ${n} spawned as near puffs, ${40 - n} as fog; the frame at t has ${fr.nEvents} events, ${fr.nSprites} sprites`);
}
