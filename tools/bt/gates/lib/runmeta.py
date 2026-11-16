"""runmeta: what the runners of Q02, Q19, Q23 and Q25 add to a result record on top of lib/pq_common.py (GATE-SPEC 1.6, 1.7, U-12).

* `runner_inputs(rec, env)`  the code that made the record is an input of it: every module of tools/bt/gates and of tools/bt that this process loaded is hashed with the role `runner`
                             (so a record expires when the runner, a library or a tool it called changes, U-12) and `record['runner']` names the combined hash (the version of the runner).
* `threshold(...)`           a threshold is read from `GOVERNANCE/gate_results/thresholds.json` (1.7); a row that is UNSET (or a file that has no row) is reported: UNSET makes the gate INCOMPLETE,
                             a missing registry means that the constant of the runner is used and says so; a recorded value that is looser than the runner's constant never loosens it.
* `stamp_rows(rec, rows_fn)` every item names the sub-requirements it bears on (`sub_requirements`, 1.6 "Writing requirements.json"): the rows of requirements.json whose `gate_ids` name the gate.
* `rows_of_gate(env, gate)`  those rows.
"""
import hashlib
import json
import os
import sys

import pq_common as pq

GATES_DIR = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))


def _under(path, folder):
    try:
        return os.path.commonpath([os.path.abspath(path), folder]) == folder
    except ValueError:
        return False


def runner_inputs(rec, env):
    """Hash every python module that is part of the runner (tools/bt/gates, outside tests) or a tool of tools/bt that it loaded, and record the combined hash as `runner`."""
    files = set()
    tools = os.path.abspath(env.tools)
    for m in list(sys.modules.values()):
        f = getattr(m, '__file__', None)
        if not f or not f.endswith('.py'):
            continue
        f = os.path.abspath(f)
        if _under(f, GATES_DIR) or _under(f, tools):
            files.add(f)
    entries = []
    for f in sorted(files):
        if os.path.isfile(f):
            rel = rec.add_input(f, 'runner')
            entries.append((rel, rec.inputs[rel]['sha256']))
    h = hashlib.sha256()
    for rel, sha in entries:
        h.update(('%s %s\n' % (rel, sha)).encode('utf-8'))
    rec.extra['runner'] = {'files': len(entries), 'sha256': h.hexdigest()}


def read_registry(env, rec):
    """The threshold registry as {id: row}, or None when the file does not exist (the file is an input of the record)."""
    p = os.path.join(env.gov, 'gate_results', 'thresholds.json')
    rec.add_input(p, 'threshold registry')
    if not os.path.isfile(p):
        return None
    try:
        with open(p, encoding='utf-8') as f:
            d = json.load(f)
    except (OSError, ValueError):
        return None
    out = {}
    for r in d.get('thresholds') or []:
        if isinstance(r, dict) and r.get('id'):
            out[r['id']] = r
            for a in r.get('aliases') or []:
                out.setdefault(a, r)
    return out


def threshold(rec, env, registry, tid, default, key=None, metric=None, stricter=min, decision='PLAN'):
    """The value of threshold `tid`. `default` is the constant of the runner; `key` picks a field of the registry row's value; `stricter` (min for a maximum, max for a minimum) keeps a recorded
    value from loosening the constant. Records the threshold in the result and returns the value used."""
    row = (registry or {}).get(tid)
    used, how = default, 'constant of the runner (the registry gate_results/thresholds.json has no row %s)' % tid
    if registry is None:
        how = 'constant of the runner (gate_results/thresholds.json is not there)'
    if row is not None:
        status = ' '.join(str(s) for s in (row.get('status') or [])) or str(row.get('status_text') or '')
        v = row.get('value')
        if isinstance(v, dict) and key:
            v = v.get(key)
        if 'UNSET' in status.upper():
            rec.incomplete('threshold %s is UNSET in the registry (a gate with an unset threshold is INCOMPLETE, 1.7)' % tid)
            how = 'the registry row is UNSET: the constant of the runner is shown and nothing passes on it'
        elif isinstance(v, (int, float)) and not isinstance(v, bool):
            used = stricter(default, v)
            how = 'registry %s%s' % (tid, '' if used == v else ' (looser than the constant of the runner, which is kept)')
            decision = ', '.join(row.get('decisions') or []) or ('%s (registry status %s)' % (decision, status or 'recorded'))
        else:
            how = 'the registry row has no numeric value for %r: the constant of the runner is used' % (key or 'value')
    rec.thresholds = [t for t in rec.thresholds if t['id'] != tid]
    rec.threshold(tid, used, decision, metric)
    rec.thresholds[-1]['source'] = how
    return used


def set_max_quote_words(n):
    """The length rule of an extract (T-Q02-1) is read by the checks through these module variables."""
    pq.MAX_QUOTE_WORDS = n
    for name in ('extracts', 'datum_scan'):
        m = sys.modules.get(name)
        if m is not None and hasattr(m, 'MAX_QUOTE_WORDS'):
            m.MAX_QUOTE_WORDS = n


def rows_of_gate(env, gate):
    fn = os.path.join(env.gov, 'requirements.json')
    try:
        with open(fn, encoding='utf-8') as f:
            subs = json.load(f)['sub_requirements']
    except (OSError, ValueError, KeyError):
        return []
    return sorted(s['id'] for s in subs if gate in (s.get('gate_ids') or []))


def stamp_rows(rec, rows_fn):
    """Give every item that has none its `sub_requirements`: `rows_fn(item)` returns the list of row ids. An item that already names rows keeps them."""
    for it in rec.items:
        if not it.get('sub_requirements'):
            r = rows_fn(it)
            if r:
                it['sub_requirements'] = sorted(set(r))
