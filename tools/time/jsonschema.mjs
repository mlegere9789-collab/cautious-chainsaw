// A small JSON Schema (draft 2020-12 subset) validator so the repo needs no new dependency.
// Supports: type (incl. arrays of types), enum, const, required, properties, patternProperties, additionalProperties (bool | schema),
// items, minItems, maxItems, uniqueItems, minLength, maxLength, minimum, maximum, exclusiveMinimum, pattern, $ref (local "#/$defs/x").
// Unsupported keywords are ignored (and listed by unsupported()), never silently treated as satisfied for the ones above.

const SUPPORTED = new Set(['$schema', '$id', 'title', 'description', 'type', 'enum', 'const', 'required', 'properties', 'patternProperties', 'additionalProperties', 'items', 'minItems', 'maxItems', 'uniqueItems', 'minLength', 'maxLength', 'minimum', 'maximum', 'exclusiveMinimum', 'exclusiveMaximum', 'pattern', '$ref', '$defs', 'format', 'default', 'examples']);

const typeOf = (v) => (v === null ? 'null' : Array.isArray(v) ? 'array' : Number.isInteger(v) ? 'integer' : typeof v);
const isType = (v, t) => (t === 'number' ? typeof v === 'number' && Number.isFinite(v) : t === 'integer' ? Number.isInteger(v) : typeOf(v) === t || (t === 'object' && typeOf(v) === 'object'));

export function unsupported(schema, out = new Set()) {
  if (schema && typeof schema === 'object') {
    for (const [k, v] of Object.entries(schema)) {
      if (!SUPPORTED.has(k) && !/^(properties|patternProperties|\$defs)$/.test(k)) out.add(k);
      if (k === 'properties' || k === 'patternProperties' || k === '$defs') Object.values(v).forEach((s) => unsupported(s, out));
      else if (k === 'items' || k === 'additionalProperties') unsupported(v, out);
    }
  }
  return out;
}

/** validate(value, schema) -> array of "path: message" errors (empty when valid). */
export function validate(value, schema, root = schema, path = '$') {
  const errs = [];
  const s = schema.$ref ? resolveRef(schema.$ref, root) : schema;
  const add = (m) => errs.push(`${path}: ${m}`);
  if (s.type !== undefined) {
    const ts = Array.isArray(s.type) ? s.type : [s.type];
    if (!ts.some((t) => isType(value, t))) { add(`expected ${ts.join('|')}, got ${typeOf(value)}`); return errs; }
  }
  if (s.const !== undefined && JSON.stringify(value) !== JSON.stringify(s.const)) add(`must equal ${JSON.stringify(s.const)}`);
  if (s.enum && !s.enum.some((e) => JSON.stringify(e) === JSON.stringify(value))) add(`must be one of ${JSON.stringify(s.enum)}, got ${JSON.stringify(value)}`);
  if (typeof value === 'string') {
    if (s.minLength != null && value.length < s.minLength) add(`shorter than ${s.minLength}`);
    if (s.maxLength != null && value.length > s.maxLength) add(`longer than ${s.maxLength}`);
    if (s.pattern && !new RegExp(s.pattern).test(value)) add(`does not match ${s.pattern}`);
  }
  if (typeof value === 'number') {
    if (s.minimum != null && value < s.minimum) add(`below minimum ${s.minimum}`);
    if (s.maximum != null && value > s.maximum) add(`above maximum ${s.maximum}`);
    if (s.exclusiveMinimum != null && value <= s.exclusiveMinimum) add(`must be above ${s.exclusiveMinimum}`);
    if (s.exclusiveMaximum != null && value >= s.exclusiveMaximum) add(`must be below ${s.exclusiveMaximum}`);
  }
  if (Array.isArray(value)) {
    if (s.minItems != null && value.length < s.minItems) add(`fewer than ${s.minItems} items`);
    if (s.maxItems != null && value.length > s.maxItems) add(`more than ${s.maxItems} items`);
    if (s.uniqueItems && new Set(value.map((v) => JSON.stringify(v))).size !== value.length) add('items are not unique');
    if (s.items) value.forEach((v, i) => errs.push(...validate(v, s.items, root, `${path}[${i}]`)));
  }
  if (typeOf(value) === 'object') {
    for (const r of s.required || []) if (!(r in value)) add(`missing required property "${r}"`);
    const props = s.properties || {}, pats = Object.entries(s.patternProperties || {});
    for (const [k, v] of Object.entries(value)) {
      const pm = pats.filter(([re]) => new RegExp(re).test(k));
      if (k in props) errs.push(...validate(v, props[k], root, `${path}.${k}`));
      pm.forEach(([, sub]) => errs.push(...validate(v, sub, root, `${path}.${k}`)));
      if (!(k in props) && !pm.length) {
        if (s.additionalProperties === false) add(`unexpected property "${k}"`);
        else if (s.additionalProperties && typeof s.additionalProperties === 'object') errs.push(...validate(v, s.additionalProperties, root, `${path}.${k}`));
      }
    }
  }
  return errs;
}

function resolveRef(ref, root) {
  if (!ref.startsWith('#/')) throw new Error('only local $ref supported: ' + ref);
  return ref.slice(2).split('/').reduce((o, k) => o[k], root);
}
