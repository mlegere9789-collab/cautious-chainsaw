"""Terrain maths in numpy only (no scipy/GDAL in this environment): separable gaussian smooth, Horn slope/aspect, multi-directional hillshade, marching-squares contours."""
import numpy as np

def gauss1d(sigma):
    r = max(1, int(round(sigma * 3))); x = np.arange(-r, r + 1); k = np.exp(-0.5 * (x / sigma) ** 2); return k / k.sum()

def smooth(a, sigma):
    if sigma <= 0: return a
    k = gauss1d(sigma); r = len(k) // 2
    p = np.pad(a, ((0, 0), (r, r)), mode='edge'); out = sum(k[i] * p[:, i:i + a.shape[1]] for i in range(len(k)))
    p = np.pad(out, ((r, r), (0, 0)), mode='edge'); return sum(k[i] * p[i:i + a.shape[0], :] for i in range(len(k)))

def box_down(a, k):
    if k == 1: return a
    h, w = a.shape[:2]; h2, w2 = h // k * k, w // k * k
    return a[:h2, :w2].reshape(h2 // k, k, w2 // k, k, *a.shape[2:]).mean(axis=(1, 3))

def slope_aspect(dem, cell):
    """Horn's method; cell = ground metres per pixel (square pixels). returns dz/dx (east), dz/dy (north) in m/m.  Row 0 is north."""
    p = np.pad(dem, 1, mode='edge')
    a, b, c = p[:-2, :-2], p[:-2, 1:-1], p[:-2, 2:]
    d, f = p[1:-1, :-2], p[1:-1, 2:]
    g, h, i = p[2:, :-2], p[2:, 1:-1], p[2:, 2:]
    dzdx = ((c + 2 * f + i) - (a + 2 * d + g)) / (8 * cell)
    dzdy = ((a + 2 * b + c) - (g + 2 * h + i)) / (8 * cell)          # north-up: (north rows - south rows)
    return dzdx, dzdy

def hillshade(dem, cell, zfactor=1.0, azimuths=(225, 270, 315, 360), weights=None, altitude=42.0):
    """Multi-directional hillshade in [0,1]; 'flat ground' gives sin(altitude).  Returned relative to flat so that 0.5 is neutral after normalisation by the caller."""
    dzdx, dzdy = slope_aspect(dem, cell)
    dzdx = dzdx * zfactor; dzdy = dzdy * zfactor
    alt = np.radians(altitude); out = 0; wsum = 0
    weights = weights or [1.0] * len(azimuths)
    for az, w in zip(azimuths, weights):
        a = np.radians(az)
        # light vector from azimuth (clockwise from north) and altitude; surface normal (-dzdx, -dzdy, 1)
        lx, ly, lz = np.sin(a) * np.cos(alt), np.cos(a) * np.cos(alt), np.sin(alt)
        s = (-dzdx * lx - dzdy * ly + lz) / np.sqrt(1 + dzdx ** 2 + dzdy ** 2)
        out = out + w * np.clip(s, 0, 1); wsum += w
    return out / wsum, np.sin(alt)
