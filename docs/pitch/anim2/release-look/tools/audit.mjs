// tools/audit.mjs - MEASURES the look of one option, on the page as it renders in real Chrome (DPR 2):
//   1. lettering contrast read from RENDERED PIXELS: every lettering sprite the renderer blits in a scene (unit codes, names, formation words, the numerals in flags) is located on the canvas; its ink pixels (opaque,
//      not the halo colour) give the ink luminance, the pixels next to the ink (halo over ground, or the cloth under a numeral) give the background; contrast = WCAG ratio ink : each neighbouring pixel.
//      Reported per scene: labels measured, the share whose MEDIAN neighbour reaches 4.5:1, the share whose 10th-percentile (worst) neighbour reaches 4.5:1, the worst label.
//   2. text size: the canvas font table (layout/text.mjs FONT_SPECS), the sprite heights, and every visible DOM text of the interface in several states (computed font-size): the minimum and the distinct sizes.
//   3. marks against the ground (3:1) and the two sides apart (CIEDE2000 under colour-vision simulation, greyscale ratio): analytic from the token file over the ground bands the page's own backdrop renders (7 percentiles
//      x 5 views), for the standard, colour-blind-safe and high-contrast token sets.
//   node tools/audit.mjs --opt=a|b
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { open, setScene, args, D1, stopServer } from './lib.mjs';
import { contrast, over, deltaE, simulate, luminance, rgbToHex } from '../../symbology/src/colour.mjs';

const OPT = args.opt || 'a'; process.env.LOOK_PAGE = OPT === 'a' ? 'option-a-standards.html' : 'option-b-glyph.html'; const STYLE = OPT === 'a' ? 'standards' : 'glyph';
const SCENES = [
  { id: 's1a z13.5 t295', tick: 295, lat: 39.81592, lng: -77.23677, zoom: 13.5, shift: [6, 96] }, { id: 's1b z13.5 t556', tick: 556, lat: 39.81592, lng: -77.23677, zoom: 13.5, shift: [6, 96] },
  { id: 's2 z15 t295', tick: 295, lat: 39.7992, lng: -77.2414, zoom: 15, shift: [84, -96] }, { id: 's3 z15.5 t346', tick: 346, lat: 39.8189, lng: -77.2262, zoom: 15.5, shift: [-210, -18] },
  { id: 's4 z16.5 t551', tick: 551, lat: 39.8117, lng: -77.2347, zoom: 16.5, shift: [102, 6] }, { id: 'z12.5 t226', tick: 226, lat: 39.8117, lng: -77.2347, zoom: 12.5, shift: [0, 0] },
];
const PCT = [0.01, 0.05, 0.25, 0.5, 0.75, 0.95, 0.99];
const out = { generated: new Date().toISOString(), option: OPT, method: 'see the header of tools/audit.mjs', scenes: [], dom: [], bands: {} };

const s = await open({ dpr: 2, profile: 'audit' + OPT });
try {
  for (const sc of SCENES) {
    await setScene(s.page, { tick: sc.tick, lat: sc.lat, lng: sc.lng, zoom: sc.zoom, safe: true, shift: sc.shift, popups: false, style: STYLE, steps: 120 });
    await s.page.evaluate(() => globalThis.__ground.whenIdle(20000)); await s.page.evaluate(() => globalThis.__advance(30));
    if (args.nofringe) await s.page.evaluate(() => { window.__nofringe = true; });
    const r = await s.page.evaluate(async () => {
      const S = window.__studio; const cv = document.getElementById('map'); const ctx = cv.getContext('2d'); const log = []; const orig = CanvasRenderingContext2D.prototype.drawImage;
      CanvasRenderingContext2D.prototype.drawImage = function (img, ...a) {
        if (this === ctx && (img instanceof OffscreenCanvas || img instanceof HTMLCanvasElement) && img.height >= 12 && img.height <= 80 && img.width <= 1400) { const m = this.getTransform(); if (a.length === 4 || a.length === 2) { const dx = a[0]; const dy = a[1]; const w = a.length === 4 ? a[2] : img.width; const h = a.length === 4 ? a[3] : img.height; log.push({ img, x: m.a * dx + m.e, y: m.d * dy + m.f, w: m.a * w, h: m.d * h, alpha: this.globalAlpha }); } }
        return orig.call(this, img, ...a);
      };
      S.engine.dirty = true; S.step(1, 16.667); CanvasRenderingContext2D.prototype.drawImage = orig;
      const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; const L = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
      const res = []; const W = cv.width; const H = cv.height;
      for (const e of log) {
        if (e.alpha < 0.95) continue; const sp = e.img.getContext('2d').getImageData(0, 0, e.img.width, e.img.height); const X = Math.round(e.x); const Y = Math.round(e.y); if (X < 0 || Y < 0 || X + sp.width > W || Y + sp.height > H) continue;
        const dst = ctx.getImageData(X, Y, sp.width, sp.height); const n = sp.width * sp.height; const ink = new Uint8Array(n); let haloR = 0; let haloG = 0; let haloB = 0; let hn = 0;
        for (let i = 0; i < n; i++) { const a = sp.data[i * 4 + 3]; if (a > 0 && a < 250) { haloR += sp.data[i * 4]; haloG += sp.data[i * 4 + 1]; haloB += sp.data[i * 4 + 2]; hn++; } }
        const hr = hn ? haloR / hn : -999; const hg = hn ? haloG / hn : -999; const hb = hn ? haloB / hn : -999;
        for (let i = 0; i < n; i++) { const a = sp.data[i * 4 + 3]; if (a >= 250 && (hn === 0 || Math.abs(sp.data[i * 4] - hr) + Math.abs(sp.data[i * 4 + 1] - hg) + Math.abs(sp.data[i * 4 + 2] - hb) > 90)) ink[i] = 1; }
        if (e.img._cloth && !window.__nofringe) {      // (--nofringe: the director-r1 method, for comparison) a count or code ON the cloth: the letters' own anti-aliased fringe (partly transparent pixels of the ink colour over the soft halo) belongs to the ink, not to the background it is measured against (director fix 7: the first method counted it as background)
          let cr = 0; let cg = 0; let cb = 0; let cn = 0; for (let i = 0; i < n; i++) if (ink[i]) { cr += sp.data[i * 4]; cg += sp.data[i * 4 + 1]; cb += sp.data[i * 4 + 2]; cn++; }
          if (cn) { cr /= cn; cg /= cn; cb /= cn; for (let i = 0; i < n; i++) if (!ink[i] && sp.data[i * 4 + 3] >= 40 && Math.abs(sp.data[i * 4] - cr) + Math.abs(sp.data[i * 4 + 1] - cg) + Math.abs(sp.data[i * 4 + 2] - cb) < 130) ink[i] = 1; }
        }
        const il = []; let inkN = 0; for (let i = 0; i < n; i++) if (ink[i]) { il.push(L(dst.data[i * 4], dst.data[i * 4 + 1], dst.data[i * 4 + 2])); inkN++; } if (inkN < 8) continue; il.sort((a, b) => a - b); const Li = il[il.length >> 1];
        const bgs = []; const w = sp.width; const h = sp.height; const within = (x, y, r) => { for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const xx = x + dx; const yy = y + dy; if (xx >= 0 && yy >= 0 && xx < w && yy < h && ink[yy * w + xx]) return true; } return false; };
        for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) { const i = y * w + x; if (ink[i] || within(x, y, 1)) continue; if (within(x, y, 3)) bgs.push(L(dst.data[i * 4], dst.data[i * 4 + 1], dst.data[i * 4 + 2])); }      // the ring 2 to 3 device px from the ink: outside the anti-aliased edge, inside the halo
        if (bgs.length < 8) continue; const ratios = bgs.map((b) => (Math.max(Li, b) + 0.05) / (Math.min(Li, b) + 0.05)).sort((a, b) => a - b);
        let ir = 0; let ig = 0; let ib = 0; let ic = 0; for (let i = 0; i < n; i++) if (ink[i]) { ir += dst.data[i * 4]; ig += dst.data[i * 4 + 1]; ib += dst.data[i * 4 + 2]; ic++; } const inkHex = '#' + [ir / ic, ig / ic, ib / ic].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
        res.push({ cloth: !!e.img._cloth, ink: inkHex, wCss: Math.round(e.img.width / 2), h: Math.round(e.img.height / (cv.width / cv.clientWidth)), med: +ratios[ratios.length >> 1].toFixed(2), p10: +ratios[Math.floor(ratios.length * 0.1)].toFixed(2), min: +ratios[0].toFixed(2) });
      }
      return res;
    });
    const n = r.length; const med = r.map((x) => x.med).sort((a, b) => a - b); const p10 = r.map((x) => x.p10).sort((a, b) => a - b);
    const cl = r.filter((x) => x.cloth); const hl = r.filter((x) => !x.cloth); const share = (a, k) => +(a.filter((x) => x[k] >= 4.5).length / Math.max(1, a.length)).toFixed(3); const split = { haloed: { n: hl.length, shareMedian: share(hl, 'med'), shareP10: share(hl, 'p10'), worstMedian: Math.min(...hl.map((x) => x.med)), worstP10: Math.min(...hl.map((x) => x.p10)) }, onCloth: { n: cl.length, shareMedian: share(cl, 'med'), shareP10: share(cl, 'p10'), worstMedian: cl.length ? Math.min(...cl.map((x) => x.med)) : null, worstP10: cl.length ? Math.min(...cl.map((x) => x.p10)) : null } }; const worstLabels = r.slice().sort((a, b) => a.med - b.med).slice(0, 3).map((x) => ({ ink: x.ink, med: x.med, p10: x.p10, wCss: x.wCss })); const row = { scene: sc.id, labels: n, split, worstLabels, medianOfMedians: med[n >> 1], worstMedian: med[0], shareMedianAbove4_5: +(r.filter((x) => x.med >= 4.5).length / Math.max(1, n)).toFixed(3), shareP10Above4_5: +(r.filter((x) => x.p10 >= 4.5).length / Math.max(1, n)).toFixed(3), worstP10: p10[0], spriteHeightsCss: [...new Set(r.map((x) => x.h))].sort((a, b) => a - b) };
    out.scenes.push(row); console.log(JSON.stringify(row));
    // the DOM text of the interface in this state
    const dom = await s.page.evaluate(() => { const sizes = {}; let min = 99; const walk = document.createTreeWalker(document.getElementById('app'), NodeFilter.SHOW_TEXT); let nd; while ((nd = walk.nextNode())) { const t = nd.textContent.trim(); if (!t) continue; const el = nd.parentElement; const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.05) continue; const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) continue; const f = parseFloat(cs.fontSize); sizes[f] = (sizes[f] || 0) + 1; if (f < min) min = f; } return { min, sizes }; });
    out.dom.push({ scene: sc.id, ...dom });
  }
  // popups open: legend, unit card, event card
  for (const [name, js, tick, zoom, lat, lng] of [['legend', "S.host.toggleDoc('legend:doc'); adv(120);", 60, 14.5, 39.8278, -77.2528], ['unit card', "E.select('U-82NY'); S.host.setSelected('U-82NY'); adv(90);", 551, 16.5, 39.8117, -77.2347], ['event + story', 'adv(120);', 28, 14.5, 39.8278, -77.2528]]) {
    await setScene(s.page, { tick, lat, lng, zoom, safe: true, popups: true, style: STYLE, steps: 120 }); await s.page.evaluate(`(async () => { const S = window.__studio; const E = S.engine; const adv = globalThis.__advance; ${js} })()`);
    const dom = await s.page.evaluate(() => { const sizes = {}; let min = 99; const walk = document.createTreeWalker(document.getElementById('app'), NodeFilter.SHOW_TEXT); let nd; while ((nd = walk.nextNode())) { const t = nd.textContent.trim(); if (!t) continue; const el = nd.parentElement; const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.05) continue; const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) continue; const f = parseFloat(cs.fontSize); sizes[f] = (sizes[f] || 0) + 1; if (f < min) min = f; } return { min, sizes }; });
    out.dom.push({ scene: name, ...dom }); console.log(name, JSON.stringify(dom));
  }
  // the ground bands (the page's own backdrop, rendered offscreen at 5 views)
  const VIEWS = [{ id: 'field-z13.5', tick: 551, lat: 39.81592, lng: -77.23677, zoom: 13.5 }, { id: 'angle-z15', tick: 556, lat: 39.8117, lng: -77.2347, zoom: 15 }, { id: 'wheatfield-z15', tick: 295, lat: 39.7992, lng: -77.2414, zoom: 15 }, { id: 'cemetery-hill-z15.5', tick: 346, lat: 39.8189, lng: -77.2262, zoom: 15.5 }, { id: 'three-days-z12.5', tick: 226, lat: 39.8117, lng: -77.2347, zoom: 12.5 }];
  for (const v of VIEWS) {
    await setScene(s.page, { tick: v.tick, lat: v.lat, lng: v.lng, zoom: v.zoom, safe: false, steps: 30, style: STYLE });
    const px = await s.page.evaluate(async ({ PCT }) => {
      const S = window.__studio; const E = S.engine; const bd = E.kernel.backdrops.get(E.tok('backdrop.id')); const W = 1440; const H = 900; const draw = () => { const cv = new OffscreenCanvas(W, H); const c = cv.getContext('2d'); bd.draw(c, { w: W, h: H, camera: E.camera, mpp: E.camera.mpp(), toScreen: (lng, lat) => E.camera.toScreen(lng, lat) }, null, E.tok); return c.getImageData(0, 0, W, H).data; };
      await globalThis.__ground.whenIdle(20000); draw(); await globalThis.__ground.whenIdle(20000); const d = draw();
      const Ls = []; for (let i = 0; i < d.length; i += 4 * 13) Ls.push([0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2], d[i], d[i + 1], d[i + 2]]); Ls.sort((a, b) => a[0] - b[0]);
      return PCT.map((p) => { const k = Math.floor(p * (Ls.length - 1)); const lo = Math.max(0, k - Math.floor(Ls.length * 0.004)); const hi = Math.min(Ls.length - 1, k + Math.floor(Ls.length * 0.004)); let r = 0; let g = 0; let b = 0; let n = 0; for (let j = lo; j <= hi; j++) { r += Ls[j][1]; g += Ls[j][2]; b += Ls[j][3]; n++; } return [Math.round(r / n), Math.round(g / n), Math.round(b / n)]; });
    }, { PCT });
    out.bands[v.id] = px.map((c) => rgbToHex(c)); console.log('bands', v.id);
  }
} finally { await s.close(); await stopServer(); }

// ---- the analytic tests on the token file ------------------------------------------------------------------------------------------------------------------------------------------
const spec = await import(pathToFileURL(path.join(D1, 'src', 'skins', OPT === 'a' ? 'standards.spec.mjs' : 'glyph.spec.mjs')).href);
const ROWS = OPT === 'a' ? spec.STD_TOKENS : spec.GLY_TOKENS; const VARS = OPT === 'a' ? spec.STD_VARIANTS : spec.GLY_VARIANTS; const P0 = Object.fromEntries(ROWS.map((r) => [r[0], r[1]]));
const SETS = { standard: P0, cvd: { ...P0, ...VARS.cvd.set }, contrast: { ...P0, ...VARS.contrast.set } }; out.skins = {}; let fails = 0;
for (const [sid, P] of Object.entries(SETS)) {
  const worst = { mark: { ratio: 99 }, text: { ratio: 99 } }; const bands = Object.entries(out.bands);
  for (const [vid, list] of bands) for (let bi = 0; bi < list.length; bi++) {
    const G = list[bi];
    // marks: the outermost ink of a mark is a light and a dark line; the mark holds when either of the two stands 3:1 off the ground
    let light; let dark; let name;
    if (OPT === 'a') { light = contrast(P['color.edge'], G); dark = contrast(over(P['color.poleEdge'], P['pole.edgeAlpha'], G), G); name = 'pole and flag edge'; } else { light = contrast(over(P['color.paper'], 0.95, G), G); dark = contrast(P['color.outline'], G); name = 'glyph under-edge and outline'; }
    const sep = Math.max(light, dark); if (sep < worst.mark.ratio) Object.assign(worst.mark, { ratio: +sep.toFixed(2), name, light: +light.toFixed(2), dark: +dark.toFixed(2), view: vid, band: PCT[bi], ground: G });
    // text: ink over the halo over the ground (the halo covers the pixel next to a glyph with both strokes)
    const haloCov = 1 - (1 - P['halo.soft']) * (1 - P['halo.alpha']); const E = over(P['color.halo'], haloCov, G);
    for (const [name2, ink] of [['code', P['color.ink']], ['tint union', P['color.tintUnion']], ['tint confederate', P['color.tintConfederate']], ['tint unknown', P['color.tintUnknown']], ['tint mixed', P['color.tintMixed']]]) { const r = contrast(ink, E); if (r < worst.text.ratio) Object.assign(worst.text, { ratio: +r.toFixed(2), name: name2, view: vid, band: PCT[bi], ground: G }); }
  }
  // the numeral inside a crowd flag or glyph (white on the cloth or the body)
  const numBg = OPT === 'a' ? [['union', P['color.union']], ['confederate', P['color.confederate']]] : [['union', P['color.union']], ['confederate', P['color.confederate']]]; const numInk = OPT === 'a' ? P['color.numeral'] : P['color.inner'];
  const num = Math.min(...numBg.map(([, bg]) => contrast(numInk, bg))); if (num < worst.text.ratio) Object.assign(worst.text, { ratio: +num.toFixed(2), name: 'numeral on the cloth or body', view: 'n/a', band: 0, ground: 'n/a' });
  const U = P['color.union']; const C = P['color.confederate']; const dE = {}; for (const t of ['normal', 'protanopia', 'deuteranopia', 'tritanopia']) dE[t] = +deltaE(simulate(U, t), simulate(C, t)).toFixed(1);
  const lu = luminance(U); const lc = luminance(C); const grey = +((Math.max(lu, lc) + 0.05) / (Math.min(lu, lc) + 0.05)).toFixed(2);
  const verdict = { text: worst.text.ratio >= 4.5, marks: worst.mark.ratio >= 3, sides: Math.min(...Object.values(dE)) >= 20 }; for (const v of Object.values(verdict)) if (!v) fails++;
  out.skins[sid] = { worstText: worst.text, worstMark: worst.mark, deltaE2000UnionVsConfederate: dE, greyscaleLuminanceRatio: grey, secondCueForGreyscale: OPT === 'a' ? 'flag flies right (Union) or left (Confederate)' : 'disc (Union) or rounded square (Confederate)', verdict };
  console.log(sid.padEnd(9), 'text', worst.text.ratio, `(${worst.text.name})`, '| mark', worst.mark.ratio, `(light ${worst.mark.light}, dark ${worst.mark.dark}; ${worst.mark.view} p${Math.round(worst.mark.band * 100)})`, '| dE', Math.min(...Object.values(dE)), 'grey', grey, JSON.stringify(verdict));
}
out.analyticFails = fails; fs.mkdirSync(path.join(D1, 'results'), { recursive: true }); fs.writeFileSync(path.join(D1, 'results', `audit-${OPT}${args.nofringe ? "-nofringe" : ""}.json`), JSON.stringify(out, null, 1)); console.log('analytic fails', fails);
