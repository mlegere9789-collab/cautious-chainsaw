// tools/crowd-stats.mjs - what the crowds of the opening zoom say, counted (node, no browser): 4 ticks x 4 places x 3 zooms of the real data, the layout settled by 150 frames.
//   node tools/crowd-stats.mjs [--zoom=13.5] [--list]    own-mark share, crowd count, size of the biggest crowd, names that repeat in one view, names that are not a formation or a corps
import { makeEngine } from '../studio/src/headless.mjs';
import { createKernel } from '../studio/src/kernel/registry.mjs';
import { registerBuiltins } from '../studio/src/builtins.mjs';
import { SKINS } from '../studio/src/skins/index.mjs';

const a = Object.fromEntries(process.argv.slice(2).map((x) => { const i = x.indexOf('='); return i < 0 ? [x.slice(2), '1'] : [x.slice(2, i), x.slice(i + 1)]; }));
const kernel = registerBuiltins(createKernel()); for (const k of SKINS) kernel.skins.register(k.id, k);
const PLACES = { field: [39.81592, -77.23677], angle: [39.8117, -77.235], wheat: [39.7989, -77.2411], cemetery: [39.8189, -77.2261] };
const TICKS = [295, 346, 551, 556]; const ZOOMS = a.zoom ? [+a.zoom] : [13.5, 15, 16.5];
const rows = []; const names = new Map();
for (const z of ZOOMS) {
  let own = 0; let units = 0; let crowds = 0; let dupViews = 0; let dupMarks = 0; let big = 0; let vague = 0; let viewsN = 0; const fmt = {};
  for (const [pn, [lat, lng]] of Object.entries(PLACES)) for (const tick of TICKS) {
    const e = makeEngine({ kernel, start: { tick, zoom: z, lat, lng }, settings: { 'skin.id': 'dispatch-paper' } }); e.moveTo({ lat, lng, zoom: z }, { glide: false }); e.transport.seek(tick, { glide: false });
    for (let i = 0; i < 150; i++) e.step(16.667);
    const f = e.frame; const W = e.camera.w; const H = e.camera.h; const inV = (t) => { const x = t.x + f.view.dx; const y = t.y + f.view.dy; return x > 0 && x < W && y > 0 && y < H; };
    const live = f.tiles.filter((t) => t.life === 'live' && t.solid && inV(t)); viewsN++;
    const seen = new Map(); for (const t of live) { const key = t.kind === 'agg' ? t.short : (t.text || t.short); seen.set(key, (seen.get(key) || 0) + 1); }
    let d = 0; for (const [, v] of seen) if (v > 1) { d += v; } if (d) dupViews++; dupMarks += d;
    for (const t of live) {
      if (t.kind === 'leaf') { own++; units++; } else { crowds++; units += t.n; big = Math.max(big, t.n); const k = t.nameKind; fmt[k] = (fmt[k] || 0) + 1; if (!/Bde|Div|Corps|corps|regts|states|Both|Union|Confed|Contested/.test(t.short)) vague++; if (a.list && z === ZOOMS[0]) names.set(t.short, (names.get(t.short) || 0) + 1); }
    }
  }
  rows.push({ zoom: z, views: viewsN, ownShare: +(100 * own / units).toFixed(1), crowdsPerView: +(crowds / viewsN).toFixed(1), biggest: big, dupMarksPerView: +(dupMarks / viewsN).toFixed(1), viewsWithDup: dupViews, vague, kinds: fmt });
}
console.table(rows); if (a.list) console.log([...names.entries()].sort((p, q) => q[1] - p[1]).slice(0, 60).map((x) => x.join('  x')).join('\n'));
