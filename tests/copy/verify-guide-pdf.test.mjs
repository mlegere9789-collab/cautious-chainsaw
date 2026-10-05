// Adversarial verifier test for the guide PDFs: words broken in the middle ("Orig / inal site", "Sinc / e", "Documentar / y Mode") in narrow table
// columns. The text layer and the printed page both carry the break. Needs python with PyMuPDF (skips when it is missing).
//   node --test "tests/copy/verify-*.test.mjs"
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { REPO } from '../../tools/copy/lib/lint.mjs';

const PY = `
import sys, re, html, json
try:
    import pymupdf as fitz
except ImportError:
    import fitz
pdf, src = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf8').read()
s = re.sub(r'<script.*?</script>', '', s, flags=re.S); s = re.sub(r'<style.*?</style>', '', s, flags=re.S)
s = re.sub(r'<[^>]+>', ' ', s); s = html.unescape(s)
vocab = set(w.lower() for w in re.findall(r"[A-Za-z]+", s))
toks = []
for pg in fitz.open(pdf): toks += re.findall(r"[A-Za-z]+", pg.get_text())
splits = [a + '|' + b for a, b in zip(toks, toks[1:]) if a.lower() not in vocab and b.lower() not in vocab and (a + b).lower() in vocab]
print(json.dumps(splits))
`;
const probe = spawnSync('python', ['-c', 'import pymupdf'], { encoding: 'utf8' });
const probe2 = probe.status === 0 ? probe : spawnSync('python', ['-c', 'import fitz'], { encoding: 'utf8' });
const haveFitz = probe2.status === 0;

for (const [pdf, src] of [['candidates/user-guide/gettysburg-user-guide.pdf', 'candidates/user-guide/print.html'], ['candidates/user-guide/gettysburg-user-guide-a4.pdf', 'candidates/user-guide/print-a4.html']]) {
  test(`VER-PDF-01: no word is broken across lines inside a table cell of ${path.basename(pdf)}`, { skip: haveFitz ? false : 'PyMuPDF is not installed' }, () => {
    const r = spawnSync('python', ['-c', PY, path.join(REPO, pdf), path.join(REPO, src)], { encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
    const splits = JSON.parse(r.stdout.trim().split('\n').pop());
    const count = {};
    for (const s of splits) count[s] = (count[s] || 0) + 1;
    assert.deepEqual(count, {}, `words broken mid-word in the PDF text: ${JSON.stringify(count)} (the "Since" column is too narrow; "Original site" and the heading "Since" wrap inside the word)`);
  });
}
