// verify-historian-core.test.mjs - ADVERSARIAL VERIFIER tests for workstream historian-core (written by the verifier, not the builder).
// Every test here is expected to FAIL against the code as committed at e6e910a: each one pins a defect found while re-checking the builder's claims (see the verifier report).
// They pass a "control" first where that makes the failure unambiguous. Nothing in the builder's code or data is modified; the tests read the committed hx build and build into temp dirs.
// Run: node --test tests/historian/verify-historian-core.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openEngine, HX } from './lib/adapters.mjs';
import { ROOT } from './lib/data.mjs';
import { openKB, nodeFetcher } from '../../historian-src/core/kb.js';
import { createEngine } from '../../historian-src/core/engine.js';
import { build } from '../../tools/historian/build.mjs';
import { loadSources, fetchAllowed } from '../../tools/historian/lib/sources.mjs';
import { createFetcher, RightsRefusal } from '../../tools/historian/ingest/fetch.mjs';
import { scoreGolden } from './lib/score-golden.mjs';

const { engine, kb } = await openEngine();
const ask = (q, ctx) => engine.ask(q, ctx);

// ---------------------------------------------------------------------------------------------------------------------------------------------
// V-01  a natural phrasing of a unit name ("24th Michigan Regiment") silently answers a different question (state roll-up, wrong first card)
test('V-01 "<N>th <State> Regiment" is that regiment, not a roll-up of the state (control: the bare name works)', async () => {
  assert.equal((await ask('24th Michigan')).shown[0], 'U-24MI', 'control');
  const bad = [];
  for (const [q, id] of [['24th Michigan Regiment', 'U-24MI'], ['6th Wisconsin Regiment', 'U-6WI'], ['the 19th Indiana regiment', 'U-19IN'], ['24th Michigan Infantry Regiment', 'U-24MI'], ['19th Regiment, Indiana', 'U-19IN']]) {
    const a = await ask(q);
    if (a.shown[0] !== id) bad.push(`${q}: first card ${a.shown[0]} (${a.text.slice(0, 70).replace(/\n/g, ' ')}...)`);
  }
  assert.deepEqual(bad, [], 'about 87% of "<N> <State> Regiment" queries over all 345 plain regiments return a state roll-up (engine.js: lookup + stateMention + /regiments?/ runs rollupAnswer before the linked unit is used)');
});

// V-02  clock-of-day questions ignore the clock and print the same day summary (with later events) without saying the time is not handled
test('V-02 "what was going on at <clock> on July N" does not answer with events the golden set forbids, and says the clock is not handled', async () => {
  const G = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/plan/data/hist-golden-set.json'), 'utf8'));
  const bad = [];
  for (const q of G.questions.filter((x) => x.data_status === 'requires_time_model' && (x.must_not_match || []).length)) {
    const a = await ask(q.question, q.context ? { onsite: q.context } : {});
    const hit = q.must_not_match.filter((r) => new RegExp(r, 'i').test(a.text));
    if (hit.length) bad.push(`${q.id} "${q.question}" hits ${JSON.stringify(hit)}`);
  }
  const a3 = await ask('What was happening at 3pm on July 2?'), a8 = await ask('What happened at 8 pm on July 2?');
  if (a3.text === a8.text && !/clock|time is|times are|cannot|do not|not derive/i.test(a3.text)) bad.push('3pm and 8 pm on July 2 give the identical unqualified day summary');
  assert.deepEqual(bad, []);
});

// V-03  the compiled known-unknown "weather-at-battle" is dead data: no code reads it, so weather questions get an unrelated day summary
test('V-03 a question about the weather in July 1863 is answered as a known unknown (facts.unknowns has weather-at-battle; the engine never consumes it)', async () => {
  assert.ok(kb.facts.unknowns.some((u) => u.id === 'weather-at-battle'), 'control: the rule is compiled');
  const a = await ask('What was the weather on July 2, 1863?');
  assert.match(a.text, /weather/i, `answer never mentions weather: ${a.text.slice(0, 80)}`);
  assert.match(a.text, /(do not|does not|cannot|no weather|not include)/i);
});

// V-04  K001 claims "every whitelisted source field is populated"; it checks 11 fields, so renaming strength / casualties passes the build and answers go silently wrong
test('V-04 K001: renaming the regiments\' strength and casualties fields turns the build red', () => {
  const src = path.join(ROOT, 'legacy/dist/data'); const d = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'vk001-')), 'data'); fs.cpSync(src, d, { recursive: true });
  for (const f of ['union_regiments_i_ii_corps.json', 'union_regiments_iii_v_corps.json', 'union_regiments_vi_xi_xii_corps.json', 'confederate_regiments_first_corps.json', 'confederate_regiments_second_corps.json', 'confederate_regiments_third_corps.json']) {
    const p = path.join(d, 'oob', f); const j = JSON.parse(fs.readFileSync(p, 'utf8'));
    for (const r of j.regiments) { r.casualty_count = r.casualties; delete r.casualties; r.men = r.strength; delete r.strength; }
    fs.writeFileSync(p, JSON.stringify(j));
  }
  const r = build({ dataDir: d, outDir: path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'vk001o-')), 'hx'), dry: true });
  assert.equal(r.ok, false, 'the build passed with zero errors although every infantry regiment lost its strength and casualty figures');
});

// V-05  kb.passages() silently returns fewer passages than requested when the request spans more shards than the LRU holds (96 shards, default cache 64)
test('V-05 kb.passages returns every requested passage regardless of the cache size (the fixture hides this with cache: 512)', async () => {
  const k = await openKB(await nodeFetcher(HX));                        // default cache = 64 < 96 shards
  const nums = Array.from({ length: k.counts.passages }, (_, i) => i);
  const out = await k.passages(nums);
  assert.equal(out.size, nums.length, `returned ${out.size} of ${nums.length}`);
});

// V-06  the documented gate ("refuses banned hosts and refused identifiers before any network call") is bypassed by a trailing-dot host and by identifier case
test('V-06 fetchAllowed and the fetcher refuse a banned host with a trailing dot and a refused identifier in upper case', async () => {
  const reg = loadSources();
  assert.equal(fetchAllowed(reg, 'https://battlefields.org/x').ok, false, 'control');
  assert.equal(fetchAllowed(reg, 'https://battlefields.org./x').ok, false, 'trailing-dot FQDN of a Tier C host');
  assert.equal(fetchAllowed(reg, 'https://archive.org/download/WARREBELLIONACO00COWLGOOG/x_djvu.txt').ok, false, 'upper-case refused identifier (the 1971 reprint)');
  const calls = []; const f = createFetcher({ cacheDir: fs.mkdtempSync(path.join(os.tmpdir(), 'vgate-')), registry: reg, fetchImpl: async (u) => { calls.push(u); return { status: 200, headers: { get: () => null }, arrayBuffer: async () => Buffer.from('x') }; } });
  for (const u of ['https://battlefields.org./x', 'https://archive.org/download/WARREBELLIONACO00COWLGOOG/x_djvu.txt']) await assert.rejects(f.get(u, { allowUnregistered: true }), RightsRefusal, u);
  assert.deepEqual(calls, [], 'no network call may be made for a Tier C host or a refused identifier');
});

// V-07  typo repair of the state word of a unit name: the batteries have 22 typo queries (100%); a broader sample fails a quarter of single-edit typos with a decline
test('V-07 single-edit typos in a state name reach the right regiment (plan typo S@1 gate 88%)', async () => {
  const cases = [['104th New Yrk', 'U-104NY'], ['80th New ork', 'U-80NY'], ['111th Ne York', 'U-111NY'], ['12th New Jesey', 'U-12NJ'], ['7th Tenessee', 'C-7TN'], ['13th Nort Carolina', 'C-13NC'], ['20th Mane', 'U-20ME'], ['16th Maie', 'U-16ME'],
    ['15th Alabma', 'C-15AL'], ['2nd Wisconsn', 'U-2WI'], ['24th Micigan', 'U-24MI'], ['1st Minesota', 'U-1MN']];
  const ok = []; const bad = [];
  for (const [q, id] of cases) { const a = await ask(q); (a.shown[0] === id ? ok : bad).push(`${q} -> ${a.mode}:${a.shown[0] || '-'}`); }
  assert.ok(ok.length / cases.length >= 0.88, `${ok.length}/${cases.length} correct; failing: ${bad.join(' | ')} (over all 345 plain regiments x 3 edit kinds: 74% correct, 26% declined)`);
});

// V-08  "Showing results for X": X is a stem, not a word ("brigad", "tennesse", "barksdal")
test('V-08 the corrected word shown to the reader is a whole word', async () => {
  for (const [q, want] of [['Iron Brigde', 'brigade'], ['Barksdael', 'barksdale'], ['Tenessee', 'tennessee']]) {
    const a = await ask(q); const to = ((a.did_you_mean || [])[0] || {}).to;
    assert.equal(to, want, `${q}: the page prints “Showing results for ${to}”`);
  }
});

// V-09  quotes shown under a regiment lookup are about other units (319 of 457 regiments have no linked passage at all; the composer still appends quotes chosen by state-name overlap)
test('V-09 quotes shown under a regiment lookup are linked to that regiment (or name it)', async () => {
  const k = await openKB(await nodeFetcher(HX), { cache: 512 }); const eng = createEngine(k);
  const all = await k.passages(Array.from({ length: k.counts.passages }, (_, i) => i)); const byId = new Map([...all.values()].map((p) => [p.id, p]));
  const off = [];
  for (const q of ['19th Indiana', '24th Michigan', '76th New York', '13th Massachusetts', '121st Pennsylvania', '11th Pennsylvania', '80th New York']) {
    const r = k.idx.R.find((x) => x.label === q); assert.ok(r, q);
    const ep = await k.entityPassages([r.id]);
    const re = new RegExp('\\b' + r.ord + '(?:st|nd|rd|th)\\s+' + String(r.state).split(' ')[0], 'i');
    const a = await eng.ask(q);
    for (const b of a.blocks.filter((x) => x.t === 'quote')) { const p = byId.get(b.passage); if (!(ep.has(p.num) || p.rec === r.id || re.test(p.text))) off.push(`${q} <- “${b.text.slice(0, 60)}...” (${b.attrib.slice(0, 40)})`); }
  }
  assert.deepEqual(off, []);
});

// V-10  the engine throws on a malformed conversation context (a non-array lastEntities); the page only passes the engine's own ctx, so this is an API-robustness defect
test('V-10 engine.ask does not throw on a malformed conversation context', async () => {
  await assert.doesNotReject(() => ask('tell me more', { lastEntities: 'U-20ME' }));
});

// V-11  the report "running heads left: 0" uses a narrow line detector; 82 of 1,513 sample passages still carry running-head / signature-mark remnants
test('V-11 no OR27 passage carries a running head or signature mark ("[Chap. XXXIX.", "2 R R - VOL XXVII, PT I")', async () => {
  const cache = path.join(ROOT, 'tmp/historian-cache/f11f20ae12aa762c081bfa37941181caf600c8a5.body');
  if (!fs.existsSync(cache)) return;                                    // the cached 2 MB sample is git-ignored; skip when absent (same rule as the builder's own ingest test)
  const { ingestOr27 } = await import('../../tools/historian/ingest/or27.mjs');
  const r = ingestOr27(fs.readFileSync(cache, 'utf8'), { repair: true });
  const re = /Chap\W{1,3}\s*X{1,3}[IlL]?X?[\]jf1)|.,]|THE GETTYSBURG CAMPAIGN|VOL\.? XXVII, PT/i;
  const dirty = r.passages.filter((p) => re.test(p.text));
  assert.equal(dirty.length, 0, `${dirty.length} of ${r.passages.length} passages still carry running-head remnants (report claims 0 left)`);
});

// V-12  the H1+H2 gate of the plan is 123 items; the harness gates the 113-item answerable_now subset and labels it "H1+H2 subset"
test('V-12 golden H1+H2 pass rate on the plan\'s 123 items reaches the 85% gate (D.8: G-A1 "Golden-Core H1+H2 (123 items) pass >= 85%")', async () => {
  const G = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/plan/data/hist-golden-set.json'), 'utf8'));
  const { knownIds } = await import('./lib/adapters.mjs'); const validIds = await knownIds();
  const answers = new Map();
  for (const q of G.questions) {
    const a = await ask(q.question, q.context ? { onsite: q.context } : {});
    const behavior = a.mode === 'decline' ? 'decline' : a.mode === 'clarify' ? 'clarify' : a.route === 'ancestor' ? 'route' : 'answer';
    answers.set(q.id, { id: q.id, answer_text: a.text, raw_html: '', cited_ids: behavior === 'decline' ? [] : (a.cites || a.shown), retrieved_ids: (a.ranked || []).slice(0, 10), behavior });
  }
  const res = scoreGolden({ golden: G, answers, split: 'all', subset: 'all', gates: null, validIds });
  assert.equal(res.flat['phase<=H2.n'] ?? res.per_question.filter((r) => ['H1', 'H2'].includes(r.phase_ready)).length, 123);
  assert.ok(res.flat['phase<=H2.pass'] >= 0.85, `H1+H2 pass on 123 items = ${res.flat['phase<=H2.pass'].toFixed(3)} (the harness reports 0.867 by scoring only the 113 answerable_now items); critical recall ${res.flat['phase<=H2.crit_recall'].toFixed(3)} vs 0.93`);
});

// V-13 / V-14  chapter 14 A2: "controls >= 3" (WCAG 1.4.11 non-text contrast) and "secondary text >= 14 px"; the builder's contrast test covers text pairings only
const CSS = fs.readFileSync(path.join(ROOT, 'historian-src/page/historian.css'), 'utf8');
const lum = (hex) => { const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const tok = (n) => CSS.match(new RegExp(`--${n}:\\s*(#[0-9a-fA-F]{6})`))[1];
test('V-13 the question box and the chip buttons have a boundary of at least 3:1 against the page (WCAG 1.4.11; plan A2 "controls >= 3")', () => {
  const inputBorder = CSS.match(/#ask\s*\{[^}]*border:\s*1px solid\s*(#[0-9a-fA-F]{6})/)[1];
  const chipBorder = tok('line');                                       // .chip { border: 1px solid var(--line) }
  assert.match(CSS, /\.chip\s*\{[^}]*border:\s*1px solid var\(--line\)/);
  const bad = [`question box border ${inputBorder} on ${tok('bg')}: ${contrast(inputBorder, tok('bg')).toFixed(2)}:1`, `chip border ${chipBorder} on ${tok('bg')}: ${contrast(chipBorder, tok('bg')).toFixed(2)}:1`].filter((s) => parseFloat(s.split(': ')[1]) < 3);
  assert.deepEqual(bad, []);
});
test('V-14 secondary text is at least 14 px (plan A2: body >= 16, secondary >= 14, nothing < 12)', () => {
  const small = [...CSS.matchAll(/([^{}]+)\{[^}]*?font(?:-size)?:\s*(?:[0-9]+\s+)?(1[0-3])px/g)].map((m) => `${m[1].trim().split('\n').pop()} ${m[2]}px`).filter((s) => !/\.preview/.test(s));
  assert.deepEqual(small, [], 'figure captions, table headers, the Sources details and the footer are 13 px');
});

// V-15  eval.mjs gates "fact in top bubble" on the POOLED value of the three batteries (89%); each battery on its own misses the H2 threshold (primary 81.8%, held-out 84.6%)
test('V-15 fact-in-top-bubble reaches the H2 threshold (0.85) on the primary and the held-out battery separately, not only pooled', async () => {
  const { evaluate, summarize } = await import('./lib/relevance.mjs');
  const primary = (await import('./batteries/primary.mjs')).default, heldout = (await import('./batteries/heldout.mjs')).default;
  const G = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/historian/gates.json'), 'utf8')).batteries.H2;
  const sys = async (q) => { const a = await ask(q); return { ranked: a.ranked || a.shown, shown: a.mode === 'decline' ? [] : a.shown, bubbles: a.text.split('\n\n'), refused: a.mode === 'decline' || a.mode === 'clarify' || !!a.limited, mode: a.mode }; };
  const got = {};
  for (const [n, Q] of [['primary', primary], ['heldout', heldout]]) got[n] = summarize(await evaluate(sys, { queries: Q })).fact_hit_top_bubble;
  assert.ok(got.primary >= G.factTop && got.heldout >= G.factTop, `factTop primary ${got.primary.toFixed(3)}, held-out ${got.heldout.toFixed(3)}, threshold ${G.factTop}`);
});
