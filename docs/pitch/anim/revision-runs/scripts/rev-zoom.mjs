// rev-zoom.mjs (revision; the reviewer's r-zoom.mjs with the display modes of the strict-glide experiment added)
// r-zoom.mjs (reviewer) - tile motion DURING a camera zoom and pan (paused battle, popups off, 60 Hz virtual time).  The pitch's jitter figures are for a fixed camera; report 01 found that
// the shipped layout flickered in 35 to 50 % of tile-frames during a zoom.  Metric (same as 06): a tile "pops" when its offset from its own true position changes by more than 3 px in a frame
// (the tile moved relative to the unit it stands for); a "birth/death" is a tile appearing or disappearing; per-frame count of tiles whose opacity changes by > 0.3.
import { serve, launch, PROTO, args, writeJson } from './lib.mjs';
const PORT = +(args.port || 9766);
const srv = await serve(PROTO, PORT);
const s = await launch({ port: PORT, query: 'welcome=0&manual=1', profile: 'revzoom' });
const rows = [];
try {
  for (const cfg of [{ style: 'war-room', set: {} }, { style: 'war-room', set: { 'layout.dMaxPx': 0 } }, { style: 'war-room', set: { 'motion.mode': 'strict' } }, { style: 'war-room', set: { 'motion.mode': 'strict', 'layout.dMaxPx': 0 } }, { style: 'war-room', set: { 'motion.mode': 'snap' } }, { style: 'field-manual', set: {} }]) {
    for (const [name, z0, z1, tick, kind] of [['zoom 13.5 -> 15.5', 13.5, 15.5, 551, 'zoom'], ['zoom 15.5 -> 13.5', 15.5, 13.5, 551, 'zoom'], ['zoom 14 -> 16', 14, 16, 340, 'zoom'], ['pan at z15', 15, 15, 551, 'pan']]) {
      const r = await s.page.evaluate(({ cfg, z0, z1, tick, kind }) => {
        const S = window.__studio; const E = S.engine; E.tuning.set('popup.enabled', false); E.tuning.set('compare.mode', 'after'); S.ui.chooseStyle(cfg.style, 'standard');
        E.tuning.set('layout.dMaxPx', 48); for (const [k, v] of Object.entries(cfg.set)) E.tuning.set(k, v);
        E.select(null); E.transport.pause(); E.transport.seek(tick, { glide: false }); E.moveTo({ lat: 39.8117, lng: -77.2347, zoom: z0 }, { glide: false, safe: false });
        for (let i = 0; i < 300; i++) { S.step(1); if (!E.busy() && i > 20) break; }
        for (let i = 0; i < 30; i++) S.step(1);
        if (kind === 'zoom') E.zoomTo(z1, { at: [720, 450], glide: true }); else E.moveTo({ lat: 39.8117 + 0.004, lng: -77.2347 + 0.006, zoom: z0 }, { glide: true, safe: false });
        const FR = 90; let prev = new Map(); let pops = 0; let popFrames = 0; let births = 0; let deaths = 0; let flashes = 0; let tileFrames = 0; let maxOffJump = 0; let overlapFrames = 0; let handoffs = 0; let travels = 0; let netDims = 0; let dimTileFrames = 0; const zs = []; let solidPops = 0; let solidMax = 0; let solidPopFrames = 0; let solidTileFrames = 0;
        for (let i = 0; i < FR; i++) {
          const f = S.step(1); const cur = new Map(); let fp = 0; let sp = 0; zs.push(+f.zoom.toFixed(2));
          for (const t of f.tiles) { if (t.opacity < 0.02) continue; cur.set(t.key, { kind: t.kind, ox: t.x - t.ax, oy: t.y - t.ay, op: t.opacity, x: t.x, y: t.y }); if (t.opacity < 0.5) dimTileFrames++; }
          for (const [k, c] of cur) { tileFrames++; const p = prev.get(k); if (!p) { births++; continue; } const j = Math.hypot(c.ox - p.ox, c.oy - p.oy); if (c.op >= 0.5 && p.op >= 0.5 && c.kind === 'leaf' && p.kind === 'leaf') { solidTileFrames++; if (j > 3) { solidPops++; sp = 1; if (j > solidMax) solidMax = j; } } if (j > 3) { pops++; fp++; if (j > maxOffJump) maxOffJump = j; } if (Math.abs(c.op - p.op) > 0.3) flashes++; }
          for (const k of prev.keys()) if (!cur.has(k)) deaths++;
          if (fp) popFrames++; if (sp) solidPopFrames++; if (f.stats) { handoffs += f.stats.handoffs || 0; travels += f.stats.travels || 0; netDims += f.stats.netDims || 0; } if (f.overlaps) overlapFrames++;
          prev = cur;
        }
        return { solidPops, solidMax, solidPopFrames, solidTileFrames, FR, pops, popFrames, births, deaths, flashes, tileFrames, popShare: pops / Math.max(1, tileFrames), maxOffJump, handoffs, travels, netDims, dimTileFrames, overlapFrames, zoomPath: [zs[0], zs[30], zs[60], zs[89]] };
      }, { cfg, z0, z1, tick, kind });
      rows.push({ style: cfg.style, set: JSON.stringify(cfg.set), name, ...r });
      console.log(cfg.style, JSON.stringify(cfg.set), name, 'solid pops', r.solidPops, 'in', r.solidPopFrames + '/' + r.FR, 'frames', 'solid max', r.solidMax.toFixed(1), 'solid tile-frames', r.solidTileFrames, '| all pops', r.pops, 'popFrames', r.popFrames + '/' + r.FR, 'births', r.births, 'deaths', r.deaths, 'flashes>0.3', r.flashes, 'tile-frames', r.tileFrames, 'pop share', (100 * r.popShare).toFixed(2) + '%', 'max offset jump', r.maxOffJump.toFixed(1), 'handoffs', r.handoffs, 'travels', r.travels, 'netDims', r.netDims, 'dimTileFrames', r.dimTileFrames, 'engine overlap frames', r.overlapFrames, 'zoom path', r.zoomPath.join('>'));
    }
  }
  writeJson('rev-zoom.json', { generated: new Date().toISOString(), rows });
} finally { await s.close(); srv.close(); }
