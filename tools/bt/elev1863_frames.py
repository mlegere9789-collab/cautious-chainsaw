"""Task 1: reconcile the two Warren georeferences in the b1863 build.

Quantifies the disagreement between the 'affine' frame (maps/transforms/warren-1869.json) and the
'ffd' frame (landcover similarity + free-form deformation), writes frames_reconcile.json and a residual
map PNG.  The CHOICE of frame is made in elev1863_frame_choice.py from contour-versus-DEM evidence, so the
choice is evidence-based and written to frames_reconcile.json under "decision" only after that script runs.
Run: PYTHONIOENCODING=utf-8 python tools/bt/elev1863_frames.py
"""
import json
import os
import sys
import numpy as np
sys.path.insert(0, os.path.dirname(__file__))
import elev1863_common as C

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

aff = C.load_frame('affine')
ffd = C.load_frame('ffd')

# ---- 1. difference field over the sheet inner area
# inner neatline from the scan is about x 330..8560, y 400..9500 (frame margins excluded)
xs = np.arange(250, C.W - 250, 50.0)
ys = np.arange(450, C.H - 250, 50.0)
X, Y = np.meshgrid(xs, ys)
Ea, Na = aff[0](X, Y)
Ef, Nf = ffd[0](X, Y)
dE, dN = Ef - Ea, Nf - Na     # FFD minus affine, metres
d = np.hypot(dE, dN)
stats = {
    'n_grid_points': int(d.size),
    'median_m': float(np.median(d)),
    'mean_m': float(d.mean()),
    'p90_m': float(np.percentile(d, 90)),
    'p95_m': float(np.percentile(d, 95)),
    'max_m': float(d.max()),
    'mean_vector_E_N_m': [float(dE.mean()), float(dN.mean())],
}

# regional breakdown (north / south of the town row, west / east of the centre) in scan px
cells = {}
for name, (x0, x1, y0, y1) in {
        'NW': (0, 4439, 0, 4000), 'NE': (4439, 9000, 0, 4000),
        'town_band': (0, 9000, 4000, 5200),
        'SW': (0, 4439, 5200, 9845), 'SE': (4439, 9000, 5200, 9845),
        'south_of_town_all': (0, 9000, 4200, 9845)}.items():
    m = (X >= x0) & (X < x1) & (Y >= y0) & (Y < y1)
    cells[name] = {'n': int(m.sum()), 'median_m': float(np.median(d[m])), 'p95_m': float(np.percentile(d[m], 95)),
                   'max_m': float(d[m].max()), 'mean_vector_E_N_m': [float(dE[m].mean()), float(dN[m].mean())]}

# ---- 2. control-point evidence (23 GCPs: ground E,N read from NAIP/3DEP by the b1863 builders)
gcps, lines = C.load_gcps()
tr = json.load(open(os.path.join(C.B, 'maps', 'transforms', 'warren-1869.json')))
loo = {r['id']: r for r in tr['residuals']} if isinstance(tr['residuals'], list) else {}
rows = []
for g in gcps:
    px, py = g['px']
    E, N = g['en']
    ea, na = aff[0](px, py)
    ef, nf = ffd[0](px, py)
    rows.append({'id': g['id'], 'name': g['name'], 'kind': g['kind'],
                 'affine_err_E_N_m': [float(ea - E), float(na - N)], 'affine_err_m': float(np.hypot(ea - E, na - N)),
                 'ffd_err_E_N_m': [float(ef - E), float(nf - N)], 'ffd_err_m': float(np.hypot(ef - E, nf - N))})


def rms(v):
    v = np.asarray(v)
    return float(np.sqrt((v ** 2).mean()))


ea_all = [r['affine_err_m'] for r in rows]
ef_all = [r['ffd_err_m'] for r in rows]
excl = {'F006', 'F007'}      # builders excluded the two J. Weikert buildings (identity unverified)
ea_in = [r['affine_err_m'] for r in rows if r['id'] not in excl]
ef_in = [r['ffd_err_m'] for r in rows if r['id'] not in excl]
ctrl = {
    'n_points': len(rows),
    'affine_rms_all_m': rms(ea_all), 'ffd_rms_all_m': rms(ef_all),
    'affine_median_all_m': float(np.median(ea_all)), 'ffd_median_all_m': float(np.median(ef_all)),
    'affine_rms_without_F006_F007_m': rms(ea_in), 'ffd_rms_without_F006_F007_m': rms(ef_in),
    'affine_leave_one_out_rms_m_from_json': tr['accuracy'].get('loo_rmse_m') if isinstance(tr.get('accuracy'), dict) else None,
    'note': ('the affine was FITTED to these points (in-sample here; its stored leave-one-out figure is the fair comparison, 16.5 m). '
             'The FFD was fitted to modern road centrelines and never saw these points, so its error here is out-of-sample.'),
    'points': rows,
}

# ---- 3. road lines (6 independent scan points on road centrelines): distance to modern TIGER centreline of the same road
import shapely.geometry as sg
roads = {}
for f in ('primary', 'secondary', 'local'):
    g = json.load(open(os.path.join(C.ROOT, 'tmp', 'b1863', 'maps', 'ref', f'tiger_{f}.geojson')))
    for ft in g['features']:
        nm = ft['properties'].get('BASENAME') or ''
        roads.setdefault(nm, []).append(sg.shape(ft['geometry']))
key = {'Emmitsburg Rd': 'Emmitsburg', 'Taneytown Rd': 'Taneytown', 'Baltimore Pike': 'Baltimore'}
road_rows = []
for L in lines:
    geoms = roads.get(key[L['road']], [])
    if not geoms:
        continue
    multi = sg.MultiLineString([g for g in geoms if g.geom_type == 'LineString'])
    out = {'id': L['id'], 'road': L['road']}
    for nm, fr in (('affine', aff), ('ffd', ffd)):
        E, N = fr[0](*L['px'])
        out[nm + '_dist_to_modern_centreline_m'] = float(multi.distance(sg.Point(float(E), float(N))))
    road_rows.append(out)
roadstat = {'n': len(road_rows),
            'affine_rms_m': rms([r['affine_dist_to_modern_centreline_m'] for r in road_rows]),
            'ffd_rms_m': rms([r['ffd_dist_to_modern_centreline_m'] for r in road_rows]),
            'points': road_rows,
            'note': 'only 6 points; the b1863 check 2 used 45 coherent road runs (verification/check2-georeference.md section 4): affine 17.1 m rms, ffd 11.1 m rms (ffd was fitted to roads, so in-sample)'}

res = {'what': 'Reconciliation of the two Warren px->UTM frames in the b1863 build (PDF B.9.2 step 3 needs one frame)',
       'frames': {'affine': 'docs/basemap1863/maps/transforms/warren-1869.json (23 GCPs, structures/roads layers)',
                  'ffd': 'docs/basemap1863/features/landcover/scripts/chamfer_fit.json + ffd_fit.json (road chamfer fit, land-cover layers)'},
        'disagreement_ffd_minus_affine_over_sheet': stats, 'disagreement_by_region': cells,
        'control_points': ctrl, 'road_line_points': roadstat,
        'b1863_check2_reported': {'affine_vs_ffd_on_45_road_runs': 'rms 32.8, median 24.5, max 113 m, mean (-4.1, -22.3) m',
                                  'source': 'docs/basemap1863/verification/check2-georeference.md section 4'}}
json.dump(res, open(os.path.join(C.OUT, 'frames_reconcile.json'), 'w'), indent=1)
print(json.dumps({k: res[k] for k in ('disagreement_ffd_minus_affine_over_sheet', 'disagreement_by_region')}, indent=1))
print('ctrl', {k: v for k, v in ctrl.items() if k != 'points'})
print('road', {k: v for k, v in roadstat.items() if k != 'points'})

# ---- 4. residual map
fig, ax = plt.subplots(1, 2, figsize=(16, 9))
im = ax[0].imshow(d, extent=[xs[0], xs[-1], ys[-1], ys[0]], cmap='magma', vmin=0, vmax=80)
ax[0].set_title('|FFD - affine| ground displacement (m) over the Warren scan')
plt.colorbar(im, ax=ax[0], fraction=0.04)
st = 6
ax[1].quiver(X[::st, ::st], Y[::st, ::st], dE[::st, ::st], -dN[::st, ::st], d[::st, ::st], cmap='magma', angles='xy', scale_units='xy', scale=0.02)
for r, g in zip(rows, gcps):
    ax[1].plot(*g['px'], 'c+')
ax[1].invert_yaxis() if ax[1].yaxis_inverted() is False else None
ax[1].set_xlim(0, C.W)
ax[1].set_ylim(C.H, 0)
ax[1].set_title('vector FFD - affine (E right, N up; arrows scaled 50 m = 1000 px), cyan + = GCPs')
ax[1].set_aspect('equal')
ax[0].set_aspect('equal')
plt.tight_layout()
plt.savefig(os.path.join(C.OUT, 'frames_residual_map.png'), dpi=70)
