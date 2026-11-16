// Reader of the National Park Service chronologies and the writer of app/data/site-memorial-years.json: the year some later memorials were put up, where a report prints it for a
// memorial whose name is the site's name for it, letter for letter. Every other memorial's year stays an open gap (register ws-world-EG-MON-01).
//   node docs/battle-theatre/app/tests/ext-site-years.mjs            report: the memorials found in the reports, the ones left out with the reason, whether the data file is current
//   node docs/battle-theatre/app/tests/ext-site-years.mjs --check    exit 1 when the data file differs from what the saved report texts give (needs tmp/library/web/nps), or is not fit
//   node docs/battle-theatre/app/tests/ext-site-years.mjs --write    rewrite the data file from the saved report texts
// The saved texts are the reading-order text of the reports (tmp/library/web/nps/<id>/<id>.txt, one "=== PAGE n ===" marker per PDF page). A report is a United States government work.
// The rule (it is the whole rule): an entry of a chronology table that begins "CE <year>[ - <year>] Memorialized", says erected / erection of / is placed, and holds the site's name as one
// item of its list, followed by nothing but the words of the list ("and Fence", "and Flank Markers", "and Benches", "and Marker Sponsor Tablet", a bracket); the name is the name of exactly
// one memorial of the site's list; the reports give one year (or one range) for it; the site's own position lies in the area the report describes. Anything else is left out, with its reason,
// in GOVERNANCE/horde/ws-world/memorial-years-curation.json (the left-out list is read from there, not hidden).
// Second reading (GOVERNANCE/horde/ws-world/memorial-years-extra.json): memorials the exact-name rule cannot reach, read by hand from the saved text of the First Day cultural landscape report (an entry
// that carries a park number (MN) which the site gives to a memorial of the same unit or person) and of an inventory (the name with its year in the tag). The file holds the readings; this
// builder cuts the heading, the park number, the quotation and the page again from the saved text and refuses a reading that differs (verifyExtra). Readings left out are listed there with the reason.
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; import { fileURLToPath, pathToFileURL } from 'node:url';
import * as P from '../src/ext/site-places.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
export const REPO = path.resolve(here, '../../../..'), APP = path.resolve(here, '..');
export const FILE = path.join(APP, 'data/site-memorial-years.json'), MEM = path.join(APP, 'data/site-memorials.json');
export const CURATION = path.join(REPO, 'docs/battle-theatre/GOVERNANCE/horde/ws-world/memorial-years-curation.json');
export const LIB = path.join(REPO, 'tmp/library/web/nps'), SOURCES_META = path.join(REPO, 'docs/battle-theatre/GOVERNANCE/horde/ws-web/nps/sources.json');
export const REPORTS = ['NPS-CLI-PCB', 'NPS-CLI-LRT', 'NPS-CLI-ERR'];
export const EXTRA = path.join(REPO, 'docs/battle-theatre/GOVERNANCE/horde/ws-world/memorial-years-extra.json');
export const EXTRA_REPORTS = [{ id: 'NPS-CLR-1STDAY', file: 'NPS-CLR-1STDAY.raw.txt' }];      // read besides REPORTS for the hand readings (the content-stream text keeps the table cells of the inventory together)
// the area each report describes (a centre and a radius in metres): a memorial the site puts farther away than this is not taken for the one the report names
export const AREA = { 'NPS-CLI-PCB': { lat: 39.8070, lng: -77.2400, r: 2000 }, 'NPS-CLI-LRT': { lat: 39.7910, lng: -77.2362, r: 1500 }, 'NPS-CLI-ERR': { lat: 39.8070, lng: -77.2450, r: 1500 } };
// words the reports add after a memorial's name that do not change which memorial it is: { re, any } (any: whatever follows the suffix is the rest of the sentence)
const SUFFIX_OK = [{ re: /^ and Fence\b/ }, { re: /^ and Flank Markers\b/ }, { re: /^ and Right Flank Marker\b/ }, { re: /^ and Benches\b/ }, { re: /^ and Marker Sponsor Tablet\b/, any: true }, { re: /^ \((?:Left Flank Marker|ca\.[^)]*)\)/ }, { re: /^ is placed\b/, any: true }];
const AFTER_OK = /^(?:[.;,]| and (?:the )?\d| and Major| and Michigan| and Company| and the |$)/;      // what may follow the name (or its suffix): the end of the item, or the next item of the list

export const sha256 = b => crypto.createHash('sha256').update(b).digest('hex');
export const canon = v => JSON.stringify(v, (k, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map(q => [q, x[q]])) : x));
const metres = (lat1, lng1, lat2, lng2) => Math.hypot((lng2 - lng1) * 111320 * Math.cos((lat1 + lat2) / 2 * Math.PI / 180), (lat2 - lat1) * 110574);

/** A report from its text: {id, raw, norm (white space made single), map (norm index -> raw index), pages: [{n, at}], sha256}. */
export function reportFromText(id, raw, hash = null) {
  const norm = [], map = []; let prev = false; for (let i = 0; i < raw.length; i++) { const ch = raw[i]; if (/\s/.test(ch)) { if (!prev) { norm.push(' '); map.push(i); prev = true; } } else { norm.push(ch); map.push(i); prev = false; } }
  const pages = [...raw.matchAll(/=== PAGE (\d+) ===/g)].map(m => ({ n: +m[1], at: m.index }));
  return { id, raw, norm: norm.join(''), map, pages, sha256: hash || sha256(Buffer.from(raw, 'utf8')) };
}
/** The reading-order text of a saved report (null when it is not here). */
export function readReport(id, lib = LIB, file = id + '.txt') {
  const f = path.join(lib, id, file); if (!fs.existsSync(f)) return null; const buf = fs.readFileSync(f); return reportFromText(id, buf.toString('utf8'), sha256(buf));
}
const pageAt = (r, normIndex) => { const t = r.map[normIndex]; let p = null; for (const q of r.pages) { if (q.at <= t) p = q; else break; } return p; };
const printedPage = (r, p) => { const i = r.pages.indexOf(p), end = i + 1 < r.pages.length ? r.pages[i + 1].at : r.raw.length, m = /Page\s+(\d+)\s+of\s+(\d+)/.exec(r.raw.slice(p.at, end)); return m ? `Page ${m[1]} of ${m[2]}` : null; };

/** Every memorial of the site that a report names, by the rule above. -> {found: [...rows], left: [{no, name, source, why}]} */
export function deriveYears(mem, reports, curation = { exclude: [] }) {
  const byName = new Map(); for (const m of mem.monuments) { if (!byName.has(m.name)) byName.set(m.name, []); byName.get(m.name).push(m); }
  const excluded = new Map((curation.exclude || []).map(x => [x.no, x.why])), found = [], left = [];
  for (const r of reports) {
    const N = r.norm, starts = [...N.matchAll(/\b(CE|AD) (\d{4})(?: ?[-–] ?(\d{4}))?(?= [A-Z])/g)];
    starts.forEach((m, k) => {
      const end = k + 1 < starts.length ? starts[k + 1].index : Math.min(N.length, m.index + 900), ent = N.slice(m.index, end).trim();
      if (!/^(?:CE|AD) \d{4}(?: ?[-–] ?\d{4})? Memorialized/.test(ent) || !/erected|[Ee]rection of|is placed|are placed/.test(ent)) return;
      const y1 = +m[2], y2 = m[3] ? +m[3] : null;
      for (const [name, list] of byName) {
        if (name.length < 10) continue; const re = new RegExp('(?<![A-Za-z0-9])' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'); let hit = null; for (const mm of ent.matchAll(re)) { hit = mm; break; } if (!hit) continue;
        const post = ent.slice(hit.index + name.length), suf = SUFFIX_OK.map(x => ({ x, m: x.re.exec(post) })).find(y => y.m), cut = suf ? suf.m[0].length : 0, after = post.slice(cut);
        const why = list.length > 1 ? 'two entries of the site share the name' : !((suf && suf.x.any) || AFTER_OK.test(after)) ? 'the report continues the name with words that are not a fence, a flank marker or a bracket (a position marker, for example)' : null;
        const q = ent.slice(0, hit.index + name.length + cut), page = pageAt(r, m.index), ca = /\(ca\.\s*(\d{4})\s*[-–]\s*(\d{4})\)/.exec(q), row = { no: list[0].no, name, year: ca ? +ca[1] : y1, yearTo: ca ? +ca[2] : y2, source: r.id, pdfPage: page ? page.n : null, printedPage: page ? printedPage(r, page) : null, quote: q,
          approx: !!ca || /\(ca\./.test(q), tier: /\(ca\./.test(q) ? 'inferred' : 'documented' };
        if (why) { left.push({ no: list.map(x => x.no), name, source: r.id, year: y1, why }); continue; }
        if (excluded.has(row.no)) { left.push({ no: [row.no], name, source: r.id, year: y1, why: excluded.get(row.no) }); continue; }
        const a = AREA[r.id], site = list[0], dist = a ? metres(a.lat, a.lng, site.lat, site.lng) : 0;
        if (a && dist > a.r) { left.push({ no: [row.no], name, source: r.id, year: y1, why: `the site puts it ${Math.round(dist)} m from the area the report describes (${a.r} m allowed)` }); continue; }
        found.push(row);
      }
    });
  }
  // a memorial the reports give two different years is left out; a memorial named twice with the same year is one row
  const by = new Map(); for (const f of found) { if (!by.has(f.no)) by.set(f.no, []); by.get(f.no).push(f); }
  const rows = []; for (const [no, list] of by) { const ys = new Set(list.map(x => x.year + '-' + x.yearTo)); if (ys.size > 1) left.push(...list.map(x => ({ no: [no], name: x.name, source: x.source, year: x.year, why: 'the reports give different years for it' }))); else rows.push(list[0]); }
  rows.sort((a, b) => a.no - b.no); return { found: rows, left };
}

/** The text of a report with the line-break hyphens joined ("Massachu- setts" -> "Massachusetts"), and for each character of it the index of the same character in `norm`: the hand readings are cut from this text. */
export function dehyphenated(r) {
  if (r.d) return r; const s = r.norm, out = [], back = []; let i = 0;
  while (i < s.length) { if (i + 3 < s.length && /[a-z]/.test(s[i]) && s[i + 1] === '-' && s[i + 2] === ' ' && /[a-z]/.test(s[i + 3])) { out.push(s[i], s[i + 3]); back.push(i, i + 3); i += 4; continue; } out.push(s[i]); back.push(i); i++; }
  r.d = out.join(''); r.dback = Int32Array.from(back); return r;
}
const normMN = P.normMN, WORDS_WHAT = P.YEAR_WHAT;      // the same park-number form and the same words as the page applies
const printedPageOf = (r, p) => {                                  // "Page 59 of 117" where the report prints that (the inventories), else the number alone on a line near the top of the page ("368")
  const q = printedPage(r, p); if (q) return q; const i = r.pages.indexOf(p), lines = r.raw.slice(p.at, p.at + 500).split('\n').slice(1, 9); const n = lines.find(l => /^\d{1,4}$/.test(l.trim())); return n ? `Page ${n.trim()}` : null;
};

/** The hand readings of memorial-years-extra.json, each cut again from the saved text of its report and checked. -> {rows, problems}. A row that differs in anything is a problem and is not a row.
 *  via "park number": the printed heading (with MN) is in the text once; the quotation follows it within 1500 characters on one page; the park number is the one the site gives the memorial (and no other
 *  memorial of the site); the words in `agree` are in the heading and in the site's name; the quotation holds the year and the word that says it was dedicated or installed.
 *  via "name": the site's own name is in the printed heading, the memorial is the only one of that name, the report puts it where the site does, the quotation holds the year in the tag. */
export function verifyExtra(extra, mem, reports) {
  const problems = [], rows = [], byNo = new Map(mem.monuments.map(m => [m.no, m])), nameN = new Map(), mnN = new Map(), seen = new Set();
  for (const m of mem.monuments) { nameN.set(m.name, (nameN.get(m.name) || 0) + 1); if (m.mn) mnN.set(m.mn, (mnN.get(m.mn) || 0) + 1); }
  for (const r of (extra && extra.rows) || []) {
    const w = `reading of ${r && r.no} ${r && r.name}`, m = r && byNo.get(r.no), bad = t => problems.push(`${w}: ${t}`);
    if (!m) { bad('not a memorial of the list'); continue; } if (r.name !== m.name) bad(`the name is not the list's name "${m.name}"`); if (seen.has(r.no)) bad('given twice'); seen.add(r.no);
    if (r.via !== 'park number' && r.via !== 'name') { bad(`the way it is matched (${r.via}) is neither "park number" nor "name"`); continue; }
    const rep0 = reports.find(x => x.id === r.source); if (!rep0) { bad(`the saved text of ${r.source} was not read`); continue; } const rep = dehyphenated(rep0);
    if (!Number.isInteger(r.year) || r.year < 1863 || r.year > 2030) bad(`the year ${r.year} is not a year after the battle`); if (!WORDS_WHAT[r.what]) bad(`what the report says was done to it (${r.what}) is not one of ${Object.keys(WORDS_WHAT).join(', ')}`);
    if (r.tier !== 'documented') bad(`the tier is ${r.tier}; a reading is documented or it is not entered`);
    if (typeof r.quote !== 'string' || !r.quote.includes(String(r.year))) bad('the quotation does not hold the year'); else if (WORDS_WHAT[r.what] && !WORDS_WHAT[r.what].test(r.quote)) bad(`the quotation does not say it was ${r.what}`);
    const hAt = rep.d.indexOf(r.printed), hAt2 = hAt < 0 ? -1 : rep.d.indexOf(r.printed, hAt + 1);
    if (hAt < 0) bad('the printed heading is not in the saved text'); else if (hAt2 >= 0) bad('the printed heading is in the saved text more than once');
    let qAt = -1; if (r.via === 'park number' && hAt >= 0) qAt = rep.d.indexOf(r.quote, hAt); else if (r.via === 'name') qAt = rep.d.indexOf(r.quote);
    if (qAt < 0) { bad('the quotation is not in the saved text' + (r.via === 'park number' ? ' after its heading' : '')); continue; }
    if (r.via === 'park number') {
      if (qAt - hAt > 1500) bad('the quotation is too far (more than 1500 characters) from the heading to be the heading\'s own text');
      const mn = normMN(r.mnPrinted); if (!mn) bad(`"${r.mnPrinted}" is not a park number`); else { if (mn !== m.mn) bad(`the report's park number ${r.mnPrinted} (${mn}) is not the number the site gives it (${m.mn})`); if (mnN.get(mn) !== 1) bad(`the park number ${mn} is the site's for ${mnN.get(mn) || 0} memorials, not one`); }
      if (!String(r.printed).includes(r.mnPrinted)) bad('the printed heading does not hold the park number');
      const ag = Array.isArray(r.agree) ? r.agree : []; if (ag.length < 2) bad('fewer than two words are named as the same in the heading and the site\'s name');
      for (const x of ag) { if (!String(r.printed).toLowerCase().includes(String(x).toLowerCase())) bad(`"${x}" is not in the printed heading`); if (!m.name.toLowerCase().includes(String(x).toLowerCase())) bad(`"${x}" is not in the site's name`); }
    } else {
      if (!String(r.printed).includes(m.name)) bad('the printed heading does not hold the site\'s name letter for letter'); if (nameN.get(m.name) !== 1) bad('two entries of the site share the name');
      const a = AREA[r.source]; if (a) { const d = metres(a.lat, a.lng, m.lat, m.lng); if (d > a.r) bad(`the site puts it ${Math.round(d)} m from the area the report describes (${a.r} m allowed)`); }
      if (!rep.d.slice(qAt, qAt + r.quote.length + 1).startsWith(r.quote) || !r.quote.includes(r.printed)) bad('the quotation does not begin with the printed heading');
    }
    const pg = pageAt(rep, rep.dback[qAt]); if (!pg) { bad('no page marker before the quotation'); continue; } if (pg.n !== r.pdfPage) bad(`the quotation is on PDF page ${pg.n}, the reading says ${r.pdfPage}`);
    if (!problems.some(t => t.startsWith(w + ':'))) rows.push({ no: r.no, name: m.name, year: r.year, yearTo: null, approx: false, tier: r.tier, source: r.source, pdfPage: pg.n, printedPage: printedPageOf(rep, pg), quote: r.quote, via: r.via, what: r.what, printed: r.printed, ...(r.via === 'park number' ? { mnPrinted: r.mnPrinted, agree: r.agree } : {}) });
  }
  return { rows, problems };
}

export function buildFile(mem, reports, meta, curation, extra = null, extraReports = []) {
  const { found, left } = deriveYears(mem, reports, curation), sources = {}, byNo = new Map(mem.monuments.map(m => [m.no, m]));
  const rows = found.map(f => ({ no: f.no, name: f.name, year: f.year, yearTo: f.yearTo, approx: f.approx, tier: f.tier, source: f.source, pdfPage: f.pdfPage, printedPage: f.printedPage, quote: f.quote, via: 'name' }));
  let problems = [];
  if (extra) {
    const v = verifyExtra(extra, mem, [...reports, ...extraReports]); problems = v.problems;
    for (const x of v.rows) { const at = rows.findIndex(y => y.no === x.no);
      if (at < 0) rows.push(x); else if (rows[at].year === x.year && rows[at].yearTo === x.yearTo) left.push({ no: [x.no], name: x.name, source: x.source, year: x.year, why: `already read from ${rows[at].source} with the same year` });
      else { const o = rows[at]; rows.splice(at, 1); left.push(...[o, x].map(z => ({ no: [z.no], name: z.name, source: z.source, year: z.year, why: 'the reports give different years for it' }))); } }
    for (const l of extra.left || []) { const sites = [].concat(l.site ?? []); left.push({ no: sites, name: sites.length ? [...new Set(sites.map(n => (byNo.get(n) || {}).name || String(n)))].join(' / ') : (l.mn || ''), source: 'NPS-CLR-1STDAY', year: null, why: l.why }); }
  }
  rows.sort((a, b) => a.no - b.no);
  for (const r of [...reports, ...extraReports]) if (rows.some(f => f.source === r.id)) { const s = (meta.sources || []).find(x => x.id === r.id) || {}; sources[r.id] = { title: s.title || r.id, publisher: s.author || 'National Park Service', date: s.date || null, url: s.url || null, textSha256: r.sha256 }; }
  const years = rows;
  return { file: { _about: 'The year some of the site\'s later memorials were put up, from National Park Service reports that print it for the same memorial: by the site\'s own name, or by the park number the site gives it. Every other memorial\'s year is an open gap.',
    rule: 'A year is entered only where a report names the memorial with the site\'s own name, letter for letter, and says it was erected or places it with its year in the tag of its entry; or where a report\'s entry carries the park number (MN) the site gives to a memorial of the same unit or person and its text says it was dedicated or installed that year. A name the site gives to two memorials, a name the report continues with other words, a monument that was replaced or put up twice, a number the two lists give differently and a report that places it far from where the site does are left out.',
    sources, years, copy: { yearsSha256: sha256(canon(years)) } }, left, problems };
}
export const serialise = o => JSON.stringify(o) + '\n';

/** What is wrong with a years file, as sentences (empty: fit): the rules the page applies (site-places.mjs validateYears) and the hash recorded with the file. */
export function validateYearsFile(yf, mem) {
  const p = P.validateYears(yf, mem); if (!yf || !Array.isArray(yf.years)) return p;
  if (!yf.copy || yf.copy.yearsSha256 !== sha256(canon(yf.years))) p.push('the years in the file do not match the hash the file records for them'); return p;
}
/** The saved texts the years are read from (the chronologies, then the reports of the hand readings) and the readings; skipped: true when a text is not here. */
export function loadSources(lib = LIB, extraPath = EXTRA) {
  const reports = REPORTS.map(id => readReport(id, lib)), extraReports = EXTRA_REPORTS.map(x => readReport(x.id, lib, x.file)), extra = fs.existsSync(extraPath) ? JSON.parse(fs.readFileSync(extraPath, 'utf8')) : null;
  const missing = [...REPORTS.filter((id, i) => !reports[i]), ...EXTRA_REPORTS.filter((x, i) => !extraReports[i]).map(x => x.id)];
  return { reports, extraReports, extra, missing, skipped: missing.length > 0 };
}
/** Re-reads the saved reports and compares. problems: the years differ from what the texts give, a text is not the one the file was read from, an address differs, a reading differs from its text (the file is wrong).
 *  notes: the description of a report (title, publisher, date) differs from the web list it was copied from (the file is out of date; --write brings it up). {skipped} when the texts are not here. */
export function driftYears(yf, mem, curation, lib = LIB) {
  const src = loadSources(lib); if (src.skipped) return { skipped: true, problems: [], notes: [] };
  const { file, problems: rp } = buildFile(mem, src.reports, JSON.parse(fs.readFileSync(SOURCES_META, 'utf8')), curation, src.extra, src.extraReports), problems = [...rp], notes = [], reports = [...src.reports, ...src.extraReports];
  if (canon(file.years) !== canon(yf.years)) problems.push('the years in the file differ from what the saved report texts give');
  for (const [id, s] of Object.entries(yf.sources)) { const r = reports.find(x => x.id === id), b = file.sources[id]; if (r && s.textSha256 !== r.sha256) problems.push(`the saved text of ${id} is not the one the file was read from`); if (b && s.url !== b.url) problems.push(`${id}: the address differs from the web list's`);
    if (b) for (const k of ['title', 'publisher', 'date']) if (s[k] !== b[k]) notes.push(`${id}: ${k} is ${JSON.stringify(s[k])} in the file and ${JSON.stringify(b[k])} in the web list`); }
  for (const id of Object.keys(file.sources)) if (!yf.sources[id]) problems.push(`${id}: a report that now names a memorial is not described in the file`);
  return { skipped: false, problems, notes };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const mem = JSON.parse(fs.readFileSync(MEM, 'utf8')), curation = fs.existsSync(CURATION) ? JSON.parse(fs.readFileSync(CURATION, 'utf8')) : { exclude: [] }, src = loadSources();
  if (src.skipped) { console.log(`the saved report texts are not in ${LIB} (${src.missing.join(', ')}); nothing can be derived`); if (process.argv.includes('--write')) process.exit(2); }
  else {
    const meta = JSON.parse(fs.readFileSync(SOURCES_META, 'utf8')), { file, left, problems } = buildFile(mem, src.reports, meta, curation, src.extra, src.extraReports);
    console.log(`${file.years.length} memorials named in the reports (by the site's own name or by the park number the site gives them)`); for (const y of file.years) console.log(`  ${String(y.no).padStart(3)} ${y.name.slice(0, 46).padEnd(46)} ${y.year}${y.yearTo ? '-' + y.yearTo : ''} ${y.tier.padEnd(10)} ${y.via.padEnd(11)} ${y.source} pdf p. ${y.pdfPage}`);
    console.log(`${left.length} named by a report and left out:`); for (const l of left) console.log(`  ${[].concat(l.no).join('/').padStart(7)} ${String(l.name).slice(0, 40).padEnd(40)} ${l.year ?? ''}  ${l.why}`);
    if (problems.length) { console.log('READINGS THAT DIFFER FROM THE TEXT:'); for (const l of problems) console.log('  ' + l); if (process.argv.includes('--write')) process.exit(1); }
    if (process.argv.includes('--write')) { fs.writeFileSync(FILE, serialise(file)); console.log(`wrote ${path.relative(REPO, FILE)} (${fs.statSync(FILE).size} bytes)`); }
  }
  let cur = null; try { cur = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch (e) { console.log('the years file cannot be read: ' + e.message); process.exit(process.argv.includes('--check') ? 1 : 0); }
  const bad = validateYearsFile(cur, mem), dr = driftYears(cur, mem, curation); const all = [...bad, ...dr.problems];
  if (dr.skipped) console.log('NOT RUN: the saved report texts are not here, so the file was checked for fitness only'); for (const n of dr.notes || []) console.log('note (does not fail the check; --write brings it up to date): ' + n);
  if (all.length) { console.log('DRIFT or defects:'); for (const l of all) console.log('  ' + l); } else console.log('the years file is fit' + (dr.skipped ? '' : ' and equals what the saved report texts give'));
  if (process.argv.includes('--check') && all.length) process.exit(1);
}
