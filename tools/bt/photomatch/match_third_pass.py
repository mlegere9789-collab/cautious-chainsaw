#!/usr/bin/env python3
"""Third pass (2026-11-14): tie two sets of new images to the catalogued Library of Congress images by feature matching (SIFT, ratio test, RANSAC homography; the machinery of match_nps_then.py).
  A. the 36 historic figures of the NPS Record of Treatment (nps_figures.json; images extracted from the PDFs) -> which catalogued record is each? (nps_figures_to_loc.json)
  B. the 57 Library of Congress images of the wide search (catalogue_wide.json, wide_images_ledger.json) -> is each a second copy of an exposure that is already catalogued, a stereo sibling, or a new exposure?
     (wide_to_catalogue.json)
Candidate pool: for every saved resource of images_ledger.json the 1024-px (large) JPEG when it exists else the 640-px (medium) one, the archive.org working copies of the first run, and the wide images.
A match is accepted only with >= MIN_INLIERS inliers and either SURE inliers or MARGIN times the inliers of the best candidate of a DIFFERENT record (copies of one negative sit in several records and all score high);
it is a lead for the person who looks at both images, never a verdict: every accepted tie is looked at (side-by-side sheet) before a statement or a disposition is written.
Usage: tools/horde/bench.sh nice python3 -I tools/bt/photomatch/match_third_pass.py [figures] [wide]     (heavy: about 27,000 matches; goes through the machine lock)"""
import json, os, sys, time
import numpy as np, cv2
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..')); sys.path.insert(0, HERE)
import match_nps_then as M
cv2.setNumThreads(1)
def pool():
    led = json.load(open(os.path.join(HERE, 'images_ledger.json')))['images']; best = {}
    for k, v in led.items():
        if v.get('status') != 'ok' or not v.get('loc_id') or not v.get('local_file') and not v.get('local_working_3200') and not v.get('local_working_1600'): continue
        if v.get('derivative') in ('medium', 'large'):
            rid = v['resource_id']; cur = best.get(rid)
            if cur is None or (v['derivative'] == 'large'): best[rid] = (os.path.join(ROOT, v['local_file']), v['loc_id'], 'LOC%s|%s' % (v['loc_id'], rid))
        elif v.get('local_working_3200') or v.get('local_working_1600'):
            f = v.get('local_working_3200') or v.get('local_working_1600'); best[k] = (os.path.join(ROOT, f), v['loc_id'], 'IMG|' + k)
    wl = json.load(open(os.path.join(HERE, 'wide_images_ledger.json')))['images']
    for pk, v in wl.items():
        if v.get('status') == 'ok': best['WIDE' + pk] = (os.path.join(ROOT, v['local_file']), pk, 'WIDE|' + pk)
    return {k: v for k, v in best.items() if os.path.exists(v[0])}
def run(name, queries, P, F, out_path, exclude_same_record):
    out = {}
    for qid, qpath, qloc in queries:
        q = M.feats(qpath, side=1024)
        if not q: out[qid] = {'status': 'no features', 'file': os.path.relpath(qpath, ROOT)}; continue
        res = []
        for key, f in F.items():
            if exclude_same_record and P[key][1] == qloc: continue
            n, inl = M.match(q, f); res.append((inl, n, key))
        res.sort(reverse=True)
        top = [{'candidate': k, 'loc_id': P[k][1], 'inliers': i, 'good_matches': n} for i, n, k in res[:6]]
        out[qid] = {'file': os.path.relpath(qpath, ROOT), 'top': top, 'accepted': M.accept(top)}
        print(name, qid, [(t['loc_id'], t['inliers']) for t in top[:3]], flush=True)
    json.dump({'_doc': 'Feature-matching leads (%s). inliers = RANSAC-consistent SIFT matches; accepted at >= %d inliers and (>= %d or %.1f times the best candidate of another record). A lead, to be confirmed by looking at both images.' % (name, M.MIN_INLIERS, M.SURE, M.MARGIN),
               'min_inliers': M.MIN_INLIERS, 'results': out}, open(out_path, 'w'), indent=1)
def main():
    what = [a for a in sys.argv[1:] if not a.startswith('-')] or ['figures', 'wide']
    P = pool(); t0 = time.time(); F = {}
    for k, (p, loc, _) in P.items():
        r = M.feats(p)
        if r: F[k] = r
    print('pool', len(P), 'images;', len(F), 'with features', round(time.time() - t0), 's', flush=True)
    if 'figures' in what:
        nf = json.load(open(os.path.join(HERE, 'nps_figures.json')))['figures']
        run('nps_figures', [(f['id'], os.path.join(ROOT, f['image']), None) for f in nf], P, F, os.path.join(HERE, 'nps_figures_to_loc.json'), False)
    if 'wide' in what:
        wl = json.load(open(os.path.join(HERE, 'wide_images_ledger.json')))['images']
        run('wide', [(pk, os.path.join(ROOT, v['local_file']), pk) for pk, v in wl.items() if v.get('status') == 'ok'], P, F, os.path.join(HERE, 'wide_to_catalogue.json'), True)
    print('done', round(time.time() - t0), 's')
if __name__ == '__main__': main()
