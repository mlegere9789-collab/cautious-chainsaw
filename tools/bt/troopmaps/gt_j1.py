"""gt_j1.py : ground-truth control candidates for the July 1 area, independent of Warren: footprints of surviving buildings (2023 Adams County outlines) from the structures layer,
plus Warren GCPs (modern ground truth from NAIP/TIGER/DEM) in the town. Writes tools/bt/troopmaps/gt_j1.json (id, name, E, N UTM18N, sigma_gt_m, basis)."""
import json, os, numpy as np
from pyproj import Transformer
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
t = Transformer.from_crs('EPSG:4326', 'EPSG:32618', always_xy=True)
d = json.load(open(os.path.join(ROOT, 'docs/basemap1863/features/structures/structures.geojson'), encoding='utf8'))
want = {'STR-MCPHERSON-BARN1': 6, 'STR-TOWN-THOMPSON_HOUSE': 6, 'STR-TOWN-SCHMUCKER_HALL': 10, 'STR-TOWN-SCHULTZ_HOUSE': 12, 'STR-TOWN-SHEADS_HOUSE': 10,
        'STR-MCMILLAN-HOUSE1': 8, 'STR-TOWN-PENN_HALL': 10, 'STR-TOWN-CHRIST_LUTHERAN': 12, 'STR-TOWN-COURTHOUSE': 10, 'STR-TOWN-DEPOT': 12,
        'STR-TOWN-GARLACH_HOUSE': 6, 'STR-TOWN-WADE_HOUSE': 6, 'STR-TOWN-DOBBIN_HOUSE': 10, 'STR-TOWN-GATEHOUSE': 10, 'STR-MCLEAN-BARN1': 6, 'STR-MCLEAN-HOUSE1': 10,
        'STR-TOWN-BLACK_HORSE_TAVERN': 8, 'STR-CULP-HOUSE1': 8, 'STR-TOWN-PRESBYTERIAN_CHURCH': 25}
def flat(c):
    if isinstance(c[0], (int, float)): yield c
    else:
        for x in c: yield from flat(x)
out = []
for f in d['features']:
    p = f['properties']
    if p['id'] in want and f['geometry']:
        pts = np.array(list(flat(f['geometry']['coordinates']))); e, n = t.transform(*pts[:, :2].mean(0))
        # bbox centre is less sensitive to vertex density than the vertex mean
        e2, n2 = t.transform((pts[:, 0].min() + pts[:, 0].max()) / 2, (pts[:, 1].min() + pts[:, 1].max()) / 2)
        out.append(dict(id=p['id'], name=p['name'], E=round(e2, 1), N=round(n2, 1), sigma_gt_m=want[p['id']], basis='2023 Adams County building outline (structures layer), bbox centre'))
w = json.load(open(os.path.join(ROOT, 'docs/basemap1863/maps/gcps/warren.json')))['gcps']
for g in w:
    if g['id'] in ('W011', 'W012', 'T101', 'T102', 'T103', 'W014', 'W015', 'F010', 'W002', 'W001', 'W010', 'W013', 'W003', 'W004', 'F001', 'F005', 'F009'):
        out.append(dict(id=g['id'], name=g['name'], E=g['en'][0], N=g['en'][1], sigma_gt_m=10, basis='Warren GCP, modern ground truth (NAIP/TIGER/DEM), maps/gcps/warren.json'))
json.dump(out, open(os.path.join(os.path.dirname(__file__), 'gt_j1.json'), 'w'), indent=1)
for o in out: print(o['id'], o['name'][:50], o['E'], o['N'])
