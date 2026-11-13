// Node tests of the New Hampshire roster files (work item union-nh): the four unit files under rosters/data2/union/nh, their flag files and the pointer file.
//   node --test docs/battle-theatre/app/tests/roster-union-nh.test.mjs
// No browser, no network, no source text: the checks that need the pinned OCR text (name and remarks found at their offset, page of the leaf) are made by the
// builder before it writes a file and again by rosters/pipeline2/verify_unit.py; here the files are checked against themselves and against the pointer file:
// shape of every line, the header count, offsets that only grow, printed pages inside the register of the unit, the flag file joined to the unit file by its hash, indexes
// in range, no row both "on the rolls" and "not on the rolls", sha256 and size of every file equal to the pointer file, rights basis only where the year allows it,
// and that no printed name or remark mentions how the data was made.
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path'; import zlib from 'node:zlib'; import crypto from 'node:crypto'; import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url)), ROSTERS = path.resolve(HERE, '..', '..', 'rosters');
const DIR = path.join(ROSTERS, 'data2', 'union', 'nh');
const UNITS = [
  { key: 'u-nh-2nd-new-hampshire-infantry', file: '2nd-new-hampshire-infantry', name: '2nd New Hampshire Infantry', rows: 2655, pages: [29, 96], text: 'NH-AYLING-1895.1', arm: 'co' },
  { key: 'u-nh-5th-new-hampshire-infantry', file: '5th-new-hampshire-infantry', name: '5th New Hampshire Infantry', rows: 2607, pages: [212, 280], text: 'NH-AYLING-1895.1', arm: 'co' },
  { key: 'u-nh-12th-new-hampshire-infantry', file: '12th-new-hampshire-infantry', name: '12th New Hampshire Infantry', rows: 1470, pages: [607, 647], text: 'NH-AYLING-1895.2', arm: 'co' },
  { key: 'u-nh-1st-new-hampshire-battery', file: '1st-new-hampshire-battery', name: '1st New Hampshire Battery', rows: 260, pages: [897, 903], text: 'NH-AYLING-1895.2', arm: 'bty' },
];
const CO_CODES = new Set(['', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'K', 'FS', 'NCS', 'BAND', 'UNAS']);
const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const pointer = JSON.parse(fs.readFileSync(path.join(ROSTERS, 'sources', 'union-nh.json'), 'utf8'));

function load(u) {
  const gz = fs.readFileSync(path.join(DIR, u.file + '.jsonl.gz')), raw = zlib.gunzipSync(gz).toString('utf8');
  assert.ok(raw.endsWith('\n'), 'the file ends with a newline');
  const lines = raw.slice(0, -1).split('\n').map((l) => JSON.parse(l));
  const flags = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(DIR, u.file + '.flags.json.gz'))).toString('utf8'));
  return { gz, raw, lines, flags };
}

for (const u of UNITS) {
  const L = load(u);
  const header = L.lines[0], rows = L.lines.filter(Array.isArray);

  test(`${u.file}: header, segment and row count`, () => {
    assert.deepEqual({ f: header.f, u: header.u, army: header.army, st: header.st, name: header.name }, { f: 'roster2/2', u: u.key, army: 'union', st: 'nh', name: u.name });
    assert.equal(header.n, rows.length); assert.equal(rows.length, u.rows);
    const segs = L.lines.filter((x) => !Array.isArray(x) && x.s);
    assert.equal(segs.length, 1); assert.deepEqual(segs[0], { s: 'NH-AYLING-1895', v: u.text.endsWith('.1') ? '1' : '2', t: u.text, lay: 'flow' });
  });

  test(`${u.file}: every line has the shape of roster2/2, offsets only grow, pages stay inside the register`, () => {
    let off = 0, first = true, co = '', pg = null, names = 0;
    for (const x of L.lines.slice(1)) {
      if (Array.isArray(x)) {
        assert.ok([2, 3, 5].includes(x.length), 'row length'); assert.equal(typeof x[0], 'number'); assert.equal(typeof x[1], 'string'); assert.ok(x[1].length > 0, 'a printed name');
        if (x.length >= 3) assert.equal(typeof x[2], 'string');
        if (x.length === 5) { assert.ok(x[3].length > 0); assert.ok(Number.isInteger(x[4]) && x[4] > 0, 'remarks start after the name'); }
        if (!first) assert.ok(x[0] > 0, 'offsets grow'); first = false; off += x[0]; names++;
        assert.ok(CO_CODES.has(co), 'company code ' + co);
        assert.ok(Number.isInteger(pg) && pg >= u.pages[0] && pg <= u.pages[1], 'printed page ' + pg + ' of ' + x[1]);
        assert.ok(!/\n/.test(x[1]) && !/\s{2,}/.test(x[1]) && x[1] === x[1].trim(), 'name tokens joined by single blanks');
      } else if (!x.s) { assert.ok(Object.keys(x).every((k) => ['co', 'pg', 'rk'].includes(k))); if ('co' in x) co = x.co; if ('pg' in x) pg = x.pg; }
    }
    assert.equal(names, u.rows); assert.ok(off > 0);
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
    // the roll marks rest on printed dates only: every "no" basis says which printed date it rests on, every "yes" basis names an enlistment date
    for (const [, b] of yes) assert.match(basis[b], /^enl /); for (const [, b] of no) assert.match(basis[b], /^(?:enl-after|sep-before) /);
  });

  test(`${u.file}: pointer file records this file's size and sha256`, () => {
    const p = pointer.unit_files.find((x) => x.unit === u.key); assert.ok(p, 'listed in the pointer file');
    assert.equal(p.rows, u.rows); assert.equal(p.file_bytes, L.gz.length); assert.equal(p.file_sha256, sha(L.gz)); assert.equal(p.raw_lines_sha256, sha(Buffer.from(L.raw, 'utf8')));
    assert.deepEqual(p.text_ids, [u.text]);
  });

  test(`${u.file}: nothing in a printed name or remark says how the data was made`, () => {
    const bad = /\b(?:Anthropic|subagents?|LLM|language model|artificial intelligence|machine[- ]generated|generated by|built by)\b|pipeline2|\.py\b/i;
    assert.ok(!bad.test(L.raw)); assert.ok(!bad.test(JSON.stringify(L.flags)));
  });
}

test('union-nh: the four units, the flagged heads and the printed errata are as the report says', () => {
  const total = UNITS.reduce((a, u) => a + u.rows, 0); assert.equal(total, 2655 + 2607 + 1470 + 260);
  for (const u of UNITS) {
    const f = load(u).flags;
    // a row whose head is not regular is flagged H; a cross-reference line is never a "yes" or a "no" for the rolls
    const H = new Set(f.rows.H || []);
    for (const [k, list] of Object.entries(f.head_kinds)) { if (['irregular', 'comma-lost', 'reviewed', 'bare-surname', 'anchorless'].includes(k)) assert.ok(list.every((i) => H.has(i)), k + ' rows carry H'); }
    const xref = new Set(f.head_kinds.xref || []); for (const [i] of [...f.on_rolls_july_1863.yes, ...f.on_rolls_july_1863.no]) assert.ok(!xref.has(i));
  }
  const second = load(UNITS[0]).flags, fifth = load(UNITS[1]).flags;
  assert.equal(second.errata.length, 2); assert.equal(fifth.errata.length, 1);
  for (const e of [...second.errata, ...fifth.errata]) { assert.match(e.text, /^Page \d+\./); assert.equal(e.rows.length, 1); }
});

test('union-nh: rights basis "public domain (United States publication before 1929)" only for sources printed before 1929 in the United States, and every file has a hash', () => {
  for (const s of pointer.sources) {
    if (s.rights.basis === 'public domain (United States publication before 1929)') { assert.ok(s.year < 1929); assert.match(s.rights.evidence.imprint, /Concord/); }
    assert.ok(s.files.length >= 3); for (const f of s.files) { assert.match(f.sha256, /^[0-9a-f]{64}$/); assert.ok(f.bytes > 0); assert.match(f.url, /^https:\/\/archive\.org\//); }
  }
  assert.ok(pointer.blocked.length >= 1, 'the refused image host is recorded');
});

test('union-nh: the comparison with the printed Summary totals adds up and agrees with the unit files', () => {
  const GOV = path.resolve(HERE, '..', '..', 'GOVERNANCE', 'horde', 'ws-rosters', 'union-nh');
  const recon = JSON.parse(fs.readFileSync(path.join(GOV, 'summary-reconciliation.json'), 'utf8')), figs = JSON.parse(fs.readFileSync(path.join(GOV, 'summary-figures.json'), 'utf8'));
  const short = { '2nd-new-hampshire-infantry': '2nd', '5th-new-hampshire-infantry': '5th', '12th-new-hampshire-infantry': '12th', '1st-new-hampshire-battery': 'battery' };
  for (const u of UNITS) {
    const r = recon[u.file], f = figs[short[u.file]]; assert.ok(r && f, u.file);
    assert.equal(r.rows, u.rows);
    assert.equal(r.own_record + r.cross_reference_to_another_organization + r.alias_cross_reference + r.spelling_cross_reference, r.rows);
    assert.equal(r.rows_minus_spelling_and_alias, r.rows - r.alias_cross_reference - r.spelling_cross_reference);
    assert.equal(r.printed_total_strength, f.printed_total_strength); assert.equal(r.difference, r.rows_minus_spelling_and_alias - r.printed_total_strength);
    assert.equal(f.parts.reduce((a, p) => a + p.value, 0), f.printed_total_strength); assert.equal(f.parts_sum, f.printed_total_strength);
    // the cross-reference lines are the rows with "See" among the first 10 tokens of their remarks; a target that begins with a digit is another organization
    let names = 0, other = 0;
    for (const x of load(u).lines.filter(Array.isArray)) {
      const toks = (x.length === 5 ? x[3] : '').split(' ').filter(Boolean), i = toks.slice(0, 10).indexOf('See');
      if (i >= 0) { if (/^\d/.test(toks[i + 1] || '')) other++; else names++; }
    }
    assert.equal(names, r.alias_cross_reference + r.spelling_cross_reference); assert.equal(other, r.cross_reference_to_another_organization);
  }
  assert.deepEqual(UNITS.map((u) => recon[u.file].difference), [-18, -42, 40, 0]);
});
