// The crowd's GLSL ES 3.00 programs on a REAL OpenGL ES 3.2 context (Mesa llvmpipe through Xvfb and GLX, software): compiled and linked, the uniforms gl.mjs sets active, the cross-fade's dither run and compared with lod.mjs.
// The work is tests/crowd-lod-glsl.py (python standard library, about 3 s); this file runs it inside the node suite and reads its report. Without Xvfb, python3 or the system's libGL the test is SKIPPED with that said in
// its name, because nothing then compiled the GLSL: that is a gap to read, not a pass (app/docs/CROWD-NOTES.md, "Cross-fade between levels of detail"). The WGSL twin (tests/crowd-lod-naga.py) needs the wgpu package and is run by hand.
import test from 'node:test'; import assert from 'node:assert/strict'; import { spawnSync } from 'node:child_process'; import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os'; import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const have = cmd => spawnSync('sh', ['-c', `command -v ${cmd}`]).status === 0;
const libGL = ['/usr/lib/x86_64-linux-gnu/libGL.so.1', '/usr/lib64/libGL.so.1', '/usr/lib/libGL.so.1', '/lib/x86_64-linux-gnu/libGL.so.1'].some(f => fs.existsSync(f));
const missing = [!have('Xvfb') && 'Xvfb', !have('python3') && 'python3', !libGL && 'libGL'].filter(Boolean);
const skip = missing.length ? `SKIPPED, nothing compiled the crowd GLSL here (missing: ${missing.join(', ')})` : false;

test('the crowd GLSL compiles and links on a real GLES 3.2 context and its dither equals lod.mjs', { skip, timeout: 170000 }, () => {
  const out = path.join(os.tmpdir(), `crowd-glsl-report-${process.pid}.json`);
  const r = spawnSync('python3', ['-I', path.join(HERE, 'crowd-lod-glsl.py'), '--out', out], { encoding: 'utf8', timeout: 150000 });
  const log = (r.stdout || '') + (r.stderr || '');
  assert.equal(r.status, 0, log.slice(-3000));
  const rep = JSON.parse(fs.readFileSync(out, 'utf8')); fs.rmSync(out, { force: true });
  assert.equal(rep.ok, true, log.slice(-3000)); assert.deepEqual(rep.errors, []);
  assert.match(rep.context.version, /OpenGL ES 3\./);
  for (const n of ['c-mid', 'c-midS', 'c-near', 'c-nearS', 'c-imp']) { assert.equal(rep.programs[n].ok, true, n); assert.equal(rep.programs[n].link_log, '', n + ' link log'); }
  for (const [k, v] of Object.entries(rep.uniforms)) assert.notEqual(v, 'INACTIVE', k);
  for (const [k, v] of Object.entries(rep.controls)) assert.doesNotMatch(v, /^(NOT CAUGHT|ACTIVE)/, k);
  const d = rep.dither; assert.ok(d.pixels_compared > 1e6); assert.equal(d.differing_outside_tolerance, 0); assert.ok(d.differing_fraction < 0.002); assert.equal(d.gaps, 0); assert.equal(d.overlaps, 0); assert.equal(d.reverse_order_identical, true);
});
