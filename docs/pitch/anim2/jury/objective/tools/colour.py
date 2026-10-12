"""colour.py - colour maths for the objective checks: sRGB <-> linear, WCAG relative luminance and contrast ratio, CIE Lab (D65), CIEDE2000, colour-vision-deficiency simulation.
Own implementations (no third-party colour library); tests at the bottom (python colour.py): the three CIEDE2000 pairs published by Sharma, Wu and Dalal (2005) that I use as a check,
and the WCAG contrast of black on white (21:1)."""
import math
import re
import numpy as np

M_RGB2XYZ = np.array([[0.4124564, 0.3575761, 0.1804375], [0.2126729, 0.7151522, 0.0721750], [0.0193339, 0.1191920, 0.9503041]])
WHITE = np.array([0.95047, 1.0, 1.08883])          # D65


def to_lin(c):
    c = np.asarray(c, dtype=np.float64) / 255.0
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def from_lin(l):
    l = np.clip(np.asarray(l, dtype=np.float64), 0, 1)
    return 255.0 * np.where(l <= 0.0031308, 12.92 * l, 1.055 * l ** (1 / 2.4) - 0.055)


def lum(rgb):
    """relative luminance (WCAG 2.x) of sRGB 0..255 array (..., 3)"""
    l = to_lin(rgb)
    return 0.2126 * l[..., 0] + 0.7152 * l[..., 1] + 0.0722 * l[..., 2]


def ratio(l1, l2):
    hi = np.maximum(l1, l2)
    lo = np.minimum(l1, l2)
    return (hi + 0.05) / (lo + 0.05)


def rgb2lab(rgb):
    l = to_lin(rgb)
    xyz = l @ M_RGB2XYZ.T / WHITE
    f = np.where(xyz > 216 / 24389, np.cbrt(xyz), (24389 / 27 * xyz + 16) / 116)
    L = 116 * f[..., 1] - 16
    a = 500 * (f[..., 0] - f[..., 1])
    b = 200 * (f[..., 1] - f[..., 2])
    return np.stack([L, a, b], axis=-1)


def de2000(lab1, lab2):
    """CIEDE2000 (kL = kC = kH = 1), after Sharma, Wu, Dalal 2005; arrays (..., 3)"""
    lab1 = np.asarray(lab1, dtype=np.float64)
    lab2 = np.asarray(lab2, dtype=np.float64)
    L1, a1, b1 = lab1[..., 0], lab1[..., 1], lab1[..., 2]
    L2, a2, b2 = lab2[..., 0], lab2[..., 1], lab2[..., 2]
    C1 = np.hypot(a1, b1)
    C2 = np.hypot(a2, b2)
    Cb = (C1 + C2) / 2
    G = 0.5 * (1 - np.sqrt(Cb ** 7 / (Cb ** 7 + 25 ** 7)))
    a1p = (1 + G) * a1
    a2p = (1 + G) * a2
    C1p = np.hypot(a1p, b1)
    C2p = np.hypot(a2p, b2)
    h1p = np.degrees(np.arctan2(b1, a1p)) % 360
    h2p = np.degrees(np.arctan2(b2, a2p)) % 360
    dLp = L2 - L1
    dCp = C2p - C1p
    dh = h2p - h1p
    dh = np.where(dh > 180, dh - 360, np.where(dh < -180, dh + 360, dh))
    dh = np.where(C1p * C2p == 0, 0, dh)
    dHp = 2 * np.sqrt(C1p * C2p) * np.sin(np.radians(dh) / 2)
    Lbp = (L1 + L2) / 2
    Cbp = (C1p + C2p) / 2
    hsum = h1p + h2p
    hb = np.where(np.abs(h1p - h2p) <= 180, hsum / 2, np.where(hsum < 360, (hsum + 360) / 2, (hsum - 360) / 2))
    hb = np.where(C1p * C2p == 0, hsum, hb)
    T = 1 - 0.17 * np.cos(np.radians(hb - 30)) + 0.24 * np.cos(np.radians(2 * hb)) + 0.32 * np.cos(np.radians(3 * hb + 6)) - 0.20 * np.cos(np.radians(4 * hb - 63))
    dth = 30 * np.exp(-(((hb - 275) / 25) ** 2))
    Rc = 2 * np.sqrt(Cbp ** 7 / (Cbp ** 7 + 25 ** 7))
    Sl = 1 + 0.015 * (Lbp - 50) ** 2 / np.sqrt(20 + (Lbp - 50) ** 2)
    Sc = 1 + 0.045 * Cbp
    Sh = 1 + 0.015 * Cbp * T
    Rt = -np.sin(np.radians(2 * dth)) * Rc
    return np.sqrt((dLp / Sl) ** 2 + (dCp / Sc) ** 2 + (dHp / Sh) ** 2 + Rt * (dCp / Sc) * (dHp / Sh))


# Machado, Oliveira, Fernandes (2009), severity 1.0, applied to LINEAR RGB.  Values typed from memory; they are identical to the matrices used by the forks' own tools (d1/tools/cvd-sheet.py,
# d2/tools/colour-tests.mjs, d3/tools/cvd-sheet.py), which I compared with grep.  I did not re-read the paper in this session.
CVD = {
    'normal': np.eye(3),
    'protanopia': np.array([[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]]),
    'deuteranopia': np.array([[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.011820, 0.042940, 0.968881]]),
    'tritanopia': np.array([[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.303900]]),
}


def simulate(rgb, kind):
    l = to_lin(rgb)
    return from_lin(np.clip(l @ CVD[kind].T, 0, 1))


_RGB = re.compile(r'rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)')
_SRGB = re.compile(r'color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*/\s*([\d.]+%?))?\s*\)')


def parse_css(s):
    """-> (r, g, b, a) with r,g,b 0..255 and a 0..1, or None (gradients, unknown)"""
    if s is None:
        return None
    s = s.strip().lower()
    if s == 'transparent':
        return (0, 0, 0, 0.0)
    if s.startswith('#'):
        h = s[1:]
        if len(h) in (3, 4):
            h = ''.join(ch * 2 for ch in h)
        if len(h) == 6:
            return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), 1.0)
        if len(h) == 8:
            return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), int(h[6:8], 16) / 255)
    m = _RGB.match(s)
    if m:
        a = m.group(4)
        a = 1.0 if a is None else (float(a[:-1]) / 100 if a.endswith('%') else float(a))
        return (float(m.group(1)), float(m.group(2)), float(m.group(3)), a)
    m = _SRGB.match(s)
    if m:
        a = m.group(4)
        a = 1.0 if a is None else (float(a[:-1]) / 100 if a.endswith('%') else float(a))
        return (float(m.group(1)) * 255, float(m.group(2)) * 255, float(m.group(3)) * 255, a)
    return None


if __name__ == '__main__':
    # Sharma, Wu, Dalal (2005) test pairs: (L, a, b) pairs and their CIEDE2000
    tests = [((50.0, 2.6772, -79.7751), (50.0, 0.0, -82.7485), 2.0425), ((50.0, 2.5, 0.0), (50.0, 0.0, -2.5), 4.3065), ((50.0, 2.5, 0.0), (73.0, 25.0, -18.0), 27.1492)]
    ok = True
    for a, b, want in tests:
        got = float(de2000(np.array(a), np.array(b)))
        print('dE00', a, b, 'got %.4f want %.4f' % (got, want), 'OK' if abs(got - want) < 1e-3 else 'FAIL')
        ok &= abs(got - want) < 1e-3
    r = float(ratio(lum(np.array([0, 0, 0.0])), lum(np.array([255, 255, 255.0]))))
    print('black on white', r, 'OK' if abs(r - 21) < 1e-9 else 'FAIL')
    lab = rgb2lab(np.array([255, 255, 255.0]))
    print('white Lab', lab, 'OK' if abs(lab[0] - 100) < 0.05 and abs(lab[1]) < 0.05 else 'FAIL')
    print('ALL OK' if ok else 'SOME FAILED')
