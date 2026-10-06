// layout-lab/lib/tiles.mjs - turns the visible units of a frame into tile descriptors (leaf tiles, aggregate tiles).
// A tile = { key, ids[] (every unit it represents), ax, ay (anchor, world px), chipW, chipH, labelW, labelH, labelText, short,
//            side ('union'|'confederate'|'mixed'), arm, ratio (strength state), prio, kind:'leaf'|'agg', lca, n }
import { project, metresPerPx } from './data-core.mjs';
import { chipSize, labelSize } from './spec.mjs';

export const ORIGIN = { lng: -77.2377, lat: 39.8206 };      // arbitrary local origin: keeps coordinates small, layout is translation invariant
export function worldOrigin(z) { return project(ORIGIN.lng, ORIGIN.lat, z); }

const armGlyph = { infantry: 'inf', cavalry: 'cav', artillery: 'art' };

/** priority: higher = placed first = stays closest to its true position.  Fully static per unit (no flicker from re-ordering):
 *  selected >> echelon (bigger formations first) >> reference strength >> id */
export function leafPriority(u, selectedId) {
  return (u.id === selectedId ? 1e9 : 0) + u.echelon * 1e6 + Math.min(u.strengthRef, 99999);
}

/** Build leaf tiles for the visible set `vis` ([{u, st}]) at zoom z. */
export function buildLeaves(vis, z, spec, selectedId = null) {
  const [ox, oy] = worldOrigin(z);
  const leaves = [];
  for (const { u, st } of vis) {
    const [x, y] = project(st.lng, st.lat, z);
    const cs = chipSize(spec, u.short);
    const ls = labelSize(spec, u.label);
    leaves.push({
      key: u.id, kind: 'leaf', ids: [u.id], u, ax: x - ox, ay: y - oy, chipW: cs.w, chipH: cs.h, labelW: ls.w, labelH: ls.h, labelText: u.label,
      short: u.short, side: u.side, arm: u.arm, strength: st.strength, ratio: Math.min(1, (st.strength || 0) / u.strengthRef), lca: u.id, n: 1,
      echelon: u.echelon, prio: leafPriority(u, selectedId), moving: st.moving, depth: u.depth, chain: u.chain,
    });
  }
  return leaves;
}

// ---- hierarchy helpers ------------------------------------------------------------------------------------------------
const nodeShortCache = new Map();
export function nodeShort(all, id) {
  if (nodeShortCache.has(id)) return nodeShortCache.get(id);
  let s;
  const u = all.units.get(id);
  if (u) s = u.short;
  else if (id === 'ROOT') s = 'Field';
  else if (id === 'A-U') s = 'Union';
  else if (id === 'A-C') s = 'Confed.';
  else { const bare = id.replace(/^[UC]-/, ''); s = /^[IVX]+$/.test(bare) ? bare + ' Corps' : bare.replace(/-/g, '/'); }
  nodeShortCache.set(id, s); return s;
}

/** The name an aggregate shows (lab policy, the product owns the wording):
 *   - the members share a corps / division / brigade -> that formation's short code + badge "x n"     e.g. "I/1/1 x5"
 *   - they come from different corps (a spatial pile of heterogeneous units)  -> the lead member (highest echelon, then strength) + badge "+k"
 *   - both sides                                                                -> "Contact" + badge "x n"                                 */
export function aggregateName(all, lca, side, lead, n) {
  const node = all.nodes.get(lca);
  if (side === 'mixed') return { short: 'Contact', badge: '\u00d7' + n, kind: 'contact' };
  if (node && (node.kind === 'brigade' || node.kind === 'battalion' || node.kind === 'division' || node.kind === 'corps')) return { short: nodeShort(all, lca), badge: '\u00d7' + n, kind: node.kind };
  return { short: lead.short, badge: '+' + (n - 1), kind: 'lead' };
}

/** lowest common ancestor of a set of chains (chains run node -> ... -> ROOT) */
export function lcaOf(chains) {
  let cand = chains[0];
  for (let i = 1; i < chains.length; i++) {
    const set = new Set(chains[i]); cand = cand.filter((id) => set.has(id));
  }
  return cand[0] || 'ROOT';
}

/** Merge tiles (leaf or aggregate) into one aggregate tile.  Anchor = strength-weighted centroid of the member anchors, EXCEPT that when the
 *  lowest common ancestor is itself one of the members (a brigade record absorbing its own regiments) the aggregate sits on that record. */
export function makeAggregate(all, tiles, spec, createdFrame = 0) {
  const ids = []; let sw = 0; let sx = 0; let sy = 0; let prio = 0; let sr = 0; let sStr = 0; let nUnion = 0; let nConf = 0;
  const arms = new Set(); const chains = [];
  for (const t of tiles) {
    for (const id of t.ids) ids.push(id);
    const w = Math.max(1, t.strength || 1) * t.n; sw += w; sx += t.ax * w; sy += t.ay * w; prio = Math.max(prio, t.prio);
    sr += (t.ratio ?? 1) * w; sStr += (t.strength || 0) * t.n;
    for (const id of t.ids) { const u = all.units.get(id); arms.add(u.arm); chains.push(u.chain); if (u.side === 'union') nUnion++; else nConf++; }
  }
  ids.sort();
  const lca = lcaOf(chains);
  let ax = sx / sw; let ay = sy / sw;
  const own = tiles.find((t) => t.kind === 'leaf' && t.lca === lca && t.ids.length === 1);
  if (own) { ax = own.ax; ay = own.ay; }
  const side = nUnion && nConf ? 'mixed' : (nUnion ? 'union' : 'confederate');
  const n = ids.length;
  const leadTile = tiles.reduce((m, t) => (t.prio > m.prio ? t : m), tiles[0]);
  const nm = aggregateName(all, lca, side, leadTile, n);
  const short = nm.short; const badge = nm.badge;
  const cs = chipSize(spec, short, badge);
  const node = all.nodes.get(lca);
  return {
    key: 'agg:' + lca + ':' + ids[0], kind: 'agg', ids, ax, ay, chipW: cs.w, chipH: cs.h, labelW: 0, labelH: 0, labelText: null, short, badge, nameKind: nm.kind, side,
    nSides: { union: nUnion, confederate: nConf }, arm: arms.size === 1 ? [...arms][0] : 'mixed', strength: sStr, ratio: sr / sw, lca, n,
    echelon: (node && node.depth != null) ? 0 : 0, prio: prio + 5e5, depth: node ? node.depth : 0, chain: chains[0], createdFrame, members: tiles,
  };
}

export const mpp = (z) => metresPerPx(ORIGIN.lat, z);
