// build-anim.mjs - compiles the readable sources of the ANIM group (tools/t0/anim/src, ES modules) into the asserted patch files the Tranche-0 builder applies:
//
//     node tools/t0/anim/build-anim.mjs            write tools/t0/patches-next/ANIM.json and ANIM+mon.json
//     node tools/t0/anim/build-anim.mjs --check    exit 1 when the committed patch files differ from a fresh compile (the sources are the truth)
//     node tools/t0/anim/build-anim.mjs --dev      also write tmp/motion-build/anim.dev.js (the engine, readable, unminified) for a debugger
//
// The compiler is deliberately small and strict (acorn and terser, both already in the repo's node_modules, no new dependency): each module becomes a function scope; `import {a} from './x.mjs'` becomes a
// destructured require; `export const/function/class` stays a declaration whose name is attached to the module's exports at its end.  Unsupported on purpose (the build fails loudly): default exports,
// re-exports, `export let`, import.meta, circular imports, any node: import.  The result is a pure function of the sources and of the files it embeds (tokens, fonts): two runs give the same bytes.
//
// Two virtual modules are generated here and never exist as files: host/tokens-data.mjs (the parsed tokens/anim.tokens.json) and host/fonts-data.mjs (the base64 woff faces of assets/fonts).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import * as acorn from 'acorn';
import { minify } from 'terser';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..', '..');
const SRC = path.join(HERE, 'src');
const OUT_DIR = path.join(REPO, 'tools', 't0', 'patches-next');
const args = new Set(process.argv.slice(2));
const read = (p) => fs.readFileSync(p, 'utf8');

const FONT_FILES = [['QCSans-Regular.woff', 400, 'normal'], ['QCSans-SemiBold.woff', 600, 'normal'], ['QCSans-Bold.woff', 700, 'normal']];
function virtualModules() {
  const tokens = JSON.parse(read(path.join(HERE, 'tokens', 'anim.tokens.json')));
  const faces = FONT_FILES.map(([f, w, st]) => ({ family: 'QC Sans', weight: w, style: st, mime: 'font/woff', fmt: 'woff', data: fs.readFileSync(path.join(HERE, 'assets', 'fonts', f)).toString('base64') }));
  return {
    'host/tokens-data.mjs': `export const TOKENS_DOC = ${JSON.stringify(tokens)};\n`,
    'host/fonts-data.mjs': `export const FONT_FACES = ${JSON.stringify(faces)};\n`,
  };
}

function bundle(entry, virt) {
  const defs = []; const state = new Map();
  const rel = (abs) => path.relative(SRC, abs).split(path.sep).join('/');
  function visit(abs, stack) {
    const id = rel(abs);
    if (state.get(abs) === 'done') return; if (state.get(abs) === 'visiting') throw new Error('circular import: ' + [...stack, abs].map(rel).join(' -> '));
    state.set(abs, 'visiting');
    const code = virt[id] !== undefined ? virt[id] : read(abs);
    if (/\bimport\.meta\b/.test(code)) throw new Error(`${id}: import.meta is not supported`);
    const ast = acorn.parse(code, { ecmaVersion: 2023, sourceType: 'module' });
    const edits = []; const exp = [];
    for (const n of ast.body) {
      if (n.type === 'ImportDeclaration') {
        const spec = n.source.value; if (spec.startsWith('node:') || !spec.startsWith('.')) throw new Error(`${id}: only relative imports are allowed (${spec})`);
        const dep = path.resolve(path.dirname(abs), spec); visit(dep, [...stack, abs]);
        const parts = []; let ns = null;
        for (const s of n.specifiers) { if (s.type === 'ImportSpecifier') parts.push(s.imported.name === s.local.name ? s.local.name : `${s.imported.name}: ${s.local.name}`); else if (s.type === 'ImportNamespaceSpecifier') ns = s.local.name; else throw new Error(`${id}: default imports are not supported`); }
        const call = `__r(${JSON.stringify(rel(dep))})`;
        edits.push({ s: n.start, e: n.end, t: ns ? `const ${ns} = ${call};` : parts.length ? `const { ${parts.join(', ')} } = ${call};` : `${call};` });
      } else if (n.type === 'ExportNamedDeclaration') {
        if (n.source) throw new Error(`${id}: re-exports are not supported`);
        if (n.declaration) {
          const d = n.declaration;
          if (d.type === 'VariableDeclaration') { if (d.kind === 'let' || d.kind === 'var') throw new Error(`${id}: export ${d.kind} is not supported (live bindings)`); for (const dc of d.declarations) { if (dc.id.type !== 'Identifier') throw new Error(`${id}: exported destructuring is not supported`); exp.push([dc.id.name, dc.id.name]); } }
          else exp.push([d.id.name, d.id.name]);
          edits.push({ s: n.start, e: d.start, t: '' });
        } else { for (const s of n.specifiers) exp.push([s.exported.name, s.local.name]); edits.push({ s: n.start, e: n.end, t: '' }); }
      } else if (n.type === 'ExportDefaultDeclaration' || n.type === 'ExportAllDeclaration') throw new Error(`${id}: ${n.type} is not supported`);
    }
    let out = code; for (const ed of edits.sort((a, b) => b.s - a.s)) out = out.slice(0, ed.s) + ed.t + out.slice(ed.e);
    out += '\n' + exp.map(([ex, loc]) => `__exports.${ex} = ${loc};`).join('\n');
    defs.push(`__defs[${JSON.stringify(id)}] = function (__exports, __r) {\n${out}\n};`);
    state.set(abs, 'done');
  }
  visit(entry, []);
  return `(function () {\n'use strict';\nconst __defs = Object.create(null); const __cache = Object.create(null);\nfunction __r(id) { if (id in __cache) return __cache[id]; const m = (__cache[id] = {}); __defs[id](m, __r); return m; }\n${defs.join('\n')}\nreturn __r(${JSON.stringify(rel(entry))}).G;\n})()`;
}

// ---- the hooks: the places in the entry bundle where the app hands over to the engine (all asserted, expect 1) -------------------------------------------------------------------------------------------------
// The text of the entry after groups A..CP, A2, SHELL, PERF (and, for ANIM+mon, MON).  Names are the bundle's minified identifiers: yn the store, e1 the paused repaint, Ed the playing loop, y1 the units at a
// tick, lS the shipped draw routine (kept as the fallback), Qx the casualty-flash map, Vk the trails flag, aF/lF the later-day loaders, sT the fps tick, eF the order-of-battle file names.
export function hooks(engineJs) {
  return [
    { id: 'ANIM:engine+e1', target: 'js', expect: 1,
      find: 'function e1(c,f,x,M,P,z,H){const l=y1(x,M,0);lS(c,f,l,P,z,H,Qx,performance.now())}',
      repl: `${engineJs}GTANIM.bind({store:yn,prefetch:()=>{aF(),lF()},reduced:()=>!!window.__gtbgReduceMotion,trails:()=>Vk});function e1(c,f,x,M,P,z,H){if(GTANIM.on()&&GTANIM.paused(c,f))return;const l=y1(x,M,0);lS(c,f,l,P,z,H,Qx,performance.now())}`,
      note: 'the engine and its bind line; the paused / repaint entry (tick, selection, filter, resize, map move) goes to the engine, which reads the store itself; the shipped body stays below as the fallback (kill switch and automatic fallback)' },
    { id: 'ANIM:Ed-top', target: 'js', expect: 1,
      find: 'function Ed(c,f,x,M,P){const z=f(),',
      repl: 'function Ed(c,f,x,M,P){if(GTANIM.on()&&GTANIM.heartbeat(M,P)){sT(),Fp=requestAnimationFrame(Pe=>Ed(Pe,f,x,M,P));return}const z=f(),',
      note: 'the playing loop: the engine owns the clock (a continuous fractional tick that writes the integer tick back to the store when it changes) and draws in the map render event; the shipped loop keeps only the fps counter and the wake-up' },
    { id: 'ANIM:y1', target: 'js', expect: 1,
      find: 'function y1(c,f,x){if(c!==i2c||f<i2t){',
      repl: 'function y1(c,f,x){if(GTANIM.on()){const gtu=GTANIM.units(c,f,x);if(gtu)return gtu}if(c!==i2c||f<i2t){',
      note: 'every other consumer of y1 (minimap, picker index, fly-to) sees the unit positions the engine draws' },
    { id: 'ANIM:pick-desktop', target: 'js', expect: 1,
      find: 'const ht=pt.useCallback(Xe=>{const xt=M.current;if(!xt||!P.current)return;',
      repl: 'const ht=pt.useCallback(Xe=>{const gtp=GTANIM.on()&&GTANIM.pick(Xe.clientX,Xe.clientY,!1);if(gtp){if(gtp.crowd)return;kt(gtp.id),xe(gtp.id);return}const xt=M.current;if(!xt||!P.current)return;',
      note: 'desktop pick: the mark under the pointer as drawn (select and pin); empty ground deselects; a crowd mark moves the map in until it splits' },
    { id: 'ANIM:pick-mobile', target: 'js', expect: 1,
      find: '$t.on("click",nr=>{if(!ki.current)return;',
      repl: '$t.on("click",nr=>{const gtp=GTANIM.on()&&nr.originalEvent&&GTANIM.pick(nr.originalEvent.clientX,nr.originalEvent.clientY,!0);if(gtp){if(gtp.crowd)return;const ur=yn.getState();if(!gtp.id){ur.selectUnit(null),ur.pinUnit(null),Wo(null);return}Wo({...gtp.rec,oob:ur.oobData[gtp.id]}),ur.selectUnit(gtp.id),ur.pinUnit(gtp.id),Br(null);return}if(!ki.current)return;',
      note: 'phone pick, the same contract as the shipped handler (selection record, select, pin), a finger-sized reach' },
    { id: 'ANIM:resize-guard', target: 'js', expect: 1,
      find: 'g&&(cv.width!==g.clientWidth||cv.height!==g.clientHeight)&&(cv.width=g.clientWidth,cv.height=g.clientHeight);e1(cv,m,s.placementsByTick,s.currentTick,s.selectedUnitId,s.pinnedUnitId,s.filters)',
      repl: '!GTANIM.on()&&g&&(cv.width!==g.clientWidth||cv.height!==g.clientHeight)&&(cv.width=g.clientWidth,cv.height=g.clientHeight);e1(cv,m,s.placementsByTick,s.currentTick,s.selectedUnitId,s.pinnedUnitId,s.filters)',
      note: 'GtbgRepaint (every map move while paused) must not reset the backing store the engine sized for the device pixel ratio' },
    { id: 'ANIM:oob-files', target: 'js', expect: 1,
      find: 'yn.getState().setOobData(f),f}async function zp(',
      repl: 'GTANIM.oobFiles(eF,c),yn.getState().setOobData(f),f}async function zp(',
      note: 'the order-of-battle files the loader fetched are handed to the engine (hierarchy, designations, battalions)' },
  ];
}
export const MON_HOOKS = [
  { id: 'ANIM:mon-units', target: 'js', expect: 1,
    find: 'function unitsNow(){var st=yn.getState(),pbt=st.placementsByTick||{},t=st.currentTick,u={},k,a,j;',
    repl: 'function unitsNow(){var st=yn.getState(),pbt=st.placementsByTick||{},t=st.currentTick,u={},k,a,j;if(GTANIM.on()){var gtd=GTANIM.drawn();if(gtd)return gtd}',
    note: 'ONLY with MON (the anchor lies in the MON runtime): the Monuments click arbitration asks which unit is nearest to the pointer; it must use the positions the engine drew, not the latest keyframe' },
];

export async function compile() {
  const virt = virtualModules();
  const raw = bundle(path.join(SRC, 'host', 'app.mjs'), virt);
  if (args.has('--dev')) { fs.mkdirSync(path.join(REPO, 'tmp', 'motion-build'), { recursive: true }); fs.writeFileSync(path.join(REPO, 'tmp', 'motion-build', 'anim.dev.js'), raw); }
  const min = await minify('var GTANIM = ' + raw + ';', { compress: { passes: 2, ecma: 2020, unsafe: false }, mangle: true, format: { comments: false, ascii_only: true, ecma: 2020 }, ecma: 2020 });
  if (min.error) throw min.error;
  let js = min.code; if (!js || !/^var GTANIM=/.test(js) || /[^\x00-\x7f]/.test(js)) throw new Error('the minified engine is not ASCII');
  return { raw, js };
}

async function main() {
  const { js } = await compile();
  const files = {
    'ANIM.json': { group: 'ANIM', patches: hooks(js) },
    'ANIM+mon.json': { group: 'ANIM', patches: MON_HOOKS },
  };
  const sha = crypto.createHash('sha256').update(js).digest('hex').slice(0, 16);
  for (const [name, doc] of Object.entries(files)) {
    const text = JSON.stringify(doc, null, 1) + '\n'; const f = path.join(OUT_DIR, name);
    if (args.has('--check')) { const cur = fs.existsSync(f) ? read(f) : ''; if (cur !== text) { console.error(`${name} is stale: run node tools/t0/anim/build-anim.mjs`); process.exit(1); } console.log(`${name} is current`); }
    else { fs.mkdirSync(OUT_DIR, { recursive: true }); fs.writeFileSync(f, text); console.log(`wrote tools/t0/patches-next/${name}  ${(text.length / 1024).toFixed(1)} KB`); }
  }
  console.log(`engine ${(js.length / 1024).toFixed(1)} KB minified, sha256:${sha}`);
}
if (process.argv[1] === fileURLToPath(import.meta.url)) main().catch((e) => { console.error(String(e.stack || e)); process.exit(1); });
