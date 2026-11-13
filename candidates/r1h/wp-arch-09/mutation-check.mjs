#!/usr/bin/env node
// Mutation check of the tests of wp-arch-09: break a copy of the rebuild foundation on purpose, one line at a time, and require the tests to fail.
//
//   node candidates/r1h/wp-arch-09/mutation-check.mjs          (from the repository root; no network, no installs, a few seconds)
//
// The copy lives under tmp/r1h-cand/wp-arch-09/mutants (git-ignored) and is deleted afterwards. The repository files are never edited.
// Output: a line per mutant (killed or SURVIVED) and a summary; evidence/mutation.txt keeps the saved run. Exit 1 when a mutant survives
// or the unmutated copy does not pass.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const WORK = path.join(REPO, 'tmp', 'r1h-cand', 'wp-arch-09', 'mutants');
const NOTE = 'docs/battle-theatre/GOVERNANCE/horde/requests/main-site-wp-arch-09.md';
const COPY = ['src/package.json', 'src/tsconfig.base.json', 'src/.nvmrc', 'src/STACK.md', 'src/README.md', 'src/app/README.md', 'src/lib/README.md',
  'src/foundation.test.mjs', 'src/config/mapbox.js', 'src/config/mapbox.d.ts', 'src/config/tokens.test.mjs', 'package.json', NOTE];

function fresh() {
  fs.rmSync(WORK, { recursive: true, force: true });
  for (const rel of COPY) {
    fs.mkdirSync(path.dirname(path.join(WORK, rel)), { recursive: true });
    fs.copyFileSync(path.join(REPO, rel), path.join(WORK, rel));
  }
  fs.cpSync(path.join(REPO, 'src/lib/time'), path.join(WORK, 'src/lib/time'), { recursive: true });
}
function run(testFile) {
  const r = spawnSync(process.execPath, ['--test', testFile], { cwd: WORK, encoding: 'utf8' });
  return r.status ?? 1;
}
function mutate(rel, find, replace, all = false) {
  const p = path.join(WORK, rel);
  const text = fs.readFileSync(p, 'utf8');
  const parts = text.split(find);
  if (parts.length < 2 || (!all && parts.length !== 2)) throw new Error(`${rel}: "${find}" occurs ${parts.length - 1} times, expected ${all ? 'at least 1' : '1'}`);
  fs.writeFileSync(p, parts.join(replace));
}
function addFile(rel, text) {
  fs.mkdirSync(path.dirname(path.join(WORK, rel)), { recursive: true });
  fs.writeFileSync(path.join(WORK, rel), text);
}
const TOK = 'src/config/tokens.test.mjs';
const FND = 'src/foundation.test.mjs';
const M = 'src/config/mapbox.js';
const mutants = [
  // the production rule
  { id: 'prod-flag-dropped', file: M, find: 'env.PROD === true || ', replace: '', test: TOK },
  { id: 'prod-mode-dropped', file: M, find: " || env.MODE === 'production'", replace: '', test: TOK },
  { id: 'prod-node-env-dropped', file: M, find: " || env.NODE_ENV === 'production'", replace: '', test: TOK },
  { id: 'prod-never', file: M, find: "return env.PROD === true || env.MODE === 'production' || env.NODE_ENV === 'production';", replace: 'return false;', test: TOK },
  { id: 'prod-always', file: M, find: "return env.PROD === true || env.MODE === 'production' || env.NODE_ENV === 'production';", replace: 'return true;', test: TOK },
  // unset / blank
  { id: 'no-trim', file: M, find: 'raw.trim()', replace: 'raw', test: TOK },
  { id: 'blank-not-unset', file: M, find: "if (value === '') {", replace: 'if (value === undefined) {', test: TOK },
  { id: 'unset-undefined-not-null', file: M, find: '    return null;\n  }\n  if (value.startsWith', replace: '    return undefined;\n  }\n  if (value.startsWith', test: TOK },
  { id: 'missing-never-throws', file: M, find: 'if (isProductionBuild(env)) {\n      throw', replace: 'if (false) {\n      throw', test: TOK },
  { id: 'missing-always-throws', file: M, find: 'if (isProductionBuild(env)) {\n      throw', replace: 'if (true) {\n      throw', test: TOK },
  { id: 'missing-wrong-code', file: M, find: "'MAPBOX_TOKEN_MISSING',\n        `${TOKEN_ENV_NAME} is not set.", replace: "'MAPBOX_TOKEN_MALFORMED',\n        `${TOKEN_ENV_NAME} is not set.", test: TOK },
  { id: 'missing-message-unnamed', file: M, edits: [['`${TOKEN_ENV_NAME} is not set. A production build', '`The token is not set. A production build'], ['set ${TOKEN_ENV_NAME} in the build environment', 'set it in the build environment']], test: TOK },
  // secret and malformed values
  { id: 'secret-check-dropped', file: M, find: "if (value.startsWith('sk.')) {", replace: 'if (false) {', test: TOK },
  { id: 'secret-only-in-production', file: M, find: "if (value.startsWith('sk.')) {", replace: "if (value.startsWith('sk.') && isProductionBuild(env)) {", test: TOK },
  { id: 'shape-unanchored', file: M, find: '/^pk\\.[A-Za-z0-9._-]+$/', replace: '/pk\\.[A-Za-z0-9._-]+$/', test: TOK },
  { id: 'shape-empty-payload', file: M, find: '/^pk\\.[A-Za-z0-9._-]+$/', replace: '/^pk\\.[A-Za-z0-9._-]*$/', test: TOK },
  { id: 'shape-check-dropped', file: M, find: 'if (!PUBLIC_TOKEN_SHAPE.test(value)) {', replace: 'if (false) {', test: TOK },
  { id: 'malformed-echoes-value', file: M, find: 'and holds no spaces). The value is not shown.`', replace: 'and holds no spaces). Value: ${value}`', test: TOK },
  { id: 'secret-echoes-value', file: M, find: 'restricts to the site\'s address. The value is not shown."', replace: 'restricts to the site\'s address. " + value', test: TOK },
  // environment handling
  { id: 'env-check-dropped', file: M, find: "if (env === null || typeof env !== 'object') {", replace: 'if (false) {', test: TOK },
  { id: 'wrong-variable-name', file: M, find: "export const TOKEN_ENV_NAME = 'PUBLIC_MAPBOX_TOKEN';", replace: "export const TOKEN_ENV_NAME = 'MAPBOX_TOKEN';", test: TOK },
  { id: 'process-node-env-dropped', file: M, find: '    env.NODE_ENV = process.env.NODE_ENV;\n', replace: '', test: TOK },
  { id: 'process-token-dropped', file: M, find: 'if (env.PUBLIC_MAPBOX_TOKEN === undefined) env.PUBLIC_MAPBOX_TOKEN = process.env.PUBLIC_MAPBOX_TOKEN;', replace: '', test: TOK },
  { id: 'bundler-route-unguarded', file: M, find: 'PUBLIC_MAPBOX_TOKEN: import.meta.env?.PUBLIC_MAPBOX_TOKEN,', replace: 'PUBLIC_MAPBOX_TOKEN: import.meta.env.PUBLIC_MAPBOX_TOKEN,', test: TOK },
  { id: 'bundler-route-indexed', file: M, find: 'PUBLIC_MAPBOX_TOKEN: import.meta.env?.PUBLIC_MAPBOX_TOKEN,', replace: 'PUBLIC_MAPBOX_TOKEN: import.meta.env?.[TOKEN_ENV_NAME],', test: TOK },
  { id: 'import-throws', file: M, find: '  return value;\n}\n', replace: "  return value;\n}\nif (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') getMapboxToken();\n", test: TOK },
  { id: 'error-name-lost', file: M, find: "Object.defineProperty(MapboxTokenError.prototype, 'name', { value: 'MapboxTokenError', writable: true, configurable: true });", replace: '', test: TOK },
  { id: 'error-code-lost', file: M, find: '    this.code = code;\n', replace: '', test: TOK },
  // the one-reader rule and the literal scan
  { id: 'second-reader-added', file: M, find: "env.NODE_ENV = process.env.NODE_ENV;", replace: "env.NODE_ENV = process.env.NODE_ENV;\n    if (env.PUBLIC_MAPBOX_TOKEN === undefined) env.PUBLIC_MAPBOX_TOKEN = process.env.MAPBOX_ACCESS_TOKEN;", test: TOK },
  { id: 'token-literal-embedded', file: M, find: "const PUBLIC_TOKEN_SHAPE", replace: "const LEAK = 'pk.eyJ1IjoieCIsImEiOiJ5In0.aaaaaaaaaaaaaaaaaaaaaa';\nconst PUBLIC_TOKEN_SHAPE", test: TOK },
  { id: 'declaration-drift', file: 'src/config/mapbox.d.ts', find: 'export declare function isProductionBuild(env?: MapboxEnv): boolean;', replace: '', test: TOK },
  // the foundation
  { id: 'workspaces-changed', file: 'src/package.json', find: '"workspaces": ["lib/*", "app"]', replace: '"workspaces": ["lib/*"]', test: FND },
  { id: 'package-public', file: 'src/package.json', find: '"private": true', replace: '"private": false', test: FND },
  { id: 'engines-floor-lowered', file: 'src/package.json', find: '">=22.23.4"', replace: '">=20.0.0"', test: FND },
  { id: 'react-unpinned', file: 'src/package.json', find: '"scripts": {', replace: '"dependencies": { "react": "^18.3.1" },\n  "scripts": {', test: FND },
  { id: 'react-map-gl-added', file: 'src/package.json', find: '"scripts": {', replace: '"dependencies": { "react-map-gl": "7.1.7" },\n  "scripts": {', test: FND },
  { id: 'root-workspaces-differ', file: 'package.json', find: '"type": "module",', replace: '"type": "module",\n  "workspaces": ["src/lib/*"],', test: FND },
  { id: 'tsconfig-strict-off', file: 'src/tsconfig.base.json', find: '"strict": true', replace: '"strict": false', test: FND },
  { id: 'tsconfig-no-unchecked-index-dropped', file: 'src/tsconfig.base.json', find: '    "noUncheckedIndexedAccess": true,\n', replace: '', test: FND },
  { id: 'tsconfig-exact-optional-dropped', file: 'src/tsconfig.base.json', find: '    "exactOptionalPropertyTypes": true,\n', replace: '', test: FND },
  { id: 'tsconfig-verbatim-dropped', file: 'src/tsconfig.base.json', find: '    "verbatimModuleSyntax": true,\n', replace: '', test: FND },
  { id: 'tsconfig-family-flag-off', file: 'src/tsconfig.base.json', find: '"strict": true,', replace: '"strict": true,\n    "strictNullChecks": false,', test: FND },
  { id: 'nvmrc-changed', file: 'src/.nvmrc', find: '24', replace: '22', test: FND },
  { id: 'stack-react-pin-changed', file: 'src/STACK.md', find: 'React 18.3.1 exact', replace: 'React 19 exact', test: FND },
  { id: 'stack-layout-row-changed', file: 'src/STACK.md', find: '| `apps/web` | `src/app` |', replace: '| `apps/web` | `src/web` |', test: FND },
  { id: 'stack-status-wording', file: 'src/STACK.md', find: '| N8 | Name scope of workspace packages | not decided: owner |', replace: '| N8 | Name scope of workspace packages | decided |', test: FND },
  { id: 'stack-default-emptied', file: 'src/STACK.md', find: '`@gtbg/<name>` (gtbg is the prefix the plan uses for storage keys and marks). Nothing carries it yet.', replace: 'tbd', test: FND },
  { id: 'readme-app-mapping-lost', file: 'src/app/README.md', find: 'apps/web', replace: 'apps/site', all: true, test: FND },
  { id: 'readme-lib-mapping-lost', file: 'src/lib/README.md', find: 'src/lib/time', replace: 'src/lib/clock', all: true, test: FND },
  { id: 'note-line-dropped', file: NOTE, find: '"src:test": "npm test --prefix src",', replace: '"src:test": "npm test",', test: FND },
  { id: 'facade-import-outside', file: 'src/lib/time/extras.js', find: '\n', replace: "\nimport 'mapbox-gl';\n", test: FND, first: true },
  // controls: harmless changes that the tests must let through (a test that is too strict would fail them)
  { id: 'control-facade-may-import-mapbox-gl', add: ['src/app/map/lib/map/mapbox.ts', "export const load = () => import('mapbox-gl');\n"], test: FND, expect: 'pass' },
  { id: 'control-docs-may-name-the-variable', file: 'src/README.md', find: '# src: the source rebuild', replace: '# src: the source rebuild\n\nThe build variable is PUBLIC_MAPBOX_TOKEN.', test: TOK, expect: 'pass' },
  { id: 'control-pinned-react-18-3-1', file: 'src/package.json', find: '"scripts": {', replace: '"dependencies": { "react": "18.3.1", "react-dom": "18.3.1", "mapbox-gl": "3.24.1" },\n  "scripts": {', test: FND, expect: 'pass' },
  { id: 'control-code-comment-may-say-token', file: 'src/lib/time/extras.js', find: '\n', replace: '\n// the mapbox token is read in config\n', test: TOK, first: true, expect: 'pass' },
];

const out = [];
const say = (s) => { out.push(s); console.log(s); };
say(`# mutation check of wp-arch-09, run ${new Date().toISOString()}, node ${process.version}`);
fresh();
const baseline = [run(TOK), run(FND)];
say(`baseline (unmutated copy): tokens exit ${baseline[0]}, foundation exit ${baseline[1]}`);
let survivors = 0;
let wrongControls = 0;
if (baseline.some((c) => c !== 0)) { say('the unmutated copy must pass'); process.exit(1); }
for (const m of mutants) {
  fresh();
  if (m.add) addFile(m.add[0], m.add[1]);
  else if (m.edits) for (const [find, replace] of m.edits) mutate(m.file, find, replace);
  else if (m.first) { const p = path.join(WORK, m.file); const t = fs.readFileSync(p, 'utf8'); fs.writeFileSync(p, t.replace(m.find, m.replace)); }
  else mutate(m.file, m.find, m.replace, m.all === true);
  const code = run(m.test);
  if (m.expect === 'pass') {
    if (code !== 0) wrongControls += 1;
    say(`${code === 0 ? 'passed   ' : 'WRONGLY FAILED '} ${m.id}  (${path.basename(m.test)} exit ${code}; a control that must pass)`);
  } else {
    const killed = code !== 0;
    if (!killed) survivors += 1;
    say(`${killed ? 'killed   ' : 'SURVIVED '} ${m.id}  (${path.basename(m.test)} exit ${code})`);
  }
}
fs.rmSync(WORK, { recursive: true, force: true });
const nControls = mutants.filter((m) => m.expect === 'pass').length;
say(`${mutants.length - nControls} mutants, ${mutants.length - nControls - survivors} killed, ${survivors} survived; ${nControls} controls, ${nControls - wrongControls} passed, ${wrongControls} wrongly failed`);
const ev = path.join(REPO, 'candidates', 'r1h', 'wp-arch-09', 'evidence');
fs.mkdirSync(ev, { recursive: true });
fs.writeFileSync(path.join(ev, 'mutation.txt'), out.join('\n') + '\n');
process.exit(survivors || wrongControls ? 1 : 0);
