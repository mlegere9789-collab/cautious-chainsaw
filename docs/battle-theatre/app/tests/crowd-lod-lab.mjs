// Harness (a check of the two backends, not a gate): the real WebGL2 and WebGPU backends of the figure pass on synthetic quads (tests/crowd-lod-lab-page.mjs) and the cross-fade MEASURED on the GPU against lod.mjs:
//   partition   three levels of one figure at one place with the dither ranges lod.mjs packs: every pixel of the quad is drawn by exactly one level, in the share the ranges say (no hole, no doubled pixel)
//   impostor    the impostor of one figure fades in over its band: the share of its pixels drawn equals fadeBand(distance / figureScale) for seven distances across the band (the shader's formula and hash against lod.mjs)
//   dab         the impostor of 5, 7 and 9 pixels: a flat two-tone dab below, the baked view above, a mix between
//   hard        band 0: the step the cross-fade replaces
//   purity      the same shot twice is the same bytes
// Software rendering only (SwiftShader: WebGL2 through ANGLE, WebGPU through Vulkan). Nothing here is a real-GPU result.
//   tools/horde/bench.sh node docs/battle-theatre/app/tests/crowd-lod-lab.mjs <outDir> [webgl2|webgpu|both]
// Output: <outDir>/<api>/<shot>.png, <outDir>/<api>/summary.json (every number below), console.log; exit 1 when a check fails.
import fs from 'node:fs'; import path from 'node:path';
import { chromium } from '../../../../node_modules/playwright-core/index.mjs';
import { serve } from '../tools/serve.mjs';
import { encodePng, chromeArgs, HOOKS } from './weather3d-gpu-lib.mjs';
import { LOD_Q, packRange, fadeBand, figureScale, dabShare } from '../src/crowd/lod.mjs';

const args = process.argv.slice(2), outRoot = path.resolve(args[0] || '.'), which = args[1] || 'both', APIS = which === 'both' ? ['webgl2', 'webgpu'] : [which];
const t00 = Date.now(), say = (...a) => console.log(((Date.now() - t00) / 1000).toFixed(0).padStart(5) + 's', ...a);
const srv = await serve(0), port = srv.address().port; let failed = 0;
const near = (a, b, e) => Math.abs(a - b) <= e;

async function runApi(api) {
  const out = path.join(outRoot, api); fs.mkdirSync(out, { recursive: true });
  const sum = { api, started: new Date().toISOString(), checks: [], numbers: {}, errors: [], console: [] }, save = () => fs.writeFileSync(path.join(out, 'summary.json'), JSON.stringify(sum, null, 1));
  const check = (name, ok, detail) => { sum.checks.push({ name, ok: !!ok, detail }); say(ok ? 'PASS' : 'FAIL', api, name, detail === undefined ? '' : JSON.stringify(detail)); if (!ok) failed++; };
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: chromeArgs(false) });
  try {
    const ctx = await browser.newContext({ viewport: { width: 320, height: 180 }, deviceScaleFactor: 1 }); await ctx.addInitScript(HOOKS, { realCanvas: false, trace: false }); ctx.setDefaultTimeout(0);
    const page = await ctx.newPage(); page.on('console', m => { if (/error|warn|fail|invalid/i.test(m.type() + m.text())) sum.console.push(m.type() + ': ' + m.text().slice(0, 300)); }); page.on('pageerror', e => sum.console.push('pageerror: ' + e.message));
    const url = `http://127.0.0.1:${port}/app/tests/crowd-lod-lab.html?api=${api}&w=320&h=180`; say('open', url); await page.goto(url, { waitUntil: 'load', timeout: 300000 });
    await page.waitForFunction(() => window.LAB && (window.LAB.ready || window.LAB.error), null, { timeout: 1800000, polling: 1000 }); const d0 = await page.evaluate(() => window.LAB.diag()); sum.diag0 = d0; save();
    check('the lab starts: the backend compiled, linked and built its pipelines', d0.ready && !d0.error, d0.error || d0.adapter);
    if (!d0.ready) return sum;
    const shot = async (name, spec) => { const r = await page.evaluate(s => window.LAB.shot(s), spec), b = Buffer.from(r.px, 'base64'); r.px = new Uint8Array(b.buffer, b.byteOffset, b.length); fs.writeFileSync(path.join(out, name + '.png'), encodePng(r.w, r.h, r.px)); r.name = name;
      if (r.validation) sum.errors.push(name + ': validation ' + r.validation); if (r.glError) sum.errors.push(name + ': gl error ' + r.glError); return r; };
    const px = (r, i) => [r.px[i * 4], r.px[i * 4 + 1], r.px[i * 4 + 2]], l1 = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]), N = 320 * 180;
    const M = d0.mats ?? await page.evaluate(() => window.LAB.mats), mats = [M.L0, M.L1, M.L2];
    // ---- references: the background, each level alone (word 0 = keep everything), and the region they share, eroded by 3 pixels
    const bg = await shot('bg', { dist: 12, fovDeg: 30, draws: [] }), refs = [0, 1, 2].map(k => null);
    for (let k = 0; k < 3; k++) refs[k] = await shot('ref-L' + k, { dist: 12, fovDeg: 30, draws: [{ level: k, mat: mats[k], dz: 0, P: 0 }] });
    const differs = (r, i) => l1(px(r, i), px(bg, i)) > 60, inside = new Uint8Array(N); for (let i = 0; i < N; i++) inside[i] = differs(refs[0], i) && differs(refs[1], i) && differs(refs[2], i) ? 1 : 0;
    const eroded = new Uint8Array(N); let area = 0; for (let y = 3; y < 177; y++) for (let x = 3; x < 317; x++) { let ok = 1; for (let dy = -3; dy <= 3 && ok; dy++) for (let dx = -3; dx <= 3; dx++) if (!inside[(y + dy) * 320 + x + dx]) { ok = 0; break; } eroded[y * 320 + x] = ok; area += ok; }
    check('the three levels draw a quad of their own colour at their own place (reference renders)', area > 1500, { area });
    const mean = k => { const s = [0, 0, 0]; let n = 0; for (let i = 0; i < N; i++) if (eroded[i]) { const p = px(refs[k], i); s[0] += p[0]; s[1] += p[1]; s[2] += p[2]; n++; } return s.map(v => v / n); }, col = [0, 1, 2].map(mean); sum.numbers.levelColours = col;
    const dist3 = (a, b) => l1(a, b); check('the colours of the three levels are far apart (the classifier can tell them)', dist3(col[0], col[1]) > 80 && dist3(col[1], col[2]) > 80 && dist3(col[0], col[2]) > 80, col);
    const classify = (r) => { const c = [0, 0, 0, 0]; for (let i = 0; i < N; i++) if (eroded[i]) { const p = px(r, i), cand = [dist3(p, col[0]), dist3(p, col[1]), dist3(p, col[2]), dist3(p, px(bg, i))]; let k = 0; for (let q = 1; q < 4; q++) if (cand[q] < cand[k]) k = q; c[k]++; } return c.map(v => v / area); };
    // ---- partition: three levels, depth ordered so that a doubled pixel would show as the nearer colour, a hole as the background
    const parts = [[0.2, 0.7], [0.5, 1.0], [0.05, 0.1], [0.0, 0.6]]; sum.numbers.partition = [];
    for (const [a, b] of parts) {
      const q0 = Math.round(a * LOD_Q), q1 = Math.round(b * LOD_Q), draws = []; if (q0 > 0) draws.push({ level: 0, mat: mats[0], dz: 0, P: packRange(0, q0) }); if (q1 > q0) draws.push({ level: 1, mat: mats[1], dz: -0.05, P: packRange(q0, q1) }); if (q1 < LOD_Q) draws.push({ level: 2, mat: mats[2], dz: -0.10, P: packRange(q1, LOD_Q) });
      const r = await shot(`partition-${Math.round(a * 100)}-${Math.round(b * 100)}`, { dist: 12, fovDeg: 30, draws }), f = classify(r), want = [q0 / LOD_Q, (q1 - q0) / LOD_Q, 1 - q1 / LOD_Q];
      sum.numbers.partition.push({ ranges: [a, b], measured: f, expected: want });
      check(`partition ${a}/${b}: each level keeps its share and no pixel is empty or doubled`, [0, 1, 2].every(k => near(f[k], want[k], 0.02)) && f[3] < 0.005, { measured: f.map(v => +v.toFixed(4)), expected: want.map(v => +v.toFixed(4)) });
    }
    // ---- the impostor: the share of its pixels drawn, from its distance, band and hash
    const D = 60, FOV = 6, fig0 = figureScale(0, 0.1), dist = Math.sqrt(D * D + 0.25), nu = dist / fig0;
    const impFull = await shot('imp-full', { dist: D, fovDeg: FOV, draws: [], imp: { r2: 1, band: 0.075, hyst: 0.1 } }), bgN = await shot('imp-bg', { dist: D, fovDeg: FOV, draws: [] });
    const drawn = r => { let n = 0; for (let i = 0; i < N; i++) if (l1(px(r, i), px(bgN, i)) > 60) n++; return n; }, full = drawn(impFull); check('the impostor alone draws a region of its own (full share)', full > 800, { full });
    sum.numbers.impostor = [];
    for (const ratio of [0.90, 0.93, 0.96, 1.0, 1.04, 1.07, 1.10]) {
      const r2 = nu / ratio, r = await shot('imp-' + ratio.toFixed(2), { dist: D, fovDeg: FOV, draws: [], imp: { r2, band: 0.075, hyst: 0.1 } }), measured = drawn(r) / full, want = fadeBand(nu, r2, 0.075);
      sum.numbers.impostor.push({ ratio, r2, measured, expected: want }); check(`impostor at nu / r2 = ${ratio.toFixed(2)}: ${(want * 100).toFixed(1)} percent of its pixels are drawn`, near(measured, want, 0.05), { measured: +measured.toFixed(4), expected: +want.toFixed(4) });
    }
    // ---- hard mode: a step at 0.995 r2 (the earlier behaviour)
    for (const [r2, want] of [[dist * 1.01, 0], [dist * 0.99, 1]]) { const r = await shot('imp-hard-' + r2.toFixed(1), { dist: D, fovDeg: FOV, draws: [], imp: { r2, band: 0, hyst: 0 } }), m = drawn(r) / full; check(`hard mode: r2 ${r2.toFixed(1)} against the distance ${dist.toFixed(1)}: ${want ? 'drawn' : 'hidden'}`, near(m, want, 0.03), { measured: +m.toFixed(4) }); }
    // ---- the dab: the same impostor seen 5, 7 and 9 pixels high (the field of view sets the height) from 400 m, over twelve sub-pixel offsets of the camera (the figure is a few dozen pixels)
    const QH = 64 / 32 * 0.93, DD = 400, fovFor = hpx => 2 * Math.atan(QH * 90 / (hpx * DD)) * 180 / Math.PI, cx = 160, cy = 90, win = [];
    for (let y = cy - 12; y <= cy + 12; y++) for (let x = cx - 12; x <= cx + 12; x++) win.push(y * 320 + x);
    const impAt = (hpx, s) => shot(`dab-${hpx}-${s}`, { dist: DD, fovDeg: fovFor(hpx), dx: s * 0.05, draws: [], imp: { r2: 1, band: 0.075, hyst: 0.1 } });
    const bgAt = hpx => shot(`dab-bg-${hpx}`, { dist: DD, fovDeg: fovFor(hpx), draws: [] });
    const region = async hpx => { const b = await bgAt(hpx), r = await impAt(hpx, 0), pts = win.filter(i => l1(px(r, i), px(b, i)) > 60); return { b, r, pts }; };
    const tex = await region(20), dabr = await region(5), meanOf = (r, pts) => { const s = [0, 0, 0]; for (const i of pts) { const p = px(r, i); s[0] += p[0]; s[1] += p[1]; s[2] += p[2]; } return s.map(v => v / Math.max(1, pts.length)); };
    const ys = dabr.pts.map(i => (i / 320) | 0), ymid = (Math.min(...ys) + Math.max(...ys)) / 2, top = dabr.pts.filter(i => ((i / 320) | 0) < ymid), bot = dabr.pts.filter(i => ((i / 320) | 0) >= ymid);
    const texRef = meanOf(tex.r, tex.pts), dabTop = meanOf(dabr.r, top), dabBot = meanOf(dabr.r, bot);
    check('the baked view and the two dab colours can be told apart', l1(texRef, dabTop) > 100 && l1(texRef, dabBot) > 100 && tex.pts.length > 40 && dabr.pts.length > 10, { texRef, dabTop, dabBot, texPixels: tex.pts.length, dabPixels: dabr.pts.length });
    sum.numbers.dab = [];
    for (const hpx of [5, 7, 9]) {
      let nDab = 0, nTex = 0; for (let s = 0; s < 12; s++) { const r = await impAt(hpx, s); for (const i of win) { const p = px(r, i), cand = [l1(p, texRef), l1(p, dabTop), l1(p, dabBot)]; let k = 0; for (let q = 1; q < 3; q++) if (cand[q] < cand[k]) k = q; if (cand[k] > 45) continue; if (k === 0) nTex++; else nDab++; } }
      const measured = nDab / Math.max(1, nDab + nTex), want = dabShare(hpx, fig0, 0.075, 7); sum.numbers.dab.push({ hpx, measured, expected: want, pixels: nDab + nTex });
      check(`dab at ${hpx} px: ${(want * 100).toFixed(0)} percent of the impostor is the flat dab`, near(measured, want, 0.2) && (nDab + nTex) > 100, { measured: +measured.toFixed(3), expected: +want.toFixed(3), pixels: nDab + nTex });
    }
    // ---- purity
    const a1 = await shot('purity-a', { dist: 12, fovDeg: 30, draws: [{ level: 0, mat: mats[0], dz: 0, P: packRange(0, 20000) }, { level: 1, mat: mats[1], dz: -0.05, P: packRange(20000, LOD_Q) }], imp: { r2: nu / 1.0, band: 0.075, hyst: 0.1 } }), a2 = await shot('purity-b', { dist: 12, fovDeg: 30, draws: [{ level: 0, mat: mats[0], dz: 0, P: packRange(0, 20000) }, { level: 1, mat: mats[1], dz: -0.05, P: packRange(20000, LOD_Q) }], imp: { r2: nu / 1.0, band: 0.075, hyst: 0.1 } });
    check('the same shot twice is the same bytes', Buffer.compare(Buffer.from(a1.px), Buffer.from(a2.px)) === 0);
    // ---- errors
    const dg = await page.evaluate(() => window.LAB.diag()); sum.diagEnd = dg; const wgslErr = (dg.wgsl || []).filter(m => m.type === 'error'), problems = [...sum.errors, ...(dg.gpuErrors || []), ...wgslErr.map(m => JSON.stringify(m)), ...sum.console.filter(c => /error|invalid|fail/i.test(c))];
    check('no validation error, no compiler error, no console error', problems.length === 0, problems.slice(0, 6));
  } catch (e) { sum.errors.push(String((e && e.stack) || e).slice(0, 2000)); say('ERROR', api, String(e).slice(0, 500)); failed++; }
  finally { sum.finished = new Date().toISOString(); save(); try { await browser.close(); } catch { /* gone */ } }
  return sum;
}
for (const api of APIS) await runApi(api);
srv.close(); say('done', failed ? failed + ' check(s) failed' : 'all checks passed'); process.exit(failed ? 1 : 0);
