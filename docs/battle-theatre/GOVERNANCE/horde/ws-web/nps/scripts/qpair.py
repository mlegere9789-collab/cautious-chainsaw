#!/usr/bin/env python3
"""Draft a cleaned '=' quote for a damaged text layer.

  qpair.py [-L|-R|-O] SRC PAGE S1[-S2] 'the quote as it reads on the page image' [--skip K]

S1-S2 are sentence numbers of the page as printed by sent.py (the saved passage the quote is read from; the quote
may start or end inside it: leading words that do not match are skipped, trailing saved words are left out).
The tool walks the clean words against the saved words, writes a {{saved|fixed}} pair for every stretch where the
letters differ, and then checks the whole line with the builder's own matching (so a line it prints as OK will build).
It only drafts: the clean text must be typed from the page image and read against it, never from the saved text alone.

Run with python3 -I."""
import importlib.util, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('build_extracts', os.path.join(HERE, 'build_extracts.py'))
be = importlib.util.module_from_spec(spec)
spec.loader.exec_module(be)


def key(tok):
    return be._alnum_map(tok, False)[0]


def draft(saved_text, clean_text, skip=None):
    S = [t for t in saved_text.split(' ') if key(t)]
    if skip is not None:
        return draft_from(S, clean_text, skip)
    best = None
    for p0 in range(0, min(len(S), 60)):
        line, err = draft_from(S, clean_text, p0)
        if line is None:
            continue
        n = line.count('{{')
        if best is None or n < best[0]:
            best = (n, line)
        if n == 0:
            break
    if best:
        return best[1], None
    return None, draft_from(S, clean_text, 0)[1]


def draft_from(S, clean_text, p):
    C = [t for t in clean_text.split(' ') if t]
    ck = [key(t) for t in C]
    sk = [key(t) for t in S]
    out, c = [], 0
    nsave = len(S)
    while c < len(C):
        if not ck[c]:
            out.append(C[c]); c += 1
            continue
        if p >= nsave:
            return None, 'saved words ran out at clean word %d (%r)' % (c, C[c])
        # 1. one to one
        if sk[p] == ck[c]:
            out.append(C[c]); c += 1; p += 1
            continue
        # 2. several saved words make one clean word (line-end hyphenation, split letters)
        done = False
        for q in range(p + 1, min(nsave, p + 6)):
            if ''.join(sk[p:q + 1]) == ck[c]:
                out.append(C[c]); c += 1; p = q + 1; done = True
                break
        if done:
            continue
        # 3. several clean words make one saved word
        for d in range(c + 1, min(len(C), c + 5)):
            if ''.join(ck[c:d + 1]) == sk[p]:
                out.extend(C[c:d + 1]); c = d + 1; p += 1; done = True
                break
        if done:
            continue
        # 4. a stretch that differs: find the smallest (dq saved words, dc clean words) after which the words agree again
        best = None
        for tot in range(2, 14):
            for dq in range(0, tot + 1):
                dc = tot - dq
                if dq > 6 or dc > 6 or (dq == 0 and dc == 0):
                    continue
                if p + dq > nsave or c + dc > len(C):
                    continue
                # the word after the stretch must agree again (or the quote ends)
                ok = True
                look = 0
                for t in range(1):
                    if c + dc + t >= len(C):
                        break
                    if not ck[c + dc + t]:
                        continue
                    if p + dq + t >= nsave or sk[p + dq + t] != ck[c + dc + t]:
                        ok = False
                        break
                    look += 1
                if ok and (look or c + dc >= len(C)):
                    ls = len(''.join(sk[p:p + dq]))
                    lf = len(''.join(ck[c:c + dc]))
                    if abs(ls - lf) > max(3, 0.34 * max(ls, lf)):
                        continue   # the two sides are not the same stretch of text: a clean word with no saved word behind it
                    best = (dq, dc)
                    break
            if best:
                break
        if not best:
            return None, 'no way back to agreement at clean word %d (%r) against saved %r' % (c, ' '.join(C[c:c + 4]), ' '.join(S[p:p + 4]))
        dq, dc = best
        saved_part = ' '.join(S[p:p + dq])
        fixed_part = ' '.join(C[c:c + dc])
        if dq == 0:
            return None, 'the clean text has words the saved text lacks at clean word %d (%r): %r' % (c, C[c], fixed_part)
        out.append('{{%s|%s}}' % (saved_part, fixed_part))
        c += dc
        p += dq
    return ' '.join(out), None


def main():
    a = sys.argv[1:]
    variant = None
    if a and a[0] in ('-L', '-R', '-O'):
        variant = {'-L': 'layout', '-R': 'raw', '-O': 'ocr'}[a[0]]
        a = a[1:]
    skip = None
    if '--skip' in a:
        i = a.index('--skip')
        skip = int(a[i + 1])
        a = a[:i] + a[i + 2:]
    sid, page, rng, clean = a[0], int(a[1]), a[2], a[3]
    lo, _, hi = rng.partition('-')
    lo = int(lo)
    hi = int(hi or lo)
    pgs = be.pages(sid, variant)[0]
    flat = be.norm(pgs[page])
    sents = be.split_sentences(flat)
    saved = ' '.join(sents[lo - 1:hi])
    line, err = draft(saved, clean, skip)
    if err:
        print('FAILED:', err)
        sys.exit(1)
    td = be.load_sources().get(sid, {}).get('text_defect')
    lig = 'fi' if td == 'fi-ligature' else (td == 'ligature')
    res, e, _ = be.cut_cleaned(pgs[page], line, lig)
    print(line)
    print('BUILDER:', 'OK' if res else e)


if __name__ == '__main__':
    main()
