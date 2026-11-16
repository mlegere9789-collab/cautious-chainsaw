"""Gate Q03, the structures, the scene and the ground (GATE-SPEC Q03.3 to Q03.5, Q03.7 and the structure corrections of Q03.6). Imported by q03_anachronism.py.

Inputs: the structures records (structures/*.json), the drawn objects (app/data/structures3d.json) and the basemap registry (docs/basemap1863/features, present_1863), and the dump of the node child
q03_scene.mjs, which holds what the application's own code says: the state engine at every integer minute, the structures model built on the real terrain, the later-memorial layer, the artillery train.
Every function writes items through the record; an item whose input is missing is BLOCKED-INPUT with `input missing: ...`, never a pass.
"""
import json
import os
import re

import pq_common as pq

BATTLE_START, BATTLE_END = '1863-06-26T00:00', '1863-07-14T23:59'
HEDGE = re.compile(r'probable|possible|unreviewed|not reviewed|\bmay (be|have)\b|uncertain|1868-69 (survey|plate|sheet)|warren survey|cannot be separated|not dated|modern (osm|mapped)|not read from the sheet|machine detection', re.I)
LATER = re.compile(r'rebuilt|reconstruct|replaced|later building|rebuilt later', re.I)
# classes the plan names as absent in 1863 (p. 136, Q03; B.8.7 p. 102): matched on the structured class fields of a record, never on a name
MODERN_CLASS = re.compile(r'monument|memorial|avenue|tower|signage|\bsign\b|telegraph|\bwire\b|utility pole|visitor|cyclorama|museum|parking|modern (road|fence|lot|building)|asphalt|chain.?link|barbed|later building', re.I)
BURN = re.compile(r'burn|destroy|ruin|\bchar|collaps|razed|torn down', re.I)
CONSTRUCTION = re.compile(r'construct|under construction|stage \d|layout|digging|felling|stacking|bare ground|built on screen|being built', re.I)


def is_construction(state, stage):
    """A construction state: a stage number, or words of building. The state text of a pre-existing feature says "no construction", which is its opposite."""
    t = state or ''
    if stage is not None:
        return True
    if re.search(r'no construction|pre-existing|never built|present at frame one', t, re.I):
        return False
    return CONSTRUCTION.search(t) is not None


KIND_OF_VEHICLE = {'limber': 'limber', 'caisson': 'caisson', 'wagon': 'battery_wagon', 'forge': 'forge'}


def safe(rec, name, fn, *args, **kw):
    """Run one phase of the gate. An exception does not end the run and is never a pass: it becomes a BLOCKED-INPUT item that names it, and the verdict stays INCOMPLETE at best."""
    try:
        return fn(*args, **kw)
    except Exception as e:  # noqa: BLE001
        import traceback
        tb = traceback.format_exc().strip().splitlines()
        rec.item('Q03/phase-error/%s' % name, 'BLOCKED-INPUT', 'input missing: the phase %s could not run to its end (%s: %s)' % (name, type(e).__name__, str(e)[:160]), {'phase': name, 'traceback_tail': tb[-4:]}, check='Q03')
        rec.incomplete('the phase %s raised %s' % (name, type(e).__name__))
        return None


def read_json_opt(path):
    try:
        with open(path, encoding='utf-8') as f:
            return json.load(f)
    except (OSError, ValueError):
        return None


def years_of(text):
    return [int(y) for y in re.findall(r'\b(1[5-9]\d\d)\b', text or '')]


def side_ev(SD, name, rows, inline=12):
    return SD(name, rows, inline=inline)


# ============================================================================================================ inputs
class Inputs:
    def __init__(self, env, rec):
        self.missing = []
        self.structures = self.sched = self.hospitals = self.works = self.d3 = self.train = self.registry = None
        self.by_id = {}
        for attr, rel, role in (('structures', 'structures/structures.json', 'structure records'), ('sched', 'structures/state_schedule.json', 'state schedule'), ('hospitals', 'structures/hospitals.json', 'hospital sites'),
                                ('works', 'structures/works_stages.json', 'works stages'), ('d3', 'app/data/structures3d.json', 'drawn objects'), ('train', 'app/data/artillery-train.json', 'artillery train data')):
            try:
                setattr(self, attr, rec.read_json(env.btp(rel), role))
            except pq.InputMissing as e:
                self.missing.append(str(e))
        if self.structures:
            self.by_id = {s['id']: s for s in self.structures.get('structures', [])}
        # the registry of the basemap: every feature with present_1863
        reg = {}
        base = os.path.join(env.root, 'docs', 'basemap1863', 'features')
        files = ['structures/structures.geojson', 'roads-rail-water/fences.geojson', 'roads-rail-water/roads.geojson', 'roads-rail-water/lanes.geojson', 'roads-rail-water/railways.geojson', 'roads-rail-water/bridges.geojson']
        found = 0
        for rel in files:
            fn = os.path.join(base, *rel.split('/'))
            rec.add_input(fn, 'basemap1863 registry')
            if os.path.isfile(fn):
                try:
                    for ft in json.load(open(fn, encoding='utf-8')).get('features', []):
                        p = ft.get('properties') or {}
                        if 'id' in p:
                            reg[p['id']] = p
                    found += 1
                except (OSError, ValueError):
                    pass
        self.registry = reg if found == len(files) else None
        if self.registry is None:
            self.missing.append('docs/basemap1863/features (the registry with present_1863: %d of %d layers readable)' % (found, len(files)))


# ============================================================================================================ Q03.3 and Q03.4 over the drawn objects
def engine_facts(dump):
    eng = (dump or {}).get('engine')
    return eng if eng else None


def start_basis(o, d3rec, props, srec):
    """(basis text or None, problems). The existence start in July 1863."""
    problems = []
    built = (d3rec or {}).get('built') if d3rec is not None else None
    if built is None and props:
        built = props.get('built')
    note = ' '.join(str(x) for x in ((props or {}).get('period_note'), (props or {}).get('notes'), (d3rec or {}).get('notes') if d3rec else None) if x)
    reps = (d3rec or {}).get('represents') or (props or {}).get('geometry_represents') or ''
    yrs = years_of(built)
    if props is not None and props.get('present_1863') is not True:
        problems.append('the registry row says present_1863 = %r' % props.get('present_1863'))
    if reps.startswith('later building'):
        problems.append('the drawn geometry is a later building (%s)' % reps[:90])
    if built and yrs and yrs[0] > 1863:
        problems.append('built %s: valid_from after the scene date' % built[:70])
    elif built and LATER.search(built):
        problems.append('the build note says the present building is later (%s)' % built[:70])
    basis = None
    if srec is not None and srec.get('preexisting') is True:
        basis = 'record %s: pre-existing (plan B.8.2)' % srec['id']
    elif built and yrs and yrs[0] <= 1863:
        basis = 'built %s' % built[:60]
    elif built and re.search(r'pre-?1863|before 18\d\d', built, re.I):
        basis = 'built %s' % built[:60]
    if basis is None:
        if props is None:
            problems.append('no registry row and no record: nothing states that it stood in July 1863')
        elif HEDGE.search(note):
            m = HEDGE.search(note)
            problems.append('existence in July 1863 is not established (%s)' % note[max(0, m.start() - 40):m.end() + 70].replace('\n', ' ').strip())
        elif re.search(r'1863|july|june', note, re.I):
            basis = 'the registry note states it for 1863: %s' % note[:80]
        else:
            problems.append('no statement that it stood in July 1863 (no build date, no record, a note without a date)')
    return basis, problems


def judge_drawn_object(o, d3rec, props, srec, eng):
    """The four conditions of Q03.3 for one object the scene draws."""
    sid = o.get('state_id') or o.get('rec')
    basis, probs = start_basis(o, d3rec, props, srec)
    status = (d3rec or {}).get('status') or (props or {}).get('status')
    rows = (eng.get('rows') or {}).get(sid) if (eng and sid) else None
    known = (eng.get('known') or {}).get(sid) if (eng and sid) else None
    asked = (eng.get('asked_known') or {}).get(sid) if (eng and sid) else None
    res = {'registry': props is not None and props.get('present_1863') is True, 'start': basis is not None and not probs, 'end': True, 'schedule': False}
    reasons = []
    if probs:
        reasons += probs
    end_note = None
    if status == 'destroyed_1863':
        if not rows:
            res['end'] = False
            reasons.append('destroyed in 1863 but no row of the state schedule dates it')
        else:
            end_note = 'destroyed in 1863: schedule rows %s' % ','.join(rows[:3])
    if o.get('dropped'):
        reasons.append('the model dropped the object (no geometry on the loaded ground)')
    if str(status or '').startswith('not_drawn') and not o.get('dropped'):
        reasons.append('the record says it is not drawn (status %s) but the scene draws it' % status)
    if not sid:
        reasons.append('no state schedule: the object is linked to no structures.json record')
    elif not (known or asked):
        reasons.append('no state schedule: the state engine does not know %s' % sid)
    elif not rows:
        reasons.append('no state schedule: no schedule row names %s (the engine answers "no scheduled state, initial state unspecified in B.8.7")' % sid)
    else:
        res['schedule'] = True
    ok = res['registry'] and res['start'] and res['end'] and res['schedule'] and not o.get('dropped') and not probs and not str(status or '').startswith('not_drawn')
    return ok, reasons, {'basis': basis, 'built': (d3rec or {}).get('built'), 'status': status, 'represents': (d3rec or {}).get('represents') or (props or {}).get('geometry_represents'), 'record': (o.get('rec') or None), 'state_id': o.get('state_id'),
                         'schedule_rows': rows, 'registry_present_1863': None if props is None else props.get('present_1863'), 'checks': res, 'end_note': end_note, 'tier': o.get('tier')}


def q033_objects(env, rec, inp, dump, R, SD):
    mdl = (dump or {}).get('model')
    eng = engine_facts(dump)
    if inp.d3 is None or inp.registry is None or not mdl or not eng:
        why = [m for m in inp.missing if 'structures3d' in m or 'basemap' in m]
        if not mdl:
            why.append('the node child did not build the structures model (%s)' % ((dump or {}).get('errors') or ['no scene dump'])[0][:160])
        if not eng:
            why.append('the node child did not load the state engine')
        rec.item('Q03/Q03.3/objects', 'BLOCKED-INPUT', 'input missing: %s' % '; '.join(why)[:300], {'missing': why}, check='Q03.3', sub_requirements=R.struct())
        return None
    d3 = {k: {r['id']: r for r in inp.d3.get(k, [])} for k in ('buildings', 'points', 'fences', 'roads')}
    out = {}
    for o in mdl['objects']:
        cls = o['cls']
        if cls == 'works':
            continue
        pool = {'buildings': 'buildings', 'masses': 'buildings', 'markers': 'points', 'fences': 'fences', 'roads': 'roads'}[cls]
        d3rec = d3[pool].get(o['id'])
        props = inp.registry.get(o['id'])
        srec = inp.by_id.get((o.get('rec') or '').split('#')[0]) if o.get('rec') else None
        if cls in ('fences', 'roads') and d3rec is not None and not srec:
            srec = None
        ok, reasons, ev = judge_drawn_object(o, d3rec, props, srec, eng)
        ev.update({'class': cls, 'name': (o.get('name') or '')[:90]})
        iid = 'Q03/Q03.3/object/%s' % o['id']
        sub = R.struct((o.get('rec') or '').split('#')[0] if o.get('rec') else None)
        if ok:
            rec.item(iid, 'PASS', '%s stood in July 1863 (%s), its registry row says present_1863, its end falls outside the window or is scheduled, and the state engine holds a schedule for it (%s)' % (o['id'], ev['basis'], ','.join((ev['schedule_rows'] or [])[:3])), ev, check='Q03.3', subjects=[o['id']], sub_requirements=sub)
        else:
            rec.item(iid, 'FAIL', ('; '.join(reasons))[:480], ev, check='Q03.3', subjects=[o['id']], sub_requirements=sub)
        out[o['id']] = (ok, reasons, ev, o)
    return out


def q033_out_of_window(env, rec, inp, dump, R):
    """The rows that lie outside the window (S-078, S-079: the McPherson house burned in 1895, the Codori barn came down in 1882, the Rose barn burned in 1910): at every minute of both windows, in every scenario, the
    object stands and is in none of the later states (GATE-SPEC 3.2: "the item is a negative check")."""
    eng = engine_facts(dump)
    rows = [r for r in ((inp.sched or {}).get('rows') or []) if r.get('out_of_battle_scope')]
    if inp.sched is None or not rows:
        rec.item('Q03/Q03.3/stands-throughout', 'BLOCKED-INPUT', 'input missing: no row of state_schedule.json lies outside the battle window (S-078 and S-079 are named by the gate text)', {}, check='Q03.3', sub_requirements=R.struct())
        return
    for r in rows:
        later = [t.strip().lower() for t in (r.get('to_state') or '').split(';') if t.strip()]
        for oid in r['object_ids']:
            iid = 'Q03/Q03.3/stands-throughout/%s/%s' % (r['id'], oid)
            sub = R.struct(oid.split('#')[0])
            if not eng:
                rec.item(iid, 'BLOCKED-INPUT', 'input missing: the state engine of the node child', {}, check='Q03.3', subjects=[oid], sub_requirements=sub)
                continue
            ser = (eng.get('series') or {}).get(oid)
            ev = {'row': r['id'], 'later_state': r.get('to_state'), 'time_printed': (r.get('time') or {}).get('printed'), 'scenarios': sorted((ser or {}).keys())}
            bad = []
            if not ser:
                bad.append('the engine has no series for %s' % oid)
            for sc, runs in sorted((ser or {}).items()):
                for run_ in runs:
                    st = (run_.get('state') or '').lower()
                    if run_.get('present') is False:
                        bad.append('scenario %s: absent at %s (%s)' % (sc, run_['iso'], st[:40]))
                        break
                    if any(t and t in st for t in later) or BURN.search(st) or re.search(r'\b(1882|1895|1910)\b', st):
                        bad.append('scenario %s: in a later state at %s (%s)' % (sc, run_['iso'], st[:50]))
                        break
            if bad:
                rec.item(iid, 'FAIL', '%s must stand throughout the window (row %s is out of the battle scope): %s' % (oid, r['id'], '; '.join(bad[:2]))[:380], dict(ev, problems=bad[:4]), check='Q03.3', subjects=[oid], sub_requirements=sub)
            else:
                rec.item(iid, 'PASS', '%s stands at every minute of both windows in every scenario (%d): the later state "%s" (%s) is never reached' % (oid, len(ser), r.get('to_state'), r['id']), ev, check='Q03.3', subjects=[oid], sub_requirements=sub)


def q033_works(env, rec, inp, dump, R):
    """The works the scene draws at a named place (cls works): a pre-existing wall or fence exists from before the window (its record says so); a work built on screen needs a documented beginning."""
    mdl = (dump or {}).get('model')
    eng = engine_facts(dump)
    objs = [o for o in (mdl or {}).get('objects', []) if o.get('cls') == 'works']
    if not mdl or not eng or inp.works is None or inp.structures is None:
        rec.item('Q03/Q03.3/works', 'BLOCKED-INPUT', 'input missing: %s' % ('the structures model of the node child' if not mdl else 'the state engine of the node child' if not eng else 'structures/works_stages.json or structures.json'), {}, check='Q03.3', sub_requirements=R.struct())
        return
    wk = inp.works.get('works') or {}
    for o in sorted(objs, key=lambda x: x['id']):
        wid = o.get('state_id') or o['id']
        srec = inp.by_id.get(wid.split('#')[0])
        w = wk.get(wid) or {}
        pre = (o.get('meta') or {}).get('pre_existing') is True
        begin = w.get('begin') or {}
        reasons, ev = [], {'work': wid, 'pre_existing': pre, 'construction_applies': w.get('construction_applies'), 'begin': {k: begin.get(k) for k in ('earliest', 'default', 'latest', 'date', 'gran') if begin.get(k)}, 'record_preexisting': (srec or {}).get('preexisting')}
        if pre:
            if not (srec and srec.get('preexisting') is True):
                reasons.append('drawn as a pre-existing feature but its record does not say pre-existing')
        elif not any(begin.get(k) for k in ('earliest', 'default', 'date', 'latest')):
            reasons.append('a work built on screen with no documented beginning (no earliest, default, latest or date): no existence interval')
        if not (eng.get('known') or {}).get(wid) and not (eng.get('asked_known') or {}).get(wid) and wid.split('#')[0] not in (eng.get('known') or {}):
            reasons.append('the state engine does not know %s: no state schedule' % wid)
        iid = 'Q03/Q03.3/work/%s' % o['id']
        sub = R.struct(wid.split('#')[0])
        if reasons:
            rec.item(iid, 'FAIL', '; '.join(reasons)[:380], ev, check='Q03.3', subjects=[o['id']], sub_requirements=sub)
        else:
            rec.item(iid, 'PASS', '%s %s and the state engine holds its schedule' % (wid, 'is a pre-existing feature whose record says so' if pre else 'has a documented beginning (%s)' % ', '.join('%s %s' % (k, v) for k, v in ev['begin'].items() if k != 'gran')[:80]), ev, check='Q03.3', subjects=[o['id']], sub_requirements=sub)


def q033_records(env, rec, inp, dump, R):
    """The structure records the routing table of GATE-SPEC 3.2 sends to Q03.3: bld-, H-, RD- and FEN- (P- are Q03.5)."""
    if inp.structures is None or inp.sched is None:
        rec.item('Q03/Q03.3/records', 'BLOCKED-INPUT', 'input missing: %s' % '; '.join(inp.missing)[:240], {'missing': inp.missing}, check='Q03.3', sub_requirements=R.struct())
        return
    eng = engine_facts(dump) or {}
    rows = eng.get('rows') or {}
    mdl = (dump or {}).get('model') or {}
    drawn_ids = {o['rec'].split('#')[0] for o in mdl.get('objects', []) if o.get('rec')} | {o['state_id'].split('#')[0] for o in mdl.get('objects', []) if o.get('state_id')}
    undrawn = {x['id']: x.get('reason') for x in (inp.d3 or {}).get('notDrawn', [])}
    for s in inp.structures['structures']:
        sid = s['id']
        pre = sid.split('-')[0]
        if pre not in ('bld', 'RD', 'FEN'):
            continue
        iid = 'Q03/Q03.3/record/%s' % sid
        sub = R.struct(sid)
        reasons = []
        ev = {'kind': s.get('kind'), 'preexisting': s.get('preexisting'), 'drawn': sid in drawn_ids, 'not_drawn_reason': undrawn.get(sid)}
        if s.get('kind') == 'avenue_not_in_1863':
            ok = s.get('exists_in_1863') is False and s.get('never_place') is True
            ev.update(exists_in_1863=s.get('exists_in_1863'), never_place=s.get('never_place'))
            if ok:
                rec.item(iid, 'PASS', '%s is the record of what did not exist in 1863 and is never placed (exists_in_1863 false, never_place true)' % sid, ev, check='Q03.3', subjects=[sid], sub_requirements=sub)
            else:
                rec.item(iid, 'FAIL', '%s must say exists_in_1863 false and never_place true' % sid, ev, check='Q03.3', subjects=[sid], sub_requirements=sub)
            continue
        # existence start
        desc = ' '.join(str(s.get(k) or '') for k in ('description', 'role_in_battle'))
        yrs = [y for y in years_of(desc) if re.search(r'built\s+(c\.\s*)?%d|%d\s*\(?built|designed %d, built' % (y, y, y), desc)]
        if pre == 'RD':
            start_ok = s.get('exists_in_1863') is True or s.get('preexisting') is True
            ev['exists_in_1863'] = s.get('exists_in_1863')
        else:
            start_ok = s.get('preexisting') is True
        if not start_ok:
            reasons.append('the record does not say the structure existed before the battle (preexisting %r)' % s.get('preexisting'))
        if yrs and min(yrs) > 1863:
            start_ok = False
            reasons.append('the description gives a build year %d after 1863' % min(yrs))
        ev['build_years_in_description'] = yrs
        # existence end: a loss inside the window needs a schedule row
        surv = s.get('what_survives') or ''
        lost_in_1863 = re.search(r'(burned|destroyed|razed)[^.;]{0,30}\b1863\b', surv + ' ' + desc, re.I) is not None
        part_ids = [p['id'] for p in s.get('parts', [])]
        row_ids = sorted({r for i in [sid] + part_ids for r in (rows.get(i) or [])} | set(s.get('schedule_rows') or []))
        ev.update(schedule_rows=row_ids, what_survives=surv[:100])
        if lost_in_1863 and not row_ids:
            reasons.append('lost in 1863 but no schedule row dates it')
        if not row_ids:
            reasons.append('no state schedule: no row of state_schedule.json names it or its parts (the plan prints no scheduled state)')
        if reasons:
            rec.item(iid, 'FAIL', '; '.join(reasons)[:420], ev, check='Q03.3', subjects=[sid], sub_requirements=sub)
        else:
            rec.item(iid, 'PASS', '%s existed before the battle, its loss (if any) is scheduled, and it has schedule rows %s' % (sid, ','.join(row_ids[:4])), ev, check='Q03.3', subjects=[sid], sub_requirements=sub)
    # the hospital sites
    for h in (inp.hospitals or {}).get('hospitals', []):
        hid = h['id']
        iid = 'Q03/Q03.3/record/%s' % hid
        sw = ((h.get('setup_window') or {}).get('window')) or None
        cw = ((h.get('closing_window') or {}).get('window')) or None
        reasons = []
        if not sw or not (sw[0] or sw[1]):
            reasons.append('no setup window: the interval in which the site is in use has no start')
        if not cw or not (cw[0] or cw[1]):
            reasons.append('no closing window: the interval in which the site is in use has no end')
        if sw and cw:
            a, b = (sw[1] or sw[0]), (cw[0] or cw[1])
            if a and b and a > b:
                reasons.append('the closing window (%s) begins before the setup window ends (%s)' % (b, a))
        ev = {'setup_window': sw, 'closing_window': cw, 'host': h.get('host')}
        if reasons:
            rec.item(iid, 'FAIL', '; '.join(reasons)[:380], ev, check='Q03.3', subjects=[hid], sub_requirements=R.struct(hid))
        else:
            rec.item(iid, 'PASS', 'the hospital site has a use interval: set up %s, closing %s, in order' % (sw[0] or sw[1], cw[0] or cw[1]), ev, check='Q03.3', subjects=[hid], sub_requirements=R.struct(hid))


def q034_registry(env, rec, inp, dump, R, SD, objs):
    """(a) the object registry: any object whose valid_from is after the scene date, any object of a class absent in 1863."""
    mdl = (dump or {}).get('model')
    if not mdl or inp.d3 is None or inp.registry is None:
        why = list(inp.missing) + ([] if mdl else ['the structures model of the node child'])
        rec.item('Q03/Q03.4/registry', 'BLOCKED-INPUT', 'input missing: %s' % '; '.join(why)[:300], {'missing': why}, check='Q03.4', sub_requirements=R.struct())
        return
    d3 = {k: {r['id']: r for r in inp.d3.get(k, [])} for k in ('buildings', 'points', 'fences', 'roads')}
    pool_of = {'buildings': 'buildings', 'masses': 'buildings', 'markers': 'points', 'fences': 'fences', 'roads': 'roads'}
    classes = {}
    for o in mdl['objects']:
        if o['cls'] == 'works':
            continue
        r = d3[pool_of[o['cls']]].get(o['id'])
        props = inp.registry.get(o['id']) or {}
        bad = []
        built = (r or {}).get('built') or props.get('built')
        yrs = years_of(built)
        if props.get('present_1863') is not True:
            bad.append('registry present_1863 = %r' % props.get('present_1863'))
        if built and yrs and yrs[0] > 1863:
            bad.append('valid_from %d (built %s)' % (yrs[0], built[:50]))
        reps = (r or {}).get('represents') or props.get('geometry_represents') or ''
        if reps.startswith('later building'):
            bad.append('represents a later building: %s' % reps[:70])
        for fld in ('subtype', 'kind', 'category'):
            v = (r or {}).get(fld) or props.get(fld)
            if v and MODERN_CLASS.search(str(v)):
                bad.append('class %s = %s is absent in 1863' % (fld, v))
        if props.get('valid_from') and str(props['valid_from']) > '1863-06-26':
            bad.append('valid_from %s' % props['valid_from'])
        d = classes.setdefault(o['cls'], {'n': 0, 'bad': []})
        d['n'] += 1
        if bad:
            d['bad'].append({'id': o['id'], 'why': '; '.join(bad)})
    name_suspects = sorted(o['id'] + ': ' + (o.get('name') or '')[:60] for o in mdl['objects'] if o['cls'] != 'works' and re.search(r'avenue|monument|memorial|tower|museum|visitor', o.get('name') or '', re.I))
    for cls, d in sorted(classes.items()):
        ev = {'class': cls, 'objects': d['n'], 'failing': len(d['bad']), 'members': SD('q034_%s' % cls, d['bad'], inline=12), 'names_that_contain_a_modern_word_not_judged': name_suspects[:10],
              'name_rule': 'a name is not a class: "89 Steinwehr Avenue" is an address of an 1863 house'}
        if d['bad']:
            rec.item('Q03/Q03.4/registry/%s' % cls, 'FAIL', '%d of %d %s objects the scene draws are post-1863 or of a class absent in 1863 (first: %s: %s)' % (len(d['bad']), d['n'], cls, d['bad'][0]['id'], d['bad'][0]['why'][:150]), ev, check='Q03.4', sub_requirements=R.struct())
        else:
            rec.item('Q03/Q03.4/registry/%s' % cls, 'PASS', 'none of the %d %s objects the scene draws has a valid_from after the scene date or a class absent in 1863' % (d['n'], cls), ev, check='Q03.4', sub_requirements=R.struct())


def q034_avenues(env, rec, inp, dump, R):
    """The global assertion of p. 102 (B.8.7): no avenue exists before the park era."""
    eng = engine_facts(dump)
    srec = inp.by_id.get('RD-avenues')
    if srec is None or not eng:
        rec.item('Q03/Q03.4/avenues', 'BLOCKED-INPUT', 'input missing: %s' % ('the RD-avenues record of structures/structures.json' if srec is None else 'the state engine of the node child'), {}, check='Q03.4', sub_requirements=R.struct())
        return
    ser = (eng.get('series') or {}).get('RD-avenues')
    mdl = (dump or {}).get('model') or {}
    avenue_roads = sorted(o['id'] + ': ' + (o.get('name') or '')[:60] for o in mdl.get('objects', []) if o['cls'] == 'roads' and re.search(r'\bavenue\b|\bave\.?\b', o.get('name') or '', re.I) and not re.search(r'Steinwehr|Buford|Baltimore', o.get('name') or ''))
    present_runs = [r for sc in (ser or {}).values() for r in sc if r.get('present') is not False or r.get('state') != 'does_not_exist_in_1863']
    ev = {'record': {'exists_in_1863': srec.get('exists_in_1863'), 'never_place': srec.get('never_place')}, 'engine_series_scenarios': sorted((ser or {}).keys()), 'engine_runs_not_absent': present_runs[:3], 'drawn_roads_named_avenue': avenue_roads}
    bad = []
    if srec.get('exists_in_1863') is not False or srec.get('never_place') is not True:
        bad.append('the record must say exists_in_1863 false and never_place true')
    if not ser:
        bad.append('the engine has no series for RD-avenues')
    if present_runs:
        bad.append('the engine places an avenue at %s' % present_runs[0].get('iso'))
    if avenue_roads:
        bad.append('a drawn road is an avenue: %s' % avenue_roads[0])
    if bad:
        rec.item('Q03/Q03.4/avenues', 'FAIL', '; '.join(bad)[:300], ev, check='Q03.4', sub_requirements=R.struct())
    else:
        rec.item('Q03/Q03.4/avenues', 'PASS', 'no avenue exists before the park era: the record never places it, the engine answers does_not_exist_in_1863 at every minute of both windows in every scenario, and no drawn road is an avenue', ev, check='Q03.4', sub_requirements=R.struct())


def q034_memorials(env, rec, dump, R):
    ext = (dump or {}).get('ext')
    if not ext:
        rec.item('Q03/Q03.4/memorial-layer', 'BLOCKED-INPUT', 'input missing: the later-memorial layer (src/ext/site-places.mjs) could not be read by the node child (%s)' % ((dump or {}).get('errors') or ['no scene dump'])[-1][:140], {}, check='Q03.4', sub_requirements=R.struct())
        return
    lay, mem, tour = ext.get('layer') or {}, ext.get('memorials') or {}, ext.get('tour') or {}
    bad = []
    if lay.get('defaultOn') is not False:
        bad.append('the layer is not off by default')
    if lay.get('inScene') is not False:
        bad.append('the layer is declared part of the scene')
    if ext.get('scene_objects_nonempty'):
        bad.append('the layer adds scene objects at %s (%d minutes listed)' % (ext['scene_objects_nonempty'][0]['iso'], len(ext['scene_objects_nonempty'])))
    if not mem.get('ok'):
        bad.append('checkLaterMemorials: %s' % '; '.join(mem.get('problems') or ['not ok'])[:160])
    if not tour.get('ok'):
        bad.append('checkTourBookmarks: %s' % '; '.join(tour.get('problems') or ['not ok'])[:120])
    ev = {'layer': lay, 'minutes_checked': ext.get('minutes_checked'), 'scene_objects_nonempty': ext.get('scene_objects_nonempty'), 'memorial_facts': mem.get('facts'), 'tour_facts': tour.get('facts')}
    if bad:
        rec.item('Q03/Q03.4/memorial-layer', 'FAIL', '; '.join(bad)[:380], ev, check='Q03.4', sub_requirements=R.struct())
    else:
        rec.item('Q03/Q03.4/memorial-layer', 'PASS', 'the 512 later memorials and the tour stops are off at entry, never part of the scene (no scene object at any of %s minutes of both windows), marked "later memorial" when shown' % ext.get('minutes_checked'), ev, check='Q03.4', sub_requirements=R.struct())


def q034_ground(env, rec, R):
    """(b) the ground audit, and the product's own statement about its ground."""
    cfg_fn = os.path.join(env.bt, 'app', 'src', 'config.mjs')
    rec.add_input(cfg_fn, 'the product\'s statement of its ground')
    note = None
    if os.path.isfile(cfg_fn):
        m = re.search(r"GROUND_NOTE\s*=\s*'((?:[^'\\]|\\.)*)'", open(cfg_fn, encoding='utf-8').read())
        note = m.group(1) if m else None
    terr_fn = os.path.join(env.bt, 'render', 'prototype', 'data', 'terrain.json')
    layers = [os.path.join(env.bt, 'render', 'prototype', 'data', n) for n in ('aerial.jpg', 'height.bin', 'terrain.json')]
    for fn in layers:
        rec.add_input(fn, 'ground layer the page loads')
    if note is None:
        rec.item('Q03/Q03.4/ground-disclosure', 'BLOCKED-INPUT', 'input missing: GROUND_NOTE in app/src/config.mjs (the product\'s statement of what its ground is)', {}, check='Q03.4', sub_requirements=R.struct())
    elif re.search(r'modern (landscape|ground|terrain|aerial)|not the 1863 landscape', note, re.I):
        rec.item('Q03/Q03.4/ground-disclosure', 'FAIL', 'the product states that its ground is not the 1863 ground: "%s". A disclosure is not a pass (A-33, X-11): the aerial and terrain layers must be audited and corrected' % note[:140],
                 {'ground_note': note, 'layers': [env.rel(f) for f in layers if os.path.isfile(f)]}, check='Q03.4', sub_requirements=R.struct())
    else:
        rec.item('Q03/Q03.4/ground-disclosure', 'PASS', 'the product does not describe its ground as the modern landscape', {'ground_note': note}, check='Q03.4', sub_requirements=R.struct())
    audit_fn = os.path.join(env.gov, 'ground_audit', 'audit.json')
    rec.add_input(audit_fn, 'ground audit')
    iid = 'Q03/Q03.4/ground-audit'
    if not os.path.isfile(audit_fn):
        rec.item(iid, 'BLOCKED-INPUT', 'input missing: docs/battle-theatre/GOVERNANCE/ground_audit/audit.json (the classification of the terrain and aerial layers and the record of every modern feature removed, painted out or replaced by the 1863 reconstruction layer, G.3 p. 134); '
                 'the contract is in GOVERNANCE/horde/requests/bt-gates-q03-ground-audit-contract.md', {'missing': env.rel(audit_fn), 'layers_the_page_loads': [env.rel(f) for f in layers if os.path.isfile(f)]}, check='Q03.4', sub_requirements=R.struct())
        rec.owe('Q03.4(b): the ground audit (GOVERNANCE/ground_audit/audit.json) from the terrain work: the layers the page loads classified, every modern feature removed, painted out or replaced with a recorded correction; until it exists Q03 cannot pass')
        return
    try:
        audit = json.load(open(audit_fn, encoding='utf-8'))
    except (OSError, ValueError) as e:
        rec.item(iid, 'BLOCKED-INPUT', 'input missing: ground_audit/audit.json is not readable JSON (%s)' % str(e)[:100], {}, check='Q03.4', sub_requirements=R.struct())
        return
    bad = []
    if audit.get('schema') != 'bt-ground-audit/1':
        bad.append('schema is not bt-ground-audit/1')
    lays = audit.get('layers') or []
    if not lays:
        bad.append('the audit lists no layer')
    corrected = {}
    n_feat = 0
    for L in lays:
        cid = L.get('id', '?')
        if L.get('classified') is not True:
            bad.append('layer %s is not classified' % cid)
        feats = L.get('modern_features') or []
        n_feat += len(feats)
        if not feats:
            bad.append('layer %s lists no modern feature (a 2022 aerial and a modern terrain are not free of them: the classification must name what it found)' % cid)
        for f in feats:
            if f.get('action') not in ('removed', 'painted_out', 'replaced') or pq.is_placeholder(f.get('correction_record')):
                bad.append('layer %s feature %s has action %r and correction record %r' % (cid, f.get('id'), f.get('action'), f.get('correction_record')))
                break
        if (L.get('unhandled_modern_features') or 0) != 0:
            bad.append('layer %s has %s unhandled modern features' % (cid, L.get('unhandled_modern_features')))
        c, s = L.get('corrected') or {}, L.get('source') or {}
        if c.get('sha256'):
            corrected[c['sha256']] = cid
        if feats and c.get('sha256') and c.get('sha256') == s.get('sha256'):
            bad.append('layer %s: the corrected layer is the source layer (nothing was removed)' % cid)
    for fn in layers[:2]:
        if os.path.isfile(fn) and pq.sha256_file(fn) not in corrected:
            bad.append('the page loads %s, which is not a corrected layer of the audit (sha256 differs from every corrected.sha256)' % env.rel(fn))
    ev = {'layers': [L.get('id') for L in lays], 'modern_features': n_feat, 'page_loads': {env.rel(f): pq.sha256_file(f) for f in layers if os.path.isfile(f)}}
    if bad:
        rec.item(iid, 'FAIL', '; '.join(bad)[:420], ev, check='Q03.4', sub_requirements=R.struct())
    else:
        rec.item(iid, 'PASS', 'the %d ground layers the page loads are classified, %d modern features are removed, painted out or replaced with a recorded correction, none is unhandled, and the page loads the corrected layers' % (len(lays), n_feat), ev, check='Q03.4', sub_requirements=R.struct())


# ============================================================================================================ Q03.5
def q035(env, rec, inp, dump, R):
    eng = engine_facts(dump)
    w3 = (dump or {}).get('works3d')
    pre_ids = sorted(s['id'] for s in (inp.structures or {}).get('structures', []) if re.match(r'^P-\d\d$', s['id']))
    if inp.structures is None or not eng:
        rec.item('Q03/Q03.5/pre-existing', 'BLOCKED-INPUT', 'input missing: %s' % ('structures/structures.json' if inp.structures is None else 'the state engine of the node child'), {}, check='Q03.5', sub_requirements=R.struct())
        return
    if not pre_ids:
        rec.item('Q03/Q03.5/pre-existing', 'BLOCKED-INPUT', 'input missing: structures.json has no pre-existing wall or fence record (empty domain, U-03)', {}, check='Q03.5', sub_requirements=R.struct())
        return
    pre_draw = {p['id']: p for p in (w3 or {}).get('preexisting', [])}
    work_ids = {w['id'] for w in (w3 or {}).get('works', [])}
    for pid in pre_ids:
        s = inp.by_id[pid]
        ser = (eng.get('series') or {}).get(pid) or {}
        bad = []
        ev = {'record': {'preexisting': s.get('preexisting'), 'construction': s.get('construction'), 'construction_animation_allowed': s.get('construction_animation_allowed')}, 'scenarios': sorted(ser.keys()),
              'drawn_as_pre_existing': pid in pre_draw if w3 else None, 'drawn_as_a_work': pid in work_ids if w3 else None}
        if s.get('preexisting') is not True:
            bad.append('the record does not say pre-existing')
        if s.get('construction') not in (None, {}, []) or s.get('construction_animation_allowed') is True:
            bad.append('the record allows a construction (%r, animation allowed %r)' % (s.get('construction'), s.get('construction_animation_allowed')))
        if not ser:
            bad.append('the engine has no series for it')
        for sc, runs in sorted(ser.items()):
            first = runs[0] if runs else None
            if not first or first.get('present') is not True:
                bad.append('scenario %s: not present at the first minute (%s)' % (sc, (first or {}).get('iso')))
            for r in runs:
                if r.get('present') is False or is_construction(r.get('state'), r.get('stage')):
                    bad.append('scenario %s: a construction or absent state at %s (%s)' % (sc, r.get('iso'), (r.get('state') or '')[:50]))
                    break
        if w3 is not None:
            d = pre_draw.get(pid)
            if d is None and s.get('kind') == 'preexisting_wall_or_fence':
                bad.append('the draw list of pre-existing features does not hold it')
            elif d is not None and (d.get('present') is not True or d.get('construction') is not False or d.get('progress') != 1):
                bad.append('the draw list gives it present %r, construction %r, progress %r' % (d.get('present'), d.get('construction'), d.get('progress')))
            if pid in work_ids or pid in (w3.get('pre_ids_in_works') or []):
                bad.append('it is in the list of works that are built on screen')
        sub = [r for r in ('R13.%s' % pid, 'R13.0000') if r in R.have]
        if w3 is None:
            bad_missing = 'the draw lists of src/structures/works3d.mjs (the history layer was not built by the node child)'
            if bad:
                rec.item('Q03/Q03.5/%s' % pid, 'FAIL', '; '.join(bad)[:380], ev, check='Q03.5', subjects=[pid], sub_requirements=sub)
            else:
                rec.item('Q03/Q03.5/%s' % pid, 'BLOCKED-INPUT', 'input missing: ' + bad_missing + '; the engine and the record are clean', ev, check='Q03.5', subjects=[pid], sub_requirements=sub)
        elif bad:
            rec.item('Q03/Q03.5/%s' % pid, 'FAIL', '; '.join(bad)[:380], ev, check='Q03.5', subjects=[pid], sub_requirements=sub)
        else:
            rec.item('Q03/Q03.5/%s' % pid, 'PASS', '%s is present at the first minute with no construction state in every scenario (%d), in the engine and in the draw list of pre-existing features, and is not among the works built on screen' % (pid, len(ser)), ev, check='Q03.5', subjects=[pid], sub_requirements=sub)


# ============================================================================================================ Q03.7
def q037(env, rec, inp, dump, R):
    tr = (dump or {}).get('train')
    iid_na = 'Q03/Q03.7/ambulances-and-supply-wagons'
    if not tr:
        rec.item('Q03/Q03.7/vehicles', 'BLOCKED-INPUT', 'input missing: the artillery train draw lists (the history layer was not built by the node child: %s)' % ((dump or {}).get('errors') or ['--no-layer or no scene dump'])[-1][:140], {}, check='Q03.7', sub_requirements=R.struct())
        return
    kinds_drawn = set(k for per in tr.get('by_army', {}).values() for k in per)
    vehicles = ((inp.train or {}).get('vehicles')) or {}
    kit_rows = {}
    try:
        w = json.load(open(env.btp('kit/weapons.json'), encoding='utf-8'))
        for r in (w.get('artillery') or {}).get('teams_and_vehicles', []):
            kit_rows[r['id']] = r
    except (OSError, ValueError):
        pass
    for army in ('union', 'confederate'):
        per = tr.get('by_army', {}).get(army, {})
        for kind, rec_key in KIND_OF_VEHICLE.items():
            iid = 'Q03/Q03.7/%s/%s' % (kind, army)
            n = per.get(kind, 0)
            if not n:
                rec.item(iid, 'BLOCKED-INPUT', 'input missing: the scene draws no %s for the %s army at the times read (empty domain, U-03)' % (kind, army), {'times': tr.get('times')}, check='Q03.7', sub_requirements=R.struct())
                continue
            v = vehicles.get(rec_key) or {}
            vf, vt = v.get('valid_from'), v.get('valid_to')
            armies = v.get('army') or v.get('armies')
            ev = {'drawn_max': n, 'type_record': 'app/data/artillery-train.json vehicles.%s' % rec_key, 'valid_from': vf, 'valid_to': vt, 'army': armies, 'tier': v.get('tier'), 'basis': (v.get('basis') or '')[:140]}
            bad = []
            if not v:
                bad.append('no type record for %s in artillery-train.json' % rec_key)
            else:
                if not vf or not vt:
                    bad.append('the type record carries no valid_from and valid_to (K.9)')
                else:
                    if str(vf)[:10] > '1863-06-26':
                        bad.append('valid_from %s is after the first scene day' % vf)
                    if str(vt)[:10] < '1863-07-14' and str(vt).lower() not in ('open', 'none'):
                        bad.append('valid_to %s is before the last battle day' % vt)
                if not armies:
                    bad.append('the type record does not say which army used it')
                elif army not in ([armies] if isinstance(armies, str) else armies) and 'both' not in ([armies] if isinstance(armies, str) else armies):
                    bad.append('the type record names %s, not the %s army' % (armies, army))
            if bad:
                rec.item(iid, 'FAIL', 'the %s drawn for the %s army (%d at most) is not shown valid for 1863 and for the army: %s' % (kind, army, n, '; '.join(bad)[:260]), ev, check='Q03.7', sub_requirements=R.struct())
            else:
                rec.item(iid, 'PASS', 'the %s of the %s army is a type valid from %s to %s' % (kind, army, vf, vt), ev, check='Q03.7', sub_requirements=R.struct())
    rec.item(iid_na, 'N/A', 'the artillery train draws %s: no ambulance and no supply wagon is an entity of the scene, so none can be anachronistic (their presence is a requirement of the hospital and casualty gates, not of this one)' % ', '.join(sorted(kinds_drawn)),
             {'kinds_drawn': sorted(kinds_drawn)}, check='Q03.7', sub_requirements=R.struct())


# ============================================================================================================ the structure corrections of Q03.6
def _ref_state(V, sid, iso, sc):
    try:
        return V.CS.state_at(sid, iso, sc)
    except Exception as e:  # noqa: BLE001
        return {'error': '%s: %s' % (type(e).__name__, str(e)[:80])}


def regression_structures(env, rec, dump, V, item, CASE):
    eng = engine_facts(dump)
    sched = read_json_opt(env.btp('structures/state_schedule.json')) or {}
    rows = {r['id']: r for r in sched.get('rows', [])}
    structures = read_json_opt(env.btp('structures/structures.json')) or {}
    by_id = {s['id']: s for s in structures.get('structures', [])}

    def need(case, subjects):
        if not eng:
            item(case, False, '', '', {}, subjects, blocked='the state engine of the node child (%s)' % ((dump or {}).get('errors') or ['no scene dump'])[0][:120])
            return False
        return True

    # ---- 4. the McPherson barn does not burn on 1 July or at any time in the battle (the house burned in 1895 and stands throughout)
    if need('mcpherson-barn-not-burned-1-july', ['bld-mcpherson-farm']):
        ids = [i for i in ('bld-mcpherson-farm', 'bld-mcpherson-farm#house', 'bld-mcpherson-farm#barn') if i in (eng.get('series') or {})]
        bad, seen, mismatch = [], 0, []
        for i in ids:
            for sc, runs in (eng['series'][i] or {}).items():
                for r in runs:
                    seen += 1
                    if BURN.search(r.get('state') or ''):
                        bad.append('%s (%s) at %s: %s' % (i, sc, r['iso'], (r['state'] or '')[:40]))
                    ref = _ref_state(V, i, r['iso'], sc) if V.CS is not None else None
                    if ref is not None and 'error' not in ref and ref.get('state') != r.get('state') and r.get('s') == 0:
                        mismatch.append('%s (%s) %s: app %r, reference %r' % (i, sc, r['iso'], (r.get('state') or '')[:30], (ref.get('state') or '')[:30]))
        ev = {'objects': ids, 'runs_read': seen, 'burned_states': bad[:6], 'engine_differs_from_reference': mismatch[:4], 'schedule_rows': {i: (eng.get('rows') or {}).get(i) for i in ids}, 'rows_text': {k: (rows.get(k) or {}).get('to_state') for k in ('S-017', 'S-078')}}
        s17 = rows.get('S-017') or {}
        row_ok = 'barn intact all battle' in (s17.get('to_state') or '')
        ev['row_S-017_says_barn_intact_all_battle'] = row_ok
        if not ids:
            item('mcpherson-barn-not-burned-1-july', False, '', '', ev, ['bld-mcpherson-farm'], blocked='the McPherson farm and its parts are not in the engine series')
        else:
            item('mcpherson-barn-not-burned-1-july', not bad and not mismatch and row_ok, 'the McPherson barn and house are never in a burned state at any of %d state runs read at every minute of both windows in every scenario, the engine equals the reference at every run start, and row S-017 says the barn is intact all battle' % seen,
                 'the McPherson correction does not hold: %s' % '; '.join((bad[:2] + mismatch[:1] + ([] if row_ok else ['row S-017 no longer says the barn is intact all battle']))), ev, ['bld-mcpherson-farm'])

    # ---- 5. the Bliss house and barn burned on the morning of 3 July by the 14th Connecticut
    if need('bliss-burned-3-july-morning', ['bld-bliss-farm']):
        ids = [i for i in ('bld-bliss-farm#house', 'bld-bliss-farm#barn') if i in (eng.get('series') or {})]
        r52 = rows.get('S-052') or {}
        text = ' '.join(str(r52.get(k) or '') for k in ('trigger', 'from_state', 'to_state')) + ' ' + str((r52.get('time') or {}).get('printed') or '')
        win = ((r52.get('time') or {}).get('window')) or [None, None]
        bad, mismatch, seen = [], [], 0
        for i in ids:
            for sc, runs in (eng['series'][i] or {}).items():
                for r in runs:
                    seen += 1
                    ref = _ref_state(V, i, r['iso'], sc) if V.CS is not None else None
                    if ref is not None and 'error' not in ref and ref.get('state') != r.get('state') and r.get('s') == 0:
                        mismatch.append('%s (%s) %s' % (i, sc, r['iso']))
                    if BURN.search(r.get('state') or '') and not re.search(r'indeterminate|transitioning', r.get('state') or '') and r['iso'] < '1863-07-03T00:00':
                        bad.append('%s (%s): burned at %s, before 3 July' % (i, sc, r['iso']))
                    if re.search(r'indeterminate|transitioning', r.get('state') or '') and r['iso'] < '1863-07-03T00:00':
                        bad.append('%s (%s): the burn begins at %s, before 3 July' % (i, sc, r['iso']))
                last = runs[-1] if runs else None
                if not last or not re.fullmatch(r'Burned', (last.get('state') or '').strip(), re.I):
                    bad.append('%s (%s): not burned after the window (%s)' % (i, sc, (last or {}).get('state')))
        ev = {'objects': ids, 'row': 'S-052', 'row_trigger': (r52.get('trigger') or '')[:110], 'row_window': win, 'time_printed': (r52.get('time') or {}).get('printed'), 'runs_read': seen, 'problems': bad[:5], 'engine_differs_from_reference': mismatch[:3],
              'note': 'the window is date-granular (00:00 to 23:59 on 3 July): the data does not resolve "morning"'}
        row_ok = '14th Connecticut' in (r52.get('trigger') or '') and (win[0] or '').startswith('1863-07-03') and 'Burned' == (r52.get('to_state') or '').strip()
        if not ids or not r52:
            item('bliss-burned-3-july-morning', False, '', '', ev, ['bld-bliss-farm'], blocked='row S-052 or the Bliss parts are not in the data')
        else:
            item('bliss-burned-3-july-morning', row_ok and not bad and not mismatch, 'the Bliss house and barn are intact on every minute before 3 July, burn inside the 3 July window set by row S-052 (the 14th Connecticut), and are burned after it, in every scenario; the engine equals the reference',
                 'the Bliss correction does not hold: %s' % '; '.join(bad[:2] + mismatch[:1] + ([] if row_ok else ['row S-052 no longer names the 14th Connecticut, the 3 July window and the Burned state'])), ev, ['bld-bliss-farm'])

    # ---- 6. the Angle wall is pre-existing
    if need('angle-wall-pre-existing', ['P-01']):
        s = by_id.get('P-01') or {}
        ser = (eng.get('series') or {}).get('P-01') or {}
        w3 = (dump or {}).get('works3d')
        bad = []
        if s.get('preexisting') is not True or s.get('construction_animation_allowed') is not False:
            bad.append('the record P-01 is not pre-existing with no construction animation')
        for sc, runs in ser.items():
            if not runs or runs[0].get('present') is not True or any(is_construction(r.get('state'), r.get('stage')) for r in runs):
                bad.append('scenario %s: not present at frame one or a construction state' % sc)
        if not ser:
            bad.append('no engine series for P-01')
        ev = {'record': {'preexisting': s.get('preexisting'), 'construction_animation_allowed': s.get('construction_animation_allowed'), 'name': (s.get('name') or '')[:60]}, 'scenarios': sorted(ser), 'draw_list_checked': w3 is not None}
        if w3 is not None:
            d = next((p for p in w3.get('preexisting', []) if p['id'] == 'P-01'), None)
            if d is None or d.get('construction') is not False or d.get('progress') != 1:
                bad.append('the draw list of pre-existing features does not give P-01 present at progress 1 with no construction')
            if 'P-01' in [w['id'] for w in w3.get('works', [])]:
                bad.append('P-01 is among the works built on screen')
        if bad:
            item('angle-wall-pre-existing', False, '', 'the Angle wall correction does not hold: %s' % '; '.join(bad[:3]), ev, ['P-01'])
        elif w3 is None:
            item('angle-wall-pre-existing', False, '', '', ev, ['P-01'], blocked='the draw lists of src/structures/works3d.mjs (the history layer was not built by the node child); the record and the engine are clean')
        else:
            item('angle-wall-pre-existing', True, 'the Angle wall (P-01) is pre-existing: present at the first minute with no construction state in every scenario, in the engine and in the draw list', '', ev, ['P-01'])


# ============================================================================================================ the run
def run(env, rec, V, dump, R, SD, args):
    inp = safe(rec, 'structure-inputs', Inputs, env, rec)
    if inp is None:
        return
    objs = safe(rec, 'q033-objects', q033_objects, env, rec, inp, dump, R, SD)
    safe(rec, 'q033-works', q033_works, env, rec, inp, dump, R)
    safe(rec, 'q033-out-of-window', q033_out_of_window, env, rec, inp, dump, R)
    safe(rec, 'q033-records', q033_records, env, rec, inp, dump, R)
    safe(rec, 'q034-registry', q034_registry, env, rec, inp, dump, R, SD, objs)
    safe(rec, 'q034-avenues', q034_avenues, env, rec, inp, dump, R)
    safe(rec, 'q034-memorials', q034_memorials, env, rec, dump, R)
    safe(rec, 'q034-ground', q034_ground, env, rec, R)
    safe(rec, 'q035', q035, env, rec, inp, dump, R)
    safe(rec, 'q037', q037, env, rec, inp, dump, R)
