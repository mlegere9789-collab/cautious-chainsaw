#!/usr/bin/env python3
"""Evidence lines of the lookup-retry pass of 2026-11-16 (workstream bt-web, task lookup-retries, second pass).

Writes (idempotent: always base + new, never appends twice):
  GOVERNANCE/evidence_corrections/web-lookups.jsonl     = r2/base_E.jsonl (the 2026-11-13 lines, frozen) + the lines built here for sub-requirement ids
  GOVERNANCE/timeline_corrections/web-lookups.jsonl     = r2/base_T.jsonl (frozen) + the lines built here for timeline rows
  retry/r2/evidence2_index.json                          xid -> id, lookup refs, quote check

Every quote is cut from a saved text file and matched again at build time (whitespace-insensitive substring of that file); a quote that does not
match stops the build. quote_mode 'exact' = verbatim substring; 'cleaned' = differs from the verbatim `source_text_excerpt` only by the listed
corrections (OCR repairs), never by a word. For a scanned typescript whose text layer is scrambled, the saved text is the machine reading
(tesseract) of the page image, the page image was looked at, and `image_checked` says so.
Line contract: same as web-nps-landscape.jsonl plus `support`, `lookup_refs` (see build_evidence.py of 2026-11-13).
Run:  python3 -I build_evidence2.py
"""
import json, os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'scripts'))
import rlib
import importlib
sys.path.insert(0, os.path.join(rlib.ROOT, 'tools', 'bt'))
be = importlib.import_module('build_evidence')   # 2026-11-13 builder: only its citation helpers are used (or_cite, book_cite)
be.RETRIEVED = '2026-11-16'

SHARD = 'web-lookups'
RETRIEVED = '2026-11-16'
OUT_E = os.path.join(rlib.GOV, 'evidence_corrections', 'web-lookups.jsonl')
OUT_T = os.path.join(rlib.GOV, 'timeline_corrections', 'web-lookups.jsonl')
BASE_E = os.path.join(HERE, 'base_E.jsonl')
BASE_T = os.path.join(HERE, 'base_T.jsonl')
INDEX = os.path.join(HERE, 'evidence2_index.json')
LINES_E, LINES_T, INDEXD, FAILS = [], [], {}, []
FETCH = {r['fid']: r for r in rlib.read_jsonl(os.path.join(rlib.RETRY, 'fetches.jsonl'))}
_text = {}


def text_of(path):
    p = rlib.abspath(path)
    if p not in _text:
        _text[p] = rlib.file_text(p)
    return _text[p]


def find_in(path, s):
    r = rlib.find_quote(text_of(path), s)
    if not r:
        FAILS.append((path, s))
        return (0, s)
    return r


def web_cite(fid, textname, quote, url, title, page_basis=None, source_class='official web page (National Park Service)', date=None, author='National Park Service',
             excerpt=None, corrections=None, retrieved=RETRIEVED, src_id=None, variant='html text of the page as served'):
    path = 'tmp/library/web/retry/%s/%s' % (fid, textname)
    rec = FETCH.get(fid)
    if rec is None or url not in (rec['asked_url'], rec.get('final_url')):
        FAILS.append((fid, 'url %r differs from the fetch log %r' % (url, rec and rec['asked_url'])))
    off, raw = find_in(path, quote if excerpt is None else excerpt)
    c = {'author': author, 'date': date or ('web page as served ' + retrieved), 'local_path': path, 'page_marker': '=== PAGE 1 ===', 'pdf_page': 1, 'printed_page': None,
         'quote': quote, 'quote_mode': 'exact' if excerpt is None else 'cleaned', 'retrieved': retrieved, 'source_class': source_class, 'source_id': src_id or ('WEB-' + fid),
         'source_text_excerpt': None if excerpt is None else rlib.norm_ws(raw), 'text_sha256': rlib.sha_file(rlib.abspath(path)), 'text_variant': variant,
         'text_offset': off, 'text_offset_end': off + len(raw), 'title': title, 'url': url}
    if page_basis:
        c['page_basis'] = page_basis
    if corrections:
        c['ocr_corrections'] = corrections
    return c


def emit(targets, key, sub_claim, tier, cites, support, remains, state_date, lk, tier_basis, note=None, use='direct', verdict='partially_supported'):
    """targets: list of ('T'|'E', id). One line per (target, cite)."""
    for kind, tid in targets:
        for ci, c in enumerate(cites, 1):
            xid = 'WLK2-%s-%s-%02d' % (key, tid.replace('.', '').replace('-', ''), ci)
            line = {'citation': c, 'id': tid, 'lookup_refs': lk, 'matched_by': 'retry of the lookups ' + ', '.join(lk), 'remains_unsupported': remains, 'shard': SHARD,
                    'state_date': state_date, 'sub_claim': sub_claim, 'support': support, 'tier': tier, 'tier_basis': tier_basis, 'use_for_1863': use, 'verdict': verdict, 'xid': xid}
            if note:
                line['note'] = note
            (LINES_T if kind == 'T' else LINES_E).append(line)
            INDEXD[xid] = {'id': tid, 'kind': kind, 'lk': lk, 'key': key, 'quote_ok': True}


NPSW = 'official web page (National Park Service)'


def ca_cite(page_id, quote, paper, issue_date, seq, lccn, excerpt=None, corrections=None, retrieved=RETRIEVED, page_basis=None):
    """citation to the OCR reading text of a Chronicling America page (the newspapers task's copy when it holds the page, else this task's copy)"""
    cands = [os.path.join('tmp', 'library', 'web', 'ca', 'pages', *page_id.split('/')) + '.txt',
             os.path.join('tmp', 'library', 'web', 'retry', 'ca', 'pages', *page_id.split('/')) + '.txt']
    path = next((c for c in cands if os.path.exists(rlib.abspath(c))), None)
    if not path:
        FAILS.append((page_id, 'saved page text not found'))
        return {}
    off, raw = find_in(path, quote if excerpt is None else excerpt)
    c = {'author': None, 'date': issue_date, 'local_path': path, 'page_marker': None, 'pdf_page': None, 'printed_page': None, 'image_seq': seq, 'lccn': lccn, 'issue_date': issue_date,
         'newspaper': paper, 'quote': quote, 'quote_mode': 'exact' if excerpt is None else 'cleaned', 'retrieved': retrieved,
         'source_class': 'contemporary newspaper page (1863), digitised by the Library of Congress (Chronicling America); text is the OCR layer of the page',
         'source_id': 'CA-%s-%s-ed1-seq%d' % (lccn, issue_date, seq), 'source_text_excerpt': None if excerpt is None else rlib.norm_ws(raw), 'text_sha256': rlib.sha_file(rlib.abspath(path)),
         'text_variant': 'column-ordered reading text rebuilt from the page ALTO file (rebuild_cols v1: nothing corrected)', 'text_offset': off, 'text_offset_end': off + len(raw),
         'title': '%s, %s, image %d' % (paper, issue_date, seq), 'url': 'https://www.loc.gov/resource/%s/%s/ed-1/?sp=%d&st=text' % (lccn, issue_date, seq)}
    if corrections:
        c['ocr_corrections'] = corrections
    if page_basis:
        c['page_basis'] = page_basis
    return c


CEM = {7: '3', 8: '4', 9: '6', 10: '7', 11: '8'}   # PDF page -> printed page of the typescript


def ocr_cite(pdf_page, quote, excerpt=None, corrections=None):
    """citation to the machine reading (tesseract, 300 dpi) of one page of the National Park Service cemetery-enclosures study; the page image was looked at"""
    path = 'tmp/library/web/retry/F-350/ocr3/ocr_p7-11.txt'
    off, raw = find_in(path, quote if excerpt is None else excerpt)
    img = 'tmp/library/web/retry/F-350/ocr3/img/p%03d.png' % pdf_page
    c = {'author': 'National Park Service', 'date': 'undated typescript study (npshistory.com copy, fetched 2026-11-16)', 'local_path': path, 'page_marker': '=== PDF PAGE %d ===' % pdf_page, 'pdf_page': pdf_page,
         'printed_page': CEM[pdf_page], 'quote': quote, 'quote_mode': 'exact' if excerpt is None else 'cleaned', 'retrieved': RETRIEVED,
         'source_class': 'official secondary (National Park Service study, typescript photocopy)', 'source_id': 'NPS-CEM-ENCLOSURES', 'source_text_excerpt': None if excerpt is None else rlib.norm_ws(raw),
         'text_sha256': rlib.sha_file(rlib.abspath(path)), 'text_variant': 'machine reading (tesseract eng, --psm 6, 300 dpi) of the page image; the PDF text layer is scrambled and was not used',
         'text_offset': off, 'text_offset_end': off + len(raw), 'title': "The Development and Care of the Soldiers' National Cemetery Enclosures at Gettysburg", 'url': 'https://www.npshistory.com/publications/gett/cemetery-enclosures.pdf',
         'source_pdf_sha256': 'a9c293c13a6e82890f883c28e7eebb4208928af8b5ad28cfc86a9e12061c29c2', 'image_checked': True, 'image_file': img, 'image_sha256': rlib.sha_file(rlib.abspath(img)),
         'image_check': 'the page image was looked at (115 dpi view) and every sentence quoted was compared with the machine reading; the listed ocr_corrections are the only differences'}
    if corrections:
        c['ocr_corrections'] = corrections
    return c


def ocr_cite_gen(textpath, imgpath, pdf_page, printed, quote, excerpt, corrections, source_id, title, url, pdfsha, date, note):
    off, raw = find_in(textpath, quote if excerpt is None else excerpt)
    c = {'author': 'National Park Service', 'date': date, 'local_path': textpath, 'page_marker': '=== PDF PAGE %d ===' % pdf_page, 'pdf_page': pdf_page, 'printed_page': printed, 'quote': quote,
         'quote_mode': 'exact' if excerpt is None else 'cleaned', 'retrieved': RETRIEVED, 'source_class': 'official secondary (National Park Service study, typescript photocopy)', 'source_id': source_id,
         'source_text_excerpt': None if excerpt is None else rlib.norm_ws(raw), 'text_sha256': rlib.sha_file(rlib.abspath(textpath)),
         'text_variant': 'machine reading (tesseract eng, --psm 6, 300 dpi) of the page image; the PDF text layer misreads digits of this scan and was not used', 'text_offset': off, 'text_offset_end': off + len(raw),
         'title': title, 'url': url, 'source_pdf_sha256': pdfsha, 'image_checked': True, 'image_file': imgpath, 'image_sha256': rlib.sha_file(rlib.abspath(imgpath)), 'image_check': note}
    if corrections:
        c['ocr_corrections'] = corrections
    return c


def book2(fid, textname, quote, title, author, date, url, ident, sid, page_basis, printed_page=None, excerpt=None, corrections=None, source_class='printed book (public domain, archive.org scan)'):
    path = 'tmp/library/web/retry/%s/%s' % (fid, textname)
    off, raw = find_in(path, quote if excerpt is None else excerpt)
    c = {'author': author, 'date': date, 'local_path': path, 'page_marker': None, 'pdf_page': None, 'printed_page': printed_page, 'page_basis': page_basis, 'quote': quote,
         'quote_mode': 'exact' if excerpt is None else 'cleaned', 'retrieved': RETRIEVED, 'source_class': source_class, 'source_id': sid,
         'source_text_excerpt': None if excerpt is None else rlib.norm_ws(raw), 'text_sha256': rlib.sha_file(rlib.abspath(path)), 'text_variant': 'djvu OCR text as saved (archive.org /cors/ route)',
         'text_offset': off, 'text_offset_end': off + len(raw), 'title': title, 'url': url, 'archive_identifier': ident}
    if corrections:
        c['ocr_corrections'] = corrections
    return c


def build():
    # ------------------------------------------------------------------ R13.P-01 the Angle wall (NPS page The Angle)
    u = 'https://www.nps.gov/places/the-angle.htm'
    t = 'The Angle (U.S. National Park Service)'
    f = 'www.nps.gov_places_the-angle.htm.txt'
    c = [web_cite('F-304', f, 'The stone wall at the Angle is the remnant of a wall that was built by the local farmers before the battle and was originally two to three feet high.', u, t)]
    emit([('E', 'R13.P-01')], 'angle-nps',
         'R13.P-01.b and .c: the National Park Service says "The stone wall at the Angle is the remnant of a wall that was built by the local farmers before the battle and was originally two to three feet high"',
         'documented', c, 'supports_in_part',
         'The page names no farmer and no year and cites no basis; no 1863 source in the file gives the builder, so the builder stays "farm wall" for the product (R13.P-01.b). The height stays a conflict (R13.P-01.c): the NPS "originally two to three feet" against a Confederate officer who put it at about three feet at the Angle and 4.5 to 5 feet on the left, and Haskell "so low"; no default is chosen. The 80-yard length of the right-angle return is not on this page.',
         '1863-07 (pre-battle state of the wall)', ['LKR-BH-terrain-2-R13.P-01#bh0'], 'official web page of the National Park Service stating the fact; the page cites no basis')

    # ------------------------------------------------------------------ R13.P-01 the Copse (NPS page High Water Mark Monument and Copse of Trees)
    u = 'https://www.nps.gov/places/high-water-mark-monument-and-copse-of-trees.htm'
    t = 'High Water Mark Monument and Copse of Trees (U.S. National Park Service)'
    f = 'www.nps.gov_places_high-water-mark-monument-and-copse-of-trees.htm.txt'
    c = [web_cite('F-305', f, 'in 1863, a clump of bushes and small trees grew here', u, t),
         web_cite('F-305', f, 'In 1887, the iron fence was built to protect the trees from souvenir hunters. None of the trees inside the fence today date to 1863.', u, t)]
    emit([('E', 'R13.P-01')], 'copse-nps',
         'R13.P-01.d and .h: the National Park Service says that in 1863 "a clump of bushes and small trees grew here" (the Copse), that "In 1887, the iron fence was built to protect the trees from souvenir hunters", and that "None of the trees inside the fence today date to 1863"',
         'documented', c, 'supports_in_part',
         'No height of the 1863 growth is stated (R13.P-01.d stays an NPS inference of 8 to 10 ft and "little above a horse\'s head"); the page gives 1887 for the iron fence where the NPS Commemorative Works plan read earlier gives 1886 and the shard 1886-1888: carry the year as a range, no default. The product must not stand the fence, or any of today\'s trees, at frame one.',
         '1863-07 and 1887', ['LKR-BH-terrain-2-R13.P-01#bh0', 'LKR-BH-terrain-2-R13.P-01#bh1'], 'official web page of the National Park Service stating the facts; the page cites no basis')

    # ------------------------------------------------------------------ R13.P-04 the stone wall at the Wheatfield (NPS Civil War Series, section "July 2 - The Wheatfield")
    u = 'https://www.npshistory.com/publications/civil_war_series/16/sec8.htm'
    t = 'National Park Civil War Series: The Battle of Gettysburg (section 8, "July 2 - The Wheatfield")'
    f = 'cws16-sec8.htm.txt'
    c = [web_cite('F-201', f, "Even after Hood's men had taken Devil's Den, the fighting raged along a stone wall between Rose's Woods and the southern edge of the Wheatfield and among the trees on the stony, tree-covered hill along the Wheatfield's western edge. Third Corps units occupied the stone wall; Fifth Corps brigades manned the stony hill.", u, t,
                  page_basis='section JULY 2-THE WHEATFIELD of the booklet (first paragraph under the heading)', source_class='official publication (National Park Service Civil War Series booklet, npshistory.com copy)'),
         web_cite('F-201', f, '"Aim low!, boys! make every shot tell!" cautioned officers of the 17th Maine behind the wall, and they repelled the Confederates\' first attacks.', u, t,
                  page_basis='section JULY 2-THE WHEATFIELD of the booklet', source_class='official publication (National Park Service Civil War Series booklet, npshistory.com copy)')]
    emit([('E', 'R13.P-04')], 'wheatfield-wall-nps',
         "R13.P-04.b: the National Park Service Civil War Series booklet puts the fighting 'along a stone wall between Rose's Woods and the southern edge of the Wheatfield', says Third Corps units occupied the wall, and has officers of the 17th Maine 'behind the wall'",
         'documented', c, 'supports_sub_claim',
         'The booklet does not say that the wall pre-existed the fight (R13.P-04.c stays inferred from the line forming behind it), gives no height, length or builder, and names no damage by fire or trampling (R13.P-04.d stays an open gap). It is a modern official summary (no author named in the saved page; no 1863 basis cited); the 1863 witnesses are the OR reports already cited in R13.P-04.a and .b. It does tie the wall to the name Rose\'s Woods, which the OR does not.',
         '1863-07-02', ['LKR-BH-terrain-2-R13.P-04#bh0'], 'official National Park Service publication (Civil War Series), basis not cited on the page', use='direct')

    # ------------------------------------------------------------------ R14.E-15 / R13.G-06 Hazlett's guns hauled by hand (NPS monument page)
    u = 'https://www.nps.gov/places/hazlett-s-battery.htm'
    t = "5th United States Artillery, Battery D (Hazlett's Battery) Monument (U.S. National Park Service)"
    f = 'www.nps.gov_places_hazlett-s-battery.htm.txt'
    c = [web_cite('F-300', f, 'Hazlett’s gunners climbed up the rocky slopes, dragging the guns, caissons, and limbers by hand over the harsh terrain.', u, t),
         web_cite('F-300', f, 'Over the span of two hours Battery D helped save Little Round Top for the Union army. Hazlett was killed on July 2 during the fighting.', u, t)]
    emit([('E', 'R14.E-15'), ('E', 'R13.G-06')], 'hazlett-nps',
         "R14.E-15.c and R13.G-06.e: the National Park Service says Hazlett's gunners climbed the rocky slopes 'dragging the guns, caissons, and limbers by hand over the harsh terrain', that 'Over the span of two hours Battery D helped save Little Round Top', and that Hazlett was killed on July 2",
         'documented', c, 'supports_in_part',
         'This is one of four conflicting accounts of how the guns got up (by hand with the 155th Pennsylvania; lifted with handspikes; horses lashed with the infantry at the wheels; plunging teams): the page takes the by-hand version without naming a basis, so it does not settle the conflict, which stays carried as selectable scenarios with no default. It gives no clock time: the PDF\'s first fire at 17:45 stays unsupported ("over the span of two hours" is a duration, not an hour); it says nothing of an emplacement.',
         '1863-07-02', ['LKR-BH-fence-1-R14.E-15#bh0', 'LKR-BH-terrain-1-R13.G-06#bh0'], 'official web page of the National Park Service stating the fact; the page cites no basis')

    # ------------------------------------------------------------------ R14.S-063 Brian: claim total on the NPS page differs from the 1972 study
    u = 'https://www.nps.gov/places/abraham-brian-farm.htm'
    t = 'Abraham Brian Farm (U.S. National Park Service)'
    f = 'www.nps.gov_places_abraham-brian-farm.htm.txt'
    c = [web_cite('F-314', f, 'He also lost 194 panels of his post and rail and worm fencing, and a stone fence had been torn down and removed for defenses. He eventually submitted a claim to the government for damages in the amount of $575. Damages caused by the battle were not covered, and Brian only received $15 for the 1.5 tons of hay used by Federal cavalry to feed their horses.', u, t),
         web_cite('F-314', f, 'When the family returned after the battle, they found the house and barn had been damaged by artillery and small arms fire.', u, t)]
    emit([('E', 'R14.S-063')], 'brian-nps',
         "R14.S-063.3: the National Park Service page on the Abraham Brian farm says Brian lost 194 panels of post and rail and worm fencing and that a stone fence had been torn down and removed for defenses, prints his claim as $575 with $15 received for hay, and says the house and barn were damaged by artillery and small arms fire",
         'documented', c, 'conflicts_with_row',
         'The panel count agrees with the 1972 study read by fence-3 (194 panels), but the claim total does not: this page prints $575 where the 1972 study has $1,028 claimed and $15 received; both are carried, no default. The page dates no loss within the three days, so "nearly destroyed" and "3 Jul" (R14.S-063.5) stay unsupported; "General Hays reportedly used the Brian house as his headquarters" is hedged by the page itself.',
         '1863-07-01 to 1863-07-03', ['LKR-fence-3-L54', 'LKR-BH-fence-3-R14.S-063#bh0', 'LKR-BH-fence-3-R14.S-063#bh1'], 'official web page of the National Park Service; the claim figures are the NPS\'s reading of the claim, basis not cited on the page')

    # ------------------------------------------------------------------ R14.S-073 / R14.S-040 Trostle petition printed in the NPS Civil War Series booklet
    u = 'https://www.npshistory.com/publications/civil_war_series/16/sec20.htm'
    t = 'National Park Civil War Series: The Battle of Gettysburg (section 20, "The Civilian Cost of Battle")'
    f = 'cws16-sec20.htm.txt'
    sc = 'official publication (National Park Service Civil War Series booklet, npshistory.com copy) printing an 1868 petition'
    c = [web_cite('F-348', f, '6400 Rails destroyed 512.00 House and Barn injured by shells, and used for hospital 200.00', u, t, page_basis='the petition of Catherine Trostle printed under THE CIVILIAN COST OF BATTLE', source_class=sc),
         web_cite('F-348', f, 'the crops and fences were totally destroyed. The fences were burned.', u, t, page_basis='the petition of Catherine Trostle printed under THE CIVILIAN COST OF BATTLE', source_class=sc),
         web_cite('F-348', f, 'the family was driven from the house, which was taken possession of by the soldiers, and nursed for wounded men, and it was also struck by shells and balls, and much injured. There were 16 dead horses left close by the door and probably 100 on the farm.', u, t,
                  page_basis='the petition of Catherine Trostle printed under THE CIVILIAN COST OF BATTLE', source_class=sc)]
    emit([('E', 'R14.S-073'), ('E', 'R14.S-040')], 'trostle-petition',
         "R14.S-073 and R14.S-040: the National Park Service booklet prints the petition of Catherine Trostle (for Abram Trostle, Cumberland township, to the Board of Commissioners under the act of 9 April 1868): '6400 Rails destroyed' ($512.00), 'House and Barn injured by shells, and used for hospital' ($200.00), 'the crops and fences were totally destroyed. The fences were burned', the house 'taken possession of by the soldiers, and nursed for wounded men ... struck by shells and balls, and much injured', and 'There were 16 dead horses left close by the door and probably 100 on the farm'",
         'documented', c, 'supports_in_part',
         'The statements are the claimant\'s own (an interested petition of 1868 for losses "on or about the 1st to 4th of July, 1863"), printed by the NPS; the original file in the Pennsylvania State Archives (series Board of Commissioners to Assess Damages in Border Counties) was not read here, so the booklet is the witness. The petition gives no day for the hospital use or for the burning of the fences, so "abandoned by 6 Jul" (R14.S-073.3) stays unsupported; the "16 dead horses" agrees with the printed row\'s "16+" and the NPS photograph captions, the "$2,500 claim" of the printed row is not on this page (the printed items add up, by addition made in this note, to $3,188.50, with a further $120.00 for flour in a mill).',
         '1863-07-01 to 1863-07-04 (petition of 1868)', ['LKR-fence-2-L42', 'LKR-fence-2-L84', 'LKR-BH-fence-2-R14.S-040#bh0', 'LKR-BH-fence-3-R14.S-073#bh0', 'LKR-BH-fence-3-R14.S-068#bh1'],
         'claimant\'s sworn petition of 1868 (interested participant), reproduced in an official National Park Service publication', use='direct')

    # ================================================================== batch 2 (2026-11-16): sources found on the reachable hosts through the retries
    # ------------------------------------------------------------------ T1-013 Sandoe / Lightner (Gettysburg Compiler, 27 Sep 1905)
    u = 'https://archive.org/details/gettysburg-compiler-1905-09-27'
    t = 'Gettysburg Compiler (1905-09-27)'
    fn = 'gettysburg-compiler-1905-09-27_djvu.txt'
    pb = 'the article of a witness of 26 June 1863 (name garbled in the OCR: "Coil- over"), narrated to the Compiler; no page number in the OCR text'
    c = [book2('F-357', fn, "George W. Sandoe and a comrade named Lightner, living near Harney had joined Bell's cavalry of Home Guards", t, 'Gettysburg Compiler (newspaper)', '1905-09-27', u,
               'gettysburg-compiler-1905-09-27', 'GBG-COMPILER-1905-09-27', pb, excerpt="George W. Sandoe and a com- rade named Lightner, living near Har- ney had joined Bell's cavalry of Home Guards",
               corrections=[['com- rade', 'comrade'], ['Har- ney', 'Harney']], source_class='local newspaper of 1905 (public domain, archive.org scan), retrospective account'),
         book2('F-357', fn, 'He said that he and Sandoe had ridden down along creek and when they came to the pike saw some Rebs coming their way. They urged their horses on the run. His horse took a fence but the horse Sandoe rode refused to take the fence.', t,
               'Gettysburg Compiler (newspaper)', '1905-09-27', u, 'gettysburg-compiler-1905-09-27', 'GBG-COMPILER-1905-09-27', pb,
               excerpt='He said that he and Sandoe had rid- den down aloug creek and when they came to the pike saw some Rebs com- ing their way. They urged their horses on the run. His norse took a fence but the horse Sandoe rode re- fused to take the fence.',
               corrections=[['rid- den', 'ridden'], ['aloug', 'along'], ['com- ing', 'coming'], ['norse', 'horse'], ['re- fused', 'refused']], source_class='local newspaper of 1905 (public domain, archive.org scan), retrospective account'),
         book2('F-357', fn, 'He had ridden on as fast as his horse could go and before he was out of hearing came the sound of firing and he believed that his companion, Sandoe, had been killed.', t,
               'Gettysburg Compiler (newspaper)', '1905-09-27', u, 'gettysburg-compiler-1905-09-27', 'GBG-COMPILER-1905-09-27', pb,
               excerpt='He had rid- den on as fast as his horse could go and before be was out ot hearing came the sound of firing and he believed that his companion, Sandoe, had been killed.',
               corrections=[['rid- den', 'ridden'], ['be was', 'he was'], ['ot hearing', 'of hearing']], source_class='local newspaper of 1905 (public domain, archive.org scan), retrospective account')]
    emit([('T', 'T1-013')], 'sandoe-lightner-1905',
         'T1-013 (the open sub-claim that a second trooper, Lightner, escaped): the Gettysburg Compiler of 27 Sep 1905 prints a witness of the raid of 26 June 1863 who says that "a comrade named Lightner" of Bell\'s cavalry of Home Guards was with George W. Sandoe, and, as Lightner told the witness\'s mother, that the two rode down by the creek to the pike, saw Rebels coming, urged their horses on, that his horse took a fence which Sandoe\'s horse refused, and that he heard firing and believed Sandoe killed',
         'documented', c, 'supports_in_part',
         'Retrospective (42 years later) and second-hand: the witness repeats what Lightner told his mother on the day. It gives no hour for the shooting (the witness says only that he and his party left the town about five o\'clock and learned of the shot man afterwards, so the hour 16:00 stays unsupported), gives no first name for Lightner, and names the Confederates only as "Rebs" (the attribution to White\'s battalion stays an open gap). The OCR of this issue is damaged; every repaired character or hyphenation is listed in ocr_corrections.',
         '1863-06-26 (printed 1905)', ['LKR-T1-013', 'LKR-tl-01-L1'], 'local newspaper of 1905 printing a witness\'s narrative (retrospective, second-hand for Lightner\'s account)')

    # ------------------------------------------------------------------ R14.S-036 / R14.S-037 the Sherfy house and barn (Minnigh, 1892; two independent scans)
    pb = 'anecdote section of the guide (near the end of the book); no running head within 12,000 characters of the passage in this OCR text'
    meta1 = dict(title='Gettysburg: "What They Did Here." Profusely illustrated historical guide book (first scan)', author='Minnigh, Luther W.', date='1892 (entered at the Library of Congress 1892)',
                 url='https://archive.org/details/gettysburgwhatth02minn', ident='gettysburgwhatth02minn', sid='MINNIGH-1892-SCAN-A', page_basis=pb, source_class='printed guide book of 1892 (public domain, archive.org scan), secondary')
    meta2 = dict(title='Gettysburg: "What They Did Here." Profusely illustrated historical guide book (second scan, Brigham Young University copy)', author='Minnigh, Luther W.', date='1892 (entered at the Library of Congress 1892)',
                 url='https://archive.org/details/gettysburgwhatth1892minn', ident='gettysburgwhatth1892minn', sid='MINNIGH-1892-SCAN-B', page_basis=pb, source_class='printed guide book of 1892 (public domain, archive.org scan), secondary')
    c_house = [book2('F-353', 'gettysburgwhatth1892minn_djvu.txt', 'Sherfy property, near the Peach Orchard, was struck by over 150 minie balls \u2014 four shells passed entirely through the building.', excerpt='Sherfy property, near the Peach Orchard, was struck by over 150 mlnie balls \u2014 four shells passed entirely through the building.', corrections=[['mlnie', 'minie']], **meta2),
               book2('F-352', 'gettysburgwhatth02minn_djvu.txt', 'Sherfy property, near the Peach Orchard, was struck by over 150 minie balls \u2014four shells passed entirely through the building.', excerpt='Sherfy property, near the Peach Orchard, was struck by over 150 minle balls \u2014four shells passed entirely through th\u00ab building.', corrections=[['minle', 'minie'], ['th\u00ab', 'the']], **meta1)]
    emit([('E', 'R14.S-036')], 'sherfy-minnigh-house',
         'R14.S-036: Minnigh\'s guide of 1892 says that the Sherfy property near the Peach Orchard "was struck by over 150 minie balls" and that "four shells passed entirely through the building"',
         'documented', c_house, 'supports_in_part',
         'It is a guide-book statement of 1892 (29 years after, by a battlefield guide; basis not given). It is not a count of shell hits: the printed row\'s "7+ shell hits", the scarred south and west walls, the roof puncture and the dates are not stated; "four shells passed entirely through the building" and the 150 bullets are carried beside the printed count, no default. Two independent OCR scans of the same book agree (the second scan is the clearer text).',
         '1863-07-02 to 1863-07-03 (observed 1892)', ['LKR-fence-2-L38', 'LKR-fence-2-L73', 'LKR-BH-fence-2-R14.S-036#bh0'], 'printed guide book of 1892 by a battlefield guide (secondary, 29 years after the battle)')
    c_barn = [book2('F-353', 'gettysburgwhatth1892minn_djvu.txt', 'The Sherfy barn was burned during the 3d of July.', **meta2),
              book2('F-352', 'gettysburgwhatth02minn_djvu.txt', 'The Sherfy barn was burned during the 3d of July.', **meta1)]
    emit([('E', 'R14.S-037')], 'sherfy-minnigh-barn',
         'R14.S-037 and conflict C-026: Minnigh\'s guide of 1892 says "The Sherfy barn was burned during the 3d of July"',
         'documented', c_barn, 'supports_in_part',
         'This gives the day (3 July) of the barn fire as a non-lead printed statement, which the 3 July window of C-026 had lacked (its "morning of 3 Jul" rested on a 77th NY soldier read through a summariser on a refused host); it gives no hour (so "morning" stays a lead), no cause, no statement on who was in the barn, and cites no basis. It does not support the evening of 2 July. Secondary, written 29 years after the battle; two independent OCR scans agree.',
         '1863-07-03 (printed 1892)', ['LKR-fence-2-L38', 'LKR-fence-2-L73', 'LKR-fence-2-L6', 'LKR-fence-2-L122', 'LKR-BH-fence-2-R14.S-037#bh0'], 'printed guide book of 1892 by a battlefield guide (secondary, 29 years after the battle)')

    # ------------------------------------------------------------------ R14.S-076 the Gettysburg Railroad (Haupt, OR27-1 p.23 = Haupt 1901; Letterman, OR27-1 pp.198-199)
    c_haupt = [be.or_cite('after completing the railroad to Gettysburg, returned to Baltimore Sunday night, after a very active week', page_check='23',
                          note='Haupt\'s report is dated Washington, D. C., July 7, 1863 (printed pp. 22-24); in it "Sunday" is 5 July, the day he went to Gettysburg by buggy after the enemy "having retreated the previous evening"'),
               be.or_cite('proceed to the next bridge, repair it, and work on to Gettysburg, unless he received word from me', page_check='23'),
               book2('F-356', 'reminiscencesofg00hauprich_djvu.txt', 'returned to Oxford, and after completing the railroad to Gettysburg, returned to Baltimore Sunday night after a very active week',
                     'Reminiscences of General Herman Haupt (1901), the report of 7 July 1863 as reprinted', 'Haupt, Herman', '1901', 'https://archive.org/details/reminiscencesofg00hauprich', 'reminiscencesofg00hauprich', 'HAUPT-1901',
                     'the report of 7 July 1863 reprinted in the chapter on the Gettysburg campaign; no running head within 6,000 characters in the OCR text; the same report is OR27-1 p. 23')]
    emit([('E', 'R14.S-076')], 'gettysburg-railroad-haupt',
         'R14.S-076: Haupt\'s report of 7 July 1863 (OR27-1 p. 23; reprinted in his Reminiscences, 1901) says he left orders at Oxford for the foreman, after finishing the Conewago bridge, "to proceed to the next bridge, repair it, and work on to Gettysburg", went to Gettysburg by buggy, and "after completing the railroad to Gettysburg, returned to Baltimore Sunday night"',
         'documented', c_haupt, 'conflicts_with_row',
         'Haupt\'s "completing the railroad to Gettysburg" is the officer in charge of the work speaking on 7 July about Sunday 5 July; it cannot be read as the first train at the station, because the Sanitary Commission report (already cited in this row) has the first freight train from Baltimore reach a temporary terminus more than a mile from the town on Tuesday 7 July, and Letterman (next line) says the road was not in good running order for some time after the 6th. The printed "traffic resumes 10 Jul" is therefore neither supported nor contradicted: carry 5 Jul (Haupt, completion of the work in hand), 7 Jul (first train to a temporary terminus) and "some time after the 6th" (Letterman) as the range, no default. The page of the Reminiscences is not given by the OCR.',
         '1863-07-05 to 1863-07-07', ['LKR-fence-3-L108', 'LKR-fence-3-L72', 'LKR-fence-3-L107', 'LKR-BH-fence-3-R14.S-076#bh0'], 'official report of the officer in charge of the Military Railway Department (primary), reprinted 1901')
    c_let = [be.or_cite('As it proved that this was not in good running order for some time after that date', page_check='198',
                        note='Letterman\'s report is dated Culpeper Court-House, October 3, 1863; the sentence follows his statement that General Ingalls informed him the railroad to Gettysburg would be in operation on the 6th'),
             be.or_cite('the total inadequacy of the railroad to Gettysburg to meet the demands made upon it after the battle was over', page_check='199')]
    emit([('E', 'R14.S-076')], 'gettysburg-railroad-letterman',
         'R14.S-076: Letterman (OR27-1 pp. 198-199, report of 3 Oct 1863) says General Ingalls told him the railroad to Gettysburg would be in operation on the 6th, that it "was not in good running order for some time after that date", and he lists "the total inadequacy of the railroad to Gettysburg to meet the demands made upon it after the battle was over" among the difficulties of the medical department',
         'documented', c_let, 'supports_in_part',
         'No date is given for the first train or for good running order ("some time after" the 6th): the printed 10 Jul is inside that window but is not stated; Letterman writes three months later and from the medical side, not as the railway officer. Carried with Haupt (previous line) and the Sanitary Commission report as the range of values.',
         '1863-07-06 and after', ['LKR-fence-3-L108', 'LKR-fence-3-L72', 'LKR-BH-fence-3-R14.S-076#bh0'], 'official report of the Medical Director of the Army of the Potomac (participant, written 3 Oct 1863)')

    # ------------------------------------------------------------------ R14.S-088 serenades on the night of 18 Nov (the facts are also in web-newspapers.jsonl under the R22 ids; mapped here to the fence-3 row)
    c_s = [ca_cite('sn83030213/1863-11-20/ed-1/seq-1', 'After supper the President was serenaded by the excellent band of the 5th New-York Artillery.', 'New-York daily tribune (New-York [N.Y.])', '1863-11-20', 1, 'sn83030213'),
           ca_cite('sn83026172/1863-11-21/ed-1/seq-2', 'The President was greeted at the depot with much enthusiasm by a large gathering of citizens, who followed him to his lodgings at the residence of David Wills, Esq., where soon after his arrival he was serenaded by the Band of the Fifth New York Artillery',
                   'Daily national intelligencer (Washington City [D.C.])', '1863-11-21', 2, 'sn83026172')]
    emit([('E', 'R14.S-088')], 'serenade-18nov',
         'R14.S-088: contemporary newspapers report a crowd and bands at Gettysburg on the evening of Wednesday 18 Nov 1863: the New-York Tribune (20 Nov) "After supper the President was serenaded by the excellent band of the 5th New-York Artillery"; the National Intelligencer (21 Nov) has the President "greeted at the depot with much enthusiasm by a large gathering of citizens, who followed him to his lodgings", where "soon after his arrival he was serenaded by the Band of the Fifth New York Artillery"',
         'documented', c_s, 'supports_in_part',
         'Crowds and a band are documented; the PDF\'s "alcohol in the streets" is not: no saved page of 18-25 Nov 1863 (431 pages re-scanned for drunk, intoxicat, liquor, whisky, tipsy, carous, revel, saloon, spirits near Gettysburg, 2026-11-16) says it, and "torch" (the first lookup) is not in these accounts. Further serenade, crowd-size and platform lines are in web-newspapers.jsonl under R22.0001, R22.0002, R22.0000 and R22.0011 (xids NEWS-epi-serenade-late-hour, NEWS-epi-seward-at-harper, NEWS-epi-crowd-size, NEWS-epi-platform-governors); a count of papers is not a count of independent witnesses (the correspondents share material).',
         '1863-11-18', ['LKR-fence-3-L112', 'LKR-BH-fence-3-R14.S-088#bh0', 'LKR-BH-fence-3-R14.S-087#bh0'], 'contemporary newspaper pages (1863) digitised by the Library of Congress', use='direct')

    # ================================================================== batch 3: the cemetery-enclosures study read from the page images (retry of fence-3 L84 and L8: pdftoppm is installed now)
    lk = ['LKR-fence-3-L84', 'LKR-fence-2-L7', 'LKR-fence-2-L9', 'LKR-BH-fence-3-R14.S-083#bh1']
    c = [ocr_cite(11, 'The first enclosure to be completed was the division fence between the Evergreen and National Cemeteries'),
         ocr_cite(11, 'This was described by the local newspaper as an "iron railing" dividing the two burial grounds.'),
         ocr_cite(11, 'This fence was constructed of wrought-iron gas pipes (1 1/4 inches in diameter) which were screwed together and passed through cast-iron posts. The gas pipe rails were in panels of three, placed one above the other about a foot and a half apart. This fencing was 1726 feet long (from Baltimore Pike southwest, 960 feet; then south, 766 feet), and cost between $2.35 and $2.55 per linear foot',
                  excerpt='This fence was constructed of wrought-iron gas pipes (1 1/4 inches in diameter) which were screwed together and passed through cast~iron posts. The gas pipe rails were in panels of three, placed one above the other about a foot and a half apart. This fencing was 1726 feet long (from Baltimore Pike southwest, 960 feet; then south, 766 feet), and cost between $2.35 and $2.55 per linear foot',
                  corrections=[['cast~iron', 'cast-iron']]),
         ocr_cite(11, 'Wills to Curtin, March 6, 1865, in Revised Report, p. 11.', excerpt='ni11s to Curtin, March 6, 1865, in Revised Report, p. 11.', corrections=[['ni11s', 'Wills']]),
         ocr_cite(11, 'Adams Sentinel, May 9, 1865; Gettysburg Compiler, May 8, 1865.', excerpt='dams Sentinel, May 9, 1865; Gettysburg Compiler, May 8, 1865.', corrections=[['dams Sentinel', 'Adams Sentinel']])]
    emit([('E', 'R14.S-082')], 'cemstudy-division-fence-built',
         'R14.S-082: the National Park Service study of the cemetery enclosures says "The first enclosure to be completed was the division fence between the Evergreen and National Cemeteries", described by the local newspaper as an "iron railing", of wrought-iron gas pipe rails (1 1/4 inch) in panels of three through cast-iron posts, 1726 feet long (960 feet from the Baltimore Pike southwest, then 766 feet south), at $2.35 to $2.55 a linear foot, citing Wills to Curtin of 6 March 1865 and the Adams Sentinel of 9 May 1865 and the Gettysburg Compiler of 8 May 1865',
         'documented', c, 'supports_sub_claim',
         'The study gives no day of completion: its own cited dates fix the window "by 6 March 1865 (Wills to Curtin), described in the local papers of 8-9 May 1865", and with the line of 8 July 1864 (next line) the fence cannot have stood on 19 Nov 1863 (an inference from these dates: no text describes the line itself on that day). The CLR\'s "fall of 1864" read earlier is consistent. The page images of pp. 3 to 8 of the study were read; the rest of the study (the Baltimore Pike fence and gates, the granite wall, later maintenance, printed pp. 9 on) is not read here. Quotes are cut from the machine reading of the page image; the page image was looked at.',
         '1864-07 to 1865-05', lk, 'official National Park Service study quoting dated letters and newspapers; the dates are the study\'s citations, not read in the originals here')
    c = [ocr_cite(9, 'attempted to wheedle out of the "iron railing" fence by taking advantage of the "or otherwise" phrase.', excerpt='attempted to wheedle out of the "iron railing" fence by taking advan- tage of the "or otherwise" phrase.', corrections=[['advan- tage', 'advantage']]),
         ocr_cite(9, 'He wrote to J. R. Bartlett (Commissioner from Rhode Island) on July 8, 1864, that "If we can now avoid the expense of the fence between the two cemeteries we should do so. I think that a low ornamental hedge might be planted there at a trifling expense which would answer any purpose."')]
    emit([('E', 'R14.S-082')], 'cemstudy-wills-july-1864',
         'R14.S-082: the study says Wills "attempted to wheedle out of the \'iron railing\' fence by taking advantage of the \'or otherwise\' phrase" (of the agreement) and quotes his letter of 8 July 1864 to J. R. Bartlett: "If we can now avoid the expense of the fence between the two cemeteries we should do so. I think that a low ornamental hedge might be planted there at a trifling expense which would answer any purpose"',
         'documented', c, 'supports_sub_claim',
         'It shows that on 8 July 1864 the fence between the two cemeteries had not been built (the expense was still to be avoided), so it did not stand on 19 Nov 1863; it also records that the agreement carried an "iron railing ... or otherwise" condition, but the text of that condition (the agreement of 14 Aug 1863) is not in the pages read, so its wording and its date are taken from the study\'s phrase only. The hedge Wills proposed was not what was built (the gas-pipe railing, previous line).',
         '1863-08-14 to 1864-07-08', lk, 'official National Park Service study quoting a dated letter of Wills (microfilm, Lehigh University Library, as cited in the study)')
    c = [ocr_cite(10, 'After the dedicatory ceremonies of November 19, 1863, work proceeded as weather permitted in the reburial of Union dead.'),
         ocr_cite(10, 'Landscaping and planting of the grounds, laying out drives and walks, and erecting the enclosures for the cemetery took next priority',
                  excerpt='Landscaping and planting of the grounds, laying out drives and walks, and erecting the enclosurers for the cemetery took next priority', corrections=[['enclosurers', 'enclosures']])]
    emit([('E', 'R14.S-082'), ('E', 'R14.S-084')], 'cemstudy-after-dedication',
         'R14.S-082 and R14.S-084: the study says that after the dedicatory ceremonies of 19 Nov 1863 the reburial of Union dead proceeded (begun 1 Nov, until mid-March 1864) and that "Landscaping and planting of the grounds, laying out drives and walks, and erecting the enclosures for the cemetery took next priority"',
         'documented', c, 'supports_in_part',
         'The order of work puts the erection of the enclosures after the dedication, so the soldiers\' cemetery was not enclosed on 19 Nov 1863; the sentence gives no date for any enclosure (the dated ones are in the two lines above: July 1864 not built, March 1865 first enclosure complete). It describes no fence line of the ground on the day itself, so the contemporary description of the ground on 19 Nov (R14.S-084) still rests on the newspapers already cited.',
         '1863-11-19 to 1864-03', lk, 'official National Park Service study (the sentence cites a footnote on Wills\'s letter of 22 July 1864)')
    c = [ocr_cite(7, "Close examination of photographs taken of the gatehouse and cemeteries from the East Cemetery Hill observation tower in or about 1878 reveals the same style of fencing as that erected by Wills in 1865 for the Soldiers' National Cemetery.")]
    emit([('E', 'R14.S-082')], 'cemstudy-wills-1865-fence',
         "R14.S-082: the study says photographs of the gatehouse and cemeteries taken from the East Cemetery Hill observation tower in or about 1878 show \"the same style of fencing as that erected by Wills in 1865 for the Soldiers' National Cemetery\"",
         'documented', c, 'supports_in_part',
         'It dates the iron fence of the Soldiers\' National Cemetery to 1865 by the study\'s own reading of photographs of about 1878 (the photographs are not cited by number); the Baltimore Pike fence and gates were "the last to go up" (next page of the study), so 1865 is not the date of the dividing line, which was the first enclosure completed (earlier line). Nothing here describes any fence in 1863.',
         '1865 (photographs about 1878)', lk, 'official National Park Service study (the study\'s reading of photographs of about 1878)')
    c = [ocr_cite(8, 'We made the condition, that, the state (or states) enclose only on the Taneytown road (west) and on the North and South; leaving the line on the East without any enclosure-- that line adjoining our Cemetery ground--and thus leaving the site proposed and our Cemetery grounds in one common enclosure.')]
    emit([('E', 'R14.S-082')], 'cemstudy-mcconaughy-aug5',
         'R14.S-082: the study quotes David McConaughy\'s proposal to Governor Curtin of 5 Aug 1863 for the Evergreen Cemetery Association: "We made the condition, that, the state (or states) enclose only on the Taneytown road (west) and on the North and South; leaving the line on the East without any enclosure-- that line adjoining our Cemetery ground--and thus leaving the site proposed and our Cemetery grounds in one common enclosure"',
         'documented', c, 'conflicts_with_row',
         'This is the proposal of 5 August, before the sale of 14 August: it asks for NO enclosure on the line between the cemeteries (one common enclosure), where the fence-3 reading of R14.S-082 (from the NPS cultural landscape report, quoting the agreement) has the association making an open iron railing on the division line a condition of the sale of 14 Aug 1863. The study\'s own footnote on the later agreement speaks of an "iron railing" with the phrase "or otherwise" (previous lines), so the condition changed between the proposal and the sale or the "iron railing" was added by the association in the agreement; the agreement\'s text is not in the pages read. Carry both values (no enclosure proposed 5 Aug; iron railing "or otherwise" in the agreement of 14 Aug), no default.',
         '1863-08-05', lk, 'official National Park Service study quoting a dated letter (David Wills correspondence, GNMP vertical files, as cited in the study)')

    # ================================================================== batch 4: summariser-only readings replaced by verbatim ones; a procedural basis
    c = [be.book_cite('JACOBS-1864', 'one of these officers was on the College cupola making observations, when his attention was specially directed to that hill by one of the officers of the College',
                      '25', 'the passage precedes the running head "26 THE REBEL INVASION OF" (p. 25); Jacobs, Notes on the Rebel Invasion of Maryland and Pennsylvania (1864)',
                      excerpt='one of these officers was on the College cupola making ob- servations, when his attention was specially directed to that hill by one of the officers of the College',
                      corrections=[['ob- servations', 'observations']])]
    emit([('T', 'T1-092')], 'jerome-jacobs-college-cupola',
         'T1-092: Jacobs (1864, p. 25) says that early on 1 July General Howard\'s signal officers had examined the hills round Gettysburg and that at "8J A. m." one of them was on the College cupola making observations when one of the officers of the College directed his attention to Cemetery Hill',
         'documented', c, 'conflicts_with_row',
         'The cupola is the College\'s (Pennsylvania College), the observer is one of Howard\'s signal officers and the hill is Cemetery Hill: nothing here puts Buford and Reynolds together in the Seminary cupola at 09:30-10:20, so the row\'s Seminary cupola meeting stays unsupported (inferred at most). The hour is printed with a fraction that the OCR renders "J": tl-02 read it as 8:30, but the same character stands for a quarter in "3J p. m." at p. 15 (tl-01 reads 3:15), so 8:15 or 8:30 cannot be told from the OCR text and the page image was not looked at in this pass. This line replaces the summariser-only readings of tl-02 L5 and L6 (WebFetch) with a verbatim reading of the saved text (ws9 JACOBS-1864; the Library of Congress text of F-150 is a second copy).',
         '1863-07-01 (printed 1864)', ['LKR-tl-02-L5', 'LKR-tl-02-L6', 'LKR-T1-092', 'LKR-tl-02-L7'], "participant's own account of the college (Jacobs, 1864), written from the college's point of view")
    u = 'https://www.nps.gov/gett/learn/education/a-nation-at-war-traveling-trunk-table-5-the-medical-corps-at-war.htm'
    c = [web_cite('F-058', 'medical-corps.html.txt', 'It was often hastily put togather, near or in a barn, church, or other large building. Hay and straw was often placed for bedding and a door for an operating table.', u,
                  'Table 5: Civil War Medicine - Gettysburg National Military Park (U.S. National Park Service)', retrieved='2026-11-16', date='web page as served 2026-11-13 (file read 2026-11-16)', src_id='WEB-F-058'),
         web_cite('F-058', 'medical-corps.html.txt', 'chloroform or ether as an anesthetic', u, 'Table 5: Civil War Medicine - Gettysburg National Military Park (U.S. National Park Service)', retrieved='2026-11-16',
                  date='web page as served 2026-11-13 (file read 2026-11-16)', src_id='WEB-F-058')]
    emit([('T', 'T2-220')], 'fieldhospital-nps-generic',
         'T2-220 (procedural basis only): the National Park Service says a Civil War field hospital "was often hastily put togather, near or in a barn, church, or other large building", with hay and straw for bedding and "a door for an operating table", and that the surgeon had "chloroform or ether as an anesthetic"',
         'plausible-procedural', c, 'supports_in_part',
         'A general statement about field hospitals of the war, not about the Spangler farm: it supports no Spangler-specific detail (four tables, lanterns, 80 amputees, the schoolhouse, the barn forebay, no hand washing all stay unsupported). The Gettysburg pages read in this pass say nothing on them: F-050 (tour a family farm turned field hospital) is the Ray house at Wilson\'s Creek, F-316 is Shiloh and F-317 is Mill Springs, and the NPS Spangler news page redirects to a host the proxy refuses (home.nps.gov).',
         '1863-07 (general practice)', ['LKR-T2-220', 'LKR-fence-2-L52', 'LKR-fence-2-L129'], 'official web page of the National Park Service describing general practice (a traveling-trunk lesson page)', use='indirect')

    # ================================================================== batch 5: page-image check of the 1972 Brien farm study (retry of fence-3 L8: pdftoppm is installed now)
    BR = dict(textpath='tmp/library/web/retry/F-366/ocr_p7-15.txt', source_id='NPS-BRIEN-FARM', title='The Brien Farm and Family', url='https://www.npshistory.com/publications/gett/brien-farm.pdf',
              pdfsha='76a1a095b7fae524fe440a0f1c606b02ed0a65b4f810a3756283c0dcdaa40eda', date='undated typescript study of 1972 (npshistory.com copy, read from the copy saved 2026-11-13)')
    c = [ocr_cite_gen(imgpath='tmp/library/web/retry/F-366/img/p015.png', pdf_page=15, printed='134', quote='(194 panels of fence--part post and rail and part worm - worth $174; stone fence destroyed worth $5.00)',
                      excerpt='(19) panels of fence--part post and rail and part worm - worth $17; stone fence destroyed worth $5.00)', corrections=[['(19) panels', '(194 panels'], ['$17;', '$174;']],
                      note='the page image was looked at (150 dpi view): the digits read 194 and $174 (the typeface\'s 4 is misread by the machine reading as a bracket and a missing digit, and by the PDF text layer as 195 and $175); these two repairs are the only differences', **BR),
         ocr_cite_gen(imgpath='tmp/library/web/retry/F-366/img/p007.png', pdf_page=7, printed='5', quote='He appears to have received only $15, out of $1,028', excerpt=None, corrections=None,
                      note='the page image was looked at (130 dpi view): the sentence reads "He appears to have received only $15, out of $1,028 requested" (the footnote number 8 stands between "$1,028" and "requested"); the machine reading agrees', **BR)]
    emit([('E', 'R14.S-063')], 'brien-study-image-check',
         'R14.S-063.3, read from the page images of the 1972 study (printed pp. 5 and 134): "194 panels of fence--part post and rail and part worm - worth $174; stone fence destroyed worth $5.00" and "He appears to have received only $15, out of $1,028 requested"',
         'documented', c, 'supports_sub_claim',
         'This closes the page-image check that fence-3 L8 owed (pdftoppm was not installed then): the figures fence-3 used (194 panels, $174, $15 of $1,028) are right and the PDF\'s embedded text layer, which reads 195 panels and $175 and "$15>, out of $1,028 g", is wrong. The NPS web page on the Brian farm agrees on 194 panels but prints the claim total as $575 (line WLK2-brien-nps): the two NPS texts differ on the amount claimed and both stand as printed, no default. Only the two pages named were re-read from images; the rest of the study keeps the machine reading fence-3 used.',
         '1863-07 (claim of the 1870s)', ['LKR-fence-3-L8', 'LKR-fence-3-L54', 'LKR-BH-fence-3-R14.S-063#bh0', 'LKR-BH-fence-3-R14.S-063#bh1'], 'official National Park Service study (1972) reading the claim files; digits checked against the page images in this pass')


def merge():
    def keep(path):
        return [json.loads(l) for l in open(path) if l.strip()]
    for base, new, out in ((BASE_E, LINES_E, OUT_E), (BASE_T, LINES_T, OUT_T)):
        rows = keep(base) + new
        seen = set()
        for r in rows:
            if r['xid'] in seen:
                raise SystemExit('duplicate xid ' + r['xid'])
            seen.add(r['xid'])
        with open(out, 'w') as f:
            for r in rows:
                f.write(json.dumps(r, ensure_ascii=False, sort_keys=True) + '\n')
        print('wrote', os.path.relpath(out, rlib.ROOT), len(rows), 'lines (%d base + %d new)' % (len(rows) - len(new), len(new)))
    json.dump(INDEXD, open(INDEX, 'w'), indent=1, sort_keys=True)


if __name__ == '__main__':
    build()
    if FAILS:
        for p_, q_ in FAILS:
            print('QUOTE NOT FOUND in %s: %r' % (p_, q_[:160]))
        raise SystemExit(1)
    merge()
