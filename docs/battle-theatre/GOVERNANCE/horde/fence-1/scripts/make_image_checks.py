"""Record the three page-image checks of the fence-1 close-out (2026-11-13) in horde/fence-1/image_checks.json.

The crops were cut from scans downloaded from archive.org (public domain) into tmp/fence-1/img (scratch). Each crop was LOOKED AT
(Read tool, image shown) by the engineer; the 'reading' strings below are what that reading showed, letter by letter, and nothing else.
This script copies the crops into horde/fence-1/images/ and writes the sha256 of every crop and of every source file, so that
build_corrections.py / verify_corrections.py can check them. Run: python3 -I make_image_checks.py"""
import os, json, hashlib, shutil
ROOT = '/home/user/cautious-chainsaw'
IMG = os.path.join(ROOT, 'tmp/fence-1/img')
OUT_DIR = os.path.join(ROOT, 'docs/battle-theatre/GOVERNANCE/horde/fence-1')
IMG_OUT = os.path.join(OUT_DIR, 'images')
os.makedirs(IMG_OUT, exist_ok=True)

def sha(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for b in iter(lambda: f.read(1 << 20), b''):
            h.update(b)
    return h.hexdigest()

def put(src_name, dst_name):
    shutil.copyfile(os.path.join(IMG, src_name), os.path.join(IMG_OUT, dst_name))
    return 'docs/battle-theatre/GOVERNANCE/horde/fence-1/images/' + dst_name, sha(os.path.join(IMG_OUT, dst_name))

CHECKS = {}

p, s = put('or27_1_p431_first_lines.png', 'or27-1-p431-first-lines.png')
CHECKS['or27-1-p431'] = dict(
    item='warofrebellion271unit', item_url='https://archive.org/details/warofrebellion271unit',
    item_title='The War of the Rebellion, Series I, vol. 27, part 1 (University of Illinois copy), page-image PDF',
    source_file='tmp/fence-1/img/warofrebellion271unit.pdf', source_file_sha256=sha(os.path.join(IMG, 'warofrebellion271unit.pdf')),
    leaf=449, printed_page='431', printed_head='CHAP. XXXIX.] THE GETTYSBURG CAMPAIGN. 431',
    crop_file=p, crop_sha256=s, crop_note='first three text lines of the printed page, rendered at 300 dpi from leaf 449 of the PDF; the full page (1480 x 2538 px at 300 dpi) was also viewed',
    reading="rails, strengthened with stone, on the morning of July 2, and re-/mained in that position till the enemy advanced upon us, about 4/o'clock in the afternoon. The battery of the First Rhode Island,",
    reading_note="the digit after 'July' is a clear 2 in the printed type; the same page continues 'The battle commenced on the 3d instant at about 4 p. m. We still held the position assigned us the day previous', which also fixes the breastwork to the day before July 3",
    result="settles the OCR split in Davis's report (OR27-1-R105, 69th Pa.): the printed date of the fence-rail-and-stone breastwork is the morning of July 2. The Cornell scan OCR prints 'July 3' (misread digit); the Illinois and rootrich scan OCR print 'July 2'.",
    viewed='2026-11-13', viewed_again='2026-11-14 (the saved crops were looked at a second time by the engineer of the reopened pass; the readings above were confirmed letter by letter, the smeared letters of the Compiler crop included)')

p, s = put('p856_greene_crop.png', 'or27-1-p856-greene-lines.png')
CHECKS['or27-1-p856'] = dict(
    item='warofrebellion271unit', item_url='https://archive.org/details/warofrebellion271unit',
    item_title='The War of the Rebellion, Series I, vol. 27, part 1 (University of Illinois copy), page-image PDF',
    source_file='tmp/fence-1/img/warofrebellion271unit.pdf', source_file_sha256=sha(os.path.join(IMG, 'warofrebellion271unit.pdf')),
    leaf=874, printed_page='856', printed_head='856 N. C., VA., W. VA., MD., PA., ETC. [CHAP. XXXIX.',
    crop_file=p, crop_sha256=s, crop_note='lines 8-13 of the printed page (1480 x 275 px crop of the 300 dpi render of leaf 874); the full page was also viewed',
    reading="On the right of this brigade was the First (Williams') Division, his right resting on an impassable mill-pond on Rock Creek. As soon as we were in position, we began to intrench ourselves and throw up breastworks of the covering height, of logs, cord-wood, stones, and earth. The same was done by the troops on my right. By 12 o'clock we had a good cover for the men.",
    reading_note="the hour is a clear 12 in the printed type",
    result="settles the OCR split in Greene's report (OR27-1-R307): the printed hour is 'By 12 o'clock'; the Cornell scan OCR prints 13, the rootrich scan OCR prints 12.",
    viewed='2026-11-13', viewed_again='2026-11-14 (the saved crops were looked at a second time by the engineer of the reopened pass; the readings above were confirmed letter by letter, the smeared letters of the Compiler crop included)')

p, s = put('compiler_bridge_crop_x1.5.png', 'gbg-compiler-1863-06-29-bridge-x1.5.png')
p2, s2 = put('compiler_span_left_x5.png', 'gbg-compiler-1863-06-29-span-smear-x5.png')
leaf = os.path.join(IMG, 'compiler_jp2/gettysburg-compiler-1863-06-29_jp2/gettysburg-compiler-1863-06-29_0001.jp2')
CHECKS['gbg-compiler-1863-06-29-bridge'] = dict(
    item='gettysburg-compiler-1863-06-29', item_url='https://archive.org/details/gettysburg-compiler-1863-06-29',
    item_title='Gettysburg Compiler, 29 June 1863 (page-image JP2 set, 4 leaves, 300 ppi)',
    source_file='tmp/fence-1/img/compiler_jp2/gettysburg-compiler-1863-06-29_jp2/gettysburg-compiler-1863-06-29_0001.jp2', source_file_sha256=sha(leaf),
    leaf=1, printed_page=None, printed_head=None,
    crop_file=p, crop_sha256=s, crop_note='enlargement x1.5 of a 670 x 590 px crop of leaf 1 (the passage on the burning of the Rock Creek railroad bridge); a second enlargement (x5) of the left margin of the three last lines is in the second crop file',
    second_crop_file=p2, second_crop_sha256=s2,
    reading="The railroad bridge across Rock creek was soon set on fire by the rebels, and whilst in a blaze a number of cars were ignited and started down the track, but they passed over the bridge and were consumed just beyond. Altogether, we are told that seventeen cars were burnt, one belonging to W. E. Bittle, one to the Hanover Branch, two to Stein & Young, two to the Northern Central, and the balance to the Pennsylvania Central Railroad. The [c]entre span of the bridge was burnt and [fell] in. The other two are standing, but [ba]dly damaged. One of the cars contained government stores for Col. Jennings' regi-",
    reading_note="the first letters of the last three lines are smeared in the scan: 'entre span of the bridge was burnt and' is clear from 'entre'; the word before 'in.' is smeared (an F-like stroke is clear, so 'fell' is the reading but is not spelled out by the print); 'dly damaged' is clear and the 'ba' before it is smeared. Square brackets mark the smeared letters.",
    result="resolves the OCR garble of the Rock Creek bridge passage: the railroad bridge was set on fire by the rebels, the centre span burnt (and, by the smeared word, fell in), the other two spans standing but badly damaged, seventeen cars burnt; no hour or date is printed in the passage itself.",
    viewed='2026-11-13', viewed_again='2026-11-14 (the saved crops were looked at a second time by the engineer of the reopened pass; the readings above were confirmed letter by letter, the smeared letters of the Compiler crop included)')


# ---------------------------------------------------------------- wave 5 (2026-11-15): four more page-image checks (crops made by make_wave5_crops.py)
IMG5 = os.path.join(ROOT, 'tmp/fence-1/run5/img')
DL = os.path.join(ROOT, 'tmp/fence-1/dl')
def put5(src_name, dst_name):
    shutil.copyfile(os.path.join(IMG5, src_name), os.path.join(IMG_OUT, dst_name))
    return 'docs/battle-theatre/GOVERNANCE/horde/fence-1/images/' + dst_name, sha(os.path.join(IMG_OUT, dst_name))

p, s = put5('adams-sentinel-1863-07-21-seminary-x1.5.png', 'adams-sentinel-1863-07-21-seminary-x1.5.png')
CHECKS['adams-sentinel-1863-07-21-seminary'] = dict(
    item='adams-sentinel-1863-07-21', item_url='https://archive.org/details/adams-sentinel-1863-07-21',
    item_title='The Adams Sentinel (Gettysburg), 21 July 1863, page-image PDF (4 leaves, 200 ppi, CCITT; md5 equals the archive.org record)',
    source_file='tmp/fence-1/dl/adams-sentinel-1863-07-21/adams-sentinel-1863-07-21.pdf', source_file_sha256=sha(os.path.join(DL, 'adams-sentinel-1863-07-21/adams-sentinel-1863-07-21.pdf')),
    leaf=2, printed_page=None, printed_head=None,
    crop_file=p, crop_sha256=s, crop_note='enlargement x1.5 of a 1150 x 790 px crop of page 2 (the middle column, about the Theological Seminary and the Professors\' houses); the whole page was rendered and the column read line by line',
    reading="...planted in the vicinity of these edifices, which were occupied by the enemy during the several days of conflict, and constantly exposed to the fire, as the place was several times taken and retaken by both armies. The Theological Seminary was struck by a number of shells and balls, and several serious fractures caused, which will probably require part of one gable end to be taken down. The house occupied by Dr. Schmucker, was perforated by thirteen shells and cannon balls, several large fissures were made in the walls, window frames were shattered, and nearly all the glass destroyed. The houses of the other Professors in the vicinity, were also all more or less injured, and the fences and some out-houses on 20 acres of Seminary land, almost wholly destroyed. The Seminary and College are, and for a month to come, probably will, be occupied as hospitals for the sick and wounded of both armies, and will require not only many repairs, but also much purification and painting, before they can again be occupied for their appropriate purposes.",
    reading_note="every line was legible in the scan; a few letters are worn ('were' and 'occupied' in the first lines, the r of 'fractures'); the sentence about the glass belongs to the house of Dr. Schmucker (a Professor's house), not to the Seminary building",
    result="resolves the OCR garble of the Adams Sentinel passage (the flat OCR text interleaves the neighbouring columns): the Seminary building was struck by shells and balls and several serious fractures were caused (part of one gable end to be taken down); the glass loss, thirteen shells and cannon balls and large fissures belong to Dr. Schmucker's house; the fences and some out-houses on 20 acres of Seminary land were almost wholly destroyed; the Seminary and the College were, and for a month to come probably would be, hospitals for the sick and wounded of both armies.",
    viewed='2026-11-15')

p, s = put5('ny-gb-1900-v2-p732-95th-inscription-x1.4.png', 'ny-gb-1900-v2-p732-95th-inscription-x1.4.png')
p2, s2 = put5('ny-gb-1900-v2-p732-digits-x5.png', 'ny-gb-1900-v2-p732-digits-x5.png')
CHECKS['ny-gb-1900-v2-p732-95th-inscription'] = dict(
    item='finalreportonba00chatgoog', item_url='https://archive.org/details/finalreportonba00chatgoog',
    item_title='Final report on the battlefield of Gettysburg (New York Monuments Commission, Albany 1900), page-image PDF (1065 leaves, 600 ppi JBIG2; md5 equals the archive.org record)',
    source_file='tmp/fence-1/dl/finalreportonba00chatgoog/finalreportonba00chatgoog.pdf', source_file_sha256=sha(os.path.join(DL, 'finalreportonba00chatgoog/finalreportonba00chatgoog.pdf')),
    leaf=297, printed_page='732', printed_head='732 NEW YORK AT GETTYSBURG (the number and the head are smeared in the scan; the OCR heads of the leaves 293 and 295 of the item read 728 and 730, so this leaf is 732)',
    crop_file=p, crop_sha256=s, crop_note='enlargement x1.4 of the inscription (right side and the start of the left side) from the 300 dpi render of PDF page 297; the whole page was also viewed at one third size',
    second_crop_file=p2, second_crop_sha256=s2,
    reading="(Right Side.) July 1, 1863. This regiment was formed south of the McPherson House and engaged the enemy at 10 A. M. At 10:30 A. M. changed front, advanced to this position with the 84th New York and 6th Wisconsin, repulsed and captured a large part of Davis' Mississippi Brigade in the Railroad cut. (Left Side.) At noon, July 1, held position on Oak Hill indicated by marker; being outflanked moved to the right of the Seminary, supporting Battery B, 4th U. S. Retired from that position to Culp's Hill where it remained during July 2 and 3. Casualties. Killed 7 Wounded 62 Missing 46. Mustered in Oct. 15, 1861. Participated in eighteen engagements. Mustered out July 16, 1865.",
    reading_note="THE HOUR IS 10:30, NOT 10:50: the digit after the colon has the same shape as the last digit of the year '1863' on the line above (a 3 with a descending tail; the second crop puts the two side by side). The OCR text of the item prints 'At 10:50 a. M.'. The heading line '95th New York Infantry, 2nd Brigade, 1st Division, 1st Corps' is smeared in the scan: '9' and 'TH' are visible, the middle digit is not; the inscription is taken to be the 95th New York's from the regiment, brigade and division named, the order of the chapters of the volume and 'mustered in Oct. 15, 1861 ... mustered out July 16, 1865'.",
    result="corrects the OCR digit in the 95th NY monument inscription (S-007): the printed hour of the change of front and the advance to the railroad cut is 10:30 a.m., not 10:50 a.m.; the earlier pass of 2026-11-14 had taken the OCR digit as legible.",
    viewed='2026-11-15')

for pg, pdfpage in (('14', 16), ('15', 17), ('24', 26)):
    p, s = put5('ussc-1863-p%s.png' % pg, 'ussc-1863-p%s.png' % pg)
    CHECKS['ussc-1863-p' + pg] = dict(
        item='reportonoperatio00doug', item_url='https://archive.org/details/reportonoperatio00doug',
        item_title='Report on the operations of the Sanitary Commission during and after the battles at Gettysburg, July 1st, 2d and 3d, 1863 (New York, Wm. C. Bryant & Co., 1863), page-image PDF (md5 equals the archive.org record)',
        source_file='tmp/fence-1/dl/reportonoperatio00doug/reportonoperatio00doug.pdf', source_file_sha256=sha(os.path.join(DL, 'reportonoperatio00doug/reportonoperatio00doug.pdf')),
        leaf=pdfpage, printed_page=pg, printed_head=pg + ' (page number at the top of the page)',
        crop_file=p, crop_sha256=s, crop_note='the whole printed page rendered at 110 dpi from PDF page %d; the printed number at the top reads %s' % (pdfpage, pg),
        reading={'14': "...the eleventh corps formed a line between the college and the town, making the fences their line of defence. The rebel forces advanced over this hill in mass about four P. M., formed in line of battle, when they marched [p. 15:] firmly towards the eleventh corps, which retired into the town without making any formidable resistance, and the rebel troops took possession of Gettysburg, when the fighting of the first day ceased. (the account of Major Bush, who accompanied Mr. Hoag, 'in the following words')",
                 '15': "(Most of the wounded of this day's fight, were carried into the churches and public buildings of the town, under the organization of the first and cavalry corps, and were prisoners at the close of the day.) (the account of Major Bush, Wednesday July 1, continued from p. 14)",
                 '24': "The Eleventh Corps Hospital occupied the house and farm of Geo. Spangler. The divisions were consolidated under the charge of Dr. Armstrong. It contained 1,900 wounded, of whom 100 were said to be confederates. ... The Cavalry Corps Hospital was in town, and occupied the Presbyterian Church on Baltimore street, and the two school-houses in the immediate vicinity. It was under the charge of Dr. Rulison, and the three buildings contained 300 of our wounded. (a footnote of the report on the corps hospitals; its text is the report's, not Major Bush's)"}[pg],
        reading_note='the printed page number was read from the image; the OCR text of the item has no page marks for these pages',
        result={'14': "fixes the printed page (14) of the statement that the Eleventh Corps made the fences their line of defence between the college and the town on the afternoon of Jul 1", '15': "fixes the printed page (15) of the statement that most of the wounded of Jul 1 were carried into the churches and public buildings of the town under the organization of the First and Cavalry Corps", '24': "fixes the printed page (24) of the statements that the Eleventh Corps hospital occupied the house and farm of Geo. Spangler and that the Cavalry Corps hospital occupied the Presbyterian Church on Baltimore street"}[pg],
        viewed='2026-11-15')

with open(os.path.join(OUT_DIR, 'image_checks.json'), 'w', encoding='utf-8') as f:
    json.dump(dict(_doc="Page-image checks of the fence-1 close-out (2026-11-13, 2026-11-14 and wave 5 of 2026-11-15). Crops are in images/; every crop and source file has its sha256. Run scripts/make_image_checks.py to rebuild.",
                   checks=CHECKS), f, indent=1, ensure_ascii=False)
print('wrote', len(CHECKS), 'checks')
