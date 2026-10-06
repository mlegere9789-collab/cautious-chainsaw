// rev-agg2.mjs (revision) - fix 1 follow-up: how far do the two things the owner could choose between (a bigger nudge budget, a smaller mark at low zoom) reduce the share of units that have no tile of their own?
//   settled, camera on the field centre, popups off, same loop as the reviewer's r-agg.mjs.  The "mark" rows register a scratch skin in the page (no change to the prototype) whose footprint is a square of the given size
//   with no code text (text widths zeroed), to estimate the best case of "semantic zoom: small side-and-arm marks at low zoom".  Counted tiles keep a count badge.
import { serve, launch, PROTO, args, writeJson } from './lib.mjs';
const PORT = +(args.port || 9765);
const srv = await serve(PROTO, PORT);
const s = await launch({ port: PORT, query: 'welcome=0&manual=1', profile: 'agg2' });
const TICKS = [56, 226, 400, 551, 604, 650];
const rows = [];
const CFGS = [];
if (args.only !== 'marks') for (const d of [48, 0, 12, 24, 96, 120]) CFGS.push({ kind: 'dmax', style: 'war-room', dmax: d, zooms: [13.5] });
if (args.only !== 'dmax') for (const size of [8, 10, 12, 14, 18]) for (const d of [48, 0]) CFGS.push({ kind: 'mark', style: 'war-room', size, dmax: d, zooms: [13, 13.5, 14, 15] });
try {
  for (const cfg of CFGS) for (const zoom of cfg.zooms) {
    const r = await s.page.evaluate(({ cfg, zoom, TICKS }) => {
      const S = window.__studio; const E = S.engine; E.tuning.set('popup.enabled', false); E.tuning.set('compare.mode', 'after'); S.ui.chooseStyle(cfg.style, 'standard');
      E.tuning.set('layout.dMaxPx', cfg.dmax);
      if (cfg.kind === 'mark') {
        const base = E.text.table; const t2 = JSON.parse(JSON.stringify(base));
        for (const k of Object.keys(t2.fonts.code.adv)) t2.fonts.code.adv[k] = 0;
        for (const k of Object.keys(t2.fonts.badge.adv)) t2.fonts.badge.adv[k] = 5.5;
        E.setTextTable(t2, 'zeroed code text (experiment)');
        const id = 'mark' + cfg.size;
        if (!E.kernel.skins.has(id)) E.kernel.skins.register(id, { label: id, version: '0', footprint: { chipH: cfg.size, chipPadX: 0.5, glyphW: cfg.size - 2, glyphGap: 0.5, chipMinW: cfg.size, ring: 1, badgeGap: 0.5 }, fonts: { code: '700 1px sans-serif', label: '600 12px sans-serif', badge: '700 10px sans-serif' }, draw: { tile(c, t) { c.fillStyle = t.side === 'union' ? '#2a6' : '#c42'; c.fillRect(-t.w / 2, -t.h / 2, t.w, t.h); } } });
        E.tuning.set('skin.id', id);
      }
      const out = [];
      for (const tick of TICKS) {
        E.select(null); E.transport.pause(); E.transport.seek(tick, { glide: false }); E.moveTo({ lat: 39.81592, lng: -77.23677, zoom }, { glide: false, safe: false });
        let f; let last = -1; let still = 0; for (let i = 0; i < 400; i++) { f = S.step(1); if (!E.busy() && f.tiles.length === last) { if (++still >= 4) break; } else still = 0; last = f.tiles.length; }
        const live = f.tiles.filter((t) => t.life === 'live' && t.opacity >= 0.5);
        const leaves = live.filter((t) => t.kind === 'leaf'); const aggs = live.filter((t) => t.kind === 'agg');
        const unitsAgg = aggs.reduce((a, t) => a + t.ids.length, 0);
        const mixed = aggs.filter((t) => t.side === 'mixed').reduce((a, t) => a + t.ids.length, 0);
        out.push({ tick, tiles: live.length, leaves: leaves.length, aggs: aggs.length, unitsInAgg: unitsAgg, shareAgg: unitsAgg / Math.max(1, unitsAgg + leaves.length), mixedUnits: mixed, displaced: leaves.filter((t) => t.displaced).length });
      }
      if (cfg.kind === 'mark') { E.setTextTable(E.text.table, 'x'); }
      return out;
    }, { cfg, zoom, TICKS });
    for (const o of r) rows.push({ kind: cfg.kind, size: cfg.size ?? null, dmax: cfg.dmax, zoom, ...o });
    const mean = r.reduce((a, o) => a + o.shareAgg, 0) / r.length; const mx = Math.max(...r.map((o) => o.shareAgg));
    const mixed = r.reduce((a, o) => a + o.mixedUnits, 0) / r.reduce((a, o) => a + o.unitsInAgg, 0 || 1);
    console.log(cfg.kind, cfg.size ?? '-', 'dMax', cfg.dmax, 'zoom', zoom, 'share in counted tiles', (100 * mean).toFixed(1) + '%', '(max ' + (100 * mx).toFixed(1) + '%)', 'tiles', (r.reduce((a, o) => a + o.tiles, 0) / r.length).toFixed(0), 'units', (r.reduce((a, o) => a + o.leaves + o.unitsInAgg, 0) / r.length).toFixed(0), 'displaced leaves', (r.reduce((a, o) => a + o.displaced, 0) / r.length).toFixed(0), 'mixed-side share of merged', (100 * (isFinite(mixed) ? mixed : 0)).toFixed(0) + '%');
  }
  writeJson(args.only ? 'rev-agg2-' + args.only + '.json' : 'rev-agg2.json', { generated: new Date().toISOString(), ticks: TICKS, rows });
} finally { await s.close(); srv.close(); }
