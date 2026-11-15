"""Shared helpers of the conf-nc work item (Moore, Roster of North Carolina Troops in the War between the States, 1882, four volumes).

Standard library only.  Reads the pinned OCR texts of the ledger data2/sources/NC-MOORE-1882.json (text ids NC-MOORE-1882.<vol>, and
NC-MOORE-1882.<vol>~b for the second Internet Archive scan of the same edition) through verify_unit.load_source, which checks the sha256.

What is here: the text and page-map cache, the page furniture detector (running heads), the heading detector (company, field and staff,
officers, non-commissioned officers, privates), and the token stream of a section (offsets of every token, furniture left out).
The entry heads and the entry cutting are in nc_parse.py.
"""
import os, re, sys, json, bisect

HERE = os.path.dirname(os.path.abspath(__file__))
P2 = os.path.abspath(os.path.join(HERE, '..'))
sys.path.insert(0, P2)
import r2lib as R
import verify_unit as V

ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..', '..'))
R2 = os.path.join(ROOT, 'docs', 'battle-theatre', 'rosters')
D2 = os.path.join(R2, 'data2')
WS = os.path.join(ROOT, 'docs', 'battle-theatre', 'GOVERNANCE', 'horde', 'ws-rosters', 'conf-nc')
RAW = os.path.join(ROOT, 'tmp', 'library', 'rosters', 'NC-MOORE-1882')
SOURCE_ID = 'NC-MOORE-1882'

_texts = {}


def text_id(vol, scan='a'):
    """scan 'a' = the item named by the work item (vol 1 Google scan, vol 2 Boston Public Library, vols 3 and 4 State Library of North Carolina);
    scan 'b' = the Emory University copy of the same edition."""
    return '%s.%s%s' % (SOURCE_ID, vol, '' if scan == 'a' else '~b')


def load(tid):
    """(text, PageMap, ledger entry) of a text id, sha256 checked against the ledger."""
    if tid not in _texts:
        _texts[tid] = V.load_source(SOURCE_ID, tid)
    return _texts[tid]


# ------------------------------------------------------------------ lines and furniture

def lines_of(text, a, b):
    """[(offset, line)] of the lines of text[a:b] (a line excludes its newline); offsets are absolute."""
    out, p = [], a
    for ln in text[a:b].split('\n'):
        out.append((p, ln))
        p += len(ln) + 1
    return out


# Running heads of the printed pages.  Left pages print "NNN North Carolina State Troops.", right pages "Company X-- Nth Regiment. NNN" (and
# "Field and Staff-- Nth Regiment", "Nth Regiment-- Infantry NNN" on the first page of a regiment).  The OCR garbles letters
# (Forth, Worth, Carolim, SUte, Comp&nj, Oompmy ...), so the match is by the shape of the line and by fuzzy words, never by exact spelling.
import difflib


def _sim(a, b):
    return difflib.SequenceMatcher(None, a, b).ratio()


def _words(s):
    return [w for w in re.split(r'[^A-Za-z&]+', s) if w]


def _has(words, target, minlen, ratio):
    return any(len(w) >= minlen and _sim(w.lower().replace('&', 'a'), target) >= ratio for w in words)


RE_PAGENUM = re.compile(r"^\W*[0-9]{1,4}\W*$")
RE_NCTROOPS = re.compile(r"^\W*NORTH\s+CAROLINA\s+TROOPS\W*$", re.I)


def is_furniture(s):
    """True for a running head or a page number line (the whole line)."""
    s = s.strip()
    if not s or len(s) > 80:
        return False
    if RE_PAGENUM.match(s) or RE_NCTROOPS.match(s):
        return True
    w = _words(s)
    if not w or len(w) > 12:
        return False
    # left page: ... Carolina ... Troops
    if _has(w, 'carolina', 5, 0.7) and _has(w, 'troops', 5, 0.75) and len(w) <= 6:
        return True
    # right page: Company X-- Nth Regiment NNN | Field and Staff-- Nth Regiment | Non-Commissioned Staff-- ...
    first = w[0].lower().replace('&', 'a')
    if (len(first) >= 5 and _sim(first, 'company') >= 0.6) or (first in ('field', 'fidd', 'fiold') and len(w) >= 3) or first.startswith('non') and 'staff' in s.lower():
        if _has(w, 'regiment', 6, 0.7) or _has(w, 'battalion', 7, 0.7) or _has(w, 'legion', 5, 0.8):
            return True
    return False


# ------------------------------------------------------------------ headings

LETTERS = list('ABCDEFGHIKLMNOP')       # Moore letters the companies A, B, C, D, E, F, G, H, I, K, L, M ... (no J)
CMAP = {'A': 'A', 'B': 'B', 'a': 'C', 'C': 'C', 'D': 'D', 'E': 'E', 'F': 'F', 'G': 'G', 'II': 'H', 'H': 'H', 'I': 'I', 'K': 'K', 'L': 'L', 'M': 'M', 'N': 'N', 'O': 'O', 'P': 'P',
        '€': 'C', '0': 'C', '1': 'I', 'y': 'G', 'Hr': 'H', 'BL': 'B', 'CL': 'C', 'IL': 'H', 'II.': 'H', 'J': 'I', 'T': 'I', 'l': 'I'}
CONFUSE = {'A': set('AHRa'), 'B': set('BRE8') | {'II', 'BL'}, 'C': set('CaGOQcge0€') | {'€', 'CL'}, 'D': set('DOB') | {'I)'}, 'E': set('ERFB'), 'F': set('FEP'),
           'G': set('GaCOQ6y0'), 'H': set('HRN') | {'II', 'Hr', 'IL'}, 'I': set('ILT1lJ') | {'II'}, 'K': set('KRXL'), 'L': set('LIK'), 'M': set('MHN')}

# Headings are printed in capitals; the OCR garbles them (FIEliD AND STAFF, NOX-COMMl!jSIONED OFFICERS, COMPANY a, ©FFICERS), so a heading is read by the
# closest canonical word of the upper-case tokens of a line, never by exact spelling.
def _upper_share(w):
    lt = [c for c in w if c.isalpha()]
    return (sum(1 for c in lt if c.isupper()) / len(lt)) if lt else 0.0


def _fz(w, target):
    w = re.sub(r'[^A-Za-z]', '', w).upper().replace('0', 'O')
    return difflib.SequenceMatcher(None, w, target).ratio() if w else 0.0


def heading_scan(toks):
    """toks: [(start, end, text)] of one line.  Returns [(first token index, end token index (exclusive), kind, payload text)] of the headings in the line.
    kind: comp (payload = the letter token as printed) fs nco off priv mus abbr."""
    out = []
    n = len(toks)
    i = 0
    while i < n:
        w = toks[i][2]
        core = re.sub(r'[^A-Za-z]', '', w)
        if len(core) >= 3 and _upper_share(w) >= 0.65:
            nxt = toks[i + 1][2] if i + 1 < n else ''
            if len(core) >= 5 and _fz(w, 'COMPANY') >= 0.72 and len(core) <= 9:
                letter = nxt if (i + 1 < n and len(nxt) <= 4) else ''
                out.append((i, i + (2 if letter else 1), 'comp', letter))
                i += 2 if letter else 1
                continue
            if _fz(w, 'FIELD') >= 0.7 and any(_fz(toks[j][2], 'STAFF') >= 0.7 for j in range(i + 1, min(i + 4, n))):
                j = next(j for j in range(i + 1, min(i + 4, n)) if _fz(toks[j][2], 'STAFF') >= 0.7)
                out.append((i, j + 1, 'fs', 'FIELD AND STAFF'))
                i = j + 1
                continue
            if _fz(w, 'NONCOMMISSIONED') >= 0.62 or (re.match(r'^N[O0X][NXH]-?$', core) and i + 1 < n and _fz(nxt, 'COMMISSIONED') >= 0.6):
                j = i + 1 if _fz(w, 'NONCOMMISSIONED') >= 0.62 else i + 2
                if j < n and (_fz(toks[j][2], 'OFFICERS') >= 0.7 or _fz(toks[j][2], 'STAFF') >= 0.7):
                    out.append((i, j + 1, 'nco', ' '.join(t[2] for t in toks[i:j + 1])))
                    i = j + 1
                    continue
            if len(core) >= 6 and _fz(w, 'OFFICERS') >= 0.8:
                out.append((i, i + 1, 'off', w))
                i += 1
                continue
            if len(core) >= 6 and _fz(w, 'PRIVATES') >= 0.8:
                out.append((i, i + 1, 'priv', w))
                i += 1
                continue
            if len(core) >= 7 and _fz(w, 'MUSICIANS') >= 0.8:
                out.append((i, i + 1, 'mus', w))
                i += 1
                continue
            if len(core) >= 8 and _fz(w, 'ABBREVIATIONS') >= 0.75:
                out.append((i, i + 1, 'abbr', w))
                i += 1
                continue
        i += 1
    return out
