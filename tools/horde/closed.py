#!/usr/bin/env python3
"""Which builds of the campaign workflows are already closed, so a restart does not redo them.

A workflow run writes journal.jsonl (one line per agent start and result) under
~/.claude/projects/<project>/<session>/subagents/workflows/<run id>/. Every task of the campaign scripts goes through
build(label, ...): a builder agent (label L), up to two independent reviewers (L / review 1, L / review 2) and fixers
(L / fix 1, L / fix 2). A build is CLOSED when its builder returned a result and either a reviewer found it ok or the
second fixer ran (the loop of build() has ended).

Usage:
  python3 tools/horde/closed.py --json                 {"closed": [labels...]} over every run found
  python3 tools/horde/closed.py --args <script name>   the JSON for the Workflow tool's args of that script:
                                                       {"skip": [labels...], "groups": [plan of its scout, when one ran]}
  python3 tools/horde/closed.py --list                 human readable summary
The workflow scripts read args.skip (labels skipped by build()) and args.groups (a scout plan reused).
"""
import glob, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
BASES = glob.glob(os.path.expanduser('~/.claude/projects/*/*/subagents/workflows'))


def journals():
    out = []
    for b in BASES:
        for j in glob.glob(os.path.join(b, '*', 'journal.jsonl')):
            out.append((os.path.getmtime(j), j))
    return [j for _, j in sorted(out)]


def read(j):
    started, results = {}, {}
    try:
        for line in open(j, encoding='utf-8', errors='replace'):
            line = line.strip()
            if not line:
                continue
            try:
                o = json.loads(line)
            except Exception:
                continue
            if o.get('type') == 'started':
                started[o.get('agentId')] = o.get('label') or ''
            elif o.get('type') == 'result':
                results[o.get('agentId')] = o.get('result')
    except OSError:
        pass
    return started, results


def collect():
    """label -> list of results (any run), in run order."""
    by = {}
    for j in journals():
        started, results = read(j)
        for aid, label in started.items():
            if aid in results and results[aid] is not None:
                by.setdefault(label, []).append(results[aid])
    return by


def closed_labels(by):
    out = set()
    for label, rs in by.items():
        m = re.match(r'^(.*) / (review|fix) (\d)$', label)
        if not m:
            continue
        base, kind, n = m.group(1), m.group(2), int(m.group(3))
        if base not in by:
            continue                                   # the builder itself must have a result
        if kind == 'review' and any(isinstance(r, dict) and r.get('ok') is True for r in rs):
            out.add(base)
        if kind == 'fix' and n == 2:
            out.add(base)
    return out


def scout_plan(script):
    """The groups a scout of this script returned in the newest run that has one."""
    p = os.path.join(ROOT, 'tools', 'horde', 'workflows', script + '.mjs')
    try:
        s = open(p, encoding='utf-8').read()
    except OSError:
        return None
    m = re.search(r"label: '([^']*)', phase: 'Scout'", s)
    if not m:
        return None
    want = m.group(1)
    best = None
    for j in journals():
        started, results = read(j)
        for aid, label in started.items():
            r = results.get(aid)
            if label == want and isinstance(r, dict) and r.get('groups'):
                best = r['groups']
    return best


def main():
    a = sys.argv[1:]
    by = collect()
    closed = sorted(closed_labels(by))
    if '--args' in a:
        script = a[a.index('--args') + 1].replace('.mjs', '')
        o = {'skip': closed}
        g = scout_plan(script)
        if g:
            o['groups'] = g
        print(json.dumps(o))
    elif '--list' in a:
        print(len(closed), 'closed builds of', len(by), 'labels seen in', len(journals()), 'journals')
        for c in closed:
            print(' ', c)
    else:
        print(json.dumps({'closed': closed}))


if __name__ == '__main__':
    main()
