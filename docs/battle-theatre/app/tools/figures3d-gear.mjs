// Gear contact views (shaded software rasteriser, node only): the hip and torso of one man from four sides at LOD0 -> tests/shots-figures3d/gear_contact.png. Shows whether canteen, haversack, cartridge box and straps touch the body.
import fs from 'node:fs'; import path from 'node:path';
import { renderTileShaded, composeSheet } from '../src/figures3d/sheet.mjs'; import { pngEncode } from '../src/figures3d/png.mjs';
import { SUBJ, lodMeshes, unpackInstance, APP, envFor } from './fig-common.mjs';
const { r } = SUBJ[process.argv[2] || 'union_private'](), env = envFor(r, { hero: true }), ms = lodMeshes(r, 0), st = unpackInstance(r.words).stature_scale, tiles = [];
for (const yw of [0, 90, 180, 270]) tiles.push(renderTileShaded(ms, { w: 520, h: 600, yaw: yw * Math.PI / 180, ppm: 560, cy: 1.12 * st, env }));
const s = composeSheet(tiles, 4); fs.writeFileSync(path.join(APP, 'tests/shots-figures3d/gear_contact.png'), pngEncode(s.w, s.h, s.rgba)); console.log('wrote gear_contact.png');
