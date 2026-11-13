"""Write horde/terrain-1/REPORT.md from evidence_corrections/terrain-1.jsonl (close-out 2026-11-13) plus the earlier report kept as superseded text.
Run: python3 -I gen_report.py   (reads tmp/terrain-1/REPORT.old.md, the 2026-11-04 text, kept unchanged at the end of the new report)."""
import os, json, collections, re
ROOT = '/home/user/cautious-chainsaw'
rows = [json.loads(l) for l in open(os.path.join(ROOT, 'docs/battle-theatre/GOVERNANCE/evidence_corrections/terrain-1.jsonl'), encoding='utf-8')]
old = open(os.path.join(ROOT, 'tmp/terrain-1/REPORT.old.md'), encoding='utf-8').read()
V = collections.Counter(r['verdict'] for r in rows)
sub = [s for r in rows for s in r['sub_claims']]
T = collections.Counter(s['tier'] for s in sub); S = collections.Counter(s['support'] for s in sub)
cits = [c for s in sub for c in s['citations']]
ors = [c for c in cits if c['source_id'].startswith('OR-27')]
w2 = sum(1 for c in ors if any(w['found'] for w in c.get('second_witness') or []))
nps = [c for c in cits if c['source_id'].startswith('NPS')]
lib = [c for c in cits if not c['source_id'].startswith(('OR-27', 'NPS'))]
rc = [r['recheck'] for r in rows]
rcn = {k: sum(x[k] for x in rc) for k in ('original_passages', 'verbatim_in_local_or', 'report_id_match', 'page_match_or_range_contains', 'or_recheck_lines', 'or_recheck_found_yes')}
HEAD = {
 'R13.0000': "cannot pass: none of the 16 gun rows is closed (4 confirmed, 6 corrected, 6 partially supported, all open_gaps); no gate run",
 'R13.G-01': "centre (Pergel), not left, section withdrawn; 'hollow' unsupported; relief clocks 10:00 / 10:15 / 10:45; the First Shot marker is the Wisler Farm marker",
 'R13.G-02': "guns not behind the rail work (Breck's behind a stone wall on the crest, the others in the open); 22 guns (Hunt) vs 12 (Wainwright); withdrawal 16:00-17:00",
 'R13.G-03': "the 2026-11-04 'conflict' is withdrawn: per-gun works at dusk 1 Jul, finished the morning of 2 Jul, called lunettes in the state books; dimensions open",
 'R13.G-04': "14 + 2 guns (Andrews) vs 20 (New York 1900); four left; the 37 Union guns unsupported; the PDF's five battery names are in the OR's organization table; 'Benner's Hill' found in the library",
 'R13.G-05': "arrival 09:00 (1888 address) and 4 + 2 layout documented; the 18:00 section shift unsupported; capture attribution a conflict (Smith himself supposed the Twelfth Corps)",
 'R13.G-06': "first fire on arrival about 16:30, not 17:45; hauling differs among four retrospective books",
 'R13.G-07': "4 p.m. / 4:30 clocks documented; no source clock for the canister; 'Wheatfield Road' and Knox's gun unsupported; position conflict",
 'R13.G-08': "36 guns found in Alexander 1907 (18 + 18); the OR gives guns only for Taylor and (3 Jul) Moody; Alexander, not Huger, was to control the other battalions",
 'R13.G-09': "16 guns in four batteries of four; pre-existing fences at the 2 Jul position; the brick house stays unplaced",
 'R13.G-10': "second position = Trostle wall corner (Milton, NPS, three books); hand-to-hand fighting and the 21st Mississippi documented by Hunt in B&L; 65 horses is in Hunt (B&L, one scan) and Fox, Milton's own figure is 60; 18:30 unsupported",
 'R13.G-11': "split confirmed: 2 Jul improvised (Hunt in B&L: 'some twentyfive guns'), 3 Jul prepared (39 guns, slight earthwork); '6 to 23' unsupported",
 'R13.G-12': "in place the morning of 2 Jul; one gun serviceable at 14:45; no earthwork; double canister at 100 yd unsupported",
 'R13.G-13': "Union counts 75/80/77/108/166-220; Hancock's order documented in Hart and Hunt (B&L); 120 and 34 unsupported",
 'R13.G-14': "Confederate counts nearly 150 to 172; 179 not found; 'over two miles' is the NPS length of Seminary and Warfield Ridges, not of the guns; Poague's and Reilly's lunettes (NPS)",
 'R13.G-15': "ten rifles either side of the cut confirmed; Alexander has 20; Oak Hill = NPS name",
 'R13.G-16': "two Whitworths on Oak Hill documented (the park's tablet and original Whitworths, 1906); signal by Miller's two guns (four witnesses); the 3-inch pair and a Whitworth signal unsupported",
}
TITLES = {
 'ALEXANDER-1907': "E. P. Alexander, Military Memoirs of a Confederate (1907)",
 'BACH-WHATTOSEE-1889': "Bachelder, Gettysburg: What to See, and How to See It (1889)",
 'BL-3': "Battles and Leaders of the Civil War, vol. III (Hunt, 'The Second Day at Gettysburg' and 'The Third Day at Gettysburg'; Alexander, 'The Great Charge and Artillery Fighting at Gettysburg')",
 'FOX-1889': "Fox, Regimental Losses in the American Civil War (1889)",
 'ME-GB-1898': "Maine at Gettysburg (1898)",
 'MEADE-LL-v2': "The Life and Letters of George Gordon Meade, vol. II",
 'NJ-TOOMBS-1888': "Toombs, New Jersey Troops in the Gettysburg Campaign (1888)",
 'NY-GB-1900': "New York at Gettysburg (1900)",
 'NY-GB-1902-v3': "New York at Gettysburg, vol. III (1902)",
 'PA-GB-1914-v2': "Pennsylvania at Gettysburg, vol. II (1914)",
 'NPS-CLI-1STDAY': "NPS Cultural Landscapes Inventory 2021, First Day - Union 1st Corps Battlefield",
 'NPS-CLI-ERR': "NPS Cultural Landscapes Inventory 2024, Emmitsburg Road Ridge Battlefield",
 'NPS-CLI-LRT': "NPS Cultural Landscapes Inventory 2020, Little Round Top",
 'NPS-CLI-PCB': "NPS Cultural Landscapes Inventory 2024, Pickett's Charge Battlefield",
 'NPS-CLR-1STDAY~raw': "NPS Cultural Landscape Report, First Day - Union 1st Corps Battlefield (content-stream text)",
 'NPS-CLR-ROT-V1': "NPS Cultural Landscape Report for Gettysburg NMP, Record of Treatment, vol. I",
 'NPS-COMMON-PRIDE-1': "K. R. Georg, 'A Common Pride and Fame', part I (1981)",
 'NPS-COMMON-PRIDE-2': "K. R. Georg, 'A Common Pride and Fame', part II (1981)",
 'NPS-HARMON-FARM': "K. G. Harrison, The Significance of the Harmon Farm and the Springs Hotel Woods (1991)",
 'NPS-HB9-1954': "NPS Historical Handbook no. 9, Gettysburg (1954)",
 'NPS-HB9-1962': "NPS Historical Handbook no. 9, Gettysburg (1962)",
 'NPS-SLAUGHTER-PEN': "K. R. Georg, 'Our Principal Loss Was in This Place': the Slaughter Pen and the south end of Houck's Ridge (1984)",
 'NPS-TPG-COMMEM': "NPS Treatment Philosophy and Guidelines for the Battlefield Commemorative Area",
 'NPSGOV-CONFED-LINE': "nps.gov page 'Confederate Line (July 2 & 3)' (fetched 2026-11-13)",
}
by_src = collections.OrderedDict()
for c in cits:
    by_src.setdefault(c['source_id'], 0); by_src[c['source_id']] += 1
or_ids = collections.defaultdict(set)
for c in ors:
    or_ids[c['part']].add(c['report_id'].replace('OR27-%d-' % c['part'], ''))
o = []
w = o.append
w("# Shard terrain-1 report: R13.0000 and R13.G-01..G-16 (17 items), close-out 2026-11-13\n")
w("The first 17 R13 ids are R13.0000 and gun emplacements G-01..G-16 (PDF B.7.5). All 17 rows of `results.jsonl` were re-checked against the local texts and rewritten in `GOVERNANCE/evidence_corrections/terrain-1.jsonl`. The earlier text of this report (2026-11-04) is kept at the end as superseded; `results.jsonl` is unchanged.\n")
w("## Result\n")
w("Verdicts: confirmed %d, corrected %d, partially_supported %d, unsupported %d, gap %d (17 rows). Sub-claims %d: tier documented %d, inferred %d, open_gap %d; support supported %d, partial %d, conflict %d, contradicted %d, unsupported %d. Citations %d: %d Official Records (%d also found in at least one of four other archive.org scans of the same volumes), %d National Park Service documents and pages, %d books of the library. Every citation carries the verbatim quote, the character offset in the local file, the file's sha256 and, for the Official Records, the report id and the printed page read from the running heads; for library books a printed page appears only where it was read by hand from the text layer (otherwise a marked heuristic page hint).\n" % (
    V.get('confirmed', 0), V.get('corrected', 0), V.get('partially_supported', 0), V.get('unsupported', 0), V.get('gap', 0), len(sub), T.get('documented', 0), T.get('inferred', 0), T.get('open_gap', 0),
    S.get('supported', 0), S.get('partial', 0), S.get('conflict', 0), S.get('contradicted', 0), S.get('unsupported', 0), len(cits), len(ors), w2, len(nps), len(lib)))
w("| row | verdict | sub-claims (documented / inferred / open gap) | headline |\n|---|---|---|---|")
for r in rows:
    ts = r['tier_summary']
    w("| %s | %s | %d (%d / %d / %d) | %s |" % (r['id'], r['verdict'], len(r['sub_claims']), ts.get('documented', 0), ts.get('inferred', 0), ts.get('open_gap', 0), HEAD[r['id']]))
w("\nEvery row keeps status `open_gaps` (something stays unsupported, conflicting or unplaced and is registered); none is closed, none passes. Verdict meaning used here: confirmed = every printed claim is supported (additions allowed); corrected = at least one printed claim is contradicted or replaced; partially_supported = some printed claim is unsupported and none is contradicted; gap = cannot be decided or cannot pass. Register entries: `proposed-register/terrain-1-EG-01..17.md` (rewritten under the same file names; each names the existing register id EG-0149..EG-0165 of its row).\n")
w("## What this close-out changed against the 2026-11-04 shard\n")
for t in (
 "G-03 was called a conflict with the seed ('lunettes by 16:00 Jul 2' contradicted by the OR). The library shows otherwise: the OR says a small earthwork in front of each gun at dusk 1 Jul (Wainwright p.357, Hunt p.232, Whittier p.361, Breck p.363); Pennsylvania at Gettysburg (1914) says Cooper's men finished four lunettes on the morning of 2 Jul and the New York books call the works lunettes or redans. Verdict now confirmed with additions (builder named where the report names one; dimensions open).",
 "G-08's 36 guns (called a Wikipedia figure) are Alexander's 1907 memoir: 36 guns in action against the Peach Orchard about 3:45 p.m., 18 of Cabell's and 18 of his own. G-09: Cabell's four batteries have four guns each in their own reports (16, not the memoir's 18). G-04: Andrews' report counts 14 guns on the hill plus two 20-pounder Parrotts; the 'about 20' of the PDF is New York at Gettysburg (1900); the PDF's five battery names are in the OR's organization table.",
 "G-10: the 'second position behind an existing wall near Trostle's house' is documented (Milton: a position near which two stone walls met at an obtuse angle; the NPS Cultural Landscapes Inventory ties them to the Trostle farm; Hunt in Battles and Leaders, Meade and Toombs place the stand near the Trostle house). Hunt in Battles and Leaders III p.310 also documents what the PDF calls hand-to-hand fighting and the 21st Mississippi, and reads '65 out of 88 horses killed or wounded' (one scan; the digits could not be checked in a second scan). Milton's own figure is 45 + 15 = 60; Fox (1889) prints Milton as 50 + 15 = 65 and Hunt in the Century as 80 of 88: the PDF's '65 vs 80 of 88' are Fox's two figures. The earlier claim that '65' is only Fox's misreading is withdrawn.",
 "G-11: besides the documented split (2 Jul evening improvised, 3 Jul morning a slight earthwork, 39 guns), Hunt in Battles and Leaders p.310 gives 'some twentyfive guns' for the Plum Run line when it was formed on 2 Jul: a retrospective value next to the PDF's unsupported '6 to 23'.",
 "G-12: Cushing's battery was in place on the morning of 2 Jul (Hunt, Webb 6.30 a.m.), not the late afternoon; Webb has all guns but one silenced by 14:45, not four of six; no earthwork or gun pit is named anywhere.",
 "G-13: the Hancock-Hunt dispute is documented by Hart's report and Hunt's own Battles and Leaders article; the 120 and 34 figures are in no source read. G-14: 179 is not in Alexander's memoir (172 is); the NPS lists Poague's and Reilly's lunettes as battle-origin works, so 'open positions' holds only for the OR's description.",
 "G-16: the two Whitworths on 3 Jul are documented by McIntosh, the NPS Cultural Landscape Report (the highest position on Oak Hill; the park's tablet and two original Whitworths were completed in 1906) and Alexander; Eshleman, Furlong, the NPS handbook and Alexander (B&L) all have two guns of the Washington Artillery as the signal; nothing supports a Whitworth signal or two 3-inch rifles at the marker.",
 "Pages: the 2026-11-04 rows gave interpolated page ranges for some passages; two are now read from the running heads (Hazard p.478 for '~479', Hall p.437 for '~438'; Brown's '456-458' resolves to 456). All %d original quotes are verbatim in the local Official Records with the same report ids, and %d of %d page claims agree with or contain the found page; the OR-RECHECK lines of this shard (%d) were all 'yes'." % (rcn['original_passages'], rcn['page_match_or_range_contains'], rcn['original_passages'], rcn['or_recheck_lines'])):
    w("- " + t)
w("\n## The second reading of the supported sub-claims\n")
w("After the first build every sub-claim marked supported was read again against its own quotes. The first build had let a number of sub-claims carry details that their quotes did not contain. 46 sub-claims were corrected by adding the missing exact quote or by cutting the claim back to what the quotes say, and 3 sub-claims were added (G-10.j, G-11.g, G-11.h). Changes of substance: Latimer 'mortally wounded' became 'received the wound of which he died' (Ewell, Brown, Andrews); the first canister of Hart's battery has no source clock (the earlier '5-5:45 window' was not documented); in G-08 it is Alexander who was ordered to control the other battalions, not Huger; 'the four guns hauled off by the 6th Maine and Seeley's' became McGilvery's actual sentences (a detail from the 6th Maine and Seeley's for Battery I; Dow to procure an infantry detail for Bigelow's four guns); the infantry gaining the woods at about a quarter to six began McGilvery's retirement and is not the overrun at the second position; Smith's own supposition (1863) and statement (1888) on who took his guns were added to the capture selector; 'all guns retaken' (G-03) was removed because Ricketts says only that part of the Second Corps drove the enemy back; Hunt's B&L page 310 was found to document the hand-to-hand fighting and to carry the figures '25 guns' and '65 of 88 horses'. R13.0000 still said that every gun row was 'corrected' and was rewritten to the final verdict counts.\n")
w("## Method, what was run, what passed\n")
w("- `scripts/build.py` (python3 -I): re-matches every citation quote verbatim (whitespace-normalised, case-sensitive, hyphenation joined) inside the named Official Records report (tools/bt/or27_find views), library text or NPS text and records offset, sha256 of the local file, report, printed page (running head, else the garbled head read in the text) and, for OR quotes, whether four other archive.org scans of the volumes contain it. Result: %d citations, 0 failures." % len(cits))
w("- `scripts/verify.py` (independent of the build): cuts every citation's offsets from the raw file and compares the squashed text with the squashed quote (one running-head insertion allowed), checks the file hashes and the id list. Result: 17 rows, %d citations, 0 problems." % len(cits))
w("- Heuristic triage of the supported sub-claims (words, numbers and strong terms of the claim that no quote contains): run before and after the corrections; the remainder are unit numerals against spelled-out ordinals, words of headings and arithmetic sums, each read by hand.")
w("- `scripts/gen_register.py`, `scripts/gen_report.py`: write the register entries and this report from the corrections file. `scripts/s.py`, `rd.py`, `chk.py`, `h2t.py`: search, read and quote-check helpers. `web_lookups.json` lists the network lookups.")
parts = '; '.join('Part %d: %s' % (p, ', '.join(sorted(or_ids[p]))) for p in sorted(or_ids))
w("- Official Records reports cited (report ids of tools/bt/or27_find, vol. 27, %d passages in %d reports): %s." % (len(ors), sum(len(v) for v in or_ids.values()), parts))
w("- Library and NPS sources cited (number of citations):")
for sid, n in by_src.items():
    if sid.startswith('OR-27'): continue
    w("  - %s: %s (%d)" % (sid, TITLES.get(sid, sid), n))
w("- Not run: no gate (Q03, Q07, Q08, Q09, Q26 are the gates of R13.0000 in requirements.json), no `passes` flag touched, no browser, no image check of any printed page (page numbers are read from the text layers; the printed page of the Fox passages is not shown in the text layer, hint 403; library pages other than those read by hand are heuristic hints), no change to a product file. Nothing was committed or deployed.")
w("- Failed: the check of the digits '65 out of 88 horses' (Hunt, B&L III p.310, R13.G-10.g) against a second scan: archive.org answered the search (HTTP 200), but the data nodes (dn*.archive.org) to which two downloads of volume III were redirected answered 403 to CONNECT through the egress proxy, and HEAD requests to the data nodes of six more scans of volume III got no answer; recorded in `web_lookups.json` (W7), not retried, not worked around.\n")
w("## blocked_host: pages the rows rest on that could not be read (never asserted)\n")
w("| row | PDF keys | URL | what has to be read there |\n|---|---|---|---|")
for r in rows:
    for b in r['blocked_host']:
        w("| %s | %s | %s | %s |" % (r['id'], b['source_key'], b['url'] or 'not printed in the PDF source list', b['what_to_read'].replace('|', '/')))
w("\nThe PDF's list of source keys prints no URL for 13 of the 14 groups of keys above. gettysburg.stonesentinels.com, historynet.com and gettysburgdaily.com answered 403 in the probes of other shards of this campaign (fence-1, fence-2) and were not probed again here; hmdb.org was probed once here and refused with HTTP 403 by the egress proxy; emergingcivilwar.com, strategypage.com, battlefields.org, civilwarnews.com and civilwartalk.com were not probed here; Wikipedia and forum pages are not accepted by the Law as support for a documented tier, so no row depends on them.\n")
w("## Delegated decisions\n")
w("DD-TERRAIN1-01..12 (appended to `decisions/DELEGATED-DECISIONS-2026-11-11.md`) with two correction lines appended after them (DD-TERRAIN1-08 Fox page hint and Meade page; DD-TERRAIN1-05, -06 and -08 after the second reading): defaults follow the best-supported primary evidence, every other value stays selectable and the PDF values stay marked. DD-TERRAIN1-03 refines and DD-TERRAIN1-09 confirms the existing DD-04 (G-03, G-12); DD-TERRAIN1-08 relies on DD-F2-04 (G-10); G-06 relies on the existing DD-FENCE1-07 and G-11 on the split of DD-04; G-15's default is the PDF's own value (ten guns, confirmed by Carter) with Alexander's 20 selectable, and no separate row was written. The conflict-register rows C-020 (East Cemetery Hill assault clock) and C-029 (cannonade end) are not decided by these rows: the rows carry the OR clocks as conflicts and the PDF's recommendations stay PENDING OWNER. Nothing was written to decision_log.md.\n")
w("## Owner-only acts\n")
w("None needed. No account, licence, payment, third-party contact or deployment.\n")
w("## Files\n")
w("- `GOVERNANCE/evidence_corrections/terrain-1.jsonl` (17 rows; schema as fence-1.jsonl: id, verdict, corrected_claim, sub_claims with tier and citations (source id, part, report id, printed page, quote, offset, sha256), stays_unsupported, conflicts_carried, register_refs, blocked_host, product_consequence, recheck, lookups)\n- `horde/terrain-1/proposed-register/terrain-1-EG-01..17.md`\n- `horde/requests/bt-evidence-terrain-1-world-content.md` (the product changes, for the world-content workstream)\n- `horde/terrain-1/scripts/` (build, verify, generators, helpers), `horde/terrain-1/web_lookups.json`, `tmp/terrain-1/` (scratch: dumps, searches, the two nps.gov pages, the archive.org scans used as second witnesses)\n")
w("\n---\n\n## Earlier report (2026-11-04 and audit pass), superseded by the close-out above\n")
w(old.replace('# Shard terrain-1 report', '### Shard terrain-1 report (earlier text)', 1).replace('\n## Audit pass 2026-11-04', '\n### Audit pass 2026-11-04'))
open(os.path.join(ROOT, 'docs/battle-theatre/GOVERNANCE/horde/terrain-1/REPORT.md'), 'w', encoding='utf-8').write('\n'.join(o) + '\n')
print('REPORT.md written,', len('\n'.join(o)), 'chars')
