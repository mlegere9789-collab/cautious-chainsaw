"""Write the DD-TL02-04 block (update of DD-TL02-01..03 after the review pass of 2026-11-14) to tmp/tl-02/dd_block2.md; append it with shell >> (once).
    python3 -I tmp/tl-02/dd2.py && grep -c DD-TL02-04 docs/battle-theatre/GOVERNANCE/decisions/DELEGATED-DECISIONS-2026-11-11.md   (0 before the append)"""
import os, json
HERE = os.path.dirname(os.path.abspath(__file__))
G = os.path.join(HERE, '..', '..', 'docs', 'battle-theatre', 'GOVERNANCE')
cnt = json.load(open(os.path.join(G, 'horde', 'tl-02', 'counts.json'), encoding='utf-8'))
tv = cnt['tier_vs_seed']
by = cnt['citations_by_source']
n_or = by['OR27']; n_cmp = by['COMPUTED']; n_lib = cnt['citations'] - n_or - n_cmp
row = ('| DD-TL02-04 | Which values of DD-TL02-01 to DD-TL02-03 change after the review pass of 2026-11-14, and which page rule holds for the Official Records citations of tl-02 | keep the values of 2026-11-13; apply the update | '
       'Apply the update. (1) The corrections file now holds %d citations (%d Official Records, %d library and acquired texts, %d computed), not 379; every quote is re-matched in the local text. '
       '(2) Rows with scenarios and no default: the 25 of DD-TL02-02 plus T1-067 (Jun 30 night position of the XI Corps: Emmitsburg per Howard, OR vol. 27 pt. 1 p.701, the Army itinerary p.144 and Beveridge 1891; right bank of Marsh Creek per Jacobs 1864) and T1-098 (start of Reynolds\' attack: about 10.15 per Doubleday and Wadsworth, about 10.45 per Howard, OR p.696); %d rows in all. The only default in force stays C-040 on T1-099, applied unchanged; C-041 (Rodes\' attack start) is for the infantry attack and is not applied to T1-115 (arrival and first fire). '
       '(3) The tier overlay of DD-TL02-01 is unchanged: promotions %s; demotions %s. '
       '(4) The printed page of an Official Records citation is the page of its scan leaf (archive.org page index aligned to the OCR text, tools/bt/kit_or27_leafmap.py), read on the page image for every leaf cited; the running-head page model of tools/bt/or27_pages.py is kept only as `page_running_head_model` where it differs (30 of %d citations; for example Heth\'s division in the organization of the Army of Northern Virginia is on p.289, not the interpolated 284-285). '
       '(5) Two readings are withdrawn: "a hot day\'s fight" (T1-080) is an idiom for hard fighting and is not temperature evidence; the statement that the Federal cavalry carried Smith\'s and Sharps\' carbines (T1-085) is from a 1910 study of the Chancellorsville campaign bound into the New York at Gettysburg vol. 2 item, not from that volume. '
       '| timeline_corrections/tl-02.jsonl (`citations[].scan`, `page_running_head_model`, `scenarios`); horde/tl-02/library_pages.json; horde/tl-02/REPORT.md; page images of PDF pages 295 (printed 289) and 355 (printed 331) of the Official Records part 2 and part 1 scans re-read in the review | documented (as stated per row) | scenario switch; the owner may revert any row | scenario selector with source and tier per value |'
       % (cnt['citations'], n_or, n_lib, n_cmp, len(cnt['rows_with_scenarios']), ', '.join(tv['promotion']), ', '.join(tv['demotion']), n_or))
txt = ('\n## Added 2026-11-14 by bt-timeline (shard tl-02, review pass): update of DD-TL02-01 to DD-TL02-03 (DELEGATED, reversible by the owner, not owner decisions)\n\n'
       '| id | question | options | chosen default | evidence | tier | reversibility | product marking |\n|---|---|---|---|---|---|---|---|\n' + row + '\n')
open(os.path.join(HERE, 'dd_block2.md'), 'w', encoding='utf-8', newline='\n').write(txt)
print(txt[:600])
