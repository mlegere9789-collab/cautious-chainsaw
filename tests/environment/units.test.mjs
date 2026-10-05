// node --test "tests/environment/*.test.mjs": unit tests of the small pieces the validators lean on.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as K from '../../tools/environment/clock.mjs';
import * as B from '../../tools/environment/solar.mjs';
import { parseUsno, parseNasa1863 } from '../../tools/environment/build-astro.mjs';
import { parseLmt, tickToLmtMinutes, lmtMinutesToUtMs, loadAnchors } from '../../tools/environment/tickclock.mjs';
import { htmlToText } from '../../tools/environment/htmltext.mjs';
import { parseAbbyy, parseDjvuXml, alnumKey, excludedLeaves, readerIndex } from '../../tools/environment/ia-pages.mjs';
import { headerPage, pageOfLeaf, locateQuote } from '../../tools/environment/source-verify.mjs';
import { pretty } from '../../tools/environment/json-out.mjs';

test('clock: LMT is UT - 5 h 8.92 min at 77.2311 W; EST-equivalent is 8.92 minutes later; labels round half up', () => {
  assert.ok(Math.abs(K.LMT_OFFSET_MS / 3600000 - -5.14874) < 1e-5);
  assert.ok(Math.abs(K.EST_MINUS_LMT_MIN - 8.92) < 0.005);
  assert.equal(K.hhmm(1180.5), '19:41'); assert.equal(K.hhmm(1180.49), '19:40'); assert.equal(K.hhmm(1439.9), '23:59');
  assert.equal(K.hhmmss(61.5), '01:01:30'); assert.equal(K.label12('20:38'), '8:38 p.m.'); assert.equal(K.label12('00:05'), '12:05 a.m.');
  assert.equal(K.weekdayOf('1863-07-03'), 'Friday'); assert.equal(K.weekdayOf('1863-06-25'), 'Thursday');
  const f = K.clockFields(Date.UTC(1863, 6, 3, 0, 41, 7), K.EST_OFFSET_MS); assert.equal(f.date, '1863-07-02'); assert.equal(Math.round(f.minutes * 60), (19 * 60 + 41) * 60 + 7);
  assert.equal(K.DAYS.length, 13); assert.equal(K.DAYS[0], '1863-06-25'); assert.equal(K.DAYS[12], '1863-07-07');
});

test('solar.mjs (independent Meeus implementation): Julian days, Delta T and sun/moon at a 1863 instant', () => {
  assert.equal(B.julianDay(2000, 1, 1, 12), 2451545);                                    // Meeus: J2000.0
  assert.equal(B.julianDay(1987, 1, 27, 0), 2446822.5);                                  // Meeus example 7.a
  assert.ok(Math.abs(B.deltaT(1863) - 7.2) < 0.7);                                       // Delta T is about 7 s in 1863 (polynomial valid 1860-1900)
  const jd = B.julianDay(1863, 7, 2, 12);
  const sun = B.sunApparent(jd);                                                         // reference values: astronomy-engine 2.1.19 (MIT), same instant
  assert.ok(Math.abs(sun.ra - 100.9344) < 0.01 && Math.abs(sun.dec - 23.0734) < 0.005, `${sun.ra} ${sun.dec}`);
  const moon = B.moonApparent(jd);
  assert.ok(Math.abs(moon.ra - 298.695) < 0.02 && Math.abs(moon.dec - -16.7236) < 0.02 && Math.abs(moon.distKm - 357965) < 60, `${moon.ra} ${moon.dec} ${moon.distKm}`);
  assert.ok(Math.abs(B.moonIllumination(jd).fraction - 0.97605) < 0.0005);
});

test('USNO and NASA parsers read the cached authorities', () => {
  const cache = path.join(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'), 'tmp', 'env-cache');
  const f = path.join(cache, 'usno-oneday-1863-07-02-tz-5.json');
  if (!fs.existsSync(f)) return;
  const u = parseUsno(JSON.parse(fs.readFileSync(f, 'utf8')));
  assert.equal(u.fracillum, '97%'); assert.equal(u.tz, -5);
  assert.deepEqual(u.events.filter((e) => e.key === 'sunset' || e.key === 'moonrise').map((e) => `${e.key} ${e.hhmm}`).sort(), ['moonrise 20:47', 'sunset 19:41']);
  const n = path.join(cache, 'nasa-espenak-phases1801.html');
  if (!fs.existsSync(n)) return;
  const all = parseNasa1863(htmlToText(fs.readFileSync(n, 'utf8')));
  const full = all.find((x) => x.phase === 'Full Moon' && new Date(x.utMs).getUTCMonth() === 6);
  assert.equal(new Date(full.utMs).toISOString().slice(0, 16), '1863-07-01T06:46');
  assert.equal(all[0].phase, 'Full Moon'); assert.equal(all[0].text, 'Jan 5 03:32');
});

test('tickclock: piecewise-linear, strictly monotone, exact at anchors, the only place the tick clock is used', () => {
  assert.equal(parseLmt('1863-07-01T00:00'), 0); assert.equal(parseLmt('1863-07-03T20:00'), 2 * 1440 + 20 * 60);
  const a = loadAnchors();
  assert.equal(a.anchors.length, 33); assert.equal(a.tick_max, 675); assert.equal(a.release, 'candidate');
  for (const an of a.anchors) assert.equal(tickToLmtMinutes(an.tick, a.anchors), an.min);
  let prev = -Infinity; for (let t = 1; t <= 675; t++) { const m = tickToLmtMinutes(t, a.anchors); assert.ok(m > prev); prev = m; }
  assert.throws(() => tickToLmtMinutes(0, a.anchors), RangeError); assert.throws(() => tickToLmtMinutes(676, a.anchors), RangeError);
  assert.equal(new Date(lmtMinutesToUtMs(0, K.LMT_OFFSET_MS)).toISOString().slice(0, 16), '1863-07-01T05:08');
});

test('OCR parsing: ABBYY and DjVuXML pages, alnum keys, reader index from scandata exclusions', () => {
  const abbyy = '<page width="1" height="1"><block><text><par><line baseline="1"><formatting><charParams wordStart="true">A</charParams><charParams>b</charParams><charParams wordStart="true">c</charParams></formatting></line></par></text></block></page><page width="1" height="1"></page>';
  assert.deepEqual(parseAbbyy(abbyy), [['Ab c'], []]);
  const djvu = '<OBJECT data="x" width="1" height="1"><HIDDENTEXT><PAGECOLUMN><REGION><PARAGRAPH><LINE><WORD coords="1,1,1,1">Total </WORD><WORD coords="1,1,1,1">3,155</WORD></LINE></PARAGRAPH></REGION></PAGECOLUMN></HIDDENTEXT></OBJECT><OBJECT data="y" width="1" height="1"></OBJECT>';
  assert.deepEqual(parseDjvuXml(djvu), [['Total 3,155'], []]);
  assert.equal(alnumKey('Killed, 3155. Wounded, 14,529.'), 'Killed3155Wounded14529');
  assert.equal(readerIndex(59, [0, 20, 21, 67]), 56); assert.equal(readerIndex(10, [0, 20, 21, 67]), 9); assert.equal(readerIndex(5, null), null);
  assert.equal(excludedLeaves('/no/such/file'), null);
});

test('printed pages come from the leaves\' own running heads, outvoting a garbled head', () => {
  const mk = (head, n) => [`${head} ${n}`, 'text line one', 'text line two'];
  const leaves = [mk('THE REBEL INVASION OF', 30), mk('MARYLAND AND PENNSYLVANIA.', 31), ['82 THE REBEL INVASION OF', 'x', 'y'], mk('MARYLAND AND PENNSYLVANIA.', 83 - 50 + 0), mk('THE REBEL INVASION OF', 34)].map((l, i) => (i === 3 ? ['MARYLAND AND PENNSYLVANIA. 33', 'x', 'y'] : l));
  assert.equal(headerPage(['MARYLAND AND PENNSYLVANIA. 47', 'x']), 47); assert.equal(headerPage(['346 N. C., VA., W. VA., MD., PA., ETC. [Chap. XXXIX.', 'x']), 346);
  assert.equal(headerPage(['body text', '[20]']), 20); assert.equal(headerPage(['body text only', 'more words']), null);
  const p = pageOfLeaf(leaves, 2); assert.equal(p.page, 32); assert.match(p.basis, /neighbours/);
  assert.equal(pageOfLeaf(leaves, 1).page, 31);
});

test('locating a quote tolerates line breaks, hyphenation and punctuation, and finds one that spans a page break', () => {
  const leaves = [['The enemy opened, at about 1 p.', 'm., along his whole right, a furi-'], ['ous cannonade on the left of our line.', 'next page words']];
  assert.deepEqual(locateQuote(leaves, 'enemy opened, at about 1 p. m., along his whole right, a furious cannonade'), [{ leaf: 0, spans: true }]);
  assert.deepEqual(locateQuote(leaves, 'a furious cannonade on the left'), [{ leaf: 0, spans: true }]);
  assert.deepEqual(locateQuote(leaves, 'cannonade on the left of our line'), [{ leaf: 1, spans: false }]);
  assert.deepEqual(locateQuote(leaves, 'not there at all'), []);
});

test('pretty JSON keeps primitive arrays on one line and is stable', () => {
  assert.equal(pretty({ a: [1, 2, 3], b: { c: 'x' }, d: [] }), '{\n  "a": [1, 2, 3],\n  "b": {\n    "c": "x"\n  },\n  "d": []\n}');
});
