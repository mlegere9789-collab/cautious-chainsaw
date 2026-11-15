#!/usr/bin/env python3
"""Find a phrase or pattern in a local source of SOURCES.md and print what a row of an evidence file needs: source, part, page, text_offset and the passage.

    python3 tools/bt/town/find_text.py NPS-CLI-ERR "Klingle.{0,80}log" [--context 300] [--max 8]
    python3 tools/bt/town/find_text.py GBG-COMPILER-1863 "court[- ]?house" --part 1863-07-20
    python3 tools/bt/town/find_text.py OR27-1 "Seminary.{0,60}cupola" --max 5          (also gives the OR27 record id and its printed pages)
    python3 tools/bt/town/find_text.py --self-test

The pattern is a case-insensitive regular expression; a space in it matches any run of whitespace, a line-end hyphen is tolerated, and the text is searched in its
ORIGINAL form (offsets are character offsets into the file decoded as UTF-8 with newline=''; the same offsets the validator checks). For a family of texts
(the weekly papers, the newspaper pages) give --part, or the program searches every member it can list. Printing a match is not evidence: read the passage, then
write the row. Run with `python3 -I`; the program reads local files only.
"""
import glob, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import validate_evidence as V  # noqa: E402
import textpat  # noqa: E402


def compile_pat(p):
    return textpat.compile_term(p)


def members(ctx, sid):
    led = ctx.ledger().get(sid)
    if not led:
        raise SystemExit('source %r is not in SOURCES.md' % sid)
    t = led.get('text', '')
    if t in ('', '-', 'none'):
        raise SystemExit('source %r has no local text (image or planned source)' % sid)
    return V.list_texts(ctx, sid)


def light_text(ctx, rel):
    """(raw text, page marks) of a local text, read the way the validator reads it but without building the comparison skeleton (a search over a whole family would otherwise build one per page)."""
    hit = ctx._texts.get(rel)
    if hit:
        return hit[0], hit[3]
    with open(os.path.join(ctx.root, rel), encoding='utf-8', errors='replace', newline='') as f:
        raw = f.read()
    marks = [(m.start(), int(m.group(1))) for m in re.finditer(r'^=== PAGE (\d+) ===\s*$', raw, re.M)]
    return raw, marks


def run(sid, pattern, part=None, context=260, maxn=8, ctx=None):
    ctx = ctx or V.Ctx(V.REAL_ROOT)
    rx = compile_pat(pattern)
    led = ctx.ledger()[sid]
    n = 0
    for pt, rel in members(ctx, sid):
        if part and pt != part:
            continue
        raw, marks = light_text(ctx, rel)
        for m in rx.finditer(raw):
            page = None
            for pos, k in marks:
                if pos <= m.start():
                    page = k
                else:
                    break
            a, b = max(0, m.start() - context // 3), min(len(raw), m.end() + context)
            snippet = re.sub(r'\s+', ' ', raw[a:b])
            rec = ''
            if led.get('pages') == 'or27':
                for rid, r in ctx.or27().items():
                    if r['start_offset'] <= m.start() < r['end_offset']:
                        rec = '  record %s printed pages %s-%s (%s)' % (rid, r.get('start_page'), r.get('end_page'), r.get('start_page_conf'))
                        break
            print('%s  part=%s  page=%s  text_offset=%d%s' % (sid, pt if pt else '-', page if page is not None else '-', m.start(), rec))
            print('    ' + snippet)
            n += 1
            if n >= maxn:
                print('(stopped after %d matches; narrow the pattern or give --part)' % maxn)
                return n
    if n == 0:
        print('no match for %r in %s' % (pattern, sid))
    return n


def self_test():
    import tempfile, shutil, json
    tmp = tempfile.mkdtemp(prefix='town-find-')
    try:
        os.makedirs(os.path.join(tmp, 'docs/battle-theatre/town/evidence'))
        os.makedirs(os.path.join(tmp, 'tmp/library/test'))
        with open(os.path.join(tmp, 'tmp/library/test/a.txt'), 'w', encoding='utf-8', newline='') as f:
            f.write('=== PAGE 1 ===\nnothing\n=== PAGE 2 ===\nThe Court-\nhouse stood on the square and was used as a\nhospital.\n')
        with open(os.path.join(tmp, 'tmp/library/test/p-1.txt'), 'w', encoding='utf-8') as f:
            f.write('the barn burned\n')
        os.makedirs(os.path.join(tmp, 'tmp/library/test/nest/sn1/1863-07-08/ed-1'))
        with open(os.path.join(tmp, 'tmp/library/test/nest/sn1/1863-07-08/ed-1/seq-2.txt'), 'w', encoding='utf-8') as f:
            f.write('the court house was crowded with wounded\n')
        os.makedirs(os.path.join(tmp, 'tmp/library/test/two'))
        with open(os.path.join(tmp, 'tmp/library/test/two/x-1863-07-14__y-1863-07-14.txt'), 'w', encoding='utf-8') as f:
            f.write('a church was used as a hospital\n')
        with open(os.path.join(tmp, 'docs/battle-theatre/town/SOURCES.md'), 'w', encoding='utf-8') as f:
            f.write('| id | class | title | date | text | sha256 | pages | rights | url | notes |\n|---|---|---|---|---|---|---|---|---|---|\n'
                    '| A | official | t | 1 | tmp/library/test/a.txt | - | markers | - | - | - |\n| FAM | primary | t | 1 | tmp/library/test/p-{part}.txt | - | none | - | - | - |\n'
                    '| NEST | primary | t | 1 | tmp/library/test/nest/{part}.txt | - | none | - | - | - |\n'
                    '| TWICE | primary | t | 1 | tmp/library/test/two/x-{part}__y-{part}.txt | - | none | - | - | - |\n')
        c = V.Ctx(tmp)
        assert run('A', 'court house stood', ctx=c) == 1
        assert run('FAM', 'barn', part='1', ctx=c) == 1
        assert run('FAM', 'barn', part='2', ctx=c) == 0
        # a family whose part holds slashes (the newspaper pages) and a template that names the part twice (the weeklies)
        assert V.list_texts(c, 'NEST') == [('sn1/1863-07-08/ed-1/seq-2', 'tmp/library/test/nest/sn1/1863-07-08/ed-1/seq-2.txt')], V.list_texts(c, 'NEST')
        assert V.list_texts(c, 'TWICE') == [('1863-07-14', 'tmp/library/test/two/x-1863-07-14__y-1863-07-14.txt')], V.list_texts(c, 'TWICE')
        assert run('NEST', 'court house', ctx=c) == 1
        assert run('NEST', 'court house', part='sn1/1863-07-08/ed-1/seq-2', ctx=c) == 1
        assert run('TWICE', 'church.{0,30}hospital', part='1863-07-14', ctx=c) == 1
        assert run('TWICE', 'church', part='1863-07-15', ctx=c) == 0
        raw = open(os.path.join(tmp, 'tmp/library/test/a.txt'), newline='').read()
        m = compile_pat('court house stood').search(raw)
        assert m and raw[m.start():m.start() + 5] == 'Court'
        # a space inside a character class (the example of the docstring compiles and finds what it says), `.` across a line end
        assert compile_pat('court[- ]?house').search('the court house, the court-house and the courthouse')
        assert run('A', 'used[- ]as a', ctx=c) == 1
        assert run('A', 'court house.{0,60}hospital', ctx=c) == 1
        assert run('A', 'stood on the [Ss]quare', ctx=c) == 1
        print('find_text self-test ok')
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


if __name__ == '__main__':
    a = sys.argv[1:]
    if '--self-test' in a:
        self_test()
        sys.exit(0)
    if len(a) < 2:
        print(__doc__)
        sys.exit(2)
    part = a[a.index('--part') + 1] if '--part' in a else None
    ctxn = int(a[a.index('--context') + 1]) if '--context' in a else 260
    mx = int(a[a.index('--max') + 1]) if '--max' in a else 8
    run(a[0], a[1], part=part, context=ctxn, maxn=mx)
