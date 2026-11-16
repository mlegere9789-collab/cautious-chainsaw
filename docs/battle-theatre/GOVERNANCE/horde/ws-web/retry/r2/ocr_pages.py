#!/usr/bin/env python3
"""Machine reading of selected pages of a saved scanned PDF (the text layer of photocopied typescripts is scrambled).

Usage: python3 -I ocr_pages.py <pdf> <first> <last> <outdir> [--dpi 300]
Renders each page with pdftoppm (gray, 300 dpi by default), reads it with tesseract (eng, --psm 6, one thread) and writes
<outdir>/ocr.txt with '=== PDF PAGE n ===' markers; the page images stay in <outdir>/img (PNG).
The OCR is a machine reading: a quote is only used after the page image was looked at, digits always against the image.
Run through the machine lock:  tools/horde/bench.sh python3 -I ocr_pages.py ...
"""
import os, subprocess, sys
pdf, a, b, out = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), sys.argv[4]
dpi = int(sys.argv[sys.argv.index('--dpi') + 1]) if '--dpi' in sys.argv else 300
os.makedirs(os.path.join(out, 'img'), exist_ok=True)
env = dict(os.environ, OMP_THREAD_LIMIT='1')
parts = []
for p in range(a, b + 1):
    base = os.path.join(out, 'img', 'p%03d' % p)
    png = base + '.png'
    if not os.path.exists(png):
        subprocess.run(['pdftoppm', '-f', str(p), '-l', str(p), '-r', str(dpi), '-gray', '-png', '-singlefile', pdf, base], check=True)
    r = subprocess.run(['tesseract', png, '-', '-l', 'eng', '--psm', '6'], capture_output=True, text=True, env=env)
    parts.append('=== PDF PAGE %d ===\n%s\n' % (p, r.stdout.rstrip()))
    print('page', p, len(r.stdout), flush=True)
open(os.path.join(out, 'ocr.txt'), 'w', encoding='utf-8').write(''.join(parts))
print('done', a, b)
