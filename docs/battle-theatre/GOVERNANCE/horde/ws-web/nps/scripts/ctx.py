#!/usr/bin/env python3
"""Reading aid for repairing extracts: show, for an extract id, its xdef line and the page sentences around the quote.

  ctx.py XID [XID...]        xdef file:line, claim, quote, then the numbered sentences of that page within -w (default 3)
                             sentences of the quote, plus any sentence carrying a number of the claim that the quote lacks
  ctx.py -w N XID            change the window

Sentence numbers are those of the '#sN-M' anchors of the .xdef files (see build_extracts.split_sentences).
Read only. Run with python3 -I.
"""
import glob, importlib.util, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
NPS = os.path.dirname(HERE)
spec = importlib.util.spec_from_file_location('build_extracts', os.path.join(HERE, 'build_extracts.py'))
be = importlib.util.module_from_spec(spec)
spec.loader.exec_module(be)


def main(argv):
    w = 3
    if argv and argv[0] == '-w':
        w = int(argv[1]); argv = argv[2:]
    rows = {}
    for l in open(os.path.join(NPS, 'extracts', 'extracts.jsonl'), encoding='utf-8'):
        if l.strip():
            r = json.loads(l); rows[r['xid']] = r
    sources = be.load_sources()
    for x in argv:
        r = rows.get(x)
        if not r:
            print('unknown', x); continue
        where = ''
        for f in sorted(glob.glob(os.path.join(NPS, 'extracts', 'src', '*.xdef'))):
            for ln, line in enumerate(open(f, encoding='utf-8'), 1):
                if ' | ' in line and r['claim'] in line:
                    where = '%s:%d' % (os.path.basename(f), ln)
        print('=' * 100)
        print(x, where, '| state:', r['state_date'], '| use:', r['use_for_1863'], '| mode:', r['quote_mode'], '| variant:', r['text_variant'])
        print('CLAIM:', r['claim'])
        print('QUOTE:', r['quote'][:600])
        variant = None if r['text_variant'] == 'reading-order' else r['text_variant']
        pgs, _, _ = be.pages(r['source_id'], variant)
        flat = be.norm(pgs[r['pdf_page']])
        sents = be.split_sentences(flat)
        q = be.norm(r['quote'])
        hit = [i for i, s in enumerate(sents, 1) if (len(s) > 30 and s in q) or (len(q) > 25 and q[:25] in s) or (len(q) > 25 and q[-25:] in s)]
        lo, hi = (min(hit), max(hit)) if hit else (1, 1)
        nums = [n for n in re.findall(r'\d[\d.,]*\d|\d', r['claim']) if n.replace(',', '') not in q.replace(',', '')]
        for i, s in enumerate(sents, 1):
            near = lo - w <= i <= hi + w
            carries = any(n in s.replace(',', '') for n in nums)
            if near or carries:
                mark = '>>' if lo <= i <= hi else '  '
                print('%s s%d: %s' % (mark, i, s[:700]))
        if not hit:
            print('(quote does not align with sentence boundaries; use the ">>>" anchor form or check the sentences above)')


if __name__ == '__main__':
    main(sys.argv[1:])
