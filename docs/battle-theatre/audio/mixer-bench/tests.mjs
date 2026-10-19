// Physics and timing unit tests for the mixer, run offline in Chrome with synthetic samples (impulse, tones, noise).
// Reverb is switched off (revGain 0) and the listener is held at 50 m above ground so the ISO 9613-2 ground effect is faded out, unless a test says otherwise.
import { SR, makeMixerNode } from './engine.mjs'; import { absorption, fitAirLowpass, onePoleDb } from '../model/acoustics.mjs';
function pool() {
  const imp = new Float32Array(64); imp[0] = 1;
  const tone = (f, s) => Float32Array.from({ length: Math.round(s * SR) }, (_, i) => Math.sin(2 * Math.PI * f * i / SR));
  const list = [imp, tone(100, 1.5), tone(4000, 1.5), tone(1000, 2.5), tone(200, 6)];
  let tot = 0; for (const l of list) tot += l.length + 2; const p = new Float32Array(tot), off = new Int32Array(list.length), len = new Int32Array(list.length); let o = 0;
  list.forEach((l, i) => { off[i] = o; len[i] = l.length + 2; p.set(l, o); o += l.length + 2; }); return { pool: p, smpOff: off, smpLen: len };
}
const IMP = 0, T100 = 1, T4K = 2, T1K = 3, T200 = 4;
async function render(events, { dur, listener = [0, 1.7, 0, 0, 0, 0, 0, 50], c = 343, windX = 0, windZ = 0, maxVoices = 4096, quality = 1 }) {
  const n = events.length, E = new Float64Array(n * 8), A = new Float32Array(n * 2);
  events.forEach((e, i) => { E.set([e.t ?? 0, e.x ?? 0, e.y ?? 1.7, e.z ?? 0, e.dx ?? 0, e.dz ?? 0, e.s ?? IMP, e.g ?? 1], i * 8); A[i * 2] = e.pitch ?? 1; });
  const ctx = new OfflineAudioContext(8, Math.round(dur * SR), SR);
  const node = await makeMixerNode(ctx, { samples: pool(), events: E, aux: A, quality, maxVoices, statsChannels: true, listener, c, windX, windZ, revGain: 0 });
  node.connect(ctx.destination); const b = await ctx.startRendering(); return { L: b.getChannelData(0), R: b.getChannelData(1), steals: b.getChannelData(6)[b.length - 1] };
}
const first = (x, th = 1e-12) => { for (let i = 0; i < x.length; i++) if (Math.abs(x[i]) > th) return i; return -1; };
const rms = (x, a, b) => { let s = 0; for (let i = a; i < b; i++) s += x[i] * x[i]; return Math.sqrt(s / (b - a)); };
const db = v => 20 * Math.log10(v);
export async function runTests() {
  const T = [], add = (name, pass, detail) => T.push({ name, pass, ...detail });
  // 1. arrival time = tFire + d/c, to the sample
  { const errs = []; for (const [t, d] of [[0.5, 686], [0.123456, 3.43], [1.0, 1500], [0.7, 34.3], [2.0, 12.5]]) { const r = await render([{ t, z: d }], { dur: t + d / 343 + 0.2 }); const f = first(r.L), exp = (t + d / 343) * SR; errs.push({ d, expectedFrame: +exp.toFixed(2), gotFrame: f, errSamples: +(f - exp).toFixed(2) }); }
    add('arrival time equals fire time + distance/343 (impulse, frame accuracy)', errs.every(e => Math.abs(e.errSamples) <= 1), { cases: errs, note: 'error budget +-1 sample = 21 microseconds' }); }
  // 2. wind changes the delay by d/(c+w)
  { const d = 686, r = await render([{ t: 0, z: d }], { dur: 2.2, windZ: -5 }); const f = first(r.L), exp = d / 348 * SR; add('5 m/s tail wind shortens the delay to d/(c+5)', Math.abs(f - exp) <= 1, { expectedFrame: +exp.toFixed(2), gotFrame: f }); }
  // 3. inverse-distance law (100 Hz tone, free field)
  { const ds = [10, 20, 40, 80], vals = []; for (const d of ds) { const r = await render([{ t: 0, z: d, s: T100, dx: 1, dz: 0 }], { dur: d / 343 + 1.4 }); const a = Math.round(d / 343 * SR) + 24000, b = a + 24000; vals.push(Math.sqrt(rms(r.L, a, b) ** 2 + rms(r.R, a, b) ** 2)); }
    const steps = vals.slice(1).map((v, i) => +db(v / vals[i]).toFixed(2)); add('level falls 6.02 dB per doubling of distance (100 Hz, no ground effect)', steps.every(s => Math.abs(s + 6.02) < 0.5), { dbPerDoubling: steps, note: 'small deviation from the 100 Hz air filter' }); }
  // 4. air absorption: 4 kHz at 1000 m vs 100 m versus ISO 9613-1 target and the 2-pole fit
  { const ms = []; for (const d of [100, 1000]) { const r = await render([{ t: 0, z: d, s: T4K, dx: 1, dz: 0 }], { dur: d / 343 + 1.4 }); const a = Math.round(d / 343 * SR) + 24000, b = a + 24000; ms.push(Math.sqrt(rms(r.L, a, b) ** 2 + rms(r.R, a, b) ** 2)); }
    const extra = db(ms[1] / ms[0]) + 20; const iso = -(absorption(4000, 25, 60) * 900), fit = 2 * onePoleDb(fitAirLowpass(1000).a, 4000, SR) - 2 * onePoleDb(fitAirLowpass(100).a, 4000, SR);
    add('4 kHz air absorption between 100 m and 1000 m follows the fitted filter (ISO 9613-1 target shown)', Math.abs(extra - fit) < 1.0, { measuredExtraDb: +extra.toFixed(2), fitExpectedDb: +fit.toFixed(2), iso9613_1_targetDb: +iso.toFixed(2), note: 'the 2-pole fit is within about 2 dB of ISO at 4 kHz' }); }
  // 5. pan and interaural time difference
  { const r = await render([{ t: 0, x: 50, z: 0 }], { dur: 0.5 }); const fl = first(r.L), fr = first(r.R); const rr = await render([{ t: 0, x: 50, z: 0, s: T1K, dx: 0, dz: 1 }], { dur: 0.6 }); const eL = rms(rr.L, 12000, 24000), eR = rms(rr.R, 12000, 24000);
    add('source hard right: right ear leads by the Woodworth ITD (about 0.66 ms = 32 samples) and is louder', fr < fl && fl - fr >= 28 && fl - fr <= 34 && eR > 4 * eL, { framesR: fr, framesL: fl, itdSamples: fl - fr, itdMs: +((fl - fr) / SR * 1000).toFixed(3), levelDiffDb: +db(eR / eL).toFixed(1) }); }
  // 6. Doppler from the listener moving toward the source at 30 m/s
  { const r = await render([{ t: 0, z: 400, s: T1K, dx: 1, dz: 0 }], { dur: 2.6, listener: [0, 1.7, 0, 0, 0, 0, 30, 50] }); let z = 0; const a = Math.round(400 / 343 * SR) + 6000, b = a + 48000; for (let i = a + 1; i < b; i++) if (r.L[i - 1] < 0 && r.L[i] >= 0) z++; const f = z / ((b - a) / SR); const exp = 1000 * (1 + 30 / 343);
    add('listener approaching at 30 m/s hears the 1 kHz tone at 1000 (1 + 30/343) Hz (the listener has not moved in this test; only the rate is applied)', Math.abs(f - exp) < 5, { measuredHz: +f.toFixed(1), expectedHz: +exp.toFixed(1) }); }
  // 7. voice stealing is the last resort and does not crash
  { const ev = Array.from({ length: 40 }, (_, i) => ({ t: i * 0.01, z: 10 + i, s: T200 })); const r = await render(ev, { dur: 3, maxVoices: 8 }); add('with a pool of 8 voices and 40 long shots the 32 extra shots steal voices (counted), output stays finite', r.steals >= 30 && r.L.every(Number.isFinite), { steals: r.steals }); }
  // 8. no stealing at 4096 voices for the same 40 shots
  { const ev = Array.from({ length: 40 }, (_, i) => ({ t: i * 0.01, z: 10 + i, s: T200 })); const r = await render(ev, { dur: 3 }); add('with the default pool nothing is stolen', r.steals === 0, { steals: r.steals }); }
  // 9. two shots 1 sample apart both sound (superposition)
  { const r = await render([{ t: 0, z: 34.3 }, { t: 1 / SR, z: 34.3 }], { dur: 0.3 }); const f = first(r.L); let n = 0; for (let i = f; i < f + 4; i++) if (Math.abs(r.L[i]) > 1e-12) n++; add('shots one sample apart are both rendered (energy at two consecutive frames)', n >= 2, { firstFrame: f }); }
  return { tests: T, passed: T.filter(t => t.pass).length, total: T.length };
}
window.BTTests = { runTests };
