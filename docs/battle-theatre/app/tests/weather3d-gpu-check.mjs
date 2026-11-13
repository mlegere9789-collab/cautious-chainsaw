// Reads the summary.json files that tests/weather3d-gpu.mjs and weather3d-gpu-compare.mjs write and says, as a list of problems, whether a run was clean. Pure (no browser, no clock): the checks of the run, not
// a gate; it never loosens anything, and what it cannot know (a real GPU) is not in it. A gate runner can call checkRun / checkCompare, or the command:
//   node docs/battle-theatre/app/tests/weather3d-gpu-check.mjs <outDir> [--api=webgpu|webgl2] [--limit=6]       exit code 1 when a problem is found
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';

// one run of one API (the content of <outDir>/<api>/summary.json). expect: { cases: n } the number of cases the run was asked for (default: any, at least 1)
export function checkRun(s, expect = {}) {
  const p = [], api = s && s.api; if (!s || !api) return { ok: false, problems: ['not a summary of weather3d-gpu.mjs'], facts: {} };
  const cases = Object.entries(s.cases || {}), fxOff = /[?&]fx=off/.test(s.url || ''), facts = { api, cases: cases.length, layer: fxOff ? 'off (the prototype alone)' : 'on' };
  if (s.errors && s.errors.length) p.push('the run itself reported errors: ' + s.errors[0].slice(0, 160));
  if (!s.finished) p.push('the run did not finish'); if (!cases.length) p.push('no case was rendered'); if (expect.cases != null && cases.length !== expect.cases) p.push(`${cases.length} cases rendered, ${expect.cases} expected`);
  if (api === 'webgpu') {
    const g = s.diagInit && s.diagInit.gpu; if (!g && !fxOff) p.push('no WebGPU layer state at start'); else if (g) { if (!g.ok || !g.weatherOk || !g.fxOk) p.push('a WebGPU pipeline of the layer did not build: ' + JSON.stringify(g.log || []).slice(0, 200)); if (g.log && g.log.length) p.push('layer log: ' + g.log[0].slice(0, 160)); if (g.warnings && g.warnings.length) p.push('compiler warnings: ' + g.warnings[0].slice(0, 160)); }
    // the harness destroys the device itself at the end (afterDispose): that loss is expected; a loss before it, in diagEnd, is not
    const end = s.diagEnd || s.diagInit || {}, errs = (end.gpuErrors || []).concat(s.afterDispose && s.afterDispose.gpuErrors ? s.afterDispose.gpuErrors.filter(e => !/^DEVICE LOST destroyed: Device was destroyed/.test(String(e))) : []); if (errs.length) p.push(errs.length + ' uncaptured WebGPU error(s) or a device loss: ' + String(errs[0]).slice(0, 200));
    const bad = (end.wgsl || []).filter(m => m.type === 'error'); if (bad.length) p.push(bad.length + ' WGSL compiler error(s): ' + bad[0].label + ' ' + bad[0].line + ':' + bad[0].col + ' ' + bad[0].msg.slice(0, 120)); facts.compilerMessages = (end.wgsl || []).length; facts.modules = (end.modules || []).length;
    for (const [n, c] of cases) { if (c.validation) p.push(`${n}: validation error ${String(c.validation).slice(0, 160)}`); if (c.gpuStats && c.gpuStats.failed) p.push(`${n}: the layer stopped: ${String(c.gpuStats.failed).slice(0, 160)}`); if (!fxOff && c.gpuStats && c.gpuStats.weatherDraws < 1) p.push(`${n}: no weather draw`); }
    if (s.computeCheck && s.computeCheck.skipped == null && !s.computeCheck.pipelineOk) p.push('the optional compute pipeline did not build: ' + String(s.computeCheck.pipelineError || s.computeCheck.validation).slice(0, 160)); if (s.computeCheck && (s.computeCheck.messages || []).some(m => m.type === 'error')) p.push('the compute module has compiler errors');
  } else { const g = s.diagInit && s.diagInit.gl; if (g && (!g.ok || (g.log && g.log.length))) p.push('a WebGL2 program of the layer did not build: ' + JSON.stringify(g.log || []).slice(0, 200)); }
  for (const [k, v] of Object.entries(s.pure || {})) if (v.identical !== true) p.push(`scrub purity: ${k} is not identical (${v.bytesDiffering} bytes differ)`); facts.purityChecks = Object.keys(s.pure || {}).length;
  if (s.resize) { if (s.resize.smallValidation || s.resize.backValidation) p.push('validation error after a resize'); if (s.resize.backIdentical === false) p.push(`after a resize back to the first size the picture differs (${s.resize.backBytesDiffering} bytes)`); facts.resize = s.resize.backIdentical === true; }
  for (const [n, c] of cases) { const a = c.pixels && c.pixels.all; if (!a || !(a.mean > 0)) p.push(`${n}: the picture is blank`); }
  return { ok: p.length === 0, problems: p, facts };
}
// the comparison of WebGL2 and WebGPU (<outDir>/compare/summary.json): every case within the limit of mean absolute difference per channel (8-bit levels), and the same effect sprite counts
export function checkCompare(c, limit = 6) {
  const p = [], rows = (c && c.rows) || []; if (!rows.length) return { ok: false, problems: ['no compared case'], facts: {} };
  for (const r of rows) { if (r.all.meanAbs > limit) p.push(`${r.case}: mean absolute difference ${r.all.meanAbs} over ${limit}`); if (r.spritesGL !== r.spritesGPU) p.push(`${r.case}: ${r.spritesGL} sprites on WebGL2, ${r.spritesGPU} on WebGPU`); }
  for (const x of (c.problems || [])) p.push(x);
  const m = rows.map(r => r.all.meanAbs); return { ok: p.length === 0, problems: p, facts: { cases: rows.length, meanAbsMin: Math.min(...m), meanAbsMax: Math.max(...m), over24Max: Math.max(...rows.map(r => r.all.over24)) } };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const a = process.argv.slice(2), dir = path.resolve(a.find(x => !x.startsWith('--')) || '.'), lim = +((a.find(x => x.startsWith('--limit=')) || '--limit=6').split('=')[1]), only = (a.find(x => x.startsWith('--api=')) || '').split('=')[1];
  let bad = 0; const J = f => JSON.parse(fs.readFileSync(f, 'utf8'));
  for (const api of ['webgpu', 'webgl2']) { if (only && only !== api) continue; const f = path.join(dir, api, 'summary.json'); if (!fs.existsSync(f)) { console.log(api + ': no summary'); bad++; continue; } const r = checkRun(J(f)); console.log(api + ': ' + (r.ok ? 'clean' : 'PROBLEMS'), JSON.stringify(r.facts)); for (const x of r.problems) console.log('  - ' + x); if (!r.ok) bad++; }
  const cf = path.join(dir, 'compare', 'summary.json'); if (!only && fs.existsSync(cf)) { const r = checkCompare(J(cf), lim); console.log('compare: ' + (r.ok ? 'within the limit' : 'PROBLEMS'), JSON.stringify(r.facts)); for (const x of r.problems) console.log('  - ' + x); if (!r.ok) bad++; }
  process.exit(bad ? 1 : 0);
}
