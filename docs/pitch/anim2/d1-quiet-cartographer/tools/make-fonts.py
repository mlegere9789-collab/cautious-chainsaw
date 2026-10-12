"""make-fonts.py - build the four faces of QC Sans: static instances (Regular 400, SemiBold 600, Bold 700, Italic 400) of Source Sans 3 (Adobe, SIL OFL 1.1), subset to the characters the page uses, as WOFF.

Round 1 of the polish pass replaced Liberation Sans (an Arial clone) with Source Sans 3: a humanist face drawn for small interface text, about 7 % narrower at the same x-height (a 12 px SemiBold code is
as wide as the old 11 px Bold one), with a real SemiBold, so the lettering is smaller on the map and the marks hold more.  Source: https://github.com/google/fonts/tree/main/ofl/sourcesans3 (the two variable
TTFs and OFL.txt, fetched once, 1.0 MB; the host's licence file is copied to assets/fonts/LICENSE-Source-Sans-3-OFL.txt).  The licence reserves the name "Source", and an instance + subset is a Modified Version, so
the faces are renamed "QC Sans".  The copyright and licence strings of the original stay in the name table (ids 0, 13, 14).  No Brotli is installed, so the output is WOFF (zlib), not WOFF2.
  python tools/make-fonts.py <folder with SourceSans3.ttf and SourceSans3-Italic.ttf>
"""
import os, sys, json, hashlib
from fontTools.ttLib import TTFont
from fontTools import subset
from fontTools.varLib import instancer

SRC = sys.argv[1] if len(sys.argv) > 1 else 'tmp/look-dev/polish-d1-quiet-cartographer/fontsrc'
FACES = [('SourceSans3.ttf', 400, 'QCSans-Regular', 'Regular'), ('SourceSans3.ttf', 600, 'QCSans-SemiBold', 'SemiBold'), ('SourceSans3.ttf', 700, 'QCSans-Bold', 'Bold'), ('SourceSans3-Italic.ttf', 400, 'QCSans-Italic', 'Italic')]
OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'fonts')
UNICODES = list(range(0x20, 0x7F)) + list(range(0xA0, 0x180)) + [0x2013, 0x2014, 0x2018, 0x2019, 0x201C, 0x201D, 0x2022, 0x2026, 0x2032, 0x2033, 0x2190, 0x2191, 0x2192, 0x2193, 0x2212, 0x00D7, 0x2264, 0x2265, 0x2248, 0x00B7, 0x25CF, 0x25CB, 0x2605]
os.makedirs(OUT, exist_ok=True)
report = []
for src, wght, ps, style in FACES:
    f = instancer.instantiateVariableFont(TTFont(os.path.join(SRC, src)), {'wght': wght})
    opts = subset.Options(); opts.flavor = 'woff'; opts.layout_features = ['kern', 'liga', 'ccmp', 'locl', 'mark', 'mkmk', 'tnum', 'lnum']; opts.hinting = True; opts.name_IDs = [0, 1, 2, 3, 4, 5, 6, 13, 14]; opts.notdef_outline = True; opts.drop_tables += ['DSIG']
    s = subset.Subsetter(opts); s.populate(unicodes=UNICODES); s.subset(f)
    n = f['name']
    for rec in list(n.names):
        if rec.nameID == 1: rec.string = 'QC Sans'
        elif rec.nameID == 2: rec.string = style
        elif rec.nameID == 3: rec.string = 'QC Sans ' + style + ' (instance and subset of Source Sans 3)'
        elif rec.nameID == 4: rec.string = 'QC Sans ' + style
        elif rec.nameID == 6: rec.string = ps
        elif rec.nameID in (16, 17, 25): n.names.remove(rec)
    f['OS/2'].usWeightClass = wght
    f.flavor = 'woff'
    p = os.path.join(OUT, ps + '.woff'); f.save(p)
    b = open(p, 'rb').read()
    report.append({'file': ps + '.woff', 'bytes': len(b), 'sha256': hashlib.sha256(b).hexdigest()[:16], 'glyphs': len(f.getGlyphOrder()), 'from': src + ' wght=' + str(wght)})
print(json.dumps(report, indent=1))
json.dump(report, open(os.path.join(OUT, 'fonts.json'), 'w'), indent=1)
