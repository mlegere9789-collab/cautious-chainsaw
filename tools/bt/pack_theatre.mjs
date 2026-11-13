// Packs the Battle Theatre page shell (docs/battle-theatre/app) as a separate, drag-and-drop-able staging site.
//   node tools/bt/pack_theatre.mjs [--out deliver/bt-staging/dist] [--zip-dir deliver] [--no-zip]
// Emits a deterministic dist (same inputs -> same bytes, same zip, same hash): the shell plus the sibling files it can request at runtime. The files are found by a trace:
//   1. pages: app/index.html and every page of a static section (SECTIONS, e.g. app/roster): scripts, the import map, style sheets, images, links to other local pages;
//   2. modules: the import graph from the pages' scripts: static import, export-from, import('literal'), bare names through the import map, and computed imports with a literal
//      prefix (import('./ext/' + name): every module of that folder; a folder index that default-exports a list of names says which of them the page loads);
//   3. file addresses in the code: URLS.<key> + 'file' (also urls.<key>, template strings and `${URLS.<key>}folder/${id}.ext`), new URL('relative', import.meta.url), fetch('literal'),
//      new Worker('literal') and the like; an address that ends in '/' or stops at a placeholder takes the folder (or every file with that prefix, and only those with the printed ending);
//   4. style sheets: url(...) and @import;
//   5. folders that ship whole: SHIP_WHOLE (the shell's module folder, so no computed import can miss a module; every module in it is scanned like a loaded one), INCLUDE and
//      EXTRA_DIRS (data read through a base path the scan cannot follow) and the static sections.
// What the trace cannot prove is checked by a REAL run (tools/bt/verify_staging.mjs) and listed by the trace itself: computed imports of an unknown form and file-like literals of loaded
// modules that are not in the build (tests/bt-pack keeps a reviewed list of both). The directory layout of docs/battle-theatre is kept (the shell resolves its siblings by relative
// URL). Rewritten on the way out: app/index.html (home links, noindex, build stamp) and the files of PROJECT (reduced to the fields the shell reads). Files matching WITHHELD are never
// shipped, are listed in MANIFEST.json and are reported by the real run. Nothing is uploaded or deployed by this tool.
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; import zlib from 'node:zlib'; import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const REPO = path.resolve(here, '../..');
export const BT = path.join(REPO, 'docs/battle-theatre');
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const posix = p => p.split(path.sep).join('/');

// folder keys of app/src/config.mjs, relative to docs/battle-theatre. The trace reads the keys from config.mjs itself (a new key is followed without a change here); this table is
// the fallback and is checked against config.mjs by the self-test.
export const URL_KEYS = { app: 'app/', proto: 'render/prototype/', gov: 'GOVERNANCE/', env: 'environment/', data: 'app/data/', hist: 'history/', structures: 'structures/', kit: 'kit/' };
// entry pages of the shell
export const PAGES = ['app/index.html'];
// loaded through a base path the literal scan cannot see (renderer: base + 'data/aerial.jpg', world: terrain.json / height.bin)
export const EXTRA_DIRS = ['render/prototype/data'];
// explicit include list (dynamic loads the scan cannot see; each entry is a folder or file under docs/battle-theatre, relative to it). Verified by tools/bt/verify_staging.mjs.
export const INCLUDE = ['app/data/audio3d', 'app/data/anim3d', 'app/data/fx3d'];
// module folders that ship whole: a module the page reaches only through a computed import is then never missing. Modules in them that no page loads are scanned too (superset).
export const SHIP_WHOLE = ['app/src'];
// static sections beside the shell (pages with no build step). Shipped whole when the folder exists; every page, script, style sheet and index file in them is scanned.
export const SECTIONS = ['app/roster'];
// files of a folder that no feature of the shell loads (checked by the same real run); left out to keep the zip small
export const EXCLUDE = [];
// not loaded by the shell today; listed in the manifest so the owner can see they were considered, never shipped
export const NOT_LOADED = ['GOVERNANCE/timeline_verified.jsonl', 'GOVERNANCE/decisions/conflict_defaults.json'];
// referenced by the shell but not shippable as they stand. Never copied into the build; listed in MANIFEST.json; the real run reports every link that reaches one (a failing check).
export const WITHHELD = [
  { id: 'register-entries', match: /^GOVERNANCE\/register\/.*\.md$/, pattern: 'GOVERNANCE/register/**/*.md',
    why: 'Working copies of the evidence-gap register carry internal notes that the copy rules keep out of a published build. The "Open register entry" links of the unit card and the event panel answer 404 in this build until a public copy of the entries exists.' },
];
// working files of which the shell reads only some fields: the build carries those fields and nothing else. The trace fails when a shipped module reads the file in a way not listed here.
export const PROJECT = [
  { path: 'GOVERNANCE/register_index.json', keep: ['id'], readers: [{ file: 'app/src/data.mjs', use: /register_index\.json'\)\)\.map\(r => r\.id\)/ }],
    why: 'The shell reads only the entry ids (to know which timeline rows have a register entry); the working file also carries internal notes.' },
];
// computed imports the trace cannot resolve by itself, reviewed: { file: RegExp on the module path, arg: RegExp on the import() argument, covered: how the target is shipped }
export const KNOWN_COMPUTED = [];
// not shipped by a whole-folder rule (a direct reference by name or by ending still ships such a file)
const SKIP_IN_FOLDERS = /(^|\/)\.[^/]+$|\.(md|map|orig|bak|tmp|log)$|~$|\.(test|spec)\.[mc]?js$/i;
const CODE_EXT = /\.(mjs|js)$/i, FILE_EXT = 'json|jsonl|bin|png|jpe?g|webp|gif|svg|glb|gltf|ktx2|wav|ogg|mp3|m4a|flac|wasm|csv|txt|geojson|css|html?|mjs|js|woff2?|ttf|otf|md';

export const IMPORT_RE = /(?<![\w$.'"`])(?:import|export)\s*(?:[^'";]*?\sfrom\s*)?['"]([^'"\n]+)['"]|(?<![\w$.])import\(\s*['"]([^'"\n]+)['"]\s*[),]/g;   // [1] static, [2] import('literal')
const IMPORT_CALL_RE = /(?<![\w$.])import\(\s*([^)]{0,200})/g;                                                                              // every import( call, classified below
const MODULE_NAME = /^(?:node:[\w/.-]+|(?:@[\w.-]+\/)?[\w.-]+(?:\/[\w./-]+)*)$/;                                                             // a bare module name (anything else the pattern caught is not an import)
const URLS_CAT_RE = /\b(URLS|urls)\.([A-Za-z_]\w*)\s*\+\s*(?:(['"])([^'"]*)\3|`([^`]*)`)(\s*\+)?/g;                                         // URLS.data + 'file' | URLS.data + `figures3d/${name}.json` | URLS.data + 'tiles/' + z
const URLS_TPL_RE = /\$\{\s*(?:[\w$]+\.)*(URLS|urls)\.([A-Za-z_]\w*)\s*\}([^`]*)`/g;                                                       // `${URLS.gov}register/${id}.md`
const META_URL_RE = /new URL\(\s*(?:(['"])([^'"]*)\1|`([^`]*)`)\s*(\+[^,]*)?,\s*import\.meta\.url\s*\)/g;                                  // new URL('../../data/audio3d/', import.meta.url)
const DOC_REF_RE = /\b(fetch|new\s+(?:Shared)?Worker|new\s+Audio|addModule|importScripts|serviceWorker\.register)\(\s*(?:(['"])([^'"]*)\2|`([^`]*)`)\s*(\+)?/g;   // resolved against the page
const SRC_ASSIGN_RE = new RegExp(String.raw`\.(?:src|href)\s*=\s*(['"])([^'"]+\.(?:${FILE_EXT}))\1`, 'g');
const LITERAL_RE = new RegExp(String.raw`(['"\`])((?:\.{0,2}\/)?[\w@.-]+(?:\/[\w@.-]+)*\.(?:${FILE_EXT}))\1`, 'g');                           // a whole string that is a file path
export const CSS_URL_RE = /url\(\s*(['"]?)([^'")]+)\1\s*\)|@import\s+(['"])([^'"]+)\3/g;
const EXTERNAL = /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i;

function walk(dir) { const o = []; for (const e of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name < b.name ? -1 : 1)) { const p = path.join(dir, e.name); if (e.isDirectory()) o.push(...walk(p)); else o.push(p); } return o; }
const isFile = p => { try { return fs.statSync(p).isFile(); } catch { return false; } };
const isDir = p => { try { return fs.statSync(p).isDirectory(); } catch { return false; } };
const cut = s => s.replace(/[?#].*$/, '');
// the literal part of a template: text before the first placeholder, text after the last one
function tpl(s) { const i = s.indexOf('${'); if (i < 0) return { prefix: s, suffix: '', hole: false }; const j = s.lastIndexOf('}'); return { prefix: s.slice(0, i), suffix: j > i ? s.slice(j + 1) : '', hole: true }; }
// URL keys as config.mjs declares them: `key: new URL('relative', here).href` with here = the folder of config.mjs
function readUrlKeys(root, fallback) {
  const keys = { ...fallback }, cfg = path.join(root, 'app/src/config.mjs'); if (!isFile(cfg)) return keys;
  for (const m of fs.readFileSync(cfg, 'utf8').matchAll(/^\s*([A-Za-z_]\w*):\s*new URL\('([^']+)',\s*here\)/gm)) { const rel = posix(path.relative(root, path.resolve(path.dirname(cfg), m[2]))); keys[m[1]] = rel === '' ? '' : rel + '/'; }
  return keys;
}
// names a folder index lists: `export default ['a.mjs', 'sub/b.mjs']` (null when the index does not have that shape)
function indexList(file) {
  if (!isFile(file)) return null; const m = /export\s+default\s*\[([\s\S]*?)\]/.exec(fs.readFileSync(file, 'utf8')); if (!m) return null;
  const body = m[1].replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, ''), names = [...body.matchAll(/(['"`])([^'"`]+)\1/g)].map(x => x[2]);
  return body.replace(/(['"`])[^'"`]*\1/g, '').replace(/[\s,]/g, '') === '' ? names : null;       // anything but string literals: not a plain list
}

export function trace(opts = {}) {
  const root = path.resolve(opts.root || BT), c = opts.cfg || {};
  const cfg = { pages: c.pages || PAGES, extraDirs: c.extraDirs || EXTRA_DIRS, include: c.include || INCLUDE, shipWhole: c.shipWhole || SHIP_WHOLE, sections: c.sections || SECTIONS, exclude: c.exclude || EXCLUDE,
    withheld: c.withheld || WITHHELD, project: c.project || PROJECT, knownComputed: c.knownComputed || KNOWN_COMPUTED, urlKeys: readUrlKeys(root, c.urlKeys || URL_KEYS) };
  const files = new Map(), problems = [], notes = [], withheld = new Map(), computed = [], literals = [], external = new Set(), importMap = new Map();
  const rel = abs => posix(path.relative(root, abs)), inRoot = abs => abs === root || abs.startsWith(root + path.sep);
  const reached = [], later = [], seenMod = new Map(), seenPage = new Set(), seenCss = new Set(), seenJson = new Set(), pageDirs = new Set();
  const ship = (abs, why) => {
    if (!inRoot(abs)) { notes.push(`outside the packed folder, not shipped: ${rel(abs)} (${why})`); return false; }
    const r = rel(abs); for (const w of cfg.withheld) if (w.match.test(r)) { if (!withheld.has(w.id)) withheld.set(w.id, { id: w.id, pattern: w.pattern, why: w.why, files: new Set(), referencedBy: new Set() }); const e = withheld.get(w.id); e.files.add(r); e.referencedBy.add(why); return false; }
    if (!files.has(abs)) files.set(abs, new Set()); files.get(abs).add(why); return true;
  };
  const follow = (abs, mode, why) => { if (CODE_EXT.test(abs)) (mode === 'reached' ? reached : later).push({ f: abs, mode, why }); else if (/\.css$/i.test(abs)) scanCss(abs, mode); else if (/\.html?$/i.test(abs) && mode === 'reached') scanPage(abs); };
  // a folder: every file in it (optionally only those with an ending); modules in it are scanned as 'shipped, not known to be loaded'
  const shipDir = (abs, why, suffix = '') => { let n = 0; for (const f of walk(abs)) { if (suffix ? !f.endsWith(suffix) : SKIP_IN_FOLDERS.test(rel(f))) continue; n++; if (ship(f, why) && CODE_EXT.test(f)) later.push({ f, mode: 'shipped', why }); } return n; };
  // a reference from code or markup. kind: 'file' (exact), 'prefix' (literal part of an address that continues with a computed part). severity: 'problem' | 'note' | null when it is missing
  const ref = (abs, why, { mode = 'reached', kind = 'file', suffix = '', missing = 'problem' } = {}) => {
    const miss = msg => { if (missing === 'problem' && mode === 'reached') problems.push(msg); else if (missing) notes.push(msg); return false; };
    if (kind === 'file') {
      if (isFile(abs)) { if (ship(abs, why)) follow(abs, mode, why); return true; }
      if (isDir(abs)) return shipDir(abs, why, suffix) > 0 || miss(`empty folder: ${rel(abs)} (${why})`);
      return miss(`missing: ${rel(abs)} (${why})`);
    }
    if (kind === 'folder') {         // the literal part of a computed address names a folder: its files are taken; an empty or absent folder has nothing to take yet
      if (!isDir(abs)) { notes.push(`folder of a computed address is not there: ${rel(abs)}/ (${why})`); return false; }
      if (shipDir(abs, why, suffix) === 0) notes.push(`nothing to take yet in ${rel(abs)}/${suffix ? ' (ending in ' + suffix + ')' : ''} (${why})`); return true;
    }
    const dir = path.dirname(abs), pre = path.basename(abs); if (!isDir(dir)) return miss(`missing folder: ${rel(dir)} (${why})`);
    let any = false; for (const f of walk(dir)) if (path.dirname(f) === dir && path.basename(f).startsWith(pre) && (!suffix || f.endsWith(suffix))) { any = true; if (ship(f, why)) follow(f, mode === 'reached' ? 'shipped' : mode, why); }
    return any || miss(`no file with prefix ${rel(abs)} (${why})`);
  };
  // an address printed in code: literal text, or a template / concatenation whose literal part is a prefix
  const address = (baseAbs, text, isTpl, concat, why, o) => {
    const t = isTpl ? tpl(text) : { prefix: text, suffix: '', hole: false }, q = cut(t.prefix), open = (t.hole || concat) && q === t.prefix;
    if (q === '' && !open) { notes.push(`base address used alone, nothing to follow (${why})`); return false; }
    if (q === '' && open) notes.push(`address with no literal part: the whole folder ${rel(baseAbs)}/ is taken${t.suffix ? ' (files ending in ' + t.suffix + ')' : ''} (${why})`);
    return ref(path.resolve(baseAbs, q), why, { ...o, kind: !open ? 'file' : q === '' || q.endsWith('/') ? 'folder' : 'prefix', suffix: open ? t.suffix : '' });
  };
  const inComment = (src, i) => { const ls = src.lastIndexOf('\n', i - 1) + 1, line = src.slice(ls, i); return /(^|[^:'"`])\/\/|^\s*\*|\/\*/.test(line); };

  function scanCode(src, file, mode, isModule = true) {
    const r = rel(file), dir = path.dirname(file), docDirs = [...pageDirs], fatal = mode === 'reached';
    if (isModule) {
      for (const m of src.matchAll(IMPORT_RE)) {
        const s = m[1] ?? m[2], dyn = m[1] == null, why = `import in ${r}`, cm = inComment(src, m.index);
        if (s.startsWith('.') || s.startsWith('/')) {
          if (s.startsWith('//')) { external.add(`${s} (${why})`); continue; }
          const abs = s.startsWith('/') ? path.join(root, cut(s)) : path.resolve(dir, cut(s));
          if (isFile(abs)) { if (!inRoot(abs)) { (fatal && !cm ? problems : notes).push(`import leaves the packed folder: ${s} in ${r}`); continue; } if (ship(abs, why)) follow(abs, mode, why); }
          else if (dyn || !fatal || cm) notes.push(`missing: ${rel(abs)} (${dyn ? 'import() with a literal name' : 'import'} in ${r}; the page copes only if that call is guarded)`);
          else problems.push(`missing: ${rel(abs)} (${why})`);
          continue;
        }
        if (/^https?:\/\//i.test(s)) { external.add(`${s} (${why})`); continue; }
        if (!MODULE_NAME.test(s)) continue;
        let t = importMap.get(s); if (!t) for (const [k, v] of importMap) if (k.endsWith('/') && s.startsWith(k)) { t = path.join(v, s.slice(k.length)); break; }
        if (t) { if (isFile(t)) { if (ship(t, `import map entry '${s}' used by ${r}`)) follow(t, mode, why); } else (fatal && !cm ? problems : notes).push(`missing: ${rel(t)} (import map entry '${s}' used by ${r})`); }
        else (fatal && !cm ? problems : notes).push(`'${s}' is imported by ${r} and the page's import map does not map it`);
      }
      for (const m of src.matchAll(IMPORT_CALL_RE)) {
        const arg = m[1].trim(), why = `computed import in ${r}`; let x;
        if (/^(['"])[^'"]*\1\s*(?:,|$)/.test(arg)) continue;                                                        // literal: IMPORT_RE
        if ((x = /^(['"])([^'"]*)\1\s*\+/.exec(arg)) || (x = /^`([^`$]*)\$\{/.exec(arg))) {
          const pre = x[2] ?? x[1], cm = inComment(src, m.index); if (!pre.startsWith('.')) { computed.push({ file: r, arg: arg.slice(0, 120), status: cm ? 'comment' : 'unresolved', why: 'the literal part is not a relative path' }); continue; }
          const abs = path.resolve(dir, pre);
          if (cm && !(pre.endsWith('/') ? isDir(abs) : isDir(path.dirname(abs)))) { computed.push({ file: r, arg: arg.slice(0, 120), status: 'comment' }); continue; }
          if (pre.endsWith('/') && isDir(abs)) {
            const idx = path.join(abs, 'index.mjs'), list = indexList(idx), all = walk(abs).filter(f => CODE_EXT.test(f) && !SKIP_IN_FOLDERS.test(rel(f)));
            const loaded = list ? list.map(n => path.resolve(abs, n)) : all;
            if (list) { if (ship(idx, `${why} (the list of ${rel(abs)}/)`)) follow(idx, mode, why); } else if (all.length) notes.push(`no plain list in ${rel(idx)}: every module of ${rel(abs)}/ counts as loaded (${r})`);
            for (const f of loaded) { if (isFile(f)) { if (ship(f, `${why} (${list ? 'listed by ' + rel(idx) : 'every module of ' + rel(abs) + '/'})`)) follow(f, mode, why); } else (fatal ? problems : notes).push(`missing: ${rel(f)} (listed by ${rel(idx)}, loaded by ${r})`); }
            for (const f of all) if (ship(f, `module of ${rel(abs)}/ (${why})`) && !loaded.includes(f) && f !== idx) later.push({ f, mode: 'shipped', why });
            computed.push({ file: r, arg: arg.slice(0, 120), status: 'folder', folder: rel(abs) + '/', index: list ? rel(idx) : null, modules: loaded.map(rel).sort() });
          } else if (pre.endsWith('/')) { notes.push(`folder of a computed import does not exist yet: ${rel(abs)}/ (${r})`); computed.push({ file: r, arg: arg.slice(0, 120), status: 'folder-missing', folder: rel(abs) + '/' }); }
          else { ref(abs, why, { mode, kind: 'prefix', missing: 'note' }); computed.push({ file: r, arg: arg.slice(0, 120), status: 'prefix', prefix: rel(abs) }); }
          continue;
        }
        if (/^`[^`$]*`/.test(arg)) { const s = arg.slice(1, arg.indexOf('`', 1)); if (s.startsWith('.')) ref(path.resolve(dir, s), why, { mode, missing: 'note' }); continue; }
        if (/^(?:\(?\s*)?(?:[\w$]+\.)*(?:URLS|urls)\.[A-Za-z_]\w*\s*\+\s*['"`]/.test(arg)) { computed.push({ file: r, arg: arg.slice(0, 120), status: 'address' }); continue; }   // URLS.proto + 'src/webgl2.mjs': followed below
        const known = cfg.knownComputed.find(k => k.file.test(r) && k.arg.test(arg));
        computed.push({ file: r, arg: arg.slice(0, 120), status: known ? 'reviewed' : inComment(src, m.index) ? 'comment' : 'unresolved', ...(known ? { covered: known.covered } : {}) });
      }
    }
    const keyBase = (obj, key, why) => { const b = cfg.urlKeys[key]; if (b == null) { (obj === 'URLS' && fatal ? problems : notes).push(`unknown ${obj} key ${key} in ${r}`); return null; } return path.join(root, b); };
    for (const m of src.matchAll(URLS_CAT_RE)) { const why = `${m[1]}.${m[2]} in ${r}`, base = keyBase(m[1], m[2], why); if (base) address(base, m[4] ?? m[5], m[4] == null, !!m[6], why, { mode, missing: inComment(src, m.index) ? 'note' : 'problem' }); }
    for (const m of src.matchAll(URLS_TPL_RE)) { const why = `${m[1]}.${m[2]} template in ${r}`, base = keyBase(m[1], m[2], why); if (base) address(base, m[3], true, false, why, { mode, missing: inComment(src, m.index) ? 'note' : 'problem' }); }
    for (const m of src.matchAll(META_URL_RE)) {
      const text = m[2] ?? m[3]; if (!/^\.\.?(\/|$)/.test(text)) { if (!EXTERNAL.test(text) && text !== '') address(dir, text, m[2] == null, !!m[4], `new URL in ${r}`, { mode, missing: 'note' }); continue; }
      address(dir, text === '.' ? './' : text, m[2] == null, !!m[4], `new URL in ${r}`, { mode, missing: inComment(src, m.index) ? 'note' : 'problem' });
    }
    // addresses the browser resolves against the page (fetch('data/x.json'), new Worker('w.js')): tried against every page folder and the file's own folder; never a problem by itself
    const docRef = (text, isTpl, concat, why) => { if (EXTERNAL.test(text)) { if (/^https?:|^\/\//i.test(text)) external.add(`${text} (${why})`); return; } if (!/[/.]/.test(text)) return; let hit = false;
      for (const d of new Set([...docDirs, dir])) { const t = isTpl ? tpl(text) : { prefix: text, hole: false, suffix: '' }, q = cut(t.prefix), abs = text.startsWith('/') ? path.join(root, q) : path.resolve(d, q); if (q && (isFile(abs) || isDir(abs) || ((t.hole || concat) && isDir(path.dirname(abs))))) hit = address(text.startsWith('/') ? root : d, text.startsWith('/') ? text.slice(1) : text, isTpl, concat, why, { mode, missing: null }) || hit; }
      if (!hit) notes.push(`not found from any page folder: ${text.slice(0, 100)} (${why})`); };
    for (const m of src.matchAll(DOC_REF_RE)) docRef(m[3] ?? m[4], m[3] == null, !!m[5], `${m[1].replace(/\s+/g, ' ')}() in ${r}`);
    for (const m of src.matchAll(SRC_ASSIGN_RE)) docRef(m[2], false, false, `address assigned in ${r}`);
    if (fatal) { const specs = new Set(isModule ? [...src.matchAll(IMPORT_RE)].map(m => m[1] ?? m[2]) : []); for (const m of src.matchAll(LITERAL_RE)) if (!EXTERNAL.test(m[2]) && !specs.has(m[2])) literals.push({ literal: m[2], file: r, comment: inComment(src, m.index) }); }
  }
  function scanCss(file, mode = 'reached') {
    if (seenCss.has(file)) return; seenCss.add(file); const src = fs.readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, ''), r = rel(file);
    for (const m of src.matchAll(CSS_URL_RE)) { const s = (m[2] ?? m[4]).trim(); if (EXTERNAL.test(s)) { if (/^https?:|^\/\//i.test(s)) external.add(`${s} (style sheet ${r})`); continue; } ref(s.startsWith('/') ? path.join(root, cut(s)) : path.resolve(path.dirname(file), cut(s)), `style sheet ${r}`, { mode }); }
  }
  const attr = (tag, name) => { const m = new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i').exec(tag); return m ? (m[1] ?? m[2] ?? m[3]) : null; };
  function scanPage(file) {
    if (seenPage.has(file)) return; seenPage.add(file); if (!ship(file, 'page')) return;
    const html = fs.readFileSync(file, 'utf8').replace(/<!--[\s\S]*?-->/g, ''), r = rel(file), dir = path.dirname(file); pageDirs.add(dir);
    const local = (s, why, o = {}) => { if (s == null || s === '' || EXTERNAL.test(s)) { if (s && /^https?:|^\/\//i.test(s)) external.add(`${s} (${why})`); return; } const abs = s.startsWith('/') ? path.join(root, cut(s)) : path.resolve(dir, cut(s)); if (!inRoot(abs)) return notes.push(`leaves the packed folder: ${s} (${why})`); if (isDir(abs)) { const idx = path.join(abs, 'index.html'); return isFile(idx) ? scanPage(idx) : notes.push(`folder link without an index page: ${s} (${why})`); } if (/\.html?$/i.test(abs) && isFile(abs)) return scanPage(abs); ref(abs, why, o); };
    for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
      const type = (attr(m[1], 'type') || '').toLowerCase(), src = attr(m[1], 'src');
      if (type === 'importmap') { let j = null; try { j = JSON.parse(m[2]); } catch { problems.push(`import map of ${r} does not parse`); } for (const [k, v] of Object.entries({ ...(j && j.imports), ...Object.assign({}, ...Object.values((j && j.scopes) || {})) })) { if (EXTERNAL.test(v)) { external.add(`${v} (import map of ${r})`); continue; } const abs = v.startsWith('/') ? path.join(root, v) : path.resolve(dir, v); importMap.set(k, abs); if (!k.endsWith('/')) ref(abs, `import map of ${r} (${k})`, {}); else if (isDir(abs)) shipDir(abs, `import map of ${r} (${k})`); } continue; }
      if (src) local(src, `script of ${r}`); else if (!type || /module|javascript/.test(type)) scanCode(m[2], file, 'reached', type === 'module');
    }
    for (const m of html.matchAll(/<link\b([^>]*)>/gi)) { const h = attr(m[1], 'href'), relAttr = (attr(m[1], 'rel') || '').toLowerCase(); if (h && !/^(canonical|alternate|dns-prefetch|preconnect)$/.test(relAttr)) local(h, `${relAttr || 'link'} of ${r}`); }
    for (const m of html.matchAll(/<(?:img|source|audio|video|track|embed|iframe|input|object|use|image)\b([^>]*)>/gi)) { for (const a of ['src', 'poster', 'data', 'href', 'xlink:href']) { const v = attr(m[1], a); if (v) local(v, `${a} in ${r}`); } const ss = attr(m[1], 'srcset'); if (ss) for (const part of ss.split(',')) local(part.trim().split(/\s+/)[0], `srcset in ${r}`); }
    for (const m of html.matchAll(/<a\b([^>]*)>/gi)) { const h = attr(m[1], 'href'); if (h) local(h, `link in ${r}`, { missing: 'problem' }); }
    for (const m of html.matchAll(/<meta\b([^>]*)>/gi)) if (/refresh/i.test(attr(m[1], 'http-equiv') || '')) { const u = /url\s*=\s*['"]?([^'";]+)/i.exec(attr(m[1], 'content') || ''); if (u) local(u[1].trim(), `refresh in ${r}`); }
    for (const m of html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>|\bstyle\s*=\s*"([^"]*)"/gi)) for (const u of (m[1] ?? m[2]).matchAll(CSS_URL_RE)) { const s = (u[2] ?? u[4]).trim(); if (!EXTERNAL.test(s)) local(s, `style in ${r}`); }
  }
  // an index file of a static section: every string in it that names a file of the site is followed (the per-unit files a page loads on demand)
  function scanJson(file, sectionRoot) {
    if (seenJson.has(file)) return; seenJson.add(file); let j; try { j = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return notes.push(`does not parse as JSON: ${rel(file)}`); }
    const re = new RegExp(String.raw`^(?:\.{0,2}\/)?[\w@.-]+(?:\/[\w@.-]+)*\.(?:${FILE_EXT})$`), r = rel(file), miss = new Set();
    const visit = v => { if (typeof v === 'string') { if (v.length < 300 && re.test(v)) { const hit = [path.dirname(file), sectionRoot].map(d => path.resolve(d, v)).find(isFile); if (hit) { if (inRoot(hit) && ship(hit, `listed in ${r}`) && /\.json$/i.test(hit)) scanJson(hit, sectionRoot); } else miss.add(v); } } else if (Array.isArray(v)) v.forEach(visit); else if (v && typeof v === 'object') Object.values(v).forEach(visit); };
    visit(j); if (miss.size) notes.push(`${miss.size} file name(s) in ${r} do not resolve beside it or in the section (e.g. ${[...miss].slice(0, 3).join(', ')})`);
  }

  // ---- 1. pages, 2. the modules they load
  for (const p of cfg.pages) { const abs = path.join(root, p); if (isFile(abs)) scanPage(abs); else problems.push(`missing: ${p} (page)`); }
  const sections = [];
  for (const s of cfg.sections) { const abs = path.join(root, s); if (!isDir(abs)) continue; const all = walk(abs).filter(f => !SKIP_IN_FOLDERS.test(rel(f))); sections.push({ path: s, files: all.length, pages: all.filter(f => /\.html?$/i.test(f)).map(rel) });
    for (const f of all) if (/\.html?$/i.test(f)) scanPage(f);
    for (const f of all) { if (!ship(f, `section ${s}`)) continue; if (CODE_EXT.test(f)) reached.push({ f, mode: 'reached', why: `section ${s}` }); else if (/\.css$/i.test(f)) scanCss(f); }
    for (const f of all) if (/\.json$/i.test(f)) scanJson(f, abs);
  }
  const drain = q => { while (q.length) { const { f, mode } = q.shift(); const was = seenMod.get(f); if (was === 'reached' || was === mode) continue; seenMod.set(f, mode); if (!isFile(f)) continue; scanCode(fs.readFileSync(f, 'utf8'), f, mode, true); } };
  drain(reached);
  // ---- 5. folders that ship whole; then the modules that are shipped without being known to be loaded (their own references are followed too: a superset)
  for (const d of cfg.shipWhole) { const abs = path.join(root, d); if (isDir(abs)) shipDir(abs, `folder shipped whole: ${d}`); else problems.push(`missing: ${d} (SHIP_WHOLE)`); }
  for (const d of cfg.extraDirs) { const abs = path.join(root, d); if (isDir(abs)) shipDir(abs, 'EXTRA_DIRS'); else problems.push(`missing: ${d} (EXTRA_DIRS)`); }
  for (const d of cfg.include) { const abs = path.join(root, d); if (isDir(abs)) shipDir(abs, 'INCLUDE'); else if (isFile(abs)) ship(abs, 'INCLUDE'); else problems.push(`missing: ${d} (INCLUDE)`); }
  for (let guard = 0; (reached.length || later.length) && guard < 1e4; guard++) { drain(reached); const l = later.splice(0); drain(l); }
  for (const d of cfg.exclude) { const abs = path.join(root, d); for (const f of [...files.keys()]) if (f === abs || f.startsWith(abs + path.sep)) files.delete(f); }
  // ---- working files that are shipped reduced: every shipped module that names one must be a listed reader, reading it the listed way
  const projected = [];
  for (const p of cfg.project) { const abs = path.join(root, p.path); if (!files.has(abs)) continue; const base = path.basename(p.path); let ok = true;
    for (const f of files.keys()) { if (!/\.(mjs|js|html?)$/i.test(f)) continue; const src = fs.readFileSync(f, 'utf8'); if (!src.includes(base)) continue; const rd = p.readers.find(x => x.file === rel(f));
      if (!rd) { ok = false; problems.push(`${p.path} is shipped reduced to [${p.keep}] and ${rel(f)} names it: add the reader to PROJECT after checking which fields it reads`); }
      else if (!rd.use.test(src)) { ok = false; problems.push(`${p.path} is shipped reduced to [${p.keep}] and ${rel(f)} no longer reads it the listed way: review PROJECT`); } }
    if (ok) projected.push({ path: p.path, keeps: p.keep, why: p.why }); }
  // ---- file-like literals of loaded modules that the build does not contain (a base-path load the scan cannot follow would show up here)
  const shipped = [...files.keys()].map(rel).sort(), tails = new Set(); for (const r of shipped) { const seg = r.split('/'); for (let i = 0; i < seg.length; i++) tails.add(seg.slice(i).join('/')); }
  const held = new Set(); for (const w of withheld.values()) for (const r of w.files) { const seg = r.split('/'); for (let i = 0; i < seg.length; i++) held.add(seg.slice(i).join('/')); }
  const unshipped = new Map(); for (const l of literals) { const k = l.literal.replace(/^(?:\.{0,2}\/)+/, ''); if (tails.has(k)) continue; const id = `${k} in ${l.file}`; if (!unshipped.has(id)) unshipped.set(id, { literal: l.literal, file: l.file, comment: l.comment, withheld: held.has(k) }); }
  const why = {}; for (const [f, s] of files) why[rel(f)] = [...s].sort();
  return { root, files: shipped, problems: [...new Set(problems)], notes: [...new Set(notes)].sort(), why, urlKeys: cfg.urlKeys,
    withheld: [...withheld.values()].map(w => ({ id: w.id, pattern: w.pattern, why: w.why, files: w.files.size, referencedBy: [...w.referencedBy].sort() })),
    projected, sections, pages: [...seenPage].map(rel).sort(), modules: { loaded: [...seenMod].filter(([, m]) => m === 'reached').map(([f]) => rel(f)).sort(), shippedOnly: [...seenMod].filter(([f, m]) => m === 'shipped' && files.has(f)).map(([f]) => rel(f)).sort() },
    computedImports: computed, unshippedLiterals: [...unshipped.values()].sort((a, b) => (a.file + a.literal < b.file + b.literal ? -1 : 1)), external: [...external].sort() };
}

// ---- transforms of the files that differ from the repository copy
const STAMP_STYLE = 'position:fixed;left:8px;bottom:6px;z-index:2147483000;font:11px/1.3 ui-monospace,Menlo,Consolas,monospace;color:#c9c9d6;background:rgba(13,13,24,.72);padding:2px 7px;border-radius:4px;pointer-events:none';
export const stampHTML = v => `<div id="bt-build-stamp" style="${STAMP_STYLE}" aria-label="Build version">Battle Theatre staging build ${v}</div>`;
function transformIndex(html, v) {
  let o = html;
  const rep = (re, b, what) => { if (!re.test(o)) throw new Error('app/index.html no longer contains ' + what); o = o.replace(re, b); };
  rep(/<meta name="bt-home" content="[^"]*">/, '<meta name="bt-home" content="../">', 'the bt-home meta tag');
  rep(/(id="home-link"\s+href=")[^"]*"/, '$1../"', 'the home link');
  if (/<meta name="robots"/i.test(o)) rep(/<meta name="robots"[^>]*>/i, '<meta name="robots" content="noindex, nofollow">', 'the robots meta tag');
  else rep(/(<meta name="color-scheme"[^>]*>|<meta charset="[^"]*">)/, '$1\n<meta name="robots" content="noindex, nofollow">', 'a meta tag to put the robots tag after');
  rep(/<\/body>/, stampHTML(v) + '\n</body>', 'the end of the body');
  return o;
}
function projectJson(buf, keep, name) {
  const j = JSON.parse(buf.toString('utf8')); if (!Array.isArray(j)) throw new Error(name + ' is not a list: PROJECT cannot reduce it');
  return Buffer.from(JSON.stringify(j.map(e => Object.fromEntries(keep.filter(k => k in e).map(k => [k, e[k]])))) + '\n');
}
const rootIndex = v => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow"><meta http-equiv="refresh" content="0; url=app/index.html"><link rel="canonical" href="app/index.html">
<title>Battle Theatre (staging)</title>
<style>:root{color-scheme:dark}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0d0d18;color:#e6e6f0;font:16px/1.5 system-ui,sans-serif}main{padding:16px;max-width:34rem}a{color:#8fb8ff}small{color:#9a9ab0}</style></head>
<body><main><h1>Battle Theatre</h1><p>This is a staging copy for testing. <a href="app/index.html">Open the Battle Theatre</a>.</p><small>Staging build ${v}</small></main></body></html>
`;
const HEADERS = `# Staging copy: keep out of search engines, always revalidate (Netlify serves a content ETag, so unchanged files return 304).
/*
  X-Robots-Tag: noindex, nofollow
  X-Content-Type-Options: nosniff
  Referrer-Policy: no-referrer
  Cache-Control: public, max-age=0, must-revalidate

/*.mjs
  Content-Type: text/javascript; charset=utf-8
/*.jsonl
  Content-Type: application/x-ndjson; charset=utf-8
/*.bin
  Content-Type: application/octet-stream
# No Cross-Origin-Opener-Policy / Cross-Origin-Embedder-Policy: the shell uses no SharedArrayBuffer and no cross-origin isolation.
`;
const TOML = `# Static site, no build step: drop the folder or the zip.
[build]
  publish = "."
[[redirects]]
  from = "/"
  to = "/app/index.html"
  status = 200
`;

// ---- deterministic zip (stored order = sorted, fixed timestamp 1980-01-01, deflate level 9)
export function makeZip(entries) {   // entries: [{name, data}] sorted by caller
  const parts = [], central = []; let off = 0;
  for (const { name, data } of entries) {
    const nm = Buffer.from(name), raw = data, def = zlib.deflateRawSync(raw, { level: 9 }), useDef = def.length < raw.length, body = useDef ? def : raw, crc = zlib.crc32(raw);
    const lh = Buffer.alloc(30); lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0x0800, 6); lh.writeUInt16LE(useDef ? 8 : 0, 8); lh.writeUInt16LE(0, 10); lh.writeUInt16LE(0x21, 12);
    lh.writeUInt32LE(crc, 14); lh.writeUInt32LE(body.length, 18); lh.writeUInt32LE(raw.length, 22); lh.writeUInt16LE(nm.length, 26); lh.writeUInt16LE(0, 28);
    parts.push(lh, nm, body);
    const ch = Buffer.alloc(46); ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(0x0800, 8); ch.writeUInt16LE(useDef ? 8 : 0, 10); ch.writeUInt16LE(0, 12); ch.writeUInt16LE(0x21, 14);
    ch.writeUInt32LE(crc, 16); ch.writeUInt32LE(body.length, 20); ch.writeUInt32LE(raw.length, 24); ch.writeUInt16LE(nm.length, 28); ch.writeUInt32LE(0o100644 << 16 >>> 0, 38); ch.writeUInt32LE(off, 42);
    central.push(ch, nm); off += 30 + nm.length + body.length;
  }
  const cd = Buffer.concat(central), end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10); end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(off, 16);
  return Buffer.concat([...parts, cd, end]);
}

// ---- copy audit: nothing in the shipped files may say how the site was made (GOVERNANCE/FINAL-ACCEPTANCE.md, copy audit rules)
// names of tools and makers; statements that a file was made by a tool; the word "agent" where it means a maker of the site (not a figure of the simulation, not a person of 1863);
// markers of internal notes. Case-insensitive.
export const AUDIT_RE = new RegExp([
  String.raw`\b(claude|anthropic|chatgpt|openai|gpt-?\d|(?:large )?language models?|LLMs?|subagents?|sub-agents?|artificial intelligence|AI[- ](?:generated|assisted|written|made|built|reviewed)|(?:generated|written|built|made|reviewed|authored) (?:by|with) (?:an? )?(?:AI|automated|machine))\b`,
  String.raw`\b(?:(?:auto-?|machine-)?generated|written|built|produced|made|derived|exported) (?:by|with|from) (?:the |a |an )?(?:(?:[\w.-]+\/)*tools\/|script|generator|build script|program)`,
  String.raw`\b(?:auto-?|machine-)?(?:generated|produced) (?:by|with|from) (?:the |a |an )?[\w./-]+\.(?:py|mjs|cjs|js|sh)\b`,
  String.raw`"generated(?:_?(?:at|by|on|from))?"\s*:`,
  String.raw`do not edit by hand|\bhand-edit`,
  String.raw`\b(?:earlier|previous|prior|another|research|review(?:ing)?|coding|scout|background|worker|parallel|automated|independent)[ -]agents?\b`,
  String.raw`\bagents?(?:'s|’s)?[ -](?:read|reads|reading|re-?read|trace[ds]?|tracing|recommendations?|recommend(?:s|ed)?|propos(?:es|ed|al)|found|finds|findings?|pass(?:es)?|runs?|ran|sessions?|briefs?|reports?|reported|notes?|noted|wrote|output|lookups?|search(?:es|ed)?|check(?:s|ed)?|verified|review(?:s|ed)?|extract(?:s|ed|ion)?|transcri(?:bed|ption)|summar(?:y|ies|i[sz]ed)|opened|fetched|could not|cannot|did not|was unable|decided|chose|judged|estimated|guess(?:ed)?)\b`,
  String.raw`\bby (?:an|the|another|each|one) agent\b`,
  String.raw`\bautomated (?:by|reads?|fetch(?:es|ing)?|lookups?|review(?:s|ers?)?|pass(?:es)?|sub-?agents?|agents?|sessions?|pipeline|research(?:ers?)?)\b`,
  String.raw`\bowner to confirm\b`,
].join('|'), 'i');
// the two letters as a word (case-sensitive, between spaces or punctuation)
export const AUDIT_CS_RE = /(?:^|[\s("'“‘>\[])(AI|A\.I\.)(?=$|[\s)."'”’,;:!?<\]])/;
// names that are searched in binary files too (image and audio metadata)
export const AUDIT_BIN_RE = /claude|anthropic|chatgpt|openai|midjourney|stable.diffusion/i;
// reviewed exceptions: { file: RegExp on the shipped path, text: RegExp on the line, why }. A line that matches one is not a hit.
export const AUDIT_ALLOW = [];
// words of the working process that name no tool: counted and reported with every pack (not a failing hit), so that the acceptance copy audit can rule on them
export const AUDIT_REVIEW_RE = /\b(workstreams?|horde|shards?|task brief|research session|this session|later session|our pass|this pass)\b/gi;
const BINARY = /\.(jpe?g|png|bin|zip|webp|gif|glb|wav|ogg|mp3|m4a|flac|woff2?|ttf|otf|wasm|ktx2|pdf)$/i;
export function audit(dist) {
  const hits = [];
  for (const f of walk(dist)) {
    const rel = posix(path.relative(dist, f)); if (AUDIT_RE.test(rel)) hits.push({ file: rel, where: 'name' });
    if (BINARY.test(f)) { const m = AUDIT_BIN_RE.exec(fs.readFileSync(f).toString('latin1')); if (m) hits.push({ file: rel, where: 'binary', match: m[0] }); continue; }
    const lines = fs.readFileSync(f, 'utf8').split('\n');
    for (let i = 0; i < lines.length; i++) { const L = lines[i], m = AUDIT_RE.exec(L) || AUDIT_CS_RE.exec(L); if (!m) continue; if (AUDIT_ALLOW.some(a => a.file.test(rel) && a.text.test(L))) continue; hits.push({ file: rel, line: i + 1, match: (m[1] && m[0].length <= 4 ? m[1] : m[0]).trim(), text: L.slice(Math.max(0, m.index - 50), m.index + 80) }); }
  }
  return hits;
}
export function auditReview(dist) {
  const out = {};
  for (const f of walk(dist)) { if (BINARY.test(f)) continue; const rel = posix(path.relative(dist, f)); for (const m of fs.readFileSync(f, 'utf8').matchAll(AUDIT_REVIEW_RE)) { const k = m[1].toLowerCase().replace(/^(workstream|shard)s$/, '$1'), o = out[k] || (out[k] = { count: 0, files: {} }); o.count++; o.files[rel] = (o.files[rel] || 0) + 1; } }
  return out;
}

export function pack({ root = BT, out = path.join(REPO, 'deliver/bt-staging/dist'), zipDir = path.join(REPO, 'deliver'), zip = true, cfg } = {}) {
  root = path.resolve(root); const t = trace({ root, cfg }), { files, problems } = t; if (problems.length) throw new Error('trace problems:\n' + problems.join('\n'));
  const proj = new Map(t.projected.map(p => [p.path, p]));
  const build = v => {
    const m = new Map();
    for (const r of files) { const b = fs.readFileSync(path.join(root, r)); m.set(r, r === 'app/index.html' ? Buffer.from(transformIndex(b.toString('utf8'), v)) : proj.has(r) ? projectJson(b, proj.get(r).keeps, r) : b); }
    m.set('index.html', Buffer.from(rootIndex(v))); m.set('_headers', Buffer.from(HEADERS)); m.set('netlify.toml', Buffer.from(TOML)); return m;
  };
  // the version names the bytes of the build: every emitted file (with the stamp left blank), so two different builds never share a name
  const blank = build('00000000'), version = sha(Buffer.from([...blank.keys()].sort().map(r => r + ' ' + sha(blank.get(r))).join('\n'))).slice(0, 8), emitted = build(version);
  fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });
  const manifest = { name: 'Battle Theatre staging', version, source: 'docs/battle-theatre', files: [...emitted].map(([r, b]) => ({ path: r, bytes: b.length, sha256: sha(b) })).sort((a, b) => a.path < b.path ? -1 : 1),
    notLoadedByShell: NOT_LOADED, withheld: t.withheld.map(w => ({ pattern: w.pattern, files: w.files, why: w.why })), reduced: t.projected.map(p => ({ path: p.path, keeps: p.keeps, why: p.why })) };
  emitted.set('MANIFEST.json', Buffer.from(JSON.stringify(manifest, null, 1) + '\n'));
  const names = [...emitted.keys()].sort();
  for (const n of names) { const p = path.join(out, n); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, emitted.get(n)); }
  const count = re => files.filter(f => re.test(f)).length;
  const res = { version, out, files: names.length, bytes: names.reduce((a, n) => a + emitted.get(n).length, 0), traced: files,
    counts: { modules: count(/^app\/src\/.*\.mjs$/), modulesLoaded: t.modules.loaded.length, appData: count(/^app\/data\//), sectionFiles: t.sections.reduce((a, s) => a + s.files, 0), renderer: count(/^render\//), other: files.length - count(/^app\/src\/.*\.mjs$/) - count(/^app\/data\//) - count(/^render\//) },
    trace: { notes: t.notes, withheld: t.withheld, projected: t.projected, sections: t.sections, pages: t.pages, modules: t.modules, computedImports: t.computedImports, unshippedLiterals: t.unshippedLiterals, external: t.external, why: t.why } };
  res.audit = audit(out); res.auditReview = auditReview(out);
  if (zip) {   // a build that fails the copy audit never gets the clean name: the name says so (the owner decides what to do with it; GOVERNANCE/FINAL-ACCEPTANCE.md accepts only a clean one)
    const zbuf = makeZip(names.map(name => ({ name, data: emitted.get(name) }))), zn = `gettysburg-BT-staging-${version}${res.audit.length ? '-AUDIT-HITS-' + res.audit.length : ''}.zip`; fs.mkdirSync(zipDir, { recursive: true });
    fs.writeFileSync(path.join(zipDir, zn), zbuf); res.zip = path.join(zipDir, zn); res.zipBytes = zbuf.length; res.zipSha256 = sha(zbuf);
    fs.writeFileSync(res.zip + '.sha256', `${res.zipSha256}  ${zn}\n`);
  }
  res.clean = res.audit.length === 0;
  // the trace report sits beside the dist, never inside it
  fs.writeFileSync(path.join(path.dirname(out), 'trace-report.json'), JSON.stringify({ version, zip: res.zip ? path.basename(res.zip) : null, zipBytes: res.zipBytes, zipSha256: res.zipSha256, files: res.files, bytes: res.bytes, counts: res.counts, ...res.trace, audit: res.audit, auditReview: res.auditReview }, null, 1) + '\n');
  return res;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const a = process.argv.slice(2), opt = k => { const i = a.indexOf(k); return i >= 0 ? path.resolve(a[i + 1]) : undefined; };
  const r = pack({ out: opt('--out'), zipDir: opt('--zip-dir'), zip: !a.includes('--no-zip') }), t = r.trace;
  const review = Object.fromEntries(Object.entries(r.auditReview).map(([k, v]) => [k, v.count]));
  console.log(JSON.stringify({ version: r.version, out: r.out, files: r.files, bytes: r.bytes, zip: r.zip, zipBytes: r.zipBytes, zipSha256: r.zipSha256, clean: r.clean, counts: r.counts, pages: t.pages.length, sections: t.sections.map(s => `${s.path} (${s.files} files)`),
    withheld: t.withheld.map(w => `${w.pattern}: ${w.files} files`), reduced: t.projected.map(p => p.path), computedImports: t.computedImports.filter(c => c.status !== 'address').map(c => `${c.status}: ${c.file}: ${c.arg}`),
    unshippedLiterals: t.unshippedLiterals.length, external: t.external, notes: t.notes.length, auditHits: r.audit.length, internalWordsForReview: review }, null, 1));
  console.log('trace report: ' + path.join(path.dirname(r.out), 'trace-report.json'));
  if (r.audit.length) { console.error('COPY AUDIT HITS:'); for (const h of r.audit) console.error(' ', JSON.stringify(h)); console.error(`NOT AN ACCEPTABLE BUILD: ${r.audit.length} hit(s). ${r.zip ? 'The zip carries "-AUDIT-HITS-' + r.audit.length + '" in its name so that it is never taken for a clean one. ' : ''}Fix the source file named by each hit (or ask its owner), then pack again.`); process.exit(2); }
}
