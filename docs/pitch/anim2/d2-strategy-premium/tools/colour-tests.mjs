// tools/colour-tests.mjs - colour-vision and greyscale separation of the three sides' fabric, for each palette of design/*.json.  Colour is never the only cue of the side (the fly shape carries it too: notch,
// point, square), so these numbers say how much the COLOUR alone still separates them.  CIEDE2000 between the mid-cloth colours under a simulated vision deficiency (Machado, Oliveira and Fernandes 2009,
// severity 1.0, matrices written from memory, NOT re-read from the paper in this session: indicative), applied in linear sRGB; this project's bar is 20 (the symbology folder's own bar), not a WCAG number.
//   node tools/colour-tests.mjs  ->  results/colour-tests.json
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url)); const ROOT = path.resolve(HERE, '..');
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const unlin = (v) => 255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);
const mixHex = (a, b) => { const A = hex(a); const B = hex(b); return A.map((v, i) => Math.round((v + B[i]) / 2)); };
const SIM = {
  normal: [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
  protanopia: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  deuteranopia: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.01182, 0.04294, 0.968881]],
  tritanopia: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.3039]],
};
const sim = (rgb, M) => { const l = rgb.map(lin); const o = M.map((r) => Math.min(1, Math.max(0, r[0] * l[0] + r[1] * l[1] + r[2] * l[2]))); return o; };
function toLab(l) { const [r, g, b] = l; const X = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047; const Y = 0.2126729 * r + 0.7151522 * g + 0.072175 * b; const Z = (0.0193339 * r + 0.119192 * g + 0.9503041 * b) / 1.08883; const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116); const fx = f(X); const fy = f(Y); const fz = f(Z); return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)]; }
function de2000(a, b) {
  const [L1, a1, b1] = a; const [L2, a2, b2] = b; const rad = Math.PI / 180; const C1 = Math.hypot(a1, b1); const C2 = Math.hypot(a2, b2); const Cb = (C1 + C2) / 2; const G = 0.5 * (1 - Math.sqrt(Cb ** 7 / (Cb ** 7 + 25 ** 7)));
  const a1p = (1 + G) * a1; const a2p = (1 + G) * a2; const C1p = Math.hypot(a1p, b1); const C2p = Math.hypot(a2p, b2); const h = (y, x) => { const v = Math.atan2(y, x) / rad; return v < 0 ? v + 360 : v; }; const h1 = C1p === 0 ? 0 : h(b1, a1p); const h2 = C2p === 0 ? 0 : h(b2, a2p);
  const dL = L2 - L1; const dC = C2p - C1p; let dh = 0; if (C1p * C2p !== 0) { dh = h2 - h1; if (dh > 180) dh -= 360; else if (dh < -180) dh += 360; } const dH = 2 * Math.sqrt(C1p * C2p) * Math.sin(dh * rad / 2);
  const Lb = (L1 + L2) / 2; const Cpb = (C1p + C2p) / 2; let hb = h1 + h2; if (C1p * C2p === 0) hb = h1 + h2; else if (Math.abs(h1 - h2) <= 180) hb = (h1 + h2) / 2; else hb = (h1 + h2 + (h1 + h2 < 360 ? 360 : -360)) / 2;
  const T = 1 - 0.17 * Math.cos((hb - 30) * rad) + 0.24 * Math.cos(2 * hb * rad) + 0.32 * Math.cos((3 * hb + 6) * rad) - 0.2 * Math.cos((4 * hb - 63) * rad); const dTh = 30 * Math.exp(-(((hb - 275) / 25) ** 2)); const Rc = 2 * Math.sqrt(Cpb ** 7 / (Cpb ** 7 + 25 ** 7));
  const Sl = 1 + 0.015 * (Lb - 50) ** 2 / Math.sqrt(20 + (Lb - 50) ** 2); const Sc = 1 + 0.045 * Cpb; const Sh = 1 + 0.015 * Cpb * T; const Rt = -Math.sin(2 * dTh * rad) * Rc;
  return Math.sqrt((dL / Sl) ** 2 + (dC / Sc) ** 2 + (dH / Sh) ** 2 + Rt * (dC / Sc) * (dH / Sh));
}
// published check values (Sharma, Wu and Dalal 2005, pairs 1 and 2) so the maths is itself tested
const chk1 = de2000([50, 2.6772, -79.7751], [50, 0]) ; void chk1;
const sharma = [[[50, 2.6772, -79.7751], [50, 0, -82.7485], 2.0425], [[50, 3.1571, -77.2803], [50, 0, -82.7485], 2.8615]]; const sharmaErr = sharma.map(([a, b, e]) => Math.abs(de2000(a, b) - e));
const flat = (o, pre = '', out = {}) => { for (const [k, v] of Object.entries(o)) { if (k.startsWith('$')) continue; if (v && typeof v === 'object' && '$value' in v) out[pre + k] = v.$value; else if (v && typeof v === 'object') flat(v, pre + k + '.', out); } return out; };
const base = flat(JSON.parse(fs.readFileSync(path.join(ROOT, 'design', 'premium.tokens.json'), 'utf8')));
const variants = { standard: {} }; for (const f of fs.readdirSync(path.join(ROOT, 'design', 'variants')).sort()) if (f.endsWith('.json')) variants[path.basename(f, '.json')] = flat(JSON.parse(fs.readFileSync(path.join(ROOT, 'design', 'variants', f), 'utf8')));
const rows = []; const BAR = 20;
for (const [vn, ov] of Object.entries(variants)) {
  const T = { ...base, ...ov }; const mid = (s) => mixHex(T[`color.${s}.hi`], T[`color.${s}.lo`]); const cols = { union: mid('union'), confederate: mid('csa'), contested: mid('unk') };
  const pairs = [['union', 'confederate'], ['union', 'contested'], ['confederate', 'contested']];
  for (const [vision, M] of Object.entries(SIM)) for (const [a, b] of pairs) rows.push({ palette: vn, vision, pair: a + ' vs ' + b, deltaE2000: +de2000(toLab(sim(cols[a], M)), toLab(sim(cols[b], M))).toFixed(1) });
  const Lg = (c) => { const l = c.map(lin); return 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2]; }; const r = (a, b) => { const x = Lg(cols[a]); const y = Lg(cols[b]); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  rows.push({ palette: vn, vision: 'greyscale (luminance ratio)', pair: 'union vs confederate', value: +r('union', 'confederate').toFixed(2) });
}
const bad = rows.filter((r) => r.deltaE2000 !== undefined && r.deltaE2000 < BAR);
fs.mkdirSync(path.join(ROOT, 'results'), { recursive: true }); fs.writeFileSync(path.join(ROOT, 'results', 'colour-tests.json'), JSON.stringify({ made: 'node tools/colour-tests.mjs', bar: BAR, mathCheck: { sharmaWuDalal2005MaxError: +Math.max(...sharmaErr).toFixed(4) }, rows, below: bad.length }, null, 1));
console.log('CIEDE2000 check against Sharma, Wu and Dalal: max error', Math.max(...sharmaErr).toFixed(4));
for (const r of rows) console.log(r.palette.padEnd(9), r.vision.padEnd(28), r.pair.padEnd(24), String(r.deltaE2000 ?? r.value).padStart(6), r.deltaE2000 !== undefined && r.deltaE2000 < BAR ? 'LOW' : '');
console.log('pairs below', BAR + ':', bad.length);
