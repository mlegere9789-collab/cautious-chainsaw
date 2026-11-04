// Builds data/anim3d/*.json from the animation modules (single source of truth = the code in src/anim3d) and re-finds the ANIM-* drill items in the raw Hardee / Casey OCR (tmp/library/misc, sha256 checked against
// GOVERNANCE/library/acquired.json). Run:  node docs/battle-theatre/app/tools/build-anim3d.mjs [--check]   (--check exits 1 if a file on disk differs from what the code generates; used by tests/anim3d.test.mjs)
// Files: clips.json (catalogue of every clip with content hash), drill-timing.json (the tables of drill-tables.mjs with computed speeds), drill-march-extras.json (items ANIM-*), activity-map.json, layout.json (frame layout, rig bones).
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; import { fileURLToPath } from 'node:url';
import { ClipLibrary } from '../src/anim3d/library.mjs';
import * as DT from '../src/anim3d/drill-tables.mjs';
import { ALL_ACTIVITIES, CONTRACT_ACTIVITIES, EXTRA_ACTIVITIES } from '../src/anim3d/unit-anim.mjs';
import { PROPS } from '../src/anim3d/figure-pose.mjs';
import { cycleDurations, NOMINAL_CYCLE_S } from '../src/anim3d/musketry.mjs';
import { gunSegments, GUN_CYCLE_NOMINAL_S } from '../src/anim3d/clips-artillery.mjs';
import { FALL_END } from '../src/anim3d/unit-anim.mjs';
import { gaitTable } from '../src/anim3d/gaits.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url)), APP = path.resolve(HERE, '..'), BT = path.resolve(APP, '..'), ROOT = path.resolve(BT, '..', '..');
const OUT = path.join(APP, 'data', 'anim3d'), MISC = path.join(ROOT, 'tmp', 'library', 'misc');
const r6 = x => (typeof x === 'number' ? Math.round(x * 1e6) / 1e6 : x);
const round = o => JSON.parse(JSON.stringify(o, (k, v) => (typeof v === 'number' ? r6(v) : v)));

// ---- ANIM-* items: what the drill JSON files do not hold (the march rates). Each item: source id, ref, one verbatim phrase (<= 14 words, whitespace-collapsed, found in the OCR), expected page by the running head.
export const ITEMS = [
  { id: 'ANIM-H94', manual: 'HARDEE-1861b', file: 'riflelightinfant121hard_djvu.txt', ref: 'S.S. para 94 (Principles of the direct step)', paraphrase: 'Common time: the step is 28 inches heel to heel at 90 a minute.', verbatim: 'at the rate of ninety in a minute', printed_page: 24, page_confidence: 'medium', value: { stepsPerMin: 90, stepIn: 28, gait: 'common_time' } },
  { id: 'ANIM-H94b', manual: 'HARDEE-1861b', file: 'riflelightinfant121hard_djvu.txt', ref: 'S.S. para 94', paraphrase: 'Length of the step in common time: 28 inches, reckoning from heel to heel.', verbatim: 'twenty eight inches, reckoning from heel to heel', printed_page: 24, page_confidence: 'medium', value: { stepIn: 28 } },
  { id: 'ANIM-H102', manual: 'HARDEE-1861b', file: 'riflelightinfant121hard_djvu.txt', ref: 'S.S. para 102', paraphrase: 'Quick time: the principles are those of common time, but the swiftness is 110 steps a minute.', verbatim: 'rate of one hundred and ten steps per minute', printed_page: 25, page_confidence: 'medium', value: { stepsPerMin: 110, stepIn: 28, gait: 'quick_time' } },
  { id: 'ANIM-H104', manual: 'HARDEE-1861b', file: 'riflelightinfant121hard_djvu.txt', ref: 'S.S. para 104 (Principles of the double quick step)', paraphrase: 'Double quick: the step is 33 inches at 165 steps a minute.', verbatim: 'sixty-five steps per minute', printed_page: 26, page_confidence: 'medium', value: { stepsPerMin: 165, stepIn: 33, gait: 'double_quick' } },
  { id: 'ANIM-H114', manual: 'HARDEE-1861b', file: 'riflelightinfant121hard_djvu.txt', ref: 'S.S. para 114', paraphrase: 'Under urgent circumstances the double-quick cadence may be raised to 180 a minute; 4,000 yards would be covered in about 25 minutes.', verbatim: 'may be increased to one hundred and eighty per minute', printed_page: 28, page_confidence: 'medium', value: { stepsPerMin: 180, gait: 'double_quick_urgent', yards: 4000, minutes: 25 } },
  { id: 'ANIM-H116', manual: 'HARDEE-1861b', file: 'riflelightinfant121hard_djvu.txt', ref: 'S.S. para 116 (the run)', paraphrase: 'The run follows the principles of the double quick, the only difference being a greater degree of swiftness (no rate or step length printed).', verbatim: 'consisting in a greater degree of', printed_page: 28, page_confidence: 'medium', value: { gait: 'run', rate: null } },
  { id: 'ANIM-H247', manual: 'HARDEE-1861b', file: 'riflelightinfant121hard_djvu.txt', ref: 'S.S. paras 246-248 (To march backwards)', paraphrase: 'Marching backwards: 14 inches heel to heel, always in quick time.', verbatim: 'step off smartly with the left foot fourteen inches to the rear', printed_page: null, page_confidence: 'unknown', value: { stepIn: 14, gait: 'backward' } },
  { id: 'ANIM-H306', manual: 'HARDEE-1861b', file: 'riflelightinfant121hard_djvu.txt', ref: 'S.C. para 306 (Article Third, to march the column in route)', paraphrase: 'The swiftness of the route step is 110 steps a minute, habitually maintained in columns in route when roads and ground permit.', verbatim: 'swiftness of the route step will be one hundred and ten steps', printed_page: 154, page_confidence: 'medium', value: { stepsPerMin: 110, gait: 'route_step' } },
  { id: 'ANIM-H312', manual: 'HARDEE-1861b', file: 'riflelightinfant121hard_djvu.txt', ref: 'S.S. Part III para 312 (Alignments, man by man)', paraphrase: 'A recruit aligning himself marches two paces, shortens the last, stops about six inches behind the new alignment and then moves up to it by steps of two or three inches, touching the elbow of the next man lightly.', verbatim: 'move up steadily by steps of two or three inches', printed_page: 68, page_confidence: 'medium', value: { stepIn: [2, 3], gait: 'dress_step_up' } },
  { id: 'ANIM-H317', manual: 'HARDEE-1861b', file: 'riflelightinfant121hard_djvu.txt', ref: 'S.S. Part III para 317 (Right (or left) Dress)', paraphrase: 'At the command Right (or left) Dress the rank, except the two men in advance as a basis of alignment, moves up in quick time to align itself (heads and eyes turned toward the basis).', verbatim: 'except the two men placed in advance as a basis of alignment', printed_page: 69, page_confidence: 'medium', value: { gait: 'dress' } },
  { id: 'ANIM-H380', manual: 'HARDEE-1861b', file: 'riflelightinfant121hard_djvu.txt', ref: 'S.S. Part III para 380 (wheels from a halt)', paraphrase: 'In a wheel from a halt the pivot man only turns in his place, without advancing or receding.', verbatim: 'the pivot-man only turns in his place', printed_page: 81, page_confidence: 'medium', value: { stepIn: 0, gait: 'mark_time' } },
  { id: 'ANIM-H381', manual: 'HARDEE-1861b', file: 'riflelightinfant121hard_djvu.txt', ref: 'S.S. Part III para 381 (wheels in marching)', paraphrase: 'In a wheel in marching the pivot takes steps of nine inches in quick time or eleven inches in double quick time, so as to clear the wheeling point.', verbatim: 'the pivot takes steps of nine or eleven inches', printed_page: 81, page_confidence: 'medium', value: { stepInQuick: 9, stepInDoubleQuick: 11, gait: 'wheel_pivot' } },
  { id: 'ANIM-H382', manual: 'HARDEE-1861b', file: 'riflelightinfant121hard_djvu.txt', ref: 'S.S. Part III para 382 (wheeling flank)', paraphrase: 'The man on the wheeling flank takes the full step, 28 inches in quick time or 33 inches in double quick time.', verbatim: 'will take the full step of twenty-eight inches', printed_page: 81, page_confidence: 'medium', value: { stepInQuick: 28, stepInDoubleQuick: 33, gait: 'wheel_flank' } },
  { id: 'ANIM-H384', manual: 'HARDEE-1861b', file: 'riflelightinfant121hard_djvu.txt', ref: 'S.S. Part III para 384 (right wheel from a halt)', paraphrase: 'At the second command of a right wheel the rank steps off with the left foot, heads turned a little toward the marching flank, eyes on the line of the men to their left; the pivot man merely marks time, turning his body gradually.', verbatim: 'the pivot-man will merely mark time in gradually turning his body', printed_page: 81, page_confidence: 'medium', value: { gait: 'mark_time' } },
  { id: 'ANIM-C101', manual: 'CASEY-1862-1', file: 'infantrytacticsf01brig_djvu.txt', ref: 'S.S. para 101', paraphrase: 'Casey: the length of the direct step in common time is 28 inches at 90 a minute (same as Hardee).', verbatim: 'rate of ninety in a minute', printed_page: 29, page_confidence: 'medium', value: { stepsPerMin: 90, stepIn: 28, gait: 'common_time' } },
  { id: 'ANIM-C109', manual: 'CASEY-1862-1', file: 'infantrytacticsf01brig_djvu.txt', ref: 'S.S. para 109', paraphrase: 'Casey: quick time is 110 steps a minute.', verbatim: 'at the rate of one hundred and ten steps', printed_page: 32, page_confidence: 'medium', value: { stepsPerMin: 110, gait: 'quick_time' } },
  { id: 'ANIM-C111', manual: 'CASEY-1862-1', file: 'infantrytacticsf01brig_djvu.txt', ref: 'S.S. para 111', paraphrase: 'Casey: the double-quick step is 33 inches at 165 steps a minute.', verbatim: 'of one hundred and sixty-five steps per minute', printed_page: 32, page_confidence: 'medium', value: { stepsPerMin: 165, stepIn: 33, gait: 'double_quick' } },
];
export const collapse = s => s.replace(/\s+/g, ' ');
export function findItems(misc = MISC) {
  const acquired = JSON.parse(fs.readFileSync(path.join(BT, 'GOVERNANCE', 'library', 'acquired.json'), 'utf8')).items, bySrc = Object.fromEntries(acquired.map(a => [a.source_id, a]));
  const cache = {}; const out = [];
  for (const it of ITEMS) {
    const f = path.join(misc, it.file); let rec = { ...it, ocr_line: null, ocr_occurrences: 0, sha256_ok: null, tier: 'documented', verified: false };
    if (fs.existsSync(f)) {
      if (!cache[f]) { const buf = fs.readFileSync(f); cache[f] = { text: buf.toString('utf8'), sha: crypto.createHash('sha256').update(buf).digest('hex') }; }
      const { text, sha } = cache[f], lines = text.split('\n'); rec.sha256_ok = sha === bySrc[it.manual].sha256;
      // find the verbatim phrase across line breaks: collapse a sliding window of 3 lines
      let hits = 0, first = null; for (let i = 0; i < lines.length; i++) { const w = collapse(lines[i] + ' ' + (lines[i + 1] || '') + ' ' + (lines[i + 2] || '')); const j = w.indexOf(it.verbatim); if (j >= 0 && j < collapse(lines[i]).length + 1) { hits++; if (first === null) first = i + 1; } }
      rec.ocr_line = first; rec.ocr_occurrences = hits; rec.verified = hits >= 1 && rec.sha256_ok === true;
    }
    out.push(rec);
  }
  return out;
}

export function buildAll({ misc = MISC } = {}) {
  const skeleton = JSON.parse(fs.readFileSync(path.join(APP, 'data', 'figures3d', 'skeleton.json'), 'utf8'));
  const lib = new ClipLibrary(skeleton), rig = lib.rig;
  const march = Object.fromEntries(Object.entries({ ...DT.MARCH, ...DT.WHEEL }).map(([k, g]) => [k, { ...g, stepM: DT.stepM(g), stepsPerMinUsed: DT.stepsPerMin(g), speedMs: DT.speedOf(g), cycleS: 120 / DT.stepsPerMin(g), tier_note: g.stepTier || g.cadenceTier || '' }]));
  const files = {};
  files['clips.json'] = { schema: 'anim3d-clips-1', generated_by: 'app/tools/build-anim3d.mjs', rig: { human_bones: rig.n, core_bones: rig.nCore, frameLen: rig.frameLen, nTrans: rig.nTrans, frameLayout: `[${rig.nCore} core quats (x,y,z,w) | ${rig.nTrans} translations (xyz) | 7 extras: gripL, gripR, contactL, contactR, rootX, rootZ, rootYaw]`, core: rig.core.map(i => rig.names[i]), transBones: rig.transBones.map(i => rig.names[i]) }, clips: lib.catalogue() };
  files['drill-timing.json'] = { schema: 'anim3d-drill-timing-1', note: 'Every number carries its source ids and tier; see docs/ANIM3D-NOTES.md', march, motion: DT.MOTION, load9: DT.LOAD9, fire_times: DT.FIRE_TIMES, fire_rate: DT.FIRE_RATE, gun_steps: DT.GUN_STEPS, crew_posts_default: DT.crewPosts(), recoil: DT.RECOIL, reaction_s: DT.REACTION_S, file_fire: DT.FILE_FIRE, rank_fire: DT.RANK_FIRE,
    cycle_nominal_s: NOMINAL_CYCLE_S, cycle_segments_nominal: cycleDurations(NOMINAL_CYCLE_S, 0.6), gun_cycle_nominal_s: GUN_CYCLE_NOMINAL_S, gun_segments_nominal: gunSegments(GUN_CYCLE_NOMINAL_S).map(s => ({ id: s.id, t0: s.t0, t1: s.t1 })), hardee_4000yd_check: DT.HARDEE_4000YD, props: PROPS, gaps: DT.GAPS };
  files['drill-march-extras.json'] = { schema: 'anim3d-drill-items-1', note: 'Items the drill/*.json files do not carry (march rates). Verified against the OCR text by tests/anim3d.test.mjs; the brief said "90 steps/min of 28 in. quick time": the manuals print 90/min for COMMON time and 110/min for QUICK time.', items: findItems(misc).map(i => ({ ...i, verified: undefined, sha256_ok: undefined })) };
  files['activity-map.json'] = { schema: 'anim3d-activity-map-1', contract_activities: CONTRACT_ACTIVITIES, extra_activities: EXTRA_ACTIVITIES, all: ALL_ACTIVITIES,
    map: { march: 'locomotion by ground speed: common time 1.067, quick time / route step 1.304, double quick 2.305, urgent 2.515, run; carry shoulder / right shoulder shift / arms at will / trail', double_quick: 'march_double_quick_*', advance: 'march', retreat: 'march; at double quick or faster the running retreat looks back', charge: 'double quick at trail arms', halt: 'stand_shoulder (stand_rss after a route step)', stand: 'stand_shoulder', rest: 'stand_rest',
      fire: 'ready_from_shoulder, fire_cycle_{stand|kneel|lie} time-warped to the fire plan, shoulder_from_ready', skirmish: 'fire (at will)', serve_guns: 'gun_crew_{gunner|n1..n8|chief} on the gun plan', gallop: 'rider_{walk|trot|canter|gallop} + horse_{...} by speed', build_works: 'dig_shovel, chop_axe, lay_stone, march_carry_rail', camp: 'by day sit_fire, cook_stir, eat_hardtack, stand_rest', night_camp: 'by night sleep_side, sit_fire, stand_picket', picket: 'stand_picket', wounded_walk: 'walk_wounded', carry_wounded: 'carry_litter_front / carry_litter_rear',
      killed_or_wounded: 'fall_{back|front|side_left|side_right|knee_first|spin|clutch_wound|drop_rifle} then lie_{dead|wounded}_{back|front|side_left|side_right}' }, fall_end: FALL_END };
  files['gait-sources.json'] = gaitTable();
  files['layout.json'] = { schema: 'anim3d-layout-1', conventions: '+Y up, +Z forward, +X the figure\'s left; pose = local quaternion relative to rest (skeleton.json); frame layout as in clips.json', skin_matrix: '3 rows x 4 floats [R | t], t = p - R * restHead (inverseBind = translate(-head)), 3 texels per bone (RGBA)', bone_texture: 'rows = frames, columns = 3 * bones; bones = lod.mid.bones (36) or all (61)', vat: 'texel = frame * nvPad + vertex, RGB = position', mid_bones: rig.lod.mid.bones.map(i => rig.names[i]), hash: 'FNV-1a 32 over the float32 bytes of the baked clip' };
  return files;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const check = process.argv.includes('--check'), files = buildAll(); fs.mkdirSync(OUT, { recursive: true }); let bad = 0;
  for (const [name, obj] of Object.entries(files)) { const txt = JSON.stringify(round(obj), null, 1) + '\n', p = path.join(OUT, name);
    if (check) { if (!fs.existsSync(p) || fs.readFileSync(p, 'utf8') !== txt) { console.log('DIFFERS:', name); bad++; } } else { fs.writeFileSync(p, txt); console.log('wrote', p, (txt.length / 1024).toFixed(0) + ' KB'); } }
  process.exit(bad ? 1 : 0);
}
