"""Window-level synthesis for stage 30: decides which pixels are filled from which bank and runs the quilter.
All inputs are arrays for one window of the build grid (rows/cols of the same size)."""
import numpy as np, cv2, json, os
import common as C
import quilt as Q

SHADOW_DIR = (-0.643, -0.766)      # (dx, drow) toward the NW: the shadow direction of the base scene (tools/b1863/sun_estimate.py: 130 deg east-counterclockwise)
SHADOW_LEN_M = 18

def line_kernel(dx, dy, L):
    n = int(L) * 2 + 1
    k = np.zeros((n, n), np.uint8)
    cv2.line(k, (int(L), int(L)), (int(round(L + dx * L)), int(round(L + dy * L))), 1, 1)
    return k

def shadow_zone(region, canopy, lum):
    """pixels in the cast-shadow zone NW of a removed canopy region that are darker than the local unshadowed ground"""
    k = line_kernel(SHADOW_DIR[0], SHADOW_DIR[1], SHADOW_LEN_M)
    # a removed tree of height h shadows the ground up to ~1.1 h to the NW: zone = region swept along the shadow direction
    zone = cv2.dilate(region.astype(np.uint8), k, anchor=(SHADOW_LEN_M, SHADOW_LEN_M)).astype(bool)
    zone = cv2.dilate(zone.astype(np.uint8), np.ones((3, 3), np.uint8)).astype(bool) & ~region & (canopy == 0)
    ref_ok = (~zone) & (~region) & (canopy == 0)
    num = cv2.GaussianBlur(lum * ref_ok, (0, 0), 14); den = cv2.GaussianBlur(ref_ok.astype(np.float32), (0, 0), 14)
    ref = num / np.maximum(den, 1e-3)
    dark = lum < 0.86 * ref
    dark &= den > 0.02
    sh = zone & dark
    sh = cv2.morphologyEx(sh.astype(np.uint8), cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))
    sh = cv2.dilate(sh, np.ones((3, 3), np.uint8)).astype(bool) & zone
    return sh

def guide_field(img, known, sigma=20.0, default=(120.0, 130.0, 122.0)):
    f = img.astype(np.float32)
    if known.sum() > 2000:
        default = tuple(float(v) for v in f[known].mean(0))          # far from every known pixel the guide is the window mean of the known ground, not a fixed colour
    km = known.astype(np.float32)
    out = np.empty_like(f)
    den1 = cv2.GaussianBlur(km, (0, 0), sigma)
    den2 = cv2.GaussianBlur(km, (0, 0), sigma * 4)
    for c in range(3):
        n1 = cv2.GaussianBlur(f[..., c] * km, (0, 0), sigma)
        n2 = cv2.GaussianBlur(f[..., c] * km, (0, 0), sigma * 4)
        g1 = n1 / np.maximum(den1, 1e-4); g2 = n2 / np.maximum(den2, 1e-4)
        w1 = np.clip(den1 / 0.05, 0, 1)
        w2 = np.clip(den2 / 0.02, 0, 1)
        out[..., c] = w1 * g1 + (1 - w1) * (w2 * g2 + (1 - w2) * default[c])
    return out

def tex_map(img, known, sigma=20.0, default=3.0):
    lum = img.astype(np.float32).mean(2)
    gx = np.zeros_like(lum); gy = np.zeros_like(lum)
    gx[:, 1:] = np.abs(np.diff(lum, axis=1)); gy[1:, :] = np.abs(np.diff(lum, axis=0))
    g = (gx + gy) / 2
    km = known.astype(np.float32)
    n1 = cv2.GaussianBlur(g * km, (0, 0), sigma); d1 = cv2.GaussianBlur(km, (0, 0), sigma)
    n2 = cv2.GaussianBlur(g * km, (0, 0), sigma * 4); d2 = cv2.GaussianBlur(km, (0, 0), sigma * 4)
    g1 = n1 / np.maximum(d1, 1e-4); g2 = n2 / np.maximum(d2, 1e-4)
    w1 = np.clip(d1 / 0.05, 0, 1); w2 = np.clip(d2 / 0.02, 0, 1)
    return w1 * g1 + (1 - w1) * (w2 * g2 + (1 - w2) * default)

def synthesize(img, tg, lc, rem, add, canopy, banks, surv=None, seed=1863):
    """img uint8 (h,w,3) (stage-20 image). tg target map (0/1/2/5/7), lc land cover, rem/add change maps, canopy 1 m modern canopy (0/1).
    Returns (out uint8, region_class uint8) where region_class marks what was synthesised: 1 open fill, 2 woods fill, 3 orchard ground (open fill, trees added later), 4 town ground"""
    h, w = tg.shape
    f = img.astype(np.float32)
    lum = f.mean(2)
    out = f.copy()
    cls = np.zeros((h, w), np.uint8)
    deep = np.isin(tg, (2, 5, 7))
    town = (lc == 7)
    rem_d = cv2.dilate((rem == 1).astype(np.uint8), np.ones((5, 5), np.uint8)).astype(bool) & (canopy > 0) | (rem == 1)
    rem_d &= ~town
    sh = shadow_zone(rem_d, canopy, lum) if rem_d.any() else np.zeros((h, w), bool)
    # decide kind per pixel
    woods_fill = (deep & (lc == 2)) | (add == 1)
    # outside the Warren coverage the 1863 cover is unknown: fill deep targets with the kind of the surroundings (woods when the ground around is canopy)
    unk = deep & (lc == 0)
    if unk.any():
        cf = cv2.GaussianBlur((canopy > 0).astype(np.float32), (0, 0), 25)
        woods_fill |= unk & (cf > 0.6)
    # the town block: modern yard and street trees are removed (1863 yard trees UNKNOWN), everything else of the real photograph stays; masks (roofs, streets) are already targets
    # (the whole ground of the town zone is re-synthesised, so no strip of modern yard meets the fill inside the zone; survivors keep their pixels)
    town_can = town.copy()
    town_sh = np.zeros((h, w), bool)
    open_fill = (deep & ~woods_fill) | rem_d | sh | town_can | town_sh
    open_fill &= ~woods_fill
    # survivors / kept pixels inside the town zone: everything in the town zone is ground-synthesised except un-masked survivor pixels
    surv_keep = (cv2.dilate(surv, np.ones((3, 3), np.uint8)) > 0) if surv is not None else np.zeros((h, w), bool)
    open_fill &= ~surv_keep
    for kind, mask, bank, clsv, gk in (
        ('open', open_fill, banks['field'], 1, None), ('woods', woods_fill | ((add == 1)), banks['woods'], 2, None)):
        if not mask.any():
            continue
        # known pixels for the guide: not part of any synthesis region, not canopy (open) / canopy (woods)
        if kind == 'open':
            known = ~(open_fill | woods_fill | deep | (tg == 1)) & (canopy == 0) & ~sh & (lc != 2) & (lc != 3)
        else:
            known = ~(open_fill | woods_fill | deep | (tg == 1)) & (canopy > 0)
        g = guide_field(out, known, default=(70.0, 106.0, 91.0) if kind == 'woods' else (120.0, 130.0, 122.0))
        # feather into the neighbouring pixels: dilate the mask by 1 so the seam is inside the fill
        m = cv2.dilate(mask.astype(np.uint8), np.ones((3, 3), np.uint8)).astype(bool) & ~(out_known_protect(tg, lc, mask))
        m |= mask
        tx = tex_map(out, known, default=float(np.median(bank.tex)))
        Q.quilt(out, m, bank, g, guide_tex=tx, ov=6, seed=seed + clsv)
        out = Q.boundary_match(out, m, sigma=10.0)
        cls[m] = clsv
    cls[town & (cls == 1)] = 4
    cls[(add == 2) & (cls == 0)] = 3
    return np.clip(out + 0.5, 0, 255).astype(np.uint8), cls

def out_known_protect(tg, lc, mask):
    return np.zeros(tg.shape, bool)

