// Reads what a Tranche 0 release train would contain WITHOUT building it and without editing any patch file or tree.
// It applies the patch files of tools/t0/patches (the data the builder tools/t0/build.py reads) to the locked baseline text in
// memory, in the order of tools/t0/trains.json: groups in `group_order` (a group joins at its `first` train), the main file of a
// group first and its extension parts `<G>+*.json` after it, then the page groups for page targets. Every patch's `expect`
// count is asserted, so a patch set that no longer matches the baseline stops here, exactly as the builder would.
//
//   extractHelp({root, train})      -> { desktop, phone, about, applied, source }   the Help dialog rows (acorn)
//   extractNav({root, train})       -> { groups: [{name, why, items:[{id,href,label,icon,desc,star}]}] }   site-nav.js menu
//   extractKeyHandler({root, train})-> { keys:Set<string>, source }   the `case` labels of the app's global key handler
import fs from 'node:fs';
import path from 'node:path';
import * as acorn from 'acorn';

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const rel = (root, p) => path.relative(root, p).replace(/\\/g, '/');

export function groupsForTrain(trains, train) {
  const order = trains.train_order;
  const rank = order.indexOf(train);
  if (rank < 0) throw new Error(`unknown train ${train}; known: ${order.join(', ')}`);
  return trains.group_order.filter((g) => trains.groups[g] && order.indexOf(trains.groups[g].first) <= rank);
}

/** { group: [{file, patches, delete}] } main file first, extension parts after it, each sorted by name */
export function loadPatchFiles(root) {
  const dir = path.join(root, 'tools', 't0', 'patches');
  const files = fs.readdirSync(dir).filter((x) => x.endsWith('.json'));
  const byGroup = {};
  for (const f of files) {
    const d = readJson(path.join(dir, f));
    if (!d.group) continue;
    (byGroup[d.group] ||= []).push({ file: f, patches: d.patches || [], meta: d });
  }
  for (const g of Object.keys(byGroup)) byGroup[g].sort((a, b) => ((a.file === `${g}.json`) ? -1 : (b.file === `${g}.json`) ? 1 : a.file < b.file ? -1 : 1));
  return byGroup;
}

const pureCrlf = (t) => t.includes('\r\n') && !/(?<!\r)\n/.test(t);
function applyOne(text, p0, file) {
  // tools/t0 util.eol_adapt: when the target text is pure CRLF, a patch string that holds only LF is converted to CRLF
  const crlf = pureCrlf(text);
  const p = crlf && !p0.regex ? { ...p0, find: p0.find.includes('\r\n') ? p0.find : p0.find.replace(/\n/g, '\r\n'), repl: p0.repl.includes('\r\n') ? p0.repl : p0.repl.replace(/\n/g, '\r\n') } : p0;
  if (p.regex) {
    // tools/t0 uses Python re: `find` is a pattern, `repl` expands \1 and \g<name>. The subset used by the patch files maps 1:1 to JavaScript.
    const re = new RegExp(p.find, 'g');
    const n = (text.match(re) || []).length;
    if (n !== p.expect) throw new Error(`regex patch ${p.id} (${file}): found ${n}, expected ${p.expect}`);
    const repl = p.repl.replace(/\$/g, '$$$$').replace(/\\g<(\w+)>/g, '$$<$1>').replace(/\\(\d)/g, '$$$1');
    return text.replace(re, repl);
  }
  const n = text.split(p.find).length - 1;
  if (n !== p.expect) throw new Error(`patch ${p.id} (${file}): found ${n}, expected ${p.expect}: the patch set and the baseline text no longer agree`);
  return text.split(p.find).join(p.repl);
}

/**
 * Apply every patch of `target` for the groups of `train`. `target` is 'help' | 'js' | a page path ('site-nav.js').
 * Page groups (PG-*) apply to page targets only, after the bundle groups, sorted by name; the optional ones are skipped.
 */
export function applyTarget({ root, train, target, text }) {
  const trains = readJson(path.join(root, 'tools', 't0', 'trains.json'));
  const byGroup = loadPatchFiles(root);
  const applied = [];
  const pageTarget = !['help', 'js', 'book', 'css'].includes(target);
  for (const g of groupsForTrain(trains, train)) {
    for (const { file, patches } of byGroup[g] || []) for (const p of patches) if (p.target === target) { text = applyOne(text, p, file); applied.push({ group: g, file, id: p.id }); }
  }
  if (pageTarget) {
    const rank = trains.train_order.indexOf(train);
    const pgs = Object.keys(byGroup).filter((g) => g.startsWith('PG-')).sort();
    for (const g of pgs) {
      for (const { file, patches, meta } of byGroup[g]) {
        if (meta.optional) continue;
        const first = meta.train || trains.pg_default_first || 'R1a';
        if (trains.train_order.indexOf(first) > rank) continue;
        for (const p of patches) if (p.target === target) { text = applyOne(text, p, file); applied.push({ group: g, file, id: p.id }); }
      }
    }
  }
  return { text, applied };
}

const baselineFile = (root, relPath) => path.join(root, 'baseline', 'dist', relPath);

const literal = (node) => {
  if (!node) return undefined;
  if (node.type === 'Literal') return node.value;
  if (node.type === 'UnaryExpression' && node.operator === '!' ) { const v = literal(node.argument); return v === undefined ? undefined : !v; }
  if (node.type === 'TemplateLiteral' && node.expressions.length === 0) return node.quasis.map((q) => q.value.cooked).join('');
  return undefined;
};
const objectOf = (node) => {
  const row = {};
  for (const prop of node.properties) {
    if (prop.type !== 'Property') return null;
    const k = prop.key.type === 'Identifier' ? prop.key.name : prop.key.value;
    let v = literal(prop.value);
    if (v === undefined && prop.value.type === 'ArrayExpression') v = prop.value.elements.map((e) => (e.type === 'ObjectExpression' ? objectOf(e) : literal(e)));
    if (v === undefined) return null;
    row[k] = v;
  }
  return row;
};

export function extractHelp({ root, train = 'R1c' }) {
  const trains = readJson(path.join(root, 'tools', 't0', 'trains.json'));
  const src = baselineFile(root, trains.legacy.help);
  const { text, applied } = applyTarget({ root, train, target: 'help', text: fs.readFileSync(src, 'utf8') });
  const ast = acorn.parse(text, { ecmaVersion: 'latest', sourceType: 'module' });
  const arrays = {};
  for (const stmt of ast.body) {
    if (stmt.type !== 'VariableDeclaration') continue;
    for (const d of stmt.declarations) {
      if (d.id.type === 'Identifier' && d.init && d.init.type === 'ArrayExpression') {
        const rows = [];
        let ok = d.init.elements.length > 0;
        for (const el of d.init.elements) { const o = el && el.type === 'ObjectExpression' ? objectOf(el) : null; if (!o || !('section' in o || ('key' in o && 'desc' in o))) { ok = false; break; } rows.push(o); }
        if (ok) arrays[d.id.name] = rows;
      }
    }
  }
  const names = Object.keys(arrays);
  const desktop = arrays[names.find((n) => arrays[n].some((r) => r.key === 'Space'))] || [];
  const phone = arrays[names.find((n) => arrays[n].some((r) => r.key === 'Pinch'))] || [];
  return { desktop, phone, applied, source: `${rel(root, src)} + help patches of ${train}`, text };
}

export function extractNav({ root, train = 'R1c' }) {
  const src = baselineFile(root, 'site-nav.js');
  const { text, applied } = applyTarget({ root, train, target: 'site-nav.js', text: fs.readFileSync(src, 'utf8') });
  const ast = acorn.parse(text, { ecmaVersion: 'latest', sourceType: 'script' });
  let groups = null;
  (function walk(node) {
    if (!node || typeof node !== 'object' || groups) return;
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (node.type === 'VariableDeclarator' && node.id.name === 'GROUPS' && node.init?.type === 'ArrayExpression') { groups = node.init.elements.map(objectOf); return; }
    for (const k of Object.keys(node)) if (k !== 'type') walk(node[k]);
  })(ast);
  if (!groups) throw new Error('GROUPS not found in site-nav.js');
  return { groups, applied, source: `${rel(root, src)} + page patches of ${train}` };
}

/** The `case` labels of the app's global key handler (the switch on the key of the keydown event) after the js patches of `train`. */
export function extractKeyHandler({ root, train = 'R1c' }) {
  const trains = readJson(path.join(root, 'tools', 't0', 'trains.json'));
  const src = baselineFile(root, trains.legacy.entry);
  const { text, applied } = applyTarget({ root, train, target: 'js', text: fs.readFileSync(src, 'utf8') });
  const i = text.indexOf('switch(Ur.key){');
  if (i < 0) throw new Error('the global key handler (switch(Ur.key)) was not found');
  let depth = 0; let j = i + 'switch(Ur.key)'.length;
  for (; j < text.length; j++) { const c = text[j]; if (c === '{') depth++; else if (c === '}') { depth--; if (depth === 0) break; } }
  const body = text.slice(i, j + 1);
  const keys = new Set([...body.matchAll(/case\s*"((?:[^"\\]|\\.)*)"\s*:/g)].map((m) => m[1]));
  const cap = (re) => { const m = body.match(re); return m ? Number(m[1]) : null; };
  // + doubles the speed up to a ceiling, - halves it down to a floor, 0 resets it (read from the handler, not from the Help text)
  const speed = { max: cap(/playbackSpeed:Math\.min\((\d+),\w+\*2\)/), min: cap(/playbackSpeed:Math\.max\((\.?\d+),\w+\/2\)/) };
  return { keys, body, speed, applied, source: `${rel(root, src)} + js patches of ${train}` };
}

export const flatRows = (rows) => rows.filter((r) => r.key !== undefined).map((r) => ({ key: r.key, desc: r.desc }));

/** The works the Help dialog's About tab lists (an array of strings that starts with the Official Records), after the help patches. */
export function extractHelpSources({ root, train = 'R1c' }) {
  const { text } = extractHelp({ root, train });
  const ast = acorn.parse(text, { ecmaVersion: 'latest', sourceType: 'module' });
  let list = null;
  let heading = null;
  (function walk(node) {
    if (!node || typeof node !== 'object' || list) return;
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (node.type === 'ArrayExpression' && node.elements.length > 3 && node.elements.every((e) => e && e.type === 'Literal' && typeof e.value === 'string') && /^OR Vol\./.test(node.elements[0].value)) { list = node.elements.map((e) => e.value); return; }
    for (const k of Object.keys(node)) if (k !== 'type') walk(node[k]);
  })(ast);
  const m = text.match(/style:t\.sourceHead,children:"([^"]+)"/);
  heading = m ? m[1] : null;
  if (!list) throw new Error('the source list of the Help About tab was not found');
  return { heading, works: list };
}
