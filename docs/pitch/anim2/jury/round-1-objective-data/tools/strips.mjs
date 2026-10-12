// strips.mjs - the MOTION checks, every engine frame (virtual clock, fixed dt), whole viewport, real Chrome, real data.
//   node strips.mjs --dir=d1 --look=day --vp=desktop [--only=rest,play4] [--dt=16.667] [--px=1]   -> results/strips-<dir>-<look>-<vp>[-<tag>].json
// Per frame, for every live tile: the drawn centre with the camera's own motion taken out (its previous place seen through the camera of this frame), the offset of the box from its anchor,
// the opacity; the engine's own overlap count; the overlaps of the footprints (all tiles at opacity >= 0.1); and, every --px-th frame, the PIXEL check: each tile near another is drawn alone on the ground-only
// picture and the core ink (>= 64/255 from the ground) of every pair is intersected (pagelib.mjs __inkFast).
import fs from 'node:fs';
import path from 'node:path';
import { serve, launch, openDir, DIRS, HERE } from './lib.mjs';
import { initOff, installHelpers, ANGLE, FIELD, HERBST } from './pagelib.mjs';
const args = Object.fromEntries(process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => { const i = a.indexOf('='); return i < 0 ? [a.slice(2), '1'] : [a.slice(2, i), a.slice(i + 1)]; }));
const DIR = args.dir; const LOOK = args.look || DIRS[DIR].primary; const VP = args.vp || 'desktop'; const DT = +(args.dt || 16.667); const PX = +(args.px || 1); const TAG = args.tag || '';
const dims = VP === 'phone' ? { w: 390, h: 844, mobile: true } : { w: 1440, h: 900, mobile: false };
// scenarios.  js: run in the page at frame f (S, E, host...); play: speed of the clock; zoom: start zoom
const ALL = {
  rest: { tick: 551, at: FIELD, zoom: 13.5, cold: true, frames: 420, note: 'jump to the field view at 13.5 (cold), 300 frames of settling then 120 frames at rest' },
  play4: { tick: 540, at: FIELD, zoom: 13.5, play: 4, frames: 360, note: 'the clock plays at 4x across the assault, field view z13.5' },
  play1: { tick: 548, at: ANGLE, zoom: 15, play: 1, frames: 360, note: 'the clock plays at 1x at the Angle z15' },
  zoomin: { tick: 556, at: ANGLE, zoom: 13.5, frames: 300, acts: [{ f: 10, js: 'E.zoomTo(16.5, { glide: true })' }], note: 'camera zoom glide 13.5 to 16.5 at the Angle (crowds open into members)' },
  zoomout: { tick: 556, at: ANGLE, zoom: 16.5, frames: 300, acts: [{ f: 10, js: 'E.zoomTo(13.5, { glide: true })' }], note: 'camera zoom glide 16.5 to 13.5 (members merge into crowds)' },
  pan: { tick: 556, at: ANGLE, zoom: 15, frames: 240, acts: [{ f: 10, js: 'E.moveTo({ lat: 39.8190, lng: -77.2262, zoom: 15 }, { glide: true })' }], note: 'camera pan glide from the Angle to Cemetery Hill at z15' },
  select: { tick: 556, at: ANGLE, zoom: 16.5, frames: 240, acts: [{ f: 10, js: "E.select('C-53VA'); S.host.setSelected && S.host.setSelected('C-53VA')" }, { f: 140, js: "E.select(null); S.host.setSelected && S.host.setSelected(null)" }], note: 'select, then deselect, the 53rd Virginia at z16.5' },
  arrival: { tick: 235.7, at: ANGLE, follow: { short: '3 ME', tick: 240 }, zoom: 16, play: 1, frames: 300, ramp0: true, note: 'a unit that arrives at its first keyframe (tick 236 to 240), z16, 1x' },
  deploy: { tick: 399.88, at: { lat: 39.8211, lng: -77.2522 }, zoom: 15.5, play: 1, frames: 300, ramp0: true, note: 'nine marks arrive on Seminary Ridge (3 July, tick 400), z15.5, 1x' },
};
const PHONE_SET = ['rest', 'play1', 'zoomin', 'select'];
const only = args.only ? args.only.split(',') : (VP === 'phone' ? PHONE_SET : Object.keys(ALL));
const OUT = path.join(HERE, 'results'); fs.mkdirSync(OUT, { recursive: true });
const srv = await serve(); const out = { dir: DIR, look: LOOK, vp: VP, dt: DT, px: PX, scenarios: {} };
for (const name of only) {
  const sc = { ...ALL[name] }; if (VP === 'phone') { if (sc.zoom >= 15.5) sc.zoom = Math.min(sc.zoom, 15); if (name === 'zoomin') sc.zoom = 13; if (name === 'select') sc.zoom = 16; if (name === 'play1') sc.zoom = 14.5; if (name === 'rest') sc.zoom = 13; }
  const run = await launch({ ...dims, dpr: 2, profile: `strip-${DIR}-${LOOK}-${VP}-${name}`, init: initOff });
  const { page } = run; const t0 = Date.now();
  try {
    await openDir(page, DIR, LOOK); await installHelpers(page);
    await page.evaluate(({ sc, DT }) => {
      const S = window.__studio; const E = S.engine; E.tuning.set('popup.enabled', false); if (S.host.dismissAll) S.host.dismissAll(); E.select(null); if (S.host.setSelected) S.host.setSelected(null);
      if (sc.ramp0) E.tuning.set('time.speedRampMs', 0);
      let at = sc.at; if (sc.follow) { const u = [...E.battle.units.values()].find((q) => q.short === sc.follow.short); if (u) { const p = E.battle.stateOf(u, sc.follow.tick); if (p && p.lat != null) at = { lat: p.lat, lng: p.lng }; } }
      E.transport.pause(); E.transport.seek(sc.tick, { glide: false }); E.moveTo({ lat: at.lat, lng: at.lng, zoom: sc.zoom }, { glide: false, safe: true });
      window.__stepDt = DT;
    }, { sc, DT });
    if (!sc.cold) { await page.evaluate(() => { window.__adv(260, 16.667); }); await page.evaluate(() => window.__groundIdle()); await page.evaluate(() => { window.__adv(60, 16.667); }); }
    else { await page.evaluate(() => window.__groundIdle()); }
    // ---- the recorded run ----
    const total = sc.frames; const chunk = 20; const rows = []; let state = null;
    await page.evaluate(({ sc }) => {
      const S = window.__studio; const E = S.engine; window.__REC = { prev: new Map(), prevVel: new Map(), prevV2: new Map(), frames: [], ex: { step: [], off: [], op: [], rev: [], geo: [], jolt: [] }, tileOff: new Map() };
      if (sc.play) { E.transport.setSpeed(sc.play); E.transport.play(); }
    }, { sc });
    for (let f0 = 0; f0 < total; f0 += chunk) {
      const n = Math.min(chunk, total - f0);
      const r = await page.evaluate(({ f0, n, acts, px, dt }) => {
        const S = window.__studio; const E = S.engine; const R = window.__REC; const res = [];
        for (let k = 0; k < n; k++) {
          const f = f0 + k;
          for (const a of acts || []) if (a.f === f) { (new Function('S', 'E', a.js))(S, E); }
          window.__adv(1, dt);
          const fr = E.frame; const view = fr.view; const cam = E.camera; const fadeOf = window.__fadeOf(); const cw = S.renderer.size[0]; const ch = S.renderer.size[1];
          const live = fr.tiles.filter((t) => t.life === 'live' && t.opacity >= 0.02);
          const now = new Map(); let maxStep = 0; let maxOff = 0; let maxOp = 0; let nRev = 0; let nTracked = 0; let nOff2 = 0; let nStep6 = 0; let nOp = 0;
          let worstStep = null; let worstOff = null; let maxJolt = 0; let maxJoltRaw = 0; let worstJolt = null; let maxRaw = 0; let nJolt3 = 0; let nJolt6 = 0;
          for (const t of live) {
            const sx = t.x + view.dx; const sy = t.y + view.dy; const ll = cam.fromScreen(sx, sy); const ox = t.x - t.ax; const oy = t.y - t.ay; const fk = fadeOf(t); const op = t.opacity * fk;
            const inv = sx + t.w * t.scale / 2 > 0 && sx - t.w * t.scale / 2 < cw && sy + t.h * t.scale / 2 > 0 && sy - t.h * t.scale / 2 < ch;
            const asx = t.ax + view.dx; const asy = t.ay + view.dy; const al = cam.fromScreen(asx, asy);
            now.set(t.key, { ll, ox, oy, op, rop: t.opacity, sx, sy, asx, asy, al, kind: t.kind, inv });
            const p = R.prev.get(t.key); if (!p || !p.inv || !inv) continue;      // only what is inside the viewport in both frames can be seen to move
            const q = cam.toScreen(p.ll[0], p.ll[1]); const vx = sx - q[0]; const vy = sy - q[1]; const st = Math.hypot(vx, vy);
            const od = Math.hypot(ox - p.ox, oy - p.oy); const opd = Math.abs(t.opacity - p.rop); const opdDrawn = Math.abs(op - p.op); const raw = Math.hypot(sx - p.sx, sy - p.sy);
            const solid = op >= 0.5 && p.op >= 0.5; if (!solid && opdDrawn < 0.35) continue;
            nTracked++;
            if (solid) {
              if (st > maxStep) { maxStep = st; worstStep = [t.key, t.kind, +st.toFixed(2), Math.round(sx), Math.round(sy)]; } if (od > maxOff) { maxOff = od; worstOff = [t.key, t.kind, +od.toFixed(2), Math.round(sx), Math.round(sy)]; } if (od > 2) nOff2++; if (st > 6) nStep6++;
              if (raw > maxRaw) maxRaw = raw;
              const qa = cam.toScreen(p.al[0], p.al[1]); const vax = p.asx === undefined ? 0 : (t.ax + view.dx) - qa[0]; const vay = (t.ay + view.dy) - qa[1];
              const pv = R.prevVel.get(t.key); if (pv) { const jraw = Math.hypot(vx - pv[0], vy - pv[1]); const jrel = Math.hypot((vx - vax) - (pv[0] - pv[2]), (vy - vay) - (pv[1] - pv[3])); const jl = t.kind === 'leaf' ? jrel : jraw; if (jraw > maxJoltRaw) maxJoltRaw = jraw; if (jl > maxJolt) { maxJolt = jl; worstJolt = [t.key, t.kind, +jl.toFixed(2), Math.round(sx), Math.round(sy), +st.toFixed(2), +jraw.toFixed(2)]; } if (jl > 3) { nJolt3++; if (R.ex.jolt.length < 16) R.ex.jolt.push([f, t.key, t.kind, +jl.toFixed(2), +op.toFixed(2), +jraw.toFixed(2)]); } if (jl > 6) nJolt6++;
                for (const [a, b] of [[vx, pv[0]], [vy, pv[1]]]) if (a * b < 0 && Math.min(Math.abs(a), Math.abs(b)) > 0.12) { nRev++; if (R.ex.rev.length < 12) R.ex.rev.push([f, t.key, +a.toFixed(2), +b.toFixed(2)]); break; } }
              R.prevVel.set(t.key, [vx, vy, vax, vay]);
            }
            if (opd > maxOp) maxOp = opd; if (opd > 0.35) { nOp++; if (R.ex.op.length < 16) R.ex.op.push([f, t.key, t.kind, +p.op.toFixed(2), +op.toFixed(2)]); }
            const tf = R.tileOff.get(t.key) || { n: 0, max: 0 }; tf.n++; tf.max = Math.max(tf.max, od); R.tileOff.set(t.key, tf);
          }
          for (const k of [...R.prevVel.keys()]) if (!now.has(k) || now.get(k).op < 0.5) R.prevVel.delete(k);
          R.prev = now;
          // geometric overlaps of the footprints (all tiles at drawn opacity >= 0.1, inside the viewport)
          const vis = live.filter((t) => t.opacity * fadeOf(t) >= 0.1).map((t) => ({ t, r: [t.x + view.dx - t.w * t.scale / 2, t.y + view.dy - t.h * t.scale / 2, t.x + view.dx + t.w * t.scale / 2, t.y + view.dy + t.h * t.scale / 2] })).filter((q) => q.r[2] > 0 && q.r[0] < cw && q.r[3] > 0 && q.r[1] < ch);
          let geo = 0; let geo5 = 0; const geoEx = [];
          for (let i = 0; i < vis.length; i++) for (let j = i + 1; j < vis.length; j++) { const a = vis[i].r; const b = vis[j].r; const gap = Math.max(a[0] - b[2], b[0] - a[2], a[1] - b[3], b[1] - a[3]); if (gap < -0.01) { geo++; if (vis[i].t.opacity >= 0.5 && vis[j].t.opacity >= 0.5) geo5++; if (geoEx.length < 3) geoEx.push([vis[i].t.key, vis[j].t.key, +gap.toFixed(2), +vis[i].t.opacity.toFixed(2), +vis[j].t.opacity.toFixed(2)]); } }
          if (geo && R.ex.geo.length < 12) R.ex.geo.push([f, geoEx]);
          const row = { f, tick: +fr.tick.toFixed(3), zoom: +fr.zoom.toFixed(3), live: live.length, vis: vis.length, tracked: nTracked, maxStep: +maxStep.toFixed(3), maxRaw: +maxRaw.toFixed(3), maxJolt: +maxJolt.toFixed(3), maxJoltRaw: +maxJoltRaw.toFixed(3), nJolt3, nJolt6, maxOff: +maxOff.toFixed(3), maxOp: +maxOp.toFixed(3), nRev, nOff2, nStep6, nOp, geo, geo5, eng: fr.overlaps, busy: E.busy ? !!E.busy() : null };
          if (worstJolt) row.wj = worstJolt; if (worstStep) row.ws = worstStep; if (worstOff) row.wo = worstOff;
          if (px && f % px === 0) { const ink = window.__inkFast({ minOpacity: 0.1, margin: 20 }); const solidP = ink.corePairs.filter((p) => p.ao >= 0.5 && p.bo >= 0.5); row.px = { cand: ink.cand, soft: ink.softPairs, core: ink.corePairs.length, solid: solidP.length, ghost: ink.corePairs.length - solidP.length, solidEx: solidP.slice(0, 3).map((p) => [p.an || p.a, p.bn || p.b, p.ao, p.bo, p.core]), ex: ink.corePairs.slice(0, 3).map((p) => [p.an || p.a, p.bn || p.b, p.ao, p.bo, p.core]) }; }
          res.push(row);
        }
        return res;
      }, { f0, n, acts: sc.acts, px: PX, dt: DT });
      rows.push(...r);
    }
    const tileOff = await page.evaluate(() => { const R = window.__REC; const a = [...R.tileOff.values()]; return { tiles: a.length, over2: a.filter((x) => x.max > 2).length, over6: a.filter((x) => x.max > 6).length }; });
    const exs = await page.evaluate(() => window.__REC.ex);
    out.scenarios[name] = { note: sc.note, frames: rows.length, tileOff, ex: exs, rows, secs: Math.round((Date.now() - t0) / 1000), errors: run.errors.slice(0, 3), external: run.external.slice(0, 3) };
    const a = rows; const mx = (k, lo = 0, hi = 1e9) => Math.max(0, ...a.filter((r) => r.f >= lo && r.f < hi).map((r) => r[k]));
    console.log(DIR, LOOK, VP, name, 'frames', a.length, 'maxStep', mx('maxStep'), 'maxOff', mx('maxOff'), 'rev', a.reduce((s, r) => s + r.nRev, 0), 'geo>=0.1', mx('geo'), 'geo5', mx('geo5'), 'eng', mx('eng'), 'pxCore', Math.max(0, ...a.map((r) => (r.px ? r.px.core : 0))), 'ms', Date.now() - t0);
  } catch (e) { console.log('FAILED', DIR, LOOK, VP, name, e.message); out.scenarios[name] = { error: e.message }; }
  finally { await run.close(); }
}
fs.writeFileSync(path.join(OUT, `strips-${DIR}-${LOOK}-${VP}${TAG ? '-' + TAG : ''}.json`), JSON.stringify(out));
srv.close(); process.exit(0);
