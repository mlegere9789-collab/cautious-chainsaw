// The shared tick -> clock detectors (tools/time/detectors.mjs): they match the SHAPES of the legacy formulas, not their spelling, and stay quiet on
// ordinary code. Used by TM-V9 / TM-V16 / TM-V17 and the formula inventory.
import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { findMatches, monthSites, exemptModule, moduleInline } from '../../tools/time/detectors.mjs';
import { doc, model } from './helpers.mjs';

const hits = (code, bucket) => findMatches(code).filter((h) => !bucket || h.bucket === bucket);

describe('date: a month name plus a constant, however it is built', () => {
  const POSITIVE = {
    'template, tab + 2 (the HUD)': 'R=`July ${l+2}, 1863`', 'template, index + 1 (the ledger)': '`July ${dayIdx + 1}, ${h12}`', 'template with a minus': '`July ${day - 1}`', 'template, abbreviated month': '`Jul ${d + 2}, 1863`',
    'other month': '`August ${day + 1}`', 'concat, parenthesised': 'const dd = (tab) => "July " + (tab + 2);', 'concat, bare': "x = 'July ' + tab + 2;", 'concat, minified': 'A="July "+(c+2)', 'concat, no space in the literal': 'x="July"+(d+1)',
    'array children': 'children:["July ",tab+2]', 'jsx children, subtraction': 'V.jsxs("div",{children:["July ",day-1]})', 'Date.UTC': 'const ms = Date.UTC(1863, 6, 1, 10, 0);', 'Date.UTC minified': 'new Date(Date.UTC(1863,6,d))',
    'new Date with the year': 'new Date(1863, 6, d + 2)', 'new Date with a tick': 'new Date(base + tick * 1000)', 'new Date with a 5-minute constant': 'new Date(t0 + i * 300000)', 'new Date with a 5-minute constant, exponent': 'new Date(t0 + i * 3e5)',
    'new Date with a frame': 'new Date(startMs + frame * 6e4)', 'date setter': 'd.setUTCMinutes(d.getUTCMinutes() + 5)', 'setHours': 'date.setHours(h + 1)',
  };
  for (const [name, code] of Object.entries(POSITIVE)) test(`caught: ${name}`, () => assert.ok(hits(code, 'date').length >= 1, code));
  const NEGATIVE = { 'a month name in prose': '<p>The battle began in July 1863.</p>', 'a month list': 'const M = ["January","February","March"];', 'a month in a label': 'label:"Line of March",color:"#aaa"', 'a template without a constant': '`July ${day}`.length',
    'cache expiry Date': 'new Date(U+1e3*X["max-age"]).getTime()', 'Date of a variable': 'new Date(expires).getTime()', 'year of now': 'new Date().getFullYear()', 'Date.now': 'const t = Date.now() - start;', 'a percentage': 'width: ${a + 2}px', 'a comparison': 'if (July > 5) { x = "July"; }' };
  for (const [name, code] of Object.entries(NEGATIVE)) test(`quiet: ${name}`, () => assert.deepEqual(hits(code, 'date').map((h) => h.text), [], code));
});

describe('tick5: tick -> minutes / hours arithmetic', () => {
  const POSITIVE = { '(tick - dayStart) * 5': 'const m = (tick - dayStart) * 5;', '(x-1)*5 minified': 'M=(x-1)*5,P=x<=225?1:x<=450?2:3', 'offset expression': 'M=(c-(f===1?0:f===2?225:450)-1)*5', 'tick * 5': 'const minutes = tick * 5;', 'currentTick*5': 'z=currentTick*5', '5 * tick': 'const m = 5 * tick;', '5 * frameIdx': 'm = 5*frameIdx',
    'ms: 300000': 'return start + (tick - 1) * 300000;', 'ms: 3e5': 'Date.now() + i*3e5', 'ms: * 60000': 'const ms = mins * 60000;', 'ms: 5*60*1000': 'const ms = ticks * 5 * 60 * 1000;', 'ms: 6e4': 'x = m * 6e4',
    '(tick - 1) / 12': 'const h = Math.floor((tick - 1) / 12);', 'hours by 12 ticks, minified': 'H=(c-1)/12', 'tick / 12': 'const hours = tick / 12;', 'Math.floor(t / 12)': 'h = 5 + Math.floor(t / 12)' };
  for (const [name, code] of Object.entries(POSITIVE)) test(`caught: ${name}`, () => assert.ok(hits(code, 'tick5').length >= 1, code));
  const NEGATIVE = { 'half of a sum': 'T=.5*(g+v)', 'colour maths': 'i<=.04045?i/12.92:Math.pow((i+.055)/1.055,2.4)', 'a fixed product': 'const px = 5 * 4;', 'a size of five': 'size = n * 5 + pad', 'a call result times five': 'const n = f(x) * 5.5;', 'index scaling': 'e.int16[5*e+0]=n', 'a grid': 'const w = cols * 12;', 'time in prose': '<p>about 5 minutes</p>', 'a division by 12.5': 'a = b / 12.5', 'Math.floor by ten': 'Math.floor(t / 10)' };
  for (const [name, code] of Object.entries(NEGATIVE)) test(`quiet: ${name}`, () => assert.deepEqual(hits(code, 'tick5').map((h) => h.text), [], code));
});

describe('minutes: the 4/5/6 hour bases', () => {
  const POSITIVE = { '5*60': 'P=5*60+M', '6*60 / 4*60': 'R=(P===1?6*60:4*60)+H', '60 * 5': 'const base = 60 * 5;', '5 * 3600': 'const s = 5 * 3600;', '5 * 3600000': 'const ms = 5 * 3600000;', 'seconds constant': 'const base = 18000;', 'ms constant': 'const base = 18000000;', '300 + (tick - 1)': 'const m = 300 + (tick - 1) * 5;', '360 + tickOffset': 'const m = 360 + currentTick;', '240 + (t-1)': 'M=240+(t-1)' };
  for (const [name, code] of Object.entries(POSITIVE)) test(`caught: ${name}`, () => assert.ok(hits(code, 'minutes').length >= 1, code));
  const NEGATIVE = { 'degrees': '(Math.atan2(y, x) * 180 / Math.PI + 360) % 360', 'a delay': 'setTimeout(f, 300)', 'a hue': 'hsl(360, 50%, 50%)', 'seconds in a day': 'const day = 24 * 3600;', 'a count of 5 or 6': 'for (let i = 0; i < 6; i++) n *= 5;' };
  for (const [name, code] of Object.entries(NEGATIVE)) test(`quiet: ${name}`, () => assert.deepEqual(hits(code, 'minutes').map((h) => h.text), [], code));
});

describe('locale: time-of-day formatters are allowed only on a bare new Date()', () => {
  test('the visitor\'s own clock is allowed wherever it sits; the same formatter on any other Date is not (an allow-list by file name hid this)', () => {
    const wall = hits('changeLog.unshift({ time: new Date().toLocaleTimeString() })', 'locale'); assert.equal(wall.length, 1); assert.equal(wall[0].allowed, true);
    for (const code of ['new Date(base + tick * 300000).toLocaleTimeString()', 'const d = new Date(1863, 6, 1); d.toLocaleTimeString("en-US")', 'new Date(x).toLocaleDateString()', 'd.getHours()', 'date.getUTCHours()', 'd.getMinutes()', 'new Intl.DateTimeFormat("en", { hour: "numeric" })', 'const s = new Date(ms) .toLocaleTimeString()']) {
      const h = hits(code, 'locale'); assert.ok(h.length >= 1, code); assert.ok(h.every((x) => !x.allowed), `${code} must not be allowed`);
    }
  });
  test('ordinary toLocaleString on numbers and Date.getFullYear are not time-of-day formatters', () => {
    for (const code of ['s.toLocaleString()', 'x.toLocaleString("en-US")', 'new Date().getFullYear()', 'd.getDate()', 'd.toISOString()']) assert.deepEqual(hits(code, 'locale'), [], code);
  });
});

describe('ampm: a typed AM/PM marker', () => {
  test('with or without a space, dots, either case, any quote', () => {
    for (const code of ['h >= 12 ? "PM" : "AM"', "x + ' PM'", 'x+" AM"', '`${h}:${m} ${ap}` + "pm"', 'ampm = h >= 12 ? \'p.m.\' : \'a.m.\'', 'return h + " P.M."', 'x ? "am" : "pm"', 'l=z>=12?"PM":"AM"']) assert.ok(hits(code, 'ampm').length >= 1, code);
    assert.equal(hits('(h - 12 || 12) + " PM" : h + " AM"', 'ampm').length, 2);
  });
  test('words that merely contain am or pm are not markers', () => {
    for (const code of ['const name = "campaign";', 'x = "ramp"', 'label = "PM Peach Orchard"', '"program"', 'a.am = 1', '"I am"', "'am I'"]) assert.deepEqual(hits(code, 'ampm'), [], code);
  });
});

describe('TM-V16 sites: a month plus a non-constant', () => {
  test('array / concat / template forms are found with their identifier', () => {
    assert.deepEqual(monthSites('children:["July ",di]').map((s) => [s.kind, s.ident]), [['array', 'di']]); assert.deepEqual(monthSites('x = "July " + tab').map((s) => [s.kind, s.ident]), [['concat', 'tab']]); assert.deepEqual(monthSites('`July ${d}`').map((s) => [s.kind, s.ident]), [['template', 'd']]);
    assert.deepEqual(monthSites('label:"Line of March",color:"#aaa"'), []); assert.deepEqual(monthSites('"July " + fmt(x)'), [], 'a function call result is not a bare tab variable');
  });
});

describe('the module\'s own inlined text is exempt, an edited copy is not', () => {
  const inl = moduleInline();
  test('the exact inlined bytes are replaced by an expression that still parses; nothing else moves', () => {
    assert.ok(inl && inl.startsWith('(function(){'), 'run node tools/time/build.mjs first');
    const bundle = 'const a = 1;,nA=675;var GTBGT=' + inl + ';function v4(){}', out = exemptModule({ 'x.js': bundle })['x.js'];
    assert.equal(out.length, bundle.length); assert.doesNotThrow(() => new vm.Script(out.replace(',nA=675;', 'var nA=675;'))); assert.deepEqual(findMatches(out), []); assert.ok(findMatches(bundle).length > 0, 'unexempted, the module contains formatter shapes (" PM", 5-minute arithmetic ...)');
    assert.equal(exemptModule({ 'y.js': 'no module here' })['y.js'], 'no module here');
  });
  test('one changed character and it is no longer exempt: tampering inside the module is seen', () => {
    const tampered = inl.replace('" PM"', '" pm"'); assert.notEqual(tampered, inl);
    const out = exemptModule({ 'x.js': 'var G=' + tampered + ';' })['x.js']; assert.ok(findMatches(out).length > 0);
  });
});

describe('legacy counts (the baselines these detectors must reproduce exactly)', () => {
  test('TM-V9 buckets on the frozen legacy tree: date 4, tick*5 8, hour bases 5, locale 1 (allowed), typed AM/PM 13 - unchanged by the generalisation', async () => {
    const { buildContext, runAll } = await import('../../tools/time/rules.mjs'); const r = runAll(buildContext(model, doc)).find((x) => x.id === 'TM-V9');
    assert.deepEqual([r.data.date.length, r.data.tick5.length, r.data.minutes.length, r.data.locale.length, r.data.wallClock.length, r.data.ampm.length], [4, 8, 5, 1, 1, 13]);
  });
});
