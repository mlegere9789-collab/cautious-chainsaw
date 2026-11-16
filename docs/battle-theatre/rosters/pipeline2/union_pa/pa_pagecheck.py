"""Pages of the Bates volumes that were compared with the printed page, line by line, and what the files say about them.

    python3 -I docs/battle-theatre/rosters/pipeline2/union_pa/pa_pagecheck.py          (from the repository root, after pa_build.py)

For each page below the printed name lines were counted on the rendered page image (the count in PRINTED is a reading of the image made for this item, by the
same engineer who wrote the parser: it is NOT an independent sample, gate R-G9 is not run) and compared with the lines written (rows of the unit file) plus the
lines listed as lost (name cell lost by the text layer) for that leaf.  Where the three numbers do not agree the difference is printed and kept in the note.

Writes  GOVERNANCE/horde/ws-rosters/union-pa/page-checks.json    {"pages": [{vol, leaf, printed_page, unit, printed_lines, written, lost, agrees, note}], "method": ...}
"""
import os, sys, json, glob
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import pa_lib as L

# (volume, leaf, unit key fragment, printed name lines counted on the image, what the page is)
PRINTED = [
    (1, 586, '-1st-pennsylvania-reserves', 34, 'field and staff and band of the 1st Reserves'),
    (1, 592, '-1st-pennsylvania-reserves', 67, 'company roll of the 1st Reserves'),
    (1, 555, '-29th-pennsylvania-infantry', 74, 'company roll of the 29th'),
    (1, 1015, '-battery-b-1st-pennsylvania-light-artillery', 19, 'Battery B lines of a page shared with Battery C (Battery C is not an item of this work)'),
    (2, 241, '-56th-pennsylvania-infantry', 72, 'company roll of the 56th'),
    (2, 395, '-3rd-pennsylvania-cavalry', 51, 'company roll of the 3rd Cavalry'),
    (3, 1360, '-118th-pennsylvania-infantry', 56, 'company roll of the 118th'),
    (3, 155, '-8th-pennsylvania-cavalry', 54, 'end of Company F and the officers and men of Company G, 8th Cavalry'),
    (4, 662, '-149th-pennsylvania-infantry', 48, 'company roll of the 149th'),
    (4, 773, '-battery-h-3rd-pennsylvania-heavy-artillery-section', 16, 'Battery H lines of a page that begins with the end of Battery G'),
    (4, 775, '-battery-h-3rd-pennsylvania-heavy-artillery-section', 78, 'Battery H, privates D to M'),
    (5, 893, '-pennsylvania-independent-batteries-c-and-f', 77, 'Independent Battery C (Thompson\'s), privates'),
    (5, 920, '-pennsylvania-independent-batteries-c-and-f', 77, 'Independent Battery F (Hampton\'s), privates I to P'),
]
NOTES = json.load(open(os.path.join(HERE, 'pa_pagecheck_notes.json'))) if os.path.exists(os.path.join(HERE, 'pa_pagecheck_notes.json')) else {}


def main():
    out = []
    caches = {}
    for vol, leaf, frag, printed, what in PRINTED:
        fs = [f for f in glob.glob(os.path.join(L.WORK, 'rows-*.json')) if frag in f]
        assert len(fs) == 1, (frag, fs)
        d = json.load(open(fs[0]))
        if vol not in caches:
            caches[vol] = L.load_text(vol)
        pm = caches[vol][1]
        written = sum(1 for x in d['rows'] if x['leaf'] == leaf)
        lost = sum(1 for x in d['rejected'] if x['leaf'] == leaf)
        on_leaf = [x for x in d['rows'] if x['leaf'] == leaf]
        ent = {'vol': vol, 'leaf': leaf, 'printed_page': pm.printed(leaf), 'unit': d['unit'], 'what': what, 'printed_lines': printed, 'written': written, 'lost': lost,
               'agrees': written + lost == printed, 'd_flag': sum(1 for x in on_leaf if 'D' in x['facts']['flags'])}
        if (vol, leaf) == (4, 662):
            ent['n_examples'] = [x['row'][0] for x in on_leaf if 'N' in x['facts']['flags'] and "M'" in x['row'][0]][:2]
        ent['note'] = ''
        n = NOTES.get('%d/%d' % (vol, leaf))
        if n:
            ent['note'] = n
        out.append(ent)
        print('%d/%-5d p.%-5s %-50s printed %3d written %3d lost %3d %s' % (vol, leaf, ent['printed_page'], d['unit'][5:55], printed, written, lost, 'ok' if ent['agrees'] else 'DIFFERS'))
    json.dump({'pages': out, 'method': 'printed name lines counted on the rendered page image (one engineer, not an independent sample); written = lines of the unit file on the leaf; lost = lines whose name cell the text layer lost (listed in diag/<unit>.json)'},
              open(os.path.join(L.GOV, 'page-checks.json'), 'w'), indent=1)


if __name__ == '__main__':
    main()
