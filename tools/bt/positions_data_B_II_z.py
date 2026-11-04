"""Scope B, II Corps: units that have no own report in the index (148th PA, 126th NY, 1st Co. Mass. Sharpshooters), located through neighbours' reports."""
from positions_claims import claim, gap

ITEMS = [
    claim('us-2c-1d-cross-148pa', 'engagement', 'OR27-1-R078', r'The Fifth and One hundred and forty-eighth remained in position', 'The 148th PA (commanded by Colonel McKeen at the start of the action) and the 5th NH remained in position, holding the enemy in check until their cartridges were expended and a brigade of Barnes\' division (Fifth Corps) relieved them; the 148th was at the left of the brigade line, partly in the wheat-field and partly in thick woods',
          when_printed='At this time I was informed that Colonel Cross', date='1863-07-02', approx=True, place_printed='the wheat-field', gz='GZ-013', win=1500,
          note='The 148th PA has no own report in vol. 27 part 1 (the index lists Nos. 77-97 for the First Division without a 148th PA author). Positions come from McKeen R078 and Broady R080.'),
    claim('us-2c-1d-cross-148pa', 'position', 'OR27-1-R080', r'the One hundred and forty -eighth Pennsylvania Volunteers in the rear', 'Forenoon of July 2: the brigade in close column by battalion near and to the left of Cemetery Hill, the 5th NH in front, the 61st NY second, the 148th PA in the rear',
          when_printed='In the forenoon of the 2d instant', date='1863-07-02', approx=True, place_printed='near and to the left of Cemetery Hill', gz='GZ-003', win=1000),
    gap('us-2c-1d-cross-148pa', 'position', ['or27_find "One hundred and forty.eighth Pennsylvania" Part 1 for an own report', 'index record authors R077-R097 (no 148th PA author)', 'or27_find "148th Pennsylvania|148th Penn" Part 1 and Part 3'],
        'No report by the 148th Pennsylvania (Lt. Col. McFarlane commanded after McKeen) is in the index; the regiment is placed only by McKeen R078 and Broady R080.',
        reports=['OR27-1-R078', 'OR27-1-R080', 'OR27-1-R079'], activity='No own report for the 148th PA'),
    claim('us-2c-3d-willard-126ny', 'position', 'OR27-1-R130', r'lay in rear of the One hundred and twenty-sixth and One hundred and twenty-fifth', 'Morning of July 2 the 126th NY (Colonel Sherrill) lay with the 125th NY in front of the 111th NY on the heights south of Gettysburg, until about 5 p. m.',
          when_printed='on the morning of July 2', date='1863-07-02', approx=True, place_printed='the heights south of Gettysburg',
          note='The 126th NY has no own regimental report in the index; its colonel Sherrill commanded the brigade after Willard fell (Bull R128 names the regimental commanders at the 4 p. m. charge).'),
    claim('us-2c-3d-willard-126ny', 'engagement', 'OR27-1-R128', r'Colonel Sherrill, One hundred and\s+twenty-sixth New York Volunteers', 'At the Third Brigade\'s charge on the rebel batteries (about 4 p. m. per Bull) the 126th NY was commanded by Colonel Sherrill, who succeeded to brigade command when Willard was killed',
          when_printed='At about 4 p. m.', date='1863-07-02', approx=True, place_printed='the hill in front of the position occupied by the brigade', win=1500),
    gap('us-2c-2d-1comass', 'position', ['or27_find "Massachusetts Sharpshooters" Part 1 (hits only in the organization table R009 and the index of names)', 'or27_find "Plumer|Bicknell" Part 1/2/3', 'reading of the Second Division reports R098-R114 for a named sharpshooter company'],
        'The 1st Company Massachusetts Sharpshooters (Capt. William Plumer, Lieut. Emerson L. Bicknell) appears only in the organization table (R009, "Unattached" under the Second Division) and in the printed name index; no report, order or dispatch places it on a day or in a place.',
        reports=['OR27-1-R009', 'OR27-1-R098', 'OR27-1-R099', 'OR27-3'], activity='No position or movement of the 1st Company Massachusetts Sharpshooters found'),
]
