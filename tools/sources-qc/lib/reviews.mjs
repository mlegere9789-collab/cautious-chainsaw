// Loads every reviewer output on disk into one flat list of reviews, one per (reviewer batch, entry).
//
// Nothing here judges anything and nothing is retyped: each review keeps the reviewer's own fields untouched in `item`,
// plus a stable id, the file it came from and the batch it was produced in, so every registry fact can point back at it.
//
// Files (all under data-src/sources-v2/qc/):
//   review-pass1.json, review-pass2.json          the first partial run: flat arrays, entries 586-597 (two reviewers)
//   review-pass1-r2.json, review-pass2-r2.json    arrays of batches {batch, phase, summary, systemic_findings, items[]}
//                                                  pass 1: R1n-0..8 (first-pass reviews of the other works), R2-audit-A
//                                                          (Official Records description audit), R3-audit-A (Part XIII sample)
//                                                  pass 2: A-nonOR-* (second reviews of the other works), A-OR-* (second
//                                                          audit of Official Records entries and Part XIII pages)
//   r3/pass1-a.json, pass1-b.json, pass2-a.json, pass2-b.json   the 14 other works missed earlier (objects with items[])
//
// Two reviews of the same entry from different batches are independent reviewers; the same batch never appears twice
// for one entry (the loader refuses a duplicate).

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const REVIEW_FILES = [
  { file: 'review-pass1.json', shape: 'flat', pass: 1, round: 'r1', batch: 'r1-pass1' },
  { file: 'review-pass2.json', shape: 'flat', pass: 2, round: 'r1', batch: 'r1-pass2' },
  { file: 'review-pass1-r2.json', shape: 'batches', pass: 1, round: 'r2' },
  { file: 'review-pass2-r2.json', shape: 'batches', pass: 2, round: 'r2' },
  { file: 'r3/pass1-a.json', shape: 'object', pass: 1, round: 'r3', batch: 'r3-pass1-a' },
  { file: 'r3/pass1-b.json', shape: 'object', pass: 1, round: 'r3', batch: 'r3-pass1-b' },
  { file: 'r3/pass2-a.json', shape: 'object', pass: 2, round: 'r3', batch: 'r3-pass2-a' },
  { file: 'r3/pass2-b.json', shape: 'object', pass: 2, round: 'r3', batch: 'r3-pass2-b' },
];

/** which entries a batch reviewed: non_or = other works (544-657), or_report, or_page, beyond = numbers past the list */
export function entryKindOfN(n, listLength = 1714) {
  if (n >= 1 && n <= 543) return 'or_report';
  if (n >= 544 && n <= 657) return 'non_or';
  if (n >= 658 && n <= listLength) return 'or_page';
  return 'beyond_list';
}

/**
 * @param {(relPath: string) => any} readJson  reads a JSON file relative to data-src/sources-v2/qc
 * @returns {{reviews: object[], batches: object[], files: string[]}}
 */
export function loadReviews(readJson) {
  const reviews = [];
  const batches = [];
  const seen = new Set();
  for (const spec of REVIEW_FILES) {
    const doc = readJson(spec.file);
    const groups = spec.shape === 'flat' ? [{ batch: spec.batch, summary: null, systemic_findings: [], items: doc }]
      : spec.shape === 'object' ? [{ batch: spec.batch, summary: doc.summary, systemic_findings: doc.systemic_findings ?? [], items: doc.items, meta: { batch_label: doc.batch, date: doc.date } }]
        : doc;
    for (const g of groups) {
      const batchId = `${spec.round}/${spec.pass === 1 ? 'p1' : 'p2'}/${g.batch}`;
      batches.push({ id: batchId, file: spec.file, pass: spec.pass, round: spec.round, batch: g.batch, phase: g.phase ?? null, summary: g.summary ?? null, systemic_findings: g.systemic_findings ?? [], items: g.items.length, meta: g.meta ?? null });
      for (const it of g.items) {
        const key = `${batchId}#${it.n}`;
        if (seen.has(key)) throw new Error(`duplicate review ${key}`);
        seen.add(key);
        reviews.push({
          id: `${batchId}#${it.n}`,
          reviewer: batchId,
          n: it.n,
          pass: spec.pass,
          round: spec.round,
          batch: g.batch,
          phase: g.phase ?? null,
          file: spec.file,
          ref: `data-src/sources-v2/qc/${spec.file}#${spec.shape === 'batches' ? `batch=${g.batch};` : ''}n=${it.n}`,
          item: it,
        });
      }
    }
  }
  return { reviews, batches, files: REVIEW_FILES.map((f) => f.file) };
}

/** a reader rooted at the sources-v2 qc directory, for the CLI and the tests */
export function makeReader(root) {
  return (rel) => JSON.parse(readFileSync(join(root, 'data-src', 'sources-v2', 'qc', rel), 'utf8'));
}

export function reviewsFor(reviews, n) {
  return reviews.filter((r) => r.n === n);
}

export function filesPresent(root) {
  return REVIEW_FILES.filter((f) => existsSync(join(root, 'data-src', 'sources-v2', 'qc', f.file))).map((f) => f.file);
}
