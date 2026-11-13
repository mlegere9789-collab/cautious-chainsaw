#!/usr/bin/env python3
"""Validate docs/plan/STATUS/backlog.json and every done claim.

    python3 docs/plan/STATUS/check_backlog.py                  structure, coverage, dependencies, wave-1 independence, write sets, delegated rows, done claims
    python3 docs/plan/STATUS/check_backlog.py --file <backlog.json>   check another file (used by check_backlog_selftest.py; skips the staleness check)
    python3 docs/plan/STATUS/check_backlog.py --rerun <id>      also re-execute the recorded check of one entry (prove.mjs --check or record.mjs --check) and compare

Exit 0 when everything holds, 1 on any problem (all problems are printed). Nothing is repaired and nothing is written.
A done claim is accepted only when its record verifies from the files on disk; --rerun re-executes the recorded commands, so a stale or hand-edited
STATUS.json cannot stand: the command either reproduces the recorded outcome or the claim fails.
"""
import json
import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import merge_status as ms  # noqa: E402

REPO = ms.REPO
ID_RE = re.compile(r'^[a-z0-9]+(-[a-z0-9]+)*$')
ROUTES = {'candidate-group', 'source-rebuild', 'release-request', 'decision-record', 'umbrella'}
WRITE_OK = ('docs/plan/STATUS/', 'docs/decisions/DELEGATED-DECISIONS-MAIN-SITE.md', 'candidates/r1h/', 'src/', 'historian-src/', 'data-src/', 'tools/data/', 'tools/time/',
            'tools/historian/', 'tests/data/', 'tests/time/', 'tests/historian/', 'tmp/r1h-cand/', 'docs/battle-theatre/GOVERNANCE/horde/requests/main-site-')


def norm(f):
    return re.sub(r'\s*\(.*$', '', f).strip()


def overlaps(a, b):
    a, b = norm(a), norm(b)
    if a == b:
        return True
    return (a.endswith('/') and b.startswith(a)) or (b.endswith('/') and a.startswith(b))


def main(argv):
    problems = []

    def bad(msg):
        problems.append(msg)

    fpath = argv[argv.index('--file') + 1] if '--file' in argv else None
    path = os.path.abspath(fpath) if fpath else os.path.join(HERE, 'backlog.json')
    doc = json.load(open(path, encoding='utf-8'))
    items = doc['items']
    ids = [e['id'] for e in items]
    by = {e['id']: e for e in items}
    if len(set(ids)) != len(ids):
        bad('duplicate ids')
    for e in items:
        if not ID_RE.match(e['id']):
            bad('bad id %r (lowercase letters, digits, hyphens only)' % e['id'])
        if e['route']['type'] not in ROUTES:
            bad('%s: unknown route %r' % (e['id'], e['route']['type']))
        for k in ('title', 'acceptance', 'files', 'depends_on', 'route', 'order', 'size', 'source'):
            if k not in e:
                bad('%s: missing %s' % (e['id'], k))
        if not e.get('acceptance', '').strip():
            bad('%s: empty acceptance' % e['id'])
        if e['route']['type'] in ('candidate-group', 'source-rebuild', 'release-request') and not e.get('files'):
            bad('%s: a build entry needs files' % e['id'])
        for f in e.get('files', []):
            nf = norm(f)
            if not nf.startswith(WRITE_OK):
                bad('%s: write path outside this workstream\'s ownership: %s' % (e['id'], f))
            if nf.startswith('candidates/r1h/') and not nf.startswith('candidates/r1h/%s/' % e['id']):
                bad('%s: candidate file outside its own folder: %s' % (e['id'], f))
    orders = sorted(e['order'] for e in items)
    if orders != list(range(1, len(items) + 1)):
        bad('order is not 1..N without gaps')
    # coverage of the surveys
    A, B, src, order, *_ = ms.load_items()
    want = {ms.slug(i) for i in order if src[i]['status'] in ms.OPEN}
    if want != set(ids):
        bad('coverage: missing %s; extra %s' % (sorted(want - set(ids))[:10], sorted(set(ids) - want)[:10]))
    # dependencies
    for e in items:
        for d in e['depends_on']:
            if d not in by:
                bad('%s: depends_on unknown %s' % (e['id'], d))
            elif not by[d]['done'] and by[d]['order'] > e['order'] and d not in e.get('together_with', []):
                bad('%s (order %d) precedes its dependency %s (order %d)' % (e['id'], e['order'], d, by[d]['order']))
    # cycles
    state = {}

    def visit(n, trail):
        if state.get(n) == 2:
            return
        if state.get(n) == 1:
            bad('dependency cycle: ' + ' -> '.join(trail + [n]))
            return
        state[n] = 1
        for d in by[n]['depends_on']:
            if d in by and d not in by[n].get('together_with', []):
                visit(d, trail + [n])
        state[n] = 2

    for n in ids:
        visit(n, [])
    # wave 1
    w1 = [e for e in items if e.get('wave') == 1]
    if len(w1) != 30:
        bad('wave 1 has %d entries, expected 30' % len(w1))
    for e in w1:
        if e['route']['type'] not in ('candidate-group', 'source-rebuild'):
            bad('%s: wave 1 entry is not a build entry' % e['id'])
        if e['size'] == 'L':
            bad('%s: wave 1 entry is size L' % e['id'])
        if not e.get('short') or len(e['short']) > 290:
            bad('%s: wave 1 entry needs a short check of at most 290 characters' % e['id'])
        if e.get('done'):
            bad('%s: wave 1 entry already done: take it out of the batch' % e['id'])
    ids1 = {e['id'] for e in w1}
    for e in w1:
        for d in e['depends_on']:
            if d in ids1:
                bad('wave 1 not independent: %s depends on %s' % (e['id'], d))
    for n, a in enumerate(w1):
        for b in w1[n + 1:]:
            for fa in a['files']:
                for fb in b['files']:
                    if overlaps(fa, fb) and not (norm(fa) in [norm(x) for x in a.get('shared_files', [])] and norm(fb) in [norm(x) for x in b.get('shared_files', [])]) and norm(fa) not in ('tools/time/relabel-data.mjs',):
                        bad('wave 1 write sets overlap: %s and %s both write %s' % (a['id'], b['id'], norm(fa)))
    # delegated rows
    rows = ms.parse_delegated()
    for e in items:
        if e['source']['status'] == 'OPEN_NEEDS_DECISION':
            dec = e.get('decision') or {}
            if not dec.get('rows'):
                bad('%s: OPEN_NEEDS_DECISION without a delegated row' % e['id'])
            for r in dec.get('rows', []):
                if r not in rows:
                    bad('%s: delegated row %s not in the decisions file' % (e['id'], r))
    # done claims
    for e in items:
        if not e['done']:
            continue
        t = e['route']['type']
        ev = e.get('done_evidence') or {}
        if t == 'decision-record':
            if not ev.get('rows') or not all(r in rows for r in ev['rows']):
                bad('%s: done decision record without its rows' % e['id'])
        elif t == 'umbrella':
            if not all(by[c]['done'] for c in e.get('children', [])):
                bad('%s: done umbrella with an open child' % e['id'])
        else:
            p = os.path.join(REPO, 'candidates', 'r1h', e['id'], 'STATUS.json')
            if not os.path.isfile(p):
                bad('%s: done without STATUS.json' % e['id'])
                continue
            ok, why = ms.verify_status(e['id'], json.load(open(p, encoding='utf-8')), t)
            if not ok:
                bad('%s: done claim does not verify: %s' % (e['id'], why))
    # re-run
    if '--rerun' in argv:
        rid = argv[argv.index('--rerun') + 1]
        e = by.get(rid)
        if not e:
            bad('--rerun: unknown id %s' % rid)
        elif e['route']['type'] == 'candidate-group':
            r = subprocess.run(['node', 'candidates/r1h/_lib/prove.mjs', rid, '--check'], cwd=REPO, capture_output=True, text=True)
            print(r.stdout.strip())
            if r.returncode != 0:
                bad('%s: re-run of the red/green proof failed (exit %d)' % (rid, r.returncode))
        elif e['route']['type'] == 'source-rebuild':
            r = subprocess.run(['node', 'candidates/r1h/_lib/record.mjs', rid, '--check'], cwd=REPO, capture_output=True, text=True)
            print(r.stdout.strip())
            if r.returncode != 0:
                bad('%s: re-run of the recorded commands failed (exit %d)' % (rid, r.returncode))
        else:
            print('%s: route %s has no command to re-run' % (rid, e['route']['type']))
    if not fpath:
        stale = subprocess.run([sys.executable, os.path.join(HERE, 'merge_status.py'), '--check'], cwd=REPO, capture_output=True, text=True)
        if stale.returncode != 0:
            bad('STATUS.md or backlog.json is stale: run merge_status.py (%s)' % stale.stdout.strip())
    if problems:
        print('%d problem(s):' % len(problems))
        for p in problems:
            print('  - ' + p)
        return 1
    done = sum(1 for e in items if e['done'])
    print('backlog.json ok: %d entries, %d done, wave 1 = %d independent entries, every open item of items-A.json and items-B.json covered, every OPEN_NEEDS_DECISION item has its delegated row' % (len(items), done, len(w1)))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
