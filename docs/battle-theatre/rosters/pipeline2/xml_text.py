"""Derive the OCR text of an Internet Archive item from its djvu.xml, for items that have no hocr search-text file.

    python3 -I xml_text.py SOURCE_ID VOLUME IA_IDENTIFIER [--suffix ~x] [--keep-xml] [--repo /path/to/repo]

The three Internet Archive files that fetch_text.py stores (<id>_hocr_searchtext.txt.gz, <id>_hocr_pageindex.json.gz,
<id>_page_numbers.json) do not exist for many items (mostly the *.emory.edu copies and some Google scans).  This tool
downloads <id>_djvu.xml (transient, 3 to 80 MB), writes the same kind of text from it and deletes the xml:

    tmp/library/rosters/<SOURCE_ID>/<id>_xml_searchtext.txt.gz     one line per LINE element (words joined by one blank), leaves in order
    tmp/library/rosters/<SOURCE_ID>/<id>_xml_pageindex.json.gz     [[start, end, 0, 0], ...]  one entry per leaf; start and end are character offsets
                                                                    of the decoded text (the first two numbers are what r2lib.PageMap reads)

and adds the text entry "<SOURCE_ID>.<VOLUME><suffix>" (kind "ia-djvuxml-text") to data2/sources/<SOURCE_ID>.json with the sha256
of the xml it was derived from, so that anyone can derive the identical text again.  Printed page numbers: the item has none
(page_numbers.json absent), rows of such a text carry page null until the work item adds a running-head reader; the leaf of a
row is always recoverable from its offset.  Access rules as in fetch_text.py (only archive.org/metadata and archive.org/cors,
one request at a time, 1.2 s apart, a lending item is refused, a failure is written to the ledger).  Standard library only.
"""
import sys, os, re, json, gzip, html, hashlib, argparse, time, urllib.parse
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import fetch_text as F


def derive(xml_bytes):
    """Returns (text, pageindex).  Leaves are the OBJECT elements in file order."""
    s = xml_bytes.decode('utf-8')
    parts = s.split('<OBJECT ')[1:]
    out, idx, pos = [], [], 0
    for o in parts:
        lines = []
        for ln in re.finditer(r'<LINE>(.*?)</LINE>', o, re.S):
            ws = [html.unescape(w).strip() for w in re.findall(r'<WORD [^>]*>([^<]*)</WORD>', ln.group(1))]
            ws = [w for w in ws if w]
            if ws:
                lines.append(' '.join(ws))
        t = '\n'.join(lines) + ('\n' if lines else '')
        idx.append([pos, pos + len(t), 0, 0])
        out.append(t)
        pos += len(t)
    return ''.join(out), idx


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('source_id'); ap.add_argument('volume'); ap.add_argument('identifier')
    ap.add_argument('--suffix', default=''); ap.add_argument('--keep-xml', action='store_true')
    ap.add_argument('--repo', default=os.path.abspath(os.path.join(HERE, '..', '..', '..', '..')))
    a = ap.parse_args()
    raw_dir = os.path.join(a.repo, 'tmp', 'library', 'rosters', a.source_id)
    led_dir = os.path.join(a.repo, 'docs', 'battle-theatre', 'rosters', 'data2', 'sources')
    os.makedirs(raw_dir, exist_ok=True); os.makedirs(led_dir, exist_ok=True)
    led_path = os.path.join(led_dir, a.source_id + '.json')
    led = json.load(open(led_path, encoding='utf-8')) if os.path.exists(led_path) else {'format': 'roster2-source/1', 'source_id': a.source_id, 'texts': {}, 'failed': []}
    text_id = '%s.%s%s' % (a.source_id, a.volume, a.suffix)
    st, body = F.get('https://archive.org/metadata/' + urllib.parse.quote(a.identifier))
    if st != 200 or body.strip() in (b'', b'{}'):
        led['failed'].append({'identifier': a.identifier, 'what': 'metadata', 'status': st, 'at': F.now()})
        json.dump(led, open(led_path, 'w', encoding='utf-8'), ensure_ascii=False, indent=1); print('FAILED metadata', st); return 1
    d = json.loads(body); md = d.get('metadata', {})
    if md.get('access-restricted-item') or d.get('is_dark'):
        led['failed'].append({'identifier': a.identifier, 'what': 'access-restricted item: not opened', 'at': F.now()})
        json.dump(led, open(led_path, 'w', encoding='utf-8'), ensure_ascii=False, indent=1); print('REFUSED: access-restricted item'); return 1
    name = F.pick({f['name'] for f in d.get('files', [])}, '_djvu.xml')
    if name is None:
        led['failed'].append({'identifier': a.identifier, 'what': 'item has no djvu.xml', 'at': F.now()})
        json.dump(led, open(led_path, 'w', encoding='utf-8'), ensure_ascii=False, indent=1); print('NO XML'); return 2
    xml_path = os.path.join(raw_dir, name)
    st, _ = F.get('https://archive.org/cors/%s/%s' % (urllib.parse.quote(a.identifier), urllib.parse.quote(name)), xml_path)
    if st != 200:
        led['failed'].append({'identifier': a.identifier, 'what': name, 'status': st, 'at': F.now()})
        json.dump(led, open(led_path, 'w', encoding='utf-8'), ensure_ascii=False, indent=1); print('FAILED xml', st); return 1
    xml_sha = F.sha256_file(xml_path)
    xml_bytes = open(xml_path, 'rb').read()
    text, idx = derive(xml_bytes)
    tp = os.path.join(raw_dir, a.identifier + '_xml_searchtext.txt.gz')
    ip = os.path.join(raw_dir, a.identifier + '_xml_pageindex.json.gz')
    for p, payload in ((tp, text.encode('utf-8')), (ip, json.dumps(idx, separators=(',', ':')).encode('utf-8'))):
        with open(p, 'wb') as f:
            with gzip.GzipFile(filename='', mode='wb', fileobj=f, compresslevel=9, mtime=0) as g:
                g.write(payload)
    if not a.keep_xml:
        os.remove(xml_path)
    one = F.__dict__.get('one') or (lambda v: v if isinstance(v, str) or v is None else '; '.join(map(str, v)))
    led['texts'][text_id] = {
        'source_id': a.source_id, 'volume': a.volume, 'kind': 'ia-djvuxml-text', 'ia_identifier': a.identifier,
        'ia_title': one(md.get('title')), 'ia_volume': one(md.get('volume')), 'ia_date': one(md.get('date')),
        'ia_publisher': one(md.get('publisher')), 'ia_contributor': one(md.get('contributor')),
        'ia_possible_copyright_status': one(md.get('possible-copyright-status')), 'ia_access_restricted_item': False,
        'ia_ocr': one(md.get('ocr')), 'ia_imagecount': one(md.get('imagecount')), 'url_base': 'https://archive.org/cors/%s/' % a.identifier,
        'derived_from': {'name': name, 'sha256': xml_sha, 'bytes': len(xml_bytes), 'deleted_after_use': not a.keep_xml},
        'files': {'text': {'name': os.path.basename(tp), 'bytes': os.path.getsize(tp), 'sha256': F.sha256_file(tp)},
                  'pageindex': {'name': os.path.basename(ip), 'bytes': os.path.getsize(ip), 'sha256': F.sha256_file(ip)}},
        'retrieved': F.now(), 'local_dir': 'tmp/library/rosters/%s/' % a.source_id, 'page_numbers': False, 'leaves': len(idx), 'chars': len(text)}
    json.dump(led, open(led_path, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('OK', text_id, 'leaves', len(idx), 'chars', len(text))
    return 0


if __name__ == '__main__':
    sys.exit(main())
