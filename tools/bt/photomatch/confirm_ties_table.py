# Hand-written decisions of the third pass (2026-11-14): each tie below was decided after the figure image and the Library image were looked at side by side (sheets made from nps_figures_to_loc.json)
# and after the geometry of the match (tie_geometry.py: same plate or only the same scene) was read. Executed by confirm_ties.py.
# CONFIRM: figure id -> (loc record, LOC resource, note[, [(second record, its resource), ...]]); the second records are other catalogue records of the same exposure that matched as well.
CONFIRM = {
 'NF-V1-p058-000': ('2018670660', 'cwpb.00846', 'the whole plate: a burial trench with grave boards and a wagon train beyond; the same exposure sits behind five images of the record (cwpb.00843 to 00847 match with 774, 746, 548, 440 and 214 inliers)'),
 'NF-V2-p121-000': ('2018670660', 'cwpb.00846', 'the same photograph as Figure 6 of volume I (the same park number 2B-2063): printed again in volume II'),
 'NF-V1-p125-000': ('2012647719', 'ppmsca.32853', 'two men standing in a field in front of a wood: the same photograph as ppmsca.32840 (record 2012647706; 424 inliers); both records match the same Metropolitan Museum print (MET268203) with a median residual under 1 px. The rule class of tie_geometry.py is SAME_SCENE only because the figure is turned 4.2 degrees against the bar of 4.0 degrees (inlier fraction 0.99, median residual 0.4 px); called the same photograph by looking and by the 0.99 inlier fraction and the 0.4 px residual, which another exposure would not give (the turn is a difference between the two scans, not of the scene)', [('2012647706', 'ppmsca.32840')]),
 'NF-V1-p159-000': ('2014646001', 'ppmsca.35051', 'a small detail of the print (scale 0.31 of its width); the caption names the Digital ID; the image match is corroboration only: 50 inliers, inlier fraction 0.62 (below the 0.80 bar of tie_geometry.py because a small detail holds few features), median residual 0.12 px'),
 'NF-V1-p243-000': ('2018666303', 'cwpb.01631', 'a detail (scale 0.39 of the width) of the view from Little Round Top; the caption names the Digital ID cwpb-01631'),
 'NF-V1-p251-000': ('2018666303', 'cwpb.01631', 'another detail of the same view (scale 0.39); the caption names the Digital ID cwpb-01631'),
 'NF-V1-p253-000': ('2018666296', 'cwp.4a39437', 'the same scene as the Library image (viewed side by side; 291 inliers of 301, scale 0.82); the park\'s own photograph number is the only credit and the caption says only "a stone wall near the western edge of Taneytown Road"'),
 'NF-V1-p265-000': ('2018670709', 'cwpb.01655', 'the same scene as the Library image (viewed side by side; 571 inliers, scale 0.90)'),
 'NF-V1-p277-000': ('2018666296', 'cwpb.00887', 'a detail of the orchard (scale 0.51 of the width); the caption names the Digital ID cwpb 00887'),
 'NF-V1-p282-000': ('2018666296', 'cwpb.00887', 'a detail of the house, the oak and the lane (scale 0.41 of the width: an enlargement of the central part of the plate, residual 0.14 px)'),
 'NF-V1-p283-000': ('2018666296', 'cwpb.00887', 'the whole plate; the caption names the Digital ID cwpb 00887 (1045 inliers of 1055)'),
 'NF-V1-p307-000': ('2012647704', 'ppmsca.32838', 'the figure shows the print without its mount; first seen in a targeted check of 26 images of 15 records of the cemetery and Culp\'s Hill, then in the full run (661 inliers); the lunettes, the tent at the right and the wooded hill are the same'),
 'NF-V1-p317-000': ('2018670704', 'cwpb.01644', 'men seated beside a log and a stone breastwork among trees; the figure is the same scene as one image of the record; median residual 2.4 px is higher than for the other ties, so a stereo sibling of the exposure cannot be ruled out'),
 'NF-V1-p432-000': ('91732551', 'cph.3g01831', 'a barn with a large tree and dead horses in front; the Library print is the same scene (the figure shows it without the card mount)'),
 'NF-V1-p433-000': ('2012647700', 'ppmsca.32834', 'a detail (scale 0.33 of the width) of the right-hand part of the print: the white house with dead horses in front'),
 'NF-V2-p114-000': ('2018666308', 'cwpb.00865', 'dead soldiers in a meadow in front of a wood with a rail fence at the right; the whole plate (882 inliers)'),
 'NF-V2-p120-000': ('2018666310', 'cwpb.00882', 'a wagon at the left and dead soldiers in a meadow; a detail (scale 0.61 of the width)'),
 'NF-V2-p122-000': ('2018672106', 'cwpb.00068', 'the left half of a stereo pair on one negative: a single tree with dead soldiers on the ground'),
 'NF-V2-p123-000': ('2018670703', 'cwpb.00854', 'dead soldiers side by side in a meadow with a boulder at the left'),
 'NF-V2-p152-000': ('2018672207', 'cwpb.03971', 'a rocky wooded slope; the whole plate'),
 'NF-V2-p329-002': ('2014646001', 'ppmsca.35051', 'a detail (scale 0.47 of the width) of the view of the town and the tent camp from the hill; the caption names the Digital ID'),
 'NF-V2-p344-000': ('2018666296', 'cwpb.00887', 'a detail of the rail fence and stone heap at the lower left of the plate (scale 0.44 of the width); the caption names the Digital ID cwpb 00887'),
}
# The six Metropolitan Museum items of the first run (images from archive.org copies; not Library records) matched to Library records (met_to_catalogue.json); decided after looking.
# MET: item -> (loc record, LOC resource, note)
MET = {
 'MMET268204': ('2014646002', 'ppmsca.35052', 'the left plate of a two-plate panorama: it covers the left half of the Library print (the footprint spans 0.00 to 0.53 of its width); the print joins the two plates'),
 'MMET268205': ('2014646002', 'ppmsca.35052', 'the right plate of the same panorama: it covers the right part of the Library print (the footprint spans 0.45 to 0.96 of its width); it overlaps the left plate by about 0.08 of the print'),
 'MMET268201': ('2018670711', 'cwpb.01662', 'the same scene as the Library negative (a white house with an outside stair); inlier fraction 0.58 and median residual 2.1 px, so the same exposure or its stereo sibling'),
 'MMET268202': ('2012646949', 'ppmsca.32833', 'a pond with a broken rail fence and a man; the same photograph as ppmsca.32833 and as ppmsca.32852 (record 2012647718): 619 and 586 inliers, residual under 1 px'),
 'MMET268203': ('2012647706', 'ppmsca.32840', 'two men standing in a field in front of a wood; the same photograph as ppmsca.32840 and ppmsca.32853 (record 2012647719): 1154 and 725 inliers, residual under 1 px'),
 'MMET286882': ('2012647835', 'ppmsca.32922', 'a print of dead soldiers lying on a field, mounted on a page with printed text; the same photograph as ppmsca.32922 (886 inliers); it also matches the negative cwpb.00849 of record 2018666307 (274 inliers)'),
}
