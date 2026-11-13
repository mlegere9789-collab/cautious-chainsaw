"""Rows of the 14 Gettysburg units from the 1867 Alphabetical Index (source ME-SUPP-1867), written as work files.

    python3 -I docs/battle-theatre/rosters/pipeline2/union_me/build_index.py            (run from the repository root)

Input   tmp/library/rosters/_me_xml/supplementtoannu00main_djvu.xml (transient word boxes; sha256 in the ledger and manifest)
        tmp/library/rosters/ME-SUPP-1867/*  (pinned OCR text, page index, page numbers)
Output  tmp/library/rosters/union-me-work/ME-SUPP-1867/rows-<unit>.jsonl   one JSON array per row: [name, rank, co, remarks, page, off, rd, flags]
        tmp/library/rosters/union-me-work/ME-SUPP-1867/rows-_other.jsonl   lines of the index whose unit cannot be read (candidate pool)
        tmp/library/rosters/union-me-work/ME-SUPP-1867/diag.json           counts, defects and every skipped line

Every row is asserted against the pinned text before it is written: V1 (name tokens at the recorded offset), V2 (remark tokens in
order from off+rd inside the leaf), V3 (printed page of the leaf).  A row that fails is a defect: it is listed, never written.
"""
import os, sys, json, re, collections
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import mlib as M, me_index as I, mtable as T
R = M.R

SRC, TID = 'ME-SUPP-1867', 'ME-SUPP-1867.1867'
XML = os.path.join(M.XMLDIR, 'supplementtoannu00main_djvu.xml')
OUT = os.path.join(M.WORK, SRC)
LISTS = (('vol1', range(12, 579)), ('vol2', range(630, 1227)))        # leaves of the two volunteer lists (see the report)
NAME_OK = re.compile(r"^[A-Z][A-Za-z'’\-]*[.,*†‡]*$|^[A-Z]\.?$|^(?:jr|Jr|sr|Sr|2d|3d|de|De|van|Van|von|Von|la|La|le|Le|du|Du|di|Di|der|Der|y|é)[.,*†]*$")
KNOWN_NOT_OURS = ('Unassigned', 'Unassigned Infantry.', 'Unassigned Infantry,', 'Coast Gds.', "1st Battal'n", 'State Gds.', 'Light', 'Coast Gds. Infantry.', 'TJnassigned', 'TJnassigned Infantry.', 'Unassignec Infantry.', 'Unassigned do', 'IstBattal\'n')
CO_OK = re.compile(r"^[A-M]$|^\d{1,2}(?:st|d|nd|rd|th)\s(?:Co|Bat)\.$")


def name_flags(toks):
    return any(not NAME_OK.match(t) for t in toks)


def main():
    text, pm, ent = M.load_text(SRC, TID)
    lv = M.xml_leaves(XML)
    stat = collections.Counter()
    for leaf, ws in lv.items():
        a, b = pm.span(leaf)
        ok, bad, nt = M.align(ws, text, a, b)
        stat['words'] += len(ws); stat['aligned'] += ok; stat['unaligned'] += bad
    rows_all = []
    leaf_notes = {}
    for lname, leaves in LISTS:
        rows = []
        for leaf in leaves:
            if leaf not in lv:
                leaf_notes[leaf] = 'no word boxes in the item (blank or unread leaf)'
                continue
            rs, notes = I.parse_leaf(leaf, lv[leaf])
            for r in rs:
                r['list'] = lname
            if notes:
                leaf_notes[leaf] = '; '.join(notes)
            rows.extend(rs)
        I.assign(rows)
        rows_all.extend(rows)
    # rank vocabulary derived from the volume itself (strings printed at least 8 times, ditto damage excluded)
    rank_count = collections.Counter(T.text_of(r['rank']) for r in rows_all if r['rank'])
    rank_vocab = {k for k, v in rank_count.items() if v >= 8 and not I.RE_DITTO_DAMAGED.match(k)}
    out = collections.defaultdict(list)           # unit -> rows
    skipped = collections.defaultdict(list)       # reason -> [descr]
    unit_stat = collections.defaultdict(collections.Counter)
    for r in rows_all:
        unit = r['unit']
        if not r['name']:
            if unit:
                skipped['name-not-read:' + unit].append({'leaf': r['leaf'], 'list': r['list'], 'y': round(r['y']), 'cells': [T.text_of(r[k]) if r[k] else '' for k in ('rank', 'co', 'rg', 'cp')]})
            continue
        ntoks = [w['w'] for w in sorted(r['name'], key=lambda w: w['off'])]
        if len(ntoks) == 1 and re.match(r'^\d+$', ntoks[0]) and not (r['rank'] or r['co'] or r['rg'] or r['cp']):
            continue                                              # the folio at the foot of the page
        if not unit:
            # candidate pool: the unit cannot be read but could be one of ours
            rgt, ckind = r['rg_text'], r['corps_kind']
            cand = False
            if ckind in ('inf', 'cav', 'mounted', 'bn10') and rgt not in KNOWN_NOT_OURS and not rgt.startswith(('Unassigned', 'TJnassigned', 'Coast', "1st Bat", 'State', 'Light')):
                if r['rg_kind'] in ('blank', 'other') or (r['rg_kind'] in ('num', 'num2') and False):
                    cand = True
            if ckind == 'mounted' and re.search(r'(?i)bat', r['co_text']) and not I.RE_BAT.match(r['co_text']):
                cand = True
            if not cand:
                continue
            unit = '_other'
        # --- row fields
        nw = sorted(r['name'], key=lambda w: w['off'])
        off = nw[0]['off']
        name = ' '.join(w['w'] for w in nw)
        rank = T.text_of(r['rank']) if r['rank'] else ''
        rem_w = sorted(r['co'] + r['rg'] + r['cp'], key=lambda w: w['off'])
        remarks = ' '.join(w['w'] for w in rem_w)
        rd = (rem_w[0]['off'] - off) if rem_w else 0
        leaf = r['leaf']
        a, b = pm.span(leaf)
        page = pm.printed(leaf)
        fl = ''
        if name_flags(ntoks):
            fl += 'N'
        if rank and rank not in rank_vocab:
            fl += 'R'
        co_t = r['co_text']
        if co_t and not CO_OK.match(co_t):
            fl += 'C'
        if r['rg_kind'] in ('num2', 'other', 'blank') and unit != '_other' and not (unit == 'u-me-10th-maine-infantry' or 'battery' in unit):
            fl += 'G'
        if r['damaged_unit_cells']:
            fl += 'U'
        if name == 'Same' or re.match(r'^Same\W*$', name):
            fl += 'S'
        row = R.row(name, rank, '', remarks, page, off, rd)
        out[unit].append((row, fl, r['list'], r['corps_how']))
        unit_stat[unit]['rows'] += 1
        unit_stat[unit]['list:' + r['list']] += 1
        if fl:
            for c in set(fl):
                unit_stat[unit]['flag:' + c] += 1
    # --- assertion pass and writing
    os.makedirs(OUT, exist_ok=True)
    seg = {'s': SRC, 'v': '1867', 't': TID, 'lay': 'cols'}
    diag = {'source': SRC, 'text_id': TID, 'xml_sha256': ent.get('derived_from', {}).get('sha256') or M.sha256_file(XML), 'alignment': dict(stat),
            'rank_vocabulary_size': len(rank_vocab), 'leaf_notes': leaf_notes, 'units': {}, 'defects': {}, 'skipped_counts': {k: len(v) for k, v in skipped.items()}}
    for unit, lst in out.items():
        lst.sort(key=lambda t: t[0][5])
        rows = [t[0] for t in lst]
        v = R.verify_rows([(seg, rows)], {TID: text}, {TID: pm}, max_report=10 ** 9)
        bad = {(d['off']) for d in v['defects'] if d['kind'] in ('name-not-at-offset', 'remark-not-at-offset', 'page-mismatch')}
        good = [t for t in lst if t[0][5] not in bad]
        with open(os.path.join(OUT, 'rows-%s.jsonl' % unit), 'w', encoding='utf-8') as f:
            for row, fl, lname, how in good:
                f.write(json.dumps(row + [fl, lname], ensure_ascii=False, separators=(',', ':')) + '\n')
        diag['units'][unit] = {'candidates': len(lst), 'written': len(good), 'defects': len(lst) - len(good),
                               'verify': {k: x for k, x in v.items() if k != 'defects'}, 'stat': dict(unit_stat[unit])}
        diag['defects'][unit] = [d for d in v['defects'] if d['off'] in bad][:200]
    diag['skipped'] = {k: v for k, v in skipped.items()}
    json.dump(diag, open(os.path.join(OUT, 'diag.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    for u, d in sorted(diag['units'].items()):
        print(u, d['candidates'], d['written'], d['defects'])
    print({k: len(v) for k, v in skipped.items()})


if __name__ == '__main__':
    main()
