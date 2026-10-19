// Bench runners (called by index.html and by tools/run-bench.mjs through the DevTools protocol).
import { SR, loadSamples, spinTimer, makeMixerNode } from './engine.mjs';
import * as SC from './scenarios.mjs';
const q = (a, p) => { const s = Float64Array.from(a).sort(); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : 0; };
let SAMPLES = null, TIMER = null, TPS = 0;
export async function prepare() {
  if (!SAMPLES) { const c = new OfflineAudioContext(1, 128, SR); SAMPLES = await loadSamples(c, '../pilot/'); }
  if (!TIMER) { TIMER = spinTimer(); TPS = await TIMER.calibrate(); }
  return { inventory: SAMPLES.inventory, poolMB: +(SAMPLES.poolBytes / 1048576).toFixed(2), shots: SAMPLES.shots, banks: SAMPLES.banks, ticksPerSec: TPS };
}
export function build(spec) {
  const b = SAMPLES.banks;
  if (spec.kind === 'musket') return SC.musketStream({ rate: spec.rate, dur: spec.dur, banks: b, seed: spec.seed || 1, cannonRate: spec.cannonRate || 0 });
  if (spec.kind === 'cannonade') return SC.cannonade({ dur: spec.dur, banks: b, seed: spec.seed || 2, confInt: spec.confInt, unionInt: spec.unionInt });
  if (spec.kind === 'assault') return SC.assault({ dur: spec.dur, banks: b, seed: spec.seed || 3, defenders: spec.defenders, attackers: spec.attackers, rD: spec.rD, rA: spec.rA });
  if (spec.kind === 'mixed') return SC.merge(SC.assault({ dur: spec.dur, banks: b, seed: 3, defenders: spec.defenders, attackers: spec.attackers, rD: spec.rD, rA: spec.rA }), SC.cannonade({ dur: spec.dur, banks: b, seed: 2, confInt: spec.confInt, unionInt: spec.unionInt }));
  throw new Error('kind');
}
export async function runOffline(spec) {
  await prepare(); const dur = spec.dur, ev = build(spec), frames = Math.round(dur * SR);
  const ctx = new OfflineAudioContext(8, frames, SR);
  const listener = spec.moving ? [0, 1.7, 0, 0, 30, 0, 0, 1.6] : [0, 1.7, 0, 0, 0, 0, 0, 1.6];
  const node = await makeMixerNode(ctx, { samples: SAMPLES, events: ev.events, aux: ev.aux, quality: spec.quality ?? 1, maxVoices: spec.maxVoices ?? 4096, statsChannels: true, timer: TIMER, ticksPerSec: TPS, listener, tC: spec.tC ?? 25, windX: spec.windX || 0, windZ: spec.windZ || 0 });
  node.connect(ctx.destination);
  const t0 = performance.now(); const buf = await ctx.startRendering(); const wall = performance.now() - t0;
  const L = buf.getChannelData(0), R = buf.getChannelData(1), act = buf.getChannelData(2), fl = buf.getChannelData(3), st = buf.getChannelData(4), us = buf.getChannelData(5), steals = buf.getChannelData(6), ldrop = buf.getChannelData(7);
  const nb = Math.floor(frames / 128), proc = [], actv = []; let started = 0, nan = 0, clip = 0, peak = 0, sum2 = 0, procTot = 0, over = 0; const overAt = [];
  for (let b = 0; b < nb; b++) { const i = b * 128; proc.push(us[i]); actv.push(act[i]); started += st[i]; procTot += us[i]; if (us[i] > 2666.7) { over++; if (overAt.length < 12) overAt.push(+(b * 128 / SR).toFixed(2)); } }
  for (let i = 0; i < frames; i++) { const a = L[i], c = R[i]; if (!Number.isFinite(a) || !Number.isFinite(c)) nan++; const m = Math.max(Math.abs(a), Math.abs(c)); if (m > peak) peak = m; if (m > 0.98) clip++; sum2 += a * a + c * c; }
  const warm = Math.floor(nb * 0.25), pr = proc.slice(warm), ac = actv.slice(warm);
  return { spec, events: ev.count, started, notStartedCulledOrInFlight: ev.count - started, inflightAtEnd: fl[frames - 1], steals: steals[frames - 1], lateDrops: ldrop[frames - 1],
    audioSeconds: dur, wallMs: +wall.toFixed(0), wallRTF: +(wall / 1000 / dur).toFixed(3), workletRTF: +(procTot / 1e6 / dur).toFixed(3),
    perBlockUs: { p50: +q(pr, .5).toFixed(0), p95: +q(pr, .95).toFixed(0), p99: +q(pr, .99).toFixed(0), p999: +q(pr, .999).toFixed(0), max: +Math.max(...pr).toFixed(0), budgetUs: 2667, blocksOver: over, firstOverAtSeconds: overAt, blocks: nb },
    voices: { mean: +(ac.reduce((x, y) => x + y, 0) / ac.length).toFixed(1), p99: q(ac, .99), max: Math.max(...actv) },
    output: { nanSamples: nan, peak: +peak.toFixed(3), samplesOver098: clip, rmsDbFS: +(10 * Math.log10(sum2 / (2 * frames) + 1e-20)).toFixed(1) } };
}
export async function runRealtime(spec) {
  await prepare(); const ev = build(spec), dur = spec.dur;
  const ctx = new AudioContext({ sampleRate: SR, latencyHint: 'interactive' }); await ctx.resume();
  const listener = spec.moving ? [0, 1.7, 0, 0, 30, 0, 0, 1.6] : [0, 1.7, 0, 0, 0, 0, 0, 1.6];
  const node = await makeMixerNode(ctx, { samples: SAMPLES, quality: spec.quality ?? 1, maxVoices: spec.maxVoices ?? 4096, statsChannels: false, timer: TIMER, ticksPerSec: TPS, listener, tC: spec.tC ?? 25 });
  const gain = ctx.createGain(); gain.gain.value = spec.volume ?? 0.2; node.connect(gain).connect(ctx.destination);
  const stats = []; let fin = null; const pongs = new Map(); const pingT = new Map();
  node.port.onmessage = e => { const m = e.data; if (m.type === 'stats') stats.push({ ...m, ctxT: ctx.currentTime }); else if (m.type === 'final') fin = m; else if (m.type === 'pong') pongs.set(m.id, performance.now() - pingT.get(m.id)); };
  const lat = { base: ctx.baseLatency, out: ctx.outputLatency };
  const t0 = ctx.currentTime + 0.6, LOOK = spec.lookahead ?? 1.0; let next = 0, posts = 0, postMs = 0, maxBatch = 0; const E = ev.events, A = ev.aux, N = ev.count;
  let pingId = 0, listenT = 0;
  await new Promise(done => {
    const tick = () => {
      const now = ctx.currentTime - t0; const t1 = performance.now();
      let end = next; while (end < N && E[end * 8] < now + LOOK) end++;
      if (end > next) { const e = E.slice(next * 8, end * 8), a = A.slice(next * 2, end * 2); for (let i = 0; i < e.length; i += 8) e[i] += t0; node.port.postMessage({ type: 'events', ev: e, aux: a }, [e.buffer, a.buffer]); maxBatch = Math.max(maxBatch, end - next); next = end; posts++; postMs += performance.now() - t1; }
      if (spec.moving && ctx.currentTime - listenT > 1 / 60) { listenT = ctx.currentTime; node.port.postMessage({ type: 'listener', l: [30 * (ctx.currentTime - t0), 1.7, 0, 0, 30, 0, 0, 1.6] }); }
      if ((posts % 4) === 1 && pingId < 60) { const id = ++pingId; pingT.set(id, performance.now()); node.port.postMessage({ type: 'ping', id }); }
      if (now > dur + 8) { done(); return; } setTimeout(tick, 20);
    }; tick();
  });
  node.port.postMessage({ type: 'final' }); await new Promise(r => setTimeout(r, 500));
  const P = ctx.playbackStats; const ps = P ? { underrunEvents: P.underrunEvents, underrunDuration: P.underrunDuration, totalDuration: P.totalDuration, averageLatency: P.averageLatency, minimumLatency: P.minimumLatency, maximumLatency: P.maximumLatency } : null;
  const outLat = ctx.outputLatency; const mem = performance.memory ? { usedJSHeapMB: +(performance.memory.usedJSHeapSize / 1048576).toFixed(1), totalJSHeapMB: +(performance.memory.totalJSHeapSize / 1048576).toFixed(1) } : null;
  const rtts = [...pongs.values()].sort((a, b) => a - b);
  await ctx.close();
  const hist = fin?.hist || []; let tot = 0; for (const h of hist) tot += h; const pct = p => { let c = 0; for (let i = 0; i < hist.length; i++) { c += hist[i]; if (c >= p * tot) return (i + 1) * 25; } return 0; };
  return { spec, events: ev.count, latency: { baseLatencyMs: +(lat.base * 1000).toFixed(1), outputLatencyMsAtEnd: +(outLat * 1000).toFixed(1), mainToWorkletRoundTripMs: { n: rtts.length, p50: +(rtts[Math.floor(rtts.length / 2)] || 0).toFixed(2), max: +(rtts[rtts.length - 1] || 0).toFixed(2) } }, playbackStats: ps,
    worklet: fin ? { blocks: fin.blocks, started: fin.started, steals: fin.steals, culled: fin.culled, late: fin.late, lateDrop: fin.lateDrop, evDrop: fin.evDrop, clips: fin.clips, maxActive: fin.maxAct, maxInFlight: fin.maxFlight, blocksOverBudget: fin.over, procMaxUs: +fin.procMax.toFixed(0), procMeanUs: +(fin.procSum / fin.blocks).toFixed(0), procP50Us: pct(.5), procP99Us: pct(.99), procP999Us: pct(.999), rtf: +(fin.procSum / 1e6 / (fin.blocks * 128 / SR)).toFixed(3) } : null,
    main: { posts, postMsTotal: +postMs.toFixed(1), maxBatch, jsHeap: mem } };
}
window.BT = { prepare, build, runOffline, runRealtime };
