// ADVERSARIAL VERIFIER tests for workstream time-module (verify-time-module).
// Every test below FAILS on the builder's code as committed: each encodes a defect that the builder's own 129 tests do not catch.
// They are documentation of defects, not fixes: the builder's code was not modified.  Run: node --test tests/time/verify-time-module.test.mjs
import test, { describe, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import m, { createPlayback, makeBridge, validateAnchors, tickToLabel, format } from '../../src/lib/time/index.js';
import { LEGACY } from '../../tools/time/lib.mjs';
import { buildContext, runAll } from '../../tools/time/rules.mjs';
import { doc, model } from './helpers.mjs';

const clone = () => JSON.parse(JSON.stringify(doc));

describe('VERIFY-01 createPlayback.advance: floating-point noise makes a crossing fire twice', () => {
  test('a playback that has not moved (advance(0)) must not report a crossing, for every integer tick it starts on', () => {
    const bad = [];
    for (let t = 1; t <= 675; t++) {
      const s = createPlayback(m, { tick: t, rate: 5 }).advance(0);
      if (s.crossed) bad.push(`${t}:${s.crossed}`);
    }
    assert.equal(bad.length, 0, `${bad.length} ticks report a phantom crossing of the tick they start on, e.g. ${bad.slice(0, 5)}`);
  });
  test('over a full run at 5 battle-min/s with 16 ms frames every tick is crossed exactly once (crossing-based triggers must not double-fire)', () => {
    const pb = createPlayback(m, { tick: 1, rate: 5 }); const seen = new Map(); let frames = 0;
    while (frames++ < 200000) { const s = pb.advance(16); if (s.crossed) for (let k = s.crossed[0]; k <= s.crossed[1]; k++) seen.set(k, (seen.get(k) || 0) + 1); if (s.done) break; }
    const dup = [...seen].filter(([, n]) => n > 1).map(([k]) => k);
    assert.equal(dup.length, 0, `${dup.length} ticks crossed twice, e.g. ${dup.slice(0, 8)} (the first shot, t12, is among them)`);
  });
  test('the same at 1 and 15 battle-min/s', () => {
    for (const rate of [1, 15]) {
      const pb = createPlayback(m, { tick: 1, rate }); const seen = new Map(); let frames = 0;
      while (frames++ < 400000) { const s = pb.advance(16); if (s.crossed) for (let k = s.crossed[0]; k <= s.crossed[1]; k++) seen.set(k, (seen.get(k) || 0) + 1); if (s.done) break; }
      const dup = [...seen].filter(([, n]) => n > 1).map(([k]) => k);
      assert.equal(dup.length, 0, `rate ${rate}: ${dup.length} ticks crossed twice, e.g. ${dup.slice(0, 8)}`);
    }
  });
});

describe('VERIFY-02 minutesToTick(tickToMinutes(t)) is not exactly t', () => {
  test('floor(clockToTick(minutes(t))) === t for every tick (the inverse must snap, TM-V12 only checks a 1e-9 tolerance)', () => {
    const bad = [];
    for (let t = 1; t <= 675; t++) if (Math.floor(m.clockToTick(m.tickToMinutes(t))) !== t) bad.push(t);
    assert.equal(bad.length, 0, `${bad.length} of 675 ticks come back a hair below the integer and floor() to the previous tick, e.g. ${bad.slice(0, 8)}`);
  });
});

describe('VERIFY-03 argument hygiene of the public API', () => {
  test('tickAfterMinutes does not string-concatenate a string minutes argument (60 as "60" must not jump to the last tick)', () => {
    let r; try { r = m.tickAfterMinutes(538, '60'); } catch (e) { assert.ok(e instanceof TypeError); return; }
    assert.equal(r, 556);
  });
  test('the bridge coerces the tick but not the minutes: after(t, NaN) must not return NaN (it would feed setTick(NaN))', () => {
    const b = makeBridge(m);
    for (const dm of [NaN, undefined]) { const r = b.after(538, dm); assert.ok(Number.isInteger(r) && r >= 1 && r <= 675, `after(538, ${dm}) = ${r}`); }
  });
  test('format / tickToLabel reject a non-numeric tick with a clear TypeError like tickToClock does, not "Cannot read properties of undefined (reading slice)"', () => {
    for (const bad of [NaN, undefined, {}]) {
      for (const fn of [() => format(bad, 'long'), () => tickToLabel(bad)]) {
        let msg = null; try { fn(); } catch (e) { msg = e.message; }
        if (msg !== null) assert.match(msg, /tick/i, `unhelpful error for ${String(bad)}: ${msg}`);
      }
    }
  });
});

describe('VERIFY-04 validateAnchors "never throws" (its own contract) and rejects malformed ranges', () => {
  const mut = (f) => { const d = clone(); f(d); return d; };
  for (const [name, f] of [
    ['a null anchor entry', (d) => { d.anchors[3] = null; }],
    ['a null tab_days entry', (d) => { d.tab_days[1] = null; }],
    ['a null gaps entry', (d) => { d.gaps = [null]; }],
    ['a one-element range', (d) => { d.anchors[3].range = ['10:15']; }],
  ]) test(`${name} is reported as an error, not thrown`, () => {
    let r; try { r = validateAnchors(mut(f)); } catch (e) { assert.fail(`threw ${e.constructor.name}: ${e.message}`); }
    assert.equal(r.ok, false);
  });
  test('a range with an unparseable time ("10:15", "abc") is an error, not silently accepted', () => {
    assert.equal(validateAnchors(mut((d) => { d.anchors[3].range = ['10:15', 'abc']; })).ok, false);
  });
});

describe('VERIFY-05 the circular anchor t5 is imported "as design class" but the model still reports class B', () => {
  test('tickToClock(5).basis follows effective_status D (chapter 04: t5 as D sigma 30)', () => {
    const a5 = doc.anchors.find((a) => a.tick === 5); assert.equal(a5.effective_status, 'D');
    assert.equal(m.tickToClock(5).basis, 'D');
  });
});

describe('VERIFY-06 TM-V9 / TM-V17 mutation resilience: the rules only catch the exact legacy spellings (TX-15 "mutation test turns CI red")', () => {
  const temps = []; after(() => { for (const d of temps) fs.rmSync(d, { recursive: true, force: true }); });
  const copyTree = () => { const d = fs.mkdtempSync(path.join(os.tmpdir(), 'gtbg-vfy-')); temps.push(d); fs.cpSync(LEGACY, d, { recursive: true, filter: (s) => !/[\\/](screenshots|icons)([\\/]|$)/.test(s) && !/\.(png|pdf|ico)$/.test(s) }); return d; };
  const snap = (tree) => Object.fromEntries(runAll(buildContext(model, doc, tree ? { tree } : {})).map((r) => [r.id, r.count]));
  const base = snap();
  const inject = (code) => { const d = copyTree(); const p = path.join(d, 'search.html'); fs.writeFileSync(p, fs.readFileSync(p, 'utf8').replace('</body>', `<script>${code}</script></body>`)); return snap(d); };
  const worse = (n) => Object.keys(n).filter((id) => (n[id] ?? 0) > (base[id] ?? 0));
  for (const [name, code] of [
    ['a date built by string concatenation ("July " + (tab + 2))', 'const dd = (tab) => "July " + (tab + 2);'],
    ['a typed 12-hour formatter that appends " PM" / " AM"', 'function lbl(h){ return h >= 12 ? (h - 12 || 12) + " PM" : h + " AM"; }'],
    ['an hour computed as 5 + (tick - 1) / 12', 'function clockA(tick){ const h = 5 + Math.floor((tick - 1) / 12); return h + ":00"; }'],
    ['a millisecond clock: Date.UTC(...) + tick * 300000', 'function clockC(tick){ return new Date(Date.UTC(1863,6,1,10,0) + (tick - 1) * 300000).toUTCString(); }'],
  ]) test(`${name} makes at least one TM rule worse`, () => { assert.ok(worse(inject(code)).length > 0, 'no rule noticed the injected tick-to-clock defect'); });
});
