// v4b-before-fidelity.mjs - is the "Before" view the production renderer?  The SHIPPED code is run here: the functions n2, D4, B4, L4, rA, z4, F4, O4, y1 and the cache i2 are cut out of baseline/dist/assets/index-*.js
// by text markers and evaluated in a vm (nothing re-implemented).  The Studio is put in Before mode, played frame by frame (60 Hz virtual time) from several ticks at 1x and 4x, and for every frame
//   * the tile-set the Before draws is compared with the shipped y1(placementsByTick, tick, fraction) for the SAME (tick, fraction) the frame was drawn at (frame.tau = old tick + new fraction: the stale-tick rule)
//   * the true position of every leaf tile (its anchor) is compared with the shipped lat/lng, projected with my Web-Mercator at the page's camera
// and the playback-loop rule of the shipped Ed (accumulate frame time; when it passes 500/speed ms advance floor(acc/Pe) ticks; draw tick = the tick at the START of the frame + the new fraction) is checked on the clock.
//   node v4b-before-fidelity.mjs -> results/v4b-before-fidelity.json
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { serve, launch, PROTO, REPO, args, writeJson } from './lib.mjs';
import { rj, PLACEMENT_FILES, bundle, mercator } from './srcdata.mjs';

const out = { generated: new Date().toISOString(), checks: [] };
const check = (name, ok, detail) => { out.checks.push({ name, ok: !!ok, detail }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? '  ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 700) : '')); return ok; };
// ---- the shipped code, executed ------------------------------------------------------------------------------------------------------------
const a = bundle.indexOf('function n2(c,f,x){'); const b = bundle.indexOf('const Lp={"Line of Battle"'); if (a < 0 || b < 0 || b < a) throw new Error('markers not found in the shipped bundle');
const slice = bundle.slice(a, b); out.shippedSlice = { chars: slice.length, functions: [...slice.matchAll(/function ([A-Za-z0-9_$]+)\(/g)].map((m) => m[1]) };
const box = {}; vm.createContext(box); vm.runInContext(slice + ';this.y1=y1;this.getCache=()=>i2;this.resetCache=()=>{for(const k of Object.keys(i2))delete i2[k]};', box);
const byTick = {}; for (const f of PLACEMENT_FILES) for (const p of rj(f).placements) (byTick[p.tick] || (byTick[p.tick] = [])).push(p);
const shippedAt = (st, ut) => { box.resetCache(); for (let t = 1; t < st; t++) box.y1(byTick, t, 0); return box.y1(byTick, st, ut); };    // the cache has seen every tick up to st, as in a sequential playback
const PORT = +(args.port || 9703); const srv = await serve(PROTO, PORT); const s = await launch({ port: PORT, query: 'welcome=0&manual=1', profile: 'beforefid' });
try {
  const cases = [[40, 1], [120, 1], [293, 4], [346, 1], [556, 4], [620, 4]]; const rowsOut = []; let framesN = 0; let setBad = 0; let posBad = 0; let compared = 0; let maxPx = 0; let clockBad = 0; let sampleBad = []; const sampleSet = []; let unitsNear = 0; let unitsPageOnScreenOrNear = 0; let unitsShippedAll = 0;
  for (const [tick, speed] of cases) {
    const r = await s.page.evaluate(({ tick, speed }) => { const S = window.__studio; const E = S.engine; E.tuning.set('popup.enabled', false); E.tuning.set('compare.mode', 'before'); E.transport.pause(); E.transport.seek(tick, { glide: false }); E.moveTo({ lat: 39.8117, lng: -77.2347, zoom: 14 }, { glide: false, safe: false });
      for (let i = 0; i < 30; i++) S.step(1, 16.667); E.transport.setSpeed(speed); E.transport.play(); const frames = []; for (let i = 0; i < 260; i++) { const f = S.step(1, 16.667); const cam = E.camera; frames.push({ tau: f.tau, tick: E.transport.simTau, cam: [cam.lng, cam.lat, cam.zoom, cam.w, cam.h], dx: f.view.dx, dy: f.view.dy, leaves: f.tiles.filter((t) => t.kind === 'leaf').map((t) => [t.ids[0], t.ax, t.ay, t.opacity]) }); } E.tuning.set('compare.mode', 'after'); return frames; }, { tick, speed });
    // clock rule: replay the shipped Ed accumulation on dt = 16.667 ms and compare the tick / fraction pairs
    const Pe = 500 / speed; let H = tick; let Hc = 0; let clockMismatch = 0;
    for (let i = 0; i < r.length; i++) {
      const dt = 16.667; let st = H; let ut = 0; Hc += dt; if (Hc >= Pe) { const ht = Math.floor(Hc / Pe); Hc = Hc % Pe; const it = Math.min(H + ht, 675); if (it !== H) H = it; ut = Hc / Pe; } else ut = Hc / Pe; const expTau = st + ut;
      if (Math.abs(r[i].tau - expTau) > 1e-6) { clockMismatch++; if (sampleBad.length < 3) sampleBad.push({ frame: i, page: r[i].tau, shippedRule: expTau, tick, speed }); }
    }
    clockBad += clockMismatch;
    let cmp = 0; let bad = 0; let mx = 0; let setDiff = 0;
    for (let i = 0; i < r.length; i += 3) {                                                                                  // every 3rd frame (the shipped replay per frame is O(ticks x units))
      const fr = r[i]; const st = Math.floor(fr.tau + 1e-9); const ut = fr.tau - st; const exp = shippedAt(st, ut); const c = mercator(fr.cam[0], fr.cam[1], fr.cam[2]);
      const expSet = new Set(exp.map((q) => q.unit_id)); const pageSet = new Set(fr.leaves.map((l) => l[0]));
      // the shipped lS keeps the units with -200 < x < width + 200 and -40 < y < height + 40 (shipped source: function lS): compare exactly those, both ways
      const near = new Set(); for (const q of exp) { const pp = mercator(q.lng, q.lat, fr.cam[2]); const sx = pp[0] - c[0] + fr.cam[3] / 2; const sy = pp[1] - c[1] + fr.cam[4] / 2; if (sx > -200 && sx < fr.cam[3] + 200 && sy > -40 && sy < fr.cam[4] + 40) near.add(q.unit_id); }
      let d = 0; for (const id of near) if (!pageSet.has(id)) d++; for (const id of pageSet) if (!expSet.has(id)) d++; if (d) { setDiff++; if (sampleSet.length < 4) sampleSet.push({ tick, speed, frame: i, missingFromPage: [...near].filter((id) => !pageSet.has(id)).slice(0, 5), extraInPage: [...pageSet].filter((id) => !expSet.has(id)).slice(0, 5) }); }
      unitsNear += near.size; unitsPageOnScreenOrNear += pageSet.size; unitsShippedAll += expSet.size;
      const world0 = mercator(fr.cam[0], fr.cam[1], fr.cam[2]); const byId = new Map(exp.map((q) => [q.unit_id, q]));
      for (const [id, ax, ay] of fr.leaves) { const q = byId.get(id); if (!q) continue; const p = mercator(q.lng, q.lat, fr.cam[2]); const sx = p[0] - c[0] + fr.cam[3] / 2; const sy = p[1] - c[1] + fr.cam[4] / 2; const e = Math.hypot(sx - (ax + fr.dx), sy - (ay + fr.dy)); cmp++; if (e > mx) mx = e; if (e > 0.1) bad++; }
    }
    rowsOut.push({ tick, speed, frames: r.length, comparedFrames: Math.ceil(r.length / 3), positionsCompared: cmp, positionsOver0_1px: bad, maxPx: mx, framesWithDifferentTileSet: setDiff, clockMismatches: clockMismatch }); compared += cmp; posBad += bad; setBad += setDiff; maxPx = Math.max(maxPx, mx); framesN += r.length;
  }
  out.rows = rowsOut; console.table(rowsOut);
  check('Before clock = the shipped playback loop Ed (accumulate frame time, advance floor(acc / (500 / speed)) ticks, draw the OLD tick plus the NEW fraction) on ' + framesN + ' frames at 1x and 4x', clockBad === 0, { mismatches: clockBad, first: sampleBad });
  check('Before tile set = the set the shipped y1() returns for the same (tick, fraction) for every unit inside the window the shipped lS draws (x -200..width+200, y -40..height+40), and nothing the shipped code would not draw: ' + rowsOut.reduce((a, r) => a + r.comparedFrames, 0) + ' frames compared (shipped set all units: mean ' + (unitsShippedAll / 522).toFixed(0) + ', Before draws mean ' + (unitsPageOnScreenOrNear / 522).toFixed(0) + ' of the ' + (unitsNear / 522).toFixed(0) + ' near the screen)', setBad === 0, { framesDifferent: setBad, sampleSet });
  check('Before true positions = the shipped y1() / F4() positions (lat, lng) projected with my Mercator: ' + compared + ' positions, max difference ' + maxPx.toFixed(4) + ' px', posBad === 0 && compared > 5000, { compared, over0_1px: posBad, maxPx });
  out.summary = { pass: out.checks.filter((c) => c.ok).length, fail: out.checks.filter((c) => !c.ok).length }; writeJson('v4b-before-fidelity.json', out); console.log(JSON.stringify(out.summary), 'console errors', s.errors.length);
} finally { await s.close(); srv.close(); }
