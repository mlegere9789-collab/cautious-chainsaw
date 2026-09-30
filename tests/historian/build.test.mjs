// build.test.mjs - the build pipeline: determinism (V12), validators (K001, V01-V11), developer-note exclusion, size budgets, manifest rotation.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { build } from '../../tools/historian/build.mjs';
import { fingerprint } from '../../tools/historian/lib/load.mjs';
import { fixture } from './lib/fixture.mjs';
import { ROOT } from './lib/data.mjs';

const tmp = (n) => fs.mkdtempSync(path.join(os.tmpdir(), `hx-${n}-`));
const DATA = path.join(ROOT, 'legacy/dist/data');
const copyData = () => { const d = path.join(tmp('data'), 'data'); fs.cpSync(DATA, d, { recursive: true }); return d; };
const readJ = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));

test('the data snapshot is the one the golden set was authored against (sha256 of legacy/dist/data)', () => {
  const g = readJ(path.join(ROOT, 'docs/plan/data/hist-golden-set.json'));
  assert.equal(fingerprint(DATA).sha256, g.data_snapshot.sha256);
});

test('a clean build passes every validator with zero findings and emits hashed shards + a manifest', async () => {
  const F = await fixture();
  assert.equal(F.build.ok, true);
  assert.deepEqual(F.build.report.counts, {}, JSON.stringify(F.build.report.findings.slice(0, 3)));
  const man = readJ(path.join(F.hx, 'manifest.json'));
  assert.equal(man.tiers.index.buckets, 128); assert.equal(man.tiers.index.files.length, 128);
  assert.equal(man.tiers.entpost.files.length, 32); assert.equal(man.tiers.text.per_shard, 16);
  assert.equal(man.semantic.enabled, false); assert.equal(man.ai.enabled, false, 'stages B and C are off');
  for (const f of [man.tiers.entity, man.tiers.entix, man.tiers.facts, man.tiers.lexicon, ...man.tiers.index.files, ...man.tiers.text.files]) {
    assert.match(f.path, /^f\/[a-z\/0-9]+\.[0-9a-f]{8}\.json$/, 'content-hashed name');
    assert.ok(fs.existsSync(path.join(F.hx, f.path)));
  }
  assert.ok(man.counts.entities >= 1600 && man.counts.passages >= 1500);
});

test('V12: a rebuild of unchanged inputs reproduces every hash (deterministic)', () => {
  const a = build({ outDir: path.join(tmp('a'), 'hx') }), b = build({ outDir: path.join(tmp('b'), 'hx') });
  assert.equal(a.ok && b.ok, true);
  assert.deepEqual(a.manifest.tiers, b.manifest.tiers);
  assert.equal(JSON.stringify(a.manifest), JSON.stringify(b.manifest));
});

test('rebuilding into the same directory leaves the manifest unchanged and removes nothing', () => {
  const out = path.join(tmp('same'), 'hx');
  const a = build({ outDir: out }); const b = build({ outDir: out });
  assert.equal(b.manifestChanged, false); assert.equal(b.removed, 0);
  assert.ok(!fs.existsSync(path.join(out, 'manifest.prev1.json')));
});

test('a data change keeps the previous two versions deployed (rollback = redeploy the previous manifest)', () => {
  const out = path.join(tmp('rot'), 'hx');
  build({ outDir: out });
  const before = readJ(path.join(out, 'manifest.json'));
  const d = copyData(); const f = path.join(d, 'oob/union_regiments_i_ii_corps.json'); const j = readJ(f); j.regiments[0].strength += 1; fs.writeFileSync(f, JSON.stringify(j));
  const r = build({ dataDir: d, outDir: out });
  assert.equal(r.ok, true); assert.equal(r.manifestChanged, true);
  const prev = readJ(path.join(out, 'manifest.prev1.json'));
  assert.deepEqual(prev.tiers, before.tiers, 'prev1 is the previous manifest');
  for (const t of [prev.tiers.entity, prev.tiers.facts]) assert.ok(fs.existsSync(path.join(out, t.path)), 'the previous version’s files are still there');
  const cur = readJ(path.join(out, 'manifest.json'));
  assert.notEqual(cur.tiers.entity.path, prev.tiers.entity.path);
});

test('K001: a whitelisted field that no longer exists fails the build (the e.title / e.description drift that made 137 answers print "undefined")', () => {
  const d = copyData();
  for (const day of [1, 2, 3]) { const f = path.join(d, `chronology_day${day}.json`); const j = readJ(f); for (const e of j.events) { e.headline = e.event; delete e.event; } fs.writeFileSync(f, JSON.stringify(j)); }
  const r = build({ dataDir: d, outDir: path.join(tmp('k001'), 'hx'), dry: true });
  assert.equal(r.ok, false); assert.ok(r.report.findings.some((x) => x.rule === 'K001' && /chronology\.event/.test(x.msg)));
});

test('V06: "undefined" or "null" arriving from the data fails the build; ids in prose are humanised or dropped', () => {
  const d = copyData();
  const f = path.join(d, 'oob/union_regiments_i_ii_corps.json'); const j = readJ(f); j.regiments[3].key_action = 'Held the line. undefined'; fs.writeFileSync(f, JSON.stringify(j));
  const r = build({ dataDir: d, outDir: path.join(tmp('v06'), 'hx'), dry: true });
  assert.equal(r.ok, false); assert.ok(r.report.findings.some((x) => x.rule === 'V06'));
  // a raw id inside prose is replaced by the unit’s name (or the sentence is dropped): never shown
  const d2 = copyData(); const f2 = path.join(d2, 'oob/union_regiments_i_ii_corps.json'); const j2 = readJ(f2); j2.regiments[4].key_action = 'Fought beside U-84NY on July 1. See C-999ZZ.'; fs.writeFileSync(f2, JSON.stringify(j2));
  const r2 = build({ dataDir: d2, outDir: path.join(tmp('v06b'), 'hx'), dry: true });
  assert.equal(r2.ok, true, JSON.stringify(r2.report.findings.slice(0, 3)));
});

test('developer notes never reach any emitted artifact (flag_notes, chronology flag, YouTube notes, tick words, animation vocabulary)', async () => {
  const F = await fixture();
  const blob = [];
  const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (/\.json$/.test(e.name)) blob.push(fs.readFileSync(p, 'utf8')); } };
  walk(F.hx);
  const all = blob.join('\n');
  for (const bad of ['CRITICAL ANIMATION', 'CRITICAL:', 'flag_notes', 'keyframe', 'YouTube', 'Unique placement', 'Commander succession US-', 'Commander succession CS-', 'must be shown', 'HIGHEST PRIORITY']) assert.ok(!all.includes(bad), `found developer text "${bad}"`);
  assert.ok(!/\bticks\b/i.test(all.replace(/"tick":\d+/g, '')), 'no "ticks" prose');
  assert.ok(!/ -- /.test(all), 'no double hyphen dashes');
  // the chronology clock label and the flag field are not carried at all
  const t1 = JSON.stringify(F.kb.t1.records.filter((r) => r.k === 'chronology'));
  assert.ok(!/"time"/.test(t1) && !/"flag"/.test(t1));
});

test('size budgets: T1 <= 250 KB brotli, cold passage query far below 120 KB, every text shard <= 64 KB', async () => {
  const F = await fixture();
  const s = F.build.report.sizes;
  assert.ok(s.t1Brotli <= 250 * 1024, `T1 ${s.t1Brotli}`);
  assert.ok(s.maxShard <= 64 * 1024 && s.maxIx <= 64 * 1024);
  console.log(`   T1 ${s.t1Raw} B raw / ${s.t1Brotli} B brotli; postings ${s.ixTotal} B; text ${s.textTotal} B; max shard ${s.maxShard} B; max index bucket ${s.maxIx} B`);
});

test('id discipline: entity ids keep the site ids; every battery/golden id namespace is present', async () => {
  const F = await fixture();
  const ids = new Set(F.kb.t1.records.map((r) => r.id));
  for (const id of ['U-20ME', 'C-15AL', 'BDE:U-I-1-1', 'DIV:C-I-3', 'CORPS:U-I', 'ARMY:U', 'ART:U-ART-A4US', 'SUCC:US-001', 'ROAD:RD-004', 'STR:STR-001', 'TF:TF-002', 'CAS:notable_intensity_notes', 'LOC-006', 'V-012', 'D3T538', 'SITE:find-ancestor']) assert.ok(ids.has(id), id);
  assert.ok(!ids.has('U-14BK'), 'the alias stub is folded into U-84NY, not a card of its own');
  assert.ok(F.kb.t1.records.find((r) => r.id === 'U-84NY').aliases.some((a) => /14th Brooklyn/i.test(a)));
  const dup = F.kb.t1.records.length - ids.size; assert.equal(dup, 0);
});

test('derived aliases exist: 1st Minnesota / First Minnesota / 1 MN and commander names', async () => {
  const F = await fixture();
  const r = F.kb.idx.get('U-1MN'); const al = r.aliases.map((a) => a.toLowerCase());
  for (const a of ['1st minnesota', 'first minnesota', '1 mn', '1st mn']) assert.ok(al.includes(a), a);
  assert.ok(F.kb.idx.get('U-20ME').aliases.some((a) => /twentieth maine/i.test(a)));
  const p = F.kb.idx.get('P:joshua-chamberlain') || F.kb.t1.records.find((x) => x.k === 'person' && x.attrs.surname === 'Chamberlain');
  assert.ok(p.aliases.some((a) => /Colonel Chamberlain/i.test(a)) && p.aliases.some((a) => /Joshua Chamberlain/i.test(a)));
});

test('fact tables: rank rule text, roll-ups and succession index are present and consistent', async () => {
  const F = await fixture();
  const f = F.kb.facts;
  assert.equal(f.rank['regiment.rate.U'].rows[0][0], 'U-1MN');
  assert.equal(f.rank['regiment.losses.C'].rows[0][0], 'C-26NC');
  assert.match(f.rank['regiment.rate.U'].rule, /strength of at least 100/);
  assert.equal(f.rollup.byState['U|Maine'].n, 10);
  assert.ok(f.rollup.guns.U.guns > 200 && f.rollup.guns.C.guns > 150);
  assert.ok(f.succ.byUnit['CORPS:U-I'].includes('SUCC:US-001'));
  assert.equal(f.events.byDay[1].length + f.events.byDay[2].length + f.events.byDay[3].length, 137);
});
