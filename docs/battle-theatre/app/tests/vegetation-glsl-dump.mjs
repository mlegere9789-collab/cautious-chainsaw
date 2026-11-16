// Helper of tests/vegetation-glsl.py (it runs it itself): writes, for a native compile of the GLSL ES 3.00 programs of the vegetation layer,
//   <out>/<name>.vert and <name>.frag   the four programs exactly as the renderer's GLRenderer.prog() assembles them (the prototype's preamble PRE with the layer's text appended), name = veg-decal veg-tree veg-tree-shadow veg-shell
//   <out>/uniforms.json                 per program, the uniforms the layer looks up in gl.mjs and sets (sampler units and the per-frame values): a uniform the compiler drops makes getUniformLocation return null and the layer skips the set
//                                       without a word, so the python side asks that each of them is active
//   node vegetation-glsl-dump.mjs <outDir>
// The three programs of the ground and the trees are taken from the layer itself (the module is started on a stand-in theatre whose renderer records what it is given: the text is the module's, not a copy); the standing crop's program is made only
// when it is asked for, so its two texts are read from shell.mjs and the common header from gl.mjs as text (the header is not exported; the text must start the decal program, which is checked).
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
import * as VEG from '../src/ext/vegetation/index.mjs';
import { SHELL_VS, SHELL_FS } from '../src/ext/vegetation/shell.mjs';
import { STATE_K } from '../src/ext/vegetation/gl.mjs';
import { tierMark } from '../src/ui/extensions.mjs';
import { Bus } from '../src/scope.mjs';
import { nodeWorld } from './node-world.mjs';
import { assemble } from './crowd-lod-glsl-sources.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), APP = path.resolve(here, '..'), out = path.resolve(process.argv[2] || '.'); fs.mkdirSync(out, { recursive: true });
const { T } = await nodeWorld();
const gl = new Proxy({}, { get(t, k) { if (typeof k !== 'string') return undefined; if (k in t) return t[k]; if (/^[A-Z][A-Z0-9_]+$/.test(k)) return (t[k] = 1000 + Object.keys(t).length); t[k] = (...a) => { if (k === 'getParameter') return 32; if (/^create/.test(k)) return { k }; if (k === 'getUniformLocation') return { loc: a[1] }; return undefined; }; return t[k]; } });
const progs = [], R = { gl, W: 800, H: 500, progs, prog(name, vs, fs_) { const p = { name, vs, fs: fs_ }; progs.push(p); return p; }, finishProgs() {} };
const th = { dead: false, T, state: { t: 45000, chapter: 'battle' }, bus: new Bus(), root: null, announce() {}, stage: null, controls: { flyTo() {} }, openPanel() {}, sample: {}, viewFor: () => ({}) };
const ctx = { theatre: th, host: { api: 'webgl2', R, addSceneHook: () => () => {} }, urls: { data: pathToFileURL(path.join(APP, 'data') + path.sep).href }, choices: () => ({}), tierMark,
  registerPanel: (i) => ({ id: i, open() {}, close() {}, isOpen: () => false, refresh() {} }), registerLayerToggle: (i, t, g, s) => ({ id: i, get: g, set: v => { s(v); return Promise.resolve(); } }) };
await VEG.init(ctx);
const names = progs.map(p => p.name).join(); if (names !== 'veg-decal,veg-tree,veg-tree-shadow') throw new Error('the layer made the programs ' + names);

const glSrc = fs.readFileSync(path.join(APP, 'src/ext/vegetation/gl.mjs'), 'utf8'), m = /const COMMON = \/\* glsl \*\/`([\s\S]*?)`;\n/.exec(glSrc);
if (!m) throw new Error('gl.mjs: the COMMON header is not where tests/vegetation-glsl-dump.mjs expects it');
const COMMON = m[1].replace(/\$\{STATE_K\}/g, String(STATE_K)); if (/\$\{/.test(COMMON)) throw new Error('COMMON holds an expression the dump does not know');
if (!progs[0].vs.startsWith(COMMON) || !progs[1].vs.startsWith(COMMON)) throw new Error('the header read from gl.mjs does not start the decal and tree programs');
progs.push({ name: 'veg-shell', vs: COMMON + SHELL_VS, fs: COMMON + SHELL_FS });
for (const p of progs) { const a = assemble(p.vs, p.fs); fs.writeFileSync(path.join(out, p.name + '.vert'), a.vs); fs.writeFileSync(path.join(out, p.name + '.frag'), a.fs); }

// the uniforms the layer looks up for each program, read from its source
const SET = { 'veg-decal': ['uVegState', 'uVisit', 'uT', 'uGrid', 'uOverlay', 'uVisitOn', 'uTierCol'], 'veg-tree': ['uVegState', 'uFar', 'uTrunk', 'uSpA', 'uSpB', 'uWind', 'uSway'], 'veg-tree-shadow': ['uVegState', 'uFar', 'uTrunk'], 'veg-shell': ['uVegState', 'uVisit', 'uT', 'uGrid', 'uVisitOn', 'uRange', 'uLayers', 'uWind', 'uSway'] };
const shellSrc = fs.readFileSync(path.join(APP, 'src/ext/vegetation/gl.mjs'), 'utf8');
for (const [prog, key, list] of [['decal', 'decal', SET['veg-decal'].slice(2)], ['tree', 'tree', SET['veg-tree'].slice(1)], ['shadow', 'shadow', SET['veg-tree-shadow'].slice(1)]]) {
  const re = new RegExp(key + ': Object\\.fromEntries\\(\\[([^\\]]*)\\]'), mm = re.exec(shellSrc); if (!mm) throw new Error('gl.mjs: no list of uniforms for ' + prog);
  const found = [...mm[1].matchAll(/'(\w+)'/g)].map(x => x[1]); if (found.join() !== list.join()) throw new Error(`gl.mjs looks up ${found.join()} for ${prog}, this test expects ${list.join()}`);
}
const sh = /_makeShell\(\)[\s\S]*?\['(uT)', 'uGrid', 'uVisitOn', 'uRange', 'uLayers', 'uWind', 'uSway'\]/.exec(shellSrc); if (!sh) throw new Error('gl.mjs: the uniforms of the standing crop are not where the test expects them');
fs.writeFileSync(path.join(out, 'uniforms.json'), JSON.stringify(SET, null, 1));
console.log(`written ${progs.length} programs (${progs.map(p => p.name + ' ' + (p.vs.length + p.fs.length)).join(', ')}); STATE_K ${STATE_K}`);
VEG.dispose(); process.exit(0);
