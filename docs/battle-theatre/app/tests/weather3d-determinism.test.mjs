// The check itself: tests/weather3d-determinism-lint.mjs (a syntax-tree lint of the draw path of the weather and effects layers: nothing that decides what is uploaded may read a clock or a random source, so that the same
// simulation time and camera give the same pixels). Every kind of defect it claims to find is injected into a small module and must be found, under the rule that names it; every construct it claims to allow must not
// be reported; a text that is not a module is an error, never "nothing found". The lint over the real files, and the behaviour with the clock and the random source replaced by counters, are in weather3d-gpu.test.mjs.
// node --test docs/battle-theatre/app/tests/weather3d-determinism.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { nondeterminismIn, drawPathFiles, relApp } from './weather3d-determinism-lint.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url)), APP = path.resolve(HERE, '..');
const rules = src => nondeterminismIn(src).map(x => x.rule);
const found = (src, re, what) => { const r = rules(src); assert.ok(r.some(x => re.test(x)), `${what || src} was not found (rules: ${JSON.stringify(r)})`); return r; };
const clean = (src, what) => assert.deepEqual(nondeterminismIn(src), [], `${what || src} was reported`);

test('a random source: Math.random however it is spelled, reached or aliased', () => {
  for (const src of ['const x = Math.random();', "const x = Math['random']();", 'const x = Math[`random`]();', 'export const f = () => Math.random() * 2;', 'const r = (() => Math.random())();']) found(src, /^Math\.random$/);
  found('const x = globalThis.Math.random();', /Math\.random through a global object/); found('const x = window.Math.random();', /Math\.random through a global object/); found("const x = self['Math'].random();", /Math\.random through a global object/);
  found('const k = "rand" + "om"; const x = Math[k]();', /^Math\[\.\.\.\]: a computed key cannot be shown to be safe$/); found('const x = Math[name]();', /Math\[\.\.\.\]/);
  found('const M = Math; const x = M.random();', /Math used as a value/); found('const { random } = Math; const x = random();', /Math used as a value/); found('function f(m) { return m.random(); } f(Math);', /Math used as a value/); found('const lib = { m: Math };', /Math used as a value/);
  found('const x = crypto.getRandomValues(new Uint32Array(1));', /^crypto\.getRandomValues$/); found('const x = crypto.randomUUID();', /^randomUUID$/); found('const x = globalThis.crypto.randomUUID();', /randomUUID/); found('const x = window.crypto;', /^window\.crypto$/); found("const x = globalThis['crypto'];", /globalThis\['crypto'\]/);
  found('const f = c.getRandomValues;', /^getRandomValues$/);
});
test('a clock: Date.now, new Date(), Date(), performance and hrtime, however they are spelled, reached or aliased', () => {
  for (const src of ['const t = Date.now();', "const t = Date['now']();", 'const f = Date.now;', 'const t = (0, Date.now)();']) found(src, /^Date\.now$/);
  found('const t = new Date();', /^new Date\(\)$/); found('const t = new Date;', /^new Date\(\)$/); found('const t = Date();', /^Date\(\)$/); found('const t = new Date().getTime();', /^new Date\(\)$/); found('const k = "no" + "w"; const t = Date[k]();', /^Date\[\.\.\.\]/);
  found('const D = Date; const t = D.now();', /Date used as a value/); found('const { now } = Date; const t = now();', /Date used as a value/);
  found('const t = performance.now();', /^performance\.now$/); found('const t = performance.timeOrigin;', /^performance\.timeOrigin$/); found("const t = performance['now']();", /^performance\.now$/); found('const t = performance[k]();', /^performance\.\[\.\.\.\]$/); found('const p = performance;', /performance used as a value/);
  found('const t = globalThis.performance.now();', /^globalThis\.performance$/); found('const t = window.performance.now();', /^window\.performance$/); found("const t = self['performance'].now();", /self\['performance'\]/);
  found('const t = process.hrtime();', /^hrtime$/); found('const t = process.hrtime.bigint();', /^hrtime$/);
  found('const t = Date.now() - t0;', /^Date\.now$/);
});
test('code made from a string cannot be shown to be safe: eval and Function', () => {
  found("eval('1 + 1');", /^eval: code made from a string$/); found("const f = new Function('a', 'return a');", /^Function: code made from a string$/); found("const f = Function('a', 'return a');", /^Function: code made from a string$/);
});
test('findings come with their line and column, in source order, one per use', () => {
  const src = 'const a = 1;\nconst t = Date.now();\n\nconst r = Math.random() + Math.random();\nconst p = performance.now();\n';
  const r = nondeterminismIn(src); assert.deepEqual(r.map(x => [x.rule, x.line]), [['Date.now', 2], ['Math.random', 4], ['Math.random', 4], ['performance.now', 5]]); assert.equal(r[0].col, 11); assert.equal(r[1].col, 11); assert.equal(r[2].col, 28); assert.ok(r[1].col < r[2].col);
  assert.deepEqual(nondeterminismIn(''), []); assert.deepEqual(nondeterminismIn('// Math.random()\n'), []);
});
test('what is allowed on purpose is not reported: bounded waits, dates built from their inputs, type tests, GPU-time statistics, names that only look like the globals', () => {
  clean('const id = setTimeout(() => {}, 100); clearTimeout(id);', 'a bounded wait');
  clean('const d = new Date(86400000); const e = new Date(2026, 10, 16); const f = new Date("2026-11-16T00:00:00Z"); const t = d.getTime();', 'a date built from its inputs');
  clean('const t = Date.UTC(1863, 6, 3, 13, 0); const p = Date.parse("1863-07-03");', 'Date.UTC and Date.parse are pure');
  clean('const has = typeof performance !== "undefined" && typeof Date === "function" && typeof Math === "object";', 'typeof of a global');
  clean('const isDate = x instanceof Date;', 'instanceof Date'); clean('class Tick { constructor(passMs) { this.passMs = passMs; } } const ms = 1e3 * Math.floor(2.5); const v = Math.sqrt(2) + Math.max(1, 2) + Math.PI;', 'Math functions that are pure, and a field called passMs');
  clean('const o = { performance: 1, Date: 2, Math: 3, crypto: 4 }; const x = o.performance + o.Date + o.Math + o.crypto;', 'property names that spell a global');
  clean('const o = { random() { return 4; }, now: () => 3 }; const x = o.random() + o.now();', 'methods called random and now on something else');
  clean('function f(performance, crypto, Date) { return performance + crypto; }', 'parameters that shadow a global'); clean('const g = (performance) => performance * 2;', 'an arrow parameter that shadows a global');
  clean('import { performance } from "node:perf_hooks"; export const x = 1;', 'an import is not a use'); clean('label: for (;;) { break label; }', 'labels');
  clean('const s = "Math.random() Date.now() performance.now()"; const t = `performance.now() ${1 + 1}`; /* Date.now() */ // new Date()\n', 'strings, template text and comments');
  clean('export function f(x) { return x.a * 2 + Math.sin(x.b) - Math.floor(x.c); }', 'ordinary arithmetic');
  clean('const fixed = new Date(0); const now = fixed.getTime();', 'a variable called now');
});
test('a text that is not a module is an error, never "nothing found"', () => {
  for (const bad of ['const = ;', 'function (', 'export default {', '}}}']) assert.throws(() => nondeterminismIn(bad), undefined, bad);
  assert.doesNotThrow(() => nondeterminismIn('export const x = await Promise.resolve(1);'), 'top-level await is a module');
  assert.doesNotThrow(() => nondeterminismIn('class A { #p = 1; static s = 2; get v() { return this.#p; } }'), 'modern syntax');
});
test('the files of the draw path: every module of the weather and effects folders and the host, sorted, nothing else', () => {
  const files = drawPathFiles(), rel = files.map(relApp);
  const want = []; for (const d of ['src/weather3d', 'src/fx3d']) for (const f of fs.readdirSync(path.join(APP, d)).sort()) if (f.endsWith('.mjs')) want.push(d + '/' + f); want.push('src/fx-host.mjs');
  assert.deepEqual(rel, want); assert.ok(rel.every(f => !f.includes('\\')), 'posix paths'); assert.ok(files.every(f => path.isAbsolute(f) && fs.existsSync(f)));
  assert.ok(rel.length >= 20 && rel.includes('src/fx3d/index.mjs') && rel.includes('src/weather3d/timeline.mjs') && rel.includes('src/weather3d/gpu.mjs'));
});
test('the lint finds a defect planted in a real file of the draw path (a copy, with one line added) and in nothing else', () => {
  for (const f of drawPathFiles().filter(x => /emit\.mjs$|gpu\.mjs$|fx-host\.mjs$/.test(x))) {
    const src = fs.readFileSync(f, 'utf8'); assert.deepEqual(nondeterminismIn(src), [], relApp(f) + ' is clean');
    for (const [line, re] of [['export const __leak = Math.random();', /^Math\.random$/], ['export const __t0 = Date.now();', /^Date\.now$/], ['export const __p = performance.now();', /^performance\.now$/]]) {
      const planted = nondeterminismIn(src + '\n' + line + '\n'); assert.equal(planted.length, 1, relApp(f) + ' with ' + line); assert.match(planted[0].rule, re); assert.equal(planted[0].line, src.split('\n').length + 1);
    }
  }
});
