"""The 24 Massachusetts units of work item union-ma: where each one's roster stands in the pinned OCR texts of
Massachusetts Soldiers, Sailors, and Marines in the Civil War (Adjutant General, Norwood, 1931-35), and the printed contents the
section is checked against.

A section is a run of whole leaves of one volume: from the leaf that carries the unit's title and historical sketch (its printed page is the
page the volume's own contents list gives for the unit) up to, not including, the title leaf of the next unit of the volume (or the end
of the printed roster).  parse_ma_ssm.py asserts, for every unit, that the first leaf's printed page equals the contents page and that the
title of the unit stands in the first two lines of that leaf; nothing here is a reading of the roster itself.
"""
SOURCE_ID = 'MA-SSM-1931'
IDENT = {str(v): 'massachusettssol%d1931mass' % v for v in range(1, 9)}

# key, designation (as in data2/units.json), volume, printed page of the title leaf (the volume's contents list; for volume 6 the contents
# leaf has no text layer, so the page is the one the running heads give), printed page of the title leaf of the NEXT unit of the volume
# (None: the roster runs to the last leaf that carries entries), regexp of the unit title (case-insensitive, OCR-tolerant), arm
SECTIONS = [
    dict(key='u-ma-1st-massachusetts-infantry', file='1st-massachusetts-infantry', name='1st Massachusetts Infantry', vol='1', page=1, next_page=69, first_leaf=15,
         title=r'FIRST\s+REGIMENT\s+MASSACHUSETTS', arm='infantry'),
    dict(key='u-ma-2nd-massachusetts-infantry', file='2nd-massachusetts-infantry', name='2nd Massachusetts Infantry', vol='1', page=69, next_page=148,
         title=r'SECOND\s+REGIMENT\s+.?MASSACHUSETTS', arm='infantry'),
    dict(key='u-ma-7th-massachusetts-infantry', file='7th-massachusetts-infantry', name='7th Massachusetts Infantry', vol='1', page=469, next_page=516,
         title=r'SEVENTH\s+REGIMENT', arm='infantry'),
    dict(key='u-ma-9th-massachusetts-infantry', file='9th-massachusetts-infantry', name='9th Massachusetts Infantry', vol='1', page=616, next_page=682,
         title=r'NINTH\s+REGIMENT', arm='infantry'),
    dict(key='u-ma-10th-massachusetts-infantry', file='10th-massachusetts-infantry', name='10th Massachusetts Infantry', vol='1', page=682, next_page=735,
         title=r'TENTH\s+REGIMENT', arm='infantry'),
    dict(key='u-ma-11th-massachusetts-infantry', file='11th-massachusetts-infantry', name='11th Massachusetts Infantry', vol='1', page=735, next_page=None, last_leaf=830,
         title=r'ELEVENTH\s+REGIMENT', arm='infantry'),
    dict(key='u-ma-12th-massachusetts-infantry', file='12th-massachusetts-infantry', name='12th Massachusetts Infantry', vol='2', page=1, next_page=69, first_leaf=11,
         title=r'TWELFTH\s+REGIMENT', arm='infantry'),
    dict(key='u-ma-13th-massachusetts-infantry', file='13th-massachusetts-infantry', name='13th Massachusetts Infantry', vol='2', page=69, next_page=131,
         end_note=r'The\s+14th\s+Regiment\s+Massachusetts\s+Volunteer\s+Infantry\s+is\s+omitted',
         title=r'THIRTEENTH\s+REGIMENT|THIRTEEXTH', arm='infantry'),
    dict(key='u-ma-15th-massachusetts-infantry', file='15th-massachusetts-infantry', name='15th Massachusetts Infantry', vol='2', page=131, next_page=205,
         title=r'FIFTEENTH\s+REGIMENT', arm='infantry'),
    dict(key='u-ma-1st-company-massachusetts-sharpshooters', file='1st-company-massachusetts-sharpshooters',
         name='1st Company Massachusetts Sharpshooters', vol='2', page=205, next_page=214, title=r'FIRST\s+COMPANY\s+MASS', arm='sharpshooters'),
    dict(key='u-ma-16th-massachusetts-infantry', file='16th-massachusetts-infantry', name='16th Massachusetts Infantry', vol='2', page=214, next_page=270,
         title=r'SIXTEENTH\s+REGIMENT', arm='infantry'),
    dict(key='u-ma-18th-massachusetts-infantry', file='18th-massachusetts-infantry', name='18th Massachusetts Infantry', vol='2', page=349, next_page=409,
         title=r'EIGHTEENTH\s+REGIMENT', arm='infantry'),
    dict(key='u-ma-19th-massachusetts-infantry', file='19th-massachusetts-infantry', name='19th Massachusetts Infantry', vol='2', page=409, next_page=492,
         title=r'NINETEENTH\s+REGIMENT', arm='infantry'),
    dict(key='u-ma-20th-massachusetts-infantry', file='20th-massachusetts-infantry', name='20th Massachusetts Infantry', vol='2', page=492, next_page=594,
         title=r'TWENTIETH\s+REGIMENT', arm='infantry'),
    dict(key='u-ma-22nd-massachusetts-infantry', file='22nd-massachusetts-infantry', name='22nd Massachusetts Infantry', vol='2', page=649, next_page=711,
         title=r'TWENTY-SECOND\s+REGIMENT|TTV\^NTY-SECOND', arm='infantry'),
    dict(key='u-ma-28th-massachusetts-infantry', file='28th-massachusetts-infantry', name='28th Massachusetts Infantry', vol='3', page=188, next_page=275,
         title=r'TWENTY-EIGHTH\s+REGIMENT', arm='infantry'),
    dict(key='u-ma-32nd-massachusetts-infantry', file='32nd-massachusetts-infantry', name='32nd Massachusetts Infantry', vol='3', page=448, next_page=536,
         title=r'THIRTY-SECOND\s+REGIMENT', arm='infantry'),
    dict(key='u-ma-33rd-massachusetts-infantry', file='33rd-massachusetts-infantry', name='33rd Massachusetts Infantry', vol='3', page=536, next_page=588,
         title=r'THIRTY-THIRD\s+REGIMENT', arm='infantry'),
    dict(key='u-ma-37th-massachusetts-infantry', file='37th-massachusetts-infantry', name='37th Massachusetts Infantry', vol='3', page=769, next_page=None, last_leaf=834,
         title=r'THIRTY-SEVENTH\s+REGIMENT', arm='infantry'),
    dict(key='u-ma-1st-massachusetts-cavalry', file='1st-massachusetts-cavalry', name='1st Massachusetts Cavalry', vol='6', page=129, next_page=228,
         title=r'FIRST\s+REGIMENT\s+MASSACHUSETTS\s+VOLUNTEER\s+CAVALRY', arm='cavalry'),
    dict(key='u-ma-1st-massachusetts-battery-a', file='1st-massachusetts-battery-a', name='1st Massachusetts Battery (A)', vol='5', page=343, next_page=355,
         title=r'FIRST\s+BATTERY\s+MASSACHUSETTS\s+VOLUNTEER\s+LIGHT', arm='artillery'),
    dict(key='u-ma-3rd-massachusetts-battery-c', file='3rd-massachusetts-battery-c', name='3rd Massachusetts Battery (C)', vol='5', page=371, next_page=383,
         title=r'THIRD\s+BATTERY\s+MASSACHUSETTS\s+VOLUNTEER\s+LIGHT', arm='artillery'),
    dict(key='u-ma-5th-massachusetts-battery-e', file='5th-massachusetts-battery-e', name='5th Massachusetts Battery (E)', vol='5', page=397, next_page=412,
         title=r'FIFTH\s+BATTERY\s+MASSACHUSETTS\s+VOLUNTEER\s+LIGHT', arm='artillery'),
    dict(key='u-ma-9th-massachusetts-battery', file='9th-massachusetts-battery', name='9th Massachusetts Battery', vol='5', page=452, next_page=467,
         title=r'NINTH\s+BATTERY\s+MASSACHUSETTS\s+VOLUNTEER\s+LIGHT', arm='artillery'),
]
# printed contents lists (volume -> {unit label: page}) as the OCR of each volume prints them; used only as a check on the page numbers above
CONTENTS = {
    '1': {'1st Infantry': 1, '2d Infantry': 69, '3d Infantry': 148, '7th Infantry': 469, '9th Infantry': 616, '10th Infantry': 682, '11th Infantry': 735},
    '2': {'12th Infantry': 1, '13th Infantry': 69, '15th Infantry': 131, '1st Company Sharpshooters': 205, '16th Infantry': 214, '17th Infantry': 270,
          '18th Infantry': 349, '19th Infantry': 409, '20th Infantry': 492, '21st Infantry': 594, '22d Infantry': 649, '2d Company Sharpshooters': 711},
    '3': {'28th Infantry': 188, '29th Infantry': 275, '32d Infantry': 448, '33d Infantry': 536, '34th Infantry': 588, '37th Infantry': 769},
}
