// runtime/atlas.mjs - the ONLY code that goes with the atlas: load, pick a scale, find a sprite, draw it.  No dependencies, no SVG, no fonts, no layout: everything heavy happened at build time.
//
//   const atlas = await loadAtlas('/symbols/', 'shield', { dpr: devicePixelRatio });      // fetches shield.json and shield@Nx.png, N = the smallest shipped scale >= dpr
//   const overlays = await loadAtlas('/symbols/', 'overlays', { dpr });
//   drawTile(ctx, { atlas, overlays }, tile, x, y);                                        // (x, y) = the unit's TRUE POSITION in CSS px; ctx scale is 1 (the atlas already holds the pixels for the density)
//
// A tile is the plain object a skin already has:  { side, arm, ech, state: 'fresh'|'carried', disposition?, ratio?, idOnly?, badge?: 'II/red', selected?, hover?, alpha? }
// or an aggregate:                                  { agg: true, side, armset: 'IA', n: 7, alpha? }
// Keys, chips and bins are the same strings build.mjs wrote; this file only builds them.  Evidence labels of every group are in index.evidence.
//
// A moved tile: drawLeader(ctx, overlays, from, to, side) draws the pin at the true position and the leader line to the tile, from tokens leader.* stored in overlays.json (index.meta), so every skin draws them the same way.

export const SCALES = [1, 2, 3];
export const pickScale = (dpr, scales = SCALES) => scales.find((s) => s >= dpr - 1e-6) ?? scales[scales.length - 1];

export const baseKey = (lang, t) => `${lang}/base/${t.side}/${t.arm}/${t.ech}/${t.state || 'fresh'}`;
export const aggKey = (lang, t) => `${lang}/agg/${t.side}/${t.armset}/${t.n >= 3 ? 3 : 2}`;
export const ringKey = (lang, kind, sil) => `${lang}/ring/${kind}/${sil}`;
/** dataset disposition -> chip name; null = the plain symbol (Line of Battle, Mounted Cavalry, Deployed Artillery) */
export const CHIP_OF_DISPOSITION = { 'Line of Battle': null, 'Charging Line': 'charge', 'Chaotic Retreat': 'retreat', 'Line of March': 'march', 'Skirmish Line': 'skirmish', Reserve: 'reserve', Bivouac: 'bivouac', 'Mounted Cavalry': null, 'Dismounted Cavalry': 'dismounted', 'Deployed Artillery': null, 'Limbered Artillery': 'limbered' };
/** strength ratio 0..1 -> gauge segments lit (0..4), in quartiles: no false precision for a Modelled value */
export const gaugeLevel = (ratio) => Math.max(0, Math.min(4, Math.round(Math.max(0, Math.min(1, ratio)) * 4)));
/** the arms present among an aggregate's members -> the armset letters in the fixed order I C A F */
export const armsetOf = (arms) => ['I', 'C', 'A', 'F'].filter((l) => arms.has(l)).join('');

function loadImage(url) { return new Promise((ok, no) => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => no(new Error('cannot load ' + url)); im.src = url; }); }

/** can this browser decode WebP?  (a canvas that can encode it can decode it) */
export const canWebp = () => { try { return document.createElement('canvas').toDataURL('image/webp').startsWith('data:image/webp'); } catch { return false; } };

/** webp: true loads the lossless WebP of the atlas when the build wrote one (index.filesWebp): the same pixels in about a quarter of the bytes (results/webp-pack.json).  The default is the PNG, which every browser decodes. */
export async function loadAtlas(baseUrl, id, { dpr = 1, webp = false, fetchJson = (u) => fetch(u).then((r) => r.json()), image = loadImage } = {}) {
  const index = await fetchJson(`${baseUrl}${id}.json`); const scale = pickScale(dpr, index.scales); const file = webp && index.filesWebp && index.filesWebp[scale] ? index.filesWebp[scale] : index.files[scale]; const img = await image(`${baseUrl}${file}`);
  const a = makeAtlas(index, img, scale); a.file = file; return a;
}
export function makeAtlas(index, img, scale) {
  return {
    id: index.atlas, index, scale, img,
    has: (key) => key in index.sprites,
    sprite: (key) => index.sprites[key] || null,
    /** draw sprite `key` with its anchor at (x, y) (CSS px).  Pixel-snapped on the device grid so a settled tile stays crisp. */
    draw(ctx, key, x, y, alpha = 1) {
      const s = index.sprites[key]; if (!s) return false; const k = scale;
      const dx = Math.round((x - s.ax) * k) / k; const dy = Math.round((y - s.ay) * k) / k;                       // snap the top-left corner to a device pixel (anchors are whole units)
      if (alpha !== 1) { const a = ctx.globalAlpha; ctx.globalAlpha = a * alpha; ctx.drawImage(img, s.x * k, s.y * k, s.w * k, s.h * k, dx, dy, s.w, s.h); ctx.globalAlpha = a; } else ctx.drawImage(img, s.x * k, s.y * k, s.w * k, s.h * k, dx, dy, s.w, s.h);
      return true;
    },
  };
}

/** the label tab: a pill tucked behind the symbol, three slices of one sprite (left cap, a stretched middle, right cap), the text drawn at runtime.
 *  base = the base sprite record (for its tab anchor).  Returns the tab rectangle in CSS px (for the layout and hit testing): { x0, y0, x1, y1 }. */
export function drawTab(ctx, overlays, base, text, x, y, { tone = 'dark', alpha = 1 } = {}) {
  const key = `tab/${tone}`; const s = overlays.sprite(key); if (!s || !base) return null; const m = s.tab; const k = overlays.scale;
  ctx.save(); ctx.font = m.font; const tw = ctx.measureText(text).width; ctx.restore();
  const pillW = Math.ceil(m.tuck + m.padX + tw + m.padX); const bodyMid = Math.max(m.midW, pillW - 2 * m.cap);
  const X0 = Math.round((x - base.ax + base.anchors.tab[0]) * k) / k; const Y = Math.round((y - base.ay + base.anchors.tab[1]) * k) / k; const oy = Y - s.ay;
  const a0 = ctx.globalAlpha; ctx.globalAlpha = a0 * alpha;
  const sx = s.x * k; const sy = s.y * k; const sh = s.h * k;
  ctx.drawImage(overlays.img, sx, sy, m.leftW * k, sh, X0 - s.ax, oy, m.leftW, s.h);                                                                                  // left cap (with its shadow margin)
  ctx.drawImage(overlays.img, sx + m.leftW * k, sy, m.midW * k, sh, X0 - s.ax + m.leftW, oy, bodyMid, s.h);                                                           // the stretched middle
  ctx.drawImage(overlays.img, sx + (m.leftW + m.midW) * k, sy, m.rightW * k, sh, X0 - s.ax + m.leftW + bodyMid, oy, m.rightW, s.h);                                   // right cap
  ctx.globalAlpha = a0;
  ctx.save(); ctx.font = m.font; ctx.fillStyle = m.text; ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.globalAlpha = a0 * alpha; ctx.fillText(text, X0 + m.tuck + m.padX, Y + 0.5); ctx.restore();
  return { x0: X0, y0: Y - m.h / 2, x1: X0 + 2 * m.cap + bodyMid, y1: Y + m.h / 2 };
}

/** the chip a tile wears: the identity chip when the unit has no order-of-battle record, else the chip of its disposition (null = none) */
export const chipOf = (t) => (t.idOnly ? 'idonly' : CHIP_OF_DISPOSITION[t.disposition] || null);
/** the anchors a label tab should use for this tile: with a chip the pill tucks behind the chip too, so the chip never covers a letter */
export const tabAnchor = (s, withChip) => (withChip && s.anchors.tabChip ? s.anchors.tabChip : s.anchors.tab);

/** one tile with all its layers, in the order a skin should paint them: ring (under), base, chip, gauge, badge.  Returns the base sprite record (for hit testing: its core box). */
export function drawTile(ctx, { atlas, overlays }, t, x, y) {
  const a = t.alpha ?? 1; const lang = atlas.id;
  if (t.agg) { const key = aggKey(lang, t); atlas.draw(ctx, key, x, y, a); return atlas.sprite(key); }
  const key = baseKey(lang, t); const s = atlas.sprite(key); if (!s) return null;
  const chip = chipOf(t);
  if (t.label) drawTab(ctx, { sprite: (k) => overlays.sprite(k), img: overlays.img, scale: overlays.scale }, { ...s, anchors: { ...s.anchors, tab: tabAnchor(s, !!(chip && overlays.has(`chip/${chip}`))) } }, t.label, x, y, { tone: t.tone || 'dark', alpha: a });          // behind the symbol and the chip: the pill tucks under their edge
  const ring = t.selected ? 'select' : t.hover ? 'hover' : null; if (ring) atlas.draw(ctx, ringKey(lang, ring, s.sil), x, y, a);
  atlas.draw(ctx, key, x, y, a);
  const ox = x - s.ax; const oy = y - s.ay;
  if (chip && overlays.has(`chip/${chip}`)) { const c = overlays.sprite(`chip/${chip}`); overlays.draw(ctx, `chip/${chip}`, ox + s.anchors.ne[0], oy + s.anchors.ne[1], a); }
  if (t.ratio != null && t.showGauge) { const g = overlays.sprite(`gauge/${gaugeLevel(t.ratio)}`); overlays.draw(ctx, `gauge/${gaugeLevel(t.ratio)}`, ox + s.anchors.below[0], oy + s.anchors.below[1] + g.h / 2 - 0.5, a); }
  if (t.badge && overlays.has(`badge/${t.badge}`)) { const b = overlays.sprite(`badge/${t.badge}`); overlays.draw(ctx, `badge/${t.badge}`, ox + s.anchors.left[0] - (b.w / 2 - 2), oy + s.anchors.left[1], a); }
  return s;
}

/** write the count into an aggregate's count slot (the one thing the atlas cannot hold): the slot geometry and font come from the index */
export function drawCount(ctx, atlas, t, x, y) {
  const s = atlas.sprite(aggKey(atlas.id, t)); if (!s) return; const c = s.slots.count;
  ctx.save(); ctx.font = c.font; ctx.fillStyle = c.colour; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; if (t.alpha != null) ctx.globalAlpha *= t.alpha;
  ctx.fillText('×' + t.n, x - s.ax + c.x + c.w / 2, y - s.ay + c.y + c.h / 2 + 0.5, c.w); ctx.restore();
}

/** a moved tile is joined to its true position by a leader line (paint it UNDER the tiles) and a pin (paint it ON TOP of the tiles, so a pin is seen whole or not at all, never as a sliver).
 *  `from` = the true position, `to` = the tile's anchor, both CSS px; the numbers come from overlays.index.meta.leader (tokens leader.*), so the line is one design in every skin.
 *  A tile moved less than leader.minLength gets neither: drawLeaderLine returns false and the skin skips the pin. */
export function drawLeaderLine(ctx, overlays, from, to, alpha = 1) {
  const L = overlays.index.meta && overlays.index.meta.leader; if (!L) return false;
  if (Math.hypot(to[0] - from[0], to[1] - from[1]) < L.minLength) return false;
  const a0 = ctx.globalAlpha; ctx.globalAlpha = a0 * alpha * L.alpha; ctx.lineCap = 'round';
  ctx.strokeStyle = L.keylineColour; ctx.lineWidth = L.width + 2 * L.keyline; ctx.beginPath(); ctx.moveTo(from[0], from[1]); ctx.lineTo(to[0], to[1]); ctx.stroke();
  ctx.strokeStyle = L.boneColour; ctx.lineWidth = L.width; ctx.stroke(); ctx.globalAlpha = a0; return true;
}
export const pinKey = (side) => `pin/${side === 'confederate' || side === 'unknown' ? side : 'union'}`;
export function drawPin(ctx, overlays, at, side, alpha = 1) { return overlays.draw(ctx, pinKey(side), at[0], at[1], alpha); }
/** both at once, for a skin that does not need the two z-orders */
export function drawLeader(ctx, overlays, from, to, side, alpha = 1) { if (!drawLeaderLine(ctx, overlays, from, to, alpha)) return false; drawPin(ctx, overlays, from, side, alpha); return true; }

/** the footprint of a tile with the layers it actually wears, relative to its anchor (the true position), in CSS px: [x0, y0, x1, y1].  A layout engine reserves exactly this so that tiles never overlap:
 *  the symbol (with its echelon marks), the chip it wears, the gauge when shown, the corps badge, and the label tab for a text `labelWidth` (CSS px, measured with the tab font; 0 = no label).
 *  The same placements drawTile uses, so the box and the pixels cannot drift apart. */
export function tileBox({ atlas, overlays }, t, labelWidth = 0) {
  const s = atlas.sprite(baseKey(atlas.id, t)); if (!s) return null;
  let r = [s.box[0] - s.ax, s.box[1] - s.ay, s.box[2] - s.ax, s.box[3] - s.ay];
  const U = (b) => { r = [Math.min(r[0], b[0]), Math.min(r[1], b[1]), Math.max(r[2], b[2]), Math.max(r[3], b[3])]; };
  const around = (o, cx, cy) => [o.core[0] - o.ax + cx, o.core[1] - o.ay + cy, o.core[2] - o.ax + cx, o.core[3] - o.ay + cy];       // a sprite's solid core, placed with its anchor at (cx, cy) relative to the tile anchor
  const chip = chipOf(t); const hasChip = !!(chip && overlays.has(`chip/${chip}`));
  if (hasChip) U(around(overlays.sprite(`chip/${chip}`), s.anchors.ne[0] - s.ax, s.anchors.ne[1] - s.ay));
  if (t.ratio != null && t.showGauge) { const key = `gauge/${gaugeLevel(t.ratio)}`; const g = overlays.sprite(key); if (g) U(around(g, s.anchors.below[0] - s.ax, s.anchors.below[1] - s.ay + g.h / 2 - 0.5)); }
  if (t.badge && overlays.has(`badge/${t.badge}`)) { const b = overlays.sprite(`badge/${t.badge}`); U(around(b, s.anchors.left[0] - s.ax - (b.w / 2 - 2), s.anchors.left[1] - s.ay)); }
  if (labelWidth > 0) { const tab = overlays.sprite('tab/dark'); const m = tab.tab; const ta = tabAnchor(s, hasChip); const x0 = ta[0] - s.ax; U([x0, ta[1] - s.ay - m.h / 2, x0 + Math.ceil(m.tuck + m.padX + labelWidth + m.padX), ta[1] - s.ay + m.h / 2]); }
  return r;
}
