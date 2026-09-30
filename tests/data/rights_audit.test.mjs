import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { buildAudit, renderMarkdown, renderCsv } from '../../tools/data/rights_audit.mjs';
import { REPO_ROOT } from '../../tools/data/lib/util.mjs';

const a = buildAudit();

test('the audit lists exactly the 18 legacy coordinates with bundle lines matching the chapter', () => {
  assert.equal(a.coordRows.length, 18);
  const tiers = {};
  for (const r of a.coordRows) tiers[r.tier_id] = (tiers[r.tier_id] || 0) + 1;
  assert.deepEqual(tiers, { wikipedia: 6, 'stone-sentinels': 8, hmdb: 4 });
  const lines = a.coordRows.filter((r) => r.line).map((r) => r.line).sort((x, y) => x - y);
  assert.deepEqual(lines, [104475, 104932, 106138, 108468, 110071, 110180, 110496, 110533, 110569]);
  assert.ok(a.coordRows.every((r) => ['replace', 'credit', 'keep facts-only', 'remove'].includes(r.action)), 'no blank action');
});

test('Busey and Martin dependency: 11 OOB files claim it; three Confederate regiment files declare no sources', () => {
  assert.equal(a.bmFiles.filter((f) => f.claimsBM && f.rel.startsWith('oob/')).length, 11);
  assert.equal(a.bmFiles.filter((f) => f.rel.startsWith('oob/confederate_regiments_') && !f.declared).length, 3);
  assert.equal(a.undeclaredRegs, 171);
});

test('29 citation strings map to 26 works and every string has a tier tag and an action', () => {
  assert.equal(a.sourceStrings.length, 29);
  const works = new Set(a.sourceStrings.map((s) => s.work.id).filter((id) => id !== 'PFANZ-TRILOGY'));
  assert.equal(works.size, 26, [...works].join(' | '));
  assert.ok(a.sourceStrings.every((s) => s.work.tag && s.work.action));
});

test('every shipped data file has a row (71) and the YouTube derivation strings are listed', () => {
  assert.equal(a.dataFiles.length, 71);
  assert.ok(a.dataFiles.every((d) => d.action && d.tag && d.risk));
  assert.equal(a.yt.length, 5);
});

test('the committed markdown and csv are what the generator produces', () => {
  assert.equal(fs.readFileSync(path.join(REPO_ROOT, 'docs', 'data', 'rights-audit.md'), 'utf8'), renderMarkdown(a));
  assert.equal(fs.readFileSync(path.join(REPO_ROOT, 'data-src', 'build', 'legacy-rights-audit.csv'), 'utf8'), renderCsv(a));
});

test('the Google Maps key constant next to the monument array is never reproduced', () => {
  const text = renderMarkdown(a) + renderCsv(a);
  assert.ok(!/AIza[0-9A-Za-z_-]{20,}/.test(text));
});
