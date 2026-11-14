"""Shared helpers of the roster-qa item (independent sample of stored lines against page images).  Standard library only.

Used by qa_frame.py (the sampling frame and the seeded draw), qa_render.py (page images and the tesseract second reading),
qa_compare.py (token comparison of the stored lines with the second reading), qa_stats.py (counts, Clopper-Pearson bound).
Paths are relative to the repository root; nothing is written outside rosters/data2/qa, GOVERNANCE/horde/ws-rosters/roster-qa and
tmp/library/rosters.
"""
import os, sys, json, gzip, glob, re, math, hashlib

HERE = os.path.dirname(os.path.abspath(__file__))
P2 = os.path.dirname(HERE)
sys.path.insert(0, P2)
import r2lib as R

ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..', '..'))
R2 = os.path.join(ROOT, 'docs', 'battle-theatre', 'rosters')
D2 = os.path.join(R2, 'data2')
QA = os.path.join(D2, 'qa')
WSQ = os.path.join(ROOT, 'docs', 'battle-theatre', 'GOVERNANCE', 'horde', 'ws-rosters', 'roster-qa')
TMP = os.path.join(ROOT, 'tmp', 'library', 'rosters')
QTMP = os.path.join(TMP, '_qa')
PDFDIR = os.path.join(TMP, '_pdf')

ITEMS = {'union-me': 'me', 'union-nh': 'nh', 'union-vt': 'vt', 'union-ma': 'ma'}

_src_cache = {}


def rel(p):
    return os.path.relpath(p, ROOT).replace(os.sep, '/')


def jload(p):
    with open(p, encoding='utf-8') as f:
        return json.load(f)


def jdump(p, obj):
    os.makedirs(os.path.dirname(p), exist_ok=True)
    tmp = p + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as f:
        json.dump(obj, f, ensure_ascii=False, indent=1, sort_keys=False)
        f.write('\n')
    os.replace(tmp, p)


def sha256_bytes(b):
    return hashlib.sha256(b).hexdigest()


def load_source(text_id):
    """(text, PageMap, ledger entry) of a text id; the hashes are checked against the ledger (as verify_unit.py does)."""
    if text_id in _src_cache:
        return _src_cache[text_id]
    sid = text_id.split('.')[0]
    led = jload(os.path.join(D2, 'sources', sid + '.json'))
    ent = led['texts'][text_id]
    d = os.path.join(ROOT, ent['local_dir'])
    f = ent['files']
    for role in ('text', 'pageindex'):
        p = os.path.join(d, f[role]['name'])
        if R.sha256_file(p) != f[role]['sha256']:
            raise ValueError('sha256 of %s differs from the ledger' % p)
    text = R.load_text(os.path.join(d, f['text']['name']))
    pn = os.path.join(d, f['page_numbers']['name']) if 'page_numbers' in f else None
    pm = R.PageMap(os.path.join(d, f['pageindex']['name']), pn)
    _src_cache[text_id] = (text, pm, ent)
    return _src_cache[text_id]


def unit_files():
    """All stored files of the four closed items: [(item id, state code, path)], unit files and _other- files."""
    out = []
    for item, st in ITEMS.items():
        for p in sorted(glob.glob(os.path.join(D2, 'union', st, '*.jsonl.gz'))):
            out.append((item, st, p))
    return out


def flags_of(path):
    fp = path.replace('.jsonl.gz', '.flags.json.gz')
    if os.path.exists(fp):
        with gzip.open(fp, 'rb') as f:
            return json.loads(f.read().decode('utf-8'))
    return None


# ---- statistics --------------------------------------------------------------------------------------------------------

def _betainc_reg(a, b, x):
    """Regularised incomplete beta I_x(a, b) by the continued fraction (Numerical Recipes)."""
    if x <= 0:
        return 0.0
    if x >= 1:
        return 1.0
    lbeta = math.lgamma(a + b) - math.lgamma(a) - math.lgamma(b)
    front = math.exp(lbeta + a * math.log(x) + b * math.log(1 - x))
    if x < (a + 1) / (a + b + 2):
        return front * _cf(a, b, x) / a
    return 1 - front * _cf(b, a, 1 - x) / b


def _cf(a, b, x):
    tiny = 1e-300
    qab, qap, qam = a + b, a + 1, a - 1
    c, d = 1.0, 1 - qab * x / qap
    d = tiny if abs(d) < tiny else d
    d = 1 / d
    h = d
    for m in range(1, 1000):
        m2 = 2 * m
        aa = m * (b - m) * x / ((qam + m2) * (a + m2))
        d = 1 + aa * d
        d = tiny if abs(d) < tiny else d
        c = 1 + aa / c
        c = tiny if abs(c) < tiny else c
        d = 1 / d
        h *= d * c
        aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2))
        d = 1 + aa * d
        d = tiny if abs(d) < tiny else d
        c = 1 + aa / c
        c = tiny if abs(c) < tiny else c
        d = 1 / d
        de = d * c
        h *= de
        if abs(de - 1) < 3e-16:
            break
    return h


def binom_cdf(k, n, p):
    """P(X <= k) for X ~ Binomial(n, p), through the incomplete beta function."""
    if k >= n:
        return 1.0
    if k < 0:
        return 0.0
    return 1 - _betainc_reg(k + 1, n - k, p)


def cp_upper(k, n, conf=0.95):
    """One-sided Clopper-Pearson upper confidence bound on the error rate for k errors in n rows (bisection on the binomial CDF)."""
    if n <= 0:
        return None
    if k >= n:
        return 1.0
    lo, hi = k / n, 1.0
    for _ in range(200):
        mid = (lo + hi) / 2
        if binom_cdf(k, n, mid) > 1 - conf:     # P(X <= k | p = mid) still above alpha: the bound is higher
            lo = mid
        else:
            hi = mid
    return (lo + hi) / 2


def wilson_lower(k, n, z=1.6448536269514722):
    """One-sided 95 percent Wilson lower bound on a proportion k/n (used for agreement shares, never for a gate)."""
    if n == 0:
        return None
    ph = k / n
    den = 1 + z * z / n
    centre = ph + z * z / (2 * n)
    adj = z * math.sqrt(ph * (1 - ph) / n + z * z / (4 * n * n))
    return (centre - adj) / den
