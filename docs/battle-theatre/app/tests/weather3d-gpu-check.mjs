// Reads the summary.json files that tests/weather3d-gpu.mjs and weather3d-gpu-compare.mjs write and says, as a list of problems, whether a run was clean. Pure (no browser, no clock): the checks of the run, not
// a gate; it never loosens anything, and what it cannot know (a real GPU) is not in it. A gate runner can call checkRun / checkCompare, or the command:
//   node docs/battle-theatre/app/tests/weather3d-gpu-check.mjs <outDir> [--api=webgpu|webgl2] [--limit=6] [--require-negative-control]       exit code 1 when a problem is found
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { CANVAS_SHOT_LIMIT, adapterVerdict } from './weather3d-gpu-lib.mjs';

// The negative controls of a WebGPU run (summary.negativeControl, made by tests/weather3d-gpu-negctl.mjs): errors made on purpose that the machinery of the run must have SEEN, so that "no validation error" cannot mean
// "nothing here sees errors". { ran: false } when the run has none (a run of before 2026-11-16, --no-negctl, or a device that was not there); otherwise every control must have come out as expected. Pure.
export function checkNegativeControl(nc) {
  if (!nc || typeof nc !== 'object') return { ran: false, ok: null, problems: [] }; if (nc.skipped) return { ran: false, ok: null, skipped: String(nc.skipped).slice(0, 120), problems: [] };
  const p = [], f = nc.frame, sc = nc.scope, w = nc.wgsl, u = nc.uncaptured, pl = nc.pipeline, need = (ok, what) => { if (ok !== true) p.push(what); };
  if (!f) p.push('no frame control in the record'); else if (!f.skipped) {
    need(f.cleanBefore, 'the frame before the control already reported a validation error');
    if (typeof f.brokenValidation !== 'string' || !f.brokenValidation) p.push('a frame with a bind group of the wrong layout reported no validation error: the per-case validation of the run would not see an error');
    need(f.cleanAfter, 'the frame after the control (bind group put back) was not clean'); if (f.layerStopped) p.push('the control stopped the layer (the error reached the uncaptured-error path instead of the case\'s validation scope)');
  }
  if (!sc) p.push('no error-scope control in the record'); else { need(sc.invalidCaught, 'an error scope did not hand back a validation error that was made on purpose'); need(sc.validClean, 'an error scope reported an error for a valid call'); }
  if (!w) p.push('no WGSL control in the record'); else { need(w.errorMessageSeen, 'the compiler messages of a shader module with a type error carried no error'); need(w.scopeCaught, 'an error scope did not hand back the validation error of a shader module with a type error'); need(w.hookRecorded, 'the harness hook did not record the compiler error of a shader module with a type error'); }
  if (!u) p.push('no uncaptured-error control in the record'); else { need(u.eventSeen, 'an error made with no scope did not arrive as an uncapturederror event'); need(u.hookRecorded, 'the harness hook did not record an uncaptured error that was made on purpose'); }
  if (!pl) p.push('no pipeline control in the record'); else { need(pl.goodBuilt, 'the control pipeline with a valid entry point did not build'); need(pl.badRejected, 'an asynchronous pipeline with a missing entry point was not refused'); }
  return { ran: true, ok: p.length === 0, problems: p };
}
// one run of one API (the content of <outDir>/<api>/summary.json). expect: { cases: n } the number of cases the run was asked for (default: any, at least 1)
export function checkRun(s, expect = {}) {
  const p = [], api = s && s.api; if (!s || !api) return { ok: false, problems: ['not a summary of weather3d-gpu.mjs'], facts: {} };
  const cases = Object.entries(s.cases || {}), fxOff = /[?&]fx=off/.test(s.url || ''), facts = { api, cases: cases.length, layer: fxOff ? 'off (the prototype alone)' : 'on' };
  if (s.errors && s.errors.length) p.push('the run itself reported errors: ' + s.errors[0].slice(0, 160));
  // a run started with --real-gpu says so; its adapter (WebGPU: vendor and architecture, WebGL2: the renderer string) must be recorded WITH A NAME (an empty record, empty strings, 'unknown' name no hardware: adapterVerdict in the lib)
  // and must not be a software one, or the run is not a real-GPU result. Both records of the run (start and end) are read, and the software test runs on the whole record, never on the shortened copy kept in the facts.
  const av = adapterVerdict(s.diagEnd && s.diagEnd.adapter, s.diagInit && s.diagInit.adapter); facts.adapter = av.text; facts.adapterNamed = av.named; facts.adapterSoftware = av.software; facts.realGpu = !!s.realGpu;
  if (s.realGpu && (!av.named || av.software)) p.push('the run was asked to be a real-GPU run but its adapter is ' + (av.software ? 'a software one: ' + String(av.text).slice(0, 120) : 'not recorded' + (av.text ? ' (the record names no hardware: ' + av.text.slice(0, 80) + ')' : '')));
  if (!s.finished) p.push('the run did not finish'); if (!cases.length) p.push('no case was rendered'); if (expect.cases != null && cases.length !== expect.cases) p.push(`${cases.length} cases rendered, ${expect.cases} expected`);
  if (api === 'webgpu') {
    const g = s.diagInit && s.diagInit.gpu; if (!g && !fxOff) p.push('no WebGPU layer state at start'); else if (g) { if (!g.ok || !g.weatherOk || !g.fxOk) p.push('a WebGPU pipeline of the layer did not build: ' + JSON.stringify(g.log || []).slice(0, 200)); if (g.log && g.log.length) p.push('layer log: ' + g.log[0].slice(0, 160)); if (g.warnings && g.warnings.length) p.push('compiler warnings: ' + g.warnings[0].slice(0, 160)); }
    // the harness destroys the device itself at the end (afterDispose): that loss is expected; a loss before it, in diagEnd, is not
    const end = s.diagEnd || s.diagInit || {}, errs = (end.gpuErrors || []).concat(s.afterDispose && s.afterDispose.gpuErrors ? s.afterDispose.gpuErrors.filter(e => !/^DEVICE LOST destroyed: Device was destroyed/.test(String(e))) : []); if (errs.length) p.push(errs.length + ' uncaptured WebGPU error(s) or a device loss: ' + String(errs[0]).slice(0, 200));
    const bad = (end.wgsl || []).filter(m => m.type === 'error'); if (bad.length) p.push(bad.length + ' WGSL compiler error(s): ' + bad[0].label + ' ' + bad[0].line + ':' + bad[0].col + ' ' + bad[0].msg.slice(0, 120)); facts.compilerMessages = (end.wgsl || []).length; facts.modules = (end.modules || []).length;
    for (const [n, c] of cases) { if (c.validation) p.push(`${n}: validation error ${String(c.validation).slice(0, 160)}`); if (c.gpuStats && c.gpuStats.failed) p.push(`${n}: the layer stopped: ${String(c.gpuStats.failed).slice(0, 160)}`); if (!fxOff && c.gpuStats && c.gpuStats.weatherDraws < 1) p.push(`${n}: no weather draw`); }
    if (s.computeCheck && s.computeCheck.skipped == null && !s.computeCheck.pipelineOk) p.push('the optional compute pipeline did not build: ' + String(s.computeCheck.pipelineError || s.computeCheck.validation).slice(0, 160)); if (s.computeCheck && (s.computeCheck.messages || []).some(m => m.type === 'error')) p.push('the compute module has compiler errors');
    const nc = checkNegativeControl(s.negativeControl); facts.negativeControl = nc.ran ? (nc.ok ? 'seen' : 'NOT SEEN') : nc.skipped ? 'skipped: ' + nc.skipped : 'not run'; for (const x of nc.problems) p.push('negative control: ' + x);
    if (expect.negativeControl && !nc.ran) p.push('the negative controls did not run' + (nc.skipped ? ' (' + nc.skipped + ')' : ''));
  } else { const g = s.diagInit && s.diagInit.gl; if (g && (!g.ok || (g.log && g.log.length))) p.push('a WebGL2 program of the layer did not build: ' + JSON.stringify(g.log || []).slice(0, 200)); }
  for (const [k, v] of Object.entries(s.pure || {})) if (v.identical !== true) p.push(`scrub purity: ${k} is not identical (${v.bytesDiffering} bytes differ)`); facts.purityChecks = Object.keys(s.pure || {}).length;
  if (s.resize) { if (s.resize.smallValidation || s.resize.backValidation) p.push('validation error after a resize'); if (s.resize.backIdentical === false) p.push(`after a resize back to the first size the picture differs (${s.resize.backBytesDiffering} bytes)`); facts.resize = s.resize.backIdentical === true; }
  for (const [n, c] of cases) { const a = c.pixels && c.pixels.all; if (!a || !(a.mean > 0)) p.push(`${n}: the picture is blank`); }
  // runs on the real canvas (--real-canvas, --real-gpu, --canvas-shot): the compositor's picture of the canvas against the read-back of the same frame (harness limit CANVAS_SHOT_LIMIT levels, not a project gate)
  const shots = cases.filter(([, c]) => c.canvasShot);
  if (shots.length) {
    facts.canvasShot = { cases: shots.length, failed: shots.filter(([, c]) => c.canvasShot.error).length, worstMeanAbs: Math.max(...shots.map(([, c]) => (c.canvasShot.meanAbs == null ? Infinity : c.canvasShot.meanAbs))) };
    for (const [n, c] of shots) { if (c.canvasShot.error) p.push(`${n}: the compositor's picture of the canvas could not be taken: ${String(c.canvasShot.error).slice(0, 160)}`); else if (!(c.canvasShot.meanAbs <= CANVAS_SHOT_LIMIT)) p.push(`${n}: the compositor's picture of the canvas differs from the read-back of the same frame (mean absolute ${c.canvasShot.meanAbs} levels, harness limit ${CANVAS_SHOT_LIMIT})`); }
  }
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
  for (const api of ['webgpu', 'webgl2']) { if (only && only !== api) continue; const f = path.join(dir, api, 'summary.json'); if (!fs.existsSync(f)) { console.log(api + ': no summary'); bad++; continue; } const r = checkRun(J(f), { negativeControl: a.includes('--require-negative-control') }); console.log(api + ': ' + (r.ok ? 'clean' : 'PROBLEMS'), JSON.stringify(r.facts)); for (const x of r.problems) console.log('  - ' + x); if (!r.ok) bad++; }
  const cf = path.join(dir, 'compare', 'summary.json'); if (!only && fs.existsSync(cf)) { const r = checkCompare(J(cf), lim); console.log('compare: ' + (r.ok ? 'within the limit' : 'PROBLEMS'), JSON.stringify(r.facts)); for (const x of r.problems) console.log('  - ' + x); if (!r.ok) bad++; }
  process.exit(bad ? 1 : 0);
}
