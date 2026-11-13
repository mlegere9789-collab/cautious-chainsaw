#!/usr/bin/env node
// Mutation check of the harness's own tests. A test that never fails when the rule it names is removed does not test the rule (the review of the first harness found five rules that could be removed with every
// test still green). For every mutation of mutations.json (a snippet of the harness, exactly once in its file, and what replaces it: a rule removed, a limit changed, a default weakened) this makes a scratch
// copy of the harness (tree.mjs), applies the mutation there, and runs the tests of the copy (tests/governance/realize*.test.mjs). A mutation is KILLED when some test fails, SURVIVES when every test passes.
// A survivor is a rule without a test, or an equivalent mutant; the file says which and why (SURVIVORS in the output, `notes`). Nothing is written into the real tree except the report.
//
//   node tools/bt/realize/mutate.mjs --check               every snippet occurs exactly once in its file (no tests are run)
//   node tools/bt/realize/mutate.mjs                       all mutations; the report is GOVERNANCE/realizations/MUTATION-CHECK.json (written after every mutation, so an interrupted run keeps what it did)
//   node tools/bt/realize/mutate.mjs --only id1,id2        some mutations (the report keeps the results of the others); --resume runs only those with no result yet
//   node tools/bt/realize/mutate.mjs --survivors           only those that survived in the report
// Each mutation runs realize-rules.test.mjs first, then realize.test.mjs, and the tests of realize-inputs.test.mjs only for the mutations marked "inputs" (they make scratch trees of their own); it stops at
// the first failing file. It is a heavy job (a few minutes per ten mutations on a quiet machine): run it through tools/horde/bench.sh.
import fs from 'node:fs'; import path from 'node:path'; import { spawnSync } from 'node:child_process';
import { ROOT, REAL, readJSON, rel, sha256File } from './lib.mjs';
import { makeTree, removeTree } from './tree.mjs';

const here = path.dirname(new URL(import.meta.url).pathname), MUT = readJSON(path.join(here, 'mutations.json')), OUT = path.join(REAL, 'MUTATION-CHECK.json');
const argv = process.argv.slice(2), opt = n => { const i = argv.indexOf(n); return i < 0 ? null : (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true); };
const FILES = { rules: 'tests/governance/realize-rules.test.mjs', main: 'tests/governance/realize.test.mjs', inputs: 'tests/governance/realize-inputs.test.mjs' };

export function applyMutation(text, m) {
  const i = text.indexOf(m.find); if (i < 0) throw new Error(`mutation ${m.id}: the snippet is not in ${m.file}`); if (text.indexOf(m.find, i + 1) >= 0) throw new Error(`mutation ${m.id}: the snippet occurs more than once in ${m.file}`);
  const out = text.slice(0, i) + m.replace + text.slice(i + m.find.length); if (out === text) throw new Error(`mutation ${m.id}: the mutation changes nothing`); return out;
}
if (argv.includes('--check')) {
  let bad = 0; for (const m of MUT) { try { applyMutation(fs.readFileSync(path.join(ROOT, m.file), 'utf8'), m); } catch (e) { console.log(String(e.message)); bad++; } }
  console.log(`${MUT.length} mutations, ${bad} not applicable`); process.exit(bad ? 1 : 0);
}
const old = fs.existsSync(OUT) ? readJSON(OUT) : { results: {} }, results = { ...(old.results || {}) };
let list = MUT; if (opt('--only')) { const ids = String(opt('--only')).split(','); list = MUT.filter(m => ids.includes(m.id)); } else if (argv.includes('--survivors')) list = MUT.filter(m => (results[m.id] || {}).status === 'survived'); else if (argv.includes('--resume')) list = MUT.filter(m => !results[m.id]);
const baseDigest = () => ({ harness_files: Object.fromEntries(['lib.mjs', 'timeline.mjs', 'gazetteer.mjs', 'query.mjs', 'schema.mjs', 'checks.mjs', 'check.mjs', 'names.mjs', 'mutations.json'].map(f => [f, sha256File(path.join(here, f)).slice(0, 12)])), tests: Object.fromEntries(Object.values(FILES).map(f => [path.basename(f), sha256File(path.join(ROOT, f)).slice(0, 12)])) });
const save = () => { const all = MUT.map(m => ({ id: m.id, file: m.file, rule: m.rule, ...(results[m.id] || { status: 'not run' }) })), killed = all.filter(r => r.status === 'killed').length, survived = all.filter(r => r.status === 'survived'), notrun = all.filter(r => r.status === 'not run').length;
  fs.writeFileSync(OUT, JSON.stringify({ _doc: 'Mutation check of the tests of the realization harness (tools/bt/realize/mutate.mjs): every mutation removes or changes one rule of the harness in a scratch copy and runs the tests of the copy; killed = some test failed, survived = every test passed (a rule without a test, or an equivalent mutant: see notes).', ...baseDigest(), total: MUT.length, killed, survived: survived.length, not_run: notrun, survivors: survived.map(s => s.id), notes: old.notes || {}, results: all }, null, 1) + '\n'); };
let n = 0; const t0 = Date.now();
for (const m of list) {
  n++; const scratch = `tmp/realize/mut/${m.id}`; let status = 'survived', killedBy = null, detail = '', ran = [];
  try {
    const root = makeTree(scratch, { files: { [m.file]: t => applyMutation(t, m) } });
    for (const t of (m.tests || ['rules', 'main'])) {
      const f = FILES[t]; ran.push(t);
      const r = spawnSync('node', ['--test', ...(t === 'inputs' ? [] : []), path.join(root, f)], { cwd: root, encoding: 'utf8', maxBuffer: 1 << 28, env: { ...process.env, BT_REALIZE_REAL_ROOT: ROOT }, timeout: 20 * 60 * 1000 });
      if (r.status !== 0) { status = 'killed'; killedBy = path.basename(f); const fails = (r.stdout.match(/^not ok \d+ - .*/gm) || []).slice(0, 3).map(x => x.replace(/^not ok \d+ - /, '')); detail = fails.length ? fails.join(' | ') : String((r.stderr || r.stdout || '').slice(0, 200)).replace(/\s+/g, ' '); break; }
    }
  } catch (e) { status = 'error'; detail = String(e.message || e).slice(0, 300); }
  finally { removeTree(scratch); }
  results[m.id] = { status, ...(killedBy ? { killed_by: killedBy } : {}), ...(detail ? { detail: detail.slice(0, 300) } : {}), tests_run: ran };
  console.log(`${String(n).padStart(3)}/${list.length} ${status.toUpperCase().padEnd(8)} ${m.id.padEnd(34)} ${killedBy ? '(' + killedBy + ')' : ''} ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  save();
}
save(); const rep = readJSON(OUT); console.log(`\n${rep.total} mutations: ${rep.killed} killed, ${rep.survived} survived, ${rep.not_run} not run`); if (rep.survivors.length) console.log('SURVIVORS: ' + rep.survivors.join(', '));
process.exitCode = rep.survived ? 1 : 0;
