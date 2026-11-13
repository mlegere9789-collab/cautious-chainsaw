"""Canonical unit list of both armies for the roster production (one roster file per unit).

Authority: the two organization tables of the Official Records, Series I vol. 27:
  part 1, No. 9, "Organization of the Army of the Potomac ... at the battle of Gettysburg, July 1-3, 1863", printed pp. 155-168
  part 2, "Organization of the Army of Northern Virginia at the battle of Gettysburg, July 1-3", printed pp. 283-291
(local OCR text: tmp/library/or27, sha256 in tmp/library/or27/MANIFEST.json).  The OCR of those pages misreads
many numerals ("84th Michigan" for the 24th, "3d Wisconsin" for the 2d, "131st Pennsylvania" for the 121st), so
the numbers below follow the owner's governing text (history/units.json, built from PDF B.3) wherever it lists
the unit; build_units.py re-finds every unit in the OR text and records "or_check" per unit:
  exact            the designation was found in the table with the same number
  ocr-numeral      the state and arm were found in the right place but the OCR prints another numeral
  not-found        no matching line (reported, never silently accepted)
Units that only the OR table lists (headquarters guards, detachments, trains, engineers) carry scope notes
copied from the OR's own words ("Not engaged", "Guarding trains").

Format of an entry:  (number_or_name, kind, note)
  kind:  inf | cav | art | eng | ss   (arm);   note: free text from the OR table (companies present, footnotes)
Nothing in this file is a strength, a date or a name of a man.
"""

# ---------------------------------------------------------------- Union, by state
# scope values: 'field' (in the table without a not-engaged note), 'not-engaged' (the OR footnote says so)
U = {}

U['me'] = dict(state='Maine', units=[
    (3, 'inf', ''), (4, 'inf', ''), (5, 'inf', ''), (6, 'inf', ''), (7, 'inf', 'six companies'),
    (16, 'inf', ''), (17, 'inf', ''), (19, 'inf', ''), (20, 'inf', ''),
    (10, 'inf', 'battalion: four companies, provost guard, Twelfth Corps'),
    (1, 'cav', 'ten companies; Company L at First Corps headquarters'),
    ('2nd Maine Battery (B)', 'art', 'Hall'), ('5th Maine Battery (E)', 'art', 'Stevens, Whittier'),
    ('6th Maine Battery (F)', 'art', 'Dow'),
])
U['nh'] = dict(state='New Hampshire', units=[
    (2, 'inf', ''), (5, 'inf', ''), (12, 'inf', ''),
    ('1st New Hampshire Battery', 'art', 'Edgell'),
])
U['vt'] = dict(state='Vermont', units=[
    (2, 'inf', ''), (3, 'inf', ''), (4, 'inf', ''), (5, 'inf', ''), (6, 'inf', ''),
    (12, 'inf', 'OR: guarding trains, and not engaged in the battle; the table OCR prints "13th Vermont, Col. Asa P. Blunt", Stannard\'s report (p. 349) prints "the Twelfth Regiment, under command of Colonel Blunt"'), (13, 'inf', ''), (14, 'inf', ''),
    (15, 'inf', 'OR: guarding trains, and not engaged in the battle'), (16, 'inf', ''),
    (1, 'cav', ''),
])
U['ma'] = dict(state='Massachusetts', units=[
    (1, 'inf', ''), (2, 'inf', ''), (7, 'inf', ''), (9, 'inf', ''), (10, 'inf', ''), (11, 'inf', ''),
    (12, 'inf', ''), (13, 'inf', ''), (15, 'inf', ''), (16, 'inf', ''), (18, 'inf', ''), (19, 'inf', ''),
    (20, 'inf', ''), (22, 'inf', ''), (28, 'inf', ''),
    (32, 'inf', 'Company C was headquarters guard of the Artillery Reserve'), (33, 'inf', ''), (37, 'inf', ''),
    ('1st Company Massachusetts Sharpshooters', 'ss', 'unattached, Second Division, Second Corps'),
    (1, 'cav', 'OR: served with the Sixth Army Corps, and on the right flank'),
    ('1st Massachusetts Battery (A)', 'art', 'McCartney'), ('3rd Massachusetts Battery (C)', 'art', 'Walcott'),
    ('5th Massachusetts Battery (E)', 'art', 'Phillips; 10th New York Battery attached'),
    ('9th Massachusetts Battery', 'art', 'Bigelow'),
])
U['ri'] = dict(state='Rhode Island', units=[
    (2, 'inf', ''),
    ('Battery A, 1st Rhode Island Light Artillery', 'art', 'Arnold'),
    ('Battery B, 1st Rhode Island Light Artillery', 'art', 'Brown, Perrin'),
    ('Battery C, 1st Rhode Island Light Artillery', 'art', 'Waterman'),
    ('Battery E, 1st Rhode Island Light Artillery', 'art', 'Bucklyn, Freeborn'),
    ('Battery G, 1st Rhode Island Light Artillery', 'art', 'Adams'),
])
U['ct'] = dict(state='Connecticut', units=[
    (5, 'inf', ''), (14, 'inf', ''), (17, 'inf', ''), (20, 'inf', ''), (27, 'inf', 'two companies'),
    ('Battery B, 1st Connecticut Heavy Artillery', 'art', 'Brooker; OR: not engaged'),
    ('Battery M, 1st Connecticut Heavy Artillery', 'art', 'Pratt; OR: not engaged'),
    ('2nd Connecticut Light Battery', 'art', 'Sterling'),
])
U['ny'] = dict(state='New York', units=[
    (8, 'inf', 'one company, Eleventh Corps headquarters'),
    (10, 'inf', 'battalion'), (12, 'inf', 'Companies D and E, Fifth Corps headquarters'),
    (39, 'inf', 'four companies'), (40, 'inf', ''), (41, 'inf', 'nine companies'), (42, 'inf', ''),
    (43, 'inf', ''), (44, 'inf', ''), (45, 'inf', ''), (49, 'inf', ''), (52, 'inf', ''), (54, 'inf', ''),
    (57, 'inf', ''), (58, 'inf', ''), (59, 'inf', 'four companies'), (60, 'inf', ''), (61, 'inf', ''),
    (62, 'inf', ''), (63, 'inf', 'two companies'), (64, 'inf', ''), (65, 'inf', ''), (66, 'inf', ''),
    (67, 'inf', ''), (68, 'inf', ''), (69, 'inf', 'two companies'), (70, 'inf', ''), (71, 'inf', ''),
    (72, 'inf', ''), (73, 'inf', ''), (74, 'inf', ''), (76, 'inf', ''), (77, 'inf', ''), (78, 'inf', ''),
    (80, 'inf', '20th Militia'), (82, 'inf', '2d Militia'), (83, 'inf', '9th Militia'),
    (84, 'inf', '14th Militia'), (86, 'inf', ''), (88, 'inf', 'two companies'),
    (93, 'inf', 'general headquarters; OR: not engaged'), (94, 'inf', ''), (95, 'inf', ''),
    (97, 'inf', ''), (102, 'inf', ''), (104, 'inf', ''), (107, 'inf', ''), (108, 'inf', ''), (111, 'inf', ''),
    (119, 'inf', ''), (120, 'inf', ''), (121, 'inf', ''), (122, 'inf', ''), (123, 'inf', ''), (124, 'inf', ''),
    (125, 'inf', ''), (126, 'inf', ''), (134, 'inf', ''), (136, 'inf', ''), (137, 'inf', ''), (140, 'inf', ''),
    (145, 'inf', ''), (146, 'inf', ''), (147, 'inf', ''), (149, 'inf', ''), (150, 'inf', ''), (154, 'inf', ''),
    (157, 'inf', ''),
    (33, 'inf', 'detachment'),
    (15, 'eng', 'three companies; Engineer Brigade, OR: not engaged'),
    (50, 'eng', 'Engineer Brigade, OR: not engaged'),
    (2, 'cav', 'Huey; OR: at Westminster, etc., and not engaged in the battle'),
    (4, 'cav', 'Huey; OR: at Westminster, etc., and not engaged in the battle'),
    (5, 'cav', ''), (6, 'cav', 'Companies D and K at Second Corps headquarters'), (8, 'cav', ''), (9, 'cav', ''),
    (10, 'cav', ''),
    ('Oneida (New York) Cavalry', 'cav', 'guards and orderlies, general headquarters'),
    ('Battery B, 1st New York Light Artillery', 'art', 'Sheldon, Rorty, Rogers; 14th New York Battery attached'),
    ('Battery C, 1st New York Light Artillery', 'art', 'Barnes'),
    ('Battery D, 1st New York Light Artillery', 'art', 'Winslow'),
    ('Battery E, 1st New York Light Artillery', 'art', 'attached to Battery L'),
    ('Battery G, 1st New York Light Artillery', 'art', 'Ames'),
    ('Battery I, 1st New York Light Artillery', 'art', 'Wiedrich'),
    ('Battery K, 1st New York Light Artillery', 'art', 'Fitzhugh; 11th New York Battery attached'),
    ('Battery L, 1st New York Light Artillery', 'art', 'Reynolds, Breck'),
    ('Battery M, 1st New York Light Artillery', 'art', 'Winegar'),
    ('1st New York Independent Battery', 'art', 'Cowan'), ('3rd New York Independent Battery', 'art', 'Harn'),
    ('4th New York Independent Battery', 'art', 'Smith'), ('5th New York Independent Battery', 'art', 'Taft'),
    ('6th New York Independent Battery', 'art', 'Martin; horse artillery'),
    ('10th New York Independent Battery', 'art', 'attached to the 5th Massachusetts Battery'),
    ('11th New York Independent Battery', 'art', 'attached to Battery K, 1st New York Light'),
    ('13th New York Independent Battery', 'art', 'Wheeler'),
    ('14th New York Independent Battery', 'art', 'attached to Battery B, 1st New York Light'),
    ('15th New York Independent Battery', 'art', 'Hart'),
])
U['nj'] = dict(state='New Jersey', units=[
    (1, 'inf', ''), (2, 'inf', ''), (3, 'inf', ''),
    (4, 'inf', 'three companies provost guard, First Division, Sixth Corps; seven companies train guard, Artillery Reserve'),
    (5, 'inf', ''), (6, 'inf', ''), (7, 'inf', ''), (8, 'inf', ''), (11, 'inf', ''), (12, 'inf', ''), (13, 'inf', ''),
    (15, 'inf', ''),
    (1, 'cav', 'Company L at Sixth Corps headquarters'),
    ('1st New Jersey Battery (A)', 'art', 'Parsons'), ('2nd New Jersey Battery (B)', 'art', 'Clark, Sims'),
])
U['pa'] = dict(state='Pennsylvania', units=[
    (11, 'inf', ''), (23, 'inf', ''), (26, 'inf', ''), (27, 'inf', ''), (28, 'inf', ''), (29, 'inf', ''),
    (46, 'inf', ''), (49, 'inf', 'four companies'), (53, 'inf', ''), (56, 'inf', 'nine companies'),
    (57, 'inf', 'eight companies'), (61, 'inf', ''), (62, 'inf', ''), (63, 'inf', ''), (68, 'inf', ''),
    (69, 'inf', ''), (71, 'inf', ''), (72, 'inf', ''), (73, 'inf', ''), (74, 'inf', ''), (75, 'inf', ''),
    (81, 'inf', ''), (82, 'inf', ''), (83, 'inf', ''),
    (84, 'inf', 'OR: guarding corps trains, and not engaged in the battle'), (88, 'inf', ''), (90, 'inf', ''),
    (91, 'inf', ''), (93, 'inf', ''), (95, 'inf', ''), (96, 'inf', ''), (98, 'inf', ''), (99, 'inf', ''),
    (102, 'inf', 'OR: guarding wagon train at Westminster, and not engaged in the battle'), (105, 'inf', ''),
    (106, 'inf', ''), (107, 'inf', ''), (109, 'inf', ''), (110, 'inf', 'six companies'), (111, 'inf', ''),
    (114, 'inf', ''), (115, 'inf', ''), (116, 'inf', 'four companies'), (118, 'inf', ''), (119, 'inf', ''),
    (121, 'inf', ''), (139, 'inf', ''), (140, 'inf', ''), (141, 'inf', ''), (142, 'inf', ''), (143, 'inf', ''),
    (145, 'inf', 'seven companies'), (147, 'inf', 'eight companies'), (148, 'inf', ''), (149, 'inf', ''),
    (150, 'inf', ''), (151, 'inf', ''), (153, 'inf', ''), (155, 'inf', ''),
    ('1st Pennsylvania Reserves', 'inf', 'nine companies'),
    ('2nd Pennsylvania Reserves', 'inf', ''),
    ('5th Pennsylvania Reserves', 'inf', ''),
    ('6th Pennsylvania Reserves', 'inf', ''),
    ('9th Pennsylvania Reserves', 'inf', ''),
    ('10th Pennsylvania Reserves', 'inf', ''),
    ('11th Pennsylvania Reserves', 'inf', ''),
    ('12th Pennsylvania Reserves', 'inf', 'nine companies'),
    ('13th Pennsylvania Reserves', 'inf', 'OR index: Bucktails'),
    (1, 'cav', 'Company H at Sixth Corps headquarters'),
    (2, 'cav', 'provost-marshal-general; the table OCR prints "3d Pennsylvania Cavalry, Col. R. Butler Price", the volume index prints "Price\'s (R. Butler) Cavalry. See Pennsylvania Troops, 2d Regiment"'),
    (3, 'cav', ''), (4, 'cav', ''), (6, 'cav', 'Companies E and I at general headquarters'),
    (8, 'cav', 'Huey; OR: at Westminster, etc., and not engaged in the battle'), (16, 'cav', ''),
    (17, 'cav', 'Companies D and H at Fifth Corps headquarters'), (18, 'cav', ''),
    ('Battery B, 1st Pennsylvania Light Artillery', 'art', 'Cooper'),
    ('Batteries F and G, 1st Pennsylvania Light Artillery', 'art', 'Ricketts'),
    ('Pennsylvania Independent Batteries C and F', 'art', 'Thompson'),
    ('Pennsylvania Independent Battery E', 'art', 'Atwell (Knap\'s)'),
    ('Battery H, 3rd Pennsylvania Heavy Artillery (section)', 'art', 'Rank; OR: serving as light artillery'),
])
U['de'] = dict(state='Delaware', units=[(1, 'inf', ''), (2, 'inf', '')])
U['md'] = dict(state='Maryland', units=[
    (3, 'inf', ''),
    ('1st Maryland, Potomac Home Brigade', 'inf', 'Maulsby'),
    ('1st Maryland, Eastern Shore', 'inf', ''),
    (1, 'cav', 'eleven companies'),
    ('Purnell (Maryland) Legion Cavalry, Company A', 'cav', 'Duvall'),
    ('Battery A, Maryland Light Artillery', 'art', 'Rigby'),
])
U['wv'] = dict(state='West Virginia', units=[
    (7, 'inf', ''), (1, 'cav', 'ten companies'), (3, 'cav', 'two companies'),
    ('Battery C, West Virginia Light Artillery', 'art', 'Hill'),
])
U['oh'] = dict(state='Ohio', units=[
    (4, 'inf', ''), (5, 'inf', ''), (7, 'inf', ''), (8, 'inf', ''), (25, 'inf', ''), (29, 'inf', ''),
    (55, 'inf', ''), (61, 'inf', ''), (66, 'inf', ''), (73, 'inf', ''), (75, 'inf', ''), (82, 'inf', ''),
    (107, 'inf', ''),
    (1, 'cav', 'Company A headquarters guard, Second Cavalry Division; Company C headquarters guard, Third Cavalry Division'),
    (6, 'cav', 'ten companies; Huey; OR: at Westminster, etc., and not engaged in the battle'),
    ('Battery H, 1st Ohio Light Artillery', 'art', 'Norton'), ('Battery I, 1st Ohio Light Artillery', 'art', 'Dilger'),
    ('Battery K, 1st Ohio Light Artillery', 'art', 'Heckman'), ('Battery L, 1st Ohio Light Artillery', 'art', 'Gibbs'),
])
U['in'] = dict(state='Indiana', units=[
    (7, 'inf', ''), (14, 'inf', ''), (19, 'inf', ''), (20, 'inf', ''), (27, 'inf', ''),
    (1, 'cav', 'Companies I and K, Eleventh Corps headquarters'), (3, 'cav', 'six companies'),
])
U['il'] = dict(state='Illinois', units=[(82, 'inf', ''), (8, 'cav', ''), (12, 'cav', 'four companies')])
U['mi'] = dict(state='Michigan', units=[
    (1, 'inf', ''), (3, 'inf', ''), (4, 'inf', ''), (5, 'inf', ''), (7, 'inf', ''), (16, 'inf', ''), (24, 'inf', ''),
    (1, 'cav', ''), (5, 'cav', ''), (6, 'cav', ''), (7, 'cav', 'ten companies'),
    ('9th Michigan Battery', 'art', 'Daniels; horse artillery'),
])
U['wi'] = dict(state='Wisconsin', units=[
    (2, 'inf', ''), (3, 'inf', ''), (5, 'inf', ''), (6, 'inf', ''), (7, 'inf', ''), (26, 'inf', ''),
])
U['mn'] = dict(state='Minnesota', units=[
    (1, 'inf', ''),
    ('2nd Company Minnesota Sharpshooters', 'ss', 'OR: attached to the 1st Minnesota; the table OCR prints "3d Company", the volume index prints "Companies: 2d Sharpshooters, 158, 176"'),
])
U['us'] = dict(state='United States (Regular Army and United States Volunteers)', units=[
    (2, 'inf', 'six companies'), (3, 'inf', 'six companies'), (4, 'inf', 'four companies'),
    (6, 'inf', 'five companies'), (7, 'inf', 'four companies'),
    (8, 'inf', 'eight companies; provost-marshal-general; OR: not engaged'),
    (10, 'inf', 'three companies'), (11, 'inf', 'six companies'), (12, 'inf', 'eight companies'),
    (14, 'inf', 'eight companies'), (17, 'inf', 'seven companies'),
    ('United States Engineer Battalion', 'eng', 'Mendell; Engineer Brigade'),
    ('1st United States Sharpshooters', 'ss', 'Berdan, Trepp'),
    ('2nd United States Sharpshooters', 'ss', 'eight companies; Stoughton'),
    (1, 'cav', ''), (2, 'cav', ''), (5, 'cav', ''), (6, 'cav', ''),
    ('Batteries E and G, 1st United States Artillery', 'art', 'Randol; horse artillery'),
    ('Battery H, 1st United States Artillery', 'art', 'Eakin, Mason'),
    ('Battery I, 1st United States Artillery', 'art', 'Woodruff, McCrea'),
    ('Battery K, 1st United States Artillery', 'art', 'Graham; horse artillery'),
    ('Battery A, 2nd United States Artillery', 'art', 'Calef; horse artillery'),
    ('Batteries B and L, 2nd United States Artillery', 'art', 'Heaton; horse artillery'),
    ('Battery D, 2nd United States Artillery', 'art', 'Williston'),
    ('Battery G, 2nd United States Artillery', 'art', 'Butler'),
    ('Battery M, 2nd United States Artillery', 'art', 'Pennington; horse artillery'),
    ('Battery C, 3rd United States Artillery', 'art', 'Fuller; OR: with Huey\'s Cavalry Brigade, and not engaged in the battle'),
    ('Batteries F and K, 3rd United States Artillery', 'art', 'Turnbull'),
    ('Battery A, 4th United States Artillery', 'art', 'Cushing, Fuger'),
    ('Battery B, 4th United States Artillery', 'art', 'Stewart'),
    ('Battery C, 4th United States Artillery', 'art', 'Thomas'),
    ('Battery E, 4th United States Artillery', 'art', 'Elder; horse artillery'),
    ('Battery F, 4th United States Artillery', 'art', 'Rugg'),
    ('Battery G, 4th United States Artillery', 'art', 'Wilkeson, Bancroft'),
    ('Battery K, 4th United States Artillery', 'art', 'Seeley, James'),
    ('Battery C, 5th United States Artillery', 'art', 'Weir'),
    ('Battery D, 5th United States Artillery', 'art', 'Hazlett, Rittenhouse'),
    ('Battery F, 5th United States Artillery', 'art', 'Martin'),
    ('Battery I, 5th United States Artillery', 'art', 'Watson, MacConnell'),
    ('Battery K, 5th United States Artillery', 'art', 'Kinzie'),
    ('General and staff officers, Army of the Potomac', 'staff', 'army, corps, division and brigade commanders and staff named in OR 27'),
    ('Signal Corps detachment', 'staff', 'Norton'),
])

# ---------------------------------------------------------------- Confederate, by state
C = {}
C['va'] = dict(state='Virginia', units=[
    (1, 'inf', ''), (2, 'inf', ''), (3, 'inf', ''), (4, 'inf', ''), (5, 'inf', ''), (6, 'inf', ''), (7, 'inf', ''),
    (8, 'inf', ''), (9, 'inf', ''), (10, 'inf', ''), (11, 'inf', ''), (12, 'inf', ''), (14, 'inf', ''),
    (16, 'inf', ''), (18, 'inf', ''), (19, 'inf', ''), (21, 'inf', ''), (23, 'inf', ''), (24, 'inf', ''),
    (25, 'inf', ''), (27, 'inf', ''), (28, 'inf', ''), (31, 'inf', ''), (33, 'inf', ''), (37, 'inf', ''),
    (38, 'inf', ''), (40, 'inf', ''), (41, 'inf', ''), (42, 'inf', ''), (44, 'inf', ''), (47, 'inf', ''),
    (48, 'inf', ''), (49, 'inf', ''), (50, 'inf', ''), (52, 'inf', ''), (53, 'inf', ''), (55, 'inf', ''),
    (56, 'inf', ''), (57, 'inf', ''), (61, 'inf', ''),
    ('22nd Virginia Battalion', 'inf', ''),
    ('62nd Virginia Infantry (mounted)', 'inf', 'Imboden\'s command'),
    (1, 'cav', ''), (2, 'cav', ''), (3, 'cav', ''), (4, 'cav', ''), (5, 'cav', ''),
    (6, 'cav', 'W. E. Jones'), (7, 'cav', 'W. E. Jones'), (9, 'cav', ''), (10, 'cav', ''),
    (11, 'cav', 'W. E. Jones'), (13, 'cav', ''), (14, 'cav', ''), (16, 'cav', ''), (17, 'cav', ''),
    (18, 'cav', 'Imboden\'s command'),
    ('34th Virginia Cavalry Battalion', 'cav', ''), ('36th Virginia Cavalry Battalion', 'cav', ''),
    ('35th Virginia Cavalry Battalion', 'cav', 'not in the OR table; PDF B.3 lists it with Early\'s division'),
    ('Randolph\'s Company Virginia Cavalry', 'cav', 'escort, Second Corps'),
    ('Virginia Partisan Rangers (McNeill)', 'cav', 'Imboden\'s command'),
    ('Fauquier Artillery', 'art', 'Stribling; Dearing'), ('Hampden Artillery', 'art', 'Caskie; Dearing'),
    ('Richmond Fayette Artillery', 'art', 'Macon; Dearing'), ('Virginia Battery (Blount)', 'art', 'Dearing'),
    ('1st Richmond Howitzers', 'art', 'McCarthy; Cabell'),
    ('Ashland Artillery', 'art', 'Woolfolk; Alexander'), ('Bedford Artillery', 'art', 'Jordan; Alexander'),
    ('Virginia Battery (Parker)', 'art', 'Alexander'), ('Virginia Battery (Taylor)', 'art', 'Alexander'),
    ('Charlottesville Artillery', 'art', 'Carrington; Jones'), ('Courtney Artillery', 'art', 'Tanner; Jones'),
    ('Staunton Artillery', 'art', 'Garber; Jones'),
    ('Alleghany Artillery', 'art', 'Carpenter; Latimer'), ('Lee Battery', 'art', 'Raine, Hardwicke; Latimer'),
    ('King William Artillery', 'art', 'W. P. Carter; Carter'), ('Morris Artillery', 'art', 'Page; Carter'),
    ('Orange Artillery', 'art', 'Fry; Carter'),
    ('2nd Richmond Howitzers', 'art', 'Watson; Dance'), ('3rd Richmond Howitzers', 'art', 'Smith; Dance'),
    ('Powhatan Artillery', 'art', 'Cunningham; Dance'), ('Rockbridge Artillery', 'art', 'Graham; Dance'),
    ('Salem Artillery', 'art', 'Griffin; Dance'),
    ('Amherst Artillery', 'art', 'Kirkpatrick; Nelson'), ('Fluvanna Artillery', 'art', 'Massie; Nelson'),
    ('Huger Artillery', 'art', 'Moore; Garnett'), ('Lewis Artillery', 'art', 'Lewis; Garnett'),
    ('Norfolk Light Artillery Blues', 'art', 'Grandy; Garnett'),
    ('Albemarle Artillery', 'art', 'Wyatt; Poague'), ('Virginia Battery (Brooke)', 'art', 'Poague'),
    ('Crenshaw Battery', 'art', 'Pegram'), ('Fredericksburg Artillery', 'art', 'Marye; Pegram'),
    ('Letcher Artillery', 'art', 'Brander; Pegram'), ('Purcell Artillery', 'art', 'McGraw; Pegram'),
    ('Danville Artillery', 'art', 'Rice; McIntosh'), ('2nd Rockbridge Artillery', 'art', 'Wallace; McIntosh'),
    ('Virginia Battery (Johnson)', 'art', 'McIntosh'),
    ('Breathed\'s Battery', 'art', 'Stuart Horse Artillery'), ('Chew\'s Battery', 'art', 'Stuart Horse Artillery'),
    ('McGregor\'s Battery', 'art', 'Stuart Horse Artillery'), ('Moorman\'s Battery', 'art', 'Stuart Horse Artillery'),
    ('Jackson\'s Battery', 'art', 'Jenkins\' brigade'),
    ('Virginia Battery (McClanahan)', 'art', 'Imboden\'s command'),
])
C['nc'] = dict(state='North Carolina', units=[
    (1, 'inf', ''), (2, 'inf', ''), (3, 'inf', ''), (4, 'inf', ''), (5, 'inf', ''), (6, 'inf', ''), (7, 'inf', ''),
    (11, 'inf', ''), (12, 'inf', ''), (13, 'inf', ''), (14, 'inf', ''), (16, 'inf', ''), (18, 'inf', ''),
    (20, 'inf', ''), (21, 'inf', ''), (22, 'inf', ''), (23, 'inf', ''), (26, 'inf', ''), (28, 'inf', ''),
    (30, 'inf', ''), (32, 'inf', ''), (33, 'inf', ''), (34, 'inf', ''), (37, 'inf', ''), (38, 'inf', ''),
    (43, 'inf', ''), (45, 'inf', ''), (47, 'inf', ''), (52, 'inf', ''), (53, 'inf', ''), (55, 'inf', ''),
    (57, 'inf', ''),
    ('2nd North Carolina Battalion', 'inf', ''),
    (1, 'cav', ''), (2, 'cav', ''),
    (4, 'cav', 'Robertson\'s brigade'), (5, 'cav', 'Robertson\'s brigade'),
    ('Battery A, 1st North Carolina Artillery', 'art', 'Manly; Cabell'),
    ('Branch Artillery', 'art', 'Latham; Henry'), ('Rowan Artillery', 'art', 'Reilly; Henry'),
    ('Charlotte Artillery', 'art', 'Graham; Poague'),
])
C['sc'] = dict(state='South Carolina', units=[
    (2, 'inf', ''), (3, 'inf', ''), (7, 'inf', ''), (8, 'inf', ''), (12, 'inf', ''), (13, 'inf', ''), (14, 'inf', ''),
    (15, 'inf', ''),
    ('1st South Carolina (Provisional Army)', 'inf', ''), ('1st South Carolina Rifles', 'inf', ''),
    ('3rd South Carolina Battalion', 'inf', ''),
    (1, 'cav', ''), (2, 'cav', ''),
    ('German Artillery', 'art', 'Bachman; Henry'), ('Palmetto Light Artillery', 'art', 'Garden; Henry'),
    ('Brooks Artillery', 'art', 'Gilbert; Alexander'), ('Pee Dee Artillery', 'art', 'Zimmerman; Pegram'),
    ('Hart\'s Battery', 'art', 'Stuart Horse Artillery'),
])
C['ga'] = dict(state='Georgia', units=[
    (2, 'inf', ''), (3, 'inf', ''), (4, 'inf', ''), (7, 'inf', ''), (8, 'inf', ''), (9, 'inf', ''), (10, 'inf', ''),
    (11, 'inf', ''), (12, 'inf', ''), (13, 'inf', ''), (14, 'inf', ''), (15, 'inf', ''), (16, 'inf', ''),
    (17, 'inf', ''), (18, 'inf', ''), (20, 'inf', ''), (21, 'inf', ''), (22, 'inf', ''), (24, 'inf', ''),
    (26, 'inf', ''), (31, 'inf', ''), (35, 'inf', ''), (38, 'inf', ''), (44, 'inf', ''), (45, 'inf', ''),
    (48, 'inf', ''), (49, 'inf', ''), (50, 'inf', ''), (51, 'inf', ''), (53, 'inf', ''), (59, 'inf', ''),
    (60, 'inf', ''), (61, 'inf', ''),
    ('2nd Georgia Battalion', 'inf', ''),
    ('3rd Georgia Battalion Sharpshooters', 'inf', 'not in the OR table; PDF B.3 lists it with Wofford'),
    ('Cobb\'s Legion (infantry)', 'inf', ''), ('Phillips Legion (infantry)', 'inf', ''),
    ('Cobb\'s Legion (cavalry)', 'cav', ''), ('Phillips Legion (cavalry)', 'cav', ''),
    ('Pulaski Artillery', 'art', 'Fraser, Furlong; Cabell'), ('Troup Artillery', 'art', 'Carlton, Motes; Cabell'),
    ('Georgia Battery (Milledge)', 'art', 'Nelson'),
    ('Company A, Sumter Battalion', 'art', 'Ross; Lane'), ('Company B, Sumter Battalion', 'art', 'Patterson; Lane'),
    ('Company C, Sumter Battalion', 'art', 'Wingfield; Lane'),
])
C['al'] = dict(state='Alabama', units=[
    (3, 'inf', ''), (4, 'inf', ''), (5, 'inf', ''), (6, 'inf', ''), (8, 'inf', ''), (9, 'inf', ''), (10, 'inf', ''),
    (11, 'inf', ''), (12, 'inf', ''), (13, 'inf', ''), (14, 'inf', ''), (15, 'inf', ''), (26, 'inf', ''),
    (44, 'inf', ''), (47, 'inf', ''), (48, 'inf', ''),
    ('5th Alabama Battalion', 'inf', ''),
    ('Jeff. Davis Artillery', 'art', 'Reese; Carter'), ('Hardaway Artillery', 'art', 'Hurt; McIntosh'),
])
C['ms'] = dict(state='Mississippi', units=[
    (2, 'inf', ''), (11, 'inf', ''), (12, 'inf', ''), (13, 'inf', ''), (16, 'inf', ''), (17, 'inf', ''),
    (18, 'inf', ''), (19, 'inf', ''), (21, 'inf', ''), (42, 'inf', ''), (48, 'inf', ''),
    ('Jeff. Davis Legion', 'cav', 'companies from Mississippi, Alabama and Georgia'),
    ('Madison Light Artillery (Mississippi)', 'art', 'Ward; Poague'),
])
C['la'] = dict(state='Louisiana', units=[
    (1, 'inf', ''), (2, 'inf', ''), (5, 'inf', ''), (6, 'inf', ''), (7, 'inf', ''), (8, 'inf', ''), (9, 'inf', ''),
    (10, 'inf', ''), (14, 'inf', ''), (15, 'inf', ''),
    ('Washington Artillery, 1st Company', 'art', 'Squires'), ('Washington Artillery, 2nd Company', 'art', 'Richardson'),
    ('Washington Artillery, 3rd Company', 'art', 'Miller'), ('Washington Artillery, 4th Company', 'art', 'Norcom, Battles'),
    ('Madison Light Artillery (Louisiana)', 'art', 'Moody; Alexander'),
    ('Louisiana Guard Artillery', 'art', 'Green; Jones'),
    ('Donaldsonville Artillery', 'art', 'Maurin; Garnett'),
])
C['fl'] = dict(state='Florida', units=[(2, 'inf', ''), (5, 'inf', ''), (8, 'inf', '')])
C['tn'] = dict(state='Tennessee', units=[
    ('1st Tennessee (Provisional Army)', 'inf', ''), (7, 'inf', ''), (14, 'inf', ''),
])
C['tx'] = dict(state='Texas', units=[(1, 'inf', ''), (4, 'inf', ''), (5, 'inf', '')])
C['ar'] = dict(state='Arkansas', units=[(3, 'inf', '')])
C['md'] = dict(state='Maryland', units=[
    ('1st Maryland Battalion Infantry', 'inf', 'Herbert, Goldsborough, Crane'),
    ('1st Maryland Cavalry Battalion', 'cav', 'OR: serving with Ewell\'s corps'),
    ('1st Maryland Battery', 'art', 'Dement; Latimer'), ('Chesapeake Artillery', 'art', 'Brown; Latimer'),
    ('Griffin\'s (Maryland) Battery', 'art', 'Griffin; Stuart Horse Artillery'),
])
C['cs'] = dict(state='Confederate States (general and staff)', units=[
    ('General and staff officers, Army of Northern Virginia', 'staff', 'army, corps, division and brigade commanders and staff named in OR 27'),
])

# Units of PDF B.3 that the PDF itself marks never on the field and the OR table does not list at Gettysburg
# (kept out of the lists above, listed here so that nothing is dropped silently).
NOT_IN_OR_TABLE = [
    ('confederate', 'va', '13th Virginia Infantry', 'PDF B.3 status never_on_field'),
    ('confederate', 'va', '58th Virginia Infantry', 'PDF B.3 status never_on_field'),
    ('confederate', 'nc', '44th North Carolina Infantry', 'PDF B.3 status never_on_field'),
]
