#!/usr/bin/env python3
"""Fifth photo-match session (2026-11-16): add what the session found to verdicts.json without changing a verdict.
(1) P27 and P28 (one exposure, plate 35 of Gardner's Sketch Book): a paragraph about Gardner's own letterpress (statement PS-GARDNER-SB1-P77). It is a second source for the place (Cemetery Ridge) and a qualitative cue for the
    direction (Seminary Ridge on the left of the picture). The cue was found after the renders had been looked at, so it is not a pass criterion: it is reported next to the measured positions of the ridge and the Seminary in the frame
    (computed here from the gazetteer and the Seminary footprint with the same bearing formula as run.mjs, not read from the photograph) and changes no verdict.
(2) the gate block: the statement count is read from position_statements.json, the new sources are named, the date of the review is added, and what the session did and did not find is stated.
Idempotent: every text carries the marker 'Fifth pass (2026-11-16)' and is not added twice.
Usage: python3 -I tools/bt/photomatch/add_verdicts_fifth_pass.py"""
import json, math, os, re
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..')); BT = os.path.join(ROOT, 'docs', 'battle-theatre')
MARK = 'Fifth pass (2026-11-16)'
def J(n): return json.load(open(os.path.join(HERE, n)))
def bearings():
    gz = {p['id']: p for p in json.load(open(os.path.join(BT, 'app/data/gazetteer.json')))['places']}; S3 = json.load(open(os.path.join(BT, 'app/data/structures3d.json'))); bld = {b['id']: b for b in S3['buildings'] + S3['points']}
    def centre(b):
        r = b['ring'][:-1]; return sum(p[0] for p in r) / len(r), sum(p[1] for p in r) / len(r)
    glng, glat = centre(bld['STR-TOWN-GATEHOUSE'])
    def bd(lng, lat):
        dx = (lng - glng) * math.cos(math.radians(glat)) * 111320; dy = (lat - glat) * 110574; return (math.degrees(math.atan2(dx, dy)) + 360) % 360
    out = {'GZ-073': bd(gz['GZ-073']['center']['lng'], gz['GZ-073']['center']['lat']), 'GZ-022': bd(gz['GZ-022']['center']['lng'], gz['GZ-022']['center']['lat'])}
    out['SCHMUCKER'] = bd(*centre(bld['STR-TOWN-SCHMUCKER_HALL'])); out['COURTHOUSE'] = bd(*centre(bld['STR-TOWN-COURTHOUSE'])); return out
def xfrac(b, heading, field=40.0):
    d = ((b - heading + 540) % 360) - 180; return 0.5 + d / field
def main():
    V = J('verdicts.json'); ST = J('position_statements.json'); B = bearings(); EX = J('exploratory_heading.json')
    ex = EX.get('heading_range_deg') or EX.get('heading_deg') or EX
    lo, hi = (337.2, 342.5)
    f = lambda h: {k: round(xfrac(v, h), 2) for k, v in (('ridge', B['GZ-073']), ('seminary', B['SCHMUCKER']), ('oakridge', B['GZ-022']), ('courthouse', B['COURTHOUSE']))}
    x0, x315, xm = f(0), f(315), f((lo + hi) / 2)
    common = (f"{MARK}: Gardner's own letterpress for plate 35 of the Sketch Book (the Library's digitized album, page 77, read from the master scan with text recognition and by eye; statement PS-GARDNER-SB1-P77) says: 'This view is taken from Cemetery Ridge, where our artillery was massed' and "
              f"that Seminary Ridge 'can be seen' 'on the left of the picture'. It is a second source for the place, in the photographer's own words; it is consistent with the National Park Service place (the roof of the Evergreen Cemetery lodge on the cemetery knoll at the Baltimore Pike; Gardner's text for plate 39 calls the knoll of the National Soldiers' Cemetery Cemetery Ridge, but he also uses the name for the ridge toward Round Top) and it does not fix the building; it gives no spot, no bearing, no height and no lens, so the position stays inferred and no count changes. ")
    p27 = common + (f"As a cue for the direction it is not a test (found after the renders were looked at) and changes nothing: at the north heading of this pose and the assumed 40 degree field the left edge of the frame is 340 degrees, so the gazetteer centre of Seminary Ridge ({B['GZ-073']:.1f} degrees from the gatehouse) and the Seminary building ({B['SCHMUCKER']:.1f}) lie outside it "
                    f"(x {x0['ridge']} and {x0['seminary']} of the frame width); at the northwest heading of pose P28 they lie at {x315['ridge']} and {x315['seminary']}. The verdict (roughly) rests on the criterion written before the render and is unchanged.")
    p28 = common + (f"As a cue for the direction it is not a test (found after the renders were looked at) and changes nothing: at this pose's northwest heading and 40 degree field the gazetteer centre of Seminary Ridge ({B['GZ-073']:.1f} degrees from the gatehouse) stands at {x315['ridge']} of the frame width and the Seminary building ({B['SCHMUCKER']:.1f}) at {x315['seminary']}, so the left-of-picture phrase is met "
                    f"at the northwest word and not at the north word of pose P27; but the same heading fails the pike test and puts the court house ({B['COURTHOUSE']:.1f} degrees) outside the frame at x {x315['courthouse']}, while the photograph shows a tower at 0.737 of its width. The two National Park Service words and Gardner's phrase are carried as three readings that no single heading meets "
                    f"at 40 degrees; the free heading read from the tower ({lo} to {hi} degrees, exploratory_heading.json, a fit and not a test) puts Oak Ridge ({B['GZ-022']:.1f}) at x {xm['oakridge']}, the Seminary building at x {xm['seminary']} (outside the left edge) and the court house at x {xm['courthouse']}. None is chosen. The verdict (does not) rests on the criterion written before the render and is unchanged.")
    for pid, txt in (('P27', p27), ('P28', p28)):
        v = [x for x in V['pose_verdicts'] if x['pose'] == pid][0]
        if MARK not in v['why']: v['why'] = v['why'].rstrip() + ' ' + txt
    g = V['gate_q16']; n = ST['count']; g['reviewed'] = '2026-11-16'
    if MARK not in json.dumps(g):
        r0 = g['reason'][0]
        r0n = re.sub(r'the \d+ camera-position statements read \(Library of Congress records, National Park Service reports, place pages and the Record of Treatment\)',
                     f"the {n} camera-position statements read (Library of Congress records, National Park Service reports, place pages and the Record of Treatment, and the photographer's own printed words of 1863 and 1866)", r0)
        assert r0n != r0, 'gate reason 0 not found'; g['reason'][0] = r0n
        g['reason'].append(f"{MARK}: the Library's records were read again from the open JSON (191 of 191 fetched, none changed since the first reading) and every sentence that names a place or direction of view was listed (loc_reread_20261116.json); the letterpress of Gardner's Sketch Book for the ten Gettysburg plates (35 to 44) was read from the master scans with text recognition: one plate (35, the exposure of poses P27 and P28) says where the view was taken (Cemetery Ridge, Seminary Ridge on the left), none gives a coordinate, a lens or a plate. Gardner's catalogue of September 1863 (Library copy) and the Library's essays 'Does the Camera Ever Lie?' were read: titles, numbers and credits, and leads attributed to Frassanito. The count of documented camera positions stays 0 and the gate does not pass.")
        r0 = g['reason'][0]; r0b = r0.replace('never a coordinate, a lens, a plate size or a surveyed station', "never a coordinate, a lens or a surveyed station (the Library's physical description gives the plate type of the stereo negatives, and a plate size of 4 x 10 in. for 16 of them, among them the lodge-roof exposure; no record gives a lens)")
        assert r0b != r0 or 'plate size of 4 x 10 in.' in r0, 'gate reason 0: plate phrase not found'; g['reason'][0] = r0b
        wn = g['what_is_needed']
        for i, t in enumerate(wn):
            if t.startswith('The lens and plate of each exposure (stereo half-plate or large format, focal length)') and 'plate size of 4 x 10 in.' not in t:
                wn[i] = t.replace('The lens and plate of each exposure (stereo half-plate or large format, focal length)', "The lens (focal length) of each exposure; the plate is documented only in part (the Library gives glass stereograph plates and, for 16 negatives, a size of 4 x 10 in.; the large-format views and most stereo negatives have no size)"); k = [i for i, t in enumerate(wn) if t.startswith('For the exposures made from the Evergreen Cemetery gatehouse')]
        if k and 'two-story archway' not in wn[k[0]]:
            wn[k[0]] = wn[k[0]].replace('(the model holds the 2023 outline with its right-hand addition)', "(the model holds the 2023 outline with its right-hand addition; the NPS cemetery report says that the lodge of 1855 is a two-story archway with two floors of lodge quarters in the flanking piers and that a two-story frame addition on the rear was built after the battle, but it gives no height in metres and does not say which part of the outline is the addition)")
        g['fifth_pass'] = {'date': '2026-11-16', 'statements': n, 'new_statements': n - 145, 'new_statements_by_source': 'Sketch Book 3, Gardner catalogue 3, Library records 4, Library essays 3, NPS cemetery report 2', 'sources_read': ['Gardner Sketch Book vol. 1, letterpress pages 77 to 95 (Library of Congress ppmsca.12834, master scans)', "Gardner's catalogue of September 1863 (Library of Congress, 40 scan pages, OCR text)",
                           "Library of Congress essays 'The Case of the Moved Body' and 'The Case of Confused Identity'", 'the 191 Library records again (open JSON)', 'the saved National Park Service texts again with the same rule (325 texts: the 118 of the earlier passes and 207 saved since, 12 pages of the history and photo hubs among them; 359 passages, 19 in the new texts, none about the camera place of a July 1863 photograph)'],
                           'documented_positions_found': 0, 'staged_flags_respected': True, 'renders_reproduced_byte_for_byte': 120}
    V['reviewed'] = V['reviewed'].rstrip() + ' 2026-11-16: all 20 pose sheets (P01 to P29), the lines images of P27, P28 and P29 and the 50 degree lines images of P27 and P28 were opened and looked at again in the fifth session and every verdict was read against its sheet; none changed (the 120 renders were reproduced byte for byte a second time; the sheets rebuilt by compose.py are byte-identical to the earlier ones).' if '2026-11-16' not in V['reviewed'] else V['reviewed']
    json.dump(V, open(os.path.join(HERE, 'verdicts.json'), 'w'), indent=1, ensure_ascii=False); print('verdicts.json updated; statements', n)
if __name__ == '__main__': main()
