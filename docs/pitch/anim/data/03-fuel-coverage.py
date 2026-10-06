#!/usr/bin/env python3
"""
03-fuel-coverage.py -- coverage and honesty numbers behind docs/pitch/anim/03-data-fuel.md (sections 1-8).

Run from the repo root:  python docs/pitch/anim/data/03-fuel-coverage.py
Writes:                   docs/pitch/anim/data/fuel-coverage.json
Read-only on everything else. Every number in the report that is not in cluster-stats.json comes from here.
"""
import json, re, math, os, sys, collections, statistics
import numpy as np

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..'))
os.chdir(ROOT)
D = 'baseline/dist/data/'
OUT = 'docs/pitch/anim/data/fuel-coverage.json'
M_LAT = 111195.0
M_LNG = 111195.0 * math.cos(math.radians(39.82))

def jl(p):
    return json.load(open(p, encoding='utf8'))

# ---------------------------------------------------------------- rows exactly as the app loads them
def load_rows():
    src = open('legacy/analysis/bundle.pretty.js', encoding='utf8').read()
    tf = re.search(r'tF = \{(.*?)\},\n  nF', src, re.S).group(1)
    nf = re.search(r'nF = \{(.*?)\};\nasync function iF', src, re.S).group(1)
    days = {}
    for d, body in re.findall(r'(\d): \[\s*((?:"placements_[a-z0-9_]+\.json",?\s*)+)\]', tf):
        days.setdefault(int(d), []).extend(re.findall(r'"([^"]+)"', body))
    for d, body in re.findall(r'(\d): \[\s*((?:"density_[a-z0-9_]+\.json",?\s*)+)\]', nf):
        days.setdefault(int(d), []).extend(re.findall(r'"([^"]+)"', body))
    rows = []
    for day in (1, 2, 3):
        for f in days[day]:
            j = jl(D + f)
            for i, r in enumerate(j['placements'] if isinstance(j, dict) else j):
                r = dict(r); r['_file'] = f; r['_i'] = i
                rows.append(r)
    return rows

rows = load_rows()
assert len(rows) == 1804
ui = jl('data-src/build/unit_index.json')
reg = {u['id']: u for u in ui['units']}
form = {u['id']: u for u in ui['formations']}
registry = jl('data-src/build/unit_registry.json')['units']
cw = jl('data-src/build/id_crosswalk.json')
wrong_side = {e['id']: e['proposed'] for e in cw['wrong_side_prefix']}
aliases = {a['alias']: a for a in jl('data-src/build/unit_aliases.json')['aliases']}

def info(uid):
    return reg.get(uid) or form.get(uid)

def level_of(uid):
    i = info(uid)
    return i['level'] if i else None

def corps_of(uid):
    """corps of a placed id: the corps record itself; the parent chain of a brigade or regiment; and, for a division record
    (whose parents list is empty in unit_index.json), the corps in its own id (U-I-1 is "First Division, First Corps")"""
    i = info(uid)
    if not i:
        return None
    if i['level'] == 'corps':
        return i['id']
    for p in i.get('parents') or []:
        if p['level'] == 'corps':
            return p['id']
    m = re.match(r'^([UC]-(?:[IVX]+|CAV))-\d', uid)
    if i['level'] == 'division' and m:
        return m.group(1)
    return None

def division_of(uid):
    i = info(uid)
    if not i:
        return None
    if i['level'] == 'division':
        return i['id']
    for p in i.get('parents') or []:
        if p['level'] == 'division':
            return p['id']
    return None

R = {}
placed_ids = sorted({r['unit_id'] for r in rows})
by_unit = collections.defaultdict(list)
for r in rows:
    by_unit[r['unit_id']].append(r)

# ---------------------------------------------------------------- 1. the unit population
R['units'] = dict(
    registry_units=len(registry),
    registry_by_kind=dict(collections.Counter(u['kind'] for u in registry)),
    registry_by_arm=dict(collections.Counter(u['arm'] for u in registry)),
    registry_by_side=dict(collections.Counter(u['side'] for u in registry)),
    registry_with_commander=sum(1 for u in registry if u['commander_status'] == 'recorded'),
    registry_with_days_engaged=sum(1 for u in registry if u['days_engaged']),
    registry_guns_recorded=sum(1 for u in registry if u.get('guns')),
    registry_strength_min_median_max=[min(u['strength'] for u in registry), statistics.median(u['strength'] for u in registry), max(u['strength'] for u in registry)],
    registry_casualties_zero=sum(1 for u in registry if u['casualties'] == 0),
    registry_casualties_median=statistics.median(u['casualties'] for u in registry),
    registry_with_own_track=sum(1 for u in registry if u['placed_via'] == 'own'),
    registry_positioned_via_parent_or_ancestor=sum(1 for u in registry if u['placed_via'] in ('parent', 'ancestor')),
    registry_never_positioned=sum(1 for u in registry if u['placed_via'] == 'none'),
    placed_ids=len(placed_ids),
    placed_ids_resolving_to_registry_or_formation=sum(1 for u in placed_ids if info(u)),
    placed_ids_by_level=dict(collections.Counter(level_of(u) or 'unresolved' for u in placed_ids)),
    placed_ids_with_corps=sum(1 for u in placed_ids if corps_of(u)),
    rows_with_corps=sum(1 for r in rows if corps_of(r['unit_id'])),
    rows_resolving=sum(1 for r in rows if info(r['unit_id'])),
    rows_total=len(rows),
)
# Union corps badge coverage (documented set: the March 1863 circular names I, II, III, V, VI, XI, XII)
DOC_BADGE = {'U-I', 'U-II', 'U-III', 'U-V', 'U-VI', 'U-XI', 'U-XII'}
U_rows = [r for r in rows if r['unit_id'].startswith('U-')]
C_rows = [r for r in rows if r['unit_id'].startswith('C-')]
by_corps = collections.Counter(corps_of(r['unit_id']) for r in U_rows)
def div_ordinal_ok(r):
    c = corps_of(r['unit_id']); d = division_of(r['unit_id'])
    return bool(c in DOC_BADGE and d and re.match(r'^' + re.escape(c) + r'-\d$', d))
R['corps_badges'] = dict(
    union_rows=len(U_rows), union_rows_by_corps={str(k): v for k, v in by_corps.items()},
    documented_badge_rows=sum(v for k, v in by_corps.items() if k in DOC_BADGE),
    cavalry_corps_rows=by_corps['U-CAV'], unknown_corps_rows=by_corps[None],
    division_colour_derivable_rows=sum(1 for r in U_rows if div_ordinal_ok(r)),
    confederate_rows=len(C_rows), confederate_rows_with_corps=sum(1 for r in C_rows if corps_of(r['unit_id'])),
    confederate_documented_badge_rows=0)
# arm for placed ids: registry arm, else formation (none), else id pattern as the app does it
def arm_of(uid, row=None):
    i = reg.get(uid)
    if i:
        return i['arm']
    if 'ART' in uid:
        return 'artillery'
    if 'CAV' in uid:
        return 'cavalry'
    return None
R['units']['placed_ids_arm_known_from_registry'] = sum(1 for u in placed_ids if u in reg)
R['units']['placed_ids_formations_no_arm'] = sum(1 for u in placed_ids if u in form)
R['units']['placed_ids_unresolved'] = sum(1 for u in placed_ids if not info(u))

# wrong-side ids (side taken from the prefix by the shipped renderer)
ws_rows = [r for r in rows if r['unit_id'] in wrong_side]
R['side_colour_defect'] = dict(
    note='the shipped renderer takes the side from the id prefix (startsWith("U-"), pretty:96525, 96597); the crosswalk lists ids whose prefix contradicts the regiment state code',
    ids=len(wrong_side), rows=len(ws_rows), ticks=sorted({r['tick'] for r in ws_rows}),
    examples=sorted(wrong_side.items())[:10])

# ---------------------------------------------------------------- 2. rows: fields, provenance
disp = collections.Counter(r['disposition'] for r in rows)
bear = collections.Counter(r['bearing'] for r in rows)
R['rows'] = dict(
    total=len(rows), unique_unit_tick=len({(r['unit_id'], r['tick']) for r in rows}),
    keyframe_ticks=len({r['tick'] for r in rows}), ticks_total=675,
    with_notes=sum(1 for r in rows if r.get('notes')), with_vignette_trigger=sum(1 for r in rows if r.get('vignette_trigger')),
    with_source_or_basis_field=sum(1 for r in rows if any(k in r for k in ('source', 'basis', 'confidence', 'unc_m'))),
    disposition_counts=dict(disp.most_common()),
    bearing_distinct=len(bear), bearing_counts=dict(sorted(bear.items())),
    bearing_share_multiple_of_45=sum(v for k, v in bear.items() if k % 45 == 0) / len(rows),
    strength_min_median_max=[min(r['strength'] for r in rows), statistics.median(r['strength'] for r in rows), max(r['strength'] for r in rows)],
    rows_with_strength_ge_480=sum(1 for r in rows if r['strength'] >= 480),
    coordinate_decimals_under_4=sum(1 for r in rows if len(str(r['lat']).split('.')[-1]) < 4 or len(str(r['lng']).split('.')[-1]) < 4),
)
# tile width the shipped renderer would draw (desktop)
def wtoday(s):
    return max(10, min(120, round((s or 200) / 4)))
Wd = [wtoday(r['strength']) for r in rows]
R['rows']['shipped_tile_width_px'] = dict(min=min(Wd), median=statistics.median(Wd), share_at_cap_120=sum(1 for w in Wd if w == 120) / len(Wd), share_at_floor_10=sum(1 for w in Wd if w == 10) / len(Wd))

# duplicates
bykey = collections.defaultdict(list)
for r in rows:
    bykey[(r['unit_id'], r['tick'])].append(r)
def dm(a, b):
    return math.hypot((a['lat'] - b['lat']) * M_LAT, (a['lng'] - b['lng']) * M_LNG)
dups = [(k, v) for k, v in bykey.items() if len(v) > 1]
R['duplicates'] = dict(
    unit_tick_keys_with_more_than_one_row=len(dups), redundant_rows=sum(len(v) - 1 for k, v in dups),
    differing_position_over_20m=sum(1 for k, v in dups if max(dm(v[0], x) for x in v[1:]) > 20),
    differing_position_over_100m=sum(1 for k, v in dups if max(dm(v[0], x) for x in v[1:]) > 100),
    max_position_difference_m=max(max(dm(v[0], x) for x in v[1:]) for k, v in dups),
    differing_disposition=sum(1 for k, v in dups if len({x['disposition'] for x in v}) > 1),
    differing_strength=sum(1 for k, v in dups if len({x['strength'] for x in v}) > 1),
    note='the shipped renderer keeps the LAST row of a unit at a tick (y1: H[unit_id] = R in row order), and row order follows the load order of the 47 files')

# ---------------------------------------------------------------- 3. strength semantics
def merged_track(uid):
    d = {}
    for r in by_unit[uid]:
        d[r['tick']] = r
    return [d[t] for t in sorted(d)]
up = down = same = 0; first_eq = 0; first_n = 0; last_eq = 0; last_n = 0; above = 0; above_n = 0
for uid in placed_ids:
    tr = merged_track(uid)
    for a, b in zip(tr, tr[1:]):
        if b['strength'] > a['strength']: up += 1
        elif b['strength'] < a['strength']: down += 1
        else: same += 1
    u = reg.get(uid)
    if u and u['strength']:
        first_n += 1; first_eq += (tr[0]['strength'] == u['strength'])
        last_n += 1; last_eq += abs(tr[-1]['strength'] - (u['strength'] - u['casualties'])) <= 0.05 * u['strength']
        above_n += 1; above += any(r['strength'] > 1.02 * u['strength'] for r in tr)
R['strength_semantics'] = dict(
    consecutive_keyframe_pairs_on_merged_tracks=up + down + same, strength_up=up, strength_down=down, strength_equal=same,
    registry_regiments_batteries_placed=first_n, first_keyframe_equals_registry_strength=first_eq,
    last_keyframe_within_5pct_of_registry_strength_minus_casualties=last_eq,
    units_with_a_keyframe_over_102pct_of_registry_strength=above,
    note='placement strength is an authored per-row number; it is not a record of casualties by tick')

# ---------------------------------------------------------------- 4. movement between keyframes (jitter fuel)
astro = jl('data-src/environment/astro_by_tick.json')
cols = astro['columns']
arows = astro['rows']
lmt = {r[0]: r[1] for r in arows}           # candidate clock, minutes since 1863-07-01T00:00 LMT
sun_alt = {r[0]: r[3] for r in arows}
gaps = []; dists = []; speeds = []; adj_pairs = 0; snaps = 0; far_pairs = 0
trans = []
for uid in placed_ids:
    tr = merged_track(uid)
    for a, b in zip(tr, tr[1:]):
        g = b['tick'] - a['tick']
        d = dm(a, b)
        dt_min = lmt[b['tick']] - lmt[a['tick']]
        trans.append((uid, a, b, g, d, dt_min))
R['movement'] = dict(
    transitions=len(trans),
    gap_ticks=dict(p50=float(np.percentile([t[3] for t in trans], 50)), p90=float(np.percentile([t[3] for t in trans], 90)), max=max(t[3] for t in trans),
                   share_gap_1=sum(1 for t in trans if t[3] == 1) / len(trans), share_gap_le_5=sum(1 for t in trans if t[3] <= 5) / len(trans),
                   share_gap_gt_12=sum(1 for t in trans if t[3] > 12) / len(trans)),
    displacement_m=dict(p50=float(np.percentile([t[4] for t in trans], 50)), p90=float(np.percentile([t[4] for t in trans], 90)), max=max(t[4] for t in trans),
                        share_zero=sum(1 for t in trans if t[4] < 1) / len(trans)),
    shipped_renderer_interpolates=dict(
        rule='F4/y1 blend only between tick f and tick f+1 (pretty:96266-96268); any gap > 1 tick is a hold followed by a jump at the next keyframe tick',
        transitions_interpolated_gap_1=sum(1 for t in trans if t[3] == 1),
        transitions_that_jump=sum(1 for t in trans if t[3] > 1),
        share_that_jump=sum(1 for t in trans if t[3] > 1) / len(trans)),
)
jump = [t for t in trans if t[3] > 1 and t[4] > 1]
for z in (13.5, 14, 15):
    mp = 40075016.686 * math.cos(math.radians(39.82)) / (512 * 2 ** z)
    px = [t[4] / mp for t in jump]
    R['movement'][f'jump_size_px_at_z{z}'] = dict(n=len(px), p50=float(np.percentile(px, 50)), p90=float(np.percentile(px, 90)), max=max(px),
                                                 share_over_40px=sum(1 for v in px if v > 40) / len(px), share_over_200px=sum(1 for v in px if v > 200) / len(px))
# implied speeds on the candidate clock (m per model-minute)
sp = []
for uid, a, b, g, d, dt in trans:
    if dt > 0 and d > 1 and g <= 40:
        sp.append((d / dt, uid, a['tick'], b['tick'], d, dt, a['disposition'], b['disposition']))
sp.sort(reverse=True)
R['movement']['implied_speed_m_per_model_minute_candidate_clock'] = dict(
    n=len(sp), p50=float(np.percentile([s[0] for s in sp], 50)), p90=float(np.percentile([s[0] for s in sp], 90)),
    share_over_150=sum(1 for s in sp if s[0] > 150) / len(sp), share_over_400=sum(1 for s in sp if s[0] > 400) / len(sp),
    fastest=[dict(unit=s[1], t0=s[2], t1=s[3], metres=round(s[4]), minutes=round(s[5], 1), m_per_min=round(s[0]), disp=[s[6], s[7]]) for s in sp[:6]],
    caveat='clock = data-src/time/time_anchors.json candidate (33 anchors, all "proposed", not reviewed); speeds move when the anchors move')
# the far-jump guard in F4: |dlat|+|dlng| > 0.05 -> snap
R['movement']['jumps_beyond_shipped_snap_guard_0p05deg'] = sum(1 for uid, a, b, g, d, dt in trans if abs(a['lat'] - b['lat']) + abs(a['lng'] - b['lng']) > 0.05)

# ---------------------------------------------------------------- 5. bearing versus actual displacement
def azimuth(a, b):
    dy = (b['lat'] - a['lat']) * M_LAT; dx = (b['lng'] - a['lng']) * M_LNG
    return (math.degrees(math.atan2(dx, dy)) + 360) % 360
def angdiff(a, b):
    d = abs(a - b) % 360
    return min(d, 360 - d)
bd = collections.defaultdict(list)
for uid, a, b, g, d, dt in trans:
    if d >= 50:
        az = azimuth(a, b)
        bd[a['disposition']].append(angdiff(a['bearing'], az))
        bd['ALL'].append(angdiff(a['bearing'], az))
R['bearing_vs_motion'] = dict(
    note='angle between the keyframe bearing and the true compass direction of the next displacement (>= 50 m), per disposition of the starting keyframe',
    by_disposition={k: dict(n=len(v), median_deg=float(np.median(v)), share_within_45=sum(1 for x in v if x <= 45) / len(v), share_within_90=sum(1 for x in v if x <= 90) / len(v)) for k, v in bd.items() if len(v) >= 5})

# ---------------------------------------------------------------- 6. sky on the candidate clock
lc = collections.Counter(); lcday = collections.defaultdict(collections.Counter)
for r in arows:
    t = r[0]; light = r[8]; day = 1 if t <= 225 else 2 if t <= 450 else 3
    lc[light] += 1; lcday[day][light] += 1
moon_up = sum(1 for r in arows if r[9]); moon_up_day = collections.Counter(1 if r[0] <= 225 else 2 if r[0] <= 450 else 3 for r in arows if r[9])
sun_ev = {(e['date'], e['event']): e for e in astro['events']}
def tick_of(date, ev):
    e = sun_ev.get((date, ev))
    return e['tick'] if e else None
R['sky'] = dict(
    ticks=len(arows), light_class_counts=dict(lc), light_class_by_day={d: dict(c) for d, c in lcday.items()},
    moon_up_ticks=moon_up, moon_up_by_day=dict(moon_up_day),
    moon_illum_pct_range=[min(r[7] for r in arows), max(r[7] for r in arows)],
    sun_altitude_deg_range=[min(sun_alt.values()), max(sun_alt.values())],
    events_on_candidate_clock={f'{d}|{e}': v['tick'] for (d, e), v in sun_ev.items() if d in ('1863-07-01', '1863-07-02', '1863-07-03')},
    clock_status=jl('data-src/time/time_anchors.json')['notice'],
    anchors=collections.Counter(a['status'] for a in jl('data-src/time/time_anchors.json')['anchors']),
    clock_minutes_per_tick=dict(
        min=min((lmt[t + 1] - lmt[t]) for t in range(1, 675) if lmt[t + 1] > lmt[t]),
        max=max((lmt[t + 1] - lmt[t]) for t in range(1, 675) if lmt[t + 1] - lmt[t] < 600),
        p50=float(np.median([lmt[t + 1] - lmt[t] for t in range(1, 675) if lmt[t + 1] - lmt[t] < 600])),
        night_gap_ticks=[t for t in range(1, 675) if lmt[t + 1] - lmt[t] >= 600]),
)
R['sky']['anchors'] = dict(R['sky']['anchors'])
# ticks for the weather slots (candidate clock; Jacobs's clock readings are 7 am / 8 am / 2 pm / 9 pm)
def tick_at(day_offset_min):
    # nearest tick on the candidate clock to a given LMT minute since 1863-07-01T00:00
    best = min(arows, key=lambda r: abs(r[1] - day_offset_min))
    return best[0], round(best[1] - day_offset_min, 1)
slots = {}
for day, base in ((1, 0), (2, 1440), (3, 2880)):
    for lab, hh in (('7am', 7), ('8am', 8), ('2pm', 14), ('6pm', 18), ('9pm', 21)):
        slots[f'July {day} {lab}'] = tick_at(base + hh * 60)
R['sky']['weather_slot_ticks_candidate_clock'] = slots

# ---------------------------------------------------------------- 7. events and popups
ev = []
for i in (1, 2, 3):
    ev += jl(D + f'chronology_day{i}.json')['events']
ticks_with_rows = {r['tick'] for r in rows}
unit_at = collections.defaultdict(set)     # unit -> set of ticks with own keyframes
for r in rows:
    unit_at[r['unit_id']].add(r['tick'])
first_tick = {u: min(t) for u, t in unit_at.items()}
def placed_by(uid, tick):
    return uid in first_tick and first_tick[uid] <= tick
ev_units = [(e, u) for e in ev for u in (e.get('units_involved') or [])]
R['events'] = dict(
    chronology_events=len(ev), distinct_ticks=len({e['tick'] for e in ev}),
    by_significance=dict(collections.Counter(e['significance'] for e in ev)),
    with_units_involved=sum(1 for e in ev if e.get('units_involved')),
    unit_refs=len(ev_units), unit_refs_resolving=sum(1 for e, u in ev_units if info(u)),
    unit_refs_placed_at_or_before_event_tick=sum(1 for e, u in ev_units if placed_by(u, e['tick'])),
    unit_refs_with_own_keyframe_exactly_at_event_tick=sum(1 for e, u in ev_units if e['tick'] in unit_at.get(u, ())),
    events_with_a_keyframe_row_at_the_same_tick=sum(1 for e in ev if e['tick'] in ticks_with_rows),
    events_with_coordinates=sum(1 for e in ev if 'lat' in e or 'lng' in e),
    events_with_location_text=sum(1 for e in ev if e.get('location')),
)
succ = jl(D + 'oob/commander_successions.json')
S = succ['union_successions'] + succ['confederate_successions']
R['successions'] = dict(
    records=len(S), union=len(succ['union_successions']), confederate=len(succ['confederate_successions']),
    unit_resolves=sum(1 for s in S if info(s['unit_id'])),
    unit_placed_at_or_before_tick=sum(1 for s in S if placed_by(s['unit_id'], s['approx_tick'])),
    unit_has_keyframe_within_12_ticks=sum(1 for s in S if any(abs(t - s['approx_tick']) <= 12 for t in unit_at.get(s['unit_id'], ()))),
    causes=dict(collections.Counter(s['cause'] for s in S)),
    with_source_field=sum(1 for s in S if s.get('source')),
    note='approx_tick is stored per record; the tick duration is declared as 5 minutes in the file but the candidate clock is variable (sky.clock_minutes_per_tick)')
V = []
for i in (1, 2, 3):
    V += jl(D + f'vignettes_part{i}.json')['vignettes']
R['vignettes'] = dict(records=len(V), with_trigger_coordinates=sum(1 for v in V if v.get('trigger_lat')), distinct_trigger_ticks=len({v['trigger_tick'] for v in V}))

# popup survival when the playback loop skips ticks (pretty:96965-97003)
def skip_rate(speed, frame_ms):
    # simulate the accumulator: period = 500/speed ms; each frame adds frame_ms; ticks advance floor(Hc/period)
    period = 500.0 / speed
    hc = 0.0; tick = 1; seen = {1}; total = 0
    steps = 0
    while tick < 675 and steps < 200000:
        steps += 1
        hc += frame_ms
        if hc >= period:
            n = int(hc // period); hc = hc % period
            new = min(tick + n, 675)
            for t in range(tick + 1, new + 1):
                total += 1
            seen.add(new)
            tick = new
    return seen
evt = sorted({e['tick'] for e in ev})
sk = {}
for label, frame in (('desktop_60fps', 1000 / 60), ('mobile_33ms_throttle', 33.0), ('desktop_30fps', 1000 / 30)):
    for speed in (1, 2, 4, 8, 16):
        seen = skip_rate(speed, frame)
        shown = [t for t in evt if t in seen]
        sk[f'{label}|{speed}x'] = dict(event_ticks=len(evt), event_ticks_landed_on_by_the_loop=len(shown), share=len(shown) / len(evt))
R['popups'] = dict(
    note='the chronology card matches the EXACT current tick (pretty:98607); the loop advances floor(accumulated ms / (500/speed)) ticks per frame, so a faster loop can step over an event tick. Simulated with a constant frame time.',
    event_tick_hit_rate=sk)

# ---------------------------------------------------------------- 8. casualty data
ca = jl(D + 'casualty_apportionment.json')
periods = []
for side in ('union_corps', 'confederate_corps'):
    for c in ca[side]:
        for p in c['engagement_periods']:
            periods.append((c['corps_id'], p['day'], p['tick_range'], p['casualties']))
R['casualty_model'] = dict(
    corps_records=len(ca['union_corps']) + len(ca['confederate_corps']), engagement_periods=len(periods),
    periods_cover_ticks=len({t for _, _, tr, _ in periods for t in range(tr[0], tr[1] + 1)}),
    model_statement=ca['metadata']['purpose'],
    sigma_infantry_ticks=ca['metadata']['formulas']['bell_curve_sigma_infantry'],
    corps_strength_initial_in_apportionment={c['corps_id']: c['initial_strength'] for c in ca['union_corps'] + ca['confederate_corps']},
)
fx = jl('data-src/build/facts.json')
R['casualty_model']['corps_strength_in_oob_header'] = {c['id']: c['strength'] for c in fx['corps']['union'] + fx['corps']['confederate']}
led = jl('data-src/ledger/conflict_ledger.json')
R['ledger'] = dict(rows=len(led['rows']), ids=[r['id'] for r in led['rows']],
                   per_corps_rows=[r['id'] for r in led['rows'] if r.get('by_unit')],
                   unit_loss_rows=[r['id'] for r in led['rows'] if r.get('kind') == 'unit-loss'],
                   status_counts=dict(collections.Counter(r['status'] for r in led['rows'])))

# ---------------------------------------------------------------- 8b. identity facts that could label a tile
fate = collections.Counter()
for u in registry:
    for c in u.get('commanders', []):
        f = (c.get('fate') or '').strip()
        if not f: k = 'none'
        elif f.startswith('Survived'): k = 'survived'
        elif f.startswith('KIA'): k = 'killed'
        elif f.startswith('Mortally'): k = 'mortally wounded'
        elif re.search(r'[Cc]aptured', f): k = 'captured'
        elif re.search(r'[Ww]ound|[Ll]ost|amputat|leg|arm', f): k = 'wounded'
        else: k = 'other'
        fate[k] += 1
bat = [u for u in registry if u.get('guns')]
R['identity_facts'] = dict(
    commander_entries=sum(fate.values()), commander_fate_classes=dict(fate),
    batteries_with_guns=len(bat), guns_total=sum(u['guns'] for u in bat), guns_per_battery=dict(collections.Counter(u['guns'] for u in bat)),
    gun_types=dict(collections.Counter(u['gun_type'] for u in bat).most_common()),
    batteries_with_guns_and_own_keyframes=sum(1 for u in bat if u['placed_via'] == 'own'),
    states_recorded=len({u['state'] for u in registry if u['state']}), units_with_state=sum(1 for u in registry if u['state']))
kt = sorted({r['tick'] for r in rows})
gp = np.diff(kt)
fm = {}; lm = {}
for r in rows:
    fm[r['unit_id']] = min(fm.get(r['unit_id'], 10 ** 9), r['tick']); lm[r['unit_id']] = max(lm.get(r['unit_id'], 0), r['tick'])
R['keyframe_density'] = dict(
    populated_ticks_by_day={d: sum(1 for t in kt if (1 if t <= 225 else 2 if t <= 450 else 3) == d) for d in (1, 2, 3)},
    gap_between_populated_ticks=dict(median=float(np.median(gp)), max=int(gp.max()), share_gap_1=float((gp == 1).mean()), share_gap_ge_10=float((gp >= 10).mean())),
    longest_empty_stretch=[int(kt[int(np.argmax(gp))]), int(kt[int(np.argmax(gp)) + 1])],
    max_rows_at_one_tick=collections.Counter(r['tick'] for r in rows).most_common(4),
    units_first_keyframe_by_day={d: sum(1 for t in fm.values() if (1 if t <= 225 else 2 if t <= 450 else 3) == d) for d in (1, 2, 3)},
    units_last_keyframe_by_day={d: sum(1 for t in lm.values() if (1 if t <= 225 else 2 if t <= 450 else 3) == d) for d in (1, 2, 3)},
    units_whose_last_keyframe_is_before_tick_627=sum(1 for t in lm.values() if t < 627),
    placed_ids_with_ge2_keyframes=sum(1 for u in placed_ids if len({r['tick'] for r in by_unit[u]}) >= 2),
    placed_ids_with_exactly_1_keyframe=sum(1 for u in placed_ids if len({r['tick'] for r in by_unit[u]}) == 1),
    max_keyframes_one_unit=max(len({r['tick'] for r in by_unit[u]}) for u in placed_ids))
# popup arrival density
card_ticks = sorted({e['tick'] for e in ev if e['significance'] != 'low'})
succ_ticks = sorted(s_['approx_tick'] for s_ in S)
vig_ticks = sorted(int(v['trigger_tick']) for v in V)
allp = sorted(set(card_ticks) | set(succ_ticks) | set(vig_ticks))
gg = np.diff(allp)
cc = collections.Counter(card_ticks + succ_ticks + vig_ticks)
R['popups']['arrival'] = dict(
    card_ticks_non_low=len(card_ticks), succession_ticks=len(succ_ticks), vignette_trigger_ticks=len(vig_ticks), distinct_popup_ticks=len(allp),
    gap_ticks_median=float(np.median(gg)), share_gap_le_2=float((gg <= 2).mean()), share_gap_le_6=float((gg <= 6).mean()),
    ticks_with_2_or_more_popups=sum(1 for v in cc.values() if v >= 2), most_popups_at_one_tick=cc.most_common(1)[0],
    event_card_on_screen_ms_at_speed={str(sp): 500.0 / sp for sp in (0.25, 0.5, 1, 2, 4, 8, 16)},
    note='the chronology card renders only while currentTick equals the event tick (pretty:98607-98612); the playback loop holds each tick 500/speed ms (pretty:96948, 96982)')

# ---------------------------------------------------------------- 9. terrain
tj = jl(D + 'terrain.json'); tl = jl('legacy/dist/data/terrain.json')
R['terrain'] = dict(
    key_locations=len(tj['key_locations']), with_elevation=sum(1 for k in tj['key_locations'] if 'elevation_ft' in k),
    elevation_ft_range=[min(k['elevation_ft'] for k in tj['key_locations']), max(k['elevation_ft'] for k in tj['key_locations'])],
    roads=len(tj['roads']), roads_with_polyline=sum(1 for r in tj['roads'] if 'coordinates' in r or 'path' in r), roads_single_point=sum(1 for r in tj['roads'] if 'lat_approx' in r),
    structures=len(tj['structures']), features=len(tj['terrain_features']), features_with_point=sum(1 for f in tj['terrain_features'] if 'lat' in f),
    dem_in_repo=False,
    moved_between_legacy_and_production=sorted([(a['name'], round(math.hypot((a['lat'] - b['lat']) * M_LAT, (a['lng'] - b['lng']) * M_LNG)))
                                               for a, b in zip(tj['key_locations'], tl['key_locations']) if a['lat'] != b['lat'] or a['lng'] != b['lng']], key=lambda x: -x[1]),
)

# ---------------------------------------------------------------- 10. do placements follow the production or the legacy terrain coordinates?
prod = {k['name']: k for k in tj['key_locations']}; leg = {k['name']: k for k in tl['key_locations']}
def dpt(p, q):
    return math.hypot((p[0] - q[0]) * M_LAT, (p[1] - q[1]) * M_LNG)
reg_test = {}
for name, keys in (("Culp's Hill", ['culp']), ("Devil's Den", ['devil']), ('Little Round Top', ['little round top', 'lrt']), ('Cemetery Hill', ['cemetery hill']), ('The Wheatfield', ['wheatfield']), ('Peach Orchard', ['peach orchard'])):
    sel = [r for r in rows if any(k in (r.get('notes') or '').lower() for k in keys)]
    dp = [dpt((r['lat'], r['lng']), (prod[name]['lat'], prod[name]['lng'])) for r in sel]
    dl = [dpt((r['lat'], r['lng']), (leg[name]['lat'], leg[name]['lng'])) for r in sel]
    reg_test[name] = dict(rows_naming_it=len(sel), median_m_to_production_location=round(float(np.median(dp))), median_m_to_legacy_location=round(float(np.median(dl))),
                          share_closer_to_production=round(sum(1 for a, b in zip(dp, dl) if a < b) / len(sel), 2))
R['terrain']['placements_vs_key_locations'] = dict(
    note='rows whose own note names a place, distance to that place as served by production vs as in legacy/dist; the note text is a loose proxy for "at the place"',
    by_place=reg_test,
    external_check=dict(culps_hill_production_vs_wikipedia_m=21, devils_den_production_vs_wikipedia_m=0, culps_hill_legacy_vs_wikipedia_m=725, devils_den_legacy_vs_wikipedia_m=457,
                        wikipedia_coordinates=dict(culps_hill=[39.8201, -77.2203], devils_den=[39.79150, -77.24238]),
                        source='https://en.wikipedia.org/wiki/Culp%27s_Hill and https://en.wikipedia.org/wiki/Devil%27s_Den (coordinate templates in the wikitext, read 2026-10-05)'))

# ---------------------------------------------------------------- 11. Union and Confederate tiles on an identical coordinate
def _states(model):
    st = {}; out = []
    for t in sorted({r['tick'] for r in rows}):
        if model == 'B':
            st = {}
        for r in rows:
            if r['tick'] == t:
                st[r['unit_id']] = r
        out.append((t, dict(st)))
    return out
enemy = {}
for model in ('A', 'B'):
    pairs = 0; same_tick = 0; ticks = set()
    for t, st in _states(model):
        g = collections.defaultdict(list)
        for u, r in st.items():
            g[(r['lat'], r['lng'])].append((u, r['tick']))
        for v in g.values():
            for i in range(len(v)):
                for j in range(i + 1, len(v)):
                    if v[i][0].startswith('U-') != v[j][0].startswith('U-'):
                        pairs += 1; ticks.add(t); same_tick += (v[i][1] == v[j][1])
    enemy[model] = dict(pair_states=pairs, last_keyframe_same_tick=same_tick, last_keyframe_different_tick=pairs - same_tick,
                        states_with_such_a_pair=len(ticks), ticks_of_those_states=sorted(ticks) if model == 'B' else None)
R['enemy_tiles_on_identical_coordinate'] = dict(
    note='Union and Confederate tiles on one exact lat/lng, counted per keyframe state (A = carry-forward, B = latest keyframe snapshot); "last keyframe different tick" = the two tiles come from different ticks (a stale tile meeting a later one)',
    **enemy)

json.dump(R, open(OUT, 'w', encoding='utf8'), ensure_ascii=False, indent=1, default=lambda o: dict(o) if isinstance(o, collections.Counter) else str(o))
print('wrote', OUT, os.path.getsize(OUT), 'bytes')
