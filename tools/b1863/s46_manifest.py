"""Stage 46: tiles manifest (docs/basemap1863/tiles/manifest.json) with per-tile sha256, scheme, bounds, attribution and the inputs' hashes."""
import sys, os, json, hashlib, time, subprocess
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common as C

def sha(path, n=None):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        while True:
            b = f.read(1 << 22)
            if not b: break
            h.update(b)
    return h.hexdigest()

def main():
    idx = json.load(open(os.path.join(C.BUILD, 'tiles_index.json')))
    by = {}
    for r in idx:
        e = by.setdefault(r['z'], dict(tiles=0, bytes=0, xmin=1e9, xmax=-1, ymin=1e9, ymax=-1))
        e['tiles'] += 1; e['bytes'] += r['bytes']; e['xmin'] = min(e['xmin'], r['x']); e['xmax'] = max(e['xmax'], r['x']); e['ymin'] = min(e['ymin'], r['y']); e['ymax'] = max(e['ymax'], r['y'])
    inputs = {}
    for name, p in (('base_naip_2013-06-04_1m_mosaic', C.BASE_TIF), ('modern_removal_mask_1m', C.MASK_TIF)):
        inputs[name] = dict(sha256=sha(p), bytes=os.path.getsize(p))
    for rel in ('features/landcover/woods_1863.geojson', 'features/landcover/orchards_1863.geojson', 'features/landcover/change_remove_modern_canopy.geojson', 'features/roads-rail-water/roads.geojson',
                'features/structures/structures.geojson', 'features/roads-rail-water/fences.geojson', 'features/roads-rail-water/bridges.geojson', 'features/roads-rail-water/railways.geojson', 'features/landcover/fields_documented_1863.geojson'):
        p = os.path.join(C.DOCS, rel)
        inputs[rel] = dict(sha256=sha(p), bytes=os.path.getsize(p))
    try:
        commit = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=C.ROOT).decode().strip()
    except Exception:
        commit = None
    try:
        ps = json.load(open(os.path.join(C.BUILD, 'prov_stats.json')))['classes']
        class_ha = {k: v['ha'] for k, v in ps.items()}
    except Exception:
        class_ha = {}
    man = dict(
        class_areas_ha=class_ha,
        title='Reconstruction of Gettysburg, July 1863, base map tiles',
        label='RECONSTRUCTION. No aerial photograph of 1863 exists. This is a modern public-domain aerial photograph (USDA NAIP, 2013-06-04, 1 m) with post-1863 features removed and 1863 features added from period maps and records. '
              'It is not an exact replica and no accuracy of 100 percent is claimed: every changed region and every added feature is listed in the provenance layer (docs/basemap1863/PROVENANCE-LAYER) with its sources, method, positional error and confidence. What is unknown is left as photographed or neutral.',
        attribution='Reconstruction of Gettysburg, July 1863, built from USGS/USDA NAIP imagery (2013-06-04, public domain, "NAIP imagery provided by USDA Farm Service Agency") and USGS 3DEP lidar, with period maps from the Library of Congress (G. K. Warren 1868-69, J. B. Bachelder 1876, Hopkins/Converse 1858), '
                    'National Park Service documents, US Census TIGER, USGS NHD, OpenStreetMap contributors (ODbL; lists of modern features to remove and the centre lines of drawn roads and streets), Wikipedia contributors (CC BY-SA 4.0; monument list) and Adams County GIS (2023; used to decide what to remove).',
        scheme='xyz', tile_size=512, tile_format='webp', url_template='tiles/{z}/{x}/{y}.webp',
        scheme_note='Mapbox GL convention: the world is 512 px at zoom 0, tile (z,x,y) is the standard slippy-map index, tileSize 512. For a 256 px consumer use zoom z+1 with the 4 child indices.',
        crs='EPSG:3857', bounds_wgs84=[-77.34375, 39.75788, -77.146, 39.87602], native_max_zoom=16,
        native_note='The source photograph is 1.0 m per pixel; z16 (0.92 m) is native. z17 tiles exist only around ten hotspots and are enlargements (no new detail). No z18 tiles are shipped (it would be a 4x enlargement).',
        zoom_levels={str(z): v for z, v in sorted(by.items())}, total_tiles=len(idx), total_bytes=sum(r['bytes'] for r in idx),
        coverage=dict(z11_15='whole data box', z16='Warren-sheet coverage plus 500 m', z17="within 650 m of Peach Orchard, Wheatfield, Little Round Top, The Angle, town centre, Devil's Den, Culp's Hill, Cemetery Hill, Seminary Ridge, Big Round Top"),
        provenance_tiles='docs/basemap1863/PROVENANCE-LAYER/tiles/{z}/{x}/{y}.png (palette PNG, class codes of PROVENANCE-LAYER/classes.json), z13 and finer', provenance_vectors=['PROVENANCE-LAYER/added_features.geojson', 'PROVENANCE-LAYER/changed_regions.geojson.gz'],
        build=dict(pipeline='tools/b1863 (BUILD.md)', git_commit_at_build=commit, built_utc=time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), inputs=inputs),
        tiles={'%d/%d/%d' % (r['z'], r['x'], r['y']): [r['bytes'], r['sha256']] for r in idx})
    with open(os.path.join(C.TILES, 'manifest.json'), 'w', encoding='utf-8') as f:
        json.dump(man, f, separators=(',', ':'))
    print('manifest', os.path.getsize(os.path.join(C.TILES, 'manifest.json')), 'bytes;', len(idx), 'tiles;', round(man['total_bytes'] / 1e6, 2), 'MB')

if __name__ == '__main__':
    main()
