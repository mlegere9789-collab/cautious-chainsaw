// Does test.mjs fail when the patched page is wrong in ONE place?  Each mutant is the page of the scratch tree of the group with one text
// change; test.mjs runs on a scratch tree that holds only that page (R1H_TREE) and must exit non-zero.  A mutant that passes is a hole in the test.
//
//   tools/horde/bench.sh node candidates/r1h/wp-infra-28b/mutants.mjs [--out candidates/r1h/wp-infra-28b/evidence/mutants.json]   (--dry only checks that every mutant's anchor is found once)
//
// Needs the scratch tree: python3 candidates/r1h/_lib/apply_group.py wp-infra-28b (this script runs it first).  Scratch output goes under
// tmp/r1h-cand/wp-infra-28b/mut and is deleted at the end.
import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..', '..');
const argv = process.argv.slice(2);
const OUT = path.resolve(REPO, argv.includes('--out') ? argv[argv.indexOf('--out') + 1] : 'candidates/r1h/wp-infra-28b/evidence/mutants.json');
const MUT = path.join(REPO, 'tmp', 'r1h-cand', 'wp-infra-28b', 'mut');
const GREEN = path.join(REPO, 'tmp', 'r1h-cand', 'wp-infra-28b', 'green', 'watch-together.html');

const ap = cp.spawnSync('python3', ['candidates/r1h/_lib/apply_group.py', 'wp-infra-28b'], { cwd: REPO, encoding: 'utf8' });
if (ap.status !== 0) { console.error(ap.stdout + ap.stderr); process.exit(2); }
const page = fs.readFileSync(GREEN, 'utf8');

const M = (id, what, from, to) => ({ id, what, from, to });
const MUTANTS = [
  M('cap-off-by-one', 'the 21st connection is kept', 'connections.length >= WT.maxGuests', 'connections.length > WT.maxGuests'),
  M('cap-removed', 'no cap', "      if (connections.length >= WT.maxGuests) { try { conn.close(); } catch (e) {} return; }   // full: closed at once, never kept\n", ''),
  M('cap-closes-but-keeps', 'a refused connection is closed and still kept', 'try { conn.close(); } catch (e) {} return; }   // full', 'try { conn.close(); } catch (e) {} }   // full'),
  M('cap-keeps-out-but-never-closes', 'a refused connection is dropped from the list and never closed', 'try { conn.close(); } catch (e) {} return; }   // full', 'return; }   // full'),
  M('random-from-math', 'the code comes from Math.random', 'crypto.getRandomValues(bytes);', 'for (let k = 0; k < bytes.length; k++) bytes[k] = Math.floor(Math.random() * 256);'),
  M('random-modulo-bias', 'bytes above the multiple of 28 are folded, not skipped', 'if (bytes[i] < limit)', 'if (true)'),
  M('random-no-loop-guard', 'a source of unusable bytes hangs the page', "      if (round >= 16) throw new Error('no usable random bytes');   // a broken source cannot hang the page\n", ''),
  M('alphabet-29', 'a 29-character alphabet (A added)', "alphabet: 'BCDFGHJKMNPQRSTVWXYZ23456789'", "alphabet: 'ABCDFGHJKMNPQRSTVWXYZ23456789'"),
  M('alphabet-has-O', 'a look-alike letter (O) in place of D', "alphabet: 'BCDFGHJKMNPQRSTVWXYZ23456789'", "alphabet: 'BCOFGHJKMNPQRSTVWXYZ23456789'"),
  M('code-length-5', 'codes of 5 characters', 'codeLength: 6,', 'codeLength: 5,'),
  M('host-no-fail-closed', 'a fixed code when the random source fails', "catch (e) { setSyncStatus('could not make a safe session code in this browser', 'error'); return; }", "catch (e) { code = 'BBBBBB'; }"),
  M('tick-676-accepted', 'moment 676 accepted', 'tick > WT.tickMax', 'tick > 676'),
  M('tick-0-accepted', 'moment 0 accepted', 'tick < 1 || tick > WT.tickMax', 'tick < 0 || tick > WT.tickMax'),
  M('tick-float-accepted', 'moment 1.5 accepted', ' || !Number.isInteger(tick)', ''),
  M('tick-string-accepted', 'moment "5" accepted', "typeof tick !== 'number' || !Number.isInteger(tick) ||", 'isNaN(tick) ||'),
  M('note-281-accepted', 'a note of 281 characters accepted', 'note.length > WT.noteMax', 'note.length > WT.noteMax + 1'),
  M('note-markup-accepted', 'a note that starts a tag accepted', ' || /<[A-Za-z!\\/?\\u0000-\\u001f]/.test(note)', ''),
  M('note-markup-letters-only', 'a tag split by a control character accepted', '/<[A-Za-z!\\/?\\u0000-\\u001f]/', '/<[A-Za-z!\\/?]/'),
  M('note-controls-kept', 'control characters stay in the note', "text = note.replace(/[\\u0000-\\u001f\\u007f-\\u009f]/g, ' ').trim();", 'text = note;'),
  M('note-c1-kept', 'only the C0 controls and DEL are stripped', "/[\\u0000-\\u001f\\u007f-\\u009f]/g", "/[\\u0000-\\u001f\\u007f]/g"),
  M('note-not-trimmed', 'the note is not trimmed', "' ').trim();", "' ');"),
  M('extra-keys-accepted', 'extra fields accepted', "      for (const key of Reflect.ownKeys(data)) if (!Object.prototype.hasOwnProperty.call(WT_FIELDS, key)) return null;\n", ''),
  M('prototype-not-checked', 'an object with a foreign prototype accepted', "      if (proto !== Object.prototype && proto !== null) return null;\n", ''),
  M('arrays-and-strings-ok', 'anything but null is looked into', "if (data === null || typeof data !== 'object') return null;", 'if (data === null || data === undefined) return null;'),
  M('type-not-checked', 'any type accepted', "      if (type !== 'goto') return null;\n", ''),
  M('guest-handler-unchecked', 'the guest handler passes the data on as it was', 'const msg = parseGoto(data);', "const msg = data && data.type === 'goto' ? data : null;"),
  M('host-broadcast-raw', 'the host sends the note as it is', 'c.send(hostMessage(tick, note))', "c.send({ type: 'goto', tick, note })"),
  M('host-snapshot-raw', 'the late joiner snapshot is sent as it is', 'conn.send(hostMessage(currentTick, currentNote))', "conn.send({ type: 'goto', tick: currentTick, note: currentNote })"),
  M('join-still-5', 'the join check enforces 5', 'code.length !== WT.codeLength', 'code.length !== 5'),
  M('input-still-5', 'the join input takes 5', 'placeholder="Enter 6-character code" maxlength="6"', 'placeholder="Enter a 5-letter code" maxlength="5"'),
  M('sentence-in-real-time', 'the sentence says in real time again', 'as the host plays or jumps.', 'in real time.'),
  M('sentence-5-letter', 'the sentence says 5-letter', 'shares a 6-character code;', 'shares a 5-letter code;'),
];

if (argv.includes('--dry')) {
  let bad = 0;
  for (const m of MUTANTS) { const n = page.split(m.from).length - 1; if (n !== 1) { bad++; console.error(`mutant ${m.id}: its anchor occurs ${n} times`); } }
  console.log(`${MUTANTS.length} mutants, ${bad} with a wrong anchor`);
  process.exit(bad ? 2 : 0);
}
fs.rmSync(MUT, { recursive: true, force: true });
const only = argv.includes('--only') ? new Set(argv[argv.indexOf('--only') + 1].split(',')) : null;   // a few mutants while iterating (the evidence file is written only for a full run)
const results = [];
for (const m of MUTANTS) {
  if (only && !only.has(m.id)) continue;
  const n = page.split(m.from).length - 1;
  if (n !== 1) { console.error(`mutant ${m.id}: its anchor occurs ${n} times in the patched page; fix the mutant`); process.exit(2); }
  const dir = path.join(MUT, m.id);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'watch-together.html'), page.replace(m.from, () => m.to));
  const t0 = Date.now();
  const r = cp.spawnSync(process.execPath, ['--test', '--test-reporter=tap', 'candidates/r1h/wp-infra-28b/test.mjs'], {
    cwd: REPO, encoding: 'utf8', timeout: 12000, maxBuffer: 64 * 1024 * 1024, env: { ...process.env, R1H_TREE: path.relative(REPO, dir), R1H_BASE: 'release/R1g/dist' },
  });
  const out = (r.stdout || '') + (r.stderr || '');
  const failed = [...out.matchAll(/^not ok \d+ - (.*)$/gm)].map((x) => x[1]);
  const killed = r.status !== 0;
  results.push({ id: m.id, what: m.what, killed, exit: r.status, timedOut: r.error && r.error.code === 'ETIMEDOUT' ? true : undefined, ms: Date.now() - t0, failedTests: failed.map((x) => x.slice(0, 90)) });
  console.log(`${killed ? 'killed  ' : 'SURVIVED'} ${m.id.padEnd(32)} ${failed.length} test(s) failed${r.error ? ' (' + r.error.code + ')' : ''}`);
  fs.rmSync(dir, { recursive: true, force: true });
}
fs.rmSync(MUT, { recursive: true, force: true });
const survived = results.filter((r) => !r.killed);
if (only) { console.log(`${results.length - survived.length} of ${results.length} selected mutants killed (partial run, no evidence file written)`); process.exit(survived.length ? 1 : 0); }
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({ when: new Date().toISOString(), test: 'candidates/r1h/wp-infra-28b/test.mjs', page: 'scratch tree of group.json', mutants: results.length, killed: results.length - survived.length, survived: survived.map((r) => r.id), results }, null, 1) + '\n');
console.log(`${results.length - survived.length} of ${results.length} mutants killed; survivors: ${survived.map((r) => r.id).join(', ') || 'none'}`);
process.exit(survived.length ? 1 : 0);
