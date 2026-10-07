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

/** leaf tiles for the visible set `vis` ([{u, st}]) at zoom z.  FORK: a skin whose selection is only a ring at this zoom (sizer.selects(z) false) does not give the selected unit the top priority either: the priority
 *  re-ordered the greedy placement and dissolved crowds all over a dense field (measured: 46 to 105 marks moved after one click at zoom 11 to 13.5, tools/probes/select-motion.mjs); a unit inside a crowd is then shown by the ring on the crowd's standard. */
export function buildLeaves(vis, z, spec, selectedId = null) {
  const [ox, oy] = worldOrigin(z);
  const leaves = [];
  for (const { u, st } of vis) {
    const [x, y] = project(st.lng, st.lat, z);
    const memo = spec._sz || (spec._sz = new Map()); const sel = selectedId != null && u.id === selectedId;
    const mk = spec.sizer ? u.id + '|' + spec.sizer.key(u, z, sel) : u.id;                    // FORK: the footprint of a unit depends on the detail level of the zoom and on selection (the same object growing)
    let sz = memo.get(mk); if (!sz) memo.set(mk, sz = spec.sizer ? { cs: spec.sizer.leaf(spec, u, z, sel), ls: { w: 0, h: 0 } } : { cs: chipSize(spec, u.short), ls: labelSize(spec, u.label) });      // text widths of a unit never change while the spec is the same
    const cs = sz.cs; const ls = sz.ls;
    leaves.push({
      key: u.id, kind: 'leaf', ids: [u.id], u, st, ax: x - ox, ay: y - oy, chipW: cs.w, chipH: cs.h, labelW: ls.w, labelH: ls.h, labelText: u.label,
      short: u.short, side: u.side, arm: u.arm, strength: st.strength, ratio: st.ratio, lca: u.id, n: 1, echelon: u.echelon, prio: leafPriority(u, spec.sizer && spec.sizer.selects && !spec.sizer.selects(z) ? null : selectedId),
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

/** The name an aggregate shows (the product owns the final wording).  FORK (d1, after PITCH-REVIEW on "Contact" and "lead"): the badge is the plain count of placement records, never "x n" or "+k",
 *  and the lettering says only what the members share, never an engagement the data does not record:
 *   both Union and Confederate members            -> "Both sides"            (they stand close together; the data records no fight)
 *   members share a brigade / division / corps    -> that formation's short code (and its name, when the order of battle has one)
 *   anything else on one side                     -> "Union" / "Confed." / "Side unknown"   (several formations of one side)  */
export function aggregateName(all, lca, side, sides, lead, n, leaves = null) {
  if (sides.union && sides.confederate) return { short: 'Both sides', badge: String(n), kind: 'contact' };
  const node = all.nodes.get(lca);
  if (side !== 'mixed' && node && ['brigade', 'battalion', 'division', 'corps'].includes(node.kind)) return { short: nodeShort(all, lca), name: formationName(all, lca), badge: String(n), kind: node.kind };
  return { short: scopeName(all, side, leaves), badge: String(n), kind: 'scope' };
}

const CORPS_RE = /^[UC]-(XII|XI|X|IX|VIII|VII|VI|IV|V|III|II|I)(?:-|$)/; const ROMAN = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10, XI: 11, XII: 12 };
/** what several formations of one side have in common: the corps they belong to ("I, XI Corps"), read from the order-of-battle chains of the members; "Union" / "Confed." when no member's chain names a corps */
function scopeName(all, side, leaves) {
  const side0 = side === 'union' ? 'Union' : side === 'confederate' ? 'Confed.' : 'Side unknown';
  if (!leaves || side === 'unknown') return side0;
  const set = new Set(); let unplaced = 0;
  for (const l of leaves) { const u = all.units.get(l.ids[0]); let r = null; for (const id of (u && u.chain) || []) { const m = CORPS_RE.exec(id); if (m) { r = m[1]; break; } } if (r) set.add(r); else unplaced++; }
  if (!set.size) return side0;
  const list = [...set].sort((a, b) => ROMAN[a] - ROMAN[b]);
  return (list.length > 3 ? `${list.length} corps` : list.join(', ') + ' Corps') + (unplaced ? ' +' + unplaced : '');      // "II Corps +2": two more units whose chain names no corps (known by their id alone)
}

/** the order of battle's own name of a formation, for the label of an aggregate at close zoom: the record's label when the data has a real name ("Harrow's Bde"), else null */
export function formationName(all, id) {
  const u = all.units.get(id); if (u && u.label && u.label !== u.short && u.label !== id) return compactDesignation((u.label.includes('…') || u.kind === 'battalion') && u.designation ? u.designation : u.label);      // FORK: the data cuts 25 of the 157 formation labels at 24 characters with an ellipsis ("3rd Bde, 3rd Div, 1st C…"): the designation says it whole; a battalion is named by its designation as its own mark is (the label of C-ART-III-2 reads "Heth's Div")
  return null;
}

const ORD = { First: '1st', Second: '2nd', Third: '3rd', Fourth: '4th', Fifth: '5th', Sixth: '6th', Seventh: '7th', Eighth: '8th', Ninth: '9th', Tenth: '10th', Eleventh: '11th', Twelfth: '12th' };
/** a designation as the map says it: the trailing parenthesis dropped (the card carries it), ordinals as numerals, Brigade / Division as Bde / Div, "Volunteer " dropped */
export function compactDesignation(full) {
  return full.replace(/\s*\([^)]*\)\s*$/, '').replace(/\b(First|Second|Third|Fourth|Fifth|Sixth|Seventh|Eighth|Ninth|Tenth|Eleventh|Twelfth)\b/g, (m) => ORD[m]).replace(/\bBrigade\b/g, 'Bde').replace(/\bDivision\b/g, 'Div').replace(/\bVolunteer /g, '');
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
  let sw = 0; let sx = 0; let sy = 0; let prio = 0; let sr = 0; let sStr = 0;
  const sides = { union: 0, confederate: 0, unknown: 0 }; const arms = new Set(); const chains = [];
  for (const l of leaves) {
    const w = Math.max(1, l.strength || 1); sw += w; sx += l.ax * w; sy += l.ay * w; prio = Math.max(prio, l.prio); sr += (l.ratio ?? 1) * w; sStr += (l.strength || 0);
    const u = all.units.get(l.ids[0]); arms.add(u.arm); chains.push(u.chain); sides[u.side] = (sides[u.side] || 0) + 1;
  }
  const lca = lcaOf(chains);
  let ax = sx / sw; let ay = sy / sw;
  const own = leaves.find((l) => l.lca === lca);
  if (own) { ax = own.ax; ay = own.ay; }
  const present = ['union', 'confederate', 'unknown'].filter((k) => sides[k] > 0);
  const side = present.length > 1 ? 'mixed' : present[0];
  const n = ids.length;
  const leadTile = leaves.reduce((m, t) => (t.prio > m.prio ? t : m), leaves[0]);
  const nm = aggregateName(all, lca, side, sides, leadTile, n, leaves);
  const cs = spec.sizer ? spec.sizer.agg(spec, { short: nm.short, name: nm.name, badge: nm.badge, kind: nm.kind, side, n, zoom: spec.zoom }) : chipSize(spec, nm.short, nm.badge);
  const node = all.nodes.get(lca);
  return {
    key: 'agg:' + lca + ':' + ids[0], kind: 'agg', ids, ax, ay, chipW: cs.w, chipH: cs.h, labelW: 0, labelH: 0, labelText: null, short: nm.short, fname: nm.name || null, badge: nm.badge, nameKind: nm.kind, side,
    nSides: sides, arm: arms.size === 1 ? [...arms][0] : 'mixed', strength: sStr, ratio: sr / sw, lca, n, echelon: 0, prio: prio + 5e5, depth: node ? node.depth : 0, chain: chains[0], createdFrame, members: tiles,
  };
}

/** Move a solved tile to the NEW true positions of its units without re-solving (the same formulas as makeAggregate).  leafMap: unit id -> a fresh leaf tile from buildLeaves. */
export function refreshTile(t, leafMap) {
  const fresh = (x) => { const l = leafMap.get(x.ids[0]); x.ax = l.ax; x.ay = l.ay; x.st = l.st; x.strength = l.strength; x.ratio = l.ratio; x.moving = l.moving; };
  if (t.kind === 'leaf') { fresh(t); return t; }
  const leaves = leavesOf(t); let sw = 0; let sx = 0; let sy = 0; let sr = 0; let sStr = 0;
  for (const l of leaves) { fresh(l); const w = Math.max(1, l.strength || 1); sw += w; sx += l.ax * w; sy += l.ay * w; sr += (l.ratio ?? 1) * w; sStr += (l.strength || 0); }
  const own = leaves.find((l) => l.lca === t.lca);
  t.ax = own ? own.ax : sx / sw; t.ay = own ? own.ay : sy / sw; t.ratio = sr / sw; t.strength = sStr;
  return t;
}

/** flatten an aggregate's members to leaf anchors: [{id, ax, ay}] (used to draw the true positions of the records an aggregate stands for) */
export function leafAnchors(tile, out = []) {
  if (tile.kind === 'leaf') { out.push({ id: tile.ids[0], ax: tile.ax, ay: tile.ay }); return out; }
  for (const m of tile.members) leafAnchors(m, out);
  return out;
}
