// tools/chrome-cover.mjs - HOW MANY MARKS ARE UNDER THE INTERFACE: for each scene the page is brought to rest and, for every solid mark, five points of its box (the centre and four quarter points)
// are asked of the browser (document.elementsFromPoint): is an element with an opaque background (more than half) above the map canvas there (the dock, the top bar, a card, the legend pill, the minimap)?
// A mark with every point covered is hidden; with some, partly hidden.  The layout does not know the interface: this measures the cost.
//   node tools/chrome-cover.mjs      -> results/chrome-cover.json
import fs from 'node:fs';
import path from 'node:path';
import { serve, launch, open, settle, ROOT } from './lib.mjs';
const QUIET = { 'popup.event.enabled': false, 'popup.story.enabled': false, 'popup.toast.enabled': false, 'popup.crossout.enabled': false, 'popup.banner.enabled': false, 'popup.hints.enabled': false };
const SC = [['S1b whole field z13.5', 'scene=field&tick=556&zoom=13.5', false], ['S2 Wheatfield z15', 'scene=carry1&tick=295&zoom=15', false], ['S3 Cemetery Hill z15.5', 'scene=carry2&tick=346&zoom=15.5', false], ['S4 z16.5', 'scene=fresh2&tick=556&zoom=16.5', false], ['S5 phone z14.5', 'scene=fresh2&tick=556&zoom=14.5', true]];
const srv = await serve(); const out = [];
try {
  for (const phone of [false, true]) {
    const b = await launch({ width: phone ? 390 : 1440, height: phone ? 844 : 900, dpr: 1, mobile: phone });
    try {
      for (const [name, q, ph] of SC.filter((s) => s[2] === phone)) {
        await open(b.page, `${q}&style=dispatch-paper&set=${encodeURIComponent(JSON.stringify(QUIET))}`); await settle(b.page, 60);
        const r = await b.page.evaluate(() => {
          const S = window.__studio; const f = S.engine.frame; const cv = document.querySelector('canvas'); const cb = cv.getBoundingClientRect(); const W = innerWidth; const H = innerHeight; let marks = 0, hidden = 0, partly = 0; const who = {};
          for (const t of f.tiles) {
            if (t.life !== 'live' || t.opacity < 0.5) continue; const hw = t.w * t.scale / 2; const hh = t.h * t.scale / 2; const cx = t.x + f.view.dx + cb.left; const cy = t.y + f.view.dy + cb.top;
            if (cx + hw < 0 || cx - hw > W || cy + hh < 0 || cy - hh > H) continue;                                    // not on the screen at all
            marks++; let cov = 0; let n = 0; let by = null;
            for (const [px, py] of [[0, 0], [-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]]) { const x = cx + px * hw; const y = cy + py * hh; if (x < 0 || x > W || y < 0 || y > H) continue; n++; const els = document.elementsFromPoint(x, y); let hit = null; for (const e of els) { if (e === cv) break; if (e.tagName === 'HTML' || e.tagName === 'BODY' || e.contains(cv)) continue; const bg = getComputedStyle(e).backgroundColor; const m = /rgba?\(([^)]+)\)/.exec(bg); const a = m ? (m[1].split(',').length > 3 ? +m[1].split(',')[3] : 1) : 0; if (a > 0.5 && e.getBoundingClientRect().width > 4) { hit = e; break; } } if (hit) { cov++; by = by || (hit.closest('[id]') ? hit.closest('[id]').id : hit.className || hit.tagName); } }
            if (n && cov === n) { hidden++; who[by] = (who[by] || 0) + 1; } else if (cov) { partly++; who[by] = (who[by] || 0) + 1; }
          }
          return { marks, hidden, partly, who };
        });
        out.push({ scene: name, ...r }); console.log(name, JSON.stringify(r));
      }
    } finally { await b.close(); }
  }
} finally { srv.close(); }
fs.writeFileSync(path.join(ROOT, 'results', 'chrome-cover.json'), JSON.stringify({ results: out }, null, 1));
