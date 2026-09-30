// Shared helpers for the R1c config generator (gen.mjs), the header-emulating server (emulate.mjs), the prod probe
// (ops/headers-probe.mjs) and tests/t0/headers.spec.mjs: parsers for Netlify's _headers / _redirects / netlify.toml (the subset this
// repo uses), path matching, and the "one rule per header name per URL" invariant checker.
//
// Netlify's real matching/merging semantics are only DOCUMENTED in part (docs.netlify.com, "Custom headers" and "Redirect options"):
//   * `_headers` paths: `*` is a splat (a leading or trailing `*` and mid-path `*` are allowed for headers), `:name` matches one segment.
//   * redirects: first matching rule wins, `!` forces the rule even when a file exists at the path, `*` only at the END of a path, a full
//     URL with scheme in `from` makes the rule host-based.
//   * what happens when TWO header rules set the SAME header name is NOT documented (forum answers conflict; empty values do not unset).
// This module therefore never relies on it: `checkInvariant` proves that no URL is matched by two rules that set the same name, and the
// emulator reports (rather than silently resolves) any overlap.  Final proof of the real semantics needs a real deploy (gbg-staging).
import fs from 'node:fs';

// ---------------------------------------------------------------------------------------------------------------- _headers
/** -> [{path, headers: [[name, value], ...], line}] ; comments (#) and blank lines ignored; indented lines are headers of the last path */
export function parseHeadersFile(text) {
  const rules = [];
  let cur = null;
  text.replace(/\r\n?/g, '\n').split('\n').forEach((raw, i) => {
    if (!raw.trim() || raw.trim().startsWith('#')) return;
    if (/^\s/.test(raw)) {
      if (!cur) throw new Error(`_headers line ${i + 1}: header line before any path`);
      const s = raw.trim(); const c = s.indexOf(':');
      if (c < 1) throw new Error(`_headers line ${i + 1}: expected "Name: value", got ${JSON.stringify(s)}`);
      cur.headers.push([s.slice(0, c).trim(), s.slice(c + 1).trim()]);
    } else {
      cur = { path: raw.trim(), headers: [], line: i + 1 };
      rules.push(cur);
    }
  });
  return rules;
}

// --------------------------------------------------------------------------------------------------------------- _redirects
/** -> [{from, to, status, force, line, scheme?, host?, fromPath}] */
export function parseRedirectsFile(text) {
  const rules = [];
  text.replace(/\r\n?/g, '\n').split('\n').forEach((raw, i) => {
    const s = raw.trim();
    if (!s || s.startsWith('#')) return;
    const t = s.split(/\s+/);
    if (t.length < 2) throw new Error(`_redirects line ${i + 1}: need "from to [status]", got ${JSON.stringify(s)}`);
    let status = 301, force = false;
    const last = t[t.length - 1];
    let args = t;
    if (t.length >= 3 && /^\d{3}!?$/.test(last)) { status = Number(last.replace('!', '')); force = last.endsWith('!'); args = t.slice(0, -1); }
    const [from, to] = args;
    rules.push(withHost({ from, to, status, force, line: i + 1 }));
  });
  return rules;
}
function withHost(r) {
  const m = /^(https?):\/\/([^/]+)(\/.*)?$/i.exec(r.from);
  if (m) { r.scheme = m[1].toLowerCase(); r.host = m[2].toLowerCase(); r.fromPath = m[3] || '/'; } else r.fromPath = r.from;
  return r;
}

// ------------------------------------------------------------------------------------------------- netlify.toml (subset)
/** Minimal TOML reader for the constructs the legacy file uses: [[headers]] (for + [headers.values]), [[redirects]], other tables ignored. */
export function parseNetlifyToml(text) {
  const out = { headers: [], redirects: [], other: [] };
  let table = null, cur = null;
  const unq = (v) => {
    v = v.trim();
    if (v.startsWith('"')) { let s = '', i = 1; for (; i < v.length; i++) { const c = v[i]; if (c === '\\') { s += v[++i]; continue; } if (c === '"') break; s += c; } return s; }
    if (v === 'true') return true; if (v === 'false') return false;
    const n = Number(v.replace(/\s*#.*$/, '')); return Number.isNaN(n) ? v.replace(/\s*#.*$/, '') : n;
  };
  text.replace(/\r\n?/g, '\n').split('\n').forEach((raw) => {
    const s = raw.trim();
    if (!s || s.startsWith('#')) return;
    let m;
    if ((m = /^\[\[([^\]]+)\]\]$/.exec(s))) {
      table = m[1].trim();
      if (table === 'headers') { cur = { path: null, headers: [] }; out.headers.push(cur); }
      else if (table === 'redirects') { cur = { from: null, to: null, status: 301, force: false }; out.redirects.push(cur); }
      else { cur = null; out.other.push(table); }
      return;
    }
    if ((m = /^\[([^\]]+)\]$/.exec(s))) {
      table = m[1].trim();
      if (table !== 'headers.values') { cur = null; out.other.push(table); }       // [headers.values] keeps the current [[headers]] entry
      return;
    }
    if ((m = /^([A-Za-z0-9_.-]+|"[^"]+")\s*=\s*(.*)$/.exec(s))) {
      const key = m[1].replace(/^"|"$/g, ''); const val = unq(m[2]);
      if (table === 'headers' && cur && key === 'for') cur.path = val;
      else if (table === 'headers.values' && cur) cur.headers.push([key, String(val)]);
      else if (table === 'redirects' && cur) { if (key === 'from') cur.from = val; else if (key === 'to') cur.to = val; else if (key === 'status') cur.status = Number(val); else if (key === 'force') cur.force = val === true; }
    }
  });
  out.redirects.forEach(withHost);
  return out;
}

// ---------------------------------------------------------------------------------------------------------------- matching
const reCache = new Map();
/** compile a _headers/_redirects path pattern: `*` -> anything (also across `/`), `:name` -> one segment (no `/`). Case-insensitive. */
export function patternRegExp(pat) {
  if (reCache.has(pat)) return reCache.get(pat);
  let re = '', i = 0; const names = [];
  while (i < pat.length) {
    const c = pat[i];
    if (c === '*') { re += '(.*)'; names.push('splat'); i++; }
    else if (c === ':' && /[A-Za-z_]/.test(pat[i + 1] || '')) { const m = /^:([A-Za-z_][A-Za-z0-9_]*)/.exec(pat.slice(i)); re += '([^/]+)'; names.push(m[1]); i += m[0].length; }
    else { re += c.replace(/[.+?^${}()|[\]\\]/g, '\\$&'); i++; }
  }
  const out = { re: new RegExp(`^${re}$`, 'i'), names };
  reCache.set(pat, out);
  return out;
}
export function matchPath(pat, p) {
  const { re, names } = patternRegExp(pat);
  const m = re.exec(p);
  if (!m) return null;
  const caps = {}; names.forEach((n, i) => { caps[n] = m[i + 1]; });
  return caps;
}

/** every rule of `rules` (from parseHeadersFile) that matches the requested path, in file order */
export const matchingHeaderRules = (rules, p) => rules.filter((r) => matchPath(r.path, p));

/**
 * Resolve the response headers for a requested path.
 *   mode 'last'  later matching rule wins for a repeated name (empty values ignored: Netlify ignores them, verified live for the legacy toml)
 *   mode 'first' earlier wins;  mode 'join' comma-joins distinct values
 * Returns {headers: Map(lower -> {name, value, rules:[path...]}), conflicts: [{name, rules}]}; a conflict is any name set by 2+ rules.
 */
export function resolveHeaders(rules, p, mode = 'last') {
  const headers = new Map(); const seen = new Map();
  for (const r of matchingHeaderRules(rules, p)) {
    for (const [name, value] of r.headers) {
      const k = name.toLowerCase();
      const list = seen.get(k) || seen.set(k, []).get(k);
      list.push({ rule: r.path, value });
      if (value === '') continue;                                   // empty value: no-op on Netlify (cannot unset)
      const prev = headers.get(k);
      if (!prev) headers.set(k, { name, value, rules: [r.path] });
      else if (mode === 'last') { prev.value = value; prev.rules.push(r.path); }
      else if (mode === 'join') { if (!prev.value.split(', ').includes(value)) prev.value += `, ${value}`; prev.rules.push(r.path); }
      else prev.rules.push(r.path);
    }
  }
  const conflicts = [...seen].filter(([, l]) => new Set(l.map((x) => x.rule)).size > 1).map(([k, l]) => ({ name: k, rules: l.map((x) => `${x.rule}=${x.value.slice(0, 60)}`) }));
  return { headers, conflicts };
}

/**
 * The one-rule-per-header-name invariant: for every path in `paths`, no header name (case-insensitive) is produced by two DIFFERENT
 * matching rules.  Also: embed paths (`isEmbed(p)`) must resolve without X-Frame-Options and Content-Security-Policy-Report-Only,
 * every other path in `enumerated` must resolve with X-Frame-Options.  Returns a list of problem strings (empty = ok).
 */
export function checkInvariant(rules, paths, { isEmbed = () => false, enumerated = paths } = {}) {
  const problems = [];
  for (const p of paths) {
    const { headers, conflicts } = resolveHeaders(rules, p, 'last');
    for (const c of conflicts) problems.push(`${p}: header ${c.name} produced by ${c.rules.length} rules (${c.rules.join(' | ')})`);
    if (isEmbed(p)) {
      for (const bad of ['x-frame-options', 'content-security-policy-report-only']) if (headers.has(bad)) problems.push(`${p}: embed path must not carry ${bad}`);
      const csp = headers.get('content-security-policy');
      if (!csp || !/(^|;)\s*frame-ancestors \*(;|$)/.test(csp.value)) problems.push(`${p}: embed path must carry Content-Security-Policy with frame-ancestors *`);
    } else if (enumerated.includes(p) && !headers.has('x-frame-options')) problems.push(`${p}: non-embed path lacks X-Frame-Options`);
  }
  return problems;
}

// ---------------------------------------------------------------------------------------------------------------- redirects
/** substitute :splat and :placeholders in a redirect target */
export function expandTarget(to, caps) {
  return to.replace(/:([A-Za-z_][A-Za-z0-9_]*)/g, (m, n) => (n in caps ? caps[n] : m));
}
/**
 * First matching redirect for (scheme, host, path).  `fileExists` tells whether a file would be served at `path` (non-forced rules do
 * not fire when it does).  Returns {rule, to, status, force} or null.
 */
export function findRedirect(rules, { scheme = 'https', host = '', path: p, fileExists = false }) {
  host = host.toLowerCase().replace(/:\d+$/, '');
  for (const r of rules) {
    if (r.host) { if (r.host !== host || r.scheme !== scheme) continue; }
    const caps = matchPath(r.fromPath, p);
    if (!caps) continue;
    if (fileExists && !r.force) continue;
    return { rule: r, to: expandTarget(r.to, caps), status: r.status, force: r.force };
  }
  return null;
}

// ---------------------------------------------------------------------------------------------------------------- loading
/** read the three config files of a dist directory (any may be missing) */
export function loadDistConfig(dist) {
  const rd = (n) => { try { return fs.readFileSync(`${dist}/${n}`, 'utf8'); } catch { return null; } };
  const h = rd('_headers'), r = rd('_redirects'), t = rd('netlify.toml');
  const toml = t ? parseNetlifyToml(t) : { headers: [], redirects: [], other: [] };
  const headerRules = [...(h ? parseHeadersFile(h) : []), ...toml.headers.filter((x) => x.path).map((x) => ({ ...x, source: 'netlify.toml' }))];
  const redirectRules = [...(r ? parseRedirectsFile(r) : []), ...toml.redirects.filter((x) => x.from).map((x) => ({ ...x, source: 'netlify.toml' }))];
  return { headerRules, redirectRules, sources: { _headers: h !== null, _redirects: r !== null, 'netlify.toml': t !== null }, toml };
}
