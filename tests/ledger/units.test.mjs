// node --test "tests/ledger/*.test.mjs": unit tests of the checks the ledger validator is built from.
import test from 'node:test';
import assert from 'node:assert/strict';
import { numbersIn, wordNumbers, timesIn, parseClock, checkTable, figureMapSum, readSiteValue } from '../../tools/ledger/ledger-lib.mjs';

test('numbers in text: digits with commas and decimals, as printed', () => {
  assert.deepEqual(numbersIn('3,155 killed, 14,529 wounded, 5365 missing, 71.7 per cent, 4.8'), [3155, 14529, 5365, 71.7, 4.8]);
  assert.deepEqual(numbersIn('no figures here'), []);
});

test('numbers written in words (guns, burials)', () => {
  assert.deepEqual(wordNumbers('from one hundred to one hundred and twenty'), [100, 120]);
  assert.deepEqual(wordNumbers('thirty-five hundred and twelve (3,512.)'), [3512]);
  assert.deepEqual(wordNumbers('nearly one hundred and fifty'), [150]);
  assert.deepEqual(wordNumbers('from a hundred or more guns'), [100]);
  assert.deepEqual(wordNumbers('making one hundred, and fifteen in all'), [115]);
  assert.deepEqual(wordNumbers('five hundred and thirty-four (534.)'), [534]);
  assert.deepEqual(wordNumbers('the first day'), []);
});

test('clock times in text: hh.mm, hour only, o\'clock, and "seven minutes past"', () => {
  const t = (s) => timesIn(s).map((x) => `${x.h}:${String(x.m).padStart(2, '0')}${x.ap || ''}`);
  assert.deepEqual(t('about 10.15 a. m.'), ['10:15a']);
  assert.deepEqual(t('At 1 p. m. the enemy'), ['1:00p']);
  assert.deepEqual(t('About 1 o’clock, apparently'), ['1:00']);
  assert.deepEqual(t('arrived about 11.30 o’clock, finding'), ['11:30']);
  assert.deepEqual(t('At seven minutes past 1 p. m., the awful'), ['1:00p', '1:07p']);
  assert.deepEqual(t('which opened at 1.30 p. m., and was kept up'), ['1:30p']);
  assert.deepEqual(parseClock('10:15 a.m.'), { h: 10, m: 15, ap: 'a' }); assert.equal(parseClock('10.15'), null);
});

test('a table reading is added up: rows, columns and the figure map', () => {
  const good = { table: { columns: ['k1', 'k2', 'w', 'agg'], rows: [['A', 1, 2, 3, 6], ['B', 4, null, 5, 9]], total_row: ['T', 5, 2, 8, 15], figure_map: { killed: ['k1', 'k2'], wounded: ['w'], missing: [], total: ['agg'] } } };
  assert.deepEqual(checkTable(good), []);
  assert.equal(figureMapSum(good.table, ['k1', 'k2']), 7);
  const badRow = JSON.parse(JSON.stringify(good)); badRow.table.rows[0][4] = 7;
  assert.ok(checkTable(badRow).some((p) => /row "A"/.test(p)));
  const badCol = JSON.parse(JSON.stringify(good)); badCol.table.total_row[3] = 9;
  assert.ok(checkTable(badCol).some((p) => /column "w"/.test(p)));
  assert.deepEqual(checkTable({ table: { columns: ['present'], rows: [['x', 820]], total_row: null, figure_row: { present: 'present' } } }), []);
});

test('site values are read from the repo files by path', () => {
  assert.equal(readSiteValue('data-src/build/facts.json', 'casualties.site_figures_measured.union.oob_corps_casualty_sum'), 22803);
  assert.equal(readSiteValue('data-src/build/unit_registry.json', 'units[id=U-1MN].casualties'), 224);
  assert.equal(readSiteValue('data-src/build/facts.json', 'casualties.no.such.path'), undefined);
});
