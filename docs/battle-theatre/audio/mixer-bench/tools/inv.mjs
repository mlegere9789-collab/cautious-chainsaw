import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { serve } from './serve.mjs'; import { launchChrome, newPage, closeChrome } from './cdp.mjs';
const here = path.dirname(fileURLToPath(import.meta.url));
const srv = await serve(10780); const ch = await launchChrome({ headless: true }); const pg = await newPage(ch.port, 'http://127.0.0.1:10780/mixer-bench/index.html'); await new Promise(r => setTimeout(r, 1200));
const prep = await pg.evaluate('BT.prepare()'); console.log(JSON.stringify(prep.inventory, null, 0).replace(/\},/g, '},\n')); console.log('pool MB', prep.poolMB, 'shots', prep.shots, JSON.stringify(prep.banks));
fs.writeFileSync(path.join(here, '..', 'results', 'sample-inventory.json'), JSON.stringify({ poolMB: prep.poolMB, shots: prep.shots, banks: prep.banks, files: prep.inventory }, null, 1));
pg.close(); await closeChrome(ch.port); srv.close(); process.exit(0);
