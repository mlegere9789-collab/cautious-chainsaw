// Specimen sheet: runs the SHIPPED lS draw routine (text sliced from release/R1c bundle) in a real canvas on synthetic placements laid out on a grid.
// Not a screenshot of the live app: it shows what the shipped routine paints for each disposition x side x strength, for the catalogue.
import fs from 'node:fs';
import path from 'node:path';
import { open, SHOTS, WORK, sleep } from './common.mjs';
const src = fs.readFileSync(`${WORK}/r1c.pretty.js`, 'utf8');
const between = (s, a, b) => { const i = s.indexOf(a); const j = s.indexOf(b, i); return s.slice(i, j); };
const draw = between(src, 'const Lp = {', 'const Jx = {};');
const DISP = ['Line of Battle', 'Charging Line', 'Skirmish Line', 'Chaotic Retreat', 'Line of March', 'Reserve', 'Bivouac', 'Deployed Artillery', 'Limbered Artillery', 'Mounted Cavalry', 'Dismounted Cavalry'];
const html = `<!doctype html><meta charset=utf-8><body style="margin:0;background:#1d2a1c;font-family:sans-serif">
<canvas id=c style="position:absolute;left:0;top:0"></canvas><div id=t></div>
<script>
const api = (function(){ ${draw}\n return { lS, Lp }; })();
const DISP = ${JSON.stringify(DISP)};
const sel = new URLSearchParams(location.search);
const Z = +(sel.get('z') || 17);
const colW = 150, rowH = 56, x0 = 150, y0 = 60;
const strengths = [100, 400, 2000];
const units = [];
let n = 0;
DISP.forEach((d, r) => { ['U', 'C'].forEach((s, si) => { strengths.forEach((st, k) => {
  const art = /Artillery/.test(d); const cav = /Cavalry/.test(d);
  const id = (s + '-' + (art ? 'ART-' : cav ? 'CAV-' : '') + (n++)).slice(0, 14);
  units.push({ unit_id: id, lat: y0 + r * rowH + 24, lng: x0 + (si * 3 + k) * colW / 1.0 + 40, bearing: 90, disposition: d, strength: st });
}); }); });
const W = x0 + 6 * colW + 40, H = y0 + DISP.length * rowH + 30;
const c = document.getElementById('c'); c.width = W; c.height = H; c.style.width = W + 'px'; c.style.height = H + 'px';
const map = { project: ([lng, lat]) => ({ x: lng, y: lat }), getZoom: () => Z };
api.lS(c, map, units, null, null, { sides: ['Union', 'Confederate'], minStrength: 0 }, {}, 0);
const ctx = c.getContext('2d'); ctx.fillStyle = '#e8d5a3'; ctx.font = 'bold 12px sans-serif';
ctx.fillText('Union (U-)', x0 + 40, 24); ctx.fillText('Confederate (C-)', x0 + 3 * colW + 40, 24);
ctx.font = '11px sans-serif'; ctx.fillStyle = '#ccc';
[0, 1].forEach((si) => strengths.forEach((st, k) => ctx.fillText('strength ' + st + ' (width ' + Math.max(10, Math.min(120, Math.round(st / 4))) + ' px)', x0 + (si * 3 + k) * colW - 5 + 40, 44)));
DISP.forEach((d, r) => ctx.fillText(d, 8, y0 + r * rowH + 28));
document.title = 'ready';
</script>`;
fs.mkdirSync(`${WORK}/specimen`, { recursive: true });
fs.writeFileSync(`${WORK}/specimen/index.html`, html);
const S = await open({ vp: 'desktop', tiles: 'block', profile: 'specimen', port: 9509 });
try {
  for (const z of [17, 13]) {
    await S.page.goto(`file:///${WORK.replace(/\\/g, '/')}/specimen/index.html?z=${z}`); await sleep(500);
    const dim = await S.page.evaluate(() => [document.getElementById('c').width, document.getElementById('c').height]);
    await S.page.setViewportSize({ width: dim[0], height: dim[1] }).catch(() => {});
    await S.page.screenshot({ path: path.join(SHOTS, `specimen-sheet-lS-z${z}.png`), clip: { x: 0, y: 0, width: dim[0], height: dim[1] } });
    console.log('specimen z' + z, dim);
  }
} finally { await S.close(); }
