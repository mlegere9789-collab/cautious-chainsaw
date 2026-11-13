"""Rows of the Gettysburg units from the company returns of Appendix D, Adjutant General's Report of Maine for 1863 (source ME-AGR-1863-APPD).

    python3 -I docs/battle-theatre/rosters/pipeline2/union_me/build_agr.py            (run from the repository root)

Input   tmp/library/rosters/_me_xml/annualreportofad1863main_djvu.xml (transient word boxes; sha256 in the ledger and the manifest)
Output  tmp/library/rosters/union-me-work/ME-AGR-1863-APPD/rows-<unit>.jsonl   [name, rank, co, remarks, page, off, rd, flags, section, 0, on_rolls]
        tmp/library/rosters/union-me-work/ME-AGR-1863-APPD/diag.json
Every row is asserted against the pinned search text (V1 name, V2 remarks, V3 page) before it is written; a row that fails is listed.
Rows carry the section heading above them as printed (rk) in the unit file; the on-the-rolls inference is a second, separate field.
"""
import os, sys, json, re, collections
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import mlib as M, me_agr as A, mtable as T
R = M.R

SRC, TID = 'ME-AGR-1863-APPD', 'ME-AGR-1863-APPD.1863'
XML = os.path.join(M.XMLDIR, 'annualreportofad1863main_djvu.xml')
OUT = os.path.join(M.WORK, SRC)
FIRST_LEAF, LAST_LEAF = 224, 821
LEAF_RANGE = {   # leaves in which a unit's return may stand (checked, a row outside is reported)
    'u-me-1st-maine-cavalry': (224, 262), 'u-me-2nd-maine-battery-b': (300, 307), 'u-me-5th-maine-battery-e': (309, 315), 'u-me-6th-maine-battery-f': (313, 320),
    'u-me-3rd-maine-infantry': (345, 378), 'u-me-4th-maine-infantry': (377, 409), 'u-me-5th-maine-infantry': (408, 439), 'u-me-6th-maine-infantry': (438, 471),
    'u-me-7th-maine-infantry': (470, 504), 'u-me-10th-maine-infantry': (586, 597), 'u-me-16th-maine-infantry': (684, 723), 'u-me-17th-maine-infantry': (722, 756),
    'u-me-19th-maine-infantry': (756, 791), 'u-me-20th-maine-infantry': (790, 822),
}
NAME_OK = re.compile(r"^[A-Z][A-Za-z'’\-]*[.,*†‡]*$|^[A-Z]\.?$|^(?:jr|Jr|sr|Sr|2d|3d|de|De|van|Van|von|Von|la|La|le|Le|du|Du|di|Di)[.,*†]*$")


def main():
    text, pm, ent = M.load_text(SRC, TID)
    lv = M.xml_leaves(XML, wanted=set(range(FIRST_LEAF, LAST_LEAF + 1)))
    stat = collections.Counter()
    for leaf, ws in lv.items():
        a, b = pm.span(leaf)
        ok, bad, nt = M.align(ws, text, a, b)
        stat['words'] += len(ws); stat['aligned'] += ok; stat['unaligned'] += bad
    rows, notes = A.parse(range(FIRST_LEAF, LAST_LEAF + 1), lambda l: lv.get(l, []), pm)
    seg = {'s': SRC, 'v': '1863', 't': TID, 'lay': 'cols'}
    by_unit = collections.defaultdict(list)
    diag = {'source': SRC, 'text_id': TID, 'xml_sha256': M.sha256_file(XML), 'alignment': dict(stat), 'units': {}, 'defects': {}, 'prose_lines_not_parsed': collections.Counter(), 'notes': notes[:300], 'outside_range': []}
    for r in rows:
        u = r['unit']
        lo, hi = LEAF_RANGE[u]
        if not (lo <= r['leaf'] <= hi):
            diag['outside_range'].append({'unit': u, 'leaf': r['leaf'], 'name': T.text_of(r['name'])})
            continue
        n0, age = r['n0'], r['age']
        allrest = sorted(r['rest'] + r['rest2'], key=lambda w: w['off'])
        xs = sorted(r['rest'], key=lambda w: w['x0'])
        # rank (field and staff and present-organisation tables): tokens in the rank band
        rank_w = []
        if r['kind'] == 'present' or r['co'] == 'FS':
            lo = (age['x0'] + 20) if age else (n0 + 480)
            rank_w = [w for w in r['rest'] if lo <= w['x0'] < n0 + 760 and w is not age]
        rest_w = [w for w in allrest if w not in rank_w]
        # muster / remark split (returns of companies only)
        code, basis = None, ''
        if r['kind'] == 'return' and r['co'] != 'FS':
            cand = [w for w in xs if n0 + 880 <= w['x0'] < n0 + 1180]
            toks_x = [w['w'] for w in xs if w['x0'] >= n0 + 880]
            k = next((i for i, w in enumerate(xs) if n0 + 880 <= w['x0'] < n0 + 1180 and re.sub(r'[^A-Za-z]', '', w['w']).lower() in A.MONTH and w['w'][0].isupper()), None)
            if k is not None:
                tail = [w['w'] for w in xs[k:]]
                ds = A.find_dates(tail)
                end = ds[0][2] if ds else 1
                muster = tail[:end]
                rem = [w['w'] for w in xs[k + end:]] + [w['w'] for w in sorted(r['rest2'], key=lambda w: w['off'])]
            else:
                muster = [w['w'] for w in cand]
                rem = [w['w'] for w in xs if w['x0'] >= n0 + 1180] + [w['w'] for w in sorted(r['rest2'], key=lambda w: w['off'])]
            carry = r.get('carry')
            code, basis, newcarry = A.infer_on_rolls(muster, rem, r['joined'], R_STATE.get((u, r['co']), {}).get('carry'))
            R_STATE.setdefault((u, r['co']), {})['carry'] = newcarry
        nw = sorted(r['name'], key=lambda w: w['off'])
        toks = [w['w'] for w in nw]
        bad_tok = sum(1 for t in toks if not NAME_OK.match(t))
        if age is None and r['co'] != 'FS' and r['kind'] != 'present' and bad_tok >= max(1, int(0.4 * len(toks))):
            diag.setdefault('non_person_lines', []).append({'unit': u, 'leaf': r['leaf'], 'text': ' '.join(toks + [w['w'] for w in sorted(r['rest'], key=lambda w: w['off'])])[:110]})
            continue
        fl = ''
        if any(not NAME_OK.match(t) for t in toks):
            fl += 'N'
        rank = ' '.join(w['w'] for w in sorted(rank_w, key=lambda w: w['off']))
        remarks = ' '.join(w['w'] for w in rest_w)
        off = nw[0]['off']
        rd = (rest_w[0]['off'] - off) if rest_w else 0
        row = R.row(' '.join(toks), rank, r['co'], remarks, pm.printed(r['leaf']), off, rd)
        by_unit[u].append((row, fl, r['rk'], code, basis, r['leaf']))
    os.makedirs(OUT, exist_ok=True)
    for u, lst in by_unit.items():
        lst.sort(key=lambda t: t[0][5])
        good, defects = [], []
        # carried rank (rk) goes into the row the way the unit file reads it: "^" + heading
        for row, fl, rk, code, basis, leaf in lst:
            r2 = list(row)
            r2[1] = r2[1] or ('^' + rk if rk else '')
            v = R.verify_rows([(seg, [r2])], {TID: text}, {TID: pm}, max_report=10)
            hard = [d for d in v['defects'] if d['kind'] != 'rank-not-in-leaf']
            if hard:
                defects.append({'leaf': leaf, 'name': row[0], 'kind': [d['kind'] for d in hard]})
            else:
                if v['defects']:
                    rank_unfound[u] += 1
                good.append((r2, fl, rk, code, basis))
        with open(os.path.join(OUT, 'rows-%s.jsonl' % u), 'w', encoding='utf-8') as f:
            for r2, fl, rk, code, basis in good:
                f.write(json.dumps(r2 + [fl, rk, 0, [code, basis] if code else None], ensure_ascii=False, separators=(',', ':')) + '\n')
        c = collections.Counter(g[3] for g in good)
        diag['units'][u] = {'candidates': len(lst), 'written': len(good), 'defects': len(defects), 'on_rolls': {str(k): v for k, v in c.items()}, 'carried_heading_not_found_above_in_text': rank_unfound[u]}
        diag['defects'][u] = defects[:300]
        print(u, len(lst), len(good), len(defects), dict(c))
    for n in notes:
        if 'prose' in n:
            diag['prose_lines_not_parsed'][n['unit']] += 1
    diag['prose_lines_not_parsed'] = dict(diag['prose_lines_not_parsed'])
    json.dump(diag, open(os.path.join(OUT, 'diag.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)


R_STATE = {}
rank_unfound = collections.Counter()

if __name__ == '__main__':
    main()
