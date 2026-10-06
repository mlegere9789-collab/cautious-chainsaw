// test/bench.mjs - the MOTION MATRIX on the real hardest scenes, headless and deterministic (frame times are fixed at 1/60 s, so every number except the milliseconds is reproducible).
// For each scene x speed x motion mode: pops, teleports, jerk, travelling, net repairs, overlaps, unrepresented units, tile churn.  Writes results/motion-matrix.json and prints a table.
//   node docs/pitch/anim/prototype/test/bench.mjs [--secs=8] [--only=fresh2] [--out=results/motion-matrix.json]
// Definitions (metrics/metrics.mjs): pop = a tile that is solid in two consecutive frames and moves more than 3 px beyond its true position's own motion in one frame (the layout lab's
// definition); teleport = the same above 12 px; jerk = |o(f+1) - 2 o(f) + o(f-1)| of that offset; a travelling tile (dimmed below 0.5 while it glides far) is counted separately.
import fs from 'node:fs';
import path from 'node:path';
import { makeEngine, loadDocs, PROTO } from '../src/headless.mjs';

const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? '1']; }));
const SECS = +(args.secs || 8); const { dataset } = loadDocs();
const SCENES = [['fresh2', 15], ['carry1', 14], ['evening1', 14], ['fresh1', 16], ['field', 13.5]].filter(([id]) => !args.only || id === args.only);
const SPEEDS = [1, 4, 16]; const MODES = ['snap', 'spring', 'dynamics'];
const rows = [];
for (const [id, zoom] of SCENES) {
  const sc = dataset.scenes.find((s) => s.id === id);
  for (const speed of SPEEDS) for (const mode of MODES) {
    const e = makeEngine({ start: { tick: sc.tick, lat: sc.lat, lng: sc.lng, zoom }, settings: { 'motion.mode': mode, 'camera.zoom': zoom } }); e.setViewport(1440, 900); e.transport.setSpeed(speed);
    e.step(1000 / 60); e.transport.play(); e.metrics.reset(); for (let i = 0; i < SECS * 60; i++) e.step(1000 / 60);
    const s = e.metrics.summary(); rows.push({ scene: id, zoom, speed, mode, tick0: sc.tick, tick1: +e.transport.simTau.toFixed(1), ...s });
    console.log(`${id.padEnd(9)} z${String(zoom).padEnd(4)} x${String(speed).padEnd(2)} ${mode.padEnd(9)} tiles ${String(s.tilesMean).padEnd(6)} pops/s ${String(s.popsPerSec).padEnd(7)} tele/s ${String(s.teleportsPerSec).padEnd(6)} maxEx ${String(s.maxExcessPx).padEnd(6)} jerkP99 ${String(s.jerkP99).padEnd(6)} travel/s ${String(s.travelsPerSec).padEnd(6)} net/s ${String(s.netDimsPerSec).padEnd(6)} overlapFrames ${s.overlapFrames} unrep ${s.unrepresentedUnitFrames} engine ${s.engineMsMean} ms`);
  }
}
const out = path.resolve(PROTO, args.out || 'results/motion-matrix.json'); fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify({ format: 'battle-studio-bench/1', seconds: SECS, fps: 60, node: process.version, note: 'headless, fixed 1/60 s frames; the millisecond columns are this machine only', rows }, null, 1));
if (args.readme) {
  const NL = String.fromCharCode(10);
  const pick = rows.filter((r) => r.scene === 'fresh2'); const f = (v) => (Number.isInteger(v) ? String(v) : String(+v.toFixed(2)));
  const label = (m) => (m === 'snap' ? 'layout as solved (snap)' : m === 'dynamics' ? '**glide + pushing + travel (default)**' : 'glide only (spring)');
  const lines = ['| speed | mode | tiles | pops/s | teleports/s | worst px in one frame | jerk p99 | travels/s | net repairs/s | overlap frames | unrepresented |', '|---:|:---|---:|---:|---:|---:|---:|---:|---:|---:|---:|'];
  for (const r of pick) lines.push(`| ${r.speed}x | ${label(r.mode)} | ${f(r.tilesMean)} | ${f(r.popsPerSec)} | ${f(r.teleportsPerSec)} | ${f(r.maxExcessPx)} | ${f(r.jerkP99)} | ${f(r.travelsPerSec)} | ${f(r.netDimsPerSec)} | ${r.overlapFrames} | ${r.unrepresentedUnitFrames} |`);
  const rp = path.resolve(PROTO, 'README.md'); const txt = fs.readFileSync(rp, 'utf8'); const a = txt.indexOf('<!--MATRIX-->'); const b = txt.indexOf('<!--/MATRIX-->');
  if (a >= 0 && b > a) { fs.writeFileSync(rp, txt.slice(0, a) + '<!--MATRIX-->' + NL + lines.join(NL) + NL + '<!--/MATRIX-->' + txt.slice(b + '<!--/MATRIX-->'.length)); console.log('README matrix updated'); }
}
const bad = rows.filter((r) => r.overlapFrames || r.unrepresentedUnitFrames); console.log(bad.length ? 'FAILED: overlaps or unrepresented units in ' + bad.length + ' runs' : 'ok: ' + rows.length + ' runs, 0 overlapping frames, 0 unrepresented units'); if (bad.length) process.exit(1);
