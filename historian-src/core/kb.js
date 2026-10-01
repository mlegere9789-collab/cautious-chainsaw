// kb.js - opens a knowledge base (hx/) through an injected fetchJSON(path): browser (fetch), Worker or Node (fs).
//   T1 (entity, entix, facts, lexicon) at open(); T2 (ix, en, tx) lazily per query with a small LRU, a failed shard rejects with a retryable error
//   manifest.corpora (optional): further passage collections (the Official Records), read by corpus.js on request only
import { prepareT1 } from './entities.js';
import { createLinker } from './linker.js';
import { bucketOf } from './text.js';
import { decodeDeltaPairs, decodePassage, shardOf } from './codec.js';

class LRU {
  constructor(max) { this.max = max; this.m = new Map(); }
  get(k) { if (!this.m.has(k)) return undefined; const v = this.m.get(k); this.m.delete(k); this.m.set(k, v); return v; }
  set(k, v) { this.m.delete(k); this.m.set(k, v); if (this.m.size > this.max) this.m.delete(this.m.keys().next().value); }
}

export class ShardError extends Error {
  constructor(path, cause) { super(`could not load ${path}`); this.name = 'ShardError'; this.path = path; this.retryable = true; this.cause = cause; }
}

/** open a KB; fetchJSON(relPath) resolves parsed JSON for a manifest path */
export async function openKB(fetchJSON, { manifest = null, cache = 64 } = {}) {
  const man = manifest || await fetchJSON('manifest.json');
  const get = async (rel) => { try { return await fetchJSON(rel); } catch (e) { throw new ShardError(rel, e); } };
  const [t1, entix, facts, lexicon] = await Promise.all([get(man.tiers.entity.path), get(man.tiers.entix.path), get(man.tiers.facts.path), get(man.tiers.lexicon.path)]);
  const idx = prepareT1(t1);
  const link = createLinker(idx, entix);
  const lex = new Set(lexicon.terms);
  const lexDf = new Map(lexicon.terms.map((t, i) => [t, lexicon.df[i]]));
  const ixCache = new LRU(cache), enCache = new LRU(cache), txCache = new LRU(cache);
  const ixFiles = man.tiers.index.files, enFiles = man.tiers.entpost.files, txFiles = man.tiers.text.files;
  const nIx = man.tiers.index.buckets, nEn = man.tiers.entpost.buckets;
  const inflight = new Map();
  const siteCount = man.counts && Number.isFinite(man.counts.passages) ? man.counts.passages : Infinity;     // numbers from here on are a corpus's
  const cached = (cacheObj, key, loader) => {
    const v = cacheObj.get(key); if (v) return Promise.resolve(v);
    const k = cacheObj === ixCache ? 'ix' + key : cacheObj === enCache ? 'en' + key : 'tx' + key;
    if (inflight.has(k)) return inflight.get(k);
    const p = loader().then((r) => { cacheObj.set(key, r); inflight.delete(k); return r; }, (e) => { inflight.delete(k); throw e; });
    inflight.set(k, p); return p;
  };
  const stats = { fetched: 0 };
  // a corpus is a descriptor in the manifest; corpus.js and its file list load with the first request that needs them
  const cl = Object.entries(man.corpora || {}).map(([name, c]) => ({ name, base: c.base, count: c.count }));
  let cf = null, co = null;
  const full = () => cf || (cf = import('./corpus.js').then((m) => (co = m.openCorpora(man, get, { cache, stats })), (e) => { cf = null; throw e; }));
  const corpusOf = (n) => cl.find((c) => n >= c.base && n < c.base + c.count) || null;
  const corp = cl.length ? { list: cl, has: (n) => cl.some((c) => c.name === n), corpusOf, df: (t) => (co ? co.df(t) : null),
    score: async (s, t) => (await full()).score(s, t), entities: async (o, i) => (await full()).entities(o, i), passages: async (nums, o) => { if (nums.some(corpusOf)) await (await full()).passages(nums, o); },
    siteFirst: (sel, k, pool, ctx, opts, allow, keep = null) => (co ? co.siteFirst(sel, k, pool, ctx, opts, allow, keep) : (keep ? sel(k, pool, ctx, opts).filter(keep) : sel(k, pool, ctx, opts))) } : null;   // module not loaded: no corpus passage in the pool

  const kb = {
    manifest: man, t1, entix, facts, lexicon, idx, link, lex, lexDf, stats,
    version: man.kb_version, counts: man.counts,
    corpora: cl, corp, hasCorpus: (n) => !!corp && corp.has(n), corpusOf: (n) => (corp ? corp.corpusOf(n) : null),
    /** BM25: Map(num -> score); the corpus only when asked */
    async scorePassages(terms, withCorpus = false) {
      const scores = new Map();
      const need = new Map();
      for (const t of new Set(terms)) { if (!lex.has(t)) continue; const b = bucketOf(t, nIx); (need.get(b) || need.set(b, []).get(b)).push(t); }
      await Promise.all([...need.keys()].map((b) => cached(ixCache, b, async () => { stats.fetched++; return get(ixFiles[b].path); })));
      for (const [b, ts] of need) {
        const bk = ixCache.get(b) || (await cached(ixCache, b, () => get(ixFiles[b].path)));
        for (const t of ts) {
          const flat = bk.t[t]; if (!flat) continue;
          for (const [n, q] of decodeDeltaPairs(flat)) scores.set(n, (scores.get(n) || 0) + (q / 255) * lexicon.scale);
        }
      }
      if (corp && withCorpus) await corp.score(scores, terms);
      return scores;
    },
    /** Map(num -> {role, ids}) for entity ids */
    async entityPassages(ids, withCorpus = false) {
      const out = new Map();
      const need = new Map();
      for (const id of new Set(ids)) { const b = bucketOf(id, nEn); (need.get(b) || need.set(b, []).get(b)).push(id); }
      await Promise.all([...need.keys()].map((b) => cached(enCache, b, async () => { stats.fetched++; return get(enFiles[b].path); })));
      for (const [b, list] of need) {
        const bk = enCache.get(b) || (await cached(enCache, b, () => get(enFiles[b].path)));
        for (const id of list) {
          const flat = bk.e[id]; if (!flat) continue;
          for (const [n, role] of decodeDeltaPairs(flat)) { const cur = out.get(n) || { role: 0, ids: [] }; cur.role = Math.max(cur.role, role); cur.ids.push([id, role]); out.set(n, cur); }
        }
      }
      if (corp && withCorpus) await corp.entities(out, ids);
      return out;
    },
    /** Map(num -> passage) */
    async passages(nums) {
      const siteNums = nums.filter((n) => n < siteCount);
      const shards = [...new Set(siteNums.map(shardOf))].filter((x) => txFiles[x]);          // a number past the last shard is simply absent
      // read from what each load returned, not back out of the LRU (a request spanning more shards than the cache holds would lose some)
      const loaded = new Map(await Promise.all(shards.map(async (s) => [s, await cached(txCache, s, async () => { stats.fetched++; const j = await get(txFiles[s].path); return new Map(j.p.map((row) => { const p = decodePassage(row, j.h); return [p.num, p]; })); })])));
      const out = new Map();
      for (const n of siteNums) { const sh = loaded.get(shardOf(n)); if (sh && sh.has(n)) out.set(n, sh.get(n)); }
      if (corp) await corp.passages(nums, out);
      return out;
    },
  };
  return kb;
}

/** Node helper: read hx artifacts from disk. */
export async function nodeFetcher(dir) {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const memo = new Map();
  return async (rel) => {
    if (memo.has(rel)) return memo.get(rel);
    const j = JSON.parse(await fs.readFile(path.join(dir, rel), 'utf8'));
    if (/^f\/(entity|entix|facts|lexicon)\./.test(rel) || rel === 'manifest.json') memo.set(rel, j);
    return j;
  };
}
/** Browser helper: fetch relative to a base URL, promise-cached. */
export function browserFetcher(base) {
  const memo = new Map();
  return (rel) => {
    if (memo.has(rel)) return memo.get(rel);
    const p = fetch(base + rel, { cache: rel === 'manifest.json' ? 'no-cache' : 'default' }).then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); });
    p.catch(() => memo.delete(rel));
    memo.set(rel, p); return p;
  };
}
