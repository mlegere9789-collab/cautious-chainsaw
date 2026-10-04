// Turns files into the user-facing strings copy_lint judges. Dependency-free.
//
//   extractFile(relPath, source, config) -> { items: Item[], directives: Directive[] }
//
// Item = { kind, text, offset, line, where, quoted, ignore:Set<string> }
//   kind: 'html-text' | 'html-attr' | 'html-link' | 'html-title' | 'js-string' | 'json' | 'json-ld' | 'text'
//   text: decoded, whitespace-normalised, what a visitor would read (or hear: alt and aria-label count)
//   where: attribute name, JSON path or '' (for the report)
// Directive = { from, to, rules:'*'|string[] }   copy-lint-disable ... copy-lint-enable regions (offsets into the source)
import { scanJsStrings, buildLineIndex } from './jsstrings.mjs';

const NAMED = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“',
  mdash: '—', ndash: '–', hellip: '…', middot: '·', bull: '•', laquo: '«', raquo: '»', larr: '←',
  rarr: '→', uarr: '↑', darr: '↓', copy: '©', reg: '®', trade: '™', times: '×', deg: '°',
  frac12: '½', minus: '−', thinsp: ' ', ensp: ' ', emsp: ' ', shy: '­', check: '✓', rsaquo: '›', lsaquo: '‹',
  sect: '§', para: '¶', plusmn: '±', eacute: 'é', egrave: 'è', ccedil: 'ç', ntilde: 'ñ', uuml: 'ü', ouml: 'ö',
};

export function decodeEntities(s) {
  if (!s.includes('&')) return s;
  return s.replace(/&(#x[0-9a-fA-F]+|#[0-9]+|[A-Za-z][A-Za-z0-9]*);/g, (m, g) => {
    if (g[0] === '#') {
      const cp = g[1] === 'x' || g[1] === 'X' ? parseInt(g.slice(2), 16) : parseInt(g.slice(1), 10);
      try { return String.fromCodePoint(cp); } catch { return m; }
    }
    return Object.prototype.hasOwnProperty.call(NAMED, g) ? NAMED[g] : m;
  });
}

export const normalizeWs = (s) => s.replace(/[ \t\r\n\f]+/g, ' ').trim();

/** Strip tags from a string that holds HTML markup (innerHTML templates in scripts) and decode entities. */
export function htmlToText(s) {
  let t = s;
  if (t.includes('<')) t = t.replace(/<(script|style)\b[\s\S]*?<\/\1\s*>/gi, ' ').replace(/<[^>]*>/g, (m) => (/^<\/?(?:a|abbr|b|bdi|bdo|cite|data|dfn|em|i|mark|q|s|small|span|strong|sub|sup|time|u|wbr)\b/i.test(m) ? '' : ' '));
  return normalizeWs(decodeEntities(t));
}

const INLINE = new Set(['a', 'abbr', 'b', 'bdi', 'bdo', 'big', 'cite', 'data', 'dfn', 'em', 'i', 'mark', 'q', 's', 'small', 'span', 'strong', 'sub', 'sup', 'time', 'u', 'wbr', 'label', 'font']);
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
const SKIP_TEXT = new Set(['code', 'pre', 'kbd', 'samp', 'var', 'style', 'svg', 'math']);
const QUOTE_TAGS = new Set(['blockquote', 'q']);
const TEXT_ATTRS = ['title', 'alt', 'aria-label', 'aria-description', 'placeholder', 'aria-placeholder', 'aria-roledescription'];

/** copy-lint-disable / copy-lint-enable regions. `rules` is '*' when none are named. */
export function parseDirectives(src) {
  const out = [];
  const open = new Map(); // rule|'*' -> from
  const re = /copy-lint-(disable|enable)([ \t]+[A-Z][A-Z0-9_, \t]*)?/g;
  let m;
  while ((m = re.exec(src))) {
    const names = m[2] ? m[2].split(/[ ,\t]+/).filter((x) => /^[A-Z][A-Z0-9_]*$/.test(x)) : [];
    const keys = names.length ? names : ['*'];
    for (const k of keys) {
      if (m[1] === 'disable') { if (!open.has(k)) open.set(k, m.index); } else if (open.has(k)) { out.push({ from: open.get(k), to: m.index, rules: k === '*' ? '*' : [k] }); open.delete(k); }
    }
  }
  for (const [k, from] of open) out.push({ from, to: src.length, rules: k === '*' ? '*' : [k] });
  return out;
}

const isUserFacingString = (v) => {
  const s = v.trim();
  if (s.length < 4) return false;
  // two words, or a capitalised word on its own or before a number ("Tick 538", "Union"); a lone lower-case token is a key or a class
  if (!/[A-Za-zÀ-ɏ]{2,}\s+[A-Za-zÀ-ɏ]{2,}/.test(s) && !/^[A-Z][a-zÀ-ɏ]{3,}(?:\s*[\d/:]+\s*)?$/.test(s)) return false;
  if (/^(?:https?:|data:|\/|\.|#|blob:|[A-Za-z]:\\)/.test(s)) return false;
  if (/=>|function\s*\(|[{};]\s*$|\breturn\b.*;|\bconst\s|\bvar\s|\blet\s/.test(s) && /[{};]/.test(s)) return false;
  // CSS declarations and selectors
  if (/^[\w-]+\s*:\s*[^;]+;/.test(s) || /[\w-]+\s*:\s*(?:[-\d.]+(?:px|em|rem|%|s|ms|deg)|#[0-9a-f]{3,8}|rgba?\(|var\(|none|auto|inherit|flex|block|absolute|relative|fixed)\b/i.test(s)) return false;
  // class lists and ids: lowercase tokens with hyphens/underscores/digits
  const toks = s.split(/\s+/);
  if (toks.length >= 2 && toks.every((t) => /^[a-z][a-z0-9_:-]*$/.test(t)) && toks.some((t) => /[-_:\d]/.test(t))) return false;
  // mostly letters
  const letters = (s.match(/[A-Za-z]/g) || []).length;
  return letters / s.length > 0.3;
};
export { isUserFacingString };

function attrsOf(tagText) {
  // tagText: everything between '<' and '>' (without them). Returns [{name, value, offset}] offsets relative to tagText
  const out = [];
  const re = /([^\s"'<>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  const nameEnd = tagText.search(/[\s\/]/);
  re.lastIndex = nameEnd < 0 ? tagText.length : nameEnd;
  let m;
  while ((m = re.exec(tagText))) {
    const name = m[1].toLowerCase();
    const value = m[2] ?? m[3] ?? m[4] ?? '';
    const valueOffset = m.index + m[0].length - value.length - (m[2] !== undefined || m[3] !== undefined ? 1 : 0);
    out.push({ name, value, offset: valueOffset });
  }
  return out;
}

export function extractHtml(src, config = {}) {
  const items = [];
  const lineOf = buildLineIndex(src);
  const n = src.length;
  const stack = []; // {tag, skip, quoted, ignore:Set}
  let run = null; // {parts:[], offset, quoted, ignore}

  const curFlags = () => {
    let skip = false; let quoted = false; const ignore = new Set();
    for (const e of stack) { if (e.skip) skip = true; if (e.quoted) quoted = true; for (const r of e.ignore) ignore.add(r); }
    return { skip, quoted, ignore };
  };
  const flush = () => {
    if (!run) return;
    const text = normalizeWs(decodeEntities(run.parts.join('')));
    if (text && !run.skip) items.push({ kind: 'html-text', text, offset: run.offset, line: lineOf(run.offset), where: '', quoted: run.quoted, ignore: run.ignore });
    else if (text && config.keepSkipped) items.push({ kind: 'html-text', text, offset: run.offset, line: lineOf(run.offset), where: '', quoted: run.quoted, ignore: run.ignore, skipped: true });
    run = null;
  };
  const addText = (raw, offset) => {
    if (!raw) return;
    const f = curFlags();
    if (!run) run = { parts: [], offset, quoted: f.quoted, ignore: f.ignore, skip: f.skip };
    // a data-lint-allow on any inline element inside a paragraph exempts that paragraph's text from the named rules
    else for (const k of f.ignore) run.ignore.add(k);
    run.parts.push(raw);
  };
  const pushAttr = (kind, name, value, offset) => {
    const text = normalizeWs(decodeEntities(value));
    if (!text) return;
    const f = curFlags();
    items.push({ kind, text, offset, line: lineOf(offset), where: name, quoted: f.quoted, ignore: f.ignore });
  };

  let i = 0;
  while (i < n) {
    const lt = src.indexOf('<', i);
    if (lt < 0) { addText(src.slice(i), i); break; }
    if (lt > i) addText(src.slice(i, lt), i);
    // comment
    if (src.startsWith('<!--', lt)) { const e = src.indexOf('-->', lt + 4); i = e < 0 ? n : e + 3; continue; }
    if (src[lt + 1] === '!' || src[lt + 1] === '?') { const e = src.indexOf('>', lt); i = e < 0 ? n : e + 1; continue; }
    const closing = src[lt + 1] === '/';
    const m = /^<\/?([A-Za-z][A-Za-z0-9:-]*)/.exec(src.slice(lt, lt + 60));
    if (!m) { addText('<', lt); i = lt + 1; continue; }
    const tag = m[1].toLowerCase();
    // find the end of the tag, honouring quoted attribute values
    let j = lt + m[0].length; let q = '';
    while (j < n) { const c = src[j]; if (q) { if (c === q) q = ''; } else if (c === '"' || c === "'") q = c; else if (c === '>') break; j++; }
    const tagText = src.slice(lt + 1, j);
    const tagEnd = j + 1;
    if (!INLINE.has(tag)) flush();
    if (closing) {
      for (let k = stack.length - 1; k >= 0; k--) { if (stack[k].tag === tag) { stack.length = k; break; } }
      i = tagEnd; continue;
    }
    const attrs = attrsOf(tagText);
    const attrMap = Object.fromEntries(attrs.map((a) => [a.name, a.value]));
    const base = lt + 1;
    const ignoreAttr = attrMap['data-copy-lint-ignore'] ?? attrMap['data-lint-allow'];
    const ignore = new Set(ignoreAttr ? ignoreAttr.split(/[ ,]+/).filter(Boolean) : []);
    // attributes that a visitor reads or hears
    const stackTop = { tag, skip: SKIP_TEXT.has(tag), quoted: QUOTE_TAGS.has(tag), ignore };
    stack.push(stackTop);
    for (const a of attrs) {
      if (TEXT_ATTRS.includes(a.name)) pushAttr('html-attr', a.name, a.value, base + a.offset);
      else if (a.name === 'content' && tag === 'meta') {
        const key = (attrMap.name || attrMap.property || '').toLowerCase();
        if (key === 'description' || key.startsWith('og:') || key.startsWith('twitter:')) {
          if (!/^(?:https?:|\/)/.test(a.value) && !/^(?:website|article|summary|summary_large_image|image\/)/.test(a.value)) pushAttr('html-attr', key, a.value, base + a.offset);
        }
      } else if (a.name === 'value' && tag === 'input' && /^(?:submit|button|reset)$/i.test(attrMap.type || '')) pushAttr('html-attr', 'value', a.value, base + a.offset);
      else if ((a.name === 'href' || a.name === 'action') && /^mailto:/i.test(a.value.trim())) pushAttr('html-link', a.name, a.value, base + a.offset);
    }
    const selfClose = VOID.has(tag) || /\/\s*$/.test(tagText);
    if (selfClose) { stack.pop(); i = tagEnd; continue; }
    if (tag === 'script' || tag === 'style' || tag === 'textarea' || tag === 'title') {
      const e = src.toLowerCase().indexOf('</' + tag, tagEnd);
      const end = e < 0 ? n : e;
      const body = src.slice(tagEnd, end);
      if (tag === 'title') {
        const text = normalizeWs(decodeEntities(body));
        if (text) items.push({ kind: 'html-title', text, offset: tagEnd, line: lineOf(tagEnd), where: 'title', quoted: false, ignore });
      } else if (tag === 'script') {
        const type = (attrMap.type || '').toLowerCase();
        if (type === 'application/ld+json') items.push(...extractJsonItems(body, { kind: 'json-ld', base: tagEnd, lineOf, config, ignore }));
        else if (!type || /javascript|module/.test(type)) items.push(...extractJsStrings(body, { base: tagEnd, lineOf, ignore, config }));
      }
      stack.pop();
      const ce = src.indexOf('>', end);
      i = ce < 0 ? n : ce + 1;
      continue;
    }
    i = tagEnd;
  }
  flush();
  return items;
}

export function extractJsStrings(src, { base = 0, lineOf = null, ignore = new Set(), config = {}, skipRegions = [] } = {}) {
  const lo = lineOf || buildLineIndex(src);
  const out = [];
  for (const s of scanJsStrings(src)) {
    if (skipRegions.some((r) => s.start >= r[0] && s.start < r[1])) continue;
    let v = s.value;
    const hasMarkup = /<[A-Za-z/][^>]*>|&[A-Za-z#][A-Za-z0-9]*;/.test(v);
    if (hasMarkup) v = htmlToText(v);
    if (s.quote === '`') v = v.replace(/\$\{[^}]*\}/g, ' ');
    v = normalizeWs(v);
    if (!isUserFacingString(v)) continue;
    out.push({ kind: 'js-string', text: v, offset: base + s.start, line: lo(lineOf ? base + s.start : s.start), where: '', quoted: false, ignore });
  }
  return out;
}

const SKIP_KEY_RE = /(?:^|_)(?:id|ids|key|keys|url|uri|href|src|slug|schema|lat|lng|lon|status|type|kind|side|code|class|color|colour|icon|path|file|files|hash|sha256|md5|crs|format|version|chunk)$|^\$|^(?:units_involved|units_featured|flag|flag_note|flag_notes|engine_note|tick_formula|metadata|_note|_notes|_meta)$/i;
export const DEFAULT_PROSE_KEYS = ['event', 'significance', 'panel_summary', 'full_script', 'narrative', 'description', 'text', 'summary', 'note', 'notes', 'quote', 'caption', 'title', 'label', 'name', 'message', 'headline', 'body', 'blurb', 'outcome', 'result', 'action', 'location', 'trigger_location', 'role', 'sub', 'subtitle'];

export function extractJsonItems(src, { kind = 'json', base = 0, lineOf = null, config = {}, ignore = new Set(), file = '' } = {}) {
  let data;
  try { data = JSON.parse(src); } catch { return []; }
  const lo = lineOf || buildLineIndex(src);
  const skipKeys = config.jsonSkipKeys ? new RegExp(config.jsonSkipKeys, 'i') : SKIP_KEY_RE;
  const whitelist = config.jsonWhitelist || null; // when set: only these keys (manifest.json)
  const out = [];
  const walk = (v, p, key) => {
    if (typeof v === 'string') {
      if (key && skipKeys.test(key)) return;
      if (whitelist && !whitelist.includes(key)) return;
      if (/^(?:https?:|data:|\/|#)/.test(v) || !/[A-Za-z]/.test(v)) return;
      let t = v;
      if (/<[A-Za-z/][^>]*>|&[A-Za-z#][A-Za-z0-9]*;/.test(t)) t = htmlToText(t);
      t = normalizeWs(t);
      if (!t) return;
      out.push({ kind, text: t, offset: 0, line: 0, where: p, key, quoted: false, ignore });
      return;
    }
    if (Array.isArray(v)) { v.forEach((x, i) => walk(x, `${p}/${i}`, key)); return; }
    if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) { if (skipKeys.test(k) && typeof x === 'object') continue; walk(x, `${p}/${k}`, k); }
  };
  walk(data, '', '');
  return out;
}

export function extractText(src) {
  const items = [];
  const lineOf = buildLineIndex(src);
  const re = /[^\n]+(?:\n(?!\s*\n)[^\n]+)*/g; // paragraphs
  let m;
  while ((m = re.exec(src))) {
    const text = normalizeWs(m[0]);
    if (text) items.push({ kind: 'text', text, offset: m.index, line: lineOf(m.index), where: '', quoted: false, ignore: new Set() });
  }
  return items;
}

/**
 * @param {string} rel posix path relative to the scan root
 * @param {string} src file contents
 * @param {object} config scan config (see tools/copy/scan-config.json)
 */
export function extractFile(rel, src, config = {}) {
  const ext = rel.slice(rel.lastIndexOf('.') + 1).toLowerCase();
  const directives = parseDirectives(src);
  const notes = [];
  let items = [];
  if (ext === 'html' || ext === 'htm') items = extractHtml(src, config);
  else if (ext === 'js' || ext === 'mjs' || ext === 'cjs') {
    const lineOf = buildLineIndex(src);
    const skipRegions = [];
    for (const r of config.jsSkipRegions || []) {
      if (!globMatch(r.glob, rel)) continue;
      const from = r.from === null || r.from === undefined ? 0 : src.indexOf(r.from);
      const to = r.to === null || r.to === undefined ? src.length : src.indexOf(r.to, Math.max(from, 0) + 1);
      if (from < 0 || to < 0) { notes.push(`skip region for ${r.glob} not found: ${r.note || ''}`); continue; }
      skipRegions.push([from, to + (r.to ? r.to.length : 0)]);
    }
    items = extractJsStrings(src, { lineOf, config, skipRegions });
  } else if (ext === 'json') {
    const manifest = /(?:^|\/)manifest\.json$/.test(rel) ? { ...config, jsonWhitelist: ['name', 'short_name', 'description', 'label'] } : config;
    items = extractJsonItems(src, { config: manifest, file: rel });
  } else if (ext === 'md' || ext === 'txt') items = extractText(src);
  return { items, directives, notes };
}

export function globMatch(glob, rel) {
  const re = new RegExp('^' + glob.replace(/[.+^${}()|\\]/g, '\\$&').replace(/\*\*\//g, '\u0001').replace(/\*\*/g, '\u0000').replace(/\*/g, '[^/]*').replace(/\u0001/g, '(?:.*/)?').replace(/\u0000/g, '.*') + '$');
  return re.test(rel);
}
