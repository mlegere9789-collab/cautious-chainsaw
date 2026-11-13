"""Write horde/terrain-1/proposed-register/terrain-1-EG-01..17.md from evidence_corrections/terrain-1.jsonl (close-out 2026-11-13).
Run: python3 -I gen_register.py   (writes only the 17 files under horde/terrain-1/proposed-register/)."""
import os, json
ROOT = '/home/user/cautious-chainsaw'
OUT = os.path.join(ROOT, 'docs/battle-theatre/GOVERNANCE/horde/terrain-1/proposed-register')
rows = {}
for l in open(os.path.join(ROOT, 'docs/battle-theatre/GOVERNANCE/evidence_corrections/terrain-1.jsonl'), encoding='utf-8'):
    r = json.loads(l); rows[r['id']] = r
REGMAP = {'G-01': 'EG-0149', 'G-02': 'EG-0150', 'G-03': 'EG-0151', 'G-04': 'EG-0152', 'G-05': 'EG-0153', 'G-06': 'EG-0154', 'G-07': 'EG-0155', 'G-08': 'EG-0156',
          'G-09': 'EG-0157', 'G-10': 'EG-0158', 'G-11': 'EG-0159', 'G-12': 'EG-0160', 'G-13': 'EG-0161', 'G-14': 'EG-0162', 'G-15': 'EG-0163', 'G-16': 'EG-0164'}
SRCTXT = ("Searched with tools/bt/or27_find (Official Records Ser. I vol. 27 parts 1-3, Cornell scan) with every passage re-matched by offset and printed page, and "
          "against second scans (warofrebellion271unit, warofrebellion012701rootrich, warofrebellion272unit, warofrebellionco272unit) as second witnesses; the 99-text library "
          "and the added books; the National Park Service documents under tmp/library/web/nps and two nps.gov pages read 2026-11-13. Every quoted passage with offset is in "
          "evidence_corrections/terrain-1.jsonl.")
META = {
 'G-01': dict(title="Calef (G-01): night position 'hollow', section withdrawn, relief clock, first-shot position",
   open="The PDF's 'hollow' appears in no source read; the withdrawn section is Pergel's centre section (not the left); the relief of Calef's guns by Hall has three clocks (about 10:00 NPS, 10:15 Hunt, 10:45 Hall); no source gives a ground coordinate for Roder's first gun, and the First Shot marker at the Wisler Farm commemorates the cavalry's purported first shot, not Calef's gun.",
   why="The record read (OR Ser. I vol. 27 and the NPS texts) does not state the 'hollow', the coordinate of the first gun or one relief hour (Law cl.3).",
   substitute="Calef's own account: night position just outside town on the road he calls the Carlisle road; forward about 600 yd about 08:00 after a pioneer party levelled the fences; sections right (Roder), left (Newman), centre (Pergel, farthest left, about 700 yd from the other four per NPS); Hall relieves in a 10:00-10:45 window.",
   recon="As substituted; the 'hollow' wording kept as a marked PDF-only alternative.",
   ask="Which section the PDF row should name (centre per Calef) and whether to keep the 'hollow' wording as a marked alternative. Agent recommendation: yes (both selectable)."),
 'G-02': dict(title="I Corps batteries on Seminary Ridge (G-02): relation to the rail barricade, gun count, withdrawal clock",
   open="The guns did not stand behind the E-01 rail work (Breck's guns stood behind a pre-existing stone wall on the seminary crest, the rail work was an infantry work some 40 yd down the slope); gun count 22 (Hunt) vs 12 (Wainwright) vs the PDF's 20-22; withdrawal clock about 16:00 (Hunt) vs about 17:00 (Cooper, Wiedrich) vs the PDF's 16:30; the street name 'Chambersburg Street' is in no OR text.",
   why="The reports give three withdrawal clocks and two gun counts; no source reconciles them (Law cl.3).",
   substitute="Four batteries (Cooper 4, Stevens 6, Reynolds 6, Stewart 6 = 22) in the open and behind the seminary-crest stone wall; window 16:00-17:00 for the withdrawal along the Cashtown pike and through the town.",
   recon="As substituted, with the three withdrawal clocks and the two counts selectable.",
   ask="None beyond the delegated defaults; the PDF's 'behind the E-01 rail barricade' wording is replaced by the documented positions."),
 'G-03': dict(title="East Cemetery Hill gun works (G-03): dimensions and the builders of the infantry works",
   open="Confirmed with additions: per-gun small earthworks thrown up at dusk 1 Jul, finished the morning of 2 Jul (lunettes or redans in the state books; 'small earthwork' in the OR); where a builder is named it is the battery's own men. Still open: any 1863 dimension (the lunettes on the ground originated in the battle but were reconstructed or rehabilitated in 1878 and may not give a profile), the builders and dates of the stone wall, abatis and rifle-pits Hays met, and why Wiedrich's guns are six (Osborn) or four (Hunt, Wainwright).",
   why="No source gives height, thickness or plan of the works and none names the builders of the infantry works (Law cl.3).",
   substitute="Per-gun small earthworks built on screen at dusk 1 Jul by the battery's own men, completed morning 2 Jul, profile plausible-procedural and marked.",
   recon="Existence, purpose, builder (where named) and window documented; profile plausible-procedural.",
   ask="None: DD-04 stands; the 'not lunettes' wording of DD-04 is refined (the state books call them lunettes)."),
 'G-04': dict(title="Latimer's battalion on Benner's Hill (G-04): per-battery counts, the 37 Union guns, 'Rockbridge loaned'",
   open="Documented: 14 guns of the battalion on the hill plus two 20-pounder Parrotts in rear (16; Andrews), twenty with Graham's battery (New York 1900), four guns left at the end (Johnson, Andrews). Not found: per-battery counts, the PDF's 37 Union guns, and the wording 'loaned from Dance'. The place name is in Bachelder, the Maine and New York books, not in the OR.",
   why="No source read gives per-battery gun counts or a Union gun count for the opposing line (Law cl.3).",
   substitute="Four batteries plus Graham's, 16 guns on Andrews' count with 20 selectable, no works, withdrawal to four guns.",
   recon="As substituted; the 37-gun figure kept as a marked PDF-only value.",
   ask="None."),
 'G-05': dict(title="Smith's 4th NY at Devil's Den (G-05): the 18:00 section shift and who captured the guns",
   open="Not found: 'one section shifted right about 18:00'. Conflict: the capture of the three Parrotts (Benning's brigade, 20th Georgia, 1st Texas counting six guns, Henry's battalion journal; Smith's own report of 1863 supposed the Twelfth Corps had taken them from the field and his address of 1888 says the enemy took them off after dark). Rear section 75 yd (1888 address) or 150 yd (report, 1900 book). 'Canister at Benning's brigade' is Smith's 1888 address; Benning writes of the terrible fire of two guns in the gorge.",
   why="The reports of the capturing units disagree on number and unit and no source describes a section shift at 18:00 (Law cl.3).",
   substitute="Four guns on the crest, two behind covering the gorge, all on the ground until about 18:00; capture attribution a selector.",
   recon="As substituted.",
   ask="None."),
 'G-06': dict(title="Hazlett's battery on Little Round Top (G-06): first fire and the hauling method",
   open="First fire is on arrival about 16:30 (Martin, Hunt; Hazlett fell after about an hour and died at 20:00): the PDF's 17:45 is contradicted. The hauling method is a four-way conflict among books of 1889-1914. No source describes or excludes a prepared emplacement; the walls on the summit were restacked in 1882-87.",
   why="The OR report says only that the battery ascended and went into battery on the summit (Law cl.3).",
   substitute="First fire on arrival (DD-FENCE1-07); hauling a selector with no default; no profile from the restacked walls.",
   recon="As substituted.",
   ask="None beyond DD-FENCE1-07."),
 'G-07': dict(title="Hart's 15th NY in the Peach Orchard (G-07): 'Wheatfield Road' and Knox's gun",
   open="Documented: four 12-pdr, 16:00 ordered and 16:30 placed (New York book), canister at a minute that no source gives (after the placing and before the infantry gave way about 17:45). Not found: 'on the Wheatfield Road', and 'Lieutenant Knox pulled a gun off by hand'. Position conflict: left of the orchard (Hart) vs on the right and a little in front of the New Jersey battery (McGilvery).",
   why="The reports and the state book do not name the road or the Knox incident (Law cl.3).",
   substitute="Four Napoleons facing south in the Peach Orchard area, position selector, clocks 16:00 ordered / 16:30 placed, canister inside 16:30-17:45 (no source clock; the PDF's 17:30 inside).",
   recon="As substituted; the road name and the Knox incident kept as marked PDF-only wording.",
   ask="None."),
 'G-08': dict(title="Huger's four batteries (G-08): per-battery counts",
   open="Confirmed with additions: the 36 guns are Alexander's memoir (18 of Cabell's battalion plus 18 of his own); the OR gives only Taylor's four Napoleons (and Moody's four 24-pdr howitzers on 3 Jul). Still open: guns of Parker's and Rhett's batteries, and the 16 (battery reports) vs 18 (memoir) Cabell count.",
   why="The Official Records give no per-battery count for three of the four batteries (Law cl.3).",
   substitute="Four batteries named, 36 guns as a selectable total, no works.",
   recon="As substituted.",
   ask="None."),
 'G-09': dict(title="Cabell's battalion (G-09): the small brick house",
   open="Confirmed with additions: 16 guns in four batteries; stone/rock fences in front of two batteries on 2 Jul; the six-gun group near 'a small brick house' on 3 Jul. Open: which house is meant (no source read names it).",
   why="Cabell and the battery officers do not name the house (Law cl.3).",
   substitute="A house marker on the Emmitsburg road unplaced on the basemap, marked as open.",
   recon="Documented positions; the house location an open gap.",
   ask="None."),
 'G-10': dict(title="Bigelow's 9th Mass. (G-10): the overrun hour, horse losses and the Hunt text",
   open="Documented: second position at a corner of two stone walls (Milton), the Trostle farm wall (NPS), 'close by' or 'near the Trostle house' (Hunt in B&L, Meade, Toombs); hand-to-hand fighting and the 21st Mississippi (Hunt in B&L p.310, one retrospective source; the NPS names the regiment); retirement 300 yd (Milton) or 350 (McGilvery) not 400. Horse losses: 60 (Milton 45 + 15), 65 (Hunt in B&L, one scan; Fox's reading of Milton), 80 of 88 (Hunt in the Century via Fox), 80 (Meade). Not found: the 18:30 overrun hour (between about 17:45 and 21:00) and 'Wheatfield Road' / 'Ziegler's Grove' as OR place names.",
   why="No Confederate report of Barksdale's brigade or of the 21st Mississippi was found in the local Official Records index and the Union reports give no clock for the loss of the guns (Law cl.3).",
   substitute="Capture window 17:45-21:00 with the PDF's 18:30 selectable; horse losses as a selector (60 default per the OR, 65, 80 of 88, 80).",
   recon="As substituted; hand-to-hand fighting shown with its single retrospective source.",
   ask="None beyond DD-F2-04."),
 'G-11': dict(title="McGilvery's line (G-11): gun totals of the 2 Jul evening line and the earthwork",
   open="Confirmed split: 2 Jul evening improvised (McGilvery names the units and no total; Hunt in B&L p.310 has 'some twentyfive guns' on the line when formed), 3 Jul morning prepared (39 guns on McGilvery's list, 33 plus Cooper's four on Hunt's; a slight earthwork). Not found: the PDF's 'varied from 6 to 23 guns'; the dimensions of the 3 Jul earthwork ('slight'); NPS lists McGilvery's Battalion Lunettes as a battle-origin work rebuilt in 1891.",
   why="McGilvery gives no total for the evening line (Law cl.3).",
   substitute="G-11a and G-11b as in DD-04; the 39-gun roster; earthwork profile plausible-procedural.",
   recon="As substituted.",
   ask="None: DD-04 stands."),
 'G-12': dict(title="Cushing's battery (G-12): earthwork, guns run to the wall, double canister",
   open="Documented: six 3-inch guns in the Second Corps line in place on the morning of 2 Jul; all guns but one silenced by 14:45 (Webb); three guns run to the fence (Webb), one (Hall) or two (NPS); no earthwork or gun pit named anywhere. Not found: 'four of six', 'double canister at about 100 yd', 'between the 71st and 72nd'.",
   why="No report mentions a work at Cushing's guns; the Angle wall pre-existed (Law cl.3).",
   substitute="No built-on-screen work at G-12 (DD-04); guns at the wall as a selector 1/2/3.",
   recon="As substituted.",
   ask="None: DD-04 stands."),
 'G-13': dict(title="Union ridge line on 3 Jul (G-13): counts of 120 and 34 and the Hancock-Hunt order",
   open="Counts: 75 (Hunt OR), 77 (Hunt B&L), 108 Reserve guns on the field (Tyler), 166-220 (Alexander 1907). Not found: 'up to 120 (ABT)' and '34 disabled'. The order dispute is documented from Hart's report and Hunt's B&L article, not from Hancock's report.",
   why="Two PDF figures rest on sources that are not reachable and on no source read (Law cl.3).",
   substitute="Count selector with the documented values; the PDF's 120 and 34 shown as PDF-only.",
   recon="As substituted.",
   ask="None."),
 'G-14': dict(title="Confederate gun line on 3 Jul (G-14): the 179 figure, the line length, works at Poague's lunettes",
   open="Counts: nearly 150 (Pendleton), 115-150 (Hancock), at least 140 (McGilvery), 172 (Alexander 1907, with a breakdown). Not found: Alexander's 179; 'more than 2 miles from the Peach Orchard along the Emmitsburg Road' for the guns (Alexander has about 1,300 yd for the First Corps line; the NPS has over two miles for the whole Confederate line). The NPS lists Poague's Battalion lunettes and Reilly's Section stone lunettes as battle-origin works: their dates inside the battle are not given.",
   why="The record read gives no date or builder for the Poague and Reilly works and no source for 179 (Law cl.3).",
   substitute="Count selector; line length per Alexander and the NPS; works marked at Poague's and Reilly's positions with the window 1-4 Jul unknown.",
   recon="As substituted.",
   ask="None."),
 'G-15': dict(title="Carter's rifles (G-15): ten or twenty guns",
   open="Confirmed with an added conflict: ten rifled guns either side of the railroad cut (Carter); 20 rifles of Carter's plus four of Graham's (Alexander 1907). Which batteries formed the ten is not stated.",
   why="The two counts have no reconciling source (Law cl.3).",
   substitute="Count selector 10 / 20; solid shot only.",
   recon="As substituted.",
   ask="None."),
 'G-16': dict(title="Hurt's Whitworths (G-16): the marker's 3-inch rifles and the Whitworth signal",
   open="Documented: two Whitworths moved on the morning of 3 Jul to a commanding point north of the railroad cut (McIntosh), the highest position on Oak Hill (NPS), nearly a mile north of the Third Corps line (Alexander), two miles from Milton's guns. Not found: 'two 3-inch rifles' at the marker and 'Whitworths fired the signal' (four witnesses give Miller's two guns).",
   why="The marker text and the forum/HistoryNet pages are not readable here; no OR witness names a Whitworth signal (Law cl.3).",
   substitute="Two Whitworths on Oak Hill; signal by two guns of Miller's battery 13:00-14:00; the Whitworth signal kept as a marked PDF-only alternative.",
   recon="As substituted.",
   ask="None. The tablet text of the Hardaway Alabama Artillery position is not in a source read here (the NPS Cultural Landscape Report says the guns and tablet were completed by the park commission in 1906, with two original Whitworth guns on special carriages); the PDF's 'plus two 3-inch rifles' stays marked unsupported."),
}

def blocked_txt(r):
    if not r['blocked_host']: return 'none'
    return '; '.join('%s (URL %s; status %s)' % (b['source_key'], b['url'] or 'not printed in the PDF source list', b['status']) for b in r['blocked_host'])

def write(eid, title, reqs, desc, why, searched, subst, recon, tier, comp, mark, impact, ask, rec, status):
    p = os.path.join(OUT, 'terrain-1-%s.md' % eid)
    with open(p, 'w', encoding='utf-8') as f:
        f.write('# terrain-1-%s: %s\n\n| Field | Content |\n|---|---|\n' % (eid, title))
        for k, v in (('ID', 'terrain-1-' + eid), ('Requirement IDs', reqs), ('Category', 'evidence missing / source conflict (close-out 2026-11-13)'), ('Description', desc),
                     ('Why literal 100% is not possible or blocked', why), ('Evidence searched', searched), ('Autonomous substitute applied', subst),
                     ('Strongest evidence-based reconstruction', recon), ('Confidence tier', tier), ('Competing values', comp), ('Product marking', mark),
                     ('Visual and audio impact', impact), ('Review status', 'internal review only (DEC-006: no public review label)'),
                     ('Owner decision requested', ask), ('Agent recommendation', rec), ('Status', status), ('Owner decision and date', '(filled only from the Decision Log)')):
            f.write('| %s | %s |\n' % (k, str(v).replace('\n', ' ').replace('|', '/')))

for n in range(1, 17):
    gid = 'G-%02d' % n; r = rows['R13.' + gid]; m = META[gid]
    eid = 'EG-%02d' % n
    ts = r['tier_summary']
    tier = 'documented (%d sub-claims), inferred (%d), open gap (%d); never promoted above the weakest named tier' % (ts.get('documented', 0), ts.get('inferred', 0), ts.get('open_gap', 0))
    comp = '; '.join(r['conflicts_carried']) or 'none'
    desc = 'Close-out 2026-11-13 (verdict %s; earlier text of 2026-11-04 superseded). %s Still unsupported: %s.' % (r['verdict'], m['open'], '; '.join(r['stays_unsupported']) or 'none')
    searched = SRCTXT + ' Blocked pages: ' + blocked_txt(r) + '.'
    write(eid, m['title'], 'R13, R13.%s (existing register %s)' % (gid, REGMAP[gid]), desc, m['why'], searched, m['substitute'], m['recon'], tier, comp,
          'Tier overlay glyph on the emplacement; gap marker on every value listed under Still unsupported; PDF-only values shown with their source and marked unsupported.',
          'Gun emplacement meshes, crew counts, work stages, time windows (see the request note for the world-content workstream).', m['ask'],
          'Carry the corrected value as the default scenario and every other value as a selectable scenario; never delete a PDF value (Law cl.6).',
          'open (updated by the close-out 2026-11-13; row verdict %s)' % r['verdict'])

# EG-17: top-level and kit gaps
r0 = rows['R13.0000']
desc = ("Close-out 2026-11-13. R13.0000 cannot pass: G-01..G-16 are confirmed (4: G-03, G-08, G-09, G-15), corrected (6: G-01, G-02, G-06, G-10, G-11, G-12) or partially supported (6: G-04, G-05, G-07, G-13, G-14, G-16), each with unsupported or conflicting parts registered in terrain-1-EG-01..16; G-17, G-18 and P-01..P-14 belong to terrain-2. "
        "The kit file still shows 'gap' for batteries whose guns the Official Records state: US.ART.4th_US_B (Stewart: six 12-pounders, four serviceable on the evening of 1 Jul), US.ART.1st_NY_I (Wiedrich: six 3-inch per Osborn, four per Hunt and Wainwright), US.ART.2nd_Maine_B (Hall: six 3-inch), US.ART.5th_Maine_E (Stevens: six 12-pounders) and the 1st NY L battery (Reynolds: six 3-inch, five on the evening); Cabell's four batteries (four guns each); Andrews' battalion (14 + 2).")
write('EG-17', 'R13.0000 and the kit gaps that the Official Records can fill', 'R13.0000 (existing register EG-0165), R13 kit rows', desc,
      'The top-level row passes only when all children pass or link to an open entry; they link, they do not pass. No gate was run (Q03, Q07, Q08, Q09, Q26) and no passes flag was touched.',
      SRCTXT, 'Per-battery gun counts from the Official Records are listed in the request note for the world-content workstream; nothing was patched in the kit by this shard.',
      'All 16 gun rows carry corrected values with citations; kit patches are for the world-content workstream.',
      'documented (gun counts quoted); open gaps remain per row', 'See each row.',
      'Gap markers wherever a count or a work is unsupported.', 'Gun counts in the kit; emplacement classes in the structures file.',
      'None.', 'Apply the corrected defaults and keep every PDF value selectable.', 'open (updated by the close-out 2026-11-13)')
print('wrote 17 entries to', OUT)
