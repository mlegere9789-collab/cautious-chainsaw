"""Generic table helpers for the Maine roster parsers: rows from word boxes, cells from gaps.  Standard library only.

A word is a dict with x0, x1, yt, yb, yc, w and, after mlib.align, off (character offset in the pinned text, or None).
"""
import re, statistics


def cluster_rows(words, thr=22.0):
    """Group words into visual rows by the vertical centre; the row's reference is the mean of its last three words."""
    rows = []
    for w in sorted(words, key=lambda w: w['yc']):
        if rows and abs(w['yc'] - statistics.mean(x['yc'] for x in rows[-1][-3:])) < thr:
            rows[-1].append(w)
        else:
            rows.append([w])
    return rows


def cells_of(row, gap=28):
    """Split one visual row (sorted by x) into cells: a new cell starts where the horizontal gap exceeds `gap` pixels."""
    row = sorted(row, key=lambda w: w['x0'])
    cells = []
    for w in row:
        if cells and w['x0'] - cells[-1][-1]['x1'] <= gap:
            cells[-1].append(w)
        else:
            cells.append([w])
    return cells


def text_of(ws):
    """Words in text order (by offset), tokens joined by single blanks."""
    return ' '.join(w['w'] for w in sorted(ws, key=lambda w: w['off']))


def span_of(ws):
    return min(w['x0'] for w in ws), max(w['x1'] for w in ws)
