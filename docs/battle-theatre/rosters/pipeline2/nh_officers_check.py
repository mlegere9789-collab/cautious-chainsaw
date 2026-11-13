"""Check that the Register of commissioned officers of the Ayling volume (vol. 2, printed pp. 1225-1248) names no man who is not in the roll of the unit.

    python3 -I nh_officers_check.py        (reads the pinned text of NH-AYLING-1895.2 and the four unit files; writes
                                            GOVERNANCE/horde/ws-rosters/union-nh/officers-register-check.json)

The register is printed as run-on lines "Surname, Given, Co. A." under rank headings.  Each line is cut at its terminator (Co. X. / Cos. X and Y. / Not mustered.)
and compared with the rows of the unit by surname (difflib ratio at least 0.8) and the first given name (same first letter, or difflib ratio at least 0.6: the two printings carry different OCR damage).  A line that matches no row is listed.
A line that matches no row gets a second automatic pass: the best roll rows by difflib ratio of the whole printed name (at least 0.75), listed as candidates.
A candidate is not a match: it is where to look.  Nothing here is written into a unit file: it is a check, not a segment.  Standard library only.
"""
import sys, os, re, json, difflib
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import r2lib as R

ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..'))
D = os.path.join(ROOT, 'tmp', 'library', 'rosters', 'NH-AYLING-1895')
IDENT = 'cu31924096263136'
UNITS = [('2nd-new-hampshire-infantry', r'SECOND\s+REGIMENT\.', r'THIRD\s+REGIMENT\.'), ('5th-new-hampshire-infantry', r'FIFTH\s+REGIMENT\.', r'SIXTH\s+REGIMENT\.'),
         ('12th-new-hampshire-infantry', r'TWELFTH\s+(?:REGIMENT|BEGIM-ENT)\.', r'THIRTEENTH\s+REGIMENT\.'), ('1st-new-hampshire-battery', r'FIRST\s+NEW\s+HAMPSHIRE\s+LIGHT\s+BATTERY\.', r'FIRST\s+COMPANY')]
ENT = re.compile(r"([A-Za-z][A-Za-z'\-\.]*(?:\s+[A-Za-z]{1,12})?),\s+((?:[A-Za-z][A-Za-z\.'\-]*,?\s+){1,5}?)(?=Cos?\.|Not\s+mustered|[A-Z][A-Za-z'\-]+,\s)")


def key(n):
    return re.sub(r'[^a-z]', '', n.lower())


def main():
    t = R.load_text(os.path.join(D, IDENT + '_hocr_searchtext.txt.gz'))
    pm = R.PageMap(os.path.join(D, IDENT + '_hocr_pageindex.json.gz'), os.path.join(D, IDENT + '_page_numbers.json'))
    a0, b0 = pm.span(643)[0], pm.span(667)[1]
    reg = t[a0:b0]
    out = {}
    for unit, head_re, next_re in UNITS:
        m = [x for x in re.finditer(head_re, reg)]
        assert m, unit
        st = m[0].end()
        n = re.search(next_re, reg[st:])
        sec = re.sub(r'\s+', ' ', reg[st:st + (n.start() if n else 3000)])
        head, segs, meta = R.read_unit(os.path.join(ROOT, 'docs', 'battle-theatre', 'rosters', 'data2', 'union', 'nh', unit + '.jsonl.gz'))
        rows = [r for _, rr in segs for r in rr]
        rk = []
        for r in rows:
            toks = r[0].replace(',', ' , ').split()
            sur = re.sub(r'[^a-z]', '', toks[0].lower()) if toks else ''
            giv = next((re.sub(r'[^a-z]', '', x.lower()) for x in toks[1:] if re.sub(r'[^a-z]', '', x)), '')
            rk.append((sur, giv))
        ents = []
        for e in re.finditer(r"([A-Z][A-Za-z'\-]+(?:\s+[A-Z][a-z]+)?),\s+([A-Z][A-Za-z\.'\-]*(?:\s+[A-Z][A-Za-z\.'\-]*){0,3})\s*,?\s*(?=Cos?\.|\.?\s*Not\s+mustered|[A-Z][A-Za-z'\-]+,\s|$)", sec):
            ents.append((e.group(1), e.group(2)))
        miss = []
        for sur, giv in ents:
            s = key(sur)
            g = key(giv.split()[0]) if giv.split() else ''
            if not any(difflib.SequenceMatcher(None, s, rs).ratio() >= 0.8 and (not g or not rg or rg[:1] == g[:1] or difflib.SequenceMatcher(None, g, rg).ratio() >= 0.6) for rs, rg in rk):
                miss.append('%s, %s' % (sur, giv))
        whole = lambda n: re.sub(r'[^a-z ]', '', n.lower())
        cands = []
        for line in miss:
            best = sorted(((round(difflib.SequenceMatcher(None, whole(line), whole(r[0])).ratio(), 2), r[0], r[2]) for r in rows), reverse=True)[:2]
            cands.append({'line': line, 'best_roll_rows': [{'ratio': b[0], 'name': b[1], 'company': b[2]} for b in best if b[0] >= 0.75]})
        out[unit] = {'register_lines': len(ents), 'not_matched_to_a_roll_row': len(miss), 'unmatched': miss, 'second_pass_candidates': cands,
                     'unmatched_with_a_candidate': sum(1 for c in cands if c['best_roll_rows'])}
        print(unit, len(ents), 'unmatched', len(miss), 'with a candidate', out[unit]['unmatched_with_a_candidate'], miss[:12])
    json.dump(out, open(os.path.join(ROOT, 'docs', 'battle-theatre', 'GOVERNANCE', 'horde', 'ws-rosters', 'union-nh', 'officers-register-check.json'), 'w', encoding='utf-8'), indent=1, ensure_ascii=False)


if __name__ == '__main__':
    main()
