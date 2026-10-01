// regiment-phrasings.test.mjs - generator test: every plain regiment (370 in the data) in every way a reader writes its name must resolve to that regiment (first shown card, not a decline, not a clarify).
// Ground truth comes from the raw data files (lib/regiment-phrasings.mjs), never from the engine's index. The templates are the CLASS the verifiers probed one phrasing at a time (V-01 "24th Michigan Regiment",
// R-19 "the 24th regiment from Michigan"): ordinal words and numerals, spelled and numeric, every connector ("of", "from", "in", "out of", "for", "that came from"), the state first ("Michigan Regiment 24"),
// postal and period abbreviations ("6th Wis.", "6th WI", "IN 19th", "N.Y. 76th"), arm and rank words (Infantry, Volunteers, Vols., Regt., Vol. Inf.), punctuation, case, spacing, and the question forms around a name.
// Gate: >= 98% canonical resolution overall AND per template. The engine reaches 100% on every template today; the misses (if any appear later) are listed in the failure message and printed below, never hidden.
// Cavalry regiments are a second class (the arm word has to be honoured): 12 templates over the 46 simple cavalry designations.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture } from './lib/fixture.mjs';
import { plainRegiments, PHRASINGS, ordinal, cavalryRegiments, CAVALRY_PHRASINGS } from './lib/regiment-phrasings.mjs';

const { engine } = await fixture();
const regs = plainRegiments();
const cav = cavalryRegiments();
const FLOOR = 0.98;

test('the ground truth covers every plain regiment in the data (at least 345), at least 40 phrasing templates are generated, and the cavalry class is non-trivial', () => {
  assert.ok(regs.length >= 345, `only ${regs.length} plain regiments`);
  assert.ok(new Set(regs.map((r) => r.id)).size === regs.length);
  assert.ok(Object.keys(PHRASINGS).length >= 40, `only ${Object.keys(PHRASINGS).length} templates`);
  assert.ok(cav.length >= 40 && Object.keys(CAVALRY_PHRASINGS).length >= 10, `${cav.length} cavalry regiments, ${Object.keys(CAVALRY_PHRASINGS).length} templates`);
});

const resolves = async (r, q) => { const a = await engine.ask(q); return a.mode !== 'decline' && a.mode !== 'clarify' && a.shown[0] === r.id ? null : `${q} [${r.id}] -> ${a.mode}:${a.shown.slice(0, 2).join(',')}`; };
const perPhrasing = {}; const allMisses = [];
for (const [name, f] of Object.entries(PHRASINGS)) {
  test(`phrasing "${name}" resolves >= 98% of regiments to that regiment's own card`, async () => {
    let ok = 0; const bad = [];
    for (const r of regs) { const miss = await resolves(r, f(r)); if (miss === null) ok++; else bad.push(miss); }
    perPhrasing[name] = ok / regs.length; allMisses.push(...bad.map((m) => `${name}: ${m}`));
    assert.ok(ok / regs.length >= FLOOR, `${(100 * ok / regs.length).toFixed(1)}% (${ok}/${regs.length}); misses: ${bad.slice(0, 10).join(' | ')}`);
  });
}

test('overall canonical resolution over all phrasings x all regiments is >= 98% (the misses, if any, are listed)', () => {
  const v = Object.values(perPhrasing); assert.ok(v.length === Object.keys(PHRASINGS).length);
  const mean = v.reduce((a, b) => a + b, 0) / v.length;
  const n = Object.keys(PHRASINGS).length * regs.length;
  console.log(`# regiment phrasings: ${Object.keys(PHRASINGS).length} templates x ${regs.length} regiments = ${n} questions, ${(100 * mean).toFixed(2)}% resolved; misses (${allMisses.length}): ${allMisses.slice(0, 40).join(' | ') || 'none'}`);
  assert.ok(mean >= FLOOR, `mean ${(100 * mean).toFixed(2)}%; misses: ${allMisses.slice(0, 20).join(' | ')}`);
});

test('cavalry regiments: the arm word is honoured in every phrasing (>= 98% overall and per template)', async () => {
  let ok = 0, n = 0; const bad = []; const per = {};
  for (const [name, f] of Object.entries(CAVALRY_PHRASINGS)) {
    let k = 0;
    for (const r of cav) { const miss = await resolves(r, f(r)); n++; if (miss === null) { ok++; k++; } else bad.push(`${name}: ${miss}`); }
    per[name] = k / cav.length;
  }
  console.log(`# cavalry phrasings: ${Object.keys(CAVALRY_PHRASINGS).length} templates x ${cav.length} regiments, ${(100 * ok / n).toFixed(2)}% resolved; misses: ${bad.slice(0, 20).join(' | ') || 'none'}`);
  assert.ok(ok / n >= FLOOR, `${(100 * ok / n).toFixed(2)}%: ${bad.slice(0, 10).join(' | ')}`);
  for (const [name, p] of Object.entries(per)) assert.ok(p >= FLOOR, `${name}: ${(100 * p).toFixed(1)}%`);
});

test('the state roll-up still answers when the state stands alone (the fix must not lose it)', async () => {
  for (const q of ['how many Michigan regiments were there', 'Michigan regiments', 'list the Wisconsin regiments', 'how many Maine regiments fought at Gettysburg', 'what are the Wisconsin regiments', 'what were the Michigan regiments', 'what are the regiments from Michigan']) {
    const a = await engine.ask(q);
    assert.ok(/regiment records/.test(a.text), `${q}: ${a.text.slice(0, 90)}`);
  }
});

test('a regiment and a state in the same question: the regiment is the subject, the state is not a second roll-up request', async () => {
  const a = await engine.ask('How does the 24th Michigan compare with the other Michigan regiments?');
  assert.notEqual(a.mode, 'decline');
  assert.ok(a.shown.includes('U-24MI') || a.text.includes('24th Michigan'), a.text.slice(0, 120));
});

test('a state followed by a number that is not a regiment ordinal does not become a "no such regiment" refusal, and a day or a time is never read as a regiment', async () => {
  for (const q of ['Pennsylvania 1863', 'the 3 days in Pennsylvania', 'Texas 3', 'what happened on July 3 in Pennsylvania', 'what happened on day 4', 'what happened at 3 on July 2', 'in 19th century Indiana', 'what is the 3rd day in Virginia like']) {
    const a = await engine.ask(q);
    assert.ok(!/order of battle has no/.test(a.text), `${q}: ${a.text.slice(0, 100)}`);
    assert.ok(!/Which \d+(?:st|nd|rd|th) do you mean/.test(a.text), `${q}: ${a.text.slice(0, 100)}`);
  }
});

test('ordinal helper is right (guards the generator itself)', () => {
  assert.deepEqual([1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 101, 111, 112].map(ordinal), ['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd', '23rd', '101st', '111th', '112th']);
});
