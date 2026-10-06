// v8b-dim-contrast.mjs - how legible is the text of a DIMMED (travelling, opacity about 0.42) tile?  Manual mode, The Angle at 4x, the frame is re-drawn with background sampling on; contrast of each
// string = WCAG ratio between the string's colour (fill alpha x canvas alpha over the sampled background) and that background.
import { serve, launch, PROTO, args, writeJson } from './lib.mjs';
import { SCENES } from './scenes.mjs';
const srv = await serve(PROTO, +(args.port || 9712)); const s = await launch({ port: +(args.port || 9712), query: 'welcome=0&manual=1', witness: true, profile: 'dimc' });
const parse = (c) => { let m = /^#([0-9a-f]{6})$/i.exec(c); if (m) return { c: [parseInt(m[1].slice(0, 2), 16), parseInt(m[1].slice(2, 4), 16), parseInt(m[1].slice(4, 6), 16)], a: 1 }; m = /^rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)(?:[ ,/]+([\d.]+))?\s*\)$/i.exec(c); return m ? { c: [+m[1], +m[2], +m[3]], a: m[4] === undefined ? 1 : +m[4] } : null; };
const lum = (c) => { const f = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
const ratio = (a, b) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
const res = {};
try {
  for (const style of ['war-room', 'field-manual', 'map-1863']) {
    const r = await s.page.evaluate(({ sc, style }) => {
      const S = window.__studio; const E = S.engine; const R = window.__rec; const W = window.__witness; R.install({ dom: [] }); E.tuning.set('popup.enabled', false); S.ui.chooseStyle(style, 'standard'); E.transport.pause(); E.select(null); E.transport.seek(sc.tick, { glide: false }); E.moveTo({ lat: sc.lat, lng: sc.lng, zoom: sc.zoom }, { glide: false, safe: true }); for (let i = 0; i < 260; i++) S.step(1); E.transport.setSpeed(4); E.transport.play();
      const out = []; let dimFrames = 0;
      for (let i = 0; i < 900 && out.length < 400; i++) { const f = S.step(1, 16.667); const dim = f.tiles.filter((t) => t.opacity >= 0.3 && t.opacity < 0.5 && !t.entering && t.life === 'live'); if (!dim.length || i % 7) continue; dimFrames++; W.bgSamples.length = 0; W.sampleBg = true; W.full = false; W.begin(); R.od.call(S.renderer, R.lastFrame, R.lastOpts); W.end(); W.sampleBg = false;
        for (const q of W.bgSamples) if (q.alpha < 0.5 && q.alpha > 0.2) out.push({ text: q.text.slice(0, 16), fill: q.fill, alpha: q.alpha, bg: q.bg, ep: q.ep, box: q.box }); }
      return { out, dimFrames };
    }, { sc: SCENES['the-angle'], style });
    const rows = []; const grouped = new Map(); const rat = (q) => { const f = parse(q.fill); if (!f) return -1; const a = f.a * q.alpha; const eff = f.c.map((x, i) => x * a + q.bg[i] * (1 - a)); return ratio(eff, q.bg); };
    for (const q of r.out) { const k = q.text + '|' + Math.round(q.box[0] / 3) + '|' + Math.round(q.box[1] / 3); const c = grouped.get(k); if (!c || rat(q) > rat(c)) grouped.set(k, q); }
    for (const q of grouped.values()) { const x = rat(q); if (x > 0) rows.push(x); } rows.sort((a, b) => a - b);
    res[style] = { dimFramesSampled: r.dimFrames, strings: rows.length, median: rows.length ? +rows[Math.floor(rows.length / 2)].toFixed(2) : null, p10: rows.length ? +rows[Math.floor(rows.length * 0.1)].toFixed(2) : null, min: rows.length ? +rows[0].toFixed(2) : null, below45: rows.filter((x) => x < 4.5).length, below3: rows.filter((x) => x < 3).length };
    console.log(style, JSON.stringify(res[style]));
  }
  writeJson('v8b-dim-contrast.json', res);
} finally { await s.close(); srv.close(); }
