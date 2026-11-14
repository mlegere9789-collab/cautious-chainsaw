"""Write docs/battle-theatre/life/evidence/groups.json and PLAN.md from groups_def.py, the record assignments, the lead scan and the registers.

    python3 -I tools/bt/life/build_groups.py

Run after: build_sources.py, assign_groups.py, scan_leads.py, build_contract.py, build_poses.py, build_inventory.py (and seed_rows.py once).
"""
import os, re, sys, json, glob, collections, datetime
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from life_lib import *
import groups_def as GD
import scan_leads as SL

utf8_stdout()
OUT_MD = os.path.join(EVID, 'PLAN.md')


def main():
    asg = load_json(os.path.join(EVID, 'report_assignments.json'))
    ori = {r['id']: r for r in load_json(OR_INDEX_PATH)['records']}
    summ = load_json(os.path.join(LEADS, 'SUMMARY.json')) if os.path.exists(os.path.join(LEADS, 'SUMMARY.json')) else {'groups': {}}
    inv = load_json(os.path.join(LIFE, 'inventory', 'works.json'))
    poses = load_json(POSES_PATH)
    lbr = load_json(os.path.join(LIFE, 'inventory', 'leads_by_record.json'))['groups'] if os.path.exists(os.path.join(LIFE, 'inventory', 'leads_by_record.json')) else {}
    # rows so far
    rows = collections.Counter()
    for fn in glob.glob(os.path.join(EVID, '*.jsonl')):
        rows[os.path.basename(fn)[:-6]] = len(read_jsonl(fn))
    texts = collections.defaultdict(list)
    for sid, g in SL.SOURCE_GROUP.items():
        if sid in sources():
            texts[g].append(sid)
    for sid in sources():
        if SL.NEWS.match(sid):
            texts['town-burial'].append(sid)
    works_by_owner = collections.defaultdict(list)
    for w in inv['works']:
        works_by_owner[w['owner_group']].append(w['id'])
    regids = {w['id'] for w in inv['works']}
    glist = []
    ids = [g['id'] for g in GD.GROUPS]
    assert len(ids) == len(set(ids)) and 14 <= len(ids) <= 22, len(ids)
    for g in GD.GROUPS:
        recs = [k for k, v in asg['assignments'].items() if v.get('group') == g['id']]
        byp = collections.Counter(ori[k]['part'] for k in recs)
        hand = [k for k in recs if asg['assignments'][k].get('needs_hand_check')]
        sm = summ.get('groups', {}).get(g['id'], {})
        first = [{'source_id': r['source_id'], 'record': r['record'], 'who': (r['who'] or '').strip()[:48], 'leads': r['leads']} for r in lbr.get(g['id'], [])[:10]]
        entry = {'id': g['id'], 'title': g['title'], 'side': g['side'], 'kind': g['kind'], 'days': g['days'], 'phase': g['phase'],
                 'output': 'docs/battle-theatre/life/evidence/%s.jsonl' % g['id'], 'report': 'docs/battle-theatre/life/evidence/%s.report.md' % g['id'],
                 'owns': {'official_records': {'count': len(recs), 'by_part': {str(p): n for p, n in sorted(byp.items())}, 'needs_hand_check': len(hand)},
                          'texts': sorted(set(texts.get(g['id'], []))) if g['id'] not in ('town-burial',) else sorted(set(texts['town-burial']))[:12] + ['(+ the 1863 newspaper issues, %d)' % sum(1 for t in texts['town-burial'] if SL.NEWS.match(t))],
                          'state_volume_sections': 'by regiment (scan_leads.py)' if g['kind'] == 'corps' else None, 'nps_texts': [t for t in texts.get(g['id'], []) if t.startswith('NPS')]},
                 'units': g['units'], 'works': sorted(works_by_owner.get(g['id'], [])),
                 'works_cross_listed': sorted(w for w in g['works'] if w in regids and w not in works_by_owner.get(g['id'], [])),
                 'schedule_rows_context': sorted(w for w in g['works'] if w not in regids), 'targets': g['targets'], 'clips': g['clips'], 'depends_on': g['depends'],
                 'leads': {'hits': sm.get('hits'), 'written': sm.get('written'), 'by_class_written': sm.get('by_class_written')}, 'first_reads': first, 'rows_so_far': rows.get(g['id'], 0)}
        glist.append(entry)
    doc = {'_doc': ('The 22 OA11 research groups (tools/bt/life/build_groups.py from groups_def.py). Every Official Records record, state-volume section and other local text belongs to exactly '
                    'one group (owns); a group extracts every row of work or routine from the texts it owns. `targets` are things to look for, not claims. Output: evidence/<id>.jsonl '
                    'validated by tools/bt/life/validate_evidence.py <id>; report: evidence/<id>.report.md.'),
           'schema': 'life-groups-1', 'built': datetime.date.today().isoformat(), 'count': len(glist), 'groups': glist,
           'unassigned_outside_clock': asg['counts_by_group'].get('null') or asg['counts_by_group'].get('None'), 'source_registry': 'docs/battle-theatre/life/evidence/sources.json',
           'assignments': 'docs/battle-theatre/life/evidence/report_assignments.json', 'leads': 'docs/battle-theatre/life/leads/', 'contract': 'docs/battle-theatre/life/evidence/contract.json',
           'poses': 'docs/battle-theatre/life/evidence/poses.json', 'works_register': 'docs/battle-theatre/life/inventory/works.json'}
    dump_json(GROUPS_PATH, doc)
    print('groups.json:', len(glist), 'groups')
    write_plan(doc, summ, inv, poses, asg)


def write_plan(doc, summ, inv, poses, asg):
    C = load_json(CONTRACT_PATH)
    srcs = load_json(SOURCES_PATH)
    L = []
    A = L.append
    A('# OA11 evidence pass: soldier work and routine (plan)\n')
    A('Workstream bt-life. Built %s by `tools/bt/life/build_groups.py`; the narrative below is that script\'s text, the tables are generated from `groups.json`, `contract.json`, `poses.json`, `inventory/works.json`, `leads/SUMMARY.json`. '
      'Nothing here is evidence: the evidence is the rows of `evidence/<group>.jsonl`, each with a verbatim quote that `validate_evidence.py` finds in a local text.\n' % doc['built'])
    A('## 1. What is asked, and the rules that bind it\n')
    A('Owner addition OA11 (2026-11-13): "soldiers are shown doing the work and the routine of the armies: building artillery positions, earthworks and defenses, and ordinary things such as eating meals in their camps". '
      'DEC-OA10-12 maps it to PDF B.7 (works are built on screen, never pre-placed; what existed before the battle is never given a construction animation), the unit activity rows of the timeline, gates Q08 and Q17 and the clips already in `app/data/anim3d/clips.json`; '
      'DEC-OA10-12 item 4 is the evidence rule this plan carries out: an activity is drawn as documented only where a non-lead source states it for that unit or place and time; otherwise it is plausible-procedural and marked; no meal time, ration or camp layout is invented; '
      'where the record is silent the scene uses the regulation or the period-documented practice and says so.\n')
    A('* No literal 100 percent is claimed (Law cl.3, DEC-003): documented / inferred / plausible-procedural, every gap registered and shown. Nothing is narrowed or deferred: a source that cannot be read here is listed as blocked, a lookup that finds nothing is recorded as failed (`open gap` rows with the list of what was searched).')
    A('* Source conflicts are carried as selectable scenarios (`conflicts` of a row, `scenario_key`); no default view is chosen (Law cl.6). The start of the Culp\'s Hill works (about 06:00 or the night of 1-2 July) is the first example (`us-12c-L001`).')
    A('* Never fabricate (Law cl.4): a row without a quote that the validator finds in the named local text is refused; a manual is never evidence that a unit did something on a day; Wikipedia, forums, blogs, auction pages and memory are not in the source registry and cannot be cited.')
    A('* Nothing here is deployed; no account, key or login was used. The six period manuals were fetched from archive.org (public domain, one request per second, no login).\n')
    A('## 2. What already exists and is reused (not redone)\n')
    A('* `structures/works_stages.json` (E-01..E-18, the 7-stage build model), `structures/state_schedule.json` (S-001..S-088), PDF B.7.3 (P-01..P-14 pre-existing walls: never construction), PDF B.7.5 (G-01..G-18 gun emplacements): the register `inventory/works.json` joins them.')
    A('* The fence close-outs `GOVERNANCE/evidence_corrections/fence-1..3.jsonl` (verbatim quotes with offsets for E-01..E-18 and S-001..S-088): `works.json` carries a digest of every sub-claim and whether it was supported; the groups turn the supported quotes into rows and add what is missing.')
    A('* `app/data/anim3d/clips.json` (%d clips): the activity clips and their limits are in `poses.json`.' % poses['clip_count'])
    A('* The local texts (`sources.json`, %d texts): Official Records vol. 27 parts 1-3, the state volumes, narratives, the 1863 newspapers, the National Park Service reports and six period manuals fetched for this pass (US Regulations 1861, Confederate Regulations 1863, Butterfield 1863, Mahan 1862, Duane 1862, Billings 1887).\n' % srcs['count'])
    A('## 3. The groups (%d)\n' % doc['count'])
    A('Partition rule: **every text or record has exactly one owner** (Official Records records by the unit that wrote them, or by date for part 3; state-volume sections by regiment; other texts by subject), so each passage is read once (extract-once). '
      'A group extracts every row from the texts it owns, whichever unit the row is about; `unit_id` is the unit, not the group. A work is assigned to the group whose texts most likely name its builder; a work that only another group\'s texts name is extracted there and cross-listed. '
      'The two army-level groups (`us-army`, `cs-cav-army`) also own the records the assignment rules could not place (`needs_hand_check` in `report_assignments.json`): decide the unit first, note it in the group report, extract.\n')
    A('| group | what it owns | records (pt1/pt2/pt3) | leads (hits) | works | rows now |')
    A('|---|---|---|---|---|---|')
    for g in doc['groups']:
        o = g['owns']['official_records']
        bp = o['by_part']
        A('| `%s` | %s | %d (%s/%s/%s) | %s | %s | %d |' % (g['id'], g['title'].split(':')[0][:110], o['count'], bp.get('1', 0), bp.get('2', 0), bp.get('3', 0),
                                                      (g['leads']['hits'] if g['leads']['hits'] is not None else 'not scanned'), ', '.join(g['works'][:8]) + (' ...' if len(g['works']) > 8 else '') or '-', g['rows_so_far']))
    A('\nOfficial Records records outside the theatre clock (part 3 documents dated before 22 June or after 14 July, or undatable): %s, listed in `report_assignments.json` with the reason (group null); they are not read for rows.\n' % (doc.get('unassigned_outside_clock')))
    for g in doc['groups']:
        A('### `%s`: %s\n' % (g['id'], g['title']))
        A('Days: %s. Phases: %s. Output: `%s`; report: `%s`. Depends on: %s.\n' % (g['days'], g['phase'], g['output'], g['report'], ', '.join('`%s`' % d for d in g['depends_on']) or 'nothing'))
        A('Looks for:')
        for t in g['targets']:
            A('* ' + t)
        if g['works'] or g['works_cross_listed'] or g['schedule_rows_context']:
            A('\nWorks owned (register `inventory/works.json`): ' + (', '.join(g['works']) or 'none') + '.' + (' Cross-listed (extracted by the owner group): ' + ', '.join(g['works_cross_listed']) + '.' if g['works_cross_listed'] else '')
              + (' Schedule rows for context (state_schedule.json, not in the register): ' + ', '.join(g['schedule_rows_context']) + '.' if g['schedule_rows_context'] else ''))
        if g['units']:
            A('Units (history/units.json): ' + ', '.join('`%s`' % u for u in g['units'][:12]) + ('...' if len(g['units']) > 12 else '') + '.')
        A('Clips likely used: ' + ', '.join('`%s`' % c for c in g['clips']) + '.')
        if g['first_reads']:
            A('First reads (most leads): ' + '; '.join('%s %s (%d)' % (r['record'] or r['source_id'], r['who'], r['leads']) for r in g['first_reads'][:6]) + '.')
        A('')
    A('## 4. The evidence contract\n')
    A('File: `docs/battle-theatre/life/evidence/<group>.jsonl`, one JSON object per line, ordered by id; definition in `contract.json` (read by the validator). Fields:\n')
    A('| field | meaning |\n|---|---|')
    for k, v in C['fields'].items():
        A('| `%s` | %s |' % (k, v.replace('|', '/')))
    A('\nSubkinds: labour %s; routine %s.\n' % (', '.join('`%s`' % k for k in C['subkinds']['labour']), ', '.join('`%s`' % k for k in C['subkinds']['routine'])))
    A('Tiers: ' + '; '.join('**%s**: %s' % (k, v) for k, v in C['tier_rules'].items()) + '.\n')
    A('Source classes and the tiers they may carry: ' + '; '.join('`%s` (%s)' % (k, '/'.join(v['tiers'])) for k, v in C['source_classes'].items()) + '.\n')
    A('Windows are page-clock minutes (since 1863-06-01 00:00 local mean time; the theatre runs 26 Jun - 14 Jul and 18-19 Nov). Bases: ' + '; '.join('`%s` %s' % (k, v) for k, v in C['window_bases'].items()) + '. '
      'A period word without an hour (morning, evening, "just before sunset") is carried as `part_of_day` with the day\'s bounds, the convention of `state_schedule.json` (date granularity); no hour is invented for it.\n')
    A('Men are a range with a basis (`' + '`, `'.join(C['men_bases']) + '`); a number stated as a count must stand in the quote (checked, digits and number words). Tools and props carry their own basis (`' + '`, `'.join(C['item_bases']) + '`). '
      '`activity_basis` says whether the passage names the act the clip shows (`stated`), it follows (`inferred`) or the clip is a stand-in (`procedural`).\n')
    A('Page-clock, offsets and pages: `offset_start`/`offset_end` are character offsets in the raw local text (UTF-8, newline untouched, the convention of `or27_find.py` and the fence files); for the Official Records the validator also checks the record (`report_id`), the part and the printed page against the running-head page model; '
      'for park reports the `=== PAGE n ===` marker (`pdf_page`).\n')
    A('## 5. The validator\n')
    A('`python3 -I tools/bt/life/validate_evidence.py <group>` | `--all` | `--self-test` (exit 1 on any failure; `--strict` refuses a quote that needed the OCR fold; `--json`). Checks, per row: keys and enumerations; unit id in `units.json`; work id; clip id in `clips.json`; pose id in `poses.json`; window inside the theatre clock; '
      'tier against source class; the quote found in the named local text (whitespace, hyphenation and typography tolerant; an OCR-confusion fold or a small edit distance only with declared `ocr_repairs`) at the stated offsets, inside the stated record, on the stated printed page, with every stated number present; '
      'the clock words behind a `stated_clock` window; open gaps carrying no quote and a list of failed lookups; pre-existing features never built; with `--all`: unique ids, duplicate passages, cross-references. '
      'The self-test (55 checks) builds a synthetic text and a synthetic manual, checks the matcher (exact, hyphenation, typography, OCR fold, edit distance, a fabricated sentence), then mutates a valid row 26 ways and requires the validator to refuse each with the right code, and runs checks on real text: a passage of the Official Records (record, part, page by running head and by scan leaf) and a state-volume section (section, page anchor).\n')
    A('## 6. Works (labour) register\n')
    A('`inventory/works.json`: %d candidate works (%s). It lists every work the plan\'s tables print (E-01..E-18, G-01..G-18, the labour rows of the state schedule) with builder, window as printed, flags, the fence close-out digest and the rows of this pass; and %d candidates of this pass '
      '(search targets named by PDF B.7.8 and the bridges, roads and works outside the Gettysburg map the Official Records name). Nothing is marked documented in the register.\n' % (inv['count'], ', '.join('%s %d' % (k, v) for k, v in sorted(inv['counts'].items())), sum(1 for w in inv['works'] if w['id'].startswith('W-'))))
    A('Eleven seed rows already stand in six group files (`us-1c`, `us-2c`, `us-5c`, `us-12c`, `us-army`, `cs-2c`): passages found while planning, each located by the validator\'s own matcher, each owed a second reading by its group. They show the contract on real text: a documented row, two inferred rows (a supposition and a hearsay), a conflict carried as a scenario (`C-E05-START`), a work outside the map, a bridge burned, a fire fought, a coffee cooked at 02:30, supper preparing at sunset.\n')
    A('## 7. Routine: how it is listed\n')
    A('%sRoutine statements are not a table the plan can print in full: there are %s keyword hits in the owned texts. `leads/<group>.leads.jsonl` lists every hit (up to %s per record and class; the rest counted in `leads/SUMMARY.json`) with source, record, page, offsets, a date hint and a verbatim context; '
      '`inventory/leads_by_record.json` orders the records of each group by number of leads. A lead is a lead: the group reads it, decides what it says, and writes the row (or records that it says nothing about work or routine). '
      'Classes: `meal` (breakfast, coffee, rations, cooking, hardtack, supper), `rest` (bivouac, camp, slept, rested, stacked arms, blankets), `picket` (picket, outpost, vedette, sentry, patrol), `water_wash_burial` (canteens, wells, springs, washing, burial, graves), '
      '`works`, `tools`, `bridge_road`. The approach days (26-30 June), the nights, and the retreat (4-14 July) are covered by the correspondence groups and by every corps group\'s own reports.\n' % ('' if summ.get('complete') else ('**The scan is PARTIAL (phases run: %s; the phases not run are: %s): the counts below cover only the phases run; the full scan is `tools/horde/bench.sh python3 -I tools/bt/life/scan_leads.py` (phases: or = Official Records, statevol = state volumes with a section index, texts = narratives, newspapers, park reports, manuals).** ' % (', '.join(summ.get('phases_run', [])), ', '.join(sorted({'or', 'statevol', 'texts'} - set(summ.get('phases_run', []))))) if summ.get('groups') else '**The lead scan has not run yet.** '), sum(v['hits'] for v in summ['groups'].values()) if summ.get('groups') else 'n/a', summ.get('cap_per_record_and_class', 'n/a')))
    A('## 8. Clips and the poses that are missing\n')
    A('The activity clips (`poses.json activity_clips`) and what each covers and lacks:\n')
    A('| clip | tier / gap | covers | limit |\n|---|---|---|---|')
    for c in poses['activity_clips']:
        A('| `%s` | %s / %s | %s | %s |' % (c['id'], c['tier'], c.get('gap') or '-', ', '.join(c['covers']) or '-', c['limits'] or c['label']))
    pm = poses['missing_poses']
    A('\n%d poses are missing (%d labour, %d routine; P1 %d, P2 %d). Each has an id (`POSE-L..`, `POSE-R..`), the activity it serves, the nearest existing clip as a stand-in, the prop bone and a one-line description of the motion; a row names it in `pose_needed`; '
      'a pose is authored only when a row names it (`build_poses.py --demand` counts the rows). All are plausible-procedural animation (gap G-ANIM-09 and the clip tier rules): a pose claims nothing about 1863. Poses that need a horse or a wagon say so (request note to the figures workstream, not built here).\n' % (
        len(pm), sum(1 for m in pm if m['kind'] == 'labour'), sum(1 for m in pm if m['kind'] == 'routine'), sum(1 for m in pm if m['priority'] == 'P1'), sum(1 for m in pm if m['priority'] == 'P2')))
    A('| id | pose | serves | nearest clip | prop |\n|---|---|---|---|---|')
    for m in pm:
        A('| `%s` | %s: %s | %s | `%s` | %s |' % (m['id'], m['name'], m['pose'][:90], ', '.join(m['serves'][:4]), m['nearest_clip'], m['prop']))
    A('\n## 9. What a group does (the procedure)\n')
    for i, t in enumerate([
        'Read `groups.json` for the group, `leads/<group>.leads.jsonl` and `inventory/leads_by_record.json` (the reading order); start with the records that carry the most leads.',
        'Read each owned record in full around its leads; do not extract from a lead\'s snippet alone. For a work of `works.json`, start from its close-out digest and the quotes of the fence file it names (re-find them with `or27_find.py --verify`; never copy an offset blindly).',
        'Write one row per statement (one unit, one activity, one place, one window); several materials or tools of one passage are one row with several `tools_props`. Quote 20 to 600 characters, OCR errors as printed; give the offsets from `or27_find.py` or from the matcher.',
        'Choose the tier by the rules of section 4; set `activity_basis`; map the clip (`poses.json`) or name the missing pose; set `men` and `tools_props` only from the passage (a number not in the quote is refused).',
        'Where two texts disagree (time, number, builder, place) write both rows and a `conflicts` entry on each with a `scenario_key`; never merge or choose.',
        'Where the record is silent for a unit or work the plan names, write an `open gap` row (what was searched, in which texts, with which patterns, the result) and a register entry `EG-LIFE-nnnn`; a failed lookup is recorded as failed.',
        'Run `python3 -I tools/bt/life/validate_evidence.py <group>` until it exits 0; then a second reading of every row against its own quote (a different pass, a different sitting); then write `<group>.report.md` (counts by kind, subkind, tier; conflicts; gaps; poses named; what was not read).',
        'Do not edit another group\'s file: a row about a unit of another group that sits in a text you own is yours; a passage in a text you do not own is a note in your report for its owner.',
        'Append one dated line to `GOVERNANCE/progress.md` at each milestone with a single shell append.']):
        A('%d. %s' % (i + 1, t))
    A('\n## 10. Done means\n')
    A('A group is done when its file validates (`--all` exit 0), every owned record has been read at its leads, every work assigned to it has rows or a registered gap, every row has had a second reading, the report is written, and nothing in the file says how the page was produced. '
      'The pass is done when all %d groups are done and `validate_evidence.py --all` exits 0 on the merged files. Nothing in this plan marks OA11 satisfied: the gates (Q08, Q17) and the content modules that draw these rows are later steps.\n' % doc['count'])
    A('## 11. How the rows meet the derived gate OA-G11 (GATE-SPEC-A 3.10, DD-G14)\n')
    for t in ['(a) works: every construction (E-01..E-18 construction rows, the prepared emplacements G-03 and G-12, the builds of DD-04 (G-03 per-gun earthworks of the evening of 1 July, G-11 split, G-18 Stevens\' Knoll, from the terrain-1 and terrain-2 close-outs) and every further defence a source documents, such as rails pulled for breastworks) needs its builder, its tools and its interval: the labour rows carry `unit_id` or `work_id` with `builder_unknown` (the labelled stand-in crew of PDF B.7.1), `tools_props` and `window`; a work with no row stays a registered gap, never an unbuilt feature.',
              '(b) artillery positions: `gun_pit_or_epaulement` and `battery_platform` rows for the G rows; the guns brought and served there belong to the artillery workstreams, not to this evidence.',
              '(c) routine: every unit-time slot needs an activity class and a place region. This pass supplies the sourced slots (rows of kind routine, with place and window) and the basis for the rest (generic rows of `period-manuals`: the ration, the daily calls, camp police, guard and picket duty). Which slots are covered by a documented, an inferred or only a generic row is computed from the files by the content module and by each group report (units of the group x days 26 Jun - 14 Jul); this plan claims no coverage.',
              '(d) evidence: documented only from a non-lead source that states it for that unit, place and time; otherwise plausible-procedural, marked; no meal time, ration or camp layout invented: a meal hour is only ever a manual\'s hour (generic row) or a unit\'s own statement (documented row).',
              '(e) nights: every group report lists the nights of its window (26/27 June to 13/14 July) by unit with a row or the generic basis; the night rows (sleep, picket, fires, cooking at 02:30 as in `us-2c-R001`) are the ones the luminance floor of Q10 draws.',
              '(f) the page loads the scenes: the data of the content module (`app/data/life`) is a later step and is not started here.']:
        A('* ' + t)
    A('')
    A('## 12. Rebuild order and files\n')
    A('`python3 -I tools/bt/life/acquire_texts.py` (period manuals, 1 request per second) -> `build_sources.py` -> `assign_groups.py` -> `scan_leads.py` (heavy: through `tools/horde/bench.sh`) -> `build_contract.py` -> `build_poses.py` -> `seed_rows.py` (only writes missing ids) -> `build_inventory.py` -> `build_groups.py` (this file) -> `validate_evidence.py --self-test` and `--all`. '
      'Files: `evidence/{contract,groups,sources,poses,report_assignments,acquired_period}.json`, `evidence/<group>.jsonl`, `leads/*.leads.jsonl`, `leads/SUMMARY.json`, `inventory/{works,leads_by_record}.json`, `tools/bt/life/*.py`.\n')
    A('## 13. Not run, not claimed, owed\n')
    for t in ['No evidence row beyond the 11 seed rows exists yet; no count of documented rows is claimed.',
              'The lead scan is a keyword scan: a passage that speaks of work or routine without those words is not a lead (the groups read their records, not only their leads).',
              'The assignment of records to groups is by header rules (corps in the heading, regiment name, commander name); `needs_hand_check` lists what was placed by default.',
              'Pages: for Official Records records whose running head is lost the page is a range (the validator accepts any page in it); the state volumes and newspapers have no page model here.',
              'The matcher\'s OCR fold and edit distance are tolerance for scan errors; they do not repair digits: a number read from a damaged print needs a second witness (`ocr_repairs`).',
              'Browser and GPU: nothing here draws anything; no view was looked at, no timing was taken. The content modules (`src/ext/camp-life`) and their data (`app/data/life`) are not started by this task.',
              'Owner-only steps: none. The period manuals are public domain and were fetched without an account; if the owner wants Casey and Hardee (the stack-arms and halt commands), the identifiers are in the drill notes (`infantrytacticsf01brig`, `hardeesrifleligh01hard`) and the group `period-manuals` may fetch them with `acquire_texts.py`.']:
        A('* ' + t)
    with open(OUT_MD, 'w', encoding='utf-8', newline='\n') as f:
        f.write('\n'.join(L) + '\n')
    print('PLAN.md written,', len(L), 'lines')


if __name__ == '__main__':
    main()
