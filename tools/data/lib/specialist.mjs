// Comparison of this suite's findings with the keys a specialist report LISTS (not just its count).
// "The specialist quotes 6, we found 6" is a statement about counts; whether the two sets are the same is a statement about keys, and only
// the second may be called a reproduction. Used by the baseline report (G003 vs qa-ci DV-07).

/** qa-ci DV-07 (docs/plan/specialists/qa-ci.md, table row "DV-07 ... FAIL 6 candidates"), as `unit|fromTick-toTick`, keys in the shape of G003's. */
export const SPECIALIST_DV07 = {
  source: 'docs/plan/specialists/qa-ci.md (DV-07 row: U-8NY-CAV t3->t4, U-I-2-2 t52->53, U-8IL t1->3, C-I-3-3 t550->551, U-20ME t264->265, C-7TN t9->14)',
  keys: ['U-8NY-CAV|3-4', 'U-I-2-2|52-53', 'U-8IL|1-3', 'C-I-3-3|550-551', 'U-20ME|264-265', 'C-7TN|9-14'],
};

/**
 * @param {string[]} ours    keys this suite found
 * @param {string[]} theirs  keys the specialist listed
 * @returns {{matched:string[], ours_only:string[], theirs_only:string[], all_match:boolean, sentence:string}}
 * `sentence` says "reproduced" only when the two key sets are identical; otherwise "k of n keys match".
 */
export function compareKeySets(ours, theirs) {
  const o = new Set(ours), t = new Set(theirs);
  const matched = [...t].filter((k) => o.has(k)).sort();
  const ours_only = [...o].filter((k) => !t.has(k)).sort();
  const theirs_only = [...t].filter((k) => !o.has(k)).sort();
  const all_match = ours_only.length === 0 && theirs_only.length === 0;
  const sentence = all_match
    ? `reproduced: the same ${t.size} keys`
    : `${matched.length} of the specialist's ${t.size} keys match (this suite finds ${o.size})`;
  return { matched, ours_only, theirs_only, all_match, sentence };
}

/**
 * Why a DV-07 key is on one side only, read from the data: a (unit,tick) key that several files state with different coordinates is
 * resolved here by last-writer-wins (the order the app applies the files); a prototype that walks every raw row sees the other one.
 * @returns {string} an evidence sentence, or "cause not established"
 */
export function explainDv07Difference(ctx, key) {
  const [unit, span] = key.split('|');
  const [a, b] = String(span).split('-').map(Number);
  const dups = ctx.conflicts.filter((c) => c.unit_id === unit && (c.tick === a || c.tick === b));
  if (!dups.length) return `${key}: cause not established (no duplicate (unit,tick) key at either end of the pair)`;
  const parts = dups.map((c) => {
    const last = c.rows[c.rows.length - 1];
    const same = c.rows.every((r) => r.lat === c.rows[0].lat && r.lng === c.rows[0].lng);
    return `(${unit}, tick ${c.tick}) is stated ${c.rows.length} times${same ? '' : ' with different coordinates'} (${c.rows.map((r) => r.file).join(', ')}); the merged track keeps the last, ${last.file}`;
  });
  return `${key}: ${parts.join('; ')}`;
}
