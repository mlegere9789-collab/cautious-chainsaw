"""Build docs/battle-theatre/life/inventory/works.json (the register of works soldiers built or improved, 26 June - 14 July 1863) and
docs/battle-theatre/life/inventory/leads_by_record.json (the routine and labour leads by report, section and text).

    python3 -I tools/bt/life/build_inventory.py

works.json is a REGISTER OF CANDIDATES with, for each work, what the existing structured files print (structures/works_stages.json, structures/
state_schedule.json, PDF B.7.5), a digest of what the close-outs of the fence evidence (GOVERNANCE/evidence_corrections/fence-1..3) found
supported or open, the evidence rows of this pass that name it (evidence/*.jsonl), and the group that owns it.  source_status says honestly:
  evidence_row        a row of this pass cites a verbatim passage of a local non-lead text
  closeout_supported  the fence close-out matched verbatim quotes for part of it (not yet turned into rows of this pass)
  pdf_only            the plan prints it; no text read for this pass
  search_target       a gap or lead of PDF B.7.8 or of the lead scan; nothing read
Nothing is marked documented here.
"""
import os, re, sys, json, glob, collections, datetime
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from life_lib import *
import groups_def as GD

utf8_stdout()
INV = os.path.join(LIFE, 'inventory')
GOV = os.path.join(BT, 'GOVERNANCE')

# PDF B.7.5 (gun emplacements): id, battery, position, time as printed, prepared or improvised as printed, plan tier as printed
G = [
 ('G-01', 'Calef, Battery A, 2nd US (six 3-inch rifles)', 'McPherson Ridge', 'night of 30 Jun in a hollow; morning 1 Jul about 600 yd forward; relieved about 10:00', 'improvised field position', 'documented'),
 ('G-02', 'I Corps batteries (Wainwright, 20-22 guns)', 'Seminary Ridge behind the E-01 rail barricade', '1 Jul afternoon to about 16:30', 'improvised (guns behind hasty rail works)', 'documented'),
 ('G-03', 'Wiedrich (1st NY I), Ricketts (Pa. F and G), Stewart (B, 4th US), Battery L 1st NY', 'East Cemetery Hill, lunettes near the gatehouse', 'lunettes by about 16:00 2 Jul', 'prepared (earth lunettes); builder unknown', 'documented (existence)'),
 ('G-04', 'Latimer\'s battalion (about 20 guns)', 'Benner\'s Hill', 'about 16:00 2 Jul', 'no works described', 'documented'),
 ('G-05', 'Smith\'s 4th NY (six 10-pdr Parrotts)', 'Devil\'s Den / Houck\'s Ridge', 'arrived 09:00 2 Jul', 'improvised', 'documented'),
 ('G-06', 'Hazlett\'s Battery D, 5th US', 'Little Round Top summit', 'march 16:30; first fire 17:45 2 Jul', 'improvised; hand-hauled', 'documented'),
 ('G-07', 'Hart\'s 15th NY (four Napoleons)', 'Peach Orchard, Wheatfield Road', 'forward 16:00; placed about 16:30 2 Jul', 'improvised (open field)', 'documented'),
 ('G-08', 'Huger\'s four batteries of Alexander\'s battalion', 'Peach Orchard region', 'about 16:00 2 Jul', 'no works described', 'documented'),
 ('G-09', 'Cabell\'s battalion', 'edge of woods by the Emmitsburg Road', '2 Jul; 3 Jul about 13:00', 'no works described', 'documented'),
 ('G-10', 'Bigelow\'s 9th Mass. (six Napoleons)', 'Wheatfield Road, then by prolonge to the wall near Trostle\'s house', '16:30-18:30 2 Jul', 'improvised; second position behind existing wall P-06', 'documented'),
 ('G-11', 'McGilvery\'s Plum Run line (6 to 23 guns)', 'south of Cemetery Ridge along Plum Run', 'assembled 2 Jul evening', 'improvised', 'documented'),
 ('G-12', 'Cushing\'s Battery A, 4th US (six 3-inch rifles)', 'the Angle, between the 71st and 72nd PA', '2 Jul late afternoon; 3 Jul about 13:00-15:30', 'prepared position in line; guns run to the pre-existing wall', 'documented'),
 ('G-13', 'Union ridge line (Hunt)', 'Cemetery Hill to Little Round Top', 'by 13:00 3 Jul', 'mixed; prepared batteries on the ridge', 'documented, count range'),
 ('G-14', 'Confederate line (Alexander)', 'more than 2 miles along the Emmitsburg Road', 'placed from dawn 3 Jul; fire about 13:00', 'open positions', 'documented, count range'),
 ('G-15', 'Carter\'s rifles', 'both sides of the railroad cut, Oak Hill', '3 Jul', 'no works described', 'documented'),
 ('G-16', 'Hurt\'s guns (McIntosh\'s battalion)', 'Oak Hill/Oak Ridge or the Peach Orchard (conflict)', '3 Jul', 'no works described', 'documented, conflict'),
 ('G-17', 'Powers Hill guns', 'Powers Hill', 'morning 3 Jul', 'not described', 'documented'),
 ('G-18', 'Union Culp\'s Hill batteries', 'Stevens\' Knoll and around', 'about 04:00 3 Jul', 'not described', 'documented'),
]
# schedule rows (state_schedule.json) that are acts of soldiers
S_LABOUR = ['S-001', 'S-003', 'S-009', 'S-010', 'S-014', 'S-015', 'S-023', 'S-024', 'S-025', 'S-026', 'S-043', 'S-052', 'S-054']
# builders as unit-name lookups (resolved against units.json; None when no unit of units.json fits)
BUILDERS = {
 'E-01': ['us-1c-art'], 'E-02': ['us-1c-1d', 'us-1c-1d-meredith-6wi'], 'E-03': ['us-12c-1d:123rd NY'], 'E-04': ['us-11c-2d', 'us-11c-art'],
 'E-05': ['us-12c-2d-greene', 'us-12c-2d-greene-60ny', 'us-12c-2d-greene-78ny', 'us-12c-2d-greene-102ny', 'us-12c-2d-greene-137ny', 'us-12c-2d-greene-149ny'],
 'E-06': ['us-12c-2d-greene', 'us-12c-2d-greene-137ny'], 'E-07': ['us-12c-2d-kane', 'us-1c-1d'], 'E-08': ['us-12c-1d', 'us-12c-1d-lockwood'], 'E-09': ['us-12c-2d-greene'],
 'E-10': ['cs-2c-johnson-steuart'], 'E-11': ['us-12c', 'us-12c-2d-greene'], 'E-12': [], 'E-13': ['us-5c-1d-vincent'], 'E-14': ['us-5c-2d-weed', 'us-5c-3d-fisher'],
 'E-15': ['us-5c-art:5th US D'], 'E-16': ['us-3c-1d-ward'], 'E-17': [], 'E-18': [],
}
TL = {'E-01': ['T1-136', 'T1-137'], 'E-02': ['T1-181', 'T1-202', 'T2-008'], 'E-03': ['T1-182', 'T2-009'], 'E-04': ['T1-127', 'T1-183', 'T2-084'], 'E-05': ['T2-059', 'T2-061', 'T2-081'],
      'E-06': ['T2-081'], 'E-07': ['T2-061'], 'E-08': ['T1-201', 'T2-071'], 'E-09': ['T3-004'], 'E-10': ['T3-009', 'T3-024'], 'E-12': ['T1-183'], 'E-14': ['T2-196', 'T3-029'], 'E-15': ['T2-153'],
      'S-003': ['T1-050'], 'S-005': ['T1-085'], 'W-COULTER-BREASTWORKS': ['T1-184', 'T2-011'], 'W-13MA-RIFLE-PIT': ['T2-027'], 'W-ANGLE-WALL-STRENGTHENED': ['T2-241', 'T3-027'],
      'W-GBG-STATION-RAILS-TORN': ['T1-015'], 'W-FALLING-WATERS-WORKS-JUL14': ['T3-205'], 'W-BURIAL-TRENCHES': ['T3-139', 'T3-150', 'T3-196'], 'W-CAMP-LETTERMAN': ['T3-192', 'T3-196']}
CONFLICT_NOTES = {'E-08': 'timeline T1-201 puts the log breastwork on arrival on the night of 1 July; works_stages E-08 says the morning of 2 July: carry both as scenarios (no default)'}
# candidates beyond the plan's tables: nothing here is claimed; status says what was read
W = [
 ('W-WRIGHTSVILLE-WORKS', 'militia works at the Wrightsville bridgehead', 'Wrightsville, on the Susquehanna (outside the Gettysburg map)', 'campaign-elsewhere', 'earth_parapet', 'evidence_row', 'cs-2c-L001'),
 ('W-WRIGHTSVILLE-BRIDGE', 'the railroad bridge at Wrightsville burned by the militia', 'Wrightsville-Columbia (outside the map)', 'bridges-roads', 'bridge_destroyed', 'evidence_row', 'cs-2c-L002'),
 ('W-FALLING-WATERS-PONTOON', 'the Confederate pontoon bridge at Falling Waters and Williamsport destroyed by Union cavalry', 'Falling Waters and Williamsport, Md. (outside the map)', 'bridges-roads', 'bridge_destroyed', 'evidence_row', 'us-army-L001'),
 ('W-WILLIAMSPORT-WORKS', 'Confederate positions from Falling Waters to Funkstown said to be intrenched (10 Jul)', 'Falling Waters - Downsville - Funkstown - Hagerstown (outside the map)', 'corr-jul4-14', 'breastwork_infantry', 'evidence_row', 'us-army-L002'),
 ('W-SEMINARY-BREASTWORKS-94NY', 'breastworks ordered near the brick seminary, 1 Jul (94th NY)', 'Seminary Ridge', 'us-1c', 'breastwork_infantry', 'evidence_row', 'us-1c-L001'),
 ('W-COULTER-BREASTWORKS', 'Coulter\'s First Brigade (Robinson\'s division, I Corps) builds breastworks behind Cemetery Hill, about 19:00 on 1 Jul (PDF timeline T1-184, T2-011: verified against the Official Records by the timeline close-out)', 'behind Cemetery Hill', 'us-1c', 'breastwork_infantry', 'search_target', None),
 ('W-13MA-RIFLE-PIT', 'the 13th Massachusetts gathers rails and digs a rifle pit south of the Bryan farm, night of 1-2 Jul (PDF T2-027; the timeline close-out found no verifying text)', 'Cemetery Ridge, south of the Bryan farm', 'us-1c', 'rifle_pits', 'search_target', None),
 ('W-ANGLE-WALL-STRENGTHENED', 'II Corps strengthens the stone wall before dawn on 3 Jul (PDF T2-241, T3-027): an improvement of the pre-existing wall P-01, never a construction of it', 'Cemetery Ridge, the Angle', 'us-2c', 'wall_improved', 'search_target', None),
 ('W-GBG-STATION-RAILS-TORN', 'rails and telegraph lines torn up, rail cars and the covered bridge burned at the Gettysburg station, evening 26 Jun (PDF T1-015)', 'Gettysburg railroad station', 'cs-2c', 'bridge_destroyed', 'search_target', None),
 ('W-FALLING-WATERS-WORKS-JUL14', 'Confederate rear-guard works at Falling Waters, 14 Jul (PDF: Custer and Kilpatrick charged "entrenched men")', 'about 1.5 miles from Falling Waters (outside the map)', 'corr-jul4-14', 'breastwork_infantry', 'search_target', None),
 ('W-BURIAL-TRENCHES', 'burial of the dead by soldiers, townspeople and farmers in shallow graves and trenches with headboards, 4-10 Jul (PDF T3-139, T3-150, T3-196)', 'battlefield and hospital sites', 'town-burial', 'other_labour', 'search_target', None),
 ('W-CAMP-LETTERMAN', 'construction of Camp Letterman from 10 Jul (S-077; cross-list with the hospital evidence)', 'east of the borough', 'town-burial', 'other_labour', 'search_target', None),
 ('W-HARRISBURG-DEFENSES', 'defenses of Harrisburg and the Susquehanna crossings, 26-30 Jun (militia and regulars)', 'Harrisburg and Camp Hill (outside the map)', 'campaign-elsewhere', 'earth_parapet', 'search_target', None),
 ('W-CEM-RIDGE-RAIL-STONE', 'rail and stone works on Cemetery Ridge, 2-3 Jul (E-17 is the plan\'s open gap)', 'Cemetery Ridge', 'us-2c', 'rail_barricade', 'search_target', None),
 ('W-SKIRMISH-PITS-EMMITSBURG-RD', 'rifle pits of skirmishers along the Emmitsburg Road and at the Bryan and Codori farms', 'Emmitsburg Road', 'us-2c', 'rifle_pits', 'search_target', None),
 ('W-CONFED-SEMINARY-WORKS', 'Confederate works on Seminary Ridge, 1-3 Jul (child of E-18)', 'Seminary Ridge', 'cs-3c', 'breastwork_infantry', 'search_target', None),
 ('W-CONFED-WARFIELD-WORKS', 'Confederate works on Warfield Ridge, Devil\'s Den and Round Top, 2-3 Jul (child of E-18)', 'Warfield Ridge', 'cs-1c', 'stone_works', 'search_target', None),
 ('W-CONFED-OAK-HILL-BENNER', 'Confederate works on Oak Hill and Benner\'s Hill (child of E-18, with G-04 and G-15)', 'Oak Hill, Benner\'s Hill', 'cs-2c', 'gun_pit_or_epaulement', 'search_target', None),
 ('W-TOWN-BARRICADES', 'barricades, loopholes and sniper posts in the borough (child of E-18, S-022)', 'Gettysburg borough', 'town-burial', 'barricade_street', 'search_target', None),
 ('W-POWERS-HILL-EMPLACEMENTS', 'Powers Hill gun emplacements and the Engineer works (PDF B.7.8: Warren and the Engineer Brigade)', 'Powers Hill', 'us-12c', 'gun_pit_or_epaulement', 'search_target', None),
 ('W-BIG-ROUND-TOP-WORKS', 'works on Big Round Top and the road cut by gunners (PDF B.7.8)', 'Big Round Top, Little Round Top', 'us-5c', 'stone_works', 'search_target', None),
 ('W-WEST-CEMETERY-HILL-WORKS', 'West Cemetery Hill battery works and Evergreen Cemetery wall details (PDF B.7.8)', 'West Cemetery Hill', 'us-11c', 'gun_pit_or_epaulement', 'search_target', None),
 ('W-POTOMAC-PONTOONS-JUN', 'Union pontoon bridges over the Potomac at the end of June (Edwards Ferry and Berlin)', 'Potomac, Md. (outside the map)', 'bridges-roads', 'bridge_laid', 'search_target', None),
 ('W-LEE-RETREAT-BRIDGES', 'bridges and ferries of Lee\'s retreat, 4-14 Jul (Williamsport, Falling Waters)', 'Potomac at Williamsport (outside the map)', 'bridges-roads', 'bridge_laid', 'search_target', None),
 ('W-ROADS-CUT', 'roads cut or repaired by either army, 26 Jun - 14 Jul', 'various', 'bridges-roads', 'road_cut_or_improved', 'search_target', None),
]


def unit_lookup(spec):
    us = units()
    if ':' in spec:
        parent, name = spec.split(':', 1)
        for u in us.values():
            if u.get('name') == name and (u['id'].startswith(parent) or u.get('parent', '') and u['id'].startswith(parent)):
                return u['id']
        for u in us.values():
            if u.get('name') == name and u['id'].startswith(parent.rsplit('-', 1)[0]):
                return u['id']
        return None
    return spec if spec in us else None


def fence_digest():
    d = {}
    for f in ('fence-1', 'fence-2', 'fence-3', 'terrain-1', 'terrain-2'):
        p = os.path.join(GOV, 'evidence_corrections', f + '.jsonl')
        if not os.path.exists(p):
            continue
        for ln, line in read_jsonl(p):
            r = json.loads(line)
            key = r['id'].split('.', 1)[1] if '.' in r['id'] else r['id']
            subs = r.get('sub_claims') or r.get('subclaims') or []
            n_cit = sum(len(s.get('citations') or s.get('cites') or []) for s in subs)
            d[key] = {'file': 'GOVERNANCE/evidence_corrections/%s.jsonl' % f, 'row': r['id'], 'verdict': r.get('verdict'), 'status': r.get('status'),
                      'sub_claims': [{'sc': s.get('sc'), 'claim': (s.get('claim') or '')[:240], 'tier': s.get('tier'), 'support': s.get('support')} for s in subs]}
    return d


def seed_rows():
    out = collections.defaultdict(list)
    for fn in glob.glob(os.path.join(EVID, '*.jsonl')):
        for ln, line in read_jsonl(fn):
            try:
                r = json.loads(line)
            except Exception:
                continue
            for k in ('work_id',):
                if r.get(k):
                    out[r[k]].append(r['id'])
    return out


def timeline_digest():
    tv = {}
    p = os.path.join(GOV, 'timeline_verified.jsonl')
    if os.path.exists(p):
        for ln, line in read_jsonl(p):
            r = json.loads(line)
            tv[r['id']] = {'id': r['id'], 'status': r.get('status_effective') or r.get('status'), 'tier': r.get('tier'), 'citation': (r.get('citation') or '')[:140]}
    return tv


def main():
    os.makedirs(INV, exist_ok=True)
    tv = timeline_digest()
    ws = load_json(WORKS_PATH)['works']
    ss = {r['id']: r for r in load_json(os.path.join(BT, 'structures', 'state_schedule.json'))['rows']}
    fd = fence_digest()
    rows_by_work = seed_rows()
    owner = {}
    for g in GD.GROUPS:
        for w in g['works']:
            owner.setdefault(w, g['id'])
    for w in W:
        owner[w[0]] = w[3]
    out = []
    for wid, e in ws.items():
        b = [unit_lookup(x) for x in BUILDERS.get(wid, [])]
        out.append({'id': wid, 'origin': 'structures/works_stages.json (PDF B.7.2)', 'name': e['unit'][:160], 'place': e['location'], 'kind': 'labour' if e['construction_applies'] else 'not_construction',
                    'why_not_construction': e.get('why_not'), 'builder_printed': e.get('crew') or e['unit'], 'builder_unit_ids': [x for x in b if x], 'builder_unresolved': [BUILDERS[wid][i] for i, x in enumerate(b) if not x],
                    'builder_known': e.get('builder_known'), 'window_printed': {'start': e.get('start_printed'), 'end': e.get('end_printed')},
                    'window_minutes': {'earliest': isoToMin_safe((e.get('begin') or {}).get('earliest')), 'latest_start': isoToMin_safe((e.get('begin') or {}).get('latest'))},
                    'tools_men_in_plan': e.get('crew') if re.search(r'spade|shovel|tool|dozen|\d+ ', e.get('crew') or '') else None, 'flags': [x for x in (e.get('flag'), e.get('gap'), e.get('stand_in_note')) if x],
                    'owner_group': owner.get(wid), 'source_status': 'evidence_row' if rows_by_work.get(wid) else ('closeout_supported' if wid in fd and any(s['support'] == 'supported' for s in fd[wid]['sub_claims']) else 'pdf_only'),
                    'closeout': fd.get(wid), 'evidence_rows': rows_by_work.get(wid, [])})
    for gid, bat, pos, tm, kind, tier in G:
        out.append({'id': gid, 'origin': 'PDF B.7.5 (gun emplacements)', 'name': bat, 'place': pos, 'kind': 'labour' if kind.startswith('prepared') else 'improvised_or_no_works',
                    'builder_printed': bat, 'builder_unit_ids': [], 'window_printed': {'start': tm, 'end': None}, 'method_printed': kind, 'tier_printed': tier,
                    'flags': ['plan prints "no works described": show open-ground battery and log the gap' if 'no works' in kind else ('improvised: no earth' if kind.startswith('improvised') else 'prepared: built on screen')],
                    'owner_group': owner.get(gid), 'source_status': 'evidence_row' if rows_by_work.get(gid) else ('closeout_supported' if gid in fd and any(s['support'] == 'supported' for s in fd[gid]['sub_claims']) else 'pdf_only'), 'closeout': fd.get(gid), 'evidence_rows': rows_by_work.get(gid, [])})
    for sid in S_LABOUR:
        r = ss[sid]
        out.append({'id': sid, 'origin': 'structures/state_schedule.json (PDF B.8.7)', 'name': r['object_printed'], 'place': r['object_printed'], 'kind': 'labour', 'state_change': '%s -> %s' % (r['from_state'], r['to_state']),
                    'builder_printed': r.get('trigger'), 'builder_unit_ids': [], 'window_printed': {'start': r['time']['printed'], 'end': None}, 'tier_printed': r.get('tier'), 'source_keys_printed': r.get('source_keys'),
                    'flags': [r['flag']] if r.get('flag') else [], 'owner_group': owner.get(sid), 'source_status': 'evidence_row' if rows_by_work.get(sid) else ('closeout_supported' if sid in fd and any(s['support'] == 'supported' for s in fd[sid]['sub_claims']) else 'pdf_only'),
                    'closeout': fd.get(sid), 'evidence_rows': rows_by_work.get(sid, [])})
    for wid, name, place, grp, sub, st, seed in W:
        out.append({'id': wid, 'origin': 'this pass (PDF B.7.8 gap list or a passage met while planning)', 'name': name, 'place': place, 'kind': 'labour', 'subkind_hint': sub, 'owner_group': grp,
                    'source_status': 'evidence_row' if rows_by_work.get(wid) else st, 'evidence_rows': rows_by_work.get(wid, []), 'seed_row_planned': seed})
    for o in out:
        if o['id'] in TL:
            o['timeline_rows'] = [tv.get(t, {'id': t, 'status': 'not found'}) for t in TL[o['id']]]
        if o['id'] in CONFLICT_NOTES:
            o.setdefault('flags', []).append(CONFLICT_NOTES[o['id']])
    by = collections.Counter(o['source_status'] for o in out)
    doc = {'_doc': ('Register of works soldiers built or improved, 26 June - 14 July 1863 (tools/bt/life/build_inventory.py). A register of CANDIDATES: nothing is marked documented here; the rows of '
                    'evidence/<group>.jsonl are the evidence. source_status: evidence_row (a row of this pass cites a verbatim passage), closeout_supported (the fence close-out matched quotes for part of it), '
                    'pdf_only (the plan prints it, no text read for this pass), search_target. Works that touch a pre-existing feature (PDF B.7.3, contract.json preexisting) are never construction.'),
           'built': datetime.date.today().isoformat(), 'counts': dict(by), 'count': len(out), 'works': out}
    dump_json(os.path.join(INV, 'works.json'), doc)
    print('works.json:', len(out), dict(by))
    leads_by_record()


def isoToMin_safe(s):
    m = re.match(r'^1863-(\d\d)-(\d\d)T(\d\d):(\d\d)$', s or '')
    return min_of(int(m.group(1)), int(m.group(2)), int(m.group(3)), int(m.group(4))) if m else None


def leads_by_record():
    ori = {r['id']: r for r in load_json(OR_INDEX_PATH)['records']}
    out = {}
    for fn in sorted(glob.glob(os.path.join(LEADS, '*.leads.jsonl'))):
        g = os.path.basename(fn).replace('.leads.jsonl', '')
        per = collections.defaultdict(lambda: {'classes': collections.Counter(), 'dates': collections.Counter()})
        for ln, line in read_jsonl(fn):
            r = json.loads(line)
            key = r.get('report_id') or r['source_id']
            e = per[(r['source_id'], key)]
            e['classes'][r['class']] += 1
            if r.get('date_hint'):
                e['dates'][r['date_hint']] += 1
        rows = []
        for (sid, key), e in per.items():
            o = ori.get(key)
            rows.append({'source_id': sid, 'record': key, 'who': ((o.get('rank') or '') + ' ' + (o.get('author') or '') if o else None), 'unit_scope': (o.get('unit_scope') or '')[:80] if o else None,
                         'leads': sum(e['classes'].values()), 'by_class': dict(e['classes']), 'date_hints': dict(e['dates'].most_common(6))})
        rows.sort(key=lambda x: -x['leads'])
        out[g] = rows
    dump_json(os.path.join(INV, 'leads_by_record.json'), {'_doc': 'Leads (keyword hits, not evidence) by record, report or text within each group, most first: the reading order. date_hints are the nearest "June n" or "July n" within the passage (not a window).',
                                                        'built': datetime.date.today().isoformat(), 'groups': out}, indent=None)
    print('leads_by_record.json:', {g: len(v) for g, v in out.items()})


if __name__ == '__main__':
    main()
