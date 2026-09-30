// guard.js - input guard and scope gate (runs before any retrieval).
//   * sanitise: strip markup and control characters, cap at 300 characters (the corpus is untrusted; the query is too)
//   * scope table from facts.scope: medical / finance / creative / code / visit planning / weather / adjacent topics / causes of the war / prompt injection
import { baseNorm } from './text.js';

export const MAX_QUERY = 300;

export function sanitize(raw) {
  let s = String(raw == null ? '' : raw);
  const hadMarkup = /<[^>]*>/.test(s);
  s = s.replace(/<[^>]*>/g, ' ').replace(/&(?:lt|gt|amp|quot|#\d+);/g, ' ').replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim();
  const truncated = s.length > MAX_QUERY;
  if (truncated) s = s.slice(0, MAX_QUERY).replace(/\s+\S*$/, '');
  return { text: s, hadMarkup, truncated };
}

let compiled = null;
function compile(scope) {
  if (compiled && compiled.src === scope) return compiled.rules;
  const rules = scope.map((r) => ({ ...r, res: r.re.map((x) => new RegExp(x, 'i')) }));
  compiled = { src: scope, rules };
  return rules;
}

/** Returns null when the query is in scope, else {id, mode, text, pointer}. Matches against both the raw and the normalised query. */
export function scopeGate(text, scope) {
  const norm = baseNorm(text);
  const lower = text.toLowerCase();
  for (const r of compile(scope)) {
    if (r.res.some((re) => re.test(norm) || re.test(lower))) return { id: r.id, mode: r.mode, text: r.text, pointer: r.pointer || null };
  }
  return null;
}
