// Q16 photo-match: structural checks of the registry, no browser. Run: node --test docs/battle-theatre/app/tests/photomatch-q16.test.mjs
// Optional determinism check of the renderer (needs system Chrome with software GL; run through the machine lock): PHOTOMATCH_RENDER=1 node --test docs/battle-theatre/app/tests/photomatch-q16.test.mjs
// The checks hold without the gitignored image files; when a file under tmp/ is present its size and hash are checked too.
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; import { execFileSync } from 'node:child_process';
const ROOT = path.resolve(import.meta.dirname, '../../../..'), PM = path.join(ROOT, 'tools/bt/photomatch'), J = f => JSON.parse(fs.readFileSync(path.join(PM, f), 'utf8'));
const cat = J('catalogue.json'), add = J('catalogue_additions.json'), led = J('images_ledger.json'), st = J('position_statements.json'), poses = J('poses.json'), res = J('resolved_poses.json'), ver = J('verdicts.json'), reg = J('photograph_registry.json');
const all = [...cat.photographs, ...add.photographs], ids = new Set(all.map(p => p.loc_id));
const gz = new Set(JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/battle-theatre/app/data/gazetteer.json'))).places.map(p => p.id));
const sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const VOCAB = ['matches', 'roughly', 'does not', 'cannot judge'];

test('catalogue: first-run records plus the added records, each with its licence basis; added records carry their reason and date status', () => {
  assert.equal(cat.count, cat.photographs.length); assert.equal(add.count, add.photographs.length); assert.equal(all.length, 127); assert.equal(ids.size, all.length);
  for (const p of all) { assert.match(p.loc_id, /^\d+$/); assert.ok(p.loc_url.startsWith('https://www.loc.gov/')); assert.ok(p.title); assert.ok(p.date_as_catalogued); assert.match(p.licence_basis, /no known restrictions/i); assert.equal(typeof p.staged_flag, 'boolean'); }
  for (const p of add.photographs) { assert.ok(p.added_reason); assert.ok(p.date_status); }
  assert.ok(add.skipped_search_results.every(s => s.reason));
});
test('images ledger: hashes, declared sizes, hosts and licence basis; files on disk match', () => {
  let n = 0;
  for (const [k, v] of Object.entries(led.images)) {
    if (v.status === 'not_offered') { assert.ok(v.reason); continue; }
    assert.equal(v.status, 'ok', k); assert.match(v.sha256, /^[0-9a-f]{64}$/, k); assert.ok(v.bytes > 0, k); assert.ok(v.licence_basis, k);
    assert.ok(/^https:\/\/(archive\.org\/cors\/|cdn\.loc\.gov\/|tile\.loc\.gov\/)/.test(v.url), k + ' ' + v.url);
    if (v.bytes_declared_by_record != null) assert.equal(v.bytes, v.bytes_declared_by_record, k + ': a transfer cut short');
    const f = v.local_file && path.join(ROOT, v.local_file); if (f && fs.existsSync(f)) { assert.equal(fs.statSync(f).size, v.bytes, k); assert.equal(sha(f), v.sha256, k); n++; }
  }
  assert.ok(Object.keys(led.images).length >= 430);
});
test('every catalogued record has at least one saved image in the ledger', () => {
  const have = new Set(Object.values(led.images).filter(v => v.status === 'ok').map(v => v.loc_id).filter(Boolean));
  for (const p of all) assert.ok(have.has(p.loc_id) || reg.photographs.find(r => r.loc_id === p.loc_id).image_keys.length > 0, p.loc_id);
});
test('statements: every quote came from a saved text with its hash; none is a coordinate; documented ones carry a page and offset', () => {
  assert.ok(st.count >= 60); const seen = new Set();
  for (const s of st.statements) {
    assert.ok(!seen.has(s.id), s.id); seen.add(s.id); assert.ok(s.quote && s.says && s.prec, s.id); assert.equal(s.coordinates_published, false, s.id); assert.ok(['documented', 'inferred', 'lead'].includes(s.tier), s.id);
    const src = st.sources[s.src]; assert.ok(src, s.id); assert.match(src.sha256_text, /^[0-9a-f]{64}$/, s.id); assert.ok(src.local_text && src.retrieved, s.id);
    if (s.tier === 'documented') assert.ok(s.quote_fragments || s.offset_in_normalised_page != null, s.id + ' needs an offset');
    for (const l of [...(s.loc || []), ...(s.cand || [])]) assert.ok(ids.has(l), s.id + ' names record ' + l);
  }
});
test('poses: schema 2, every position is inferred or an assumption (never a documented position), every statement id exists, fitted poses are flagged', () => {
  assert.equal(poses.schema, 2); const sid = new Set(st.statements.map(s => s.id)), seen = new Set();
  for (const p of poses.poses) {
    assert.ok(!seen.has(p.id)); seen.add(p.id); assert.ok(['inferred', 'plausible-procedural'].includes(p.position.tier), p.id + ' position tier'); assert.ok(['inferred', 'plausible-procedural'].includes(p.heading.tier), p.id + ' heading tier');
    assert.ok(p.position.basis && p.heading.basis && p.fov.basis, p.id); assert.equal(typeof p.fitted_to_photograph, 'boolean'); assert.equal(typeof p.staged_flag, 'boolean');
    for (const s of p.statement_ids) assert.ok(sid.has(s), p.id + ' ' + s);
    if (p.position.anchor && p.position.anchor.startsWith('GZ-')) assert.ok(gz.has(p.position.anchor), p.id); if (p.heading.toward && p.heading.toward.startsWith('GZ-')) assert.ok(gz.has(p.heading.toward), p.id);
    assert.ok(p.loc_id === null || ids.has(p.loc_id), p.id); assert.ok(p.photo && p.photo.file); if (Array.isArray(p.photo.crop)) { assert.equal(p.photo.crop.length, 4); for (const c of p.photo.crop) assert.ok(c >= 0 && c <= 1); }
    if (p.position.relative && p.position.relative.width_fraction) assert.equal(p.fitted_to_photograph, true, p.id + ': a distance from the photograph is a fit');
    assert.ok(!p.staged_flag, p.id + ': no staged photograph gets a pose in this pass');
  }
  assert.equal(res.resolved.length, poses.poses.length); assert.deepEqual(res.resolved.map(r => r.id), poses.poses.map(p => p.id));
});
test('verdicts: allowed vocabulary; a positive verdict needs a viewed image; a fitted pose is never called a match; every pose has one', () => {
  const left = new Set(poses.poses.map(p => p.id)), byId = Object.fromEntries(poses.poses.map(p => [p.id, p]));
  for (const v of ver.pose_verdicts) {
    assert.ok(VOCAB.includes(v.verdict), v.pose); assert.ok(v.why.length > 40, v.pose); if (['matches', 'roughly'].includes(v.verdict)) assert.equal(v.reviewed_image, true, v.pose);
    if (v.reviewed_image === false) assert.equal(v.verdict, 'cannot judge'); if (byId[v.pose].fitted_to_photograph) { assert.notEqual(v.verdict, 'matches', v.pose); assert.equal(v.independent_test, false, v.pose); }
    left.delete(v.pose);
  }
  assert.equal(left.size, 0, [...left].join(' '));
});
test('registry: one entry per catalogued record with a candid verdict and, where there is no pose, the reason', () => {
  assert.equal(reg.count, 127); assert.equal(new Set(reg.photographs.map(r => r.loc_id)).size, 127); const pv = Object.fromEntries(ver.pose_verdicts.map(v => [v.pose, v]));
  for (const r of reg.photographs) {
    assert.ok(ids.has(r.loc_id)); assert.ok(r.why && r.why.length > 30, r.loc_id); assert.equal(r.reviewed_image, true, r.loc_id); assert.equal(typeof r.staged_flag, 'boolean'); if (r.staged_flag) assert.ok(r.staged_basis, r.loc_id);
    if (r.pose_ids.length === 1) assert.equal(r.verdict, pv[r.pose_ids[0]].verdict, r.loc_id); else if (r.pose_ids.length === 0) assert.equal(r.verdict, 'cannot judge', r.loc_id);
  }
  assert.ok(reg.photographs.filter(r => r.staged_flag).length >= 14);
});
test('gate Q16 stays not passing and says what would be needed; no linked sub-requirement is marked passed', () => {
  assert.equal(ver.gate_q16.passes, false); assert.ok(ver.gate_q16.what_is_needed.length >= 5); assert.ok(ver.gate_q16.owner_steps.length >= 1); assert.equal(ver.gate_q16.documented_position_count, 0);
  const rq = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/battle-theatre/GOVERNANCE/requirements.json'))).sub_requirements.filter(s => (s.gate_ids || []).includes('Q16'));
  assert.ok(rq.length >= 45); for (const s of rq) assert.equal(s.passes, false, s.id);
});
test('the photo-match document shipped with the app carries no copy that the audit forbids', () => {
  const d = fs.readFileSync(path.join(ROOT, 'docs/battle-theatre/app/docs/PHOTOMATCH.md'), 'utf8'); assert.ok(d.length > 2000); assert.doesNotMatch(d, /\bAI\b|Claude|Anthropic|\bagents?\b|subagent|\bLLM\b|language model/i);
  assert.match(d, /not passing/i);
});
test('render is deterministic (SwiftShader), optional', { skip: !process.env.PHOTOMATCH_RENDER }, () => {
  const h = () => crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, 'tmp/photomatch/renders/P03_base.png'))).digest('hex');
  execFileSync('node', [path.join(PM, 'run.mjs'), 'P03'], { cwd: ROOT, stdio: 'ignore' }); const a = h();
  execFileSync('node', [path.join(PM, 'run.mjs'), 'P03'], { cwd: ROOT, stdio: 'ignore' }); assert.equal(h(), a);
});
