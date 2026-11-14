#!/usr/bin/env python3
"""Same plate or another exposure? Geometry of the accepted feature ties (third pass, 2026-11-14).

Written before it was run; the thresholds below were fixed first and are not tuned to the pairs.
For a pair (query image, candidate image) the SIFT/RANSAC homography H (query -> candidate) is recomputed with the matcher of match_nps_then (ratio 0.75, RANSAC at 6 px; same CLAHE and 1024-px side)
and described by
  inlier_fraction   RANSAC inliers / ratio-test matches
  scale             square root of |det| of the affine part of H (how many candidate pixels one query pixel covers)
  rotation          degrees, from the affine part
  anisotropy        ratio of the singular values of the affine part (1.0 = a pure similarity)
  perspective       |h31| * W + |h32| * H of H expressed on frames normalised to 1.0 (0 = affine)
  residual          median and 90th percentile of the distance between the mapped query point and its candidate point over the inliers, with the candidate frame normalised to 1000 px on its long side
  footprint         the query frame mapped into the candidate frame: the share of the candidate frame it covers (clipped), and whether all four mapped corners fall inside the frame.
Class (fixed before the run):
  SAME_PLATE   inlier fraction >= 0.80 and anisotropy <= 1.06 and |rotation| <= 4 degrees and perspective <= 0.20 and median residual <= 3.0 px.  A copy, a crop or an enlargement of one exposure
               (a crop of a plate is the same photograph; a print and its negative are the same photograph).
  SAME_SCENE   anything else with >= 45 inliers: the same place seen in another exposure from the same or a nearby station, or a print whose features agree only in part. A lead, never a tie.
Stereo cards hold two exposures side by side: a single-image record matched against a card agrees with one half only, so the inlier fraction of such a pair is not read against the 0.80 bar
(the report says so; those pairs are called by looking at both halves).
This script is a lead for the person who looks at both images, as the matcher is. It never writes a tie by itself.
Usage: nice python3 -I tools/bt/photomatch/tie_geometry.py [figures] [met] [wide]      (about 20 seconds of CPU for figures and met; the wide pairs of single images are listed in WIDE_SINGLE)
Writes tools/bt/photomatch/tie_geometry.json and overlays tmp/photomatch/tie_geom/<id>.jpg (candidate image with the query footprint drawn in)."""
import json, os, sys, time
import numpy as np, cv2
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..')); sys.path.insert(0, HERE)
import match_nps_then as M
import match_third_pass as T
cv2.setNumThreads(1)
THRESH = {'inlier_fraction': 0.80, 'anisotropy': 1.06, 'rotation_deg': 4.0, 'perspective': 0.20, 'median_residual_px': 3.0}
# wide records whose candidate is a single image (not a stereo card): the geometry is meaningful for these (the others are pairs of stereo cards or mounts holding two exposures)
WIDE_SINGLE = ['W2006692500', 'W2006692502', 'W2013645929', 'W2006692501', 'W2013645925', 'W2012647715', 'W2006685383', 'W2025167167', 'W2011646177', 'W2025167163', 'W2011648011']
OUT_DIR = os.path.join(ROOT, 'tmp', 'photomatch', 'tie_geom')
def geometry(qpath, cpath, cache):
    def get(p):
        if p not in cache:
            g = cv2.imread(p, cv2.IMREAD_GRAYSCALE); h0, w0 = g.shape; r = M.feats(p); cache[p] = (r, w0, h0)
        return cache[p]
    (fq, wq0, hq0), (fc, wc0, hc0) = get(qpath), get(cpath)
    if fq is None or fc is None: return {'status': 'no features'}
    def side(p, w0, h0, s=1024):
        m = max(w0, h0); k = s / m if m > s else 1.0
        return round(w0 * k), round(h0 * k)
    wq, hq = side(qpath, wq0, hq0); wc, hc = side(cpath, wc0, hc0)
    fl = cv2.FlannBasedMatcher(dict(algorithm=1, trees=4), dict(checks=40)); m = fl.knnMatch(fq[1], fc[1], k=2)
    good = [x[0] for x in m if len(x) == 2 and x[0].distance < 0.75 * x[1].distance]
    if len(good) < 8: return {'status': 'too few matches', 'good': len(good)}
    src = fq[0][[g.queryIdx for g in good]].reshape(-1, 1, 2); dst = fc[0][[g.trainIdx for g in good]].reshape(-1, 1, 2)
    H, mask = cv2.findHomography(src, dst, cv2.RANSAC, 6.0)
    if H is None: return {'status': 'no homography', 'good': len(good)}
    mk = mask.ravel().astype(bool); n_in = int(mk.sum())
    # residual on candidate frame normalised to 1000 px long side
    pr = cv2.perspectiveTransform(src[mk], H).reshape(-1, 2); d = np.linalg.norm(pr - dst[mk].reshape(-1, 2), axis=1) * (1000.0 / max(wc, hc))
    # H on normalised frames (query frame 0..1 x 0..1 -> candidate frame 0..1 x 0..1)
    Hn = np.diag([1.0 / wc, 1.0 / hc, 1.0]) @ H @ np.diag([wq, hq, 1.0])
    Hn = Hn / Hn[2, 2]
    A = H[:2, :2] / H[2, 2]; U, S, Vt = np.linalg.svd(A); scale = float(np.sqrt(abs(np.linalg.det(A)))); aniso = float(S[0] / S[1]) if S[1] > 1e-9 else 99.0
    rot = float(np.degrees(np.arctan2(A[1, 0], A[0, 0])))
    persp = float(abs(Hn[2, 0]) + abs(Hn[2, 1]))
    corners = np.float32([[0, 0], [wq, 0], [wq, hq], [0, hq]]).reshape(-1, 1, 2); poly = cv2.perspectiveTransform(corners, H).reshape(-1, 2)
    inside = bool(all(0 <= x <= wc and 0 <= y <= hc for x, y in poly))
    # clipped footprint area share (rasterised at low res)
    sc = 200.0 / max(wc, hc); canvas = np.zeros((int(hc * sc) + 2, int(wc * sc) + 2), np.uint8)
    try: cv2.fillPoly(canvas, [np.round(poly * sc).astype(np.int32)], 1); share = float(canvas[:int(hc * sc), :int(wc * sc)].sum() / (int(hc * sc) * int(wc * sc)))
    except Exception: share = None
    r = {'status': 'ok', 'good': len(good), 'inliers': n_in, 'inlier_fraction': round(n_in / len(good), 3), 'scale': round(scale, 3), 'rotation_deg': round(rot, 2), 'anisotropy': round(aniso, 3), 'perspective': round(persp, 3),
         'median_residual_px': round(float(np.median(d)), 2), 'p90_residual_px': round(float(np.percentile(d, 90)), 2), 'footprint_share_of_candidate': round(share, 3) if share is not None else None, 'footprint_corners_inside': inside,
         'footprint_polygon_candidate_px': [[round(float(x), 1), round(float(y), 1)] for x, y in poly], 'candidate_frame_px': [wc, hc], 'query_frame_px': [wq, hq]}
    ok = (r['inlier_fraction'] >= THRESH['inlier_fraction'] and r['anisotropy'] <= THRESH['anisotropy'] and abs(r['rotation_deg']) <= THRESH['rotation_deg'] and r['perspective'] <= THRESH['perspective'] and r['median_residual_px'] <= THRESH['median_residual_px'])
    r['class'] = 'SAME_PLATE' if ok else ('SAME_SCENE' if n_in >= 45 else 'NO_TIE'); r['failed_tests'] = [k for k, v in (('inlier_fraction', r['inlier_fraction'] >= THRESH['inlier_fraction']), ('anisotropy', r['anisotropy'] <= THRESH['anisotropy']),
                                                                                                                                  ('rotation', abs(r['rotation_deg']) <= THRESH['rotation_deg']), ('perspective', r['perspective'] <= THRESH['perspective']),
                                                                                                                                  ('residual', r['median_residual_px'] <= THRESH['median_residual_px'])) if not v]
    return r
def overlay(cpath, r, out):
    im = cv2.imread(cpath)
    if im is None: return
    h, w = im.shape[:2]; k = 1024.0 / max(w, h) if max(w, h) > 1024 else 1.0
    wc, hc = r['candidate_frame_px']; sx = w / wc; sy = h / hc
    poly = np.array(r['footprint_polygon_candidate_px'], np.float32) * np.array([sx, sy], np.float32)
    im = cv2.resize(im, (round(w * k), round(h * k)), interpolation=cv2.INTER_AREA); poly = (poly * k).astype(np.int32)
    cv2.polylines(im, [poly.reshape(-1, 1, 2)], True, (0, 0, 255), 3); cv2.putText(im, r['class'] + ' scale %.2f res %.1f' % (r['scale'], r['median_residual_px']), (8, 26), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)
    os.makedirs(os.path.dirname(out), exist_ok=True); cv2.imwrite(out, im, [cv2.IMWRITE_JPEG_QUALITY, 85])
def main():
    what = [a for a in sys.argv[1:] if not a.startswith('-')] or ['figures', 'met', 'wide']
    P = T.pool(); cand_file = {k: v[0] for k, v in P.items()}      # the key of the pool is the candidate name written in the match outputs; the file is the one the matcher used
    pairs = []
    if 'figures' in what:
        d = json.load(open(os.path.join(HERE, 'nps_figures_to_loc.json')))['results']; nf = {f['id']: f for f in json.load(open(os.path.join(HERE, 'nps_figures.json')))['figures']}
        for qid, v in d.items():
            if v.get('accepted'):
                for t in v['accepted'][:3]: pairs.append((qid, os.path.join(ROOT, nf[qid]['image']), t['candidate'], t['loc_id'], 'figures'))
    if 'met' in what:
        d = json.load(open(os.path.join(HERE, 'met_to_catalogue.json')))['results']
        for qid, v in d.items():
            if v.get('accepted'):
                for t in v['accepted'][:2]: pairs.append((qid, os.path.join(ROOT, v['file']), t['candidate'], t['loc_id'], 'met'))
    if 'wide' in what:
        d = json.load(open(os.path.join(HERE, 'wide_to_catalogue.json')))['results']
        for qid, v in d.items():
            if qid in WIDE_SINGLE and v.get('accepted'): pairs.append((qid, os.path.join(ROOT, v['file']), v['accepted'][0]['candidate'], v['accepted'][0]['loc_id'], 'wide'))
    cache = {}; out = {}; t0 = time.time()
    for qid, qpath, cand, loc, kind in pairs:
        cp = cand_file.get(cand)
        if cp is None or not os.path.exists(cp): out['%s|%s' % (qid, cand)] = {'status': 'candidate file not found', 'candidate': cand, 'loc_id': loc}; continue
        r = geometry(qpath, cp, cache); r.update({'query': qid, 'candidate': cand, 'loc_id': loc, 'kind': kind, 'query_file': os.path.relpath(qpath, ROOT), 'candidate_file': os.path.relpath(cp, ROOT)})
        out['%s|%s' % (qid, cand)] = r
        if r.get('status') == 'ok': overlay(cp, r, os.path.join(OUT_DIR, '%s__%s.jpg' % (qid, cand.replace('/', '_'))))
        print(qid, cand, r.get('class'), r.get('inliers'), r.get('inlier_fraction'), 'scale', r.get('scale'), 'res', r.get('median_residual_px'), 'fail', r.get('failed_tests'), flush=True)
    outp = os.path.join(HERE, 'tie_geometry.json'); prev = json.load(open(outp)).get('pairs', {}) if os.path.exists(outp) else {}; prev.update(out)     # a run for one kind of pair keeps the others
    meta = {'_doc': 'Same plate or another exposure? Geometry of the accepted feature ties; thresholds fixed before the run (see tie_geometry.py). A lead, never a tie.', 'thresholds': THRESH, 'ran_utc': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'last_run_wall_seconds': round(time.time() - t0, 1), 'pairs': prev}
    json.dump(meta, open(outp, 'w'), indent=1); print('wrote tie_geometry.json', len(out), 'pairs', round(time.time() - t0), 's')
if __name__ == '__main__': main()
