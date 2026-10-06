// v4c-before-relaxation.mjs - the SHIPPED draw routine lS (with its helpers lA, q4, $4, Z4, X4, Y4 and the relaxation loop) is cut out of baseline/dist/assets/index-*.js and executed in a vm against a
// recording canvas stub; the final centre of every bar it draws (the translate before each bar) is compared, unit by unit, with the position of the same unit's tile in the Studio's Before view for the
// same frame.  This tests the one part of the Before view the clock / position check (v4b) does not: the from-scratch relaxation that shuffles bars.
//   node v4c-before-relaxation.mjs -> results/v4c-before-relaxation.json
import vm from 'node:vm';
import { serve, launch, PROTO, args, writeJson } from './lib.mjs';
import { rj, PLACEMENT_FILES, bundle, mercator } from './srcdata.mjs';

const a0 = bundle.indexOf('sA="#3a6bc4"'); const a1 = bundle.indexOf('function Ed('); const a2 = bundle.indexOf('function n2(c,f,x){'); const a3 = bundle.indexOf('const Lp={"Line of Battle"'); if (a0 < 0 || a1 < 0 || a2 < 0 || a3 < 0) throw new Error('markers not found');
const box = {}; vm.createContext(box);
const lp = /const Lp=\{[^}]*\}/.exec(bundle.slice(a3, a3 + 600))[0] + ';';
vm.runInContext('var N4=()=>false,jk=()=>{},CanvasRenderer={},Yx=()=>60,sT=()=>{},aT=()=>{},Xx=()=>[];' + bundle.slice(a2, a3) + ';' + lp + bundle.slice(a0, a1) + ';this.lS=lS;this.y1=y1;this.resetCache=()=>{for(const k of Object.keys(i2))delete i2[k]};', box);
const byTick = {}; for (const f of PLACEMENT_FILES) for (const p of rj(f).placements) (byTick[p.tick] || (byTick[p.tick] = [])).push(p);
const shippedRows = (st, ut) => { box.resetCache(); for (let t = 1; t < st; t++) box.y1(byTick, t, 0); return box.y1(byTick, st, ut); };
function runShipped(rows, cam) {
  const [lng, lat, zoom, W, H] = cam; const c0 = mercator(lng, lat, zoom); const translates = []; const order = [];
  const ctx = new Proxy({}, { get(t, k) { if (k === 'translate') return (x, y) => translates.push([x, y]); if (k === 'measureText') return (txt) => ({ width: String(txt).length * 6 }); return () => ({ addColorStop() {} }); }, set() { return true; } });
  const canvas = { width: W, height: H, getContext: () => ctx, getBoundingClientRect: () => ({ width: W, height: H }) };
  const map = { getZoom: () => zoom, project: ([ln, lt]) => { const p = mercator(ln, lt, zoom); return { x: p[0] - c0[0] + W / 2, y: p[1] - c0[1] + H / 2 }; } };
  // record the order of successful projections inside the shipped window: the bars are drawn in that order
  const inWin = []; const proj = map.project; map.project = (ll) => { const r = proj(ll); order.push([ll, r]); return r; };
  box.lS(canvas, map, rows, null, null, undefined, {}, 0, undefined);
  // order holds one entry per row (xe order); the shipped keeps those inside the window
  const kept = []; for (const [ll, r] of order) if (r.x > -200 && r.x < W + 200 && r.y > -40 && r.y < H + 40) kept.push(ll);
  return { translates, kept };
}
const PORT = +(args.port || 9703); const srv = await serve(PROTO, PORT); const s = await launch({ port: PORT, query: 'welcome=0&manual=1', profile: 'beforerel' });
try {
  const cases = [[120, 1, 14], [293, 4, 14], [346, 1, 14], [556, 4, 15], [620, 4, 13.5]]; const rows = []; let n = 0; const diffs = []; let framesN = 0; const perCase = [];
  for (const [tick, speed, zoom] of cases) {
    const fr = await s.page.evaluate(({ tick, speed, zoom }) => { const S = window.__studio; const E = S.engine; E.tuning.set('popup.enabled', false); E.tuning.set('compare.mode', 'before'); E.transport.pause(); E.transport.seek(tick, { glide: false }); E.moveTo({ lat: 39.8117, lng: -77.2347, zoom }, { glide: false, safe: false }); for (let i = 0; i < 30; i++) S.step(1, 16.667); E.transport.setSpeed(speed); E.transport.play(); const out = []; for (let i = 0; i < 120; i++) { const f = S.step(1, 16.667); const cam = E.camera; if (i % 6 === 0) out.push({ tau: f.tau, cam: [cam.lng, cam.lat, cam.zoom, cam.w, cam.h], dx: f.view.dx, dy: f.view.dy, tiles: f.tiles.filter((t) => t.kind === 'leaf').map((t) => [t.ids[0], t.x, t.y]) }); } E.tuning.set('compare.mode', 'after'); return out; }, { tick, speed, zoom });
    const d0 = diffs.length; let cmpC = 0; let setMis = 0;
    for (const f of fr) {
      const st = Math.floor(f.tau + 1e-9); const ut = f.tau - st; const rws = shippedRows(st, ut); const { translates, kept } = runShipped(rws, f.cam); framesN++;
      // the id of each kept row: rows carry (lat, lng): match by coordinates in order
      const byLL = new Map(); for (const r of rws) { const k = r.lng + '|' + r.lat; (byLL.get(k) || byLL.set(k, []).get(k)).push(r.unit_id); }
      const used = new Map(); const ship = new Map(); kept.forEach((ll, i) => { const k = ll[0] + '|' + ll[1]; const arr = byLL.get(k) || []; const j = used.get(k) || 0; used.set(k, j + 1); const id = arr[j]; if (id) ship.set(id, translates[i]); });
      const page = new Map(f.tiles.map((t) => [t[0], [t[1] + f.dx, t[2] + f.dy]]));
      let mis = 0; for (const id of ship.keys()) if (!page.has(id)) mis++; for (const id of page.keys()) if (!ship.has(id)) mis++; if (mis) setMis++;
      for (const [id, p] of ship) { const q = page.get(id); if (!q) continue; const d = Math.hypot(p[0] - q[0], p[1] - q[1]); diffs.push(d); cmpC++; }
    }
    const dd = diffs.slice(d0).sort((x, y) => x - y); perCase.push({ tick, speed, zoom, frames: fr.length, positions: dd.length, within0_5: +(100 * dd.filter((x) => x <= 0.5).length / dd.length).toFixed(1), within3: +(100 * dd.filter((x) => x <= 3).length / dd.length).toFixed(1), median: +dd[Math.floor(dd.length / 2)].toFixed(3), p95: +dd[Math.floor(dd.length * 0.95)].toFixed(2), max: +dd[dd.length - 1].toFixed(1), framesWithDifferentSet: setMis }); n += cmpC;
  }
  console.table(perCase); const all = diffs.sort((x, y) => x - y); const res = { generated: new Date().toISOString(), frames: framesN, positions: all.length, within0_5pct: +(100 * all.filter((x) => x <= 0.5).length / all.length).toFixed(2), within3pct: +(100 * all.filter((x) => x <= 3).length / all.length).toFixed(2), median: all[Math.floor(all.length / 2)], p95: all[Math.floor(all.length * 0.95)], max: all[all.length - 1], perCase };
  console.log(JSON.stringify(res)); writeJson('v4c-before-relaxation.json', res);
  
  // ---- v4d: the jitter the relaxation itself produces: the SHIPPED lS and the Before view run side by side over the same 20 s (1200 frames, 60 Hz virtual time) of play ----------------------------------------------
  async function sideBySide(sc, speed, secs = 20) {
    const [tick, zoom, lat, lng] = sc; const FR = Math.round(secs * 60); const page = await s.page.evaluate(({ tick, zoom, lat, lng, speed, FR }) => { const S = window.__studio; const E = S.engine; E.tuning.set('popup.enabled', false); E.tuning.set('compare.mode', 'before'); E.transport.pause(); E.transport.seek(tick, { glide: false }); E.moveTo({ lat, lng, zoom }, { glide: false, safe: false }); for (let i = 0; i < 30; i++) S.step(1, 16.667); E.transport.setSpeed(speed); E.transport.play(); const out = []; for (let i = 0; i < FR; i++) { const f = S.step(1, 16.667); const cam = E.camera; out.push({ tau: f.tau, cam: [cam.lng, cam.lat, cam.zoom, cam.w, cam.h], dx: f.view.dx, dy: f.view.dy, ov: f.overlaps, tiles: f.tiles.filter((t) => t.kind === 'leaf').map((t) => [t.ids[0], t.x, t.y, t.barW, t.barH, t.bearing]) }); } E.tuning.set('compare.mode', 'after'); return out; }, { tick, zoom, lat, lng, speed, FR });
    const shipped = []; for (const f of page) { const st = Math.floor(f.tau + 1e-9); const ut = f.tau - st; const rws = shippedRows(st, ut); const { translates, kept } = runShipped(rws, f.cam); const byLL = new Map(); for (const r of rws) { const k = r.lng + '|' + r.lat; (byLL.get(k) || byLL.set(k, []).get(k)).push(r); } const used = new Map(); const m = new Map(); kept.forEach((ll, i) => { const k = ll[0] + '|' + ll[1]; const arr = byLL.get(k) || []; const j = used.get(k) || 0; used.set(k, j + 1); const r = arr[j]; if (r) m.set(r.unit_id, [translates[i][0], translates[i][1], Math.max(10, Math.min(120, Math.round((r.strength || 200) / 4))), /CAV|Cavalry/.test(r.unit_id + r.disposition) ? 4 : 8, r.bearing || 0]); }); shipped.push(m); }
    const stats = (seq) => { let hops = 0; let sudden = 0; let maxStep = 0; let pairs = 0; let frames = 0; const prev = new Map(); const prevStep = new Map();
      for (const m of seq) { frames++; const cur = new Map(); for (const [id, p] of m) { cur.set(id, p); const q = prev.get(id); if (q) { const st2 = Math.hypot(p[0] - q[0], p[1] - q[1]); const ps = prevStep.get(id) || 0; if (st2 >= 8) hops++; if (st2 >= 8 && st2 >= 3 * ps) sudden++; if (st2 > maxStep) maxStep = st2; prevStep.set(id, st2); } } prev.clear(); for (const [k, v] of cur) prev.set(k, v);
        const arr = [...m.values()]; const poly = (p) => { const hw = p[2] / 2; const hh = p[3] / 2 + 0.5; const a = (p[4] - 90) * Math.PI / 180; const c = Math.cos(a); const sn = Math.sin(a); return [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]].map(([x, y]) => [p[0] + x * c - y * sn, p[1] + x * sn + y * c]); }; const polys = arr.map(poly); const bb = polys.map((P) => [Math.min(...P.map((q) => q[0])), Math.min(...P.map((q) => q[1])), Math.max(...P.map((q) => q[0])), Math.max(...P.map((q) => q[1]))]);
        const sat = (A, B) => { for (const P of [A, B]) for (let i = 0; i < 4; i++) { const [x1, y1] = P[i]; const [x2, y2] = P[(i + 1) % 4]; const nx = y1 - y2; const ny = x2 - x1; let a0 = 1e18; let a1 = -1e18; let b0 = 1e18; let b1 = -1e18; for (const [x, y] of A) { const d = x * nx + y * ny; if (d < a0) a0 = d; if (d > a1) a1 = d; } for (const [x, y] of B) { const d = x * nx + y * ny; if (d < b0) b0 = d; if (d > b1) b1 = d; } if (a1 <= b0 + 1e-9 || b1 <= a0 + 1e-9) return false; } return true; };
        for (let i = 0; i < arr.length; i++) for (let j = i + 1; j < arr.length; j++) { if (bb[i][2] <= bb[j][0] || bb[j][2] <= bb[i][0] || bb[i][3] <= bb[j][1] || bb[j][3] <= bb[i][1]) continue; if (sat(polys[i], polys[j])) pairs++; } }
      return { hopsPerSec: +(hops / (frames / 60)).toFixed(2), suddenPerSec: +(sudden / (frames / 60)).toFixed(2), maxStepPx: +maxStep.toFixed(1), overlapPairsPerFrame: +(pairs / frames).toFixed(1), tilesPerFrame: +(seq.reduce((a, m) => a + m.size, 0) / frames).toFixed(1) }; };
    const pageSeq = page.map((f) => new Map(f.tiles.map((t) => [t[0], [t[1] + f.dx, t[2] + f.dy, t[3], t[4], t[5]]])));
    return { shippedLS: stats(shipped), beforeView: stats(pageSeq), pageEngineOverlapsMean: +(page.reduce((a, f) => a + f.ov, 0) / page.length).toFixed(1) };
  }
  const sbs = {}; for (const [name, sc, speed] of [['cemetery-hill 1x', [340, 14, 39.8189, -77.2262], 1], ['rose-woods 4x', [287, 14, 39.7994, -77.2417], 4], ['the-angle 4x', [550, 15, 39.8117, -77.2347], 4]]) { sbs[name] = await sideBySide(sc, speed); console.log('side by side', name, JSON.stringify(sbs[name])); }
  writeJson('v4d-shipped-vs-before.json', { generated: new Date().toISOString(), note: 'shipped lS executed in a vm (function lS and its helpers cut from baseline/dist/assets) vs the Studio Before view, same ticks, 1200 frames, 60 Hz virtual time; overlap census on bar rectangles (SAT) written here', sbs });
  
} finally { await s.close(); srv.close(); }
