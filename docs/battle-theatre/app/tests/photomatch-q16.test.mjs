// Q16 photo-match: structural checks of the registry, no browser. Run: node --test docs/battle-theatre/app/tests/photomatch-q16.test.mjs
// Optional determinism check of the renderer (needs system Chrome with software GL; run through the machine lock): PHOTOMATCH_RENDER=1 node --test docs/battle-theatre/app/tests/photomatch-q16.test.mjs
// The checks hold without the gitignored image files; when a file under tmp/ is present its size and hash are checked too.
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; import { execFileSync } from 'node:child_process';
const ROOT = path.resolve(import.meta.dirname, '../../../..'), PM = path.join(ROOT, 'tools/bt/photomatch'), J = f => JSON.parse(fs.readFileSync(path.join(PM, f), 'utf8'));
const cat = J('catalogue.json'), add = J('catalogue_additions.json'), wide = J('catalogue_wide_items.json'), wled = J('wide_images_ledger.json'), led = J('images_ledger.json'), st = J('position_statements.json'), poses = J('poses.json'), res = J('resolved_poses.json'), ver = J('verdicts.json'), reg = J('photograph_registry.json');
const crit = J('criteria.json'), figs = J('nps_figures.json');
const all = [...cat.photographs, ...add.photographs, ...wide.photographs], ids = new Set(all.map(p => p.loc_id));
const gz = new Set(JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/battle-theatre/app/data/gazetteer.json'))).places.map(p => p.id));
const sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const VOCAB = ['matches', 'roughly', 'does not', 'cannot judge'];
const norm = s => s.replace(/\s+/g, ' ').trim();

test('catalogue: first-run records, the added records and the records of the wide search, each with its licence basis; added records carry their reason and date status', () => {
  assert.equal(cat.count, cat.photographs.length); assert.equal(add.count, add.photographs.length); assert.equal(wide.count, wide.photographs.length);
  assert.equal(all.length, cat.count + add.count + wide.count); assert.equal(ids.size, all.length, 'a record is in two lists'); assert.ok(all.length >= 189);
  for (const p of all) { assert.match(p.loc_id, /^\d+$/); assert.ok(p.loc_url.startsWith('https://www.loc.gov/')); assert.ok(p.title); assert.ok(p.date_as_catalogued); assert.match(p.licence_basis, /no known restrictions|rights field is empty/i); assert.equal(typeof p.staged_flag, 'boolean'); }
  for (const p of [...add.photographs, ...wide.photographs]) { assert.ok(p.added_reason); assert.ok(p.date_status); }
  for (const p of wide.photographs) { assert.ok(p.found_by && p.found_by.includes('co=civwar')); assert.ok(['ok', 'not_offered'].includes(p.image_status), p.loc_id + ' image status ' + p.image_status); }
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
test('wide images ledger: every record of the wide search has an image (hash, hosts) or the reason it has none', () => {
  for (const p of wide.photographs) {
    const v = wled.images[p.loc_id]; assert.ok(v, p.loc_id + ' missing in the wide ledger'); assert.equal(v.status, p.image_status, p.loc_id);
    if (v.status === 'not_offered') { assert.ok(v.reason && /not digitized/.test(v.reason), p.loc_id); continue; }
    assert.match(v.sha256, /^[0-9a-f]{64}$/, p.loc_id); assert.ok(v.bytes > 0 && v.width > 0 && v.height > 0, p.loc_id); assert.ok(/^https:\/\/(cdn\.loc\.gov|tile\.loc\.gov)\//.test(v.url_final || v.url), p.loc_id + ' ' + v.url);
    const f = path.join(ROOT, v.local_file); if (fs.existsSync(f)) { assert.equal(fs.statSync(f).size, v.bytes, p.loc_id); assert.equal(sha(f), v.sha256, p.loc_id); }
  }
});
test('further resources of the wide-search records (card backs, second halves, copy negatives, 1024-px card backs read for their print): each is in the ledger with its hash and the size the record declares, and the registry entry says it was looked at', () => {
  const x = J('wide_extra_images_ledger.json').images, keys = Object.keys(x); assert.ok(keys.length >= 82);
  assert.ok(keys.filter(k => x[k].derivative !== 'large').length >= 51 && keys.filter(k => x[k].derivative === 'large').length >= 31);
  for (const [k, v] of Object.entries(x)) {
    assert.equal(v.status, 'ok', k); assert.match(v.sha256, /^[0-9a-f]{64}$/, k); assert.ok(/^https:\/\/(cdn\.loc\.gov|tile\.loc\.gov)\//.test(v.url_final || v.url), k); assert.ok(v.licence_basis && v.width > 0 && v.height > 0, k);
    if (v.bytes_declared_by_record != null) assert.equal(v.bytes, v.bytes_declared_by_record, k + ': a transfer cut short');
    const f = path.join(ROOT, v.local_file); if (fs.existsSync(f)) { assert.equal(fs.statSync(f).size, v.bytes, k); assert.equal(sha(f), v.sha256, k); }
    assert.ok(wide.photographs.some(w => w.loc_id === v.loc_id), k + ' is not a record of the wide search');
  }
  for (const id of new Set(keys.map(k => x[k].loc_id))) assert.ok(reg.photographs.find(r => r.loc_id === id).why.includes('Further images of this record'), id + ' registry entry does not mention them');
});
test('every catalogued record has at least one saved image in a ledger, or the registry says why not', () => {
  const have = new Set(Object.values(led.images).filter(v => v.status === 'ok').map(v => v.loc_id).filter(Boolean));
  for (const p of all) assert.ok(have.has(p.loc_id) || reg.photographs.find(r => r.loc_id === p.loc_id).image_keys.length > 0 || p.image_status === 'not_offered', p.loc_id);
});
test('statements: every quote came from a saved text with its hash; none is a coordinate; documented ones carry a page and offset', () => {
  assert.ok(st.count >= 136); const seen = new Set();
  for (const s of st.statements) {
    assert.ok(!seen.has(s.id), s.id); seen.add(s.id); assert.ok(s.quote && s.says && s.prec, s.id); assert.equal(s.coordinates_published, false, s.id); assert.ok(['documented', 'inferred', 'lead'].includes(s.tier), s.id);
    const src = st.sources[s.src]; assert.ok(src, s.id); assert.match(src.sha256_text, /^[0-9a-f]{64}$/, s.id); assert.ok(src.local_text && src.retrieved, s.id);
    if (s.tier === 'documented') assert.ok(s.quote_fragments || s.offset_in_normalised_page != null, s.id + ' needs an offset');
    for (const l of [...(s.loc || []), ...(s.cand || [])]) assert.ok(ids.has(l), s.id + ' names record ' + l);
  }
});
test('NPS figures: every caption is a verbatim passage of the saved text of its report and has a statement; the extracted image is hashed', () => {
  assert.ok(figs.count >= 36); const sid = new Set(st.statements.map(s => s.quote)), quotes = st.statements.map(s => s.quote.replace(/[. ]+$/, ''));
  for (const f of figs.figures) {
    assert.ok(['NPS-CLR-ROT-V1', 'NPS-CLR-ROT-V2'].includes(f.source), f.id); assert.match(f.image_sha256, /^[0-9a-f]{64}$/, f.id); assert.ok(/\b(north|south|east|west)/.test(f.direction_word), f.id); assert.ok(/^Figure /.test(f.caption), f.id); assert.doesNotMatch(f.caption, /\d+\.\d+\s*(?:m|ft)\b/, f.id);
    assert.ok(quotes.some(q => q === f.caption.replace(/[. ]+$/, '') || q.includes(f.caption.replace(/[. ]+$/, ''))), f.id + ' has no statement');
    const t = path.join(ROOT, 'tmp/library/web/nps', f.source, f.source + '.txt'); if (fs.existsSync(t)) { const parts = fs.readFileSync(t, 'utf8').split(/=== PAGE (\d+) ===/); let ok = false; for (let i = 1; i < parts.length; i += 2) if (+parts[i] === f.pdf_page) ok = norm(parts[i + 1]).includes(f.caption); assert.ok(ok, f.id + ' caption not on pdf page ' + f.pdf_page); }
    const im = path.join(ROOT, f.image); if (fs.existsSync(im)) assert.equal(sha(im), f.image_sha256, f.id);
  }
  const conf = fs.existsSync(path.join(PM, 'nps_figures_confirmed.json')) ? J('nps_figures_confirmed.json').ties : {};
  for (const [k, t] of Object.entries(conf)) { assert.ok(figs.figures.some(f => f.id === k), k); for (const l of t.loc || []) assert.ok(ids.has(l), k + ' ' + l); assert.ok(t.ident && t.confirmed_by_looking === true, k + ': a tie needs the note that both images were looked at'); }
});
test('poses: schema 2, every position is inferred or an assumption (never a documented position), every statement id exists, fitted poses are flagged', () => {
  assert.equal(poses.schema, 2); const sid = new Set(st.statements.map(s => s.id)), seen = new Set();
  for (const p of poses.poses) {
    assert.ok(!seen.has(p.id)); seen.add(p.id); assert.ok(['inferred', 'plausible-procedural'].includes(p.position.tier), p.id + ' position tier'); assert.ok(['inferred', 'plausible-procedural'].includes(p.heading.tier), p.id + ' heading tier');
    assert.ok(p.position.basis && p.heading.basis && p.fov.basis, p.id); assert.equal(typeof p.fitted_to_photograph, 'boolean'); assert.equal(typeof p.staged_flag, 'boolean');
    for (const s of p.statement_ids) assert.ok(sid.has(s), p.id + ' ' + s);
    if (p.position.anchor && p.position.anchor.startsWith('GZ-')) assert.ok(gz.has(p.position.anchor), p.id); if (p.heading.toward && p.heading.toward.startsWith('GZ-')) assert.ok(gz.has(p.heading.toward), p.id);
    assert.ok(p.loc_id === null || ids.has(p.loc_id), p.id); for (const l of p.also_loc_ids || []) assert.ok(ids.has(l), p.id + ' also ' + l); assert.ok(p.photo && p.photo.file); if (Array.isArray(p.photo.crop)) { assert.equal(p.photo.crop.length, 4); for (const c of p.photo.crop) assert.ok(c >= 0 && c <= 1); }
    if (p.position.relative && p.position.relative.width_fraction) assert.equal(p.fitted_to_photograph, true, p.id + ': a distance from the photograph is a fit');
    if (p.superseded_by) assert.ok(poses.poses.some(q => q.id === p.superseded_by && q.supersedes === p.id), p.id + ' superseded_by must be answered by supersedes');
    if (p.position.place_documented) { assert.equal(p.position.tier, 'inferred', p.id + ': a documented place is still an inferred position (DD-PM-01)'); assert.ok(p.position.sigma_m <= 100, p.id); assert.equal(p.fitted_to_photograph, false, p.id); }
    assert.ok(!p.staged_flag, p.id + ': no staged photograph gets a pose');
  }
  assert.equal(res.resolved.length, poses.poses.length); assert.deepEqual(res.resolved.map(r => r.id), poses.poses.map(p => p.id));
});
test('deferred poses are registered with their basis and the reason they have no render yet', () => {
  const sid = new Set(st.statements.map(s => s.id));
  for (const p of poses.deferred_poses || []) { assert.ok(p.deferred_reason && p.deferred_reason.length > 40, p.id); assert.ok(ids.has(p.loc_id), p.id); for (const s of p.statement_ids) assert.ok(sid.has(s), p.id + ' ' + s); assert.ok(!poses.poses.some(q => q.id === p.id), p.id + ' is both registered and deferred'); }
});
test('criteria: the pass criteria of the first test at a documented place were written before its renders existed and are never edited after a render was looked at', () => {
  assert.ok(crit.criteria.length >= 2); const t = x => Date.parse(x);
  for (const c of crit.criteria) {
    assert.match(c.written_utc, /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/, c.id); assert.equal(c.render_existed_when_written, false, c.id); assert.ok(c.verdict_rule && c.basis && c.independence, c.id); assert.ok(c.poses.every(p => poses.poses.some(q => q.id === p)), c.id);
    for (const p of c.poses) for (const s of ['', '_fov30', '_fov50']) { const f = path.join(ROOT, 'tmp/photomatch/renders', `${p}${s}_full.png`); if (fs.existsSync(f) && fs.statSync(f).mtimeMs > 0) assert.ok(fs.statSync(f).mtimeMs >= t(c.written_utc) - 1000, `${c.id}: render ${p}${s} is older than the criterion`); }
  }
  assert.equal(crit.criteria.find(c => c.id === 'C-P27-P28-2').model_skyline_computed_when_written, false);
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
test('image ties: each was looked at and has its geometry; the Metropolitan items are catalogued photographs; the copy ties of the wide search are symmetric between wide records and never rest on a rejected lead', () => {
  const geo = J('tie_geometry.json'), conf = J('nps_figures_confirmed.json').ties, met = J('met_ties_confirmed.json').ties, T = geo.thresholds;
  assert.deepEqual(T, { inlier_fraction: 0.8, anisotropy: 1.06, rotation_deg: 4, perspective: 0.2, median_residual_px: 3 }, 'the thresholds of tie_geometry.py were fixed before its run and are not changed');
  for (const [k, t] of Object.entries(conf)) {
    const g = geo.pairs[k + '|' + t.res[0]]; assert.ok(g && g.status === 'ok', k + ' has no geometry'); assert.equal(t.geometry.class, g.class, k);
    if (g.class === 'SAME_PLATE') { assert.ok(g.inlier_fraction >= T.inlier_fraction && g.anisotropy <= T.anisotropy && Math.abs(g.rotation_deg) <= T.rotation_deg && g.perspective <= T.perspective && g.median_residual_px <= T.median_residual_px, k + ' is called same plate against the thresholds'); }
    else { assert.equal(g.class, 'SAME_SCENE', k); assert.ok(t.note.length > 80, k + ': a tie the rule calls only the same scene needs the note that says why it is kept'); }
    assert.ok(t.inliers >= 45, k);
  }
  assert.equal(Object.keys(met).length, 6); for (const [k, t] of Object.entries(met)) { assert.ok(ids.has(t.loc), k); assert.equal(t.confirmed_by_looking, true, k); assert.ok(t.geometry && t.geometry.class, k); }
  assert.ok(met.MMET268204.geometry.footprint_x_range_of_candidate_width[1] <= 0.6 && met.MMET268205.geometry.footprint_x_range_of_candidate_width[0] >= 0.4, 'the two plates cover the left and the right of the panorama');
  for (const id of ['P04', 'P05']) assert.ok(poses.poses.find(p => p.id === id).also_loc_ids.includes('2014646002'), id + ' is a plate of the panorama 2014646002');
  const byId = Object.fromEntries(wide.photographs.map(w => [w.loc_id, w]));
  for (const w of wide.photographs) {
    for (const o of w.same_exposure_as || []) { assert.ok(ids.has(o), w.loc_id + ' copy of unknown ' + o); if (byId[o]) assert.ok((byId[o].same_exposure_as || []).includes(w.loc_id), 'the copy tie ' + w.loc_id + ' - ' + o + ' is not symmetric'); }
    for (const r of w.rejected_ties || []) { assert.ok(!(w.same_exposure_as || []).includes(r.record), w.loc_id + ' ties a rejected lead'); assert.ok(r.why.length > 30, w.loc_id); }
  }
  assert.ok(wide.photographs.filter(w => (w.same_exposure_as || []).length).length >= 30 && wide.photographs.filter(w => (w.rejected_ties || []).length).length === 6);
  for (const r of reg.photographs.filter(r => (r.same_exposure_as || []).length)) for (const o of r.same_exposure_as) assert.ok(ids.has(o), r.loc_id + ' ' + o);
});
test('registry: one entry per catalogued record with a candid verdict and, where there is no pose, the reason', () => {
  assert.equal(reg.count, all.length); assert.equal(new Set(reg.photographs.map(r => r.loc_id)).size, all.length); const pv = Object.fromEntries(ver.pose_verdicts.map(v => [v.pose, v])); const live = new Set(poses.poses.filter(p => !p.superseded_by).map(p => p.id));
  for (const r of reg.photographs) {
    assert.ok(ids.has(r.loc_id)); assert.ok(r.why && r.why.length > 30, r.loc_id); assert.equal(r.reviewed_image, true, r.loc_id); assert.equal(typeof r.staged_flag, 'boolean'); if (r.staged_flag) assert.ok(r.staged_basis, r.loc_id);
    for (const p of r.pose_ids) assert.ok(live.has(p), r.loc_id + ' names a superseded pose as its headline: ' + p);
    if (r.pose_ids.length === 1) assert.equal(r.verdict, pv[r.pose_ids[0]].verdict, r.loc_id); else if (r.pose_ids.length === 0) assert.equal(r.verdict, 'cannot judge', r.loc_id);
  }
  assert.ok(reg.photographs.filter(r => r.staged_flag).length >= 20); assert.ok(reg.photographs.filter(r => r.catalogue === 'wide search (third pass)').length === wide.count);
});
test('gate Q16 stays not passing, counts the documented camera positions (a coordinate, a lens and a plate: none) apart from the camera places a source names, and says what would be needed; no linked sub-requirement is marked passed', () => {
  assert.equal(ver.gate_q16.passes, false); assert.ok(ver.gate_q16.what_is_needed.length >= 5); assert.ok(ver.gate_q16.owner_steps.length >= 1); assert.equal(ver.gate_q16.documented_position_count, 0);
  assert.ok(ver.gate_q16.documented_place_count >= 1); assert.ok(ver.gate_q16.documented_place_poses.every(p => poses.poses.some(q => q.id === p && q.position.place_documented)));
  for (const p of poses.poses) if (p.position.place_documented) assert.ok(ver.gate_q16.documented_place_poses.includes(p.id), p.id);
  const rq = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/battle-theatre/GOVERNANCE/requirements.json'))).sub_requirements.filter(s => (s.gate_ids || []).includes('Q16'));
  assert.ok(rq.length >= 45); for (const s of rq) assert.equal(s.passes, false, s.id);
  const gates = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/battle-theatre/GOVERNANCE/gates.json'), 'utf8')); const walk = o => Array.isArray(o) ? o.flatMap(walk) : o && typeof o === 'object' ? [o, ...Object.values(o).flatMap(walk)] : []; const q16 = walk(gates).filter(o => o.id === 'Q16' || o.gate === 'Q16'); for (const g of q16) assert.notEqual(g.passes, true, 'Q16 in gates.json');
});
test('the first test at a documented place: the measurements are stored, follow the pre-written definitions and are reported in the verdicts of the poses', () => {
  const mp = path.join(PM, 'criteria_measurements.json'), sp = path.join(PM, 'skyline_results.json'); if (!fs.existsSync(mp)) return;
  const m = J('criteria_measurements.json').measurements; for (const pid of ['P27', 'P28']) for (const k of ['_main', '_fov30', '_fov50']) { const e = m[pid + k]; assert.ok(e, pid + k); assert.ok(['pass', 'fail', 'empty', 'disagree', true, false].includes(e.T1_pass) && e.T2_horizon_frac > 0 && e.T2_horizon_frac < 1, pid + k); }
  const vv = Object.fromEntries(ver.pose_verdicts.map(v => [v.pose, v])); for (const pid of ['P27', 'P28']) { assert.ok(vv[pid], pid); assert.ok(vv[pid].numbers && vv[pid].numbers.criterion === 'C-P27-P28-1', pid); }
  if (fs.existsSync(sp)) { const s = J('skyline_results.json'); assert.ok(s.cases.P28 && s.cases.P29, 'both skyline cases'); for (const [cid, c] of Object.entries(s.cases)) { assert.ok(c.controls.length === 24 && c.columns > 500, cid); for (const k of Object.keys(c.summary)) assert.ok(typeof c.summary[k].S2_discriminated === 'boolean' && c.summary[k].S1_rms_deg > 0 && ['match-level', 'partial', 'mismatch'].includes(c.summary[k].S1_class), cid + ' ' + k); } }
});
test('staged-photograph flags are respected: no record that carries the flag has a pose (own or as a second print of a posed exposure), every one is cannot judge and carries its basis', () => {
  const posed = new Set(poses.poses.flatMap(p => [p.loc_id, ...(p.also_loc_ids || [])]).filter(Boolean));
  for (const r of reg.photographs.filter(x => x.staged_flag)) { assert.ok(!posed.has(r.loc_id), r.loc_id + ' is staged but has a pose'); assert.deepEqual(r.pose_ids, [], r.loc_id); assert.equal(r.verdict, 'cannot judge', r.loc_id); assert.ok(r.staged_basis && r.staged_basis.length > 20, r.loc_id); }
  for (const p of poses.poses) for (const l of [p.loc_id, ...(p.also_loc_ids || [])].filter(Boolean)) assert.equal(reg.photographs.find(r => r.loc_id === l).staged_flag, false, p.id + ' stands on a staged record ' + l);
});
test('review sheets: every pose has its sheet, the poses at a documented place also the lines-on-photograph image; the sheets are newer than the poses file entry they show only through their renders', () => {
  for (const p of poses.poses) { const s = path.join(PM, 'reports', p.id + '.jpg'); assert.ok(fs.existsSync(s) && fs.statSync(s).size > 20000, p.id + ' has no review sheet'); if (p.position.place_documented) { const l = path.join(PM, 'reports', p.id + '_lines.jpg'); assert.ok(fs.existsSync(l) && fs.statSync(l).size > 20000, p.id + ' has no lines image'); } }
});
test('the skyline statements in the verdict texts agree with the stored skyline results (the rank counts from the best fit: rank - 1 control stations fit better)', () => {
  const sky = J('skyline_results.json').cases, keyOf = { P27: ['P28', 'P27 north (337.5 to 22.5)'], P28: ['P28', 'P28 northwest (292.5 to 337.5)'], P29: ['P29', 'P29 east (67.5 to 112.5)'] };
  for (const v of ver.pose_verdicts) {
    const k = keyOf[v.pose]; if (!k) continue; const s = sky[k[0]].summary[k[1]]; assert.ok(v.numbers && v.numbers.skyline, v.pose); assert.equal(v.numbers.skyline.rank_of_station_among_25, s.rank_of_station_among_25, v.pose); assert.equal(v.numbers.skyline.S1_rms_deg, s.S1_rms_deg, v.pose);
    const ctr = sky[k[0]].controls.map(c => c[k[1]]); assert.equal(ctr.length, 24);
    const lo = ctr.filter(x => x < s.S1_rms_deg - 5e-5).length, hi = ctr.filter(x => x <= s.S1_rms_deg + 5e-5).length;   // the stored values are rounded to 4 decimals: controls tied with the station at that precision may count either way
    assert.ok(lo + 1 <= s.rank_of_station_among_25 && s.rank_of_station_among_25 <= hi + 1, v.pose + ': the stored rank ' + s.rank_of_station_among_25 + ' is not between ' + (lo + 1) + ' and ' + (hi + 1) + ' recomputed from the stored controls');
    const m = v.why.match(/(\d+) of the 24 control stations fit better/); if (m) assert.equal(+m[1], s.rank_of_station_among_25 - 1, v.pose + ': the verdict text counts the control stations that fit better wrongly');
    assert.equal(s.S2_discriminated, s.S1_rms_deg <= s.controls_q1, v.pose + ': discriminated means the station RMS is at or below the first quartile of the 24 controls');
  }
  assert.ok(ver.pose_verdicts.find(v => v.pose === 'P29').why.includes('18 of the 24 control stations fit better'), 'P29 verdict text');
});
test('P29 sheet numbers: the descriptive measurements were made from the stored renders and the frozen skyline rule, and the verdict text quotes them', () => {
  const m = J('p29_sheet_measurements.json'), v = ver.pose_verdicts.find(x => x.pose === 'P29');
  for (const k of ['main_fov40', 'fov30', 'fov50']) { const f = path.join(ROOT, 'tmp/photomatch/renders', 'P29' + ({ main_fov40: '', fov30: '_fov30', fov50: '_fov50' })[k] + '_base.png'); if (fs.existsSync(f)) assert.equal(sha(f), m.render[k].sha256, 'P29 ' + k + ' render changed since the sheet numbers were measured'); }
  assert.ok(v.why.includes(String(m.figure.crest_x_frac)) && v.why.includes(String(m.render.main_fov40.highest_point_row_frac)), 'the verdict text must quote the measured numbers');
  assert.equal(m.differences_at_registered_pose.crest_row_frac_difference_render_minus_photo, +(m.render.main_fov40.highest_point_row_frac - m.figure.crest_row_frac).toFixed(3));
});
test('render determinism record: every render of every registered pose was reproduced byte for byte by an independent full re-run, and the files on disk are the recorded ones', () => {
  const d = J('render_determinism.json'); assert.equal(d.files_expected, 6 * poses.poses.length); assert.equal(d.files_recorded, d.files_expected); assert.equal(d.files_identical_in_rerun, d.files_expected); assert.deepEqual(d.differing, []); assert.deepEqual(d.missing_in_rerun, []);
  assert.deepEqual(d.poses, poses.poses.map(p => p.id)); assert.ok(d.earlier_sessions.files >= 96 && d.earlier_sessions.identical_to_current === d.earlier_sessions.files && d.earlier_sessions.differing.length === 0);
  for (const [n, f] of Object.entries(d.files)) { assert.equal(f.sha256, f.rerun_sha256, n); assert.match(f.sha256, /^[0-9a-f]{64}$/, n); const p = path.join(ROOT, 'tmp/photomatch/renders', n); if (fs.existsSync(p)) assert.equal(sha(p), f.sha256, n + ' changed after the determinism check: run the re-run and record_determinism.py again'); }
});
test('the photo-match document shipped with the app carries no copy that the audit forbids', () => {
  const d = fs.readFileSync(path.join(ROOT, 'docs/battle-theatre/app/docs/PHOTOMATCH.md'), 'utf8'); assert.ok(d.length > 2000); assert.doesNotMatch(d, new RegExp(['\\bA' + 'I\\b', 'Cla' + 'ude', 'Anthro' + 'pic', '\\bage' + 'nts?\\b', 'suba' + 'gent', '\\bLL' + 'M\\b', 'language' + ' model'].join('|'), 'i'));
  assert.match(d, /not passing/i);
});
test('render is deterministic (SwiftShader), optional', { skip: !process.env.PHOTOMATCH_RENDER }, () => {
  const h = () => crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, 'tmp/photomatch/renders/P03_base.png'))).digest('hex');
  execFileSync('node', [path.join(PM, 'run.mjs'), 'P03'], { cwd: ROOT, stdio: 'ignore' }); const a = h();
  execFileSync('node', [path.join(PM, 'run.mjs'), 'P03'], { cwd: ROOT, stdio: 'ignore' }); assert.equal(h(), a);
});
