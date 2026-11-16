"""Sources of the conf-nc work item: item metadata, the manifest and the tracked pointer file.

    python3 -I nc_sources.py --fetch-metadata     the Internet Archive metadata of the 8 items (one request at a time, 1.2 s apart, generic client name)
    python3 -I nc_sources.py --write              tmp/library/rosters/MANIFEST-conf-nc.json and docs/battle-theatre/rosters/sources/conf-nc.json (form roster2-sources-pointer/1)

Rights.  The rights basis of a text is "public domain (United States publication before 1929)" only where that is true: the volumes are the State of North Carolina's
own roster, printed at Raleigh in 1882 by the state printers under an act of the General Assembly (the title page and the act are quoted from the text, with their
offsets).  The item's own flags are recorded beside: vol. 1 (Google scan) NOT_IN_COPYRIGHT, vols. 3 and 4 the State Library of North Carolina public-domain statement,
the Boston Public Library copy of vol. 2 and the four Emory University copies carry no flag.  No item is access-restricted.
"""
import os, sys, json, re, time, hashlib, urllib.request, urllib.error, ssl

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import nc_lib as L

UA = 'roster-research/1.0 (public-domain text; one request per second)'
IDS = [  # text id, identifier, volume
    ('NC-MOORE-1882.1', 'rosternorthcaro00moorgoog', '1'), ('NC-MOORE-1882.1~b', '05913252.3309.emory.edu', '1'),
    ('NC-MOORE-1882.2', 'rosterofnorthcar02nort', '2'), ('NC-MOORE-1882.2~b', '05913252.3310.emory.edu', '2'),
    ('NC-MOORE-1882.3', 'rosterofnorthcar03moor', '3'), ('NC-MOORE-1882.3~b', '05913252.3311.emory.edu', '3'),
    ('NC-MOORE-1882.4', 'rosterofnorthcar04moor', '4'), ('NC-MOORE-1882.4~b', '05913252.3312.emory.edu', '4'),
]
BASIS = 'public domain (United States publication before 1929)'
_last = [0.0]


def _ctx():
    ca = os.environ.get('NODE_EXTRA_CA_CERTS') or '/root/.ccr/ca-bundle.crt'
    return ssl.create_default_context(cafile=ca) if os.path.exists(ca) else ssl.create_default_context()


def get(url):
    wait = 1.2 - (time.time() - _last[0])
    if wait > 0:
        time.sleep(wait)
    _last[0] = time.time()
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    try:
        with urllib.request.urlopen(req, timeout=120, context=_ctx()) as r:
            return r.status, r.read()
    except urllib.error.HTTPError as e:
        return e.code, b''
    except Exception as e:
        return 0, repr(e).encode()


def sha(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for b in iter(lambda: f.read(1 << 20), b''):
            h.update(b)
    return h.hexdigest()


def fetch_metadata():
    out = {}
    for tid, ident, vol in IDS:
        dest = os.path.join(L.RAW, ident.replace('.', '_') if False else ident + '_metadata.json')
        if os.path.exists(dest) and os.path.getsize(dest) > 100:
            print('have', dest)
            continue
        st, body = get('https://archive.org/metadata/' + ident)
        if st != 200:
            print('FAILED', ident, st)
            out[ident] = st
            continue
        with open(dest, 'wb') as f:
            f.write(body)
        print('OK', ident, len(body), flush=True)
    return out


def md_of(ident):
    p = os.path.join(L.RAW, ident + '_metadata.json')
    if not os.path.exists(p):
        return None
    with open(p, encoding='utf-8') as f:
        return json.load(f)


def _one(v):
    return v if isinstance(v, str) or v is None else '; '.join(map(str, v))


def imprint_quote(text):
    """The printed imprint of the title page: a substring of the text, with its offset (verified), or None."""
    for pat in (r"State\s+Printers[^\n]{0,40}\n[^\n]{0,80}\n?[^\n]{0,40}1882\.?", r"(?:Ash[be]?\s*&\s*Gatl\w+|Ashe\s*&\s*Gatling)[^\n]{0,80}\n?[^\n]{0,60}?1882\.?", r"1882\."):
        m = re.search(pat, text[:20000])
        if m:
            q = m.group(0)
            assert text[m.start():m.end()] == q
            return q, m.start()
    return None, None


def authority_quote(text):
    for pat in (r"General\s+Assembly\s+of\s+North\s+Carolina\s+do\s+enact", r"ROSTER\s+OF\s+(?:THE\s+)?NORTH\s+CAROLINA\s+TROOPS", r"POR\s+A\s+ROSTER|FOR\s+A\s+ROSTER"):
        m = re.search(pat, text[:20000])
        if m:
            q = m.group(0)
            assert text[m.start():m.end()] == q
            return q, m.start()
    return None, None


def source_entries(summary):
    led = json.load(open(os.path.join(L.D2, 'sources', L.SOURCE_ID + '.json'), encoding='utf-8'))
    used = {}
    for k, u in summary['units'].items():
        for t in u['texts']:
            used.setdefault(t, []).append(k)
    second = {}
    for k, u in summary['units'].items():
        second.setdefault('NC-MOORE-1882.%s%s' % (k and U_VOL[k], '' if u['second'] == 'a' else '~b'), []).append(k)
    ents = []
    for tid, ident, vol in IDS:
        t = led['texts'][tid]
        md = md_of(ident) or {}
        mdd = md.get('metadata', {})
        text, pm, ent = L.load(tid)
        iq, ioff = imprint_quote(text)
        aq, aoff = authority_quote(text)
        files = []
        for role in ('text', 'pageindex', 'page_numbers'):
            f = t['files'][role]
            files.append({'role': role, 'name': f['name'], 'url': 'https://archive.org/cors/%s/%s' % (ident, f['name']), 'bytes': f['bytes'], 'sha256': f['sha256'],
                          'local_path': 'tmp/library/rosters/NC-MOORE-1882/' + f['name'], 'retrieved_utc': t['retrieved'], 'http_status': 200})
        mp = os.path.join(L.RAW, ident + '_metadata.json')
        if os.path.exists(mp):
            files.append({'role': 'metadata', 'name': ident + '_metadata.json', 'url': 'https://archive.org/metadata/' + ident, 'bytes': os.path.getsize(mp), 'sha256': sha(mp),
                          'local_path': 'tmp/library/rosters/NC-MOORE-1882/' + ident + '_metadata.json', 'http_status': 200, 'retrieved_utc': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime(os.path.getmtime(mp)))})
        ents.append({
            'source_id': L.SOURCE_ID, 'volume': vol + ('' if not tid.endswith('~b') else ' (second scan)'), 'text_id': tid, 'identifier': ident, 'title': _one(mdd.get('title')) or t['ia_title'],
            'year': 1882, 'creator': _one(mdd.get('creator')) or 'Moore, John W. (John Wheeler), 1833-1906', 'publisher': _one(mdd.get('publisher')) or t['ia_publisher'], 'contributor': t['ia_contributor'],
            'ocr_engine': t.get('ia_ocr'), 'imagecount': t['ia_imagecount'], 'page_url': 'https://archive.org/details/' + ident,
            'url': files[0]['url'], 'bytes': files[0]['bytes'], 'sha256': files[0]['sha256'], 'ia_title': t['ia_title'], 'ia_date': t['ia_date'], 'files': files,
            'rights': {'basis': BASIS, 'evidence': {
                'ia_date': t['ia_date'], 'ia_possible_copyright_status': t['ia_possible_copyright_status'], 'ia_access_restricted_item': t['ia_access_restricted_item'],
                'ia_licenseurl': _one(mdd.get('licenseurl')), 'ia_contributor': t['ia_contributor'], 'imprint': _one(mdd.get('publisher')) or t['ia_publisher'], 'year': 1882,
                'why': 'the State of North Carolina\'s own roster, printed at Raleigh by the state printers in 1882 under an act of the General Assembly ("compiled ... for the proper editing and preparation of a Roster of the troops furnished by North Carolina"): a US publication of 1882',
                'imprint_quote': iq, 'imprint_quote_offset_in_text': ioff, 'authority_quote': aq, 'authority_quote_offset_in_text': aoff}},
            'role': 'roll',
            'status': ('parsed: primary reading of %d units' % len(used.get(tid, []))) if used.get(tid) else 'read as the second reading of the units whose primary scan is the other copy of the volume; no line of a unit file is read from it',
            'used_for': sorted(used.get(tid, [])),
        })
    return ents


U_VOL = {}


def main(argv):
    if '--fetch-metadata' in argv:
        fetch_metadata()
        return 0
    if '--write' in argv:
        import nc_units as U
        for u in U.UNITS:
            if u[3] is not None:
                U_VOL[u[0]] = u[3]
        summary = json.load(open(os.path.join(L.WS, 'build-summary.json'), encoding='utf-8'))
        ents = source_entries(summary)
        now = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
        pointer = {
            'format': 'roster2-sources-pointer/1', 'work_item': 'conf-nc', 'generated': now,
            'access_rules': 'archive.org metadata and /cors/ downloads only, one request at a time, at least 1.2 s apart, generic client name; no login, key or bot-block workaround',
            'sources': ents, 'derived_texts': [],
            'not_used': [
                {'source_id': 'NC-CLARK-1901', 'identifier': 'cu31924092908536 (and four more volumes)', 'title': 'Clark, Histories of the Several Regiments and Battalions from North Carolina in the Great War 1861-65', 'year': 1901,
                 'status': 'lead, not read for this item: the narrative histories print present-for-duty figures and officer lists inside prose for some regiments; they are not a roll and no line was made from them (gap EG-ROS-NC-05)'},
                {'source_id': 'NEWS-1863-CASUALTIES', 'identifier': None, 'title': 'Richmond and North Carolina newspapers, July to September 1863 (Chronicling America)', 'year': 1863,
                 'status': 'lead, not read: named casualties by regiment belong to the cross-cutting item roster-gettysburg-lists'},
            ],
            'blocked': [],
        }
        os.makedirs(os.path.join(L.R2, 'sources'), exist_ok=True)
        with open(os.path.join(L.R2, 'sources', 'conf-nc.json'), 'w', encoding='utf-8') as f:
            json.dump(pointer, f, ensure_ascii=False, indent=1)
            f.write('\n')
        files = []
        for e in ents:
            for fl in e['files']:
                d = {k: fl[k] for k in ('role', 'name', 'url', 'bytes', 'sha256', 'local_path', 'retrieved_utc', 'http_status')}
                if fl['role'] != 'metadata':
                    d['ledger_sha256'] = fl['sha256']
                    d['sha256_matches_ledger'] = sha(os.path.join(L.ROOT, fl['local_path'])) == fl['sha256']
                d.update({'source_id': L.SOURCE_ID, 'text_id': e['text_id'], 'identifier': e['identifier']})
                files.append(d)
        man = {'format': 'roster-manifest/1', 'work_item': 'conf-nc', 'generated_utc': now,
               'rules': 'archive.org only (/metadata/ and /cors/), one request at a time, at least 1.2 s apart, a generic client name; no login, key or workaround', 'files': files}
        with open(os.path.join(L.ROOT, 'tmp', 'library', 'rosters', 'MANIFEST-conf-nc.json'), 'w', encoding='utf-8') as f:
            json.dump(man, f, ensure_ascii=False, indent=1)
            f.write('\n')
        print('wrote pointer file and manifest:', len(ents), 'sources', len(files), 'files; sha256 matches:', all(x.get('sha256_matches_ledger', True) for x in files))
        return 0
    print(__doc__)
    return 1


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
