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
    return re.sub(r'[^a-z0-9]', '', unicodedata.normalize('NFKC', tok).lower())


def toks(text):
    return [(t, key(t)) for t in be.norm(text).split(' ') if key(t)]


def align(page_text, true_text):
    """Return (marked quote, pairs, window of OCR tokens)."""
    A = toks(page_text)
    T = toks(true_text)
    if len(T) < 3:
        raise SystemExit('quote too short: %r' % true_text)
    a = [k for _, k in A]
    b = [k for _, k in T]
    sm = difflib.SequenceMatcher(None, a, b, autojunk=False)
    blocks = [m for m in sm.get_matching_blocks() if m.size >= 2 or (m.size == 1 and len(a[m.a]) >= 5)]
    if not blocks:
        raise SystemExit('no anchor of the quote found on the page')
    # densest cluster: take the block with the most matched tokens as the centre, keep blocks within one quote length of it
    best = max(blocks, key=lambda m: m.size)
    centre = best.a - best.b
    keep = [m for m in blocks if abs((m.a - m.b) - centre) <= max(12, len(b) // 2)]
    lo = max(0, min(m.a - m.b for m in keep) - 3)
    hi = min(len(a), max(m.a + (len(b) - m.b) for m in keep) + 3)
    win = A[lo:hi]
    wa = [k for _, k in win]
    sm2 = difflib.SequenceMatcher(None, wa, b, autojunk=False)
    ops = list(sm2.get_opcodes())
    # OCR-only tokens before the first and after the last true token are not part of the quote
    while ops and ops[0][0] == 'delete':
        ops.pop(0)
    while ops and ops[-1][0] == 'delete':
        ops.pop()
    if not ops:
        raise SystemExit('quote does not align with the page')
    if ops[0][0] == 'replace':
        tag, a1, a2, b1, b2 = ops[0]
        if a2 - a1 > b2 - b1:
            a1 = a2 - (b2 - b1)
        ops[0] = (tag, a1, a2, b1, b2)
    if ops[-1][0] == 'replace':
        tag, a1, a2, b1, b2 = ops[-1]
        if a2 - a1 > b2 - b1:
            a2 = a1 + (b2 - b1)
        ops[-1] = (tag, a1, a2, b1, b2)
    out, pairs = [], []
    k = 0
    while k < len(ops):
        tag, a1, a2, b1, b2 = ops[k]
        if tag == 'equal':
            out.append(' '.join(t for t, _ in T[b1:b2]))
            k += 1
            continue
        # a differing run: merge with the neighbouring equal token when the OCR side or the true side is empty
        saved = [t for t, _ in win[a1:a2]]
        fixed = [t for t, _ in T[b1:b2]]
        if tag == 'delete' and not out:
            # leading OCR garbage before the quote: not part of the quote
            k += 1
            continue
        if not saved and out:
            # the page text lacks words the page image has: absorb the previous equal word
            prev_true = out.pop().split(' ')
            pv = prev_true.pop()
            if prev_true:
                out.append(' '.join(prev_true))
            saved = [pv]
            fixed = [pv] + fixed
        s, f = ' '.join(saved), ' '.join(fixed)
        out.append('{{%s|%s}}' % (s, f))
        pairs.append((s, f))
        k += 1
    marked = ' '.join(x for x in out if x != '')
    marked = re.sub(r'\}\} \{\{', ' ', marked) if False else marked
    return marked, pairs


def digit_pairs(pairs):
    return [(s, f) for s, f in pairs if re.search(r'\d', s) or re.search(r'\d', f)]


def load_ocr(sid):
    pgs, sha, path = be.pages(sid, 'ocr')
    return pgs


def cmd_show(sid, p):
    pgs = load_ocr(sid)
    print(be.norm(pgs[int(p)]))


def cmd_align(sid, p, true_text):
    pgs = load_ocr(sid)
    marked, pairs = align(pgs[int(p)], true_text)
    print(marked)
    print('--- %d pair(s)' % len(pairs))
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
        marked, pairs = align(cache[int(pg)], true_text)
        report.append((ln, pg, pairs))
        parts[7] = '=' + marked + ' ~O'
        if len(parts) == 9 and parts[8].lstrip().startswith(('@@', '@%s: @@' % pg)) or (len(parts) == 9 and re.match(r'@\d+: @@', parts[8])):
            c = parts[8]
            mc = re.match(r'@(\d+):\s*@@(.*)$', c)
            if mc:
                cp, ct = mc.group(1), mc.group(2).strip()
                cm, cpairs = align(cache[int(cp)], ct)
                parts[8] = '@%s: =%s' % (cp, cm)
                report.append((ln, cp, cpairs))
            else:
                ct = c.lstrip()[2:].strip()
                cm, cpairs = align(cache[int(pg)], ct)
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
