// The numbers of the timing harness (tests/weather3d-gpu-timing.mjs): W-E4, W-C1 and W-C2 of BROWSER-VERIFICATION-LIST-WEATHER.md. Pure functions (node, no browser, no clock): statistics of the per-frame series the page
// records, what the layer's passes cost (the frame time with them on against off, the GPU time of the pass from the timestamp queries), the checks of a run, and the markdown a person reads. Nothing here judges a number
// against a gate: the effects budget of the desktop tier (4 ms, FX3D-NOTES.md) is printed next to the measured figures and the person decides. A run on a software adapter is labelled as one and is never a hardware figure.
import { adapterVerdict } from './weather3d-gpu-lib.mjs';

export const MODES = ['both', 'off', 'weather', 'fx'];                       // the layer's passes on: both, neither, the weather pass alone, the sprite pass alone (the prototype's own sky and particles are off in all four)
export const SCENARIOS = {
  quiet: { name: 'quiet-day-clouds-jul3-1400', m: [7, 3, 14, 0], h: 40, look: [Math.PI, 0.35], what: 'a quiet daytime sky: clouds, haze, wet ground by the timeline, no effects' },
  cannonade: { name: 'cannonade-jul3-1400', m: [7, 3, 14, 0], h: 14, look: [Math.PI, 0.02], what: 'a dense cannonade and musketry in front of the camera (the stand-in plan with `dense` times the guns and the men of the 16-case plan)' },
};
export const DESKTOP_FX_BUDGET_MS = 4.0;                                       // FX3D-NOTES.md: the desktop tier's effects budget (plan G12), printed for comparison only

const finite = a => (a || []).filter(x => typeof x === 'number' && Number.isFinite(x));
// the p-quantile of an ascending list by linear interpolation between the two nearest ranks
export function quantile(sorted, p) { const n = sorted.length; if (!n) return null; if (n === 1) return sorted[0]; const r = Math.min(1, Math.max(0, p)) * (n - 1), i = Math.floor(r), f = r - i; return i + 1 < n ? sorted[i] + (sorted[i + 1] - sorted[i]) * f : sorted[n - 1]; }
const r3 = x => (x == null ? null : +x.toFixed(3));
// n, min, median, mean, p95, p99, max of a series (non-numbers are dropped); { n: 0 } for none
export function stats(a) {
  const v = finite(a).sort((x, y) => x - y); if (!v.length) return { n: 0 };
  return { n: v.length, min: r3(v[0]), median: r3(quantile(v, 0.5)), mean: r3(v.reduce((s, x) => s + x, 0) / v.length), p95: r3(quantile(v, 0.95)), p99: r3(quantile(v, 0.99)), max: r3(v[v.length - 1]) };
}
// the series of one key over all rounds of a mode, as one statistic
export const pooled = (runs, key) => stats((runs || []).flatMap(r => r[key] || []));

// what one scenario's four modes say: the layer's cost as a difference of medians of the time to completion (CPU encode plus GPU, per frame), the same for each pass alone, and the GPU time of the pass itself.
// scn = { both: { runs: [...] }, off: ..., weather: ..., fx: ... } with runs as the page returns them. Every number is a figure of the run, none is a verdict.
export function derive(scn) {
  const med = (m, k) => { const s = pooled(scn[m] && scn[m].runs, k); return s.n ? s.median : null; }, p95 = (m, k) => { const s = pooled(scn[m] && scn[m].runs, k); return s.n ? s.p95 : null; };
  const sub = (a, b) => (a == null || b == null ? null : r3(a - b)), off = med('off', 'doneMs'), spr = med('both', 'sprites');
  const fxCost = sub(med('fx', 'doneMs'), off);
  return { layerMs: sub(med('both', 'doneMs'), off), weatherMs: sub(med('weather', 'doneMs'), off), fxMs: fxCost, frameMsBoth: med('both', 'doneMs'), frameMsOff: off, frameMsBothP95: p95('both', 'doneMs'), frameMsOffP95: p95('off', 'doneMs'),
    passMsMedian: med('both', 'passMs'), passMsP95: p95('both', 'passMs'), passMsMax: (() => { const s = pooled(scn.both && scn.both.runs, 'passMs'); return s.n ? s.max : null; })(), cpuUpdateMsMedian: med('both', 'updMs'), cpuEncodeMsMedian: med('both', 'encMs'),
    spritesMedian: spr, nsPerSprite: fxCost != null && spr > 0 ? r3(fxCost * 1e6 / spr) : null };
}

// the checks of a run (summary.json of weather3d-gpu-timing.mjs): { ok, problems, facts }. A problem is something that makes the figures unusable (an error, a missing series, a load that was not there), never a slow figure.
export function checkTiming(s, expect = {}) {
  const p = [], api = s && s.api; if (!s || !api || !s.scenarios) return { ok: false, problems: ['not a summary of weather3d-gpu-timing.mjs'], facts: {} };
  const facts = { api, w: s.w, h: s.h, frames: s.frames, warm: s.warm, rounds: s.rounds, tier: s.tier, realGpu: !!s.realGpu };
  if (s.errors && s.errors.length) p.push('the run itself reported errors: ' + String(s.errors[0]).slice(0, 160)); if (!s.finished) p.push('the run did not finish');
  const av = adapterVerdict(s.diagEnd && s.diagEnd.adapter, s.diagInit && s.diagInit.adapter); facts.adapter = av.text; facts.adapterNamed = av.named; facts.adapterSoftware = av.software;
  if (s.realGpu && (!av.named || av.software)) p.push('the run was asked to be a real-GPU run but its adapter is ' + (av.software ? 'a software one: ' + String(av.text).slice(0, 120) : 'not recorded'));
  const frames = expect.frames ?? s.frames, names = Object.keys(s.scenarios); if (!names.length) p.push('no scenario was measured');
  const modes = s.modes && s.modes.length ? s.modes : MODES;
  for (const [sn, scn] of Object.entries(s.scenarios)) for (const m of modes) {
    const runs = (scn[m] && scn[m].runs) || []; if (!runs.length) { p.push(`${sn}/${m}: not measured`); continue; }
    for (const [i, r] of runs.entries()) {
      if (r.validation) p.push(`${sn}/${m} round ${i + 1}: validation error ${String(r.validation).slice(0, 140)}`);
      if (frames != null && (r.doneMs || []).length !== frames) p.push(`${sn}/${m} round ${i + 1}: ${(r.doneMs || []).length} frames timed, ${frames} asked for`);
      if (finite(r.doneMs).length !== (r.doneMs || []).length) p.push(`${sn}/${m} round ${i + 1}: a frame time is not a number`);
    }
  }
  if (api === 'webgpu') {
    const end = s.diagEnd || s.diagInit || {}, errs = (end.gpuErrors || []).filter(e => !/^DEVICE LOST destroyed: Device was destroyed/.test(String(e))); if (errs.length) p.push(errs.length + ' uncaptured WebGPU error(s) or a device loss: ' + String(errs[0]).slice(0, 160));
    const g = s.diagInit && s.diagInit.gpu; if (g && (!g.ok || !g.weatherOk || !g.fxOk)) p.push('a WebGPU pipeline of the layer did not build');
    facts.timestampQueries = !!s.timestampQueries;
    for (const [sn, scn] of Object.entries(s.scenarios)) if (s.timestampQueries && !pooled(scn.both && scn.both.runs, 'passMs').n) p.push(`${sn}: the device has timestamp queries but no pass time arrived`);
  } else { const g = s.diagInit && s.diagInit.gl; if (g && (!g.ok || (g.log && g.log.length))) p.push('a WebGL2 program of the layer did not build'); }
  const c = s.scenarios.cannonade; if (c && pooled(c.both && c.both.runs, 'sprites').n && !(pooled(c.both.runs, 'sprites').median > 0)) p.push('the cannonade drew no sprites: the load that the figures are for was not there');
  const q = s.scenarios.quiet; if (q) { const m = pooled(q.both && q.both.runs, 'doneMs'); if (m.n && !(m.median > 0)) p.push('quiet: the time of a frame is not positive'); }
  return { ok: p.length === 0, problems: p, facts };
}

// the markdown a person reads: per scenario the four modes and the derived costs, the budget printed beside them. software = the adapter is a software one (said first)
export function renderTimingMarkdown(s) {
  const av = adapterVerdict(s.diagEnd && s.diagEnd.adapter, s.diagInit && s.diagInit.adapter), L = [];
  L.push(av.software || !av.named ? `# NOT A HARDWARE TIMING (${api2(s)}: ${av.software ? 'software adapter' : 'no adapter named'}${av.text ? ': ' + av.text.slice(0, 120) : ''})` : `# Timing of the weather and effects layer, ${api2(s)}: ${String(av.text).slice(0, 120)}`);
  L.push('', `${s.w} x ${s.h}, tier ${s.tier}, ${s.frames} frames after ${s.warm} warm-up frames, ${s.rounds} round(s), a stand-in world of ${s.soldiers} soldiers (the crowd is not drawn), ${s.api === 'webgpu' ? 'GPU time of the pass from timestamp queries' + (s.timestampQueries ? '' : ' (this device has none)') : 'WebGL2 has no pass timers: the cost is the difference of the frame times'}. The frame is not presented: "frame" is CPU encode plus GPU completion, not paced by the display.`, '');
  for (const [sn, scn] of Object.entries(s.scenarios || {})) {
    const d = derive(scn), row = m => { const f = pooled(scn[m] && scn[m].runs, 'doneMs'), g = pooled(scn[m] && scn[m].runs, 'passMs'), sp = pooled(scn[m] && scn[m].runs, 'sprites'); return `| ${m} | ${f.n ? f.median : '-'} | ${f.n ? f.p95 : '-'} | ${g.n ? g.median : '-'} | ${g.n ? g.p95 : '-'} | ${sp.n ? sp.median : '-'} |`; };
    L.push(`## ${sn}: ${(SCENARIOS[sn] || {}).what || ''}`, '', '| passes | frame median ms | frame p95 ms | pass GPU median ms | pass GPU p95 ms | sprites median |', '|---|---|---|---|---|---|', ...MODES.map(row), '',
      `Layer cost (frame, both against off): ${d.layerMs} ms; weather pass alone: ${d.weatherMs} ms; sprite pass alone: ${d.fxMs} ms${d.nsPerSprite != null ? ` (${d.nsPerSprite} ns per sprite)` : ''}. Pass GPU time (timestamp queries): median ${d.passMsMedian}, p95 ${d.passMsP95}, max ${d.passMsMax} ms against the desktop effects budget of ${DESKTOP_FX_BUDGET_MS} ms (printed for comparison, not a verdict). CPU: fxHost.update ${d.cpuUpdateMsMedian} ms, host.frame encode ${d.cpuEncodeMsMedian} ms (medians).`, '');
  }
  return L.join('\n');
}
const api2 = s => (s.api === 'webgpu' ? 'WebGPU' : 'WebGL2');
