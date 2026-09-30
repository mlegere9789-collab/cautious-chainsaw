// Safe extraction of literal datasets embedded in the deployed JS bundle (WP-DATA-15 extract, WP-DATA-19 census).
// The bundle is PARSED with acorn and only literal AST nodes are converted to JSON; nothing is evaluated.
// Identifiers, calls, spreads, computed keys and template expressions abort the conversion of that array.
import fs from 'node:fs';
import * as acorn from 'acorn';
import * as walk from 'acorn-walk';

export class NonLiteralError extends Error {}

/** Convert a literal-only AST node to a JS value. Throws NonLiteralError for anything else. */
export function literalFromAst(node) {
  switch (node.type) {
    case 'Literal':
      if (node.regex) throw new NonLiteralError('regex literal');
      return node.value;
    case 'TemplateLiteral':
      if (node.expressions.length) throw new NonLiteralError('template expression');
      return node.quasis.map((q) => q.value.cooked).join('');
    case 'UnaryExpression':
      if ((node.operator === '-' || node.operator === '+') && node.argument.type === 'Literal' && typeof node.argument.value === 'number') {
        return node.operator === '-' ? -node.argument.value : node.argument.value;
      }
      if (node.operator === '!' && node.argument.type === 'Literal' && typeof node.argument.value === 'number') {
        return !node.argument.value; // minified true/false: !0 / !1
      }
      throw new NonLiteralError(`unary ${node.operator}`);
    case 'ArrayExpression':
      return node.elements.map((e) => {
        if (e === null || e.type === 'SpreadElement') throw new NonLiteralError('hole or spread');
        return literalFromAst(e);
      });
    case 'ObjectExpression': {
      const out = {};
      for (const p of node.properties) {
        if (p.type !== 'Property' || p.computed || p.kind !== 'init' || p.method) throw new NonLiteralError('non-plain property');
        const key = p.key.type === 'Identifier' ? p.key.name : p.key.type === 'Literal' ? String(p.key.value) : null;
        if (key === null) throw new NonLiteralError('odd key');
        out[key] = literalFromAst(p.value);
      }
      return out;
    }
    default:
      throw new NonLiteralError(node.type);
  }
}

export function parseBundle(bundlePath) {
  const src = fs.readFileSync(bundlePath, 'utf8');
  const ast = acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'module', locations: true, allowHashBang: true });
  return { src, ast };
}

/**
 * Find array literals whose first element is an object literal having every key in `keys`
 * and with at least `minLen` elements. Returns [{name, start, end, value}] (lines are 1-based in the pretty file).
 */
export function findLiteralArrays(ast, { keys, minLen }) {
  const found = [];
  const declNameOf = new Map();
  walk.full(ast, (node) => {
    if (node.type === 'VariableDeclarator' && node.init && node.init.type === 'ArrayExpression' && node.id.type === 'Identifier') {
      declNameOf.set(node.init, node.id.name);
    }
  });
  walk.simple(ast, {
    ArrayExpression(node) {
      if (node.elements.length < minLen) return;
      const first = node.elements[0];
      if (!first || first.type !== 'ObjectExpression') return;
      const have = new Set(first.properties.map((p) => (p.key && (p.key.name ?? String(p.key.value))) || ''));
      if (!keys.every((k) => have.has(k))) return;
      try {
        found.push({
          name: declNameOf.get(node) ?? null,
          start: node.loc.start.line,
          end: node.loc.end.line,
          value: literalFromAst(node),
        });
      } catch (e) {
        if (!(e instanceof NonLiteralError)) throw e;
      }
    },
  });
  return found;
}

/**
 * Extract the embedded datasets the plan tracks. Shapes are located structurally, never by minified name.
 * @returns {{monuments:any[], monumentsLoc:{start:number,end:number,name:string|null}|null, story:any[], storyLoc:any, tour:any[], tourLoc:any, warnings:string[]}}
 */
export function extractEmbeddedDatasets(bundlePath) {
  const { ast } = parseBundle(bundlePath);
  const warnings = [];
  const pick = (arrs, label) => {
    if (arrs.length === 0) { warnings.push(`${label}: not found`); return { value: [], loc: null }; }
    if (arrs.length > 1) warnings.push(`${label}: ${arrs.length} candidates, using the longest`);
    const best = arrs.slice().sort((a, b) => b.value.length - a.value.length)[0];
    return { value: best.value, loc: { start: best.start, end: best.end, name: best.name } };
  };
  const monuments = pick(findLiteralArrays(ast, { keys: ['no', 'name', 'honors', 'loc', 'lat', 'lon', 'mn', 'side', 'group'], minLen: 100 }), 'monuments');
  // story markers and tour stops are small; find by distinctive keys and check the counts the plan cites.
  const story = pick(findLiteralArrays(ast, { keys: ['id', 'name', 'unit_id', 'lat', 'lng', 'tick', 'day', 'label'], minLen: 5 }), 'story markers');
  const tour = pick(findLiteralArrays(ast, { keys: ['id', 'name', 'label', 'day', 'lat', 'lng', 'sv', 'history'], minLen: 10 }), 'tour stops');
  return {
    monuments: monuments.value, monumentsLoc: monuments.loc,
    story: story.value, storyLoc: story.loc,
    tour: tour.value, tourLoc: tour.loc,
    warnings,
  };
}
