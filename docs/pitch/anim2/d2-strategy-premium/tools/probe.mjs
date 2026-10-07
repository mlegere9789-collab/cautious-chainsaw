// tools/probe.mjs - one quick picture while iterating:  node tools/probe.mjs --tick=551 --zoom=15 --lat=39.8117 --lng=-77.235 --out=probe.png [--dpr=2] [--vp=1440x900] [--crop=x,y,w,h] [--select=1] [--query=...]
import fs from 'node:fs';
import path from 'node:path';
import { launch, settle, args, WORK } from './lib.mjs';
const [VW, VH] = (args.vp || '1440x900').split('x').map(Number); const DPR = +(args.dpr || 2);
const run = await launch({ w: VW, h: VH, dpr: DPR, query: 'manual=1' + (args.query ? '&' + args.query : ''), mobile: VW < 600 });
const { page } = run;
try {
  const info = await page.evaluate(async ({ tick, zoom, lat, lng, scene }) => {
    const S = window.__studio;
    const sc = S.engine.kernel && null; const ds = JSON.parse(document.getElementById('studio-dataset').textContent).scenes.find((s) => s.id === scene);
    const z = zoom ?? (ds ? ds.zoom : 15); const la = lat ?? (ds ? ds.lat : 39.8117); const ln = lng ?? (ds ? ds.lng : -77.235); const tk = tick ?? (ds ? ds.tick : 551);
    S.engine.transport.seek(tk, { glide: false }); S.engine.moveTo({ lat: la, lng: ln, zoom: z }, { glide: false, safe: false }); S.engine.transport.pause();
    window.__adv(6);
    return { tick: tk, zoom: z };
  }, { tick: args.tick ? +args.tick : null, zoom: args.zoom ? +args.zoom : null, lat: args.lat ? +args.lat : null, lng: args.lng ? +args.lng : null, scene: args.scene || 'fresh2' });
  await settle(page, { frames: +(args.frames || 150) });
  const stat = await page.evaluate(() => { const f = window.__studio.engine.frame; const live = f.tiles.filter((t) => t.life === 'live'); return { tiles: live.length, agg: live.filter((t) => t.kind === 'agg').length, units: f.onField, overlaps: f.overlaps, unrep: f.unrepresented, bd: globalThis.__realBackdrop.stats() }; });
  const out = path.resolve(args.out || path.join(WORK, 'probe.png'));
  const opt = { path: out }; if (args.crop) { const [x, y, w, h] = args.crop.split(',').map(Number); opt.clip = { x, y, width: w, height: h }; }
  await page.screenshot(opt);
  console.log(JSON.stringify({ info, stat, out, errors: run.errors.slice(0, 6), external: run.requests.slice(0, 3) }));
} finally { await run.close(); }
