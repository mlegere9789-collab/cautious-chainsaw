// Helper of tests/crowd-lod-glsl.py (it runs it itself): writes, for a native compile of the crowd's GLSL ES 3.00 programs,
//   <out>/<name>.vert and <name>.frag  the five programs of the figure pass exactly as GLRenderer.prog() assembles them (the prototype's PRE with the crowd's text appended), name = c-mid c-midS c-near c-nearS c-imp
//   <out>/pre.glsl, head.glsl           the two common parts (the prototype's preamble, the crowd's HEAD), for the small test programs of the python side
//   <out>/ref.json + ref.f64            the JavaScript reference of the cross-fade dither (lod.mjs, float64): the number n of the pixels of three windows of a 3840 x 2160 frame for eight figures, and the packed range words of
//                                       the cases (the four levels of a partition, the word 0, a train fade), with their decoded [lo, hi)
//   node crowd-lod-glsl-dump.mjs <outDir>
// It reads webgl2.mjs of the prototype as text (PRE is not exported there) and stops with an error when the template is not where it expects it.
import fs from 'node:fs'; import path from 'node:path';
import { pre, TW, assemble } from './crowd-lod-glsl-sources.mjs';
import { HEAD, MID_VS, NEAR_VS, FIG_FS, NOFS, IMP_VS, IMP_FS } from '../src/crowd/shaders-gl.mjs';
import { LOD_Q, packRange, decodeRange, edgeRange, ditherNumber } from '../src/crowd/lod.mjs';

const out = path.resolve(process.argv[2] || '.'); fs.mkdirSync(out, { recursive: true });
const H = HEAD;
const progs = { 'c-mid': [H + MID_VS, H + FIG_FS], 'c-midS': [H + MID_VS, NOFS], 'c-near': [H + NEAR_VS, H + FIG_FS], 'c-nearS': [H + NEAR_VS, NOFS], 'c-imp': [H + IMP_VS, H + IMP_FS] };
for (const [name, [vs, fs_]] of Object.entries(progs)) { const p = assemble(vs, fs_); fs.writeFileSync(`${out}/${name}.vert`, p.vs); fs.writeFileSync(`${out}/${name}.frag`, p.fs); }
fs.writeFileSync(`${out}/pre.glsl`, pre); fs.writeFileSync(`${out}/head.glsl`, H);

// ---- the reference of the dither
const FRAME = [3840, 2160], WIN = 96, windows = [[0, 0], [1824, 984], [3744, 2064]];         // GL window coordinates (origin bottom left); the last two are the far corners of 1080p and of 4K
const figs = [0, 1, 2, 7, 1234, 4095, 54321, 123456], q = [16384, 32767, 49150];
const words = { 'L0 [0, q0)': packRange(0, q[0]), 'L1 [q0, q1)': packRange(q[0], q[1]), 'L2 [q1, q2)': packRange(q[1], q[2]), 'far [q2, unbounded)': packRange(q[2], LOD_Q), 'all (word 0)': 0, 'train fade [0, q)': edgeRange(1.01, 1, 0.075) };
if (!(words['train fade [0, q)'] > 0)) throw new Error('edgeRange gave no packed word for a distance inside the band');
const cases = Object.entries(words).map(([name, P]) => { const r = decodeRange(P); return { name, P, lo: r.lo, hi: r.hi }; });
const ns = new Float64Array(figs.length * windows.length * WIN * WIN);
let k = 0; for (const f of figs) for (const [x0, y0] of windows) for (let y = 0; y < WIN; y++) for (let x = 0; x < WIN; x++) ns[k++] = ditherNumber(f, x0 + x + 0.5, y0 + y + 0.5);
fs.writeFileSync(`${out}/ref.f64`, Buffer.from(ns.buffer));
fs.writeFileSync(`${out}/ref.json`, JSON.stringify({ frame: FRAME, win: WIN, windows, figs, cases, q, LOD_Q, TW }, null, 1));
console.log(`written ${Object.keys(progs).length} programs (PRE ${pre.length} chars, HEAD ${H.length}), ${figs.length} figures x ${windows.length} windows x ${WIN * WIN} pixels, ${cases.length} range words`);
