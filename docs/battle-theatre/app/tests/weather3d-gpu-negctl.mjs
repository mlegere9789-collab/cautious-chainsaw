// Browser-side negative controls of the WebGPU harnesses (tests/weather3d-gpu-page.mjs, weather3d-gpu-theatre.mjs). Not a gate.
//
// Every run of the harness reports "no validation error, no uncaptured error, no compiler message". That is only worth something when the machinery that reports it SEES errors. These controls make errors on purpose and
// say whether each path of the harness saw them: (1) an error scope hands back a validation error (and stays silent on a valid call), (2) the compiler messages of a shader module with a type error carry an error and
// the harness hook records it, (3) an error made with no scope arrives as an `uncapturederror` event and the harness hook records it, (4) an asynchronous pipeline with a missing entry point is refused while the same
// pipeline with the entry point builds, and (5) (page harness only) a whole frame of the layer with a bind group of the wrong layout reports a validation error through the SAME per-case scope as every case, and the frames
// before and after it are clean. What was made on purpose is taken out of the harness's lists again (window.__gpuErrors, __wgslMessages, __gpuLabels), so the run's own lists stay the run's own.
// Pure browser code (no node modules), no clock but setTimeout bounds, nothing random. The judgment of the result is checkNegativeControl in weather3d-gpu-check.mjs (node).
export const MARK = 'harness negative control';
const short = x => (x == null ? null : String((x && x.message) || x).replace(/\s+/g, ' ').slice(0, 220));
const WGSL_BAD = '@vertex fn vs() -> @builtin(position) vec4f { return vec4f(0.0, 0.0, 0.0, 1.0); }\n@fragment fn fs() -> @location(0) vec4f { return vec2f(1.0, 2.0); }';
const WGSL_OK = '@vertex fn vs() -> @builtin(position) vec4f { return vec4f(0.0, 0.0, 0.0, 1.0); }\n@fragment fn fs() -> @location(0) vec4f { return vec4f(1.0); }';

// take what the controls put into the harness's lists out again; returns how many entries were removed from each
export function stripMarked(w = globalThis) {
  const cut = (a, f) => { let n = 0; if (Array.isArray(a)) for (let i = a.length - 1; i >= 0; i--) if (f(a[i])) { a.splice(i, 1); n++; } return n; };
  return { gpuErrors: cut(w.__gpuErrors, x => String(x).includes(MARK)), wgslMessages: cut(w.__wgslMessages, x => x && String(x.label || '').startsWith(MARK)), modules: cut(w.__gpuLabels, x => String(x).startsWith(MARK)) };
}

// the controls of one device. d: the GPUDevice the harness reports on. w: the page's global object (window), where the harness hook keeps its lists. timeoutMs bounds the wait for the uncaptured-error event after the round trip.
export async function deviceControls(d, { w = globalThis, timeoutMs = 15000, U = globalThis.GPUBufferUsage } = {}) {
  const out = {};
  // (1) the error scope: a buffer with no usage is invalid and must come back from the scope; a valid buffer must not
  d.pushErrorScope('validation'); d.createBuffer({ label: MARK + ' (scoped, invalid)', size: 16, usage: 0 }); const e1 = await d.popErrorScope();
  d.pushErrorScope('validation'); const ok = d.createBuffer({ label: MARK + ' (scoped, valid)', size: 16, usage: U.COPY_DST }); ok.destroy(); const e2 = await d.popErrorScope();
  out.scope = { invalidCaught: !!e1, message: short(e1), validClean: e2 === null, validMessage: short(e2) };
  // (2) a shader module with a type error: the compiler messages carry an error, the scope catches the module's validation error, and the hook of the harness recorded the messages
  const badLabel = MARK + ' (wgsl type error)'; d.pushErrorScope('validation'); const mBad = d.createShaderModule({ label: badLabel, code: WGSL_BAD }); const info = await mBad.getCompilationInfo(); const e3 = await d.popErrorScope();
  const em = (info.messages || []).find(x => x.type === 'error');
  out.wgsl = { errorMessageSeen: !!em, message: short(em && em.message), line: em ? em.lineNum : null, scopeCaught: !!e3, hookRecorded: (w.__wgslMessages || []).some(x => x && x.label === badLabel && x.type === 'error'), hookLabelled: (w.__gpuLabels || []).some(x => String(x).startsWith(badLabel)) };
  // (3) an error made with no scope arrives as an uncapturederror event (the harness hook listens from the device's creation and records it; this listener only waits for it)
  // Chrome delivers an uncaptured error when the GPU process answers, not when the call is made: found 2026-11-16, the event of a call with no later GPU command arrived tens of seconds late and was recorded by the hook after the
  // control had given up. So the control makes a round trip to the GPU process (queue.onSubmittedWorkDone) after the invalid call: the error is returned before the answer to it, so the event has been dispatched by then.
  const evt = new Promise(res => { let t = null; const h = ev => { clearTimeout(t); d.removeEventListener('uncapturederror', h); res(short(ev && ev.error)); }; d.addEventListener('uncapturederror', h); t = setTimeout(() => { d.removeEventListener('uncapturederror', h); res(null); }, timeoutMs); });
  d.createBuffer({ label: MARK + ' (unscoped, invalid)', size: 16, usage: 0 }); if (d.queue && d.queue.onSubmittedWorkDone) await d.queue.onSubmittedWorkDone(); const ev = await evt; await new Promise(r => setTimeout(r, 50));
  out.uncaptured = { eventSeen: ev !== null, message: ev, hookRecorded: (w.__gpuErrors || []).some(x => String(x).includes(MARK + ' (unscoped, invalid)')) };
  // (4) the asynchronous pipeline: refused with a missing entry point, built with the right one (a refusal that also happened for a good pipeline would prove nothing)
  const good = d.createShaderModule({ label: MARK + ' (valid wgsl)', code: WGSL_OK }), pd = ep => ({ label: MARK + ' pipeline', layout: 'auto', vertex: { module: good, entryPoint: 'vs' }, fragment: { module: good, entryPoint: ep, targets: [{ format: 'rgba8unorm' }] } });
  let goodBuilt = false, badRejected = false, msg = null;
  try { await d.createRenderPipelineAsync(pd('fs')); goodBuilt = true; } catch (e) { msg = short(e); }
  try { await d.createRenderPipelineAsync(pd('missingEntryPoint')); } catch (e) { badRejected = true; msg = short(e); }
  out.pipeline = { goodBuilt, badRejected, message: msg };
  await good.getCompilationInfo().catch(() => null);      // the hook records the valid module's (empty) messages too; they are taken out with the rest
  out.cleanup = stripMarked(w);
  return out;
}

// (5) a whole frame with a bind group of the wrong layout, through the harness's own render call. render(spec) is the page's WG.render (it pushes the same validation scope for every case); gpu is the layer's GPUPasses.
// The weather pass's bind group is swapped for one made from another layout, the frame must come back with a validation text, the bind group is put back, and the next frame must be clean again.
export async function frameControl(render, gpu, d, spec, { U = globalThis.GPUBufferUsage, S = globalThis.GPUShaderStage } = {}) {
  if (!gpu || !gpu.weatherOk || !gpu.bgW) return { skipped: 'the layer has no weather pass on this device' };
  const before = await render(spec);
  const bgl = d.createBindGroupLayout({ label: MARK + ' layout', entries: [{ binding: 0, visibility: S.FRAGMENT, buffer: { type: 'uniform' } }] }), ub = d.createBuffer({ label: MARK + ' uniform', size: 16, usage: U.UNIFORM });
  const wrong = d.createBindGroup({ label: MARK + ' bind group', layout: bgl, entries: [{ binding: 0, resource: { buffer: ub } }] }), good = gpu.bgW; gpu.bgW = wrong;
  let broken; try { broken = await render(spec); } finally { gpu.bgW = good; }
  const after = await render(spec); ub.destroy();
  return { cleanBefore: !before.validation, brokenValidation: short(broken.validation), cleanAfter: !after.validation, layerStopped: !!gpu.failed };
}
