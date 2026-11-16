// A small reader for the <style> block of historian.html: enough to ask "what font size does #ask get" and "does a rule hide the label".
// Not a cascade engine: rules are listed in document order with the media query they sit in; the test asks about every rule that can match.

export function styleText(html) {
  const out = [];
  const re = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
  let m;
  while ((m = re.exec(html))) out.push(m[1]);
  return out.join('\n');
}

/** [{ media: string|null, selectors: [string], decls: { prop: value }, order }] */
export function parseCSS(css) {
  const src = String(css).replace(/\/\*[\s\S]*?\*\//g, '');
  const out = [];
  let order = 0;
  (function block(text, media) {
    let i = 0;
    while (i < text.length) {
      const open = text.indexOf('{', i);
      if (open < 0) break;
      const prelude = text.slice(i, open).trim();
      let depth = 1;
      let j = open + 1;
      while (j < text.length && depth) { if (text[j] === '{') depth++; else if (text[j] === '}') depth--; j++; }
      const body = text.slice(open + 1, j - 1);
      i = j;
      if (/^@(media|supports)\b/.test(prelude)) { block(body, prelude); continue; }
      if (prelude.startsWith('@')) continue;
      const decls = {};
      for (const d of body.split(';')) {
        const k = d.indexOf(':');
        if (k > 0) decls[d.slice(0, k).trim().toLowerCase()] = d.slice(k + 1).trim().replace(/\s*!important$/i, '');
      }
      out.push({ media, selectors: prelude.split(',').map((s) => s.trim()).filter(Boolean), decls, order: order++ });
    }
  })(src, null);
  return out;
}

/** a length in px (rem and em count 16 px); NaN when it is not a plain length */
export function px(value) {
  const m = /^(-?\d+(?:\.\d+)?)(px|rem|em)$/i.exec(String(value).trim());
  if (!m) return NaN;
  return Number(m[1]) * (m[2].toLowerCase() === 'px' ? 1 : 16);
}

/** declarations that would hide an element from sight (clip tricks included); the list is a blacklist on purpose */
export const HIDING = [
  ['display', /^none$/i], ['visibility', /^(hidden|collapse)$/i], ['opacity', /^0(\.0+)?$/], ['font-size', /^0(px|em|rem)?$/i],
  ['clip', /./], ['clip-path', /inset\(\s*50%|circle\(\s*0/i], ['width', /^[01]px$/], ['height', /^[01]px$/], ['max-height', /^0/],
  ['text-indent', /^-\d{3,}/], ['left', /^-\d{3,}/], ['top', /^-\d{3,}/],
];
export const hidingDecls = (decls) => HIDING.filter(([prop, re]) => prop in decls && re.test(decls[prop])).map(([prop]) => `${prop}: ${decls[prop]}`);
