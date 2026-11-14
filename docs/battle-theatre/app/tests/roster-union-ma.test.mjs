// Node tests of the Massachusetts roster files (work item union-ma): the 24 unit files under rosters/data2/union/ma, their flag files and the pointer file.
//   node --test docs/battle-theatre/app/tests/roster-union-ma.test.mjs
// No browser, no network, no source text: the checks that need the pinned OCR text (name and remarks found at their offset, page of the leaf) are made by the
// builder before it writes a file and again by rosters/pipeline2/verify_unit.py; here the files are checked against themselves and against the pointer file:
// shape of every line, the header count, offsets that only grow, printed pages inside the roster of the unit, the flag file joined to the unit file by its hash, indexes
// in range, no row both "on the rolls" and "not on the rolls", sha256 and size of every unit file equal to the pointer file, the rights basis of every text (the basis
// of a United States publication before 1929 is claimed for none of them: the volumes were printed 1931 to 1937), the corrections of the reconciliation (third head rule,
// reviewed headings), and that no printed name or remark mentions how the data was made.
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path'; import zlib from 'node:zlib'; import crypto from 'node:crypto'; import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url)), ROSTERS = path.resolve(HERE, '..', '..', 'rosters');
const DIR = path.join(ROSTERS, 'data2', 'union', 'ma');
const UNITS = [
  { key: 'u-ma-1st-massachusetts-infantry', file: '1st-massachusetts-infantry', name: '1st Massachusetts Infantry', rows: 1699, vol: '1', pages: [3, 68], nopage: 19 },
  { key: 'u-ma-2nd-massachusetts-infantry', file: '2nd-massachusetts-infantry', name: '2nd Massachusetts Infantry', rows: 2013, vol: '1', pages: [71, 147], nopage: 0 },
  { key: 'u-ma-7th-massachusetts-infantry', file: '7th-massachusetts-infantry', name: '7th Massachusetts Infantry', rows: 1171, vol: '1', pages: [470, 515], nopage: 0 },
  { key: 'u-ma-9th-massachusetts-infantry', file: '9th-massachusetts-infantry', name: '9th Massachusetts Infantry', rows: 1692, vol: '1', pages: [617, 681], nopage: 0 },
  { key: 'u-ma-10th-massachusetts-infantry', file: '10th-massachusetts-infantry', name: '10th Massachusetts Infantry', rows: 1258, vol: '1', pages: [684, 734], nopage: 0 },
  { key: 'u-ma-11th-massachusetts-infantry', file: '11th-massachusetts-infantry', name: '11th Massachusetts Infantry', rows: 2039, vol: '1', pages: [737, 815], nopage: 21 },
  { key: 'u-ma-12th-massachusetts-infantry', file: '12th-massachusetts-infantry', name: '12th Massachusetts Infantry', rows: 1592, vol: '2', pages: [5, 68], nopage: 45 },
  { key: 'u-ma-13th-massachusetts-infantry', file: '13th-massachusetts-infantry', name: '13th Massachusetts Infantry', rows: 1448, vol: '2', pages: [71, 130], nopage: 0 },
  { key: 'u-ma-15th-massachusetts-infantry', file: '15th-massachusetts-infantry', name: '15th Massachusetts Infantry', rows: 1726, vol: '2', pages: [133, 204], nopage: 0 },
  { key: 'u-ma-1st-company-massachusetts-sharpshooters', file: '1st-company-massachusetts-sharpshooters', name: '1st Company Massachusetts Sharpshooters', rows: 186, vol: '2', pages: [206, 213], nopage: 0 },
  { key: 'u-ma-16th-massachusetts-infantry', file: '16th-massachusetts-infantry', name: '16th Massachusetts Infantry', rows: 1369, vol: '2', pages: [215, 269], nopage: 0 },
  { key: 'u-ma-18th-massachusetts-infantry', file: '18th-massachusetts-infantry', name: '18th Massachusetts Infantry', rows: 1371, vol: '2', pages: [351, 408], nopage: 0 },
  { key: 'u-ma-19th-massachusetts-infantry', file: '19th-massachusetts-infantry', name: '19th Massachusetts Infantry', rows: 1938, vol: '2', pages: [411, 491], nopage: 0 },
  { key: 'u-ma-20th-massachusetts-infantry', file: '20th-massachusetts-infantry', name: '20th Massachusetts Infantry', rows: 2484, vol: '2', pages: [494, 593], nopage: 0 },
  { key: 'u-ma-22nd-massachusetts-infantry', file: '22nd-massachusetts-infantry', name: '22nd Massachusetts Infantry', rows: 1452, vol: '2', pages: [651, 710], nopage: 0 },
  { key: 'u-ma-28th-massachusetts-infantry', file: '28th-massachusetts-infantry', name: '28th Massachusetts Infantry', rows: 2065, vol: '3', pages: [190, 274], nopage: 0 },
  { key: 'u-ma-32nd-massachusetts-infantry', file: '32nd-massachusetts-infantry', name: '32nd Massachusetts Infantry', rows: 2168, vol: '3', pages: [450, 535], nopage: 0 },
  { key: 'u-ma-33rd-massachusetts-infantry', file: '33rd-massachusetts-infantry', name: '33rd Massachusetts Infantry', rows: 1282, vol: '3', pages: [538, 587], nopage: 0 },
  { key: 'u-ma-37th-massachusetts-infantry', file: '37th-massachusetts-infantry', name: '37th Massachusetts Infantry', rows: 1310, vol: '3', pages: [771, 823], nopage: 21 },
  { key: 'u-ma-1st-massachusetts-cavalry', file: '1st-massachusetts-cavalry', name: '1st Massachusetts Cavalry', rows: 2341, vol: '6', pages: [132, 227], nopage: 0 },
  { key: 'u-ma-1st-massachusetts-battery-a', file: '1st-massachusetts-battery-a', name: '1st Massachusetts Battery (A)', rows: 265, vol: '5', pages: [345, 354], nopage: 0 },
  { key: 'u-ma-3rd-massachusetts-battery-c', file: '3rd-massachusetts-battery-c', name: '3rd Massachusetts Battery (C)', rows: 258, vol: '5', pages: [373, 382], nopage: 0 },
  { key: 'u-ma-5th-massachusetts-battery-e', file: '5th-massachusetts-battery-e', name: '5th Massachusetts Battery (E)', rows: 331, vol: '5', pages: [399, 411], nopage: 0 },
  { key: 'u-ma-9th-massachusetts-battery', file: '9th-massachusetts-battery', name: '9th Massachusetts Battery', rows: 329, vol: '5', pages: [454, 466], nopage: 0 },
];
const TOTAL_ROWS = 33787;
const CO_CODES = new Set(['', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'K', 'L', 'M', 'FS', 'NCS', 'BAND', 'UNAS']);
const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const pointer = JSON.parse(fs.readFileSync(path.join(ROSTERS, 'sources', 'union-ma.json'), 'utf8'));
const textIds = new Set(pointer.sources.map((s) => s.text_id));

function load(u) {
  const gz = fs.readFileSync(path.join(DIR, u.file + '.jsonl.gz')), raw = zlib.gunzipSync(gz).toString('utf8');
  assert.ok(raw.endsWith('\n'), 'the file ends with a newline');
  const lines = raw.slice(0, -1).split('\n').map((l) => JSON.parse(l));
  const flagsGz = fs.readFileSync(path.join(DIR, u.file + '.flags.json.gz'));
  const flags = JSON.parse(zlib.gunzipSync(flagsGz).toString('utf8'));
  return { gz, raw, lines, flags, flagsGz };
}

for (const u of UNITS) {
  const L = load(u);
  const header = L.lines[0], rows = L.lines.filter(Array.isArray);

  test(`${u.file}: header, segment and row count`, () => {
    assert.deepEqual({ f: header.f, u: header.u, army: header.army, st: header.st, name: header.name }, { f: 'roster2/2', u: u.key, army: 'union', st: 'ma', name: u.name });
    assert.equal(header.n, rows.length); assert.equal(rows.length, u.rows);
    const segs = L.lines.filter((x) => !Array.isArray(x) && x.s);
    assert.equal(segs.length, 1); assert.deepEqual(segs[0], { s: 'MA-SSM-1931', v: u.vol, t: 'MA-SSM-1931.' + u.vol, lay: 'flow' });
    assert.ok(textIds.has(segs[0].t), 'the text id has a rights entry in the pointer file');
  });

  test(`${u.file}: every line has the shape of roster2/2, offsets only grow, pages stay inside the roster`, () => {
    let off = 0, first = true, co = '', pg = null, names = 0, nullPages = 0;
    for (const x of L.lines.slice(1)) {
      if (Array.isArray(x)) {
        assert.ok([2, 3, 5].includes(x.length), 'row length'); assert.equal(typeof x[0], 'number'); assert.equal(typeof x[1], 'string'); assert.ok(x[1].length > 0, 'a printed name');
        if (x.length >= 3) assert.equal(typeof x[2], 'string');
        if (x.length === 5) { assert.ok(x[3].length > 0); assert.ok(Number.isInteger(x[4]) && x[4] > 0, 'remarks start after the name'); }
        if (!first) assert.ok(x[0] > 0, 'offsets grow'); first = false; off += x[0]; names++;
        assert.ok(CO_CODES.has(co), 'company code ' + co);
        if (pg === null) nullPages++; else assert.ok(Number.isInteger(pg) && pg >= u.pages[0] && pg <= u.pages[1], 'printed page ' + pg + ' of ' + x[1]);
        assert.ok(!/\n/.test(x[1]) && !/\s{2,}/.test(x[1]) && x[1] === x[1].trim(), 'name tokens joined by single blanks');
      } else if (!x.s) { assert.ok(Object.keys(x).every((k) => ['co', 'pg', 'rk'].includes(k))); if ('co' in x) co = x.co; if ('pg' in x) pg = x.pg; }
    }
    assert.equal(names, u.rows); assert.ok(off > 0);
    assert.equal(nullPages, u.nopage, 'rows on leaves whose printed page the page-number file does not give');
    assert.ok((L.flags.printed_page_from_running_head || []).length <= nullPages, 'the running-head pages cover no more rows than lack a page');
  });

  test(`${u.file}: flag file is joined to the unit file and its indexes are in range`, () => {
    const f = L.flags, n = rows.length;
    assert.equal(f.f, 'roster2-flags/1'); assert.equal(f.u, u.key); assert.equal(f.n, n);
    assert.equal(f.unit_file_raw_lines_sha256, sha(Buffer.from(L.raw, 'utf8')));
    const inRange = (i) => Number.isInteger(i) && i >= 0 && i < n;
    assert.ok(f.ocr_uncertain.every(inRange)); assert.deepEqual([...f.ocr_uncertain], [...f.ocr_uncertain].sort((a, b) => a - b));
    for (const [code, list] of Object.entries(f.rows)) { assert.ok(code in f.codes, 'code ' + code); assert.ok(list.every(inRange)); }
    const union = new Set(Object.values(f.rows).flat()); assert.equal(union.size, f.ocr_uncertain.length); assert.ok(f.ocr_uncertain.every((i) => union.has(i)));
    const yes = f.on_rolls_july_1863.yes, no = f.on_rolls_july_1863.no, basis = f.on_rolls_july_1863.basis;
    for (const [i, b] of [...yes, ...no]) { assert.ok(inRange(i)); assert.ok(Number.isInteger(b) && b >= 0 && b < basis.length); }
    const y = new Set(yes.map((p) => p[0])); assert.ok(no.every((p) => !y.has(p[0])), 'no row is both on and off the rolls');
    assert.equal(f.normalised_names.length, n);
    for (const [, b] of yes) assert.match(basis[b], /^enl /); for (const [, b] of no) assert.match(basis[b], /^(?:enl-after|sep-before) /);
    assert.ok(f.names_gettysburg.every(inRange)); assert.ok(f.gettysburg_dated.every((i) => f.names_gettysburg.includes(i)), 'a dated Gettysburg line names Gettysburg');
    for (const [i, letter] of f.company_inferred || []) { assert.ok(inRange(i)); assert.match(letter, /^[A-M]$/); }
  });

  test(`${u.file}: the pointer file records this file's size and sha256`, () => {
    const p = pointer.unit_files.find((x) => x.unit === u.key); assert.ok(p, 'listed in the pointer file');
    assert.equal(p.rows, u.rows); assert.equal(p.file_bytes, L.gz.length); assert.equal(p.file_sha256, sha(L.gz)); assert.equal(p.raw_lines_sha256, sha(Buffer.from(L.raw, 'utf8')));
    assert.deepEqual(p.text_ids, ['MA-SSM-1931.' + u.vol]); assert.equal(p.flags_bytes, L.flagsGz.length); assert.equal(p.flags_sha256, sha(L.flagsGz));
  });

  test(`${u.file}: nothing in a printed name, rank or remark says how the data was made`, () => {
    const bad = /\b(?:Anthropic|Claude|subagents?|LLM|GPT|chatbot|language model|artificial intelligence|machine[- ]generated|generated by|built by)\b|pipeline2|\.py\b/i;
    assert.ok(!bad.test(L.raw)); assert.ok(!bad.test(JSON.stringify(L.flags)));
  });
}

test('union-ma: 24 units, 33,787 lines, one file per unit of the Official Records table, no file outside the list', () => {
  assert.equal(UNITS.length, 24); assert.equal(UNITS.reduce((a, u) => a + u.rows, 0), TOTAL_ROWS);
  const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.jsonl.gz')).sort();
  assert.deepEqual(files, UNITS.map((u) => u.file + '.jsonl.gz').sort());
  assert.equal(pointer.unit_files.length, 24); assert.equal(pointer.unit_files.reduce((a, x) => a + x.rows, 0), TOTAL_ROWS);
});

test('union-ma: no text carries the basis of a United States publication before 1929; every file of the pointer file has a hash', () => {
  assert.equal(pointer.sources.length, 9);
  for (const s of pointer.sources) {
    assert.ok(s.year >= 1931, 'printed year ' + s.year); assert.notEqual(s.rights.basis, 'public domain (United States publication before 1929)');
    assert.match(s.rights.basis, /not established by the date of publication/); assert.match(s.rights.basis, /owner decision pending/);
    const ev = s.rights.evidence; assert.equal(ev.ia_possible_copyright_status, 'NOT_IN_COPYRIGHT'); assert.equal(ev.ia_access_restricted_item, false);
    assert.equal(ev.printed_year, s.year); assert.ok(ev.imprint_quote && ev.imprint_quote_offset_in_text > 0); assert.match(ev.authority_quote, /adjutant/i);
    assert.ok(s.files.length >= 4); for (const f of s.files) { assert.match(f.sha256, /^[0-9a-f]{64}$/); assert.ok(f.bytes > 0); assert.match(f.url, /^https:\/\/archive\.org\//); }
    for (const f of s.files.filter((x) => x.role !== 'metadata')) { assert.equal(f.sha256_matches_ledger, true); assert.equal(f.ia_md5_matches, true); assert.equal(f.ia_sha1_matches, true); assert.equal(f.ia_size_matches, true); }
  }
  assert.ok(pointer.blocked.length >= 1, 'the refused image routes are recorded');
  const used = new Set(UNITS.map((u) => 'MA-SSM-1931.' + u.vol)); assert.deepEqual([...used].sort(), ['MA-SSM-1931.1', 'MA-SSM-1931.2', 'MA-SSM-1931.3', 'MA-SSM-1931.5', 'MA-SSM-1931.6']);
  for (const s of pointer.sources) assert.equal(s.used_for.length > 0, used.has(s.text_id), s.text_id);
});

test('union-ma: the corrections of the reconciliation are in the files (third head rule, reviewed headings)', () => {
  let resLost = 0;
  for (const u of UNITS) {
    const L = load(u), f = L.flags, H = new Set(f.rows.H || []), Q = new Set(f.rows.Q || []), rem = L.lines.filter(Array.isArray).map((x) => (x.length === 5 ? x[3] : ''));
    for (const i of (f.head_kinds['res-lost'] || [])) { resLost++; assert.ok(H.has(i), u.file + ' row ' + i + ' carries H'); if (!/^Res[.,:;]?/.test(rem[i])) assert.ok(Q.has(i), u.file + ' row ' + i + ' carries Q'); }
  }
  assert.equal(resLost, 39);
  const tenth = load(UNITS.find((u) => u.file === '10th-massachusetts-infantry')).flags, nineteenth = load(UNITS.find((u) => u.file === '19th-massachusetts-infantry')).flags;
  assert.equal(tenth.reviewed_headings.length, 1); assert.equal(tenth.reviewed_headings[0].code, 'K'); assert.equal(tenth.reviewed_headings[0].n_rows, 112);
  assert.equal(nineteenth.reviewed_headings.length, 1); assert.equal(nineteenth.reviewed_headings[0].code, 'UNAS'); assert.equal(nineteenth.reviewed_headings[0].n_rows, 96);
  const eighteenth = load(UNITS.find((u) => u.file === '18th-massachusetts-infantry')).flags;
  assert.equal(eighteenth.company_inferred.length, 138); assert.ok(eighteenth.company_inferred.every(([, l]) => l === 'E'));
  for (const u of UNITS) if (!['18th-massachusetts-infantry'].includes(u.file)) assert.equal((load(u).flags.company_inferred || []).length, 0, u.file);
});

test('union-ma: the 24 units are the Massachusetts units of the organization table; the 1st Cavalry and the batteries have a single list without company headings', () => {
  for (const u of UNITS.filter((x) => /battery|sharpshooters/.test(x.file))) { const L = load(u); const cos = new Set(L.lines.filter((x) => !Array.isArray(x) && 'co' in x).map((x) => x.co)); assert.ok([...cos].every((c) => c === ''), u.file); }
  const cav = load(UNITS.find((u) => u.file === '1st-massachusetts-cavalry')), cavCos = new Set(cav.lines.filter((x) => !Array.isArray(x) && 'co' in x).map((x) => x.co));
  for (const c of ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'K', 'L', 'M']) assert.ok(cavCos.has(c), 'company ' + c);
});
