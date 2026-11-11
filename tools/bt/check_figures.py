#!/usr/bin/env python3
"""Validates, with the B.6.12 validator in tools/bt/check_kit.py, every per-figure kit manifest the Battle Theatre shell draws, and checks that Python and the shell's JS port make the same manifests.
  1. runs docs/battle-theatre/app/tools/export-figures.mjs (node) -> the drawn units, their figure counts, the kit unit each takes its manifests from, their first day and gate, and a digest of every manifest;
  2. for every figure: manifest_for here (soldier id '<history id>:<4-digit index>', seed 1863, rank private, role rifleman, the unit's first day), compare the digest with the shell's, run
     validate_manifest with a presence function bound to the figure's own history unit (check_arrivals.presence_ok: the arrival gate Q04) - FAIL findings fail the run, FLAG findings are counted;
  3. negative control: the same figure on the day BEFORE the unit's first day must be refused by the presence check (PRESENCE_TIME), proving that no manifest passes before arrival;
  4. kit_presence.make_presence_fn agrees with check_arrivals.presence_ok at gate-1 min and at the gate for every unit whose kit id it resolves;
  5. --write stores the result in docs/battle-theatre/app/data/figures-validation.json (the card shows it).
Disputed units (140th NY dress) are validated per variant: none is chosen.  Exit 1 on any FAIL, digest mismatch, or failed control.
  PYTHONIOENCODING=utf-8 python tools/bt/check_figures.py [--write] [--quiet] [--export path.json]"""
import hashlib
import json
import os
import subprocess
import sys
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(__file__))
import check_kit as CK
import check_arrivals as CA
import kit_presence as KP
import gen_golden_manifests as GG

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = os.path.join(ROOT, 'docs', 'battle-theatre', 'app', 'data', 'figures-validation.json')
EXPORT_JS = os.path.join(ROOT, 'docs', 'battle-theatre', 'app', 'tools', 'export-figures.mjs')


def sha(s):
    return hashlib.sha256(s.encode('utf-8')).hexdigest()[:24]


def prev_day(d):
    y, m, dd = map(int, d.split('-'))
    dd -= 1
    if dd == 0:
        m -= 1
        dd = 30 if m == 6 else 31
    return '%04d-%02d-%02d' % (y, m, dd)


def main(argv):
    quiet = '--quiet' in argv
    if '--export' in argv:
        exp = json.load(open(argv[argv.index('--export') + 1], encoding='utf-8'))
    else:
        r = subprocess.run(['node', EXPORT_JS], capture_output=True, text=True, timeout=300, encoding='utf-8')
        if r.returncode != 0:
            print(r.stderr[-1500:])
            return 1
        exp = json.loads(r.stdout)
    kit = CK.get_kit()
    GG.add_defaults(kit)
    seed = exp['seed']
    kp = KP.make_presence_fn()
    problems, units_out, tot, flag_codes = [], {}, {'figures': 0, 'fail': 0, 'flag': 0}, {}
    for u in exp['units']:
        hid, ku, date, n = u['id'], u['kit_unit'], u['date'], u['figures']

        def pres(_uid, d, hid=hid):                      # a bare date: could the unit be on the field that day
            return CA.presence_ok(hid, d + 'T23:59', 'default')

        variants = u['variants'] or [None]
        rec = {'figures': n, 'kit_unit': ku, 'date': date, 'fail': 0, 'flag': 0, 'flags': {}, 'digest_match': True, 'disputed': bool(u['disputed'])}
        for var in variants:
            ds = []
            for k in range(n):
                sid = '%s:%04d' % (hid, k)
                m = CK.manifest_for(sid, ku, seed, date=date, rank=exp['rank'], role=exp['role'], variant=var, kit=kit)
                ds.append(sha(GG.canon(m)))
                for f in CK.validate_manifest(m, presence_fn=pres, kit=kit):
                    if f['severity'] == 'FAIL':
                        rec['fail'] += 1
                        problems.append('%s %s %s: %s' % (hid, sid, f['code'], f['msg']))
                    else:
                        rec['flag'] += 1
                        rec['flags'][f['code']] = rec['flags'].get(f['code'], 0) + 1
                        flag_codes[f['code']] = flag_codes.get(f['code'], 0) + 1
            want = u['variant_digests'][var] if var else u['digest']
            if sha(''.join(ds)) != want:
                rec['digest_match'] = False
                problems.append('%s: Python and the shell make different manifests (variant %s)' % (hid, var))
        # negative control: the day before the first day must be refused
        m0 = CK.manifest_for('%s:0000' % hid, ku, seed, date=prev_day(date), rank='private', role='rifleman', variant=variants[0], kit=kit)
        codes = [f['code'] for f in CK.validate_manifest(m0, presence_fn=pres, kit=kit)]
        rec['control_before_arrival_refused'] = 'PRESENCE_TIME' in codes
        if 'PRESENCE_TIME' not in codes:
            problems.append('%s: the manifest of the day before arrival (%s) was not refused by the presence check' % (hid, prev_day(date)))
        # Q04: the shell's gate is never EARLIER than the arrival checker's (the shell lifts some floor gates to their parent's time); both agree the unit is present at the shell's gate;
        # and where kit_presence resolves this kit id it agrees with the arrival checker at the shell's gate - 1 min, at the gate and an hour on
        e = datetime.strptime(u['earliest_iso'], '%Y-%m-%dT%H:%M')
        pg, _owner = CA.gate_time(hid, 'default')
        rec['shell_gate_not_earlier_than_checker'] = (pg is None) or (datetime.strptime(pg[:16], '%Y-%m-%dT%H:%M') <= e)
        if not rec['shell_gate_not_earlier_than_checker']:
            problems.append('%s: the shell gate %s is EARLIER than the arrival checker gate %s (Q04)' % (hid, u['earliest_iso'], pg))
        if not CA.presence_ok(hid, u['earliest_iso'], 'default'):
            problems.append('%s: the arrival checker does not have the unit present at the shell gate %s' % (hid, u['earliest_iso']))
        if KP.history_id(ku) == hid:
            ts = [(e + timedelta(minutes=d)).strftime('%Y-%m-%dT%H:%M') for d in (-1, 0, 60)]
            ok = all(kp(ku, t) == CA.presence_ok(hid, t, 'default') for t in ts) and kp(ku, ts[1]) is True
            rec['kit_presence_agrees'] = ok
            if not ok:
                problems.append('%s: kit_presence and check_arrivals disagree around the gate %s' % (hid, u['earliest_iso']))
        else:
            rec['kit_presence_agrees'] = None
        units_out[hid] = rec
        tot['figures'] += n * len(variants)
        tot['fail'] += rec['fail']
        tot['flag'] += rec['flag']
    doc = {'_doc': 'The B.6.12 validator run in Python over every figure the shell draws. export_digest ties it to the shell figures (a changed unit, figure count, kit unit or manifest changes the digest and the test fails until this is re-run).',
           'export_digest': exp['export_digest'], 'seed': seed, 'totals': {**tot, 'units': len(units_out), 'flag_codes': dict(sorted(flag_codes.items()))},
           'units': dict(sorted(units_out.items()))}
    if not quiet:
        print('figures checked: %d in %d drawn units; FAIL %d; FLAG %d %s' % (tot['figures'], len(units_out), tot['fail'], tot['flag'], doc['totals']['flag_codes']))
        print('digest matches (Python = shell): %d of %d units; control (day before arrival refused): %d of %d; kit_presence agrees where it resolves: %d, differs: %d' % (
            sum(1 for v in units_out.values() if v['digest_match']), len(units_out), sum(1 for v in units_out.values() if v['control_before_arrival_refused']), len(units_out),
            sum(1 for v in units_out.values() if v['kit_presence_agrees'] is True), sum(1 for v in units_out.values() if v['kit_presence_agrees'] is False)))
    for p in problems[:30]:
        print('PROBLEM', p)
    if '--write' in argv and not problems:
        with open(OUT, 'w', encoding='utf-8') as f:
            json.dump(doc, f, ensure_ascii=False, indent=0)
            f.write('\n')
        print('written ->', OUT)
    print('check_figures: ' + ('OK' if not problems else 'FAILED (%d problems)' % len(problems)))
    return 0 if not problems else 1


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
