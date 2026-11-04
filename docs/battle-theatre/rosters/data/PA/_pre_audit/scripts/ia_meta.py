"""Fetch IA metadata for a list of identifiers (argv) and print rights flags + file list for djvu files."""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pa_common as C
out = {}
mp = os.path.join(C.DATA, 'ia_meta.json')
if os.path.exists(mp): out = json.load(open(mp, encoding='utf8'))
for ident in sys.argv[1:]:
    p = C.fetch('https://archive.org/metadata/' + ident, 'meta/%s.json' % ident)
    if not p:
        print(ident, 'META FAILED'); continue
    d = json.load(open(p, encoding='utf8'))
    m = d.get('metadata', {})
    files = [(f['name'], f.get('size')) for f in d.get('files', []) if f['name'].endswith(('_djvu.txt', '_djvu.xml', '_hocr.html', '.pdf', '_chocr.html.gz'))]
    out[ident] = dict(title=m.get('title'), volume=m.get('volume'), date=m.get('date'), publisher=m.get('publisher'),
                      copyright_status=m.get('possible-copyright-status'), restricted=m.get('access-restricted-item'),
                      licenseurl=m.get('licenseurl'), contributor=m.get('contributor'), sponsor=m.get('sponsor'),
                      collection=m.get('collection'), imagecount=m.get('imagecount'), ocr=m.get('ocr'), files=files)
    print(ident, '|', m.get('title','')[:50], '|vol', m.get('volume'), '|cr', m.get('possible-copyright-status'), '|restricted', m.get('access-restricted-item'), '|', m.get('imagecount'), 'img |', m.get('contributor'))
    for f in files: print('    ', f)
json.dump(out, open(mp, 'w', encoding='utf8'), indent=1)
