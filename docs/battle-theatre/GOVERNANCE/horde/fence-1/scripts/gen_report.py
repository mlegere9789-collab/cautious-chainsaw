"""Write REPORT.md of shard fence-1 and the world-content request note from evidence_corrections/fence-1.jsonl."""
import json, os, collections, re
ROOT = '/home/user/cautious-chainsaw'
G = os.path.join(ROOT, 'docs/battle-theatre/GOVERNANCE')
rows = [json.loads(l) for l in open(os.path.join(G, 'evidence_corrections/fence-1.jsonl'), encoding='utf-8')]
old = {json.loads(l)['id']: json.loads(l) for l in open(os.path.join(G, 'horde/fence-1/results.jsonl'), encoding='utf-8')}
vc = collections.Counter(r['verdict'] for r in rows)
sc = collections.Counter((s['tier'], s['support']) for r in rows for s in r['sub_claims'])
ncit = sum(len(s['citations']) for r in rows for s in r['sub_claims'])
orc = [c for r in rows for s in r['sub_claims'] for c in s['citations'] if c.get('second_witness') is not None]
sw = collections.Counter(sum(1 for w in c['second_witness'] if w['found']) for c in orc)
srcs = collections.Counter(c['source_id'] for r in rows for s in r['sub_claims'] for c in s['citations'])
def short(r, n=230):
    t = r['corrected_claim']
    return (t if len(t) <= n else t[:n].rsplit(' ', 1)[0] + ' ...').replace('|', '/')
lines = []
A = lines.append
A('# Shard fence-1 report (R14, items 1-35): close-out 2026-11-13, reopened 2026-11-14 (wave 4)')
A('')
A('Scope: R14.0000, E-01..E-18 (works chronology), S-001..S-016 (state schedule). These rows are earthwork, fence, building-state and hospital rows; fence relevance is marked on each row of `results.jsonl`.')
A('')
A('Machine-readable result: `GOVERNANCE/evidence_corrections/fence-1.jsonl` (35 lines, one per row: verdict, corrected claim, sub-claims with tier, citations with source id, part, report id, printed page, verbatim quote and character offset, what stays unsupported, blocked web sources, product consequence). Proposed register entries: `proposed-register/fence-1-EG-01..19.md`. World-content request note: `GOVERNANCE/horde/requests/bt-evidence-fence-1-world-content.md`. Page images looked at: `images/` and `image_checks.json`. Search log: `lookups.jsonl`. Scripts that rebuild and check everything: `scripts/` (spec_*.py hold the rows, spec_zz_wave4.py the 2026-11-14 additions; build_corrections.py, verify_corrections.py, gen_register.py, gen_report.py).')
A('')
A('## What was run (2026-11-13)')
A('')
A('1. Every one of the 92 citations of the earlier pass was re-matched verbatim in the local Official Records (OR Ser. I vol. 27 parts 1-2, Cornell scan, via tools/bt/or27_find): all 92 found, each with the same report id, printed page and character offsets as before (recorded per row in `recheck`). The 92 lines of this shard in `horde/OR-RECHECK/results.jsonl` are all found=yes, none fuzzy.')
A('2. Second witnesses: four further archive.org scans of OR vol. 27 were downloaded (warofrebellion271unit, warofrebellion012701rootrich for part 1; warofrebellion272unit, warofrebellionco272unit for part 2; sha256 in `scripts/witness.py`). Of the %d OR citations in the new file, %d are found in both extra scans, %d in one, %d in none (OCR spelling differences only, listed in each citation).' % (len(orc), sw[2], sw[1], sw[0]))
A('3. Every sub-claim without support was searched in OR parts 1-3, the 99-text library, three added archive.org books (Dawes 1890, Morhous 1879, Eddy 1864) and the 73 National Park Service documents now local (tmp/library/web/nps). 78 searches of that pass are logged in `lookups.jsonl` (including the failed ones).')
A('')
A('## What was run (reopened 2026-11-14, wave 4)')
A('')
A('The close-out of 2026-11-13 left three owed items (two page images and the garbled newspaper lines) and many texts had become local since: other workstreams had acquired books and the NPS pages. The jsonl of 2026-11-13 was rebuilt from the same row specs plus `scripts/spec_zz_wave4.py`.')
A('')
A('4. Page images (Read tool, crops cut at 300 dpi from archive.org scans; sha256 of every crop and source file in `image_checks.json`): OR27-1 p.431 (Davis, 69th Pa.) prints "on the morning of July 2" (the Cornell OCR "July 3" is a misread digit; E-17); OR27-1 p.856 (Greene) prints "By 12 o\'clock we had a good cover for the men" (the Cornell OCR "13" is a misread; E-05); the Gettysburg Compiler of 29 Jun 1863 reads "The [c]entre span of the bridge was burnt and [smeared] in. The other two are standing, but [ba]dly damaged" (S-001: "fell in" is the likely reading of a smeared word and is not asserted). All three owed items are closed.')
A('5. Newly local texts searched for every open sub-claim: the books acquired by the timeline and unit workstreams (Bates 1875, Biddle 1880, Hard 1868, Barton 1898, Stoever in USCC-Smith 1868, Brown 1896, Hall 1908), the Iron Brigade and Maine books (Curtis 1891, Small 1886, Dawes 1890), the Second Corps regimental and brigade histories of the oob-kit library (25 text files: Willson 1870, McDermott 1889, Banes 1876, Bruce 1906, Ford 1898, Page 1906 and others), the Adams Sentinel and Gettysburg Compiler issues of 1863, the NPS Historic Structures Report of the McPherson farm, the NPS Little Round Top landscape report with its quoted veterans, the NPS inventories and Common Pride studies. 50 more searches and three page-image readings are logged in `lookups.jsonl` (lines with "wave": 4, with real hit counts; hits are capped per text).')
A('6. Cited foreign scratch books were copied into tmp/fence-1/lib (sha256 checked against the owners\' ledgers where a ledger records one: the timeline ledger for the acquired books, the unit-kit note for the Iron Brigade and Maine books; the Second Corps histories are checked byte for byte against their source file) so the citations keep verifying when other workstreams clear their scratch.')
A('7. `scripts/build_corrections.py` re-resolved every citation (%d) in the local files: each quote found verbatim (whitespace-normalised, case-sensitive) exactly once in the named report or source, or the build stops. `scripts/verify_corrections.py`: %d citations, 0 mismatches. A strict audit (offset in the file, quote equals span, and for the Official Records the report id and printed page recomputed with tools/bt/or27_find against the stored values): 0 problems.' % (ncit, ncit))
A('8. The nine hosts of the web-only rows were asked once more on 2026-11-14 (one request each): all still answer "CONNECT tunnel failed, response 403"; blocked, not worked around (log: tmp/fence-1/run4/host_probe_2026-11-14.txt).')
A('')
A('Citations by source in the new file (%d in all): %s.' % (ncit, ', '.join('%s %d' % (k, v) for k, v in srcs.most_common(16))))
A('')
A('## Result by verdict')
A('')
A('| verdict | rows |')
A('|---|---|')
for v in ('confirmed', 'corrected', 'partially_supported', 'unsupported', 'gap'):
    A('| %s | %d (%s) |' % (v, vc[v], ', '.join(r['id'].replace('R14.', '') for r in rows if r['verdict'] == v)))
A('')
A('Sub-claims: ' + '; '.join('%s/%s %d' % (k[0], k[1], v) for k, v in sorted(sc.items())) + '.')
A('')
A('Row status: `open_gaps` = all supportable parts closed, named gaps remain registered; `blocked_host` = what is left rests only on web pages this machine cannot read (S-003, S-004, S-008, S-016).')
A('')
A('| id | verdict | status | corrected claim (short; the full text and every quote are in the jsonl) |')
A('|---|---|---|---|')
for r in rows:
    A('| %s | %s | %s | %s |' % (r['id'], r['verdict'], r['row_status'], short(r)))
A('')
A('## Where the earlier shard text was wrong or incomplete')
A('')
for t in [
 "E-04: the 80th NY / 151st Pa. rail-fence breastwork (Gates) is on the Cemetery Ridge line (E-17), not on Cemetery Hill. WAVE 4: books of 1875-1914 (Bates, Curtis, the New York and Pennsylvania volumes, Toombs, Pierce) do say Steinwehr fortified the hill and built lunettes, but no 1863 report does and Hancock (letter of 17 Jan 1878) calls the lunette account 'a great error' (only shallow holes for wheels and trails when he arrived about 15:00-15:30); the earlier 'no source says' is replaced by a carried three-way conflict.",
 "E-05: Greene's 'By 13 o'clock' (Cornell OCR) is 'By 12 o'clock' in the printed page (page image looked at 2026-11-14); the 149th NY lists 'rails' and a 04:00 march; Jones (60th NY, 1888) gives a 10:00 finish; NPS gives a general five-foot figure for the log-crib works.",
 "E-06: a traverse was commenced by the 137th NY and extended about twenty yards (Greene 1893); the earlier 'no dimension' is replaced.",
 "E-08: Lockwood's brigade did not serve on Jul 2: it reached the First Division at 08:00 Jul 3 (own report); the 3rd Wisconsin threw down fences and walls in its front.",
 "E-09: 750 reinforcements = about 400 (Eleventh Corps) + about 350 (Wadsworth) (Eddy 1864); the 18:30 change is an occupation of existing works, not a construction; withdrawal clocks 18:30 (First Division) and 19:00 (Geary).",
 "E-11: Geary's 277,000 rounds confirmed in three scans; bombardment 03:30/03:45/04:00, ten minutes plus about fifteen.",
 "E-12: builders (battery crews on the artillery chief's order), window (dusk Jul 1 to morning Jul 2) and the word lunette (books, NPS) are now sourced.",
 "E-13: contradicted in part: the 83rd Pa. stood 'behind rocks and stones hastily thrown up' (OR27-1-R201).",
 "E-14: the OR does credit Weed's brigade (Garrard R217: 'At night ... building a stone wall'); Confederate reports (Benning R458, Waddell R462) saw two and three lines of stone breastworks built through the night of Jul 2-3.",
 "E-15: first fire 17:45 is unsupported; Hunt and Martin put it on arrival about 16:30; hauling method conflicts.",
 "E-17: the contradiction of the PDF is widened by unit and window (Jul 1 evening, Jul 2 morning and from 16:00, Jul 3 morning to 18:00); the 69th Pa. breastwork date is the morning of July 2 (page image of OR27-1 p.431; the Cornell OCR 'July 3' is a misread digit); WAVE 4 adds the 126th NY on Jul 2 from about 08:00 (Willson 1870).",
 "E-18: Confederate works are documented for Jul 2 (Middle Street barricade), the night of Jul 3-4 and Jul 4; Jul 2-3 at the other sites stays a gap.",
 "S-001: Jun 26 evening (Jacobs, Early's sequence); the bridge is the Rock Creek railroad bridge (Gettysburg Compiler, Jun 29, 1863); the page image confirms 'The [c]entre span of the bridge was burnt and [smeared] in': 'fell in' is not asserted.",
 "S-002: the building is a conflict (college steeple / Seminary building cupola / College cupola); WAVE 4: the Jul 1 morning post is the Seminary cupola (Bates quoting the signal officer, Toombs, NY monuments, Bachelder), the Jun 30 'steeple of the college' (Norton) a different event; S-005: 08:00 not 07:30, and 'McPherson Ridge' has no hit in OR 1-3 (McPherson's woods, barn, farm are the 1863 names); S-006: fences on both sides of the pike at the McPherson farm (Dawes, Fairfield, Sullivan) with the type in conflict; S-009: Union troops tore the fences down (NPS), then Confederates used the rails in entrenchments; S-010: 3,108 rails lost (Schmucker); S-012: holes in walls and a rebuilt northeast corner (NPS), 'struck by a number of shells and balls' (Adams Sentinel, 21 Jul 1863).",
 "WAVE 4 (2026-11-14), rows whose verdict or evidence changed: S-003 gap -> partially_supported (NPS Historic Structures Report: Jun 30 evening, a quarter mile of post and rail fence cut down by Buford's cavalry, rails burned); S-004 unsupported -> corrected (a Presbyterian church was a hospital on Jul 1 after noon, 8th Illinois Cavalry; Jun 30 only on the marker page); S-008 unsupported -> partially_supported (Catholic church hospital documented Jul 2-5; 'by noon Jul 1, pews removed' not); S-016 (Eleventh Corps hospital at the Spangler farm documented; the opening hour not); S-007 (95th NY inscription: 10:50 a.m. for the advance to the cut); E-01 (curved plan, overrun hour carried as three clocks); E-02/S-014 (24th Michigan's line on Culp's Hill 'the first night of the battle'); E-11 (5th Maine battery history: 'until 10 a. m.'); E-12 (builder, fabric and hour in conflict); E-13 (44th NY small breastwork; a veteran says the 16th Michigan's breastworks came on the night of Jul 3); E-14 (91st Pa., 140th NY, 146th NY, Hamilton 1892, a Confederate hearing rock works go up at dark); E-18 (NPS list of 1863 Confederate defenseworks).",
 "E-01: builder (Paul's First Brigade), window (about 11:00-13:00), 22 guns (Hunt), fence rails (Maine adjutant, NPS) are now sourced; WAVE 4: the curved plan is sourced as a conflict of form (Small 1886 circular, Toombs 1888 semicircular, against McFarland's line through the west edge of the grove) and the overrun hour as three clocks; the 600 yd length remains unsupported.",
 "E-13 (WAVE 4): the 44th NY's small breastwork (Nash 1911 via NPS) contradicts the earlier 'silence only'; E-14 (WAVE 4): the 91st Pa., 140th NY and 146th NY add builders on the slope, and a veteran's letter of 1892 puts Crawford's division's work at the 16th Michigan's front on the night of Jul 3.",
 "E-02/E-03: Dawes 1890 confirms the spades and the lack of orders; Morhous 1879 confirms the 123rd NY built on the morning of Jul 2 and worked until late afternoon."]:
    A('- ' + t)
A('')
A('## Blocked web sources (status blocked_host): URL and what to read')
A('')
A('Tested 2026-11-13 and again 2026-11-14, one request each each time: historynet.com, hmdb.org, museum.dmna.ny.gov, gettysburgdaily.com, aleteia.org, emergingcivilwar.com, gettysburg.stonesentinels.com, battlefields.org, en.wikipedia.org all answer "CONNECT tunnel failed, response 403" from the egress proxy; blocked, not worked around. Nothing below was asserted from memory. Where the repository records a URL it is given; where it does not the entry says so and gives the title.')
A('')
grp = collections.OrderedDict()
for r in rows:
    for b in r['blocked_host']:
        g = grp.setdefault((b['source_key'], b['url']), dict(what=[], rows=[]))
        if b['what_to_read'] not in g['what']: g['what'].append(b['what_to_read'])
        rid = r['id'].replace('R14.', '')
        if rid not in g['rows']: g['rows'].append(rid)
for (k, u), g in grp.items():
    A('- **%s** (%s): %s Rows: %s.' % (k, u or 'URL not recorded', ' / '.join(w.rstrip('.') + '.' for w in g['what']), ', '.join(g['rows'])))
A('')
A('## Product consequence')
A('')
A('One request note for the world-content workstream: `GOVERNANCE/horde/requests/bt-evidence-fence-1-world-content.md` (structures.json, state_schedule.json, works_stages.json and data/works3d.json entries that change, with tier, clock and source per change). No product file was touched by this shard.')
A('')
A('## Open gaps (registered as proposed entries fence-1-EG-01..19)')
A('')
for r in rows:
    if r['stays_unsupported'] and r['id'] != 'R14.0000':
        A('- %s: %s' % (r['id'].replace('R14.', ''), '; '.join(r['stays_unsupported'])))
A('')
A('## Delegated decisions recorded')
A('')
A('DD-FENCE1-01..20 (2026-11-13) and DD-FENCE1-21..29 (2026-11-14, sections headed "bt-evidence, shard fence-1" and the table added later that day) appended to `GOVERNANCE/decisions/DELEGATED-DECISIONS-2026-11-11.md`. Every alternative stays selectable; nothing written to decision_log.md.')
A('')
A('## Not run, owed, owner-only')
A('')
A('- No gate was run, no `passes` flag touched, no product or governance data file other than my own outputs, the request note, the delegated-decision rows and the progress line was changed; nothing committed or deployed.')
A('- Owed (closed in wave 4): the page images of OR27-1 p.431 and p.856 and of the Compiler bridge passage (looked at; see `image_checks.json`).')
A('- Owed: the Adams Sentinel page of 21 Jul 1863 (S-012: the OCR of the sentence on the shells and balls is garbled after the first words) and the printed monument inscription of the 95th NY (S-007: the OCR is garbled around the hour 10:50 a. m.) as page images; reading the blocked web pages listed above from a machine with access; the footnote-sources quoted by the NPS reports (Nash 1911, Hazen 1894, Brainard 1915, the Hamilton letter, Fairfield 1998, Sullivan 1993) in their own books; the damage claim of the tenant Slentz that the NPS Historic Structures Report footnotes for the S-003 fence statement, and the passage of Hall 1908 that the same page cites (not found in the local text).')
A('- Owner-only acts: none needed for this shard (reading web pages is not an owner-only act; the PDF text itself is not changed here: the E-17, E-03 and E-04 wording is the owner\'s decision).')
A('')
A('## Earlier passes (kept for history)')
A('')
A('The pass of 2026-11-04 (results.jsonl, unchanged) read only the local OCR and found 24 verified, 5 inferred, 5 failed lookups; its audit of 2026-11-04 could not re-run or_find because the OR text was missing from that checkout. All of its citations were re-matched in this close-out; the statements it got wrong or left open are listed above.')
open(os.path.join(G, 'horde/fence-1/REPORT.md'), 'w', encoding='utf-8').write('\n'.join(lines) + '\n')

# request note
N = []
B = N.append
B('# Request to bt-world-content: structures, schedule and works changes from the fence-1 evidence close-out')
B('')
B('From: bt-evidence (shard fence-1). Date: 2026-11-13, revised 2026-11-14 (wave 4: S-003, S-004, S-008, S-016, E-01, E-02, E-04, E-11, E-12, E-13, E-14, E-17, E-18, S-002, S-005, S-006, S-007, S-012, S-014 changed). Files you own and this note asks you to change: `docs/battle-theatre/structures/structures.json`, `state_schedule.json`, `works_stages.json`, `app/data/works3d.json` (and the scenario/default files that read them). I changed none of them.')
B('')
B('Why: `GOVERNANCE/evidence_corrections/fence-1.jsonl` re-checked every citation of rows R14.E-01..E-18 and S-001..S-016 against the Official Records and added exact evidence; several rows now contradict the PDF-seeded records. Each change below names the row, the new value, its tier and the source; the quotes, report ids, pages and offsets are in the jsonl. Keep every PDF value as a selectable scenario; the defaults below are recorded as DD-FENCE1-xx in the delegated decisions.')
B('')
B('The exact changes, by record:')
B('')
for r in rows:
    if not r['product_consequence'] or r['id'] == 'R14.0000': continue
    refs = ', '.join(r['structures_refs']) if r['structures_refs'] else '-'
    B('### %s (records: %s) - verdict %s' % (r['id'], refs, r['verdict']))
    B('')
    for c in r['product_consequence']:
        B('- ' + c)
    B('')
B('## Cross-cutting rules')
B('')
B('- No 1863 profile from rebuilt works: the Culp\'s Hill earthworks (1882), Rowley\'s (1887), Caldwell\'s (1891), the East Cemetery Hill lunettes (1878), Stevens Knoll (1880-90), McGilvery\'s and Poague\'s lunettes and the Little Round Top stone walls are reconstructions (NPS). Dimensions of every work are a marked plausible-procedural gap (register fence-1-EG-19).')
B('- Pre-existing walls and fences get no construction animation (Company B wall at Little Round Top, 95th Pa. wall, Cemetery Ridge walls, the stone fences of Cemetery Hill).')
B('- Where a clock is a window, the default is the documented window, never a point (delegated-decision method (2): where the OR supports several values the default is a window, not a point); the two clocks of the sides differ by about 20 minutes and no correction is applied.')
B('- Arrival ledger: every change uses the unit\'s own reported clock; where that clock is earlier than the PDF arrival window (the 83rd Pa. at 14:30 against 15:30-16:00 for Vincent\'s brigade) the ledger is not changed here and the conflict is carried; applying gate Q04 to these entries is for the owners of the arrival data.')
open(os.path.join(G, 'horde/requests/bt-evidence-fence-1-world-content.md'), 'w', encoding='utf-8').write('\n'.join(N) + '\n')
print('REPORT.md', len(lines), 'lines; request note', len(N), 'lines')
