// entities.js - the runtime view of tier T1: record lookup, alias map, surname map, unit keys, BM25F card scoring.
// prepareT1() is pure and identical in the browser and in Node; the build calls it to link passages, the Worker/page calls it at load.
import { baseNorm, contentStems, stem, tokenize, STOP } from './text.js';

export const FIELDS = ['title', 'alias', 'people', 'place', 'body'];
export const FW = { title: 3.0, alias: 3.0, people: 2.0, place: 1.5, body: 1.0 };   // hist-current QW-4 (replaces the x1.3 vignette hack)
export const FB = { title: 0.4, alias: 0.3, people: 0.3, place: 0.3, body: 0.6 };
export const K1 = 1.2;

/** Field texts of a record, exactly as they are tokenised for the BM25F index (build) and for surface maps (runtime). */
export function fieldTexts(r) {
  return {
    title: r.title || '',
    alias: (r.aliases || []).join(' \n '),
    people: (r.people || []).join(' \n '),
    place: r.place || '',
    body: r.body || '',
  };
}

export function prepareT1(t1) {
  const R = t1.records;
  const byId = new Map(R.map((r, i) => [r.id, i]));
  const idx = { t1, R, byId };
  idx.get = (id) => { const i = byId.get(id); return i === undefined ? null : R[i]; };

  // ---- alias map: normalised stem-phrase -> [{i, s}]  (s: 'a' alias | 't' title | 'g' group nickname | 'p' person name) --------------
  const aliasMap = new Map();
  const put = (phrase, i, s) => {
    if (!phrase) return;
    let arr = aliasMap.get(phrase);
    if (!arr) aliasMap.set(phrase, arr = []);
    if (!arr.some((x) => x.i === i)) arr.push({ i, s });
    else { const x = arr.find((y) => y.i === i); if (s === 't' || (s === 'a' && x.s === 'g')) x.s = s; }
  };
  R.forEach((r, i) => {
    const kind = r.k === 'person' ? 'p' : 'a';
    put(contentStems(r.title).join(' '), i, r.k === 'person' ? 'p' : 't');
    put(contentStems(r.label || '').join(' '), i, kind);
    for (const a of r.aliases || []) put(contentStems(a).join(' '), i, kind);
    for (const a of r.grp || []) put(contentStems(a).join(' '), i, 'g');
  });
  idx.aliasMap = aliasMap;

  // ---- surname map: stem(surname) -> person record indexes ----------------------------------------------------------------------------
  const surnames = new Map();
  R.forEach((r, i) => {
    if (r.k !== 'person') return;
    const sn = r.attrs && r.attrs.surname; if (!sn) return;
    const key = stem(baseNorm(sn).split(' ').pop());
    if (!key || key.length < 3) return;
    (surnames.get(key) || surnames.set(key, []).get(key)).push(i);
  });
  idx.surnames = surnames;
  idx.common = new Set(t1.common || []);

  // ---- unit keys: "#20|maine" -> [{i, arm}] ---------------------------------------------------------------------------------------------
  idx.unitKeys = new Map(Object.entries(t1.unitKeys || {}).map(([k, arr]) => [k, arr.map(([id, arm]) => ({ i: byId.get(id), arm })).filter((x) => x.i !== undefined)]));

  // ---- name vocabulary (fuzzy targets) ---------------------------------------------------------------------------------------------------
  idx.nameVocab = new Set(t1.nameTerms || []);
  return idx;
}

// ---------------------------------------------------------------------------------------------------------------------------------------
// BM25F over cards (inverted postings shipped in entix)
// ---------------------------------------------------------------------------------------------------------------------------------------
export function scoreCards(entix, qStems) {
  const { N, avgLen, len, post } = entix;
  const scores = new Map();
  const seen = new Set();
  for (const t of qStems) {
    if (seen.has(t)) continue; seen.add(t);
    const p = post[t]; if (!p) continue;
    const df = p.length;
    const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5));
    for (const e of p) {
      const i = e[0];
      let w = 0;
      for (let f = 0; f < 5; f++) {
        const tf = e[f + 1]; if (!tf) continue;
        const fld = FIELDS[f];
        const l = len[i][f] || 1;
        w += FW[fld] * tf / (1 - FB[fld] + FB[fld] * l / (avgLen[fld] || 1));
      }
      scores.set(i, (scores.get(i) || 0) + idf * w / (K1 + w));
    }
  }
  return scores;
}
export const dfOf = (entix, t) => (entix.post[t] ? entix.post[t].length : 0);

export { STOP, tokenize, stem };
