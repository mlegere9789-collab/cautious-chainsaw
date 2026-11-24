#!/usr/bin/env python3
"""Compute what carries the value of a conflict, so the `readers` list of a resolution is mechanical, not hand-compiled.

    python3 -I tools/bt/conflicts/readers.py C-016          print the computed list as JSON, ready to paste into the `readers` field
    python3 -I tools/bt/conflicts/readers.py C-016 --keys   one key per line (what the validator compares)

Everything that names the id C-0xx (or DEC-C-0xx) in: register/EG-*.md, register_index.json, register_aliases.json (an alias of a hit),
decision_log.md (key: DEC-C-0xx, else the enclosing DEC heading, else the line), decisions/DELEGATED-DECISIONS*.md (key: the row), timeline_seed/verified/windows.jsonl
and timeline_corrections/*.jsonl (key: the row id T1-/T2-/T3-...), and the gate runners and specs (tools/bt/gates/*, gate_results/GATE-SPEC*.md, gates.json).
An item is covered when a reader's ref or note contains its key (see covered()). Read each item, then set must_change. Local files only; one scan, cached.
"""
import glob
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import cfl_lib as L

GOV = L.GOV
ID_HIT = re.compile(r'(?<![A-Za-z0-9])(?:DEC-)?C-0\d\d(?!\d)')
_cache = {}


def _rel(p):
    return os.path.relpath(p, L.ROOT).replace(os.sep, '/')


def _read(p):
    with open(p, encoding='utf-8', errors='replace', newline='') as f:
        return f.read()


def _ids(text):
    return {m.group(0).replace('DEC-', '') for m in ID_HIT.finditer(text)}


def _add(idx, cid, item):
    idx.setdefault(cid, {})[item['key']] = item


def build_index():
    """{C-0xx: {key: item}} over all files, one pass."""
    if 'idx' in _cache:
        return _cache['idx']
    idx = {}
    eg = {}                                                  # EG id -> set of conflict ids
    for p in sorted(glob.glob(os.path.join(GOV, 'register', 'EG-*.md'))):
        k = os.path.basename(p)[:-3]
        for cid in _ids(_read(p)):
            eg.setdefault(k, set()).add(cid)
            _add(idx, cid, {'kind': 'doc', 'key': k, 'ref': 'docs/battle-theatre/GOVERNANCE/register/%s.md' % k, 'where': 'register entry'})
    p = os.path.join(GOV, 'register_index.json')
    for e in json.load(open(p, encoding='utf-8')):
        k = e.get('id')
        for cid in _ids(json.dumps(e, ensure_ascii=False)):
            if k and k not in eg:
                eg.setdefault(k, set()).add(cid)
                _add(idx, cid, {'kind': 'doc', 'key': k, 'ref': 'docs/battle-theatre/GOVERNANCE/register_index.json (%s)' % k, 'where': 'register index entry'})
    al = json.load(open(os.path.join(GOV, 'register_aliases.json'), encoding='utf-8'))
    for k, e in al.items():
        cids = _ids(json.dumps(e, ensure_ascii=False)) | eg.get(e.get('alias_of'), set()) | eg.get(k, set())
        for cid in cids:
            _add(idx, cid, {'kind': 'doc', 'key': k, 'ref': 'docs/battle-theatre/GOVERNANCE/register_aliases.json (%s)' % k, 'where': 'register alias'})
    # decision log
    dl = os.path.join(GOV, 'decision_log.md')
    head = None
    skip = False                      # the block of the integration (DEC-DELEG-J) names every conflict by design: it is the record of the resolutions, not a reader
    for n, line in enumerate(_read(dl).split('\n'), 1):
        if line.startswith('## '):
            skip = line.startswith('## DEC-DELEG-J ')
        if skip:
            continue
        m = re.match(r'##\s+(DEC-[A-Z]?\d+)', line)
        if m:
            head = m.group(1)
        for cid in _ids(line):
            m2 = re.search(r'DEC-%s(?!\d)' % re.escape(cid), line)
            tag = ('DEC-' + cid) if m2 else (head or 'line %d' % n)
            _add(idx, cid, {'kind': 'doc', 'key': 'decision_log.md ' + tag, 'ref': 'docs/battle-theatre/GOVERNANCE/decision_log.md %s' % (tag if not tag.startswith('line') else tag), 'where': 'decision log line %d' % n})
    # delegated decisions
    for p in sorted(glob.glob(os.path.join(GOV, 'decisions', 'DELEGATED-DECISIONS*.md'))):
        b = os.path.basename(p)
        skip = False
        for n, line in enumerate(_read(p).split('\n'), 1):
            if line.startswith('## '):
                skip = line.startswith('## DEC-DELEG-J ')
            if skip:
                continue
            for cid in _ids(line):
                first = line.split('|')[1].strip() if line.startswith('|') and line.count('|') > 1 else 'line %d' % n
                _add(idx, cid, {'kind': 'doc', 'key': '%s %s' % (b, first), 'ref': 'docs/battle-theatre/GOVERNANCE/decisions/%s (%s row)' % (b, first), 'where': 'delegated-decision row line %d' % n})
    # timeline rows
    tl = [os.path.join(GOV, f) for f in ('timeline_seed.jsonl', 'timeline_verified.jsonl', 'timeline_windows.jsonl')] + sorted(glob.glob(os.path.join(GOV, 'timeline_corrections', '*.jsonl')))
    for p in tl:
        for n, line in enumerate(_read(p).split('\n'), 1):
            if 'C-0' not in line:
                continue
            ids = _ids(line)
            if not ids:
                continue
            try:
                rid = json.loads(line).get('id')
            except ValueError:
                rid = None
            key = rid or '%s line %d' % (os.path.basename(p), n)
            for cid in ids:
                _add(idx, cid, {'kind': 'timeline_row', 'key': key, 'ref': key, 'where': '%s line %d' % (os.path.basename(p), n)})
    # gates
    gl = []
    for ext in ('*.py', '*.mjs', '*.json', '*.md', '*.js'):
        gl += glob.glob(os.path.join(L.ROOT, 'tools', 'bt', 'gates', '**', ext), recursive=True)
    gl += glob.glob(os.path.join(GOV, 'gate_results', 'GATE-SPEC*.md')) + [os.path.join(GOV, 'gates.json')]
    for p in sorted(set(gl)):
        for cid in _ids(_read(p)):
            _add(idx, cid, {'kind': 'gate', 'key': os.path.basename(p), 'ref': _rel(p), 'where': 'gate file'})
    _cache['idx'] = idx
    return idx


def compute(cid):
    """Sorted list of items {kind, key, ref, where} that name cid."""
    items = list(build_index().get(cid, {}).values())
    return sorted(items, key=lambda i: (i['kind'], i['key']))


def _has(tok, text):
    return re.search(r'(?<![A-Za-z0-9_-])%s(?![A-Za-z0-9_])' % re.escape(tok), text) is not None


def covered(item, readers):
    """True when some reader's ref+note names the item: its key (EG id, row id, DEC id), or for a log or decisions line the file and the tag."""
    k = item['key']
    for r in readers:
        if not isinstance(r, dict):
            continue
        t = '%s %s' % (r.get('ref', ''), r.get('note', ''))
        if ' ' in k and not k.startswith(('T1-', 'T2-', 'T3-')):
            f, tag = k.split(' ', 1)
            if f.startswith('DELEGATED'):
                if _has('DELEGATED-DECISIONS', t.replace('DELEGATED-DECISIONS-', 'DELEGATED-DECISIONS ')) and (tag.startswith('C-') or _has(tag, t)):
                    return True
            elif _has('decision_log.md', t) and _has(tag, t):
                return True
        elif _has(k, t):
            return True
    return False


def missing(cid, readers):
    return [i for i in compute(cid) if not covered(i, readers if isinstance(readers, list) else [])]


def as_readers(items):
    return [{'kind': i['kind'], 'ref': i['ref'], 'must_change': False,
             'note': 'computed: %s names %s; read it and set must_change if its value differs from this resolution' % (i['where'], 'this conflict')} for i in items]


def main(argv):
    ids = [a for a in argv if L.ID_RE.match(a)]
    if not ids:
        print(__doc__)
        return 2
    for cid in ids:
        if '--keys' in argv:
            print('\n'.join(i['key'] for i in compute(cid)))
        else:
            print(json.dumps(as_readers(compute(cid)), indent=1, ensure_ascii=False))
    return 0


if __name__ == '__main__':
    L.utf8_stdout()
    sys.exit(main(sys.argv[1:]))
