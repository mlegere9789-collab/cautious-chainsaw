// tools/eval.mjs - run a JS expression in the settled page and print the result:  node tools/eval.mjs "<query>" "<expression>"
import { serve, launch, open, REPO } from './lib.mjs';
const [q, expr] = process.argv.slice(2); const srv = await serve(); const b = await launch({ dpr: 1 });
try { await open(b.page, q, { steps: 60 }); console.log(JSON.stringify(await b.page.evaluate(expr), null, 1)); if (b.errors.length) console.log('errors', b.errors.slice(0, 5)); } finally { await b.close(); srv.close(); }
