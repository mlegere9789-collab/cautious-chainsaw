// rev-ellipsis.mjs (revision, review fix 10) - how many name labels the prototype paints are cut with an ellipsis?  Settled picture, popups off; every fillText of the last frame is recorded.
// A label is a string drawn by the skin's label function (anything longer than 12 characters is treated as a name label here; the short codes on the plates are at most 12 characters); counted: strings that end with an ellipsis.
import { serve, launch, PROTO, args, writeJson } from './lib.mjs';
const PORT = +(args.port || 9775); const srv = await serve(PROTO, PORT);
const rows = [];
try {
  for (const style of ['war-room', 'field-manual', 'map-1863']) for (const zoom of [14, 15, 16]) for (const tick of [551, 604]) {
    const s = await launch({ port: PORT, query: 'welcome=0&manual=1', profile: 'ell' });
    try {
      const r = await s.page.evaluate(({ style, zoom, tick }) => {
        const S = window.__studio; const E = S.engine; E.tuning.set('popup.enabled', false); E.tuning.set('compare.mode', 'after'); S.ui.chooseStyle(style, 'standard');
        E.select(null); E.transport.pause(); E.transport.seek(tick, { glide: false }); E.moveTo({ lat: 39.8117, lng: -77.2347, zoom }, { glide: false, safe: false });
        let last = -1; let still = 0; for (let i = 0; i < 400; i++) { const f = S.step(1); if (!E.busy() && f.tiles.length === last) { if (++still >= 4) break; } else still = 0; last = f.tiles.length; }
        const P = CanvasRenderingContext2D.prototype; const orig = P.fillText; const seen = []; P.fillText = function (t, ...a) { if (this.canvas && this.canvas.id === 'map') seen.push(String(t)); return orig.call(this, t, ...a); };
        S.step(1); P.fillText = orig;
        const names = seen.filter((t) => t.length > 12); const cut = names.filter((t) => /(…|\.\.\.)$/.test(t));
        const codes = seen.filter((t) => t.length <= 12);
        return { strings: seen.length, names: names.length, cut: cut.length, examples: cut.slice(0, 4), tiles: E.frame.tiles.filter((t) => t.life === 'live').length };
      }, { style, zoom, tick });
      rows.push({ style, zoom, tick, ...r }); console.log(style, 'zoom', zoom, 'tick', tick, '| name labels painted', r.names, '| cut with an ellipsis', r.cut, r.examples.join(' / '));
    } finally { await s.close(); }
  }
  writeJson('rev-ellipsis.json', { generated: new Date().toISOString(), rows });
} finally { srv.close(); }
