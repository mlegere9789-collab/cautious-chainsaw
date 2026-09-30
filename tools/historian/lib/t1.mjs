// t1.mjs - serialise the registry as tier T1 (entity records + unit keys + name vocabulary) and build the card BM25F index (entix).
import { contentStems, stem, baseNorm } from '../../../historian-src/core/text.js';
// ordinary English words that are also surnames in the records but may not appear lowercase in the site's own prose
const COMMON_EXTRA = new Set(['best', 'battle', 'town', 'day', 'young', 'gray', 'grey', 'white', 'black', 'brown', 'green', 'long', 'little', 'king', 'bishop', 'price', 'hall', 'law', 'ward', 'cross', 'stone', 'hunt', 'wood', 'woods', 'lane', 'ross', 'rice', 'reed', 'hill', 'lee', 'page', 'moore', 'carter', 'baker', 'miller', 'fisher', 'butler', 'glenn', 'holt', 'smith', 'jones']);
import { FIELDS, fieldTexts } from '../../../historian-src/core/entities.js';

const drop = (o) => { for (const k of Object.keys(o)) { const v = o[k]; if (v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0) || (typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0)) delete o[k]; } return o; };

export function serializeT1(reg, { kb }) {
  const records = reg.entities.map((e) => {
    const attrs = { ...e.attrs };
    if (attrs.cmd) attrs.cmd = drop({ ...attrs.cmd, pkey: undefined });
    const r = drop({
      id: e.id, k: e.k, side: e.side || undefined, title: e.title, label: e.label, short: e.short !== e.label ? e.short : undefined,
      aliases: e.aliases, grp: e.grp, par: e.par, kids: e.kids, arm: e.arm, ord: e.ord, state: e.state || undefined, detach: e.detach || undefined,
      canon: reg.canonOf.get(e.id) || undefined, place: e.place || undefined, people: e.k === 'person' ? undefined : e.people, attrs: drop(attrs),
    });
    return r;
  });
  const nameTerms = new Set();
  for (const e of reg.entities) for (const f of ['title', 'alias', 'people', 'place']) for (const t of contentStems(fieldTexts(e)[f])) if (!/^#/.test(t) && t.length > 2) nameTerms.add(t);
  const unitKeys = {};
  for (const [k, arr] of [...reg.unitKeys.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))) unitKeys[k] = arr.map((x) => [x.id, x.arm]);
  // surnames that are also everyday words in the corpus ("best", "battle", "town", "hill", "stone", "day"): they link only when capitalised in the query
  const lower = new Set();
  for (const e of reg.entities) for (const m of String(e.body || '').matchAll(/\b[a-z][a-z]+\b/g)) lower.add(m[0]);
  const common = new Set();
  for (const e of reg.entities) if (e.k === 'person' && e.attrs.surname) { const sn = e.attrs.surname.toLowerCase(); if (lower.has(sn) || COMMON_EXTRA.has(sn)) common.add(stem(baseNorm(sn).split(' ').pop())); }
  return { schema: 1, kb, records, unitKeys, nameTerms: [...nameTerms].sort(), common: [...common].sort() };
}

/** Card index: postings term -> [[recIdx, tfTitle, tfAlias, tfPeople, tfPlace, tfBody], ...], field lengths, averages. */
export function buildEntityIndex(reg) {
  const N = reg.entities.length;
  const len = new Array(N);
  const post = new Map();
  const sums = { title: 0, alias: 0, people: 0, place: 0, body: 0 };
  reg.entities.forEach((e, i) => {
    const ft = fieldTexts(e);
    const tfs = new Map();
    len[i] = FIELDS.map((f, fi) => {
      const toks = contentStems(ft[f]);
      sums[f] += toks.length;
      for (const t of toks) { let a = tfs.get(t); if (!a) tfs.set(t, a = [0, 0, 0, 0, 0]); a[fi]++; }
      return toks.length;
    });
    for (const [t, a] of tfs) { let p = post.get(t); if (!p) post.set(t, p = []); p.push([i, ...a]); }
  });
  const avgLen = {}; for (const f of FIELDS) avgLen[f] = +(sums[f] / N).toFixed(4);
  const obj = {};
  for (const t of [...post.keys()].sort()) obj[t] = post.get(t);
  return { N, avgLen, len, post: obj };
}
