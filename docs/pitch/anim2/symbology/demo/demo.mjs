// demo/demo.mjs - the atlas in use: real units of a real tick drawn through runtime/atlas.mjs (the shipped runtime) on a synthetic aerial ground.
// The placement here is a plain greedy search with per-tile footprints (runtime tileBox: the symbol, its chip, its label tab), NOT the product's layout engine: it exists to show the symbols at real density with zero overlap and to report it.
// THE RULE THE DEMO PROVES: every unit of the scene is represented.  A unit that cannot be placed as a tile merges, with its neighbours, into an aggregate (formation) mark that says how many, whose, and which arms.
// Nothing is dropped; if a unit still cannot be represented the page lists it (`unplaced`) and the test fails.
import { loadAtlas, canWebp, drawTile, drawLeaderLine, drawPin, drawCount, tileBox, baseKey } from '../runtime/atlas.mjs';
import { drawGround } from './backdrop.mjs';
const $ = (id) => document.getElementById(id); const q = new URLSearchParams(location.search);
for (const k of ['lang', 'zoom', 'ground', 'labels']) if (q.get(k)) $(k).value = q.get(k);
if (q.get('gauge')) $('gauge').checked = true; if (q.get('sel')) $('sel').checked = true;
const scenesDoc = await (await fetch('scenes.json')).json(); const sel = $('scene');
for (const s of scenesDoc.scenes) { const o = document.createElement('option'); o.value = s.id; o.textContent = s.name; sel.appendChild(o); } if (q.get('scene')) sel.value = q.get('scene');
const W = 1180; const H = 720; const cv = $('c'); const dpr = +(q.get('dpr') || window.devicePixelRatio || 1); cv.width = W * dpr; cv.height = H * dpr; const ctx = cv.getContext('2d');
const MERC = (lng, lat, z) => { const s = 512 * 2 ** z; const x = ((lng + 180) / 360) * s; const sin = Math.sin((lat * Math.PI) / 180); const y = (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * s; return [x, y]; };
const ECHN = { corps: 5, division: 4, brigade: 3, battalion: 2, regiment: 1, battery: 1, army: 6 };
const LETTER = { infantry: 'I', sharpshooter: 'I', cavalry: 'C', artillery: 'A', horse_artillery: 'A', formation: 'F' };
const webp = q.get('webp') === '1' && canWebp(); // real aerial backdrops: NAIP-derived previews (public domain) copied into assets/naip; texture only, NOT georeferenced to the unit positions
const NAIP = { 'naip-angle': '../assets/naip/angle-z15-dim.jpg', 'naip-cemhill': '../assets/naip/cemhill-z15-dim.jpg', 'naip-wheat': '../assets/naip/wheatfield-z15-dim.jpg', 'naip-cemhill135': '../assets/naip/cemhill-z13.5-dim.jpg' };
const naipImg = {}; await Promise.all(Object.entries(NAIP).map(([k, u]) => new Promise((ok) => { const im = new Image(); im.onload = () => { naipImg[k] = im; ok(); }; im.onerror = ok; im.src = u; })));
const cache = new Map();
async function atlases(lang) { if (!cache.has(lang)) cache.set(lang, [await loadAtlas('../dist/atlas/', lang, { dpr, webp }), await loadAtlas('../dist/atlas/', 'overlays', { dpr, webp })]); return cache.get(lang); }

async function render() {
  const lang = $('lang').value; const scene = scenesDoc.scenes.find((s) => s.id === sel.value) || scenesDoc.scenes[0]; const ground = $('ground').value; const labels = $('labels').value === 'tab';
  const [atlas, overlays] = await atlases(lang); const tone = ground === 'paper' ? 'light' : 'dark'; const R = { atlas, overlays };
  // the view: the scene's zoom and centre; a unit outside the canvas is not on the screen and is neither drawn nor counted (`offscreen` reports how many)
  const z = $('zoom').value === 'auto' ? scene.zoom : +$('zoom').value;
  const c0 = MERC(scene.lng, scene.lat, z);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (naipImg[ground]) { const im = naipImg[ground]; const k = Math.max(W / im.width, H / im.height); ctx.drawImage(im, (W - im.width * k) / 2, (H - im.height * k) / 2, im.width * k, im.height * k); } else drawGround(ctx, W, H, ground, 7);
  ctx.font = overlays.sprite('tab/dark').tab.font;
  const gaugeOn = $('gauge').checked;
  const onCanvas = scene.units.map((u) => { const p = MERC(u.lng, u.lat, z); return { u, x: p[0] - c0[0] + W / 2, y: p[1] - c0[1] + H / 2 }; }).filter((o) => o.x > 24 && o.x < W - 24 && o.y > 24 && o.y < H - 24); const offscreen = scene.units.length - onCanvas.length;
  const items = onCanvas.map((o) => ({ ...o, s: atlas.sprite(baseKey(lang, { ...o.u, state: 'fresh' })) })).filter((it) => it.s); const missing = onCanvas.length - items.length;
  for (const it of items) { const tw = labels ? Math.ceil(ctx.measureText(it.u.label).width) : 0; const b = tileBox(R, { ...it.u, state: 'fresh', showGauge: gaugeOn }, tw); it.rect = [b[0] - 3, b[1] - 3, b[2] + 3, b[3] + 3]; }     // 3 px halo for the shadow
  items.sort((a, b) => (ECHN[b.u.ech] - ECHN[a.u.ech]) || (b.u.ratio - a.u.ratio) || (a.u.id < b.u.id ? -1 : 1));
  const GAP = 3; const PIN = 8;                                                                                         // PIN: half-size (px) of the keep-out around a pin
  const LEAD = overlays.index.meta.leader.minLength; const aggMiss = new Set();
  // One pass of the greedy placement.  `pins` = the true positions of tiles that the previous pass had to move: no footprint may cover one (a pin is never hidden, and never hides a letter).
  const solve = (pins) => {
    const placed = []; const aggs = []; const stuck = [];
    const clear = (x, y, r, self = null) => !placed.some((p) => !(x + r[2] + GAP <= p.x + p.rect[0] || p.x + p.rect[2] + GAP <= x + r[0] || y + r[3] + GAP <= p.y + p.rect[1] || p.y + p.rect[3] + GAP <= y + r[1]))
      && !pins.some((q) => !(self && q.id === self.u.id && Math.hypot(x - self.x, y - self.y) < 1) && q.x > x + r[0] - PIN && q.x < x + r[2] + PIN && q.y > y + r[1] - PIN && q.y < y + r[3] + PIN);
    // a tile prefers not to cover another unit's true position (that unit's pin would then sit on it): the first search forbids it, the second allows it
    const covers = (x, y, r, self) => items.some((o) => o !== self && o.x > x + r[0] - PIN && o.x < x + r[2] + PIN && o.y > y + r[1] - PIN && o.y < y + r[3] + PIN);
    const search = (it, avoid) => {
      if (!(avoid && covers(it.x, it.y, it.rect, it)) && clear(it.x, it.y, it.rect, it)) return [it.x, it.y];
      for (let rad = 3; rad <= 150; rad += 3) { const n = Math.max(8, Math.round((2 * Math.PI * rad) / 5)); for (let k = 0; k < n; k++) { const a = (k / n) * 2 * Math.PI + 0.3; const x = it.x + Math.cos(a) * rad; const y = it.y + Math.sin(a) * rad; if (!(avoid && covers(x, y, it.rect, it)) && clear(x, y, it.rect, it)) return [x, y]; } }
      return null;
    };
    const left = [];
    for (const it of items) { it.px = it.py = undefined; const pos = search(it, true) || search(it, false); if (!pos) { left.push(it); continue; } it.px = pos[0]; it.py = pos[1]; it.disp = Math.hypot(pos[0] - it.x, pos[1] - it.y); placed.push({ x: pos[0], y: pos[1], rect: it.rect, item: it }); }
    // every unit is represented: whatever could not be a tile merges with its neighbours into an aggregate mark (side, arms present, count); the count is the number of placement records, never of men
    const aggKeyOf = (ms) => { const sides = new Set(ms.map((m) => m.u.side)); const side = sides.size === 1 ? [...sides][0] : 'mixed'; const letters = ['I', 'C', 'A', 'F'].filter((l) => ms.some((m) => LETTER[m.u.arm] === l)).join(''); return `${lang}/agg/${side}/${letters}/${ms.length >= 3 ? 3 : 2}`; };
    while (left.length) {
      const seed = left.shift(); let done = false;
      for (let radius = 90; !done && radius <= 700; radius *= 1.6) {
        const near = (o) => Math.hypot(o.x - seed.x, o.y - seed.y); const members = [seed];
        const own = (o) => o.u.side === seed.u.side;                                                                                  // a mark of one side is the common case: the seed's own side first, the other sides only when it has no company
        for (const o of [...left].filter((o) => own(o) && near(o) <= radius).sort((a, b) => near(a) - near(b))) if (members.length < 9) members.push(o);
        const pull = (pred) => { const cand = placed.filter((p) => p.item && pred(p.item) && near(p.item) <= radius * 1.5).sort((a, b) => near(a.item) - near(b.item))[0]; if (cand) members.push(cand.item); };
        if (members.length < 2) pull(own);
        if (members.length < 2) { const o = [...left].filter((o) => near(o) <= radius).sort((a, b) => near(a) - near(b))[0]; if (o) members.push(o); else pull(() => true); }
        while (members.length >= 2 && !atlas.has(aggKeyOf(members))) {                                                                // a combination the atlas does not hold is never claimed: drop a member (not the seed) until the atlas holds it
          aggMiss.add(aggKeyOf(members)); const i = members.findIndex((m, k) => k > 0 && atlas.has(aggKeyOf(members.filter((_, j) => j !== k)))); members.splice(i > 0 ? i : members.length - 1, 1); }
        if (members.length < 2) continue;
        const key = aggKeyOf(members); const sp = atlas.sprite(key); const cx = members.reduce((a, m) => a + m.x, 0) / members.length; const cy = members.reduce((a, m) => a + m.y, 0) / members.length;
        const rect = [sp.box[0] - sp.ax - 3, sp.box[1] - sp.ay - 3, sp.box[2] - sp.ax + 3, sp.box[3] - sp.ay + 3]; const freed = placed.filter((p) => p.item && members.includes(p.item)); let pos = null;
        const keep = placed.slice(); for (const f of freed) placed.splice(placed.indexOf(f), 1);                                     // members that were tiles give their room back before the mark is placed
        for (let rad = 0; !pos && rad <= 700; rad += 3) { const n = rad ? Math.max(8, Math.round((2 * Math.PI * rad) / 5)) : 1; for (let k = 0; k < n && !pos; k++) { const a = (k / n) * 2 * Math.PI + 0.3; const x = cx + Math.cos(a) * rad; const y = cy + Math.sin(a) * rad; if (clear(x, y, rect)) pos = [x, y]; } }
        if (!pos) { placed.length = 0; placed.push(...keep); continue; }
        for (const m of members) { const i = left.indexOf(m); if (i >= 0) left.splice(i, 1); m.px = m.py = undefined; }
        const ag = { key, members, x: pos[0], y: pos[1], rect }; aggs.push(ag); placed.push({ x: ag.x, y: ag.y, rect, agg: ag }); done = true;
      }
      if (!done) stuck.push(seed);
    }
    return { placed, aggs, stuck };
  };
  // iterate: the tiles that moved leave pins; those pins become keep-outs for the next pass.  The keep-out set only grows, so the passes settle: they stop when a pass moves no tile that has no pin yet (at most 8 passes).
  const pins = []; let out = solve(pins); let passes = 1;
  for (; passes < 8; passes++) {
    const fresh = out.placed.filter((p) => p.item && p.item.disp >= LEAD && !pins.some((q) => q.id === p.item.u.id)).map((p) => ({ x: p.item.x, y: p.item.y, id: p.item.u.id }));
    if (!fresh.length) break; pins.push(...fresh); out = solve(pins);
  }
  const { placed, aggs, stuck } = out;
  const tiles = placed.filter((p) => p.item).map((p) => p.item); const unplaced = stuck.map((it) => it.u.id);
  // paint: leaders under the tiles, tiles and aggregates, then the pins on top (a pin is never half hidden: either it is seen whole or it is not drawn)
  const moved = tiles.filter((it) => drawLeaderLine(ctx, overlays, [it.x, it.y], [it.px, it.py]));
  tiles.forEach((it, i) => drawTile(ctx, R, { ...it.u, state: 'fresh', selected: $('sel').checked && i === 0, showGauge: gaugeOn, label: labels ? it.u.label : null, tone }, it.px, it.py));
  for (const ag of aggs) { const t = { agg: true, side: ag.key.split('/')[2], armset: ag.key.split('/')[3], n: ag.members.length }; drawTile(ctx, R, t, ag.x, ag.y); drawCount(ctx, atlas, t, ag.x, ag.y); }
  for (const it of moved) drawPin(ctx, overlays, [it.x, it.y], it.u.side);
  // measurements: overlapping footprints, pins lying on another tile's footprint
  const boxes = placed.map((p) => [p.x + p.rect[0] + 3, p.y + p.rect[1] + 3, p.x + p.rect[2] - 3, p.y + p.rect[3] - 3]); let overlaps = 0;
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) { const a = boxes[i]; const b = boxes[j]; if (a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3]) overlaps++; }
  const pinsOnTiles = moved.filter((it) => boxes.some((b, i) => placed[i].item !== it && it.x > b[0] && it.x < b[2] && it.y > b[1] && it.y < b[3])).length;
  const aggregated = aggs.reduce((a, g) => a + g.members.length, 0); const maxDisp = Math.max(0, ...tiles.map((t) => t.disp || 0));
  const res = { lang, scene: scene.id, zoom: +z.toFixed(2), ground, labels, dpr, atlasScale: atlas.scale, atlasFile: atlas.file, units: onCanvas.length, offscreen, drawn: tiles.length, aggregates: aggs.length, aggregatedUnits: aggregated, represented: tiles.length + aggregated, missingSprites: missing, aggKeysMissing: [...aggMiss], unplaced, maxDisplacementPx: +maxDisp.toFixed(1), displacedOver6px: tiles.filter((t) => t.disp > 6).length, pinsOnTiles, passes, overlappingPairs: overlaps };
  window.__demo = res; $('stat').textContent = JSON.stringify(res, null, 1); $('info').textContent = `${res.represented}/${res.units} units: ${tiles.length} tiles + ${aggs.length} marks (${aggregated} units); overlapping pairs ${overlaps}`;
}
for (const id of ['lang', 'scene', 'zoom', 'ground', 'labels', 'gauge', 'sel']) $(id).addEventListener('change', render);
await render(); document.title = 'ready';
