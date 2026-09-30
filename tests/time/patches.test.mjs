// The CANDIDATE clock bridge (tools/t0/patches-next/CLOCK.json): every anchor asserted on the legacy text, no new free names, overlap with the
// T0 groups, and mutation tests for the checker itself (WP-TIME-10 bridge). No browser is used.
import test, { describe, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';
import { P, readJson, readText } from '../../tools/time/lib.mjs';
import { model } from './helpers.mjs';

const FILE = P('tools', 't0', 'patches-next', 'CLOCK.json');
const spec = readJson(FILE);
const temps = []; after(() => { for (const d of temps) fs.rmSync(d, { recursive: true, force: true }); });
const tmpdir = (n) => { const d = fs.mkdtempSync(path.join(os.tmpdir(), `gtbg-${n}-`)); temps.push(d); return d; };
const check = (...args) => spawnSync(process.execPath, [P('tools', 'time', 'check-patches.mjs'), ...args], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

describe('CLOCK.json structure (T0 patch-file format)', () => {
  test('group CLOCK, only the T0 keys, unique ids, allowed targets, regex repl without backslashes', () => {
    assert.equal(spec.group, 'CLOCK'); assert.deepEqual(Object.keys(spec).sort(), ['description', 'group', 'patches']); assert.match(spec.description, /CANDIDATE/);
    const ids = new Set(); const allowed = ['id', 'target', 'find', 'repl', 'expect', 'regex', 'note'];
    for (const p of spec.patches) {
      assert.ok(!ids.has(p.id), p.id); ids.add(p.id); assert.deepEqual(Object.keys(p).filter((k) => !allowed.includes(k)), [], p.id);
      assert.ok(['js', 'help', 'book'].includes(p.target) || /^[a-z-]+\.html$/.test(p.target), `${p.id} target ${p.target}`);
      assert.ok(Number.isInteger(p.expect) && p.expect >= 1); assert.ok(p.note && p.note.length > 10, `${p.id} has no note`);
      if (p.regex) assert.ok(!/\\/.test(p.repl), `${p.id}: m.expand would interpret a backslash`);
    }
    assert.equal(spec.patches.length, 56); assert.equal(spec.patches.filter((p) => p.regex).length, 3);
  });
  test('it is regenerated deterministically from the module and the legacy text', () => {
    const before = readText(FILE); const r = spawnSync(process.execPath, [P('tools', 'time', 'build-clock-patches.mjs')], { encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr); assert.match(r.stdout, /unchanged/); assert.equal(readText(FILE), before);
  });
  test('it lives in patches-next (inert): tools/t0/patches has no CLOCK file and nothing in this workstream wrote there', () => {
    assert.ok(!fs.existsSync(P('tools', 't0', 'patches', 'CLOCK.json'))); assert.ok(!fs.existsSync(P('tools', 't0', 'patches', 'B+CLOCK.json')));
  });
});

describe('the checker: apply, parse, scope, evaluate', () => {
  test('all 56 anchors match the pristine legacy text exactly as often as expected; every patched script parses; no new free names; module parity', () => {
    const r = check(); assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stdout, /56 patches in group "CLOCK" \(3 regex\), 56 applied/); assert.match(r.stdout, /scope: no new unresolved identifiers/);
    assert.match(r.stdout, /inline module parity: 675 ticks x 9 styles/); assert.match(r.stdout, /7 routed through the module, 1 still legacy/);
    for (const f of ['assets/index-Cg8FAMXN.js', 'assets/HelpModal-CFV9T0zH.js', 'assets/BookmarkPanel-C5YT4b5k.js', 'compare.html', 'living-ledger.html', 'camera.html', 'immersive.html', 'documentary.html', 'education.html', 'turning-points.html', 'sandbox.html', 'regiment.html', 'search.html']) assert.match(r.stdout, new RegExp(f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ': parses'));
  });
  test('it also applies on top of the real T0 groups (R0 A B DL C AX CP), with CLOCK at the end and right after group B (the regex anchors survive D1-D3)', () => {
    for (const pos of ['end', 'after-B']) {
      const r = check('--after-t0', '--position=' + pos, '--out=' + tmpdir('t0'), '--no-scope'); assert.equal(r.status, 0, pos + '\n' + r.stdout + r.stderr);
      assert.ok(+/(\d+) T0 patches applied/.exec(r.stdout)[1] >= 125, 'the T0 groups (125 when this was written; other workstreams add more)'); assert.match(r.stdout, /0 did not apply/); assert.match(r.stdout, /56 patches in group "CLOCK" \(3 regex\), 56 applied on top of the T0 groups/);
    }
  });
  test('validators before -> after: TM-V17 13 -> 0, TM-V16 7 -> 1, TM-V9 falls', () => {
    const r = check('--out=' + tmpdir('val'), '--no-scope'); const m = /validators, legacy -> patched: (.*)/.exec(r.stdout)[1];
    assert.match(m, /TM-V17 13 -> 0/); assert.match(m, /TM-V16 7 -> 1/); const v9 = /TM-V9 (\d+) -> (\d+)/.exec(m); assert.ok(+v9[2] < +v9[1] - 20);
  });
});

describe('mutation tests of the checker itself', () => {
  const variant = (mut) => { const s = JSON.parse(JSON.stringify(spec)); mut(s); const f = path.join(tmpdir('variant'), 'CLOCK.json'); fs.writeFileSync(f, JSON.stringify(s)); return f; };
  test('a wrong anchor is reported with its id and nothing is claimed applied', () => {
    const f = variant((s) => { s.patches.find((p) => p.id === 'CLK-06-toolbar-clock').find += 'X'; });
    const r = check('--file=' + f, '--out=' + tmpdir('o'), '--no-scope'); assert.equal(r.status, 1); assert.match(r.stderr, /CLK-06-toolbar-clock: expected 1, found 0/);
  });
  test('a wrong expected count is caught (a two-match anchor claimed once)', () => {
    const f = variant((s) => { s.patches.push({ id: 'CLK-99', target: 'js', find: 'children:', repl: 'children:', expect: 1, note: 'x' }); });
    const r = check('--file=' + f, '--out=' + tmpdir('o'), '--no-scope'); assert.equal(r.status, 1); assert.match(r.stderr, /CLK-99: expected 1, found \d+/);
  });
  test('a patch that references a misspelled module name introduces an unresolved identifier and fails the scope check', () => {
    const f = variant((s) => { const p = s.patches.find((x) => x.id === 'CLK-17-toast-time'); p.repl = p.repl.replace('GTBGT.f', 'GTBGX.f'); });
    const r = check('--file=' + f, '--out=' + tmpdir('o')); assert.equal(r.status, 1); assert.match(r.stderr, /new unresolved identifier assets\/index-Cg8FAMXN\.js: GTBGX/);
  });
  test('a syntax error introduced into a page patch is caught', () => {
    const f = variant((s) => { const p = s.patches.find((x) => x.id === 'CLK-31-compare-clock'); p.repl = p.repl.replace('}', ''); });
    const r = check('--file=' + f, '--out=' + tmpdir('o'), '--no-scope'); assert.equal(r.status, 1); assert.match(r.stderr, /compare\.html: syntax error/);
  });
  test('a repl that changes what the function returns is caught by the evaluation step', () => {
    const f = variant((s) => { const p = s.patches.find((x) => x.id === 'CLK-04-monument-tooltip-JF'); p.repl = p.repl.replace('"compat"', '"time"'); });
    const r = check('--file=' + f, '--out=' + tmpdir('o'), '--no-scope'); assert.equal(r.status, 1); assert.match(r.stderr, /rewritten bundle functions differ/);
  });
  test('T0-illegal keys and generated-file targets are rejected like the T0 loader would', () => {
    const f = variant((s) => { s.patches[0].bogus = 1; s.patches.push({ id: 'CLK-98', target: 'sw.js', find: 'a', repl: 'b', expect: 1 }); });
    const r = check('--file=' + f, '--out=' + tmpdir('o'), '--no-scope'); assert.equal(r.status, 1); assert.match(r.stderr, /unexpected keys bogus/); assert.match(r.stderr, /sw\.js is generated by the T0 build/);
  });
});

describe('the inlined module as it ships in a page', () => {
  test('tools/time/build/gtbg-time.iife.js evaluated in a vm equals the module for every tick and style; hostile input never throws', () => {
    const sb = { window: {} }; sb.globalThis = sb; vm.createContext(sb);
    vm.runInContext(readText(P('tools', 'time', 'build', 'gtbg-time.iife.js')), sb);
    const G = sb.GTBGTime; assert.ok(G);
    for (let t = 1; t <= 675; t++) for (const s of ['compat', 'chip', 'time', 'day', 'date', 'long', 'short', 'aria', 'frame']) assert.equal(G.f(t, s), model.tickToLabel(t, { style: s }), `${t} ${s}`);
    for (const bad of [0, 676, NaN, -1, 1e9, 'abc', undefined, null, {}, [], 538.5]) assert.equal(typeof G.f(bad, 'compat'), 'string');
    assert.equal(G.f(538, 'compat'), 'July 3, about 3:00 PM'); assert.equal(G.f(160, 'chip'), 'Night of July 1-2, about 12:05 AM'); assert.equal(G.f(226, 'day'), 'July 2');
    assert.equal(G.after(538, 60), 556); assert.equal(G.tabStart(2), 226); assert.equal(G.tabStart(3), 451); assert.equal(G.tickMax, 675);
  });
  test('size: within the plan\'s 2.5 KB brotli budget (TX-12), recorded honestly (the pruned + terser build; tests/time/inline.test.mjs re-derives the numbers)', () => {
    const size = readJson(P('tools', 'time', 'build', 'size.json'));
    assert.ok(size.raw > 0 && size.gzip > 0 && size.brotli > 0); assert.equal(size.budget_brotli, 2560);
    assert.ok(size.brotli <= size.budget_brotli, `inline module ${size.brotli} B brotli is over the ${size.budget_brotli} B budget`);
    console.log(`# inline module: ${size.raw} B raw, ${size.gzip} B gzip, ${size.brotli} B brotli (budget ${size.budget_brotli}) - ${size.brotli <= size.budget_brotli ? 'within budget' : 'over budget'}`);
  });
  test('CLK-00 embeds exactly the current inline build (a stale CLOCK.json after a module change fails here), and the page form embeds the same bytes', () => {
    const inline = readText(P('tools', 'time', 'build', 'gtbg-time.inline.js')).trim(), iife = readText(P('tools', 'time', 'build', 'gtbg-time.iife.js')).trim();
    assert.equal(spec.patches.find((p) => p.id === 'CLK-00-module-inline').repl, ',nA=675;var GTBGT=' + inline + ';function v4(){');
    const page = spec.patches.find((p) => p.id === 'CLK-30-module-compare'); assert.equal(page.repl, '<script>' + iife + '</script>\n</head>'); assert.ok(iife.includes(inline));
  });
});

describe('chapter 04 section 4.9: the bridge never prints the frame number as visible text and never says "tick"', () => {
  // the two rewritten rows are evaluated with a fake React (V.jsx returns its props) and the real inlined module
  const sb = { window: {} }; vm.createContext(sb); vm.runInContext('var GTBGT=' + readText(P('tools', 'time', 'build', 'gtbg-time.inline.js')).trim() + ';', sb);
  const props = (id, vars) => { const p = spec.patches.find((x) => x.id === id); const box = Object.assign({ V: { jsx: (tag, pr) => ({ tag, ...pr }) }, tn: { tickInfo: 'tickInfo' }, Po: { tickNum: 'tickNum' } }, vars, { GTBGT: sb.GTBGT }); vm.createContext(box); return vm.runInContext('(' + p.repl + ')', box); };
  test('mobile transport row and time bar footer: the visible children are the time, "Frame n of 675" is only the title (tooltip)', () => {
    for (const f of [1, 12, 226, 538, 675]) {
      for (const [id, vars] of [['CLK-08-mobile-transport-frame', { f, P: 675 }], ['CLK-09-timebar-frame', { c: f }]]) {
        const r = props(id, vars); assert.equal(r.title, `Frame ${f} of 675`, id); assert.equal(r.children, model.tickToLabel(f, { style: 'time' }), id); assert.doesNotMatch(String(r.children), /Frame|tick|\d+\s*\/\s*675|of 675/i, `${id} prints the frame number: ${r.children}`);
      }
    }
  });
  test('no patch replacement renders the frame style outside a title, and no replacement prints "Tick" text', () => {
    for (const p of spec.patches.filter((x) => !/^CLK-(00|30)-/.test(x.id))) { // (CLK-00 and CLK-30 ARE the module: it formats "Frame n of 675" for tooltips)
      for (const m of p.repl.matchAll(/\w+\.f\([^()]*,\s*["']frame["']\s*\)/g)) assert.match(p.repl.slice(Math.max(0, m.index - 12), m.index), /title\s*[:=]\s*["'`]?$/, `${p.id}: ${m[0]} is visible text`);
      assert.doesNotMatch(p.repl, /["'`]Tick\b|\btick \$\{|Tick \$\{|Frame \$\{|["'`]Frame /, `${p.id} prints tick/frame text`);
    }
    assert.ok(spec.patches.filter((p) => /["']frame["']/.test(p.repl)).length >= 2, 'the two frame rows still exist');
  });
  test('the generator refuses a patch that would print the frame number (its own guard fails loudly)', () => {
    const src = readText(P('tools', 'time', 'build-clock-patches.mjs')); assert.match(src, /the frame style must only feed a title/); assert.match(src, /visible "Tick" text/);
  });
});
