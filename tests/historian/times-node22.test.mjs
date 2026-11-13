// times-node22.test.mjs - the clock reader of the Official Records (tools/historian/ingest/times.mjs) loads on every Node from 22 on and reads what it has always read.
//
// Why: the meridiem pattern was written with a regular-expression modifier group so that "AM" is a time and a bare "am" is not (the OCR prints "I am informed" as "1 am informed"). V8 compiles such a group from
// version 12.5 (Node 23). The container's default Node 22 could not load the file, and with it every test that builds the knowledge base: 22 of the 34 files of tests/historian, atime.test.mjs among them.
// The pattern is now spelled out in both cases and the file holds no modifier group. This file pins that the readings did not move:
//   1. no tool, test or source file of the historian holds a modifier group (the scan keeps the next one out; it is shown to see what it looks for);
//   2. the meridiem in the cases that matter: "a. m.", "A. M.", "P.M.", "AM" and "10 p.m." are read; a bare lower-case "am" or "pm" ("1 am informed") and "Am" are not;
//   3. the table PINS: hand-written phrasings of every kind the file reads (clock, range, spelled, o'clock, noon, midnight, sunrise and sunset, a modifier before the hour, a context for the meridiem) and real sentences of
//      the Official Records, each with the readings the file gave BEFORE the change (offsets, kind, minute, tolerance, modifier). candidates/r1h/ver-hist-node/gen-pins.mjs wrote the table from the old text of the file;
//   4. every spelling of the meridiem (letters in both cases, stop or none, one space, tab, line break or no-break space between the parts) against a plain statement of the rule, in the clock, the range and the spelled reading.
// The rule: a meridiem is read when it has a stop between its letters ("a. m.", "A.M", "p,m") in any case, or when it has none and both letters are capitals ("AM", "P M"); the letter after it must not run on into a word.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './lib/data.mjs';
import { parseClock } from '../../tools/historian/ingest/times.mjs';

// ---- 1. no modifier group -----------------------------------------------------------------------------------------------------------------------------------------
const MODIFIER_GROUP = /\(\?(?:[ims]+(?:-[ims]*)?|-[ims]+):/;
const SCAN = ['tools/historian', 'tests/historian', 'historian-src/core', 'historian-src/page', 'src/lib/time'];
function* codeFiles(dir) {
  let ents = []; try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of ents) { const f = path.join(dir, e.name); if (e.isDirectory()) { if (e.name !== 'node_modules') yield* codeFiles(f); } else if (/\.(?:mjs|cjs|js)$/.test(e.name)) yield f; }
}
test('no tool, test or source file of the historian holds a regular-expression modifier group (Node 22 cannot compile one)', () => {
  // what the scan looks for, built in pieces so that this file does not hold one itself
  for (const s of ['(?' + '-i:[AP])', '(?' + 'i:a)', '(?' + 'ms-i:a)', '(?' + 'm-s:a)']) assert.ok(MODIFIER_GROUP.test(s), `the scan sees ${s}`);
  for (const s of ['(?:a)', '(?=b)', '(?!b)', '(?<=c)', '(?<!c)', '(?<n>d)', 'a(?:b|c)?']) assert.ok(!MODIFIER_GROUP.test(s), `the scan leaves ${s}`);
  const hits = []; let n = 0;
  for (const d of SCAN) for (const f of codeFiles(path.join(ROOT, d))) { n++; const t = fs.readFileSync(f, 'utf8'); const m = MODIFIER_GROUP.exec(t); if (m) hits.push(`${path.relative(ROOT, f)}: ${JSON.stringify(t.slice(Math.max(0, m.index - 24), m.index + 24))}`); }
  assert.ok(n > 80, `only ${n} files scanned`);
  assert.deepEqual(hits, [], 'a modifier group is read by V8 12.5 and later only; spell the pattern out (times.mjs both() and ci)');
});

// ---- 2. the cases that matter -------------------------------------------------------------------------------------------------------------------------------------
const mins = (s, o) => parseClock(s, o).map((c) => c.min);
test('the meridiem: "a. m.", "A. M.", "P.M.", "AM" and "10 p.m." are read; a bare lower-case "am" or "pm" ("1 am informed") and "Am" are not', () => {
  assert.deepEqual(mins('left camp at 1 a. m. and crossed'), [60]);
  assert.deepEqual(mins('left camp at 1 A. M. and crossed'), [60]);
  assert.deepEqual(mins('the order came at 5.30 P.M. to advance'), [17 * 60 + 30]);
  assert.deepEqual(mins('the firing ceased about 10 AM'), [600]);
  assert.deepEqual(mins('the division halted at 10 p.m.'), [1320]);
  assert.deepEqual(mins('the division halted at 10 PM.'), [1320]);
  assert.deepEqual(mins('we marched at 4 A M and halted'), [240]);
  // read, but only the first ("1 am" is the OCR's "I am")
  assert.deepEqual(mins('as 1 am informed by him, we left at 1 a. m.'), [60]);
  // not read
  for (const s of ['as 1 am informed by him, made by Maj. Gen. A. A. Humphreys', '1 am, sir, very respectfully, your obedient servant', 'and 1 am glad to report that no individual cases',
    'we marched at 4 am', 'we marched at 4 pm', 'we marched at 4 Am', 'we marched at 4 aM', 'we marched at 4 Pm', 'we marched at 4 pM', 'we marched at 4 a m', 'we marched at 4 AMERICAN'])
    assert.deepEqual(parseClock(s), [], `"${s}" holds no clock`);
  // the same pattern is the meridiem of a range and of a spelled hour
  assert.deepEqual(parseClock('between 4 and 5 P. M.').map((c) => [c.kind, c.min]), [['range', 16 * 60 + 30]]);
  assert.deepEqual(parseClock('between 4 and 5 pm'), []);
  assert.deepEqual(parseClock('half past four AM').map((c) => [c.kind, c.min]), [['spelled', 270]]);
  assert.deepEqual(parseClock('half past four am').map((c) => [c.kind, c.min]), [['spelled', null]]);
});

// ---- 3. the table -------------------------------------------------------------------------------------------------------------------------------------------------
// 263 inputs, 240 readings (clock 113, noon 20, range 13, oclock 44, spelled 22, midnight 5, sun 23), read by the text of times.mjs at git blob cdc9c0a17c0b433fec6fc50092f3368e9428c50e under Node v24.22.1
const PINS = [
  ["Left camp at 4 a. m. and crossed the river.", null, [{"s":13,"e":20,"kind":"clock","min":240,"ampm":"am","tol":10,"mod":"at"}]],
  ["Left camp at 4 a.m. and crossed the river.", null, [{"s":13,"e":19,"kind":"clock","min":240,"ampm":"am","tol":10,"mod":"at"}]],
  ["Left camp at 4 a. m and crossed the river.", null, [{"s":13,"e":19,"kind":"clock","min":240,"ampm":"am","tol":10,"mod":"at"}]],
  ["Left camp at 4 a.m and crossed the river.", null, [{"s":13,"e":18,"kind":"clock","min":240,"ampm":"am","tol":10,"mod":"at"}]],
  ["Left camp at 4 A. M. and crossed the river.", null, [{"s":13,"e":20,"kind":"clock","min":240,"ampm":"am","tol":10,"mod":"at"}]],
  ["Left camp at 4 A.M. and crossed the river.", null, [{"s":13,"e":19,"kind":"clock","min":240,"ampm":"am","tol":10,"mod":"at"}]],
  ["Left camp at 4 A. M and crossed the river.", null, [{"s":13,"e":19,"kind":"clock","min":240,"ampm":"am","tol":10,"mod":"at"}]],
  ["Left camp at 4 P. M. and crossed the river.", null, [{"s":13,"e":20,"kind":"clock","min":960,"ampm":"pm","tol":10,"mod":"at"}]],
  ["Left camp at 4 P.M. and crossed the river.", null, [{"s":13,"e":19,"kind":"clock","min":960,"ampm":"pm","tol":10,"mod":"at"}]],
  ["Left camp at 4 p. m. and crossed the river.", null, [{"s":13,"e":20,"kind":"clock","min":960,"ampm":"pm","tol":10,"mod":"at"}]],
  ["Left camp at 4 p.m and crossed the river.", null, [{"s":13,"e":18,"kind":"clock","min":960,"ampm":"pm","tol":10,"mod":"at"}]],
  ["Left camp at 4 P. m. and crossed the river.", null, [{"s":13,"e":20,"kind":"clock","min":960,"ampm":"pm","tol":10,"mod":"at"}]],
  ["Left camp at 4 a. M. and crossed the river.", null, [{"s":13,"e":20,"kind":"clock","min":240,"ampm":"am","tol":10,"mod":"at"}]],
  ["Left camp at 4 a,m. and crossed the river.", null, [{"s":13,"e":19,"kind":"clock","min":240,"ampm":"am","tol":10,"mod":"at"}]],
  ["Left camp at 4 a, m and crossed the river.", null, [{"s":13,"e":19,"kind":"clock","min":240,"ampm":"am","tol":10,"mod":"at"}]],
  ["Left camp at 4 a .m. and crossed the river.", null, [{"s":13,"e":20,"kind":"clock","min":240,"ampm":"am","tol":10,"mod":"at"}]],
  ["Left camp at 4 a . m. and crossed the river.", null, [{"s":13,"e":21,"kind":"clock","min":240,"ampm":"am","tol":10,"mod":"at"}]],
  ["Left camp at 4 AM and crossed the river.", null, [{"s":13,"e":17,"kind":"clock","min":240,"ampm":"am","tol":10,"mod":"at"}]],
  ["Left camp at 4 PM and crossed the river.", null, [{"s":13,"e":17,"kind":"clock","min":960,"ampm":"pm","tol":10,"mod":"at"}]],
  ["Left camp at 4 A M and crossed the river.", null, [{"s":13,"e":18,"kind":"clock","min":240,"ampm":"am","tol":10,"mod":"at"}]],
  ["Left camp at 4 P M and crossed the river.", null, [{"s":13,"e":18,"kind":"clock","min":960,"ampm":"pm","tol":10,"mod":"at"}]],
  ["Left camp at 4 A.M and crossed the river.", null, [{"s":13,"e":18,"kind":"clock","min":240,"ampm":"am","tol":10,"mod":"at"}]],
  ["Left camp at 4 AM. and crossed the river.", null, [{"s":13,"e":18,"kind":"clock","min":240,"ampm":"am","tol":10,"mod":"at"}]],
  ["Left camp at 4 PM, and crossed the river.", null, [{"s":13,"e":17,"kind":"clock","min":960,"ampm":"pm","tol":10,"mod":"at"}]],
  ["Left camp at 4 AM and and crossed the river.", null, [{"s":13,"e":17,"kind":"clock","min":240,"ampm":"am","tol":10,"mod":"at"}]],
  ["Left camp at 4 am and crossed the river.", null, []],
  ["Left camp at 4 pm and crossed the river.", null, []],
  ["Left camp at 4 Am and crossed the river.", null, []],
  ["Left camp at 4 Pm and crossed the river.", null, []],
  ["Left camp at 4 aM and crossed the river.", null, []],
  ["Left camp at 4 pM and crossed the river.", null, []],
  ["Left camp at 4 a m and crossed the river.", null, []],
  ["Left camp at 4 p m and crossed the river.", null, []],
  ["Left camp at 4 A m and crossed the river.", null, []],
  ["Left camp at 4 a  m and crossed the river.", null, []],
  ["Left camp at 4 A  M and crossed the river.", null, []],
  ["Left camp at 4 a..m and crossed the river.", null, []],
  ["Left camp at 4 A-M and crossed the river.", null, []],
  ["Left camp at 4 AMs and crossed the river.", null, []],
  ["Left camp at 4 AMERICAN and crossed the river.", null, []],
  ["Left camp at 4 a. -m. and crossed the river.", null, []],
  ["Left camp at 4 p. im and crossed the river.", null, []],
  ["The order came at 10 a. m. to advance.", null, [{"s":18,"e":26,"kind":"clock","min":600,"ampm":"am","tol":10,"mod":"at"}]],
  ["The order came at 10.30 a. m. to advance.", null, [{"s":18,"e":29,"kind":"clock","min":630,"ampm":"am","tol":5,"mod":"at"}]],
  ["The order came at 3:15 p.m. to advance.", null, [{"s":18,"e":27,"kind":"clock","min":915,"ampm":"pm","tol":5,"mod":"at"}]],
  ["The order came at 4.30 p. m. to advance.", null, [{"s":18,"e":28,"kind":"clock","min":990,"ampm":"pm","tol":5,"mod":"at"}]],
  ["The order came at 4 : 30 P. M. to advance.", null, [{"s":18,"e":30,"kind":"clock","min":990,"ampm":"pm","tol":5,"mod":"at"}]],
  ["The order came at 12 p. m. to advance.", null, [{"s":18,"e":26,"kind":"clock","min":null,"ampm":null,"tol":10,"mod":"at","cand":[0,720]}]],
  ["The order came at 12 a. m. to advance.", null, [{"s":18,"e":26,"kind":"clock","min":null,"ampm":null,"tol":10,"mod":"at","cand":[0,720]}]],
  ["The order came at 12 P. M. to advance.", null, [{"s":18,"e":26,"kind":"clock","min":null,"ampm":null,"tol":10,"mod":"at","cand":[0,720]}]],
  ["The order came at 1 a. m. to advance.", null, [{"s":18,"e":25,"kind":"clock","min":60,"ampm":"am","tol":10,"mod":"at"}]],
  ["The order came at 11.59 p. m. to advance.", null, [{"s":18,"e":29,"kind":"clock","min":1439,"ampm":"pm","tol":5,"mod":"at"}]],
  ["The order came at 13 p. m. to advance.", null, []],
  ["The order came at 0 a. m. to advance.", null, []],
  ["The order came at 9.75 a. m. to advance.", null, []],
  ["The order came at 10 AM to advance.", null, [{"s":18,"e":23,"kind":"clock","min":600,"ampm":"am","tol":10,"mod":"at"}]],
  ["The order came at 10.30 PM to advance.", null, [{"s":18,"e":26,"kind":"clock","min":1350,"ampm":"pm","tol":5,"mod":"at"}]],
  ["The order came at 12 m. to advance.", null, [{"s":18,"e":23,"kind":"noon","min":720,"ampm":"pm","tol":10,"mod":"at","word":"12 m."}]],
  ["The order came at 12 M. to advance.", null, [{"s":18,"e":23,"kind":"noon","min":720,"ampm":"pm","tol":10,"mod":"at","word":"12 m."}]],
  ["The order came at twelve m. to advance.", null, [{"s":18,"e":27,"kind":"noon","min":720,"ampm":"pm","tol":10,"mod":"at","word":"12 m."}]],
  ["The order came at 12 m. and to advance.", null, [{"s":18,"e":23,"kind":"noon","min":720,"ampm":"pm","tol":10,"mod":"at","word":"12 m."}]],
  ["The order came at 12 meridian to advance.", null, []],
  ["It was about 4 p. m. when the firing began.", null, [{"s":13,"e":20,"kind":"clock","min":960,"ampm":"pm","tol":10,"mod":"about"}]],
  ["It was near 4 p. m. when the firing began.", null, [{"s":12,"e":19,"kind":"clock","min":960,"ampm":"pm","tol":10,"mod":"about"}]],
  ["It was nearly 4 p. m. when the firing began.", null, [{"s":14,"e":21,"kind":"clock","min":960,"ampm":"pm","tol":10,"mod":"about"}]],
  ["It was before 4 p. m. when the firing began.", null, [{"s":14,"e":21,"kind":"clock","min":960,"ampm":"pm","tol":10,"mod":"before"}]],
  ["It was by 4 p. m. when the firing began.", null, [{"s":10,"e":17,"kind":"clock","min":960,"ampm":"pm","tol":10,"mod":"by"}]],
  ["It was after 4 p. m. when the firing began.", null, [{"s":13,"e":20,"kind":"clock","min":960,"ampm":"pm","tol":10,"mod":"after"}]],
  ["It was until 4 p. m. when the firing began.", null, [{"s":13,"e":20,"kind":"clock","min":960,"ampm":"pm","tol":10,"mod":"until"}]],
  ["It was till 4 p. m. when the firing began.", null, [{"s":12,"e":19,"kind":"clock","min":960,"ampm":"pm","tol":10,"mod":"until"}]],
  ["It was at 4 p. m. when the firing began.", null, [{"s":10,"e":17,"kind":"clock","min":960,"ampm":"pm","tol":10,"mod":"at"}]],
  ["It was exactly 4 p. m. when the firing began.", null, [{"s":15,"e":22,"kind":"clock","min":960,"ampm":"pm","tol":10,"mod":"at"}]],
  ["It was shortly after 4 p. m. when the firing began.", null, [{"s":21,"e":28,"kind":"clock","min":960,"ampm":"pm","tol":10,"mod":"about"}]],
  ["It was not later than 4 p. m. when the firing began.", null, [{"s":22,"e":29,"kind":"clock","min":960,"ampm":"pm","tol":10,"mod":"before"}]],
  ["It was probably 4 p. m. when the firing began.", null, [{"s":16,"e":23,"kind":"clock","min":960,"ampm":"pm","tol":10,"mod":"about"}]],
  ["The enemy attacked between 4 and 5 p. m. on the left.", null, [{"s":19,"e":40,"kind":"range","min":990,"ampm":"pm","tol":30,"mod":"between","from":960,"to":1020}]],
  ["The enemy attacked between 4 and 5 P. M. on the left.", null, [{"s":19,"e":40,"kind":"range","min":990,"ampm":"pm","tol":30,"mod":"between","from":960,"to":1020}]],
  ["The enemy attacked between 4 and 5 PM on the left.", null, [{"s":19,"e":37,"kind":"range","min":990,"ampm":"pm","tol":30,"mod":"between","from":960,"to":1020}]],
  ["The enemy attacked between 4 and 5 pm on the left.", null, []],
  ["The enemy attacked between 4 AM and 5 AM on the left.", null, [{"s":19,"e":40,"kind":"range","min":270,"ampm":"am","tol":30,"mod":"between","from":240,"to":300}]],
  ["The enemy attacked between 11 a. m. and 1 p. m. on the left.", null, [{"s":19,"e":47,"kind":"range","min":720,"ampm":"pm","tol":60,"mod":"between","from":660,"to":780}]],
  ["The enemy attacked from 10.30 a. m. to 1 p. m. on the left.", null, [{"s":19,"e":46,"kind":"range","min":705,"ampm":"pm","tol":75,"mod":"between","from":630,"to":780}]],
  ["The enemy attacked from 3 to 5 o'clock p. m. on the left.", null, [{"s":19,"e":44,"kind":"range","min":960,"ampm":"pm","tol":60,"mod":"between","from":900,"to":1020}]],
  ["The enemy attacked from 3 to 5 o'clock, p. m. on the left.", null, [{"s":29,"e":38,"kind":"oclock","min":null,"ampm":null,"tol":10,"mod":"at","cand":[300,1020]}]],
  ["The enemy attacked between 2 and 4 on the left.", null, []],
  ["The enemy attacked between 3 o'clock and 5 o'clock p. m. on the left.", null, [{"s":19,"e":56,"kind":"range","min":960,"ampm":"pm","tol":60,"mod":"between","from":900,"to":1020}]],
  ["The enemy attacked from 9 p. m. to 4 a. m. on the left.", null, [{"s":24,"e":31,"kind":"clock","min":1260,"ampm":"pm","tol":10,"mod":"at"}, {"s":35,"e":42,"kind":"clock","min":240,"ampm":"am","tol":10,"mod":"at"}]],
  ["The enemy attacked between 12 and 1 P. M. on the left.", null, [{"s":19,"e":41,"kind":"range","min":750,"ampm":"pm","tol":30,"mod":"between","from":720,"to":780}]],
  ["The enemy attacked FROM 3 TO 5 P.M. on the left.", null, [{"s":19,"e":35,"kind":"range","min":960,"ampm":"pm","tol":60,"mod":"between","from":900,"to":1020}]],
  ["The enemy attacked between 4 and 5 a. m. and 6 p. m. on the left.", null, [{"s":19,"e":40,"kind":"range","min":270,"ampm":"am","tol":30,"mod":"between","from":240,"to":300}, {"s":45,"e":52,"kind":"clock","min":1080,"ampm":"pm","tol":10,"mod":"at"}]],
  ["We halted at half past four P. M., and the guns opened.", null, [{"s":13,"e":33,"kind":"spelled","min":990,"ampm":"pm","tol":10,"mod":"at"}]],
  ["We halted at half past four, and the guns opened.", null, [{"s":13,"e":27,"kind":"spelled","min":null,"ampm":null,"tol":10,"mod":"at","cand":[270,990]}]],
  ["We halted at half past 4 pm, and the guns opened.", null, [{"s":13,"e":24,"kind":"spelled","min":null,"ampm":null,"tol":10,"mod":"at","cand":[270,990]}]],
  ["We halted at Half Past Four A.M., and the guns opened.", null, [{"s":13,"e":32,"kind":"spelled","min":270,"ampm":"am","tol":10,"mod":"at"}]],
  ["We halted at a quarter before five AM, and the guns opened.", null, [{"s":13,"e":37,"kind":"spelled","min":285,"ampm":"am","tol":10,"mod":"at"}]],
  ["We halted at a quarter to five a. m., and the guns opened.", null, [{"s":13,"e":36,"kind":"spelled","min":285,"ampm":"am","tol":10,"mod":"at"}]],
  ["We halted at a quarter past five p. m., and the guns opened.", null, [{"s":13,"e":38,"kind":"spelled","min":1035,"ampm":"pm","tol":10,"mod":"at"}]],
  ["We halted at A QUARTER AFTER SIX P. M., and the guns opened.", null, [{"s":13,"e":38,"kind":"spelled","min":1095,"ampm":"pm","tol":10,"mod":"at"}]],
  ["We halted at ten minutes before four p. m., and the guns opened.", null, [{"s":13,"e":42,"kind":"spelled","min":950,"ampm":"pm","tol":10,"mod":"at"}]],
  ["We halted at twenty minutes past 9 A. M., and the guns opened.", null, [{"s":13,"e":40,"kind":"spelled","min":560,"ampm":"am","tol":10,"mod":"at"}]],
  ["We halted at twenty-five minutes before 4 p. m., and the guns opened.", null, [{"s":13,"e":47,"kind":"spelled","min":935,"ampm":"pm","tol":10,"mod":"at"}]],
  ["We halted at five minutes to six PM, and the guns opened.", null, [{"s":13,"e":35,"kind":"spelled","min":1075,"ampm":"pm","tol":10,"mod":"at"}]],
  ["We halted at one minute past twelve p. m., and the guns opened.", null, [{"s":13,"e":41,"kind":"spelled","min":721,"ampm":"pm","tol":10,"mod":"at"}]],
  ["We halted at fifteen minutes past 7 o'clock, and the guns opened.", null, [{"s":13,"e":43,"kind":"spelled","min":null,"ampm":null,"tol":10,"mod":"at","cand":[435,1155]}]],
  ["We halted at half past four o'clock, and the guns opened.", null, [{"s":13,"e":35,"kind":"spelled","min":null,"ampm":null,"tol":10,"mod":"at","cand":[270,990]}]],
  ["We halted at half past four and the guns, and the guns opened.", null, [{"s":13,"e":27,"kind":"spelled","min":null,"ampm":null,"tol":10,"mod":"at","cand":[270,990]}]],
  ["The brigade moved at 10 o'clock on the Taneytown road.", null, [{"s":21,"e":31,"kind":"oclock","min":null,"ampm":null,"tol":10,"mod":"at","cand":[600,1320]}]],
  ["The brigade moved at 10 O'CLOCK on the Taneytown road.", null, [{"s":21,"e":31,"kind":"oclock","min":null,"ampm":null,"tol":10,"mod":"at","cand":[600,1320]}]],
  ["The brigade moved at ten o'clock on the Taneytown road.", null, [{"s":21,"e":32,"kind":"oclock","min":null,"ampm":null,"tol":10,"mod":"at","cand":[600,1320]}]],
  ["The brigade moved at five o'clock in the afternoon on the Taneytown road.", null, [{"s":21,"e":50,"kind":"oclock","min":1020,"ampm":"pm","tol":10,"mod":"at"}]],
  ["The brigade moved at 5 o'clock in the morning on the Taneytown road.", null, [{"s":21,"e":45,"kind":"oclock","min":300,"ampm":"am","tol":10,"mod":"at"}]],
  ["The brigade moved at 3 o'clock p. m. on the Taneytown road.", null, [{"s":21,"e":36,"kind":"clock","min":900,"ampm":"pm","tol":10,"mod":"at"}]],
  ["The brigade moved at 3 o'clock, p. m. on the Taneytown road.", null, [{"s":21,"e":30,"kind":"oclock","min":null,"ampm":null,"tol":10,"mod":"at","cand":[180,900]}]],
  ["The brigade moved at 3 o'clock PM on the Taneytown road.", null, [{"s":21,"e":33,"kind":"clock","min":900,"ampm":"pm","tol":10,"mod":"at"}]],
  ["The brigade moved at 8 o'clock at night on the Taneytown road.", null, [{"s":21,"e":39,"kind":"oclock","min":1200,"ampm":"pm","tol":10,"mod":"at"}]],
  ["The brigade moved at 3 oclock on the Taneytown road.", null, [{"s":21,"e":29,"kind":"oclock","min":null,"ampm":null,"tol":10,"mod":"at","cand":[180,900]}]],
  ["The brigade moved at 3 o'cleck on the Taneytown road.", null, [{"s":21,"e":30,"kind":"oclock","min":null,"ampm":null,"tol":10,"mod":"at","cand":[180,900]}]],
  ["The brigade moved at 3 o'clcck on the Taneytown road.", null, [{"s":21,"e":30,"kind":"oclock","min":null,"ampm":null,"tol":10,"mod":"at","cand":[180,900]}]],
  ["The brigade moved at 3 o'clack on the Taneytown road.", null, []],
  ["The brigade moved at 3 o\u2019clock on the Taneytown road.", null, [{"s":21,"e":30,"kind":"oclock","min":null,"ampm":null,"tol":10,"mod":"at","cand":[180,900]}]],
  ["The brigade moved at 3 o' clock on the Taneytown road.", null, [{"s":21,"e":31,"kind":"oclock","min":null,"ampm":null,"tol":10,"mod":"at","cand":[180,900]}]],
  ["The brigade moved at 3 o'  clock on the Taneytown road.", null, []],
  ["The brigade moved at 10.30 o'clock on the Taneytown road.", null, [{"s":21,"e":34,"kind":"oclock","min":null,"ampm":null,"tol":10,"mod":"at","cand":[630,1350]}]],
  ["The brigade moved at 3 in the afternoon on the Taneytown road.", null, [{"s":21,"e":39,"kind":"oclock","min":900,"ampm":"pm","tol":10,"mod":"at"}]],
  ["The brigade moved about 8 in the morning on the Taneytown road.", null, [{"s":24,"e":40,"kind":"oclock","min":480,"ampm":"am","tol":10,"mod":"about"}]],
  ["The brigade moved at 4 in the evening on the Taneytown road.", null, [{"s":21,"e":37,"kind":"oclock","min":960,"ampm":"pm","tol":10,"mod":"at"}]],
  ["The attack was ordered noon and failed.", null, [{"s":23,"e":27,"kind":"noon","min":725,"ampm":"pm","tol":10,"mod":"at","word":"noon"}]],
  ["The attack was ordered at midnight and failed.", null, [{"s":26,"e":34,"kind":"midnight","min":0,"ampm":null,"tol":10,"mod":"at","word":"midnight"}]],
  ["The attack was ordered at daylight and failed.", null, [{"s":23,"e":34,"kind":"sun","min":265,"ampm":"am","tol":25,"mod":"at","word":"daylight"}]],
  ["The attack was ordered at sunrise and failed.", null, [{"s":26,"e":33,"kind":"sun","min":295,"ampm":"am","tol":25,"mod":"at","word":"sunrise"}]],
  ["The attack was ordered near sunset and failed.", null, [{"s":28,"e":34,"kind":"sun","min":1165,"ampm":"pm","tol":25,"mod":"about","word":"sunset"}]],
  ["The attack was ordered at dusk and failed.", null, [{"s":26,"e":30,"kind":"sun","min":1195,"ampm":"pm","tol":25,"mod":"at","word":"dusk"}]],
  ["The attack was ordered at nightfall and failed.", null, [{"s":26,"e":35,"kind":"sun","min":1210,"ampm":"pm","tol":25,"mod":"at","word":"nightfall"}]],
  ["The attack was ordered at daybreak and failed.", null, [{"s":26,"e":34,"kind":"sun","min":265,"ampm":"am","tol":25,"mod":"at","word":"daybreak"}]],
  ["The attack was ordered at sun-up and failed.", null, [{"s":26,"e":32,"kind":"sun","min":295,"ampm":"am","tol":25,"mod":"at","word":"sunup"}]],
  ["The attack was ordered about mid-day and failed.", null, [{"s":29,"e":36,"kind":"noon","min":725,"ampm":"pm","tol":10,"mod":"about","word":"midday"}]],
  ["The attack was ordered at break of day and failed.", null, [{"s":26,"e":38,"kind":"sun","min":265,"ampm":"am","tol":25,"mod":"at","word":"breakofday"}]],
  ["At 4 o'clock we advanced.", "in the afternoon", [{"s":3,"e":12,"kind":"oclock","min":960,"ampm":"pm","tol":10,"mod":"at"}]],
  ["A quarter before five we advanced.", "in the afternoon", [{"s":0,"e":21,"kind":"spelled","min":1005,"ampm":"pm","tol":10,"mod":"at"}]],
  ["Between 2 and 4 the enemy left.", "in the afternoon", []],
  ["At 4 o'clock we advanced.", "in the morning", [{"s":3,"e":12,"kind":"oclock","min":240,"ampm":"am","tol":10,"mod":"at"}]],
  ["A quarter before five we advanced.", "in the morning", [{"s":0,"e":21,"kind":"spelled","min":285,"ampm":"am","tol":10,"mod":"at"}]],
  ["Between 2 and 4 the enemy left.", "in the morning", []],
  ["At 4 o'clock we advanced.", "at night", [{"s":3,"e":12,"kind":"oclock","min":240,"ampm":"am","tol":10,"mod":"at"}]],
  ["A quarter before five we advanced.", "at night", [{"s":0,"e":21,"kind":"spelled","min":285,"ampm":"am","tol":10,"mod":"at"}]],
  ["Between 2 and 4 the enemy left.", "at night", []],
  ["At 4 o'clock we advanced.", "p. m.", [{"s":3,"e":12,"kind":"oclock","min":960,"ampm":"pm","tol":10,"mod":"at"}]],
  ["A quarter before five we advanced.", "p. m.", [{"s":0,"e":21,"kind":"spelled","min":1005,"ampm":"pm","tol":10,"mod":"at"}]],
  ["Between 2 and 4 the enemy left.", "p. m.", []],
  ["At 4 o'clock we advanced.", "a. m.", [{"s":3,"e":12,"kind":"oclock","min":240,"ampm":"am","tol":10,"mod":"at"}]],
  ["A quarter before five we advanced.", "a. m.", [{"s":0,"e":21,"kind":"spelled","min":285,"ampm":"am","tol":10,"mod":"at"}]],
  ["Between 2 and 4 the enemy left.", "a. m.", []],
  ["At 4 o'clock we advanced.", "evening", [{"s":3,"e":12,"kind":"oclock","min":960,"ampm":"pm","tol":10,"mod":"at"}]],
  ["A quarter before five we advanced.", "evening", [{"s":0,"e":21,"kind":"spelled","min":1005,"ampm":"pm","tol":10,"mod":"at"}]],
  ["Between 2 and 4 the enemy left.", "evening", []],
  ["as 1 am informed by him, made by Maj. Gen. A. A. Humphreys", null, []],
  ["1 am, sir, very respectfully, your obedient servant", null, []],
  ["and 1 am glad to report that no individual cases", null, []],
  ["I am 5 feet tall and 1 pm informed", null, []],
  ["June 6, 1863 \u2014 10 a.", null, []],
  ["at 10.15 p. im", null, []],
  ["at 11 a. -m.", null, []],
  ["June 10. 1863\u201410 a. m.", null, [{"s":14,"e":22,"kind":"clock","min":600,"ampm":"am","tol":10,"mod":"at"}]],
  ["on the 4 Am Brigade", null, []],
  ["The 1 PM unit and the 10 AM report", null, [{"s":4,"e":8,"kind":"clock","min":780,"ampm":"pm","tol":10,"mod":"at"}, {"s":22,"e":27,"kind":"clock","min":600,"ampm":"am","tol":10,"mod":"at"}]],
  ["No. 4 AM", null, [{"s":4,"e":8,"kind":"clock","min":240,"ampm":"am","tol":10,"mod":"at"}]],
  ["5 pm", null, []],
  ["5 PM", null, [{"s":0,"e":4,"kind":"clock","min":1020,"ampm":"pm","tol":10,"mod":"at"}]],
  ["5 Pm", null, []],
  ["5 p.m", null, [{"s":0,"e":5,"kind":"clock","min":1020,"ampm":"pm","tol":10,"mod":"at"}]],
  ["5 P.M", null, [{"s":0,"e":5,"kind":"clock","min":1020,"ampm":"pm","tol":10,"mod":"at"}]],
  ["2d Brigade, 3 p. m. to 4 p. m.", null, [{"s":12,"e":19,"kind":"clock","min":900,"ampm":"pm","tol":10,"mod":"at"}, {"s":23,"e":30,"kind":"clock","min":960,"ampm":"pm","tol":10,"mod":"at"}]],
  ["4 p. m.4 p. m.", null, [{"s":0,"e":7,"kind":"clock","min":960,"ampm":"pm","tol":10,"mod":"at"}]],
  ["4 p. m. 5 a. m. 6 AM 7 am", null, [{"s":0,"e":7,"kind":"clock","min":960,"ampm":"pm","tol":10,"mod":"at"}, {"s":8,"e":15,"kind":"clock","min":300,"ampm":"am","tol":10,"mod":"at"}, {"s":16,"e":20,"kind":"clock","min":360,"ampm":"am","tol":10,"mod":"at"}]],
  ["a. m. p. m. 4 5 a m", null, []],
  ["", null, []],
  ["   ", null, []],
  ["no clock here", null, []],
  ["123456 a. m.", null, []],
  ["4.30.30 p. m.", null, []],
  ["4:3 p. m.", null, []],
  ["(4 p. m.)", null, [{"s":1,"e":8,"kind":"clock","min":960,"ampm":"pm","tol":10,"mod":"at"}]],
  ["\"4 p. m.\"", null, [{"s":1,"e":8,"kind":"clock","min":960,"ampm":"pm","tol":10,"mod":"at"}]],
  ["4\np. m.", null, [{"s":0,"e":7,"kind":"clock","min":960,"ampm":"pm","tol":10,"mod":"at"}]],
  ["4\n a. m.", null, [{"s":0,"e":8,"kind":"clock","min":240,"ampm":"am","tol":10,"mod":"at"}]],
  ["4\u00a0p.\u00a0m.", null, [{"s":0,"e":7,"kind":"clock","min":960,"ampm":"pm","tol":10,"mod":"at"}]],
  ["On the arrival of the latter, about 3 p. m., it took the place of the Fifth, which was ordered to take position on the extreme left.", true, [{"s":36,"e":43,"kind":"clock","min":900,"ampm":"pm","tol":10,"mod":"about"}]],
  ["About sunset the rebels retired in confusion and disorder. .", true, [{"s":6,"e":12,"kind":"sun","min":1165,"ampm":"pm","tol":25,"mod":"about","word":"sunset"}]],
  ["At 8 p. m. an assault was made from the left of the town, which was gallantly repelled by the First, Second, and Eleventh Corps.", true, [{"s":3,"e":10,"kind":"clock","min":1200,"ampm":"pm","tol":10,"mod":"at"}]],
  ["About 1 p. m. the enemy opened an artillery fire of one hundred and twenty-five guns on our center and left.", true, [{"s":6,"e":13,"kind":"clock","min":780,"ampm":"pm","tol":10,"mod":"about"}]],
  ["War Department, Washington, June 5, 1863 \u2014 3 p. m.", true, [{"s":43,"e":50,"kind":"clock","min":900,"ampm":"pm","tol":10,"mod":"at"}]],
  ["It will require until the morning of the 9th for my forces to gain their positions, and at daylight on that day it is my intention to attack them in their camps.", true, [{"s":88,"e":99,"kind":"sun","min":265,"ampm":"am","tol":25,"mod":"at","word":"daylight"}]],
  ["Washington, Jime 14, 1863\u201412 midnight.", true, [{"s":29,"e":37,"kind":"midnight","min":0,"ampm":null,"tol":10,"mod":"at","word":"midnight"}]],
  ["No doubt is entertained here that Milroy is surrounded at Win- chester, and so closely invested that no scout or other information has been had from him later than 11 o'clock Saturday night.", true, [{"s":164,"e":174,"kind":"oclock","min":1380,"ampm":"pm","tol":10,"mod":"after"}]],
  ["Heavy firing was heard in. that vicinity until 7 o'clock, and then ceased.", true, [{"s":47,"e":56,"kind":"oclock","min":null,"ampm":null,"tol":10,"mod":"until","cand":[420,1140]}]],
  ["Headquarters Army op the Potomac, Fairfax Station, June 16, 1863\u2014 Midnight.", true, [{"s":66,"e":74,"kind":"midnight","min":0,"ampm":null,"tol":10,"mod":"at","word":"midnight"}]],
  ["My orders are out to marcli at 3 o'clock to-morrow mommg.", true, [{"s":31,"e":40,"kind":"oclock","min":null,"ampm":null,"tol":10,"mod":"at","cand":[180,900]}]],
  ["Your dispatch of 10 p. m. received by me at 1 a. m.", true, [{"s":17,"e":25,"kind":"clock","min":1320,"ampm":"pm","tol":10,"mod":"at"}, {"s":44,"e":51,"kind":"clock","min":60,"ampm":"am","tol":10,"mod":"at"}]],
  ["A bridge sufficient to cross the Potomac is also to be at that point at noon to-day.", true, [{"s":72,"e":76,"kind":"noon","min":725,"ampm":"pm","tol":10,"mod":"at","word":"noon"}]],
  ["The fight com- menced about 7 o'clock, and for several hours raged with great vio- lence.", true, [{"s":28,"e":37,"kind":"oclock","min":null,"ampm":null,"tol":10,"mod":"about","cand":[420,1140]}]],
  ["Washington : General Hooker personally has just left here for Harper's Ferry, where he will be about 11 o'clock.", true, [{"s":101,"e":111,"kind":"oclock","min":null,"ampm":null,"tol":10,"mod":"about","cand":[660,1380]}]],
  ["Copies of all dispatches should be sent to Frederick and Harper's Ferry up to 11 a. m., and after that to Fred- erick.", true, [{"s":78,"e":86,"kind":"clock","min":660,"ampm":"am","tol":10,"mod":"until"}]],
  ["Washington, D. C, Jtme 27, 1863\u201412 m.", true, [{"s":32,"e":37,"kind":"noon","min":720,"ampm":"pm","tol":10,"mod":"at","word":"12 m."}]],
  ["Wait attack until 4 p. m. to-morrow.", true, [{"s":18,"e":25,"kind":"clock","min":960,"ampm":"pm","tol":10,"mod":"until"}]],
  ["General-in- Chief : The a rmy was set in motion this morning at daylight, four corps being directed to this place and three to Harper's Ferry.", true, [{"s":61,"e":72,"kind":"sun","min":265,"ampm":"am","tol":25,"mod":"at","word":"daylight"}]],
  ["One bridge is completed at Harper's Ferry, and one will be completed at this point by 8 a. m. to-morrow.", true, [{"s":86,"e":93,"kind":"clock","min":480,"ampm":"am","tol":10,"mod":"by"}]],
  ["Before 11 a. m. every desirable point of observation was occupied by a signal officer, and communication opened from General Meade's headquarters to those of every corps commander.", true, [{"s":7,"e":15,"kind":"clock","min":660,"ampm":"am","tol":10,"mod":"before"}]],
  ["Arriving at Elk Mountain 11 a. m., I opened station, and called Mon- ument until 1 p. m. ; had no reply; atmosphere was clear.", true, [{"s":25,"e":33,"kind":"clock","min":660,"ampm":"am","tol":10,"mod":"at"}, {"s":81,"e":88,"kind":"clock","min":780,"ampm":"pm","tol":10,"mod":"until"}]],
  ["Arose at 3 a. m.; prepared for an early start on the road at 5 a. m. ; moved moderately, reaching George- town, D. C, at 12.30 p. m. of 18th instant.", true, [{"s":9,"e":16,"kind":"clock","min":180,"ampm":"am","tol":10,"mod":"at"}, {"s":61,"e":68,"kind":"clock","min":300,"ampm":"am","tol":10,"mod":"at"}, {"s":121,"e":132,"kind":"clock","min":750,"ampm":"pm","tol":5,"mod":"at"}]],
  ["We arrived at 3 a. m., and as it was rain- ing very hard and Captain Daniels could not be found, we lay by till daylight.", true, [{"s":14,"e":21,"kind":"clock","min":180,"ampm":"am","tol":10,"mod":"at"}, {"s":107,"e":120,"kind":"sun","min":265,"ampm":"am","tol":25,"mod":"by","word":"daylight"}]],
  ["On your arrival, about noon, you ordered me -to send frequent dispatches to Colonel Myer at Washington, apprising him of all movements of interest.", true, [{"s":23,"e":27,"kind":"noon","min":725,"ampm":"pm","tol":10,"mod":"about","word":"noon"}]],
  ["Arrived there at 10 o'clock, just as the enemy was shelling our battery near seminary, after their rear had passed out of town.", true, [{"s":17,"e":27,"kind":"oclock","min":null,"ampm":null,"tol":10,"mod":"at","cand":[600,1320]}]],
  ["Rained nearly all night, and on the morning of the 14th was hazy till 6 o'clock, when we discovered that the enemy had abandoned his works.", true, [{"s":70,"e":79,"kind":"oclock","min":360,"ampm":"am","tol":10,"mod":"until"}]],
  ["They aU crossed here before noon.", true, [{"s":28,"e":32,"kind":"noon","min":725,"ampm":"pm","tol":10,"mod":"before","word":"noon"}]],
  ["Army of the Potomac \"by 12 o'clock on the 14th.", true, [{"s":24,"e":34,"kind":"oclock","min":null,"ampm":null,"tol":10,"mod":"by","cand":[0,720]}]],
  ["long bridge ready until 8 o'clock the next morning.", true, [{"s":24,"e":33,"kind":"oclock","min":480,"ampm":"am","tol":10,"mod":"until"}]],
  ["The regulars and the Fiftieth Regiment arrived about noon of the 16th with the Occo- quan bridges.", true, [{"s":53,"e":57,"kind":"noon","min":725,"ampm":"pm","tol":10,"mod":"about","word":"noon"}]],
  ["About sunset the enemy again opened from a knoll in front of the cemetery, distant about 1,800 yards, and this was soon followed by a powerful infantry attack on the position by.", true, [{"s":6,"e":12,"kind":"sun","min":1165,"ampm":"pm","tol":25,"mod":"about","word":"sunset"}]],
  ["The artillery of the Fifth Corps arrived on the field between 4 and 5 p. m.", true, [{"s":54,"e":75,"kind":"range","min":990,"ampm":"pm","tol":30,"mod":"between","from":960,"to":1020}]],
  ["Soon after daylight, Rigby's battery (A, Maryland, six 3-inch) was also T)laced on the hill, and at 5.30 a. m. all the tiatteries opened,", true, [{"s":5,"e":19,"kind":"sun","min":265,"ampm":"am","tol":25,"mod":"at","word":"daylight"}, {"s":100,"e":110,"kind":"clock","min":330,"ampm":"am","tol":5,"mod":"at"}]],
  ["On the eventful morning of July 1, between 7 and 8 o'clock.", true, [{"s":35,"e":58,"kind":"range","min":450,"ampm":"am","tol":30,"mod":"between","from":420,"to":480}]],
  ["No very serious demonstrations\" were made against our new position, and the hours passed away until sundown in comparative quiet.", true, [{"s":100,"e":107,"kind":"sun","min":1165,"ampm":"pm","tol":25,"mod":"until","word":"sundown"}]],
  ["At about 4 o'clock on the morning of the 3d, the enemy commenced a vigoroHS artillery attack, wliich continued for a short time, upon my position.", true, [{"s":9,"e":18,"kind":"oclock","min":240,"ampm":"am","tol":10,"mod":"about"}]],
  ["The line was steadily maintained under a brisk fire until after 3 p. m. , at which time, the ammunition being exhausted, we were re- lieved by a portion of the First Brigade.", true, [{"s":64,"e":71,"kind":"clock","min":900,"ampm":"pm","tol":10,"mod":"after"}]],
  ["It remained until noon, when it was moved to the right.", true, [{"s":18,"e":22,"kind":"noon","min":725,"ampm":"pm","tol":10,"mod":"until","word":"noon"}]],
  ["July 33. \u2014 Left camp at 6 p. m., and, marching through the night, arrived at White Plains at 3 o'clock in the morning.", true, [{"s":24,"e":31,"kind":"clock","min":1080,"ampm":"pm","tol":10,"mod":"at"}, {"s":93,"e":117,"kind":"oclock","min":180,"ampm":"am","tol":10,"mod":"at"}]],
  ["About 9 a. m. we were ordered to the right and rear of Cemetery Hill, in. support of the Twelfth Corps, which was then heavily en- gaged, remaining until about 1 p. m.", true, [{"s":6,"e":13,"kind":"clock","min":540,"ampm":"am","tol":10,"mod":"about"}, {"s":160,"e":167,"kind":"clock","min":780,"ampm":"pm","tol":10,"mod":"about"}]],
  ["At 2.30 p. m. the lines were advanced across the fields and front changed to the left until we resumed the third position of the fore- noon.", true, [{"s":3,"e":13,"kind":"clock","min":870,"ampm":"pm","tol":5,"mod":"at"}, {"s":135,"e":139,"kind":"noon","min":725,"ampm":"pm","tol":10,"mod":"at","word":"noon"}]],
  ["We fell back through Gettysburg to the high ground south of the town, and formed along the road west of the cemetery, where we were re- lieved at about 11 o'clock this a. m.", true, [{"s":152,"e":162,"kind":"oclock","min":660,"ampm":"am","tol":10,"mod":"about"}]],
  ["Having first taken position about 12 m. , the brigade did not retire until after 3 p. m., when all other troops had left the field, and only left the seminary at about .3.40 o'clock.", true, [{"s":34,"e":39,"kind":"noon","min":720,"ampm":"pm","tol":10,"mod":"about","word":"12 m."}, {"s":81,"e":88,"kind":"clock","min":900,"ampm":"pm","tol":10,"mod":"after"}]],
  ["The brigade went into position at about 11 a. m.; became engaged about noon.", true, [{"s":40,"e":48,"kind":"clock","min":660,"ampm":"am","tol":10,"mod":"about"}, {"s":71,"e":75,"kind":"noon","min":725,"ampm":"pm","tol":10,"mod":"about","word":"noon"}]],
  ["I was again ready for action by 11 a. m., but, receiving no orders, the battery remained in General Tyler's camp until the 3d instant.", true, [{"s":32,"e":40,"kind":"clock","min":660,"ampm":"am","tol":10,"mod":"by"}]],
  ["The march was resumed at daylight,\" and I re- joined the corps before its arrival on the field, which took place about 7 a. m. of the 2d.", true, [{"s":22,"e":33,"kind":"sun","min":265,"ampm":"am","tol":25,"mod":"at","word":"daylight"}, {"s":119,"e":126,"kind":"clock","min":420,"ampm":"am","tol":10,"mod":"about"}]],
  ["The Seventy-first returned to its command about midnight, without having received orders to do so, after suffering some loss.", true, [{"s":48,"e":56,"kind":"midnight","min":0,"ampm":null,"tol":10,"mod":"about","word":"midnight"}]],
  ["Before noon we had a work which served to protect the men during the artillery fire which followed.", true, [{"s":7,"e":11,"kind":"noon","min":725,"ampm":"pm","tol":10,"mod":"before","word":"noon"}]],
  ["It was now after nightfall, and, soon after, we were moved to the front, and slept on our arms all night.", true, [{"s":17,"e":26,"kind":"sun","min":1210,"ampm":"pm","tol":25,"mod":"after","word":"nightfall"}]],
  ["Soon after sunset the same evening the rain commenced to descend in torrents, wetting every one, filling the rifle-pits, and making us most uncomfortable.", true, [{"s":11,"e":17,"kind":"sun","min":1165,"ampm":"pm","tol":25,"mod":"after","word":"sunset"}]],
  ["During the shell fire, which commenced soon after 12 o'clock, the regiment was much exposed, but, fortunately, lost but 2 enlisted men, very slightly wounded by a piece of shell.", true, [{"s":50,"e":60,"kind":"oclock","min":null,"ampm":null,"tol":10,"mod":"after","cand":[0,720]}]],
  ["On the morning of the 14th, at 5 o'clock, received orders to move my brigade to the front and feel the enemy.", true, [{"s":31,"e":40,"kind":"oclock","min":300,"ampm":"am","tol":10,"mod":"at"}]],
  ["On the 24th, at 12 m., took up line of march again, reaching Mark- ham at 6 p. m.", true, [{"s":16,"e":21,"kind":"noon","min":720,"ampm":"pm","tol":10,"mod":"at","word":"12 m."}, {"s":74,"e":81,"kind":"clock","min":1080,"ampm":"pm","tol":10,"mod":"at"}]],
  ["At 4 o'clock on the morning of the 3d, we received orders to fall in, and move to the left and front, and form line of battle behind the crest of a hill.", true, [{"s":3,"e":12,"kind":"oclock","min":240,"ampm":"am","tol":10,"mod":"at"}]],
  ["Wednesday, July 15. \u2014 Took lop a line of march at 7 a. m., and ar- rived at sundown near Maryland Heights; bivouacked for the night.", true, [{"s":50,"e":57,"kind":"clock","min":420,"ampm":"am","tol":10,"mod":"at"}, {"s":76,"e":83,"kind":"sun","min":1165,"ampm":"pm","tol":25,"mod":"at","word":"sundown"}]],
  ["Thursday, July 33. \u2014 The corps. started on the march at daylight, our brigade remaining on picket until 1 p. m., when we were relieved by a brigade of the Twelfth Corps.", true, [{"s":53,"e":64,"kind":"sun","min":265,"ampm":"am","tol":25,"mod":"at","word":"daylight"}, {"s":104,"e":111,"kind":"clock","min":780,"ampm":"pm","tol":10,"mod":"until"}]],
  ["Sunday, July 36. \u2014 Took up a line of march at 5 a. m., and passed through White Plains and New Baltimore, and reached Warrenton about noon.", true, [{"s":46,"e":53,"kind":"clock","min":300,"ampm":"am","tol":10,"mod":"at"}, {"s":134,"e":138,"kind":"noon","min":725,"ampm":"pm","tol":10,"mod":"about","word":"noon"}]],
  ["At a little past 6 p. m. the enemy advanced and my regiment be- came engaged.", true, [{"s":17,"e":24,"kind":"clock","min":1080,"ampm":"pm","tol":10,"mod":"after"}]],
  ["The engagement lasted from 4 o'clock until dusk, when the firing ceased along the front.", true, [{"s":27,"e":36,"kind":"oclock","min":null,"ampm":null,"tol":10,"mod":"at","cand":[240,960]}, {"s":43,"e":47,"kind":"sun","min":1195,"ampm":"pm","tol":25,"mod":"until","word":"dusk"}]],
  ["This continued until 9 o'clock, when all became quiet, except a desultory fire from pickets and sharpshoot- ers on both sides.", true, [{"s":21,"e":30,"kind":"oclock","min":null,"ampm":null,"tol":10,"mod":"until","cand":[540,1260]}]],
  ["Skirmishing with artillery and infantry continued all along the line until 10.30 a. m., when a lull ensued, which lasted up to 2 p. m.", true, [{"s":75,"e":86,"kind":"clock","min":630,"ampm":"am","tol":5,"mod":"until"}, {"s":127,"e":134,"kind":"clock","min":840,"ampm":"pm","tol":10,"mod":"until"}]],
  ["The next morning (July 3) the regiment fell in at 3 a. m. , the enemy having commenced a furious shelling upon our position at that time, which fire died away at about 9 a. m.", true, [{"s":50,"e":57,"kind":"clock","min":180,"ampm":"am","tol":10,"mod":"at"}, {"s":168,"e":175,"kind":"clock","min":540,"ampm":"am","tol":10,"mod":"about"}]],
  ["But an order having reached me at 2 o'clock on the following morn- ing to join the corps, I started at daybreak, and reported to Major- General Birney about 10 o'clock.", true, [{"s":34,"e":43,"kind":"oclock","min":null,"ampm":null,"tol":10,"mod":"at","cand":[120,840]}, {"s":103,"e":111,"kind":"sun","min":265,"ampm":"am","tol":25,"mod":"at","word":"daybreak"}, {"s":157,"e":167,"kind":"oclock","min":null,"ampm":null,"tol":10,"mod":"about","cand":[600,1320]}]],
  ["On the morning of July 2, we broke camp at Emmitsburg at 4.30 o'clock, and marched toward Gettysburg, arriving upon the battle- field about 10 o'clock.", true, [{"s":57,"e":69,"kind":"oclock","min":270,"ampm":"am","tol":10,"mod":"at"}, {"s":140,"e":150,"kind":"oclock","min":600,"ampm":"am","tol":10,"mod":"about"}]],
  ["It was near midnight when the division reached Manassas Junction, after a march varying in the different brigades from 25 to 29 miles.", true, [{"s":12,"e":20,"kind":"midnight","min":0,"ampm":null,"tol":10,"mod":"about","word":"midnight"}]],
  ["On the 30th, made a short march after midday on the road to Em- mitsburg, bivouacking about midway between the two places.", true, [{"s":38,"e":44,"kind":"noon","min":725,"ampm":"pm","tol":10,"mod":"after","word":"midday"}]],
  ["Here it remained until dusk, losing several vamable officers and a large number of men from the enemy's artil- lery fire.", true, [{"s":23,"e":27,"kind":"sun","min":1195,"ampm":"pm","tol":25,"mod":"until","word":"dusk"}]],
  ["At 10 a. m. marched to South Mountain, where I halted until 6 p. m., at which hour we marched across the mountain, going into bivouac at 7.30 p. m.", true, [{"s":3,"e":11,"kind":"clock","min":600,"ampm":"am","tol":10,"mod":"at"}, {"s":60,"e":67,"kind":"clock","min":1080,"ampm":"pm","tol":10,"mod":"until"}, {"s":137,"e":147,"kind":"clock","min":1170,"ampm":"pm","tol":5,"mod":"at"}]],
  ["On Wednesday, July 15, left bivouac near Willianisport at 6.15 a. m., and marched to Sharpsburg, passing through the town at noon, and going into bivouac at 1 p. m.", true, [{"s":58,"e":68,"kind":"clock","min":375,"ampm":"am","tol":5,"mod":"at"}, {"s":125,"e":129,"kind":"noon","min":725,"ampm":"pm","tol":10,"mod":"at","word":"noon"}, {"s":157,"e":164,"kind":"clock","min":780,"ampm":"pm","tol":10,"mod":"at"}]],
  ["The fourth 1 am unable positively to account for, but have been informed was probably carried off the field by Major Rice when wounded, and by him taken home.", true, []],
  ["As ,1 am preparing a report as temporarily commanding the corps from July 1 to 4, inclusive, it will be necessary for you to correct your report in that particular.", true, []],
  ["1 am, very respectfully,", true, []],
  ["Bunker Hill, via Winchester: 1 am detained here under orders from the Secretary of War.", true, []],
  ["1 am, sir, very respectfully, &c.,", true, []],
  ["1 am, major, very respectfully, yours,", true, []],
  ["1 am, very respectfully, yours,", true, []],
];
const proj = (r) => ({ s: r.s, e: r.e, kind: r.kind, min: r.min, ampm: r.ampm ?? null, tol: r.tol, mod: r.mod, ...(r.cand ? { cand: r.cand } : {}), ...(r.from !== undefined ? { from: r.from, to: r.to } : {}), ...(r.word ? { word: r.word } : {}) });
test(`pinned readings: ${PINS.length} inputs, ${PINS.reduce((n, p) => n + p[2].length, 0)} readings, as the file gave them before the meridiem pattern was spelled out`, () => {
  assert.ok(PINS.length >= 200 && PINS.reduce((n, p) => n + p[2].length, 0) >= 200);
  const bad = [];
  for (const [input, ctx, want] of PINS) {
    const got = parseClock(input, ctx === null ? {} : { ctx: ctx === true ? input : ctx });
    if (JSON.stringify(got.map(proj)) !== JSON.stringify(want.map((w) => proj(w)))) bad.push(`${JSON.stringify(input)}${ctx === null ? '' : ' [ctx]'}: ${JSON.stringify(got.map(proj))} (pinned ${JSON.stringify(want)})`);
    for (const g of got) if (input.slice(g.s, g.e) !== g.text) bad.push(`${JSON.stringify(input)}: the span ${g.s}-${g.e} is not the text "${g.text}"`);
  }
  assert.deepEqual(bad, []);
  const kinds = new Set(PINS.flatMap((p) => p[2].map((r) => r.kind)));
  for (const k of ['clock', 'range', 'spelled', 'oclock', 'noon', 'midnight', 'sun']) assert.ok(kinds.has(k), `no pinned ${k} reading`);
});

// ---- 4. every spelling of the meridiem ----------------------------------------------------------------------------------------------------------------------------
const WS = ['', ' ', '\n', '\t', '\u00a0'];                                                    // what one optional white-space character can be (the empty string: none)
const STOP_SEPS = []; for (const b of WS) for (const st of ['.', ',']) for (const a of WS) STOP_SEPS.push(b + st + a);   // a stop between the letters, one space or none on either side: read in any case
const CAP_SEPS = WS;                                                                           // no stop, at most one white-space character: read in capitals only
const NO_SEPS = ['  ', '..', ' .. ', ',,', '.,', '-', ' - ', '. .', 'x', '\n\n', '.  ', '  .'];   // never read
const TRAILS = ['', ' and', ',', '.', ';', '-', 'x', '1', '_'];                                // what follows the m; a letter, digit or underscore runs the meridiem on into a word
const WORD = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_';
const reads = (a, sep, m, trail) => (STOP_SEPS.includes(sep) || (CAP_SEPS.includes(sep) && a === a.toUpperCase() && m === 'M')) && !(trail !== '' && WORD.includes(trail[0]));
test('the meridiem in every spelling is read exactly when the rule says so, as a clock, as the end of a range and after a spelled hour', () => {
  const bad = []; let n = 0, readCount = 0;
  for (const a of ['a', 'A', 'p', 'P']) for (const m of ['m', 'M']) for (const sep of [...STOP_SEPS, ...CAP_SEPS, ...NO_SEPS]) for (const trail of TRAILS) {
    const tok = a + sep + m + trail; const pm = a === 'p' || a === 'P'; const r = reads(a, sep, m, trail); n++; if (r) readCount++;
    const tag = JSON.stringify(tok);
    const c = parseClock(`Left camp at 4 ${tok}`);
    if (r) { if (!(c.length === 1 && c[0].kind === 'clock' && c[0].min === (pm ? 960 : 240) && c[0].ampm === (pm ? 'pm' : 'am') && c[0].text.startsWith('4'))) bad.push(`clock ${tag}: ${JSON.stringify(c.map(proj))}`); }
    else if (c.length) bad.push(`clock ${tag} should not be read: ${JSON.stringify(c.map(proj))}`);
    const g = parseClock(`The enemy attacked between 3 and 5 ${tok}`);
    if (r) { if (!(g.length === 1 && g[0].kind === 'range' && g[0].ampm === (pm ? 'pm' : 'am') && g[0].from === (pm ? 900 : 180) && g[0].to === (pm ? 1020 : 300))) bad.push(`range ${tag}: ${JSON.stringify(g.map(proj))}`); }
    else if (g.length) bad.push(`range ${tag} should not be read: ${JSON.stringify(g.map(proj))}`);
    const sp = parseClock(`We halted at half past four ${tok}`);
    if (r) { if (!(sp.length === 1 && sp[0].kind === 'spelled' && sp[0].min === (pm ? 990 : 270) && sp[0].ampm === (pm ? 'pm' : 'am'))) bad.push(`spelled ${tag}: ${JSON.stringify(sp.map(proj))}`); }
    else if (!(sp.length === 1 && sp[0].kind === 'spelled' && sp[0].min === null && sp[0].ampm === null && sp[0].text === 'half past four')) bad.push(`spelled ${tag} should stay ambiguous: ${JSON.stringify(sp.map(proj))}`);
  }
  assert.ok(n >= 4000 && readCount >= 1000 && readCount < n, `${n} spellings, ${readCount} read`);
  assert.deepEqual(bad.slice(0, 20), []);
});
