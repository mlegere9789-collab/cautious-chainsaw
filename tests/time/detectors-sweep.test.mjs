// Sweeps over the tick -> clock detectors (tools/time/detectors.mjs): recall AND precision as properties of a SPACE, not of a list of probes (RV-03).
//
// The re-verification showed that a fix which only covers the tested inputs leaves the class open: 300000, 3e5 and 5 * 60 * 1000 were caught, 300_000 and
// 300 * 1000 were not; a month plus a constant was caught, a literal date table was not; "AM"/"PM" on its own was caught, "3:00 PM" inside a string was
// not; and `x * 60000`, `ttl = 5 * 60 * 1000` and `Math.floor(months / 12)` (common code that has nothing to do with the battle) were flagged. So:
//   RECALL     every spelling of each clock constant (generated: separators, exponents, hex/binary, products and quotients of friendly factors, parentheses)
//              x every shape a developer writes it in x every wrapper it can sit in (statement, function, arrow, class, minified, page script, module
//              script, surrounded by other code): each one must turn the right bucket on, and the value, not the digits, decides;
//   PRECISION  the same constants and shapes in a timer, a cache, a version test, a size, an interpolation must stay quiet, plus a corpus of realistic
//              non-time arithmetic and the real-world JavaScript in node_modules (acorn, terser, ajv, axe-core, playwright ...).
// A new spelling that fails is a detector bug; a new benign snippet that fires is a precision bug. Both are cheap to add here.
import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { findMatches, monthSites, dateTables, typedClocks, constantChains, isTickName, hedgedBefore, DETECTORS } from '../../tools/time/detectors.mjs';
import { ROOT } from '../../tools/time/lib.mjs';

const hits = (code, bucket, kind) => findMatches(code, bucket ? [bucket] : undefined, kind ? { kind } : {}).filter((h) => !h.allowed);
const evalNum = (s) => Function('"use strict"; return (' + s + ');')(); // the spellings are arithmetic on literals: evaluating them PROVES the value the detector must read
const cap = (s) => (s.length > 120 ? s.slice(0, 117) + '...' : s);

// ------------------------------------------------------------------------------------------------ spellings of a value
/** spellings of ONE numeric literal of value v: decimal, 1_000 separators, exponents (3e5, 3E+5, 300e3 ...), 300000.0, 300000., hex, binary, octal */
function literals(v) {
  const out = new Set([String(v)]);
  if (Number.isInteger(v) && v >= 1000) out.add(String(v).replace(/\B(?=(\d{3})+(?!\d))/g, '_'));
  if (Number.isInteger(v) && v > 0) { let m = v, k = 0; while (m % 10 === 0 && k < 9) { m /= 10; k++; out.add(`${m}e${k}`); out.add(`${m}E${k}`); out.add(`${m}e+${k}`); out.add(`${m}_0e${k - 1}`.replace(/^\d+_0e-?\d+$/, String(m))); } }
  if (Number.isInteger(v)) { out.add(v + '.0'); out.add(v + '.'); out.add('0x' + v.toString(16)); out.add('0X' + v.toString(16).toUpperCase()); out.add('0b' + v.toString(2)); out.add('0o' + v.toString(8)); }
  return [...out];
}
const FACTORS = [2, 3, 4, 5, 6, 10, 12, 15, 20, 25, 30, 50, 60, 100, 150, 200, 250, 300, 500, 1000, 3600, 60000];
/** products (a * b, a * b * c), quotients (a / b) and parenthesised forms that evaluate to v, from friendly factors */
function expressions(v, { max = 400 } = {}) {
  const out = new Set(literals(v));
  for (const a of FACTORS) { if (v % a === 0 && FACTORS.includes(v / a)) { out.add(`${a} * ${v / a}`); out.add(`${a}*${v / a}`); } for (const b of FACTORS) if (a * b === v) out.add(`(${a} * ${b})`); }
  for (const a of FACTORS) for (const b of FACTORS) { const c = v / (a * b); if (Number.isInteger(c) && FACTORS.includes(c) && a <= b && b <= c) { out.add(`${a} * ${b} * ${c}`); out.add(`${c} * ${b} * ${a}`); out.add(`${b} * ${a} * ${c}`); out.add(`(${a} * ${b}) * ${c}`); out.add(`${a} * (${b} * ${c})`); } }
  for (const f of [2, 5, 10, 60, 1000]) { out.add(`${v * f} / ${f}`); out.add(`${v * f}/${f}`); }
  for (const a of [5, 60, 1000]) if (v % a === 0) for (const l of literals(v / a).slice(0, 4)) { out.add(`${a} * ${l}`); out.add(`${l} * ${a}`); }
  if (v >= 1000) for (const f of literals(60000).concat(literals(1000)).slice(0, 8)) if (v % evalNum(f) === 0) for (const l of literals(v / evalNum(f)).slice(0, 4)) { out.add(`${l} * ${f}`); out.add(`${f} * ${l}`); }
  const all = [...out].filter((s) => evalNum(s) === v);
  assert.ok(all.length >= 40 || v < 1000, `the spelling generator for ${v} must give many spellings, got ${all.length}`);
  return all.slice(0, max);
}
const MS5 = expressions(300000), ONE_MIN_MS = expressions(60000), FIVE = expressions(5).concat(['(5)', '((5))', '5.0', '5.00', '5e0', '0.5e1', '50e-1']).filter((s) => evalNum(s) === 5);
const SEC5 = ['300', '300.0', '3e2', '0x12C', '5 * 60', '60 * 5', '(5 * 60)', '5*60', '60*5', '3e2', '30 * 10', '100 * 3'].filter((s) => evalNum(s) === 300);

// ------------------------------------------------------------------------------------------------ names and wrappers
const TICK_NAMES = ['tick', 'ticks', 'currentTick', 'tickIdx', 'tickIndex', 'tickNo', 'dayStartTick', 'frame', 'frameIdx', 'frameIndex', 'frameNumber', 'step', 'stepIndex', 'steps', 'slot', 'slotIndex', 'TICK', 'CURRENT_TICK', 'tick_number', 'this.tick', 'state.currentTick', 'props.frame', 'a.tick'];
const MINIFIED = ['x', 'c', 't', 'i', 'f', 'n', 'k', '$t'];
const STEP_NAMES = ['STEP_MS', 'stepMs', 'TICK_MS', 'tickMs', 'MS_PER_TICK', 'msPerTick', 'FRAME_MS', 'frameMs', 'SLOT_MS', 'stepMillis', 'tickMillis', 'TICK_DURATION_MS', 'tickSeconds', 'STEP_SECONDS', 'this.stepMs', 'cfg.tickMs'];
const WRAP = {
  statement: (c) => c,
  'function body': (c) => `function f(tick, frame, x, c, t, i) { ${c} }`,
  arrow: (c) => `const f = (tick) => { ${c} };`,
  'class method': (c) => `class A {\n  m(tick) {\n    ${c}\n  }\n}`,
  minified: (c) => `!function(){${c.replace(/\s+/g, ' ')}}();`,
  surrounded: (c) => `const a = 1;\nlet b = foo(2, 3);\n${c}\nexport default b;\n`,
  'page script': (c) => `<!doctype html><html><head><title>x</title></head><body><p>hello</p><script>\n${c}\n</script></body></html>`,
  'module script': (c) => `<html><body><script type="module">\n${c}\n</script></body></html>`,
};
const inEveryWrapper = (name, snippet, bucket, { want = true } = {}) => { for (const [w, wrap] of Object.entries(WRAP)) { const h = hits(wrap(snippet), bucket); assert.equal(h.length > 0, want, `${want ? 'missed' : 'false positive'} in [${w}] ${bucket}: ${cap(snippet)}`); } };

// ================================================================================================================ the folding itself
describe('constantChains folds numeric literals by VALUE, whatever the spelling', () => {
  test('every generated spelling of 300000 (ms), 60000, 5 and 300 is read as that value, alone and inside a statement', () => {
    for (const [v, list] of [[300000, MS5], [60000, ONE_MIN_MS], [5, FIVE], [300, SEC5]]) for (const s of list) {
      assert.equal(evalNum(s), v, s); const code = `const k = ${s};`, c = constantChains(code).filter((x) => x.start >= code.indexOf('=') + 1);
      assert.ok(c.length >= 1 && c.every((x) => x.value === v || Math.abs(x.value - v) < 1e-9), `${s}: ${JSON.stringify(c.map((x) => [x.raw, x.value]))}`);
    }
  });
  test('it never reads across an addition or into an identifier: 5 * 60 + M is 300 then M; a5 * 60 and 1e5x are not numbers; (5 * 60) * 1000 is one chain', () => {
    assert.deepEqual(constantChains('P=5*60+M').map((c) => [c.raw, c.value]), [['5*60', 300]]); assert.deepEqual(constantChains('P=5*60+3*4').map((c) => c.value), [300, 12]);
    assert.deepEqual(constantChains('x = a5 * 60').map((c) => c.value), [60]); assert.deepEqual(constantChains('(5 * 60) * 1000').map((c) => c.value), [300000]); assert.deepEqual(constantChains('f(5 * 60)').map((c) => c.value), [300]);
    assert.deepEqual(constantChains('a ** 2 * 5').map((c) => c.value), [5], 'a ** 2 * 5: the exponent is not part of a product');
    assert.deepEqual(constantChains('x /= 5 * 2').map((c) => c.value), [10]); assert.deepEqual(constantChains('// 5 * 60\nq = 3').map((c) => c.value).slice(-1), [3]);
  });
  test('isTickName reads WORDS: currentTick, frameIdx, TICK_MS, dayStartTick are ticks; iframe, ticket, keyframe, requestAnimationFrame, stick, footstep are not', () => {
    for (const n of [...TICK_NAMES.filter((x) => !x.includes('.')), 'TICKS', 'frames', 'msPerTick']) assert.equal(isTickName(n), true, n);
    for (const n of ['iframe', 'ticket', 'tickets', 'keyframe', 'keyframes', 'requestAnimationFrame', 'cancelAnimationFrame', 'stick', 'sticky', 'footstep', 'stepper', 'slothful', 'thick', 'trick', 'tickle', 'x', 'i', 'count', 'Stepanov']) assert.equal(isTickName(n), false, n);
  });
});

// ================================================================================================================ recall
describe(`RECALL: the 5-minute step in milliseconds, ${MS5.length} spellings x shapes x wrappers`, () => {
  const SHAPES = {
    'start + (tick - 1) * K': (K, T) => `const ms = START + (${T} - 1) * ${K};`,
    'K * (tick - 1)': (K, T) => `const ms = ${K} * (${T} - 1) + START;`,
    'tick * K': (K, T) => `const ms = START + ${T} * ${K};`,
    'K * tick': (K, T) => `const ms = ${K} * ${T};`,
    'return base + tick * K': (K, T) => `return base + ${T} * ${K};`,
    'Date.UTC(...) + (tick - 1) * K': (K, T) => `const d = new Date(Date.UTC(1863, 6, 1, 10, 0) + (${T} - 1) * ${K});`,
    'new Date(t0 + tick * K)': (K, T) => `const d = new Date(t0 + ${T} * ${K}).toISOString();`,
  };
  for (const [name, shape] of Object.entries(SHAPES)) test(`${name}: every spelling of K, tick-named operands`, () => {
    let n = 0;
    for (const K of MS5) for (const T of TICK_NAMES.slice(0, 12)) { const code = shape(K, T); assert.ok(hits(code).length > 0, `missed: ${code}`); n++; }
    assert.ok(n > 500, String(n));
  });
  test('the frame offset (x - 1) needs no name, in the minified single letters the bundle uses: (x - 1) * K, K * (x - 1)', () => {
    for (const K of MS5) for (const T of MINIFIED) for (const code of [`const ms = START + (${T} - 1) * ${K};`, `const ms = ${K} * (${T}-1);`, `M=(${T}-1)*${K}`]) assert.ok(hits(code, 'tick5').length > 0, `missed: ${code}`);
  });
  test('every wrapper (function, arrow, class method, minified, page script, module script, surrounded by other code) for a sample of spellings', () => {
    for (const K of MS5.filter((_, i) => i % 7 === 0)) inEveryWrapper('ms', `const ms = START + (tick - 1) * ${K};`, 'tick5');
  });
  test('a step constant NAMED for a tick is a tick formula whatever it is set to: STEP_MS = 300_000, stepMs: 300 * 1000, this.msPerTick = 5 * 60 * 1000 ...', () => {
    for (const N of STEP_NAMES) for (const K of MS5.filter((_, i) => i % 3 === 0)) for (const code of [`const ${N.replace('this.', '').replace('cfg.', '')} = ${K};`, `${N} = ${K};`, `const cfg = { ${N.split('.').pop()}: ${K}, other: 1 };`, `let ${N.split('.').pop()} = (${K});`]) assert.ok(hits(code, 'tick5').length > 0, `missed: ${code}`);
  });
  test('the 1-minute unit (60000, 6e4, 60 * 1000 ...) next to a tick is a tick formula; the same unit next to an unrelated name is not', () => {
    for (const K of ONE_MIN_MS) { for (const T of TICK_NAMES.slice(0, 8)) { assert.ok(hits(`const ms = ${T} * ${K};`, 'tick5').length > 0, `missed: ${T} * ${K}`); assert.ok(hits(`const ms = (${T} - 1) * 5 * ${K};`, 'tick5').length > 0); } for (const T of ['mins', 'minutes', 'duration', 'elapsed', 'delta']) assert.equal(hits(`const ms = ${T} * ${K};`, 'tick5').length, 0, `false positive: ${T} * ${K}`); }
  });
  test('in a statement about the clock (hours, minutes, AM/PM, a Date that is not the visitor\'s) the step alone is enough', () => {
    for (const K of MS5.filter((_, i) => i % 5 === 0)) for (const code of [`const minutes = n * ${K} / 60000; label.textContent = minutes + " minutes";`, `const t = new Date(base + n * ${K}); hours.textContent = t.getUTCHours();`, `const clock = start + ${K}; show(clock);`]) assert.ok(hits(code).length > 0, `missed: ${code}`);
  });
});

describe('RECALL: tick * 5 (minutes) and the seconds and hour forms of the same step', () => {
  const SHAPES = { '(T - 1) * K': (K, T) => `const m = (${T} - 1) * ${K};`, 'T * K': (K, T) => `const m = ${T} * ${K};`, 'K * T': (K, T) => `const m = ${K} * ${T};`, 'K * (T - 1)': (K, T) => `const m = ${K} * (${T} - 1);`, '(T - dayStart) * K': (K, T) => `const m = (${T} - dayStart) * ${K};`, 'with base': (K, T) => `const M = 300 + (${T} - 1) * ${K};`, 'return': (K, T) => `return (${T}-1)*${K}`, 'newline': (K, T) => `const m = (${T}\n  - 1)\n  * ${K};` };
  for (const [name, shape] of Object.entries(SHAPES)) test(`${name}: ${FIVE.length} spellings of 5 x tick names and minified letters`, () => {
    for (const K of FIVE) for (const T of name === 'T * K' || name === 'K * T' || name === '(T - dayStart) * K' ? TICK_NAMES : [...TICK_NAMES.slice(0, 8), ...MINIFIED]) { const code = shape(K, T); assert.ok(hits(code, 'tick5').length > 0 || hits(code, 'minutes').length > 0, `missed: ${cap(code)}`); }
  });
  test('seconds per tick: tick * 300, (tick - 1) * 5 * 60, tick * 5 * 60 * 1000 ...', () => {
    for (const K of SEC5) for (const T of TICK_NAMES.slice(0, 10)) assert.ok(hits(`const s = ${T} * ${K};`, 'tick5').length > 0, `missed: ${T} * ${K}`);
    for (const K of SEC5.filter((s) => /\*/.test(s))) for (const T of MINIFIED) assert.ok(hits(`const s = (${T} - 1) * ${K};`, 'tick5').length > 0, `missed: (${T} - 1) * ${K}`);
  });
  test('hours per tick: (tick - 1) / 12, tick / 12, tick % 12, Math.floor(t / 12), 5 + Math.floor(t / 12), (x - 1) * 5 / 60', () => {
    const codes = [];
    for (const T of TICK_NAMES.slice(0, 12)) for (const f of [(t) => `const h = (${t} - 1) / 12;`, (t) => `const h = ${t} / 12;`, (t) => `const m = ${t} % 12;`, (t) => `const h = Math.floor(${t} / 12);`, (t) => `const h = Math.floor((${t} - 1) / 12);`, (t) => `const h = Math.trunc(${t}/12);`, (t) => `const h = ${t} / 12.0;`, (t) => `const h = ~~(${t} / 12);`, (t) => `const h = (${t} - 1) / 12 | 0;`, (t) => `const m = (${t} - 1) % 12 * 5;`, (t) => `const h = ${t} * 5 / 60;`, (t) => `const h = (${t} - 1) * 5 / 60;`]) codes.push(f(T));
    for (const T of MINIFIED) for (const f of [(t) => `H=(${t}-1)/12`, (t) => `h = 5 + Math.floor(${t} / 12)`, (t) => `h = 4 + (${t} - 1) / 12`, (t) => `const h = Math.floor((${t} - 1) / 12);`, (t) => `m=(${t}-1)*5/60`]) codes.push(f(T));
    for (const code of codes) assert.ok(hits(code, 'tick5').length > 0, `missed: ${code}`);
  });
  test('a single letter times 5 in a clock statement (no tick in sight): minutes = n * 5, h = n * 5 / 60 beside "hours"', () => {
    for (const code of ['const minutes = n * 5;', 'const hours = n / 12; out.hours = hours;', 'minutes = 5 * n; label.textContent = minutes + " minutes";', 'const clock = k * 5; show(clock);']) assert.ok(hits(code, 'tick5').length > 0, `missed: ${code}`);
  });
  test('every wrapper', () => { for (const K of FIVE.slice(0, 6)) inEveryWrapper('five', `const minutesIn = (tick - dayStartTick) * ${K};`, 'tick5'); });
});

describe('RECALL: a frame offset times a constant named for the step (the constant is written elsewhere)', () => {
  const UNITS = ['FIVE_MIN', 'FIVE_MINUTES', 'FIVE_MIN_MS', 'STEP_MS', 'MS_PER_STEP', 'MINUTE_MS', 'stepMs', 'tickMs', 'minutesPerStep', 'SECONDS_PER_TICK', 'cfg.stepMs', 'this.msPerTick', 'FRAME_SECONDS', 'MS_PER_FRAME'];
  test('(x - 1) * UNIT, UNIT * (x - 1), (tick - start) * UNIT, with minified and tick-named operands', () => {
    for (const U of UNITS) for (const T of [...MINIFIED, ...TICK_NAMES.slice(0, 6)]) for (const code of [`const at = START + (${T} - 1) * ${U};`, `const at = ${U} * (${T} - 1) + START;`, `return START + (${T}-1)*${U}`]) assert.ok(hits(code, 'tick5').length > 0, `missed: ${code}`);
    for (const U of UNITS.slice(0, 5)) for (const code of [`const at = START + (tick - dayStart) * ${U};`, `const at = START + (state.tick - state.start) * ${U};`]) assert.ok(hits(code, 'tick5').length > 0, `missed: ${code}`);
  });
  test('the same operand next to a name that is not a step is not a tick formula: page sizes, widths, gaps, heights, a difference of two timestamps', () => {
    for (const U of ['PAGE_SIZE', 'pageSize', 'minWidth', 'rowHeight', 'gap', 'GRID', 'padding', 'lineHeight', 'MAX_ITEMS', 'cfg.pageSize']) for (const T of MINIFIED) for (const code of [`const o = (${T} - 1) * ${U};`, `const o = ${U} * (${T} - 1);`]) assert.deepEqual(hits(code, 'tick5').map((h) => h.text), [], `false positive: ${code}`);
    for (const code of ['const d = (end - start) * MS_PER_STEP;', 'const d = (a - b) * stepMs;', 'const t = tickMs * stepMs;', 'const t = STEP_MS * 2;', 'x = (y - 1) * Math.PI;']) assert.deepEqual(hits(code, 'tick5').map((h) => h.text), [], `false positive: ${code}`);
  });
});

describe('RECALL: a label that ends with a month plus a day variable (TM-V16)', () => {
  test('"Gettysburg, July " + day, "Day 2 - July " + d, `` "Wed, Jul " + tab ``; not "Line of March " + x, not a month inside a longer word', () => {
    for (const code of ['document.title = "Gettysburg, July " + day;', 'const t = "Day 2 - July " + d;', "const t = 'Wed, Jul ' + tab;", 'const t = "Battle of Gettysburg, JULY " + day;', 'const t = "The third day, August " + (d);']) assert.ok(monthSites(code).length > 0, `missed: ${code}`);
    for (const code of ['const t = "Line of March " + x;', 'const t = "Julyan " + x;', 'const t = "Mayor " + x;', 'const t = "Doctor Marchetti " + x;', 'const t = "Decatur " + x;', 'const t = "The Octagon " + x;']) assert.deepEqual(monthSites(code).map((s) => s.text), [], `false positive: ${code}`);
  });
});

describe('an adversarial probe list written after the fact (spellings and shapes nobody generated)', () => {
  const POS = ['const m = new Date(1863, 6, 1, 5, tick * 5);', 'd.setMinutes((tick - 1) * 5);', 'const h = ~~(tick / 12) + 5;', 'const mm = (tick % 12) * 5;', 'const clock = Math.floor(tick * 5 / 60) + ":" + pad(tick * 5 % 60);', 'const t = 300 + frame * 5;', 'let minutes = 300; minutes += tick * 5;', 'const secs = (tick - 1) * 300;',
    'const when = new Date(Date.UTC(1863, 6, 1, 5) + tick * 300000);', 'const date = "July " + (Math.floor(tick / 225) + 1);', 'const names = {1:"July 1",2:"July 2",3:"July 3"}; return names[tab];', 'const dayLabel = tab === 1 ? "July 1" : tab === 2 ? "July 2" : "July 3";', 'el.textContent = "3:00 PM";', "el.textContent = '3 p.m.'",
    'x = `${hour % 12 || 12}:${minute} ${hour < 12 ? "AM" : "PM"}`', 'const stepMinutes = 5;', 'const MINUTES_PER_TICK = 5', 'const msPerTick = 5 * 60 * 1000;', 'const TICKS_PER_HOUR = 12;', 'cfg.tickSeconds = 300;', 'const start = new Date("1863-07-01T05:00:00");', 'Date.parse("1863-07-03T15:00")',
    'const minutes = (tick - 1) * 5, hours = Math.floor(minutes / 60);', 'const clockMin = 5 * 60 + (t - 1) * 5;', 'const base = 5 * 3600; const secs = base + t * 300;', 'const FIVE_MIN = 5 * 60 * 1000; const at = START + (t - 1) * FIVE_MIN;'];
  const NEG = ['const ttl = 5 * 60 * 1000;', 'setTimeout(f, 300000);', 'const pages = Math.ceil(n / 12);', 'const px = (a - b) * 5;', 'if (v < 3e5) return;', 'const x = 5 * (1 - t);', 'const color = hsl(h * 60, 50, 50);', 'for (let i = 0; i < 12; i++) m.push(i * 5);', 'const range = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];',
    'const secondsInDay = 24 * 60 * 60;', 'const dozen = 12; const total = dozen * 5;', 'const lat = 39.8 + y * 5e-5;', 'const rowHeight = 5 * 12;', 'const fontSize = 12 * 5 / 4;', 'const dpr = window.devicePixelRatio * 5;', 'const items = Array.from({length: 12}, (_, i) => i * 5);', 'const volume = level * 5 / 12;',
    'const t = Date.now() / 1000;', 'const timeoutMs = 18000;', 'if (x === 300000) y();', 'const id = "U-12-5";', 'label = "5 min read";'];
  for (const code of POS) test(`caught: ${code}`, () => assert.ok(hits(code).length > 0 || monthSites(code).length > 0, code));
  for (const code of NEG) test(`quiet: ${code}`, () => assert.deepEqual(hits(code).map((h) => h.bucket + '/' + h.id), [], code));
});

describe('RECALL: the 4/5/6 hour base in minutes, seconds and milliseconds, in any spelling', () => {
  const H = [4, 5, 6];
  const spell = (h) => ({
    minutes: [`${h} * 60`, `60 * ${h}`, `(${h} * 60)`, `${h}*60`, `60*${h}`, `${h} * 6e1`, `${h} * 60.0`, `${h}.0 * 60`, `(${h}) * (60)`],
    seconds: [`${h} * 3600`, `3600 * ${h}`, `${h} * 60 * 60`, `60 * 60 * ${h}`, `${h} * 3_600`, `${h * 3600}`, `${h * 3600}.0`, literals(h * 3600).find((s) => /e/.test(s)) || `${h * 3600}`, `${h * 3}_600`.replace(/^(\d)_/, '$1') && `${h * 3600}`],
    ms: [`${h} * 3600000`, `${h} * 3600 * 1000`, `${h} * 60 * 60 * 1000`, `1000 * 60 * 60 * ${h}`, `${h} * 3.6e6`, `${h * 3600000}`, `${h * 3600000}`.replace(/\B(?=(\d{3})+(?!\d))/g, '_'), `${h} * 3_600_000`, `${h} * 60 * 60000`],
  });
  for (const unit of ['minutes', 'seconds', 'ms']) test(`${unit}: products always, bare values when named like a base or in a clock statement`, () => {
    for (const h of H) for (const s of spell(h)[unit]) {
      const product = /[*]/.test(s);
      for (const code of [`const base = ${s};`, `const dayStartSec = ${s} + offset;`, `return ${s} + M;`, `x = (${s} + M) / 60;`, `let START_MIN = ${s};`]) {
        const asserted = product || /base|START/i.test(code) || /dayStart/.test(code);
        if (asserted) assert.ok(hits(code, 'minutes').length > 0, `missed: ${code}`);
      }
      for (const code of [`const hours = ${s} / 3600; const minutes = ${s};`, `const at = new Date(base + ${s}).getHours();`]) assert.ok(hits(code, 'minutes').length > 0 || hits(code).length > 0, `missed: ${code}`);
    }
  });
  test('the legacy literal shapes stay caught and named constants too: BASE_MIN = 300, dayStartHour: 5, DAY_START_MIN = 360', () => {
    for (const code of ['const BASE_MIN = 300;', 'const baseMinutes = 360;', 'const DAY_START_MIN = 240;', 'cfg = { dayStartHour: 5 };', 'const firstHour = 6;', 'const startMinutes = 300']) assert.ok(hits(code, 'minutes').length > 0, `missed: ${code}`);
  });
  test('every wrapper', () => { for (const s of ['5 * 60', '60 * 5', '5 * 3600', '18000', '5 * 60 * 60 * 1000']) inEveryWrapper('hb', `const START = ${s};`, 'minutes'); });
});

describe('RECALL: a month plus a constant, a literal date table and the forms a date is built in', () => {
  const MONTHS = ['July', 'Jul', 'july', 'JULY', 'August', 'Aug'];
  test('template / concatenation / array / call forms of "July " + (tab + N), every month spelling and operator spacing', () => {
    for (const M of MONTHS) for (const T of ['tab', 'day', 'd', 'dayIdx', 'this.tab', 'state.day', 'x']) for (const code of [
      `\`${M} \${${T} + 2}\``, `\`${M} \${${T}+1}, 1863\``, `\`${M} \${${T} - 1}\``, `\`${M} \${2 + ${T}}\``, `"${M} " + (${T} + 2)`, `'${M} ' + (${T}+2)`, `"${M}"+(${T}+1)`, `"${M} " + (2 + ${T})`, `["${M} ", ${T} + 2]`, `"${M} ".concat(${T} + 2)`, `"${M} " + String(${T} + 2)`, `"${M} " + Number(${T}) + 1`.replace('+ Number(' + T + ') + 1', '+ Number(' + T + ' + 1)')]) {
      assert.ok(hits(code, 'date').length > 0, `missed: ${code}`);
    }
  });
  const LITS = (n, { month = 'July', quote = '"', weekday = '', year = '', ord = '' } = {}) => Array.from({ length: n }, (_, i) => `${quote}${weekday ? ['Wed', 'Thu', 'Fri'][i] + ', ' : ''}${month} ${i + 1}${ord ? ['st', 'nd', 'rd'][i] : ''}${year ? ', 1863' : ''}${quote}`);
  const VARIANTS = [{}, { quote: "'" }, { quote: '`' }, { month: 'Jul' }, { month: 'august' }, { weekday: true }, { year: true }, { ord: true }, { month: 'July', quote: "'", year: true }];
  test('an array of dates indexed by the tab: every quote, month spelling, weekday, year, ordinal; 2-3 entries; every indexer', () => {
    let n = 0;
    for (const v of VARIANTS) for (const len of [2, 3]) for (const idx of ['tab - 1', 'tab-1', 'day', 'd - 1', 'i', 'tabIndex', 'Math.min(tab, 3) - 1', 'this.tab - 1', 'dayIdx', 'currentDay - 1']) {
      const arr = `[${LITS(len, v).join(', ')}]`; for (const code of [`const dayText = ${arr}[${idx}];`, `const DAYS = ${arr};\nconst dayText = DAYS[${idx}];`, `const DAYS = ${arr}; function lbl(x) { return DAYS[${idx}]; }`, `label.textContent = ${arr.replace(/, /g, ',\n  ')}[${idx}];`]) { assert.ok(hits(code, 'date').length > 0 && monthSites(code).length > 0, `missed: ${cap(code)}`); n++; }
    }
    assert.ok(n > 600, String(n));
  });
  test('an object keyed by the day, a ternary chain and a switch of dates', () => {
    for (const v of VARIANTS) for (const code of [
      `const D = { 1: ${LITS(3, v)[0]}, 2: ${LITS(3, v)[1]}, 3: ${LITS(3, v)[2]} };\nconst t = D[tab];`, `const t = { "1": ${LITS(3, v)[0]}, "2": ${LITS(3, v)[1]} }[day];`,
      `const t = tab === 1 ? ${LITS(3, v)[0]} : tab === 2 ? ${LITS(3, v)[1]} : ${LITS(3, v)[2]};`, `const t = day === 1 ? ${LITS(3, v)[0]} : ${LITS(3, v)[1]};`,
      `switch (tab) { case 1: return ${LITS(3, v)[0]}; case 2: return ${LITS(3, v)[1]}; }`]) assert.ok(hits(code, 'date').length > 0 && monthSites(code).length > 0, `missed: ${cap(code)}`);
  });
  test('the re-verifier probe and its day-first, nbsp and inline-in-markup forms', () => {
    for (const code of ['const dayText = ["July 1", "July 2", "July 3"][tab - 1];', 'const d = ["1 July", "2 July"][day];', 'const d = ["July&nbsp;1", "July&nbsp;2"][day];', 'const d = ["July 1", "July 2"][day];', '<script>const d = ["July 1", "July 2", "July 3"][tab - 1];</script>', 'var d=["July 1","July 2","July 3"][t-1]']) assert.ok(hits(code, 'date').length > 0 || monthSites(code).length > 0, `missed: ${code}`);
  });
  test('a Date built in code from a tick, 1863 or a 5-minute constant, and the date libraries', () => {
    for (const code of ['new Date(1863, 6, tab + 2)', 'new Date("1863-07-0" + tab)', 'Date.UTC(1863, 6, d)', 'new Date(Date.UTC(1863,6,1) + tick * 60000)', 'Date.parse("1863-07-03T15:00")', 'd.setDate(d.getDate() + 1)', 'd.setHours(h + 1)', 'moment("1863-07-03")', 'dayjs(ms).format("h:mm A")', 'import dayjs from "dayjs"', "const { DateTime } = require('luxon')", 'DateTime.fromMillis(ms)', 'Temporal.PlainDateTime.from(x)']) assert.ok(hits(code, 'date').length > 0, `missed: ${code}`);
  });
});

describe('RECALL: a hand-typed clock in a string, in a template, in markup text and in an attribute (TX-05)', () => {
  const CLOCKS = ['3:00 PM', '3:00 pm', '3:00pm', '3 PM', '3pm', '3 p.m.', '3:00 p.m.', '3:00 P.M.', '12:05 AM', '11:59 pm', '03:00 PM', '10:15am', '7:30 AM', '3:00:00 PM', '12 a.m.', '1 pm'];
  const CARRIERS = {
    'double quotes': (c) => `const hit = { when: "Pickett steps off at ${c}" };`, 'single quotes': (c) => `const s = 'Hancock wounded at ${c}';`, 'template': (c) => `const s = \`At ${c} on July 3, the guns opened\`;`, 'template with a placeholder': (c) => `const s = \`\${name} fell at ${c}\`;`,
    'the clock alone': (c) => `x.textContent = "${c}";`, 'array element': (c) => `const L = ["dawn", "${c}", "dusk"];`, 'call argument': (c) => `show("Attack at ${c}", 1);`, 'concatenation': (c) => `const s = "At " + "${c}" + " the line broke";`, 'JSON-like object': (c) => `{"time":"${c}","event":"x"}`,
    'approximate': (c) => `const s = "about ${c}";`,
  };
  for (const [name, carrier] of Object.entries(CARRIERS)) test(`${name}: every spelling of the clock, in a script and in every wrapper`, () => {
    for (const c of CLOCKS) for (const [w, wrap] of Object.entries(WRAP)) assert.ok(typedClocks(wrap(carrier(c))).length >= 1 && hits(wrap(carrier(c)), 'clocktext').length >= 1, `missed [${w}]: ${cap(carrier(c))}`);
  });
  test('markup text, attributes, data attributes, aria labels, headings, table cells, entities, an inline handler and a JSON script', () => {
    for (const c of CLOCKS) for (const html of [`<p>Pickett stepped off at ${c}.</p>`, `<div class="clock" id="clock">July 1, ${c}</div>`, `<span title="${c}">x</span>`, `<td data-time="${c}">x</td>`, `<button aria-label="Jump to ${c}">go</button>`, `<h2>${c} - the charge</h2>`, `<td>${c}</td>`, `<p>${c.replace(' ', '&nbsp;')}</p>`, `<a onclick="go('${c}')">x</a>`, `<script type="application/json">{"when":"${c}"}</script>`, `<script type="application/ld+json">{"startDate":"${c}"}</script>`, `<html><body><p>at ${c}</p></body></html>`, `<meta name="description" content="Begins ${c}">`]) assert.ok(hits(html, 'clocktext', 'html').length >= 1, `missed: ${html}`);
  });
  test('a typed AM/PM marker: alone, dotted, either case, after a concatenation or a template placeholder, in a ternary', () => {
    for (const m of ['AM', 'PM', 'am', 'pm', 'A.M.', 'P.M.', 'a.m.', 'p.m.', ' AM', ' PM', ' p.m.']) for (const q of ['"', "'", '`']) for (const code of [`h >= 12 ? ${q}${m}${q} : ${q}x${q}`, `x + ${q}${m}${q}`, `label = h + ${q}${m}${q};`, `return ${q}${m}${q};`, `f(${q}${m}${q})`]) assert.ok(hits(code, 'ampm').length > 0, `missed: ${code}`);
    for (const m of ['AM', 'PM', ' pm']) for (const code of [`\`\${h}:\${mm}${m}\``, `\`\${h} ${m.trim()}\``, `\`\${h}:\${mm} ${m.trim()} on July 1\``]) assert.ok(hits(code, 'ampm').length > 0, `missed: ${code}`);
  });
  test('time-of-day formatters on anything but the visitor\'s own clock; the visitor\'s own clock is allowed wherever it sits', () => {
    for (const code of ['new Date(base + tick * 300000).toLocaleTimeString()', 'd.toLocaleTimeString("en-US")', 'const s = date.toLocaleTimeString([], {hour: "2-digit"});', 'new Date(x).toLocaleDateString()', 'd.toLocaleString("en-US", { hour: "numeric", minute: "2-digit" })', 'd.toLocaleString("en", { timeStyle: "short" })', 'd.toTimeString()', 'd.getHours()', 'd.getUTCHours()', 'd.getMinutes()', 'new Intl.DateTimeFormat("en", { hour: "numeric" })', 'const s = new Date(ms) .toLocaleTimeString()', 'x["toLocaleTimeString"]()']) { const h = findMatches(code, ['locale']); assert.ok(h.length >= 1 && h.every((x) => !x.allowed), `missed: ${code}`); }
    for (const code of ['stamp = new Date().toLocaleTimeString();', 'log.push({ time: new Date().toLocaleTimeString() })', 'new Date( ).toLocaleTimeString("en")', 'const t = new Date(Date.now()).toLocaleTimeString();', 'new Date().toLocaleString("en", { hour: "numeric" })', 'new Date().getHours()']) { const h = findMatches(code, ['locale']); assert.ok(h.length >= 1 && h.every((x) => x.allowed), `visitor's own clock must be allowed: ${code}`); }
  });
});

// ================================================================================================================ precision
describe('PRECISION: the same constants and shapes in unrelated code stay quiet', () => {
  const TIMERS = {
    'setTimeout': (K) => `setTimeout(done, ${K});`, 'setInterval': (K) => `const id = window.setInterval(refresh, ${K});`, 'ttl': (K) => `const ttl = ${K};`, 'cache option': (K) => `cache.set(key, value, { ttl: ${K} });`, 'expiry': (K) => `const expires = Date.now() + ${K};`,
    'expiry Date': (K) => `const until = new Date(Date.now() + ${K});`, 'cookie': (K) => `document.cookie = "a=b; max-age=" + (${K});`, 'maxAge': (K) => `const config = { maxAge: ${K}, retries: 3 };`, 'poll': (K) => `const POLL_INTERVAL_MS = ${K};`, 'sleep': (K) => `await sleep(${K});`,
    'retry': (K) => `const retryDelay = ${K};`, 'socket': (K) => `socket.setTimeout(${K});`, 'debounce': (K) => `const save = debounce(write, ${K});`, 'idle': (K) => `if (idleFor > ${K}) logout();`, 'deadline': (K) => `const deadline = start + ${K};`, 'timeout option': (K) => `fetch(url, { timeout: ${K} });`,
    'session': (K) => `session.lifetime = ${K};`, 'heartbeat': (K) => `const heartbeat = setInterval(ping, ${K});`,
  };
  const NOT_TIMERS = {
    'a version test': (K) => `if (browserVersion < ${K}) return;`, 'a population': (K) => `const population = ${K};`, 'a size': (K) => `const buf = new Uint8Array(${K});`, 'a list length': (K) => `const total = items.length * ${K};`, 'a price': (K) => `const cost = price * ${K} / 100;`, 'bytes': (K) => `const bytes = ${K} * 1024;`,
    'a comparison': (K) => `if (n > ${K}) { cap(n); }`, 'a limit': (K) => `const LIMIT = ${K};`, 'an id': (K) => `const id = base + ${K};`, 'a slice': (K) => `arr.slice(0, ${K})`, 'a threshold': (K) => `reportSlowTests: { max: 5, threshold: ${K} }`,
  };
  const SAMPLE = MS5.filter((_, i) => i % 3 === 0);
  for (const [name, shape] of Object.entries({ ...TIMERS, ...NOT_TIMERS })) test(`${name}: every spelling of the 5-minute step, every wrapper`, () => {
    for (const K of SAMPLE) for (const [w, wrap] of Object.entries(WRAP)) { const code = wrap(shape(K)); assert.deepEqual(hits(code).filter((h) => h.bucket !== 'clocktext').map((h) => h.id + ':' + h.text), [], `false positive [${w}]: ${cap(code)}`); }
  });
  test('the same spellings of the one-minute unit and of the hour bases in timers and unrelated code stay quiet', () => {
    for (const K of ONE_MIN_MS.filter((_, i) => i % 2 === 0)) for (const code of [`const ms = mins * ${K};`, `const ms = minutes * ${K};`, `const d = (end - start) * ${K};`, `const elapsed = (Date.now() - t0) / ${K};`, `setTimeout(f, 2 * ${K});`, `const total = count * ${K};`, `x = ${K} * rate;`]) assert.deepEqual(hits(code).map((h) => h.id), [], `false positive: ${code}`);
    for (const s of ['5 * 60', '60 * 5', '5 * 60 * 60', '18000', '5 * 3600', '5 * 60 * 60 * 1000', '21600', '14400', '18e3', '1.8e4']) for (const code of [`setTimeout(f, ${s});`, `const timeout = ${s};`, `const ttl = ${s};`, `const cacheSeconds = ${s};`, `const secs = ${s};`, `sleep(${s})`, `cfg = { maxAge: ${s} };`, `const retryDelay = ${s};`, ...(/[*]/.test(s) ? [] : [`e=${s}*(e&65535)+(e>>16)&n;`, `const buf = new Array(${s});`])]) { const h = hits(code, 'minutes'); assert.deepEqual(h.map((x) => x.text), [], `false positive: ${code}`); }
  });
  test('interpolation, geometry and pagination: 5 * (1 - t), (a - b) * 5, (max - min) * 5, (end - start) * 300, 300.0 * (z - depth), Math.floor(h * p * 5)', () => {
    for (const code of ['y = 5 * (1 - t) * D;', 'const x = (a - b) * 5;', 'const span = (max - min) * 5;', 'const d = (end - start) * 300;', 'gl.clamp(300.0 * (coord.z + u_offset - depth), 0.0, 1.0);', 'const n = Math.floor(h * p * 5);', 'const r = (1 - f) * 5 + f * 7;', 'const v = 5 * (hi - lo);', 'const pad = 5 * (gap + 1);', 'const big = 300 * (a + b);', 'O=5*(1-l.ag(l.cx,l.cx+1,y.transform.zoom))*D']) assert.deepEqual(hits(code, 'tick5').map((h) => h.text), [], `false positive: ${code}`);
  });
  test('division by 12: months to years, pages of 12, a dozen, colour maths, 12.92 and 12.5', () => {
    for (const code of ['const years = Math.floor(months / 12);', 'const pages = Math.ceil(items.length / 12);', 'const dozens = n / 12;', 'const m = monthIndex % 12;', 'i<=.04045?i/12.92:Math.pow((i+.055)/1.055,2.4)', 'a = b / 12.5', 'const cols = Math.floor(width / 12);', 'const c = Math.floor(count / 12) + 1;', 'const hue = (h / 12) * 360;']) assert.deepEqual(hits(code, 'tick5').map((h) => h.text), [], `false positive: ${code}`);
  });
  test('names that only CONTAIN tick/frame/step: ticket, stick, iframe, keyframe, requestAnimationFrame, footstep', () => {
    for (const n of ['ticket', 'stickyTop', 'iframe', 'keyframe', 'requestAnimationFrame', 'footstep', 'stepper', 'thick', 'trickle', 'slothful', 'Stepan']) for (const code of [`const m = ${n} * 5;`, `const m = 5 * ${n};`, `const ms = ${n} * 300000;`, `const ms = ${n} * 5 * 60 * 1000;`, `const h = ${n} / 12;`]) assert.deepEqual(hits(code, 'tick5').map((h) => h.text), [], `false positive: ${code}`);
  });
  test('typed clocks that are not clocks: comments, identifiers, words, CSS, numbers next to "am"/"pm" inside a word', () => {
    for (const code of ['// Pickett steps off at 3:00 PM\nconst a = 1;', '/* at 3pm */ const a = 1;', '/**\n * starts 5:00am each day\n */\nfunction f() {}', 'const x5pm = 1, v3am = 2;', 'const I = "I am 5 years old";', 'const s = "5 amps";', 'const s = "3 PMs";', 'const s = "12pmx";', 'a.am = 1; b.pm = 2;', 'const s = "campaign";', 'const s = "program 3";', 'const s = "a1pm";', 'const url = "https://x.test/3pm";'.replace('/3pm', '/x')]) assert.deepEqual(hits(code, 'clocktext').map((h) => h.text), [], `false positive: ${code}`);
    for (const html of ['<!-- Pickett steps off at 3:00 PM --><p>hello</p>', '<style>.a::after { content: "3:00 PM"; }</style><p>x</p>', '<p>The battle began in July 1863.</p>', '<script>// at 3:00 PM\nconst a = 1;</script>', '<script>/* 3pm */ const a = 1;</script>', '<p class="x5pm">x</p>', '<div id="a3am"></div>']) { assert.deepEqual(hits(html, 'clocktext', 'html').map((h) => h.text), [], `false positive: ${html}`); assert.deepEqual(typedClocks(html).map((h) => h.text), [], `false positive without a kind (sniffed as markup): ${html}`); }
  });
  test('date words that are not dates: a month in prose, a month list, a label, a count, a comparison, a template without a constant, Date.now', () => {
    for (const code of ['<p>The battle of July 1863 lasted three days; Lee left in July.</p>', 'const M = ["January","February","March"];', 'label:"Line of March",color:"#aaa"', '`July ${day}`.length', 'new Date(U+1e3*X["max-age"]).getTime()', 'new Date(expires).getTime()', 'new Date().getFullYear()', 'const t = Date.now() - start;', 'width: ${a + 2}px', 'if (July > 5) { x = "July"; }', 'const cache = new Date(ttl).getTime() > Date.now();', 'const a = ["July 1863", "Gettysburg"];', 'const s = ["July", "August"][i];', 'const d = ["July 1, 1863 - Buford"];', 'const x = ["Mar 5", "Mar 6"].length;', 'const name = ["Market 1", "Market 2"][i];']) assert.deepEqual(hits(code, 'date').map((h) => h.id), [], `false positive: ${code}`);
    assert.equal(dateTables('const DAYS = ["July 1", "July 2"]; const n = DAYS.length;').length, 0, 'a date array that is never indexed is a list, not a table');
  });
  test('time-of-day formatters on numbers, the year, ISO stamps and timestamps are not formatters', () => {
    for (const code of ['s.toLocaleString()', 'x.toLocaleString("en-US")', 'n.toLocaleString("en-US", { maximumFractionDigits: 2 })', 'new Date().getFullYear()', 'd.getDate()', 'd.toISOString()', 'Date.now()', 'performance.now()', 'd.getTime()', 'str.toLocaleLowerCase()', '"toLocaleTimeString"', '["toLocaleTimeString", "toLocaleDateString"]', 'name === "getHours"']) assert.deepEqual(hits(code, 'locale').map((h) => h.text), [], `false positive: ${code}`);
  });
  test('a corpus of common code that is not about the clock at all is quiet in every bucket', () => {
    const CORPUS = [
      'const px = 5 * 4, half = 0.5 * (a + b), size = Math.max(1, n / 12.5), hue = (h + 360) % 360, id = ((c) => c * 5.5)(2);', 'for (let i = 0; i < 6; i++) n *= 5;', 'const day = 24 * 3600;', 'setTimeout(f, 300);', 'hsl(360, 50%, 50%)', '(Math.atan2(y, x) * 180 / Math.PI + 360) % 360',
      'const grid = cols * 12, rows = Math.ceil(n / 12);', 'e.int16[5*e+0]=n', 'T=.5*(g+v)', 'const a = Math.floor(t / 10);', 'const c = 2 * Math.PI * r;', 'const area = w * h * 5;', 'const s = x * 5 + y * 60;',
      'const score = correct * 5 - wrong * 2;', 'const rate = 5 * 60 / elapsed;', 'const dpi = 300 * scale;', 'const k = 60 * fps;', 'const offset = (page - 2) * 5;'.replace('(page - 2)', '(page + 2)'), 'const ms = seconds * 1000;', 'const days = Math.floor(ms / 86400000);', 'const mins = Math.floor(secs / 60);', 'const hours = Math.floor(secs / 3600);',
      'const w = 300, h = 200, r = 5;', 'const colors = ["#ff0000", "#00ff00"];', 'ctx.lineWidth = 5;', 'const z = Math.pow(2, 12);', 'const big = 18000;', 'const n = 14400, m = 21600;', 'const B = 360 - angle;', 'const pct = (v / 12) * 100;', 'const fr = requestAnimationFrame(loop);', 'const t = performance.now() / 1000;',
      'const tick = () => { counter++; };', 'const ticks = axis.ticks(5);', 'chart.axis({ tickSize: 5, tickPadding: 12 });', 'this.step = 5; this.steps = 12;', 'for (let step = 0; step < 12; step++) draw(step);', 'const frame = 5; const f2 = frame + 12;',
      'el.style.width = 12 * unit + "px";', 'const gap = 5 * rem;', 'const total = a + b * 5;', 'const x = a * 5 / b;', 'z = 3 * 5 * 4', 'const cents = dollars * 100;', 'if (hour >= 12) { afternoon(); }', 'const h12 = hour % 12 || 12;', 'const isPm = hour >= 12;',
    ];
    for (const code of CORPUS) for (const wrap of [WRAP.statement, WRAP.minified, WRAP['page script']]) assert.deepEqual(hits(wrap(code)).map((h) => `${h.bucket}/${h.id}:${h.text}`), [], `false positive: ${code}`);
  });
});

describe('PRECISION: real-world JavaScript (node_modules) is quiet for the arithmetic buckets', () => {
  const NM = path.join(ROOT, 'node_modules'), PKGS = ['acorn', 'acorn-walk', 'ajv', 'axe-core', 'eslint-scope', 'terser', '@playwright', 'playwright-core', 'playwright', '@axe-core'];
  const walk = (d, out = []) => { let es; try { es = fs.readdirSync(d, { withFileTypes: true }); } catch { return out; } for (const e of es) { const p = path.join(d, e.name); if (e.isDirectory()) { if (e.name !== 'node_modules') walk(p, out); } else if (/\.(c|m)?js$/.test(e.name) && !/\.min\./.test(e.name)) out.push(p); } return out; };
  test('no tick5 / minutes / date-table / clocktext hit in 200+ library files (acorn, acorn-walk, ajv, axe-core, eslint-scope, terser, playwright): they are about parsing, validation, accessibility and browsers, not the battle clock', () => {
    const files = PKGS.flatMap((p) => walk(path.join(NM, p))); if (files.length < 100) return; // a checkout without dev dependencies
    const tally = {}, bad = [];
    for (const f of files) { const t = fs.readFileSync(f, 'utf8'); for (const h of findMatches(t)) { if (h.allowed) continue; const k = h.bucket + '/' + h.id; tally[k] = (tally[k] || 0) + 1; if (['tick5', 'minutes', 'clocktext'].includes(h.bucket) || h.id === 'date-table' || h.id === 'date-template' || h.id === 'date-concat') bad.push(`${path.relative(NM, f)}: ${t.slice(Math.max(0, h.index - 40), h.end + 30).replace(/\s+/g, ' ')}`); } }
    assert.deepEqual(bad, [], 'false positives on real code:\n' + bad.slice(0, 12).join('\n'));
    const real = Object.entries(tally).reduce((a, [, n]) => a + n, 0); assert.ok(real < 60, `the remaining hits are real date / 12-hour code in playwright (Date.UTC, Intl.DateTimeFormat, "pm"/"am" formatters); got ${real}: ${JSON.stringify(tally)}`);
    console.log(`# precision corpus: ${files.length} files, remaining hits ${JSON.stringify(tally)}`);
  });
});

describe('TIMER vs CLOCK in one statement: every timer word vetoes the weak (clock-statement) evidence, and without it the same statement is flagged', () => {
  // an independent list of the timer words (not imported: a word dropped from the detector must fail here)
  const TIMER_WORDS = ['setTimeout', 'timeout', 'timeoutMs', 'ttl', 'cacheTtl', 'cache', 'maxTileCacheSize', 'expires', 'expiry', 'expiration', 'max-age', 'maxAge', 'delay', 'delayMs', 'debounce', 'debounced', 'throttle', 'throttled', 'retry', 'retries', 'backoff', 'poll', 'polling', 'pollInterval', 'heartbeat', 'idle', 'idleTime', 'stale', 'staleWhileRevalidate', 'lifetime', 'cooldown', 'sleep', 'wait', 'waitFor', 'animation', 'animate', 'keepalive', 'keepAlive', 'session', 'sessionLength', 'cookie', 'cookies', 'threshold', 'budget', 'deadline', 'duration', 'setInterval'];
  test(`${TIMER_WORDS.length} timer words: "<word>(...)" beside hours / minutes / a Date and a 5-minute step is quiet; with a neutral word it is flagged`, () => {
    for (const K of MS5.filter((_, i) => i % 11 === 0)) {
      const shapes = (w) => [`const ${w} = n * ${K}, hours = 1;`, `const x = ${w}(n * ${K}, minutes);`, `const x = ${w} + n * ${K} / 60000, label = "minutes";`, `const o = { ${w}: new Date(base + n * ${K}).getHours() };`];
      for (const w of TIMER_WORDS) for (const code of shapes(w)) assert.deepEqual(hits(code, 'tick5').map((h) => h.text), [], `false positive (${w}): ${code}`);
      for (const neutral of ['total', 'span', 'width', 'label']) for (const code of shapes(neutral)) assert.ok(hits(code, 'tick5').length > 0, `missed (${neutral}): ${code}`);
    }
  });
  test('the same words veto an hour base in a clock statement, and a statement without them keeps it', () => {
    for (const w of TIMER_WORDS) assert.deepEqual(hits(`const ${w} = 18000, hours = 5;`, 'minutes').map((h) => h.text), [], w);
    for (const neutral of ['total', 'span', 'width']) assert.ok(hits(`const ${neutral} = 18000, hours = 5;`, 'minutes').length > 0, neutral);
  });
});

describe('boundaries found by mutation testing the detectors (each line kills at least one one-line mutant)', () => {
  test('a frame offset is `- 1` or a tab boundary: (x - 226) * 5, (c - 451) * K are formulas; (a * -1) * 5, (x ? -1 : 1) * 5, (2 - 1) * 5, (10 - 1) * 5 are not', () => {
    for (const code of ['const m = (x - 226) * 5;', 'const m = (x-451)*5;', 'const m = (t - 225) * 300_000;', 'const m = 5 * (t - 450);']) assert.ok(hits(code, 'tick5').length > 0, `missed: ${code}`);
    for (const code of ['const m = (a * -1) * 5;', 'const m = (x ? -1 : 1) * 5;', 'const m = (2 - 1) * 5;', 'const m = (10 - 1) * 5;', 'const m = (a * -226) * 5;', 'const m = (-1) * 5;', 'const m = (x - 2) * 5;', 'const m = (x - 1.5) * 5;', 'const m = (x - 1000) * 5;']) assert.deepEqual(hits(code, 'tick5').map((h) => h.text), [], `false positive: ${code}`);
  });
  test('the values are matched exactly: a step of 6, 4 or 5.5, 299999 or 60001 is not the 5-minute step', () => {
    for (const code of ['const m = (tick - 1) * 6;', 'const m = tick * 4;', 'const m = tick * 5.5;', 'const ms = (tick - 1) * 299999;', 'const ms = (tick - 1) * 300001;', 'const ms = tick * 60001;', 'const ms = tick * 59999;', 'const s = tick * 301;', 'const h = tick / 13;', 'const h = tick / 11;']) assert.deepEqual(hits(code, 'tick5').map((h) => h.text), [], `false positive: ${code}`);
  });
  test('bare 300 needs a tick NAME (a frame offset times 300 is too common: pages, pixels); the weak 5 needs a non-numeric operand; a numerator in a quotient is not a product', () => {
    for (const code of ['const o = (page - 1) * 300;', 'const o = 300 * (i - 1);', 'const o = (n - 226) * 300;']) assert.deepEqual(hits(code, 'tick5').map((h) => h.text), [], `false positive: ${code}`);
    for (const code of ['const o = tick * 300;', 'const o = 300 * currentTick;', 'const o = (tick - 1) * 300;']) assert.ok(hits(code, 'tick5').length > 0, `missed: ${code}`);
    for (const code of ['const minutes = 2 * 5;', 'const hours = 5 * 3;', 'const hours = 5 * 12 * 2; show(hours);']) assert.deepEqual(hits(code, 'tick5').map((h) => h.text), [], `false positive: ${code}`);
    for (const code of ['const hours = total / 5 * 60000;', 'const minutes = ms / 300 * 1000;', 'const hours = total / 60 * 5000;']) assert.deepEqual(hits(code, 'tick5').map((h) => h.text), [], `false positive: ${code}`);
  });
  test('a clock word in ANOTHER statement is not evidence (statements end at ; { } and line breaks)', () => {
    for (const code of ['const hours = 3; const n2 = k * 5;', 'show(minutes);\nconst n2 = k * 5;', 'if (hours) { go(); } const n2 = k * 5;', 'const hours = 3; const t = new Date(); const v = q * 300000;']) assert.deepEqual(hits(code, 'tick5').map((h) => h.text), [], `false positive: ${code}`);
    assert.ok(hits('const minutes = k * 5;', 'tick5').length > 0);
  });
  test('the visitor\'s own clock is not evidence either: performance.now(), Date.now() and a bare new Date() beside a step', () => {
    for (const code of ['const t = new Date(performance.now() + n * 300000);', 'const t = new Date(Date.now() + n * 300000); hours.textContent = 1;', 'const t = new Date().getTime() + n * 300000; label = "minutes";', 'const until = performance.now() + n * 300000; hours = 2;']) assert.deepEqual(hits(code, 'tick5').map((h) => h.text), [], `false positive: ${code}`);
    for (const code of ['const t = new Date(Date.UTC(1863, 6, 1) + n * 300000);', 'const t = new Date(base + n * 300000); hours.textContent = 1;']) assert.ok(hits(code, 'tick5').length > 0, `missed: ${code}`);
  });
  test('AM/PM literals count as a clock statement; a step beside a ternary of "pm" / "am" is a clock', () => {
    for (const q of ['"', "'", '`']) assert.ok(hits(`const t = n * 300000, label = h >= 12 ? ${q}pm${q} : ${q}am${q};`, 'tick5').length > 0, q);
    assert.ok(hits('const t = n * 300000, s = x.toLocaleTimeString();', 'tick5').length > 0); assert.ok(hits('const t = n * 300000, year = 1863;', 'tick5').length > 0);
  });
  test('hours per tick with a base hour: 4 + t / 12, 5 + Math.floor(t / 12), 6 + Math.trunc(n / 12) (single letters, no clock word); 7 + t / 12 is not a base', () => {
    for (const code of ['h = 4 + t / 12;', 'h = 5 + Math.floor(t / 12);', 'h = 6 + Math.trunc(n / 12);', 'const h = 6 + (n - k) / 12;']) assert.ok(hits(code, 'tick5').length > 0 || hits(code, 'minutes').length > 0, `missed: ${code}`);
    for (const code of ['h = 7 + t / 12;', 'h = 3 + Math.floor(t / 12);', 'h = 56 + t / 12;', 'h = x4 + t / 12;']) assert.deepEqual(hits(code, 'tick5').map((h) => h.text), [], `false positive: ${code}`);
  });
  test('a product with a tick operand is seconds per tick (tick5), not a base hour (minutes): (tick - 1) * 5 * 60 and tick * 5 * 3600 report once, in tick5', () => {
    for (const code of ['const s = (tick - 1) * 5 * 60;', 'const s = tick * 60 * 5;', 'const s = (x - 1) * 5 * 60;']) { assert.deepEqual(hits(code, 'minutes').map((h) => h.text), [], `reported as a base hour too: ${code}`); assert.equal(hits(code, 'tick5').length, 1, code); }
  });
  test('named base constants: dayStartHour = 4, dawnMinutes = 300, startMinutes: 240; a base name with another value is not one', () => {
    for (const code of ['const dayStartHour = 4;', 'const dawnMinutes = 300;', 'cfg = { startMinutes: 240 };', 'const openingHour = 6;', 'const baseHour = 5;']) assert.ok(hits(code, 'minutes').length > 0, `missed: ${code}`);
    for (const code of ['const dayStartHour = 7;', 'const dawnMinutes = 301;', 'const startMinutes = 24;', 'const baseHour = 50;']) assert.deepEqual(hits(code, 'minutes').map((h) => h.text), [], `false positive: ${code}`);
  });
  test('names are split into words, acronyms and camel case alike: TICKMs, FRAMEIdx, tickMS, getTick() * 5, model.currentTick() * 5, this.tick * 5', () => {
    for (const code of ['const TICKMs = 300000;', 'const m = FRAMEIdx * 5;', 'const m = getTick() * 5;', 'const m = model.currentTick() * 5;', 'const m = this.tick * 5;', 'const m = state.frameIdx * 5;', 'const stepMS = 300000;']) assert.ok(hits(code, 'tick5').length > 0, `missed: ${code}`);
  });
  test('two detectors that land on one expression count once per bucket (an overlapping hit is dropped, a hit in another bucket is kept)', () => {
    const fake = { id: 'fake-overlap', bucket: 'tick5', surface: 'x', formula: true, re: /\(tick - 1\) \* 5/g }, other = { id: 'fake-other', bucket: 'minutes', surface: 'x', formula: true, re: /\(tick - 1\) \* 5/g };
    const code = 'const m = (tick - 1) * 5;', before = findMatches(code).length;
    DETECTORS.push(fake, other); try { const got = findMatches(code); assert.equal(got.filter((h) => h.bucket === 'tick5').length, 1, 'one tick5 site'); assert.equal(got.filter((h) => h.bucket === 'minutes').length, 1, 'the other bucket keeps its own'); assert.equal(got.length, before + 1); } finally { DETECTORS.splice(DETECTORS.indexOf(fake), 1); DETECTORS.splice(DETECTORS.indexOf(other), 1); }
    assert.equal(findMatches(code).length, before);
  });
  test('one site is one hit: a step constant, a Date built from a tick, a formula with a base are each counted once per bucket', () => {
    for (const [code, bucket, n] of [['const STEP_MS = 5 * 60 * 1000;', 'tick5', 1], ['const m = (tick - 1) * 5 * 60000;', 'tick5', 1], ['const d = new Date(Date.UTC(1863, 6, 1) + (tick - 1) * 300000);', 'tick5', 1], ['const d = new Date(Date.UTC(1863, 6, 1) + (tick - 1) * 300000);', 'date', 2], ['const M = 300 + (tick - 1) * 5;', 'tick5', 1], ['const M = 300 + (tick - 1) * 5;', 'minutes', 1], ['const msPerTick = 5 * 60 * 1000;', 'tick5', 1], ['const m = (t - 1) * FIVE_MIN;', 'tick5', 1]]) assert.equal(hits(code, bucket).length, n, `${bucket} x${n}: ${code}`);
  });
  test('a Date built from a minutes value or a 5-step: new Date(t0 + m * 60000), new Date(t0 + n * 5) is a Date made of a clock (date bucket); with Date.now() it is not', () => {
    for (const code of ['const d = new Date(t0 + m * 60000);', 'const d = new Date(t0 + n * 5);', 'const d = new Date(t0 + n * 300000);', 'const d = new Date(1863, 6, 3);']) assert.ok(hits(code, 'date').length > 0, `missed: ${code}`);
    for (const code of ['const d = new Date(Date.now() + m * 60000);', 'const d = new Date(Date.now() + n * 5);', 'const d = new Date(performance.timeOrigin + performance.now() + n * 5);'.replace('performance.timeOrigin + ', ''), 'const d = new Date(x * 50);', 'const d = new Date(expires);', 'const d = new Date(ts);']) assert.deepEqual(hits(code, 'date').map((h) => h.text), [], `false positive: ${code}`);
  });
  test('month words: abbreviations in upper case, May, and a single-entry array that is not a table', () => {
    for (const code of ['"JUL " + (d + 1)', '`JUL ${d + 2}`', '"May " + (d + 2)', '`May ${d + 2}`', '"MAY " + (d+1)', "'Aug ' + (d + 1)", '"SEPT " + (d + 1)', '"Sept " + (d + 1)']) assert.ok(hits(code, 'date').length > 0, `missed: ${code}`);
    for (const code of ['const first = ["July 1"][0];', 'const d = ["July 1"];', 'const m = ["jul", "aug"][i];', 'const m = ["may", "june"][i];']) assert.deepEqual(hits(code, 'date').map((h) => h.text), [], `false positive: ${code}`);
  });
  test('typed clocks: a template script body, the markup sniffer, a clock in a <style> is not text', () => {
    for (const html of ['<script type="text/template"><p>Arrives 3 PM</p></script>', '<script type="text/template">Arrives 3 PM</script>', '<script type="text/x-handlebars-template">Opens at 10 am</script>', '<script type="importmap">{"note":"at 3pm"}</script>']) assert.ok(typedClocks(html, 'html').length > 0, `missed: ${html}`);
    assert.deepEqual(typedClocks('<!-- Pickett steps off at 3:00 PM --><p>hello</p>').map((h) => h.text), []); assert.ok(typedClocks('<p>Pickett steps off at 3:00 PM</p>').length > 0); assert.ok(typedClocks('const a = "Pickett steps off at 3:00 PM";').length > 0);
    assert.ok(typedClocks('<p>at 12 am</p>').length > 0 && typedClocks('<p>at 12 AM</p>').length > 0 && typedClocks('<p>at 11:59 PM</p>').length > 0 && typedClocks('<p>at 13 pm</p>').length === 0 && typedClocks('<p>at 0 pm</p>').length === 0 && typedClocks('<p>at 12:60 pm</p>').length === 0);
  });
  test('an AM/PM marker that is an item of a list is a table of names, one after a block is not a marker, one after a template placeholder is', () => {
    for (const code of ['const ext = ["pl", "pm"];', "{ext:['pl','pm']}", 'const m = ["x", "am", "y"];', 'f(["pm"]);']) assert.deepEqual(hits(code, 'ampm').map((h) => h.text), [], `false positive: ${code}`);
    for (const code of ['if (x) { y(); } am = 1;', 'function f() { return 1; }\nam = 2;', 'const o = {a: 1}\npm = 3;']) assert.deepEqual(hits(code, 'ampm').map((h) => h.text), [], `false positive: ${code}`);
    for (const code of ['`${h} pm`', '`${h}:${m} AM`', '`${h}am`'.replace('am', ' am')]) assert.ok(hits(code, 'ampm').length > 0, `missed: ${code}`);
  });
  test('the visitor\'s own clock: new Date(Date.now()).toLocaleTimeString() is allowed, new Date(ts) is not; the same through toLocaleString options and toTimeString', () => {
    for (const code of ['new Date(Date.now()).toLocaleTimeString()', 'new Date().toTimeString()', 'new Date( ).getHours()']) assert.ok(findMatches(code, ['locale']).every((h) => h.allowed) && findMatches(code, ['locale']).length > 0, code);
    for (const code of ['new Date(ts).toLocaleTimeString()', 'd.toTimeString()', 'new Date(Date.now() + 5).toLocaleTimeString()', 'new Date(x).toLocaleString("en", { hour: "numeric" })', 'x["toLocaleTimeString"]()']) assert.ok(findMatches(code, ['locale']).length > 0 && findMatches(code, ['locale']).every((h) => !h.allowed), code);
  });
  test('a name made of words: acronym and camel case split; `min` alone is not a step unit (minWidth), `mins` and `minutes` are', () => {
    for (const code of ['const m = (t - 1) * stepMins;', 'const m = (t - 1) * MINUTES_PER_TICK;', 'const m = (t - 1) * secondsPerStep;']) assert.ok(hits(code, 'tick5').length > 0, `missed: ${code}`);
    for (const code of ['const m = (t - 1) * minWidth;', 'const m = (t - 1) * MIN_ITEMS;', 'const m = (t - 1) * minimum;']) assert.deepEqual(hits(code, 'tick5').map((h) => h.text), [], `false positive: ${code}`);
  });
});

describe('hedgedBefore: "about 3:00 PM" and "~3pm" hedge themselves (TM-V17)', () => {
  test('a typed clock preceded by about / approximately / around / roughly / ~ / c. is hedged, a bare one is not', () => {
    for (const pre of ['about ', 'approximately ', 'around ', 'roughly ', '~', 'circa ', 'c. ', 'nearly ', 'About ']) assert.equal(hedgedBefore(`at ${pre}3:00 PM`, `at ${pre}`.length), true, pre);
    for (const pre of ['at ', 'from ', 'starting ', '']) assert.equal(hedgedBefore(`${pre}3:00 PM`, pre.length), false, pre);
  });
});
