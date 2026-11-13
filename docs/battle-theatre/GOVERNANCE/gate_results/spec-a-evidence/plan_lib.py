"""Shared helpers for the GATE-SPEC-A checks: the plan pages, text folding, the spec's lines.
Read-only. Not shipped. Run with: python3 -I <script>"""
import os, re, json

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, *(['..'] * 5)))
PLAN = os.path.join(ROOT, 'docs', 'battle-theatre', 'BIBLE', 'plan-clean.txt')
GOV = os.path.join(ROOT, 'docs', 'battle-theatre', 'GOVERNANCE')
SPEC = os.path.join(GOV, 'gate_results', 'GATE-SPEC-A.md')
FOOTER = re.compile(r'Gettysburg Total War animation plan, version 2 \| page \d+ of 144')


def load_pages():
    t = open(PLAN, encoding='utf-8').read()
    parts = re.split(r'\n\n=== PAGE (\d+) ===\n', t)
    return {int(parts[i]): parts[i + 1] for i in range(1, len(parts), 2)}


def fold(s):
    """Fold quotation marks, dashes, escapes and whitespace; lower case."""
    s = s.replace('\\\\', '\\').replace("\\'", "'").replace('\\"', '"').replace('\\`', '`')
    for a, b in (('’', "'"), ('‘', "'"), ('“', '"'), ('”', '"'), ('–', '-'), ('—', '-'),
                 ('×', 'x'), (' ', ' '), ('−', '-')):
        s = s.replace(a, b)
    return re.sub(r'\s+', ' ', s).strip().lower()


def squash(s):
    """fold, then drop every space (handles line-break hyphenation of the extracted text)."""
    return fold(s).replace(' ', '')


_RANGE = r'(\d{1,3})(?:\s*(?:-|–|to)\s*(\d{1,3}))?'


def _add(out, a, b):
    if 1 <= a <= 144 and 1 <= b <= 144 and a <= b <= a + 12:
        out.update(range(a, b + 1))


def pages_cited(line):
    """Page numbers a line of the spec cites: 'p. 136', 'pp. 135-136', 'p. 62-63', '(p. 9, B.2)', 'pp. 4, 124', 'pp. 119, 123, 130'."""
    out = set()
    for m in re.finditer(r'\bpp\.\s*(' + _RANGE + r'(?:\s*,\s*' + _RANGE + r')*)', line):
        for part in re.split(r'\s*,\s*', m.group(1)):
            mm = re.match(_RANGE + r'$', part.strip())
            if mm: _add(out, int(mm.group(1)), int(mm.group(2) or mm.group(1)))
    for m in re.finditer(r'\bp\.\s*' + _RANGE, line):
        _add(out, int(m.group(1)), int(m.group(2) or m.group(1)))
    return out


def joined(pages, a, b):
    """The text of pages a..b joined with the page footer removed (a quotation may cross a page break)."""
    return ' '.join(FOOTER.sub(' ', pages[n]) for n in range(a, b + 1) if n in pages)
