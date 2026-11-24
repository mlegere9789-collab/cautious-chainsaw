"""Gate Q18 / Q17 closure for sub-requirements that no open register entry covered.
Two outputs, both deterministic and idempotent (run after seed_register.py + register_from_proposed.py, before link_subreqs.py):
 1. register/proposed/subreq-gaps/sg-NN.md : NEW honest gap entries for sub-requirements whose gap no existing entry covers.
    Integrate with register_from_proposed.py. Nothing here is a verification or a pass; every statement is copied from a repo file
    named in the entry or is a plain statement that a thing was not read / not run / does not exist.
 2. subreq_gap_links.json : sub-requirement id -> register ids (existing EG ids, or the proposed ids sg-NN above, resolved by
    link_subreqs.py through register_index.json) with a one-line basis. Every existing-entry link was checked by reading that entry's
    text against the sub-requirement; a link is not a pass.
Why a separate links file: seed_register.py regenerates requirements.json with empty links, and the shard-derived links
(subreq_links.json) are evidence rows written by shards; these curated links must survive regeneration."""
import json, os
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
G = os.path.join(ROOT, 'docs', 'battle-theatre', 'GOVERNANCE')
OUT = os.path.join(G, 'register', 'proposed', 'subreq-gaps')
SS = 'docs/battle-theatre/structures/state_schedule.json'
TS = 'docs/battle-theatre/terrain/terrain_sources.json'
SL = 'GOVERNANCE/subreq_links.json'
NR = 'Not re-verified in this pass.'

def E(n, title, rids, cat, desc, why, searched, subst, recon, tier, marking, close, owner='-', competing='-'):
    return dict(n=n, title=title, rids=rids, cat=cat, desc=desc, why=why, searched=searched, subst=subst, recon=recon, tier=tier,
                marking=marking, close=close, owner=owner, competing=competing)

STRUCT_WHY = 'Every cited source key of the row is a weak source (secondary web page); no non-lead source was read for the exact claim (Law cl.4).'
STRUCT_SUBST = 'Row stays in state_schedule.json as seeded_unverified and tier inferred (downgraded mechanically); no state change is invented beyond the printed row.'

NEW = [
 E(1, 'Epilogue row E-009: Everett oration (Nov 19), duration, word count and Lamon introduction not supported by any source read', ['R22'],
   'evidence missing',
   'Epilogue row E-009 (Nov 19, about two hours; Edward Everett on the platform; Lamon introduces; the text counted at 13,607 words; the film shows a compressed segment with a visible time-skip) has no register entry naming it. Not supported by any source read in the repository: the two-hour duration, the 13,607-word count, and Lamon introducing Everett (the PDF itself attributes Lamon only to GC-COMP, a blog-class lead).',
   'No non-lead source has been read for these sub-claims; the register entries EG-0022 and EG-0127 record only the NPS and LOC pages fetched and the ws9 OCR narrowing for E-001 (Law cl.3, cl.4).',
   'Searched register_index.json and every register entry for "E-009": no entry names it. EG-0022, EG-0120 and EG-0127 read; none states anything about the Everett oration duration, word count or introducer.',
   'Row stays in the epilogue chapter, marked unverified; the compressed segment with a visible time-skip is a film device stated by the PDF, not a source claim.',
   'Show only what a retrieved non-lead source states about the oration; mark duration, word count and introducer as visible gaps until one is read.',
   'plausible-procedural', 'Tier marker and visible gap marker on the E-009 card.',
   'A non-lead source (the printed Everett oration or a 1863 newspaper report) read for duration, word count and introducer, recorded in the Decision Log; then a passing realization record for the row.',
   owner='Accept visible-gap marking for the Everett oration until a non-lead source is read? (PENDING OWNER)'),
 E(2, 'Epilogue row E-011: Lincoln dedicatory remarks, reaction conflict, duration and attendee list not supported by any source read', ['R22'],
   'evidence missing and source conflict (selectable scenario)',
   'Epilogue row E-011 (Nov 19 afternoon; Lincoln gives the dedicatory remarks, under two minutes in EWH; six governors present; named reporters; applause during and after per GC-COMP versus a muted response per EWH; delivered wording is a gap, see B.12.4) has no register entry naming it. The reaction conflict, the under-two-minutes duration, the six named governors and the named reporters are not supported by any non-lead source read in the repository.',
   'The PDF cites GC-COMP and EWH (comparative and encyclopedic leads) only; no non-lead source retrieved for these sub-claims (Law cl.3, cl.4).',
   'Searched register_index.json for "E-011": no entry names it. EG-0022 (Lincoln voice, delivered wording, Nov 19 weather) and EG-0120 (epilogue conflicts not in the conflict register) read: they do not cover the reaction conflict, the duration, the governors or the reporters of this row.',
   'Both reaction readings are kept as selectable scenarios; no default is chosen here (Law cl.6). The PDF default (muted reading) is PENDING OWNER.',
   'Show only retrieved facts; carry applause and muted response as two selectable alternatives; mark delivered wording, duration and the attendee list as visible gaps.',
   'plausible-procedural', 'Tier marker, visible gap marker, scenario selector for the reaction.',
   'Non-lead sources read for the reaction, duration, governors and reporters; owner decision on the default reaction; then a passing realization record for the row.',
   owner='Default view of the applause versus muted reaction (PENDING OWNER; none chosen here).',
   competing='Applause during and after (GC-COMP) vs muted response (EWH).'),
 E(3, 'S-040 Trostle barn: shell hole, bullet strikes and dead horses on Jul 2 evening rest on one Stone Sentinels page', ['R14'],
   'evidence missing (state change not verified)',
   'State-schedule row S-040 (Trostle barn, Intact -> shell hole on the south side, bullets on the east side, dead horses in the yard, evening Jul 2, trigger fighting) cites only SS-Trostle (Stone Sentinels). The part of the day inside Jul 2 is not known (granularity date) and the damage description is not supported by a non-lead source read here. Row data: ' + SS + '.',
   STRUCT_WHY, 'Read state_schedule.json row S-040 (tier inferred, weak_source true, claim_support_verified false). Searched all open register entries for "Trostle barn": none covers it (EG-0259 names the Trostle headquarters identity, not the barn damage).',
   STRUCT_SUBST, 'Apply the printed damage at the evening of Jul 2 as inferred, marked; no hour inside the day is invented.',
   'inferred', 'Tier glyph on the barn; unverified-row marker in the evidence layer.',
   'A non-lead source (OR report or period account) for the barn damage and its timing, then Q09 re-run.'),
 E(4, 'S-076 railroad traffic resumes Jul 10: single Wikipedia-class source, one source says 1865', ['R14'],
   'evidence missing and source conflict (selectable scenario)',
   'State-schedule row S-076 (Railroad, Cut -> Traffic resumes, Jul 10, trigger repairs) cites only Wiki-Station; the PDF B.8.2 records that one source says 1865. The row carries two scenarios: resumed_jul10 and one_source_1865 (outside the 1863 film window, modelled as not occurring). No non-lead source read states the resumption date. Row data: ' + SS + '.',
   STRUCT_WHY, 'Read state_schedule.json row S-076 (tier inferred, weak_source true). Searched all open register entries for railroad resumption or repair of the line: none covers it (EG-0376 and EG-0124 concern other Jul 6-9 hospital and burial items).',
   'Both values kept as selectable scenarios; no default picked (Law cl.6); PDF default PENDING OWNER.', 'Show the Jul 10 reading as inferred and marked, with the 1865 reading selectable.',
   'inferred', 'Tier glyph; scenario selector.', 'A non-lead source for the resumption date; owner decision on the default.',
   owner='Default view of Jul 10 versus the 1865 passage (PENDING OWNER).', competing='Jul 10 (B.8.7) vs one source saying 1865 (B.8.2).'),
 E(5, 'S-078 McPherson house burned 1895: outside the 1863 film window, source is Stone Sentinels only', ['R14'],
   'evidence missing (out of battle scope row)',
   'State-schedule row S-078 (McPherson house, Standing -> Burned 1895, time "Later") is marked out of battle scope in state_schedule.json (not scheduled; 1895 lies outside the Jun 26 - Nov 20 1863 timeline) and cites only SS-McPherson. It is carried and not dropped, but the 1895 date is not supported by a non-lead source read here. Note that EG-FX-G02 records that the McPherson barn did not burn (a different claim). Row data: ' + SS + '.',
   STRUCT_WHY, 'Read state_schedule.json row S-078 (out_of_battle_scope true, tier inferred, weak_source true). No open register entry covers the 1895 burning of the house.',
   'Row not scheduled inside the film window; carried as a marked out-of-scope record.', 'No animation of the 1895 fire; the house stands for the whole film window.',
   'inferred', 'Tier glyph; out-of-scope marker on the record.', 'A non-lead source for the 1895 date; owner confirmation that the row stays out of the film window.',
   owner='Confirm that the 1895 row stays out of the film window (PENDING OWNER).'),
 E(6, 'R12.009 Michler LOC item g3880.cw0508800 is not a Gettysburg battlefield source: the battlefield sheet of the 1869 atlas, if any, is not identified', ['R12'],
   'evidence missing (source identity)',
   'Terrain catalog item 9 ("Michler item at LOC", ' + TS + ') was verified (' + SL + ', R12.009) as the LOC title "Map of the region between Gettysburg, Pa. and Appomattox court house, Va.", a reduced redrawn index map of the 1869 Military Maps atlas. It is excluded from terrain by the PDF and by the check. What is missing: nothing read identifies whether the atlas holds a Gettysburg battlefield sheet at a usable scale, so no Michler terrain source is in use.',
   'LOC collection pages are blocked to the research tools (see EG-0144); the atlas content was not browsed.', 'Terrain source check R12.009 (subreq_links.json); register searched for "Michler": no open entry.',
   'Item excluded from terrain; no data taken from it.', 'None; no terrain claim rests on it.', 'plausible-procedural', 'None needed (not used).',
   'Atlas contents read through an allowed host and a decision recorded on whether a Gettysburg sheet exists.'),
 E(7, 'R12.010 Elliot annotated map (RG 77 E 73) and the oval Battlefield of Gettysburg map (E 72): scans not obtained, hospital and defence placement unread', ['R12'],
   'evidence missing (source not obtained)',
   'Terrain catalog item 10 (' + TS + ') names the NARA RG 77 items described on the NARA blog: E 73, an annotated Elliot map (Camp Letterman, burials, July 2-3 field hospitals, graves, dead horses, defences) and E 72 (1), a large oval map with roads and farms. ' + SL + ' (R12.010) records that the catalog IDs were retrieved from the blog but the scans were not obtained. The graves, dead-horse, defence and hospital positions the PDF values them for are therefore unread.',
   'NARA catalog pages are blocked to the research tools (EG-LIB-NARA-WARREN, EG-0131); scans not obtained.', 'Item verdict in subreq_links.json R12.010; open register entries searched for "Elliot" and "E 73": none about this item.',
   'No placement is taken from these maps; hospital and defence placement stay with the entries that already carry them as gaps.', 'Use the maps only when scans are obtained; until then nothing is drawn from them.',
   'plausible-procedural', 'Hospital and defence positions stay tier-marked.', 'Scans obtained through an allowed route or by an owner-made request; positions read and recorded.'),
 E(8, 'R12.016 NPS rehabilitation page: inconsistent time spans (140, 141, 147 years) and today\'s rehabilitated park is a proxy, not 1863', ['R12'],
   'evidence missing (source internally inconsistent)',
   'Terrain catalog item 16 (NPS rehabilitation program, ' + TS + ') was verified (' + SL + ', R12.016): the page states nine miles of fence rebuilt, the Pickett\'s Charge field restored to 12 small fields and non-historic trees removed, but gives "141 years", "147 years" and "140 years" in different places. The page describes the park as rehabilitated today; it is an interpretive proxy and is not used as 1863 ground truth (the CLAUDE.md rule on modern rebuilt walls applies).',
   'The page contradicts itself on the span; the 1863 state is not given by it.', 'Item verdict R12.016; open register entries searched for "rehabilitation": none.',
   'Quantities carried as stated and labelled modern; no 1863 profile derived from them.', 'Use only as policy context.', 'inferred', 'Modern-proxy label wherever used.',
   'The 1863 field and fence state read from period sources (entries EG-0089, EG-0091 and the fence entries carry those), and the span inconsistency noted in the source ledger.'),
 E(9, 'R12.018 Stone Sentinels Farms and Buildings: only the index of 22 pages was read, the content of the pages was not captured', ['R12'],
   'evidence missing (source content unread)',
   'Terrain catalog item 18 (' + TS + ') was verified only as to existence and scope (' + SL + ', R12.018): the farm index at gettysburg.stonesentinels.com lists 22 pages (Black Horse Tavern, Bliss, Brian, Codori, Hummelbaugh, Klingel, Leister, Lutheran Seminary, McAllister\'s Mill, McLean, McPherson, Rogers House, Rose, Rummel, Sherfy, Slyder, Snyder, Taney, Thompson and others). The PDF notes that the details of most pages were not captured and the source is a secondary aggregator.',
   'A secondary aggregator is not a non-lead source for any exact claim (Law cl.4); individual pages were not read for this item.', 'Item verdict R12.018; the many register entries that cite Stone Sentinels (for example EG-0269, EG-0347) carry their own claims and do not cover the unread pages.',
   'No building or farm detail is taken from the index; each farm claim stays with its own entry.', 'Read each page and check it against a primary source before use.', 'plausible-procedural', 'Tier marker on every farm claim that rests on it.',
   'Each farm page read and each claim checked against an OR report or period account.'),
 E(10, 'R12.040 Philippoteaux Cyclorama: dimensions, 1883 date and restoration dates not read; painting is low-weight artistic evidence', ['R12'],
   'evidence missing (source claims unread)',
   'Terrain catalog item 40 (' + TS + ') was checked for identity only (' + SL + ', R12.040): the NPS page "Cyclorama Painting - Gettysburg National Military Park" answers, but the 377 x 42 ft size, the 1883 Chicago opening and the 2003-08 restoration were not read from retained text. The PDF tier definitions place paintings in R4 (artistic work, low weight); Table 4 prints no tier for this row.',
   'The page claims were not read from retained text.', 'Item verdict R12.040; open register entries searched for "Cyclorama": none about it (EG-0100 is a rail-fence entry that mentions it only in passing).',
   'No sightline or terrain detail is taken from the painting.', 'Use for general sightlines only, marked R4, after the page is read.', 'plausible-procedural', 'R4 label wherever used.',
   'NPS page read and the three claims recorded or marked unsupported.'),
 E(11, 'R09 efficiency and budget: no Q27 budget gate result exists and the Appendix F caps are blank', ['R09'],
   'evidence missing (gate not run)',
   'R09 requires efficient use of the owner\'s usage. Gate Q27 (spend and compute against the Appendix F caps, fresh-context verification subagent per milestone) has no result file in GOVERNANCE/gate_results at this date, and GOVERNANCE/budget/phase_budget.json holds every cap and unit cost as null with owner_approved false ("blank until set from the first measured vertical slice; only the owner may raise caps"). No measured spend is recorded against any cap.',
   'Caps are set only from the first measured vertical slice and approved by the owner; neither exists yet.', 'Listed gate_results (no Q27.json); read phase_budget.json; searched register for budget or spend: only EG-AUD-G13 (voice budget on phones), which is a different budget.',
   'Work continues under the efficiency rules of PDF Section C (one feature per session, extract-once ledger, caches); no cap is invented.', 'Measure a vertical slice, record the caps, run the gate.', 'plausible-procedural', 'None (process item).',
   'Measured vertical slice recorded, caps set and approved by the owner, Q27 run and its result stored.',
   owner='Approve the Appendix F caps once measured (PENDING OWNER).'),
 E(12, 'R19 navigation: no Q12 scrub-test or Q24 viewer screenshot-regression result exists', ['R19'],
   'evidence missing (gates not run)',
   'R19 (users navigate back and forth in the battle) is traced to gates Q12 (random-access seek equals sequential playback) and Q24 (screenshot regression for the viewer). GOVERNANCE/gate_results holds no Q12 or Q24 result file at this date, so no navigation claim is checked. The entries that name R19 (EG-0104, EG-0276 to EG-0279, EG-0290) are clock-hour and unit-label gaps, not the navigation test.',
   'The gates have not been run; nothing is claimed.', 'Listed gate_results (no Q12.json, no Q24.json); register entries naming R19 read by title.',
   'None; no navigation pass is claimed.', 'Run Q12 and Q24 once a viewer build exists for them.', 'plausible-procedural', 'None (process item).',
   'Q12 and Q24 run and their results stored; any failure registered.'),
 E(13, 'OA01 separate Battle Theatre page: code largely in place but browser verification not repeated', ['OA01'],
   'evidence missing (verification not repeated)',
   'OA01 (separate page and renderer, entry button, Back with no leaked WebGL or audio, read-only reuse of the 16 tour stops and 512 monuments as camera bookmarks). The r22-oa shard evidence row (' + SL + ') says "largely satisfied in code; browser verification of this session not repeated". ' + NR,
   'The browser check that would show no leaked WebGL or audio was not repeated.', 'subreq_links.json OA01.0000; register searched for the Back/leak behaviour: no open entry.',
   'None; no pass claimed (passes stays false).', 'Repeat the browser verification and record it.', 'inferred', 'None.',
   'A recorded browser run showing entry, Back, no leaked WebGL or audio, and the bookmarks read-only.'),
 E(14, 'OA02 one-to-one soldier rendering is not achieved (shard verdict NOT MET)', ['OA02', 'R04'],
   'evidence missing (requirement not met)',
   'OA02 (every soldier individually animated; total rendered equals the number present; no performance capping without a recorded owner decision). The r22-oa shard evidence row (' + SL + ') records "NOT MET: one-to-one rendering of everyone present is not achieved". EG-0024 records the hardware limit (8 GB VRAM laptop GPU against the PDF assumption of 160k agents). No owner decision permitting capping is recorded. ' + NR,
   'Hardware limit (EG-0024) and an unmet renderer; capping is not allowed without an owner decision (Law cl.1).', 'subreq_links.json OA02.0000; EG-0024.',
   'None; no capping is applied silently.', 'Instance every soldier one-to-one, or obtain a recorded owner decision.', 'inferred', 'Shortfall reported, not hidden.',
   'Rendered count equals present count in a measured run, or an owner decision logged.', owner='Whether any performance cap is accepted (PENDING OWNER).'),
 E(15, 'OA06 unit activity, orientation and position accuracy: measured fidelity far below the owner target on the one pilot', ['OA06', 'R17'],
   'evidence missing (requirement not met)',
   'OA06 (owner target well over 97 percent, measured on documented unit-level quantities). The r22-oa shard evidence row (' + SL + ') records "NOT MET: measured fidelity far below the owner target on the one pilot; metric defined". ' + NR,
   'Only one pilot was measured; the target is not reached.', 'subreq_links.json OA06.0000; register searched for fidelity measurement: no open entry.',
   'None; the gap is reported.', 'Measure on all documented unit-level quantities and raise fidelity.', 'inferred', 'Shortfall reported.',
   'Measured fidelity at or above the owner target on documented quantities, recorded.'),
 E(16, 'OA07 human movement: procedural animation library not wired to the renderer', ['OA07'],
   'evidence missing (requirement partly met)',
   'OA07 (Hollywood-grade human movement including artillery fire and impact; shortfalls reported). The r22-oa shard evidence row (' + SL + ') records "PARTIAL: procedural animation library built; not wired to the renderer; not seen on screen". The motion sources themselves are open in EG-ANIM-04, EG-ANIM-09, EG-ANIM-10 and EG-ANIM-11. ' + NR,
   'Not wired and not seen on screen.', 'subreq_links.json OA07.0000; EG-ANIM entries read.',
   'None.', 'Wire the library to the renderer and record screen captures.', 'plausible-procedural', 'Modern-reconstruction label on authored motion.',
   'Library wired, observed on screen, shortfalls listed.'),
 E(17, 'OA08 every event on the timeline and playable: 296 of 691 rows have no default time and none places units', ['OA08', 'R11'],
   'evidence missing (requirement partly met)',
   'OA08 (every event from first shot to withdrawal is on the timeline and playable). The r22-oa shard evidence row (' + SL + ') records "PARTIAL: all 691 rows are loaded and listed; 296 of 691 have no default time and 0 place units". EG-0125 covers only fourteen 4 July rows without a default time. ' + NR,
   'Defaults for conflicting times are an owner decision (Law cl.6); placing units needs the position and arrival work.', 'subreq_links.json OA08.0000; EG-0125.',
   'Rows without a default time stay listed and marked; none is hidden.', 'Resolve times and place units row by row.', 'inferred', 'Rows without default time marked.',
   'Every row playable with a time basis and unit placement, or covered by its own open entry.', owner='Default times for conflicting rows (PENDING OWNER).'),
 E(18, 'S-080 Wills land purchase (17 acres, about $2,475.87, late July and August): sources are encyclopedia and comparative leads only', ['R22', 'R14'],
   'evidence missing (state not verified)',
   'Epilogue state S-080 (Land: none -> 17 acres bought by Wills for about $2,475.87 in late July and August, state on Nov 19 1863; cites W-CONS and GC-COMP; ' + SS + ') is not covered by any open register entry. Timeline tail row T3-218 gives "Aug 14 Wills buys 17 acres", which differs from the "late July and August" wording of S-080; the price is unsupported by any non-lead source read.',
   STRUCT_WHY, 'Read state_schedule.json row S-080 (tier inferred) and timeline_seed.jsonl T3-218. EG-0379 lists T3-218 but its text covers Camp Letterman dates only; EG-0127 and EG-0022 do not mention the land purchase.',
   'Row carried as seeded_unverified at tier inferred; both date wordings kept, none chosen.', 'Show the land as a state fact only after a non-lead source for date and price is read; until then a visible gap marker.',
   'inferred', 'Tier glyph and gap marker on the land state.', 'A non-lead source (Wills correspondence or a state report) read for date and price.',
   competing='Late July and August (S-080) vs Aug 14 (T3-218).'),
 E(19, 'S-081 Soldiers\' National Cemetery reburials: start date Oct 17 vs Oct 27, 3,512 bodies and 1,258 by Nov 19 unsupported', ['R22', 'R14'],
   'evidence missing and source conflict (selectable scenario)',
   'Epilogue state S-081 (Reburials: the first of 3,512 Union bodies moved on Oct 27; 1,258 reburied by Nov 19; work due to finish March 1864; sources W-CONS and GC-COMP; ' + SS + ') records a start-date conflict (Oct 17 vs Oct 27, also in timeline row T3-218). The counts 3,512 and 1,258 are not supported by any non-lead source read, and no open register entry covers them (EG-0379 lists T3-218 but covers Camp Letterman only; EG-0098 covers the cemetery fences).',
   STRUCT_WHY, 'Read state_schedule.json row S-081 (tier inferred, flag start date conflict) and timeline_seed.jsonl T3-218; read EG-0379 and EG-0098.',
   'Both start dates kept as selectable scenarios; no default chosen (Law cl.6).', 'Carry both start dates; show counts only as a range with a declared basis once a source is read.',
   'inferred', 'Tier glyph; scenario selector for the start date.', 'A non-lead source (the superintendent\'s or Weaver\'s report) read for the dates and counts.',
   owner='Default start date for the reburials (PENDING OWNER; none chosen here).', competing='Oct 17 vs Oct 27.'),
 E(20, 'S-087 Nov 19 crowd: about 15,000 vs 15,000 to 20,000 and its composition rest on W-CONS and EWH', ['R22', 'R14'],
   'evidence missing and source conflict (selectable scenario)',
   'Epilogue state S-087 (Crowd: about 15,000 per W-CONS to 15,000 to 20,000 per EWH; soldiers, civilians, widows, boys at the edge in a photograph, six governors, reporters; ' + SS + ') is not covered by any open register entry. The two figures conflict and the composition list is not supported by a source read here. The PDF tier printed is documented but the cited keys are encyclopedic.',
   STRUCT_WHY, 'Read state_schedule.json row S-087; searched register entries for the crowd size: none (E-011 and E-009 are covered by their own entries).',
   'Crowd size carried as a range with both figures; no single number chosen.', 'Draw the range with a declared basis and mark the composition as unverified.',
   'inferred', 'Range label and tier glyph on the crowd.', 'A non-lead source (contemporary reports) read for the crowd size.', competing='About 15,000 (W-CONS) vs 15,000 to 20,000 (EWH).'),
 E(21, 'S-088 torch-lit evening of Nov 18: celebrating crowds, bands and alcohol rest on EWH alone', ['R22', 'R14'],
   'evidence missing (state not verified)',
   'Epilogue state S-088 (Torch-lit evening before: celebrating crowds, bands and alcohol in the streets on the night of November 18; source EWH; ' + SS + ') is not supported by any non-lead source read in the repository. EG-0127 covers E-002 (Harper house, Nov 18 evening) and E-008 (Marine Band) and the ws9 pass narrowed only the serenade and Seward remarks for E-001; none addresses crowds, bands or alcohol in the streets.',
   STRUCT_WHY, 'Read state_schedule.json row S-088 and EG-0127 (with its ws9 history).',
   'Row kept as seeded_unverified; nothing beyond the printed row is shown.', 'Show crowds and bands only as plausible-procedural and marked, alcohol as a gap, until a non-lead source is read.',
   'plausible-procedural', 'Tier glyph and gap marker.', 'A non-lead source (the Nov 18 evening serenade and street accounts) read.'),
]

def write_new():
    os.makedirs(OUT, exist_ok=True); n = 0
    for e in NEW:
        pid = 'sg-%02d' % e['n']; p = os.path.join(OUT, pid + '.md')
        rows = [('ID', pid), ('Requirement IDs', ', '.join(e['rids'])), ('Category', e['cat']), ('Description', e['desc']),
                ('Why literal 100% is not possible or blocked', e['why']), ('Evidence searched', e['searched']),
                ('Autonomous substitute applied', e['subst']), ('Strongest evidence-based reconstruction', e['recon']),
                ('Confidence tier', e['tier']), ('Competing values', e['competing']), ('Product marking', e['marking']),
                ('How it would be closed', e['close']), ('Owner decision requested', e['owner']),
                ('Status', 'open (proposed by tools/bt/propose_subreq_gaps.py)')]
        txt = '# %s: %s\n\n| Field | Content |\n|---|---|\n' % (pid, e['title']) + ''.join('| %s | %s |\n' % (a, b.replace('|', '/').replace('\n', ' ')) for a, b in rows)
        if not os.path.exists(p) or open(p, encoding='utf-8').read() != txt:
            open(p, 'w', encoding='utf-8').write(txt); n += 1
    return n

# sub-requirement -> (register ids, basis). Existing ids were each checked by reading the entry against the row.
L = {}
def link(subs, ids, basis):
    for s in subs.split():
        L[s] = {'register_ids': ids, 'basis': basis % s if '%s' in basis else basis}
link('R22.0009', ['sg-01'], 'New entry: E-009 named by no existing entry.')
link('R22.0011', ['sg-02'], 'New entry: E-011 named by no existing entry.')
link('R14.S-001', ['EG-0830', 'EG-FX-G08'], 'EG-0830 (row T1-016: small railroad bridge, Jun 26 or 27, window wider than the sources) and EG-FX-G08 (trestle Jun 26 or 27, part of day unrecorded).')
link('R14.S-002', ['EG-0419'], 'EG-0419: which building carried the Jun 30 signal station (Pennsylvania Hall or Schmucker Hall).')
link('R14.S-005', ['EG-0439'], 'EG-0439: Gamble dismounted under cover of trees and fences on Jul 1 morning; carbine mix.')
link('R14.S-007', ['EG-0173'], 'EG-0173: P-12 railroad cut, unfinished status and ~11:00 use-time unsupported.')
link('R14.S-011', ['EG-0071', 'EG-0500'], 'EG-0071 (seminary rail barricade) and EG-0500 (16:30 Doubleday order; hour of the seminary-line intrenchments).')
link('R14.S-013', ['EG-0511'], 'EG-0511: Seminary taken by late afternoon of Jul 1 and held through the battle; hour unsupported.')
link('R14.S-017', ['EG-0514'], 'EG-0514: McPherson farm Confederate aid station and hospital, Jul 1 evening.')
link('R14.S-018', ['EG-0511'], 'EG-0511: Pennsylvania Hall taken, hour unsupported.')
link('R14.S-019', ['EG-0512'], 'EG-0512: capture of the Presbyterian Church hospital and the hour, Jul 1.')
link('R14.S-022', ['EG-0320', 'EG-0259'], 'EG-0320 (sniping, Sweney/Rupp/McCreary houses no primary) and EG-0259 (Sweney and Rupp houses not in the OR).')
link('R14.S-025', ['EG-0073'], 'EG-0073: Culp\'s Hill traverse (E-06) build time and size.')
link('R14.S-027', ['EG-0274'], 'EG-0274: Spangler/Weikert hospital details.')
link('R14.S-028 R14.S-065', ['EG-0330'], 'EG-0330: Granite Schoolhouse hospital move.')
link('R14.S-029', ['EG-0259'], 'EG-0259: Trostle headquarters identity not in the OR.')
link('R14.S-030', ['EG-0259'], 'EG-0259: Sherfy family movements not in the OR.')
link('R14.S-031', ['EG-0152'], 'EG-0152: Latimer\'s battalion (G-04) on Benner\'s Hill, no OR gun counts; four guns at dusk.')
link('R14.S-036 R14.S-037', ['EG-0269', 'EG-0347'], 'EG-0269 and EG-0347: Sherfy barn fire timing and house shell damage.')
link('R14.S-040', ['sg-03'], 'New entry: Trostle barn damage covered by no existing entry.')
link('R14.S-041', ['EG-0281'], 'EG-0281: Greene about 1,400 men and 800 yards on Jul 2 evening not found in the OR.')
link('R14.S-044', ['EG-0738'], 'EG-0738: damage to the Evergreen gatehouse not in the passage read.')
link('R14.S-047', ['EG-0305'], 'EG-0305: Weed\'s place and hour of death, hospital arrangements Jul 2-3.')
link('R14.S-048', ['EG-0274'], 'EG-0274: III Corps Taneytown Road to White Run and V Corps hospital moves.')
link('R14.S-049', ['EG-0305'], 'EG-0305: hospital operating arrangements on the night of Jul 2-3.')
link('R14.S-051', ['EG-0318'], 'EG-0318: Jennie Wade hour and circumstances; ~08:00 unsupported.')
link('R14.S-052', ['EG-0642', 'EG-FX-G08'], 'EG-0642 (Bliss burning on Jul 3; name and barn size not in the OR) and EG-FX-G08 (Bliss Jul 3 morning, part of day unrecorded).')
link('R14.S-060', ['EG-0327'], 'EG-0327: Meade HQ at the Leister house and move to Powers Hill.')
link('R14.S-064', ['EG-0809'], 'EG-0809: Leister aid station on the night of Jul 3 not in the OR.')
link('R14.S-067', ['EG-0351'], 'EG-0351: Imboden summons and departure of the wagon train (ambulance trains Jul 4).')
link('R14.S-069', ['EG-0352', 'EG-0289'], 'EG-0352 (Jul 3-4 rain hours) and EG-0289 (Plum Run crawling and flooding).')
link('R14.S-070', ['EG-0352'], 'EG-0352: Jul 4 rain hours.')
link('R14.S-072', ['EG-0371', 'EG-0346'], 'EG-0371 (Armistead date and place of death) and EG-0346 (Armistead at the Spangler hospital).')
link('R14.S-074', ['EG-TL-T3-185'], 'EG-TL-T3-185: Tillie Pierce returns Jul 7, dates a gap.')
link('R14.S-076', ['sg-04'], 'New entry: railroad resumption covered by no existing entry.')
link('R14.S-077', ['EG-0379'], 'EG-0379: Camp Letterman opening, counts and closure.')
link('R14.S-078', ['sg-05'], 'New entry: 1895 burning covered by no existing entry.')
link('R14.E-04', ['EG-0200'], 'EG-0200: earthwork start on Cemetery Hill on Jul 1 afternoon (von Steinwehr).')
link('R14.E-05', ['EG-0219', 'EG-0229'], 'EG-0219 (start and completion of XII Corps works on Culp\'s Hill) and EG-0229 (start of Culp\'s Hill works).')
link('R14.E-09', ['EG-0281', 'EG-0073'], 'EG-0281 (Greene 800 yards) and EG-0073 (137th NY traverse).')
link('R14.E-14', ['EG-0077'], 'EG-0077: Little Round Top and Devil\'s Den no-works claims; hand-hauling.')
link('R14.S-080', ['sg-18'], 'New entry.')
link('R14.S-081', ['sg-19'], 'New entry.')
link('R14.S-085', ['EG-0022'], 'EG-0022: Nov 19 weather and foliage open.')
link('R14.S-086', ['EG-0022', 'EG-0120'], 'EG-0022 (Nov 19 weather open) and EG-0120 (Nov 19 sky values carried as scenario values).')
link('R14.S-087', ['sg-20'], 'New entry.')
link('R14.S-088', ['sg-21'], 'New entry.')
link('R12.006', ['EG-LIB-BACHELDER'], 'EG-LIB-BACHELDER: Bachelder Papers originals print-only (NH Historical Society).')
link('R12.008', ['EG-LIB-LOC-MAPS'], 'EG-LIB-LOC-MAPS: names Hopkins LOC 2004629149; LOC blocked.')
link('R12.009', ['sg-06'], 'New entry.')
link('R12.010', ['sg-07'], 'New entry.')
link('R12.016', ['sg-08'], 'New entry.')
link('R12.018', ['sg-09'], 'New entry.')
link('R12.022', ['EG-0135'], 'EG-0135: USGS 3DEP lidar project D24 not ingested.')
link('R12.031', ['EG-0141'], 'EG-0141: names R12.031 (NPS small-scale base located by title only).')
link('R12.040', ['sg-10'], 'New entry.')
link('R03.C-017', ['EG-0710'], 'EG-0710: Birney took command at Sickles\'s request; Hancock command conflict carried without a default.')
link('R03.C-028', ['EG-0008'], 'EG-0008: names C-028 (Hunt\'s guns 05:30 vs 04:30/04:00).')
link('R01.0000', ['EG-0024'], 'EG-0024: hardware limit on a fly-around of the entire battle.')
link('R02.0000', ['EG-0021', 'EG-0027', 'EG-0131'], 'Terrain source and elevation gaps.')
link('R04.0000', ['EG-0001', 'EG-0004', 'EG-FIG-0001', 'EG-FIG-0004'], 'Soldier and commander appearance gaps.')
link('R05.0000', ['EG-ANIM-09', 'EG-ANIM-11', 'EG-0012'], 'Non-drill activity, stretcher/field hospital handling and night activity gaps.')
link('R06.0000', ['EG-0002', 'EG-0003', 'EG-AUD-G01'], 'Real 1863 audio, atmosphere and weapon recordings gaps.')
link('R07.0000', ['EG-0391', 'EG-0407', 'EG-0409', 'EG-0470', 'EG-0122'], 'Start-to-finish coverage gaps: Jun 26 start, bivouac sites Jun 27-28, Lee arrival, Jul 4 retreat.')
link('R08.0000', ['EG-0024'], 'EG-0024: owner GPU limit against the PDF hardware assumptions.')
link('R09.0000', ['sg-11'], 'New entry.')
link('R10.0000', ['EG-0017', 'EG-0016', 'EG-0009'], 'Regiment-by-regiment armament, Confederate dress and arms, 140th NY dress gaps.')
link('R11.0000', ['EG-0005', 'EG-0006', 'EG-0011'], 'Primary sources unread, row-count over-statement, Sickles default gaps.')
link('R15.0000', ['EG-0019', 'EG-0003', 'EG-0026'], 'Weather and atmosphere gaps.')
link('R16.0000', ['EG-ANIM-07', 'EG-ANIM-08', 'EG-CAV-09'], 'Cavalry gait, drill and horse furniture gaps.')
link('R17.0000', ['EG-0001', 'EG-FIG-0001', 'EG-ANIM-01'], 'Soldier appearance and per-minute activity gaps.')
link('R18.0000', ['EG-0012', 'EG-ANIM-09'], 'Night activity gaps.')
link('R19.0000', ['sg-12'], 'New entry.')
link('R20.0000', ['EG-0020'], 'EG-0020: vegetation and crop state.')
link('OA01.0000', ['sg-13'], 'New entry.')
link('OA02.0000', ['sg-14', 'EG-0024'], 'New entry plus EG-0024 hardware limit.')
link('OA05.0000', ['EG-AUD-G01', 'EG-0002'], 'Real 1863 weapon recordings missing.')
link('OA06.0000', ['sg-15'], 'New entry.')
link('OA07.0000', ['sg-16', 'EG-ANIM-04', 'EG-ANIM-10'], 'New entry plus artillery recoil and fall style source gaps.')
link('OA08.0000', ['sg-17', 'EG-0125'], 'New entry plus the 4 July rows without default time.')
link('OA10.0000', ['EG-0021', 'EG-0027', 'EG-0014'], 'Terrain, 1863 elevation and earthwork dimension gaps.')
link('OA11.0000', ['EG-ANIM-09'], 'EG-ANIM-09: non-drill activities (digging, cooking, picket).')
link('OA12.0000', ['EG-ANIM-10', 'EG-ANIM-11'], 'Wound reactions; stretcher, ambulance and field hospital handling.')

def main():
    n = write_new()
    p = os.path.join(G, 'subreq_gap_links.json')
    doc = {'_doc': 'Curated sub-requirement -> register links (existing EG ids, or sg-NN proposed ids resolved by link_subreqs.py). Written by tools/bt/propose_subreq_gaps.py. A link is not a pass.', 'links': L}
    open(p, 'w', encoding='utf-8').write(json.dumps(doc, indent=1, ensure_ascii=False) + '\n')
    print('subreq-gap proposals written/updated', n, 'links', len(L))

if __name__ == '__main__': main()
