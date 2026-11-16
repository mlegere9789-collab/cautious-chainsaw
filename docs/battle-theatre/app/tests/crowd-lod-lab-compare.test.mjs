// Node test (no browser, no GPU) of tests/crowd-lod-lab-compare.mjs, the pixel-by-pixel comparison of the lab pictures of WebGL2 and WebGPU. The lab pictures are made here from lod.mjs: a rectangle drawn by three levels, each pixel the level
// whose range holds the dither number of the pixel (the way the shaders discard), the pixel as GLSL's gl_FragCoord.xy (the origin at the bottom). The comparison must agree on identical pictures, must refuse a WebGPU picture dithered with the
// y axis NOT turned over (the mistake the WGSL's fragXY exists to avoid), and must refuse a missing picture.
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { encodePng } from './weather3d-gpu-lib.mjs';
import { LOD_Q, ditherNumber } from '../src/crowd/lod.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url)), SCRIPT = path.join(HERE, 'crowd-lod-lab-compare.mjs'), W = 320, H = 180;
const BG = [150, 168, 196], COL = [[200, 40, 40], [200, 180, 40], [40, 60, 200]], inRect = (x, y) => x >= 100 && x < 220 && y >= 40 && y < 140;
// a picture of the rectangle: 'ref' k = every pixel level k; otherwise the partition [q0, q1) of the three levels with the dither of figure 0; flip: the y of the dither number (true: H - row, the origin at the bottom as in GLSL)
function picture(kind, q0 = 0, q1 = 0, flip = true) {
  const d = new Uint8Array(W * H * 4); for (let row = 0; row < H; row++) for (let x = 0; x < W; x++) {
    let c = BG; if (inRect(x, row)) { if (typeof kind === 'number') c = kind >= 0 ? COL[kind] : BG; else { const n = ditherNumber(0, x + 0.5, flip ? H - row - 0.5 : row + 0.5) * LOD_Q; c = n < q0 ? COL[0] : n < q1 ? COL[1] : COL[2]; } }
    const o = (row * W + x) * 4; d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255;
  }
  return encodePng(W, H, d);
}
function lab(dir, { flip, missing }) {
  for (const api of ['webgl2', 'webgpu']) {
    const a = path.join(dir, api); fs.mkdirSync(a, { recursive: true }); const fl = api === 'webgl2' ? true : flip;
    fs.writeFileSync(path.join(a, 'bg.png'), picture(-1)); for (let k = 0; k < 3; k++) fs.writeFileSync(path.join(a, `ref-L${k}.png`), picture(k));
    for (const [p, q] of [[0.2, 0.7], [0.5, 1.0], [0.05, 0.1], [0.0, 0.6]]) { const name = `partition-${Math.round(p * 100)}-${Math.round(q * 100)}`; if (missing && api === 'webgpu' && name === 'partition-20-70') continue; fs.writeFileSync(path.join(a, name + '.png'), picture('p', Math.round(p * LOD_Q), Math.round(q * LOD_Q), fl)); }
    fs.writeFileSync(path.join(a, 'summary.json'), JSON.stringify({ api, numbers: { levelColours: COL } }));
  }
}
const run = dir => spawnSync(process.execPath, [SCRIPT, dir, '--json=' + path.join(dir, 'report.json')], { encoding: 'utf8' });
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'crowd-lod-compare-'));

test('identical dither on both APIs: every partition picture agrees on every classified pixel', () => {
  const dir = tmp(); try { lab(dir, { flip: true }); const r = run(dir); assert.equal(r.status, 0, r.stdout + r.stderr); const rep = JSON.parse(fs.readFileSync(path.join(dir, 'report.json'), 'utf8'));
    assert.equal(rep.ok, true); assert.equal(rep.shots.length, 4); assert.ok(rep.area > 5000); for (const s of rep.shots) assert.ok(s.agreement >= 0.999, `${s.name}: ${s.agreement}`); } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
test('a WebGPU picture dithered with the y axis not turned over is refused: agreement near chance', () => {
  const dir = tmp(); try { lab(dir, { flip: false }); const r = run(dir); assert.equal(r.status, 1, r.stdout + r.stderr); const rep = JSON.parse(fs.readFileSync(path.join(dir, 'report.json'), 'utf8'));
    assert.equal(rep.ok, false); const mixed = rep.shots.filter(s => s.chance < 0.9); assert.ok(mixed.length >= 3); for (const s of mixed) { assert.ok(s.agreement < 0.9, `${s.name}: ${s.agreement}`); assert.ok(s.agreement < s.chance + 0.25, `${s.name}: agreement ${s.agreement} is not near chance ${s.chance}`); } } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
test('a picture missing on one API is a problem, not a pass', () => {
  const dir = tmp(); try { lab(dir, { flip: true, missing: true }); const r = run(dir); assert.equal(r.status, 1, r.stdout + r.stderr); const rep = JSON.parse(fs.readFileSync(path.join(dir, 'report.json'), 'utf8')); assert.ok(rep.problems.some(p => /missing on one API/.test(p))); } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
