"""Comparison of two readings of the same roll (the two Internet Archive scans of Moore's volume, or a scan and the earlier roll file).

key(): the comparison key of a row: company and the letters of the name tokens, sorted, so that the printed order (Surname, Given or Given Surname) does not matter.
align(): difflib alignment of two key sequences in file order; returns the blocks that are in one reading only.  A block that is in the second reading only, with the
first reading having no row at that place, is a stretch the first scan lost (a page, a part of a page); such a stretch of at least MIN_RUN rows is what the unit file takes
from the second scan as a supplement segment.  Rows that differ only by the OCR damage of the name (a replace block of the same size) are never taken: the first reading
keeps its line.  Nothing here repairs a name.
"""
import re, difflib

MIN_RUN = 3


def key(row, with_co=True):
    name = row[0]
    ws = sorted(w for w in re.findall(r"[a-z]+", name.lower()) if len(w) > 1)
    return (row[2] if with_co else '') + '|' + ' '.join(ws)


def align(prim, sec):
    """prim, sec: lists of 7-field rows in file order.  Returns {'matched', 'only_prim': [index runs], 'only_sec': [index runs], 'insert_runs': [(prim index, sec from, sec to)],
    'replace': [(pi1, pi2, sj1, sj2)]}."""
    pk = [key(r) for r in prim]
    sk = [key(r) for r in sec]
    sm = difflib.SequenceMatcher(None, pk, sk, autojunk=False)
    matched = 0
    only_prim, only_sec, inserts, replaces = [], [], [], []
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == 'equal':
            matched += i2 - i1
        elif tag == 'delete':
            only_prim.append((i1, i2))
        elif tag == 'insert':
            only_sec.append((j1, j2))
            inserts.append((i1, j1, j2))
        else:
            replaces.append((i1, i2, j1, j2))
    return {'matched': matched, 'only_prim': only_prim, 'only_sec': only_sec, 'insert_runs': inserts, 'replace': replaces, 'n_prim': len(prim), 'n_sec': len(sec)}


def dedupe_leaves(rows, min_rows=5, threshold=0.7):
    """rows: dicts of parse_section in text order.  A leaf whose rows are (at least `threshold` of the smaller leaf) the same rows as an earlier leaf of the same scan is a
    page the scan holds twice: its rows are dropped from the reading and listed.  Returns (kept rows, [ {leaf, dup_of, n, overlap} ])."""
    by_leaf = {}
    order = []
    for r in rows:
        lf = r['leaf']
        if lf not in by_leaf:
            by_leaf[lf] = []
            order.append(lf)
        by_leaf[lf].append(r)
    keysets = {lf: set(key(r['row']) for r in by_leaf[lf]) for lf in order}
    dropped = {}
    seen = []
    for lf in order:
        ks = keysets[lf]
        if len(by_leaf[lf]) >= min_rows:
            for prev in seen:
                kp = keysets[prev]
                if len(by_leaf[prev]) < min_rows:
                    continue
                ov = len(ks & kp) / float(min(len(ks), len(kp)) or 1)
                if ov >= threshold:
                    dropped[lf] = {'leaf': lf, 'dup_of': prev, 'n': len(by_leaf[lf]), 'overlap': round(ov, 2)}
                    break
        if lf not in dropped:
            seen.append(lf)
    kept = [r for r in rows if r['leaf'] not in dropped]
    return kept, [dropped[k] for k in order if k in dropped]
