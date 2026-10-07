// tools/textfit.mjs - does the text the skin draws fit the footprint the layout reserved?  For every unit, every short code, every full name (compacted) and every formation lettering the page can show, the
// width the browser really measures (QC Sans, canvas measureText) is compared with the width the layout model reserved (engine.text.width: measured in the same browser, plus a 4 % safety factor and 1 px).
// The ink of a mark is inside its footprint if measured <= modelled for every string.  Also the glyph coverage: any character of the data that QC Sans lacks.
//   node tools/textfit.mjs  -> results/textfit.json
import fs from 'node:fs';
import path from 'node:path';
import { open, args, D1, stopServer } from './lib.mjs';

const s = await open({ dpr: 1, profile: 'textfit' });
try {
  await s.page.evaluate(() => document.fonts.ready); await s.page.waitForFunction(() => globalThis.__fontsReady === true, null, { timeout: 20000 });
  const res = await s.page.evaluate(() => {
    const S = window.__studio; const E = S.engine; const T = E.text; const c = document.createElement('canvas').getContext('2d');
    const specs = { code: '700 11px "QC Sans", "Liberation Sans", Arial, "Helvetica Neue", sans-serif', codeI: 'italic 400 11px "QC Sans", "Liberation Sans", Arial, "Helvetica Neue", sans-serif', name: '400 11px "QC Sans", "Liberation Sans", Arial, "Helvetica Neue", sans-serif', form: '700 13px "QC Sans", "Liberation Sans", Arial, "Helvetica Neue", sans-serif' };
    const strings = { code: new Set(), codeI: new Set(), name: new Set(), form: new Set() };
    const ORD = { First: '1st', Second: '2nd', Third: '3rd', Fourth: '4th', Fifth: '5th', Sixth: '6th', Seventh: '7th', Eighth: '8th', Ninth: '9th', Tenth: '10th', Eleventh: '11th', Twelfth: '12th' };
    const FORM = new Set(['brigade', 'division', 'corps', 'army']);
    const compact = (u) => { const label = u.label || ''; let full = label.includes('…') && u.designation ? u.designation : (FORM.has(u.kind) ? label : (u.designation || label)); full = full.replace(/\s*\([^)]*\)\s*$/, '').replace(/\b(First|Second|Third|Fourth|Fifth|Sixth|Seventh|Eighth|Ninth|Tenth|Eleventh|Twelfth)\b/g, (m) => ORD[m]).replace(/\bBrigade\b/g, 'Bde').replace(/\bDivision\b/g, 'Div').replace(/\bVolunteer /g, ''); return full && full !== u.short ? full : null; };
    const chars = new Set();
    for (const u of E.battle.units.values()) { const f = FORM.has(u.kind); const n = compact(u); (u.inOob ? strings.code : strings.codeI).add(u.short); if (f) strings.form.add(u.short); if (n) { (f ? strings.form : strings.name).add(n); } for (const ch of u.short + (n || '')) chars.add(ch); }
    for (const k of ['Both sides', 'Union', 'Confed.', 'Side unknown', 'I, II Corps +12', 'XI, XII Corps +12']) strings.form.add(k);
    for (let i = 0; i <= 999; i += 7) strings.code.add(String(i));
    const out = { fonts: {}, loaded: [...document.fonts].map((f) => f.family + ' ' + f.weight + ' ' + f.style + ' ' + f.status) };
    for (const [k, css] of Object.entries(specs)) {
      c.font = css; let worst = { ratio: 0, s: '' }; let n = 0; let over = 0;
      for (const str of strings[k]) { const real = c.measureText(str).width; const model = T.width(k, str); const ratio = real / model; n++; if (ratio > 1) over++; if (ratio > worst.ratio) worst = { ratio: +ratio.toFixed(4), s: str, real: +real.toFixed(2), model: +model.toFixed(2) }; }
      out.fonts[k] = { strings: n, overModel: over, worst };
    }
    // glyph coverage: draw each character with QC Sans and with a nonexistent family; if the widths match for a visible glyph the font lacks it
    c.font = '700 13px "QC Sans"'; const missing = []; const probeFont = '700 13px "QC Sans", monospace'; for (const ch of chars) { if (/\s/.test(ch)) continue; if (!document.fonts.check('700 13px "QC Sans"', ch)) missing.push(ch); }
    out.chars = chars.size; out.missing = missing; out.model = T.source;
    return out;
  });
  console.log(JSON.stringify(res, null, 1));
  fs.mkdirSync(path.join(D1, 'results'), { recursive: true }); fs.writeFileSync(path.join(D1, 'results', 'textfit.json'), JSON.stringify(res, null, 1));
} finally { await s.close(); await stopServer(); }
void args;
