import fs from 'node:fs';
const VPN = process.argv[2] === 'phone' ? 'phone' : 'desktop';
const D = JSON.parse(fs.readFileSync('C:/Users/mlege/gettysburg-map/tmp/pitch-anim/a1/overlap-r1c' + (VPN === 'phone' ? '-phone' : '') + '.json', 'utf8'));
const T = JSON.parse(fs.readFileSync('C:/Users/mlege/gettysburg-map/baseline/dist/data/terrain.json', 'utf8'));
const places = T.key_locations.map((k) => ({ name: k.name, lat: k.lat, lng: k.lng }));
const keyTicks = D.keyTicks; const center = D.center;
const stateTick = (t) => { let k = keyTicks[0]; for (const x of keyTicks) { if (x <= t) k = x; else break; } return k; };
const mLat = 111320, mLng = (lat) => 111320 * Math.cos((lat * Math.PI) / 180);
const inv = (z, W, H, x, y) => { const s = 512 * 2 ** z; const fx = (lng) => ((lng + 180) / 360) * s, fy = (lat) => (0.5 - Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) / (2 * Math.PI)) * s; const cx = fx(center[0]), cy = fy(center[1]); const px = cx + (x - W / 2), py = cy + (y - H / 2); return [(px / s) * 360 - 180, (360 / Math.PI) * Math.atan(Math.exp((0.5 - py / s) * 2 * Math.PI)) - 90]; };
const nearest = (lng, lat) => { let b = null, bd = 1e12; for (const p of places) { const d = Math.hypot((p.lat - lat) * mLat, (p.lng - lng) * mLng(lat)); if (d < bd) { bd = d; b = p; } } return { name: b.name, meters: Math.round(bd) }; };
const q = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const out = {};
for (const [key, per] of Object.entries(D.results)) {
  const [mode, zs] = key.split('-'); const z = +zs.slice(1);
  const W = mode === 'view' ? (VPN === 'phone' ? 390 : 1440) : 6000 * 2 ** Math.max(0, z - 11), H = mode === 'view' ? (VPN === 'phone' ? 607 : 852) : 5000 * 2 ** Math.max(0, z - 11);
  const rows = []; for (let t = 1; t <= 675; t++) rows.push({ t, k: stateTick(t), c: per[stateTick(t)] });
  const f = (fn) => rows.map((r) => fn(r.c));
  const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  const ov = f((c) => c.overlapPairs), inAny = f((c) => c.tilesInAnyOverlap), tiles = f((c) => c.tiles), h50 = f((c) => c.hiddenOver50), h95 = f((c) => c.hiddenOver95), dots = f((c) => c.dotsHidden), lab = f((c) => c.labelsIllegibleOver30), labp = f((c) => c.labelPairsOverlapping), share = f((c) => c.meanHiddenShare);
  const worst = (arr) => { let bi = 0; arr.forEach((v, i) => { if (v > arr[bi]) bi = i; }); return { tick: rows[bi].t, value: arr[bi] }; };
  // hotspots: largest overlap clusters per displayed state, de-duplicated by place
  const spots = [];
  for (const k of keyTicks) { const c = per[k]; for (const cl of c.clusterRoots.slice(0, 1)) { if (!cl.px.length) continue; const cx = cl.px.reduce((a, p) => a + p[0], 0) / cl.px.length, cy = cl.px.reduce((a, p) => a + p[1], 0) / cl.px.length; const [lng, lat] = inv(z, W, H, cx, cy); spots.push({ tick: k, tiles: cl.count, ...nearest(lng, lat), lat: +lat.toFixed(5), lng: +lng.toFixed(5) }); } }
  spots.sort((a, b) => b.tiles - a.tiles); const seen = new Set(); const top = [];
  for (const s of spots) { if (seen.has(s.name)) continue; seen.add(s.name); top.push(s); if (top.length >= 8) break; }
  out[key] = {
    mode, zoom: z, ticksCounted: 675,
    tilesDrawn: { mean: +mean(tiles).toFixed(1), max: worst(tiles) },
    ticksWithAnyTileOverlap: rows.filter((r) => r.c.overlapPairs > 0).length,
    overlapPairs: { mean: +mean(ov).toFixed(1), p95: q(ov, 0.95), max: worst(ov) },
    tilesTouchingAnotherTile: { mean: +mean(inAny).toFixed(1), share_of_tiles_mean: +(mean(inAny) / mean(tiles)).toFixed(3), max: worst(inAny) },
    tilesHalfOrMoreHidden: { mean: +mean(h50).toFixed(1), max: worst(h50) }, tilesAlmostFullyHidden95: { mean: +mean(h95).toFixed(1), max: worst(h95) },
    meanHiddenShareOfATile: +mean(share).toFixed(3),
    disposition_dots_covered: { mean: +mean(dots).toFixed(1), max: worst(dots) },
    dotsHalfCoveredByOwnLabelMean: +mean(f((c) => c.dotsHalfCoveredByOwnLabel)).toFixed(1),
    labelsMostlyCoveredByLaterLabels: { mean: +mean(lab).toFixed(1), max: worst(lab) },
    labelBoxPairsOverlapping: { mean: +mean(labp).toFixed(1), max: worst(labp) },
    largestOverlapCluster: worst(f((c) => c.largestCluster)),
    topClustersByPlace: top,
  };
}
fs.writeFileSync('C:/Users/mlege/gettysburg-map/tmp/pitch-anim/a1/overlap-summary' + (VPN === 'phone' ? '-phone' : '') + '.json', JSON.stringify(out, null, 2));
for (const [k, v] of Object.entries(out)) console.log(k.padEnd(10), 'tiles mean', v.tilesDrawn.mean, 'max', v.tilesDrawn.max.value, '| pairs mean', v.overlapPairs.mean, 'max', v.overlapPairs.max.value, '@', v.overlapPairs.max.tick, '| touching mean', v.tilesTouchingAnotherTile.mean, '| >=50% hidden mean', v.tilesHalfOrMoreHidden.mean, 'max', v.tilesHalfOrMoreHidden.max.value, '| dots hidden mean', v.disposition_dots_covered.mean, 'own-label half', v.dotsHalfCoveredByOwnLabelMean, '| labels illegible mean', v.labelsMostlyCoveredByLaterLabels.mean, '| ticks w/ overlap', v.ticksWithAnyTileOverlap);
