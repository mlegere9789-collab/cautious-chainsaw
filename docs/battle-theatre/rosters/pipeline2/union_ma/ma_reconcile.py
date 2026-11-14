"""Reconcile the Massachusetts unit files (rosters/data2/union/ma) with the earlier roll files of the NE family
(rosters/data/NE/massachusetts/*.csv): step 5 of the production plan.  Nothing is resolved by guessing.

    python3 -I ma_reconcile.py             writes GOVERNANCE/horde/ws-rosters/union-ma/differences-<unit>.csv (one per unit that has an earlier file)
                                           and reconciliation.json

The two files are two readings of the same printed volumes (the earlier family read the plain djvu text of the Internet Archive items, this item reads
the hocr search text), so the comparison is a comparison of two parsers.  Method:

  1. Names are compared by their letters only (lower case, every other character dropped); the two files are in the order of the printed page, so the
     two lists of names are aligned in order (difflib.SequenceMatcher, autojunk off).  An aligned pair with the same letters is the same line.
  2. Inside an aligned pair: the company codes and the remarks (letters and digits only) are compared; a difference is listed, not resolved.
  3. A block that is in one file only is listed row by row with its locator (new file: printed page and character offset in the pinned text; earlier
     file: the locator of the csv and its line number).  Where a block has as many rows on both sides, the rows are paired by position and the
     similarity of the two names is given ("reading differs"); a pairing is a candidate, not a finding.
  4. Evidence for a row that is in one file only, searched in the files and the pinned text, never inferred:
       earlier-file-only row: are its name tokens in the pinned text of the unit's section?  at which offset?  is that offset inside the remarks of a new
         row (then the new reading holds the entry glued to the row above) or at no row (then the new reading has no line for it)?
       new-file-only row: is its printed head (name, rank, "Res") inside the remarks of an earlier row (then the earlier reading swallowed it)?
Standard library only.
"""
import sys, os, re, csv, json, difflib, collections, bisect

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
sys.path.insert(0, HERE)
import r2lib as R
from ma_sections import SECTIONS, IDENT, SOURCE_ID

ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..', '..'))
D2 = os.path.join(ROOT, 'docs', 'battle-theatre', 'rosters', 'data2')
R2 = os.path.join(ROOT, 'docs', 'battle-theatre', 'rosters')
OUT = os.path.join(ROOT, 'docs', 'battle-theatre', 'GOVERNANCE', 'horde', 'ws-rosters', 'union-ma')
LIB = os.path.join(ROOT, 'tmp', 'library', 'rosters', 'MA-SSM-1931')


def key(s):
    return re.sub(r'[^a-z]', '', s.lower())


def nrm(s):
    return re.sub(r'[^a-z0-9]', '', s.lower())


def co_new(c):
    return c


def co_old(c):
    if c == 'UNASSIGNED':
        return 'UNAS'
    if c == 'BTY':
        return ''
    if c.startswith('?'):
        return '?'
    return c


def load_text_and_pm(vol):
    ident = IDENT[vol]
    text = R.load_text(os.path.join(LIB, ident + '_hocr_searchtext.txt.gz'))
    pm = R.PageMap(os.path.join(LIB, ident + '_hocr_pageindex.json.gz'), os.path.join(LIB, ident + '_page_numbers.json'))
    return text, pm


def norm_tail(orig, n):
    """the part of orig after its first n letters and digits"""
    c = 0
    for i, ch in enumerate(orig):
        if ch.isalnum() and ch.isascii():
            c += 1
            if c == n:
                return orig[i + 1:].strip()
    return ''


def extra_kind(extra):
    if re.search(r'[A-Z]{4,}', extra) and re.search(r'(REGIMENT|REGIMEXT|BATTERY|COMPANY|INFANTRY|ARTILLERY|CAVALRY|VOLUNTEER|VOLL|MASS\.|SHARP)', extra) or re.fullmatch(r'[\d\s\.,]*', extra):
        return 'running head or page number'
    if re.search(r'[\u2014\u2013-]+\s*\S+\.?\s*[\u2014\u2013-]+\s*\S{0,6}\s', extra) and re.search(r'Res|Re[ceos]', extra):
        return 'a following entry'
    return 'other'


def tokens_regex(name):
    """regexp that finds the name tokens in the OCR text, separated by white space"""
    toks = name.split()
    if not toks:
        return None
    return re.compile(r'\s+'.join(re.escape(t) for t in toks))


def main():
    units = json.load(open(os.path.join(D2, 'units.json'), encoding='utf-8'))['units']
    ma = {u['key']: u for u in units if u['army'] == 'union' and u['st'] == 'ma'}
    spec_by_key = {s['key']: s for s in SECTIONS}
    os.makedirs(OUT, exist_ok=True)
    summary = {'format': 'roster-reconciliation/1', 'work_item': 'union-ma',
               'about': 'new file = rosters/data2/union/ma/<unit>.jsonl.gz (hocr search text, this item); earlier file = rosters/data/NE/massachusetts/*.csv '
                        '(plain djvu text, the NE family of 30 October 2026). Names compared by letters only, aligned in page order. Nothing is resolved.',
               'units': {}}
    vol_cache = {}
    totals = collections.Counter()
    for key_, u in ma.items():
        spec = spec_by_key[key_]
        head, segs, meta = R.read_unit(os.path.join(D2, u['path']))
        new = [r for _, rr in segs for r in rr]
        ent = {'designation': u['designation'], 'rows_new_file': len(new)}
        if not u['existing']:
            ent.update({'earlier_file': None, 'note': 'the earlier family produced no file for this unit (units.json existing is empty)'})
            summary['units'][key_] = ent
            continue
        ex = u['existing'][0]
        old_path = os.path.join(R2, ex['file'])
        old = list(csv.DictReader(open(old_path, newline='', encoding='utf-8')))
        ent.update({'earlier_file': ex['file'], 'earlier_unit_id': ex['unit_id'], 'rows_earlier_file': len(old)})
        vol = spec['vol']
        if vol not in vol_cache:
            vol_cache.clear()
            vol_cache[vol] = load_text_and_pm(vol)
        text, pm = vol_cache[vol]
        # section text range = the leaves of the unit (rows' offsets give the first and last leaf)
        offs = [r[5] for r in new]
        lo, hi = min(offs), max(offs)
        leaf_lo, leaf_hi = pm.leaf(lo), pm.leaf(hi)
        sec_start, sec_end = pm.span(leaf_lo)[0], pm.span(leaf_hi)[1]
        # extend the search range a little at the start (the unit title leaf) and to the end of the last leaf of the section
        sec_text = text[sec_start:sec_end]
        a = [key(r[0]) for r in new]
        b = [key(r['name_as_printed']) for r in old]
        sm = difflib.SequenceMatcher(None, a, b, autojunk=False)
        rows_out = []
        counts = collections.Counter()
        new_offs_sorted = offs  # increasing (the parser asserts it)
        old_rem_keys = [nrm(r['remarks_as_printed']) for r in old]
        big = '|'.join(old_rem_keys)
        starts, p = [], 0
        for k in old_rem_keys:
            starts.append(p)
            p += len(k) + 1

        def old_row_holding(substr_key):
            i = big.find(substr_key)
            if i < 0:
                return None
            return bisect.bisect_right(starts, i) - 1

        def new_row_at(off):
            i = bisect.bisect_right(new_offs_sorted, off) - 1
            return i if i >= 0 else None

        def earlier_only_row(j, extra=''):
            r = old[j]
            nm = r['name_as_printed']
            rg = tokens_regex(nm)
            found = None
            if rg:
                m = rg.search(sec_text)
                if m:
                    found = sec_start + m.start()
            ev = 'its name tokens are not in the pinned text of the unit section'
            if found is not None:
                i = new_row_at(found)
                if i is not None:
                    nrow = new[i]
                    if found == nrow[5]:
                        ev = 'its name is the name of new row %d (same offset %d)' % (i, found)
                    elif found > nrow[5] + (nrow[6] if nrow[3] else 0) - 1:
                        ev = 'its name tokens stand at offset %d, inside the remarks of new row %d (%s, page %s): the new reading holds the entry glued to the row above' % (found, i, nrow[0], nrow[4])
                    else:
                        ev = 'its name tokens stand at offset %d, inside the name part of new row %d (%s)' % (found, i, nrow[0])
                else:
                    ev = 'its name tokens stand at offset %d, before the first new row' % found
            return ['earlier-file-only', '', '', '', '', r['name_as_printed'], co_old(r['company']) or r['company'], r['source_locator'], j + 2, '', ev + extra, '', r['remarks_as_printed'][:100]]

        def new_only_row(i, extra=''):
            r = new[i]
            head_key = key(r[0]) + key(r[1]) + 'res'
            hold = old_row_holding(head_key) if len(head_key) >= 8 else None
            if hold is not None:
                ev = 'the printed head of this line stands inside the remarks of earlier row %d (%s, csv line %d): the earlier reading swallowed it' % (hold, old[hold]['name_as_printed'], hold + 2)
            else:
                ev = 'the printed head of this line is not inside the remarks of any earlier row'
            return ['new-file-only', r[0], r[2], r[4] if r[4] is not None else '', r[5], '', '', '', '', '', ev + extra, r[3][:100], '']

        matched_equal = 0
        for tag, i1, i2, j1, j2 in sm.get_opcodes():
            if tag == 'equal':
                for d in range(i2 - i1):
                    r, o = new[i1 + d], old[j1 + d]
                    counts['aligned_same_letters'] += 1
                    cn, cu = co_new(r[2]), co_old(o['company'])
                    rem_new, rem_old = nrm(r[3]), nrm(o['remarks_as_printed'])
                    if cu != '?' and cn != cu and not (cn == '' and cu == ''):
                        counts['company_differs'] += 1
                        rows_out.append(['company-differs', r[0], r[2], r[4] if r[4] is not None else '', r[5], o['name_as_printed'], o['company'], o['source_locator'], j1 + d + 2, '',
                                         'same name letters; company code of the new reading %r, of the earlier reading %r' % (r[2], o['company']), r[3][:100], o['remarks_as_printed'][:100]])
                    if rem_new == rem_old:
                        counts['remarks_equal'] += 1
                    else:
                        # the new file may start its remarks after stray marks: compare the part from the first "res"
                        if rem_new.startswith(rem_old) or rem_old.startswith(rem_new):
                            kind = 'new remarks longer' if len(rem_new) > len(rem_old) else 'earlier remarks longer'
                        else:
                            kind = 'remarks differ'
                        counts['remarks_' + kind.replace(' ', '_')] += 1
                        rt = difflib.SequenceMatcher(None, rem_new, rem_old, autojunk=False).ratio() if max(len(rem_new), len(rem_old)) < 1500 else None
                        xk = ''
                        if kind == 'earlier remarks longer':
                            ex_ = norm_tail(o['remarks_as_printed'], len(rem_new))
                            xk = extra_kind(ex_)
                            counts['earlier_longer_' + xk.replace(' ', '_')] += 1
                            kind_txt = '%s; the extra text is %s: %s' % (kind, xk, ex_[:80])
                        elif kind == 'new remarks longer':
                            ex_ = norm_tail(r[3], len(rem_old))
                            xk = extra_kind(ex_)
                            counts['new_longer_' + xk.replace(' ', '_')] += 1
                            kind_txt = '%s; the extra text is %s: %s' % (kind, xk, ex_[:80])
                        else:
                            kind_txt = kind
                        rows_out.append(['remarks-differ', r[0], r[2], r[4] if r[4] is not None else '', r[5], o['name_as_printed'], o['company'], o['source_locator'], j1 + d + 2,
                                         round(rt, 3) if rt is not None else '', '%s (%d letters and digits against %d)' % (kind_txt, len(rem_new), len(rem_old)), r[3][:100], o['remarks_as_printed'][:100]])
            elif tag == 'delete':          # only in the new file (a-side)
                for i in range(i1, i2):
                    counts['new_file_only'] += 1
                    rows_out.append(new_only_row(i))
            elif tag == 'insert':          # only in the earlier file (b-side)
                for j in range(j1, j2):
                    counts['earlier_file_only'] += 1
                    rows_out.append(earlier_only_row(j))
            else:                           # replace
                n1, n2 = i2 - i1, j2 - j1
                if n1 == n2:
                    for d in range(n1):
                        r, o = new[i1 + d], old[j1 + d]
                        sim = round(difflib.SequenceMatcher(None, key(r[0]), key(o['name_as_printed']), autojunk=False).ratio(), 3)
                        if sim >= 0.6:
                            counts['reading_differs_candidate_pair'] += 1
                            rows_out.append(['reading-differs', r[0], r[2], r[4] if r[4] is not None else '', r[5], o['name_as_printed'], o['company'], o['source_locator'], j1 + d + 2, sim,
                                             'paired by position inside an aligned block of %d line(s) on each side; the two names differ in letters (candidate pair, not resolved)' % n1,
                                             r[3][:100], o['remarks_as_printed'][:100]])
                        else:
                            counts['new_file_only'] += 1
                            counts['earlier_file_only'] += 1
                            rows_out.append(new_only_row(i1 + d, ' (position-paired with earlier row %s, similarity %s: too low to call the same line)' % (o['name_as_printed'], sim)))
                            rows_out.append(earlier_only_row(j1 + d, ' (position-paired with new row %s, similarity %s: too low to call the same line)' % (r[0], sim)))
                else:
                    for i in range(i1, i2):
                        counts['new_file_only'] += 1
                        rows_out.append(new_only_row(i, ' (inside a block of %d new and %d earlier lines that differ)' % (n1, n2)))
                    for j in range(j1, j2):
                        counts['earlier_file_only'] += 1
                        rows_out.append(earlier_only_row(j, ' (inside a block of %d new and %d earlier lines that differ)' % (n1, n2)))
        fname = u['path'].split('/')[-1][:-len('.jsonl.gz')]
        with open(os.path.join(OUT, 'differences-%s.csv' % fname), 'w', newline='', encoding='utf-8') as f:
            w = csv.writer(f)
            w.writerow(['kind', 'new_name_as_printed', 'new_company', 'new_printed_page', 'new_offset', 'earlier_name_as_printed', 'earlier_company', 'earlier_locator', 'earlier_csv_line',
                        'similarity', 'evidence', 'new_remarks_start', 'earlier_remarks_start'])
            w.writerows(rows_out)
        c_new = collections.Counter(r[2] if r[2] else '-' for r in new)
        c_old = collections.Counter(co_old(r['company']) or '-' for r in old)
        ent.update({'rows_delta_new_minus_earlier': len(new) - len(old),
                    'aligned_same_letters': counts['aligned_same_letters'], 'remarks_equal': counts['remarks_equal'],
                    'remarks_new_longer': counts['remarks_new_remarks_longer'], 'remarks_earlier_longer': counts['remarks_earlier_remarks_longer'],
                    'remarks_differ_other': counts['remarks_remarks_differ'], 'company_differs': counts['company_differs'],
                    'reading_differs_candidate_pairs': counts['reading_differs_candidate_pair'],
                    'new_file_only': counts['new_file_only'], 'earlier_file_only': counts['earlier_file_only'],
                    'company_counts_new_file': dict(sorted(c_new.items())), 'company_counts_earlier_file': dict(sorted(c_old.items())),
                    'difference_rows_written': len(rows_out), 'differences_file': 'GOVERNANCE/horde/ws-rosters/union-ma/differences-%s.csv' % fname})
        # evidence tallies on the one-sided rows
        ev_new = collections.Counter()
        ev_old = collections.Counter()
        for r in rows_out:
            if r[0] == 'new-file-only':
                ev_new['swallowed in an earlier row' if 'swallowed' in r[10] else 'not inside any earlier row'] += 1
            elif r[0] == 'earlier-file-only':
                if 'not in the pinned text' in r[10]:
                    ev_old['name tokens not in the pinned text'] += 1
                elif 'glued' in r[10]:
                    ev_old['inside the remarks of a new row (glued)'] += 1
                elif 'same offset' in r[10]:
                    ev_old['same offset as a new row (name read differently)'] += 1
                else:
                    ev_old['other'] += 1
        ent['evidence_new_file_only'] = dict(ev_new)
        ent['evidence_earlier_file_only'] = dict(ev_old)
        summary['units'][key_] = ent
        for k, v in counts.items():
            totals[k] += v
        totals['rows_new'] += len(new)
        totals['rows_earlier'] += len(old)
        print('%-44s new %5d earlier %5d  same-letters %5d  remarks-differ %3d  company-differs %3d  pairs %3d  new-only %3d  earlier-only %3d' % (
            u['designation'], len(new), len(old), counts['aligned_same_letters'], len(rows_out) and (counts['remarks_new_remarks_longer'] + counts['remarks_earlier_remarks_longer'] + counts['remarks_remarks_differ']),
            counts['company_differs'], counts['reading_differs_candidate_pair'], counts['new_file_only'], counts['earlier_file_only']), flush=True)
    summary['totals'] = dict(totals)
    with open(os.path.join(OUT, 'reconciliation.json'), 'w', encoding='utf-8') as f:
        json.dump(summary, f, ensure_ascii=False, indent=1)
        f.write('\n')
    return 0


if __name__ == '__main__':
    sys.exit(main())
