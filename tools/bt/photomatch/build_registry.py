#!/usr/bin/env python3
"""Join everything the Q16 photo-match work knows about each catalogued photograph into photograph_registry.json (one entry per record: 109 first-run + 18 added + the records of the wide search, third pass).
Inputs: catalogue.json, catalogue_additions.json, catalogue_wide_items.json (+ wide_data.py, wide_images_ledger.json), registry_data.py (classification by a person who looked at every image), position_statements.json, nps_then_to_loc.json,
poses.json, verdicts.json (pose verdicts written after looking at the review sheets), images_ledger.json.
Output: tools/bt/photomatch/photograph_registry.json. The verdict of a record with a pose is the pose verdict; every other record gets 'cannot judge' with the reason class and text of registry_data.py.
Usage: python3 -I tools/bt/photomatch/build_registry.py"""
import json, os, sys, importlib.util
HERE = os.path.dirname(os.path.abspath(__file__))
def J(n): return json.load(open(os.path.join(HERE, n)))
spec = importlib.util.spec_from_file_location('registry_data', os.path.join(HERE, 'registry_data.py')); RD = importlib.util.module_from_spec(spec); spec.loader.exec_module(RD)
sys_path_hack = __import__('sys').path.insert(0, HERE)
try:
    from wide_data import W
except ImportError: W = {}
STD = {
 'NEAR': 'Close or middle view of {what}. No ridge line, building or road that the model contains is in the frame, and the rocks, trees, bodies and fences it shows are not in the model (modern bare-ground DEM): a render cannot be compared. No pose is registered.',
 'POS': '{what}. The sources fix the camera only to a named place or a direction, not to within the depth of the scene, so a pose would be a free guess and none is registered; a render without a camera position cannot be judged.',
 'OUT': '{what}. Not a July 1863 battlefield terrain view: outside the terrain test, listed so that nothing is dropped.',
 'STG': 'Staged-photograph flag respected ({basis}). {what}. Used for terrain and rocks only, never for the position of a body or prop; the rocks are not in the model and no camera position is sourced, so no pose is registered.',
}
def main():
    cat = J('catalogue.json')['photographs']; add = J('catalogue_additions.json')['photographs']; wide = J('catalogue_wide_items.json')['photographs'] if os.path.exists(os.path.join(HERE, 'catalogue_wide_items.json')) else []; st = J('position_statements.json')['statements']; ident = J('nps_then_to_loc.json')['queries']
    poses = J('poses.json')['poses']; ver = J('verdicts.json'); led = J('images_ledger.json')['images']; wled = J('wide_images_ledger.json')['images'] if os.path.exists(os.path.join(HERE, 'wide_images_ledger.json')) else {}
    pv = {v['pose']: v for v in ver['pose_verdicts']}; by_loc = {}
    sup = {}
    for p in poses:
        if p.get('loc_id') and p.get('superseded_by'): sup.setdefault(p['loc_id'], []).append(p['id'])
        else:
            if p.get('loc_id'): by_loc.setdefault(p['loc_id'], []).append(p['id'])
            for al in p.get('also_loc_ids') or []: by_loc.setdefault(al, []).append(p['id'])   # other prints of the same exposure (second copies, stereo siblings, the two plates of a panorama) carry the pose of the record it was set for
    rev = {}   # the reverse of the copy ties of the wide search: a first-catalogue record learns which wide records are the same exposure
    for w_ in wide:
        for o in w_.get('same_exposure_as') or []: rev.setdefault(o, set()).add(w_['loc_id'])
    stm = {}
    for s in st:
        for l in (s.get('loc') or []) + (s.get('cand') or []): stm.setdefault(l, []).append(s['id'])
    idn = {}
    for q, v in ident.items():
        for a in v.get('accepted', []): idn.setdefault(a.get('loc_id'), []).append({'nps_then_now': q, 'resource': a['resource'], 'inliers': a['inliers']})
    imgs = {}
    for k, v in led.items():
        if v.get('status') == 'ok' and v.get('loc_id'): imgs.setdefault(v['loc_id'], []).append(k)
    for pk, v in wled.items():
        if v.get('status') == 'ok': imgs.setdefault(pk, []).append('WIDE|' + pk)
    out = []
    for c in cat + add + wide:
        pk = c['loc_id']; code, what = RD.R[pk] if pk in RD.R else (W[pk]['code'], W[pk]['what']); poseids = by_loc.get(pk, [])
        staged = bool(c.get('staged_flag')) or code == 'STG'
        basis = (("NPS Then-And-Now, Devil's Den no. 8: the NPS calls this photograph staged and more than four months after the battle; " + RD.SCOPE_OUT[pk]) if pk in RD.SCOPE_OUT else None) or c.get('staged_basis') or ("same negative as a staged record (LC-B815-251) and NPS: 'nor is it likely that the soldier fell in this location'; PDF plan: the Devil's Den sharpshooter photograph is staged" if code == 'STG' else None)
        e = {'loc_id': pk, 'title': c['title'], 'creator': c.get('creator'), 'date_as_catalogued': c.get('date_as_catalogued'), 'loc_url': c.get('loc_url'),
             'catalogue': 'wide search (third pass)' if c in wide else 'added by catalogue_additions.py' if c in add else 'catalogue.json', 'scope_july_1863_terrain': (pk not in RD.SCOPE_OUT) and ((pk in RD.SCOPE_IN) or bool(c.get('in_scope_july_1863_terrain') and code != 'OUT')),
             'scope_note': RD.SCOPE_OUT.get(pk) or RD.SCOPE_IN.get(pk) or (what if code == 'OUT' else None), 'same_exposure_as': sorted(set(c.get('same_exposure_as') or []) | rev.get(pk, set()) | set(getattr(RD, 'SAME_EXPOSURE', {}).get(pk, []))), 'superseded_pose_ids': sup.get(pk, []), 'staged_flag': staged, 'staged_basis': basis if staged else None,
             'image_keys': sorted(imgs.get(pk, [])), 'statement_ids': sorted(set(stm.get(pk, []))), 'nps_then_now_identity': idn.get(pk, []), 'pose_ids': poseids, 'class': code}
        if poseids:
            vs = [pv[i] for i in poseids if i in pv]
            e['verdict'] = vs[0]['verdict'] if len(vs) == 1 else ('; '.join(f"{v['pose']}: {v['verdict']}" for v in vs)); e['why'] = ' | '.join(f"{v['pose']}: {v['why']}" for v in vs); e['reviewed_image'] = all(v.get('reviewed_image') for v in vs) and bool(vs)
            for sp in sup.get(pk, []):   # an earlier pose of the same record that a better-sourced one superseded: its verdict is kept and named, but it is not the headline
                if sp in pv: e['why'] += f" | superseded earlier pose {sp} ({pv[sp]['verdict']}): {pv[sp]['why']}"
        else:
            e['verdict'] = 'cannot judge'; e['reviewed_image'] = True   # the image was looked at (contact sheet) to write the reason
            e['why'] = STD[code].format(what=what[0].upper() + what[1:] if code in ('POS', 'OUT', 'STG') else what, basis=(basis or '')[:260])
            if e['same_exposure_as']: e['why'] += ' Same exposure as (a second print, a stereo sibling or the same plate in another book) catalogued record ' + ', '.join(e['same_exposure_as']) + ' (both images were looked at).'
        out.append(e)
    n = {}
    for e in out: n[e['verdict'].split(':')[-1].strip() if not e['pose_ids'] else e['verdict']] = n.get(e['verdict'].split(':')[-1].strip() if not e['pose_ids'] else e['verdict'], 0) + 1
    json.dump({'_doc': 'One entry per catalogued photograph (109 first-run records + 18 added + the records of the wide search): scope, staged flag with its basis, saved image files, camera-position statements, NPS Then-And-Now identity (image matching), registered poses and the candid verdict. Built by build_registry.py from registry_data.py and verdicts.json; no verdict here is written by a program.',
               'count': len(out), 'photographs': out}, open(os.path.join(HERE, 'photograph_registry.json'), 'w'), indent=1, ensure_ascii=False)
    from collections import Counter
    print(len(out), 'records;', Counter(e['verdict'] if not e['pose_ids'] else 'posed' for e in out))
if __name__ == '__main__': main()
