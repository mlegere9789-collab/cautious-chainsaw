import { serve, launch, PROTO, args } from './lib.mjs';
const PORT = +(args.port || 9767); const srv = await serve(PROTO, PORT); const s = await launch({ port: PORT, query: 'welcome=0&manual=1', profile: 'keys' });
try {
  const r = await s.page.evaluate(() => { const S = window.__studio; const o = {}; for (const k of Object.keys(S)) o[k] = typeof S[k]; const d = S.data || S.dataset || (S.engine && S.engine.battle && S.engine.battle.dataset); return { keys: o, hasData: !!d, terrainKeys: d && d.terrain ? Object.keys(d.terrain) : null, loc0: d && d.terrain ? d.terrain.locations[0] : null, nloc: d && d.terrain ? d.terrain.locations.length : null, nfeat: d && d.terrain ? d.terrain.features.length : null, nstruct: d && d.terrain ? d.terrain.structures.length : null }; });
  console.log(JSON.stringify(r, null, 1));
} finally { await s.close(); srv.close(); }
