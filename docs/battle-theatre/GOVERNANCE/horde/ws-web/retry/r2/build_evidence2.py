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

SHARD = 'web-lookups'
RETRIEVED = '2026-11-16'
OUT_E = os.path.join(rlib.GOV, 'evidence_corrections', 'web-lookups.jsonl')
OUT_T = os.path.join(rlib.GOV, 'timeline_corrections', 'web-lookups.jsonl')
BASE_E = os.path.join(HERE, 'base_E.jsonl')
BASE_T = os.path.join(HERE, 'base_T.jsonl')
INDEX = os.path.join(HERE, 'evidence2_index.json')
LINES_E, LINES_T, INDEXD, FAILS = [], [], {}, []
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
