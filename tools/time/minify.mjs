// Tiny whitespace/comment stripper built on acorn's tokenizer (no renaming, no rewriting): safe for the semicolon-terminated,
// dependency-free files in src/lib/time. Used only to inline the module as a small classic-script global.
import { tokenizer } from 'acorn';

const isWord = (c) => /[A-Za-z0-9_$\\]/.test(c) || c > '\x7f';

export function minify(src) {
  const toks = [];
  const tk = tokenizer(src, { ecmaVersion: 'latest', sourceType: 'script', locations: false });
  for (;;) {
    const t = tk.getToken();
    if (t.type.label === 'eof') break;
    toks.push({ s: t.start, e: t.end });
  }
  let out = '', prevEnd = 0;
  for (let i = 0; i < toks.length; i++) {
    const { s, e } = toks[i];
    const text = src.slice(s, e);
    if (i > 0 && s > prevEnd) { // something (whitespace or a comment) separated the tokens
      const a = out[out.length - 1], b = text[0];
      if ((isWord(a) && isWord(b)) || (a === '+' && b === '+') || (a === '-' && b === '-') || (a === '/' && b === '/') || (a === '<' && b === '!')) out += ' ';
    }
    out += text;
    prevEnd = e;
  }
  return out;
}
