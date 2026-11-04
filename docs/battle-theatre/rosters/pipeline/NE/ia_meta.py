import sys, json
sys.path.insert(0, r'C:\Users\mlege\gettysburg-map\tmp\bt\rosters\NE\scripts')
import fetchlib as f

def meta(ident):
    d = f.getjson('https://archive.org/metadata/' + ident, 'meta_' + ident + '.json')
    if not d:
        return None
    m = d.get('metadata', {})
    files = d.get('files', [])
    names = {x['name']: x for x in files}
    return {'id': ident, 'title': m.get('title'), 'volume': m.get('volume'), 'date': m.get('date'),
            'publisher': m.get('publisher'), 'pcs': m.get('possible-copyright-status'),
            'licenseurl': m.get('licenseurl'), 'restricted': m.get('access-restricted-item'),
            'contributor': m.get('contributor'), 'sponsor': m.get('sponsor'),
            'djvu_txt': next((x['name'] for x in files if x['name'].endswith('_djvu.txt')), None),
            'djvu_txt_size': next((x.get('size') for x in files if x['name'].endswith('_djvu.txt')), None),
            'djvu_xml': next((x['name'] for x in files if x['name'].endswith('_djvu.xml')), None),
            'djvu_xml_size': next((x.get('size') for x in files if x['name'].endswith('_djvu.xml')), None),
            'pdf_size': next((x.get('size') for x in files if x['name'].endswith('.pdf') and 'text' not in x['name']), None)}

if __name__ == '__main__':
    for i in sys.argv[1:]:
        print(json.dumps(meta(i), ensure_ascii=False))
