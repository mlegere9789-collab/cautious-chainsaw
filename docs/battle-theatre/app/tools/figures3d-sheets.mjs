// Software-rasteriser contact sheets of the figure family (node only; no GPU, no browser). Writes PNGs to tests/shots-figures3d/. node docs/battle-theatre/app/tools/figures3d-sheets.mjs [--only name] [--quick]
// What it checks: shape, proportion, detail, silhouette. What it does NOT show: shader look (cloth, skin, eyes in the product), animation, lighting.
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { createFigureSystem, resolveColours, unpackInstance, humanRig, horseRig, gunRig, GLOBAL_MATERIALS } from '../src/figures3d/index.mjs';
import { partsForFigure, partsAtLod } from '../src/figures3d/library.mjs';
import { BODY_SHAPES } from '../src/figures3d/body.mjs';
import { pngEncode } from '../src/figures3d/png.mjs';
import { renderTile, renderTileShaded, composeSheet, poseMeshes, translateMeshes, quatX, quatY, quatZ } from '../src/figures3d/sheet.mjs';
import { Kit, manifestFor } from '../src/history/manifest.mjs';
import { MAT } from '../src/figures3d/palette.mjs';
import { poseFromClip, skinMatrices, midBones } from './fig-anim-pose.mjs';
import { Mesh, tube } from '../src/figures3d/meshkit.mjs';
import { H } from '../src/figures3d/body.mjs';

import { kit, sys, lib, pickMan, plain, palOf, shapeOf, manMeshes, lodMeshes, SUBJ, APP, envFor } from './fig-common.mjs';
import { createEnv } from '../src/figures3d/shader.mjs';
const OUT = path.join(APP, 'tests/shots-figures3d');
const args = process.argv.slice(2), only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null, quick = args.includes('--quick');
fs.mkdirSync(OUT, { recursive: true });
const png = (name, sheet) => { fs.writeFileSync(path.join(OUT, name), pngEncode(sheet.w, sheet.h, sheet.rgba)); console.log('wrote', name, sheet.w + 'x' + sheet.h); };
const H_TILE = quick ? 360 : 520, ppm = (H_TILE - 20) / 1.95;

// ---- the standard sheet of one man: LOD0 front / 3/4 / side / back, LOD1 front / 3/4, LOD2 front / 3/4; then close-ups of LOD0 (head front, head 3/4, upper body, hands-and-lock, boots)
function manSheet(name, { m, r }) {
  const pal = palOf(r, 0.3), env = envFor(r, { hero: true }), tiles = [], W = Math.round(H_TILE * 0.62), spec = Object.fromEntries([MAT.BRASS, MAT.STEEL, MAT.SILVER, MAT.GOLD, MAT.TIN, MAT.LEATHER_BLACK, MAT.BOOT, MAT.SKIN, MAT.EYE_WHITE, MAT.IRIS].map(i => [i, 0.5]));
  const m0 = lodMeshes(r, 0), m1 = lodMeshes(r, 1), m2 = lodMeshes(r, 2);
  for (const [ms, yaws] of [[m0, [0, 45, 90, 180]], [m1, [0, 45]], [m2, [0, 45]]]) for (const yw of yaws) tiles.push(renderTileShaded(ms, { w: W, h: H_TILE, yaw: yw * Math.PI / 180, ppm, cy: 0.97 * unpackInstance(r.words).stature_scale, env }));
  png(name + '_lods.png', composeSheet(tiles, 4));
  const cl = [], S = quick ? 1.0 : 1.4, cw = Math.round(430 * S), ch = Math.round(430 * S);
  const st = unpackInstance(r.words).stature_scale, view = (yaw, cy, ppm2, cx = 0) => renderTileShaded(m0, { w: cw, h: ch, yaw: yaw * Math.PI / 180, ppm: ppm2 * S, cy: cy * st, cx: cx * st, env });
  cl.push(view(0, 1.60, 2200), view(35, 1.60, 2200), view(90, 1.60, 2200), view(0, 1.25, 1000), view(180, 1.25, 1000), view(0, 0.80, 800), view(90, 0.85, 500, 0), view(0, 0.12, 1300, 0.09));
  const sockets = lib.mesh('hands', 0); void sockets;
  png(name + '_close.png', composeSheet(cl, 4));
}
const want = n => !only || only === n;
for (const [n, f] of Object.entries(SUBJ)) if (want(n)) { try { manSheet(n, f()); } catch (e) { console.log('skip', n, e.message); } }

// ---- mounted trooper: the rider is posed with ANIMATION's baked clip rider_walk (read-only use of src/anim3d through tools/fig-anim-pose.mjs): root at the horse's saddle_seat socket (spine2 + 0.10, -0.06).
// Round 3: shaded; the bridle hand is closed (grip 0.92) on the rein point of the horse (socket-spec.json reins), plus a close view of the hand and the reins.
function mounted() {
  const { r } = pickMan('DEFAULT.union.cavalry', 'private', x => !x.variant.flag && !x.variant.instrument && !(x.words[3] & 4)), env = envFor(r, { hero: false });
  const seat = [0, 1.44 + 0.10, 0.10 - 0.06], horse = [lib.mesh('horse:riding', 0).finalize()], grip = [0.92, 0.25];
  const rider = poseFromClip(lodMeshes(r, 0), 'rider_walk', 0.25, { root: seat, grip });
  const tiles = []; for (const [yw, cx] of [[90, 0.15], [45, 0.1], [0, 0.0]]) tiles.push(renderTileShaded([...horse, ...rider], { w: 700, h: 640, yaw: yw * Math.PI / 180, ppm: 250, cy: 1.2, cz: 0.2, env }));
  const rider2 = poseFromClip(lodMeshes(r, 0), 'rider_sabre_carry', 0.4, { root: seat, grip });
  tiles.push(renderTileShaded([...horse, ...rider2], { w: 700, h: 640, yaw: Math.PI / 2, ppm: 250, cy: 1.2, cz: 0.2, env }));
  for (const lod of [1, 2]) { const hm = [lib.mesh('horse:riding', lod).finalize()], rm = poseFromClip(lodMeshes(r, lod), 'rider_walk', 0.25, { root: seat, bones: midBones() }); tiles.push(renderTileShaded([...hm, ...rm], { w: 700, h: 640, yaw: Math.PI / 2, ppm: 250, cy: 1.2, cz: 0.2, env })); }
  png('cavalry_trooper_on_horse.png', composeSheet(tiles, 3));
  // the bridle hand: three views at 1100 px per metre round the left fist (world 0.153, 1.665, 0.443)
  const ht = []; for (const yw of [90, 35, 0]) ht.push(renderTileShaded([...horse, ...rider], { w: 520, h: 460, yaw: yw * Math.PI / 180, ppm: 1100, cx: 0.12, cy: 1.60, cz: 0.50, env }));
  png('rider_hands_reins.png', composeSheet(ht, 3));
}
const cx0 = 0;
if (want('cavalry')) mounted();

// ---- gun crew with a Napoleon. 'gun_crew_napoleon.png': the detachment at its DRILL POSTS (para 95, drill-tables crewPosts: No. 1 right and No. 2 left about two feet outside the wheels abreast the front of the
// wheel, Nos. 3 and 4 in line with the knob of the cascable covering them, the gunner at the end of the trail handspike), each in the first beat of his baked clip, turned to the piece, implements bound to the
// prop bones. 'gun_crew_working.png': the same men at the clips' working places (meta.workPos) in the moments of sponge, load, point and ready.
import { crewPosts } from '../src/anim3d/drill-tables.mjs';
function gunCrew() {
  const { r: r1 } = pickMan('DEFAULT.union.artillery', 'private', x => !x.variant.flag && !(x.words[3] & 4), 'cannoneer');
  const gp = palOf(r1, 0.3); gp[MAT.CARRIAGE_PAINT] = [75, 82, 48]; gp[MAT.BRONZE] = [154, 106, 46];
  const genv = createEnv({ palette: gp, headMaps: null, wear: 0.3, dirt: 0.3 });
  const gun = [lib.mesh('tube:napoleon_12pdr_m1857', 0).finalize(), lib.mesh('carriage', 0).finalize(), lib.mesh('limber', 0).finalize()];
  const bindTo = (m, bone, from, to) => { const pos = Float32Array.from(m.pos); for (let i = 0; i < m.nv; i++) { pos[i * 3] += to[0] - from[0]; pos[i * 3 + 1] += to[1] - from[1]; pos[i * 3 + 2] += to[2] - from[2]; } const joints = new Uint8Array(m.nv * 4), weights = new Float32Array(m.nv * 4); for (let i = 0; i < m.nv; i++) { joints[i * 4] = bone; weights[i * 4] = 1; } return { ...m, pos, joints, weights }; };
  const rammer = lib.mesh('implement:rammer', 0).finalize(), spike = lib.mesh('implement:handspike', 0).finalize(), rOrg = [rammer.pos[0], rammer.pos[1], rammer.pos[2]], sOrg = [spike.pos[0], spike.pos[1], spike.pos[2]];
  const round = (() => { const m = new Mesh('round'); tube(m, [0, 0, 0], [0, 0.34, 0], [[0, 0.060], [0.8, 0.060], [1, 0.030]], { sides: 12, mat: MAT.TIN, capStart: true, capEnd: true }); return m.finalize(); })();
  const posts = crewPosts(), sheetOf = (name, plan, views) => {
    const men = [], used = new Set();
    for (const [role, t, extra] of plan) { const { r } = pickMan('DEFAULT.union.artillery', 'private', x => !x.variant.flag && !(x.words[3] & 4) && !used.has(x.identity.head), 'cannoneer'); used.add(r.identity.head); const S = skinMatrices('gun_crew_' + role, t), clip = S.clip, yaw = S.extras[6] || 0, at = name === 'posts' ? [posts[role].x, posts[role].z] : (clip.def.meta.workPos || [0, 0]);
      const ms = lodMeshes(r, 0), list = [...ms, ...(extra ? extra(S) : [])]; men.push({ ms: poseFromClip(list, null, 0, { root: [at[0], 0, at[1]], yaw, M: S.M }), r }); }
    const tiles = []; for (const yw of views) { const all = [...gun, ...men.flatMap(m => m.ms)]; tiles.push(renderTileShaded(all, { w: 760, h: 560, yaw: yw * Math.PI / 180, ppm: 170, cy: 0.95, cx: 0, cz: -0.5, env: genv })); }
    return composeSheet(tiles, 3); };
  const props = { n1: S => [bindTo(rammer, humanRig.index.prop_pole, rOrg, H('prop_pole'))], n2: S => [bindTo(round, humanRig.index.prop_instr, [0, 0, 0], H('prop_instr'))], gunner: S => [bindTo(spike, humanRig.index.prop_long, sOrg, H('prop_long'))] };
  png('gun_crew_napoleon.png', sheetOf('posts', [['n1', 0.3, props.n1], ['n2', 0.3, props.n2], ['n3', 0.3], ['n4', 0.3], ['gunner', 0.3, props.gunner]], [90, 35, 0]));
  png('gun_crew_working.png', sheetOf('working', [['n1', 16.0, props.n1], ['n2', 10.2, props.n2], ['gunner', 25.0, props.gunner], ['n3', 31.0]], [90, 35, 0]));
}
if (want('gun')) gunCrew();
