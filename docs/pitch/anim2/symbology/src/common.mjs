// src/common.mjs - the vocabulary every frame language shares: what a symbol can say (the data's own values), the honest names, the shared paint (gradients, shadow, carried look) and token helpers.
import { Sprite, el, n2, rings, ringReach } from './svg.mjs';
import { mix } from './colour.mjs';

/** what the data really has (docs/pitch/anim/03-data-fuel.md E01-E03, E11; prototype src/skins/semantics.mjs).  `evidence` is the site's vocabulary. */
export const SIDES = ['union', 'confederate', 'unknown', 'mixed'];                 // unknown = the 10 ids whose state code contradicts the prefix (Contested); mixed = an aggregate of more than one side (Computed)
export const ARMS = ['infantry', 'cavalry', 'artillery', 'horse_artillery', 'sharpshooter', 'formation'];   // registry arms (5) + formation (brigade, division, corps: the data gives no arm)
export const ECHELONS = ['battery', 'regiment', 'battalion', 'brigade', 'division', 'corps', 'army'];     // registry kinds (battery, regiment, battalion, brigade, division, corps) + army (nodes A-U / A-C, never placed)
export const STATES = ['fresh', 'carried'];                                                                 // carried = the position is a carried-forward keyframe (E14)
export const ARM_SET_ORDER = ['infantry', 'cavalry', 'artillery'];

export const LABEL = {
  side: { union: 'Union', confederate: 'Confederate', unknown: 'Side unknown (contested)', mixed: 'Both sides (Contact)' },
  arm: { infantry: 'Infantry', cavalry: 'Cavalry', artillery: 'Artillery', horse_artillery: 'Horse artillery', sharpshooter: 'Sharpshooters', formation: 'Formation (no arm in the data)' },
  ech: { battery: 'Battery', regiment: 'Regiment', battalion: 'Battalion', brigade: 'Brigade', division: 'Division', corps: 'Corps', army: 'Army' },
};
/** registry kind -> the echelon drawn.  A registry "regiment" with arm artillery stays a regiment; a "battalion" is an artillery battalion. */
export const ECH_OF_KIND = { battery: 'battery', regiment: 'regiment', battalion: 'battalion', brigade: 'brigade', division: 'division', corps: 'corps', army: 'army' };
export const isFormationEch = (e) => e === 'brigade' || e === 'division' || e === 'corps' || e === 'army';

/** the sprite key of a base symbol */
export const baseKey = (lang, s) => `${lang}/base/${s.side}/${s.arm}/${s.ech}/${s.state || 'fresh'}`;
export const aggKey = (lang, s) => `${lang}/agg/${s.side}/${s.armset}/${s.tier}`;

// ---- token helpers ----------------------------------------------------------------------------------------------------------------------------------------
export const isLeaf = (o) => o && typeof o === 'object' && '$value' in o;
/** strip the $value / $description wrapper of a token tree into a plain object tree of values */
export function plain(tree) {
  if (isLeaf(tree)) return tree.$value;
  if (Array.isArray(tree)) return tree.map(plain);
  if (tree && typeof tree === 'object') { const o = {}; for (const [k, v] of Object.entries(tree)) if (!k.startsWith('$')) o[k] = plain(v); return o; }
  return tree;
}
export function deepMerge(a, b) {
  if (b === undefined) return a; if (a === undefined) return b;
  if (isLeaf(a) && isLeaf(b)) return { ...a, ...b };
  if (isLeaf(a) && !isLeaf(b) && typeof b !== 'object') return { ...a, $value: b };
  if (a && b && typeof a === 'object' && typeof b === 'object' && !Array.isArray(a) && !Array.isArray(b)) { const o = { ...a }; for (const k of Object.keys(b)) o[k] = deepMerge(a[k], b[k]); return o; }
  return b;
}
/** resolve a token file into the plain object a language reads: T.palette.union, T.ring.light, T.nato.frame.w ...; `paletteName` picks palettes.<name>, overrides = a partial token tree */
export function resolveTokens(file, { palette = 'standard', overrides = null } = {}) {
  let t = file; if (overrides) t = deepMerge(file, overrides);
  const P = plain(t); if (!P.palettes[palette]) throw new Error(`unknown palette "${palette}"; the token file has: ${Object.keys(P.palettes).join(', ')}`);
  const out = { ...P }; out.palette = { ...P.palettes[palette] }; out.paletteName = palette; return out;
}

// ---- paint -------------------------------------------------------------------------------------------------------------------------------------------------
export const lift = (hex, k) => mix(hex, '#ffffff', k);
export const sink = (hex, k) => mix(hex, '#000000', k);
/** the colour of a side (the contested side has its own paint) */
export const sideColour = (T, side) => (side === 'union' ? T.palette.union : side === 'confederate' ? T.palette.confederate : side === 'unknown' ? T.palette.unknown : T.palette.union);
/** glyph ink for a side: white on the two armies, dark on the contested gold */
export const inkOn = (T, side) => (side === 'unknown' ? T.palette.inkOnUnknown : T.palette.ink);

/** a vertical top-lit gradient; returns the url() reference and registers the def */
export function gradient(sp, hex, T, { split = null } = {}) {
  const id = sp.uid('g');
  if (split) {          // two-colour plate: left half colour A, right half colour B, hard edge in the middle
    sp.def(`<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="0"><stop offset="0.5" stop-color="${split[0]}"/><stop offset="0.5" stop-color="${split[1]}"/></linearGradient>`);
    return `url(#${id})`;
  }
  const k = T.fill.lift; if (!k) return hex;
  sp.def(`<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${lift(hex, k)}"/><stop offset="1" stop-color="${hex}"/></linearGradient>`);
  return `url(#${id})`;
}
/** soft contact shadow filter */
export function shadowFilter(sp, T) {
  const id = sp.uid('s'); const S = T.shadow;
  sp.def(`<filter id="${id}" x="-30%" y="-30%" width="160%" height="170%" color-interpolation-filters="sRGB"><feDropShadow dx="0" dy="${S.dy}" stdDeviation="${S.blur}" flood-color="${T.palette.keyline}" flood-opacity="${S.alpha}"/></filter>`);
  return `url(#${id})`;
}
/** extra margin a shadow needs around a silhouette that reaches `reach` units */
export const shadowBleed = (T) => Math.ceil(T.shadow.blur * 3 + T.shadow.dy);

/** WHERE THE STATUS CHIP SITS (the `ne` anchor).  One rule for every language and every silhouette: the chip is a notification-style badge on the north-east corner.  Walk it along the diagonal that leaves the corner of
 *  the symbol's box, from inside the box outward, and stop at the first position (the closest to the symbol) where
 *    1. the chip body is at least `chip.clearance` u away from the glyph ink box and from the echelon marks (a chip never covers an arm glyph or an echelon mark), and
 *    2. the chip's outer circle (body plus its rings) covers at most `chip.maxCoverage` of the symbol's silhouette (a chip is a badge on the symbol, never a lid over it).
 *  `sdf(x, y)` = signed distance to the silhouette (negative inside); `corner` = [x, y] of the box corner; `box` = { left, top, right, bottom }; `ink` / `strip` = [x0, y0, x1, y1] or null.  Pure geometry, local coordinates (u). */
export function chipCentre({ corner, sdf, box, ink = null, strip = null, T }) {
  const C = T.chip; const reach = ringReach(T); const need = C.size / 2 + C.clearance; const outer = C.size / 2 + reach; const step = 0.5;
  const pts = []; for (let y = box.top - reach; y <= box.bottom + reach; y += step) for (let x = box.left - reach; x <= box.right + reach; x += step) if (sdf(x, y) <= reach) pts.push([x, y]);
  const dist = (r, x, y) => Math.hypot(Math.max(r[0] - x, 0, x - r[2]), Math.max(r[1] - y, 0, y - r[3]));
  for (let s = -8; s <= 60; s += 0.25) {
    const x = corner[0] + s; const y = corner[1] - s; if ((ink && dist(ink, x, y) < need) || (strip && dist(strip, x, y) < need)) continue;
    let both = 0; for (const p of pts) if ((p[0] - x) ** 2 + (p[1] - y) ** 2 <= outer * outer) both++;
    if (both / pts.length <= C.maxCoverage) return [Math.round(x * 4) / 4, Math.round(y * 4) / 4];
  }
  throw new Error('chipCentre: no position found');
}
/** the label tab's anchor when a chip is drawn: the pill tucks behind the chip too, so the text starts after the chip's outer ring and the chip never covers a letter */
export const tabAnchorWithChip = (tab, ne, T) => [Math.max(tab[0], ne[0] + T.chip.size / 2 + ringReach(T) - T.tab.tuck), tab[1]];

/** the carried-forward look (E14): a calmer, greyer plate with a dotted light ring and no shadow, so it recedes behind fresh reports without disappearing */
export function carriedFill(T, hex) { return mix(hex, T.palette.carriedGrey, T.carried.mix); }

/** paint one plate: shadow, rings, fill.  `d` = silhouette path in local coordinates.  Returns the svg and the reach of the rings. */
export function plate(sp, d, { side, state, T, fillOverride = null, split = null, noShadow = false, tintBack = 0 }) {
  let base = sideColour(T, side); const carried = state === 'carried';
  if (tintBack) { base = sink(base, tintBack); if (split) split = split.map((c) => sink(c, tintBack)); }
  let out = '';
  if (!carried && !noShadow && T.shadow.alpha > 0) out += el('g', { filter: shadowFilter(sp, T) }, el('path', { d, fill: base, stroke: base, strokeWidth: 2 * ringReach(T), strokeLinejoin: 'round' }));
  out += rings(d, T, carried ? { dash: T.carried.ringDash, lightAlpha: 0.95 } : {});
  let paint;
  if (fillOverride) paint = fillOverride;
  else if (split) paint = gradient(sp, base, T, { split: carried ? split.map((c) => carriedFill(T, c)) : split });
  else paint = carried ? carriedFill(T, base) : gradient(sp, base, T);
  out += el('path', { d, fill: paint, fillOpacity: carried ? T.carried.fillOpacity : undefined });
  return out;
}

export { Sprite, el, n2 };
