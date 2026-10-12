// tools/audit-dom.mjs - the type and contrast audit of everything the page draws as DOM (top bar, dock, panel, menu, narration and all popups), in real Chrome, for both grounds:
//   * the smallest font size of any element that carries text (the rule: 11 px at 1x for anything that must be read);
//   * the contrast of every text element against its effective background (the element's own or the nearest ancestor's background composited over the map pixels behind it: the map is sampled
//     from the real screenshot), reported as the worst ratio and the elements below 4.5:1 (text) ;
//   * the radii in use (the rule: 6 px for a control, 10 px for a surface, a pill only for the Chronicle chips) and the font families in use.
//   node tools/audit-dom.mjs [--out=results/dom-audit.json]
import fs from 'node:fs';
import path from 'node:path';
import { open, setScene, args, D1, stopServer } from './lib.mjs';

const HERBST = [39.8278, -77.2528]; const ANGLE = [39.8117, -77.2347];
const STATES = [
  { id: 'night-popups', style: 'night', tick: 28, at: HERBST, zoom: 14.5, popups: true },
  { id: 'night-unit-card', style: 'night', tick: 40, at: HERBST, zoom: 15, popups: true, js: `E.select('U-I-1-1'); S.host.setSelected('U-I-1-1'); adv(60); S.host.openRail('unit-card:sel-U-I-1-1'); adv(60);` },
  { id: 'night-tune', style: 'night', tick: 551, at: ANGLE, zoom: 15, popups: false, js: `S.ui.togglePanel('tune'); adv(20);` },
  { id: 'night-about-legend', style: 'night', tick: 551, at: ANGLE, zoom: 15, popups: true, js: `S.ui.togglePanel('about'); S.host.act('legend:legend', 'toggle'); adv(80);` },
  { id: 'night-narration', style: 'night', tick: 551, at: ANGLE, zoom: 15, popups: false, js: `S.startTour('showcase'); adv(200); S.ui.toggleMenu();` },
  { id: 'day-popups', style: 'day', tick: 28, at: HERBST, zoom: 14.5, popups: true },
  { id: 'day-unit-card', style: 'day', tick: 40, at: HERBST, zoom: 15, popups: true, js: `E.select('U-I-1-1'); S.host.setSelected('U-I-1-1'); adv(60); S.host.openRail('unit-card:sel-U-I-1-1'); adv(60);` },
  { id: 'day-about-legend', style: 'day', tick: 551, at: ANGLE, zoom: 15, popups: true, js: `S.ui.togglePanel('about'); S.host.act('legend:legend', 'toggle'); adv(80);` },
];
const AUDIT = `(() => {
  const lum = (r, g, b) => { const f = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const parse = (s) => { const m = /rgba?\\(([^)]+)\\)/.exec(s); if (!m) return null; const p = m[1].split(/[ ,\\/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const over = (top, bot) => ({ r: top.r * top.a + bot.r * (1 - top.a), g: top.g * top.a + bot.g * (1 - top.a), b: top.b * top.a + bot.b * (1 - top.a), a: 1 });
  const out = { sizes: {}, small: [], radii: {}, families: {}, texts: [] };
  const els = [...document.querySelectorAll('#app *')].filter((e) => { const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return false; const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return false; if (!(e.childNodes && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()))) return false; if (e.closest('#pop-measure,#pop-live,.hidden,[hidden]')) return false; return true; });
  for (const e of els) {
    const cs = getComputedStyle(e); const px = parseFloat(cs.fontSize); const key = px.toFixed(1); out.sizes[key] = (out.sizes[key] || 0) + 1; out.families[cs.fontFamily.split(',')[0].trim()] = (out.families[cs.fontFamily.split(',')[0].trim()] || 0) + 1;
    const txt = [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(' ').slice(0, 40);
    const cls = e.className && e.className.baseVal === undefined ? String(e.className).split(' ')[0] : e.tagName.toLowerCase();
    if (px < 10.95) out.small.push({ cls, px, txt });
    // effective background: walk up until an opaque-ish background is found, compositing the translucent ones, finally over a map sample (passed in as window.__mapRGB)
    let chain = []; for (let n = e; n && n !== document.body; n = n.parentElement) { const b = parse(getComputedStyle(n).backgroundColor); if (b && b.a > 0.01) chain.push(b); if (b && b.a > 0.99) break; }
    let bg = window.__mapRGB ? { ...window.__mapRGB, a: 1 } : { r: 128, g: 128, b: 128, a: 1 }; for (const b of chain.reverse()) bg = over(b, bg);
    const fg = parse(cs.color); if (!fg) continue; const fgc = over(fg, bg); const L1 = lum(fgc.r, fgc.g, fgc.b); const L2 = lum(bg.r, bg.g, bg.b); const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    out.texts.push({ cls, txt, px, ratio: +ratio.toFixed(2) });
  }
  for (const e of document.querySelectorAll('#app .pc, #app .btn, #app .tbtn, #app .pop-chip, #app .pop-strip-btn, #app .pc-act, #app .seg, #app .menu, #app #dock, #app #panel, #app .nar, #app .pop-rail, #app .glass')) { const r = getComputedStyle(e).borderTopLeftRadius; out.radii[r] = (out.radii[r] || 0) + 1; }
  return out;
})()`;
const rows = [];
for (const st of STATES) {
  const s = await open({ dpr: 1, profile: 'audit' });
  try {
    await setScene(s.page, { tick: st.tick, lat: st.at[0], lng: st.at[1], zoom: st.zoom, safe: true, popups: st.popups, style: st.style, steps: 100 });
    if (st.js) await s.page.evaluate(`(async () => { const S = window.__studio; const E = S.engine; const adv = globalThis.__advance; ${st.js} })()`);
    await s.page.evaluate(() => globalThis.__ground.whenIdle(20000)); await s.page.evaluate(() => globalThis.__advance(20));
    // the worst map background behind a surface: the surfaces are translucent glass, so audit against the brightest and the darkest 5 % of the map pixels (read from the canvas)
    const bands = await s.page.evaluate(() => { const c = document.getElementById('map'); const g = c.getContext('2d'); const d = g.getImageData(0, 0, c.width, c.height).data; const L = []; for (let i = 0; i < d.length; i += 4 * 97) L.push([0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2], d[i], d[i + 1], d[i + 2]]); L.sort((a, b) => a[0] - b[0]); const at = (p) => L[Math.min(L.length - 1, Math.floor(p * L.length))]; return { dark: at(0.05).slice(1), mid: at(0.5).slice(1), bright: at(0.95).slice(1) }; });
    const res = {};
    for (const [band, rgb] of Object.entries(bands)) { await s.page.evaluate((rgb) => { window.__mapRGB = { r: rgb[0], g: rgb[1], b: rgb[2] }; }, rgb); res[band] = await s.page.evaluate(AUDIT); }
    const worst = Object.fromEntries(Object.entries(res).map(([k, v]) => [k, v.texts.reduce((m, t) => (t.ratio < m.ratio ? t : m), { ratio: 99 })]));
    const below = {}; for (const [k, v] of Object.entries(res)) below[k] = v.texts.filter((t) => t.ratio < 4.5).map((t) => `${t.cls} "${t.txt}" ${t.ratio}`).slice(0, 12);
    rows.push({ id: st.id, bands, sizesMid: res.mid.sizes, small: res.mid.small, families: res.mid.families, radii: res.mid.radii, textsChecked: res.mid.texts.length, worst, below });
    console.log(st.id, 'texts', res.mid.texts.length, 'smallest px', Math.min(...Object.keys(res.mid.sizes).map(Number)), 'worst ratio per band', JSON.stringify(Object.fromEntries(Object.entries(worst).map(([k, v]) => [k, v.ratio]))), 'below 4.5:', JSON.stringify(Object.fromEntries(Object.entries(below).map(([k, v]) => [k, v.length]))));
  } finally { await s.close(); }
}
await stopServer();
fs.mkdirSync(path.join(D1, 'results'), { recursive: true }); fs.writeFileSync(path.resolve(args.out || path.join(D1, 'results', 'dom-audit.json')), JSON.stringify(rows, null, 1));
