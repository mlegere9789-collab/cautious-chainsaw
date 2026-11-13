"""Positional text of a table source: a re-serialisation of the item's own OCR words, one line per visual row, for the leaves where the
Internet Archive search text keeps the cells of a row apart (a name split over two blocks of the text).

The words are those of the item's djvu.xml (the same words the search text holds: aligned 555,582 of 555,591 for ME-SUPP-1867); only
their order differs: rows top to bottom (vertical position corrected for the tilt of the page), words of a row left to right.  The text,
its leaf index and the recipe are pinned in the ledger like any other text (kind "ia-djvuxml-positional").  Standard library only.
"""
import os, gzip, json, hashlib, time
import mlib as M
import mtable as T


def build(rows_by_leaf, n_leaves):
    """rows_by_leaf: {leaf: [row dict with bands of words]}.  Sets w['poff'] on every word.  Returns (text, pageindex)."""
    parts, idx, pos = [], [], 0
    for leaf in range(n_leaves):
        lines = []
        for r in rows_by_leaf.get(leaf, ()):
            ws = sorted([w for k in ('name', 'rank', 'co', 'rg', 'cp') for w in r[k]], key=lambda w: w['x0'])
            if not ws:
                continue
            line = ''
            for w in ws:
                if line:
                    line += ' '
                    pos += 1
                w['poff'] = pos
                line += w['w']
                pos += len(w['w'])
            lines.append(line)
            pos += 1
        t = '\n'.join(lines) + ('\n' if lines else '')
        parts.append(t)
        # start offset of the leaf = pos - len(t) ... recompute from the running total
    # offsets above were assigned while walking; rebuild the index from the part lengths
    pos = 0
    for t in parts:
        idx.append([pos, pos + len(t), 0, 0])
        pos += len(t)
    return ''.join(parts), idx


def write(text, idx, raw_dir, ident, tag='pos'):
    tp = os.path.join(raw_dir, '%s_%s_searchtext.txt.gz' % (ident, tag))
    ip = os.path.join(raw_dir, '%s_%s_pageindex.json.gz' % (ident, tag))
    for p, payload in ((tp, text.encode('utf-8')), (ip, json.dumps(idx, separators=(',', ':')).encode('utf-8'))):
        with open(p, 'wb') as f:
            with gzip.GzipFile(filename='', mode='wb', fileobj=f, compresslevel=9, mtime=0) as g:
                g.write(payload)
    return tp, ip
