"""Post-build steps for the tl-02 close-out (run after build2.py --write):
  python3 -I tmp/tl-02/post.py        updates the older proposed-register entries, writes REPORT.md, lookups.jsonl, astro evidence files
Idempotent: markers stop a second append."""
import os, re, sys, json, shutil, collections
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
G = os.path.join(ROOT, 'docs', 'battle-theatre', 'GOVERNANCE')
SH = os.path.join(G, 'horde', 'tl-02')
MARK = 'CLOSE-OUT UPDATE 2026-11-13'

cnt = json.load(open(os.path.join(SH, 'counts.json'), encoding='utf-8'))
corr = [json.loads(l) for l in open(os.path.join(G, 'timeline_corrections', 'tl-02.jsonl'), encoding='utf-8')]
by = {c['id']: c for c in corr}

# ------------------------------------------------------------------------------ older proposed-register entries
UPD = {
 '001': ('Six hours for first contact are now carried as selectable scenarios with sources: about 05:30 (9th New York exchange of shots, Cheney 1901 / Hall 1908), 07:30 (Lt. Jones, stone and Beveridge 1891), about 08:00 (Gamble, Calef), about 08:30 (Capt. Buck, Beveridge), 08:00-09:00 (Pleasonton), 09:30 (Jacobs 1864; Buford 3.20 p.m.). Calef 08:00 / 09:00 / 09:55; Hall relief window 10:00-10:45 and Hall\'s retirement about 11:10. Detail: tl-02-CO-T1-082, -084, -089, -090, -094, -106.',
         'Illinois Monuments (1892), Cheney (1901), Hall (1908), Jacobs 1864 read locally, Weld diary; searches logged in horde/tl-02/search_log.jsonl.'),
 '002': ('Jones is now documented as a claim in the Illinois Monuments report (monument inscription; Maj. Beveridge\'s 1891 address; Jones\'s own stone, 7:30 a.m.); the 9th New York corporal claim (about 5:30) is in Cheney 1901 and Hall 1908; Beveridge records 17th Pennsylvania and 6th New York claims and rejects them. All carried as scenarios. Detail: tl-02-CO-T1-083.',
         'Illinois Monuments (1892), Cheney (1901), Hall (1908), Hard (1868, no Gettysburg first-shot text).'),
 '003': ('Cupola: Bachelder (1873, 1889), the New York commission volume 1, Battles and Leaders caption, Toombs (1888) and Pennsylvania at Gettysburg (1914) support Buford in the seminary cupola as later narrative; Jerome with Buford is documented (Buford p.930, Brown 1896); Jerome\'s own 1865 account is still not found. Reynolds\'s message to Meade is documented by the Weld diary (delivered 11.20, left about 10:00). Detail: tl-02-CO-T1-086, -091, -092, -093, -111.',
         'Bachelder, New York at Gettysburg, Battles and Leaders, Toombs, Brown, Weld, Jacobs 1864.'),
 '004': ('Herr\'s Ridge is documented by Bachelder (1873) as the Confederate gun position; no hour found. Lull: Heth "one hour or more"; McFarland (151st Pennsylvania) "firing ceased for perhaps an hour, then about noon". Detail: tl-02-CO-T1-095, -113.', 'Bachelder 1873/1889, OR27-1-R060.'),
 '005': ('Hours now carried as scenarios: Eustice (7th Wisconsin, Battles and Leaders) "about noon"; Doubleday\'s article (meets Burns east of the seminary while bringing up the rear divisions); no source gives 10:15-10:30. Detail: tl-02-CO-T1-100.', 'Battles and Leaders, Haskell, state volumes.'),
 '006': ('Beveridge (1891): Gamble\'s brigade encamped in "the little valley between this ridge and Seminary Ridge", 8th Illinois south of the pike, 12th Illinois, 3d Indiana and Calef\'s battery north of it; the "hollow" is plausibly this valley (inferred). Jacobs: Buford\'s cavalry at the McPherson farm. Detail: tl-02-CO-T1-062, -063, -067.', 'Illinois Monuments (1892), Jacobs 1864.'),
 '007': ('PROPOSED CLOSED: Biddle (1880) names "Fahnestock\'s observatory" as the building Howard used; detail tl-02-CO-T1-102.', 'Biddle (1880) read locally.'),
 '008': ('PROPOSED CLOSED: the New York commission volume 2 (76th New York address) has the 95th New York and 14th Brooklyn ordered to the left to support Hall\'s battery, which stood north of the pike, and going into position between McPherson\'s farm buildings and the woods (south of the pike). Detail: tl-02-CO-T1-097.', 'New York at Gettysburg vol. 2.'),
 '009': ('Batch updated: T1-061 date conflict is now a two-scenario row (Meade 1913 "written late on the night of June 30" against the heading and Meade\'s report, Jul 1): tl-02-CO-T1-061; T1-074 receipt hour: tl-02-CO-T1-074; T1-098 list closed (5th Alabama Battalion added, OR27-2-R424), hour open: tl-02-CO-T1-098; T1-115 brigade hours noon-1 p.m. (Daniel, Doles, Owens) with Lee\'s about 2:30 p.m. (OR vol. 27 pt. 2, p.317) carried as a second hour: tl-02-CO-T1-115; T1-060 and T1-109: tl-02-CO-T1-060, -109.', 'OR27-2-R424, R506, R507, R511, R514; Meade 1913.'),
 '010': ('Stuart paroled his prisoners at Brookeville (Jun 28 night) and Cooksville (Jun 29), not Dover (OR27-2-R565 p.694); Alexander (1907) and Meade (1913) agree on the morning of Jul 1. 20 miles, 02:00, 200+ paroles and 1,000+ horses remain unsupported. Detail: tl-02-CO-T1-065, -069.', 'Alexander 1907, Meade 1913, library search for Dover.'),
 '011': ('Jacobs 1864 and the 1888 printing were searched locally: no "very cloudy" and no temperature. Added: Weld (muggy, roads very bad at 8 a.m.; mizzly rain Jun 30), Beveridge (no cloud at sunrise, dust cloud on the pike). Detail: tl-02-CO-T1-075, -080.', 'Jacobs 1864 and 1888, Weld, Beveridge.'),
 '012': ('CLOSED AT REGULATION LEVEL (proposed): the U.S. Cavalry Tactics (1841, reprinted 1855) prescribe "Nos. 4, of each rank, will remain mounted" and hold the dismounted horses (one in four); Beveridge records the 8th Illinois pickets fighting on foot with horses sent to the rear; a 1910 study of the Chancellorsville campaign (a second book bound at the end of the archive.org item of New York at Gettysburg vol. 2; it is not a report of the Gettysburg campaign) says the Federal cavalry generally had Smith\'s and Sharps\' carbines. Open: whether Gamble\'s regiments applied the rule on Jul 1, the carbine mix per regiment. Detail: tl-02-CO-T1-085.', 'Cavalry Tactics 1841 and 1855 (acquired), Illinois Monuments, The Campaign of Chancellorsville (1910; bound into the New York vol. 2 item).'),
 '013': ('Barton (1898) and Stoever (Christian Commission, 1868) document the Catholic church as a hospital after the battle (painting of St. Francis Xavier; soldiers on the pew seats); twelve Sisters, not fourteen. Not found: the Jul 1 noon date, amputations, boards on pews. Detail: tl-02-CO-T1-114.', 'Barton 1898, Smith 1868, Hospital Scenes 1864.'),
}
for k, (desc, ev) in UPD.items():
    p = os.path.join(SH, 'proposed-register', 'tl-02-EG-%s.md' % k)
    t = open(p, encoding='utf-8').read()
    if MARK in t:
        continue
    t = re.sub(r'^(\| Description \| )(.*)( \|)$', lambda m: m.group(1) + m.group(2) + ' ' + MARK + ': ' + desc + m.group(3), t, count=1, flags=re.M)
    t = re.sub(r'^(\| Evidence searched \| )(.*)( \|)$', lambda m: m.group(1) + m.group(2) + ' ' + MARK + ': ' + ev + m.group(3), t, count=1, flags=re.M)
    if k in ('007', '008', '012'):
        t = re.sub(r'^\| Status \| open \|$', '| Status | open (proposed closed or narrowed by the close-out evidence; owner or integrator decides) |', t, count=1, flags=re.M)
    open(p, 'w', encoding='utf-8', newline='\n').write(t)

# ------------------------------------------------------------------------------ astro evidence copy
for fn in ('astro_check.py', 'astro_check.json'):
    shutil.copyfile(os.path.join(HERE, fn), os.path.join(SH, fn))

# ------------------------------------------------------------------------------ lookups.jsonl
lk = os.path.join(SH, 'lookups.jsonl')
have = [json.loads(l) for l in open(lk, encoding='utf-8') if l.strip()]
if not any(x.get('id') == 'L8' for x in have):
    man = json.load(open(os.path.join(SH, 'sources_tl02.json'), encoding='utf-8'))
    n = 8
    with open(lk, 'a', encoding='utf-8', newline='\n') as f:
        for it in man['items']:
            f.write(json.dumps(dict(id='L%d' % n, tool='archive.org text layer', query_or_url=it['text_url'], outcome='ok',
                                    note='%s: %d bytes, sha256 %s; searched locally; quotes re-matched by tmp/tl-02/build2.py' % (it['id'], it['bytes'], it['sha256'][:16])), ensure_ascii=False) + '\n'); n += 1
        for fl in man.get('failed', []):
            f.write(json.dumps(dict(id='L%d' % n, tool='archive.org text layer', query_or_url=fl['archive_identifier'], outcome='failed', note=fl['outcome']), ensure_ascii=False) + '\n'); n += 1
        f.write(json.dumps(dict(id='L%d' % n, tool='archive.org advanced search', query_or_url='title:(cavalry tactics) AND mediatype:texts AND date:[1859 TO 1865]; broader cavalry-drill query', outcome='ok',
                                note='candidate identifiers listed, texts downloaded as L8 onward'), ensure_ascii=False) + '\n')

# ------------------------------------------------------------------------------ REPORT.md
old = os.path.join(SH, 'REPORT.md')
pre = os.path.join(SH, 'REPORT.pre-closeout.md')
if not os.path.exists(pre):
    shutil.copyfile(old, pre)


def ids(v):
    return ', '.join(v) if v else 'none'


rb = cnt['rows_by_verdict']
nv = cnt['verdict_of_rows_not_verified_before']
vb = cnt['verdict_of_rows_verified_before']
sc_rows = cnt['rows_with_scenarios']
tv = cnt['tier_vs_seed']
gaps = [c['id'] for c in corr if c['verdict'] in ('gap', 'unsupported')]
partial = rb['partially_supported']
regs = sorted(f[:-3] for f in os.listdir(os.path.join(SH, 'proposed-register')) if f.startswith('tl-02-CO-'))
_cs = [(l['id'], c) for l in corr for c in l['citations'] if c['source_id'] != 'COMPUTED']
_or = [c for _, c in _cs if c['source_id'] == 'OR27']
_lib = [c for _, c in _cs if c['source_id'] != 'OR27']
_or_diff = sum(1 for c in _or if c.get('page_running_head_model'))
_or_img = sum(1 for c in _or if (c.get('scan') or {}).get('printed_page_read_on_image'))
_or_leaves = len({(c['part'], c['scan']['leaf']) for c in _or if c.get('scan')})
_lib_diff = sum(1 for c in _lib if c.get('page_running_head_model'))
_lib_nopage = [c['source_id'] + ' ' + c['key'] for c in _lib if c.get('printed_page') in (None, '', 'None')]
_lib_scan = sum(1 for c in _lib if c.get('scan'))
lines = []
A = lines.append
A('# REPORT shard tl-02 (rows T1-058 to T1-115, 58 rows), close-out of 2026-11-13 with the second reading of 2026-11-15 and 2026-11-16')
A('')
A('Scope: every row of the shard now has a line in GOVERNANCE/timeline_corrections/tl-02.jsonl (verdict, corrected claim, sub-claims with tier, citations with report id, printed page, verbatim quote and text offset, scenarios, what stays unsupported, every search run with its hit count). The shard file results.jsonl carries the findings (the file as it stood before is kept as results.pre-closeout.jsonl; the earlier report as REPORT.pre-closeout.md). Nothing outside the shard\'s ownership was edited except the lines appended (shell >>) to decisions/DELEGATED-DECISIONS-2026-11-11.md and GOVERNANCE/progress.md; requests for other files are in GOVERNANCE/horde/requests/bt-timeline-tl-02-corrections.md and bt-timeline-tl-02-second-reading.md.')
A('')
A('## What was run')
A('- build: `python3 -I tmp/tl-02/build3.py --write` (the writer `write_all()` of tmp/tl-02/build2.py, re-using the search results of the last full run for every unchanged search; `build4.py --write` is the same writer with the search phase done incrementally by source, see the next point): %d quoted citations re-matched verbatim in the local text (Official Records vol. 27 parts 1-3 by report id and printed page; library and acquired texts by offset; the %d computed citations are not quotations and are checked by tmp/tl-02/astro_check.py) and %d searches listed (%s), each logged with its hit count in horde/tl-02/search_log.jsonl. A quote that is not found, is found in another report, or on another page stops the build; none was left unmatched.' % (cnt['citations'] - cnt['citations_by_source'].get('COMPUTED', 0), cnt['citations_by_source'].get('COMPUTED', 0), cnt['searches_run'], ('executed' if not cnt.get('searches_not_run') else 'NOT YET EXECUTED in this build: hit counts pending')))
A('- provenance of the final files: the search phase ran in full under the machine lock on 2026-11-13 (135 searches; the log that stood at the start of the second reading held 136). On 2026-11-15 the corpus gained two texts (a 1989 U.S. Army War College study and the American Ephemeris for 1863); a write through the machine lock (`tools/horde/bench.sh python3 -I tmp/tl-02/build4.py --write`) waited more than half an hour in a queue of 38 to 48 jobs without receiving a slot; the job was therefore measured (about 18 s of CPU, below the "about 30 s" threshold of the lock rule) and `nice -n 10 python3 -I tmp/tl-02/build4.py --write` was run directly (log tmp/tl-02/write6.log, CPU seconds for the whole write 18.3), the queued copy being killed afterwards; it took the hit counts of the 136 unchanged searches from the log of 2026-11-14 and added the hits found in the two new texts only (hit counts are additive over sources; 4 of the old searches were also run in full over the whole corpus and gave identical counts: build4.py --verify 4, 0 mismatches), and ran the %d new or changed searches over the whole corpus (%d searches in all). Afterwards `nice -n 10 python3 -I tmp/tl-02/build3.py --write` (no search left to run; a short job) rewrote the files once more after the printed pages of 24 further Official Records leaves had been read on the page image. Every citation is re-matched in the local text at every write.' % (cnt['searches_run'] - 136, cnt['searches_run']))
A('- audit of 2026-11-13/14 (page numbers): the printed pages of the Official Records come from the scan leaf of each citation (archive.org page index aligned to the OCR text, tools/bt/kit_or27_leafmap.py), not from the running-head model of the OCR text (tools/bt/or27_pages.py), which loses its heads on tabular pages and interpolates. The printed page of all %d leaves cited was read on the page image (%d citations; horde/tl-02 citations carry `scan` with leaf and PDF page; list in horde/tl-02/closeout/audit/viewed_leaves.json). The running-head model gave another page for %d citations (kept as `page_running_head_model`; for example the organization of the Army of Northern Virginia, Heth\'s division, is on printed page 289 and not on the interpolated 284-285; Cutler\'s report passages are on 281-282, not 280). Library pages: decided per citation in horde/tl-02/library_pages.json (the page printed at the top of the scan leaf, checked against the item\'s own page index, hand decisions with their reasons; %d citations carry the leaf, %d differ from the first running-head model).' % (_or_leaves, _or_img, _or_diff, _lib_scan, _lib_diff))
A('- review pass of 2026-11-14 (reading every non-verified row and a sample of the others against the source text): quotes that were shorter than the claim they carry were extended to the verbatim passage that covers it (26 rows with quotes extended or covering citations added, new Official Records passages included: T1-062, 067, 071, 074, 078, 079, 081, 083, 084, 085, 086, 088, 089, 091, 094, 095, 097, 098, 099, 100, 102, 103, 108, 109, 110, 112); new Official Records passages were added (Howard p.701 and the Army itinerary p.144 for the Jun 30 positions of the I and XI Corps in T1-067, with the conflict against Jacobs carried as two scenarios; Howard p.696 for the start of Reynolds\' attack at about 10.45 in T1-098, beside Doubleday\'s 10.15); a misread idiom (a hot day\'s fight is a figure for hard fighting, not a temperature) was removed from T1-080; the Chancellorsville book bound into the New York vol. 2 item is no longer cited as that volume (T1-085); stale page statements were replaced. Independent checks that were run on the written files: tmp/tl-02/verify_out.py (every stored offset re-read), tmp/tl-02/audit/audit_strict.py (exact span, sha256, report id and page re-derived from the offset by the scan leaf map), tmp/tl-02/audit/numcheck.py and overlap.py (heuristics that list claims whose numbers or words are not in their quotes; read by hand, not gates).')
_bak_p = os.path.join(ROOT, 'tmp', 'tl-02', 'ver2', 'backup-20261115', 'out', 'tl-02.jsonl')
_chg = []
if os.path.exists(_bak_p):
    _bak = {json.loads(l)['id']: json.loads(l) for l in open(_bak_p, encoding='utf-8')}
    _chg = [c['id'] for c in corr if json.dumps(c['sub_claims'], sort_keys=True) != json.dumps(_bak[c['id']]['sub_claims'], sort_keys=True) or json.dumps(c['citations'], sort_keys=True) != json.dumps(_bak[c['id']]['citations'], sort_keys=True)]
A('- second reading of 2026-11-15 and 2026-11-16 (a second engineer\'s pass over the finished close-out; nothing of the first pass was redone; %d rows changed: %s): (a) every supported sub-claim was checked for numbers and names that are in neither its quotation nor the 700 characters around it (tmp/tl-02/ver2/tokcheck.py), and quotations that were shorter than the claim they carry were extended or covering citations added; (b) Jerome\'s own letter of 18 Oct 1865 to Maj. Gen. Hancock (the account that rows T1-092 and T1-093 name and that the first pass could not find) was found, printed in a 1989 U.S. Army War College study (DTIC ADA207999, a U.S. Government work; the printed pages 8 to 10 and the PDF pages read on the page images): it places Buford in the steeple of the Theological Seminary with Jerome, names Jerome as the observer who saw the First Corps by its corps flag, and (with the study) names Pennsylvania Hall; rows T1-086, 092, 093 and 111 now rest on it and T1-092, T1-093 and T1-111 are documented (as Jerome\'s claim, second-hand print; the original in the Bachelder Papers was not seen) where they were inferred; (c) the official return of casualties (OR vol. 27 pt. 1 p.173, which the OCR text splits into columns) was read on the page image: Cutler\'s brigade 1,002 casualties for the whole battle, the 147th New York 296, every row and column of the block summing to its printed total (T1-103; the row\'s 454 of 1,007 stays unsupported); (d) hour statements of sources that were already local and had not been used were added as sub-claims and selectable scenarios, none made a default: Jacobs 1864 (hours read on the page images), New York at Gettysburg vol. 1, Cheney 1901, Tillie Pierce, Beveridge, Meade 1913 and regimental and brigade reports of the Official Records (march hours of the First Corps regiments, arrival hours of the First and Third Divisions, Cutler\'s brigade, Rodes\'s brigades, Anderson\'s division, the midday lull); (e) the almanac of the period (The American Ephemeris and Nautical Almanac for 1863, acquired from archive.org) lists the full moon of Jun 30 (astronomical day) at 18 h 46.0 m, which is Jul 1 06:46.0 UT civil, the instant computed for T1-068; all five phases on its page agree with PyEphem to within 0.3 minute (astro_check.json); (f) the second-OCR numerals check that the first pass could not run was run (last section).' % (len(_chg), ', '.join(i[-3:] for i in _chg)))
A('- build sources: tmp/ is not committed, so a snapshot of every script and row file used (tmp/tl-02) is kept in horde/tl-02/closeout/ with a README (how to rebuild from it); the acquired texts are listed with sha256 in sources_tl02.json and are fetched again from archive.org by their identifiers.')
A('- citations by source: %s.' % json.dumps(cnt['citations_by_source'], ensure_ascii=False))
A('- texts added for this close-out from archive.org (text layer): 22 (the first 20 on 2026-11-13, public domain by age; on 2026-11-15 the 1989 U.S. Army War College study DTIC ADA207999, a U.S. Government work, and the American Ephemeris and Nautical Almanac for 1863, an official U.S. Navy publication of 1861), listed with sha256 in horde/tl-02/sources_tl02.json (the first 20: Illinois Monuments at Gettysburg 1892, Cheney 1901, Hall 1908, Hard 1868, Weld 1912, Brown 1896, Barton 1898, Smith 1868, Bates 1875, Biddle 1880, Jacobs 1888, and the U.S. cavalry drill books). One download returned no text and is recorded as failed (lookups.jsonl).')
A('- computed rows (T1-068, 070, 075 sunrise, 067 clock offset) were recomputed with an independent library (PyEphem 4.2.1; horde/tl-02/astro_check.py and .json): full moon 01:37:09 LMT, moonrise Jun 30 19:01:18 (the row says about 19:10), moonset 04:59:05, twilights 02:33:01, 03:20:54, 04:02:10, sunrise 04:34:48. The repository ephemeris (docs/battle-theatre/environment/ephemeris_1863.json) agrees to within 0.1 minute (moonrise 19:01.30, moonset 04:59.09, twilights 02:33.02, 03:20.90, 04:02.17, sunrise 04:34.77). The U.S. Naval Observatory website (aa.usno.navy.mil) is refused by the egress proxy (403, 2026-11-15): blocked, not worked around; the almanac of the period was used instead for the full moon (see the second-reading bullet).')
A('')
A('## Counts')
A('- rows: %d; verdicts: %s.' % (cnt['rows'], json.dumps(cnt['verdict'])))
A('- the %d rows whose status_effective was not verified_against_or_text: %s.' % (cnt['rows_not_verified_before'], json.dumps(nv)))
A('- the %d rows already verified against the OR text: %s. A verified quote does not mean every sub-claim of the row is supported; where the shard notes already listed unsupported sub-claims the verdict is corrected or partially_supported, not confirmed.' % (cnt['rows'] - cnt['rows_not_verified_before'], json.dumps(vb)))
A('- sub-claims: %d; by tier %s; by support %s.' % (cnt['sub_claims'], json.dumps(cnt['sub_claims_by_tier']), json.dumps(cnt['sub_claims_by_support'])))
A('- results.jsonl after the close-out: tier %s; status %s.' % (json.dumps(cnt['results_tier']), json.dumps(cnt['results_status'])))
A('- status rule in results.jsonl: a row is stored `verified` only when its central (first documented) sub-claim is carried by an Official Records citation; a row that rests on other primary or published sources, or is only partly supported, is stored `inferred` (tier documented where the corrected claim is documented), so that merge_horde cannot label it verified_against_or_text. Rows lowered by this rule are visible by comparing results.pre-closeout.jsonl.')
A('- proposed register entries: %d new (tl-02-CO-<row>.md) plus the 13 earlier ones (tl-02-EG-001..013, each updated with a close-out paragraph, EG-001, 003 and 004 also with a paragraph of the second reading).' % cnt['proposed_register_entries'])
A('- searches with zero hits: %d of %d (a zero is a finding, kept in the log)%s.' % (cnt['searches_with_zero_hits'], cnt['searches_run'], ('; WARNING: %d searches were not run in this build, their hit counts are pending' % cnt['searches_not_run']) if cnt.get('searches_not_run') else ''))
A('')
A('## Verdict by row')
for v in ('confirmed', 'corrected', 'partially_supported', 'unsupported', 'gap'):
    A('- %s (%d): %s' % (v, len(rb[v]), ids(rb[v])))
A('')
A('## Source conflicts carried as selectable scenarios (no default picked)')
A('Rows with scenarios (%d): %s.' % (len(sc_rows), ids(sc_rows)))
A('The only default is the one already recorded as a delegated decision: C-040 (Reynolds\' death) on T1-099, window 10:15-11:15, applied unchanged; the new values found (about 10:00 and the 10:15 of the New York narrative; rifle volley and sharp-shooter; the 2nd Wisconsin and the 19th Indiana as the regiment) were added as scenarios. The first-contact hour (T1-082), first shot (T1-083), Pipe Creek date (T1-061), Hall relief and retirement, sky on Jul 1, Burns\'s hour, 147th New York losses, Rodes\'s hours (noon to 1 p.m. against Lee\'s 2:30 p.m.), the hour at which Howard took command (11:30 against 10:30), the regiment beside Reynolds, the Jun 30 position of the XI Corps (T1-067: Emmitsburg per Howard OR p.701 and Beveridge, Marsh Creek per Jacobs) and the hour at which Reynolds\' attack began (T1-098: about 10.15 per Doubleday and Wadsworth, about 10.45 per Howard OR p.696) have no recorded default and none was picked. The recorded default C-041 (Rodes\' attack start) concerns the infantry attack, not the arrival and first fire of T1-115, so it is not applied there.')
A('')
A('## Gap, unsupported and partial rows (proposed register entries)')
A('Rows left gap or unsupported: %s. Rows partially supported: %s.' % (ids(gaps), ids(partial)))
A('Proposed entries: %s.' % ', '.join(regs))
A('Entries that update an existing register entry carry "proposed update of EG-TL-T1-0xx" in the title (T1-066, 067, 071, 073, 104).')
A('')
A('## Tier relative to the seed (overlay, seed rows untouched)')
A('Promotions proposed: %s. Demotions against the seed: %s. Unchanged: %d rows. A promotion applies only to the corrected wording and needs the delegated-decision block DD-TL02-01 (appended to decisions/DELEGATED-DECISIONS-2026-11-11.md) or an owner decision; every unsupported remainder keeps its own tier and register entry.' % (ids(tv['promotion']), ids(tv['demotion']), len(tv['unchanged'])))
A('')
A('## What is not done or owed')
A('- Second-method re-read of the OCR-damaged digits: run on 2026-11-15 (tools/horde/bench.sh python3 -I tmp/tl-02/audit/ocr2.py: tesseract at 300 dpi on the scan page of every Official Records citation of the 2026-11-14 state, 222 citations; 11 flagged, all explained; report in horde/tl-02/closeout/audit/ocr2_report.txt). Confirmed: 12 m. (Wister), 13 horses (Calef), 10.15 and 10.45, and the numbers of the Mississippi and North Carolina regiments of Davis\' brigade (11th, 42d, 55th). Not digit differences: two "1st" read as "ist" and two decimal points read as commas. Tesseract misreads 2 1/2 (Daniel, p.566) as "24"; the page image, read by two readers, settles it as 2 1/2 miles and about 12 m. The page images of Jacobs 1864 (printed pages 21, 22, 23, 25: 9 1/2, 10 1/2, 11 1/2, 8 1/2) were read by a second reader. The Cutler table (p.173) is read by eye and by the sums of its rows and columns; tesseract reads it only in part (it gives 136 for 130). The OCR-damaged digits of the 2026-11-15 additions (for example "1,15 p. m." in Carr p.542, the "2i" of Lewis p.573) were included in no second run: the quotation is verbatim and the note says so. A second run over all 269 Official Records citations (the 47 added on 2026-11-15 and 2026-11-16 included) was queued under the machine lock on 2026-11-16 at 00:44 UTC (tools/horde/bench.sh python3 -I tmp/tl-02/audit/ocr2.py, output tmp/tl-02/audit/ocr2.log and ocr2_report.txt, the earlier report kept as ocr2_report.run1.txt) and had not started when this report was written; when its report exists, every flagged numeral is to be compared on the page image.')
A('- Library page numbers: %d citation(s) carry no printed page (%s: front matter without a page number); every other library page is decided in horde/tl-02/library_pages.json with its basis. Pages of the Official Records: see the audit bullet above; the running-head page model of tools/bt/or27_find.py is still wrong on tabular pages (request note).' % (len(_lib_nopage), ', '.join(_lib_nopage) or 'none'))
A('- Not found in any local text or by search: Jacobs\'s original meteorological table, Pegram\'s own report, Fry\'s 13th Alabama report, the Broadhead, Myers and McCreary diaries (archive.org title searches and a Project Gutenberg search of 2026-11-15 found none), a source for the row\'s brigade figure of Cutler (454 of 1,007), for the 20-mile Dover march, for the 7-mile cavalry front, for Buford\'s horse "Grey Eagle" (archive.org full-text search: no old text) and for a ladder from the attic to the cupola (one hit, in a book of 2006 that is not public domain: a lead, not read). Jerome\'s 1865 letter was found at second hand (the original in the Bachelder Papers of the U.S. Army Military History Institute was not seen). Hosts blocked or not tried: HathiTrust and eHistory (bot block, not retried), aa.usno.navy.mil (refused by the egress proxy).')
A('- Hours given as "inferred" are bounds derived from stated times (for example Weld\'s departure about 10:00 = 11.20 minus 1 h 20 min); none is a stated time.')
A('- Rendering or timing checks: none were needed for this data task.')
open(old, 'w', encoding='utf-8', newline='\n').write('\n'.join(lines) + '\n')
print('REPORT.md written;', len(lines), 'lines')
