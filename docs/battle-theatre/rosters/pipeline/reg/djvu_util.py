import re, json, os
WORD = re.compile(r'<WORD coords="(\d+),(\d+),(\d+),(\d+)(?:,\d+)?"[^>]*>(.*?)</WORD>')


def pages(path):
    """yield (page_index, [(x0, ytop, x1, ybottom, text)]) from an Internet Archive djvu.xml (both coordinate dialects)."""
    cur = None
    idx = 0
    words = []
    with open(path, encoding='utf-8', errors='replace') as f:
        for line in f:
            if '<OBJECT' in line:
                if cur is not None:
                    yield cur, words
                idx += 1
                cur = idx
                words = []
            for m in WORD.finditer(line):
                x0, yb, x1, yt = map(int, m.groups()[:4])
                words.append((x0, yt, x1, yb, m.group(5).replace('&amp;', '&').replace('&quot;', '"').replace('&apos;', "'").replace('&lt;', '<').replace('&gt;', '>')))
        if cur is not None:
            yield cur, words
