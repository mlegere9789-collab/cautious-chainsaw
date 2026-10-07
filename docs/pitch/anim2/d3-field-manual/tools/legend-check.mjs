import { startServer, launch, settle } from './lib.mjs';
const srv = await startServer(); const s = await launch({ query: 'manual=1', dpr: 1 });
try {
  const r = await s.page.evaluate(() => { const E = window.__studio.engine; const sk = E.kernel.skins.get(E.tok('skin.id')); const rows = sk.legend(); return { n: rows.length, first: rows.slice(0, 3).map((x) => x.text.slice(0, 40)) }; });
  console.log(JSON.stringify(r)); console.log(s.errors.slice(0, 6));
} finally { await s.close(); srv.close(); }
