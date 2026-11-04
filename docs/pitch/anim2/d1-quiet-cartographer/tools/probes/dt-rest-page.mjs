// tools/probes/dt-rest-page.mjs - the same question as dt-rest.mjs, asked of the real page in Chrome (host, popups layer, safe area, stage fade and all).
//   node tools/probes/dt-rest-page.mjs [dts=22,33.333] [zoom=13.5] [vp=desktop|phone] [dump=1]
import { open, args, stopServer } from '../lib.mjs';
const DTS = (args.dts || '16.667,22,33.333,50').split(',').map(Number); const phone = args.vp === 'phone'; const ZOOM = +(args.zoom || (phone ? 13 : 13.5));
for (const dt of DTS) {
  const s = await open({ w: phone ? 390 : 1440, h: phone ? 844 : 900, dpr: 1, mobile: phone, profile: 'dt' });
  try {
    await s.page.evaluate(() => document.fonts.ready);
    const r = await s.page.evaluate(async ({ dt, zoom, dump }) => {
      const S = window.__studio; const E = S.engine; E.tuning.set('popup.enabled', false); E.select(null); E.transport.pause(); E.transport.seek(551, { glide: false }); E.moveTo({ lat: 39.81592, lng: -77.23677, zoom }, { glide: false, safe: true });
      for (let k = 0; k < 900; k++) S.step(1, dt);
      const prev = new Map(); const worst = new Map(); let framesWith = 0; let busy = 0; const N = 120; const log = [];
      for (let k = 0; k < N; k++) { S.step(1, dt); const f = E.frame; let any = false; if (E.busy()) busy++; const v = f.view;
        for (const t of f.tiles) { if (t.life !== 'live') continue; const x = t.x + v.dx; const y = t.y + v.dy; const p = prev.get(t.key); if (p) { const d = Math.hypot(x - p[0], y - p[1]); if (d > 0.5) { any = true; const w = worst.get(t.key) || { n: 0, max: 0, key: t.key, kind: t.kind, name: t.fname || t.short }; w.n++; w.max = Math.max(w.max, d); worst.set(t.key, w); } } prev.set(t.key, [x, y]); }
        if (any) framesWith++; }
      const a = [...worst.values()];
      return { framesMoving: framesWith, marksMoving: a.length, maxStep: a.length ? +Math.max(...a.map((w) => w.max)).toFixed(1) : 0, busyFrames: busy, every: E.autoEvery(), sample: dump ? a.slice(0, 6) : undefined };
    }, { dt, zoom: ZOOM, dump: !!args.dump });
    console.log(JSON.stringify({ dt, ...r }));
  } finally { await s.close(); }
}
await stopServer();
