"""Validator for the B.7/B.8 structure and state-schedule data (PDF gates Q07, Q08, Q09; Q12 analogue for scrubbing).
Usage:  python tools/bt/check_structures.py            run every check and self-test; exit 1 on any failure
        python tools/bt/check_structures.py --state ID ISO_TIME [--scenario NAME]
Pure function:  state_at(structure_id, time_iso, scenario='default', seed=0) -> dict
  The result depends only on (structure_id, time_iso, scenario, seed) and the JSON files: no hidden state, no accumulation,
  so scrubbing in any order gives the same answers (checked below).
PDF defaults are logged in state_schedule.json -> pdf_defaults_log; ALL are PENDING OWNER (Law cl.6). Scenario "default" is the row as the
engine reads it in B.8.7; it is not a choice between conflicting sources."""
import datetime as dt
import functools
import hashlib
import json
import os
import random
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from structures_common import classify, weak_kind  # noqa: E402

ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
DIR = os.path.join(ROOT, 'docs', 'battle-theatre', 'structures')
START = dt.datetime(1863, 6, 26)
END = dt.datetime(1863, 11, 20, 23, 59)


# ------------------------------------------------------------------------------------------------ data
@functools.lru_cache(maxsize=1)
def _data():
    j = lambda n: json.load(open(os.path.join(DIR, n), encoding='utf-8'))
    d = dict(structures=j('structures.json'), sched=j('state_schedule.json'), works=j('works_stages.json'), hosp=j('hospitals.json'))
    d['by_id'] = {s['id']: s for s in d['structures']['structures']}
    d['hosp_by_id'] = {h['id']: h for h in d['hosp']['hospitals']}
    d['rows'] = {r['id']: r for r in d['sched']['rows']}
    d['part_ids'] = {p['id'] for s in d['structures']['structures'] for p in s.get('parts', [])}
    return d


def _p(s):
    return dt.datetime.fromisoformat(s) if s else None


def _end(x):
    """a bound printed as HH:59 at 23:59 is the end of that day (exclusive at midnight)"""
    return x + dt.timedelta(minutes=1) if x and x.hour == 23 and x.minute == 59 else x


# ------------------------------------------------------------------------------------------------ rows -> intervals
def _pick_a(win, begin):
    t = begin if begin else win
    if not t:
        return None
    return _p(t[2] or t[0] or t[1]) if begin else _p(t[2] or t[0] or t[1])


def _pick_b(win, finish):
    t = finish if finish else win
    if not t:
        return None
    return _p(t[2] or t[1] or t[0])


def _expand(row, scenario):
    """-> list of pseudo-rows dict(id, frm, to, a, b, gran, flags, tier). Scenario overrides apply only where the row defines that scenario."""
    sc = row.get('scenarios', {}).get(scenario)
    t = row['time']
    win, begin, finish, gran = t['window'], t.get('begin'), t.get('finish'), t.get('granularity')
    flags = []
    if row.get('out_of_battle_scope'):
        return [], ['out_of_battle_scope']
    if sc:
        flags.append('scenario:' + scenario)
        if sc.get('no_change'):
            return [], flags + ['scenario_suppresses_change']
        win = sc.get('window', win)
        begin = sc.get('begin', begin)
        finish = sc.get('finish', finish)
        gran = sc.get('gran', gran)
    out = []
    if row.get('phases'):
        prev = row['from_state']
        for ph in row['phases']:
            w = ph['window']
            if sc and ph['state'] == 'Open' and sc.get('phase_open'):
                w = sc['phase_open']
            elif scenario in ph.get('scenarios', {}):
                w = ph['scenarios'][scenario]['window']
            a, b = _p(w[2] or w[0] or w[1]), _end(_p(w[2] or w[1] or w[0]))
            out.append(dict(id=row['id'] + ':' + ph['state'], frm=prev, to=ph['state'], a=a, b=b, gran='date', flags=flags, row=row['id']))
            prev = ph['state']
        return out, flags
    a, b = _pick_a(win, begin), _pick_b(win, finish)
    if a is None and b is None:
        return [], flags + ['unscheduled_no_window']
    if a is None:
        a = b
        flags.append('earliest_not_printed_placed_at_latest')
    if b is None or b < a:
        b = a
    return [dict(id=row['id'], frm=row['from_state'], to=row['to_state'], a=a, b=_end(b) if gran != 'clock' or b.hour == 23 and b.minute == 59 else b, gran=gran, flags=flags, row=row['id'])], flags


def _fence_pseudo_rows(sid):
    s = _data()['by_id'].get(sid)
    out = []
    if s and sid.startswith('FEN-'):
        for i, ch in enumerate(s.get('state_changes', [])):
            if ch.get('schedule_row') or not ch.get('window'):
                continue
            w = ch['window']
            a, b = _p(w[0] or w[1]), _end(_p(w[1] or w[0]))
            if a is None:
                continue
            out.append(dict(id='%s:chg%d' % (sid, i), frm='(not printed in B.8.3)', to=ch['to_state'], a=a, b=b, gran='date' if ch['time_parse'] == 'date' else 'clock',
                            flags=['from_fence_table'], row=None))
    return out


def _rows_for(sid, scenario):
    d = _data()
    out, notes = [], []
    for r in d['sched']['rows']:
        if sid in r['object_ids']:
            pr, fl = _expand(r, scenario)
            out += pr
            if not pr:
                notes.append((r['id'], fl))
    out += _fence_pseudo_rows(sid)
    return out, notes


# ------------------------------------------------------------------------------------------------ works (E-nn)
def stage_shares(work_id, seed=0):
    h = hashlib.sha256(('%s:%s' % (seed, work_id)).encode()).digest()
    w = [1 + h[i] / 255 for i in range(4)]
    s = sum(w)
    return [x / s for x in w]


STAGE_NAMES = {0: 'bare ground', 1: 'layout', 2: 'felling and gathering', 3: 'stacking', 4: 'head logs and concealment', 5: 'completed', 6: 'damaged'}


def _work_state(wid, t, scenario, seed):
    w = _data()['works']['works'][wid]
    res = dict(structure_id=wid, time=t.isoformat(timespec='minutes'), scenario=scenario, kind='work')
    if not w['construction_applies']:
        res.update(state='no_construction (%s)' % w.get('why_not', ''), present=None, stage=None, order=-1, status='not_a_construction')
        return res
    b, f = dict(w['begin']), dict(w['finish'])
    sc = (w.get('scenarios') or {}).get(scenario)
    if sc:
        if 'begin_earliest' in sc:
            b['earliest'] = sc['begin_earliest']
            b['default'] = None
        if 'begin_latest' in sc:
            b['latest'] = sc['begin_latest']
        if 'begin_gran' in sc:
            b['gran'] = sc['begin_gran']
        if 'finish_earliest' in sc:
            f['earliest'] = sc['finish_earliest']
        if 'finish_latest' in sc:
            f['latest'] = sc['finish_latest']
        res['scenario_applied'] = scenario
    be, bl, bd = _p(b.get('earliest')), _p(b.get('latest')), _p(b.get('default'))
    fe, fl = _p(f.get('earliest')), _p(f.get('latest'))
    fl = _end(fl) if fl else fl
    bl = _end(bl) if (bl and b.get('gran') == 'date') else bl
    dmg = w.get('damage_stage')
    start_clock = bd or (be if (be and be == bl) else None)
    if b.get('gran') == 'clock' and start_clock and f.get('gran') == 'clock' and fl and fl > start_clock:
        # full clock mode: seeded stage shares across [start, fl]
        if t < start_clock:
            st, order, nm = 0, 0, STAGE_NAMES[0]
        elif t >= fl:
            st, order, nm = 5, 5, STAGE_NAMES[5]
        else:
            frac = (t - start_clock) / (fl - start_clock)
            sh = stage_shares(wid, seed)
            c, st = 0.0, 1
            for i, x in enumerate(sh):
                c += x
                if frac < c:
                    st = i + 1
                    break
            else:
                st = 4
            order, nm = st, STAGE_NAMES[st]
        res.update(present=(st > 0), stage=st, status='stage_split_plausible_procedural' if 0 < st < 5 else 'certain_by_window',
                   state='stage %d: %s' % (st, nm), order=order, stage_tier=('plausible-procedural' if 0 < st < 5 else 'documented window'))
        if dmg:
            da = _p(dmg['begin'])
            dl = _p(dmg['finish_latest'])
            if t >= da:
                if t >= dl:
                    res.update(stage=6, state='stage 6: damaged', order=6, status='inferred_damage_state_derived_window', present=True)
                else:
                    res.update(stage=5, state='stage 5 -> 6: damage in progress (E-11 shelling)', order=5.5, status='transitioning_derived_window', present=True)
        if w.get('reentry') and t < _p('1863-07-03T00:00') and res['stage'] == 5:
            res['flag'] = w['reentry']
        return res
    # partial mode: no stage claims
    floor = be or _p(b.get('date'))
    if floor is None:
        res.update(state='unscheduled (no printed date)', present=None, stage=None, order=0.5, status='open_gap')
        return res
    if t < floor:
        res.update(state='stage 0: bare ground', present=False, stage=0, order=0, status='certain_before_documented_start')
    elif bl is not None and t >= bl and (fl is None or t < fl):
        res.update(state='under construction, stage not resolved', present=True, stage=None, order=2, status='partial_window')
    elif fl is not None and t >= fl:
        res.update(state='built / existing, stage not resolved', present=True, stage=None, order=5, status='after_documented_finish')
    else:
        res.update(state='indeterminate (start within printed window; no clock)', present=None, stage=None, order=1, status='indeterminate_window')
    if dmg and res['order'] >= 2 and t >= _p(dmg['begin']):
        res.update(state='damaged (derived window)', stage=6, order=6, present=True)
    return res


# ------------------------------------------------------------------------------------------------ public API
def state_at(structure_id, time_iso, scenario='default', seed=0):
    """Pure function of its arguments and the JSON data. Returns a dict with at least: state, status, present, rows."""
    d = _data()
    t = _p(time_iso)
    base_id = structure_id.split('#')[0]
    if base_id not in d['by_id'] and base_id not in d['hosp_by_id']:
        raise KeyError('unknown structure id: ' + structure_id)
    if '#' in structure_id and structure_id not in d['part_ids']:
        raise KeyError('unknown part id: ' + structure_id)
    s = d['by_id'].get(base_id)
    if s is not None and s['kind'] == 'avenue_not_in_1863':
        return dict(structure_id=structure_id, time=t.isoformat(timespec='minutes'), scenario=scenario, state='does_not_exist_in_1863', status='never_placed', present=False, rows=[])
    if s is not None and re.match(r'^E-\d\d$', base_id) and base_id in d['works']['works']:
        return _work_state(base_id, t, scenario, seed)
    if s is not None and s.get('preexisting') is True and s['kind'] == 'preexisting_wall_or_fence' and not _rows_for(structure_id, scenario)[0]:
        return dict(structure_id=structure_id, time=t.isoformat(timespec='minutes'), scenario=scenario, state='present at frame one (pre-existing; no construction)', status='certain',
                    present=True, rows=[])
    rows, notes = _rows_for(structure_id, scenario)
    res = dict(structure_id=structure_id, time=t.isoformat(timespec='minutes'), scenario=scenario, rows=[], suppressed=sorted(n[0] for n in notes))
    started = [r for r in rows if r['a'] <= t]
    if not rows:
        res.update(state='no scheduled state (initial state unspecified in B.8.7)', status='no_rows', present=None)
        return res
    if not started:
        first = sorted(rows, key=lambda r: (r['a'], r['b'], r['id']))[0]
        res.update(state=first['frm'], status='before_all_documented_changes', present=True, rows=[first['id']])
        return res
    cur = sorted(started, key=lambda r: (r['a'], r['b'], r['id']))[-1]
    res['rows'] = [r['id'] for r in sorted(started, key=lambda r: (r['a'], r['b'], r['id']))]
    res['flags'] = cur['flags']
    if t >= cur['b'] and cur['a'] <= cur['b'] and not (cur['a'] == cur['b'] and t < cur['a']):
        res.update(state=cur['to'], status='after', present=True)
    elif cur['gran'] in ('date', 'date_start'):
        res.update(state='indeterminate within date window: %s -> %s' % (cur['frm'], cur['to']), status='indeterminate_date_only', present=None, from_state=cur['frm'], to_state=cur['to'])
    else:
        span = (cur['b'] - cur['a']).total_seconds()
        res.update(state='transitioning: %s -> %s' % (cur['frm'], cur['to']), status='transitioning', present=True, from_state=cur['frm'], to_state=cur['to'],
                   progress=round((t - cur['a']).total_seconds() / span, 6))
    return res


def scenarios_for(structure_id):
    out = {'default'}
    for r in _data()['sched']['rows']:
        if structure_id in r['object_ids']:
            out |= set(r.get('scenarios', {}))
    w = _data()['works']['works'].get(structure_id)
    if w:
        out |= set((w.get('scenarios') or {}))
    return sorted(out)


# ------------------------------------------------------------------------------------------------ check harness
class Gate:
    def __init__(self, name):
        self.name, self.n, self.fails = name, 0, []

    def ok(self, cond, msg):
        self.n += 1
        if not cond:
            self.fails.append(msg)

    def report(self):
        print('%s %s  (%d checks, %d failures)' % (self.name, 'PASS' if not self.fails else 'FAIL', self.n, len(self.fails)))
        for f in self.fails[:60]:
            print('    FAIL: ' + f)
        return not self.fails


def grid(a, b, minutes):
    t = a
    while t <= b:
        yield t
        t += dt.timedelta(minutes=minutes)


def check_integrity(G):
    d = _data()
    S = d['structures']['structures']
    rows = d['sched']['rows']
    ids = [s['id'] for s in S]
    G.ok(len(ids) == len(set(ids)), 'duplicate structure ids')
    cnt = lambda pref: sum(1 for i in ids if re.match(pref, i))
    G.ok(cnt(r'^E-\d\d$') == 18, 'expected 18 E-nn')
    G.ok(cnt(r'^P-\d\d$') == 14, 'expected 14 P-nn')
    G.ok(cnt(r'^G-\d\d$') == 18, 'expected 18 G-nn')
    G.ok(sum(1 for s in S if s['section'] == 'B.8.2') == 41, 'expected 41 B.8.2 rows')
    G.ok(sum(1 for s in S if s['section'] == 'B.8.3') == 16, 'expected 15 B.8.3 rows + 1 derived Chambersburg Pike fence')
    G.ok(sum(1 for s in S if s['section'] == 'B.8.4') == 7, 'expected 7 B.8.4 rows')
    G.ok(len(d['hosp']['hospitals']) == 23, 'expected 23 hospital rows')
    G.ok([r['id'] for r in rows] == ['S-%03d' % i for i in range(1, 89)], 'schedule ids must be S-001..S-088')
    G.ok(len(d['sched']['rules']) == 4, 'expected 4 never-schedule rule records')
    valid = set(d['by_id']) | set(d['hosp_by_id']) | d['part_ids']
    for r in rows:
        for o in r['object_ids']:
            G.ok(o in valid, '%s: object id %s does not resolve' % (r['id'], o))
        t = r['time']
        w = t['window']
        if t['time_parse'] == 'phrase':
            G.ok(w is None, '%s: phrase row must not carry a parsed window' % r['id'])
        else:
            G.ok(w is not None and (w[0] or w[1]), '%s: parsed row without window' % r['id'])
            if w and w[0] and w[1]:
                G.ok(w[0] <= w[1], '%s: window earliest > latest' % r['id'])
        if t['default_basis'] == 'none':
            G.ok(not (w and w[2]), '%s: default time without a PDF-printed single time' % r['id'])
        # tier recompute (mechanical rule)
        c = classify(r['tier_printed'], r['source_keys'])
        G.ok(c['tier'] == r['tier'] and c['weak_source'] == r['weak_source'], '%s: stored tier differs from mechanical rule' % r['id'])
        if r['tier'] == 'documented':
            G.ok(any(weak_kind(k) is None for k in r['source_keys']), '%s: documented with only weak keys' % r['id'])
    for s in S:
        if s.get('tier_printed') is not None and s.get('source_keys') is not None and 'tier_reason' in s:
            c = classify(s['tier_printed'], s['source_keys'])
            if s['kind'] != 'open_gap' and s['tier'] != 'open_gap':
                G.ok(c['tier'] == s['tier'], '%s: stored tier differs from mechanical rule' % s['id'])
    for l in d['sched']['pdf_defaults_log']:
        G.ok(l['status'] == 'PENDING OWNER', 'pdf default %s not marked PENDING OWNER' % l['id'])
    for c in d['hosp']['conflicts']:
        G.ok(c['chosen_default'] is None, 'hospital conflict %s has a chosen default' % c['id'])
        for p in c['pdf_defaults']:
            G.ok(p['status'] == 'PENDING OWNER', 'hospital conflict default not PENDING OWNER: ' + c['id'])


def check_q08(G):
    d = _data()
    W = d['works']['works']
    S = d['by_id']
    stages = d['works']['stage_model']['stages']
    G.ok([x['stage'] for x in stages] == list(range(7)), 'stage model must be stages 0..6')
    for wid in ['E-%02d' % i for i in range(1, 19)]:
        G.ok(wid in W, wid + ' missing from works_stages')
        w = W[wid]
        G.ok(w['construction_applies'] == S[wid]['construction_applies'], wid + ': construction flag differs between files')
        if w['construction_applies']:
            G.ok(bool(w.get('crew')), wid + ': constructing work without a crew')
            G.ok(w.get('builder_known') or w.get('stand_in_crew'), wid + ': unknown builder without a labeled stand-in crew')
            scs = scenarios_for(wid)
            for sc in scs:
                # absent before construction start: at timeline start and just before the documented floor
                G.ok(state_at(wid, START.isoformat(), sc)['present'] is False, '%s/%s: present at timeline start (pre-placed)' % (wid, sc))
                floor = _p(w['begin'].get('earliest') or w['begin'].get('date'))
                if (sc != 'default') and (w.get('scenarios') or {}).get(sc, {}).get('begin_earliest'):
                    floor = _p(w['scenarios'][sc]['begin_earliest'])
                if floor:
                    before = (floor - dt.timedelta(minutes=1)).isoformat()
                    G.ok(state_at(wid, before, sc)['present'] is False, '%s/%s: present before documented start %s' % (wid, sc, floor))
                # stage order
                seq = []
                for t in grid(START, dt.datetime(1863, 7, 5), 5):
                    seq.append(state_at(wid, t.isoformat(), sc))
                orders = [x['order'] for x in seq]
                G.ok(all(orders[i] <= orders[i + 1] for i in range(len(orders) - 1)), '%s/%s: stage order not monotone in time' % (wid, sc))
                stg = [x['stage'] for x in seq if x.get('stage') is not None]
                if any(x['status'].startswith('stage_split') for x in seq):
                    seen = sorted(set(stg))
                    G.ok(seen[:6] == [0, 1, 2, 3, 4, 5], '%s/%s: stages visited %s do not run 0..5 in order' % (wid, sc, seen))
        else:
            G.ok(not S[wid]['schedule_rows'] or wid in ('E-10', 'E-11', 'E-15', 'E-13', 'E-16'), wid + ': open-gap/no-work row carries schedule rows')
            if S[wid]['kind'] == 'open_gap':
                G.ok(not S[wid]['schedule_rows'], wid + ': open gap with schedule rows (would animate)')
                G.ok(state_at(wid, '1863-07-02T12:00')['stage'] is None, wid + ': open gap given a stage')
    # E-05 default acceptance: 06:00 start, completion within the printed 09:00-10:00 band, never before 09:00
    G.ok(state_at('E-05', '1863-07-02T05:59')['stage'] == 0, 'E-05 must be bare ground at 05:59')
    G.ok(state_at('E-05', '1863-07-02T06:30')['stage'] in (1, 2, 3), 'E-05 stage 1-3 at 06:30')
    G.ok(state_at('E-05', '1863-07-02T08:59')['stage'] != 5, 'E-05 completed before the earliest printed finish 09:00')
    G.ok(state_at('E-05', '1863-07-02T10:00')['stage'] == 5, 'E-05 must be completed by 10:00 (default)')
    G.ok(state_at('E-05', '1863-07-02T10:00', 'finish_about_noon_gd')['stage'] != 5, 'E-05 noon scenario must still be building at 10:00')
    G.ok(state_at('E-05', '1863-07-02T12:00', 'finish_about_noon_gd')['stage'] == 5, 'E-05 noon scenario completed at 12:00')
    G.ok(state_at('E-05', '1863-07-02T03:00', 'start_night_jul1_2_dmna')['stage'] is None, 'E-05 night-start scenario must not claim a stage')
    G.ok(state_at('E-05', '1863-07-03T09:00')['stage'] == 6, 'E-05 damaged (stage 6) after the Jul 3 shelling window')
    # pre-existing features: never constructed
    for pid in ['P-%02d' % i for i in range(1, 15)]:
        s = S[pid]
        G.ok(s['preexisting'] is True, pid + ': not flagged preexisting')
        G.ok(s['construction'] is None and s['construction_animation_allowed'] is False, pid + ': carries a construction schedule/permission')
        st = state_at(pid, '1863-06-26T00:00')
        G.ok(st['present'] in (True, None), pid + ': not present at frame one')
        for rid in s['schedule_rows']:
            r = d['rows'][rid]
            G.ok(not re.search(r'bare|absent', r['from_state'], re.I) and not re.search(r'breastwork|construct|built|rising', r['to_state'], re.I),
                 '%s: schedule row %s looks like construction of a pre-existing feature' % (pid, rid))
    # guns
    for g in ['G-%02d' % i for i in range(1, 19)]:
        s = S[g]
        if s['emplacement_class'] == 'improvised':
            G.ok(s['earth_allowed'] is False and not s['built_on_screen'], g + ': improvised position allowed earth')
        if s['emplacement_class'] == 'prepared':
            G.ok(s['built_on_screen'] is True, g + ': prepared emplacement not built on screen')


DESTRUCTIVE = re.compile(r'destroy|breach|splinter|missing|burn|dismantl|knocked|felled|nearly', re.I)


def check_q07(G):
    d = _data()
    S = d['by_id']
    for sid, s in S.items():
        if not (sid.startswith('FEN-') or s.get('kind') in ('stone_wall',)):
            continue
        for i, ch in enumerate(s['state_changes']):
            w = ch['window']
            has_win = bool(w and (w[0] or w[1]) and ch['time_parse'] in ('clock', 'date'))
            G.ok(has_win or bool(ch['open_flag']), '%s change %d (%s): neither a time window nor an open flag' % (sid, i, ch['to_state']))
            if w and w[0] and w[1]:
                G.ok(w[0] <= w[1], '%s change %d: window reversed' % (sid, i))
    # schedule rows touching fences / walls
    for r in d['sched']['rows']:
        if any(o.startswith('FEN-') or re.match(r'^P-(0[1-9]|1[0-4])$', o) for o in r['object_ids']) and not r['out_of_battle_scope']:
            t = r['time']
            G.ok((t['window'] is not None) or bool(r.get('flag')), '%s: fence/wall row without window or flag' % r['id'])
    # RULE-03 (Emmitsburg Road fences not destroyed before Jul 2-3)
    rule = [x for x in d['sched']['rules'] if x['id'] == 'RULE-03'][0]
    rx = re.compile(rule['forbidden_state_regex'], re.I)
    nb = _p(rule['not_before'])
    for sc in scenarios_for('FEN-emmitsburg-road'):
        rows, _ = _rows_for('FEN-emmitsburg-road', sc)
        for r in rows:
            if rx.search(r['to']):
                G.ok(r['a'] >= nb, 'FEN-emmitsburg-road/%s: destructive state %r starts %s before %s' % (sc, r['to'], r['a'], nb))
        for t in grid(START, dt.datetime(1863, 7, 1, 23, 59), 60):
            st = state_at('FEN-emmitsburg-road', t.isoformat(), sc)
            G.ok(not rx.search(st['state']) or st['status'] == 'before_all_documented_changes', 'FEN-emmitsburg-road/%s at %s: %s' % (sc, t, st['state']))
    G.ok(state_at('FEN-emmitsburg-road', '1863-07-03T09:00')['state'].find('reach') == -1 and 'breach' not in state_at('FEN-emmitsburg-road', '1863-07-03T09:00')['state'].lower(),
         'Emmitsburg fences breached on Jul 3 morning (PDF: intact morning Jul 3)')
    G.ok('breached' in state_at('FEN-emmitsburg-road', '1863-07-03T16:30')['state'].lower(), 'Emmitsburg fences not breached after 16:15 Jul 3')
    G.ok(state_at('FEN-emmitsburg-road', '1863-07-03T15:29')['status'] != 'after' or 'breach' not in state_at('FEN-emmitsburg-road', '1863-07-03T15:29')['state'].lower(), 'breach before 15:30')
    G.ok(state_at('FEN-rummel', '1863-07-02T23:59')['state'] == 'Standing', 'Rummel fences must stand until Jul 3')
    G.ok(state_at('FEN-rummel', '1863-07-04T00:00')['state'].startswith('Destroyed'), 'Rummel fences destroyed after Jul 3')
    G.ok(state_at('FEN-klingle', '1863-07-03T12:00')['present'] is not False, 'Klingle fences state query failed')
    # open flags exist for undated fence changes
    G.ok(S['FEN-thompson']['state_changes'][0]['open_flag'], 'Thompson fence open flag missing')
    G.ok(S['FEN-warfield']['state_changes'][0]['open_flag'], 'Warfield fence open flag missing')


def check_q09(G):
    d = _data()
    S = d['by_id']
    rows = d['sched']['rows']
    for r in rows:
        if any(o.startswith('bld-') for o in r['object_ids']) and not r['out_of_battle_scope']:
            G.ok(r['time']['window'] is not None, '%s: building state change with no parsed date/clock window' % r['id'])
            G.ok(r['time']['time_parse'] in ('clock', 'date'), '%s: building row time_parse is %s' % (r['id'], r['time']['time_parse']))
    # Bliss buildings burn 1863-07-03 morning, never earlier
    b = [x for x in rows if x['id'] == 'S-052'][0]
    G.ok(b['time']['part_of_day'] == 'morning' and b['time']['window'][0].startswith('1863-07-03') and b['time']['window'][1].startswith('1863-07-03'), 'S-052 must be Jul 3 morning')
    for part in ('bld-bliss-farm#house', 'bld-bliss-farm#barn'):
        for sc in scenarios_for(part):
            G.ok(state_at(part, '1863-07-02T23:59', sc)['state'] == 'Intact', '%s/%s: not intact at end of Jul 2' % (part, sc))
            G.ok(state_at(part, '1863-06-26T00:00', sc)['state'] == 'Intact', '%s/%s: not intact at timeline start' % (part, sc))
            G.ok(state_at(part, '1863-07-04T00:00', sc)['state'] == 'Burned', '%s/%s: not burned by Jul 4' % (part, sc))
            st = state_at(part, '1863-07-03T08:00', sc)
            G.ok(st['status'] == 'indeterminate_date_only', '%s/%s: Jul 3 morning should be a flagged date-only window, got %s' % (part, sc, st['status']))
            G.ok(not any(x['a'] < _p('1863-07-03T00:00') for x in _rows_for(part, sc)[0] if re.search('burn', x['to'], re.I)), '%s/%s burns before Jul 3' % (part, sc))
    # McPherson barn never burns
    for part in ('bld-mcpherson-farm#barn',):
        for sc in scenarios_for(part):
            for t in grid(START, END, 180):
                st = state_at(part, t.isoformat(), sc)
                G.ok(not re.search('burn', st['state'], re.I), '%s/%s at %s: burn state %r' % (part, sc, t, st['state']))
    s078 = [x for x in rows if x['id'] == 'S-078'][0]
    G.ok(s078['out_of_battle_scope'] and s078['time']['window'] is None, 'S-078 (house burned 1895) must be out of battle scope and unscheduled')
    G.ok(all(x['out_of_battle_scope'] for x in rows if x['id'] in ('S-078', 'S-079')), 'S-078/S-079 must be out of scope')
    G.ok('intact all battle' in [x for x in rows if x['id'] == 'S-017'][0]['to_state'], 'S-017 barn-intact text missing')
    # avenues
    G.ok(state_at('RD-avenues', '1863-07-03T12:00')['state'] == 'does_not_exist_in_1863', 'avenues must not exist')
    G.ok(not any('RD-avenues' in r['object_ids'] for r in rows), 'avenues referenced by a schedule row')
    # Sherfy barn: scenarios exposed, B.8.7 printed reading is the engine default, nothing else chosen
    G.ok(state_at('bld-sherfy-farm#barn', '1863-07-02T23:59')['state'] == 'Intact', 'Sherfy barn must be intact before Jul 3 (default)')
    G.ok(state_at('bld-sherfy-farm#barn', '1863-07-04T00:00')['state'] == 'Burned', 'Sherfy barn must be burned by Jul 4')
    G.ok(state_at('bld-sherfy-farm#barn', '1863-07-03T00:00', 'jul2_evening_c026')['state'] == 'Burned', 'scenario jul2_evening_c026 not exposed')
    G.ok(state_at('bld-sherfy-farm#barn', '1863-07-03T00:00', 'default')['status'] == 'indeterminate_date_only', 'Sherfy default must be a flagged Jul 3 date window')
    G.ok(set(scenarios_for('bld-sherfy-farm#barn')) >= {'default', 'jul3_afternoon_b87', 'jul2_evening_c026', 'flag_window_full'}, 'Sherfy scenarios incomplete')
    # Camp Letterman opening: both alternatives exposed, default undecided
    G.ok(state_at('H-23', '1863-07-21T12:00', 'open_jul20')['state'] == 'Open', 'Letterman open_jul20 scenario')
    G.ok(state_at('H-23', '1863-07-21T12:00', 'open_jul22')['state'] == 'Construction', 'Letterman open_jul22 scenario')
    G.ok(state_at('H-23', '1863-07-21T12:00', 'default')['status'] == 'indeterminate_date_only', 'Letterman default must leave the opening undecided')
    G.ok(state_at('H-23', '1863-11-21T00:00', 'default')['state'] == 'Closed', 'Letterman closed by Nov 21')
    G.ok(state_at('H-23', '1863-11-20T12:00', 'default')['status'] == 'indeterminate_date_only', 'Letterman Nov 20 closing is date-only')
    # other spot checks
    G.ok(state_at('bld-rock-creek-rr-bridge', '1863-06-25T12:00')['state'] == 'Intact', 'bridge intact before Jun 26')
    G.ok(state_at('bld-rock-creek-rr-bridge', '1863-06-28T00:00')['state'] == 'Burned', 'bridge burned after Jun 27')
    G.ok(state_at('bld-rock-creek-rr-bridge', '1863-06-26T12:00', 'jun27')['state'] == 'Intact', 'bridge scenario jun27 intact on Jun 26')
    G.ok(state_at('bld-wade-house', '1863-07-03T07:59')['state'] == 'Intact' and state_at('bld-wade-house', '1863-07-03T08:00')['state'].startswith('150+'), 'Wade house 08:00 Jul 3')
    G.ok('transitioning' in state_at('bld-evergreen-gatehouse', '1863-07-02T20:00')['state'], 'gatehouse damage window 19:30-21:00')
    # buildings' non-battle later events never scheduled
    for rid in ('S-078', 'S-079'):
        G.ok(state_at('bld-rose-farm#barn', '1863-11-19T00:00')['state'] != 'Burned 1910; torn down 1882', 'Rose barn later event leaked into the battle timeline')
    # hospitals table
    G.ok(len(d['hosp']['conflicts']) >= 8, 'hospital conflicts missing')


def check_scrub(G):
    """Q12 analogue: evaluation order must not matter."""
    d = _data()
    ids = sorted({o for r in d['sched']['rows'] for o in r['object_ids'] if o in d['by_id'] or o in d['part_ids'] or o in d['hosp_by_id']}
                 | {'E-%02d' % i for i in range(1, 19)} | {'FEN-emmitsburg-road', 'FEN-klingle', 'RD-avenues'})
    rng = random.Random(1863)
    times = [START + dt.timedelta(minutes=rng.randrange(0, int((END - START).total_seconds() // 60))) for _ in range(160)]
    times += [dt.datetime(1863, 7, rng.randrange(1, 5), rng.randrange(0, 24), rng.randrange(0, 60)) for _ in range(160)]
    times = sorted(set(times))
    jobs = [(i, sc) for i in ids for sc in scenarios_for(i)]
    for sid, sc in jobs:
        ref = {t: json.dumps(state_at(sid, t.isoformat(), sc), sort_keys=True) for t in times}
        for order in (list(reversed(times)), random.Random(7).sample(times, len(times)), random.Random(99).sample(times, len(times))):
            for t in order:
                if json.dumps(state_at(sid, t.isoformat(), sc), sort_keys=True) != ref[t]:
                    G.ok(False, 'scrub inconsistency %s/%s at %s' % (sid, sc, t))
                    break
            else:
                G.ok(True, '')
    # interleaved evaluation across objects and scenarios gives identical answers
    seq = [(sid, sc, t) for sid, sc in jobs[:40] for t in times[:25]]
    a = [json.dumps(state_at(s, t.isoformat(), c), sort_keys=True) for s, c, t in seq]
    random.Random(5).shuffle(seq)
    b = {(s, c, t): json.dumps(state_at(s, t.isoformat(), c), sort_keys=True) for s, c, t in seq}
    for (s, c, t), v in zip([(s, c, t) for sid, sc in jobs[:40] for t in times[:25] for s, c in [(sid, sc)]], a):
        G.ok(b[(s, c, t)] == v, 'interleaved scrub mismatch %s/%s %s' % (s, c, t))
    G.n += 0
    print('    scrub test: %d object/scenario pairs x %d times, forward vs reversed vs 2 shuffles + interleaved' % (len(jobs), len(times)))


def log_defaults():
    d = _data()
    print('PDF-printed defaults (all PENDING OWNER; none chosen here):')
    for l in d['sched']['pdf_defaults_log']:
        print('  %s %-46s %s %s' % (l['id'], l['topic'][:46], ('[CONTRADICTION] ' if l['contradiction'] else ''), ' | '.join('%s: %s' % (p['where'], p['default']) for p in l['printed'])[:230]))


def main(argv):
    if len(argv) >= 3 and argv[1] == '--state':
        sc = argv[argv.index('--scenario') + 1] if '--scenario' in argv else 'default'
        print(json.dumps(state_at(argv[2], argv[3], sc), indent=1))
        return 0
    gates = []
    for name, fn in (('INTEGRITY', check_integrity), ('Q08 no pre-placed works / stage order', check_q08), ('Q07 fence & wall state changes', check_q07),
                     ('Q09 building states', check_q09), ('Q12-analogue scrub consistency', check_scrub)):
        G = Gate(name)
        fn(G)
        gates.append(G.report())
    log_defaults()
    d = _data()
    unparsed = [s['id'] for s in d['structures']['structures'] if s.get('parse_status') != 'parsed'] + [r['id'] for r in d['sched']['rows'] if r['parse_status'] != 'parsed']
    print('rows/records with parse_status != parsed: %s' % (', '.join(unparsed) or 'none'))
    ok = all(gates)
    print('RESULT: ' + ('ALL PASS' if ok else 'FAILURES'))
    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(main(sys.argv))
