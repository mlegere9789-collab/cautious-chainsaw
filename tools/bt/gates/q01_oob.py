#!/usr/bin/env python3
"""Gate Q01: "Unit counts and strengths match the verified OOB table." (plan p. 136, Q). GATE-SPEC.md 2, Q01.1 to Q01.7.

    python3 tools/bt/gates/q01_oob.py [--out DIR] [--scenarios default|sample|ofat] [--mutate FILE.mjs] [--no-write] [--quiet]

Writes `<out>/Q01.json` (default GOVERNANCE/gate_results), record `bt-gate-result/1`. Exit code 0 PASS, 1 FAIL, 2 INCOMPLETE, 3 runner error. It sets no `passes` flag.

What it compares: the table `kit/verified_oob.json` (schema `kit-verified-oob-1`, built by tools/bt/kit_verified.py from the Official Records) with what the REAL history layer holds, read by the node child
q01_layer.mjs (the application's own loader, `createRealHistory`, `worldFromUnits` and the `Stage`). Items are (unit, check, scenario):

  Q01.1 the table      exists, schema known, every row well formed, every documented value re-matched in the stored source text in THIS run (K5), no lead source, every K.1 class present
  Q01.2 unit set       the layer's units and the table's units are in bijection through the id map (roster ids), level by level; commander and brigade assignment equal; not-on-the-field rows are never drawn
  Q01.3 strength       the layer's figure lies in a verified range of the table with the same basis and the layer carries the range, never a collapsed single figure
  Q01.4 roll-ups       the layer's sum per brigade, division, corps and army lies inside the sum of the table's ranges (and army totals inside the verified totals)
  Q01.5 presence       every unit has an arrivals record: window, place, route, sources (or, for a unit never on the field, its not-on-the-field record)
  Q01.6 one-to-one     rendered instances equal present strength for every unit, scenario and grid time evaluated; no cap constant in the source
  Q01.7 commander      the commanders and the chain corps/division/brigade equal the table's

With no table every table-dependent item is BLOCKED-INPUT ("input missing: ..."), never a pass. The two checks that need no table (Q01.5, Q01.6) are still computed: a failure is a FAIL, a success is
reported in `evidence.layer_only_result` and the item stays BLOCKED-INPUT (the unit set they range over is the table's). A scenario set that is not S* and a time grid that is not dense make the verdict INCOMPLETE
(U-26); the record says which parts are owed.
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
for _p in (HERE, os.path.join(HERE, 'lib'), os.path.abspath(os.path.join(HERE, '..'))):
    if _p not in sys.path:
        sys.path.insert(0, _p)

from oobgates_common import ChildFailed, cond, first_failed, gate_rows, layer_dump, load_thresholds, runner_version, sub_requirements_for, surnames, table_surname, threshold_value  # noqa: E402
from pq_common import Env, InputMissing, Record, base_parser, finish_cli, guarded_main, is_placeholder, node_version  # noqa: E402

GATE = 'Q01'
TABLE_REL = 'kit/verified_oob.json'
EVIDENCE_REL = 'kit/evidence'
SOURCES_REL = 'kit/evidence/sources.json'
SCHEMAS = ('kit-verified-oob-1',)
ON_FIELD = ('on_field', 'partly_on_field')
OFF_FIELD = ('never_on_field', 'never_main_field', 'documented_absent')
LEAD_RE = r'^(wiki|wp[-_]|forum|blog|auction|cwtalk|history ?net|historynet|w-[a-z]|epp|cwt|padre|whb)'
# GATE-SPEC Q01.1 / plan K.1 (p. 135): a kit manifest for every regiment, battery, troop and company-level unit including cavalry, horse artillery, engineers, signal, provost, ambulance, ordnance,
# headquarters and medical staff. The table must hold at least one unit of each of these classes. (class -> test on a table unit)
K1_CLASSES = {
    'infantry regiment': {'level': r'^(regiment|battalion)$', 'arm': r'^infantry$'},
    'battery': {'level': r'^battery$'},
    'cavalry': {'arm': r'^cavalry$'},
    'horse artillery': {'name': r'horse (artillery|battery)|horse art', 'group': r'horse'},
    'engineers': {'name': r'engineer'},
    'signal': {'name': r'signal'},
    'provost': {'name': r'provost'},
    'ambulance': {'name': r'ambulance'},
    'ordnance': {'name': r'ordnance'},
    'headquarters': {'level': r'^headquarters$', 'name': r'headquarters|head-quarters'},
    'medical staff': {'name': r'medical|surgeon|hospital'},
}
MISSING = 'input missing: docs/battle-theatre/kit/verified_oob.json (the verified order-of-battle table of GATE-SPEC Q01.1; no table, no comparison)'


# ======================================================================================== helpers
import re  # noqa: E402


def _rx(pat, s):
    return bool(re.search(pat, str(s or ''), re.I))


def k1_has(units, spec):
    for u in units.values():
        ok = True
        for key, pat in spec.items():
            ok = ok and _rx(pat, u.get(key))
        if ok:
            return True
    return False


def chain(units, uid):
    out, seen = [], set()
    while uid and uid in units and uid not in seen:
        seen.add(uid)
        out.append(uid)
        uid = units[uid].get('parent')
    return out


def ranges_of(tu):
    return ((tu or {}).get('strength') or {}).get('ranges') or {}


def fmt_ranges(tu):
    return {k: [r.get('low'), r.get('high'), r.get('tier')] for k, r in sorted(ranges_of(tu).items())}


def layer_figure(u):
    """(low, high, point, kind) of the figure the layer holds for a unit: a printed figure or a range, or the drawn share of a leaf; None when it holds none."""
    s = u.get('strength') or {}
    lo, hi, d = s.get('min'), s.get('max'), s.get('drawn')
    if lo is not None and hi is not None:
        return lo, hi, (d if d else lo), s.get('kind')
    if u.get('drawn') and d:
        return None, None, d, s.get('kind')
    return None, None, None, s.get('kind')


def src_is_lead(sid, registry):
    r = (registry or {}).get(sid)
    if r is not None:
        return bool(r.get('lead')) or r.get('class') in (registry.get('__lead_classes__') or [])
    return bool(re.search(LEAD_RE, str(sid or ''), re.I))


# ======================================================================================== Q01.1: the table
def evidence_ids_of(tu):
    """(field, evidence id, tier, numbers the value states) of the documented values of a table unit that Q01 relies on: roster presence, commanders, strength figures."""
    out = []
    p = tu.get('presence')
    if p and p.get('tier') == 'documented':
        for e in p.get('evidence_ids') or []:
            out.append(('roster', e, 'documented', [], None))
    for c in tu.get('commanders') or []:
        if c.get('tier') == 'documented':
            for e in c.get('evidence_ids') or []:
                out.append(('commander', e, 'documented', [], None))
    for f in ((tu.get('strength') or {}).get('figures') or []):
        if f.get('tier') == 'documented':
            nums = sorted({x for x in (f.get('low'), f.get('high'), f.get('officers'), f.get('enlisted')) if isinstance(x, int) and not isinstance(x, bool) and x > 0})
            for e in f.get('evidence_ids') or []:
                out.append(('strength', e, 'documented', nums, (f.get('low'), f.get('high'))))
    return out


def required_numbers(field, line, fallback):
    """The numbers of a value that its extract must contain: the kit's own rule (kit_evidence_lib.value_numbers: a total that is the sum of a printed officers-and-men split is derived and exempt)."""
    v = line.get('value')
    if field == 'strength' and isinstance(v, dict):
        try:
            import kit_evidence_lib as K  # noqa: PLC0415
            return K.value_numbers('strength', v)
        except Exception:
            pass
    return fallback


def _numbers_ok(nums, quote):
    if not nums:
        return True, []
    try:
        import kit_evidence_lib as K  # noqa: PLC0415
        have = K.numbers_in_text(quote)
        miss = [n for n in nums if n not in have]
        return (not miss), miss
    except Exception:
        from extracts import numbers_in_span  # noqa: PLC0415
        ok, miss = numbers_in_span(' '.join(str(n) for n in nums), quote)
        return ok, miss


def load_evidence_lines(env, ids, preset=None):
    """Evidence lines by id: from `preset` (tests) or from kit/evidence/<group>.jsonl. Returns (lines, files read, sources declared in those files)."""
    lines, files, declared = dict(preset or {}), [], {}
    need = {i for i in ids if i not in lines}
    for g in sorted({i.split(':')[0] for i in need}):
        fn = os.path.join(env.bt, 'kit', 'evidence', g + '.jsonl')
        if not os.path.isfile(fn):
            continue
        files.append(fn)
        with open(fn, encoding='utf-8') as f:
            for ln in f:
                ln = ln.strip()
                if not ln:
                    continue
                try:
                    o = json.loads(ln)
                except ValueError:
                    continue
                if o.get('type') == 'source' and o.get('id'):
                    declared[o['id']] = o
                if o.get('id') in need:
                    lines[o['id']] = o
    return lines, files, declared


_FOLDED = {}


def _find_in_file(env, rec, quote):
    """Find an extract in the stored text of a source of the registry or declared in an evidence file (a `local_path` under the repository)."""
    lp = rec.get('local_path')
    if not lp:
        return {'status': 'no_source'}
    fn = os.path.join(env.root, *lp.split('/'))
    if not os.path.isfile(fn):
        return {'status': 'no_text', 'reason': 'text not on this machine: %s' % lp}
    if fn not in _FOLDED:
        from extracts import FoldedText  # noqa: PLC0415
        with open(fn, encoding='utf-8', errors='replace', newline='') as f:
            _FOLDED[fn] = FoldedText(fn, f.read())
    return {'status': 'found' if _FOLDED[fn].find(quote) >= 0 else 'not_found'}


def rematch(matcher, line, reg=None, declared=None, env=None):
    """Find the extract of one evidence line in the stored source text: status found | not_found | no_text | no_source | image_only.
    An OCR-corrected extract (`quote_mode` ocr_corrected or image_row) was read from the page image: it is not in the stored text by construction, so this runner cannot re-match it (NOT-RUN, never a pass)."""
    q, sid = line.get('quote'), line.get('source_id')
    if line.get('quote_mode') in ('ocr_corrected', 'image_row'):
        return {'status': 'image_only', 'reason': 'the extract is an OCR correction checked against the page image, which this runner does not read'}
    if matcher is None:
        return {'status': 'no_text', 'reason': 'no text store'}
    if str(sid or '').startswith('OR27'):
        return matcher.find_or27(q, line.get('report_id'), line.get('printed_page'))
    rec = (reg or {}).get(sid) or (declared or {}).get(sid)
    if rec and env is not None:
        idx = str(rec.get('index') or '')
        if idx.startswith('statevol:'):
            return matcher.find_statevol(q, volume=idx.split(':', 1)[1], section=line.get('report_id'))
        if rec.get('local_path'):
            return _find_in_file(env, rec, q)
    return matcher.find(sid, q)


def check_table(rec, env, T, matcher, evidence, k1, max_words=14):
    """The table-level item Q01.1."""
    units = T.get('units') or {}
    conds, hard = [], []
    conds.append(cond('schema known', T.get('schema') in SCHEMAS, 'schema %r, known: %s' % (T.get('schema'), ', '.join(SCHEMAS))))
    conds.append(cond('rows present', bool(units), '%d unit rows' % len(units)))
    tot = (T.get('totals') or {}).get('units')
    conds.append(cond('totals agree', tot in (None, len(units)), 'totals.units %s, rows %d' % (tot, len(units))))
    bad_rows, bad_rng, no_par = [], [], []
    for uid, tu in sorted(units.items()):
        miss = [k for k in ('name', 'army', 'level') if is_placeholder(tu.get(k))]
        if miss:
            bad_rows.append('%s lacks %s' % (uid, '/'.join(miss)))
        if tu.get('parent') and tu['parent'] not in units:
            no_par.append('%s: parent %s is not a row' % (uid, tu['parent']))
        for k, r in ranges_of(tu).items():
            lo, hi = r.get('low'), r.get('high')
            if not (isinstance(lo, int) and isinstance(hi, int)) or lo > hi:
                bad_rng.append('%s %s: range %r..%r' % (uid, k, lo, hi))
            elif is_placeholder(r.get('basis')) or r.get('tier') not in ('documented', 'inferred', 'plausible-procedural'):
                bad_rng.append('%s %s: no declared basis or no valid tier' % (uid, k))
            elif not (tu.get('strength') or {}).get('figures'):
                bad_rng.append('%s %s: a range with no figure behind it' % (uid, k))
        for c in tu.get('commanders') or []:
            if is_placeholder(c.get('name')) or c.get('tier') not in ('documented', 'inferred', 'plausible-procedural'):
                bad_rng.append('%s commander order %s: no name or tier' % (uid, c.get('order')))
    conds.append(cond('rows well formed (name, army, level)', not bad_rows, '; '.join(bad_rows[:5]) or None, n=len(bad_rows)))
    conds.append(cond('parents resolve inside the table', not no_par, '; '.join(no_par[:5]) or None, n=len(no_par)))
    conds.append(cond('ranges are low <= high with a declared basis and tier; commanders have name and tier', not bad_rng, '; '.join(bad_rng[:5]) or None, n=len(bad_rng)))
    # K.1 classes
    absent = [c for c, spec in sorted((k1 or K1_CLASSES).items()) if not k1_has(units, spec if isinstance(spec, dict) else {'name': spec})]
    conds.append(cond('every K.1 unit class has at least one row', not absent, 'absent: ' + ', '.join(absent) if absent else None, absent=absent))
    # documented values: extract re-matched in this run
    reg = None
    try:
        with open(os.path.join(env.bt, SOURCES_REL), encoding='utf-8') as f:
            doc = json.load(f)
        reg = dict(doc.get('sources') or {})
        reg['__lead_classes__'] = doc.get('lead_classes_never_documented') or []
    except (OSError, ValueError):
        reg = None
    want = []
    for uid, tu in sorted(units.items()):
        for field, eid, tier, nums, lohi in evidence_ids_of(tu):
            want.append((uid, field, eid, nums, lohi))
    lines, files, declared = load_evidence_lines(env, [w[2] for w in want], evidence)
    for fn in files:
        rec.add_input(fn, 'evidence')
    stat = {'values': len(want), 'matched': 0, 'not_found': [], 'no_text': [], 'image_only': [], 'no_line': [], 'lead': [], 'long_quote': [], 'number_missing': [], 'no_quote': [], 'value_mismatch': []}
    seen = {}
    for uid, field, eid, nums, lohi in want:
        ln = lines.get(eid)
        if ln is None:
            stat['no_line'].append('%s %s %s' % (uid, field, eid))
            continue
        lv = ln.get('value')
        if lohi is not None and isinstance(lv, dict) and 'low' in lv and (lv.get('low'), lv.get('high')) != tuple(lohi):
            stat['value_mismatch'].append('%s %s %s: table %s, evidence line %s' % (uid, field, eid, list(lohi), [lv.get('low'), lv.get('high')]))
            continue
        if src_is_lead(ln.get('source_id'), reg):
            stat['lead'].append('%s %s %s (%s)' % (uid, field, eid, ln.get('source_id')))
            continue
        q = ln.get('quote')
        if is_placeholder(q):
            stat['no_quote'].append('%s %s %s' % (uid, field, eid))
            continue
        if len(str(q).split()) > max_words:
            stat['long_quote'].append('%s %s %s' % (uid, field, eid))
            continue
        if eid not in seen:
            seen[eid] = rematch(matcher, ln, reg, declared, env)
        r = seen[eid]
        st = r.get('status')
        if st == 'found':
            ok, miss = _numbers_ok(required_numbers(field, ln, nums), q)
            if not ok:
                stat['number_missing'].append('%s %s %s: %s not in the extract' % (uid, field, eid, miss))
            else:
                stat['matched'] += 1
        elif st == 'no_text':
            stat['no_text'].append('%s %s %s' % (uid, field, eid))
        elif st == 'image_only':
            stat['image_only'].append('%s %s %s' % (uid, field, eid))
        else:
            stat['not_found'].append('%s %s %s (%s)' % (uid, field, eid, st))
    problems = [k for k in ('not_found', 'no_line', 'lead', 'long_quote', 'number_missing', 'no_quote', 'value_mismatch') if stat[k]]
    conds.append(cond('every documented value: its evidence line exists, its source is not a lead, its extract is under 15 words, it is found in the stored source text in this run and every number of the value is in it',
                      not problems and not stat['no_text'] and not stat['image_only'] and stat['values'] > 0,
                      ('; '.join('%s %d (%s)' % (k.replace('_', ' '), len(stat[k]), '; '.join(stat[k][:2])) for k in problems) or ('source text not on this machine for %d value(s)' % len(stat['no_text']) if stat['no_text'] else
                       ('%d extract(s) are OCR corrections checked against the page image, which this runner does not read' % len(stat['image_only']) if stat['image_only'] else ('no documented value to re-match' if not stat['values'] else None)))),
                      **{k: len(v) if isinstance(v, list) else v for k, v in stat.items()}))
    failed = [c for c in conds if not c['ok']]
    ev = {'conditions': conds, 'units': len(units), 'by_status': {s: sum(1 for t in units.values() if t.get('status') == s) for s in sorted({t.get('status') for t in units.values()} - {None})},
          'in_roster': sum(1 for t in units.values() if t.get('in_roster')), 'table_only': sum(1 for t in units.values() if not t.get('in_roster')), 'rematch': {k: (v if not isinstance(v, list) else v[:8]) for k, v in stat.items()},
          'table_schema': T.get('schema')}
    id_ = 'Q01/Q01.1/table/default'
    if not units or T.get('schema') not in SCHEMAS:
        rec.item(id_, 'BLOCKED-INPUT', 'input missing: an eligible verified OOB table (%s)' % '; '.join(first_failed(conds[:2])), ev, check='Q01.1', scenario='default')
    elif any(c['name'].startswith('every documented value') and not c['ok'] for c in conds) and not problems and (stat['no_text'] or stat['image_only']):
        others = [c for c in failed if not c['name'].startswith('every documented value')]
        if others:
            rec.item(id_, 'FAIL', 'the table is not fit: ' + '; '.join(first_failed(others)), ev, check='Q01.1', scenario='default')
        else:
            rec.item(id_, 'NOT-RUN', 'the extracts of %d documented value(s) cannot be re-matched here (%d: source text not on this machine; %d: OCR corrections read from the page image): the table is not shown to be verified' % (len(stat['no_text']) + len(stat['image_only']), len(stat['no_text']), len(stat['image_only'])), ev, check='Q01.1', scenario='default')
    elif failed:
        rec.item(id_, 'FAIL', 'the table is not fit: ' + '; '.join(first_failed(failed)), ev, check='Q01.1', scenario='default')
    else:
        rec.item(id_, 'PASS', 'the table is well formed; all %d documented values were re-matched in the stored source text in this run; every K.1 class is present' % stat['matched'], ev, check='Q01.1', scenario='default')
    if matcher is None and units:
        rec.owe('Q01.1: no text store was available, so no extract of the table was re-matched (run on a machine with tmp/library/or27)')


# ======================================================================================== per-unit checks
def descendants_leaves(by, uid):
    out, stack = [], [uid]
    while stack:
        x = stack.pop()
        u = by.get(x)
        if not u:
            continue
        if not u.get('children'):
            out.append(x)
        else:
            stack.extend(u['children'])
    return sorted(out)


def build_context(rec, env, L, T):
    by = {u['id']: u for u in L['units']}
    rows, all_ids = gate_rows(env, GATE)
    return {'by': by, 'rows': rows, 'all_ids': all_ids, 'tu': (T or {}).get('units') or {}, 'sources': set(L.get('source_keys') or []), 'nof': L.get('not_on_field') or {}}


def mk(rec, ctx, check, subject, scenario, result, reason, evidence, unit=None):
    uid = unit if unit is not None else subject.split('/')[0]
    return rec.item('Q01/%s/%s/%s' % (check, subject, scenario), result, reason, evidence, check=check, scenario=scenario, subjects=[uid],
                    sub_requirements=sub_requirements_for(ctx['rows'], ctx['all_ids'], uid))


def q012_unit_set(rec, ctx, L, T):
    by, tu = ctx['by'], ctx['tu']
    for u in sorted(L['units'], key=lambda x: x['id']):
        uid = u['id']
        if T is None:
            mk(rec, ctx, 'Q01.2', uid, 'default', 'BLOCKED-INPUT', MISSING, {'missing': TABLE_REL, 'layer': {'level': u['level'], 'arm': u['arm'], 'parent': u['parent'], 'status': u['status'], 'drawn': u['drawn']}})
            continue
        t = tu.get(uid)
        if t is None:
            mk(rec, ctx, 'Q01.2', uid, 'default', 'FAIL', 'layer unit %s is not in the table (a unit in the layer and not in the table)' % uid, {'layer': {'level': u['level'], 'arm': u['arm'], 'parent': u['parent']}})
            continue
        conds = [cond('army equal', t.get('army') == u['army'], '%s vs %s' % (u['army'], t.get('army'))),
                 cond('level equal', t.get('level') == u['level'], '%s vs %s' % (u['level'], t.get('level'))),
                 cond('branch equal', (t.get('arm') or None) == (u['arm'] or None), '%s vs %s' % (u['arm'], t.get('arm'))),
                 cond('brigade assignment (parent) equal', (t.get('parent') or None) == (u['parent'] or None), '%s vs %s' % (u['parent'], t.get('parent')))]
        eng = (t.get('presence') or {}).get('engaged')
        if eng == 'no':
            conds.append(cond('the record puts the unit off the field: never drawn', not u['drawn'] and (u['status'] in OFF_FIELD or any(a in ctx['nof'] for a in chain(by, uid))), 'drawn %s, status %s' % (u['drawn'], u['status'])))
        elif eng == 'yes':
            conds.append(cond('the record puts the unit on the field: the layer holds it on the field', u['status'] in ON_FIELD or u['level'] in ('army', 'corps', 'division', 'brigade'), 'status %s' % u['status']))
        bad = first_failed(conds)
        ev = {'conditions': conds, 'table_row': {'name': t.get('name'), 'level': t.get('level'), 'arm': t.get('arm'), 'parent': t.get('parent'), 'engaged': eng, 'status': t.get('status')}}
        if bad:
            mk(rec, ctx, 'Q01.2', uid, 'default', 'FAIL', 'unit set: ' + '; '.join(bad), ev)
        else:
            mk(rec, ctx, 'Q01.2', uid, 'default', 'PASS', 'in the table with the same army, level, branch and brigade assignment', ev)
    if T is not None:
        for tid, t in sorted(tu.items()):
            if tid in by:
                continue
            hint = 'a unit of the Official Records organization tables that the roster lacks (history/undrawn/roster-gaps.json)' if not t.get('in_roster') else 'the table says it is in the roster, the layer does not hold it'
            mk(rec, ctx, 'Q01.2', tid, 'default', 'FAIL', 'table unit %s is missing from the layer: %s' % (tid, hint), {'table_row': {'name': t.get('name'), 'level': t.get('level'), 'parent': t.get('parent'), 'in_roster': t.get('in_roster'), 'status': t.get('status')}}, unit=tid)


def pick_ranges(u, t):
    """The table ranges a layer figure is compared with: those of the basis the layer names (`basis_key`, or a source id the table's evidence cites), else none (the basis is not the same)."""
    rs = ranges_of(t)
    s = u.get('strength') or {}
    key = s.get('basis_key')
    cited = set()
    for f in ((t.get('strength') or {}).get('figures') or []):
        c = f.get('cite') or {}
        if c.get('report_id'):
            cited.add(c['report_id'])
        if c.get('source_id'):
            cited.add(c['source_id'])
    mine = set(s.get('sources') or [])
    out = {}
    for k, r in rs.items():
        if (key and k == key) or (mine & cited and any(((f.get('cite') or {}).get('report_id') in mine) and (f.get('basis') + '|' + f.get('men') == k) for f in t['strength']['figures'])):
            out[k] = r
    return out


def q013_strength(rec, ctx, L, T):
    by, tu = ctx['by'], ctx['tu']
    for u in sorted(L['units'], key=lambda x: x['id']):
        uid = u['id']
        lo, hi, pt, kind = layer_figure(u)
        if u['status'] in OFF_FIELD or any(a in ctx['nof'] and by.get(a, {}).get('status') in OFF_FIELD for a in chain(by, uid)[1:]):
            mk(rec, ctx, 'Q01.3', uid, 'default', 'N/A', 'not on the field: no strength is drawn', {'status': u['status']})
            continue
        if u['children'] and lo is None:
            mk(rec, ctx, 'Q01.3', uid, 'default', 'N/A', 'a formation: its leaf units carry the figures; its sum is judged in Q01.4', {'children': len(u['children'])})
            continue
        if T is None:
            mk(rec, ctx, 'Q01.3', uid, 'default', 'BLOCKED-INPUT', MISSING, {'missing': TABLE_REL, 'layer': {'kind': kind, 'min': lo, 'max': hi, 'drawn': u['strength'].get('drawn')}})
            continue
        t = tu.get(uid)
        if t is None:
            mk(rec, ctx, 'Q01.3', uid, 'default', 'BLOCKED-INPUT', 'input missing: no table row for this unit (see Q01.2): there is no verified strength to compare with', {'layer_figure': pt})
            continue
        rs = ranges_of(t)
        if not rs:
            gaps = t.get('gaps') or []
            mk(rec, ctx, 'Q01.3', uid, 'default', 'BLOCKED-INPUT', 'input missing: the table row has no verified strength (field status %s%s): the layer figure %s is not compared' % ((t.get('fields') or {}).get('strength'), '; %d gap line(s) recorded' % len(gaps) if gaps else '', pt),
                    {'layer_figure': pt, 'table_status': t.get('status'), 'gaps': gaps[:3]})
            continue
        if pt is None:
            mk(rec, ctx, 'Q01.3', uid, 'default', 'FAIL', 'the layer holds no strength figure for this on-the-field unit although the table has %s' % json.dumps(fmt_ranges(t)), {'table_ranges': fmt_ranges(t), 'layer': u['strength']})
            continue
        matching = pick_ranges(u, t)
        cands = matching or rs
        # a range that spans dates is compared only with the sub-range of the date the layer figure names (`by_as_of`), never on its wide span (kit/evidence/PLAN.md, Q01 comparison rule; DD-G-OOB-10)
        as_of = u['strength'].get('as_of') or None
        eff, date_notes = {}, []
        for k, r in cands.items():
            by_date = r.get('by_as_of') or {}
            if as_of and by_date:                                     # a layer figure that names its date is compared with the figure(s) of that date only
                sub = by_date.get(as_of)
                if sub is None:
                    date_notes.append('%s has figures dated %s and none dated %s as the layer figure is' % (k, sorted(by_date), as_of))
                    continue
                eff[k] = {'low': sub['low'], 'high': sub['high'], 'tier': r.get('tier')}
            elif r.get('spans_dates'):
                date_notes.append('%s spans the dates %s and the layer figure names no date' % (k, sorted(by_date)))
                continue
            else:
                eff[k] = {'low': r['low'], 'high': r['high'], 'tier': r.get('tier')}
        effm = {k: v for k, v in eff.items() if k in matching}
        inside = [k for k, r in eff.items() if r['low'] <= pt <= r['high']] if lo is None else [k for k, r in eff.items() if r['low'] <= lo and hi <= r['high']]
        drawn_n = u['strength'].get('drawn') or 0
        wide = [k for k, r in eff.items() if r['low'] < r['high']]
        carried = [k for k, r in effm.items() if lo == r['low'] and hi == r['high']]
        conds = [cond('same basis: the layer names the basis key or cites a source of the table row', bool(matching), None if matching else 'the layer record (basis_key %r, sources %s) names no basis or source of the table row (%s)' % (u['strength'].get('basis_key'), u['strength'].get('sources'), ', '.join(sorted(rs)))),
                 cond('the layer figure lies in a verified range', bool(inside), '%s not in %s' % (pt if lo is None else [lo, hi], {k: [r['low'], r['high']] for k, r in (eff or cands).items()}))]
        if as_of or any(r.get('spans_dates') for r in cands.values()):
            conds.append(cond('the date of the figure: a layer figure is compared only with the table figures of its own date, and a range that spans dates is never used on its wide span', not date_notes, '; '.join(date_notes) if date_notes else None))
        if lo is not None and u['drawn'] and drawn_n:
            conds.append(cond('the figures drawn lie inside the range the layer carries', lo <= drawn_n <= hi, '%s drawn, the layer carries %s' % (drawn_n, [lo, hi]) if not (lo <= drawn_n <= hi) else None))
        if matching:
            k0 = [k for k in effm if effm[k]['low'] < effm[k]['high']]
            if k0:
                conds.append(cond('no range is collapsed: the layer carries the table range', bool(carried), 'the layer carries %s, the table range is %s: a collapsed or absent range' % ('no range' if lo is None else [lo, hi], {k: [effm[k]['low'], effm[k]['high']] for k in k0}) if not carried else None))
        elif wide:
            conds.append(cond('no range is collapsed: the layer carries the table range', False, 'the table has a range %s and the layer carries %s: collapsed' % ({k: [eff[k]['low'], eff[k]['high']] for k in wide}, 'no range' if lo is None else [lo, hi])))
        bad = first_failed(conds)
        ev = {'conditions': conds, 'layer': {'kind': kind, 'min': lo, 'max': hi, 'point': pt, 'basis': (u['strength'].get('basis') or '')[:160], 'basis_key': u['strength'].get('basis_key'), 'sources': u['strength'].get('sources'), 'tier': u['strength'].get('tier'), 'as_of': as_of},
              'table': {'status': t.get('status'), 'ranges': fmt_ranges(t)}}
        if bad:
            mk(rec, ctx, 'Q01.3', uid, 'default', 'FAIL', 'strength: ' + '; '.join(bad), ev)
        else:
            tiers = {effm[k]['tier'] for k in effm}
            mk(rec, ctx, 'Q01.3', uid, 'default', 'PASS', 'the layer figure lies in the verified range of the same basis and carries it' + ('' if tiers == {'documented'} else ' (against a flagged %s value)' % '/'.join(sorted(t_ for t_ in tiers if t_))), ev)


def table_leaf_interval(tu, leaves, kind, by=None):
    """(low, high, date_problems) of the sum of the table ranges of one kind over the leaves, or None when a leaf has no range of that kind.
    A range that has figures of more than one date is added up on the figure of the date the layer names for that leaf (`strength.as_of`); a leaf whose layer figure names no date (or a date the table
    has no figure for) cannot use the wide span of such a range: it is listed in `date_problems` and the sum of that kind is not usable (DD-G-OOB-10)."""
    lo = hi = 0
    problems = []
    for x in leaves:
        r = ranges_of(tu.get(x)).get(kind)
        if r is None:
            return None
        by_date = r.get('by_as_of') or {}
        as_of = (((by or {}).get(x) or {}).get('strength') or {}).get('as_of')
        if as_of and by_date:
            sub = by_date.get(as_of)
            if sub is None:
                problems.append('%s: no table figure is dated %s (it has %s)' % (x, as_of, sorted(by_date)))
                continue
            lo += sub['low']
            hi += sub['high']
        elif r.get('spans_dates'):
            problems.append('%s: the range spans the dates %s and the layer figure names no date' % (x, sorted(by_date)))
        else:
            lo += r['low']
            hi += r['high']
    return lo, hi, problems


def table_leaves_under(tu, uid):
    kids = {}
    for k, t in tu.items():
        if t.get('parent'):
            kids.setdefault(t['parent'], []).append(k)
    out, stack = [], [uid]
    while stack:
        x = stack.pop()
        if kids.get(x):
            stack.extend(kids[x])
        elif x != uid:
            out.append(x)
    return sorted(out)


def q014_rollups(rec, ctx, L, T):
    by, tu = ctx['by'], ctx['tu']
    for u in sorted(L['units'], key=lambda x: x['id']):
        if not u['children']:
            continue
        uid = u['id']
        leaves = descendants_leaves(by, uid)
        lay = [x for x in leaves if by[x]['drawn']]
        s_layer = sum(by[x]['strength'].get('drawn') or 0 for x in lay)
        if not lay:
            if all(by[x]['status'] in OFF_FIELD for x in leaves):
                mk(rec, ctx, 'Q01.4', uid, 'default', 'N/A', 'every unit under it is off the field', {'leaves': len(leaves)})
                continue
        if T is None:
            mk(rec, ctx, 'Q01.4', uid, 'default', 'BLOCKED-INPUT', MISSING, {'missing': TABLE_REL, 'layer_sum': s_layer, 'leaves': len(leaves), 'leaves_drawn': len(lay)})
            continue
        t = tu.get(uid)
        tleaves = [x for x in table_leaves_under(tu, uid) if (tu[x].get('presence') or {}).get('engaged') != 'no']
        kinds = set()
        for x in tleaves:
            kinds |= set(ranges_of(tu[x]))
        full, date_excluded = {}, {}
        for k in sorted(kinds):
            iv = table_leaf_interval(tu, tleaves, k, by)
            if iv:
                if iv[2]:
                    date_excluded[k] = iv[2][:3]
                else:
                    full[k] = (iv[0], iv[1])
        own_all = ranges_of(t) if t else {}
        own, own_excluded = {}, {}
        lay_asof = (by.get(uid) or {}).get('strength', {}).get('as_of') if uid in by else None
        for k, r in own_all.items():                                          # the unit's own verified total: a range that spans dates is not used on its wide span either
            bd = r.get('by_as_of') or {}
            if lay_asof and bd:
                sub = bd.get(lay_asof)
                if sub is None:
                    own_excluded[k] = 'no table figure is dated %s' % lay_asof
                else:
                    own[k] = [sub['low'], sub['high']]
            elif r.get('spans_dates'):
                own_excluded[k] = 'the range spans the dates %s and the layer names no date for this unit' % sorted(bd)
            else:
                own[k] = [r['low'], r['high']]
        ev = {'layer_sum': s_layer, 'layer_leaves_drawn': len(lay), 'layer_leaves': len(leaves), 'table_leaves': len(tleaves), 'table_leaf_sums': {k: list(v) for k, v in full.items()}, 'table_own_ranges': own,
              'unverified_table_leaves': sorted(x for x in tleaves if not ranges_of(tu[x]))[:10], 'sums_not_usable_for_want_of_a_date': date_excluded, 'own_ranges_not_usable_for_want_of_a_date': own_excluded}
        army = u['level'] == 'army'
        inside_leaf = [k for k, (a, b) in full.items() if a <= s_layer <= b]
        inside_own = [k for k, (a, b) in own.items() if a <= s_layer <= b]
        if not full and not (army and own) and not date_excluded and not (army and own_excluded):
            mk(rec, ctx, 'Q01.4', uid, 'default', 'BLOCKED-INPUT', 'input missing: the table has no verified range for %d of the %d units under it, so it has no roll-up to compare with (layer sum %d)' % (len([x for x in tleaves if not ranges_of(tu[x])]) or len(tleaves), len(tleaves), s_layer), ev)
            continue
        conds = []
        if full or date_excluded:
            conds.append(cond('the layer sum lies inside the sum of the table ranges of one kind (a range that spans dates only on the figure of the date the layer names, never on its wide span)', bool(inside_leaf),
                              ('layer %d, table sums %s%s' % (s_layer, {k: list(v) for k, v in full.items()}, '; not usable for want of a date: %s' % date_excluded if date_excluded else '')) if not inside_leaf else None))
        if army and (own or own_excluded):
            conds.append(cond('the army total lies inside the verified total', bool(inside_own), ('layer %d, table %s%s' % (s_layer, own, '; not usable for want of a date: %s' % own_excluded if own_excluded else '')) if not inside_own else None))
        bad = first_failed(conds)
        if bad:
            mk(rec, ctx, 'Q01.4', uid, 'default', 'FAIL', 'roll-up: ' + '; '.join(bad), ev)
        else:
            mk(rec, ctx, 'Q01.4', uid, 'default', 'PASS', 'the layer sum %d lies inside the sum of the verified ranges' % s_layer, ev)


def nof_record(ctx, uid):
    by = ctx['by']
    for a in chain(by, uid):
        if a in ctx['nof']:
            return a, ctx['nof'][a]
    return None, None


def q015_presence(rec, ctx, L, T):
    by = ctx['by']
    arr = (L.get('arrivals') or {}).get('default') or {}
    app = L.get('approach') or {}
    src = ctx['sources']
    for u in sorted(L['units'], key=lambda x: x['id']):
        uid = u['id']
        conds = []
        if u['status'] in OFF_FIELD:
            owner, nr = nof_record(ctx, uid)
            conds.append(cond('a not-on-the-field record (status, source) names the unit or a formation above it', nr is not None, 'no record in history/not_on_field.json or the documented absences' if nr is None else None, owner=owner))
            conds.append(cond('it is not drawn and has no arrivals record', not u['drawn'] and uid not in arr, 'drawn %s, arrivals record %s' % (u['drawn'], uid in arr)))
            ev = {'conditions': conds, 'record': nr}
        else:
            a = arr.get(uid)
            conds.append(cond('an arrivals record exists', a is not None, 'no record in the arrivals of the layer' if a is None else None))
            if a is not None:
                e, d, l = a.get('earliest'), a.get('default'), a.get('latest')
                conds.append(cond('window: earliest <= default <= latest, all given', all(isinstance(x, (int, float)) for x in (e, d, l)) and e <= d <= l, 'earliest %s, default %s, latest %s' % (e, d, l)))
                ks = a.get('sources') or []
                bad = [k for k in ks if k not in src]
                conds.append(cond('sources: at least one, and every key resolves in the layer\'s source list', bool(ks) and not bad, 'no source' if not ks else 'unknown keys %s' % bad))
                if u['children']:
                    leaves = [x for x in descendants_leaves(by, uid) if by[x]['drawn']]
                    ok = any((arr.get(x) or {}).get('entry') and app.get(x) for x in leaves)
                    conds.append(cond('place and route: a unit under it is drawn with an entry place and a road of approach', ok, 'no leaf unit under it has a place and a road' if not ok else None, leaves_drawn=len(leaves)))
                else:
                    conds.append(cond('place: the arrivals record gives the entry place', bool(a.get('entry')), (a.get('entry_status') or 'no entry place')[:200] if not a.get('entry') else None))
                    conds.append(cond('route: the road of approach is named', bool(app.get(uid)), 'no road of approach (open gap)' if not app.get(uid) else None))
            ev = {'conditions': conds, 'record': {k: a.get(k) for k in ('earliest', 'default', 'latest', 'entry', 'tier', 'sources')} if a else None, 'approach': app.get(uid)}
        bad = first_failed(conds)
        if not bad:
            ev.pop('conditions', None)
        if bad:
            mk(rec, ctx, 'Q01.5', uid, 'default', 'FAIL', 'presence window: ' + '; '.join(bad), dict(ev, layer_only_result='FAIL'))
        elif T is None:
            mk(rec, ctx, 'Q01.5', uid, 'default', 'BLOCKED-INPUT', MISSING + ' (layer-only finding: the arrivals record is complete)', dict(ev, layer_only_result='PASS', missing=TABLE_REL))
        else:
            mk(rec, ctx, 'Q01.5', uid, 'default', 'PASS', 'arrivals record with window, place, route and sources' if u['status'] not in OFF_FIELD else 'a not-on-the-field record; not drawn', ev)


def one_to_one_conditions(v):
    exp = v['expected_drawn']
    conds = [cond('rendered instances equal the present strength', v['rendered_when_present'] == exp, 'rendered %s, strength %s' % (v['rendered_when_present'], exp)),
             cond('an undrawn unit has no instance', v['drawn_flag'] or (v['world_count'] == 0 and v['crew_groups'] == 0), 'world count %s' % v['world_count']),
             cond('at every grid time evaluated the rendered count equals the present strength', not v['violations'] and not v.get('n_violations'), json.dumps(v['violations'][:2]) if v['violations'] else None, n=v.get('n_violations', len(v['violations'])))]
    ev_iv, st_iv = v.get('event_intervals') or [], v.get('present_intervals') or []
    if exp and ev_iv:
        inside = bool(st_iv) and st_iv[0][0] <= ev_iv[0][0] and (st_iv[0][1] is None or (ev_iv[0][1] is not None and st_iv[0][1] >= ev_iv[0][1]))
        conds.append(cond('the stage window contains the interval the layer events print (the unit is never hidden while the layer has it on the field)', inside, 'stage window %s, events %s' % (st_iv, ev_iv)))
    ev = {'expected': exp, 'world_count': v['world_count'], 'crew_groups': v['crew_groups'], 'rendered_when_present': v['rendered_when_present'], 'violations': v['violations'][:5]}
    if first_failed(conds):
        ev['conditions'] = conds
    return conds, ev


def q016_onetoone(rec, ctx, L, T):
    oo = L.get('onetoone') or {}
    scs = oo.get('scenarios') or {}
    for sid in sorted(scs):
        units = scs[sid].get('units') or {}
        if sid != 'default':
            # an exhaustive scan of every unit in one scenario: one item whose evidence lists every failing member (GATE-SPEC 1.1, K10)
            bad, n = [], 0
            for u in sorted(L['units'], key=lambda x: x['id']):
                v = units.get(u['id'])
                n += 1
                if v is None:
                    bad.append({'unit': u['id'], 'why': 'the node child reported nothing for this unit'})
                    continue
                conds, ev = one_to_one_conditions(v)
                if first_failed(conds):
                    bad.append({'unit': u['id'], 'why': '; '.join(first_failed(conds))[:300], 'violations': v['violations'][:2]})
            ev = {'units_checked': n, 'failing': bad, 'grid_times': scs[sid].get('times')}
            iid = 'units-scan/%s' % sid
            if bad:
                rec.item('Q01/Q01.6/%s/%s' % (iid, sid), 'FAIL', 'one-to-one in scenario %s: %d of %d units differ (%s)' % (sid, len(bad), n, ', '.join(b['unit'] for b in bad[:3])), dict(ev, layer_only_result='FAIL'), check='Q01.6', scenario=sid,
                         subjects=sorted(b['unit'] for b in bad), sub_requirements=ctx['rows'])
            elif T is None:
                rec.item('Q01/Q01.6/%s/%s' % (iid, sid), 'BLOCKED-INPUT', MISSING + ' (layer-only finding: all %d units equal their strength in scenario %s)' % (n, sid), dict(ev, layer_only_result='PASS', missing=TABLE_REL), check='Q01.6', scenario=sid,
                         subjects=['all-units'], sub_requirements=ctx['rows'])
            else:
                rec.item('Q01/Q01.6/%s/%s' % (iid, sid), 'PASS', 'every one of the %d units: rendered instances equal the present strength at every time evaluated in scenario %s' % (n, sid), ev, check='Q01.6', scenario=sid, subjects=['all-units'], sub_requirements=ctx['rows'])
            continue
        for u in sorted(L['units'], key=lambda x: x['id']):
            uid = u['id']
            v = units.get(uid)
            if v is None:
                mk(rec, ctx, 'Q01.6', '%s/%s' % (uid, sid), sid, 'FAIL', 'the node child reported nothing for this unit', {}, unit=uid)
                continue
            conds, ev = one_to_one_conditions(v)
            exp = v['expected_drawn']
            bad = first_failed(conds)
            if bad:
                mk(rec, ctx, 'Q01.6', '%s/%s' % (uid, sid), sid, 'FAIL', 'one-to-one: ' + '; '.join(bad), dict(ev, layer_only_result='FAIL'), unit=uid)
            elif T is None:
                mk(rec, ctx, 'Q01.6', '%s/%s' % (uid, sid), sid, 'BLOCKED-INPUT', MISSING + ' (layer-only finding: instances equal strength)', dict(ev, layer_only_result='PASS', missing=TABLE_REL), unit=uid)
            else:
                mk(rec, ctx, 'Q01.6', '%s/%s' % (uid, sid), sid, 'PASS', 'rendered instances equal the present strength (%d) at every time evaluated' % exp, ev, unit=uid)
    # world total and cap constants: two items for the whole product
    w = oo.get('world') or {}
    if w:
        ok = w.get('total_soldiers') == w.get('sum_strength_drawn') and oo.get('world_static', True)
        ev = {'world': w, 'world_static': oo.get('world_static')}
        res = ('FAIL' if not ok else ('BLOCKED-INPUT' if T is None else 'PASS'))
        reason = ('the world holds %s soldiers, the drawn strengths sum to %s%s' % (w.get('total_soldiers'), w.get('sum_strength_drawn'), '' if oo.get('world_static', True) else ' (and the world changed while the stage ran)')) if not ok else (
            MISSING + ' (layer-only finding: the world holds exactly the drawn strengths)' if T is None else 'the world holds exactly the sum of the drawn strengths')
        rec.item('Q01/Q01.6/world-total/default', res, reason, dict(ev, layer_only_result='PASS' if ok else 'FAIL'), check='Q01.6', scenario='default', subjects=['world'], sub_requirements=ctx['rows'])
    cs = oo.get('cap_scan') or L.get('cap_scan')
    if cs is not None:
        hits = cs.get('hits') or []
        ev = {'patterns': cs.get('patterns'), 'files_scanned': cs.get('files_scanned'), 'hits': hits[:10]}
        if hits:
            rec.item('Q01/Q01.6/cap-scan/default', 'FAIL', 'a cap constant on the figure count stands in the source: %s' % '; '.join('%s:%s %s' % (h['file'], h['line'], h['pattern']) for h in hits[:3]), dict(ev, layer_only_result='FAIL'), check='Q01.6', scenario='default', subjects=['world'], sub_requirements=ctx['rows'])
        elif T is None:
            rec.item('Q01/Q01.6/cap-scan/default', 'BLOCKED-INPUT', MISSING + ' (layer-only finding: no cap constant in %s files)' % cs.get('files_scanned'), dict(ev, layer_only_result='PASS', missing=TABLE_REL), check='Q01.6', scenario='default', subjects=['world'], sub_requirements=ctx['rows'])
        else:
            rec.item('Q01/Q01.6/cap-scan/default', 'PASS', 'no cap constant on the figure count in %s source files' % cs.get('files_scanned'), ev, check='Q01.6', scenario='default', subjects=['world'], sub_requirements=ctx['rows'])


def q017_commanders(rec, ctx, L, T):
    by, tu = ctx['by'], ctx['tu']
    for u in sorted(L['units'], key=lambda x: x['id']):
        uid = u['id']
        if T is None:
            mk(rec, ctx, 'Q01.7', uid, 'default', 'BLOCKED-INPUT', MISSING, {'missing': TABLE_REL, 'layer_commanders': u['commanders']})
            continue
        t = tu.get(uid)
        if t is None:
            mk(rec, ctx, 'Q01.7', uid, 'default', 'BLOCKED-INPUT', 'input missing: no table row for this unit (see Q01.2): no verified commander to compare with', {'layer_commanders': u['commanders']})
            continue
        cm = t.get('commanders') or []
        if not cm:
            mk(rec, ctx, 'Q01.7', uid, 'default', 'BLOCKED-INPUT', 'input missing: the table row has no verified commander (field status %s)' % (t.get('fields') or {}).get('commander'), {'layer_commanders': u['commanders'], 'table_status': t.get('status')})
            continue
        orders = {}
        for c in cm:
            orders.setdefault(c.get('order'), set()).add(table_surname(c.get('name')))
        tset = set().union(*orders.values())
        lset = surnames(u['commanders'])
        conds = []
        if not u['commanders']:
            conds.append(cond('the layer holds the commander', False, 'the layer holds no commander for this unit; the table has %s' % sorted(tset)))
        else:
            missing = sorted(o for o, names in orders.items() if not (names & lset))
            extra = sorted(lset - tset)
            conds.append(cond('every commander of the table (by order of succession) is in the layer', not missing, 'orders with no match in the layer: %s (layer %s, table %s)' % (missing, sorted(lset), {o: sorted(n) for o, n in orders.items()}) if missing else None))
            conds.append(cond('the layer names no commander that the table does not', not extra, 'layer-only surnames %s' % extra if extra else None))
        lc, tc = [a for a in chain(by, uid)[1:] if by[a]['level'] in ('corps', 'division', 'brigade')], [a for a in chain(tu, uid)[1:] if tu[a].get('level') in ('corps', 'division', 'brigade')]
        conds.append(cond('assignment: the chain of corps, division and brigade equals the table\'s', lc == tc, 'layer %s, table %s' % (lc, tc) if lc != tc else None))
        bad = first_failed(conds)
        ev = {'conditions': conds, 'layer_commanders': u['commanders'], 'table_commanders': [(c.get('order'), c.get('name'), c.get('rank'), c.get('tier')) for c in cm]}
        if bad:
            mk(rec, ctx, 'Q01.7', uid, 'default', 'FAIL', 'commander and assignment: ' + '; '.join(bad), ev)
        else:
            mk(rec, ctx, 'Q01.7', uid, 'default', 'PASS', 'commanders and the chain of command equal the table', ev)


# ======================================================================================== the run
def evaluate(rec, env, L, T, matcher=None, evidence=None, k1=None, max_words=14):
    ctx = build_context(rec, env, L, T)
    if T is None:
        rec.item('Q01/Q01.1/table/default', 'BLOCKED-INPUT', MISSING, {'missing': TABLE_REL}, check='Q01.1', scenario='default', subjects=['table'], sub_requirements=ctx['rows'])
    else:
        check_table(rec, env, T, matcher, evidence, k1, max_words)
    q012_unit_set(rec, ctx, L, T)
    q013_strength(rec, ctx, L, T)
    q014_rollups(rec, ctx, L, T)
    q015_presence(rec, ctx, L, T)
    q016_onetoone(rec, ctx, L, T)
    q017_commanders(rec, ctx, L, T)
    ss = L.get('scenario_set') or {}
    grid = (L.get('onetoone') or {}).get('grid') or {}
    if not ss.get('complete'):
        rec.incomplete('scenario set: %s (%s)' % (ss.get('id'), ss.get('note') or 'not S*'))
        rec.owe('Q01.6: the scenario set S* (every combination of source-conflict values inside each interaction group) was not enumerated; this run covered %s scenario(s): %s' % (ss.get('count'), ss.get('note')))
    if not grid.get('exact_by_breakpoints'):
        rec.incomplete('time grid: %s of %s integer minutes evaluated directly (%s)' % (grid.get('evaluated_points'), grid.get('grid_minutes'), grid.get('mode')))
        rec.owe('Q01.6: the dense scan of every integer minute of the window (and one second either side of every boundary) was not run; heavy: run through tools/horde/bench.sh')
    rec.extra['scenario_set'] = ss
    rec.extra['time_grid'] = {'step_s': grid.get('step_s', 60), 'boundaries': True, 'fraction_done': round((grid.get('evaluated_points') or 0) / float(grid.get('grid_minutes') or 1), 6), 'mode': grid.get('mode'),
                              'evaluated_points': grid.get('evaluated_points'), 'grid_minutes': grid.get('grid_minutes'), 'exact_by_breakpoints': bool(grid.get('exact_by_breakpoints'))}
    rec.owe('Q01 needs `kit/verified_oob.json` to be written by its owner before any Q01.1 to Q01.4 or Q01.7 item can leave BLOCKED-INPUT; until then the verdict is INCOMPLETE') if T is None else None


def default_matcher(env):
    """The text store of lib/extracts.py (Official Records, state volumes, acquisition ledgers), or None when it cannot be built."""
    try:
        from extracts import TextStore  # noqa: PLC0415
        return TextStore(env)
    except Exception:
        return None


def run(env, layer=None, table='load', matcher='default', evidence=None, write=True, mutate=None, scenarios='sample', argv=None, k1_classes=None, table_path=None):
    rec = Record(GATE, env, renderer_class='mixed', argv=argv)
    rec.tool_versions['node'] = node_version()
    for rel in ('history/units.json', 'history/arrivals.json', 'history/not_on_field.json', 'app/data/placement-claims.json', 'GOVERNANCE/conflicts_structured.json', 'kit/evidence/sources.json',
                'app/src/history/real.mjs', 'app/src/history/strength.mjs', 'app/src/history/arrivals.mjs', 'app/src/world-from-units.mjs', 'app/src/stage.mjs'):
        rec.add_input(env.btp(rel), 'data' if rel.endswith('.json') else 'code')
    for fn in ('q01_oob.py', 'q01_layer.mjs', 'oob_layer_lib.mjs', 'oobgates_common.py'):
        rec.add_input(os.path.join(HERE, fn), 'runner')
    runner_version(rec, [os.path.join(HERE, fn) for fn in ('q01_oob.py', 'q01_layer.mjs', 'oob_layer_lib.mjs', 'oobgates_common.py')])
    reg = load_thresholds(env)
    if reg:
        rec.add_input(reg['path'], 'thresholds')
    max_words = threshold_value(rec, reg, 'T-Q02-1', 'max_words', 14, 'PLAN p. 134, E.6 (the repository working limit is 14 words)')
    T = None
    if table == 'load':
        tf = table_path or env.btp(TABLE_REL)
        try:
            T = rec.read_json(tf, 'table')
        except InputMissing:
            T = None
    else:
        T = table
    if layer is None:
        layer = layer_dump(env, 'q01_layer.mjs', ['--scenarios', scenarios], mutate=mutate)
    if matcher == 'default':
        matcher = default_matcher(env) if T is not None else None
    evaluate(rec, env, layer, T, matcher, evidence, k1_classes, max_words)
    rec.extra['table'] = {'path': env.rel(table_path) if table_path else 'docs/battle-theatre/' + TABLE_REL, 'present': T is not None, 'schema': (T or {}).get('schema'), 'units': len((T or {}).get('units') or {}), 'diagnostic_copy': bool(table_path)}
    if table_path:
        rec.note('DIAGNOSTIC RUN: the table was read from %s, not from kit/verified_oob.json; this record is not the gate result' % env.rel(table_path))
    out = rec.finish()
    if write:
        rec.write(out)
    return rec, out


def main(argv=None):
    ap = base_parser(__doc__.split('\n')[0])
    ap.add_argument('--scenarios', default='sample', choices=['default', 'sample', 'ofat'], help='scenario set of Q01.6 (default: sample = default and six samples; none of them is S*)')
    ap.add_argument('--mutate', default=None, help='test hook: a module that injects a defect into the real pipeline (see oob_layer_lib.mjs)')
    ap.add_argument('--table', default=None, help='diagnostic: read the table from this path (for example a scratch build of kit_verified.py); refused when the record would go to GOVERNANCE/gate_results')
    a = ap.parse_args(argv)
    env = Env(root=a.root, out=a.out)
    if a.table and os.path.abspath(env.out) == os.path.abspath(os.path.join(env.gov, 'gate_results')) and not a.no_write:
        sys.stderr.write('refused: --table is a diagnostic; give --out <scratch folder> or --no-write\n')
        return 3
    rec, out = run(env, write=not a.no_write, mutate=a.mutate, scenarios=a.scenarios, table_path=a.table, argv=['python3', 'tools/bt/gates/q01_oob.py'] + list(argv if argv is not None else sys.argv[1:]))
    if not a.quiet:
        c = out['counts']
        print('Q01 verdict %s: %d items, PASS %d, COVERED %d, FAIL %d, NOT-RUN %d, BLOCKED-INPUT %d, N/A %d' % (out['verdict'], out['totals']['items'], c['PASS'], c['COVERED'], c['FAIL'], c['NOT-RUN'], c['BLOCKED-INPUT'], c['N/A']))
    return {'PASS': 0, 'FAIL': 1, 'INCOMPLETE': 2}[out['verdict']]


if __name__ == '__main__':
    guarded_main(main)
