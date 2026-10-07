"""tools/make-fonts.py - subset and rename the open-licence fonts the design language ships.

Source files (read from this machine, where Adobe Acrobat DC installs them under its WebResources folder; each file's own name table says
"licensed under the SIL Open Font License, Version 1.1", Copyright Adobe, Reserved Font Name "Source"):
    SourceSans3-Regular.otf, SourceSans3-Bold.otf, SourceSerif4-Regular.otf, SourceSerif4-Bold.otf, SourceSerif4-It.otf
The OFL forbids a Modified Version (a subset is one) from using the Reserved Font Name as its primary name, so the family names become
"FM Sans" and "FM Serif".  The copyright notice, the licence notice (name IDs 0, 13, 14) and the OFL text (fonts/OFL.txt) stay with the files.
Nothing is downloaded: the script reads the installed files and writes fonts/*.woff (zlib; no brotli needed).
    python tools/make-fonts.py
"""
import os, sys, json, hashlib
from fontTools.ttLib import TTFont
from fontTools import subset

SRC = r'C:\Program Files\Adobe\Acrobat DC\Acrobat\WebResources\Resource1\app1\fonts'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'fonts')
JOBS = [
    ('SourceSans3-Regular.otf', 'FM Sans', 'Regular', 'fm-sans-regular'),
    ('SourceSans3-Bold.otf', 'FM Sans', 'Bold', 'fm-sans-bold'),
    ('SourceSerif4-Regular.otf', 'FM Serif', 'Regular', 'fm-serif-regular'),
    ('SourceSerif4-Italic.otf' if False else 'SourceSerif4-It.otf', 'FM Serif', 'Italic', 'fm-serif-italic'),
    ('SourceSerif4-Bold.otf', 'FM Serif', 'Bold', 'fm-serif-bold'),
]
# Basic Latin, Latin-1, general punctuation used by the copy, arrows, minus, multiplication, approximately, comparison
UNICODES = list(range(0x20, 0x7F)) + list(range(0xA0, 0x100)) + [0x2010, 0x2011, 0x2012, 0x2013, 0x2014, 0x2015, 0x2018, 0x2019, 0x201A, 0x201C, 0x201D, 0x201E, 0x2022, 0x2026, 0x2030, 0x2032, 0x2033, 0x2039, 0x203A, 0x2044, 0x2190, 0x2191, 0x2192, 0x2193, 0x2212, 0x2248, 0x2264, 0x2265, 0x00D7, 0x00B7, 0x2009, 0x200A, 0x202F, 0x2007, 0x2008, 0x2002, 0x2003]
FEATURES = ['kern', 'liga', 'ccmp', 'locl', 'case', 'tnum', 'pnum', 'lnum', 'onum', 'zero', 'mark', 'mkmk']
report = {}
os.makedirs(OUT, exist_ok=True)
for fn, fam, sub, base in JOBS:
    path = os.path.join(SRC, fn)
    if not os.path.exists(path):
        print('missing', path); sys.exit(1)
    opts = subset.Options(); opts.layout_features = FEATURES; opts.name_IDs = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 16, 17]; opts.notdef_outline = True
    opts.glyph_names = False; opts.hinting = False; opts.flavor = 'woff'; opts.drop_tables += ['DSIG']; opts.desubroutinize = True
    font = TTFont(path)
    sub_ = subset.Subsetter(opts); sub_.populate(unicodes=UNICODES); sub_.subset(font)
    n = font['name']
    full = f'{fam} {sub}' if sub != 'Regular' else f'{fam} Regular'
    ps = f"{fam.replace(' ', '')}-{sub}"
    for rec in list(n.names):
        if rec.nameID in (1, 16): rec.string = fam if rec.nameID == 1 else fam
        elif rec.nameID in (2, 17): rec.string = sub
        elif rec.nameID == 4: rec.string = full
        elif rec.nameID == 6: rec.string = ps
        elif rec.nameID == 3: rec.string = f'{ps};subset of an OFL font, renamed (Reserved Font Name not used)'
        elif rec.nameID == 10 or rec.nameID == 7: pass
    n.setName(f'Subset (Basic Latin, Latin-1, punctuation, arrows) of {fn}, renamed {fam} because the Reserved Font Name "Source" may not be used by a Modified Version (SIL OFL 1.1, condition 3).', 10, 3, 1, 0x409)
    font.flavor = 'woff'
    dst = os.path.join(OUT, base + '.woff'); font.save(dst)
    data = open(dst, 'rb').read()
    # tabular figures: are all ten digits the same advance?
    f2 = TTFont(dst); cmap = f2.getBestCmap(); hm = f2['hmtx']
    adv = {c: hm[cmap[ord(c)]][0] for c in '0123456789' if ord(c) in cmap}
    report[base] = {'source': fn, 'family': fam, 'style': sub, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()[:16], 'glyphs': len(f2.getGlyphOrder()), 'digit_advances': sorted(set(adv.values())), 'upem': f2['head'].unitsPerEm}
    print(base, report[base])
json.dump(report, open(os.path.join(OUT, 'fonts.json'), 'w'), indent=1)
