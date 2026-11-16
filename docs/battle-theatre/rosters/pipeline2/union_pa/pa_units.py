"""The 82 Pennsylvania units of the work item and where each one stands in Bates, History of Pennsylvania Volunteers (5 volumes).

Bates numbers the three-year regiments in one series: the Reserves are the 30th to 42nd Regiments, the First Artillery is the 43rd, the
First Cavalry the 44th and so on (the earlier PA family run used the same table, data/PA/scripts/unitmap.py).  Volume 1 first prints the
three-months regiments of April 1861 (1st to 25th Regiments and the Erie Regiment) and then the three-years regiments from the
Eleventh (re-organised) onwards; only the three-years rolls are the units that stood at Gettysburg, so the ranges below start at the
title leaf of the three-years regiment.

RANGES: (volume, first leaf, last leaf) of the leaves that may hold the regiment's rolls: from the leaf that carries the regiment's title
(the narrative history comes first and is skipped by the page classifier) up to the leaf before the next title.  The leaf is the 0-based
index of the item's page images (the same index as the hocr page index).  `also` lists leaves of the same regiment that the book prints
elsewhere (volume 4 binds the rolls of the 145th and 147th Regiments a second time among the cavalry).
Every range was checked against the printed running heads (pa_check_ranges.py writes the check to the diagnostics directory).
"""
# key, designation, volume, bates number, first leaf, last leaf, companies (None = every company of the regiment), extra leaf ranges
U = []


def u(key, vol, n, a, b, co=None, also=(), note=''):
    U.append(dict(key=key, vol=vol, n=n, a=a, b=b, co=co, also=list(also), note=note))


# ---- volume 1: three-years regiments
u('u-pa-11th-pennsylvania-infantry', 1, 11, 275, 334)
u('u-pa-23rd-pennsylvania-infantry', 1, 23, 335, 371)
u('u-pa-26th-pennsylvania-infantry', 1, 26, 372, 409)
u('u-pa-27th-pennsylvania-infantry', 1, 27, 410, 445)
u('u-pa-28th-pennsylvania-infantry', 1, 28, 446, 511)
u('u-pa-29th-pennsylvania-infantry', 1, 29, 512, 576)
u('u-pa-1st-pennsylvania-reserves', 1, 30, 577, 606)
u('u-pa-2nd-pennsylvania-reserves', 1, 31, 607, 640)
u('u-pa-5th-pennsylvania-reserves', 1, 34, 697, 723)
u('u-pa-6th-pennsylvania-reserves', 1, 35, 724, 751)
u('u-pa-9th-pennsylvania-reserves', 1, 38, 816, 844)
u('u-pa-10th-pennsylvania-reserves', 1, 39, 845, 876)
u('u-pa-11th-pennsylvania-reserves', 1, 40, 877, 907)
u('u-pa-12th-pennsylvania-reserves', 1, 41, 908, 938)
u('u-pa-13th-pennsylvania-reserves', 1, 42, 939, 975)
u('u-pa-battery-b-1st-pennsylvania-light-artillery', 1, 43, 976, 1045, co=['B'])
u('u-pa-batteries-f-and-g-1st-pennsylvania-light-artillery', 1, 43, 976, 1045, co=['F', 'G'])
u('u-pa-1st-pennsylvania-cavalry', 1, 44, 1046, 1088)
u('u-pa-46th-pennsylvania-infantry', 1, 46, 1143, 1181)
u('u-pa-49th-pennsylvania-infantry', 1, 49, 1270, 1310)
# ---- volume 2
u('u-pa-53rd-pennsylvania-infantry', 2, 53, 104, 146)
u('u-pa-56th-pennsylvania-infantry', 2, 56, 228, 257)
u('u-pa-57th-pennsylvania-infantry', 2, 57, 258, 296)
u('u-pa-2nd-pennsylvania-cavalry', 2, 59, 332, 371)
u('u-pa-3rd-pennsylvania-cavalry', 2, 60, 372, 418)
u('u-pa-61st-pennsylvania-infantry', 2, 61, 419, 464)
u('u-pa-62nd-pennsylvania-infantry', 2, 62, 465, 502)
u('u-pa-63rd-pennsylvania-infantry', 2, 63, 503, 535)
u('u-pa-4th-pennsylvania-cavalry', 2, 64, 536, 581)
u('u-pa-68th-pennsylvania-infantry', 2, 68, 691, 714)
u('u-pa-69th-pennsylvania-infantry', 2, 69, 715, 758)
u('u-pa-6th-pennsylvania-cavalry', 2, 70, 759, 805)
u('u-pa-71st-pennsylvania-infantry', 2, 71, 806, 846)
u('u-pa-72nd-pennsylvania-infantry', 2, 72, 847, 879)
u('u-pa-73rd-pennsylvania-infantry', 2, 73, 880, 910)
u('u-pa-74th-pennsylvania-infantry', 2, 74, 911, 932)
u('u-pa-75th-pennsylvania-infantry', 2, 75, 933, 962)
u('u-pa-81st-pennsylvania-infantry', 2, 81, 1185, 1219)
u('u-pa-82nd-pennsylvania-infantry', 2, 82, 1220, 1265)
u('u-pa-83rd-pennsylvania-infantry', 2, 83, 1266, 1326)
u('u-pa-84th-pennsylvania-infantry', 2, 84, 1327, 1381)
# ---- volume 3
u('u-pa-88th-pennsylvania-infantry', 3, 88, 87, 130)
u('u-pa-8th-pennsylvania-cavalry', 3, 89, 131, 170)
u('u-pa-90th-pennsylvania-infantry', 3, 90, 171, 205)
u('u-pa-91st-pennsylvania-infantry', 3, 91, 206, 253)
u('u-pa-93rd-pennsylvania-infantry', 3, 93, 304, 354)
u('u-pa-95th-pennsylvania-infantry', 3, 95, 355, 401)
u('u-pa-96th-pennsylvania-infantry', 3, 96, 402, 430)
u('u-pa-98th-pennsylvania-infantry', 3, 98, 483, 525)
u('u-pa-99th-pennsylvania-infantry', 3, 99, 526, 574)
u('u-pa-102nd-pennsylvania-infantry', 3, 102, 669, 716)
u('u-pa-105th-pennsylvania-infantry', 3, 105, 803, 851)
u('u-pa-106th-pennsylvania-infantry', 3, 106, 852, 877)
u('u-pa-107th-pennsylvania-infantry', 3, 107, 878, 929)
u('u-pa-109th-pennsylvania-infantry', 3, 109, 981, 1005)
u('u-pa-110th-pennsylvania-infantry', 3, 110, 1006, 1040)
u('u-pa-111th-pennsylvania-infantry', 3, 111, 1041, 1088)
u('u-pa-114th-pennsylvania-infantry', 3, 114, 1213, 1237)
u('u-pa-115th-pennsylvania-infantry', 3, 115, 1238, 1257)
u('u-pa-116th-pennsylvania-infantry', 3, 116, 1258, 1296)
u('u-pa-118th-pennsylvania-infantry', 3, 118, 1340, 1409)
# ---- volume 4
u('u-pa-119th-pennsylvania-infantry', 4, 119, 25, 53)
u('u-pa-121st-pennsylvania-infantry', 4, 121, 54, 81)
u('u-pa-139th-pennsylvania-infantry', 4, 139, 410, 438)
u('u-pa-140th-pennsylvania-infantry', 4, 140, 439, 468)
u('u-pa-141st-pennsylvania-infantry', 4, 141, 469, 495)
u('u-pa-142nd-pennsylvania-infantry', 4, 142, 496, 518)
u('u-pa-143rd-pennsylvania-infantry', 4, 143, 519, 549)
u('u-pa-145th-pennsylvania-infantry', 4, 145, 550, 582, also=[(982, 986)])
u('u-pa-147th-pennsylvania-infantry', 4, 147, 583, 608, also=[(987, 996)])
u('u-pa-148th-pennsylvania-infantry', 4, 148, 609, 642)
u('u-pa-149th-pennsylvania-infantry', 4, 149, 643, 680)
u('u-pa-150th-pennsylvania-infantry', 4, 150, 681, 712)
u('u-pa-151st-pennsylvania-infantry', 4, 151, 713, 733)
u('u-pa-battery-h-3rd-pennsylvania-heavy-artillery-section', 4, 152, 734, 807, co=['H'])
u('u-pa-153rd-pennsylvania-infantry', 4, 153, 808, 830)
u('u-pa-155th-pennsylvania-infantry', 4, 155, 836, 868)
u('u-pa-16th-pennsylvania-cavalry', 4, 161, 997, 1038)
u('u-pa-17th-pennsylvania-cavalry', 4, 162, 1039, 1081)
u('u-pa-18th-pennsylvania-cavalry', 4, 163, 1082, 1129)
# ---- volume 5: the independent batteries
u('u-pa-pennsylvania-independent-batteries-c-and-f', 5, 'C', 887, 896, also=[(915, 926)])
u('u-pa-pennsylvania-independent-battery-e', 5, 'E', 905, 914)

BY_KEY = {x['key']: x for x in U}
