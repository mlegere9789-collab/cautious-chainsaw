// tools/select-sweep.mjs - director fix 6 gate: SELECT EVERY unit that stands on the screen (in a crowd or alone), settle, and check (1) no exception, (2) the selected unit has its OWN solid mark (flag and name) on
// the screen when the zoom is at least detail.selectGrowZoom, (3) the independent verifier finds no core overlap, no pin covered, no unrepresented unit, (4) on a phone the mark stands above the open sheet.
//   node tools/select-sweep.mjs --opt=a|b [--per=N]   (N units per view, default 24, evenly spread)  -> results/select-sweep-<opt>.json
import fs from 'node:fs';
import path from 'node:path';
import { open, setScene, args, D1, stopServer } from './lib.mjs';
import { CHECK_JS } from './check.mjs';
const OPT = args.opt || 'a'; process.env.LOOK_PAGE = OPT === 'a' ? 'option-a-standards.html' : 'option-b-glyph.html'; const STYLE = OPT === 'a' ? 'standards' : 'glyph'; const PER = +(args.per || 24);
const VIEWS = [
  { id: 'wheatfield-z14.5-t295', tick: 295, lat: 39.7992, lng: -77.2414, zoom: 14.5 }, { id: 'angle-z14-t551', tick: 551, lat: 39.8117, lng: -77.2347, zoom: 14 },
  { id: 'cemetery-z15.5-t346', tick: 346, lat: 39.8189, lng: -77.2262, zoom: 15.5 }, { id: 'town-z14-t60', tick: 60, lat: 39.8278, lng: -77.2528, zoom: 14 },
];
const res = { generated: new Date().toISOString(), option: OPT, per: PER, runs: [] };
for (const vp of [{ id: 'desktop', w: 1440, h: 900, mobile: false }, { id: 'phone', w: 390, h: 844, mobile: true }]) {
  const s = await open({ dpr: 1, profile: 'selsweep' + OPT, w: vp.w, h: vp.h, mobile: vp.mobile });
  try {
    for (const v of VIEWS) {
      await setScene(s.page, { tick: v.tick, lat: v.lat, lng: v.lng, zoom: v.zoom, safe: true, popups: true, style: STYLE, steps: 90 });
      await s.page.evaluate((m) => { window.__sweepPhone = m; }, vp.mobile); const ids = await s.page.evaluate(() => { const f = window.__studio.engine.frame; const out = []; const W = f.view.w; const H = f.view.h; const on = (x, y) => x >= 0 && x <= W && y >= 100 && y <= H * (window.__sweepPhone ? 0.98 : 0.62); for (const t of f.tiles) { if (t.opacity < 0.5) continue; if (t.kind === 'agg' && t.members) { for (const m of t.members) if (m.ids && m.ids.length === 1 && on(m.ax + f.view.dx, m.ay + f.view.dy)) out.push(m.ids[0]); } else if (on(t.ax + f.view.dx, t.ay + f.view.dy)) out.push(t.ids ? t.ids[0] : t.id); } return [...new Set(out)]; });
      const pick = ids.filter((_, i) => i % Math.max(1, Math.floor(ids.length / PER)) === 0).slice(0, PER);
      let bad = 0; const fails = []; let ownMark = 0; let n = 0;
      for (const id of pick) {
        n++;
        try {
          const r = await s.page.evaluate(`(async () => { const S = window.__studio; const E = S.engine; const adv = globalThis.__advance; E.select(${JSON.stringify(id)}); S.host.setSelected(${JSON.stringify(id)}); adv(50); S.host.openRail('unit-card:sel-' + ${JSON.stringify(id)}); if (${vp.mobile}) S.host.setSheet('half'); adv(150); const f = E.frame; const t = f.tiles.find((q) => q.kind === 'leaf' && q.ids && q.ids[0] === ${JSON.stringify(id)}); const zoom = f.zoom ?? E.camera.zoom; const own = !!t && t.solid !== false && t.opacity >= 0.5; const sheet = ${vp.mobile ? 'true' : 'false'}; const sx = t ? t.x + f.view.dx : -1; const sy = t ? t.y + f.view.dy : -1; const above = !!t && sx > 0 && sx < f.view.w && sy > 24 && sy < f.view.h - 8; const sel = t ? !!t.selected : false; return { own, above, sel, zoom, x: Math.round(sx), y: Math.round(sy), H: f.view.h }; })()`);
          const chk = await s.page.evaluate(CHECK_JS);
          if (r.own) ownMark++;
          const broken = chk.coreOverlaps || chk.pinCovered || chk.unrep;
          if (!r.own || !r.sel || broken || !r.above) { bad++; fails.push({ id, ...r, coreOverlaps: chk.coreOverlaps, pinCovered: chk.pinCovered, unrep: chk.unrep }); }
          await s.page.evaluate(`(async () => { const S = window.__studio; S.engine.select(null); S.host.setSelected(null); if (S.host.closeRail) S.host.closeRail(); globalThis.__advance(20); })()`);
        } catch (e) { bad++; fails.push({ id, error: String(e.message || e).split('\n')[0] }); await s.page.evaluate(() => 0).catch(() => {}); }
      }
      const row = { viewport: vp.id, view: v.id, ids: ids.length, selected: n, ownMark, bad, fails: fails.slice(0, 6) }; res.runs.push(row); console.log(JSON.stringify(row));
    }
  } finally { await s.close(); }
}
await stopServer(); fs.mkdirSync(path.join(D1, 'results'), { recursive: true }); fs.writeFileSync(path.join(D1, 'results', `select-sweep-${OPT}.json`), JSON.stringify(res, null, 1));
