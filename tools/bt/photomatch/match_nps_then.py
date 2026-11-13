#!/usr/bin/env python3
"""Identify which catalogued Library of Congress image each National Park Service 'Then' photograph is (Q16 pose evidence).
Why: the NPS Then-And-Now pages carry statements about where the camera stood, but they credit 'Library of Congress' without an id. A statement may only be
attached to a LOC record when the pictures are the same negative, so this script tests that with feature matching (SIFT, ratio test, RANSAC homography) and writes
the ranked candidates. A match is accepted only with >= MIN_INLIERS inliers and MARGIN times the inliers of the best other record; the result is a lead for the person who looks at both images, never a verdict.
Inputs: tools/bt/photomatch/nps_then_now.json (the 'then' files), tmp/photomatch/loc/*_v.jpg (1024 px) or *_r.jpg (640 px) when no large JPEG exists.
Output: tools/bt/photomatch/nps_then_to_loc.json.   Usage: nice -n 10 python3 -I tools/bt/photomatch/match_nps_then.py [query name ...]   (names like rose-woods#1; with names, only those are re-run and merged into the output)"""
import json, os, glob, sys, time
import numpy as np, cv2
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
LOC = os.path.join(ROOT, 'tmp', 'photomatch', 'loc'); MIN_INLIERS = 45; MARGIN = 1.3; SURE = 100
cv2.setNumThreads(1)
sift = cv2.SIFT_create(nfeatures=2500)
def feats(path, side=1024):
    g = cv2.imread(path, cv2.IMREAD_GRAYSCALE)
    if g is None: return None
    h, w = g.shape
    if max(h, w) > side: s = side / max(h, w); g = cv2.resize(g, (round(w * s), round(h * s)), interpolation=cv2.INTER_AREA)
    g = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8)).apply(g)
    kp, de = sift.detectAndCompute(g, None)
    return (np.float32([k.pt for k in kp]), de) if de is not None and len(kp) >= 8 else None
def match(a, b):
    (pa, da), (pb, db) = a, b
    fl = cv2.FlannBasedMatcher(dict(algorithm=1, trees=4), dict(checks=40))
    m = fl.knnMatch(da, db, k=2); good = [x[0] for x in m if len(x) == 2 and x[0].distance < 0.75 * x[1].distance]
    if len(good) < 8: return len(good), 0
    src = pa[[g.queryIdx for g in good]].reshape(-1, 1, 2); dst = pb[[g.trainIdx for g in good]].reshape(-1, 1, 2)
    H, mask = cv2.findHomography(src, dst, cv2.RANSAC, 6.0)
    return len(good), int(mask.sum()) if mask is not None else 0
def accept(top):
    """The best candidate is accepted when it has at least MIN_INLIERS inliers and either SURE inliers (prints of one negative sit in several records and all score high) or MARGIN times the inliers of the best candidate of a DIFFERENT record."""
    if not top or top[0]['inliers'] < MIN_INLIERS: return []
    other = max([t['inliers'] for t in top[1:] if t['loc_id'] != top[0]['loc_id']] or [0])
    ok = top[0]['inliers'] >= SURE or top[0]['inliers'] >= MARGIN * other
    return [t for t in top if t['inliers'] >= MIN_INLIERS and (t['loc_id'] == top[0]['loc_id'] or t['inliers'] >= SURE)] if ok else []
def main():
    tn = json.load(open(os.path.join(HERE, 'nps_then_now.json')))
    only = [a for a in sys.argv[1:] if not a.startswith('-')]; prev = {}
    outp = os.path.join(HERE, 'nps_then_to_loc.json')
    if only and os.path.exists(outp): prev = json.load(open(outp)).get('queries', {})
    queries = []
    for s in tn['series']:
        for c in s['comparisons']:
            f = c['then'].get('local_file')
            if f and (not only or f"{s['series']}#{c['n']}" in only): queries.append((f"{s['series']}#{c['n']}", os.path.join(ROOT, f)))
    cand = {}
    for p in sorted(glob.glob(os.path.join(LOC, '*_r.jpg'))):
        rid = os.path.basename(p)[:-6]; v = os.path.join(LOC, rid + '_v.jpg'); cand[rid] = v if os.path.exists(v) else p
    # the three archive.org Gardner scans of the first run (working copies) are also candidates
    for p in glob.glob(os.path.join(ROOT, 'tmp', 'photomatch', 'img', 'LOC*_1600.jpg')): cand['IMG_' + os.path.basename(p)[:-9]] = p
    t0 = time.time(); F = {}
    for rid, p in cand.items():
        r = feats(p)
        if r: F[rid] = r
    print('candidate images with features', len(F), 'of', len(cand), round(time.time() - t0), 's', flush=True)
    # which record does a resource belong to
    rec = {}
    for f in glob.glob(os.path.join(ROOT, 'tmp', 'photomatch', 'raw', 'item_*.json')):
        d = json.load(open(f))
        for r in d.get('resources') or []: rec[r['id']] = d['item']['control_number']
    out = {'_doc': 'Feature-matching leads: which LOC resource each NPS Then photograph is. inliers = RANSAC-consistent SIFT matches; accepted only at >= %d inliers and %.1f times the best other record. A lead, to be confirmed by looking at both images.' % (MIN_INLIERS, MARGIN), 'min_inliers': MIN_INLIERS, 'queries': dict(prev)}
    for qn, qp in queries:
        q = feats(qp, side=1024)
        if not q: out['queries'][qn] = {'status': 'no features'}; continue
        res = []
        for rid, f in F.items():
            n, inl = match(q, f)
            res.append((inl, n, rid))
        res.sort(reverse=True)
        top = [{'resource': r, 'loc_id': rec.get(r.split('_')[0] if not r.startswith('IMG_') else r) or rec.get(r), 'inliers': i, 'good_matches': n} for i, n, r in res[:5]]
        out['queries'][qn] = {'nps_then_file': os.path.relpath(qp, ROOT), 'top': top, 'accepted': accept(top)}
        print(qn, [(t['resource'], t['inliers']) for t in top[:3]], flush=True)
    json.dump(out, open(outp, 'w'), indent=1)
    print('done', round(time.time() - t0), 's')
if __name__ == '__main__': main()
