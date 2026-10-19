import { serve } from './serve.mjs'; import { launchChrome, newPage, closeChrome } from './cdp.mjs';
const srv = await serve(10780); const ch = await launchChrome({ headless: process.argv[2] !== 'headed' });
console.log(ch.version.Browser); const pg = await newPage(ch.port, 'http://127.0.0.1:10780/mixer-bench/probe.html');
await new Promise(r => setTimeout(r, 1500)); console.log(JSON.stringify(await pg.evaluate('probe()'), null, 1)); console.log(pg.logs);
pg.close(); await closeChrome(ch.port); srv.close(); process.exit(0);
