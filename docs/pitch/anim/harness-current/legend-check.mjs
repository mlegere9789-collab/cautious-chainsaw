// Legend (VF tables NF/UF/jF in the bundle) versus what the shipped draw routine really paints.
import fs from 'node:fs';
import { makeApp } from './sim.mjs';
import { storeFor } from './replay.mjs';
const src = fs.readFileSync('C:/Users/mlege/gettysburg-map/tmp/pitch-anim/a1/base.pretty.js', 'utf8').replace(/\s+/g, ' ');
const NF = [{ label: 'Line of Battle', color: '#4488ff' }, { label: 'Charging Line', color: '#ff4422' }, { label: 'Skirmish Line', color: '#44aaff' }, { label: 'Chaotic Retreat', color: '#ff8800' }, { label: 'Line of March', color: '#aaaaaa' }, { label: 'Reserve', color: '#668844' }, { label: 'Bivouac', color: '#888866' }, { label: 'Deployed Artillery', color: '#ffdd00' }, { label: 'Limbered Artillery', color: '#ccaa00' }, { label: 'Mounted Cavalry', color: '#44cc88' }, { label: 'Dismounted Cavalry', color: '#228855' }];
// sanity: the table above is the one in the bundle
for (const n of NF) if (!src.includes(`label: "${n.label}", color: "${n.color}"`)) throw new Error('legend table differs from bundle: ' + n.label);
const pbt = storeFor('r1c').pbt;
const app = makeApp('r1c', { pbt, W: 400000, H: 400000, center: [-77.235, 39.812], zoom: 17 });
const seen = {};
for (const t of [1, 120, 226, 400, 451, 538, 556, 620, 675]) {
  app.drawStill(t);
  const fr = app.ctx.frames[app.ctx.frames.length - 1]; const units = app.api.getLastY1();
  const proj = (u) => true;
  units.forEach((u, i) => { const d = fr.dots[i], tile = fr.tiles[i]; if (!d || !tile) return; const side = u.unit_id.startsWith('U-') ? 'Union' : 'Confederate'; const k = `${u.disposition}|${side}`; seen[k] ||= { disposition: u.disposition, side, dot: new Set(), kind: new Set(), fill: new Set(), h: new Set() }; seen[k].dot.add(d.color); seen[k].kind.add(tile.kind); if (tile.fill) seen[k].fill.add(tile.fill); seen[k].h.add(tile.h); });
}
const rows = Object.values(seen).map((s) => ({ disposition: s.disposition, side: s.side, drawnDot: [...s.dot], tileKind: [...s.kind], tileFill: [...s.fill], heights: [...s.h] })).sort((a, b) => a.disposition.localeCompare(b.disposition) || a.side.localeCompare(b.side));
const cmp = NF.map((n) => { const d = rows.filter((r) => r.disposition === n.label); const drawn = [...new Set(d.flatMap((r) => r.drawnDot))]; return { disposition: n.label, legendColor: n.color, drawnDotColors: drawn, legendMatchesDrawn: drawn.length === 1 && drawn[0].toLowerCase() === n.color.toLowerCase() }; });
const out = { legendVsDrawn: cmp, drawnShapes: rows, sidesLegend: { legend: { Union: '#3355cc', Confederate: '#cc4433' }, drawnTileFill: { Union: '#3a6bc4', Confederate: '#c43a3a' }, drawnTileBorder: { Union: '#1a3a7a', Confederate: '#7a1a1a' } }, sizeLegend: { legend: 'Dot radius scales with unit strength: Regiment (~400) r5, Brigade (~2000) r7, Division (~6000) r9', drawn: 'dot radius is a constant 3.5 px; tile width = clamp(round(strength/4), 10, 120) px (desktop), /6 and cap 60 (phone)', widthForStrength: { 400: 100, 2000: 120, 6000: 120 } }, sidesNote: { legend: 'Dot outline = side color; Dot fill = disposition color', drawn: 'dot outline is rgba(0,0,0,0.8) for every unit; side is carried by the tile fill, not the dot' } };
fs.writeFileSync('C:/Users/mlege/gettysburg-map/tmp/pitch-anim/a1/legend-check.json', JSON.stringify(out, null, 2));
console.log(JSON.stringify(cmp, null, 1)); console.log(JSON.stringify(rows.slice(0, 6)));
