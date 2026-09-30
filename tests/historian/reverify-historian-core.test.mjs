// reverify-historian-core.test.mjs - RE-VERIFIER tests for workstream historian-core (written by the re-verifier after the fix pass, not by the builder).
// Each test pins a defect that survives the fix pass (commits bb8db10 .. d26367c) and was reproduced with new inputs the fixer and the first verifier did not use.
// They are expected to FAIL against the code as committed at d26367c; every one has a passing control where that makes the failure unambiguous.
// Nothing here modifies the builder's code or data. Run: node --test tests/historian/reverify-historian-core.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openEngine } from './lib/adapters.mjs';
import { ROOT } from './lib/data.mjs';
import { loadSources, fetchAllowed } from '../../tools/historian/lib/sources.mjs';
import { createFetcher, RightsRefusal } from '../../tools/historian/ingest/fetch.mjs';

const { engine } = await openEngine();
const ask = (q, ctx) => engine.ask(q, ctx);
const OR27_CACHE = path.join(ROOT, 'tmp/historian-cache/f11f20ae12aa762c081bfa37941181caf600c8a5.body');

// ---- R-01 rights gate: the redirect hop check is weaker than the gate on the first request ---------------------------------------------------------------------
// gate() refuses an archive.org identifier that is not registered in docs/historian/sources.yaml; the hop check only runs fetchAllowed (ban list, refused identifiers).
test('R-01 a redirect from a registered archive.org identifier to an UNREGISTERED identifier is refused (every hop passes the same gate as the first request)', async () => {
  const reg = loadSources();
  const START = 'https://archive.org/download/warofrebellion271unit/warofrebellion271unit_djvu.txt';
  assert.equal(fetchAllowed(reg, START).ok, true, 'control: the start URL is registered and allowed');
  const H = (m) => ({ get: (k) => m[k.toLowerCase()] ?? null });
  const run = async (target) => {
    const seen = [];
    const fetchImpl = async (url) => { seen.push(url); return seen.length === 1 ? { status: 302, headers: H({ location: target }), arrayBuffer: async () => new ArrayBuffer(0) } : { status: 200, headers: H({}), arrayBuffer: async () => new TextEncoder().encode('body').buffer }; };
    const f = createFetcher({ cacheDir: fs.mkdtempSync(path.join(os.tmpdir(), 'rv-f-')), fetchImpl, sleepImpl: async () => {}, now: (() => { let t = 0; return () => (t += 1e6); })() });
    try { await f.get(START); return { fetched: seen }; } catch (e) { return { error: e }; }
  };
  const banned = await run('https://www.battlefields.org/learn/x'); assert.ok(banned.error instanceof RightsRefusal, 'control: a banned host on a hop is refused');
  const unreg = await run('https://archive.org/download/someunregisteredbook99/x_djvu.txt');
  assert.ok(unreg.error instanceof RightsRefusal, `the fetcher followed a redirect to an unregistered identifier: ${JSON.stringify(unreg.fetched)}`);
});

// ---- R-02 / R-03 OR27: the head counter and the table-debris drop -----------------------------------------------------------------------------------------------
test('R-02 no kept OR27 passage carries a running head or signature mark once OCR variants are allowed for (report: "0 of 1,465"; found: 11)', async () => {
  if (!fs.existsSync(OR27_CACHE)) return;
  const { ingestOr27 } = await import('../../tools/historian/ingest/or27.mjs');
  const r = ingestOr27(fs.readFileSync(OR27_CACHE, 'utf8'), { repair: true });
  // the same three kinds of head as the verifier's V-11 (chapter head, running title, volume signature) with the OCR spellings actually present in the text:
  // "HAP. XXXIX.]", "Chap. iXXIX.]", "THE GETTYSBURG- CAMPAIGN.", "GETTYSBURG! CAMPAIGN", "VOL XXVII, FT I", "VOL XXVII, RX I", "VOL XXVPI, PT I"
  const re = /GETTYSBURG\W{0,3}\s*CAMPAIGN|\bH?AP\.?\s*X{1,3}[IlLX]{0,2}\.?\]|V[O0]L\.?\s*XXV[IPl]{1,3},?\s*[A-Z]{1,2}\s*[IlJ1]\b/;
  const dirty = r.passages.filter((p) => re.test(p.text));
  assert.equal(r.report.running_heads_left, 0, 'control: the report says none are left');
  assert.equal(dirty.length, 0, `${dirty.length} of ${r.passages.length} kept passages still carry a head or signature mark: ${dirty.slice(0, 4).map((p) => p.id).join(', ')}`);
});

test('R-03 the table-debris drop does not discard report narrative (27 of the 48 dropped chunks hold whole paragraphs of prose, about 2,500 words, e.g. the 143rd Pennsylvania "went into action July 1 with 465 men")', async () => {
  if (!fs.existsSync(OR27_CACHE)) return;
  const m = await import('../../tools/historian/ingest/or27.mjs');
  const norm = m.normalizeOcr(fs.readFileSync(OR27_CACHE, 'utf8'), { repair: true });
  const seg = m.segmentReports(norm, m.parseToc(norm.text));
  const pageAt = (off) => { let p = null; for (const x of norm.pages) { if (x.offset <= off) p = x.page; else break; } return p; };
  const dropped = seg.docs.flatMap((d) => m.chunkDocument(d, { pageAt })).filter((p) => m.isTableDebris(p.text));
  assert.ok(dropped.length > 0, 'control: the drop is active');
  const prose = (p) => p.text.split(/\n{2,}/).map((x) => x.trim()).filter((x) => x.length >= 60).join(' ').split(/\s+/).filter(Boolean).length;
  const lost = dropped.map((p) => [p.id, prose(p)]).filter(([, n]) => n >= 100);
  assert.deepEqual(lost, [], `chunks dropped as "table debris" that still hold 100 or more words of narrative: ${JSON.stringify(lost)} (strip the table cells, keep the prose)`);
});

// ---- R-04 / R-05 / R-06 clock-of-day questions: the clock is ignored or misread in forms the fixer's probes did not use ----------------------------------------------
test('R-04 "what happened at 3 on July 2" (no am/pm) is clarified like "3:00" and "3 o\'clock" are, not answered with a day summary that ignores the hour', async () => {
  assert.equal((await ask('what happened at 3:00 on July 2')).mode, 'clarify', 'control: with a colon the missing am/pm is asked');
  assert.equal((await ask("what happened at 3 o'clock on July 2")).mode, 'clarify', 'control: with o\'clock too');
  const bad = [];
  for (const q of ['what happened at 3 on July 2', 'what happened at 8 on July 2', 'what was going on at 5 on July 3']) { const a = await ask(q); if (a.mode !== 'clarify') bad.push(`${q}: ${a.mode}/${a.intent}`); }
  assert.deepEqual(bad, [], 'the hour is dropped and the same unqualified day summary is printed for 3 and 8 (the original V-02 defect, in a form the parser does not read)');
});

test('R-05 an impossible clock ("13pm", "25:00") or a military time ("0300") is not silently answered with a day summary', async () => {
  const bad = [];
  for (const q of ['what happened at 13pm on July 2', 'what happened at 25:00 on July 2', 'what happened at 0300 on July 2', 'what happened at 15:75 on July 2']) { const a = await ask(q); if (a.intent === 'day-summary' && a.mode === 'answer') bad.push(q); }
  assert.deepEqual(bad, [], 'each of these names a time of day that is ignored without a word (clarify, or say the time could not be read)');
});

test('R-06 "before 4 pm" / "by 4 pm" on July 2 does not list events after 4:00 PM as if they answered it', async () => {
  const after = [];
  for (const q of ['what happened before 4 pm on July 2', 'what happened by 4 pm on July 2', 'what happened before 5 pm on July 3']) {
    const a = await ask(q); const limit = (+q.match(/(\d) pm/)[1] + 12) * 60;           // minutes after midnight of the asked day
    for (const b of a.blocks.filter((x) => x.t === 'list')) for (const it of b.items) {
      const t = it.txt.match(/^about (\d{1,2}):(\d\d) (AM|PM)(?! on )/); if (!t) continue;     // entries of another date carry "on July N" and are skipped
      const mm = ((+t[1]) % 12 + (t[3] === 'PM' ? 12 : 0)) * 60 + +t[2]; if (mm > limit) after.push(`${q}: ${t[0]}`);
    }
  }
  assert.deepEqual(after, [], 'a "before" question is answered as "around" and lists later entries');
});

test('R-07 a named event is not a clock question: "What was the noon lull?" is answered, not met with "Which day do you mean?"', async () => {
  const a = await ask('What was the noon lull?');
  assert.notEqual(a.mode, 'clarify', a.text);
});

// ---- R-08 known unknowns: the consumers are triggered by a narrow pattern, so natural variants get an unrelated confident answer ------------------------------------------
test('R-08 weather questions in other natural phrasings state the limitation and never answer with a person or a battery that shares a word', async () => {
  assert.match((await ask('What was the weather on July 2, 1863?')).text, /weather series/, 'control');
  const bad = [];
  for (const q of ['Was there rain after the battle?', 'Did it rain the day Lee retreated?', 'weather on the second day', 'what was the heat like during Pickett\'s Charge', 'was there a thunderstorm after the battle']) {
    const a = await ask(q); if (!/weather|rain|record|cannot/i.test(a.text.split('\n')[0]) || /Raine|Cullen Battle/.test(a.text)) bad.push(`${q} -> ${a.mode}: ${a.text.slice(0, 70).replace(/\n/g, ' ')}`);
  }
  assert.deepEqual(bad, []);
});

test('R-09 individual-soldier questions in other phrasings state that the site holds regiments, not people (the rule fires only for "Was <Name> of the <unit> at Gettysburg")', async () => {
  assert.equal((await ask('Was John Smith of the 20th Maine at Gettysburg?')).limited, true, 'control');
  const bad = [];
  for (const q of ['What did Private John Smith of the 20th Maine do?', 'Did Corporal Jones of the 1st Minnesota survive?', 'Tell me about Private John Smith, 20th Maine']) {
    const a = await ask(q); if (!a.limited && !/muster|individual|specific soldier|cannot tell|not .* (hold|have)/i.test(a.text)) bad.push(`${q} -> ${a.shown.slice(0, 2)} (unit card, no limit)`);
  }
  assert.deepEqual(bad, []);
});

// ---- R-10 reader-visible slips --------------------------------------------------------------------------------------------------------------------------------
test('R-10 the page never says "Showing results for" a word the reader did not mistype: list -> last, midnight -> mid night, thunderstorm -> thunder storm', async () => {
  const bad = [];
  for (const q of ['list the Wisconsin regiments', 'what happened at midnight on July 2', 'was there a thunderstorm after the battle']) { const a = await ask(q); if ((a.did_you_mean || []).length) bad.push(`${q}: ${JSON.stringify(a.did_you_mean)}`); }
  assert.deepEqual(bad, [], 'each of these words is correct as typed');
});

test('R-11 "what are / were the <State> regiments" is the state roll-up (as "list the Wisconsin regiments" is), not one arbitrary regiment', async () => {
  assert.match((await ask('list the Wisconsin regiments')).text, /6 Union Wisconsin regiment/, 'control');
  const bad = [];
  for (const q of ['what are the Wisconsin regiments', 'what were the Michigan regiments', 'what are the regiments from Michigan']) { const a = await ask(q); if (!/regiment records/.test(a.text)) bad.push(`${q} -> ${a.shown.slice(0, 1)}`); }
  assert.deepEqual(bad, [], 'a single regiment card answers a question about all of them');
});

test('R-12 a regiment with no casualties is described in a grammatical sentence ("with no casualties are recorded for it")', async () => {
  const a = await ask('5th Wisconsin');
  assert.ok(!/with no casualties are recorded/.test(a.text), a.text.slice(0, 200));
});

// ---- R-13 engine.ask never throws (V-10 claim): hostile caller objects ------------------------------------------------------------------------------------------------
test('R-13 engine.ask does not throw on a context object whose getter throws (low severity: not reachable from the page, which passes plain data)', async () => {
  const bad = [];
  for (const [name, ctx] of [['throwing getter', { get onsite() { throw new Error('boom'); } }], ['throwing proxy', new Proxy({}, { get() { throw new Error('boom'); }, ownKeys() { throw new Error('boom'); }, has() { throw new Error('boom'); } })]]) {
    try { await ask('20th Maine', ctx); } catch (e) { bad.push(`${name}: ${e.message}`); }
  }
  assert.deepEqual(bad, []);
});

test('R-14 a correctly spelled ordinary word in a plain question is not "corrected" on the page (the golden set itself shows "fraction" -> "action", "percentage" -> "percent age", "newspapers" -> "news papers", "really" -> "rally")', async () => {
  const G = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/plan/data/hist-golden-set.json'), 'utf8'));
  const fine = new Set(['fraction', 'percentage', 'newspapers', 'really', 'world', 'list', 'midnight', 'thunderstorm', 'france']);
  const bad = [];
  for (const q of G.questions) { const a = await ask(q.question, q.context ? { onsite: q.context } : {}); for (const d of a.did_you_mean || []) if (fine.has(String(d.from).toLowerCase())) bad.push(`${q.id} "${d.from}" -> "${d.to}" (${a.mode})`); }
  assert.deepEqual(bad, [], 'the reader is shown "Showing results for / Reading ... as ..." for words that were right');
});

test('R-15 a question about the whole battle by its dates ("July 1 to 3", "July 1 through July 3", "July 1-3") is answered, not declined (before the day-parsing fix it was silently answered as day 1)', async () => {
  assert.notEqual((await ask('summarize the battle of July 1-3, 1863')).mode, 'decline', 'control: this phrasing is answered');
  const bad = [];
  for (const q of ['what happened on July 1 to 3', 'what happened from July 1 through July 3', 'Give me an overview of July 1-3', 'what happened on July 1-3']) { const a = await ask(q); if (a.mode === 'decline') bad.push(q); }
  assert.deepEqual(bad, [], 'an in-scope question is refused');
});

test('R-16 "what happened on day 4" is about a day, not "Which 4th do you mean? The site has 6 such regiments"', async () => {
  const a = await ask('what happened on day 4');
  assert.ok(!/Which 4th do you mean/.test(a.text), a.text);
});

// ---- test gap found by mutation (passes today; a mutant of the gate that decodes only ONCE survived the whole committed suite) --------------------------------------------------
test('R-17 the fetch gate decodes percent-escapes twice: a refused identifier and a banned host survive double encoding (mutation: safeDecode applied once -> the committed suite still passed)', () => {
  const reg = loadSources();
  const twice = (s) => encodeURIComponent(encodeURIComponent(s));
  const refused = ['https://archive.org/download/warrebellionaco%2530%2530cowlgoog/x', 'https://archive.org/download/%2577arrebellionaco00cowlgoog/x', `https://archive.org/download/${twice('warrebellionaco00cowlgoog')}/x`];
  const banned = [`https://web.archive.org/web/2020/${twice('https://battlefields.org/x')}`, `https://example.org/?u=${twice('https://www.findagrave.com/memorial/1')}`, `https://example.org/?u=${twice('https://www.fold3.com/y')}`];
  for (const u of [...refused, ...banned]) assert.equal(fetchAllowed(reg, u).ok, false, u);
  for (const u of ['https://archive.org/download/warofrebellion271unit/x', `https://example.org/?u=${twice('https://www.loc.gov/item/2003666161/')}`]) assert.equal(fetchAllowed(reg, u).ok, true, u);
});

test('R-18 invisible formatting characters inside a pasted name (zero-width space / joiner, soft hyphen, word joiner) are ignored, not read as a word break ("20th Ma<ZWSP>ine" is the 20th Massachusetts)', async () => {
  const want = (await ask('20th Maine')).shown[0]; assert.equal(want, 'U-20ME', 'control');
  const bad = [];
  for (const [name, ch] of [['zero-width space', '​'], ['zero-width non-joiner', '‌'], ['zero-width joiner', '‍'], ['soft hyphen', '­'], ['word joiner', '⁠']]) {
    const a = await ask(`20th Ma${ch}ine`); if (a.shown[0] !== want) bad.push(`${name}: ${a.shown[0]}`);
  }
  assert.deepEqual(bad, [], 'a different regiment is answered, silently');
  assert.equal((await ask('Gettys­burg')).mode === 'decline', (await ask('Gettysburg')).mode === 'decline', 'a soft hyphen in "Gettysburg" changes whether the question is understood');
});

// ---- V-01 is fixed for the phrasings the fixer generated, not for the class: "<N> regiment from / in / out of <State>" is the state roll-up for 89% of regiments --------------------------
import { plainRegiments, ordinal } from './lib/regiment-phrasings.mjs';
import { load } from './lib/data.mjs';

test('R-19 "the <N> regiment from / in <State>" is that regiment (verifier V-01 class; the fixer\'s 24 phrasings cover "of", "," and a suffix but not "from" / "in": 327 of 370 regiments return the state roll-up)', async () => {
  assert.equal((await ask('the 24th regiment of Michigan')).shown[0], 'U-24MI', 'control: "of" works');
  const regs = plainRegiments(); const tally = {}; const bad = [];
  for (const prep of ['from', 'in']) {
    let ok = 0;
    for (const r of regs) { const q = `the ${ordinal(r.n)} regiment ${prep} ${r.state}`; const a = await ask(q); if (a.mode !== 'decline' && a.shown[0] === r.id) ok++; else if (bad.length < 4) bad.push(`${q} -> ${/regiment records/.test(a.text) ? 'state roll-up' : a.shown.slice(0, 2)}`); }
    tally[prep] = ok / regs.length;
  }
  for (const [prep, rate] of Object.entries(tally)) assert.ok(rate >= 0.97, `"the <N> regiment ${prep} <State>": ${(100 * rate).toFixed(1)}% resolve to the regiment (floor 97%, the fixer's own); e.g. ${bad.join(' | ')}`);
});

test('R-20 a state-scoped superlative ("which Michigan regiment lost the most men", "the largest Wisconsin regiment") answers for that state, not for the whole army', async () => {
  const d = load(); const top = (st, k) => d.regs.filter((r) => r.state === st && !r.alias_for).sort((a, b) => b[k] - a[k])[0].regiment_id;
  assert.equal(top('Michigan', 'casualties'), 'U-24MI', 'ground truth from the raw data');
  const bad = [];
  for (const [q, want] of [['which Michigan regiment lost the most men?', top('Michigan', 'casualties')], ['what was the largest Wisconsin regiment', top('Wisconsin', 'strength')], ['which Maine regiment had the most casualties?', top('Maine', 'casualties')]]) {
    const a = await ask(q); if (a.shown[0] !== want) bad.push(`${q} -> ${a.shown[0]} (want ${want})`);
  }
  assert.deepEqual(bad, [], 'the state in the question is dropped and the army-wide leader is printed as the answer');
});
