// test/strips.mjs - FRAME STRIPS: eight consecutive frames of the same tile, in the production reproduction ("before") and in the Studio ("after"), for the three hardest places, captured from
// the real page in real Chrome.  Deterministic: the page runs with ?manual=1 (only studio.step advances it), the clock ramp is off so both renderers read the same tick on the same frame, and
// the tile is chosen from the data by a rule, not by eye:  in the before run the solid leaf tile with a large one-frame step (a hold-then-jump of 60 to 220 px when there is one in view, else the largest shuffle of 12 px or more) whose neighbourhood
// is clear of the interface, and which the Studio draws as a solid leaf tile of its own on all eight frames.
//   node test/strips.mjs [--out=docs/pitch/anim/shots/prototype/strips] [--speed=16] [--dpr=2]
// then   python test/strips-compose.py   puts the crops together (labels, per-frame displacement, ghost of the previous position).
import fs from 'node:fs';
import path from 'node:path';
import { launch, REPO, WORK, args } from './assemble-lib.mjs';
import { HOTSPOTS } from '../src/tours/library.mjs';

const SPEED = +(args.speed || 16); const ZOOM = +(args.zoom || 15); const DPR = +(args.dpr || 2); const CW = 300; const CH = 180;
const OUT = path.resolve(args.out || path.join(REPO, 'docs', 'pitch', 'anim', 'shots', 'prototype', 'strips'));
const TMP = path.join(WORK, 'strips'); fs.mkdirSync(OUT, { recursive: true }); fs.rmSync(TMP, { recursive: true, force: true }); fs.mkdirSync(TMP, { recursive: true });

const s = await launch({ w: 1440, h: 900, dpr: DPR, port: 9700, query: `welcome=0&manual=1&style=war-room` });
const meta = { generated: new Date().toISOString(), speedx: SPEED, frameMs: 1000 / 60, crop: { w: CW, h: CH }, dpr: DPR, browser: await s.page.evaluate(() => navigator.userAgent), strips: [] };
try {
  await s.page.evaluate(() => { const S = window.__studio; S.engine.tuning.set('popup.enabled', false); S.engine.tuning.set('time.speedRampMs', 0); S.engine.tuning.set('backdrop.id', 'ink'); });
  for (const H0 of HOTSPOTS) {
    const H = { ...H0, zoom: args.zoom ? ZOOM : (H0.id === 'cemetery-hill' ? 16 : ZOOM) }; const start = H.tick - 6;
    // ---- 1. choose the tile: scan both renderers over the same 150 frames -------------------------------------------------------------------------------------------------------------------
    const pick = await s.page.evaluate(({ H, start, SPEED }) => {
      const S = window.__studio; const E = S.engine; const T = E.tuning;
      const run = (mode, n) => {
        T.set('compare.mode', mode); E.transport.pause(); E.transport.seek(start, { glide: false }); E.select(null); E.moveTo({ lat: H.lat, lng: H.lng, zoom: H.zoom }, { glide: false, safe: false }); S.step(70);
        E.transport.setSpeed(SPEED); E.transport.play(); const frames = [];
        for (let i = 0; i < n; i++) { const f = S.step(1); frames.push({ tau: f.tau, tiles: new Map(f.tiles.filter((t) => t.life === 'live' && t.kind === 'leaf').map((t) => [t.key, [t.x + f.view.dx, t.y + f.view.dy, t.solid ? 1 : 0, t.opacity]])) }); }
        E.transport.pause(); return frames;
      };
      const B = run('before', 150); const A = run('after', 150); const inView = (p) => p[0] > 250 && p[0] < 1190 && p[1] > 140 && p[1] < 650; const out = []; const diag = { hops: 0, inView: 0, afterLeaf: 0, single: 0, size: 0 };
      for (let i = 6; i < 140; i++) for (const [k, p] of B[i].tiles) {
        const q = B[i - 1].tiles.get(k); if (!q) continue; const d = Math.hypot(p[0] - q[0], p[1] - q[1]); if (d < 12 || d > 220) continue; diag.hops++; if (!inView(p) || !inView(q)) continue; diag.inView++;
        let ok = true; const bp = []; const ap = [];
        for (let j = i - 4; j <= i + 3; j++) { const b = B[j].tiles.get(k); const a = A[j].tiles.get(k); if (!b || !a || !a[2] || a[3] < 0.99 || !inView(a) || !inView(b)) { ok = false; break; } bp.push(b); ap.push(a); }
        if (!ok) continue; diag.afterLeaf++;
        // only one big step of this tile inside the window (a single hop, not a run of them)
        let big = 0; for (let j = i - 3; j <= i + 3; j++) { const a = B[j].tiles.get(k); const b = B[j - 1].tiles.get(k); if (Math.hypot(a[0] - b[0], a[1] - b[1]) > 8) big++; } if (big > 3) continue; diag.single++;
        const travel = Math.hypot(ap[7][0] - ap[0][0], ap[7][1] - ap[0][1]);                                    // how far the Studio moves the tile over the eight frames
        const xs = [...bp, ...ap].map((p) => p[0]); const ys = [...bp, ...ap].map((p) => p[1]); const w = Math.max(...xs) - Math.min(...xs); const h = Math.max(...ys) - Math.min(...ys); if (w > 230 || h > 130) continue; diag.size++;
        out.push({ key: k, frame: i, step: d, travel, tier: (d >= 40 && travel >= 20) ? 1 : 2, w, h, cx: (Math.max(...xs) + Math.min(...xs)) / 2, cy: (Math.max(...ys) + Math.min(...ys)) / 2, tau: B[i].tau });
      }
      out.sort((a, b) => a.tier - b.tier || (a.tier === 1 ? (a.frame - b.frame) : ((b.step >= 60 ? 1 : 0) - (a.step >= 60 ? 1 : 0) || Math.abs(a.step - 110) - Math.abs(b.step - 110)))); return { list: out.slice(0, 5), diag };
    }, { H, start, SPEED });
    console.log(H.id, JSON.stringify(pick.diag)); if (!pick.list.length) { console.warn('no candidate for', H.id); continue; }
    const c = pick.list[0]; const x0 = Math.round(Math.max(0, Math.min(1440 - CW, c.cx - CW / 2))); const y0 = Math.round(Math.max(0, Math.min(900 - CH, c.cy - CH / 2)));
    const rec = { tier: c.tier, afterTravelPx: +c.travel.toFixed(1), hotspot: H.id, label: H.label, startTick: start, hotTick: H.tick, zoom: H.zoom, unit: c.key, hopFrame: c.frame, hopPx: +c.step.toFixed(1), crop: { x: x0, y: y0 }, modes: {} };
    // ---- 2. capture the eight frames in each mode ---------------------------------------------------------------------------------------------------------------------------------
    for (const mode of ['before', 'after']) {
      await s.page.evaluate(({ H, start, SPEED, mode, frame }) => {
        const S = window.__studio; const E = S.engine; E.tuning.set('compare.mode', mode); E.transport.pause(); E.transport.seek(start, { glide: false }); E.select(null); E.moveTo({ lat: H.lat, lng: H.lng, zoom: H.zoom }, { glide: false, safe: false }); S.step(70);
        E.transport.setSpeed(SPEED); E.transport.play(); S.step(frame - 4);
      }, { H, start, SPEED, mode, frame: c.frame });
      const frames = [];
      for (let k = 0; k < 8; k++) {
        const info = await s.page.evaluate((key) => { const S = window.__studio; const f = S.step(1); const t = f.tiles.find((q) => q.key === key && q.life === 'live'); return { tau: f.tau, tick: f.tick, x: t ? t.x + f.view.dx : null, y: t ? t.y + f.view.dy : null, solid: t ? t.solid : null, opacity: t ? t.opacity : null, tiles: f.tiles.filter((q) => q.life === 'live').length, overlaps: f.overlaps }; }, c.key);
        const file = path.join(TMP, `${H.id}-${mode}-${k}.png`);
        await s.page.screenshot({ path: file, clip: { x: x0, y: y0, width: CW, height: CH } });
        frames.push({ ...info, file: path.relative(REPO, file).replace(/\\/g, '/') });
      }
      rec.modes[mode] = frames;
    }
    meta.strips.push(rec); console.log(H.id, c.key, 'hop frame', c.frame, 'step', c.step.toFixed(1), 'px; candidates', pick.list.length);
  }
  meta.errors = s.errors; meta.requests = s.requests;
  fs.writeFileSync(path.join(TMP, 'strips.json'), JSON.stringify(meta, null, 1));
  console.log('errors', s.errors.length, 'requests', s.requests.length);
} finally { await s.close(); }
