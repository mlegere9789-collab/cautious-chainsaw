// tools/measure-text.mjs - writes data/text-widths.json: the advance width of every character of every lettering cut (code, codeI, name, form, label, badge) in QC SANS, measured by Chrome's own
// canvas once the embedded fonts have loaded.  The page measures again at run time in the viewer's browser (the table is only the first-frame and node-test default); a browser that renders the
// same face the same way gets the same numbers, and tools/textfit.mjs proves the layout's reserved widths are never smaller than the real ones.
//   node tools/measure-text.mjs
import fs from 'node:fs';
import path from 'node:path';
import { open, D1, stopServer } from './lib.mjs';

const s = await open({ dpr: 1, profile: 'measure' });
try {
  await s.page.evaluate(() => document.fonts.ready); await s.page.waitForFunction(() => globalThis.__fontsReady === true, null, { timeout: 20000 });
  const table = await s.page.evaluate(() => { const t = window.__studio.engine.text.table; return { browser: navigator.userAgent, source: 'QC Sans (subset of Liberation Sans 2.1.5, SIL OFL 1.1) measured by canvas measureText after the embedded fonts loaded', fonts: t.fonts }; });
  const keys = Object.keys(table.fonts); if (!['code', 'codeI', 'name', 'form', 'label', 'badge'].every((k) => keys.includes(k))) throw new Error('missing font keys: ' + keys);
  fs.writeFileSync(path.join(D1, 'data', 'text-widths.json'), JSON.stringify(table)); console.log('wrote data/text-widths.json', keys.join(','), Object.keys(table.fonts.code.adv).length, 'characters;', table.browser);
} finally { await s.close(); await stopServer(); }
