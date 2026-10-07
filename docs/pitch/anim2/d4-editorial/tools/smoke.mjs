import { serve, launch, open, REPO } from './lib.mjs';
import path from 'node:path';
const srv = await serve(); const b = await launch({ dpr: 1 });
try {
  const r = await open(b.page, 'scene=fresh2&zoom=15.5'); console.log(JSON.stringify(r));
  await b.page.screenshot({ path: path.join(REPO, 'tmp', 'look-dev', 'd4-editorial', 'smoke.png') });
  console.log('errors', b.errors.slice(0, 8), 'external', b.reqs.slice(0, 3));
} finally { await b.close(); srv.close(); }
