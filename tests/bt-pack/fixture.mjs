// A made-up site for the self-test of tools/bt/pack_theatre.mjs (tests/bt-pack/pack.test.mjs, part 2). It has the same layout as docs/battle-theatre (a shell in app/, its sibling
// folders beside it) and holds one example of every kind of load the trace must follow, and of every kind of file it must leave out. Each file says in a comment why it is there.
//   makeFixture(dir)  writes the tree under dir and returns dir
//   FIXTURE_CFG       the packer settings of this tree (the same shape as the constants of pack_theatre.mjs)
// The tests patch single lines of these files (the texts "// MARK", "import './theatre.mjs';", "href=\"units.html\"", "url(./img/bg.png)" and ".map(r => r.id)" must stay as they are).
import fs from 'node:fs'; import path from 'node:path';
import { WITHHELD } from '../../tools/bt/pack_theatre.mjs';

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);       // the signature of a PNG and nothing else: the packer only copies it

// the files, as path -> text (or bytes)
const FILES = {
  // ---- the shell page: a style sheet, a second one by link, an image, the import map, the module entry, the home link the staging transform rewrites
  'app/index.html': `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="bt-home" content="../../../"><title>Fixture shell</title>
<link rel="stylesheet" href="styles.css"><link rel="stylesheet" href="extra.css">
<script type="importmap">{"imports":{"node:zlib":"./src/shim.mjs","extra-mod":"../extra/mod.mjs"}}</script>
</head><body><a id="home-link" href="../../../">Home</a><img src="img/logo.png" alt="logo">
<script type="module" src="src/main.mjs"></script></body></html>
`,
  'app/styles.css': `body { background: #000 url(./img/bg.png); }\n`,
  'app/extra.css': `@font-face { font-family: F; src: url(./fonts/a.woff2) format("woff2"); }\n`,
  'app/img/logo.png': PNG, 'app/img/bg.png': PNG, 'app/fonts/a.woff2': Buffer.from('wOF2fixture'),

  // ---- modules of the shell
  'app/src/config.mjs': `// folder keys, as the real config.mjs declares them: key: new URL('relative', here)
const here = import.meta.url;
export const URLS = Object.freeze({
  app: new URL('../', here).href,
  data: new URL('../data/', here).href,
  gov: new URL('../../GOVERNANCE/', here).href,
  proto: new URL('../../render/prototype/', here).href,
});
`,
  'app/src/main.mjs': `import './theatre.mjs';
import zlib from 'node:zlib';
import mod from 'extra-mod';
import { URLS } from './config.mjs';
export { zlib, mod, URLS };
`,
  // the loader of the added modules (a computed import with a literal folder prefix), a worker by page-relative address, an optional module that is not there, the one reader of the
  // reduced working file, the register links (a template: files ending in .md), tiles (a template with an ending), a prefix address, a fetch relative to the page
  'app/src/theatre.mjs': `import { URLS } from './config.mjs';
const ids = (await (await fetch(URLS.gov + 'register_index.json')).json()).map(r => r.id);
export const registerLink = id => \`\${URLS.gov}register/\${id}.md\`;
export const tile = z => \`\${URLS.data}tiles/\${z}.json\`;
export const pre = k => URLS.data + 'prefix-' + k;
export async function start(path) {
  const w = new Worker('src/worker.mjs');
  const opt = await import('./missing-optional.mjs').catch(() => null);
  const added = await import('./ext/' + path);
  const doc = await fetch('data/doc-relative.json');
  return { w, opt, added, doc, ids };
}
// MARK
`,
  'app/src/shim.mjs': `export default {};\n`,
  'app/src/worker.mjs': `self.onmessage = () => { self.postMessage(1); };\n`,
  // in the shell folder (so it ships) but nothing loads it: scanned as "shipped, not known to be loaded"; its node-only import is a note, not a problem
  'app/src/unloaded.mjs': `import fs from 'node:fs';
export const read = p => fs.readFileSync(p, 'utf8');
export const where = urls => urls.data + 'only-unloaded.json';
`,
  'app/src/notes.md': `Working notes. Never shipped.\n`,
  'app/src/x.test.mjs': `// a test file of the shell: never shipped\nexport {};\n`,

  // ---- the added modules: a list that names two of the three; data through ctx.urls (a literal, and a template with an ending); an unlisted module with its own data
  'app/src/ext/index.mjs': `export default ['a.mjs', 'sub/b.mjs'];\n`,
  'app/src/ext/a.mjs': `export async function init(ctx) { const j = await (await fetch(ctx.urls.data + 'monuments.json')).json(); ctx.registerLayerToggle('m', 'Marks', () => true, () => {}); return j; }\n`,
  'app/src/ext/sub/b.mjs': 'export async function init(ctx) { for (let n = 1; n <= 2; n++) await fetch(ctx.urls.data + `veg/${n}.bin`); }\n',
  'app/src/ext/unlisted.mjs': `export function init(ctx) { return fetch(ctx.urls.data + 'unlisted.json'); }\n`,

  // ---- data
  'app/data/monuments.json': `{"rows":[1,2,3]}\n`,
  'app/data/veg/1.bin': Buffer.from([1]), 'app/data/veg/2.bin': Buffer.from([2]),
  'app/data/tiles/1.json': `{"z":1}\n`, 'app/data/tiles/2.json': `{"z":2}\n`, 'app/data/tiles/readme.txt': `Not a tile: the address ends in .json.\n`,
  'app/data/doc-relative.json': `{"a":1}\n`,
  'app/data/only-unloaded.json': `{"b":1}\n`,
  'app/data/unlisted.json': `{"c":1}\n`,
  'app/data/prefix-a.json': `{"p":"a"}\n`, 'app/data/prefix-b.json': `{"p":"b"}\n`,
  'app/data/audio/x.json': `{"x":1}\n`,                                   // taken by the include list (a load through a base path the scan cannot see)
  'app/data/not-referenced.json': `{"never":true}\n`,
  'app/tools/build.mjs': `// a build tool: never shipped\nexport {};\n`,

  // ---- a static section beside the shell (pages with no build step), its index of per-unit files, and one file the index lists outside the section
  'app/roster/index.html': `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Roster</title><link rel="stylesheet" href="roster.css"></head>
<body><a href="units.html">Units</a><script type="module" src="roster.js"></script></body></html>
`,
  'app/roster/units.html': `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Units</title><link rel="stylesheet" href="roster.css"></head>
<body><a href="index.html">Back</a><script type="module" src="roster.js"></script></body></html>
`,
  'app/roster/roster.js': `export const load = () => fetch('data/index.json').then(r => r.json());\n`,
  'app/roster/roster.css': `.flag { background: url(img/flag.png); }\n`,
  'app/roster/img/flag.png': PNG,
  'app/roster/README.md': `Notes of the section. Never shipped.\n`,
  'app/roster/data/index.json': `{"units":["units/u1.json","units/u2.json"],"more":"../../../rosters/data2/x.jsonl"}\n`,
  'app/roster/data/units/u1.json': `{"id":"u1"}\n`, 'app/roster/data/units/u2.json': `{"id":"u2"}\n`,
  'rosters/data2/x.jsonl': `{"a":1}\n`,

  // ---- a module and its data outside the shell, reached through the import map
  'extra/mod.mjs': `export default fetch(new URL('./mod-data.json', import.meta.url));\n`,
  'extra/mod-data.json': `{"m":1}\n`,

  // ---- working files: the register entries are withheld, the index is shipped reduced to the ids, a private file is not referenced at all
  'GOVERNANCE/register/EG-1.md': `Working copy of an entry. Never shipped.\n`, 'GOVERNANCE/register/EG-2.md': `Working copy of an entry. Never shipped.\n`,
  'GOVERNANCE/register_index.json': `[{"id":"EG-1","title":"t"},{"id":"EG-2","title":"u"}]\n`,
  'GOVERNANCE/private.json': `{"private":true}\n`,

  // ---- the renderer's own data folder (taken whole, as EXTRA_DIRS of the real build)
  'render/prototype/data/terrain.json': `{"t":1}\n`,
};

export function makeFixture(dir) {
  for (const [rel, body] of Object.entries(FILES)) { const p = path.join(dir, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, body); }
  return dir;
}

export const FIXTURE_CFG = {
  pages: ['app/index.html'], extraDirs: ['render/prototype/data'], include: ['app/data/audio'], shipWhole: ['app/src'], sections: ['app/roster'], exclude: [],
  withheld: WITHHELD,
  project: [{ path: 'GOVERNANCE/register_index.json', keep: ['id'], readers: [{ file: 'app/src/theatre.mjs', use: /register_index\.json'\)\)\.json\(\)\)\.map\(r => r\.id\)/ }],
    why: 'The shell reads only the entry ids; the working file also carries internal notes.' }],
  knownComputed: [],
};
