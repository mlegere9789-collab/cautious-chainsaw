"""Ledger E claims: III Corps, 2nd Division (Humphreys). 26th PA (Pennsylvania at Gettysburg 1914 vol. 1, PA1B-S003 pp. 195-199, address
of Private Thomas V. Cooper of the regiment: documented), 84th PA (PA1B-S027 pp. 466-479; the speaker's own statement and the letter of
Brig. Gen. Joseph B. Carr, the brigade commander, printed in the section: documented), and the Excelsior regiments (New York at
Gettysburg vol. 2, NY2-S008..S012, monument inscriptions pp. 572-576: documented as inscriptions). Full sections read 2026-10-30."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from positions_E_lib import add

# ---------------- 26th Pennsylvania (Carr's First Brigade)
S = 'PA1B-S003'; U = 'us-3c-2d-carr-26pa'
CO = 'Private Thomas V. Cooper (26th Pennsylvania; dedication address)'
add(U, 'march', 'On July 1st; 30th at Bridgeport (Taneytown the day before)', 'from Bridgeport via Emmitsburg to the field of battle', 'On July 1 the 26th Pennsylvania moved from Bridgeport via Emmitsburg to the field of battle; the preceding day (the 30th) it was at Bridgeport.',
    'PA1B', S, "On July 1st we moved from Bridgeport via Emmitsburg to the field of battle", 'documented', author=CO, date='1863-07-01', road='via Emmitsburg', gaz='GZ-041',
    extra_quote="the 30th at Bridge- port, with ever-coming news of skirmishes", note="Bridgeport (Md.) and Emmitsburg are outside the gazetteer. 'Via Emmitsburg' with the final approach on the 'right road to Gettysburg' (below).",
    conflicts=['POS-A-RG2-001'] if False else [])
add(U, 'arrival_road', 'late in the night (July 1); at the midnight closing the first and opening the second day', "into the Confederate lines near the Black Horse Tavern; then about-face and 'the right road to Gettysburg'", "While the First Brigade was en route late at night on July 1 with the 26th Pennsylvania at the head of the column, it marched into the Confederate lines near the Black Horse Tavern, quietly gathered in the only picket post in sight, about-faced in silence and resumed the right road to Gettysburg, arriving at the midnight closing the first and opening the second day.",
    'PA1B', S, "we marched into the Confederate lines near the Black Horse Tavern", 'documented', author=CO, t_iso='1863-07-02T00:00', date='1863-07-02', approx=True, gaz='GZ-051', road='the road passing the Black Horse Tavern, then back to the right road to Gettysburg',
    extra_quote="resumed the right road to Gettysburg, in time to assume our place upon the second",
    note="ROAD OF APPROACH PRINTED for the First Brigade (Carr): the column strayed onto the Black Horse Tavern road (gazetteer Black Horse Tavern Road GZ-051, which does not cross the loaded ground, audit reason road_outside_ground) and turned back to 'the right road to Gettysburg' (not named). Arrival at midnight July 1-2; the printed 'midnight' is the speaker's phrase, no clock time. Humphreys' division route per the OR (ledger A) is to be compared.")
add(U, 'position', '(early morning, July 2)', 'between the Baltimore pike and the Emmitsburg road: unarmed skirmishers pulled down the fences', 'After arriving at midnight and a nap, the command was awakened, stacked arms, deployed as unarmed skirmishers and tore down the fences between the Baltimore pike and the Emmitsburg road.',
    'PA1B', S, "tore down the fences between the Baltimore pike and the Emmitsburg road", 'documented', author=CO, date='1863-07-02', gaz='GZ-041',
    note="Fence removal is a documented July 2 action (fences between the Baltimore pike and the Emmitsburg road) relevant to the terrain model.")
add(U, 'position', 'About 3 p. m. (July 2)', 'the Peach Orchard: the brigade at the Peach Orchard, the regiment covering the right flank of the division, separated from the Second Corps by a gap', "About 3 p. m. the Third Corps moved to the front with the brigade at the Peach Orchard and the 26th Pennsylvania covering the right flank of the division, separated from Hancock's Second Corps by a gap in which repeated enemy attempts were made to pierce the line.",
    'PA1B', S, "About 3 p. m., our Third Corps moved to the front, with our brigade at the celebrated Peach Orchard", 'documented', author=CO, t_iso='1863-07-02T15:00', date='1863-07-02', approx=True,
    note="Wording is the speaker's: the brigade at the Peach Orchard (Humphreys' division stood on the Emmitsburg road north of the Peach Orchard in the OR; compare ledger A). The 26th held the right of the line.")
add(U, 'engagement', 'late in the evening (July 2)', 'the Peach Orchard flank: the depression at the right of the little stone house; the regiment and the 1st Massachusetts changed direction by the right flank', "Late in the evening of July 2 a large rebel force crossed the Emmitsburg road under cover of smoke and, sheltered by the depression right of the little stone house flanking the Peach Orchard, rushed the depleted ranks; the 26th Pennsylvania and the 1st Massachusetts changed direction by the right flank at the order of Colonel Blaisdell and Major Bodine, checking the charge until a Second Corps division came to the relief.",
    'PA1B', S, "obeyed the order of Colonel Blaisdell and Major Bodine, and changed di- rection by the right flank", 'documented', author=CO, date='1863-07-02', gaz='GZ-041')
add('us-3c-2d-carr-1ma', 'engagement', 'late in the evening (July 2)', 'the Peach Orchard flank, alongside the 26th Pennsylvania', 'The 1st Massachusetts and the 26th Pennsylvania changed direction by the right flank in the face of the charge late on July 2 (Cooper, 26th PA).',
    'PA1B', S, "Then the Twenty-sixth and the First Massachusetts, our gallant Yankee companions", 'inferred', author=CO, date='1863-07-02', reasoning='Stated by a private of a sister regiment.')
add(U, 'engagement', 'upon the third day', 'the right of the line of Humphreys\' division (third day, as stated)', "The speaker says the shock that fell on Humphreys' division, particularly on Carr's First Brigade and on the 26th Pennsylvania which held the right of the line, exceeded any on Pickett's front, Little Round Top, Culp's Hill or Buford's front; the regiment led all Pennsylvania regiments in killed and wounded.",
    'PA1B', S, "it was upon the third day, but neither this point nor Little Round Top", 'documented', author=CO, date='1863-07-02', ocr_uncertain=False,
    note="The sentence says 'upon the third day' but the context (the Peach Orchard attack on Humphreys' division) is July 2; the speaker's date is kept as printed and the claim is dated July 2 by the surrounding narrative. Conflict of date inside the source is recorded here.")

# ---------------- 84th Pennsylvania
S = 'PA1B-S027'; U = 'us-3c-2d-carr-84pa'
CA = 'Brig. Gen. Joseph B. Carr (First Brigade commander); letter printed in the address of the 84th Pennsylvania'
OP = "the 84th Pennsylvania's dedication statement (speaker's own first-person text)"
add(U, 'night_position', 'On the night of June 30', 'Taneytown (order detailing the regiment to guard the supply train)', 'On the night of June 30, at Taneytown, the order came detailing the 84th Pennsylvania to guard the supply train; Colonel Opp asked the brigade commander to revoke it without success.',
    'PA1B', S, "On the night of June 30, at Taneytown, came the oi'der detailing the regiment to guard the supply train", 'documented', author=OP, date='1863-06-30', approx=False, ocr_uncertain=True,
    note='OCR "oi\'der". Taneytown is outside the gazetteer. Hour not printed.')
add(U, 'march', 'July 1', 'with the train moving with the column from Taneytown on the road to Emmitsburg; the order came for the supply trains to report at Westminster', 'July 1 the regiment started with the supply train, then moving with the column from Taneytown on the road to Emmitsburg; word of the fight at Gettysburg came on the way, followed by the order for the supply trains to report at Westminster.',
    'PA1B', S, "started with the train, which was then moving with the column from Taneytown on the road to Emmitsburg", 'documented', author=OP, date='1863-07-01', road='from Taneytown on the road to Emmitsburg',
    extra_quote="Immediately following this announcement came the order for the supply trains to report at West- minster", conflicts=[],
    note='The regiment was not on the battlefield in the 84th Pennsylvania account: it guarded the trains.')
add(U, 'position', 'On the morning of the 1st of July until the 6th of July', 'guarding the supply train located between Emmitsburg and Gettysburg (per Carr); with the train until relieved on July 6, when it reported to Carr at Williamsport', "Carr's letter: on the morning of July 1 the regiment was detailed by an order from headquarters to guard the supply train then located between Emmitsburg and Gettysburg and remained on duty with the train until relieved by another regiment on July 6, when it reported to him at Williamsport; the monument was placed near Carr's headquarters before the second day's engagement, near the Emmitsburg road directly in front of the Rogers house.",
    'PA1B', S, "to guard the supply train that was then located between Emmitsburg and Gettj'sburg", 'documented', author=CA, date='1863-07-01', gaz='GZ-041',
    extra_quote="The regiment remained on duty with the train until relieved by another regiment, on the 6th July", conflicts=[],
    note="MAJOR FINDING: both the regiment's statement and its brigade commander's letter place the 84th Pennsylvania with the supply train on July 1-6, NOT in the line of battle; the supply trains were ordered to report at Westminster. The regiment's presence on the field on July 2-3 (and the 84th PA's figures and drawing in the Battle Theatre) is not supported by this source and conflicts with the roster treatment of the 84th as on the field. Carried as a conflict for the Decision Log; no default chosen.")

# ---------------- Excelsior regiments (Brewster): inscriptions
for u, sec, lbl, quote, extra in [
    ('us-3c-2d-brewster-70ny', 'NY2-S008', '70th New York (1st Excelsior)', "supported Carr's Bri- jjauk in hksistinc the assault of the enemy along the LINK OF the Emmitsburg Road", None),
    ('us-3c-2d-brewster-72ny', 'NY2-S010', '72nd New York (3rd Excelsior)', "SUPl'ORTED CaRR's BRI- GADE IN RESISTING THE ASSAULT OF THE ENEMY ALONG THE LINE OF THE EmMITSBURG RoAD", "On JuLY 3, SUPPORTED THE left centre of the army"),
    ('us-3c-2d-brewster-74ny', 'NY2-S012', '74th New York (5th Excelsior)', "THE BRIGADE OF WHICH THIS REGIMENT FORMED A PART SUPPORTED CaRR's BRI- GADE IN RESISTING", "On JuLY 3D, SUPPORTED THE LEFT centre of the army"),
]:
    add(u, 'position', 'On the afternoon of the 2d of July, 1863 (inscription)', 'the line of the Emmitsburg Road, in support of Carr\'s brigade', 'Inscription: on the afternoon of July 2 the Excelsior brigade, of which the %s was a part, supported Carr\'s brigade in resisting the assault of the enemy along the line of the Emmitsburg Road.' % lbl,
        'NY2', sec, quote, 'documented', author='monument inscription (as printed by the commission)', date='1863-07-02', gaz='GZ-041', road='the line of the Emmitsburg Road', ocr_uncertain=True,
        extra_quote=extra, note='OCR of the inscription capitals is partly damaged ("LINK" for line, "jjauk" for gade); the sense is legible. Inscription text is the commission\'s record of what the monument says, not a first-hand narrative.')
    add(u, 'position', 'On July 3 (inscription)', 'supporting the left centre of the army', 'Inscription: on July 3 the regiment supported the left centre of the army.',
        'NY2', sec, "On JuLY 3D, SUPPORTED THE LEFT centre of the army" if sec == 'NY2-S012' else "SUPPORTED THE left centre of the army", 'documented', author='monument inscription', date='1863-07-03') if sec != 'NY2-S008' else None
add('us-3c-2d-brewster-73ny', 'movement', 'July 2, 1863 (inscription)', 'the Peach Orchard: detached to support General Graham\'s brigade, heavily attacked by McLaws\' division', "Inscription: July 2, 1863, this regiment was detached to support General Graham's brigade at the Peach Orchard, heavily attacked by McLaws' division; July 3 it supported the left centre of the army.",
    'NY2', 'NY2-S011', "this regiment was detached to support General Graham's Brigade at the Peach Orchard", 'documented', author='monument inscription', date='1863-07-02', conflicts=['POS-E-US-3C-2D-BREWSTER-73NY-001'],
    extra_quote="On JuLY 3, SUPPORTED THE LEFT CENTRE of the army", ocr_uncertain=True)
print('done 3c_a')
