// Main-thread side of the mixer: sample loading and shot slicing, distance tables, worklet construction, the weapon table.
import { buildTables, dbToGain, SOURCE_PEAK_DB_1M } from '../model/acoustics.mjs';

export const SR = 48000;
// Bench weapon table. 'bank' names the pilot sample bank used as a STAND-IN for that weapon (the pilot set has no per-model recordings, see PLAN.md).
export const WEAPONS = [
  { id: 0, name: 'springfield_m1861_58', bank: 'rifle', peakDb: SOURCE_PEAK_DB_1M.rifle_musket, pitch: 1.00 },
  { id: 1, name: 'enfield_p1853_577', bank: 'rifle', peakDb: SOURCE_PEAK_DB_1M.rifle_musket - 0.5, pitch: 1.03 },
  { id: 2, name: 'smoothbore_m1842_69', bank: 'rifle', peakDb: SOURCE_PEAK_DB_1M.smoothbore_musket, pitch: 0.94 },
  { id: 3, name: 'sharps_carbine', bank: 'rifle', peakDb: SOURCE_PEAK_DB_1M.carbine, pitch: 1.08 },
  { id: 4, name: 'napoleon_12pdr', bank: 'cannon', peakDb: SOURCE_PEAK_DB_1M.napoleon_12pdr, pitch: 1.00 },
  { id: 5, name: 'ordnance_rifle_3in', bank: 'cannon', peakDb: SOURCE_PEAK_DB_1M.rifle_3in, pitch: 1.10 },
  { id: 6, name: 'parrott_20pdr', bank: 'cannon', peakDb: SOURCE_PEAK_DB_1M.parrott_20pdr, pitch: 0.82 },
];
export const FS_DB = 140;                                           // digital full scale = 140 dB SPL peak (ASSUMED listening calibration)

/** Detect single shots in a mono buffer and return normalised slices {data, onset, len}. */
export function sliceShots(x, sr, { minGap = 0.18, maxLen = 0.6, fadeOut = 0.04, preRoll = 0.004 } = {}) {
  const w = Math.max(1, Math.round(0.002 * sr)), n = x.length, env = new Float32Array(n);
  let acc = 0; for (let i = 0; i < n; i++) { acc += Math.abs(x[i]); if (i >= w) acc -= Math.abs(x[i - w]); env[i] = acc / w; }
  const sorted = Float32Array.from(env.filter((_, i) => i % 64 === 0)).sort(); const floor = sorted[Math.floor(sorted.length * 0.5)] || 1e-6;
  let peak = 0; for (let i = 0; i < n; i++) if (env[i] > peak) peak = env[i];
  const thr = Math.max(floor * 8, peak * 0.12), on = []; let last = -1e9;
  for (let i = 1; i < n; i++) if (env[i] > thr && env[i - 1] <= thr && i - last > minGap * sr) { on.push(i); last = i; }
  const out = [];
  for (let k = 0; k < on.length; k++) {
    const s0 = Math.max(0, on[k] - Math.round(preRoll * sr)), nextOn = k + 1 < on.length ? on[k + 1] - Math.round(0.01 * sr) : n;
    const e0 = Math.min(nextOn, s0 + Math.round(maxLen * sr), n); if (e0 - s0 < 0.06 * sr) continue;
    const d = x.slice(s0, e0), fo = Math.min(d.length >> 1, Math.round(fadeOut * sr)); let pk = 0;
    for (let i = 0; i < d.length; i++) { const a = Math.abs(d[i]); if (a > pk) pk = a; }
    for (let i = 0; i < fo; i++) d[d.length - 1 - i] *= i / fo;
    if (pk > 0) for (let i = 0; i < d.length; i++) d[i] /= pk;
    out.push({ data: d, onset: s0 / sr, len: d.length / sr, peak: pk });
  }
  return out;
}

const FILES = {
  rifle: [['rifle-musket/fs347647_fennelliott_musket.mp3', {}], ['rifle-musket/fs234869_mlsulli_musket-shot.mp3', {}], ['rifle-musket/fs538795_bruno.auzet_old-musket-bangs.mp3', {}], ['rifle-musket/fs662875_alppdcjr12_musket-shots.mp3', {}], ['rifle-musket/fs675623_craigsmith_musket-volley.mp3', { minGap: 0.12 }]],
  cannon: [['cannon/fs125348_adeluc4_civil-war-cannon.mp3', { maxLen: 3.5, minGap: 1.0, fadeOut: 0.3 }], ['cannon/fs187767_qubodup_cannon-shot-usgov.mp3', { maxLen: 3.5, minGap: 1.0, fadeOut: 0.3 }], ['cannon/fs182822_qubodup_artillery-shots-blackpowder.mp3', { maxLen: 3.5, minGap: 1.0, fadeOut: 0.3 }]],
};

export async function loadSamples(ctx, base = '../pilot/') {
  const slices = [], inventory = [], banks = { rifle: [], cannon: [] };
  for (const [bank, list] of Object.entries(FILES)) for (const [f, opt] of list) {
    const ab = await (await fetch(base + f)).arrayBuffer(); const buf = await ctx.decodeAudioData(ab);
    const m = new Float32Array(buf.length); for (let c = 0; c < buf.numberOfChannels; c++) { const d = buf.getChannelData(c); for (let i = 0; i < m.length; i++) m[i] += d[i] / buf.numberOfChannels; }
    const sl = sliceShots(m, buf.sampleRate, opt);
    inventory.push({ file: f, bank, srcRate: buf.sampleRate, ctxRate: ctx.sampleRate, channels: buf.numberOfChannels, seconds: +buf.duration.toFixed(3), shotsFound: sl.length, shotSeconds: sl.map(s => +s.len.toFixed(3)) });
    for (const s of sl) { banks[bank].push(slices.length); slices.push(s); }
  }
  let tot = 2 * slices.length; for (const s of slices) tot += s.data.length; const pool = new Float32Array(tot), smpOff = new Int32Array(slices.length), smpLen = new Int32Array(slices.length); let o = 0;
  slices.forEach((s, i) => { smpOff[i] = o; smpLen[i] = s.data.length + 2; pool.set(s.data, o); o += s.data.length + 2; });
  return { pool, smpOff, smpLen, banks, inventory, poolBytes: pool.byteLength, shots: slices.length };
}

export function spinTimer() {                                       // high-resolution clock for the worklet (no performance.now there): a worker increments a shared counter
  const sab = new SharedArrayBuffer(8), a = new Int32Array(sab);
  const src = 'onmessage=e=>{const a=new Int32Array(e.data);let n=0;for(;;){Atomics.store(a,0,n++);}}';
  const w = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' }))); w.postMessage(sab);
  return { sab, a, stop: () => w.terminate(), async calibrate(ms = 300) { await new Promise(r => setTimeout(r, 100)); const c0 = Atomics.load(a, 0), t0 = performance.now(); await new Promise(r => setTimeout(r, ms)); const c1 = Atomics.load(a, 0), t1 = performance.now(); return ((c1 - c0) >>> 0) / ((t1 - t0) / 1000); } };
}

let TABLES = null;
export function tables(opts) { return TABLES ||= buildTables({ sr: SR, ...opts }); }

export async function makeMixerNode(ctx, { samples, events, aux, quality = 1, maxVoices = 4096, statsChannels = false, timer = null, ticksPerSec = 1, listener = null, tC = 25, c, windX = 0, windZ = 0, rt60 = 2.4, revGain = 0.35 }) {
  await ctx.audioWorklet.addModule(new URL('./mixer-processor.js', import.meta.url).href);
  const T = tables({ tC });
  const co = c ?? 331.3 * Math.sqrt(1 + tC / 273.15);
  const node = new AudioWorkletNode(ctx, 'battle-mixer', {
    numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [statsChannels ? 8 : 2],
    processorOptions: { pool: samples.pool, smpOff: samples.smpOff, smpLen: samples.smpLen, lpTab: T.lpTab, gndLin: T.gndLin, lpStep: T.step, quality, maxVoices, statsChannels, timerSab: timer?.sab, ticksPerSec, events, aux, listener, c: co, windX, windZ, rt60, revGain, refGain: 1, masterGain: 1 },
  });
  return node;
}
