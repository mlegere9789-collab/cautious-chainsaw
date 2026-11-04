"""Map every non-empty line of an IA *_djvu.txt to its scan page index using the sibling *_djvu.xml (same OCR run).
Output work/leafmap_<tag>.json = {"n_nonempty_txt":..,"n_xml_lines":..,"leaf_of_line": {txt_line_no: leaf_index}}   (leaf_index 0-based = IA page index; image URL uses 'n<leaf>')"""
import sys, os, re, json
sys.path.insert(0, os.path.dirname(__file__))
import xml.etree.ElementTree as ET
from ncla_common import CACHE, DATA, low_priority


def lines_of_xml(path):
    out = []   # (leaf, text)
    leaf = -1
    for ev, el in ET.iterparse(path, events=('start', 'end')):
        tag = el.tag.split('}')[-1]
        if ev == 'start' and tag == 'OBJECT':
            leaf += 1
        elif ev == 'end' and tag == 'LINE':
            t = ' '.join((w.text or '') for w in el if w.tag.split('}')[-1] == 'WORD')
            out.append((leaf, re.sub(r'\s+', ' ', t).strip()))
            el.clear()
    return out


def build(txtname, xmlname, tag):
    low_priority()
    txt = open(os.path.join(CACHE, txtname), encoding='utf-8', errors='replace').read().split('\n')
    ne = [(i, re.sub(r'\s+', ' ', l).strip()) for i, l in enumerate(txt) if l.strip()]
    xl = [x for x in lines_of_xml(os.path.join(CACHE, xmlname)) if x[1]]
    res = dict(n_nonempty_txt=len(ne), n_xml_lines=len(xl), leaf_of_line={})
    # sequential alignment with resync on mismatch
    j = 0
    mism = 0
    for i, t in ne:
        if j >= len(xl):
            break
        if xl[j][1] != t:
            # look ahead a few lines
            found = None
            for d in range(1, 6):
                if j + d < len(xl) and xl[j + d][1] == t:
                    found = j + d
                    break
            if found is None:
                mism += 1
                res['leaf_of_line'][i] = xl[j][0]
                j += 1
                continue
            j = found
        res['leaf_of_line'][i] = xl[j][0]
        j += 1
    res['mismatches'] = mism
    json.dump(res, open(os.path.join(DATA, 'work', f'leafmap_{tag}.json'), 'w'), separators=(',', ':'))
    print(tag, res['n_nonempty_txt'], res['n_xml_lines'], 'mismatch', mism, flush=True)


if __name__ == '__main__':
    import glob
    tag = sys.argv[1]
    txtname = os.path.basename(glob.glob(os.path.join(CACHE, tag + '.*_djvu.txt'))[0])
    xmlname = os.path.basename(glob.glob(os.path.join(CACHE, tag + '.*_djvu.xml'))[0])
    build(txtname, xmlname, tag)
