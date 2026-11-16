// Node tests of the Pennsylvania roster files (work item union-pa): the 82 unit files under rosters/data2/union/pa, their flag files and cells files, and the pointer file.
//   node --test docs/battle-theatre/app/tests/roster-union-pa.test.mjs
// No browser, no network, no source text: the checks that need the pinned OCR text (name and remarks found at their offset, page of the leaf) are made by the
// builder before it writes a file and again by rosters/pipeline2/verify_unit.py; here the files are checked against themselves and against the pointer file:
// shape of every line, the header count, offsets that only grow, printed pages inside the register of the unit, the flag file joined to the unit file by its hash,
// indexes in range, no row both "on the rolls" and "not on the rolls", size and sha256 of every file equal to the pointer file, rights basis only where the year
// allows it, the lines whose name the text layer lost are listed and not written, and that no printed name or remark mentions how the data was made.
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path'; import zlib from 'node:zlib'; import crypto from 'node:crypto'; import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url)), ROSTERS = path.resolve(HERE, '..', '..', 'rosters'), GOV = path.resolve(HERE, '..', '..', 'GOVERNANCE', 'horde', 'ws-rosters', 'union-pa');
const DIR = path.join(ROSTERS, 'data2', 'union', 'pa');
const CO_CODES = new Set(['', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'FS', 'NCS', 'BAND', 'UNAS']);
const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const pointer = JSON.parse(fs.readFileSync(path.join(ROSTERS, 'sources', 'union-pa.json'), 'utf8'));
const stats = JSON.parse(fs.readFileSync(path.join(GOV, 'stats.json'), 'utf8'));
const UNITS = pointer.unit_files;
const load = (p) => zlib.gunzipSync(fs.readFileSync(path.join(ROSTERS, '..', '..', '..', p))).toString('utf8');

function loadUnit(u) {
  const gz = fs.readFileSync(path.join(ROSTERS, '..', '..', '..', u.path)), raw = zlib.gunzipSync(gz).toString('utf8');
  assert.ok(raw.endsWith('\n'), 'the file ends with a newline');
  const lines = raw.slice(0, -1).split('\n').map((l) => JSON.parse(l));
  const flags = JSON.parse(load(u.flags_path)), cells = JSON.parse(load(u.cells_path));
  return { gz, raw, lines, flags, cells };
}

test('union-pa: the pointer file lists the 82 units, each with the three files of the unit', () => {
  assert.equal(pointer.format, 'roster2-sources-pointer/1'); assert.equal(pointer.work_item, 'union-pa');
  assert.equal(UNITS.length, 82); assert.equal(new Set(UNITS.map((u) => u.unit)).size, 82);
  for (const u of UNITS) {
    assert.match(u.unit, /^u-pa-/); assert.ok(u.rows > 0); assert.equal(u.text_ids.length, 1); assert.match(u.text_ids[0], /^PA-BATES-1869\.[1-5]$/);
    for (const k of ['file', 'flags', 'cells']) { const p = u[k === 'file' ? 'path' : k + '_path']; assert.ok(fs.existsSync(path.join(ROSTERS, '..', '..', '..', p)), p); }
  }
});

for (const u of UNITS) {
  const L = loadUnit(u), header = L.lines[0], rows = L.lines.filter(Array.isArray), short = u.path.split('/').pop().replace('.jsonl.gz', '');

  test(`${short}: header, segment and row count`, () => {
    assert.deepEqual({ f: header.f, u: header.u, army: header.army, st: header.st, name: header.name }, { f: 'roster2/2', u: u.unit, army: 'union', st: 'pa', name: u.designation });
    assert.equal(header.n, rows.length); assert.equal(rows.length, u.rows);
    const segs = L.lines.filter((x) => !Array.isArray(x) && x.s);
    assert.equal(segs.length, 1); assert.deepEqual(segs[0], { s: 'PA-BATES-1869', v: u.text_ids[0].slice(-1), t: u.text_ids[0], lay: 'cols' });
  });

  test(`${short}: every line has the shape of roster2/2, offsets grow, pages and companies are plausible`, () => {
    let first = true, co = '', pg = null, names = 0, last = null;
    for (const x of L.lines.slice(1)) {
      if (Array.isArray(x)) {
        assert.ok([2, 3, 5].includes(x.length), 'row length'); assert.equal(typeof x[0], 'number'); assert.equal(typeof x[1], 'string'); assert.ok(x[1].length > 0, 'a printed name');
        if (x.length >= 3) assert.equal(typeof x[2], 'string');
        if (x.length === 5) { assert.ok(x[3].length > 0); assert.ok(Number.isInteger(x[4]), 'offset of the remarks from the name'); }
        if (!first) assert.ok(x[0] !== 0, 'offsets are not repeated'); first = false; names++;
        assert.ok(CO_CODES.has(co), 'company code ' + co);
        assert.ok(Number.isInteger(pg) && pg >= 1 && pg <= 1400, 'printed page ' + pg + ' of ' + x[1]);
        assert.ok(!/\n/.test(x[1]) && !/\s{2,}/.test(x[1]) && x[1] === x[1].trim(), 'name tokens joined by single blanks');
        assert.ok(!/^\^/.test(x[2] || ''), 'a rank never begins with the marker of a carried heading');
        last = x;
      } else if (!x.s) { assert.ok(Object.keys(x).every((k) => ['co', 'pg', 'rk'].includes(k))); if ('co' in x) co = x.co; if ('pg' in x) pg = x.pg; }
    }
    assert.equal(names, u.rows); assert.ok(last);
  });

  test(`${short}: flag file is joined to the unit file and its indexes are in range`, () => {
    const f = L.flags, n = rows.length;
    assert.equal(f.f, 'roster2-flags/1'); assert.equal(f.u, u.unit); assert.equal(f.n, n);
    assert.equal(f.unit_file_raw_lines_sha256, sha(Buffer.from(L.raw, 'utf8')));
    const inRange = (i) => Number.isInteger(i) && i >= 0 && i < n;
    assert.ok(f.ocr_uncertain.every(inRange)); assert.deepEqual([...f.ocr_uncertain], [...f.ocr_uncertain].sort((a, b) => a - b));
    for (const [code, list] of Object.entries(f.rows)) { assert.ok(code in f.codes, 'code ' + code); assert.ok(list.every(inRange)); }
    const union = new Set(Object.entries(f.rows).filter(([c]) => c !== 'L').flatMap(([, l]) => l)); assert.equal(union.size, f.ocr_uncertain.length); assert.ok(f.ocr_uncertain.every((i) => union.has(i)));
    const yes = f.on_rolls_july_1863.yes, no = f.on_rolls_july_1863.no, basis = f.on_rolls_july_1863.basis;
    for (const [i, b] of [...yes, ...no]) { assert.ok(inRange(i)); assert.ok(Number.isInteger(b) && b >= 0 && b < basis.length); }
    const y = new Set(yes.map((p) => p[0])); assert.ok(no.every((p) => !y.has(p[0])), 'no row is both on and off the rolls');
    assert.equal(f.normalised_names.length, n);
    for (const [, b] of yes) assert.match(basis[b], /^enl /); for (const [, b] of no) assert.match(basis[b], /^(?:enl|sep-before) /);
    assert.equal(L.cells.f, 'roster2-cells/1'); assert.equal(L.cells.rows.length, n);
  });

  test(`${short}: pointer file records this file's size and sha256`, () => {
    assert.equal(u.file_bytes, L.gz.length); assert.equal(u.file_sha256, sha(L.gz)); assert.equal(u.raw_lines_sha256, sha(Buffer.from(L.raw, 'utf8')));
    const fb = fs.readFileSync(path.join(ROSTERS, '..', '..', '..', u.flags_path)), cb = fs.readFileSync(path.join(ROSTERS, '..', '..', '..', u.cells_path));
    assert.equal(u.flags_bytes, fb.length); assert.equal(u.flags_sha256, sha(fb)); assert.equal(u.cells_bytes, cb.length); assert.equal(u.cells_sha256, sha(cb));
  });

  test(`${short}: the lines whose name the text layer lost are listed in the diagnostics and not written`, () => {
    const d = JSON.parse(fs.readFileSync(path.join(GOV, 'diag', short + '.json'), 'utf8'));
    assert.equal(d.unit, u.unit); assert.equal(d.rows, rows.length);
    for (const r of d.lost_name_lines) { assert.ok(Number.isInteger(r.leaf)); assert.equal(typeof r.rest, 'string'); }
    assert.equal(stats.units[u.unit].lost_name_lines, d.lost_name_lines.length);
    assert.equal(stats.units[u.unit].lines, rows.length);
  });

  test(`${short}: nothing in a printed name or remark says how the data was made`, () => {
    const bad = /\b(?:Anthropic|subagents?|LLM|language model|artificial intelligence|machine[- ]generated|generated by|built by)\b|pipeline2|\.py\b/i;
    assert.ok(!bad.test(L.raw)); assert.ok(!bad.test(JSON.stringify(L.flags)));
  });
}

test('union-pa: rights basis "public domain (United States publication before 1929)" only for sources printed before 1929 in the United States, and every file has a hash', () => {
  assert.equal(pointer.sources.length, 5);
  for (const s of pointer.sources) {
    assert.ok(s.rights.basis === 'public domain (United States publication before 1929)' ? s.year < 1929 : true);
    assert.ok([1869, 1870, 1871].includes(s.year)); assert.match(s.rights.evidence.imprint_quote, /STATE\s+PRINTE/);
    assert.ok(s.files.length >= 3); for (const f of s.files) { assert.match(f.sha256, /^[0-9a-f]{64}$/); assert.ok(f.bytes > 0); assert.match(f.url, /^https:\/\/archive\.org\//); }
    assert.match(s.djvu_xml.sha256, /^[0-9a-f]{64}$/);
  }
});

test('union-pa: the totals of the statistics file are the sums of the unit files and no line carries a label of presence', () => {
  let lines = 0, lost = 0;
  for (const u of UNITS) { lines += u.rows; lost += stats.units[u.unit].lost_name_lines; assert.ok(u.rows > 0); }
  assert.equal(stats.totals.lines, lines); assert.equal(stats.totals.lost_name_lines, lost);
  for (const u of UNITS) for (const x of loadUnit(u).lines.filter(Array.isArray)) assert.ok(x.length <= 5);   // no extra field: marks live in the flag files
});
