// tools/measure-text.mjs - measures the advance widths of every character of the three mark fonts (Inter 600 12 px, 700 13 px) in real Chrome and writes studio/data/text-widths.json.
// The page measures the same table itself at start-up (app.mjs measure()); the committed table is what the node tests and the very first frame use, so the layout of a test is the layout of the page.
//   node tools/measure-text.mjs
import fs from 'node:fs';
import path from 'node:path';
import { serve, launch, open, ROOT } from './lib.mjs';
const srv = await serve(); const b = await launch({ dpr: 1 });
try {
  await open(b.page, 'scene=fresh2&zoom=15', { steps: 5 });
  const table = await b.page.evaluate(() => { const E = window.__studio.engine; return E.text.table; });
  const out = path.join(ROOT, 'studio', 'data', 'text-widths.json'); fs.writeFileSync(out, JSON.stringify(table));
  console.log('wrote', path.relative(process.cwd(), out), Object.keys(table.fonts).map((k) => `${k}: ${table.fonts[k].css} (${Object.keys(table.fonts[k].adv).length} chars)`).join(' | '), table.browser);
} finally { await b.close(); srv.close(); }
