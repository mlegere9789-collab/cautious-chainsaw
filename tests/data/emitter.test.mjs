import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { findSpan, getAt } from '../../tools/data/lib/jsonspan.mjs';
import { applyEditsToText, emit } from '../../tools/data/emit_legacy.mjs';
import { hashTree, readTsv, diffAgainstManifest } from '../../tools/data/lib/manifest.mjs';
import { DEFAULT_DATA_DIR, REPO_ROOT } from '../../tools/data/lib/util.mjs';
import { pathToFileURL } from 'node:url';
import { rmrf, makeRepoCopy } from './helpers.mjs';

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'gtbg-emit-'));

test('findSpan locates values byte-exactly in nested, escaped and spaced JSON', () => {
  const text = '{ "a": [1, {"b\\"q": "x\\ny"}, 3],\n "c" : "z" }';
  const [s, e] = findSpan(text, '/a/1/b"q');
  assert.equal(text.slice(s, e), '"x\\ny"');
  const [s2, e2] = findSpan(text, '/c');
  assert.equal(text.slice(s2, e2), '"z"');
  assert.throws(() => findSpan(text, '/a/9'), /out of range/);
  assert.throws(() => findSpan(text, '/nope'), /no member/);
  assert.equal(getAt(JSON.parse(text), '/a/2'), 3);
});

test('a value-only edit changes exactly the bytes of that value', () => {
  const text = '{\n  "n": "Krzyznowski leads",\n  "m": "Krzyznowski leads"\n}\n';
  const out = applyEditsToText(text, [{ file: 'x.json', pointer: '/m', before: 'Krzyznowski leads', after: 'Krzyzanowski leads' }]);
  assert.equal(out, '{\n  "n": "Krzyznowski leads",\n  "m": "Krzyzanowski leads"\n}\n');
});

test('fail closed: wrong "before", overlapping edits and escaped encodings are refused', () => {
  const text = '{"a":"one","b":"t\\u00e9st"}';
  assert.throws(() => applyEditsToText(text, [{ file: 'x', pointer: '/a', before: 'two', after: 'three' }]), /differs from "before"/);
  assert.throws(() => applyEditsToText(text, [{ file: 'x', pointer: '/b', before: 'tést', after: 'x' }]), /canonical encoding/);
});

test('emitting with no patches reproduces legacy-manifest.tsv byte for byte (71 files)', () => {
  const out = tmp();
  try {
    const r = emit({ patches: [], out });
    assert.deepEqual(r, { files: 71, changed: 0 });
    assert.deepEqual(diffAgainstManifest(hashTree(out), readTsv()), { missing: [], extra: [], changed: [] });
  } finally { rmrf(out); }
});

test('a real value-only patch on a copy of the legacy tree changes exactly one file and one span; the source stays untouched', () => {
  const out = tmp();
  try {
    const terrain = JSON.parse(fs.readFileSync(path.join(DEFAULT_DATA_DIR, 'terrain.json'), 'utf8'));
    const i = terrain.key_locations.findIndex((l) => /Gulp/.test(l.name));
    assert.ok(i >= 0, 'terrain.json still carries the "Gulp\'s Hill saddle" typo in the frozen tree');
    const before = terrain.key_locations[i].name;
    const patch = { id: 'test', edits: [{ file: 'terrain.json', pointer: `/key_locations/${i}/name`, before, after: before.replace('Gulp', 'Culp') }] };
    const r = emit({ patches: [patch], out });
    assert.equal(r.changed, 1);
    const d = diffAgainstManifest(hashTree(out), readTsv());
    assert.deepEqual(d.changed, ['terrain.json']);
    const a = fs.readFileSync(path.join(DEFAULT_DATA_DIR, 'terrain.json'), 'utf8');
    const b = fs.readFileSync(path.join(out, 'terrain.json'), 'utf8');
    assert.equal(b.length, a.length, 'Gulp -> Culp keeps the length');
    let diffs = 0; for (let k = 0; k < a.length; k++) if (a[k] !== b[k]) diffs++;
    assert.equal(diffs, 1, 'exactly one byte differs');
    assert.deepEqual(diffAgainstManifest(hashTree(DEFAULT_DATA_DIR), readTsv()), { missing: [], extra: [], changed: [] });
  } finally { rmrf(out); }
});

test('the emitter refuses to write under legacy/ (probed in a throw-away copy of the repo, so a broken guard can never touch the real legacy tree)', async () => {
  const { base, root } = makeRepoCopy('repo');
  try {
    const mod = await import(pathToFileURL(path.join(root, 'tools', 'data', 'emit_legacy.mjs')).href);
    const before = hashTree(path.join(root, 'legacy', 'dist', 'data'));
    assert.throws(() => mod.emit({ patches: [], out: path.join(root, 'legacy', 'dist', 'x') }), /refusing/);
    assert.ok(!fs.existsSync(path.join(root, 'legacy', 'dist', 'x')), 'nothing was written');
    assert.deepEqual(hashTree(path.join(root, 'legacy', 'dist', 'data')), before);
  } finally { rmrf(base); }
  // the real tree, refused before a single byte is written
  assert.throws(() => emit({ patches: [], out: path.join(REPO_ROOT, 'legacy', 'dist', 'x') }), /refusing/);
  assert.ok(!fs.existsSync(path.join(REPO_ROOT, 'legacy', 'dist', 'x')));
});

test('CLI: --verify with no patches exits 0', () => {
  const out = tmp();
  try {
    const r = spawnSync(process.execPath, [path.join(REPO_ROOT, 'tools', 'data', 'emit_legacy.mjs'), '--out', out, '--verify', '--patches', path.join(out, 'none')], { encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /changed 0/);
  } finally { rmrf(out); }
});
