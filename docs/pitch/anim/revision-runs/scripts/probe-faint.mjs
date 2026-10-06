import { serve, launch, PROTO, args } from './lib.mjs';
import { SCENES } from './scenes.mjs';
const PORT = +(args.port || 9773); const srv = await serve(PROTO, PORT); const s = await launch({ port: PORT, query: 'welcome=0&manual=1', profile: 'pf' });
try {
  const r = await s.page.evaluate((sc) => {
    const S = window.__studio; const E = S.engine; E.tuning.set('popup.enabled', false); E.tuning.set('compare.mode', 'after'); S.ui.chooseStyle('war-room', 'standard'); E.tuning.set('motion.mode', 'strict');
    E.transport.pause(); E.select(null); E.transport.seek(sc.tick, { glide: false }); E.moveTo({ lat: sc.lat, lng: sc.lng, zoom: sc.zoom }, { glide: false, safe: true });
    for (let i = 0; i < 260; i++) S.step(1); E.transport.setSpeed(4); E.transport.play(); for (let i = 0; i < 40; i++) S.step(1);
    let frames = 0; const kinds = {}; let ex = null; let faintFrames = 0;
    for (let i = 0; i < 600; i++) { const f = S.step(1); let any = false; for (const t of f.tiles) { if (t.opacity >= 0.02 && t.opacity < 0.5) { any = true; const k = t.life + '/' + t.kind + '/' + (t.entering ? 'entering' : '') + '/' + (t.travelling ? 'dim' : ''); kinds[k] = (kinds[k] || 0) + 1; if (!ex) ex = { op: t.opacity, scale: t.scale, w: t.w, key: t.key }; } } if (any) faintFrames++; frames++; }
    return { frames, faintFrames, kinds, ex };
  }, SCENES['the-angle']);
  console.log(JSON.stringify(r));
} finally { await s.close(); srv.close(); }
