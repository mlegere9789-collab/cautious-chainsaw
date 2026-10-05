// ADVERSARIAL VERIFIER (docs/facts/README.md against the committed data). node --test tests/environment/verify-docs.test.mjs
// Both tests FAIL on the committed README: a count and a description that the data and the sources contradict.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const readme = fs.readFileSync(path.join(ROOT, 'docs', 'facts', 'README.md'), 'utf8');
const weather = JSON.parse(fs.readFileSync(path.join(ROOT, 'data-src', 'environment', 'weather_by_day.json'), 'utf8'));

test('VERIFY-D1: the README\'s quote count for the 1885 article equals the data (README says 24; weather_by_day.json holds 23 quotes from the 1885 article, 12 from the Notes and 1 from Haskell = 36)', () => {
  const m = /(\d+) quotes from the 1885 article/.exec(readme);
  assert.ok(m, 'the README states a count');
  const n = weather.quotes.filter((q) => q.source === 'jacobs-meteorology-1885').length;
  assert.equal(Number(m[1]), n, `README says ${m[1]}, the data has ${n}`);
});

test('VERIFY-D2: the README must not say that the later two of the three Reynolds times "are the times Howard and Schurz learned of it". The ledger itself (WSD-14 v2, page image of OR p. 696 read) has Howard\'s same-day despatch stating "General Reynolds was killed at 11.15 a. m."; only the 11.30 (Howard\'s report, Schurz) is a time of learning.', () => {
  assert.ok(!/the last two being the times Howard and Schurz learned of it/.test(readme));
});
