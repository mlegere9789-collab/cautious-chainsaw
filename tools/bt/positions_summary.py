"""Write docs/battle-theatre/history/positions/POSITIONS_<SCOPE>_SUMMARY.md from positions_<SCOPE>.jsonl and the hand-written blocks below.
    PYTHONIOENCODING=utf-8 python -I tools/bt/positions_summary.py D
"""
import os, sys, json, collections, re
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
scope = sys.argv[1] if len(sys.argv) > 1 else 'D'
POS = os.path.join(ROOT, 'docs', 'battle-theatre', 'history', 'positions')
U = {u['id']: u for u in json.load(open(os.path.join(ROOT, 'docs/battle-theatre/history/units.json'), encoding='utf-8'))['units']}
C = [json.loads(l) for l in open(os.path.join(POS, 'positions_%s.jsonl' % scope), encoding='utf-8')]
IDX = {r['id']: r for r in json.load(open(os.path.join(ROOT, 'docs/battle-theatre/library/or27_index.json'), encoding='utf-8'))['records']}
ARR = json.load(open(os.path.join(ROOT, 'docs/battle-theatre/history/arrivals.json'), encoding='utf-8'))
by = collections.defaultdict(list)
for c in C:
    by[c['unit_id']].append(c)
cid2 = {c['claim_id']: c for c in C}


def desc(i):
    out = [i]
    for ch in U[i].get('children') or []:
        out += desc(ch)
    return out


def parent_chain(i):
    out = []
    while i:
        out.append(i)
        i = U[i].get('parent')
    return out


# ---- hand-written "why" strings per unit (verdict is computed; this explains it) ----
WHY = {
    'cs-anv-hq': "Lee's own report gives movements, not his place; Pendleton, Longstreet and two Part 3 letters give Chambersburg (June 28), Greenwood/Cashtown (July 1), the field on July 1 (hour lost in the OCR), the field on July 2-3 and 'near Gettysburg' July 4. The three nights are an open gap.",
    'cs-1c': "Longstreet's report gives Chambersburg, Greenwood (June 30, about 2 p. m.), Marsh Creek (July 1, after dark), the Emmitsburg-road attack and the withdrawal; no clock hour for the July 2 march.",
    'cs-1c-mclaws': "No report by McLaws; Longstreet, Kershaw, Wilcox and the division's batteries cover the road, the camp and the July 2 positions.",
    'cs-1c-mclaws-kershaw': "Kershaw's own report plus the 3rd SC (Maffett, Nance) cover every day from June 16 to July 14 with places and hours.",
    'cs-1c-mclaws-barksdale': "No report (killed); approach only inferred from Longstreet; July 2 positions from Kershaw, Wilcox and Union reports; death date conflicts (C-037).",
    'cs-1c-mclaws-semmes': "No report (mortally wounded); positions from Kershaw, Longstreet, White, Gee and Motes; approach only inferred from the division.",
    'cs-1c-mclaws-wofford': "No report; Kershaw, Longstreet, Stuart and Cabell name it on July 2 and July 7-10; approach only inferred from the division.",
    'cs-1c-mclaws-cabell': "Cabell and four battery reports give hours and places from June 28 to July 10.",
    'cs-1c-pickett': "No report by Pickett; Lee, Longstreet, Peyton and Dearing give four different arrival statements (C-021); no approach road named.",
    'cs-1c-pickett-garnett': "Peyton gives July 3 (arrival about 9 a. m., noon position, 1.30 cannonade, 2.30 advance) but no road and nothing before July 3.",
    'cs-1c-pickett-kemper': "No report (wounded); only Peyton's view of Kemper on July 3, Lee, and Meade's dispatch (Part 1).",
    'cs-1c-pickett-armistead': "No report (mortally wounded); only Peyton's view, Webb and Hall (Part 1).",
    'cs-1c-pickett-dearing': "Dearing's own report: Chambersburg, July 2 march, dusk, July 3 position, July 4-5 Black Horse Tavern.",
    'cs-1c-hood': "No report by Hood or Law; Longstreet, Robertson, Benning and the regiments give the nights, the advance and July 3-4; the Marsh Creek and Cashtown routes conflict.",
    'cs-1c-hood-law': "No report by Law; regiments (4th, 15th, 44th, 47th, 48th Alabama) and Longstreet cover New Guilford, the march and July 2-3; the arrival hour conflicts (noon vs 3.30 p. m.).",
    'cs-1c-hood-robertson': "Robertson and four regiment reports cover July 2-4 in detail; no approach road in any Robertson report (inferred from Longstreet).",
    'cs-1c-hood-anderson': "White consolidates the regiments; July 2-4 positions are documented; approach inferred from Longstreet; G. T. Anderson wrote no report.",
    'cs-1c-hood-benning': "Benning and four regiments cover the Cashtown route, July 2-4 and the withdrawal.",
    'cs-1c-hood-henry': "Henry's journal gives every day from June 15 to July 14.",
    'cs-1c-res-art-alexander': "Alexander and Taylor: arrival 9 a. m. July 2 (10 a. m. Taylor), positions July 2-4, route via Fairfield.",
    'cs-1c-res-art-washington': "Eshleman gives the Cashtown Gap route, the July 2 park, the July 3 line and July 4 at Cashtown.",
    'cs-2c': "Ewell's report plus Lee: Carlisle June 29, Heidlersburg June 30, Middletown road July 1, the July 2-3 attacks, July 5 departure.",
    'cs-2c-early': "Early's report: Greenwood, Cashtown forks, York, East Berlin, Heidlersburg road, July 1-5.",
    'cs-2c-early-hays': "Hays' report plus Early's cover the Heidlersburg road arrival, July 1-4.",
    'cs-2c-early-smith': "Hoffman (after Smith resigned) and Early cover July 1-4; arrival from Early's formation sentence.",
    'cs-2c-early-hoke': "Godwin (Avery died), Tate and Early cover the Heidlersburg road and July 1-5.",
    'cs-2c-early-gordon': "Gordon's report covers June 26-29 detached, July 1; July 2-3 'not of sufficient importance'.",
    'cs-2c-early-jones': "Jones, Green and Tanner cover July 1-3 and the cavalry detachments; the road is 'York road' (Brown) vs Heidlersburg road (Early).",
    'cs-2c-johnson': "Johnson, Steuart, Walker, Jones, Williams, Andrews and nine regiments cover June 29-July 5.",
    'cs-2c-johnson-steuart': "Steuart's report covers the railroad line July 1, the July 2 advance and July 3.",
    'cs-2c-johnson-stonewall': "Walker and five regiments cover the Hanover road line July 1-2 and July 3.",
    'cs-2c-johnson-nicholls': "Williams (Nicholls wounded earlier) covers July 1 about 7 o'clock (no a.m./p.m. printed), July 2 7 p. m., July 3-4.",
    'cs-2c-johnson-jones': "Jones, Dungan, Johnson and six regiments cover the departure from camp July 1 to the withdrawal.",
    'cs-2c-johnson-andrews': "Andrews' report (Latimer wounded) covers July 1-4.",
    'cs-2c-rodes': "Rodes' report covers Carlisle to Heidlersburg to Middletown, the July 1 deployment and July 2-4; hours conflict (C-041).",
    'cs-2c-rodes-daniel': "Daniel and five regiments cover July 1-3 with hours (arrival noon, 1 p. m. engagement).",
    'cs-2c-rodes-doles': "Doles and three regiments cover July 1-4; approach inferred from the 4th Georgia.",
    'cs-2c-rodes-iverson': "Iverson's two reports cover July 1-7; approach inferred from Rodes.",
    'cs-2c-rodes-ramseur': "Ramseur and four regiments cover July 1-4.",
    'cs-2c-rodes-oneal': "O'Neal and seven regiments cover June 30-July 5.",
    'cs-2c-rodes-carter': "Carter's report covers the July 1 batteries and July 3; Lee's Middletown-road sentence is the approach.",
    'cs-2c-res-art': "Brown's report plus Dance and Nelson; thin on hours.",
    'cs-2c-res-art-1vaartbn': "Dance's report covers July 1-4.",
    'cs-2c-res-art-nelson': "Nelson's report covers July 1-4.",
    'cs-3c': "Hill's report plus Walker: Fayetteville June 29, Cashtown, turnpike July 1, July 2-4.",
    'cs-3c-anderson': "Anderson's report plus the brigades; arrival hours conflict (Cashtown early afternoon vs 10 a. m. vs 2.30 p. m.).",
    'cs-3c-anderson-wilcox': "Wilcox's report gives July 1 2.30 p. m., the picket, July 2 9 a. m. line, the advance (hour printed G. 20 p. m., an OCR glyph, so no t_iso), July 3.",
    'cs-3c-anderson-mahone': "Mahone's report is a few lines; Wright gives Mahone's place in the column; approach documented only through Wright.",
    'cs-3c-anderson-wright': "Wright and four regiments cover July 1-4.",
    'cs-3c-anderson-perry': "Lang's report gives July 1-4 with hours.",
    'cs-3c-anderson-posey': "Posey's report starts on July 2; approach inferred.",
    'cs-3c-anderson-cutts': "Lane's report: arrival 3 o'clock July 1, July 2-3 positions.",
    'cs-3c-heth': "Heth's two reports: Cashtown, 5 a. m. July 1, the forms of July 1; Davis for July 3.",
    'cs-3c-heth-pettigrew': "Jones' report (Pettigrew's brigade) covers June 30-July 14.",
    'cs-3c-heth-brockenbrough': "No report; only Heth, Jones and Davis place it; approach inferred.",
    'cs-3c-heth-archer': "Shepard's report covers July 1-3.",
    'cs-3c-heth-davis': "Davis' report (two parts) covers July 1 and July 3.",
    'cs-3c-heth-garnett': "Garnett and Richardson cover Cashtown, July 2-4.",
    'cs-3c-pender': "Engelhard's report (Pender dead) covers July 1-2.",
    'cs-3c-pender-mcgowan': "Perrin's report covers July 1 with hours.",
    'cs-3c-pender-lane': "Lane's report covers July 1-3.",
    'cs-3c-pender-thomas': "Thomas' short report; approach inferred.",
    'cs-3c-pender-scales': "Scales and Lowrance cover July 1-3.",
    'cs-3c-pender-poague': "Poague's report: Cashtown, July 2-3.",
    'cs-3c-res-art': "Walker's report.",
    'cs-3c-res-art-mcintosh': "McIntosh's report.",
    'cs-3c-res-art-pegram': "Brunson's report (Pegram wounded).",
    'cs-cav-div': "Stuart's report covers June 24 to July 14; Lee's Part 3 letter of June 23.",
    'cs-cav-hampton': "Hampton's Gettysburg report plus Green; the approach is Stuart's dispatch only.",
    'cs-cav-flee': "No Gettysburg report; Stuart and Hampton give Carlisle, July 3 and Cashtown.",
    'cs-cav-chambliss': "No Gettysburg report; Stuart and Hampton give Hanover June 30 and July 3.",
    'cs-cav-jenkins': "No report; Stuart, Lee and Rodes give June 28-29 and July 3.",
    'cs-cav-horse-art': "No Gettysburg report by Beckham; one Stuart sentence and Green's section.",
    'cs-cav-robertson': "No Gettysburg report by Robertson; Lee and Stuart give July 3-4.",
    'cs-cav-jones': "Jones and the 6th, 7th, 11th Virginia: Cashtown and Fairfield July 3.",
    'cs-cav-imboden': "Only Lee's July 4 letter (Imboden's report is not in the index) and the batteries that reported to him.",
    'cs-cav-flee-chambliss': "Group row: see Fitz Lee and Chambliss.",
    'cs-cav-robertson-jones-imboden': "Group row: see Robertson, Jones and Imboden.",
    'cs-corse-hanover-junction': "Not on the field: Gordonsville June 27-28 (Part 3).",
    'cs-1c-res-art': "Walton wrote no report in OR 27: open gap; battalions covered by their own claims.",
    'cs-1c-art': "No commander, no report: open gap.",
}

# units re-rated from full to partial at the full-passage fidelity re-check (the road in the earlier approach claim was the compiler's gloss, not printed)
RERATED = {
    'cs-anv-hq': "the road of the Greenwood letter claim was a compiler gloss and the other approach claims name none",
    'cs-1c-hood-law': "the 4th Alabama march claim prints no road ('toward Gettysburg'; the road is not named)",
    'cs-1c-hood-benning': "the Hodges claim prints 'the mountain pass, by way of Cashtown' and the pike name was the compiler's",
    'cs-3c-heth-davis': "Davis prints 'a turnpike road leading to Gettysburg' only; the 'Cashtown road' and 'Chambersburg Pike' names were glosses",
    'cs-1c-res-art-alexander': "Alexander prints a route (Winchester, Greencastle, Chambersburg, Gettysburg), not a named road",
    'cs-1c-res-art-washington': "Eshleman prints Cashtown Gap but no road; 'Chambersburg Pike' was the compiler's name",
}
for _k, _v in RERATED.items():
    WHY[_k] = (WHY.get(_k, '') + ' Re-rated partial at the full-passage re-check: ' + _v + '.').strip()


# ---- tables ----
level_order = ['headquarters', 'corps', 'division', 'group', 'command', 'brigade', 'artillery_group', 'artillery_battalion']
scope_units = [i for i in U if U[i]['army'] == 'CS' and U[i]['level'] in level_order]


def stats(i):
    own = by.get(i, [])
    allc = [c for d in desc(i) for c in by.get(d, [])]
    ds = sorted(((c['when']['t_iso'] or c['when']['date'] or '') for c in own if c['when']['date']))
    return own, allc, (ds[0] if ds else ''), (ds[-1] if ds else '')


def printed_road(c):
    # after the full-passage re-check a road counts only where it is printed (bracketed glosses and 'not named' notes do not count)
    rd = (c['place'].get('direction_or_road') or '').strip()
    return bool(rd) and not rd.startswith('[') and 'not named' not in rd.lower() and 'not printed' not in rd.lower() and 'compiler' not in rd.lower()


def road_claims(cs):
    return [c for c in cs if c['kind'] in ('arrival_road', 'march') and c['tier'] == 'documented' and printed_road(c)]


def verdict(i):
    own, allc, a, b = stats(i)
    docs = [c for c in allc if c['tier'] != 'open gap']
    if not docs:
        return 'none'
    has_arr = bool(road_claims(allc))
    has_pos = any(c['kind'] in ('position', 'engagement', 'night_position') and c['tier'] == 'documented' for c in allc)
    own_docs = [c for c in own if c['tier'] == 'documented']
    big = U[i]['level'] in ('corps', 'division', 'group', 'headquarters', 'artillery_group')
    if has_arr and has_pos and (len(own_docs) >= 3 or (big and own_docs)):
        return 'full'
    return 'partial'


out = []
W = out.append
nclaims = len(C)
kinds = collections.Counter(c['kind'] for c in C)
tiers = collections.Counter(c['tier'] for c in C)
W('# Positions and approach roads, Confederate side (scope D): summary')
W('')
W('Built by `tools/bt/positions_summary.py` from `positions_D.jsonl` (written by `tools/bt/positions_build.py` from the claim modules in `tools/bt/positions_D/`). Nothing here changes a default, gate or tier elsewhere; conflicts are carried, never resolved.')
W('')
W('- Claims: **%d** (%s). Tiers: %s. Reports cited: %d distinct records. Claims in a conflict family: %d.' % (
    nclaims, ', '.join('%s %d' % (k, v) for k, v in sorted(kinds.items())), ', '.join('%s %d' % (k, v) for k, v in sorted(tiers.items())),
    len({c['source']['report_id'] for c in C if c['source']['report_id']}), sum(1 for c in C if c['conflicts_with'])))
nq = sum(1 for c in C if c['source'].get('quote')); nd = sum(1 for c in C if c['tier'] == 'documented'); ndq = sum(1 for c in C if c['tier'] == 'documented' and c['source'].get('quote')); naq = sum(1 for c in C if c['source'].get('additional_quotes'))
W("""- Every anchor was located by code inside its record (`or27_find`/`or27_index` span); the printed page is computed from the recovered running heads, and a page marked interpolated carries the range. **Every documented claim carries a verbatim quote of fewer than 15 words** (%d of %d documented claims; %d claims in all), verified present in the cited record by code (`F.verify`) and re-sampled by `tools/bt/verify_positions.py`. The quote is a window of the claim's own anchor chosen by code (overlap with the claim text), or an explicit quote in the claim module / `tools/bt/positions_D_overrides.json`. Where a claim also states a clock hour that the main quote does not contain, a second verified extract with that hour is carried in `source.additional_quotes` (%d claims). The one-quote-per-passage limit of the brief was applied per claim here, as the coordinator's rule requires a supporting extract on every documented claim. Where no extract supported a time statement, the time was removed from the claim (`when.description` says "no hour printed in this passage") rather than kept as documented. The open-gap and inferred claims carry no quote by design (searches tried, or the reasoning).""" % (ndq, nd, nq, naq))
W("""- `when.printed` is the clock or date phrase as printed (OCR errors kept), taken first from the claim's own extracts, then from the text next to the anchor, and, before the re-check, as a last step the nearest matching phrase elsewhere in the same report (`when.printed_basis`). **After the full-passage re-check (see RECHECK_D_NOTES.md) no claim carries `printed_basis`**: a printed phrase is kept only where it sits in the same sentence as the fact or in a sentence that explicitly continues it, and every kept phrase lies inside one of the claim's own verified extracts; a time or date taken from another sentence is moved to `when.description` (\"time in a different sentence: ...\") and `when.printed` is `null` with `when.printed_note` (%d claims). `when.date_basis` says where a date comes from when no phrase of the fact's own sentence carries it; `when.meridian_inferred` marks an hour printed without a.m./p.m. whose p. m./a. m. is the compiler's reading. `t_iso` is set only where the printed phrase carries a legible hour; where the OCR digit is damaged (e.g. "Z p. m.", "S o'clock") no `t_iso` is set. `when.description` / `place.description` are the author reading. `place.printed` is extracted the same way; `gazetteer_ref` is manual or, where marked, auto from a verbatim printed name in a safe list.""" % sum(1 for c in C if not c['when'].get('printed')))
W('- Secondary sources (Battles and Leaders, state volumes) were not needed: every claim rests on an OR passage (Part 1, 2 or 3).')
fc = collections.Counter(c.get('fidelity_check') for c in C)
W('- **Full-passage fidelity re-check (2026-10, `RECHECK_D_NOTES.md`)**: every claim was re-read against at least 1,200 characters of the raw OR text on each side of its anchor. fidelity_check: passed_full_read %d, corrected %d, downgraded %d, not_rechecked %d. `claim_support_verified` is true only for passed_full_read and corrected claims. Claims split into one claim per report: see the Split-from note on the new claims (PD-cav-jenkins-03, PD-cav-robertson-02, PD-cav-flee-04, PD-cav-chambliss-03..05, PD-1c-mclaws-semmes-06 and -07). Six units were re-rated full to partial (see the why column).' % (fc['passed_full_read'], fc['corrected'], fc['downgraded'], fc['not_rechecked']))
W('')
W('## 1. Coverage per unit')
W('')
W('Verdict rule (computed; re-rated after the full-passage re-check, so a road counts only where it is printed in the passage - bracketed compiler glosses in `direction_or_road` no longer count): *full* = a documented approach/march claim that names a road (`direction_or_road`) and a documented position claim exist for the unit or its regiments/batteries, with at least 3 documented claims of its own (1 for corps, divisions and groups); *partial* = something is documented but one of those is missing or only inferred; *none* = no documented claim. The reason column says why.')
W('')
W('| unit | name | own | with regts/batts | earliest .. latest (claim time) | approach documented | position documented | verdict | why |')
W('|---|---|---|---|---|---|---|---|---|')
for lv in level_order:
    for i in scope_units:
        if U[i]['level'] != lv:
            continue
        own, allc, a, b = stats(i)
        docs = [c for c in allc if c['tier'] == 'documented']
        arr_own = road_claims(allc)
        arr_inf = [c for c in allc if c['kind'] in ('arrival_road', 'march') and c['tier'] == 'inferred']
        arr = 'yes (%d)' % len(arr_own) if arr_own else ('inferred only' if arr_inf else ('time/place only, no road' if any(c['kind'] in ('arrival_road','march') for c in allc) else 'no'))
        pos = 'yes (%d)' % sum(1 for c in docs if c['kind'] in ('position', 'engagement', 'night_position')) if any(c['kind'] in ('position', 'engagement', 'night_position') for c in docs) else 'no'
        v = verdict(i)
        W('| %s | %s | %d | %d | %s .. %s | %s | %s | **%s** | %s |' % (i, U[i]['name'].replace('|', '/'), len(own), len(allc), a[5:] or '-', b[5:] or '-', arr, pos, v, WHY.get(i, '')))
W('')
vc = collections.Counter(verdict(i) for i in scope_units if U[i]['level'] in ('brigade', 'artillery_battalion', 'command', 'group', 'headquarters'))
bc = collections.Counter(verdict(i) for i in scope_units if U[i]['level'] == 'brigade')
W('Brigade-level units (infantry and cavalry brigades, %d): full %d, partial %d, none %d. Brigades, artillery battalions, commands and headquarters together: %s.' % (sum(bc.values()), bc['full'], bc['partial'], bc['none'], dict(vc)))
W('')
W('### Units with NO documented claim, and what was searched')
W('')
nodoc = [i for i in scope_units if verdict(i) == 'none']
if not nodoc:
    W('No scope unit is left without a documented claim. Open-gap claims stand for: ' + ', '.join(sorted({c['unit_id'] for c in C if c['tier'] == 'open gap'})) + '.')
for i in nodoc:
    W('- %s: %s' % (i, WHY.get(i, '')))
W('')
W('Open-gap claims (each lists at least three searches tried in the jsonl):')
for c in C:
    if c['tier'] == 'open gap':
        W('- %s (%s): %s' % (c['claim_id'], c['unit_id'], c['activity']))
W('')
W('Reports searched for brigades without their own report: Longstreet R430 (357-364), Lee R426 (293-326), Pendleton R428, Cabell R435, Kershaw R432, Wilcox R537, Wright R539, Peyton R441, Dearing R442, White R448, Gee R451, Robertson R452, Benning R458, Stuart R565, Hampton R567; Union reports R006, R029, R076, R104, R109 (Part 1) for Barksdale, Armistead, Garnett, Kemper; Part 3 documents D1796, D1804, D1809, D1839, D1842, D1847 (span), D1877, D1878 and Seddon-Corse telegrams D1834, D1841, D1888, D1897.')
W('')
W('## 2. Reports used, by part and OCR grade')
W('')
recs = collections.Counter(c['source']['report_id'] for c in C if c['source']['report_id'])
grades = collections.Counter(IDX[r]['ocr']['grade'] for r in recs if r in IDX)
W('Distinct records cited: %d (grade good %d, fair %d, poor %d). Most-cited: %s.' % (len(recs), grades['good'], grades['fair'], grades['poor'], ', '.join('%s %d' % (r.replace('OR27-', ''), n) for r, n in recs.most_common(12))))
W('')
W('## 3. Approach roads and times (these decide where units enter the map)')
W('')
W('Documented (D) or inferred (I) from the claims; claim ids are in the jsonl. Times are as printed ("about" kept in the claim).')
W('')
ROADS = [
    ('Lee HQ', 'Chambersburg (dispatch 7.30 a. m. June 28); Greenwood (letter July 1: "headquarters for the present will be at Cashtown"); on the field July 1 after a pause near Cashtown (Pendleton; hour lost in OCR; C-042); July 2 surveying right; July 4 "near Gettysburg"', 'D', 'PD-anv-hq-01..10'),
    ('I Corps (corps)', 'Chambersburg June 27-29; Greenwood June 30 about 2 p. m.; July 1 set out for Gettysburg, delayed by Johnson\'s division coming in from Shippensburg; McLaws at Marsh Creek (4 miles) a little after dark; Hood within about 4 miles at about midnight', 'D', 'PD-1c-01..04'),
    ('McLaws (Kershaw, Barksdale I, Semmes I, Wofford I)', 'Fayetteville June 30; July 1 left Fayetteville 4 p. m. (Kershaw) on the Gettysburg road, camp 2 miles from town at "12 p. m." (midnight) vs Marsh Creek 4 miles (Longstreet) vs the 3rd SC resting after nightfall on the field of July 1 after crossing the mountain gap (Maffett) [conflict mclaws_camp_jul1]; July 2 up at 4, left at sunrise, hill overlooking Gettysburg, right of the Third Corps, noon countermarch via the Fairfield-road stone bridge', 'D', 'PD-1c-mclaws-kershaw-01..05'),
    ('Hood (Law, Robertson I, G. T. Anderson I, Benning)', 'Greenwood June 30; Law picketed New Guilford ("on the road leading toward Emmitsburg") and marched 20-24 miles on the morning of July 2, 4th Alabama arriving 3.30 p. m. vs Longstreet "joined about noon" [law_arrival]; Henry\'s battalion Fayetteville to 10 miles on the Gettysburg road July 1; Benning\'s 2nd and 17th Georgia came "by way of Cashtown" to the July 1 field at midnight [hood_jul1_night]; Hood within 4 miles at midnight (Longstreet)', 'D', 'PD-1c-hood-law-*, PD-1c-hood-benning-01..02'),
    ('Pickett (Garnett, Kemper I, Armistead I)', 'Chambersburg until relieved by Imboden July 1 (Lee letter, Longstreet); Dearing\'s battalion left near Chambersburg the morning of July 2, camped a few miles out, ordered to the field at dusk; Peyton: Garnett reached the field about 9 a. m. July 3; Lee: afternoon of July 2 (Jan. 1864) or morning of July 3 (July 31) [C-021]. No road named.', 'D / I', 'PD-1c-pickett-*, PD-1c-pickett-dearing-02'),
    ('I Corps reserve artillery', 'Alexander arrived Gettysburg 9 a. m. July 2 (Taylor 10 a. m.) via Chambersburg; Washington Artillery crossed South Mountain at Cashtown Gap July 1, within 3 miles July 2 (parked), to the front at dusk', 'D', 'PD-1c-res-art-*'),
    ('II Corps (corps)', 'Carlisle June 29 (ordered to Cashtown); Heidlersburg June 30; Lee\'s June 28 7.30 a. m. dispatch: via Heidlersburg, then Gettysburg or Cashtown; July 1 Rodes by Middletown road, Early by the Heidlersburg road, Johnson from Shippensburg/Scotland (reached late)', 'D', 'PD-2c-*'),
    ('Early (Hays, Hoke, Gordon, Smith, Jones\'s battalion)', 'Greenwood June 24-25; June 26 Gordon + White by the pike through Cashtown, rest by Hillstown to Mummasburg; York; June 30 daybreak by Weigelstown and East Berlin to 3 miles from Heidlersburg; July 1 Heidlersburg road into the field (Hays: within 1 1/2 miles of Gettysburg; formed across the road). Brown names a "York road" for Jones\'s battalion [early_route_jul1]', 'D', 'PD-2c-early-*'),
    ('Rodes (Daniel, Doles I, Iverson I, Ramseur, O\'Neal, Carter)', 'Carlisle to Petersburg to Heidlersburg June 30 (22+ miles); July 1 Middletown, then toward Gettysburg (Ewell and Lee print "the Middletown road"; Rodes does not), along the wooded ridge on the left of which Gettysburg stands ("Oak Ridge" is not printed); hours conflict: Pickens 11 a. m., Daniel about 12 m. (the sentence dates the departure "the 30th" and gives no second date), Doles about 1 p. m., Lee about 2.30 p. m., Grimes about 4 p. m. [C-041]', 'D', 'PD-2c-rodes-*'),
    ('Johnson (Steuart, Stonewall, Nicholls, J. M. Jones, Andrews)', 'within 3 miles of Carlisle; June 29 countermarch via Green Village and Scotland; Fayetteville; over South Mountain (the pike name is the compiler\'s, not printed by Johnson or Funk), 25 miles July 1 ("the last day\'s march"); Gettysburg and York Railroad to the northeast of town; brigades about sunset to after dark; Nicholls "about 7 o\'clock" on the Cashtown road (no a.m./p.m. printed; p. m. inferred) [johnson_arrival_jul1]', 'D', 'PD-2c-johnson-*'),
    ('III Corps (Heth, Pender, Anderson, artillery)', 'Fayetteville June 29; Heth to Cashtown (Hill: June 29; Brunson, Walker, Garnett: June 30 evening for the artillery); July 1 5 a. m. Heth toward Gettysburg (the turnpike is named by Davis and Archer\'s report; the name "Chambersburg Pike" is the compiler\'s), Pender at an hour damaged in the OCR (Engelhard "S o(dock", Perrin "s o clock"; 8 is only a reading), Anderson from Fayetteville at daylight to Cashtown early afternoon (Wright: 10 a. m. one mile short of Cashtown, resumed 1 p. m.; Wilcox 2.30 p. m.) [anderson_arrival_jul1]', 'D', 'PD-3c-*'),
    ('Stuart (Hampton, Fitz Lee, Chambliss, Jenkins)', 'Salem June 24-25; Haymarket, Brentsville, Wolf Run Shoals, Fairfax; Rowser\'s Ford June 27; Rockville June 28; Westminster June 29; Hanover June 30; Jefferson, Dover; Carlisle July 1; to Gettysburg by the road named only "to Gettysburg": Hampton 10 miles that night; Hunterstown July 2; July 3 left of Ewell\'s left on the ridge toward Hanover; July 3-4 night Fitz Lee\'s brigade to Cashtown (Stuart; the night digit is OCR-damaged, "July :i"); July 4 order of march: "two brigades on the Cashtown road, under General Fitz. Lee" and, by an OR editors footnote, Fitz Lee\'s and Hampton\'s (under Baker); Emmitsburg (Chambliss, Jenkins)', 'D', 'PD-cav-div-*'),
    ('Robertson / W. E. Jones', 'Williamsport and Chambersburg to Cashtown; Jones left camp 1 a. m. July 3, reached Cashtown, then to Fairfield (6th US Cavalry met 2 miles from Fairfield)', 'D', 'PD-cav-jones-*, PD-cav-robertson-01'),
]
W('| group | route and times | tier | claims |')
W('|---|---|---|---|')
for g, r, t, cl in ROADS:
    W('| %s | %s | %s | %s |' % (g, r, t, cl))
W('')
W('## 4. Conflicts between reports (both values kept; never resolved)')
W('')
fams = collections.defaultdict(list)
for c in C:
    if 'conflict_family' in c:
        fams[c['conflict_family']].append(c)
for fam, cs in sorted(fams.items()):
    ext = sorted({x for c in cs for x in c['conflicts_with'] if re.fullmatch(r'C-\d{3}', x)})
    if len(cs) < 2 and not ext:
        continue
    W('**%s**%s' % (fam, ('  (registered conflict%s: %s)' % ('s' if len(ext) > 1 else '', ', '.join(ext))) if ext else ''))
    for c in cs:
        W('- %s | %s | %s | %s | %s p.%s | %s' % (c['claim_id'], c['unit_id'], c['when']['description'], c['kind'], c['source']['report_id'].replace('OR27-', '') if c['source']['report_id'] else '-', c['source']['printed_page'], c['activity'][:150].replace('\n', ' ')))
    W('')
W('## 5. OCR problems met')
W('')
bad = collections.Counter(c['source']['report_id'] for c in C if c['ocr_uncertain'] and c['source']['report_id'])
W('Claims flagged `ocr_uncertain`: %d (the flag is set for records graded poor and wherever the OCR damages a digit, a name or a quote mark). Specific problems:' % sum(1 for c in C if c['ocr_uncertain']))
for line in [
    "R428 Pendleton: the hour of the commanding general's arrival on the July 1 field is lost (\"perhaps ' o'clock\"); R544 Moffett: \"about 11a. m.\" and \"At o p. m.\" (digit lost) for the 2nd Georgia Battalion; R542 McCurry: the entry hour of the 22nd Georgia is lost (\"about ?*\" p. m.).",
    "R479 Green: the hour of the July 3 cavalry fight prints \"'Z p. m.\" (OCR glyph; the hour is not confirmed, so no t_iso is set; the same passage says he was engaged again during the afternoon); R459 Shepherd: \"13 p. m.\" for midnight; R515 Willis: \"13 o'clock\" (1 o'clock); R561 Lowrance: \"It was then 1 o'clock\" (after midnight); R548 Lane: \"about :i o'clock\" (3 o'clock); R556 Engelhard \"S o\"(dock\" and R557 Perrin \"s o'clock\" for the July 1 start of Pender's division (8 o'clock by shape only, no t_iso set); R505 Andrews: \"About -1 o'clock\" (4); R495 Jones: \"about -1 p. m.\" (3 or 4).",
    "R445 Perry: \"2i miles\" (21 or 24, compare 4th Alabama 24 and 48th Alabama 20); R552 Shepard: \"8 miles\" for the picket retreat; R463 Henry: the cannonade day entries intact; R564 Brunson: the distance to Cashtown \"S miles\"; R476 Hoffman: \"about U miles\" on the Cashtown road and the July 23 date digit; R473 Godwin: \"At ) l a. m.\" (July 4) and \"At t a. m.\" (July 5).",
    "R430 Longstreet and R432 Kershaw are OCR good/fair; R441 Peyton, R449 Hillyer, R455 Bane, R456 Bryan, R473 Godwin, R474 Tate, R476 Hoffman, R477 Gordon, R478 H. P. Jones, R535 Walker, R549 Heth, R552-R556, R564, R565 Stuart are graded poor by the index; their hours and mileages were taken only where the digit is readable and the neighbouring text agrees, otherwise flagged.",
    "Running-head fragments sit inside sentences (Peyton p. 385-386; Hayes' R472 \"[[p.476~]]\"); anchors skip them. Page numbers of records graded `interp` are ranges (printed_page shows the range, `page_estimate` the linear estimate).",
    "Found or confirmed at the full-passage re-check (carried as OCR glyph only, no t_iso, or flagged in the claim): R481 Johnson 'June 39' (read 29); R488 Walker 'About t; p. m.'; R482 Steuart 'about lip. m.'; R495 Jones and R505 Andrews 'about -1 o'clock' / 'about -1 p. m.'; R501 Richardson '-i o'clock' and R502 Buckner 'About 0 o'clock'; R426 Lee 'the 29th' printed with a damaged first digit; R458 Benning distances 'GOn or SUO' and 'GOO' yards; R467 Ewell 'aCiO a. m.' and 'li- miles'; R470 Early '2Gth' and '1-| miles'; R476 Hoffman 'July 23' digit; fractions and distances damaged in R536 Anderson ('1,^00 yards'), R537 Wilcox ('1+'), R545 Lang ('H'), R526 Hall ('1^'), R509 Lewis ('2i'), R437 Manly ('2i'), R550 Jones ('2h'); R565 Stuart 'July :i' for the night of July 3-4; R510 Hopkins and its heading '1, 3 and 3' (digit 2 confused with 3); R449 Hillyer '•;!d instant'; R541 Walker 'July a'; R544 Moffett 'At o p. m.'; R474 Tate '7.\")' (75).",
    "R424 (Organization, July 1-3) is OCR poor: battery captains were mapped to batteries only where the printed name allows it (Ashland, Bedford, Brooks, Madison); Parker's and Taylor's batteries print as \"Virginia Battery\" and are carried on the battalion.",
]:
    W('- ' + line)
W('')
W('## 6. Index gaps (reports not in the OR 27 index, or not in OR 27)')
W('')
for line in [
    "No report in the index by: McLaws, Hood, Law, Pickett, Kemper, Armistead, Barksdale, Semmes, Wofford, G. T. Anderson, Brockenbrough, Pettigrew (Maj. Jones reports for him), Pender (Engelhard reports), Hoke/Avery (Godwin), W. Smith (Hoffman), Thomas (short report present), Walton, Fitz Lee, W. H. F. Lee/Chambliss, Jenkins/Ferguson, Beckham (Gettysburg), Robertson (Gettysburg), Imboden (not in the index), Mahone (a few lines present), Posey (present).",
    "Lee's dispatches of July 1-3 do not exist in Part 3 (no Confederate correspondence between D1847/July 1 and D1877/July 4 concerning the army's movements); the Greenwood letter of July 1 to Imboden is inside the segmented record OR27-3-D1847 (a Raleigh dispatch and a Department of North Carolina abstract precede it).",
    "Part 3 has no document-level contents list: dateline-based segmentation absorbed several documents (D1847 above; D1843 begins with a closing line of Taylor's June 29 letter to Pickett).",
    "The Part 1 Union reports were read only for Barksdale, Armistead, Garnett and Kemper; their other statements about Confederate units are outside this scope.",
]:
    W('- ' + line)
W('')
W('## 7. Differences from the arrival gates (arrivals.json, Q04): reported, not changed')
W('')
gates = ARR['gates']
sub = {g['unit']: g for g in ARR.get('subunit_gates', [])}
der = {g['unit']: g for g in ARR.get('derived_gates', [])}


def gate_of(u):
    for x in parent_chain(u):
        g = gates.get(x) or sub.get(x) or der.get(x)
        if g and g.get('earliest'):
            return x, g['earliest']
    return None, None


diff = []
for c in C:
    if c['kind'] not in ('arrival_road', 'position', 'engagement', 'night_position'):
        continue
    d = c['when']['t_iso'] or c['when']['date']
    if not d or d < '1863-07-01':
        continue
    gu, ge = gate_of(c['unit_id'])
    if ge and d < ge[:len(d)] if len(d) < len(ge) else (ge and d < ge):
        diff.append((c, gu, ge))
W('%d claims place a unit at or near the field earlier than its gate "earliest" (unit or ancestor). Most are positions short of the loaded ground (Marsh Creek, Fayetteville, Cashtown, Heidlersburg road) or sub-unit statements; the gate is "on the field", the claim often is "approaching". The list is for the owner and the checker:' % len(diff))
W('')
for c, gu, ge in diff[:120]:
    W('- %s (%s) %s %s; gate %s earliest %s' % (c['claim_id'], c['unit_id'], c['kind'], (c['when']['t_iso'] or c['when']['date']), gu, ge))
W('')
W('## 8. Files')
W('')
W('- `docs/battle-theatre/history/positions/positions_D.jsonl` (the claims); this summary.')
W('- `tools/bt/positions_build.py`, `positions_extract.py`, `positions_summary.py`, `positions_cov.py`, `or27_dump.py`, `or27_peek.py`, `or27_where.py`; claim sources in `tools/bt/positions_D/*.py` (the page, anchor and quote of every claim are recomputed from the OR text on each build).')
open(os.path.join(POS, 'POSITIONS_%s_SUMMARY.md' % scope), 'w', encoding='utf-8', newline='\n').write('\n'.join(out) + '\n')
print('wrote summary', len(out), 'lines')
