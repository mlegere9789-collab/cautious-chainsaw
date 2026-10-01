// verify-ingest-docs.test.mjs - adversarial check of what docs/historian/CORPUS.md and docs/historian/sources.yaml SAY about the Official Records corpus (verifier workstream; fails today, by design).
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
  const wi = d.fields.indexOf('written'), ii = d.fields.indexOf('id');
  const out = d.rows.filter((r) => r[wi] < '1863-06-01' || r[wi] > '1863-08-03').map((r) => `${r[ii]} ${r[wi]}`);
  assert.equal(out.length, 0, `${out.length} dispatch rows are dated outside June 1 - August 3, 1863: ${out.slice(0, 10).join('; ')}`);
});

test('VI-DOC-3 CORPUS.md says "2,945 dispatches"; the dispatch table holds that many rows but only 2,939 have any text', () => {
  const rows = JSON.parse(fs.readFileSync(path.join(ROOT, 'historian-src/corpus/or27/dispatches.json'), 'utf8')).rows;
  const fields = JSON.parse(fs.readFileSync(path.join(ROOT, 'historian-src/corpus/or27/dispatches.json'), 'utf8')).fields;
  const pi = fields.indexOf('passages');
  const withText = rows.filter((r) => r[pi] > 0).length;
  assert.equal(withText, rows.length, `${rows.length} rows, ${withText} with text: 6 are table headings (abstracts of returns), counted as dispatches in the manifest, sources.yaml and CORPUS.md`);
});
