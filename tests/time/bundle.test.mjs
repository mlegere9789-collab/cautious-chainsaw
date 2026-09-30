// The ES-module route must not bundle the 25 KB source document (only the runtime subset): proven twice, statically (the import graph of
// src/lib/time/index.js) and dynamically (the modules Node actually loads when it is imported).
import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import * as nodeModule from 'node:module';
import { pathToFileURL } from 'node:url';
import { minify } from 'terser';
import { P, readText } from '../../tools/time/lib.mjs';
import { sizeOf } from '../../tools/time/inline.mjs';
import { runtimeDoc } from '../../tools/time/slim.mjs';
import { doc } from './helpers.mjs';

const DIR = P('src', 'lib', 'time');
const ENTRY = path.join(DIR, 'index.js');
const rel = (f) => path.relative(DIR, f).replace(/\\/g, '/');

/** files reachable from `entry` through static import/export ... from statements (relative specifiers only) */
function reachable(entry) {
  const seen = new Set(), todo = [entry];
  while (todo.length) {
    const f = todo.pop(); if (seen.has(f)) continue; seen.add(f);
    for (const m of readText(f).matchAll(/^\s*(?:import|export)\s[^;]*?from\s+['"](\.[^'"]+)['"]|^\s*import\s+['"](\.[^'"]+)['"]/gm)) todo.push(path.resolve(path.dirname(f), m[1] || m[2]));
  }
  return [...seen].map(rel).sort();
}

describe('the ES-module route carries the runtime subset, not the full document', () => {
  const RUNTIME = ['anchors.js', 'anchors.runtime.generated.js', 'bridge.js', 'core.js', 'extras.js', 'index.js', 'model.js', 'playback.js'];
  test('static: the import graph of index.js is the eight lean modules and does not contain anchors.generated.js', () => {
    const files = reachable(ENTRY); assert.deepEqual(files, RUNTIME); assert.ok(!files.includes('anchors.generated.js'));
    const statements = readText(ENTRY).split(/\r?\n/).filter((l) => /^\s*(import|export)\b/.test(l)).join(' ');
    assert.doesNotMatch(statements, /anchors\.generated\.js/, 'index.js must not import or re-export the full document');
  });
  const HOOKS = typeof nodeModule.registerHooks === 'function';
  test('dynamic: importing index.js in a fresh process loads exactly those modules (module.registerHooks records every resolution)', { skip: HOOKS ? false : 'module.registerHooks needs Node 22.15 or newer (the static test above still runs)' }, () => {
    const code = `import { registerHooks } from 'node:module'; const seen = new Set();
      registerHooks({ resolve(spec, ctx, next) { const r = next(spec, ctx); if (r.url.startsWith('file:')) seen.add(r.url); return r; } });
      await import(${JSON.stringify(pathToFileURL(ENTRY).href)}); console.log(JSON.stringify([...seen]));`;
    const r = spawnSync(process.execPath, ['--input-type=module', '-e', code], { encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr); const loaded = JSON.parse(r.stdout.trim().split('\n').pop()).map((u) => path.basename(decodeURIComponent(u)));
    assert.deepEqual([...new Set(loaded)].sort(), RUNTIME); assert.ok(!loaded.includes('anchors.generated.js'));
  });
  test('the runtime document is small (well under the 25 KB the full document takes) and has no text fields', () => {
    const rt = readText(path.join(DIR, 'anchors.runtime.generated.js')), full = readText(path.join(DIR, 'anchors.generated.js'));
    assert.ok(rt.length < 5000, `runtime module ${rt.length} B`); assert.ok(full.length > 20000, `the full document is the 25 KB one (${full.length} B)`);
    assert.doesNotMatch(rt, /"(label|facts|evidence|sources|families|flags|note|fact_confidences|notice|decision)"/, 'no text fields in the runtime subset');
    assert.deepEqual(JSON.parse(JSON.stringify(runtimeDoc(doc))).anchors.map((a) => a.tick), doc.anchors.map((a) => a.tick));
  });
  test('the full document is still there for tooling: it is the source document, byte-for-byte content', async () => {
    const FULL = (await import('../../src/lib/time/anchors.generated.js')).default; assert.deepEqual(JSON.parse(JSON.stringify(FULL)), doc);
  });
  test('an honest bundle estimate of the ES route: the reachable modules minified together with terser, and what the full document would add (reported, budgeted)', async () => {
    const files = reachable(ENTRY).filter((f) => f !== 'index.js' && f !== 'anchors.runtime.generated.js');
    const min = async (f) => (await minify(readText(path.join(DIR, f)).replace(/^import .*$/gm, '').replace(/^export (default )?/gm, ''), { ecma: 2020, compress: { passes: 2 }, mangle: true })).code;
    const code = (await Promise.all(files.map(min))).join('\n'), rt = JSON.stringify(runtimeDoc(doc)), full = JSON.stringify(doc);
    const base = sizeOf(code + rt), withFull = sizeOf(code + full);
    console.log(`# ES route estimate: ${base.raw} B raw / ${base.brotli} B brotli with the runtime subset; ${withFull.raw} B raw / ${withFull.brotli} B brotli if it bundled the full document (+${withFull.brotli - base.brotli} B brotli, +${withFull.raw - base.raw} B raw)`);
    assert.ok(withFull.raw - base.raw > 10000, 'the full document would add over 10 KB raw'); assert.ok(base.brotli < 12000, `ES route ${base.brotli} B brotli`);
  });
});
