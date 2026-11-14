"""Render a crop of a PDF page around a word found in its text layer.
usage: python3 -I pgcrop.py <pdf> <page> <word-regex> [dpi=200] [halfheight_pts=70] [outname]
Finds the first word matching the regex on the page (pdftotext -bbox), crops the full text width and +-halfheight points
around it, writes tmp/tl-01/dl/or27_pdf/img/<outname>.png and prints the path."""
import subprocess, sys, re, os
pdf, page, pat = sys.argv[1], int(sys.argv[2]), sys.argv[3]
dpi = int(sys.argv[4]) if len(sys.argv) > 4 else 200
half = float(sys.argv[5]) if len(sys.argv) > 5 else 70
out = sys.argv[6] if len(sys.argv) > 6 else 'crop_%s_%d' % (os.path.basename(pdf)[:20], page)
x = subprocess.run(['pdftotext', '-f', str(page), '-l', str(page), '-bbox', pdf, '-'], capture_output=True, text=True).stdout
ws = re.findall(r'<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([^<]*)</word>', x)
hit = None
for xm, ym, xM, yM, w in ws:
    if re.search(pat, w):
        hit = (float(xm), float(ym), float(xM), float(yM), w); break
if not hit:
    print('word not found; first words:', [w[4] for w in ws[:30]]); sys.exit(1)
ym = hit[1]; scale = dpi / 72.0
y0 = max(0, int((ym - half) * scale)); H = int(2 * half * scale)
info = subprocess.run(['pdfinfo', '-f', str(page), '-l', str(page), pdf], capture_output=True, text=True).stdout
m = re.search(r'Page\s+%d size:\s+([\d.]+) x' % page, info) or re.search(r'Page size:\s+([\d.]+) x', info)
W = int(float(m.group(1)) * scale) + 2
d = '/home/user/cautious-chainsaw/tmp/tl-01/dl/or27_pdf/img'
subprocess.run(['pdftoppm', '-f', str(page), '-l', str(page), '-r', str(dpi), '-x', '0', '-y', str(y0), '-W', str(W), '-H', str(H), '-png', pdf, '%s/%s' % (d, out)], check=True)
print([f for f in os.listdir(d) if f.startswith(out)], 'word', hit[4], 'at y=%.0f' % ym)
