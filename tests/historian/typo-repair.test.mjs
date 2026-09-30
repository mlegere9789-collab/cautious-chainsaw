// typo-repair.test.mjs - generated single-edit typos against ground truth from the raw data files (verifier defects V-07 and V-08).
//   * state names after a regiment number: every plain regiment x deletion / transposition / substitution in the state word (plan gate: typo S@1 >= 88%)
//   * short commander surnames (4 to 6 letters), unique in the data: the same three edits
//   * the "Showing results for X" word is a whole word that occurs in the site's own names or text, never a stem ("brigad", "tennesse")
import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture } from './lib/fixture.mjs';
import { load } from './lib/data.mjs';
import { plainRegiments, ordinal } from './lib/regiment-phrasings.mjs';
import primary from './batteries/primary.mjs';
import heldout from './batteries/heldout.mjs';
import fresh from './batteries/fresh.mjs';

const { engine, kb, passages } = await fixture();
const KINDS = {
  deletion: (w, i) => w.slice(0, i) + w.slice(i + 1),
  transposition: (w, i) => w.slice(0, i) + w[i + 1] + w[i] + w.slice(i + 2),
  substitution: (w, i) => w.slice(0, i) + (w[i] === 'e' ? 'a' : 'e') + w.slice(i + 1),
};
// deterministic interior position (never the first or last letter: a reader rarely gets those wrong and the repair does not try to rescue them)
const pos = (seed, len) => 1 + (seed % Math.max(1, len - 3));

test('state-name typos after a regiment number reach the regiment (>= 95% of ~1,100 generated typos; decline and wrong card counted separately)', async () => {
  const regs = plainRegiments().filter((r) => r.state !== 'United States');
  const tally = { ok: 0, decline: 0, wrong: 0 }; const bad = [];
  for (const r of regs) {
    const words = r.state.split(' '); const last = words[words.length - 1];
    for (const [kind, f] of Object.entries(KINDS)) {
      const i = pos(r.id.length * 7 + last.length + r.n, last.length); if (i + 1 >= last.length) continue;
      const tw = f(last, i); if (tw === last) continue;
      const q = `${ordinal(r.n)} ${[...words.slice(0, -1), tw].join(' ')}`;
      const a = await engine.ask(q);
      if (a.mode !== 'decline' && a.shown[0] === r.id) tally.ok++;
      else { tally[a.mode === 'decline' ? 'decline' : 'wrong']++; if (bad.length < 8) bad.push(`${q} [${r.id}] -> ${a.mode}:${a.shown.slice(0, 2).join(',')}`); }
    }
  }
  const n = tally.ok + tally.decline + tally.wrong;
  assert.ok(n > 900, `only ${n} typos generated`);
  assert.ok(tally.ok / n >= 0.95, `${(100 * tally.ok / n).toFixed(1)}% correct (${JSON.stringify(tally)}); ${bad.join(' | ')}`);
  assert.ok(tally.wrong / n <= 0.02, `wrong-card rate ${(100 * tally.wrong / n).toFixed(1)}%: ${bad.join(' | ')}`);
});

test('first-word typos of a two-word state ("Ne York", "Nort Carolina", "Sout Carolina") and a missing space ("NewYork") are repaired', async () => {
  for (const [q, id] of [['104th Ne York', 'U-104NY'], ['13th Nort Carolina', 'C-13NC'], ['2nd Sout Carolina', 'C-2SC'], ['12th New Jersy', 'U-12NJ'], ['104th NewYork', 'U-104NY'], ['7th Wst Virginia', 'U-7WV'], ['20th Mane', 'U-20ME'], ['16th Maie', 'U-16ME']]) {
    const a = await engine.ask(q); assert.equal(a.shown[0], id, `${q} -> ${a.mode}:${a.shown.slice(0, 2)}`);
  }
});

test('a repair is never applied to a word that is ordinary English after a number ("the 3rd day", "the 2nd main line", "the 20th century")', async () => {
  for (const q of ['what happened on the 3rd day', 'the 2nd main line of defense', 'the 5th corps at Little Round Top']) {
    const a = await engine.ask(q);
    assert.ok(!(a.did_you_mean || []).some((d) => /^(new|north|south|west|maine|ohio|iowa|texas)/.test(d.to)), `${q}: ${JSON.stringify(a.did_you_mean)}`);
  }
});

test('commander surnames with one edit reach the officer (>= 85% of ~1,300 typos of 4 to 9 letter surnames; the "Miller" class, "Mller"); a typed token of three letters or fewer is not repaired, by design', async () => {
  const d = load(); const bySur = new Map();
  for (const r of d.regs) {
    if (!r.commander || !r.commander.name) continue;
    const s = r.commander.name.replace(/,?\s+(jr|sr)\.?$/i, '').split(/\s+/).pop();
    if (s.length < 4 || s.length > 9 || !/^[A-Z][a-z]+$/.test(s)) continue;
    (bySur.get(s) || bySur.set(s, new Set()).get(s)).add(r.regiment_id);
  }
  const tally = { ok: 0, decline: 0, other: 0 }; const bad = [];
  for (const [s, ids] of bySur) {
    if (ids.size > 3) continue;
    for (const [kind, f] of Object.entries(KINDS)) {
      const i = pos(s.length * 3 + s.charCodeAt(1), s.length); if (i + 1 >= s.length) continue;
      const tw = f(s, i); if (tw === s || bySur.has(tw) || tw.length < 4) continue;    // a typo that is another commander's real name is not a typo; three letters is below the repair floor
      const a = await engine.ask(tw);
      const ok = a.mode !== 'decline' && (a.shown.slice(0, 4).some((id) => ids.has(id)) || a.text.includes(s));
      if (ok) tally.ok++; else { tally[a.mode === 'decline' ? 'decline' : 'other']++; if (bad.length < 10) bad.push(`${tw} (${s}) -> ${a.mode}:${a.shown.slice(0, 2).join(',')}`); }
    }
  }
  const n = tally.ok + tally.decline + tally.other;
  assert.ok(n > 600, `only ${n} typos generated`);
  assert.ok(tally.ok / n >= 0.85, `${(100 * tally.ok / n).toFixed(1)}% of ${n} (${JSON.stringify(tally)}); ${bad.join(' | ')}`);
});

test('the word shown after "Showing results for" is a whole word (V-08): stems are never printed', async () => {
  for (const [q, want] of [['Iron Brigde', 'brigade'], ['Barksdael', 'barksdale'], ['Tenessee', 'tennessee'], ['Chamberlian', 'chamberlain'], ['Gettysberg', 'gettysburg']]) {
    const a = await engine.ask(q); const to = ((a.did_you_mean || [])[0] || {}).to;
    assert.equal(to, want, `${q}: "Showing results for ${to}"`);
  }
  // every correction shown for every battery query (typos and all) is a word the site itself uses
  const dict = new Set();
  const addWords = (s) => { for (const w of String(s || '').toLowerCase().replace(/[’']s\b/g, '').match(/[a-z]+/g) || []) dict.add(w); };
  for (const r of kb.idx.R) { addWords(r.title); addWords(r.label); for (const a of r.aliases || []) addWords(a); for (const p of r.people || []) addWords(p); addWords(r.place); }
  for (const p of passages.values()) addWords(p.text);
  const bad = [];
  for (const q of [...primary, ...heldout, ...fresh]) {
    const a = await engine.ask(q.q);
    for (const dm of a.did_you_mean || []) if (!String(dm.to).split(' ').every((w) => dict.has(w))) bad.push(`${q.q}: ${dm.from} -> ${dm.to}`);
  }
  assert.deepEqual(bad, []);
});
