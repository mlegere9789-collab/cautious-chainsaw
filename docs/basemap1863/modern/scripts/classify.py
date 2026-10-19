"""Rule-based class assignment of the loaded vector records -> the inventory classes of MODERN-FEATURES.md.

One rule table, no judgement calls hidden in code. A record that no rule matches is kept as class 'OTHER' with its source tags,
so nothing is silently dropped; the per-class counts in results/inventory.json include OTHER.

removal: what the 1863 reconstruction does with the class
  REMOVE      the object did not exist in 1863 (or cannot be shown to have existed): it is cut out of the imagery
  REMOVE_REPLACE  the modern surface is cut out, and an 1863 feature on the same line (road, building) may be drawn back by the layer that owns it (roads1863, structures1863) from its own sources
  KEEP        the class is not removed by this layer (natural / possibly 1863): listed, never silently erased
  UNKNOWN     whether it existed in 1863 is not established by any source read here: kept in the picture, flagged, to be decided with a source
"""
from vec_load import *

CLASSES = {
    # code: (label, kind, removal, note)
    'ROAD_ARTERIAL': ('Arterial roads (US/State routes, bypass, ramps)', 'line', 'REMOVE_REPLACE', 'The 1863 road net is drawn back by the roads layer; US 15 bypass, ramps and the 20th-century realignments have no 1863 counterpart'),
    'ROAD_LOCAL': ('Local roads, streets, park avenues', 'line', 'REMOVE_REPLACE', 'Many follow an 1863 alignment (Emmitsburg, Taneytown, Baltimore Pike); the surface is removed, the 1863 road is redrawn from period maps'),
    'ROAD_SERVICE': ('Service roads, driveways, parking aisles', 'line', 'REMOVE', 'Almost all are post-1863; farm lanes that existed are redrawn by the roads layer'),
    'PARKING': ('Parking lots', 'area', 'REMOVE', 'All paved lots are post-1863'),
    'PATH': ('Footways, trails, steps, cycleways', 'line', 'REMOVE', 'Modern visitor trails; wide worn paths in the image are caught by the pixel detector, not by this class'),
    'TRACK': ('Tracks (unpaved farm/park lanes)', 'line', 'UNKNOWN', 'May follow a farm lane that existed in 1863; needs the roads layer'),
    'RAIL': ('Railways', 'line', 'UNKNOWN', 'The Gettysburg Railroad line and the Unfinished Railroad grade pre-date the battle; later spurs and yards did not; needs a dated source per segment'),
    'AIRFIELD': ('Runways, helipads, aprons', 'area', 'REMOVE', 'No aircraft facilities in 1863'),
    'BUILDING': ('Buildings (Adams County 2023 outlines)', 'area', 'REMOVE_REPLACE', 'Roofs, walls and cast shadows are cut out; buildings that stood in 1863 are redrawn by the structures layer from HABS/NPS/period-map sources'),
    'STRUCTURE_OTHER': ('Silos, tanks, chimneys, treatment tanks', 'area', 'REMOVE', 'Modern industrial or farm infrastructure'),
    'MONUMENT': ('Monuments, memorials, statues, markers, tablets', 'point', 'REMOVE', 'Every Gettysburg monument dates from 1863 or later; none stood on the field in July 1863'),
    'INFO_SIGN': ('Interpretive signs, information boards', 'point', 'REMOVE', 'Modern'),
    'TOWER_COMM': ('Communication towers and masts', 'point', 'REMOVE', 'Modern'),
    'TOWER_OBS': ('Observation towers', 'point', 'REMOVE', 'Observation towers on the field are memorial-era (post-battle) structures; the 1863 Lutheran Seminary cupola is part of a building, not in this class'),
    'WATER_TOWER': ('Water towers and tanks', 'point', 'REMOVE', 'Modern'),
    'POWER_LINE': ('Power lines and their cleared corridors', 'line', 'REMOVE', 'Modern; the cleared corridor through woodland is a separate vegetation edit'),
    'POWER_SUPPORT': ('Pylons, poles, portals, switches, transformers', 'point', 'REMOVE', 'Modern'),
    'POWER_SITE': ('Substations, power plants, solar arrays', 'area', 'REMOVE', 'Modern'),
    'FLAGPOLE': ('Flagpoles', 'point', 'REMOVE', 'Modern'),
    'FENCE_WALL': ('Mapped fences, walls, hedges, gates, guard rails', 'line', 'UNKNOWN', 'Modern NPS and farm fences mixed with rebuilt 1863 fence lines: not separable by the mapped data; at 1 m they are sub-pixel lines (cannot be seen), so nothing is painted out for them'),
    'SITE_FURNITURE': ('Street lamps, traffic signals, stop signs, crossings, bus stops', 'point', 'REMOVE', 'Modern'),
    'GOLF': ('Golf courses and their features', 'area', 'REMOVE', 'Modern land use; needs a land-cover replacement, not a patch fill'),
    'SPORTS_REC': ('Sports pitches, tracks, pools, playgrounds, camp sites', 'area', 'REMOVE', 'Modern'),
    'DEVELOPED_LAND': ('Residential, commercial, industrial, retail land use', 'area', 'REMOVE_REPLACE', 'Modern developed land; the ground is replaced by the 1863 land cover from the landcover layer'),
    'QUARRY_LANDFILL': ('Quarries, landfills, construction', 'area', 'UNKNOWN', 'Terrain change: the 1863 ground surface is not recoverable from the modern lidar alone'),
    'WATER_MODERN': ('Basins, wastewater ponds, reservoirs, golf hazards', 'area', 'REMOVE', 'Engineered water, post-1863'),
    'WATER_POND': ('Ponds and lakes (origin not stated)', 'area', 'UNKNOWN', 'Farm ponds and dammed pools: 1863 existence needs a period map; kept'),
    'CEMETERY': ('Cemeteries', 'area', 'UNKNOWN', 'Evergreen Cemetery pre-dates the battle; the Soldiers National Cemetery was created after it (dedicated November 1863); later sections of both did not exist: needs a dated plan per section'),
    'HYDRO_STREAM': ('Streams, rivers, ditches (OSM waterway)', 'line', 'KEEP', 'Natural drainage: not removed; modern channelisation or culverts are not separable here'),
    'LANDCOVER_OSM': ('Mapped land cover: farmland, forest, orchard, meadow, grass', 'area', 'KEEP', 'Modern land cover for the land-cover layer to compare with 1863; not removed here'),
    'HISTORIC_OTHER': ('Other historic or attraction features (hollow way, bridges, piers)', 'any', 'UNKNOWN', 'Each needs a dated source'),
    'OTHER': ('Unclassified mapped features', 'any', 'UNKNOWN', 'No rule matched; kept for review'),
}


def classify_osm(r):
    t = r['tags']
    g = r['geom']
    h = t.get('highway')
    if h:
        if t.get('golf') == 'cartpath':
            return 'ROAD_SERVICE', 'golf cart path'
        if h in ('motorway', 'motorway_link', 'trunk', 'trunk_link', 'primary', 'primary_link', 'secondary', 'secondary_link'):
            return 'ROAD_ARTERIAL', h
        if h in ('tertiary', 'tertiary_link', 'residential', 'unclassified', 'living_street'):
            return 'ROAD_LOCAL', h
        if h in ('service', 'raceway', 'construction', 'busway'):
            return 'ROAD_SERVICE', t.get('service', h)
        if h in ('footway', 'path', 'cycleway', 'steps', 'pedestrian', 'bridleway', 'corridor'):
            return 'PATH', h
        if h == 'track':
            return 'TRACK', h
        if h in ('street_lamp', 'traffic_signals', 'stop', 'crossing', 'bus_stop', 'give_way', 'speed_camera'):
            return 'SITE_FURNITURE', h
    if t.get('railway') in ('rail', 'abandoned', 'disused', 'station', 'light_rail', 'preserved'):
        return 'RAIL', t['railway']
    if t.get('aeroway'):
        return 'AIRFIELD', t['aeroway']
    if t.get('amenity') == 'parking' or t.get('parking') or t.get('building') == 'parking_garage':
        return 'PARKING', t.get('parking', 'surface')
    if t.get('historic') in ('monument', 'memorial', 'wayside_cross', 'cannon', 'tomb') or t.get('memorial'):
        if t.get('historic') == 'ruins':
            return 'OTHER', 'ruins'
        return 'MONUMENT', t.get('memorial') or t.get('historic')
    if t.get('tourism') == 'information' or t.get('tourism') == 'information;map':
        return 'INFO_SIGN', t.get('information', 'board')
    if t.get('tourism') == 'artwork':
        return 'MONUMENT', 'artwork'
    mm = t.get('man_made')
    if t.get('tower:type') == 'observation' or mm == 'observation_tower':
        return 'TOWER_OBS', 'observation'
    if t.get('tower:type') == 'communication' or mm in ('mast', 'communications_tower', 'antenna'):
        return 'TOWER_COMM', mm or 'communication'
    if mm == 'tower':
        return 'TOWER_COMM', 'tower'
    if mm in ('water_tower', 'water_tank'):
        return 'WATER_TOWER', mm
    if mm == 'flagpole':
        return 'FLAGPOLE', mm
    if mm in ('silo', 'storage_tank', 'chimney', 'clarifier', 'works', 'wastewater_plant', 'water_works', 'reservoir_covered'):
        return 'STRUCTURE_OTHER', mm
    if mm in ('pipeline',):
        return 'STRUCTURE_OTHER', mm
    p = t.get('power')
    if p in ('line', 'minor_line', 'cable'):
        return 'POWER_LINE', p
    if p in ('tower', 'pole', 'portal', 'switch', 'transformer', 'compensator', 'terminal'):
        return 'POWER_SUPPORT', p
    if p in ('substation', 'plant', 'generator'):
        return 'POWER_SITE', p + (':' + t.get('generator:source', '') if p == 'generator' else '')
    b = t.get('barrier')
    if b:
        return 'FENCE_WALL', b
    if any(k.startswith('golf') for k in t) or t.get('leisure') in ('golf_course',):
        return 'GOLF', t.get('golf') or 'golf_course'
    lz = t.get('leisure')
    if lz in ('pitch', 'track', 'swimming_pool', 'playground', 'stadium', 'sports_centre', 'fitness_station', 'miniature_golf', 'water_park', 'picnic_table', 'marina', 'dog_park', 'fitness_centre') or t.get('tourism') in ('camp_site', 'caravan_site'):
        return 'SPORTS_REC', lz or t.get('tourism')
    lu = t.get('landuse')
    if lu in ('residential', 'commercial', 'industrial', 'retail', 'garages', 'railway', 'institutional', 'education'):
        return 'DEVELOPED_LAND', lu
    if lu in ('quarry', 'landfill', 'construction', 'brownfield'):
        return 'QUARRY_LANDFILL', lu
    if lu == 'cemetery' or t.get('amenity') == 'grave_yard':
        return 'CEMETERY', 'cemetery'
    if t.get('water') in ('basin', 'wastewater', 'reservoir', 'stormwater', 'retention', 'lagoon', 'moat') :
        return 'WATER_MODERN', t['water']
    if t.get('natural') == 'water' or t.get('water') in ('pond', 'lake'):
        return 'WATER_POND', t.get('water', 'water')
    if t.get('building'):
        return 'BUILDING', t['building']
    if t.get('waterway'):
        return 'HYDRO_STREAM', t['waterway']
    if lu == 'reservoir':
        return 'WATER_MODERN', 'reservoir'
    if lu in ('farmland', 'forest', 'meadow', 'orchard', 'grass', 'farmyard', 'greenhouse_horticulture', 'vineyard', 'allotments', 'basin', 'village_green', 'flowerbed', 'religious', 'recreation_ground'):
        if lu in ('religious', 'recreation_ground', 'greenhouse_horticulture'):
            return 'DEVELOPED_LAND', lu
        return 'LANDCOVER_OSM', lu
    if t.get('historic') or t.get('tourism') == 'attraction' or mm in ('bridge', 'pier'):
        return 'HISTORIC_OTHER', t.get('historic') or mm or 'attraction'
    if t.get('amenity') or t.get('leisure') or t.get('tourism'):
        return 'DEVELOPED_LAND', t.get('amenity') or t.get('leisure') or t.get('tourism')
    return 'OTHER', ''


def classify_all(records):
    for i, r in enumerate(records):
        if r['src'] == 'OSM':
            r['cls'], r['sub'] = classify_osm(r)
    return records
