// tools/probes/jitter.mjs - is the picture smooth?  The headless engine with this skin's footprints plays a stretch of the battle and every mark's PIP (the thing the eye follows; the box centre moves
// by half the width while a name grows, the pip must not) is followed frame by frame.
//   steps       frames in which a solid, settled, live mark moved by more than STEP px (a pop: nothing legitimate moves a settled mark 6 px in 1/60 s except the camera, which is still here)
//   reversals   frames in which a mark's velocity on an axis flips sign with both sides above REV px/frame (a visible back-and-forth: jitter)
//   worst       the largest one-frame step, and the largest reversal
//   node tools/probes/jitter.mjs [--frames=480]  -> results/jitter.json
import fs from 'node:fs';
import path from 'node:path';
import { makeEngine } from '../../src/headless.mjs';
import { QUIET_NIGHT, QUIET_DAY, FOOT } from '../../src/skins/quiet-cartographer.mjs';
import { D1, args } from '../lib.mjs';

const ALL = [...QUIET_NIGHT, ...QUIET_DAY]; const FRAMES = +(args.frames || 480); const STEP = 6; const REV = 0.12; const NEAR = FOOT.ring + 11 / 2;
const SCENES = [
  { id: 'march of the Mississippi regiment, 1 July, 4x, zoom 15', tick: 12, lat: 39.8117, lng: -77.2347, zoom: 15, speed: 4, follow: 'C-11MS' },
  { id: 'the whole field in motion, 3 July afternoon, 4x, zoom 13.5', tick: 540, lat: 39.81592, lng: -77.23677, zoom: 13.5, speed: 4 },
  { id: 'nine marks arriving on Seminary Ridge, 3 July, 1x, zoom 15.5', tick: 399.5, lat: 39.8211, lng: -77.2522, zoom: 15.5, speed: 1 },
  { id: 'The Angle in motion, 4x, zoom 16', tick: 548, lat: 39.8117, lng: -77.2347, zoom: 16, speed: 4 },
  { id: 'zoom glide 13.5 to 16 over a still Angle (camera in motion)', tick: 551, lat: 39.8117, lng: -77.2347, zoom: 13.5, speed: 0, zoomTo: 16 },
];
const rows = [];
for (const sc of SCENES) {
  const e = makeEngine({ start: { tick: sc.tick, lat: sc.lat, lng: sc.lng, zoom: sc.zoom }, viewport: { w: 1440, h: 900 } });
  for (const s of ALL) e.kernel.skins.register(s.id, s, { replace: true }); e.tuning.set('skin.id', 'quiet-cartographer-day'); e.tuning.set('layout.labels', false); e.transport.pause();
  for (let i = 0; i < 90; i++) e.step(16.667);                       // settle at the starting tick
  if (sc.speed) { e.transport.setSpeed(sc.speed); e.transport.play(); } if (sc.zoomTo) e.zoomTo(sc.zoomTo);
  const prev = new Map(); const vel = new Map(); let steps = 0; let reversals = 0; let worstStep = 0; let worstRev = 0; let samples = 0; let marks = new Set(); const examples = []; const bins = new Array(Math.ceil(FRAMES / 60)).fill(0); const big = [];
  for (let f = 0; f < FRAMES; f++) {
    const fr = e.step(16.667); const dx = fr.view.dx; const dy = fr.view.dy;
    for (const t of fr.tiles) {
      if (t.life !== 'live' || t.opacity < 0.5 || t.entering || t.travelling) { prev.delete(t.key); vel.delete(t.key); continue; }
      const sgn = t.side === 'confederate' ? -1 : 1; const near = t.kind === 'leaf' ? NEAR : FOOT.ring + 1;
      const px = t.x + dx - sgn * (t.w / 2 - near) - (t.ax + dx); const py = t.y + dy - (t.ay + dy);           // the pip (or the staff) minus the true position it stands for: the DISPLACEMENT, so the march of the unit itself (and the camera) is not counted as motion of the mark
      const p = prev.get(t.key); prev.set(t.key, [px, py, t.w]); marks.add(t.key);
      if (!p) continue; const vx = px - p[0]; const vy = py - p[1]; samples++;
      const mag = Math.hypot(vx, vy); if (mag > worstStep) worstStep = mag; if (mag > STEP) { steps++; bins[Math.floor(f / 60)]++; if (examples.length < 4) examples.push(`${t.key} f${f} step ${mag.toFixed(1)}`); }
      const v0 = vel.get(t.key); if (v0) { for (const [a, b] of [[vx, v0[0]], [vy, v0[1]]]) if (a * b < 0 && Math.min(Math.abs(a), Math.abs(b)) > REV) { reversals++; bins[Math.floor(f / 60)]++; worstRev = Math.max(worstRev, Math.min(Math.abs(a), Math.abs(b))); if (Math.min(Math.abs(a), Math.abs(b)) > 0.5) big.push(`${t.key} f${f} ${a.toFixed(2)}/${b.toFixed(2)}`); if (examples.length < 4) examples.push(`${t.key} f${f} reversal ${a.toFixed(2)}/${b.toFixed(2)}`); } }
      vel.set(t.key, [vx, vy]);
    }
  }
  const row = { scene: sc.id, frames: FRAMES, marksFollowed: marks.size, samples, steps, reversals, worstStepPx: +worstStep.toFixed(2), worstReversalPx: +worstRev.toFixed(2), eventsPerSecondOfPlay: bins, reversalsAbove0_5px: big.length, bigExamples: big.slice(0, 6), examples };
  rows.push(row); console.log(JSON.stringify(row));
}
fs.mkdirSync(path.join(D1, 'results'), { recursive: true }); fs.writeFileSync(path.join(D1, 'results', 'jitter.json'), JSON.stringify({ generated: new Date().toISOString(), method: `headless engine, this skin's footprints, ${FRAMES} frames at 60 per second; a pip's displacement from its true position changing by more than ${STEP} px in one frame is a pop; a velocity flip with both sides above ${REV} px per frame is jitter`, rows }, null, 1));
