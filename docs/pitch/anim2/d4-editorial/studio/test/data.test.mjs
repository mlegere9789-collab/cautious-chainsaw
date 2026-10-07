// test/data.test.mjs - the inlined real-data subset: complete, traceable to its source files, and honest about what is Unknown.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { loadDocs, PROTO, REPO } from '../src/headless.mjs';
import { createBattle } from '../src/data/model.mjs';
import { createKernel } from '../src/kernel/registry.mjs';
import { registerBuiltins } from '../src/builtins.mjs';
import { createTuning } from '../src/tuning/tuning.mjs';
import { CHARSET } from '../src/layout/text.mjs';

const { dataset: ds, tokens, textTable } = loadDocs();
const haveSources = fs.existsSync(path.join(REPO, 'baseline', 'dist', 'data', 'placement_schema.json'));

test('counts match the research reports: 478 placed units, 1,804 rows (1,687 distinct unit-tick keys) on 188 of 675 ticks', () => {
  const c = ds.provenance.counts;
  assert.equal(c.units, 478); assert.equal(c.rawRows, 1804); assert.equal(c.keyframes, 1687); assert.equal(c.populatedTicks, 188); assert.equal(c.duplicateKeysKept, 117); assert.equal(c.unknownSide, 10); assert.equal(c.noOobParent, 95);
  assert.equal(ds.units.length, 478); assert.equal(ds.units.reduce((s, u) => s + u.kf.length, 0), 1687); assert.equal(new Set(ds.units.flatMap((u) => u.kf.map((k) => k[0]))).size, 188);
  assert.equal(ds.events.length, 137); assert.equal(ds.vignettes.length, 24); assert.equal(ds.clock.anchors.length, 33); assert.equal(ds.terrain.locations.length, 30);
});

test('the dataset is the first prototype, byte for byte (D4 FORK: the builder stays with the prototype; this fork changes no datum)', () => {
  for (const f of ['dataset.json', 'popup-data.json']) { const up = path.join(REPO, 'docs', 'pitch', 'anim', 'prototype', 'data', f); assert.ok(fs.existsSync(up), up); assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(PROTO, 'data', f))).digest('hex'), crypto.createHash('sha256').update(fs.readFileSync(up)).digest('hex'), f + ' differs from the prototype'); }
});

test('every source file the dataset names exists and still has the recorded SHA-256 (nothing drifted under it)', { skip: !haveSources && 'source data files not present' }, () => {
  for (const s of ds.provenance.sources) { const t = fs.readFileSync(path.join(REPO, s.file), 'utf8'); assert.equal(crypto.createHash('sha256').update(t).digest('hex'), s.sha256, s.file); }
  assert.ok(ds.provenance.sources.length > 55);
});

test('keyframes are strictly increasing in tick, inside the battle, and inside the battlefield; strengths and dispositions are present', () => {
  const b = ds.terrain.bounds; const pad = 0.06;
  for (const u of ds.units) {
    for (let i = 0; i < u.kf.length; i++) {
      const k = u.kf[i]; assert.ok(k[0] >= 1 && k[0] <= 675, `${u.id} tick ${k[0]}`); if (i) assert.ok(k[0] > u.kf[i - 1][0], `${u.id} ticks must increase`);
      assert.ok(k[1] > b.south - pad && k[1] < b.north + pad && k[2] > b.west - pad && k[2] < b.east + pad, `${u.id} position ${k[1]},${k[2]} inside the battlefield`);
      assert.ok(Number.isFinite(k[3]) && k[3] >= 0, `${u.id} strength`); assert.ok(ds.dispositions[k[5]], `${u.id} disposition`);
    }
  }
});

test('the hierarchy resolves: every chain reaches ROOT without a cycle, every parent exists, echelons are consistent', () => {
  const k = registerBuiltins(createKernel()); const t = createTuning(tokens); const battle = createBattle(ds, k, (id) => t.get(id));
  for (const u of battle.units.values()) { assert.equal(u.chain[u.chain.length - 1], 'ROOT', u.id); assert.equal(new Set(u.chain).size, u.chain.length, u.id + ' cycle'); for (const c of u.chain) assert.ok(c === 'ROOT' || battle.nodes.has(c), `${u.id}: ${c}`); assert.ok(u.echelon >= 1 && u.echelon <= 5); }
  assert.ok(battle.units.size === 478 && battle.snapTicks.length === 188);
});

test('the 10 units whose id prefix contradicts their state code are UNKNOWN-sided, flagged, never silently guessed', () => {
  const want = ['U-26NC', 'U-11NC', 'U-47NC', 'U-52NC', 'U-15AL', 'U-44AL', 'U-48AL', 'U-4TX', 'U-5TX', 'U-1TX'].sort();
  const got = ds.units.filter((u) => u.side === 'unknown').map((u) => u.id).sort(); assert.deepEqual(got, want);
  for (const u of ds.units.filter((x) => x.side === 'unknown')) { assert.equal(u.prefixSide, 'union'); assert.equal(u.sideGuess, 'confederate'); assert.ok(u.sideFlag); }
  assert.ok(ds.units.every((u) => u.side === 'unknown' || u.side === u.prefixSide || u.sideFlag === 'oob-disagrees-with-prefix'), 'a side differs from the prefix only with a flag');
});

test('terrain: 8 places differ between the legacy frame and production terrain.json by 166 to 733 m (computed, flagged), the rest agree', () => {
  const d = ds.terrain.locations.filter((l) => l.diffM > 100); assert.equal(d.length, 8); assert.equal(Math.min(...d.map((l) => l.diffM)), 166); assert.equal(Math.max(...d.map((l) => l.diffM)), 733);
  assert.deepEqual([...ds.terrain.disputed].sort(), d.map((l) => l.id).sort()); assert.equal(ds.terrain.frame, 'legacy');
});

test('the clock stays a CANDIDATE: 33 anchors, none approved, notice carried', () => {
  assert.equal(ds.clock.release, 'candidate'); assert.match(ds.clock.notice, /not reviewed by a historian/); assert.ok(ds.clock.anchors.every((a) => a.state === 'proposed'));
});

test('scenes are computed, in range, and say how they were found', () => {
  assert.ok(ds.scenes.length >= 7); for (const s of ds.scenes) { assert.ok(s.tick >= 1 && s.tick <= 675 && s.tick0 >= 1 && s.tick1 <= 675 && s.zoom >= 11 && s.zoom <= 18); assert.ok(s.why.length > 20 && s.nearestPlace.name); assert.ok(Math.abs(s.lat - 39.82) < 0.06 && Math.abs(s.lng + 77.235) < 0.06); }
  assert.ok(ds.scenes.some((s) => s.id === 'field' && s.onField === 478));
});

test('the text table covers every character a tile can show, for the three tile fonts', () => {
  for (const f of ['code', 'label', 'badge']) for (const ch of CHARSET) assert.ok(typeof textTable.fonts[f].adv[ch] === 'number', `${f} lacks ${JSON.stringify(ch)}`);
  const chars = new Set(); for (const u of ds.units) for (const ch of u.short + u.label) chars.add(ch); for (const ch of chars) assert.ok(CHARSET.includes(ch), 'unit text uses a character outside the measured set: ' + JSON.stringify(ch));
});

test('privacy: no e-mail address and no URL anywhere in the dataset', () => {
  const s = JSON.stringify(ds); assert.ok(!/[\w.+-]+@[\w-]+\.[a-z]{2,}/i.test(s), 'e-mail address found');  const urls = s.match(/https?:\/\/[^\s"\\]+/g) || []; assert.deepEqual(urls, [], 'URLs in the dataset: ' + urls.slice(0, 3));
});
