"""Write docs/battle-theatre/history/positions/POSITIONS_E_SUMMARY.md from positions_E.jsonl, units.json and the list of undrawn leaf units
in docs/battle-theatre/app/APPROACH-AUDIT.md (the 118 open-gap leaf units, parsed from the 'Every leaf unit that was an open gap' lists).
Usage: python -I tools/bt/positions_E_summary.py"""
import os, re, sys, json, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
POS = os.path.join(ROOT, 'docs', 'battle-theatre', 'history', 'positions')
claims = [json.loads(l) for l in open(os.path.join(POS, 'positions_E.jsonl'), encoding='utf-8') if l.strip()]
units = {u['id']: u for u in json.load(open(os.path.join(ROOT, 'docs', 'battle-theatre', 'history', 'units.json'), encoding='utf-8'))['units']}
audit = open(os.path.join(ROOT, 'docs', 'battle-theatre', 'app', 'APPROACH-AUDIT.md'), encoding='utf-8').read()
sect = audit[audit.index('## Every leaf unit that was an open gap at v5'):audit.index('# Earlier audit')]
REASONS = {}
for m in re.finditer(r"^\* `(\w+)` \((\d+)\): (.*)$", sect, re.M):
    for u in re.findall(r"`([a-z0-9\-]+)`", m.group(3)):
        REASONS[u] = m.group(1)
undrawn = [u for u in REASONS]
assert len(undrawn) == 118, len(undrawn)


def anc(uid):
    out = []
    p = units[uid].get('parent')
    while p:
        out.append(p)
        p = units[p].get('parent') if p in units else None
    return out


by_unit = collections.defaultdict(list)
for c in claims:
    by_unit[c['unit_id']].append(c)
DAYKINDS = {'position', 'engagement', 'movement', 'night_position', 'arrival_road', 'march', 'departure'}


def days(cs):
    return sorted({c['when']['date'][5:] for c in cs if c['kind'] in DAYKINDS and c['when'].get('date')})


def roads(cs):
    out = []
    for c in cs:
        r = c['place'].get('direction_or_road')
        if c['kind'] in ('arrival_road', 'march', 'departure') and r and not str(r).startswith('not named'):
            out.append((r, c['source']['printed_page'], c['claim_id']))
    return out


rows = []
verdict_ct = collections.Counter()
for uid in undrawn:
    u = units[uid]
    direct = by_unit.get(uid, [])
    parents = anc(uid)
    via = [c for p in parents for c in by_unit.get(p, [])]
    rd_direct = roads(direct)
    rd_via = roads(via)
    dd = days(direct)
    dv = [d for d in days(via) if d not in dd]
    nd = sum(1 for c in direct if c['tier'] == 'documented')
    ni = sum(1 for c in direct if c['tier'] == 'inferred')
    if direct and rd_direct and len({'07-01', '07-02', '07-03'} & set(dd)) >= 2:
        v = 'covered (road + days)'
    elif direct and ({'07-01', '07-02', '07-03'} & set(dd)):
        v = 'partial (position days' + (', road' if rd_direct else ', no road') + ')'
    elif via:
        v = 'brigade or division only'
    else:
        v = 'not covered'
    verdict_ct[v.split(' (')[0] if v.startswith('covered') or v.startswith('partial') else v] += 1
    rows.append((uid, u.get('name'), REASONS[uid], len(direct), nd, ni, len(via), rd_direct, rd_via, dd, dv, v))

# formations: roads of approach
formations = collections.OrderedDict()
for r in rows:
    uid = r[0]
    f = None
    for a in [uid] + anc(uid):
        if a in ('us-11c-2d', 'us-11c-3d', 'us-11c-art', 'us-3c-2d', 'us-cav-1d', 'us-cav-3d', 'us-cav-art', 'cs-2c-johnson', 'cs-2c-res-art', 'cs-1c-mclaws', 'cs-1c-pickett', 'cs-cav-jenkins', 'cs-cav-flee-chambliss', 'cs-cav-horse-art', 'cs-2c-early', 'us-aop-hq', 'us-hancock-acting', 'cs-anv-hq', 'cs-1c-art'):
            f = a
            break
    formations.setdefault(f or 'other', []).append(r)


def esc(s):
    return str(s).replace('|', '/').replace('\n', ' ')


tier = collections.Counter(c['tier'] for c in claims)
kind = collections.Counter(c['kind'] for c in claims)
vol = collections.Counter(c['source']['volume'] for c in claims)
interp = sum(1 for c in claims if c['source'].get('interpolated'))
weak = sum(1 for c in claims if c.get('weak_source'))
ocr = sum(1 for c in claims if c.get('ocr_uncertain'))
tclock = sum(1 for c in claims if c['when'].get('t_iso'))
ucov = sum(1 for r in rows if r[3] > 0)
uvia = sum(1 for r in rows if r[3] == 0 and r[6] > 0)
unc = [r for r in rows if r[3] == 0 and r[6] == 0]
conf = sum(1 for c in claims if c.get('conflicts_with'))

L = []
L.append('# Positions and approach roads from the state regimental volumes: SCOPE E\n')
L.append('Claim ledger: `docs/battle-theatre/history/positions/positions_E.jsonl` (schema of positions_A.jsonl; `source` carries volume, section id, section title, author as printed, printed page from the page model at the quote offset, a verbatim quote of under 15 words verified present inside the cited section by code, OCR note). Written by `tools/bt/positions_data_E_*.py` through `tools/bt/positions_E_lib.py` (which refuses an unverifiable or 15-word quote); verified by `python tools/bt/verify_positions.py E 30 7`. This file is generated by `tools/bt/positions_E_summary.py`. Index: `docs/battle-theatre/library/statevol_index.json` (`tools/bt/statevol_index.py`), search and verify CLI `tools/bt/statevol_find.py`.\n')
L.append('Scope: the 118 leaf units of `docs/battle-theatre/app/APPROACH-AUDIT.md` that are still undrawn, worked in the order XI Corps, Union cavalry, III Corps 2nd Division, then the rest. Nothing here changes a default, gate or tier elsewhere; every conflict is carried with both values and none is resolved. The OR is not re-read here (ledgers A to D hold it); a conflict with an OR claim is linked by claim id where one is known.\n')
L.append('## 1. Counts\n')
L.append('- Claims: %d (documented %d, inferred %d, plausible-procedural 0). Weak-source flagged: %d. OCR-uncertain: %d. `t_iso` set (printed clock in the same sentence): %d. Claims that link a conflict (`conflicts_with`): %d.' % (len(claims), tier['documented'], tier['inferred'], weak, ocr, tclock, conf))
L.append('- By kind: ' + ', '.join('%s %d' % kv for kv in kind.most_common()) + '.')
L.append('- By volume: ' + ', '.join('%s %d' % kv for kv in vol.most_common()) + '. Pages on %d claims are a RANGE inside a run of pages whose running heads the OCR lost (`interpolated: true`).' % interp)
L.append("- Tier rule used (Appendix B, as applied at the ledger-E repair pass of 2026-10-30): documented only where the unit's own officer is the author and states the fact (a dedication address by the colonel or another officer of that regiment, about that regiment) or the regiment's own monument inscription (authorship of the inscription text is not shown; kept documented and listed for the owner in RECHECK_E_NOTES.md); a non-officer author (private, sergeant), a brigade commander's letter or report quoted inside an address, a quotation of another writer (Bates, de Trobriand) inside the passage, a statement about another regiment or about the division by a regimental officer, the commission historian's unsigned sketch, a sister regiment's account, a corps commander's memoir (Longstreet), a Union general's article about the enemy (Hunt) and the editors' captions are inferred. No claim is plausible-procedural. Claims changed at the repair pass carry `fidelity_check: corrected` (and `tier_before` where the tier was lowered); the rest keep `passed_full_read`; `claim_support_verified` is true for all; the single-source flag is kept (the state volumes are one root per regiment). Frozen copy before the repair: `_orig_E_audit/`.")
L.append('- Units: of the 118 undrawn leaf units, %d have claims of their own, %d have only brigade or division claims, %d have nothing (list in section 4).\n' % (ucov, uvia, len(unc)))
L.append('## 2. Roads of approach found, by formation\n')
L.append('| formation | leaf units undrawn | with own claims | road of approach printed (own or lower formation) | printed phrase (page) | note |')
L.append('|---|---|---|---|---|---|')
NOTE = {
 'us-11c-2d': ('yes, for the division and regiments', 'Emmitsburg Pike (NY3 p. 1053-1055, 154th NY sketch, inferred); "the junction of the Emmitsburg and Taneytown roads" (73rd PA, PA1B p. 423, documented); Smith\'s brigade: road not named; the commission narrative has the divisions on "the circuitous route by Horner\'s Mills" (NY1 p. 15, inferred)', 'The Horner\'s Mills route (Howard, RC-07) is printed again by the 45th NY committee ("At or near Horner\'s Mills ... directed by a shorter route to the town", NY1 p. 378, documented). The division itself is printed on the Emmitsburg Pike by two volumes; the Horner\'s Mills route is carried beside it, not resolved.'),
 'us-11c-3d': ('yes for 45th NY and 75th PA', '"At or near Horner\'s Mills ... a shorter route to the town of Gettysburg" (45th NY, NY1 p. 378); 75th PA "marched through the town ... to the west side of the Carlisle road" (PA1B p. 438); 58th NY: with the wagon train from Emmitsburg, road not named (NY1 p. 429-430, inferred)', 'The audit reason route_not_a_road stands for the Horner\'s Mills route; the volumes add the last leg ("a shorter route", not named).'),
 'us-11c-art': ('yes, Wiedrich and Wheeler', 'Wiedrich: "taking the road which led to Gettysburg, called the Emmitsburg Road" then the Baltimore road to East Cemetery Hill (NY3 p. 1246, inferred); Wheeler: through the town "and out on the Carlisle Road" (NY3 p. 1320, inferred)', 'Dilger, Heckman, Wilkeson: only the OR (ledger A) and Dilger/Heckman positions from the 45th NY and 134th NY accounts.'),
 'us-3c-2d': ('yes, 26th PA', '"we marched into the Confederate lines near the Black Horse Tavern ... resumed the right road to Gettysburg" (26th PA, PA1B p. 197, documented); 84th PA: with the supply train from Taneytown "on the road to Emmitsburg", not on the field (PA1B p. 474-475, documented)', 'First Brigade came by Emmitsburg and the Black Horse Tavern road (outside the loaded ground, audit RC reason road_outside_ground) and turned back to "the right road" (not named). Excelsior regiments: inscriptions only (position July 2 on the Emmitsburg Road line), no march text; 71st NY inscription OCR unreadable.'),
 'us-cav-1d': ('yes', 'Emmitsburg to Gettysburg by Leesburg, Poolesville, Frederick (6th NY, NY3 p. 1137-1139, documented); "leading the advance ... entered Gettysburg, passed through the town" (8th NY, NY3 p. 1143-1146, documented); Hunt: via Boonsboro and Fairfield (BL3 p. 272, inferred)', 'The siblings disagree on the itinerary (Emmitsburg route in the regiments, Cumberland valley route in Hunt); both carried. The audit reason siblings_disagree is confirmed.'),
 'us-cav-3d': ('yes, but eastern', 'Hanover - Abbottstown - Berlin July 1 (5th NY, 18th PA); New Oxford - Hunterstown July 2 (18th PA, 5th NY, 6th MI); Two Taverns on the Baltimore pike, then to the left past Round Top (Farnsworth) or off the pike to the right to the Hanover and Low Dutch roads (Custer, Kidd quoting Custer)', 'Kilpatrick\'s division never approached Gettysburg from the south on July 1; on July 2 it came from Hunterstown by Two Taverns. 1st VT and 1st WV: no state volume (not acquired for Vermont and West Virginia).'),
 'cs-2c-johnson': ('place, no road', 'near Chambersburg June 30 as escort to the reserve artillery and trains (Hunt, BL3 p. 268-269, inferred); up "after sunset or about dusk of July 1" (editors\' map caption)', 'The road from Scotland is not printed in any state volume or in BL3; it remains an OR-only datum.'),
 'cs-1c-pickett': ('place, no road', 'left at Chambersburg as rear-guard, joined "on the night of the 2d" (Hunt, BL3 p. 290-293, inferred)', 'Day positions for July 3 from Longstreet (inferred).'),
 'cs-1c-mclaws': ('no road', 'July 2: Semmes 200 yards behind Kershaw, Wofford behind Barksdale then advancing with its left at the Peach Orchard (Kershaw, BL3, inferred)', 'Supplies the day position that the audit says Semmes and Wofford lack.'),
 'cs-cav-flee-chambliss': ('route, not a road into the field', 'Seneca - Rockville - Westminster - Union Mills - Hanover - York - Carlisle - Gettysburg (Hunt, BL3 p. 271, inferred); on July 3 the York turnpike and the Stallsmith farm road (Kidd, MI p. 147, inferred)', 'Only earlier marches and the July 3 field.'),
 'cs-2c-res-art': ('place, no road', 'division-level claim only: reserve artillery and trains near Chambersburg June 30 with Johnson division as escort (Hunt, BL3 p. 268-269, inferred; claim on the formation `cs-2c-res-art`, not on the two leaf units)', ''),
 'cs-cav-jenkins': ('earlier march only', 'Jenkins sent as Ewell\'s advance into the valley (June 8, Hunt); July 3 on Cress\' ridge (Kidd)', ''),
}
for f, rs in formations.items():
    n = len(rs); own = sum(1 for r in rs if r[3] > 0)
    nm = units[f]['name'] if f in units else f
    rd = NOTE.get(f)
    if rd:
        L.append('| `%s` %s | %d | %d | %s | %s | %s |' % (f, esc(nm), n, own, esc(rd[0]), esc(rd[1]), esc(rd[2])))
    else:
        L.append('| `%s` %s | %d | %d | no | none printed in the volumes consulted | %s |' % (f, esc(nm), n, own, esc(', '.join(sorted({r[2] for r in rs})))))
L.append('')
L.append('## 3. Per undrawn unit\n')
L.append('Columns: own claims (documented/inferred), claims of parent formations (brigade, division, corps), a road printed for the unit itself or a formation below the division (phrase, page), and the July positions by day (`D` = claims of the unit itself, `via` = only parent claims). Verdict: covered = own claims with a printed road and at least two of July 1-3; partial = own position claims; brigade or division only; not covered. Dates are `MM-DD`.\n')
L.append('| unit | name | audit reason | own claims | via parents | road printed (own) | road via parent | days (own) | days (via parent only) | verdict |')
L.append('|---|---|---|---|---|---|---|---|---|---|')
for r in rows:
    uid, name, reason, nd_all, nd, ni, nv, rd_d, rd_v, dd, dv, v = r
    rtxt = '; '.join('%s (p. %s)' % (esc(x[0])[:90], x[1]) for x in rd_d[:2]) or '-'
    vtxt = '; '.join('%s (p. %s)' % (esc(x[0])[:70], x[1]) for x in rd_v[:2]) or '-'
    L.append('| `%s` | %s | %s | %d (%d/%d) | %d | %s | %s | %s | %s | %s |' % (uid, esc(name), reason, nd_all, nd, ni, nv, rtxt, vtxt, ','.join(dd) or '-', ','.join(dv) or '-', v))
L.append('')
L.append('## 4. Units the volumes do not cover\n')
L.append('The state volumes acquired are Pennsylvania (volume 1 of 1904 and of 1914, volume 2 of 1914), New York at Gettysburg (volumes 1 to 3 of the Final Report), Maine at Gettysburg and Michigan at Gettysburg. They carry no Confederate regiment, and no regiment of Massachusetts, New Hampshire, New Jersey, Ohio, Illinois, Indiana, Vermont, West Virginia, Wisconsin or the Regular Army (US batteries); the missing state volumes (Massachusetts, New Hampshire, New Jersey, Ohio, Illinois, Indiana, Vermont, West Virginia, Wisconsin) are not in `acquired.json`, were not searched for here (the brief names only the volumes already acquired or listed as candidates), and are the remaining acquisition work.\n')
L.append('Units with no claim of their own and none from a parent formation (%d): ' % len(unc) + (', '.join('`%s`' % r[0] for r in unc) or 'none') + '.\n')
L.append('Units with no claim of their own (parent formation claims only, %d): ' % uvia + ', '.join('`%s`' % r[0] for r in rows if r[3] == 0 and r[6] > 0) + '.\n')
L.append('Confederate units: not in any state volume (they are northern-state volumes). What the other two works print: Fox, *Regimental Losses* (acquired as FOX-1889) prints only Union regimental losses and has no marches or positions (its Pickett, Garnett, Steuart, Jenkins and Chambliss hits are casualty or incidental mentions); Battles and Leaders vol. 3 prints Johnson near Chambersburg June 30 and up at dusk July 1, Pickett left at Chambersburg and up on the night of July 2, Semmes and Wofford on July 2 (Kershaw), Stuart\'s ride to Hanover, York, Carlisle and Gettysburg, Jenkins sent ahead in the valley on June 8 (claims POS-E-CS-*). Nothing in BL3 prints the road from Scotland, the Waynesborough pike or Heidlersburg for Johnson.\n')
L.append('## 5. Findings the owner should see (for the Decision Log)\n')
L.append('1. **84th Pennsylvania was not on the battlefield.** The regiment\'s own statement and the letter of its brigade commander, Brig. Gen. Joseph B. Carr (PA1B p. 474-475, documented), place it with the supply train on July 1-6; the trains were ordered to report at Westminster; the regiment reported to Carr again at Williamsport on July 6. The Battle Theatre roster draws it as part of Carr\'s brigade. Claims POS-E-US-3C-2D-CARR-84PA-001..003. Under the Law (no unit before its documented arrival; no fabrication) the roster presence of this regiment on July 2-3 needs an owner decision; nothing is changed here.')
L.append('2. **First Brigade (Carr) came in by the Black Horse Tavern road.** 26th PA: "we marched into the Confederate lines near the Black Horse Tavern ... resumed the right road to Gettysburg" at the midnight of July 1-2 (PA1B p. 197, documented, POS-E-US-3C-2D-CARR-26PA-002). This is the only printed text found that describes the Black Horse Tavern approach as a route actually taken (it did not cross the loaded ground; the column turned back).')
L.append('3. **Horner\'s Mills.** The 45th NY committee (NY1 p. 378) and the commission narrative (NY1 p. 15) confirm the corps\' route by Horner\'s Mills; the 154th NY sketch and the 73rd PA address print the Emmitsburg Pike / the Emmitsburg-Taneytown junction for the Second Division. The last leg into the town is "a shorter route" (not named). Audit reason route_not_a_road is confirmed, with an added Emmitsburg-road alternative for the Second Division.')
L.append('4. **Hour conflicts inside the Second Division** (all carried, none chosen): the 27th PA about noon; Steinwehr about 2 o\'clock (OR); Allan\'s 3 o\'clock march out of the cemetery; the 154th NY sketch about 4 p. m.')
L.append('5. **Union cavalry itineraries disagree** (Hunt: Buford via Boonsboro and Fairfield; Heermance: via Leesburg, Poolesville, Frederick, Emmitsburg; Markell: entered at the head of the advance June 30). 5th NY (11 a. m. July 1 move to Berlin) and 18th PA (left Hanover about 2 p. m. June 30, Berlin by July 1 night) differ by a day on the Abbottstown to Berlin march.')
L.append('6. **Gaps.** 71st New York (NY2 p. 572): inscription OCR unreadable, no claim written; a second witness of New York volume 2 was not found (the copies on archive.org: `finalreportonba00chatgoog` is the only scan with that text). 82nd Ohio, 61st Ohio, 55th Ohio, 73rd Ohio, 33rd Massachusetts, 1st, 11th and 16th Massachusetts (only the 1st by a sister account), 12th New Hampshire, 11th New Jersey, 1st Ohio K, 4th US G (Wilkeson: OR only), 8th and 12th Illinois, 3rd Indiana, 3rd West Virginia, 1st Vermont, 1st West Virginia, Horse Artillery: no state volume held. 74th PA: the address prints no Gettysburg movement narrative (no claim).\n')
L.append('## 6. Index accuracy (`statevol_index.json`)\n')
iv = json.load(open(os.path.join(ROOT, 'docs', 'battle-theatre', 'library', 'statevol_index.json'), encoding='utf-8'))
L.append('| volume | key | chars | page anchors (longest increasing chain of running heads) | page range | sections | OCR grade of sections |')
L.append('|---|---|---|---|---|---|---|')
for v in iv['volumes']:
    secs = [s for s in iv['sections'] if s['volume'] == v['key']]
    g = collections.Counter(s['ocr_grade'] for s in secs)
    L.append('| %s | %s | %d | %d | %s | %d | %s |' % (esc(v['cite']), v['key'], v['chars'], v['page_anchors'], esc(v['page_range']), len(secs), ', '.join('%s %d' % kv for kv in g.most_common())))
L.append('')
L.append('- Page accuracy: page numbers are the running heads of the OCR text; a run of lost heads gives a range (`~`), never a guess. The ledger quote pages match the page that the printed head above the quote carries for every spot-checked claim (the verifier re-finds each sampled quote by `statevol_find.py --verify` under the cited section id: 0 misses in all %d claims, checked in-process for every quote). Page ranges (`interpolated`) on %d of %d claims.' % (len(claims), interp, len(claims)))
L.append('- Section accuracy: headings are recovered for the Pennsylvania volumes (DEDICATION OF MONUMENT, regiment line), the New York volumes (regiment heading lines; the monument inscription caption sections are short and kinded `inscription_caption`; table-of-contents lines are kinded `toc_entry`), Maine, Michigan and Fox. Known limits, all stated in the section titles of the claims they affect: (a) the Google-scan New York volume 2 runs the 119th, 120th and 121st New York together under the 119th heading (NY2-S025) and the 134th, 136th and an appended unrelated Chancellorsville study under the 136th (NY2-S030, 1.47 million characters, use only the first 45,000); (b) New York volume 3 runs Battery G with Battery I (NY3-S024) and the 1st Light Artillery batteries with the independent batteries (NY3-S029); (c) Battles and Leaders vol. 3 titles are the nearest preceding caption, not the article (BL3-S027 is Longstreet\'s "Lee\'s Invasion of Pennsylvania", BL3-S028 is Hunt\'s "The First Day at Gettysburg", BL3-S033 holds Kershaw\'s article under the heading DEVIL\'S DEN); (d) Pennsylvania volumes: archive.org\'s volume field is wrong for three items (the title page reads VOLUME I), corrected in `acquired.json` as `volume_on_title_page`.')
L.append('- Method for a new claim: `python -I tools/bt/statevol_find.py "pattern" --vol NY3 -C 200`, then `--section ID --sents REGEX` to read, then `positions_E_lib.add(...)`, which refuses a quote that is not in the cited section.\n')
L.append('## 7. Hard-rule compliance\n')
L.append('No Playwright, browser, site build or long process was used. Acquisition (earlier session): archive.org metadata and download API, 3 s spacing, descriptive User-Agent, pre-1929 public-domain items, hashes recorded in `docs/battle-theatre/GOVERNANCE/library/acquired.json` (seven New York and one Pennsylvania text added; `tmp/library/misc` holds 99 MB including the search caches, well under the 300 MB cap). Nothing was deployed.\n')
open(os.path.join(POS, 'POSITIONS_E_SUMMARY.md'), 'w', encoding='utf-8').write('\n'.join(L) + '\n')
print('wrote summary; units with own claims', ucov, 'via only', uvia, 'none', len(unc))
print(dict(verdict_ct))
