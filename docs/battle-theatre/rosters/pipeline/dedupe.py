"""Name normalisation + duplicate / spelling-variant detection shared by the three pilots."""
import re, difflib
from collections import defaultdict

SUFFIX = re.compile(r'\b(jr|sr|2d|2nd|3d|ii|iii)\b\.?', re.I)


def split_name(raw, order):
    """order = 'sf' (Surname, Given) or 'gs' (Given Surname)."""
    s = re.sub(r'[^A-Za-z,\.\' \-]', '', raw or '')
    s = SUFFIX.sub('', s)
    s = re.sub(r'\s+', ' ', s).strip(' ,.')
    if order == 'sf' or (',' in s):
        parts = [p.strip() for p in s.split(',', 1)]
        sur = parts[0]
        giv = parts[1] if len(parts) > 1 else ''
    else:
        toks = s.split(' ')
        sur = toks[-1] if toks else ''
        giv = ' '.join(toks[:-1])
    sur = re.sub(r'[^A-Za-z]', '', sur).lower()
    gt = [t for t in re.sub(r'[^A-Za-z ]', ' ', giv).split() if t]
    first = gt[0].lower() if gt else ''
    inits = ''.join(t[0].lower() for t in gt)
    return sur, first, inits


def key(raw, order):
    sur, first, inits = split_name(raw, order)
    return sur, first, inits


def similar(a, b, thr=0.88):
    return difflib.SequenceMatcher(None, a, b).ratio() >= thr


def find_dupes(recs, order, same_unit_field='co'):
    """Return (exact_dupe_pairs, transfer_pairs, variant_pairs).
    exact: same surname+first+initials in different companies (cross-company transfer or re-listing)
    variant: same company, surname/first differ slightly (spelling variants / OCR) but initials agree."""
    by_sur = defaultdict(list)
    for i, r in enumerate(recs):
        sur, first, inits = key(r['name'], r.get('_ord', order))
        r['_k'] = (sur, first, inits)
        if sur:
            by_sur[sur[:3]].append(i)
    exact, variants = [], []
    for bucket in by_sur.values():
        for ai in range(len(bucket)):
            for bi in range(ai + 1, len(bucket)):
                a, b = recs[bucket[ai]], recs[bucket[bi]]
                (s1, f1, i1), (s2, f2, i2) = a['_k'], b['_k']
                if not f1 or not f2:
                    continue
                if s1 == s2 and f1 == f2 and i1 == i2:
                    exact.append((bucket[ai], bucket[bi]))
                elif similar(s1, s2, 0.84) and similar(f1, f2, 0.84) and i1[:1] == i2[:1] and (s1 != s2 or f1 != f2):
                    variants.append((bucket[ai], bucket[bi]))
    return exact, variants
