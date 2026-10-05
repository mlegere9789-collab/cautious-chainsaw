// Checks for data-src/ledger/conflict_ledger.json. validateLedger() re-checks the built file against the cached sources (or, offline, against the committed
// text windows), the page-image readings and the arithmetic; the builder runs it on its own output and the tests run it on seeded errors.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { alnumKey, loadIaLeaves } from '../environment/ia-pages.mjs';
import { locateQuote, pageOfLeaf, headerPage } from '../environment/source-verify.mjs';
import { fetchCached, readCached, CACHE_DIR, sha256 } from '../environment/fetch.mjs';
import { htmlToText } from '../environment/htmltext.mjs';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const STATUS_LADDER = ['adopted with reason', 'open', 'unresolvable'];
export const FORBIDDEN_KEYS = ['mean', 'average', 'avg', 'median', 'midpoint', 'reconciled', 'consensus', 'best_estimate', 'adopted_value', 'chosen_value', 'true_value', 'weighted'];
export const LINK_OUT_ONLY = /american ?battlefield ?trust|battlefields?\.org|stone ?sentinels|stonesentinels|rumsey|ancestry|fold3|findagrave|hmdb\.org|familysearch/i;

// ------------------------------------------------------------------ numbers in text
export const numbersIn = (text) => [...String(text).matchAll(/\d[\d,]*(?:\.\d+)?/g)].map((m) => Number(m[0].replace(/,/g, ''))).filter((n) => Number.isFinite(n));
const UNITS = { zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19 };
const TENS = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
/** numbers written in words: "one hundred and twenty" -> 120, "thirty-five hundred and twelve" -> 3512, "a hundred" -> 100 */
export function wordNumbers(text) {
  const toks = String(text).toLowerCase().replace(/,\s+and\b/g, ' and').replace(/[^a-z\- ]+/g, ' | ').replace(/-/g, ' ').split(/\s+/).filter(Boolean); // punctuation (except ", and") breaks a number phrase
  const out = [];
  let i = 0;
  while (i < toks.length) {
    const t = toks[i];
    const isNum = (x) => x in UNITS || x in TENS || x === 'hundred' || x === 'thousand';
    if (isNum(t) || (t === 'a' && toks[i + 1] === 'hundred')) {
      let total = 0, cur = 0, j = i, any = false;
      while (j < toks.length) {
        const x = toks[j];
        if (x === 'a' && toks[j + 1] === 'hundred') { cur = 1; j++; continue; }
        if (x in UNITS) { cur += UNITS[x]; any = true; j++; }
        else if (x in TENS) { cur += TENS[x]; any = true; j++; }
        else if (x === 'hundred') { cur = (cur || 1) * 100; any = true; j++; }
        else if (x === 'thousand') { total += (cur || 1) * 1000; cur = 0; any = true; j++; }
        else if (x === 'and' && j + 1 < toks.length && (toks[j + 1] in UNITS || toks[j + 1] in TENS) && any) j++;
        else break;
      }
      if (any) out.push(total + cur);
      i = Math.max(j, i + 1);
    } else i++;
  }
  return out;
}
/** clock times in text: [{ h, m|null, ap|null }] */
export function timesIn(text) {
  const t = String(text), out = [];
  for (const m of t.matchAll(/(\d{1,2})[.:](\d{2})\s*([ap])\.?\s?m/gi)) out.push({ h: +m[1], m: +m[2], ap: m[3].toLowerCase() });
  for (const m of t.matchAll(/(?<![.:\d])(\d{1,2})\s*([ap])\.\s?m\./gi)) out.push({ h: +m[1], m: 0, ap: m[2].toLowerCase() });
  for (const m of t.matchAll(/(?<![.:\d])(\d{1,2})[.:](\d{2})\s+o.clock/gi)) out.push({ h: +m[1], m: +m[2], ap: null });
  for (const m of t.matchAll(/(?<![.:\d])(\d{1,2})\s+o.clock/gi)) out.push({ h: +m[1], m: 0, ap: null });
  const MIN = { seven: 7 };
  for (const m of t.matchAll(/(seven) minutes past (\d{1,2})\s*([ap])\.?\s?m/gi)) out.push({ h: +m[2], m: MIN[m[1].toLowerCase()], ap: m[3].toLowerCase() });
  return out;
}
export function parseClock(s) { const m = /^(\d{1,2}):(\d{2}) ([ap])\.m\.$/.exec(s); return m ? { h: +m[1], m: +m[2], ap: m[3] } : null; }

// ------------------------------------------------------------------ helpers
const flatten = (x) => (Array.isArray(x) ? x : [x]);
const keyOf = (s) => alnumKey(String(s));
export function figureMapSum(table, names) { return names.reduce((s, n) => s + (table.total_row[1 + table.columns.indexOf(n)] || 0), 0); }

/** structural arithmetic of a table reading: returns problems */
export function checkTable(reading) {
  const t = reading.table, problems = [];
  if (!t || !t.rows) return ['reading has no table'];
  if (t.figure_row) return problems; // single-row reading: nothing to add up
  const ncol = t.columns.length;
  const cell = (r, c) => (r[1 + c] == null ? 0 : r[1 + c]);
  const fm = t.figure_map;
  if (fm) {
    const idx = (n) => t.columns.indexOf(n);
    const sumNames = (r, names) => names.reduce((s, n) => s + cell(r, idx(n)), 0);
    for (const r of [...t.rows, t.total_row]) {
      const parts = (fm.killed || []).concat(fm.wounded || [], fm.missing || []);
      const total = sumNames(r, fm.total);
      if (parts.length && sumNames(r, parts) !== total) problems.push(`row "${r[0]}": killed+wounded+missing = ${sumNames(r, parts)} but the aggregate is ${total}`);
    }
  }
  for (let c = 0; c < ncol; c++) {
    const colSum = t.rows.reduce((s, r) => s + cell(r, c), 0), tot = cell(t.total_row, c);
    if (colSum !== tot) problems.push(`column "${t.columns[c]}": rows add up to ${colSum} but the total row says ${tot}`);
  }
  return problems;
}

async function leavesOf(q, offline) { return (await loadIaLeaves(q.ia, { kind: q.kind || 'djvu', offline })).leaves; }

/** OCR number tokens of a leaf (standalone numbers as printed, commas removed) */
function leafNumberTokens(leaves, leaf) { return new Set(numbersIn(leaves[leaf].join(' '))); }

// ------------------------------------------------------------------ the validator
export async function validateLedger(data, opts = {}) {
  const details = {};
  const errors = [], warnings = [], metrics = { quotes: 0, quotes_checked_against_cache: 0, quotes_checked_against_windows: 0, figures: 0, figures_two_extraction_methods: 0, figures_ocr_plus_checksum: 0, figures_single_method: 0, values: 0, rows: 0 };
  const err = (m) => errors.push(m), warn = (m) => warnings.push(m);
  const offline = opts.offline !== false;           // default: never touch the network
  const readings = opts.readings || JSON.parse(fs.readFileSync(path.join(ROOT, 'data-src', 'ledger', 'visual_readings.json'), 'utf8')).readings;
  const windows = opts.windows || (fs.existsSync(path.join(ROOT, 'data-src', 'ledger', 'source_windows.json')) ? JSON.parse(fs.readFileSync(path.join(ROOT, 'data-src', 'ledger', 'source_windows.json'), 'utf8')).windows : {});
  const reading = (id) => readings.find((r) => r.id === id);
  const sources = Object.fromEntries((data.sources || []).map((s) => [s.id, s]));
  const quotes = Object.fromEntries((data.quotes || []).map((q) => [q.id, q]));
  if (Object.keys(sources).length !== (data.sources || []).length) err('duplicate source ids');
  if (Object.keys(quotes).length !== (data.quotes || []).length) err('duplicate quote ids');

  // ---- quotes
  const quoteInfo = {}; // id -> { tokens:Set<number>, words:number[], times:[], pageOk }
  for (const q of data.quotes || []) {
    metrics.quotes++;
    const src = sources[q.source];
    if (!src) { err(`quote ${q.id}: unknown source ${q.source}`); continue; }
    const frags = flatten(q.text);
    const info = { tokens: new Set(), words: [], times: [], leafTokens: new Set(), image: false };
    quoteInfo[q.id] = info;
    for (const f of frags) { numbersIn(f).forEach((n) => info.tokens.add(n)); info.words.push(...wordNumbers(f)); info.times.push(...timesIn(f)); }
    if (q.type === 'ocr') {
      if (q.image_confirm) {
        const r = reading(q.image_confirm);
        if (!r) err(`quote ${q.id}: image_confirm reading ${q.image_confirm} not found`);
        else {
          if (r.printed_page !== q.printed_page) err(`quote ${q.id}: printed page ${q.printed_page} differs from the confirming reading's ${r.printed_page}`);
          info.imageTokens = new Set(r.numbers || []);
          info.imageTimes = (r.times || []).map(parseClock);
          const metaFile = path.join(CACHE_DIR, r.image.cache + '.meta.json');
          if (fs.existsSync(metaFile)) { const m = JSON.parse(fs.readFileSync(metaFile, 'utf8')); if (m.sha256 !== r.image.sha256) err(`reading ${r.id}: the cached image has a different hash than the one read`); }
        }
      }
      const wits = q.witnesses || [];
      if (!wits.length) err(`quote ${q.id}: no witnesses`);
      let checkedCache = false;
      for (const w of wits) {
        try {
          const leaves = await leavesOf(w, offline);
          checkedCache = true;
          if (w.leaf < 0 || w.leaf >= leaves.length) { err(`quote ${q.id}: leaf ${w.leaf} outside ${w.ia}`); continue; }
          for (const f of frags) { const hits = locateQuote(leaves, f).map((h) => h.leaf); if (!hits.includes(w.leaf)) err(`quote ${q.id}: fragment "${f.slice(0, 60)}" not found on leaf ${w.leaf} of ${w.ia}` + (hits.length ? ` (found on ${hits.slice(0, 5).join(',')})` : ' (found nowhere)')); }
          const p = pageOfLeaf(leaves, w.leaf);
          if (p.page == null) err(`quote ${q.id}: no printed page derivable for leaf ${w.leaf} of ${w.ia}`);
          else if (p.page !== Number(w.printed_page)) err(`quote ${q.id}: printed page ${w.printed_page} recorded but the running head of leaf ${w.leaf} of ${w.ia} gives ${p.page}`);
          leafNumberTokens(leaves, w.leaf).forEach((n) => info.leafTokens.add(n));
        } catch (e) {
          if (e.name === 'NotCachedError' || /not cached/.test(e.message)) { /* fall back to the windows below */ } else throw e;
        }
      }
      if (checkedCache) metrics.quotes_checked_against_cache++;
      else {
        if (opts.requireCache) err(`quote ${q.id}: source not cached and --require-cache is set`);
        else {
          let any = false;
          for (const w of wits) {
            const win = windows[`${q.id}|${w.witness}`];
            if (!win) continue;
            any = true;
            if (win.leaf !== w.leaf || win.printed_page !== w.printed_page) err(`quote ${q.id}: witness ${w.witness} says leaf ${w.leaf} page ${w.printed_page}, the committed window was cut from leaf ${win.leaf} page ${win.printed_page}`);
            if (w === wits[0]) for (const f of frags) if (!keyOf(win.text).includes(keyOf(f))) err(`quote ${q.id}: fragment "${f.slice(0, 50)}" not in the committed window (offline check)`);
          }
          if (any) metrics.quotes_checked_against_windows++; else warn(`quote ${q.id}: source not cached and no committed window`);
        }
      }
      if (!Number.isInteger(q.printed_page) && q.printed_page !== null) err(`quote ${q.id}: printed_page must be an integer`);
    } else if (q.type === 'image') {
      const r = reading(q.reading);
      if (!r) { err(`quote ${q.id}: reading ${q.reading} not found`); continue; }
      info.image = true;
      if (r.printed_page !== q.printed_page) err(`quote ${q.id}: printed page ${q.printed_page} differs from the reading's ${r.printed_page}`);
      const rnums = new Set(r.numbers || []);
      for (const row of (r.table ? [...r.table.rows, r.table.total_row].filter(Boolean) : [])) row.slice(1).forEach((n) => typeof n === 'number' && rnums.add(n));
      for (const n of r.notes_read || []) (n.numbers || []).forEach((x) => rnums.add(x));
      if (r.table && r.table.figure_map && r.table.total_row) for (const [name, cols] of Object.entries(r.table.figure_map)) rnums.add(figureMapSum(r.table, cols));
      for (const n of numbersIn(frags.join(' '))) if (!rnums.has(n) && ![1, 2, 3, 4].includes(n)) err(`quote ${q.id}: the number ${n} in the quoted text is not among the numbers read from the image (${q.reading})`);
      rnums.forEach((n) => info.tokens.add(n));
      if (r.table) checkTable(r).forEach((p) => err(`reading ${r.id}: ${p}`));
      // the image's cache hash, if the image is cached
      const metaFile = path.join(CACHE_DIR, r.image.cache + '.meta.json');
      if (fs.existsSync(metaFile)) { const m = JSON.parse(fs.readFileSync(metaFile, 'utf8')); if (m.sha256 !== r.image.sha256) err(`reading ${r.id}: the cached image has a different hash than the one read`); }
      // OCR check
      const oc = q.ocr_check;
      if (oc) {
        try {
          const leaves = await leavesOf(q, offline);
          const leaf = r.image.reader_n;
          for (const f of oc.expect_found || []) if (!locateQuote(leaves, f).some((h) => h.leaf === leaf)) err(`quote ${q.id}: OCR expectation "${f}" not found on leaf ${leaf}`);
          for (const v of oc.known_ocr_variants || []) {
            const hits = locateQuote(leaves, v.ocr).map((h) => h.leaf);
            if (!hits.includes(leaf)) warn(`quote ${q.id}: the recorded OCR variant "${v.ocr}" is no longer on leaf ${leaf} (OCR text changed?)`);
            if (locateQuote(leaves, v.printed).some((h) => h.leaf === leaf)) warn(`quote ${q.id}: the printed reading "${v.printed}" now appears in the OCR text: the OCR may have been corrected`);
            if (keyOf(v.printed) === keyOf(v.ocr)) err(`quote ${q.id}: an OCR variant must differ from the printed reading`);
          }
          const p = pageOfLeaf(leaves, leaf);
          if (p.page !== q.printed_page) err(`quote ${q.id}: printed page ${q.printed_page} but the running head of leaf ${leaf} gives ${p.page}`);
          leafNumberTokens(leaves, leaf).forEach((n) => info.leafTokens.add(n));
          metrics.quotes_checked_against_cache++;
        } catch (e) { if (e.name === 'NotCachedError' || /not cached/.test(e.message)) { if (opts.requireCache) err(`quote ${q.id}: OCR source not cached and --require-cache is set`); } else throw e; }
      }
    } else if (q.type === 'web') {
      const metaName = (src.cache) ? src.cache : null;
      try {
        const r = await fetchCached(src.url, { name: metaName, offline: true });
        const text = htmlToText(readCached(r.file));
        if (!keyOf(text).includes(keyOf(frags.join(' ')))) err(`quote ${q.id}: text not found in the cached page ${src.url}`);
        if (q.sha256 && q.sha256 !== r.meta.sha256) warn(`quote ${q.id}: the cached page differs from the one quoted (hash)`);
        metrics.quotes_checked_against_cache++;
      } catch (e) {
        if (e.name === 'NotCachedError') { const win = windows[q.id]; if (opts.requireCache) err(`quote ${q.id}: page not cached and --require-cache is set`); else if (win) { metrics.quotes_checked_against_windows++; if (!keyOf(win.text).includes(keyOf(frags.join(' ')))) err(`quote ${q.id}: not in the committed window`); } else warn(`quote ${q.id}: page not cached and no window`); } else throw e;
      }
    } else if (q.type === 'site') {
      const v = readSiteValue(q.file, q.path);
      if (v === undefined) err(`site quote ${q.id}: ${q.file} ${q.path} not found`);
      else if (v !== q.value) (opts.strictSite ? err : warn)(`site quote ${q.id}: the site data now says ${v} but the ledger recorded ${q.value} (the site data changed; rebuild)`);
      info.tokens.add(q.value);
    } else if (q.type === 'ref') {
      // a value in weather_by_day.json
      const w = opts.weather || JSON.parse(fs.readFileSync(path.join(ROOT, 'data-src', 'environment', 'weather_by_day.json'), 'utf8'));
      const o = w.observations.find((x) => x.id === q.observation);
      if (!o) err(`ref quote ${q.id}: observation ${q.observation} not in weather_by_day.json`);
      else {
        const entry = (o.values || []).find((x) => x.source_witness === q.witness);
        if (!entry) err(`ref quote ${q.id}: witness ${q.witness} not in ${q.observation}`);
        else if (entry.value !== q.value) err(`ref quote ${q.id}: weather_by_day says ${entry.value} for ${q.witness}, ledger recorded ${q.value}`);
        info.tokens.add(q.value);
      }
    } else err(`quote ${q.id}: unknown type ${q.type}`);
    if (q.type === 'ocr' && q.sum_check) {
      const s = q.sum_check.numbers.reduce((a, b) => a + b, 0);
      if (s !== q.sum_check.total) err(`quote ${q.id}: the table's lines add up to ${s}, not the printed total ${q.sum_check.total}`);
    }
  }

  // ---- rows
  const seenRowIds = new Set();
  for (const row of data.rows || []) {
    metrics.rows++;
    if (seenRowIds.has(row.id)) err(`duplicate row id ${row.id}`); seenRowIds.add(row.id);
    for (const k of Object.keys(row)) if (FORBIDDEN_KEYS.includes(k.toLowerCase())) err(`${row.id}: forbidden key "${k}" (no averaging, no silent choice)`);
    if (!STATUS_LADDER.includes(row.status)) err(`${row.id}: status "${row.status}" is not on the ladder ${STATUS_LADDER.join(' | ')}`);
    for (const f of ['title', 'question', 'reason_for_difference', 'what_would_settle']) if (!row[f] || String(row[f]).length < 20) err(`${row.id}: missing ${f}`);
    if (!row.shown_first || !row.shown_first.rule) err(`${row.id}: shown_first.rule is required (written reason for the display order)`);
    const vals = row.values || [];
    if (vals.length < 2) err(`${row.id}: a conflict row needs at least two values`);
    const ids = new Set(vals.map((v) => v.id));
    if (ids.size !== vals.length) err(`${row.id}: duplicate value ids`);
    if (row.shown_first && row.shown_first.value && !ids.has(row.shown_first.value)) err(`${row.id}: shown_first points to a missing value`);
    const distinctWitnesses = new Set(vals.map((v) => `${v.authority}|${v.page}`));
    if (distinctWitnesses.size < 2) err(`${row.id}: all values are one witness (same authority and page)`);
    if (LINK_OUT_ONLY.test(JSON.stringify(vals))) err(`${row.id}: a link-out-only source (American Battlefield Trust, Stone Sentinels, ...) supplies a value`);
    for (const hb of row.held_back || []) if (!hb.claim || !hb.reason) err(`${row.id}: held_back entries need claim and reason`);

    for (const val of vals) {
      metrics.values++;
      const src = sources[val.source];
      if (!src) { err(`${row.id}.${val.id}: unknown source ${val.source}`); continue; }
      if (!['A1', 'A2', 'B', 'S'].includes(val.tier)) err(`${row.id}.${val.id}: bad tier ${val.tier}`);
      if (val.tier !== src.tier && !(src.id === 'weather-by-day')) err(`${row.id}.${val.id}: value tier ${val.tier} differs from the source tier ${src.tier}`);
      if (val.tier === 'A1' && src.id !== 'weather-by-day' && !(src.imprint_year && src.imprint_year <= 1930)) err(`${row.id}.${val.id}: tier A1 needs an imprint year before 1931 (source ${src.id} says ${src.imprint_year})`);
      if (val.tier === 'B' && !(src.rights && /facts only|secondary/i.test(src.rights))) err(`${row.id}.${val.id}: tier B sources must state facts-only/secondary in their rights line`);
      if (LINK_OUT_ONLY.test(`${val.authority} ${src.title}`)) err(`${row.id}.${val.id}: link-out-only source`);
      for (const k of Object.keys(val)) if (FORBIDDEN_KEYS.includes(k.toLowerCase())) err(`${row.id}.${val.id}: forbidden key ${k}`);
      if (!val.what_is_counted || val.what_is_counted.length < 15) err(`${row.id}.${val.id}: what_is_counted is required`);
      if (!val.quote || !val.quote.length) { err(`${row.id}.${val.id}: no quote`); continue; }
      // every figure must be in one of its quotes
      const qs = val.quote.map((id) => quotes[id]).filter(Boolean);
      for (const id of val.quote) if (!quotes[id]) err(`${row.id}.${val.id}: unknown quote ${id}`);
      for (const q of qs) if (q.source !== val.source && !(val.source === 'weather-by-day' && q.type === 'ref') && !(q.type === 'site')) err(`${row.id}.${val.id}: quote ${q.id} belongs to source ${q.source}, not ${val.source}`);
      if (val.page != null) { const pages = qs.map((q) => q.printed_page).filter((p) => p != null); if (pages.length && !pages.includes(val.page)) err(`${row.id}.${val.id}: page ${val.page} is not the page of its quotes (${pages.join(', ')})`); }
      const derived = new Set(Object.keys(val.derived || {}));
      for (const [name, num] of Object.entries(val.figures || {})) {
        if (derived.has(name)) continue;
        metrics.figures++;
        const methods = new Set();
        if (typeof num === 'string' && name === 'text') { methods.add('text'); }
        else if (typeof num === 'string') {
          const want = parseClock(num);
          if (!want) { err(`${row.id}.${val.id}: figure ${name} "${num}" is not a clock time like 10:15 a.m.`); continue; }
          const ok = qs.some((q) => quoteInfo[q.id] && quoteInfo[q.id].times.some((t) => t.h === want.h && (t.m === want.m) && (t.ap == null || t.ap === want.ap)));
          if (!ok) err(`${row.id}.${val.id}: the time ${num} is not in its quote(s)`); else methods.add('text');
          if (qs.some((q) => quoteInfo[q.id] && (quoteInfo[q.id].imageTimes || []).some((t) => t && t.h === want.h && t.m === want.m && t.ap === want.ap))) methods.add('image');
        } else if (typeof num === 'number') {
          let found = false, ocrAlso = false, imageHas = false, textHas = false;
          for (const q of qs) {
            const info = quoteInfo[q.id]; if (!info) continue;
            if (info.tokens.has(num) || info.words.includes(num)) { found = true; if (q.type === 'ocr') textHas = true; if (q.type === 'image') imageHas = true; if (q.type === 'web' || q.type === 'site' || q.type === 'ref') textHas = true; }
            if (q.type === 'image' && info.leafTokens.has(num)) ocrAlso = true;
            if (q.type === 'ocr' && info.imageTokens && info.imageTokens.has(num)) imageHas = true;
          }
          if (!found) err(`${row.id}.${val.id}: the number ${num} (${name}) is not in any of its quotes`);
          if (textHas) methods.add('ocr_or_text'); if (imageHas) methods.add('image'); if (ocrAlso) methods.add('ocr_corroborates_image');
          // a second scan of the same book (Jacobs) counts as a second extraction
          if (qs.some((q) => q.witnesses && q.witnesses.length >= 2)) methods.add('second_scan');
        }
        const _checksum = coveredByCheck(val, name, num, readings);
        (details[`${row.id}.${val.id}`] ||= {})[name] = { methods: [...methods].sort(), checksum: _checksum };
        const twoMethods = (methods.has('image') && (methods.has('ocr_corroborates_image') || methods.has('ocr_or_text') || methods.has('text'))) || (methods.has('ocr_or_text') && methods.has('second_scan'));
        if (twoMethods) metrics.figures_two_extraction_methods++;
        else if (methods.size) metrics.figures_single_method++;
        if (!twoMethods && methods.size && coveredByCheck(val, name, num, readings)) { metrics.figures_ocr_plus_checksum++; metrics.figures_single_method--; }
      }
      // derived figures
      for (const [name, num] of Object.entries(val.derived || {})) {
        const f = val.figures || {};
        if (name === 'total' && ['killed', 'wounded', 'missing'].every((k) => typeof f[k] === 'number')) { const s = f.killed + f.wounded + f.missing; if (s !== num) err(`${row.id}.${val.id}: derived total ${num} but killed+wounded+missing = ${s}`); }
        else if (!(val.checks || []).some((c) => c.total === num)) err(`${row.id}.${val.id}: derived ${name}=${num} has no check that reproduces it`);
        if (!val.derivation) err(`${row.id}.${val.id}: derived figures need a derivation note`);
      }
      // checks
      for (const c of val.checks || []) {
        if (c.type === 'sum') { const s = c.parts.reduce((a, b) => a + b, 0); if (s !== c.total) err(`${row.id}.${val.id}: ${c.parts.join(' + ')} = ${s}, not ${c.total}`); }
        else if (c.type === 'diff') { const s = c.from - c.minus.reduce((a, b) => a + b, 0); if (s !== c.total) err(`${row.id}.${val.id}: ${c.from} - ${c.minus.join(' - ')} = ${s}, not ${c.total}`); }
        else if (c.type === 'percent') { const p = Math.round((c.part / c.whole) * 1000) / 10; if (p !== c.per_cent) err(`${row.id}.${val.id}: ${c.part}/${c.whole} = ${p}%, not ${c.per_cent}%`); }
        else if (c.type === 'approx') { const s = c.expr.reduce((a, [k, n]) => a + k * n, 0); if (Math.abs(s - c.total) > (c.tolerance ?? 1)) err(`${row.id}.${val.id}: the estimate formula gives ${s.toFixed(1)}, not ${c.total}`); }
        else if (c.type === 'sum_quote') { const q = quotes[c.quote]; if (!q || !q.sum_check) err(`${row.id}.${val.id}: quote ${c.quote} has no sum_check`); }
        else if (c.type === 'table') {
          const r = reading(c.reading);
          if (!r) { err(`${row.id}.${val.id}: reading ${c.reading} missing`); continue; }
          checkTable(r).forEach((p) => err(`${row.id}.${val.id}: reading ${r.id}: ${p}`));
          const t = r.table;
          if (t.figure_map) for (const [name, cols] of Object.entries(t.figure_map)) if (val.figures && typeof val.figures[name] === 'number' && val.figures[name] !== figureMapSum(t, cols)) err(`${row.id}.${val.id}: figure ${name}=${val.figures[name]} but the table in ${r.id} gives ${figureMapSum(t, cols)}`);
          if (t.figure_row) for (const [name, col] of Object.entries(t.figure_row)) { const want = t.rows[0][1 + t.columns.indexOf(col)]; const got = (val.figures || {})[name]; if (typeof got === 'number' && got !== want) err(`${row.id}.${val.id}: figure ${name}=${got} but the row in ${r.id} says ${want}`); }
        } else err(`${row.id}.${val.id}: unknown check ${c.type}`);
      }
      if (val.copies) { const other = vals.find((x) => x.id === val.copies); if (!other) err(`${row.id}.${val.id}: copies ${val.copies} not a value of this row`); else if (JSON.stringify(other.figures) !== JSON.stringify(val.figures)) err(`${row.id}.${val.id}: marked as a copy of ${val.copies} but the figures differ`); }
    }
    // by-unit table (corps)
    if (row.by_unit) {
      const a = reading(row.by_unit.readings[0]), b = reading(row.by_unit.readings[1]);
      if (!a || !b) err(`${row.id}: by_unit readings missing`);
    }
  }
  metrics.figures_single_method = Math.max(0, metrics.figures_single_method);
  return { errors, warnings, metrics, details };
}

/** is this figure inside a passing arithmetic check of the value? */
function coveredByCheck(val, name, num, readings) {
  for (const c of val.checks || []) {
    if (c.type === 'sum' && (c.total === num || c.parts.includes(num))) return true;
    if (c.type === 'diff' && (c.total === num || c.from === num || c.minus.includes(num))) return true;
    if (c.type === 'percent' && (c.part === num || c.whole === num || c.per_cent === num)) return true;
    if (c.type === 'approx' && c.total === num) return true;
    if (c.type === 'sum_quote') return true;
    if (c.type === 'table') { const r = readings.find((x) => x.id === c.reading); const t = r && r.table; if (t && ((t.figure_map && t.figure_map[name]) || (t.figure_row && t.figure_row[name]))) return true; }
  }
  return false;
}
const siteCache = new Map();
export function readSiteValue(file, p) {
  if (!siteCache.has(file)) siteCache.set(file, JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8')));
  let cur = siteCache.get(file);
  for (const part of p.split('.')) {
    const m = /^(\w+)\[(\w+)=([^\]]+)\]$/.exec(part);
    if (m) { cur = (cur[m[1]] || []).find((x) => String(x[m[2]]) === m[3]); } else cur = cur && cur[part];
    if (cur === undefined) return undefined;
  }
  return cur;
}
