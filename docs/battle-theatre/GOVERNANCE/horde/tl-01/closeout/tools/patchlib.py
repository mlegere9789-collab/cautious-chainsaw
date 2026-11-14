"""Row-scoped edits of the row data files of the tl-01 close-out (rows_a.py, rows_b.py, rows_c.py).
Every edit asserts that it applies exactly once inside the block of its row."""
import re, os
D = '/home/user/cautious-chainsaw/docs/battle-theatre/GOVERNANCE/horde/tl-01/closeout'
FILES = ['rows_a.py', 'rows_b.py', 'rows_c.py']
_SEP = re.compile(r"^# -{20,} T1-(\d{3})\n", re.M)

def _load(rid):
    n = rid[3:]
    for f in FILES:
        s = open(os.path.join(D, f), encoding='utf-8').read()
        m = re.search(r"^# -{20,} T1-%s\n" % n, s, re.M)
        if m:
            nxt = re.search(r"^# -{20,} T1-\d{3}\n", s[m.end():], re.M)
            end = m.end() + nxt.start() if nxt else len(s)
            return f, s, m.start(), end
    raise KeyError(rid)

def _save(f, s):
    open(os.path.join(D, f), 'w', encoding='utf-8', newline='\n').write(s)

def lit(text):
    """python source literal (single quotes) for text"""
    return "'" + text.replace('\\', '\\\\').replace("'", "\\'") + "'"

def rsub(rid, old, new, count=1):
    f, s, a, b = _load(rid)
    blk = s[a:b]
    assert blk.count(old) == count, (rid, old[:80], blk.count(old))
    s = s[:a] + blk.replace(old, new) + s[b:]
    _save(f, s)

def _scan_literal(s, i):
    """s[i] is a quote char; return index just after the closing quote"""
    q = s[i]; j = i + 1
    while j < len(s):
        if s[j] == '\\': j += 2; continue
        if s[j] == q: return j + 1
        j += 1
    raise ValueError('unterminated literal')

def set_cite(rid, key, quote=None, **kw):
    """replace the quote (first string argument after the source id for L(...), first argument for OR(...)/CMP(...)) of a cite line;
    kw (reading=, note=, page=...) replace or append a keyword argument written as a python literal string"""
    f, s, a, b = _load(rid)
    blk = s[a:b]
    m = re.search(r"^(\s*)'%s': (OR|L|CMP)\(" % re.escape(key), blk, re.M)
    assert m, (rid, key)
    kind = m.group(2)
    i = m.end()
    if kind == 'L':   # skip source id literal and comma
        j = _scan_literal(blk, i); i = blk.index("'", j) if False else j
        while blk[i] in ', ': i += 1
    # now blk[i] is the quote char of the quote argument
    j = _scan_literal(blk, i)
    if quote is not None:
        blk = blk[:i] + lit(quote) + blk[j:]
    s = s[:a] + blk + s[b:]
    _save(f, s)

def cite_line(rid, key):
    f, s, a, b = _load(rid)
    blk = s[a:b]
    m = re.search(r"^\s*'%s': (OR|L|CMP)\(.*$" % re.escape(key), blk, re.M)
    return m.group(0) if m else None

def add_cite_after(rid, after_key, newline):
    f, s, a, b = _load(rid)
    blk = s[a:b]
    m = re.search(r"^\s*'%s': (OR|L|CMP)\(.*(?:\n(?!\s*'[A-Za-z0-9_]+': (?:OR|L|CMP)\()(?!\s*\}).*)*" % re.escape(after_key), blk, re.M)
    assert m, (rid, after_key)
    blk = blk[:m.end()] + '\n' + newline + blk[m.end():]
    s = s[:a] + blk + s[b:]
    _save(f, s)
