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

def parcel_guide(h, w, org, bank, cell=26.0):
    """guide colour and texture for the ground between the roofs of the town: Voronoi parcels of about 26 m (hashed lattice on the GLOBAL grid, so neighbouring windows agree), each with the mean colour and texture of a
    block drawn at random from the town bank (real ground of the photograph: lawn, dusty yard, garden, ploughed or hay ground). No parcel boundary of 1863 is known: the cells stand for lots and yards."""
    r0, c0 = org
    gx = np.arange(w, dtype=np.float64)[None, :] + c0 + 0.5; gy = np.arange(h, dtype=np.float64)[:, None] + r0 + 0.5
    GX = np.broadcast_to(gx, (h, w)); GY = np.broadcast_to(gy, (h, w))
    ix = np.floor(GX / cell).astype(np.int64); iy = np.floor(GY / cell).astype(np.int64)
    best = np.full((h, w), 1e18); cid = np.zeros((h, w), np.int64)
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            jx = ix + dx; jy = iy + dy
            h1 = ((jx * 73856093) ^ (jy * 19349663)) & 0xFFFF; h2 = ((jx * 83492791) ^ (jy * 2654435761)) & 0xFFFF
            px = (jx + 0.1 + 0.8 * (h1 / 65535.0)) * cell; py = (jy + 0.1 + 0.8 * (h2 / 65535.0)) * cell
            dd = (GX - px) ** 2 + (GY - py) ** 2
            sel = dd < best
            best = np.where(sel, dd, best); cid = np.where(sel, (jx * 1000003 + jy) & 0x7FFFFFFF, cid)
    pick = ((cid * 2654435761) & 0xFFFFFFFF) % len(bank.feat)
    f = bank.feat[pick]
    return f[..., :3].astype(np.float32), (f[..., 3] / 3.0).astype(np.float32), cid

def parcel_tone(out, m, cid):
    """each parcel of the town ground gets its own tone: lot and yard ground is lawn in one lot, dusty bare earth in the next, garden or hay in a third; the quilting alone follows its overlap error from block to block and
    flattens this to one lawn (pass 7: the Lab a variance of the town ground was 19 percent of that of photographed open ground, 60 percent needed). Offsets are drawn per parcel (hash of the global parcel id:
    +-8 L, +-8 a, +-6 b in 8-bit Lab, uniform) so that the spread equals that of the real ground (a std 7.4, b std 4.2 on 60 random 512 px windows of open ground of the photograph)."""
    u1 = (((cid * 2654435761) & 0xFFFF) / 65535.0 - 0.5) * 2; u2 = (((cid * 40503 + 7) * 2246822519 & 0xFFFF) / 65535.0 - 0.5) * 2; u3 = (((cid * 69069 + 3) * 3266489917 & 0xFFFF) / 65535.0 - 0.5) * 2
    off = np.stack([u1 * 8.0, u2 * 8.0, u3 * 6.0], -1).astype(np.float32)
    off = cv2.GaussianBlur(off, (0, 0), 1.2)
    lab = cv2.cvtColor(np.clip(out, 0, 255).astype(np.uint8), cv2.COLOR_RGB2LAB).astype(np.float32)
    lab[m] = np.clip(lab[m] + off[m], 0, 255)
    rgb = cv2.cvtColor(lab.astype(np.uint8), cv2.COLOR_LAB2RGB).astype(np.float32)
    res = out.copy()
    res[m] = rgb[m]
    return res

def synthesize(img, tg, lc, rem, add, canopy, banks, surv=None, seed=1863, veg=None, org=(0, 0)):
    """img uint8 (h,w,3) (stage-20 image). tg target map (0/1/2/5/7), lc land cover, rem/add change maps, canopy 1 m modern canopy (0/1).
    Returns (out uint8, region_class uint8) where region_class marks what was synthesised: 1 open fill, 2 woods fill, 3 orchard ground (open fill, trees added later), 4 town ground"""
    h, w = tg.shape
    f = img.astype(np.float32)
    lum = f.mean(2)
    out = f.copy()
    cls = np.zeros((h, w), np.uint8)
    deep = np.isin(tg, (2, 5, 7, 8))
    town = (lc == 7)
    rem_d = cv2.dilate((rem == 1).astype(np.uint8), np.ones((5, 5), np.uint8)).astype(bool) & (canopy > 0) | (rem == 1)
    rem_d &= ~town
    sh = shadow_zone(rem_d, canopy, lum) if rem_d.any() else np.zeros((h, w), bool)
    # decide kind per pixel
    woods_fill = (deep & (lc == 2)) | (add == 1) | (tg == 8)
    # outside the Warren coverage the 1863 cover is unknown: fill deep targets with the kind of the surroundings (woods when the ground around is canopy)
    unk = deep & (lc == 0)
    if unk.any():
        # canopy fraction of the ground AROUND the target (normalised convolution over the pixels that are not themselves targets): a clearing inside woods is refilled with woods
        kn = (~deep).astype(np.float32)
        cf = cv2.GaussianBlur((canopy > 0).astype(np.float32) * kn, (0, 0), 25) / np.maximum(cv2.GaussianBlur(kn, (0, 0), 25), 1e-3)
        woods_fill |= unk & (cf > 0.5)
    # the town block: modern yard and street trees are removed (1863 yard trees UNKNOWN), everything else of the real photograph stays; masks (roofs, streets) are already targets
    # (the whole ground of the town zone is re-synthesised, so no strip of modern yard meets the fill inside the zone; survivors keep their pixels)
    town_can = town.copy()
    town_sh = np.zeros((h, w), bool)
    open_fill = (deep & ~woods_fill) | rem_d | sh | town_can | town_sh
    open_fill &= ~woods_fill
    # survivors / kept pixels inside the town zone: everything in the town zone is ground-synthesised except un-masked survivor pixels
    surv_keep = (cv2.dilate(surv, np.ones((3, 3), np.uint8)) > 0) if surv is not None else np.zeros((h, w), bool)
    open_fill &= ~surv_keep
    town_fill = open_fill & town
    open_fill = open_fill & ~town
    for kind, mask, bank, clsv, gk in (
        ('open', open_fill, banks['field'], 1, None), ('town', town_fill, banks['town'], 1, None), ('woods', woods_fill | ((add == 1)), banks['woods'], 2, None)):
        if not mask.any():
            continue
        # known pixels for the guide: not part of any synthesis region, not canopy (open) / canopy (woods)
        if kind in ('open', 'town'):
            known = ~(open_fill | town_fill | woods_fill | deep | (tg == 1)) & (canopy == 0) & ~sh & (lc != 2) & (lc != 3)
            if veg is not None:
                known &= veg          # the guide colour comes from vegetated ground only: never from pavement, bare rock, roofs or soil that was left beside a removed site
        else:
            known = ~(open_fill | town_fill | woods_fill | deep | (tg == 1)) & (canopy > 0)
        g = guide_field(out, known, default=(70.0, 106.0, 91.0) if kind == 'woods' else (120.0, 130.0, 122.0))
        # feather into the neighbouring pixels: dilate the mask by 1 so the seam is inside the fill
        m = cv2.dilate(mask.astype(np.uint8), np.ones((3, 3), np.uint8)).astype(bool) & ~(out_known_protect(tg, lc, mask))
        m |= mask
        tx = tex_map(out, known, default=float(np.median(bank.tex)))
        if kind == 'town':
            pg, pt, pcid = parcel_guide(h, w, org, bank)
            g = 0.25 * g + 0.75 * pg          # the parcel colour leads, the surroundings keep a quarter (no step at the edge of the town zone)
            tx = 0.3 * tx + 0.7 * pt
        Q.quilt(out, m, bank, g, guide_tex=tx, ov=6, seed=seed + clsv + (7 if kind == 'town' else 0))
        out = Q.boundary_match(out, m, sigma=10.0)
        if kind == 'town':
            out = parcel_tone(out, m, pcid)
        cls[m] = clsv
    cls[town & (cls == 1)] = 4
    cls[(add == 2) & (cls == 0)] = 3
    if surv is not None:
        keep = surv > 0
        out[keep] = f[keep]               # survivors: the real roof pixels are restored whatever any fill did around them
        cls[keep] = 0
    return np.clip(out + 0.5, 0, 255).astype(np.uint8), cls

def out_known_protect(tg, lc, mask):
    return np.zeros(tg.shape, bool)

