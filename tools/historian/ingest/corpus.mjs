#!/usr/bin/env node
// corpus.mjs - the Official Records (Series I, vol. 27, parts 1-3) corpus: fetch (cached, rights-gated), normalise, segment into reports and dispatches, chunk into passages with printed pages,
// scan leaves and sentence offsets, read the report metadata, link units / people / places, extract the clock-time claims.
//
//   node tools/historian/ingest/corpus.mjs build [--parts 1,2,3] [--raw historian-src/raw/or27] [--out historian-src/corpus/or27] [--no-aux]
//
// Writes (the raw text stays out of git: historian-src/raw/ and tmp/ are ignored; only the small derived tables are committed):
//   <raw>/passages.jsonl      every passage with text (the rows the hx build reads)
//   <raw>/docs.jsonl          one row per report / dispatch (metadata, offsets in the normalised text)
//   <raw>/normalized-<n>.txt  the normalised text of each part (what every passage is a verbatim slice of)
//   <out>/reports.json        per-report metadata: author, rank, unit, level, side, date written, scope, pages, scan, citation, passages, words, links
//   <out>/time_claims.json    every clock-time claim with its passage anchor, day, evidence class, author and units (the time-evidence table; time_evidence.json groups them by event)
//   <out>/manifest.json       provenance: URL, date, sha256, bytes, rights statement and tier of every file fetched; counts; the numbers of the run
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { splitSentences } from '../../../historian-src/core/text.js';
import { loadSources } from '../lib/sources.mjs';
import { createFetcher } from './fetch.mjs';
import { ingestOr27 } from './or27.mjs';
import { reportMeta, dispatchMeta, monthName } from './meta.mjs';
import { createPageMap } from './pagemap.mjs';
import { createOrLinker } from './link.mjs';
import { claimsOfDoc, summarize } from './anchors.mjs';
import { loadLinker, loadUnitRegistry } from './t1setup.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
export const CORPUS_VERSION = '1.0.0';
export const PARTS = [{ part: 1, source: 'or27-1', ia: 'warofrebellion271unit' }, { part: 2, source: 'or27-2', ia: 'warofrebellion272unit' }, { part: 3, source: 'or27-3', ia: 'warofrebellion273unit' }];
const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');
const sha8 = (s) => crypto.createHash('sha1').update(s).digest('hex').slice(0, 8);
const dl = (id, f) => `https://archive.org/download/${id}/${id}_${f}`;

const titleCase = (s) => String(s || '').replace(/\b([A-Z])([A-Z']+)\b/g, (m, a, b) => a + b.toLowerCase());
/** the citation lines of a document: who, in what capacity, and the volume (the page is added per quoted span) */
export function citeOf(meta) {
  const au = meta.author;
  const who = au ? (meta.kind === 'report' ? [au.rank, au.name].filter(Boolean).join(' ') + (meta.unit ? ', ' + meta.unit.replace(/,\s*(?:of|including)\s.*$/i, '').replace(/\.$/, '') : '') : titleCase(au.name || '')) : (meta.title ? meta.title.replace(/\.$/, '') : 'Official Records');
  const to = meta.addressee ? ` to ${meta.addressee.replace(/[:,.\s]+$/, '')}` : '';
  const base = `OR Ser. I, vol. 27, pt. ${meta.part}`;
  const label = meta.persp.label;
  return { author_line: who + to, short: `${who}${to}; ${label}; ${base}`, base, label };
}
const passageKind = (meta) => ({ report: 'report', correspondence: 'dispatch', order: 'order', return: 'return', organization: 'return', itinerary: 'itinerary' }[meta.kind] || 'record');
const dayOfIso = (iso) => (iso && /^1863-07-0[123]$/.test(iso) ? +iso.slice(9) : null);

/** the battle day a passage is about: the dispatch's own date, or the day its text names most often (July 1, 2 or 3); null when it names none or ties */
export function passageDay(text, meta) {
  if (meta.persp && meta.persp.contemporaneous && meta.written) return dayOfIso(meta.written.iso);
  const c = { 1: 0, 2: 0, 3: 0 };
  for (const m of text.matchAll(/\bJuly\s+([123])(?!\d)/g)) c[m[1]]++;
  for (const m of text.matchAll(/\b(?:on |of |the |until |by )?(?:the )?([123])(?:st|d|nd|rd)\s+(?:instant|inst\b)/gi)) c[m[1]]++;
  for (const m of text.matchAll(/\bthe\s+([123])(?:st|d|nd|rd)\b(?!\s+(?:Brigade|Division|Corps|Regiment|Battery|Maine|Massachusetts|New|Pennsylvania|Michigan|Wisconsin|Minnesota|Vermont|Ohio|Indiana|Illinois|Maryland|Virginia|Carolina|Georgia|Alabama|Mississippi|Louisiana|Texas|Arkansas|Tennessee|Florida|U\.|United|Connecticut|Rhode|Delaware|Kentucky|Missouri|West))/g)) c[m[1]]++;
  const top = Object.entries(c).sort((a, b) => b[1] - a[1]);
  return top[0][1] > 0 && top[0][1] > top[1][1] ? +top[0][0] : null;
}

export async function build({ parts = [1, 2, 3], rawDir = path.join(root, 'historian-src/raw/or27'), outDir = path.join(root, 'historian-src/corpus/or27'), aux = true, log = console.log, link = true } = {}) {
  const registry = loadSources();
  const f = createFetcher({ registry, log });
  const prov = []; const reports = []; const claims = []; const passagesOut = []; const docsOut = [];
  const T = link ? loadLinker() : null;
  const L = T ? createOrLinker({ idx: T.idx, link: T.link }) : null;
  const unitReg = loadUnitRegistry();
  const linkStats = { A: 0, B: 0, C: 0, passages_with_ents: 0, ents: 0, registry_side_disagree: 0, registry_missing: 0, authors: { reports: 0, person: 0, unit: 0, none: 0 } };
  fs.mkdirSync(rawDir, { recursive: true }); fs.mkdirSync(outDir, { recursive: true });
  for (const P of PARTS.filter((x) => parts.includes(x.part))) {
    const src = registry.sources.get(P.source);
    const url = dl(P.ia, 'djvu.txt');
    const res = await f.text(url);
    prov.push({ source: P.source, role: 'ocr-text', url, fetched_at: res.meta.fetched_at, sha256: res.sha256, bytes: res.bytes, content_type: res.meta.content_type, rights_statement_url: src.license.statement_url, rights_tier: src.tier, license_id: src.license.id });
    let pm = null;
    if (aux) {
      const pn = await f.get(dl(P.ia, 'page_numbers.json'));
      const sd = await f.get(dl(P.ia, 'scandata.xml'));
      for (const [role, r, u] of [['page-numbers', pn, dl(P.ia, 'page_numbers.json')], ['scandata', sd, dl(P.ia, 'scandata.xml')]]) prov.push({ source: P.source, role, url: u, fetched_at: r.meta.fetched_at, sha256: r.sha256, bytes: r.bytes, content_type: r.meta.content_type, rights_statement_url: src.license.statement_url, rights_tier: src.tier, license_id: src.license.id });
      pm = createPageMap({ pageNumbers: JSON.parse(pn.body.toString('utf8')), scandata: sd.body.toString('utf8'), iaId: P.ia });
    }
    log(`part ${P.part}: ${res.bytes} bytes (${res.cached ? 'cache' : 'downloaded'}) sha256 ${res.sha256.slice(0, 12)}`);
    const r = ingestOr27(res.text, { part: P.part });
    fs.writeFileSync(path.join(rawDir, `normalized-${P.part}.txt`), r.norm.text);
    const byDoc = new Map(); for (const p of r.passages) { if (!byDoc.has(p.doc_id)) byDoc.set(p.doc_id, []); byDoc.get(p.doc_id).push(p); }
    const side = P.part === 3 ? null : undefined;
    for (const d of r.docs) {
      const meta = P.part === 3 ? dispatchMeta(d, { part: 3 }) : reportMeta(d, { part: P.part });
      const ps = byDoc.get(d.doc_id) || [];
      const startScan = pm && meta.pages.start !== null ? pm.scan(meta.pages.start) : null;
      const cite = citeOf(meta);
      // ---- links ----------------------------------------------------------------------------------------------------------------------------------------------------------------
      let subjects = [], au = { person: null, units: [] }, per = null;
      if (L && ps.length) {
        if (P.part !== 3 && meta.kind === 'report') {
          au = L.resolveAuthor(meta, { side: meta.side });
          linkStats.authors.reports++; if (au.person) linkStats.authors.person++; if (au.units.length) linkStats.authors.unit++; if (!au.person && !au.units.length) linkStats.authors.none++;
          subjects = [...au.units.map((u) => ({ id: u.id, tier: u.tier })), ...(au.person ? [{ id: au.person.id, tier: au.person.tier }] : [])];
        }
        per = L.linkDocument(ps, { side: meta.side, subjects });
      }
      const docClaims = claimsOfDoc(meta, ps, { subjectUnits: subjects.filter((s) => !/^P:/.test(s.id)).map((s) => s.id), units: null });
      // a claim carries the units its own sentence names (A/B links of the passage's sentence)
      if (per) for (const c of docClaims) { const pi = ps.findIndex((p) => p.id === c.passage); const ids = new Set(c.units); for (const m of per.passages[pi].mentions) if (m.sentence === c.sentence && m.tier !== 'C' && /^(?:regiment|brigade|division|corps|army|artillery|artillery-unit)$/.test(m.kind)) ids.add(T.idx.R[m.i].id); c.units = [...ids].sort(); }
      claims.push(...docClaims);
      ps.forEach((p, k) => {
        const ents = per ? per.passages[k].ents : [];
        if (per) { for (const m of per.passages[k].mentions) { linkStats[m.tier]++; if (unitReg && m.kind === 'regiment') { const u = unitReg.get(T.idx.R[m.i].id); if (!u) linkStats.registry_missing++; else if (u.side !== (T.idx.R[m.i].side === 'U' ? 'union' : 'confederate')) linkStats.registry_side_disagree++; } } if (ents.length) { linkStats.passages_with_ents++; linkStats.ents += ents.length; } }
        const clk = []; const sents = splitSentences(p.text); sents.forEach((x, si) => { if (docClaims.some((c) => c.passage === p.id && c.sentence === si)) clk.push(x.s); });
        // the scan of every page break inside the passage: [offset, printed page, leaf, reader index]
        const pg = (p.pg && p.pg.length ? p.pg : [[0, p.pages.start]]).filter((x) => x[1] !== null).map(([off, page]) => { const sc = pm ? pm.scan(page) : null; return sc ? [off, page, sc.leaf, sc.reader] : [off, page]; });
        passagesOut.push({
          id: p.id, doc: d.doc_id, rec: d.doc_id, seq: p.seq, part: P.part, source_id: P.source, kind: passageKind(meta), day: passageDay(p.text, meta), scope: meta.scope === 'gettysburg' ? 'core' : 'campaign', side: meta.side,
          text: p.text, sb: p.sb, words: p.words, pg, clk, ents, s: p.s, e: p.e,
          cite: { short: cite.short, author_line: cite.author_line, base: cite.base, label: cite.label, ia: P.ia },
          persp: { side: meta.side, genre: meta.persp.genre, contemporaneous: meta.persp.contemporaneous, retrospective: meta.persp.retrospective, lag_days: meta.persp.lag_days, rank_class: meta.author ? meta.author.rank_class : null, written: meta.written ? meta.written.iso : null, composite: !!meta.composite },
        });
      });
      docsOut.push({ id: d.doc_id, part: P.part, start: d.start, end: d.end });
      reports.push({
        ...meta, scan: startScan, passages: ps.length, words: ps.reduce((a, p) => a + p.words, 0), claims: docClaims.length,
        author_links: { person: au.person, units: au.units }, entities: per ? [...new Set(per.passages.flatMap((x) => x.ents.map((e) => e[0])))].length : null,
      });
    }
    log(`  ${r.docs.length} documents, ${r.passages.length} passages, ${r.passages.reduce((a, p) => a + p.words, 0)} words; report ${JSON.stringify({ docs: r.report.docs, missing: r.report.docs_missing_from_run, heads_left: r.report.running_heads_left, tail: r.report.tail })}`);
    prov.push({ source: P.source, role: 'run-report', docs: r.report.docs, passages: r.passages.length, missing_numbers: r.report.docs_missing_from_run, tail: r.report.tail || null, page_marks: r.report.page_marks, page_marks_inferred: r.report.page_marks_inferred, running_heads_left: r.report.running_heads_left, dispatch: r.report.dispatch || null });
  }
  // stable numbering: part, then document order
  passagesOut.forEach((p, i) => { p.n = i; });
  fs.writeFileSync(path.join(rawDir, 'passages.jsonl'), passagesOut.map((p) => JSON.stringify(p)).join('\n') + '\n');
  fs.writeFileSync(path.join(rawDir, 'docs.jsonl'), docsOut.map((d) => JSON.stringify(d)).join('\n') + '\n');
  // reports.json: the numbered reports (parts 1 and 2), one rich row each; dispatches.json: the dispatches of part 3 as a table (fields + rows); time_claims.json: every clock-time claim as a table
  const table = (objs, fields) => ({ fields, rows: objs.map((o) => fields.map((f) => (o[f] === undefined ? null : o[f]))) });
  fs.writeFileSync(path.join(outDir, 'reports.json'), JSON.stringify({ corpus_version: CORPUS_VERSION, reports: reports.filter((r) => r.part !== 3) }));
  const dispatchRows = reports.filter((r) => r.part === 3).map((r) => ({ id: r.id, kind: r.kind, side: r.side, signer: r.author && r.author.name, addressee: r.addressee || null, written: r.written && r.written.iso, place: r.written && r.written.place, clock: r.clock ? r.clock.text : null, clock_min: r.clock ? r.clock.min : null, page: r.pages.start, leaf: r.scan ? r.scan.leaf : null, scope: r.scope, passages: r.passages, words: r.words, claims: r.claims }));
  fs.writeFileSync(path.join(outDir, 'dispatches.json'), JSON.stringify({ corpus_version: CORPUS_VERSION, ...table(dispatchRows, Object.keys(dispatchRows[0] || {})) }));
  const claimFields = ['passage', 'doc', 'sentence', 'ss', 'se', 's', 'e', 'text', 'kind', 'min', 'ampm', 'cand', 'tol', 'mod', 'from', 'to', 'word', 'day', 'day_basis', 'evidence', 'author', 'rank_class', 'unit', 'side', 'written', 'lag_days', 'page', 'units'];
  fs.writeFileSync(path.join(outDir, 'time_claims.json'), JSON.stringify({ corpus_version: CORPUS_VERSION, ...table(claims, claimFields) }));
  const totals = { documents: reports.length, passages: passagesOut.length, words: passagesOut.reduce((a, p) => a + p.words, 0), reports_found: reports.filter((r) => r.part !== 3).length, dispatches: reports.filter((r) => r.part === 3).length };
  const man = { corpus_version: CORPUS_VERSION, built_with: { node: process.version, ingest_sha: sha256(Buffer.from(fs.readdirSync(here).filter((x) => x.endsWith('.mjs')).sort().map((x) => fs.readFileSync(path.join(here, x), 'utf8')).join('\n'))).slice(0, 16) }, linker_registry_sha: T ? T.sha : null,
    sources: prov, totals, link_stats: linkStats, time: summarize(claims) };
  fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(man, null, 1));
  log(JSON.stringify(totals), JSON.stringify(linkStats), JSON.stringify(man.time));
  return { totals, man };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2); const arg = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
  if (args[0] !== 'build') { console.log('usage: corpus.mjs build [--parts 1,2,3] [--raw dir] [--out dir] [--no-aux]'); process.exit(2); }
  build({ parts: arg('parts', '1,2,3').split(',').map(Number), rawDir: path.resolve(root, arg('raw', 'historian-src/raw/or27')), outDir: path.resolve(root, arg('out', 'historian-src/corpus/or27')), aux: !args.includes('--no-aux') })
    .then(() => process.exit(0), (e) => { console.error(e.stack || e.message); process.exit(1); });
}
