"""Paragraph spans and text-similarity helpers for the Hardee-vs-Casey comparison (drill_compare.json).

Used by drill_build.py (to compute the rows) and drill_check.py (to recompute every number from the raw OCR).
Nothing here is trusted from the JSON: the checker calls the same functions on the stored line ranges.

* span_text(manual, a, b)         -> normalised text of OCR lines a..b (inclusive)
* para_spans(manual, a, b, cur0)  -> {para_no: (first_line, last_line)}  numbered paragraphs ("156.  Grasp the piece ...") found in
                                      lines a..b; numbering must run upward by 1-3 from `cur0` (OCR-garbled numbers are skipped, the text
                                      of a skipped paragraph is then part of the previous one)
* similarity(a_text, b_text)      -> difflib ratio of the letters-only form
* unmatched(a_text, b_text)       -> content words (>= 5 letters) of each side with no near match on the other side (OCR noise included)
"""
import re, difflib
import drill_text as T

# Section windows: (first OCR line, last OCR line, number just below the first paragraph number in the window)
SECTIONS = {
    'SS': {'HARDEE-1861b': (1100, 2500, 126), 'CASEY-1862-1': (1380, 3050, 133)},      # School of the Soldier, part II (manual of arms, loading, firings)
    'SC': {'HARDEE-1861b': (3330, 4010, 0), 'CASEY-1862-1': (4466, 4800, 42)},         # School of the Company, lesson II (loadings and firings)
    'SK': {'HARDEE-1861b': (7500, 8470, 104), 'CASEY-1862-1': (8880, 9900, 106, 8)},      # Instruction for Skirmishers
    'SB': {'HARDEE-1861b': (9270, 9560, 30), 'CASEY-1862-2': (488, 780, 36)},          # School of the Battalion, loadings and firings
}

_pcache = {}


def para_spans(manual, a, b, cur0, tol=3):
    key = (manual, a, b, cur0, tol)
    if key in _pcache:
        return _pcache[key]
    lines = T.raw(manual)
    starts = []
    cur = cur0
    for i in range(a - 1, min(b, len(lines))):
        s = ' '.join(lines[i].split())
        m = re.match(r'^(\d{1,3})\.\s+(.*)', s)
        if m and 0 < int(m.group(1)) - cur <= tol:
            cur = int(m.group(1))
            starts.append((cur, i + 1))
    out = {}
    for k, (n, ln) in enumerate(starts):
        end = starts[k + 1][1] - 1 if k + 1 < len(starts) else b
        out[n] = (ln, end)
    _pcache[key] = out
    return out


def span_lines(manual, section, paras):
    """(first_line, last_line) covering the listed paragraph numbers of a section window."""
    sp = sec_spans(manual, section)
    lo = min(sp[p][0] for p in paras)
    hi = max(sp[p][1] for p in paras)
    return lo, hi


def sec_spans(manual, section):
    v = SECTIONS[section][manual]
    return para_spans(manual, v[0], v[1], v[2], v[3] if len(v) > 3 else 3)


def span_range(manual, section, lo, hi):
    """(first_line, last_line) covering every numbered paragraph of the section window whose number lies in lo..hi."""
    sp = sec_spans(manual, section)
    ks = [k for k in sp if lo <= k <= hi]
    if not ks:
        raise KeyError('no paragraph %d..%d in %s %s' % (lo, hi, manual, section))
    return min(sp[k][0] for k in ks), max(sp[k][1] for k in ks)


def span_text(manual, a, b):
    lines = T.raw(manual)
    return ' '.join(' '.join(l.split()) for l in lines[a - 1:b] if l.strip())


def key(t):
    return re.sub(r'[^a-z]', '', t.lower())


def similarity(x, y):
    kx, ky = key(x), key(y)
    if not kx or not ky:
        return 0.0
    return difflib.SequenceMatcher(None, kx, ky, autojunk=False).ratio()


# running-head vocabulary: words that appear in page heads and plate captions, not in the text itself
_HEADWORDS = {'school', 'soldier', 'company', 'lesson', 'instruction', 'skirmishers', 'battalion', 'volume', 'plate'}


def _toks(t):
    t = re.sub(r'(?<=[A-Za-z])-\s+(?=[a-z])', '', t)
    out = []
    for w in t.split():
        k = re.sub(r'[^a-z]', '', w.lower())
        if len(k) >= 5 and k not in _HEADWORDS:
            out.append(k)
    return out


def _near(w, S):
    if w in S:
        return True
    for s in S:
        if abs(len(w) - len(s)) <= 3 and difflib.SequenceMatcher(None, w, s).ratio() >= 0.72:
            return True
    return False


def unmatched(x, y):
    """(content words of x with no near match in y, content words of y with no near match in x, tokens in x, tokens in y)."""
    A, B = _toks(x), _toks(y)
    sa, sb = set(A), set(B)
    return [w for w in A if not _near(w, sb)], [w for w in B if not _near(w, sa)], len(A), len(B)


def is_identical(sim, ua, ub, na, nb):
    """Rule for status 'identical': similarity >= 0.80; unmatched words that are ordinary dictionary words (the other side has a different real
    word, or none) at most max(5, 15 percent) per side; unmatched OCR-garbled tokens (not dictionary words) at most 35 percent per side."""
    voc = vocab()
    ra = [w for w in ua if w in voc]
    rb = [w for w in ub if w in voc]
    ga, gb = len(ua) - len(ra), len(ub) - len(rb)
    return (sim >= 0.80 and len(ra) <= max(5, 0.15 * na) and len(rb) <= max(5, 0.15 * nb)
            and ga <= 0.35 * max(na, 1) and gb <= 0.35 * max(nb, 1))


def contains(manual, a, b, phrase):
    return T.norm(phrase) in span_text(manual, a, b)


def clean_words(phrase, vocab):
    toks = phrase.split()
    return all(re.sub(r'[^a-z]', '', t.lower()) in vocab for t in toks)


_vocab = None


def vocab():
    """Words that occur >= 3 times in Casey vol. 1 (a rough dictionary of OCR-clean words, used only to pick readable citation phrases)."""
    global _vocab
    if _vocab is None:
        c = {}
        for w in T.normtext('CASEY-1862-1')[0].split() + T.normtext('CASEY-1862-2')[0].split():
            k = re.sub(r'[^a-z]', '', w.lower())
            if k:
                c[k] = c.get(k, 0) + 1
        _vocab = {k for k, v in c.items() if v >= 3}
    return _vocab


def pick_phrase(manual, a, b, n=9, skip=0):
    """First run of n consecutive tokens in lines a..b that are all dictionary words, contain no hyphen-break and occur exactly once in the manual."""
    txt = span_text(manual, a, b)
    toks = txt.split()
    voc = vocab()
    found = 0
    for i in range(0, len(toks) - n + 1):
        w = toks[i:i + n]
        if any(re.search(r'[-­\d*^|~\\]', t) or re.sub(r'[^a-z]', '', t.lower()) not in voc for t in w):
            continue
        if w[0][0].isupper() and False:
            continue
        ph = ' '.join(w)
        if len(T.locate(manual, ph)) == 1:
            if found == skip:
                return ph
            found += 1
    return None
