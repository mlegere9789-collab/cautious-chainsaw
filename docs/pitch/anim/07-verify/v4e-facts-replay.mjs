// v4e-facts-replay.mjs - the numbers the showcase prints about the OLD renderer (FACTS in tours/library.mjs: 833 hops of 8 px or more, 159 frames, 66 snap-backs, 407 units that vanish for one frame, at zoom 13.5)
// recomputed from scratch with the SHIPPED code: y1 / F4 are cut out of baseline/dist/assets/index-*.js and run in a vm; the playback loop is the shipped Ed rule (accumulate frame time, advance
// floor(acc / (500 / speed)) ticks, draw the OLD tick + the NEW fraction) at exactly 60 Hz (16.667 ms frames) over the whole battle (tick 1 to 675) at 1x and 4x.  Positions are projected with Web-Mercator
// at zoom 13.5.  No part of the prototype is used.   -> results/v4e-facts-replay.json
import vm from 'node:vm';
import { writeJson } from './lib.mjs';
import { rj, PLACEMENT_FILES, bundle, mercator } from './srcdata.mjs';

const a = bundle.indexOf('function n2(c,f,x){'); const b = bundle.indexOf('const Lp={"Line of Battle"'); const box = {}; vm.createContext(box);
vm.runInContext(bundle.slice(a, b) + ';this.y1=y1;this.reset=()=>{for(const k of Object.keys(i2))delete i2[k]};', box);
const byTick = {}; for (const f of PLACEMENT_FILES) for (const p of rj(f).placements) (byTick[p.tick] || (byTick[p.tick] = [])).push(p);
const Z = 13.5; const proj = (lng, lat) => mercator(lng, lat, Z);
function replay(speed, dtMs = 1000 / 60) {
  box.reset(); const Pe = 500 / speed; let H = 1; let Hc = 0; let prev = new Map(); let prevAdv = false; const hopFrames = new Set(); let hops = 0; const hopPx = []; let frames = 0; let maxSimul = 0; let snap = 0; const snapPx = [];
  const gone = new Map(); let blinks = 0; const blinkUnits = new Set(); const seenEver = new Set(); let simulStats = 0;
  while (H < 675 || Hc < Pe * 0.5) {
    frames++; const st = H; let ut = 0; let advanced = false;
    Hc += dtMs; if (Hc >= Pe) { const ht = Math.floor(Hc / Pe); Hc = Hc % Pe; const it = Math.min(H + ht, 675); if (it !== H) { H = it; advanced = true; } ut = Hc / Pe; } else ut = Hc / Pe;
    const rows = box.y1(byTick, st, ut); const cur = new Map(); for (const r of rows) cur.set(r.unit_id, proj(r.lng, r.lat));
    let nHop = 0; for (const [id, p] of cur) { const q = prev.get(id); if (!q) { const g = gone.get(id); if (g !== undefined && frames - g === 2 && seenEver.has(id)) { blinks++; blinkUnits.add(id); } seenEver.add(id); continue; } const d = Math.hypot(p[0] - q[0], p[1] - q[1]); if (d >= 8) { hops++; nHop++; hopPx.push(d); hopFrames.add(frames); } }
    for (const id of prev.keys()) if (!cur.has(id)) gone.set(id, frames); if (nHop > maxSimul) maxSimul = nHop; prev = cur; if (H >= 675 && Hc >= Pe * 0.5) break; if (frames > 200000) break;
  }
  hopPx.sort((x, y) => x - y); const q = (p) => hopPx[Math.min(hopPx.length - 1, Math.floor(p * (hopPx.length - 1)))];
  return { speed, frames, hops, hopFrames: hopFrames.size, medianPx: +q(0.5).toFixed(1), p95Px: +q(0.95).toFixed(1), maxPx: +q(1).toFixed(1), maxSimultaneous: maxSimul, unitsThatVanishForOneFrame: blinkUnits.size, blinkEvents: blinks };
}
// snap-backs: on the frame in which the tick advances the shipped loop draws the OLD tick with the NEW fraction; an interpolating unit (a row at tick f and at f + 1, 0.05 degrees or less apart) is drawn back
// near the START of the segment it has just finished.  Count the units drawn at least 8 px BACK toward the segment start on that frame, compared with the frame before.
function snapBacks(speed, dtMs = 1000 / 60) {
  box.reset(); const Pe = 500 / speed; let H = 1; let Hc = 0; let prev = new Map(); let prevAdvFrame = false; let n = 0; const px = []; let frames = 0;
  while (H < 675) {
    frames++; const st = H; let ut = 0; let advanced = false; Hc += dtMs; if (Hc >= Pe) { const ht = Math.floor(Hc / Pe); Hc = Hc % Pe; const it = Math.min(H + ht, 675); if (it !== H) { H = it; advanced = true; } ut = Hc / Pe; } else ut = Hc / Pe;
    const rows = box.y1(byTick, st, ut); const cur = new Map(); for (const r of rows) cur.set(r.unit_id, proj(r.lng, r.lat));
    if (advanced) { const cA = byTick[st] || []; const cB = byTick[st + 1] || []; const mB = new Map(cB.map((r) => [r.unit_id, r])); for (const r of cA) { const nx = mB.get(r.unit_id); if (!nx) continue; if (Math.abs(r.lat - nx.lat) + Math.abs(r.lng - nx.lng) > 0.05) continue; const p0 = proj(r.lng, r.lat); const p1 = proj(nx.lng, nx.lat); const prevP = prev.get(r.unit_id); const nowP = cur.get(r.unit_id); if (!prevP || !nowP) continue; const dir = [p1[0] - p0[0], p1[1] - p0[1]]; const L = Math.hypot(dir[0], dir[1]); if (L < 1e-9) continue; const step = [nowP[0] - prevP[0], nowP[1] - prevP[1]]; const back = -(step[0] * dir[0] + step[1] * dir[1]) / L; if (back >= 8) { n++; px.push(back); } } }
    prev = cur; if (frames > 200000) break;
  }
  px.sort((x, y) => x - y); return { speed, snapBacks: n, medianPx: px.length ? +px[Math.floor(px.length / 2)].toFixed(1) : null, maxPx: px.length ? +px[px.length - 1].toFixed(1) : null };
}
const res = { generated: new Date().toISOString(), zoom: Z, replay: [replay(1), replay(4)], snap: [snapBacks(1), snapBacks(4)] };
console.log(JSON.stringify(res, null, 1));

// ---- the same replay, classified the way report 01 classifies (so that its published numbers can be compared like with like): a HOP is a step of 8 px or more of a unit that is not interpolating (now or before) and is not
// the frame after a snap-back; a SNAP-BACK is a unit that is interpolating between the keyframes of ticks f and f + 1 and is drawn EARLIER on its path than in the previous frame (same f, smaller fraction).
function classified(speed, hopPx = 8) {
  box.reset(); const Pe = 500 / speed; let H = 1; let Hc = 0; let prev = null; let frames = 0; let ts = 0; let first = true; const has = (id, t) => { const a = byTick[t]; if (!a) return false; for (const r of a) if (r.unit_id === id) return true; return false; };
  const hops = []; const hopFrames = new Set(); let snap = 0; const seenBefore = new Set(); const goneAt = new Map(); let reappear = 0; let reappearAfterOne = 0; let appear = 0; const recovering = new Set(); let simul = 0;
  for (;;) {
    const ze = first ? 16 : 1000 / 60; first = false; const stl = H; let ut = 0; Hc += ze; if (Hc >= Pe) { const ht = Math.floor(Hc / Pe); Hc = Hc % Pe; const it = Math.min(H + ht, 675); if (it !== H) { H = it; if (it >= 675) break; } ut = Hc / Pe; } else ut = Hc / Pe;
    frames++; const rows = box.y1(byTick, stl, ut); const cur = new Map(); for (const r of rows) { const p2 = proj(r.lng, r.lat); cur.set(r.unit_id, { x: p2[0], y: p2[1], f: stl, xf: ut }); }
    if (prev) {
      let nh = 0;
      for (const [id, c] of cur) { const p = prev.get(id);
        if (!p) { if (seenBefore.has(id)) { reappear++; if (goneAt.get(id) === frames - 1) reappearAfterOne++; } else { appear++; seenBefore.add(id); } continue; } seenBefore.add(id);
        const step = Math.hypot(c.x - p.x, c.y - p.y); if (step < 0.01) continue;
        const interpNow = c.xf > 0 && has(id, c.f) && has(id, c.f + 1); const interpPrev = p.xf > 0 && has(id, p.f) && has(id, p.f + 1); const samePair = interpNow && interpPrev && c.f === p.f;
        if (samePair && c.xf < p.xf) { snap++; recovering.add(id); continue; }
        if (recovering.has(id)) { recovering.delete(id); continue; }
        if (samePair && c.xf > p.xf) continue; if (interpNow || interpPrev) continue;
        if (step >= hopPx) { hops.push(step); hopFrames.add(frames); nh++; } }
      for (const id of prev.keys()) if (!cur.has(id)) goneAt.set(id, frames); if (nh > simul) simul = nh;
    }
    prev = cur; if (frames > 400000) break;
  }
  hops.sort((x, y) => x - y); const q = (pp) => hops[Math.min(hops.length - 1, Math.floor(pp * hops.length))];
  return { speed, frames, hops: hops.length, framesWithAHop: hopFrames.size, medianPx: +q(0.5).toFixed(1), p95Px: +q(0.95).toFixed(1), maxPx: +q(1).toFixed(1), maxSimultaneous: simul, snapBacks: snap, reappearAfterExactlyOneFrameAbsent: reappearAfterOne, firstAppearances: appear };
}
res.classified = [classified(1), classified(4)]; console.log('classified like report 01:', JSON.stringify(res.classified)); writeJson('v4e-facts-replay.json', res);

