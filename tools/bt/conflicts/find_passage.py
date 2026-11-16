#!/usr/bin/env python3
"""Locate a passage in a text of the ledger and print the fields of a citation for it.

    python3 -I tools/bt/conflicts/find_passage.py OR27-1 --quote "arriving there at 1 a. m. of the 2d"
    python3 -I tools/bt/conflicts/find_passage.py LONGSTREET-1896 --regex "stars (were )?(shining|bright)" [-C 200] [--max 20]
    python3 -I tools/bt/conflicts/find_passage.py CA-1863 --part sn84026749/1863-07-04/ed-1/seq-1 --regex "Reynolds"
    python3 -I tools/bt/conflicts/find_passage.py --all --regex "Berdan.{0,80}(11|eleven) o'?clock" [--class primary,official] [--max 30]

--quote   finds the exact quote by the rule of the validator (letters and digits, case, punctuation, line breaks and hyphenation tolerant; `[...]` skips text) and
          prints the citation skeleton (source, part, page, page_basis, text_offset, quote); paste it into a position and fill the weighing fields.
--regex   searches the whitespace- and hyphenation-normalised text (case-insensitive) and prints each hit with its offset, part and page.
--all     every text of the ledger that is not a family of parts (add --families to include the weeklies and the newspaper pages: slow).
Offsets are character offsets into the file decoded as UTF-8 with newline='' (tools/bt/or27_lib.py). The Official Records page is the printed page of the scan leaf
(DD-TL02-04); for a text with page markers it is the PDF page index; for the other texts read the printed page in the text or on the page image and say so in page_note.
"""
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import cfl_lib as L
import cfl_search as S

L.utf8_stdout()


def citation_skeleton(sid, row, part, off, quote, info):
    return {'source': sid, 'source_class': row.get('class'), 'part': info.get('part') or part, 'page': info.get('page'), 'page_basis': info.get('page_basis'),
            'text_offset': off, 'quote': quote}


def main(argv):
    if not argv or '-h' in argv or '--help' in argv:
        print(__doc__)
        return 2
    args = list(argv)

    def opt(name, default=None, cast=str):
        if name in args:
            i = args.index(name)
            v = cast(args[i + 1])
            del args[i:i + 2]
            return v
        return default
    quote = opt('--quote')
    rx = opt('--regex')
    part = opt('--part')
    cn = opt('-C', 150, int)
    mx = opt('--max', 20, int)
    classes = opt('--class')
    fam = '--families' in args
    allsrc = '--all' in args
    args = [a for a in args if a not in ('--families', '--all')]
    ctx = L.new_ctx()
    if allsrc:
        srcs = S.ledger_texts(ctx, classes=set(classes.split(',')) if classes else None, with_families=fam)
    else:
        if not args:
            print('give a source id (or --all)')
            return 2
        sid = args[0]
        row = ctx.ledger().get(sid)
        if row is None:
            print('source %r is not in SOURCES.md' % sid)
            return 1
        if '{part}' in (row.get('text') or ''):
            if not part:
                print('%s is a family of texts: give --part (a weekly issue date, or <lccn>/<date>/ed-1/seq-<n>)' % sid)
                return 1
            path, why = L.town().resolve_text(ctx, sid, part)
            if path is None:
                print(why)
                return 1
            srcs = [(sid, part, path, row)]
        else:
            t = row.get('text')
            if not t or t == '-':
                print('%s has no local text (it is a planned source or a web lead)' % sid)
                return 1
            srcs = [(sid, None, t, row)]
    if quote:
        found = 0
        for sid, p, path, row in srcs:
            spans, rp, why = S.locate_quote_spans(ctx, sid, quote, p)
            for off, end in spans[:10]:
                info = S.describe(row, rp, off, end - off, p)
                print('FOUND in %s%s at offset %d-%d | page %s (%s) | %s' % (sid, (' [' + p + ']') if p else '', off, end, info['page'], info['page_basis'], info.get('who') or ''))
                sk = citation_skeleton(sid, row, p, off, quote, info)
                sk['text_offset_end'] = end
                print(json.dumps(sk, ensure_ascii=False, indent=1))
                found += 1
        if not found:
            print('NOT FOUND (letters and digits, case, punctuation, line breaks and hyphenation are ignored; an OCR error in the text needs quote_mode "ocr" with raw)')
            return 1
        return 0
    if rx:
        n = 0
        for sid, p, path, row in srcs:
            hits = S.regex_hits(path, rx, cn, mx - n)
            for h in hits:
                info = S.describe(row, path, h['off'], len(h['match']), p)
                a, b = h['at']
                c = h['context']
                print('[%s%s] offset %d | page %s (%s)%s' % (sid, (' ' + p) if p else '', h['off'], info['page'], info['page_basis'], (' | ' + info['who']) if info.get('who') else ''))
                print('   ...%s<<%s>>%s...' % (c[:a], c[a:b], c[b:]))
                n += 1
                if n >= mx:
                    break
            if n >= mx:
                break
        print('%d hit(s) shown (max %d)' % (n, mx))
        return 0 if n else 1
    print('give --quote or --regex')
    return 2


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
