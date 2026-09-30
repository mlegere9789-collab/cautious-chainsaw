// text.test.mjs - normalisation, tokenisation, stemming, sentence splitting, edit distance (historian-src/core/text.js, units.js)
import test from 'node:test';
import assert from 'node:assert/strict';
import { baseNorm, tokenize, stem, splitSentences, sentencesOf, dl, fnv1a32, bucketOf, cleanSite, CLOCK_RE, contentStems } from '../../historian-src/core/text.js';
import { findUnitMentions, parseDesignation, parseParenKeys } from '../../historian-src/core/units.js';

test('baseNorm drops possessives, quotes and punctuation; idempotent', () => {
  assert.equal(baseNorm("Pickett's Charge"), 'pickett charge');
  assert.equal(baseNorm('Pickett’s   Charge!'), 'pickett charge');
  assert.equal(baseNorm('Devil’s Den'), 'devil den');
  assert.equal(baseNorm('the Wheat-field'), 'the wheat field');
  assert.equal(baseNorm('Tom & Jerry'), 'tom and jerry');
  for (const s of ['Culp’s Hill', 'XII Corps', 'first corps', '84th N.Y. Volunteers']) assert.equal(baseNorm(baseNorm(s)), baseNorm(s));
});

test('the stray s from apostrophes never becomes a token', () => {
  assert.deepEqual(tokenize("Pickett's Charge"), ['pickett', 'charge']);
  assert.ok(!tokenize("Longstreet's assault and Meade's council").includes('s'));
});

test('corps rewrite: first/1st/I/XII all become one token', () => {
  assert.deepEqual(tokenize('First Corps'), ['corpsi']);
  assert.deepEqual(tokenize('1st corps'), ['corpsi']);
  assert.deepEqual(tokenize('I Corps'), ['corpsi']);
  assert.deepEqual(tokenize('XII Corps'), ['corpsxii']);
  assert.deepEqual(tokenize('twelfth corps'), ['corpsxii']);
  assert.deepEqual(tokenize('Second Corps'), ['corpsii']);
});

test('ordinals: words, numerals, compounds and hundreds become #n', () => {
  const cases = { '20th': '#20', twentieth: '#20', 'twenty-first': '#21', 'Fifty-seventh': '#57', '84th': '#84', '1st': '#1', first: '#1', '140th': '#140', 'one hundred and fortieth': '#140', 'one hundred twenty fourth': '#124' };
  for (const [k, v] of Object.entries(cases)) assert.deepEqual(tokenize(k), [v], k);
  assert.deepEqual(tokenize('the second day'), ['the', '#2', 'day']);
});

test('me / in / us / la / al stay ordinary words (state abbreviations expand only after a number)', () => {
  assert.deepEqual(tokenize('tell me about it in Maine'), ['tell', 'me', 'about', 'it', 'in', 'maine']);
  const m = findUnitMentions(tokenize('the 20th ME'));
  assert.equal(m.length, 1); assert.equal(m[0].state, 'maine');
  assert.equal(findUnitMentions(tokenize('what happened to me in Maine')).length, 0);
});

test('"on July 3 in Pennsylvania" is not read as the 3rd Indiana', () => {
  assert.equal(findUnitMentions(tokenize('what happened on July 3 in Pennsylvania')).length, 0);
  assert.equal(findUnitMentions(tokenize('3 in the afternoon')).length, 0);
});

test('unit grammar: variants of the 1st Minnesota', () => {
  for (const q of ['1st Minnesota', 'First Minnesota', '1 MN', '1st MN', 'first mn', '1st Minn.', '1 Minnesota Volunteers', '1st Minnesota Infantry', 'the 1st M.N.']) {
    const m = findUnitMentions(tokenize(q));
    assert.equal(m.length, 1, q); assert.deepEqual(m[0].ords, [1], q); assert.equal(m[0].state, 'minnesota', q);
  }
});

test('unit grammar: ordinal lists, arms, multi-word states, US units', () => {
  const l = findUnitMentions(tokenize('the 49th and 77th New York'));
  assert.deepEqual(l[0].ords, [49, 77]); assert.equal(l[0].state, 'new york');
  assert.equal(findUnitMentions(tokenize('3rd Indiana Cavalry'))[0].arm, 'cav');
  assert.equal(findUnitMentions(tokenize('13th Pennsylvania Reserves'))[0].arm, 'res');
  assert.equal(findUnitMentions(tokenize('26th North Carolina'))[0].state, 'north carolina');
  assert.equal(findUnitMentions(tokenize('1st US Sharpshooters'))[0].state, 'united states');
  assert.equal(findUnitMentions(tokenize('84th N.Y.'))[0].state, 'new york');
  assert.equal(findUnitMentions(tokenize('Fifty-seventh Massachusetts'))[0].ords[0], 57, '"Fifty-seventh" never yields "seventh"');
});

test('designations and parentheticals feed the unit keys', () => {
  const d = parseDesignation('20th Maine Volunteer Infantry');
  assert.equal(d.ord, 20); assert.equal(d.state, 'maine'); assert.equal(d.arm, 'inf');
  assert.equal(parseDesignation('1st Vermont Cavalry').arm, 'cav');
  assert.deepEqual(parseParenKeys('84th New York Volunteer Infantry (14th Brooklyn)').map((k) => `${k.ord}|${k.state}`), ['14|brooklyn']);
  assert.deepEqual(parseParenKeys('13th Pennsylvania Reserves (42nd Pennsylvania / Original Bucktails)').map((k) => `${k.ord}|${k.state}`), ['42|pennsylvania']);
});

test('stemmer is light and stable on names', () => {
  assert.equal(stem('regiments'), 'regiment'); assert.equal(stem('casualties'), 'casualty'); assert.equal(stem('killed'), 'kill');
  for (const w of ['chamberlain', 'wheatfield', 'armistead', 'pickett', 'kershaw', '#20', 'lee', 'hays']) assert.equal(stem(stem(w)), stem(w), w);
  assert.deepEqual(contentStems('Who commanded the Iron Brigade?'), ['commanded'.slice(0, 7) === 'command' ? 'command' : 'command', 'iron', 'brigad'].slice(0, 3).map((x) => x));
});

test('sentence splitter protects abbreviations and initials', () => {
  const s = sentencesOf('Col. Joshua Chamberlain (20th Maine) fired at 4 p.m. on July 2. Then Lt. Gen. Longstreet spoke, "It is murder." No. 196 was next. J. E. B. Stuart arrived.');
  assert.equal(s.length, 4, JSON.stringify(s));
  assert.ok(s[0].startsWith('Col. Joshua'));
  const bounds = splitSentences('One. Two! Three?');
  assert.deepEqual(bounds.map((b) => b.s), [0, 5, 10]);
});

test('clock detector', () => {
  for (const t of ['at 4 p.m.', 'about 1:00pm', 'at 10:15 a.m.', 'at noon', "eight o'clock"]) assert.ok(CLOCK_RE.test(t), t);
  for (const t of ['July 2', 'the 15th Alabama', '386 men']) assert.ok(!CLOCK_RE.test(t), t);
});

test('bounded Damerau-Levenshtein', () => {
  assert.equal(dl('chamberlin', 'chamberlain', 2), 1);
  assert.equal(dl('armistad', 'armistead', 2), 1);
  assert.equal(dl('wheatfeild', 'wheatfield', 2), 1, 'transposition counts as one edit');
  assert.equal(dl('abc', 'xyz', 1), 2, 'returns max+1 when over the bound');
  assert.equal(dl('same', 'same', 0), 0);
});

test('hashing helpers are stable', () => {
  assert.equal(fnv1a32('minnesota'), fnv1a32('minnesota'));
  assert.equal(bucketOf('minnesota', 128), fnv1a32('minnesota') % 128);
  assert.notEqual(fnv1a32('a'), fnv1a32('b'));
});

test('site strings: typographic dash, nothing lower-cased', () => {
  assert.equal(cleanSite('Survived -- lost arm at Petersburg'), 'Survived — lost arm at Petersburg');
  assert.equal(cleanSite('a b  c'), 'a b c');
});
