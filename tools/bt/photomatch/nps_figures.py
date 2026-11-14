#!/usr/bin/env python3
"""Third pass (2026-11-14): the 1863 photographs that the NPS Cultural Landscape Report for Gettysburg National Military Park, Record of Treatment (volumes I and II, 2018), prints
as figures with a direction of view (and, for some, the place) and a collection number of the park (GETT 41135 / 41136) or a Library of Congress Digital ID.
Why: the saved texts of the two volumes hold about 40 such captions ('View southwest from Rose Barn, 1863 (GETT 41135, Historic Photograph Collection, 2B-2063)') that no earlier pass used as
camera-position statements, because the park's numbers say nothing about which Library of Congress record the picture is. The figure images are in the PDFs (re-fetched 2026-11-14 from
npshistory.com, sha256 equal to the manifest of the first fetch); the historic photographs are stored there inverted (DeviceN), so they were extracted with pdfimages and inverted.
This script (1) cuts each caption verbatim out of the saved text (a caption it cannot find stops the run), (2) writes nps_figures.json (caption, page, figure number, direction and place words,
image file and its sha256); match_third_pass.py then ties each image to the catalogued Library of Congress records by feature matching, and statements_data.py quotes the caption for the matched records.
Spec rows: (id, source, pdf page, figure number, image file under tmp/photomatch/nps_pdf/pos/, direction, place, date_in_caption, credit_kind, note).
Usage: python3 -I tools/bt/photomatch/nps_figures.py"""
import json, os, re, hashlib
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
NPS = os.path.join(ROOT, 'tmp', 'library', 'web', 'nps'); POS = os.path.join('tmp', 'photomatch', 'nps_pdf', 'pos')
def norm(s): return re.sub(r'\s+', ' ', s).strip()
def pages_of(path):
    t = open(path, encoding='utf-8', errors='replace').read(); parts = re.split(r'=== PAGE (\d+) ===', t)
    return {int(parts[i]): norm(parts[i + 1]) for i in range(1, len(parts), 2)}
SRC = {'V1': 'NPS-CLR-ROT-V1', 'V2': 'NPS-CLR-ROT-V2'}
# (vol, pdf page, 'Figure N' as printed, image stem in pos/, direction, place named in the caption, credit kind, id kind)
SPEC = [
 ('V1', 58, 'Figure 6.', 'v1_p058-000', 'southwest', 'Rose Barn', 'GNMP'),
 ('V1', 125, 'Figure 28.', 'v1_p125-000', 'southeast', 'McPherson Farm', 'GNMP'),
 ('V1', 130, 'Figure 41.', 'v1_p130-000', 'southeast', None, 'GNMP'),
 ('V1', 157, 'Figure 75.', 'v1_p157-000', 'northwest', 'Cemetery Hill', 'LOC'),
 ('V1', 159, 'Figure 79 (top).', 'v1_p159-000', 'northwest', 'Cemetery Hill', 'LOC'),
 ('V1', 243, 'Figure 146.', 'v1_p243-000', 'northeast', 'Little Round Top', 'LOC'),
 ('V1', 251, 'Figure 163.', 'v1_p251-000', 'northeast', 'Little Round Top', 'LOC'),
 ('V1', 253, 'Figure 168.', 'v1_p253-000', 'northwest', None, 'GNMP'),
 ('V1', 263, 'Figure 188.', 'v1_p263-000', 'north', 'Little Round Top', 'GNMP'),
 ('V1', 265, 'Figure 193.', 'v1_p265-000', 'south', None, 'GNMP'),
 ('V1', 277, 'Figure 196.', 'v1_p277-000', 'northwest', None, 'LOC'),
 ('V1', 282, 'Figure 206.', 'v1_p282-000', 'northwest', None, 'LOC'),
 ('V1', 283, 'Figure 209.', 'v1_p283-000', 'northwest', None, 'LOC'),
 ('V1', 307, 'Figure 213.', 'v1_p307-000', 'east', 'Evergreen Cemetery Gatehouse', 'GNMP'),
 ('V1', 316, 'Figure 231.', 'v1_p316-000', 'east', 'East Cemetery Hill', 'GNMP'),
 ('V1', 317, 'Figure 233.', 'v1_p317-000', 'north', "Greene's Brigade breastworks", 'Tipton'),
 ('V1', 432, 'Figure 353.', 'v1_p432-000', 'northwest', None, 'Boardman'),
 ('V1', 433, 'Figure 355.', 'v1_p433-000', 'northeast', None, 'Boardman'),
 ('V2', 114, 'Figure 15.', 'v2_p114-000', 'east', 'Rose Field 10', 'GNMP'),
 ('V2', 116, 'Figure 19.', 'v2_p116-000', 'west', 'Little Round Top', 'GNMP'),
 ('V2', 120, 'Figure 27.', 'v2_p120-000', 'northwest', 'Rose Field 10', 'GNMP'),
 ('V2', 121, 'Figure 29.', 'v2_p121-000', 'southwest', 'Rose Barn', 'GNMP'),
 ('V2', 122, 'Figure 31 (left).', 'v2_p122-000', 'southwest', 'Rose Field 10', 'GNMP'),
 ('V2', 123, 'Figure 33.', 'v2_p123-000', 'southwest', 'Rose Field 10', 'GNMP'),
 ('V2', 134, 'Figure 56.', 'v2_p134-000', 'west', 'Little Round Top', 'GNMP'),
 ('V2', 149, 'Figure 61.', 'v2_p149-000', 'northwest', 'Little Round Top', 'GNMP'),
 ('V2', 150, 'Figure 63.', 'v2_p150-000', 'west', None, 'USAHEC'),
 ('V2', 151, 'Figure 65.', 'v2_p151-000', 'southeast', None, 'LOC'),
 ('V2', 152, 'Figure 67.', 'v2_p152-000', 'southeast', None, 'GNMP'),
 ('V2', 178, 'Figure 83.', 'v2_p178-000', 'southwest', 'Little Round Top', 'GNMP'),
 ('V2', 181, 'Figure 89.', 'v2_p181-000', 'southwest', 'Little Round Top', 'GNMP'),
 ('V2', 329, 'Figure 129.', 'v2_p329-000', 'southeast', 'East Cemetery Hill', 'GNMP'),
 ('V2', 329, 'Figure 130.', 'v2_p329-001', 'north', "near McKnight's Hill", 'GNMP'),
 ('V2', 329, 'Figure 131.', 'v2_p329-002', 'northwest', 'Cemetery Hill', 'LOC'),
 ('V2', 336, 'Figure 132.', 'v2_p336-000', 'southeast', 'East Cemetery Hill', 'GNMP'),
 ('V2', 344, 'Figure 137.', 'v2_p344-000', 'northwest', None, 'LOC'),
]
def caption(text, fig):
    """From 'Figure N.' to the end of its credit: the first ')' that closes the parenthesis opened after the date, or the next 'Figure'."""
    i = text.find(fig)
    if i < 0: return None
    j = text.find('Figure ', i + len(fig)); seg = text[i:(j if j > 0 else i + 400)]
    m = re.search(r'\((?:GETT|Library of Congress|Sue Boardman|Civil War Photographs)[^()]*\)', seg)
    return norm(seg[:m.end()]) if m else None
def main():
    P = {v: pages_of(os.path.join(NPS, SRC[v], SRC[v] + '.txt')) for v in SRC}; out = []; bad = []
    for vol, pg, fig, stem, d, place, kind in SPEC:
        cap = caption(P[vol][pg], fig)
        img = os.path.join(POS, stem + '_pos.png')
        if not cap: bad.append((vol, pg, fig)); continue
        if not os.path.exists(os.path.join(ROOT, img)): bad.append((vol, pg, fig, 'image missing ' + img)); continue
        ci = P[vol][pg].find(cap)
        h = hashlib.sha256(open(os.path.join(ROOT, img), 'rb').read()).hexdigest()
        m = re.search(r'(\d{4}|circa \d{4}s?|\d{4}s)\s*\(', cap); year = m.group(1) if m else None
        gn = re.search(r'(?:Collection|Historic Photograph Collection),? ([0-9A-Z][\w-]+)\)', cap) or re.search(r', (GLS\d+|SV\d+)\)', cap)
        out.append({'id': f'NF-{vol}-p{pg:03d}-{stem[-3:]}', 'source': SRC[vol], 'pdf_page': pg, 'figure': fig.rstrip('.'), 'caption': cap, 'offset_in_normalised_page': ci,
                    'direction_word': d, 'place_named': place, 'credit_kind': kind, 'park_or_collection_number': gn.group(1) if gn else None, 'date_in_caption': year,
                    'image': img, 'image_sha256': h, 'is_detail': cap.find('Detail of') >= 0})
    if bad: raise SystemExit('captions or images not found: %r' % (bad,))
    json.dump({'_doc': 'Captions (verbatim, found in the saved text of the NPS Record of Treatment) of the 1863 photographs printed as figures in volumes I and II, with the image extracted from the PDF (inverted to positive). direction_word and place_named are the caption words; credit_kind GNMP = the park collection (GETT 41135), LOC = Library of Congress Digital ID in the caption, others as named. No coordinate anywhere.',
               'count': len(out), 'figures': out}, open(os.path.join(HERE, 'nps_figures.json'), 'w'), indent=1, ensure_ascii=False)
    print(len(out), 'figure captions written')
if __name__ == '__main__': main()
