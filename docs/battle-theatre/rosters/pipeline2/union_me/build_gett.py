"""Rows of the participants lists of "Maine at Gettysburg" (1898, source ME-GETT-1898) for the 14 units, written as work files.

    python3 -I docs/battle-theatre/rosters/pipeline2/union_me/build_gett.py            (run from the repository root)
Input   tmp/library/rosters/_me_xml/maineatgettysbur01main_djvu.xml (transient word boxes), tmp/library/rosters/ME-GETT-1898/* (pinned text)
Output  tmp/library/rosters/union-me-work/ME-GETT-1898/rows-<unit>.jsonl  [name, rank, co, remarks, page, off, rd, flags, '', 0]  and diag.json
The casualty lists ("REVISED REPORT OF CASUALTIES") and the run-in paragraphs of men on special duty are NOT parsed here (counted in diag.json).
"""
import os, sys, json, re, collections
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import mlib as M, me_gett as G, mtable as T
R = M.R
SRC, TID = 'ME-GETT-1898', 'ME-GETT-1898.1898'
XML = os.path.join(M.XMLDIR, 'maineatgettysbur01main_djvu.xml')
OUT = os.path.join(M.WORK, SRC)
RANGES = {'u-me-2nd-maine-battery-b': (56, 57), 'u-me-16th-maine-infantry': (89, 96), 'u-me-5th-maine-battery-e': (145, 146), 'u-me-3rd-maine-infantry': (187, 192),
          'u-me-4th-maine-infantry': (220, 225), 'u-me-17th-maine-infantry': (261, 268), 'u-me-20th-maine-infantry': (327, 334), 'u-me-19th-maine-infantry': (365, 374),
          'u-me-6th-maine-battery-f': (403, 403), 'u-me-5th-maine-infantry': (443, 449), 'u-me-6th-maine-infantry': (476, 483), 'u-me-7th-maine-infantry': (513, 518),
          'u-me-1st-maine-cavalry': (553, 562), 'u-me-10th-maine-infantry': (614, 616)}
NAME_OK = re.compile(r"^[A-ZÀ-Ý][A-Za-z'’\-\.]*[,;*†]*$|^[A-Z]\.?,?$|^(?:jr|Jr|sr|Sr|2d|3d|de|De|van|Van|von|Von|la|La|le|Le|du|Du|di|Di)[.,*†]*$")


def main():
    text, pm, ent = M.load_text(SRC, TID)
    lv = M.xml_leaves(XML)
    stat = collections.Counter()
    for leaf, ws in lv.items():
        a, b = pm.span(leaf)
        ok, bad, nt = M.align(ws, text, a, b)
        stat['words'] += len(ws); stat['aligned'] += ok; stat['unaligned'] += bad
    seg = {'s': SRC, 'v': '1898', 't': TID, 'lay': 'cols'}
    os.makedirs(OUT, exist_ok=True)
    diag = {'source': SRC, 'text_id': TID, 'xml_sha256': M.sha256_file(XML), 'alignment': dict(stat), 'units': {}}
    for u, (a, b) in RANGES.items():
        rows, bad, notes = G.parse(range(a, b + 1), lambda l: lv.get(l, []), start_rx=(r'.' if u == 'u-me-6th-maine-battery-f' else r'(?i)^(?:PARTICIPANTS\W*$|Present\s+for\s+Duty)'))
        good, defects = [], []
        for r in rows:
            e = r['entry']
            nw = sorted(e['name_words'], key=lambda w: w['off'])
            toks = [w['w'] for w in nw]
            if not toks:
                continue
            toks[-1] = re.sub(r'[,;]+$', '', toks[-1])
            rw = sorted(e['rem_words'], key=lambda w: w['off'])
            rkw = sorted(e['rank_words'], key=lambda w: w['off'])
            rank = ' '.join(w['w'] for w in rkw).strip(' ,;')
            off = nw[0]['off']
            remarks = ' '.join(w['w'] for w in rw)
            rd = (rw[0]['off'] - off) if rw else 0
            fl = 'N' if any(not NAME_OK.match(t) for t in toks) else ''
            row = R.row(' '.join(toks), rank or ('^' + r['rk']), r['co'], remarks, pm.printed(r['leaf']), off, rd)
            v = R.verify_rows([(seg, [row])], {TID: text}, {TID: pm}, max_report=10)
            hard = [d for d in v['defects'] if d['kind'] != 'rank-not-in-leaf']
            if hard:
                defects.append({'leaf': r['leaf'], 'name': row[0], 'kind': [d['kind'] for d in hard]})
            else:
                good.append(row + [fl, r['rk'], 0])
        good.sort(key=lambda x: x[5])
        with open(os.path.join(OUT, 'rows-%s.jsonl' % u), 'w', encoding='utf-8') as f:
            for g in good:
                f.write(json.dumps(g, ensure_ascii=False, separators=(',', ':')) + '\n')
        diag['units'][u] = {'leaves': [a, b], 'entries': len(rows), 'written': len(good), 'defects': len(defects), 'unparsed_field_lines': len(bad), 'paragraph_notes': notes,
                            'defect_samples': defects[:15], 'unparsed_samples': bad[:15]}
        print(u, len(rows), len(good), len(defects), len(bad), len(notes))
    json.dump(diag, open(os.path.join(OUT, 'diag.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main()
