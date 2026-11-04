"""Unit table for Moore 1882: OOB regiment_id -> volume, header line (0-based line index in the IA djvu.txt), the next header line ends the block."""
# every regiment/battalion header per volume (in-scope and out-of-scope) so that block ends are exact.
# (key, line) ; key is the Moore designation.
HEADERS = {
 'v1': [('1st Regiment', 656), ('2nd Regiment', 4517), ('3rd Regiment', 8387), ('4th Regiment', 11662), ('5th Regiment', 14693), ('6th Regiment', 17969),
        ('7th Regiment', 21566), ('8th Regiment', 24581), ('9th Regiment Cavalry (1st Cavalry)', 27352), ('10th Regiment Artillery (1st Artillery)', 30687),
        ('11th Regiment', 33326), ('Bethel Regiment (1st Volunteers)', 36119), ('12th Regiment', 37935), ('13th Regiment', 40880), ('14th Regiment', 44229),
        ('15th Regiment', 47346)],
 'v2': [('16th Regiment', 155), ('17th Regiment', 3447), ('18th Regiment', 6453), ('19th Regiment Cavalry (2nd Cavalry)', 9936), ('20th Regiment', 12388),
        ('21st Regiment', 15090), ('22nd Regiment', 18048), ('23rd Regiment', 21831), ('24th Regiment', 25070), ('25th Regiment', 28039), ('26th Regiment', 31421),
        ('27th Regiment', 35563), ('28th Regiment', 37501), ('29th Regiment', 41321), ('30th Regiment', 43804), ('31st Regiment', 47178), ('32nd Regiment', 49772),
        ('33rd Regiment', 52529), ('34th Regiment', 56108), ('35th Regiment', 59066), ('36th Regiment Artillery (2nd Artillery)', 62170)],
 'v3': [('37th Regiment', 165), ('38th Regiment', 4290), ('39th Regiment', 7327), ('40th Regiment Artillery (3rd Artillery)', 9882), ('41st Regiment Cavalry (3rd Cavalry)', 13026),
        ('42nd Regiment', 14987), ('43rd Regiment', 17098), ('44th Regiment', 19808), ('45th Regiment', 22639), ('46th Regiment', 25635), ('47th Regiment', 28542),
        ('48th Regiment', 31191), ('49th Regiment', 34680), ('50th Regiment', 37296), ('51st Regiment', 38788), ('52nd Regiment', 40779), ('53rd Regiment', 43588),
        ('54th Regiment', 46236), ('55th Regiment', 47578), ('56th Regiment', 50132), ('57th Regiment', 52709), ('58th Regiment', 54967), ('59th Regiment', 56711),
        ('60th Regiment', 58459), ('61st Regiment', 59463), ('62nd Regiment', 62019)],
 'v4': [('63rd Regiment Cavalry', 1393), ('64th Regiment', 3959), ('65th Regiment Cavalry', 6375), ('66th Regiment', 8550), ('67th Regiment', 10841), ('68th Regiment', 11852),
        ('69th Regiment', 12074), ('1st Battalion Sharp Shooters', 14322), ('1st Battalion Artillery', 14848), ('Thomas Legion Cavalry Battalion', 15970),
        ('2nd Battalion Infantry', 17773), ('3rd Battalion Light Artillery', 18848)],
}
# OOB id -> (volume, Moore key, designation)
SCOPE = {
 'C-1NC': ('v1', '1st Regiment'), 'C-2NC': ('v1', '2nd Regiment'), 'C-3NC': ('v1', '3rd Regiment'), 'C-4NC': ('v1', '4th Regiment'), 'C-5NC': ('v1', '5th Regiment'),
 'C-6NC': ('v1', '6th Regiment'), 'C-7NC': ('v1', '7th Regiment'), 'C-11NC': ('v1', '11th Regiment'), 'C-12NC': ('v1', '12th Regiment'), 'C-13NC': ('v1', '13th Regiment'),
 'C-14NC': ('v1', '14th Regiment'), 'C-16NC': ('v2', '16th Regiment'), 'C-18NC': ('v2', '18th Regiment'), 'C-20NC': ('v2', '20th Regiment'), 'C-21NC': ('v2', '21st Regiment'),
 'C-22NC': ('v2', '22nd Regiment'), 'C-23NC': ('v2', '23rd Regiment'), 'C-26NC': ('v2', '26th Regiment'), 'C-28NC': ('v2', '28th Regiment'), 'C-30NC': ('v2', '30th Regiment'),
 'C-32NC': ('v2', '32nd Regiment'), 'C-33NC': ('v2', '33rd Regiment'), 'C-34NC': ('v2', '34th Regiment'), 'C-37NC': ('v3', '37th Regiment'), 'C-38NC-S': ('v3', '38th Regiment'),
 'C-43NC': ('v3', '43rd Regiment'), 'C-45NC': ('v3', '45th Regiment'), 'C-47NC': ('v3', '47th Regiment'), 'C-52NC': ('v3', '52nd Regiment'), 'C-53NC': ('v3', '53rd Regiment'),
 'C-55NC': ('v3', '55th Regiment'), 'C-57NC': ('v3', '57th Regiment'), 'C-2NC-B': ('v4', '2nd Battalion Infantry'),
 'C-ART-Manly': ('v1', '10th Regiment Artillery (1st Artillery)'), 'C-ART-Reilly': ('v1', '10th Regiment Artillery (1st Artillery)'),
}
VOLFILE = {'v1': 'moore_v1.rosternorthcaro00moorgoog_djvu.txt', 'v2': 'moore_v2.rosterofnorthcar02nort_djvu.txt', 'v3': 'moore_v3.rosterofnorthcar03moor_djvu.txt', 'v4': 'moore_v4.rosterofnorthcar04moor_djvu.txt'}
VOLIA = {'v1': 'rosternorthcaro00moorgoog', 'v2': 'rosterofnorthcar02nort', 'v3': 'rosterofnorthcar03moor', 'v4': 'rosterofnorthcar04moor'}
VOLID = {'v1': 'NC-MOORE-1882-v1', 'v2': 'NC-MOORE-1882-v2', 'v3': 'NC-MOORE-1882-v3', 'v4': 'NC-MOORE-1882-v4'}


def block(vol, key):
    hs = HEADERS[vol]
    for i, (k, ln) in enumerate(hs):
        if k == key:
            end = hs[i + 1][1] if i + 1 < len(hs) else None
            return ln, end
    raise KeyError(key)


# ---------------- second scan: Emory University copy of the same 1882 edition (IA 05913252.33xx.emory.edu) ----------------
import re as _re, os as _os
EMORY_FILE = {'v1': 'emory_v1.05913252_3309_djvu.txt', 'v2': 'emory_v2.05913252_3310_djvu.txt', 'v3': 'emory_v3.05913252_3311_djvu.txt', 'v4': 'emory_v4.05913252_3312_djvu.txt'}
EMORY_IA = {'v1': '05913252.3309.emory.edu', 'v2': '05913252.3310.emory.edu', 'v3': '05913252.3311.emory.edu', 'v4': '05913252.3312.emory.edu'}
_ORD = {'FIRST': 1, 'SECOND': 2, 'THIRD': 3, 'FOURTH': 4, 'FIFTH': 5, 'SIXTH': 6, 'SEVENTH': 7, 'EIGHTH': 8, 'NINTH': 9, 'TENTH': 10, 'ELEVENTH': 11, 'TWELFTH': 12,
        'THIRTEENTH': 13, 'FOURTEENTH': 14, 'FIFTEENTH': 15, 'SIXTEENTH': 16, 'EIGHTEENTH': 18, 'TWENTIETH': 20, 'THIRTIETH': 30, 'FORTIETH': 40, 'FIFTIETH': 50, 'SIXTIETH': 60}
_UNITS = {'FIRST': 1, 'SECOND': 2, 'THIRD': 3, 'FOURTH': 4, 'FIFTH': 5, 'SIXTH': 6, 'SEVENTH': 7, 'EIGHTH': 8, 'NINTH': 9}
_TENS = {'TWENTY': 20, 'THIRTY': 30, 'FORTY': 40, 'FIFTY': 50, 'SIXTY': 60, 'SEVENTY': 70}


def _ordnum(w):
    w = w.upper().strip(' -')
    if w in _ORD:
        return _ORD[w]
    m = _re.match(r'^(TWENTY|THIRTY|FORTY|FIFTY|SIXTY|SEVENTY)[\- ]?(FIRST|SECOND|THIRD|FOURTH|FIFTH|SIXTH|SEVENTH|EIGHTH|NINTH|[A-Z]{3,10})$', w)
    if m:
        return _TENS[m.group(1)] + _UNITS.get(m.group(2), 0)
    return None


def _suffix(n):
    return 'th' if 10 <= n % 100 <= 20 else {1: 'st', 2: 'nd', 3: 'rd'}.get(n % 10, 'th')


def emory_headers(vol, lines):
    out = []
    for i, l in enumerate(lines):
        s = l.strip()
        m = _re.match(r'^([A-Z][A-Z\-\s]{3,22}?)\s+(REGIMENT|BATTALION)\b', s)
        if m and not _re.search(r'[a-z]', s) and len(s) < 70:
            n = _ordnum(m.group(1))
            if n:
                kind = m.group(2).title()
                tail = s.upper()
                if kind == 'Battalion':
                    key = f'{n}{_suffix(n)} Battalion' + (' Infantry' if 'INFANTRY' in tail else '')
                else:
                    key = f'{n}{_suffix(n)} Regiment'
                out.append((key, i, tail))
    return out


EMORY_PATCH = {'v1': [('1st Volunteers Bethel', 36634)], 'v2': [('17th Regiment', 3433), ('19th Regiment', 9894)], 'v3': [('39th Regiment', 7176)], 'v4': [('3rd Battalion', 18895)]}


def emory_block(vol, key, lines):
    hs = emory_headers(vol, lines) + [(k, ln, '') for k, ln in EMORY_PATCH.get(vol, [])]
    hs.sort(key=lambda x: x[1])
    mm = _re.match(r'^(\d+\w\w) (Regiment|Battalion)', key)
    target = f'{mm.group(1)} {mm.group(2)}'
    for i, (k, ln, tail) in enumerate(hs):
        if k == target or k.startswith(target + ' '):
            return ln, (hs[i + 1][1] if i + 1 < len(hs) else None)
    raise KeyError(key)
