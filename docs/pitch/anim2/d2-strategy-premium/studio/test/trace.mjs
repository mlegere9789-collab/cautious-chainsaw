// test/trace.mjs - the jitter, drawn: the per-frame motion of the tiles that pop worst in the layout-as-solved mode (snap), the same tiles under glide + pushing, from the same headless run.
// Writes shots/jitter-trace.svg and results/jitter-trace.json.   node docs/pitch/anim/prototype/test/trace.mjs [--scene=fresh2] [--zoom=15] [--speed=4] [--secs=6]
// y = how far a tile's OFFSET from its true position changed in one frame (px): 0 is a tile that moves exactly with its unit, a spike is a hop.  Tiles dimmed while travelling are drawn dotted.
import fs from 'node:fs';
import path from 'node:path';
import { makeEngine, loadDocs, PROTO } from '../src/headless.mjs';

const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? '1']; }));
const SCENE = args.scene || 'fresh2'; const ZOOM = +(args.zoom || 15); const SPEED = +(args.speed || 4); const SECS = +(args.secs || 6);
const { dataset } = loadDocs(); const sc = dataset.scenes.find((s) => s.id === SCENE);
function run(mode) {
  const e = makeEngine({ start: { tick: sc.tick, lat: sc.lat, lng: sc.lng, zoom: ZOOM }, settings: { 'motion.mode': mode, 'camera.zoom': ZOOM } }); e.setViewport(1440, 900); e.transport.setSpeed(SPEED); e.step(1000 / 60); e.transport.play();
  const series = new Map(); let prev = new Map(); const n = SECS * 60;
  for (let i = 0; i < n; i++) {
    const f = e.step(1000 / 60); const cur = new Map();
    for (const t of f.tiles) { if (t.life !== 'live') continue; cur.set(t.key, [t.x - t.ax, t.y - t.ay]); const p = prev.get(t.key); if (!p) continue; let s = series.get(t.key); if (!s) series.set(t.key, s = { key: t.key, ex: new Array(n).fill(null), solid: new Array(n).fill(true) }); s.ex[i] = Math.hypot(cur.get(t.key)[0] - p[0], cur.get(t.key)[1] - p[1]); s.solid[i] = t.solid; }
    prev = cur;
  }
  return { series, n };
}
const snap = run('snap'); const dyn = run('dynamics');
const score = (s) => Math.max(...s.ex.filter((v) => v !== null), 0);
const worst = [...snap.series.values()].sort((a, b) => score(b) - score(a)).slice(0, 8).map((s) => s.key);
const W = 980; const H = 250; const M = { l: 52, r: 16, t: 28, b: 34 }; const YMAX = 90; const n = snap.n;
const x = (i) => M.l + (i / (n - 1)) * (W - M.l - M.r); const y = (v) => M.t + (1 - Math.min(v, YMAX) / YMAX) * (H - M.t - M.b);
const COL = ['#1f5aa6', '#c2410c', '#15803d', '#7e22ce', '#b45309', '#0e7490', '#be123c', '#4d7c0f'];
function panel(title, data, oy) {
  let g = `<g transform="translate(0,${oy})"><text x="${M.l}" y="16" font-size="13" font-weight="600" fill="#1d2126">${title}</text>`;
  for (const v of [0, 12, 30, 60, 90]) g += `<line x1="${M.l}" x2="${W - M.r}" y1="${y(v)}" y2="${y(v)}" stroke="${v === 12 ? '#c2410c' : '#d6d1c6'}" stroke-dasharray="${v === 12 ? '4 3' : '0'}"/><text x="${M.l - 6}" y="${y(v) + 4}" font-size="10" text-anchor="end" fill="#566069">${v}</text>`;
  g += `<text x="${W - M.r}" y="${y(12) - 3}" font-size="10" text-anchor="end" fill="#c2410c">12 px in one frame = a teleport</text>`;
  worst.forEach((k, ci) => { const s = data.series.get(k); if (!s) return; let d = ''; let pen = false; s.ex.forEach((v, i) => { if (v === null) { pen = false; return; } d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)} `; pen = true; }); g += `<path d="${d}" fill="none" stroke="${COL[ci % COL.length]}" stroke-width="1.3" opacity="0.9"/>`; });
  for (let sec = 0; sec <= SECS; sec++) g += `<text x="${x(sec * 60)}" y="${H - 14}" font-size="10" text-anchor="middle" fill="#566069">${sec} s</text>`;
  return g + '</g>';
}
const stat = (data) => { let tele = 0; let pops = 0; let frames = 0; for (const s of data.series.values()) s.ex.forEach((v, i) => { if (v === null || !s.solid[i]) return; frames++; if (v > 12) tele++; if (v > 3) pops++; }); return { tele, pops, frames }; };
const a = stat(snap); const b = stat(dyn);
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${2 * H + 74}" width="${W}" font-family="system-ui, Segoe UI, sans-serif"><rect width="100%" height="100%" fill="#faf8f3"/>
<text x="${M.l}" y="18" font-size="15" font-weight="700" fill="#1d2126">Per-frame motion of the 8 tiles that hop worst in the layout-as-solved mode (scene ${SCENE}, zoom ${ZOOM}, ${SPEED}x, ${SECS} s, 60 fps, real data)</text>
${panel(`Layout as solved (snap): ${a.tele} teleports (over 12 px) and ${a.pops} pops (over 3 px) among all ${snap.series.size} tiles`, snap, 30)}
${panel(`Glide + pushing + travel (dynamics): ${b.tele} teleports and ${b.pops} pops among all ${dyn.series.size} tiles`, dyn, H + 40)}
<text x="${M.l}" y="${2 * H + 68}" font-size="10.5" fill="#566069">Same tiles, same units, same frames. Counted over every tile that is solid in two consecutive frames; a tile that dims to travel is not counted (it is not solid). Source: test/trace.mjs, metrics/metrics.mjs.</text></svg>`;
fs.mkdirSync(path.join(PROTO, 'results'), { recursive: true });
fs.writeFileSync(path.join(PROTO, 'shots', 'jitter-trace.svg'), svg);
fs.writeFileSync(path.join(PROTO, 'results', 'jitter-trace.json'), JSON.stringify({ scene: SCENE, zoom: ZOOM, speed: SPEED, seconds: SECS, worstTiles: worst, snap: a, dynamics: b }, null, 1));
console.log('snap', a, 'dynamics', b, 'worst tiles', worst.join(', '));
