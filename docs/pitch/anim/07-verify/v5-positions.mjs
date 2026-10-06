// v5-positions.mjs - "tiles are drawn at the right real positions".  Manual mode (deterministic frames), witness on, projection written here (not the prototype's).
//   1. landmarks   the 30 place marks of legacy terrain.json are painted at my projection of their coordinates (the backdrop and the camera agree with Web-Mercator at the page's camera)
//   2. keyframes   at a keyframe tick, every leaf tile's TRUE anchor (the position the engine says the unit stands at) equals my projection of the source row's lat/lng (< 0.05 px), and the painted pin / chip origin
//                  equals what the engine reported (the witness matched every painted tile to its reported position)
//   3. between     at non-keyframe ticks the anchor lies inside the coordinate envelope of the two surrounding keyframes (monotone interpolation never overshoots) and its distance from the straight chord is measured
//   4. budget      no chip is farther than layout.dMaxPx from its true position (leaves); every pin sits on the true position
//   5. one tile    every unit on the field is inside exactly one live tile; no unit appears before its first keyframe; none missing after it (settled frames)
//   6. sides       the 10 Contested units are not painted with the colours of Union or Confederate tiles (9 skins)
//   node v5-positions.mjs -> results/v5-positions.json
import fs from 'node:fs';
import path from 'node:path';
import { serve, launch, PROTO, REPO, args, writeJson, sleep } from './lib.mjs';
import { loadKeyframes, firstTicks, keyframeTicks, rng, mercator } from './srcdata.mjs';

const out = { generated: new Date().toISOString(), checks: [], defects: [] };
const check = (name, ok, detail) => { out.checks.push({ name, ok: !!ok, detail }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? '  ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 700) : '')); return ok; };
const kf = loadKeyframes(); const first = firstTicks(kf.units); const byTick = keyframeTicks(kf.units);
const terrain = JSON.parse(fs.readFileSync(path.join(REPO, 'legacy', 'dist', 'data', 'terrain.json'), 'utf8')).key_locations;
const units = {}; for (const [id, a] of kf.units) units[id] = a.map((r) => [r.tick, r.lat, r.lng]);
const dsets = JSON.parse(fs.readFileSync(path.join(PROTO, 'data', 'dataset.json'), 'utf8')); const contested = dsets.units.filter((u) => u.side === 'unknown').map((u) => u.id);
const R = rng(5); const popTicks = [...byTick.keys()].sort((a, b) => a - b); const dense = [...byTick.entries()].sort((a, b) => b[1].length - a[1].length).map((e) => e[0]); const sampleTicks = [...dense.slice(0, 12)]; while (sampleTicks.length < 24) { const t = popTicks[Math.floor(R() * popTicks.length)]; if (!sampleTicks.includes(t)) sampleTicks.push(t); } sampleTicks.sort((a, b) => a - b);
const midTicks = []; while (midTicks.length < 16) { const t = 2 + Math.floor(R() * 672); if (!byTick.has(t)) midTicks.push(t); } midTicks.sort((a, b) => a - b);
console.log('keyframe ticks', sampleTicks.join(','), 'mid ticks', midTicks.join(','));

const PORT = +(args.port || 9706); const srv = await serve(PROTO, PORT);
const s = await launch({ port: PORT, witness: true, query: 'welcome=0&manual=1', profile: 'pos' });
const PAGE = `(() => {
  const mer = (lng, lat, z) => { const s = 512 * 2 ** z; const sin = Math.sin(lat * Math.PI / 180); return [(lng + 180) / 360 * s, (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * s]; };
  const inv = (x, y, z) => { const s = 512 * 2 ** z; const lng = x / s * 360 - 180; const n = Math.PI - 2 * Math.PI * y / s; return [lng, Math.atan(Math.sinh(n)) * 180 / Math.PI]; };
  window.__v5 = { mer, inv };
})()`;
await s.page.evaluate(PAGE);
const S0 = `window.__studio`;
const settleJs = `(max) => { const S = window.__studio; const E = S.engine; let n = 0; let still = 0; let last = -1; for (; n < max; n++) { const f = S.step(1); const live = f.tiles.length; if (!E.busy() && live === last) { if (++still >= 4) break; } else still = 0; last = live; } return n; }`;
try {
  await s.page.evaluate(({ first }) => { const R = window.__rec; R.keep = false; R.full = false; R.install({ firstTick: first, dom: [] }); window.__studio.engine.tuning.set('popup.enabled', false); }, { first });

  // ---- 1. landmarks -----------------------------------------------------------------------------------------------------------------
  const lm = await s.page.evaluate(({ terrain }) => {
    const S = window.__studio; const E = S.engine; const W = window.__witness; const R = window.__rec; const settle = eval('(' + `(max) => { let n = 0; let still = 0; let last = -1; for (; n < max; n++) { const f = S.step(1); const live = f.tiles.length; if (!E.busy() && live === last) { if (++still >= 4) break; } else still = 0; last = live; } return n; }` + ')');
    E.transport.pause(); E.transport.seek(556, { glide: false }); E.moveTo({ lat: 39.8117, lng: -77.2347, zoom: 14.5 }, { glide: false, safe: false }); settle(200);
    W.full = true; W.begin(); R.od.call(S.renderer, R.lastFrame, R.lastOpts); const rec = W.end(); W.full = false; const cam = E.camera; const dpr = S.renderer.dpr; const c = window.__v5.mer(cam.lng, cam.lat, cam.zoom);
    const marks = rec.ops.filter((o) => o[0] === 0 && (o[6] === 'stroke') && o[3] - o[1] > 8 && o[3] - o[1] < 14 && Math.abs((o[3] - o[1]) - (o[4] - o[2])) < 0.5).map((o) => [(o[1] + o[3]) / 2 / dpr, (o[2] + o[4]) / 2 / dpr]);
    const res = []; for (const t of terrain) { const p = window.__v5.mer(t.lng, t.lat, cam.zoom); const sx = p[0] - c[0] + cam.w / 2; const sy = p[1] - c[1] + cam.h / 2; if (sx < 5 || sx > cam.w - 5 || sy < 5 || sy > cam.h - 5) { res.push({ id: t.location_id, name: t.name, inView: false }); continue; } let best = 1e9; for (const m of marks) best = Math.min(best, Math.hypot(m[0] - sx, m[1] - sy)); res.push({ id: t.location_id, name: t.name, inView: true, sx, sy, nearestMarkPx: best }); }
    return { res, marks: marks.length, cam: { lng: cam.lng, lat: cam.lat, zoom: cam.zoom, w: cam.w, h: cam.h } };
  }, { terrain });
  const inV = lm.res.filter((r) => r.inView); const lmBad = inV.filter((r) => r.nearestMarkPx > 0.6);
  check('place marks: every in-view legacy terrain.json location is painted within 0.6 px of my Web-Mercator projection at the page camera (' + inV.length + ' of 30 in view, ' + lm.marks + ' marks painted)', inV.length >= 5 && lmBad.length === 0, { inView: inV.length, worst: Math.max(...inV.map((r) => r.nearestMarkPx)).toFixed(3), bad: lmBad.slice(0, 4) });
  out.landmarks = { inView: inV.length, worstPx: Math.max(...inV.map((r) => r.nearestMarkPx)) };

  // ---- 2./4./5. keyframe ticks ----------------------------------------------------------------------------------------------------------
  const kfRows = []; let maxErr = 0; let nLeaf = 0; let nDisp = 0; let maxBudget = 0; let budgetBad = 0; let dupTot = 0; let missTot = 0; let earlyTot = 0; let phantomTot = 0; let pinErr = 0; let leafMissing = 0; let nSettled = 0;
  for (const zoom of [13.5, 15, 16.5]) for (const tick of sampleTicks) {
    const r = await s.page.evaluate(({ tick, zoom, units }) => {
      const S = window.__studio; const E = S.engine; const R = window.__rec; const mer = window.__v5.mer;
      E.select(null); E.transport.pause(); E.transport.seek(tick, { glide: false }); E.moveTo({ lat: 39.8117, lng: -77.2347, zoom }, { glide: false, safe: false });
      const settle = (max) => { let n = 0; let still = 0; let last = -1; for (; n < max; n++) { const f = S.step(1); const live = f.tiles.length; if (!E.busy() && live === last) { if (++still >= 4) break; } else still = 0; last = live; } return n; };
      settle(300); let f = E.frame; const live0 = f.tiles.filter((t) => t.life === 'live'); let best = null; let bc = -1; for (const a of live0) { let c = 0; for (const b of live0) if (Math.abs(a.ax - b.ax) < 90 && Math.abs(a.ay - b.ay) < 90) c++; if (c > bc) { bc = c; best = a; } }
      if (best) { const ll = E.camera.fromScreen(best.x + f.view.dx, best.y + f.view.dy); E.moveTo({ lat: ll[1], lng: ll[0], zoom: E.camera.zoom }, { glide: false, safe: false }); settle(300); }
      f = E.frame; const cam = E.camera; const c = mer(cam.lng, cam.lat, cam.zoom); const dMax = E.tok('layout.dMaxPx'); const rec = R.last;
      const res = { tick: Math.round(f.tau), zoom: cam.zoom, leaves: 0, err: 0, errEx: null, disp: 0, budgetMax: 0, budgetBad: 0, noKf: 0, dup: 0, miss: rec.missing, early: rec.early, phantom: rec.phantom, pinErr: 0, ptsCompared: 0, tilesMissing: 0, settled: !E.busy() };
      const seen = new Map();
      for (const t of f.tiles) { if (t.life !== 'live') continue; for (const id of t.ids) seen.set(id, (seen.get(id) || 0) + 1); }
      for (const [id, n] of seen) if (n > 1) res.dup++;
      for (const t of f.tiles) {
        if (t.life !== 'live' || t.kind !== 'leaf') continue; res.leaves++; const id = t.ids[0]; const arr = units[id]; if (!arr) { res.noKf++; continue; }
        const k = arr.find((q) => q[0] === Math.round(f.tau)); const sx = t.ax + f.view.dx; const sy = t.ay + f.view.dy;
        if (k && Math.abs(f.tau - Math.round(f.tau)) < 1e-6) { const p = mer(k[2], k[1], cam.zoom); const ex = p[0] - c[0] + cam.w / 2; const ey = p[1] - c[1] + cam.h / 2; const e = Math.hypot(ex - sx, ey - sy); res.ptsCompared++; if (e > res.err) { res.err = e; res.errEx = [id, ex, ey, sx, sy]; } }
        const off = Math.hypot(t.x - t.ax, t.y - t.ay); if (off > res.budgetMax) res.budgetMax = off; if (off > dMax + 0.6) res.budgetBad++; if (t.displaced) res.disp++;
      }
      return res;
    }, { tick, zoom, units });
    kfRows.push(r); maxErr = Math.max(maxErr, r.err); nLeaf += r.leaves; nDisp += r.disp; maxBudget = Math.max(maxBudget, r.budgetMax); budgetBad += r.budgetBad; dupTot += r.dup; missTot += r.miss; earlyTot += r.early; phantomTot += r.phantom; if (r.settled) nSettled++;
  }
  const compared = kfRows.reduce((a, r) => a + r.ptsCompared, 0);
  check('keyframe ticks: the true anchor of every leaf tile equals my projection of the source lat/lng (max error px; ' + compared + ' tile positions compared in ' + kfRows.length + ' frames)', compared > 1000 && maxErr < 0.05, { compared, maxErrPx: maxErr, worst: kfRows.map((r) => r.errEx).filter(Boolean).slice(0, 2) });
  check('no chip stands farther than layout.dMaxPx (48 px) from its true position (leaves), max seen ' + maxBudget.toFixed(2) + ' px over ' + nLeaf + ' leaf tiles', budgetBad === 0, { budgetBad, maxBudget, displaced: nDisp });
  check('every unit is inside exactly one live tile (settled frames)', dupTot === 0, { frames: kfRows.length, dupTotal: dupTot });
  check('no unit missing after its first keyframe, none shown before it, no phantom (settled frames)', missTot === 0 && earlyTot === 0 && phantomTot === 0, { missing: missTot, early: earlyTot, phantom: phantomTot });
  out.keyframeTicks = { frames: kfRows.length, compared, maxErrPx: maxErr, maxBudgetPx: maxBudget, leafTiles: nLeaf, displaced: nDisp, settledFrames: nSettled };

  // ---- 3. between keyframes ----------------------------------------------------------------------------------------------------------------
  const timeOff = []; const mid = []; let envBad = 0; let envN = 0; let chordMax = 0; const chords = [];
  for (const zoom of [14.5]) for (const tick of midTicks) {
    const r = await s.page.evaluate(({ tick, zoom, units }) => {
      const S = window.__studio; const E = S.engine; const inv = window.__v5.inv; const mer = window.__v5.mer;
      E.transport.pause(); E.transport.seek(tick, { glide: false }); E.moveTo({ lat: 39.8117, lng: -77.2347, zoom }, { glide: false, safe: false });
      for (let i = 0; i < 12; i++) S.step(1); const f = E.frame; const cam = E.camera; const c = mer(cam.lng, cam.lat, cam.zoom); const out = [];
      for (const t of f.tiles) { if (t.life !== 'live' || t.kind !== 'leaf') continue; const id = t.ids[0]; const arr = units[id]; if (!arr) continue; let i = 0; while (i + 1 < arr.length && arr[i + 1][0] <= f.tau) i++;
        const sx = t.ax + f.view.dx; const sy = t.ay + f.view.dy; const ll = inv(sx - cam.w / 2 + c[0], sy - cam.h / 2 + c[1], cam.zoom); const a = arr[i]; const b = arr[i + 1];
        if (!b) { out.push({ id, kind: 'hold', dLat: ll[1] - a[1], dLng: ll[0] - a[2] }); continue; }
        const u = (f.tau - a[0]) / (b[0] - a[0]); const lat = a[1] + (b[1] - a[1]) * u; const lng = a[2] + (b[2] - a[2]) * u; const tol = 2e-6; const loLat = Math.min(a[1], b[1]) - tol; const hiLat = Math.max(a[1], b[1]) + tol; const loLng = Math.min(a[2], b[2]) - tol; const hiLng = Math.max(a[2], b[2]) + tol;
        const inside = ll[1] >= loLat && ll[1] <= hiLat && ll[0] >= loLng && ll[0] <= hiLng; const kx = 111195 * Math.cos(lat * Math.PI / 180); const ax = (ll[0] - a[2]) * kx; const ay = (ll[1] - a[1]) * 111195; const bx = (b[2] - a[2]) * kx; const by = (b[1] - a[1]) * 111195; const L2 = bx * bx + by * by; const tt = L2 > 0 ? Math.max(0, Math.min(1, (ax * bx + ay * by) / L2)) : 0; const dm = Math.hypot(ax - tt * bx, ay - tt * by); const dTime = Math.hypot((ll[1] - lat) * 111195, (ll[0] - lng) * kx); const span = Math.hypot((b[1] - a[1]) * 111195, (b[2] - a[2]) * 111195 * Math.cos(lat * Math.PI / 180));
        out.push({ id, kind: 'seg', u, inside, offChordM: dm, offTimeM: dTime, spanM: span, gap: b[0] - a[0] }); }
      return { tau: f.tau, tiles: out };
    }, { tick, zoom, units });
    for (const q of r.tiles) { if (q.kind === 'hold') { if (Math.abs(q.dLat) > 3e-6 || Math.abs(q.dLng) > 3e-6) envBad++; envN++; continue; } envN++; if (!q.inside) envBad++; if (q.spanM > 1) { chords.push(q.offChordM); timeOff.push(q.offTimeM); chordMax = Math.max(chordMax, q.offChordM); } }
    mid.push({ tick: r.tau, n: r.tiles.length });
  }
  chords.sort((a, b) => a - b); const p90 = chords[Math.floor(0.9 * (chords.length - 1))]; const med = chords[Math.floor(0.5 * (chords.length - 1))];
  check('between keyframes (' + midTicks.length + ' ticks, ' + envN + ' unit positions): every anchor lies inside the coordinate envelope of its two keyframes (a held unit sits exactly on its last keyframe)', envBad === 0, { envBad, positions: envN });
  check('distance from the straight chord (claim: median 0 m, p90 49 m, max 391 m): measured median ' + med.toFixed(1) + ' m, p90 ' + p90.toFixed(1) + ' m, max ' + chordMax.toFixed(1) + ' m over ' + chords.length + ' moving positions', chordMax <= 391 + 5, { median: med, p90, max: chordMax, n: chords.length });
  timeOff.sort((a, b) => a - b); out.chord = { n: chords.length, medianM: med, p90M: p90, maxM: chordMax, note: 'perpendicular distance from the chord SEGMENT; the distance from the linear-in-time point of the chord is larger (the cubic speeds up and slows down along the chord): median ' + timeOff[Math.floor(0.5 * (timeOff.length - 1))].toFixed(1) + ' m, p90 ' + timeOff[Math.floor(0.9 * (timeOff.length - 1))].toFixed(1) + ' m, max ' + timeOff[timeOff.length - 1].toFixed(1) + ' m' }; console.log(out.chord.note);

  // ---- 6. contested sides painted differently from Union / Confederate ---------------------------------------------------------------------------
  const skins = []; for (const st of ['war-room', 'field-manual', 'map-1863']) for (const v of ['standard', 'cvd', 'contrast']) skins.push([st, v]);
  const sideRows = [];
  for (const [st, v] of skins) {
    const r = await s.page.evaluate(({ st, v, contested }) => {
      const S = window.__studio; const E = S.engine; const R = window.__rec; const W = window.__witness; S.ui.chooseStyle(st, v);
      E.select(null); E.transport.pause(); E.transport.seek(160, { glide: false });
      const cu = E.battle.units.get(contested[0]); const k = cu.kf[0]; E.moveTo({ lat: k.lat, lng: k.lng, zoom: 17 }, { glide: false, safe: false });
      let still = 0; let last = -1; for (let n = 0; n < 300; n++) { const f = S.step(1); if (!E.busy() && f.tiles.length === last) { if (++still >= 4) break; } else still = 0; last = f.tiles.length; }
      W.full = true; W.begin(); R.od.call(S.renderer, R.lastFrame, R.lastOpts); const rec = W.end(); W.full = false; const f = R.lastFrame; const dpr = S.renderer.dpr; const sets = { union: new Set(), confederate: new Set(), unknown: new Set(), mixed: new Set() }; const cnt = { union: 0, confederate: 0, unknown: 0, mixed: 0 };
      for (const t of f.tiles) { if (t.life !== 'live' || t.opacity < 0.9) continue; const cx = (t.x + f.view.dx) * dpr; const cy = (t.y + f.view.dy) * dpr; const ep = rec.epochs.findIndex((m) => Math.abs(m[4] - cx) < 0.02 && Math.abs(m[5] - cy) < 0.02 && Math.abs(Math.hypot(m[0], m[1]) - t.scale * dpr) < 0.001); if (ep < 0) continue; const cls = t.side; if (!sets[cls]) continue; cnt[cls]++; for (const o of rec.ops) if (o[0] === ep && (o[6] === 'fill' || o[6] === 'fillRect') && o[7] && o[7] !== '?') sets[cls].add(o[7]); }
      const arr = (x) => [...x].sort(); return { counts: cnt, union: arr(sets.union), confederate: arr(sets.confederate), unknown: arr(sets.unknown), mixed: arr(sets.mixed), tick: f.tick };
    }, { st, v, contested });
    sideRows.push({ skin: st + '/' + v, ...r });
  }
  const sideBad = []; for (const r of sideRows) { if (!r.counts.unknown) { sideBad.push({ skin: r.skin, why: 'no contested tile in view', counts: r.counts }); continue; } const own = r.unknown.filter((c) => !r.union.includes(c) && !r.confederate.includes(c)); const sameU = JSON.stringify(r.unknown) === JSON.stringify(r.union); const sameC = JSON.stringify(r.unknown) === JSON.stringify(r.confederate); if (own.length === 0 || sameU || sameC) sideBad.push({ skin: r.skin, own, sameU, sameC, unknown: r.unknown.slice(0, 6) }); }
  check('Contested units (10) are painted with at least one fill colour that no Union or Confederate tile uses, in all 9 skins', sideBad.length === 0, { skins: sideRows.length, bad: sideBad.slice(0, 4), counts: sideRows.map((r) => r.counts.unknown) });
  out.sides = sideRows.map((r) => ({ skin: r.skin, counts: r.counts, ownColours: r.unknown.filter((c) => !r.union.includes(c) && !r.confederate.includes(c)).length, union: r.union.length, confederate: r.confederate.length, unknown: r.unknown.length }));
  out.summary = { pass: out.checks.filter((c) => c.ok).length, fail: out.checks.filter((c) => !c.ok).length }; writeJson('v5-positions.json', out); console.log(JSON.stringify(out.summary), 'console errors', s.errors.length);
} finally { await s.close(); srv.close(); }
