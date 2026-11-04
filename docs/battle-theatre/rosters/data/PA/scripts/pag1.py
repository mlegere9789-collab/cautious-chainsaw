"""Pennsylvania at Gettysburg vol I (local copy pennsylvania02penn): sentences that state a strength present or engaged, in words or digits.
Leads only: the text is the dedication address of each regiment, the sentence is copied verbatim, the unit heading is the nearest preceding
'NNTH REGIMENT INFANTRY' line (OCR-damaged: the digits are copied as read). Output: data/PA/strength_sentences_vol1.csv"""
import sys, os, re, csv
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pa_common as C

SRC = os.path.join(C.ROOT, 'tmp', 'library', 'misc', 'pennsylvania02penn_djvu.txt')
C.register_existing(SRC, 'https://archive.org/download/pennsylvania02penn/pennsylvania02penn_djvu.txt')
L = [re.sub(r'\s+', ' ', l).strip() for l in open(SRC, encoding='utf8', errors='replace')]
heads = [(i, l) for i, l in enumerate(L) if re.search(r'REG[A-Z]{2,5}NT\s+(INFANTRY|CAVALRY)', l) and len(l) < 40]
text = ' '.join(L)
pos = []
off = 0
for i, l in enumerate(L):
    pos.append(off)
    off += len(l) + 1
KEY = re.compile(r'(present for duty|went into (?:the )?(?:battle|action|fight)|carried into (?:the )?(?:battle|action|fight)|entered the (?:battle|fight|action)|(?:men|officers) engaged|strength of the regiment|numbered [a-z0-9\- ]+ (?:men|officers))', re.I)
NUM = re.compile(r'(\d{2,4}|hundred|thousand|(?:twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)[- ]?\w*)', re.I)
rows = []
import bisect
for m in KEY.finditer(text):
    a = max(0, m.start() - 170)
    b = min(len(text), m.end() + 170)
    ctx = text[a:b]
    if not NUM.search(ctx):
        continue
    li = bisect.bisect_right(pos, m.start()) - 1
    hh = [h for h in heads if h[0] <= li]
    head = hh[-1] if hh else (None, '')
    rows.append(dict(txt_line=li + 1, heading_line=(head[0] + 1) if head[0] is not None else '', heading_ocr=head[1], key=m.group(0), sentence=ctx))
w = csv.DictWriter(open(os.path.join(C.DATA, 'strength_sentences_vol1.csv'), 'w', newline='', encoding='utf-8'), fieldnames=list(rows[0].keys()))
w.writeheader()
w.writerows(rows)
print(len(rows))
for r in rows[:8]:
    print(r['heading_ocr'], '|', r['sentence'][:150])
