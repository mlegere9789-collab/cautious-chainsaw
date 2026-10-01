// unknowns.test.mjs - the compiled known unknowns (facts.unknowns, from tools/historian/data/scope.v1.json) are CONSUMED by the engine (verifier defect V-03: "weather-at-battle" was dead data).
// Every rule must have a probe below and every probe must produce the rule's own text, what the site's text does say (if anything) and what would answer it. Adding a rule without
// consuming it fails the "every rule is consumed" test, so the table cannot rot again.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture } from './lib/fixture.mjs';
import { lintAnswer } from '../../historian-src/core/lint.js';

const { engine, kb } = await fixture();
const ask = (q, c) => engine.ask(q, c);
const RULE = (id) => kb.facts.unknowns.find((u) => u.id === id);

const PROBES = {
  'weather-at-battle': ['What was the weather on July 2, 1863?', 'Was it raining during Pickett\'s Charge?', 'How hot was it at Gettysburg on July 3?', 'What was the weather like at the battle?', 'Was it foggy on July 1?'],
  'individual-soldier': ['Was John Smith of the 20th Maine at Gettysburg?', 'Was Thomas Brown of the 1st Minnesota at Gettysburg?', 'Was Sgt. William Davis in the 69th Pennsylvania at Gettysburg?', 'What did Private John Smith of the 20th Maine do?', 'Did Corporal Jones of the 1st Minnesota survive?', 'Tell me about Private John Smith, 20th Maine'],
  'roster': ['Who were the men in Company K of the 20th Maine?', 'list all the soldiers of the 1st Minnesota', 'Can I see a roster of the 69th Pennsylvania?', 'What are the names of the soldiers who died in the 24th Michigan?'],
  'inner-thoughts': ["What did Lee think about Pickett's Charge?", 'How did Meade feel after the battle?', 'What was Longstreet thinking during the cannonade?', 'Did Pickett regret the charge?'],
  'recorded-words': ['What did Sykes say about the hill?', 'What did Chamberlain say about his men?'],
  'per-location-casualties': ['How many men died at the Wheatfield?', 'How many were killed at Little Round Top?', 'What were the casualties at the Peach Orchard?'],
  'gettysburg-address': ['What was the Gettysburg Address and who gave it?', 'Can you show me the text of the Gettysburg Address?', "Lincoln's Gettysburg Address", 'Recite four score and seven years ago'],
};

test('every compiled known unknown has a probe and is answered with its own text and what would answer it', async () => {
  assert.deepEqual(kb.facts.unknowns.map((u) => u.id).sort(), Object.keys(PROBES).sort(), 'a known unknown without a probe (and so without a consumer) is dead data');
  for (const [id, qs] of Object.entries(PROBES)) {
    const rule = RULE(id); assert.ok(rule.text && rule.answer_with, `${id} carries its limitation and what would answer it`);
    for (const q of qs) {
      const a = await ask(q);
      assert.ok(a.limited === true || a.mode === 'partial', `${q}: ${a.mode}`);
      assert.notEqual(a.mode, 'decline', q);
      const head = rule.text.replace('{place}', '').replace(/\s+/g, ' ').split(' so I cannot')[0].slice(0, 40);
      assert.ok(a.text.replace(/\s+/g, ' ').includes(head), `${q}: the rule's own words are missing (${head})`);
      assert.deepEqual(lintAnswer(kb, a), [], q);
    }
  }
});

test('weather at the battle: an honest limitation, only real weather remarks from the site\'s own text, only the asked day, and what would answer it', async () => {
  const a = await ask('What was the weather on July 2, 1863?');
  assert.equal(a.mode, 'partial'); assert.match(a.text, /do not include a weather series/); assert.match(a.text, /What would answer it: A weather answer would need period observations/);
  assert.ok(!a.blocks.some((b) => b.t === 'quote'), 'the site\'s July 2 text does not mention weather: no quote is better than an unrelated one');
  const b = await ask('Was it raining on July 3?');
  const quotes = b.blocks.filter((x) => x.t === 'quote'); assert.ok(quotes.length >= 1);
  for (const q of quotes) assert.match(q.text, /\brain/i);
  assert.ok(quotes.some((q) => /Rain begins/.test(q.text)));
  assert.ok(!/site clock|tick/i.test(b.text));
});

test('the forecast rule still declines a forecast, and no longer swallows a question about 1863', async () => {
  for (const q of ['what will the weather be in Gettysburg this weekend', 'What is the weather in Gettysburg today?', 'weather forecast for Gettysburg tomorrow']) { const a = await ask(q); assert.equal(a.mode, 'decline', q); assert.equal(a.pointer, 'weather', q); }
  for (const q of ['What was the weather at Gettysburg on July 3, 1863?', 'What was the weather in Gettysburg during the battle?', 'What was the temperature at Gettysburg on July 2 1863?']) { const a = await ask(q); assert.equal(a.mode, 'partial', q); assert.ok(!a.pointer, q); }
});

test('a question that merely mentions storming, heat or a rainbow is not a weather question', async () => {
  for (const q of ['Who commanded the 20th Maine?', 'How many men did the 1st Minnesota lose?', 'Who stormed the Peach Orchard?', "What was the heat of the fighting on Culp's Hill?", "What was Pickett's Charge?", 'Which regiment was in the thick of the storm of shot on July 2?'])
    assert.ok(!/weather series/.test((await ask(q)).text), q);
});

test('the individual-soldier limit names the regiment the reader asked about, not an alias that shares a surname', async () => {
  const a = await ask('Was John Smith of the 20th Maine at Gettysburg?');
  assert.equal(a.limited, true); assert.ok(a.shown.includes('U-20ME') && !a.shown.includes('ART:U-ART-4NYIND'), a.shown.join());
  assert.match(a.text, /cannot tell whether a specific soldier was at Gettysburg/); assert.match(a.text, /Find Your Ancestor/);
});

test('the Gettysburg Address: not declined as out of scope (the cemetery tour of the site mentions it) and not answered from memory: the limitation, the tour words, what would answer it', async () => {
  const a = await ask('What was the Gettysburg Address and who gave it?');
  assert.equal(a.mode, 'partial'); assert.equal(a.limited, true);
  assert.match(a.text, /text of the Gettysburg Address is not in this site.s records/);
  const q = a.blocks.filter((b) => b.t === 'quote'); assert.equal(q.length, 1); assert.match(q[0].text, /President Abraham Lincoln/); assert.equal(q[0].rec, 'TOUR:16'); assert.match(q[0].attrib, /tour stop 16/);
  assert.match(a.text, /What would answer it: The text of the Address is published by the Library of Congress and the National Park Service/);
  assert.ok(!/four score/i.test(a.text), 'the text is never reproduced from memory');
  assert.ok(!a.blocks.some((b) => b.t === 'note' && b.code === 'compound-part'), 'one known unknown, not two questions');
  assert.equal((await ask('Explain the causes of the Civil War')).mode, 'decline', 'the scope-out topics are unchanged');
});
