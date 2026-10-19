// Re-verification of the time-module fixes (commit 7983c92). Written by an independent re-verifier with inputs the fixer did not use.
//
//   PART A  guards that PASS today: the same properties the fixer claims, checked on NEW random inputs (irregular frame lengths, random
//           anchor sets with gaps, hostile values, a JSON fuzz of the validator, inline vs ES bridge parity). They fail if a fix regresses.
//   PART B  failing tests for the defects the re-verification found (each names its evidence). Do not weaken them: fix the builder code.
//
// Run: node --test tests/time/reverify-time-module.test.mjs
import test, { describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import m, { makeTimeModel, makeBridge, createPlayback, validateAnchors, loadAnchors, AnchorError } from '../../src/lib/time/index.js';
import { P, LEGACY, readText } from '../../tools/time/lib.mjs';
import { findMatches, monthSites } from '../../tools/time/detectors.mjs';
import { buildContext, runAll } from '../../tools/time/rules.mjs';
// Evidence reason (docs/time/ANCHORS-FINAL.md): the numeric pins in this file describe the FROZEN 2026-09-30 proposal; the live adjudicated file moves anchors and widens windows.
import { proposal as doc, proposalModel as model, rng, randomDoc } from './helpers.mjs';

const clone = (x) => JSON.parse(JSON.stringify(x));

// =====================================================================================================================================
// PART A: guards that pass today
// =====================================================================================================================================
describe('A1 playback: every tick is reported exactly once, in order, whatever the frame lengths, rates and anchor sets (VERIFY-01)', () => {
  test('irregular frames (0, 0.001, 1, 7, 16, 16.67, 33, 100, 250 ms), 8 rates incl. non-ladder, random anchor sets with gaps, setRate mid-run', () => {
    const r = rng(12345);
    const docs = [doc, ...Array.from({ length: 4 }, (_, i) => randomDoc(rng(900 + i)))];
    docs[2] = { ...docs[2], gaps: [{ from: 100, to: 130, policy: 'fast_forward' }, { from: 400, to: 410, policy: 'time_lapse' }] };
    for (const [di, d] of docs.entries()) {
      const mm = makeTimeModel(d);
      for (let run = 0; run < 8; run++) {
        const start = run % 3 === 0 ? 1 : 1 + Math.floor(r() * (mm.tickMax - 1));
        const pb = createPlayback(mm, { rate: [1, 5, 15, 30, 60, 7.3, 0.25, 1234.5][run], tick: start, maxDtMs: run % 2 ? 100 : 1000 });
        const seen = new Map(); const first = mm.floorTick(pb.minutes); let last = first;
        for (let i = 0; i < 100000; i++) {
          if (r() < 0.02) pb.setRate([1, 5, 15, 30, 60][Math.floor(r() * 5)]);
          const dt = [16, 16.67, 33, 7, 0, 0.001, 100, 250, 1][Math.floor(r() * 9)], before = mm.floorTick(pb.minutes);
          assert.equal(before, last, `doc${di} run${run}: the frame changed between steps`);
          const s = pb.advance(dt), after = mm.floorTick(pb.minutes);
          if (s.crossed) { assert.ok(dt > 0, 'advance(0) must not cross'); assert.deepEqual(s.crossed, [before + 1, after]); for (let k = s.crossed[0]; k <= s.crossed[1]; k++) seen.set(k, (seen.get(k) || 0) + 1); } else assert.equal(after, before, 'moved without reporting a crossing');
          last = after; if (s.done) break;
        }
        for (let k = first + 1; k <= last; k++) assert.equal(seen.get(k), 1, `doc${di} run${run}: tick ${k}`);
        assert.equal(seen.size, last - first);
      }
    }
  });
});

describe('A2 the public model and the bridge under hostile values (VERIFY-03)', () => {
  const HOSTILE = [NaN, undefined, null, '60', '', {}, [], [5], Infinity, -Infinity, true, 1n, Symbol('s'), new Number(5), { valueOf() { throw new Error('boom'); } }, { valueOf() { return NaN; } }];
  const API = ['tickToMinutes', 'minutesPerTick', 'uncertaintyMin', 'tabDay', 'tabStart', 'isApprox', 'gapAt', 'dayPart', 'hour', 'minutesToTick', 'floorTick', 'parts', 'format', 'tickToLabel', 'tickToClock', 'tickToLabelParts', 'isGap'];
  test('every public function rejects every non-finite-number argument with a TypeError/RangeError (never returns a value, never a TypeError about undefined)', () => {
    for (const name of API) for (const h of HOSTILE) assert.throws(() => m[name](h), (e) => (e instanceof TypeError || e instanceof RangeError) && !/Cannot read|undefined \(reading/.test(e.message), `${name}(${String(typeof h === 'symbol' ? 'Symbol' : h)})`);
  });
  test('the bridge never throws and never returns NaN/undefined text for a hostile TICK or MINUTES argument (style argument stays a string)', () => {
    const b = makeBridge(m);
    for (const k of ['f', 'x', 'after', 'hour', 'phase', 'tab', 'approx', 'tabStart', 'minutes', 'tickAt']) for (const h of HOSTILE) for (const second of [undefined, 60, 'long']) {
      if (second === 'long' && k !== 'f' && k !== 'x') continue;
      const v = (() => { try { return k === 'after' ? b[k](h, second === 'long' ? 0 : second) : b[k](h, second); } catch (e) { return 'THROW ' + e.message; } })();
      assert.ok(v !== undefined && !(typeof v === 'number' && !Number.isFinite(v)) && !(typeof v === 'string' && /NaN|undefined|Infinity|\[object|THROW/.test(v)), `${k}(${String(typeof h === 'symbol' ? 'Symbol' : h)}, ${second}) -> ${v}`);
    }
    for (const h of HOSTILE) { const t = b.after(h, 60), t2 = b.after(10, h); assert.ok(Number.isInteger(t) && t >= 1 && t <= 675 && Number.isInteger(t2) && t2 >= 1 && t2 <= 675, String(typeof h === 'symbol' ? 'Symbol' : h)); }
  });
});

describe('A3 the validator agrees with the model on JSON-shaped documents (VERIFY-04)', () => {
  const JUNK = [null, -1, 0, 1, 0.5, 1e308, -1e308, '', 'x', '1863-07-01T05:00', '25:99', '1863-02-30T10:00', '1863-07-03T15:00', [], [1], [1, 2, 3], ['07:30'], ['10:00', '09:00'], ['10:00', 'abc'], {}, { a: 1 }, true, false, [[]], [null], 'S', 'Z', 'D', 'M', 'R', 1e21, 226, 675, 12];
  const paths = []; const walk = (o, p) => { if (o && typeof o === 'object') for (const k of Object.keys(o)) { paths.push([...p, k]); walk(o[k], [...p, k]); } }; walk(doc, []);
  const setAt = (root, p, v) => { let o = root; for (let i = 0; i < p.length - 1; i++) { o = o[p[i]]; if (o === null || typeof o !== 'object') return; } const key = p[p.length - 1]; if (v === '__delete__') { if (Array.isArray(o)) o.splice(+key, 1); else delete o[key]; } else o[key] = v; };
  test('2500 mutated documents: validateAnchors never throws or reports V1.internal; ok:true means the model and loadAnchors build and every tick is finite and strictly increasing', () => {
    const r = rng(2026); let ok = 0;
    for (let i = 0; i < 2500; i++) {
      const d = clone(doc); for (let j = 0, n = 1 + Math.floor(r() * 3); j < n; j++) setAt(d, paths[Math.floor(r() * paths.length)], r() < 0.15 ? '__delete__' : JUNK[Math.floor(r() * JUNK.length)]);
      if (Array.isArray(d.anchors) && r() < 0.05) d.anchors.splice(Math.floor(r() * d.anchors.length), 1);
      const v = validateAnchors(d); assert.equal(typeof v.ok, 'boolean'); assert.ok(!v.errors.some((e) => e.code === 'V1.internal'), 'V1.internal: ' + (v.errors[0] && v.errors[0].msg));
      if (!v.ok) continue; ok++;
      const mm = makeTimeModel(d); loadAnchors(d); let prev = -Infinity;
      for (let t = 1; t <= mm.tickMax; t++) { const x = mm.tickToMinutes(t); assert.ok(Number.isFinite(x) && x > prev); prev = x; assert.ok(!/NaN|undefined/.test(JSON.stringify(mm.tickToClock(t)))); }
    }
    assert.ok(ok > 300, 'the fuzz must produce a meaningful number of accepted documents, got ' + ok);
  });
  test('cyclic, throwing-getter, proxy, frozen, 50k-anchor and non-object inputs do not throw; bad JSON text is an AnchorError', () => {
    const cyc = clone(doc); cyc.self = cyc; const thrower = clone(doc); Object.defineProperty(thrower.anchors[3], 'tick', { get() { throw new Error('boom'); }, enumerable: true });
    for (const v of [cyc, thrower, new Proxy(clone(doc), { get() { throw new Error('boom'); }, has() { throw new Error('boom'); } }), Object.freeze(clone(doc)), undefined, 'x', 5, [], () => 1, new Map(), Object.create(null)]) assert.equal(typeof validateAnchors(v).ok, 'boolean');
    for (const s of ['', '{', 'null', '[]', '{"a":', 'undefined', '{"schema":1}']) assert.throws(() => loadAnchors(s), AnchorError, JSON.stringify(s));
  });
});

describe('A4 the inlined bridge equals the ES bridge on random and hostile input (inline size work)', () => {
  test('f, x, after, hour, phase, tab, approx, minutes, tickAt, tabStart over 2000 random ticks x 15 styles and hostile values', () => {
    const inline = readText(P('tools', 'time', 'build', 'gtbg-time.inline.js')).trim(); const sb = {}; vm.createContext(sb); vm.runInContext('var GTBGT=' + inline + ';', sb);
    const G = sb.GTBGT, B = makeBridge(m), r = rng(4242), styles = [undefined, 'compat', 'chip', 'time', 'day', 'date', 'long', 'short', 'aria', 'frame', 'iso', 'nonsense', '', 0, null];
    const hostile = [NaN, undefined, null, '538', '', {}, [], [538], Infinity, -Infinity, -5, 0, 1e9, 1e300, -1e300, 0.4999999999, 675.0000001, 1n, true, new Number(12), { valueOf() { return 77; } }, { valueOf() { throw new Error('x'); } }, -0];
    const same = (a, b) => (a !== a && b !== b) || a === b, call = (o, k, ...a) => { try { return o[k](...a); } catch (e) { return 'THROW:' + e.constructor.name; } };
    for (let i = 0; i < 2000; i++) {
      const t = i < hostile.length * 2 ? hostile[i % hostile.length] : (i % 5 === 0 ? 1 + r() * 674 : Math.floor(1 + r() * 675)) + (r() < 0.05 ? (r() - 0.5) * 2 : 0), dm = [60, -60, 0, 5, -1, 1000, 30.5, NaN, 1e9, r() * 400 - 200, hostile[i % hostile.length]][i % 11];
      for (const s of styles) { assert.ok(same(call(G, 'f', t, s), call(B, 'f', t, s)), `f(${String(t)}, ${s})`); assert.ok(same(call(G, 'x', t, s), call(B, 'x', t, s)), `x(${String(t)}, ${s})`); }
      for (const k of ['hour', 'phase', 'tab', 'approx', 'minutes', 'tickAt', 'tabStart']) assert.ok(same(call(G, k, t), call(B, k, t)), `${k}(${String(t)})`);
      assert.ok(same(call(G, 'after', t, dm), call(B, 'after', t, dm)), `after(${String(t)}, ${String(dm)})`);
    }
  });
});

// =====================================================================================================================================
// PART B: failing tests for the re-verification defects
// =====================================================================================================================================
describe('RV-01 a configuration value the validator accepts is the value the model uses', () => {
  test('approx_sigma_min: 0 is valid (TM-V1 accepts >= 0) and must not be silently replaced by the default 10 (core.js: `doc.approx_sigma_min || 10`)', () => {
    const d = clone(doc); d.approx_sigma_min = 0;
    assert.equal(validateAnchors(d).ok, true, 'precondition: the validator accepts 0');
    assert.equal(makeTimeModel(d).approxSigmaMin, 0, 'the model must use the validated value');
    // and it changes behaviour: a SIGNED anchor with sigma 5 is exact at threshold 10 but approximate at threshold 0
    const s = clone(doc); s.approx_sigma_min = 0; for (const a of s.anchors) { a.state = 'signed'; a.decision = 'D-0001'; }
    const mm = makeTimeModel(s), a = s.anchors.find((x) => x.sigma_min < 10);
    assert.ok(a, 'the candidate set has an anchor under 10 minutes'); assert.equal(mm.isApprox(a.tick), true, 'sigma >= approx_sigma_min (0) means approximate');
  });
});

describe('RV-02 options are validated like arguments: a bad roundMin never prints "NaN" (argument hygiene beyond VERIFY-03)', () => {
  for (const [name, roundMin] of [['a non-numeric string', 'abc'], ['Infinity', Infinity], ['an object', {}]]) {
    test(`roundMin ${name}: format / tickToLabel / tickToLabelParts / parts throw a TypeError/RangeError or return clean text`, () => {
      const calls = { format: () => m.format(100, 'time', { roundMin }), tickToLabel: () => m.tickToLabel(100, { style: 'time', roundMin }), tickToLabelParts: () => m.tickToLabelParts(100, { style: 'time', roundMin }), parts: () => m.parts(100, roundMin) };
      for (const [k, fn] of Object.entries(calls)) {
        let out; try { out = fn(); } catch (e) { assert.ok(e instanceof TypeError || e instanceof RangeError, `${k}: ${e.constructor.name} ${e.message}`); continue; }
        assert.doesNotMatch(JSON.stringify(out), /NaN|undefined|null/, `${k} returned ${JSON.stringify(out).slice(0, 90)}`);
      }
    });
  }
});

describe('RV-03 the detectors cover the spellings a developer would naturally write (TM-V9 / TM-V16, TX-05, TX-15)', () => {
  const hit = (code, bucket) => findMatches(code, bucket ? [bucket] : undefined).filter((h) => !h.allowed);
  test('the 5-minute step in milliseconds written 300_000 or 300 * 1000 (the fixer covers 300000, 3e5, 5 * 60000, 5 * 60 * 1000)', () => {
    for (const code of ['const ms = START + (t - 1) * 300_000;', 'const ms = START + (t - 1) * 300 * 1000;', 'const STEP_MS = 300_000;', 'const STEP_MS = 300 * 1000;']) assert.ok(hit(code, 'tick5').length > 0, `no tick5 hit for: ${code}`);
  });
  test('a literal date table indexed by the Day tab, ["July 1", "July 2", "July 3"][tab - 1], is a Day-tab date (TM-V16: every printed date derives from the model)', () => {
    const code = 'const dayText = ["July 1", "July 2", "July 3"][tab - 1];'; assert.ok(monthSites(code).length > 0 || hit(code, 'date').length > 0, `no date site for: ${code}`);
  });

  // the two scope gaps need the real rule engine on a copy of the frozen site (the legacy tree is only READ)
  const run = promisify(execFile); let tree, base; const temps = [];
  before(() => { tree = fs.mkdtempSync(path.join(os.tmpdir(), 'gtbg-rv-')); temps.push(tree); fs.cpSync(LEGACY, tree, { recursive: true, filter: (s) => !/[\\/](screenshots|icons)([\\/]|$)/.test(s) && !/\.(png|pdf|ico)$/.test(s) }); base = counts(tree); });
  after(() => { for (const d of temps) fs.rmSync(d, { recursive: true, force: true }); });
  const counts = (t) => Object.fromEntries(runAll(buildContext(model, doc, { tree: t })).map((r) => [r.id, r.count]));
  const worseAfter = (rel, add) => { const p = path.join(tree, rel), original = fs.readFileSync(p, 'utf8'); fs.writeFileSync(p, add(original)); try { const c = counts(tree); return Object.keys(c).filter((id) => c[id] > base[id]); } finally { fs.writeFileSync(p, original); } };
  test('a tick -> clock formula added to the root-level shared script site-nav.js (loaded by every page) turns a TM rule red (today only surfaces --check sees it: TM-V9 scans assets/* and *.html)', () => {
    const worse = worseAfter('site-nav.js', (s) => s + '\nwindow.__clock = (tick) => 300 + (tick - 1) * 5;\n');
    assert.ok(worse.includes('TM-V9'), 'TM-V9 did not notice a tick*5 clock in site-nav.js (worse: ' + worse + ')');
  });
  test('a hand-typed clock inside a string ("Pickett steps off at 3:00 PM") is an "AM|PM outside the module" hit (chapter 04 TM-V9 as written; TX-05 "no hand-typed clock")', () => {
    const worse = worseAfter('documentary.html', (s) => s.replace('</body>', '<script>const hit = { when: "Pickett steps off at 3:00 PM" };</script></body>'));
    assert.ok(worse.includes('TM-V9') || worse.includes('TM-V17'), 'neither TM-V9 nor TM-V17 noticed a typed clock literal (worse: ' + worse + ')');
  });
});
