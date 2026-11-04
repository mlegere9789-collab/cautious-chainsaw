"""Verify docs/battle-theatre/drill/*.json against the OCR texts.  Exit code 1 on any failure.

Checks (all re-done from the OCR files, nothing trusted from the build):
  * schema of every file and item; unique ids across the three files; allowed enum values
  * every verbatim phrase (and heading_ocr / verbatim2) has < 15 words and occurs in the whitespace-normalised OCR text of the named manual;
    the recorded OCR line equals the line of the nth occurrence
  * printed page and confidence recomputed with drill_text.page_of and compared (items with page_override: the basis line must contain the stated text and precede the passage)
  * EXTRA_HEADS entries in drill_text.py: the substring occurs on the stated OCR line
  * quote limit: no run of 15 consecutive words of any paraphrase occurs in the OCR text of any of the manuals
  * source blocks: sha256 equals acquired.json and the file on disk; FIELDART-1863 is registered in acquired.json
  * cross references (sequences, pdf_claim_checks evidence ids, hardee items) resolve
  * negative findings (e.g. no Parrott / 3-inch rifle) re-counted in the OCR
  * Hardee (drill_hardee.json, drill_compare.json): the same item checks (phrase, line, page, paraphrase quote limit) plus
      - witness_a: the Memphis-copy phrase is found verbatim in HARDEE-1861a at the stated line and is a run of the item phrase;
      - every comparison row: both OCR line windows read from the OCR, letters-only similarity and unmatched content-word counts recomputed and
        compared with the stored values; 'identical' rows must satisfy drill_paras.is_identical; 'differs' rows must carry phrases that occur in
        one window and not in the other; 'absent_*' rows re-count their regular expression in every OCR text of the manual that lacks the item;
        cited items must lie inside the compared window and come from the right manual; the bugle-call tables are matched call by call and in order;
      - negative findings and the usage search over the other downloaded texts are re-counted, file hashes checked against acquired.json;
      - sequences, claim checks and usage evidence resolve to item ids.
"""
import json, os, re, sys, hashlib
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import drill_text as T
import drill_paras as P

D = os.path.join(T.ROOT, 'docs', 'battle-theatre', 'drill')
ACQ = os.path.join(T.ROOT, 'docs', 'battle-theatre', 'GOVERNANCE', 'library', 'acquired.json')
FILES = ['drill_infantry.json', 'drill_artillery.json', 'ordnance_tables.json', 'drill_hardee.json']
CONF = {'high', 'medium', 'inferred', 'low', 'none'}
QUAL = {'clean', 'minor-noise', 'noisy'}
REQ = ['id', 'topic', 'manual', 'ref', 'verbatim', 'paraphrase', 'ocr_line', 'ocr_occurrences', 'printed_page', 'page_confidence', 'page_header_ocr_line', 'page_header_text', 'tier', 'ocr_quality']
errs = []
warn = []


def err(m):
    errs.append(m)


def sha256(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for b in iter(lambda: f.read(1 << 20), b''):
            h.update(b)
    return h.hexdigest()


def main():
    acq = {i['source_id']: i for i in json.load(open(ACQ, encoding='utf-8'))['items']}
    if 'FIELDART-1863' not in acq:
        err('acquired.json lacks FIELDART-1863')
    ids_all = {}
    data = {}
    for fn in FILES:
        p = os.path.join(D, fn)
        if not os.path.exists(p):
            err('missing file ' + fn)
            continue
        d = json.load(open(p, encoding='utf-8'))
        data[fn] = d
        for k in ('_doc', 'schema_version', 'sources', 'items'):
            if k not in d:
                err('%s: missing top-level key %s' % (fn, k))
        # sources
        for m, s in d.get('sources', {}).items():
            if m not in T.MANUALS:
                err('%s: unknown source %s' % (fn, m))
                continue
            f = os.path.join(T.LIB, T.MANUALS[m]['file'])
            if not os.path.exists(f):
                err('%s: OCR file missing for %s' % (fn, m))
                continue
            a = acq.get(m)
            if not a:
                err('%s: %s not in acquired.json' % (fn, m))
            else:
                if s.get('sha256') != a.get('sha256'):
                    err('%s: %s sha256 differs from acquired.json' % (fn, m))
                if sha256(f) != a.get('sha256'):
                    err('%s: OCR file on disk for %s does not match acquired.json sha256' % (fn, m))
        for it in d.get('items', []):
            iid = it.get('id', '?')
            for k in REQ:
                if k not in it:
                    err('%s %s: missing field %s' % (fn, iid, k))
            if iid in ids_all:
                err('duplicate id %s (%s and %s)' % (iid, ids_all[iid], fn))
            ids_all[iid] = fn
            if it.get('manual') not in T.MANUALS:
                err('%s %s: unknown manual' % (fn, iid))
                continue
            m = it['manual']
            if it.get('manual') not in d.get('sources', {}):
                err('%s %s: manual %s not in sources block' % (fn, iid, m))
            if it.get('page_confidence') not in CONF:
                err('%s %s: bad page_confidence %r' % (fn, iid, it.get('page_confidence')))
            if it.get('ocr_quality') not in QUAL:
                err('%s %s: bad ocr_quality %r' % (fn, iid, it.get('ocr_quality')))
            v = it.get('verbatim', '')
            if len(v.split()) >= 15:
                err('%s %s: verbatim has %d words (>=15)' % (fn, iid, len(v.split())))
            occ = T.locate(m, v)
            if not occ:
                err('%s %s: verbatim NOT FOUND in %s' % (fn, iid, m))
                continue
            nth = it.get('nth', 0)
            if nth >= len(occ) or occ[nth][0] != it.get('ocr_line'):
                err('%s %s: ocr_line %s != line of occurrence #%d (%s)' % (fn, iid, it.get('ocr_line'), nth, occ[nth][0] if nth < len(occ) else None))
            if it.get('ocr_occurrences') != len(occ):
                err('%s %s: occurrence count changed (%s vs %s)' % (fn, iid, it.get('ocr_occurrences'), len(occ)))
            for k in ('heading_ocr', 'verbatim2'):
                if k in it:
                    if len(it[k].split()) >= 15:
                        err('%s %s: %s has >=15 words' % (fn, iid, k))
                    if not T.locate(m, it[k]):
                        err('%s %s: %s NOT FOUND in %s' % (fn, iid, k, m))
            # page
            if 'machine_page' in it:
                bl = it.get('page_header_ocr_line')
                txt = ' '.join(T.raw(m)[bl - 1].split()) if bl else ''
                if it.get('page_header_text', '') not in txt:
                    err('%s %s: page_override basis text %r not on OCR line %s' % (fn, iid, it.get('page_header_text'), bl))
                rel = it.get('page_override_basis_relation', 'preceding')
                if rel == 'preceding' and bl and bl > it['ocr_line']:
                    err('%s %s: page_override basis line (preceding head) follows the passage' % (fn, iid))
                if rel == 'following' and bl and bl < it['ocr_line']:
                    err('%s %s: page_override basis line (following head) precedes the passage' % (fn, iid))
                if not it.get('page_override_why'):
                    err('%s %s: page_override without reason' % (fn, iid))
            else:
                pg, conf, hl, ht = T.page_of(m, it['ocr_line'])
                if (pg, conf, hl) != (it.get('printed_page'), it.get('page_confidence'), it.get('page_header_ocr_line')):
                    err('%s %s: page recompute %r != recorded %r' % (fn, iid, (pg, conf, hl), (it.get('printed_page'), it.get('page_confidence'), it.get('page_header_ocr_line'))))
            if it.get('printed_page') is None:
                err('%s %s: no printed page recovered' % (fn, iid))
            para = it.get('paraphrase', '')
            if len(para) < 20 or norm_eq(para, v):
                err('%s %s: paraphrase missing or equals verbatim' % (fn, iid))
            # quote limit on paraphrase: no 15-word run from any OCR text
            ws = para.split()
            for i in range(0, max(0, len(ws) - 14)):
                chunk = ' '.join(ws[i:i + 15])
                for mm in T.MANUALS:
                    if chunk in T.normtext(mm)[0]:
                        err('%s %s: paraphrase contains a 15-word run from %s: %r' % (fn, iid, mm, chunk))
                        break
    # EXTRA_HEADS
    for m, lst in T.EXTRA_HEADS.items():
        for (ln, pg, sub) in lst:
            txt = ' '.join(T.raw(m)[ln - 1].split())
            if sub and sub not in txt:
                err('EXTRA_HEADS %s line %d: %r not on line (%r)' % (m, ln, sub, txt))
    # cross references
    def known(i):
        return i in ids_all
    inf = data.get('drill_infantry.json', {})
    for name, seq in (inf.get('sequences') or {}).items():
        for i in seq.get('order', []):
            if not known(i):
                err('infantry sequence %s: unknown id %s' % (name, i))
    for c in inf.get('pdf_claim_checks', []):
        for i in c.get('evidence', []):
            if not known(i):
                err('infantry pdf_claim_checks: unknown id %s' % i)
    for i in (inf.get('hardee_vs_casey', {}).get('what_casey_itself_says', {}).get('items', [])):
        if not known(i):
            err('hardee item %s unknown' % i)
    hardee_acquired = any('hardee' in k.lower() for k in acq)
    if inf.get('hardee_vs_casey', {}).get('hardee_text_found') is not hardee_acquired:
        err('hardee_text_found must equal whether a Hardee text is in acquired.json (%s)' % hardee_acquired)
    if hardee_acquired:
        for fn_ in ('drill_hardee.json', 'drill_compare.json'):
            if not os.path.exists(os.path.join(D, fn_)):
                err('Hardee text is acquired but %s is missing: re-run the Hardee-vs-Casey comparison' % fn_)
        if not os.path.exists(os.path.join(D, 'DRILL-HARDEE-NOTES.md')):
            err('DRILL-HARDEE-NOTES.md missing')
        for sid in ('HARDEE-1861a', 'HARDEE-1861b'):
            if sid not in acq:
                err('acquired.json lacks %s' % sid)
    art = data.get('drill_artillery.json', {})
    for role, r in (art.get('detachment_summary', {}).get('roles', {})).items():
        for i in r.get('items', []):
            if not known(i):
                err('artillery role %s: unknown id %s' % (role, i))
    for i in art.get('loading_sequence', {}).get('order', []) + art.get('ammunition_differences', {}).get('items', []):
        if not known(i):
            err('artillery sequence/diff: unknown id %s' % i)
    for c in art.get('pdf_claim_checks', []):
        for i in c.get('evidence', []):
            if not known(i):
                err('artillery pdf_claim_checks: unknown id %s' % i)
        for fn, lst in (c.get('evidence_other_file') or {}).items():
            for i in lst:
                if ids_all.get(i) != fn:
                    err('artillery pdf_claim_checks: %s not in %s' % (i, fn))
    od = data.get('ordnance_tables.json', {})
    for c in od.get('compare_with_pdf_B_6_14_1', []):
        for i in c.get('items', []):
            if not known(i):
                err('ordnance compare: unknown id %s' % i)
    # negative findings
    for nf in od.get('negative_findings', []):
        n = len(re.findall(nf['regex'], '\n'.join(T.raw(nf['manual']))))
        if n > nf['max_count']:
            err('negative finding failed: %s in %s -> %d hits (max %d)' % (nf['claim'], nf['manual'], n, nf['max_count']))
    if not os.path.exists(os.path.join(D, 'DRILL-NOTES.md')):
        err('DRILL-NOTES.md missing')
    items_by_id = {it['id']: it for d_ in data.values() for it in d_.get('items', [])}
    cmp_counts = {}
    if 'drill_hardee.json' in data:
        check_hardee_file(data['drill_hardee.json'], ids_all, items_by_id, acq)
    cp = os.path.join(D, 'drill_compare.json')
    if os.path.exists(cp):
        cmpd = json.load(open(cp, encoding='utf-8'))
        for k in ('_doc', 'schema_version', 'sources', 'rows', 'summary'):
            if k not in cmpd:
                err('drill_compare.json: missing top-level key %s' % k)
        for m, sblk in cmpd.get('sources', {}).items():
            a_ = acq.get(m)
            if not a_ or sblk.get('sha256') != a_.get('sha256'):
                err('drill_compare.json: %s sha256 differs from acquired.json' % m)
        cmp_counts = check_compare(cmpd, ids_all, items_by_id)
    elif 'drill_hardee.json' in data:
        err('drill_compare.json missing')
    # summary
    tot = 0
    for fn, d in data.items():
        c = {}
        for it in d.get('items', []):
            c[it.get('page_confidence')] = c.get(it.get('page_confidence'), 0) + 1
        tot += len(d.get('items', []))
        print('%-22s %3d items; page confidence %s' % (fn, len(d.get('items', [])), dict(sorted(c.items()))))
    if cmp_counts:
        print('%-22s %3d rows;  %s' % ('drill_compare.json', sum(cmp_counts.values()), dict(sorted(cmp_counts.items()))))
    for w in warn:
        print('WARN', w)
    if errs:
        print('\nFAILED: %d problem(s)' % len(errs))
        for e in errs[:80]:
            print(' -', e)
        return 1
    print('\nOK: %d items and %d comparison rows; all verbatim phrases verified in the OCR text, pages re-derived, comparison windows / similarity / absence re-counted, references resolve.' % (tot, sum(cmp_counts.values())))
    return 0


# ======================================================================================= Hardee / comparison checks
STATUS = {'identical', 'differs', 'absent_hardee', 'absent_casey', 'unsettled'}
H_B, H_A = 'HARDEE-1861b', 'HARDEE-1861a'


def check_hardee_file(hd, ids_all, items_by_id, acq):
    """Extra checks on drill_hardee.json beyond the generic item checks."""
    def known(i, what):
        if i not in ids_all:
            err('drill_hardee.json %s: unknown id %s' % (what, i))
    for it in hd.get('items', []):
        wa = it.get('witness_a', 'absent')
        if it.get('manual') == H_B:
            if wa == 'absent':
                err('drill_hardee.json %s: witness_a missing (None allowed, absence of the key not)' % it['id'])
            elif wa is not None:
                v = wa.get('verbatim', '')
                nw = len(v.split())
                if not (5 <= nw < 15):
                    err('%s: witness_a has %d words' % (it['id'], nw))
                occ = T.locate(H_A, v)
                if not occ:
                    err('%s: witness_a phrase NOT FOUND in %s' % (it['id'], H_A))
                else:
                    if occ[0][0] != wa.get('ocr_line') or len(occ) != wa.get('ocr_occurrences'):
                        err('%s: witness_a line/occurrence mismatch (%s/%s vs %s/%s)' % (it['id'], wa.get('ocr_line'), wa.get('ocr_occurrences'), occ[0][0], len(occ)))
                if T.norm(v) not in T.norm(it['verbatim']):
                    err('%s: witness_a is not a run of the item phrase' % it['id'])
        elif wa != 'absent':
            err('%s: witness_a on a non-Hardee-b item' % it['id'])
    for name, seq in (hd.get('sequences') or {}).items():
        lst = seq.get('order') if isinstance(seq, dict) and 'order' in seq else None
        if lst is not None:
            for i in lst:
                known(i, 'sequence ' + name)
        elif isinstance(seq, dict):
            for k, v in seq.items():
                for i in (v if isinstance(v, list) else []):
                    known(i, 'sequence fires ' + k)
    for c in hd.get('pdf_claim_checks', []):
        for i in c.get('evidence', []):
            known(i, 'pdf_claim_checks')
    for k, v in (hd.get('rate_misfire_cartridge_range') or {}).items():
        if isinstance(v, dict):
            for i in v.get('items', []):
                known(i, 'rate_misfire_cartridge_range ' + k)
    for k, v in (hd.get('bugle_and_drum_calls') or {}).items():
        if isinstance(v, dict):
            for i in v.get('items', []):
                known(i, 'bugle_and_drum_calls ' + k)
    for i in (hd.get('skirmisher_instruction') or {}).get('items', []):
        known(i, 'skirmisher_instruction')
    for side in ('union', 'confederate'):
        u = (hd.get('usage_1863') or {}).get(side)
        if not u:
            err('usage_1863.%s missing' % side)
            continue
        for i in u.get('evidence', []):
            known(i, 'usage_1863 ' + side)
        if not u.get('verdict'):
            err('usage_1863.%s without verdict' % side)
    # negative findings re-counted
    for nf in hd.get('negative_findings', []):
        for m in nf['texts']:
            n = len(re.findall(nf['regex'], T.normtext(m)[0], re.I))
            if n > nf['max_count'] or n < nf.get('min_count', 0):
                err('Hardee negative finding failed: %s in %s -> %d hits (max %d)' % (nf['claim'], m, n, nf['max_count']))
            if nf.get('counts', {}).get(m) != n:
                err('Hardee negative finding count changed: %s in %s: stored %s, now %d' % (nf['claim'][:50], m, nf.get('counts', {}).get(m), n))
    # usage search over the other downloaded texts: file hash against acquired.json, hit counts re-done
    us = hd.get('usage_search') or {}
    if not us.get('texts'):
        err('usage_search missing')
    for sid, t in (us.get('texts') or {}).items():
        a = acq.get(sid)
        path = os.path.join(T.ROOT, t.get('file', ''))
        if not a or not os.path.exists(path):
            err('usage_search %s: source or file missing' % sid)
            continue
        if sha256(path) != a['sha256'] or t.get('sha256') != a['sha256']:
            err('usage_search %s: sha256 mismatch against acquired.json' % sid)
        n = len(re.findall(us['regex'], ' '.join(open(path, encoding='utf-8', errors='replace').read().split()), re.I))
        if n != t.get('hits') or n != t.get('expected_hits'):
            err('usage_search %s: %d hits now, stored hits %s, expected %s' % (sid, n, t.get('hits'), t.get('expected_hits')))


def _side_text(side, who):
    if not side:
        return ''
    return ' '.join(P.span_text(side['manual'], a, b) for a, b in side['lines'])


def check_compare(cmpd, ids_all, items_by_id):
    rows = cmpd.get('rows', [])
    seen = set()
    counts = {}
    n_calls = 0
    for r in rows:
        rid = r.get('id', '?')
        if rid in seen or rid in ids_all:
            err('compare: duplicate row id %s' % rid)
        seen.add(rid)
        st = r.get('status')
        if st not in STATUS:
            err('%s: bad status %r' % (rid, st))
            continue
        counts[st] = counts.get(st, 0) + 1
        sides = {}
        for who, fam in (('hardee', (H_B,)), ('casey', ('CASEY-1862-1', 'CASEY-1862-2'))):
            sd = r.get(who)
            if sd is None:
                continue
            if sd.get('manual') not in fam:
                err('%s: %s side has manual %r' % (rid, who, sd.get('manual')))
                continue
            nraw = len(T.raw(sd['manual']))
            ok = bool(sd.get('lines'))
            for a, b in sd.get('lines', []):
                if not (isinstance(a, int) and isinstance(b, int) and 1 <= a <= b <= nraw):
                    err('%s: %s window %r outside the OCR file' % (rid, who, (a, b)))
                    ok = False
            if not ok:
                continue
            sides[who] = sd
            if not sd.get('items'):
                err('%s: %s side cites no item' % (rid, who))
            for i in sd.get('items', []):
                it = items_by_id.get(i)
                if not it:
                    err('%s: %s item %s unknown' % (rid, who, i))
                elif it['manual'] != sd['manual']:
                    err('%s: %s item %s is from %s, not %s' % (rid, who, i, it['manual'], sd['manual']))
                elif not any(a <= it['ocr_line'] <= b for a, b in sd['lines']):
                    err('%s: %s item %s (line %s) lies outside the compared window' % (rid, who, i, it['ocr_line']))
        if st in ('identical', 'differs', 'unsettled') and set(sides) != {'hardee', 'casey'}:
            err('%s: %s needs both sides' % (rid, st))
        if st == 'absent_hardee' and (r.get('hardee') is not None or 'casey' not in sides):
            err('%s: absent_hardee must have a Casey side and no Hardee side' % rid)
        if st == 'absent_casey' and (r.get('casey') is not None or 'hardee' not in sides):
            err('%s: absent_casey must have a Hardee side and no Casey side' % rid)
        ht, ct = _side_text(sides.get('hardee'), 'hardee'), _side_text(sides.get('casey'), 'casey')
        if ht and ct:
            sim = round(P.similarity(ht, ct), 4)
            ua, ub, na, nb = P.unmatched(ht, ct)
            um = r.get('unmatched_content_words') or {}
            if abs(sim - r.get('similarity', -1)) > 0.0005:
                err('%s: similarity recomputed %.4f != stored %s' % (rid, sim, r.get('similarity')))
            if (len(ua), len(ub), na, nb) != (um.get('hardee'), um.get('casey'), um.get('hardee_tokens'), um.get('casey_tokens')):
                err('%s: unmatched-word counts recomputed %r != stored %r' % (rid, (len(ua), len(ub), na, nb), (um.get('hardee'), um.get('casey'), um.get('hardee_tokens'), um.get('casey_tokens'))))
            if st == 'identical' and not r.get('calls') and not P.is_identical(P.similarity(ht, ct), ua, ub, na, nb):
                err('%s: marked identical but similarity %.3f / unmatched %d,%d of %d,%d fail the rule' % (rid, sim, len(ua), len(ub), na, nb))
            if st == 'differs' and not (r.get('only_hardee') or r.get('only_casey')):
                err('%s: differs without exclusive phrases' % rid)
        for key_, own, other in (('only_hardee', ht, ct), ('only_casey', ct, ht)):
            for ph in r.get(key_) or []:
                if len(ph.split()) >= 15:
                    err('%s: %s phrase has >= 15 words' % (rid, key_))
                if T.norm(ph) not in own:
                    err('%s: %s phrase NOT in its own window: %r' % (rid, key_, ph))
                if T.norm(ph) in other:
                    err('%s: %s phrase also occurs in the other window: %r' % (rid, key_, ph))
        ab = r.get('absent')
        if st.startswith('absent'):
            if not ab:
                err('%s: absent status without absent block' % rid)
            else:
                side_absent = 'hardee' if st == 'absent_hardee' else 'casey'
                if ab.get('side') != side_absent:
                    err('%s: absent.side %r != %s' % (rid, ab.get('side'), side_absent))
                tot = sum(len(re.findall(ab['regex'], T.normtext(m)[0], re.I)) for m in ab['manuals'])
                if tot > ab['max_count']:
                    err('%s: absent regex %r has %d hits in %s' % (rid, ab['regex'], tot, ab['manuals']))
                if side_absent == 'hardee' and not set(ab['manuals']) >= {H_B, H_A}:
                    err('%s: absence must be checked in both Hardee printings' % rid)
                if not (r.get('only_casey') or r.get('only_hardee')) and not any(items_by_id.get(i, {}).get('verbatim') for s in sides.values() for i in s.get('items', [])):
                    err('%s: no cited phrase on the present side' % rid)
        elif ab:
            if sum(len(re.findall(ab['regex'], T.normtext(m)[0], re.I)) for m in ab['manuals']) > ab['max_count']:
                err('%s: absent regex has hits' % rid)
        if r.get('calls'):
            ph_, pc_ = -1, -1
            for e in r['calls']:
                mc = re.search(e['casey_regex'], ct) if ct else None
                if not mc or mc.start() <= pc_:
                    err('%s: Casey call %s %r missing or out of order' % (rid, e.get('casey_no'), e.get('name')))
                else:
                    pc_ = mc.start()
                if e.get('hardee_regex'):
                    mh = re.search(e['hardee_regex'], ht) if ht else None
                    if not mh or mh.start() <= ph_:
                        err('%s: Hardee call %r missing or out of order' % (rid, e.get('name')))
                    else:
                        ph_ = mh.start()
                elif e.get('hardee_reading') == 'legible (damaged OCR)':
                    err('%s: call %r marked legible without a regex' % (rid, e.get('name')))
                n_calls += 1
        for k in ('says',):
            pass
    # summary recount
    sm = cmpd.get('summary', {})
    if sm.get('rows') != len(rows) or sm.get('by_status') != dict(sorted(counts.items())):
        err('compare summary does not match the rows (stored %r / %r, recounted %d / %r)' % (sm.get('rows'), sm.get('by_status'), len(rows), dict(sorted(counts.items()))))
    return counts


def norm_eq(a, b):
    return T.norm(a).lower() == T.norm(b).lower()


if __name__ == '__main__':
    sys.exit(main())
