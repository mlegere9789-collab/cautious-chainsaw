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
def knn_pair(fl_for_candidate, q, c):
    """Same test as match_nps_then.match (ratio 0.75, RANSAC homography at 6 px), with the FLANN index of the candidate built once for all queries."""
    pa, da = q[0], q[1]; pb, db = c[0], c[1]
    m = fl_for_candidate.knnMatch(da, k=2); good = [x[0] for x in m if len(x) == 2 and x[0].distance < 0.75 * x[1].distance]
    if len(good) < 8: return len(good), 0
    src = pa[[g.queryIdx for g in good]].reshape(-1, 1, 2); dst = pb[[g.trainIdx for g in good]].reshape(-1, 1, 2)
    H, mask = cv2.findHomography(src, dst, cv2.RANSAC, 6.0)
    return len(good), int(mask.sum()) if mask is not None else 0
def run_all(sets, P, F, qfeat):
    """sets: {name: (queries [(qid, qloc)], exclude_same_record, out_path)}. Candidate-major loop: one FLANN index per candidate image, every query of every set against it."""
    res = {name: {qid: [] for qid, _ in qs} for name, (qs, _ex, _o) in sets.items()}
    t0 = time.time()
    for n, (key, f) in enumerate(F.items()):
        fl = cv2.FlannBasedMatcher(dict(algorithm=1, trees=4), dict(checks=40)); fl.add([f[1]]); fl.train()
        for name, (qs, ex, _o) in sets.items():
            for qid, qloc in qs:
                if qid not in qfeat: continue
                if ex and P[key][1] == qloc: continue
                ng, inl = knn_pair(fl, qfeat[qid], f); res[name][qid].append((inl, ng, key))
        if n % 40 == 0: print('candidate', n, 'of', len(F), round(time.time() - t0), 's', flush=True)
    for name, (qs, ex, out_path) in sets.items():
        out = {}
        for qid, qloc in qs:
            if qid not in qfeat: out[qid] = {'status': 'no features'}; continue
            r = sorted(res[name][qid], reverse=True); top = [{'candidate': k, 'loc_id': P[k][1], 'inliers': i, 'good_matches': n} for i, n, k in r[:6]]
            out[qid] = {'file': qfeat[qid][2], 'top': top, 'accepted': M.accept(top)}; print(name, qid, [(t['loc_id'], t['inliers']) for t in top[:3]], flush=True)
        json.dump({'_doc': 'Feature-matching leads (%s). inliers = RANSAC-consistent SIFT matches; accepted at >= %d inliers and (>= %d or %.1f times the best candidate of another record). A lead, to be confirmed by looking at both images.' % (name, M.MIN_INLIERS, M.SURE, M.MARGIN),
                   'min_inliers': M.MIN_INLIERS, 'results': out}, open(out_path, 'w'), indent=1)
def main():
    what = [a for a in sys.argv[1:] if not a.startswith('-')] or ['figures', 'wide', 'met']
    P = pool(); t0 = time.time(); F = {}
    for k, (p, loc, _) in P.items():
        r = M.feats(p)
        if r: F[k] = r
    print('pool', len(P), 'images;', len(F), 'with features', round(time.time() - t0), 's', flush=True)
    sets = {}; qfeat = {}
    if 'figures' in what:
        nf = json.load(open(os.path.join(HERE, 'nps_figures.json')))['figures']; qs = []
        for f in nf:
            qp = os.path.join(ROOT, f['image']); q = M.feats(qp, side=1024)
            if q: qfeat[f['id']] = (q[0], q[1], f['image'])
            qs.append((f['id'], None))
        sets['nps_figures'] = (qs, False, os.path.join(HERE, 'nps_figures_to_loc.json'))
    if 'wide' in what:
        wl = json.load(open(os.path.join(HERE, 'wide_images_ledger.json')))['images']; qs = []
        for pk, v in wl.items():
            if v.get('status') != 'ok': continue
            qp = os.path.join(ROOT, v['local_file']); q = M.feats(qp, side=1024)
            if q: qfeat['W' + pk] = (q[0], q[1], v['local_file'])
            qs.append(('W' + pk, pk))
        sets['wide'] = (qs, True, os.path.join(HERE, 'wide_to_catalogue.json'))
    if 'met' in what:   # the six Metropolitan Museum items of the first run (P04, P05 and their siblings): are they copies of a Library of Congress exposure?
        led = json.load(open(os.path.join(HERE, 'images_ledger.json')))['images']; qs = []
        for k, v in led.items():
            if v.get('status') == 'ok' and not v.get('loc_id') and v.get('local_working_1600'):
                qp = os.path.join(ROOT, v['local_working_1600']); q = M.feats(qp, side=1024)
                if q: qfeat['M' + k] = (q[0], q[1], v['local_working_1600'])
                qs.append(('M' + k, None))
        sets['met'] = (qs, False, os.path.join(HERE, 'met_to_catalogue.json'))
    run_all(sets, P, F, {k: v for k, v in qfeat.items()})
    print('done', round(time.time() - t0), 's')
if __name__ == '__main__': main()
