// Formula inventory (tools/time/surfaces.mjs): nine implementations today, none after the bridge except lighting, regressions detectable (WP-TIME-20, TM-V9).
import test, { describe, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { P, LEGACY } from '../../tools/time/lib.mjs';

const run = (...args) => spawnSync(process.execPath, [P('tools', 'time', 'surfaces.mjs'), ...args], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
const rows = (out) => out.split('\n').filter((l) => /^\| [A-I] \|/.test(l)).map((l) => l.split('|').map((x) => x.trim()).slice(1, -1));
const temps = []; after(() => { for (const d of temps) fs.rmSync(d, { recursive: true, force: true }); });
const copyTree = () => { const d = fs.mkdtempSync(path.join(os.tmpdir(), 'gtbg-surf-')); temps.push(d); fs.cpSync(LEGACY, d, { recursive: true, filter: (s) => !/[\\/](screenshots|icons)([\\/]|$)/.test(s) && !/\.(png|pdf|ico)$/.test(s) }); return d; };

describe('the nine implementations of chapter 04 section 2.1', () => {
  const r = run(); const t = rows(r.stdout);
  test('exactly nine are found, in the bundle and four static pages, and none is routed through the module', () => {
    assert.equal(r.status, 0, r.stderr); assert.equal(t.length, 9);
    assert.deepEqual(t.map((x) => x[0]), ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I']);
    assert.deepEqual(t.map((x) => x[1]), ['store getTickTime', 'HUD date badge (_F)', 'monument tooltip JF', 'ancestor timeline QF', 'day/night lighting M4 + E4', 'compare.html', 'living-ledger.html', 'camera.html', 'immersive.html']);
    for (const x of t) assert.equal(x[4], 'no', x[1]);
  });
  test('each implementation is measured against the model on all 675 ticks: dates and clocks are wrong almost everywhere', () => {
    const byId = Object.fromEntries(t.map((x) => [x[0], x]));
    assert.equal(byId.A[7], '144'); // was 149 before the 2026-10-18 adjudication moved anchors (t451 04:30 -> 04:15 and others) assert.equal(byId.B[7], '675'); assert.equal(byId.C[7], '675'); assert.equal(byId.D[7], '675'); assert.equal(byId.G[7], '144');
    for (const id of ['A', 'C', 'D', 'E', 'F', 'G', 'H', 'I']) assert.ok(+byId[id][5] > 500, `${id} has ${byId[id][5]} ticks over 30 min`);
    assert.equal(byId.B[5], '0'); // the HUD prints a date only
  });
  test('the generic detectors find nothing that is not attributed to one of the nine; the wall clock in sandbox.html is allow-listed', () => {
    assert.match(r.stdout, /Unattributed tick formulas: 0/); assert.match(r.stdout, /Wall-clock .*sandbox\.html/); assert.match(r.stdout, /tick\*5: 8\/8/);
  });
  test('--check equals the committed baseline', () => { const c = run('--check'); assert.equal(c.status, 0, c.stdout + c.stderr); assert.match(c.stdout, /match the baseline/); });
});

describe('regression detection', () => {
  test('a tenth implementation added to a page makes --check fail and shows up as an unattributed tick formula', () => {
    const d = copyTree(); const p = path.join(d, 'search.html');
    fs.writeFileSync(p, fs.readFileSync(p, 'utf8').replace('</body>', '<script>function newClock(tick) { const minutesIn = (tick - 1) * 5; return minutesIn; }</script></body>'));
    const c = run('--root=' + d, '--check');
    assert.equal(c.status, 1, c.stdout + c.stderr); assert.match(c.stdout + c.stderr, /unknownTickFormulas|tick\*5/); assert.match(c.stdout, /Unattributed tick formulas: 1/);
  });
  test('changing one of the nine (JF base hour) changes its hash and fails --check', () => {
    const d = copyTree(); const p = path.join(d, 'assets', 'index-Cg8FAMXN.js');
    const s = fs.readFileSync(p, 'utf8'); assert.equal(s.split('P=5*60+M,z=Math.floor(P/60)%24,H=P%60,l=z>=12?"PM":"AM";return`${z===0?12').length, 2);
    fs.writeFileSync(p, s.replace('P=5*60+M,z=Math.floor(P/60)%24,H=P%60,l=z>=12?"PM":"AM";return`${z===0?12', 'P=6*60+M,z=Math.floor(P/60)%24,H=P%60,l=z>=12?"PM":"AM";return`${z===0?12'));
    const c = run('--root=' + d, '--check'); assert.equal(c.status, 1); assert.match(c.stderr, /\[C\]\.hash/);
  });
  test('the patched tree (CLOCK bridge) routes seven of the eight remaining implementations through the module; lighting is held for WP-TIME-13', () => {
    const out = path.join(os.tmpdir(), 'gtbg-surf-patched-' + process.pid); temps.push(out);
    const chk = spawnSync(process.execPath, [P('tools', 'time', 'check-patches.mjs'), '--out=' + out, '--no-scope'], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
    assert.equal(chk.status, 0, chk.stdout + chk.stderr);
    const t = rows(run('--root=' + out).stdout); assert.equal(t.length, 8); assert.equal(t.filter((x) => x[4] === 'yes').length, 7); assert.equal(t.find((x) => x[4] === 'no')[0], 'E');
    for (const x of t.filter((y) => y[4] === 'yes')) assert.ok(+x[5] <= 5, `${x[1]} still has ${x[5]} ticks over 30 min`); // camera/immersive whole-hour rounding artefacts only; bound 3 -> 5 after the 2026-10-18 adjudication (steeper segments 240-248 and 515-518 put more ticks across an hour boundary)
  });
});
