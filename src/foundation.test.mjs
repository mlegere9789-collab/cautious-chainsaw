// Foundation checks of the source rebuild (WP-ARCH-09): the workspace manifest, the strict TypeScript base, the stack record,
// the layout notes, the one-reader rule for the map library, and the request note for the root package.json.
// Run: node --test src/foundation.test.mjs      (passes on Node 22.23.4 and on Node 24)
//
// Tests of the rebuild sit beside the code they test (src/<area>/...test.mjs); tests/ at the repository root stays the shared
// home of the older areas (tests/data, tests/time, tests/historian, tests/t0). `npm test --prefix src` runs every test under src/.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(SRC, '..');
const read = (rel, base = SRC) => fs.readFileSync(path.join(base, rel), 'utf8');
const readJson = (rel, base = SRC) => JSON.parse(read(rel, base));

/** Every file under src/ (relative, forward slashes), skipping installed packages and version-control folders. */
function listFiles(dir = SRC, out = []) {
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (err) {
    if (!err || err.code !== 'ENOENT') throw err;
  }
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) listFiles(full, out);
    else if (entry.isFile()) out.push(path.relative(SRC, full).split(path.sep).join('/'));
  }
  return out.sort();
}

/** Body rows (header and separator dropped) of the first markdown table under the first heading that contains `heading`. */
function tableRows(markdown, heading) {
  const lines = markdown.split(/\r?\n/);
  const isHeading = (l) => /^#{1,6}\s/.test(l);
  const start = lines.findIndex((l) => isHeading(l) && l.toLowerCase().includes(heading.toLowerCase()));
  assert.ok(start >= 0, `STACK.md has no heading that contains "${heading}"`);
  const rows = [];
  for (let i = start + 1; i < lines.length; i++) {
    if (isHeading(lines[i])) break;
    if (/^\s*\|/.test(lines[i])) {
      rows.push(lines[i].trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim()));
    } else if (rows.length > 0) {
      break;
    }
  }
  const body = rows.filter((r) => !r.every((c) => /^:?-{3,}:?$/.test(c)));
  assert.ok(body.length >= 2, `the table under "${heading}" is missing`);
  return body.slice(1);
}

test('src/package.json is a private ES-module workspace manifest that lists lib/* and app', () => {
  const pkg = readJson('package.json');
  assert.equal(pkg.private, true);
  assert.equal(pkg.type, 'module');
  assert.deepEqual(pkg.workspaces, ['lib/*', 'app']);
  assert.equal(pkg.engines.node, '>=22.23.4', 'the container default Node must be able to run every test');
  assert.equal(pkg.scripts.test, 'node --test');
  assert.equal(read('.nvmrc').trim(), '24', 'the toolchain target is Node 24');
});

test('the root package.json, once it wires the workspace, lists the same entries as src/package.json under src/', () => {
  const root = readJson('package.json', REPO);
  const pkg = readJson('package.json');
  if (root.workspaces === undefined) return; // not wired yet: docs/battle-theatre/GOVERNANCE/horde/requests/main-site-wp-arch-09.md asks for it
  assert.deepEqual(root.workspaces, pkg.workspaces.map((w) => `src/${w}`));
});

test('exact pins hold wherever the register fixes them, in every package.json under src/', () => {
  const pins = { react: '18.3.1', 'react-dom': '18.3.1', 'mapbox-gl': '3.24.1' };
  const forbidden = ['react-map-gl']; // the plan: own thin imperative Mapbox wrapper, no react-map-gl
  const manifests = listFiles().filter((rel) => rel.endsWith('package.json'));
  assert.ok(manifests.includes('package.json'));
  for (const rel of manifests) {
    const pkg = readJson(rel);
    for (const field of ['dependencies', 'devDependencies', 'optionalDependencies']) {
      for (const [name, spec] of Object.entries(pkg[field] ?? {})) {
        assert.ok(!forbidden.includes(name), `${rel} depends on ${name}`);
        assert.ok(!/^(latest|next|\*|)$/.test(spec), `${rel}: ${name} is not pinned (${spec})`);
        if (name in pins) assert.equal(spec, pins[name], `${rel}: ${name} must be pinned exactly to ${pins[name]}`);
      }
    }
  }
});

test('src/tsconfig.base.json is strict, with the extra flags the plan names', () => {
  const tsconfig = readJson('tsconfig.base.json');
  const o = tsconfig.compilerOptions;
  assert.equal(o.strict, true);
  assert.equal(o.noUncheckedIndexedAccess, true);
  assert.equal(o.exactOptionalPropertyTypes, true);
  assert.equal(o.verbatimModuleSyntax, true);
  assert.equal(o.isolatedModules, true);
  assert.equal(o.forceConsistentCasingInFileNames, true);
  assert.equal(o.noEmit, true);
  // No member of the strict family may be switched off.
  for (const flag of ['noImplicitAny', 'strictNullChecks', 'strictFunctionTypes', 'strictBindCallApply', 'strictPropertyInitialization', 'noImplicitThis', 'alwaysStrict', 'useUnknownInCatchVariables']) {
    if (flag in o) assert.equal(o[flag], true, `${flag} must not be switched off`);
  }
  assert.ok(!('allowJs' in o) || o.allowJs === false, 'new files are TypeScript; plain JS modules carry a .d.ts');
});

test('STACK.md maps the plan layout to the repository layout', () => {
  const stack = read('STACK.md');
  const rows = tableRows(stack, 'Layout');
  const row = (plan) => {
    const r = rows.find((cells) => cells[0] === `\`${plan}\``);
    assert.ok(r, `no layout row for ${plan}`);
    return r;
  };
  assert.equal(row('packages/<name>')[1], '`src/lib/<name>`');
  assert.equal(row('packages/time')[1], '`src/lib/time`');
  assert.equal(row('packages/config')[1], '`src/config`');
  assert.equal(row('apps/web')[1], '`src/app`');
  assert.match(row('tests/')[1], /beside/);
  assert.match(stack, /tests? of (a )?new areas? sit beside (the |its )?code/i);
  assert.ok(fs.existsSync(path.join(SRC, 'lib', 'time', 'index.js')), 'src/lib/time exists');
  assert.ok(fs.existsSync(path.join(SRC, 'config', 'mapbox.js')), 'src/config/mapbox.js exists');
});

test('STACK.md records the choices the register and the delegated rows fix', () => {
  const stack = read('STACK.md');
  const rows = tableRows(stack, 'Choices fixed');
  const row = (area) => {
    const r = rows.find((cells) => cells[0].toLowerCase() === area.toLowerCase());
    assert.ok(r, `no row for ${area}`);
    return r.join(' | ');
  };
  assert.match(row('UI library'), /React 18\.3\.1 exact/);
  assert.match(row('UI library'), /A10/);
  assert.match(row('Map engine'), /Mapbox GL/);
  assert.match(row('Map engine'), /3\.24\.1 exact/);
  assert.match(row('Map engine'), /facade/);
  assert.match(row('Language'), /strict/);
  assert.match(row('Node'), /Node 24/);
  assert.match(row('Node'), /22\.23\.4/);
  assert.match(row('Package manager'), /npm/);
  assert.match(row('Package manager'), /C03/);
  assert.match(row('Look'), /A11/);
  for (const id of ['A10', 'A11', 'C03']) assert.ok(stack.includes(id), `STACK.md must cite row ${id}`);
});

test('STACK.md writes every open choice as "not decided: owner" with a conservative default and a way back', () => {
  const rows = tableRows(read('STACK.md'), 'Not decided');
  assert.ok(rows.length >= 8, `expected at least 8 open choices, found ${rows.length}`);
  const seen = new Set();
  for (const cells of rows) {
    assert.equal(cells.length, 5, `a row needs 5 cells: ${cells.join(' | ')}`);
    const [id, choice, status, fallback, wayBack] = cells;
    assert.ok(!seen.has(id), `row id ${id} is used twice`);
    seen.add(id);
    assert.ok(choice.length >= 10, `${id}: the choice is not described`);
    assert.equal(status, 'not decided: owner', `${id}: the status must read exactly "not decided: owner"`);
    assert.ok(fallback.length >= 30, `${id}: the conservative default is missing`);
    assert.ok(wayBack.length >= 30, `${id}: the way back is missing`);
  }
});

test('the three README files of the layout exist and say what belongs where', () => {
  const root = read('README.md');
  const app = read('app/README.md');
  const lib = read('lib/README.md');
  for (const text of [root, app, lib]) assert.ok(text.length > 400, 'a README of the layout must say something');
  assert.match(root, /STACK\.md/);
  assert.match(root, /npm test --prefix src/);
  assert.match(app, /apps\/web/);
  assert.match(app, /src\/app/);
  assert.match(lib, /packages\/<name>/);
  assert.match(lib, /src\/lib\/time/);
});

test('mapbox-gl is imported only inside the map facade folder (the lint rule of the plan, until ESLint is installed)', () => {
  const facade = 'app/map/lib/map/';
  const importPattern = /(?:\bfrom\s*|\bimport\s*\(\s*|\brequire\s*\(\s*|\bimport\s+)['"]mapbox-gl(?:\/[^'"]*)?['"]/;
  const code = /\.(?:[cm]?[jt]sx?|astro|vue|svelte)$/;
  const offenders = listFiles()
    .filter((rel) => code.test(rel) && !rel.startsWith(facade) && rel !== 'foundation.test.mjs')
    .filter((rel) => importPattern.test(read(rel)));
  assert.deepEqual(offenders, []);
});

test('the request note asks the release workstream for the two root package.json lines and nothing else of the root files', () => {
  const note = read('docs/battle-theatre/GOVERNANCE/horde/requests/main-site-wp-arch-09.md', REPO);
  assert.ok(note.length > 1200, 'the request note must carry the exact change, the check and what was not run');
  assert.ok(note.includes('"workspaces": ["src/lib/*", "src/app"],'));
  assert.ok(note.includes('"src:test": "npm test --prefix src",'));
  assert.match(note, /package-lock\.json/);
  assert.match(note, /npm install --package-lock-only/);
});
