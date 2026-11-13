"""Second-witness check: does a quote also appear in the other archive.org scans of OR Ser.I vol.27 (squashed: case, punctuation and
whitespace ignored)? Scans live in tmp/fence-1/dl/or27_w2 (downloaded 2026-11-13 from archive.org/cors, sha256 in WITNESS)."""
import os, re, hashlib, unicodedata
ROOT = '/home/user/cautious-chainsaw'
W2 = os.path.join(ROOT, 'tmp/fence-1/dl/or27_w2')
WITNESS = {
  1: [('warofrebellion271unit', 'archive.org item warofrebellion271unit (Univ. of Illinois copy)', '4a388b6291bb972d2c8c0086d3d29973b288e0008408f6ef869a75ac6f25ff63'),
      ('warofrebellion012701rootrich', 'archive.org item warofrebellion012701rootrich', '4ff47cecfd3a71f911c3e0b924f23e60709c2161c509a0a22d173127d6f1183d')],
  2: [('warofrebellion272unit', 'archive.org item warofrebellion272unit (Univ. of Illinois copy)', '144f88d2399c99feecccba69b42128f9ae1c3b5ab1eef965904f2e1ba04a1e02'),
      ('warofrebellionco272unit', 'archive.org item warofrebellionco272unit (BYU copy)', 'b31739105c5e886a372998737e01e513cb9877c8c2713dac85be24fa281a6c12')],
}
_cache = {}
def squash(s):
    out = []
    for ch in s:
        for d in unicodedata.normalize('NFKD', ch):
            if d.isalnum(): out.append(d.lower())
    return ''.join(out)
def _load(ident):
    if ident not in _cache:
        raw = open(os.path.join(W2, ident + '_djvu.txt'), encoding='utf-8', errors='replace').read()
        raw = re.sub(r'-\s*\n\s*(?=[a-z])', '', raw)
        _cache[ident] = squash(raw)
    return _cache[ident]
def check(part, quote):
    res = []
    q = squash(quote)
    for ident, label, sha in WITNESS.get(part, []):
        t = _load(ident)
        i = t.find(q)
        res.append(dict(scan=label, sha256=sha, found=i >= 0, occurrences=t.count(q) if i >= 0 else 0))
    return res
