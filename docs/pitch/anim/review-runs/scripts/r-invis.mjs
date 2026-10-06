// r-invis.mjs (reviewer) - which units does the verifier call "invisible" (in view, no tile painted at alpha >= 0.05) in War Room at The Angle?  Engine-level view (tile opacity), manual 60 Hz mode, popups off.
import { serve, launch, PROTO, args, writeJson } from './lib.mjs';
import { SCENES } from './scenes.mjs';
const PORT = +(args.port || 9746); const srv = await serve(PROTO, PORT); const s = await launch({ port: PORT, query: 'welcome=0&manual=1', profile: 'invis' });
try {
  for (const style of ['war-room', 'field-manual']) {
    const r = await s.page.evaluate(({ sc, style }) => {
      const S = window.__studio; const E = S.engine; E.tuning.set('popup.enabled', false); E.tuning.set('compare.mode', 'after'); S.ui.chooseStyle(style, 'standard'); E.transport.pause(); E.select(null);
      E.transport.seek(sc.tick, { glide: false }); E.moveTo({ lat: sc.lat, lng: sc.lng, zoom: sc.zoom }, { glide: false, safe: false }); for (let i = 0; i < 260; i++) S.step(1); E.transport.setSpeed(4); E.transport.play(); for (let i = 0; i < 40; i++) S.step(1);
      const W = E.view ? E.view.w : 1440; const cnt = new Map(); let framesInv = 0; const ex = new Map();
      for (let i = 0; i < 600; i++) {
        const f = S.step(1); const best = new Map(); const meta = new Map();
        for (const t of f.tiles) { if (t.opacity < 0.02) continue; const cx = t.x + f.view.dx; const cy = t.y + f.view.dy; if (!(cx + t.w / 2 > 1 && cx - t.w / 2 < 1440 - 1 && cy + t.h / 2 > 1 && cy - t.h / 2 < 900 - 1)) continue; for (const id of t.ids) { if ((best.get(id) ?? -1) < t.opacity) { best.set(id, t.opacity); meta.set(id, { key: t.key, kind: t.kind, life: t.life, op: +t.opacity.toFixed(3), scale: +(t.scale ?? 1).toFixed(2), n: t.n }); } } }
        let any = 0; for (const [id, op] of best) if (op < 0.05) { any++; cnt.set(id, (cnt.get(id) || 0) + 1); if (!ex.has(id)) ex.set(id, meta.get(id)); }
        if (any) framesInv++;
      }
      const top = [...cnt.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([id, n]) => ({ id, frames: n, ...ex.get(id) }));
      return { framesInv, of: 600, top };
    }, { sc: SCENES['the-angle'], style });
    console.log(style, JSON.stringify(r));
  }
} finally { await s.close(); srv.close(); }
