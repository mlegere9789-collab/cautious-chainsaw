// regiment-phrasings.test.mjs - generator test: every plain regiment (370 in the data) in 24 ways a reader writes its name must resolve to that regiment (first shown card, not a decline).
// Ground truth comes from the raw data files (lib/regiment-phrasings.mjs), never from the engine's index. Gate: >= 97% per phrasing AND overall (the engine reaches 100% today; the slack is for future data).
// This is the structural answer to verifier defect V-01 ("24th Michigan Regiment" read as a roll-up of Michigan): one hand-picked example was fixed by the verifier's test; this file pins the class.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture } from './lib/fixture.mjs';
import { plainRegiments, PHRASINGS, ordinal } from './lib/regiment-phrasings.mjs';

const { engine } = await fixture();
const regs = plainRegiments();

test('the ground truth covers every plain regiment in the data (at least 345)', () => {
  assert.ok(regs.length >= 345, `only ${regs.length} plain regiments`);
  assert.ok(new Set(regs.map((r) => r.id)).size === regs.length);
});

const perPhrasing = {};
for (const [name, f] of Object.entries(PHRASINGS)) {
  test(`phrasing "${name}" resolves >= 97% of regiments to that regiment's own card`, async () => {
    let ok = 0; const bad = [];
    for (const r of regs) {
      const q = f(r); const a = await engine.ask(q);
      if (a.mode !== 'decline' && a.mode !== 'clarify' && a.shown[0] === r.id) ok++; else bad.push(`${q} [${r.id}] -> ${a.mode}:${a.shown.slice(0, 2).join(',')}`);
    }
    perPhrasing[name] = ok / regs.length;
    assert.ok(ok / regs.length >= 0.97, `${(100 * ok / regs.length).toFixed(1)}% (${ok}/${regs.length}); first misses: ${bad.slice(0, 5).join(' | ')}`);
  });
}

test('overall canonical resolution over all phrasings x all regiments is >= 97%', () => {
  const v = Object.values(perPhrasing); assert.ok(v.length === Object.keys(PHRASINGS).length);
  const mean = v.reduce((a, b) => a + b, 0) / v.length;
  assert.ok(mean >= 0.97, `mean ${(100 * mean).toFixed(2)}%`);
});

test('the state roll-up still answers when the state stands alone (the fix must not lose it)', async () => {
  for (const q of ['how many Michigan regiments were there', 'Michigan regiments', 'list the Wisconsin regiments', 'how many Maine regiments fought at Gettysburg']) {
    const a = await engine.ask(q);
    assert.ok(/regiment records/.test(a.text), `${q}: ${a.text.slice(0, 90)}`);
  }
});

test('a regiment and a state in the same question: the regiment is the subject, the state is not a second roll-up request', async () => {
  const a = await engine.ask('How does the 24th Michigan compare with the other Michigan regiments?');
  assert.notEqual(a.mode, 'decline');
  assert.ok(a.shown.includes('U-24MI') || a.text.includes('24th Michigan'), a.text.slice(0, 120));
});

test('a state followed by a number that is not a regiment ordinal does not become a "no such regiment" refusal', async () => {
  for (const q of ['Pennsylvania 1863', 'the 3 days in Pennsylvania', 'Texas 3']) {
    const a = await engine.ask(q);
    assert.ok(!/order of battle has no/.test(a.text), `${q}: ${a.text.slice(0, 100)}`);
  }
});

test('ordinal helper is right (guards the generator itself)', () => {
  assert.deepEqual([1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 101, 111, 112].map(ordinal), ['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd', '23rd', '101st', '111th', '112th']);
});
