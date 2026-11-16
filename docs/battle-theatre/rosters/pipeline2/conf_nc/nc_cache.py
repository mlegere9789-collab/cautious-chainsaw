"""Parse cache of the conf-nc work item: the rows of a unit in one scan, kept under tmp/library/rosters/_nc_cache/ (scratch, gitignored).

The cache name carries a hash of the parser source files, so a change of the parser never reads a stale parse.  Standard library only.
"""
import os, sys, hashlib, pickle, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import nc_lib as L, nc_parse as P, nc_sections as S, nc_units as U

CACHE = os.path.join(L.ROOT, 'tmp', 'library', 'rosters', '_nc_cache')
_SRC = ['nc_lib.py', 'nc_parse.py', 'nc_sections.py']      # the unit table is not part of the parse: a section is found by its number


def parser_hash():
    h = hashlib.sha256()
    for f in _SRC:
        with open(os.path.join(L.HERE, f), 'rb') as fh:
            h.update(fh.read())
    return h.hexdigest()[:12]


def parse_unit(key, scan, fresh=False):
    """{'rows': [...], 'notes': [...], 'headings': [...], 'tid', 'a', 'b', 'line', 'preamble_tokens', 'furniture', 'tokens'} for a unit in a scan ('a' or 'b').
    rows: dicts of parse_section (row, kind, section, head, line_start, tok, end, leaf) restricted to the company of the unit where it has one."""
    u = U.UNIT[key]
    _, desig, arm, vol, num, kind, co = u
    if vol is None:
        raise KeyError(key)
    os.makedirs(CACHE, exist_ok=True)
    path = os.path.join(CACHE, '%s.%s.%s.pkl' % (key, scan, parser_hash()))
    if os.path.exists(path) and not fresh:
        with open(path, 'rb') as f:
            return pickle.load(f)
    tid = L.text_id(vol, scan)
    sec = S.section(tid, num, kind)
    if sec is None:
        raise ValueError('section of %s not found in %s' % (key, tid))
    a, b, line = sec
    res = P.parse_section(tid, a, b)
    rows = res['rows']
    if co:
        rows = [r for r in rows if r['row'][2] == co]
    out = {'key': key, 'scan': scan, 'tid': tid, 'a': a, 'b': b, 'line': line, 'rows': rows, 'notes': res['notes'], 'headings': res['headings'],
           'preamble_tokens': res['preamble_tokens'], 'furniture': res['furniture'], 'tokens': res['tokens'], 'company': co}
    with open(path + '.tmp', 'wb') as f:
        pickle.dump(out, f)
    os.replace(path + '.tmp', path)
    # drop stale caches of the same unit and scan
    for fn in os.listdir(CACHE):
        if fn.startswith('%s.%s.' % (key, scan)) and fn != os.path.basename(path):
            try:
                os.remove(os.path.join(CACHE, fn))
            except OSError:
                pass
    return out
