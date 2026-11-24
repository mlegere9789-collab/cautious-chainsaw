"""Close-out builder for timeline shards tl-09..tl-12 (rows T2-236..T3-219).
Reads horde/tl-NN/results.jsonl + timeline_seed.jsonl + the local OR27 text, writes timeline_corrections/tl-NN.jsonl.
Run: python3 -I build_co.py [--check-only]   (needs tmp/library/or27/ present)"""
import sys, re, json, os, hashlib
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', '..', '..', '..'))
sys.path.insert(0, ROOT + '/tools/bt')
import or27_find as F
import merge_timeline_verification as M
from or27_lib import PARTS
G = ROOT + '/docs/battle-theatre/GOVERNANCE/'
H = G + 'horde/'
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from spec import PROMOTE, SCEN, CORRECTED, UNSUPPORTED, FORCE_PARTIAL, COMPUTED_ROWS, GAP_ROWS, EXTRA_UNSUPPORTED

import bisect
LEAF = json.load(open(ROOT + '/docs/battle-theatre/kit/evidence/or27_leaf_pages.json'))['parts']
def leaf_of(part, off):
    L = LEAF[str(part)]['leaves']
    k = bisect.bisect_right([l[1] for l in L], off) - 1
    return L[k][0], L[k][2], LEAF[str(part)]['archive_identifier']
MAN = {m['file']: m for m in json.load(open(ROOT + '/tmp/library/or27/MANIFEST.json'))}
def srcinfo(part):
    f = PARTS[part] + '_djvu.txt'
    return 'tmp/library/or27/' + f, MAN[f]['sha256']
SQ = {}
def squash(s): return re.sub(r'[^a-z0-9]', '', s.lower())
def sq(p):
    if p not in SQ: SQ[p] = squash(F.get_part(p).ntext)
    return SQ[p]

def cite_slice(part, start, end, key, author, report_hint=None):
    P = F.get_part(part)
    i = P.ntext.find(start)
    assert i >= 0, ('start not found', start)
    j = P.ntext.find(end, i)
    assert j >= 0, ('end not found', end)
    j += len(end)
    quote = P.ntext[i:j]
    os_, oe = P.orig_span(i, j)
    c = P.cite(os_, oe)
    f, sha = srcinfo(part)
    page = c['page']
    lf, lp, ident = leaf_of(part, os_)
    lf2, lp2, _ = leaf_of(part, oe - 1)
    scan = {'archive_identifier': ident, 'leaf': lf, 'pdf_page': lf + 1, 'leaf_printed_page': lp, 'quote_ends_on_leaf': lf2}
    from spec import IMGCHECK
    r = {'key': key, 'source_id': 'OR27', 'work': 'Official Records of the Union and Confederate Armies, Ser. I, vol. 27, part %d' % part,
            'part': part, 'report_id': c['record'], 'author': author, 'printed_page': page.lstrip('~'),
            'page_basis': 'running-head model of the OCR text (tools/bt/or27_pages.py): %s' % page,
            'quote': quote, 'text_offset': os_, 'text_offset_end': oe, 'source_file': f, 'sha256': sha,
            'source_class': 'official report, order or dispatch of 1863 (printed 1889)', 'scan': scan}
    if str(lp) != str(page.lstrip('~')) and '-' not in page:
        raise SystemExit('page mismatch %s %s %s' % (key, lp, page))
    if key in IMGCHECK:
        r['image_check'] = IMGCHECK[key]
    return r

def quote_cites(part, quote):
    """exact (whitespace-normalised) hits of a shard quote in the normalised OR text -> (offsets, page) or None"""
    q = re.sub(r'\s+', ' ', quote).strip()
    h = F.verify(q, parts=(part,)) if part else F.verify(q)
    return h

SENT_SPLIT = re.compile(r'(?<=[a-z0-9\)\"\'\]])\.\s+(?=[A-Z\"\'\(])')
ABBR = ['Lt.', 'Col.', 'Gen.', 'Capt.', 'Brig.', 'Maj.', 'Dr.', 'St.', 'Asst.', 'Surg.', 'Cos.', 'No.', 'vs.', 'Jul.', 'a. m.', 'p. m.', 'Btry.', 'Mass.', 'Pa.', 'Md.', 'Va.', 'Hon.', 'Rev.', 'Prof.', 'Mr.', 'Mrs.', 'Jr.', 'Ill.', 'Ala.', 'Ind.', 'Mich.', 'Vt.', 'W.Va.', 'Conn.']
def sentences(t):
    for k, a in enumerate(ABBR): t = t.replace(a, a.replace('.', '․'))
    return [s.replace('․', '.').strip() for s in SENT_SPLIT.split(t) if s.strip()]
GAPMARK = re.compile(r'not in (the )?OR|NOT in (the )?OR|not found|not located|not stated|not verified|not re-?checked|not extracted|not retrieved|not named|not given|no OR|NOT supported|not supported|unsupported|secondary|not in these|not in the passage|not read|no primary|no hour|Not an OR|not computed|not established|unsourced|gap|failed|not documented|cannot|rests on|only source|not mentioned|none was|No Lt|not separately|does not|not tested|not independent|Not wholly|not wholly|is not|are not|Hour not|not examined', re.I)
CONFMARK = re.compile(r'conflict|differs|disagree|\bvs\b|versus|carry|Carry', re.I)

def mk_row(shard, x, seed, specs):
    rid = x['id']
    n = shard[-2:]
    verdict_sh = x['verdict']
    tier_sh = x.get('tier') if isinstance(x.get('tier'), str) else (x.get('tier') or {}).get('proposed')
    notes = x['notes']
    sents = sentences(notes)
    # ---------------- citations from the shard record
    cites, ck = [], 0
    def add(c):
        nonlocal ck
        ck += 1
        c = dict(c); c['key'] = 'c%d' % ck
        cites.append(c); return c['key']
    qrecheck = {'quotes': 0, 'matched_verbatim': 0, 'matched_ignoring_punctuation_and_spacing_only': 0, 'not_matched': []}
    def qadd(part, q, cite_rec, author, label):
        qrecheck['quotes'] += 1
        h = None
        try: h = quote_cites(part, q)
        except Exception: h = None
        rec = dict(cite_rec)
        rec.update({'quote': q, 'quote_recheck': None})
        if h:
            P = F.get_part(h[0]['part'])
            f, sha = srcinfo(h[0]['part'])
            rec.update({'report_id': h[0]['record'], 'printed_page': h[0]['page'].lstrip('~'), 'part': h[0]['part'], 'text_offset': h[0]['start'], 'text_offset_end': h[0]['end'], 'source_file': f, 'sha256': sha,
                        'quote_recheck': 'matched verbatim (whitespace-normalised) at the stored offsets'})
            qrecheck['matched_verbatim'] += 1
        else:
            parts = [p for p in re.split(r'\s*(?:\.\.\.|…)\s*', q) if len(p.strip()) >= 8]
            ok = bool(parts) and all(any(squash(p) in sq(k) for k in (1, 2, 3)) for p in parts)
            if ok:
                rec['quote_recheck'] = 'matched only after ignoring case, punctuation and spacing (OCR spacing or an ellipsis); offsets not stored'
                qrecheck['matched_ignoring_punctuation_and_spacing_only'] += 1
            else:
                rec['quote_recheck'] = 'NOT matched in the local OR text: the shard quote is condensed, paraphrased or OCR-different; it is not used as a quote'
                qrecheck['not_matched'].append(q[:120])
        rec['quote_label'] = label
        return add(rec)
    # ---- per shard record forms
    if n == '09':
        for c in x['source_citations']:
            rec = {'source_id': 'OR27', 'report_id': c['record'], 'author': c['author'], 'printed_page': c['printed_page'],
                   'shard_passage': c['passage'], 'quote': None, 'verbatim': False}
            offs = c.get('char_offsets')
            if offs:
                m = re.match(r'pt(\d):(.*)', offs)
                part = int(m.group(1)); T = F.get_part(part).text
                reads = []
                for a, b in re.findall(r'(\d+)-(\d+)', m.group(2)):
                    reads.append(re.sub(r'\s+', ' ', T[int(a):int(b)]))
                f, sha = srcinfo(part)
                rec.update({'part': part, 'source_file': f, 'sha256': sha, 'locator_offsets': offs, 'locator_text_read': reads,
                            'quote_recheck': 'locator only: the shard stored anchor offsets, not a quoted passage; the text at the offsets was read (locator_text_read)'})
            else:
                rec['quote_recheck'] = 'no quote and no offsets stored by the shard'
            add(rec)
        for q in re.findall(r'exact wording: \\?"([^"\\]+)\\?"', json.dumps(x['source_citations'])):
            pass
    elif n == '10':
        qs = re.findall(r'\\"([^\\"]{12,500})\\"', json.dumps(x.get('supporting_passage', '')))
        sid = 'OR27' if re.search(r'\bOR', x['source']) else ('NPS-WEB' if 'nps.gov' in x['source'] else 'UNSPECIFIED')
        base = {'source_id': sid, 'work': 'Official Records of the Union and Confederate Armies, Ser. I, vol. 27', 'author': x['source'][:140], 'printed_page': None}
        for q in qs: qadd(None, q, base, x['source'], 'shard supporting_passage')
        if not qs:
            add({'source_id': sid, 'shard_source': x['source'], 'quote': None, 'quote_recheck': 'no verbatim quote in the shard record: ' + x.get('supporting_passage', '')[:200]})
    elif n == '11':
        qs = re.findall(r'--verify \\"(.+?)\\" --part (\d)', json.dumps(x.get('passage_ref', '')))
        base = {'source_id': 'OR27', 'author': x['source'][:140], 'printed_page': None}
        for q, p in qs: qadd(int(p), q, base, x['source'], 'shard --verify phrase')
        if not qs:
            add({'source_id': 'OR27', 'shard_source': x['source'], 'quote': None, 'shard_passage_ref': x['passage_ref'][:300], 'quote_recheck': 'no verbatim quote in the shard record (audit-record reference only)'})
    elif n == '12':
        for r in x.get('supporting_passage_refs', []):
            if isinstance(r, dict) and r.get('quote') and not str(r.get('basis', '')).startswith('recorded'):
                qadd(None, r['quote'], {'source_id': 'OR27', 'author': r['cite'], 'printed_page': None}, r['cite'], 'shard supporting_passage_refs')
            elif isinstance(r, dict):
                add({'source_id': 'OR27', 'shard_source': r['cite'], 'quote': None, 'shard_passage': r.get('quote'), 'quote_recheck': 'paraphrase of the library audit record; no verbatim quote stored (%s)' % r.get('basis', '')[:90]})
        if not x.get('supporting_passage_refs'):
            for s in x.get('source_citations', []):
                add({'source_id': 'OR27' if 'OR' in s else 'UNSPECIFIED', 'shard_source': s, 'quote': None, 'quote_recheck': 'citation named without a quote'})
        wl = x.get('web_lookups') or []
        for w in wl:
            add({'source_id': 'NPS-WEB' if 'nps' in json.dumps(w).lower() else 'WEB', 'shard_source': w if isinstance(w, str) else json.dumps(w)[:300], 'quote': None, 'quote_recheck': 'web lookup recorded by the shard (horde/tl-12/web_lookups.json); a summary, not a stored verbatim quote'})
    if n != '09' and qrecheck['quotes'] == 0:
        pass
    # ---------------- promotion
    prom = PROMOTE.get(rid)
    subs, scenarios, remains = [], [], []
    verdict = None
    corrected_claim = None
    if prom:
        cites = []; ck = 0
        keys = {}
        for k, (part, st, en, author) in prom['cites'].items():
            c = cite_slice(part, st, en, k, author)
            cites.append(c)
        for i, (claim, ks) in enumerate(prom['subs'], 1):
            subs.append({'n': i, 'claim': claim, 'tier': 'documented', 'support': 'supported', 'citations': ks})
        verdict = 'confirmed'
        note_second = prom['second']
        qrecheck = {'second_reading': note_second}
    else:
        base_tier = 'documented' if (tier_sh or '').startswith('documented') else ('inferred' if 'inferred' in (tier_sh or '') else 'plausible-procedural' if 'procedural' in (tier_sh or '') else 'open gap')
        allk = [c['key'] for c in cites]
        sup_s, gap_s, conf_s = [], [], []
        for s in sents:
            if GAPMARK.search(s): gap_s.append(s)
            elif CONFMARK.search(s): conf_s.append(s)
            else: sup_s.append(s)
        has_or = any(c.get('source_id') == 'OR27' and (c.get('quote') or c.get('shard_passage') or c.get('locator_offsets')) for c in cites)
        if rid in COMPUTED_ROWS:
            verdict = 'confirmed'
            c = {'key': 'eph', 'source_id': 'COMPUTED', 'quote': None, 'shard_source': 'environment/ephemeris_1863.json (recomputed by the shard, astropy builtin and own Meeus code)', 'quote_recheck': 'computation, not a source text'}
            cites = [c]; allk = ['eph']
            subs.append({'n': 1, 'claim': COMPUTED_ROWS[rid], 'tier': 'inferred', 'support': 'supported', 'citations': ['eph'], 'note': 'a recomputation is not a non-lead source (Law cl.4): the row cannot leave seeded_unverified through it'})
        elif rid in GAP_ROWS or verdict_sh in ('gap', 'not_primary_checkable', 'procedural', 'inferred_model', 'inferred'):
            verdict = 'gap'
            subs.append({'n': 1, 'claim': 'Seed claim as written (%s)' % seed['text_raw'][:120].replace('\n', ' '), 'tier': 'open gap' if base_tier != 'plausible-procedural' else 'plausible-procedural', 'support': 'unsupported', 'citations': [],
                         'note': notes[:600]})
            remains = [s for s in (gap_s or [notes[:400]])]
        else:
            verdict = 'partially_supported'
            n_ = 0
            if sup_s:
                n_ += 1
                subs.append({'n': n_, 'claim': ' '.join(sup_s)[:900], 'tier': (base_tier if base_tier != 'open gap' else 'inferred') if has_or else 'inferred', 'support': 'supported', 'citations': allk,
                             'note': 'as recorded by the shard (verdict %s); quote status of each citation: see its quote_recheck' % verdict_sh})
            for s in conf_s:
                n_ += 1
                subs.append({'n': n_, 'claim': s[:700], 'tier': base_tier if base_tier != 'open gap' else 'inferred', 'support': 'conflict', 'citations': [],
                             'note': 'source conflict carried as scenarios, no default (Law cl.6)'})
            for s in gap_s:
                n_ += 1
                subs.append({'n': n_, 'claim': s[:700], 'tier': 'open gap', 'support': 'unsupported', 'citations': []})
            remains = list(gap_s)
        if rid in FORCE_PARTIAL and verdict == 'confirmed':
            verdict = 'partially_supported'
        if rid in CORRECTED:
            verdict = 'corrected'; corrected_claim = CORRECTED[rid]
        if rid in UNSUPPORTED:
            verdict = 'unsupported'
        if rid in EXTRA_UNSUPPORTED:
            for s in EXTRA_UNSUPPORTED[rid]:
                remains.append(s)
                subs.append({'n': len(subs) + 1, 'claim': s, 'tier': 'open gap', 'support': 'unsupported', 'citations': []})
    # scenarios
    sc = SCEN.get(rid)
    if sc:
        for i, (val, basis) in enumerate(sc):
            scenarios.append({'id': 'ABCDEFGHIJ'[i], 'value': val, 'basis': basis, 'tier': 'documented' if 'OR' in basis or 'Hunt' in basis else 'inferred', 'citations': []})
    elif x.get('scenarios'):
        for i, s in enumerate(x['scenarios']):
            scenarios.append({'id': s.get('label') or 'ABCDEFGHIJ'[i], 'value': s['value'], 'basis': s['source'], 'tier': 'documented' if 'OR27' in s['source'] else 'inferred', 'citations': []})
    default = None
    row = {
        'id': rid, 'shard': shard,
        'seed': {'page': seed.get('page'), 'tier': seed.get('tier'), 'time_window_raw': seed.get('time_window_raw')},
        'before': {'status_effective': 'seeded_unverified', 'shard_verdict': verdict_sh, 'shard_tier': tier_sh, 'shard_status': x.get('status'), 'quote_recheck': qrecheck},
        'verdict': verdict,
        'corrected_claim': corrected_claim,
        'tier_change': {'seed': seed.get('tier'), 'shard_effective': tier_sh, 'corrected': tier_sh if not corrected_claim else corrected_claim.get('tier'),
                        'note': 'tier unchanged against the seed' if (seed.get('tier') == (tier_sh or '').split(' ')[0]) else 'shard audit tier %s against seed tier %s' % (tier_sh, seed.get('tier'))},
        'sub_claims': subs, 'citations': cites,
        'default': default, 'scenarios': scenarios, 'remains_unsupported': remains,
        'searched': [x.get('verification_basis') or x.get('spot_verified') or ('spot_verified_this_pass' if x.get('spot_verified_this_pass') else 'see shard notes')],
        'recheck_applied': 'close-out %s of 2026-11-24: second reading of the shard notes and quotes against the local OR27 text (see before.quote_recheck)' % shard,
        'register_proposed': None, 'register_related': x.get('register_refs') or x.get('proposed_register') or ([x['register']] if x.get('register') else []),
    }
    return row

def main():
    check_only = '--check-only' in sys.argv
    seed = {json.loads(l)['id']: json.loads(l) for l in open(G + 'timeline_seed.jsonl')}
    summary = {}
    for n in ('09', '10', '11', '12'):
        shard = 'tl-' + n
        rows = []
        for l in open(H + shard + '/results.jsonl'):
            x = json.loads(l)
            rows.append(mk_row(shard, x, seed[x['id']], None))
        out = ''.join(json.dumps(r, ensure_ascii=False) + '\n' for r in rows)
        path = G + 'timeline_corrections/' + shard + '.jsonl'
        if check_only:
            print(shard, 'same' if open(path, encoding='utf-8').read() == out else 'DIFFERS')
        else:
            open(path, 'w', encoding='utf-8').write(out)
        from collections import Counter
        summary[shard] = dict(Counter(r['verdict'] for r in rows))
    print(json.dumps(summary))
if __name__ == '__main__':
    main()
