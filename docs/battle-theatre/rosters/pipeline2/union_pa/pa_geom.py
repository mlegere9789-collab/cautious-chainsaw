"""Geometry helpers for the Bates roster pages: words of a cached leaf, tilt, visual lines, month tokens and the column peak.

A word is a dict with x0, x1, yt, yb, yc (centre), w (the text-layer token), conf, ln (ABBYY line number inside the leaf), off (character
offset of the token in the pinned search text, None when the word-box file has a word the text layer does not spell the same way).
"""
import re, statistics, collections

MONTH_STRICT = re.compile(r"^[.'‘’`\"]?(Jan|Feb|Mar|Apr|May|June?|July?|Aug|Sept?|Oct|Nov|Dec)[a-z]{0,6}[.,;:]*$")
MONTH_LOOSE = re.compile(r"^[.'‘’`\"]?(Jan|Feb|Mar|Apr|Ma[yvu]|Mac|Mch|Jun|Jul|Aug|Sep|Oct|Nov|Dec|Juno|Julv|Muc)[a-z]{0,6}[.,;:]*$", re.I)


def load_words(rec):
    """Word dicts of one cache record (pa_lib.read_cache)."""
    return [dict(x0=w[0], x1=w[1], yt=w[2], yb=w[3], yc=(w[2] + w[3]) / 2.0, w=w[4], conf=w[5], ln=w[6], off=w[7]) for w in rec['words']]


def estimate_tilt(ws):
    """Slope dy/dx of the page (median over the long ABBYY lines of the leaf), 0.0 when there are none."""
    byln = collections.defaultdict(list)
    for w in ws:
        byln[w['ln']].append(w)
    sl = []
    for l in byln.values():
        l = sorted(l, key=lambda w: w['x0'])
        if len(l) >= 6 and l[-1]['x0'] - l[0]['x0'] >= 500:
            k = max(2, len(l) // 3)
            a, b = l[:k], l[-k:]
            dx = statistics.mean(w['x0'] for w in b) - statistics.mean(w['x0'] for w in a)
            dy = statistics.mean(w['yc'] for w in b) - statistics.mean(w['yc'] for w in a)
            if dx > 0:
                sl.append(dy / dx)
    return statistics.median(sl) if sl else 0.0


def cluster_lines(ws, tilt=0.0, thr=14.0):
    """Visual lines: words sorted by the tilt-corrected vertical centre; a word joins the last line when its corrected centre lies within
    thr of the mean of the last four words of that line.  Each word gets 'yk' (corrected centre).  Returns lists of words, each sorted by x0."""
    for w in ws:
        w['yk'] = w['yc'] - tilt * w['x0']
    lines = []
    last4 = []
    for w in sorted(ws, key=lambda w: (w['yk'], w['x0'])):
        if lines and abs(w['yk'] - sum(last4) / len(last4)) < thr:
            lines[-1].append(w)
            last4.append(w['yk'])
            if len(last4) > 4:
                last4.pop(0)
        else:
            lines.append([w])
            last4 = [w['yk']]
    for l in lines:
        l.sort(key=lambda w: w['x0'])
    return lines


def month_like(t, strict=True):
    return bool((MONTH_STRICT if strict else MONTH_LOOSE).match(t))


def peak(xs, width=40, minn=3):
    """Mode of a list of numbers by bins of the given width: (centre of the best bin as the median of its members, count) or (None, 0)."""
    if not xs:
        return None, 0
    c = collections.Counter(int(x // width) for x in xs)
    best, n = c.most_common(1)[0]
    # take the neighbouring bins too so that a peak split by a bin edge is not lost
    mem = [x for x in xs if abs(int(x // width) - best) <= 1]
    if len(mem) < minn:
        return None, 0
    return statistics.median(mem), len(mem)
