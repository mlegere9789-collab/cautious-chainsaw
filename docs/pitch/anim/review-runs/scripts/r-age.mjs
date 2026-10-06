// r-age.mjs (reviewer) - how are the units spread over the fix-age bands that the War Room / Field Manual freshness channel uses (settled leaf tiles at zoom 17, carry-forward rule)?
import { serve, launch, PROTO, args, writeJson } from './lib.mjs';
const PORT = +(args.port || 9740); const srv = await serve(PROTO, PORT); const s = await launch({ port: PORT, query: 'welcome=0&manual=1', profile: 'age' });
try {
  const ticks = []; for (let t = 25; t <= 675; t += 25) ticks.push(t);
  const r = await s.page.evaluate((ticks) => {
    const S = window.__studio; const E = S.engine; E.tuning.set('popup.enabled', false); E.tuning.set('compare.mode', 'after'); S.ui.chooseStyle('war-room', 'standard'); E.tuning.set('layout.dMaxPx', 48);
    const bands = { lt12: 0, lt48: 0, lt112: 0, lt225: 0, ge225: 0, n: 0 }; const per = [];
    for (const tick of ticks) {
      E.select(null); E.transport.pause(); E.transport.seek(tick, { glide: false }); E.moveTo({ lat: 39.81592, lng: -77.23677, zoom: 17 }, { glide: false, safe: false });
      let last = -1; let still = 0; let f; for (let i = 0; i < 300; i++) { f = S.step(1); if (!E.busy() && f.tiles.length === last) { if (++still >= 4) break; } else still = 0; last = f.tiles.length; }
      let n = 0; let ge = 0; for (const t of f.tiles) { if (t.life !== 'live' || t.kind !== 'leaf') continue; const a = t.ageTicks; n++; bands.n++; if (a < 12) bands.lt12++; else if (a < 48) bands.lt48++; else if (a < 112.5) bands.lt112++; else if (a < 225) bands.lt225++; else { bands.ge225++; ge++; } }
      per.push({ tick, n, ge225: ge });
    }
    return { bands, per };
  }, ticks);
  const b = r.bands; const pc = (x) => (100 * x / b.n).toFixed(1) + '%';
  console.log('unit-ticks', b.n, '| age <12:', pc(b.lt12), '12-48:', pc(b.lt48), '48-112.5:', pc(b.lt112), '112.5-225 (blend):', pc(b.lt225), '>=225 (carried look):', pc(b.ge225));
  writeJson('r-age.json', r);
} finally { await s.close(); srv.close(); }
