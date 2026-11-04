"""Build docs/battle-theatre/history/positions/positions_<SCOPE>.jsonl from authored claim modules (tools/bt/positions_<SCOPE>/*.py).

Each module defines CLAIMS = [C(...), ...]. Every claim names its source record and an ANCHOR (the quote, or a longer exact snippet of the
OCR text). The anchor is located BY CODE inside that record's span; the printed page (or the interpolated range) is computed from the
index, so a claim cannot cite a page it was not found on. A quote (< 15 words) must occur verbatim in the record. A claim whose anchor or
quote is not found aborts the build. Open-gap claims carry the searches tried and no source passage.

    PYTHONIOENCODING=utf-8 python -I tools/bt/positions_build.py D
"""
import os, re, sys, json, bisect, importlib.util, glob, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import or27_find as F
from or27_lib import ROOT, INDEX_PATH, utf8_stdout, norm_query
utf8_stdout()
OUTDIR = os.path.join(ROOT, 'docs', 'battle-theatre', 'history', 'positions')
IDX = {r['id']: r for r in json.load(open(INDEX_PATH, encoding='utf-8'))['records']}
UNITS = {u['id']: u for u in json.load(open(os.path.join(ROOT, 'docs', 'battle-theatre', 'history', 'units.json'), encoding='utf-8'))['units']}
KINDS = {'arrival_road', 'march', 'position', 'engagement', 'movement', 'night_position', 'departure', 'strength_note'}
TIERS = {'documented', 'inferred', 'open gap'}
# index record id -> clean author string where the index author is OCR-garbled
AUTHOR_FIX = {
    'OR27-2-R467': 'Lieut. Gen. Richard S. Ewell',
}


_OVP = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'positions_D_overrides.json')
OVR = json.load(open(_OVP, encoding='utf-8')) if os.path.exists(_OVP) else {}
# full-passage fidelity re-check (2026-10): per-claim repairs applied after extraction; see RECHECK_D_NOTES.md
_RKP = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'positions_D_recheck.json')
RCK = json.load(open(_RKP, encoding='utf-8')) if os.path.exists(_RKP) else {}
FC_OK = ('passed_full_read', 'corrected')


DATE_RX = re.compile(r"\b(?:(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+)?(?:July|June)\s*[\dIlJG.]{1,3}\b(?:,?\s*18\S{2})?"
                     r"|\bthe\s+[\dIlJG]{1,2}(?:st|d|nd|rd|th)\b(?:\s+(?:instant|ultimo))?"
                     r"|\b(?:the\s+)?(?:next|following|same|previous|preceding)\s+(?:day|night|morning|evening|afternoon)\b"
                     r"|\b(?:that|this)\s+(?:day|night|morning|evening|afternoon)\b"
                     r"|\b(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b", re.I)


def rid(r):
    if r is None:
        return None
    if re.fullmatch(r'R\d+', r):
        return 'OR27-2-' + r
    if re.fullmatch(r'P1R\d+', r):
        return 'OR27-1-R%03d' % int(r[3:])
    return r


class Claim(dict):
    pass


def C(u, k, rec=None, a=None, q=None, w=None, d=None, t=None, ap=False, pl=None, gz=None, rd=None, act='', tier='documented',
      cf=None, note='', ocr=False, sub=None, nth=0, tried=None, inf=None):
    return Claim(u=u, k=k, rec=rid(rec), a=a, q=q, w=w, d=d, t=t, ap=ap, pl=pl, gz=gz, rd=rd, act=act, tier=tier, cf=cf, note=note,
                 ocr=ocr, sub=sub, nth=nth, tried=tried, inf=inf)


def find_in_record(recid, snippet, nth=0):
    r = IDX[recid]
    P = F.get_part(r['part'])
    a = bisect.bisect_left(P.nmap, r['start_offset'])
    b = bisect.bisect_left(P.nmap, r['end_offset'])
    seg = P.ntext[a:b]
    sn = norm_query(snippet)
    pos = -1
    for _ in range(nth + 1):
        pos = seg.find(sn, pos + 1)
        if pos < 0:
            return None
    s, e = a + pos, a + pos + len(sn)
    os_, oe = P.orig_span(s, e)
    return P, os_, oe, P.cite(os_, oe), seg.count(sn), s, e, a, b


def _hint(recid, snippet):
    """closest text in the record: locate by the first or last three words and show the real characters."""
    r = IDX[recid]
    P = F.get_part(r['part'])
    a = bisect.bisect_left(P.nmap, r['start_offset'])
    b = bisect.bisect_left(P.nmap, r['end_offset'])
    seg = P.ntext[a:b]
    words = norm_query(snippet).split(' ')
    out = []
    for k in (words[:3], words[-3:], words[len(words) // 2:len(words) // 2 + 3]):
        key = ' '.join(k)
        i = seg.find(key)
        if i >= 0:
            out.append(chr(10) + '        REAL: ' + repr(seg[max(0, i - 10):i + len(snippet) + 25]))
            break
    return ''.join(out)


def build(scope):
    mods = sorted(glob.glob(os.path.join(ROOT, 'tools', 'bt', 'positions_%s' % scope, '*.py')))
    claims = []
    for m in mods:
        spec = importlib.util.spec_from_file_location('pm_' + os.path.basename(m)[:-3], m)
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        for c in mod.CLAIMS:
            c['_mod'] = os.path.basename(m)
            claims.append(c)
    errors = []
    perunit = collections.Counter()
    out = []
    meta = collections.OrderedDict()
    win = {}
    pgr = {}
    IDXA = {}
    IDXB = {}
    byfam = collections.defaultdict(list)
    for c in claims:
        u = c['u']
        if u not in UNITS:
            errors.append('%s: unknown unit %s' % (c['_mod'], u))
            continue
        if c['k'] not in KINDS:
            errors.append('bad kind %s' % c['k'])
        if c['tier'] not in TIERS:
            errors.append('bad tier %s' % c['tier'])
        perunit[u] += 1
        cid = 'PD-%s-%02d' % (u.replace('cs-', ''), perunit[u])
        ov = OVR.get(cid)
        if ov:
            for k_, f_ in (('q', 'q'), ('w', 'w'), ('act', 'act'), ('ocr', 'ocr'), ('t', 't'), ('ap', 'ap'), ('note', 'note')):
                if k_ in ov:
                    c[f_] = ov[k_]
        src = {'report_id': c['rec'], 'author': None, 'printed_page': None, 'interpolated': False, 'quote': None}
        ocr = c['ocr']
        if c['tier'] == 'open gap':
            if not c['tried'] or len(c['tried']) < 3:
                errors.append('%s: open gap needs >= 3 searches tried' % cid)
        else:
            if not c['rec'] or c['rec'] not in IDX:
                errors.append('%s: bad record %s' % (cid, c['rec']))
                continue
            snippet = c['a'] or c['q']
            if not snippet:
                errors.append('%s: no anchor/quote' % cid)
                continue
            got = find_in_record(c['rec'], snippet, c['nth'])
            if not got:
                errors.append('%s: anchor not found in %s: %r%s' % (cid, c['rec'], snippet[:80], _hint(c['rec'], snippet)))
                continue
            P, os_, oe, cite, cnt, ns_, ne_, ra_, rb_ = got
            r = IDX[c['rec']]
            src['author'] = AUTHOR_FIX.get(c['rec']) or ((r.get('rank') or '') + ' ' + (r.get('author') or r.get('toc_text') or '')).strip()
            if r['part'] == 3:
                src['author'] = '%s -> %s' % (r.get('header_raw') or '', r.get('addressee') or '?')
                src['document_date_raw'] = r.get('date_raw')
            pa = P.pm.page_at(os_)
            pb = P.pm.page_at(max(os_, oe - 1))
            itp = not (pa['conf'].startswith(('head', 'front')) and pb['conf'].startswith(('head', 'front')))
            if itp:
                lo, hi = min(pa['lo'], pb['lo']), max(pa['hi'], pb['hi'])
                src['printed_page'] = '%s-%s' % (lo, hi) if lo != hi else str(lo)
                src['page_estimate'] = str(pa['page']) if pa['page'] == pb['page'] else '%s-%s' % (pa['page'], pb['page'])
            else:
                src['printed_page'] = str(pa['page']) if pa['page'] == pb['page'] else '%s-%s' % (pa['page'], pb['page'])
            src['interpolated'] = itp
            src['record_ocr_grade'] = r['ocr']['grade']
            if r['ocr']['grade'] == 'poor':
                ocr = True
            if c['q']:
                if len(c['q'].split()) >= 15:
                    errors.append('%s: quote >= 15 words' % cid)
                if not find_in_record(c['rec'], c['q']):
                    errors.append('%s: quote not in record' % cid)
                elif not F.verify(c['q'], (r['part'],)):
                    errors.append('%s: quote fails or27_find.verify' % cid)
                src['quote'] = c['q']
            if ov and ov.get('q2'):
                src['additional_quotes'] = []
                for q2_ in ov['q2']:
                    if len(q2_.split()) >= 15:
                        errors.append('%s: additional quote >= 15 words' % cid)
                    elif not find_in_record(c['rec'], q2_):
                        errors.append('%s: additional quote not in record: %r' % (cid, q2_))
                    elif not F.verify(q2_, (r['part'],)):
                        errors.append('%s: additional quote fails or27_find.verify' % cid)
                    else:
                        src['additional_quotes'].append(q2_)
            meta[cid] = (c['rec'], os_, oe, norm_query(snippet), bool(c['q']))
            IDXA[cid] = ra_; IDXB[cid] = rb_
            pgr[cid] = (min(pa['page'], pb['page']), max(pa['page'], pb['page']))
            win[cid] = (P, max(ra_, ns_ - 450), min(rb_, ne_ + 450), ns_, ne_)
        t_iso = None
        if c['t']:
            if not c['d']:
                errors.append('%s: clock without date' % cid)
            t_iso = '1863-%sT%s' % (c['d'], c['t'])
        when = {'printed': c['w'], 'date': ('1863-' + c['d']) if c['d'] else None, 't_iso': t_iso, 'approx': bool(c['ap'])}
        tier = c['tier']
        o = collections.OrderedDict()
        o['claim_id'] = cid
        o['unit_id'] = u
        if c['sub']:
            o['sub_unit_printed'] = c['sub']
        o['kind'] = c['k']
        o['when'] = when
        o['place'] = {'printed': c['pl'], 'gazetteer_ref': c['gz'], 'direction_or_road': c['rd']}
        o['activity'] = c['act']
        o['source'] = src
        o['tier'] = tier
        if tier == 'inferred':
            o['inference'] = c['inf'] or ''
            if not (c['inf'] or '').strip():
                errors.append('%s: inferred needs inf' % cid)
        if tier == 'open gap':
            o['searches_tried'] = c['tried']
        o['weak_source'] = False
        o['claim_support_verified'] = bool(tier == 'documented')
        o['ocr_uncertain'] = bool(ocr)
        o['conflicts_with'] = []
        o['note'] = c['note']
        o['_cf'] = c['cf']
        o['_mod'] = c['_mod']
        o['_fc'] = c.get('fc')
        out.append(o)
        if c['cf']:
            byfam[re.sub(r'\s*C-\d{3}', '', c['cf']).strip()].append(cid)
    # one verbatim quote (< 15 words) per source passage: explicit quotes first, then anchors that qualify and do not sit within 600
    # original characters of a quote already used in the same record
    used = collections.defaultdict(list)
    for cid, (rec, a_, b_, snip, expl) in meta.items():
        if expl:
            used[rec].append((a_, b_))
    byid = {o['claim_id']: o for o in out}
    for cid, (rec, a_, b_, snip, expl) in meta.items():
        if expl:
            continue
        nw = len(snip.split())
        if 4 <= nw < 15 and not any(abs(a_ - x) < 600 or abs(b_ - y) < 600 for x, y in used[rec]):
            byid[cid]['source']['quote'] = snip
            byid[cid]['source']['quote_basis'] = 'anchor snippet, verified present in the record by code'
            used[rec].append((a_, b_))
    # every documented claim carries a short verbatim extract of its own anchor (<= 14 words), chosen by code from the anchor and re-verified
    import positions_quotes as Q
    for o in out:
        cid = o['claim_id']
        if o['tier'] != 'documented' or o['source'].get('quote') or cid not in meta:
            continue
        rec, a_, b_, snip, expl = meta[cid]
        ct = ' '.join([o['activity'] or '', o['when']['printed'] or '', o['place']['printed'] or ''])
        qs, nw, whole = Q.choose(snip, ct, need_digit=bool(o['when']['t_iso']), when_text=o['when']['printed'] or '')
        digs = Q.need_digits(o['when']['printed'])
        if digs and not Q.has_digits(qs, digs):
            P_, wa_, wb_, wns_, wne_ = win[cid]
            wa_ = max(wa_ - 900, IDXA[cid]); wb_ = min(wb_ + 900, IDXB[cid])
            bw = Q.choose_wide(P_.ntext[wa_:wb_], ct, o['when']['printed'] or '', digs)
            if bw and bw[0] >= 4:
                i0 = P_.ntext.find(bw[1], wa_, wb_)
                p0 = P_.pm.page_at(P_.nmap[i0])['page']
                p1 = P_.pm.page_at(P_.nmap[i0 + len(bw[1]) - 1])['page']
                lo_, hi_ = pgr[cid]
                lead_ = Q.toks(o['activity'][:220])
                if lo_ <= p0 <= hi_ and lo_ <= p1 <= hi_ and len(lead_ & Q.toks(bw[1])) >= max(3, len(lead_ & Q.toks(qs))):
                    qs, nw, whole = bw[1], len(bw[1].split()), False
        if nw < 15 and find_in_record(rec, qs) and F.verify(qs, (IDX[rec]['part'],)):
            o['source']['quote'] = qs
            o['source']['quote_basis'] = 'the anchor snippet of this claim, verified present in the record by code' if whole else 'window of the anchor snippet chosen by code (overlap with the claim), verified present in the record by code'
        else:
            errors.append('%s: no verifiable quote from anchor' % cid)
    # time-bearing additional extract: where the claim's clock hour is not in its quote, find a short verbatim extract with that hour next to the
    # anchor (same page range) and carry it as an additional quote
    for o in out:
        cid = o['claim_id']
        if o['tier'] != 'documented' or cid not in meta:
            continue
        digs = Q.need_digits(o['when']['printed'])
        allq = [o['source'].get('quote') or ''] + o['source'].get('additional_quotes', [])
        if not digs or any(Q.has_digits(x, digs) for x in allq):
            continue
        P_, wa_, wb_, wns_, wne_ = win[cid]
        wa_ = max(wa_ - 900, IDXA[cid]); wb_ = min(wb_ + 900, IDXB[cid])
        ct = ' '.join([o['activity'] or '', o['when']['printed'] or ''])
        bw = Q.choose_wide(P_.ntext[wa_:wb_], ct, o['when']['printed'] or '', digs)
        if bw:
            i0 = P_.ntext.find(bw[1], wa_, wb_)
            p0 = P_.pm.page_at(P_.nmap[i0])['page']
            p1 = P_.pm.page_at(P_.nmap[i0 + len(bw[1]) - 1])['page']
            lo_, hi_ = pgr[cid]
            if lo_ <= p0 <= hi_ and lo_ <= p1 <= hi_ and len(bw[1].split()) < 15 and F.verify(bw[1], (IDX[meta[cid][0]]['part'],)):
                o['source'].setdefault('additional_quotes', []).append(bw[1])
                o['source']['additional_quotes_basis'] = 'window with the clock hour, chosen by code near the anchor; verified present in the record by code'
    # verbatim time / place phrases from the text window (the authors' descriptive strings are kept as `description`)
    import positions_extract as X
    for o in out:
        cid = o['claim_id']
        w_desc = o['when']['printed']
        pl_desc = o['place']['printed']
        if cid in win:
            P, a_, b_, ns_, ne_ = win[cid]
            seg = P.ntext[a_:b_]
            rs_, re2_ = ns_ - a_, ne_ - a_
            tt = (o['when']['t_iso'] or '')[11:16] or None
            wbasis = None
            wp = X.extract_when(seg, rs_, re2_, w_desc, tt)
            # prefer the clock phrase inside the claim's own extracts
            own = [o['source'].get('quote') or ''] + o['source'].get('additional_quotes', [])
            digs_ = Q.need_digits(w_desc)
            pick = None
            for qx in own:
                for m_ in X.TIME_RX.finditer(qx):
                    tx = m_.group(0).strip(' ,;')
                    if len(tx) < 3:
                        continue
                    if digs_ and Q.has_digits(tx, digs_):
                        pick = tx
                        break
                    if pick is None and not digs_ and re.search(r'\d|noon|midnight|daybreak|daylight|sunrise|sunset|dusk|dawn|twilight|nightfall|morning|afternoon|evening|night', tx, re.I):
                        pick = tx
                if pick and digs_:
                    break
            ovw = (OVR.get(cid) or {}).get('wp')
            if ovw:
                parts_ = ovw if isinstance(ovw, list) else [ovw]
                for pp_ in parts_:
                    if not any(pp_ in qx for qx in own):
                        errors.append('%s: wp %r is not inside the claim extracts' % (cid, pp_))
                pick = '; '.join(parts_)
            if not pick and not wp:
                for qx in own:
                    mq = DATE_RX.search(qx)
                    if mq and len(mq.group(0).strip()) >= 3:
                        pick = mq.group(0).strip(' ,;')
                        break
            if not pick and not wp:
                # nearest printed clock or date phrase from 600 characters before the anchor to 150 after it (closest to the anchor start)
                lo0 = IDXA[cid] - a_
                zone = P.ntext[a_ + lo0:b_ + 150]
                best_ = None
                for rx_ in (X.TIME_RX, DATE_RX):
                    for m_ in rx_.finditer(zone):
                        tx_ = m_.group(0).strip(' ,;.')
                        if len(tx_) < 3:
                            continue
                        dsc_ = re.sub(r'(?:July|June)\s+\d+', ' ', w_desc or '')
                        okw_ = set(re.findall(r'[a-z]{4,}', tx_.lower())) & set(re.findall(r'[a-z]{4,}', dsc_.lower())) - {'july', 'june', 'about', 'after', 'before'}
                        mdt_ = re.fullmatch(r'(?:[A-Za-z]+,?\s+)?(July|June)\s*(\d+)', tx_)
                        okd_ = bool(mdt_ and o['when']['date'] and o['when']['date'].endswith('%s-%02d' % ('07' if mdt_.group(1) == 'July' else '06', int(mdt_.group(2)))))
                        md2_ = re.match(r'the\s+(\d{1,2})(?:st|d|nd|rd|th)\b', tx_, re.I)
                        if md2_ and o['when']['date'] and int(o['when']['date'][-2:]) == int(md2_.group(1)):
                            okd_ = True
                        okc_ = bool(digs_ and Q.has_digits(tx_, digs_))
                        if not (okw_ or okd_ or okc_):
                            continue
                        dist_ = abs((lo0 + m_.start()) - rs_)
                        if best_ is None or dist_ < best_[0]:
                            best_ = (dist_, tx_)
                if best_:
                    wp = best_[1]
                    wbasis = 'nearest clock or date phrase (sharing a word with the description) in the same report, nearest to the anchor (before or just after); the distance can be long'
            if pick:
                wp = pick
            elif digs_ and (wp is None or not Q.has_digits(wp, digs_)):
                bw2 = Q.choose_wide(seg, ' ', w_desc or '', digs_)
                if bw2:
                    mm_ = [m_.group(0).strip(' ,;') for m_ in X.TIME_RX.finditer(bw2[1]) if Q.has_digits(m_.group(0), digs_)]
                    wp = mm_[0] if mm_ else wp
            phs = X.extract_places(seg, rs_, re2_, pl_desc)
            sp_ = None if phs else X.extract_spatial(seg, rs_, re2_)
        else:
            wp, phs, sp_, wbasis = None, [], None, None
        o['when'] = collections.OrderedDict([('printed', wp), ('description', w_desc), ('date', o['when']['date']), ('t_iso', o['when']['t_iso']), ('approx', o['when']['approx'])])
        if wbasis:
            o['when']['printed_basis'] = wbasis
        if not wp and o['tier'] != 'open gap':
            o['when']['printed_note'] = 'no clock or date phrase is printed in or next to the cited passage; the date comes from the report context (see description)'
        pl_new = collections.OrderedDict([('printed', '; '.join(phs) if phs else sp_), ('description', pl_desc), ('gazetteer_ref', o['place']['gazetteer_ref']),
                                          ('direction_or_road', o['place']['direction_or_road'])])
        auto = X.gaz_from_printed(phs)
        if auto and not pl_new['gazetteer_ref']:
            pl_new['gazetteer_ref'] = auto[0]
            pl_new['gazetteer_ref_basis'] = 'auto from verbatim printed place'
        if len(auto) > 1:
            pl_new['gazetteer_refs_from_printed'] = auto
        o['place'] = pl_new
    # ---- full-passage fidelity re-check: apply the per-claim repairs (positions_D_recheck.json; split claims carry c['fc'] from their module) ----
    import positions_extract as X2
    byid2 = {o['claim_id']: o for o in out}
    for k_ in RCK:
        if k_ not in byid2:
            errors.append('recheck key %s is not a claim id' % k_)
    for o in out:
        cid = o['claim_id']
        r_ = RCK.get(cid, {})
        fc = r_.get('fc') or o.get('_fc') or 'not_rechecked'
        o['fidelity_check'] = fc
        rec_ = o['source'].get('report_id')
        if 'q' in r_:
            if len(r_['q'].split()) >= 15 or not find_in_record(rec_, r_['q']) or not F.verify(r_['q'], (IDX[rec_]['part'],)):
                errors.append('%s: recheck quote bad' % cid)
            o['source']['quote'] = r_['q']
            o['source']['quote_basis'] = 'chosen at the full-passage re-check, verified present in the record by code'
        if 'q2' in r_:
            o['source']['additional_quotes'] = list(o['source'].get('additional_quotes', []))
            for q2_ in r_['q2']:
                if len(q2_.split()) >= 15 or not find_in_record(rec_, q2_) or not F.verify(q2_, (IDX[rec_]['part'],)):
                    errors.append('%s: recheck additional quote bad: %r' % (cid, q2_))
                elif q2_ not in o['source']['additional_quotes']:
                    o['source']['additional_quotes'].append(q2_)
        if 'act' in r_:
            o['activity'] = r_['act']
        if 'wp' in r_:
            wp_ = r_['wp']
            if wp_ is not None:
                ext_ = [o['source'].get('quote') or ''] + o['source'].get('additional_quotes', [])
                if not any(wp_ in x_ for x_ in ext_):
                    errors.append('%s: recheck wp %r is not inside the claim extracts' % (cid, wp_))
            o['when']['printed'] = wp_
            o['when'].pop('printed_basis', None)
            o['when'].pop('printed_note', None)
            if wp_ is None:
                o['when']['printed_note'] = 'no clock or date phrase in the same sentence as the fact; see description'
        elif 'printed_basis' in o['when'] and fc in FC_OK:
            errors.append('%s: printed_basis claim marked %s without a wp decision' % (cid, fc))
        if 'wdesc' in r_:
            o['when']['description'] = r_['wdesc']
        if 'date' in r_:
            o['when']['date'] = r_['date']
        if 'date_basis' in r_:
            o['when']['date_basis'] = r_['date_basis']
        if 'ap' in r_:
            o['when']['approx'] = r_['ap']
        if 'wextra' in r_:
            o['when'].update(r_['wextra'])
        if 't' in r_:
            o['when']['t_iso'] = (('1863-%sT%s' % (o['when']['date'][5:], r_['t'])) if r_['t'] else None)
        if 'pl' in r_:
            for p_ in [x_ for x_ in (r_['pl'] or '').split('; ') if x_]:
                if not find_in_record(rec_, p_):
                    errors.append('%s: recheck place phrase %r not in the record' % (cid, p_))
            o['place']['printed'] = r_['pl']
        if 'pld' in r_:
            o['place']['description'] = r_['pld']
        if 'rd' in r_:
            o['place']['direction_or_road'] = r_['rd']
        if 'gz' in r_:
            o['place']['gazetteer_ref'] = r_['gz']
            o['place'].pop('gazetteer_ref_basis', None)
        if 'ocr' in r_:
            o['ocr_uncertain'] = r_['ocr']
        if 'tier' in r_:
            o['tier'] = r_['tier']
            if r_['tier'] == 'inferred':
                o['inference'] = r_['inf']
        if 'cf' in r_:
            o['_cf'] = r_['cf']
        if r_.get('note'):
            o['note'] = (o['note'] + ' | ' if o['note'] else '') + 'Re-check: ' + r_['note']
        if r_.get('fnote'):
            o['fidelity_note'] = r_['fnote']
        if fc == 'not_rechecked' and not o.get('fidelity_note'):
            o['fidelity_note'] = 'not yet re-checked'
        o['claim_support_verified'] = fc in FC_OK
    for o in out:
        if o['_cf']:
            lab = o['_cf']
            fam = byfam[re.sub(r'\s*C-\d{3}', '', lab).strip()]
            ext = re.findall(r'C-\d{3}', lab)
            o['conflicts_with'] = [x for x in fam if x != o['claim_id']] + ext
            o['conflict_family'] = re.sub(r'\s*C-\d{3}', '', lab).strip()
            if len(fam) < 2 and not ext:
                if os.environ.get('POS_LENIENT'):
                    print('WARN %s: conflict label %s has no partner yet' % (o['claim_id'], lab))
                else:
                    errors.append('%s: conflict label %s has no partner' % (o['claim_id'], lab))
    if errors:
        print('BUILD FAILED: %d errors' % len(errors))
        for e in errors[:100]:
            print('  ', e)
        sys.exit(1)
    path = os.path.join(OUTDIR, 'positions_%s.jsonl' % scope)
    os.makedirs(OUTDIR, exist_ok=True)
    with open(path, 'w', encoding='utf-8', newline='\n') as f:
        for o in out:
            o2 = {k: v for k, v in o.items() if not k.startswith('_')}
            f.write(json.dumps(o2, ensure_ascii=False) + '\n')
    print('wrote %s: %d claims, %d units' % (path, len(out), len(perunit)))
    return out


if __name__ == '__main__':
    build(sys.argv[1] if len(sys.argv) > 1 else 'D')
