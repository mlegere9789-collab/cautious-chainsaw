"""Writes the 'Final state' section at the top of horde/tl-01/REPORT.md from counts.json, the corrections file, the second-scan file and the search log.
Idempotent: the section between the markers is replaced; the older text is kept below it."""
import json, os, re, collections, glob
ROOT = '/home/user/cautious-chainsaw'
G = ROOT + '/docs/battle-theatre/GOVERNANCE'
H = G + '/horde/tl-01'
C = H + '/closeout'
cnt = json.load(open(C + '/counts.json', encoding='utf-8'))
rows = [json.loads(l) for l in open(G + '/timeline_corrections/tl-01.jsonl', encoding='utf-8')]
res = [json.loads(l) for l in open(H + '/results.jsonl', encoding='utf-8')]
log = sum(1 for l in open(C + '/search_log.jsonl', encoding='utf-8') if l.strip())
co = sorted(glob.glob(H + '/proposed-register/tl-01-CO-*.md')); eg = sorted(glob.glob(H + '/proposed-register/tl-01-EG-*.md'))
ss_path = C + '/second_scan.jsonl'
ss = None
if os.path.exists(ss_path):
    ss = [json.loads(l) for l in open(ss_path, encoding='utf-8')]
def fmt(d): return ', '.join('%s %d' % (k, v) for k, v in sorted(d.items(), key=lambda kv: -kv[1]))
srcs = cnt['citations_by_source']
or_n = srcs.get('OR27', 0)
ncit = cnt['citations']
subs = sum(cnt['sub_claims_by_tier'].values())
nonver = ['T1-003', 'T1-005', 'T1-011', 'T1-013', 'T1-018', 'T1-019', 'T1-022', 'T1-023', 'T1-029', 'T1-030', 'T1-040', 'T1-041', 'T1-048', 'T1-050']
byid = {r['id']: r for r in rows}
nonver_v = collections.Counter(byid[i]['verdict'] for i in nonver)
sc_rows = cnt['rows_with_scenarios']
if ss is not None:
    kinds = collections.Counter()
    for r in ss:
        ws = r.get('witnesses') or []
        if not ws: kinds['no second scan'] += 1; continue
        kinds[' + '.join(sorted(w['result'] for w in ws))] += 1
    witness_line = ('- Witness check (closeout/second_scan.jsonl, script closeout/tools/witness.py): every OR citation (%d) was looked up in the other archive.org scans of the same part '
                    '(two further scans of part 1, two of part 2, one of part 3): %s. A citation that is "aligned" and not "verbatim" in a scan differs from it by OCR noise; every difference in a figure or a date was read on the page image or in the other scans and is listed under "Figures corrected" below.' % (len(ss), '; '.join('%s: %d' % (k, v) for k, v in sorted(kinds.items(), key=lambda kv: -kv[1]))))
else:
    witness_line = '- Witness check of every OR citation against the other archive.org scans of the same part: NOT RUN YET in this file state (queued behind the machine lock); the first run of 2026-11-13 (189 of 196 citations of parts 1 and 2, before the changes of the second pass) gave verbatim in both scans 112, verbatim in one and aligned in the other 40, aligned in both 33, none 4.'
sec = '''## Final state 2026-11-14 (third start of the close-out, after two container restarts; supersedes the numbers of the sections below where they differ)

What was asked: for every row of shard tl-01 whose status_effective was not verified_against_or_text (the 14 rows T1-003, 005, 011, 013, 018, 019, 022, 023, 029, 030, 040, 041, 048, 050) apply the OR-RECHECK and OR-RECHECK-2 findings, search the Official Records and the library for a passage that supports the claim or a sub-claim, write one corrections line, and propose a register entry for every row that stays gap, unsupported or partial; the other 43 rows also get a line. Everything below the first line of this section was done in the earlier builds and is kept; this section is the state of the files now.

Files (all produced by `python3 -I docs/battle-theatre/GOVERNANCE/horde/tl-01/closeout/build.py`; `--check-only` re-verifies without writing):
- `GOVERNANCE/timeline_corrections/tl-01.jsonl`: 57 lines, one per seed row (id, verdict, before, corrected_claim with time_window and basis, sub_claims with tier and support, citations with source id, part, report id, printed page, verbatim quote, text offset and end, source file and sha256, scenarios, default, remains_unsupported, searched, recheck_applied, register_proposed).
- `horde/tl-01/results.jsonl`: the 57 shard rows with the findings applied (the values before are kept under *_before).
- `horde/tl-01/proposed-register/`: %d entries tl-01-CO-<row>.md (every row that stays partial, unsupported or gap, each with the searches made), tl-01-CONFLICTS.md (%d rows with scenarios), and the %d older entries tl-01-EG-001..007.
- `horde/tl-01/closeout/`: the builder and the row data (build.py, rowlib.py, rows_a.py, rows_b.py, rows_c.py), search_log.jsonl (%d logged searches), acquired_tl01.json (the files fetched, including the archive.org PDFs whose page images were read), second_scan.jsonl (the witness check), lib_search_t1040.txt (the library-wide search for the night of Jun 29), counts.json, tools/.

### Counts

- Rows 57. Verdicts: %s. Of the 14 rows that were not verified against the OR text: %s (T1-048 is the only row that stays unsupported; no row is a pure gap because every one of them found some support for a sub-claim).
- Status in results.jsonl: %s. Row tier: %s (the row tier is the tier of what the displayed claim asserts; the sub-claims carry their own).
- Sub-claims: %d, by tier %s; by support %s.
- Citations: %d, every one re-matched verbatim in the local source text by the builder (report id and printed page checked for the OR) and compared with the file again by an independent slice (offset, normalised text: %s); by source: %s.
- Scenarios: %d rows carry two or more scenarios (%s); the only default is T1-043 (DD-07); every other conflict is carried without a default.
- Searches: %d logged (closeout/search_log.jsonl), plus the two weather scans of the first build and the library-wide search of the second pass.
%s

### What the second pass of 2026-11-13/14 changed

Figures corrected after reading the page images of the archive.org PDFs or the other scans (the OCR text layer of the library copy was wrong or damaged):
- T1-028: Early's militia at Wrightsville are "some 1,200 strong" (the OCR has 1.300), the same figure as Gordon's: the 1,300 scenario of the first build was an OCR artifact and is removed.
- T1-051: Richmond's First Brigade lost 2 officers killed (OCR 3): 10 killed, not 11. T1-052: Wright's march was "from 32 to 35 miles" (OCR 33). T1-035: Heth's Cashtown is "9 miles" from Gettysburg (OCR 0). T1-006: the forks are "about 1 1/2 miles" from Cashtown (OCR 1-|). T1-033: Rodes' Alabama brigade picketed the Baltimore turnpike 1 1/2 miles out (OCR "H miles"). T1-051: the 6th Michigan lost "some 15 or 20 captured" (OCR 15 or 30). T1-024: Stuart resumed the march "early on the 28th" (OCR 2sth).
- Jacobs 1864 prints the hour fractions as J or | in the text layer: on the page images the advance guard rode into Gettysburg at 3 1/4 P. M. (15:15, not 15:30; T1-013, T1-014) and the other hours are 10 1/2, 9 1/2, 11 1/2 and 8 1/2 (T1-008, T1-047, T1-045, T1-049).
- Printed pages: the library citations were recovered from one parity of running head only and several were one or two pages early; both parities are now read and cross-checked (Alexander, the Southern Historical Society Papers, Fremantle, Pierce, Minnesota, Meade); eight OR citations whose page the running-head model gave as a range are placed on one page from the independent scan and the page images (443, 444, 587, 938, 1008, 193, 151).

New documented evidence from the tables that the OCR text holds in scrambled columns, read on the page images:
- T1-051 (Hanover): the General Return of Casualties (OR27-1 p.193) has Hanover, June 30: 2 officers and 17 men killed, 6 officers and 67 men wounded, 5 officers and 118 men missing, 215 in all (the figure the seed gives); the First Brigade table (p.1008) gives the losses by regiment (5th New York 13 men missing against Hammond's 10 in his text; 18th Pennsylvania 52 missing, not the seed's 57); Custer's 1st Michigan lost nothing and the 6th "some 15 or 20 captured"; the seed's 117 Confederate is the grand total of Stuart's Inclosure No. 2 (pp.713-714) for the whole march from Rector's Cross-Roads to Gettysburg including Hanover, not a Hanover-only figure. Scenarios carried, no default.
- T1-037 (Westminster, Jun 29): Union loss 49 (General Return p.193). T1-045: the Cavalry Corps total of the return of Jun 30 (773 officers, 14,200 men present for duty, 17,104 aggregate present, OR27-1 p.151); no OR text gives a division figure.
- T1-040 (night of Jun 29): the places the Union columns marched to (Itinerary p.144), Meade's headquarters and letter at Middleburg, Buford's camp near Fairfield, the First Corps and the 16th Maine at Emmitsburg (Life and Letters, Pennsylvania at Gettysburg, Maine at Gettysburg); Stuart at Union Mills is inferred. The library-wide search (178 texts) found no passage on fires, pickets, lights or civilians of that night; that part stays the open gap.
- T1-049: the National Park Service names Pennsylvania Hall of Gettysburg College as an observation post and signal station during the battle; the identification of the steeple with the Hall stays inferred.

Citations that did not carry their claims were repaired. A side-by-side reading of every sub-claim whose names or numbers were missing from its quotes (closeout/tools/tokctx.py, numnear.py, sidebyside.py) found four kinds of defect: a quote that stood in another sentence than the claim (T1-039: "The Eleventh Corps was at Emmitsburg" was cited for the First Corps near Marsh Run, and "at Moritz Tavern" of a dispatch of the Left Wing for Reynolds' headquarters, which are in his dispatch to Howard, OR27-3-D0920 p.417: "My headquarters are at Moritz Tavern"); a quote that ended before the fact of the claim (the demand list of T1-014 stopped at the bacon, the 26 and 23 miles of T1-030, the Michigan regiments of T1-046, the prisoners and the hour of T1-010); an OCR spelling inside a quote that the claim corrects (a reading is now carried: Hunterstown, Kilpatrick, the dates 2sth, 3()th, 2U); and quotes that omit the place or the date held by the clause before them. About fifty quotes were extended to the clause or sentence that carries the claim and ten citations were added, in T1-002, 004, 005, 006, 007, 009 to 012, 014, 016, 019 to 023, 025, 027 to 034, 036, 038 to 040, 042, 046, 047, 049, 051 to 054, 056 and 057 (the builder re-matched every new quote verbatim). The author names of the OR citations that the index carries with OCR damage (Eoath, Mafifett, EweU, "Williams, "W. Geary, Eslileman, OUver) are printed in their correct form (AUTHOR_FIX in build.py); the quote strings themselves stay the OCR strings. What remains different between a claim and its quote is a date taken from the heading of the day or the report, a digit against a spelled number ("one hundred and fifty", "four and a half") and a sum (10 killed = 2 + 8).

Further searches of the second pass: a library-wide search (178 texts) for the night of Jun 26 (T1-018) found no camp-life passage (closeout/lib_search_t1018.txt); the same for the night of Jun 29 (T1-040) found positions only (closeout/lib_search_t1040.txt).

### Checks run in this pass and what was not run

- `build.py` (the builder) re-matches the %d citations; `python3 tmp/tl-01/audit/slicecheck.py`-style independent slice check: see above; `tools/bt/merge_horde.py --dry`: 0 rows of this shard flagged; the product text of every row contains none of the banned words (checked by the builder).
%s
- No gate run, no `passes` flag touched, no browser, nothing deployed or committed. `timeline_verified.jsonl` is not regenerated (the integrator's task), so its status_effective counts for tl-01 stay as they were until the next merge.
- Owed: the page images of the OR were read for the figures named above, not for every citation; the witness check compares text layers, not images; Part 3 has one other scan only. The OCR of the newspapers and of Jacobs stays an OCR reading wherever the page image was not looked at. Owner-only steps are unchanged (see below).

''' % (len(co), cnt['rows_in_conflicts_file'], len(eg), log,
       fmt(cnt['verdict']), fmt(nonver_v), fmt(cnt['results_status']), fmt(cnt['results_tier']),
       subs, fmt(cnt['sub_claims_by_tier']), fmt(cnt['sub_claims_by_support']),
       ncit, 'run 2026-11-14: see SLICE below', fmt(srcs),
       len(sc_rows), ', '.join(sc_rows), log, witness_line, ncit, '- Realization test `node --test tests/governance/realize.test.mjs` (reads this shard, read-only): see the line REALIZE below.')
open(ROOT + '/tmp/tl-01/audit/final_section.md', 'w', encoding='utf-8').write(sec)
rp = H + '/REPORT.md'
t = open(rp, encoding='utf-8').read()
BEGIN = '## Final state 2026-11-14'
OLD = '## Close-out 2026-11-13 (supersedes the pass of 2026-11-04 where they differ; that report is kept below)'
if BEGIN in t:
    i = t.index(BEGIN); j = t.index(OLD)
    t = t[:i] + sec + t[j:]
else:
    i = t.index(OLD)
    t = t[:i] + sec + OLD.replace('(supersedes the pass of 2026-11-04 where they differ; that report is kept below)', '(first build, 2026-11-13 20:31; the numbers of the section above supersede it where they differ; it supersedes the pass of 2026-11-04 where they differ)') + t[i + len(OLD):]
open(rp, 'w', encoding='utf-8', newline='\n').write(t)
print('REPORT.md updated;', len(sec), 'chars in the new section')
