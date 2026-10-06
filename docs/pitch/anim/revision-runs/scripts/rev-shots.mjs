// rev-shots.mjs (revision) - pictures of the prototype at the product's own start zoom (13.5): the three looks, and a SKETCH of the "compact mark" option (a 12 px side-colour mark per unit, nudged up to 48 px with a pin and leader).
// The sketch skin is registered in the page at run time; it is a scratch drawing for this one question, not one of the three pitches.
import { serve, launch, PROTO, args } from './lib.mjs';
const PORT = +(args.port || 9771); const srv = await serve(PROTO, PORT);
const OUT = args.out || 'C:/Users/mlege/gettysburg-map/tmp/pitch-anim/revise/shots/'; import fs from 'node:fs'; fs.mkdirSync(OUT, { recursive: true });
const SHOTS = [
  ['rev-wr-z13.5-t551', 'war-room', {}, 13.5, 551, false], ['rev-fm-z13.5-t551', 'field-manual', {}, 13.5, 551, false], ['rev-m63-z13.5-t551', 'map-1863', {}, 13.5, 551, false],
  ['rev-marks12-dark-z13.5-t551', 'war-room', { 'layout.dMaxPx': 48 }, 13.5, 551, 12], ['rev-marks12-dark-z15-t551', 'war-room', { 'layout.dMaxPx': 48 }, 15, 551, 12], ['rev-marks12-nonudge-z13.5-t551', 'war-room', { 'layout.dMaxPx': 0 }, 13.5, 551, 12],
];
try {
  for (const [name, style, set, zoom, tick, mark] of SHOTS) {
    const s = await launch({ w: 1440, h: 900, dpr: 1, port: PORT, query: 'welcome=0&manual=1', profile: 'shots-' + name });
    try {
      await s.page.evaluate(({ style, set, zoom, tick, mark }) => {
        const S = window.__studio; const E = S.engine; E.tuning.set('popup.enabled', false); E.tuning.set('compare.mode', 'after'); S.ui.chooseStyle(style, 'standard'); for (const [k, v] of Object.entries(set)) E.tuning.set(k, v);
        if (mark) {
          const t2 = JSON.parse(JSON.stringify(E.text.table)); for (const k of Object.keys(t2.fonts.code.adv)) t2.fonts.code.adv[k] = 0; for (const k of Object.keys(t2.fonts.badge.adv)) t2.fonts.badge.adv[k] = 5.5; E.setTextTable(t2, 'zeroed code text (sketch)');
          const COL = { union: '#6fb7ff', confederate: '#ff8147', unknown: '#aab2ba', mixed: '#c9ced4' };
          E.kernel.skins.register('mark-sketch', { label: 'mark sketch', version: '0', footprint: { chipH: mark, chipPadX: 0.5, glyphW: mark - 2, glyphGap: 0.5, chipMinW: mark, ring: 1, badgeGap: 0.5 }, fonts: { code: '700 1px sans-serif', label: '600 12px sans-serif', badge: '700 10px sans-serif' },
            draw: {
              tile(c, t) {
                const w = t.w; const h = t.h; c.fillStyle = 'rgba(8,12,16,0.92)'; c.fillRect(-w / 2, -h / 2, w, h); c.fillStyle = COL[t.side] || COL.unknown; c.fillRect(-w / 2 + 1, -h / 2 + 1, w - 2, h - 2);
                c.strokeStyle = 'rgba(8,12,16,0.9)'; c.lineWidth = 1.4; c.beginPath();
                if (t.kind === 'agg') { c.fillStyle = 'rgba(8,12,16,0.9)'; c.font = '700 9px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(t.n), 0, 0.5); return; }
                if (t.arm === 'cavalry') { c.moveTo(-w / 2 + 3, h / 2 - 3); c.lineTo(w / 2 - 3, -h / 2 + 3); c.stroke(); }
                else if (t.arm === 'artillery') { c.fillStyle = 'rgba(8,12,16,0.9)'; c.beginPath(); c.arc(0, 0, 1.8, 0, 6.3); c.fill(); }
                else { c.moveTo(-w / 2 + 3, -h / 2 + 3); c.lineTo(w / 2 - 3, h / 2 - 3); c.moveTo(w / 2 - 3, -h / 2 + 3); c.lineTo(-w / 2 + 3, h / 2 - 3); c.stroke(); }
              },
              pin(c) { c.fillStyle = '#ffffff'; c.beginPath(); c.arc(0, 0, 1.4, 0, 6.3); c.fill(); },
              leader(c, t, env, a, b) { c.strokeStyle = 'rgba(220,226,232,0.55)'; c.lineWidth = 1; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); },
            } });
          E.tuning.set('skin.id', 'mark-sketch');
        }
        E.select(null); E.transport.pause(); E.transport.seek(tick, { glide: false }); E.moveTo({ lat: 39.81592, lng: -77.23677, zoom }, { glide: false, safe: false });
        let last = -1; let still = 0; for (let i = 0; i < 400; i++) { const f = S.step(1); if (!E.busy() && f.tiles.length === last) { if (++still >= 4) break; } else still = 0; last = f.tiles.length; }
      }, { style, set, zoom, tick, mark });
      await s.page.waitForTimeout(500);
      await s.page.screenshot({ path: OUT + name + '.png' });
      const info = await s.page.evaluate(() => { const f = window.__studio.engine.frame; const live = f.tiles.filter((t) => t.life === 'live'); return { tiles: live.length, units: live.reduce((a, t) => a + t.ids.length, 0), agg: live.filter((t) => t.kind === 'agg').length, unitsInAgg: live.filter((t) => t.kind === 'agg').reduce((a, t) => a + t.ids.length, 0), displaced: live.filter((t) => t.displaced).length }; });
      console.log(name, JSON.stringify(info));
    } finally { await s.close(); }
  }
} finally { srv.close(); }
