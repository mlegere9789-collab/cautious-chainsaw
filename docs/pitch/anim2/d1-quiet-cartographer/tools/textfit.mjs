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
    const Q = window.__qcSkin; const FAM = '"QC Sans", "Source Sans 3", Arial, "Helvetica Neue", sans-serif';
    const specs = { code: `600 12px ${FAM}`, codeI: `italic 400 12px ${FAM}`, name: `400 12px ${FAM}`, brig: `600 12px ${FAM}`, form: `700 13px ${FAM}` };
    // the strings exactly as the skin sets them: a unit's code (code, or codeI for an id-only unit), its name INSTEAD of the code from zoom 16 (set in the code's cut), a brigade's name (brig), a division's or a corps' (form),
    // a crowd's words (brig or form, its tail in the name's cut) and its count (code)
    const strings = { code: new Set(), codeI: new Set(), name: new Set(), brig: new Set(), form: new Set() };
    const chars = new Set();
    for (const u of E.battle.units.values()) {
      const f = ['brigade', 'division', 'corps', 'army'].includes(u.kind); const n = Q.compactName(u); const code = Q.codeOf(u);
      if (!f) { (u.inOob ? strings.code : strings.codeI).add(code); if (n) strings.code.add(n); }
      else { const k = u.kind === 'brigade' || u.kind === 'battalion' ? 'brig' : 'form'; strings[k].add(n || code); }
      for (const ch of code + (n || '')) chars.add(ch);
    }
    for (const k of ['Both sides', 'Union', 'Confederate', 'Side unknown', 'Union, unlisted', 'Confederate, unlisted', 'I, II Corps', 'I, II, XI Corps', '12 corps', 'II Corps']) { strings.brig.add(k); strings.form.add(k); }
    for (const k of [', 1 unlisted', ', 12 unlisted', ', unlisted', ', 2 contested', ', 12 unlisted, 2 contested']) strings.name.add(k);
    for (let i = 0; i <= 999; i += 7) strings.code.add(String(i));
    const out = { fonts: {}, loaded: [...document.fonts].map((f) => f.family + ' ' + f.weight + ' ' + f.style + ' ' + f.status) };
    for (const [k, css] of Object.entries(specs)) {
      c.font = css; let worst = { ratio: 0, s: '' }; let n = 0; let over = 0;
      for (const str of strings[k]) { const real = c.measureText(str).width; const model = T.width(k, str); const ratio = real / model; n++; if (ratio > 1) over++; if (ratio > worst.ratio) worst = { ratio: +ratio.toFixed(4), s: str, real: +real.toFixed(2), model: +model.toFixed(2) }; }
      out.fonts[k] = { strings: n, overModel: over, worst };
    }
    // glyph coverage: draw each character with QC Sans and with a nonexistent family; if the widths match for a visible glyph the font lacks it
    const missing = []; for (const ch of chars) { if (/\s/.test(ch)) continue; if (!document.fonts.check('600 12px "QC Sans"', ch)) missing.push(ch); }
    out.chars = chars.size; out.missing = missing; out.model = T.source;
    return out;
  });
  console.log(JSON.stringify(res, null, 1));
  fs.mkdirSync(path.join(D1, 'results'), { recursive: true }); fs.writeFileSync(path.join(D1, 'results', 'textfit.json'), JSON.stringify(res, null, 1));
} finally { await s.close(); await stopServer(); }
void args;
