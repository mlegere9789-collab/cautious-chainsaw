// Node tests (no browser) for the medical evidence tooling of OA12: the validator's own self-test, the group manifest, the source registry, and (when the
// texts are in the checkout) the registry's hashes and every evidence file.
//   node --test docs/battle-theatre/app/tests/medical-evidence.test.mjs
// The texts live under tmp/library (not committed); without them the last two tests say NOT RUN and check only what they can.
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path'; import { spawnSync } from 'node:child_process'; import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const MED = path.join(ROOT, 'docs', 'battle-theatre', 'medical'), EVID = path.join(MED, 'evidence'), TOOL = path.join(ROOT, 'tools', 'bt', 'medical', 'validate_evidence.py');
const py = (...args) => spawnSync('python3', ['-I', TOOL, ...args], { cwd: ROOT, encoding: 'utf-8', maxBuffer: 64 * 1024 * 1024 });
const havePython = spawnSync('python3', ['--version']).status === 0;
const groups = JSON.parse(fs.readFileSync(path.join(EVID, 'groups.json'), 'utf-8')), registry = JSON.parse(fs.readFileSync(path.join(MED, 'sources.json'), 'utf-8'));
const localTextsPresent = Object.values(registry.sources).filter(s => !s.origin.startsWith('planned')).every(s => Object.values(s.files).every(f => fs.existsSync(path.join(ROOT, f.path))));

test('groups.json: 14 to 22 groups, ids of lowercase letters, digits and hyphens, every field the group passes need', () => {
  const g = groups.groups; assert.ok(g.length >= 14 && g.length <= 22, 'groups: ' + g.length);
  const ids = new Set(); for (const x of g) {
    assert.match(x.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/); assert.ok(!ids.has(x.id), 'duplicate ' + x.id); ids.add(x.id);
    for (const k of ['title', 'area', 'scope', 'questions', 'topics', 'kinds', 'sources_local', 'sources_acquire', 'scene_outputs', 'rows', 'depends_on', 'conflicts_expected', 'gaps_expected']) assert.ok(x[k] !== undefined && x[k] !== '', x.id + ' lacks ' + k);
    assert.ok(x.questions.length >= 4 && x.topics.length >= 3 && x.kinds.length >= 1, x.id);
    assert.ok(x.rows.least > 0 && x.rows.aim >= x.rows.least, x.id + ' rows');
  }
  for (const x of g) for (const d of x.depends_on) assert.ok(ids.has(d), x.id + ' depends on unknown ' + d);
  for (const x of g) for (const s of [...x.sources_local, ...x.sources_acquire]) assert.ok(registry.sources[s], x.id + ': source ' + s + ' is not in sources.json');
  const siteGroups = g.filter(x => x.area === 'sites'); assert.equal(siteGroups.length, 4); for (const x of siteGroups) assert.ok(x.site_candidates && x.site_candidates.length >= 10, x.id + ' site candidates');
});

test('sources.json: every source has a class the validator knows, an edition, rights, a file; a lead source is never documented evidence; planned files are marked as planned', () => {
  const classes = Object.keys(registry.classes); assert.ok(classes.includes('lead') && classes.includes('nps-report'));
  for (const [id, s] of Object.entries(registry.sources)) {
    assert.ok(classes.includes(s.class), id + ' class ' + s.class); assert.ok(s.edition && s.edition.length > 8, id + ' edition'); assert.ok(s.rights, id + ' rights'); assert.ok(Object.keys(s.files).length >= 1, id + ' files');
    for (const [k, f] of Object.entries(s.files)) { assert.ok(f.path && !f.path.startsWith('/') && !f.path.includes('..'), id + ' path'); if (/^planned/.test(s.origin)) assert.ok(!f.sha256, id + ' planned files carry no hash'); }
  }
  const noLeak = JSON.stringify(registry); assert.ok(!/\b(claude|anthropic|language model)\b/i.test(noLeak), 'no wording about the making of the page in the registry');
});

test('validate_evidence.py --self-test passes (88 checks on synthetic texts; nothing of the repository is read or written)', { skip: !havePython && 'NOT RUN: python3 is not available' }, () => {
  const r = py('--self-test'); assert.equal(r.status, 0, r.stdout + r.stderr); assert.match(r.stdout, /self-test: \d+ checks, 0 failed/);
  assert.ok(Number(/self-test: (\d+) checks/.exec(r.stdout)[1]) >= 88, 'the self-test lost checks: ' + r.stdout);
});

test('validate_evidence.py: --list-groups agrees with groups.json; a usage error, an unknown group and a missing group file exit 1', { skip: !havePython && 'NOT RUN: python3 is not available' }, () => {
  const l = py('--list-groups'); assert.equal(l.status, 0); assert.deepEqual(l.stdout.trim().split('\n'), groups.groups.map(x => x.id));
  assert.equal(py().status, 1); assert.equal(py('no-such-group').status, 1);
  const absent = groups.groups.find(x => !fs.existsSync(path.join(EVID, x.id + '.jsonl'))); if (absent) assert.equal(py(absent.id).status, 1, 'a group with no evidence file fails when named');
});

test('--check-sources: every local file of the registry and ledger has the recorded sha256 (NOT RUN when the texts are not in the checkout)', { skip: (!havePython && 'NOT RUN: python3 is not available') || (!localTextsPresent && 'NOT RUN: the local texts under tmp/library are not in this checkout') }, () => {
  const r = py('--check-sources'); assert.equal(r.status, 0, r.stdout + r.stderr); assert.match(r.stdout, /0 problems/);
});

test('--all: every evidence row of every group file passes (NOT RUN when the texts are not in the checkout)', { skip: (!havePython && 'NOT RUN: python3 is not available') || (!localTextsPresent && 'NOT RUN: the local texts under tmp/library are not in this checkout') }, () => {
  const out = path.join(ROOT, 'tmp', 'medical', 'validate-all.json'); fs.mkdirSync(path.dirname(out), { recursive: true });
  const r = py('--all', '--json', out); assert.equal(r.status, 0, r.stdout + r.stderr);
  const rep = JSON.parse(fs.readFileSync(out, 'utf-8')); assert.equal(rep.rows_failed, 0); assert.ok(rep.rows_total >= 79, 'the seed rows are there: ' + rep.rows_total);
  const ids = new Set(); for (const g of rep.groups) for (const row of g.rows) { assert.ok(!ids.has(row.id), 'duplicate ' + row.id); ids.add(row.id); assert.ok(row.ok, row.id); }
  // the shipped fields of every row are free of the words the page copy test refuses
  const refused = /\b(AI|A\.I\.|Claude|Anthropic|LLM|language model|generated|automated|subagent|agent|prompt|accurate|accurately|accuracy|historically accurate|exactly where|verified|authentic)\b/i;
  for (const g of groups.groups) { const f = path.join(EVID, g.id + '.jsonl'); if (!fs.existsSync(f)) continue;
    for (const line of fs.readFileSync(f, 'utf-8').split('\n').filter(Boolean)) { const row = JSON.parse(line); const shipped = JSON.stringify({ t: row.topic, c: row.claim, v: row.value, d: row.date_scope, k: row.data, s: row.scene, site: row.site }); assert.ok(!refused.test(shipped), row.id + ' ships a refused word'); } }
});
