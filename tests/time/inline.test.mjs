// The inline / classic-script build of the module (tools/time/inline.mjs): pruned to what the bridge calls, minified with terser, deterministic,
// self-contained, byte-for-byte what the generated files hold, and inside the plan's size budget (TX-12: 2.5 KB brotli).
import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import * as acorn from 'acorn';
import { analyze } from 'eslint-scope';
import m, { makeBridge, makeTimeModel, parseLocal } from '../../src/lib/time/index.js';
import { P, readText, readJson } from '../../tools/time/lib.mjs';
import { buildInline, pruneReturn, stripRegions, KEEP, sizeOf } from '../../tools/time/inline.mjs';
import { inlineDoc, runtimeDoc } from '../../tools/time/slim.mjs';
import { doc } from './helpers.mjs';

const T = m.tickMax;
const STYLES = ['compat', 'chip', 'time', 'day', 'date', 'long', 'short', 'aria', 'frame', 'iso'];
const built = await buildInline(doc);
const onDisk = readText(P('tools', 'time', 'build', 'gtbg-time.inline.js')).trim();
const globalsOf = (code) => new Set(analyze(acorn.parse(code, { ecmaVersion: 'latest', ranges: true }), { ecmaVersion: 2022 }).globalScope.through.map((r) => r.identifier.name));

describe('what the build keeps', () => {
  test('KEEP is exactly what the bridge calls on the model (plus version, dv, tickMax): a new bridge method that needs a pruned member fails here, not in a browser', () => {
    const used = new Set([...readText(P('src', 'lib', 'time', 'bridge.js')).matchAll(/\bmodel\.(\w+)/g)].map((x) => x[1]));
    assert.deepEqual([...new Set([...used, 'version', 'dv', 'tickMax'])].sort(), [...KEEP].sort());
  });
  test('pruneReturn leaves exactly the KEEP members in the returned literal and throws when a kept member no longer exists', () => {
    const src = stripRegions(readText(P('src', 'lib', 'time', 'core.js')).replace(/^export /gm, ''));
    const keys = (code) => { const ast = acorn.parse(code, { ecmaVersion: 'latest' }); const fn = ast.body.find((n) => n.type === 'FunctionDeclaration' && n.id.name === 'makeCore'); const ret = fn.body.body.filter((n) => n.type === 'ReturnStatement').pop(); return ret.argument.properties.map((p) => p.key.name); };
    assert.ok(keys(src).length > KEEP.length, 'the source returns more than the bridge needs');
    assert.deepEqual(keys(pruneReturn(src)).sort(), [...KEEP].sort());
    assert.throws(() => pruneReturn(src, [...KEEP, 'noSuchMember']), /no longer returns: noSuchMember/); assert.throws(() => pruneReturn(src, KEEP, 'nope'), /not found/);
    assert.throws(() => pruneReturn('function makeCore(){ return 5; }'), /must end with return/);
  });
  test('stripRegions removes the marked validation and the ISO parser, and refuses to run on source without markers', () => {
    const src = readText(P('src', 'lib', 'time', 'core.js')); assert.match(src, /anchors must be strictly increasing/); assert.match(src, /function parseLocal/);
    const out = stripRegions(src); assert.doesNotMatch(out, /anchors must be strictly increasing|is outside ' \+ slopeLo|function parseLocal|function daysFromCivil/); assert.match(out, /function civilFromDays/); assert.match(out, /function makeCore/);
    assert.throws(() => stripRegions('const a = 1;'), /no \/\*@strip\*\/ region/);
  });
  test('the inlined document is the minimum the bridge reads: minutes pre-parsed, no status, gaps, ranges, labels; state only when not the default', () => {
    const d = inlineDoc(doc);
    assert.deepEqual(Object.keys(d).sort(), ['anchors', 'approx_sigma_min', 'dv', 'solar', 'tab_days', 'version']);
    assert.equal(d.anchors.length, 33); for (const [i, a] of d.anchors.entries()) { assert.deepEqual(Object.keys(a), ['tick', 'min', 'sigma_min']); assert.equal(a.min, parseLocal(doc.anchors[i].t)); }
    const s = JSON.parse(JSON.stringify(doc)); s.anchors[3].state = 'signed'; s.anchors[3].decision = 'D-1'; assert.equal(inlineDoc(s).anchors[3].state, 'signed');
  });
  test('the runtime (ES route) document: every field makeTimeModel reads, none of the text fields', () => {
    const r = runtimeDoc(doc);
    assert.equal(r.anchors.length, 33); for (const a of r.anchors) for (const k of Object.keys(a)) assert.ok(['tick', 't', 'status', 'sigma_min', 'effective_status', 'state', 'review_flag', 'circular', 'range'].includes(k), k);
    assert.deepEqual(r.anchors.find((a) => a.tick === 5), { tick: 5, t: '1863-07-01T05:20', status: 'M', sigma_min: 30, effective_status: 'D', review_flag: 'owner-decision', circular: true, range: ['05:00', '05:30'] });
    assert.deepEqual(Object.keys(r.solar), ['1863-07-01'], 'days identical to July 1 are not repeated (the model falls back to July 1)');
    const s = JSON.parse(JSON.stringify(doc)); s.solar['1863-07-02'].sunrise = '04:36'; assert.deepEqual(Object.keys(runtimeDoc(s).solar), ['1863-07-01', '1863-07-02'], 'a day that differs IS kept');
    assert.deepEqual(Object.keys(inlineDoc(s).solar), ['1863-07-01', '1863-07-02']);
  });
});

describe('the built inline module', () => {
  test('it is a single expression `(function(){...})()` that parses, is deterministic, and is byte-identical to the generated file', async () => {
    assert.match(built.inline, /^\(function\(\)\{[\s\S]*\}\)\(\)$/); acorn.parse('var G=' + built.inline + ';', { ecmaVersion: 'latest' });
    assert.equal((await buildInline(doc)).inline, built.inline, 'two builds from one document are the same bytes'); assert.equal(built.inline, onDisk, 'run node tools/time/build.mjs');
  });
  test('it is self-contained: the only free names are the language built-ins it uses (a stripped helper left behind would be an unresolved global in the bundle)', () => {
    assert.deepEqual([...globalsOf('var G=' + built.inline + ';')].sort(), ['Float64Array', 'Map', 'Math']);
  });
  test('the validation and the ISO parser are gone (they stay in the ES route): no error strings, no calendar-to-days function, no regexp date parser', () => {
    for (const s of ['strictly increasing', 'slope', 'need at least two', 'first anchor', 'bad local time', 'must be']) assert.ok(!built.inline.includes(s), s);
    assert.ok(!/\\d\{4\}-\\d\{2\}/.test(built.inline), 'no ISO date regexp');
  });
  test('size (TX-12): within the 2.5 KB brotli budget, and the recorded numbers are the real ones', () => {
    const size = readJson(P('tools', 'time', 'build', 'size.json')), now = sizeOf(built.inline);
    assert.deepEqual({ raw: size.raw, gzip: size.gzip, brotli: size.brotli }, now, 'size.json is stale: run node tools/time/build.mjs');
    assert.ok(now.brotli <= size.budget_brotli, `${now.brotli} B brotli exceeds the ${size.budget_brotli} B budget`); assert.equal(size.budget_brotli, 2560);
    assert.ok(now.raw < 7000, `raw ${now.raw}`); assert.ok(size.es_route_data.raw < 5000 && size.full_document.raw > 3 * size.es_route_data.raw, 'the ES route carries a fraction of the full document');
    console.log(`# inline: ${now.raw} B raw, ${now.gzip} B gzip, ${now.brotli} B brotli (budget ${size.budget_brotli}); ES-route data ${size.es_route_data.raw} B raw / ${size.es_route_data.brotli} B brotli; full document ${size.full_document.raw} B`);
  });
});

describe('the built inline module behaves exactly like src/lib/time', () => {
  const sb = { window: {} }; vm.createContext(sb); vm.runInContext('var G=' + built.inline + ';', sb);
  const G = sb.G, ref = makeBridge(m);
  test('every method, every tick, every style, hour steps, hostile input: identical to the source bridge', () => {
    for (let t = 1; t <= T; t++) {
      for (const s of STYLES) assert.equal(G.f(t, s), ref.f(t, s), `f ${t} ${s}`); for (const s of ['compat', 'time']) assert.equal(G.x(t, s), ref.x(t, s));
      for (const dm of [60, -60, 5, -5, 1, -1, 240, -240, 0]) assert.equal(G.after(t, dm), ref.after(t, dm), `after ${t} ${dm}`);
      assert.equal(G.hour(t), ref.hour(t)); assert.equal(G.phase(t), ref.phase(t)); assert.equal(G.tab(t), ref.tab(t)); assert.equal(G.approx(t), ref.approx(t)); assert.equal(G.minutes(t), ref.minutes(t)); assert.equal(G.tickAt(G.minutes(t)), t, 'the inline inverse is exact too');
    }
    for (const bad of [NaN, undefined, null, 'x', {}, [], Infinity, -Infinity, 1e9, -3, 538.5, 676, 0, Symbol('s'), 10n]) { assert.equal(G.f(bad), ref.f(bad)); assert.equal(G.after(bad, bad), ref.after(bad, bad)); assert.equal(G.tickAt(bad), ref.tickAt(bad)); assert.equal(G.hour(bad), ref.hour(bad)); }
    assert.deepEqual([G.version, G.dv, G.tickMax, G.tabStart(1), G.tabStart(2), G.tabStart(3)], [m.version, m.dv, T, 1, 226, 451]);
  });
  test('the generated IIFE form evaluates to the same object on a page (window.GTBGTime)', () => {
    const page = { window: {} }; page.globalThis = page; vm.createContext(page); vm.runInContext(readText(P('tools', 'time', 'build', 'gtbg-time.iife.js')), page);
    for (let t = 1; t <= T; t += 7) for (const s of STYLES) assert.equal(page.GTBGTime.f(t, s), ref.f(t, s));
  });
  test('a "signed" state in the inlined document changes "about" exactly as it does in the ES model (the one runtime input besides sigma)', async () => {
    const d = JSON.parse(JSON.stringify(doc)); for (const a of d.anchors) if (a.tick === 12 || a.tick === 518) { a.state = 'signed'; a.decision = 'D-0001'; }
    const b2 = await buildInline(d), sb2 = { window: {} }; vm.createContext(sb2); vm.runInContext('var G=' + b2.inline + ';', sb2);
    const r2 = makeBridge(makeTimeModel(d));
    for (let t = 1; t <= T; t++) assert.equal(sb2.G.f(t, 'compat'), r2.f(t, 'compat'), `tick ${t}`);
    assert.doesNotMatch(sb2.G.f(12, 'compat'), /about/); assert.match(sb2.G.f(13, 'compat'), /about/);
  });
});
