// layout/tiles.mjs - turns the visible units of a frame into tile descriptors (leaf tiles, aggregate tiles).  Ported from layout-lab/lib/tiles.mjs with one
// change that matters for honesty: a unit whose side is UNKNOWN (10 ids carry the Union prefix with Confederate state codes: Contested, needs a historian) stays
// 'unknown' in every aggregate and is never counted as Union or Confederate.
//
// tile = { key, kind:'leaf'|'agg', ids[], ax, ay (true-position anchor, layout px), chipW, chipH, labelW, labelH, labelText, short, badge,
//          side 'union'|'confederate'|'unknown'|'mixed', arm, ratio (strength state), prio, lca, n, chain, st (state of a leaf), members (aggregate) }
import { project } from '../geo/project.mjs';
import { chipSize, labelSize } from './spec.mjs';

export const ORIGIN = { lng: -77.2377, lat: 39.8206 };      // arbitrary local origin: keeps numbers small; layout is translation invariant
export const worldOrigin = (z) => project(ORIGIN.lng, ORIGIN.lat, z);

/** priority: higher = placed first = stays closest to its true position.  Static per unit (no flicker from re-ordering):  selected >> echelon >> reference strength >> id */
export function leafPriority(u, selectedId) { return (u.id === selectedId ? 1e9 : 0) + u.echelon * 1e6 + Math.min(u.strengthRef, 99999); }

/** the name a mark grows into (D4 FORK).  The dataset's `label` is cut at 24 characters ("Battery A, 4th US Artil…"): a regiment, battery or battalion shows its designation from the order of battle without the
 *  nickname in brackets (the nickname stays on the unit card); a brigade, division or corps record keeps its short name when that is whole ("Harrow's Brigade"), else the designation. */
const ORD = { First: '1st', Second: '2nd', Third: '3rd', Fourth: '4th', Fifth: '5th', Sixth: '6th', Seventh: '7th', Eighth: '8th', Ninth: '9th', Tenth: '10th', Eleventh: '11th', Twelfth: '12th', Reserve: 'Reserve' };
/** "Third Brigade, Second Division, Third Corps" -> "3rd Bde, 2nd Div, 3rd Corps": ordinals as figures, Brigade and Division shortened; every word is the record's own */
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
const ORDN = { First: 1, Second: 2, Third: 3, Fourth: 4, Fifth: 5, Sixth: 6, Seventh: 7, Eighth: 8, Ninth: 9, Tenth: 10, Eleventh: 11, Twelfth: 12 };
/** a corps is written in Roman numerals ("II Corps"), the convention of both armies' orders of battle; every other ordinal is a figure ("2nd Div") */
export const corpsRoman = (s) => s.replace(/\b(?:(First|Second|Third|Fourth|Fifth|Sixth|Seventh|Eighth|Ninth|Tenth|Eleventh|Twelfth)|(\d{1,2})(?:st|nd|rd|th)) Corps\b/g, (m, w, n) => { const k = w ? ORDN[w] : +n; return ROMAN[k] ? ROMAN[k] + ' Corps' : m; });
/** "Third Brigade, Second Division, Third Corps" -> "3rd Bde, 2nd Div, III Corps": ordinals as figures (a corps in Roman numerals), Brigade and Division shortened; every word is the record's own */
export function abbreviate(s) { return corpsRoman(s).replace(/(First|Second|Third|Fourth|Fifth|Sixth|Seventh|Eighth|Ninth|Tenth|Eleventh|Twelfth)(?= (Brigade|Division))/g, (m) => ORD[m]).replace(/Brigade/g, 'Bde').replace(/Division/g, 'Div'); }
export function nameOf(u) {
  const full = u.designation ? u.designation.replace(/\s*\([^)]*\)\s*$/, '') : null; const lab = u.label || '';
  if (u.kind === 'brigade' || u.kind === 'division' || u.kind === 'corps' || u.kind === 'army') return corpsRoman(/…$/.test(lab) ? abbreviate(full || lab.replace(/…$/, '')) : lab);
  return full || lab.replace(/…$/, '');
}

/** leaf tiles for the visible set `vis` ([{u, st}]) at zoom z */
export function buildLeaves(vis, z, spec, selectedId = null) {
  const [ox, oy] = worldOrigin(z);
  const leaves = [];
  for (const { u, st } of vis) {
    const [x, y] = project(st.lng, st.lat, z);
    const memo = spec._sz || (spec._sz = new Map()); let sz = memo.get(u.id); if (!sz) memo.set(u.id, sz = (() => { const cs = chipSize(spec, u.short, null, { unit: u, kind: u.kind, side: u.side, arm: u.arm, echelon: u.echelon }); return { cs, ls: labelSize(spec, nameOf(u), cs), name: nameOf(u) }; })());      // text widths of a unit never change while the spec is the same
    const cs = sz.cs; const ls = sz.ls;
    leaves.push({
      key: u.id, kind: 'leaf', ids: [u.id], u, st, px: x - ox, py: y - oy, hx: cs.hx || 0, hy: cs.hy || 0, ax: x - ox + (cs.hx || 0), ay: y - oy + (cs.hy || 0), chipW: cs.w, chipH: cs.h, labelW: ls.w, labelH: ls.h, labelText: sz.name,
      short: u.short, side: u.side, arm: u.arm, strength: st.strength, ratio: st.ratio, lca: u.id, n: 1, echelon: u.echelon, prio: leafPriority(u, selectedId),
      moving: st.moving, depth: u.depth, chain: u.chain,
    });
  }
  return leaves;
}

// ---- hierarchy helpers ------------------------------------------------------------------------------------------------
const shortCache = new WeakMap();
export function nodeShort(all, id) {
  let cache = shortCache.get(all); if (!cache) shortCache.set(all, cache = new Map());
  if (cache.has(id)) return cache.get(id);
  let s; const u = all.units.get(id);
  if (u) s = u.short;
  else if (id === 'ROOT') s = 'Field';
  else if (id === 'A-U') s = 'Union';
  else if (id === 'A-C') s = 'Confed.';
  else { const bare = id.replace(/^[UC]-/, ''); s = /^[IVX]+$/.test(bare) ? bare + ' Corps' : bare.replace(/-/g, '/'); }
  cache.set(id, s); return s;
}

/** The name a crowd shows (D4 round 1: in words, from the order of battle, never a lead record and a plus, never the word "Contact": the data records no engagement).
 *   both Union and Confederate members           -> "Both sides"
 *   members share a brigade, division or corps    -> that formation's own name ("Harrow's Brigade", "1st Div, 2nd Corps", "2nd Corps")
 *   same side, different corps                    -> the corps in words ("1st & 11th Corps"), or "Union, 4 corps" when there are more than two
 *   same side, no formation on record             -> "Confederate, no formation on record"
 *  The number beside it (the mark's count) is how many placement records the crowd stands for. */
const FORMATION_KIND = new Set(['brigade', 'division', 'corps']);
const nickOf = (d) => { const m = /\(([^)]+)\)\s*$/.exec(d || ''); return m ? m[1] : null; };
/** a node's name in the words of its own designation: "Second Corps" -> "2nd Corps"; "First Division, Second Corps" -> "1st Div, 2nd Corps"; "First Brigade, First Division, First Corps (Iron Brigade)" -> "Iron Brigade" */
const NAME_CACHE = new WeakMap();
export function nodeName(all, id) {
  let c = NAME_CACHE.get(all); if (!c) NAME_CACHE.set(all, c = new Map()); if (c.has(id)) return c.get(id);
  const v = nodeName0(all, id); c.set(id, v); return v;
}
function nodeName0(all, id) {
  const u = all.units.get(id); if (u && FORMATION_KIND.has(u.kind)) { const nm = nameOf(u); if (nm) return nm; }
  const n = all.nodes.get(id); if (!n || !n.designation) return null;
  const d = n.designation; const nick = nickOf(d); const bare = d.replace(/\s*\([^)]*\)\s*$/, '');
  if (n.kind === 'brigade') { if (/^(First|Second|Third|Fourth|Fifth|Sixth|Seventh|Eighth|Ninth|Tenth) Brigade/.test(bare)) return nick && /Brigade|Bde/.test(nick) ? nick : abbreviate(bare); return abbreviate(bare); }
  return abbreviate(bare);
}
const romanRank = (id) => { const i = ROMAN.indexOf(String(id).replace(/^[UC]-/, '')); return i > 0 ? i : 99; };
const corpsOf = (all, chain) => { for (const id of chain) { const n = all.nodes.get(id); if (n && n.kind === 'corps') return id; } return null; };
export function aggregateName(all, lca, side, sides, lead, n, units = []) {
  if (sides.union && sides.confederate) return { short: 'Both sides', badge: String(n), kind: 'both' };
  if (side === 'mixed') return { short: (sides.union ? 'Union' : 'Confederate') + ', ' + sides.unknown + ' contested', badge: String(n), kind: 'both' };
  if (side === 'unknown') return { short: 'Side contested', badge: String(n), kind: 'both' };
  const node = all.nodes.get(lca);
  if (node && FORMATION_KIND.has(node.kind)) { const w = nodeName(all, lca); if (w) return { short: w, badge: String(n), kind: node.kind }; }
  const sideWord = side === 'union' ? 'Union' : 'Confederate'; const corps = new Set(); let orphans = 0;
  for (const u of units) { const c = corpsOf(all, u.chain); if (c) corps.add(c); else orphans++; }
  if (corps.size >= 1 && corps.size <= 3) { const nm = [...corps].sort((x, y) => romanRank(x) - romanRank(y)).map((c) => (nodeName(all, c) || c).replace(/ Corps$/, '')); const head = nm.length === 1 ? nm[0] : nm.slice(0, -1).join(', ') + ' & ' + nm[nm.length - 1]; return { short: head + ' Corps' + (orphans ? ' & others' : ''), badge: String(n), kind: 'side' }; }
  if (corps.size > 3) return { short: `${sideWord}, ${corps.size} corps`, badge: String(n), kind: 'side' };
  return { short: `${sideWord}, no formation`, badge: String(n), kind: 'side' };
}

/** lowest common ancestor of a set of chains (each runs node -> ... -> ROOT) */
export function lcaOf(chains) {
  let cand = chains[0];
  for (let i = 1; i < chains.length; i++) { const set = new Set(chains[i]); cand = cand.filter((id) => set.has(id)); }
  return cand[0] || 'ROOT';
}

/** the leaf tiles an aggregate (or a leaf) stands for */
export function leavesOf(t, out = []) { if (t.kind === 'leaf') out.push(t); else for (const m of t.members) leavesOf(m, out); return out; }

/** Merge tiles (leaf or aggregate) into one aggregate tile.  Every property of the result is a pure function of the SET OF LEAF UNITS it stands for, never of how it was assembled
 *  (the lab version weighted nested aggregates by n and raised their priority by 5e5 per nesting level, so re-creating an aggregate from its leaves, which sticky aggregates do every frame,
 *  moved it by tens of pixels: measured by test/layout.test.mjs "an aggregate is the same tile however it was assembled").
 *  Anchor = strength-weighted centroid of the leaf anchors, EXCEPT that when the lowest common ancestor is itself one of the leaves (a brigade record absorbing its own regiments)
 *  the aggregate sits on that record. */
export function makeAggregate(all, tiles, spec, createdFrame = 0) {
  const leaves = []; for (const t of tiles) leavesOf(t, leaves);
  leaves.sort((a, b) => (a.key < b.key ? -1 : 1));
  const ids = leaves.map((l) => l.ids[0]);
  let sw = 0; let sx = 0; let sy = 0; let prio = 0; let sr = 0; let sStr = 0;      // sx, sy: strength-weighted sum of the TRUE positions (px, py); the tile's own anchor adds its own home offset (hx, hy) below
  const sides = { union: 0, confederate: 0, unknown: 0 }; const arms = new Set(); const chains = [];
  for (const l of leaves) {
    const w = Math.max(1, l.strength || 1); sw += w; sx += l.px * w; sy += l.py * w; prio = Math.max(prio, l.prio); sr += (l.ratio ?? 1) * w; sStr += (l.strength || 0);
    const u = all.units.get(l.ids[0]); arms.add(u.arm); chains.push(u.chain); sides[u.side] = (sides[u.side] || 0) + 1;
  }
  const lca = lcaOf(chains);
  let px = sx / sw; let py = sy / sw;
  const own = leaves.find((l) => l.lca === lca);
  if (own) { px = own.px; py = own.py; }
  const present = ['union', 'confederate', 'unknown'].filter((k) => sides[k] > 0);
  const side = present.length > 1 ? 'mixed' : present[0];
  const n = ids.length;
  const leadTile = leaves.reduce((m, t) => (t.prio > m.prio ? t : m), leaves[0]);
  const nm = aggregateName(all, lca, side, sides, leadTile, n, leaves.map((l) => all.units.get(l.ids[0])));
  const cs = chipSize(spec, nm.short, nm.badge, { agg: true, n, side, kind: nm.kind, nameKind: nm.kind, sides });
  const ax = px + (cs.hx || 0); const ay = py + (cs.hy || 0);
  const node = all.nodes.get(lca);
  return {
    key: 'agg:' + lca + ':' + ids[0], kind: 'agg', ids, px, py, hx: cs.hx || 0, hy: cs.hy || 0, ax, ay, chipW: cs.w, chipH: cs.h, labelW: 0, labelH: 0, labelText: null, short: nm.short, badge: nm.badge, nameKind: nm.kind, side,
    nSides: sides, arm: arms.size === 1 ? [...arms][0] : 'mixed', strength: sStr, ratio: sr / sw, lca, n, echelon: 0, prio: prio + 5e5, depth: node ? node.depth : 0, chain: chains[0], createdFrame, members: tiles,
  };
}

/** Move a solved tile to the NEW true positions of its units without re-solving (the same formulas as makeAggregate).  leafMap: unit id -> a fresh leaf tile from buildLeaves. */
export function refreshTile(t, leafMap) {
  const fresh = (x) => { const l = leafMap.get(x.ids[0]); x.ax = l.ax; x.ay = l.ay; x.px = l.px; x.py = l.py; x.st = l.st; x.strength = l.strength; x.ratio = l.ratio; x.moving = l.moving; };
  if (t.kind === 'leaf') { fresh(t); return t; }
  const leaves = leavesOf(t); let sw = 0; let sx = 0; let sy = 0; let sr = 0; let sStr = 0;
  for (const l of leaves) { fresh(l); const w = Math.max(1, l.strength || 1); sw += w; sx += l.px * w; sy += l.py * w; sr += (l.ratio ?? 1) * w; sStr += (l.strength || 0); }
  const own = leaves.find((l) => l.lca === t.lca);
  t.px = own ? own.px : sx / sw; t.py = own ? own.py : sy / sw; t.ax = t.px + (t.hx || 0); t.ay = t.py + (t.hy || 0); t.ratio = sr / sw; t.strength = sStr;
  return t;
}

/** flatten an aggregate's members to leaf anchors: [{id, ax, ay}] (used to draw the true positions of the records an aggregate stands for) */
export function leafAnchors(tile, out = []) {
  if (tile.kind === 'leaf') { out.push({ id: tile.ids[0], ax: tile.px, ay: tile.py }); return out; }
  for (const m of tile.members) leafAnchors(m, out);
  return out;
}
