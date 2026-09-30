// yaml-lite.mjs - a small YAML subset reader/writer for docs/historian/sources.yaml (no dependency added to package.json).
// Supported: comments, block mappings, block sequences (of scalars or mappings), inline [a, b] and {k: v} flow collections,
// plain / 'single' / "double" quoted scalars, numbers, true/false/null. NOT supported: anchors, tags, multi-document streams, folded/literal blocks.
// The writer emits exactly this subset, so parse(dump(x)) round-trips (tested).

function scalar(s) {
  s = s.trim();
  if (s === '' || s === '~' || s === 'null') return null;
  if (s === 'true') return true;
  if (s === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
  if (s[0] === '"' && s[s.length - 1] === '"') { try { return JSON.parse(s); } catch { return s.slice(1, -1); } }
  if (s[0] === "'" && s[s.length - 1] === "'") return s.slice(1, -1).replace(/''/g, "'");
  return s;
}
// split on top-level commas (not inside quotes/brackets)
function splitFlow(s) {
  const out = []; let depth = 0, q = null, cur = '';
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) { cur += c; if (c === q && s[i - 1] !== '\\') q = null; continue; }
    if (c === '"' || c === "'") { q = c; cur += c; continue; }
    if (c === '[' || c === '{') depth++;
    if (c === ']' || c === '}') depth--;
    if (c === ',' && depth === 0) { out.push(cur); cur = ''; continue; }
    cur += c;
  }
  if (cur.trim() !== '') out.push(cur);
  return out;
}
function flow(s) {
  s = s.trim();
  if (s[0] === '[') return splitFlow(s.slice(1, -1)).map(flow);
  if (s[0] === '{') {
    const o = {};
    for (const part of splitFlow(s.slice(1, -1))) {
      const i = part.indexOf(':');
      if (i < 0) continue;
      o[part.slice(0, i).trim().replace(/^["']|["']$/g, '')] = flow(part.slice(i + 1));
    }
    return o;
  }
  return scalar(s);
}
const stripComment = (line) => {
  let q = null;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) { if (c === q && line[i - 1] !== '\\') q = null; continue; }
    if (c === '"' || c === "'") { if (i === 0 || /[\s:\[{,]/.test(line[i - 1])) q = c; continue; }
    if (c === '#' && (i === 0 || /\s/.test(line[i - 1]))) return line.slice(0, i);
  }
  return line;
};

export function parse(text) {
  const lines = text.split(/\r?\n/).map((raw, n) => ({ raw, n: n + 1, s: stripComment(raw).replace(/\s+$/, '') })).filter((l) => l.s.trim() !== '');
  const ind = (l) => l.s.match(/^ */)[0].length;
  let pos = 0;
  function block(indent) {
    if (pos >= lines.length) return null;
    const l = lines[pos];
    if (l.s.trim().startsWith('- ') || l.s.trim() === '-') return seq(ind(l));
    return map(ind(l));
  }
  function valueAfter(str, indent) {
    str = str.trim();
    if (str === '') { if (pos < lines.length && ind(lines[pos]) > indent) return block(ind(lines[pos])); if (pos < lines.length && ind(lines[pos]) === indent && lines[pos].s.trim().startsWith('- ')) return seq(indent); return null; }
    if (str[0] === '[' || str[0] === '{') return flow(str);
    return scalar(str);
  }
  function map(indent) {
    const o = {};
    while (pos < lines.length && ind(lines[pos]) === indent && !lines[pos].s.trim().startsWith('- ')) {
      const l = lines[pos++];
      const t = l.s.trim();
      const m = t.match(/^("[^"]*"|'[^']*'|[^:]+?):(?:\s+(.*)|)$/);
      if (!m) throw new Error(`yaml-lite: cannot parse line ${l.n}: ${l.raw}`);
      const key = m[1].replace(/^["']|["']$/g, '');
      o[key] = valueAfter(m[2] === undefined ? '' : m[2], indent);
    }
    return o;
  }
  function seq(indent) {
    const a = [];
    while (pos < lines.length && ind(lines[pos]) === indent && (lines[pos].s.trim().startsWith('- ') || lines[pos].s.trim() === '-')) {
      const l = lines[pos];
      const rest = l.s.trim().slice(1).trim();
      pos++;
      if (rest === '') { a.push(pos < lines.length && ind(lines[pos]) > indent ? block(ind(lines[pos])) : null); continue; }
      const km = rest.match(/^("[^"]*"|'[^']*'|[^:\[{"']+?):(?:\s+(.*)|)$/);
      if (km && rest[0] !== '[' && rest[0] !== '{' && rest[0] !== '"' || (km && /^["'][^"']*["']:/.test(rest))) {
        // mapping item: first key inline, remaining keys indented deeper
        const item = {};
        const key = km[1].replace(/^["']|["']$/g, '');
        const childIndent = indent + 2 + (l.s.trim().length - l.s.trim().slice(1).trimStart().length - 1);
        item[key] = valueAfter(km[2] === undefined ? '' : km[2], indent + 1);
        while (pos < lines.length && ind(lines[pos]) >= indent + 2 && !(ind(lines[pos]) === indent && lines[pos].s.trim().startsWith('- '))) {
          const ci = ind(lines[pos]);
          const ln = lines[pos++];
          const t = ln.s.trim();
          const m = t.match(/^("[^"]*"|'[^']*'|[^:]+?):(?:\s+(.*)|)$/);
          if (!m) throw new Error(`yaml-lite: cannot parse line ${ln.n}: ${ln.raw}`);
          item[m[1].replace(/^["']|["']$/g, '')] = valueAfter(m[2] === undefined ? '' : m[2], ci);
        }
        a.push(item);
      } else a.push(flow(rest));
    }
    return a;
  }
  pos = 0;
  return block(0);
}

// ---- writer ----------------------------------------------------------------------------------------------------------------------
const needsQuote = (s) => s === '' || /^[\s\-?:,\[\]{}#&*!|>'"%@`]|[:#]\s|\s$|^(true|false|null|~)$|^-?\d+(\.\d+)?$/.test(s) || /[\n"]/.test(s);
const qs = (s) => (needsQuote(s) ? JSON.stringify(s) : s);
function flowDump(v) {
  if (Array.isArray(v)) return '[' + v.map(flowDump).join(', ') + ']';
  if (v && typeof v === 'object') return '{' + Object.entries(v).map(([k, x]) => `${qs(k)}: ${flowDump(x)}`).join(', ') + '}';
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'string') return needsQuote(v) || /[,\]}]/.test(v) ? JSON.stringify(v) : v;
  return String(v);
}
export function dump(obj, indent = 0) {
  const pad = ' '.repeat(indent);
  let out = '';
  if (Array.isArray(obj)) {
    for (const it of obj) {
      if (it && typeof it === 'object' && !Array.isArray(it)) {
        const entries = Object.entries(it);
        entries.forEach(([k, v], i) => {
          const lead = i === 0 ? `${pad}- ` : `${pad}  `;
          out += lead + dumpEntry(k, v, indent + 2);
        });
      } else out += `${pad}- ${flowDump(it)}\n`;
    }
    return out;
  }
  for (const [k, v] of Object.entries(obj)) out += pad + dumpEntry(k, v, indent);
  return out;
}
function dumpEntry(k, v, indent) {
  const key = qs(k);
  if (v === null || v === undefined) return `${key}: null\n`;
  if (Array.isArray(v)) {
    if (v.every((x) => x === null || typeof x !== 'object')) return `${key}: ${flowDump(v)}\n`;
    return `${key}:\n${dump(v, indent + 2)}`;
  }
  if (typeof v === 'object') {
    if (Object.keys(v).length === 0) return `${key}: {}\n`;
    if (Object.values(v).every((x) => x === null || typeof x !== 'object')) return `${key}: ${flowDump(v)}\n`;
    return `${key}:\n${dump(v, indent + 2)}`;
  }
  return `${key}: ${flowDump(v)}\n`;
}
