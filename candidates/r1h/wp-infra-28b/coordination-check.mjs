// Do the anchors of this group stay clear of the text that the other groups of train R1h change in watch-together.html?
//
//   node candidates/r1h/wp-infra-28b/coordination-check.mjs [--out candidates/r1h/wp-infra-28b/evidence/coordination.json]
//
// Two checks, both read-only:
//  1. every other candidates/r1h/*/group.json that patches watch-together.html is applied to the R1g page in the order the builder uses for
//     PG groups (sorted by group name) together with this one, in both orders where the builder would allow it: every anchor must be found
//     exactly `expect` times when its turn comes.  With no such group on disk the result says so (nothing is claimed about groups that do not exist yet).
//  2. the text that the plan gives to wp-content-09b (every TICK label and every REALTIME hit except the Live Sync sentence): the copy lint's
//     findings of TICK and REALTIME on the R1g page are located in the file; none may lie inside an anchor of this group, except the
//     REALTIME hit of the Live Sync sentence, which is this group's.  Head tags (wp-seo-04b) and the footer mount (wp-seo-11b) are checked by
//     their known text.
import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { buildGroup, BASE_PAGE, GROUP_NAME } from './gen.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..', '..');
const argv = process.argv.slice(2);
const OUT = path.resolve(REPO, argv.includes('--out') ? argv[argv.indexOf('--out') + 1] : 'candidates/r1h/wp-infra-28b/evidence/coordination.json');
const page = fs.readFileSync(path.join(REPO, BASE_PAGE), 'utf8');
const mine = buildGroup('later');
const result = { when: new Date().toISOString(), siblings: [], foreignHits: [], problems: [] };
const problem = (m) => { result.problems.push(m); console.log('  PROBLEM ' + m); };

const spans = mine.patches.map((p) => { const a = page.indexOf(p.find); return { id: p.id, a, b: a + p.find.length }; });
const lineOf = (i) => page.slice(0, i).split('\n').length;

// ---- 1. sibling groups on disk
const groups = [{ name: mine.group, patches: mine.patches }];
for (const d of fs.readdirSync(path.join(REPO, 'candidates', 'r1h'))) {
  if (d.startsWith('_') || d === 'wp-infra-28b') continue;
  const f = path.join(REPO, 'candidates', 'r1h', d, 'group.json');
  if (!fs.existsSync(f)) continue;
  let g; try { g = JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { problem(`${d}/group.json is not JSON: ${e.message}`); continue; }
  const onPage = (g.patches || []).filter((p) => p.target === 'watch-together.html');
  if (!onPage.length) continue;
  groups.push({ name: g.group, patches: onPage });
  result.siblings.push({ dir: d, group: g.group, patchesOnThePage: onPage.length });
}
if (groups.length === 1) result.note1 = 'no other group on disk patches watch-together.html at the time of this run: nothing is claimed about groups that do not exist yet';
else {
  const order = [...groups].sort((x, y) => (x.name < y.name ? -1 : 1));       // the builder applies PG groups in file-name order
  let text = page;
  for (const g of order) for (const p of g.patches) {
    const n = p.regex ? [...text.matchAll(new RegExp(p.find, 'g'))].length : text.split(p.find).length - 1;
    if (n !== p.expect) problem(`${g.name} / ${p.id}: found ${n} times, expected ${p.expect}, when applied after ${order.slice(0, order.indexOf(g)).map((x) => x.name).join(', ') || 'nothing'}`);
    else text = p.regex ? text.replace(new RegExp(p.find, 'g'), p.repl) : text.split(p.find).join(p.repl);
  }
  result.appliedInOrder = order.map((g) => g.name);
}

// ---- 2. the text that belongs to wp-content-09b
const lint = cp.spawnSync(process.execPath, ['tools/copy/copy_lint.mjs', BASE_PAGE, '--no-baseline', '-v', '--rules', 'TICK,REALTIME'], { cwd: REPO, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
const lines = page.split('\n');
const offsets = []; { let o = 0; for (const l of lines) { offsets.push(o); o += l.length + 1; } }
for (const m of lint.stdout.matchAll(/^\s+(TICK|REALTIME) \S+?:(\d+) "([^"]*)"/gm)) {
  const line = Number(m[2]); const needle = m[3];
  // the lint counts the first line of a multi-line element: search this line and the next three
  let at = -1, found = null;
  for (let k = line - 1; k < Math.min(lines.length, line + 3); k++) { const j = lines[k].toLowerCase().indexOf(needle.toLowerCase()); if (j >= 0) { at = offsets[k] + j; found = k + 1; break; } }
  if (at < 0) { result.foreignHits.push({ rule: m[1], line, text: needle, located: false }); continue; }
  const inside = spans.filter((s) => at >= s.a && at + needle.length <= s.b);
  const sentence = inside.some((s) => s.id.endsWith('-sentence'));
  result.foreignHits.push({ rule: m[1], line: found, text: needle, insideAnchors: inside.map((s) => s.id), thisGroupsOwn: sentence });
  if (inside.length && !sentence) problem(`the ${m[1]} hit "${needle}" at line ${found} lies inside the anchor ${inside.map((s) => s.id).join(', ')}`);
}
// the head tags of wp-seo-04b and the footer mount of wp-seo-11b
for (const [who, needle] of [['wp-seo-04b', '<meta property="og:'], ['wp-seo-04b', '<meta name="twitter:'], ['wp-seo-04b', '<meta name="description"'], ['wp-seo-11b', '<div id="gtbg-footer-mount"></div>']]) {
  let from = 0, i;
  while ((i = page.indexOf(needle, from)) >= 0) { from = i + 1; const inside = spans.filter((s) => i >= s.a && i < s.b); if (inside.length) problem(`${who}'s text "${needle}" lies inside ${inside[0].id}`); }
}
result.anchors = spans.map((s) => ({ id: s.id, lines: `${lineOf(s.a)}-${lineOf(s.b - 1)}` }));
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(result, null, 1) + '\n');
console.log(`${result.siblings.length} sibling group(s) patching the page found on disk; ${result.foreignHits.length} TICK/REALTIME hits located, ${result.foreignHits.filter((h) => h.insideAnchors && h.insideAnchors.length).length} inside an anchor (${result.foreignHits.filter((h) => h.thisGroupsOwn).length} of them this group's own sentence); problems: ${result.problems.length}`);
process.exit(result.problems.length ? 1 : 0);
