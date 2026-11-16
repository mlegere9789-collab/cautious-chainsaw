"""Second OCR (tesseract on the page image) for SELECTED leaves only, and the same comparison as ocr2.py for the citations on those leaves.
    python3 -I tmp/tl-04/tools2/ocr_some.py 1:392 1:848 ...       (part:leaf; PDF page = leaf + 1; about 4 s of CPU per page)
Reads the written corrections file; the page texts are cached in tmp/tl-04/scan/ocr/p<part>_l<leaf>.txt; adds the leaf whose printed page number is
confirmed by the page head of the second OCR to tools2/ocr2_heads.json (read by mk_viewed.py); appends the findings to tools2/ocr2_report.some.txt."""
import os, sys, json, re
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import ocr2 as O
sel = [tuple(int(x) for x in a.split(':')) for a in sys.argv[1:]]
pages = {k: O.page_text(*k) for k in sel}
hp = os.path.join(HERE, 'ocr2_heads.json')
heads = json.load(open(hp, encoding='utf-8')) if os.path.exists(hp) else {}
out = []
for (part, leaf), txt in sorted(pages.items()):
    lm = O.lms[part]
    page = next((pg for lf, _s, pg in lm.rec['leaves'] if lf == leaf), None)
    hn = O.head_numbers(txt)
    ok = page in hn if isinstance(page, int) else None
    heads['%d:%d' % (part, leaf)] = dict(page_leaf_map=page, head_numbers_second_ocr=hn, agree=ok)
    out.append('leaf %d:%d (PDF page %d): leaf-map page %s, numbers in the first lines of the second OCR %s -> %s' % (part, leaf, leaf + 1, page, hn, 'confirmed' if ok else 'NOT CONFIRMED'))
json.dump(heads, open(hp, 'w'), indent=1)
n = fl = 0
for r in O.rows:
    for c in r['citations']:
        if c['source_id'] != 'OR27':
            continue
        lm = O.lms[c['part']]
        a, b = lm.at(c['text_offset']), lm.at(c['text_offset_end'] - 1)
        if (c['part'], a['leaf']) not in pages and (c['part'], b['leaf']) not in pages:
            continue
        txt = pages.get((c['part'], a['leaf']), '') + ('\n' + pages.get((c['part'], b['leaf']), '') if b['leaf'] != a['leaf'] else '')
        qw = O.toks(c['quote'])
        pw = O.toks(txt)
        ratio, s, e = O.best_window(qw, pw)
        win = ' '.join(pw[s:e])
        miss = sorted(x for x in O.nums(c['quote']) if x not in O.nums(win))
        n += 1
        if miss or ratio < 0.6:
            fl += 1
            out.append('%s %s p.%s leaf %d | match %.2f | quote numerals missing from the tesseract window: %s\n    quote : %s\n    window: %s' % (r['id'], c['key'], c['printed_page'], a['leaf'], ratio, miss, c['quote'][:200], win[:300]))
rep = '\n'.join(out) + '\ncitations compared %d, flagged %d\n' % (n, fl)
open(os.path.join(HERE, 'ocr2_report.some.txt'), 'a', encoding='utf-8').write(rep + '\n')
print(rep)
