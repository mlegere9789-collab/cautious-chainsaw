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
    viewed='2026-11-13')

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
    viewed='2026-11-13')

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
    viewed='2026-11-13')

with open(os.path.join(OUT_DIR, 'image_checks.json'), 'w', encoding='utf-8') as f:
    json.dump(dict(_doc="Page-image checks of the fence-1 close-out. Crops are in images/; every crop and source file has its sha256. Run scripts/make_image_checks.py to rebuild.",
                   checks=CHECKS), f, indent=1, ensure_ascii=False)
print('wrote', len(CHECKS), 'checks')
