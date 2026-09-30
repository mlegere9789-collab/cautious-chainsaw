// sources.test.mjs - the rights register and the tier gate (V02), yaml-lite round trip, fetch refusals.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parse, dump } from '../../tools/historian/lib/yaml-lite.mjs';
import { loadSources, tierProblems, fetchAllowed, TIERS } from '../../tools/historian/lib/sources.mjs';
import { ROOT } from './lib/data.mjs';

const REG = loadSources();
const good = () => ({ id: 'x', tier: 'A', license: { id: 'PD' }, imprint: { reprint: false }, ocr: { proxy: 0.95, gate: 'accept' }, may_send_to_llm: true });

test('yaml-lite round-trips the register subset', () => {
  const src = { tiers: { A: 'public: domain, ok', B: 'x' }, list: [{ id: 'a', n: 1, ok: true, nothing: null, flow: [1, 'two', { k: 'v' }], text: "it's: fine" }, { id: 'b', deep: { x: { y: 'z' } } }] };
  assert.deepEqual(parse(dump(src)), src);
  assert.deepEqual(parse('# c\na: 1 # trailing\nb: [x, "y, z"]\n'), { a: 1, b: ['x', 'y, z'] });
});

test('the committed register parses, has the tier system, the two site sources and the Wave 1 sources', () => {
  assert.deepEqual(Object.keys(REG.tiers).sort(), ['A', 'A-pending', 'B', 'C']);
  for (const id of ['site-records', 'site-bundle-prose', 'or27-1', 'or27-2', 'or27-3', 'nyfr', 'pa-at-gettysburg', 'fox-1889', 'battles-leaders-3', 'jccw-1865', 'shsp']) assert.ok(REG.sources.has(id), id);
  assert.ok(REG.sources.size >= 80, `${REG.sources.size} sources`);
  for (const s of REG.sources.values()) { assert.ok(TIERS.includes(s.tier), s.id); assert.ok(s.license && s.license.id, `${s.id} has a licence id`); }
});

test('V02 tier gate: every refusal has a test', () => {
  assert.deepEqual(tierProblems(good()), []);
  assert.match(tierProblems({ ...good(), tier: 'C' }).join(), /Tier C is link-out only/);
  assert.match(tierProblems({ ...good(), license: null }).join(), /missing licence/);
  assert.match(tierProblems({ ...good(), license: {} }).join(), /missing licence/);
  assert.match(tierProblems({ ...good(), tier: 'B', may_send_to_llm: false }).join(), /attribution/);
  assert.deepEqual(tierProblems({ ...good(), tier: 'B', attribution: 'CC BY-SA 4.0', may_send_to_llm: false }), []);
  assert.match(tierProblems({ ...good(), tier: 'B', attribution: 'x', may_send_to_llm: true }).join(), /may_send_to_llm/);
  assert.match(tierProblems({ ...good(), imprint: { reprint: true } }).join(), /reprint/);
  assert.match(tierProblems({ ...good(), ocr: { proxy: 0.7, gate: 'accept' } }).join(), /OCR proxy < 0.80/);
  assert.deepEqual(tierProblems({ ...good(), ocr: { proxy: 0.7, gate: 'quarantine' } }), []);
  assert.match(tierProblems({ ...good(), tier: 'nope' }).join(), /unknown tier/);
});

test('the fetch gate refuses Tier C hosts and the 1971 reprint before any network call', () => {
  assert.equal(fetchAllowed(REG, 'https://archive.org/download/warofrebellion271unit/warofrebellion271unit_djvu.txt').ok, true);
  for (const u of ['https://www.battlefields.org/learn', 'https://www.ancestry.com/x', 'https://www.fold3.com/y', 'https://www.findagrave.com/z', 'https://www.hmdb.org/m.asp?m=1', 'https://gettysburg.stonesentinels.com/']) assert.equal(fetchAllowed(REG, u).ok, false, u);
  const r = fetchAllowed(REG, 'https://archive.org/download/warrebellionaco00cowlgoog/warrebellionaco00cowlgoog_djvu.txt');
  assert.equal(r.ok, false); assert.match(r.reason, /refused list/);
  assert.equal(fetchAllowed(REG, 'not a url').ok, false);
});

test('every Tier C source host is on the fetch ban list; no Tier C source is indexable, redistributable or sent to a model', () => {
  const banned = new Set(REG.banned_hosts);
  for (const s of REG.sources.values()) {
    if (s.tier !== 'C') continue;
    assert.equal(s.may_index, false, s.id); assert.equal(s.may_redistribute, false, s.id); assert.equal(s.may_send_to_llm, false, s.id);
    for (const h of s.hosts || []) if (!/^(archive\.org|loc\.gov)$/.test(h)) assert.ok(banned.has(h), `${s.id}: ${h} must be in banned_hosts`);
  }
});

test('the register is deterministic: gen-sources --check passes (the committed file is generated from the head + the two catalogs)', () => {
  const gen = path.join(ROOT, 'tools/historian/gen-sources.mjs');
  const cur = fs.readFileSync(path.join(ROOT, 'docs/historian/sources.yaml'), 'utf8');
  assert.ok(cur.startsWith('# Ask the Historian - rights and licensing register'));
  assert.ok(fs.existsSync(gen));
});

test('Wave 1 sources are Tier A with original imprints and clean identifiers', () => {
  for (const id of ['or27-1', 'or27-2', 'or27-3']) {
    const s = REG.sources.get(id); assert.equal(s.tier, 'A'); assert.equal(s.imprint.reprint, false); assert.match(s.imprint.ia_id, /^warofrebellion27[123]unit$/);
    assert.deepEqual(tierProblems(s), []);
  }
  assert.ok(![...REG.sources.values()].some((s) => s.imprint && s.imprint.ia_id === 'warrebellionaco00cowlgoog'), 'the 1971 reprint is not registered');
});

test('site sources are A-pending with the provenance caveat recorded, and ship nothing external', () => {
  for (const id of ['site-records', 'site-bundle-prose']) { const s = REG.sources.get(id); assert.equal(s.tier, 'A-pending'); assert.match(s.tier_detail, /pending|Provenance|provenance/); assert.equal(s.may_send_to_llm, false); }
});
