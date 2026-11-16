"""sources-a close-out (round 2, 2026-11-16): source registry and local text copies.

Run with  python3 -I stexts.py  (read-only on every fetched body; writes only under tmp/sources-a/text/).

Every source that a citation in evidence_corrections/sources-a.jsonl names is registered here with
  - the raw file (as fetched; sha256 recorded),
  - the local TEXT file that quotes are matched in (deterministic conversion of the raw file; sha256 recorded),
  - url, retrieval time (from lookups.jsonl or the library manifest), class and a one-line description.
Offsets in the evidence file are CHARACTER offsets in the local text file (UTF-8, newline='' read), the same convention
as tools/bt/or27_lib and the other close-out shards.

Conversions
  LOC / EPT / IIIF JSON  -> one 'path: value' line per scalar (slib.flatten_json); strings are written raw, so a quote is verbatim
  HTML pages             -> text with link targets kept as ' [href: X]' after the link text
  NPS library PDFs, IA djvu text, robots.txt -> used as they are (already text)
"""
import os, re, json, sys, hashlib

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import slib  # noqa: E402

ROOT = '/home/user/cautious-chainsaw'
FETCH = os.path.join(ROOT, 'tmp/sources-a/fetch')
TEXT = os.path.join(ROOT, 'tmp/sources-a/text')
NPS = os.path.join(ROOT, 'tmp/library/web/nps')
LOG = os.path.join(ROOT, 'docs/battle-theatre/GOVERNANCE/horde/sources-a/lookups.jsonl')
os.makedirs(TEXT, exist_ok=True)


def sha(p):
    return slib.sha256_file(p)


def _lookup_times():
    """id -> list of (utc, record) from lookups.jsonl"""
    d = {}
    for line in open(LOG, encoding='utf-8'):
        try:
            r = json.loads(line)
        except Exception:
            continue
        d.setdefault(r['id'], []).append(r)
    return d


LK = _lookup_times()


def lk(id_):
    """latest successful (status 200) record of a lookup id, else the latest record"""
    recs = LK.get(id_, [])
    ok = [r for r in recs if r.get('status') == 200]
    return (ok or recs or [None])[-1]


def _flat(obj, prefix='', out=None):
    """one 'path: value' line per scalar; strings raw with line breaks turned into single spaces (so a quote may cross a line break)"""
    if out is None:
        out = []
    if isinstance(obj, dict):
        for k, v in obj.items():
            _flat(v, (prefix + '.' if prefix else '') + str(k), out)
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            _flat(v, '%s[%d]' % (prefix, i), out)
    else:
        val = re.sub(r'\s+', ' ', obj) if isinstance(obj, str) else json.dumps(obj)
        out.append('%s: %s' % (prefix, val))
    return out


def json_to_text2(src, dst, drop_prefixes=()):
    d = json.load(open(src, encoding='utf-8'))
    lines = _flat(d)
    if drop_prefixes:
        lines = [l for l in lines if not l.startswith(drop_prefixes)]
    open(dst, 'w', encoding='utf-8', newline='').write('\n'.join(lines) + '\n')
    return dst


def html_with_links(src, dst):
    s = open(src, encoding='utf-8', errors='replace').read()
    s = re.sub(r'<a\b[^>]*?href="([^"]*)"[^>]*>(.*?)</a>', lambda m: m.group(2) + ' [href: ' + m.group(1) + '] ', s, flags=re.S | re.I)
    tmp = dst + '.tmp.html'
    open(tmp, 'w', encoding='utf-8', newline='').write(s)
    slib.html_to_text(tmp, dst)
    os.remove(tmp)
    return dst


# (key, raw path, text path or None (= raw is already text), conversion, lookup id, url, class, description)
FETCHED = [
    ('LOC-99446453', 'loc_99446453.json', 'json', 'loc_99446453', 'https://www.loc.gov/item/99446453/?fo=json', 'Library of Congress item record (JSON interface of loc.gov)', 'Warren tracing-linen extract, G3822.G4S5 1886 .U5'),
    ('LOC-99448794', 'loc_99448794.json', 'json', 'loc_99448794', 'https://www.loc.gov/item/99448794/?fo=json', 'Library of Congress item record (JSON interface of loc.gov)', 'Warren, Battle field of Gettysburg, 1:12,000 reduction, G3824.G3 187- W3'),
    ('LOC-99447491', 'loc_99447491.json', 'json', 'loc_99447491', 'https://www.loc.gov/item/99447491/?fo=json', 'Library of Congress item record (JSON interface of loc.gov)', 'Bachelder 1876, three maps, G3824.G3S5 1863 .B33'),
    ('LOC-99447498', 'loc_99447498.json', 'json', 'loc_99447498', 'https://www.loc.gov/item/99447498/?fo=json', 'Library of Congress item record (JSON interface of loc.gov)', 'Cope and Hewitt, Gettysburg battlefield, 1863, G3824.G3S5 1863 .C6'),
    ('LOC-2004629149', 'loc_2004629149.json', 'json', 'loc_2004629149', 'https://www.loc.gov/item/2004629149/?fo=json', 'Library of Congress item record (JSON interface of loc.gov)', 'Hopkins, Map of Adams Co., Pennsylvania, 1858, G3823.A3 1858 .H6'),
    ('LOC-G3880', 'loc_g3880.json', 'json', 'loc_g3880', 'https://www.loc.gov/resource/g3880.cw0508800/?fo=json', 'Library of Congress resource record (JSON interface of loc.gov)', 'Michler, region between Gettysburg and Appomattox, G3880 186- .M5'),
    ('LOC-99447501', 'loc_99447501.json', 'json', 'loc_99447501', 'https://www.loc.gov/item/99447501/?fo=json', 'Library of Congress item record (JSON interface of loc.gov)', 'Elliott, Map of the battlefield of Gettysburg, 1864, G3824.G3S5 1863 .E5'),
    ('LOC-2005625069', 'loc_2005625069.json', 'json', 'loc_2005625069', 'https://www.loc.gov/item/2005625069/?fo=json', 'Library of Congress item record (JSON interface of loc.gov)', 'Sketch of the battlefield of Gettysburg, July 1st and 2nd, 1863, G3824.G3S5 1863 .S6 (Hotchkiss Map Collection rights text)'),
    ('LOC-CWM-GETTYSBURG', 'loc_cwm_q_gettysburg.json', 'json', 'loc_cwm_q_gettysburg', 'https://www.loc.gov/collections/civil-war-maps/?q=gettysburg&fo=json&c=5', 'Library of Congress collection query (JSON)', 'Civil War Maps collection, q=gettysburg'),
    ('LOC-CWM-HOTCHKISS', 'loc_cwm_q_hotchkiss.json', 'json', 'loc_cwm_q_hotchkiss', 'https://www.loc.gov/collections/civil-war-maps/?q=hotchkiss+gettysburg&fo=json&c=10', 'Library of Congress collection query (JSON)', 'Civil War Maps collection, q=hotchkiss gettysburg'),
    ('LOC-CWM-WHITNEY', 'loc_cwm_q_whitney.json', 'json', 'loc_cwm_q_whitney', 'https://www.loc.gov/collections/civil-war-maps/?q=whitney+gettysburg&fo=json&c=10', 'Library of Congress collection query (JSON)', 'Civil War Maps collection, q=whitney gettysburg'),
    ('LOC-CWM-COPE', 'loc_cwm_f_cope.json', 'json', 'loc_cwm_f_cope', 'https://www.loc.gov/collections/civil-war-maps/?c=10&fa=contributor:cope,+emmor+b.&fo=json&q=gettysburg', 'Library of Congress collection query (JSON)', 'Civil War Maps collection, contributor Cope, Emmor B.'),
    ('LOC-CWM-BIEN', 'loc_cwm_f_bien2.json', 'json', 'loc_cwm_f_bien2', 'https://www.loc.gov/collections/civil-war-maps/?c=10&fa=contributor:bien,+julius&fo=json&q=gettysburg', 'Library of Congress collection query (JSON)', 'Civil War Maps collection, contributor Bien, Julius'),
    ('LOC-CWM-SICKLES', 'loc_cwm_q_sickles.json', 'json', 'loc_cwm_q_sickles', 'https://www.loc.gov/collections/civil-war-maps/?q=sickles+headquarters+gettysburg&fo=json&c=10', 'Library of Congress collection query (JSON)', 'Civil War Maps collection, q=sickles headquarters gettysburg (0 results)'),
    ('LOC-CWM-MEADE-HQ', 'loc_cwm_q_meade_hq.json', 'json', 'loc_cwm_q_meade_hq', 'https://www.loc.gov/collections/civil-war-maps/?q=meade+headquarters+gettysburg&fo=json&c=10', 'Library of Congress collection query (JSON)', 'Civil War Maps collection, q=meade headquarters gettysburg (0 results)'),
    ('LOC-CWM-EDWIN-WHITNEY', 'loc_cwm_q_edwin_whitney.json', 'json', 'loc_cwm_q_edwin_whitney', 'https://www.loc.gov/collections/civil-war-maps/?q=edwin+whitney&fo=json&c=10', 'Library of Congress collection query (JSON)', 'Civil War Maps collection, q=edwin whitney (0 results)'),
    ('LOC-CWM-SICKLES1', 'loc_cwm_q_sickles1.json', 'json', 'loc_cwm_q_sickles1', 'https://www.loc.gov/collections/civil-war-maps/?q=sickles&fo=json&c=25', 'Library of Congress collection query (JSON)', 'Civil War Maps collection, q=sickles'),
    ('LOC-CWM-WHITNEY1', 'loc_cwm_q_whitney1.json', 'json', 'loc_cwm_q_whitney1', 'https://www.loc.gov/collections/civil-war-maps/?q=whitney&fo=json&c=25', 'Library of Congress collection query (JSON)', 'Civil War Maps collection, q=whitney'),
    ('LOC-CWM-HQGETT', 'loc_cwm_q_headquarters_gettysburg.json', 'json', 'loc_cwm_q_headquarters_gettysburg', 'https://www.loc.gov/collections/civil-war-maps/?q=headquarters+gettysburg&fo=json&c=25', 'Library of Congress collection query (JSON)', 'Civil War Maps collection, q=headquarters gettysburg'),
    ('LOC-CWM-GNMPC', 'loc_cwm_f_gnmpc2.json', 'json', 'loc_cwm_f_gnmpc2', 'https://www.loc.gov/collections/civil-war-maps/?c=20&fa=contributor:gettysburg+national+military+park+commission&fo=json&q=gettysburg', 'Library of Congress collection query (JSON)', 'Civil War Maps collection, contributor Gettysburg National Military Park Commission'),
    ('LOC-IIIF-cw0350500', 'tile_info_cw0350500.json', 'json', 'tile_info_cw0350500', 'https://tile.loc.gov/image-services/iiif/service:gmd:gmd382:g3822:g3822g:cw0350500/info.json', 'Library of Congress IIIF image service (info.json)', 'image size of the Warren extract'),
    ('IA-ATLAS-META', 'ia_atlas_meta.html', 'json', 'ia_atlas_meta', 'https://archive.org/metadata/atlastoaccompany00unit', 'Internet Archive item metadata (JSON)', 'Atlas to accompany the official records, IA item atlastoaccompany00unit'),
    ('IA-ATLAS-SEARCH', 'ia_search_atlas.html', 'json', 'ia_search_atlas', 'https://archive.org/advancedsearch.php?q=title%3A%28atlas+to+accompany+the+official+records%29&fl%5B%5D=identifier&fl%5B%5D=title&fl%5B%5D=date&rows=20&output=json', 'Internet Archive advanced search (JSON)', 'copies of the Atlas on archive.org'),
    ('EPT-ROOT', 'aws_ept_pa_south_central.json', 'json', 'aws_ept_pa_south_central', 'https://s3-us-west-2.amazonaws.com/usgs-lidar-public/USGS_LPC_PA_South_Central_B1_2017_LAS_2019/ept.json', 'public cloud-storage object (Entwine EPT root, USGS 3DEP lidar on AWS)', 'EPT root of USGS_LPC_PA_South_Central_B1_2017_LAS_2019'),
    ('EPT-BUILD', 'ept_build.json', 'json', 'ept_build', 'https://s3-us-west-2.amazonaws.com/usgs-lidar-public/USGS_LPC_PA_South_Central_B1_2017_LAS_2019/ept-build.json', 'public cloud-storage object (Entwine build record)', 'EPT build record'),
    ('EPT-SRC-18SUK309410', 'ept_src_18SUK309410.json', 'json', 'ept_src_18SUK309410', 'https://s3-us-west-2.amazonaws.com/usgs-lidar-public/USGS_LPC_PA_South_Central_B1_2017_LAS_2019/ept-sources/USGS_LPC_PA_South_Central_B1_2017_18SUK309410_LAS_2019.json', 'public cloud-storage object (EPT source record read from the LAZ header)', 'LAZ tile 18SUK309410 (Gettysburg), project PA_South_Central_B1_2017'),
    ('EPT-BUCKET-LIST-PA', 's3_list_usgs_lidar_pa.xml', 'txt', 's3_list_usgs_lidar_pa', 'https://s3-us-west-2.amazonaws.com/usgs-lidar-public?delimiter=/&prefix=USGS_LPC_PA&max-keys=200', 'public cloud-storage bucket listing (S3 XML)', 'prefixes of the public USGS lidar bucket that start with USGS_LPC_PA'),
    ('NPS-REHAB-PAGE', 'nps_rehab.html', 'html', 'nps_rehab', 'https://www.nps.gov/gett/learn/news/gett-battlefield-rehab.htm', 'National Park Service web page', 'Battlefield Rehabilitation at Gettysburg National Military Park'),
    ('NPS-PLANNING-PAGE', 'nps_planning.html', 'html', 'nps_planning', 'https://www.nps.gov/gett/getinvolved/planning.htm', 'National Park Service web page', 'Gettysburg NMP planning page (Fire Management Plan, Little Round Top CLR)'),
    ('NPSHISTORY-INDEX', 'npshist_index.html', 'html', 'npshist_index', 'https://www.npshistory.com/publications/gett/index.htm', 'npshistory.com index of Gettysburg NMP publications', 'index of NPS publications for Gettysburg'),
    ('ROBOTS-CATALOG-ARCHIVES', 'robots_catalog.archives.gov.txt', 'txt', 'robots_catalog.archives.gov', 'https://catalog.archives.gov/robots.txt', 'robots.txt', 'robots.txt of catalog.archives.gov'),
    ('ROBOTS-LOC', 'robots_www.loc.gov.txt', 'txt', 'robots_www.loc.gov', 'https://www.loc.gov/robots.txt', 'robots.txt', 'robots.txt of www.loc.gov'),
    ('ROBOTS-NPS', 'robots_www.nps.gov.txt', 'txt', 'robots_www.nps.gov', 'https://www.nps.gov/robots.txt', 'robots.txt', 'robots.txt of www.nps.gov'),
]
IA_ATLAS_TXT = ('IA-ATLAS-TXT', 'ia_atlas_txt.txt', 'txt', 'ia_atlas_txt', 'https://archive.org/cors/atlastoaccompany00unit/atlastoaccompany00unit_djvu.txt', 'Internet Archive OCR text of a scan of the Atlas (1891 printing)', 'Atlas to accompany the official records, OCR text (archive.org atlastoaccompany00unit)')

# NPS library documents (already local text, fetched by the web-evidence workstream on 2026-11-13)
NPS_LIB = {
    'NPS-ADHI': 'Administrative History: Gettysburg National Military Park and National Cemetery (Unrau, 1991)',
    'NPS-GMP-1999-V1': 'General Management Plan / Environmental Impact Statement, Gettysburg NMP, vol. 1 (1999)',
    'NPS-CLR-1STDAY': 'Cultural Landscape Report for First Day - Union 1st Corps Battlefield (Auwaerter et al., 2021)',
    'NPS-CLR-LRT': 'Little Round Top Cultural Landscape Report, Treatment & Management Plan (final, 2 March 2012)',
    'NPS-CLR-ROT-V1': 'Cultural Landscape Report for Gettysburg NMP, Record of Treatment, vol. I (2018)',
    'NPS-CLR-ROT-V2': 'Cultural Landscape Report for Gettysburg NMP, Record of Treatment, vol. II (2018)',
    'NPS-CLR-CEMETERY': 'Cultural Landscape Report for Gettysburg National Cemetery (2017)',
    'NPS-COMMON-PRIDE-1': '"A Common Pride and Fame": The Attack and Repulse of Pickett\'s Division, Part I (Georg, 1981)',
    'NPS-COMMON-PRIDE-2': '"A Common Pride and Fame": The Attack and Repulse of Pickett\'s Division, Part II (Georg, 1981)',
    'NPS-HARMON-FARM': 'Harmon Farm / Springs Hotel Woods study (NPS)',
    'NPS-HS-MCPHERSON': 'Historic Structure Report, McPherson Farm (NPS)',
    'NPS-EISE-CLR1': 'Cultural Landscape Report for Eisenhower National Historic Site, vol. 1',
    'NPS-CLI-1STDAY': 'Cultural Landscapes Inventory: First Day - Union 1st Corps Battlefield (2021)',
    'NPS-CLI-LANDSCAPE': 'Cultural Landscapes Inventory: Gettysburg Landscape (2000, revised 2004)',
    'NPS-CLI-PCB': 'Cultural Landscapes Inventory: Pickett\'s Charge Battlefield (2024)',
    'NPS-NRCA-2017': 'Natural Resource Condition Assessment, Gettysburg NMP and Eisenhower NHS (2017)',
}


def build():
    """create text copies; return the registry dict"""
    reg = {}
    for key, raw, conv, lkid, url, cls, desc in FETCHED + [IA_ATLAS_TXT]:
        rawp = os.path.join(FETCH, raw)
        if not os.path.exists(rawp):
            reg[key] = dict(key=key, missing=True, raw=os.path.relpath(rawp, ROOT))
            continue
        if conv == 'json':
            tp = os.path.join(TEXT, key.lower() + '.txt')
            json_to_text2(rawp, tp, drop_prefixes=('more_like_this', 'related_items', 'options', 'cite_this', 'timestamp', 'articles_and_essays', 'views', 'facet_views'))
        elif conv == 'html':
            tp = os.path.join(TEXT, key.lower() + '.txt')
            html_with_links(rawp, tp)
        else:
            tp = rawp
        r = lk(lkid) or {}
        reg[key] = dict(key=key, url=url, source_class=cls, description=desc, retrieved=r.get('utc'), http_status=r.get('status'),
                        raw_path=os.path.relpath(rawp, ROOT), raw_sha256=sha(rawp), local_path=os.path.relpath(tp, ROOT), local_sha256=sha(tp),
                        conversion=conv)
    # NPS library
    man = json.load(open(os.path.join(NPS, 'MANIFEST.json')))['items']
    for k, desc in NPS_LIB.items():
        m = man[k]
        tp = os.path.join(ROOT, m['text_path'])
        reg[k] = dict(key=k, url=m['url'], source_class='National Park Service document (United States government work), text layer of the PDF', description=desc,
                      retrieved=m.get('fetched_at'), http_status=m.get('http'), raw_path=None, raw_sha256=m.get('sha256'), raw_bytes=m.get('bytes'),
                      local_path=m['text_path'], local_sha256=sha(tp), manifest_text_sha256=m.get('text_sha256'), conversion='pdftotext (web-evidence workstream)')
    # Official Records, Series I vol. 27 (raw OCR, tmp/library/or27)
    for key, rel, desc in (
        ('OR-27-2', 'tmp/library/or27/cu31924077728255_djvu.txt', 'Official Records, Series I, vol. 27, part 2 (Cornell scan, archive.org item cu31924077728255)'),
    ):
        tp = os.path.join(ROOT, rel)
        reg[key] = dict(key=key, url='https://archive.org/details/cu31924077728255', source_class='primary (official report written 1863-65; Government Printing Office volume 1889, raw OCR, single witness)', description=desc,
                        retrieved=None, local_path=rel, local_sha256=sha(tp), conversion='as is (djvu text)')
    # project documents of this repository (own measurements and notes; never an independent source)
    for key, rel, desc in (
        ('PROJ-BASEMAP-README', 'docs/basemap1863/maps/README.md', 'georeferencing README of the basemap1863 project (own measurements)'),
        ('PROJ-ELEV-NOTES', 'docs/battle-theatre/terrain/elev1863/ELEV-NOTES.md', 'elev1863 notes: Warren label anchors and trusted coverage (own measurements)'),
        ('PROJ-TERRAIN-STATUS', 'docs/battle-theatre/terrain/terrain_pipeline_status.md', 'terrain pipeline status notes (own)'),
    ):
        tp = os.path.join(ROOT, rel)
        reg[key] = dict(key=key, url=None, source_class='project document of this repository (own measurement or note), not an independent source', description=desc,
                        retrieved=None, local_path=rel, local_sha256=sha(tp), conversion='as is (markdown)')
    # own derived summaries (computed by this script from saved bodies; sha256 of the inputs recorded in the text)
    lst = json.load(open(os.path.join(FETCH, 'ept_sources_list.json')))
    lines = ['EPT source list (ept-sources/list.json), sha256 %s, bytes %d' % (sha(os.path.join(FETCH, 'ept_sources_list.json')), os.path.getsize(os.path.join(FETCH, 'ept_sources_list.json'))),
             'source files listed: %d' % len(lst),
             'status inserted: %d' % sum(1 for e in lst if e.get('status') == 'inserted'),
             'sum of points: %d' % sum(e.get('points', 0) for e in lst)]
    tp = os.path.join(TEXT, 'own_ept_sources_summary.txt')
    open(tp, 'w', encoding='utf-8', newline='').write('\n'.join(lines) + '\n')
    reg['OWN-EPT-SOURCES-SUMMARY'] = dict(key='OWN-EPT-SOURCES-SUMMARY', url='https://s3-us-west-2.amazonaws.com/usgs-lidar-public/USGS_LPC_PA_South_Central_B1_2017_LAS_2019/ept-sources/list.json', source_class='own computation from a saved public cloud-storage object (counts and sums)', description='counts of the EPT source list', retrieved=(lk('ept_sources_list') or {}).get('utc'), local_path=os.path.relpath(tp, ROOT), local_sha256=sha(tp), conversion='computed')
    man2 = json.load(open(os.path.join(NPS, 'MANIFEST.json')))['items']
    ml = []
    for k in ('NPS-CLR-LRT', 'NPS-CLR-1STDAY', 'NPS-CLR-CEMETERY', 'NPS-CLR-ROT-V1', 'NPS-CLR-ROT-V2', 'NPS-ADHI', 'NPS-GMP-1999-V1'):
        m = man2[k]
        ml.append('%s | url %s | bytes %s | http %s | fetched %s | sha256 %s' % (k, m['url'], m.get('bytes'), m.get('http'), m.get('fetched_at'), m.get('sha256')))
    tp = os.path.join(TEXT, 'own_nps_manifest_extract.txt')
    open(tp, 'w', encoding='utf-8', newline='').write('\n'.join(ml) + '\n')
    reg['OWN-NPS-MANIFEST'] = dict(key='OWN-NPS-MANIFEST', url=None, source_class='extract of the local manifest of the NPS library (tmp/library/web/nps/MANIFEST.json, web-evidence workstream)', description='size, URL and hash of the NPS PDFs read', retrieved=None, local_path=os.path.relpath(tp, ROOT), local_sha256=sha(tp), conversion='manifest lines')
    # own HEAD records (response headers) as a text
    heads = []
    for id_ in ('head_jp2_cw0350500', 'head_tifZ_cw0350500', 'head_tif_cw0350500', 'head_ept_sources_list', 'head_ept_build', 'head_nps_lrt_clr'):
        r = lk(id_)
        if r:
            h = r.get('headers') or {}
            heads.append('%s | %s | HEAD %s | status %s | content-length %s | last-modified %s | utc %s' % (id_, r.get('id'), r['url'], r.get('status'), h.get('content-length', r.get('clen')), h.get('last-modified', r.get('lastmod')), r.get('utc')))
    tp = os.path.join(TEXT, 'own_head_records.txt')
    open(tp, 'w', encoding='utf-8', newline='').write('\n'.join(heads) + '\n')
    reg['OWN-HEAD-RECORDS'] = dict(key='OWN-HEAD-RECORDS', url=None, source_class='own HTTP HEAD records (response headers) written to lookups.jsonl by this shard', description='content-length and last-modified of LOC image files and AWS EPT objects',
                                  retrieved=None, local_path=os.path.relpath(tp, ROOT), local_sha256=sha(tp), conversion='lookups.jsonl lines')
    json.dump(reg, open(os.path.join(TEXT, 'REGISTRY.json'), 'w'), indent=1, ensure_ascii=False)
    return reg


if __name__ == '__main__':
    r = build()
    for k, v in r.items():
        print(k, v.get('local_path'), v.get('retrieved'), 'MISSING' if v.get('missing') else '')
