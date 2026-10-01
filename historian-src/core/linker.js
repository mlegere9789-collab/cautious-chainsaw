// linker.js - entity linking over a token array.
//   1. unit grammar   ("20th ME", "First Minnesota", "84th N.Y.", "1 MN") -> unit keys, arm/side aware, ambiguity aware
//   2. alias phrases  (longest n-gram over derived + curated aliases; stop words skipped; single generic tokens ignored)
//   3. surnames       (commanders at every echelon)
// Output mentions carry candidate record indexes; the engine decides what to do with ambiguity (clarify chips, side filters).
import { stem, STOP } from './text.js';
import { findUnitMentions, ARM_RANK } from './units.js';

export const W = { unit: 40, aliasBase: 12, aliasPerTok: 6, group: 8, person: 10, exactTitle: 15 };
const GENERIC_DF = 120;

/** Build a linker bound to a prepared T1 index (entities.prepareT1) and the card BM25F index (for document frequencies). */
export function createLinker(idx, entix) {
  const { R, aliasMap, surnames, unitKeys } = idx;
  const df = (t) => (entix && entix.post[t] ? entix.post[t].length : 0);
  const canonIdx = (i) => { const r = R[i]; return r.canon && idx.byId.has(r.canon) ? idx.byId.get(r.canon) : i; };

  function resolveUnit(m, hints) {
    // one mention may hold several ordinals ("49th and 77th New York"): resolve each into its own sub-mention
    const subs = [];
    for (const ord of m.ords) {
      const key = `#${ord}|${m.state}`;
      let cands = (unitKeys.get(key) || []).slice();
      subs.push({ ord, key, cands });
    }
    return subs;
  }

  function pickUnit(cands, arm, side) {
    let c = cands.slice();
    if (side) { const s = c.filter((x) => R[x.i].side === side); if (s.length) c = s; }
    if (arm) { const a = c.filter((x) => x.arm === arm); if (a.length) c = a; }
    // collapse detachments into their canonical record
    const groups = new Map();
    for (const x of c) { const ci = canonIdx(x.i); if (!groups.has(ci)) groups.set(ci, { i: ci, arm: R[ci].arm || x.arm, side: R[ci].side }); }
    const list = [...groups.values()].sort((a, b) => (ARM_RANK[a.arm] ?? 9) - (ARM_RANK[b.arm] ?? 9) || (R[a.i].detach ? 1 : 0) - (R[b.i].detach ? 1 : 0));
    if (!list.length) return { best: null, cands: [], amb: false };
    const bestRank = ARM_RANK[list[0].arm] ?? 9;
    const top = list.filter((x) => (ARM_RANK[x.arm] ?? 9) === bestRank);
    // ambiguous when several same-arm groups exist (Union and Confederate "1st Maryland"), unless the user gave a side
    const amb = top.length > 1 && !side && new Set(top.map((x) => x.side)).size > 1;
    return { best: top[0].i, cands: list.map((x) => x.i), amb, alts: list.slice(1).map((x) => x.i) };
  }

  return function link(tokens, opts = {}) {
    const side = opts.side || null;
    const mentions = [];
    const used = new Array(tokens.length).fill(false);

    // ---- 1. unit grammar --------------------------------------------------------------------------------------------------
    for (const m of findUnitMentions(tokens, { reversed: true, loose: true, capsAbbr: opts.capsAbbr || null })) {
      for (const sub of resolveUnit(m, opts)) {
        if (!sub.cands.length && m.reversed) continue;                      // "Pennsylvania 2" is not a claim that a 2nd Pennsylvania exists
        if (!sub.cands.length) { mentions.push({ kind: 'unit-miss', ord: sub.ord, state: m.state, arm: m.arm, start: m.start, end: m.end, w: 0, ids: [], amb: false, phrase: `${sub.ord} ${m.state}` }); continue; }
        const p = pickUnit(sub.cands, m.arm, side);
        if (p.best === null) continue;
        mentions.push({ kind: 'unit', ids: p.cands, best: p.best, alts: p.alts, amb: p.amb, w: W.unit, start: m.start, end: m.end, phrase: sub.key, src: 'unitkey', abbr: m.abbr });
      }
      for (let k = m.start; k < m.end; k++) used[k] = true;
    }

    // ---- 2. alias phrases + 3. surnames over content tokens --------------------------------------------------------------------
    const content = [];
    tokens.forEach((t, i) => { if (!used[i] && !STOP.has(t)) content.push({ t: /^#/.test(t) ? t : stem(t), i }); });
    // two consumption classes: a person's name does not block a place/unit alias that shares a word ("General Meade's headquarters")
    const takenA = new Array(content.length).fill(false), takenP = new Array(content.length).fill(false);
    const maxN = Math.min(6, content.length);
    for (let n = maxN; n >= 1; n--) {
      for (let a = 0; a + n <= content.length; a++) {
        const hit0 = aliasMap.get(content.slice(a, a + n).map((x) => x.t).join(' '));
        const personHit = !!hit0 && hit0.length > 0 && hit0.every((x) => R[x.i].k === 'person');
        const taken = personHit || (!hit0 && n === 1) ? takenP : takenA;
        if (taken.slice(a, a + n).some(Boolean)) continue;
        // contiguity in raw token space allows skipped stop words but not skipped content
        const phrase = content.slice(a, a + n).map((x) => x.t).join(' ');
        const hit = aliasMap.get(phrase);
        if (hit && hit.length) {
          if (n === 1 && (df(phrase) > GENERIC_DF)) continue;
          if (n === 1 && /^#/.test(phrase)) continue;
          const ids = hit.map((x) => x.i);
          const srcs = new Set(hit.map((x) => x.s));
          const onlyGroup = srcs.size === 1 && srcs.has('g');
          mentions.push({ kind: hit.every((x) => R[x.i].k === 'person') ? 'person' : 'alias', ids, best: ids[0], amb: ids.length > 1, w: onlyGroup ? W.group : W.aliasBase + W.aliasPerTok * n, phrase, n,
            start: content[a].i, end: content[a + n - 1].i + 1, src: onlyGroup ? 'group' : 'alias', kinds: [...new Set(ids.map((i) => R[i].k))], exact: hit.some((x) => x.s === 't') });
          for (let k = a; k < a + n; k++) taken[k] = true;
          if (personHit) for (let k = a; k < a + n; k++) takenP[k] = true;
        } else if (n === 1 && surnames.has(phrase) && !takenA[a] && !(idx.common.has(phrase) && !(opts.caps && opts.caps.has(phrase)))) {
          const prom = (i) => R[i].attrs.prom || 0;
          const ids = surnames.get(phrase).slice().sort((x, y) => prom(y) - prom(x) || (R[y].attrs.general ? 1 : 0) - (R[x].attrs.general ? 1 : 0) || ((R[y].attrs.roles || []).length - (R[x].attrs.roles || []).length));
          const gens = ids.filter((i) => R[i].attrs.general);
          const p0 = prom(ids[0]), p1 = ids[1] !== undefined ? prom(ids[1]) : -1;
          // dominant when an army or corps commander outranks the rest ("Lee", "Hill"), or two echelons apart; otherwise several people share the name
          const amb = ids.length > 1 && !(p0 >= 3 && p0 > p1) && !(p0 - p1 >= 2);
          mentions.push({ kind: 'surname', ids, best: ids[0], amb, generals: gens, w: W.person, phrase, n: 1, start: content[a].i, end: content[a].i + 1, src: 'surname' });
          taken[a] = true;
        }
      }
    }
    mentions.sort((x, y) => x.start - y.start);
    return { mentions, used };
  };
}
