"""Writes horde/tl-03/REPORT.md from the final files of the shard (second pass of the tl-03 close-out).
    python3 -I docs/battle-theatre/GOVERNANCE/horde/tl-03/closeout/post.py
Reads timeline_corrections/tl-03.jsonl, horde/tl-03/results.jsonl, closeout/counts.json, closeout/search_log.jsonl, library_pages.json, closeout/audit/viewed_leaves.json.
The earlier report (the integrity audit of 2026-11-04) is kept as REPORT.pre-closeout.md (copied once)."""
import os, json, collections, shutil, re
HERE = os.path.dirname(os.path.abspath(__file__))
G = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
SH = os.path.join(G, 'horde', 'tl-03')
rows = [json.loads(l) for l in open(os.path.join(G, 'timeline_corrections', 'tl-03.jsonl'), encoding='utf-8')]
res = [json.loads(l) for l in open(os.path.join(SH, 'results.jsonl'), encoding='utf-8')]
cnt = json.load(open(os.path.join(HERE, 'counts.json'), encoding='utf-8'))
slog = [json.loads(l) for l in open(os.path.join(HERE, 'search_log.jsonl'), encoding='utf-8') if l.strip()]
lp = json.load(open(os.path.join(SH, 'library_pages.json'), encoding='utf-8'))['entries']
vl = json.load(open(os.path.join(HERE, 'audit', 'viewed_leaves.json'), encoding='utf-8'))['leaves']
pre = os.path.join(SH, 'REPORT.pre-closeout.md')
if not os.path.exists(pre):
    shutil.copyfile(os.path.join(SH, 'REPORT.md'), pre)

FACTS = [
 "T1-121: the report of the Fourth Georgia (Maj. W. H. Willis, p.584) reads \"say at 12 o'clock\" on the page image (the OCR text prints 13); Doles gives about 1 p. m. for the brigade: two scenarios, the window starts at 12:00 (the first pass had 13:00).",
 "T1-144: Gordon moved slowly until within about 300 yards of the enemy's line (OCR \":>,()()\", page image 300); the first pass carried 200.",
 "T1-147: the revised return of casualties of the First Corps (OR p.173 and p.174, read on the page images) enters the 151st Pennsylvania with 337 (2 officers and 49 men killed, 9 and 202 wounded, 4 and 71 captured or missing) and the 24th Michigan with 363 (8 and 59, 13 and 197, 3 and 83); Morrow's own report (strength 496 with 24 line officers, losses 79 killed, 237 wounded, 316 in all, about 80 men and 3 officers missing) sums to about 399: carried as two scenarios.",
 "T1-129: the total row of Iverson's Brigade in the casualty return (p.342, page image) prints 130 killed, 328 wounded, 308 missing and an aggregate of 820; 130 + 328 + 308 is 766 and the four regiment rows total 455: the printed columns are inconsistent and nothing is corrected.",
 "T1-127: infantry and a second battery also built works on Jul 1 (Roath, 107th Pennsylvania, p.305: breastworks on the left of Cemetery Hill, occupied until next morning; Whittier, 5th Maine Battery, p.361: temporary earthworks during the night); the first pass had no infantry earthwork. The window now runs to the edge of the date.",
 "T1-169: corrected from an open-gap seed: Hard, History of the Eighth Cavalry Regiment, Illinois Volunteers (1868), pp.257-258: after noon the cavalry hospital at the depot came under fire, the wounded were moved to the Presbyterian church, and Surgeons Beck, Rulison and Vosburg stayed with them when Buford's order to fall back came; afternoon, not evening; no capture stated.",
 "T1-119, T1-128, T1-144: Herr's Ridge (Bachelder 1873: names given 'for convenience sake, not known by such before the battle') and Barlow's Knoll (Bachelder 1873, Ohio dedication volume 1887, a Pennsylvania address; the National Park Service has Blocher Knoll, later Barlow Knoll) are later names, not names of 1863.",
 "T1-153: the National Park Service McPherson farm study says Heth fell unconscious, hit on the left side of the forehead, the bullet penetrating to the bone (the duration is cut off in the text layer); the glancing bullet and the 24 hours stay unsupported.",
 "T1-148: a Pennsylvania casualty statement lists Colonel Stone among the wounded and his acting assistant adjutant-general among the captured, not Stone as captured.",
 "T1-164: Howard (p.704) and Meade (p.115) give about 7 p. m. for the arrival of Slocum and Sickles; Hancock gives between 5 and 6.",
 "T1-146: the window now starts at 11:00 (Wilkeson's battery came up about 11 a. m.: Hunt, Bancroft); T1-135: Doubleday p.256 also has Surgeons Heard and Bache staying with the wounded.",
 "Digits read on page images: 2 1/2 miles (T1-119, T1-126, T1-154; OCR 2h and 2^), 400 yards (T1-122; OCR 4t)0), 216 (T1-152; OCR 21G), the 24th Michigan table (T1-147).",
 "Pages: six stated pages of Official Records citations were corrected to the scan leaf (T1-116 p.914, T1-121 p.584, T1-143 and T1-145 p.164, T1-146 p.188, T1-149 p.582); library pages: Pennsylvania at Gettysburg vol.1 p.492 (not 491), New York at Gettysburg vol.1 p.21 for T1-167 (not 58), Fremantle p.254, Meade's Life and Letters p.56.",
]
OWED = [
 "The second-OCR comparison of the numerals of every Official Records quote (tmp/tl-03/audit/ocr2.py, started under the machine lock at 00:44 on 2026-11-14) had not run when this report was written: a digit that looks clean in the OCR text but is wrong (13 for 12 was found by hand, not by this comparison) is found only by it. Run `tools/horde/bench.sh python3 -I tmp/tl-03/audit/ocr2.py` and read tmp/tl-03/audit/ocr2_report.txt; until then the digit checks are those listed above (heuristic search for suspect tokens, and the passages read on page images).",
 "Only the header strip of each cited leaf (147 leaves) and the passages named above were looked at on page images; the rest of each cited page was not read on the image.",
 "Pages of National Park Service texts are the PDF page of the text layer (marked as such); one leaf of a short pamphlet (Ohio dedication volume 1887, T1-128) has no printed page number.",
 "Searched in the Official Records and the library and not found in any local text: the hours of Kilpatrick's and Merritt's moves on Jul 1 and Pleasonton's own position (T1-116); the arrival hour of each First Corps battery (T1-117); the hour at which Carter's battalion opened and any loss of Fry's battery at Gettysburg (T1-118); the hour of Pettigrew's and Brockenbrough's arrival (T1-119); Howard's 'a little after one' and the hour the Third Division entered the town (T1-120); Lee's arrival hour in the Official Records (T1-124); a strength of Iverson's and of Gordon's brigade (T1-129, T1-144); the weather of Jul 1 from Jacobs (T1-132); Tillie Pierce's age (T1-139); counts of wounded at the Spangler farm (T1-140); the hour of Paul's wound (T1-141); the hours of the deaths of Fowler and Wilkeson (T1-146); Heth's 24 hours (T1-153); Perrin's 50-yard gap (T1-155); the 298 men and 35 of the 16th Maine (T1-161); where Schimmelfennig hid as a midden (T1-162); Coster's 313 captured (T1-166); Lauson of the 55th Virginia (T1-171); the Seminary hospital figures (T1-170). Each search is in search_log.jsonl and in the register entries.",
 "Hosts blocked or not served, not retried and not worked around: HathiTrust and eHistory (bot block); the HMDB markers 17936 and 17939 (the host did not serve the page): the owner may read them in a browser and send the text.",
 "No gate was run, no passes flag was touched, nothing was committed or deployed by this workstream.",
]

V = collections.Counter(r['verdict'] for r in rows)
seed_ver = {'verified_against_or_text': [], 'other': []}
before = {r['id']: r['before']['status_effective'] for r in rows}
nv = [r for r in rows if before[r['id']] != 'verified_against_or_text']
vv = [r for r in rows if before[r['id']] == 'verified_against_or_text']
Vnv = collections.Counter(r['verdict'] for r in nv); Vvv = collections.Counter(r['verdict'] for r in vv)
subs = [s for r in rows for s in r['sub_claims']]
st = collections.Counter(s['tier'] for s in subs); ss = collections.Counter(s['support'] for s in subs)
cites = [c for r in rows for c in r['citations']]
cs = collections.Counter(c['source_id'] for c in cites)
n_or = cs['OR27']; n_comp = cs['COMPUTED']; n_lib = len(cites) - n_or - n_comp
model_diff = [(r['id'], c['key']) for r in rows for c in r['citations'] if c.get('page_running_head_model')]
img_or = sum(1 for r in rows for c in r['citations'] if c['source_id'] == 'OR27' and (c.get('scan') or {}).get('printed_page_read_on_image'))
ic = [(r['id'], c['key']) for r in rows for c in r['citations'] if c.get('image_check')]
by_v = {v: [r['id'] for r in rows if r['verdict'] == v] for v in ('confirmed', 'corrected', 'partially_supported', 'unsupported', 'gap')}
scn = [r['id'] for r in rows if r['scenarios']]
dflt = [(r['id'], (r['default'] or {}).get('scenario')) for r in rows if r['default']]
rt = collections.Counter(r['tier'] for r in res); rs = collections.Counter(r['status'] for r in res)
regs = sorted(f[:-3] for f in os.listdir(os.path.join(SH, 'proposed-register')) if f.startswith('tl-03-CO-'))
tc = collections.Counter()
for r in rows:
    t = r['tier_change']
    tc['promotion' if t['note'].startswith('promotion') else ('demotion' if t['note'].startswith('demotion') else 'unchanged')] += 1
prom = [r['id'] for r in rows if r['tier_change']['note'].startswith('promotion')]
dem = [r['id'] for r in rows if r['tier_change']['note'].startswith('demotion')]
zero = sum(1 for e in slog if not sum(v for k, v in (e.get('hits') or {}).items() if not k.startswith('_')))
second = [e for e in slog if e.get('pass')]
leaves = sorted(set((c['part'], c['scan']['leaf']) for r in rows for c in r['citations'] if c['source_id'] == 'OR27' and c.get('scan')))
md = []
A = md.append
A('# REPORT shard tl-03 (rows T1-116 to T1-172, 57 rows), close-out of 2026-11-13 and second pass of 2026-11-14')
A('')
A('Scope: every row of the shard has a line in GOVERNANCE/timeline_corrections/tl-03.jsonl (verdict, corrected claim with its time window and basis, tier change against the seed, sub-claims with tier, citations with report id, printed page, verbatim quote and text offset, scenarios, what stays unsupported, every search with its hit count). The shard file results.jsonl carries the findings (the file as it stood before the close-out is kept as closeout/results.pre-closeout.jsonl, the earlier report as REPORT.pre-closeout.md). Nothing outside the shard\'s ownership was edited except the lines appended (shell >>) to decisions/DELEGATED-DECISIONS-2026-11-11.md and GOVERNANCE/progress.md; requests for other files are in GOVERNANCE/horde/requests/bt-timeline-tl-03-corrections.md.')
A('')
A('## What was run')
A('- build: `python3 -I docs/battle-theatre/GOVERNANCE/horde/tl-03/closeout/build.py` re-matches every quote verbatim in the local text (Official Records vol. 27 parts 1-3 by report id and printed page; library, National Park Service and acquired texts by offset) and stops if a quote is not found, is found in another report, or on another printed page. %d citations in the final files: %d Official Records, %d library and National Park Service texts, %d computed.' % (len(cites), n_or, n_lib, n_comp))
A('- first pass (2026-11-13): the 57 rows were corrected from the shard rows and the recheck findings (OR-RECHECK-2 for this shard: not_found 10, not_supported 1, supported 7, supported_partial 39; OR-RECHECK has no quote line for tl-03 because the shard rows carried no quote field), with 543 citations and 58 logged searches.')
A('- second pass (2026-11-14): (1) page rule: the printed page of an Official Records citation is the printed page of its scan leaf (archive.org page index aligned to the OCR text, tools/bt/kit_or27_leafmap.py), not the running-head model of the OCR text; the header of every cited leaf (%d leaves) was read on the page image (closeout/audit/viewed_leaves.json, 0 mismatches against the leaf map); the running-head model gave another page for %d citations (kept as `page_running_head_model`); %d Official Records citations carry the image reading (`scan.printed_page_read_on_image`). (2) library pages decided per citation in library_pages.json (the number printed at the top of the scan leaf checked against the item page index, hand decisions with their reason; Pennsylvania at Gettysburg vol. 1 decided by hand from the heads in the text because the leaf alignment fails for it). National Park Service texts keep the PDF page of the text layer (marked as such). (3) every report heading is stored verbatim with its offsets (`report_heading`) so that the unit and author of each quoted passage can be read. (4) quotes that were shorter than the claim they carry were extended to the verbatim passage that covers it, or covering citations were added (rows T1-116 to T1-167). (5) digits damaged in the OCR were read on page images, %d citations carry an `image_check` or a note; the readings changed facts (below). (6) computed sky values carry computed citations with an independent PyEphem 4.2.1 cross-check (closeout/astro_check.py, astro_check.json). (7) %d more searches of the Official Records and the library were run for the unsupported sub-claims and logged (search_log.jsonl: %d searches in all, %d with zero hits; a zero is a finding).' % (len(leaves), len(model_diff), img_or, len(ic), len(second), len(slog), zero))
A('- checks on the written files: build.py re-matches all citations at every write; closeout/audit/ holds the scripts of the page, number and text checks (README there).')
A('')
A('## Facts changed by reading the page images and by the second searches')
for l in FACTS:
    A('- ' + l)
A('')
A('## Counts')
A('- rows: %d; verdicts: %s.' % (len(rows), json.dumps(dict(V))))
A('- the %d rows whose status_effective was not verified_against_or_text: %s.' % (len(nv), json.dumps(dict(Vnv))))
A('- the %d rows already verified against the OR text: %s. A verified quote does not mean that every sub-claim of the row is supported; where the shard notes already listed unsupported sub-claims the verdict is corrected or partially_supported, not confirmed.' % (len(vv), json.dumps(dict(Vvv))))
A('- sub-claims: %d; by tier %s; by support %s.' % (len(subs), json.dumps(dict(st)), json.dumps(dict(ss))))
A('- citations by source: %s.' % json.dumps(dict(cs)))
A('- results.jsonl after the close-out: tier %s; status %s.' % (json.dumps(dict(rt)), json.dumps(dict(rs))))
A('- proposed register entries: %d (tl-03-CO-<row>.md) plus the 9 earlier ones (tl-03-EG-01..09, kept), and tl-03-CONFLICTS.md (every scenario of every row).' % len(regs))
A('')
A('## Verdict by row')
for v in ('confirmed', 'corrected', 'partially_supported', 'unsupported', 'gap'):
    A('- %s (%d): %s' % (v, len(by_v[v]), ', '.join(by_v[v]) or 'none'))
A('')
A('## Source conflicts carried as selectable scenarios (no default picked)')
A('Rows with scenarios (%d): %s.' % (len(scn), ', '.join(scn)))
A('The only defaults in force are the delegated decisions already recorded: %s. All other conflicts (for example the hour of the first contact of Rodes\' division, of Hancock\'s arrival, of Lee\'s arrival, the 24th Michigan\'s loss 363 against about 399, the regiment of the Fourth Georgia\'s formation at noon against 1 p. m., Slocum\'s arrival at 5 to 6 against about 7 p. m.) have no recorded default and none was picked.' % ('; '.join('%s: %s' % d for d in dflt) or 'none'))
A('')
A('## Gap, unsupported and partial rows (proposed register entries)')
A('Rows partially supported (%d): %s. Rows unsupported (%d): %s. Rows gap (%d): %s.' % (len(by_v['partially_supported']), ', '.join(by_v['partially_supported']) or 'none', len(by_v['unsupported']), ', '.join(by_v['unsupported']) or 'none', len(by_v['gap']), ', '.join(by_v['gap']) or 'none'))
A('Every row with an unsupported sub-claim or a remainder has an entry: %s.' % ', '.join(regs))
A('')
A('## Tier relative to the seed (overlay, seed rows untouched)')
A('Promotion proposed: %s. Demotions against the seed: %s. Unchanged: %d rows. A promotion applies only to the corrected wording and needs the delegated-decision block DD-TL03-01 (appended to decisions/DELEGATED-DECISIONS-2026-11-11.md) or an owner decision; every unsupported remainder keeps its own tier and its proposed register entry.' % (', '.join(prom) or 'none', ', '.join(dem) or 'none', tc['unchanged']))
A('')
A('## What is not done or owed')
for l in OWED:
    A('- ' + l)
open(os.path.join(SH, 'REPORT.md'), 'w', encoding='utf-8', newline='\n').write('\n'.join(md) + '\n')
print('REPORT.md written,', len(md), 'lines')
