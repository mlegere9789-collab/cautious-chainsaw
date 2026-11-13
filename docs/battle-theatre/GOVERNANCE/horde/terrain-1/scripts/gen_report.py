"""Write horde/terrain-1/REPORT.md from evidence_corrections/terrain-1.jsonl (close-out 2026-11-13) plus the earlier report kept as superseded text.
Run: python3 -I gen_report.py"""
import os, json, collections
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
HEAD = {
 'R13.0000': "cannot pass: 16 gun rows corrected or partly supported, none passes; no gate run",
 'R13.G-01': "centre (not left) section withdrawn; 'hollow' unsupported; relief clocks 10:00 / 10:15 / 10:45; first-shot marker is the Wisler Farm marker",
 'R13.G-02': "guns on the seminary crest behind a stone wall, not behind the rail work; 22 guns (Hunt) vs 12; withdrawal 16:00-17:00",
 'R13.G-03': "2026-11-04 'conflict' withdrawn: per-gun works at dusk 1 Jul finished the morning of 2 Jul, called lunettes in the state books; dimensions open",
 'R13.G-04': "14 + 2 guns (Andrews), 20 with Graham (New York 1900); four left; 37 Union guns unsupported; 'Benner's Hill' found in the library",
 'R13.G-05': "arrival 09:00 and 4 + 2 layout documented; 18:00 section shift unsupported; capture attribution is a conflict",
 'R13.G-06': "first fire on arrival about 16:30, not 17:45; hauling is a four-way conflict",
 'R13.G-07': "4 p.m. / 4:30 clocks documented; 'Wheatfield Road' and Knox's gun unsupported; position conflict",
 'R13.G-08': "36 guns found in Alexander 1907 (18 + 18); OR per-battery counts for Parker, Rhett, Moody (2 Jul) still absent",
 'R13.G-09': "16 guns in four batteries of four; pre-existing fences at the 2 Jul position; the brick house stays unplaced",
 'R13.G-10': "second position = Trostle wall corner (Milton, NPS, three books); '65 horses' is Fox's misreading of Milton's 45 + 15; 18:30 unsupported",
 'R13.G-11': "split confirmed: 2 Jul improvised (no total), 3 Jul prepared (39 guns, slight earthwork); '6 to 23' unsupported",
 'R13.G-12': "in place the morning of 2 Jul; one gun serviceable at 14:45; no earthwork; double canister at 100 yd unsupported",
 'R13.G-13': "Union counts 75/80/77/108/166-220; Hancock's order documented in Hart and Hunt (B&L); 120 and 34 unsupported",
 'R13.G-14': "Confederate counts nearly 150 to 172; 179 not found; 'over two miles' is the NPS infantry line; Poague's and Reilly's lunettes (NPS)",
 'R13.G-15': "ten rifles either side of the cut confirmed; Alexander has 20; Oak Hill = NPS name",
 'R13.G-16': "two Whitworths on Oak Hill documented; signal by Miller's two guns (four witnesses); 3-inch pair and Whitworth signal unsupported",
}
o = []
w = o.append
w("# Shard terrain-1 report: R13.0000 and R13.G-01..G-16 (17 items), close-out 2026-11-13\n")
w("The first 17 R13 ids are R13.0000 and gun emplacements G-01..G-16 (PDF B.7.5). All 17 rows of `results.jsonl` were re-checked against the local texts and rewritten in `GOVERNANCE/evidence_corrections/terrain-1.jsonl`. The earlier text of this report (2026-11-04) is kept at the end as superseded; `results.jsonl` is unchanged.\n")
w("## Result\n")
w("Verdicts: confirmed %d, corrected %d, partially_supported %d, unsupported %d, gap %d (17 rows). Sub-claims %d: tier documented %d, inferred %d, open_gap %d; support supported %d, partial %d, conflict %d, contradicted %d, unsupported %d. Citations %d: %d Official Records (%d also found in at least one of four other archive.org scans of the same volumes), %d National Park Service documents and pages, %d books of the library (Alexander 1907, Battles and Leaders III, New York / Pennsylvania / Maine at Gettysburg, Meade's Life and Letters, Fox 1889, Bachelder, Toombs).\n" % (
    V.get('confirmed', 0), V.get('corrected', 0), V.get('partially_supported', 0), V.get('unsupported', 0), V.get('gap', 0), len(sub), T.get('documented', 0), T.get('inferred', 0), T.get('open_gap', 0),
    S.get('supported', 0), S.get('partial', 0), S.get('conflict', 0), S.get('contradicted', 0), S.get('unsupported', 0), len(cits), len(ors), w2, len(nps), len(lib)))
w("| row | verdict | sub-claims (documented / inferred / open gap) | headline |\n|---|---|---|---|")
for r in rows:
    ts = r['tier_summary']
    w("| %s | %s | %d (%d / %d / %d) | %s |" % (r['id'], r['verdict'], len(r['sub_claims']), ts.get('documented', 0), ts.get('inferred', 0), ts.get('open_gap', 0), HEAD[r['id']]))
w("\nEvery row keeps status `open_gaps` (something stays unsupported, conflicting or unplaced and is registered); none is closed, none passes. Register entries `proposed-register/terrain-1-EG-01..17.md` (rewritten; ids unchanged so that the register links EG-0149..EG-0165 still point at them).\n")
w("## What this close-out changed against the 2026-11-04 shard\n")
for t in (
 "G-03 was called a conflict with the seed ('lunettes by 16:00 Jul 2' contradicted by the OR). The library shows otherwise: the OR says a small earthwork in front of each gun at dusk 1 Jul (Wainwright p.357, Hunt p.232, Whittier p.361, Breck p.363); Pennsylvania at Gettysburg (1914) says Cooper's men finished four lunettes on the morning of 2 Jul and the New York books call the works lunettes or redans. Verdict now confirmed with additions (builder named where the report names one; dimensions open).",
 "G-08's 36 guns (called a Wikipedia figure) are Alexander's 1907 memoir: 36 guns in action against the Peach Orchard about 3:45 p.m., 18 of Cabell's and 18 of his own. G-09 Cabell's four batteries have four guns each in their own reports (16, not the memoir's 18). G-04: Andrews' report counts 14 guns on the hill plus two 20-pounder Parrotts; the 'about 20' of the PDF is New York at Gettysburg (1900).",
 "G-10: the 'second position behind an existing wall near Trostle's house' is documented (Milton: a position near which two stone walls met at an obtuse angle; the NPS Cultural Landscapes Inventory ties them to the Trostle farm; Hunt in Battles and Leaders, Meade and Toombs say near the Trostle house). The PDF's '65 horses' is Fox's misquotation of Milton's 45 killed + 15 wounded (two further scans read 45).",
 "G-12: Cushing's battery was in place on the morning of 2 Jul (Hunt, Webb 6.30 a.m.), not the late afternoon; Webb has all guns but one silenced by 14:45, not four of six; no earthwork or gun pit is named anywhere.",
 "G-13: the Hancock-Hunt dispute is documented by Hart's report (Hancock ordered him to open, McGilvery to cease) and Hunt's own Battles and Leaders article; the 120 and 34 figures are in no source read. G-14: 179 is not in Alexander's memoir (172 is); the NPS lists Poague's and Reilly's lunettes as battle-origin works, so 'open positions' holds only for the OR's description.",
 "G-16: the two Whitworths on 3 Jul are documented by McIntosh, the NPS Cultural Landscape Report (the highest position on Oak Hill) and Alexander; Eshleman, Furlong, the NPS handbook and Alexander (B&L) all have two guns of the Washington Artillery as the signal; nothing supports a Whitworth signal or two 3-inch rifles at the marker.",
 "Pages: three printed pages that the 2026-11-04 rows gave as interpolated ranges are now read from the running heads of the text (Hazard p.478, Hall p.437, Brown p.456). All 66 original quotes are verbatim in the local Official Records with the same report ids; 66 of 66 page claims agree or contain the found page; the OR-RECHECK lines of this shard (66) were all 'yes'.") :
    w("- " + t)
w("\n## Method, what was run, what passed\n")
w("- `scripts/build.py` (python3 -I): re-matches every citation quote verbatim (whitespace-normalised, case-sensitive, hyphenation joined) inside the named Official Records report (tools/bt/or27_find views), library text or NPS text and records offset, report, printed page (running head, else the garbled head read in the text) and, for OR quotes, whether four other archive.org scans of the volumes contain it. Result: %d citations, 0 failures." % len(cits))
w("- `scripts/verify.py` (independent of the build): cuts every citation's offsets from the raw file and compares the squashed text with the squashed quote (one running-head insertion allowed), checks the OR file hashes and the id list. Result: 17 rows, %d citations, 0 problems." % len(cits))
w("- `scripts/gen_register.py`, `scripts/gen_report.py`: write the register entries and this report from the corrections file. `scripts/s.py`, `rd.py`, `chk.py`, `h2t.py`: search, read and quote-check helpers.")
w("- Sources newly used: OR27-1 R315 (Tyler), R073, R074, R075 (5th Maine, L/1st NY, Cooper), R106, R264, R265, R320, R321; OR27-2 R436-R440 (Cabell's batteries), R442, R452, R454, R458, R462, R463, R465, R467, R468, R505 (Andrews), R562 (Poague); Alexander (1907), Battles and Leaders III, New York at Gettysburg (1900, 1902), Pennsylvania at Gettysburg (1914), Maine at Gettysburg (1898), Meade's Life and Letters II, Fox (1889), Bachelder's What to See (1889), Toombs (1888); NPS Handbook 9 (1954, 1962), CLR First Day, CLR Record of Treatment I, CLI Pickett's Charge, CLI Emmitsburg Road Ridge, CLI Little Round Top, Treatment Philosophy, Harmon Farm study, the Slaughter Pen study, Common Pride; nps.gov pages `confederate-line.htm` and `us-line.htm` fetched 2026-11-13 (one request each, 1 per second) to `tmp/terrain-1/nps/`.")
w("- Not run: no gate (Q03, Q07, Q08, Q09, Q26), no `passes` flag touched, no browser, no image check of any printed page (page numbers are read from the text layers; the printed page of the Fox passages is not shown in the text layer, hint 403), no change to a product file. Nothing was committed or deployed.\n")
w("## blocked_host: pages the rows rest on that could not be read (never asserted)\n")
w("| row | PDF keys | URL | what has to be read there |\n|---|---|---|---|")
for r in rows:
    for b in r['blocked_host']:
        w("| %s | %s | %s | %s |" % (r['id'], b['source_key'], b['url'] or 'not printed in the PDF source list', b['what_to_read'].split(': ', 1)[-1][:230] if False else b['what_to_read'][:260]))
w("\nThe PDF's list of source keys (B.7.5 notes) prints no URL for these keys. gettysburg.stonesentinels.com, historynet.com, gettysburgdaily.com, hmdb.org and others were refused (403) in earlier probes of this campaign and were not probed again; civilwartalk.com, emergingcivilwar.com, strategypage.com, battlefields.org, civilwarnews.com and wikipedia.org were not used (forums, magazines and an encyclopedia are not acceptable sources for a documented tier).\n")
w("## Delegated decisions\n")
w("DD-TERRAIN1-01..12 (appended to `decisions/DELEGATED-DECISIONS-2026-11-11.md`, with a one-line correction for DD-TERRAIN1-08): defaults follow the best-supported primary evidence, every other value stays selectable and the PDF values stay marked. They refine DD-04 (G-03, G-11, G-12), DD-F2-04 (G-10) and DD-FENCE1-07 (G-06); the conflicts C-020 (assault clock) and C-029 (cannonade end) are consistent with them. Nothing was written to decision_log.md.\n")
w("## Owner-only acts\n")
w("None needed. No account, licence, payment, third-party contact or deployment. Optional (not an act only the owner can do, but only the owner's machine can do it): a photograph of the Oak Hill artillery tablet for the Hardaway Alabama Artillery (Hurt's battery) would settle the '2 x 3-inch rifles' of G-16.\n")
w("## Files\n")
w("- `GOVERNANCE/evidence_corrections/terrain-1.jsonl` (17 rows; schema as fence-1.jsonl: id, verdict, corrected_claim, sub_claims with tier and citations (source id, part, report id, printed page, quote, offset), stays_unsupported, conflicts_carried, register_refs, blocked_host, product_consequence, recheck, lookups)\n- `horde/terrain-1/proposed-register/terrain-1-EG-01..17.md`\n- `horde/requests/bt-evidence-terrain-1-world-content.md` (the product changes, for the world-content workstream)\n- `horde/terrain-1/scripts/` (build, verify, generators, helpers), `tmp/terrain-1/` (scratch: dumps, searches, the two nps.gov pages)\n")
w("\n---\n\n## Earlier report (2026-11-04 and audit pass), superseded by the close-out above\n")
w(old.replace('# Shard terrain-1 report', '### Shard terrain-1 report (earlier text)', 1).replace('\n## Audit pass 2026-11-04', '\n### Audit pass 2026-11-04'))
open(os.path.join(ROOT, 'docs/battle-theatre/GOVERNANCE/horde/terrain-1/REPORT.md'), 'w', encoding='utf-8').write('\n'.join(o) + '\n')
print('REPORT.md written,', len('\n'.join(o)), 'chars')
