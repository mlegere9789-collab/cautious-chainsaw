#!/usr/bin/env python3
"""Write the verdicts of the poses that are new or finished in the third pass (P13, P27, P28, P29) and the gate block of the third pass into verdicts.json.
Every verdict was written by a person after looking at the review sheet and the lines-on-photograph image of the pose (reports/<pose>.jpg, reports/<pose>_lines.jpg); the numbers quoted in the texts are read from criteria_measurements.json and skyline_results.json at run time, never typed.
Usage: python3 -I tools/bt/photomatch/add_verdicts_third_pass.py"""
import json, os
HERE = os.path.dirname(os.path.abspath(__file__))
def J(n, d=None):
    p = os.path.join(HERE, n)
    return json.load(open(p)) if os.path.exists(p) else d
V = J('verdicts.json'); M = (J('criteria_measurements.json') or {}).get('measurements', {}); SK = (J('skyline_results.json') or {}).get('cases', {}); EX = J('exploratory_heading.json') or {}
def sk(case, key):
    c = SK.get(case, {}).get('summary', {}).get(key)
    return c
def meas_text(pid):
    m = M[pid + '_main']; return (f"At the registered heading {m['heading_deg']} degrees and the 40 degree field: T1 (pike in the left 55 percent of the frame) {m['T1_pass']} (pike at {m['T1_min_x_frac']} to {m['T1_max_x_frac']} of the frame width, {m['T1_visible_road_vertices']} visible vertices); "
                                  f"T2 (horizon within 0.10 of 0.47) {m['T2_pass']} (render {m['T2_horizon_frac']}); T3 (town band centre in 0.05 to 0.60) {m['T3_pass']} (building outlines centre {m['T3_building_pixel_extent_centre_frac']}, GZ-072 at {m['T3_gz072_x_frac']}).")
def upsert(entry):
    V['pose_verdicts'] = [v for v in V['pose_verdicts'] if v['pose'] != entry['pose']] + [entry]
order = {p['id']: i for i, p in enumerate(J('poses.json')['poses'])}
def main():
    exec(open(os.path.join(HERE, 'verdict_texts_third_pass.py')).read(), {'upsert': upsert, 'meas_text': meas_text, 'sk': sk, 'M': M, 'SK': SK, 'EX': EX, 'V': V, 'J': J})
    V['pose_verdicts'].sort(key=lambda v: order[v['pose']])
    json.dump(V, open(os.path.join(HERE, 'verdicts.json'), 'w'), indent=1, ensure_ascii=False); print(len(V['pose_verdicts']), 'pose verdicts;', 'gate passes =', V['gate_q16']['passes'])
if __name__ == '__main__': main()
