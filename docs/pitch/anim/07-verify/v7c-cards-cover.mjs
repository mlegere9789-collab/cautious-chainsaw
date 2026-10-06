// v7c-cards-cover.mjs - "popup cards never cover a tile": at every event tick (45 critical, 73 high, 16 medium) and every story tick the page is driven there at three camera positions (the opening scene at zoom 15.5,
// The Angle at zoom 15, the whole field at 13.5), settled for 30 frames, and every card on screen (#popups .pc, including the persistent clock / legend / minimap / hint / chronicle cards) is checked against the
// painted chips (witness) and labels, and against the units' true-position pins.   -> results/v7c-cards-cover.json
import { serve, launch, PROTO, args, writeJson } from './lib.mjs';
import { SCENES } from './scenes.mjs';
import { rj } from './srcdata.mjs';

const ev = []; for (const d of [1, 2, 3]) for (const e of rj(`chronology_day${d}.json`).events) if (e.significance !== 'low') ev.push(e.tick);
const st = []; for (const p of [1, 2, 3]) for (const v of rj(`vignettes_part${p}.json`).vignettes) st.push(+v.trigger_tick);
const ticks = [...new Set([...ev, ...st])].sort((a, b) => a - b);
const PORT = +(args.port || 9731); const srv = await serve(PROTO, PORT); const s = await launch({ port: PORT, query: 'welcome=0&manual=1', witness: true, profile: 'cards' }); const rows = [];
try {
  await s.page.evaluate(() => { window.__rec.keep = false; window.__rec.install({ dom: ['#popups .pc'] }); });
  for (const cam of ['default', 'the-angle', 'field']) {
    const sc = SCENES[cam]; let cardsSeen = 0; let framesWithCards = 0; let chipsCovered = 0; let ticksWithCover = []; let frames = 0; let maxCards = 0; const kinds = {};
    for (const tick of ticks) {
      const r = await s.page.evaluate(({ sc, tick }) => { const S = window.__studio; const E = S.engine; const R = window.__rec; E.transport.pause(); E.select(null); E.transport.seek(tick, { glide: false }); E.moveTo({ lat: sc.lat, lng: sc.lng, zoom: sc.zoom }, { glide: false, safe: true }); const out = []; for (let i = 0; i < 40; i++) { S.step(1, 16.667); if (i >= 12) { const cards = [...document.querySelectorAll('#popups .pc')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 4 && r.height > 4 && getComputedStyle(e).opacity > 0.2; }); out.push({ cards: cards.length, kinds: cards.map((e) => e.dataset.popup || '?'), cover: R.last.domHit ? R.last.domHit.any : 0, tau: R.last.tau }); } } return out; }, { sc, tick });
      for (const f of r) { frames++; if (f.cards > 0) framesWithCards++; maxCards = Math.max(maxCards, f.cards); cardsSeen += f.cards; chipsCovered += f.cover; if (f.cover > 0 && ticksWithCover.length < 8) ticksWithCover.push([tick, f.cover, f.kinds.join(',')]); for (const k of f.kinds) kinds[k] = (kinds[k] || 0) + 1; }
    }
    const row = { camera: cam, ticks: ticks.length, framesChecked: frames, framesWithAtLeastOneCard: framesWithCards, meanCardsOnScreen: +(cardsSeen / frames).toFixed(2), maxCardsOnScreen: maxCards, chipFramesCoveredByACard: chipsCovered, examples: ticksWithCover, cardFramesByKind: kinds };
    rows.push(row); console.log(JSON.stringify(row));
  }
  writeJson('v7c-cards-cover.json', { generated: new Date().toISOString(), rows });
} finally { await s.close(); srv.close(); }
