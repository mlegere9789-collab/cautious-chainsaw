# Shared by crowd-lod-glsl.py (native GLSL ES on Mesa llvmpipe) and crowd-lod-naga.py (WGSL on wgpu-native / SwiftShader): the comparison of a RUN of the cross-fade dither with the JavaScript reference of lod.mjs.
# The reference (tests/crowd-lod-glsl-dump.mjs: ref.json + ref.f64) holds, for 8 figures and three 96 x 96 windows of a 3840 x 2160 frame (GL window coordinates, origin bottom left, pixel centres), the number
# n = fract(ign(x, y) + phase(fig)) in float64, and 6 packed range words with their decoded [lo, hi). A backend gives `draw(P, fig, x0, y0)`: the 96 x 96 kept mask of one full-screen draw (a byte per pixel, > 127 = kept,
# row 0 = the bottom row of the window, i.e. GL order).
import os, json, struct, hashlib
def load_ref(out):
    ref = json.load(open(os.path.join(out, 'ref.json'))); raw = open(os.path.join(out, 'ref.f64'), 'rb').read(); ref['ns'] = struct.unpack('<%dd' % (len(raw) // 8), raw); return ref
def battery(ref, draw, tol=2e-3, maxfrac=0.002, log=print):
    """Returns (info, errors, controls). `tol`: how far from a boundary of the range (or from 0 / 1, where fract wraps) a pixel may lie and still be allowed to disagree (float32 against float64)."""
    W, nw, ns = ref['win'], len(ref['windows']), ref['ns']; info, errors, controls = {}, [], {}
    ref_n = lambda fi, wi: ns[(fi * nw + wi) * W * W:(fi * nw + wi + 1) * W * W]
    near = lambda nv, lo, hi: min(abs(nv - lo), abs(nv - hi), nv, 1 - nv) < tol
    tot = bad = unexpl = 0; cnt = {}; masks = {}
    for wi, (x0, y0) in enumerate(ref['windows']):
        for fi, fig in enumerate(ref['figs']):
            nvals = ref_n(fi, wi)
            for c in ref['cases']:
                m = draw(c['P'], fig, x0, y0); masks[(wi, fi, c['name'])] = m
                for k in range(W * W):
                    nv = nvals[k]; want = c['P'] == 0 or (c['lo'] <= nv < c['hi']); got = m[k] > 127; tot += 1
                    if got != want:
                        bad += 1
                        if not near(nv, c['lo'], c['hi']):
                            unexpl += 1
                            if unexpl <= 6: log(f"  unexplained: pixel {k} of window {wi}, fig {fig}, case {c['name']}: n = {nv:.6f}, run {got}, reference {want}")
                cnt[c['name']] = cnt.get(c['name'], 0) + sum(1 for v in m if v > 127)
    h = hashlib.sha256()                                       # one hash of every decision of the run, in a fixed order: the runs of two APIs can be compared byte for byte
    for wi in range(nw):
        for fi in range(len(ref['figs'])):
            for c in ref['cases']: h.update(bytes(1 if v > 127 else 0 for v in masks[(wi, fi, c['name'])]))
    info['decisions_sha256'] = h.hexdigest()
    frac = bad / tot
    info.update({'pixels_compared': tot, 'differing': bad, 'differing_fraction': round(frac, 6), 'differing_outside_tolerance': unexpl, 'tolerance_n': tol, 'kept_per_case': cnt})
    log(f'dither: decisions sha256 {info["decisions_sha256"][:16]}; {tot} pixel decisions compared with lod.mjs, {bad} differ ({100 * frac:.4f} percent), {unexpl} of them farther than {tol} from a boundary')
    if unexpl: errors.append(f'{unexpl} pixel decisions of the shader differ from lod.mjs by more than float32 can explain')
    if frac > maxfrac: errors.append(f'{100 * frac:.3f} percent of the pixel decisions differ (limit {100 * maxfrac:.1f})')
    # the four levels of a partition cover every pixel exactly once, in the run itself (no reference involved)
    names4 = ['L0 [0, q0)', 'L1 [q0, q1)', 'L2 [q1, q2)', 'far [q2, unbounded)']; gaps = over = 0
    for wi in range(nw):
        for fi in range(len(ref['figs'])):
            ms = [masks[(wi, fi, n_)] for n_ in names4]
            for k in range(W * W):
                s = sum(1 for m in ms if m[k] > 127); gaps += s == 0; over += s > 1
    info.update({'partition_pixels': nw * len(ref['figs']) * W * W, 'gaps': gaps, 'overlaps': over}); log(f'partition: {info["partition_pixels"]} pixels, {gaps} gaps, {over} overlaps')
    if gaps or over: errors.append(f'the four levels leave {gaps} gaps and {over} overlaps')
    if any(v < 128 for wi in range(nw) for fi in range(len(ref['figs'])) for v in masks[(wi, fi, 'all (word 0)')]): errors.append('the word 0 did not keep every pixel')
    shares = {n_: cnt[n_] / (nw * len(ref['figs']) * W * W) for n_ in names4}; info['shares'] = {k: round(v, 4) for k, v in shares.items()}; log('shares of the four levels over all draws:', info['shares'])
    for n_ in names4:
        if abs(shares[n_] - 0.25) > 0.02: errors.append(f'share of {n_} is {shares[n_]:.4f}, expected 0.25 within 0.02')
    # a second pass in the reverse order gives the same bytes: nothing is remembered between draws
    same = True
    for wi, (x0, y0) in reversed(list(enumerate(ref['windows']))):
        for fi in reversed(range(len(ref['figs']))):
            for c in reversed(ref['cases']):
                if draw(c['P'], ref['figs'][fi], x0, y0) != masks[(wi, fi, c['name'])]: same = False
    info['reverse_order_identical'] = same; log('reverse order identical:', same)
    if not same: errors.append('a draw in another order gave other pixels')
    # the comparison has power: the number of another figure must not match
    c = ref['cases'][0]; m = masks[(0, 0, c['name'])]; other = ref_n(1, 0); wrong = sum((m[k] > 127) != (c['lo'] <= other[k] < c['hi']) for k in range(W * W))
    controls['the dither of another figure disagrees with the reference'] = f'{100 * wrong / (W * W):.1f} percent of the pixels differ'
    if wrong / (W * W) < 0.1: errors.append('control: the reference of another figure agrees with the pixels of the run, the comparison has no power')
    return info, errors, controls
