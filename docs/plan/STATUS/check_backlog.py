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
ROUTES = {'candidate-group', 'source-rebuild', 'verification-record', 'release-request', 'decision-record', 'umbrella'}
WRITE_OK = ('docs/plan/STATUS/', 'docs/decisions/DELEGATED-DECISIONS-MAIN-SITE.md', 'candidates/r1h/', 'src/', 'historian-src/', 'data-src/', 'tools/data/', 'tools/time/',
            'tools/historian/', 'tests/data/', 'tests/time/', 'tests/historian/', 'tmp/r1h-cand/', 'docs/battle-theatre/GOVERNANCE/horde/requests/main-site-')


norm = ms.norm
overlaps = ms.overlaps


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
        if e['route']['type'] in ('candidate-group', 'source-rebuild', 'verification-record', 'release-request') and not e.get('files'):
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
    want = {ms.slug(i) for i in order if src[i]['status'] in ms.OPEN} | {sp['id'] for spec in ms.SLICES.values() for sp in spec['slices']}
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
    # waves: every entry of a wave is an authored build entry (exact acceptance, a short check, not size L); wave 1 is the first batch of 30 and
    # stays listed when an entry of it is done; the members of one wave are pairwise independent (no depends_on between them, disjoint write sets)
    waves = {}
    for e in items:
        if e.get('wave') is not None:
            waves.setdefault(e['wave'], []).append(e)
    if sorted(waves) != list(range(1, max(waves) + 1)):
        bad('waves are not numbered 1..N without gaps: %s' % sorted(waves))
    if len(waves.get(1, [])) != 30:
        bad('wave 1 has %d entries, expected 30' % len(waves.get(1, [])))
    for wn, members in sorted(waves.items()):
        if len(members) > ms.BATCH_SIZE:
            bad('wave %d has %d entries, at most %d' % (wn, len(members), ms.BATCH_SIZE))
        for e in members:
            if e['route']['type'] not in ('candidate-group', 'source-rebuild'):
                bad('%s: wave %d entry is not a build entry' % (e['id'], wn))
            if e['size'] == 'L':
                bad('%s: wave %d entry is size L' % (e['id'], wn))
            if not e.get('short') or len(e['short']) > 290:
                bad('%s: wave %d entry needs a short check of at most 290 characters' % (e['id'], wn))
            if not e.get('acceptance_basis', '').startswith('authored'):
                bad('%s: wave %d entry has no authored acceptance' % (e['id'], wn))
        ids_w = {e['id'] for e in members}
        for e in members:
            for d in e['depends_on']:
                if d in ids_w:
                    bad('wave %d not independent: %s depends on %s' % (wn, e['id'], d))
        for n, a in enumerate(members):
            for b in members[n + 1:]:
                for f in ms.write_conflicts(a, b):
                    bad('wave %d write sets overlap: %s and %s both write %s' % (wn, a['id'], b['id'], f))
    # the next batch: what the engineers are handed now
    batch = doc.get('next_batch')
    if not isinstance(batch, list):
        bad('next_batch is missing')
        batch = []
    if len(batch) > ms.BATCH_SIZE:
        bad('next_batch has %d entries, at most %d' % (len(batch), ms.BATCH_SIZE))
    if len(set(batch)) != len(batch):
        bad('next_batch lists an entry twice')
    for i in batch:
        if i not in by:
            bad('next_batch names unknown %s' % i)
            continue
        e = by[i]
        if e['done']:
            bad('%s: next_batch holds an entry that is already done: take it out of the batch' % i)
        if e.get('wave') is None:
            bad('%s: next_batch holds an entry without an authored acceptance' % i)
        if e['route']['type'] not in ('candidate-group', 'source-rebuild'):
            bad('%s: next_batch holds an entry that is not a build entry' % i)
        for d in e['depends_on']:
            if d in by and not by[d]['done']:
                bad('next_batch not independent: %s waits for %s, which is not done' % (i, d))
            if d in batch:
                bad('next_batch not independent: %s depends on %s' % (i, d))
    for n, i in enumerate(batch):
        for j in batch[n + 1:]:
            if i in by and j in by:
                for f in ms.write_conflicts(by[i], by[j]):
                    bad('next_batch write sets overlap: %s and %s both write %s' % (i, j, f))
    # the batch is the first entries in order that qualify: nothing authored, open and ready may be skipped over without a conflict
    if not fpath:
        ordered = sorted(items, key=lambda x: x['order'])
        expect = []
        for e in ordered:
            if e['done'] or e.get('wave') is None or e['route']['type'] not in ('candidate-group', 'source-rebuild'):
                continue
            if any(not by[d]['done'] for d in e['depends_on'] if d in by):
                continue
            if any(ms.write_conflicts(by[b], e) for b in expect):
                continue
            expect.append(e['id'])
            if len(expect) == ms.BATCH_SIZE:
                break
        if expect != batch:
            bad('next_batch is not the first %d ready authored entries in order: expected %s, found %s' % (ms.BATCH_SIZE, expect, batch))
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
        elif e['route']['type'] in ('source-rebuild', 'verification-record', 'release-request'):
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
    print('backlog.json ok: %d entries, %d done, %d waves (wave 1 = %d entries), next batch = %d independent entries, every open item of items-A.json and items-B.json covered, every OPEN_NEEDS_DECISION item has its delegated row' % (len(items), done, len(waves), len(waves.get(1, [])), len(batch)))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
