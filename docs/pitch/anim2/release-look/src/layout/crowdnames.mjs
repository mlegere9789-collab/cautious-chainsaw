// layout/crowdnames.mjs - UNIQUE WORDS FOR CROWDS (director fix 9).  Two flags on the screen may never carry the same words: "Pickett's Div, 1st Corps" on three crowds, "2nd Corps" on two, "both armies" on two read as one
// thing repeated.  A crowd whose words equal another visible crowd's gets one more word that says WHICH part of the line it is: where it stands among the crowds that share its words, "north" / "south" (or "west" /
// "east") for two, "north" / "centre" / "south" for three, "part 2 of 4" beyond.  Everything is derived from the true positions of the crowds (the strength-weighted centre of the units each one stands for), nothing is invented.
// The words are part of the crowd's footprint (the layout reads them in makeAggregate through spec.crowdSuffix), so the box that is reserved is the box that is drawn.  The assignment is kept while the same crowds share
// the same words (no flicker as a crowd drifts a few pixels), and is made again when one joins, leaves or merges.
import { compactName } from './words.mjs';
const MARGIN = 40; const TTL = 600; const FORMATION = new Set(['brigade', 'division', 'corps', 'army']);
/** @param {Array} placed  layout.solve's placed list  @param {{dx:number,dy:number,w:number,h:number}} view  @param {{suffix:Map<string,string>}} state  @returns {boolean} true when the assignment changed */
export function updateCrowdSuffixes(placed, view, state, now = 0) {
  const groups = new Map();
  for (const p of placed) {
    const t = p.t; let words = null; let fixed = false;
    if (t.kind === 'agg') { if (!t.baseShort) continue; words = t.baseName || t.baseShort; }                 // the words the flag shows: a crowd's name where it has one, else its short words
    else if (t.kind === 'leaf' && t.u && FORMATION.has(t.u.kind)) { words = compactName(t.u, true); fixed = true; }      // a formation record's own flag carries the same words as the crowd of its units: it keeps them, the crowd says which part it is
    if (!words) continue;
    void view; void MARGIN;      // the whole field is grouped, not only what the camera shows: a crowd's words do not change as the map is panned (a filter by the view left stale words on crowds that entered and left it)
    let g = groups.get(words); if (!g) groups.set(words, g = []); g.push({ t, fixed, key: t.key, side: t.side, px: t.px, py: t.py });      // ordered by TRUE position (the centre of the units each stands for), not by where the layout displaced the flag: the words do not depend on the layout's choices
  }
  // The set of crowds that carry words only GROWS while they stand (a crowd that has words keeps them when its twin leaves, until it has been gone for TTL frames): taking words away widened and narrowed a crowd's box
  // in turn and set the layout oscillating (measured: widths 124 -> 152 -> 124, one tile drifting 1.9 px a frame, the engine never idle).  What the words SAY is recomputed from where the crowds stand.
  const prev = state.suffix; const seen = state.suffixSeen || (state.suffixSeen = new Map()); const next = new Map(prev);
  for (const p of placed) if (p.t.kind === 'agg') seen.set(p.t.key, now);
  const SIDE = { union: 'Union', confederate: 'Confederate', unknown: 'contested', mixed: 'both armies' };
  for (const g of groups.values()) {
    if (g.length < 2 || !g.some((m) => !m.fixed)) continue;
    g.sort((a, b) => (a.key < b.key ? -1 : 1));
    // 1. the same words on the two armies ("2nd Corps": the Union's and the Confederate's) are told apart by the army
    const sides = new Set(g.map((t) => t.side)); const armyWord = (t) => (sides.size > 1 ? SIDE[t.side] || null : null);
    // 2. the same words on the same army are told apart by where they stand among their namesakes
    const bySide = new Map(); for (const t of g) { let q = bySide.get(t.side); if (!q) bySide.set(t.side, q = []); q.push(t); }
    for (const q of bySide.values()) {
      if (q.length < 2) { for (const t of q) if (!t.fixed) next.set(t.key, armyWord(t) || 'regiments'); continue; }
      const xs = q.map((t) => t.px); const ys = q.map((t) => t.py); const vertical = Math.max(...ys) - Math.min(...ys) >= Math.max(...xs) - Math.min(...xs);
      const order = q.map((t, i) => i).sort((a, b) => ((vertical ? ys[a] - ys[b] : xs[a] - xs[b]) || (q[a].key < q[b].key ? -1 : 1)));
      const ends = vertical ? ['north', 'south'] : ['west', 'east']; const k = q.length;
      order.forEach((qi, rank) => { const where = k === 2 ? ends[rank] : k === 3 ? (rank === 0 ? ends[0] : rank === 2 ? ends[1] : 'centre') : `part ${rank + 1} of ${k}`; const aw = armyWord(q[qi]); if (!q[qi].fixed) next.set(q[qi].key, aw ? aw + ', ' + where : where); });
    }
  }
  // (words of a crowd long gone are dropped below, silently: they cannot change any box that is on the screen)
  let changed = next.size !== prev.size; if (!changed) for (const [k, v] of next) if (prev.get(k) !== v) { changed = true; break; }
  if (changed) { prev.clear(); for (const [k, v] of next) prev.set(k, v); }
  for (const k of [...prev.keys()]) if (now - (seen.get(k) ?? -1e9) > TTL) { prev.delete(k); seen.delete(k); }
  return changed;
}
