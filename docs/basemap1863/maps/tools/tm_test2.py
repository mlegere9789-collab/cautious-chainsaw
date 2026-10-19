from terrain_match import *
s = 1.027
A = [[1/s, 0, 4727 - 308266/s], [0, -1/s, 8691 + 4406431/s]]
scan = np.array(Image.open(os.path.join(TMP, 'scans', 'cw0353500.jp2')).convert('L'))
def dog(a, s1=2.0, s2=10.0):
    return ndi.gaussian_filter(a, s1) - ndi.gaussian_filter(a, s2)
def trial(ec, nc, half=600, tpl=350):
    e0, n0, w, h = ec - half, nc - half, 2 * half, 2 * half
    g = scan_ground(scan, A, e0, n0, w, h); ink = dog(255 - g.astype(np.float32))
    z = window(e0, n0, w, h)
    out = []
    for c in np.arange(0, 1.2192, 0.1219):
        ci = dog(contour_img(z, c, sig=2.0))
        t = ink[half - tpl: half + tpl, half - tpl: half + tpl]
        r = cv2.matchTemplate(ci, t, cv2.TM_CCOEFF_NORMED)
        mx = r.max(); iy, ix = np.unravel_index(r.argmax(), r.shape)
        r2 = r.copy(); r2[max(0, iy-12):iy+13, max(0, ix-12):ix+13] = -1
        out.append((round(float(mx), 3), round(float(r2.max()), 3), int(ix - (half - tpl)), int((half - tpl) - iy), round(float(c), 2)))
    return out
for ec, nc in [(308500, 4406850), (309100, 4410500), (306500, 4412500), (307500, 4408500)]:
    print(ec, nc); [print('  ', b) for b in trial(ec, nc)]
