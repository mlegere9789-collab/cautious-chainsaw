import fs from 'node:fs';
import { storeFor } from './replay.mjs';
const pbt = storeFor('r1c').pbt;
const state = []; const carry = new Map();
for (let t = 1; t <= 675; t++) { for (const r of pbt[t] || []) carry.set(r.unit_id, r); state[t] = new Map(carry); }
const pxPerM = (512 * 2 ** 13.5) / (40075016.686 * Math.cos((39.812 * Math.PI) / 180));
const mm = (a, b) => Math.hypot((a.lat - b.lat) * 111320, (a.lng - b.lng) * 111320 * Math.cos((a.lat * Math.PI) / 180));
const q = (a, p) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const out = {};
for (const [name, d] of [['one tick forward (play, Next)', 1], ['one tick back (Prev)', -1], ['12 ticks forward (Shift+Right, Fwd 1hr)', 12], ['12 ticks back (Shift+Left, Back 1hr)', -12], ['60 ticks (5 h) forward', 60], ['225 ticks (one day) forward', 225], ['225 ticks (one day) back', -225]]) {
  const moved = [], appeared = [], vanished = [], disp = []; let n = 0;
  for (let t = 1; t <= 675; t++) { const t2 = t + d; if (t2 < 1 || t2 > 675) continue; n++; let m = 0, ap = 0, va = 0; const A = state[t], B = state[t2];
    for (const [id, b] of B) { const a = A.get(id); if (!a) { ap++; continue; } const dm = mm(a, b); if (dm > 1) { m++; disp.push(dm * pxPerM); } }
    for (const id of A.keys()) if (!B.has(id)) va++;
    moved.push(m); appeared.push(ap); vanished.push(va); }
  const mean = (a) => +(a.reduce((x, y) => x + y, 0) / a.length).toFixed(1);
  out[name] = { transitions: n, unitsThatJump: { mean: mean(moved), p95: q(moved, 0.95), max: Math.max(...moved) }, unitsPoppingIn: { mean: mean(appeared), max: Math.max(...appeared) }, unitsVanishing: { mean: mean(vanished), max: Math.max(...vanished) }, jumpDistancePx_at_z13_5: { median: Math.round(q(disp, 0.5)), p95: Math.round(q(disp, 0.95)), max: Math.round(Math.max(...disp)) }, jumpDistanceMetres: { median: Math.round(q(disp, 0.5) / pxPerM), p95: Math.round(q(disp, 0.95) / pxPerM), max: Math.round(Math.max(...disp) / pxPerM) } };
}
fs.writeFileSync('scrub-calcs.json', JSON.stringify(out, null, 2)); console.log(JSON.stringify(out, null, 1));
