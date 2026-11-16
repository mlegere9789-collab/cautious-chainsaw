#!/usr/bin/env python3
"""Fifth photo-match session (2026-11-16): the reading, by a person, of every sentence that loc_reread.py listed as a place or direction cue in a record that no statement covers.
Writes loc_reread_review.json: one entry per such record with what the sentence is (a camera place or direction, now a statement; or only the place of the subject, the date, a later photograph, a portrait) and why it is not a statement.
A record that has a statement id needs no entry; the test checks that every record with a cue has one or the other. Usage: python3 -I tools/bt/photomatch/loc_reread_review.py"""
import json, os
HERE = os.path.dirname(os.path.abspath(__file__))
R = {
 '2018670700': ('subject place', "the title says only what the woods show (musket fire on Culp's Hill); the camera place is not stated"),
 '2018670711': ('subject, not July battlefield', 'a portrait of Brady seated on the steps of the Burns cottage; the sentence says who sits where on the house, not where the camera stood'),
 '2018670717': ('subject place', "the caption says the view is of the breastworks on Round Top, the hill that formed the Federal extreme left: the subject; the Library's negative sleeve caption does not say where the camera stood (the first catalogue run made no statement for the same wording)"),
 '2018671419': ('later photograph', 'a sign of the 1880s in the McPherson Woods: not July 1863'),
 '2025160089': ('subject place', "the summary says dead horses and ruins about the Trostle house: the subject; Gardner's printed title (Sketch Book plate 42) and the letterpress describe the house and the fight, not the place of the camera"),
 '2025160541': ('later photograph', "a monument tablet on Cemetery Ridge photographed later (the sentence names what the tablet commemorates and a view of Culp's Hill beyond): outside the July 1863 terrain test; the record is not digitized"),
 '2013645948': ('subject place', "the title says the barn on the left is where Sickles had his headquarters: a statement about the building, made by the card's publisher; the place of the camera is not stated"),
 '2011649197': ('subject place', 'a man lying among shot-torn trees near Culp\'s Hill (Tipton, made later than July 1863 by the Library\'s own dating): the place of the subject, not of the camera'),
 '2011649196': ('subject place', "the same wording and subject as 2011649197 (a second print of the card): the place of the subject near Culp's Hill, not of the camera"),
 '2011646177': ('subject place', 'a stereo card of the breastworks on Round Top, with the same title as the negative sleeve caption of 2018670717; the subject, not the camera'),
 '2025169709': ('subject place', "the summary says the farmhouse on Cemetery Ridge owned by Lydia Leister: the subject; Gardner's plate 43 letterpress places the house on the road to Taneytown just back of the cemetery and does not say where the camera stood"),
 '2006692513': ('subject place', "the Sketch Book plate 42 summary says slaughtered animals behind a house: the subject; the letterpress was read by machine and by eye and says where the house stands (in front of the left of the position), not where the camera stood"),
 '2011649195': ('later photograph', 'Tipton card of men at a fence looking toward a meadow: the people look, the camera place is not stated; made after the battle'),
 '2006692514': ('subject place', "the Sketch Book plate 43 summary says the house used as headquarters: the subject; the letterpress places the house just back of the cemetery on the road to Taneytown, not the camera"),
 '2026167355': ('not Gettysburg', 'a portrait of a soldier wounded at Spotsylvania: not a battlefield view of July 1863'),
 '2006692500': ('subject place', "the Sketch Book plate 39 summary says the gatehouse at Gettysburg cemetery: the subject; the letterpress calls the knoll shown the knoll of the National Soldiers' Cemetery and gives no camera place (statement PS-GARDNER-SB1-P85)"),
}
def main():
    d = json.load(open(os.path.join(HERE, 'loc_reread_20261116.json'))); need = [r['loc_id'] for r in d['rows'] if r.get('cues') and not r['statement_ids']]
    missing = [k for k in need if k not in R]; extra = [k for k in R if k not in need]
    assert not missing, ('records with a cue and no statement and no reading: ', missing)
    out = {'_doc': __doc__.split('\n')[0], 'reviewed_utc': '2026-11-16', 'records': {k: {'kind': R[k][0], 'reading': R[k][1]} for k in need}, 'readings_for_records_that_now_have_a_statement': extra}
    json.dump(out, open(os.path.join(HERE, 'loc_reread_review.json'), 'w'), indent=1, ensure_ascii=False); print(len(need), 'records read;', len(extra), 'readings kept for records that have a statement now')
if __name__ == '__main__': main()
