// atime.test.mjs - clock-of-day questions ("what was going on at noon on July 3") are answered from the time model's clock, not from a day summary (verifier defect V-02).
//   * the reader of the question: parseClock over many phrasings (points, ranges, parts of the day, 24-hour, ambiguous am/pm, July dates)
//   * the answer: only events near the asked time, each with its own approximate time; earlier and later entries excluded and said to be; the clock said to be a proposal
//   * the baked clock equals the live time model (a stale hx fails here), and no clock question ever prints a tick, "site clock" or one of the known-wrong legacy labels
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fixture } from './lib/fixture.mjs';
import { ROOT } from './lib/data.mjs';
import { openEngine } from './lib/adapters.mjs';
import { parseClock, julyDate, hm12 } from '../../historian-src/core/clock.js';
import { loadTimeModel } from '../../tools/historian/lib/clock.mjs';
import { lintAnswer } from '../../historian-src/core/lint.js';

const F = await fixture();
const { engine, kb } = F;
const ask = (q, ctx) => engine.ask(q, ctx);
const CK = kb.facts.clock;
const idsOf = (a) => a.blocks.filter((b) => b.t === 'list').flatMap((b) => b.items.map((i) => i.ent));

// ---------------------------------------------------------------------------------------------------------------------------------------------
test('parseClock: clock points in every common phrasing', () => {
  const cases = [['3pm on July 2', 900, 2], ['at 3 p.m. on July 2', 900, 2], ['3:30 PM July 3', 930, 3], ['at 3.30 pm on July 3', 930, 3], ['12 pm on July 3', 720, 3], ['12 am on July 3', 0, 3], ['noon on July 3', 720, 3], ['at midday on the third day', 720, 3],
    ['15:30 on July 2', 930, 2], ['1500 hours on July 2', 900, 2], ['at 8 pm on July 2', 1200, 2], ['4:30 pm on the 3rd of July', 990, 3], ['July 1 at 10:15 am', 615, 1], ['8 in the morning on July 1', 480, 1], ['3 o\'clock in the afternoon on July 2', 900, 2], ['on day two at 6pm', 1080, 2]];
  for (const [q, mod, date] of cases) { const c = parseClock(q); assert.ok(c && c.kind === 'point', q); assert.equal(c.mod, mod, q); assert.equal(c.date, date, q); }
  assert.equal(parseClock('midnight on July 2').mod, 1440);
});

test('parseClock: parts of the day and ranges', () => {
  const morning = parseClock('the morning of July 1'); assert.equal(morning.kind, 'window'); assert.equal(morning.phase, 'morning'); assert.equal(morning.date, 1); assert.ok(morning.from < 480 && morning.to === 720);
  assert.equal(parseClock('the afternoon of July 2').phase, 'afternoon');
  assert.equal(parseClock('late afternoon on July 3').phase, 'late afternoon');
  assert.equal(parseClock('at dusk on July 2').phase, 'dusk'); assert.equal(parseClock('at sunset on July 2').phase, 'dusk'); assert.equal(parseClock('at first light on July 2').phase, 'dawn');
  const r = parseClock('between 2 and 4 pm on July 3'); assert.deepEqual([r.kind, r.from, r.to, r.date], ['window', 840, 960, 3]);
  const r2 = parseClock('from 10:30 am to 1 pm on July 1'); assert.deepEqual([r2.from, r2.to], [630, 780]);
  const r3 = parseClock('between 11 and 1 pm on July 3'); assert.deepEqual([r3.from, r3.to], [660, 780], 'the first hour takes the other meridiem when it would be later than the second');
});

test('parseClock: ambiguous am/pm is flagged, a part of the day settles it, and a question without a clock is not a clock question', () => {
  assert.equal(parseClock('at 3 o\'clock on July 2').ambiguous, 'meridiem');
  assert.equal(parseClock('3:30 on July 2').ambiguous, 'meridiem');
  assert.equal(parseClock('3:30 in the afternoon on July 2').mod, 930);
  for (const q of ['What time did Pickett\'s Charge begin?', 'Who commanded the 20th Maine?', 'How many men did the 1st Minnesota lose?', 'What happened on July 2?', 'the 24th Michigan', 'In 1863 the army marched 35 miles', 'I am 5 feet tall']) assert.equal(parseClock(q), null, q);
});

test('julyDate reads the calendar date: July 10 is 10 (never 1), the third day is 3, and words work', () => {
  const cases = [['What happened on July 10?', 10], ['July 3rd', 3], ['the 3rd of July', 3], ['on July 1, 1863', 1], ['July 31', 31], ['the second day', 2], ['day 3', 3], ['Day Two', 2], ['on the first day', 1], ['the battle of Gettysburg', null], ['July', null], ['20th Maine on July 2nd', 2]];
  for (const [q, d] of cases) assert.equal(julyDate(q), d, q);
});

test('hm12 prints the model\'s 5-minute rounding', () => {
  assert.equal(hm12(900), '3:00 PM'); assert.equal(hm12(720), '12:00 PM'); assert.equal(hm12(0), '12:00 AM'); assert.equal(hm12(1440), '12:00 AM'); assert.equal(hm12(2), '12:00 AM'); assert.equal(hm12(543), '9:05 AM'); assert.equal(hm12(1439), '12:00 AM');
});

// ---------------------------------------------------------------------------------------------------------------------------------------------
test('the baked clock is the live time model\'s clock for every chronology event (a stale build fails here: rebuild after any change to src/lib/time or data-src/time)', () => {
  const { model, sha256 } = loadTimeModel();
  assert.ok(CK && CK.ev, 'facts.clock is missing');
  assert.equal(CK.model.sha256, sha256.slice(0, 16), 'the anchors file changed since this build');
  let n = 0;
  for (const r of kb.idx.R) {
    if (r.k !== 'chronology') continue;
    const c = model.tickToClock(r.attrs.tick); const e = CK.ev[r.id];
    assert.ok(e, `no clock for ${r.id}`);
    assert.equal(e[0], Math.round(c.minutes), r.id); assert.equal(e[1], Math.round(c.sigmaMin), r.id); n++;
  }
  assert.ok(n >= 130, `only ${n} chronology events`);
  assert.equal(CK.model.signed, false, 'the anchors are a proposal; if they were signed the wording of the basis note must be reviewed');
});

test('the committed hx (what the page loads) carries the same clock as a fresh build', async () => {
  const { kb: committed } = await openEngine();
  assert.deepEqual(committed.facts.clock, CK, 'historian-src/dist/hx is stale: run node tools/historian/build.mjs');
  assert.deepEqual(committed.manifest.time_model, CK.model);
});

// ---------------------------------------------------------------------------------------------------------------------------------------------
test('the nine golden clock questions: no forbidden event, every answer carries the event times and says the clock is approximate', async () => {
  const G = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/plan/data/hist-golden-set.json'), 'utf8'));
  const bad = []; let n = 0;
  for (const q of G.questions.filter((x) => x.data_status === 'requires_time_model')) {
    const a = await ask(q.question, q.context ? { onsite: q.context } : {}); n++;
    for (const r of q.must_not_match || []) if (new RegExp(r, 'i').test(a.text)) bad.push(`${q.id} matches forbidden ${r}`);
    if (!/approximate|about|around/i.test(a.text)) bad.push(`${q.id}: not qualified as approximate`);
    if (q.category === 'temporal_at_time') { assert.equal(a.intent, 'at-time', q.id); if (!/proposed revised timeline/.test(a.text)) bad.push(`${q.id}: does not say the clock is a proposal`); }
  }
  assert.equal(n, 9); assert.deepEqual(bad, []);
});

test('3 pm and 8 pm on July 2 are different answers, each about its own time; noon on July 3 is before the cannonade', async () => {
  const a3 = await ask('What was happening at 3pm on July 2?'), a8 = await ask('What was happening at 8 pm on July 2?');
  assert.notEqual(a3.text, a8.text);
  assert.ok(idsOf(a3).includes('D2T252') && !idsOf(a3).includes('D2T326'), idsOf(a3).join());
  assert.ok(idsOf(a8).includes('D2T326') && !idsOf(a8).includes('D2T252'), idsOf(a8).join());
  const noon = await ask('What was going on at noon on July 3?');
  assert.ok(!idsOf(noon).includes('D3T518'), 'the cannonade began later, about 1 pm'); assert.match(noon.text, /Later entries are left out because they had not happened yet; the next is “The Cannonade Begins”/);
  assert.match(noon.text, /Earlier entries are left out/);
});

test('property: for a clock time every quarter hour of the three days, every listed event lies in the window around it, later events are only ever named as excluded, and the answer never prints a tick, "site clock" or a legacy label', async () => {
  let checked = 0; const bad = [];
  const modOf = (m) => m; const evOf = new Map(Object.entries(CK.ev));
  for (let date = 1; date <= 3; date++) for (let mod = 300; mod <= 1260; mod += 45) {
    const label = hm12(mod); const q = `What was happening at ${label} on July ${date}?`;
    const a = await ask(q); checked++;
    const T = (date - 1) * 1440 + mod;
    if (a.mode === 'clarify') { bad.push(`${q}: clarify`); continue; }
    if (a.intent !== 'at-time') { bad.push(`${q}: intent ${a.intent}`); continue; }
    for (const id of idsOf(a)) { const m = evOf.get(id)[0]; if (m < T - 60 || m > T + 45) bad.push(`${q}: ${id} at ${m - T} min`); }
    if (/site clock|\btick\b/i.test(a.text)) bad.push(`${q}: forbidden label`);
    if (!/proposed revised timeline/.test(a.text) && a.mode === 'answer') bad.push(`${q}: no basis note`);
    const lint = lintAnswer(kb, a); if (lint.length) bad.push(`${q}: lint ${JSON.stringify(lint[0])}`);
    const nx = a.text.match(/the next is “([^”]+)”/); if (idsOf(a).length && !nx && T < 2 * 1440 + 20 * 60) { /* a next entry exists before the end of July 3 evening */ }
  }
  assert.ok(checked >= 60);
  assert.deepEqual(bad, []);
});

test('a named unit narrows the answer: the 20th Maine at 4:30 pm gets its own brigade\'s entries, not the day', async () => {
  const a = await ask('Where was the 20th Maine at 4:30 pm on July 2?');
  const ids = idsOf(a);
  assert.ok(ids.includes('D2T267') && ids.includes('D2T268'), ids.join());
  assert.match(a.text, /Little Round Top/); assert.match(a.text, /Vincent/);
  assert.ok(!a.blocks.filter((b) => b.t === 'list').some((b) => b.items.some((i) => /bayonet charge/i.test(i.txt))), 'the bayonet charge is about 6 pm: it may be named as the next excluded entry, never listed');
  assert.match(a.text, /the next is “Chamberlain's Bayonet Charge” \(about 6:00 PM\)/);
  assert.match(a.text, /Entries that do not name it are not listed/);
});

test('a named place narrows the answer and says when the nearest entries are not at the asked time', async () => {
  const a = await ask('What was happening around the Wheatfield at 6pm on July 2?');
  assert.match(a.text, /has no entry near the Wheatfield at 6:00 PM on July 2; the nearest ones are these/);
  assert.ok(idsOf(a).every((id) => /Wheatfield|Rose Woods/i.test(kb.idx.get(id).attrs.location + kb.idx.get(id).attrs.text)));
});

test('a named commander: entries that name him or his units', async () => {
  const a = await ask('What was Longstreet doing at 4 pm on July 2?');
  assert.ok(idsOf(a).includes('D2T256'), idsOf(a).join());
});

test('a part of the day: the morning of July 1 lists the main events of the morning only, the excluded neighbours are named', async () => {
  const a = await ask('What happened on the morning of July 1?');
  assert.equal(a.intent, 'at-time');
  const ms = idsOf(a).map((id) => CK.ev[id][0]);
  assert.ok(ms.length >= 3 && ms.every((m) => m >= 240 && m <= 720), ms.join());
  assert.match(a.text, /main events/); assert.match(a.text, /Lesser entries inside that stretch are not listed/); assert.match(a.text, /Later entries are left out because they had not happened yet/);
  const night = await ask('what happened in the night of July 2'); assert.equal(night.intent, 'at-time'); assert.ok(idsOf(night).length >= 1);
  const dusk = await ask('what was going on at dusk on July 2'); assert.match(dusk.text, /^At dusk on July 2/);
});

test('a range: between 2 and 4 pm on July 3 lists the main events of those two hours', async () => {
  const a = await ask('What happened between 2 and 4 pm on July 3?');
  const ms = idsOf(a).map((id) => CK.ev[id][0] - 2 * 1440); assert.ok(ms.length >= 3 && ms.every((m) => m >= 840 && m <= 960), ms.join());
});

test('a moment with no entry says so and names the neighbours (3 am on July 2 is in the quiet of the night)', async () => {
  const a = await ask('what was happening at 2 am on July 2');
  assert.match(a.text, /no entry at 2:00 AM on July 2; the last entry before it is “[^”]+” \(about 8:00 PM on July 1\) and the next is/);
  assert.equal(a.mode, 'partial');
});

test('a clock without a day is not guessed: the answer asks which day, with one chip per day', async () => {
  const a = await ask('What was happening at 3pm?');
  assert.equal(a.mode, 'clarify'); assert.equal(a.decline_reason, 'clock-day'); assert.deepEqual(a.chips.follow.map((c) => c.label), ['July 1', 'July 2', 'July 3']);
  for (const c of a.chips.follow) { const r = await ask(c.q); assert.equal(r.intent, 'at-time', c.q); assert.notEqual(r.mode, 'clarify', c.q); }
});

test('a clock without am / pm is not guessed either', async () => {
  const a = await ask('What was happening at 3 o\'clock on July 2?');
  assert.equal(a.mode, 'clarify'); assert.equal(a.decline_reason, 'clock-meridiem'); assert.deepEqual(a.chips.follow.map((c) => c.label), ['3 AM', '3 PM']);
  for (const c of a.chips.follow) assert.equal((await ask(c.q)).intent, 'at-time');
});

test('a date outside the battle is an honest limitation, not a summary of another day', async () => {
  const a = await ask('What was happening at 3pm on July 4?');
  assert.equal(a.mode, 'partial'); assert.match(a.text, /covers July 1 to 3, 1863, so it has no entry for July 4/);
  assert.ok(!(await ask('What happened on July 10?')).text.includes('Key moments of July 1'), '"July 10" is not July 1');
});

test('the map\'s "Ask about this" context supplies the day when the question gives only a clock', async () => {
  const a = await ask('What was happening at 4 pm here?', { onsite: { day: 3, tick: 556 } });
  assert.equal(a.intent, 'at-time'); assert.ok(idsOf(a).some((id) => CK.ev[id][0] > 2 * 1440));
});

test('a question that merely mentions a time is still a clock question, a question about something else is not', async () => {
  assert.equal((await ask('Did Pickett\'s Charge start at 3 pm on July 3?')).intent, 'at-time');
  assert.notEqual((await ask('Who commanded the 20th Maine at 4:30 pm on July 2?')).intent, 'at-time');
  assert.notEqual((await ask('How many men did the 1st Minnesota lose on the evening of July 2?')).intent, 'at-time');
  assert.notEqual((await ask('What time did Pickett\'s Charge begin?')).intent, 'at-time');
});

test('"what time did X begin" carries the model\'s time for X, approximate, with the range where the anchor is contested, and never a legacy label', async () => {
  const a = await ask('What time did Pickett\'s Charge begin?');
  assert.match(a.text, /places “Pickett's Charge Begins” on July 3 at about 3:00 PM \(sources put it between about 2:00 and 3:00 PM\)/);
  assert.match(a.blocks[0].runs.map((r) => r.txt).join(''), /about 3:00 PM/, 'the time is the first thing said, in the first bubble');
  assert.ok(a.blocks.some((b) => b.t === 'note' && b.code === 'time-basis' && /proposed revised timeline/.test(b.txt)));
  const b = await ask('When did Longstreet\'s assault on the Union left begin on July 2?'); assert.match(b.text, /about 4:00 PM/);
  assert.ok(!/11:05\s?am|11:15\s?am|12:15\s?pm/i.test(a.text + b.text));
});

test('I2 for clocks: every clock label in a lead, list or note is derived from a baked minute value', async () => {
  const allowed = new Set();
  for (const e of Object.values(CK.ev)) { const l = hm12(e[0] % 1440); allowed.add(l); const m = l.match(/^(\d+):(\d+) (AM|PM)$/); allowed.add(`${m[1]}:${m[2]}`); allowed.add(m[1]); allowed.add(m[2]); if (e[3]) for (const x of e[3].matchAll(/\d+(?::\d+)?/g)) allowed.add(x[0]); }
  for (let mod = 0; mod < 1440; mod += 5) { const l = hm12(mod).match(/^(\d+):(\d+)/); allowed.add(`${l[1]}:${l[2]}`); }             // the asked time is echoed back in the model's own rounding
  const bad = [];
  for (const q of ['What was happening at 3pm on July 2?', 'What was going on at noon on July 3?', 'What was happening at 4 pm on July 3?', 'What happened on the morning of July 1?', 'What time did Pickett\'s Charge begin?']) {
    const a = await ask(q);
    for (const b of a.blocks) {
      const t = b.t === 'lead' ? b.runs.map((r) => r.txt).join('') : b.t === 'list' ? b.items.map((i) => i.txt.split(': ')[0]).join(' ') : b.t === 'note' && /^clock-/.test(b.code) ? b.txt : '';
      for (const m of t.matchAll(/\b\d{1,2}(?::\d{2})?\b/g)) if (!allowed.has(m[0]) && !['1', '2', '3', '1863', '4'].includes(m[0])) bad.push(`${q}: ${m[0]} in "${t.slice(0, 60)}"`);
    }
  }
  assert.deepEqual(bad, []);
});
