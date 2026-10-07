// test/build.test.mjs - the built single file: current, self-contained (no network of any kind), syntactically valid, no personal data, within the size budget.
//   (The real-browser run of the same file is test/browser-check.mjs: it needs Chrome, so it is a script, not part of `node --test`.)
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import * as acorn from 'acorn';
import * as walk from 'acorn-walk';
import { PROTO } from '../src/headless.mjs';

const FILE = path.join(PROTO, 'battle-studio.html');
const html = fs.existsSync(FILE) ? fs.readFileSync(FILE, 'utf8') : '';
const code = (() => { const m = html.match(/<script>\n([\s\S]*?)\n<\/script>\s*<\/body>/); return m ? m[1] : ''; })();
const markup = html.replace(/<script type="application\/json"[\s\S]*?<\/script>/g, '').replace(code, '');

test('battle-studio.html is current: build.mjs --check finds it (and tokens.schema.json) identical to a fresh build', () => {
  assert.ok(html.length > 400000, 'the file exists: run node docs/pitch/anim/prototype/build.mjs');
  execFileSync(process.execPath, [path.join(PROTO, 'build.mjs'), '--check'], { stdio: 'pipe' });
});

test('self-contained: no external URL in code or markup, no network API, no external resource reference, no import()', () => {
  const urls = [...(code + markup).matchAll(/https?:\/\/[^\s"'`)<>\\]+/g)].map((m) => m[0]).filter((u) => u !== 'http://www.w3.org/2000/svg');
  assert.deepEqual(urls, [], 'external URLs');
  assert.ok(!/\b(fetch|XMLHttpRequest|sendBeacon|WebSocket|importScripts|EventSource)\s*\(/.test(code), 'network API');
  assert.ok(!/<(script|link|img|iframe|video|audio|source)\b[^>]*\s(src|href)\s*=/i.test(markup), 'external resource in markup');
  { let found = false; walk.simple(acorn.parse(code, { ecmaVersion: 2023, sourceType: 'script' }), { ImportExpression() { found = true; } }); assert.ok(!found, 'dynamic import() expression'); }
  assert.ok(!/@import|url\(\s*['"]?https?:/i.test(html), 'css import');
  assert.ok(!/font-face/.test(html), 'no web fonts: system fonts only');
});

test('the bundled script parses as a classic script, defines every module once and starts the app', () => {
  assert.ok(code.length > 100000); acorn.parse(code, { ecmaVersion: 2023, sourceType: 'script' });
  const defs = [...code.matchAll(/__defs\["(src\/[^"]+)"\]/g)].map((m) => m[1]); assert.equal(new Set(defs).size, defs.length, 'a module defined twice');
  for (const must of ['src/app.mjs', 'src/scene/engine.mjs', 'src/layout/engine.mjs', 'src/scene/display.mjs', 'src/interp/paths.mjs', 'src/time/transport.mjs', 'src/tuning/tuning.mjs', 'src/skins/reference.mjs', 'src/metrics/metrics.mjs', 'src/ui/studio.mjs']) assert.ok(defs.includes(must), must);
  assert.ok(!defs.some((d) => /headless|build/.test(d)), 'node-only modules are not in the browser bundle'); assert.ok(!/from 'node:|require\(/.test(code));
});

test('no personal data, and the data labels are present: no e-mail address; the evidence vocabulary is in the page', () => {
  assert.ok(!/[\w.+-]+@[\w-]+\.[a-z]{2,}/i.test(html), 'e-mail address in the page');
  for (const w of ['Documented', 'Measured', 'Computed', 'Modelled', 'Contested', 'Unknown']) assert.ok(html.includes(w), w);
  assert.ok(/candidate clock/.test(html) && /Schematic backdrop/.test(html));
});

// 1.5 MB until the assembly (data 450 KB, popup text 307 KB); the assembled page adds the three skins' tokens, the tours, the production reproduction and the chrome's design system (about 0.1 MB more)
test('size budget: under 1.6 MB readable (the real data is 450 KB of it, the real popup text 307 KB)', () => { assert.ok(html.length < 1_600_000, html.length + ' bytes'); });
