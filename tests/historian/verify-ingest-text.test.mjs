// verify-ingest-text.test.mjs - adversarial check of the TEXT of the Official Records passages (verifier workstream; every test here fails today, by design).
//
// The claim under test (docs/historian/CORPUS.md sections 3 and 4): a passage is the normalised OCR of its report, "verbatim", with running heads, signature marks and tables taken out and the
// 1863 spelling kept. A quote is shown to a reader in quotation marks under the author's name. Each test below is a class of residue that reaches a quote, counted over all 8,232 passages
// (Part 1: 2,680, Part 2: 2,083, Part 3: 3,469) of the build in historian-src/raw/or27, with the raw OCR (the Archive's _djvu.txt) as the reference for what the page really printed.
//
// Needs the passages the build writes into historian-src/raw/or27 (git-ignored); skipped loudly without them.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './lib/data.mjs';

const PASSAGES = path.join(ROOT, 'historian-src/raw/or27/passages.jsonl');
const SKIP = fs.existsSync(PASSAGES) ? false : 'SKIPPED LOUDLY: historian-src/raw/or27 is not built here; run  node tools/historian/ingest/corpus.mjs build';
let memo = null;
const passages = () => (memo ||= fs.readFileSync(PASSAGES, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)));
const scan = (re) => { const hits = []; for (const p of passages()) { const m = p.text.match(re); if (m) hits.push({ id: p.id, ctx: p.text.slice(Math.max(0, m.index - 40), m.index + 100).replace(/\s+/g, ' ') }); } return hits; };
const show = (hits) => hits.slice(0, 6).map((h) => `${h.id}: ${JSON.stringify(h.ctx)}`).join('\n  ');

test('VI-TX-1 a number compound split by a line break keeps its hyphen: no passage reads "thirtyseventh", "Fiftysecond", "Fortyfifth" (the raw OCR has "thirty- seventh")', { skip: SKIP }, () => {
  // 126 passages today. A regiment named "Twentyseventh Indiana" is neither the Twenty-seventh Indiana to the linker nor to a reader, and the quote prints the glued word.
  const hits = scan(/\b(?:twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)(?:first|second|third|fourth|fifth|sixth|seventh|eighth|ninth)\b/i);
  assert.equal(hits.length, 0, `${hits.length} passages carry a glued compound number, e.g.\n  ${show(hits)}`);
});

test('VI-TX-2 a footnote printed at the foot of a page is not spliced into a sentence of the text it stands under ("I moved to Middleburg * Embodied in revised statement, p. 179. during the morning of Sunday")', { skip: SKIP }, () => {
  // 118 passages today carry "* But see revised statement, p. N." or "* Embodied in revised statement, p. N." (the compiler's note), most of them in mid-sentence, and the quote shows it as the author's words.
  const hits = scan(/\*\s*(?:Embodied in revised statement|But see revised statement)/);
  assert.equal(hits.length, 0, `${hits.length} passages carry a foot-of-page note inside the text, e.g.\n  ${show(hits)}`);
});

test('VI-TX-3 the compiler\'s own notes are not the author\'s words: no passage holds a sentence ending "- Compiler."', { skip: SKIP }, () => {
  // or27-1:0006 (Meade) quotes "For casualties in the battle; see pp. 180-182.- Compiler." under his name: the answer to "what did Meade report about the Gettysburg campaign" prints it first.
  const hits = scan(/[—-]\s*Compiler\b/);
  assert.equal(hits.length, 0, `${hits.length} passages hold a compiler's note, e.g.\n  ${show(hits)}`);
});

test('VI-TX-4 no running head is left in the text of a passage ("CORRESPONDENCE, ETC. UNION.", "Chap. XXXIX.]", "N. C., VA., W. VA." in the middle of a sentence)', { skip: SKIP }, () => {
  const hits = scan(/CORRESPONDENCE,?\s+ETC\.?|\bChap\.?\s*[XIL]{2,}|\bN\.\s*[CO]\.,?\s*V[AY]\.,?\s*W\.\s*V/);
  assert.equal(hits.length, 0, `${hits.length} passages keep a running head, e.g.\n  ${show(hits)}`);
});

test('VI-TX-5 a passage does not begin with the page number and running head of the page it starts on ("610 N. C., Both officers and men behaved...")', { skip: SKIP }, () => {
  const hits = passages().filter((p) => /^\d{2,4}\s*\n+\s*(?:N\.|\[|Chap|THE)/.test(p.text)).map((p) => ({ id: p.id, ctx: p.text.slice(0, 90).replace(/\s+/g, ' ') }));
  assert.equal(hits.length, 0, `${hits.length} passages begin with a page number and a head, e.g.\n  ${show(hits)}`);
});
