// Q16 photo-match machinery: structural checks, no browser. Run: node --test tests/photomatch.test.mjs
// Optional determinism check (needs system Chrome + SwiftShader): PHOTOMATCH_RENDER=1 node --test tests/photomatch.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; import { execFileSync } from 'node:child_process';
const ROOT = path.resolve(import.meta.dirname, '..'), PM = path.join(ROOT, 'tools/bt/photomatch'), J = f => JSON.parse(fs.readFileSync(path.join(PM, f), 'utf8'));
const cat = J('catalogue.json'), poses = J('poses.json'), led = J('images_ledger.json'), ver = J('verdicts.json'), res = J('resolved_poses.json');
const gz = new Set(JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/battle-theatre/app/data/gazetteer.json'))).places.map(p => p.id));
test('catalogue: every record has id, url, caption, licence basis from the LOC record', () => {
  assert.equal(cat.count, cat.photographs.length); assert.ok(cat.count >= 100);
  for (const p of cat.photographs) { assert.match(p.loc_id, /^\d+$/); assert.ok(p.loc_url.startsWith('https://www.loc.gov/')); assert.ok(p.title); assert.ok(p.date_as_catalogued); assert.match(p.licence_basis, /no known restrictions/i); assert.ok(/No known restrictions/.test(p.rights_information)); assert.equal(typeof p.staged_flag, 'boolean'); }
});
test('catalogue: staged flags carry their basis', () => { const s = cat.photographs.filter(p => p.staged_flag); assert.ok(s.length > 0); for (const p of s) assert.ok(p.staged_basis); });
test('images ledger: sha256 present; files, if on disk, match their hash and were not fetched from refused hosts', () => {
  for (const [k, v] of Object.entries(led.images)) { if (v.status !== 'ok') continue; assert.match(v.sha256, /^[0-9a-f]{64}$/); assert.ok(v.url.startsWith('https://archive.org/cors/')); assert.ok(v.licence_basis);
    const f = path.join(ROOT, v.local_original); if (fs.existsSync(f)) assert.equal(crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex'), v.sha256, k); }
});
test('poses: every pose is a registered assumption with tiers, known anchors and ledger keys; nothing claims documented', () => {
  for (const p of poses.poses) { assert.ok(gz.has(p.position.anchor), p.id); assert.ok(['plausible-procedural', 'inferred'].includes(p.position.tier)); assert.ok(p.position.basis && p.heading.basis); assert.ok(['plausible-procedural', 'inferred'].includes(p.heading.tier));
    if (p.heading.toward) assert.ok(gz.has(p.heading.toward)); if (p.photo_key) assert.equal(led.images[p.photo_key].status, 'ok', p.id); assert.ok(cat.photographs.some(c => c.loc_id === p.loc_id) || p.loc_id === null, p.id); }
  assert.equal(res.resolved.length, poses.poses.length);
});
test('verdicts: allowed vocabulary; a positive verdict needs a viewed image; every pose has one', () => {
  const ids = new Set(poses.poses.map(p => p.id)); for (const v of ver.verdicts) { assert.ok(['matches', 'roughly', 'does not', 'cannot judge'].includes(v.verdict)); assert.ok(v.why.length > 20); if (['matches', 'roughly'].includes(v.verdict)) assert.equal(v.reviewed_image, true); if (v.reviewed_image === false) assert.equal(v.verdict, 'cannot judge'); ids.delete(v.pose); }
  assert.equal(ids.size, 0);
});
test('render is deterministic (SwiftShader), optional', { skip: !process.env.PHOTOMATCH_RENDER }, () => {
  const h = () => crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, 'tmp/photomatch/renders/P03_base.png'))).digest('hex');
  execFileSync('nice', ['-n', '10', 'node', path.join(PM, 'run.mjs'), 'P03'], { cwd: ROOT, stdio: 'ignore' }); const a = h();
  execFileSync('nice', ['-n', '10', 'node', path.join(PM, 'run.mjs'), 'P03'], { cwd: ROOT, stdio: 'ignore' }); assert.equal(h(), a);
});
