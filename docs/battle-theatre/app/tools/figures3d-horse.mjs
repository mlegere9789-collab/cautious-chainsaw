// Horse inspection sheet (shaded software rasteriser, node only): riding horse LOD0 side, 3/4, front, rear; LOD1 and LOD2 side -> tests/shots-figures3d/horse_riding.png (kind = draught for the team horse)
import fs from 'node:fs'; import path from 'node:path';
import { FigureLibrary } from '../src/figures3d/library.mjs'; import { renderTileShaded, composeSheet } from '../src/figures3d/sheet.mjs'; import { pngEncode } from '../src/figures3d/png.mjs';
import { GLOBAL_MATERIALS, MAT } from '../src/figures3d/palette.mjs'; import { createEnv } from '../src/figures3d/shader.mjs'; import { APP } from './fig-common.mjs';
const lib = new FigureLibrary(), pal = GLOBAL_MATERIALS.map(r => [r[0], r[1], r[2]]); pal[MAT.HORSE_COAT] = [118, 74, 42];
const kind = process.argv[2] || 'riding', env = createEnv({ palette: pal, wear: 0.2, dirt: 0.12 }), tiles = [];
for (const [lod, yw] of [[0, 90], [0, 45], [0, 0], [0, 180], [1, 90], [2, 90]]) tiles.push(renderTileShaded([lib.mesh('horse:' + kind, lod).finalize()], { w: 620, h: 520, yaw: yw * Math.PI / 180, ppm: 260, cy: 1.0, cz: 0.2, env }));
const s = composeSheet(tiles, 3); fs.writeFileSync(path.join(APP, `tests/shots-figures3d/horse_${kind}.png`), pngEncode(s.w, s.h, s.rgba)); console.log('wrote horse_' + kind + '.png');
