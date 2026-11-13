# Hand-curated camera-position statements for the Q16 photograph registry. Every quote is checked against the saved source text by build_statements.py.
# Fields: id, src (source id), quote (verbatim; list = fragments of a two-column page, each verbatim, in reading order), loc (LOC record ids the statement is about),
#   res (LOC resource ids when the source names one), says (what the statement fixes, no more), prec (precision class), ident (how the source is tied to the LOC record).
# prec: place (a named place only) | place+dir (place and viewing direction) | place+dir+ref (place, direction and a named reference object) | dir (direction only) | rel (relative to a named object)
# Nothing here is a coordinate: no source read gives one (coordinates_published stays false for every statement).
# ident methods: 'id in the source' (the source cites the LOC id or reproduction number), 'record id' (the statement is the LOC record's own text),
#   'image match' (SIFT+RANSAC inliers in nps_then_to_loc.json, plus a look at both images), 'stereo number' (Gardner stereo number = LOC negative LC-B811 number; inferred),
#   'caption only' (identity not established; the record is a candidate, listed under cand).
S = []
def add(**k): S.append(k)

# ---------------------------------------------------------------- Library of Congress records (the item's own caption, notes or the negative sleeve caption)
add(id='PS-LOC-2012647712-T', src='LOC-2012647712', quote="View taken from Cemetery Hill at about position of right gun of Wiedrich's (i. e. Weidrich's) Battery", loc=['2012647712'], res=['ppmsca.32846'],
    says="camera on Cemetery Hill at about the position of the right gun of Wiedrich's Battery (title from item); no direction given in the title", prec='place+ref', ident='record id',
    note="The record's summary adds the German Reformed Church in the background and cites Frassanito: that part is not used (lead only).")
add(id='PS-LOC-2012647705-N', src='LOC-2012647705', quote="The lunettes in the foreground covered guns of Stewarts (B, 4th U.S. Artillery) Battery.", loc=['2012647705'], res=['ppmsca.32839'],
    says="the earthwork lunettes in the foreground of the 'cemetery gate' view covered guns of Stewart's battery (caption continues; Gardner's Sketch Book no. 39)", prec='rel', ident='record id')
add(id='PS-LOC-2014646001-N', src='LOC-2014646001', quote="The road on the left is the Baltimore pike.", loc=['2014646001'], res=['ppmsca.35051'],
    says="in the view of Gettysburg from Cemetery Hill the Baltimore Pike is the road on the left (Gardner's Sketch Book plate 35 caption as transcribed by LOC)", prec='place+dir+ref', ident='record id')
add(id='PS-LOC-2014646002-N1', src='LOC-2014646002', quote="Road on right is the Chambersburg pike. Embankment in centre is unfinished railroad. Large building on left is Pennsylvania College.", loc=['2014646002'], res=['ppmsca.35052'],
    says="view of Gettysburg from the northwest: Chambersburg Pike on the right, the unfinished railroad embankment in the centre, Pennsylvania College (large building) on the left", prec='place+dir+ref', ident='record id')
add(id='PS-LOC-2014646002-N2', src='LOC-2014646002', quote="which are shown in the background beyond the town", loc=['2014646002'], res=['ppmsca.35052'],
    says="Cemetery Hill and Culp's Hill are shown beyond the town in the background (caption continues)", prec='dir', ident='record id')
add(id='PS-LOC-2018671576-N', src='LOC-2018671576', quote="Caption from negative sleeve: Gettysburg from the Cemetery. July 1863.", loc=['2018671576'], res=['cwpb.00084'],
    says="the negative sleeve names the cemetery as the place of view and gives July 1863; which cemetery (Evergreen or the National Cemetery) is not stated", prec='place', ident='record id')
add(id='PS-LOC-2018666302-T', src='LOC-2018666302', quote="Breastworks on Little Round Top; Round Top in distance", loc=['2018666302'], res=['cwpb.04001'],
    says="camera on Little Round Top, Round Top (Big Round Top) in the distance (title from Milhollen and Mugridge 1977, LOC)", prec='place+dir', ident='record id')
add(id='PS-LOC-2018670708-N', src='LOC-2018670708', quote="Caption from negative sleeve: Big Round Top from entrenchments on Little Round Top. Gettysburg, Pa.", loc=['2018670708'], res=['cwpb.01654', 'cwpb.01653'],
    says="camera at entrenchments on Little Round Top, looking at Big Round Top (negative sleeve caption)", prec='place+dir', ident='record id')
add(id='PS-LOC-2012647707-T', src='LOC-2012647707', quote="Temporary entrenchments thrown up by the Federal troops on Little Round Top. Big Round Top in the background", loc=['2012647707'], res=['ppmsca.32841'],
    says="camera on Little Round Top looking toward Big Round Top (title from item)", prec='place+dir', ident='record id')
add(id='PS-LOC-2018670703-N', src='LOC-2018670703', quote="Caption from negative sleeve: View in wheatfield opposite our extreme left at Battle of Gettysburg.", loc=['2018670703'], res=['cwpb.00852', 'cwpb.00854'],
    says="camera in a wheatfield opposite the Federal extreme left (negative sleeve caption); no coordinates or direction", prec='place', ident='record id')
add(id='PS-LOC-2018670852-T', src='LOC-2018670852', quote="[Confederate dead, view looking toward the orchard on the Rose farm, July 5, 1863]", loc=['2018670852'], res=['cwpb.00888', 'cwpb.00889'],
    says="view looking toward the orchard on the Rose farm (title and exact date from Frassanito per the record: lead only, not used as documented)", prec='dir', ident='record id', tier='lead')
add(id='PS-LOC-2018670645-N', src='LOC-2018670645', quote="Caption from negative sleeve: Line of breastworks looking eastward, on battlefield of Gettysburg, July 1863.", loc=['2018670645'], res=['cwpb.00841', 'cwpb.00842'],
    says="view looking eastward at a line of breastworks (negative sleeve caption); where is not stated", prec='dir', ident='record id')
add(id='PS-LOC-2018666303-T', src='LOC-2018666303', quote="The center of the Federal position viewed from Little Round Top", loc=['2018666303'], res=['cwpb.01631', 'cwpb.01632'],
    says="camera on Little Round Top looking at the Federal centre (title from Milhollen and Mugridge)", prec='place+dir', ident='record id')
add(id='PS-LOC-2012647708-T', src='LOC-2012647708', quote="Little Round Top and Round Top", loc=['2012647708'], res=['ppmsca.32842'],
    says="the print's title: Little Round Top and Round Top; no camera position in the record (the NPS gives one: PS-TN-LRT1-DIR, PS-NPS-VISTA-10)", prec='none', ident='record id')
add(id='PS-LOC-2018666315-T', src='LOC-2018666315', quote="Three Confederate prisoners", loc=['2018666315'], res=['cwpb.01451', 'cwpb.01450', 'cwp.4a40909'],
    says="the record gives no place; the position statement is the National Park Service's (PS-NPS-CLR1D-146)", prec='none', ident='record id')
add(id='PS-LOC-2012647706-N', src='LOC-2012647706', quote="General Reynolds ordered Meredith's brigade to repel the attempts, and was sitting on his horse at the edge of the woods, encouraging the men as they passed him, when he was shot. McPherson's Woods.",
    loc=['2012647706'], res=['ppmsca.32840'], says="the print's own caption describes the clump of woods on the right of the picture as McPherson's Woods where Reynolds was shot; no camera position", prec='rel', ident='record id')
add(id='PS-LOC-2012646949-T', src='LOC-2012646949', quote="McPherson's woods in which Archer's (Confederate) Brigade was captured, view of the side towards the Chambersburg pike", loc=['2012646949'], res=['ppmsca.32833'],
    says="view of the side of McPherson's woods toward the Chambersburg Pike (title from item); camera side and distance not stated", prec='rel', ident='record id')
add(id='PS-LOC-2018666298-T', src='LOC-2018666298', quote="The Bryan house on 2d Corps line, near scene of Pickett's Charge", loc=['2018666298'], res=['cwpb.01860', 'cwpb.01861'],
    says="the Bryan house, on the Second Corps line; no camera position", prec='rel', ident='record id')
add(id='PS-LOC-2018666297-T', src='LOC-2018666297', quote="Headquarters of Gen. Robert E. Lee on the Chambersburg Pike", loc=['2018666297'], res=['cwpb.01652', 'cwpb.01651'],
    says="Lee's headquarters (Thompson house) on the Chambersburg Pike; no camera position", prec='rel', ident='record id')
add(id='PS-LOC-2018666296-T', src='LOC-2018666296', quote="Headquarters of Gen. George G. Meade on Cemetery Ridge", loc=['2018666296'], res=['cwpb.00887'],
    says="Meade's headquarters on Cemetery Ridge; no camera position", prec='rel', ident='record id')
add(id='PS-LOC-2018670894-T', src='LOC-2018670894', quote="View at Trostle's barn where the 9th Massachusetts Battery was cut up", loc=['2018670894'], res=['cwpb.00904', 'cwpb.00903'],
    says="view at Trostle's barn; no direction or distance", prec='place', ident='record id')
add(id='PS-LOC-2018670707-T', src='LOC-2018670707', quote="Lutheran Theological Seminary", loc=['2018670707'], res=['cwpb.01649', 'cwpb.01650'],
    says="the Lutheran Theological Seminary; no camera position in the record (the National Park Service gives one: PS-NPS-ROTV2-149)", prec='none', ident='record id')
add(id='PS-LOC-2018672361-T', src='LOC-2018672361', quote="View from Culp's hill", loc=['2018672361'], res=['cwpb.03772'],
    says="camera on Culp's Hill (title); no direction", prec='place', ident='record id')

# ---------------------------------------------------------------- National Park Service reports (official publications, saved texts under tmp/library/web/nps)
add(id='PS-NPS-CLRLRT-405', src='NPS-CLR-LRT', quote="Figure 4.05. View looking north from the summit of Little Round Top, July 1863 (Library of Congress Civil War Photos #01632u).", loc=['2018666303'], res=['cwpb.01632'],
    says="the photograph LOC cwpb 01632 (right half of record 2018666303) is a view looking north from the summit of Little Round Top, July 1863", prec='place+dir', ident='id in the source')
add(id='PS-NPS-CP3-29', src='NPS-COMMON-PRIDE-3', quote=["Scene looking northward toward Cemetery Hill from the crest of Little Round Top", "the horizon at the left center, while one is hard pressed to find the copse of trees"],
    loc=['2018666303'], says="a Brady/LOC photograph of July 1863 looks north toward Cemetery Hill from the crest of Little Round Top; Ziegler's Grove dominates the horizon at the left centre", prec='place+dir+ref', ident='image (composition: boulder left, pine right, as viewed on the NPS plate, pdf page 30)')
add(id='PS-NPS-BRIEN-9', src='NPS-BRIEN-FARM', quote="One photograph was taken east of the Brien house looking west and clearly shows the east side of the house, most of its southern front, the bake oven",
    loc=[], says="one of two photographs thought to be by Brady or his staff was taken east of the Brien house looking west (shows the east side of the house, most of its south front and the bake oven)", prec='place+dir+ref',
    ident='caption only', cand=['2018666298', '2012647702'])
add(id='PS-NPS-HSMCP-139', src='NPS-HS-MCPHERSON', quote="This photograph was taken from a point just east of the quarry and looks toward the Herbst", loc=['2012647706'],
    says="Brady photograph no. 5 of the McPherson farm and Herbst Woods (looking east-southeast, on or about July 15, 1863) was taken from a point just east of the quarry looking toward the Herbst woodlot", prec='place+dir+ref',
    ident='caption only (the NPS CLR First Day Fig. 0.1 cites the same view as LOC ppmsca 32840, record 2012647706; two descriptions of one view, not proven the same print)', cand=['2012647706'])
add(id='PS-NPS-HSMCP-139b', src='NPS-HS-MCPHERSON', quote="The cupola of the Lutheran Theological Seminary rises in the distance.", loc=['2012647706'],
    says="in that view the cupola of the Lutheran Theological Seminary rises in the distance", prec='ref', ident='caption only', cand=['2012647706'])
add(id='PS-NPS-CLR1D-01', src='NPS-CLR-1STDAY', quote="Figure 0.1. Herbst Woods, the farm woodlot that became famous as the place where General John Reynolds was killed, looking southeast from the McPherson Farm with the seminary cupola in the distance, July 1863. (Matthew Brady photograph, Library of Congress, image 32840v)",
    loc=['2012647706'], res=['ppmsca.32840'], says="LOC image ppmsca 32840 looks southeast from the McPherson Farm toward Herbst Woods with the seminary cupola in the distance", prec='place+dir+ref', ident='id in the source')
add(id='PS-NPS-CLR1D-124', src='NPS-CLR-1STDAY', quote=["Figure 1.24. The old quarry (pond) near the McPherson farmstead, looking", "southwest with the woodlot on the adjoining Herbst Farm (Herbst Woods)", "in the background, 1863. The fences were presumably damaged in the battle. (Library of Congress, digital ID ppmsca-32833)"],
    loc=['2012646949'], res=['ppmsca.32833'], says="LOC ppmsca 32833 shows the old quarry (pond) near the McPherson farmstead looking southwest, with Herbst Woods in the background", prec='place+dir+ref', ident='id in the source')
add(id='PS-NPS-CLR1D-146', src='NPS-CLR-1STDAY', quote=["Figure 1.46. Three Confederate prisoners on stacked-rail", "breastworks, probably along Seminary Lane, looking east with", "Gettysburg in the left distance, photographed circa July 15, 1863."],
    loc=['2018666315'], res=['cwp.4a40909'], says="three Confederate prisoners photograph (LC-DIG-cwp 4a40909): probably along Seminary Lane, looking east with Gettysburg in the left distance, about July 15, 1863 (hedged: 'probably')", prec='place+dir+ref', ident='id in the source')
add(id='PS-NPS-CLR1D-151', src='NPS-CLR-1STDAY', quote=["Figure 1.51. The battle-damaged house and grounds of Mary Thompson", "that served as Lee’s headquarters, looking north across the turnpike", "from the James Thompson house, ca. July 1863."],
    loc=['2018666297'], says="Lee's headquarters (Mary Thompson house) photograph, looking north across the turnpike from the James Thompson house, about July 1863 (LOC digital id cwp2003000189, which the record lists as another control number)", prec='place+dir+ref',
    ident='id in the source (LOC control number cwp2003000189 appears in record 2018666297)')
add(id='PS-NPS-CLRROTV2-149', src='NPS-CLR-ROT-V2', quote="Figure 149. Detail of sawn board nailed fence west of the Lutheran Seminary viewed from the Foulk Farm, 1863.", loc=['2018670707'], res=['cwpb.01650'],
    says="LOC cwpb 01650 (right half of record 2018670707) shows the fence west of the Lutheran Seminary viewed from the Foulk Farm, 1863", prec='place+ref', ident='id in the source')
add(id='PS-NPS-CLRCEM-126', src='NPS-CLR-CEMETERY', quote=["Figure 1.26. Stone fences along Baltimore Pike reconfigured as breastworks, looking north from the roof of the Evergreen Cemetery lodge shortly after the battle, July 1863."],
    loc=[], says="a July 1863 photograph (LOC LC-B815-273) looks north from the roof of the Evergreen Cemetery lodge along Baltimore Pike", prec='place+dir+ref', ident='negative number LC-B815-273 is not among the catalogued records (not identified)')
add(id='PS-NPS-LEISTER-11', src='NPS-HSR-LEISTER-BARN', quote="Leister farmstead from the southeast taken by Alexander Gardner shortly after the Battle.", loc=[], says="a Gardner photograph of the Leister farmstead was taken from the southeast", prec='place+dir+ref', ident='caption only: not identified with a catalogued record')
add(id='PS-NPS-LEISTER-20', src='NPS-HSR-LEISTER-BARN', quote="Leister B a m viewed from the south and east shortly after the Battle, July, 1863.", loc=[], says="a Gardner photograph of the Leister barn viewed from the south and east, July 1863", prec='place+dir+ref', ident='caption only: not identified with a catalogued record')
add(id='PS-NPS-VISTA-10', src='NPS-VISTA-CUTTING', quote="Two Brady photographs of Little Round Top, one view from the southwest near Devil's Den and a second view from the northwest at a point near the intersection of the present Wheatfield Road and Crawfor",
    loc=[], says="two Brady photographs of Little Round Top: one from the southwest near Devil's Den, one from the northwest near the present intersection of Wheatfield Road and Crawford Avenue", prec='place+dir+ref',
    ident='caption only (the report pages reproduce them only as stains: the scan is unreadable)', cand=['2012647708', '2012647701', '2018670709', '2018666301', '2018672207', '2018672403'])
add(id='PS-NPS-SPEN-5', src='NPS-SLAUGHTER-PEN', quote="the view is eastward from the Devil's Den, and most likely depicts", loc=['2018670867'],
    says="O'Sullivan 'View in the Slaughter Pen at the foot of Big Round Top', 6 July 1863: the view is eastward from the Devil's Den; the encircled body lies immediately east of the trolley roadbed", prec='place+dir',
    ident='caption only: the report plate is a photocopy and could not be matched; the O\'Sullivan "Slaughter pen" record 2018670867 (negative LC-B811-262) is a candidate', cand=['2018670867', '2018672114'])
add(id='PS-NPS-SPEN-6', src='NPS-SLAUGHTER-PEN', quote="The trolley road bed is just to the right of the picture.", loc=['2018666311'],
    says="Gardner no. 265, 6 July 1863, two dead infantrymen in the Slaughter Pen: the trolley road bed (now a path) is just to the right of the picture", prec='rel', ident='stereo number (265 = LC-B811-0265 of record 2018666311; the NPS Then-and-Now image matches cwpb.00901 of the same record)')
add(id='PS-NPS-SPEN-7', src='NPS-SLAUGHTER-PEN', quote="The area would be just above the present comfort station.", image_read=58, tier='inferred', loc=['2018666312'],
    says="Gibson no. 252, 6 July 1863, scene in the woods at the northwestern base of Big Round Top: the area would be just above the present comfort station", prec='place', ident='stereo number (252 = LC-B811-0252 of record 2018666312)')

add(id='PS-NPS-SPEN-3', src='NPS-SLAUGHTER-PEN', quote="North end of Slaughter Pen and Plum Run Valley (O'Sullivan), 6 July 1863", loc=[],
    says="plate 3 of the report: an O'Sullivan photograph of the north end of the Slaughter Pen and Plum Run Valley, 6 July 1863, with a large boulder carrying a trough visible in it", prec='place', ident='caption only: not identified with a catalogued record')
add(id='PS-NPS-SPEN-4', src='NPS-SLAUGHTER-PEN', quote="boulders of Plum Run gorge, which was the route of attack of that regiment of Benning's Brigade.", loc=['2018670625'],
    says="Gardner no. 229, 6 July 1863 (a dead Confederate soldier): taken in the mass of rocks and boulders of Plum Run gorge", prec='place', ident='stereo number (229 = LC-B811-229A/B of record 2018670625)')
add(id='PS-NPS-SPEN-8', src='NPS-SLAUGHTER-PEN', quote="Dead Confederate soldier, Devil's Den (Gardner #277), 6 July 1863 ... near the edge of the G.W. Weikert field", image_read=59, tier='inferred', loc=['2018666314'],
    says="Gardner no. 277, 6 July 1863: the soldier is near the edge of the G.W. Weikert field (read from the page image; the text layer of that page is empty)", prec='place', ident='stereo number (277 = LC-B811-0277 of record 2018666314)')

# ---------------------------------------------------------------- National Park Service Then-And-Now pages (official web pages, saved under tmp/library/web/photomatch/www.nps.gov)
add(id='PS-TN-INDEX', src='NPSWEB-TN-INDEX', quote="modern versions taken from the same location as the originals", loc=[], says="the NPS states that the modern pictures on its Then-And-Now pages were taken from the same location as the originals (no coordinates given)", prec='rel', ident='all 23 comparisons')
add(id='PS-TN-RW1-PLACE', src='NPSWEB-TN-RW1', quote="This photo was taken near DeTrobriand Avenue.", loc=['2012647823'], res=['ppmsca.32909'],
    says="Gardner stereo no. 257 (Confederate dead near the edge of the Rose Woods): the photo was taken near De Trobriand Avenue", prec='place', ident='image match (1469 inliers) and negative LC-B8184-257 of record 2012647823')
add(id='PS-TN-RW1-DIR', src='NPSWEB-TN-RW', quote="This view looks southwest, away from the Rose Woods.", loc=['2012647823'], res=['ppmsca.32909'], says="Gardner no. 257 looks southwest, away from the Rose Woods", prec='dir', ident='image match (1469 inliers)')
add(id='PS-TN-RW1-REF', src='NPSWEB-TN-RW', quote="The distinguishing marks on the large rock are still visible today.", loc=['2012647823'], res=['ppmsca.32909'], says="the large rock in the foreground of no. 257 is identifiable today (reference object, no coordinates)", prec='ref', ident='image match')
add(id='PS-TN-RW2-REF', src='NPSWEB-TN-RW', quote="A large split rock provides a reference point for the location of the original photograph.", loc=['2018670673'], res=['cwpb.00850'],
    says="Gardner no. 235: a large split rock is the reference point for the location of the original photograph", prec='ref', ident='image match (291 inliers)')
add(id='PS-TN-RW3-DIR', src='NPSWEB-TN-RW', quote="This view faces north.", loc=['2018666310'], res=['cwpb.00881'], says="Gardner no. 256 faces north", prec='dir', ident='image match (1411 inliers) and negative LC-B811-0256')
add(id='PS-TN-RW3-REF', src='NPSWEB-TN-RW', quote="The boulder in the foreground and dome shaped boulder in the background provide a reference point for where the camera tripod stood in 1863.", loc=['2018666310'], res=['cwpb.00881'],
    says="two boulders in no. 256 are the reference points for where the camera tripod stood (no coordinates)", prec='ref', ident='image match')
add(id='PS-TN-RW3-REL', src='NPSWEB-TN-RW', quote="the first Then & Now photograph of the same group was taken just a few steps northeast of this photo, facing west.", loc=['2012647823', '2018666310'],
    says="no. 257 was taken a few steps northeast of no. 256, facing west (the NPS caption of no. 257 says southwest)", prec='rel', ident='image match')
add(id='PS-TN-DD2', src='NPSWEB-TN-DD', quote="The modern photograph of this area reveals the Plum Run footbridge and the slope of Little Round Top in the distance.", loc=['2018666311'], res=['cwpb.00901'],
    says="the Slaughter Pen photograph by the pond: the same view today shows the Plum Run footbridge and the slope of Little Round Top in the distance", prec='ref', ident='image match (1470 inliers)')
add(id='PS-TN-DD8-STAGED', src='NPSWEB-TN-DD', quote="This staged photograph was taken more than four months after the battle, by Peter Weaver, on November 11, 1863", loc=['2012647845'], res=['ppmsca.32931'],
    says="the NPS calls the Weaver Devil's Den photograph of 11 November 1863 staged and more than four months after the battle; its image is LOC ppmsca 32931 (record 2012647845, added to the catalogue by mistake as July 1863 and reclassified: not July, staged)", prec='none', ident='image match (ppmsca.32931, 1236 inliers)')
add(id='PS-TN-DD7-STAGED', src='NPSWEB-TN-DD', quote="nor is it likely that the soldier fell in this location", loc=['2018666313'], res=['cwpb.04337'],
    says="the NPS says it is not likely the soldier of 'Home of a Rebel Sharpshooter' fell where he lies (staged-photograph flag basis; the body and niche are never used as ground truth)", prec='none', ident='image match (cwpb.04337, 1078 inliers; ppmsc.00171, 1144)')
add(id='PS-TN-DD5-MOVED', src='NPSWEB-TN-DD', quote="The body of this soldier would be moved by the photographers from this location to another one some 40 yards away", loc=['2018670874', '2018670741'],
    says="the NPS says the photographers moved the sharpshooter's body some 40 yards (staged-photograph flag basis)", prec='none', ident='image match (cwpb.00898, 1567 inliers; cwpb.00862, 1442)')
add(id='PS-TN-LRT2-DIR', src='NPSWEB-TN-LRT', quote="From its summit looking northward, one could see much of Gettysburg, including the Codori farm, Oak Hill, the Brian farm, the “Copse of Trees” and the Wheatfield Road.", loc=['2018666303'], res=['cwp.4a39686', 'cwpb.01632'],
    says="the NPS Then-And-Now image of the summit of Little Round Top: looking northward from the summit, the Codori farm, Oak Hill, the Brian farm, the Copse of Trees and the Wheatfield Road are in view", prec='place+dir+ref', ident='image match (cwp.4a39686 1302 inliers, cwpb.01632 642)')
add(id='PS-TN-LRT2-NOW', src='NPSWEB-TN-LRT', quote="A view from Little Round Top today. The Pennsylvania Memorial can be seen in the distance.", loc=['2018666303'], says="the modern NPS picture from the same vantage shows the Pennsylvania Memorial in the distance", prec='ref', ident='image match')
add(id='PS-TN-LRT3', src='NPSWEB-TN-LRT', quote="Natural and manmade fortifications built by Union troops on July 2, 1863 on the southern slope of Little Round Top.", loc=['2018666304'], res=['cwpb.00869'],
    says="the fortifications photograph (three large boulders) was taken on the southern slope of Little Round Top", prec='place', ident='image match (cwpb.00869 1370 inliers; the Gardner scan 1362)')
add(id='PS-TN-LRT1-DIR', src='NPSWEB-TN-LRT', quote="A photo of Little and Big Round Top, facing southeast. Photographer Matthew Brady can be seen leaning against a tree in the left foreground.", loc=['2012647708'], res=['ppmsca.32842'],
    says="the 'Little and Big Round Top from the Valley of Death' photograph faces southeast; Matthew Brady leans against a tree in the left foreground", prec='place+dir', ident='image match (ppmsca.32842, 1046 inliers)')
add(id='PS-TN-TR1', src='NPSWEB-TN-TR', quote="The monument to Bigelow's Battery can be seen on a rock between the house and the road.", loc=['2013645105'], res=['ppmsca.32844'],
    says="in the modern view of the Trostle house the monument to Bigelow's Battery stands on a rock between the house and the road (reference object)", prec='ref', ident='image match (ppmsca.32844, 463 inliers)')
add(id='PS-TN-TR2', src='NPSWEB-TN-TR', quote="The only sign remaining from the battle is a large hole in the brick gable of the barn left by a cannonball.", loc=['2018670894'], res=['cwpb.00904'],
    says="the Trostle barn photograph shows the barn gable with the cannonball hole (the same wall is visible today)", prec='ref', ident='image match (cwpb.00904, 1182 inliers)')
add(id='PS-TN-BF2', src='NPSWEB-TN-BF', quote="A photographer’s assistant sits on a fence, looking up at the Lutheran Theological Seminary building.", loc=['2018670707'], res=['cwpb.01649'],
    says="the Seminary photograph is taken from below the building, the assistant sitting on a fence in front of the camera (no coordinates)", prec='rel', ident='image match (cwpb.01649 49 inliers, a cropped NPS image)')
add(id='PS-TN-BF3', src='NPSWEB-TN-BF', quote="Photographer Matthew Brady photographed the gate house approximately two weeks after the battle.", loc=['2018666300'], res=['cwpb.01640'],
    says="Brady photographed the Evergreen Cemetery gatehouse about two weeks after the battle (the NPS picture matches record 2018666300)", prec='none', ident='image match (cwpb.01640, 59 inliers)')
add(id='PS-TN-BF5', src='NPSWEB-TN-BF', quote="This modern day picture looks north along the Taneytown Road.", loc=['2018666296'], res=['cwpb.00887'],
    says="the modern picture of the Leister house (Meade's headquarters) looks north along the Taneytown Road; the NPS states that modern pictures are from the same location as the originals", prec='place+dir', ident='image match (cwpb.00887, 718 inliers)')
