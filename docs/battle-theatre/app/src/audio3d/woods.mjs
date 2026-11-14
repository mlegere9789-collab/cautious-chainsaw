// Woods mask for the sound engine (closes the "hook only" part of AUD-G08 / EG-AUD-G08).
//
// Input: data/audio3d/woods-mask.json (the 1863 woods layer, a reconstruction from the Warren survey
// of 1868-69, rasterised) and the app's lon/lat -> metres function (T.xz: x east, z south). Output: woodsAt(x, z) -> 0 or 1, memoised on a 10 m grid (the layer's own
// positional error is 30 to 40 m, so 10 m cells lose nothing).
//
// WHAT THE MASK IS USED FOR (planner.mjs): the two documented accounts of echo in woods (Culp's Hill: "the echoing of the woods increased the appalling roar",
// NY-GB-1900; "For seven hours the woods echoed with the crashing musketry", 78th NY, documented-reports.json) are qualitative. The engine therefore applies a
// REVERB-SEND BOOST (plausible-procedural, magnitude ASSUMED, `woodsReverbBoost` in the planner budget) to a sound whose source stands in woods, whose listener
// stands in woods, or whose straight path runs through woods. It does NOT apply any foliage attenuation: no source for a number was checked, so
// none is invented (gap EG-AUD-G08 keeps that item open).

/** Winding-free ray cast: is (x, y) inside the ring? ring = [[x, y], ...] closed or open. */
function inRing(x, y, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/**
 * @param {{polygons: {id:string, name:string|null, rings:number[][][]}[]}} data  the woods-mask.json content
 * @param {(lng:number, lat:number)=>[number,number]} xz  lon/lat -> app metres (T.xz)
 * @param {{cellM?:number}} opts
 * @returns {{ woodsAt:(x:number,z:number)=>0|1, count:number, bbox:number[]|null, stats:()=>object, nameAt:(x:number,z:number)=>string|null }}
 */
export function makeWoodsMask(data, xz, { cellM = 10 } = {}) {
  const polys = [];
  for (const p of (data && data.polygons) || []) {
    const rings = p.rings.map((r) => r.map((q) => { const m = xz(q[0], q[1]); return [m[0], m[1]]; }));
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const q of rings[0]) { if (q[0] < x0) x0 = q[0]; if (q[0] > x1) x1 = q[0]; if (q[1] < y0) y0 = q[1]; if (q[1] > y1) y1 = q[1]; }
    polys.push({ id: p.id, name: p.name || null, rings, x0, y0, x1, y1 });
  }
  // coarse bucket index (200 m) so a lookup tests a handful of polygons, not all of them
  const B = 200, bucket = new Map();
  polys.forEach((p, i) => { for (let bx = Math.floor(p.x0 / B); bx <= Math.floor(p.x1 / B); bx++) for (let by = Math.floor(p.y0 / B); by <= Math.floor(p.y1 / B); by++) { const k = bx + ',' + by; (bucket.get(k) || bucket.set(k, []).get(k)).push(i); } });
  const memo = new Map(); let hits = 0, misses = 0;
  const find = (x, z) => {
    const cand = bucket.get(Math.floor(x / B) + ',' + Math.floor(z / B)); if (!cand) return -1;
    for (const i of cand) {
      const p = polys[i]; if (x < p.x0 || x > p.x1 || z < p.y0 || z > p.y1) continue;
      if (!inRing(x, z, p.rings[0])) continue;
      let hole = false; for (let h = 1; h < p.rings.length; h++) if (inRing(x, z, p.rings[h])) { hole = true; break; }
      if (!hole) return i;
    }
    return -1;
  };
  const woodsAt = (x, z) => {
    const cx = Math.floor(x / cellM), cz = Math.floor(z / cellM), k = cx + ',' + cz;
    let v = memo.get(k); if (v !== undefined) { hits++; return v >= 0 ? 1 : 0; }
    misses++; v = find((cx + 0.5) * cellM, (cz + 0.5) * cellM); if (memo.size > 400000) memo.clear(); memo.set(k, v); return v >= 0 ? 1 : 0;
  };
  const nameAt = (x, z) => { const i = find(x, z); return i < 0 ? null : (polys[i].name || polys[i].id); };
  let bbox = null; if (polys.length) bbox = [Math.min(...polys.map((p) => p.x0)), Math.min(...polys.map((p) => p.y0)), Math.max(...polys.map((p) => p.x1)), Math.max(...polys.map((p) => p.y1))];
  return { woodsAt, nameAt, count: polys.length, bbox, stats: () => ({ polygons: polys.length, cells: memo.size, hits, misses }) };
}

/**
 * Reverb-send boost for a plan. fraction = share of the straight path inside woods (0..1), srcIn / lstIn = source / listener stand in woods.
 * Weights (ASSUMED): a source in woods counts 0.5, a listener in woods 0.25, the path share 0.5; the sum is capped at 1.
 */
export function woodsEffect({ srcIn, lstIn, fraction }, boost) {
  const w = Math.min(1, 0.5 * (srcIn ? 1 : 0) + 0.25 * (lstIn ? 1 : 0) + 0.5 * (fraction || 0));
  return { weight: w, reverbAdd: boost * w, applied: w > 0 && boost > 0 };
}
