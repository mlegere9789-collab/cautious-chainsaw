"""Evidence found while reading the 19-21 Nov 1863 newspapers that belongs to no row of the shard (clock times and sounds of the dedication,
the evening of 18 Nov): written for the timeline, audio and world-content workstreams. Same citation builder as the rows."""
import sys, json, os, re
sys.path.insert(0, '/home/user/cautious-chainsaw/tmp/fence-3/scripts')
from cite import NPSW
ROOT = '/home/user/cautious-chainsaw'
OUT = ROOT + '/docs/battle-theatre/GOVERNANCE/horde/fence-3/extra-evidence-nov18-19.jsonl'

ITEMS = [
 ('X-01', 'procession leaves at 10 o\'clock on 19 Nov', 'timeline', 'star_1120_p2', 'o clock the procession comm?nced moving over the route designated toward the',
  'The Evening Star (20 Nov 1863): the procession began moving at 10 o\'clock toward the cemetery over the published route (OCR "lo o clock" for 10 o\'clock).', 'OCR garbles the hour ("lo o clock"); the Tribune dispatch of the same day gives it as 10 o\'clock (X-02).'),
 ('X-02', 'line of march taken up at 10 o\'clock', 'timeline', 'tribune_1120_p1', 'The line of march was taken up at 10 o\'clock, aud the procession marched through the',
  'New-York Daily Tribune (20 Nov 1863), dispatch dated Gettysburg, Thursday, 19 Nov: the line of march was taken up at 10 o\'clock and the procession marched through the principal streets to the cemetery.', ''),
 ('X-03', 'head of the procession at the stand: 11:15 (Tribune) against 11:45 (Evening Star)', 'timeline', 'tribune_1120_p1', 'At a quarter past 11 the head of the procession arived at the main stand',
  'New-York Daily Tribune (20 Nov 1863): at a quarter past 11 the head of the procession arrived at the main stand.', 'Conflicts with the Evening Star (X-04): a quarter before noon. Both stay selectable; no default chosen.'),
 ('X-04', 'head of the procession at the platform a quarter before noon', 'timeline', 'star_1120_p2', 'in the centre of the cemetery a quarter before noon',
  'The Evening Star (20 Nov 1863): the head of the procession reached the platform erected in the centre of the cemetery a quarter before noon (the words "platform erected" are garbled in the OCR).', 'Conflicts with the Tribune (X-03): a quarter past 11.'),
 ('X-05', 'everyone seated after 12 o\'clock', 'timeline', 'star_1120_p2', 'it was not until alter 12 o\'clock that',
  'The Evening Star (20 Nov 1863): it was not until after 12 o\'clock that the President and the others assigned to seats upon the platform were all in their places (OCR "alter" for after).', ''),
 ('X-06', 'flags at half-mast and minute guns on the morning of 19 Nov', 'audio', 'star_1120_p2', 'the mournful booming of minute guns smote upon the ear',
  'The Evening Star (20 Nov 1863): the national ensign was displayed at half-mast from the flag-staff in the square and on public buildings and private houses, and soon "the mournful booming of minute guns smote upon the ear" (the OCR reads "hall-mast").', 'A sound event with a source: minute guns before the procession.'),
 ('X-07', '5th New York Artillery regiment and battery in the procession', 'units', 'star_1120_p2', 'The 5th New York Artillery regiment, from Baltimore, with their fine battery, were next in line',
  'The Evening Star (20 Nov 1863): after the cavalry squadron and Major-General Couch and staff, the 5th New York Artillery regiment, from Baltimore, with their battery, were next in line.', 'The same regiment\'s band serenaded the President and Seward on 18 Nov (rows S-088).'),
 ('X-08', 'funeral dirge by the band opens the ceremony', 'audio', 'star_1120_p2', 'ceremonies were commenced by the per formance of a funeral dirge by the band',
  'The Evening Star (20 Nov 1863): the ceremonies were commenced by the performance of a funeral dirge by the band stationed in front of the platform.', ''),
 ('X-09', 'Birgfeld\'s band plays on the arrival of Everett', 'audio', 'tribune_1121_p2', 'after which Blrgfeid\'s band struck up noble air',
  'New-York Daily Tribune (21 Nov 1863), letter dated 19 Nov: on the arrival of Mr. Everett and party, presented to the President, "Birgfeld\'s band struck up" a noble air (the OCR reads "Blrgfeid\'s"), after which Dr. Stockton prayed and Mr. Everett delivered the oration.', 'The name of the band is read from the OCR "Blrgfeid\'s".'),
 ('X-10', 'review of 1,200 men by Major-General Couch on the afternoon of 18 Nov', 'timeline', 'tribune_1121_p2', 'reviewed the military present, to the rumber of 1,200 men',
  'New-York Daily Tribune (21 Nov 1863), letter dated 18 Nov: in the afternoon Major-General Couch reviewed the military present, 1,200 men, the 5th New York serving as infantry.', ''),
 ('X-11', 'Governor Seymour presents colors to the 5th New York Artillery on 19 Nov', 'timeline', 'tribune_1121_p2', 'Gov. Seymour presented the 5th New York Ar. tillery with a stand of colors this afternoon',
  'New-York Daily Tribune (21 Nov 1863), letter dated 19 Nov: Governor Seymour presented the 5th New York Artillery with a stand of colors "this afternoon".', ''),
]
lines = []
for iid, topic, consumer, tag, quote, claim, note in ITEMS:
    c = NPSW(tag, quote, note=note or None)
    c['source_class'] = 'contemporary newspaper (1863; Library of Congress Chronicling America, OCR text)'
    # independent re-cut of the span
    raw = open(os.path.join(ROOT, c['local_path']), encoding='utf-8', newline='').read()
    span = raw[c['offset_start']:c['offset_end']]
    def norm(s):
        s = re.sub(r'-\s+', '', s).lower()
        s = re.sub(r'[^a-z0-9?]+', ' ', s)
        return re.sub(r'\s+', ' ', s).strip()
    ok = norm(span) == norm(quote)
    lines.append({'id': iid, 'topic': topic, 'for_workstream': consumer, 'tier': 'documented', 'claim': claim, 'citation': c, 'span_recut_matches_quote': ok, 'date': '2026-11-13', 'workstream': 'bt-evidence', 'shard': 'fence-3',
                  'not_in_rows': 'found while reading the newspapers for rows S-082 to S-088; belongs to no row of the shard'})
    print(iid, 'OK' if ok else 'RECUT MISMATCH', c['offset_start'], c['offset_end'])
os.makedirs(os.path.dirname(OUT), exist_ok=True)
open(OUT, 'w', encoding='utf-8').write('\n'.join(json.dumps(d, ensure_ascii=False) for d in lines) + '\n')
print('wrote', OUT, len(lines))
