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

# A heading may stand alone on a line or lead the line ("OFFICERS. Lewis H. Webb, Captain, ...") or follow a running head.
HEAD_ALT = (r"(?P<comp>\bC[O0]MPAN[YV]\b[ \t]*(?P<cl>[^\s]{0,3}))|(?P<fs>\bF[I1]EL[DI][ \t]+A[NX]D[ \t]+STAFF)|(?P<nco>\bN[O0][NXH][\-—\s]*COMM\w{0,12}[ \t]+(?:OFFICERS|STAFF)\w?)|"
            r"(?P<off>\bOFFICERS\b)|(?P<priv>\bPRIVATES?\b)|(?P<mus>\bMUSICIANS\b|\bBAND\b)|(?P<abbr>\bABBREVIATIONS\b)")
RE_HEAD = re.compile(HEAD_ALT)


def heading_events(line, base):
    """Headings found in an upper-case position of a line: [(offset, end, kind, payload)]; kind in comp fs nco off priv mus abbr.
    Only tokens written in capitals count (the roll prints its remarks in lower case and abbreviations)."""
    ev = []
    for m in RE_HEAD.finditer(line):
        k = m.lastgroup if m.lastgroup != 'cl' else 'comp'
        if m.group('comp') is not None:
            k = 'comp'
        else:
            k = next(g for g in ('fs', 'nco', 'off', 'priv', 'mus', 'abbr') if m.group(g) is not None)
        s = m.group(0)
        if k == 'comp':
            # require capitals: COMPANY (not "Company") -- the running heads use Company and are furniture
            if not re.match(r'^C[O0]MPAN[YV]', s):
                continue
        ev.append((base + m.start(), base + m.end(), k, s))
    return ev
