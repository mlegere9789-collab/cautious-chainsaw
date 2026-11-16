#!/usr/bin/env python3
"""Fifth photo-match session (2026-11-16): make the saved text of the new Library of Congress sources that the statement builder quotes from.
  (1) the two essays of the Library's 'Does the Camera Ever Lie?' pages (open JSON of the page, fetched by webget.py): the page text with the markup removed, written next to the JSON (.txt);
  (2) Gardner's 'Catalogue of Photographic Incidents of the War' (September 1863; Library copy, 40 scan pages, OCR text served by the Library's text service): all pages in one file with '=== PAGE n ===' markers
      (n = scan sequence number of the Library item gdcmassbookdig.catalogueofphoto00gard).
Nothing is rewritten by hand: the text of a page is exactly what the service returned (the OCR of this 1863 pamphlet is rough; the quotes taken from it are checked against it letter for letter).
Usage: python3 -I tools/bt/photomatch/fifth_texts.py"""
import glob, hashlib, html, json, os, re
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
LOC = os.path.join(ROOT, 'tmp', 'library', 'web', 'photomatch', 'www.loc.gov'); CAT = os.path.join(ROOT, 'tmp', 'library', 'web', 'photomatch', 'gardner_catalogue1863')
def text_of(o):
    if isinstance(o, str): return o
    if isinstance(o, dict): return ' '.join(text_of(v) for v in o.values())
    if isinstance(o, list): return ' '.join(text_of(v) for v in o)
    return ''
def sha(p): return hashlib.sha256(open(p, 'rb').read()).hexdigest()
def essay(src, dst):
    d = json.load(open(src)); t = text_of(d['content']); t = re.sub(r'<[^>]+>', ' ', t); t = html.unescape(t); t = re.sub(r'[ \t\r\f\v ]+', ' ', t).strip() + '\n'
    open(dst, 'w', encoding='utf-8').write(t); return dst
def main():
    out = {}
    out['moved_body'] = essay(os.path.join(LOC, 'loc_essay_moved_body.json'), os.path.join(LOC, 'loc_essay_moved_body.txt'))
    ci = glob.glob(os.path.join(LOC, 'collections_civil-war-glass-negatives_articles-and-essays_does-the-camera-ever-lie_the-case-of-confused-identity*'))
    ci = [p for p in ci if not p.endswith('.txt')][0]; out['confused_identity'] = essay(ci, os.path.join(LOC, 'loc_essay_confused_identity.txt'))
    txt = ''
    for f in sorted(glob.glob(os.path.join(CAT, 'page_*.txt'))):
        d = json.load(open(f)); n = int(os.path.basename(f)[5:9])
        for k, v in d.items(): txt += '\n=== PAGE %d ===\n%s\n' % (n, v['full_text'])
    cp = os.path.join(CAT, 'catalogue_fulltext.txt'); open(cp, 'w', encoding='utf-8').write(txt); out['gardner_catalogue_1863'] = cp
    print({k: (os.path.relpath(v, ROOT), sha(v)[:12]) for k, v in out.items()})
if __name__ == '__main__': main()
