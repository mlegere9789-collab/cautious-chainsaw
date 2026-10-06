import fs from 'node:fs';
const D = 'release/R1c/dist/data/';
const Lp = { 'Line of Battle': null, 'Charging Line': '#ff4422', 'Skirmish Line': '#66aaff', 'Chaotic Retreat': '#ff8800', 'Line of March': '#aaaaaa', Reserve: '#226622', Bivouac: '#555555', 'Deployed Artillery': '#f5c518', 'Limbered Artillery': '#c8a84a', 'Mounted Cavalry': '#44aa44', 'Dismounted Cavalry': '#88cc88' };
const NF = { 'Line of Battle': '#4488ff', 'Charging Line': '#ff4422', 'Skirmish Line': '#44aaff', 'Chaotic Retreat': '#ff8800', 'Line of March': '#aaaaaa', Reserve: '#668844', Bivouac: '#888866', 'Deployed Artillery': '#ffdd00', 'Limbered Artillery': '#ccaa00', 'Mounted Cavalry': '#44cc88', 'Dismounted Cavalry': '#228855' };
const Fa = { 'Line of Battle': '#4488ff', 'Charging Line': '#ff4422', 'Skirmish Line': '#44aaff', 'Chaotic Retreat': '#ff8800', 'Line of March': '#aaaaaa', Reserve: '#668844', Bivouac: '#888866', 'Deployed Artillery': '#ffdd00', 'Limbered Artillery': '#ccaa00', 'Mounted Cavalry': '#44cc88', 'Dismounted Cavalry': '#228855' };
const rows = Object.keys(NF).map((k) => ({ disposition: k, legend: NF[k], tileDot: Lp[k] === null ? '(side colour #3a6bc4 / #c43a3a)' : Lp[k], unitPanelBadge: Fa[k], legendEqualsTileDot: Lp[k] === NF[k] }));
console.log(JSON.stringify({ identical: rows.filter((r) => r.legendEqualsTileDot).map((r) => r.disposition), rows }, null, 1));
// strength / tile length cap
const files = fs.readdirSync(D).filter((f) => /^(placements_day|density_)/.test(f));
let n = 0, cap = 0, nul = 0; const lens = [];
const byUnit = {};
for (const f of files) { const j = JSON.parse(fs.readFileSync(D + f)); const arr = Array.isArray(j) ? j : j.placements || []; for (const p of arr) { if (p.lat == null) continue; n++; if (p.strength == null) { nul++; continue; } const L = Math.max(10, Math.min(120, Math.round((p.strength || 200) / 4))); if (L >= 120) cap++; lens.push(L); } }
lens.sort((a, b) => a - b);
console.log(JSON.stringify({ keyframes: n, strengthNull: nul, tileLengthCapped120: cap, shareCapped: +(cap / n).toFixed(3), medianLen: lens[Math.floor(lens.length / 2)], p10: lens[Math.floor(lens.length * .1)], p90: lens[Math.floor(lens.length * .9)] }));
// legend 'Size' claims: regiment ~400 -> 100px, brigade ~2000 -> 120, division ~6000 -> 120
console.log('legend size rows -> tile length px:', [400, 2000, 6000].map((s) => [s, Math.max(10, Math.min(120, Math.round(s / 4)))]));
