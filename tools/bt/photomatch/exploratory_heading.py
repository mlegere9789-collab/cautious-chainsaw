#!/usr/bin/env python3
"""Exploratory reading, NOT a pre-registered test and not evidence for the gate: the heading that the clock tower of the Adams County Courthouse implies in the photograph of Gettysburg from the Evergreen Cemetery lodge (P28's print).
The tower (a square tower with a clock face, read from a zoom of the print at pixel x = 2995 of the 4096-px working copy; print area x from 82 to 4035) is taken to be the courthouse because the model's outline of the courthouse (STR-TOWN-COURTHOUSE) carries
the note 'about 70 ft clock tower': an identification by looking, not stated by a source. The bearing of the courthouse outline from the gatehouse station is computed from the repository's coordinates; the heading follows for a horizontal field of 30, 40 and 50 degrees.
Output: tools/bt/photomatch/exploratory_heading.json.  Usage: python3 -I tools/bt/photomatch/exploratory_heading.py"""
import json, math, os
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..')); BT = os.path.join(ROOT, 'docs', 'battle-theatre')
Z15 = 2 ** 15 * 512; meta = json.load(open(os.path.join(BT, 'render', 'prototype', 'data', 'terrain.json'))); BX, BY, BW, BH = meta['z15box']; MPP = meta['groundMPerZ15Px']
def xz(lng, lat):
    s = math.sin(lat * math.pi / 180); px = (lng + 180) / 360 * Z15; py = (0.5 - math.log((1 + s) / (1 - s)) / (4 * math.pi)) * Z15; return (px - BX - BW / 2) * MPP, (py - BY - BH / 2) * MPP
S = json.load(open(os.path.join(BT, 'app', 'data', 'structures3d.json'))); b = {x['id']: x for x in S['buildings'] + S['points']}
def cen(x): r = x['ring'][:-1]; return sum(p[0] for p in r) / len(r), sum(p[1] for p in r) / len(r)
gx, gz = xz(*cen(b['STR-TOWN-GATEHOUSE'])); cx, cz = xz(*cen(b['STR-TOWN-COURTHOUSE'])); brg = (math.degrees(math.atan2(cx - gx, -(cz - gz))) + 360) % 360; dist = math.hypot(cx - gx, cz - gz)
x_tower = (2995 - 82) / (4035 - 82); out = {'courthouse_bearing_deg': round(brg, 1), 'courthouse_distance_m': round(dist), 'tower_x_fraction_of_print_width': round(x_tower, 3), 'implied_heading_deg': {}}
for F in (30, 40, 50): a = 0.5 / math.tan(math.radians(F) / 2); out['implied_heading_deg'][str(F)] = round(brg - math.degrees(math.atan((x_tower - 0.5) / a)), 1)
out['_doc'] = 'Exploratory reading, not a test: the heading that the courthouse clock tower implies at a 30, 40 and 50 degree field. Read from the photograph, so not independent of it; the identification of the tower is by looking (the model note about a 70 ft clock tower).'
json.dump(out, open(os.path.join(HERE, 'exploratory_heading.json'), 'w'), indent=1); print(out)
