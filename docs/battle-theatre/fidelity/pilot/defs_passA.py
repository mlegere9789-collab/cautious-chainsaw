"""PASS A: the first derivation of the Little Round Top pilot, 16:00-17:00 LMT, 2 July 1863.

Every waypoint is a statement I derived by reading the sources listed in sources.json (see the quote and src fields; quotes are checked
against the OCR text by tools/check_quotes.py). A waypoint says: at about <t> (window lo..hi) the unit was <pos> (+-sigma m), facing <deg>,
in <formation>, doing <activity>. Between two waypoints the state is interpolated (position, facing); activity and formation of the EARLIER
waypoint hold until the next one (a transition row is a waypoint of its own).

Time rule R-MED (see PLAN.md 1.5): the best time of an event several witnesses clock differently is the MEDIAN of the witnesses; the window is
[min, max] of the witnesses (or the source's own 'about' width, 15 min, when only one witness speaks). An outlier more than 45 minutes from the
median of three or more witnesses is excluded from the window and listed in CONTESTED (it is never deleted).

Labels (the site vocabulary): D Documented (a source states it), M Measured (read from a measured object: monument position, DEM),
C Computed (derived by a stated calculation), E Modelled/Estimated (inference stated in the note), X Contested, U Unknown.
"""
import math, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'tools'))
from geo import to_xy, to_ll   # noqa

# ---- measured anchor points (S22 monuments / markers, S23 DEM summits). lon, lat -----------------------------------------------------
PT = {
    'LRT':        (-77.236623, 39.792059),   # DEM highest point (basemap ground-truth LOC-003)
    'BRT':        (-77.239133, 39.786238),   # DEM highest point (LOC-004)
    'M_20ME':     (-77.236141, 39.789452),   # OSM monument "20th ME Chamberlain"
    'M_20ME_B':   (-77.236006, 39.78912),    # OSM "20th ME Co B Morrill"
    'M_83PA':     (-77.237041, 39.790243),   # OSM "83rd PA Woodward"
    'M_44NY':     (-77.237001, 39.791297),   # OSM "44th NY Rice / Conner"
    'M_16MI':     (-77.237681, 39.791199),   # OSM "16th MI Welch"
    'M_140NY':    (-77.236962, 39.7915),     # OSM "140th NY O'Rorke / Ernst"
    'M_91PA':     (-77.236739, 39.792168),   # OSM "91st PA Sinex"
    'M_146NY':    (-77.236658, 39.792744),   # OSM "146th NY Garrard / Tuttle"
    'M_155PA':    (-77.2365, 39.792953),     # OSM "155th PA Cain"
    'M_BTY_D':    (-77.236639, 39.7918),     # OSM "5th US Artillery Hazlett's Battery D"
    'M_VINCENT':  (-77.236921, 39.79066),    # Wikipedia list "General Strong Vincent Marker"
    'SYKES_HQ':   (-77.234483, 39.7972),     # Wikipedia list "Gen. George Sykes's Headquarters Marker"
    'M_LAW_START':(-77.254166, 39.787011),   # OSM "Law AL Brigade"
    'M_TX_START': (-77.254393, 39.790437),   # OSM "Robertson TX Brigade"
    'M_SMITH_BTY':(-77.242514, 39.792043),   # OSM "4th NY Artillery Smith's Battery" (western monument)
}

def P(name, dx=0.0, dy=0.0):
    """named point plus an offset in metres east / north"""
    x, y = to_xy(*PT[name]); return to_ll(x + dx, y + dy)

def Q(lon, lat):
    return (lon, lat)

# Confederate start line, Warfield Ridge (Confederate Avenue): longitude of the two brigade monuments; latitudes are my allocation of the
# regiments along the line (right = south) from Oates SHSP 6 p.174 (order 44, 48, 15, 47, 4 Alabama from right to left) and Bane p.410 (5th Texas right, 4th Texas next).
SL_LON = -77.2540
START_LAT = {'44AL': 39.7852, '48AL': 39.7862, '15AL': 39.7872, '47AL': 39.7882, '5TX': 39.7904, '4TX': 39.7915}

# ---- unit definitions (strength is the number the footprint uses; basis in note) --------------------------------------------------------
UNITS = {
 'U-20ME':  dict(side='U', name='20th Maine', strength=358, str_basis='D: "386, all told - 358 guns" Chamberlain OR27/1 p.626', front_ranks=2,
                 final_cas=136, cas_basis='D: 136 (30 killed) Chamberlain p.626'),
 'U-20ME-B':dict(side='U', name='20th Maine Co. B (Morrill)', strength=36, str_basis='E: 1/10 of 358; no source gives the company', front_ranks=1,
                 final_cas=None, cas_basis='U'),
 'U-83PA':  dict(side='U', name='83rd Pennsylvania', strength=295, str_basis='E: site registry value 295 (provenance not re-checked)', front_ranks=2,
                 final_cas=55, cas_basis='D: 10 killed, 45 wounded Woodward p.632'),
 'U-44NY':  dict(side='U', name='44th New York', strength=391, str_basis='E: site registry value 391 (provenance not re-checked)', front_ranks=2,
                 final_cas=None, cas_basis='U: Conner names 6 officers only'),
 'U-16MI':  dict(side='U', name='16th Michigan', strength=150, str_basis='D: "number of muskets taken in line was about 150" + about 50 skirmishers, Welch p.628', front_ranks=2,
                 final_cas=59, cas_basis='D: 59 killed and wounded (21 killed) Welch p.628'),
 'U-140NY': dict(side='U', name='140th New York', strength=449, str_basis='E: site registry value 449', front_ranks=2,
                 final_cas=None, cas_basis='U'),
 'U-146NY': dict(side='U', name='146th New York', strength=456, str_basis='E: site registry value 456', front_ranks=2,
                 final_cas=None, cas_basis='U'),
 'U-91PA':  dict(side='U', name='91st Pennsylvania', strength=343, str_basis='U: not in the site data; placeholder = (1591-449-456)/2 from the site brigade total', front_ranks=2,
                 final_cas=None, cas_basis='U'),
 'U-155PA': dict(side='U', name='155th Pennsylvania', strength=343, str_basis='U: not in the site data; placeholder as 91st', front_ranks=2,
                 final_cas=None, cas_basis='U'),
 'U-ART-D5US': dict(side='U', name="Battery D 5th US (Hazlett)", strength=107, str_basis='E: site registry 107 men; D: six 10-pounders Hunt p.236', guns=6,
                 final_cas=13, cas_basis='D: 1 officer + 6 men killed, 6 men wounded Martin p.660'),
 'C-15AL':  dict(side='C', name='15th Alabama', strength=499, str_basis='X: site 499 vs Oates SHSP 6 p.178 "644 men and 42 officers"', front_ranks=2,
                 final_cas=161, cas_basis='D: 17 killed 54 wounded 90 missing Oates OR p.393 (X: SHSP p.178 says 343 men and 19 officers lost)'),
 'C-47AL':  dict(side='C', name='47th Alabama', strength=243, str_basis='E: site 347 less 3 of 10 companies detached to guard a road (Campbell OR27/2 p.395)', front_ranks=2,
                 final_cas=None, cas_basis='D: "about one-third" killed and wounded Campbell p.395'),
 'C-48AL':  dict(side='C', name='48th Alabama', strength=275, str_basis='D: "275 men engaged" Sheffield OR27/2 p.396 (site 374)', front_ranks=2,
                 final_cas=102, cas_basis='D: 102 killed wounded missing Sheffield p.396'),
 'C-44AL':  dict(side='C', name='44th Alabama', strength=363, str_basis='E: site registry 363', front_ranks=2,
                 final_cas=94, cas_basis='D: 24 killed 66 wounded 4 missing Perry p.394'),
 'C-4TX':   dict(side='C', name='4th Texas', strength=415, str_basis='E: site registry 415', front_ranks=2,
                 final_cas=None, cas_basis='U: list appended in the report, not in the text'),
 'C-5TX':   dict(side='C', name='5th Texas', strength=409, str_basis='E: site registry 409', front_ranks=2,
                 final_cas=None, cas_basis='U'),
}

def W(wid, t, lo, hi, pos, sig, face, fsd, form, act, srcs, quote, ev, note='', rel=None):
    """one waypoint. t/lo/hi are 'HH:MM' LMT, or None when rel=(ref_wid, dt, dlo, dhi) gives them relative to another waypoint of the same unit"""
    return dict(wid=wid, t=t, lo=lo, hi=hi, rel=rel, pos=pos, sigma_m=sig, facing=face, facing_sd=fsd, formation=form, activity=act,
                srcs=srcs, quote=quote, ev=ev, note=note)

# ev = dict(time=, pos=, facing=, activity=)  labels D/M/C/E/X/U
U_MARCH = ('column_fours', 'marching_double')

# Union reserve point and approach (Vincent's brigade): east of the Taneytown road near Sykes's headquarters, then the hollow with batteries going
# into position, the farm-road crossing of Plum Run, the spur.
UP0 = P('SYKES_HQ', 60, 100)
UP1 = P('LRT', -60, 330)
UP2 = P('LRT', -230, 120)
UP3 = P('LRT', -120, -10)

WP = {}

# ============================================================ 20th Maine
WP['U-20ME'] = [
 W('20ME-00','15:55','15:40','16:10', UP0, 150, 180, 40, 'column_mass','resting', ['S02#p622'], 'the men were able to take some rest and make the most of their rations',
   dict(time='E',pos='E',facing='U',activity='D'), 'Massed with the division right of the road, moved several times to the left, resting under arms.'),
 W('20ME-01','16:07','15:55','16:25', UP0, 150, 180, 20, 'column_fours','marching_double', ['S02#p622','S03#p628','S04#p630','S01#p616'],
   'a sharp cannonade, at some distance to our left and front, was the signal for a sudden and rapid movement',
   dict(time='X',pos='E',facing='E',activity='D'), 'Departure: Chamberlain "near 4", Welch/Conner/Rice "about 4" (R-MED 16:07, window 15:55-16:25 = the cannonade of 16:00 [15:45-16:30] plus the order delay).'),
 W('20ME-02','16:12','16:00','16:30', UP1, 150, 190, 25, 'column_fours','marching_double', ['S02#p622'], 'Passing an open field in the hollow',
   dict(time='E',pos='E',facing='E',activity='D'), 'Hollow where some batteries were going into position.'),
 W('20ME-03','16:16','16:04','16:36', UP2, 150, 180, 25, 'column_fours','marching_double', ['S02#p623'], 'we took a farm road crossing Plum Run',
   dict(time='E',pos='E',facing='E',activity='D')),
 W('20ME-04','16:21','16:08','16:42', UP3, 120, 170, 30, 'column_fours','marching_double', ['S02#p623'], 'crashing of the shells among the rocks and the tree tops',
   dict(time='E',pos='E',facing='E',activity='D'), 'Enemy artillery got the range of the column while it climbed the spur; one or two shells burst in the ranks.'),
 W('20ME-05','16:26','16:12','16:50', P('M_20ME',30,40), 40, 215, 20, 'line_forming','forming', ['S02#p623','S22#20ME'], 'I formed my regiment on the right into line',
   dict(time='X',pos='M',facing='D',activity='D'), 'Arrival on the south slope, forming right into line facing Round Top (SW). Position: monument. Vincent: "hold that ground at all hazards".'),
 W('20ME-06','16:31','16:15','16:56', PT['M_20ME'], 40, 225, 20, 'line','standing_under_fire', ['S02#p623'], 'The artillery fire on our position had meanwhile been constant and heavy',
   dict(time='E',pos='M',facing='D',activity='D'), 'Formed. Co. B detached to skirmish across the hollow.'),
 W('20ME-07','16:50','16:30','17:30', PT['M_20ME'], 40, 235, 20, 'line','firing_unspecified', ['S02#p623','S01#p617'], 'the artillery was replaced by a vigorous infantry assault upon the center of our brigade',
   dict(time='X',pos='M',facing='E',activity='D'), 'Infantry attack reaches the right of the 20th Maine within minutes of the formation; window opens to 17:30 because the first-contact clock rests on Rice "scarcely formed" (no clock) and the Confederate step-off spread.'),
 W('20ME-08','17:00','16:40','17:40', PT['M_20ME'], 40, 235, 20, 'line','firing_unspecified', ['S02#p623'], 'The action was quite sharp and at close quarters',
   dict(time='X',pos='M',facing='E',activity='D')),
]
WP['U-20ME-B'] = [
 W('20MEB-00','16:26','16:12','16:50', P('M_20ME',30,40), 40, 215, 20, 'line_forming','forming', ['S02#p623'], 'I immediately detached Company B, Captain Morrill commanding',
   dict(time='X',pos='E',facing='E',activity='D'), 'Part of the regiment until detached.'),
 W('20MEB-01','16:33','16:18','16:58', P('M_20ME_B',-25,-30), 60, 215, 20, 'skirmish_line','skirmishing', ['S02#p623','S22#20ME_B'], 'extend from my left flank across this hollow as a line of skirmishers',
   dict(time='X',pos='E',facing='E',activity='D'), 'Across the hollow toward Round Top; the Co. B monument (Measured, commemorative) is 40 m from the 20th Maine monument, the text says "across this hollow": position set between, sigma 60 m.'),
 W('20MEB-02','17:00','16:40','17:40', P('M_20ME_B',-25,-30), 60, 215, 20, 'skirmish_line','skirmishing', ['S02#p623'], 'to prevent a surprise on my exposed flank and rear',
   dict(time='X',pos='E',facing='E',activity='D')),
]

# ============================================================ 83rd Pennsylvania
WP['U-83PA'] = [
 W('83PA-00','15:55','15:40','16:10', P('SYKES_HQ',80,60), 150, 180, 40, 'column_mass','resting', ['S01#p621','S05#p632'], 'lay in position awaiting orders until about 4 p. m.',
   dict(time='D',pos='E',facing='U',activity='D'), 'Rice itinerary p.621.'),
 W('83PA-01','16:08','15:55','16:25', UP0, 150, 180, 20, 'column_fours','marching_double', ['S01#p621','S02#p622'], 'immediately on arriving there became engaged',
   dict(time='X',pos='E',facing='E',activity='D')),
 W('83PA-02','16:13','16:01','16:31', UP1, 150, 190, 25, 'column_fours','marching_double', ['S02#p622'], 'Passing an open field in the hollow',
   dict(time='E',pos='E',facing='E',activity='E')),
 W('83PA-03','16:17','16:05','16:37', UP2, 150, 180, 25, 'column_fours','marching_double', ['S02#p623'], 'we took a farm road crossing Plum Run',
   dict(time='E',pos='E',facing='E',activity='E')),
 W('83PA-04','16:24','16:11','16:46', P('M_83PA',60,40), 60, 240, 25, 'line_forming','forming', ['S01#p616','S22#83PA'], 'the Eighty-third Pennsylvania and Forty-fourth New York occupied the center',
   dict(time='X',pos='M',facing='E',activity='D'), 'Rice p.616: 83rd and 44th in the centre of the brigade line, 20th Maine left, 16th Michigan right.'),
 W('83PA-05','16:30','16:15','16:55', PT['M_83PA'], 40, 265, 20, 'line','standing_under_fire', ['S01#p617'], 'The brigade had scarcely formed line of battle and pushed forward its skirmishers',
   dict(time='X',pos='M',facing='E',activity='E')),
 W('83PA-06','16:47','16:28','17:25', PT['M_83PA'], 40, 265, 20, 'line','firing_unspecified', ['S01#p617','S05#p632'], 'the enemy advanced and engaged my skirmishers, pressing on in force',
   dict(time='X',pos='M',facing='D',activity='D'), 'Woodward clocks this 15:15 ("2.30 position, 3.15 engaged"); every other witness of the brigade clocks 16:00+. OUTLIER EXCLUDED from the window (R-OUT), listed in CONTESTED C1.'),
 W('83PA-07','17:00','16:40','17:40', PT['M_83PA'], 40, 265, 20, 'line','firing_unspecified', ['S05#p632'], 'posted behind rocks and stones hastily thrown up for defense',
   dict(time='X',pos='M',facing='D',activity='D')),
]

# ============================================================ 44th New York
WP['U-44NY'] = [
 W('44NY-00','15:55','15:40','16:10', P('SYKES_HQ',100,40), 150, 180, 40, 'column_mass','resting', ['S01#p621'], 'lay in position awaiting orders until about 4 p. m.',
   dict(time='D',pos='E',facing='U',activity='D')),
 W('44NY-01','16:08','15:55','16:25', UP0, 150, 180, 20, 'column_fours','marching_double', ['S04#p630','S01#p621'], 'About 4 p. m. our regiment, Col. J. C. Rice commanding, was placed in position',
   dict(time='X',pos='E',facing='E',activity='E')),
 W('44NY-02','16:14','16:02','16:32', UP1, 150, 190, 25, 'column_fours','marching_double', ['S02#p622'], 'Passing an open field in the hollow',
   dict(time='E',pos='E',facing='E',activity='E')),
 W('44NY-03','16:18','16:06','16:38', UP2, 150, 180, 25, 'column_fours','marching_double', ['S02#p623'], 'we took a farm road crossing Plum Run',
   dict(time='E',pos='E',facing='E',activity='E')),
 W('44NY-04','16:26','16:12','16:48', P('M_44NY',60,30), 60, 255, 25, 'line_forming','forming', ['S04#p630','S22#44NY'], 'was placed in position on Round Top hill, with the Eighty-third Pennsylvania on our left',
   dict(time='X',pos='M',facing='E',activity='D'), 'Conner prints "Sixteenth Massachusetts" on the right; the unit there is the 16th Michigan (Rice p.616, Welch p.628). Noted as a source error, not silently corrected.'),
 W('44NY-05','16:33','16:18','16:58', PT['M_44NY'], 40, 265, 20, 'line','skirmishers_out', ['S04#p630'], 'Company B was immediately thrown out as skirmishers',
   dict(time='X',pos='M',facing='E',activity='D'), 'Company B (Capt. Larrabee) advances about 200 yards (183 m) in front.'),
 W('44NY-06','16:45','16:28','17:15', PT['M_44NY'], 40, 265, 20, 'line','firing_unspecified', ['S04#p630'], 'The enemy continued to advance until the first line came within about 40 yards',
   dict(time='X',pos='M',facing='D',activity='D'), 'Larrabee shot dead as the company fell back: the first officer the regiment ever lost in battle (Conner p.630).'),
 W('44NY-07','17:00','16:40','17:40', PT['M_44NY'], 40, 265, 20, 'line','firing_unspecified', ['S04#p630'], 'we opened a heavy fire upon them, which was continued until they were compelled to retreat',
   dict(time='X',pos='M',facing='D',activity='D')),
]

# ============================================================ 16th Michigan
WP['U-16MI'] = [
 W('16MI-00','15:55','15:40','16:10', P('SYKES_HQ',120,20), 150, 180, 40, 'column_mass','resting', ['S03#p628'], 'closed in mass, near and in rear of Gettysburg, to the left of the main road',
   dict(time='D',pos='E',facing='U',activity='D')),
 W('16MI-01','16:08','15:55','16:25', UP0, 150, 180, 20, 'column_fours','marching_double', ['S03#p628'], 'About 4 p. m. we moved rapidly to the extreme left of our line of battle',
   dict(time='D',pos='E',facing='E',activity='D')),
 W('16MI-02','16:14','16:02','16:32', UP1, 150, 190, 25, 'column_fours','marching_double', ['S02#p622'], 'Passing an open field in the hollow',
   dict(time='E',pos='E',facing='E',activity='E')),
 W('16MI-03','16:19','16:07','16:39', UP2, 150, 180, 25, 'column_fours','marching_double', ['S02#p623'], 'we took a farm road crossing Plum Run',
   dict(time='E',pos='E',facing='E',activity='E')),
 W('16MI-04','16:26','16:11','16:47', P('M_20ME',-30,60), 100, 200, 30, 'line_forming','deploying_skirmishers', ['S03#p628'], 'went into position on the left of the brigade',
   dict(time='X',pos='E',facing='E',activity='D'), 'Welch: first on the left of the brigade "at that time circling the crest", two companies (Brady Sharpshooters, Co. A; about 50 men) deployed as skirmishers. Contested vs Chamberlain, who has the 20th Maine on the extreme left.'),
 W('16MI-05','16:34','16:19','16:54', P('M_16MI',60,10), 80, 270, 25, 'column_fours','marching_double', ['S03#p628'], 'I was ordered at double-quick to the right of the brigade',
   dict(time='X',pos='E',facing='E',activity='D'), 'Along the crest from the left to the right of the line, about 200 m.'),
 W('16MI-06','16:40','16:24','17:05', PT['M_16MI'], 40, 270, 20, 'line','firing_unspecified', ['S03#p628','S01#p616'], 'Before this could be accomplished, we were under a heavy fire of the enemy',
   dict(time='X',pos='M',facing='D',activity='D'), 'In place on the right of the 44th New York; the right was "thrown forward somewhat to the front of the ledge" and "much more exposed" (Rice p.616-617).'),
 W('16MI-07','17:00','16:40','17:30', PT['M_16MI'], 40, 270, 20, 'line','firing_unspecified', ['S03#p628'], 'We remained in this position nearly half an hour',
   dict(time='X',pos='M',facing='D',activity='D'), 'The break of the regiment (colors sent back by Lt. Kydd) follows after the half hour, 17:10 or later; outside this pilot hour.'),
]

# ============================================================ Weed's brigade
W_START = Q(-77.2250, 39.8090)    # Baltimore Pike / Rock Creek, where Sykes massed the corps before 15:00 (Sykes p.592). sigma large
WMUSK = P('LRT', -230, 150)       # the point where the brigade came under musketry fire, on the flat toward Plum Run (Garrard p.651), sigma large
WP['U-140NY'] = [
 W('140NY-00','15:55','15:40','16:10', W_START, 350, 225, 40, 'column_mass','resting', ['S08#p592','S06#p651'], 'the brigade with the division remained idle, lying by their arms until about 4 p. m.',
   dict(time='D',pos='E',facing='U',activity='D')),
 W('140NY-01','16:02','15:50','16:20', W_START, 350, 225, 25, 'column_fours','marching_double', ['S06#p651'], 'the brigade was moved rapidly forward (most of the time at the double-quick) nearly 1',
   dict(time='D',pos='E',facing='E',activity='D'), 'Garrard: "nearly 1 1/2 miles" (OCR "1^") at the double-quick before coming under musketry fire.'),
 W('140NY-02','16:27','16:05','16:46', WMUSK, 250, 245, 25, 'column_fours','marching_double', ['S06#p651'], 'when it came under the fire of the enemy',
   dict(time='C',pos='E',facing='E',activity='D'), 'Time Computed: distance W_START to WMUSK divided by drill speed on the DEM (tools/build_pilot.py kinematic check).'),
 W('140NY-03','16:35','16:14','16:57', P('LRT',-150,-60), 150, 60, 30, 'column_fours','marching_quick', ['S06#p651'], 'the leading regiment, under the direction of General Warren, chief engineer',
   dict(time='E',pos='E',facing='E',activity='D'), 'Led by Warren to the left, up on Round Top ridge, Hazlett\'s battery ascending immediately behind.'),
 W('140NY-04','16:44','16:26','17:08', P('M_140NY',90,30), 60, 250, 25, 'line_forming','forming', ['S06#p651','S22#140NY'], 'The One hundred and fortieth was formed in line',
   dict(time='X',pos='M',facing='D',activity='D')),
 W('140NY-05','16:53','16:35','17:20', PT['M_140NY'], 40, 255, 20, 'line','firing_unspecified', ['S06#p651'], 'was immediately closely engaged with the enemy at short musket-range',
   dict(time='X',pos='M',facing='D',activity='D'), 'On the left slope of the ridge. Rice p.617 puts the 140th in the line when the 16th Michigan was broken: that is after 17:00.'),
 W('140NY-06','17:00','16:40','17:30', P('M_16MI',60,-20), 60, 270, 20, 'line','advancing_firing', ['S01#p617','S06#p651'], 'being immediately supported by the One hundred and fortieth Hew York Volunteers',
   dict(time='X',pos='E',facing='D',activity='E'), 'O\'Rorke mortally wounded at the head of his regiment leading it into action (Garrard p.651); the minute is not clocked in any source read.'),
]
VALLEY = Q(-77.2425, 39.7945)     # "a narrow valley to support a portion of the Third Corps and Watson's battery": toward the Wheatfield road, sigma large
def weed_other(uid, mon, i, face):
    return [
     W(f'{i}-00','15:55','15:40','16:10', P('SYKES_HQ',500,900), 350, 225, 40, 'column_mass','resting', ['S06#p651'], 'lying by their arms until about 4 p. m.',
       dict(time='D',pos='E',facing='U',activity='D')),
     W(f'{i}-01','16:02','15:50','16:20', P('SYKES_HQ',500,900), 350, 225, 25, 'column_fours','marching_double', ['S06#p651'], 'the brigade was moved rapidly forward',
       dict(time='D',pos='E',facing='E',activity='D')),
     W(f'{i}-02','16:22','16:07','16:44', WMUSK, 250, 245, 25, 'column_fours','marching_double', ['S06#p651'], 'when it came under the fire of the enemy',
       dict(time='C',pos='E',facing='E',activity='D')),
     W(f'{i}-03','16:34','16:18','16:58', VALLEY, 250, 250, 40, 'line_forming','forming', ['S06#p651'], 'led to the right and front some distance, and formed in line in a narrow valley',
       dict(time='E',pos='E',facing='E',activity='D'), 'Sent to support the Third Corps and Watson\'s battery.'),
     W(f'{i}-04','16:44','16:28','17:08', VALLEY, 250, 250, 40, 'column_fours','marching_double', ['S06#p651','S08#p593'], 'to return at double-quick to Round Top ridge',
       dict(time='E',pos='E',facing='E',activity='D'), 'Sykes p.593 tells the same turn-back as a countermand of Sickles\'s order, with the brigade "moving away from the height" before: X.'),
     W(f'{i}-05','16:58','16:40','17:25', mon, 50, face, 20, 'line_forming','forming', ['S06#p652','S22#'+uid], 'extending from the battery on the summit',
       dict(time='X',pos='M',facing='E',activity='D'), 'Regiment returns to the ridge and is posted on the crest (monument position); order of the line contested (see CONTESTED C4).'),
    ]
WP['U-146NY'] = weed_other('146NY', PT['M_146NY'], '146NY', 270)
WP['U-155PA'] = weed_other('155PA', PT['M_155PA'], '155PA', 270)
WP['U-91PA']  = weed_other('91PA',  PT['M_91PA'],  '91PA', 260)

# ============================================================ Hazlett's battery
WP['U-ART-D5US'] = [
 W('BTY-00','15:55','15:40','16:15', P('SYKES_HQ',20,-40), 150, 270, 40, 'battery_limbered','halted', ['S07#p659','S09#p236'], 'The artillery entered the field between 4 and 5 p. m. on the 2d instant',
   dict(time='X',pos='E',facing='U',activity='D'), 'With the First Division. Hunt: "arrived on the field between 4 and 5 p. m."; Martin: "entered the field between 4 and 5".'),
 W('BTY-01','16:25','16:10','16:45', UP2, 150, 180, 25, 'battery_limbered','marching_quick', ['S07#p659','S09#p236'], 'About 4.30 p. m. Hazlett\'s battery was moved to the extreme left',
   dict(time='D',pos='E',facing='E',activity='D'), 'Martin p.659 and Hunt p.236 both say about 4:30. Three-quarters of a mile (1.2 km) to the hill (Martin).'),
 W('BTY-02','16:40','16:22','17:05', P('LRT',-110,-20), 80, 60, 25, 'battery_limbered','climbing', ['S06#p651','S07#p659'], 'Hazlett\'s battery ascended the ridge immediately in rear of this regiment',
   dict(time='X',pos='E',facing='E',activity='D'), 'Behind the 140th New York; the site\'s note says the guns were manhandled up (unread source; not asserted here).'),
 W('BTY-03','16:46','16:28','17:12', P('M_BTY_D',0,0), 25, 255, 15, 'battery_unlimbering','unlimbering', ['S06#p651','S07#p659'], 'went into battery on the summit',
   dict(time='X',pos='M',facing='D',activity='D')),
 W('BTY-04','16:50','16:32','17:16', PT['M_BTY_D'], 25, 255, 15, 'battery_in_action','firing_unspecified', ['S07#p659','S09#p237'], 'the battery opened upon the enemy, who was engaging the First Division',
   dict(time='X',pos='M',facing='D',activity='D'), 'Opened "immediately upon taking up the position"; fire enfiladed the Confederate line. Rate of fire: Unknown.'),
 W('BTY-05','17:00','16:40','17:30', PT['M_BTY_D'], 25, 255, 15, 'battery_in_action','firing_unspecified', ['S07#p659'], 'The battery kept up a continuous fire until dark',
   dict(time='X',pos='M',facing='D',activity='D')),
]

# ============================================================ Confederates
# S: step-off of Law's and Robertson's brigades. Witnesses: Oates SHSP p.174 "between three and four", Bryan p.412 "About 4 p. m.", Bane p.410 "About 4.30", Law B&L p.323 "near 5 o'clock".
def cs_start(lat, uid, sid):
    return W(f'{sid}-00','15:50','15:30','16:10', Q(SL_LON, lat), 120, 90, 8, 'line','halted_awaiting_order', ['S20#p174','S17#p412'], 'Thus formed, between three and four o\'clock P. M., both battalions of artillery opened fire',
             dict(time='X',pos='E',facing='D',activity='D'), 'Standing in line on Warfield Ridge under the artillery duel; regiment order along the line from Oates p.174.')
def cs_step(lat, sid, note=''):
    return W(f'{sid}-sw','16:15','15:45','17:00', Q(SL_LON, lat), 120, 90, 8, 'line','advancing_quick', ['S20#p174','S17#p412','S16#p410','S21#p323'], 'At the word "Forward," the regiment moved forward in good order',
             dict(time='X',pos='E',facing='D',activity='D'), 'STEP-OFF. Witnesses: Oates 15:30-16:00, Bryan 16:00, Bane 16:30, Law 16:55; R-MED 16:15, window 15:45-17:00. ' + note)

# the line of the advance east across Plum Run valley: lon -77.2540 -> Plum Run (-77.2465) -> foot of the mountain (-77.2425)
def adv(sid, lat0, lat1, dt, dlo, dhi, ref, lon, face, form, act, srcs, quote, ev, note='', sig=150, fsd=20, wid=None):
    return W(wid or f'{sid}-x', None, None, None, Q(lon, lat1), sig, face, fsd, form, act, srcs, quote, ev, note, rel=(ref, dt, dlo, dhi))

WP['C-15AL'] = [
 cs_start(START_LAT['15AL'], 'C-15AL', '15AL'),
 cs_step(START_LAT['15AL'], '15AL'),
 adv('15AL',0,39.7870, 13,8,20,'15AL-sw', -77.2468, 90, 'line','advancing_quick', ['S20#p174'], 'When crossing the little run we received the first fire from the Federal infantry', dict(time='C',pos='E',facing='D',activity='D'),
     'Plum Run is at lon -77.2465 on the DEM profile (lowest ground, 146 m): consistent with "small muddy meandering stream near midway".', wid='15AL-02'),
 adv('15AL',0,39.7868, 18,10,26,'15AL-sw', -77.2432, 90, 'line','advancing_fighting', ['S11#p392','S20#p174'], 'I encountered the enemy\'s sharpshooters posted behind a stone fence', dict(time='C',pos='E',facing='D',activity='D'),
     'Stone fence at the foot of the mountain; Feagin wounded here (Oates OR p.392). Two Alabama regiments (44th, 48th) left the line by the left flank across the 15th\'s rear about now.', wid='15AL-03'),
 adv('15AL',0,39.7861, 29,20,40,'15AL-sw', -77.2410, 100, 'line','climbing', ['S20#p174','S11#p392'], 'My men had to climb up, catching to the bushes and crawling over the immense boulders', dict(time='C',pos='E',facing='D',activity='D'),
     'South face of Big Round Top, climbing under fire.', wid='15AL-04'),
 adv('15AL',0,39.7866, 42,30,56,'15AL-sw', -77.2397, 40, 'line','halted', ['S20#p175'], 'Here I halted and permitted my men to lie down to rest', dict(time='C',pos='E',facing='D',activity='D'),
     'On top of Big Round Top (measured summit lon -77.2391 lat 39.7862); halted "less than ten minutes".', wid='15AL-05'),
 adv('15AL',0,39.7878, 50,38,66,'15AL-sw', -77.2380, 20, 'line','advancing_quick', ['S20#p176'], 'passed to the left oblique entirely down the northern or northeastern side of Round Top', dict(time='C',pos='E',facing='D',activity='D'),
     'Down the north-east side, without opposition, toward the rear of Vincent\'s Spur.', wid='15AL-06'),
]
WP['C-47AL'] = [
 cs_start(START_LAT['47AL'], 'C-47AL', '47AL'),
 cs_step(START_LAT['47AL'], '47AL'),
 adv('47AL',0,39.7880, 13,8,20,'47AL-sw', -77.2468, 90, 'line','advancing_quick', ['S20#p174'], 'When crossing the little run we received the first fire from the Federal infantry', dict(time='C',pos='E',facing='D',activity='D'), wid='47AL-02'),
 adv('47AL',0,39.7878, 17,10,26,'47AL-sw', -77.2432, 90, 'line','advancing_fighting', ['S13#p395','S20#p174'], 'the lieutenant-colonel expected the colonel to give all necessary commands', dict(time='C',pos='E',facing='D',activity='D'),
     'Disordered: the colonel stayed far behind (Campbell p.395). Three companies detached to guard a road in the rear of the right.', wid='47AL-03'),
 adv('47AL',0,39.7872, 29,20,40,'47AL-sw', -77.2410, 100, 'line','climbing', ['S20#p175'], 'The Forty-seventh Alabama regiment was on my immediate left', dict(time='C',pos='E',facing='D',activity='D'),
     'Kept in line with the 15th during the ascent.', wid='47AL-04'),
 adv('47AL',0,39.7877, 42,30,56,'47AL-sw', -77.2397, 40, 'line','halted', ['S20#p175'], 'halted in line with my regiment on Round Top', dict(time='C',pos='E',facing='D',activity='D'), wid='47AL-05'),
 adv('47AL',0,39.7890, 50,38,66,'47AL-sw', -77.2380, 20, 'line','advancing_quick', ['S20#p176'], 'passed to the left oblique entirely down the northern or northeastern side of Round Top', dict(time='C',pos='E',facing='D',activity='D'), wid='47AL-06'),
]
# 44th and 48th Alabama: flank left across the rear of the 15th to the support of the Texas brigade (Oates p.174, Bane p.411, Perry p.393, Sheffield p.395)
def alabama_left(sid, lat):
    return [
     cs_start(START_LAT[sid[2:]] if False else lat, 'C-'+sid, sid),
     cs_step(lat, sid),
     adv(sid,0,lat, 13,8,20,f'{sid}-sw', -77.2468, 90, 'line','advancing_quick', ['S20#p174'], 'When crossing the little run we received the first fire from the Federal infantry', dict(time='C',pos='E',facing='D',activity='D'), wid=f'{sid}-02'),
     adv(sid,0,39.7880, 18,11,27,f'{sid}-sw', -77.2440, 0, 'column_fours','flank_move_left', ['S20#p174','S16#p411'], 'Law marched the Forty-fourth and Forty-eighth regiments by the left flank across my rear', dict(time='C',pos='E',facing='E',activity='D'),
         'Left flank march (north) behind the 15th Alabama toward the Texas brigade.', wid=f'{sid}-03'),
     alabama_04(sid),
    ]
def alabama_04(sid):
    if sid == '44AL':
        return adv(sid,0,39.7900, 24,16,34,f'{sid}-sw', -77.2438, 45, 'line','wheeling', ['S12#p394'], 'wheeled to the left, so as to confront that position', dict(time='C',pos='E',facing='E',activity='D'),
                   'Perry: the 44th was wheeled left to confront the battery on the cliff (Smith' + chr(39) + 's battery) and the valley of boulders.', wid=f'{sid}-04')
    return adv(sid,0,39.7900, 24,16,34,f'{sid}-sw', -77.2436, 20, 'column_fours','flank_move_left', ['S20#p174'], 'to the support of Robertson', dict(time='C',pos='E',facing='E',activity='D'),
               'Continues the left flank march to the right of the 4th Texas; the 48th is not said to have wheeled (Sheffield p.395 silent).', wid=f'{sid}-04')

WP['C-44AL'] = alabama_left('44AL', START_LAT['44AL'])
WP['C-44AL'] += [
 adv('44AL',0,39.7918, 32,22,44,'44AL-sw', -77.2428, 20, 'line','advancing_fighting', ['S12#p394'], 'The forward movement was immediately ordered, and was responded to with an alacrity', dict(time='C',pos='E',facing='E',activity='D'),
     'Into the boulder valley under "a deadly volley at short range"; one-fourth of the regiment down in seconds (Perry p.394).', wid='44AL-05'),
 adv('44AL',0,39.7918, 42,30,56,'44AL-sw', -77.2425, 20, 'line','firing_unspecified', ['S12#p394'], 'availing themselves of the shelter which the rocks afforded, they returned the fire', dict(time='C',pos='E',facing='E',activity='D'),
     'Halted without orders among the rocks, firing. Benning arrives "past 5 p. m." (Perry p.394), after this pilot hour.', wid='44AL-06'),
]
WP['C-48AL'] = alabama_left('48AL', START_LAT['48AL'])
WP['C-48AL'] += [
 adv('48AL',0,39.7905, 32,22,44,'48AL-sw', -77.2425, 30, 'line','advancing_fighting', ['S14#p395','S16#p411'], 'ordered my regiment forward, which was gallantly obeyed', dict(time='C',pos='E',facing='E',activity='D'),
     'Reinforces the 4th Texas (Bane p.411: "re-enforced by the Forty-eighth Alabama"); Sheffield: forward until about 20 paces of the line.', wid='48AL-05'),
 adv('48AL',0,39.7905, 45,32,60,'48AL-sw', -77.2418, 30, 'line','firing_unspecified', ['S14#p396'], 'Here the men opened fire on the enemy', dict(time='C',pos='E',facing='E',activity='D'),
     'Contest "an hour and a half" from first contact; whole regiment brought to the front three times (Sheffield p.396).', wid='48AL-06'),
]
WP['C-5TX'] = [
 cs_start(START_LAT['5TX'], 'C-5TX', '5TX'),
 cs_step(START_LAT['5TX'], '5TX'),
 adv('5TX',0,39.7906, 6,4,10,'5TX-sw', -77.2492, 85, 'line','advancing_double', ['S17#p412'], 'which distance was passed over by our line at a double-quick and a run', dict(time='C',pos='E',facing='D',activity='D'), wid='5TX-02'),
 adv('5TX',0,39.7908, 13,7,18,'5TX-sw', -77.2430, 85, 'line','halted', ['S17#p412'], 'A short halt was made at the stone fence', dict(time='C',pos='E',facing='D',activity='D'),
     'Three-fourths of a mile from the start (Bryan p.412) = 1.2 km; the stone fence is the sharpshooters\' line at the foot of the first height.', wid='5TX-03'),
 adv('5TX',0,39.7909, 16,9,22,'5TX-sw', -77.2418, 75, 'line','climbing', ['S17#p412'], 'every man leaped the fence, and advanced rapidly up the hillside', dict(time='C',pos='E',facing='D',activity='D'),
     'First height, then the second 200 yards beyond.', wid='5TX-04'),
 adv('5TX',0,39.7907, 25,16,34,'5TX-sw', -77.2383, 75, 'line_disordered','firing_unspecified', ['S17#p412'], 'Here we halted, there being small clusters of rocks far below the elevated position', dict(time='C',pos='E',facing='D',activity='D'),
     'Alignment broken by boulders ("not more than 3 or 4 men could pass abreast"); Powell down; Bryan wounded in the left arm and leaves the field.', wid='5TX-05'),
]
WP['C-4TX'] = [
 cs_start(START_LAT['4TX'], 'C-4TX', '4TX'),
 cs_step(START_LAT['4TX'], '4TX'),
 adv('4TX',0,39.7917, 9,5,14,'4TX-sw', -77.2490, 85, 'line','advancing_double', ['S16#p410'], 'we soon met the enemy\'s skirmishers', dict(time='C',pos='E',facing='D',activity='D'), wid='4TX-02'),
 adv('4TX',0,39.7918, 15,9,21,'4TX-sw', -77.2440, 85, 'line','skirmishing', ['S16#p411'], 'After a short pause, while repelling his skirmishers', dict(time='C',pos='E',facing='D',activity='D'),
     'Skirt of thick undergrowth a quarter mile from the base of the cliffs (Bane p.411).', wid='4TX-03'),
 adv('4TX',0,39.7913, 17,11,24,'4TX-sw', -77.2434, 120, 'column_fours','flank_move_right', ['S16#p411'], 'ordered by General Robertson to move by the right flank', dict(time='C',pos='E',facing='E',activity='D'),
     'About 200 yards to the right to cover the ground to the directing battalion (5th Texas).', wid='4TX-04'),
 adv('4TX',0,39.7913, 26,17,36,'4TX-sw', -77.2381, 80, 'line','firing_unspecified', ['S16#p411'], 'he was driven to the heights beyond, in our front and in close proximity to the mountain', dict(time='C',pos='E',facing='D',activity='D'),
     'Sharp contest in heavy wooded ground behind rocks; Lt. Col. Carter and Col. Key wounded.', wid='4TX-05'),
]

ORDER = ['U-20ME','U-20ME-B','U-83PA','U-44NY','U-16MI','U-140NY','U-146NY','U-91PA','U-155PA','U-ART-D5US','C-15AL','C-47AL','C-48AL','C-44AL','C-4TX','C-5TX']

# ---- the CONTESTED register of the pilot (statements kept out of the central trajectory, never deleted) ---------------------------------
CONTESTED = [
 dict(id='C1', unit='U-83PA', what='Clock of the 83rd Pennsylvania\'s engagement', claim='Woodward OR27/1 p.632: in position 2:30 pm, enemy engaged skirmishers 3:15 pm, contest until nearly 6 pm',
      others='Rice p.616 and p.621, Conner p.630, Welch p.628, Chamberlain p.622: about 4 pm; Confederates: advance 3:30-5:00', rule='R-OUT: 60 to 100 minutes from the median of 5 witnesses of the same brigade; his own end time (nearly 6 pm) agrees with the others, so the start is likely a mis-recorded hour. Excluded from the window, shown in the UI as a contested note.'),
 dict(id='C2', unit='Hood\'s division', what='Step-off of the Confederate infantry attack', claim='Oates 15:30-16:00 (SHSP 6 p.174), Bryan about 16:00 (p.412), Bane about 16:30 (p.410), Law "near 5 o\'clock" (B&L 3 p.323)',
      others='Conner/Rice/Chamberlain imply Union contact at about 16:30-16:45', rule='R-MED: median 16:15, window 15:45-17:00'),
 dict(id='C3', unit='15th Alabama', what='Strength', claim='Oates OR p.393 gives losses 161; SHSP p.178 gives 644 men + 42 officers engaged and 343 men + 19 officers lost; the site registry carries 499',
      others='-', rule='footprint uses the site value 499 with a Contested label; the claim is carried to the strength field as a range 499-686'),
 dict(id='C4', unit='91st Pennsylvania', what='Order of the Weed line', claim='Garrard p.652: the 91st on the LEFT of the battery connecting with the 140th; 146th and 155th on the right',
      others='The monuments put the 91st (39.79217) NORTH of the battery (39.79180), the 140th south; "left" depends on the facing of the narrator', rule='position from the monument, sigma 50 m; direction word not resolved'),
 dict(id='C5', unit='Vincent\'s brigade', what='Which regiment went to the left first', claim='Welch: the 16th Michigan "went into position on the left of the brigade, at that time circling the crest", then ran to the right',
      others='Chamberlain p.623: the 20th Maine was posted on "the extreme left"; Rice p.616: 20th Maine left, 16th Michigan right', rule='order of arrival: kept as in the table; unresolved'),
 dict(id='C6', unit='Weed\'s brigade', what='Whether the 146th, 91st and 155th left the ridge', claim='Garrard p.651: led right and front before being engaged, then recalled at double-quick',
      others='Sykes p.593: found most of Weed\'s brigade "moving away from the height" by Sickles\'s order and ordered it back at double-quick', rule='both kept: same event told from two ends; time unclocked'),
 dict(id='C7', unit='44th New York', what='Regiment on the right', claim='Conner p.630 prints "the Sixteenth Massachusetts" on the right of the 44th',
      others='Rice p.616, Welch p.628: the 16th Michigan', rule='source error recorded, not corrected in the source text'),
]
