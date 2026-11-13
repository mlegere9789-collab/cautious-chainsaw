"""For a line of the spec, show each double-quoted fragment and the longest prefix that is found in the plan (to locate the first differing word)."""
import sys, re
sys.path.insert(0, __file__.rsplit('/', 1)[0])
from plan_lib import load_pages, fold, joined
pages = load_pages(); allf = fold(joined(pages, 1, 144))
spec = open(sys.argv[1], encoding='utf-8').read().split('\n')
for ln in map(int, sys.argv[2:]):
    line = re.sub(r'`[^`\n]*`', ' ', spec[ln - 1])
    for q in re.findall(r'"([^"\n]{12,})"', line):
        for fr in re.split(r'\s*\.\.\.\s*', q):
            fr = fr.strip(' :,;')
            if len(fr) < 10: continue
            k = fold(fr)
            if k in allf: print(f'L{ln} OK   : {fr[:90]}'); continue
            words = k.split(' '); lo = 0
            for n in range(len(words), 0, -1):
                if ' '.join(words[:n]) in allf: lo = n; break
            print(f'L{ln} DIFF : prefix of {lo}/{len(words)} words found; first missing word: {words[lo] if lo < len(words) else None!r}; context: "...{" ".join(words[max(0,lo-4):lo+6])}"')
