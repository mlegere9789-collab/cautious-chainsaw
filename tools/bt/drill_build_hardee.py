"""Build docs/battle-theatre/drill/drill_hardee.json and drill_compare.json from drill_data_hardee.py (called by drill_build.py).

Hardee-vs-Casey rows: the two OCR line windows of each row are read here, their letters-only similarity and the content words without a near match
on the other side are computed (drill_paras.py), exclusive phrases and absence regexes are verified, and the citation items (HAR-* for Hardee,
HCS-* for Casey, or an existing INF-* item that lies inside the Casey window) are resolved with the common resolver in drill_build.py.
Nothing is written that the code could not find in the OCR text; any failure aborts the build (exit 1).
"""
import json, os, re, sys, glob
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import drill_text as T
import drill_paras as P
import drill_data_hardee as HD
import drill_build as B

OUT, ACQ = B.OUT, B.ACQ


def _win_segs(win, side, errors, rid):
    """Window spec -> list of (manual, first_line, last_line)."""
    wins = win if isinstance(win, list) else [win]
    out = []
    for w in wins:
        try:
            if w[0] == 'L':
                m = w[3] if len(w) > 3 else (HD.H if side == 'h' else HD.C1)
                out.append((m, w[1], w[2]))
            else:
                sec = w[0]
                m = HD.H if side == 'h' else (HD.C2 if sec == 'SB' else HD.C1)
                a, b = P.span_range(m, sec, w[1], w[2])
                out.append((m, a, b))
        except KeyError as e:
            errors.append('%s: window %r unresolved: %s' % (rid, w, e))
    return out


def _txt(segs):
    return ' '.join(P.span_text(m, a, b) for m, a, b in segs)


def _nth_in(manual, phrase, segs):
    occ = T.locate(manual, phrase)
    for k, (ln, _) in enumerate(occ):
        if any(m == manual and a <= ln <= b for m, a, b in segs):
            return k
    return None


def _quality(phrase):
    voc = P.vocab()
    bad = sum(1 for t in phrase.split() if re.sub(r'[^a-z]', '', t.lower()) not in voc)
    return 'clean' if bad == 0 else ('minor-noise' if bad <= 2 else 'noisy')


def _witness_a(phrase):
    """Longest run (>= 5 words) of the Hardee-b phrase that occurs verbatim in the Memphis copy (HARDEE-1861a); None if no run does."""
    w = phrase.split()
    for n in range(len(w), 4, -1):
        for i in range(0, len(w) - n + 1):
            sub = ' '.join(w[i:i + n])
            occ = T.locate(HD.HA, sub)
            if occ:
                return {'verbatim': sub, 'words': n, 'ocr_line': occ[0][0], 'ocr_occurrences': len(occ)}
    return None


def _pick(manual, segs, errors, rid, preferred=None):
    if preferred:
        ph = preferred[0]
        k = _nth_in(manual, ph, segs)
        if k is None:
            errors.append('%s: phrase not inside its window: %r' % (rid, ph))
            return None, 0
        return ph, k
    for m, a, b in segs:
        ph = P.pick_phrase(m, a, b, 9, 0)
        if ph:
            return ph, _nth_in(manual, ph, segs)
    errors.append('%s: no clean phrase found in window %r' % (rid, segs))
    return None, 0


def call_table(calls, hs, cs, errors, rid):
    ht, ct = _txt(hs), _txt(cs)
    out, ph, pc = [], -1, -1
    for cno, hno, name, hrx, crx in calls:
        e = {'casey_no': cno, 'hardee_no': hno, 'name': name, 'hardee_regex': hrx, 'casey_regex': crx}
        mc = re.search(crx, ct)
        if not mc or mc.start() <= pc:
            errors.append('%s: Casey call %d %r not found in order' % (rid, cno, name))
        else:
            pc = mc.start()
        if hrx:
            mh = re.search(hrx, ht)
            if not mh or mh.start() <= ph:
                errors.append('%s: Hardee call %r not found in order' % (rid, name))
            else:
                ph = mh.start()
            e['hardee_reading'] = 'legible (damaged OCR)'
        else:
            e['hardee_reading'] = 'not in the Hardee list' if hno is None and name == 'Signal of execution' else ('line missing in the OCR (number skipped)' if hno is None else 'unreadable in the OCR')
        out.append(e)
    return out


def hardee_specs(errors, inf_items):
    specs, rows = [], []
    for r in HD.ROWS:
        rid = r['id']
        short = rid.split('-', 1)[1]
        hs = _win_segs(r['h'], 'h', errors, rid) if r['h'] else None
        cs = _win_segs(r['c'], 'c', errors, rid) if r['c'] else None
        row = {'id': rid, 'topic': r['topic'], 'status': r['status']}
        hid = cid = None
        if hs:
            pre = (r.get('only_h') or [])[:1] or ([r['hph']] if r.get('hph') else None)
            ph, nth = _pick(HD.H, hs, errors, rid, pre)
            if ph:
                hid = 'HAR-' + short
                sp = {'id': hid, 'topic': r['topic'], 'manual': HD.H, 'ref': r['href'], 'phrase': ph, 'nth': nth,
                      'paraphrase': r.get('says_h') or r['says'], 'ocr_quality': _quality(ph), 'compare_row': rid}
                if len(r.get('only_h') or []) > 1:
                    sp['verbatim2'] = r['only_h'][1]
                sp.update(r.get('hextra') or {})
                if r.get('rate'):
                    sp['rate'] = r['rate']
                specs.append(sp)
        if cs:
            cm = cs[0][0]
            cpre = (r.get('only_c') or [])[:1] or ([r['cph']] if r.get('cph') else None)
            reuse = None
            if not cpre:
                for it in inf_items:
                    if it['manual'] == cm and any(m == cm and a <= it['ocr_line'] <= b for m, a, b in cs):
                        reuse = it['id']
                        break
            if reuse:
                cid = reuse
            else:
                ph, nth = _pick(cm, cs, errors, rid, cpre)
                if ph:
                    cid = 'HCS-' + short
                    sp = {'id': cid, 'topic': r['topic'], 'manual': cm, 'ref': r['cref'], 'phrase': ph, 'nth': nth,
                          'paraphrase': r.get('says_c') or r['says'], 'ocr_quality': _quality(ph), 'compare_row': rid}
                    if len(r.get('only_c') or []) > 1:
                        sp['verbatim2'] = r['only_c'][1]
                    specs.append(sp)
        row['hardee'] = {'manual': HD.H, 'ref': r['href'], 'items': [hid] if hid else [], 'lines': [[a, b] for m, a, b in hs]} if hs else None
        row['casey'] = {'manual': cs[0][0], 'ref': r['cref'], 'items': [cid] if cid else [], 'lines': [[a, b] for m, a, b in cs]} if cs else None
        if hs and cs:
            ht, ct = _txt(hs), _txt(cs)
            ua, ub, na, nb = P.unmatched(ht, ct)
            row['similarity'] = round(P.similarity(ht, ct), 4)
            row['unmatched_content_words'] = {'hardee': len(ua), 'casey': len(ub), 'hardee_tokens': na, 'casey_tokens': nb, 'hardee_words': ua[:10], 'casey_words': ub[:10]}
            if r['status'] == 'identical' and not r.get('calls'):
                if not P.is_identical(P.similarity(ht, ct), ua, ub, na, nb):
                    errors.append('%s: marked identical but similarity %.3f, unmatched %d/%d (of %d/%d): %r %r' % (rid, row['similarity'], len(ua), len(ub), na, nb, ua[:6], ub[:6]))
            if r['status'] == 'differs':
                for ph in r.get('only_h') or []:
                    if T.norm(ph) not in ht or T.norm(ph) in ct:
                        errors.append('%s: only_h phrase not exclusive to Hardee window: %r' % (rid, ph))
                for ph in r.get('only_c') or []:
                    if T.norm(ph) not in ct or T.norm(ph) in ht:
                        errors.append('%s: only_c phrase not exclusive to Casey window: %r' % (rid, ph))
                if not (r.get('only_h') or r.get('only_c')):
                    errors.append('%s: differs without exclusive phrases' % rid)
        else:
            if r['status'] == 'identical' or r['status'] == 'differs':
                errors.append('%s: %s needs both windows' % (rid, r['status']))
        if r.get('calls') and hs and cs:
            row['calls'] = call_table(r['calls'], hs, cs, errors, rid)
        if r.get('only_h'):
            row['only_hardee'] = r['only_h']
        if r.get('only_c'):
            row['only_casey'] = r['only_c']
        if r.get('absent'):
            row['absent'] = r['absent']
            n = sum(len(re.findall(r['absent']['regex'], T.normtext(m)[0], re.I)) for m in r['absent']['manuals'])
            if n > r['absent']['max_count']:
                errors.append('%s: absent regex has %d hits' % (rid, n))
        for k in ('says_h', 'says_c', 'says', 'diff', 'note'):
            if r.get(k):
                row[k] = r[k]
        rows.append(row)
    specs.extend(HD.EXTRA_SPECS)
    specs.extend(HD.CASEY_USE_SPECS)
    return specs, rows


def negative_blocks(errors):
    acq = {i['source_id']: i for i in json.load(open(ACQ, encoding='utf-8'))['items']}
    neg = []
    for nf in HD.NEGATIVE:
        d = dict(nf)
        d['counts'] = {m: len(re.findall(nf['regex'], T.normtext(m)[0], re.I)) for m in nf['texts']}
        if any(v > nf['max_count'] or v < nf.get('min_count', 0) for v in d['counts'].values()):
            errors.append('negative finding fails: %s %r' % (nf['claim'], d['counts']))
        neg.append(d)
    us = {'regex': HD.USAGE_SEARCH['regex'], 'texts': {}}
    for sid, expect in HD.USAGE_SEARCH['texts'].items():
        a = acq[sid]
        hits = glob.glob(os.path.join(T.ROOT, 'tmp', 'library', '*', a['archive_identifier'] + '_djvu.txt'))
        if len(hits) != 1:
            errors.append('usage search: file for %s not found' % sid)
            continue
        txt = ' '.join(open(hits[0], encoding='utf-8', errors='replace').read().split())
        n = len(re.findall(HD.USAGE_SEARCH['regex'], txt, re.I))
        if n != expect:
            errors.append('usage search %s: %d hits, expected %d' % (sid, n, expect))
        us['texts'][sid] = {'file': os.path.relpath(hits[0], T.ROOT).replace(os.sep, '/'), 'sha256': a['sha256'], 'expected_hits': expect, 'hits': n}
    return neg, us


def build_hardee():
    inf_path = os.path.join(OUT, 'drill_infantry.json')
    inf_items = json.load(open(inf_path, encoding='utf-8'))['items'] if os.path.exists(inf_path) else []
    errors = []
    specs, rows = hardee_specs(errors, inf_items)
    neg, us = negative_blocks(errors)
    if errors:
        print('\n'.join(errors))
        return False
    items, e2 = [], []
    for s in specs:
        it = B.resolve(s, e2)
        if it:
            if it['manual'] == HD.H:
                it['witness_a'] = _witness_a(it['verbatim'])
            items.append(it)
    if e2:
        print('\n'.join(e2))
        return False
    ids = [i['id'] for i in items]
    if len(ids) != len(set(ids)):
        print('duplicate ids in Hardee build')
        return False
    wit = sum(1 for i in items if i.get('witness_a'))
    extra = dict(HD.EXTRA_DATA)
    extra['usage_search'] = us
    extra['negative_findings'] = neg
    out = {'_doc': HD.DOC, 'schema_version': 1, 'built_from': 'tools/bt/drill_build.py (specs in drill_data_hardee.py)',
           'sources': B.sources_block({i['manual'] for i in items} | {HD.HA})}
    out.update(extra)
    out['items'] = items
    with open(os.path.join(OUT, 'drill_hardee.json'), 'w', encoding='utf-8') as f:
        json.dump(out, f, indent=1, ensure_ascii=False)
    print('wrote drill_hardee.json', len(items), 'items;', 'Memphis witness for', wit, 'of', sum(1 for i in items if i['manual'] == HD.H), 'Hardee-b items')
    counts = {}
    for r in rows:
        counts[r['status']] = counts.get(r['status'], 0) + 1
    cmp_out = {'_doc': HD.COMPARE_DOC, 'schema_version': 1, 'built_from': 'tools/bt/drill_build.py (rows in drill_data_hardee.py; metrics from drill_paras.py)',
               'sources': B.sources_block({HD.H, HD.HA, HD.C1, HD.C2}),
               'summary': {'rows': len(rows), 'by_status': dict(sorted(counts.items())),
                           'differences': [{'row': r['id'], 'topic': r['topic'], 'diff': r.get('diff')} for r in rows if r['status'] in ('differs', 'absent_hardee', 'absent_casey')],
                           'method': HD.METHOD, 'g19': HD.G19},
               'rows': rows}
    with open(os.path.join(OUT, 'drill_compare.json'), 'w', encoding='utf-8') as f:
        json.dump(cmp_out, f, indent=1, ensure_ascii=False)
    print('wrote drill_compare.json', len(rows), 'rows', counts)
    return True


if __name__ == '__main__':
    sys.exit(0 if build_hardee() else 1)
