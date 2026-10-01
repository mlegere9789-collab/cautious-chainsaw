// corpus.js - passage corpora after the site's own (manifest.corpora: the Official Records, ...). Loaded by kb.js on demand, only when the manifest has a corpus and a question needs it, so a KB without one never
// fetches this module and a KB with one does not fetch it before the first question that reaches into the corpus.
// A corpus has its own BM25 postings (128 buckets), entity postings (32 buckets) and text shards (8 passages), all lazy (T2), and its passages live in the number space after the site's:
//   global number = corpus base + local number. Its vocabulary is not in the T1 lexicon (it would not fit the budget): every distinct query term goes to its bucket, and a term the corpus does not hold is simply not in it.
// The manifest keeps only a small descriptor of each corpus (base, count, scale, bucket counts, weight) so that the first-paint bytes do not grow with the corpus; the list of its files (about 1,200 paths and
// sizes for the Official Records) is a content-hashed file of its own, `c.files.path`, fetched with the first request that needs a shard.
import { bucketOf } from './text.js';
import { decodeDeltaPairs, decodePassage } from './codec.js';
// ---- corpus shards (the Official Records and later sources) ------------------------------------------------------------------------------------------------------------------------------
//   <corpus>/ix/NNN.json   {b, t: {term: [num0, q0, dnum1, q1, ...]}}      LOCAL numbers (0..count-1); the runtime adds the corpus base
//   <corpus>/en/NN.json    {b, e: {entityId: [num0, role0, ...]}}
//   <corpus>/tx/NNNN.json  {h: [fields], p: [[...], ...], d: {docId: {cite, persp, ia}}}   8 passages per shard; cite, persp and the scan's archive id are kept once per document in `d`
//   <corpus>/files.<hash>.json  {index: {files: [...]}, entpost: {files: [...]}, text: {files: [...]}}   the paths and sizes of the files above (older manifests carry these lists inline)
export const TX_FIELDS_CORPUS = ['num', 'id', 'doc', 'rec', 'kind', 'day', 'text', 'sb', 'ents', 'clk', 'source', 'prior', 'pg', 'scope'];
export const PER_SHARD_CORPUS = 8;
export function encodeCorpusPassage(p) { return TX_FIELDS_CORPUS.map((k) => (k === 'num' ? p.num : k === 'source' ? p.source_id : p[k] === undefined ? 0 : p[k])); }

class LRU {
  constructor(max) { this.max = max; this.m = new Map(); }
  get(k) { if (!this.m.has(k)) return undefined; const v = this.m.get(k); this.m.delete(k); this.m.set(k, v); return v; }
  set(k, v) { this.m.delete(k); this.m.set(k, v); if (this.m.size > this.max) this.m.delete(this.m.keys().next().value); }
}

/** rows of one corpus shard -> passages with cite / persp hydrated from the shard's document table; `base` is added to the local number */
export function decodeCorpusShard(shard, base) {
  return shard.p.map((row) => {
    const o = decodePassage(row, shard.h);
    o.local = o.num; o.num = base + o.local;
    const d = (shard.d && shard.d[o.doc]) || {};
    o.cite = d.cite || { short: o.doc, author_line: o.doc }; o.persp = d.persp || {}; o.ia = d.ia || null; o.sens = o.sens || []; o.pg = o.pg || [];
    return o;
  });
}

/** the corpora of a manifest as [{ name, base, count }]: all that is needed to tell whether a passage number is a corpus passage (no module, no request) */
export const corpusList = (man) => Object.entries((man && man.corpora) || {}).map(([name, c]) => ({ name, base: c.base, count: c.count }));

/**
 * Quotes from the site's passages first; a corpus passage only fills what is left, at most one, and only when the site's quotes fall short (`select` is select.js selectQuotes).
 * Pure over the corpus list, so the engine can call it before the corpus module has been loaded.
 */
export function siteFirst(corpusOf, select, kb, pool, ctx, opts, allowCorpus, keep = null) {
  const inCorp = (x) => !!corpusOf(x.p.num);
  let quotes = select(kb, pool.filter((x) => !inCorp(x)), ctx, opts); if (keep) quotes = quotes.filter(keep);
  if (allowCorpus && quotes.length < Math.min(opts.max, 2)) {
    const cp = pool.filter(inCorp);
    if (cp.length) { let extra = select(kb, cp, ctx, { ...opts, max: 1 }); if (keep) extra = extra.filter(keep); quotes = quotes.concat(extra.slice(0, 1)); }
  }
  return quotes;
}

export function openCorpora(man, get, { cache = 64, stats = { fetched: 0 } } = {}) {
  const list = Object.entries(man.corpora || {}).map(([name, c]) => ({
    name, base: c.base, count: c.count, N: c.lexicon.N, scale: c.lexicon.scale, weight: c.weight === undefined ? 1 : c.weight, per: c.text.per_shard,
    nIx: c.index.buckets, nEn: c.entpost.buckets, sources: c.sources || [], meta: c, fl: null,
    ix: new LRU(cache), en: new LRU(cache), tx: new LRU(cache), df: new Map(),
  }));
  const inflight = new Map();
  const once = (cacheObj, key, tag, loader) => {
    const v = cacheObj.get(key); if (v) return Promise.resolve(v);
    const k = tag + ':' + key; if (inflight.has(k)) return inflight.get(k);
    const p = loader().then((r) => { cacheObj.set(key, r); inflight.delete(k); return r; }, (e) => { inflight.delete(k); throw e; });
    inflight.set(k, p); return p;
  };
  /** the file lists of a corpus (one request, once; a manifest that carries them inline needs none) */
  const filesOf = (c) => {
    if (c.fl) return c.fl;
    if (!c.meta.files) return (c.fl = Promise.resolve({ index: c.meta.index, entpost: c.meta.entpost, text: c.meta.text }));
    const p = (async () => { stats.fetched++; return get(c.meta.files.path); })(); p.catch(() => { if (c.fl === p) c.fl = null; });
    return (c.fl = p);
  };
  const corpusOf = (num) => { for (const c of list) if (num >= c.base && num < c.base + c.count) return c; return null; };
  const byBucket = (items, n) => { const m = new Map(); for (const t of new Set(items)) { const b = bucketOf(t, n); (m.get(b) || m.set(b, []).get(b)).push(t); } return m; };
  return {
    list, corpusOf, has: (name) => list.some((c) => c.name === name),
    /** document frequency of a stemmed term in the postings loaded so far: { df, N } or null */
    df(term) { for (const c of list) { const d = c.df.get(term); if (d) return { df: d, N: c.N }; } return null; },
    /** add the corpora's BM25 impacts for the stemmed terms into `scores` (global numbers) */
    async score(scores, terms) {
      for (const c of list) {
        const need = byBucket(terms.filter((t) => !/^#/.test(t)), c.nIx);
        if (!need.size) continue;
        const F = await filesOf(c);
        const loaded = new Map(await Promise.all([...need.keys()].map(async (b) => [b, await once(c.ix, b, c.name + 'ix', async () => { stats.fetched++; return get(F.index.files[b].path); })])));
        for (const [b, ts] of need) for (const t of ts) {
          const flat = loaded.get(b).t[t]; if (!flat) continue;
          c.df.set(t, flat.length / 2);
          for (const [n, q] of decodeDeltaPairs(flat)) { const g = c.base + n; scores.set(g, (scores.get(g) || 0) + c.weight * (q / 255) * c.scale); }
        }
      }
    },
    /** add the corpora's entity postings for `ids` into `out` (Map num -> {role, ids}) */
    async entities(out, ids) {
      for (const c of list) {
        const need = byBucket(ids, c.nEn);
        if (!need.size) continue;
        const F = await filesOf(c);
        const loaded = new Map(await Promise.all([...need.keys()].map(async (b) => [b, await once(c.en, b, c.name + 'en', async () => { stats.fetched++; return get(F.entpost.files[b].path); })])));
        for (const [b, idl] of need) for (const id of idl) {
          const flat = loaded.get(b).e[id]; if (!flat) continue;
          for (const [n, role] of decodeDeltaPairs(flat)) { const g = c.base + n; const cur = out.get(g) || { role: 0, ids: [] }; cur.role = Math.max(cur.role, role); cur.ids.push([id, role]); out.set(g, cur); }
        }
      }
    },
    /** load the corpus passages among `nums` into `out` (Map num -> passage) */
    async passages(nums, out) {
      for (const c of list) {
        const mine = nums.filter((n) => n >= c.base && n < c.base + c.count); if (!mine.length) continue;
        const F = await filesOf(c);
        const idxs = [...new Set(mine.map((n) => Math.floor((n - c.base) / c.per)))].filter((x) => F.text.files[x]);
        const got = new Map(await Promise.all(idxs.map(async (s) => [s, await once(c.tx, s, c.name + 'tx', async () => { stats.fetched++; const j = await get(F.text.files[s].path); return new Map(decodeCorpusShard(j, c.base).map((p) => [p.num, p])); })])));
        for (const n of mine) { const sh = got.get(Math.floor((n - c.base) / c.per)); if (sh && sh.has(n)) out.set(n, sh.get(n)); }
      }
    },
    siteFirst(select, kb, pool, ctx, opts, allowCorpus, keep = null) { return siteFirst(corpusOf, select, kb, pool, ctx, opts, allowCorpus, keep); },
  };
}
