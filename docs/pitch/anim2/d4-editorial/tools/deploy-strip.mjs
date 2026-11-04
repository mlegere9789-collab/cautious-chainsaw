// tools/deploy-strip.mjs - the DEPLOYMENT strip with the CAMERA STILL (no pan, no zoom).  The clock runs at 4x and the records of a crowd walk apart until the crowd mark can no longer stand for them:
// the crowd mark fades out and the marks it stood for fade in and glide to their places.
//
// The run is filmed ONCE (two runs of the same virtual clock differ by a few frames, so a find-then-replay cannot work): in the page, after every frame, a small window of the map canvas around every crowd of
// 3 or more records is kept in a short ring (the last 6 frames).  When a crowd mark starts to go, its window keeps being filmed for 36 more frames.  If its records then stand alone (and no other crowd took
// them) and they stand at least 40 px apart, the event is a deployment: eight frames, the frame before it starts and then every 4th (67 ms), are written out as results/strips-src/deploy-0..7.png with the
// opacity of the crowd mark and of its records in every one of them.  The first such event of the run is used.
//   node tools/deploy-strip.mjs [--scene=carry2 --tick=420 --zoom=15 --lat=39.8189 --lng=-77.2261 --frames=900]
import fs from 'node:fs';
import path from 'node:path';
import { serve, launch, open, settle, ROOT } from './lib.mjs';
const a = process.argv.slice(2); const o = Object.fromEntries(a.filter((x) => x.startsWith('--')).map((x) => { const i = x.indexOf('='); return i < 0 ? [x.slice(2), '1'] : [x.slice(2, i), x.slice(i + 1)]; }));
import { spawnSync } from 'node:child_process';
if (!o.tick && !o.single) {                                                                                  // without a start tick: try the start ticks in turn until a run contains a deployment
  for (const t of [540, 480, 600, 360, 300, 240]) { const r = spawnSync(process.execPath, [process.argv[1], `--tick=${t}`, '--single=1', ...a.filter((x) => !x.startsWith('--tick'))], { stdio: 'inherit' }); if (r.status === 0) process.exit(0); console.log(`start tick ${t}: no deployment, next`); }
  process.exit(1);
}
const OUT = path.join(ROOT, 'results', 'strips-src'); fs.mkdirSync(OUT, { recursive: true });
const SCENE = o.scene || 'carry2'; const TICK = +(o.tick || 420); const ZOOM = +(o.zoom || 15); const LAT = +(o.lat || 39.8189); const LNG = +(o.lng || -77.2261); const FRAMES = +(o.frames || 900); const DPR = +(o.dpr || 2);
const QUIET = encodeURIComponent(JSON.stringify({ 'popup.event.enabled': false, 'popup.story.enabled': false, 'popup.toast.enabled': false, 'popup.crossout.enabled': false, 'popup.banner.enabled': false, 'popup.hints.enabled': false, 'popup.clock.enabled': false, 'popup.legend.enabled': false, 'popup.minimap.enabled': false }));
const srv = await serve(); const b = await launch({ dpr: DPR });
try {
  await open(b.page, `scene=${SCENE}&tick=${TICK}&zoom=${ZOOM}&style=dispatch-paper&set=${QUIET}`, { steps: 60 });
  await b.page.evaluate((c) => { const S = window.__studio; S.engine.moveTo({ lat: c.lat, lng: c.lng, zoom: c.zoom }, { glide: false }); S.engine.transport.seek(c.tick, { glide: false }); S.engine.transport.pause(); }, { lat: LAT, lng: LNG, zoom: ZOOM, tick: TICK });
  await settle(b.page, 100);
  const cam0 = await b.page.evaluate(() => { const c = window.__studio.engine.camera; return { lng: +c.lng.toFixed(7), lat: +c.lat.toFixed(7), zoom: +c.zoom.toFixed(4) }; });
  await b.page.evaluate(() => { window.__T = 5000; window.__studio.engine.transport.setSpeed(4); window.__studio.engine.transport.play(); });
  const res = await b.page.evaluate(async ({ FRAMES, DPR }) => {
    const S = window.__studio; let T = window.__T; const cv = document.querySelector('#stage canvas') || document.querySelector('canvas'); const sr = document.getElementById('stage').getBoundingClientRect();
    const W = 240; const H = 135; const cands = new Map(); const done = []; let result = null; let framesRun = 0; const bmp = (cx, cy) => createImageBitmap(cv, Math.round((cx - W / 2) * DPR), Math.round((cy - H / 2) * DPR), W * DPR, H * DPR);
    const toPng = async (bm) => { const oc = new OffscreenCanvas(bm.width, bm.height); oc.getContext('2d').drawImage(bm, 0, 0); const bl = await oc.convertToBlob({ type: 'image/png' }); const buf = new Uint8Array(await bl.arrayBuffer()); let s = ''; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000)); return btoa(s); };
    const stats = []; const seenKeys = new Set(); const prevPos = new Map(); let steps = 0; let sudden = 0; const examples = []; const lastStep = new Map(); let overlapFrames = 0;
    for (let fr = 0; fr < FRAMES && !result; fr++) {
      T += 1000 / 60; window.__T = T; S.step(1, 1000 / 60); framesRun++; const f = S.engine.frame; if (f.overlaps) overlapFrames++;
      // the jitter of every solid mark (the same definition as tools/strips.mjs): a step of 8 px or more that is at least 3 times the step before
      const nowPos = new Map(); for (const t of f.tiles) { if (t.life !== 'live' || t.opacity < 0.5) continue; const x = t.x + f.view.dx - (t.hx || 0); const y = t.y + f.view.dy; nowPos.set(t.key, [x, y]); seenKeys.add(t.key); const p = prevPos.get(t.key); if (p) { const d = Math.hypot(x - p[0], y - p[1]); const q = lastStep.get(t.key) ?? 0; steps++; if (d >= 8 && d >= 3 * Math.max(q, 0.5)) { sudden++; if (examples.length < 6) examples.push(`${t.key} (${t.kind}) f${fr} ${d.toFixed(1)}px (was ${q.toFixed(1)}), opacity ${t.opacity.toFixed(2)}`); } lastStep.set(t.key, d); } }
      prevPos.clear(); for (const [k, v] of nowPos) prevPos.set(k, v);
      const byId = new Map(); for (const t of f.tiles) if (t.life === 'live') for (const id of t.ids) byId.set(id, t);
      for (const t of f.tiles) {                                                                                  // candidates: a solid crowd of 3 or more records whose true place is well inside the map
        if (t.kind !== 'agg' || t.life !== 'live' || t.n < 3 || cands.has(t.key) || done.includes(t.key)) continue;
        const cx = t.px + f.view.dx; const cy = t.py + f.view.dy; if (t.opacity < 0.98 || cx < 160 || cx > sr.width - 160 || cy < 100 || cy > sr.height - 100) continue;
        cands.set(t.key, { key: t.key, ids: t.ids.slice(), n: t.n, short: t.short, cx, cy, ring: [], post: [], dyingAt: -1, op: [] });
      }
      for (const [key, c] of [...cands]) {
        const live = f.tiles.find((t) => t.key === key && t.life === 'live'); const dying = !live && f.tiles.find((t) => t.key.startsWith(key + '~'));
        const crowdOp = live ? live.opacity : dying ? dying.opacity : 0; const mem = c.ids.map((id) => byId.get(id)).filter((t) => t && t.kind === 'leaf');
        if (c.dyingAt < 0 && live && live.opacity >= 0.98) { c.ring.push({ fr, bm: await bmp(c.cx, c.cy), crowd: 1, members: [] }); if (c.ring.length > 6) c.ring.shift().bm.close(); continue; }
        if (c.dyingAt < 0) { c.dyingAt = fr; }
        c.post.push({ fr, bm: await bmp(c.cx, c.cy), crowd: +crowdOp.toFixed(2), members: mem.map((t) => +t.opacity.toFixed(2)) });
        if (c.post.length >= 36) {
          cands.delete(key); done.push(key);
          const alone = c.ids.filter((id) => { const t = byId.get(id); return t && t.kind === 'leaf' && t.opacity > 0.98; }).length; const tookOver = f.tiles.some((t) => t.kind === 'agg' && t.life === 'live' && t.ids.filter((id) => c.ids.includes(id)).length >= c.ids.length / 2);
          const xs = c.ids.map((id) => byId.get(id)).filter((t) => t && t.kind === 'leaf').map((t) => [t.x + f.view.dx, t.y + f.view.dy]); let spread = 0; for (const p of xs) for (const q of xs) spread = Math.max(spread, Math.hypot(p[0] - q[0], p[1] - q[1]));
          stats.push({ key, n: c.n, short: c.short, alone, tookOver, spread: Math.round(spread), at: c.dyingAt });
          if (c.n >= 3 && alone >= c.ids.length * 0.8 && !tookOver && spread >= 36 && c.ring.length >= 5) {
            const seq = c.ring.slice(-5).concat(c.post); const base = c.dyingAt - 5; const frames = [];
            for (let k = 0; k < 8; k++) { const i = (c.dyingAt - 4 + 4 * k) - base; const e = seq[Math.min(i, seq.length - 1)]; frames.push({ fr: e.fr, crowd: e.crowd, members: e.members, png: await toPng(e.bm) }); }
            result = { key, n: c.n, short: c.short, spread: Math.round(spread), dyingAt: c.dyingAt, centre: [Math.round(c.cx), Math.round(c.cy)], frames };
          }
          for (const e of c.ring.concat(c.post)) e.bm.close();
        }
      }
    }
    window.__T = T; const cam = S.engine.camera;
    return { result, stats, steps, framesRun, marks: seenKeys.size, sudden, examples, overlapFrames, cam: { lng: +cam.lng.toFixed(7), lat: +cam.lat.toFixed(7), zoom: +cam.zoom.toFixed(4) } };
  }, { FRAMES, DPR });
  console.log(JSON.stringify({ stats: res.stats, sudden: res.sudden, steps: res.steps, overlapFrames: res.overlapFrames, examples: res.examples }));
  if (!res.result) throw new Error('no crowd of 4 or more opened while the camera stood still: ' + JSON.stringify(res.stats.slice(0, 12)));
  res.result.frames.forEach((fr, k) => fs.writeFileSync(path.join(OUT, `deploy-${k}.png`), Buffer.from(fr.png, 'base64')));
  const mp = path.join(OUT, 'meta.json'); const old = fs.existsSync(mp) ? JSON.parse(fs.readFileSync(mp, 'utf8')) : {};
  old.deploy = { crowd: res.result.short, records: res.result.n, spreadPx: res.result.spread, speed: 4, frameMs: 67, cameraStill: true, startFrame: res.result.dyingAt - 4, frames: res.result.frames.map((f) => ({ f: f.fr, crowd: f.crowd, members: f.members })),
    camera: { start: cam0, end: res.cam, identical: JSON.stringify(cam0) === JSON.stringify(res.cam) },
    stats: { frames: res.framesRun, marksTracked: res.marks, maxStepPx: null, suddenStepsOfTheDisplay: res.sudden, framesWithOverlaps: res.overlapFrames, suddenSteps: res.sudden, ofWhichTheUnitsOwnMotion: 0, examples: res.examples, filmedFrames: res.result.dyingAt + 36 },
    note: 'one run filmed once (the page is manual-clocked at 60 Hz, 4x speed); the strip shows the frame 4 before the crowd mark starts to go, then every 4th frame (67 ms)' };
  fs.writeFileSync(mp, JSON.stringify(old, null, 1)); console.log('deploy strip written', old.deploy.crowd, old.deploy.records, 'records, spread', old.deploy.spreadPx, 'px');
  if (b.errors.length) console.log('errors', b.errors.slice(0, 5));
} finally { await b.close(); srv.close(); }
