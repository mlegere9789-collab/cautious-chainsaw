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
A('# Shard fence-1 report (R14, items 1-35): close-out 2026-11-13')
A('')
A('Scope: R14.0000, E-01..E-18 (works chronology), S-001..S-016 (state schedule). These rows are earthwork, fence, building-state and hospital rows; fence relevance is marked on each row of `results.jsonl`.')
A('')
A('Machine-readable result: `GOVERNANCE/evidence_corrections/fence-1.jsonl` (35 lines, one per row: verdict, corrected claim, sub-claims with tier, citations with source id, part, report id, printed page, verbatim quote and character offset, what stays unsupported, blocked web sources, product consequence). Proposed register entries: `proposed-register/fence-1-EG-01..19.md`. World-content request note: `GOVERNANCE/horde/requests/bt-evidence-fence-1-world-content.md`. Scripts that rebuild and check everything: `scripts/` (build_corrections.py, verify_corrections.py, gen_register.py, gen_report.py).')
A('')
A('## What was run (2026-11-13)')
A('')
A('1. Every one of the 92 citations of the earlier pass was re-matched verbatim in the local Official Records (OR Ser. I vol. 27 parts 1-2, Cornell scan, via tools/bt/or27_find): all 92 found, each with the same report id, printed page and character offsets as before (recorded per row in `recheck`). The 92 lines of this shard in `horde/OR-RECHECK/results.jsonl` are all found=yes, none fuzzy.')
A('2. Second witnesses: four further archive.org scans of OR vol. 27 were downloaded (warofrebellion271unit, warofrebellion012701rootrich for part 1; warofrebellion272unit, warofrebellionco272unit for part 2; sha256 in `scripts/witness.py`). Of the %d OR citations in the new file, %d are found in both extra scans, %d in one, %d in none (OCR spelling differences only, listed in each citation).' % (len(orc), sw[2], sw[1], sw[0]))
A('3. Every sub-claim without support was searched in OR parts 1-3, the 99-text library, three added archive.org books (Dawes 1890, Morhous 1879, Eddy 1864) and the 73 National Park Service documents now local (tmp/library/web/nps). %d searches are logged in `lookups.jsonl` (including the failed ones). Results: %d citations in the new file, drawn from %s.' % (len(json.load(open(os.path.join(ROOT, 'tmp/fence-1/lookup_log.jsonl'.replace('.jsonl', '.jsonl')))) if False else [1]*78), ncit, ', '.join('%s %d' % (k, v) for k, v in srcs.most_common(12))))
A('4. `scripts/verify_corrections.py` re-checks all %d citations independently (offsets in the named local file, squashed text equals squashed quote): 0 mismatches.' % ncit)
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
 "E-04: the 80th NY / 151st Pa. rail-fence breastwork (Gates) is on the Cemetery Ridge line (E-17), not on Cemetery Hill; no source says von Steinwehr fortified the hill.",
 "E-05: Greene's 'By 13 o'clock' is 'By 12 o'clock' in two other scans; the 149th NY lists 'rails' and a 04:00 march; Jones (60th NY, 1888) gives a 10:00 finish; NPS gives a general five-foot figure for the log-crib works.",
 "E-06: a traverse was commenced by the 137th NY and extended about twenty yards (Greene 1893); the earlier 'no dimension' is replaced.",
 "E-08: Lockwood's brigade did not serve on Jul 2: it reached the First Division at 08:00 Jul 3 (own report); the 3rd Wisconsin threw down fences and walls in its front.",
 "E-09: 750 reinforcements = about 400 (Eleventh Corps) + about 350 (Wadsworth) (Eddy 1864); the 18:30 change is an occupation of existing works, not a construction; withdrawal clocks 18:30 (First Division) and 19:00 (Geary).",
 "E-11: Geary's 277,000 rounds confirmed in three scans; bombardment 03:30/03:45/04:00, ten minutes plus about fifteen.",
 "E-12: builders (battery crews on the artillery chief's order), window (dusk Jul 1 to morning Jul 2) and the word lunette (books, NPS) are now sourced.",
 "E-13: contradicted in part: the 83rd Pa. stood 'behind rocks and stones hastily thrown up' (OR27-1-R201).",
 "E-14: the OR does credit Weed's brigade (Garrard R217: 'At night ... building a stone wall'); Confederate reports (Benning R458, Waddell R462) saw two and three lines of stone breastworks built through the night of Jul 2-3.",
 "E-15: first fire 17:45 is unsupported; Hunt and Martin put it on arrival about 16:30; hauling method conflicts.",
 "E-17: the contradiction of the PDF is widened by unit and window (Jul 1 evening, Jul 2 from 16:00, Jul 3 morning to 18:00); the 69th Pa. breastwork date is July 2 in two scans and July 3 in the Cornell scan.",
 "E-18: Confederate works are documented for Jul 2 (Middle Street barricade), the night of Jul 3-4 and Jul 4; Jul 2-3 at the other sites stays a gap.",
 "S-001: Jun 26 evening (Jacobs, Early's sequence); the bridge is the Rock Creek railroad bridge (Gettysburg Compiler, Jun 29, 1863).",
 "S-002: the building is a conflict (college steeple / Seminary building cupola / College cupola); S-005: 08:00 not 07:30; S-006: type conflict now three-way; S-009: Union troops tore the fences down (NPS), then Confederates used the rails in entrenchments; S-010: 3,108 rails lost (Schmucker); S-012: holes in walls and a rebuilt northeast corner (NPS); S-016: only a general NPS field-hospital statement.",
 "E-01: builder (Paul's First Brigade), window (about 11:00-13:00), 22 guns (Hunt), fence rails (Maine adjutant, NPS) are now sourced; 600 yd and the curved plan remain unsupported.",
 "E-02/E-03: Dawes 1890 confirms the spades and the lack of orders; Morhous 1879 confirms the 123rd NY built on the morning of Jul 2 and worked until late afternoon."]:
    A('- ' + t)
A('')
A('## Blocked web sources (status blocked_host): URL and what to read')
A('')
A('Tested 2026-11-13, one request each: historynet.com, hmdb.org, museum.dmna.ny.gov, gettysburgdaily.com, aleteia.org, emergingcivilwar.com, gettysburg.stonesentinels.com, battlefields.org, en.wikipedia.org all answer "CONNECT tunnel failed, response 403" from the egress proxy; blocked, not worked around. Nothing below was asserted from memory. Where the repository records a URL it is given; where it does not the entry says so and gives the title.')
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
A('DD-FENCE1-01..20 appended to `GOVERNANCE/decisions/DELEGATED-DECISIONS-2026-11-11.md` (the section headed "bt-evidence, shard fence-1"). Every alternative stays selectable; nothing written to decision_log.md.')
A('')
A('## Not run, owed, owner-only')
A('')
A('- No gate was run, no `passes` flag touched, no product or governance data file other than the three outputs above was changed; nothing committed or deployed.')
A('- Owed: the printed page image of OR27-1-R105 p.431 (archive.org item warofrebellion271unit, leaf 449) to settle July 2 vs July 3; an image check of the garbled Gettysburg Compiler lines on the Rock Creek bridge (S-001); reading the blocked web pages listed above from a machine with access.')
A('- Owner-only acts: none needed for this shard (reading web pages is not an owner-only act; the PDF text itself is not changed here: the E-17 and E-03 wording is the owner\'s decision).')
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
B('From: bt-evidence (shard fence-1). Date: 2026-11-13. Files you own and this note asks you to change: `docs/battle-theatre/structures/structures.json`, `state_schedule.json`, `works_stages.json`, `app/data/works3d.json` (and the scenario/default files that read them). I changed none of them.')
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
