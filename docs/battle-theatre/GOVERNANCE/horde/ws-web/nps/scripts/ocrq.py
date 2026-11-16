#!/usr/bin/env python3
"""Authoring aid for extracts from scanned typescripts (workstream bt-web, task nps-landscape).

The text layer of a photocopied typescript is damaged and its OCR (scripts/ocr.py) still misreads letters and
digits. build_extracts.py accepts a *cleaned* quote in which every wrong glyph group is given as {{saved|fixed}}
(`saved` exactly as the OCR text reads, `fixed` as the page reads). Typing those pairs by hand is slow and error
prone, so this script takes the quote as it reads on the PAGE IMAGE (typed by the engineer who looked at the
image) and aligns it with the OCR text of the page, word by word, and writes the {{saved|fixed}} form.

  ocrq.py show   ID PAGE                      print the OCR text of a page (whitespace-normalised)
  ocrq.py align  ID PAGE "true text"          print the marked quote and the list of pairs
  ocrq.py compile DRAFT OUT.xdef              compile a draft file into an .xdef definition file

A draft file has the lines of an .xdef file (see build_extracts.py) except that a quote field starts with '@@'
and holds the text as the page image reads it; a trailing ' ~O' (OCR text) is added to the compiled anchor
automatically. The context field (9th) may start with '@@' too and then uses the same OCR text.

Nothing is guessed: the compiled line is only a representation of what the engineer read. The builder then
checks that the SAVED forms occur exactly once on the page, and verify_extracts.py re-checks it; every pair is
listed in the extract record (ocr_corrections). Pairs that contain a digit are printed as DIGITS and must be
confirmed against the page image by the engineer (they are confirmed by listing the page in %images).

Run with python3 -I.
"""
import difflib, importlib.util, os, re, sys, unicodedata

HERE = os.path.dirname(os.path.abspath(__file__))
_spec = importlib.util.spec_from_file_location('build_extracts', os.path.join(HERE, 'build_extracts.py'))
be = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(be)


def key(tok):
    # the same letters the builder counts (build_extracts._alnum_map): NFKC, alphanumerics only, lower case
    return ''.join(d.lower() for c in tok for d in unicodedata.normalize('NFKC', c) if d.isalnum())


def toks(text, split_junk=False):
    """(token, key) pairs of the whitespace-normalised text. split_junk splits OCR tokens fused by '/', '_', '~' or '|'."""
    out = []
    for t in be.norm(text).split(' '):
        for u in (re.split(r'[/_~|\\]+', t) if split_junk else [t]):
            if key(u):
                out.append((u, key(u)))
    return out


def find_window(A, first, last):
    """Token index range of the OCR text that starts with the words `first` and ends with the words `last` (both exact
    runs of OCR words, whitespace-insensitive, copied from `ocrq.py show`)."""
    fa = [k for _, k in toks(first, True)]
    la = [k for _, k in toks(last, True)]
    ak = [k for _, k in A]
    starts = [i for i in range(len(ak)) if ak[i:i + len(fa)] == fa]
    if len(starts) != 1:
        raise SystemExit('OCR window start %r found %d times' % (first, len(starts)))
    i0 = starts[0]
    ends = [i for i in range(i0, len(ak)) if ak[i:i + len(la)] == la]
    if not ends:
        raise SystemExit('OCR window end %r not found after the start' % last)
    return i0, ends[0] + len(la)


_SIM = {}


def sim(x, y):
    """Similarity score of two OCR/true token keys: equal 3; similar 1.6 to 2; unlike -1.5."""
    if x == y:
        return 3.0
    k = (x, y)
    v = _SIM.get(k)
    if v is None:
        if abs(len(x) - len(y)) > max(len(x), len(y)) // 2 + 1:
            v = -1.5
        else:
            r = difflib.SequenceMatcher(None, x, y, autojunk=False).ratio()
            v = 1.0 + r if r >= 0.55 else -1.5
        _SIM[k] = v
    return v


GAP = -2.0


def dp_align(a, b):
    """Semi-global alignment of the true keys b (all aligned) into the OCR keys a (free flanks).
    Returns the list of steps (kind, i, j) with kind 'M' (OCR token i with true token j), 'O' (OCR token i alone, inside
    the aligned region) or 'T' (true token j alone), in order, and the OCR index range [i0, i1)."""
    n, m = len(a), len(b)
    NEG = -1e9
    H = [[NEG] * (m + 1) for _ in range(n + 1)]
    P = [[None] * (m + 1) for _ in range(n + 1)]
    for i in range(n + 1):
        H[i][0] = 0.0                      # free leading OCR tokens
    for j in range(1, m + 1):
        H[0][j] = H[0][j - 1] + GAP
        P[0][j] = 'T'
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            best, how = H[i - 1][j - 1] + sim(a[i - 1], b[j - 1]), 'M'
            v = H[i][j - 1] + GAP
            if v > best:
                best, how = v, 'T'
            if j < m:                      # an OCR token inside the region (not after the last true token)
                v = H[i - 1][j] + GAP
                if v > best and H[i - 1][j] > NEG / 2 and j > 0:
                    best, how = v, 'O'
            H[i][j], P[i][j] = best, how
    # free trailing OCR tokens: the best end over all i
    iend = max(range(n + 1), key=lambda i: (H[i][m], -i))
    steps, i, j = [], iend, m
    while j > 0:
        how = P[i][j]
        if how == 'M':
            steps.append(('M', i - 1, j - 1)); i -= 1; j -= 1
        elif how == 'T':
            steps.append(('T', None, j - 1)); j -= 1
        else:
            steps.append(('O', i - 1, None)); i -= 1
    steps.reverse()
    return steps, i, iend


def align(page_text, true_text, window=None):
    """Return (marked quote, pairs, suspects). window = (first OCR words, last OCR words) when given by the engineer."""
    A = toks(page_text, True)
    T = toks(true_text)
    if len(T) < 3:
        raise SystemExit('quote too short: %r' % true_text)
    if window:
        lo, hi = find_window(A, *window)
        A = A[lo:hi]
    a = [k for _, k in A]
    b = [k for _, k in T]
    steps, i0, i1 = dp_align(a, b)
    # items: ['eq'|'diff', saved tokens, true tokens]
    items = []
    for kind, i, j in steps:
        if kind == 'M' and a[i] == b[j]:
            items.append(['eq', [A[i][0]], [T[j][0]]])
        else:
            sv = [A[i][0]] if i is not None else []
            fx = [T[j][0]] if j is not None else []
            if items and items[-1][0] == 'diff':
                items[-1][1] += sv
                items[-1][2] += fx
            else:
                items.append(['diff', sv, fx])
    # a window given by the engineer: OCR tokens left over at either end belong to the pairs at that end
    if window:
        first_i = next((i for k_, i, j in steps if i is not None), None)
        last_i = next((i for k_, i, j in reversed(steps) if i is not None), None)
        lead = [A[x][0] for x in range(0, first_i)] if first_i is not None else []
        trail = [A[x][0] for x in range(last_i + 1, len(A))] if last_i is not None else []
        if lead:
            if items[0][0] == 'diff':
                items[0][1] = lead + items[0][1]
            else:
                items.insert(0, ['diff', lead, []])
        if trail:
            if items[-1][0] == 'diff':
                items[-1][1] += trail
            else:
                items.append(['diff', trail, []])
    # a difference with nothing on the OCR side takes a neighbouring equal token to stand on
    k = 0
    while k < len(items):
        if items[k][0] == 'diff' and not items[k][1]:
            if k > 0 and items[k - 1][0] == 'eq':
                pv = items[k - 1]
                items[k][1] = [pv[1][-1]]
                items[k][2] = [pv[2][-1]] + items[k][2]
                pv[1], pv[2] = pv[1][:-1], pv[2][:-1]
                if not pv[1]:
                    items.pop(k - 1); k -= 1
            elif k + 1 < len(items) and items[k + 1][0] == 'eq':
                nx = items[k + 1]
                items[k][1] = [nx[1][0]]
                items[k][2] = items[k][2] + [nx[2][0]]
                nx[1], nx[2] = nx[1][1:], nx[2][1:]
                if not nx[1]:
                    items.pop(k + 1)
            else:
                raise SystemExit('cannot express the difference %r (no OCR text beside it)' % items[k][2])
        k += 1
    # adjacent differences merge
    merged = []
    for it in items:
        if merged and merged[-1][0] == 'diff' and it[0] == 'diff':
            merged[-1][1] += it[1]; merged[-1][2] += it[2]
        else:
            merged.append(it)
    out, pairs, suspects = [], [], []
    for kind, sv, fx in merged:
        if kind == 'eq':
            out.append(' '.join(fx))
        else:
            ssv, sfx = ' '.join(sv), ' '.join(fx)
            if len(sv) > len(fx) + 3 or len(fx) > len(sv) + 3:
                suspects.append((ssv, sfx))
            out.append('{{%s|%s}}' % (ssv, sfx))
            pairs.append((ssv, sfx))
    return ' '.join(x for x in out if x != ''), pairs, suspects


def digit_pairs(pairs):
    return [(s, f) for s, f in pairs if re.search(r'\d', s) or re.search(r'\d', f)]


def load_ocr(sid):
    pgs, sha, path = be.pages(sid, 'ocr')
    return pgs


def split_window(text):
    """'true text ## first OCR words >>> last OCR words' -> (true text, (first, last))"""
    if ' ## ' in text:
        t, w = text.split(' ## ', 1)
        a, b = w.split(' >>> ', 1)
        return t.strip(), (a.strip(), b.strip())
    return text, None


def cmd_show(sid, p):
    pgs = load_ocr(sid)
    print(be.norm(pgs[int(p)]))


def cmd_align(sid, p, true_text):
    pgs = load_ocr(sid)
    true_text, window = split_window(true_text)
    marked, pairs, suspects = align(pgs[int(p)], true_text, window)
    print(marked)
    print('--- %d pair(s)' % len(pairs))
    for s_, f_ in suspects:
        print('  SUSPECT (lengths differ much): {{%s|%s}}' % (s_, f_))
    for s, f in pairs:
        print('  {{%s|%s}}%s' % (s, f, '   DIGITS' if re.search(r'\d', s + f) else ''))


def compile_draft(draft, out):
    sid = None
    cache = {}
    lines_out = []
    report = []
    for ln, line in enumerate(open(draft, encoding='utf-8'), 1):
        line = line.rstrip('\n')
        if not line.strip() or line.lstrip().startswith('#') or line.startswith('%'):
            lines_out.append(line)
            continue
        if line.startswith('@') and not line.startswith('@@'):
            sid = line[1:].strip()
            cache = load_ocr(sid)
            lines_out.append(line)
            continue
        parts = [x.strip() for x in line.split(' | ')]
        if len(parts) not in (8, 9) or not parts[7].startswith('@@'):
            lines_out.append(line)
            continue
        pg = re.match(r'(\d+)', parts[0]).group(1)
        true_text = parts[7][2:].strip()
        true_text, window = split_window(true_text)
        marked, pairs, suspects = align(cache[int(pg)], true_text, window)
        report.append((ln, pg, pairs))
        for s_, f_ in suspects:
            print('SUSPECT line %d p.%s (check this pair against the page image): {{%s|%s}}' % (ln, pg, s_, f_))
        parts[7] = '=' + marked + ' ~O'
        if len(parts) == 9 and parts[8].lstrip().startswith(('@@', '@%s: @@' % pg)) or (len(parts) == 9 and re.match(r'@\d+: @@', parts[8])):
            c = parts[8]
            mc = re.match(r'@(\d+):\s*@@(.*)$', c)
            if mc:
                cp, ct = mc.group(1), mc.group(2).strip()
                ct, cwin = split_window(ct)
                cm, cpairs, csus = align(cache[int(cp)], ct, cwin)
                for s_, f_ in csus:
                    print('SUSPECT context line %d p.%s: {{%s|%s}}' % (ln, cp, s_, f_))
                parts[8] = '@%s: =%s' % (cp, cm)
                report.append((ln, cp, cpairs))
            else:
                ct = c.lstrip()[2:].strip()
                ct, cwin = split_window(ct)
                cm, cpairs, csus = align(cache[int(pg)], ct, cwin)
                for s_, f_ in csus:
                    print('SUSPECT context line %d p.%s: {{%s|%s}}' % (ln, pg, s_, f_))
                parts[8] = '=' + cm
                report.append((ln, pg, cpairs))
        lines_out.append(' | '.join(parts))
    with open(out, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines_out) + '\n')
    nd = 0
    for ln, pg, pairs in report:
        for s, f_ in digit_pairs(pairs):
            nd += 1
            print('DIGITS line %d p.%s: {{%s|%s}}' % (ln, pg, s, f_))
    print('%d lines compiled; %d pair(s) with digits to confirm against the page image' % (len(report), nd))


if __name__ == '__main__':
    a = sys.argv[1:]
    if not a:
        print(__doc__)
        sys.exit(2)
    if a[0] == 'show':
        cmd_show(a[1], a[2])
    elif a[0] == 'align':
        cmd_align(a[1], a[2], a[3])
    elif a[0] == 'compile':
        compile_draft(a[1], a[2])
    else:
        print(__doc__)
        sys.exit(2)
