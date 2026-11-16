// Harness (a check of the two backends, not a gate): the pictures of tests/crowd-lod-lab.mjs on WebGL2 and on WebGPU compared PIXEL BY PIXEL. The partition shots draw three flat quads of one figure (three levels with the dither ranges lod.mjs packs):
// every pixel of a picture is classified as the level that drew it (the colours of the three reference renders), and the two maps are compared. The dither number of a fragment is the same on both APIs (the WGSL turns the y axis of the pixel
// over, gl_FragCoord.xy has its origin at the bottom), so the maps must be the same except at the edge of the quad; two independent patterns of the same shares would agree on only the sum of the squared shares (the line "chance").
//   node docs/battle-theatre/app/tests/crowd-lod-lab-compare.mjs <labRoot> [--json=<file>]        <labRoot>/webgl2/ and <labRoot>/webgpu/ are the outputs of crowd-lod-lab.mjs
// Software rendering only. Nothing here is a real-GPU result. Exit 1 when the two APIs do not draw the same pixels (agreement under 0.99 of the classified pixels) or a picture is missing.
import fs from 'node:fs'; import path from 'node:path';
import { decodePng } from './weather3d-gpu-lib.mjs';

const args = process.argv.slice(2), root = path.resolve(args.find(a => !a.startsWith('--')) || '.'), jsonOut = (args.find(a => a.startsWith('--json=')) || '').slice(7);
const read = (api, name) => { const f = path.join(root, api, name + '.png'); if (!fs.existsSync(f)) return null; return decodePng(fs.readFileSync(f)); };
const sumOf = api => JSON.parse(fs.readFileSync(path.join(root, api, 'summary.json'), 'utf8'));
const l1 = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]), px = (r, i) => [r.data[i * 4], r.data[i * 4 + 1], r.data[i * 4 + 2]];
const report = { root, shots: [], ok: true, problems: [] };
const apis = ['webgl2', 'webgpu'], S = {}; for (const api of apis) { try { S[api] = sumOf(api); } catch (e) { report.problems.push(`${api}: no summary.json (${e.message})`); } }
if (S.webgl2 && S.webgpu) {
  const bg = {}, ref = {}, col = {}; for (const api of apis) { bg[api] = read(api, 'bg'); ref[api] = [0, 1, 2].map(k => read(api, 'ref-L' + k)); col[api] = S[api].numbers && S[api].numbers.levelColours; }
  const ok = apis.every(api => bg[api] && ref[api].every(Boolean) && Array.isArray(col[api]) && col[api].length === 3);
  if (!ok) report.problems.push('the reference pictures or level colours of one API are missing');
  else {
    const W = bg.webgl2.w, H = bg.webgl2.h, N = W * H; if (bg.webgpu.w !== W || bg.webgpu.h !== H) report.problems.push('the two APIs drew pictures of different sizes');
    else {
      // the region where a level can be told from the background on both APIs, eroded by 3 pixels (the edge of a quad is rasterised a little differently)
      const inside = new Uint8Array(N); for (let i = 0; i < N; i++) inside[i] = apis.every(api => ref[api].every(r => l1(px(r, i), px(bg[api], i)) > 60)) ? 1 : 0;
      const eroded = new Uint8Array(N); let area = 0; for (let y = 3; y < H - 3; y++) for (let x = 3; x < W - 3; x++) { let k = 1; for (let dy = -3; dy <= 3 && k; dy++) for (let dx = -3; dx <= 3; dx++) if (!inside[(y + dy) * W + x + dx]) { k = 0; break; } eroded[y * W + x] = k; area += k; }
      report.area = area; if (area < 1500) report.problems.push('the common region of the three levels is too small to compare: ' + area);
      const classify = (api, r, i) => { const p = px(r, i), cand = [l1(p, col[api][0]), l1(p, col[api][1]), l1(p, col[api][2]), l1(p, px(bg[api], i))]; let k = 0; for (let q = 1; q < 4; q++) if (cand[q] < cand[k]) k = q; return k; };
      const names = fs.readdirSync(path.join(root, 'webgl2')).filter(f => /^partition-/.test(f) && f.endsWith('.png')).map(f => f.slice(0, -4)).sort();
      for (const name of names) {
        const A = read('webgl2', name), B = read('webgpu', name); if (!A || !B) { report.problems.push('missing on one API: ' + name); continue; }
        let same = 0, n = 0; const shareA = [0, 0, 0, 0], conf = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
        for (let i = 0; i < N; i++) if (eroded[i]) { const a = classify('webgl2', A, i), b = classify('webgpu', B, i); n++; shareA[a]++; conf[a][b]++; if (a === b) same++; }
        const shares = shareA.map(v => v / n), chance = shares.reduce((s, v) => s + v * v, 0), agree = same / n;
        const rec = { name, pixels: n, agreement: +agree.toFixed(5), chance: +chance.toFixed(4), shares: shares.map(v => +v.toFixed(4)), confusion: conf }; report.shots.push(rec);
        const good = agree >= 0.99 || (chance > 0.97 && agree >= 0.97);      // a picture drawn by one level only agrees by construction
        if (!good) { report.ok = false; report.problems.push(`${name}: the two APIs agree on ${(agree * 100).toFixed(2)} percent of ${n} pixels (chance ${(chance * 100).toFixed(1)} percent)`); }
        console.log(`${good ? 'PASS' : 'FAIL'} ${name}: WebGL2 and WebGPU classify the same level at ${(agree * 100).toFixed(2)} percent of ${n} pixels (two independent patterns of these shares: ${(chance * 100).toFixed(1)} percent)`);
      }
      if (!names.length) report.problems.push('no partition pictures in ' + path.join(root, 'webgl2'));
    }
  }
}
if (report.problems.length) report.ok = false; for (const p of report.problems) console.log('PROBLEM', p);
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(report, null, 1));
console.log(report.ok ? 'the two APIs draw the same dither' : 'NOT the same'); process.exit(report.ok ? 0 : 1);
