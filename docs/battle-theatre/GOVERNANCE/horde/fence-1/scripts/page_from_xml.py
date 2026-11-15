"""Printed page of a quote from the archive.org page-by-page OCR (<id>_djvu.xml, one OBJECT per leaf, downloaded into tmp/fence-1/dl/xml).
For every leaf the printed number is read from the digit tokens at the top of the page (the running head) and confirmed by its neighbours:
a leaf gets the number n only when the leaves before and after it carry n-1 and n+1 (or itself reads n and one neighbour agrees).
A quote that starts on a leaf whose number is not confirmed gets no page. Usage:
  python3 -I page_from_xml.py <archive id> <local djvu.txt path> <offset start> <offset end>
or import: PageMap(xml_path).page_of(quote) -> (leaf index, printed page or None, how)."""
import re, sys, os, unicodedata

def squash(s):
    return ''.join(d.lower() for ch in s for d in unicodedata.normalize('NFKD', ch) if d.isalnum())

class PageMap:
    def __init__(self, xml_path):
        x = open(xml_path, encoding='utf-8', errors='replace').read()
        objs = x.split('<OBJECT ')[1:]
        self.pages = []          # per leaf: squashed text
        self.head = []           # per leaf: int read from the head or None
        self.heads_all = []
        for o in objs:
            m = re.search(r'height="(\d+)"', o); H = int(m.group(1)) if m else 4000
            words = []
            for w in re.finditer(r'<WORD coords="(\d+),(\d+),(\d+),(\d+)"[^>]*>([^<]*)</WORD>', o):
                words.append((int(w.group(4)), int(w.group(1)), w.group(5)))
            txt = ' '.join(w[2] for w in words)
            self.pages.append(squash(txt))
            top = [w for w in words if w[0] < 0.16 * H]
            top.sort()
            cands = []
            for t, xx, s in top:
                s2 = s.strip().strip('.,;:')
                if re.fullmatch(r'\d{1,4}', s2): cands.append(int(s2))
                else:
                    # a head glued to words ('HISTORY OF ADAMS COUNTY. 125') arrives as separate tokens; a garbled number such as '7^8' is not read
                    pass
            self.head.append(cands[0] if len(cands) == 1 else (cands[0] if cands else None))
        self.cum = []
        pos = 0
        for p in self.pages:
            self.cum.append(pos); pos += len(p)
        self.all = ''.join(self.pages)
        self.num = self._confirm()

    def _confirm(self):
        """1. a read head h at leaf i is dropped when it is far from the local trend: the median of (head - leaf index) over the read heads within 40 leaves
              (a number read without its leading digit, '66' for '166', fails here even when its neighbours repeat the misread);
        2. a head that survives is confirmed when another leaf j within 5 leaves reads a head with h_j - h = j - i (consecutive printing);
        3. a leaf with no readable head gets n_j + (i - j) when the nearest confirmed leaves before and after it (within 8 leaves) agree: n_k - n_j = k - j"""
        n = len(self.head)
        d = [None if h is None else h - i for i, h in enumerate(self.head)]
        def median(v):
            v = sorted(v); m = len(v)
            return None if m == 0 else (v[m // 2] if m % 2 else (v[m // 2 - 1] + v[m // 2]) / 2.0)
        ok = [None] * n
        for i in range(n):
            if self.head[i] is None: continue
            near = [d[j] for j in range(max(0, i - 40), min(n, i + 41)) if j != i and d[j] is not None]
            md = median(near)
            ok[i] = self.head[i] if (md is None or abs(d[i] - md) <= 8) else None
        out = [None] * n
        for i in range(n):
            h = ok[i]
            if h is None: continue
            for j in range(max(0, i - 5), min(n, i + 6)):
                if j != i and ok[j] is not None and ok[j] - h == j - i:
                    out[i] = h; break
        conf = [i for i in range(n) if out[i] is not None]
        for i in range(n):
            if out[i] is not None: continue
            before = [j for j in conf if i - 8 <= j < i]; after = [k for k in conf if i < k <= i + 8]
            if before and after:
                j, k = before[-1], after[0]
                if out[k] - out[j] == k - j: out[i] = out[j] + (i - j)
        return out

    def leaf_of(self, quote):
        q = squash(quote)
        if len(q) < 12: return None, 'quote too short'
        key = q[:min(len(q), 60)]
        i = self.all.find(key)
        if i < 0: return None, 'not found in the page OCR'
        if self.all.find(key, i + 1) >= 0: return None, 'ambiguous (more than one hit of the first 60 characters)'
        leaf = max(k for k, c in enumerate(self.cum) if c <= i)
        return leaf, None

    def page_of(self, quote):
        leaf, err = self.leaf_of(quote)
        if leaf is None: return None, None, err
        q = squash(quote); i = self.all.find(q[:min(len(q), 60)]); j = i + len(q)
        end_leaf = max(k for k, c in enumerate(self.cum) if c < j)
        if end_leaf != leaf:
            a, b = self.num[leaf], self.num[end_leaf]
            if a is not None and b is not None and b == a + (end_leaf - leaf):
                return leaf, ('%d-%d' % (a, b)), 'the quote crosses from leaf %d to leaf %d; both numbers confirmed' % (leaf + 1, end_leaf + 1)
            return leaf, None, 'the quote crosses from leaf %d to leaf %d; numbers not both confirmed' % (leaf + 1, end_leaf + 1)
        return leaf, self.num[leaf], ('confirmed by the heads of the neighbouring leaves' if self.num[leaf] is not None else 'head of the leaf not confirmed')

if __name__ == '__main__':
    xml = sys.argv[1]
    pm = PageMap(xml)
    for q in sys.argv[2:]:
        print(pm.page_of(q))
