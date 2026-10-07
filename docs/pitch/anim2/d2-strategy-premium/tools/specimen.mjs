// tools/specimen.mjs - photographs dist/specimen.html: the specimen sheet of the language on three grounds (dark forest, pale field, paper) and in the three palettes.
//   node tools/specimen.mjs [--out=shots/specimen] [--only=dark-standard]
import fs from 'node:fs';
import path from 'node:path';
import { launch, args, D2 } from './lib.mjs';
const OUT = path.resolve(args.out || path.join(D2, 'shots', 'specimen')); fs.mkdirSync(OUT, { recursive: true });
const jobs = [['dark', 'standard'], ['field', 'standard'], ['paper', 'standard'], ['dark', 'cvd'], ['dark', 'contrast']];
for (const [ground, variant] of jobs) {
  const id = ground + '-' + variant; if (args.only && !args.only.split(',').includes(id)) continue;
  const run = await launch({ w: 1400, h: 1560, dpr: 2, html: 'd2-strategy-premium/dist/specimen.html', query: `ground=${ground}&variant=${variant}`, profile: 'specimen', inject: false, studio: false }).catch(async (e) => { throw e; });
  try {
    await run.page.waitForFunction(() => document.body.dataset.ready === '1', null, { timeout: 120000 }); await run.page.waitForTimeout(300);
    await run.page.locator('#sheet').screenshot({ path: path.join(OUT, `specimen-${id}.jpg`), type: 'jpeg', quality: 90 }); console.log('specimen', id, JSON.stringify({ errors: run.errors.filter((m) => !/404/.test(m)).slice(0, 3), external: run.requests.length }));
  } finally { await run.close(); }
}
