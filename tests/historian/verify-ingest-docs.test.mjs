// verify-ingest-docs.test.mjs - adversarial check of what docs/historian/CORPUS.md and docs/historian/sources.yaml SAY about the Official Records corpus (verifier workstream; fails today, by design).
// STATUS after the second build (2026-10-04, tests/historian/or27-rebuild.test.mjs and docs/historian/CORPUS.md section 3b): these tests are green. Where a test was refined rather than met as written (a premise of the verifier's that the rebuild showed to be wrong, a fixture keyed by an id the rebuild changed, a regex that read a signature as a place line), the refinement is stated in the test beside the assertion.
//
// Checked against the Internet Archive's own item metadata (GET https://archive.org/metadata/warofrebellion271unit, 2026-10-01, honest User-Agent, one request) and against the committed build outputs.
// HathiTrust could not be read by the verifier (its robots.txt itself answers a Cloudflare challenge, HTTP 403; not circumvented), so the rights statement on HathiTrust's record is not tested here.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './lib/data.mjs';

// the fields of the three items' metadata that the register's wording depends on, as the Archive returned them on 2026-10-01 (all three items are alike)
const ARCHIVE = {
  warofrebellion271unit: { title: 'The War of the rebellion', volume: 'v.27:1', date: '1880', publisher: 'Washington : Govt. Print Office', contributor: 'University of Illinois Urbana-Champaign', 'possible-copyright-status': undefined, licenseurl: undefined, rights: undefined },
};
const yaml = fs.readFileSync(path.join(ROOT, 'docs/historian/sources.yaml'), 'utf8');
const entry = (id) => { const a = yaml.indexOf(`  - id: ${id}\n`); const b = yaml.indexOf('\n  - id: ', a + 5); return yaml.slice(a, b < 0 ? undefined : b); };

test('VI-DOC-1 the register does not quote an Internet Archive "possible-copyright-status" for an item whose metadata has none', () => {
  // sources.yaml, or27-1.tier_detail: "UC copy IA possible-copyright-status NOT_IN_COPYRIGHT". The scans ingested are University of Illinois (UIUC) copies, "warofrebellion271unit",
  // and the Archive's metadata for that item carries no such field (nor a rights or licenseurl field): the sentence describes another copy or was not read from this one.
  const e = entry('or27-1'); assert.ok(e.includes('ia_id: warofrebellion271unit'));
  const claims = /possible-copyright-status\s+(\S+)/.exec(e);
  assert.ok(!claims || ARCHIVE.warofrebellion271unit['possible-copyright-status'] === claims[1], `the register states possible-copyright-status ${claims && claims[1]}; the Archive's metadata for warofrebellion271unit has ${ARCHIVE.warofrebellion271unit['possible-copyright-status']}`);
});

test('VI-DOC-2 the file counts of the size table in CORPUS.md add up (128 + 32 + 1,029 + 1 = 1,190, the table says 1,189)', () => {
  const md = fs.readFileSync(path.join(ROOT, 'docs/historian/CORPUS.md'), 'utf8');
  const sec = md.slice(md.indexOf('## 8. Sizes and latency'), md.indexOf('**First paint**'));
  const rows = sec.split('\n').filter((l) => /^\|/.test(l) && !/^\|\s*\|/.test(l) && !/^\|---/.test(l));
  const num = (s) => +String(s).replace(/[^\d]/g, '');
  const parts = rows.filter((l) => !/all corpus files/.test(l)).map((l) => num(l.split('|')[4].trim().split(' ')[0]));
  const total = rows.filter((l) => /all corpus files/.test(l)).map((l) => num(l.split('|')[4]))[0];
  assert.equal(parts.length, 4, `rows: ${rows.length}`);
  assert.equal(parts.reduce((a, b) => a + b, 0), total, `rows ${JSON.stringify(parts)} sum to ${parts.reduce((a, b) => a + b, 0)}; the table's total says ${total}`);
});

test('VI-DOC-4 CORPUS.md says the dispatches are "dated June 3 to August 3, 1863"; the table holds 27 dated outside June 1 - August 3, 1863: 20 later in 1863 (the volume\'s addenda, pp. 839-857), 5 in 1864, one in 1862 and one in 1865 (an OCR year)', () => {
  const d = JSON.parse(fs.readFileSync(path.join(ROOT, 'historian-src/corpus/or27/dispatches.json'), 'utf8'));
  const wi = d.fields.indexOf('written'), ii = d.fields.indexOf('id'), pi = d.fields.indexOf('page');
  const out = d.rows.filter((r) => r[wi] && (r[wi] < '1863-06-01' || r[wi] > '1863-08-03'));
  const inside = d.rows.filter((r) => r[wi] && r[wi] >= '1863-06-01' && r[wi] <= '1863-08-03').length, undated = d.rows.filter((r) => !r[wi]).length;
  // Refinement after the rebuild. The verifier's premise was that the documented range ("June 3 to August 3, 1863") did not cover the table. The table does hold dates outside it, and they are the volume's own
  // (its addenda, pp. 839-857, which print documents of August 1863 to February 1864 and a letter of December 6, 1878, and four Confederate pages), not slips of the OCR: the 1862 and 1865 dates of the first build were
  // OCR years and are read right now. So the test asks that the documentation SAYS what the table holds: the counts inside, outside and undated, and the pages the outside ones stand on.
  const md = fs.readFileSync(path.join(ROOT, 'docs/historian/CORPUS.md'), 'utf8');
  const m = /\*\*([\d,]+) are dated June 1 to August 3, 1863, (\d+) are dated outside it, (\d+) carry no date/.exec(md);
  assert.ok(m, 'CORPUS.md states how many dispatches are dated inside, outside and not at all');
  assert.deepEqual([+m[1].replace(/,/g, ''), +m[2], +m[3]], [inside, out.length, undated], `CORPUS.md says ${m[1]} / ${m[2]} / ${m[3]}; the table holds ${inside} / ${out.length} / ${undated}`);
  const documented = (pg) => (pg >= 839 && pg <= 857 && /pp\. 839-857/.test(md)) || ([1007, 1052, 1072, 1075].includes(pg) && /pp\. 1007, 1052, 1072 and 1075/.test(md));
  const undoc = out.filter((r) => !documented(r[pi])).map((r) => `${r[ii]} ${r[wi]} (p. ${r[pi]})`);
  assert.deepEqual(undoc, [], 'a dispatch dated outside the range stands on a page CORPUS.md does not name');
  assert.ok(out.every((r) => r[wi] >= '1863-08-04' || r[wi] === '1878-12-06' || (r[wi] >= '1864-01-01' && r[wi] <= '1864-02-29')), 'no date outside the range but the addenda\'s and the one of 1878');
});

test('VI-DOC-3 CORPUS.md says "2,945 dispatches"; the dispatch table holds that many rows but only 2,939 have any text', () => {
  const rows = JSON.parse(fs.readFileSync(path.join(ROOT, 'historian-src/corpus/or27/dispatches.json'), 'utf8')).rows;
  const fields = JSON.parse(fs.readFileSync(path.join(ROOT, 'historian-src/corpus/or27/dispatches.json'), 'utf8')).fields;
  const pi = fields.indexOf('passages');
  const withText = rows.filter((r) => r[pi] > 0).length;
  assert.equal(withText, rows.length, `${rows.length} rows, ${withText} with text: 6 are table headings (abstracts of returns), counted as dispatches in the manifest, sources.yaml and CORPUS.md`);
});
