// tools/check-bundle-rules.mjs - does the backdrop fit the Battle Studio's bundler (docs/pitch/anim/prototype/build.mjs)?  It re-applies that bundler's rules to src/*.mjs and data/*.mjs:
// named exports only (no default / re-export / export let|var), relative imports only, no import.meta, no circular import, no URL and no network API call in the source.
//   node tools/check-bundle-rules.mjs   -> exit code 1 and a list of violations, or "ok"
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as acorn from 'acorn';

const BASE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const files = ['src', 'data'].flatMap((d) => fs.readdirSync(path.join(BASE, d)).filter((f) => f.endsWith('.mjs')).map((f) => path.join(BASE, d, f)));
const bad = []; const graph = new Map();
for (const f of files) {
  const rel = path.relative(BASE, f).split(path.sep).join('/'); const code = fs.readFileSync(f, 'utf8');
  if (/\bimport\.meta\b/.test(code)) bad.push(`${rel}: import.meta`);
  const ast = acorn.parse(code, { ecmaVersion: 2023, sourceType: 'module' }); const deps = [];
  for (const n of ast.body) {
    if (n.type === 'ImportDeclaration') {
      const sp = n.source.value; if (sp.startsWith('node:') || !sp.startsWith('.')) bad.push(`${rel}: non-relative import ${sp}`); else deps.push(path.resolve(path.dirname(f), sp));
      for (const s of n.specifiers) if (s.type === 'ImportDefaultSpecifier') bad.push(`${rel}: default import`);
    } else if (n.type === 'ExportNamedDeclaration') {
      if (n.source) bad.push(`${rel}: re-export`);
      else if (n.declaration && n.declaration.type === 'VariableDeclaration') { if (n.declaration.kind !== 'const') bad.push(`${rel}: export ${n.declaration.kind}`); for (const d of n.declaration.declarations) if (d.id.type !== 'Identifier') bad.push(`${rel}: exported destructuring`); }
      else if (!n.declaration) { for (const s of n.specifiers) bad.push(`${rel}: export { ${s.local.name} } of an import is a re-export (a local declaration must be exported where it is declared)`); }
    } else if (n.type === 'ExportDefaultDeclaration' || n.type === 'ExportAllDeclaration') bad.push(`${rel}: ${n.type}`);
  }
  graph.set(f, deps);
  const urls = [...code.matchAll(/https?:\/\/[^\s"'`)<>\\]+/g)].map((m) => m[0]); if (urls.length) bad.push(`${rel}: URL in source: ${urls[0]}`);
  if (/\b(fetch|XMLHttpRequest|sendBeacon|WebSocket|importScripts)\s*\(/.test(code)) bad.push(`${rel}: network API call`);
}
const state = new Map();
const visit = (f, stack) => { if (state.get(f) === 2) return; if (state.get(f) === 1) { bad.push('circular import: ' + [...stack, f].map((x) => path.basename(x)).join(' -> ')); return; } state.set(f, 1); for (const d of graph.get(f) || []) visit(d, [...stack, f]); state.set(f, 2); };
for (const f of files) visit(f, []);
const bytes = files.reduce((s, f) => s + fs.statSync(f).size, 0);
if (bad.length) { console.log(bad.join('\n')); process.exit(1); } else console.log(`ok: ${files.length} modules, ${(bytes / 1024).toFixed(0)} KB (code ${(files.filter((f) => f.includes(path.sep + 'src' + path.sep)).reduce((s, f) => s + fs.statSync(f).size, 0) / 1024).toFixed(0)} KB, data modules the rest)`);
