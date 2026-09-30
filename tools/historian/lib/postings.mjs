// postings.mjs - passage BM25 postings (impact8), lexicon, entity postings.
import { contentStems, bucketOf } from '../../../historian-src/core/text.js';
import { encodeDeltaPairs } from '../../../historian-src/core/codec.js';

export const IX_BUCKETS = 128;
export const EN_BUCKETS = 32;
export const K1P = 1.2, BP = 0.75;

export function buildPostings(P) {
  const N = P.length;
  const tfs = P.map((p) => { const m = new Map(); for (const t of contentStems(p.text)) m.set(t, (m.get(t) || 0) + 1); return m; });
  const lens = tfs.map((m) => { let s = 0; for (const v of m.values()) s += v; return s; });
  const avg = lens.reduce((a, b) => a + b, 0) / Math.max(1, N);
  const df = new Map();
  for (const m of tfs) for (const t of m.keys()) df.set(t, (df.get(t) || 0) + 1);
  const raw = new Map(); // term -> [[num, impact]]
  let maxImpact = 0;
  tfs.forEach((m, n) => {
    for (const [t, tf] of m) {
      const idf = Math.log(1 + (N - df.get(t) + 0.5) / (df.get(t) + 0.5));
      const imp = idf * tf * (K1P + 1) / (tf + K1P * (1 - BP + BP * lens[n] / avg));
      if (imp > maxImpact) maxImpact = imp;
      let a = raw.get(t); if (!a) raw.set(t, a = []); a.push([n, imp]);
    }
  });
  const buckets = Array.from({ length: IX_BUCKETS }, (_, b) => ({ b, t: {} }));
  for (const t of [...raw.keys()].sort()) {
    const pairs = raw.get(t).map(([n, imp]) => [n, Math.max(1, Math.round((255 * imp) / maxImpact))]);
    buckets[bucketOf(t, IX_BUCKETS)].t[t] = encodeDeltaPairs(pairs);
  }
  const terms = [...df.keys()].sort();
  const lexicon = { schema: 1, N, avgLen: +avg.toFixed(3), scale: +maxImpact.toFixed(5), buckets: IX_BUCKETS, k1: K1P, b: BP, terms, df: terms.map((t) => df.get(t)) };
  return { buckets, lexicon };
}

export function buildEntityPostings(P) {
  const m = new Map(); // entity id -> [[num, role]]
  for (const p of P) for (const [id, role] of p.ents) { let a = m.get(id); if (!a) m.set(id, a = []); a.push([p.num, role]); }
  const buckets = Array.from({ length: EN_BUCKETS }, (_, b) => ({ b, e: {} }));
  for (const id of [...m.keys()].sort()) buckets[bucketOf(id, EN_BUCKETS)].e[id] = encodeDeltaPairs(m.get(id));
  return buckets;
}
