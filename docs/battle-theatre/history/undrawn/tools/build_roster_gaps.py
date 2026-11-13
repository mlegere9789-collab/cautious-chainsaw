"""Units printed in the Official Records' organization tables that the roster (history/units.json, built from the plan's B.3) lacks,
splits wrongly or lists with another status. Writes docs/battle-theatre/history/undrawn/roster-gaps.json.

    python3 -I docs/battle-theatre/history/undrawn/tools/build_roster_gaps.py

Every entry is FOUND BY CODE in the raw text of OR Ser. I vol. 27 (the Union table: OR27-1-R009, pp. 155-168; the Confederate
table: OR27-2-R424, pp. 283-291): the pattern below locates the line, the quote is the matched text as the OCR prints it (at most
14 words), with its character offsets and the printed page of the page model. Nothing is typed in from memory: a pattern that
finds nothing is listed under `not_found`. The OCR misreads digits often (2 as 3, 1 as I): `ocr_uncertain` marks the lines where
the unit number in the quote is in doubt; the proposed id then avoids the number where it can.
The list is a READING AID for the researchers (it pre-assigns the ids of units to be added, so that two groups never invent two
ids for one unit); the researcher of the group confirms each line in a `unit` record of the group file.
"""
import os, re, sys, json
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..', '..'))
sys.path.insert(0, os.path.join(ROOT, 'tools', 'bt'))
import or27_find as F

US, CS = ('OR27-1-R009', 1), ('OR27-2-R424', 2)
# (proposed id, parent, group, action, name, level, arm, pattern, note[, ocr_uncertain])
# action: add = a unit the roster lacks; absent = printed in the table with a footnote that it was not engaged / not on the field;
#         attached = attached to another unit (no figures of its own unless a source gives them); merge = the roster splits one
#         consolidated battery into two units; fix = a roster entry whose structure hides the unit; status = a roster status to confirm
E = []
def u(*a, **k): E.append(dict(zip(('id', 'parent', 'group', 'action', 'name', 'level', 'arm', 'pattern', 'note'), a), table=US, **k))
def c(*a, **k): E.append(dict(zip(('id', 'parent', 'group', 'action', 'name', 'level', 'arm', 'pattern', 'note'), a), table=CS, **k))

# ---- Army of the Potomac: general headquarters
u('us-aop-hq-93ny', 'us-aop-hq', 'us-hq-artres', 'absent', '93d New York (Provost Marshal General)', 'regiment', 'infantry', r'93d New York \* Col\. John S\. Crocker', 'footnote * of the page: "Not engaged"; where the regiment stood is to be established')
u('us-aop-hq-8us', 'us-aop-hq', 'us-hq-artres', 'absent', '8th United States, eight companies (Provost Marshal General)', 'regiment', 'infantry', r'8th United States \(eight companies\),\* Capt\. Edwin W\. H\. Read', 'footnote * of the page: "Not engaged"')
u('us-aop-hq-pacav-price', 'us-aop-hq', 'us-hq-artres', 'add', 'Pennsylvania Cavalry regiment of Col. R. Butler Price (Provost Marshal General)', 'regiment', 'cavalry', r'\S+ Pennsylvania Cavalry, Col\. R\. Butler Price', 'the OCR prints the number as 3d; the 3d Pennsylvania Cavalry is printed again under McIntosh in the same table, so the digit is in doubt', ocr_uncertain=True)
u('us-aop-hq-6pacav-e-i', 'us-aop-hq', 'us-hq-artres', 'add', '6th Pennsylvania Cavalry, Companies E and I (Provost Marshal General)', 'company', 'cavalry', r'6th Pennsylvania Cavalry, Companies E and I, Capt\. James Starr', '')
u('us-aop-hq-regular-cav-det', 'us-aop-hq', 'us-hq-artres', 'add', 'Regular cavalry detachments (Provost Marshal General)', 'company', 'cavalry', r'Regular cavalry \(detachments from \S+ 2d, 5th, and 6th Regiments\)', '')
u('us-aop-hq-signal', 'us-aop-hq', 'us-hq-artres', 'add', 'Signal Corps (Capt. Lemuel B. Norton)', 'company', 'staff', r'SIGNAL CORPS\. Capt\. Lemuel B\. Norton', 'signal stations: reports OR27-1-R017 to R027')
u('us-aop-hq-oneida-cav', 'us-aop-hq', 'us-hq-artres', 'add', 'Oneida (New York) Cavalry (guards and orderlies)', 'company', 'cavalry', r'Oneida \(New York\) Cavalry, Capt\. Daniel P\. Mann', '')
u('us-aop-engineers-15ny', 'us-aop', 'us-hq-artres', 'absent', '15th New York Engineers, three companies (Engineer Brigade)', 'battalion', 'infantry', r'15th New York \(three companies\), Maj\. Walter L\. Cassin', 'footnote of the Engineer Brigade: not engaged, ordered to Washington')
u('us-aop-engineers-50ny', 'us-aop', 'us-hq-artres', 'absent', '50th New York Engineers (Engineer Brigade)', 'regiment', 'infantry', r'50th New York, Col\. William H\. Pettes', 'footnote of the Engineer Brigade: not engaged, ordered to Washington')
u('us-aop-engineers-usbn', 'us-aop', 'us-hq-artres', 'absent', 'United States Engineer Battalion (Engineer Brigade)', 'battalion', 'infantry', r'United States Battalion, Capt\. George H\. Mende\S+', 'the footnote excepts the regular battalion from the order to Washington; where it was is to be established')
u('us-aop-engineers', 'us-aop', 'us-hq-artres', 'absent', 'Engineer Brigade (footnote)', 'brigade', 'infantry', r'Not engaged\. With exception of the regular battalion, it was, July 1,', 'the footnote that carries the status of the three engineer units')
# ---- I Corps
u('us-1c-hq-1mecav-l', 'us-1c', 'us-1c', 'add', '1st Maine Cavalry, Company L (I Corps headquarters)', 'company', 'cavalry', r'1st Maine Cavalry, Company L, Capt\. Constantine Taylor', '')
u('us-1c-3d-stannard-12vt', 'us-1c-3d-stannard', 'us-1c', 'absent', '12th Vermont (Stannard)', 'regiment', 'infantry', r'\S+ Vermont\.t Col\. Asa P\. Blunt', 'the OCR prints the number as 13th (the 13th Vermont, Col. Randall, follows on the next line); footnote: guarding trains, and not engaged in the battle', ocr_uncertain=True)
u('us-1c-3d-stannard-15vt', 'us-1c-3d-stannard', 'us-1c', 'absent', '15th Vermont (Stannard)', 'regiment', 'infantry', r'15th Vermont,\S Col\. Red\S+ Proctor', 'footnote: guarding trains, and not engaged in the battle')
u('us-1c-3d-stannard', 'us-1c-3d', 'us-1c', 'absent', 'footnote of the two Vermont regiments', 'brigade', 'infantry', r'Guarding trains, and not engaged in the battle', 'the footnote that carries the status of the 12th and 15th Vermont')
u('us-1c-2d-baxter-11pa', 'us-1c-2d-baxter', 'us-1c', 'status', '11th Pennsylvania: transferred to the First Brigade on the afternoon of 1 July', 'regiment', 'infantry', r'Transferred, in afternoon of July 1, to the First Brigade', 'the roster keeps it under Baxter for the whole battle: its positions after the transfer follow Paul\'s brigade')
# ---- II Corps
u('us-2c-hq-6nycav-d-k', 'us-2c', 'us-2c', 'add', '6th New York Cavalry, Companies D and K (II Corps headquarters)', 'company', 'cavalry', r'6th New York Cavalry, Companies D and K, Capt\. Riley Johnson', '')
u('us-2c-2d-harrow-mnss-co', 'us-2c-2d-harrow', 'us-2c', 'attached', 'Company of Minnesota Sharpshooters attached to the 1st Minnesota', 'company', 'infantry', r'\S+ Company Minnesota Sharpshooters attached', 'the OCR prints the company number as 3d', ocr_uncertain=True)
u('us-2c-art-14ny', 'us-2c-art', 'us-2c', 'attached', '14th New York Battery, attached to Battery B, 1st New York Light', 'battery', 'artillery', r'Transferred from Arti\S+ Reserve, July 1; 14th New York Battery attached', 'the same footnote says Battery B came from the Artillery Reserve on 1 July')
# ---- V Corps
u('us-5c-hq-12ny-d-e', 'us-5c', 'us-5c', 'add', '12th New York Infantry, Companies D and E (V Corps headquarters)', 'company', 'infantry', r'12th New York Infantry, Companies D and E, Capt\. Henry W\. Rider', '')
u('us-5c-hq-17pacav-d-h', 'us-5c', 'us-5c', 'add', '17th Pennsylvania Cavalry, Companies D and H (V Corps headquarters)', 'company', 'cavalry', r'17th Pennsylvania Cavalry, Companies D and H, Capt\. William Thompson', '')
u('us-5c-1d-sweitzer-32ma', 'us-5c-1d-sweitzer', 'us-5c', 'fix', '32d Massachusetts (Sweitzer): the regiment less Company C', 'regiment', 'infantry', r'\S+ Massachusetts, Col\. G\. L\. Prescott', 'the roster holds the regiment as a formation whose only child (Company C) is not on the field, so the layer draws nothing of it; the OCR prints the number as 33d', ocr_uncertain=True)
# ---- VI Corps
u('us-6c-hq-1njcav-l', 'us-6c', 'us-6c', 'add', '1st New Jersey Cavalry, Company L (VI Corps headquarters)', 'company', 'cavalry', r'1st New Jersey Cavalry, Company L,', '')
u('us-6c-hq-1pacav-h', 'us-6c', 'us-6c', 'add', '1st Pennsylvania Cavalry, Company H (VI Corps headquarters)', 'company', 'cavalry', r'\S+ Pennsylvania Cavalry, Company H,', 'the OCR damages the regiment number', ocr_uncertain=True)
u('us-6c-1d-provost-4nj', 'us-6c-1d', 'us-6c', 'add', '4th New Jersey, three companies (provost guard, First Division)', 'battalion', 'infantry', r'4th New Jersey \(three companies\), Capt\. William R\. Maxwell', 'the other seven companies are the train guard of the Artillery Reserve')
u('us-6c-3d-wheaton-102pa', 'us-6c-3d-wheaton', 'us-6c', 'absent', '102d Pennsylvania (Wheaton)', 'regiment', 'infantry', r'\S+ Penn\S+ Col\. John W\. Patterson', 'the OCR damages the number and the footnote (guarding wagon train at Westminster, and not engaged in the battle)', ocr_uncertain=True)
u('us-6c-2d', 'us-6c', 'us-6c', 'status', 'Second Division: no First Brigade in the division', 'division', 'infantry', r'\S+ First Brigade in division', 'the roster lists us-6c-2d-1brig (a First Brigade under Howe) as never on the field; the footnote of the table says the division had none', ocr_uncertain=True)
# ---- XI Corps
u('us-11c-hq-1incav-i-k', 'us-11c', 'us-11c-1d-2d', 'add', '1st Indiana Cavalry, Companies I and K (XI Corps headquarters)', 'company', 'cavalry', r'1st Indiana Cava\S+ Companies I and K, Capt\. Abram Sharra', '')
u('us-11c-hq-8ny-co', 'us-11c', 'us-11c-1d-2d', 'add', '8th New York Infantry, one company (XI Corps headquarters)', 'company', 'infantry', r'8th New York Infantry \(one company\), Lieut\. Hermann Foerster', '')
# ---- XII Corps
u('us-12c-provost-10me', 'us-12c', 'us-12c', 'add', '10th Maine, four companies (provost guard, XII Corps)', 'battalion', 'infantry', r'10th Maine \(four companies\), Capt\.? John D\. Beardsley', '')
u('us-12c-1d-lockwood', 'us-12c-1d', 'us-12c', 'status', 'Lockwood\'s brigade: unassigned during the battle', 'brigade', 'infantry', r'Unassigned during prog\S+ of battle; afterward attached to Fir\S+ Division', 'the roster puts the brigade in the First Division for the whole battle')
# ---- Cavalry Corps
u('us-cav-2d-hq-1oh-a', 'us-cav-2d', 'us-cav-2d-art', 'add', '1st Ohio Cavalry, Company A (headquarters guard, Second Cavalry Division)', 'company', 'cavalry', r'1st Ohio, Company A, Capt\. Noah Jones', '')
u('us-cav-2d-mcintosh-purnell-a', 'us-cav-2d-mcintosh', 'us-cav-2d-art', 'add', 'Purnell (Maryland) Legion, Company A (McIntosh)', 'company', 'cavalry', r'Pu\S+ \(Maryland\) Legion, Company A,', '')
u('us-cav-2d-mcintosh-3paheavy-h', 'us-cav-2d-mcintosh', 'us-cav-2d-art', 'add', '3d Pennsylvania Heavy Artillery, section of Battery H, serving as light artillery (McIntosh)', 'battery', 'artillery', r'3d Pennsylvania Heavy Artillery, Section Battery H,t Capt\. W\. D\. Rank', 'footnote: serving as light artillery')
u('us-cav-2d-mcintosh-1ma', 'us-cav-2d-mcintosh', 'us-cav-2d-art', 'status', '1st Massachusetts Cavalry: served with the Sixth Corps and on the right flank', 'regiment', 'cavalry', r'Served with the Sixth Army Corps, and on the right flank', 'the layer places it with McIntosh\'s brigade')
u('us-cav-2d-huey', 'us-cav-2d', 'us-cav-2d-art', 'status', 'Huey\'s brigade: at Westminster, not engaged', 'brigade', 'cavalry', r'At We\S+ etc\., and not engaged in the battle', 'a non-lead source for the roster status never_on_field (the plan cites a weak key)', ocr_uncertain=True)
u('us-cav-3d-hq-1oh-c', 'us-cav-3d', 'us-cav-3d', 'add', '1st Ohio Cavalry, Company C (headquarters guard, Third Cavalry Division)', 'company', 'cavalry', r'1st Ohio, Company C, Capt\. Samuel N\. Stanford', '')
u('us-cav-art-9mi', 'us-cav-art', 'us-cav-2d-art', 'add', '9th Michigan Battery (horse artillery, First Brigade)', 'battery', 'artillery', r'9th Michigan Battery, Capt\. Jabez J\. Daniels', '')
u('us-cav-art-6ny', 'us-cav-art', 'us-cav-2d-art', 'add', '6th New York Battery (horse artillery, First Brigade)', 'battery', 'artillery', r'\S+ New York Battery, Capt\. Joseph W\. Martin', 'the OCR prints the number as Cth', ocr_uncertain=True)
u('us-cav-art-2usbl', 'us-cav-art', 'us-cav-2d-art', 'add', '2d United States, Batteries B and L (horse artillery, First Brigade)', 'battery', 'artillery', r'2d United States, Batteries B and L,', 'one consolidated battery')
u('us-cav-art-2usm', 'us-cav-art', 'us-cav-2d-art', 'add', '2d United States, Battery M (horse artillery, First Brigade)', 'battery', 'artillery', r'2d United States, Battery M, Lieut\. A\. C\. M\. Pennington, jr', '')
u('us-cav-art-4use', 'us-cav-art', 'us-cav-2d-art', 'add', '4th United States, Battery E (horse artillery, First Brigade)', 'battery', 'artillery', r'4th United States, Battery E, Lieut\. Samuel S\. Elder', '')
u('us-cav-art-1useg', 'us-cav-art', 'us-cav-2d-art', 'add', '1st United States, Batteries E and G (horse artillery, Second Brigade)', 'battery', 'artillery', r'1st United States, Batteries E and G,', 'one consolidated battery')
u('us-cav-art-1usk', 'us-cav-art', 'us-cav-2d-art', 'add', '1st United States, Battery K (horse artillery, Second Brigade)', 'battery', 'artillery', r'1st United States, Battery K, Capt\. William M\. Graham', '')
u('us-cav-art-2usa', 'us-cav-art', 'us-cav-2d-art', 'add', '2d United States, Battery A (horse artillery, Second Brigade)', 'battery', 'artillery', r'2d United States, Battery A, Lieut\. John H\. Calef', '')
u('us-cav-art-3usc', 'us-cav-art', 'us-cav-2d-art', 'absent', '3d United States, Battery C (horse artillery, Second Brigade)', 'battery', 'artillery', r'3d United States, Battery C, Lieut\. William D\. Fuller', 'footnote: with Huey\'s Cavalry Brigade, and not engaged in the battle')
u('us-cav-art', 'us-cav', 'us-cav-2d-art', 'absent', 'footnote of Battery C, 3d United States', 'artillery_brigade', 'artillery', r"With Huey's Cavalry Brigade, and not engaged in the battle", 'the footnote that carries the status of Battery C')
# ---- Artillery Reserve
u('us-5c-1d-sweitzer-32ma-co-c', 'us-art-reserve', 'us-hq-artres', 'status', '32d Massachusetts Infantry, Company C (headquarters guard, Artillery Reserve)', 'company', 'infantry', r'32d Massachusetts Infantry, Company C, Capt\. Josiah C\. Fuller', 'the roster lists it as never on the field; the table prints it as the headquarters guard of the Artillery Reserve, which was on the field')
u('us-4nj-train-guard', 'us-art-reserve', 'us-hq-artres', 'status', '4th New Jersey Infantry, seven companies (train guard, Artillery Reserve)', 'battalion', 'infantry', r'4th New Jersey Infantry \(seven companies\), Maj\. Charles Ewing', 'the roster lists it as never on the field; where the train stood is to be established')
u('us-art-reserve-ransom-3usfk', 'us-art-reserve-ransom', 'us-hq-artres', 'merge', '3d United States, Batteries F and K: one consolidated battery', 'battery', 'artillery', r'3d United States, Batteries F and K,', 'the roster draws us-art-reserve-ransom-3usf and -3usk as two batteries with a full share each', merge_of=['us-art-reserve-ransom-3usf', 'us-art-reserve-ransom-3usk'])
u('us-art-reserve-mcgilvery-pacf', 'us-art-reserve-mcgilvery', 'us-hq-artres', 'merge', 'Pennsylvania Light, Batteries C and F: one consolidated battery', 'battery', 'artillery', r'Pennsylvania Li\S+ Batteries C and F,', 'the roster draws us-art-reserve-mcgilvery-pac and -paf as two batteries', merge_of=['us-art-reserve-mcgilvery-pac', 'us-art-reserve-mcgilvery-paf'])
u('us-art-reserve-huntington-1pafg', 'us-art-reserve-huntington', 'us-hq-artres', 'merge', '1st Pennsylvania Light, Batteries F and G: one consolidated battery', 'battery', 'artillery', r'1st Pennsylvania Light, Batteries F and \S+ Capt\. R\. Bruce \S+', 'the roster draws us-art-reserve-huntington-1paf and -1pag as two batteries', merge_of=['us-art-reserve-huntington-1paf', 'us-art-reserve-huntington-1pag'])
u('us-art-reserve-mcgilvery-10ny', 'us-art-reserve-mcgilvery', 'us-hq-artres', 'attached', '10th New York Battery, attached to the 5th Massachusetts Battery', 'battery', 'artillery', r'10th New York Battery attached', '')
u('us-art-reserve-taft-1ctheavy-b', 'us-art-reserve-taft-1ctheavy', 'us-hq-artres', 'status', '1st Connecticut Heavy, Battery B', 'battery', 'artillery', r'1st \S+ Heavy, Battery B,\* Capt\. Albert F\. Brooker', 'the footnote * of page 168 is lost in the OCR; the roster status never_on_field rests on a weak key')
u('us-1c-art-1nye', 'us-1c-art', 'us-1c', 'status', 'Battery E, 1st New York Light, attached to Battery L', 'battery', 'artillery', r'Battery E, 1st New York Light Artillery, attached', 'the roster draws Battery E as a separate battery with a full share')

# ---- Army of Northern Virginia
c('cs-2c-escort-randolph', 'cs-2c', 'cs-2c-early', 'add', "Randolph's Company Virginia Cavalry (escort, Second Corps)", 'company', 'cavalry', r"Randolph's Company Virginia Cavalry, Capt\. William F\. Randolph", '')
def bat(parent, group, rows):
    for slug, name, pat in rows: c(parent + '-' + slug, parent, group, 'add', name, 'battery', 'artillery', pat, 'the roster holds the battalion as one unit; the table prints its batteries')
bat('cs-1c-mclaws-cabell', 'cs-1c-mclaws', [
    ('1ncarta', '1st North Carolina Artillery, Battery A (Manly)', r'\S+ Carolina Artillery, Battery A, Capt,? B,? C\. Manly'),
    ('pulaskiga', 'Pulaski (Georgia) Artillery', r'Pulaski \(Geor\S+ Artillery'),
    ('1richmondhowitzers', '1st Richmond Howitzers (McCarthy)', r'\S+ \S+ \S+, \( ?a\) ?it, E, S\. McCarthy|Richmond How\S+, \S+ E[.,] S\. McCarthy'),
    ('troupga', 'Troup (Georgia) Artillery', r'Troup \(Ge\S+\) Artill\S+')])
bat('cs-1c-pickett-dearing', 'cs-1c-pickett', [
    ('fauquier', 'Fauquier (Virginia) Artillery (Stribling)', r'Fauquier \(Virginia\) Artillery, Capt\. R\. M\. Stribling'),
    ('hampden', 'Hampden (Virginia) Artillery (Caskie)', r'Hampden \(+Virginia\) Artillery, ?Capt\. W\. H\. C\S+'),
    ('richmondfayette', 'Richmond Fayette Artillery (Macon)', r'Richmond Fayette Artillery, Capt\. M\. ?C\. Macon'),
    ('blount', 'Virginia Battery (Blount)', r'Virginia Battery, Capt\. Joseph G\. Blount')])
bat('cs-1c-hood-henry', 'cs-1c-hood-resart', [
    ('branchnc', 'Branch (North Carolina) Artillery (Latham)', r'Branch \(North Carolina\) Artillery, Capt\. A\. C\. Latham'),
    ('germansc', 'German (South Carolina) Artillery (Bachman)', r'German \(South Carolina\) Artillery, Capt\. William K\. Bachman'),
    ('palmettosc', 'Palmetto (South Carolina) Light Artillery (Garden)', r'Palmetto \(South Carolina\) Light Artillery, Capt\. Hugh R\. Garden'),
    ('rowannc', 'Rowan (North Carolina) Artillery (Reilly)', r'Rowan \(North Carolina\) Artillery, Capt\. James Reilly')])
bat('cs-1c-res-art-washington', 'cs-1c-hood-resart', [
    ('1co', 'Washington Artillery, First Company (Squires)', r'First Company, Capt\. C\. W\. Squi\S+ ?\S*'),
    ('2co', 'Washington Artillery, Second Company (Richardson)', r'Second Compa\S+ ?\S*, Capt\. J[.,] B\. Richardson'),
    ('3co', 'Washington Artillery, Third Company (Miller)', r'Third Company, Capt\. M\. B\. Miller'),
    ('4co', 'Washington Artillery, Fourth Company (Norcom)', r'Fourth Company : Capt\. Joe Norcom')])
bat('cs-2c-early-jones', 'cs-2c-early', [
    ('charlottesville', 'Charlottesville (Virginia) Artillery (Carrington)', r'Charlottesville \(Virginia\) Artillery, Capt\. James McD\. Carrington'),
    ('courtney', 'Courtney (Virginia) Artillery (Tanner)', r'Courtney \(Virginia\) Artillery[.,] Capt\. W\. A\. Tanner'),
    ('louisianaguard', 'Louisiana Guard Artillery (Green)', r'Louisiana G\S+ Artillery[.,] Capt\. C\. A\. Green'),
    ('staunton', 'Staunton (Virginia) Artillery (Garber)', r'Staunton \(Virginia\) Artillery, Capt\. A\. W\. Garber')])
bat('cs-2c-johnson-andrews', 'cs-2c-johnson', [
    ('1mdbattery', '1st Maryland Battery (Dement)', r'1st Maryland Battery[.,] Capt\. William F\. Dement'),
    ('alleghany', 'Alleghany (Virginia) Artillery (Carpenter)', r'Alleghany \(Virginia\) Artillery, Capt\. J\. C\. Carpenter'),
    ('chesapeake', 'Chesapeake (Maryland) Artillery (Brown)', r'Chesapeake \(Ma\S+\) Artillery, Capt\. William D\. Brown'),
    ('lee', 'Lee (Virginia) Battery (Raine)', r'Lee \(Virginia\) Battery ?:')])
bat('cs-2c-rodes-carter', 'cs-2c-rodes-resart', [
    ('jeffdavisal', 'Jeff. Davis (Alabama) Artillery (Reese)', r'Jeff\. Davis \(Alabama\) \S+[.,] Capt\. W\. J\. Reese'),
    ('kingwilliam', 'King William (Virginia) Artillery (Carter)', r'King William \(.?Virginia\) Artillery[.,] Capt\. W\. P\. Carter'),
    ('morris', 'Morris (Virginia) Artillery (Page)', r'Morris \(Virginia\) \S+, Capt,?.? ?R\. C[.,] M\. Page'),
    ('orange', 'Orange (Virginia) Artillery (Fry)', r'Orange \(Virginia\) Artillery, Capt\. C\. W\. Fry')])
bat('cs-2c-res-art-1vaartbn', 'cs-2c-rodes-resart', [
    ('2richmondhowitzers', '2d Richmond (Virginia) Howitzers (Watson)', r'2\S+ Ric\S+ \(Virginia\) Howitzers, Capt,? David Watson'),
    ('3richmondhowitzers', '3d Richmond (Virginia) Howitzers (Smith)', r'3d Richmond \(Virginia\) Howitzers[.,] Capt\. B\. H\. Smith, jr'),
    ('powhatan', 'Powhatan (Virginia) Artillery (Cunningham)', r'Powhatan \(Virginia\) Artillery[.,] Lieut\. John M\. Cunningham'),
    ('rockbridge', 'Rockbridge (Virginia) Artillery (Graham)', r'Rockbridge \(Virginia\) Artillery[.,] Capt\. A\. Graham'),
    ('salem', 'Salem (Virginia) Artillery (Griffin)', r'Salem \(Virginia\) Artillery, Lieut\. C\. B\. Griffin')])
bat('cs-2c-res-art-nelson', 'cs-2c-rodes-resart', [
    ('amherst', 'Amherst (Virginia) Artillery (Kirkpatrick)', r'Amherst \(Virginia\) Artillery[.,] Capt\. T\. J\. Kirkpatrick'),
    ('fluvanna', 'Fluvanna (Virginia) Artillery (Massie)', r'Fluvanna \(Virginia\) Artillery, Capt\. J\. L\. M\S+'),
    ('milledge', 'Georgia Battery (Milledge)', r'Georgia Battery, Capt\. John Milledge, jr')])
bat('cs-3c-anderson-cutts', 'cs-3c-anderson', [
    ('coa', 'Sumter Battalion, Company A (Ross)', r'Compan\S+ A[.,] Ca\S+ Hugh M\. \S+'),
    ('cob', 'Sumter Battalion, Company B (Patterson)', r'Company B, Ca\S+ George M\. Patterson'),
    ('coc', 'Sumter Battalion, Company C (Wingfield)', r'Company C, \S+ John T\. Wing\S+')])
bat('cs-3c-heth-garnett', 'cs-3c-heth', [
    ('donaldsonville', 'Donaldsonville (Louisiana) Artillery (Maurin)', r'Donaldson ?ville \(Louisiana\) Artillery, Capt,? V\. Maurin'),
    ('huger', 'Huger (Virginia) Artillery (Moore)', r'Huger \(Virginia\) Artillery[.,] Capt,? Jose\S+ D,? Moore'),
    ('lewis', 'Lewis (Virginia) Artillery (Lewis)', r'Lewis \(Virginia\) Artiller\S+ Capt\. John W\. Lewis'),
    ('norfolkblues', 'Norfolk Light Artillery Blues (Grandy)', r'Norfolk Light Artillery Blues, Capt\. C\. R\. Grandy')])
bat('cs-3c-pender-poague', 'cs-3c-pender-resart', [
    ('albemarle', 'Albemarle (Virginia) Artillery (Wyatt)', r'Albemarle \(\S+\) Artille\S+ Capt\. James W\. Wyatt'),
    ('charlottenc', 'Charlotte (North Carolina) Artillery (Graham)', r'Charlott\S \(North Carolina\) Artillery, Capt\. Jo\S+ Graham'),
    ('madisonms', 'Madison (Mississippi) Light Artillery (Ward)', r'Madison \( ?\S+\) Li\S+ Artillery, Capt\. George Ward'),
    ('brooke', 'Virginia Battery (Brooke)', r'irginia Battery, Capt\. J\. \S+ Brooke')])
bat('cs-3c-res-art-mcintosh', 'cs-3c-pender-resart', [
    ('danville', 'Danville (Virginia) Artillery (Rice)', r'Danville \(Virginia\) Artillery, Capt\. R\. S\. Rice'),
    ('hardawayal', 'Hardaway (Alabama) Artillery (Hurt)', r'Hardawa\S \(Alabama\) Artillery, Capt\. W\. B\. Hurt'),
    ('2rockbridge', '2d Rockbridge (Virginia) Artillery (Wallace)', r'2d Rock\S+ \(\S+ ?\S*\) Artillery, Lieut\. Samuel Wallace'),
    ('johnson', 'Virginia Battery (Johnson)', r'Vir\S+ Battery, Capt\. M\. Johnson')])
bat('cs-3c-res-art-pegram', 'cs-3c-pender-resart', [
    ('crenshaw', 'Crenshaw (Virginia) Battery', r'Crenshaw \(Virginia\) Battery'),
    ('fredericksburg', 'Fredericksburg (Virginia) Artillery (Marye)', r'Fredericksburg \(\S+\) Artillery, Capt\. E\. A\. Marye'),
    ('letcher', 'Letcher (Virginia) Artillery (Brander)', r'Letcher \(\S+\) Artillery, Capt\. T\. A\. Brander'),
    ('peedeesc', 'Pee Dee (South Carolina) Artillery (Zimmerman)', r'Pee Dee \(South Carolina\) Artillery ?, Lieut\. William E\. Zimmerman'),
    ('purcell', 'Purcell (Virginia) Artillery (McGraw)', r'Purcell \(Virginia\) Artiller\S+ Capt\. Joseph McGraw')])
bat('cs-cav-horse-art', 'cs-cav-jenkins-art-hq', [
    ('breathed', "Breathed's (Virginia) Battery", r"Breathed's \(Virginia\) Battery, Capt\. James Breathed"),
    ('chew', "Chew's (Virginia) Battery", r"Chew's \(Virginia\) Battery, Ca\S+ R\S+ P\. Chew"),
    ('griffin', "Griffin's (Maryland) Battery", r"Griffin's \(Maryland\) Battery, Capt\. W\. H\. Gri\S+"),
    ('hart', "Hart's (South Carolina) Battery", r"Hart's \(South Carolina\) Battery, Capt\. J\. F\. Hart"),
    ('mcgregor', "McGregor's (Virginia) Battery", r"McGregor's \(Virginia\) Battery,\S* Capt\. W\. M\. McGregor"),
    ('moorman', "Moorman's (Virginia) Battery", r"Moorman's \(Virginia\) Battery, Capt\. M\. N\. Moorman")])
c('cs-cav-jenkins-jacksonbattery', 'cs-cav-jenkins', 'cs-cav-jenkins-art-hq', 'add', "Jackson's (Virginia) Battery (Jenkins)", 'battery', 'artillery', r"Jackson's \(\S+\) Battery, Capt\. Thomas E\. Jackson", '')
c('cs-cav-flee-1mdbn', 'cs-cav-flee', 'cs-cav-stuart', 'status', '1st Maryland Battalion (cavalry): serving with Ewell\'s corps', 'battalion', 'cavalry', r"Serving with Ewell's corps", 'the roster draws it with Fitz. Lee\'s brigade; the table says it served with the Second Corps')
c('cs-cav-robertson', 'cs-cav-robertson-jones-imboden', 'cs-cav-jenkins-art-hq', 'status', "Robertson's brigade: 4th and 5th North Carolina Cavalry", 'brigade', 'cavalry', r'4th North Caro\S+, Col\. D\. D\. Fereb\S+', 'the roster status never_main_field rests on weak keys; a non-lead source for where the brigade was is owed')
c('cs-cav-jones', 'cs-cav-robertson-jones-imboden', 'cs-cav-jenkins-art-hq', 'status', "W. E. Jones' brigade: 6th, 7th and 11th Virginia Cavalry", 'brigade', 'cavalry', r'6th Virginia, Maj\. ?C\. E\. Flournoy', 'report OR27-2-R580 (Jones) and R581 to R583; Fairfield on 3 July lies outside the loaded ground')
c('cs-cav-imboden', 'cs-cav-robertson-jones-imboden', 'cs-cav-jenkins-art-hq', 'status', "Imboden's command", 'command', 'cavalry', r'18th Virginia Cavalry, Col\. George W\. Imboden', 'no report of Imboden is in the index; Lee and Stuart are the reports to read')
c('cs-1c-mclaws-wofford-3gasharpshooters', 'cs-1c-mclaws-wofford', 'cs-1c-mclaws', 'status', "Wofford's brigade as the table prints it", 'brigade', 'infantry', r'Phillips \(Georgia\) Legion, Lieut,? Col\. E\. S,? Barclay', 'the roster lists a 3rd Georgia Sharpshooters under Wofford; the table prints five units (16th, 18th, 24th Georgia, Cobb\'s Legion, Phillips Legion) and no sharpshooter battalion: the basis of the sixth unit is to be found or the unit registered as unsupported')
c('cs-1c-mclaws-semmes', 'cs-1c-mclaws', 'cs-1c-mclaws', 'status', "Semmes' brigade: no reports on file", 'brigade', 'infantry', r'No reports on file for this brigade', 'the table itself says the Official Records hold no report of this brigade')

# The group table of build_groups.py was rebalanced after the entries above were first written: three corps groups were split at division boundaries and the three
# smallest groups were merged into their neighbours. The group named in a call above is the first draft's; regroup() gives the group of the table in force.
MERGED = {'us-11c-1d-2d': 'us-11c', 'us-cav-2d-art': 'us-cav-2d-3d-art', 'us-cav-3d': 'us-cav-2d-3d-art', 'cs-cav-stuart': 'cs-cav-hq', 'cs-cav-jenkins-art-hq': 'cs-cav-hq'}
SPLIT = {'us-1c': {'us-1c-hq-1mecav-l': 'us-1c-1d-art', 'us-1c-art-1nye': 'us-1c-1d-art', 'us-1c-3d-stannard-12vt': 'us-1c-2d-3d', 'us-1c-3d-stannard-15vt': 'us-1c-2d-3d',
                    'us-1c-3d-stannard': 'us-1c-2d-3d', 'us-1c-2d-baxter-11pa': 'us-1c-2d-3d'},
         'us-2c': {'us-2c-hq-6nycav-d-k': 'us-2c-1d-art', 'us-2c-art-14ny': 'us-2c-1d-art', 'us-2c-2d-harrow-mnss-co': 'us-2c-2d-3d'},
         'us-6c': {'us-6c-hq-1njcav-l': 'us-6c-1d-2d', 'us-6c-hq-1pacav-h': 'us-6c-1d-2d', 'us-6c-1d-provost-4nj': 'us-6c-1d-2d', 'us-6c-2d': 'us-6c-1d-2d', 'us-6c-3d-wheaton-102pa': 'us-6c-3d-art'}}
def regroup(e):
    g = e['group']
    if g in SPLIT:
        assert e['id'] in SPLIT[g], 'no new group for the entry %s of the split group %s' % (e['id'], g)
        return SPLIT[g][e['id']]
    return MERGED.get(g, g)

RANGE = {'OR27-1-R009': (155, 169), 'OR27-2-R424': (283, 291)}
_heads = {}
def page_from_heads(text, r, off, rng):
    """Printed page of an offset inside an organization table, from the page numbers that stand alone on a line inside the record
    (the index's page model interpolates over these tables and is several pages high: see PLAN.md 9.3)."""
    key = r['id']
    if key not in _heads:
        hs = []
        for m in re.finditer(r'(?m)^[ \t]*(\d{3})[ \t]*\r?$', text[r['start_offset']:r['end_offset']]):
            n = int(m.group(1))
            if rng[0] <= n <= rng[1] and (not hs or n > hs[-1][1]): hs.append((r['start_offset'] + m.start(), n))
        _heads[key] = hs
    hs = _heads[key]
    prev = [h for h in hs if h[0] <= off]; nxt = [h for h in hs if h[0] > off]
    lo = prev[-1][1] if prev else (hs[0][1] - 1 if hs else None)
    hi = (nxt[0][1] - 1) if nxt else lo
    if lo is None: return None
    return str(lo) if hi is None or hi <= lo else '%d-%d' % (lo, hi)


def main():
    out, missing = [], []
    idx = {r['id']: r for r in json.load(open(F.INDEX_PATH, encoding='utf-8'))['records']}
    for e in E:
        e['group'] = regroup(e)
        rec, part = e.pop('table'); P = F.get_part(part); r = idx[rec]
        # normalized offsets of the record
        import bisect
        lo = bisect.bisect_left(P.nmap, r['start_offset']); hi = bisect.bisect_left(P.nmap, r['end_offset'] + 400)
        m = re.search(e['pattern'], P.ntext[lo:hi])
        row = {k: v for k, v in e.items() if k != 'pattern'}
        if not m: missing.append(row['id'] + ' :: ' + e['pattern']); row.update(found=False, quote=None); out.append(row); continue
        words = m.group(0).split(' ')[:14]; q = ' '.join(words)
        s, t = P.orig_span(lo + m.start(), lo + m.start() + len(q)); ci = P.cite(s, t)
        pg = page_from_heads(P.text, r, s, RANGE[rec])
        row.update(found=True, quote=q, source={'source_id': 'OR27-%d' % part, 'report_id': rec, 'printed_page': pg, 'page_basis': 'running heads printed inside the table (a number alone on its line); a range where a head is unreadable; the first page from the head that follows', 'page_model': ci['page'], 'quote_offset': s})
        row.setdefault('ocr_uncertain', False); out.append(row)
    doc = {'_doc': 'Units of the Official Records organization tables that the roster lacks, splits or lists with another status. Built by tools/build_roster_gaps.py: every quote was found by code in the OR text at the offset given (the OCR is printed as it stands). action: add | absent | attached | merge | fix | status. A reading aid: each line is confirmed by a `unit` or `absent` record of its group file before it changes the roster.',
           'tables': {'union': 'OR27-1-R009 (OR Ser. I vol. 27 pt. 1, pp. 155-168 by the running heads inside the table; the index gives 162-169)', 'confederate': 'OR27-2-R424 (OR Ser. I vol. 27 pt. 2, pp. 283-291 by the running heads inside the table; the index gives 282-285)'},
           'counts': {}, 'not_found': missing, 'entries': out}
    for o in out: doc['counts'][o['action']] = doc['counts'].get(o['action'], 0) + 1
    with open(os.path.join(HERE, '..', 'roster-gaps.json'), 'w', encoding='utf-8') as f: json.dump(doc, f, ensure_ascii=False, indent=1); f.write('\n')
    print('entries', len(out), 'found', sum(1 for o in out if o['found']), 'counts', doc['counts'])
    for m in missing: print('NOT FOUND', m)

if __name__ == '__main__':
    main()
