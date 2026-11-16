"""Write the DD-TL02-05 block (delegated decisions of the second reading) from the final corrections file and the backup of the 2026-11-14 state: tmp/tl-02/ver2/dd_block3.md.
Append it ONCE with shell >> to decisions/DELEGATED-DECISIONS-2026-11-11.md (grep -c DD-TL02-05 must be 0 before)."""
import os, json
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..'))
G = os.path.join(ROOT, 'docs', 'battle-theatre', 'GOVERNANCE')
new = {json.loads(l)['id']: json.loads(l) for l in open(os.path.join(G, 'timeline_corrections', 'tl-02.jsonl'), encoding='utf-8')}
old = {json.loads(l)['id']: json.loads(l) for l in open(os.path.join(ROOT, 'tmp', 'tl-02', 'ver2', 'backup-20261115', 'out', 'tl-02.jsonl'), encoding='utf-8')}
rank = {'open gap': 0, 'plausible-procedural': 1, 'inferred': 2, 'documented': 3}
prom = [i for i in new if rank[new[i]['corrected_claim']['tier']] > rank[old[i]['corrected_claim']['tier']]]
dem = [i for i in new if rank[new[i]['corrected_claim']['tier']] < rank[old[i]['corrected_claim']['tier']]]
sc_new = [i for i in new if new[i]['scenarios']]
sc_old = [i for i in old if old[i]['scenarios']]
added = [i for i in sc_new if i not in sc_old]
more = [i for i in sc_new if i in sc_old and len(new[i]['scenarios']) > len(old[i]['scenarios'])]
chg = [i for i in new if json.dumps(new[i]['sub_claims'], sort_keys=True) != json.dumps(old[i]['sub_claims'], sort_keys=True)]
nc = sum(len(r['citations']) for r in new.values()); nco = sum(len(r['citations']) for r in old.values())
verd = {}
for r in new.values(): verd[r['verdict']] = verd.get(r['verdict'], 0) + 1
txt = '''
## Added 2026-11-15 by bt-timeline (shard tl-02, second reading): update of DD-TL02-01 to DD-TL02-04 (DELEGATED, reversible by the owner, not owner decisions)

| id | question | options | chosen default | evidence | tier | reversibility | product marking |
|---|---|---|---|---|---|---|---|
| DD-TL02-05 | Which values of DD-TL02-01 to DD-TL02-04 change after the second reading of shard tl-02 on 2026-11-15 | keep the values of 2026-11-14; apply the update | Apply the update. (1) Tier overlay: %s move to a higher tier (T1-092 and T1-093 from inferred to documented: Jerome\\'s own letter of 18 Oct 1865 to Maj. Gen. Hancock, printed in a 1989 U.S. Army War College study, supports exactly the steeple scene, the observer and the corps flag, as Jerome\\'s claim at second hand with the original not seen, the clock hour staying inferred; T1-111 from inferred to documented: the same study names Pennsylvania Hall, Jacobs\\'s presence and the evening of Jul 1 stay open gaps); demotions: %s. Against the seed, T1-093 and T1-111 are no longer demotions; the other promotions and demotions of DD-TL02-01 stand. (2) Source conflicts: no default is picked for any of the %d rows that now carry scenarios (the 27 of DD-TL02-04 plus %s; %d rows gained scenarios or values: %s); the hours added from sources that were already local (Jacobs 1864, New York vol. 1, Cheney 1901, Tillie Pierce, Beveridge, Meade 1913, regimental and brigade reports of the Official Records) are selectable values, not defaults. The only default in force stays C-040 on T1-099 (window 10:15-11:15), applied unchanged; C-041 stays unapplied to T1-115. (3) T1-103: the official return of casualties (OR vol. 27 pt. 1 p.173, read on the page image) gives Cutler\\'s brigade 1,002 casualties for the whole battle and the 147th New York 296; the row\\'s 454 of 1,007 stays an open gap; the 147th is shown with three values (207, 296, 301) and their bases. (4) T1-068: the full moon of Jul 1 06:46 UT is also listed by the American Ephemeris for 1863 (June 30, 18 h 46.0 m, astronomical reckoning); the other computed sky values stay computed. (5) The corrections file now holds %d citations (%d before; counted by source in REPORT.md), %d rows changed their sub-claims; verdicts: %s. | timeline_corrections/tl-02.jsonl (`tier_change`, `scenarios`, `citations`); horde/tl-02/REPORT.md; horde/tl-02/lookups.jsonl (LF1-LF11); horde/tl-02/sources_tl02.json (DTIC-ADA207999, AMEPH-1863); horde/tl-02/astro_check.json; page images of the DTIC study (PDF pages 13-15), of OR vol. 27 pt. 1 p.173 (PDF page 197), of Jacobs 1864 pp.21-23 and 25, of the almanac p.103 | documented (as stated per row) | scenario switch; the owner may revert any row | scenario selector with source and tier per value; tier glyph on every sub-claim that is not documented |
''' % (', '.join(prom) or 'no row', ', '.join(dem) or 'none', len(sc_new), ', '.join(added) or 'none', len(added) + len(more), ', '.join(added + more), nc, nco, len(chg), ', '.join('%s %d' % kv for kv in sorted(verd.items())))
open(os.path.join(ROOT, 'tmp', 'tl-02', 'ver2', 'dd_block3.md'), 'w', encoding='utf-8', newline='\n').write(txt)
print(txt)
