// tools/accept/lib/static_parse.mjs - static parsers for check 2: HTML structure, CSS balance, JS (acorn), JSON, reference extraction.
import path from 'node:path';
import { createRequire } from 'node:module';
import { REPO } from './util.mjs';

const require = createRequire(import.meta.url);
export const acorn = require(path.join(REPO, 'node_modules', 'acorn'));

export const SITE_ORIGIN = 'https://gettysburginteractivemap.com';
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr', 'command', 'keygen', 'frame']);
const OPTIONAL_END = new Set(['li', 'p', 'dt', 'dd', 'tr', 'td', 'th', 'thead', 'tbody', 'tfoot', 'option', 'optgroup', 'colgroup', 'caption', 'rt', 'rp', 'body', 'html', 'head']);
const RAW_TEXT = new Set(['script', 'style', 'textarea', 'title']);
const CLOSES_P = new Set(['address', 'article', 'aside', 'blockquote', 'details', 'div', 'dl', 'fieldset', 'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hgroup', 'hr', 'main', 'menu', 'nav', 'ol', 'p', 'pre', 'section', 'table', 'ul']);

const lineOf = (text, i) => text.slice(0, i).split('\n').length;

export function lintHtml(text) {
  const issues = [];
  const add = (code, line, detail) => issues.push({ code, line, detail });
  if (!/^\s*<!doctype html/i.test(text)) add('html-no-doctype', 1, 'missing <!DOCTYPE html>');
  const stack = []; const ids = new Map();
  const re = /<!--([\s\S]*?)(?:-->|$)|<!doctype[^>]*>|<\/([a-zA-Z][\w:-]*)\s*>|<([a-zA-Z][\w:-]*)((?:"[^"]*"|'[^']*'|[^'">])*)(\/?)>/gi;
  let m; let last = 0;
  const attrsOf = (s) => { const o = []; for (const a of s.matchAll(/([^\s"'<>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g)) o.push([a[1].toLowerCase(), a[2] ?? a[3] ?? a[4] ?? '']); return o; };
  while ((m = re.exec(text))) {
    if (m[0].startsWith('<!--')) { if (!m[0].endsWith('-->')) add('html-unterminated-comment', lineOf(text, m.index), 'comment never closed'); continue; }
    if (m[0].toLowerCase().startsWith('<!doctype')) continue;
    if (m[2]) {
      const t = m[2].toLowerCase();
      let k = stack.length - 1; while (k >= 0 && stack[k].tag !== t) k--;
      if (k < 0) { add('html-stray-close-tag', lineOf(text, m.index), `</${t}> has no open <${t}>`); continue; }
      for (let j = stack.length - 1; j > k; j--) if (!OPTIONAL_END.has(stack[j].tag)) add('html-unclosed-tag', stack[j].line, `<${stack[j].tag}> opened on line ${stack[j].line} is not closed before </${t}> on line ${lineOf(text, m.index)}`);
      stack.length = k; continue;
    }
    const t = m[3].toLowerCase(); const line = lineOf(text, m.index); const attrs = attrsOf(m[4] || '');
    const seen = new Set();
    for (const [n, v] of attrs) {
      if (seen.has(n)) add('html-duplicate-attribute', line, `<${t}> repeats attribute ${n}`); seen.add(n);
      if (n === 'id') { if (ids.has(v)) add('html-duplicate-id', line, `id="${v}" also on line ${ids.get(v)}`); else ids.set(v, line); }
    }
    if (VOID.has(t) || m[5]) { if (!VOID.has(t) && m[5] && !/^(svg|path|circle|rect|line|polyline|polygon|ellipse|g|use|stop|defs|symbol|image|text|tspan|feGaussianBlur|feOffset|feBlend|animate|set|mask|clipPath|filter|linearGradient|radialGradient|pattern|marker)$/i.test(t) && !stack.some((s) => s.tag === 'svg')) add('html-self-closing-non-void', line, `<${t}/> self-closed outside svg`); }
    else {
      // implied end tags
      const top = stack[stack.length - 1];
      if (top) {
        if (top.tag === 'p' && CLOSES_P.has(t)) stack.pop();
        else if (top.tag === 'li' && t === 'li') stack.pop();
        else if ((top.tag === 'dt' || top.tag === 'dd') && (t === 'dt' || t === 'dd')) stack.pop();
        else if ((top.tag === 'td' || top.tag === 'th') && (t === 'td' || t === 'th' || t === 'tr')) { stack.pop(); if (t === 'tr' && stack.length && stack[stack.length - 1].tag === 'tr') stack.pop(); }
        else if (top.tag === 'tr' && t === 'tr') stack.pop();
        else if (top.tag === 'option' && (t === 'option' || t === 'optgroup')) stack.pop();
      }
      stack.push({ tag: t, line });
      if (RAW_TEXT.has(t)) {
        const close = new RegExp(`</${t}\\s*>`, 'i'); close.lastIndex = 0;
        const rest = text.slice(re.lastIndex); const cm = close.exec(rest);
        if (!cm) { add('html-unclosed-tag', line, `<${t}> never closed`); stack.pop(); }
        else { re.lastIndex += cm.index; }
      }
    }
    last = re.lastIndex;
  }
  for (const s of stack) if (!OPTIONAL_END.has(s.tag)) add('html-unclosed-tag', s.line, `<${s.tag}> opened on line ${s.line} is never closed`);
  if (!/<html\b[^>]*\blang\s*=\s*["']?[a-z]/i.test(text)) add('html-no-lang', 1, '<html> has no lang attribute');
  if (!/<title\b[^>]*>\s*\S/i.test(text)) add('html-no-title', 1, 'missing or empty <title>');
  if (!/<meta\b[^>]*name\s*=\s*["']viewport["']/i.test(text)) add('html-no-viewport', 1, 'missing <meta name="viewport">');
  return { issues, ids };
}

export function lintCss(text, label = '') {
  const issues = []; const add = (code, detail) => issues.push({ code, detail: `${label} ${detail}`.trim() });
  let depth = 0, paren = 0, bracket = 0, i = 0; const n = text.length; let line = 1;
  while (i < n) {
    const c = text[i];
    if (c === '\n') line++;
    if (c === '/' && text[i + 1] === '*') { const e = text.indexOf('*/', i + 2); if (e < 0) { add('css-unterminated-comment', `comment opened on line ${line} never closes`); break; } line += (text.slice(i, e).match(/\n/g) || []).length; i = e + 2; continue; }
    if (c === '"' || c === "'") { let j = i + 1; while (j < n && text[j] !== c) { if (text[j] === '\\') j++; if (text[j] === '\n') { add('css-unterminated-string', `string opened on line ${line} breaks at a newline`); break; } j++; } i = j + 1; continue; }
    if (c === '\\') { i += 2; continue; }
    if (c === '{') depth++; else if (c === '}') { depth--; if (depth < 0) { add('css-unbalanced-brace', `stray } on line ${line}`); depth = 0; } }
    else if (c === '(') paren++; else if (c === ')') { paren--; if (paren < 0) { add('css-unbalanced-paren', `stray ) on line ${line}`); paren = 0; } }
    else if (c === '[') bracket++; else if (c === ']') { bracket--; if (bracket < 0) { add('css-unbalanced-bracket', `stray ] on line ${line}`); bracket = 0; } }
    i++;
  }
  if (depth !== 0) add('css-unbalanced-brace', `${depth} unclosed {`);
  if (paren !== 0) add('css-unbalanced-paren', `${paren} unclosed (`);
  if (bracket !== 0) add('css-unbalanced-bracket', `${bracket} unclosed [`);
  return issues;
}

export function parseJs(src) {
  for (const sourceType of ['module', 'script']) {
    try { acorn.parse(src, { ecmaVersion: 'latest', sourceType, allowHashBang: true, allowAwaitOutsideFunction: sourceType === 'module' }); return { ok: true, sourceType }; }
    catch (e) { if (sourceType === 'script') return { ok: false, error: `${e.message}` }; }
  }
}
export function inlineScripts(html) {
  const out = [];
  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
    const attrs = m[1]; if (/\bsrc\s*=/.test(attrs) && !m[2].trim()) continue;
    const type = (/\btype\s*=\s*["']?([^\s"'>]+)/i.exec(attrs) || [])[1] || 'text/javascript';
    out.push({ type, body: m[2], line: lineOf(html, m.index) });
  }
  return out;
}
export function inlineStyles(html) { return [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi)].map((m) => ({ body: m[1], line: lineOf(html, m.index) })); }

// ------------------------------------------------------------------ references
export function resolveRef(u, fromPath) {
  if (u == null) return null; u = String(u).trim();
  if (!u || /^(mailto:|tel:|javascript:|data:|blob:|sms:|#$)/i.test(u)) return null;
  let url;
  try { url = new URL(u, `http://h${fromPath}`); } catch { return null; }
  if (url.host !== 'h') {
    if (url.origin === SITE_ORIGIN || url.origin === SITE_ORIGIN.replace('https', 'http')) { return { path: decodeURIComponent(url.pathname), hash: url.hash.slice(1), search: url.search, own: true, abs: u }; }
    return { external: true, abs: url.href, protocol: url.protocol };
  }
  return { path: decodeURIComponent(url.pathname), hash: url.hash.slice(1), search: url.search };
}

export function htmlRefs(html, fromPath) {
  const refs = [];
  const add = (u, kind, line) => { const r = resolveRef(u, fromPath); if (r) refs.push({ from: fromPath, kind, line, ...r }); };
  const stripped = html.replace(/<!--[\s\S]*?-->/g, (c) => c.replace(/[^\n]/g, ' ')).replace(/(<script\b[^>]*>)([\s\S]*?)(<\/script\s*>)/gi, (_, a, b, c) => a + b.replace(/[^\n]/g, ' ') + c);
  for (const m of stripped.matchAll(/<(script|link|img|source|iframe|video|audio|embed|object|a|area|form|track|input)\b((?:"[^"]*"|'[^']*'|[^'">])*)>/gi)) {
    const tag = m[1].toLowerCase(), attrs = m[2]; const line = lineOf(stripped, m.index);
    const g = (n) => { const x = new RegExp(`(?:^|\\s)${n}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i').exec(attrs); return x ? (x[1] ?? x[2] ?? x[3]) : null; };
    if (tag === 'link') { const rel = (g('rel') || '').toLowerCase(); if (g('href')) add(g('href'), `link:${rel || '?'}`, line); }
    else if (tag === 'a' || tag === 'area') { if (g('href') != null) add(g('href'), 'a', line); }
    else if (tag === 'form') { if (g('action')) add(g('action'), 'form', line); }
    else if (tag === 'object') { if (g('data')) add(g('data'), 'object', line); }
    else if (tag === 'input') { if (/image/i.test(g('type') || '') && g('src')) add(g('src'), 'input-image', line); }
    else { if (g('src')) add(g('src'), tag, line); if (g('poster')) add(g('poster'), 'poster', line); }
    for (const a of ['srcset', 'imagesrcset']) { const ss = g(a); if (ss) for (const part of ss.split(',')) add(part.trim().split(/\s+/)[0], 'srcset', line); }
  }
  for (const m of stripped.matchAll(/<meta\b[^>]*>/gi)) {
    const t = m[0]; const prop = (/\b(?:property|name)\s*=\s*["']([^"']+)["']/i.exec(t) || [])[1] || '';
    const c = (/\bcontent\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(t) || []); const content = c[1] ?? c[2];
    if (/^(og:image|twitter:image|og:image:url|og:image:secure_url|og:url|og:video|og:audio)$/i.test(prop) && content) add(content, `meta:${prop}`, lineOf(stripped, m.index));
  }
  for (const m of stripped.matchAll(/url\(\s*(?:"([^"]+)"|'([^']+)'|([^)\s]+))\s*\)/gi)) add(m[1] ?? m[2] ?? m[3], 'css-url', lineOf(stripped, m.index));
  return refs;
}
export function cssRefs(txt, fromPath) {
  const refs = [];
  for (const m of txt.matchAll(/url\(\s*(?:"([^"]+)"|'([^']+)'|([^)\s]+))\s*\)/gi)) { const r = resolveRef(m[1] ?? m[2] ?? m[3], fromPath); if (r) refs.push({ from: fromPath, kind: 'css-url', ...r }); }
  for (const m of txt.matchAll(/@import\s+(?:url\()?\s*["']([^"']+)["']/gi)) { const r = resolveRef(m[1], fromPath); if (r) refs.push({ from: fromPath, kind: 'css-import', ...r }); }
  return refs;
}
const LIT_EXT = 'html|json|js|mjs|css|png|jpe?g|webp|svg|ico|pdf|txt|xml|webmanifest|mp3|wav|wasm|woff2?|gif|avif|mp4|webm';
/** string literals of a JS file that name a same-site file; template strings with ${} are counted as `dynamic` (cannot be resolved statically) */
export function jsRefs(src, fromPath) {
  const refs = []; let dynamic = 0; const seen = new Set();
  const add = (p, kind) => { const k = `${kind}:${p}`; if (seen.has(k)) return; seen.add(k); const r = resolveRef(p, fromPath); if (r) refs.push({ from: fromPath, kind, ...r }); };
  const lit = new RegExp(`^(?:/|\\./|\\.\\./)(?:[A-Za-z0-9_.~@-]+/)*[A-Za-z0-9_.~@-]+\\.(?:${LIT_EXT})(?:[?#][^\\s]*)?$`);
  try {
    for (const t of acorn.tokenizer(src, { ecmaVersion: 'latest', sourceType: 'module', allowHashBang: true })) {
      if (t.type.label === 'string') {
        const v = String(t.value);
        if (lit.test(v)) add(v, 'js-string');
        else if (/^\/(assets|data|icons|og|screenshots|hx)\/[A-Za-z0-9_.~/@-]+$/.test(v) && /\.[a-z0-9]{2,5}$/i.test(v)) add(v, 'js-string');
        else if (fromPath.startsWith('/assets/') && /^\.\/[A-Za-z0-9._-]+\.(?:m?js|css)$/.test(v)) add(v.replace(/^\./, '/assets'), 'js-relative-import');
      } else if (t.type.label === 'template' && /\/(assets|data|icons|og|screenshots)\/[^`]*$/.test(String(t.value)) && src.slice(t.end, t.end + 2) === '${') dynamic++;
    }
  } catch { /* parse failures are reported by the parser check */ }
  return { refs, dynamic };
}
export const manifestRefs = (txt, fromPath) => {
  const refs = []; let j; try { j = JSON.parse(txt); } catch { return refs; }
  const add = (u, kind) => { const r = resolveRef(u, fromPath); if (r) refs.push({ from: fromPath, kind, ...r }); };
  for (const it of [...(j.icons || []), ...(j.screenshots || [])]) if (it.src) add(it.src, 'manifest-icon');
  for (const s of j.shortcuts || []) { if (s.url) add(s.url, 'manifest-shortcut'); for (const ic of s.icons || []) if (ic.src) add(ic.src, 'manifest-icon'); }
  if (j.start_url) add(j.start_url, 'manifest-start'); if (j.scope) add(j.scope, 'manifest-scope');
  return refs;
};
export const sitemapRefs = (txt, fromPath) => [...txt.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => ({ from: fromPath, kind: 'sitemap-loc', ...resolveRef(m[1], fromPath) })).filter((r) => r.path || r.external);
export const robotsRefs = (txt, fromPath) => [...txt.matchAll(/^\s*Sitemap:\s*(\S+)/gim)].map((m) => ({ from: fromPath, kind: 'robots-sitemap', ...resolveRef(m[1], fromPath) })).filter((r) => r.path || r.external);

/** insecure http:// resource URLs (namespace and identifier URLs are not resources) */
const EXEMPT_HTTP = /^http:\/\/(www\.w3\.org|schema\.org|www\.sitemaps\.org|localhost|127\.0\.0\.1|\[::1\]|ns\.adobe\.com|purl\.org|xmlns\.com|www\.opengis\.net|json-schema\.org|example\.(com|org))\b/i;
export function insecureUrls(text) {
  const out = [];
  for (const m of text.matchAll(/http:\/\/[^\s"'<>)\\]+/gi)) if (!EXEMPT_HTTP.test(m[0])) out.push({ url: m[0], line: lineOf(text, m.index) });
  return out;
}
