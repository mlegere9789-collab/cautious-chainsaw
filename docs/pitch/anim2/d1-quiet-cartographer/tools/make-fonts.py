"""make-fonts.py - subset the three Liberation Sans 2.1.5 faces (SIL OFL 1.1, installed on this machine, read from C:/Windows/Fonts) into small WOFF files for the page.

Why a rename: Liberation reserves the font name "Liberation" (OFL.txt of the Liberation fonts: "with Reserved Font Name Liberation"), and a subset is a Modified Version, so the faces are
renamed "QC Sans" here.  Copyright and licence strings of the originals are kept in the name table (name ids 0, 13, 14).  Nothing was downloaded: these are local files.
No Brotli is installed, so the output is WOFF (zlib), not WOFF2.
  python tools/make-fonts.py
"""
import os, sys, json, hashlib
from fontTools.ttLib import TTFont
from fontTools import subset

SRC = 'C:/Windows/Fonts/'
FACES = [('LiberationSans-Regular.ttf', 'QCSans-Regular', 'Regular'), ('LiberationSans-Bold.ttf', 'QCSans-Bold', 'Bold'), ('LiberationSans-Italic.ttf', 'QCSans-Italic', 'Italic')]
OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'fonts')
# Basic Latin, Latin-1, Latin Extended-A (names with diacritics), general punctuation, arrows, the maths signs the page uses, the ellipsis and the middle dot
UNICODES = list(range(0x20, 0x7F)) + list(range(0xA0, 0x180)) + [0x2013, 0x2014, 0x2018, 0x2019, 0x201C, 0x201D, 0x2022, 0x2026, 0x2032, 0x2033, 0x2190, 0x2191, 0x2192, 0x2193, 0x2212, 0x00D7, 0x2264, 0x2265, 0x2248, 0x00B7, 0x25CF, 0x25CB, 0x2605]
os.makedirs(OUT, exist_ok=True)
report = []
for src, ps, style in FACES:
    f = TTFont(SRC + src)
    opts = subset.Options(); opts.flavor = 'woff'; opts.layout_features = ['kern', 'liga', 'ccmp', 'locl', 'mark', 'mkmk']; opts.hinting = True; opts.name_IDs = [0, 1, 2, 3, 4, 5, 6, 13, 14]; opts.notdef_outline = True; opts.drop_tables += ['DSIG']
    s = subset.Subsetter(opts); s.populate(unicodes=UNICODES); s.subset(f)
    n = f['name']
    for rec in list(n.names):
        if rec.nameID == 1: rec.string = 'QC Sans'
        elif rec.nameID == 2: rec.string = style
        elif rec.nameID == 3: rec.string = 'QC Sans ' + style + ' (subset of Liberation Sans 2.1.5)'
        elif rec.nameID == 4: rec.string = 'QC Sans ' + style
        elif rec.nameID == 6: rec.string = ps
        elif rec.nameID == 16 or rec.nameID == 17: n.names.remove(rec)
    f.flavor = 'woff'
    p = os.path.join(OUT, ps + '.woff'); f.save(p)
    b = open(p, 'rb').read()
    report.append({'file': ps + '.woff', 'bytes': len(b), 'sha256': hashlib.sha256(b).hexdigest()[:16], 'glyphs': len(f.getGlyphOrder()), 'from': src})
print(json.dumps(report, indent=1))
json.dump(report, open(os.path.join(OUT, 'fonts.json'), 'w'), indent=1)
