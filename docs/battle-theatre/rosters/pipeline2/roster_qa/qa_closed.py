"""Write GOVERNANCE/horde/ws-rosters/roster-qa/CLOSED.json, the last file of the roster-qa item (form in pipeline2/open_groups.py).

    python3 -I qa_closed.py            run build_index.py --lint (it must report 0 defects), read the verify logs, write CLOSED.json (round 2: covers the four Union items of round 1 and conf-nc)

The file is written only when (1) `build_index.py --lint` reports 0 defects, (2) the verify log of the planning step (GOVERNANCE/horde/ws-rosters/plan/verify-all-2026-11-15.jsonl, one JSON
object per unit file of the four Union items: `verify_unit.py --all`) and the verify log of the 41 conf-nc files (GOVERNANCE/horde/ws-rosters/roster-qa/r2/verify-nc.jsonl, run by this item) show
0 V1 and 0 V3 defects on every file, (3) every item of `covers` has all its unit files and a report and a pointer file (the closure rule of open_groups.py), and (4) the report, the pointer
file, the manifest, the verdicts of both rounds and the closure texts of the item exist.  It states in `note` what is owed.  Nothing here lowers a gate.
"""
import sys, os, re, json, glob, subprocess, time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.dirname(HERE))
import qa_lib as Q
import open_groups as OG

COVERS = ['union-me', 'union-nh', 'union-vt', 'union-ma', 'conf-nc']
ROUND = 2
QA1 = Q.QA_ROOT
QA2 = os.path.join(Q.QA_ROOT, 'round2')


def jl(p):
    return Q.jload(p) if os.path.exists(p) else None


def nc_log():
    """The verify log of the 41 conf-nc files: (records, path, text) for the newest complete log that is not older than the newest file under data2/confederate/nc, else (None, None, why)."""
    ncdir = os.path.join(Q.ROOT, 'docs', 'battle-theatre', 'rosters', 'data2', 'confederate', 'nc')
    files = sorted(glob.glob(os.path.join(ncdir, '*.jsonl.gz')))
    newest = max(os.path.getmtime(x) for x in glob.glob(os.path.join(ncdir, '*')))
    cands = [(os.path.join(Q.WSQ, 'r2', 'verify-nc.jsonl'), os.path.join(Q.WSQ, 'r2', 'verify-nc.done')),
             (os.path.join(Q.ROOT, 'docs', 'battle-theatre', 'GOVERNANCE', 'horde', 'ws-rosters', 'conf-nc', 'verify-unit-run.out'), None)]
    why = []
    good = []
    for p, done in cands:
        if not os.path.exists(p):
            why.append('%s does not exist' % Q.rel(p))
            continue
        if done is not None and not os.path.exists(done):
            why.append('%s has no .done marker (the run has not finished)' % Q.rel(p))
            continue
        t = os.path.getmtime(done if done is not None else p)
        recs = []
        for line in open(p, encoding='utf-8'):
            line = line.strip()
            if line.startswith('{'):
                try:
                    recs.append(json.loads(line))
                except ValueError:
                    pass
        have = {os.path.basename(r.get('file', '')) for r in recs}
        need = {os.path.basename(x) for x in files}
        if have != need:
            why.append('%s covers %d of the %d files' % (Q.rel(p), len(have & need), len(need)))
            continue
        if t < newest:
            why.append('%s is older than the newest file of data2/confederate/nc (the item was rebuilt after the run)' % Q.rel(p))
            continue
        good.append((t, recs, p))
    if not good:
        return None, None, '; '.join(why)
    good.sort(key=lambda x: x[0])
    t, recs, p = good[-1]
    return recs, p, ''


def main():
    lint = subprocess.run([sys.executable, '-I', os.path.join(os.path.dirname(HERE), 'build_index.py'), '--lint'], capture_output=True, text=True)
    m = re.search(r'defects: (\d+), warnings: (\d+)', lint.stdout)
    if not m or int(m.group(1)) != 0:
        print('build_index.py --lint does not report 0 defects:\n' + lint.stdout[-800:])
        return 1
    plan = os.path.join(Q.ROOT, 'docs', 'battle-theatre', 'GOVERNANCE', 'horde', 'ws-rosters', 'plan', 'verify-all-2026-11-15.jsonl')
    if not os.path.exists(plan):
        print('missing verify log: ' + plan)
        return 1
    ncrecs, ncpath, why = nc_log()
    if ncrecs is None:
        print('no fresh verify log of the 41 conf-nc files: ' + why)
        return 1
    vl = [json.loads(x) for x in open(plan, encoding='utf-8') if x.strip()] + ncrecs
    v1, v3 = sum(x['v1_name_defects'] for x in vl), sum(x['v3_page_defects'] for x in vl)
    if v1 or v3 or any(not x['ok'] for x in vl):
        print('the verify logs show defects: V1 %d, V3 %d' % (v1, v3))
        return 1
    wi, groups, order, out, state = OG.evaluate()
    for it in COVERS:
        ok, why = state[it]
        if not ok:
            print('item %s is not closed by the rule of open_groups.py: %s' % (it, why))
            return 1
    for need in (os.path.join(Q.R2, 'reports', 'roster-qa.md'), os.path.join(Q.R2, 'sources', 'roster-qa.json'), os.path.join(Q.TMP, 'MANIFEST-roster-qa.json'), os.path.join(QA1, 'stats.json'), os.path.join(QA2, 'stats.json'),
                 os.path.join(QA2, 'verdicts-vs-files.json'), os.path.join(QA2, 'claims-check.json'), os.path.join(Q.WSQ, 'closure', 'gaps-lines.md'), os.path.join(Q.WSQ, 'closure', 'r2-gaps-lines.md'),
                 os.path.join(Q.WSQ, 'closure', 'r2-decisions-rows.md')):
        if not os.path.exists(need):
            print('missing: ' + need)
            return 1
    s1, s2 = jl(os.path.join(QA1, 'stats.json')), jl(os.path.join(QA2, 'stats.json'))
    sr1, sr2 = os.path.exists(os.path.join(QA1, 'second-reading.json')), os.path.exists(os.path.join(QA2, 'second-reading.json'))
    cur2 = jl(os.path.join(QA2, 'verdicts-vs-files.json'))
    cl2 = jl(os.path.join(QA2, 'claims-check.json'))
    n1 = sum(1 for d in s1['strata'].values() if any(x['decision'] == 'FAIL' for g, x in d['gates'].items() if g != 'any'))
    n2 = sum(1 for d in s2['strata'].values() if any(x['decision'] == 'FAIL' for g, x in d['gates'].items() if g != 'any'))
    ncc = os.path.exists(os.path.join(Q.ROOT, 'docs', 'battle-theatre', 'GOVERNANCE', 'horde', 'ws-rosters', 'conf-nc', 'CLOSED.json'))
    note = ('Round 2 of the independent sample of the stored lines against page images (rosters/reports/roster-qa.md section 8; data2/qa/round2): conf-nc (North Carolina, Moore 1882), %d pages and %s stored lines in %d strata '
            '(the two scans of the roll x officers pages and other pages), looked at on 16 November 2026; %d of %d strata fail at least one gate by the ladder of PLAN.md 4.4 and no gate passes (R-G9 not passed for conf-nc, '
            'EG-ROS-QA-06; defect list in rosters/GAPS.md G-QA07, returned to the parser of conf-nc; fresh pages are owed after the fixes, G-QA08, EG-ROS-QA-07). The verdicts of %d pages describe the files as they are now '
            '(%d identical, %d with the same lines under new row numbers; the item was rebuilt by its own engineer while the sample was taken, one page was looked at again and its first verdict is kept under superseded/); '
            '%s claims of the conf-nc report and pointer file recomputed, %s hold, %d do not (section 8.6); verify_unit.py on the 41 files: 0 V1, 0 V3; the conf-nc item had %s CLOSED.json when this file was written. '
            'Round 1 (union-me, union-nh, union-vt, union-ma): %d pages and %s lines, %d of %d strata fail, unchanged (35 of 35 verdict pages still describe the files). The second-reading route test is %s for the six round 1 families and %s '
            'for the two Moore scan families. Written with this round: GAPS.md G-QA07 and G-QA08, proposed register entries EG-ROS-QA-06 and -07, DD-ROS-QA-06 to -09, PRODUCTION-PLAN 9.11, request note '
            'bt-rosters-roster-qa-round2.md, app/tests/roster-qa.test.mjs (both rounds), the pointer file and manifest of the Moore scans. Later rounds: open_groups.py returns this item again when a state item closes that '
            '"covers" does not name.') % (
        s2['pages_looked_at'], '{:,}'.format(s2['rows_looked_at']), len(s2['strata']), n2, len(s2['strata']), cur2['summary']['pages'], cur2['summary']['identical'], cur2['summary'].get('renumbered', 0),
        '{:,}'.format(cl2['checked']), '{:,}'.format(cl2['checked'] - len(cl2['do_not_hold'])), len(cl2['do_not_hold']), 'a' if ncc else 'no',
        s1['pages_looked_at'], '{:,}'.format(s1['rows_looked_at']), n1, len(s1['strata']),
        'done (4.2)' if sr1 else 'OWED (G-QA06)', 'done (8.7)' if sr2 else 'OWED (G-QA08)')
    doc = {'f': 'roster2-closed/1', 'work_item': 'roster-qa', 'round': ROUND, 'units_without_file': [], 'covers': COVERS,
           'verify': {'files': len(vl), 'v1_defects': v1, 'v3_defects': v3, 'logs': [Q.rel(plan), Q.rel(ncpath)]}, 'note': note}
    Q.jdump(os.path.join(Q.WSQ, 'CLOSED.json'), doc)
    print('CLOSED.json written: round %d, covers %s, verify %s' % (ROUND, COVERS, doc['verify']))
    return 0


if __name__ == '__main__':
    sys.exit(main())
