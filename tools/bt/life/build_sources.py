"""Build docs/battle-theatre/life/evidence/sources.json: the registry of local texts an OA11 evidence row may cite.

    python3 -I tools/bt/life/build_sources.py

Reads the library pointer files (GOVERNANCE/library/acquired*.json, evidence/acquired_period.json), checks that each text is on disk, hashes it
and assigns a source class.  A source that is not in this registry cannot be cited (the validator refuses it): Wikipedia, forums, blogs, auction
pages and memory are not here and never will be (Law cl.4).  Source classes decide what tier a row may claim (contract.json).
"""
import os, re, sys, json, datetime
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from life_lib import *

utf8_stdout()
GOV = os.path.join(BT, 'GOVERNANCE', 'library')

CLASS_RULES = [
    (r'^OR-27-3$', 'official_correspondence', 'Official Records Ser. I vol. 27, part 3 (correspondence and orders)'),
    (r'^OR-27-[12]$', 'official_report', 'Official Records Ser. I vol. 27, reports'),
    (r'^(OR-|ORSER3)', 'official_other', 'Official Records, other volume'),
    (r'^(NY|PA|ME|MI|NJ|VT|MN|IN|OH)-', 'regimental_volume', 'state or regimental volume (participant narratives and dedication addresses, retrospective)'),
    (r'^(HASKELL|ALEXANDER|LONGSTREET|FREMANTLE|MEADE-LL|PIERCE-F|SHSP|BL-3)', 'memoir_narrative', 'participant or early narrative (retrospective)'),
    (r'^BILLINGS', 'period_manual', 'a veteran\'s general account of camp life (general practice only)'),
    (r'^(TPIERCE|JACOBS)', 'civilian_account', 'civilian account written in or soon after 1863'),
    (r'^(ADAMS-SENTINEL|GBG-COMPILER)', 'newspaper_1863', 'local newspaper of 1863'),
    (r'^(BACH|LONG-GBV)', 'secondary_early', 'early secondary account (Bachelder, Long)'),
    (r'^(LETTERMAN|HOSPSCENES)', 'medical_account', 'medical or hospital account'),
    (r'^(CEM-|MA-BURIAL|EVERETT)', 'burial_record', 'burial and cemetery record'),
    (r'^FOX', 'reference_table', 'regimental loss tables'),
    (r'^NPS', 'park_report', 'National Park Service report or page (institutional, secondary)'),
    (r'^(REGS-|BUTTERFIELD|MAHAN|DUANE)', 'period_manual', 'period manual or regulation (generic practice: basis for plausible-procedural rows only)'),
]
SKIP = re.compile(r'^(TM-|RC-HOPKINS|PM-|OR-ATLAS|NPS-.*-INDEX$)')
SIDE = [(r'^(ALEXANDER|LONGSTREET|FREMANTLE|SHSP|REGS-CS)', 'CS'), (r'^(HASKELL|MEADE|BUTTERFIELD|REGS-US)', 'US')]


def klass(sid):
    for rx, c, d in CLASS_RULES:
        if re.match(rx, sid):
            return c, d
    return None, None


def side(sid):
    for rx, s in SIDE:
        if re.match(rx, sid):
            return s
    return 'both'


def main():
    out = []
    missing = []

    def add(sid, title, path, extra=None):
        c, d = klass(sid)
        if c is None or SKIP.match(sid):
            return
        if not path or not os.path.isfile(os.path.join(ROOT, path)):
            missing.append(sid)
            return
        if not path.endswith('.txt'):
            return
        full = os.path.join(ROOT, path)
        rec = {'id': sid, 'title': title, 'class': c, 'class_note': d, 'side': side(sid), 'local_path': path.replace(os.sep, '/'),
               'bytes': os.path.getsize(full), 'sha256': sha256_file(full), 'lead': False, 'page_model': None}
        if re.match(r'^NPS', sid):
            rec['page_model'] = 'pdf_markers'
        if extra:
            rec.update(extra)
        out.append(rec)

    # Official Records vol. 27 (page model of tools/bt/or27_pages.py, record index docs/battle-theatre/library/or27_index.json)
    ori = load_json(OR_INDEX_PATH)
    for p in (1, 2, 3):
        s = ori['sources'][str(p)]
        add('OR-27-%d' % p, 'Official Records of the War of the Rebellion, Ser. I, vol. 27, part %d (%s)' % (p, s['label']), s['file'],
            {'part': p, 'page_model': 'or27', 'record_index': 'docs/battle-theatre/library/or27_index.json', 'archive_identifier': s['archive_identifier']})
    seen = set(r['id'] for r in out)
    # ws9 and prior items
    for fn in ('acquired_2.json',):
        x = load_json(os.path.join(GOV, fn))
        for it in x['items']:
            sid = it.get('id') or it.get('source_id')
            if sid and sid not in seen:
                add(sid, it.get('title', ''), it.get('local_path'), {'archive_identifier': it.get('archive_identifier'), 'date': it.get('date')})
                seen.add(sid)
        for it in x.get('reverified_prior_items', []):
            sid = it['source_id']
            if sid not in seen:
                add(sid, sid, it['local_path'], {'archive_identifier': it.get('archive_identifier')})
                seen.add(sid)
    # state volumes with a section index
    sv = None
    if os.path.exists(STATEVOL_INDEX_PATH):
        sv = load_json(STATEVOL_INDEX_PATH)
    # NPS pages and reports
    x = load_json(os.path.join(GOV, 'acquired_3.json'))
    for it in x['items']:
        sid = it.get('id') or it.get('source_id')
        lp = it.get('local_path')
        if sid and sid not in seen and lp and lp.endswith('.txt'):
            add(sid, it.get('title', ''), lp, {'url': it.get('url')})
            seen.add(sid)
    # period manuals fetched by acquire_texts.py
    pp = os.path.join(EVID, 'acquired_period.json')
    if os.path.exists(pp):
        for it in load_json(pp)['items']:
            if it['id'] not in seen:
                add(it['id'], it['title'], it['local_path'], {'archive_identifier': it['archive_identifier'], 'date': it.get('date'), 'purpose': it.get('purpose')})
                seen.add(it['id'])
    out.sort(key=lambda r: (r['class'], r['id']))
    reg = {'_doc': ('Registry of the local texts an OA11 evidence row may cite (tools/bt/life/build_sources.py). class decides the tiers a row may claim '
                    '(contract.json source_classes). Not in this list = not citable. Wikipedia, forums, blogs, auction pages and memory are never sources. '
                    'Texts are untracked raw OCR under tmp/; sha256 detects a changed file.'),
           'built': datetime.date.today().isoformat(), 'count': len(out), 'missing_on_disk': sorted(set(missing)),
           'class_counts': {}, 'sources': out}
    for r in out:
        reg['class_counts'][r['class']] = reg['class_counts'].get(r['class'], 0) + 1
    dump_json(SOURCES_PATH, reg)
    print('sources:', len(out), reg['class_counts'])
    if missing:
        print('not on disk (skipped):', sorted(set(missing)))


if __name__ == '__main__':
    main()
