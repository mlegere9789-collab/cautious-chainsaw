// Tests of src/config/mapbox.js, the one place that reads the Mapbox access token (WP-ARCH-09).
// Run: node --test src/config/tokens.test.mjs      (passes on Node 22.23.4 and on Node 24)
//
// What this proves
//   - the module reads PUBLIC_MAPBOX_TOKEN, trims it, and returns it;
//   - an unset or blank value is a named error (MapboxTokenError, code MAPBOX_TOKEN_MISSING) in a production build and null elsewhere;
//   - a secret token (sk.) or a value that is not a public token is refused in every mode, and no error text ever contains the value;
//   - importing the module never throws (the error is raised on the call, so a page can still show its fallback);
//   - no file under src/ holds a token literal, and no file other than the module (and its type declaration and this test) names the variable.
// Fixtures are made-up strings. They are short and plain on purpose: none of them looks like a real token.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as mapbox from './mapbox.js';

const { MapboxTokenError, TOKEN_ENV_NAME, getMapboxToken, isProductionBuild } = mapbox;

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(HERE, '..');
const MODULE_PATH = path.join(HERE, 'mapbox.js');
const PUBLIC_FIXTURE = 'pk.fixture-public-token';
const SECRET_FIXTURE = 'sk.fixture-secret-token';

/** Run fn with some process environment variables set (a value of undefined removes the variable); restore them afterwards. */
function withEnv(patch, fn) {
  const saved = {};
  for (const key of Object.keys(patch)) {
    saved[key] = Object.prototype.hasOwnProperty.call(process.env, key) ? process.env[key] : undefined;
    if (patch[key] === undefined) delete process.env[key];
    else process.env[key] = patch[key];
  }
  try {
    return fn();
  } finally {
    for (const key of Object.keys(saved)) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  }
}

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

/** The text of a file under src/, or null for a binary file (it holds a zero byte), one over 20 MB, or one that vanished since the listing. */
function readText(rel) {
  const full = path.join(SRC, rel);
  try {
    if (fs.statSync(full).size > 20 * 1024 * 1024) return null;
    const buf = fs.readFileSync(full);
    return buf.includes(0) ? null : buf.toString('utf8');
  } catch (err) {
    if (err && err.code === 'ENOENT') return null;
    throw err;
  }
}

test('the module names the variable it reads and the named error it throws', () => {
  assert.equal(TOKEN_ENV_NAME, 'PUBLIC_MAPBOX_TOKEN');
  const err = new MapboxTokenError('MAPBOX_TOKEN_MISSING', 'a message');
  assert.ok(err instanceof Error);
  assert.equal(err.name, 'MapboxTokenError');
  assert.equal(err.code, 'MAPBOX_TOKEN_MISSING');
  assert.equal(err.message, 'a message');
});

test('a token that is set is returned, without surrounding whitespace, in every mode', () => {
  const modes = [{}, { NODE_ENV: 'development' }, { NODE_ENV: 'production' }, { PROD: true }, { MODE: 'production' }, { MODE: 'staging', PROD: true }];
  for (const mode of modes) {
    assert.equal(getMapboxToken({ ...mode, PUBLIC_MAPBOX_TOKEN: PUBLIC_FIXTURE }), PUBLIC_FIXTURE);
  }
  assert.equal(getMapboxToken({ PUBLIC_MAPBOX_TOKEN: `  ${PUBLIC_FIXTURE}\r\n` }), PUBLIC_FIXTURE);
});

test('a token that is unset or blank in a production build throws MapboxTokenError and names the variable', () => {
  const productions = [{ NODE_ENV: 'production' }, { PROD: true }, { MODE: 'production' }, { MODE: 'staging', PROD: true }, { PROD: false, NODE_ENV: 'production' }];
  const unsets = [{}, { PUBLIC_MAPBOX_TOKEN: undefined }, { PUBLIC_MAPBOX_TOKEN: '' }, { PUBLIC_MAPBOX_TOKEN: '   ' }, { PUBLIC_MAPBOX_TOKEN: '\n' }];
  for (const production of productions) {
    for (const unset of unsets) {
      assert.throws(
        () => getMapboxToken({ ...production, ...unset }),
        (err) => {
          assert.ok(err instanceof MapboxTokenError);
          assert.ok(err instanceof Error);
          assert.equal(err.name, 'MapboxTokenError');
          assert.equal(err.code, 'MAPBOX_TOKEN_MISSING');
          assert.match(err.message, /PUBLIC_MAPBOX_TOKEN/);
          return true;
        },
        JSON.stringify({ ...production, ...unset }),
      );
    }
  }
});

test('a token that is unset outside a production build is not an error: the answer is null', () => {
  const development = [{}, { NODE_ENV: 'development' }, { NODE_ENV: 'test' }, { MODE: 'development', PROD: false }, { PROD: false }, { MODE: 'staging' }];
  for (const mode of development) {
    assert.equal(getMapboxToken({ ...mode }), null);
    assert.equal(getMapboxToken({ ...mode, PUBLIC_MAPBOX_TOKEN: '' }), null);
    assert.equal(getMapboxToken({ ...mode, PUBLIC_MAPBOX_TOKEN: '  ' }), null);
  }
});

test('production is recognised from the bundler flags and from NODE_ENV, and one signal is enough', () => {
  assert.equal(isProductionBuild({ PROD: true }), true);
  assert.equal(isProductionBuild({ MODE: 'production' }), true);
  assert.equal(isProductionBuild({ NODE_ENV: 'production' }), true);
  assert.equal(isProductionBuild({ PROD: false, MODE: 'development', NODE_ENV: 'production' }), true);
  assert.equal(isProductionBuild({ MODE: 'staging', PROD: true }), true);
  assert.equal(isProductionBuild({}), false);
  assert.equal(isProductionBuild({ PROD: false, MODE: 'development', NODE_ENV: 'development' }), false);
  assert.equal(isProductionBuild({ MODE: 'staging' }), false);
});

test('a secret token is refused in every mode and is never echoed', () => {
  for (const mode of [{}, { PROD: true }, { NODE_ENV: 'production' }, { NODE_ENV: 'development' }]) {
    assert.throws(
      () => getMapboxToken({ ...mode, PUBLIC_MAPBOX_TOKEN: SECRET_FIXTURE }),
      (err) => {
        assert.ok(err instanceof MapboxTokenError);
        assert.equal(err.code, 'MAPBOX_TOKEN_SECRET');
        assert.ok(!err.message.includes(SECRET_FIXTURE), 'the message must not contain the value');
        assert.ok(!String(err.stack).includes(SECRET_FIXTURE), 'the stack must not contain the value');
        return true;
      },
    );
  }
});

test('a value that is not a public token is refused and is never echoed', () => {
  const bad = ['not-a-token', 'pk.', 'pk', 'PK.upper-case-prefix', 'tk.fixture-temporary', 'pk.has a space', 'pk.two\nlines', 'Bearer pk.fixture-public-token'];
  for (const value of bad) {
    assert.throws(
      () => getMapboxToken({ PUBLIC_MAPBOX_TOKEN: value }),
      (err) => {
        assert.ok(err instanceof MapboxTokenError);
        assert.equal(err.code, 'MAPBOX_TOKEN_MALFORMED', JSON.stringify(value));
        if (value.length >= 8) assert.ok(!err.message.includes(value), 'the message must not contain the value');
        return true;
      },
    );
  }
});

test('an environment that is not an object is a TypeError, never "no token"', () => {
  for (const env of [null, 'production', 42, true]) {
    assert.throws(() => getMapboxToken(env), TypeError);
    assert.throws(() => isProductionBuild(env), TypeError);
  }
});

test('with no argument the process environment is read (Node has no bundler environment)', () => {
  withEnv({ PUBLIC_MAPBOX_TOKEN: PUBLIC_FIXTURE, NODE_ENV: 'production' }, () => {
    assert.equal(getMapboxToken(), PUBLIC_FIXTURE);
    assert.equal(isProductionBuild(), true);
  });
  withEnv({ PUBLIC_MAPBOX_TOKEN: undefined, NODE_ENV: 'production' }, () => {
    assert.throws(() => getMapboxToken(), { name: 'MapboxTokenError', code: 'MAPBOX_TOKEN_MISSING' });
  });
  withEnv({ PUBLIC_MAPBOX_TOKEN: undefined, NODE_ENV: 'development' }, () => {
    assert.equal(getMapboxToken(), null);
    assert.equal(isProductionBuild(), false);
  });
  withEnv({ PUBLIC_MAPBOX_TOKEN: SECRET_FIXTURE, NODE_ENV: 'development' }, () => {
    assert.throws(() => getMapboxToken(), { name: 'MapboxTokenError', code: 'MAPBOX_TOKEN_SECRET' });
  });
});

test('importing the module never throws, even in a production process without the token; the call does', () => {
  const env = { ...process.env, NODE_ENV: 'production' };
  delete env.PUBLIC_MAPBOX_TOKEN;
  const code = [
    `const m = await import(${JSON.stringify(pathToFileURL(MODULE_PATH).href)});`,
    "console.log('imported');",
    'try { m.getMapboxToken(); console.log("no error"); } catch (e) { console.log(e.name + ":" + e.code); }',
  ].join('\n');
  const child = spawnSync(process.execPath, ['--input-type=module', '-e', code], { env, encoding: 'utf8' });
  assert.equal(child.status, 0, child.stderr);
  assert.deepEqual(child.stdout.trim().split(/\r?\n/), ['imported', 'MapboxTokenError:MAPBOX_TOKEN_MISSING']);
});

test('src/config/mapbox.d.ts declares exactly the names the module exports', () => {
  const dts = fs.readFileSync(path.join(HERE, 'mapbox.d.ts'), 'utf8');
  const declared = [...dts.matchAll(/^export\s+(?:declare\s+)?(?:const|function|class)\s+([A-Za-z0-9_$]+)/gm)].map((m) => m[1]).sort();
  assert.deepEqual(declared, Object.keys(mapbox).sort());
});

test('no token literal appears anywhere under src/', () => {
  const files = listFiles();
  assert.ok(files.length >= 10 && files.includes('config/mapbox.js'), `the scan must see the tree (it saw ${files.length} files)`);
  // The first pattern is the acceptance pattern of WP-ARCH-09 (a public token starts pk. then a base64 payload that begins eyJ);
  // the others catch a secret token and any token-shaped string (prefix, long payload, dot, long signature).
  const patterns = [/pk\.eyJ/, /sk\.eyJ/, /\b[ps]k\.[A-Za-z0-9_-]{24,}\.[A-Za-z0-9_-]{12,}/];
  const hits = [];
  for (const rel of files) {
    const text = readText(rel);
    if (text === null) continue;
    for (const re of patterns) if (re.test(text)) hits.push(`${rel} matches ${re}`);
  }
  assert.deepEqual(hits, []);
});

test('only src/config/mapbox.js reads the token variable: no other file under src/ names it or a variant of it', () => {
  // Allowed: the module, its type declaration (it states the name as a literal type) and this test (it feeds the module explicit values).
  // Markdown files are documentation, not readers.
  const allowed = new Set(['config/mapbox.js', 'config/mapbox.d.ts', 'config/tokens.test.mjs']);
  // A name that ends in MAPBOX_TOKEN or MAPBOX_ACCESS_TOKEN, with any prefix (the error codes MAPBOX_TOKEN_MISSING and so on are not names of a variable).
  const nameLike = /\b[A-Z0-9_]*MAPBOX_(?:ACCESS_)?TOKEN\b/;
  const offenders = [];
  for (const rel of listFiles()) {
    if (allowed.has(rel) || rel.endsWith('.md')) continue;
    const text = readText(rel);
    if (text === null) continue;
    const m = text.match(nameLike);
    if (m) offenders.push(`${rel}: ${m[0]}`);
  }
  assert.deepEqual(offenders, []);

  // The module itself reads that one name and no other, by the two routes that exist: the bundler's import.meta.env and the process.
  // Vite replaces the literal member expression import.meta.env.<NAME> in a build (checked with Vite 8.3.8: the value is embedded
  // when the build exposes the PUBLIC_ prefix, and is undefined otherwise), so the module spells it out instead of indexing by a variable.
  const own = readText('config/mapbox.js');
  assert.match(own, /import\.meta\.env\??\.PUBLIC_MAPBOX_TOKEN/);
  assert.match(own, /process\.env\.PUBLIC_MAPBOX_TOKEN/);
  const names = new Set(own.match(/\b[A-Z0-9_]*MAPBOX_(?:ACCESS_)?TOKEN\b/g));
  assert.deepEqual([...names], ['PUBLIC_MAPBOX_TOKEN']);
});
