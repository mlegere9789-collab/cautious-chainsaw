// classes.test.mjs - CLASS sweeps for the historian-core defects the re-verifier found one phrasing at a time (reverify-historian-core.test.mjs). Each test generates the whole space the defect lives in
// (every invisible character at every position, every hostile caller object, every way of writing a day / a clock time, every state and metric) and checks it against the raw data or a stated rule, so a fix
// that only covers the probed phrasings fails here.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture } from './lib/fixture.mjs';
import { load } from './lib/data.mjs';
import { readDays, julyDate, parseClock, hm12, DAY } from '../../historian-src/core/clock.js';
import { stripInvisible } from '../../historian-src/core/text.js';

const { engine, kb } = await fixture();
const ask = (q, c) => engine.ask(q, c);
const fp = (a) => JSON.stringify({ mode: a.mode, intent: a.intent, shown: a.shown, text: a.text, did: a.did_you_mean });

// ---- invisible formatting characters ---------------------------------------------------------------------------------------------------------------------------------------------------------
const INVISIBLE = [0xAD, 0x34F, 0x115F, 0x1160, 0x17B4, 0x17B5, 0x180B, 0x180C, 0x180D, 0x180E, 0x200B, 0x200C, 0x200D, 0x200E, 0x200F, 0x202A, 0x202B, 0x202C, 0x202D, 0x202E, 0x2060, 0x2061, 0x2062, 0x2063, 0x2064, 0x2066, 0x2067, 0x2068, 0x2069, 0x3164, 0xFE00, 0xFE0F, 0xFEFF, 0xFFA0].map((c) => String.fromCodePoint(c));

test('invisible formatting characters are deleted as a class: every one, at every position of a name, changes nothing (R-18 probed five characters inside one name)', async () => {
  for (const c of INVISIBLE) assert.equal(stripInvisible(`a${c}b`), 'ab', `U+${c.codePointAt(0).toString(16)}`);
  const bad = [];
  for (const q of ['20th Maine', 'Gettysburg', 'who commanded the Iron Brigade', "Pickett's Charge", '6th Wisconsin', 'what happened on July 2']) {
    const want = fp(await ask(q));
    for (let i = 1; i < q.length; i += (q.length > 12 ? 3 : 1)) for (const c of [INVISIBLE[i % INVISIBLE.length], INVISIBLE[(i * 7 + 3) % INVISIBLE.length]]) {
      const got = fp(await ask(q.slice(0, i) + c + q.slice(i)));
      if (got !== want) bad.push(`${JSON.stringify(q)} + U+${c.codePointAt(0).toString(16)} at ${i}`);
    }
  }
  assert.deepEqual(bad.slice(0, 8), [], `${bad.length} positions changed the answer`);
  // a lone invisible character, or only invisible characters, is an empty question, not an error
  assert.equal((await ask(INVISIBLE.join(''))).mode, 'decline');
});

// ---- hostile callers: engine.ask never throws on caller data -----------------------------------------------------------------------------------------------------------------------------------
const boom = () => { throw new Error('boom'); };
const revoked = (() => { const r = Proxy.revocable({}, {}); r.revoke(); return r.proxy; })();
const trapAll = new Proxy({}, { get: boom, has: boom, ownKeys: boom, getOwnPropertyDescriptor: boom, getPrototypeOf: boom });
const HOSTILE_CTX = [
  ['throwing getter', { get lastEntities() { return boom(); } }], ['throwing onsite getter', { onsite: { get selected_unit() { return boom(); }, tick: 5 } }], ['proxy whose every trap throws', trapAll],
  ['revoked proxy', revoked], ['onsite is a throwing proxy', { onsite: trapAll }], ['array that throws on read', { lastEntities: new Proxy([], { get: boom }) }],
  ['array of a hostile length', { lastEntities: Object.assign([], { length: 4294967295 }) }], ['elements whose toString throws', { shownPassages: [{ toString: boom }, 'U-20ME'] }],
  ['lastIntent whose toString throws', { lastIntent: { toString: boom } }], ['null prototype', Object.create(null)], ['a string', 'ctx'], ['a number', 42], ['a bigint', 7n], ['a symbol', Symbol('s')],
  ['a function', () => 1], ['an array', [1, 2, 3]], ['NaN', NaN], ['an invalid date', new Date(NaN)], ['null', null], ['nested cycle', (() => { const c = { lastEntities: [] }; c.self = c; c.onsite = { location: c }; return c; })()],
  ['huge strings', { lastEntities: ['x'.repeat(1e6)], onsite: { location: 'y'.repeat(1e6), selected_unit: 'z'.repeat(1e6) } }], ['onsite tick is Infinity', { onsite: { tick: Infinity, day: 99 } }],
];
const HOSTILE_Q = [['object whose toString throws', { toString: boom }], ['object whose Symbol.toPrimitive throws', { [Symbol.toPrimitive]: boom }], ['null prototype', Object.create(null)], ['a symbol', Symbol('q')], ['a bigint', 9n],
  ['an array', ['20th', 'Maine']], ['a number', 1863], ['undefined', undefined], ['lone surrogates', '\ud800 20th \udfff Maine'], ['NUL and controls', '20th\u0000 Maine\u0007'], ['one million characters', 'a '.repeat(500000)], ['revoked proxy', revoked]];

test('engine.ask never throws on a hostile context object or a hostile question, and always returns an answer object', async () => {
  for (const [name, ctx] of HOSTILE_CTX) { let a; try { a = await ask('20th Maine', ctx); } catch (e) { assert.fail(`ctx ${name}: ${e.message}`); } assert.equal(typeof a.mode, 'string', name); assert.equal(typeof a.text, 'string', name); }
  for (const [name, q] of HOSTILE_Q) { let a; try { a = await ask(q); } catch (e) { assert.fail(`question ${name}: ${e.message}`); } assert.equal(typeof a.mode, 'string', name); }
  let a; try { a = await engine.ask('20th Maine', {}, null); } catch (e) { assert.fail('opts null: ' + e.message); } assert.equal(a.shown[0], 'U-20ME');
  // a hostile context never changes a plain question's answer
  assert.equal((await ask('20th Maine', trapAll)).shown[0], 'U-20ME');
});

// ---- the day reader --------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const WORD = { 1: 'one', 2: 'two', 3: 'three' }, ORD = { 1: 'first', 2: 'second', 3: 'third' }, SUF = { 1: 'st', 2: 'nd', 3: 'rd' };
const singles = (d) => [`July ${d}`, `July ${d}, 1863`, `on July ${d}`, `July ${d}${SUF[d]}`, `the ${d}${SUF[d]} of July`, `the ${ORD[d]} of July`, `${d} July`, `day ${d}`, `Day ${WORD[d]}`, `day number ${d}`, `the ${ORD[d]} day`, `the ${d}${SUF[d]} day`, `on the ${ORD[d]} day of the battle`, `July ${d} 1863`, `jul ${d}`, `JULY ${d}`];
const ranges = (a, b) => [`July ${a}-${b}`, `July ${a} to ${b}`, `July ${a} through ${b}`, `July ${a} through July ${b}`, `July ${a} - July ${b}`, `from July ${a} to July ${b}`, `from July ${a} through July ${b}`, `between July ${a} and July ${b}`, `between July ${a} and ${b}`,
  `July ${a}-${b}, 1863`, `${a} to ${b} July`, `July ${a}${SUF[a]} to the ${b}${SUF[b]}`, `days ${a}-${b}`, `days ${a} through ${b}`, `days ${WORD[a]} through ${WORD[b]}`, `day ${a} to day ${b}`, `the ${ORD[a]} through ${ORD[b]} days`, `July ${a}–${b}`, `July ${a}—${b}`];
const span = (a, b) => { const o = []; for (let d = a; d <= b; d++) o.push(d); return o; };

test('day reader: every way of writing one day of the battle names exactly that day, and a stretch names every day in it (R-15 "July 1 to 3", R-16 "day 4")', () => {
  for (const d of [1, 2, 3]) for (const q of singles(d)) { const r = readDays(`what happened ${q}`); assert.deepEqual(r.days, [d], q); assert.equal(r.range, false, q); assert.equal(julyDate(q), d, q); }
  for (const [a, b] of [[1, 2], [1, 3], [2, 3]]) for (const q of ranges(a, b)) {
    // "the first through second days" style reads as a pair when a and b are adjacent words; every stretch must contain both ends and everything between
    const r = readDays(`what happened ${q}`); assert.deepEqual(r.days, span(a, b), q); assert.equal(r.range, true, q); assert.equal(julyDate(q), null, q);
  }
  for (const q of ['July 1, 2 and 3', 'July 1, 2, and 3', 'July 2 and 3', 'July 1 and 2', 'the first two days', 'the first three days', 'all three days', 'the last two days', 'first and second days']) assert.ok(readDays(q).range && readDays(q).days.length >= 2, q);
  assert.deepEqual(readDays('the last two days').days, [2, 3]); assert.deepEqual(readDays('all three days').days, [1, 2, 3]);
});

test('day reader: a date the records do not cover is outside, never read as a day of the battle ("July 4", "July 10", "day 4", "June 28", "August 1")', () => {
  for (const d of [4, 5, 9, 10, 15, 28, 31]) for (const q of [`July ${d}`, `July ${d}, 1863`, `the ${d}th of July`, `${d} July`, `day ${d}`]) { const r = readDays(q); assert.deepEqual(r.days, [], q); assert.ok(r.outside.length >= 1 && r.outside[0].d === d, q); }
  for (const q of ['June 28', 'June 30, 1863', 'August 1', 'September 17', 'the fourth day']) { const r = readDays(q); assert.deepEqual(r.days, [], q); assert.ok(r.outside.length >= 1, q); }
  // a clock after a day is not a second day: "July 2, 3 pm"; a year is not a day
  for (const [q, days] of [['July 2, 3 pm', [2]], ['July 2, 1863', [2]], ['July 2 at 3 in the afternoon', [2]], ['July 1863', []], ['the year 1863', []]]) assert.deepEqual(readDays(q).days, days, q);
});

test('day questions are answered across the stretch, or said to be outside the records: never declined, never read as day 1, never "Which 4th do you mean?"', async () => {
  const bad = [];
  for (const [a, b] of [[1, 2], [1, 3], [2, 3]]) for (const q of ranges(a, b).filter((x) => !/–|—/.test(x)).slice(0, 12)) {
    const r = await ask(`what happened ${q}`);
    if (r.mode === 'decline' || r.mode === 'clarify') { bad.push(`${q}: ${r.mode}`); continue; }
    for (const d of span(a, b)) if (!r.text.includes(`July ${d}:`)) bad.push(`${q}: no list for July ${d}`);
    for (const d of [1, 2, 3].filter((x) => x < a || x > b)) if (r.text.includes(`July ${d}:`)) bad.push(`${q}: lists July ${d}`);
  }
  for (const d of [4, 5, 10, 30]) for (const q of [`what happened on July ${d}`, `what happened on day ${d}`, `tell me about July ${d}, 1863`]) {
    const r = await ask(q); if (r.mode !== 'partial' || !new RegExp(`no entry for July ${d}`).test(r.text) || /Which \d+(?:st|nd|rd|th) do you mean/.test(r.text) || /Key moments of July \d/.test(r.text)) bad.push(`${q}: ${r.mode} ${r.text.slice(0, 80)}`);
  }
  assert.deepEqual(bad.slice(0, 10), [], `${bad.length} wrong`);
  assert.match((await ask('what happened on July 4')).text, /began to retreat on July 4/, 'what the site does say about July 4 is quoted from its own outcome row');
});

// ---- the clock reader ---------------------------------------------------------------------------------------------------------------------------------------------------------------------
const H12 = (h, m, mer) => ((h % 12) + (mer === 'pm' ? 12 : 0)) * 60 + m;
test('clock reader: every hour, minute and meridiem form is read to the same minute; a bare hour is asked about; before / by / after make a stretch', () => {
  const bad = [];
  for (let h = 1; h <= 12; h++) for (const m of [0, 5, 15, 30, 45, 59]) for (const mer of ['am', 'pm']) {
    const t = m === 0 ? [`${h}${mer}`, `${h} ${mer}`, `${h}:00 ${mer}`, `${h}:00${mer}`, `${h} ${mer[0]}.m.`, `${h} o'clock ${mer === 'am' ? 'in the morning' : h >= 6 && h < 12 ? 'in the evening' : 'in the afternoon'}`] : [`${h}:${String(m).padStart(2, '0')} ${mer}`, `${h}.${String(m).padStart(2, '0')} ${mer}`, `${h}:${String(m).padStart(2, '0')}${mer.toUpperCase()}`];
    for (const form of t) {
      if (/o'clock in the (?:morning|afternoon|evening)/.test(form)) { const inferred = /morning/.test(form) ? 'am' : 'pm'; if (inferred !== mer && !(h === 12)) continue; }
      for (const q of [`what happened at ${form} on July 2`, `at ${form} on July 3`]) {
        const c = parseClock(q); const want = H12(h, m, /morning/.test(form) ? 'am' : /afternoon|evening/.test(form) ? 'pm' : mer);
        if (!c || c.kind !== 'point' || c.mod !== want) bad.push(`${q}: ${JSON.stringify(c && { k: c.kind, mod: c.mod })} want ${want}`);
      }
    }
  }
  assert.deepEqual(bad.slice(0, 6), [], `${bad.length} misread`);
  for (let h = 1; h <= 12; h++) for (const q of [`what happened at ${h} on July 2`, `what was going on around ${h} on July 3`, `at ${h} o'clock on July 2`, `what happened at ${h}:30 on July 2`]) { const c = parseClock(q); assert.ok(c && c.ambiguous === 'meridiem' && c.hour === h, q); }
  for (let h = 1; h <= 12; h++) for (const [word, rel] of [['before', 'before'], ['by', 'before'], ['until', 'before'], ['after', 'after'], ['since', 'after']]) {
    const c = parseClock(`what happened ${word} ${h} pm on July 2`); const T = H12(h, 0, 'pm');
    assert.ok(c && c.kind === 'window' && c.rel === rel, `${word} ${h} pm`); assert.equal(c.at, T); assert.deepEqual(rel === 'before' ? [c.from, c.to] : [c.from, c.to], rel === 'before' ? [0, T] : [T, DAY]);
  }
});

test('clock reader: a time that cannot exist is named, a military time is read, spelled-out times are read, and a name containing noon or midnight is not a clock', () => {
  for (const q of ['13pm', '14 pm', '24pm', '0 pm', '0am', '25:00', '24:30', '15:75', '9:99', '3:60 pm', '13:30 pm', '13 o\'clock', '99:99']) { const c = parseClock(`what happened at ${q} on July 2`); assert.ok(c && c.invalid === true, q); }
  for (const [q, mod] of [['0300', 180], ['0000', 0], ['1500', 900], ['2359', 1439], ['0930', 570]]) { const c = parseClock(`what happened at ${q} on July 2`); assert.ok(c && c.kind === 'point' && c.mod === mod, q); }
  for (const [q, mod] of [['three o\'clock in the afternoon', 900], ['half past three in the afternoon', 930], ['quarter to four pm', 945], ['quarter past two pm', 855], ['four pm', 960], ['twelve noon', 720], ['ten past three pm', 910], ['three thirty pm', 930], ['eight in the morning', 480], ['half past eleven at night', 1410]]) {
    const c = parseClock(`what happened at ${q} on July 2`); assert.ok(c && c.kind === 'point', q); assert.equal(c.mod, mod, q);
  }
  assert.equal(parseClock('outnumbered ten to one at Gettysburg'), null); assert.equal(parseClock('what happened at 3 corps'), null); assert.equal(parseClock('at 1863'), null);
  for (const q of ['What was the noon lull?', 'the midnight council of war', 'tell me about the noon attack', 'what was the midday halt', 'the noon bombardment on July 3']) assert.equal(parseClock(q), null, q);
  for (const q of ['what happened at noon on July 2', 'what happened at noon', 'what was going on at midnight', 'around noon on July 1', 'before noon on July 3', 'noon on July 2']) assert.ok(parseClock(q), q);
});

test('before / after answers list only entries on the right side of the asked time, for every hour and every day (R-06 probed three questions)', async () => {
  const bad = [];
  const mins = (s) => { const t = s.match(/^about (\d{1,2}):(\d\d) (AM|PM)(?! on )/); return t ? ((+t[1]) % 12 + (t[3] === 'PM' ? 12 : 0)) * 60 + +t[2] : null; };
  for (const day of [1, 2, 3]) for (const h of [7, 9, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8]) {
    const mer = h >= 7 && h < 12 ? 'am' : 'pm'; const T = H12(h, 0, mer);
    for (const [word, side] of [['before', -1], ['by', -1], ['after', 1]]) {
      const a = await ask(`what happened ${word} ${h} ${mer} on July ${day}`);
      if (a.mode === 'decline' || a.mode === 'clarify') { bad.push(`${word} ${h}${mer} July ${day}: ${a.mode}`); continue; }
      for (const b of a.blocks.filter((x) => x.t === 'list')) for (const it of b.items) { const m = mins(it.txt); if (m !== null && (side < 0 ? m > T + 3 : m < T - 3)) bad.push(`${word} ${h}${mer} July ${day}: ${it.txt.slice(0, 40)}`); }
    }
  }
  assert.deepEqual(bad.slice(0, 8), [], `${bad.length} entries on the wrong side`);
});

test('a bare hour is asked about, an impossible time is said to be unreadable, and neither gets a day summary', async () => {
  for (let h = 1; h <= 12; h++) { const a = await ask(`what happened at ${h} on July 2`); assert.equal(a.mode, 'clarify', `at ${h}`); assert.match(a.text, /morning or in the afternoon/); assert.ok(a.chips.follow.length === 2 && a.chips.follow.every((c) => /(?:AM|PM)/.test(c.q) && /at /.test(c.q)), JSON.stringify(a.chips.follow)); }
  for (const q of ['13pm', '25:00', '15:75', '99:99', '0 pm']) { const a = await ask(`what happened at ${q} on July 2`); assert.equal(a.mode, 'clarify', q); assert.match(a.text, /could not read/, q); assert.ok(!/Key moments of/.test(a.text), q); }
  const a = await ask('what happened at 0300 on July 2'); assert.equal(a.intent, 'at-time'); assert.match(a.text, /3:00 AM/);
  assert.notEqual((await ask('What was the noon lull?')).mode, 'clarify');
  // a clarify chip, asked, is answered
  const c = (await ask('what happened at 3 on July 2')).chips.follow; for (const chip of c) assert.equal((await ask(chip.q)).intent, 'at-time', chip.q);
});

// ---- places that carry another place's name -----------------------------------------------------------------------------------------------------------------------------------------------
test('a landmark that a map location carries as a name leads with the location (the place record), and the landmark follows it', async () => {
  const a = await ask('Copse of Trees'); assert.equal(a.shown[0], 'LOC-009'); assert.ok(a.shown.includes('TF:TF-002'));
  assert.equal((await ask('copse of trees')).shown[0], 'LOC-009'); assert.equal((await ask('Codori Farm')).shown[0], 'LOC-024'); assert.equal((await ask('Lutheran Theological Seminary')).shown[0], 'LOC-022');
  assert.ok(!/The Angle \(The Angle/.test(a.text), 'the shared-name list does not repeat the name');
});

test('quotation marks around a name are not a quotation request ("19th Indiana" in quotes is the regiment); a real quotation request still is one', async () => {
  for (const [q, id] of [['"19th Indiana"', 'U-19IN'], ['"6th Wisconsin"', 'U-6WI'], ['“24th Michigan”', 'U-24MI'], ['"Little Round Top"', 'LOC-003']]) { const a = await ask(q); assert.notEqual(a.intent, 'quote', q); assert.equal(a.shown[0], id, q); }
  for (const q of ['who said "Come on, you Wolverines!"', 'what did Hancock say', 'who shouted "Fix bayonets and charge downhill"']) assert.equal((await ask(q)).intent, 'quote', q);
});

test('quotes under "what did X say" have X as the speaker; where the records hold none, that is said and no unrelated sentence is offered as his words', async () => {
  for (const q of ['What did Sykes say about the hill?', 'what did Chamberlain say about his men?']) { const a = await ask(q); assert.equal(a.mode, 'partial', q); assert.match(a.text, /do not quote anyone saying that/); assert.ok(!/this is what was said, word for word/.test(a.text), q); }
  for (const q of ['what did Hancock say', 'What did Lee say to Longstreet?']) { const a = await ask(q); if (/word for word/.test(a.text)) for (const b of a.blocks.filter((x) => x.t === 'quote')) assert.ok(new RegExp(q.includes('Hancock') ? 'Hancock' : 'Lee').test(b.text) && !/^\S+ (?:said|asked|replied)\.$/.test(b.text), `${q}: ${b.text}`); }
});

test('words the records hold are given as his words, whatever the verb of speech (Longstreet argues against it, then a quotation): GQ-081 and its phrasings; a verb of command or movement is not speech', async () => {
  for (const q of ['What did Longstreet tell Lee about attacking the Union center?', 'What did Longstreet say about attacking the Union center?', 'what did Longstreet say to Lee on July 2', 'What did Longstreet tell Lee about the attack on July 3?', "what did Longstreet argue about Pickett's Charge", 'What did Longstreet say about the assault?']) {
    const a = await ask(q); assert.equal(a.intent, 'quote', q); assert.ok(!a.limited && /no 15,000 men ever arrayed/.test(a.text), `${q}: ${a.text.slice(0, 120)}`);
  }
  const { speakerPatterns, speakerSatisfied } = await import('../../historian-src/core/select.js');
  const ctx = { speakerRes: speakerPatterns(['Lee']) };
  for (const t of ['Lee told him to wait.', 'Lee, after a pause, replied that he would.', "Lee argues against it: 'No.'", 'Lee protested that the order was unwise.', 'Lee warns Longstreet.', '"We go on," said General Lee.', 'It is all my fault, cried Lee.']) assert.ok(speakerSatisfied(t, ctx), t);
  for (const t of ['Lee ordered Longstreet to attack.', 'Lee rode to Seminary Ridge.', 'Lee commanded the army.', 'Longstreet said Lee was ill.']) assert.ok(!speakerSatisfied(t, ctx), t);
});

test('the cached hx facts hold the english dictionary, the lexicons and the state tables the engine reads (a stale build fails here)', () => {
  assert.ok(String(kb.facts.english).split(' ').length > 4000, 'english word list');
  for (const k of ['weather_strong', 'weather_weak', 'enlisted_ranks', 'roster_nouns', 'mental_verbs', 'metaphor_next', 'present_time']) assert.ok(kb.facts.lexicons[k].length >= 5, k);
  assert.ok(Object.keys(kb.facts.rank).filter((k) => /@/.test(k)).length >= 90, 'state rank tables');
  assert.ok(kb.facts.rank['regiment.losses.A@michigan'].rows.length >= 3 && kb.facts.rank['regiment.size.A@michigan'].low.length >= 1);
});

test('more ways to write a time and a date: a spelled bare hour is asked about, "and after / onwards / and earlier" make a stretch, "the noon hour" is a time, numeric dates are read, and ordinary phrases are not times or dates', () => {
  for (const w of ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve']) {
    for (const q of [`what happened at ${w} on July 2`, `what was going on around ${w}, July 3`, `what happened by ${w}?`]) { const c = parseClock(q); assert.ok(c && c.ambiguous === 'meridiem', q); }
  }
  for (const q of ['what happened at one point on July 2', 'what happened after three days', 'at two of the hills', 'by four brigades', 'around ten men on July 2']) assert.equal(parseClock(q), null, q);
  for (const q of ['at 4 pm and after on July 2', 'at 4 pm onwards on July 3', '4 pm and later on July 2', 'from 4 pm on, July 2']) { const c = parseClock(`what happened ${q}`); assert.ok(c && c.kind === 'window' && c.rel === 'after' && c.at === 960, q); }
  for (const q of ['at 4 pm and earlier on July 2', '4 pm or before on July 3']) { const c = parseClock(`what happened ${q}`); assert.ok(c && c.kind === 'window' && c.rel === 'before' && c.at === 960, q); }
  assert.equal(parseClock('what happened during the noon hour on July 2').mod, 720);
  for (const [q, d] of [['what happened on 7/2/1863', 2], ['what happened on 1863-07-03', 3], ['7/2', 2], ['what happened on 7/2', 2], ['what happened 7-3-63', 3], ['dated 7/1/63', 1]]) assert.deepEqual(readDays(q).days, [d], q);
  for (const q of ['the ratio was 7/10', '7/10 of the men fell', 'a 7/8 majority']) assert.deepEqual(readDays(q).days, [], q);
});
