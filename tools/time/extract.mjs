// Small shared helpers for reading the frozen legacy tree and finding code spans (CANDIDATE tooling, read-only).
import fs from 'node:fs';
import path from 'node:path';
import * as acorn from 'acorn';
import * as walk from 'acorn-walk';
import { LEGACY, BUNDLE, readText } from './lib.mjs';

export const DIST = LEGACY;
export const read = (rel, tree = DIST) => readText(path.join(tree, rel));

/** [{text, index}] for every inline (src-less) <script> in an HTML string; index is the offset of the script body. */
export function inlineScripts(html) {
  const out = []; const re = /<script((?![^>]*\bsrc=)[^>]*)>([\s\S]*?)<\/script>/g; let m;
  while ((m = re.exec(html))) {
    const type = /\btype\s*=\s*["']?([^"'\s>]+)/i.exec(m[1]);
    if (type && !/^(module|text\/javascript|application\/javascript)$/i.test(type[1])) continue; // JSON-LD and templates are not code
    out.push({ text: m[2], index: m.index + m[0].indexOf('>') + 1 });
  }
  return out;
}

/** {src, start, end} of the named function declaration in an HTML page's inline scripts (offsets in the page), or null. */
export function pageFunction(html, name) {
  for (const s of inlineScripts(html)) {
    let ast; try { ast = acorn.parse(s.text, { ecmaVersion: 'latest', sourceType: 'script' }); } catch { continue; }
    let hit = null; walk.simple(ast, { FunctionDeclaration(n) { if (n.id && n.id.name === name && !hit) hit = n; } });
    if (hit) return { src: s.text.slice(hit.start, hit.end), start: s.index + hit.start, end: s.index + hit.end };
  }
  return null;
}

/** Count of non-overlapping occurrences of a string. */
export function countOf(text, find) { let n = 0, i = 0; while ((i = text.indexOf(find, i)) !== -1) { n++; i += find.length; } return n; }

/** Substring from the first `a` through the end of the first following `b` (both included); throws unless it is unique in the text. */
export function span(text, a, b) {
  const i = text.indexOf(a); if (i < 0) throw new Error('span start not found: ' + a.slice(0, 60));
  const j = text.indexOf(b, i + a.length); if (j < 0) throw new Error('span end not found: ' + b.slice(0, 60));
  const s = text.slice(i, j + b.length);
  if (countOf(text, s) !== 1) throw new Error('span not unique: ' + s.slice(0, 80));
  return s;
}

export { BUNDLE, acorn, walk };
