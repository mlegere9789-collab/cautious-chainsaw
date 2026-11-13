"""Prototype of the roster2/1 writer on one 'flow' source: the 26th North Carolina in Moore's Roster of North Carolina
Troops (1882), vol. 2 (Internet Archive rosterofnorthcar02nort, hocr search text).  Planning evidence only: it measures what a
real unit file looks like (bytes per line, locatability), it is not the production parser and its output is not product data.

    python3 -I docs/battle-theatre/rosters/pipeline2/proto_flow_moore.py OUT_DIR       (run from the repository root)

Segmentation rule (one rule, applied to the text as printed, nothing corrected):
  * the section runs from the heading "TWENTY-SIXTH REGIMENT-- INFANTRY." to the heading "TWENTY-SEVENTH REGIMENT";
  * headings FIELD AND STAFF / COMPANY X / OFFICERS / NON-COMMISSIONED OFFICERS / PRIVATES set co and the carried rank;
  * an entry starts at a line that begins  Surname, Given,  or  Given Surname,  followed by a rank word, "e." or "cm.";
    a line that does not start an entry continues the entry above; a line that holds two entries is cut where a name
    followed by a comma and a rank word or "e." / "cm." follows a closing period.
"""
import sys, os, re, json, gzip

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import r2lib as R

ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..'))
D = os.path.join(ROOT, 'tmp', 'library', 'rosters', 'NC-MOORE-1882')
IDENT = 'rosterofnorthcar02nort'

RANKS = r"(?:Colonel|Lieutenant\s+Colonel|Lieut\.?\s+Colonel|Major|Captain|Adjutant|Surgeon|Assistant\s+Surgeon|Chaplain|Quartermaster|Q\.?\s*M\.?|A\.?\s*Q\.?\s*M\.?|A\.?\s*C\.?\s*S\.?|Sergeant\s+Major|(?:1st|2nd|3rd|4th|5th|Srd|2d|3d|lst|1\.?st)\s+(?:Lieut\.?|Lieutenant|Sergeant|Corporal|Serg\.?)|Lieut\.?|Lieutenant|Sergeant|Corporal|Musician|Wagoner|Blacksmith|Ordnance\s+Sergeant|Commissary|Hospital\s+Steward|Surgeon|Drummer|Fifer|Teamster)"
MARK = r"(?:e\.|cm\.|cm,|ciri\.|c\.|d\.|k\.|w\.|p\.|tr\.|pr\.)"
NAMETOK = r"[^\s,;:()]{1,25}"   # one name word: any characters but blank, comma and the clause marks (OCR garble such as Burg^\yn stays inside the word)
# an entry head:  Surname, Given[ Given],  (rank|marker)    or    Given [I.] Surname,  (rank|marker)
HEAD_SURNAME_FIRST = re.compile(r"(?P<name>%s,\s+(?:%s\s+){0,3}%s,)\s+(?=(?:%s|%s))" % (NAMETOK, NAMETOK, NAMETOK, RANKS, MARK))
HEAD_GIVEN_FIRST = re.compile(r"(?P<name>(?:%s\s+){1,4}%s,)\s+(?=(?:%s|%s))" % (NAMETOK, NAMETOK, RANKS, MARK))
HEADINGS = [
    (re.compile(r'^\s*FIELD\s+AND\s+STAFF'), 'FS', '^Officers'),
    (re.compile(r'^\s*C\S{0,3}MPANY\s+([A-Za-z]{1,2})\s*[\.,]?\s*$'), None, '^Officers'),
    (re.compile(r'^\s*OFFICERS\s*\.?\s*$'), None, '^Officers'),
    (re.compile(r'^\s*(?:NON|NOX)[\s\-]*C\S{0,15}\s*(?:OFFICERS)?\s*\.?\s*$'), None, '^NonCommissioned'),
    (re.compile(r'^\s*PRIVATES\s*\.?\s*$'), None, '^Privates'),
    (re.compile(r'^\s*MUSICIANS\s*\.?\s*$'), None, '^Musicians'),
]
CMAP = {'A': 'A', 'B': 'B', 'a': 'C', 'C': 'C', 'D': 'D', 'E': 'E', 'F': 'F', 'G': 'G', 'II': 'H', 'H': 'H', 'I': 'I', 'K': 'K'}
FURNITURE = re.compile(r'^(?:[\W\d]{0,4}\d{3}\W*)?(?:\s*(?:Field\s+and\s+Staff|Company\s+\S{1,2}|Twenty\W*Sixth|North\s+Caro)\S*[\s\-—―]*\S*\s*(?:Regiment)?\s*\d*\s*)$', re.I)


def main(outdir):
    text = R.load_text(os.path.join(D, IDENT + '_hocr_searchtext.txt.gz'))
    pm = R.PageMap(os.path.join(D, IDENT + '_hocr_pageindex.json.gz'), os.path.join(D, IDENT + '_page_numbers.json'))
    a = text.index('TWENTY-SIXTH  REGIMENT')                       # heading as the OCR prints it
    b = text.index('TWENTY-SEVENTH  REGIMENT', a)
    sec = text[a:b]
    # ---- lines with absolute offsets
    lines, p = [], a
    for ln in sec.split('\n'):
        lines.append((p, ln))
        p += len(ln) + 1
    rows, co, rankc = [], 'FS', '^Officers'
    cur = None            # [start_off, end_off, co, rankc]
    entries = []

    def flush():
        nonlocal cur
        if cur:
            entries.append(cur)
        cur = None

    skipped = []
    for off, ln in lines:
        s = ln.strip()
        if not s:
            continue
        hit = False
        for rx, c, rk in HEADINGS:
            m = rx.match(ln)
            if m:
                flush()
                if c:
                    co = c
                elif m.groups():
                    co = CMAP.get(m.group(1), m.group(1).upper())
                rankc = rk
                hit = True
                break
        if hit:
            continue
        if FURNITURE.match(s) or re.match(r'^(?:e|d|dg|dt|k|m|p|pr|r|tr|w|c|cm|co|com)\s+[a-z]+\.?\s*$', s) or s.startswith('ABBREVIATIONS') or 'REGIMENT' in s.upper()[:30] and len(s) < 60:
            skipped.append((off, s[:60]))
            continue
        # cut points inside the line: every position where an entry head begins
        cuts = []
        for rx in (HEAD_SURNAME_FIRST, HEAD_GIVEN_FIRST):
            for m in rx.finditer(ln):
                st = m.start('name')
                if st == 0 or re.search(r'[\.\;\?]\s*$', ln[:st]) or ln[st - 1:st] == ' ' and re.search(r'(?:co|co\.|Com|\.)\s*$', ln[:st]):
                    cuts.append((st, m.group('name')))
        cuts = sorted(set(cuts))
        # drop heads nested in another head (a given-first head found inside a surname-first head)
        keep, last_end = [], -1
        for st, nm in cuts:
            if st >= last_end:
                keep.append((st, nm))
                last_end = st + len(nm)
        if not keep:
            if cur:
                cur[1] = off + len(ln.rstrip())
            else:
                skipped.append((off, s[:60]))
            continue
        if keep[0][0] > 0 and cur:                       # text before the first head continues the entry above
            cur[1] = off + keep[0][0]
        for k, (st, nm) in enumerate(keep):
            flush()
            end = keep[k + 1][0] if k + 1 < len(keep) else len(ln.rstrip())
            cur = [off + st, off + end, co, rankc, nm]
    flush()

    # ---- entries -> rows
    segs_rows = []
    for e in entries:
        st, en, c, rk, nm = e
        raw = text[st:en]
        # the name is the head as matched; rank word and remarks follow
        nm_end = st + len(nm)
        rest = text[nm_end:en]
        mrank = re.match(r'\s*(%s)\s*,?\s+' % RANKS, rest)
        rank = rk
        rem_from = nm_end
        if mrank:
            rank = mrank.group(1)
            rem_from = nm_end + mrank.end()
        else:
            m2 = re.match(r'\s+', rest)
            rem_from = nm_end + (m2.end() if m2 else 0)
        remarks = text[rem_from:en]
        name = nm.rstrip(',') if True else nm
        leaf = pm.leaf(st)
        page = pm.printed(leaf) if leaf is not None else None
        rows.append(R.row(name, rank, c, remarks, page, st, rem_from - st))
    # entries whose co/rank came from a heading are stored with '^' only when no rank is printed
    seg = {'s': 'NC-MOORE-1882', 'v': '2', 't': 'NC-MOORE-1882.2', 'lay': 'flow'}
    os.makedirs(outdir, exist_ok=True)
    path = os.path.join(outdir, '26th-north-carolina-infantry.jsonl.gz')
    info = R.write_unit(path, 'c-nc-26th-north-carolina-infantry', 'confederate', 'nc', '26th North Carolina Infantry', [(seg, rows)])
    head, segs, meta = R.read_unit(path)
    st = R.verify_rows(segs, {seg['t']: text}, {seg['t']: pm})
    lens = sorted(len(R.dumps_line(r).encode('utf-8')) + 1 for r in rows)
    out = {'unit': head['u'], 'rows': len(rows), 'raw_bytes': info['raw'], 'gz_bytes': info['gz'], 'mean_line': round(sum(lens) / len(lens), 1),
           'median_line': lens[len(lens) // 2], 'p90_line': lens[int(len(lens) * .9)], 'share_over_90': round(sum(1 for x in lens if x > 90) / len(lens), 3),
           'verify': {k: v for k, v in st.items() if k != 'defects'}, 'defect_samples': st['defects'][:8],
           'gettysburg_rows': R.gettysburg_rows(segs), 'skipped_lines': len(skipped), 'skipped_sample': skipped[:12],
           'by_company': {c: sum(1 for r in rows if r[2] == c) for c in sorted({r[2] for r in rows})}}
    json.dump(out, open(os.path.join(outdir, 'proto_moore26_stats.json'), 'w'), indent=1)
    with open(os.path.join(outdir, 'proto_moore26_sample.jsonl'), 'w', encoding='utf-8') as f:
        for r in rows[:25] + rows[300:310]:
            f.write(R.dumps_line(r) + '\n')
    print(json.dumps(out, indent=1))


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'tmp', 'library', 'rosters', '_proto'))
