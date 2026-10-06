// test/fixes-before-after.mjs - what the three engine fixes found while assembling the page are worth, on the real data: the SAME engine, metrics and scenes, once with the display layer and the layout
// solver as committed before the assembly (commit 7e55509: display.mjs, layout/engine.mjs, layout/strategies.mjs) and once as they are now.
//   1 anchor continuity     an aggregate that gained or lost a member hopped by the jump of its centroid (up to 116 px in one frame)
//   2 rest                  the sticky split trials never settled (limit cycles), the engine never went idle
//   3 arrival               the pushing gap (clearance + 0.25 px) pulled touching tiles apart against the glide that pulled them back: every settled pair vibrated by a fraction of a pixel for ever
// Measured: playback 4x, 8 s at 60 fps (sudden steps, solid ones, the largest one-frame step) and a paused picture over 60 s (aggregate set changes, the largest step of any tile, frames until idle).
//   node test/fixes-before-after.mjs            writes results/assemble-fixes.json
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

const HERE = path.dirname(fileURLToPath(import.meta.url)); const PROTO = path.resolve(HERE, '..'); const REPO = path.resolve(PROTO, '..', '..', '..', '..');
const args = Object.fromEntries(process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => { const [k, v] = a.slice(2).split('='); return [k, v ?? '1']; }));
const OLD_COMMIT = '7e55509'; const OLD = path.join(REPO, 'tmp', 'pitch-anim', 'assemble', 'old');

const PLAY = [['The Angle', 14, 550, 39.8117, -77.2347], ['Rose Woods', 14, 287, 39.7994, -77.2417], ['Cemetery Hill', 14, 340, 39.8189, -77.2262], ['whole field', 13.5, 600, 39.81592, -77.23677], ['The Angle', 15, 550, 39.8117, -77.2347]];
const REST = [['The Angle', 14, 556, 39.8117, -77.2347], ['whole field', 13.5, 620, 39.81592, -77.23677], ['Cemetery Hill', 14, 346, 39.8189, -77.2262], ['The Angle', 15, 551, 39.8117, -77.2347]];

if (args.root) {
  const { makeEngine } = await import(pathToFileURL(path.join(args.root === 'old' ? OLD : PROTO, 'src', 'headless.mjs')).href);
  const mk = (tick, lat, lng, zoom) => { const e = makeEngine({ start: { tick, lat, lng, zoom }, settings: { 'camera.zoom': zoom, 'popup.enabled': false } }); e.setViewport(1440, 900); return e; };
  const out = { play: [], rest: [] };
  for (const [name, zoom, tick, lat, lng] of PLAY) {
    const e = mk(tick, lat, lng, zoom); e.step(16); e.transport.setSpeed(4); e.transport.play(); for (let i = 0; i < 40; i++) e.step(1000 / 60); e.metrics.reset(); for (let i = 0; i < 480; i++) e.step(1000 / 60);
    const s = e.metrics.summary(); out.play.push({ name, zoom, tick, jumpsPerSec: s.jumpsPerSec, jumpsSolidPerSec: s.jumpsSolidPerSec, maxStepPx: s.maxStepPx, popsPerSec: s.popsPerSec, overlapFrames: s.overlapFrames, unrepresented: s.unrepresentedUnitFrames });
  }
  for (const [name, zoom, tick, lat, lng] of REST) {
    const e = mk(tick, lat, lng, zoom); let idleAt = -1; for (let i = 0; i < 300; i++) { e.step(1000 / 60); if (idleAt < 0 && !e.busy()) idleAt = i; }
    const L = e.modules().layout; let prev = null; let changes = 0; let maxStep = 0; let prevPos = null;
    for (let i = 0; i < 3600; i++) {
      const f = e.step(1000 / 60); const sig = [...L.state.aggs.keys()].sort().join('|'); if (prev !== null && sig !== prev) changes++; prev = sig;
      const pos = new Map(f.tiles.filter((t) => t.life === 'live').map((t) => [t.key, [t.x, t.y]])); if (prevPos) for (const [k, p] of pos) { const q = prevPos.get(k); if (q) maxStep = Math.max(maxStep, Math.hypot(p[0] - q[0], p[1] - q[1])); } prevPos = pos;
    }
    out.rest.push({ name, zoom, tick, aggregateChanges60s: changes, largestStepAtRestPx: +maxStep.toFixed(2), idleAfterFrames: idleAt });
  }
  console.log(JSON.stringify(out));
} else {
  // the old tree: today's sources with the three files of the commit before the assembly
  fs.rmSync(OLD, { recursive: true, force: true }); fs.mkdirSync(OLD, { recursive: true });
  for (const d of ['src', 'data', 'tokens']) fs.cpSync(path.join(PROTO, d), path.join(OLD, d), { recursive: true });
  for (const f of ['scene/display.mjs', 'layout/engine.mjs', 'layout/strategies.mjs']) fs.writeFileSync(path.join(OLD, 'src', f), execFileSync('git', ['show', `${OLD_COMMIT}:docs/pitch/anim/prototype/src/${f}`], { cwd: REPO, maxBuffer: 1 << 26 }));
  const run = (root) => JSON.parse(execFileSync(process.execPath, [fileURLToPath(import.meta.url), '--root=' + root], { cwd: REPO, maxBuffer: 1 << 26 }).toString().trim().split('\n').pop());
  const before = run('old'); const after = run('new');
  const res = { generated: new Date().toISOString(), oldCommit: OLD_COMMIT, before, after };
  fs.writeFileSync(path.join(PROTO, 'results', 'assemble-fixes.json'), JSON.stringify(res, null, 1));
  for (const k of ['play', 'rest']) for (let i = 0; i < res.before[k].length; i++) console.log(k, JSON.stringify(res.before[k][i]), '->', JSON.stringify(res.after[k][i]));
}
