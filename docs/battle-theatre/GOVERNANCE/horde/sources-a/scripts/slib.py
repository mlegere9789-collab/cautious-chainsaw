"""sources-a close-out helpers (read-only on every source text; run with python3 -I).

Texts searched: Official Records Ser. I vol. 27 (tools/bt/or27_find via get_part), the 99-text library (tmp/library/ws9 and
ws9/prior), the National Park Service texts (tmp/library/web/nps/<id>/<id>.txt and tmp/library/web/nps/pages), and this shard's
own fetched pages (tmp/sources-a/fetch, tmp/sources-a/text).
Offsets are CHARACTER offsets in the raw file read as UTF-8 with newline='' (same convention as tools/bt/or27_lib).
"""
import os, sys, re, json, glob, hashlib, bisect, html, unicodedata

ROOT = '/home/user/cautious-chainsaw'
sys.path.insert(0, os.path.join(ROOT, 'tools', 'bt'))
from or27_lib import build_nview, norm_query  # noqa: E402

WS9 = os.path.join(ROOT, 'tmp/library/ws9')
WS9P = os.path.join(WS9, 'prior')
NPSD = os.path.join(ROOT, 'tmp/library/web/nps')
FETCH = os.path.join(ROOT, 'tmp/sources-a/fetch')
TEXT = os.path.join(ROOT, 'tmp/sources-a/text')


def sha256_file(p):
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        for ch in iter(lambda: f.read(1 << 20), b''):
            h.update(ch)
    return h.hexdigest()


_cache = {}


def load(path):
    """returns (raw, nt, nm) for a file path (cached)"""
    if path not in _cache:
        raw = open(path, encoding='utf-8', newline='', errors='replace').read()
        nt, nm = build_nview(raw)
        _cache[path] = (raw, nt, nm)
    return _cache[path]


def find_quote(path, quote, maxn=5):
    """locate a quote in the whitespace/hyphenation-normalised view; returns list of (start,end) raw offsets (end exclusive)"""
    raw, nt, nm = load(path)
    q = norm_query(quote)
    out = []
    i = 0
    while True:
        j = nt.find(q, i)
        if j < 0:
            break
        out.append((nm[j], nm[j + len(q) - 1] + 1))
        i = j + 1
        if len(out) >= maxn:
            break
    return out


def count_quote(path, quote):
    raw, nt, nm = load(path)
    return nt.count(norm_query(quote))


def search(path, pat, ctx=200, flags=re.I, maxn=30):
    raw, nt, nm = load(path)
    out = []
    for m in re.finditer(pat, nt, flags):
        a, b = nm[m.start()], nm[m.end() - 1] + 1
        out.append(dict(off=[a, b], ctx=nt[max(0, m.start() - ctx): m.end() + ctx], match=m.group(0)))
        if len(out) >= maxn:
            break
    return out


def pdf_page_at(raw, off):
    pg = None
    for mm in re.finditer(r'=== PAGE (\d+) ===', raw[:off]):
        pg = mm.group(1)
    return pg


# ------------------------------------------------------------------ id -> path maps
def lib_paths():
    d = {}
    for dd in (WS9, WS9P):
        for f in glob.glob(dd + '/*__*_djvu.txt'):
            d[os.path.basename(f).split('__')[0]] = f
    return d


def nps_path(sid):
    p = os.path.join(NPSD, sid, sid + '.txt')
    if os.path.exists(p):
        return p
    p = os.path.join(NPSD, 'pages', sid, sid + '.txt')
    return p if os.path.exists(p) else None


def nps_ids():
    ids = [d for d in os.listdir(NPSD) if os.path.exists(os.path.join(NPSD, d, d + '.txt'))]
    return sorted(ids)


def all_nps_search(pat, ctx=200, flags=re.I, maxn_each=5):
    res = []
    for sid in nps_ids():
        p = nps_path(sid)
        raw = None
        for h in search(p, pat, ctx, flags, maxn_each):
            raw = raw or load(p)[0]
            h['sid'] = sid
            h['pdf_page'] = pdf_page_at(raw, h['off'][0])
            res.append(h)
    return res


def all_lib_search(pat, ctx=200, flags=re.I, maxn_each=5, skip=('ADAMS-SENTINEL', 'GBG-COMPILER')):
    res = []
    for sid, p in sorted(lib_paths().items()):
        if sid.startswith(skip):
            continue
        for h in search(p, pat, ctx, flags, maxn_each):
            h['sid'] = sid
            res.append(h)
    return res


# ------------------------------------------------------------------ JSON record to a flat text view
def flatten_json(obj, prefix='', out=None):
    """one 'path: value' line per scalar; strings are written raw (no JSON escapes), so quotes are verbatim"""
    if out is None:
        out = []
    if isinstance(obj, dict):
        for k, v in obj.items():
            flatten_json(v, (prefix + '.' if prefix else '') + str(k), out)
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            flatten_json(v, '%s[%d]' % (prefix, i), out)
    else:
        if isinstance(obj, str):
            val = obj.replace('\r', ' ').replace('\n', ' \\n ')
        else:
            val = json.dumps(obj)
        out.append('%s: %s' % (prefix, val))
    return out


def json_to_text(src, dst, drop_prefixes=()):
    d = json.load(open(src, encoding='utf-8'))
    lines = flatten_json(d)
    if drop_prefixes:
        lines = [l for l in lines if not l.startswith(drop_prefixes)]
    open(dst, 'w', encoding='utf-8', newline='').write('\n'.join(lines) + '\n')
    return dst


# ------------------------------------------------------------------ html to text (deterministic, stdlib only)
from html.parser import HTMLParser


class _H2T(HTMLParser):
    BLOCK = {'p', 'div', 'br', 'li', 'tr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'section', 'article', 'ul', 'ol', 'table', 'header',
             'footer', 'nav', 'main', 'blockquote', 'dd', 'dt', 'dl', 'figure', 'figcaption'}
    SKIP = {'script', 'style', 'noscript', 'svg', 'head'}

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.out = []
        self.skip = 0

    def handle_starttag(self, tag, attrs):
        if tag in self.SKIP:
            self.skip += 1
        if tag in self.BLOCK:
            self.out.append('\n')
        if tag == 'a' and not self.skip:
            for k, v in attrs:
                if k == 'href' and v:
                    self.out.append('')
        if tag == 'img' and not self.skip:
            for k, v in attrs:
                if k == 'alt' and v:
                    self.out.append(' [img alt: %s] ' % v)

    def handle_endtag(self, tag):
        if tag in self.SKIP and self.skip:
            self.skip -= 1
        if tag in self.BLOCK:
            self.out.append('\n')

    def handle_data(self, data):
        if not self.skip:
            self.out.append(data)


def html_to_text(src, dst):
    s = open(src, encoding='utf-8', errors='replace').read()
    p = _H2T()
    p.feed(s)
    t = ''.join(p.out)
    t = re.sub(r'[ \t\r\f\v ]+', ' ', t)
    t = re.sub(r' *\n *', '\n', t)
    t = re.sub(r'\n{3,}', '\n\n', t)
    open(dst, 'w', encoding='utf-8', newline='').write(t.strip() + '\n')
    return dst
