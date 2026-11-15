#!/usr/bin/env python3
"""The one way the town evidence tools read a search term (used by find_text.py and local_coverage.py).

A term is a regular expression, matched case-insensitively, with `.` also crossing a line end (the local texts are OCR text broken into lines).
Two conveniences, so that a term can be written the way the words are written:

* a space outside a character class matches a run of whitespace, a hyphen at a line end included ("court house" finds "Court-\\nhouse");
* a space inside a character class matches any whitespace character ("court[- ]?house" finds "court house", "court-house", "courthouse").

Everything else is the regular expression as written; a backslash escape is passed through untouched. Matching is a lead for a reader, never evidence:
a quote of an evidence row is checked by validate_evidence.py.

    python3 -I tools/bt/town/textpat.py --self-test
"""
import re
import sys


def translate(p):
    """The regular expression text for a term (see the module docstring)."""
    out, in_cls, i, n = [], False, 0, len(p)
    while i < n:
        c = p[i]
        if c == '\\' and i + 1 < n:
            out.append(p[i:i + 2])
            i += 2
            continue
        if in_cls:
            if c == ']':
                in_cls = False
            out.append(r'\s' if c == ' ' else c)
        elif c == '[':
            in_cls = True
            out.append(c)
            # a `]` or `^]` straight after the opening bracket is a member of the class, not its end
            if i + 1 < n and p[i + 1] == '^':
                out.append('^')
                i += 1
            if i + 1 < n and p[i + 1] == ']':
                out.append(r'\]')
                i += 1
        elif c == ' ':
            out.append(r'(?:\s|-\s)+')
        else:
            out.append(c)
        i += 1
    return ''.join(out)


def compile_term(p):
    return re.compile(translate(p), re.I | re.S)


def count(rx, text):
    n = 0
    for _ in rx.finditer(text):
        n += 1
    return n


def self_test():
    assert count(compile_term('court[- ]?house'), 'the Court-house, the court house and the courthouse, the court\nhouse') == 4
    assert count(compile_term('court house'), 'The Court-\nhouse and the court   house and COURT\n\nHOUSE') == 3
    assert count(compile_term('jail|prison'), 'Jail prison JAIL') == 3
    assert count(compile_term('church.{0,60}hospital'), 'the church was\nused as a hospital') == 1
    assert count(compile_term('Baltimore [Ss]treet'), 'Baltimore\nstreet and baltimore Street') == 2
    assert count(compile_term(r'St\. Francis Xavier'), 'St. Francis\nXavier and St Francis Xavier') == 1
    assert count(compile_term('Lin(?:ae|e)an'), 'Linaean Linean') == 2
    assert count(compile_term('x[]a ]y'), 'x]y xay x y') == 3
    assert count(compile_term('x[^] ]y'), 'xay x y x]y') == 1
    assert count(compile_term(r'a\ b'), 'a b ab') == 1
    for bad in ('court[- ?house',):
        try:
            compile_term(bad)
        except re.error:
            pass
        else:
            raise AssertionError('an unterminated class must be refused: ' + bad)
    print('textpat self-test ok')


if __name__ == '__main__':
    if '--self-test' in sys.argv:
        self_test()
    else:
        print(__doc__)
        sys.exit(2)
