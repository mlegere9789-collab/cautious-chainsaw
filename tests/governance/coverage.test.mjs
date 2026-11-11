// Node runner for the Q17/Q18/Q23 coverage checks: reads the same governance files independently of the python code.
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
const G = new URL('../../docs/battle-theatre/GOVERNANCE/', import.meta.url);
const J = (p) => JSON.parse(readFileSync(new URL(p, G), 'utf8'));
const req = J('requirements.json'), reg = J('register_index.json');
const rows = readFileSync(new URL('timeline_seed.jsonl', G), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
const open = new Set(reg.filter((e) => e.status !== 'closed').map((e) => e.id));
const subs = req.sub_requirements;
test('Q18 every requirement has sub-requirements', () => {
  for (const r of Object.keys(req.requirements)) assert.ok(subs.some((s) => s.requirement_id === r), r);
});
test('Q18 every sub-requirement passing or linked to an open register entry', () => {
  const un = subs.filter((s) => !s.passes && !s.register_ids.some((i) => open.has(i)));
  assert.equal(un.length, 0, `${un.length} unlinked sub-requirements`);
});
test('Q17 every timeline row has an open register entry (no visual realization records exist yet)', () => {
  const link = new Map();
  for (const s of subs) { const m = /^Timeline row (T\d-\d+)/.exec(s.text); if (m && s.requirement_id === 'R11') link.set(m[1], s); }
  const un = rows.filter((r) => !(link.get(r.id)?.register_ids ?? []).some((i) => open.has(i)));
  assert.equal(un.length, 0, `${un.length} timeline rows uncovered`);
});
test('Q23 non-documented register entries carry a product marking', () => {
  const bad = reg.filter((e) => e.tier !== 'documented' && /^\s*(-|none|not stated by the shard proposal.*)?\s*$/i.test(e.marking || ''));
  assert.equal(bad.length, 0, `${bad.length} unmarked: ${bad.slice(0, 5).map((e) => e.id)}`);
});
