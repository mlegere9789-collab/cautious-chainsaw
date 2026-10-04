// A small, strict HTML checker for the candidate pages (no dependencies). It is NOT the W3C Nu validator (Java, not available
// offline); it checks the structural rules a validator and an accessibility audit would flag first, on a document that is
// generated and therefore uses explicit end tags everywhere except void elements.
//
//   checkHtml(source) -> { errors: string[], doc: { tags, ids, headings, text, ... } }
import { decodeEntities } from '../../../tools/copy/lib/extract.mjs';

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
const KNOWN = new Set(['html', 'head', 'body', 'title', 'meta', 'link', 'style', 'script', 'noscript', 'a', 'abbr', 'aside', 'b', 'blockquote', 'br', 'button', 'caption', 'cite', 'code', 'details', 'div', 'dl', 'dt', 'dd', 'em', 'figure', 'figcaption', 'footer', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hr', 'i', 'img', 'kbd', 'li', 'main', 'mark', 'nav', 'ol', 'p', 'pre', 'q', 'samp', 'section', 'small', 'span', 'strong', 'sub', 'summary', 'sup', 'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'time', 'tr', 'u', 'ul', 'var']);
const GLOBAL_ATTRS = new Set(['id', 'class', 'lang', 'title', 'role', 'tabindex', 'hidden', 'dir']);
const ELEMENT_ATTRS = {
  html: ['lang'], meta: ['charset', 'name', 'content', 'property'], link: ['rel', 'href', 'type'], script: ['src', 'type', 'data-current'], a: ['href', 'rel', 'target', 'download', 'hreflang'], img: ['src', 'alt', 'width', 'height', 'loading'],
  time: ['datetime'], th: ['scope', 'colspan', 'rowspan', 'headers'], td: ['colspan', 'rowspan', 'headers'], details: ['open'], ol: ['start', 'reversed', 'type'], button: ['type', 'disabled'], table: [], section: [],
};
const AFTER_P_CLOSERS = new Set(['address', 'article', 'aside', 'blockquote', 'details', 'div', 'dl', 'fieldset', 'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hr', 'main', 'nav', 'ol', 'p', 'pre', 'section', 'table', 'ul']);

export function tokenize(src) {
  const toks = [];
  let i = 0; const n = src.length;
  while (i < n) {
    const lt = src.indexOf('<', i);
    if (lt < 0) { toks.push({ t: 'text', v: src.slice(i), at: i }); break; }
    if (lt > i) toks.push({ t: 'text', v: src.slice(i, lt), at: i });
    if (src.startsWith('<!--', lt)) { const e = src.indexOf('-->', lt + 4); toks.push({ t: 'comment', v: src.slice(lt, e + 3), at: lt }); i = e + 3; continue; }
    if (/^<!doctype/i.test(src.slice(lt, lt + 10))) { const e = src.indexOf('>', lt); toks.push({ t: 'doctype', v: src.slice(lt, e + 1), at: lt }); i = e + 1; continue; }
    const m = /^<(\/?)([A-Za-z][A-Za-z0-9-]*)/.exec(src.slice(lt, lt + 40));
    if (!m) { toks.push({ t: 'text', v: '<', at: lt, stray: true }); i = lt + 1; continue; }
    let j = lt + m[0].length; let q = '';
    while (j < n) { const c = src[j]; if (q) { if (c === q) q = ''; } else if (c === '"' || c === "'") q = c; else if (c === '>') break; j++; }
    const inner = src.slice(lt + m[0].length, j);
    const attrs = [];
    const re = /([^\s"'<>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
    let a; while ((a = re.exec(inner))) attrs.push({ name: a[1].toLowerCase(), value: a[2] ?? a[3] ?? a[4] ?? null, quoted: a[2] !== undefined || a[3] !== undefined });
    const name = m[2].toLowerCase();
    toks.push({ t: m[1] ? 'end' : 'start', name, attrs, at: lt, selfClosing: /\/\s*$/.test(inner) });
    i = j + 1;
    if (!m[1] && (name === 'script' || name === 'style')) { const e = src.toLowerCase().indexOf(`</${name}`, i); const end = e < 0 ? n : e; toks.push({ t: 'raw', name, v: src.slice(i, end), at: i }); i = end; }
  }
  return toks;
}

export function checkHtml(src) {
  const errors = [];
  const err = (m) => errors.push(m);
  const toks = tokenize(src);
  const stack = [];
  const ids = new Map();
  const refs = [];
  const headings = [];
  const tags = [];
  const doc = { tags, ids, headings, anchors: [], scripts: [], links: [], images: [], forms: 0, navs: [], mains: 0, footers: 0, title: null, lang: null, jsonld: [], text: [], elements: [] };
  if (!toks.length || toks[0].t !== 'doctype' || !/^<!doctype html>$/i.test(toks[0].v)) err('the document must start with <!doctype html>');
  let textBuf = null;
  for (const tk of toks) {
    if (tk.t === 'doctype' || tk.t === 'comment') continue;
    if (tk.t === 'text') {
      if (tk.stray) err(`stray "<" at offset ${tk.at}`);
      const raw = tk.v;
      if (/&(?![A-Za-z][A-Za-z0-9]*;|#\d+;|#x[0-9a-fA-F]+;)/.test(raw)) err(`a bare ampersand in text near "${raw.trim().slice(0, 40)}"`);
      if (stack.length && stack.at(-1).name === 'title') doc.title = (doc.title || '') + decodeEntities(raw);
      if (raw.trim()) doc.text.push({ text: decodeEntities(raw).replace(/\s+/g, ' ').trim(), stack: stack.map((s) => s.el) });
      continue;
    }
    if (tk.t === 'raw') {
      const top = stack.at(-1);
      if (top && top.name === 'script') {
        const type = (top.el.attrs.type || '');
        if (type === 'application/ld+json') { try { doc.jsonld.push(JSON.parse(tk.v)); } catch (e) { err(`invalid JSON-LD: ${e.message}`); } } else if (tk.v.trim()) doc.scripts.push({ inline: true, body: tk.v });
      }
      continue;
    }
    if (tk.t === 'start') {
      if (!KNOWN.has(tk.name)) err(`unknown or disallowed element <${tk.name}>`);
      // implied end of an open <p>
      const el = { name: tk.name, attrs: Object.fromEntries(tk.attrs.map((a) => [a.name, a.value ?? ''])), at: tk.at, children: [] };
      if (stack.at(-1)?.name === 'p' && AFTER_P_CLOSERS.has(tk.name)) err(`<${tk.name}> inside an unclosed <p> (explicit </p> expected)`);
      const seen = new Set();
      for (const a of tk.attrs) {
        if (seen.has(a.name)) err(`<${tk.name}> repeats attribute ${a.name}`);
        seen.add(a.name);
        const ok = GLOBAL_ATTRS.has(a.name) || a.name.startsWith('data-') || a.name.startsWith('aria-') || (ELEMENT_ATTRS[tk.name] || []).includes(a.name);
        if (!ok) err(`<${tk.name}> has attribute ${a.name}, which is not allowed here`);
        if (a.name.startsWith('on')) err(`inline event handler ${a.name} on <${tk.name}>`);
        if (a.value !== null && !a.quoted && /[<>=`]/.test(a.value)) err(`unquoted attribute value on <${tk.name}>`);
        if (a.name === 'id') { if (ids.has(a.value)) err(`duplicate id "${a.value}"`); ids.set(a.value, el); }
        if ((a.name === 'aria-labelledby' || a.name === 'aria-controls' || a.name === 'aria-describedby') && a.value) refs.push({ name: a.name, ids: a.value.split(/\s+/), el });
        if (a.name === 'href' && a.value?.startsWith('#')) refs.push({ name: 'href', ids: [a.value.slice(1)], el });
        if (a.name === 'target' && a.value === '_blank' && !/noopener/.test(el.attrs.rel || '')) err('target=_blank without rel=noopener');
      }
      tags.push(tk.name);
      doc.elements.push(el);
      if (tk.name === 'a') doc.anchors.push(el);
      if (tk.name === 'img') { doc.images.push(el); if (!('alt' in el.attrs)) err('<img> without alt'); }
      if (tk.name === 'link') doc.links.push(el);
      if (tk.name === 'script') doc.scripts.push({ attrs: el.attrs, inline: false, el });
      if (tk.name === 'html') doc.lang = el.attrs.lang ?? null;
      if (tk.name === 'main') doc.mains++;
      if (tk.name === 'footer') doc.footers++;
      if (/^h[1-6]$/.test(tk.name)) headings.push({ level: Number(tk.name[1]), el, at: tk.at });
      if (tk.name === 'nav') doc.navs.push(el);
      if (tk.name === 'form') doc.forms++;
      if (VOID.has(tk.name) || tk.selfClosing) { if (!VOID.has(tk.name)) err(`self-closing syntax on non-void <${tk.name}>`); continue; }
      stack.push({ name: tk.name, el });
      continue;
    }
    if (tk.t === 'end') {
      const top = stack.at(-1);
      if (!top || top.name !== tk.name) { err(`unexpected </${tk.name}> (open: ${top ? '<' + top.name + '>' : 'nothing'})`); const k = stack.map((s) => s.name).lastIndexOf(tk.name); if (k >= 0) stack.length = k; continue; }
      stack.pop();
    }
  }
  for (const s of stack) err(`<${s.name}> is never closed`);
  for (const r of refs) for (const id of r.ids) if (!ids.has(id)) err(`${r.name} refers to #${id}, which does not exist`);
  // document rules
  if (doc.lang !== 'en-US') err(`html lang is ${JSON.stringify(doc.lang)}, expected en-US`);
  if (!tags.includes('meta') || !toks.some((t) => t.t === 'start' && t.name === 'meta' && t.attrs.some((a) => a.name === 'charset'))) err('missing <meta charset>');
  if (!toks.some((t) => t.t === 'start' && t.name === 'meta' && t.attrs.some((a) => a.name === 'name' && a.value === 'viewport'))) err('missing viewport meta');
  if (tags.filter((t) => t === 'title').length !== 1 || !doc.title?.trim()) err('exactly one non-empty <title> is required');
  if (tags.filter((t) => t === 'h1').length !== 1) err('exactly one <h1> is required');
  if (doc.mains !== 1) err(`expected one <main>, found ${doc.mains}`);
  if (doc.footers !== 1) err(`expected one <footer>, found ${doc.footers}`);
  let prev = 0;
  for (const h of headings) { if (prev && h.level > prev + 1) err(`heading level jumps from h${prev} to h${h.level}`); prev = h.level; }
  const labels = doc.navs.map((n) => n.attrs['aria-label'] || '');
  if (labels.some((l) => !l)) err('a <nav> has no aria-label');
  if (new Set(labels).size !== labels.length) err('two <nav> landmarks share a name');
  for (const a of doc.anchors) if (!('href' in a.attrs)) err('an <a> without href');
  return { errors, doc };
}

/** the text of every element in a stack, to ask "is this text inside X" */
export const insideTag = (entry, name) => entry.stack.some((e) => e.name === name);
