// tools/legibility.mjs - the contrast of every piece of type in the language, measured on RENDERED PIXELS of the skin's own painter (not on token values): for each palette, side and state a mark is drawn at 3x on
// a transparent canvas; the glyph colour is the ink the skin uses, the background is the LIGHTEST fabric pixel found beside the glyphs (99th percentile of the luminance of every non-glyph pixel in the text row,
// away from anti-aliasing), so the ratio is the worst case under the type.  WCAG 2 relative luminance; the bar is 4.5:1 for text (the brief), 3:1 for the signs on the hoist band.
//   node tools/legibility.mjs  ->  results/legibility.json
import fs from 'node:fs';
import path from 'node:path';
import { launch, D2 } from './lib.mjs';

const run = await launch({ w: 1200, h: 800, dpr: 1, query: 'manual=1', profile: 'legib', inject: false });
try {
  const res = await run.page.evaluate(() => {
    const { paintSpec, PREMIUM } = window.__premium; const S = 3;
    const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    const lum = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    const hexL = (h) => lum(parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16));
    const out = [];
    const specs = [
      ['union fresh', { code: '88 NY', side: 'union', arm: 'infantry' }, 'ink'], ['union carried 100%', { code: '88 NY', side: 'union', arm: 'infantry', carried: 1 }, 'ink'], ['union carried 50%', { code: '88 NY', side: 'union', arm: 'infantry', carried: 0.5 }, 'ink'],
      ['confederate fresh', { code: '88 AL', side: 'confederate', arm: 'infantry' }, 'ink'], ['confederate carried 100%', { code: '88 AL', side: 'confederate', arm: 'infantry', carried: 1 }, 'ink'], ['confederate carried 50%', { code: '88 AL', side: 'confederate', arm: 'infantry', carried: 0.5 }, 'ink'],
      ['contested fresh', { code: '88 XX', side: 'unknown', arm: 'infantry' }, 'inkOnGold'], ['contested carried 100%', { code: '88 XX', side: 'unknown', arm: 'infantry', carried: 1 }, 'inkOnGold'],
      ['union brigade standard', { code: 'II/2/1', side: 'union', arm: 'formation', ech: 2 }, 'ink'], ['confederate corps standard', { code: 'III', side: 'confederate', arm: 'formation', ech: 4 }, 'ink'],
      ['union name line (unfolded)', { code: '14 VT', side: 'union', arm: 'infantry', name: '14th Vermont Volunteer Infantry', nameK: 1 }, 'ink'], ['confederate name line (unfolded)', { code: '14 VA', side: 'confederate', arm: 'infantry', name: '14th Virginia Infantry', nameK: 1 }, 'ink'],
      ['crowd, one side (Union)', { code: 'Union', agg: true, count: '12', side: 'union' }, 'ink'], ['crowd, one side (Confederate)', { code: 'Confederate', agg: true, count: '12', side: 'confederate' }, 'ink'], ['crowd, both sides', { code: 'Both sides', agg: true, count: '12', side: 'mixed', sides: ['union', 'confederate'] }, 'ink'], ['crowd, contested', { code: 'Contested', agg: true, count: '3', side: 'unknown' }, 'inkOnGold'],
    ];
    for (const sk of PREMIUM) {
      const P = sk.skin.P; const variant = sk.variant || 'standard';
      for (const [name, spec, inkKey] of specs) {
        const cv = document.createElement('canvas'); cv.width = 520 * S; cv.height = 140 * S; const c = cv.getContext('2d', { willReadFrequently: true }); c.scale(S, S); c.translate(260, 70);
        const r = paintSpec(c, sk.skin, { ratio: 0.9, ...spec }); const im = c.getImageData(0, 0, cv.width, cv.height); const d = im.data; const W = cv.width;
        // the mark's own box in canvas px; the text row = the whole fabric area right of the hoist band / count pill
        const x0 = Math.round((260 - r.w / 2) * S); const x1 = Math.round((260 + r.w / 2) * S); const y0 = Math.round((70 - r.h / 2) * S); const y1 = Math.round((70 + r.h / 2) * S);
        const hoist = spec.agg ? 0 : (spec.ech >= 2 ? P['geo.hoist1'] : P['geo.hoist0']); const xa = x0 + Math.round((P['geo.ring'] + (spec.agg ? 5 + Math.max(P['geo.hAgg'] - 8, 20) + 6 : hoist + 2)) * S); const xb = x1 - Math.round((P['geo.ring'] + P['geo.fly'] + 2) * S);
        const inkHex = P['color.' + inkKey]; const L_ink = hexL(inkHex); const darkInk = inkKey === 'inkOnGold';
        // glyph pixels = luminance far from the background side of the ink; background = the rest, away from glyph neighbours
        const Ls = new Float32Array(cv.width * cv.height); for (let i = 0; i < Ls.length; i++) { const a = d[i * 4 + 3] / 255; Ls[i] = a < 0.9 ? -1 : lum(d[i * 4], d[i * 4 + 1], d[i * 4 + 2]); }
        const thr = darkInk ? (L_ink + 0.12) : 0.55; const isG = (L) => (darkInk ? L >= 0 && L < thr * 0.6 : L > thr);
        // the glyphs' own box (inside the text zone), widened by 3 px: the fabric that surrounds the letters is what decides legibility
        let gx0 = 1e9; let gx1 = -1; let gy0 = 1e9; let gy1 = -1; for (let y = y0 + 3 * S; y < y1 - 7 * S; y++) for (let x = xa; x < xb; x++) { const L = Ls[y * W + x]; if (L >= 0 && isG(L)) { if (x < gx0) gx0 = x; if (x > gx1) gx1 = x; if (y < gy0) gy0 = y; if (y > gy1) gy1 = y; } }
        const bg = []; const yTop = Math.max(y0 + 3 * S, gy0 - 3 * S); const yBot = Math.min(y1 - 7 * S, gy1 + 3 * S); const xl = Math.max(xa, gx0 - 3 * S); const xr = Math.min(xb, gx1 + 3 * S);
        for (let y = yTop; y < yBot; y++) for (let x = xl; x < xr; x++) { const L = Ls[y * W + x]; if (L < 0) continue; if (isG(L)) continue; let near = false; for (let dy = -2; dy <= 2 && !near; dy++) for (let dx = -2; dx <= 2; dx++) { const L2 = Ls[(y + dy) * W + x + dx]; if (L2 >= 0 && isG(L2)) { near = true; break; } } if (!near) bg.push(L); }
        bg.sort((a, b) => a - b); const p99 = bg.length ? bg[Math.floor(bg.length * 0.99)] : null; const p50 = bg.length ? bg[Math.floor(bg.length * 0.5)] : null; const pmin = bg.length ? bg[Math.floor(bg.length * 0.01)] : null;
        const worst = darkInk ? (p99 === null ? null : (p99 + 0.05) / (L_ink + 0.05)) : (p99 === null ? null : (L_ink + 0.05) / (p99 + 0.05));
        // for dark ink the worst background is the DARKEST fabric pixel
        const worstD = darkInk ? (pmin === null ? null : (pmin + 0.05) / (L_ink + 0.05)) : worst;
        out.push({ variant, name, ink: inkHex, bgLumP50: p50 && +p50.toFixed(4), bgLumWorst: darkInk ? pmin && +pmin.toFixed(4) : p99 && +p99.toFixed(4), contrast: worstD === null ? null : +worstD.toFixed(2), samples: bg.length });
      }
    }
    return out;
  });
  const bar = 4.5; const bad = res.filter((r) => r.contrast === null || r.contrast < bar); fs.mkdirSync(path.join(D2, 'results'), { recursive: true });
  fs.writeFileSync(path.join(D2, 'results', 'legibility.json'), JSON.stringify({ made: 'node tools/legibility.mjs', bar, method: 'ink luminance against the lightest (darkest for dark ink) background pixel within 3 px of the glyphs, 99th percentile (1st for dark ink), rendered at 3x on a transparent canvas', rows: res, below: bad.length }, null, 1));
  for (const v of ['standard', 'cvd', 'contrast']) { console.log('--', v); for (const r of res.filter((x) => x.variant === v)) console.log(String(r.contrast).padStart(6), r.contrast >= bar ? 'ok  ' : 'LOW ', r.name); }
  console.log('below the bar:', bad.length, 'of', res.length);
} finally { await run.close(); }
