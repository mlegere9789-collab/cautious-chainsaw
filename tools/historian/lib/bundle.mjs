// bundle.mjs - extract the site-authored prose that only exists inside the (source-less) minified app bundle:
//   * the 16 map "walkthrough" stops   {id, title, subtitle, tick, narrative}
//   * the 16 "tour stop" history blocks {id, name, label, day, history[]}
// Parsed with acorn (a build-time dev dependency; the runtime has none). Read-only: legacy/dist/assets is never modified.
// These strings are OWNER-AUTHORED site copy but their provenance is part of the pending rights retro-audit (docs/historian/sources.yaml,
// source id "site-bundle-prose"); pass {bundle:false} to build.mjs (--no-bundle) to exclude them.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

function litValue(node) {
  if (!node) return undefined;
  switch (node.type) {
    case 'Literal': return node.value;
    case 'TemplateLiteral': return node.expressions.length === 0 ? node.quasis.map((q) => q.value.cooked).join('') : undefined;
    case 'UnaryExpression': return node.operator === '-' && node.argument.type === 'Literal' ? -node.argument.value : (node.operator === '!' ? !litValue(node.argument) : undefined);
    case 'ArrayExpression': { const a = node.elements.map(litValue); return a.every((x) => x !== undefined) ? a : undefined; }
    case 'BinaryExpression': { if (node.operator === '+') { const l = litValue(node.left), r = litValue(node.right); if (typeof l === 'string' && typeof r === 'string') return l + r; } return undefined; }
    default: return undefined;
  }
}
function objValue(node) {
  const o = {};
  for (const p of node.properties) {
    if (p.type !== 'Property' || p.computed) continue;
    const k = p.key.type === 'Identifier' ? p.key.name : p.key.value;
    const v = litValue(p.value);
    if (v !== undefined) o[k] = v;
  }
  return o;
}

export function findBundle(distDir) {
  const dir = path.join(distDir, 'assets');
  if (!fs.existsSync(dir)) return null;
  const c = fs.readdirSync(dir).filter((f) => /^index-.*\.js$/.test(f)).sort();
  return c.length ? path.join(dir, c[0]) : null;
}

export function extractBundleProse(distDir) {
  const file = findBundle(distDir);
  if (!file) return { file: null, walkthrough: [], tours: [], warning: 'bundle not found' };
  const acorn = require('acorn');
  const walk = require('acorn-walk');
  const src = fs.readFileSync(file, 'utf8');
  const ast = acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'module' });
  const walkthrough = [], tours = [];
  walk.simple(ast, {
    ObjectExpression(node) {
      const keys = new Set(node.properties.map((p) => (p.key && (p.key.name || p.key.value))));
      if (keys.has('narrative') && keys.has('subtitle') && keys.has('title') && keys.has('tick')) {
        const o = objValue(node);
        if (typeof o.narrative === 'string' && typeof o.title === 'string') walkthrough.push({ id: o.id, title: o.title, subtitle: o.subtitle || '', tick: o.tick, tickWindow: o.tickWindow || 6, narrative: o.narrative });
      } else if (keys.has('history') && keys.has('name') && keys.has('label')) {
        const o = objValue(node);
        if (Array.isArray(o.history)) tours.push({ id: o.id, name: o.name, label: o.label, day: o.day || '', history: o.history });
      }
    },
  });
  const by = (a, b) => (a.id || 0) - (b.id || 0);
  return { file: path.basename(file), walkthrough: walkthrough.sort(by), tours: tours.sort(by) };
}
