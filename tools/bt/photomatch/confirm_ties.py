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
    gp = os.path.join(HERE, 'tie_geometry.json'); geo = json.load(open(gp))['pairs'] if os.path.exists(gp) else {}
    def gline(key):
        g = geo.get(key)
        if not g or g.get('status') != 'ok': return None, ''
        d = {k: g[k] for k in ('class', 'inliers', 'inlier_fraction', 'scale', 'rotation_deg', 'anisotropy', 'perspective', 'median_residual_px', 'p90_residual_px', 'footprint_share_of_candidate', 'failed_tests')}
        return d, f"; geometry (tie_geometry.py): {g['class']}, inlier fraction {g['inlier_fraction']}, scale {g['scale']}, median residual {g['median_residual_px']} px" + (f", failed {', '.join(g['failed_tests'])}" if g['failed_tests'] else '')
    for fid, row in CONFIRM.items():
        loc, resource, note = row[0], row[1], row[2]; also = row[3] if len(row) > 3 else []
        r = res[fid]; top = r['top'][0]
        if top['loc_id'] != loc or top['inliers'] < 45: raise SystemExit(f'{fid}: the best candidate is {top["loc_id"]} with {top["inliers"]} inliers, not {loc}: no tie written')
        cands = {(t['loc_id'], t['candidate']): t for t in r['top']}
        for l2, r2 in also:
            if (l2, r2) not in cands or cands[(l2, r2)]['inliers'] < 45: raise SystemExit(f'{fid}: the second record {l2} / {r2} is not a candidate with 45 inliers: no tie written')
        other = max([t['inliers'] for t in r['top'][1:] if t['loc_id'] not in [loc] + [a for a, _ in also]] or [0])
        gd, gtxt = gline(f'{fid}|{resource}')
        also_txt = ''.join(f"; the same exposure is held as record {l2} (resource {r2}, {cands[(l2, r2)]['inliers']} inliers)" for l2, r2 in also)
        out[fid] = {'loc': [loc] + [a for a, _ in also], 'res': [resource] + [b for _, b in also], 'inliers': top['inliers'], 'good_matches': top['good_matches'], 'best_other_record_inliers': other, 'confirmed_by_looking': True, 'geometry': gd,
                    'ident': f"image match: the figure image (extracted from the PDF, inverted to positive) matches LOC resource {resource} (record {loc}) with {top['inliers']} inliers of {top['good_matches']} good matches (best other record: {other}; nps_figures_to_loc.json){also_txt}{gtxt}; both images were looked at side by side and show the same scene",
                    'note': note}
    old = json.load(open(os.path.join(HERE, 'nps_figures_confirmed.json')))['ties'] if os.path.exists(os.path.join(HERE, 'nps_figures_confirmed.json')) else {}
    json.dump({'_doc': 'Ties of NPS Record of Treatment figures to catalogued Library of Congress records. A tie is written only after the figure image and the Library image were both looked at (confirmed_by_looking) and the feature matching (match_third_pass.py -> nps_figures_to_loc.json) gave at least 45 inliers and the record is the best candidate; the geometry of the match (tie_geometry.py: same plate, or only the same scene) is read beside it; confirm_ties.py writes this file from the hand-written decision table confirm_ties_table.py.', 'ties': out}, open(os.path.join(HERE, 'nps_figures_confirmed.json'), 'w'), indent=1)
    print(len(out), 'ties confirmed;', len(set(old) - set(out)), 'earlier ties dropped from the file' if set(old) - set(out) else '')
    # the Metropolitan Museum items
    mres = json.load(open(os.path.join(HERE, 'met_to_catalogue.json')))['results']; mo = {}
    for mid, (loc, resource, note) in MET.items():
        r = mres[mid]; top = r['top'][0]
        if top['loc_id'] != loc or top['inliers'] < 45: raise SystemExit(f'{mid}: the best candidate is {top["loc_id"]} with {top["inliers"]} inliers, not {loc}: no tie written')
        gd, gtxt = gline(f'{mid}|{resource}')
        if gd and gd.get('class'):
            g = geo[f'{mid}|{resource}']; wc = g['candidate_frame_px'][0]; xs = [p[0] / wc for p in g['footprint_polygon_candidate_px']]; gd['footprint_x_range_of_candidate_width'] = [round(max(min(xs), 0.0), 2), round(min(max(xs), 1.0), 2)]
        mo[mid] = {'item': mid.replace('MMET', 'MET'), 'loc': loc, 'res': resource, 'inliers': top['inliers'], 'good_matches': top['good_matches'], 'geometry': gd, 'confirmed_by_looking': True, 'note': note + gtxt}
    json.dump({'_doc': 'Metropolitan Museum programme items of the first run (archive.org copies) matched to catalogued Library of Congress records (met_to_catalogue.json) and confirmed by looking at both images; geometry from tie_geometry.py.', 'ties': mo}, open(os.path.join(HERE, 'met_ties_confirmed.json'), 'w'), indent=1)
    print(len(mo), 'Metropolitan ties confirmed')
if __name__ == '__main__': main()
