import { make } from './headless.mjs';
const E = make({}); const cam = { lng: -77.2377, lat: 39.8206 - 0.003, zoom: 13.5, w: 1440, h: 800 };
let F; for (let i = 0; i < 30; i++) F = E.step({ dtMs: 16.7, tau: 295 + i * 0.05, cam });
const aggs = F.tiles.filter((t) => t.kind === 'agg'); console.log(F.tiles.length, aggs.length);
for (const t of aggs.slice(0, 8)) console.log(t.key, '|', t.short, '|', t.badge, '|', t.fname, '|', t.n, t.w);
const bad = F.tiles.filter((t) => typeof t.short !== 'string'); console.log('bad', bad.length);
