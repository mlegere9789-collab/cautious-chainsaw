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
          items: node.elements.map((e) => ({ start: e.loc.start.line, end: e.loc.end.line, props: Object.fromEntries(e.properties.map((pr) => [pr.key.name ?? String(pr.key.value), pr.loc.start.line])) })),
        });
      } catch (e) {
        if (!(e instanceof NonLiteralError)) throw e;
      }
    },
  });
  return found;
}

/**
 * Find literal GeoJSON FeatureCollections (`{type: "FeatureCollection", features: [...]}`) declared in the bundle. Only collections that
 * convert with literal nodes are returned (the runtime ones built from calls or member expressions are skipped, never evaluated).
 */
export function findFeatureCollections(ast) {
  const found = [];
  const declNameOf = new Map();
  walk.full(ast, (node) => {
    if (node.type === 'VariableDeclarator' && node.init && node.init.type === 'ObjectExpression' && node.id.type === 'Identifier') declNameOf.set(node.init, node.id.name);
  });
  const keyOf = (p) => (p.key.name ?? String(p.key.value));
  walk.simple(ast, {
    ObjectExpression(node) {
      const t = node.properties.find((p) => p.type === 'Property' && !p.computed && keyOf(p) === 'type');
      if (!t || t.value.type !== 'Literal' || t.value.value !== 'FeatureCollection') return;
      const f = node.properties.find((p) => p.type === 'Property' && !p.computed && keyOf(p) === 'features');
      if (!f || f.value.type !== 'ArrayExpression' || f.value.elements.length === 0) return;
      try {
        found.push({ name: declNameOf.get(node) ?? null, start: node.loc.start.line, end: node.loc.end.line, value: literalFromAst(node) });
      } catch (e) {
        if (!(e instanceof NonLiteralError)) throw e;
      }
    },
  });
  return found;
}

/** What a literal FeatureCollection holds, judged from its geometry types and feature names (never from its minified identifier). */
export function classifyFeatureCollection(fc) {
  const names = fc.features.map((f) => String(f.properties?.name ?? ''));
  const types = new Set(fc.features.map((f) => f.geometry?.type));
  if (types.size === 1 && types.has('Polygon')) return 'farm_polygons';
  if (names.every((n) => /\b(Road|Pike|Lane|Ave|Avenue|Street|Turnpike)\b/i.test(n))) return 'roads';
  if (names.every((n) => /\b(Run|Creek|Spring|Brook)\b/i.test(n))) return 'streams';
  if (names.every((n) => /\b(works|Confederate|Union)\b/i.test(n))) return 'works';
  return 'other';
}

/** The shape every consumer can rely on, also when the bundle is not available. */
export function emptyEmbedded(warning = 'bundle not available') {
  return { monuments: [], monumentsLoc: null, monumentItems: [], story: [], storyLoc: null, tour: [], tourLoc: null, narrated: [], narratedLoc: null, tutorial: [], tutorialLoc: null, timeline: [], timelineLoc: null, geojson: [], warnings: warning ? [warning] : [] };
}

/**
 * Extract the embedded datasets the plan tracks. Shapes are located structurally, never by minified name.
 * @returns {{monuments:any[], monumentsLoc:{start:number,end:number,name:string|null}|null, story:any[], storyLoc:any, tour:any[], tourLoc:any,
 *            narrated:any[], tutorial:any[], timeline:any[], geojson:{kind:string,name:string|null,start:number,end:number,features:number,value:any}[], warnings:string[]}}
 */
export function extractEmbeddedDatasets(bundlePath) {
  const { ast } = parseBundle(bundlePath);
  const warnings = [];
  const pick = (arrs, label) => {
    if (arrs.length === 0) { warnings.push(`${label}: not found`); return { value: [], loc: null, items: [] }; }
    if (arrs.length > 1) warnings.push(`${label}: ${arrs.length} candidates, using the longest`);
    const best = arrs.slice().sort((a, b) => b.value.length - a.value.length)[0];
    return { value: best.value, loc: { start: best.start, end: best.end, name: best.name }, items: best.items };
  };
  const monuments = pick(findLiteralArrays(ast, { keys: ['no', 'name', 'honors', 'loc', 'lat', 'lon', 'mn', 'side', 'group'], minLen: 100 }), 'monuments');
  // story markers and tour stops are small; find by distinctive keys and check the counts the plan cites.
  const story = pick(findLiteralArrays(ast, { keys: ['id', 'name', 'unit_id', 'lat', 'lng', 'tick', 'day', 'label'], minLen: 5 }), 'story markers');
  const tour = pick(findLiteralArrays(ast, { keys: ['id', 'name', 'label', 'day', 'lat', 'lng', 'sv', 'history'], minLen: 10 }), 'tour stops');
  // WP-DATA-04 also names the tutorial, the timeline markers and the road GeoJSON; the narrated tour (title/subtitle/narrative/videoUrl) and the
  // three sibling GeoJSON overlays (streams, works, farm polygons) sit next to them and are audited with them. Only collections declared as a
  // named constant count as datasets; the anonymous FeatureCollections built inline for a map layer at run time are not shipped data.
  const narrated = pick(findLiteralArrays(ast, { keys: ['id', 'title', 'subtitle', 'lat', 'lng', 'zoom', 'tick', 'narrative'], minLen: 10 }), 'narrated tour stops');
  const tutorial = pick(findLiteralArrays(ast, { keys: ['tick', 'title', 'body', 'hint', 'action'], minLen: 3 }), 'tutorial steps');
  const timeline = pick(findLiteralArrays(ast, { keys: ['tick', 'label', 'color'], minLen: 5 }), 'timeline markers');
  const geojson = findFeatureCollections(ast).filter((c) => c.name !== null).map((c) => ({ kind: classifyFeatureCollection(c.value), name: c.name, start: c.start, end: c.end, features: c.value.features.length, value: c.value })).sort((a, b) => a.start - b.start);
  if (!geojson.some((g) => g.kind === 'roads')) warnings.push('road GeoJSON: not found');
  return {
    monuments: monuments.value, monumentsLoc: monuments.loc, monumentItems: monuments.items,
    story: story.value, storyLoc: story.loc,
    tour: tour.value, tourLoc: tour.loc,
    narrated: narrated.value, narratedLoc: narrated.loc,
    tutorial: tutorial.value, tutorialLoc: tutorial.loc,
    timeline: timeline.value, timelineLoc: timeline.loc,
    geojson,
    warnings,
  };
}
