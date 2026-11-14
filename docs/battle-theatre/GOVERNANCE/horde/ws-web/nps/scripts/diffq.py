#!/usr/bin/env python3
"""Show where a cleaned quote (letters and digits only) stops matching the saved page text:
diffq.py [-L|-R|-O] SRC PAGE 'quote'   prints the longest matching prefix, then the page text and the quote text that follow it."""
import importlib.util, os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('build_extracts', os.path.join(HERE, 'build_extracts.py'))
be = importlib.util.module_from_spec(spec); spec.loader.exec_module(be)
a = sys.argv[1:]
variant = None
if a[0] in ('-L', '-R', '-O'):
    variant = {'-L': 'layout', '-R': 'raw', '-O': 'ocr'}[a[0]]; a = a[1:]
sid, page, quote = a[0], int(a[1]), a[2]
td = be.load_sources().get(sid, {}).get('text_defect')
lig = 'fi' if td == 'fi-ligature' else (td == 'ligature')
flat = be.norm(be.pages(sid, variant)[0][page])
key, idx = be._alnum_map(flat, lig)
mf = be._CORR.sub(lambda m: m.group(1), quote)
qkey, _ = be._alnum_map(be.norm(mf), lig)
k = len(qkey)
while k > 8 and key.count(qkey[:k]) == 0:
    k -= 1
pos = key.find(qkey[:k])
print('matched %d of %d letters at page-letter offset %d' % (k, len(qkey), pos))
if k < len(qkey):
    end = idx[pos + k - 1] + 1 if pos >= 0 else 0
    print('PAGE after the match :', flat[end:end + 160])
    print('QUOTE after the match:', be.norm(mf)[len(be.norm(mf)) - 0:][:0] + mf[mf.lower().find(be.norm(mf)[:1]) :][0:0])
    # find the quote text after k letters
    cnt = 0; j = 0
    for j, c in enumerate(be.norm(mf)):
        if c.isalnum():
            cnt += 1
            if cnt == k:
                break
    print('QUOTE after the match:', be.norm(mf)[j + 1:j + 161])
