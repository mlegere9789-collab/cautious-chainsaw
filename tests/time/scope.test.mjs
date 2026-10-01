// File scope of the lint rules (RV-03b): a tick -> clock formula in ANY script-bearing file of a dist tree must turn TM-V9 (and the inventory) red.
//
// The defect class: TM-V9/V16/V17 scanned `assets/*` and `*.html` only, and the inventory's own loader read the root and assets/ only, so the shared
// root script site-nav.js (loaded by every page) and any script in another directory were invisible. The loader is now one function for every
// consumer (tools/time/data.mjs loadTreeFiles): root files, assets/ and every script-bearing file (.html .htm .xhtml .svg .js .mjs .cjs) at any depth.
// These tests inject the same defect into every kind of place a script can sit, on a copy of the frozen site (the legacy tree is only READ).
import test, { describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { P, LEGACY } from '../../tools/time/lib.mjs';
import { loadTreeFiles, isCode, kindOf } from '../../tools/time/data.mjs';
import { moduleInline } from '../../tools/time/detectors.mjs';
import { buildContext, runAll } from '../../tools/time/rules.mjs';
import { doc, model } from './helpers.mjs';

const run = promisify(execFile);
const temps = [];
const tmp = (p) => { const d = fs.mkdtempSync(path.join(os.tmpdir(), p)); temps.push(d); return d; };
after(() => { for (const d of temps) fs.rmSync(d, { recursive: true, force: true }); });

describe('loadTreeFiles: one loader for every consumer', () => {
  test('root files, assets/*, and script-bearing files at any depth; data/, icons/, screenshots/, node_modules, dot directories and symlinks are not scanned', () => {
    const t = tmp('gtbg-scope-load-'), put = (rel, text = 'x') => { fs.mkdirSync(path.dirname(path.join(t, rel)), { recursive: true }); fs.writeFileSync(path.join(t, rel), text); };
    for (const rel of ['index.html', 'site-nav.js', 'sw.js', 'manifest.json', 'style.css', 'icons.svg', 'assets/index-abc.js', 'assets/chunk.mjs', 'assets/app.css', 'assets/chunks/deep/x.js', 'js/clock.js', 'scripts/a/b/c/d/e.cjs', 'pages/sub/page.html', 'widgets/w.htm', 'img/pic.svg', 'lib/a.mjs', 'x/y/z/w.xhtml', 'src/app.ts', 'src/Comp.tsx', 'src/Page.astro', 'src/App.vue', 'src/types.d.ts',
      'data/chronology.json', 'data/x.js', 'icons/i.svg', 'screenshots/s.html', 'node_modules/m/i.js', '.hidden/h.js', 'notes.txt', 'img/pic.png', 'sub/readme.md', 'sub/data.json', 'sub/style.css']) put(rel);
    const { files, bundleName } = loadTreeFiles(t);
    assert.deepEqual(Object.keys(files).sort(), ['assets/app.css', 'assets/chunk.mjs', 'assets/chunks/deep/x.js', 'assets/index-abc.js', 'icons.svg', 'img/pic.svg', 'index.html', 'js/clock.js', 'lib/a.mjs', 'manifest.json', 'pages/sub/page.html', 'scripts/a/b/c/d/e.cjs', 'site-nav.js', 'src/App.vue', 'src/Comp.tsx', 'src/Page.astro', 'src/app.ts', 'style.css', 'sw.js', 'widgets/w.htm', 'x/y/z/w.xhtml']);
    assert.equal(bundleName, 'assets/index-abc.js');
    for (const f of Object.keys(files)) assert.equal(isCode(f), /\.(html?|xhtml|svg|m?js|cjs|astro|vue|tsx?)$/.test(f), f); assert.equal(kindOf('a/b.svg'), 'html'); assert.equal(kindOf('a/b.mjs'), 'js'); assert.equal(kindOf('x.HTM'), 'html'); assert.equal(kindOf('a.astro'), 'html'); assert.equal(kindOf('a.tsx'), 'js'); assert.equal(isCode('types.d.ts'), false);
  });
  test('the legacy tree loads exactly what it did before (root + assets): nothing new appears, so the recorded baselines of the other rules stay valid', () => {
    const { files } = loadTreeFiles(LEGACY), keys = Object.keys(files);
    assert.ok(keys.includes('site-nav.js') && keys.includes('sw.js') && keys.includes('assets/index-Cg8FAMXN.js') && keys.includes('compare.html'));
    assert.ok(keys.every((k) => !k.startsWith('data/') && !k.startsWith('icons/') && !k.startsWith('screenshots/')), 'data, icons, screenshots are not scanned');
    assert.equal(keys.filter((k) => k.includes('/') && !k.startsWith('assets/')).length, 0, 'the legacy tree has no script outside the root and assets/');
  });
  test('a symbolic link is not followed (a loop or a link out of the tree cannot hang or widen the scan)', (t) => {
    const d = tmp('gtbg-scope-link-'); fs.mkdirSync(path.join(d, 'real')); fs.writeFileSync(path.join(d, 'real', 'a.js'), 'x');
    try { fs.symlinkSync(path.join(d, 'real'), path.join(d, 'loop'), 'junction'); } catch { t.skip('symlinks are not permitted here'); return; }
    assert.deepEqual(Object.keys(loadTreeFiles(d).files), ['real/a.js']);
  });
});

describe('a tick -> clock formula, a typed clock and a typed date in any script-bearing file turn TM-V9 (and the right sibling rules) red', () => {
  let tree, base;
  const counts = (t) => Object.fromEntries(runAll(buildContext(model, doc, { tree: t })).map((r) => [r.id, r.count]));
  before(() => { tree = tmp('gtbg-scope-'); fs.cpSync(LEGACY, tree, { recursive: true, filter: (s) => !/[\\/](screenshots|icons)([\\/]|$)/.test(s) && !/\.(png|pdf|ico)$/.test(s) }); base = counts(tree); });
  const put = (rel, text) => { const p = path.join(tree, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, text); return p; };
  const worse = (n) => Object.keys(n).filter((id) => n[id] > base[id]);
  const FORMULA = 'window.__clock = (tick) => 300 + (tick - 1) * 5;\nconst STEP_MS = 300_000;\nconst label = "Pickett steps off at 3:00 PM";\nconst d = ["July 1", "July 2", "July 3"][tab - 1];\n';
  const asPage = (js) => `<!doctype html><html><head><title>x</title></head><body><script>${js}</script></body></html>`;
  const PLACES = {
    'a root script': ['site-nav.js', null, (orig) => orig + '\n' + FORMULA], 'the service worker': ['sw.js', null, (orig) => orig + '\n' + FORMULA],
    'js/clock.js': ['js/clock.js', 'js', () => FORMULA], 'a deeply nested script': ['scripts/a/b/c/clock.js', 'js', () => FORMULA], 'assets/chunks/x.js': ['assets/chunks/x.js', 'js', () => FORMULA], 'an ES module (.mjs)': ['lib/clock.mjs', 'js', () => 'export ' + FORMULA.replace('window.__clock = ', 'const clock = ')],
    'a CommonJS file (.cjs)': ['lib/clock.cjs', 'js', () => FORMULA], 'a page in a subdirectory': ['pages/sub/index.html', 'html', () => asPage(FORMULA)], 'a .htm page': ['widgets/w.htm', 'html', () => asPage(FORMULA)], 'an SVG with a script': ['img/x.svg', 'html', () => `<svg xmlns="http://www.w3.org/2000/svg"><script>${FORMULA}</script></svg>`],
    'an existing page (root)': ['search.html', null, (orig) => orig.replace('</body>', `<script>${FORMULA}</script></body>`)],
  };
  for (const [name, [rel, , make]] of Object.entries(PLACES)) test(`${name} (${rel})`, () => {
    const p = path.join(tree, rel), existed = fs.existsSync(p), orig = existed ? fs.readFileSync(p, 'utf8') : null;
    put(rel, make(orig));
    try { const w = worse(counts(tree)); for (const id of ['TM-V9', 'TM-V16', 'TM-V17']) assert.ok(w.includes(id), `${id} did not notice the formula in ${rel} (worse: ${w})`); } finally { if (existed) fs.writeFileSync(p, orig); else fs.rmSync(p, { force: true }); }
  });
  test('each of the four defects alone is enough, in a nested file: the 5-minute step, the typed clock, the date table, the tick*5 formula', () => {
    for (const [what, code, expect] of [['a step constant', 'const STEP_MS = 300_000;', ['TM-V9']], ['a typed clock string', 'const s = "Hancock wounded at 3:20 PM";', ['TM-V9', 'TM-V17']], ['a date table', 'const d = ["July 1", "July 2", "July 3"][tab - 1];', ['TM-V9', 'TM-V16']], ['a tick * 5 formula', 'const m = (tick - 1) * 5;', ['TM-V9']]]) {
      put('js/only.js', code); try { const w = worse(counts(tree)); for (const id of expect) assert.ok(w.includes(id), `${what}: ${id} not worse (${w})`); } finally { fs.rmSync(path.join(tree, 'js', 'only.js'), { force: true }); }
    }
  });
  test('data/ is data, not code: a typed clock in data/*.json or data/*.js does not move TM-V9/V16/V17 (TM-V3/V4 read it), and neither does node_modules or a dot directory', () => {
    put('data/extra.json', '{"note":"at 3:00 PM July 3"}'); put('data/extra.js', 'const m = (tick - 1) * 5;'); put('node_modules/pkg/index.js', 'const m = (tick - 1) * 5;'); put('.hidden/x.js', 'const m = (tick - 1) * 5;');
    try { const w = worse(counts(tree)).filter((id) => ['TM-V9', 'TM-V16', 'TM-V17'].includes(id)); assert.deepEqual(w, []); } finally { for (const f of ['data/extra.json', 'data/extra.js', 'node_modules', '.hidden']) fs.rmSync(path.join(tree, f), { recursive: true, force: true }); }
  });
  test('the module\'s own exact inlined text is exempt wherever it sits, an edited copy is not', () => {
    const inl = moduleInline(); assert.ok(inl);
    put('js/gtbg-time.js', 'var GTBGT=' + inl + ';'); try { assert.deepEqual(worse(counts(tree)), [], 'the module itself must not turn a rule red'); } finally { fs.rmSync(path.join(tree, 'js', 'gtbg-time.js'), { force: true }); }
    put('js/gtbg-time.js', 'var GTBGT=' + inl.replace('" PM"', '" pm"') + ';'); try { assert.ok(worse(counts(tree)).includes('TM-V9'), 'an edited copy of the module is not exempt'); } finally { fs.rmSync(path.join(tree, 'js', 'gtbg-time.js'), { force: true }); }
  });
  test('the formula inventory sees the same places: `surfaces.mjs --root=<tree> --check` exits 1 for a formula in a root script, a nested script and a module', async () => {
    for (const [rel, code] of [['site-nav.js', 'window.__clock = (tick) => 300 + (tick - 1) * 5;'], ['js/clock.js', 'const m = (tick - 1) * 5;'], ['lib/clock.mjs', 'export const m = (frame - dayStart) * 5;']]) {
      const p = path.join(tree, rel), existed = fs.existsSync(p), orig = existed ? fs.readFileSync(p, 'utf8') : '';
      put(rel, orig + '\n' + code + '\n');
      try {
        const r = await run(process.execPath, [P('tools', 'time', 'surfaces.mjs'), '--root=' + tree, '--check'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).then((x) => ({ status: 0, out: x.stdout + x.stderr }), (e) => ({ status: e.code, out: String(e.stdout) + String(e.stderr) }));
        assert.equal(r.status, 1, `${rel}: --check accepted it\n` + r.out.split('\n').slice(-8).join('\n')); assert.match(r.out, /SURFACE REGRESSION/);
      } finally { if (existed) fs.writeFileSync(p, orig); else fs.rmSync(p, { force: true }); }
    }
  });
});
