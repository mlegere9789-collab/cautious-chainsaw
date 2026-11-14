#!/usr/bin/env python3
"""Write nps_figures_confirmed.json: the ties of NPS Record of Treatment figures to catalogued Library of Congress records that a person confirmed by looking at the figure image and the Library image side by side
(sheets made from nps_figures_to_loc.json). The table CONFIRM is that person's decision, one row per tie; the inliers, the good matches and the competing record are read from the matching result, and a row whose record is not the best
candidate of the matching, or whose score is below the rule (45 inliers), stops the run: a tie is never written from the score alone and never against it.
Usage: python3 -I tools/bt/photomatch/confirm_ties.py"""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
# figure id: (loc record, LOC resource, note)
CONFIRM = {}
exec(open(os.path.join(HERE, 'confirm_ties_table.py')).read()) if os.path.exists(os.path.join(HERE, 'confirm_ties_table.py')) else None
def main():
    res = json.load(open(os.path.join(HERE, 'nps_figures_to_loc.json')))['results']; out = {}
    for fid, (loc, resource, note) in CONFIRM.items():
        r = res[fid]; top = r['top'][0]
        if top['loc_id'] != loc or top['inliers'] < 45: raise SystemExit(f'{fid}: the best candidate is {top["loc_id"]} with {top["inliers"]} inliers, not {loc}: no tie written')
        other = max([t['inliers'] for t in r['top'][1:] if t['loc_id'] != loc] or [0])
        out[fid] = {'loc': [loc], 'res': [resource], 'inliers': top['inliers'], 'good_matches': top['good_matches'], 'best_other_record_inliers': other, 'confirmed_by_looking': True,
                    'ident': f"image match: the figure image (extracted from the PDF, inverted to positive) matches LOC resource {resource} (record {loc}) with {top['inliers']} inliers of {top['good_matches']} good matches (best other record: {other}; nps_figures_to_loc.json); both images were looked at side by side and show the same scene",
                    'note': note}
    old = json.load(open(os.path.join(HERE, 'nps_figures_confirmed.json')))['ties'] if os.path.exists(os.path.join(HERE, 'nps_figures_confirmed.json')) else {}
    json.dump({'_doc': 'Ties of NPS Record of Treatment figures to catalogued Library of Congress records. A tie is written only after the figure image and the Library image were both looked at (confirmed_by_looking) and the feature matching (match_third_pass.py -> nps_figures_to_loc.json) gave at least 45 inliers and the record is the best candidate; confirm_ties.py writes this file from the hand-written decision table.', 'ties': out}, open(os.path.join(HERE, 'nps_figures_confirmed.json'), 'w'), indent=1)
    print(len(out), 'ties confirmed;', len(set(old) - set(out)), 'earlier ties dropped from the file' if set(old) - set(out) else '')
if __name__ == '__main__': main()
