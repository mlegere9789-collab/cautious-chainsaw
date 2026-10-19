// tuning/tuning.mjs - design tokens: ONE JSON file (tokens/tokens.json) defines every dial of the engine (id, type, range, default, unit, group, doc, evidence);
// this module holds the live values, validates every change against the definition, notifies subscribers, persists, exports and imports.
//
//   const tuning = createTuning(tokensDoc, { storage });         tokensDoc = the parsed tokens.json
//   tuning.get('layout.dMaxPx')                                  throws on an unknown id (a typo can never read as undefined)
//   tuning.set('layout.dMaxPx', 40)                              throws on an invalid value (wrong type, out of range, not an option)
//   tuning.on('layout.dMaxPx', (value, id, old) => ...)          also tuning.on('layout.*', fn) and tuning.on('*', fn); returns the unsubscribe
//   tuning.export() / tuning.import(obj)                         { format, tokens }  <->  values; import reports applied / rejected / unknown, never throws on bad data
//   tuning.schema()                                              the JSON Schema of an exported settings object (tokens/tokens.schema.json is generated from it)
//
// A module never hard-codes a number that a designer may want to change: it reads a token.  test/tuning.test.mjs scans src/ and fails when a token is read
// that tokens.json does not define, or defined and read nowhere.
import { validate } from './schema.mjs';

export const SETTINGS_FORMAT = 'gtanim-settings/1';
export const TOKENS_FORMAT = 'gtanim-tokens/1';
const TYPES = new Set(['number', 'boolean', 'select', 'registry']);
const ID_RE = /^[a-z][a-zA-Z0-9]*(?:\.[a-zA-Z][a-zA-Z0-9]*)+$/;
const EVIDENCE = new Set(['Documented', 'Measured', 'Computed', 'Modelled', 'Contested', 'Unknown', 'Design']);

/** structural check of tokens.json; returns a list of problems (empty = fine) */
export function validateDefs(doc) {
  const errs = [];
  if (!doc || doc.format !== TOKENS_FORMAT) errs.push(`format must be ${TOKENS_FORMAT}`);
  const groups = new Set((doc.groups || []).map((g) => g.id));
  if (groups.size !== (doc.groups || []).length) errs.push('duplicate group id');
  const seen = new Set();
  for (const t of doc.tokens || []) {
    const w = `token ${t.id}`;
    if (!ID_RE.test(t.id || '')) errs.push(`${w}: bad id`);
    if (seen.has(t.id)) errs.push(`${w}: duplicate id`); seen.add(t.id);
    if (!TYPES.has(t.type)) { errs.push(`${w}: unknown type ${t.type}`); continue; }
    if (!groups.has(t.group)) errs.push(`${w}: unknown group ${t.group}`);
    if (!t.label || !t.doc) errs.push(`${w}: label and doc are required`);
    if (t.evidence && !EVIDENCE.has(t.evidence)) errs.push(`${w}: evidence must be one of ${[...EVIDENCE].join('/')}`);
    if (t.type === 'number') {
      if (![t.min, t.max, t.step, t.default].every(Number.isFinite)) errs.push(`${w}: number needs finite min, max, step, default`);
      else { if (!(t.min <= t.default && t.default <= t.max)) errs.push(`${w}: default outside [min, max]`); if (!(t.step > 0)) errs.push(`${w}: step must be > 0`); if (!(t.min < t.max)) errs.push(`${w}: min must be < max`); }
    } else if (t.type === 'boolean') { if (typeof t.default !== 'boolean') errs.push(`${w}: boolean default`); }
    else if (t.type === 'select') {
      if (!Array.isArray(t.options) || t.options.length < 2 || !t.options.every((o) => typeof o.value === 'string' && o.label)) errs.push(`${w}: select needs options [{value,label}] (at least 2)`);
      else if (!t.options.some((o) => o.value === t.default)) errs.push(`${w}: default is not an option`);
    } else if (t.type === 'registry') { if (typeof t.default !== 'string' || !t.registry) errs.push(`${w}: registry token needs a string default and a registry name`); }
  }
  return errs;
}

/** check one value against one definition; returns an error string or null */
export function checkValue(def, v) {
  switch (def.type) {
    case 'number': if (typeof v !== 'number' || !Number.isFinite(v)) return `${def.id}: expected a finite number`; if (v < def.min || v > def.max) return `${def.id}: ${v} is outside [${def.min}, ${def.max}]`; return null;
    case 'boolean': return typeof v === 'boolean' ? null : `${def.id}: expected true or false`;
    case 'select': return def.options.some((o) => o.value === v) ? null : `${def.id}: ${JSON.stringify(v)} is not one of ${def.options.map((o) => o.value).join(', ')}`;
    case 'registry': return typeof v === 'string' && v.length > 0 ? null : `${def.id}: expected a module id`;
    default: return `${def.id}: unknown type`;
  }
}

/** the JSON Schema of an exported settings object, generated from the token definitions */
export function settingsSchema(doc) {
  const props = {};
  for (const t of doc.tokens) {
    const p = { description: t.doc, 'x-token': t.group };
    if (t.type === 'number') Object.assign(p, { type: 'number', minimum: t.min, maximum: t.max, default: t.default });
    else if (t.type === 'boolean') Object.assign(p, { type: 'boolean', default: t.default });
    else if (t.type === 'select') Object.assign(p, { type: 'string', enum: t.options.map((o) => o.value), default: t.default });
    else Object.assign(p, { type: 'string', default: t.default });
    props[t.id] = p;
  }
  return {
    $id: SETTINGS_FORMAT, title: 'ANIM settings', type: 'object', additionalProperties: false, required: ['format', 'tokens'],
    properties: { format: { const: SETTINGS_FORMAT }, tokens: { type: 'object', additionalProperties: false, properties: props } },
  };
}

export function createTuning(doc, { storage = null, storageKey = 'gtanim.settings.v1' } = {}) {
  const problems = validateDefs(doc);
  if (problems.length) throw new Error('tokens.json is invalid:\n  ' + problems.join('\n  '));
  const defs = new Map(doc.tokens.map((t) => [t.id, t]));
  const values = new Map(doc.tokens.map((t) => [t.id, t.default]));
  const subs = [];                                   // [{ pattern, fn }]
  const def = (id) => { const d = defs.get(id); if (!d) throw new Error(`unknown token "${id}"`); return d; };
  const matches = (pattern, id) => pattern === '*' || pattern === id || (pattern.endsWith('.*') && id.startsWith(pattern.slice(0, -1)));
  const emit = (id, v, old) => { for (const s of subs.slice()) if (matches(s.pattern, id)) s.fn(v, id, old); };

  const api = {
    doc, defs,
    get(id) { def(id); return values.get(id); },
    set(id, v, { silent = false } = {}) {
      const d = def(id); const err = checkValue(d, v); if (err) throw new RangeError(err);
      const old = values.get(id); if (old === v) return false;
      values.set(id, v); if (!silent) { emit(id, v, old); api._persist(); } return true;
    },
    reset(id) {
      const ids = id ? [id] : [...defs.keys()]; let n = 0;
      for (const i of ids) { const d = def(i); const old = values.get(i); if (old !== d.default) { values.set(i, d.default); emit(i, d.default, old); n++; } }
      if (n) api._persist(); return n;
    },
    on(pattern, fn) { const s = { pattern, fn }; subs.push(s); return () => { const i = subs.indexOf(s); if (i >= 0) subs.splice(i, 1); }; },
    values() { return Object.fromEntries(values); },
    /** only the tokens that differ from their default */
    diff() { const o = {}; for (const [id, v] of values) if (v !== defs.get(id).default) o[id] = v; return o; },
    export() { return { format: SETTINGS_FORMAT, tokens: Object.fromEntries(values) }; },
    /** apply an exported object (or a bare {id: value} map).  Never throws on bad data: every problem is reported. */
    import(obj) {
      const res = { applied: [], rejected: [], unknown: [] };
      const map = obj && obj.tokens && typeof obj.tokens === 'object' ? obj.tokens : (obj && typeof obj === 'object' ? obj : null);
      if (!map) { res.rejected.push({ id: '(root)', reason: 'not an object' }); return res; }
      if (obj.format !== undefined && obj.format !== SETTINGS_FORMAT) { res.rejected.push({ id: '(format)', reason: `expected ${SETTINGS_FORMAT}` }); return res; }
      for (const [id, v] of Object.entries(map)) {
        const d = defs.get(id); if (!d) { res.unknown.push(id); continue; }
        const err = checkValue(d, v); if (err) { res.rejected.push({ id, reason: err }); continue; }
        if (api.set(id, v, { silent: true })) { res.applied.push(id); }
      }
      for (const id of res.applied) emit(id, values.get(id), undefined);
      if (res.applied.length) api._persist();
      return res;
    },
    schema() { return settingsSchema(doc); },
    validateSettings(obj) { return validate(settingsSchema(doc), obj); },
    groups() { return doc.groups.map((g) => ({ ...g, tokens: doc.tokens.filter((t) => t.group === g.id) })); },
    /** load saved settings (localStorage is optional and may throw: private windows, blocked storage) */
    load() { try { const s = storage && storage.getItem(storageKey); if (s) return api.import(JSON.parse(s)); } catch { /* storage unavailable or corrupt: defaults stay */ } return null; },
    _persist() { try { if (storage) storage.setItem(storageKey, JSON.stringify({ format: SETTINGS_FORMAT, tokens: api.diff() })); } catch { /* ignore */ } },
  };
  return api;
}

/** a module's read-only view of the tuning: tok('layout.dMaxPx') */
export const reader = (tuning) => (id) => tuning.get(id);
