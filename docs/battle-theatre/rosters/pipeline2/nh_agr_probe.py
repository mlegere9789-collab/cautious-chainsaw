"""Probe of the OCR text of the four Adjutant-General's reports of New Hampshire (1865, 1866), the second source of the work item union-nh (gap EG-ROS-NH-03).

    python3 -I nh_agr_probe.py        (reads the four pinned texts under tmp/library/rosters/NH-AGR-1865; writes
                                       GOVERNANCE/horde/ws-rosters/union-nh/agr-probe.json)

For each volume: the number of characters and leaves, the number of leaves with more than 30 words, how many of those read mostly as strings that are not English
(the share of words that are among the 60 common words below is under 0.10), and how often the strings "poyomorg" (an upside-down "promoted") and the regiment
headings occur.  It measures the text layer only; it does not read a table and it does not decode anything.  Standard library only.
"""
import sys, os, re, json, gzip

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..'))
D = os.path.join(ROOT, 'tmp', 'library', 'rosters', 'NH-AGR-1865')
OUT = os.path.join(ROOT, 'docs', 'battle-theatre', 'GOVERNANCE', 'horde', 'ws-rosters', 'union-nh', 'agr-probe.json')
ITEMS = [('NH-AGR-1865.1', 'reportofadjutant01newh'), ('NH-AGR-1865.2', 'reportofadjutant02newh'),
         ('NH-AGR-1865.1866-1', 'reportofadjutant661newh'), ('NH-AGR-1865.1866-2', 'reportofadjutant0266newh')]
COMMON = set('the of and to in a was is for on at by with as from that this his which were have had be are or an not it their they all but one two three four first '
             'second third state men company regiment battalion year years day month general adjutant new hampshire volunteers killed died wounded discharged '
             'mustered enlisted promoted transferred'.split())
KEYS = ['poyomorg', 'SECOND REGIMENT', 'FIFTH REGIMENT', 'Second Regiment', 'Fifth Regiment', 'Twelfth', 'Light Battery']


def main():
    out = {'_rule': 'a leaf with more than 30 words counts as not readable when fewer than 10 percent of its words are among %d common English words' % len(COMMON),
           'common_words': sorted(COMMON), 'items': {}}
    for tid, ident in ITEMS:
        t = gzip.open(os.path.join(D, ident + '_hocr_searchtext.txt.gz'), 'rb').read().decode('utf-8')
        pi = json.loads(gzip.open(os.path.join(D, ident + '_hocr_pageindex.json.gz'), 'rb').read().decode('utf-8'))
        many = bad = 0
        for r in pi:
            w = re.findall(r'[A-Za-z]{2,}', t[r[0]:r[1]].lower())
            if len(w) > 30:
                many += 1
                if sum(1 for x in w if x in COMMON) / len(w) < 0.10:
                    bad += 1
        out['items'][tid] = {'identifier': ident, 'characters': len(t), 'leaves': len(pi), 'leaves_with_more_than_30_words': many, 'of_them_not_readable': bad,
                             'occurrences': {k: t.count(k) for k in KEYS}}
        print(tid, out['items'][tid])
    json.dump(out, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main()
