// Static check of the scrub-purity property of the weather and effects draw path (test helper, no browser, no GPU): the same simulation time and camera must give the same pixels, so nothing in the
// code that computes what is uploaded may read a clock or a random source. Used by weather3d-gpu.test.mjs (the packers) and weather3d-determinism.test.mjs (the check itself, with injected defects).
//
// It reads the SYNTAX TREE (acorn, a declared devDependency of the repository: a machine without it fails the test, it does not skip it), not the text, so comments and strings never count, and the usual escapes do
// not hide a call: `Math['random']()`, `const { random } = Math`, `const M = Math`, `globalThis.Math.random()`, `new Date()`, `Date.now()`, `Date()`, any use of `performance` or `crypto`, `hrtime`, `getRandomValues`,
// `randomUUID`, `eval` and `Function` (code made from a string). What it allows on purpose: `setTimeout` / `clearTimeout` (bounded waits of the set-up on the device decide how long to wait, never what is drawn),
// `new Date(n)` with an argument and `Date.UTC` (a pure function of its inputs), `typeof performance`, `x instanceof Date`, and the GPU time of the pass (`passMs`, timestamp queries: the result is a statistic that
// is never uploaded). It is a lint against accidents, not a proof against someone who sets out to hide a call: the behavioural test (the same inputs give byte-identical uploads and pictures, and the counters of
// the clock and the random source stay at zero while the packers and the pass run) is the other half.
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url)), APP = path.resolve(HERE, '..'), REPO = path.resolve(HERE, '../../../..');
const acorn = createRequire(path.join(REPO, 'package.json'))('acorn');

const GLOBAL_OBJECTS = new Set(['Math', 'Date', 'performance', 'crypto']);        // the globals that carry a clock or a random source
const GLOBAL_HOLDERS = new Set(['globalThis', 'window', 'self', 'global']);
const BANNED_PROPS = new Set(['getRandomValues', 'randomUUID', 'hrtime']);        // wherever they are called from
const CODE_FROM_STRING = new Set(['eval', 'Function']);

const keyName = (node, computed) => {     // the name a member or property key spells, or null when it is not a plain name or literal
  if (!node) return null; if (!computed) return node.type === 'Identifier' ? node.name : null;
  if (node.type === 'Literal') return String(node.value); if (node.type === 'TemplateLiteral' && node.expressions.length === 0) return node.quasis[0].value.cooked; return null;
};
// is this Identifier a use of the global (an expression), or only a name (a property key, a declaration, a label, an import)?
const isReference = (node, parent, key) => {
  if (!parent) return true;
  switch (parent.type) {
    case 'MemberExpression': return !(parent.property === node && !parent.computed);
    case 'Property': return !(parent.key === node && !parent.computed && parent.value !== node) || parent.shorthand;
    case 'PropertyDefinition': case 'MethodDefinition': return !(parent.key === node && !parent.computed);
    case 'VariableDeclarator': return parent.id !== node;
    case 'FunctionDeclaration': case 'FunctionExpression': case 'ClassDeclaration': case 'ClassExpression': return parent.id !== node && !(parent.params || []).includes(node);
    case 'ImportSpecifier': case 'ImportDefaultSpecifier': case 'ImportNamespaceSpecifier': case 'ExportSpecifier': case 'LabeledStatement': case 'BreakStatement': case 'ContinueStatement': return false;
    default: return key !== 'params';
  }
};

// Findings of one source text: [{ rule, line, col }], in source order. Throws when the text is not a module (a syntax error is a failure, never "nothing found").
export function nondeterminismIn(src) {
  const ast = acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'module', locations: true }), out = [];
  const add = (node, rule) => out.push({ rule, line: node.loc.start.line, col: node.loc.start.column + 1 });
  const walk = (node, parent, key) => {
    if (!node || typeof node.type !== 'string') return;
    switch (node.type) {
      case 'MemberExpression': {
        const o = node.object, name = keyName(node.property, node.computed), unknown = node.computed && name === null;
        if (o.type === 'Identifier' && GLOBAL_OBJECTS.has(o.name)) {
          if (o.name === 'Math' && (name === 'random' || unknown)) add(node, name === 'random' ? 'Math.random' : 'Math[...]: a computed key cannot be shown to be safe');
          else if (o.name === 'Date' && (name === 'now' || unknown)) add(node, name === 'now' ? 'Date.now' : 'Date[...]: a computed key cannot be shown to be safe');
          else if (o.name === 'performance') add(node, 'performance.' + (name || '[...]'));
          else if (o.name === 'crypto') add(node, 'crypto.' + (name || '[...]'));
        }
        if (name === 'random' && o.type === 'MemberExpression' && keyName(o.property, o.computed) === 'Math') add(node, 'Math.random through a global object');
        if (BANNED_PROPS.has(name)) add(node, name);
        if (o.type === 'Identifier' && GLOBAL_HOLDERS.has(o.name) && GLOBAL_OBJECTS.has(name)) { if (name !== 'Math' && name !== 'Date') add(node, o.name + '.' + name); }
        if (o.type === 'Identifier' && GLOBAL_HOLDERS.has(o.name) && node.computed && name !== null && GLOBAL_OBJECTS.has(name)) add(node, o.name + '[\'' + name + '\']');
        break;
      }
      case 'NewExpression': case 'CallExpression': {
        const c = node.callee;
        if (c.type === 'Identifier') {
          if (c.name === 'Date' && (node.type === 'CallExpression' || node.arguments.length === 0)) add(node, node.type === 'CallExpression' ? 'Date()' : 'new Date()');
          if (CODE_FROM_STRING.has(c.name)) add(node, c.name + ': code made from a string');
        }
        break;
      }
      case 'Identifier': {
        if (GLOBAL_OBJECTS.has(node.name) && isReference(node, parent, key)) {
          const asObject = parent && parent.type === 'MemberExpression' && parent.object === node, asCallee = parent && (parent.type === 'NewExpression' || parent.type === 'CallExpression') && parent.callee === node;
          const harmless = (parent && parent.type === 'UnaryExpression' && parent.operator === 'typeof') || (parent && parent.type === 'BinaryExpression' && parent.operator === 'instanceof' && parent.right === node);
          if (!asObject && !harmless && !(asCallee && node.name === 'Date')) add(node, node.name + ' used as a value (an alias that hides what is called)');
          if (asObject && node.name === 'Math' && parent.computed && keyName(parent.property, true) === null) { /* already reported as Math[...] */ }
        }
        break;
      }
      default: break;
    }
    for (const k of Object.keys(node)) {
      if (k === 'type' || k === 'start' || k === 'end' || k === 'loc') continue;
      const v = node[k];
      if (Array.isArray(v)) { for (const x of v) walk(x, node, k); } else if (v && typeof v.type === 'string') walk(v, node, k);
    }
  };
  walk(ast, null, null);
  return out.sort((a, b) => a.line - b.line || a.col - b.col);
}

// The files of the draw path: every module of the weather layer and of the effects layer, and the host that wires them (the files whose results are uploaded to the GPU or decide what is). A new file in these
// folders is covered by its being there.
export function drawPathFiles() {
  const list = [], dirs = ['src/weather3d', 'src/fx3d'];
  for (const d of dirs) for (const f of fs.readdirSync(path.join(APP, d)).sort()) if (f.endsWith('.mjs')) list.push(path.join(APP, d, f));
  list.push(path.join(APP, 'src/fx-host.mjs')); return list;
}
export const relApp = f => path.relative(APP, f).split(path.sep).join('/');
