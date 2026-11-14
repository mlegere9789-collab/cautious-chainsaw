"""Write the tl-02 close-out delegated-decision block to tmp/tl-02/dd_block.md (the shell then appends it with >>).
Run after build2.py --write and post.py:  python3 -I tmp/tl-02/dd.py"""
import os, json, sys
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
G = os.path.join(ROOT, 'docs', 'battle-theatre', 'GOVERNANCE')
cnt = json.load(open(os.path.join(G, 'horde', 'tl-02', 'counts.json'), encoding='utf-8'))
corr = [json.loads(l) for l in open(os.path.join(G, 'timeline_corrections', 'tl-02.jsonl'), encoding='utf-8')]
dp = os.path.join(G, 'decisions', 'DELEGATED-DECISIONS-2026-11-11.md')
txt = open(dp, encoding='utf-8').read()
if 'DD-TL02-01' not in txt:
    tv = cnt['tier_vs_seed']
    prom = ', '.join(tv['promotion']) or 'none'
    dem = ', '.join(tv['demotion']) or 'none'
    above_shard = [c['id'] for c in corr if c['tier_change']['note'].find('higher than the tier the shard audit') >= 0]
    sc = ', '.join(cnt['rows_with_scenarios'])
    block = '''

## E. tl-02 close-out, added 2026-11-13 (DELEGATED, reversible by the owner, not owner decisions)

| id | question | options | chosen default | evidence | tier | reversibility | product marking |
|---|---|---|---|---|---|---|---|
| DD-TL02-01 | Effective tier of the 58 rows of timeline shard tl-02 (T1-058 to T1-115) | keep the shard-audit tiers; apply the close-out tier of each corrected claim | Apply the tier in `corrected_claim.tier` of GOVERNANCE/timeline_corrections/tl-02.jsonl (field `tier_change` shows seed, shard-audit and corrected tier). Against the seed: promotions %s; demotions %s. Against the shard-audit tier: higher on %s. A promotion applies to the corrected wording only; every unsupported remainder keeps its own tier (open gap) and its proposed register entry (tl-02-CO-<row>.md). | every citation re-matched verbatim in the local Official Records and library texts (%d citations; build log tmp/tl-02/write.log); promotions need a non-lead source that supports exactly the corrected claim (Law cl.4), met by the quotes stored in the line | as stated per row | seed rows and shard files are not edited; the overlay is the effective tier; the owner may revert any row | tier glyph on every sub-claim that is not documented |
| DD-TL02-02 | Source conflicts found in tl-02 with no recorded default | pick a default; carry every value | No default is picked. Every value stays a selectable scenario (rows with scenarios: %s). The only default in force is the delegated C-040 on T1-099 (window 10:15-11:15), applied unchanged; new values were added as scenarios (about 10:00 Beveridge 1891 and the 10:15 of the New York narrative; rifle volley Weld and Indiana 1913; head, brain or neck wound with sharp-shooters named by Bates 1875; the 2nd Wisconsin (Bates) and the 19th Indiana (New York at Gettysburg vol. 1) as the regiment beside him). | timeline_corrections/tl-02.jsonl `scenarios` and `default` | documented (each value carries its source tier) | scenario switch | scenario selector with source and tier per value |
| DD-TL02-03 | Claims carried by one recollection only (first shot by Lt. Jones, T1-083; Burns about noon, T1-100; clear dawn, T1-075) | show as fact; show as claim | Shown as a claim with the source named and its date (1886-1891 recollections), never as an established fact; rival claims stay selectable | Illinois Monuments at Gettysburg (1892); Battles and Leaders; Weld diary (1863) | documented (as claims) | scenario switch | "claimed by" label with source |
''' % (prom, dem, ', '.join(above_shard) or 'none', cnt['citations'], sc)
    open(os.path.join(HERE, 'dd_block.md'), 'w', encoding='utf-8', newline='\n').write(block)
    print('decision block written to tmp/tl-02/dd_block.md; append with: cat tmp/tl-02/dd_block.md >> docs/battle-theatre/GOVERNANCE/decisions/DELEGATED-DECISIONS-2026-11-11.md')
else:
    print('decision block already present')
