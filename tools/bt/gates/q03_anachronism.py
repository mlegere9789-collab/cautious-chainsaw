#!/usr/bin/env python3
"""Gate Q03, no anachronisms: "every item in every manifest is valid on its date and for its unit (dress, arms, badges, flags, equipment, vehicles, structures); every 1863 structure exists on its date; no modern object appears."

Defined by docs/battle-theatre/GOVERNANCE/gate_results/GATE-SPEC.md (Q03.1 to Q03.7, 4.6 PE, 3.2 global assertions, U-03, U-10, U-21, U-25, X-11, A-33).
Command:  python3 tools/bt/gates/q03_anachronism.py [--root DIR] [--out DIR] [--scene-dump FILE] [--figures-export FILE] [--flags-map FILE] [--no-write]
          Heavy (about 300 s of CPU: the validator over 23,112 population manifests, the date scan, 127,852 drawn figures, a node child that builds the real structures model and, with the layer,
          the artillery train): run it through tools/horde/bench.sh in the background. No network.
Output:   docs/battle-theatre/GOVERNANCE/gate_results/Q03.json   (schema bt-gate-result/1; items id, pass, reason, evidence; counts; input hashes)

What it reads (the product's data and the product's code, never a copy of either):
  kit/*.json                    the B.6.12 validator of tools/bt/check_kit.py (manifest_for, validate_manifest, data_checks, self_tests) over every kit unit and variant
  app/tools/export-figures.mjs  (node) the figures the shell draws, with the digest of every manifest the app's own JS port makes; every drawn figure is re-made and validated here
  q03_scene.mjs                 (node) the app's flag code and statute count, its state engine at every integer minute, the structures model on the real terrain, the later-memorial layer, the artillery train
  structures/*.json, app/data/structures3d.json, docs/basemap1863/features (the registry with present_1863), terrain/terrain_sources.json, history/units.json
  GOVERNANCE/ground_audit/audit.json   (to be produced by the terrain work; contract in GOVERNANCE/horde/requests/bt-gates-q03-ground-audit-contract.md)

Checks and items (an item is never coarser than the gate text allows):
  Q03.1  kit-specs, validator-selftests, unit/<kit unit>[/<variant>] (every present unit, the three battle days, 24 soldiers across the ranks), absent/<kit unit>, drawn/<history unit>[/<variant>]
         (every figure the shell draws), flag/<flag class> (a validator flag is acceptable only when every variant passes and the flag is marked and registered), class7-turntable-audit
  Q03.2  validity-census (K.9: every kit item has valid_from and valid_to), date/<day> (every present unit on every scene day of U-06), stars/<day> (the national colour against the statute),
         anv-stars/<scenario>, epilogue days with no manifest are BLOCKED-INPUT
  Q03.3  object/<id> (every structure the scene draws: registry, existence start, existence end, state schedule), record/<id> (bld-, H-, RD-, FEN- records)
  Q03.4  registry/<class> (valid_from after the scene date, classes absent in 1863), avenues, memorial-layer, ground-audit (b), ground-disclosure
  Q03.5  <P id> (present at frame one, never constructed, in every scenario, in the engine and in the draw lists)
  Q03.6  the ten known corrections, each its own item
  Q03.7  <vehicle kind>/<army> for what the artillery train draws; ambulances and supply wagons are not drawn (N/A)

Exit code: 0 PASS, 1 FAIL, 2 INCOMPLETE, 3 runner error.
"""
import json
import os
import re
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
TOOLS = os.path.abspath(os.path.join(HERE, '..'))
for _p in (HERE, os.path.join(HERE, 'lib'), TOOLS):
    if _p not in sys.path:
        sys.path.insert(0, _p)

import pq_common as pq  # noqa: E402
import oobgates_common as og  # noqa: E402
import q03_structures as q3s  # noqa: E402

GATE = 'Q03'
BATTLE_DATES = ['1863-06-%02d' % d for d in range(26, 31)] + ['1863-07-%02d' % d for d in range(1, 15)]
EPILOGUE_DATES = ['1863-11-18', '1863-11-19']
SCENE_DATES = BATTLE_DATES + EPILOGUE_DATES
POP_DATES = ('1863-07-01', '1863-07-02', '1863-07-03')            # the three battle days of check_kit.population_test
RANKS24 = ['private'] * 14 + ['corporal'] * 4 + ['sergeant', 'first sergeant', 'lieutenant', 'captain', 'field officer', 'general']
RANKS8 = ['private', 'corporal', 'sergeant', 'first sergeant', 'lieutenant', 'captain', 'field officer', 'general']
SEED = 1863
UNIT_FILTER = None            # a compiled regex set by --units: restricts the kit units scanned (the verdict is then INCOMPLETE)


def in_scope(uid):
    return UNIT_FILTER is None or UNIT_FILTER.search(uid) is not None
UNIT_TOP_ROWS = ('R04.0000', 'R10.0000', 'R17.0000')
STRUCT_TOP_ROWS = ('R02.0000', 'R13.0000')

# the seven failure classes of B.6.12 (p. 76), by the code of the finding
CLASS_NAMES = {1: 'presence', 2: 'anachronism list', 3: 'wrong-unit items', 4: 'branch correctness', 5: 'tier completeness', 6: 'reproducibility', 7: 'sample audit', 0: 'other'}


def finding_class(code):
    if code.startswith(('PRESENCE_', 'UNKNOWN_UNIT')):
        return 1
    if code.startswith('ANACH_'):
        return 2
    if code.startswith(('WRONG_', 'UNKNOWN_ITEM', 'DISPUTED_VARIANT', 'HARD_LIMIT', 'RANK_RULE')):
        return 3
    if code.startswith('BRANCH_'):
        return 4
    if code.startswith('TIER_'):
        return 5
    return 0


# what each validator flag leaves in the manifest the product shows on the figure card (the manifest's `flags`, ui/card-sections.mjs)
FLAG_MARKERS = {
    'DISPUTED_FLAGGED': lambda fl: any(f.startswith('disputed:') for f in fl),
    'FLAG_BADGE_UNRESOLVED': lambda fl: any(f.startswith('gap_placeholder:') for f in fl),
    'FLAG_KEPI_PRIVATE_PURCHASE': lambda fl: 'private_purchase_exception' in fl,
    'FLAG_WHITWORTH_EXCEPTION': lambda fl: 'flagged_exception:whitworth' in fl,
    'FLAG_SPENCER_DISPUTED_WINDOW': lambda fl: any(f.startswith('flagged_entry:spencer') for f in fl),
}


class Validators:
    """The tools/bt validators, imported once; the DATA they read comes from the root under test (a scratch root in the tests), the code is the repository's."""

    def __init__(self, env):
        import check_kit
        import gen_golden_manifests
        self.CK, self.GG = check_kit, gen_golden_manifests
        self.env = env
        self.CA = self.CS = None
        self.arrivals_error = self.structures_error = None
        try:
            import check_arrivals
            check_arrivals.HIST = env.btp('history')
            check_arrivals.REG = os.path.join(env.gov, 'conflicts_structured.json')
            check_arrivals._D.clear()
            self.CA = check_arrivals
        except Exception as e:  # noqa: BLE001
            self.arrivals_error = '%s: %s' % (type(e).__name__, e)
        try:
            import check_structures
            check_structures.DIR = env.btp('structures')
            check_structures._data.cache_clear()
            self.CS = check_structures
        except Exception as e:  # noqa: BLE001
            self.structures_error = '%s: %s' % (type(e).__name__, e)


def sha(s):
    import hashlib
    return hashlib.sha256(s.encode('utf-8')).hexdigest()[:24]


# =================================================================================================== sub-requirement rows
class Rows:
    def __init__(self, env):
        self.rows, self.all_ids = og.gate_rows(env, GATE)
        self.have = set(self.all_ids)

    def unit(self, subject=None):
        out = [r for r in UNIT_TOP_ROWS if r in self.have]
        for p in ('R10', 'R17'):
            rid = '%s.U-%s' % (p, subject)
            if subject and rid in self.have:
                out.append(rid)
        return sorted(set(out))

    def struct(self, subject=None):
        out = [r for r in STRUCT_TOP_ROWS if r in self.have]
        rid = 'R13.%s' % subject
        if subject and rid in self.have:
            out.append(rid)
        return sorted(set(out))


# =================================================================================================== evidence sidecars
class Side:
    """Large member lists go to a sidecar under <out>/evidence/Q03/ (GATE-SPEC 1.6); with --no-write nothing is written and the list stays inline (cut)."""

    def __init__(self, rec, no_write):
        self.rec, self.no_write = rec, no_write

    def __call__(self, name, rows, inline=25):
        rows = sorted(rows, key=lambda r: json.dumps(r, sort_keys=True))
        if self.no_write or len(rows) <= inline:
            return {'members': rows[:inline], 'n': len(rows)} if len(rows) > inline else {'members': rows, 'n': len(rows)}
        d = self.rec.sidecar(name, rows)
        d['members'] = rows[:inline]
        d['n'] = len(rows)
        return d


# =================================================================================================== Q03.1
def kit_specs(V, rec, kit, R):
    CK = V.CK
    try:
        errs, warns, info = CK.data_checks(kit)
    except Exception as e:  # noqa: BLE001
        rec.item('Q03/Q03.1/kit-specs', 'BLOCKED-INPUT', 'input missing: the kit data cannot be checked (%s: %s)' % (type(e).__name__, str(e)[:120]), {}, check='Q03.1', sub_requirements=R.unit())
        return None
    ev = {'units': len(kit.units), 'items': len(kit.items), 'weapons': len(kit.weapons), 'fields_checked': info.get('fields_checked'), 'errors': len(errs), 'warnings': len(warns),
          'error_list': [list(e) for e in errs[:30]], 'warning_list': [list(w) for w in warns[:30]], 'note': 'the warnings are printed defects of the plan and open items of the data, listed and not hidden'}
    if errs:
        rec.item('Q03/Q03.1/kit-specs', 'FAIL', '%d data ERROR(s) in the kit specs (first: %s: %s)' % (len(errs), errs[0][0], errs[0][1][:160]), ev, check='Q03.1', sub_requirements=R.unit())
    else:
        rec.item('Q03/Q03.1/kit-specs', 'PASS', 'check_kit.data_checks: 0 ERROR over %d units, %d items, %d weapons (%d warnings listed in the evidence)' % (len(kit.units), len(kit.items), len(kit.weapons), len(warns)), ev, check='Q03.1', sub_requirements=R.unit())
    return info


def validator_selftests(V, rec, kit, R, skip):
    CK = V.CK
    if skip:
        rec.item('Q03/Q03.1/validator-selftests', 'NOT-RUN', 'the validator self-tests (the gate\'s own negative controls) were skipped by --skip-selftests', {'skipped': True}, check='Q03.1', sub_requirements=R.unit())
        rec.incomplete('the validator self-tests were skipped')
        return
    CK._KIT = kit
    try:
        res = CK.self_tests(kit)
    except Exception as e:  # noqa: BLE001
        rec.item('Q03/Q03.1/validator-selftests', 'BLOCKED-INPUT', 'input missing: the validator self-tests could not run (%s: %s)' % (type(e).__name__, str(e)[:140]), {}, check='Q03.1', sub_requirements=R.unit())
        return
    bad = [(n, d) for n, ok, d in res if not ok]
    ev = {'tests': len(res), 'failed': [{'test': n, 'detail': str(d)[:200]} for n, d in bad[:20]]}
    if bad:
        rec.item('Q03/Q03.1/validator-selftests', 'FAIL', '%d of %d self-tests of the B.6.12 validator fail (first: %s)' % (len(bad), len(res), bad[0][0]), ev, check='Q03.1', sub_requirements=R.unit())
    else:
        rec.item('Q03/Q03.1/validator-selftests', 'PASS', 'all %d self-tests of the B.6.12 validator pass (they include the injected anachronisms and the fault injections the validator must catch)' % len(res), ev, check='Q03.1', sub_requirements=R.unit())


class FlagPolicy:
    """A validator flag is acceptable only when every variant passes and the flag is marked and registered (GATE-SPEC Q03.1)."""

    def __init__(self, env, rec, flag_map, card_text):
        self.env, self.rec, self.map, self.card_text = env, rec, flag_map, card_text
        self.cache = {}

    def shown_on_card(self):
        if self.card_text is None:
            return False, 'input missing: app/src/ui/card-sections.mjs (the code that shows the manifest flags on the figure card)'
        if re.search(r'Object\.entries\(\s*s\.flags\s*\)', self.card_text):
            return True, None
        return False, 'the figure card code does not read the flags of the unit summary (no Object.entries(s.flags) in app/src/ui/card-sections.mjs)'

    def register_ids(self, code, disputes):
        spec = (self.map.get('flags') or {}).get(code) or {}
        ids = list(spec.get('register_ids') or [])
        for d in disputes or []:
            ids += list((spec.get('by_dispute') or {}).get(d) or [])
        return sorted(set(ids)), spec

    def judge(self, code, disputes=()):
        key = (code, tuple(sorted(disputes or ())) if code == 'DISPUTED_FLAGGED' else ())
        if key in self.cache:
            return self.cache[key]
        reasons, ev = [], {'flag': code}
        if code not in FLAG_MARKERS:
            reasons.append('no marker rule exists for the flag class %s' % code)
        ok_card, why = self.shown_on_card()
        if not ok_card:
            reasons.append(why)
        ids, spec = self.register_ids(code, disputes)
        ev['register_ids'] = ids
        ev['basis'] = spec.get('basis')
        if not ids:
            reasons.append('no register entry names this flag class%s (q03_flags.json maps none)' % (' for ' + ','.join(disputes) if disputes else ''))
        else:
            ok, why_list, states = og.covered_by_register(self.env, ids)
            ev['register'] = [{k: s[k] for k in ('id', 'status', 'open', 'fields_ok', 'owner_q_ok', 'missing_fields', 'search_log')} for s in states]
            # L1 (open, complete record with owner_q) is what "registered" needs here; the dated search log is L3 (b) and is Q18's, so it is not demanded for the flag
            bad = [s for s in states if not (s['open'] and s['fields_ok'] and s['owner_q_ok'])]
            for s in bad:
                if not s['in_index'] and not s['file']:
                    reasons.append('%s: no such register entry' % s['id'])
                elif not s['open']:
                    reasons.append('%s: status %s (not open)' % (s['id'], s['status']))
                else:
                    reasons.append('%s: the record is incomplete (missing %s)' % (s['id'], ', '.join(s['missing_fields'] + ([] if s['owner_q_ok'] else ['owner_q'])) or 'owner_q'))
        res = (not reasons, reasons, ev)
        self.cache[key] = res
        return res


class Stats:
    def __init__(self):
        self.n = 0
        self.fail = {}
        self.flag = {}
        self.unmarked = {}
        self.cls = {}
        self.repro = [0, 0]
        self.samples = []
        self.raised = []
        self.disputes = []

    def add(self, m, findings, sid):
        self.n += 1
        fl = m.get('flags', [])
        for f in findings:
            c = f['code']
            if f['severity'] == 'FAIL':
                self.fail[c] = self.fail.get(c, 0) + 1
                k = finding_class(c)
                self.cls[k] = self.cls.get(k, 0) + 1
                if len(self.samples) < 4:
                    self.samples.append('%s %s: %s' % (sid, c, f['msg'][:110]))
            else:
                self.flag[c] = self.flag.get(c, 0) + 1
                chk = FLAG_MARKERS.get(c)
                if chk is None or not chk(fl):
                    self.unmarked[c] = self.unmarked.get(c, 0) + 1

    def evidence(self):
        return {'manifests': self.n, 'fail_codes': dict(sorted(self.fail.items())), 'fail_by_class': {CLASS_NAMES[k]: v for k, v in sorted(self.cls.items())}, 'flag_codes': dict(sorted(self.flag.items())),
                'flags_without_manifest_marker': dict(sorted(self.unmarked.items())), 'reproducibility': {'checked': self.repro[0], 'mismatch': self.repro[1]}, 'samples': self.samples, 'generation_errors': self.raised[:5]}


def judge_unit(rec, iid, st, u, fp, check, subjects, sub_req, extra=None):
    """One item from the statistics of a (unit, variant): FAIL findings, generation errors, reproducibility, the flags."""
    reasons = []
    if st.raised:
        reasons.append('manifest generation raised: %s' % st.raised[0])
    if st.fail:
        reasons.append('%d FAIL finding(s) (%s)' % (sum(st.fail.values()), ', '.join('%s %d' % (k, v) for k, v in sorted(st.fail.items())[:4])))
    if st.repro[1]:
        reasons.append('class 6: %d of %d regenerated manifests differ from the first (not reproducible)' % (st.repro[1], st.repro[0]))
    ev = st.evidence()
    if extra:
        ev.update(extra)
    flag_reasons = []
    if st.flag:
        disputes = list(u.get('dispute_ids') or [])
        ev['flag_judgement'] = {}
        for code in sorted(st.flag):
            ok, why, fev = fp.judge(code, disputes)
            ev['flag_judgement'][code] = {'acceptable': ok and code not in st.unmarked, 'reasons': why}
            if code in st.unmarked:
                flag_reasons.append('%s on %d manifest(s) is not marked in the manifest the card shows' % (code, st.unmarked[code]))
            if not ok:
                flag_reasons.append('%s: %s' % (code, '; '.join(why)))
    if reasons or flag_reasons:
        rec.item(iid, 'FAIL', '; '.join(reasons + flag_reasons)[:600], ev, check=check, subjects=subjects, sub_requirements=sub_req)
        return False
    msg = 'every one of the %d manifests validates: 0 FAIL, reproducible' % st.n
    if st.flag:
        msg += ', and the flags (%s) are marked and registered' % ', '.join(sorted(st.flag))
    rec.item(iid, 'PASS', msg, ev, check=check, subjects=subjects, sub_requirements=sub_req)
    return True


def population(V, rec, kit, R, fp):
    """Every present kit unit, every variant of a disputed one: 24 soldiers across the ranks on each of the three battle days (check_kit.population_test), per unit and variant."""
    CK, GG = V.CK, V.GG
    results = {}
    for uid, u in sorted(kit.units.items()):
        if u['presence']['status'] != 'present_at_gettysburg' or not in_scope(uid):
            continue
        variants = list(u['variants']) if u.get('variants') else [None]
        for var in variants:
            st = Stats()
            st.disputes = list(u.get('dispute_ids') or [])
            for date in POP_DATES:
                for i in range(24):
                    sid = '%s:%s:%04d' % (uid, date[-2:], i)
                    try:
                        m = CK.manifest_for(sid, uid, SEED, date=date, rank=RANKS24[i % 24], variant=var, kit=kit)
                    except Exception as e:  # noqa: BLE001
                        st.raised.append('%s: %s: %s' % (sid, type(e).__name__, str(e)[:100]))
                        break
                    st.add(m, CK.validate_manifest(m, kit=kit), sid)
                    if i == 0:
                        m2 = CK.manifest_for(sid, uid, SEED, date=date, rank=RANKS24[0], variant=var, kit=kit)
                        st.repro[0] += 1
                        if GG.canon(m) != GG.canon(m2):
                            st.repro[1] += 1
            extra = {'kit_unit': uid, 'variant': var, 'dates': list(POP_DATES), 'soldiers_per_date': 24, 'branch': u.get('branch'), 'army': u.get('army')}
            if var is not None:
                try:
                    CK.manifest_for('S-1', uid, SEED, kit=kit)
                    extra['no_default_variant_refused'] = False
                    st.raised.append('a disputed unit made a manifest without a selected variant: a default was chosen')
                except ValueError:
                    extra['no_default_variant_refused'] = True
            iid = 'Q03/Q03.1/unit/%s%s' % (uid, '/' + var if var else '')
            ok = judge_unit(rec, iid, st, u, fp, 'Q03.1', [uid], R.unit(None), extra)
            results[(uid, var)] = {'ok': ok, 'stats': st}
    return results


def absent_units(V, rec, kit, R):
    CK = V.CK
    for uid, u in sorted(kit.units.items()):
        if u['presence']['status'] == 'present_at_gettysburg' or not in_scope(uid):
            continue
        refused = False
        try:
            CK.manifest_for('S-1', uid, SEED, kit=kit)
        except ValueError:
            refused = True
        codes = sorted({f['code'] for f in CK.validate_manifest(CK.mk(kit, uid), kit=kit) if f['severity'] == 'FAIL'})
        ev = {'kit_unit': uid, 'presence': u['presence']['status'], 'manifest_for_refuses': refused, 'validator_fail_codes': codes}
        if refused and 'PRESENCE_ABSENT_UNIT' in codes:
            rec.item('Q03/Q03.1/absent/%s' % uid, 'PASS', 'the unit is %s: manifest_for refuses to make a soldier and the validator fails any manifest of it (PRESENCE_ABSENT_UNIT)' % u['presence']['status'], ev, check='Q03.1', subjects=[uid], sub_requirements=R.unit(None))
        else:
            rec.item('Q03/Q03.1/absent/%s' % uid, 'FAIL', 'the unit is %s but %s' % (u['presence']['status'], ('manifest_for made a soldier' if not refused else '') + ('; ' if not refused and 'PRESENCE_ABSENT_UNIT' not in codes else '') + ('the validator does not fail a manifest of it' if 'PRESENCE_ABSENT_UNIT' not in codes else '')), ev, check='Q03.1', subjects=[uid], sub_requirements=R.unit(None))


def drawn_figures(env, V, rec, kit, R, fp, exp):
    """Every figure the shell draws (the export of app/tools/export-figures.mjs): re-made here with the reference generator, compared with the digest of the app's JS port, validated with the presence
    test bound to the unit's arrival gate, and refused on the day before arrival (the negative control). Same method as tools/bt/check_figures.py, with one item per drawn unit and variant."""
    CK, GG, CA = V.CK, V.GG, V.CA
    GG.add_defaults(kit)
    seed = exp['seed']
    results = {}
    if CA is None:
        rec.item('Q03/Q03.1/drawn-figures', 'BLOCKED-INPUT', 'input missing: tools/bt/check_arrivals.py (the arrival gate the presence test is bound to): %s' % V.arrivals_error, {}, check='Q03.1', sub_requirements=R.unit(None))
        return results
    from datetime import datetime

    def prev_day(d):
        y, m, dd = map(int, d.split('-'))
        dd -= 1
        if dd == 0:
            m -= 1
            dd = 30 if m == 6 else 31
        return '%04d-%02d-%02d' % (y, m, dd)

    for u in exp['units']:
        if not in_scope(u['id']) and not in_scope(u['kit_unit']):
            continue
        hid, ku, date, n = u['id'], u['kit_unit'], u['date'], u['figures']
        variants = u['variants'] or [None]
        if ku not in kit.units:
            rec.item('Q03/Q03.1/drawn/%s' % hid, 'FAIL', 'the unit draws %d figures from kit unit %s, which is not in the kit data' % (n, ku), {'history_unit': hid, 'kit_unit': ku, 'figures': n}, check='Q03.1', subjects=[hid], sub_requirements=R.unit(hid))
            continue
        ent = kit.units[ku]

        def pres(_uid, d, hid=hid):
            return CA.presence_ok(hid, d + 'T23:59', 'default')
        for var in variants:
            st = Stats()
            st.disputes = list(ent.get('dispute_ids') or [])
            digs = []
            for k in range(n):
                sid = '%s:%04d' % (hid, k)
                try:
                    m = CK.manifest_for(sid, ku, seed, date=date, rank=exp['rank'], role=exp['role'], variant=var, kit=kit)
                except Exception as e:  # noqa: BLE001
                    st.raised.append('%s: %s: %s' % (sid, type(e).__name__, str(e)[:100]))
                    break
                digs.append(sha(GG.canon(m)))
                try:
                    findings = CK.validate_manifest(m, presence_fn=pres, kit=kit)
                except Exception as e:  # noqa: BLE001
                    st.raised.append('%s: presence test raised %s: %s' % (sid, type(e).__name__, str(e)[:100]))
                    break
                st.add(m, findings, sid)
            extra = {'history_unit': hid, 'kit_unit': ku, 'variant': var, 'figures': n, 'date': date, 'kit_how': u.get('how'), 'default_kit': bool(u.get('default')), 'disputed': bool(u.get('disputed'))}
            want = (u['variant_digests'] or {}).get(var) if var else u.get('digest')
            if not st.raised and want is not None:
                same = sha(''.join(digs)) == want
                extra['digest_equal_to_app_port'] = same
                st.repro[0] += 1
                if not same:
                    st.repro[1] += 1
                    st.samples.append('the app\'s JS port makes other manifests than the reference generator (digest differs)')
            elif want is None:
                extra['digest_equal_to_app_port'] = None
                st.raised.append('the export carries no digest of the app\'s manifests for this unit')
            # the negative control: the manifest of the day before the unit's first day must be refused by the presence test
            try:
                m0 = CK.manifest_for('%s:0000' % hid, ku, seed, date=prev_day(date), rank='private', role='rifleman', variant=variants[0], kit=kit)
                codes = [f['code'] for f in CK.validate_manifest(m0, presence_fn=pres, kit=kit)]
                extra['day_before_arrival_refused'] = 'PRESENCE_TIME' in codes
                if 'PRESENCE_TIME' not in codes:
                    st.samples.append('the manifest of the day before arrival (%s) was not refused by the presence test' % prev_day(date))
                    st.fail['PRESENCE_TIME_NOT_ENFORCED'] = st.fail.get('PRESENCE_TIME_NOT_ENFORCED', 0) + 1
                    st.cls[1] = st.cls.get(1, 0) + 1
            except Exception as e:  # noqa: BLE001
                st.raised.append('the day-before control raised %s' % type(e).__name__)
            # the shell's gate must not be earlier than the arrival checker's, and the checker must have the unit present at the shell's gate (Q04 seen from the manifest)
            try:
                pg, _o = CA.gate_time(hid, 'default')
                e_ = datetime.strptime(u['earliest_iso'], '%Y-%m-%dT%H:%M')
                extra['shell_gate_not_earlier_than_checker'] = (pg is None) or (datetime.strptime(pg[:16], '%Y-%m-%dT%H:%M') <= e_)
                extra['checker_has_unit_at_shell_gate'] = bool(CA.presence_ok(hid, u['earliest_iso'], 'default'))
                for cond, key, msg in ((extra['shell_gate_not_earlier_than_checker'], 'SHELL_GATE_EARLIER_THAN_CHECKER', 'the shell gate %s is earlier than the arrival checker\'s gate %s' % (u['earliest_iso'], pg)),
                                       (extra['checker_has_unit_at_shell_gate'], 'CHECKER_ABSENT_AT_SHELL_GATE', 'the arrival checker does not have the unit present at the shell gate %s' % u['earliest_iso'])):
                    if not cond:
                        st.fail[key] = st.fail.get(key, 0) + 1
                        st.cls[1] = st.cls.get(1, 0) + 1
                        st.samples.append(msg)
            except Exception as e:  # noqa: BLE001
                st.raised.append('the arrival checker raised %s: %s' % (type(e).__name__, str(e)[:100]))
            # the shell dresses a unit from the manifest of its first day for as long as it is drawn: every item the first day allows must still be valid on every later scene day (the unit is drawn to the end of the window
            # unless its events end it earlier: the stricter reading is taken)
            lost_later = []
            for field in CK.FIELD_ORDER:
                if field in ('weapon', 'bayonet') and ent['branch'] not in CK.LONG_ARM_BRANCHES:
                    continue
                try:
                    spec0, ents0, _o = CK.resolve_field(kit, ku, field, date, var, 'private')
                    if spec0 is None:
                        continue
                    items0 = {e_['item'] for e_ in ents0}
                    for d in [x for x in BATTLE_DATES if x > date]:
                        lost = items0 - {e_['item'] for e_ in CK.resolve_field(kit, ku, field, d, var, 'private')[1]}
                        if lost:
                            lost_later.append('%s %s: %s not valid on %s' % (hid, field, ','.join(sorted(lost)), d))
                            break
                except Exception:  # noqa: BLE001
                    continue
            extra['items_valid_on_every_later_day_drawn'] = not lost_later
            if lost_later:
                st.fail['DRESS_INVALID_ON_A_LATER_DAY'] = len(lost_later)
                st.cls[2] = st.cls.get(2, 0) + len(lost_later)
                st.samples.append(lost_later[0])
            iid = 'Q03/Q03.1/drawn/%s%s' % (hid, '/' + var if var else '')
            ok = judge_unit(rec, iid, st, ent, fp, 'Q03.1', [hid], R.unit(hid), extra)
            results[(hid, var)] = {'ok': ok, 'stats': st}
    return results


def flag_items(rec, fp, pop, drawn, R):
    """One item per flag class: acceptable only when every variant of every unit that carries it passes, the flag is marked in the manifest and on the card, and it is registered."""
    by_code = {}
    for res in (pop, drawn):
        for key, r in res.items():
            st = r['stats']
            for code, n in st.flag.items():
                d = by_code.setdefault(code, {'units': set(), 'manifests': 0, 'unmarked': 0, 'failing_units': set(), 'disputes': set()})
                d['units'].add(key[0])
                d['manifests'] += n
                d['unmarked'] += st.unmarked.get(code, 0)
                d['disputes'] |= set(st.disputes)
                if not r['ok']:
                    d['failing_units'].add(key[0])
    for code, d in sorted(by_code.items()):
        if code == 'DISPUTED_FLAGGED':
            ok, why, ev = True, [], {'flag': code, 'per_dispute': {}}
            for dispute in sorted(d['disputes']):
                ok_d, why_d, ev_d = fp.judge(code, [dispute])
                ev['per_dispute'][dispute] = {'acceptable': ok_d, 'reasons': why_d, 'register_ids': ev_d.get('register_ids'), 'register': ev_d.get('register')}
                ok = ok and ok_d
                why += ['%s: %s' % (dispute, '; '.join(why_d)) for _ in [0] if why_d]
            if not d['disputes']:
                ok, why = False, ['the units that carry it name no dispute']
        else:
            ok, why, ev = fp.judge(code, ())
        ev = dict(ev, units=sorted(d['units'])[:60], n_units=len(d['units']), manifests=d['manifests'], manifests_without_marker=d['unmarked'], units_that_fail=sorted(d['failing_units'])[:30])
        why = list(why)
        if d['unmarked']:
            why.append('%d manifest(s) carry no marker for it' % d['unmarked'])
        if d['failing_units']:
            why.append('%d unit(s) that carry it fail the validator or the flag rule' % len(d['failing_units']))
        if why:
            rec.item('Q03/Q03.1/flag/%s' % code, 'FAIL', 'flag class %s on %d unit(s) is not acceptable: %s' % (code, len(d['units']), '; '.join(why)[:420]), ev, check='Q03.1', sub_requirements=R.unit(None))
        else:
            rec.item('Q03/Q03.1/flag/%s' % code, 'PASS', 'flag class %s on %d unit(s): every variant passes, the flag is marked in the manifest and on the card, and it is registered' % (code, len(d['units'])), ev, check='Q03.1', sub_requirements=R.unit(None))


def class7(rec, kit, R):
    refs = 0
    for u in kit.units.values():
        for k in ('image_refs', 'image_references', 'reference_images', 'images'):
            if u.get(k):
                refs += 1
    rec.item('Q03/Q03.1/class7-turntable-audit', 'NOT-RUN',
             'the seeded sample audit of class 7 (soldiers rendered on a turntable and checked against the unit spec image references) was not run: %s' % (
                 'it needs a browser (software GL through tools/horde/bench.sh) and a person looking at the saved frames (U-10)' if refs else 'no kit unit carries an image reference list to check against (input missing), and it needs a browser and a person looking at the saved frames (U-10)'),
             {'looked_at': False, 'units_with_image_references': refs, 'kit_units': len(kit.units)}, check='Q03.1', renderer_class='swgl', sub_requirements=R.unit(None))
    rec.owe('Q03.1 class 7: the seeded turntable sample audit (tools/horde/bench.sh, software GL) against unit spec image references, which no kit unit carries yet, and a person looking at the saved frames (U-10)')


# =================================================================================================== Q03.2
def validity_census(V, rec, kit, SD, R):
    """K.9 (p. 135): "Every kit item has a valid_from and valid_to date". Every catalogue item, weapon and artillery piece of the kit is checked."""
    def span(rec_):
        vf = rec_.get('valid_from') or rec_.get('valid_on')
        vt = rec_.get('valid_to') or rec_.get('valid_on')
        return vf, vt
    members, total = [], 0
    pools = [('item', kit.items), ('weapon', kit.weapons), ('artillery piece', (kit.wp.get('artillery') or {}).get('pieces') or {})]
    for kind, pool in pools:
        for iid, it in sorted(pool.items()):
            total += 1
            vf, vt = span(it)
            miss = [n for n, v in (('valid_from', vf), ('valid_to', vt)) if not v]
            if miss:
                members.append({'id': iid, 'kind': kind, 'missing': miss})
    ev = {'kit_items': total, 'without_validity': len(members), 'with_validity': total - len(members), 'rule': 'K.9: every kit item carries valid_from and valid_to; valid_on stands for both', 'members': SD('k9_missing', members) if members else {'n': 0}}
    if members:
        rec.item('Q03/Q03.2/validity-census', 'FAIL', '%d of %d kit items (catalogue items, weapons, artillery pieces) carry no valid_from and valid_to (K.9): a validity the data does not state cannot be shown to include a scene date' % (len(members), total), ev, check='Q03.2', sub_requirements=R.unit(None))
    else:
        rec.item('Q03/Q03.2/validity-census', 'PASS', 'all %d kit items carry valid_from and valid_to' % total, ev, check='Q03.2', sub_requirements=R.unit(None))


def epilogue_domain(V, kit, exp):
    """What the kit and the drawn-figure export hold for the epilogue days: kit units of an epilogue crowd or Lincoln, or drawn units dated in November."""
    kit_units = sorted(uid for uid, u in kit.units.items() if u.get('scope') == 'epilogue' or re.match(r'^(EPI|CIV|LINCOLN)\b', uid, re.I) or 'lincoln' in (u.get('name') or '').lower() or u.get('army') not in ('union', 'confederate'))
    drawn = sorted(u['id'] for u in ((exp or {}).get('units') or []) if str(u.get('date', '')).startswith('1863-11'))
    return kit_units, drawn


def entry_scan(V, kit, uid, u, var, date, cache):
    """Every entry of the unit's spec that is valid on the day (nearest definition, the officer default for an officer), as a manifest of that one item, through the validator: the exhaustive form of
    "every item is valid on the date". The entries the generator would never draw (a rank that may not carry it, a drop-pack with no pile, a Confederate private's kepi with no exception) are left out as it leaves them out."""
    CK = V.CK
    n, fails = 0, []
    for rank in ('private', 'captain'):
        for field in CK.FIELD_ORDER:
            if field in ('weapon', 'bayonet') and (u['branch'] not in CK.LONG_ARM_BRANCHES or rank in CK.OFFICERS):
                continue
            if field == 'bayonet' and u['branch'] == 'cavalry':
                continue
            try:
                spec, ents, owner = CK.resolve_field(kit, uid, field, date, var, rank)
            except Exception:  # noqa: BLE001
                continue
            if spec is None:
                continue
            for e in ents:
                iid = e['item']
                if not CK.rank_allows_item(kit, iid, rank, u):
                    continue
                if CK.has_tag(kit, iid, 'needs_pile_id') and not e.get('pile_id'):
                    continue
                if u['army'] == 'confederate' and CK.has_tag(kit, iid, 'kepi') and rank in CK.ENLISTED and e.get('flagged_exception') != 'private_purchase':
                    continue
                gated = bool(e.get('valid_from') or e.get('valid_to') or e.get('only_on')) or iid == 'spencer_repeater'
                key = (uid, var, field, rank, iid, date if gated else None)
                if key not in cache:
                    flags = []
                    if e.get('flagged') or e.get('flagged_exception'):
                        flags.append('flagged_entry:%s' % iid)
                    if e.get('flagged_exception'):
                        flags.append('flagged_exception:%s' % e['flagged_exception'])
                        if e['flagged_exception'] == 'private_purchase':
                            flags.append('private_purchase_exception')
                    m = CK.mk(kit, uid, date=date, rank=rank, variant=var, flags=flags, **{field: [iid]})
                    cache[key] = sorted({'%s' % f['code'] for f in CK.validate_manifest(m, kit=kit) if f['severity'] == 'FAIL'})
                n += 1
                if cache[key]:
                    fails.append('%s %s %s (%s): %s' % (uid, field, iid, rank, ','.join(cache[key])))
    return n, fails


def date_scan(V, rec, kit, R, exp):
    CK = V.CK
    entry_cache = {}
    units = [(uid, u, (list(u['variants']) if u.get('variants') else [None])) for uid, u in sorted(kit.units.items()) if u['presence']['status'] == 'present_at_gettysburg' and in_scope(uid)]
    for date in BATTLE_DATES:
        fails, empties, n, n_entries, entry_fails = {}, [], 0, 0, []
        for uid, u, vars_ in units:
            for var in vars_:
                ne, ef = entry_scan(V, kit, uid, u, var, date, entry_cache)
                n_entries += ne
                entry_fails += ef
                for rank in RANKS8:
                    sid = 'Q03.2:%s:%s:%s' % (uid, date, rank)
                    try:
                        m = CK.manifest_for(sid, uid, SEED, date=date, rank=rank, variant=var, kit=kit)
                    except Exception as e:  # noqa: BLE001
                        fails.setdefault((uid, var), []).append('manifest_for raised %s: %s' % (type(e).__name__, str(e)[:80]))
                        break
                    n += 1
                    for f in CK.validate_manifest(m, kit=kit):
                        if f['severity'] == 'FAIL':
                            fails.setdefault((uid, var), []).append('%s: %s' % (f['code'], f['msg'][:90]))
                # a field the unit defines for which no item is valid on this day (every entry gated out): the date logic leaves the soldier without it
                for field in CK.FIELD_ORDER:
                    if field in ('weapon', 'bayonet') and u['branch'] not in CK.LONG_ARM_BRANCHES:
                        continue
                    if field == 'bayonet' and u['branch'] == 'cavalry':
                        continue
                    try:
                        spec, ents, owner = CK.resolve_field(kit, uid, field, date, var, 'private')
                    except Exception:  # noqa: BLE001
                        continue
                    if spec is not None and spec.get('allowed') and not ents:
                        empties.append({'unit': uid, 'variant': var, 'field': field, 'owner': owner})
        bad = sorted({'%s%s' % (k[0], '#' + k[1] if k[1] else '') for k in fails})
        ev = {'date': date, 'units': len(units), 'manifests': n, 'units_failing': bad[:40], 'n_units_failing': len(bad), 'fields_with_no_valid_item': empties[:30], 'n_fields_with_no_valid_item': len(empties),
              'first_findings': sorted({x for v in fails.values() for x in v})[:8], 'entries_validated_one_by_one': n_entries, 'entries_failing': len(entry_fails), 'first_entry_failures': sorted(entry_fails)[:8]}
        if bad or empties or entry_fails:
            rec.item('Q03/Q03.2/date/%s' % date, 'FAIL', '%s: %d unit(s) have a manifest that fails the validator, %d (unit, field) pair(s) have no item valid on the day and %d spec entries valid on the day fail the validator one by one' % (date, len(bad), len(empties), len(entry_fails)), ev, check='Q03.2', sub_requirements=R.unit(None))
        else:
            rec.item('Q03/Q03.2/date/%s' % date, 'PASS', 'every one of the %d spec entries valid on %s (%d present kit units) passes the validator as a manifest of that one item, every one of the %d sample manifests validates and every defined field has an item valid on the day' % (n_entries, date, len(units), n), ev, check='Q03.2', sub_requirements=R.unit(None))
    kit_units, drawn = epilogue_domain(V, kit, exp)
    for date in EPILOGUE_DATES:
        iid = 'Q03/Q03.2/date/%s' % date
        if not kit_units and not drawn:
            rec.item(iid, 'BLOCKED-INPUT', 'input missing: no manifest exists for the epilogue crowd or Lincoln on %s (the kit has no civilian dress class and no Lincoln record, and the figures the shell draws are all dated before this day)' % date,
                     {'date': date, 'kit_units_of_the_epilogue': 0, 'drawn_units_dated_in_november': 0}, check='Q03.2', sub_requirements=R.unit(None))
        else:
            fails, n = [], 0
            for uid in kit_units:
                if uid not in kit.units:
                    continue
                u = kit.units[uid]
                for var in (list(u['variants']) if u.get('variants') else [None]):
                    for rank in RANKS8:
                        try:
                            m = CK.manifest_for('Q03.2:%s:%s:%s' % (uid, date, rank), uid, SEED, date=date, rank=rank, variant=var, kit=kit)
                            n += 1
                            fails += ['%s %s: %s' % (uid, f['code'], f['msg'][:80]) for f in CK.validate_manifest(m, kit=kit) if f['severity'] == 'FAIL']
                        except Exception as e:  # noqa: BLE001
                            fails.append('%s: manifest_for raised %s' % (uid, type(e).__name__))
                            break
            ev = {'date': date, 'kit_units': kit_units[:20], 'drawn_units': drawn[:20], 'manifests': n, 'first_findings': fails[:8]}
            if fails:
                rec.item(iid, 'FAIL', '%s: %d finding(s) in the epilogue manifests' % (date, len(fails)), ev, check='Q03.2', sub_requirements=R.unit(None))
            else:
                rec.item(iid, 'PASS', 'every one of the %d epilogue manifests on %s validates' % (n, date), ev, check='Q03.2', sub_requirements=R.unit(None))


def star_items(rec, dump, R):
    fl = (dump or {}).get('flags') if dump else None
    for date in SCENE_DATES:
        iid = 'Q03/Q03.2/stars/%s' % date
        if not fl:
            rec.item(iid, 'BLOCKED-INPUT', 'input missing: the app\'s flag code could not be read (q03_scene.mjs flags section)', {'date': date}, check='Q03.2', sub_requirements=R.unit(None))
            continue
        want, have = (fl.get('statutory') or {}).get(date), (fl.get('product_stars_by_date') or {}).get(date, fl.get('us_stars'))
        ok_pattern = all(p.get('ok') for k, p in (fl.get('patterns') or {}).items() if k in ('us_national', 'cav_guidon'))
        ev = {'date': date, 'statutory_stars': want, 'drawn_stars': have, 'star_function': fl.get('star_function'), 'takes_a_date': fl.get('star_count_takes_a_date') or bool(fl.get('product_stars_by_date')), 'statute_source': fl.get('statutory_source'),
              'national_pattern_builds': ok_pattern, 'note': 'the plan prints no star count; the statutory count (1818 act sec. 2 with the Kansas and West Virginia admissions) is the app\'s own evidence module'}
        if want is None or have is None:
            rec.item(iid, 'BLOCKED-INPUT', 'input missing: no statutory or drawn star count for %s' % date, ev, check='Q03.2', sub_requirements=R.unit(None))
        elif not ok_pattern:
            rec.item(iid, 'FAIL', 'the national colour pattern does not build', ev, check='Q03.2', sub_requirements=R.unit(None))
        elif want != have:
            rec.item(iid, 'FAIL', 'on %s the statute gives %s stars and the figure code draws %s%s' % (date, want, have, '' if fl.get('product_stars_by_date') else ' on every day (flagPattern takes no date: US_STARS is a constant)'), ev, check='Q03.2', sub_requirements=R.unit(None))
        else:
            rec.item(iid, 'PASS', 'the national colour has %s stars on %s, the statutory count' % (have, date), ev, check='Q03.2', sub_requirements=R.unit(None))
    for scen in ('pdf_p70', 'nps'):
        iid = 'Q03/Q03.2/anv-stars/%s' % scen
        if not fl:
            rec.item(iid, 'BLOCKED-INPUT', 'input missing: the app\'s flag code could not be read', {'scenario': scen}, check='Q03.2', sub_requirements=R.unit(None))
            continue
        n = (fl.get('anv_scenarios') or {}).get(scen)
        built = ((fl.get('anv_patterns') or {}).get(scen) or {}).get('ok')
        ev = {'scenario': scen, 'stars': n, 'pattern_builds': built, 'default': fl.get('anv_default'), 'rule': 'the ANV battle flag has 12 or 13 stars: both are selectable (DD-01), neither is deleted'}
        if n in (12, 13) and built:
            rec.item(iid, 'PASS', 'the ANV battle flag scenario %s draws %d stars, a selectable count of the two the sources give (12 or 13)' % (scen, n), ev, check='Q03.2', sub_requirements=R.unit(None))
        else:
            rec.item(iid, 'FAIL', 'the ANV star-count scenario %s is missing, not 12 or 13, or does not build' % scen, ev, check='Q03.2', sub_requirements=R.unit(None))


# =================================================================================================== Q03.6
def regression(V, rec, kit, env, dump, exp, pop, R):
    """The ten known corrections (p. 134 E.4; p. 126 D.4.3 stage 12), each its own item."""
    CK = V.CK
    CASE = lambda c: 'Q03/Q03.6/%s' % c  # noqa: E731
    sr = R.unit(None)

    def item(case, ok, ok_msg, bad_msg, ev, subjects=None, blocked=None, srs=None):
        if blocked:
            rec.item(CASE(case), 'BLOCKED-INPUT', 'input missing: ' + blocked, ev, check='Q03.6', subjects=subjects, sub_requirements=srs or sr)
        else:
            rec.item(CASE(case), 'PASS' if ok else 'FAIL', ok_msg if ok else bad_msg, ev, check='Q03.6', subjects=subjects, sub_requirements=srs or sr)

    def unit_ok(uid, var=None):
        """Does the validator pass every manifest of the unit (no FAIL finding, no generation error, reproducible)? The flags and their register entries are judged by Q03.1's own items, not here."""
        r = pop.get((uid, var)) if pop else None
        if r is None:
            return None
        st = r['stats']
        return not st.fail and not st.raised and not st.repro[1]

    # ---- 1. the 5th New York is not at Gettysburg
    ku = kit.units.get('US.5NY_INF')
    roster = q3s.read_json_opt(env.btp('history/units.json'))
    named = []
    if roster is not None:
        for u in (roster if isinstance(roster, list) else roster.get('units', [])):
            if (u.get('arm') in (None, 'infantry')) and re.search(r'\b5th (New York|N\.?Y\.?)\b(?!.*Cavalry)', u.get('name', '')) and u.get('level') == 'regiment':
                named.append(u['id'])
    drawn5 = sorted(u['id'] for u in ((exp or {}).get('units') or []) if u.get('kit_unit') == 'US.5NY_INF')
    refused = False
    if ku is not None:
        try:
            CK.manifest_for('S-1', 'US.5NY_INF', SEED, kit=kit)
        except ValueError:
            refused = True
    ev = {'kit_unit': 'US.5NY_INF', 'presence': ku['presence']['status'] if ku else None, 'manifest_for_refuses': refused, 'roster_units_named_5th_new_york_infantry': named, 'drawn_units_from_the_kit_unit': drawn5}
    if roster is None:
        item('5th-ny-not-at-gettysburg', False, '', '', ev, ['US.5NY_INF'], blocked='docs/battle-theatre/history/units.json (the roster the layer draws from)')
    elif exp is None:
        item('5th-ny-not-at-gettysburg', False, '', '', ev, ['US.5NY_INF'], blocked='the export of the figures the shell draws (app/tools/export-figures.mjs): whether a figure is drawn from the 5th New York cannot be read')
    else:
        good = (ku is None or (ku['presence']['status'] != 'present_at_gettysburg' and refused)) and not named and not drawn5
        item('5th-ny-not-at-gettysburg', good, 'the 5th New York Infantry is not at Gettysburg: the kit refuses a soldier of it, the roster has no such unit and no figure is drawn from it',
             'the 5th New York is treated as present: %s' % '; '.join(x for x in (
                 'the kit unit is present or does not refuse a soldier' if ku is not None and (ku['presence']['status'] == 'present_at_gettysburg' or not refused) else '', 'the roster names %s' % named if named else '', 'figures are drawn from it: %s' % drawn5 if drawn5 else '') if x), ev, ['US.5NY_INF'])

    # ---- 2. the 140th New York: regulation blue and the Zouave reading carried as variants, none chosen
    k140 = kit.units.get('US.140NY')
    ev = {'kit_unit': 'US.140NY'}
    if k140 is None or not k140.get('variants'):
        item('140th-ny-regulation-blue', False, '', 'the 140th New York is not carried as a disputed unit with both variants (regulation blue and Zouave from 3 June 1863)', dict(ev, variants=list((k140 or {}).get('variants') or [])), ['US.140NY'])
    elif exp is None:
        item('140th-ny-regulation-blue', False, '', '', ev, ['US.140NY'], blocked='the export of the figures the shell draws (app/tools/export-figures.mjs): whether the drawn figures carry both variants cannot be read')
    else:
        vs = sorted(k140['variants'])
        blue = k140['variants'].get('regulation_blue_zouave_jan_1864')
        zou_in_blue = sorted({e['item'] for f in (blue or {}).get('fields', {}).values() for e in f.get('allowed', []) if 'zouave' in ((kit.cat(e['item']) or {}).get('tags') or [])})
        try:
            CK.manifest_for('S-1', 'US.140NY', SEED, kit=kit)
            default_chosen = True
        except ValueError:
            default_chosen = False
        oks = {v: unit_ok('US.140NY', v) for v in vs}
        drawn140 = [u for u in ((exp or {}).get('units') or []) if u.get('kit_unit') == 'US.140NY']
        both_drawn = all(set((u.get('variants') or [])) == set(vs) for u in drawn140) if drawn140 else None
        ev.update(variants=vs, zouave_items_in_the_regulation_blue_variant=zou_in_blue, default_variant_chosen=default_chosen, variant_unit_items_pass=oks, drawn_units=[u['id'] for u in drawn140], both_variants_in_the_drawn_figures=both_drawn,
                  dispute='DISP-140NY-DRESS', owner_decision='PENDING OWNER: no default is chosen (decision log)')
        good = 'regulation_blue_zouave_jan_1864' in vs and len(vs) >= 2 and blue is not None and not zou_in_blue and not default_chosen and all(v is True for v in oks.values()) and both_drawn is not False
        item('140th-ny-regulation-blue', good, 'the 140th New York carries regulation blue (no Zouave item) and the Zouave reading as selectable variants, no default is chosen, and both variants pass the validator',
             'the 140th New York correction does not hold: %s' % '; '.join(x for x in (
                 'the regulation-blue variant holds Zouave items %s' % zou_in_blue if zou_in_blue else '', 'a manifest is made without a selected variant (a default is chosen)' if default_chosen else '',
                 'a variant fails the validator %s' % {v: o for v, o in oks.items() if o is not True} if not all(v is True for v in oks.values()) else '', 'a drawn unit of the 140th does not carry both variants' if both_drawn is False else '', 'the regulation-blue variant is missing' if blue is None else '') if x), ev, ['US.140NY'])

    # ---- 3. the 146th New York and the 114th Pennsylvania are Zouave units
    ev, bad, per = {}, [], {}
    for uid in ('US.146NY', 'US.114PA'):
        u = kit.units.get(uid)
        if u is None:
            bad.append('%s is not in the kit' % uid)
            continue
        zou = {}
        for field in ('headgear', 'coat', 'trousers'):
            seen = set()
            for date in BATTLE_DATES:
                spec, ents, owner = CK.resolve_field(kit, uid, field, date, None, 'private')
                items = {e['item'] for e in ents}
                is_z = {i: 'zouave' in ((kit.cat(i) or {}).get('tags') or []) for i in items}
                # headgear and coat are the dress: every item the unit may wear is Zouave; trousers: at least one Zouave item is valid (the 114th's spec also lets sky-blue kersey trousers through)
                if not items or (field != 'trousers' and not all(is_z.values())) or (field == 'trousers' and not any(is_z.values())):
                    bad.append('%s %s on %s: %s' % (uid, field, date, sorted(items) or 'no valid item'))
                    break
                seen |= items
            zou[field] = sorted(seen)
        per[uid] = zou
        ev[uid] = {'zouave_items': zou, 'unit_item_passes': unit_ok(uid)}
        if unit_ok(uid) is False:
            bad.append('%s fails the validator' % uid)
    pre = CK.validate_manifest(CK.mk(kit, 'US.146NY', date='1863-06-02', headgear='fez_red_146ny', coat='zouave_jacket_146ny'), kit=kit) if 'US.146NY' in kit.units else []
    ev['146th_dress_the_day_before_3_june_is_refused'] = any(f['code'] == 'ANACH_DATE' for f in pre)
    if not ev['146th_dress_the_day_before_3_june_is_refused']:
        bad.append('the Zouave dress of the 146th is accepted before 3 June 1863')
    item('146th-ny-and-114th-pa-zouave', not bad, 'the 146th New York (from 3 June 1863) and the 114th Pennsylvania wear Zouave dress (every valid headgear and coat item, and a Zouave trouser item) on every scene day, and the validator refuses the 146th\'s dress before 3 June', 'the Zouave correction does not hold: %s' % '; '.join(bad[:4]), ev, ['US.146NY', 'US.114PA'])

    # ---- 7. no Spencer on Buford's line on July 1
    buford = sorted(uid for uid, u in kit.units.items() if u.get('army') == 'union' and u.get('branch') == 'cavalry' and u.get('corps') == 'CAV' and u.get('division') == '1st')
    sp = (kit.weapons.get('spencer_repeater') or {}).get('allowed_units') or []
    allowed_units = sorted(a['unit'] for a in sp)
    in_spec, in_manifest = [], []
    for uid in buford:
        u = kit.units[uid]
        for node in [u] + list(kit.chain(uid)[1:]) + [v for v in (u.get('variants') or {}).values()]:
            for f in (node.get('fields') or {}).values():
                if any(e['item'] == 'spencer_repeater' for e in f.get('allowed', [])):
                    in_spec.append(uid)
        for rank in RANKS8:
            for i in range(6):
                m = CK.manifest_for('Q03.6:%s:%s:%d' % (uid, rank, i), uid, SEED, date='1863-07-01', rank=rank, kit=kit)
                if 'spencer_repeater' in (m['fields'].get('weapon', {}).get('items') or []) or 'spencer_repeater' in (m['fields'].get('sidearm_sword', {}).get('items') or []):
                    in_manifest.append(uid)
    ev = {'buford_units': buford, 'spencer_allowed_units': allowed_units, 'buford_units_with_a_spencer_entry': sorted(set(in_spec)), 'buford_units_with_a_spencer_in_a_manifest_on_1_july': sorted(set(in_manifest))}
    if not buford:
        item('spencers-not-on-bufords-line', False, '', '', ev, [], blocked='the kit has no Union cavalry unit of the 1st Division (Buford)')
    else:
        good = not in_spec and not in_manifest and not (set(buford) & set(allowed_units))
        item('spencers-not-on-bufords-line', good, 'no unit of Buford\'s division has a Spencer in its spec or in any of its manifests on 1 July, and none is in the Spencer table\'s allowed units', 'a Spencer reaches Buford\'s line on 1 July: %s' % sorted(set(in_spec) | set(in_manifest) | (set(buford) & set(allowed_units))), ev, buford)

    # ---- 9. the Devil's Den photograph was staged on 6 July
    scene = next((r for r in (kit.ks.get('scene_evidence_records') or []) if r.get('id') == 'SCENE.DEVILS_DEN_PHOTO'), None)
    ev = {'record': 'SCENE.DEVILS_DEN_PHOTO', 'values': (scene or {}).get('values'), 'rule': (scene or {}).get('rule')}
    if scene is None:
        item('devils-den-photograph-staged-6-july', False, '', '', ev, [], blocked='kit/kit_specs.json scene_evidence_records has no SCENE.DEVILS_DEN_PHOTO record')
    else:
        v = scene.get('values') or {}
        good = v.get('photo_date') == '1863-07-06' and v.get('staged') is True and 'sharpshooter' in (scene.get('rule') or '').lower()
        item('devils-den-photograph-staged-6-july', good, 'the kit records the Devil\'s Den photograph as staged and taken on 6 July 1863, with the rule that no sharpshooter\'s lair scene is staged from it',
             'the Devil\'s Den record does not hold the correction (photo_date %r, staged %r, rule %r)' % (v.get('photo_date'), v.get('staged'), (scene.get('rule') or '')[:60]), ev, ['SCENE.DEVILS_DEN_PHOTO'])

    # ---- 10. the Louisiana regiments are ordinary ANV infantry
    la = sorted(uid for uid, u in kit.units.items() if u.get('army') == 'confederate' and re.search(r'\bLouisiana\b', u.get('name') or '') and u.get('scope') == 'regiment')
    bad, per = [], {}
    for uid in la:
        u = kit.units[uid]
        zt = []
        for node in [u] + list(kit.chain(uid)[1:]):
            for f in (node.get('fields') or {}).values():
                for e in f.get('allowed', []):
                    tags = set((kit.cat(e['item']) or {}).get('tags') or [])
                    if tags & {'zouave', 'wheats_tiger_dress', 'coppens_zouave_dress'}:
                        zt.append(e['item'])
        pol = u.get('zouave_policy')
        per[uid] = {'zouave_policy': pol, 'forbidden_tags': u.get('forbidden_tags'), 'branch': u.get('branch'), 'inherits': u.get('inherits'), 'zouave_items_in_spec': sorted(set(zt)), 'unit_item_passes': unit_ok(uid)}
        if zt:
            bad.append('%s allows %s' % (uid, sorted(set(zt))))
        if not (pol == 'forbidden' or 'zouave' in (u.get('forbidden_tags') or [])):
            bad.append('%s does not forbid Zouave dress' % uid)
        if u.get('branch') != 'infantry' or u['presence']['status'] != 'present_at_gettysburg':
            bad.append('%s is not drawn as present infantry' % uid)
        if unit_ok(uid) is False:
            bad.append('%s fails the validator' % uid)
    ev = {'louisiana_regiments': la, 'per_unit': per}
    if not la:
        item('louisiana-regiments-ordinary-anv-infantry', False, '', '', ev, [], blocked='the kit holds no Louisiana regiment')
    else:
        item('louisiana-regiments-ordinary-anv-infantry', not bad, 'the %d Louisiana regiments of the kit are ordinary infantry: Zouave, Wheat\'s Tiger and Coppens\' dress forbidden and nowhere allowed, and every one passes the validator' % len(la),
             'the Louisiana correction does not hold: %s' % '; '.join(bad[:4]), ev, la)

    # ---- 8. Cope's survey, August to October 1863
    ts = q3s.read_json_opt(env.btp('terrain/terrain_sources.json'))
    rows = [r for r in ((ts or {}).get('rows') or []) if 'Cope' in json.dumps(r)]
    cope = next((r for r in rows if re.search(r'^Cope map', r.get('name', ''))), None)
    july = [r.get('number') for r in rows if re.search(r'Cope[^.]{0,160}(July|Jul\.?) 1863|(July|Jul\.?) 1863[^.]{0,80}Cope(\'s)? (survey|map)', json.dumps(r))]
    ev = {'terrain_sources_rows_naming_cope': [r.get('number') for r in rows], 'row_name': (cope or {}).get('name'), 'rows_dating_it_to_july_1863': july,
          'register_note': 'EG-0132: no source read in the register pass states the Aug to Oct date; the plan\'s correction is carried and its support is an open entry', 'tier_printed': (cope or {}).get('tier_printed')}
    if ts is None:
        item('cope-survey-august-october-1863', False, '', '', ev, [], blocked='docs/battle-theatre/terrain/terrain_sources.json (the terrain source catalogue that carries the Cope map)')
    else:
        good = cope is not None and re.search(r'August to October 1863', cope.get('name', '')) is not None and not july
        item('cope-survey-august-october-1863', good, 'the Cope map is carried as a survey made in August to October 1863, and no row dates it to the battle in July', 'the Cope survey is not carried as August to October 1863 (row %s, rows that date it to July: %s)' % (bool(cope), july), ev, ['terrain_sources'])

    # ---- 4, 5, 6: the structure corrections, from the app's state engine and the reference
    q3s.regression_structures(env, rec, dump, V, item, CASE)


# =================================================================================================== the run
def load_figures_export(env, rec, args, tmp):
    if args.figures_export:
        rec.add_input(args.figures_export, 'figure export')
        return json.load(open(args.figures_export, encoding='utf-8'))
    if os.path.realpath(env.root) != os.path.realpath(pq.default_root()):
        raise pq.InputMissing('the figure export cannot be made for a root other than this checkout (pass --figures-export)')
    script = os.path.join(env.bt, 'app', 'tools', 'export-figures.mjs')
    if not os.path.isfile(script):
        raise pq.InputMissing(env.rel(script))
    rec.add_input(script, 'node exporter of the drawn figures')
    out = os.path.join(tmp, 'figures.json')
    code, so, se = pq.run_node(env, script, [out], timeout=3600)
    if code != 0:
        raise pq.InputMissing('node app/tools/export-figures.mjs failed (exit %d): %s' % (code, ((se or so).strip().splitlines() or [''])[-1][:200]))
    return json.load(open(out, encoding='utf-8'))


def load_scene_dump(env, rec, args, tmp):
    if args.scene_dump:
        rec.add_input(args.scene_dump, 'scene dump')
        return json.load(open(args.scene_dump, encoding='utf-8'))
    script = os.path.join(HERE, 'q03_scene.mjs')
    rec.add_input(script, 'node child')
    out = os.path.join(tmp, 'scene.json')
    extra = ['--bt', env.bt] + (['--no-layer'] if args.no_layer else [])
    code, so, se = pq.run_node(env, script, ['--out', out] + extra, timeout=3600, extra_env={'BT_GATES_ROOT': env.root})
    rec.tool_versions['node'] = pq.node_version()
    if code != 0:
        raise pq.InputMissing('node tools/bt/gates/q03_scene.mjs failed (exit %d): %s' % (code, ((se or so).strip().splitlines() or [''])[-1][:200]))
    return json.load(open(out, encoding='utf-8'))


def main(argv=None):
    ap = pq.base_parser('Gate Q03: no anachronisms')
    ap.add_argument('--scene-dump', default=None, help='a dump of q03_scene.mjs (default: run the node child)')
    ap.add_argument('--figures-export', default=None, help='the export of app/tools/export-figures.mjs (default: run it)')
    ap.add_argument('--flags-map', default=None, help='the register mapping of the validator flags (default: tools/bt/gates/q03_flags.json)')
    ap.add_argument('--no-layer', action='store_true', help='skip the part of the node child that builds the history layer (the items that need it are BLOCKED-INPUT)')
    ap.add_argument('--skip-selftests', action='store_true', help='skip the 45 self-tests of the validator (the item is NOT-RUN and the verdict INCOMPLETE)')
    ap.add_argument('--skip-drawn', action='store_true', help='skip the drawn-figure validation (the item is NOT-RUN and the verdict INCOMPLETE)')
    ap.add_argument('--units', default=None, help='a regular expression: scan only the kit and drawn units whose id matches it (a development and test aid: the verdict is then INCOMPLETE)')
    ap.add_argument('--skip-dates', action='store_true', help='skip the scan of every scene day (the items are NOT-RUN and the verdict INCOMPLETE)')
    args = ap.parse_args(argv)
    global UNIT_FILTER
    UNIT_FILTER = re.compile(args.units) if args.units else None
    env = pq.Env(args.root, args.out)
    rec = pq.Record(GATE, env, renderer_class='mixed', argv=['python3', 'tools/bt/gates/q03_anachronism.py'] + (argv if argv is not None else sys.argv[1:]))
    rec.tool_versions['python'] = sys.version.split()[0]
    rec.renderer_class = 'python'          # the class of each item; the record header says mixed (python, node; the turntable audit is swgl and owed)
    S = Side(rec, args.no_write)
    rec.note('Q03.3 reading (stricter wins, GATE-SPEC ambiguity rule): a structure passes only with a registry row that says present_1863, an existence start the data states for July 1863 (a build date, a record that calls it pre-existing, or a period note that says it stood), '
             'an existence end that does not fall inside the window without a schedule row, and a state schedule (a record whose schedule rows exist). "Probable", "unreviewed" and "only on the 1868-69 survey" do not establish existence in July 1863.')
    rec.note('Q03.4 reading: the classes absent in 1863 are those the plan names (monuments, avenues, modern roads and lots, post-1863 buildings, towers, signs, wires and poles, modern fences, markers); they are matched on the structured fields of the registry (class, subtype, kind, represents, built), never on a name, '
             'because an address ("89 Steinwehr Avenue") is not an avenue. The ground audit (b) is BLOCKED-INPUT until the terrain work writes GOVERNANCE/ground_audit/audit.json; the product\'s own statement that the ground is the modern landscape is a FAIL, never a pass (A-33, X-11).')
    rec.note('Q03.1 flags: a validator flag is acceptable only when every variant passes, the flag is marked in the manifest and on the figure card, and a register entry that is open and complete (L1) names the flag class (tools/bt/gates/q03_flags.json). Marking in the picture is Q23\'s.')
    rec.note('No COVERED: Q03 has no register or flag branch of its own (GATE-SPEC K3).')
    rec.note('Q03.1 class 1 (presence): the arrival half is checked for every drawn figure with the presence test bound to the unit\'s arrival gate and a negative control on the day before; the validator gates arrival only (kit_presence: departures are not gated), so the departure half '
             '("has already left") is not checked by this runner; Q04.4 judges departures in the scene.')
    rec.incomplete('Q03.1 class 1: the departure half of the presence test (a soldier whose unit has already left is absent) is not checked here; the B.6.12 validator gates arrival only')
    if UNIT_FILTER is not None:
        rec.incomplete('restricted by --units %s: not every unit was scanned (U-26)' % args.units)
    tmp = tempfile.mkdtemp(prefix='q03-')
    for rel, role in (('GOVERNANCE/requirements.json', 'sub-requirement rows'), ('GOVERNANCE/register_index.json', 'register index'), ('history/units.json', 'roster'), ('history/arrivals.json', 'arrival gates'),
                      ('history/not_on_field.json', 'units not on the field'), ('GOVERNANCE/conflicts_structured.json', 'conflicts of the arrival gates'), ('terrain/terrain_sources.json', 'terrain source catalogue (Cope map)')):
        rec.add_input(env.btp(rel), role)
    try:
        R = Rows(env)
        V = Validators(env)
    except Exception as e:  # noqa: BLE001
        rec.item('Q03/Q03.1/kit-specs', 'BLOCKED-INPUT', 'input missing: the tools/bt validators could not be imported (%s: %s)' % (type(e).__name__, str(e)[:160]), {}, check='Q03.1')
        return pq.finish_cli(rec, args)
    # ---- kit
    kit = None
    try:
        kdir = env.btp('kit')
        for fn in ('kit_specs.json', 'weapons.json', 'artillery_batteries.json', 'cavalry_units.json'):
            rec.add_input(os.path.join(kdir, fn), 'kit data')
        for fn in ('kit_specs.json', 'weapons.json', 'artillery_batteries.json', 'cavalry_units.json'):
            if not os.path.isfile(os.path.join(kdir, fn)):
                raise pq.InputMissing(env.rel(os.path.join(kdir, fn)))
        kit = V.CK.Kit(kdir)
        V.CK._KIT = kit
    except (pq.InputMissing, OSError, ValueError, KeyError, AssertionError) as e:
        why = str(e) if isinstance(e, pq.InputMissing) else '%s: %s' % (type(e).__name__, e)
        rec.item('Q03/Q03.1/kit-specs', 'BLOCKED-INPUT', 'input missing: the kit data cannot be loaded (%s)' % why[:200], {'missing': why[:200]}, check='Q03.1', sub_requirements=R.unit())
        for date in SCENE_DATES:
            rec.item('Q03/Q03.2/date/%s' % date, 'BLOCKED-INPUT', 'input missing: the kit data (kit/*.json)', {'date': date}, check='Q03.2', sub_requirements=R.unit())
        kit = None
    # ---- flag policy
    flag_map_fn = args.flags_map or os.path.join(HERE, 'q03_flags.json')
    try:
        flag_map = rec.read_json(flag_map_fn, 'register mapping of the validator flags')
    except pq.InputMissing as e:
        flag_map = {'flags': {}}
        rec.note('the register mapping of the validator flags is missing (%s): every flag is then unregistered' % e)
    card_fn = os.path.join(env.bt, 'app', 'src', 'ui', 'card-sections.mjs')
    rec.add_input(card_fn, 'the figure card code')
    card_text = open(card_fn, encoding='utf-8').read() if os.path.isfile(card_fn) else None
    fp = FlagPolicy(env, rec, flag_map, card_text)
    # ---- scene dump (node child) and figure export
    dump = None
    try:
        dump = load_scene_dump(env, rec, args, tmp)
        for e in dump.get('errors') or []:
            rec.note('the node child reported: %s' % e[:300])
    except (pq.InputMissing, OSError, ValueError) as e:
        rec.note('the scene dump could not be made: %s' % e)
    exp = None
    exp_error = None
    if not args.skip_drawn:
        try:
            exp = load_figures_export(env, rec, args, tmp)
        except (pq.InputMissing, OSError, ValueError) as e:
            exp_error = str(e)
            rec.note('the drawn-figure export could not be made: %s' % e)
    if dump is not None:
        rec.extra['node_child'] = {'sections': dump.get('sections'), 'errors': [e[:200] for e in (dump.get('errors') or [])], 'node': dump.get('node'), 'bt': dump.get('bt')}
    if exp is not None:
        stored_fn = os.path.join(env.bt, 'app', 'data', 'figures-validation.json')
        rec.add_input(stored_fn, 'the stored result of check_figures.py (a file, not a fresh run, U-21)')
        stored = None
        if os.path.isfile(stored_fn):
            try:
                stored = json.load(open(stored_fn, encoding='utf-8')).get('export_digest')
            except (OSError, ValueError):
                stored = None
        rec.extra['figure_export'] = {'units': len(exp.get('units') or []), 'figures': sum(u.get('figures', 0) for u in (exp.get('units') or [])), 'export_digest': exp.get('export_digest'), 'stored_figures_validation_digest': stored,
                                      'stored_file_is_current': (stored == exp.get('export_digest')) if stored else None}
    # ---- Q03.1, Q03.2 (kit side)
    pop, drawn = {}, {}
    SD = Side(rec, args.no_write)
    if kit is not None:
        q3s.safe(rec, 'kit-specs', kit_specs, V, rec, kit, R)
        q3s.safe(rec, 'validator-selftests', validator_selftests, V, rec, kit, R, args.skip_selftests)
        pop = q3s.safe(rec, 'population', population, V, rec, kit, R, fp) or {}
        q3s.safe(rec, 'absent-units', absent_units, V, rec, kit, R)
        if args.skip_drawn:
            rec.item('Q03/Q03.1/drawn-figures', 'NOT-RUN', 'the validation of every drawn figure was skipped by --skip-drawn', {'skipped': True}, check='Q03.1', sub_requirements=R.unit())
            rec.incomplete('the drawn-figure validation was skipped')
        elif exp is None:
            rec.item('Q03/Q03.1/drawn-figures', 'BLOCKED-INPUT', 'input missing: the figures the shell draws could not be exported (%s)' % (exp_error or 'no export'), {'missing': exp_error}, check='Q03.1', sub_requirements=R.unit())
        else:
            drawn = q3s.safe(rec, 'drawn-figures', drawn_figures, env, V, rec, kit, R, fp, exp) or {}
        q3s.safe(rec, 'flag-items', flag_items, rec, fp, pop, drawn, R)
        q3s.safe(rec, 'class7', class7, rec, kit, R)
        q3s.safe(rec, 'validity-census', validity_census, V, rec, kit, SD, R)
        if args.skip_dates:
            rec.item('Q03/Q03.2/dates', 'NOT-RUN', 'the scan of every scene day was skipped by --skip-dates', {'skipped': True}, check='Q03.2', sub_requirements=R.unit())
            rec.incomplete('the scan of every scene day was skipped')
        else:
            q3s.safe(rec, 'date-scan', date_scan, V, rec, kit, R, exp)
    rec.renderer_class = 'node'            # what the app's own code says (the node child): flags, engine, model, ext, train
    q3s.safe(rec, 'stars', star_items, rec, dump, R)
    # ---- Q03.3, Q03.4, Q03.5, Q03.7 (structures, scene)
    q3s.run(env, rec, V, dump, R, SD, args)
    # ---- Q03.6
    rec.renderer_class = 'python'
    if kit is not None:
        q3s.safe(rec, 'regression', regression, V, rec, kit, env, dump, exp, pop, R)
    rec.renderer_class = 'mixed'
    return pq.finish_cli(rec, args)


if __name__ == '__main__':
    pq.guarded_main(main)
