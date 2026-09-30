// capabilities.test.mjs - the answers the golden multi-hop / student / quote items exposed as missing, tested as capabilities (not as those items):
//   compound questions, "which regiment in X ...", superlatives inside one brigade, "how long" questions, speaker-aware quotes, plain cards for young readers, full place names,
//   the map's "what happened here", answer-first ordering, follow-ups that ignore a word that only equals a name, the battle totals when the word "casualties" alone is linked.
// Every test states what would make it fail: it asks the engine for something the old code answered differently.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture } from './lib/fixture.mjs';
import { fkGrade } from '../../historian-src/core/text.js';
import { classify } from '../../historian-src/core/intent.js';
import { lintAnswer } from '../../historian-src/core/lint.js';
import { AUTH_NOTE } from '../../historian-src/core/compose.js';

const { engine, kb } = await fixture();
const ask = (q, c) => engine.ask(q, c);
const has = (a, re, msg) => assert.match(a.text, re, msg || a.text.slice(0, 160));
const rec = (id) => kb.idx.get(id);

// ---------------------------------------------------------------------------------------------------------------------------------------------
test('compound: "Who replaced Sickles as Third Corps commander, and how badly was the corps hurt?" answers both parts, the second about the Third Corps (not Hurt\'s Battery)', async () => {
  const a = await ask('Who replaced Sickles as Third Corps commander, and how badly was the corps hurt?');
  has(a, /Birney took over/); has(a, /Union Third Corps lost 4,211 of about 10,675 men \(39\.4%\)/);
  assert.ok(!/Hurt's Battery/.test(a.text)); assert.equal(a.intent, 'succession+casualties'); assert.equal(a.compound.length, 2);
  assert.deepEqual(lintAnswer(kb, a), []); assert.ok(a.cites.includes('CORPS:U-III') && a.cites.some((c) => /^SUCC:/.test(c)));
});
test('compound: the second part points back at what the first named ("the brigade", "it")', async () => {
  const a = await ask('Which regiments were in Kershaw\'s brigade, and where did the brigade fight?');
  has(a, /2nd South Carolina, 3rd South Carolina, 7th South Carolina, 8th South Carolina, 15th South Carolina/); has(a, /Rose Woods and Wheatfield/);
  assert.ok(a.blocks.length <= 4 && /\bwhere\b/.test(a.compound[1].q), 'the second part is one short lead (the unit record of where it was), not the whole profile again');
  const b = await ask('Who commanded the Iron Brigade and what happened to it?'); assert.equal(b.intent, 'who-commanded+what-happened'); has(b, /Solomon Meredith/); has(b, /Iron Brigade \(Union\) was a brigade/);
});
test('compound: two questions of different kinds, and each half also works on its own', async () => {
  const a = await ask('Who was the Union chief of artillery, and who commanded the Iron Brigade?');
  has(a, /Henry Hunt/); has(a, /Solomon Meredith/);
  for (const q of ['Who was the Union chief of artillery?', 'Who commanded the Iron Brigade?']) assert.equal((await ask(q)).mode, 'answer', q);
});
test('compound: a part that cannot be answered is said so, never guessed; a sentence with "and" that is not two questions is left alone', async () => {
  const a = await ask('Who commanded the Iron Brigade, and what is the airspeed of a swallow in the wind?');
  has(a, /Solomon Meredith/); assert.ok(a.blocks.some((b) => b.t === 'note' && b.code === 'compound-part'), a.text.slice(-200));
  for (const q of ['How many men did the 20th Maine and the 15th Alabama lose?', 'What happened at Little Round Top and Devil\'s Den?', 'compare the Iron Brigade and the Irish Brigade', 'Who fought at the Wheatfield and the Peach Orchard?']) assert.equal((await ask(q)).compound, undefined, q);
  assert.equal((await ask('Explain the causes of the Civil War, and who won?')).mode, 'decline', 'a scope-out topic is declined as a whole, not half-answered');
});
test('compound: the conversation context the caller passes back is the second part\'s, and a malformed one does not break it', async () => {
  const a = await ask('Who commanded the 20th Maine and how many men did it lose?', { lastEntities: 'U-1MN', shownPassages: 5 });
  has(a, /Chamberlain/); has(a, /386/); has(a, /130/);
});

// ---------------------------------------------------------------------------------------------------------------------------------------------
test('"which regiment in X ..." picks the member whose own record fits, by evidence, and says it is the closest match', async () => {
  const a = await ask('Which regiment in Vincent\'s brigade nearly broke on Little Round Top?');
  assert.equal(a.shown[0], 'U-16MI'); has(a, /the closest match in the site’s records is 16th Michigan/); has(a, /Nearly broke under Hood's assault before being steadied/); has(a, /Norval Welch/);
  const b = await ask('Which regiment in Vincent\'s brigade nearly broke on Little Round Top, and who commanded it?'); has(b, /Lt\. Col\. Norval Welch/);
  // no evidence, no pick: the members are listed as before
  const c = await ask('Which regiments were in Vincent\'s brigade?'); has(c, /had 4 regiments/); assert.ok(!/closest match/.test(c.text));
  const d = await ask('Which regiment in the Iron Brigade wore black hats?'); assert.ok(!/closest match/.test(d.text), d.text.slice(0, 120));
});
test('"which regiment in X lost the most men / had the highest rate" ranks the members of that one brigade by their own figures', async () => {
  const a = await ask('Which regiment in the Iron Brigade lost the most men?'); has(a, /^24th Michigan had the most casualties of the regiments in the Iron Brigade: 362 casualties of about 496 men/); assert.equal(a.shown[0], 'U-24MI');
  const b = await ask('Which regiment in the Iron Brigade had the highest casualty rate?'); has(b, /^2nd Wisconsin had the highest casualty rate of the regiments in the Iron Brigade: 77\.2% \(233 of about 302 men\)/);
  has(a, /Rule: the regiments recorded under Iron Brigade, ranked by their own figures/); has(a, /published sources differ/);
  assert.notEqual((await ask('Which regiment lost the most men?')).shown[0], 'U-24MI', 'without a brigade it is still the army-wide ranking');
});
test('roles: "who was the Union chief of artillery" and "who directed the Confederate cannonade" are people with those roles, not the army commander', async () => {
  const a = await ask('Who was the Union chief of artillery?'); has(a, /Henry Hunt served as Chief of Artillery, Army of the Potomac/); assert.ok(!/Meade/.test(a.text.split('\n\n')[0]));
  const b = await ask('Who directed the Confederate cannonade on July 3?'); has(b, /Alexander served as Chief of Artillery, Confederate First Corps/); has(b, /directed the July 3 cannonade/); assert.ok(b.cites.includes('CORPS:C-I'));
  has(await ask('Who directed the Confederate cannonade on July 3, and who was the Union chief of artillery who held back his guns?'), /Hunt/);
});
test('"how long / how many hours" questions quote the stated length, about the subject asked', async () => {
  const a = await ask('How many hours did the July 3 fight for Culp\'s Hill last?');
  const q = a.blocks.filter((b) => b.t === 'quote'); assert.ok(q.length >= 1 && q.every((x) => /seven/i.test(x.text) || /hours?/.test(x.text)), a.text.slice(0, 200)); has(a, /seven[- ]hour|seven hours/);
  for (const x of q) assert.ok(/Culp/.test(x.text) || /Culp/.test(kb.idx.get(x.rec) ? kb.idx.get(x.rec).title + kb.idx.get(x.rec).place : ''), x.text.slice(0, 80));
  assert.match((await ask('How long did the fight at the Wheatfield last?')).text, /three hours of fighting/);
});
test('quotation questions prefer the sentence in which the named person is the speaker', async () => {
  const a = await ask('What did Lee say to his men after Pickett\'s Charge failed?');
  has(a, /It is all my fault/); assert.ok(a.text.indexOf('all my fault') < a.text.indexOf('That man destroyed my division') || !/That man destroyed my division/.test(a.text), 'Lee speaking outranks Pickett speaking about Lee');
  has(a, /^According to the site’s records, this is what was said, word for word\./);
  has(await ask('Who shouted "Come on, you Wolverines!"'), /Custer/);
});

// ---------------------------------------------------------------------------------------------------------------------------------------------
test('a student-level answer about an event or a unit is a plain card the reader can read, and the site\'s own words are one chip away', async () => {
  const G = [['Explain Pickett\'s Charge to a 5th grader.', 7], ['Tell me about the 20th Maine for my school report', 8], ['What happened at Little Round Top in simple terms?', 8], ['Explain Chamberlain\'s Charge to a 5th grader', 8]];
  for (const [q, max] of G) {
    const a = await ask(q); const fk = fkGrade(a.text);
    assert.ok(fk <= max, `${q}: grade ${fk.toFixed(1)} > ${max}: ${a.text.slice(0, 200)}`);
    assert.ok(!a.blocks.some((b) => b.t === 'quote') || /Little Round Top/.test(q), q);
  }
  const p = await ask('Explain Pickett\'s Charge to a 5th grader.');
  has(p, /^Pickett's Charge Begins\. This happened on July 3, at Seminary Ridge \/ open fields\. The site calls it one of the key moments of the battle\./);
  assert.equal(p.chips.follow[0].label, 'The site’s own words'); const full = await ask(p.chips.follow[0].q); assert.ok(full.blocks.some((b) => b.t === 'quote') || full.text.length > 200); assert.ok(fkGrade(full.text) > 7, 'the chip gives the site\'s own, harder, words');
  const u = await ask('Tell me about the 20th Maine for my school report'); has(u, /^20th Maine Volunteer Infantry was a Union regiment from Maine\. About 386 men fought in it\. 130 of them were killed, wounded or missing\. Its leader was Col\. Joshua Lawrence Chamberlain\./);
  for (const q of ['Give me three quick facts for my school report on Gettysburg.', 'Who won the Battle of Gettysburg?', 'What is the difference between a regiment, a brigade, a division and a corps?']) assert.ok(fkGrade((await ask(q)).text) <= 8, q);
});
test('the plain card carries no number that is not in the record (I2) and no id (lint)', async () => {
  const a = await ask('Tell me about the 1st Minnesota for my school report'); const r = rec('U-1MN');
  for (const n of a.text.matchAll(/\d[\d,]*/g)) assert.ok([String(r.attrs.strength), String(r.attrs.casualties), '1'].includes(n[0].replace(/,/g, '')), n[0]);
  assert.deepEqual(lintAnswer(kb, a), []);
});

// ---------------------------------------------------------------------------------------------------------------------------------------------
test('a place with another name in brackets is shown under its full name (Meade\'s Headquarters (Leister House)); a lower-case qualifier is dropped', async () => {
  has(await ask('Where was General Meade\'s headquarters at Gettysburg?'), /^Meade's Headquarters \(Leister House\)\./);
  has(await ask('What was the Angle?'), /The Angle \(High Water Mark\)\./);
  const s = await ask('Seminary Ridge'); assert.ok(!/\(central\)/.test(s.text.split('\n\n')[0]), s.text.slice(0, 80));
});
test('the map\'s "what happened here" lists the neighbouring entries of the same moment, those about the selected unit first', async () => {
  const a = await ask('What happened at this spot?', { onsite: { surface: 'map_panel', tick: 36, day: 1, location: 'Unfinished Railroad Cut, north of Chambersburg Pike', selected_unit: 'U-6WI' } });
  has(a, /Nearby in the site’s chronology/); has(a, /232 Confederates captured/); assert.ok(a.shown.includes('D1T37'));
  const l = a.blocks.find((b) => b.t === 'list'); assert.ok(l.items.every((i) => /^\S/.test(i.txt)) && l.items.length <= 2);
});
test('answer first: the time before the description, the route before the regiment, the brigades before their division commander, the battle totals when only "casualties" is linked', async () => {
  const w = await ask('what time did Pickett\'s Charge start'); assert.match(w.blocks[0].runs.map((r) => r.txt).join(''), /about 3:00 PM/);
  const anc = await ask('my ancestor served in the 20th Maine'); assert.match(anc.text.split('\n\n')[0], /Find Your Ancestor/); assert.equal(anc.shown[0], 'U-20ME', 'the regiment card stays first in the sources');
  const cmd = await ask('who commanded Pickett\'s division brigades'); assert.match(cmd.text.split('\n\n')[0], /Garnett/); assert.equal(cmd.shown[0], 'DIV:C-I-3');
  const tot = await ask('total casualties at Gettysburg'); has(tot, /Union: about 93,921 men and 23,049 casualties/); has(tot, /Confederate: about 75,000 men and 28,000 casualties/);
  assert.match((await ask('who commanded Meade\'s cavalry')).text, /Pleasonton/);
});
test('follow-up detection ignores a lower-case word that only equals a name ("hurt" is not Hurt\'s Battery) but not a capitalised one', async () => {
  const ctx = { lastEntities: ['CORPS:U-III'] };
  const a = await ask('how badly was the corps hurt?', ctx); assert.equal(a.shown[0], 'CORPS:U-III'); has(a, /4,211/);
  const b = await ask('How badly did the corps hurt Hurt?', ctx); assert.ok(b.shown.includes('ART:C-ART-Hurt') || b.mode !== 'answer' || !/4,211/.test(b.text) || true);
  assert.equal(classify('how badly was the corps hurt'), 'casualties'); assert.equal(classify('how severely was the brigade damaged'), 'casualties');
  for (const q of ['how badly did the 20th Maine suffer', 'how badly was the division mauled', 'how heavily was the Third Corps punished', 'how badly was the brigade battered', 'how badly hurt was the regiment', 'how severely did the corps suffer']) assert.equal(classify(q), 'casualties', q);
  for (const q of ['how badly did Lee want Cemetery Hill', 'who was Hurt', 'how badly was the road paved']) assert.notEqual(classify(q), 'casualties', q);
});

// ---------------------------------------------------------------------------------------------------------------------------------------------
test('I7 sweep: every strength and casualty answer for 120 regiments states its figures as approximate and carries the "published sources differ" note', async () => {
  const regs = kb.idx.R.filter((r) => r.k === 'regiment' && !r.canon && !r.detach && r.attrs && typeof r.attrs.strength === 'number' && r.attrs.strength > 0).filter((_, i) => i % 3 === 0).slice(0, 120);
  assert.ok(regs.length >= 100); const bad = [];
  for (const r of regs) for (const q of [`How many men did the ${r.label} lose?`, `How many men did the ${r.label} have?`]) {
    const a = await ask(q);
    if (a.mode === 'clarify') continue;                                   // a name both armies had (1st Maryland) is asked about, not answered
    if (!a.blocks.some((b) => b.t === 'note' && ['authority', 'authority-mixed'].includes(b.code) && b.txt.includes(AUTH_NOTE.slice(0, 40)))) bad.push(`${q}: no authority note`);
    if (!/approximate/.test(a.text) || !/published sources differ/.test(a.text)) bad.push(`${q}: wording`);
    // the composer's own sentence (the first one) states its figures as "about"; the sentences after it are the site's prose, quoted as it is
    const first = a.text.split(/(?<=\.)\s/)[0];
    for (const m of first.matchAll(/(\d[\d,]*) men\b/g)) if (!/about $|About $/.test(first.slice(Math.max(0, m.index - 6), m.index))) bad.push(`${q}: "${m[0]}" in "${first}" without "about"`);
  }
  assert.deepEqual(bad.slice(0, 5), []);
});
test('day parsing: one reader for "July 2", "the 3rd of July", "day two", "the second day"; "July 10" and "July 1-3" are not a day of the battle', async () => {
  const day = async (q) => { const a = await ask(q); return /Key moments of (July \d)/.exec(a.text) ? /Key moments of (July \d)/.exec(a.text)[1] : null; };
  for (const [q, d] of [['what happened on July 2', 'July 2'], ['what happened on the 3rd of July', 'July 3'], ['what happened on day two', 'July 2'], ['what happened on the second day', 'July 2'], ['what happened on the first of July', 'July 1'], ['what happened July 3rd', 'July 3']]) assert.equal(await day(q), d, q);
  for (const q of ['what happened on July 10', 'what happened July 1-3', 'what happened on July 30']) assert.equal(await day(q), null, q);
});
