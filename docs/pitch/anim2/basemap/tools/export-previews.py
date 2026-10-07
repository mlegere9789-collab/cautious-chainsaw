"""Turn the preview PNGs (tmp/look-dev/basemap/final, made by verify/run-all.sh step 2) into the committed JPEGs: previews/<spot>-z<zoom>-dim.jpg and previews/looks/<spot>-z15-<look>.jpg.
JPEG quality 84, progressive: 1440 x 900 pictures of about 250-450 KB each (the PNGs are 2.5-3 MB).   Usage: python export-previews.py [source dir]"""
import glob, os, sys
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); BASE = os.path.join(HERE, '..')
src = sys.argv[1] if len(sys.argv) > 1 else os.path.join(BASE, '..', '..', '..', '..', 'tmp', 'look-dev', 'basemap', 'final')
os.makedirs(os.path.join(BASE, 'previews', 'looks'), exist_ok=True)
for old in glob.glob(os.path.join(BASE, 'previews', '*.jpg')) + glob.glob(os.path.join(BASE, 'previews', 'looks', '*.jpg')):
    if 'studio-on-real-ground' not in old: os.remove(old)
total = 0
for f in sorted(glob.glob(os.path.join(src, '*.png'))):
    n = os.path.basename(f)[:-4]
    dst = os.path.join(BASE, 'previews', f'{n}.jpg' if n.endswith('-dim') else os.path.join('looks', f'{n}.jpg'))
    Image.open(f).convert('RGB').save(dst, quality=84, optimize=True, progressive=True); total += os.path.getsize(dst)
print('wrote', len(glob.glob(os.path.join(src, '*.png'))), 'pictures,', round(total / 1e6, 2), 'MB')
