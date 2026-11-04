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
/** one vocabulary on the map: a brigade is "Bde" and a division "Div" everywhere (the cards spell them out); a corps is in Roman numerals */
export const mapWords = (s) => s.replace(/Brigade/g, 'Bde').replace(/Division/g, 'Div');
const ordinal = (n) => { const k = +n; if (!k) return String(n); const t = k % 100; return k + (t >= 11 && t <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][k % 10] || 'th'); };
/** the words of a formation id that the order of battle does not list ("C-III-4-2": the 2nd brigade of the 4th division of the Third Corps): the name is read from the id, and drawn in italic (identity Unknown) */
export function nameFromId(id) {
  const m = /^[UC]-(CAV|[IVX]+)-(\d+)(?:-(\d+|R))?$/.exec(id); if (m) { const corps = m[1] === 'CAV' ? 'Cavalry Corps' : m[1] + ' Corps'; const div = ordinal(m[2]) + ' Div'; return m[3] ? `${m[3] === 'R' ? 'Reserve' : ordinal(m[3])} Bde, ${div}, ${corps}` : `${div}, ${corps}`; }
  const d = /^[UC]-(\d+)-([IVX]+)$/.exec(id); return d ? `${ordinal(d[1])} Div, ${d[2]} Corps` : null;
}
/** the code a unit shows beside its disc: the dataset's `short`, tidied where it is a raw id (a trailing slash, a cut word, a slash between words); every code that is already a figure and a state ("53 VA") is unchanged */
export function codeOf(u) {
  let s = u.short || ''; const id = u.id || '';
  if (/^[UC]-ART-/.test(id)) return id.replace(/^[UC]-ART-/, '').replace(/-/g, ' ').replace(/ bn$/, ' Bn');                       // "Alexande" -> "Alexander", "Pegram-b" -> "Pegram Bn"
  if (u.inOob) return s;
  s = s.replace(/^[IVX]+\/\d\//, '').replace(/\/+$/, '').replace(/\/(INF|SHB)$/, ' $1').replace(/\/bde$/i, ' Bde').replace(/(?<=[A-Za-z])\/(?=[A-Za-z])/g, ' ').replace(/^(\d+)([A-Z]{2})\b/, '$1 $2').replace(/^(\d+)([A-Z]{2})([A-Za-z]*)$/, '$1 $2');
  return s || u.short;
}
export function nameOf(u) {
  const full =u.designation ? u.designation.replace(/\s*\([^)]*\)\s*$/, '') : null; const lab = u.label || '';
  if (!full && (u.kind === 'brigade' || u.kind === 'division') && /^[UC]-/.test(u.id)) { const n = nameFromId(u.id); if (n) return n; }
  if (full && /commanding/.test(lab) && (u.kind === 'brigade' || u.kind === 'division')) return mapWords(abbreviate(full));      // "Lang commanding" names a man, not the brigade: the brigade is Perry's
  if (u.kind === 'brigade' || u.kind === 'division' || u.kind === 'corps' || u.kind === 'army') return mapWords(corpsRoman(/…$/.test(lab) ? abbreviate(full || lab.replace(/…$/, '')) : lab));
  return full || (u.inOob ? lab.replace(/…$/, '') : codeOf(u));
}
const FORMATION_RECORD = new Set(['brigade', 'division', 'corps', 'army']);
/** the text a mark carries inside its own box: a formation record its name (never a Roman code), a unit nothing (its code is a label that takes free ground; its name grows on hover and selection) */
/** the text a tile carries inside its own box: a formation its name, a unit nothing (its code is a label of the display layer) -- for a skin that sizes its own marks; a skin that does not (the copy-me template) keeps the first prototype's chip, code inside */
export const tileTextOf = (u, spec) => (spec && !spec.skinSize ? (u.short || String(u.id)) : FORMATION_RECORD.has(u.kind) ? nameOf(u) : '');

/** leaf tiles for the visible set `vis` ([{u, st}]) at zoom z */
export function buildLeaves(vis, z, spec, selectedId = null) {
  const [ox, oy] = worldOrigin(z);
  const leaves = [];
  for (const { u, st } of vis) {
    const [x, y] = project(st.lng, st.lat, z);
    const lod = spec.lodOf ? spec.lodOf(z) : 1; const memo = spec._sz || (spec._sz = new Map()); const mk = u.id + '|' + lod; let sz = memo.get(mk); if (!sz) memo.set(mk, sz = (() => { const text = tileTextOf(u, spec); const cs = chipSize(spec, text, null, { unit: u, kind: u.kind, side: u.side, arm: u.arm, echelon: u.echelon, idOnly: !u.inOob, lod }); return { cs, ls: labelSize(spec, nameOf(u), cs, codeOf(u)), name: nameOf(u), text }; })());      // text widths of a unit never change while the spec is the same
    const cs = sz.cs; const ls = sz.ls;
    leaves.push({
      key: u.id, kind: 'leaf', ids: [u.id], u, st, px: x - ox, py: y - oy, hx: cs.hx || 0, hy: cs.hy || 0, ax: x - ox + (cs.hx || 0), ay: y - oy + (cs.hy || 0), chipW: cs.w, chipH: cs.h, mw: cs.frameW, mh: cs.frameH, labelW: ls.w, labelCW: ls.cw || 0, labelH: ls.h, labelText: sz.name, text: sz.text,
      short: codeOf(u), side: u.side, arm: u.arm, strength: st.strength, ratio: st.ratio, lca: u.id, n: 1, echelon: u.echelon, prio: leafPriority(u, selectedId),
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

/** The name a crowd shows (D4 round 2: ONE pattern, "who  ·  what", from the order of battle; never "& others", never "no formation", never a lead record and a plus, never "Contact").
 *   who  = the formation all its records belong to (a brigade, division or corps by its own name); else the corps of its records (one, two, or "N corps"); else, for records the order of battle
 *          gives no parent (95 of 478), the states in their codes ("NC, VA"); records of both armies: the two counts; a contested record is counted apart and is never a side.
 *   what = what the records are, by count, the two largest kinds: inf, cav, art (regiments, batteries, battalions) and bde, div, corps (formation records).
 *  The mark's own number is how many placement records the crowd stands for (Computed).  A crowd of one formation that does not hold all of it says how much of it: "3 of 5" is not claimed, only what is here. */
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
  if (n.kind === 'brigade') { if (/^(First|Second|Third|Fourth|Fifth|Sixth|Seventh|Eighth|Ninth|Tenth) Brigade/.test(bare)) return mapWords(nick && /Brigade|Bde/.test(nick) ? nick : abbreviate(bare)); return mapWords(abbreviate(bare)); }
  return mapWords(abbreviate(bare));
}
const romanRank = (id) => { const i = ROMAN.indexOf(String(id).replace(/^[UC]-/, '')); return i > 0 ? i : 99; };
const corpsOf = (all, chain) => { for (const id of chain) { const n = all.nodes.get(id); if (n && n.kind === 'corps') return id; } return null; };
/** the corps a record belongs to: through its chain, else (the 95 records the order of battle gives no parent: "U-VI-1-1", "U-I-1-19IN", "C-II-4", "U-2-I") through the corps its own id names */
const corpsOfUnit = (all, u) => { const c = corpsOf(all, u.chain); if (c) return c; const id = u.id || ''; const m = /^([UC])-(CAV|[IVX]+)-\d/.exec(id) || /^([UC])-\d+-([IVX]+)$/.exec(id); if (!m) return null; const k = m[1] + '-' + m[2]; return all.nodes.has(k) ? k : null; };
const ARM_TAG = { infantry: 'inf', cavalry: 'cav', artillery: 'art' }; const FORM_TAG = { brigade: 'bde', division: 'div', corps: 'corps', army: 'army' };
const stateOf = (u) => { const m = /^(?:[UC]-)?\d+\s*([A-Z]{2})/.exec((u.short || '').toUpperCase()) || /^(?:[UC]-)?\d*([A-Z]{2})\d*[A-Z]?$/.exec((u.id || '').replace(/^[UC]-/, '').toUpperCase()); return m ? m[1] : null; };
/** the "what" of a crowd (its second line): all of its records by kind, the largest first, at most three kinds and the rest counted ("9 inf, 3 art"; "12 Union, 9 Confed.") */
export function composition(units) {
  const n = new Map(); for (const u of units) { const k = FORM_TAG[u.kind] || ARM_TAG[u.arm] || 'unit'; n.set(k, (n.get(k) || 0) + 1); }
  const rows = [...n.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)); const head = rows.slice(0, 3).map(([k, c]) => `${c} ${k}`); const rest = rows.slice(3).reduce((s, r) => s + r[1], 0);
  return head.join(', ') + (rest ? `, ${rest} other` : '');
}
const sidesLine = (units) => { const c = { union: 0, confederate: 0, unknown: 0 }; for (const u of units) c[u.side === 'union' || u.side === 'confederate' ? u.side : 'unknown']++; return [c.union && `${c.union} Union`, c.confederate && `${c.confederate} Confed.`, c.unknown && `${c.unknown} contested`].filter(Boolean).join(', '); };
/** The name a crowd shows, in two lines, ONE pattern: WHO (the first line) and WHAT (the second), every word from the order of battle and the records, never a lead record and a plus, never "& others", never "no formation", never "Contact".
 *   who   all the records belong to one formation ........ "in Hall's Bde" (a crowd never takes the name of the standard of that formation: it says "in")
 *         most of them to one corps (a corps or two) ..... "II Corps, 6 of 9" (the residual is stated: 3 of the 9 are not in it)
 *         no majority; the records have state codes ..... the states in their codes ("NC, VA, GA"), or "5 states"
 *         both armies ................................... "Both armies"; one army and some contested records "Union + 2 contested"
 *   what  the kinds of ALL its records ................... "9 inf, 3 art" (regiments, batteries, formation records: bde, div, corps); for both armies "12 Union, 9 Confed."
 *  The mark's own number is how many placement records the crowd stands for (Computed): the second line adds up to it. */
export function aggregateName(all, lca, side, sides, lead, n, units = []) {
  const fit = (x) => (x.length > 24 && x.startsWith('in ') ? x.replace(/, (?:[IVX]+|Cavalry) Corps(?=$|, )/, '') : x);        // a name of more than 24 characters loses its corps (the second line and the neighbours say the rest): a crowd is as wide as its name, and a wide mark takes the room its neighbours need
  const mk = (short, kind, detail) => ({ short: fit(short), badge: String(n), kind, detail: detail || composition(units) });
  if (sides.union && sides.confederate) return mk('Both armies', 'both', sidesLine(units));
  if (side === 'mixed') return mk(`${sides.union ? 'Union' : 'Confed.'} + ${sides.unknown} contested`, 'both');
  if (side === 'unknown') return mk('Contested', 'both');
  const node = all.nodes.get(lca);
  if (node && FORMATION_KIND.has(node.kind)) {
    const w = nodeName(all, lca);
    if (w) {
      // a crowd of one division or corps says which of its parts it holds (two crowds of one corps are two different marks): "1st + 3rd Div, II Corps", "Kemper's + Garnett's Bde"
      if (node.kind !== 'brigade') {
        const kids = new Set(); for (const u of units) { const i = u.chain.indexOf(lca); if (i > 0) kids.add(u.chain[i - 1]); }
        if (kids.size >= 2 && kids.size <= 3) {
          const nm = [...kids].map((k) => nodeName(all, k)); const corpsTail = node.kind === 'corps' ? ', ' + w.replace(/^in /, '') : '';
          if (nm.every(Boolean)) { const clean = nm.map((x) => x.replace(/, (?:[IVX]+|Cavalry) Corps$/, '')); const suf = /(?: Bde| Div)$/.exec(clean[0]); if (suf && clean.every((x) => x.endsWith(suf[0]))) { const head = clean.map((x) => x.slice(0, -suf[0].length)); const out = head.join(' + ') + suf[0] + corpsTail; if (out.length <= 30) return mk(out, node.kind); } }
        }
      }
      return mk('in ' + w, node.kind);
    }
  }
  const per = new Map(); let orphans = 0; for (const u of units) { const c = corpsOfUnit(all, u); if (c) per.set(c, (per.get(c) || 0) + 1); else orphans++; }
  const ranked = [...per.entries()].sort((a, b) => b[1] - a[1] || romanRank(a[0]) - romanRank(b[0])); const corpsWords = (ids) => ids.sort((x, y) => romanRank(x) - romanRank(y)).map((c) => (nodeName(all, c) || c).replace(/ Corps$/, '')).join(' + ') + ' Corps';
  if (ranked.length) {
    const inCorps = n - orphans;
    if (ranked.length <= 2 && !orphans) return mk(corpsWords(ranked.map((r) => r[0])), 'side');                                                              // every record in one corps or two
    if (ranked[0][1] * 2 >= n) return mk(`${corpsWords([ranked[0][0]])}, ${ranked[0][1]} of ${n}`, 'side');                                               // most in one corps: say how many
    if (ranked.length <= 3 && inCorps * 2 >= n) return mk(corpsWords(ranked.map((r) => r[0])) + (orphans ? `, ${inCorps} of ${n}` : ''), 'side');
  }
  const st = [...new Set(units.map(stateOf).filter(Boolean))].sort();
  const who = st.length && st.length <= 3 ? st.join(', ') : st.length ? `${st.length} states` : ranked.length > 3 ? `${ranked.length} corps` : (side === 'union' ? 'Union' : 'Confed.');
  return mk(who, 'free');
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
  const cs = chipSize(spec, nm.short, nm.badge, { agg: true, detail: nm.detail, n, side, kind: nm.kind, nameKind: nm.kind, sides, lod: spec.lodOf ? spec.lodOf(spec.zoom) : 1 });
  const ax = px + (cs.hx || 0); const ay = py + (cs.hy || 0);
  const node = all.nodes.get(lca);
  return {
    key: 'agg:' + lca + ':' + ids[0], kind: 'agg', ids, px, py, hx: cs.hx || 0, hy: cs.hy || 0, ax, ay, chipW: cs.w, chipH: cs.h, mw: cs.frameW, mh: cs.frameH, labelW: 0, labelH: 0, labelText: null, short: nm.short, detail: nm.detail, badge: nm.badge, nameKind: nm.kind, side,
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
