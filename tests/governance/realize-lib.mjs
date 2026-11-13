// Shared set-up of the realization harness tests (tests/governance/realize*.test.mjs): the product loaded once per test process (about 2 s), the runner, and the helpers that build records and
// synthetic rows. A synthetic row carries words chosen so that the check under test has something to bind to; its facts (units, places, minutes) are the product's own.
import assert from 'node:assert/strict'; import path from 'node:path';
import { openProduct } from '../../tools/bt/realize/query.mjs';
import { Runner } from '../../tools/bt/realize/checks.mjs';
import { loadTimeline } from '../../tools/bt/realize/timeline.mjs';
import { toMin, readJSONL, REAL } from '../../tools/bt/realize/lib.mjs';

export const P = await openProduct(), TL = loadTimeline(), R = new Runner(P, TL), H = 'bt-realize-1';
export const clone = o => JSON.parse(JSON.stringify(o));
export const rec = (id, kind, from, to, quote, entities, checks, extra = {}) => ({ id, harness: H, kind, scenario: 'default', window: { from, to }, claim: { quote }, entities, checks, ...extra });
// a synthetic row; `timeCell` is what the printed time cell says (a NIGHT row is a row whose cell says NIGHT)
export const addRow = (id, text, from, to, timeCell = from) => { const a = toMin(from), b = toMin(to); TL.byId.set(id, { id, claim_text: text, time_cell: timeCell, what_text: text, tier: 'documented', status_effective: 'verified_against_or_text', shard: 'test', window: { intervals: [[a, b]], basis: ['test'], flags: [], kind: 'clock', in_clock: true } }); };
export const run = r => R.runRecord(r);
export const examples = readJSONL(path.join(REAL, 'EXAMPLES.jsonl'));
export const ex = id => clone(examples.find(r => r.id === id));
export const codesOf = res => new Set([...res.problems.map(p => p.code), ...res.assertions.filter(a => !a.ok).flatMap(a => a.all_codes || [a.code])]);
export async function mustFail(r, code, label) { const res = await run(r); assert.equal(res.realized, false, `${label || r.id}: a wrong record was accepted`); if (code) assert.ok(codesOf(res).has(code), `${label || r.id}: expected ${code}, got ${[...codesOf(res)].join(', ')} (${res.why})`); return res; }
export async function mustPass(r, label) { const res = await run(r); assert.equal(res.realized, true, `${label || r.id}: ${res.why}`); return res; }
