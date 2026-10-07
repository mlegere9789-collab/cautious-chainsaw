// tools/contrast.mjs - THE COLOUR TESTS of the Quiet Cartographer, on the real ground.
//   1. The ground is rendered by the page's own backdrop code (no marks) for four real views per ground (opening field z13.5, The Angle z15, Wheatfield z15, Cemetery Hill z15.5, and the 3-day field at
//      z12.5), and its pixel luminance is read at the 1st, 5th, 25th, 50th, 75th, 95th and 99th percentile: the brightest and darkest places a mark will ever sit on.
//   2. Lettering (unit codes, names, formation names, tinted by side, dimmed when carried forward) is tested against its OWN halo composited over every band: the halo is what the letters sit on
//      (stroke 3.2 px at 82 %, then a wider soft one), so the contrast that matters is letter ink against halo-over-ground.  Bar: 4.5:1 (WCAG 1.4.3 applied to the map's lettering).
//   3. Marks (the pip ring against the dark hairline over ground; the side colour of a carried-forward pip's ring and of a flag against that hairline) are tested as non-text: 3:1 (WCAG 1.4.11).
//   4. The two sides are tested apart: CIEDE2000 between the Union and Confederate colours under normal vision, protanopia, deuteranopia and tritanopia (Machado 2009 matrices, via the symbology
//      job's colour module), and the luminance ratio (greyscale).  Bar: 20 (the project's own bar; a number of this project, not of WCAG).
//   node tools/contrast.mjs  -> results/contrast.json
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { open, setScene, args, D1, stopServer } from './lib.mjs';
import { QC_TOKENS, QC_DAY, QC_NIGHT_VARIANTS, QC_DAY_VARIANTS } from '../src/skins/quiet-cartographer.spec.mjs';
import { contrast, over, mix, deltaE, simulate, luminance, hexToRgb, rgbToHex } from '../../symbology/src/colour.mjs';

const VIEWS = [
  { id: 'field-z13.5', tick: 551, lat: 39.81592, lng: -77.23677, zoom: 13.5 }, { id: 'angle-z15', tick: 556, lat: 39.8117, lng: -77.2347, zoom: 15 },
  { id: 'wheatfield-z15', tick: 295, lat: 39.7992, lng: -77.2414, zoom: 15 }, { id: 'cemetery-hill-z15.5', tick: 346, lat: 39.8189, lng: -77.2262, zoom: 15.5 }, { id: 'three-days-z12.5', tick: 226, lat: 39.8117, lng: -77.2347, zoom: 12.5 },
];
const PCT = [0.01, 0.05, 0.25, 0.5, 0.75, 0.95, 0.99];
const bandsOf = {};                                                                      // ground id -> view id -> [hex x 7]
const s = await open({ dpr: 1, profile: 'contrast' });
try {
  for (const gid of ['qc-night', 'qc-day']) {
    await s.page.evaluate((id) => window.__studio.engine.tuning.set('backdrop.id', id), gid); bandsOf[gid] = {};
    for (const v of VIEWS) {
      await setScene(s.page, { tick: v.tick, lat: v.lat, lng: v.lng, zoom: v.zoom, safe: false, steps: 30 });
      const px = await s.page.evaluate(async ({ id, PCT }) => {
        const S = window.__studio; const E = S.engine; const bd = E.kernel.backdrops.get(id); const W = 1440; const H = 900; const draw = () => { const cv = new OffscreenCanvas(W, H); const c = cv.getContext('2d'); bd.draw(c, { w: W, h: H, camera: E.camera, mpp: E.camera.mpp(), toScreen: (lng, lat) => E.camera.toScreen(lng, lat) }, null, E.tok); return c.getImageData(0, 0, W, H).data; };
        await globalThis.__ground.whenIdle(20000); draw(); await globalThis.__ground.whenIdle(20000); const d = draw();
        const L = []; for (let i = 0; i < d.length; i += 4 * 13) L.push([0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2], d[i], d[i + 1], d[i + 2]]); L.sort((a, b) => a[0] - b[0]);
        return PCT.map((p) => { const k = Math.floor(p * (L.length - 1)); const lo = Math.max(0, k - Math.floor(L.length * 0.004)); const hi = Math.min(L.length - 1, k + Math.floor(L.length * 0.004)); let r = 0; let g = 0; let b = 0; let n = 0; for (let j = lo; j <= hi; j++) { r += L[j][1]; g += L[j][2]; b += L[j][3]; n++; } return [Math.round(r / n), Math.round(g / n), Math.round(b / n)]; });
      }, { id: gid, PCT });
      bandsOf[gid][v.id] = px.map((c) => rgbToHex(c));
    }
  }
} finally { await s.close(); await stopServer(); }

// ---- the tests ----------------------------------------------------------------------------------------------------------------------------------------------------------------
const table = (rows) => Object.fromEntries(rows.map((r) => [r[0], r[1]]));
const P0 = table(QC_TOKENS);
const SKINS = { 'night': P0, 'night/cvd': { ...P0, ...QC_NIGHT_VARIANTS.cvd.set }, 'night/contrast': { ...P0, ...QC_NIGHT_VARIANTS.contrast.set }, 'day': { ...P0, ...QC_DAY }, 'day/cvd': { ...P0, ...QC_DAY, ...QC_DAY_VARIANTS.cvd.set }, 'day/contrast': { ...P0, ...QC_DAY, ...QC_DAY_VARIANTS.contrast.set } };
const ground = (skinId) => (skinId.startsWith('day') ? 'qc-day' : 'qc-night');
const out = { generated: new Date().toISOString(), method: 'ground bands read from the page\'s own backdrop render; marks tested against halo-over-ground', bands: bandsOf, skins: {} };
let fails = 0; const checks = [];
for (const [sid, P] of Object.entries(SKINS)) {
  const res = { text: [], nonText: [], sides: {} }; const g = ground(sid); const worstText = { ratio: 99 }; const worstMark = { ratio: 99 };
  for (const [vid, bands] of Object.entries(bandsOf[g])) for (let bi = 0; bi < bands.length; bi++) {
    const G = bands[bi]; const haloCov = 1 - (1 - P['halo.soft']) * (1 - P['halo.alpha']); const E = over(P['color.halo'], haloCov, G);      // what a letter sits on: the two halo strokes (soft, then main) over the ground; next to a glyph both cover the pixel
    for (const [name, ink] of [['code', P['color.ink']], ['tint-union', P['color.tintUnion']], ['tint-confederate', P['color.tintConfederate']], ['tint-unknown', P['color.tintUnknown']], ['tint-mixed', P['color.tintMixed']]]) {
      for (const [state, a] of [['fresh', 1], ['carried', P['text.dimAlpha']]]) { const ink2 = over(ink, a, E); const r = contrast(ink2, E); if (r < worstText.ratio) Object.assign(worstText, { ratio: +r.toFixed(2), name, state, view: vid, band: PCT[bi], ground: G }); }
    }
    const nameInk = over(P['color.ink'], P['name.alpha'] * P['text.dimAlpha'], E); const rn = contrast(nameInk, E); if (rn < worstText.ratio) Object.assign(worstText, { ratio: +rn.toFixed(2), name: 'unit name (grown in, carried)', view: vid, band: PCT[bi], ground: G });
    const num = P['color.numeral']; const numE = over(P['color.numeralHalo'], haloCov, G); const rr = contrast(num, numE); if (rr < worstText.ratio) Object.assign(worstText, { ratio: +rr.toFixed(2), name: 'count in a flag', view: vid, band: PCT[bi], ground: G });
    const H = over(P['color.halo'], P['pip.hairlineAlpha'], G);                                                    // the dark (night) or paper (day) hairline round a pip or a flag, over the ground
    for (const [name, col] of [['pip ring (fresh)', P['color.ring']], ['pip ring union (carried)', P['color.union']], ['pip ring confederate (carried)', P['color.confederate']], ['pip ring unknown (carried)', P['color.unknown']]]) { const r = contrast(col, H); if (r < worstMark.ratio) Object.assign(worstMark, { ratio: +r.toFixed(2), name, view: vid, band: PCT[bi], ground: G }); }
  }
  res.worstText = worstText; res.worstMark = worstMark;
  const U = P['color.union']; const C = P['color.confederate']; const X = P['color.unknown']; const dE = {};
  for (const t of ['normal', 'protanopia', 'deuteranopia', 'tritanopia']) dE[t] = { unionConfederate: +deltaE(simulate(U, t), simulate(C, t)).toFixed(1), unionContested: +deltaE(simulate(U, t), simulate(X, t)).toFixed(1), confederateContested: +deltaE(simulate(C, t), simulate(X, t)).toFixed(1) };
  const lu = luminance(U); const lc = luminance(C); res.sides = { deltaE2000: dE, greyscaleLuminanceRatio: +((Math.max(lu, lc) + 0.05) / (Math.min(lu, lc) + 0.05)).toFixed(2), minDeltaE: Math.min(...Object.values(dE).flatMap((x) => Object.values(x))) };
  res.sides.unionVsConfederateMin = Math.min(...Object.values(dE).map((x) => x.unionConfederate)); res.verdict = { text: worstText.ratio >= 4.5, nonText: worstMark.ratio >= 3, sides: res.sides.minDeltaE >= 20 }; out.skins[sid] = res;
  for (const [k, v] of Object.entries(res.verdict)) if (!v) fails++;
  checks.push(`${sid.padEnd(15)} lettering worst ${String(worstText.ratio).padEnd(5)} (${worstText.name}, ${worstText.state || ''}, band p${Math.round(worstText.band * 100)} of ${worstText.view}) | marks worst ${worstMark.ratio} (${worstMark.name}) | sides min dE ${res.sides.minDeltaE} (union vs confed ${res.sides.unionVsConfederateMin}), grey ${res.sides.greyscaleLuminanceRatio}:1 | ${Object.entries(res.verdict).map(([k, v]) => k + (v ? ' ok' : ' FAIL')).join(', ')}`);
}
out.fails = fails; console.log(checks.join('\n')); console.log('fails', fails);
fs.mkdirSync(path.join(D1, 'results'), { recursive: true }); fs.writeFileSync(path.join(D1, 'results', 'contrast.json'), JSON.stringify(out, null, 1));
void pathToFileURL; void args; void mix; void hexToRgb;
