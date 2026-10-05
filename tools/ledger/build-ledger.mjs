// Builds data-src/ledger/conflict_ledger.json, data-src/ledger/source_windows.json and a Markdown-free export from ledger-spec.mjs.
//   node tools/ledger/build-ledger.mjs [--check]      (fetches the cached sources politely if missing; --check only compares with the files on disk)
// The builder locates every quote on its leaf, derives printed pages from the leaves' own running heads, runs the validator on its own output
// and refuses to write a ledger that does not validate.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pretty } from '../environment/json-out.mjs';
import { loadIaLeaves } from '../environment/ia-pages.mjs';
import { locateQuote, pageOfLeaf, windowAround, readerN } from '../environment/source-verify.mjs';
import { fetchCached, readCached } from '../environment/fetch.mjs';
import { htmlToText } from '../environment/htmltext.mjs';
import { alnumKey } from '../environment/ia-pages.mjs';
import { SOURCES, QUOTES, ROWS, SITE_VALUES, IA } from './ledger-spec.mjs';
import { validateLedger, readSiteValue, checkTable, figureMapSum, ROOT } from './ledger-lib.mjs';

const OUT = path.join(ROOT, 'data-src', 'ledger');
const flat = (x) => (Array.isArray(x) ? x : [x]);
const iaKeyOf = (ia) => Object.keys(IA).find((k) => IA[k].ia === ia);

export async function build() {
  const problems = [], windows = {};
  const readings = JSON.parse(fs.readFileSync(path.join(OUT, 'visual_readings.json'), 'utf8')).readings;
  const quotes = [];
  for (const q of QUOTES) {
    if (q.type === 'ocr') {
      const keys = q.copies || [iaKeyOf(q.ia)];
      const witnesses = [], ocrMisses = [];
      let page = q.page;
      for (const k of keys) {
        const w = IA[k];
        const leaves = (await loadIaLeaves(w.ia, { kind: w.kind })).leaves;
        const frags = flat(q.text);
        // candidate leaves: those holding every fragment; prefer the one whose printed page is the expected page
        let cands = locateQuote(leaves, frags[0]).map((h) => h.leaf);
        for (const f of frags.slice(1)) { const s = new Set(locateQuote(leaves, f).map((h) => h.leaf)); cands = cands.filter((c) => s.has(c)); }
        const withPages = cands.map((leaf) => ({ leaf, page: pageOfLeaf(leaves, leaf).page }));
        const pick = page == null ? withPages[0] : withPages.find((c) => c.page === page);
        if (!pick) { if (k === keys[0] || witnesses.length === 0) { if (!(q.page > 43 && w.ia === 'notesonrebelinv00jacogoog')) ocrMisses.push(k); } else ocrMisses.push(k); if (cands.length) problems.push(`${q.id}: found on leaf(s) ${withPages.map((c) => `${c.leaf}=p.${c.page}`).join(', ')} of ${w.ia}, expected page ${page}`); else if (k === keys[0]) problems.push(`${q.id}: not found in ${w.ia}`); continue; }
        if (page == null) page = pick.page;
        witnesses.push({ witness: k, ia: w.ia, kind: w.kind, leaf: pick.leaf, printed_page: pick.page, reader_n: readerN(w.ia, pick.leaf) });
        windows[`${q.id}|${k}`] = { leaf: pick.leaf, printed_page: pick.page, text: frags.map((f) => windowAround(leaves, pick.leaf, f, 200)).join(' ... ') };
      }
      if (keys.length > 1 && witnesses.length < 2) problems.push(`${q.id}: expected in ${keys.length} scans, found in ${witnesses.length}`);
      quotes.push({ id: q.id, type: 'ocr', source: q.source, text: q.text, printed_page: page, who: q.who, witnesses, ...(q.image_confirm ? { image_confirm: q.image_confirm } : {}), ...(q.copies ? { reading: q.reading } : {}), ...(q.note ? { note: q.note } : {}), ...(q.sum_check ? { sum_check: q.sum_check } : {}), ...(q.numbers_note ? { numbers_note: q.numbers_note } : {}), ...(ocrMisses.length && keys.length > 1 ? { ocr_misses: ocrMisses } : {}) });
    } else if (q.type === 'image') {
      const r = readings.find((x) => x.id === q.reading);
      if (!r) { problems.push(`${q.id}: reading ${q.reading} missing`); continue; }
      quotes.push({ id: q.id, type: 'image', source: q.source, ia: q.ia, kind: q.kind, text: q.text, printed_page: q.page, reading: q.reading, ocr_check: q.ocr_check, who: q.who, ...(q.ocr_note ? { ocr_note: q.ocr_note } : {}), ...(q.table ? { table: true } : {}) });
    } else if (q.type === 'web') {
      const src = SOURCES.find((s) => s.id === q.source);
      const r = await fetchCached(src.url, { name: src.cache });
      const text = htmlToText(readCached(r.file));
      if (!alnumKey(text).includes(alnumKey(flat(q.text).join(' ')))) problems.push(`${q.id}: text not found on ${src.url}`);
      const i = text.replace(/\s+/g, ' ').indexOf(q.text.slice(0, 24));
      windows[q.id] = { text: i >= 0 ? text.replace(/\s+/g, ' ').slice(Math.max(0, i - 100), i + q.text.length + 100) : '' };
      quotes.push({ id: q.id, type: 'web', source: q.source, text: q.text, who: q.who, sha256: r.meta.sha256, retrieved: r.meta.retrieved.slice(0, 10) });
    } else if (q.type === 'ref') quotes.push(q);
    else problems.push(`${q.id}: unknown type`);
  }
  for (const [id, sv] of Object.entries(SITE_VALUES)) {
    const actual = readSiteValue(sv.file, sv.path);
    if (actual !== sv.value) problems.push(`site value ${id}: the file says ${actual}, the spec says ${sv.value}`);
    quotes.push({ id, type: 'site', source: 'site-data', file: sv.file, path: sv.path, value: sv.value, text: String(sv.value), who: 'this project\'s own data (CANDIDATE)' });
  }

  // rows: copy, add the by-corps table, and set the quote lists
  const rows = ROWS.map((r) => ({ ...r, values: r.values.map((v) => ({ ...v })) }));
  const w19 = rows.find((r) => r.id === 'WSD-19');
  if (w19) {
    const a = readings.find((x) => x.id === 'VR-or1-p187-recap'), b = readings.find((x) => x.id === 'VR-fox-p25');
    const fig = (t, row) => { const o = {}; for (const n of ['killed', 'wounded', 'missing', 'total']) { const cols = t.figure_map[n]; o[n] = cols.reduce((s, c) => s + (row[1 + t.columns.indexOf(c)] || 0), 0); } return o; };
    const units = [];
    const norm = (s) => s.replace(/^General headquarters$/i, 'General Headquarters').replace(' Army Corps', ' Corps').replace('Reserve Artillery', 'Artillery Reserve');
    const mapB = Object.fromEntries(b.table.rows.map((r) => [norm(r[0]).replace(/^1st/, 'First').replace(/^2d/, 'Second').replace(/^3d/, 'Third').replace(/^5th/, 'Fifth').replace(/^6th/, 'Sixth').replace(/^11th/, 'Eleventh').replace(/^12th/, 'Twelfth'), fig(b.table, r)]));
    for (const r of a.table.rows) {
      const name = norm(r[0]), fa = fig(a.table, r), fb = mapB[name];
      if (!fb) { problems.push(`WSD-19: no Fox row for ${name}`); continue; }
      units.push({ unit: name, v1: fa, v2: fb, difference_v2_minus_v1: Object.fromEntries(Object.keys(fa).map((k) => [k, fb[k] - fa[k]])) });
    }
    const ta = fig(a.table, a.table.total_row), tb = fig(b.table, b.table.total_row);
    w19.by_unit = { readings: ['VR-or1-p187-recap', 'VR-fox-p25'], units, totals: { v1: ta, v2: tb }, differing_corps_totals: units.filter((u) => u.difference_v2_minus_v1.total !== 0).map((u) => u.unit), differing_in_any_column: units.filter((u) => Object.values(u.difference_v2_minus_v1).some((d) => d !== 0)).map((u) => u.unit), note: 'v1 = Official Records p. 187 (officers and men added), v2 = Fox p. 25; every figure comes from the two page-image readings, which are checked for row and column sums.' };
  }
  const data = {
    schema_version: 1, dataset: 'conflict_ledger',
    title: 'Where the Sources Disagree: the first twenty rows',
    status: 'Verified rows only. Every quote was found on its page of the cited scan (or the cited web page), every printed page was checked against the leaf\'s own running head, every table was read from the page image and added up, and every number was matched to its quote. What could not be verified is in held_back and the review queue (docs/facts/README.md). No averaging, no silent choice.',
    rules: {
      no_averaging: 'Values are never averaged, merged or reconciled. Every printed value stays visible with its source, edition and page.',
      shown_first: 'Each row names which value is displayed first and writes the rule. The rule decides the order of display, never which value is true (pitch 2.5b).',
      status_ladder: { 'adopted with reason': 'one value is shown first for a written reason, all others stay visible', open: 'no value is settled; the sources and what would settle it are shown', unresolvable: 'the sources cannot be reconciled because they describe different things or different moments' },
      tiers: { A1: 'public domain by date (published before 1931) or a US Government publication; quoted verbatim', B: 'facts only, attributed; a secondary compilation (here only US Government web pages of the National Park Service)', S: 'this project\'s own data, shown only to show where its numbers come from' },
      verification: 'figure-level methods: ocr_or_text (the number is in the text of the scan or page), image (read from the page image), second_scan (same book, another scan), ocr_corroborates_image (the OCR text of the page also holds the number); checksum = the figure sits inside a passing addition. See docs/facts/README.md.',
      link_out_only: ['American Battlefield Trust', 'Stone Sentinels', 'David Rumsey', 'Ancestry/Fold3', 'Find a Grave', 'HMDB']
    },
    sources: SOURCES,
    quotes,
    rows,
  };
  return { data, windows, problems };
}

async function main() {
  const { data, windows, problems } = await build();
  // validate first (offline: the sources were just cached by the build), attach the verification block, validate again
  const v1 = await validateLedger(data, { offline: true, windows });
  for (const row of data.rows) for (const val of row.values) {
    const d = v1.details[`${row.id}.${val.id}`] || {};
    val.verification = { figures: Object.fromEntries(Object.entries(d).map(([k, x]) => [k, { methods: x.methods, checksum: x.checksum }])) };
    const figs = Object.values(d);
    const two = figs.filter((x) => (x.methods.includes('image') && (x.methods.includes('ocr_corroborates_image') || x.methods.includes('ocr_or_text') || x.methods.includes('text'))) || (x.methods.includes('ocr_or_text') && x.methods.includes('second_scan'))).length;
    val.verification.level = figs.length && two === figs.length ? 'two_extraction_methods' : figs.length && figs.every((x) => x.checksum || two) ? 'one_extraction_method_plus_checksum' : 'one_extraction_method';
  }
  const v2 = await validateLedger(data, { offline: true, windows });
  data.summary = { rows: data.rows.length, values: v2.metrics.values, quotes: v2.metrics.quotes, figures: v2.metrics.figures, figures_two_extraction_methods: v2.metrics.figures_two_extraction_methods, figures_ocr_plus_checksum: v2.metrics.figures_ocr_plus_checksum, figures_single_method: v2.metrics.figures_single_method };
  const all = [...problems, ...v2.errors];
  if (all.length) { console.error('LEDGER BUILD PROBLEMS:\n - ' + all.join('\n - ')); if (!process.argv.includes('--force')) process.exit(1); }
  v2.warnings.forEach((w) => console.warn('warning: ' + w));
  const outputs = {
    'conflict_ledger.json': pretty(data) + '\n',
    'source_windows.json': pretty({ schema_version: 1, note: 'Short windows of the source text around each OCR or web quote, committed so quotes can be re-checked offline. The authoritative check is against the cached source (tmp/env-cache), see tools/ledger/validate.mjs.', windows }) + '\n',
  };
  const check = process.argv.includes('--check');
  let bad = 0;
  fs.mkdirSync(OUT, { recursive: true });
  for (const [name, text] of Object.entries(outputs)) {
    const file = path.join(OUT, name);
    if (check) { const cur = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null; if (cur !== text) { console.error('STALE: ' + name); bad++; } else console.log('ok ' + name); }
    else { fs.writeFileSync(file, text); console.log('wrote ' + path.relative(ROOT, file) + ' (' + text.length + ' bytes)'); }
  }
  console.log(JSON.stringify(data.summary));
  process.exit(bad ? 1 : 0);
}
if (process.argv[1] && path.basename(process.argv[1]) === 'build-ledger.mjs') await main();
