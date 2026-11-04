"""Shared helpers for the Official Records Ser. I vol. 27 (Gettysburg Campaign) text library.

Raw OCR text lives in tmp/library/or27/ (gitignored). All offsets are CHARACTER offsets into the file decoded as UTF-8 with
newline='' (no newline translation), i.e. the ORIGINAL text, never the whitespace-normalized view.

Normalized view ('nview'): whitespace collapsed to single spaces; line-break hyphenation joined ("con-\\ncerning" -> "concerning")
when the next line starts with a lowercase letter; detected running-head lines (page headers) optionally blanked out so that a
phrase that crosses a page break still matches. A parallel array maps every normalized character back to its original offset.
"""
import os, re, json, bisect, hashlib
from array import array

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
RAW_DIR = os.path.join(ROOT, 'tmp', 'library', 'or27')
LIB_DIR = os.path.join(ROOT, 'docs', 'battle-theatre', 'library')
INDEX_PATH = os.path.join(LIB_DIR, 'or27_index.json')
PARTS = {1: 'cu31924077699761', 2: 'cu31924077728255', 3: 'cu31924077700262'}
PART_LABEL = {1: 'Part 1 (Union reports)', 2: 'Part 2 (Confederate reports)', 3: 'Part 3 (correspondence)'}
CITE_PREFIX = 'OR Ser.I vol.27'


def raw_path(part):
    return os.path.join(RAW_DIR, PARTS[part] + '_djvu.txt')


_text_cache = {}


def load_text(part):
    if part not in _text_cache:
        with open(raw_path(part), encoding='utf-8', newline='') as f:
            _text_cache[part] = f.read()
    return _text_cache[part]


def sha256_file(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        h.update(f.read())
    return h.hexdigest()


_TOK = re.compile(r'\S+')


def build_nview(text, blank_spans=None, dehyphen=True):
    """Return (ntext, nmap) where nmap[i] is the original character offset of ntext[i].
    blank_spans: sorted list of (start,end) original-offset spans to drop (running heads)."""
    out = []
    nmap = array('i')
    blank_spans = blank_spans or []
    bs = [s for s, e in blank_spans]
    be = [e for s, e in blank_spans]

    def in_blank(pos):
        i = bisect.bisect_right(bs, pos) - 1
        return i >= 0 and pos < be[i]

    prev_end = None
    pending_join = False
    n = 0
    for m in _TOK.finditer(text):
        s, e = m.span()
        if blank_spans and in_blank(s):
            continue
        tok = m.group()
        if pending_join:
            # previous token ended with hyphen at end of line and this token begins lowercase: join
            if tok[0].islower():
                # remove trailing '-' of previous token
                out.pop()
                nmap.pop()
                # no separator
            else:
                out.append(' ')
                nmap.append(s)
            pending_join = False
        elif out:
            out.append(' ')
            nmap.append(s)
        out.extend(tok)
        nmap.extend(range(s, e))
        if dehyphen and tok.endswith('-') and len(tok) > 1 and tok[-2].isalpha():
            # was there a newline between this token and the next?
            nxt = _TOK.search(text, e)
            if nxt and '\n' in text[e:nxt.start()]:
                pending_join = True
    return ''.join(out), nmap


def norm_query(s):
    return ' '.join(s.split())


def line_starts(text):
    ls = [0]
    for m in re.finditer('\n', text):
        ls.append(m.end())
    return ls


def utf8_stdout():
    import sys
    for st in (sys.stdout, sys.stderr):
        try:
            st.reconfigure(encoding='utf-8', errors='replace')
        except Exception:
            pass
