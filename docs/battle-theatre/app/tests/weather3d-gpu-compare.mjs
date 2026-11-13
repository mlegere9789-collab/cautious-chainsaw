// Harness (not a gate): compares the pictures the WebGL2 and the WebGPU runs of tests/weather3d-gpu.mjs wrote for the same cases (same simulation time, same camera) and writes, per case, a
// montage (WebGL2 | WebGPU | difference x4) and the numbers. Both pictures come from software rendering here; the numbers say how far the two paths are from each other, not how close either is to a real GPU.
//   node docs/battle-theatre/app/tests/weather3d-gpu-compare.mjs <outDir> [maxMeanAbsDiff=6] [--strict] [--prefix=theatre-]
// <outDir>/compare/<case>.png, <outDir>/compare/summary.json. With --strict a case over the limit exits with code 1 (the limit is a harness value, not a project gate).
import fs from 'node:fs'; import path from 'node:path';
import { encodePng, stats } from './weather3d-gpu-lib.mjs';

const args = process.argv.slice(2), pos = args.filter(a => !a.startsWith('--')), root = path.resolve(pos[0] || '.'), LIMIT = +(pos[1] || 6), STRICT = args.includes('--strict');
const prefix = (args.find(a => a.startsWith('--prefix=')) || '--prefix=').split('=')[1];          // --prefix=theatre- compares the shell runs (theatre-webgl2, theatre-webgpu)
const dirGL = path.join(root, prefix + 'webgl2'), dirGPU = path.join(root, prefix + 'webgpu'), out = path.join(root, prefix + 'compare'); fs.mkdirSync(out, { recursive: true });
const names = fs.readdirSync(dirGPU).filter(f => f.endsWith('.json') && f !== 'summary.json').map(f => f.slice(0, -5)).filter(n => fs.existsSync(path.join(dirGL, n + '.json')));
const rows = [], bad = [];
for (const n of names) {
  const jg = JSON.parse(fs.readFileSync(path.join(dirGL, n + '.json'), 'utf8')), jp = JSON.parse(fs.readFileSync(path.join(dirGPU, n + '.json'), 'utf8'));
  if (jg.w !== jp.w || jg.h !== jp.h) { bad.push(n + ': sizes differ'); continue; }
  const w = jg.w, h = jg.h, a = fs.readFileSync(path.join(dirGL, n + '.rgba')), b = fs.readFileSync(path.join(dirGPU, n + '.rgba'));
  const region = (y0, y1) => { let sum = 0, sq = 0, n8 = 0, n24 = 0, cnt = 0, max = 0; const ds = []; for (let y = y0; y < y1; y++) for (let x = 0; x < w; x++) { const i = (y * w + x) * 4; let m = 0; for (let c = 0; c < 3; c++) { const d = Math.abs(a[i + c] - b[i + c]); sum += d; sq += d * d; if (d > m) m = d; } cnt++; ds.push(m); if (m > 8) n8++; if (m > 24) n24++; if (m > max) max = m; }
    ds.sort((p, q) => p - q); return { meanAbs: +(sum / (cnt * 3)).toFixed(3), rmse: +Math.sqrt(sq / (cnt * 3)).toFixed(3), p99: ds[Math.floor(0.99 * ds.length)], max, over8: +(n8 / cnt).toFixed(4), over24: +(n24 / cnt).toFixed(4) }; };
  const top = Math.floor(h * 0.35), bot = Math.ceil(h * 0.65), all = region(0, h), t = region(0, top), bt = region(bot, h), sg = stats(w, h, a), sp = stats(w, h, b);
  rows.push({ case: n, what: jp.what, all, top: t, bottom: bt, meanLumGL: sg.all.mean, meanLumGPU: sp.all.mean, minLumGL: sg.all.min, minLumGPU: sp.all.min, blackGL: sg.all.blackShare, blackGPU: sp.all.blackShare, spritesGL: jg.effects && jg.effects.nSprites, spritesGPU: jp.effects && jp.effects.nSprites });
  if (all.meanAbs > LIMIT) bad.push(`${n}: mean abs difference ${all.meanAbs} over the harness limit ${LIMIT}`);
  const m = Buffer.alloc(w * 3 * h * 4); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = (y * w + x) * 4; for (let c = 0; c < 4; c++) { m[(y * w * 3 + x) * 4 + c] = a[i + c]; m[(y * w * 3 + w + x) * 4 + c] = b[i + c]; m[(y * w * 3 + 2 * w + x) * 4 + c] = c === 3 ? 255 : Math.min(255, Math.abs(a[i + c] - b[i + c]) * 4); } }
  fs.writeFileSync(path.join(out, n + '.png'), encodePng(w * 3, h, m));
}
fs.writeFileSync(path.join(out, 'summary.json'), JSON.stringify({ limit: LIMIT, rows, problems: bad }, null, 1));
console.log('case'.padEnd(26), 'meanAbs top bottom  rmse  p99  >8   >24   lum GL/GPU    min GL/GPU  sprites GL/GPU');
for (const r of rows) console.log(r.case.padEnd(26), String(r.all.meanAbs).padStart(7), String(r.top.meanAbs).padStart(5), String(r.bottom.meanAbs).padStart(6), String(r.all.rmse).padStart(6), String(r.all.p99).padStart(4), String(r.all.over8).padStart(6), String(r.all.over24).padStart(6), `${r.meanLumGL}/${r.meanLumGPU}`.padStart(13), `${r.minLumGL}/${r.minLumGPU}`.padStart(11), `${r.spritesGL ?? '-'}/${r.spritesGPU ?? '-'}`.padStart(9));
if (bad.length) console.log('PROBLEMS:\n ' + bad.join('\n ')); if (STRICT && bad.length) process.exit(1);
