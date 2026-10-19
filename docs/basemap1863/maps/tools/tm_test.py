from terrain_match import *
s = 1.027
A = [[1/s, 0, 4727 - 308266/s], [0, -1/s, 8691 + 4406431/s]]
im = Image.open(os.path.join(TMP, 'scans', 'cw0353500.jp2')).convert('L'); scan = np.array(im)
print(scan.shape)
def trial(ec, nc, half=700, tpl=450, sig=2.5):
    e0, n0, w, h = ec - half, nc - half, 2 * half, 2 * half
    g = scan_ground(scan, A, e0, n0, w, h); ink = 255 - g.astype(np.float32); ink = ndi.gaussian_filter(ink, sig)
    z = window(e0, n0, w, h)
    best = []
    for c in np.arange(0, 1.2192, 0.2438):
        ci = ndi.gaussian_filter(contour_img(z, c), sig)
        t = ink[half - tpl: half + tpl, half - tpl: half + tpl]
        r = cv2.matchTemplate(ci, t, cv2.TM_CCOEFF_NORMED)
        mx = r.max(); iy, ix = np.unravel_index(r.argmax(), r.shape)
        r2 = r.copy(); r2[max(0, iy-25):iy+26, max(0, ix-25):ix+26] = -1
        best.append((round(float(mx), 3), round(float(r2.max()), 3), ix - (half - tpl), (half - tpl) - iy, round(float(c), 2)))
    return best
for ec, nc in [(308700, 4406700), (309100, 4410500), (306500, 4412500)]:
    print(ec, nc); [print('  ', b) for b in trial(ec, nc)]
