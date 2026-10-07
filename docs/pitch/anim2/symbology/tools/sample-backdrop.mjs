// tools/sample-backdrop.mjs - colour statistics of two local satellite screenshots, used ONLY as numbers to choose backdrop test swatches (the images are not copied or committed).
import { launch, REPO } from './chrome.mjs';
import fs from 'node:fs'; import path from 'node:path';
const files = ['tmp/pitch-anim/review/shots/sat-z15-angle.png', 'tmp/pitch-anim/review/shots/sat-z13.5-field.png'];
const { page, close } = await launch({ w: 800, h: 600 });
const out = { note: 'numbers derived from local satellite screenshots (map imagery, not committed); sampled below the top bar', images: [] };
for (const f of files) {
  const b64 = fs.readFileSync(path.join(REPO, f)).toString('base64');
  const r = await page.evaluate(async (b64) => {
    const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
    const W = 360, H = Math.round(W * (img.height - 60) / img.width);
    const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(img, 0, 60, img.width, img.height - 60, 0, 0, W, H);
    const d = g.getImageData(0, 0, W, H).data; const px = [];
    for (let i = 0; i < d.length; i += 4) px.push([d[i], d[i + 1], d[i + 2]]);
    const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    const lum = (p) => 0.2126 * lin(p[0]) + 0.7152 * lin(p[1]) + 0.0722 * lin(p[2]);
    const sorted = px.map((p) => ({ p, l: lum(p) })).sort((a, b) => a.l - b.l);
    const at = (q) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
    const meanOf = (a, b) => { const s = sorted.slice(Math.floor(a * sorted.length), Math.floor(b * sorted.length)); const m = [0, 0, 0]; for (const e of s) for (let k = 0; k < 3; k++) m[k] += e.p[k]; return m.map((x) => Math.round(x / s.length)); };
    const hex = (p) => '#' + p.map((x) => x.toString(16).padStart(2, '0')).join('');
    const bands = {}; for (const [n, a, b] of [['p00-05', 0, 0.05], ['p05-20', 0.05, 0.2], ['p20-40', 0.2, 0.4], ['p40-60', 0.4, 0.6], ['p60-80', 0.6, 0.8], ['p80-95', 0.8, 0.95], ['p95-100', 0.95, 1]]) { const m = meanOf(a, b); bands[n] = { hex: hex(m), L: +lum(m).toFixed(4) }; }
    return { pixels: px.length, medianL: +at(0.5).l.toFixed(4), p05L: +at(0.05).l.toFixed(4), p95L: +at(0.95).l.toFixed(4), bands };
  }, b64);
  out.images.push({ file: f, ...r });
}
fs.writeFileSync(path.join(REPO, 'docs/pitch/anim2/symbology/results/backdrop-sample.json'), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 1));
await close();
