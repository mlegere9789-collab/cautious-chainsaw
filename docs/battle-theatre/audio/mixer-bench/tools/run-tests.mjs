import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url'; import { serve } from './serve.mjs'; import { launchChrome, newPage, closeChrome } from './cdp.mjs';
const here = path.dirname(fileURLToPath(import.meta.url));
const srv = await serve(10780); const ch = await launchChrome({ headless: true }); const pg = await newPage(ch.port, 'http://127.0.0.1:10780/mixer-bench/index.html'); await new Promise(r => setTimeout(r, 1200));
try { const r = await pg.evaluate('BTTests.runTests()'); console.log(JSON.stringify(r, null, 1)); fs.writeFileSync(path.join(here, '..', 'results', 'physics-tests.json'), JSON.stringify({ chrome: ch.version.Browser, date: new Date().toISOString(), ...r }, null, 1)); } catch (e) { console.error(e.message, pg.logs); }
pg.close(); await closeChrome(ch.port); srv.close(); process.exit(0);
