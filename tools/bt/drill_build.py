"""Build docs/battle-theatre/drill/*.json from the spec modules drill_data_inf.py, drill_data_art.py, drill_data_ord.py.

Every spec carries a verbatim OCR phrase (<15 words).  The builder locates the phrase in the whitespace-normalised OCR text of
the named manual, records the OCR line, recovers the printed page (drill_text.page_of) and writes the JSON.  Nothing is entered
that the code could not find in the OCR text; a spec whose phrase is not found aborts the build (exit 1).

Hardee additions: drill_hardee.json and drill_compare.json are built by drill_build_hardee.py (specs in drill_data_hardee.py).

Run:  PYTHONIOENCODING=utf-8 python tools/bt/drill_build.py          (then python tools/bt/drill_check.py)
"""
import json, os, sys, hashlib
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import drill_text as T
import drill_data_inf as INF
import drill_data_art as ART
import drill_data_ord as ORD

OUT = os.path.join(T.ROOT, 'docs', 'battle-theatre', 'drill')
ACQ = os.path.join(T.ROOT, 'docs', 'battle-theatre', 'GOVERNANCE', 'library', 'acquired.json')


def sha(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for b in iter(lambda: f.read(1 << 20), b''):
            h.update(b)
    return h.hexdigest()


def sources_block(used):
    acq = {i['source_id']: i for i in json.load(open(ACQ, encoding='utf-8'))['items']}
    out = {}
    for m in sorted(used):
        a = acq.get(m, {})
        out[m] = {
            'title': T.MANUALS[m]['title'],
            'ocr_file': 'tmp/library/misc/' + T.MANUALS[m]['file'],
            'archive_identifier': a.get('archive_identifier'),
            'sha256': a.get('sha256'),
            'acquired_json_source_id': m,
            'licence': a.get('licence_note'),
            'ocr_quality_note': 'raw archive.org djvu text, uncorrected; page images were not inspected',
        }
    return out


def resolve(spec, errors):
    it = dict(spec)
    m = it['manual']
    ph = it['phrase']
    nw = len(ph.split())
    if nw > 14:
        errors.append('%s: phrase has %d words (limit 14): %r' % (it['id'], nw, ph))
    occ = T.locate(m, ph)
    if not occ:
        errors.append('%s: phrase NOT FOUND in %s: %r' % (it['id'], m, ph))
        return None
    nth = it.get('nth', 0)
    if nth >= len(occ):
        errors.append('%s: nth=%d but only %d occurrences' % (it['id'], nth, len(occ)))
        return None
    ln = occ[nth][0]
    pg, conf, hl, ht = T.page_of(m, ln)
    it['verbatim'] = ph
    del it['phrase']
    it['ocr_line'] = ln
    it['ocr_occurrences'] = len(occ)
    it['printed_page'] = pg
    it['page_confidence'] = conf
    it['page_header_ocr_line'] = hl
    it['page_header_text'] = ht
    ov = it.pop('page_override', None)
    if ov:
        # manual page recovery where the automatic running-head reader is wrong or blind; the basis line is re-checked by drill_check.py
        it['machine_page'] = {'page': pg, 'confidence': conf, 'header_line': hl}
        it['printed_page'] = ov['page']
        it['page_confidence'] = ov['confidence']
        it['page_header_ocr_line'] = ov['basis_line']
        it['page_header_text'] = ov['basis_text']
        it['page_override_why'] = ov['why']
        it['page_override_basis_relation'] = ov.get('relation', 'preceding')
    it.setdefault('tier', 'documented')
    it.setdefault('ocr_quality', 'clean')
    # optional extra verbatim strings (e.g. the OCR'd heading of a command)
    for k in ('heading_ocr', 'verbatim2'):
        if k in it:
            o2 = T.locate(m, it[k])
            if not o2:
                errors.append('%s: %s NOT FOUND in %s: %r' % (it['id'], k, m, it[k]))
            elif len(it[k].split()) > 14:
                errors.append('%s: %s too long' % (it['id'], k))
    return it


def build(name, doc, specs, extra):
    errors = []
    items = []
    for s in specs:
        r = resolve(s, errors)
        if r:
            items.append(r)
    ids = [i['id'] for i in items]
    if len(ids) != len(set(ids)):
        errors.append('%s: duplicate ids' % name)
    if errors:
        print('\n'.join(errors))
        return False
    out = {'_doc': doc, 'schema_version': 1, 'built_from': 'tools/bt/drill_build.py (specs in drill_data_*.py)',
           'sources': sources_block({i['manual'] for i in items})}
    out.update(extra)
    out['items'] = items
    os.makedirs(OUT, exist_ok=True)
    p = os.path.join(OUT, name)
    with open(p, 'w', encoding='utf-8') as f:
        json.dump(out, f, indent=1, ensure_ascii=False)
    print('wrote', p, len(items), 'items')
    return True


def main():
    ok = True
    ok &= build('drill_infantry.json', INF.DOC, INF.SPECS, INF.EXTRA)
    ok &= build('drill_artillery.json', ART.DOC, ART.SPECS, ART.EXTRA)
    ok &= build('ordnance_tables.json', ORD.DOC, ORD.SPECS, ORD.EXTRA)
    import drill_build_hardee as HB      # Hardee passages and the Hardee-vs-Casey rows (needs drill_infantry.json written above)
    ok &= HB.build_hardee()
    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(main())
