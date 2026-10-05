// qc/reviewer-attested.json: facts reviewers stated in prose, each anchored by a verbatim phrase. This module loads the file
// and checks every anchor against the reviewer text (a review's own fields, or a batch's summary and systemic findings).
// A phrase that cannot be found is an error: the builder refuses to run on it and the test fails on it.

const reviewText = (r) => [r.item.evidence, r.item.extraction_notes, r.item.extraction_notes_extra, r.item.extraction_notes_note, r.item.rights_basis, r.item.written, ...(r.item.issues ?? [])].filter((x) => typeof x === 'string').join('\n');
const batchText = (b, field) => (field === 'summary' ? String(b.summary ?? '') : (b.systemic_findings ?? []).join('\n'));

/**
 * @param {object} attested   parsed reviewer-attested.json
 * @param {{reviews: object[], batches: object[]}} loaded  from loadReviews()
 * @returns {{checked: number, missing: object[]}}
 */
export function checkAnchors(attested, loaded) {
  const missing = [];
  let checked = 0;
  const byReview = (n, reviewer) => loaded.reviews.find((r) => r.n === n && r.reviewer === reviewer);
  const byBatch = (id) => loaded.batches.find((b) => b.id === id);
  const groups = ['or_overlap', 'same_text', 'not_same_text', 'or_locator_corrections', 'or_locator_doubts', 'or_ocr_notes', 'known_defects_of_inputs'];
  for (const g of groups) {
    for (const a of attested[g] ?? []) {
      checked++;
      let text = '';
      if (a.reviewer) {
        const r = byReview(a.review_n ?? a.n, a.reviewer);
        text = r ? reviewText(r) : '';
      } else if (a.batch) {
        const b = byBatch(a.batch);
        text = b ? batchText(b, a.field) : '';
      }
      if (!a.phrase || !text.includes(a.phrase)) missing.push({ group: g, n: a.n ?? a.id, reviewer: a.reviewer ?? a.batch, phrase: a.phrase });
    }
  }
  return { checked, missing };
}

export function attestedIndex(attested) {
  const by = (list, key = 'n') => { const m = new Map(); for (const x of list ?? []) { if (!m.has(x[key])) m.set(x[key], []); m.get(x[key]).push(x); } return m; };
  return {
    orOverlap: new Map((attested.or_overlap ?? []).map((x) => [x.n, x])),
    sameText: by(attested.same_text),
    notSameText: by(attested.not_same_text),
    locatorCorrections: new Map((attested.or_locator_corrections ?? []).map((x) => [x.n, x])),
    locatorDoubts: by(attested.or_locator_doubts),
    ocrNotes: by(attested.or_ocr_notes),
  };
}
