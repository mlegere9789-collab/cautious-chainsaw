"""Production run of the Massachusetts roster item (union-ma, OA03): reads the 24 units of the Gettysburg order of battle from the pinned OCR text of
Massachusetts Soldiers, Sailors, and Marines in the Civil War (Adjutant General, 1931-35) and writes one roster2/2 file per unit with its flag file.

    python3 -I parse_ma_ssm.py             parse, check every row against the text, print the statistics, write nothing
    python3 -I parse_ma_ssm.py --write     the same, then write rosters/data2/union/ma/<unit>.jsonl.gz, <unit>.flags.json.gz and the diagnostics

The rules are in union_ma/ma_parse.py (head, name, rank, remarks, furniture), union_ma/ma_cuts.py (reviewed cuts), union_ma/ma_dates.py (the printed-date marks).
Every row is checked against the pinned text before anything is written (r2lib.verify_rows: V1 name at the offset, V2 remarks in order from the offset of the first
remark token, V3 printed page of the leaf, V4 rank in the leaf); a defect aborts the run.  The output is a function of the pinned texts and these rules only, and a
second run gives identical bytes.

Standard library only.
"""
import sys, os, re, json, gzip, hashlib, collections, bisect

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, 'union_ma'))
import r2lib as R
import ma_parse as P
import ma_dates as D
import ma_flags as F
from ma_sections import SECTIONS, IDENT, SOURCE_ID

ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..'))
D2 = os.path.join(ROOT, 'docs', 'battle-theatre', 'rosters', 'data2')
OUT = os.path.join(D2, 'union', 'ma')
GOV = os.path.join(ROOT, 'docs', 'battle-theatre', 'GOVERNANCE', 'horde', 'ws-rosters', 'union-ma')
ORDER = 'ABCDEFGHIKLM'

CODES = {
    'N': 'name text damaged (a digit or a mark inside a name token, a lower-case first letter, a period where the comma belongs, no comma after the surname; since 14 November 2026 also a mark in front of a name token, Mc followed by a lower-case l, a name token that stands at most 10 times in the 24 unit files and differs by one look-alike pair of characters from a name token that stands at least 3 times as often)',
    'H': 'the head of the entry (name, rank, "Res.") was cut by a rule that is a reading or by a reviewed cut, or a stray mark stands in place of a dash',
    'R': 'the printed rank is not one of the ranks the volumes print (the text layer damaged it)',
    'Q': 'the word "Res." is damaged in the text layer',
    'C': 'the company heading above the row is damaged: the row has no company code (the letter the sequence of headings gives is in company_inferred)',
    'Y': 'a date in the line is damaged: a year with a letter or a mark for a digit (for example 1S63 or 18G1) or, since 14 November 2026, a word in the place of the month name that is none of the month words of ma_flags.MONTHS (Xov., Julj, Jime), or a day or age printed IS, 2S and the like',
    'G': 'garbage marks of the scan (^ | ~ and the like) stand in or beside the line; since 14 November 2026 also a single mark or letter standing alone between two words (! [ ] \' j i J, a lone I that is no company letter); a stray mark taken out of the head is listed in head_marks',
    'W': 'a word of the remarks is damaged by the scan (since 14 November 2026): a capital letter inside a word (disabUity), a digit or a mark inside a word, the ordinal 1st printed Ist, or a word that stands at most 10 times in the 24 unit files and differs by one look-alike pair of characters (rn m, l i, o e and the like) from a word that stands at least 25 times and ten times as often (furioughed, Beveriy)',
}
ABOUT = ('row numbers count the rows of the unit file in file order from 0; "ocr_uncertain" = the printed line is damaged in the text layer in at least one of the ways of '
         'the codes below (an empty result does not say the line is clean, it says no pattern matched); the rows are never repaired; "on_rolls_july_1863" is inferred '
         'from printed enlistment, muster and separation dates only and is no statement that the man was at Gettysburg; "normalised_names" only re-orders the printed '
         'tokens as Given Surname and strips stray marks at their ends, no letter is changed ("" where the printed head has no comma after the surname); "head_marks" '
         'lists the stray marks of the scan that stand between the parts of the head and are in no field of the row; "names_gettysburg" lists the rows whose printed '
         'remarks name Gettysburg (an OCR-tolerant match, a lower bound) and "gettysburg_dated" those whose clause also prints 1, 2 or 3 July 1863; '
         '"printed_page_from_running_head" gives, for rows on a leaf whose printed page the page-number file does not give, the number the running head prints')
RULE = ('yes: a printed muster-in, enlistment, draft or commission date on or before 30 June 1863, no separation (discharge, muster out, death, desertion, transfer out) '
        'dated before 1 July 1863, no undated or unreadable separation, no return after a separation, no damaged date, and no clause that holds a separation word or a date '
        'the reader cannot place (the semicolon between two events is often lost in the text layer: a clause is also cut before an event word that follows a year or a period, '
        'a colon or a bar counts as a semicolon, a leading stray mark or letter is dropped); no: the first printed start date is after 3 July 1863, or a separation is printed '
        'with a date before 1 July 1863 and nothing returns the man afterwards; every other row is unknown; what follows the first "See" (a cross-reference to the man\'s record '
        'in another organization) is not read')


def sha_bytes(b):
    return hashlib.sha256(b).hexdigest()


def prepare_vocab():
    rc, ec = collections.Counter(), collections.Counter()
    for s in SECTIONS:
        S = P.analyse(s, IDENT, None, None)
        rc.update(P.count_ranks(S))
        ec.update(P.entry_end_counts(S))
    P.learn_abbrev(ec, 5)
    return {r for r, c in rc.items() if c >= 5 and r}


def check_ledger():
    """the pinned texts: every volume used must be in the ledger and match its sha256"""
    led = json.load(open(os.path.join(D2, 'sources', SOURCE_ID + '.json'), encoding='utf-8'))
    out = {}
    for v in sorted({s['vol'] for s in SECTIONS}):
        tid = '%s.%s' % (SOURCE_ID, v)
        ent = led['texts'][tid]
        for role in ('text', 'pageindex', 'page_numbers'):
            f = ent['files'][role]
            p = os.path.join(ROOT, ent['local_dir'], f['name'])
            if R.sha256_file(p) != f['sha256']:
                raise ValueError('sha256 of %s differs from the ledger' % p)
        out[v] = ent
    return out


def infer_companies(S):
    """company letter the sequence of headings gives for each damaged company heading (heading index -> letter), only where the next legible heading agrees"""
    inferred, last = {}, None
    for hi, h in enumerate(S.heads):
        code = h[1]
        if len(code) == 1 and code in ORDER and not h[2]:
            last = code
        elif h[2]:
            exp = ORDER[ORDER.index(last) + 1] if last and ORDER.index(last) + 1 < len(ORDER) else ('A' if last is None else None)
            nxt = next((x[1] for x in S.heads[hi + 1:] if len(x[1]) == 1 and x[1] in ORDER and not x[2]), None)
            if exp and (nxt is None or ORDER.index(nxt) == ORDER.index(exp) + 1):
                inferred[hi] = exp
                last = exp
    return inferred


def page_from_head(S, leaf):
    """(page read from the running head, confirmed by the numbered leaves around it)"""
    p = F.running_head_page(S.text, S.pm, leaf)
    if p is None:
        return None, False
    for d in range(1, 6):
        for l2, sign in ((leaf - d, 1), (leaf + d, -1)):
            if 0 <= l2 < len(S.pm.ranges):
                q = S.pm.printed(l2)
                if isinstance(q, int):
                    return p, (q + sign * d == p)
    return p, False


def build_unit(spec, vocab):
    S = P.analyse(spec, IDENT, None, vocab)
    rows, info = P.build_rows(S)
    seg = {'s': SOURCE_ID, 'v': spec['vol'], 't': '%s.%s' % (SOURCE_ID, spec['vol']), 'lay': 'flow'}
    st = R.verify_rows([(seg, rows)], {seg['t']: S.text}, {seg['t']: S.pm})
    n = len(rows)
    norank = sum(1 for r in rows if not r[1])
    problems = []
    if st['name_ok'] != n:
        problems.append('V1 name: %d of %d' % (st['name_ok'], n))
    if st['remark_ok'] + st['remark_empty'] != n:
        problems.append('V2 remarks: %d of %d' % (st['remark_ok'], n))
    if st['page_ok'] != n:
        problems.append('V3 page: %d of %d' % (st['page_ok'], n))
    if st['rank_ok'] + st['rank_empty'] != n or st['rank_empty'] != norank:
        problems.append('V4 rank: %d of %d' % (st['rank_ok'], n))
    if st['order_breaks']:
        problems.append('offsets out of order: %d' % st['order_breaks'])
    if problems:
        raise SystemExit('%s: %s; defects %s' % (spec['key'], '; '.join(problems), st['defects'][:5]))
    # no leaf after the last one carries an entry head
    if spec.get('last_leaf') is not None:
        rest = P.tokenize_section(S.text, S.pm, spec['last_leaf'] + 1, len(S.pm.ranges))[0]
        pcs = P.make_pieces(rest)
        if any(P.RES_EXACT.match(p.w) for p in pcs):
            raise SystemExit('%s: an entry head stands after the last leaf' % spec['key'])
    return S, rows, info, seg, st


def make_flags(spec, S, rows, info, unit_sha, vocab):
    n = len(rows)
    inferred = infer_companies(S)
    rowcodes = collections.defaultdict(set)
    head_kinds = collections.defaultdict(list)
    norm, basis_idx, yes, no = [], {}, [], []
    gett, gett_dated, marks_out, comp_inf, page_head = [], [], [], [], []
    page_cache = {}
    for i, (r, inf) in enumerate(zip(rows, info)):
        e = inf['entry']
        name, rank, co, rem, page, off, rd = r
        comma = e.style == 'comma'
        if F.name_damaged(name, e.cut) or F.name_marks(name, vocab):
            rowcodes['N'].add(i)
        if e.cut not in ('ok', 'initials-dropped') or e.kind not in ('reg', 'res-damaged', 'junk-after-d2') or e.cut == 'reviewed':
            rowcodes['H'].add(i)
        if F.rank_damaged(rank):
            rowcodes['R'].add(i)
        if 'res-damaged' in e.kind or not re.match(r'^Res[\.,:;]?', rem):
            rowcodes['Q'].add(i)
        if inf['damaged_heading']:
            rowcodes['C'].add(i)
            hi = inf['heading_index']
            if hi in inferred:
                comp_inf.append([i, inferred[hi]])
        if F.year_damaged(rem) or F.damaged_dates(rem):
            rowcodes['Y'].add(i)
        if F.garbage_marks(rem) or F.garbage_marks(name) or inf['marks'] or F.stray_marks(rem):
            rowcodes['G'].add(i)
        if F.damaged_words(rem, vocab):
            rowcodes['W'].add(i)
        if e.kind != 'reg':
            head_kinds[e.kind].append(i)
        if e.cut != 'ok':
            head_kinds['cut:' + e.cut].append(i)
        norm.append(F.normalise_name(name, comma))
        st, b = D.onroll(rem)
        if st != 'unknown':
            if b not in basis_idx:
                basis_idx[b] = len(basis_idx)
            (yes if st == 'yes' else no).append([i, basis_idx[b]])
        if D.names_gettysburg(rem):
            gett.append(i)
            if D.gettysburg_dated(rem):
                gett_dated.append(i)
        for off_m, txt, where in inf['marks']:
            marks_out.append([i, off_m, txt, where])
        if page is None and inf['leaf'] is not None:
            lf = inf['leaf']
            if lf not in page_cache:
                page_cache[lf] = page_from_head(S, lf)
            p, ok = page_cache[lf]
            if p is not None:
                page_head.append([i, p, 1 if ok else 0])
    rev = []
    hoffs = [h[0] for h in S.heads]
    for off in S.reviewed_heads:                                   # headings the OCR damaged and a person read (ma_cuts.HEADINGS)
        hi = hoffs.index(off)
        idx = [i for i, inf in enumerate(info) if inf['heading_index'] == hi]
        rev.append({'heading': S.heads[hi][4], 'code': S.heads[hi][1], 'offset': off, 'first_row': idx[0] if idx else None, 'last_row': idx[-1] if idx else None, 'n_rows': len(idx)})
    rows_by_code = {c: sorted(v) for c, v in sorted(rowcodes.items())}
    unc = sorted(set().union(*rowcodes.values())) if rowcodes else []
    basis = [b for b, _ in sorted(basis_idx.items(), key=lambda kv: kv[1])]
    out = {
        'f': 'roster2-flags/1', 'u': spec['key'], 'n': n, 'unit_file_raw_lines_sha256': unit_sha, 'about': ABOUT, 'codes': CODES,
        'rows': rows_by_code, 'ocr_uncertain': unc,
        'on_rolls_july_1863': {'rule': RULE, 'basis': basis, 'yes': yes, 'no': no},
        'normalised_names': norm, 'head_kinds': {k: v for k, v in sorted(head_kinds.items())}, 'head_marks': marks_out,
        'company_inferred': comp_inf, 'printed_page_from_running_head': page_head,
        'names_gettysburg': gett, 'gettysburg_dated': gett_dated,
    }
    if rev:
        out['reviewed_headings'] = rev
    return out


def write_gz_json(path, obj):
    raw = (json.dumps(obj, ensure_ascii=False, separators=(',', ':'), sort_keys=True) + '\n').encode('utf-8')
    tmp = path + '.tmp'
    with open(tmp, 'wb') as f:
        with gzip.GzipFile(filename='', mode='wb', fileobj=f, compresslevel=9, mtime=0) as g:
            g.write(raw)
    os.replace(tmp, path)
    return hashlib.sha256(raw).hexdigest()


def main(argv):
    write = '--write' in argv
    ledger = check_ledger()
    vocab = prepare_vocab()
    diag = {'format': 'roster-parse-diagnostics/1', 'item': 'union-ma', 'units': {}, 'rank_vocabulary': sorted(vocab)}
    total = 0
    built = [(spec,) + build_unit(spec, vocab) for spec in SECTIONS]          # every unit is parsed first: the marks of 14 November 2026 count words over all 24 units
    wordcounts = F.Vocab([r for b in built for r in b[2]])
    for spec, S, rows, info, seg, st in built:
        path = os.path.join(OUT, spec['file'] + '.jsonl.gz')
        if write:
            meta = R.write_unit(path, spec['key'], 'union', 'ma', spec['name'], [(seg, rows)])
        else:
            import tempfile
            tmpd = tempfile.mkdtemp(prefix='ma_check_')
            meta = R.write_unit(os.path.join(tmpd, 'x.jsonl.gz'), spec['key'], 'union', 'ma', spec['name'], [(seg, rows)])
        # read back and compare with the rows (round trip)
        rp = path if write else os.path.join(tmpd, 'x.jsonl.gz')
        head, segs, rmeta = R.read_unit(rp)
        back = segs[0][1]
        if len(back) != len(rows) or any(b[0] != a[0] or b[3] != a[3] or b[5] != a[5] or b[4] != a[4] or b[2] != a[2] for a, b in zip(rows, back)):
            raise SystemExit('%s: round trip differs' % spec['key'])
        flags = make_flags(spec, S, rows, info, meta['sha256'], wordcounts)
        if write:
            write_gz_json(os.path.join(OUT, spec['file'] + '.flags.json.gz'), flags)
        total += len(rows)
        per_co = collections.Counter(r[2] for r in rows)
        pages = [r[4] for r in rows if isinstance(r[4], int)]
        d = {
            'rows': len(rows), 'raw_bytes': meta['raw'], 'gz_bytes': meta['gz'], 'raw_lines_sha256': meta['sha256'], 'volume': spec['vol'],
            'leaves': [S.leaf_a, S.leaf_b - 1], 'printed_pages_of_rows': [min(pages), max(pages)] if pages else None,
            'rows_without_printed_page': sum(1 for r in rows if r[4] is None),
            'verify': {k: v for k, v in st.items() if k != 'defects'},
            'codes': {c: len(v) for c, v in flags['rows'].items()}, 'ocr_uncertain': len(flags['ocr_uncertain']),
            'head_kinds': {k: len(v) for k, v in flags['head_kinds'].items()},
            'on_rolls': {'yes': len(flags['on_rolls_july_1863']['yes']), 'no': len(flags['on_rolls_july_1863']['no']),
                         'unknown': len(rows) - len(flags['on_rolls_july_1863']['yes']) - len(flags['on_rolls_july_1863']['no'])},
            'names_gettysburg': len(flags['names_gettysburg']), 'gettysburg_dated': len(flags['gettysburg_dated']),
            'rows_by_company': dict(sorted(per_co.items())), 'head_marks': len(flags['head_marks']),
            'company_inferred_rows': len(flags['company_inferred']), 'page_from_running_head_rows': len(flags['printed_page_from_running_head']),
            'furniture_lines': len(S.furn), 'section_headings': [(h[1], h[2], h[3]) for h in S.heads],
            'tail_dropped': [list(x) for x in S.tail_dropped], 'reviewed_cuts': [(n, why) for n, why, e in S.applied_cuts],
            'normalised_empty': sum(1 for x in flags['normalised_names'] if x == ''),
        }
        if flags.get('reviewed_headings'):
            d['reviewed_headings'] = flags['reviewed_headings']
        diag['units'][spec['key']] = d
        print('%-45s rows %5d  raw %7d  gz %6d  codes %s  yes/no %d/%d  Gettysburg %d (dated %d)' % (
            spec['name'], len(rows), meta['raw'], meta['gz'], d['codes'], d['on_rolls']['yes'], d['on_rolls']['no'], d['names_gettysburg'], d['gettysburg_dated']))
    diag['rows_total'] = total
    print('rows in all', total)
    if write:
        os.makedirs(GOV, exist_ok=True)
        with open(os.path.join(GOV, 'parse-diagnostics.json'), 'w', encoding='utf-8') as f:
            json.dump(diag, f, ensure_ascii=False, indent=1, sort_keys=True)
            f.write('\n')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
