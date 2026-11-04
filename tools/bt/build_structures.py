"""Build docs/battle-theatre/structures/*.json from the transcribed PDF B.7/B.8/B.12.3 tables (structures_data_*.py).
Deterministic (no timestamps). Run: PYTHONIOENCODING=utf-8 python tools/bt/build_structures.py"""
import json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from structures_common import T, classify, split_keys, weak_kind, WEAK_PATTERNS
import structures_data_works as DW
import structures_data_buildings as DB
import structures_data_schedule as DS
import structures_data_other as DO

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = os.path.join(ROOT, 'docs', 'battle-theatre', 'structures')
os.makedirs(OUT, exist_ok=True)
PDF = 'Gettysburg Total War animation plan, version 2 (tmp/pdf/plan-clean.txt)'
NULLISH = {'none', 'none given', 'n/a', 'unknown', 'no dimensions documented', ''}
DATE_RE = re.compile(r'^\d\d-\d\d( \d\d:\d\d)?(/end)?$')

def conv(spec):
    """(e,l,d) spec strings -> ISO list; None stays None"""
    if spec is None:
        return None
    return [T(x) for x in spec]

def conv_any(o):
    if isinstance(o, str) and DATE_RE.match(o):
        return T(o)
    if isinstance(o, dict):
        return {k: conv_any(v) for k, v in o.items()}
    if isinstance(o, (list, tuple)):
        return [conv_any(v) for v in o]
    return o

def norm_dim(v):
    if v is None:
        return None, None
    if v.strip().lower() in NULLISH:
        return None, v
    return v, None

def gaps_in(*texts):
    out = []
    for t in texts:
        if not t:
            continue
        for seg in re.split(r'(?<=[.;])\s+', t):
            if 'open gap' in seg.lower() and seg not in out:
                out.append(seg.strip())
    return out

def conflicts_in(*texts):
    out = []
    for t in texts:
        if t and re.search(r'\bvs\b|conflict|contested|carried, not resolved|unresolved|oddly|dispute|\bor\b.*per|sources vary', t, re.I):
            out.append(t)
    return out

def tier_fields(printed, keys_str):
    keys = split_keys(keys_str) if keys_str and keys_str.strip().lower() != 'n/a' else []
    c = classify(printed, keys)
    c['source_keys'] = keys
    return c

structures = []

# ---- E-nn
for r in DW.E_ROWS:
    dim, dimp = norm_dim(r['dimensions'])
    rec = dict(id=r['id'], section='B.7.2', kind=r['kind'], name=r['location'], location=r['location'], preexisting=False,
               description=r['method'], dimensions=dim, unit=r['unit'], start_printed=r['start'], end_printed=r['end'],
               notes_printed=r['notes'], construction_applies=bool(r['construction']), parse_status=r.get('parse_status', 'parsed'))
    if dimp is not None:
        rec['dimensions_printed'] = dimp
    for k in ('dimensions_printed_candidate', 'raw_unparsed', 'parse_note'):
        if k in r:
            rec[k] = r[k]
    rec.update(tier_fields(r['tier'], r['src']))
    rec['conflicts'] = conflicts_in(r['notes'], r['tier'])
    rec['gaps'] = gaps_in(r['notes'], r['tier'], r['dimensions'], r['method'])
    if r['kind'] == 'open_gap':
        rec['gaps'].append('whole row is an open gap: ' + r['notes'])
        rec['tier'] = 'open_gap'
    structures.append(rec)

# ---- P-nn
for r in DW.P_ROWS:
    rec = dict(id=r['id'], section='B.7.3', kind=('terrain_excavation' if r['id'] == 'P-12' else 'preexisting_wall_or_fence'), name=r['feature'], location=r['location'],
               preexisting=True, description=r['why'], engine_note=r['engine'], dimensions=r['dimensions'], construction=None, construction_animation_allowed=False,
               parse_status='parsed')
    rec.update(tier_fields(r['tier'], r['src']))
    rec['conflicts'] = conflicts_in(r['why'], r['engine'], r['tier'])
    rec['gaps'] = [r['gap']] if r.get('gap') else gaps_in(r['engine'], r['why'])
    if r['id'] == 'P-12':
        rec['b84_row'] = dict(road='Unfinished railroad cut', notes="Attacked about 11:00 Jul 1 by the 6th Wisconsin and NY regiments against Davis's brigade", gap='Cut dimensions')
    if r['id'] in ('P-10', 'P-11', 'P-13'):
        rec['see_also'] = {'P-10': ['FEN-emmitsburg-road', 'FEN-sherfy-orchard'], 'P-11': ['FEN-warfield', 'bld-warfield-house'], 'P-13': ['FEN-leister', 'FEN-cemetery-ridge-walls']}[r['id']]
    structures.append(rec)

# ---- G-nn
for r in DW.G_ROWS:
    pl = r['prepared'].lower()
    cls = ('prepared' if pl.startswith('prepared') else 'improvised' if pl.startswith('improvised') else 'no_works_described' if pl.startswith('no works')
           else 'not_described' if pl.startswith('not described') else 'mixed' if pl.startswith('mixed') else 'open_positions' if pl.startswith('open') else 'unparsed')
    rec = dict(id=r['id'], section='B.7.5', kind='gun_emplacement', name=r['battery'], location=r['position'], preexisting=False, description=r['prepared'],
               evidence_printed=r['evidence'], time_printed=r['time'], emplacement_class=cls, dimensions=None, parse_status='parsed',
               built_on_screen=(cls == 'prepared'), earth_allowed=(cls == 'prepared'))
    rec.update(tier_fields(r['tier'], r['src']))
    rec['conflicts'] = conflicts_in(r['evidence'], r['tier'])
    rec['gaps'] = (['no works described: open-ground battery position; log as a gap (B.7.5 engine rule)'] if cls in ('no_works_described', 'not_described', 'open_positions') else [])
    if r['id'] == 'G-03':
        rec['see_also'] = ['E-12']
    if r['id'] == 'G-06':
        rec['see_also'] = ['E-15']
    structures.append(rec)

# ---- buildings
for r in DB.B_ROWS:
    dim = r.get('dimensions')
    rec = dict(id=r['id'], section='B.8.2', kind=r.get('kind', 'building'), name=r['name'], location=r['location'], preexisting=True,
               description=r['desc'], role_in_battle=r['role'], state_and_damage_printed=r['state'], what_survives=r['survives'], dimensions=dim, parse_status='parsed')
    if r.get('components'):
        rec['components'] = r['components']
    if r.get('note'):
        rec['parse_note'] = r['note']
    if r.get('b84_row'):
        rec['b84_row'] = r['b84_row']
    rec['parts'] = [dict(id=r['id'] + '#' + p, part=p) for p in r.get('parts', [])]
    rec.update(tier_fields(r['tier'], r['src']))
    rec['conflicts'] = conflicts_in(r['state'], r['role'], r['survives'], r['tier'], r['desc'])
    rec['gaps'] = ([r['gap']] if r.get('gap') else []) + [g for g in gaps_in(r['state'], r['tier'], r['desc'], r['survives']) if g != r.get('gap')]
    if r['tier'].startswith('open gap'):
        rec['tier'] = 'open_gap'
    structures.append(rec)

# ---- fences
def conv_change(c):
    d = dict(to_state=c['to'], printed_time=c['printed'], time_parse=c['parse'], schedule_row=c.get('row'), tier_printed=c.get('tier'))
    w = c.get('win')
    if w is None:
        d['window'] = None
    else:
        e, l = w[0], w[1]
        dflt = w[2] if len(w) > 2 else None
        d['window'] = [T(e) if e else None, T(l) if l else None, T(dflt) if dflt else None]
    d['open_flag'] = c.get('open_flag')
    return d

for r in DB.F_ROWS:
    dim = r.get('dimensions')
    rec = dict(id=r['id'], section='B.8.3', kind=r['kind'], name=r['name'], location=r['where'], preexisting=True, description=r['printed'], dimensions=dim,
               parse_status='parsed', contested=bool(r.get('contested')))
    if r.get('note'):
        rec['parse_note'] = r['note']
    rec['state_changes'] = [conv_change(c) for c in r['changes']]
    if r.get('assertions'):
        rec['state_assertions'] = [dict(state=a['state'], printed_time=a['printed_time'], window=conv(a['window'])) for a in r['assertions']]
    rec.update(tier_fields(r['tier'], r['src']))
    rec['conflicts'] = conflicts_in(r['printed'], r['tier'])
    rec['gaps'] = ([r['gap']] if r.get('gap') else []) + gaps_in(r['printed'])
    for ch in rec['state_changes']:
        if ch['open_flag']:
            rec['gaps'].append(ch['open_flag'])
    structures.append(rec)

# ---- roads / bridges
for r in DB.R_ROWS:
    rec = dict(id=r['id'], section='B.8.4', kind=('avenue_not_in_1863' if r['id'] == 'RD-avenues' else 'road'), name=r['name'], location=None,
               preexisting=(False if r['id'] == 'RD-avenues' else True), exists_in_1863=r.get('exists_in_1863', True), description=r['notes'], dimensions=None,
               gap_printed=r['gap'], parse_status='parsed', tier=None, tier_printed=None,
               tier_note='B.8.4 prints no tier column; roads are rendered from the 1863 vector layer with a generic surface tagged plausible-procedural until a source is found (B.8.4 footer).')
    rec['source_keys'] = split_keys(r['src']) if r.get('src') else []
    rec['weak_source'] = bool(rec['source_keys']) and all(weak_kind(k) for k in rec['source_keys'])
    rec['conflicts'] = []
    rec['gaps'] = [r['gap']]
    rec['parts'] = [dict(id=r['id'] + '#' + p, part=p) for p in r.get('parts', [])]
    if r['id'] == 'RD-avenues':
        rec['never_place'] = True
    structures.append(rec)

# ---- extra structures named by the schedule
for r in DO.EXTRA_STRUCTS:
    structures.append(dict(id=r['id'], section='B.8.7', kind=r['kind'], name=r['name'], location=None, preexisting=None, description=None, dimensions=None, parse_status='parsed',
                           parse_note=r['parse_note'], tier=None, source_keys=[], conflicts=[], gaps=[]))
for r in DS.EPI_ROWS:
    sid = r['structs'][0]
    structures.append(dict(id=sid, section='B.12.3', kind=DO.EPI_STRUCT_KIND, name=r['element'], location=None, preexisting=None, description=r['state'], dimensions=None,
                           parse_status='parsed', parse_note='Epilogue world-state element introduced by schedule row %s (Nov 1863); not a B.8.2 structure.' % r['id'],
                           tier=None, source_keys=[], conflicts=[], gaps=[r['gap']] if r['gap'] and r['gap'] != '-' else []))

ids = [s['id'] for s in structures]
assert len(ids) == len(set(ids)), [i for i in ids if ids.count(i) > 1]
by_id = {s['id']: s for s in structures}
hosp_ids = {h['id'] for h in DO.H_ROWS}

# ---- attach schedule linkage back onto structures
sched_by_obj = {}
for r in DS.S_ROWS:
    for o in r['structs']:
        sched_by_obj.setdefault(o.split('#')[0], []).append(r['id'])
for r in DS.EPI_ROWS:
    sched_by_obj.setdefault(r['structs'][0], []).append(r['id'])
for s in structures:
    s['schedule_rows'] = sorted(set(sched_by_obj.get(s['id'], [])))

meta_common = dict(source=PDF, sections='B.7.2, B.7.3, B.7.5, B.8.2, B.8.3, B.8.4, B.8.5, B.8.6, B.8.7, B.12.3',
                   status='seeded_unverified: transcribed from the PDF text; no primary source read',
                   pdf_defaults_status='PENDING OWNER (Law cl.6): no default view of a conflicting source has been chosen here',
                   time_convention='naive ISO-8601 local mean time as printed (Union and Confederate clocks differed by about 20 minutes; no correction applied)',
                   tier_rule='tier = printed PDF tier AND >=1 cited key outside the weak set; weak set = Wikipedia (Wiki-*, W-CONS), forums (CWT*), blogs the PDF flags (WHB*, GC-COMP), Stone Sentinels (SS-*, SStone-*). Mechanical only: no source opened to confirm it supports the exact claim.',
                   weak_patterns=[p for p, _ in WEAK_PATTERNS])

counts = {}
for s in structures:
    counts[s['kind']] = counts.get(s['kind'], 0) + 1
doc = dict(meta=dict(meta_common, generator='tools/bt/build_structures.py', record_count=len(structures), kind_counts=counts), structures=structures)
json.dump(doc, open(os.path.join(OUT, 'structures.json'), 'w', encoding='utf-8'), indent=1, ensure_ascii=False)

# =============================== state_schedule.json ======================================================
rows = []
for r in DS.S_ROWS:
    keys = split_keys(r['src'])
    c = classify(r['tier'], keys)
    w = conv(r['win'])
    if w is None:
        parse = 'phrase'
    else:
        parse = r['parse']
    time = dict(printed=r['time'], time_parse=parse, granularity=r['gran'], window=w, part_of_day=r['pod'], approx=r['approx'],
                begin=conv(r['begin']), finish=conv(r['finish']), sub_events=conv_any(r['sub']), derived=r['derived'],
                default_basis=('pdf_printed_single_time' if (w and w[2]) else 'none'))
    scen = {}
    for k, v in (r['scen'] or {}).items():
        d = {}
        for kk, vv in v.items():
            if kk in ('win', 'begin', 'finish', 'phase_open'):
                d[kk if kk != 'win' else 'window'] = conv(vv)
            else:
                d[kk] = vv
        scen[k] = d
    phases = None
    if r['phases']:
        phases = []
        for p in r['phases']:
            q = dict(state=p['state'], printed=p['printed'], window=conv(p['window']))
            if p.get('scen'):
                q['scenarios'] = {k: dict(window=conv(v['win']), src=v.get('src')) for k, v in p['scen'].items()}
            phases.append(q)
    row = dict(id=r['id'], object_printed=r['obj'], object_ids=r['structs'], from_state=r['frm'], to_state=r['to'], time=time, trigger=r['trig'],
               flag=r['flag'], source_keys=keys, out_of_battle_scope=r['oos'], notes=r['note'], scenarios=scen, phases=phases,
               parse_status=('parsed' if parse != 'phrase' or r['oos'] else 'unparsed'), section='B.8.7')
    row.update(c)
    rows.append(row)
for r in DS.EPI_ROWS:
    keys = [k for k in split_keys(r['src']) if k != 'derived']
    c = classify(r['tier'], keys)
    w = conv(r['win'])
    t = dict(printed=('Nov 18, 1863 (night; see note)' if r['id'] == 'S-088' else 'State on Nov 19, 1863 (column header of B.12.3)'),
             time_parse='date', granularity='date', window=w, part_of_day=r['pod'], approx=False, begin=None, finish=None, sub_events=conv_any(r['sub']), derived=None, default_basis='none')
    scen = {}
    for k, v in (r['scen'] or {}).items():
        scen[k] = dict(window=conv(v['win']), src=v.get('src'))
    row = dict(id=r['id'], object_printed=r['element'], object_ids=r['structs'], from_state=None, to_state=r['state'], time=t, trigger=None, flag=r['flag'],
               source_keys=keys, derived=('derived' in split_keys(r['src'])), out_of_battle_scope=False, notes=r['note'], gap_printed=r['gap'], scenarios=scen, phases=None,
               parse_status='parsed', section='B.12.3',
               from_state_note='B.12.3 prints only the state on Nov 19, 1863; no from-state, no trigger')
    row.update(c)
    rows.append(row)

assert [x['id'] for x in rows] == ['S-%03d' % i for i in range(1, 89)], 'schedule ids not S-001..S-088'

rules = []
for r in DS.RULES:
    rr = dict(r)
    rr['type'] = 'rule'
    rr['source'] = 'B.8.7 "Rows the engine must never schedule" (p.102)'
    rules.append(rr)

pdf_defaults_log = [
 dict(id='PD-01', topic='Sherfy barn fire', conflict_id='C-026', rows=['S-037', 'S-036'],
      printed=[dict(where='B.2.5 C-026 (p.62)', default='Jul 2 evening', alternatives='Jul 3'),
               dict(where='B.8.7 S-037 (p.101)', default='most-supported reading, Jul 3 during the afternoon artillery', alternatives='flag window Jul 2 evening to Jul 3 afternoon'),
               dict(where='B.2.3 conflict highlights (p.55)', default='flag window Jul 2 evening to Jul 3 afternoon, most plausible Jul 3 afternoon (inferred)')],
      contradiction=True, status='PENDING OWNER', scenarios=['default', 'jul3_afternoon_b87', 'jul2_evening_c026', 'flag_window_full'],
      note='The register default (Jul 2 evening) contradicts the schedule and the p.55 table (Jul 3 afternoon). Also logged as EG-0008. state_at scenario "default" follows the row the engine reads (B.8.7 S-037); this is not a choice between the sources.'),
 dict(id='PD-02', topic='Camp Letterman opening', conflict_id='C-044', rows=['S-077'],
      printed=[dict(where='B.2.5 C-044 (p.63)', default='Jul 20', alternatives='Jul 22'), dict(where='B.2.3 p.55 conflict table', default='Open Jul 22 with Jul 20 flagged'),
               dict(where='B.8.7 S-077', default='none printed ("opens July 20 or 22 (flag)")')],
      contradiction=True, status='PENDING OWNER', scenarios=['open_jul20', 'open_jul22'],
      note='state_at scenario "default" for S-077 leaves the opening inside the Jul 20-22 window (not decided).'),
 dict(id='PD-03', topic="Culp's Hill main line (E-05) start and finish", conflict_id=None, rows=['S-023'],
      printed=[dict(where='B.7.4 (p.93)', default='window start 06:00, end between 09:00 and 10:00'), dict(where='B.7.2 E-05 / S-023', default='none stated beyond the printed windows (about 06:00; 09:00-10:00; to about noon flagged)')],
      contradiction=False, status='PENDING OWNER', scenarios=['default', 'start_night_jul1_2_dmna', 'finish_about_10_dmna', 'finish_about_noon_gd']),
 dict(id='PD-04', topic='Culp\'s Hill final charge Jul 3', conflict_id='C-031', rows=['S-056'],
      printed=[dict(where='B.2.5 C-031', default='10:00', alternatives='noon'), dict(where='B.8.7 S-056', default='About 10:00-11:00 Jul 3')],
      contradiction=False, status='PENDING OWNER', scenarios=['c031_default_10_00', 'c031_alt_noon']),
 dict(id='PD-05', topic='Cannonade end', conflict_id='C-029', rows=['S-061'],
      printed=[dict(where='B.2.5 C-029', default='14:30', alternatives='14:00, 15:00'), dict(where='B.8.7 S-061', default='lull to about 14:45-15:00')],
      contradiction=False, status='PENDING OWNER', scenarios=['c029_end_14_30_default', 'c029_end_14_00', 'c029_end_15_00'],
      note='C-029 prints the cannonade end (14:00 / 14:30 / 15:00); S-061 prints a Union lull to about 14:45-15:00. The PDF does not state how the two relate; not reconciled here.'),
 dict(id='PD-06', topic="Johnson's attack on Culp's Hill", conflict_id='C-019', rows=['S-042'],
      printed=[dict(where='B.2.5 C-019', default='19:00', alternatives='19:30, 20:00'), dict(where='B.7.2 E-10', default='about 19:00-22:00')], contradiction=False, status='PENDING OWNER', scenarios=['e10_clock_19_22']),
 dict(id='PD-07', topic='East Cemetery Hill assault', conflict_id='C-020', rows=['S-044'],
      printed=[dict(where='B.2.5 C-020', default='19:30', alternatives='20:00, 20:00-21:00'), dict(where='B.8.7 S-044', default='dusk attack, about 19:30-21:00')], contradiction=False, status='PENDING OWNER', scenarios=[]),
 dict(id='PD-08', topic='Infantry step-off (Pickett\'s Charge) vs fence window', conflict_id='C-030', rows=['S-062'],
      printed=[dict(where='B.2.5 C-030', default='15:00', alternatives='14:00'), dict(where='B.8.7 S-062', default='About 15:30-16:15 Jul 3')], contradiction=False, status='PENDING OWNER', scenarios=[]),
 dict(id='PD-09', topic='Spangler wounded count', conflict_id='C-038', rows=[], hospital_conflict='HC-05',
      printed=[dict(where='B.2.5 C-038', default='1,500', alternatives='1,000; 1,800; 1,900; 2,000'), dict(where='B.8.5.2', default='lead figure about 1,900 treated')], contradiction=True, status='PENDING OWNER', scenarios=[]),
 dict(id='PD-10', topic="Barksdale's death", conflict_id='C-037', rows=[], hospital_conflict='HC-06',
      printed=[dict(where='B.2.5 C-037', default='Jul 2 (wounded), death Jul 2-3 shown as a range', alternatives='Jul 3')], contradiction=False, status='PENDING OWNER', scenarios=[]),
 dict(id='PD-11', topic='Bliss buildings burn', conflict_id=None, rows=['S-052'],
      printed=[dict(where='B.8.7 S-052 / B.2.3 p.55', default='morning Jul 3; Bliss burned before the cannonade', alternatives='late morning per one forum (unreliable)')], contradiction=False, status='PENDING OWNER',
      scenarios=['default', 'late_morning_forum_unreliable'], note='Not disputed as a date by any reliable source; only the clock time is open.'),
]

sched = dict(meta=dict(meta_common, generator='tools/bt/build_structures.py', row_count=len(rows), rule_count=len(rules),
                       window_semantics=('time.window = [earliest, latest, default]. granularity "clock": at least one bound is a printed clock time. granularity "date": bounds are the start (00:00) and 23:59 of the printed date(s); '
                                         'the position inside the day is NOT known and state_at reports it as indeterminate. "default" is non-null only where the PDF prints a single time for the transition. '
                                         'earliest null = not printed ("by X"); state_at then places the change at the latest bound and flags it.'),
                       scenarios='Scenario "default" = the row as the engine reads it in B.8.7 (not a choice between conflicting sources). Named scenarios expose the PDF alternatives.'),
             rows=rows, rules=rules, pdf_defaults_log=pdf_defaults_log)
json.dump(sched, open(os.path.join(OUT, 'state_schedule.json'), 'w', encoding='utf-8'), indent=1, ensure_ascii=False)

# =============================== works_stages.json ========================================================
works = {}
for r in DW.E_ROWS:
    wid = r['id']
    w = DO.WORK_WINDOWS.get(wid)
    base = dict(id=wid, unit=r['unit'], location=r['location'], start_printed=r['start'], end_printed=r['end'], construction_applies=bool(r['construction']))
    if w is None:
        base['construction_applies'] = False
        base['why_not'] = DO.NO_CONSTRUCTION_NOTES.get(wid, 'no construction attributed')
        works[wid] = base
        continue
    d = dict(base)
    for bk in ('begin', 'finish'):
        x = dict(w[bk])
        for k in ('earliest', 'latest', 'default'):
            x[k] = T(x[k]) if x.get(k) else None
        x['time_parse'] = ('clock' if x.get('gran') == 'clock' else 'date' if x.get('gran') == 'date' else 'phrase')
        if x.get('date'):
            x['date'] = T(x['date'])
        d[bk] = x
    d['schedule_rows'] = w['schedule_rows']
    d['crew'] = w['crew']
    d['builder_known'] = w['builder_known']
    for k in ('flag', 'gap', 'stand_in_crew', 'stand_in_note', 'extension_of', 'reentry'):
        if k in w:
            d[k] = w[k]
    if 'damage' in w:
        d['damage_stage'] = conv_any(w['damage'])
    if 'scenarios' in w:
        d['scenarios'] = {k: conv_any(v) for k, v in w['scenarios'].items()}
    works[wid] = d

ws = dict(meta=dict(meta_common, generator='tools/bt/build_structures.py', section='B.7.4 (p.93), B.7.1, B.7.6, B.7.5 engine rules'),
          governing_rule='No earthwork, breastwork, barricade, lunette or gun pit is pre-placed in the scene (B.7.1). A work that cannot be attributed to a builder or time is still built on screen by a labeled stand-in crew, flagged "builder unknown".',
          stage_model=dict(stages=DO.STAGES, notes=DO.STAGE_NOTES, state_is_function_of_time=True),
          assumptions=dict(preamble=DO.ASSUMPTION_PREAMBLE, items=DO.ASSUMPTIONS),
          stage_share_procedure=dict(tier='plausible-procedural', seed_default=0,
                                     method='share_i = w_i / sum(w), w_i = 1 + b_i/255 where b_0..b_3 are the first four bytes of sha256("{seed}:{work_id}"); shares apply to stages 1-4 across [begin, finish]; stage 0 before begin, stage 5 from finish. The split is an assumption (assumption 1); the sum is fixed to the documented window.',
                                     finish_rule='state_at uses finish.latest as the completion instant (never earlier than the earliest printed "finished" time); this is a modelling convention, not a source claim.'),
          works=works, gun_emplacement_engine_rules=DO.GUN_ENGINE_RULES, modern_profile_rule=DO.B76_RULE)
json.dump(ws, open(os.path.join(OUT, 'works_stages.json'), 'w', encoding='utf-8'), indent=1, ensure_ascii=False)

# =============================== hospitals.json ===========================================================
HT = {  # parsed set-up / closing windows where a date or clock is printed. (earliest, latest, default)
 'H-01': (('06-30', '06-30/end', None), 'date', ('07-01', '07-01/end', None), 'date'),
 'H-02': ((None, '07-01 12:00', None), 'clock', None, None),
 'H-03': (('07-01', '07-01/end', None), 'date', ('07-29', '07-29/end', None), 'date'),
 'H-04': (('07-02', '07-02/end', None), 'date', None, None),
 'H-05': (('07-01', '07-01/end', None), 'date', None, None),
 'H-06': ((None, '07-01 16:00', None), 'clock', ('08-06', '08-06/end', None), 'date'),
 'H-07': (('07-02', '07-02/end', None), 'date', ('07-03', '07-03/end', None), 'date'),
 'H-08': (('07-02', '07-02/end', None), 'date', ('07-03', '07-03/end', None), 'date'),
 'H-09': (('07-02', '07-02/end', None), 'date', ('08-02', '08-02/end', None), 'date'),
 'H-10': (('07-02', '07-02/end', None), 'date', ('08-06', '08-06/end', None), 'date'),
 'H-11': (('07-02', '07-02/end', None), 'date', ('07-07', '07-07/end', None), 'date'),
 'H-12': (('07-02', '07-02/end', None), 'date', None, None),
 'H-13': (None, 'phrase', (None, '07-06/end', None), 'date'),
 'H-15': (('07-02', '07-03/end', None), 'date', None, None),
 'H-16': (('07-03', '07-03/end', None), 'date', None, None),
 'H-17': (('07-02', None, None), 'date', None, None),
 'H-20': (('07-01', '07-01/end', None), 'date', None, None),
 'H-21': (('07-02', '07-02/end', None), 'date', None, None),
 'H-22': ((None, '07-04/end', None), 'date', None, None),
 'H-23': (('07-10', '07-10/end', None), 'date', ('11-20', '11-20/end', None), 'date'),
}
hosp = []
for h in DO.H_ROWS:
    keys = split_keys(h['src'])
    rec = dict(id=h['id'], hospital=h['hospital'], corps_or_side=h['corps'], location=h['location'], setup_time_printed=h['setup'], patients_printed=h['patients'],
               staff_printed=h['staff'], closing_or_move_printed=h['closing'], source_keys=keys, structure_ids=h['structs'], section='B.8.5.2',
               weak_source=bool(keys) and all(weak_kind(k) for k in keys), claim_support_verified=False, parse_status='parsed')
    if h.get('note'):
        rec['parse_note'] = h['note']
    t = HT.get(h['id'])
    if t:
        sw, sp, cw, cp = t
        rec['setup_window'] = dict(window=conv(sw), time_parse=sp, granularity=('clock' if sp == 'clock' else 'date' if sp == 'date' else 'phrase'))
        rec['closing_window'] = dict(window=conv(cw), time_parse=cp) if cw else None
    else:
        rec['setup_window'] = None
        rec['closing_window'] = None
    hosp.append(rec)
hdoc = dict(meta=dict(meta_common, generator='tools/bt/build_structures.py', section='B.8.5.1, B.8.5.2, B.8.5.3, B.8.5.4, B.8.6', hospital_count=len(hosp)),
            hospitals=hosp, conflicts=DO.H_CONFLICTS, conflicts_note='Alternatives are carried as selectable values. No default is chosen here; each printed PDF default is logged as PENDING OWNER.',
            letterman_roles=DO.LETTERMAN_ROLES, casualty_behaviours=DO.CASUALTY_BEHAVIOURS,
            camp_letterman_features_printed='Camp features: dead house, embalming tent, cookhouse, warehouse tent, cemetery of about 1,200 graves, amputated limbs buried in barrels and later sent to the Army Medical Museum.',
            night_operations_B853=('Surgeons operated in the open on tables near the field, sometimes under tarpaulins, "day and night" until July 6 (July 7 for II Corps) (NPS-Essay5; Letterman-Exc). '
                                   'Spangler: four operating tables worked night and day under the barn forebay, lanterns burning (HN-Spangler; ReconEra; GExp). Weikert: amputated limbs piled outside a window; hospital moved east early July 3 (HN-Weikert). '
                                   'XII Corps: wounded removed, sheltered, fed and dressed within six hours; capital operations within 24 hours (Letterman-Exc). Rain: cold, constant rain July 4 (HN-Spangler). Plum Run overflowed and drowned some wounded in low ground (AMS).'),
            horses=dict(rows=[dict(r, tier_note='B.8.6 prints no tier column', source_keys=split_keys(r['src'])) for r in DO.HORSE_ROWS], engine_rule=DO.HORSE_ENGINE_RULE,
                        overall_is_estimate_not_count=True))
json.dump(hdoc, open(os.path.join(OUT, 'hospitals.json'), 'w', encoding='utf-8'), indent=1, ensure_ascii=False)

print('structures', len(structures), counts)
print('schedule rows', len(rows), 'rules', len(rules))
print('works', len(works), 'hospitals', len(hosp), 'horse rows', len(DO.HORSE_ROWS))
