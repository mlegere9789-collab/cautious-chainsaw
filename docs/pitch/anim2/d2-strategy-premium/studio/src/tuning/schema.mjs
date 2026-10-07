// tuning/schema.mjs - a tiny JSON-Schema subset validator (no dependencies, runs in node and in the browser).
// Supported keywords: type (string or list), enum, const, minimum, maximum, properties, required, additionalProperties (false or a schema), items.
// That is everything the generated settings schema uses; anything else in a schema is ignored (and listed by unsupportedKeywords so a test can fail).

const SUPPORTED = new Set(['type', 'enum', 'const', 'minimum', 'maximum', 'properties', 'required', 'additionalProperties', 'items', 'title', 'description', '$id', 'default', 'x-token']);

const typeOf = (v) => (v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v === 'number' ? (Number.isInteger(v) ? 'integer' : 'number') : typeof v);
const typeOk = (want, v) => { const t = typeOf(v); return want === t || (want === 'number' && t === 'integer'); };

/** returns a list of error strings (empty = valid) */
export function validate(schema, value, path = '$') {
  const errs = [];
  if (schema.const !== undefined && value !== schema.const) errs.push(`${path}: must equal ${JSON.stringify(schema.const)}`);
  if (schema.type) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!types.some((t) => typeOk(t, value))) { errs.push(`${path}: expected ${types.join('|')}, got ${typeOf(value)}`); return errs; }
  }
  if (schema.enum && !schema.enum.includes(value)) errs.push(`${path}: ${JSON.stringify(value)} is not one of ${schema.enum.map((x) => JSON.stringify(x)).join(', ')}`);
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) errs.push(`${path}: not a finite number`);
    if (schema.minimum !== undefined && value < schema.minimum) errs.push(`${path}: ${value} is below the minimum ${schema.minimum}`);
    if (schema.maximum !== undefined && value > schema.maximum) errs.push(`${path}: ${value} is above the maximum ${schema.maximum}`);
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const k of schema.required || []) if (!(k in value)) errs.push(`${path}: missing required property "${k}"`);
    const props = schema.properties || {};
    for (const [k, v] of Object.entries(value)) {
      if (props[k]) errs.push(...validate(props[k], v, `${path}.${k}`));
      else if (schema.additionalProperties === false) errs.push(`${path}: unknown property "${k}"`);
      else if (schema.additionalProperties && typeof schema.additionalProperties === 'object') errs.push(...validate(schema.additionalProperties, v, `${path}.${k}`));
    }
  }
  if (Array.isArray(value) && schema.items) value.forEach((v, i) => errs.push(...validate(schema.items, v, `${path}[${i}]`)));
  return errs;
}

/** keywords used in a schema that validate() does not implement (a test asserts this is empty for the generated schema) */
export function unsupportedKeywords(schema, path = '$', out = []) {
  if (!schema || typeof schema !== 'object') return out;
  for (const k of Object.keys(schema)) if (!SUPPORTED.has(k)) out.push(`${path}.${k}`);
  for (const [k, v] of Object.entries(schema.properties || {})) unsupportedKeywords(v, `${path}.${k}`, out);
  if (schema.items) unsupportedKeywords(schema.items, `${path}[]`, out);
  if (schema.additionalProperties && typeof schema.additionalProperties === 'object') unsupportedKeywords(schema.additionalProperties, `${path}.*`, out);
  return out;
}
