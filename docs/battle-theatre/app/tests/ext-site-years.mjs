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
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; import { fileURLToPath, pathToFileURL } from 'node:url';
import * as P from '../src/ext/site-places.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
export const REPO = path.resolve(here, '../../../..'), APP = path.resolve(here, '..');
export const FILE = path.join(APP, 'data/site-memorial-years.json'), MEM = path.join(APP, 'data/site-memorials.json');
export const CURATION = path.join(REPO, 'docs/battle-theatre/GOVERNANCE/horde/ws-world/memorial-years-curation.json');
export const LIB = path.join(REPO, 'tmp/library/web/nps'), SOURCES_META = path.join(REPO, 'docs/battle-theatre/GOVERNANCE/horde/ws-web/nps/sources.json');
export const REPORTS = ['NPS-CLI-PCB', 'NPS-CLI-LRT', 'NPS-CLI-ERR'];
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
export function readReport(id, lib = LIB) {
  const f = path.join(lib, id, id + '.txt'); if (!fs.existsSync(f)) return null; const buf = fs.readFileSync(f); return reportFromText(id, buf.toString('utf8'), sha256(buf));
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

export function buildFile(mem, reports, meta, curation) {
  const { found, left } = deriveYears(mem, reports, curation), sources = {};
  for (const r of reports) if (found.some(f => f.source === r.id)) { const s = (meta.sources || []).find(x => x.id === r.id) || {}; sources[r.id] = { title: s.title || r.id, publisher: s.author || 'National Park Service', date: s.date || null, url: s.url || null, textSha256: r.sha256 }; }
  const years = found.map(f => ({ no: f.no, name: f.name, year: f.year, yearTo: f.yearTo, approx: f.approx, tier: f.tier, source: f.source, pdfPage: f.pdfPage, printedPage: f.printedPage, quote: f.quote }));
  return { file: { _about: 'The year some of the site\'s later memorials were put up, from National Park Service reports that print it for a memorial of the same name. Every other memorial\'s year is an open gap.',
    rule: 'A year is entered only where a chronology of a report names the memorial with the site\'s own name, letter for letter, and says it was erected or placed; a name the site gives to two memorials, a name the report continues with other words, and a report that places it far from where the site does are left out.',
    sources, years, copy: { yearsSha256: sha256(canon(years)) } }, left };
}
export const serialise = o => JSON.stringify(o) + '\n';

/** What is wrong with a years file, as sentences (empty: fit): the rules the page applies (site-places.mjs validateYears) and the hash recorded with the file. */
export function validateYearsFile(yf, mem) {
  const p = P.validateYears(yf, mem); if (!yf || !Array.isArray(yf.years)) return p;
  if (!yf.copy || yf.copy.yearsSha256 !== sha256(canon(yf.years))) p.push('the years in the file do not match the hash the file records for them'); return p;
}
/** Re-reads the saved reports and compares: sentences. {skipped} when the library is not here. */
export function driftYears(yf, mem, curation, lib = LIB) {
  const reports = REPORTS.map(id => readReport(id, lib)); if (reports.some(r => !r)) return { skipped: true, problems: [] };
  const { file } = buildFile(mem, reports, JSON.parse(fs.readFileSync(SOURCES_META, 'utf8')), curation), out = [];
  if (canon(file.years) !== canon(yf.years)) out.push('the years in the file differ from what the saved report texts give'); for (const [id, s] of Object.entries(yf.sources)) { const r = reports.find(x => x.id === id); if (r && s.textSha256 !== r.sha256) out.push(`the saved text of ${id} is not the one the file was read from`); }
  return { skipped: false, problems: out };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const mem = JSON.parse(fs.readFileSync(MEM, 'utf8')), curation = fs.existsSync(CURATION) ? JSON.parse(fs.readFileSync(CURATION, 'utf8')) : { exclude: [] }, reports = REPORTS.map(id => readReport(id));
  if (reports.some(r => !r)) { console.log(`the saved report texts are not in ${LIB} (${REPORTS.filter((id, i) => !reports[i]).join(', ')}); nothing can be derived`); if (process.argv.includes('--write')) process.exit(2); }
  else {
    const meta = JSON.parse(fs.readFileSync(SOURCES_META, 'utf8')), { file, left } = buildFile(mem, reports, meta, curation);
    console.log(`${file.years.length} memorials named in the reports by the site's own name`); for (const y of file.years) console.log(`  ${String(y.no).padStart(3)} ${y.name.padEnd(46)} ${y.year}${y.yearTo ? '-' + y.yearTo : ''} ${y.tier.padEnd(10)} ${y.source} pdf p. ${y.pdfPage}`);
    console.log(`${left.length} named by a report and left out:`); for (const l of left) console.log(`  ${[].concat(l.no).join('/').padStart(7)} ${l.name.padEnd(40)} ${l.year}  ${l.why}`);
    if (process.argv.includes('--write')) { fs.writeFileSync(FILE, serialise(file)); console.log(`wrote ${path.relative(REPO, FILE)} (${fs.statSync(FILE).size} bytes)`); }
  }
  let cur = null; try { cur = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch (e) { console.log('the years file cannot be read: ' + e.message); process.exit(process.argv.includes('--check') ? 1 : 0); }
  const bad = validateYearsFile(cur, mem), dr = driftYears(cur, mem, curation); const all = [...bad, ...dr.problems];
  if (dr.skipped) console.log('NOT RUN: the saved report texts are not here, so the file was checked for fitness only');
  if (all.length) { console.log('DRIFT or defects:'); for (const l of all) console.log('  ' + l); } else console.log('the years file is fit' + (dr.skipped ? '' : ' and equals what the saved report texts give'));
  if (process.argv.includes('--check') && all.length) process.exit(1);
}
