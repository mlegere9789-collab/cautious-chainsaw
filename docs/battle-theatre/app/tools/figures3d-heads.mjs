// Head inspection sheets (shaded software rasteriser, node only): node tools/figures3d-heads.mjs [--grid] [--one N] [--hair H] [--beard B] [--hc C] [--skin S]
// Writes tests/shots-figures3d/heads_24.png (all 24 head shapes, front and 3/4, no hat) and heads_close.png (one head, six views). The skin is the baked head map of skinmap.mjs (pores, wrinkles, stubble, weathering),
// the hair and beards are strand cards (hair.mjs), eyes and lips are shaded in shader.mjs. Shape, material and detail only: not the product shader.
import fs from 'node:fs'; import path from 'node:path';
import { FigureLibrary } from '../src/figures3d/library.mjs';
import { renderTileShaded, composeSheet } from '../src/figures3d/sheet.mjs';
import { pngEncode } from '../src/figures3d/png.mjs';
import { GLOBAL_MATERIALS, SKIN_TONES, HAIR_COLOURS, EYE_COLOURS, MAT } from '../src/figures3d/palette.mjs';
import { lipColour } from '../src/figures3d/variants.mjs';
import { createEnv } from '../src/figures3d/shader.mjs';
import { APP, headMapsFor } from './fig-common.mjs';
const OUT = path.join(APP, 'tests/shots-figures3d'), lib = new FigureLibrary(), args = process.argv.slice(2);
const arg = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const envOf = (i, skin, hair, eye, stub, hero) => { const p = GLOBAL_MATERIALS.map(r => [r[0], r[1], r[2]]); p[MAT.SKIN] = SKIN_TONES[skin]; p[MAT.LIP] = lipColour(SKIN_TONES[skin]); p[MAT.HAIR] = p[MAT.HAIR_CARD] = p[MAT.BEARD_CARD] = HAIR_COLOURS[hair].rgb; p[MAT.IRIS] = EYE_COLOURS[eye].rgb; return createEnv({ palette: p, headMaps: headMapsFor(i, hero ? 1024 : 512, hero ? 512 : 256), stubble: stub, wear: 0.2, dirt: 0.3 }); };
const png = (n, s) => { fs.writeFileSync(path.join(OUT, n), pngEncode(s.w, s.h, s.rgba)); console.log('wrote', n, s.w + 'x' + s.h); };
const headMeshes = (i, hair, beard, lod = 0) => { const ids = ['head:' + i]; if (hair >= 0) ids.push('hair:' + hair); if (beard > 0) ids.push('beard:' + beard); return ids.map(id => lib.mesh(id, lod).finalize()); };
const view = (ms, yaw, env, W = 300, ppm = 2300, cy = 1.60) => renderTileShaded(ms, { w: W, h: Math.round(W * 1.15), yaw: yaw * Math.PI / 180, ppm, cy, env });
if (args.includes('--grid') || !args.includes('--one')) {
  const tiles = [];
  for (let i = 0; i < 24; i++) { const hair = [1, 2, 0, 3, 4, 7, 5, 6][i % 8], beard = [0, 1, 3, 4, 6, 2, 5, 0][(i * 5) % 8]; const ms = headMeshes(i, hair, beard); tiles.push(view(ms, i % 2 ? 25 : 0, envOf(i, i % 12, (i * 3) % 8, i % 5, beard ? 0 : (i % 3 === 0 ? 1 : 0), false), 250, 1250)); }
  png('heads_24.png', composeSheet(tiles, 6));
}
if (args.includes('--one')) {
  const i = +arg('--one', 0), hair = +arg('--hair', 1), beard = +arg('--beard', 0), ms = headMeshes(i, hair, beard), tiles = [], env = envOf(i, +arg('--skin', 3), +arg('--hc', 2), +arg('--eye', 1), beard ? 0 : 1, true);
  for (const yw of [0, 30, 60, 90, 150, 180]) tiles.push(view(ms, yw, env, 420, +arg('--ppm', 2300)));
  png('heads_close.png', composeSheet(tiles, 3));
}
