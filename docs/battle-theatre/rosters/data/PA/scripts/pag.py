"""Pennsylvania at Gettysburg (1914, vol II, IA pennsgettysburg02reynrich): monument inscriptions 'Present at Gettysburg ...'
Hit line (in the cached djvu.txt) -> unit. Mapping made by reading the heading printed above each inscription (OCR-damaged headings noted).
Output: data/PA/strength_present_inscriptions.csv (verbatim inscription lines kept; numbers copied, never adjusted)."""
import sys, os, re, csv
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pa_common as C

SRC = os.path.join(C.ROOT, 'tmp', 'library', 'misc', 'pennsgettysburg02reynrich_djvu.txt')
C.register_existing(SRC, 'https://archive.org/download/pennsgettysburg02reynrich/pennsgettysburg02reynrich_djvu.txt')
L = [re.sub(r'\s+', ' ', l).strip() for l in open(SRC, encoding='utf8', errors='replace')]

MAP = {
    21931: ('U-11PA', "heading OCR 'HTH PENNSYLVANIA INFANTRY'; read as 11th"),
    22029: ('U-27PA', ''), 22074: ('U-28PA', ''),
    22090: ('UNMAPPED', "printed under the 28th Penna. heading but a second inscription (2d Brigade 2d Division 12th Corps); the unit heading is missing in the OCR text; page image needed"),
    22132: ('U-1PA-R', ''), 22188: ('U-2PA-R', "heading OCR '2o PENNSYLVANIA RESERVES (31st Infantry)'"),
    22245: ('U-5PA-R', "heading OCR 'STH PENNSYLVANIA RESERVES (34th Infantry)'"), 22297: ('U-6PA-R', ''),
    22394: ('U-10PA-R', '39th Infantry'), 22545: ('U-12PA-R', ''), 22602: ('U-13PA-R', ''),
    22665: ('X-46PA', 'not in repository OOB'), 22881: ('U-57PA', ''),
    23084: ('U-63PA', "heading OCR '63o'"), 23135: ('U-68PA', "heading OCR '6STH'"), 23178: ('U-72PA', "heading OCR '72o'"),
    23244: ('U-73PA', ''), 23303: ('U-74PA', ''), 23325: ('U-75PA', ''), 23353: ('U-81PA', ''), 23457: ('U-83PA', ''),
    23661: ('U-91PA', 'first of two 91st inscriptions'), 23682: ('U-91PA', 'second of two 91st inscriptions'),
    23829: ('U-99PA', ''), 23949: ('U-105PA', ''), 24063: ('U-106PA', ''), 24158: ('X-107PA', 'not in repository OOB'),
    24208: ('U-110PA', ''), 24307: ('U-115PA', ''), 24353: ('U-118PA', ''), 24415: ('U-121PA', ''),
    24448: ('X-139PA', 'not in repository OOB'), 24520: ('U-140PA', ''), 24584: ('U-141PA', ''), 24639: ('U-142PA', ''),
    24706: ('U-143PA', "heading number lost in OCR ('PENNSYLVANIA INFANTRY', 2d Brigade 3d Division 1st Corps); 143rd read from brigade and the 465 figure that matches the repository OOB: CONFIRM on the page image"),
    24732: ('U-145PA', ''), 24790: ('U-147PA', ''), 24800: ('U-148PA', ''), 24885: ('U-150PA', ''), 24915: ('U-151PA', ''),
    25005: ('U-1PA-CAV', ''),
    25283: ('UNMAPPED', "heading OCR '1STH PENNSYLVANIA CAVALRY': 17th or 18th, page image needed"),
    25370: ('U-ART-B1PA', "heading 'BATTERY B' (organized at Mount Jackson, Lawrence County)"),
    25449: ('U-ART-F1PA', "Ricketts' Battery, consolidated Battery F & G"),
    25533: ('UNMAPPED', "Battery C Penna. Light Artillery (consolidated C & F): no matching unit in the repository OOB"),
    25580: ('U-ART-EPA', 'Battery E'),
    21985: ('U-26PA', "kind=went into action; heading missing in the OCR text; unit read from '1st Brig. 2d Div. 3d Corps' printed below: CONFIRM on the page image"),
    22346: ('U-9PA-R', "kind=arrived on the field July 2d with; heading OCR 'OTII PENNSYLVANIA RESERVES'"),
    22489: ('U-11PA-R', "kind=present; heading OCR 'HTH PENNSYLVANIA RESERVES', read as 11th Reserves (40th Infantry)"),
    22745: ('UNMAPPED', "kind=carried into action 135 officers and men; heading missing in the OCR text"),
    22822: ('U-56PA', 'kind=went into action with'),
    23001: ('U-62PA', 'kind=carried into action'),
    23582: ('U-88PA', 'kind=number engaged'),
    23711: ('U-95PA', 'kind=present for duty June 30 1863 (not the number engaged)'),
    24182: ('U-109PA', 'kind=went into action with'),
    24233: ('UNMAPPED', "kind=carried into action 259; printed after the 110th heading, may belong to the 111th: unit heading needed"),
    24339: ('U-116PA', 'kind=in action July 2 1863'),
    24864: ('U-149PA', 'kind=carried into action'),
    24940: ('U-153PA', 'kind=carried into action'),
    25189: ('U-6PA-CAV', 'kind=number engaged'),
    25535: ('UNMAPPED', 'kind=Battery C Penna. Light Artillery (consolidated C & F), 105 officers and men'),
}
NUMW = {'seventeen': 17, 'twenty-eight': 28}
rows = []
for ln, (uid, note) in sorted(MAP.items()):
    i = ln - 1
    txt = ' / '.join(x for x in L[i:i + 7] if x)
    def parse(blob):
        off = men = tot = None
        m = re.search(r'(\d+)\s*officers?\s*(?:and|&)?\s*(\d+)\s*(?:enlisted\s*)?men', blob, re.I)
        m2 = re.search(r'officers\s*(\d+)\s*(?:and\s*)?(?:enlisted\s*)?men\s*(\d+)', blob, re.I)
        m3 = re.search(r'(\d+)\s*officers and men', blob, re.I)
        m4 = re.search(r'(?:Present at Gettysburg|Present ait Gettysburg|action|engaged|duty at Gettysburg June 30 1863 Officers)\s*(?:with\s*|here with\s*|officers\s*)?(\d{2,4})', blob, re.I)
        mm = re.search(r'Officers (\d+) Enlisted Men (\d+)', blob)
        if mm:
            return int(mm.group(1)), int(mm.group(2)), int(mm.group(1)) + int(mm.group(2))
        if m:
            return int(m.group(1)), int(m.group(2)), int(m.group(1)) + int(m.group(2))
        if m2:
            return int(m2.group(1)), int(m2.group(2)), int(m2.group(1)) + int(m2.group(2))
        if m3:
            return None, None, int(m3.group(1))
        if m4:
            return None, None, int(m4.group(1))
        return None, None, None
    off, men, tot = parse(L[i])
    if tot is None:
        # strength split over the next line ("Present at Gettysburg" / "105 officers and men")
        off, men, tot = parse(L[i] + ' ' + (L[i + 1] if i + 1 < len(L) else ''))
        if tot is not None and re.search(r'Killed|Wounded', L[i + 1], re.I) and not re.search(r'officers and men', L[i + 1], re.I):
            off = men = tot = None
    # book page: nearest preceding 'Pennsylvania at Gettysburg. NNNN' / 'NNNN Pennsylvania at Gettysburg.'
    page = ''
    for j in range(i, max(0, i - 120), -1):
        pm = re.search(r'Pennsylvania at Gettysburg\.?\s*(\d{3,4})|^(\d{3,4})\s*Pennsylvania at Gettysburg', L[j])
        if pm:
            page = pm.group(1) or pm.group(2)
            break
    rows.append(dict(unit_id=uid, source_id='PA-AT-GETTYSBURG-1914-v2', locator_txt_line=ln, book_page_near=page, officers=off, men=men, total=tot,
                     inscription_text=txt[:420], note=note, evidence_label='Documented (monument inscription as printed; OCR text, heading mapping noted)'))
w = csv.DictWriter(open(os.path.join(C.DATA, 'strength_present_inscriptions.csv'), 'w', newline='', encoding='utf-8'), fieldnames=list(rows[0].keys()))
w.writeheader(); w.writerows(rows)
for r in rows: print(r['unit_id'], r['officers'], r['men'], r['total'], r['book_page_near'])
print(len(rows))
