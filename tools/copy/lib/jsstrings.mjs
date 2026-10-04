// Dependency-free scanner for string literals in JavaScript source (minified bundles included).
// It is a tokenizer, not a parser: it only has to find where strings, template literals, comments and regular
// expression literals begin and end so that the text inside strings can be linted. A `/` is treated as the start of a
// regular expression when the previous significant token cannot end an expression (the usual heuristic).

const REGEX_PREV_KEYWORDS = new Set(['return', 'typeof', 'instanceof', 'in', 'of', 'new', 'delete', 'void', 'throw', 'case', 'do', 'else', 'yield', 'await']);
const isIdStart = (c) => /[A-Za-z_$]/.test(c);
const isIdPart = (c) => /[A-Za-z0-9_$]/.test(c);

/**
 * @param {string} src
 * @returns {{start:number,end:number,quote:string,raw:string,value:string}[]} `start`..`end` span the literal text between the quotes
 *          (for a template literal: one entry per static chunk between `${ }` expressions).
 */
export function scanJsStrings(src) {
  const out = [];
  const n = src.length;
  let i = 0;
  // brace stack for template literal nesting: 'T' marks a `${` that must return to template scanning
  const braces = [];
  let prevSig = ''; // last significant char
  let prevWord = ''; // last identifier/keyword if the previous significant token was a word

  const pushString = (start, end, quote) => {
    const raw = src.slice(start, end);
    out.push({ start, end, quote, raw, value: unescapeJs(raw) });
  };

  const scanQuoted = (q) => {
    const start = i + 1;
    let j = start;
    while (j < n) {
      const c = src[j];
      if (c === '\\') { j += 2; continue; }
      if (c === q) break;
      if (c === '\n') break; // unterminated: bail
      j++;
    }
    pushString(start, j, q);
    i = j + 1;
    prevSig = q; prevWord = '';
  };

  const scanTemplate = () => {
    // i points at the opening backtick or at the `}` that resumes a template
    let start = i + 1;
    let j = start;
    while (j < n) {
      const c = src[j];
      if (c === '\\') { j += 2; continue; }
      if (c === '`') { pushString(start, j, '`'); i = j + 1; prevSig = '`'; prevWord = ''; return; }
      if (c === '$' && src[j + 1] === '{') { pushString(start, j, '`'); braces.push('T'); i = j + 2; prevSig = '{'; prevWord = ''; return; }
      j++;
    }
    pushString(start, j, '`');
    i = j;
  };

  while (i < n) {
    const c = src[i];
    if (c === '"' || c === "'") { scanQuoted(c); continue; }
    if (c === '`') { scanTemplate(); continue; }
    if (c === '/') {
      const d = src[i + 1];
      if (d === '/') { // line comment
        let j = src.indexOf('\n', i + 2);
        i = j < 0 ? n : j + 1; continue;
      }
      if (d === '*') { // block comment
        let j = src.indexOf('*/', i + 2);
        i = j < 0 ? n : j + 2; continue;
      }
      const regexOk = prevSig === '' || '(,=:[!&|?{};+-*%<>~^'.includes(prevSig) || (prevWord && REGEX_PREV_KEYWORDS.has(prevWord));
      if (regexOk) { // regular expression literal
        let j = i + 1; let inClass = false;
        while (j < n) {
          const e = src[j];
          if (e === '\\') { j += 2; continue; }
          if (e === '\n') break;
          if (e === '[') inClass = true;
          else if (e === ']') inClass = false;
          else if (e === '/' && !inClass) break;
          j++;
        }
        i = j + 1;
        while (i < n && isIdPart(src[i])) i++; // flags
        prevSig = ')'; prevWord = '';
        continue;
      }
      i++; prevSig = '/'; prevWord = ''; continue;
    }
    if (c === '{') { braces.push('{'); i++; prevSig = '{'; prevWord = ''; continue; }
    if (c === '}') {
      const top = braces.pop();
      i++;
      if (top === 'T') { i--; scanTemplate(); continue; } // resume the template at this `}`
      prevSig = '}'; prevWord = ''; continue;
    }
    if (isIdStart(c)) {
      let j = i + 1;
      while (j < n && isIdPart(src[j])) j++;
      prevWord = src.slice(i, j); prevSig = 'a'; i = j; continue;
    }
    if (c === ' ' || c === '\t' || c === '\r' || c === '\n') { i++; continue; }
    if (/[0-9]/.test(c)) {
      let j = i + 1;
      while (j < n && /[0-9A-Za-z_.]/.test(src[j])) j++;
      i = j; prevSig = '0'; prevWord = ''; continue;
    }
    prevSig = c; prevWord = ''; i++;
  }
  return out;
}

/** Decode JavaScript string escapes (\n \t \xHH \uHHHH \u{H+} line continuation, quotes). */
export function unescapeJs(raw) {
  if (!raw.includes('\\')) return raw;
  return raw.replace(/\\(u\{[0-9a-fA-F]+\}|u[0-9a-fA-F]{4}|x[0-9a-fA-F]{2}|\r\n|\n|[\s\S])/g, (m, g) => {
    if (g[0] === 'u') {
      const hex = g[1] === '{' ? g.slice(2, -1) : g.slice(1);
      try { return String.fromCodePoint(parseInt(hex, 16)); } catch { return m; }
    }
    if (g[0] === 'x' && g.length === 3) return String.fromCharCode(parseInt(g.slice(1), 16));
    if (g === '\n' || g === '\r\n') return '';
    switch (g) { case 'n': return '\n'; case 't': return '\t'; case 'r': return '\r'; case 'b': return '\b'; case 'f': return '\f'; case 'v': return '\v'; case '0': return '\0'; default: return g; }
  });
}

/** Line (1-based) of an offset; `lineStarts` is built once per file. */
export function buildLineIndex(src) {
  const starts = [0];
  for (let i = 0; i < src.length; i++) if (src.charCodeAt(i) === 10) starts.push(i + 1);
  return (offset) => {
    let lo = 0; let hi = starts.length - 1;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (starts[mid] <= offset) lo = mid; else hi = mid - 1; }
    return lo + 1;
  };
}
