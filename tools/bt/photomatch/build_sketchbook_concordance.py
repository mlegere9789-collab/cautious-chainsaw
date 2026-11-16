#!/usr/bin/env python3
"""Fifth photo-match session (2026-11-16): the concordance of the ten Gettysburg plates of Gardner's Photographic Sketch Book of the War, volume 1 (plates 35 to 44; Library of Congress copy ppmsca.12834) with the
catalogued records of the Library, and what the photographer's own letterpress says about where the camera stood.
Inputs: the Library's records (tmp/library/web/photomatch/fourth/loc_items, fresh JSON of 2026-11-16: the call number 'Illus. in E468.7 .G2, v. 1, no. N' is the Library's own tie of a record to a plate),
tmp/library/web/photomatch/sketchbook_v1/manifest.json (the letterpress pages read by machine from the master scans), position_statements.json (which statement quotes which plate).
The printed title, credit line and date under each plate (the 'printed' block) were read by eye from the 1024-px page images on 2026-11-16 (contact sheets looked at; the strip under each print enlarged); they are not machine-read.
Output: tools/bt/photomatch/sketchbook_concordance.json.   Usage: python3 -I tools/bt/photomatch/build_sketchbook_concordance.py"""
import json, os, re
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
LOC = os.path.join(ROOT, 'tmp', 'library', 'web', 'photomatch', 'fourth', 'loc_items')
SB = os.path.join(ROOT, 'tmp', 'library', 'web', 'photomatch', 'sketchbook_v1')
# plate: (text page, plate page, title as printed under the print, credit as printed, loc record ids by call number, other prints of the same plate that the registry knows)
PLATES = {
 35: (77, 78, 'Gettysburg, Pennsylvania.', "Negative by T. H. O'Sullivan. ... Positive by A. Gardner, 511 7th St., Washington.", ['2006685383'], ['2014646001']),
 36: (79, 80, 'A Harvest of Death, Gettysburg, Pennsylvania.', "Negative by T. H. O'Sullivan. ... Positive by A. Gardner, 511 7th St., Washington.", ['2006685384'], []),
 37: (81, 82, 'Field where General Reynolds Fell, Gettysburg.', "Negative by T. H. O'Sullivan. ... Positive by A. Gardner, 511 7th St., Washington.", ['2006685385'], []),
 38: (83, 84, 'Interior of Breastworks on Round Top, Gettysburg.', "Negative by T. H. O'Sullivan. ... Positive by A. Gardner, 511 7th St., Washington.", ['2006685386'], []),
 39: (85, 86, 'Gateway of Cemetery, Gettysburg.', "Negative by T. H. O'Sullivan. ... Positive by A. Gardner, 511 7th St., Washington.", ['2006692500'], ['2012647705']),
 40: (87, 88, "A Sharpshooter's Last Sleep, Gettysburg, Pennsylvania.", 'Alex. Gardner, Photographer. ... 511 Seventh Street, Washington.', ['2006692501'], []),
 41: (89, 90, 'Home of a Rebel Sharpshooter, Gettysburg.', 'Alex. Gardner, Photographer. ... 511 Seventh Street, Washington.', ['2006692502'], []),
 42: (91, 92, "Trossell's House, Battle-Field of Gettysburg.", "Negative by T. H. O'Sullivan. ... Positive by A. Gardner, 511 7th St., Washington.", ['2006692513'], []),
 43: (93, 94, 'Head-Quarters Major General George G. Meade, during the Battle of Gettysburg.', "Negative by T. H. O'Sullivan. ... Positive by A. Gardner, 511 7th St., Washington.", ['2006692514'], []),
 44: (95, 96, 'Slaughter Pen, Foot of Round Top, Gettysburg.', "Negative by T. H. O'Sullivan. ... Positive by A. Gardner, 511 7th St., Washington.", ['2006692515'], []),
}
def main():
    man = json.load(open(os.path.join(SB, 'manifest.json')))['pages']; st = json.load(open(os.path.join(HERE, 'position_statements.json')))['statements']
    out = []
    for n, (tp, pp, title, credit, recs, other) in PLATES.items():
        calls = {}
        for r in recs:
            it = json.load(open(os.path.join(LOC, f'item_{r}.json')))['item']; calls[r] = it.get('call_number')
            assert re.search(r'v\. 1, no\. %d\b' % n, calls[r] or ''), (r, calls[r])   # the Library's own number must be this plate
        m = man['%05d' % tp]; stm = [s['id'] for s in st if s['src'] == 'GARDNER-SB1-P%d' % tp]
        out.append({'plate': n, 'letterpress_page': tp, 'plate_page': pp, 'printed_title': title, 'printed_credit': credit, 'printed_date': 'July, 1863', 'printed_fields_read_by': 'eye, from the 1024-px page image (not machine-read)',
                    'loc_records_by_call_number': calls, 'other_loc_records_of_the_same_view': other, 'letterpress_ocr_text': m['ocr_text'], 'letterpress_ocr_sha256': m['ocr_sha256'], 'master_scan_sha256': m['master_sha256'],
                    'letterpress_statements': stm, 'letterpress_states_where_the_camera_stood': True if n == 35 else False,
                    'letterpress_note': ('says that the view is taken from Cemetery Ridge and that Seminary Ridge can be seen on the left of the picture' if n == 35 else
                                         'describes the subject and the action, not the place of the camera (the whole page was read by machine and by eye)')})
    json.dump({'_doc': __doc__.split('\n')[0] + ' Order in the album: letterpress page, then the mounted plate.', 'plates': out}, open(os.path.join(HERE, 'sketchbook_concordance.json'), 'w'), indent=1, ensure_ascii=False)
    print(len(out), 'plates;', sum(1 for o in out if o['letterpress_states_where_the_camera_stood']), 'letterpress states a camera place')
if __name__ == '__main__': main()
