import json,collections,sys
G='/home/user/cautious-chainsaw/docs/battle-theatre/GOVERNANCE/'
rows=[json.loads(l) for l in open(G+'timeline_corrections/tl-03.jsonl')]
cnt=json.load(open(G+'horde/tl-03/closeout/counts.json'))
cs=collections.Counter(c['source_id'] for r in rows for c in r['citations'])
n_or=cs['OR27']; n_comp=cs['COMPUTED']; n_lib=sum(cs.values())-n_or-n_comp
prom=[r['id'] for r in rows if r['tier_change']['note'].startswith('promotion')]
dem=[r['id'] for r in rows if r['tier_change']['note'].startswith('demotion')]
hi=[r['id'] for r in rows if 'higher than the tier the shard audit' in r['tier_change']['note']]
scn=[r['id'] for r in rows if r['scenarios']]
unch=len(rows)-len(prom)-len(dem)
nsub=sum(len(r['sub_claims']) for r in rows)
PQd=json.load(open(G+'horde/tl-03/closeout/patch_quotes.json'))
NEXT=(sum(len(v) for v in PQd['ext'].values()),len(PQd['ext']),len(PQd['new']),len(set(e['row'] for e in PQd['new'])))
blk=open('/home/user/cautious-chainsaw/tmp/tl-03/dd_block.md').read()
blk=blk.replace('## Added 2026-11-14 by the timeline close-out of shard tl-03','## Added 2026-11-16 by the timeline close-out of shard tl-03 (first and second pass 2026-11-13 and 2026-11-14, third pass 2026-11-16; the block was prepared on 2026-11-14 and appended on 2026-11-16)')
assert '598 citations: 471 Official Records, 122 library, 5 computed' in blk
blk=blk.replace('598 citations: 471 Official Records, 122 library, 5 computed','%d citations: %d Official Records, %d library, %d computed'%(len(cs and [1]*sum(cs.values())),n_or,n_lib,n_comp))
old_t='Against the seed: promotion T1-116 (open gap to documented, at day level: the Official Records give the Jul 1 positions of Kilpatrick, Merritt, Gregg and the Cavalry Corps headquarters; hours and Pleasonton\'s own position stay a registered gap); demotions T1-124, T1-126, T1-130, T1-132, T1-135, T1-137, T1-138, T1-140; unchanged 48 rows. Higher than the shard-audit tier: T1-116, 119, 124, 125, 127, 132, 135, 139, 140, 147, 167, 169, 170, 171.'
assert old_t in blk
new_t='Against the seed: promotion %s (open gap to documented, at day level: the Official Records give the Jul 1 positions of Kilpatrick, Merritt, Gregg and the Cavalry Corps headquarters; hours and Pleasonton\'s own position stay a registered gap); demotions %s (T1-171: the claims that rest on the National Park Service study of the McPherson farm are inferred under DD-TL03-04); unchanged %d rows. Higher than the shard-audit tier: %s.'%(', '.join(prom),', '.join(dem),unch,', '.join(i.replace('T1-','') if k else i for k,i in zip([0]+[1]*(len(hi)-1),hi)))
blk=blk.replace(old_t,new_t)
assert '(37 rows carry scenarios: see REPORT.md)' in blk
blk=blk.replace('(37 rows carry scenarios: see REPORT.md)','(%d rows carry scenarios: see REPORT.md)'%len(scn))
old_c='the first-contact, arrival and attack hours of the Confederate divisions as in the rows.'
assert old_c in blk
blk=blk.replace(old_c,'the first-contact, arrival and attack hours of the Confederate divisions as in the rows; the commander of Paul\'s First Brigade after his fall (Colonel Coulter in Robinson\'s and Coulter\'s own reports, Colonel Prey in the sketch of the 104th New York of 1900; T1-141 and T1-172, added on 2026-11-16).')
DD5='''
| DD-TL03-05 | How a documented sub-claim is tied to its quote, and what is done where the quote stops short of the claim (third pass, 2026-11-16) | keep the first-pass quotes; extend the quote to the passage that covers the claim; narrow the claim to the quote | A documented sub-claim must be covered, in every assertion it makes (the unit, the place, the hour, the number, the act), by the verbatim quotes cited for it. Where a quote stopped before the clause that the claim states, the quote is extended to the verbatim passage that covers it (%d quotes of %d rows; every extension contains the old quote and is re-matched by the builder); where a clause is in no quote read, a citation is added (%d citations of %d rows) or the claim is worded as the passage says. Headline texts are held to the same rule: T1-139 called the Weikert farm Tillie Pierce's grandparent's, the memoir says it was the farm of Mrs. Schriver's father (corrected); T1-164 said Howard chose Cemetery Ridge at about noon (he gives about 11.30 for the news of Reynolds' death and no hour for the choice); T1-159 now counts the fourth caisson (struck by a shell and destroyed); T1-150 no longer says the line stood behind a barricade of rails (Doubleday: the intrenchments in front of the seminary). Two scenarios of T1-145 that were marked documented without a citation now cite Howard (2.45 p. m.) and Hays (a little after 2). New finds from this reading: the New York volume of 1900 has Wilkeson fatally wounded early in the action and dying that night in the Almshouse (T1-146); Tillie Pierce's memoir has the troops heard chopping, picking and shoveling on Cemetery Hill through the night of Jul 1 and sharpshooters in a garret (T1-127, T1-168); Howard's report has the First Division on the direct route and the Second Division by Horner's Mill (T1-120). | timeline_corrections/tl-03.jsonl; closeout/rows_patch.py and closeout/patch_quotes.json (every extension and addition, with the first-pass quote inside it); closeout/audit/review/ (the scripts of the reading); horde/tl-03/REPORT.md | documented (as stated per sub-claim) | the patch layer is a separate file; build.py --no-patch rebuilds the first-pass wording | the quote shown beside a claim is the passage that states it |
'''
blk=blk.rstrip('\n')+DD5 % NEXT

open('/home/user/cautious-chainsaw/tmp/tl-03/dd_block_final.md','w').write(blk+'\n')
print(blk[:300]); print(len(blk))
print('prom',prom,'dem',dem,'hi',hi,'scn',len(scn),'cites',sum(cs.values()),n_or,n_lib,n_comp)
import re
print(len(PQ:=json.load(open(G+'horde/tl-03/closeout/patch_quotes.json'))['ext']), sum(len(v) for v in PQ.values()), len(json.load(open(G+'horde/tl-03/closeout/patch_quotes.json'))['new']), len(set(e['row'] for e in json.load(open(G+'horde/tl-03/closeout/patch_quotes.json'))['new'])))
