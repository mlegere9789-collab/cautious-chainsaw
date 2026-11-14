"""Row-block editing helper for horde/tl-03/closeout/rows_a|b|c.py (first-pass data files are patched in place, every patch asserts what it changes).
    import sys; sys.path.insert(0, 'tmp/tl-03/audit'); from edit import R
    R('T1-116').replace(old, new)            # old must occur exactly once inside the row's block
    R('T1-116').add_cites(["'k': OR('...', R359, '992'),"], after='g_1155')   # new citation lines inside cites={...}
    R('T1-116').sub_keys(6, add=['g_1155h'])  # add citation keys to the n-th sub-claim (1-based)
    R('T1-116').sub_set(n, claim=None, tier=None, support=None)
"""
import os, re
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..'))
CO = os.path.join(ROOT, 'docs', 'battle-theatre', 'GOVERNANCE', 'horde', 'tl-03', 'closeout')
FILES = ['rows_a.py', 'rows_b.py', 'rows_c.py']
MARK = re.compile(r'^# -{20,} (T1-\d{3})\s*$', re.M)


def _load():
    out = {}
    for fn in FILES:
        t = open(os.path.join(CO, fn), encoding='utf-8', newline='').read()
        ms = list(MARK.finditer(t))
        for i, m in enumerate(ms):
            out[m.group(1)] = (fn, m.start(), ms[i + 1].start() if i + 1 < len(ms) else len(t))
    return out


class R:
    def __init__(self, rid):
        self.rid = rid
        idx = _load()
        if rid not in idx: raise KeyError(rid)
        self.fn, self.a, self.b = idx[rid]
        self.path = os.path.join(CO, self.fn)

    def text(self):
        return open(self.path, encoding='utf-8', newline='').read()[self.a:self.b]

    def _write(self, newblock):
        t = open(self.path, encoding='utf-8', newline='').read()
        t = t[:self.a] + newblock + t[self.b:]
        open(self.path, 'w', encoding='utf-8', newline='').write(t)
        self.b = self.a + len(newblock)

    def replace(self, old, new, count=1):
        blk = self.text()
        n = blk.count(old)
        if n != count:
            raise SystemExit('%s: expected %d occurrence(s) of %r, found %d' % (self.rid, count, old[:80], n))
        self._write(blk.replace(old, new))

    def add_cites(self, lines, after=None):
        blk = self.text()
        i = blk.index('    cites={')
        j = blk.index('\n    },\n', i)          # end of the cites dict
        if after:
            m = re.search(r"\n        '%s': " % re.escape(after), blk[i:j + 1])
            if not m: raise SystemExit('%s: cite key %s not found' % (self.rid, after))
            k = i + m.start() + 1
            # end of that entry: next line that begins a new key or the closing
            m2 = re.search(r"\n        '[A-Za-z0-9_]+': ", blk[k:j + 1])
            pos = (k + m2.start() + 1) if m2 else j + 1
        else:
            pos = j + 1
        ins = ''.join('        ' + l.rstrip() + '\n' for l in lines)
        self._write(blk[:pos] + ins + blk[pos:])

    def sub_keys(self, n, add=(), remove=()):
        blk = self.text()
        i = blk.index('    subs=[')
        j = blk.index('\n    ],\n', i)
        lines = blk[i:j + 1].split('\n')
        # sub-claim lines start with 8 spaces and '('
        idxs = [x for x, l in enumerate(lines) if l.startswith('        (')]
        if n > len(idxs): raise SystemExit('%s: only %d subs' % (self.rid, len(idxs)))
        l = lines[idxs[n - 1]]
        m = list(re.finditer(r"\[([^\]]*)\]", l))[-1]
        keys = re.findall(r"'([^']+)'", m.group(1))
        for k in add:
            if k not in keys: keys.append(k)
        keys = [k for k in keys if k not in remove]
        l2 = l[:m.start()] + '[' + ', '.join("'%s'" % k for k in keys) + ']' + l[m.end():]
        lines[idxs[n - 1]] = l2
        self._write(blk[:i] + '\n'.join(lines) + blk[j + 1:])

    def ext(self, key, newquote, **kw):
        """Replace the quote (first string literal) of citation `key` by newquote; kw: replace/add keyword arguments by text (e.g. note="..." as python source)."""
        blk = self.text()
        m = re.search(r"\n        '%s': (OR|L|CMP)\(" % re.escape(key), blk)
        if not m: raise SystemExit('%s: cite %s not found' % (self.rid, key))
        pos = m.end()
        if m.group(1) == 'L':
            m2 = re.compile(r"\s*'[^']*'\s*,\s*").match(blk, pos)       # source id literal
            pos = m2.end()
        mq = re.compile(r"(?:'(?:[^'\\]|\\.)*'|\"(?:[^\"\\]|\\.)*\")").match(blk, pos)
        if not mq: raise SystemExit('%s: cannot parse quote of %s' % (self.rid, key))
        self._write(blk[:mq.start()] + repr(newquote) + blk[mq.end():])

    def set_page(self, key, page):
        """Set the stated page (third positional argument) of citation line `key`."""
        blk = self.text()
        m = re.search(r"\n        '%s': (?:OR|L|CMP)\(.*\),\n" % re.escape(key), blk)
        if not m: raise SystemExit('%s: cite %s not found' % (self.rid, key))
        line = m.group(0)
        # the page literal is the quoted number (or range) that follows the report argument: , 'NNN' or , None
        new, n = re.subn(r"(,\s*(?:R\d{3}|None|'OR27-\d-[RD]\d+'))\s*,\s*(?:'[^']*'|None)(\s*[,)])", lambda mm: mm.group(1) + ", '" + str(page) + "'" + mm.group(2), line, count=1)
        if n != 1: raise SystemExit('%s: cannot set page of %s: %s' % (self.rid, key, line[:200]))
        self._write(blk.replace(line, new))

    def set_kw(self, key, name, value):
        """Set/replace keyword argument `name` (a string) of the citation line `key`."""
        blk = self.text()
        m = re.search(r"\n        '%s': (?:OR|L|CMP)\(.*\),\n" % re.escape(key), blk)
        if not m: raise SystemExit('%s: cite %s not found' % (self.rid, key))
        line = m.group(0)
        assert line.endswith('),\n')
        body = line[:-3]                     # without '),\n'
        lit = r"(?:'(?:[^'\\]|\\.)*'|\"(?:[^\"\\]|\\.)*\")"
        rx = re.compile(r",\s*%s=%s" % (re.escape(name), lit))
        body = rx.sub('', body, count=1)
        body += ', %s=%s' % (name, repr(value))
        self._write(blk.replace(line, body + '),\n'))

    def show(self, what='subs', width=400):
        blk = self.text()
        print(blk[:0])
        for l in blk.split('\n'):
            if what in ('all',) or (what == 'subs' and l.startswith('        (')):
                print(l[:width])
