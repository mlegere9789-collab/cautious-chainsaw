// tools/sample-naip.mjs - luminance bands of the NAIP-derived backdrop previews in assets/naip (real aerial imagery, public domain), the same statistic as sample-backdrop.mjs gives for the two satellite screenshots.
// The bands become test backdrops in tools/colour-tests.mjs.   node tools/sample-naip.mjs   -> results/naip-bands.json
import { launch, ROOT } from './chrome.mjs';
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto';
const dir = path.join(ROOT, 'assets', 'naip'); const files = fs.readdirSync(dir).filter((f) => f.endsWith('.jpg')).sort();
const { page, close } = await launch({ w: 800, h: 600 });
const out = { note: 'luminance band colours (mean colour of each percentile band) of the NAIP-derived previews in assets/naip; the whole image is sampled at 360 px width, including the preview\'s own thin labels and roads', images: [] };
for (const f of files) {
  const buf = fs.readFileSync(path.join(dir, f)); const b64 = buf.toString('base64');
  const r = await page.evaluate(async (b64) => {
    const img = new Image(); img.src = 'data:image/jpeg;base64,' + b64; await img.decode();
    const W = 360, H = Math.round((W * img.height) / img.width); const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0, W, H);
    const d = g.getImageData(0, 0, W, H).data; const px = []; for (let i = 0; i < d.length; i += 4) px.push([d[i], d[i + 1], d[i + 2]]);
    const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; const lum = (p) => 0.2126 * lin(p[0]) + 0.7152 * lin(p[1]) + 0.0722 * lin(p[2]);
    const sorted = px.map((p) => ({ p, l: lum(p) })).sort((a, b) => a.l - b.l); const at = (q) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
    const meanOf = (a, b) => { const s = sorted.slice(Math.floor(a * sorted.length), Math.floor(b * sorted.length)); const m = [0, 0, 0]; for (const e of s) for (let k = 0; k < 3; k++) m[k] += e.p[k]; return m.map((x) => Math.round(x / s.length)); };
    const hex = (p) => '#' + p.map((x) => x.toString(16).padStart(2, '0')).join(''); const bands = {};
    for (const [n, a, b] of [['p00-05', 0, 0.05], ['p05-20', 0.05, 0.2], ['p20-40', 0.2, 0.4], ['p40-60', 0.4, 0.6], ['p60-80', 0.6, 0.8], ['p80-95', 0.8, 0.95], ['p95-100', 0.95, 1]]) { const m = meanOf(a, b); bands[n] = { hex: hex(m), L: +lum(m).toFixed(4) }; }
    return { pixels: px.length, medianL: +at(0.5).l.toFixed(4), p05L: +at(0.05).l.toFixed(4), p95L: +at(0.95).l.toFixed(4), bands };
  }, b64);
  out.images.push({ file: 'assets/naip/' + f, sha256: crypto.createHash('sha256').update(buf).digest('hex').slice(0, 16), ...r });
}
fs.writeFileSync(path.join(ROOT, 'results', 'naip-bands.json'), JSON.stringify(out, null, 2)); console.log(out.images.map((i) => `${i.file}: median L ${i.medianL}, p05 ${i.p05L}, p95 ${i.p95L}; bands ${Object.values(i.bands).map((b) => b.hex).join(' ')}`).join('\n'));
await close();
