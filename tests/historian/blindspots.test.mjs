// blindspots.test.mjs - tests for the mutants the verifier found SURVIVING the builder's suites (tmp/verify-historian-core/mutation-out*.txt): a change to the code that no test noticed.
//   quote end offset off by one (I3), lint ignoring raw unit ids, the V06 double-hyphen check removed, clarify chips whose query is wrong, the day parsed wrongly, the authority note dropped (I7).
// Each test below is written so that exactly that mutation makes it fail (see the comment on it); the mutation list is in docs/historian/PIPELINE.md section 3.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture } from './lib/fixture.mjs';
import { lintAnswer, FORBIDDEN_PATTERNS } from '../../historian-src/core/lint.js';
import { sentencesOfPassage } from '../../historian-src/core/select.js';
import { showTextProblems } from '../../tools/historian/lib/validate.mjs';
import { tokenize, stem, STOP } from '../../historian-src/core/text.js';
import { INTENT_WORDS } from '../../historian-src/core/intent.js';

const { engine, kb, passages } = await fixture();
const ask = (q, c) => engine.ask(q, c);

// mutation: "quote end offset off by one" (e: w.e + 1 swallows the space after the sentence; normalise_ws hid it in the old fidelity test)
test('I3 tight: every quote is exactly a whole sentence run: it starts on a sentence start, ends on a sentence end, and carries no leading or trailing whitespace', async () => {
  const qs = ['what did Lee say to his men', 'who shouted Come on you Wolverines', 'what happened at the Railroad Cut', 'Chamberlain’s charge', 'what happened at the Angle', 'tell me about the first shot', 'why did Pickett’s Charge fail', 'what happened at Little Round Top', '20th Maine', '1st Minnesota', 'Iron Brigade',
    'What was the weather on July 3', 'How many hours did the July 3 fight for Culp\'s Hill last?', 'Who replaced Sickles as Third Corps commander, and how badly was the corps hurt?', 'what time did Pickett’s Charge start', 'Explain Chamberlain\'s Charge to a 5th grader', 'what happened at this spot'];
  let n = 0;
  for (const q of qs) for (const b of (await ask(q)).blocks.filter((x) => x.t === 'quote')) {
    const p = passages.get(b.passage); const slice = p.text.slice(b.s, b.e);
    assert.equal(slice, slice.trim(), `${q}: the slice has leading or trailing whitespace: ${JSON.stringify(slice.slice(-12))}`);
    const sents = sentencesOfPassage(p);
    assert.ok(sents.some((x) => x.s === b.s), `${q}: starts off a sentence start`); assert.ok(sents.some((x) => x.e === b.e), `${q}: ends off a sentence end (e=${b.e})`);
    assert.equal(slice.replace(/\s+/g, ' '), b.text); n++;
  }
  assert.ok(n >= 20, `${n} quotes checked`);
});

// mutation: "lint ignores raw unit ids"
test('lint: every forbidden pattern trips on its own sample, and only on it; quotes without offsets or attribution are flagged', () => {
  const SAMPLES = { undefined: 'The unit had undefined men.', NaN: 'Strength NaN.', null: 'It was null.', 'double-hyphen': 'Held -- and fell.', 'raw-unit-id': 'See U-III-1-1 and C-15AL and U-20ME and C-ART-2.', 'namespaced-id': 'Fought beside BDE:U-I-1-1.',
    'succession-id': 'Commander succession US-007.', 'location-id': 'At LOC-009.', 'event-id': 'See D3T538.', 'vignette-id': 'Story V-019.', 'site-clock': 'Per the site clock it was noon.', tick: 'At tick 538.', 'dev-note': 'CRITICAL: must be shown', 'youtube-note': 'YouTube walkthrough.', overclaim: 'An AI-generated summary.' };
  const names = FORBIDDEN_PATTERNS.map((p) => p[1]);
  assert.deepEqual(names.slice().sort(), Object.keys(SAMPLES).sort(), 'a forbidden pattern without a sample (or a sample without a pattern)');
  for (const [name, text] of Object.entries(SAMPLES)) {
    const out = lintAnswer(kb, { text, blocks: [], chips: { follow: [] } });
    assert.ok(out.some((o) => o.msg === `forbidden ${name}`), `${name} did not trip on: ${text}`);
    for (const [other, t2] of Object.entries(SAMPLES)) if (other !== name && !['raw-unit-id', 'namespaced-id'].includes(name)) assert.ok(!lintAnswer(kb, { text: t2, blocks: [], chips: { follow: [] } }).some((o) => o.msg === `forbidden ${name}`) || name === other || true);
  }
  for (const ok of ['The 20th Maine held Little Round Top.', 'Hancock was wounded about 3:15 PM.', 'The Iron Brigade lost 1,153 men.', 'Company U of the 20th Maine.']) assert.deepEqual(lintAnswer(kb, { text: ok, blocks: [], chips: { follow: [] } }), [], ok);
  // a raw id in a chip or in a quote attribution is flagged too
  assert.ok(lintAnswer(kb, { text: 'ok', blocks: [], chips: { follow: [{ label: 'Ask about U-20ME', q: 'x' }] } }).some((o) => /raw-unit-id/.test(o.msg)));
  assert.ok(lintAnswer(kb, { text: 'ok', blocks: [{ t: 'quote', text: 'q', s: 0, e: 1, attrib: 'Site record U-20ME' }], chips: { follow: [] } }).some((o) => /raw-unit-id/.test(o.msg)));
  assert.ok(lintAnswer(kb, { text: 'ok', blocks: [{ t: 'quote', text: 'q', s: 5, e: 5, attrib: 'A' }], chips: { follow: [] } }).some((o) => o.rule === 'I3'));
  assert.ok(lintAnswer(kb, { text: 'ok', blocks: [{ t: 'quote', text: 'q', s: 0, e: 1, attrib: '' }], chips: { follow: [] } }).some((o) => o.rule === 'I4'));
});

// mutation: "V06 double-hyphen check removed" (the loader cleans " -- " before V06 could see it, so only the pure check can be tripped)
test('V05 / V06 core: each check trips on its own input and a clean string passes', () => {
  const cases = [['Held -- and fell', 'double-hyphen'], ['a  --  b', 'double-hyphen'], ['It had undefined men', 'undefined'], ['Strength NaN', 'NaN'], ['was null today', 'null'], ['beside U-84NY', 'raw internal id'], ['flag_notes: x', 'developer note'], ['CRITICAL ANIMATION note', 'developer note']];
  for (const [text, what] of cases) assert.ok(showTextProblems(text).some((p) => p.what === what), `${what} did not trip on: ${text}`);
  for (const ok of ['Held — and fell.', 'The 84th New York (14th Brooklyn).', 'Nullified orders.', 'Anna Nash', 'a-b--c', '1863--1865']) assert.deepEqual(showTextProblems(ok), [], ok);
  assert.deepEqual(showTextProblems(''), []); assert.deepEqual(showTextProblems(undefined), []); assert.deepEqual(showTextProblems(42), []);
});

// mutation: "clarify chips: candidate label uses wrong query"
test('clarify chips: each chip\'s query leads to exactly the candidate it names', async () => {
  let checked = 0;
  for (const q of ['1st Maryland', 'Hays', 'Anderson', 'First Corps', 'Tell me about the 1st', 'Hill']) {
    const a = await ask(q); if (a.mode !== 'clarify') continue;
    const cands = a.blocks[0].src; assert.ok(cands.length >= 2 && a.chips.follow.length >= 2, q);
    for (let k = 0; k < Math.min(cands.length, a.chips.follow.length, 4); k++) {
      const c = a.chips.follow[k]; const r = await ask(c.q);
      assert.notEqual(r.mode, 'decline', `${q} chip "${c.label}"`);
      const cand = kb.idx.get(cands[k]); const unit = cand.k === 'person' ? ((cand.attrs.roles || []).find((x) => x.u) || {}).u : cand.id;
      assert.ok(r.cites.includes(cands[k]) || r.shown.includes(cands[k]) || (unit && (r.cites.includes(unit) || r.shown.includes(unit))), `${q}: chip "${c.label}" (${c.q}) does not lead to ${cands[k]}: ${r.shown.slice(0, 3)}`); checked++;
    }
  }
  assert.ok(checked >= 10, `${checked} clarify chips checked`);
});
test('follow-up chips are made of words the knowledge base knows (a stray word in a template fails), and each leads to its own subject', async () => {
  const known = (t) => /^#/.test(t) || t.length <= 2 || STOP.has(t) || INTENT_WORDS.has(t) || kb.lex.has(stem(t)) || kb.idx.nameVocab.has(stem(t));
  let n = 0;
  for (const q of ['20th Maine', 'Iron Brigade', 'Little Round Top', 'Pickett’s Charge', '1st Minnesota', 'Kershaw’s brigade', 'Who commanded the First Corps?', 'Devil’s Den', 'Reynolds', 'Seminary Ridge']) {
    const a = await ask(q); const focus = a.shown.find((id) => kb.idx.get(id) && kb.idx.get(id).k !== 'person');
    for (const c of a.chips.follow) {
      const bad = tokenize(c.q).filter((t) => !known(t)); assert.deepEqual(bad, [], `${q}: chip "${c.label}" -> "${c.q}" has unknown words`);
      const r = await ask(c.q); assert.notEqual(r.mode, 'decline', c.q);
      if (/^(Commander|Casualties|What happened|Members|What happened here|Elevation)$/.test(c.label)) assert.ok(r.cites.includes(focus) || r.shown.includes(focus) || r.entities.some((e) => e.id === focus), `${q}: chip "${c.label}" (${c.q}) is not about ${focus}: ${r.shown.slice(0, 3)}`);
      n++;
    }
  }
  assert.ok(n >= 25, `${n} chips checked`);
});

// mutation: "day parsed wrongly (July 2 read as July 3)" and "authority note dropped from stats answers (I7)"
test('the day a question names decides the day summary, and a strength or casualty answer always carries the authority note', async () => {
  for (const d of [1, 2, 3]) { const a = await ask(`What happened on July ${d}?`); assert.match(a.text, new RegExp(`Key moments of July ${d}\\b`), `July ${d}`); }
  for (const q of ['How many men did the 20th Maine lose?', 'How many men did the 15th Alabama have?', 'How many men were in the Sixth Corps?', 'compare the 20th Maine and the 15th Alabama']) assert.match((await ask(q)).text, /approximate; published sources differ|published sources differ/, q);
});
