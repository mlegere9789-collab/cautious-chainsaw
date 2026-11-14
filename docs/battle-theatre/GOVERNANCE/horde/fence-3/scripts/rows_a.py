import sys
sys.path.insert(0, '/home/user/cautious-chainsaw/tmp/fence-3/scripts')
from rowlib import Row
from cite import OR, SV, LIB, WEB

SS_BASE = 'https://gettysburg.stonesentinels.com/battlefield-farms/'
NPS_TAG = {'1njcav': ('tmp/fence-3/web/nps_1njcav.txt', 'https://www.nps.gov/places/1st-nj-cavalry-monument.htm', 'NPS web page: 1st New Jersey Cavalry Monument (last updated 23 Sep 2022)', 'NPS-WEB-1NJCAV'),
           'leister_place': ('tmp/fence-3/web/nps_leister_place.txt', 'https://www.nps.gov/places/lydia-leister-farm.htm', "NPS web page: Lydia Leister Farm: Meade's Headquarters (last updated 10 Apr 2024)", 'NPS-WEB-LEISTER-FARM'),
           'leister3d': ('tmp/fence-3/web/nps_leister3d.txt', 'https://www.nps.gov/gett/learn/photosmultimedia/lydia-leister-house-3d.htm', 'NPS web page: Lydia Leister House 3D Tour (last updated 12 Jan 2021)', 'NPS-WEB-LEISTER-3D'),
           'snm': ('tmp/fence-3/web/nps_snm.txt', 'https://www.nps.gov/places/soldiers-national-monument.htm', "NPS web page: Soldiers' National Monument (last updated 23 Sep 2022)", 'NPS-WEB-SNM')}


def NPSW(tag, quote, **kw):
    p, u, t, sid = NPS_TAG[tag]
    return WEB(p, quote, u, '2026-11-13', t, source_id=sid, **kw)


def S053():
    R = Row('S-053')
    a1 = R.cite(SV('NY3', "During the fight the enemy's sharpshooters occupying a stone house, said to belong to Zeb. Taney, did great damage to some of our infantry regiments",
                   note='Battery M, 1st New York Light Artillery, regimental history in New York at Gettysburg vol. 3. The OCR then reads "Twenty-seventh liidiana" (Indiana); the quotation stops before it.'))
    a2 = R.cite(SV('NY3', 'A few well-directed percussion shells knocked the front out of the house, killed or wounded many of the sharpshooters concealed in it, and relieved our infantry from further danger or annoyance from that source.'))
    a3 = R.cite(SV('NY3', "during the forenoon of July 3d, by firing in the direction of Benner's Hill",
                   note='Sentence: both sections of Battery M "aided the infantry of the Twelfth Corps in retaking their breastworks ... during the forenoon of July 3d, by firing in the direction of Benner\'s Hill". The Taney house passage follows within the same paragraph.'))
    b1 = R.cite(SV('NY1', "During the morning Colgrove's regiments were annoyed by some Confederate sharpshooters who occupied the Taney house, on the opposite side of Rock Creek.", page='70',
                   note='Narrative of the Twelfth Corps right in vol. 1 (front matter). The running head 70 stands 1,698 characters before the passage and the head of p.71 is not legible in the OCR; the passage lies in the first half of the span between the heads 70 and 72, so p.70. The paragraph ends with the 10 o\'clock attack of Steuart\'s brigade, so the morning is 3 Jul.'))
    b2 = R.cite(SV('NY1', 'Battery M, First New York Light Artillery, which was in action near the Baitirnore Pike, trained one of its rifled guns on the house.', page='70', note='OCR reads "Baitirnore" for Baltimore.'))
    b3 = R.cite(SV('NY1', 'With a few well-aimed percussion shells it soon made the building untenable, killing and wounding some of the videttes who occupied it.', page='70'))
    d1 = R.cite(LIB('NPS-SPANGLERS-SPRING', 'His division was drawn up in two lines, the left flank resting at the Taney house', title="NPS, F. Tilberg, Proposed Restoration of the Spangler's Spring-Culp's Hill Area (20 Jul 1940), quoting the Comte de Paris",
                    note='Johnson\'s division before the attack of the evening of 2 Jul, "left flank resting at the Taney house (Compte de Paris, 185)" as the 1940 report prints it (OCR "l8f>").'))
    e1 = R.cite(LIB('NPS-BOUNDARY-1988', 'The farm was the site of intense skirmishing between Union and Confederate troops during the battle.', title='NPS, Boundary Study, Gettysburg National Military Park (1988): the Taney Farm donation of 1986'))
    f1 = R.cite(OR(1, "Battery M, First New York Artillery, Lieutenant Winegar commanding, on a second elevation, a quarter of a mile distant, and nearly due east from the first mentioned", rec='OR27-1-R314'))
    g1 = R.cite(OR(1, 'The enemy\'s skirmishers occupied a piece of woods in my front, and a stone house and a large barn on my right.', rec='OR27-1-R286',
                   note='Colgrove, 27th Indiana, for the morning of 2 Jul (his regiment\'s skirmish): a stone house and a barn on his right held by enemy skirmishers. Not used as evidence for 3 Jul or for the identity of the house.'))
    R.sub('place', 'The Taney house was a stone house on the far (east) side of Rock Creek from the right of the Twelfth Corps; on the evening of 2 Jul the left flank of Johnson\'s division rested at it.', 'documented', [b1, a1, d1],
          why='NY at Gettysburg vol. 1 ("on the opposite side of Rock Creek"), vol. 3 ("a stone house, said to belong to Zeb. Taney"), NPS 1940 quoting the Comte de Paris. The OR names no Taney house.')
    R.sub('occupied_by_confederate_sharpshooters', 'Confederate sharpshooters occupied the stone Taney house during the morning of 3 Jul and did "great damage" to the infantry of Colgrove\'s brigade, especially the 27th Indiana.', 'documented', [a1, a3, b1],
          why='Two state-volume narratives (the battery\'s own history and the Twelfth Corps narrative). Colgrove\'s OR report speaks generally of sharpshooters "during the whole day" (3 Jul) but does not name the house. Date: "forenoon of July 3d" (vol. 3), "during the morning" (vol. 1).')
    R.sub('shelled_by_battery_m_first_ny', 'Battery M, 1st New York Light Artillery fired percussion shells at the house, one or both guns of the left section having been moved across the Baltimore Pike at Colgrove\'s request.', 'documented', [a2, b2, b3, f1],
          why='Both volumes name Battery M; the OR (Muhlenberg) puts Winegar\'s Battery M on a second elevation east of Slocum\'s Hill. Retrospective but independent narratives that agree on the battery, the target and the forenoon.')
    R.sub('result_front_knocked_out_untenable', 'The shells "knocked the front out of the house", killed or wounded many of the sharpshooters in it, and made the building untenable.', 'documented', [a2, b3],
          why='This is the whole damage record: a front wall breached and the house untenable. It is not "reduced to ruins".')
    R.sub('house_reduced_to_ruins_ruins_only', 'The house was reduced to ruins (printed "Shelled; ruins"; plan table "House reduced to ruins; Ruins only").', 'open_gap', [], support='none',
          why='No local text says the house was destroyed or later stood as ruins; the two accounts say the front wall was knocked out. The only source named by the PDF is Stone Sentinels (SS-Taney).')
    R.sub('hour', 'The shelling happened on the forenoon of 3 Jul; the printed window is the whole of 3 Jul.', 'inferred', [a3, b1], support='partial',
          why='The forenoon is documented (both volumes); no clock hour is given. Colgrove\'s sharpshooter fight began "before it was fairly light" (OR27-1 R286) but is not tied to the house.')
    R.lookup('all local texts: Taney (word, not Taneytown) with house|farm|ruin|sharpshooter', 'OR27 pts 1-3, state volumes, ws9, NPS texts', 'NY1 p.70, NY3 pp.1265-66, NPS Spangler\'s Spring p.8, NPS boundary study p.22; no text calls the house a ruin; OR27 has no Taney house', 'done')
    R.lookup('OR27 R286 (Colgrove) and the Twelfth Corps reports: stone house, barn, sharpshooter', 'OR27-1', 'Colgrove names "a stone house and a large barn" held by enemy skirmishers on the morning of 2 Jul; not tied to the Taney name', 'done')
    R.unsupported('"House reduced to ruins" and "Ruins only" (no local text).')
    R.unsupported('The Taney farm fences and any other farm detail (no local text).')
    return R.finish('corrected', 'blocked_host',
        'Taney house (stone, across Rock Creek from the Twelfth Corps right): Confederate sharpshooters held it on the forenoon of 3 Jul and hurt Colgrove\'s regiments; Battery M, 1st New York Light Artillery, put percussion shells into it, knocked the front out of the house, killed or wounded many of the sharpshooters and made it untenable (NY at Gettysburg vols 1 and 3). "Ruins" is not supported by any local text.',
        register=['fence-3-EG-01'],
        blocked_host=[{'url': SS_BASE, 'what_to_read': 'The Taney farm entry (key SS-Taney; the plan prints only the farm-page base): whether it says the house was reduced to ruins, when, by what, and what stands there now. Stone Sentinels is a lead source under the Law, so nothing on that page can raise the state above inferred without a primary witness.'}],
        product=['State schedule S-053: change the to-state from "Shelled; ruins" to "front wall knocked out, untenable for sharpshooters" (documented, forenoon 3 Jul); keep "ruins" only as an open-gap marked state or drop it. bld-taney-farm: draw the house standing with a breached front after the forenoon of 3 Jul; no fence object.'],
        changes=['The shard row had no source (gap); two state-volume narratives now document the occupation, the battery and the result.', 'The printed "ruins" is not supported and is replaced by "front knocked out".'])


def S054():
    R = Row('S-054')
    p1 = R.cite(SV('PA2', 'Immediately in our front, on the Rummel Farm, was a large barn.', note='2nd Pennsylvania Cavalry regimental history (1914 edition vol. 2); the regiment relieved Custer\'s troops "after midday" on 3 Jul.'))
    p2 = R.cite(SV('PA2', 'In and around it the enemy had concentrated a large force'))
    p3 = R.cite(SV('PA2', 'placing shell after shell into the barn, making it untenable'))
    p4 = R.cite(SV('PA2', 'showing even yet the effects of the fire of our batteries'))
    p5 = R.cite(SV('PA2', 'It was after midday when Colonel Mclntosh, commanding the brigade, sent our regiment out upon the field', note='OCR reads "Mclntosh" for McIntosh.'))
    n1 = R.cite(NPSW('1njcav', 'Within moments, dismounted Confederates from Brig. Gen. Albert Jenkins\' Virginia Brigade appeared from behind the Rummel house and barn, formed a line and opened fire.'))
    n2 = R.cite(NPSW('1njcav', 'the 1st New Jersey Cavalry moved forward around 2 pm from the Lott House to this position'))
    w1 = R.cite(LIB('NJ-FINAL-1891', 'Twenty- five years ago on Tuesday next, about two o\'clock in the afternoon, Gen. Mcintosh, commanding the First Brigade of Gen. Gregg\'s division of cavalry, gave me the order at the edge of yonder woods to dismount the New Jersey cavalry and place them on the skirmish line',
                    title='Final Report of the Gettysburg Battle-field Commission of New Jersey (1891): address of Captain S. C. Wagner, 3rd Pennsylvania Cavalry, at the monument dedication of 1888',
                    note='Participant address (1888); OCR reads "Mcintosh". Spoken "on Tuesday next, twenty-five years ago" (3 Jul).'))
    s1 = R.cite(LIB('NJ-FINAL-1891', 'About sundown our entire line was advanced to and held the Rummel buildings.', title='Final Report of the Gettysburg Battle-field Commission of New Jersey (1891): address of Captain S. C. Wagner, 3rd Pennsylvania Cavalry'))
    R.sub('barn_large_on_rummel_farm', 'A large barn stood on the Rummel farm in front of the 2nd Pennsylvania Cavalry\'s skirmish line on 3 Jul.', 'documented', [p1])
    R.sub('confederates_held_barn_and_buildings', 'Confederate dismounted troops (Jenkins\' brigade of Stuart\'s cavalry, with other forces) held the Rummel house and barn area on the afternoon of 3 Jul and fired from it.', 'documented', [p2, n1],
          why='2nd PA Cavalry history ("in and around it the enemy had concentrated a large force") and the NPS monument page (Jenkins\' Virginia brigade behind the Rummel house and barn). The trigger "Stuart\'s men" is thereby supported as a unit label.')
    R.sub('union_batteries_made_barn_untenable', 'Pennington\'s and Randol\'s batteries put shell after shell into the barn "making it untenable"; the barn bore the marks of that fire when the 1914 volume was written.', 'documented', [p3, p4],
          why='Retrospective regimental history (a participant\'s narrative published 1914); no OR text describes damage to the barn.')
    R.sub('loopholes_cut_in_planking', 'Stuart\'s men cut loopholes in the barn planking.', 'open_gap', [], support='none',
          why='Searched "loop-hole", "loophole", "port-hole" in all local texts: the only hits are other places. The printed from-state "plank walls" and the to-state "loopholes cut" have no local source; the only damage evidence is Union shell fire.')
    R.sub('afternoon_of_3_jul', 'The action at the barn took place in the afternoon of 3 Jul (about 14:00 onward; the fight at the farm ended at sundown with the Union line holding the Rummel buildings).', 'documented', [p5, w1, n2, s1],
          why='"After midday" (2nd PA Cav.), "about two o\'clock" (Wagner), "around 2 pm" (NPS), "about sundown ... held the Rummel buildings" (Wagner). The row prints date-only, so the window is satisfied. Conflict C-032 (13:00 or 15:00 start) is carried by the r03 shard; these sources do not settle it.')
    R.lookup('local OR27 pts 1-3 (Gregg, Custer, Hampton, Stuart reports of 3 Jul): Rummel|barn|loophole', 'OR27', 'no Rummel barn text (the word Rummel does not occur in OR27); Gregg R344 speaks of fences, see S-055', 'done')
    R.lookup('all local texts: loop-hole|port-hole|loophole', 'OR27, ws9, state volumes, NPS texts', 'no hit on the Rummel barn', 'failed')
    R.unsupported('"Plank walls" and "loopholes cut" (no local text); the barn\'s construction is not described locally.')
    R.unsupported('The plan\'s "Fitz Lee\'s 1st Virginia through the farm", "168 acres; log house gone" and "claim $219.95 rejected" of the farm entry (no local text).')
    return R.finish('partially_supported', 'blocked_host',
        'Rummel barn, afternoon of 3 Jul: Confederate dismounted troops (Jenkins\' brigade) held the house and barn; Union batteries (Pennington, Randol) shelled the barn until it was untenable and the Union line took the Rummel buildings at sundown (2nd PA Cavalry history; NPS; Wagner). The cutting of loopholes in the planking is not supported by any local text.',
        register=['fence-3-EG-02'],
        blocked_host=[{'url': SS_BASE, 'what_to_read': 'The Rummel farm entry (key SS-Rummel): the statement that Stuart\'s men cut loopholes in the barn planking on 3 Jul, the barn construction, the "log house gone", Fitz Lee\'s 1st Virginia and the $219.95 claim. A lead source; a primary witness (an officer\'s report or a claim file) is needed to raise it above inferred.'}],
        product=['State schedule S-054: keep the barn standing; document "occupied by Confederate dismounted troops" and "shelled by Union batteries, marks of shell fire"; mark "loopholes cut" as an open-gap state (inferred from nothing) until a source is found.'],
        changes=['The shard row read OR27 only (no Rummel text); the state volumes and the NPS page now document the occupation and the shelling.'])


def S055():
    R = Row('S-055')
    g1 = R.cite(OR(1, 'Seeing this advance party dismount to remove the fences and make preparations for an attack by the columns in rear, I at once placed the Third Brigade (Colonel Gregg\'s) in position to meet it.', rec='OR27-1-R344',
                   note='Gregg\'s report of 3 Jul on the right of the Union line (East Cavalry Field): the advance guard of the enemy column dismounted to remove fences. The farm is not named in the OR.'))
    m1 = R.cite(SV('MI', 'the regiment was hurled headlong against a post-and-rail fence that ran obliquely in front of the Rummel barn', note='Address of General James H. Kidd (6th Michigan Cavalry) in Michigan at Gettysburg: the charge of the 7th Michigan Cavalry on 3 Jul.'))
    m2 = R.cite(SV('MI', 'the posts and rails being so firmly united'))
    m3 = R.cite(SV('MI', 'it could be accomplished only by lifting the posts, which were deeply set, and removing several lengths at once'))
    m4 = R.cite(SV('MI', 'a flanking fire from a strong skirmish line along a fence to the right and running nearly at right-angles with the one through which it was trying to pass'))
    p1 = R.cite(SV('PA2', 'our line advanced and occupied a line of fences along the lane, close up to the Rummel House'))
    l1 = R.cite(LIB('NJ-FINAL-1891', 'The regiment extended from yonder worm fence to the left of the cavalry monument', title='Final Report of the Gettysburg Battle-field Commission of New Jersey (1891): address of Captain S. C. Wagner, 3rd Pennsylvania Cavalry (1888)'))
    l2 = R.cite(LIB('NJ-FINAL-1891', 'For a time the First New Jersey were staggered and fell back to the worm fence', title='Final Report of the Gettysburg Battle-field Commission of New Jersey (1891): address of Captain S. C. Wagner'))
    n1 = R.cite(NPSW('1njcav', 'After the battle, John Rummel dragged 30 dead horses from the farm lane immediately behind the monument.'))
    R.sub('fences_standing_on_3_jul', 'Post-and-rail fences ran in front of the Rummel barn and along the lane; worm fences stood at the 1st New Jersey Cavalry\'s position; a second fence at right angles lay to the right of the 7th Michigan.', 'documented', [m1, m4, p1, l1, l2],
          why='Kidd (6th Michigan), the 2nd PA Cavalry history and Wagner (staff of the First Brigade) describe fences standing on 3 Jul; the Union lines used them as cover. The OR (Gregg) names fences on the field.')
    R.sub('partial_removal_on_3_jul', 'Fences were taken down in places: the Confederate advance guard dismounted to "remove the fences" (Gregg), and the 7th Michigan lifted the deeply set posts and removed "several lengths at once" to open the post-and-rail fence in front of the barn.', 'documented', [g1, m2, m3],
          why='This is removal of segments by both sides, not destruction of the fence system. The row\'s "Destroyed" has no source beyond these openings.')
    R.sub('fences_destroyed', 'The Rummel fences were destroyed (printed "Standing -> Destroyed").', 'open_gap', [], support='none',
          why='No local text states that the fences were destroyed or counts them; the claim in the plan ("fences destroyed; claim $219.95 rejected") rests on SS-Rummel (a lead).')
    R.sub('dead_horses', '30 dead horses were dragged from the farm lane after the battle (printed "30+").', 'documented', [n1], support='partial',
          why='NPS gives exactly 30 and says nothing about fences; the "+" is not supported. No OR or state-volume text counts the Rummel horses.')
    R.sub('window', 'The state change falls on the afternoon of 3 Jul during the East Cavalry Field fight.', 'documented', [g1, m1], support='partial',
          why='Gregg\'s passage and the 7th Michigan charge are both afternoon of 3 Jul; no source places a destruction at a minute.')
    R.lookup('local OR27 pts 1-3: fence in the East Cavalry Field reports (Gregg, Custer, Hampton, McIntosh, Stuart)', 'OR27', 'Gregg R344 "dismount to remove the fences"; Custer and Hampton: no fence text; the 2026-11-04 shard missed the Gregg passage', 'done')
    R.lookup('all local texts: Rummel with fence|rail|lane|worm', 'state volumes, ws9, NPS texts', 'Michigan (Kidd), PA vol. 2, NJ final report; NPS page for the 1st NJ Cavalry monument', 'done')
    R.unsupported('That the fences were "destroyed" and how many; the $219.95 claim (no local text; Pennsylvania State Archives claim file not reachable).')
    return R.finish('corrected', 'blocked_host',
        'Rummel fences, 3 Jul: post-and-rail and worm fences stood in front of the barn and along the lane during the afternoon fight and were used as cover by both sides; the Confederate advance guard dismounted to remove fences (Gregg) and the 7th Michigan lifted several lengths of the post-and-rail fence to pass (Kidd). That the fences were "destroyed" is not supported; 30 dead horses (not "30+") were dragged from the lane after the battle (NPS).',
        register=['fence-3-EG-02'],
        blocked_host=[{'url': SS_BASE, 'what_to_read': 'The Rummel farm entry (key SS-Rummel): "fences destroyed", the $219.95 claim and the horse count. A lead source.'},
                      {'url': 'Pennsylvania State Archives, Adams County damage claims (Rummel, John)', 'what_to_read': 'The itemised claim: fences by number or length, the date and the cause. Not on the internet in a reachable form from here (owner-only act: a visit or a request). Series: Board of Commissioners to Assess Damages in Border Counties, War Damage Claims Abstracts, Record Group 2, Pennsylvania State Archives (the series the NPS McClean study cites as "Claim #3248 (Adams County)"); whether a file of this claimant is in that series was not checked.'}],
        product=['FEN-rummel: replace the single "Standing -> Destroyed" by "standing (documented) with openings made on 3 Jul afternoon (documented: Gregg, Kidd)"; the destroyed end state stays inferred and marked. hospitals/horses: 30 dead horses in the lane (NPS) instead of 30+.'],
        changes=['The shard said no OR text mentions fences in Gregg\'s report; Gregg R344 says the enemy advance guard dismounted "to remove the fences".', 'Michigan (Kidd), PA vol. 2 and the NJ report give the fence evidence the shard lacked.'])


def S056():
    R = Row('S-056')
    wi = R.cite(OR(1, 'A thick stone fence parallel to the ridge', rec='OR27-1-R272'))
    ca = R.cite(OR(1, 'were ordered forward, and occupied a stone fence in front of the enemy', rec='OR27-1-R294'))
    ca2 = R.cite(OR(1, 'Remained in the latter position until 3.45 a. m. [July 3], when the enemy were opened upon by a battery placed for the purpose of shelling them.', rec='OR27-1-R294', note='Candy, First Brigade, Second Division: the position is the line in rear of Greene\'s right; the brigade then sent the 147th Pennsylvania forward to a stone fence in front of the enemy (next citation).'))
    ge1 = R.cite(OR(1, 'was ordered to charge and carry the stone wall occupied by the enemy', rec='OR27-1-R293', note='Sentence begins "At 5 a. m. the One hundred and forty-seventh Pennsylvania Volunteers, of Candy\'s brigade,".'))
    ge2 = R.cite(OR(1, 'who then abandoned the entire line of the stone wall', rec='OR27-1-R293'))
    ge3 = R.cite(OR(1, "At 10.25 o'clock two brigades of Johnson's division, having formed in column by regiments, charged upon our line on the right.", rec='OR27-1-R293'))
    ge4 = R.cite(OR(1, 'This was the last charge.', rec='OR27-1-R293'))
    ma1 = R.cite(OR(1, 'about 4 a. m. the 3d instant this regiment was ordered to attack a position of the enemy on the right, behind a stone wall', rec='OR27-1-R283'))
    ma1b = R.cite(OR(1, 'the stone wall nearly reached, and bayonets were fixed for a charge over it', rec='OR27-1-R283', note='Maulsby, 1st Maryland Potomac Home Brigade; the sentence continues: a brigade of National troops was perceived approaching to flank the enemy, and the regiment ceased firing lest it destroy its own friends.'))
    ma2 = R.cite(OR(1, "which it did until the enemy's fire wholly ceased, about 12 m.", rec='OR27-1-R283', note='Maulsby: "About 9 o\'clock of the same morning, this regiment was ordered to advance to and hold the front of the rifle-pits on the right, which it did until the enemy\'s fire wholly ceased, about 12 m."'))
    gr = R.cite(OR(1, 'attack was general on our line, and continued until 10.30 a. m.', rec='OR27-1-R307', note='OCR reads "tlie" for "the" before "attack" (not quoted).'))
    sl = R.cite(OR(1, 'The engagement continued until 10.30 a. m.', rec='OR27-1-R271'))
    mu = R.cite(OR(1, 'continued firing at intervals until 10 a. m., at which hour the enemy had retreated and the infantry of the corps had regained their', rec='OR27-1-R314'))
    st = R.cite(OR(2, 'At about 10 a. m. the Tenth Virginia was ordered to deploy as skirmishers, and clear the woods on our left of the enemy\'s skirmishers.', rec='OR27-2-R482'))
    st2 = R.cite(OR(2, 'any further effort to storm it would have been futile', rec='OR27-2-R482', note='Steuart: after the charge toward "the enemy\'s second breastworks" the brigade "reformed behind the stone wall which ran parallel to the breastworks".'))
    mc = R.cite(OR(1, 'held this position until about 11 a. m.', rec='OR27-1-R274'))
    ha = R.cite(OR(1, 'The firing was heavy on both sides', rec='OR27-1-R298', note='Sentence: "The firing was heavy on both sides until about 11 a. m."; OCR reads "suaitil" for until, so the quotation stops before it.'))
    pa = R.cite(OR(1, 'and continued until 11 a. m.', rec='OR27-1-R295'))
    ru = R.cite(OR(1, 'This state of things continued until about 10 a. m.', rec='OR27-1-R273'))
    co = R.cite(LIB('NPS-SPANGLERS-SPRING', 'small plateau, over which a stone-wall extends to a marshy swale in the direction of Rock Creek', title="NPS, F. Tilberg, Proposed Restoration of the Spangler's Spring-Culp's Hill Area (1940), quoting the Comte de Paris", note='The 1940 report quotes the Comte de Paris on the ground south of Culp\'s Hill; the wall is not named Pardee Field there.'))
    R.sub('stone_wall_behind_the_works', 'A thick stone wall ("stone fence") ran parallel to and behind the Twelfth Corps breastworks on Culp\'s Hill and was held by Confederate troops on the night of 2-3 Jul.', 'documented', [wi, ge1],
          why='Williams ("less than 50 yards behind"), Geary ("occupied by a force of the enemy as a protection against attack from the direction of the turnpike"). Distance groups 30-75 yd versus 200 yd are carried by fence-2 (DD-F2-06).')
    R.sub('wall_attacked_early_morning', 'The wall was attacked in the early morning of 3 Jul, not at 10:00-11:00: the Union battery shelled the Confederates from 03:45 (Candy), the 1st Maryland PHB attacked the wall about 04:00 (Maulsby), and the 147th Pennsylvania was ordered to charge and carry the wall at 05:00 (Geary), the enemy then abandoning the entire line of the stone wall.', 'documented', [ca2, ca, ma1, ge1, ge2],
          why='Three independent reports give 03:45, about 04:00 and 05:00. Pardee\'s own report (R301 p.846) names an attempt at about 08:00 to turn the right of the works and no wall.')
    R.sub('first_maryland_phb_attacked_wall', 'The 1st Maryland (Potomac Home Brigade) attacked "a position of the enemy on the right, behind a stone wall" about 04:00 and nearly reached it.', 'documented', [ma1, ma1b],
          why='Maulsby R283 p.806: "the stone wall nearly reached, and bayonets were fixed for a charge over it" before a flanking brigade appeared and the enemy "were distinctly seen fleeing from behind the stone wall".')
    R.sub('identification_with_pardee_field_wall_p08', 'The wall of these reports is the stone wall at the edge of Pardee Field (P-08).', 'inferred', [co], support='partial',
          why='The OR does not use the name Pardee Field; the 147th PA (Pardee\'s regiment) is named by Geary and Candy for the charge, and the Comte de Paris (via NPS 1940) puts a stone wall on the small plateau south of Culp\'s Hill running to the swale toward Rock Creek. NPS names Pardee Field as Abraham Spangler Field 8; no local text says which wall.')
    R.sub('geary_counterattack_trigger', 'The Union counterattack at daylight was ordered by Geary under Slocum\'s orders and opened with artillery at 03:30-04:30.', 'documented', [ca2, ge1],
          why='Candy 03:45 battery; Geary R293 ("at 3.30 a. m. (early dawn) a simultaneous attack was made by artillery and the infantry"); the printed trigger "Geary\'s counterattack" is therefore the dawn attack, hours before the 10:00-11:00 window.')
    R.sub('final_charge_about_10_30', 'The last Confederate charge came at 10:25-10:30 (two brigades of Johnson\'s division, the 1st Maryland Battalion leading) and was repulsed; this was the last charge.', 'documented', [ge3, ge4, st, st2],
          why='Geary 10.25; Steuart (Confederate) "at about 10 a. m." deployed skirmishers then charged "the enemy\'s second breastworks" and fell back; Greene and Slocum give 10.30 for the end of the engagement.')
    R.sub('battle_ended_by_10_30_to_11_00', 'The fighting on the right ended between 10:00 and 11:00 (corps and division: 10.30; Muhlenberg and Ruger: about 10; several regiments: about 11).', 'documented', [sl, gr, mu, ru, mc, ha, pa],
          why='The printed "about 11:00" is within the span the reports give; the corps commander says 10.30. Maulsby has the enemy\'s fire "wholly ceased, about 12 m." (the source of the noon alternative of conflict C-031, which stays selectable).')
    R.sub('noon_alternative', 'The firing ceased about noon (conflict C-031, alternative "noon").', 'documented', [ma2], support='partial',
          why='Maulsby (1st Maryland PHB) alone; his own regiment held the rifle-pit front from 09:00 until the white flag. The default 10:00 and the alternative remain two selectable values (no default chosen here).')
    R.lookup('OR27 reports of the Twelfth Corps and Johnson\'s division: time of the last charge and the end of the firing', 'OR27-1 R271-R314, OR27-2 R481-R488', '10.25/10.30 (Geary, Greene, Slocum), about 10 (Muhlenberg, Ruger, Cobham, Steuart), about 11 (several regiments), about 12 m. (Maulsby)', 'done')
    R.lookup('NPS texts: Pardee Field wall', 'NPS texts', 'Pardee Field = Abraham Spangler Field 8 (CLR record of treatment); no text calls a wall the Pardee Field wall', 'failed')
    R.unsupported('That the wall of the OR is the wall now at Pardee Field (inference only).')
    R.unsupported('The PDF source Wiki-Culp (Wikipedia, not admissible).')
    return R.finish('corrected', 'open',
        'Culp\'s Hill, 3 Jul: the stone wall behind the works was attacked in the early morning, not at 10:00-11:00 (Union battery 03:45, the 1st Maryland PHB about 04:00, the 147th Pennsylvania at 05:00, the enemy abandoning the entire line of the wall; Candy, Maulsby, Geary). The last Confederate charge came at 10:25-10:30 and was repulsed (Geary), the engagement ended 10:30 by the corps commander\'s account, about 11:00 in several regiments and "about 12 m." in the 1st Maryland (Maulsby). The identification of the wall with the Pardee Field wall is an inference.',
        register=['fence-3-EG-03'],
        product=['State schedule S-056: split the row: (a) wall attack 04:00-05:00 on 3 Jul by the 1st Maryland PHB and the 147th PA (documented), (b) last Confederate charge 10:25-10:30 and end of the fight 10:30-11:00 (documented), with the "noon" scenario (Maulsby) kept selectable. P-08 (pre-existing wall): present at frame one, no construction animation; do not derive its 1863 profile from the rebuilt wall. E-11: end of the fight 10:30 (Slocum).'],
        changes=['The shard documented the wall (Williams, Candy) but left "attacked by 1st Maryland PHB" unverified; Maulsby now documents it and dates it about 04:00.', 'The 10:00-11:00 window of the row belongs to the last charge, not to the wall attack.'])


def S057():
    R = Row('S-057')
    sl = R.cite(OR(1, 'opened the battle at 4 a. m. on the following morning', rec='OR27-1-R271', note='Sentence: "The artillery of the Twelfth Corps, consisting of Battery F, Fourth U. S. Artillery; Battery K, Fifth U. S. Artillery; Battery M, First New York, and Knap\'s Pennsylvania battery, was placed in position during the night by Lieutenant-Colonel Best, and opened the battle at 4 a. m. on the following morning".'))
    hu1 = R.cite(OR(1, "was placed on the hill known as Slocum's headquarters, and near the Baltimore pike", rec='OR27-1-R028', note='Sentence: "Knap\'s battery (E, Pennsylvania, six 10-pounders) was placed on the hill known as Slocum\'s headquarters, and near the Baltimore pike, and Winegar\'s battery (M, First New York, four 10-pounders) at a short distance east of it."'))
    hu2 = R.cite(OR(1, 'At 4.30 a. m. these batteries opened, and fired without intermission for fifteen minutes into the wood, at a range of from 600 to 800 yards', rec='OR27-1-R028'))
    mu1 = R.cite(OR(1, 'Battery M, First New York Artillery, Lieutenant Winegar commanding, on a second elevation, a quarter of a mile distant, and nearly due east from the first mentioned', rec='OR27-1-R314'))
    mu2 = R.cite(OR(1, 'fired for fifteen minutes without intermission at a range of from 600 to 800 yards', rec='OR27-1-R314'))
    mu3 = R.cite(OR(1, 'continued firing at intervals until 10 a. m., at which hour the enemy had retreated and the infantry of the corps had regained their', rec='OR27-1-R314'))
    ru = R.cite(OR(1, 'fire was opened on the position held by the enemy from a battery placed in position during the night', rec='OR27-1-R273', note='OCR reads "4. .30 o\'clock on the morning of July 3" before the quotation.'))
    ny = R.cite(SV('NY3', "Both sections aided the infantry of the Twelfth Corps in retaking their breastworks", note='Battery M history: the right section under Lieutenant Woodbury on Powers\' Hill, the left (with Lieutenant Winegar) on the McAllister farm hill; both fired "in the direction of Benner\'s Hill" in the forenoon of 3 Jul.'))
    ny2 = R.cite(SV('NY3', "the right section, under Lieutenant Woodbury on Powers' Hill"))
    R.sub('guns_on_powers_hill_hill_of_slocums_headquarters', 'Twelfth Corps batteries stood on the hill known as Slocum\'s headquarters (Powers Hill): Knap\'s (E, Pennsylvania, six 10-pounders; Lt Atwell), Battery M, 1st New York (four 10-pounders) a quarter mile east of it, and the right section of Battery M under Lt Woodbury on Powers\' Hill by the battery\'s own history.', 'documented', [hu1, mu1, ny2],
          why='Hunt, Muhlenberg and the battery history. The OR calls the hill Slocum\'s headquarters or Slocum\'s Hill; "Powers\' Hill" is the battery history\'s name.')
    R.sub('opened_fire_before_dawn_3_jul', 'The Twelfth Corps artillery (placed during the night by Lt Col Best) opened at 04:00 (Slocum), 04:30 (Hunt, Muhlenberg, Ruger) on the morning of 3 Jul; Muhlenberg\'s two rifle and two 12-pounder batteries (twenty guns) fired fifteen minutes without intermission at 600-800 yards, then at intervals from 05:30 to 10:00.', 'documented', [sl, hu2, mu2, ru, mu3],
          why='The printed "Morning Jul 3" is supported and sharpened to 04:00-04:30 start and 10:00 end of the preparation; the target is the ground vacated by the Twelfth Corps and taken by the enemy (the Culp\'s Hill works).')
    R.sub('fire_directed_at_culps_hill_works', 'The fire was directed at the Confederates in the Twelfth Corps\' own works on Culp\'s Hill and at Benner\'s Hill, in support of the infantry retaking them.', 'documented', [ny, mu3, hu1],
          why='Hunt: "These batteries overlooked and commanded the ground vacated by the corps"; the battery history: "aided the infantry of the Twelfth Corps in retaking their breastworks".')
    R.sub('trigger_meades_hq_moves', 'The guns fired because Meade\'s headquarters moved (printed trigger).', 'open_gap', [], support='none',
          why='No source gives that trigger: the OR gives the Confederate occupation of the works on the night of 2 Jul and the order to retake them at daylight (Slocum, Williams, Geary). The headquarters moved on the afternoon of 3 Jul (S-060), after the fire ended.')
    R.lookup('OR27 pts 1-3: Powers Hill / Slocum\'s headquarters batteries on 3 Jul', 'OR27', 'Slocum R271 p.761, Hunt R028 p.237, Muhlenberg R314 pp.870-871, Ruger R273 p.780', 'done')
    R.unsupported('The printed trigger "Meade\'s HQ moves" (nothing supports it; it postdates the fire).')
    R.unsupported('Any fence or wall state at Powers Hill (no local text; none needed).')
    return R.finish('corrected', 'open',
        'Powers Hill guns, 3 Jul: the Twelfth Corps batteries on and beside the hill known as Slocum\'s headquarters (Knap\'s/Atwell\'s, Winegar\'s Battery M, the right section of Battery M under Woodbury; F 4th US and K 5th US at the pike) were placed during the night and opened on the Confederates in the corps\' works at 04:00-04:30, fifteen minutes without intermission, then at intervals until 10:00 (Slocum, Hunt, Muhlenberg, Ruger). The printed trigger (Meade\'s headquarters moving) is not supported and cannot be: the move came in the afternoon.',
        register=['fence-3-EG-04'],
        product=['State schedule S-057: from-state "quiet" to "firing" at 04:00-04:30 on 3 Jul (documented), end of the preparation 10:00; trigger: the order to retake the works at daylight (Slocum/Williams/Geary), not "Meade\'s HQ moves". Gun line: Atwell\'s six 10-pounders on Powers Hill, Winegar\'s four 10-pounders a quarter mile east; F 4th US and K 5th US opposite the centre of the Twelfth Corps line from 01:00. No fence data.'],
        changes=['The shard row was a negative check of the row text only (no historical source); five OR reports and the battery history now document it.', 'The printed trigger is replaced.'])
