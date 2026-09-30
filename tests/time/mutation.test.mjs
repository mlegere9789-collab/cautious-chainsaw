// Mutation tests of the regression detectors (TX-15: "a mutation test turns CI red"): realistic tick -> clock defects, written the way a developer
// would write them, are injected into a copy of the frozen site. Each must turn BOTH checks red:
//   (a) at least one TM rule (TM-V9 / V16 / V17 ...) gets worse than on the unmutated tree, and
//   (b) `node tools/time/surfaces.mjs --root=<tree> --check` exits 1 (the formula inventory sees a new or changed implementation).
// Benign injections (prose, unrelated arithmetic, the visitor's own clock) must turn neither red. The legacy tree is only READ.
import test, { describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { P, LEGACY } from '../../tools/time/lib.mjs';
import { buildContext, runAll } from '../../tools/time/rules.mjs';
import { doc, model } from './helpers.mjs';

const run = promisify(execFile);
const BUNDLE = 'assets/index-Cg8FAMXN.js';
let tree, base;
const counts = (t) => Object.fromEntries(runAll(buildContext(model, doc, { tree: t })).map((r) => [r.id, r.count]));
const surfaces = (t) => run(process.execPath, [P('tools', 'time', 'surfaces.mjs'), '--root=' + t, '--check'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).then((r) => ({ status: 0, out: r.stdout + r.stderr }), (e) => ({ status: e.code, out: String(e.stdout) + String(e.stderr) }));
const inScript = (code) => (html) => html.replace('</body>', `<script>${code}</script></body>`);
const inBundle = (code) => (js) => js + '\n' + code + '\n';

before(() => {
  tree = fs.mkdtempSync(path.join(os.tmpdir(), 'gtbg-mutation-'));
  fs.cpSync(LEGACY, tree, { recursive: true, filter: (s) => !/[\\/](screenshots|icons)([\\/]|$)/.test(s) && !/\.(png|pdf|ico)$/.test(s) });
  base = counts(tree);
});
after(() => fs.rmSync(tree, { recursive: true, force: true }));

/** inject into `rel`, run both checks, restore the file */
async function inject(rel, mutate) {
  const p = path.join(tree, rel), original = fs.readFileSync(p, 'utf8');
  fs.writeFileSync(p, mutate(original));
  try { const s = surfaces(tree), c = counts(tree); return { worse: Object.keys(c).filter((id) => c[id] > base[id]), surfaces: await s }; } finally { fs.writeFileSync(p, original); }
}

describe('the unmutated tree is the baseline both checks were recorded on', () => {
  test('surfaces --check passes and no TM rule differs from the recorded run', async () => {
    const s = await surfaces(tree); assert.equal(s.status, 0, s.out); assert.match(s.out, /surfaces match the baseline/);
    assert.deepEqual(counts(tree), base);
  });
});

describe('realistic injected defects turn the checks red', () => {
  const MUTANTS = [
    ['a date built by string concatenation, "July " + (tab + 2)', 'search.html', inScript('const dd = (tab) => "July " + (tab + 2);'), ['TM-V9', 'TM-V16']],
    ['an abbreviated-month template with a constant, `Jul ${d + 2}, 1863`', 'documentary.html', inScript('const label = (d) => `Jul ${d + 2}, 1863`;'), ['TM-V9', 'TM-V16']],
    ['a typed 12-hour formatter that appends " PM" / " AM"', 'search.html', inScript('function lbl(h){ return h >= 12 ? (h - 12 || 12) + " PM" : h + " AM"; }'), ['TM-V9', 'TM-V17']],
    ['a dotted lower-case formatter, "p.m." / "a.m."', 'compare.html', inScript("const ap = (h) => h >= 12 ? 'p.m.' : 'a.m.';"), ['TM-V9', 'TM-V17']],
    ['an hour computed from 12 ticks per hour, 5 + (tick - 1) / 12', 'search.html', inScript('function clockA(tick){ const h = 5 + Math.floor((tick - 1) / 12); return h + ":00"; }'), ['TM-V9']],
    ['a millisecond clock, Date.UTC(...) + tick * 300000', 'search.html', inScript('function clockC(tick){ return new Date(Date.UTC(1863,6,1,10,0) + (tick - 1) * 300000).toUTCString(); }'), ['TM-V9']],
    ['the legacy formula with another hour base, 6*60 + (tick - dayStart) * 5', 'education.html', inScript('const m = 6 * 60 + (tick - dayStart) * 5;'), ['TM-V9']],
    ['tick * 5 under another name, currentTick * 5', 'turning-points.html', inScript('const minutesIn = currentTick * 5;'), ['TM-V9']],
    ['a minified clone of the store clock appended to the bundle', BUNDLE, inBundle('function GtbgZz9(f){const{currentTick:x}=f(),M=(x-1)*5,P=4*60+M;return P}'), ['TM-V9']],
    ['toLocaleTimeString on a tick-derived Date in sandbox.html (next to the allowed wall clock)', 'sandbox.html', inScript('const t = new Date(base + tick * 300000).toLocaleTimeString();'), ['TM-V9']],
    ['getHours on a Date built from the tick (no toLocale call)', 'regiment.html', inScript('const h = new Date(startMs + frame * 60000).getHours();'), ['TM-V9']],
  ];
  for (const [name, rel, mutate, expected] of MUTANTS) test(name, async () => {
    const r = await inject(rel, mutate);
    assert.ok(r.worse.length > 0, 'no TM rule got worse: the defect would ship');
    for (const id of expected) assert.ok(r.worse.includes(id), `${id} did not get worse (worse: ${r.worse})`);
    assert.equal(r.surfaces.status, 1, 'surfaces --check accepted it:\n' + r.surfaces.out.split('\n').slice(-12).join('\n')); assert.match(r.surfaces.out, /SURFACE REGRESSION/);
  });
  test('the list covers at least eight distinct shapes, every one of them red on both checks (the count is part of the contract)', () => assert.ok(MUTANTS.length >= 8));
});

describe('benign injections stay green (the detectors are specific, not noisy)', () => {
  const BENIGN = [
    ['prose about the battle month', 'search.html', (h) => h.replace('</body>', '<p>The battle of July 1863 lasted three days; Lee left in July.</p></body>')],
    ['unrelated arithmetic', 'search.html', inScript('const pad = 12 * 4, half = 0.5 * (a + b), size = Math.max(1, n / 12.5), hue = (h + 360) % 360, id = ((c) => c * 5.5)(2);')],
    ['the visitor\'s own clock and the current year', 'search.html', inScript('const stamp = new Date().toLocaleTimeString(); const y = new Date().getFullYear(); const started = Date.now();')],
    ['a month list and a comparison', 'search.html', inScript('const MONTHS = ["Jan","Feb","Mar"]; const cache = new Date(ttl).getTime() > Date.now();')],
    ['a number formatted with toLocaleString', 'search.html', inScript('label.textContent = strength.toLocaleString();')],
  ];
  for (const [name, rel, mutate] of BENIGN) test(name, async () => {
    const r = await inject(rel, mutate);
    assert.deepEqual(r.worse, [], `false positive: ${r.worse}`); assert.equal(r.surfaces.status, 0, r.surfaces.out.split('\n').slice(-12).join('\n'));
  });
});

describe('tampering with a formula the inventory already knows is caught by its hash (existing behaviour, kept)', () => {
  test('changing the base hour of one of the nine (JF, 5*60 -> 6*60) fails --check', async () => {
    const r = await inject(BUNDLE, (s) => { assert.equal(s.split('P=5*60+M,z=Math.floor(P/60)%24,H=P%60,l=z>=12?"PM":"AM";return`${z===0?12').length, 2); return s.replace('P=5*60+M,z=Math.floor(P/60)%24,H=P%60,l=z>=12?"PM":"AM";return`${z===0?12', 'P=6*60+M,z=Math.floor(P/60)%24,H=P%60,l=z>=12?"PM":"AM";return`${z===0?12'); });
    assert.equal(r.surfaces.status, 1); assert.match(r.surfaces.out, /\[C\]\.hash/); // the rule counts do not move (same shapes, another number): only the inventory's hash sees it
  });
});
