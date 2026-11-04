"""Prints, for every page, how much of the text area is used (lowest content edge above the footer), as JSON: [[page, percent], ...]
    python fill.py FILE.pdf
"""
import json, sys
import pymupdf

d = pymupdf.open(sys.argv[1])
TOP, BOTTOM = 72.0, 792.0 - 68.4      # margins of the page box: 1.0 in top, 0.95 in bottom
out = []
for i, p in enumerate(d):
    low = TOP
    for b in p.get_text('blocks'):
        if b[3] < BOTTOM + 4 and b[1] > TOP - 2:
            low = max(low, b[3])
    for im in p.get_image_info():
        if im['bbox'][3] < BOTTOM + 2:
            low = max(low, im['bbox'][3])
    for dr in p.get_drawings():
        r = dr['rect']
        if r.y1 < BOTTOM + 4 and r.y0 > TOP - 2 and r.width < 600 and r.height < 600 and not (r.height > 500):
            low = max(low, r.y1)
    out.append([i + 1, round(100 * (low - TOP) / (BOTTOM - TOP))])
print(json.dumps(out))
