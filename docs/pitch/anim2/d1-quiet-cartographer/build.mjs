// build.mjs - FORK (d1 Quiet Cartographer) of the Battle Studio bundler: bundles src/ (ES modules), the real-data subset, the three embedded font faces (assets/fonts, QC Sans, OFL) and the real ground's
// code and vectors (../basemap) into ONE page, quiet-cartographer.html.  The aerial tiles (9 MB) are NOT inlined: the page loads them from ../basemap/assets/ (or ?tiles=<folder>), the only requests it makes.
//
//   node build.mjs            regenerate tokens.schema.json and quiet-cartographer.html
//   node build.mjs --data     rebuild data/dataset.json from the repo's data files first (needs the repo's baseline/ data; not used by the pictures)
//   node build.mjs --check    exit 1 when quiet-cartographer.html or tokens.schema.json is stale
//   node build.mjs --min      also minify the script with terser (default: readable, so a designer can read the engine in the browser's source view)
//
// The bundler is deliberately small and strict (acorn, already in the repo's node_modules): each module becomes a function scope; `import {a} from './x.mjs'` becomes a destructured require,
// `export const/function/class` stays a declaration whose name is attached to the module's exports at its end.  Unsupported on purpose (the build fails loudly): default exports,
// re-exports, `export let`, import.meta, circular imports, any node: import.  Those keep the graph simple enough that the bundle is the source, in order.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import * as acorn from 'acorn';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(HERE, 'src');
const OUT = path.join(HERE, 'quiet-cartographer.html');
const args = new Set(process.argv.slice(2));
const read = (p) => fs.readFileSync(p, 'utf8');

function bundle(entry) {
  const defs = []; const state = new Map();
  const rel = (abs) => path.relative(HERE, abs).split(path.sep).join('/');
  function visit(abs, stack) {
    if (state.get(abs) === 'done') return; if (state.get(abs) === 'visiting') throw new Error('circular import: ' + [...stack, abs].map(rel).join(' -> '));
    state.set(abs, 'visiting');
    const code = read(abs); const id = rel(abs);
    if (/\bimport\.meta\b/.test(code)) throw new Error(`${id}: import.meta is not supported in the browser bundle`);
    const ast = acorn.parse(code, { ecmaVersion: 2023, sourceType: 'module' });
    const edits = []; const exp = [];
    for (const n of ast.body) {
      if (n.type === 'ImportDeclaration') {
        const spec = n.source.value; if (spec.startsWith('node:') || !spec.startsWith('.')) throw new Error(`${id}: only relative imports are allowed in the browser bundle (${spec})`);
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
  return `(function () {\n'use strict';\nconst __defs = Object.create(null); const __cache = Object.create(null);\nfunction __r(id) { if (id in __cache) return __cache[id]; const m = (__cache[id] = {}); __defs[id](m, __r); return m; }\n${defs.join('\n')}\n__r(${JSON.stringify(path.relative(HERE, entry).split(path.sep).join('/'))});\n})();`;
}

const BS = String.fromCharCode(92);   // a backslash. JSON placed inside a script element must not contain a raw less-than sign (it could close the tag) or the line separators 0x2028 / 0x2029
const jsonInline = (obj) => JSON.stringify(obj).split('<').join(BS + 'u003c').split(String.fromCharCode(0x2028)).join(BS + 'u2028').split(String.fromCharCode(0x2029)).join(BS + 'u2029');

async function main() {
  if (args.has('--data')) { execFileSync(process.execPath, [path.join(HERE, 'data', 'build-dataset.mjs')], { stdio: 'inherit' }); execFileSync(process.execPath, [path.join(HERE, 'data', 'build-popup-data.mjs')], { stdio: 'inherit' }); }
  const dataset = JSON.parse(read(path.join(HERE, 'data', 'dataset.json')));
  const tokens = JSON.parse(read(path.join(HERE, 'tokens', 'tokens.json')));
  const text = JSON.parse(read(path.join(HERE, 'data', 'text-widths.json')));
  const popupData = JSON.parse(read(path.join(HERE, 'data', 'popup-data.json')));
  // the settings schema is generated from the tokens: keep the committed file in step
  const schemaArgs = args.has('--check') ? ['--check'] : [];
  execFileSync(process.execPath, [path.join(HERE, 'tokens', 'make-schema.mjs'), ...schemaArgs], { stdio: 'inherit' });

  let js = bundle(path.join(SRC, 'app.mjs'));
  if (args.has('--min')) { const { minify } = await import('terser'); js = (await minify(js, { compress: { passes: 2 }, mangle: true, format: { comments: false } })).code; }
  js = js.replace(/<\/script/gi, '<\\/script');
  const NL = String.fromCharCode(10);
  const faces = [['QCSans-Regular', 400, 'normal'], ['QCSans-Bold', 700, 'normal'], ['QCSans-Italic', 400, 'italic']];
  const fontCss = faces.map(([f, w, st]) => `@font-face { font-family: "QC Sans"; font-weight: ${w}; font-style: ${st}; font-display: block; src: url(data:font/woff;base64,${fs.readFileSync(path.join(HERE, 'assets', 'fonts', f + '.woff')).toString('base64')}) format("woff"); }`).join(NL);
  const css = fontCss + NL + read(path.join(SRC, 'ui', 'studio.css')) + NL + read(path.join(SRC, 'ui', 'popups.css')) + NL + read(path.join(SRC, 'ui', 'quiet.css'));
  let html = read(path.join(SRC, 'ui', 'shell.html'));
  html = html.replace('<!--@STYLE-->', () => css).replace('<!--@DATASET-->', () => jsonInline(dataset)).replace('<!--@TOKENS-->', () => jsonInline(tokens)).replace('<!--@TEXT-->', () => jsonInline(text)).replace('<!--@POPUPS-->', () => jsonInline(popupData)).replace('<!--@BUNDLE-->', () => js);

  // the file must not be able to make a network request: no URL scheme other than the SVG namespace identifier
  const urls = [...html.matchAll(/https?:\/\/[^\s"'`)<>\\]+/g)].map((m) => m[0]).filter((u) => u !== 'http://www.w3.org/2000/svg');
  const dataUrls = [...new Set(urls)];
  if (dataUrls.length) {
    // URLs inside the DATASET (source notes quote none) are data, not requests; but any URL in code or markup fails the build
    const withoutData = html.replace(/<script type="application\/json"[\s\S]*?<\/script>/g, '');
    const bad = [...withoutData.matchAll(/https?:\/\/[^\s"'`)<>\\]+/g)].map((m) => m[0]).filter((u) => u !== 'http://www.w3.org/2000/svg');
    if (bad.length) throw new Error('external URLs in code or markup: ' + bad.join(', '));
  }
  if (/\b(fetch|XMLHttpRequest|sendBeacon|WebSocket|importScripts)\s*\(/.test(js)) throw new Error('network API call found in the bundle');
  if (/<(script|link|img|iframe)\b[^>]*\s(src|href)=(?!"data:)/i.test(html.replace(/<script type="application\/json"[\s\S]*?<\/script>/g, ''))) throw new Error('external resource reference in markup');

  const sha = crypto.createHash('sha256').update(html).digest('hex').slice(0, 16);
  if (args.has('--check')) {
    const cur = fs.existsSync(OUT) ? read(OUT) : '';
    if (cur !== html) { console.error('quiet-cartographer.html is stale: run node build.mjs'); process.exit(1); }
    console.log('quiet-cartographer.html is current', sha);
  } else {
    fs.writeFileSync(OUT, html);
    console.log(`wrote ${path.relative(process.cwd(), OUT)}  ${(html.length / 1024).toFixed(0)} KB  (script ${(js.length / 1024).toFixed(0)} KB, dataset ${(JSON.stringify(dataset).length / 1024).toFixed(0)} KB)  sha256:${sha}`);
  }
}
main().catch((e) => { console.error(String(e.stack || e)); process.exit(1); });
