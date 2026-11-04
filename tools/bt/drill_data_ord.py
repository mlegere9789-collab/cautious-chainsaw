"""Specs for docs/battle-theatre/drill/ordnance_tables.json.
Sources: GIBBON-1860 (Appendix range table, fuze chapter), ORDNANCE-1861 (Richmond reprint of the US Ordnance Manual: Ch. XI chest table, Ch. XIII range table, Ch. X small-arms cartridges),
FIELDART-1863 (Instruction for Field Artillery: chest contents, range table, battery establishment, charges).
The OCR of the tables is column-scrambled and digit-damaged; every row records the OCR token(s) and a reading only where the reading is supported (cross-source agreement or arithmetic). Nothing is silently corrected."""

FA, GB, OM = 'FIELDART-1863', 'GIBBON-1860', 'ORDNANCE-1861'

DOC = ("Ordnance tables for the field guns of the Gettysburg era from the three artillery texts: ranges by elevation, charges, projectile data, chest and battery ammunition, fuzes and small-arm cartridges. "
       "NAMES: none of these texts uses the name 'Napoleon'; the gun is the 'new 12-pdr gun' (Gibbon 1860, Appendix) or the 'light 12-pounder gun' (Instruction for Field Artillery). "
       "NOT IN THESE EDITIONS: 3-inch ordnance rifle, 10-/20-pdr Parrott, James, Whitworth, Blakely (see negative_findings, re-checked by drill_check.py). "
       "Table OCR is damaged: each table item lists OCR tokens and readings with a reading_confidence; page images were not inspected. Items marked tier 'inferred (arithmetic)' are derived by addition/multiplication from documented figures.")


OMFT = {'page': 329, 'confidence': 'low', 'basis_line': 45883, 'basis_text': 'FIELD TRAIN',
        'why': 'Field Train section opens at p. 329 (index "FIELD TRAIN, 329"; head at OCR line 45883); the next legible head is 331 at line 46102, so this text is p. 329 or 330 - the intervening head was not found'}


def S(id, topic, manual, ref, phrase, para, **kw):
    d = {'id': id, 'topic': topic, 'manual': manual, 'ref': ref, 'phrase': phrase, 'paraphrase': para}
    d.update(kw)
    return d


def rows(*pairs):
    """pairs of (elevation, range_token_as_read_in_OCR, reading_yd_or_None, note)"""
    out = []
    for p in pairs:
        el, tok, val = p[0], p[1], p[2]
        out.append({'elevation': el, 'range_ocr': tok, 'range_yd_reading': val, 'note': p[3] if len(p) > 3 else ''})
    return out


SPECS = [
    # ================================================================== chests: rounds per limber chest / caisson (FA Part I, Ammunition carried in each chest)
    S('ORD-CHEST-LT12', 'chest_contents', FA, 'Part I, Ammunition carried in each Chest (p. 19-20): light 12-pounder gun',
      'Fob liqht 12-poundeb qun. Shot, fixed',
      'Limber/caisson chest for the light 12-pounder gun (= the Napoleon): 12 fixed shot (184.8 lb), 12 spherical case (176.4 lb), 4 shells (48.7 lb), 4 canisters (67.6 lb) = 32 rounds, plus 2 spare cartridges of 2.5 lb, 48 friction primers, 2 yd slow-match, 4 portfires; total OCR "484-1" lb. '
      'The category labels for spherical case and friction primers are dropped by the OCR; assignment is by order and confirmed by arithmetic (sum of the legible weights 184.8+176.4+48.7+67.6+5+0.4+0.5+0.7 = 484.1).',
      data={'piece': 'light 12-pounder gun (Napoleon)', 'rounds': {'shot': 12, 'spherical_case': 12, 'shell': 4, 'canister': 4}, 'rounds_total': 32,
            'weights_lb': {'shot': 184.8, 'spherical_case': 176.4, 'shell': 48.7, 'canister': 67.6, 'chest_total': 484.1},
            'other': {'spare_cartridges': '2 x 2.5 lb', 'friction_primers': 48, 'slow_match_yd': 2, 'portfires': 4},
            'placement': {'shot': 'in 2d, 3d and 4th divisions, left half', 'spherical_case': 'in 1st, 2d and 3d divisions, right half', 'shell': 'in 1st division, left half', 'canister': 'in 4th division, right half'}},
      reading_confidence='medium-high (arithmetic check closes to 484.1 lb)', ocr_quality='noisy', tier='documented'),
    S('ORD-CHEST-12', 'chest_contents', FA, 'Part I, Ammunition carried in each Chest (p. 19): 12-pounder gun',
      'Fob 12-poundeb qun. Shot, fixed',
      'Chest for the (heavy) 12-pounder gun: 20 shot (308 lb), 8 spherical case (117.6 lb), 4 canisters (67.6 lb) = 32 rounds, 2 spare cartridges, 48 primers, 2 yd slow-match, 4 portfires; total OCR "499 8" (= 499.8 by addition).',
      data={'piece': '12-pounder gun', 'rounds': {'shot': 20, 'spherical_case': 8, 'canister': 4}, 'rounds_total': 32, 'weights_lb': {'shot': 308.0, 'spherical_case': 117.6, 'canister': 67.6, 'chest_total': 499.8}},
      reading_confidence='medium-high (arithmetic closes to 499.8)', ocr_quality='noisy'),
    S('ORD-CHEST-6', 'chest_contents', FA, 'Part I, Ammunition carried in each Chest (p. 19): 6-pounder gun',
      'Fob 6-podndeb avs. Shot, fixed',
      'Chest for the 6-pounder gun: 25 shot (190 lb), 20 spherical case (140 lb), 5 canisters (42 lb) = 50 rounds, 2 spare cartridges of 1.25 lb; the OCR total reads "876-1" but the legible weights add to 376.1 lb (digit damage). '
      '50 rounds is the PDF\'s "50 per rifle chest" figure, but it belongs here to the 6-pdr gun - no rifle chest is printed in any of these texts.',
      data={'piece': '6-pounder gun', 'rounds': {'shot': 25, 'spherical_case': 20, 'canister': 5}, 'rounds_total': 50, 'weights_lb': {'shot': 190.0, 'spherical_case': 140.0, 'canister': 42.0, 'chest_total_ocr': '876-1', 'chest_total_by_addition': 376.1}},
      reading_confidence='medium (OCR total 876-1 vs addition 376.1)', ocr_quality='noisy'),
    S('ORD-CHEST-OM', 'chest_contents', OM, 'Ch. XI Equipment of field carriages, "Ammunition carried in each Chest" (pp. 303-304)',
      'FOR 12-roi\'NllER GUN. Shot, fixed',
      'The Ordnance Manual (1850 text) prints the same kind of chest table for the 6-pdr gun, 12-pdr gun, 12-pdr, 24-pdr and 32-pdr howitzers, but has NO light 12-pounder (Napoleon) chest; its column OCR is too scrambled to read counts reliably, '
      'so the Instruction for Field Artillery (1860) table is used as the primary chest source.', data={'light_12_present': False}, reading_confidence='unreadable columns', ocr_quality='noisy', page_override=None),
    S('ORD-CAISSON', 'chest_contents', FA, 'School of the Piece / Manoeuvres, para 444: cannoneers seated on the chests',
      'Nos. 3, 4, and 8 on tlic middle chest of the caisson.',
      'A caisson carries three ammunition chests: the limber chest, a middle chest and a rear chest (cannoneers sit on the limber chest and the middle chest; Nos. 6 and 7 may mount the rear chest). The same chest design fits the limber and the caisson, '
      'so a light-12 caisson holds 3 x 32 = 96 rounds (derived) and a gun with its caisson 4 x 32 = 128 rounds.',
      data={'chests_per_caisson': 3, 'chests_per_gun_with_one_caisson': 4, 'derived_rounds_per_caisson_light12': 96, 'derived_rounds_per_gun_plus_caisson_light12': 128},
      tier='documented (chest count); derived arithmetic marked', ocr_quality='minor-noise', verbatim2='to mount the rear chest of the caisson.'),
    S('ORD-BATT-WAR', 'battery_stock', FA, 'Part I Art. II, Composition and equipment of a battery for war (pp. 7-8)',
      'Total number of rounds with a battery..',
      'War establishment table (OCR columns damaged): totals read 1,218 / 1,344 / 1,112 rounds for the three battery types; for the light-12 battery (6 guns, 12 caissons) 1,344 = 42 chests x 32 rounds, composed of 504 shot, 504 spherical case, 168 shell, 168 canister '
      '(OCR "604 504 168 168" = 504,504,168,168 by the 12:12:4:4 chest ratio). Campaign allowance is double this, about 400 rounds per piece, 200 accompanying the battery.',
      data={'light12_battery_rounds_total': 1344, 'per_gun': 224, 'composition_derived': {'shot': 504, 'spherical_case': 504, 'shell': 168, 'canister': 168},
            'chests': 'six limber chests + twelve caissons x 3 = 42 chests x 32 rounds'},
      reading_confidence='medium (column attribution inferred; 1,344 and 224/gun reproduce exactly from the chest table)', ocr_quality='noisy', tier='documented figures; composition inferred (arithmetic)'),
    S('ORD-BATT-PDR', 'battery_stock', FA, 'Derived comparison with PDF B.6.14.2 (288/288/96/96 per six-Napoleon battery)',
      'The number of friction primers is fifty per cent, greater than',
      'The PDF\'s "typical stock for a six-Napoleon battery: 288 solid shot, 288 spherical case, 96 shell, 96 canister" (768 rounds) equals 24 chests x (12,12,4,4): six guns each with one limber chest and one three-chest caisson (4 x 6 = 24 chests). '
      'So the PDF figure is reproduced exactly from the documented chest contents with one caisson per gun; the manual\'s war establishment has two caissons per gun (1,344 rounds). Both are consistent with the chest table.',
      data={'chests': 24, 'rounds': 768, 'composition': {'shot': 288, 'spherical_case': 288, 'shell': 96, 'canister': 96}}, tier='inferred (arithmetic from documented chest contents)', ocr_quality='clean',
      verbatim2='or about 400 rounds per piece,'),
    # ================================================================== ranges (first graze for shot/shell; burst range for case with fuze time)
    S('ORD-RNG-GB-6', 'range_table', GB, 'Appendix p. 40-41, Ranges of Field Guns and Howitzers: 6-pdr field gun', '6-PDB. FIELD GUI*. 1.25 Shot 0 00 818',
      '6-pdr gun, 1.25 lb charge, shot: 0 deg 818 (probably 318), 1 deg 674, 2 deg 867, 3 deg 1138 (OCR "8 00"=3), 4 deg 1256, 5 deg 1523. Spherical case (1.0 lb): 2 deg 650, 2 deg 30 min 840, 3 deg 1060, time of flight 2-4 s.',
      data={'piece': '6-pdr gun', 'charge_lb': 1.25, 'projectile': 'shot', 'rows': rows(('0', '818', None, 'OCR 818; Ordnance Manual reads 316, FA reads 820: printed value probably 318-320'), ('1', '674', 674), ('2', '867', 867), ('3', '1138', 1138, 'elevation OCR "8 00"'), ('4', '1256', 1256), ('5', '1523', 1523))},
      verbatim2='5 00 1523 1.00 Sph. case 2 00 650', reading_confidence='medium', ocr_quality='noisy'),
    S('ORD-RNG-GB-12', 'range_table', GB, 'Appendix p. 41: 12-pdr field gun (older model)', '12-PDR. VlELD CUJf. 2.50 Shot 0 00 847',
      '12-pdr gun, 2.5 lb charge, shot: 0 deg 847 (Ordnance Manual: 341), 1 deg 662, 1 deg 30 min 785, 2 deg 909, 3 deg 1269, 4 deg 1466, 5 deg 1663. Spherical case (1.5 lb): 1 deg 670, 1 deg 45 min 950, 2 deg 30 min 1250.',
      data={'piece': '12-pdr gun (heavy)', 'charge_lb': 2.5, 'projectile': 'shot', 'rows': rows(('0', '847', None, 'Ordnance Manual OCR 341'), ('1', '662', 662), ('1 30', '785', 785), ('2', '909', 909), ('3', '1269', 1269, 'Ordnance Manual OCR 1869'), ('4', '1466', 1466, 'Ordnance Manual OCR L45S'), ('5', '1663', 1663))},
      verbatim2='M 4 00 1466 • < 5 00 1663 1.50 Sph. case.', reading_confidence='medium-high (two sources agree at 1, 1.5, 2, 5 deg)', ocr_quality='noisy'),
    S('ORD-RNG-GB-NEW12', 'range_table', GB, 'Appendix p. 41: "New 12-pdr gun" (= the later light 12-pdr / Napoleon)', 'hew 12\'Pde. mi*, 2.50 Shot',
      'The "new 12-pdr gun" (Napoleon), 2.5 lb charge, shot: 0 deg 325, 1 deg 615, 1 deg 30 min 784, 2 deg 876, 3 deg "ISO]" (about 1,20x), 4 deg "1822" (cannot exceed the 5 deg value, so a damaged digit), 5 deg 1619. '
      'Shell (2.0 lb): 3 deg 45 min 1300. Spherical case (2.5 lb): 3 deg 45 min 1135. These reproduce the PDF\'s 1,619 yd (5 deg), 1,300 yd (shell) and 1,135 yd (case) - the "field-artillery article" values.',
      data={'piece': 'new 12-pdr gun (Napoleon)', 'charge_lb': 2.5, 'projectile': 'shot', 'rows': rows(('0', '325', 325), ('1', '615', 615), ('1 30', '784', 784), ('2', '876', 876), ('3', 'ISO]', None, 'damaged; FA reads 1,200'), ('4', '1822', None, 'damaged; exceeds 5 deg value'), ('5', '1619', 1619)),
            'shell_2lb': {'rows': rows(('2', '787', 787), ('2 30', '1*26', None), ('3', 'lo79', 1079), ('3 45', '1300', 1300))},
            'spherical_case_2.5lb': {'rows': rows(('3 45', '1135', 1135, 'last of the sph. case values; other values 804 574 633 731 unresolved'))}},
      verbatim2='325 615 784 876 ISO] 1822 1619 2.00 ShelL', reading_confidence='high for 5 deg 1619, 3 deg 45 min 1300 and 1135; medium elsewhere', ocr_quality='noisy'),
    S('ORD-RNG-GB-12HOW', 'range_table', GB, 'Appendix p. 41-42: 12-pdr field howitzer', '1 2-pdb. nxu> uowiTztt. 1.00 Shell',
      '12-pdr howitzer, 1.0 lb charge, shell: 0 deg 195, 1 deg 539, 2 deg 640 (OCR "A40"), 3 deg 847, 4 deg 975, 5 deg 1072. Spherical case (0.75 lb) 2 deg 15 min .. 3 deg 45 min: 485, 715, 1050.',
      data={'piece': '12-pdr howitzer', 'charge_lb': 1.0, 'projectile': 'shell', 'rows': rows(('0', '195', 195), ('1', '539', 539), ('2', 'A40', 640), ('3', '847', 847), ('4', '975', 975), ('5', '1072', 1072))},
      verbatim2='195 539 A40 847 975 | 1072 i I 0.75', reading_confidence='high (Ordnance Manual agrees: 195 539 .. 975 1072)', ocr_quality='noisy'),
    S('ORD-RNG-GB-24HOW', 'range_table', GB, 'Appendix p. 42: 24-pdr field howitzer', 'Z4-PDR. FIELD HOWITZER. 2.00 ShelL 0 00 295',
      '24-pdr howitzer, 2.0 lb charge, shell: 0 deg 295, 1 deg 516, 2 deg (damaged, about 7xx), 3 deg 976, 4 deg 1272 (Ordnance Manual; Gibbon "1X29" damaged), 5 deg 1322 per the Ordnance Manual OCR (matches the PDF).',
      data={'piece': '24-pdr howitzer', 'charge_lb': 2.0, 'projectile': 'shell', 'rows': rows(('0', '295', 295), ('1', '516', 516), ('2', 'i 70', None), ('3', '976', 976), ('4', '1X29', None, 'Ordnance Manual reads 1272'), ('5', 'L322 (Ordnance Manual)', 1322))},
      verbatim2='II Z Uv i 70 it 3 00 976 14 4 00 1X29.', reading_confidence='medium (5 deg from the Ordnance Manual)', ocr_quality='noisy'),
    S('ORD-RNG-GB-32HOW', 'range_table', GB, 'Appendix p. 42: 32-pdr field howitzer', '32-rDK. KIELD HOWITZER. 2.50 Shell 0 00 290',
      '32-pdr howitzer, 2.5 lb charge, shell: 0 deg 290, 1 deg 531, 2 deg 779, 3 deg 1029 (OCR "102*"), 4 deg 1203, 5 deg 1504.',
      data={'piece': '32-pdr howitzer', 'charge_lb': 2.5, 'projectile': 'shell', 'rows': rows(('0', '290', 290), ('1', '531', 531), ('2', '779', 779), ('3', '102*', None, 'Ordnance Manual reads L029'), ('4', '1203', 1203), ('5', '1504', 1504))},
      reading_confidence='high (two sources agree)', ocr_quality='noisy'),
    S('ORD-RNG-GB-MTN', 'range_table', GB, 'Appendix p. 42: mountain howitzer', 'Ranges of Mountain Howitzer. Charge. Ball. Elevation. Range.',
      'Mountain howitzer (12-pdr), 0.5 lb charge, shell: 0 deg 170, 1 deg 300, 2 deg 392, then to 5 deg about 1,005 per the Ordnance Manual (OCR "10(1.-" ).',
      data={'piece': '12-pdr mountain howitzer', 'charge_lb': 0.5, 'projectile': 'shell', 'rows': rows(('0', '170', 170), ('1', '300', 300), ('2', '392', 392), ('5', '10(1.- (Ordnance Manual)', 1005, 'PDF gives 1,005'))},
      verbatim2='0.5 Shell 0 00 170 M 1 00 300 M 2 00 392', reading_confidence='medium', ocr_quality='noisy'),
    S('ORD-RNG-FA-LT12', 'range_table', FA, 'Part I Art. III, Ranges of Field Guns and Howitzers, p. 44: LIGHT 12-PDR GUN',
      'LI08T 12-PDB. QUN.. 2-5 Shot. 0 1 325 620',
      'Light 12-pounder gun (Napoleon), 2.5 lb, shot, read in pairs: 0 deg 325, 1 deg 620, 2 deg 875, 3 deg 1,200, 4 deg "1,820" (cannot exceed 5 deg; damaged digit), 5 deg 1,680 - this is the PDF\'s 1,680 yd (Napoleon article). '
      'Shell: 3 deg 45 min 1,300; spherical case: 3 deg 45 min 1,130 (Gibbon 1,135). So 1,619 (Gibbon appendix) and 1,680 (Instruction for Field Artillery) are both PRINTED values from the two manuals, not one value mis-copied.',
      data={'piece': 'light 12-pdr gun (Napoleon)', 'charge_lb': 2.5, 'projectile': 'shot', 'rows': rows(('0', '325', 325), ('1', '620', 620), ('2', '875', 875), ('3', '1,200', 1200), ('4', '1,820', None, 'damaged'), ('5', '1,680', 1680)),
            'shell': {'charge_lb_ocr': '2-5', 'rows': rows(('0', '800', None, 'OCR 800; likely 300'), ('0 30', '425', 425), ('1', '626', None), ('1 30', '700', 700), ('2', '775', 775), ('2 30', '925', 925), ('3', '1,075', 1075), ('3 45', '1,300', 1300))}},
      verbatim2='it 4 6 1,820 1,680', reading_confidence='high for 5 deg 1,680 and shell 3 deg 45 min 1,300; medium elsewhere', ocr_quality='noisy'),
    S('ORD-RNG-FA-6', 'range_table', FA, 'Part I Art. III, Ranges, p. 43-44: 6-PDR GUN', '6-PDR. QUN 1-25 Shot. 0 1 820 675',
      '6-pdr gun, 1.25 lb, shot: 0 deg 820 (probably 320), 1 deg 675, 2 deg 870, 3 deg 1,140, 4 deg 1,250, 5 deg 1,625 - the Gibbon and Ordnance Manual OCR give 1523 at 5 deg (PDF 1,523); the FA value is as OCR reads and is unresolved (6 vs 5, 5 vs 3).',
      data={'piece': '6-pdr gun', 'charge_lb': 1.25, 'projectile': 'shot', 'rows': rows(('0', '820', None), ('1', '675', 675), ('2', '870', 870), ('3', '1,140', 1140), ('4', '1,250', 1250), ('5', '1,625', None, 'differs from Gibbon/Ordnance 1523: unresolved'))},
      reading_confidence='medium', ocr_quality='noisy'),
    S('ORD-RNG-OM-6-12', 'range_table', OM, 'Ch. XIII Artillery practice, Ranges of Field Guns and Howitzers (pp. 359-360)', 'Yard! 316 674 \' 1 523',
      'Ordnance Manual table (same data as Gibbon\'s appendix): 6-pdr gun 316, 674, .., 1 523 yd; 12-pdr gun 341, 662, 785 (1 deg 30 min), 909, "1869", "L45S", "L663" (1,663 at 5 deg); 12-pdr howitzer 195, 539, .., 975, 1072; 24-pdr howitzer 295, 516, .., 976, 1272, "L322"; 32-pdr howitzer 290, 531, 779, 1029, 1203, 1504; mountain howitzer to 1005. No light 12-pdr appears.',
      data={'light_12_present': False, 'five_degree_values_ocr': {'6-pdr': '1 523', '12-pdr gun': 'L663', '12-pdr howitzer': '1072', '24-pdr howitzer': 'L322', '32-pdr howitzer': '1504', 'mountain howitzer': '10(1.-'}},
      verbatim2='•• 3 1869 •• •1 L45S 1.5 Sp. case 5 1 L663 670', reading_confidence='medium', ocr_quality='noisy'),
    # ================================================================== charges, projectile data
    S('ORD-CHG-FA', 'charges', FA, 'Part I Ammunition, Charges of powder (p. 11)', 'The same ammunitioQ is used for the 12-pounder and light 12-poQndcr guns.',
      'Service charges: 12-pdr gun and light 12-pdr gun 2.5 lb for shot (the same ammunition is used for both); 6-pdr gun 1.25 lb; 12-pdr howitzer 1.0 lb; 24-pdr howitzer 2.0 lb; 32-pdr howitzer 2.5 lb (table column OCR scrambled; confirmed by the range-table charge columns). '
      'Gibbon\'s range table gives the new 12-pdr 2.5 lb shot / 2.0 lb shell / 2.5 lb spherical case, matching the PDF (2.5 lb shot and case, 2.0 lb shell); the FA range-table OCR reads 2-5 for the shell, a conflict (OCR or edition) left open.',
      data={'charges_lb': {'6-pdr gun': 1.25, '12-pdr gun': 2.5, 'light 12-pdr gun': {'shot': 2.5, 'shell_Gibbon': 2.0, 'shell_FA_OCR': 2.5, 'spherical_case': 2.5}, '12-pdr howitzer': 1.0, '24-pdr howitzer': 2.0, '32-pdr howitzer': 2.5, 'mountain howitzer': 0.5}},
      reading_confidence='medium', ocr_quality='noisy'),
    S('ORD-PRJ-CANISTER', 'projectile', FA, 'Part I Projectiles (p. 11-12)', 'Canisters for guns contain 21 shots each ; those for howitzers',
      'Canister: tin cylinder on a sabot filled with cast-iron shot in four tiers; OCR reads 21 shot for guns, 48 for howitzers. The PDF says 27 balls of 1.49 in. for the Napoleon; Gibbon\'s appendix canister table OCR shows "27" and diameters 1.49/1.46 for the 12-pdr class. '
      'The FA "21" is likely an OCR confusion of 27 (7->1), but this is not settled without the page image.',
      data={'balls_gun_canister_ocr': 21, 'balls_howitzer_canister_ocr': 48, 'pdf_value': 27, 'status': 'unsettled (21 vs 27)'}, reading_confidence='low', ocr_quality='noisy'),
    S('ORD-PRJ-CASE', 'projectile', FA, 'Part I, Charges for spherical case shot (p. 13)', 'Number of musket balls Bursting charge of powder oz. Weight of shot, loaded lbs.',
      'Spherical case, balls per shot (OCR order 32-, 24-, 12-, 6-pdr): 245, 175, 76, 37; bursting charge 1.4/1.2/1.0/0.5 oz (OCR); loaded weight 32/24/11.77/6.55 lb. For the 12-pdr the OCR says 76 balls, 11.77 lb; the PDF says 78 balls, 12.1 lb - unresolved (76/78 digit ambiguity; weight differs).',
      data={'balls': {'32-pdr': 245, '24-pdr': 175, '12-pdr': 76, '6-pdr': 37}, 'loaded_weight_lb': {'12-pdr': 11.77, '6-pdr': 6.55}}, reading_confidence='low-medium', ocr_quality='noisy'),
    S('ORD-PRJ-WEIGHTS', 'projectile', FA, 'Part I, Weights of fixed ammunition (p. 15)', 'WEIGHTS OF FIXED AMMUNITION.',
      'The fixed-ammunition weight table is column-scrambled. Per-round weights (projectile + cartridge + sabot) cross-checked from the chest table: light-12/12-pdr shot round 15.4 lb, spherical-case round 14.7 lb, shell round 12.2 lb, canister round 16.9 lb; 6-pdr shot 7.6, case 7.0, canister 8.4 lb. '
      'The PDF\'s projectile-only weights (12.25 lb shot, 12.1 case, 12.3 shell, 14.8 canister) are not separable in this OCR; the number 14-8 does occur in the table.',
      data={'round_weights_lb_derived': {'12-pdr/light 12-pdr': {'shot': 15.4, 'spherical_case': 14.7, 'shell': 12.2, 'canister': 16.9}, '6-pdr': {'shot': 7.6, 'spherical_case': 7.0, 'canister': 8.4}}},
      tier='inferred (arithmetic from documented chest weights)', reading_confidence='medium', ocr_quality='noisy'),
    S('ORD-PRJ-CANISTER-GB', 'projectile', GB, 'Appendix, Dimensions and Weights of Canisters', 'Dimensions and Weights of Canister*.',
      'Gibbon\'s appendix has a canister-dimension table (large and small gauges, tiers, shot per canister); its OCR is too scrambled to read the 12-pdr gun line (27 shot in tiers is the only legible pattern: "Number of shot ... 27").',
      data={}, reading_confidence='unreadable', ocr_quality='noisy'),
    # ================================================================== fuzes and primers
    S('ORD-FUZE-FA', 'fuze', FA, 'Part I, Fuze (p. 13-14)', 'is the only kind at present used in the field artillery service.',
      'Bormann (Belgian) metallic time fuze: 1.5 in. disc, 0.5 in. thick, composition in a circular groove under a soft-metal cover marked in seconds and fractions up to 5.5 s; the cover is cut with the fuze-cutter/gouge to expose the composition to the discharge flame; two cutters per piece.',
      data={'fuze': 'Bormann', 'max_time_s': 5.5, 'disc_in': 1.5}, reading_confidence='high', ocr_quality='minor-noise', verbatim2='which is the longest time for which these fuzes are constructed.'),
    S('ORD-FUZE-GB', 'fuze', GB, 'Ch. IX Fuzes: the paper fuze (p. ~287)', 'Black Burns 2" to the inch.',
      'Gibbon\'s paper fuze: colour gives the rate - black 2, red 3, green 4, yellow 5 seconds to the inch; each fuze two inches long (yellow 10 s); shorter times by cutting with a knife; used with a conical fuze-plug pressed in by thumb. '
      'The PDF\'s "about 4 seconds per inch" paper fuze corresponds to the green fuze here. Gibbon also describes the Belgian "Boarmann" (Bormann) fuze as the best and most regular in use.',
      data={'paper_fuze_seconds_per_inch': {'black': 2, 'red': 3, 'green': 4, 'yellow': 5}, 'length_in': 2}, reading_confidence='high', ocr_quality='minor-noise',
      verbatim2='The Paper-Fuze, Fig. 172, is a better form, and'),
    S('ORD-FUZE-GB-BOR', 'fuze', GB, 'Ch. IX Fuzes: Belgian (Bormann) fuze', 'by far the best and most regular of anv',
      'Gibbon: the Belgian or "Boarmann" fuze is "by far the best and most regular" in use; composition pressed on end and burnt from the end, avoiding the irregularity of fuzes driven in layers; case of lead-tin composition.', reading_confidence='high', ocr_quality='minor-noise', data={}),
    S('ORD-PRIMER-FA', 'primer', FA, 'Part I, Friction primers (p. 14)', 'filled with rifle powder and inserted in the vent at the moment of firing.',
      'Friction primer: rifle-powder tube inserted in the vent, ignited by pulling a rough wire through a friction composition (1 part potassium chlorate : 2 antimony sulphide, gum arabic); primers issued at 150 per cent of the rounds.', reading_confidence='high', ocr_quality='minor-noise', data={}),
    # ================================================================== small arms (supporting the infantry file)
    S('ORD-OM-ROUNDS-CANNON', 'campaign_stock', OM, 'Ch. XIII/XIV, Field train: ammunition for cannon', '200 rounds to each piece, both of the reserves and of the active batteries.',
      'Ordnance Manual allowance: 200 rounds to each piece, in the reserves and in the active batteries; what the caissons cannot carry is kept in boxes with the reserves.', data={}, reading_confidence='high', ocr_quality='clean', page_override=OMFT),
    S('ORD-OM-ROUNDS-SMALL', 'campaign_stock', OM, 'Ch. XIII/XIV, Field train: ammunition for small arms', '100 rounds to each man ; of which, for the musket,',
      'Ordnance Manual allowance: 100 rounds a man, of which 40 (OCR "10") in the cartridge box and 60 in the parks of reserve (the OCR digit "10" is read as 40 because 100 - 60 = 40). The PDF\'s Union 40 in the box is consistent.',
      data={'per_man': 100, 'in_box_ocr': '10', 'in_box_reading': 40, 'in_reserve': 60}, reading_confidence='medium', ocr_quality='noisy', verbatim2='tridge bos, 60 in the parks ol reserve.', page_override=OMFT),
]

EXTRA = {
    'compare_with_pdf_B_6_14_1': [
        {'quantity': 'Napoleon (light/new 12-pdr) round shot range at 5 deg', 'pdf_values': ['1,619 yd (field-artillery article)', '1,680 yd (Napoleon article)'],
         'found': 'Gibbon 1860 Appendix: 1619 (new 12-pdr gun, 2.5 lb). Instruction for Field Artillery: 1,680 (light 12-pdr gun, 2.5 lb). Both printed.', 'verdict': 'BOTH PDF VALUES CONFIRMED, each from a different manual; they are not a single mis-copied value',
         'items': ['ORD-RNG-GB-NEW12', 'ORD-RNG-FA-LT12']},
        {'quantity': 'Napoleon canister effective range', 'pdf_values': ['about 350 yd', 'about 400 yd'],
         'found': 'FA: canister begins at 350 yd (double canister 150-160 yd); Gibbon: good at 300-600 yd, maximum effect 400-450 yd', 'verdict': 'PDF 350 CONFIRMED (FA); 400 is inside Gibbon\'s 400-450 maximum band; neither text says "effective range 400"', 'items': ['ART-FA-101', 'ART-GB-22']},
        {'quantity': '6-pdr 5 deg', 'pdf_values': ['1,523'], 'found': 'Gibbon 1523 and Ordnance Manual "1 523"; FA OCR reads 1,625', 'verdict': 'CONFIRMED (two sources); FA value unresolved', 'items': ['ORD-RNG-GB-6', 'ORD-RNG-FA-6']},
        {'quantity': '12-pdr howitzer 5 deg', 'pdf_values': ['1,072'], 'found': 'Gibbon 1072; Ordnance Manual 1072', 'verdict': 'CONFIRMED', 'items': ['ORD-RNG-GB-12HOW']},
        {'quantity': '24-pdr howitzer 5 deg', 'pdf_values': ['1,322'], 'found': 'Ordnance Manual OCR "L322" (Gibbon 4 deg value damaged)', 'verdict': 'CONFIRMED (Ordnance Manual)', 'items': ['ORD-RNG-GB-24HOW', 'ORD-RNG-OM-6-12']},
        {'quantity': '12-pdr mountain howitzer 5 deg', 'pdf_values': ['1,005'], 'found': 'Ordnance Manual "10(1.-" read as 1005', 'verdict': 'CONFIRMED (damaged OCR, medium confidence)', 'items': ['ORD-RNG-GB-MTN']},
        {'quantity': 'Napoleon shell 3 deg 45 min / spherical case 3 deg 45 min', 'pdf_values': ['1,300 yd', '1,135 yd'], 'found': 'Gibbon 1300 and 1135; FA 1,300 and 1,130', 'verdict': 'CONFIRMED (1,135 Gibbon; FA 1,130 differs by 5 yd)', 'items': ['ORD-RNG-GB-NEW12', 'ORD-RNG-FA-LT12']},
        {'quantity': 'rounds per Napoleon limber chest', 'pdf_values': ['32 (open gap)'], 'found': '12 shot + 12 spherical case + 4 shell + 4 canister = 32', 'verdict': 'CONFIRMED', 'items': ['ORD-CHEST-LT12']},
        {'quantity': 'six-Napoleon battery stock 288/288/96/96', 'pdf_values': ['768 rounds'], 'found': '24 chests x 32 rounds reproduces the figure exactly (inferred arithmetic)', 'verdict': 'CONSISTENT with documented chest contents (one caisson per gun); the manual\'s war establishment is 1,344', 'items': ['ORD-BATT-PDR', 'ORD-BATT-WAR']},
        {'quantity': 'canister 27 balls of 1.49 in.', 'pdf_values': ['27 balls'], 'found': 'FA OCR 21; Gibbon table 27', 'verdict': 'UNSETTLED (OCR)', 'items': ['ORD-PRJ-CANISTER']},
        {'quantity': 'spherical case 78 balls, 12.1 lb', 'pdf_values': ['78 balls'], 'found': 'FA OCR 76 balls, 11.77 lb loaded', 'verdict': 'UNSETTLED / possible disagreement', 'items': ['ORD-PRJ-CASE']},
    ],
    'negative_findings': [
        {'claim': '3-inch ordnance rifle absent', 'manual': 'GIBBON-1860', 'regex': r'(?i)3-?inch\s+(ordnance|rifle)|ordnance\s+rifle', 'max_count': 0},
        {'claim': 'Parrott absent', 'manual': 'GIBBON-1860', 'regex': r'(?i)parrott', 'max_count': 0},
        {'claim': 'Parrott absent', 'manual': 'ORDNANCE-1861', 'regex': r'(?i)parrott', 'max_count': 0},
        {'claim': 'Parrott absent', 'manual': 'FIELDART-1863', 'regex': r'(?i)parrott', 'max_count': 0},
        {'claim': 'name Napoleon (as a gun) absent from the Ordnance Manual', 'manual': 'ORDNANCE-1861', 'regex': r'(?i)napoleon', 'max_count': 0},
        {'claim': 'name Napoleon (as a gun) absent from the Instruction for Field Artillery', 'manual': 'FIELDART-1863', 'regex': r'(?i)napoleon', 'max_count': 0},
        {'claim': 'Gibbon mentions Napoleon only as the emperor (3 hits, none a gun name; recount to catch change)', 'manual': 'GIBBON-1860', 'regex': r'(?i)napoleon', 'max_count': 3},
        {'claim': 'Whitworth/Blakely/James rifle absent from the Ordnance Manual', 'manual': 'ORDNANCE-1861', 'regex': r'(?i)whitworth|blakely|james\s+rifle', 'max_count': 0},
        {'claim': 'Hardee absent from Gibbon', 'manual': 'GIBBON-1860', 'regex': r'(?i)hardee', 'max_count': 0},
        {'claim': 'detachment drill ("chief of piece"/"Commence firing") absent from Gibbon', 'manual': 'GIBBON-1860', 'regex': r'(?i)commence\s+firing|chief\s+of\s+(the\s+)?piece', 'max_count': 0},
    ],
    'not_settled': ['canister ball count (21 vs 27)', 'spherical-case ball count (76 vs 78) and weight', 'FA 6-pdr 5 deg range (1,625 vs 1,523)', 'light-12 4 deg and 3 deg shot ranges (damaged digits)',
                    'projectile-only weights (12.25/12.1/12.3/14.8 lb) cannot be separated from round weights in the OCR', 'percussion caps per bundle of cartridges (OCR unreadable)'],
}
