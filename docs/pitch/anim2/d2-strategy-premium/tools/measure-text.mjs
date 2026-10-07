// tools/measure-text.mjs - re-measures studio/data/text-widths.json (the advance of every printable character in every font of the language) in real Chrome with the bundled Barlow Semi Condensed loaded.
// The page measures its own widths at start-up in the viewer's browser; this table is what node tests, headless runs and the first frame use.  node tools/measure-text.mjs
import fs from 'node:fs';
import path from 'node:path';
import { launch, D2 } from './lib.mjs';
const run = await launch({ w: 800, h: 600, dpr: 1, query: 'manual=1', profile: 'text', inject: false });
try {
  const table = await run.page.evaluate(async () => {
    const { PREMIUM, fontSpecs } = window.__premium; const specs = fontSpecs(PREMIUM[0].skin.P); await document.fonts.load(specs.code); await document.fonts.load(specs.codeL); await document.fonts.load(specs.name); await document.fonts.ready;
    let chars = ''; for (let i = 32; i < 127; i++) chars += String.fromCharCode(i); chars += '×…·•’–—éè';
    const c = document.createElement('canvas').getContext('2d'); const out = { browser: navigator.userAgent, fonts: {} };
    for (const [k, css] of Object.entries(specs)) { c.font = css; const adv = {}; for (const ch of chars) adv[ch] = c.measureText(ch).width; out.fonts[k] = { css, adv, loaded: document.fonts.check(css) }; }
    return out;
  });
  for (const [k, f] of Object.entries(table.fonts)) if (!f.loaded) throw new Error('font not loaded: ' + k);
  for (const f of Object.values(table.fonts)) delete f.loaded;
  fs.writeFileSync(path.join(D2, 'studio', 'data', 'text-widths.json'), JSON.stringify(table)); console.log('wrote text-widths.json', Object.keys(table.fonts).join(', '), 'M width of code font', table.fonts.code.adv.M.toFixed(2));
} finally { await run.close(); }
