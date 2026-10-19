// Measures every pilot file (decode in Chrome, FFT in the page; container header parsed here) and writes ../../pilot/MEASURED.json.
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url'; import { serve } from './serve.mjs'; import { launchChrome, newPage, closeChrome } from './cdp.mjs';
const here = path.dirname(fileURLToPath(import.meta.url)), PILOT = path.join(here, '..', '..', 'pilot');
const files = []; (function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (/\.(mp3|ogg|wav)$/.test(e.name)) files.push(path.relative(PILOT, p).replace(/\\/g, '/')); } })(PILOT);
function mp3Header(buf) { // first frame header: MPEG version, layer, bitrate, sample rate, channel mode
  let i = 0; if (buf.toString('latin1', 0, 3) === 'ID3') i = 10 + ((buf[6] << 21) | (buf[7] << 14) | (buf[8] << 7) | buf[9]);
  for (; i < buf.length - 4; i++) if (buf[i] === 0xff && (buf[i + 1] & 0xe0) === 0xe0) { const v = (buf[i + 1] >> 3) & 3, l = (buf[i + 1] >> 1) & 3, br = buf[i + 2] >> 4, sr = (buf[i + 2] >> 2) & 3, ch = buf[i + 3] >> 6;
    const rates = { 3: [44100, 48000, 32000], 2: [22050, 24000, 16000], 0: [11025, 12000, 8000] }[v]; const brs = v === 3 ? [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320] : [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160];
    if (rates && l === 1 && sr < 3 && br > 0 && br < 15) return { codec: 'MP3 (MPEG' + (v === 3 ? '1' : v === 2 ? '2' : '2.5') + ' L3)', sampleRate: rates[sr], bitrateKbps: brs[br], mode: ['stereo', 'joint stereo', 'dual', 'mono'][ch] }; }
  return null; }
function oggHeader(buf) { const i = buf.indexOf('vorbis'); if (i < 0) return { codec: 'ogg (unknown)' }; return { codec: 'Ogg Vorbis', channels: buf[i + 10], sampleRate: buf.readUInt32LE(i + 11), nominalBitrateKbps: Math.round(buf.readInt32LE(i + 19) / 1000) }; }
const srv = await serve(10780); const ch = await launchChrome({ headless: true }); const pg = await newPage(ch.port, 'http://127.0.0.1:10780/mixer-bench/probe.html'); await new Promise(r => setTimeout(r, 800));
const fn = `(async (url) => {
  const ctx = new OfflineAudioContext(1, 128, 48000); const buf = await ctx.decodeAudioData(await (await fetch(url)).arrayBuffer());
  const n = buf.length, sr = buf.sampleRate, m = new Float32Array(n); for (let c = 0; c < buf.numberOfChannels; c++) { const d = buf.getChannelData(c); for (let i = 0; i < n; i++) m[i] += d[i] / buf.numberOfChannels; }
  let pk = 0, s2 = 0; for (let i = 0; i < n; i++) { const a = Math.abs(m[i]); if (a > pk) pk = a; s2 += m[i] * m[i]; }
  const w = Math.round(0.05 * sr), rmsW = []; for (let i = 0; i + w <= n; i += w) { let s = 0; for (let k = 0; k < w; k++) s += m[i + k] * m[i + k]; rmsW.push(Math.sqrt(s / w)); }
  const sorted = Float64Array.from(rmsW).sort(); const floor = sorted[Math.floor(sorted.length * 0.1)] || 1e-9, loud = sorted[sorted.length - 1] || 1e-9;
  // spectrum of the loudest 0.4 s (Hann, 4096, averaged)
  let bi = 0, bv = -1; const w4 = Math.round(0.4 * sr); for (let i = 0; i + w4 <= n; i += Math.round(0.05 * sr)) { let s = 0; for (let k = 0; k < w4; k += 8) s += m[i + k] * m[i + k]; if (s > bv) { bv = s; bi = i; } }
  const N = 4096, re = new Float64Array(N), im = new Float64Array(N), P = new Float64Array(N / 2); let cnt = 0;
  const fft = () => { for (let i = 1, j = 0; i < N; i++) { let bit = N >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } } for (let len = 2; len <= N; len <<= 1) { const ang = -2 * Math.PI / len; for (let i = 0; i < N; i += len) for (let k = 0; k < len / 2; k++) { const wr = Math.cos(ang * k), wi = Math.sin(ang * k); const a = i + k, b = i + k + len / 2; const xr = re[b] * wr - im[b] * wi, xi = re[b] * wi + im[b] * wr; re[b] = re[a] - xr; im[b] = im[a] - xi; re[a] += xr; im[a] += xi; } } };
  for (let o = bi; o + N <= Math.min(n, bi + w4); o += N / 2) { for (let k = 0; k < N; k++) { re[k] = m[o + k] * (0.5 - 0.5 * Math.cos(2 * Math.PI * k / N)); im[k] = 0; } fft(); for (let k = 0; k < N / 2; k++) P[k] += re[k] * re[k] + im[k] * im[k]; cnt++; }
  let tot = 0, cen = 0; for (let k = 1; k < N / 2; k++) { tot += P[k]; cen += P[k] * k * sr / N; } let acc = 0, r95 = 0, r99 = 0; for (let k = 1; k < N / 2; k++) { acc += P[k]; if (!r95 && acc >= 0.95 * tot) r95 = k * sr / N; if (!r99 && acc >= 0.99 * tot) r99 = k * sr / N; }
  let hf = 0; for (let k = 1; k < N / 2; k++) if (k * sr / N > 10000) hf += P[k];
  const db = v => +(20 * Math.log10(v + 1e-12)).toFixed(1);
  return { ctxRate: sr, channels: buf.numberOfChannels, seconds: +buf.duration.toFixed(3), peakDbFS: db(pk), rmsDbFS: db(Math.sqrt(s2 / n)), crestDb: db(pk / Math.sqrt(s2 / n)), noiseFloorDbFS: db(floor), loudestWindowDbFS: db(loud), dynamicRangeDb: +(db(loud) - db(floor)).toFixed(1), spectralCentroidHz: Math.round(cen / tot), rolloff95Hz: Math.round(r95), rolloff99Hz: Math.round(r99), shareAbove10kHz: +(hf / tot).toExponential(2) };
})`;
const out = [];
for (const f of files) { const buf = fs.readFileSync(path.join(PILOT, f)); const hdr = f.endsWith('.mp3') ? mp3Header(buf) : f.endsWith('.wav') ? { codec: 'WAV PCM 16-bit (audio track extracted from a CC video; source track was 8 kHz mono Vorbis, ~17 kbps)', sampleRate: buf.readUInt32LE(24), channels: buf.readUInt16LE(22) } : oggHeader(buf); const m = await pg.evaluate(`(${fn})('../pilot/${f}')`); out.push({ file: f, bytes: buf.length, container: hdr, measured: m }); console.log(f, JSON.stringify(hdr), m.seconds + 's', 'pk', m.peakDbFS, 'floor', m.noiseFloorDbFS, 'cent', m.spectralCentroidHz, 'r95', m.rolloff95Hz); }
fs.writeFileSync(path.join(PILOT, 'MEASURED.json'), JSON.stringify({ tool: 'mixer-bench/tools/analyze-pilot.mjs', chrome: ch.version.Browser, note: 'Freesound files are the site\'s public "HQ preview" MP3 renders (128 kbps class); the lossless originals need a Freesound login and were not fetched. All numbers are of the decoded preview.', files: out }, null, 1));
pg.close(); await closeChrome(ch.port); srv.close(); process.exit(0);
