// corpus-or.mjs - the Official Records corpus as a lazy corpus tier of the hx knowledge base (chapter 14 WP-HIST-06/17): its own BM25 postings (impact8, 128 buckets), entity postings (32 buckets)
// and text shards (8 passages each), emitted next to the site's tiers under f/or27/. Nothing here is loaded at first paint and nothing of the site's own tiers changes: a KB built without the corpus
// is byte-identical to one built before it existed (the corpus is an option of the build, see tools/historian/build.mjs --corpus or27).
//
//   loadOrRows(rawDir, corpusDir)      the rows tools/historian/ingest/corpus.mjs wrote (historian-src/raw/or27/passages.jsonl, historian-src/corpus/or27/reports.json)
//   finalizeOr(rows, reports, T1)      entity links recomputed with THIS build's registry (the OR linker over the engine's linker), the prior of every kind, stable local numbers
//   emitOr(P, em)                      the content-hashed files and the manifest section
//   validateOr(P, ctx)                 the validators for a source of printed text: V01 fields, V02 tier and licence, V03 sentence offsets AND the verbatim invariant (every paragraph of every passage is a
//                                      whitespace-normalised slice of the normalised OCR text of its report, in order; the passage id carries the hash of its text), V06 shown-text counts, V08 folio / scan sample,
//                                      V09 unique ids, V10 size budgets
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { splitSentences, normalizeWs, tokenize, stem } from '../../../historian-src/core/text.js';
import { TX_FIELDS_CORPUS, PER_SHARD_CORPUS, encodeCorpusPassage } from '../../../historian-src/core/corpus.js';
import { buildPostings, buildEntityPostings, IX_BUCKETS, EN_BUCKETS } from './postings.mjs';
import { createOrLinker } from '../ingest/link.mjs';
import { tierProblems } from './sources.mjs';
import { showTextProblems } from './validate.mjs';
import { brotliSize } from './emit.mjs';

export const OR_PRIOR = { report: 1.0, dispatch: 0.95, order: 0.85, itinerary: 0.6, return: 0.3, record: 0.5 };
const sha8 = (s) => crypto.createHash('sha1').update(s).digest('hex').slice(0, 8);
const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');

// the words of a dispatch's addressee ("Brig. Gen. J. D. Imboden, Commanding, &c.") and sender ("H. W. HALLECK") that are names, as the stems the question side uses: pseudo-entities A:<stem> (addressed to) and F:<stem> (sent by)
const NOT_NAME = new Set('general major brigadier lieutenant colonel captain commanding commander chief staff assistant adjutant army corps division brigade department headquarters secretary war hon president governor cavalry artillery infantry first second third fourth fifth sixth seventh eighth ninth tenth eleventh twelfth the of and to at in by for sir mr dr surgeon quartermaster provost marshal inspector engineer signal ordnance department potomac virginia pennsylvania maryland washington richmond'.split(' '));
export function nameStems(text, { upper = false } = {}) {
  const out = new Set();
  for (const w of String(text || '').split(/[\s,.;:()\[\]]+/)) {
    if (!(upper ? /^[A-Z][A-Z'’-]{2,}$/ : /^[A-Z][a-z'’-]{2,}$/).test(w) || NOT_NAME.has(w.toLowerCase())) continue;
    for (const t of tokenize(w)) if (t.length >= 3) out.add(stem(t));                          // the question side looks up stem(token): "Williams" is william there, so it must be here
  }
  return [...out];
}
export function loadOrRows({ rawDir, corpusDir }) {
  const pf = path.join(rawDir, 'passages.jsonl');
  if (!fs.existsSync(pf)) throw new Error(`the Official Records corpus is not built: ${path.relative(process.cwd(), pf)} is missing (run: node tools/historian/ingest/corpus.mjs build)`);
  const buf = fs.readFileSync(pf);
  const rows = buf.toString('utf8').trim().split('\n').map((l) => JSON.parse(l));
  const reports = JSON.parse(fs.readFileSync(path.join(corpusDir, 'reports.json'), 'utf8')).reports;
  const docs = new Map(fs.readFileSync(path.join(rawDir, 'docs.jsonl'), 'utf8').trim().split('\n').map((l) => { const d = JSON.parse(l); return [d.id, d]; }));
  const man = JSON.parse(fs.readFileSync(path.join(corpusDir, 'manifest.json'), 'utf8'));
  // the sender of each dispatch (the link the corpus build made from its signature, title line and side: ingest/link.mjs resolveSigner)
  const dt = JSON.parse(fs.readFileSync(path.join(corpusDir, 'dispatches.json'), 'utf8')); const ci = (k) => dt.fields.indexOf(k);
  const signers = new Map(dt.rows.filter((r) => r[ci('signer_link')]).map((r) => [r[ci('id')], { id: r[ci('signer_link')], tier: r[ci('signer_tier')] }]));
  const route = new Map(dt.rows.map((r) => [r[ci('id')], { addressed: nameStems(r[ci('addressee')]), from: nameStems(String(r[ci('signer')] || '').split(/\s+/).slice(-1)[0], { upper: true }) }]));
  return { rows, reports, docs, man, signers, route, sha: sha256(buf).slice(0, 16) };
}

/** local numbers, links from this build's registry, priors; the rows' own fields are kept */
export function finalizeOr(rows, reports, { idx, link, signers = new Map(), route = new Map() }) {
  const L = createOrLinker({ idx, link });
  const meta = new Map(reports.map((r) => [r.id, r]));
  const byDoc = new Map(); rows.forEach((r) => { if (!byDoc.has(r.doc)) byDoc.set(r.doc, []); byDoc.get(r.doc).push(r); });
  const ents = new Map(); const stats = { A: 0, B: 0, C: 0, authors: { reports: 0, person: 0, unit: 0 }, signers: { dispatches: 0, person: 0 } };
  for (const [doc, ps] of byDoc) {
    const m = meta.get(doc); let subjects = [];
    if (m && m.kind === 'report' && m.part !== 3) {
      const au = L.resolveAuthor(m, { side: m.side });
      stats.authors.reports++; if (au.person) stats.authors.person++; if (au.units.length) stats.authors.unit++;
      subjects = [...au.units.map((u) => ({ id: u.id, tier: u.tier })), ...(au.person ? [{ id: au.person.id, tier: au.person.tier }] : [])];
    } else if (ps[0].part === 3 && ps[0].kind !== 'itinerary') {
      // a dispatch: its sender (one signature, a registry man of that name and initials on that side), the same rule the corpus build applied
      const sg = signers.get(doc);
      stats.signers.dispatches++; if (sg) { stats.signers.person++; subjects = [{ id: sg.id, tier: sg.tier }]; }
    }
    const res = L.linkDocument(ps, { side: m ? m.side : ps[0].side, subjects });
    ps.forEach((p, k) => { ents.set(p.id, res.passages[k].ents); for (const x of res.passages[k].mentions) stats[x.tier]++; });
  }
  const P = rows.map((r, i) => ({
    num: i, id: r.id, doc: r.doc, rec: r.rec, kind: r.kind, day: r.day, text: r.text, sb: r.sb, ents: ents.get(r.id) || [], clk: r.clk, source_id: r.source_id,
    prior: +((OR_PRIOR[r.kind] ?? 0.5) * (r.scope === 'campaign' ? 0.7 : 1)).toFixed(3), sens: [], pg: r.pg, scope: r.scope, part: r.part,
    cite: { short: r.cite.short, author_line: r.cite.author_line }, persp: r.persp, ia: r.cite.ia, words: r.words,
    tags: (() => { const q = route.get(r.doc); return q ? [...q.addressed.map((x) => 'A:' + x), ...q.from.map((x) => 'F:' + x)] : []; })(),
  }));
  return { P, linkStats: stats };
}

/** emit the corpus tiers; returns { desc (the manifest section), files (all entries), bytes } */
export function emitOr(P, em, { name = 'or27', base, sources = [], built_from = null, weight = 0.6 } = {}) {
  const { buckets, lexicon } = buildPostings(P);
  // the postings also carry two pseudo-entities that are not links of any passage (they are not in p.ents and never shown): K:report / K:dispatch (what the document is: a report written after the fact, or a
  // dispatch, order or itinerary written at the time) and D:<date> (the day a dispatch is dated), so that "what did Meade telegraph on July 3" can restrict its candidates to those before ranking them
  const en = buildEntityPostings(P.map((p) => ({ ...p, ents: [...p.ents, [p.persp && p.persp.contemporaneous ? 'K:dispatch' : p.kind === 'report' ? 'K:report' : 'K:other', 1, 1], ...(p.persp && p.persp.contemporaneous && p.persp.written ? [['D:' + p.persp.written, 1, 1]] : []), ...(p.tags || []).map((t) => [t, 1, 1])] })));
  const ix = buckets.map((b) => em.put(`${name}/ix/${String(b.b).padStart(3, '0')}`, b));
  const enf = en.map((b) => em.put(`${name}/en/${String(b.b).padStart(2, '0')}`, b));
  const tx = [];
  const nShards = Math.ceil(P.length / PER_SHARD_CORPUS);
  for (let s = 0; s < nShards; s++) {
    const slice = P.slice(s * PER_SHARD_CORPUS, (s + 1) * PER_SHARD_CORPUS);
    const d = {}; for (const p of slice) if (!d[p.doc]) d[p.doc] = { cite: p.cite, persp: p.persp, ia: p.ia };
    tx.push(em.put(`${name}/tx/${String(s).padStart(4, '0')}`, { h: TX_FIELDS_CORPUS, p: slice.map(encodeCorpusPassage), d }));
  }
  // the paths and sizes of the corpus's ~1,200 files are a content-hashed file of their own, fetched by the first request that reaches into the corpus; the manifest (read at open) keeps a descriptor of a few hundred bytes
  const lazy = em.put(`${name}/files`, { index: { files: ix }, entpost: { files: enf }, text: { files: tx } });
  const desc = {
    base, count: P.length, words: P.reduce((a, p) => a + p.words, 0), weight, sources, built_from,
    lexicon: { N: lexicon.N, avgLen: lexicon.avgLen, scale: lexicon.scale, k1: lexicon.k1, b: lexicon.b, terms: lexicon.terms.length },
    index: { buckets: IX_BUCKETS, hash: 'fnv1a32(stem) % 128', codec: 'json-delta-impact8', local_numbers: true },
    entpost: { buckets: EN_BUCKETS, hash: 'fnv1a32(entity id) % 32' },
    text: { per_shard: PER_SHARD_CORPUS, fields: TX_FIELDS_CORPUS, doc_table: true },
    files: lazy,
  };
  const sum = (a) => a.reduce((x, f) => x + f.bytes, 0);
  const sizes = { ixTotal: sum(ix), enTotal: sum(enf), textTotal: sum(tx), files: ix.length + enf.length + tx.length, maxShard: Math.max(...tx.map((f) => f.bytes)), maxIx: Math.max(...ix.map((f) => f.bytes)), terms: lexicon.terms.length };
  return { desc, sizes: { ...sizes, filesList: lazy.bytes }, entries: [...ix, ...enf, ...tx, lazy] };
}

/** brotli sizes of the corpus files (sampled by size class, summed exactly: the corpus is a few thousand small files) */
export function brotliTotals(em, entries) { let t = 0, max = 0; for (const e of entries) { const b = brotliSize(em.files.get(e.path)); t += b; if (b > max) max = b; } return { total: t, max }; }

// ---- validators -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const flat = (s) => String(s).replace(/\s+/g, ' ').trim();
export function validateOr(P, { sources, rawDir, docs, reports }) {
  const findings = []; const err = (rule, msg) => findings.push({ level: 'error', rule, msg }); const warn = (rule, msg) => findings.push({ level: 'warn', rule, msg });
  const counts = { passages: P.length, v03_verbatim_checked: 0, v03_verbatim_failed: 0, v06_shown: 0, v08_pages: 0, no_scan: 0 };
  // V01
  for (const p of P) { for (const k of ['id', 'doc', 'kind', 'text', 'sb', 'cite', 'source_id', 'ents', 'pg']) if (p[k] === undefined || p[k] === null || p[k] === '') err('V01', `OR passage ${p.id} missing ${k}`); if (!p.cite || !p.cite.short) err('V01', `OR passage ${p.id} missing cite.short`); }
  // V02: the sources it uses must be Tier A (public domain), not reprints, with a licence and a statement
  for (const sid of new Set(P.map((p) => p.source_id))) {
    const s = sources.get(sid); if (!s) { err('V02', `OR source ${sid} is not in sources.yaml`); continue; }
    for (const pr of tierProblems(s)) err('V02', `source ${sid}: ${pr}`);
    if (s.tier !== 'A') err('V02', `source ${sid} is Tier ${s.tier}: only Tier A text ships as a corpus`);
    if (!s.license || !s.license.statement_url) err('V02', `source ${sid} has no rights statement URL`);
  }
  // V09
  const seen = new Set(); for (const p of P) { if (seen.has(p.id)) err('V09', `duplicate OR passage id ${p.id}`); seen.add(p.id); }
  // V03: sentence offsets, the id's hash, the verbatim invariant
  const normTxt = new Map(); const flatDoc = new Map();
  const docFlat = (part, doc) => { const k = doc; if (flatDoc.has(k)) return flatDoc.get(k); if (!normTxt.has(part)) normTxt.set(part, fs.readFileSync(path.join(rawDir, `normalized-${part}.txt`), 'utf8')); const d = docs.get(doc); const f = d ? flat(normTxt.get(part).slice(d.start, d.end)) : null; flatDoc.set(k, f); return f; };
  let lastDoc = null, cursor = 0;
  for (const p of P) {
    if (p.sb[0] !== 0) err('V03', `${p.id}: first sentence start is not 0`);
    for (const o of p.sb) if (!(o >= 0 && o < p.text.length)) err('V03', `${p.id}: sentence offset ${o} out of range`);
    if (!p.id.endsWith('#' + sha8(p.text)) && !/#[0-9a-f]{8}$/.test(p.id)) err('V03', `${p.id}: id does not carry a text hash`);
    const hashOk = p.id.endsWith('#' + sha8(p.text)); if (!hashOk) warn('V03', `${p.id}: id hash differs from the text hash (the id was made unique)`);
    const f = docFlat(p.part, p.doc);
    if (f === null) { err('V03', `${p.id}: no document range`); continue; }
    if (p.doc !== lastDoc) { lastDoc = p.doc; cursor = 0; }
    counts.v03_verbatim_checked++;
    let ok = true;
    for (const para of p.text.split(/\n{2,}/)) { const q = flat(para); if (!q) continue; const at = f.indexOf(q, cursor); if (at < 0) { ok = false; break; } cursor = at + q.length; }
    if (!ok) { counts.v03_verbatim_failed++; if (counts.v03_verbatim_failed <= 20) err('V03', `${p.id}: a paragraph is not a verbatim slice of the normalised text of its report`); }
    // page list: ascending offsets inside the text, printed pages plausible
    let prev = -1; for (const e of p.pg) { if (!(e[0] >= prev && e[0] <= p.text.length)) err('V08', `${p.id}: page break offset ${e[0]} out of order`); prev = e[0]; if (!(e[1] >= 1 && e[1] <= 1300)) err('V08', `${p.id}: printed page ${e[1]} is not plausible`); }
    counts.v08_pages += p.pg.length; if (!p.pg.length || p.pg[0].length < 4) counts.no_scan++;
    const sp = showTextProblems(p.text); if (sp.length) { counts.v06_shown++; }
  }
  if (counts.v06_shown) warn('V06', `${counts.v06_shown} OR passages contain a word the site's own copy may not (null, a hyphen pair, an id-like token): they are verbatim 1863-1889 text; the lint does not apply the site's copy rules to a verbatim primary-source quote`);
  if (counts.no_scan) warn('V08', `${counts.no_scan} passages have no scan leaf for their first page`);
  return { findings, counts };
}
